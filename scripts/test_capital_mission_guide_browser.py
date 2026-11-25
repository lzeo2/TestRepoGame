#!/usr/bin/env python3
"""Bounded real-input Milo door/case checkpoint. No storage seeds or game-state writes.

Uses the existing browser-suite pattern: ephemeral localhost server, fresh Chromium
context, normal UI inputs and read-only capitalDriveSnapshot observations.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import signal
from threading import Thread
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--build', required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    assert ROOT not in output.parents and output != ROOT, 'Evidence belongs outside the checkout'
    output.mkdir(parents=True, exist_ok=False)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    started = time.monotonic()
    report = {'checks': [], 'errors': [], 'snapshots': {}, 'captureSeconds': {},
              'limits': ['Software WebGL, no hardware performance acceptance.',
                         'Fresh profile; no storage seeds or game-state writes.']}

    def check(ok, label):
        assert ok, label
        report['checks'].append(label)
        print('PASS', label, flush=True)

    def capture(page, label):
        report['captureSeconds'][label] = time.monotonic() - started
        report['snapshots'][label] = page.evaluate('()=>capitalDriveSnapshot()')
        page.screenshot(path=str(output / (label + '.png')), timeout=25000)

    def walk(page, goal, radius=.7, timeout=35000):
        state = page.evaluate('()=>capitalDriveSnapshot()')
        pose = state['focus']
        if math.hypot(pose['x'] - goal['x'], pose['z'] - goal['z']) <= radius:
            return
        yaw = math.atan2(pose['x'] - goal['x'], pose['z'] - goal['z'])
        delta = (state['camera']['footYaw'] - yaw + math.pi) % (2 * math.pi) - math.pi
        box = page.locator('#world canvas').bounding_box()
        movement = delta / .0045
        x = box['x'] + box['width'] * (.12 if movement >= 0 else .88)
        y = box['y'] + box['height'] * .52
        page.mouse.move(x, y)
        page.mouse.down(button='middle')
        page.mouse.move(x + movement, y, steps=8)
        page.mouse.up(button='middle')
        actual = page.evaluate('()=>capitalDriveSnapshot().camera.footYaw')
        assert abs((actual - yaw + math.pi) % (2 * math.pi) - math.pi) < .1, 'Native look reached requested yaw'
        page.keyboard.down('w')
        try:
            page.wait_for_function('(v)=>Math.hypot(capitalDriveSnapshot().focus.x-v.goal.x,capitalDriveSnapshot().focus.z-v.goal.z)<v.radius', arg={'goal': goal, 'radius': radius}, timeout=timeout)
        finally:
            page.keyboard.up('w')

    def expire(*_):
        raise TimeoutError('360 second native budget expired')

    signal.signal(signal.SIGALRM, expire)
    signal.alarm(360)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
                page = context.new_page()
                page.set_default_timeout(25000)
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                try:
                    page.goto(f'http://127.0.0.1:{server.server_port}/Games/Capital%20Drive/', wait_until='domcontentloaded', timeout=90000)
                    page.wait_for_function('()=>window.capitalDriveSnapshot?.().ready', timeout=180000)
                    report['bootReadySeconds'] = time.monotonic() - started
                    report['build'] = page.locator('#build-version').inner_text()
                    report['cacheStatus'] = page.locator('#cache-status').text_content()
                    check(report['build'] == args.build, 'Exact requested build loaded')
                    page.locator('[data-game-mode=campaign]').click()
                    page.locator('#guided-tutorial').uncheck()
                    page.locator('#startup-quality').select_option('performance')
                    page.locator('#intro-characters [data-character=basement]').click()
                    page.locator('#start-button').click()
                    page.locator('#campaign-dialog').wait_for(state='visible')
                    page.locator('#campaign-itinerary-label').click()
                    capture(page, '01-mission-plan')
                    page.locator('#campaign-start').click()
                    page.locator('#cutscene-skip').wait_for(state='visible')
                    page.locator('#cutscene-skip').click()
                    page.wait_for_function('()=>!capitalDriveSnapshot().paused')
                    page.keyboard.press('e')
                    page.wait_for_function('()=>capitalDriveSnapshot().gameplay.mode==="foot"')
                    capture(page, '02-actual-exit')
                    # Follow live intermediate exterior rings until the actual door is next.
                    report['exteriorGuides'] = []
                    for _ in range(10):
                        guide = page.evaluate('()=>capitalDriveSnapshot().missionGuide')
                        report['exteriorGuides'].append(guide)
                        walk(page, guide['point'], radius=.65 if guide.get('footpath') else 1.1)
                        if not guide.get('footpath'):
                            break
                    page.keyboard.press('e')
                    page.wait_for_function('()=>!!capitalDriveSnapshot().interiors.active')
                    capture(page, '03-home-entry')
                    guide = page.evaluate('()=>capitalDriveSnapshot().missionGuide')
                    report['caseGuide'] = guide
                    # Exercise priority with nearby overlapping station radii.
                    walk(page, guide['point'], radius=.8)
                    before = page.evaluate('()=>capitalDriveSnapshot().homeAction.serial')
                    page.keyboard.press('q')
                    page.wait_for_function('()=>capitalDriveSnapshot().miniGame.active')
                    activity = page.evaluate('()=>capitalDriveSnapshot().miniGame')
                    check(activity['station']['id'] == guide['stationId'], 'Q selected the marked case station')
                    check(activity['kind'] == 'stock', 'Case starts the stock symbol activity')
                    capture(page, '04-case-symbols')
                    for _ in range(40):
                        activity = page.evaluate('()=>capitalDriveSnapshot().miniGame')
                        if not activity['active']:
                            break
                        if activity['acceptsInput']:
                            page.keyboard.press({'up': 'ArrowUp', 'x': 'x', 'y': 'y'}[activity['expectedKey']])
                        page.wait_for_timeout(250)
                    page.wait_for_function('(serial)=>capitalDriveSnapshot().homeAction.serial>serial && capitalDriveSnapshot().homeAction.outcome==="packed"', arg=before, timeout=8000)
                    check(page.evaluate('()=>capitalDriveSnapshot().campaign.active.stage') == 1, 'Packing advances the mission to stage 1')
                    capture(page, '05-packed-checkpoint')
                    check(not report['errors'], 'No page errors during normal inputs')
                    report['status'] = 'PASS'
                except Exception as error:
                    report['status'] = 'FAIL'
                    report['failure'] = str(error)
                    report['loadingText'] = page.locator('#loading').text_content()
                    try:
                        capture(page, 'failure-live')
                    except Exception:
                        page.screenshot(path=str(output / 'failure-startup.png'), timeout=15000)
            finally:
                browser.close()
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        report['elapsedSeconds'] = time.monotonic() - started
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(report.get('status', 'FAIL'), report.get('failure', ''), flush=True)
    return 0 if report.get('status') == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
