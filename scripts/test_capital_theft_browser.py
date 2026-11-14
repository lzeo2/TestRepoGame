#!/usr/bin/env python3
"""Bounded normal-input scooter hacking and car unlocking QA (software WebGL)."""
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
BUDGET = 360


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path,
                        help='Fresh or empty evidence directory outside the repository.')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and any(output.iterdir()):
        parser.error('--output contains evidence; choose a fresh directory')
    output.mkdir(parents=True, exist_ok=True)
    checks, errors, requests, external, observations = [], [], [], [], []
    started, failure, page = time.monotonic(), None, None
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline(signum, frame):
        raise TimeoutError(f'Theft browser run exceeded {BUDGET} seconds')

    previous_alarm = signal.signal(signal.SIGALRM, deadline)
    signal.alarm(BUDGET)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        return page.evaluate('capitalDriveSnapshot()')

    def record(label):
        state = snap()
        with (output/'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'state': state,
                                  'elapsedSeconds': round(time.monotonic()-started, 2)})+'\n')
        return state

    def capture(name):
        record(name)
        page.screenshot(path=str(output/(name+'.png')), timeout=15000)

    def focus_world():
        page.locator('#world canvas').focus()

    def frames():
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')

    def pulse(key):
        page.keyboard.down(key)
        try:
            frames()
        finally:
            page.keyboard.up(key)
        frames()

    def foot():
        if snap()['gameplay']['mode'] != 'foot':
            pulse('e')
            if snap()['gameplay']['mode'] != 'foot':
                pulse('e')
        page.wait_for_function('capitalDriveSnapshot().gameplay.mode==="foot"')

    def teleport_point(x, z):
        page.locator('#map-button').click()
        for _ in range(8):
            if snap()['mapView']['zoom'] <= 1:
                break
            page.locator('#map-zoom-out').click()
        canvas = page.locator('#full-map')
        rect, view = canvas.bounding_box(), snap()['mapView']
        size = canvas.evaluate('(e)=>({width:e.width,height:e.height})')
        px = ((x-view['x'])*view['scale']+size['width']/2)/size['width']
        py = ((z-view['z'])*view['scale']+size['height']/2)/size['height']
        check(0 <= px <= 1 and 0 <= py <= 1, 'Normal map destination is selectable')
        page.mouse.click(rect['x']+px*rect['width'], rect['y']+py*rect['height'])
        page.locator('#teleport-button').click()
        page.wait_for_function('!capitalDriveSnapshot().paused')
        focus_world()
        record('normal map arrival')

    def walk(target, tolerance=1, seconds=25):
        end, last, stalled = time.monotonic()+seconds, None, 0
        while time.monotonic() < end:
            state = snap()
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x']-pose['x'], target['z']-pose['z']
            distance = math.hypot(dx, dz)
            if distance <= tolerance:
                record('normal walk reached waypoint')
                return
            stalled = stalled+1 if last and math.hypot(pose['x']-last['x'], pose['z']-last['z']) < .025 else 0
            assert stalled < 12, f'Normal walk blocked {distance:.2f}m from {target}'
            last = pose
            forward = (-math.sin(yaw)*dx-math.cos(yaw)*dz)/distance
            lateral = (math.cos(yaw)*dx-math.sin(yaw)*dz)/distance
            held = []
            if abs(forward) >= .38:
                held.append('w' if forward > 0 else 's')
            if abs(lateral) >= .38:
                held.append('d' if lateral > 0 else 'a')
            for key in held:
                page.keyboard.down(key)
            try:
                page.wait_for_timeout(160 if distance < 2 else 320)
            finally:
                for key in held:
                    page.keyboard.up(key)
        raise AssertionError(f'Normal walk timed out before {target}')

    def around_own_car(target, tolerance=1):
        state = snap()
        car, pose = state['player'], state['focus']
        dx, dz = target['x']-car['x'], target['z']-car['z']
        length = math.hypot(dx, dz)
        if length > 3:
            fx, fz = dx/length, dz/length
            side = 1 if (pose['x']-car['x'])*fz-(pose['z']-car['z'])*fx >= 0 else -1
            walk({'x': car['x']+fx*4.5+fz*side*4.5,
                  'z': car['z']+fz*4.5-fx*side*4.5}, tolerance=.8)
        walk(target, tolerance=tolerance)

    def look(target):
        state = snap()
        desired = math.atan2(-(target['x']-state['focus']['x']), -(target['z']-state['focus']['z']))
        delta = (state['camera']['footYaw']-desired+math.pi) % (2*math.pi)-math.pi
        rect = page.locator('#world canvas').bounding_box()
        cx, cy = rect['x']+rect['width']/2, rect['y']+rect['height']/2
        page.mouse.move(cx, cy)
        page.mouse.down(button='right')
        page.mouse.move(cx+delta/.006, cy, steps=8)
        page.mouse.up(button='right')
        frames()

    def begin_hack(asset):
        pulse('t')
        hack = page.locator(f'[data-hack-asset="{asset["id"]}"]')
        check(hack.is_enabled(), 'Phone enables Hack only beside the actual scooter')
        hack.click()
        page.wait_for_function('capitalDriveSnapshot().rentalHack.active')
        focus_world()
        return record('scooter hack admitted')

    def challenge(kind):
        return snap()['rentalHack'] if kind == 'scooter' else snap()['gameplay']['carjacking']['challenge']

    def complete(kind, length):
        expression = 'capitalDriveSnapshot().rentalHack' if kind == 'scooter' else 'capitalDriveSnapshot().gameplay.carjacking?.challenge'
        state = challenge(kind)
        check(len(state['sequence']) == length, f'{kind} has {length} explicit sequence keys')
        for index in range(length):
            observed = page.wait_for_function(f'''()=>{{const c={expression};
                const cue=document.querySelector('#activity-cue').textContent;
                const current=[...document.querySelectorAll('#activity-sequence .current')].map(e=>e.dataset.key);
                if(c?.active&&c.phase==="cue"&&c.index==={index}&&c.cueRemaining>.65&&cue.startsWith('PRESS ')&&current[0]===c.expectedKey)
                    return {{expectedKey:c.expectedKey,count:document.querySelectorAll('#activity-sequence kbd').length,current,cue}};
                return false;}}''', timeout=10000).json_value()
            state = observed
            visible = observed
            check(visible['count'] == length and len(visible['current']) == 1,
                  f'{kind} cue {index+1} identifies one current key in the full sequence')
            check(visible['current'][0] == state['expectedKey'] and visible['cue'].startswith('PRESS '),
                  f'{kind} cue {index+1} visibly matches its real expected input')
            pulse({'x': 'x', 'y': 'y', 'up': 'ArrowUp'}[state['expectedKey']])
            if index < length-1:
                check(challenge(kind)['index'] == index+1, f'Released normal key advances {kind} step {index+1}')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            page = context.new_page()
            def retain_failure(kind, error, traceback):
                if error is not None and not page.is_closed():
                    try:
                        capture('failure-state')
                    except Exception as capture_error:
                        observations.append({'captureFailure': str(capture_error)})
                return False
            stack.push(retain_failure)
            page.set_default_timeout(12000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
            page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
            page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
            page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
            page.goto(base+'/Games/Capital%20Drive/', wait_until='load', timeout=45000)
            page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
            check(not snap()['rendering']['compatibility'], 'Software WebGL available')
            page.locator('[data-game-mode="free"]').click()
            page.locator('#start-button').click()
            page.wait_for_function('capitalDriveSnapshot().started&&capitalDriveSnapshot().gameMode==="free"')
            focus_world()
            initial_cash = snap()['career']['cash']
            assets, stands = snap()['rentals']['assets'], snap()['rentals']['stands']
            check(len(assets) == 56 and len({a['standId'] for a in assets}) > 20,
                  'Fleet has 56 physical assets distributed across more than 20 sites')
            check(all(any(a['id'] == f'lemon-{district}-{kind}' for a in assets)
                      for district in ('civic', 'kingston', 'manuka') for kind in ('scooter', 'bike')),
                  'All six original Lemon asset IDs are preserved')
            pose = snap()['focus']
            asset = min((a for a in assets if a['kind'] == 'scooter' and any(s['id'] == a['standId'] and s.get('distributed') for s in stands)),
                        key=lambda a: math.hypot(a['x']-pose['x'], a['z']-pose['z']))
            stand = next(s for s in stands if s['id'] == asset['standId'])
            teleport_point(stand['x']-math.sin(stand['yaw'])*10, stand['z']-math.cos(stand['yaw'])*10)
            foot()
            around_own_car(asset, tolerance=.9)
            look(asset)
            capture('distributed-lemon-roadside')
            before = begin_hack(asset)
            check(before['rentals']['active'] is None and before['career']['cash'] == initial_cash,
                  'Starting a hack neither charges cash nor grants the scooter')
            page.keyboard.down('w')
            try:
                page.wait_for_timeout(300)
            finally:
                page.keyboard.up('w')
            after = snap()
            check(math.hypot(after['focus']['x']-before['focus']['x'], after['focus']['z']-before['focus']['z']) < .05,
                  'Walking input cannot move the actor while a scooter hack is active')
            page.set_viewport_size({'width': 390, 'height': 844})
            check(page.locator('#activity-panel').is_visible() and page.evaluate('document.documentElement.scrollWidth<=innerWidth'),
                  '390px active sequence fits without horizontal page overflow')
            capture('scooter-hack-sequence-390')
            page.locator('#activity-cancel').click()
            page.wait_for_function('!capitalDriveSnapshot().rentalHack.active')
            check(snap()['rentals']['active'] is None and snap()['career']['cash'] == initial_cash,
                  'Cancelling the hack grants no ride and charges nothing')
            page.set_viewport_size({'width': 1280, 'height': 800})
            focus_world()
            begin_hack(asset)
            capture('scooter-hack-sequence-desktop')
            complete('scooter', 4)
            page.wait_for_function('capitalDriveSnapshot().rentals.active?.stolen===true')
            rental = record('scooter stolen through four released cue inputs')['rentals']['active']
            check(rental['assetId'] == asset['id'] and rental['charge'] == 0 and not rental['hired'],
                  'Four correct cues steal only the selected scooter without a rental charge')
            look({'x': stand['x']-math.sin(stand['yaw'])*10, 'z': stand['z']-math.cos(stand['yaw'])*10})
            page.keyboard.down('w')
            try:
                page.wait_for_function('capitalDriveSnapshot().rentals.active.distance>.35', timeout=12000)
            finally:
                page.keyboard.up('w')
            for key in ('a', 'd'):
                pulse(key)
            check(snap()['rentals']['active']['distance'] > .35, 'Normal WASD rides the stolen scooter')
            capture('stolen-scooter-riding')
            page.keyboard.down('s')
            try:
                page.wait_for_function('capitalDriveSnapshot().rentals.active.speed<=.1')
            finally:
                page.keyboard.up('s')
            pulse('e')
            page.wait_for_function('capitalDriveSnapshot().rentals.active===null')
            check(next(a for a in snap()['rentals']['assets'] if a['id'] == asset['id'])['available'],
                  'S brake and E end the stolen ride at its actual location')
            nearby = snap()['nearbyVehicles']
            parked = sorted((v for v in nearby if v['id'].startswith('parked:') and not v.get('occupied')),
                            key=lambda v: math.hypot(v['x']-snap()['focus']['x'], v['z']-snap()['focus']['z']))
            check(bool(parked), 'Read-only nearby diagnostics identify a real parked car')
            target = parked[0]
            around_own_car(target, tolerance=4.2)
            pose = snap()['focus']
            vehicles = snap()['nearbyVehicles']
            nearest = min(vehicles, key=lambda v: math.hypot(v['x']-pose['x'], v['z']-pose['z']))
            check(nearest['id'] == target['id'], 'Normal walking approaches the parked car before E')
            pulse('e')
            page.wait_for_function('capitalDriveSnapshot().gameplay.carjacking?.challenge?.active')
            first = record('parked car lock admitted')['gameplay']['carjacking']['challenge']
            check(len(first['sequence']) == 8 and first['cueWindow'] < 1.4,
                  'Car unlock is eight keys with a shorter window than the four-key scooter hack')
            page.wait_for_timeout(2000)
            check(snap()['gameplay']['mode'] == 'foot' and snap()['gameplay']['carjacking'] is not None,
                  'Elapsed time alone does not steal the parked car')
            page.wait_for_function('capitalDriveSnapshot().gameplay.carjacking===null', timeout=10000)
            check(snap()['gameplay']['mode'] == 'foot',
                  'Missing the car cues fails without automatically claiming the target')
            focus_world()
            pulse('e')
            page.wait_for_function('capitalDriveSnapshot().gameplay.carjacking?.challenge?.active')
            capture('car-unlock-eight-key-sequence')
            # Capturing a software-rendered frame uses part of the real window.
            # Cancel normally and retry; never extend or bypass the game clock.
            pulse('e')
            check(snap()['gameplay']['carjacking'] is None, 'E cancels the pictured car attempt')
            pulse('e')
            page.wait_for_function('capitalDriveSnapshot().gameplay.carjacking?.challenge?.active')
            complete('car', 8)
            page.wait_for_function('capitalDriveSnapshot().gameplay.mode==="vehicle"&&capitalDriveSnapshot().gameplay.vehicle.stolen')
            check(snap()['gameplay']['carjacking'] is None, 'Eight correct normal cue inputs claim the parked car once')
            check(snap()['career']['cash'] == initial_cash, 'Free roam theft and riding preserve career cash')
            capture('car-stolen-through-sequence')
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime request attempts')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
        observations.append({'failure': failure})
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_alarm)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks,
                  'errors': errors, 'requests': requests, 'external': external,
                  'observations': observations, 'elapsedSeconds': round(time.monotonic()-started, 2),
                  'screenshots': sorted(path.name for path in output.glob('*.png')),
                  'limitations': ['Software WebGL only; native/N100 performance unmeasured.',
                                 '390px capture checks layout; touch riding is unexercised.',
                                 'Positive gameplay uses normal input and read-only snapshots.',
                                 'Screenshots require separate visual review.']}
        (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
