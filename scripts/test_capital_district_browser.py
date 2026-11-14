#!/usr/bin/env python3
"""Bounded district/campaign normal-input QA; software WebGL is not hardware acceptance."""
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
BUDGET = 560


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path,
                        help='Fresh evidence directory outside the repository; existing directories fail.')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    output.mkdir(parents=True, exist_ok=False)
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
        raise TimeoutError(f'District browser run exceeded {BUDGET} seconds')

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

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            # LIFO guarantees browser.close runs before the Playwright manager exits.
            stack.callback(browser.close)
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                page = context.new_page()
                ready(page)
                start(page, 'campaign')
                check(snap(page)['interiors']['generatedPlans'] == 0, 'Startup indexes doors without generating room plans')
                if page.locator('#campaign-dialog').is_visible():
                    close(page, 'campaign-dialog')
                page.keyboard.press('j')
                check(page.locator('#campaign-dialog').is_visible() and
                      'parcel' in page.locator('#campaign-briefing').inner_text().lower(),
                      'Campaign J opens original first-mission briefing')
                check(page.locator('#campaign-chapters li').count() == 6, 'Campaign lists six ordered chapters')
                capture(page, 'campaign-briefing')
                page.locator('#campaign-start').click()
                focus_world(page)
                page.wait_for_function('capitalDriveSnapshot().campaign.active?.stage===1', timeout=20000)
                active = record(page, 'campaign normal spawn pickup')['campaign']['active']
                check(active['remaining'] < 360 and active['stage'] == 1,
                      'Active mission timer advances and real spawn pickup reaches stage two')
                result = search(page, 'Coals')
                check('Coals' in result.first.inner_text(), 'Campaign search resolves mapped Coals')
                result.first.click()
                check(not page.locator('#teleport-button').is_visible(), 'Campaign hides map teleport button')
                before = snap(page)['focus']
                page.locator('#full-map').focus()
                page.keyboard.press('Enter')
                check(snap(page)['focus'] == before and snap(page)['routePoints'] > 0,
                      'Campaign map Enter handler sets a route without moving actor')
                capture(page, 'campaign-map-route')
                close(page, 'map-dialog')
                capture(page, 'campaign-active')
                page.keyboard.down('w')
                try:
                    page.wait_for_function('Math.abs(capitalDriveSnapshot().player.speed)>1.5', timeout=15000)
                finally:
                    page.keyboard.up('w')
                moving = record(page, 'normal driving before E')
                page.keyboard.press('e')
                check(snap(page)['gameplay']['mode'] == 'vehicle' and abs(snap(page)['player']['speed']) < .1,
                      'First E stops moving car and keeps player seated')
                page.keyboard.press('e')
                check(snap(page)['gameplay']['mode'] == 'foot', 'Second E exits stopped car')
                check(math.hypot(moving['player']['x']-before['x'], moving['player']['z']-before['z']) > .1,
                      'Normal keyboard drive changes car position')
                context.close()

                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                page = context.new_page()
                ready(page)
                start(page, 'free')
                initial_cash = snap(page)['career']['cash']
                for query, label in [('Canberra Centre', 'Canberra Centre'), ('Coles', 'Coals')]:
                    result = search(page, query)
                    check(label in result.first.inner_text(), 'Free roam source search resolves '+label)
                    result.first.click()
                    check(page.locator('#teleport-button').is_visible(), 'Free roam offers map travel')
                    teleport_selection(page)
                    foot(page)
                    if label == 'Canberra Centre':
                        centre = next(place for place in snap(page)['places'] if place['id'] == 'canberra-centre')
                        look(page, centre['x']+8, centre['z']-5)
                        check(snap(page)['civic']['visible'], 'Source Civic exterior visible at public approach')
                        capture(page, 'source-centre-public-approach')
                store = next(item for item in snap(page)['services'] if item['name'] == 'Coals')
                frontage = store['frontage']
                look(page, frontage['x'], frontage['z'])
                capture(page, 'coals-source-frontage')
                # Search arrival places our own car in front of the door. Walk around
                # its end, then along the facade; do not walk through its collider.
                def storefront_point(tangent, depth):
                    yaw = frontage['yaw']
                    return {'x': frontage['x']+math.cos(yaw)*tangent+math.sin(yaw)*depth,
                            'z': frontage['z']-math.sin(yaw)*tangent+math.cos(yaw)*depth}
                for waypoint in [storefront_point(5, -6), storefront_point(5, -1.2), frontage]:
                    walk(page, waypoint, tolerance=.9 if waypoint is not frontage else 1.9, seconds=25)
                plan = enter(page, 'shop')
                capture(page, 'shop-lazy-interior')
                # Follow an aisle beside the shelving, then approach the counter.
                origin, width = plan['origin'], plan['width']
                def local(x, z):
                    return {'x': origin['x']+math.cos(origin['yaw'])*x+math.sin(origin['yaw'])*z,
                            'z': origin['z']-math.sin(origin['yaw'])*x+math.cos(origin['yaw'])*z}
                # Leave steering margin beside the shelf collider for discrete WASD.
                aisle = min(width/2-1.35, 1.0)
                for waypoint in [local(aisle, 1.8), local(aisle, 6.5), plan['counter']]:
                    walk(page, waypoint, tolerance=.75)
                page.keyboard.press('e')
                check(page.locator('#services-dialog').is_visible(), 'Normal indoor counter E opens shop actions')
                check(page.locator('[data-service-activity=robbery]:enabled').count() == 0,
                      'Free roam indoor till cannot earn career cash')
                close(page, 'services-dialog')
                capture(page, 'shop-counter')
                for waypoint in [local(aisle, 6.5), local(aisle, 1.8)]:
                    walk(page, waypoint, tolerance=.8)
                leave(page, plan)

                house = next(item for item in snap(page)['interiors']['entrySample'] if item['type'] == 'house')
                teleport_point(page, house['x']-math.sin(house['yaw'])*8,
                               house['z']-math.cos(house['yaw'])*8)
                foot(page)
                look(page, house['x'], house['z'])
                capture(page, 'house-rendered-door-approach')
                walk(page, house, tolerance=1.9, seconds=45)
                plan = enter(page, 'house')
                check({room['kind'] for room in plan['rooms']} == {'living', 'kitchen', 'bedroom', 'bathroom'},
                      'Lazy house contains four distinct rooms')
                check({'sofa', 'kitchen-bench', 'bed', 'bath', 'toilet'} <=
                      {item['kind'] for item in plan['furniture']}, 'House has living/kitchen/bed/bath furnishings')
                capture(page, 'house-four-room-interior')
                leave(page, plan)

                north = json.loads((ROOT/'Games/Capital Drive/data/canberra-north.json').read_text())
                bridge = next(road for road in north['roads'] if road.get('sourceId') == 'way/4878920')
                a, b = bridge['points'][0], bridge['points'][-1]
                bx, bz = (a[0]+b[0])/2, (a[1]+b[1])/2
                teleport_point(page, bx, bz)
                foot(page)
                look(page, b[0], b[1])
                capture(page, 'source-bridge-deck')
                look(page, bx+250, bz+100)
                capture(page, 'source-lake-shoreline')
                gate = snap(page)['campusGates'][0]
                teleport_point(page, gate['x']+10, gate['z']+8)
                foot(page)
                look(page, gate['x'], gate['z'])
                check(snap(page)['campus']['visible'], 'Source school fence visible near mapped gate')
                capture(page, 'source-school-fence-gate')
                check(snap(page)['career']['cash'] == initial_cash, 'Free roam travel/interior exploration preserves career cash')
                context.close()

                for theme in ('dark', 'light'):
                    phone = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
                    page = phone.new_page()
                    ready(page)
                    start(page, 'free')
                    page.locator('#pause-button').click()
                    page.locator('#theme').select_option(theme)
                    page.locator('#change-mode-button').click()
                    check(page.locator('#start-panel').is_visible(), 'Phone '+theme+' returns to mode selection')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),
                          'Phone '+theme+' start layout has no horizontal overflow')
                    capture(page, 'phone-'+theme+'-start-layout')
                    page.locator('[data-game-mode="free"]').click()
                    page.locator('#start-button').click()
                    page.locator('#map-button').click()
                    check(page.locator('#map-dialog').is_visible(), 'Phone '+theme+' opens map from its button')
                    check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),
                          'Phone '+theme+' map layout has no horizontal overflow')
                    capture(page, 'phone-'+theme+'-map-layout')
                    phone.close()
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
                                 'Campaign proof covers first real spawn pickup and timer, not a complete campaign.',
                                 'Phone captures establish start/map layout only; touch driving is not exercised.',
                                 'Interior layouts are original interpretations, not surveyed private floorplans.',
                                 'Screenshots require separate human review.']}
        (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
