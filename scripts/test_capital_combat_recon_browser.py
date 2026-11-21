#!/usr/bin/env python3
"""Native combat/recon/case/rematch QA with explicitly labeled career fixtures.

timeout 600s python3 -B scripts/test_capital_combat_recon_browser.py --capture --output <fresh-external>
Career fixtures seed accepted chapter prefixes and a structured exterior checkpoint
only. All scans, task inputs, shots, hits, room entry and victory use real browser
inputs and clocks. No private controls or production state setters are used.
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

from playwright.sync_api import TimeoutError as BrowserTimeoutError, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OLD_SHARED = ['late-parcel', 'under-the-awning', 'borrowed-wheels', 'quiet-streets',
              'across-the-water', 'home-by-the-lake', 'shelf-life', 'two-till-problem', 'carbon-copy']
INTROS = {'student': ['student-paper-chase', 'student-extra-credit'],
          'corporate': ['corporate-present-tense', 'corporate-lunch-breakpoint'],
          'basement': ['basement-touch-grass', 'basement-first-delivery']}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenario', choices=['all', 'aim', 'recon', 'case', 'rematch'], default='all')
    parser.add_argument('--capture', action='store_true')
    args = parser.parse_args()
    source, output = args.root.resolve(), args.output.resolve()
    if any(output == p or p in output.parents for p in (ROOT, source)):
        parser.error('--output must be outside the source/repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    page, context, cdp, reference, failure = None, None, None, None, None
    held = set()

    def hashes():
        game = source / 'Games/Capital Drive'
        paths = sorted([*game.glob('*.js'), game / 'index.html', game / 'style.css', *game.glob('data/*.json')])
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

    def capture(label, snapshot_first=True):
        if snapshot_first:
            record(label)
        if args.capture:
            assert len(list(output.glob('*.png'))) < 6, 'Capture budget is six frames'
            page.screenshot(path=str(output / (label + '.png')), timeout=15000)
        if not snapshot_first:
            record(label)

    def wait(predicate, label, seconds=15):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label)
            page.wait_for_timeout(60)
        record(label + ' timed out')
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

    def pulse(key, ms=70):
        focus()
        page.keyboard.down(key)
        try:
            page.wait_for_timeout(ms)
        finally:
            page.keyboard.up(key)
        page.wait_for_timeout(60)

    def close():
        if page.locator('dialog[open]').count():
            page.keyboard.press('Escape')
            wait(lambda s: not s['paused'], 'Actual Escape resumes gameplay')
        focus()

    def theme(value):
        page.locator('#pause-button').click()
        page.locator('#theme').select_option(value)
        page.locator('#resume-button').click()
        focus()

    def ready(browser, mode='free', hero=None, seed=None, mobile=False, appearance='dark'):
        nonlocal page, context, cdp
        if context:
            context.close()
        held.clear()
        context = browser.new_context(viewport={'width': 390, 'height': 844} if mobile else {'width': 1280, 'height': 800},
                                      is_mobile=mobile, has_touch=mobile, service_workers='block')
        if seed:
            context.add_init_script('localStorage.setItem("capital-drive-career-v1",' + json.dumps(json.dumps(seed)) + ');')
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=60000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
        check(not snap()['rendering']['compatibility'], 'Actual WebGL boots ' + mode)
        page.locator('[data-game-mode=' + mode + ']').click()
        if hero:
            page.locator('#intro-characters [data-character=' + hero + ']').click()
        page.locator('#guided-tutorial').uncheck()
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == mode, 'Normal Start enters ' + mode)
        close()
        cdp = context.new_cdp_session(page)
        if appearance != 'dark':
            theme(appearance)

    def walk(target, tolerance=.7, seconds=30, admitted=None):
        end, last, stalled = time.monotonic() + seconds, None, 0
        try:
            while time.monotonic() < end:
                state = snap()
                pose, yaw = state['focus'], state['camera']['footYaw']
                dx, dz = target['x'] - pose['x'], target['z'] - pose['z']
                distance = math.hypot(dx, dz)
                if admitted(state) if admitted else distance <= tolerance:
                    keys([])
                    return record('Normal foot approach reached')
                stalled = stalled + 1 if last and math.hypot(pose['x'] - last['x'], pose['z'] - last['z']) < .02 else 0
                assert stalled < 15, 'Normal foot route blocked by real collision'
                assert distance > 1e-6, 'Target reached without semantic admission'
                last = pose
                forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / distance
                lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / distance
                wanted = []
                if abs(forward) >= .38:
                    wanted.append('w' if forward > 0 else 's')
                if abs(lateral) >= .38:
                    wanted.append('d' if lateral > 0 else 'a')
                keys(wanted)
                page.wait_for_timeout(80 if distance < 2 else 180)
                # Stop the real input before transferring the full diagnostic
                # snapshot; transport latency must not extend a walking pulse.
                keys([])
        finally:
            keys([])
        raise AssertionError('Normal foot route timed out')

    def aim(yaw, pitch=0):
        # Fresh physical right-button drags, split into bounded pixel movements.
        for _ in range(14):
            state = snap()
            dyaw = math.atan2(math.sin(state['camera']['footYaw'] - yaw), math.cos(state['camera']['footYaw'] - yaw))
            dpitch = state['camera']['footPitch'] - pitch
            if abs(dyaw) < .025 and abs(dpitch) < .025:
                return
            box = page.locator('#world canvas').bounding_box()
            x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
            page.mouse.move(x, y)
            page.mouse.down(button='right')
            try:
                page.mouse.move(x + max(-150, min(150, dyaw / .0045)), y + max(-150, min(150, dpitch / .0045)))
            finally:
                page.mouse.up(button='right')
            page.wait_for_timeout(60)
        raise AssertionError('Actual mouse drags could not frame requested yaw/pitch')

    def face(target, pitch=0):
        p = snap()['focus']
        aim(math.atan2(-(target['x'] - p['x']), -(target['z'] - p['z'])), pitch)

    def room(plan, x, z):
        o = plan['origin']; c, s = math.cos(o['yaw']), math.sin(o['yaw'])
        return {'x': o['x'] + c * x + s * z, 'z': o['z'] - s * x + c * z}

    def fixture(hero, store_id, completed, exterior_distance=5):
        site = next(s for s in reference['services'] if s['id'] == store_id)
        door = site['frontage']; car = reference['player']
        seed = json.loads(json.dumps(reference['career']))
        seed['campaign'] = {'version': 2, 'character': hero, 'intros': INTROS, 'meeting': True, 'legacy': False, 'completed': completed}
        seed['protagonists'] = {'version': 1, 'student': None, 'corporate': None, 'basement': None}
        seed['protagonists'][hero] = {'mode': 'foot', 'actor': {'x': door['x'] - math.sin(door['yaw']) * exterior_distance,
            'z': door['z'] - math.cos(door['yaw']) * exterior_distance, 'yaw': door['yaw']},
            'vehicle': {**{k: car[k] for k in ('x', 'z', 'yaw')}, 'modelId': 'lantern', 'color': '#e7e6df', 'health': 100, 'stolen': False},
            'health': 100, 'weapon': 'unarmed', 'ammunition': {w: {'ammo': 0, 'reserveAmmo': 0} for w in ('pistol', 'shotgun', 'smg', 'carbine')}}
        observations.append({'fixture': 'Accepted chapter prefixes and structured exterior checkpoint only; prior chapters and travel were not earned in this native run.',
                             'hero': hero, 'storeId': store_id, 'exteriorDistance': exterior_distance,
                             'travelScope': 'Rendered exterior door approach fixture; no natural Civic travel or whole-sidewalk accessibility claim.' if exterior_distance == 1.8 else 'Exterior checkpoint beside the source storefront.',
                             'campaign': seed['campaign'], 'checkpoint': seed['protagonists'][hero]})
        return seed, door

    def start_mission(expected):
        pulse('j')
        check(snap()['campaign']['next'] == expected, 'Fixture selects expected chapter ' + expected)
        page.locator('#campaign-start').click()
        page.locator('#cutscene-skip').wait_for(state='visible')
        page.locator('#cutscene-skip').click()
        wait(lambda s: s['campaign']['active'] and s['campaign']['active']['id'] == expected and not s['cutscene']['active'], 'Actual UI starts ' + expected)
        focus()

    def enter(door, store_id, guided=False):
        if guided:
            guide = snap()['missionGuide']
            check(guide and guide['entryId'] == 'interior-' + store_id and not guide['indoors'], 'Mission guidance resolves the actual exterior entry descriptor')
            # The explicitly labeled rematch travel fixture starts at this
            # rendered exterior approach. Production restoration and E still
            # decide whether that physical placement and exact entry are valid.
            walk(guide['point'], tolerance=.45)
        else:
            walk(door, tolerance=2.1)
        pulse('e')
        return wait(lambda s: s['interiors']['active'] and s['interiors']['active']['storeId'] == store_id,
                    'Actual E enters exact matching shop ' + store_id)['interiors']['active']

    def aim_case(browser):
        nonlocal reference
        ready(browser)
        reference = record('Fresh Free roam reference; no save fixture')
        pulse('e')
        wait(lambda s: s['gameplay']['mode'] == 'foot', 'Actual E exits car for combat test')
        pulse('4')
        page.locator('#sound-button').click()
        check(page.locator('#sound-button').get_attribute('aria-pressed') == 'true', 'Actual Sound button admits combat audio')
        focus()
        state = snap(); yaw = state['camera']['footYaw']
        aim(yaw, .95)
        keys(['z'])
        before = snap(); traces = []
        page.mouse.down()
        try:
            end = time.monotonic() + .6
            while time.monotonic() < end:
                state = snap(); traces.extend(state['gameplay']['shots']); page.wait_for_timeout(35)
        finally:
            page.mouse.up(); keys([])
        after = record('Actual held SMG sky shots')
        check(after['combatAudioVoices'] <= 6, 'Actual held fire keeps browser audio voices bounded')
        wait(lambda s: s['combatAudioVoices'] == 0, 'Actual combat audio voices expire after trigger release', 3)
        delta = after['gameplay']['combatFeedback']['shotSerial'] - before['gameplay']['combatFeedback']['shotSerial']
        check(delta >= 3 and before['gameplay']['ammo'] - after['gameplay']['ammo'] == delta, 'Held automatic fire consumes one actual round per emitted shot')
        shots = [s for s in traces if s.get('shotSerial', 0) > before['gameplay']['combatFeedback']['shotSerial']]
        check(shots and all(s['pitch'] > .8 and s['endY'] > s['y'] and not s['hit'] for s in shots), 'Actual upward shots have rising 3D endpoints and cannot hit grounded people')
        keys(['z']); capture('desktop-dark-upward-aim'); keys([])
        aim(yaw, -.95)
        keys(['z']); page.mouse.down()
        try:
            ground = wait(lambda s: any(q.get('pitch', 0) < -.8 for q in s['gameplay']['shots']), 'Actual downward shot trace is observable', 4)
        finally:
            page.mouse.up(); keys([])
        down = next(q for q in ground['gameplay']['shots'] if q['pitch'] < -.8)
        check(down['endY'] < down['y'] and down['range'] < 5 and not down['hit'], 'Actual downward shot clips against nearby ground before any distant body')
        theme('light'); aim(yaw, 0); keys(['z'])
        box = page.locator('#world canvas').bounding_box(); x, y = box['width'] * .5, box['height'] * .45
        keys([]); page.mouse.move(x, y); keys(['z']); pitch = snap()['camera']['footPitch']
        page.mouse.move(x + 20, y - 70); page.wait_for_timeout(80)
        check(snap()['camera']['footPitch'] > pitch + .15, 'Held Z permits actual mouse look upward without a drag')
        pitch = snap()['camera']['footPitch']; keys(['z', 'PageDown']); page.wait_for_timeout(250); keys(['z'])
        check(snap()['camera']['footPitch'] < pitch - .1, 'Actual PageDown lowers keyboard aim pitch')
        keys([]); pulse('2')
        live_state = snap(); actor = live_state['focus']
        candidates = sorted([p for p in live_state['pedestrians']['sample'] if p.get('health', 0) > 0 and 3 < math.hypot(p['x'] - actor['x'], p['z'] - actor['z']) < 22],
                            key=lambda p: math.hypot(p['x'] - actor['x'], p['z'] - actor['z']))
        hit_proved = False
        for candidate in candidates[:3]:
            live = next((p for p in snap()['pedestrians']['sample'] if p['id'] == candidate['id'] and p.get('health', 0) > 0), None)
            if not live:
                continue
            face(live)
            updated = next((p for p in snap()['pedestrians']['sample'] if p['id'] == candidate['id'] and p.get('health', 0) > 0), None)
            if not updated:
                continue
            face(updated); keys(['z']); before_hit = snap()['gameplay']['combatFeedback']['hitSerial']
            page.mouse.down()
            try:
                try:
                    cue = page.wait_for_function('''before => {
                      const f=capitalDriveSnapshot().gameplay.combatFeedback;
                      const e=document.querySelector('#aim-reticle');
                      const visible=!!e&&!e.hidden&&!!e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
                      return f.hitSerial>before&&f.hits>0&&visible&&e.classList.contains('hit')?
                        {hitSerial:f.hitSerial,shotSerial:f.shotSerial,hits:f.hits,visible,reticleHit:true}:false;
                    }''', arg=before_hit, timeout=650, polling='raf').json_value()
                except BrowserTimeoutError:
                    counter = page.evaluate('capitalDriveSnapshot().gameplay.combatFeedback.hitSerial')
                    check(counter == before_hit, 'Any authoritative live-body hit must also show its actual reticle cue')
                else:
                    check(cue['hitSerial'] > before_hit and cue['hits'] > 0, 'Actual aimed shot registers authoritative live-body hit feedback')
                    check(cue['visible'] and cue['reticleHit'], 'Same renderer observation shows the actual successful-hit reticle cue')
                    observations.append({'nativeHitCue': cue, 'framedSampleId': candidate['id'], 'triggerHeldDuringCapture': True})
                    hit_proved = True
                    capture('desktop-light-hit-feedback', snapshot_first=False)
            finally:
                page.mouse.up()
            if hit_proved:
                break
            keys([])
        observations.append({'nativeHitFeedback': 'Actual live-body hit and visible cue verified.' if hit_proved else 'No unobstructed live sample target confirmed; native hit cue held, pure ray guards remain separate.'})
        if not hit_proved:
            keys(['z'])
            wait(lambda s: s['gameplay']['aiming'], 'Actual held Z remains active for the light aim frame')
            capture('desktop-light-held-aim')
        keys([])
        ready(browser, mobile=True, appearance='light')
        pulse('e'); wait(lambda s: s['gameplay']['mode'] == 'foot', 'Mobile normal E exits car')
        pulse('2')
        box = page.locator('#touch-look').bounding_box(); radius = (min(box['width'], box['height']) - 44) / 2
        point = {'id': 7, 'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2, 'force': 1}
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point]})
        before = snap()['camera']['footPitch']; point['y'] -= radius * .9
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [point]})
        page.wait_for_timeout(400)
        check(snap()['camera']['footPitch'] > before + .15, 'Actual mobile LOOK stick controls vertical foot aim')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': [point]})
        check(not snap()['touch']['look']['active'], 'Mobile vertical LOOK releases without stuck input')
        capture('mobile-light-vertical-look')

    def recon_case(browser):
        seed, _ = fixture('corporate', 'store-12918449444', OLD_SHARED)
        ready(browser, 'campaign', 'corporate', seed, appearance='light')
        start_mission('paper-trail-survey')
        initial_cash = snap()['career']['cash']
        pulse('i')
        check(snap()['campaign']['active']['stage'] == 0, 'An early scan before a steady view gives no mission credit')
        for stage in range(2):
            state = wait(lambda s: s['campaign']['active']['stage'] == stage and s['recon']['objective'], 'Actual recon objective appears')
            target = state['recon']['objective']; p = state['focus']
            distance = math.hypot(p['x'] - target['x'], p['z'] - target['z'])
            if not 3 <= distance <= 16:
                dx, dz = p['x'] - target['x'], p['z'] - target['z']; length = math.hypot(dx, dz) or 1
                walk({'x': target['x'] + dx / length * 6, 'z': target['z'] + dz / length * 6})
            face(target, 0)
            page.wait_for_timeout(250)
            frame = snap(); actor = frame['focus']
            eye_height = frame['camera']['y'] - .7
            target_pitch = math.atan2(target['y'] - eye_height, math.hypot(target['x'] - actor['x'], target['z'] - actor['z']))
            face(target, target_pitch)
            if stage == 0:
                page.locator('#pause-button').click(); page.locator('#pause-dialog').wait_for(state='visible')
                frozen = record('Recon paused before steady observation')
                page.keyboard.press('i')
                page.wait_for_timeout(350)
                check(snap()['recon'] == frozen['recon'] and snap()['campaign']['active']['stage'] == 0, 'Actual Pause freezes recon and cannot supply a receipt')
                page.locator('#resume-button').click(); focus(); face(target, target_pitch)
            ready_state = wait(lambda s: s['recon']['ready'], 'Real steady framing readies scan ' + str(stage + 1))
            check(ready_state['campaign']['active']['stage'] == stage, 'Steady waiting alone does not credit recon stage')
            check(page.locator('#recon-scan').is_enabled(), 'Actual SCAN button is enabled only after real steady framing')
            if stage == 1:
                check(page.locator('#navigation-hud').is_hidden(), 'Active recon hides the ordinary navigation card at every viewport')
                capture('desktop-light-recon-ready')
                page.locator('#recon-scan').click()
            else:
                pulse('i')
            wait(lambda s: s['campaign']['active'] is None or s['campaign']['active']['stage'] == stage + 1,
                 'Fresh actual ' + ('I key' if stage == 0 else 'SCAN button') + ' advances recon')
        done = record('Actual two-scan survey completed')
        check(done['campaign']['active'] is None and done['campaign']['completed'] == OLD_SHARED + ['paper-trail-survey'] and done['career']['cash'] == initial_cash + 900, 'Two fresh actual scans complete survey and pay exactly its real reward')
        pulse('i')
        check(snap()['career']['cash'] == done['career']['cash'], 'Extra scan cannot replay survey reward')

    def case_task(browser):
        seed, door = fixture('student', 'store-358293199', OLD_SHARED + ['paper-trail-survey', 'exit-interview'])
        ready(browser, 'campaign', 'student', seed, mobile=True)
        plan = enter(door, 'store-358293199')
        station = next(p for p in plan['activities'] if p['kind'] == 'evidence')
        # Coals has side shelves and customers in both side aisles. Its actual
        # central aisle is clear; the prior left-side route hit a living shopper.
        walk(room(plan, 0, 2.1), tolerance=.4)
        walk(room(plan, 0, plan['depth'] - 3.5), tolerance=.4)
        walk(station, tolerance=1)
        baseline = record('Before independent native ledger-case task')
        pulse('q')
        wait(lambda s: s['miniGame']['kind'] == 'evidence' and s['miniGame']['active'], 'Actual Q starts the separate case station task')
        for channel in range(3):
            task = wait(lambda s: s['miniGame']['channel'] == channel and s['miniGame']['phase'] == 'dial', 'Actual case channel becomes ready')['miniGame']
            while task['dialValue'] != task['evidenceCode'][channel]:
                change = (task['evidenceCode'][channel] - task['dialValue']) % 4
                key, expected = ('y', (task['dialValue'] - 1) % 4) if change == 3 else ('x', (task['dialValue'] + 1) % 4)
                pulse(key)
                task = wait(lambda s: s['miniGame']['phase'] == 'dial', 'Actual dial settles after ' + key.upper())['miniGame']
                check(task['dialValue'] == expected, 'Actual ' + key.upper() + ' changes the visible case dial')
            pulse('ArrowUp')
        final = wait(lambda s: s['miniGame']['phase'] == 'complete', 'Three actual dial confirmations secure the case')
        check(final['miniGame']['outcome'] == 'secured' and final['career']['cash'] == baseline['career']['cash'] and final['campaign']['completed'] == baseline['campaign']['completed'], 'Standalone native case task grants no wages or unplayed heist completion')
        check(final['evidence'] == baseline['evidence'], 'Standalone case task cannot issue a mission-bound evidence receipt')
        capture('mobile-dark-case-secured')

    def rematch(browser):
        prefix = OLD_SHARED + ['paper-trail-survey', 'exit-interview', 'sealed-account']
        seed, door = fixture('corporate', 'store-5656111023', prefix, exterior_distance=1.8)
        ready(browser, 'campaign', 'corporate', seed)
        start_mission('earmuffs-rematch')
        plan = enter(door, 'store-5656111023', guided=True)
        guest = lambda s: next(p for p in s['roomPeople'] if p.get('character') == 'booth-guest')
        walk(room(plan, 0, 10.6), tolerance=.2)
        walk(room(plan, .55, 10.6), tolerance=.08, admitted=lambda s: math.hypot(s['focus']['x'] - guest(s)['x'], s['focus']['z'] - guest(s)['z']) <= 2.1, seconds=12)
        face(guest(snap()))
        before = record('Before actual Pink rematch dialogue')
        pulse('e'); page.locator('#npc-dialog').wait_for(state='visible')
        page.locator('[data-dialogue-choice=fight]').click(); focus()
        wait(lambda s: s['encounter']['phase'] == 'noodle-flight', 'Actual Pink bowl throw precedes victory fight')
        wait(lambda s: not guest(s).get('noodleThrow'), 'Actual noodle flight finishes before player punches')
        check(snap()['encounter']['serial'] == before['encounter']['serial'] and not snap()['encounter']['won'], 'NPC throwing or punching alone cannot win the rematch')
        for hit in range(4):
            live = snap(); target = guest(live)
            if math.hypot(live['focus']['x'] - target['x'], live['focus']['z'] - target['z']) > 2.15:
                walk(target, tolerance=1.6, seconds=8)
            face(guest(snap()))
            health = guest(snap())['health']; pulse('f')
            landed = wait(lambda s: guest(s)['health'] < health, 'Actual player F lands rematch hit ' + str(hit + 1), 5)
            check(guest(landed)['health'] == health - 25, 'Actual F removes exactly 25 Pink health')
            if hit < 3:
                check(not landed['encounter']['won'], 'Pink remains unwon before actual KO')
                page.wait_for_timeout(650)
        won = wait(lambda s: s['encounter']['won'] and s['encounter']['outcome'] == 'noodle-victory', 'Actual fourth landed punch knocks Pink out')
        check(won['encounter']['playerHits'] == 4 and won['encounter']['dotHealth'] == 0 and won['campaign']['active']['stage'] == 1, 'Four actual fist hits and live KO advance only the rematch exit stage')
        check(won['career']['cash'] == before['career']['cash'] and won['campaign']['completed'] == prefix, 'KO alone grants no premature mission completion or reward')
        capture('desktop-dark-pink-ko')

    def failure_capture(error_type, error, traceback):
        if error_type and page and not page.is_closed():
            try:
                keys([]); record('Failure state')
                if args.capture and len(list(output.glob('*.png'))) < 6:
                    page.screenshot(path=str(output / 'combat-recon-failure.png'))
            except Exception as capture_error:
                observations.append({'captureError': str(capture_error)})
        return False

    def expired(*args):
        raise TimeoutError('Combat/recon browser run exceeded 540 seconds')

    prior = signal.signal(signal.SIGALRM, expired); signal.alarm(540)
    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            stack.callback(lambda: context.close() if context else None)
            stack.push(failure_capture)
            if args.scenario in ('all', 'aim'):
                aim_case(browser)
            if reference is None:
                ready(browser); reference = record('Fresh defaults used only for accepted fixture construction')
            for scenario, run in [('recon', recon_case), ('case', case_task), ('rematch', rematch)]:
                if args.scenario in ('all', scenario):
                    run(browser)
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests')
            check(hashes() == initial_hashes, 'Source hashes remain unchanged during native verification')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0); signal.signal(signal.SIGALRM, prior)
        server.shutdown(); server.server_close(); thread.join(timeout=2)
        final_hashes = hashes()
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'scenario': args.scenario, 'checks': checks,
                  'errors': errors, 'requests': requests, 'external': external, 'observations': observations,
                  'source_sha256': initial_hashes, 'source_sha256_end': final_hashes, 'source_unchanged': initial_hashes == final_hashes,
                  'elapsedSeconds': round(time.monotonic() - started, 2), 'screenshots': sorted(p.name for p in output.glob('*.png')),
                  'limitations': ['Cloud software WebGL only; N100/native GPU performance remains unmeasured.',
                                  'Fixture prefixes and initial exterior checkpoints are not naturally earned progress or career travel.',
                                  'Survey completion is claimed only after two actual scans; no whole sealed-account heist or all thirteen shared chapters are claimed.',
                                  'Pink KO checks actual fourth landed punch and exit-stage admission, not the old NPC-punch shortcut.',
                                  'Standalone case task does not claim a mission-bound evidence receipt or heist reward.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n'); print(json.dumps(report, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
