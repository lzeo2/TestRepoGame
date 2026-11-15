#!/usr/bin/env python3
"""Bounded normal-input police entry, Milo start or private mission UI evidence.

timeout 240s python3 -B scripts/test_capital_indoor_police_browser.py \
  --scenario police --capture --output <fresh-external-directory>
No state, save, actor, wanted or clock injection. Police has one 50-second attempt.
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
BUDGET = 180


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scenario', choices=['police', 'milo', 'developer'], default='police')
    parser.add_argument('--code-file', type=Path, help='Private selector code in an external file; never recorded')
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    secret = ''
    if args.scenario == 'developer':
        if not args.code_file:
            parser.error('--code-file is required for developer UI verification')
        code_path = args.code_file.resolve()
        if code_path == ROOT or ROOT in code_path.parents:
            parser.error('--code-file must be outside the repository')
        try:
            secret = code_path.read_text().strip()
        except OSError:
            parser.error('Cannot read the external private selector code')
        if not secret or len(secret) > 32:
            parser.error('External private selector code has an invalid length')
    budget = {'police': BUDGET, 'milo': 90, 'developer': 100}[args.scenario]
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external = [], [], [], []
    failure, page = None, None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def expired(signum, frame):
        raise TimeoutError(f'Indoor police run exceeded {budget} seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(budget)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        return page.evaluate('capitalDriveSnapshot()')

    def record(label, state=None):
        state = state or snap()
        with (output / 'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'elapsedSeconds': round(time.monotonic()-started, 2), 'state': state})+'\n')
        return state

    def capture(label):
        record(label)
        if args.capture:
            page.screenshot(path=str(output / (label+'.png')), timeout=10000)

    def wait(predicate, label, seconds=15):
        end = time.monotonic()+seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return state
            page.wait_for_timeout(75)
        record(label+' timed out')
        raise AssertionError(label+' timed out')

    def focus():
        page.locator('#world canvas').focus()

    def frames():
        page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')

    def pulse(key):
        focus()
        page.keyboard.down(key)
        try:
            frames()
        finally:
            page.keyboard.up(key)
        frames()

    def walk(target, tolerance=.5, seconds=35):
        end, last, stalled = time.monotonic()+seconds, None, 0
        while time.monotonic() < end:
            state = snap()
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x']-pose['x'], target['z']-pose['z']
            distance = math.hypot(dx, dz)
            if distance <= tolerance:
                return
            stalled = stalled+1 if last and math.hypot(pose['x']-last['x'], pose['z']-last['z']) < .025 else 0
            assert stalled < 12, f'Native foot route blocked {distance:.2f}m before {target}'
            last = pose
            forward = (-math.sin(yaw)*dx-math.cos(yaw)*dz)/distance
            lateral = (math.cos(yaw)*dx-math.sin(yaw)*dz)/distance
            held = []
            if abs(forward) >= .38:
                held.append('w' if forward > 0 else 's')
            if abs(lateral) >= .38:
                held.append('d' if lateral > 0 else 'a')
            focus()
            for key in held:
                page.keyboard.down(key)
            try:
                page.wait_for_timeout(max(25, min(160, distance*180)) if distance < 2 else 320)
            finally:
                for key in held:
                    page.keyboard.up(key)
        raise AssertionError(f'Native foot route timed out before {target}')

    def look(target):
        state = snap()
        desired = math.atan2(-(target['x']-state['focus']['x']), -(target['z']-state['focus']['z']))
        delta = (state['camera']['footYaw']-desired+math.pi) % (2*math.pi)-math.pi
        box = page.locator('#world canvas').bounding_box()
        x, y = box['x']+box['width']/2, box['y']+box['height']/2
        page.mouse.move(x, y)
        page.mouse.down(button='right')
        try:
            page.mouse.move(x+delta/.006, y, steps=8)
        finally:
            page.mouse.up(button='right')
        frames()

    def room(plan, x, z):
        origin = plan['origin']
        c, s = math.cos(origin['yaw']), math.sin(origin['yaw'])
        return {'x': origin['x']+c*x+s*z, 'z': origin['z']-s*x+c*z}

    def local_z(plan, pose):
        origin = plan['origin']
        return math.sin(origin['yaw'])*(pose['x']-origin['x'])+math.cos(origin['yaw'])*(pose['z']-origin['z'])

    def career_prefixes(state):
        campaign = state['campaign']
        return {'cash': state['career']['cash'], **{key: campaign[key] for key in ('character', 'intros', 'completed', 'meeting', 'legacy')}}

    def developer_case():
        page.locator('#campaign-resume').click()
        wait(lambda s: not s['paused'], 'Normal Return to game closes initial briefing')
        original = record('fresh Kit before private selector')
        check(original['campaign']['character'] == 'student' and original['campaign']['active'] is None and original['career']['cash'] == 1000 and not any(original['campaign']['intros'].values()) and not original['campaign']['completed'], 'Fresh Kit has no active mission or earned progress before private selector')
        page.locator('#pause-button').click()
        page.locator('#pause-dialog').wait_for(state='visible')
        page.locator('#dev-code-section summary').click()
        check(page.locator('#dev-code-input').get_attribute('type') == 'password', 'Private selector code field is masked')
        check(page.locator('#mission-dev-picker').is_hidden(), 'Mission picker starts hidden')
        page.locator('#dev-code-input').fill('invalid-native-selector-code')
        page.locator('#dev-code-form button[type="submit"]').click()
        page.wait_for_function('document.querySelector("#dev-code-status").textContent.length>0')
        check(page.locator('#mission-dev-picker').is_hidden() and page.locator('#dev-code-input').input_value() == '', 'Wrong code keeps mission picker hidden and clears masked entry')
        page.locator('#dev-code-input').fill(secret)
        page.locator('#dev-code-form button[type="submit"]').click()
        page.locator('#mission-dev-picker').wait_for(state='visible')
        check(page.locator('#dev-code-input').input_value() == '', 'Accepted private entry clears masked code before any evidence capture')
        options = page.locator('#mission-dev-select option')
        check(options.count() == 13, 'Private selector exposes all thirteen mission options')
        check(career_prefixes(snap()) == career_prefixes(original), 'Unlocking selector preserves starting cash and all career progress prefixes')
        page.locator('#mission-dev-select').select_option('home-by-the-lake')
        page.locator('#mission-dev-play').click()
        preview = wait(lambda s: s['campaign']['active'] and s['campaign']['active'].get('developer') is True, 'Visible Start mission preview begins locked chapter')
        wait(lambda s: s['playerAppearance'] == 'player:basement', 'Preview owner appearance becomes Milo')
        page.wait_for_function('document.querySelector("#mode-label").textContent.includes("Milo")')
        preview = record('actual private selector starts locked Milo chapter')
        check(preview['campaign']['active']['id'] == 'home-by-the-lake' and preview['campaign']['active']['character'] == 'basement' and preview['gameplay']['mode'] == 'vehicle' and preview['playerAppearance'] == 'player:basement', 'Locked shared mission starts as developer preview with actual Milo body and HUD owner')
        check(career_prefixes(preview) == career_prefixes(original) and preview['campaign']['active']['reward'] == 0, 'Developer preview preserves original career prefixes and offers no mission reward')
        capture('private-selector-preview-active')
        pulse('j')
        page.locator('#campaign-dialog').wait_for(state='visible')
        page.locator('#campaign-cancel').click()
        restored = wait(lambda s: s['campaign']['active'] is None and s['playerAppearance'] == original['playerAppearance'], 'Normal J Cancel restores previous protagonist')
        check(career_prefixes(restored) == career_prefixes(original), 'Normal preview Cancel preserves cash, introductions and completed career prefixes')
        check(restored['gameMode'] == original['gameMode'] and restored['gameplay']['mode'] == original['gameplay']['mode'] and math.hypot(restored['focus']['x']-original['focus']['x'], restored['focus']['z']-original['focus']['z']) < .15, 'Normal preview Cancel restores prior mode and physical body position')
        check(math.hypot(restored['player']['x']-original['player']['x'], restored['player']['z']-original['player']['z']) < .15 and all(restored['gameplay'][key] == original['gameplay'][key] for key in ('health', 'weapon', 'ammo', 'reserveAmmo')), 'Normal preview Cancel restores previous parked car, health and equipped ammunition')
        page.locator('#campaign-resume').click()
        wait(lambda s: not s['paused'], 'Normal Return to game resumes restored Kit')
        capture('private-selector-cancel-restored')

    def police_case():
        initial = record('fresh Kit campaign')
        check(initial['career']['cash'] == 1000 and not any(initial['campaign']['intros'].values()), 'Fresh Kit has starting cash and no earned introductions')
        page.locator('#campaign-start').click()
        page.locator('#cutscene-dialog').wait_for(state='visible')
        page.locator('#cutscene-skip').click()
        page.locator('#cutscene-dialog').wait_for(state='hidden')
        wait(lambda s: s['campaign']['active'] is not None, 'Normal Skip starts school mission')
        focus()
        gate = next(g for g in snap()['campusGates'] if g['id'] == 'telopea-gate-11')
        for point in ({'x': gate['outside'][0], 'z': gate['outside'][1]}, {'x': gate['inside'][0], 'z': gate['inside'][1]}):
            look(point)
            walk(point, tolerance=.45)
        check(snap()['gameplay']['mode'] == 'foot', 'Actual WASD crosses mapped public school gate')
        entry = snap()['schoolEntry']
        look(entry.get('approach', entry))
        walk(entry.get('approach', entry), tolerance=.6)
        look(entry)
        walk(entry, tolerance=1.8)
        pulse('e')
        state = wait(lambda s: s['interiors']['active'] and s['interiors']['active']['type'] == 'school', 'Normal E school entry')
        plan = state['interiors']['active']
        check(plan['id'] == 'interior-telopea-school' and state['interiorView']['meshes'] > 0, 'Normal E loads actual school room')
        station = next(st for st in plan['activities'] if st['kind'] == 'alarm')
        walk(room(plan, 0, local_z(plan, station)), tolerance=.35)
        walk(station, tolerance=.4)
        look(next(f for f in plan['furniture'] if f['kind'] == 'alarm-panel'))
        serial = snap()['schoolAlarm']['serial']
        pulse('q')
        wait(lambda s: s['miniGame']['active'] and s['miniGame']['kind'] == 'alarm' and s['miniGame']['phase'] == 'arm', 'Actual alarm admission')
        check(snap()['miniGame']['expectedKey'] == 'x', 'Actual alarm expects native X input')
        focus()
        page.keyboard.down('x')
        try:
            wait(lambda s: s['miniGame']['phase'] == 'release', 'Held X reaches release cue')
        finally:
            page.keyboard.up('x')
        wait(lambda s: s['miniGame']['phase'] == 'confirm', 'Released X reaches Y cue')
        pulse('y')
        triggered = wait(lambda s: s['schoolAlarm']['serial'] > serial and s['gameplay']['wanted'] >= 1, 'Actual alarm creates wanted search')
        check(triggered['miniGame']['outcome'] == 'triggered' and triggered['career']['cash'] == 1000, 'Actual alarm earns no early mission cash')
        record('actual alarm wanted search', triggered)
        deadline = time.monotonic()+50
        # Clear the entry spawn and face its hall while the officers travel through
        # the real exterior map. No door crossing or police placement is scripted.
        walk(room(plan, 0, 9), tolerance=.35)
        walk(room(plan, 0, 12.5), tolerance=.35)
        look(room(plan, 0, 1))
        entered = None
        while time.monotonic() < deadline:
            state = record('waiting for physical police room entry')
            check_room = state['interiors']['active']
            assert check_room and check_room['id'] == plan['id'], 'Player remained in actual school room'
            officers = [unit for unit in state['gameplay']['police'] if unit.get('interiorId') == plan['id'] and unit['health'] > 0]
            if officers and state.get('indoorActors', {}).get('officers', 0) > 0:
                entered = state
                break
            assert not state['gameplay'].get('recovery'), 'No recovery during room-entry attempt'
            page.wait_for_timeout(700)
        check(entered is not None, 'Real wanted officers physically enter and render in the ordinary school room within 50 seconds')
        check(any(r['id'] == plan['id'] and not r['safehouse'] for r in entered['policeRooms']), 'Entered school is an ordinary room without safehouse protection')
        capture('actual-police-inside-school')
        check(snap()['career']['cash'] == 1000 and not snap()['campaign']['intros']['student'], 'Police entry grants no school completion or mission reward')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, timeout=30000, args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            stack.callback(context.close)
            page = context.new_page()
            page.set_default_timeout(12000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
            page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
            page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
            page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
            try:
                page.goto(base+'/Games/Capital%20Drive/', wait_until='load', timeout=60000)
                page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
                check(not snap()['rendering']['compatibility'], 'Native context has software WebGL')
                page.locator('[data-game-mode="campaign"]').click()
                hero = 'basement' if args.scenario == 'milo' else 'student'
                page.locator(f'#intro-characters [data-character="{hero}"]').click()
                if page.locator('#guided-tutorial').count():
                    page.locator('#guided-tutorial').uncheck()
                page.locator('#start-button').click()
                wait(lambda s: s['started'] and s['gameMode'] == 'campaign', 'Fresh campaign starts through visible UI')
                focus()
                if args.scenario == 'police':
                    police_case()
                elif args.scenario == 'developer':
                    developer_case()
                else:
                    state = record('fresh Milo campaign vehicle start')
                    check(state['campaign']['character'] == 'basement' and state['gameplay']['mode'] == 'vehicle', 'Fresh selected Milo starts inside his car')
                    check(state['career']['cash'] == 1000 and not any(state['campaign']['intros'].values()), 'Fresh Milo start grants no earned reward')
                    page.locator('#campaign-resume').click()
                    wait(lambda s: not s['paused'], 'Normal Return to game closes initial briefing')
                    focus()
                    page.keyboard.down('w')
                    try:
                        page.wait_for_timeout(700)
                    finally:
                        page.keyboard.up('w')
                    driven = record('fresh Milo actual held W')
                    check(driven['gameplay']['mode'] == 'vehicle' and math.hypot(driven['player']['x']-state['player']['x'], driven['player']['z']-state['player']['z']) > .1, 'Actual held W moves Milo and his starting car')
                    capture('fresh-milo-in-car')
                check(not errors, 'No page or console errors')
                check(not requests, 'No failed requests or HTTP errors')
                check(not external, 'No external runtime requests attempted')
            except Exception:
                try:
                    if args.scenario == 'developer' and page.locator('#dev-code-input').is_visible():
                        page.locator('#dev-code-input').fill('')
                    capture(args.scenario+'-failure-state')
                except Exception:
                    pass
                raise
    except Exception as error:
        detail = str(error).replace(secret, '[redacted]') if secret else str(error)
        failure = f'{type(error).__name__}: {detail}'
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, prior)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'status': 'FAIL' if failure else 'PASS', 'scenario': args.scenario, 'failure': failure, 'checks': checks, 'errors': errors, 'requests': requests, 'external': external, 'elapsedSeconds': round(time.monotonic()-started, 2), 'budgetSeconds': budget, 'screenshots': sorted(path.name for path in output.glob('*.png')), 'limitations': ['Software WebGL only; target hardware performance remains unmeasured.', 'Police case proves normal-input ordinary-room entry only when its assertion passes. Safehouse exclusion, evasion and mission completion are not native acceptance here.', 'Milo case proves only a fresh campaign vehicle start and brief movement; wanted career jobs and rewards are not exercised.', 'Developer case uses the configured private UI exception; locked chapter preview is not ordinary career unlock or mission completion evidence.']}
        (output/'results.json').write_text(json.dumps(report, indent=2)+'\n')
        print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
