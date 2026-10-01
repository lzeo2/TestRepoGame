#!/usr/bin/env python3
"""Bounded full-entry regression; only normal UI commands and read-only snapshots."""
import functools
import json
import shutil
import threading
from time import monotonic
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-core-qa')
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


def idle(page):
    page.wait_for_function('window.foldwildSnapshot && !window.foldwildSnapshot.busy', timeout=30000)


def loaded(page, count):
    page.wait_for_function('''count => window.foldwildSnapshot.view &&
        window.foldwildSnapshot.view.loadedModels.length === count''', arg=count, timeout=60000)
    view = snapshot(page)['view']
    assert not view['fallbackModels'], view
    assert not view['hiddenAvailable'], view
    return view


def walk(page, point):
    before = snapshot(page)['state']['position']
    page.locator(f'[data-point="{point}"]').click()
    immediate = snapshot(page)['state']['position']
    assert abs(immediate['x'] - before['x']) + abs(immediate['z'] - before['z']) < 1, 'marker teleported'
    page.wait_for_function('''id => {
        const s = window.foldwildSnapshot;
        const coordinates = {'wild-0':[-5,-1], 'wild-1':[0,-4], 'wild-2':[5,-1], camp:[-6,4], rival:[6,-3], exit:[0,-7]};
        const [x,z] = coordinates[id];
        return Math.hypot(s.state.position.x-x,s.state.position.z-z) <= .31;
    }''', arg=point, timeout=60000)
    assert page.locator('#interact').is_enabled()


def encounter(page, point):
    walk(page, point)
    page.locator('#interact').click()
    assert snapshot(page)['phase'] == 'dialogue'
    page.locator('#dialogue-start').click()
    page.wait_for_function('window.foldwildSnapshot.phase === "battle"')
    loaded(page, 2)


def action(page, selector):
    idle(page)
    assert page.locator(selector).is_enabled(), selector
    page.locator(selector).click()
    idle(page)
    return snapshot(page)


