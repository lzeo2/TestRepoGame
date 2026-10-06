#!/usr/bin/env python3
"""Bounded M1 entry proof using real UI inputs and read-only snapshots, not a release gate."""
import functools
import json
import math
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import monotonic
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-core-v2')
SAVE_KEY = 'foldwild-save-v1'


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        else:
            super().do_GET()

    def log_message(self, *_args):
        pass


def snapshot(page):
    return page.evaluate('window.foldwildSnapshot')


def walk(page, point, x, z):
    before = snapshot(page)['state']['position']
    page.locator(f'[data-point="{point}"]').click()
    after = snapshot(page)['state']['position']
    assert math.hypot(before['x'] - after['x'], before['z'] - after['z']) < 1, 'route teleported'
    page.wait_for_function('''p => {const s=window.foldwildSnapshot.state.position;
        return Math.hypot(s.x-p[0],s.z-p[1])<.31}''', arg=[x, z], timeout=45000)
    assert page.locator('#interact').is_enabled()


def keyboard_to(page, x, z, keyboard=None):
    """Walk open authored lanes; an iframe uses its owning Page's keyboard."""
    keyboard = keyboard or page.keyboard
    deadline = monotonic() + 30
    page.locator('#game-canvas').focus()
    while monotonic() < deadline:
        s = snapshot(page)
        p = s['state']['position']
        dx, dz = x - p['x'], z - p['z']
        if math.hypot(dx, dz) < .5:
            return
        yaw = s['view']['cameraYaw']
        horizontal = dx * math.cos(yaw) - dz * math.sin(yaw)
        vertical = dz * math.cos(yaw) + dx * math.sin(yaw)
        key = ('d' if horizontal > 0 else 'a') if abs(horizontal) > abs(vertical) else ('s' if vertical > 0 else 'w')
        keyboard.down(key)
        page.wait_for_timeout(min(400, max(60, math.hypot(dx, dz) / 4 * 1000)))
        keyboard.up(key)
    raise AssertionError(f'normal walking did not reach {x},{z}: {snapshot(page)["state"]["position"]}')


