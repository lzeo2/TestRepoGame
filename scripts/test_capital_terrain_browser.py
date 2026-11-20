#!/usr/bin/env python3
"""Bounded native Free-roam ramp and airport previews; run with an exclusive CPU lease.

Official map travel is explicit fixture setup. All vehicle movement uses real keys;
only the public read-only snapshot is inspected. No state setters or career grants.
"""
import argparse
from contextlib import ExitStack
import http.server
import json
import math
from pathlib import Path
import signal
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright
from profile_capital_sustained import QuietHandler, release, reposition, settle, sources

ROOT = Path(__file__).resolve().parents[1]
DTO = """() => {const s=capitalDriveSnapshot();return {ready:s.ready,started:s.started,
 gameMode:s.gameMode,paused:s.paused,player:s.player,gameplay:s.gameplay,stunts:s.stunts,
 airport:s.airport,rendering:s.rendering,world:s.world,neighbourhood:s.neighbourhood,
 camera:s.camera,focus:s.focus,mapView:s.mapView,driving:s.driving,jetpack:s.jetpack};}"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    parser.add_argument('--capture', action=argparse.BooleanOptionalAction, default=True)
    parser.add_argument('--scenario', choices=['both', 'ramp', 'airport', 'controls'], default='both')
    args = parser.parse_args()
    root, output = args.root.resolve(), args.output.resolve()
    if output == root or root in output.parents or output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository and source')
    output.mkdir(parents=True, exist_ok=False)
    report = {'scenario': args.scenario, 'checks': [], 'samples': [], 'repositions': [], 'settles': [],
              'errors': [], 'http_errors': [], 'request_failures': [], 'external_requests': [],
              'source_sha256': sources(root), 'screenshots': [],
              'limitations': ['Official Free-roam map arrivals are fixture setup, not natural travel.',
                             'One ramp and one airport view do not establish all locations, FPS or target-device performance.',
                             'Terminal footprint and post counts are owner diagnostics. Screenshots require visual review of terrain and silhouette.']}
    started, page, failure = time.monotonic(), None, None

    def check(value, label):
        report['checks'].append({'check': label, 'pass': bool(value)})
        if not value:
            raise AssertionError(label)

    def read(trajectory=False):
        # Return only motion ownership during the continuous native-input run.
        state = page.evaluate("() => {const s=capitalDriveSnapshot();return {player:s.player,gameplay:s.gameplay};}" if trajectory else DTO)
        report['samples'].append({'wall_seconds': time.monotonic() - started, **state})
        return state

    def capture(name):
        if args.capture:
            page.screenshot(path=str(output / (name + '.png')))
            report['screenshots'].append(name + '.png')

    def drive_keys(keys, milliseconds=100):
        page.locator('#world canvas').focus()
        for key in keys:
            page.keyboard.down(key)
        try:
            page.wait_for_timeout(milliseconds)
        finally:
            release(page)

    def ramp_case():
        ramps = read().get('stunts') or []
        ramp = next((r for r in ramps if r.get('fictional') and all(math.isfinite(r.get(k, math.nan)) for k in ('x', 'z', 'length', 'height', 'base', 'width'))), None)
        check(ramp is not None, 'Public snapshot exposes an actual finite fictional ramp')
        report['ramp'] = ramp
        approach = {'x': ramp['x'], 'z': ramp['z'] - 40}
        reposition(page, approach, report['repositions'])
        check(settle(page, 'ramp arrival', report['settles'], seconds=25)['settled'], 'Ramp arrival drains streamed geometry queues')
        check(read()['gameplay']['mode'] == 'vehicle', 'Official Free map arrival retains the real car')
        # Real steering establishes heading. A second official arrival restores
        # run-up space while retaining that genuinely driven yaw, with zero speed.
        aligned = False
        for _ in range(100):
            car = read()['player']
            delta = math.atan2(math.sin(math.pi - car['yaw']), math.cos(math.pi - car['yaw']))
            if abs(delta) < .075:
                aligned = True
                break
            drive_keys(['w', 'a' if delta > 0 else 'd'], 120)
        check(aligned, 'Real W and steering align the car toward the ramp positive-z axis')
        arrived = reposition(page, approach, report['repositions'])
        check(arrived['reposition']['delta_metres'] <= 3, 'Official map reaches the checked ramp run-up without a distant fallback')
        settle(page, 'aligned ramp arrival', report['settles'], seconds=15)
        capture('01-ramp-run-up')
        ascent = launch = descent = landing = None
        held = set()

        def hold(wanted):
            wanted = set(wanted)
            for key in held - wanted:
                page.keyboard.up(key)
            for key in wanted - held:
                page.keyboard.down(key)
            held.clear()
            held.update(wanted)

        end = time.monotonic() + 55
        page.locator('#world canvas').focus()
        try:
            while time.monotonic() < end:
                state = read(trajectory=True)
                car = state['player']
                check(state['gameplay']['mode'] == 'vehicle' and state['gameplay']['health'] > 0 and not state['gameplay']['recovery'], 'Ramp attempt stays in the live healthy vehicle owner')
                check(all(math.isfinite(car.get(k, math.nan)) for k in ('x', 'z', 'yaw', 'speed')), 'Native ramp trajectory remains finite')
                active = car.get('stuntActive', False)
                if active and ramp['z'] <= car['z'] <= ramp['z'] + ramp['length'] and car.get('stuntY', 0) > ramp['base'] + .7 and ascent is None:
                    ascent = state
                if active and car['z'] > ramp['z'] + ramp['length'] + .1 and car.get('stuntVy', 0) > 0 and launch is None:
                    launch = state
                if launch and active and car.get('stuntVy', 0) < -.1 and descent is None:
                    descent = state
                if descent and not active and car['z'] > ramp['z'] + ramp['length'] + 2:
                    # A second live sample must retain ground ownership after flight clears.
                    hold([])
                    page.wait_for_timeout(150)
                    confirmed = read(trajectory=True)
                    if not confirmed['player'].get('stuntActive', False):
                        landing = confirmed
                        break
                check(abs(car['x'] - ramp['x']) < 16, 'Actual steering stays within the finite stunt corridor')
                check(car['z'] < ramp['z'] + 90, 'Attempt cannot silently continue beyond the bounded landing corridor')
                target_z = ramp['z'] + ramp['length'] + 60
                desired = math.atan2(-(ramp['x'] - car['x']), -(target_z - car['z']))
                delta = math.atan2(math.sin(desired - car['yaw']), math.cos(desired - car['yaw']))
                keys = ['w', 'Shift']
                if abs(delta) > .045:
                    keys.append('a' if delta > 0 else 'd')
                hold(keys)
                page.wait_for_timeout(100)
        finally:
            hold([])
        report['ramp_evidence'] = {'ascent': ascent, 'launch': launch, 'descent': descent, 'landing': landing}
        check(ascent is not None, 'Native driving climbs the real ramp support')
        check(launch is not None, 'Past the ramp tip the actual car has unsupported upward stunt velocity')
        check(launch is not None and launch['player']['speed'] > 9 and math.isfinite(launch['player'].get('stuntY', math.nan)) and launch['player']['stuntY'] > ramp['base'] + ramp['height'], 'Unsupported launch has real speed and finite altitude above the ramp tip')
        check(descent is not None, 'Actual unsupported flight reaches downward vertical velocity before landing')
        check(landing is not None, 'After launch the actual flight owner clears stunt state on physical landing')
        capture('03-ramp-landed')

    def controls_case():
        # This bounded smoke starts at the normal Free-roam spawn. It proves
        # control ownership, not a full-speed handling course or route clearance.
        held = set()

        def hold(wanted):
            wanted = set(wanted)
            for key in held - wanted:
                page.keyboard.up(key)
            for key in wanted - held:
                page.keyboard.down(key)
            held.clear()
            held.update(wanted)

        def until(predicate, label, seconds=20):
            end = time.monotonic() + seconds
            while time.monotonic() < end:
                state = read()
                if predicate(state):
                    return state
                page.wait_for_timeout(100)
            raise AssertionError(label + ' timed out')

        page.locator('#world canvas').focus()
        try:
            page.keyboard.press('F2')
            cockpit = until(lambda s: s['camera'].get('viewMode') == 'cockpit', 'Native F2 cockpit')
            check(cockpit['gameplay']['mode'] == 'vehicle', 'Native cockpit belongs to manually driven car')
            capture('05-native-cockpit')
            fuel = cockpit['driving']['nitroFuel']
            hold(['w', 'Shift'])
            boosted = until(lambda s: s['driving']['nitroActive'] and s['driving']['nitroFuel'] < fuel, 'Native W Shift spends nitro')
            check(0 <= boosted['driving']['nitroFuel'] < fuel <= 1, 'Native boost consumes bounded normalized fuel')
            # A drift is diagnostic only unless spawn clearance permits entry speed.
            if boosted['player']['speed'] > 8:
                hold(['w', 'Space', 'a'])
                end, drift = time.monotonic() + 2, None
                while time.monotonic() < end:
                    state = read()
                    if state['driving']['driftActive']:
                        drift = state
                        break
                    page.wait_for_timeout(100)
                report['native_drift'] = drift
            else:
                report['native_drift'] = {'not_exercised': 'Bounded spawn smoke did not establish a clear above-8m/s handling route.'}
            hold(['Space'])
            until(lambda s: abs(s['player']['speed']) < .4, 'Native handbrake stops the car')
            hold([])
            page.keyboard.press('e')
            foot = until(lambda s: s['gameplay']['mode'] == 'foot', 'Native E exits stopped car')
            check(foot['camera'].get('viewMode') != 'cockpit', 'Leaving car clears actual cockpit camera ownership')
            page.keyboard.press('u')
            until(lambda s: s.get('jetpack', {}).get('active'), 'Native U activates foot jetpack')
            hold(['Space'])
            def altitude(state):
                return state.get('jetpack', {}).get('altitude', state['gameplay'].get('actor', {}).get('jumpHeight', 0))
            airborne = until(lambda s: altitude(s) > 1, 'Native Space raises the real foot body')
            hold([])
            check(airborne['jetpack']['active'] and math.isfinite(altitude(airborne)), 'Jetpack has finite positive altitude with live flight ownership')
            report['native_controls'] = {'cockpit': cockpit, 'boost': boosted, 'flight': airborne}
            capture('06-native-jetpack-flight')
            hold(['Shift'])
            landed = until(lambda s: not s['jetpack']['active'] and altitude(s) <= .01, 'Native Shift lands and releases flight owner', seconds=30)
            report['native_controls']['landing'] = landed
            check(landed['gameplay']['mode'] == 'foot' and landed['gameplay']['health'] > 0, 'Jetpack physically lands in the live foot owner')
        finally:
            hold([])

    def airport_case():
        point = {'x': 4622.74, 'z': -1045.64}
        reposition(page, point, report['repositions'])
        check(settle(page, 'airport arrival', report['settles'], seconds=30)['settled'], 'Airport arrival drains all streaming queues')
        state = read()
        airport = state['airport']
        check(airport['terminalFootprints'] == 1 and airport['sourceSurfaces'] > 0, 'Airport retains one source terminal footprint and mapped airfield surfaces')
        check(0 < airport['decorativePosts'] <= airport['maxDecorativePosts'] == 96, 'Airport road reflector posts are present and bounded')
        check(0 < airport['residentChunks'] <= airport['maxResidentChunks'] and airport['drawCalls'] > 0, 'Settled airport exterior owns visible bounded streamed geometry')
        report['airport_preview'] = state
        capture('04-airport-source-shape-and-road-posts')

    def expired(*_):
        raise TimeoutError('Native terrain preview exceeded its 300-second wall budget')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(300)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), lambda *a, **kw: QuietHandler(*a, directory=str(root), **kw))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with ExitStack() as stack:
            pw = stack.enter_context(sync_playwright())
            browser = pw.chromium.launch(executable_path=args.chromium, headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
            stack.callback(context.close)
            base = f'http://127.0.0.1:{server.server_port}'
            def route(request):
                if urlsplit(request.request.url).scheme in ('http', 'https') and urlsplit(request.request.url).netloc != urlsplit(base).netloc:
                    report['external_requests'].append(request.request.url)
                    request.abort()
                else:
                    request.continue_()
            context.route('**/*', route)
            page = context.new_page()
            page.set_default_timeout(30000)
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.on('console', lambda message: report['errors'].append(message.text) if message.type == 'error' else None)
            page.on('requestfailed', lambda request: report['request_failures'].append({'url': request.url, 'failure': request.failure}))
            page.on('response', lambda response: report['http_errors'].append({'url': response.url, 'status': response.status}) if response.status >= 400 else None)
            page.on('websocket', lambda socket: report['external_requests'].append('WebSocket:' + socket.url))
            try:
                page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=120000)
                page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=90000)
                page.locator('[data-game-mode=free]').click()
                page.locator('#guided-tutorial').uncheck()
                page.locator('#start-button').click()
                page.locator('#pause-button').click()
                page.locator('#quality').select_option('performance')
                page.locator('#resume-button').click()
                initial = read()
                check(initial['gameMode'] == 'free' and initial['started'] and not initial['rendering']['compatibility'], 'Normal Free-roam UI starts actual WebGL gameplay')
                if args.scenario in ('both', 'ramp'):
                    ramp_case()
                if args.scenario == 'controls':
                    controls_case()
                if args.scenario in ('both', 'airport'):
                    airport_case()
                check(not any(report[key] for key in ('errors', 'http_errors', 'request_failures', 'external_requests')), 'No runtime errors, failed local loads or external requests')
            except Exception:
                try:
                    capture('failure')
                except Exception as capture_error:
                    report['failure_capture_error'] = repr(capture_error)
                raise
            finally:
                release(page)
    except Exception as error:
        failure = repr(error)
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, prior)
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        report['failure'] = failure
        report['pass'] = failure is None
        report['wall_seconds'] = time.monotonic() - started
        report['source_unchanged'] = sources(root) == report['source_sha256']
        if not report['source_unchanged']:
            report['pass'] = False
        (output / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'pass': report['pass'], 'checks': len(report['checks']), 'failure': failure, 'screenshots': report['screenshots']}))
    return 0 if report['pass'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
