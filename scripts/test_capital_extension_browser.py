#!/usr/bin/env python3
"""Bounded native extension checks; optional campaign-prefix fixture is labeled.

timeout 300s python3 -B scripts/test_capital_extension_browser.py --capture --crew --output <fresh-external>
Uses normal UI/keys and read-only snapshots. Airport travel is Free roam only.
The --crew fixture seeds accepted introduction/shared prefixes, never live state,
cash, equipment, checkpoints, rewards, mission completion or private controls.
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
MAP_FILES = {'canberra.json', 'addresses.json', 'road-profiles.json', 'canberra-north.json',
             'north-terrain.json', 'traffic-signals.json', 'airport.json'}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--crew', action='store_true', help='Explicitly labeled saved-prefix fixture; no earned-progress claim.')
    args = parser.parse_args()
    source, output = args.root.resolve(), args.output.resolve()
    if any(output == p or p in output.parents for p in (ROOT, source)):
        parser.error('--output must be outside the source/repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations, map_responses = [], [], [], [], [], []
    failure, page, context = None, None, None

    def hashes():
        game = source / 'Games/Capital Drive'
        paths = sorted([*game.glob('*.js'), game / 'index.html', game / 'style.css',
                        *(game / 'data' / name for name in MAP_FILES)])
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
            if predicate(snap()):
                return record(label)
            page.wait_for_timeout(100)
        record(label + ' timed out')
        raise AssertionError(label + ' timed out')

    def focus():
        page.locator('#world canvas').focus()

    def pulse(key):
        focus()
        page.keyboard.down(key)
        try:
            page.wait_for_timeout(100)
        finally:
            page.keyboard.up(key)
        page.wait_for_timeout(80)

    def close_dialogs():
        if page.locator('dialog[open]').count():
            page.keyboard.press('Escape')
            wait(lambda s: not s['paused'], 'Actual Escape resumes gameplay')
        focus()

    def response_seen(response):
        if response.status >= 400:
            requests.append(f'{response.status} {response.url}')
        name = urlsplit(response.url).path.rsplit('/', 1)[-1]
        if name in MAP_FILES:
            map_responses.append({'file': name, 'status': response.status, 'local': urlsplit(response.url).netloc == urlsplit(base).netloc})

    def ready(browser, mode, hero=None, seed=None, mobile=False):
        nonlocal page, context
        if context:
            context.close()
        context = browser.new_context(viewport={'width': 844, 'height': 390} if mobile else {'width': 1280, 'height': 800},
                                      is_mobile=mobile, has_touch=mobile, service_workers='block')
        if seed:
            context.add_init_script('localStorage.setItem("capital-drive-career-v1",' + json.dumps(json.dumps(seed)) + ');')
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', response_seen)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=60000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
        check(not snap()['rendering']['compatibility'], mode + ': software WebGL boots')
        page.locator('[data-game-mode=' + mode + ']').click()
        if hero:
            page.locator('#intro-characters [data-character=' + hero + ']').click()
        page.locator('#guided-tutorial').uncheck()
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == mode, 'Normal Start enters ' + mode)
        close_dialogs()

    def expired(*args):
        raise TimeoutError('Extension browser run exceeded 270 seconds')

    def capture_on_exit(error_type, error, traceback):
        if error_type and page and not page.is_closed():
            try:
                record('Failure state')
                if args.capture:
                    page.screenshot(path=str(output / 'extension-failure.png'))
            except Exception as capture_error:
                observations.append({'captureError': str(capture_error)})
        return False

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(270)
    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            stack.callback(lambda: context.close() if context else None)
            stack.push(capture_on_exit)
            ready(browser, 'free')
            check(MAP_FILES <= {r['file'] for r in map_responses if r['local'] and r['status'] == 200}, 'All seven map JSON files load successfully from localhost')
            pulse('e')
            state = wait(lambda s: s['gameplay']['mode'] == 'foot', 'Normal E exits the stationary practice car')
            # Step away from the actual car exit using camera-relative real keys.
            dx, dz = state['focus']['x'] - state['player']['x'], state['focus']['z'] - state['player']['z']
            yaw = state['camera']['footYaw']
            lateral = math.cos(yaw) * dx - math.sin(yaw) * dz
            forward = -math.sin(yaw) * dx - math.cos(yaw) * dz
            key = ('d' if lateral > 0 else 'a') if abs(lateral) > abs(forward) else ('w' if forward > 0 else 's')
            page.keyboard.down(key)
            try:
                page.wait_for_timeout(650)
            finally:
                page.keyboard.up(key)
            pulse('2')
            page.keyboard.down('z')
            try:
                aiming = wait(lambda s: s['gameplay']['aiming'], 'Actual held Z enables keyboard aim')
                check(page.locator('#aim-reticle').is_visible(), 'Keyboard Z displays actual aim reticle')
            finally:
                page.keyboard.up('z')
            wait(lambda s: not s['gameplay']['aiming'], 'Releasing Z clears actual aim')
            baseline = record('Before practice ordnance')
            pulse('v')
            grenade = wait(lambda s: any(p['kind'] == 'grenade' for p in s['ordnance']['projectiles']), 'Actual V creates a practice grenade projectile')
            pulse('c')
            wait(lambda s: any(p['kind'] == 'smoke' for p in s['ordnance']['projectiles']), 'Actual C creates a practice smoke projectile')
            smoke = wait(lambda s: bool(s['ordnance']['clouds']) and not s['ordnance']['projectiles'], 'Real elapsed fuse produces smoke cloud and consumes projectiles', seconds=8)
            check(smoke['career'] == baseline['career'], 'Practice thrown equipment does not spend career inventory or cash')
            first = next(p for p in grenade['ordnance']['projectiles'] if p['kind'] == 'grenade')
            check(math.hypot(first['x'] - baseline['focus']['x'], first['z'] - baseline['focus']['z']) > .5, 'Practice grenade follows a real projectile trajectory')
            page.locator('#pause-button').click()
            page.locator('#pause-dialog').wait_for(state='visible')
            before_weather = record('After actual Pause opens')['atmosphere']['elapsed']
            page.wait_for_timeout(350)
            paused_weather = record('Paused atmosphere')
            check(paused_weather['atmosphere']['elapsed'] == before_weather, 'Pause freezes the supplied atmosphere clock')
            page.locator('#resume-button').click()
            focus()
            page.wait_for_timeout(350)
            check(snap()['atmosphere']['elapsed'] > paused_weather['atmosphere']['elapsed'], 'Actual resumed play advances atmosphere clock')
            pulse('m')
            page.locator('#map-search').fill('Canberra Airport')
            page.locator('#map-search-form button[type=submit]').click()
            result = page.locator('#search-results button').filter(has_text='Canberra Airport').first
            result.wait_for(state='visible')
            result.click()
            check(page.locator('#teleport-button').is_visible() and page.locator('#teleport-button').is_enabled(), 'Normal airport search exposes allowed Free roam Teleport')
            selected = record('Airport selected through normal map search')['mapSelection']
            page.locator('#teleport-button').click()
            airport = wait(lambda s: not s['paused'] and s['airport']['residentChunks'] > 0 and s['airport']['pendingChunks'] == 0, 'Allowed Free roam teleport streams actual airport geometry')
            check(math.hypot(airport['focus']['x'] - selected['x'], airport['focus']['z'] - selected['z']) < 200, 'Airport arrival stays near the selected source landmark')
            check(airport['airport']['terminalFootprints'] == 1 and airport['airport']['sourceSurfaces'] >= 2 and airport['airport']['triangles'] > 0, 'Actual airport has terminal footprint and runway/surface geometry')
            if args.capture:
                page.screenshot(path=str(output / 'airport-free-roam.png'))
            ready(browser, 'campaign', hero='student', mobile=True)
            check(snap()['gameplay']['mode'] == 'foot', 'Fresh Kit campaign begins on foot')
            pulse('l')
            power = wait(lambda s: s['powers']['activeCharacter'] == 'student' and s['powers']['remaining'] > 0, 'Ordinary L activates Kit campaign power')
            check(power['powers']['heroes']['student']['cooldown'] > 0, 'Actual power activation starts cooldown')
            check(page.locator('#hero-power-status').is_visible(), 'Actual campaign power has visible HUD status')
            facts = page.evaluate('''() => {
              const rect=e=>{const r=e.getBoundingClientRect();return {id:e.id||e.dataset.action,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,visible:!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'};};
              return {width:innerWidth,height:innerHeight,buttons:[...document.querySelectorAll('#touch-actions button')].map(rect),sticks:[...document.querySelectorAll('.touch-stick')].map(rect),career:rect(document.querySelector('#career-hud')),power:rect(document.querySelector('#hero-power-status'))};
            }''')
            observations.append({'campaignLandscapeGeometry': facts})
            check(len(facts['buttons']) == 9 and all(b['visible'] and b['width'] >= 44 and b['height'] >= 44 for b in facts['buttons']), 'Campaign landscape shows all nine actions with 44px targets')
            controls = facts['buttons'] + facts['sticks']
            overlap = lambda a, b: max(0, min(a['right'], b['right']) - max(a['x'], b['x'])) * max(0, min(a['bottom'], b['bottom']) - max(a['y'], b['y']))
            check(all(overlap(a, b) < 1 for i, a in enumerate(controls) for b in controls[i + 1:]), 'All nine Campaign actions and two sticks stay pairwise disjoint')
            check(all(overlap(b, facts['career']) < 1 for b in facts['sticks']), 'Campaign power HUD clears both joystick bases')
            if args.capture:
                page.screenshot(path=str(output / 'campaign-landscape-power.png'))
            pulse('g')
            page.locator('#garage-dialog').wait_for(state='visible')
            check(page.locator('#car-options').get_by_text('Vehicle upgrades', exact=True).count() > 0, 'Normal career Garage shows owned vehicle upgrade controls')
            before_route = record('Before normal Garage route')
            page.locator('#garage-route-button').click()
            routed = wait(lambda s: not s['paused'] and s['routePoints'] > 0, 'Actual Garage route action returns to play with a road route')
            check(math.hypot(routed['focus']['x'] - before_route['focus']['x'], routed['focus']['z'] - before_route['focus']['z']) < .01 and routed['career']['cash'] == before_route['career']['cash'], 'Garage route grants no money and does not move player')
            if args.crew:
                seed = json.loads(json.dumps(power['career']))
                seed['campaign'] = {'version': 2, 'character': 'corporate', 'intros': {
                    'student': ['student-paper-chase', 'student-extra-credit'],
                    'corporate': ['corporate-present-tense', 'corporate-lunch-breakpoint'],
                    'basement': ['basement-touch-grass', 'basement-first-delivery']},
                    'meeting': True, 'legacy': False,
                    'completed': ['late-parcel', 'under-the-awning', 'borrowed-wheels']}
                observations.append({'fixture': 'Crew starts from an accepted save containing introduction/meeting/shared prefixes only, over the actual fresh career defaults. These missions were not earned in this browser run.',
                                     'campaignSeed': seed['campaign']})
                ready(browser, 'campaign', hero='corporate', seed=seed)
                check(snap()['campaign']['next'] == 'quiet-streets', 'Labeled prefix fixture admits the expected shared crew chapter')
                pulse('j')
                page.locator('#campaign-start').click()
                page.locator('#cutscene-skip').wait_for(state='visible')
                page.locator('#cutscene-skip').click()
                wait(lambda s: s['campaign']['active'] and s['campaign']['active']['id'] == 'quiet-streets' and not s['cutscene']['active'], 'Ordinary mission Start and caption Skip activate fixture crew chapter')
                crew = wait(lambda s: len([p for p in s['campaignCast']['people'] if p['id'].startswith('campaign-ally:') and p['active'] and p['health'] > 0]) >= 2, 'Actual shared chapter spawns two living crew allies')
                pulse('j')
                choices = page.locator('#campaign-characters button:not([disabled])')
                check(choices.count() > 0, 'Actual Campaign menu offers a safe live ally switch')
                selected_hero = choices.first.get_attribute('data-character')
                before_switch = record('Before ordinary fixture crew switch')
                choices.first.click()
                switched = wait(lambda s: s['campaign']['character'] == selected_hero, 'Actual Campaign character button switches to living ally')
                check(switched['playerAppearance'] == 'player:' + selected_hero, 'Actual switched leader appearance follows selected ally')
                check(switched['career']['cash'] == before_switch['career']['cash'] and switched['campaign']['completed'] == before_switch['campaign']['completed'], 'Fixture crew handover grants no cash or mission completion')
                check(switched['gameplay']['wanted'] == before_switch['gameplay']['wanted'] and switched['gameplay']['police'] == before_switch['gameplay']['police'], 'Paused crew handover preserves actual wanted level and police state')
                before_allies = {p['id'] for p in before_switch['campaignCast']['people'] if p['id'].startswith('campaign-ally:')}
                after_allies = {p['id'] for p in switched['campaignCast']['people'] if p['id'].startswith('campaign-ally:')}
                expected_allies = before_allies - {'campaign-ally:' + selected_hero} | {'campaign-ally:' + before_switch['campaign']['character']}
                check(after_allies == expected_allies and len(after_allies) == 2, 'Actual crew handover preserves the other ally and returns former leader to a two-person roster')
                close_dialogs()
                end = time.monotonic() + 10
                while time.monotonic() < end:
                    state = snap()
                    dx, dz = state['player']['x'] - state['focus']['x'], state['player']['z'] - state['focus']['z']
                    distance = math.hypot(dx, dz)
                    if distance <= 3:
                        break
                    yaw = state['camera']['footYaw']
                    forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / distance
                    lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / distance
                    keys = []
                    if abs(forward) >= .38:
                        keys.append('w' if forward > 0 else 's')
                    if abs(lateral) >= .38:
                        keys.append('d' if lateral > 0 else 'a')
                    for key in keys:
                        page.keyboard.down(key)
                    try:
                        page.wait_for_timeout(150)
                    finally:
                        for key in keys:
                            page.keyboard.up(key)
                pulse('e')
                wait(lambda s: s['gameplay']['mode'] == 'vehicle', 'Actual E enters nearby owned car during shared chapter')
                boarded = wait(lambda s: any(p.get('seated') and p.get('vehicleId') == 'player' for p in s['campaignCast']['people']), 'Living crew actually boards a free passenger seat', seconds=12)
                check(any(p.get('seated') and p.get('carModelId') == boarded['gameplay']['vehicle']['modelId'] for p in boarded['campaignCast']['people']), 'Boarded ally retains actual carrier model identity')
                observations.append({'crewNative': 'UI mission activation/switch and E car entry/crew boarding were actual inputs after the explicitly seeded prefixes; no naturally earned introduction or chapter completion is claimed.'})
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests')
            check(hashes() == initial_hashes, 'Source hashes stay unchanged throughout extension run')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
        if page and not page.is_closed():
            try:
                record('Failure state')
                if args.capture:
                    page.screenshot(path=str(output / 'extension-failure.png'))
            except Exception as capture_error:
                observations.append({'captureError': str(capture_error)})
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, prior)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        final_hashes = hashes()
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks, 'errors': errors,
                  'requests': requests, 'external': external, 'observations': observations, 'mapResponses': map_responses,
                  'source_sha256': initial_hashes, 'source_sha256_end': final_hashes, 'source_unchanged': initial_hashes == final_hashes,
                  'elapsedSeconds': round(time.monotonic() - started, 2), 'screenshots': sorted(p.name for p in output.glob('*.png')),
                  'limitations': ['Software WebGL and browser emulation only; physical devices and N100 performance remain unmeasured.',
                                  'Airport search/teleport and ordnance are Free roam practice, not career completion.',
                                  'Only real elapsed atmosphere updates/pause are observed; no future-time or full weather/day cycle is claimed.',
                                  'Crew setup, when enabled, is a labeled accepted-save prefix fixture, never naturally earned mission progress.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
