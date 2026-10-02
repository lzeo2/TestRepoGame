#!/usr/bin/env python3
"""Bounded Archery native regression; requires Main's checkout lease, Chromium/Playwright.
Run: timeout 180 python3 -B scripts/test_archery_refurbishment.py
Optional --baseline serves the unchanged 8c8a055 HTML from Git, without checkout edits.
No state grants, seeded RNG, storage writes, or runtime debug hooks.
"""
import argparse
import hashlib
import math
import shutil
import subprocess
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path(tempfile.gettempdir()) / 'archery-refurbishment'
ORIGIN = 'http://127.0.0.1:8812'
OBSERVE = '''() => ({state,score,arrowsLeft,locked,mouseDown,kbAngle,wind,
    target:{x:target.pos.x,y:target.pos.y,moving:!!target.moveDestination},
    arrow:{state:arrow.state,power:arrow.power,angle:arrow.angle,
        vx:arrow.velocity.x,vy:arrow.velocity.y},
    rings:target.ellipses.map(e=>({h:e.h,k:e.k,rx:e.rx,ry:e.ry}))})'''


def snapshot(page):
    return page.evaluate(OBSERVE)


def predict(angle, power, wind, rings):
    x, y = 100, 425
    vx, vy = power / 4 * math.cos(angle), power / 4 * math.sin(angle)
    for _ in range(250):
        direction = math.atan2(vy, vx)
        fx = x + (60 - power / 5) * math.cos(direction)
        fy = y + (60 - power / 5) * math.sin(direction)
        if ((fx - rings[0]['h']) / rings[0]['rx']) ** 2 + ((fy - rings[0]['k']) / rings[0]['ry']) ** 2 < 1:
            pts = 1
            for ring in rings[1:]:
                if ((fx - ring['h']) / ring['rx']) ** 2 + ((fy - ring['k']) / ring['ry']) ** 2 >= 1:
                    break
                pts += 1
            return pts
        if fy < 0 or fy > 500 or fx < 0 or fx > 640:
            return 0
        x, y = x + vx, y + vy
        vx, vy = vx + .01 + wind, vy + .4
    return 0


def aim_for_hit(page):
    page.wait_for_function('!locked && !target.moveDestination && arrow.state === "rest"')
    s = snapshot(page)
    best = (0, 0, 0)
    for power in (100, 90, 80, 70, 60):
        for step in range(-1450, 100):
            angle = step / 1000
            points = predict(angle, power, s['wind'], s['rings'])
            if points > best[0]:
                best = points, angle, power
            if points == 4:
                return angle, power
    assert best[0] > 0, 'no legal pointer trajectory found'
    return best[1:]


def drag(page, angle, power, touch=None, cancel=False):
    box = page.locator('#canvas').bounding_box()
    def xy(x, y):
        return box['x'] + x * box['width'] / 640, box['y'] + y * box['height'] / 500
    start = xy(100, 425)
    end = xy(100 + power * math.cos(angle), 425 + power * math.sin(angle))
    if touch:
        touch.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'id': 1, 'x': start[0], 'y': start[1]}]})
        touch.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'id': 1, 'x': end[0], 'y': end[1]}]})
        assert snapshot(page)['mouseDown'], 'native touch did not begin drag'
        touch.send('Input.dispatchTouchEvent', {'type': 'touchCancel' if cancel else 'touchEnd', 'touchPoints': []})
    else:
        page.mouse.move(*start)
        page.mouse.down()
        page.mouse.move(*end)
        page.mouse.up()