def run():
    free_before = shutil.disk_usage(ROOT).free
    assert free_before >= 2_000_000_000, 'disk guard: less than 2 GB free'
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    url = origin + '/Games/Foldwild/'
    errors, page_errors, failures, http_errors, external, model_requests = [], [], [], [], [], []
    images, summary = [], {}

    def attach(context):
        def local_only(route):
            if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                external.append(route.request.url)
                route.abort()
            else:
                route.continue_()
        context.route('**/*', local_only)
        page = context.new_page()
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('requestfailed', lambda request: failures.append(request.url))
        page.on('response', lambda response: http_errors.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: model_requests.append(request.url) if request.url.endswith('.glb') else None)
        return page

    def capture(page, name):
        path = OUTPUT / f'{name}.jpg'
        page.screenshot(path=str(path), type='jpeg', quality=55, full_page=False)
        images.append(path)

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                desktop = browser.new_context(viewport={'width': 1100, 'height': 720})
                page = attach(desktop)
                page.goto(url)
                page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                assert page.locator('[data-starter]').count() == 3
                assert page.locator('#continue').is_hidden()
                assert not model_requests, 'menu preloaded roster models'
                assert page.evaluate('''Object.getOwnPropertyDescriptor(window,'foldwildSnapshot').set === undefined &&
                    Object.isFrozen(window.foldwildSnapshot)''')
                capture(page, 'menu-desktop')
                page.locator('[data-starter="dewgob"]').click()
                page.locator('#start').click()
                view = loaded(page, 3)
                assert len(model_requests) == 3, model_requests
                assert page.evaluate('''Object.isFrozen(window.foldwildSnapshot.state) &&
                    Object.isFrozen(window.foldwildSnapshot.state.roster) &&
                    Object.isFrozen(window.foldwildSnapshot.state.roster[0])''')
                assert snapshot(page)['state']['seed'] == 1
                assert snapshot(page)['state']['roster'][0]['level'] == 3
                page.locator('canvas').scroll_into_view_if_needed()
                capture(page, 'world-desktop')
                # Twelve actual seconds of held keyboard input, not a frame pump.
                positions = []
                for key in ['w', 'd', 's', 'a']:
                    page.locator('canvas').focus()
                    previous = snapshot(page)['state']['position']
                    page.keyboard.down(key)
                    page.wait_for_timeout(3000)
                    page.keyboard.up(key)
                    current = snapshot(page)['state']['position']
                    assert current != previous, (key, current)
                    assert -10 <= current['x'] <= 10 and -7 <= current['z'] <= 7
                    positions.append(current)
                summary['held_WASD_seconds'] = 12
                summary['movement_positions'] = positions
                page.locator('canvas').focus()
                page.keyboard.press('p')
                assert snapshot(page)['paused']
                before = snapshot(page)['state']['position']
                page.keyboard.down('w')
                page.wait_for_timeout(500)
                page.keyboard.up('w')
                assert snapshot(page)['state']['position'] == before
                page.keyboard.press('Escape')
                assert not snapshot(page)['paused']
                # Actual seeded meadow wild-1 is Sootnub. Use shielding and two Cup Knocks.
                encounter(page, 'wild-1')
                assert snapshot(page)['battle']['enemy']['team'][0]['speciesId'] == 'sootnub'
                page.locator('#battle-panel').scroll_into_view_if_needed()
                capture(page, 'battle-desktop')
                before = snapshot(page)['battle']
                after = action(page, '#ability-3')['battle']
                assert after['round'] == before['round'] + 1
                assert after['player']['team'][0]['energy'] == before['player']['team'][0]['energy'] - 4
                after = action(page, '#ability-0')['battle']
                assert after['enemy']['team'][0]['hp'] < before['enemy']['team'][0]['hp']
                action(page, '#ability-0')
                assert page.locator('#capture').is_enabled()
                pre_capture = snapshot(page)
                kite_count = pre_capture['state']['kites']
                base_calls = pre_capture['view']['drawCalls']
                page.locator('#capture').click()
                page.wait_for_function('window.foldwildSnapshot.view.drawCalls > ' + str(base_calls), timeout=10000)
                assert snapshot(page)['busy'], 'capture did not retain action lock'
                summary['paper_kite_draw_calls'] = snapshot(page)['view']['drawCalls'] - base_calls
                idle(page)
                captured = snapshot(page)
                assert captured['state']['kites'] == kite_count - 1
                assert captured['battle']['result'] in ['captured', None, 'lost']
                summary['capture_outcome'] = captured['battle']['result'] or 'miss; encounter continues'
                assert captured['battle']['result'] == 'captured', 'legitimate bounded seed-1 attempt did not capture'
                assert len(captured['state']['roster']) == 2 and len(captured['state']['team']) == 2
                assert captured['state']['roster'][1]['uid'] == 'owned-2'
                assert captured['state']['encounterIndex'] == 1
                assert page.locator('#result-title').inner_text() == 'Capture complete'
                page.locator('#result-continue').click()
                loaded(page, 3)
                walk(page, 'camp')
                page.locator('#rest').click()
                page.locator('#collection-btn').click()
                assert page.locator('#collection-list').inner_text().count('Not seen') > 70
                assert page.locator('#collection-list').inner_text().count('cost ') == 320
                controls = page.locator('#collection-list button')
                controls.nth(1).click()
                assert len(snapshot(page)['state']['team']) == 1
                page.locator('#collection-list button').nth(1).click()
                assert len(snapshot(page)['state']['team']) == 2
                page.keyboard.press('Escape')
                assert not page.locator('#collection-dialog').evaluate('(dialog) => dialog.open')
                assert not snapshot(page)['paused']
                encounter(page, 'wild-0')
                # Spend energy before Wait so its actual capped +3 is observable.
                action(page, '#ability-3')
                before = snapshot(page)['battle']
                after = action(page, '#wait')['battle']
                assert after['round'] == before['round'] + 1
                assert after['player']['team'][0]['energy'] == before['player']['team'][0]['energy'] + 3
                after = action(page, '#switch-list button:nth-child(2)')['battle']
                assert after['player']['active'] == 1
                action(page, '#flee')
                page.locator('#result-continue').click()
                loaded(page, 3)
                walk(page, 'camp')
                page.locator('#rest').click()
                persisted = snapshot(page)['state']
                page.reload()
                page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                assert page.locator('#continue').is_visible()
                page.locator('#continue').click()
                loaded(page, 3)
                restored = snapshot(page)['state']
                assert restored['team'] == persisted['team']
                assert restored['roster'] == persisted['roster']
                assert abs(restored['position']['x'] - persisted['position']['x']) < .001
                assert abs(restored['position']['z'] - persisted['position']['z']) < .001
                assert restored['kites'] == persisted['kites'] == 18 and restored['encounterIndex'] == 2
                summary['persistence'] = 'Continue restored position, two uid-keyed allies, team membership, kites and encounterIndex'
                old_raw = page.evaluate('localStorage.getItem(' + json.dumps(SAVE_KEY) + ')')
                page.locator('#new-run').click()
                page.locator('#reset-cancel').click()
                assert page.evaluate('localStorage.getItem(' + json.dumps(SAVE_KEY) + ')') == old_raw
                page.locator('#new-run').click()
                page.locator('#reset-confirm').click()
                assert snapshot(page)['phase'] == 'menu'
                assert page.evaluate('localStorage.getItem(' + json.dumps(SAVE_KEY) + ')') == old_raw
                page.locator('#start').click()
                loaded(page, 3)
                fresh = snapshot(page)['state']
                assert fresh['seed'] == 1 and fresh['score'] == 0 and not fresh['defeatedRivals']
                assert fresh['team'] == ['owned-1'] and fresh['starterId'] == 'cindupp'
                summary['new_run'] = 'cancel preserved old bytes; confirmed reset returned starter menu; Start replaced with seeded level-3 run'
                summary['world_models'] = view['loadedModels']
                desktop.close()

                # One fresh mobile context, never a second simultaneous GPU tab.
                mobile = browser.new_context(viewport={'width': 390, 'height': 700}, has_touch=True, is_mobile=True)
                page = attach(mobile)
                page.goto(url)
                page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                capture(page, 'menu-mobile')
                page.locator('[data-starter="pithnip"]').tap()
                page.locator('#start').tap()
                loaded(page, 3)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.locator('canvas').scroll_into_view_if_needed()
                capture(page, 'world-mobile')
                walk(page, 'wild-0')
                page.locator('#interact').tap()
                page.locator('#dialogue-start').tap()
                loaded(page, 2)
                page.locator('#battle-panel').scroll_into_view_if_needed()
                capture(page, 'battle-mobile')
                before = snapshot(page)['battle']
                after = action(page, '#ability-0')['battle']
                assert after['round'] == before['round'] + 1
                assert after['enemy']['team'][0]['hp'] < before['enemy']['team'][0]['hp']
                action(page, '#flee')
                page.locator('#result-continue').tap()
                loaded(page, 3)
                page.locator('#reduce-motion').check()
                assert snapshot(page)['state']['reducedMotion']
                # Two real touch contacts exercise pointer capture and normalized diagonal movement.
                page.locator('[data-move="w"]').scroll_into_view_if_needed()
                contacts = []
                for index, value in enumerate(['w', 'a']):
                    rect = page.locator(f'[data-move="{value}"]').bounding_box()
                    contacts.append({'x': rect['x']+rect['width']/2, 'y': rect['y']+rect['height']/2, 'id': index+1})
                cdp = mobile.new_cdp_session(page)
                touch_started = monotonic()
                before = snapshot(page)['state']['position']
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': contacts})
                page.wait_for_timeout(500)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                after = snapshot(page)['state']['position']
                dx, dz = after['x']-before['x'], after['z']-before['z']
                assert dx < 0 and dz < 0 and abs(dx-dz) < .08, (before, after)
                touch_seconds = monotonic() - touch_started
                # Native CDP delivery can exceed the requested 500ms on software rendering.
                assert (dx*dx+dz*dz)**.5 <= 3 * (touch_seconds + .05), 'diagonal exceeded walking speed'
                summary['touch_movement'] = {'dx': dx, 'dz': dz, 'observed_seconds': touch_seconds}
                page.wait_for_timeout(150)
                assert snapshot(page)['state']['position'] == after, 'released touches kept moving'
                cdp.detach()
                summary['mobile'] = '390px: native walk/battle/flee, two-finger normalized held movement with release, reduced-motion persisted; no overflow'
                mobile.close()
                assert not errors and not page_errors and not failures and not http_errors and not external, (errors, page_errors, failures, http_errors, external)

                # Deliberately malformed storage fixture is separate from normal play.
                corrupt = browser.new_context(viewport={'width': 800, 'height': 650})
                corrupt.add_init_script("localStorage.setItem('foldwild-save-v1', '{bad-json')")
                page = attach(corrupt)
                page.goto(url)
                page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                assert 'old save is preserved' in page.locator('#starter-description').inner_text()
                assert page.locator('#continue').is_hidden()
                page.locator('[data-starter="dewgob"]').click()
                assert 'old save is preserved' in page.locator('#starter-description').inner_text()
                page.locator('#start').click()
                assert page.locator('#reset-dialog').evaluate('(dialog) => dialog.open')
                page.locator('#reset-cancel').click()
                assert page.evaluate("localStorage.getItem('foldwild-save-v1')") == '{bad-json'
                summary['corrupt_fixture'] = 'bad JSON and warning preserved across starter selection; autosave disabled; Start required native replacement confirmation'
                corrupt.close()

                fallback = browser.new_context(viewport={'width': 800, 'height': 650})
                fallback.add_init_script('''Object.defineProperty(window, 'localStorage', {get(){throw new Error('storage unavailable fixture')}});
                    const original = HTMLCanvasElement.prototype.getContext;
                    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                        return type === 'webgl' ? null : original.call(this, type, ...args);
                    };''')
                page = attach(fallback)
                page.goto(url)
                page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                page.locator('#start').click()
                page.locator('#reset-confirm').click()
                assert snapshot(page)['phase'] == 'world' and snapshot(page)['view'] is None
                assert '3D view unavailable' in page.locator('#message').inner_text()
                assert page.locator('#save-state').inner_text() == 'Save unavailable; expedition stays in memory.'
                walk(page, 'wild-0')
                page.locator('#interact').click()
                page.locator('#dialogue-start').click()
                assert snapshot(page)['phase'] == 'battle'
                action(page, '#wait')
                action(page, '#flee')
                assert snapshot(page)['battle']['result'] == 'fled'
                assert '3D view unavailable' in page.locator('#message').inner_text()
                summary['fallback_fixture'] = 'WebGL factory denied plus storage getter unavailable: honest diagnostics, native walking/dialogue/battle/Wait/flee usable'
                fallback.close()
                assert not errors and not page_errors and not failures and not http_errors and not external, (errors, page_errors, failures, http_errors, external)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    total = sum(path.stat().st_size for path in images)
    assert total <= 500000, total
    summary.update(console_errors=errors, page_errors=page_errors, request_failures=failures, http_errors=http_errors,
                   external_requests=external, screenshot_bytes=total,
                   screenshots=[str(path) for path in images], storage_delta=free_before-shutil.disk_usage(ROOT).free)
    print(json.dumps(summary, indent=2))
    print('PASS: standalone entry desktop/mobile, real movement/combat/capture/team/Wait/switch/save/reset; isolated corrupt-save guard')


if __name__ == '__main__':
    run()
