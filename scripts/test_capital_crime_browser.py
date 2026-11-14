#!/usr/bin/env python3
"""Bounded real-input Street Life mugging and mapped shop hold-up verification.

Run with an outer watchdog: timeout 660s python3 -B scripts/test_capital_crime_browser.py
--output <fresh-external-directory>. No save, clock, actor or cash mutations.
"""
import argparse
from contextlib import ExitStack
import functools
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
BUDGET = 600


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--scenario', choices=['all', 'mugging', 'shop'], default='all')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and any(output.iterdir()):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    checks, failures, errors, requests, external, observations = [], [], [], [], [], []
    started, page = time.monotonic(), None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline(*_):
        raise TimeoutError(f'Crime browser run exceeded {BUDGET} seconds')

    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(BUDGET)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        if time.monotonic() - started > BUDGET:
            deadline()
        return page.evaluate('capitalDriveSnapshot()')

    def record(label):
        state = snap()
        with (output / 'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'elapsedSeconds': round(time.monotonic()-started, 2), 'state': state})+'\n')
        print('OBSERVE', label, flush=True)
        return state

    def capture(label):
        record(label)
        page.screenshot(path=str(output / (label+'.png')), timeout=15000)

    def frames():
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')

    def focus():
        page.locator('#world canvas').focus()

    def pulse(key):
        page.keyboard.down(key)
        try:
            frames()
        finally:
            page.keyboard.up(key)
        frames()

    def wait(predicate, label, seconds=12):
        end = time.monotonic()+seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                check(True, label)
                return state
            page.wait_for_timeout(100)
        record('timeout '+label)
        raise AssertionError(label)

    def ready():
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base+'/Games/Capital%20Drive/', wait_until='load', timeout=45000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
        check(not snap()['rendering']['compatibility'], 'Actual software WebGL renderer available')
        page.locator('[data-game-mode="street"]').click()
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == 'street', 'Normal Street Life start')
        focus()
        check(snap()['career']['cash'] == 1000, 'Fresh Street Life has actual $1000 starter cash')

    def look(target):
        state = snap()
        desired = math.atan2(-(target['x']-state['focus']['x']), -(target['z']-state['focus']['z']))
        delta = (state['camera']['footYaw']-desired+math.pi) % (2*math.pi)-math.pi
        rect = page.locator('#world canvas').bounding_box()
        cx, cy = rect['x']+rect['width']/2, rect['y']+rect['height']/2
        page.mouse.move(cx, cy)
        page.mouse.down(button='right')
        try:
            page.mouse.move(cx+delta/.006, cy, steps=8)
        finally:
            page.mouse.up(button='right')
        frames()

    def walk(target, tolerance=1, seconds=40, sprint=True, detours=True, moving=None):
        end, last, stalled, pressed = time.monotonic()+seconds, None, 0, set()

        def release():
            for key in list(pressed):
                page.keyboard.up(key)
            pressed.clear()

        try:
            while time.monotonic() < end:
                state = snap()
                if moving:
                    target = moving(state)
                    assert target, 'Observed pedestrian remains available'
                pose, yaw = state['focus'], state['camera']['footYaw']
                dx, dz = target['x']-pose['x'], target['z']-pose['z']
                distance = math.hypot(dx, dz)
                if distance <= tolerance:
                    release()
                    record('Normal foot waypoint reached')
                    return
                stalled = stalled+1 if last and math.hypot(pose['x']-last['x'], pose['z']-last['z']) < .025 else 0
                if stalled >= 6:
                    release()
                    assert detours, f'Physical foot route blocked {distance:.2f}m from {target}'
                    vehicles = [v for v in state['nearbyVehicles'] if math.hypot(v['x']-pose['x'], v['z']-pose['z']) < 12]
                    assert vehicles, f'Physical foot route blocked {distance:.2f}m from {target}'
                    nx, nz = -dz/distance, dx/distance
                    candidates = [{'x': pose['x']+nx*side*4.5+dx/distance, 'z': pose['z']+nz*side*4.5+dz/distance} for side in (-1, 1)]
                    candidates.sort(key=lambda p: min(math.hypot(v['x']-p['x'], v['z']-p['z']) for v in vehicles), reverse=True)
                    for detour in candidates:
                        try:
                            walk(detour, tolerance=1.2, seconds=10, detours=False)
                            break
                        except AssertionError:
                            record('Physical vehicle detour blocked')
                    else:
                        raise AssertionError('Both physical vehicle detours blocked')
                    stalled, last = 0, None
                    continue
                last = pose
                forward = (-math.sin(yaw)*dx-math.cos(yaw)*dz)/distance
                lateral = (math.cos(yaw)*dx-math.sin(yaw)*dz)/distance
                held = set()
                if abs(forward) >= .38:
                    held.add('w' if forward > 0 else 's')
                if abs(lateral) >= .38:
                    held.add('d' if lateral > 0 else 'a')
                if sprint:
                    held.add('Shift')
                for key in pressed-held:
                    page.keyboard.up(key)
                for key in held-pressed:
                    page.keyboard.down(key)
                pressed = held
                page.wait_for_timeout(100 if distance < 3 else 320)
            raise AssertionError(f'Physical foot route timed out before {target}')
        finally:
            release()

    def exit_car(drive=False):
        if drive:
            before = record('Fresh starting car')
            page.keyboard.down('w')
            try:
                page.wait_for_timeout(2000)
            finally:
                page.keyboard.up('w')
            after = record('Two seconds actual car throttle')
            check(math.hypot(after['player']['x']-before['player']['x'], after['player']['z']-before['player']['z']) > 5, 'Actual W drives starting car more than five metres')
        page.keyboard.down('Space')
        try:
            wait(lambda s: abs(s['player']['speed']) < .15, 'Normal brake stops car', 15)
        finally:
            page.keyboard.up('Space')
        pulse('e')
        wait(lambda s: s['gameplay']['mode'] == 'foot', 'Normal E exits starting car')
        page.set_viewport_size({'width': 320, 'height': 240})
        state = snap()
        gate = min(state['campusGates'], key=lambda g: math.hypot(g['x']-state['focus']['x'], g['z']-state['focus']['z']))
        if math.hypot(gate['x']-state['focus']['x'], gate['z']-state['focus']['z']) < 20:
            walk({'x': gate['inside'][0], 'z': gate['inside'][1]})
            walk({'x': gate['outside'][0], 'z': gate['outside'][1]})

    def adults(state):
        people = state['pedestrians']['sample']+state['pedestrians'].get('routineSample', [])
        return list({p['id']: p for p in people}.values())

    def hold_up(kind, target_id):
        before = record('Before actual '+kind)
        wallet = before['career']['cash']
        pulse('e')
        initial = wait(lambda s: s['activity'] and s['activity']['type'] == kind, 'Normal E begins target-bound '+kind, 5)
        check(initial['activity']['interactive'] and initial['activity']['targetId'] == target_id, 'Live activity binds the actual confronted target')
        check(initial['career']['cash'] == wallet, 'Starting hold-up gives no immediate money')
        pulse('e')
        cancelled = snap()
        check(cancelled['activity'] is None and cancelled['career']['cash'] == wallet, 'Normal E cancels an active hold-up without payment')
        pulse('e')
        initial = wait(lambda s: s['activity'] and s['activity']['type'] == kind, 'Normal E restarts the unpaid hold-up', 5)
        check(initial['activity']['targetId'] == target_id, 'Restart binds the same actual confronted target')
        state = snap()
        yaw = state['camera']['footYaw']+.6
        look({'x': state['focus']['x']-math.sin(yaw)*4, 'z': state['focus']['z']-math.cos(yaw)*4})
        phases, pose = {initial['activity']['phase']}, None
        end = time.monotonic()+35
        captured = False
        while time.monotonic() < end:
            state = snap()
            activity = state['activity']
            if not activity:
                break
            phases.add(activity['phase'])
            people = state['roomPeople'] if kind == 'robbery' else adults(state)
            victim = next(p for p in people if (p['id'] if kind == 'robbery' else 'ped:'+str(p['id'])) == target_id)
            if victim.get('crimePhase'):
                assert victim['crimePhase'] == activity['phase'], 'Victim pose follows authoritative phase'
                point = (victim['x'], victim['z'])
                if pose:
                    assert math.hypot(point[0]-pose[0], point[1]-pose[1]) < .05, 'Coerced victim remains physically in place'
                pose = point
            if activity['phase'] == 'emptying' and not captured:
                capture(kind+'-native-emptying')
                captured = True
            page.wait_for_timeout(100)
        after = record('After actual '+kind+' handover')
        reward = after['career']['cash']-wallet
        check(after['activity'] is None, 'Timed hold-up finishes')
        check(pose is not None, 'Actual victim receives the phase-bound compliance pose')
        check({'intimidation', 'emptying', 'handover'} <= phases, 'Actual hold-up traverses all three visible phases')
        if kind == 'mugging':
            check(30 <= reward <= 100, 'Actual pedestrian handover pays $30 to $100 once')
            cooldowns = after['career']['muggingCooldowns']
        else:
            site = next(s for s in after['services'] if s['id'] == after['interiors']['active']['storeId'])
            check(reward == site['robbery'], 'Actual employee handover pays this till exact reward once')
            cooldowns = after['career']['robberyCooldowns']
            target_id = site['id']
        check(170 < cooldowns[target_id] <= 180, 'Successful hold-up starts the saved till or victim cooldown')
        check(after['gameplay']['wanted'] > 0, 'Actual hold-up produces wanted stars')
        saved = page.evaluate('JSON.parse(localStorage.getItem("capital-drive-career-v1"))')
        check(saved['cash'] == after['career']['cash'], 'Real career writer persists earned wallet')
        saved_cooldowns = saved['muggingCooldowns'] if kind == 'mugging' else saved['robberyCooldowns']
        check(170 < saved_cooldowns[target_id] <= 180, 'Real writer persists the successful cooldown')
        pulse('e')
        page.wait_for_timeout(300)
        check(snap()['career']['cash'] == after['career']['cash'], 'Repeated E cannot pay the same victim or till again')
        observations.append({'kind': kind, 'target': target_id, 'reward': reward, 'phases': sorted(phases)})

    def mugging():
        exit_car(drive=True)
        state = record('Ordinary pedestrian candidates')
        candidates = [p for p in adults(state) if p['health'] > 0]
        target = min(candidates, key=lambda p: math.hypot(p['x']-state['focus']['x'], p['z']-state['focus']['z']))
        target_id = target['id']
        current = lambda s: next((p for p in adults(s) if p['id'] == target_id), None)
        walk(target, tolerance=1.5, seconds=75, moving=current)
        target = current(snap())
        look(target)
        page.set_viewport_size({'width': 1280, 'height': 800})
        look(current(snap()))
        pulse('f')
        wait(lambda s: current(s)['health'] < 100 and current(s)['threatened'], 'Actual melee confronts ordinary pedestrian', 4)
        hold_up('mugging', 'ped:'+str(target_id))

    def shop():
        # The map creates an ordinary road route. Street Life has no teleport action.
        pulse('m')
        page.locator('#map-search').fill('Coals')
        page.locator('#map-search-form button[type=submit]').click()
        page.locator('#search-results button').first.click()
        page.locator('#map-route-button').click()
        path = snap()['routePath']
        check(len(path) >= 2, 'Normal search and Set route create the mapped Manuka road path')
        check(not page.locator('#teleport-button').is_visible(), 'Street Life exposes no teleport control')
        if page.locator('#map-dialog').is_visible():
            page.locator('[data-close="map-dialog"]').click()
        frames()
        focus()
        exit_car()
        site = next(s for s in snap()['services'] if s['id'] == 'store-358293199')
        first = next(i for i, p in enumerate(path) if math.hypot(p['x']-snap()['player']['x'], p['z']-snap()['player']['z']) > 8)
        for point in path[first:]:
            if math.hypot(snap()['focus']['x']-site['x'], snap()['focus']['z']-site['z']) < 12:
                break
            walk(point, tolerance=3.5, seconds=65)
        walk(site.get('publicApproach', site), tolerance=1.8, seconds=40)
        walk(site['frontage'], tolerance=2.2, seconds=30)
        check(snap()['career']['cash'] == 1000, 'Normal travel reaches Manuka without cash or position grants')
        pulse('e')
        state = wait(lambda s: s['interiors']['active'] and s['interiors']['active'].get('storeId') == site['id'], 'Normal E enters the actual mapped Coals shop')
        plan = state['interiors']['active']
        staff = next(p for p in state['roomPeople'] if p['role'] in ('shopkeeper', 'cashier', 'cook'))
        check(staff['health'] == 100, 'Mapped shop generates its actual healthy employee')
        origin = plan['origin']
        walk({'x': origin['x']+math.sin(origin['yaw'])*7,
              'z': origin['z']+math.cos(origin['yaw'])*7}, tolerance=.25, sprint=False)
        walk(plan['counter'], tolerance=.35, sprint=False)
        look(staff)
        page.set_viewport_size({'width': 1280, 'height': 800})
        pulse('f')
        wait(lambda s: any(p['id'] == staff['id'] and p['health'] < 100 and p['threatened'] for p in s['roomPeople']), 'Actual melee confronts mapped employee across low counter', 4)
        hold_up('robbery', staff['id'])

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            scenarios = [('mugging', mugging), ('shop', shop)] if args.scenario == 'all' else [(args.scenario, mugging if args.scenario == 'mugging' else shop)]
            for name, run in scenarios:
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                page = context.new_page()
                try:
                    ready()
                    run()
                except Exception as error:
                    failures.append({'scenario': name, 'error': f'{type(error).__name__}: {error}'})
                    print('FAIL', name, str(error), flush=True)
                    try:
                        capture(name+'-failure')
                    except Exception as capture_error:
                        observations.append({'captureFailure': str(capture_error)})
                finally:
                    context.close()
                if time.monotonic()-started > BUDGET-50 and name != scenarios[-1][0]:
                    failures.append({'scenario': scenarios[-1][0], 'error': 'Not run: cooperative budget exhausted'})
                    break
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime request attempts')
    except Exception as error:
        failures.append({'scenario': 'harness', 'error': f'{type(error).__name__}: {error}'})
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'status': 'FAIL' if failures else 'PASS', 'scenario': args.scenario, 'checks': checks,
                  'failures': failures, 'errors': errors, 'requests': requests, 'external': external,
                  'observations': observations, 'elapsedSeconds': round(time.monotonic()-started, 2),
                  'screenshots': sorted(p.name for p in output.glob('*.png')),
                  'limitations': ['Software WebGL; N100 performance and touch combat unmeasured.',
                                  'Positive gameplay uses only normal input and read-only diagnostics.',
                                  'Screenshot appearance requires separate visual review.']}
        (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
