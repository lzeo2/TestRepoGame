#!/usr/bin/env python3
"""Bounded living-city normal-input QA; software WebGL is not hardware acceptance."""
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
    parser.add_argument('--output', required=True, type=Path,
                        help='Fresh or empty evidence directory outside the repository; prior artifacts fail.')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and any(output.iterdir()):
        parser.error('--output already contains evidence; choose a fresh directory')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    failure = None
    page = None
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline(signum, frame):
        raise TimeoutError(f'Living-city browser run exceeded {BUDGET} seconds')

    previous_alarm = signal.signal(signal.SIGALRM, deadline)
    signal.alarm(BUDGET)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap(p):
        return p.evaluate('capitalDriveSnapshot()')

    def record(p, label):
        state = snap(p)
        with (output / 'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'elapsedSeconds': round(time.monotonic()-started, 2),
                                  'state': state}) + '\n')
        return state

    def capture(p, name):
        record(p, name)
        p.screenshot(path=str(output / (name + '.png')), timeout=15000)

    def ready(p):
        p.set_default_timeout(12000)
        p.on('pageerror', lambda error: errors.append(str(error)))
        p.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        p.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        p.on('response', lambda response: requests.append(f'{response.status} {response.url}')
             if response.status >= 400 else None)
        p.on('request', lambda request: external.append(request.url)
             if urlsplit(request.url).scheme in ('http', 'https') and
             urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        # Abort external requests as well as recording the attempted request.
        p.route('**/*', lambda route: route.continue_()
                if urlsplit(route.request.url).scheme not in ('http', 'https') or
                urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        p.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=45000)
        p.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
        check(not snap(p)['rendering']['compatibility'], 'Software WebGL available')

    def focus_world(p):
        p.locator('#world canvas').focus()

    def start(p, mode):
        p.locator(f'[data-game-mode="{mode}"]').click()
        check(p.locator(f'[data-game-mode="{mode}"]').get_attribute('aria-pressed') == 'true',
              mode + ' mode selection is reflected in UI')
        p.locator('#start-button').click()
        p.wait_for_function('(mode)=>capitalDriveSnapshot().started && capitalDriveSnapshot().gameMode===mode', arg=mode)
        focus_world(p)

    def close(p, dialog):
        p.locator(f'[data-close="{dialog}"]').click()
        p.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        focus_world(p)

    def search(p, query):
        if not p.locator('#map-dialog').is_visible():
            p.locator('#map-button').click()
        p.locator('#map-search').fill(query)
        p.locator('#map-search-form button[type=submit]').click()
        return p.locator('#search-results button')

    def teleport_selection(p):
        p.locator('#teleport-button').click()
        p.wait_for_function('!capitalDriveSnapshot().paused')
        focus_world(p)

    def teleport_point(p, x, z):
        if not p.locator('#map-dialog').is_visible():
            p.locator('#map-button').click()
        # Zoom right out with ordinary UI so far destinations remain selectable.
        for _ in range(8):
            if snap(p)['mapView']['zoom'] <= 1:
                break
            p.locator('#map-zoom-out').click()
        canvas = p.locator('#full-map')
        rect, view = canvas.bounding_box(), snap(p)['mapView']
        size = canvas.evaluate('(element)=>({width:element.width,height:element.height})')
        px = ((x-view['x'])*view['scale']+size['width']/2)/size['width']
        py = ((z-view['z'])*view['scale']+size['height']/2)/size['height']
        check(0 <= px <= 1 and 0 <= py <= 1, 'Map approach lies inside selectable bounds')
        p.mouse.click(rect['x']+px*rect['width'], rect['y']+py*rect['height'])
        teleport_selection(p)
        state = record(p, 'normal map arrival')
        observations.append({'requestedMapPoint': {'x': x, 'z': z}, 'arrival': state['focus']})

    def foot(p):
        if snap(p)['gameplay']['mode'] != 'foot':
            focus_world(p)
            p.keyboard.press('e')
            if snap(p)['gameplay']['mode'] != 'foot':
                p.keyboard.press('e')
            p.wait_for_function('capitalDriveSnapshot().gameplay.mode==="foot"')

    def look(p, x, z, vertical=0):
        state = snap(p)
        desired = math.atan2(-(x-state['focus']['x']), -(z-state['focus']['z']))
        delta = (state['camera']['footYaw']-desired+math.pi) % (2*math.pi)-math.pi
        rect = p.locator('#world canvas').bounding_box()
        cx, cy = rect['x']+rect['width']/2, rect['y']+rect['height']/2
        p.mouse.move(cx, cy)
        p.mouse.down(button='right')
        p.mouse.move(cx+delta/.006, cy+vertical, steps=8)
        p.mouse.up(button='right')
        p.wait_for_timeout(150)

    def walk(p, target, tolerance=.65, seconds=30):
        """Steer with real WASD events; snapshots only select the next direction."""
        end = time.monotonic()+seconds
        last = None
        stalled = 0
        while time.monotonic() < end:
            state = snap(p)
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x']-pose['x'], target['z']-pose['z']
            distance = math.hypot(dx, dz)
            if distance <= tolerance:
                record(p, 'normal walk reached waypoint')
                return
            if last is not None and math.hypot(pose['x']-last['x'], pose['z']-last['z']) < .025:
                stalled += 1
            else:
                stalled = 0
            if stalled >= 12:
                record(p, 'normal walk blocked')
                raise AssertionError(f'Normal walk blocked before {target}; distance {distance:.2f} m')
            last = pose
            forward = (-math.sin(yaw)*dx-math.cos(yaw)*dz)/distance
            lateral = (math.cos(yaw)*dx-math.sin(yaw)*dz)/distance
            held = []
            if abs(forward) >= .38:
                held.append('w' if forward > 0 else 's')
            if abs(lateral) >= .38:
                held.append('d' if lateral > 0 else 'a')
            for key in held:
                p.keyboard.down(key)
            try:
                p.wait_for_timeout(160 if distance < 2 else 320)
            finally:
                for key in held:
                    p.keyboard.up(key)
        record(p, 'normal walk timed out')
        raise AssertionError(f'Normal walk timed out before {target}')

    def around_car_to_door(p, door):
        state=snap(p)
        car, pose=state['player'], state['focus']
        dx,dz=door['x']-car['x'],door['z']-car['z']
        length=math.hypot(dx,dz)
        if length>3:
            fx,fz=dx/length,dz/length
            side=1 if (pose['x']-car['x'])*fz-(pose['z']-car['z'])*fx>=0 else -1
            walk(p,{'x':car['x']+fx*4.5+fz*side*4.5,'z':car['z']+fz*4.5-fx*side*4.5},tolerance=.8)
        walk(p,door,tolerance=2.4,seconds=40)

    def room_point(plan,x,z):
        o=plan['origin'];c,s=math.cos(o['yaw']),math.sin(o['yaw'])
        return {'x':o['x']+c*x+s*z,'z':o['z']-s*x+c*z}

    def enter(p, kind):
        before = record(p, 'before '+kind+' E entry')
        p.keyboard.press('e')
        p.wait_for_function('(kind)=>capitalDriveSnapshot().interiors.active?.type===kind', arg=kind)
        state = record(p, kind+' E entry')
        check(state['interiors']['activePlans'] == 1 and
              state['interiors']['generatedPlans'] == before['interiors']['generatedPlans']+1,
              kind+' E entry generates exactly one lazy plan')
        check(state['interiorView']['meshes'] > 0, kind+' interior meshes loaded')
        return state['interiors']['active']

    def leave(p, plan):
        walk(p, plan['exit'], tolerance=1.1)
        p.keyboard.press('e')
        p.wait_for_function('capitalDriveSnapshot().interiors.activePlans===0')
        state = record(p, 'after E leave')
        check(state['interiors']['active'] is None and state['interiorView']['meshes'] == 0,
              'E leave discards active plan and interior meshes')

    def approach(p, door):
        teleport_point(p, door['x']-math.sin(door['yaw'])*10,
                       door['z']-math.cos(door['yaw'])*10)
        foot(p)
        look(p, door['x'], door['z'])
        around_car_to_door(p, door)

    def pulse(p, key):
        p.keyboard.down(key)
        try:
            p.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        finally:
            p.keyboard.up(key)
        p.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')

    def people(p, roles, label):
        state = record(p, label)
        occupants = state['roomPeople']
        check(1 <= len(occupants) <= 16 and all(person['adult'] for person in occupants),
              label+' has bounded fictional adults')
        check(roles <= {person['role'] for person in occupants}, label+' has purposeful occupant roles')
        check(state['roomPeopleView']['people'] == len(occupants) and
              state['roomPeopleView']['drawCalls'] <= 6, label+' renders its actual occupants in bounded batches')
        return occupants

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                page = context.new_page()
                ready(page)
                start(page, 'free')
                initial_cash = snap(page)['career']['cash']
                check(snap(page)['interiors']['generatedPlans'] == 0 and not snap(page)['roomPeople'],
                      'No room or indoor crowd is generated before E entry')
                page.keyboard.press('t')
                check(page.locator('#phone-dialog').is_visible(), 'T opens the Lemon phone')
                check(page.locator('[data-hire-kind]').count() == 6 and
                      page.locator('[data-hire-kind]:enabled').count() == 0,
                      'Remote Lemon hires are visibly disabled')
                close(page, 'phone-dialog')

                gym = snap(page)['gymEntry']
                check(gym is not None, 'Gym has a real indexed door approach')
                approach(page, gym)
                plan = enter(page, 'gym')
                check({'exercise-bench', 'treadmill', 'lockers'} <=
                      {item['kind'] for item in plan['furniture']}, 'Gym contains recognisable exercise stations')
                before_people = people(page, {'trainer', 'exerciser'}, 'Gym')
                trainer = next(person for person in before_people if person['role'] == 'trainer')
                walk(page, room_point(plan, 0, 3), tolerance=.35)
                walk(page, trainer, tolerance=.84)
                state = snap(page)
                target = next(person for person in state['roomPeople'] if person['id'] == trainer['id'])
                dx, dz = target['x']-state['focus']['x'], target['z']-state['focus']['z']
                yaw = state['camera']['footYaw']
                forward, lateral = -math.sin(yaw)*dx-math.cos(yaw)*dz, math.cos(yaw)*dx-math.sin(yaw)*dz
                key = ('w' if forward > 0 else 's') if abs(forward)>abs(lateral) else ('d' if lateral>0 else 'a')
                minimum_distance = float('inf')
                page.keyboard.down(key)
                try:
                    for _ in range(6):
                        page.wait_for_timeout(100)
                        state = snap(page)
                        target = next(person for person in state['roomPeople'] if person['id'] == trainer['id'])
                        minimum_distance = min(minimum_distance, math.hypot(state['focus']['x']-target['x'], state['focus']['z']-target['z']))
                finally:
                    page.keyboard.up(key)
                check(.70 <= minimum_distance < .9, 'Normal walking contacts the trainer without overlapping adult bodies')
                capture(page, 'gym-trainer-physical-contact')
                walk(page, room_point(plan, 0, 3), tolerance=.4)
                walk(page, room_point(plan, 0, 7.1), tolerance=.4)
                bench = next(station for station in plan['activities'] if station['kind'] == 'bench')
                walk(page, bench, tolerance=.45)
                look(page, plan['exercise']['x'], plan['exercise']['z'])
                page.keyboard.press('q')
                page.wait_for_function('capitalDriveSnapshot().miniGame.active && capitalDriveSnapshot().miniGame.kind==="bench"')
                page.locator('#pause-button').click()
                frozen = snap(page)
                page.wait_for_timeout(700)
                paused_state = snap(page)
                check(paused_state['miniGame'] == frozen['miniGame'] and
                      paused_state['roomPeople'] == frozen['roomPeople'],
                      'Pause freezes the active bench and indoor people clocks')
                close(page, 'pause-dialog')
                page.keyboard.down('x')
                page.keyboard.down('y')
                try:
                    for rep in range(1, 7):
                        page.wait_for_function('capitalDriveSnapshot().miniGame.phase==="cue"', timeout=20000)
                        pulse(page, 'ArrowUp')
                        check(snap(page)['miniGame']['reps'] == rep, f'X+Y and timed Up earns real bench repetition {rep}')
                        if rep == 2:
                            check(snap(page)['miniGame']['lift'] > 0, 'Bench lift drives the animated press pose')
                            capture(page, 'gym-controlled-press')
                    page.wait_for_function('capitalDriveSnapshot().miniGame.phase==="complete"', timeout=15000)
                finally:
                    page.keyboard.up('y')
                    page.keyboard.up('x')
                state = record(page, 'bench completed through normal controls')
                check(state['miniGame']['score'] == 600 and state['miniGame']['mistakes'] == 0,
                      'Six controlled reps complete the bench game without mistakes')
                check(any(person['phase'] != before_people[i]['phase'] for i, person in enumerate(state['roomPeople'])),
                      'Gym occupants animate while active')
                walk(page, room_point(plan, 0, 7.1), tolerance=.4)
                leave(page, plan)
                check(not snap(page)['roomPeople'] and snap(page)['roomPeopleView']['geometryCount'] == 0 and
                      snap(page)['miniGame']['kind'] is None, 'Leaving gym discards crowd batches and activity state')

                result = search(page, 'Lanzhou 1919')
                check('Lambzhou 1919' in result.first.inner_text(), 'Source restaurant search resolves the mapped parody')
                result.first.click()
                teleport_selection(page)
                store = next(item for item in snap(page)['services'] if item['id'] == 'store-5656111023')
                approach(page, store['frontage'])
                plan = enter(page, 'shop')
                check(plan.get('variant') == 'noodles', 'Mapped restaurant enters the noodle dining room')
                people(page, {'cashier', 'cook', 'diner'}, 'Noodle restaurant')
                walk(page, room_point(plan, 0, 3), tolerance=.35)
                look(page, room_point(plan, 2, 6)['x'], room_point(plan, 2, 6)['z'])
                capture(page, 'populated-noodle-room')
                walk(page, plan['counter'], tolerance=.45)
                page.keyboard.press('e')
                check(page.locator('#services-dialog').is_visible(), 'E at actual noodle counter opens its shop actions')
                check('Lambzhou 1919' in page.locator('#services-list article').first.inner_text(),
                      'Indoor counter identifies the active restaurant')
                close(page, 'services-dialog')
                page.keyboard.press('q')
                page.wait_for_function('capitalDriveSnapshot().miniGame.active && capitalDriveSnapshot().miniGame.kind==="noodle"')
                for key in ('x', 'y', 'ArrowUp', 'x', 'ArrowUp', 'y'):
                    pulse(page, key)
                check(snap(page)['miniGame']['phase'] == 'complete' and snap(page)['miniGame']['score'] == 300,
                      'Normal released recipe inputs serve a complete noodle order')
                capture(page, 'noodle-order-served')
                walk(page, room_point(plan, 0, 3), tolerance=.4)
                leave(page, plan)
                check(not snap(page)['roomPeople'] and snap(page)['roomPeopleView']['geometryCount'] == 0,
                      'Restaurant exit disposes every indoor adult batch')

                extras = json.loads((ROOT/'Games/Capital Drive/data/civic-extras.json').read_text())
                for store in extras['stores']:
                    result = search(page, store['sourceName'])
                    check(store['name'] in result.first.inner_text(), 'Offline source-name search finds '+store['name'])
                centre = extras['stores'][0]['publicApproach']
                teleport_point(page, centre['x'], centre['z'])
                foot(page)
                look(page, extras['stores'][0]['frontage']['x'], extras['stores'][0]['frontage']['z'])
                page.wait_for_timeout(700)
                state = record(page, 'Civic populated shopping frontage')
                check(state['civicExtras']['sites'] == 5 and state['civicExtras']['visible'] > 0 and
                      state['civicExtras']['drawCalls'] == 1, 'Five nearby Civic storefronts share one visible batch')
                check(state['pedestrians']['count'] > 0, 'Civic exterior retains the bounded street crowd')
                capture(page, 'civic-stores-and-crowd')

                result = search(page, 'Civic Skate Park')
                check('Civic Skate Park' in result.first.inner_text(), 'Source skatepark is a searchable map destination')
                result.first.click()
                page.locator('#map-route-button').click()
                check(snap(page)['routePoints'] > 0, 'Set route creates an ordinary skatepark route')
                teleport_selection(page)
                foot(page)
                landmark = next(place for place in snap(page)['places'] if place['id'] == 'civic-skatepark')
                look(page, landmark['x'], landmark['z'])
                capture(page, 'source-skatepark-ramps')
                # The exact opening is long and narrow. The source-derived centre
                # places our car on the slab; walk around it and along the west strip.
                target = {'x': -227.3+.903*2+.429*10, 'z': -4449.4-.429*2+.903*10}
                around_car_to_door(page, target)
                walk(page, target, tolerance=.7, seconds=25)
                before = snap(page)['focus']
                target = {'x': -227.3+.903*2+.429*13, 'z': -4449.4-.429*2+.903*13}
                walk(page, target, tolerance=.7, seconds=20)
                check(math.hypot(snap(page)['focus']['x']-before['x'], snap(page)['focus']['z']-before['z']) > 1.4,
                      'Normal footsteps cross the physical source skatepark opening')
                check(snap(page)['civicExtras']['skateparks'] == 1, 'Exactly one dedicated skatepark is rendered')
                capture(page, 'skatepark-walked-opening')

                assets = snap(page)['rentals']['assets']
                nearest = min(assets, key=lambda asset: math.hypot(asset['x']-snap(page)['focus']['x'], asset['z']-snap(page)['focus']['z']))
                stand = next(item for item in snap(page)['rentals']['stands'] if item['id'] == nearest['standId'])
                teleport_point(page, stand['x']-math.sin(stand['yaw'])*7,
                               stand['z']-math.cos(stand['yaw'])*7)
                foot(page)
                around_car_to_door(page, nearest)
                walk(page, nearest, tolerance=.9)
                for kind in ('scooter', 'bike'):
                    asset = next(item for item in snap(page)['rentals']['assets'] if item['standId'] == stand['id'] and item['kind'] == kind)
                    walk(page, asset, tolerance=.9)
                    look(page, asset['x']-math.sin(stand['yaw'])*10, asset['z']-math.cos(stand['yaw'])*10)
                    page.keyboard.press('t')
                    hire = page.locator(f'[data-hire-kind="{kind}"][data-stand-id="{stand["id"]}"]')
                    check(hire.is_enabled(), 'Phone permits nearby source '+kind+' hire')
                    capture(page, 'lemon-'+kind+'-phone')
                    hire.click()
                    page.wait_for_function('(kind)=>capitalDriveSnapshot().rentals.active?.kind===kind', arg=kind)
                    focus_world(page)
                    page.keyboard.down('w')
                    try:
                        page.wait_for_function('capitalDriveSnapshot().rentals.active.distance>.35', timeout=12000)
                    finally:
                        page.keyboard.up('w')
                    for key in ('a', 'd'):
                        pulse(page, key)
                    check(snap(page)['rentals']['active']['distance'] > .35, 'Normal WASD moves the hired '+kind)
                    capture(page, 'lemon-'+kind+'-riding')
                    page.keyboard.down('s')
                    try:
                        page.wait_for_function('capitalDriveSnapshot().rentals.active.speed<=.1', timeout=12000)
                    finally:
                        page.keyboard.up('s')
                    page.keyboard.press('t')
                    check(page.locator('#end-rental').is_enabled(), 'Stopped '+kind+' can be ended from phone')
                    page.locator('#end-rental').click()
                    page.wait_for_function('capitalDriveSnapshot().rentals.active===null')
                    check(next(item for item in snap(page)['rentals']['assets'] if item['id'] == asset['id'])['available'],
                          'Ending '+kind+' returns the physical asset to availability')
                check(snap(page)['career']['cash'] == initial_cash, 'Sandbox activities and both Lemon hires preserve career cash')
                page.set_viewport_size({'width': 390, 'height': 844})
                page.keyboard.press('t')
                check(page.locator('#phone-dialog').is_visible() and
                      page.evaluate('document.documentElement.scrollWidth<=innerWidth'), '390px Lemon phone fits without horizontal page overflow')
                capture(page, 'phone-390-lemon-layout')
                close(page, 'phone-dialog')
                page.set_viewport_size({'width': 1280, 'height': 800})
                page.keyboard.press('p')
                page.locator('#change-mode-button').click()
                start(page, 'street')
                page.keyboard.press('j')
                franklin=page.locator('#jobs-list .job-option').filter(has_text='Franklin Street delivery')
                kennedy=page.locator('#jobs-list .job-option').filter(has_text='Kennedy Street delivery')
                check(franklin.get_by_role('button',name='Start job').is_enabled() and
                      kennedy.get_by_role('button',name='Start job').is_enabled(),
                      'Both new legal delivery jobs are available in a fresh career')
                check('$400' in franklin.inner_text() and '$450' in kennedy.inner_text(),
                      'Jobs board displays the actual delivery rewards')
                capture(page, 'career-paid-jobs-board')
                franklin.get_by_role('button',name='Start job').click()
                page.wait_for_function('capitalDriveSnapshot().routePoints>0')
                check('Franklin Street delivery' in page.locator('#job-title').inner_text(),
                      'Normal jobs-board input starts the routed delivery')
                page.keyboard.press('m')
                check(page.locator('#teleport-button').is_hidden(), 'Career delivery keeps map teleport unavailable')
                close(page, 'map-dialog')
                page.keyboard.press('j')
                page.locator('#cancel-job-button').click()
                check(page.locator('#cancel-job-button').is_disabled(), 'Normal job cancellation clears the active delivery')
                context.close()
                page = None
                check(not errors, 'No page or console errors')
                check(not requests, 'No failed requests or HTTP errors')
                check(not external, 'No external runtime requests attempted')
            except Exception as error:
                failure = f'{type(error).__name__}: {error}'
                observations.append({'failure': failure})
                if page is not None and not page.is_closed():
                    try:
                        capture(page, 'failure-state')
                    except Exception as capture_error:
                        observations.append({'captureFailure': str(capture_error)})
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
        observations.append({'setupOrCleanupFailure': failure})
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_alarm)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks,
                  'errors': errors, 'requests': requests, 'external': external, 'observations': observations,
                  'elapsedSeconds': round(time.monotonic()-started, 2),
                  'screenshots': sorted(path.name for path in output.glob('*.png')),
                  'limitations': ['Software WebGL only; native/N100 FPS unmeasured.',
                                 'Original layouts and skate ramps are interpretations, not surveyed private floorplans.',
                                 '390px capture establishes phone layout only; touch driving is not exercised.',
                                 'Screenshots require separate human review.']}
        (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
