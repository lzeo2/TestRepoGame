#!/usr/bin/env python3
"""Bounded normal-input Canalside arms and street-dealer QA (software WebGL)."""
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
    parser.add_argument('--scenario',choices=['all','career','free'],default='all',help='Run career purchasing or free-roam equipment separately.')
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

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        if time.monotonic()-started>BUDGET:raise TimeoutError(f'Dealer browser run exceeded {BUDGET} seconds')
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

    def walk(target, tolerance=1, seconds=25, sprint=False, detours=True, road_waypoint=False):
        end, last, stalled = time.monotonic()+seconds, None, 0
        pressed=set()
        def release():
            for key in list(pressed):
                page.keyboard.up(key)
            pressed.clear()
        try:
            while time.monotonic() < end:
                state=snap()
                pose,yaw=state['focus'],state['camera']['footYaw']
                dx,dz=target['x']-pose['x'],target['z']-pose['z']
                distance=math.hypot(dx,dz)
                if distance<=tolerance:
                    release()
                    record('normal walk reached waypoint')
                    return
                stalled=stalled+1 if last and math.hypot(pose['x']-last['x'],pose['z']-last['z'])<.025 else 0
                if stalled>=5:
                    release()
                    vehicles=[v for v in state['nearbyVehicles'] if math.hypot(v['x']-pose['x'],v['z']-pose['z'])<11]
                    if road_waypoint and vehicles and distance<5.5:
                        record('occupied intermediate road waypoint bypassed')
                        return
                    assert detours and vehicles,f'Normal walk blocked {distance:.2f}m from {target}'
                    nx,nz=-dz/distance,dx/distance
                    candidates=[{'x':pose['x']+nx*side*4.5+dx/distance,'z':pose['z']+nz*side*4.5+dz/distance} for side in (-1,1)]
                    candidates.sort(key=lambda p:min(math.hypot(v['x']-p['x'],v['z']-p['z']) for v in vehicles),reverse=True)
                    passed=False
                    for detour in candidates:
                        try:
                            walk(detour,tolerance=1.2,seconds=12,sprint=sprint,detours=False)
                            passed=True
                            break
                        except AssertionError:
                            record('normal vehicle detour blocked')
                    assert passed,f'Both physical detours blocked before {target}'
                    stalled,last=0,None
                    continue
                last=pose
                forward=(-math.sin(yaw)*dx-math.cos(yaw)*dz)/distance
                lateral=(math.cos(yaw)*dx-math.sin(yaw)*dz)/distance
                held=set()
                if abs(forward)>=.38:held.add('w' if forward>0 else 's')
                if abs(lateral)>=.38:held.add('d' if lateral>0 else 'a')
                if sprint:held.add('Shift')
                for key in pressed-held:page.keyboard.up(key)
                for key in held-pressed:page.keyboard.down(key)
                pressed=held
                page.wait_for_timeout(160 if distance<2 else 320)
            raise AssertionError(f'Normal walk timed out before {target}')
        finally:
            release()

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
        check(not snap()['rendering']['compatibility'], 'Software WebGL available')

    def start(mode):
        page.locator(f'[data-game-mode="{mode}"]').click()
        page.locator('#start-button').click()
        page.wait_for_function('(mode)=>capitalDriveSnapshot().started&&capitalDriveSnapshot().gameMode===mode', arg=mode)
        focus_world()

    def close_services():
        page.locator('[data-close="services-dialog"]').click()
        frames()
        focus_world()

    def arms():
        if not page.locator('#services-dialog').is_visible():
            focus_world()
            pulse('k')
        page.locator('#services-filter').select_option('arms')
        frames()

    def card(site):
        return page.locator(f'[data-service-id="{site}"]')

    def item(site, weapon):
        return card(site).locator(f'[data-service-item="{weapon}"]')

    def fire():
        focus_world()
        rect = page.locator('#world canvas').bounding_box()
        page.mouse.move(rect['x']+rect['width']/2, rect['y']+rect['height']/2)
        page.mouse.down(button='right')
        try:
            page.mouse.down(button='left')
            try:
                frames()
            finally:
                page.mouse.up(button='left')
        finally:
            page.mouse.up(button='right')
        frames()

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
            if args.scenario!='free':
                ready()
                start('street')
                check(snap()['career']['cash'] == 1000, 'Fresh Street Life starts with the actual $1000 wallet')
                arms()
                site = 'canalside-supplies'
                check(card(site).is_visible(), 'Arms filter exposes the actual Canalside supplies card')
                far = item(site, 'shotgun')
                check(far.is_disabled() and bool(far.get_attribute('data-reason')),
                      'Remote purchase is disabled with a visible eligibility reason')
                check(far.evaluate('(e)=>getComputedStyle(e).cursor') != 'wait',
                      'Disabled purchase uses no loading cursor')
                card(site).locator('[data-service-route]').click()
                path = snap()['routePath']
                check(len(path) >= 2 and all(isinstance(point.get('x'), (int, float)) and
                      isinstance(point.get('z'), (int, float)) for point in path) and
                      snap()['destination'] == site, 'Normal Route action creates a read-only road path')
                check(not page.locator('#teleport-button').is_visible(), 'Street Life route has no teleport control')
                target = next(service for service in snap()['services'] if service['id'] == site)
                page.set_viewport_size({'width':320,'height':240})
                foot()
                # E exits beside the actual campus fence; use its observed open gate.
                pose = snap()["focus"]
                gate = min(snap()["campusGates"], key=lambda g: math.hypot(g["x"]-pose["x"], g["z"]-pose["z"]))
                if math.hypot(gate["x"]-pose["x"], gate["z"]-pose["z"]) < 20:
                    walk({"x": gate["inside"][0], "z": gate["inside"][1]}, tolerance=.8)
                    walk({"x": gate["outside"][0], "z": gate["outside"][1]}, tolerance=.8)
                car = snap()["player"]
                first = next(index for index, point in enumerate(path)
                             if math.hypot(point["x"]-car["x"], point["z"]-car["z"]) > 8)
                around_own_car(path[first], tolerance=3)
                # Reduce software raster cost during the long walk, retaining real clocks and input.
                page.set_viewport_size({'width':320,'height':240})
                for point in path[first+1:]:
                    if math.hypot(snap()['focus']['x']-target['x'], snap()['focus']['z']-target['z']) <= target['radius']-1:
                        break
                    walk(point, tolerance=3, seconds=65, sprint=True, road_waypoint=True)
                walk(target, tolerance=target['radius']-1, seconds=45, sprint=True)
                check(snap()['gameplay']['mode'] == 'foot' and snap()['career']['cash'] == 1000,
                      'Normal road walking reaches Canalside on foot without grants or charges')
                page.set_viewport_size({'width':1280,'height':800})
                arms()
                item(site, 'shotgun').scroll_into_view_if_needed()
                check(item(site, 'shotgun').is_enabled(), 'Actual Canalside on-foot shotgun purchase is enabled')
                capture('canalside-ready-desktop')
                item(site, 'shotgun').click()
                state = record('Canalside shotgun purchased')
                check(state['career']['cash'] == 100 and state['career']['equipment']['shotgun'],
                      'Actual shotgun purchase costs $900 and grants saved ownership')
                check(state['gameplay']['weapon'] == 'shotgun' and state['gameplay']['ammo'] == 6 and state['gameplay']['reserveAmmo'] == 6,
                      'Purchased shotgun is equipped with six loaded rounds and its own reserve')
                item(site, 'ammo:shotgun').click()
                state = record('Canalside shotgun ammo purchased')
                check(state['career']['cash'] == 10 and state['gameplay']['reserveAmmo'] == 18,
                      'Actual $90 shotgun ammo purchase adds twelve rounds only to its reserve')
                saved = page.evaluate('JSON.parse(localStorage.getItem("capital-drive-career-v1"))')
                check(saved['cash'] == 10 and saved['equipment']['shotgun'], 'Real purchase writer persists cash and shotgun ownership')
                denied = item(site, 'smg')
                check(denied.is_disabled() and bool(denied.get_attribute('data-reason')),
                      'Unaffordable SMG is disabled with an eligibility reason')
                check(denied.evaluate('(e)=>getComputedStyle(e).cursor') != 'wait', 'Unaffordable SMG has no loading cursor')
                page.set_viewport_size({'width': 390, 'height': 844})
                item(site, 'shotgun').scroll_into_view_if_needed()
                check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), '390px services fit without horizontal overflow')
                capture('canalside-purchased-390')
                page.set_viewport_size({'width': 1280, 'height': 800})
                close_services()
                pulse('3')
                check(snap()['actors']['activeWeapon'] == 'shotgun', 'Actual shotgun model is rendered on foot')
                page.reload(wait_until='load', timeout=45000)
                page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
                start('street')
                foot()
                pulse('3')
                check(snap()['career']['cash'] == 10 and snap()['career']['equipment']['shotgun'] and snap()['gameplay']['weapon'] == 'shotgun',
                      'Normal reload retains real purchases and permits owned shotgun selection')
                check(snap()['gameplay']['ammo'] == 6 and snap()['gameplay']['reserveAmmo'] == 6,
                      'New session restores owned shotgun starter ammunition without persisting transient ammo')
                capture('shotgun-owned-after-reload')
            context.close()
            if args.scenario!='career':
                # A fresh browser context exercises sandbox equipment without changing career saves.
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                page = context.new_page()
                ready()
                start('free')
                foot()
                initial = snap()['gameplay']['ammunition']
                for weapon, key, magazine in [('pistol', '2', 12), ('shotgun', '3', 6), ('smg', '4', 30), ('carbine', '5', 24)]:
                    pulse(key)
                    before = record(weapon+' selected')
                    check(before['gameplay']['weapon'] == weapon and before['actors']['activeWeapon'] == weapon,
                          weapon+' key selects its actual rendered weapon model')
                    fire()
                    after = snap()['gameplay']['ammunition']
                    check(0 <= after[weapon]['ammo'] < before['gameplay']['ammo'], weapon+' normal aiming/fire consumes ammunition')
                    check(all(after[other] == before['gameplay']['ammunition'][other] for other in initial if other != weapon),
                          weapon+' firing preserves all independent ammunition pools')
                    pulse('r')
                    page.wait_for_function('capitalDriveSnapshot().gameplay.reloading===0', timeout=15000)
                    check(snap()['gameplay']['ammo'] == magazine, weapon+' normal reload refills its own magazine')
                pulse('d')
                capture('all-weapons-free-roam')
                dealer = next(s for s in snap()['streetDealers']['services'] if s['id'] == 'dealer-kingston')
                teleport_point(dealer['x']-math.sin(dealer['yaw'])*11, dealer['z']-math.cos(dealer['yaw'])*11)
                foot()
                around_own_car(dealer, tolerance=2.2)
                look(dealer)
                pulse('e')
                page.wait_for_function('document.querySelector("#services-dialog").open')
                arms()
                card(dealer['id']).scroll_into_view_if_needed()
                dealer_state = record('street dealer normal E opening')
                check(len(dealer_state['streetDealers']['services']) == 3 and len(dealer_state['streetDealers']['people']) == 3,
                      'Three physical street dealers have service and actor descriptors')
                check(item(dealer['id'], 'shotgun').count() == 1 and item(dealer['id'], 'smg').count() == 0,
                      'Actual Kingston contact card exposes only its distinct pistol and shotgun stock')
                check(item(dealer['id'], 'shotgun').is_disabled(), 'Free roam contact cannot purchase career equipment')
                capture('street-dealer-stock-desktop')
                close_services()
                pulse('1')
                pose=snap()['focus'];yaw=snap()['camera']['footYaw']
                look({'x':pose['x']+math.cos(yaw)*5,'z':pose['z']-math.sin(yaw)*5})
                capture('street-dealer-contact-world')
                observations.append({'pedestrianRoutines': snap()['pedestrians'].get('routineSample', []),
                                     'dealerView': snap()['streetDealers']['view']})
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
        report = {'scenario':args.scenario,'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks,
                  'errors': errors, 'requests': requests, 'external': external,
                  'observations': observations, 'elapsedSeconds': round(time.monotonic()-started, 2),
                  'screenshots': sorted(path.name for path in output.glob('*.png')),
                  'limitations': ['Software WebGL only; native/N100 performance unmeasured.',
                                 '390px capture checks layout; touch combat is unexercised.',
                                 'Positive gameplay uses normal input and read-only snapshots.',
                                 'Ammunition remains transient across reload by design.',
                                 'Screenshots require separate visual review.']}
        (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
