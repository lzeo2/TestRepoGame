#!/usr/bin/env python3
"""Bounded normal-input Yoober passenger/driver QA using detached observations.

Run under an outer watchdog, for example ``timeout 660s python3 -B ...``.
No save fixtures, gameplay setters, clock changes, or map travel are used.
"""
import argparse
from contextlib import ExitStack
import functools
import http.server
import json
import math
from pathlib import Path
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
    parser.add_argument('--scenario', choices=['passenger', 'driver', 'all'], default='passenger')
    parser.add_argument('--capture', action='store_true', help='Capture the requested visual QA batch.')
    parser.add_argument('--output', required=True, type=Path, help='Fresh evidence directory outside the repository.')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be a fresh or empty directory')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    failure, page = None, None
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline():
        if time.monotonic() - started > BUDGET:
            raise TimeoutError(f'Yoober browser run exceeded {BUDGET} seconds')

    def check(value, label):
        deadline()
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        deadline()
        return page.evaluate('capitalDriveSnapshot()')

    def record(label):
        state = snap()
        with (output / 'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'state': state,
                                  'elapsedSeconds': round(time.monotonic() - started, 2)}) + '\n')
        return state

    def capture(name):
        record(name)
        if args.capture:
            page.screenshot(path=str(output / (name + '.png')), timeout=15000)

    def frames():
        deadline()
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

    def wait(predicate, label, seconds=60):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label)
            ride = state.get('rideService', {})
            assert ride.get('phase') not in ('failed', 'cancelled'), f'{label}: {ride.get("reason")}'
            page.wait_for_timeout(250)
        record(label + ' timed out')
        raise AssertionError(label + ' timed out')

    def phone():
        if not page.locator('#phone-dialog').is_visible():
            focus()
            pulse('t')
        page.locator('#phone-dialog').wait_for(state='visible')

    def close_phone():
        if page.locator('#phone-dialog').is_visible():
            page.locator('[data-close="phone-dialog"]').click()
        frames()
        focus()

    def walk(target, tolerance=1, seconds=30, detours=True):
        """Actual WASD steering; nearby physical cars may require a real detour."""
        end, last, stalled = time.monotonic() + seconds, None, 0
        pressed = set()

        def release():
            for key in list(pressed):
                page.keyboard.up(key)
            pressed.clear()

        try:
            while time.monotonic() < end:
                state = snap()
                pose, yaw = state['focus'], state['camera']['footYaw']
                dx, dz = target['x'] - pose['x'], target['z'] - pose['z']
                distance = math.hypot(dx, dz)
                if distance <= tolerance:
                    release()
                    record('normal foot waypoint reached')
                    return
                stalled = stalled + 1 if last and math.hypot(pose['x'] - last['x'], pose['z'] - last['z']) < .025 else 0
                if stalled >= 5:
                    release()
                    vehicles = [v for v in state['nearbyVehicles'] if math.hypot(v['x'] - pose['x'], v['z'] - pose['z']) < 11]
                    assert detours and vehicles, f'Normal foot route blocked {distance:.2f}m before {target}'
                    nx, nz = -dz / distance, dx / distance
                    options = [{'x': pose['x'] + nx * side * 4.5 + dx / distance,
                                'z': pose['z'] + nz * side * 4.5 + dz / distance} for side in (-1, 1)]
                    options.sort(key=lambda p: min(math.hypot(v['x'] - p['x'], v['z'] - p['z']) for v in vehicles), reverse=True)
                    passed = False
                    for detour in options:
                        try:
                            walk(detour, tolerance=1.2, seconds=10, detours=False)
                            passed = True
                            break
                        except AssertionError:
                            record('physical foot detour blocked')
                    assert passed, f'Both physical foot detours blocked before {target}'
                    stalled, last = 0, None
                    continue
                last = pose
                forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / distance
                lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / distance
                held = set()
                if abs(forward) >= .38:
                    held.add('w' if forward > 0 else 's')
                if abs(lateral) >= .38:
                    held.add('d' if lateral > 0 else 'a')
                for key in pressed - held:
                    page.keyboard.up(key)
                for key in held - pressed:
                    page.keyboard.down(key)
                pressed = held
                page.wait_for_timeout(160 if distance < 2 else 320)
            raise AssertionError(f'Normal foot route timed out before {target}')
        finally:
            release()

    def look(target):
        state = snap()
        desired = math.atan2(-(target['x'] - state['focus']['x']), -(target['z'] - state['focus']['z']))
        delta = (state['camera']['footYaw'] - desired + math.pi) % (2 * math.pi) - math.pi
        rect = page.locator('#world canvas').bounding_box()
        cx, cy = rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2
        page.mouse.move(cx, cy)
        page.mouse.down(button='right')
        try:
            page.mouse.move(cx + delta / .006, cy, steps=8)
        finally:
            page.mouse.up(button='right')
        frames()

    def ready():
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=45000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
        check(not snap()['rendering']['compatibility'], 'Software WebGL is available')
        page.locator('[data-game-mode="street"]').click()
        page.locator('#start-button').click()
        page.wait_for_function('capitalDriveSnapshot().started&&capitalDriveSnapshot().gameMode==="street"')
        focus()
        check(snap()['career']['cash'] == 1000, 'Fresh Street Life uses its actual $1000 starting cash')

    def passenger_case():
        before = record('fresh career before passenger booking')
        pulse('e')
        wait(lambda s: s['gameplay']['mode'] == 'foot', 'Normal E exits the starting car', 12)
        # E may exit on the campus side of the actual fence. Use its real gate.
        pose = snap()['focus']
        gates = snap().get('campusGates', [])
        if gates:
            gate = min(gates, key=lambda g: math.hypot(g['x'] - pose['x'], g['z'] - pose['z']))
            if math.hypot(gate['x'] - pose['x'], gate['z'] - pose['z']) < 20:
                walk({'x': gate['inside'][0], 'z': gate['inside'][1]}, tolerance=.8)
                walk({'x': gate['outside'][0], 'z': gate['outside'][1]}, tolerance=.8)
        phone()
        check(page.locator('#phone-dialog').get_by_role('heading', name='Yoober', exact=True).is_visible(), 'T phone shows the Yoober passenger booking section')
        page.locator('#yoober-destination').select_option(index=0)
        check(page.locator('#yoober-book').is_enabled(), 'Short local ride has a valid normal booking quote')
        page.set_viewport_size({'width': 390, 'height': 844})
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), '390px phone fits without horizontal page overflow')
        for selector in ('#yoober-destination', '#yoober-book'):
            rect = page.locator(selector).bounding_box()
            check(rect is not None and rect['width'] >= 44 and rect['height'] >= 44, selector + ' retains a 44px touch target')
        capture('yoober-phone-390')
        page.set_viewport_size({'width': 320, 'height': 240})
        pose = snap()['focus']
        page.locator('#yoober-book').click()
        booked = record('local ride booked through phone')
        ride = booked['rideService']
        fare = ride['fare']
        check(ride['phase'] == 'approaching' and ride['car']['active'] and not ride['passenger'], 'Booking summons a physical approaching NPC car')
        check(fare > 0 and booked['career']['cash'] == 1000, 'Booking quotes a fare and charges nothing before boarding')
        check(math.hypot(booked['focus']['x'] - pose['x'], booked['focus']['z'] - pose['z']) < .05, 'Booking preserves the actual player position')
        close_phone()
        walk(ride['pickup']['walk'], tolerance=1.2, seconds=45)
        arrived = wait(lambda s: s['rideService']['phase'] == 'waiting', 'NPC drives to the real pickup and stops', 150)
        check(math.hypot(arrived['rideService']['car']['x'] - ride['car']['x'], arrived['rideService']['car']['z'] - ride['car']['z']) > 20, 'NPC approach travels through the road instead of appearing at pickup')
        page.set_viewport_size({'width': 391, 'height': 844})
        look(arrived['rideService']['car'])
        capture('yoober-waiting-driver-391')
        page.set_viewport_size({'width': 320, 'height': 240})
        pulse('e')
        boarded = wait(lambda s: s['rideService']['passenger'], 'Normal E boards the stopped driver', 12)
        check(boarded['rideService']['phase'] == 'riding' and boarded['rideService']['paid'], 'Boarding starts the paid automatic ride')
        check(boarded['career']['cash'] == 1000 - fare, 'Boarding debits the actual quoted fare exactly once')
        start_car = boarded['rideService']['car']
        moving = wait(lambda s: math.hypot(s['rideService']['car']['x'] - start_car['x'], s['rideService']['car']['z'] - start_car['z']) > 15, 'NPC drives with the real passenger aboard', 60)
        check(math.hypot(moving['focus']['x'] - moving['rideService']['seatPose']['x'], moving['focus']['z'] - moving['rideService']['seatPose']['z']) < .1, 'Player follows the NPC passenger seat during road travel')
        wait(lambda s: s['rideService']['phase'] == 'arrived', 'NPC reaches the actual destination and stops', 240)
        page.set_viewport_size({'width': 1280, 'height': 800})
        capture('yoober-passenger-arrival')
        pulse('e')
        ended = wait(lambda s: s['rideService']['phase'] == 'complete' and not s['rideService']['passenger'], 'Normal E exits at the stopped destination', 12)
        check(ended['gameplay']['mode'] == 'foot', 'Completed passenger trip returns to actual on-foot gameplay')
        check(ended['career']['cash'] == 1000 - fare and ended['career']['completedJobs'] == before['career']['completedJobs'], 'Passenger travel never pays driver earnings or charges the fare twice')
        page.wait_for_timeout(500)
        check(snap()['career']['cash'] == 1000 - fare, 'Post-trip simulation preserves the single fare debit')

    def drive_to(target, tolerance=6, seconds=50):
        end = time.monotonic() + seconds
        held = set()
        try:
            while time.monotonic() < end:
                car = snap()['player']
                dx, dz = target['x'] - car['x'], target['z'] - car['z']
                distance = math.hypot(dx, dz)
                if distance <= tolerance:
                    break
                desired = math.atan2(-dx, -dz)
                turn = math.atan2(math.sin(desired - car['yaw']), math.cos(desired - car['yaw']))
                current = {'w'} if car['speed'] < min(6, max(1.5, distance / 3)) else {'Space'}
                if abs(turn) > .07:
                    current.add('a' if turn > 0 else 'd')
                for key in held - current:
                    page.keyboard.up(key)
                for key in current - held:
                    page.keyboard.down(key)
                held = current
                page.wait_for_timeout(160)
            else:
                raise AssertionError(f'Normal driving timed out before {target}')
        finally:
            for key in held:
                page.keyboard.up(key)
        page.keyboard.down('Space')
        try:
            wait(lambda s: abs(s['player']['speed']) <= .15, 'Normal handbrake stops at fare marker', 12)
        finally:
            page.keyboard.up('Space')

    def driver_case():
        phone()
        job = page.locator('[data-yoober-job="yoober-crescent"]')
        check(job.is_enabled(), 'Phone offers the nearby Crescent driver fare in a fresh career')
        job.click()
        if page.locator('#phone-dialog').is_visible():
            close_phone()
        focus()
        started_job = record('Crescent driver fare started by normal phone button')
        check(started_job['career']['cash'] == 1000 and started_job['activeJob']['id'] == 'yoober-crescent', 'Starting driver work creates its route without awarding money')
        frames()
        waiting_job = snap()['activeJob']
        waiting_pose = waiting_job.get('waitingPose')
        check(waiting_pose and all(isinstance(waiting_pose.get(axis), (int, float)) and math.isfinite(waiting_pose[axis]) for axis in ('x', 'z')) and
              math.hypot(waiting_pose['x'] - waiting_job['target']['x'], waiting_pose['z'] - waiting_job['target']['z']) > 2,
              'Driver fare adult waits at the real road-side pose away from the driving marker')
        check(snap()['rideView']['waiting'] == 1, 'Nearby driver pickup has its rendered waiting adult')
        page.set_viewport_size({'width': 391, 'height': 844})
        capture('yoober-waiting-passenger-391')
        page.set_viewport_size({'width': 320, 'height': 240})
        drive_to(started_job['activeJob']['target'])
        picked = wait(lambda s: bool(s['activeJob'] and s['activeJob'].get('passenger')), 'Actual stopped car picks up the driver-job passenger', 12)
        check(picked['career']['cash'] == 1000, 'Driver pickup earns no premature reward')
        frames()
        check(snap()['rideView']['farePassenger'], 'Actual driver-job passenger is seated in the owned car')
        drive_to(picked['activeJob']['target'])
        paid = wait(lambda s: s['activeJob'] is None, 'Actual stopped drop-off completes the local driver fare', 12)
        check(paid['career']['cash'] == 1045 and 'yoober-crescent' in paid['career']['completedJobs'], 'Only the completed driver job pays its actual $45 reward')
        page.wait_for_timeout(500)
        check(snap()['career']['cash'] == 1045, 'Remaining at drop-off cannot duplicate the driver payment')
        page.set_viewport_size({'width': 1280, 'height': 800})
        capture('yoober-driver-fare-complete')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            for scenario in (['passenger', 'driver'] if args.scenario == 'all' else [args.scenario]):
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                try:
                    page = context.new_page()
                    ready()
                    (passenger_case if scenario == 'passenger' else driver_case)()
                except Exception:
                    try:
                        capture(scenario + '-failure-state')
                    except Exception as capture_error:
                        observations.append({'failureCapture': str(capture_error)})
                    raise
                finally:
                    context.close()
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime request attempts')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
        observations.append({'failure': failure})
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'scenario': args.scenario, 'status': 'FAIL' if failure else 'PASS', 'failure': failure,
                  'checks': checks, 'errors': errors, 'requests': requests, 'external': external,
                  'observations': observations, 'elapsedSeconds': round(time.monotonic() - started, 2),
                  'screenshots': sorted(p.name for p in output.glob('*.png')),
                  'limitations': ['Software WebGL only; native/N100 GPU performance is unmeasured.',
                                 '390px checks layout; touch travel is unexercised.',
                                 'Gameplay uses actual keys/mouse and detached read-only snapshots.',
                                 'Screenshots require separate visual review.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
