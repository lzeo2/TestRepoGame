#!/usr/bin/env python3
"""Bounded real-input traffic signals, GPS and live Yoober map QA.

Use an outer watchdog: ``timeout 660s python3 -B scripts/test_capital_signals_browser.py ...``.
Fresh contexts use actual starter cash. Map travel is confined to Free roam.
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
    parser.add_argument('--scenario', choices=['street', 'guidance', 'signals', 'transport', 'flare', 'all'], default='all')
    parser.add_argument('--capture', action='store_true', help='Capture the requested visual review batch.')
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
    page, failure = None, None
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline():
        if time.monotonic() - started > BUDGET:
            raise TimeoutError(f'Signals browser run exceeded {BUDGET} seconds')

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

    def wait(predicate, label, seconds=45):
        end, next_record = time.monotonic() + seconds, time.monotonic() + 10
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label)
            if time.monotonic() >= next_record:
                record('waiting: ' + label)
                next_record = time.monotonic() + 10
            page.wait_for_timeout(250)
        record(label + ' timed out')
        raise AssertionError(label + ' timed out')

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

    def hold(key, milliseconds):
        page.keyboard.down(key)
        try:
            page.wait_for_timeout(milliseconds)
        finally:
            page.keyboard.up(key)

    def close(dialog):
        if page.locator('#' + dialog).is_visible():
            page.locator(f'[data-close="{dialog}"]').click()
        frames()
        focus()

    def brake():
        page.keyboard.down('Space')
        try:
            wait(lambda s: abs(s['player']['speed']) <= .15, 'Actual handbrake stops the player car', 15)
        finally:
            page.keyboard.up('Space')

    def ready(mode):
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=45000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
        check(not snap()['rendering']['compatibility'], 'Software WebGL is available for ' + mode)
        page.locator(f'[data-game-mode="{mode}"]').click()
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == mode, 'Normal mode selection starts ' + mode, 12)
        focus()

    def walk(target, tolerance=.9, seconds=30, detours=True):
        end, last, stalled = time.monotonic() + seconds, None, 0
        while time.monotonic() < end:
            state = snap()
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x'] - pose['x'], target['z'] - pose['z']
            distance = math.hypot(dx, dz)
            if distance <= tolerance:
                record('Normal foot waypoint reached')
                return
            stalled = stalled + 1 if last and math.hypot(pose['x'] - last['x'], pose['z'] - last['z']) < .025 else 0
            if stalled >= 6:
                vehicles = [v for v in state['nearbyVehicles'] if math.hypot(v['x'] - pose['x'], v['z'] - pose['z']) < 12]
                assert detours and vehicles, f'Physical foot route blocked before {target}'
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
                        record('Physical vehicle detour blocked')
                assert passed, f'Both physical vehicle detours blocked before {target}'
                stalled, last = 0, None
                continue
            last = pose
            forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / distance
            lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / distance
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
        raise AssertionError(f'Physical foot route timed out before {target}')

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

    def street_case():
        check(snap()['career']['cash'] == 1000, 'Fresh Street Life retains its actual $1000 wallet')
        before = record('Fresh untouched Street Life starting car')
        hold('w', 2000)
        driven = record('Starting car after two seconds of real W')
        check(math.hypot(driven['player']['x'] - before['player']['x'], driven['player']['z'] - before['player']['z']) > 5,
              'Fresh starting car moves more than five metres with two seconds of W')
        brake()
        pulse('e')
        wait(lambda s: s['gameplay']['mode'] == 'foot', 'Normal E exits the stopped starting car', 12)
        page.set_viewport_size({'width': 320, 'height': 240})
        pose = snap()['focus']
        gates = snap().get('campusGates', [])
        if gates:
            gate = min(gates, key=lambda g: math.hypot(g['x'] - pose['x'], g['z'] - pose['z']))
            if math.hypot(gate['x'] - pose['x'], gate['z'] - pose['z']) < 20:
                walk({'x': gate['inside'][0], 'z': gate['inside'][1]})
                walk({'x': gate['outside'][0], 'z': gate['outside'][1]})
        pulse('t')
        page.locator('#phone-dialog').wait_for(state='visible')
        page.locator('#yoober-destination').select_option('local-hop')
        check(page.locator('#yoober-book').is_enabled(), 'Actual on-foot location offers a valid local ride')
        page.locator('#yoober-book').click()
        booked = record('Tracking ride booked without boarding')
        check(booked['rideService']['phase'] == 'approaching' and booked['career']['cash'] == 1000,
              'Booking summons a real approaching car without spending cash')
        close('phone-dialog')
        pulse('t')
        page.locator('#yoober-track').click()
        page.locator('#map-dialog').wait_for(state='visible')
        first = wait(lambda s: s['rideTracking']['following'], 'Phone track action opens live map follow', 12)
        check(page.locator('#yoober-track-state').is_visible() and bool(page.locator('#yoober-track-state').inner_text().strip()),
              'Live follow state is visible in the map')
        check(math.hypot(first['mapView']['x'] - first['rideTracking']['car']['x'], first['mapView']['z'] - first['rideTracking']['car']['z']) < 2,
              'Live map initially centres on the actual booked car')
        first_traffic = {v['id']: v for v in first['trafficSample']}

        def live_moved(state):
            tracked = state['rideTracking']
            car_moved = math.hypot(tracked['car']['x'] - first['rideTracking']['car']['x'], tracked['car']['z'] - first['rideTracking']['car']['z']) > 3
            traffic_moved = any(v['id'] in first_traffic and math.hypot(v['x'] - first_traffic[v['id']]['x'], v['z'] - first_traffic[v['id']]['z']) > 1 for v in state['trafficSample'])
            return tracked['following'] and car_moved and traffic_moved and state['signals']['elapsed'] > first['signals']['elapsed'] + 2

        page.keyboard.down('w')
        try:
            second = wait(live_moved, 'NPC car traffic and signal clock advance with tracking map open', 60)
        finally:
            page.keyboard.up('w')
        check(math.hypot(second['focus']['x'] - first['focus']['x'], second['focus']['z'] - first['focus']['z']) < .05 and
              math.hypot(second['player']['x'] - first['player']['x'], second['player']['z'] - first['player']['z']) < .05,
              'Open tracking map freezes the player during held movement input')
        check(math.hypot(second['mapView']['x'] - second['rideTracking']['car']['x'], second['mapView']['z'] - second['rideTracking']['car']['z']) < 2 and
              math.hypot(second['mapView']['x'] - first['mapView']['x'], second['mapView']['z'] - first['mapView']['z']) > 3,
              'Live map centre follows the second real car position')
        check(math.isfinite(second['rideTracking']['distance']) and second['rideTracking']['distance'] >= 0,
              'Tracking reports finite actual driver distance')
        page.set_viewport_size({'width': 1280, 'height': 800})
        capture('yoober-live-tracking-map')
        page.set_viewport_size({'width': 390, 'height': 844})
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), '390px live tracking map has no horizontal page overflow')
        capture('yoober-live-tracking-390')
        close('map-dialog')
        if args.capture:
            page.set_viewport_size({'width': 1280, 'height': 800})
            pulse('p')
            page.locator('#pause-dialog').wait_for(state='visible')
            page.locator('#theme').select_option('light')
            check(page.locator('body').evaluate('(e)=>e.classList.contains("light")'),
                  'Normal pause theme selector applies the light appearance')
            page.locator('#resume-button').click()
            frames()
            focus()
            pulse('t')
            page.locator('#yoober-track').click()
            page.locator('#map-dialog').wait_for(state='visible')
            wait(lambda s: s['rideTracking']['following'], 'Normal phone action resumes live follow in light appearance', 12)
            capture('yoober-live-tracking-map-light')
            page.set_viewport_size({'width': 390, 'height': 844})
            check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),
                  '390px light tracking map has no horizontal page overflow')
            capture('yoober-live-tracking-light-390')
            close('map-dialog')
        pulse('t')
        page.locator('#yoober-cancel').click()
        ended = wait(lambda s: s['rideService']['phase'] == 'cancelled', 'Normal phone cancellation ends the unboarded booking', 12)
        check(ended['career']['cash'] == 1000 and not ended['career']['completedJobs'] and not ended['rideService']['paid'],
              'Tracking and cancellation neither spend cash nor pay a driver reward')

    def guidance_case():
        pulse('m')
        page.locator('#map-search').fill('Kingston shops')
        page.locator('#map-search-form button[type="submit"]').click()
        page.locator('#search-results button').filter(has_text='Kingston shops').first.click()
        page.locator('#map-route-button').click()
        close('map-dialog')
        before = wait(lambda s: s.get('guidance') is not None and s.get('roadGuidance', {}).get('visible', 0) > 0,
                      'Normal map search and Set route create GPS and road guidance', 12)

        def road_arrows(state, label):
            view, car = state['roadGuidance'], state['player']
            arrows = view['arrows']
            check(1 <= view['visible'] <= 3 and len(arrows) == view['visible'], label + ' shows one to three actual world arrows')
            check(all(all(isinstance(arrow.get(k), (int, float)) and math.isfinite(arrow[k]) for k in ('x', 'z', 'y', 'yaw')) for arrow in arrows),
                  label + ' exposes finite world arrow positions and headings')
            check(all((arrow['x'] - car['x']) * -math.sin(car['yaw']) + (arrow['z'] - car['z']) * -math.cos(car['yaw']) > 0 for arrow in arrows),
                  label + ' places every road arrow ahead of the actual car')
            return arrows

        before_arrows = road_arrows(before, 'Selected driving route')
        guidance = before['guidance']
        check(guidance['kind'] in ('left', 'right', 'uturn') and guidance['distance'] > 0 and guidance['remaining'] >= guidance['distance'],
              'Actual Kingston road route exposes a turn and positive road distance')
        check(all(math.isfinite(guidance[k]) for k in ('distance', 'yaw', 'remaining')) and any(
              math.hypot(p['x'] - guidance['point']['x'], p['z'] - guidance['point']['z']) < .01 for p in before['routePath']),
              'GPS turn point is an actual vertex on the selected road route')
        check(page.locator('#navigation-hud').is_visible() and page.locator('#navigation-symbol').evaluate(
              '(e)=>(e.matches("svg")?e:e.ownerSVGElement||e.querySelector("svg"))?.querySelectorAll("path,polyline,polygon").length>0'),
              'Visible GPS instruction uses an actual SVG arrow')
        text_before = page.locator('#navigation-distance').inner_text()
        hold('w', 2000)
        after = record('Actual drive advances GPS distance')
        check(math.hypot(after['player']['x'] - before['player']['x'], after['player']['z'] - before['player']['z']) > 5 and
              abs(after['guidance']['distance'] - guidance['distance']) > 2,
              'Actual driving changes the distance to the next road turn')
        check(page.locator('#navigation-distance').inner_text() != text_before,
              'Visible GPS distance changes with actual driven progress')
        after_arrows = road_arrows(after, 'Normally driven route')
        check(any(math.hypot(a['x'] - b['x'], a['z'] - b['z']) > .5 or
                  math.hypot((a['x'] - after['player']['x']) - (b['x'] - before['player']['x']),
                             (a['z'] - after['player']['z']) - (b['z'] - before['player']['z'])) > 1
                  for a, b in zip(after_arrows, before_arrows)),
              'Real driving advances world road arrow positions relative to the car')
        brake()
        capture('world-road-arrows-desktop')
        # Use the real orbit control so the narrow phone frame includes the
        # actual road marker when the starter car is beside the public lane.
        state = snap()
        car, camera = state['player'], state['camera']
        arrow = min(state['roadGuidance']['arrows'], key=lambda a: math.hypot(a['x'] - car['x'], a['z'] - car['z']))
        tx, tz = -math.sin(car['yaw']) * 5, -math.cos(car['yaw']) * 5
        vx, vz = arrow['x'] - car['x'] - tx, arrow['z'] - car['z'] - tz
        radius = math.hypot(camera['x'] - car['x'], camera['z'] - car['z'])
        aa, bb, cc = vx * vx + vz * vz, -2 * (tx * vx + tz * vz), tx * tx + tz * tz - radius * radius
        along = (-bb + math.sqrt(max(0, bb * bb - 4 * aa * cc))) / (2 * aa)
        desired = math.atan2(tx - along * vx, tz - along * vz) - car['yaw']
        desired = math.atan2(math.sin(desired), math.cos(desired))
        delta = math.atan2(math.sin(camera['orbit'] - desired), math.cos(camera['orbit'] - desired))
        rect = page.locator('#world canvas').bounding_box()
        cx, cy = rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2
        page.mouse.move(cx, cy)
        page.mouse.down()
        try:
            page.mouse.move(cx + delta / .006, cy, steps=12)
        finally:
            page.mouse.up()
        frames()
        check(abs(math.atan2(math.sin(snap()['camera']['orbit'] - desired), math.cos(snap()['camera']['orbit'] - desired))) < .08,
              'Normal mouse orbit frames the actual nearby world road arrow')
        page.set_viewport_size({'width': 390, 'height': 844})
        box = page.locator('#navigation-hud').bounding_box()
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth') and box and box['x'] >= 0 and box['x'] + box['width'] <= 391,
              '390px SVG GPS arrow and distance remain inside the viewport')
        capture('gps-turn-arrow-390')
        page.set_viewport_size({'width': 1280, 'height': 800})
        pulse('m')
        capture('gps-next-turn-map')
        close('map-dialog')
        pulse('e')
        on_foot = wait(lambda s: s['gameplay']['mode'] == 'foot' and s['roadGuidance']['visible'] == 0,
                       'Normal E exit hides the driving-only world road arrows', 12)
        check(on_foot['roadGuidance']['visible'] == 0, 'World road arrows stay hidden during actual on-foot gameplay')
        pulse('m')
        page.locator('#clear-route').click()
        close('map-dialog')
        cleared = wait(lambda s: s['routePoints'] == 0 and s['destination'] is None and s['roadGuidance']['visible'] == 0,
                       'Normal map Clear route removes the world arrow route', 12)
        check(cleared['roadGuidance']['visible'] == 0, 'Cleared routes leave no world road arrows')
        check(snap()['career']['cash'] == 1000 and not snap()['career']['completedJobs'], 'GPS selection and driving preserve the actual career wallet')

    def teleport_point(point):
        check(snap()['gameMode'] == 'free', 'Signal inspection map travel is confined to Free roam')
        pulse('m')
        for _ in range(8):
            if snap()['mapView']['zoom'] <= 1:
                break
            page.locator('#map-zoom-out').click()
        canvas = page.locator('#full-map')
        rect, view = canvas.bounding_box(), snap()['mapView']
        size = canvas.evaluate('(e)=>({width:e.width,height:e.height})')
        px = ((point['x'] - view['x']) * view['scale'] + size['width'] / 2) / size['width']
        py = ((point['z'] - view['z']) * view['scale'] + size['height'] / 2) / size['height']
        check(0 <= px <= 1 and 0 <= py <= 1, 'Actual signal approach is selectable on the normal Free-roam map')
        page.mouse.click(rect['x'] + px * rect['width'], rect['y'] + py * rect['height'])
        page.locator('#teleport-button').click()
        wait(lambda s: not s['paused'], 'Normal Free-roam map action returns to the world', 12)
        focus()

    def signals_case():
        state = record('Actual source signal registry')
        signals = state['signals']
        check(signals['sourceCount'] == 339 and len(signals['heads']) == 347 and signals['groupCount'] == 96,
              'Actual retained map has 339 source nodes 347 heads and 96 controller groups')
        head = min((h for h in signals['heads'] if h['axis'] == 0),
                   key=lambda h: math.hypot(h['x'] - state['focus']['x'], h['z'] - state['focus']['z']))
        target = {'x': head['x'] + math.sin(head['yaw']) * 12, 'z': head['z'] + math.cos(head['yaw']) * 12}
        teleport_point(target)
        pulse('e')
        wait(lambda s: s['gameplay']['mode'] == 'foot', 'Normal E permits on-foot signal inspection', 12)
        look(head)
        visible = wait(lambda s: s['signals']['view']['visible'] > 0, 'Real nearby signal heads occupy the rendered instance batches', 12)
        check(math.hypot(visible['focus']['x'] - head['x'], visible['focus']['z'] - head['z']) < 30,
              'Normal map arrival places the observer beside the inspected source head')
        observed = set()
        end = time.monotonic() + 100
        while time.monotonic() < end and observed != {'red', 'amber', 'green'}:
            current = snap()
            actual = next(h for h in current['signals']['heads'] if h['id'] == head['id'])
            if actual['color'] not in observed:
                observed.add(actual['color'])
                observations.append({'signalId': head['id'], 'color': actual['color'], 'signalSeconds': current['signals']['elapsed']})
                capture('signal-head-' + actual['color'])
            page.wait_for_timeout(250)
        check(observed == {'red', 'amber', 'green'}, 'Same actual source head changes green amber and red on the real simulation clock')
        check(snap()['signals']['elapsed'] > visible['signals']['elapsed'] + 3, 'Signal aspects advance through the sole real game clock')

    def transport_case():
        initial_career = snap()['career']
        buses = snap()['buses']
        check(len(buses) == 2 and all(bus['active'] for bus in buses), 'Two actual ambient buses are available for normal boarding')
        target_bus = buses[-1]

        def current_bus(state=None):
            return next(bus for bus in (state or snap())['buses'] if bus['id'] == target_bus['id'])

        def door(bus):
            return {'x': bus['x'] - math.cos(bus['yaw']) * 1.95 - math.sin(bus['yaw']) * 4.1,
                    'z': bus['z'] + math.sin(bus['yaw']) * 1.95 - math.cos(bus['yaw']) * 4.1}

        entry = door(target_bus)
        # Leave the player's whole car clear of the bus door rather than parking
        # across the actual boarding sweep. All travel uses the Free-roam map.
        teleport_point({'x': entry['x'] - math.cos(target_bus['yaw']) * 3.8,
                        'z': entry['z'] + math.sin(target_bus['yaw']) * 3.8})
        pulse('e')
        wait(lambda s: s['gameplay']['mode'] == 'foot', 'Normal E exits beside the actual bus approach', 12)
        page.set_viewport_size({'width': 320, 'height': 240})
        # A moving bus accepts an E stop request within ten metres. Wait for its
        # real layover to end before that request, then approach the held door.
        end = time.monotonic() + 5
        while current_bus()['speed'] <= .08 and time.monotonic() < end:
            page.wait_for_timeout(100)
        for _ in range(4):
            if snap()['busPassenger']:
                break
            entry = door(current_bus())
            check(snap()['gameplay']['mode'] == 'foot' and math.hypot(snap()['focus']['x'] - entry['x'], snap()['focus']['z'] - entry['z']) <= 9.8,
                  'Actual on-foot observer is within the ten-metre bus stop-request range')
            pulse('e')
            if snap()['busPassenger']:
                break
            wait(lambda s: current_bus(s)['speed'] <= .08, 'Actual E stop request stops the ambient bus', 25)
            walk(door(current_bus()), tolerance=1.1, seconds=20)
            pulse('e')
        boarded = record('Normal front-left-door bus boarding')
        check(boarded['busPassenger'] and boarded['gameplay']['passenger'], 'Actual stopped front-left bus door admits the player as passenger')
        bus_start = current_bus(boarded)
        moving = wait(lambda s: math.hypot(current_bus(s)['x'] - bus_start['x'], current_bus(s)['z'] - bus_start['z']) > 8,
                      'Actual boarded bus travels more than eight metres', 90)
        check(math.hypot(moving['focus']['x'] - current_bus(moving)['x'], moving['focus']['z'] - current_bus(moving)['z']) < .1,
              'Player focus follows the actual moving ambient bus')
        page.set_viewport_size({'width': 1280, 'height': 800})
        capture('ambient-bus-passenger')
        pulse('e')
        if snap()['busPassenger']:
            wait(lambda s: current_bus(s)['speed'] <= .08, 'Passenger E request brakes the actual bus before exit', 20)
            pulse('e')
        exited = wait(lambda s: not s['busPassenger'], 'Normal stopped E leaves the physical bus door', 12)
        check(exited['gameplay']['mode'] == 'foot' and not exited['gameplay']['passenger'], 'Bus exit returns the player to ordinary on-foot gameplay')
        check(exited['career'] == initial_career, 'Free-roam bus boarding travel and exit preserve career cash and progress')
        flare_case()

    def flare_case():
        initial_career = snap()['career']
        # The independent Free-roam preview uses a known open map point; this
        # is not an inventory grant or evidence of a paid career purchase.
        teleport_point({'x': 160, 'z': -430})
        pulse('e')
        wait(lambda s: s['gameplay']['mode'] == 'foot', 'Normal Free-roam map arrival permits on-foot flare preview', 12)
        look({'x': snap()['focus']['x'] + 10, 'z': snap()['focus']['z']})
        saved_before = page.evaluate('localStorage.getItem("capital-drive-career-v1")')
        for count in range(1, 4):
            angle = (count - 2) * .35
            pose = snap()['focus']
            look({'x': pose['x'] + math.cos(angle) * 10, 'z': pose['z'] + math.sin(angle) * 10})
            pulse('b')
            wait(lambda s: len(s['equipment']['flares']) == count, f'Actual B throws sandbox flare {count}', 12)
        flare_state = record('Three real sandbox flares burning')
        check(all(all(math.isfinite(flare[k]) for k in ('x', 'z', 'age', 'remaining')) and 0 < flare['remaining'] <= 20 for flare in flare_state['equipment']['flares']),
              'Sandbox flare preview exposes finite physical positions and bounded lifetimes')
        check(flare_state['equipment']['view']['visible'] == 3 and flare_state['equipment']['view']['capacity'] == 3,
              'All three actual flares occupy the bounded visible effect batches')
        pulse('b')
        check(len(snap()['equipment']['flares']) == 3, 'A fourth normal B cannot exceed the three-flare cap')
        capture('sandbox-flare-preview')
        check(snap()['career'] == initial_career and page.evaluate('localStorage.getItem("capital-drive-career-v1")') == saved_before,
              'Sandbox flare preview changes neither career wallet nor saved inventory')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            for scenario in (['street', 'guidance', 'signals', 'transport'] if args.scenario == 'all' else [args.scenario]):
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                try:
                    page = context.new_page()
                    ready('free' if scenario in ('signals', 'transport', 'flare') else 'street')
                    {'street': street_case, 'guidance': guidance_case, 'signals': signals_case, 'transport': transport_case, 'flare': flare_case}[scenario]()
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
                                 '390px checks layout; touch driving is unexercised.',
                                 'Gameplay uses normal keys/mouse and detached read-only snapshots.',
                                 'Browser observes actual signal phases; pure integration tests establish AI signal stopping and resuming.',
                                 'Screenshots require separate visual review.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