def run():
    before = shutil.disk_usage(ROOT).free
    assert before >= 2_000_000_000, 'disk guard: less than 2 GB free'
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 8798), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = 'http://127.0.0.1:8798'
    errors, failed, external, http_errors, shots = [], [], [], [], []
    summary = {}

    def attach(context):
        def local_only(route):
            if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                external.append(route.request.url)
                route.abort()
            else:
                route.continue_()
        context.route('**/*', local_only)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('requestfailed', lambda request: failed.append(request.url))
        page.on('response', lambda response: http_errors.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.goto(origin + '/Games/Foldwild/')
        page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
        return page

    def shot(page, name):
        path = OUTPUT / f'{name}.jpg'
        page.screenshot(path=str(path), type='jpeg', quality=55)
        assert path.stat().st_size < 300000
        shots.append(path)

    def model_ready(page, mode):
        page.wait_for_function('''mode => {const v=window.foldwildSnapshot.view;
            return v && v.mode===mode && v.loadedModels.length >= (mode==='battle'?2:1) && v.frames>2}''', arg=mode, timeout=30000)
        info = snapshot(page)['view']
        assert not info['fallbackModels'] and not info['hiddenAvailable'], info
        assert info['cacheSize'] <= 12
        return info

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                desktop = browser.new_context(viewport={'width': 1100, 'height': 720})
                page = attach(desktop)
                page.locator('#seed-input').fill('1.5')
                page.locator('#start').click()
                assert snapshot(page)['phase'] == 'menu'
                assert page.evaluate('localStorage.getItem("foldwild-save-v1")') is None
                page.locator('#seed-input').fill('1')
                page.locator('#start').click()
                v = model_ready(page, 'world')
                assert v['width'] <= 960 and v['height'] <= 540
                s = snapshot(page)
                assert s['state']['version'] == 2 and s['state']['seed'] == 1
                assert s['state']['marks'] == 90 and s['state']['kites'] == 8
                assert page.locator('[data-move]').count() == 4
                assert page.locator('[data-point]').count() == 3
                assert page.evaluate('Object.getOwnPropertyDescriptor(window,"foldwildSnapshot").set===undefined && Object.isFrozen(window.foldwildSnapshot.state.roster[0])')
                assert page.locator('[data-region="4"]').is_disabled()
                shot(page, 'desktop-world')

                walk(page, 'meadow-merchant', 4, 16)
                page.locator('#interact').click()
                assert snapshot(page)['phase'] == 'world' and page.locator('#service-dialog').is_visible()
                page.get_by_role('button', name='Buy Latch Kite (12)', exact=True).click()
                assert snapshot(page)['state']['marks'] == 78 and snapshot(page)['state']['kites'] == 9
                page.get_by_role('button', name='Sell Recovery Patch (6)', exact=True).click()
                assert snapshot(page)['state']['marks'] == 84 and snapshot(page)['state']['inventory']['patch'] == 1
                page.get_by_role('button', name='Accessories', exact=True).click()
                page.get_by_role('button', name='Paper Badge: 20 Marks', exact=True).click()
                assert snapshot(page)['state']['marks'] == 64 and 'badge' in snapshot(page)['state']['cosmetics']
                shot(page, 'desktop-shop')
                page.get_by_role('button', name='Archivist', exact=True).click()
                page.get_by_label('coat', exact=False).select_option('#b98369')
                assert snapshot(page)['state']['appearance']['coat'] == '#b98369'
                page.locator('#service-close').click()
                assert not page.locator('#service-dialog').is_visible()
                page.locator('#collection-btn').click()
                owned = page.locator('[data-uid="owned-1"]')
                owned.locator('select').select_option('badge')
                owned.get_by_role('button', name='Favorite', exact=True).click()
                assert owned.get_by_role('button', name='Remove from team', exact=True).is_disabled()
                assert snapshot(page)['state']['roster'][0]['cosmeticId'] == 'badge'
                assert snapshot(page)['state']['favorites'] == ['owned-1']
                assert 'Dewgob' not in page.locator('#collection-list').inner_text(), 'undiscovered information leaked'
                page.locator('#ledger-search').fill('Dewgob')
                assert 'Dewgob' not in page.locator('#collection-list').inner_text()
                page.locator('#ledger-search').fill('Cindupp')
                assert 'Undiscovered' not in page.locator('#collection-list').inner_text()
                shot(page, 'desktop-ledger')
                page.locator('#collection-close').click()
                page.locator('#quality').select_option('standard')
                page.wait_for_function('window.foldwildSnapshot.view.quality==="standard"')
                assert snapshot(page)['view']['height'] <= 720
                page.locator('#quality').select_option('low')
                saved = page.evaluate('localStorage.getItem("foldwild-save-v1")')
                page.reload()
                page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                page.locator('#continue').click()
                model_ready(page, 'world')
                assert page.evaluate('localStorage.getItem("foldwild-save-v1")') == saved, 'continue altered stationary saved progress'
                assert snapshot(page)['state']['appearance']['coat'] == '#b98369'
                assert snapshot(page)['state']['roster'][0]['cosmeticId'] == 'badge'

                # Open lanes avoid the cottage at x=8,z=4. Route buttons then use real graph navigation.
                keyboard_to(page, 0, 10)
                keyboard_to(page, 0, -18)
                keyboard_to(page, 16, -18)
                assert snapshot(page)['state']['position']['z'] < -17, 'still clamped to old world bounds'
                walk(page, 'supply-1', 18, -18)
                page.locator('#interact').click()
                assert snapshot(page)['state']['inventory']['fiber'] == 4, 'Pathfinder pickup bonus missing'
                assert snapshot(page)['state']['claimedSupplies'] == ['0:supply-1']
                assert page.locator('[data-point="supply-1"]').count() == 0
                keyboard_to(page, 0, -18)
                keyboard_to(page, 0, 10)
                walk(page, 'meadow-counter', 4, 10)
                page.locator('#interact').click()
                page.get_by_role('button', name='Deliver 3 fiber', exact=True).click()
                assert snapshot(page)['state']['marks'] == 99
                assert snapshot(page)['state']['inventory']['fiber'] == 1
                assert page.get_by_role('button', name='Delivery complete', exact=True).is_disabled()
                page.locator('#service-close').click()
                walk(page, 'meadow-mentor', 8, 10)
                page.locator('#interact').click()
                page.get_by_role('button', name='Choose Quartermaster', exact=True).click()
                assert snapshot(page)['state']['activeClass'] == 'quartermaster'
                page.locator('#service-close').click()
                keyboard_to(page, 0, 10)
                keyboard_to(page, -8, 4)
                walk(page, 'wild-0', -10, 4)
                page.locator('#interact').click()
                assert snapshot(page)['phase'] == 'dialogue'
                page.locator('#dialogue-start').click()
                v = model_ready(page, 'battle')
                s = snapshot(page)
                assert s['battle']['player']['classId'] == 'quartermaster' and s['battle']['synergyEnabled']
                assert s['battle']['player']['team'][0]['cosmeticId'] == 'badge'
                assert sum(s['battle']['enemy']['team'][0]['profile'].values()) == 0
                shot(page, 'desktop-battle')
                page.locator('#game-canvas').focus()
                page.keyboard.press('1')
                page.wait_for_function('!window.foldwildSnapshot.busy')
                assert snapshot(page)['battle']['round'] == 2
                page.locator('#wait').click()
                page.wait_for_function('!window.foldwildSnapshot.busy')
                marks = snapshot(page)['state']['marks']
                page.locator('#flee').click()
                page.wait_for_function('window.foldwildSnapshot.phase==="result" && !window.foldwildSnapshot.busy')
                assert snapshot(page)['state']['marks'] == marks
                assert snapshot(page)['state']['encounterIndex'] == 1
                page.locator('#result-continue').click()
                page.locator('#services-btn').click()
                hp_before = snapshot(page)['state']['roster'][0]['hp']
                assert page.get_by_role('button', name='Use Recovery Patch', exact=True).is_enabled()
                page.get_by_role('button', name='Use Recovery Patch', exact=True).click()
                assert snapshot(page)['state']['roster'][0]['hp'] > hp_before
                assert snapshot(page)['state']['inventory']['patch'] == 0
                assert page.get_by_role('button', name='Use Recovery Patch', exact=True).is_disabled()
                page.locator('#service-close').click()
                page.reload()
                page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                page.locator('#continue').click()
                model_ready(page, 'world')
                assert snapshot(page)['state']['contracts'] == ['meadow-main-supply']
                assert snapshot(page)['state']['activeClass'] == 'quartermaster'
                summary['normal_loop'] = {'marks': marks, 'encounterIndex': 1, 'activeClass': 'quartermaster', 'savedAccessory': 'badge', 'claimedSupplies': ['0:supply-1']}
                desktop.close()

                mobile = browser.new_context(viewport={'width': 390, 'height': 700}, has_touch=True, is_mobile=True)
                page = attach(mobile)
                page.locator('#seed-input').fill('1')
                page.locator('#start').tap()
                model_ready(page, 'world')
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                shot(page, 'mobile-world')
                forward = page.locator('[data-move="w"]')
                forward.scroll_into_view_if_needed()
                box = forward.bounding_box()
                session = mobile.new_cdp_session(page)
                start_z = snapshot(page)['state']['position']['z']
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'id': 1, 'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2}]})
                page.wait_for_timeout(500)
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                assert snapshot(page)['state']['position']['z'] < start_z - .5
                final_z = snapshot(page)['state']['position']['z']
                page.wait_for_timeout(200)
                assert abs(snapshot(page)['state']['position']['z'] - final_z) < .05
                right_box = page.locator('[data-move="d"]').bounding_box()
                start = snapshot(page)['state']['position']
                contacts = [{'id': 1, 'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2},
                    {'id': 2, 'x': right_box['x'] + right_box['width']/2, 'y': right_box['y'] + right_box['height']/2}]
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': contacts})
                page.wait_for_timeout(500)
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                end = snapshot(page)['state']['position']
                assert end['x'] > start['x'] + .3 and end['z'] < start['z'] - .3, 'two held contacts did not combine'
                page.locator('#pause').tap()
                paused_position = snapshot(page)['state']['position']
                page.wait_for_timeout(200)
                assert snapshot(page)['state']['position'] == paused_position
                assert page.locator('[data-move="w"]').is_disabled()
                page.locator('#pause').tap()
                session.detach()
                mobile.close()

                # Corrupt input is an explicitly negative fixture, never a positive progression grant.
                corrupt = browser.new_context()
                corrupt.add_init_script('localStorage.setItem("foldwild-save-v1", "{broken")')
                page = attach(corrupt)
                page.locator('#start').click()
                assert page.locator('#reset-dialog').is_visible()
                page.locator('#reset-cancel').click()
                assert page.evaluate('localStorage.getItem("foldwild-save-v1")') == '{broken'
                assert snapshot(page)['phase'] == 'menu'
                corrupt.close()
                assert not errors and not failed and not external and not http_errors, (errors, failed, external, http_errors)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    summary.update(errors=errors, failed_requests=failed, external_requests=external, http_errors=http_errors,
        screenshots=[p.name for p in shots], screenshot_bytes=sum(p.stat().st_size for p in shots), storage_delta=before-shutil.disk_usage(ROOT).free)
    print(json.dumps(summary, indent=2))
    print('PASS: M1 native starter, merchant trades, accessory/ledger, appearance, supply/contract/class, save/continue, movement, wild battle, touch and corrupt-save protection')


if __name__ == '__main__':
    run()
