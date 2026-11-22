#!/usr/bin/env python3
"""Bounded normal-input Free roam jet lock, flight, landing and exit evidence.

timeout 300s python3 -B scripts/test_capital_aircraft_browser.py --capture --output <fresh-external>
No save fixture, private controls, production setters or replacement clocks.
The jet stand is fictional placement on the sourced apron. Travel uses the
ordinary Free roam map search/Teleport UI and never proves career progression.
"""
import argparse
from contextlib import ExitStack
import functools
import hashlib
import http.server
import json
import math
from pathlib import Path
import signal
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--capture', action='store_true')
    args = parser.parse_args()
    source, output = args.root.resolve(), args.output.resolve()
    if any(output == p or p in output.parents for p in (ROOT, source)):
        parser.error('--output must be outside the source/repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    page, failure, held = None, None, set()

    def hashes():
        game = source / 'Games/Capital Drive'
        paths = sorted([*game.glob('*.js'), game / 'index.html', game / 'style.css', *game.glob('data/*.json')])
        return {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}

    initial_hashes = hashes()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(source)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def check(value, label):
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

    def wait(predicate, label, seconds=15):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label)
            page.wait_for_timeout(70)
        record(label + ' timed out')
        raise AssertionError(label + ' timed out')

    def focus():
        page.locator('#world canvas').focus()

    def keys(wanted):
        wanted = set(wanted)
        for key in held - wanted:
            page.keyboard.up(key)
        for key in wanted - held:
            page.keyboard.down(key)
        held.clear()
        held.update(wanted)

    def pulse(key):
        focus()
        page.keyboard.down(key)
        try:
            page.wait_for_timeout(60)
        finally:
            page.keyboard.up(key)
        page.wait_for_timeout(60)

    def capture(label):
        record(label)
        if args.capture:
            page.screenshot(path=str(output / (label + '.png')), timeout=15000)

    def walk(target, tolerance=1.2, seconds=25, entry_point=None):
        end, last, stalled = time.monotonic() + seconds, None, 0
        while time.monotonic() < end:
            state = snap()
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x'] - pose['x'], target['z'] - pose['z']
            distance = math.hypot(dx, dz)
            within_entry = entry_point and math.hypot(pose['x'] - entry_point['x'], pose['z'] - entry_point['z']) <= 3.3
            if distance <= tolerance or within_entry:
                keys([])
                return record('Normal foot waypoint reached')
            stalled = stalled + 1 if last and math.hypot(pose['x'] - last['x'], pose['z'] - last['z']) < .025 else 0
            assert stalled < 14, 'Normal jet approach blocked by actual collision'
            last = pose
            forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / distance
            lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / distance
            wanted = []
            if abs(forward) >= .38:
                wanted.append('w' if forward > 0 else 's')
            if abs(lateral) >= .38:
                wanted.append('d' if lateral > 0 else 'a')
            keys(wanted)
            page.wait_for_timeout(140 if distance < 3 else 220)
        keys([])
        raise AssertionError('Normal foot jet approach exceeded its time bound')

    def altitude(state):
        plane = state['aircraft']['active']
        if plane is None:
            return 0
        return plane.get('altitude', max(0, plane['y'] - plane.get('groundY', initial_ground)))

    def retain_failure(error_type, error, traceback):
        if error_type and page and not page.is_closed():
            try:
                keys([])
                capture('aircraft-failure')
            except Exception as capture_error:
                observations.append({'captureError': str(capture_error)})
        return False

    def expired(*args):
        raise TimeoutError('Aircraft native run exceeded 270 seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(270)
    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
            stack.callback(context.close)
            page = context.new_page()
            stack.push(retain_failure)
            page.set_default_timeout(12000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
            page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
            page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
            page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
            page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=60000)
            page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
            check(not snap()['rendering']['compatibility'], 'Actual software WebGL boots with aircraft')
            planes = snap()['aircraft']['planes']
            check(sum(plane['kind'] == 'jet' and not plane.get('depot') for plane in planes) == 2, 'Actual sourced apron admits two original jets')
            check(any(plane['id'] == 'jet:depot' and plane.get('depot') for plane in planes), 'Fictional depot supplies a flyable interceptor')
            check(sum(plane['kind'] == 'helicopter' for plane in planes) == 1, 'Actual map admits one checked helicopter')
            page.locator('[data-game-mode=free]').click()
            page.locator('#guided-tutorial').uncheck()
            page.locator('#start-button').click()
            wait(lambda s: s['started'] and s['gameMode'] == 'free', 'Normal Start enters Free roam')
            page.locator('#pause-button').click()
            page.locator('#quality').select_option('performance')
            page.locator('#resume-button').click()
            focus()
            pulse('m')
            page.locator('#map-search').fill('jet')
            page.locator('#map-search-form button[type=submit]').click()
            result = page.locator('#search-results button').filter(has_text='jet stand').first
            result.wait_for(state='visible')
            result.click()
            check(page.locator('#teleport-button').is_enabled(), 'Normal jet search admits only allowed Free roam teleport')
            page.locator('#teleport-button').click()
            wait(lambda s: not s['paused'], 'Normal map teleport reaches the fictional apron stand')
            focus()
            pulse('e')
            state = wait(lambda s: s['gameplay']['mode'] == 'foot' and not s['gameplay']['passenger'], 'Actual E exits the parked car at the jet stand')
            plane = min(state['aircraft']['planes'], key=lambda p: math.hypot(p['x'] - state['focus']['x'], p['z'] - state['focus']['z']))
            # Stand outside the fuselage on the actual right-door side.
            approach = {'x': plane['x'] + math.cos(plane['yaw']) * 3.3 - math.sin(plane['yaw']) * 1.3,
                        'z': plane['z'] - math.sin(plane['yaw']) * 3.3 - math.cos(plane['yaw']) * 1.3}
            car, pose = state['player'], state['focus']
            dx, dz = approach['x'] - car['x'], approach['z'] - car['z']
            distance = math.hypot(dx, dz)
            if distance > 6:
                fx, fz = dx / distance, dz / distance
                side = 1 if (pose['x'] - car['x']) * fz - (pose['z'] - car['z']) * fx >= 0 else -1
                walk({'x': car['x'] + fx * 4.5 + fz * side * 4.5, 'z': car['z'] + fz * 4.5 - fx * side * 4.5})
            door = {'x': plane['x'] + math.cos(plane['yaw']) * 2.1 - math.sin(plane['yaw']) * 1.3,
                    'z': plane['z'] - math.sin(plane['yaw']) * 2.1 - math.cos(plane['yaw']) * 1.3}
            walk(approach, entry_point=door)
            baseline = record('Before native jet lock')
            pulse('e')
            wait(lambda s: s['aircraft']['challenge']['active'], 'Ordinary E starts actual eight-cue jet lock')
            pulse('e')
            cancelled = wait(lambda s: not s['aircraft']['challenge']['active'], 'Ordinary E cancels jet lock without boarding')
            check(cancelled['aircraft']['activeId'] is None, 'Cancelled lock does not admit jet controls')
            pulse('e')
            lock = wait(lambda s: s['aircraft']['challenge']['active'], 'Ordinary E starts a fresh jet lock session')['aircraft']['challenge']
            check(len(lock['sequence']) == 8, 'Actual jet lock presents exactly eight cues')
            capture('jet-lock-start')
            for index in range(8):
                cue = page.wait_for_function(f'''()=>{{const c=capitalDriveSnapshot().aircraft.challenge;
                  const e=document.querySelector('#activity-cue'),tiles=[...document.querySelectorAll('#activity-sequence .current')];
                  return c.active&&c.phase==='cue'&&c.index==={index}&&c.cueRemaining>.55&&e.textContent.startsWith('PRESS ')&&tiles.length===1&&tiles[0].dataset.key===c.expectedKey?{{key:c.expectedKey,count:document.querySelectorAll('#activity-sequence kbd').length}}:false;}}''', timeout=10000).json_value()
                check(cue['count'] == 8, f'Jet cue {index + 1} visibly belongs to full eight-key sequence')
                pulse({'x': 'x', 'y': 'y', 'up': 'ArrowUp'}[cue['key']])
            boarded = wait(lambda s: s['aircraft']['activeId'] == plane['id'] and s['gameplay']['passenger'], 'Eight actual released cues board the selected jet')
            initial_ground = boarded['aircraft']['active']['y']
            parked_car = {k: boarded['player'][k] for k in ('x', 'z', 'yaw')}
            before_camera = boarded['camera']['y']
            check(boarded['aircraft']['active']['stolen'], 'Only completed lock marks the actual jet taken')
            focus()
            keys(['w', 'Space'])
            page.wait_for_timeout(160)
            page.locator('#pause-button').click()
            page.locator('#pause-dialog').wait_for(state='visible')
            paused = record('Actual paused jet')
            page.wait_for_timeout(350)
            frozen = record('Jet remains frozen while paused')
            check(frozen['aircraft']['active'] == paused['aircraft']['active'], 'Actual Pause freezes aircraft pose, throttle and motion')
            page.locator('#resume-button').click()
            focus()
            page.wait_for_timeout(250)
            neutral = record('Resume after held jet controls were cleared')
            check(neutral['aircraft']['active']['throttle'] == paused['aircraft']['active']['throttle'], 'Resume does not retain held aircraft throttle input')
            keys([])
            keys(['w', 'Space'])
            flying = wait(lambda s: s['aircraft']['active']['airborne'] and altitude(s) >= 10, 'Actual W and Space taxi and climb into flight', seconds=18)
            keys([])
            check(not flying['aircraft']['active']['wrecked'], 'Actual takeoff retains an intact aircraft')
            check(flying['camera']['y'] - before_camera > 4, 'Actual chase camera rises with aircraft altitude')
            check(all(abs(flying['player'][k] - parked_car[k]) < 1e-8 for k in parked_car), 'Parked owned car stays stationary throughout actual flight')
            capture('jet-native-flight')
            # Keep speed above stall and below the module's safe landing limit,
            # using only W/S and the normal held descent control.
            end = time.monotonic() + 18
            while time.monotonic() < end:
                state = snap()
                active = state['aircraft']['active']
                assert active and not active['wrecked'], 'Actual native flight or landing damaged the jet'
                if not active['airborne']:
                    break
                wanted = ['Shift']
                if active['speed'] > 38:
                    wanted.append('s')
                elif active['speed'] < 30:
                    wanted.append('w')
                keys(wanted)
                page.wait_for_timeout(100)
            else:
                raise AssertionError('Native controlled descent did not reach the ground')
            keys(['s'])
            stopped = wait(lambda s: not s['aircraft']['active']['airborne'] and s['aircraft']['active']['speed'] <= .1, 'Actual S stops the landed jet', seconds=12)
            keys([])
            check(not stopped['aircraft']['active']['wrecked'], 'Actual landing is gentle enough to preserve the jet')
            capture('jet-landed-stopped')
            pulse('e')
            final = wait(lambda s: s['aircraft']['activeId'] is None and not s['gameplay']['passenger'] and s['gameplay']['mode'] == 'foot', 'Actual landed E exit returns player to the apron')
            check(final['career'] == baseline['career'] and final['campaign']['completed'] == baseline['campaign']['completed'], 'Free roam jet lock, flight and exit grant no career cash or mission progress')
            check(all(abs(final['player'][k] - parked_car[k]) < 1e-8 for k in parked_car), 'Original parked car remains at its real pre-flight pose')
            check(all(not final['touch'][k]['active'] and final['touch'][k]['x'] == 0 and final['touch'][k]['y'] == 0 for k in ('move', 'look')) and not held, 'Native aircraft run finishes with no held controls')
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests')
            check(hashes() == initial_hashes, 'Runtime source hashes remain unchanged throughout aircraft verification')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, prior)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        final_hashes = hashes()
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks, 'errors': errors,
                  'requests': requests, 'external': external, 'observations': observations,
                  'source_sha256': initial_hashes, 'source_sha256_end': final_hashes, 'source_unchanged': initial_hashes == final_hashes,
                  'elapsedSeconds': round(time.monotonic() - started, 2), 'screenshots': sorted(p.name for p in output.glob('*.png')),
                  'limitations': ['Actual browser keyboard/UI inputs and read-only snapshots; no naturally earned career theft or rewards are claimed.',
                                  'Free roam map travel selects a fictional jet stand on sourced apron geometry.',
                                  'Software WebGL at the actual Performance setting; physical-device/N100 performance and real OS blur remain unmeasured.',
                                  'Short native taxi, flight and landing path only; no whole-map flight or aircraft simulation fidelity claim.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
