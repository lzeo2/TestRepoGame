#!/usr/bin/env python3
"""Bounded native city UI QA with explicitly seeded, unearned prior wealth/equipment.

Only initial browser storage is arranged. Subsequent reads use the public snapshot;
all actions and travel use real DOM, keyboard and mouse input. No game setters,
private codes, Free-roam teleporting, FPS acceptance or earned-wealth claims.
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
import subprocess
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenario', choices=['city', 'workplace', 'burglary'], default='city')
    parser.add_argument('--capture', action='store_true')
    args = parser.parse_args()
    source, output = args.root.resolve(), args.output.resolve()
    if any(output == p or p in output.parents for p in (ROOT, source)):
        parser.error('--output must be external to source and repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    budget = 420 if args.scenario == 'workplace' else 480
    checks, errors, requests, external, observations = [], [], [], [], []
    page = context = server = thread = None
    failure = None
    fixture = None
    held = set()

    def hashes():
        game = source / 'Games/Capital Drive'
        paths = [*game.glob('*.js'), *game.glob('data/*.json'), game / 'index.html', game / 'style.css',
                 source / 'scripts/capital-city-browser-fixture.mjs', source / 'scripts/capital-campaign-fixture.mjs']
        return {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}

    initial_hashes = hashes()

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

    def capture(label):
        record(label)
        if args.capture:
            assert len(list(output.glob('*.png'))) < 4, 'Four-capture budget'
            page.screenshot(path=str(output / (label + '.png')), timeout=15000)

    def wait(predicate, label, seconds=20, poll=250):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label)
            page.wait_for_timeout(poll)
        record(label + '-timeout')
        raise AssertionError(label + ' timed out')

    def focus():
        page.locator('#world canvas').focus()

    def keys(wanted):
        wanted = set(wanted)
        for key in held - wanted:
            page.keyboard.up(key)
        for key in wanted - held:
            page.keyboard.down(key)
        held.clear()
        held.update(wanted)

    def pulse(key, milliseconds=80):
        focus()
        page.keyboard.down(key)
        try:
            page.wait_for_timeout(milliseconds)
        finally:
            page.keyboard.up(key)

    def close():
        if page.locator('dialog[open]').count():
            page.keyboard.press('Escape')
            wait(lambda s: not s['paused'], 'Actual Escape resumes')
        focus()

    def phone(tab):
        if page.locator('dialog[open]').count():
            close()
        page.locator('#phone-button').click()
        page.locator('#city-' + tab + '-open').click()
        page.locator('#city-dialog').wait_for(state='visible')
        check(snap()['paused'], 'Actual city panel pauses the sole world clock')

    def start():
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=90000)
        check(not snap()['rendering']['compatibility'], 'Actual WebGL boots')
        page.locator('[data-game-mode=campaign]').click()
        page.locator('#intro-characters [data-character=' + fixture['hero'] + ']').click()
        page.locator('#guided-tutorial').uncheck()
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == 'campaign', 'Normal Campaign Start')
        page.locator('#campaign-dialog').wait_for(state='visible')
        close()
        check(snap()['campaign']['active'] is None, 'Initial briefing closed without starting a mission')
        check(snap()['rendering']['quality'] == 'performance', 'Explicit Performance rendering is retained')

    def walk(target, tolerance=.9, seconds=35, sprint=False):
        end, previous, stalled = time.monotonic() + seconds, None, 0
        try:
            while time.monotonic() < end:
                state = snap()
                assert not state['paused'] and state['gameplay']['health'] > 0, 'Physical walking must remain live and alive'
                pose, yaw = state['focus'], state['camera']['footYaw']
                dx, dz = target['x'] - pose['x'], target['z'] - pose['z']
                distance = math.hypot(dx, dz)
                if distance <= tolerance:
                    return record('Native physical waypoint reached')
                stalled = stalled + 1 if previous and math.hypot(pose['x'] - previous['x'], pose['z'] - previous['z']) < .025 else 0
                assert stalled < 14, 'Native waypoint blocked by actual collision; no teleport fallback'
                previous = pose
                forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / distance
                lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / distance
                wanted = []
                if abs(forward) >= .36:
                    wanted.append('w' if forward > 0 else 's')
                if abs(lateral) >= .36:
                    wanted.append('d' if lateral > 0 else 'a')
                if sprint and distance > 5:
                    wanted.append('Shift')
                keys(wanted)
                page.wait_for_timeout(100 if distance < 2 else 250)
                keys([])  # Stop input before transferring a full diagnostic snapshot.
        finally:
            keys([])
        raise AssertionError('Native physical waypoint timed out')

    def aim(yaw):
        for _ in range(18):
            current = snap()['camera']['footYaw']
            difference = math.atan2(math.sin(current - yaw), math.cos(current - yaw))
            if abs(difference) < .04:
                return
            box = page.locator('#world canvas').bounding_box()
            x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            page.mouse.move(x, y)
            page.mouse.down(button='right')
            try:
                page.mouse.move(x + max(-150, min(150, difference / .0045)), y)
            finally:
                page.mouse.up(button='right')
            page.wait_for_timeout(100)
        raise AssertionError('Native mouse orientation timed out')

    def ammo(state):
        pool = state['gameplay']['ammunition']['pistol']
        return pool['ammo'] + pool['reserveAmmo']

    def city():
        baseline = record('Accepted unearned wealth and exterior checkpoint setup')
        check(baseline['career']['cash'] == 100000 and baseline['focus'] and baseline['gameplay']['mode'] == 'foot', 'Accepted normal save resumes source-built foot checkpoint')
        door = fixture['home']
        home_offer = fixture['properties'][0]
        wallet = baseline['career']['cash']
        check(not baseline['career'].get('ownedProperties', []) and not baseline['career'].get('stashes', {}), 'Fixture grants no property ownership or stash')
        check(math.hypot(baseline['focus']['x'] - door['x'], baseline['focus']['z'] - door['z']) > 3, 'Actual initial body remains outside purchase reach')
        phone('properties')
        page.locator('#city-buy-' + door['id']).click()
        far_denied = record('Actual far house purchase denied')
        check(far_denied['career']['cash'] == wallet and not far_persisted['career']['ownedProperties'], 'Far native purchase cannot debit cash or grant a house')
        close()
        phone('crew')
        offer = next(offer for offer in fixture['crewOffers'] if offer['id'] == 'merc-river')
        page.locator('#city-hire-merc-river').click()
        hired = snap()
        check(hired['career']['cash'] == wallet - offer['price'] and 'merc-river' in hired['career']['hiredCrew'], 'Native Hire debits exact authoritative price once')
        close()
        wait(lambda s: any(p['id'] == 'merc-river' and p['health'] > 0 for p in s['campaignCast']['people']), 'Actual hired guard body appears')
        capture('01-native-hired-guard')
        phone('drone')
        page.locator('#city-drone-launch').click()
        launched = wait(lambda s: s['drone']['state']['active'] and s['drone']['view']['visible'] == 1, 'Native phone launches one rendered drone')
        body = launched['focus']
        focus()
        keys(['w', 'Space'])
        try:
            moved = wait(lambda s: s['drone']['state']['y'] > launched['drone']['state']['y'] + .3 and math.hypot(s['drone']['state']['x'] - launched['drone']['state']['x'], s['drone']['state']['z'] - launched['drone']['state']['z']) > .3, 'Real flight input moves only drone', seconds=25, poll=400)
        finally:
            keys([])
        check(math.hypot(moved['focus']['x'] - body['x'], moved['focus']['z'] - body['z']) < 1e-6 and moved['gameplay']['health'] == launched['gameplay']['health'], 'Authoritative exposed body remains in place with unchanged health')
        check(moved['drone']['state']['battery'] < launched['drone']['state']['battery'], 'Actual supplied-time battery advances')
        capture('02-native-drone-flight')
        pulse('o')
        wait(lambda s: not s['drone']['state']['active'] and s['drone']['view']['visible'] == 0, 'Native O recalls drone')
        approach = {'x': door['x'] - math.sin(door['yaw']) * 2, 'z': door['z'] - math.cos(door['yaw']) * 2}
        walk(approach, tolerance=.35)
        phone('properties')
        before_purchase = snap()
        page.locator('#city-buy-' + door['id']).click()
        purchased = record('Actual nearby house purchase')
        check(home_offer['price'] == 15000 and purchased['career']['cash'] == before_purchase['career']['cash'] - home_offer['price'] and door['id'] in purchased['career']['ownedProperties'], 'Native nearby Buy pays exact first-house price and grants its actual room ID')
        close()
        pulse('e')
        inside = wait(lambda s: s['interiors']['active'] and s['interiors']['active']['id'] == door['id'], 'Actual E enters owned source house')
        check(any(room['id'] == door['id'] and room['safehouse'] for room in inside['policeRooms']), 'Owned house has actual police safehouse context')
        phone('properties')
        before = snap()
        cash, bullets = before['career']['cash'], ammo(before)
        page.locator('#city-store-cash').click()
        stored = snap()
        check(stored['career']['cash'] == cash - 100 and stored['career']['stashes'][door['id']]['cash'] == 100, 'Native cash deposit conserves both owners')
        page.locator('#city-take-cash').click()
        check(snap()['career']['cash'] == cash and snap()['career']['stashes'][door['id']]['cash'] == 0, 'Native cash withdrawal conserves both owners')
        page.locator('#city-weapon-pistol').click()
        without = snap()
        check(not without['career']['equipment']['pistol'] and without['gameplay']['weapon'] == 'unarmed', 'Native weapon storage removes carrying and selects unarmed')
        page.locator('#city-weapon-pistol').click()
        restored = snap()
        check(restored['career']['equipment']['pistol'] and ammo(restored) == bullets, 'Native weapon retrieval adds no starter ammunition')
        page.locator('#city-stash-ammo').fill('30')
        page.locator('#city-store-ammo-pistol').click()
        stored = snap()
        check(ammo(stored) + stored['career']['stashes'][door['id']]['ammo']['pistol'] == bullets and stored['career']['stashes'][door['id']]['ammo']['pistol'] == 30, 'Native ammunition deposit conserves 30 rounds')
        page.locator('#city-stash-ammo').fill('30')
        page.locator('#city-take-ammo-pistol').click()
        check(ammo(snap()) == bullets, 'Native ammunition retrieval conserves total')
        page.locator('#city-stash-ammo').fill('10000')
        page.locator('#city-store-ammo-pistol').click()
        denied = snap()
        check(ammo(denied) == bullets and denied['career']['stashes'][door['id']]['ammo']['pistol'] == 0, 'Denied native overdraw creates no ammunition')
        capture('03-native-safehouse-storage')
        page.locator('#city-stash-ammo').fill('10')
        page.locator('#city-store-ammo-pistol').click()
        persisted = snap()
        carried_after_deposit = ammo(persisted)
        check(carried_after_deposit + persisted['career']['stashes'][door['id']]['ammo']['pistol'] == bullets, 'Native pre-reload stash retains a real split ammunition balance')
        expected = {'cash': persisted['career']['cash'], 'ownedProperties': persisted['career']['ownedProperties'], 'hiredCrew': persisted['career']['hiredCrew'], 'equipment': persisted['career']['equipment'], 'stashes': persisted['career']['stashes']}
        page.reload(wait_until='load', timeout=90000)
        start()
        resumed = record('Actual reload reads native career writer')
        check(all(resumed['career'][key] == value for key, value in expected.items()), 'Native writer persists cash, crew, ownership and stash across reload')
        check(ammo(resumed) == carried_after_deposit and ammo(resumed) + resumed['career']['stashes'][door['id']]['ammo']['pistol'] == bullets, 'Reload preserves actual carried plus stashed ammunition without a duplicate grant')
        check(resumed['interiors']['active'] is None, 'Interior checkpoint resumes at real exterior return pose')
        override = resumed['headlights']['override']
        pulse('n')
        wait(lambda s: s['headlights']['override'] is not None and s['headlights']['override'] != override, 'Native N toggles read-only headlight signal')
        aim(door['yaw'])  # Throw toward the open public-facing exterior, away from the house.
        grenades = snap()['career']['gear']['grenades']
        pulse('v')
        thrown = wait(lambda s: s['career']['gear']['grenades'] == grenades - 1 and len(s['ordnance']['projectiles']) == 1, 'Native V consumes exactly one grenade')
        focus()
        keys(['s', 'Shift'])
        try:
            page.wait_for_timeout(500)
        finally:
            keys([])
        burst = wait(lambda s: len(s['ordnance']['bursts']) > 0, 'Actual fuse produces a bounded visible burst', seconds=40, poll=150)
        check(burst['career']['gear']['grenades'] == grenades - 1 and burst['gameplay']['health'] > 0, 'Native throw is charged once and player survives actual retreat')
        pulse('p')  # Preserve the short real burst for review behind the normal Pause panel.
        frozen_burst = snap()
        check(frozen_burst['paused'] and len(frozen_burst['ordnance']['bursts']) > 0, 'Normal Pause preserves the actual short grenade burst for review')
        capture('04-native-grenade-burst-paused')
        observations.append({'bodyVulnerabilityScope': 'No immunity setter was used. This run checks stationary body/health; enemy-damage vulnerability is established by owner tests, not by an arranged native attack.', 'grenadeScope': 'Normal V, native inventory debit and actual supplied-time fuse/burst; screenshot may show the normal Pause panel.'})

    def burglary_case():
        door = fixture['home']
        planned = fixture['burglaryPlan']
        check(planned and planned['roomId'] == door['id'], 'Source plan supplies actual house station and physically swept navigation waypoints')
        before = record('Explicit unearned wealth before native burglary')
        check(not before['career'].get('ownedProperties', []) and before['campaign']['active'] is None, 'Burglary begins at an unowned house without an active mission')
        approach = {'x': door['x'] - math.sin(door['yaw']) * 2, 'z': door['z'] - math.cos(door['yaw']) * 2}
        walk(approach, tolerance=.3)
        capture('01-native-unowned-house-footprint')
        pulse('e')
        wait(lambda s: s['burglary']['active'] and s['burglary']['phase'] == 'cue', 'Actual E starts the six-cue house lock', seconds=30, poll=150)
        pulse('p')
        frozen = snap()
        check(frozen['paused'] and frozen['burglary']['phase'] == 'cue', 'Normal Pause preserves the actual house lock cue')
        capture('02-native-house-lock-cue-paused')
        close()
        names = {'x': 'x', 'y': 'y', 'up': 'ArrowUp'}
        for index in range(6):
            cue = wait(lambda s: s['burglary']['active'] and s['burglary']['phase'] == 'cue' and s['burglary']['index'] == index, 'Fresh native lock cue ' + str(index + 1), seconds=20, poll=150)
            key = names[cue['burglary']['expectedKey']]
            focus()
            page.keyboard.down(key)
            try:
                wait(lambda s: bool(s['interiors']['active']) or s['burglary']['index'] > index, 'Native lock input accepted ' + str(index + 1), seconds=10, poll=150)
            finally:
                page.keyboard.up(key)
            page.wait_for_timeout(150)  # A real released input edge before the next cue.
        inside = wait(lambda s: s['interiors']['active'] and s['interiors']['active']['id'] == door['id'], 'Completed native lock automatically enters the actual house')
        check(inside['gameplay']['wanted'] >= 2, 'Actual forced entry reports breaking and entering')
        capture('03-native-entered-house-footprint')
        station = next(s for s in inside['interiors']['active']['activities'] if s['id'].endswith('-valuables'))
        check(station['id'] == planned['station']['id'] and station['kind'] == 'stock', 'Native room exposes the matching actual valuables activity')
        for point in planned['toStation']:
            walk(point, tolerance=.3, seconds=25)
        pulse('q')
        mini = wait(lambda s: s['miniGame']['active'] and s['miniGame']['station']['id'] == station['id'] and s['miniGame']['phase'] == 'memorise', 'Native Q begins the actual house search')
        check(mini['miniGame']['sequence'] == ['x', 'up', 'y', 'x'], 'Actual stock activity exposes its four-item memory sequence')
        wait(lambda s: s['miniGame']['phase'] == 'repeat', 'Actual supplied-time memorisation finishes', seconds=35, poll=250)
        cash = snap()['career']['cash']
        for index, key_name in enumerate(['x', 'up', 'y', 'x']):
            focus()
            page.keyboard.down(names[key_name])
            try:
                wait(lambda s: s['miniGame']['index'] > index or s['miniGame']['phase'] == 'complete', 'Native search item accepted ' + str(index + 1), seconds=10, poll=150)
            finally:
                page.keyboard.up(names[key_name])
            page.wait_for_timeout(150)
        rewarded = wait(lambda s: s['career']['cash'] > cash and s['career'].get('burglaryCooldowns', {}).get(door['id'], 0) > 0, 'Actual matching loot receipt pays and records cooldown')
        reward = rewarded['career']['cash'] - cash
        check(200 <= reward <= 600, 'Actual house reward stays within authoritative 200–600 range')
        saved = page.evaluate('JSON.parse(localStorage.getItem("capital-drive-career-v1"))')
        check(saved['cash'] == rewarded['career']['cash'] and saved.get('burglaryCooldowns', {}).get(door['id'], 0) > 0, 'Native writer persists house reward and cooldown immediately')
        record('Native house loot receipt')
        # A fresh real terminal session cannot bypass the authoritative cooldown.
        pulse('q')
        wait(lambda s: s['miniGame']['phase'] == 'repeat', 'Second actual search completes memorisation', seconds=35, poll=250)
        for index, key_name in enumerate(['x', 'up', 'y', 'x']):
            focus()
            page.keyboard.down(names[key_name])
            try:
                wait(lambda s: s['miniGame']['index'] > index or s['miniGame']['phase'] == 'complete', 'Repeated native search item ' + str(index + 1), seconds=10, poll=150)
            finally:
                page.keyboard.up(names[key_name])
            page.wait_for_timeout(150)
        check(snap()['career']['cash'] == rewarded['career']['cash'], 'Repeated real house search cannot pay through cooldown')
        for point in planned['toExit']:
            walk(point, tolerance=.3, seconds=25)
        pulse('e')
        escaped = wait(lambda s: s['interiors']['active'] is None, 'Normal E leaves through the actual house exit')
        check(escaped['gameplay']['health'] > 0 and escaped['career'].get('burglaryCooldowns', {}).get(door['id'], 0) > 0, 'Player survives real escape with a live house cooldown')
        capture('04-native-burglary-exterior-return')
        observations.append({'burglaryScope': 'Only prior wealth/equipment/checkpoint were seeded. Lock inputs, forced entry offence, actual memory activity, cash reward, denied repeat, writer and physical exit use normal native input. This does not establish all houses or police evasion.'})

    def workplace():
        check(snap()['campaign']['intros']['corporate'] == ['corporate-present-tense'], 'Explicit accepted Rowan first-intro prefix only')
        for point in fixture['waypoints']:
            walk(point, tolerance=1, seconds=60, sprint=True)
        capture('01-native-bunda-sidewalk-arrival')
        door = fixture['noodles']['frontage']
        approach = {'x': door['x'] - math.sin(door['yaw']) * 1.6, 'z': door['z'] - math.cos(door['yaw']) * 1.6}
        walk(approach, seconds=30)
        pulse('e')
        wait(lambda s: s['interiors']['active'] and s['interiors']['active']['storeId'] == fixture['noodles']['id'], 'Native Bunda walking and E reach real Lambzhou room')
        capture('02-native-lambzhou-room')
        check(snap()['campaign']['active'] is None, 'Travel case does not fabricate mission completion')

    def expired(*_):
        raise TimeoutError(f'City native scenario exceeded {budget} seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(budget)
    try:
        built = subprocess.run(['node', str(source / 'scripts/capital-city-browser-fixture.mjs'), args.scenario], cwd=source, text=True, capture_output=True, timeout=120)
        (output / 'fixture-build.stdout').write_text(built.stdout)
        (output / 'fixture-build.stderr').write_text(built.stderr)
        assert built.returncode == 0, 'Source fixture builder failed; see retained stdout/stderr'
        fixture = json.loads(built.stdout)
        (output / 'fixture.json').write_text(json.dumps(fixture, indent=2) + '\n')
        observations.append({'fixtureDisclosure': fixture['provenance'], 'sourceClearance': fixture['sourceClearance'], 'sourceLimits': fixture['limits']})
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(source)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
            stack.callback(context.close)
            seed = json.dumps(json.dumps(fixture['career']))
            context.add_init_script('if(!sessionStorage.getItem("capital-city-fixture-installed")){localStorage.setItem("capital-drive-career-v1",' + seed + ');sessionStorage.setItem("capital-city-fixture-installed","1");}localStorage.setItem("capital-drive-rendering-v1","performance");')
            page = context.new_page()
            page.set_default_timeout(15000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
            page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
            page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
            page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())

            def retain_failure(exc_type, exc, _traceback):
                if exc is not None:
                    try:
                        keys([])
                        record('Retained failure')
                    except Exception as capture_error:
                        observations.append({'failureCaptureError': str(capture_error)})
                    if args.capture and len(list(output.glob('*.png'))) < 4:
                        try:
                            page.screenshot(path=str(output / 'failure.png'), timeout=10000)
                        except Exception as capture_error:
                            observations.append({'failureScreenshotError': str(capture_error)})
                return False

            stack.push(retain_failure)
            page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=90000)
            start()
            {'city': city, 'workplace': workplace, 'burglary': burglary_case}[args.scenario]()
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests')
            check(hashes() == initial_hashes, 'Exact source hashes remain unchanged')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, prior)
        if server:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)
        final_hashes = hashes()
        result = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'scenario': args.scenario, 'checks': checks, 'errors': errors, 'requests': requests, 'external': external, 'observations': observations,
                  'elapsedSeconds': round(time.monotonic() - started, 2), 'budgetSeconds': budget, 'source_sha256': initial_hashes, 'source_sha256_end': final_hashes, 'source_unchanged': initial_hashes == final_hashes,
                  'screenshots': sorted(p.name for p in output.glob('*.png')), 'limitations': ['Prior wealth, equipment, checkpoint and optional Rowan intro prefix are explicit setup, not earned native progress. Property ownership and stash begin empty; the city case requires an actual nearby purchase.', 'Native inputs use actual clock, collision and authoritative writers; no production state setter or private code is used.', 'Workplace source path omits fixture-listed rendered/parked obstacles; actual native traversal must pass to establish this route.', 'Cloud SwiftShader does not establish Intel N100 FPS, GPU memory, or whole-campaign playability.']}
        (output / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