def run():
    args = argparse.ArgumentParser()
    args.add_argument('--baseline', action='store_true')
    baseline = args.parse_args().baseline
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000, 'disk guard: below 2 GB free'
    source = subprocess.check_output(['git', 'show', '8c8a055:Games/Archery/index.html']) if baseline else (ROOT / 'Games/Archery/index.html').read_bytes()
    OUTPUT.mkdir(exist_ok=True)
    print('SOURCE_SHA256', hashlib.sha256(source).hexdigest(), 'baseline' if baseline else 'working', flush=True)

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path not in ('/', '/Games/Archery/index.html', '/favicon.ico'):
                self.send_error(404)
                return
            self.send_response(204 if self.path == '/favicon.ico' else 200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            if self.path != '/favicon.ico':
                self.wfile.write(source)
        def log_message(self, *args):
            pass

    errors, failed, http, external = [], [], [], []
    server = ThreadingHTTPServer(('127.0.0.1', 8812), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True, args=['--no-sandbox'])
            print('BROWSER', browser.version, flush=True)
            try:
                for mobile in (False, True):
                    context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 720}, has_touch=mobile, is_mobile=mobile)
                    try:
                        def local_only(route):
                            if not route.request.url.startswith(ORIGIN + '/'):
                                external.append(route.request.url)
                                route.abort()
                            else:
                                route.continue_()
                        context.route('**/*', local_only)
                        page = context.new_page()
                        page.set_default_timeout(8000)
                        page.on('pageerror', lambda e: errors.append(str(e)))
                        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                        page.on('requestfailed', lambda r: failed.append(r.url))
                        page.on('response', lambda r: http.append(r.status) if r.status >= 400 else None)
                        page.goto(ORIGIN + '/Games/Archery/index.html')
                        page.wait_for_function('state === "play"')
                        touch = context.new_cdp_session(page) if mobile else None
                        angle, power = aim_for_hit(page)
                        drag(page, angle, power, touch)
                        page.wait_for_function('score > 0 && locked')
                        page.keyboard.press('r')
                        assert snapshot(page)['arrowsLeft'] == 10, 'native R did not restart hit round'
                        page.wait_for_timeout(500)
                        s = snapshot(page)
                        assert s['target'] == {'x': 430, 'y': 250, 'moving': False}, 'old hit callback moved restarted target'
                        print('PASS native hit then R cancels old 350ms advance', 'mobile' if mobile else 'desktop', flush=True)
                        # Real keyboard events while flying/locked must not mutate aim power.
                        page.locator('#canvas').focus()
                        page.keyboard.press('Space')
                        assert snapshot(page)['arrow']['state'] == 'flying'
                        page.keyboard.press('ArrowUp')
                        assert snapshot(page)['arrow']['power'] == 10, 'flight keyboard mutated power'
                        page.keyboard.press('r')
                        angle, power = aim_for_hit(page)
                        drag(page, angle, power, touch)
                        page.wait_for_function('score > 0 && locked')
                        before = snapshot(page)['arrow']
                        for key in ('ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'Space'):
                            page.keyboard.press(key)
                        assert snapshot(page)['arrow'] == before, 'locked keyboard mutated aim'
                        page.keyboard.press('r')
                        if mobile:
                            drag(page, -.5, 80, touch, cancel=True)
                            assert not snapshot(page)['mouseDown'], 'touchCancel left stale drag'
                            assert snapshot(page)['arrow']['state'] == 'rest', 'touchCancel launched arrow'
                            drag(page, -.5, 80, touch)
                            page.keyboard.press('r')
                            assert not snapshot(page)['mouseDown']
                            box = page.locator('#canvas').bounding_box()
                            touch.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'id': 1, 'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2}]})
                            assert snapshot(page)['mouseDown']
                            page.keyboard.press('r')
                            touch.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                            assert not snapshot(page)['mouseDown'] and snapshot(page)['arrow']['state'] == 'rest'
                        else:
                            box = page.locator('#canvas').bounding_box()
                            page.mouse.move(box['x'] + 100, box['y'] + 200)
                            page.mouse.down()
                            page.keyboard.press('r')
                            page.mouse.up()
                            assert not snapshot(page)['mouseDown'] and snapshot(page)['arrow']['state'] == 'rest'
                            # Negative lifecycle fixture, not native blur/capture acceptance.
                            page.mouse.down()
                            page.evaluate('canvas.dispatchEvent(new PointerEvent("lostpointercapture"))')
                            assert not snapshot(page)['mouseDown']
                            page.mouse.up()
                            page.mouse.down()
                            page.evaluate('window.dispatchEvent(new Event("blur"))')
                            assert not snapshot(page)['mouseDown']
                            page.mouse.up()
                            print('PASS synthetic negative blur/lostcapture cleanup fixture', flush=True)
                        # Ten legal misses; no state edits or grants. Space on button remains native click.
                        for remaining in range(9, -1, -1):
                            drag(page, 0, 10, touch)
                            page.wait_for_function(f'arrowsLeft === {remaining}')
                            page.wait_for_function('arrow.state === "rest" && (state === "end" || !locked)')
                        assert snapshot(page)['state'] == 'end' and snapshot(page)['score'] == 0
                        assert 'You lose' in page.locator('#verdict').inner_text()
                        page.keyboard.press('r')
                        assert snapshot(page)['state'] == 'play' and snapshot(page)['arrowsLeft'] == 10
                        page.locator('#restartBtn').focus()
                        page.keyboard.press('Space')
                        assert snapshot(page)['arrow']['state'] == 'rest' and snapshot(page)['arrowsLeft'] == 10
                        # Normal UI hits reach a win using observed positions/wind and computed aim only.
                        for remaining in range(9, -1, -1):
                            angle, power = aim_for_hit(page)
                            drag(page, angle, power, touch)
                            page.wait_for_function(f'arrowsLeft === {remaining}')
                            page.wait_for_function('state === "end" || !locked')
                        assert snapshot(page)['state'] == 'end' and snapshot(page)['score'] >= 15
                        assert 'You win' in page.locator('#verdict').inner_text()
                        print('NATIVE_WIN_SCORE', snapshot(page)['score'], 'mobile' if mobile else 'desktop', flush=True)
                        page.locator('#againBtn').focus()
                        page.keyboard.press('Space')
                        assert snapshot(page)['state'] == 'play' and snapshot(page)['arrowsLeft'] == 10
                        page.screenshot(path=str(OUTPUT / ('390.jpg' if mobile else 'desktop.jpg')), type='jpeg', quality=65, full_page=True)
                        if mobile:
                            page.set_viewport_size({'width': 320, 'height': 720})
                            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                            page.screenshot(path=str(OUTPUT / '320.jpg'), type='jpeg', quality=65, full_page=True)
                            touch.detach()
                        print('PASS native flight/locked input, cancel/reset, ten-shot lose/R, ten-shot win/Play again', 'mobile' if mobile else 'desktop', flush=True)
                    finally:
                        context.close()
                assert not errors and not failed and not http and not external, (errors, failed, http, external)
                print('PASS pageerror=0 console_error=0 failed_request=0 http_4xx_5xx=0 external=0', flush=True)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == '__main__':
    run()
