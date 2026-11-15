#!/usr/bin/env python3
"""Bounded CDP multi-touch joystick verification using only normal game inputs.

Run with an outer watchdog and fresh external evidence directory:
 timeout 300s python3 -B scripts/test_capital_touch_browser.py --capture --output <external>
Snapshots are read only. No state grants, save edits or replacement clocks are used.
The blur reset is an explicitly synthetic negative event fixture; OS focus is unproven.
"""
import argparse
from contextlib import ExitStack
import functools
import hashlib
import http.server
import json
import math
from pathlib import Path
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUDGET = 270


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    source, output = args.root.resolve(), args.output.resolve()
    if any(output == root or root in output.parents for root in (ROOT, source)):
        parser.error('--output must be outside the repository and source root')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, layouts = [], [], [], [], []
    failure, page, cdp = None, None, None
    points = {}
    names = ['index.html', 'style.css', 'script.js', 'tutorial.js', 'touch-joystick.js',
             'hero-powers.js', 'ordnance.js', 'atmosphere.js', 'airport.js', 'airport-view.js']

    def hashes():
        return {name: hashlib.sha256(path.read_bytes()).hexdigest()
                for name in names if (path := source / 'Games/Capital Drive' / name).exists()}

    initial_hashes = hashes()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(source)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def check(value, label):
        assert time.monotonic() - started <= BUDGET, 'Touch QA exceeded its time budget'
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        return page.evaluate('capitalDriveSnapshot()')

    def record(label):
        state = snap()
        with (output / 'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'elapsedSeconds': round(time.monotonic() - started, 2), 'state': state}) + '\n')
        return state

    def wait(predicate, label, seconds=12):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            if predicate(snap()):
                return record(label)
            page.wait_for_timeout(100)
        record(label + ' timed out')
        raise AssertionError(label + ' timed out')

    def capture(label):
        record(label)
        if args.capture:
            page.screenshot(path=str(output / (label + '.png')), timeout=15000)

    def failure_capture(label):
        try:
            capture(label)
        except Exception as error:
            with (output / 'capture-errors.txt').open('a') as log:
                log.write(str(error) + '\n')

    def focus():
        page.locator('#world canvas').focus()

    def pulse(key):
        focus()
        page.keyboard.down(key)
        try:
            page.wait_for_timeout(100)
        finally:
            page.keyboard.up(key)
        page.wait_for_timeout(100)

    def zero(state):
        return all(not state['touch'][name]['active'] and abs(state['touch'][name]['x']) < 1e-8 and abs(state['touch'][name]['y']) < 1e-8 for name in ('move', 'look'))

    def dispatch(kind):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': list(points.values())})
        page.wait_for_timeout(70)

    def stick(name, identifier, x=0, y=0, start=False):
        box = page.locator('#touch-' + name).bounding_box()
        assert box, 'Visible joystick required: ' + name
        radius = (min(box['width'], box['height']) - 44) / 2
        assert radius > 0, 'Joystick needs thumb travel'
        points[identifier] = {'id': identifier, 'x': box['x'] + box['width'] / 2 + x * radius,
                              'y': box['y'] + box['height'] / 2 + y * radius, 'radiusX': 1, 'radiusY': 1, 'force': 1}
        dispatch('touchStart' if start else 'touchMove')

    def release(identifier):
        # CDP touchEnd names the fingers ending, unlike touchMove's active set.
        ended = points.pop(identifier)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [ended]})
        page.wait_for_timeout(70)

    def cancel():
        points.clear()
        dispatch('touchCancel')

    def resume():
        page.locator('#resume-button').click()
        wait(lambda s: not s['paused'], 'Resume returns to actual gameplay')
        focus()

    def layout(label, mobile):
        facts = page.evaluate('''() => {
          const visible=e=>!!e&&!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
          const selectors=['#touch-move','#touch-look','#touch-jump','#touch-sprint','#touch-enter','#touch-weapon','#touch-power','[data-action=aim]','[data-action=fire]','#touch-grenade','#touch-smoke'];
          const boxes=selectors.map(id=>{const e=document.querySelector(id),r=e?.getBoundingClientRect();return {id,visible:visible(e),label:e?.getAttribute('aria-label'),x:r?.x,y:r?.y,width:r?.width,height:r?.height,right:r?.right,bottom:r?.bottom};});
          const thumbs=['touch-move','touch-look'].map(id=>({id,count:document.getElementById(id)?.querySelectorAll('[data-stick-thumb]').length}));
          const hud=['.minimap-wrap','#tutorial-coach','#career-hud','.topbar','#interaction-hint','#toast'].map(id=>{const e=document.querySelector(id),r=e?.getBoundingClientRect();return {id,visible:visible(e),x:r?.x,y:r?.y,right:r?.right,bottom:r?.bottom};});
          return {mode:document.body.dataset.mode,width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,boxes,thumbs,hud};
        }''')
        facts['label'] = label
        layouts.append(facts)
        check(facts['scrollWidth'] <= facts['clientWidth'], label + ': no horizontal overflow')
        if mobile:
            required = [b for b in facts['boxes'] if b['id'] != '#touch-power' or facts['mode'] == 'campaign']
            check(all(b['visible'] and b['width'] >= 44 and b['height'] >= 44 and b['label'] for b in required), label + ': labelled mode-appropriate touch controls meet 44px')
            check(next(b['visible'] for b in facts['boxes'] if b['id'] == '#touch-power') == (facts['mode'] == 'campaign'), label + ': power action visibility matches Campaign mode')
            check(all(b['x'] >= -.5 and b['y'] >= -.5 and b['right'] <= facts['width'] + .5 and b['bottom'] <= facts['height'] + .5 for b in facts['boxes']), label + ': touch controls stay inside viewport')
            check(all(t['count'] == 1 for t in facts['thumbs']), label + ': both joysticks have one thumb')
            boxes = [b for b in facts['boxes'] if b['visible']]
            overlap = lambda a, b: max(0, min(a['right'], b['right']) - max(a['x'], b['x'])) * max(0, min(a['bottom'], b['bottom']) - max(a['y'], b['y']))
            check(all(overlap(a, b) < 1 for i, a in enumerate(boxes) for b in boxes[i + 1:]), label + ': touch controls do not overlap')
            facts['controlHudOverlaps'] = [{'control': a['id'], 'hud': b['id'], 'area': overlap(a, b)} for a in boxes for b in facts['hud'] if b['visible'] and overlap(a, b) >= 1]
            check(not any(r['hud'] in ('.minimap-wrap', '#tutorial-coach') for r in facts['controlHudOverlaps']), label + ': touch controls clear minimap and tutorial coach')
        else:
            check(all(not b['visible'] for b in facts['boxes']), label + ': desktop has no visible touch controls')
        capture(label)

    def ready(context, tutorial=False):
        nonlocal page, cdp
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=60000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
        check(not snap()['rendering']['compatibility'], 'Software WebGL available')
        page.locator('[data-game-mode=street]').click()
        page.locator('#guided-tutorial').set_checked(tutorial)
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == 'street', 'Normal Start enters Street Life')
        focus()
        cdp = context.new_cdp_session(page)
        check(zero(snap()), 'Start has neutral inactive joysticks')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, service_workers='block')
            try:
                ready(context)
                check(not snap()['tutorial']['active'], 'Actual checkbox opts out of tutorial')
                layout('mobile-portrait-dark', True)
                baseline = record('Before simultaneous driving and camera')
                stick('move', 11, start=True)
                stick('move', 11, y=-.65)
                stick('look', 22, start=True)
                stick('look', 22, x=.8)
                page.wait_for_timeout(650)
                both = record('Two actual fingers drive and look')
                check(both['touch']['move']['active'] and both['touch']['look']['active'], 'Independent simultaneous touch pointers are active')
                check(-.8 < both['touch']['move']['y'] < -.4, 'Move joystick preserves a partial analog value')
                check(abs(both['camera']['orbit'] - baseline['camera']['orbit']) > .01, 'Held right joystick moves actual vehicle camera')
                check(math.hypot(both['player']['x'] - baseline['player']['x'], both['player']['z'] - baseline['player']['z']) > .1 or abs(both['player']['speed']) > .1, 'Held left joystick actually drives the car')
                release(22)
                state = record('Look finger released with movement held')
                check(state['touch']['move']['active'] and not state['touch']['look']['active'] and abs(state['touch']['look']['x']) < 1e-8, 'Releasing look preserves movement and clears look')
                stick('look', 33, start=True)
                stick('look', 33, x=-.7)
                release(11)
                state = record('Move finger released with look held')
                check(not state['touch']['move']['active'] and state['touch']['look']['active'], 'Releasing movement preserves the other finger')
                cancel()
                check(zero(snap()), 'Actual touchCancel clears both joysticks')
                stick('move', 11, start=True)
                stick('move', 11, y=-1)
                page.locator('#pause-button').click()
                check(zero(record('Pause clears held touch')), 'Pause clears joystick values and ownership')
                cancel()
                resume()
                stick('look', 22, start=True)
                stick('look', 22, x=.8)
                page.set_viewport_size({'width': 844, 'height': 390})
                page.wait_for_timeout(150)
                check(zero(record('Resize clears held touch')), 'Resize clears active joystick')
                cancel()
                layout('mobile-landscape-dark', True)
                page.locator('#pause-button').click()
                page.locator('#theme').select_option('light')
                resume()
                layout('mobile-landscape-light', True)
                page.set_viewport_size({'width': 390, 'height': 844})
                page.wait_for_timeout(150)
                layout('mobile-portrait-light', True)
                stick('look', 22, start=True)
                stick('look', 22, x=.8)
                # Headless tab activation does not deliver OS focus changes here.
                # This negative event fixture verifies the reset handler only.
                page.evaluate("window.dispatchEvent(new Event('blur'))")
                wait(lambda s: s['paused'] and zero(s), 'Synthetic blur event fixture clears touch and pauses')
                cancel()
                resume()
                page.evaluate("window.dispatchEvent(new Event('focus'))")
                # Respect the actual E stop-then-exit contract after the driving probe.
                page.keyboard.down('Space')
                try:
                    wait(lambda s: abs(s['player']['speed']) < .01, 'Real handbrake stops car before exit')
                finally:
                    page.keyboard.up('Space')
                page.locator('#touch-enter').tap()
                state = wait(lambda s: s['gameplay']['mode'] == 'foot', 'Touch E exits stationary car')
                # Move away from the parked car along the actual clear exit vector.
                dx, dz = state['focus']['x'] - state['player']['x'], state['focus']['z'] - state['player']['z']
                length, yaw = math.hypot(dx, dz), state['camera']['footYaw']
                lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / length
                forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / length
                before = record('Before camera-relative foot movement')
                stick('move', 11, start=True)
                stick('move', 11, x=lateral, y=-forward)
                page.wait_for_timeout(500)
                moved = record('Actual camera-relative walking')
                moved_x, moved_z = moved['focus']['x'] - before['focus']['x'], moved['focus']['z'] - before['focus']['z']
                check((moved_x * dx + moved_z * dz) / length > .15, 'Left joystick walks in the camera-relative requested direction')
                stick('look', 22, start=True)
                stick('look', 22, x=.8)
                page.wait_for_timeout(450)
                walking = record('Actual simultaneous walking and looking')
                check(abs(walking['camera']['footYaw'] - moved['camera']['footYaw']) > .01, 'Right joystick rotates actual foot camera while walking')
                check(math.hypot(walking['focus']['x'] - moved['focus']['x'], walking['focus']['z'] - moved['focus']['z']) > .1, 'Foot movement continues during right joystick look')
                cancel()
                focus()
                key = ('d' if lateral > 0 else 'a') if abs(lateral) > abs(forward) else ('w' if forward > 0 else 's')
                before = snap()
                page.keyboard.down(key)
                try:
                    page.wait_for_timeout(450)
                finally:
                    page.keyboard.up(key)
                after = record('Keyboard still moves after multi-touch')
                check(math.hypot(after['focus']['x'] - before['focus']['x'], after['focus']['z'] - before['focus']['z']) > .1, 'Physical keyboard movement remains usable after touch')
                check(zero(after), 'Mobile test ends with both joysticks neutral and inactive')
            except Exception:
                failure_capture('mobile-input-failure')
                raise
            finally:
                context.close()
            context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, service_workers='block')
            try:
                ready(context, tutorial=True)
                wait(lambda s: s['tutorial']['step'] == 'look', 'Fresh tutorial starts on look lesson')
                stick('look', 22, start=True)
                page.wait_for_timeout(250)
                check(snap()['tutorial']['step'] == 'look', 'Neutral stick contact gives no false look tutorial credit')
                stick('look', 22, x=.8)
                wait(lambda s: s['tutorial']['step'] == 'walk', 'Actual right joystick camera movement credits look tutorial')
                cancel()
                check(zero(snap()), 'Tutorial touch ends neutral')
                layout('mobile-tutorial-look-complete', True)
            except Exception:
                failure_capture('mobile-tutorial-failure')
                raise
            finally:
                context.close()
            context = browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
            try:
                ready(context)
                layout('desktop-dark', False)
                page.locator('#pause-button').click()
                page.locator('#theme').select_option('light')
                resume()
                layout('desktop-light', False)
                before = snap()
                focus()
                page.keyboard.down('w')
                try:
                    page.wait_for_timeout(500)
                finally:
                    page.keyboard.up('w')
                state = record('Desktop keyboard driving remains functional')
                check(abs(state['player']['speed']) > .1 or math.hypot(state['player']['x'] - before['player']['x'], state['player']['z'] - before['player']['z']) > .1, 'Desktop keyboard still drives actual car')
                check(zero(state), 'Desktop test ends with no touch inputs')
            except Exception:
                failure_capture('desktop-failure')
                raise
            finally:
                context.close()
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests')
            check(hashes() == initial_hashes, 'Source hashes remain unchanged throughout browser verification')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
        if page and not page.is_closed():
            failure_capture('failure-state')
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks, 'errors': errors,
                  'requests': requests, 'external': external, 'layouts': layouts, 'source_sha256': initial_hashes,
                  'source_sha256_end': hashes(), 'source_unchanged': hashes() == initial_hashes,
                  'elapsedSeconds': round(time.monotonic() - started, 2),
                  'screenshots': sorted(path.name for path in output.glob('*.png')),
                  'limitations': ['Cloud software WebGL and CDP mobile emulation; physical device and Intel N100 performance remain unmeasured.',
                                  'Gameplay uses actual browser input and read-only snapshots. Service workers are blocked.',
                                  'Blur reset uses explicitly synthetic window blur/focus events; real OS blur and visibility delivery remain unproven.',
                                  'Screenshots require a separate subjective visual review.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
