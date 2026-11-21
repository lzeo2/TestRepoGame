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
    parser.add_argument('--scenario', choices=['city', 'workplace', 'burglary', 'gear', 'nitro'], default='city')
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--preview-only', action='store_true', help='Burglary entry preview only; skips loot, reward, repeat and exit acceptance')
    args = parser.parse_args()
    if args.preview_only and args.scenario != 'burglary':
        parser.error('--preview-only is supported only with --scenario burglary')
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
                 source / 'scripts/test_capital_city_browser.py', source / 'scripts/capital-city-browser-fixture.mjs', source / 'scripts/capital-campaign-fixture.mjs']
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
            limit = 5 if args.scenario == 'burglary' else 4
            assert len(list(output.glob('*.png'))) < limit, 'Bounded scenario capture budget'
            page.screenshot(path=str(output / (label + '.png')), timeout=15000)

    def wait(predicate, label, seconds=20, poll=250, retain=True):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label) if retain else state
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
        if args.scenario == 'nitro' and not fixture.get('nitroInstalled'):
            bay = next(b for b in snap()['nitro']['bays'] if b['id'] == 'fuel-457103413')
            fixture['nitroBay'] = bay
            body = fixture['career']['protagonists'][fixture['hero']]
            body['mode']='vehicle'
            body['vehicle'].update({k:bay[k] for k in ('x','z','yaw')})
            body['actor']={k:bay[k] for k in ('x','z','yaw')}
            fixture['nitroInstalled']=True
            page.evaluate('(save)=>localStorage.setItem("capital-drive-career-v1",JSON.stringify(save))', fixture['career'])
            observations.append({'label':'explicit initial checked-bay fixture','bay':bay,'scope':'Actual readonly menu bay supplies an unearned initial career checkpoint, then normal reload/start; no runtime setter.'})
            page.reload(wait_until='load')
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
                if state['gameplay']['mode'] != 'foot' or state['gameplay']['recovery']:
                    record('Physical walking interrupted by actual recovery or vehicle mode')
                    raise AssertionError('Native foot route interrupted by recovery or vehicle mode; no continued driving or teleport fallback')
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

    def nitro():
        baseline=record('Explicit initial full-tank checked petrol bay')
        bay=fixture['nitroBay']
        check(baseline['gameplay']['mode']=='vehicle' and baseline['career']['cash']==1500, 'Accepted checked-bay fixture starts driving with explicit $1500')
        check(math.hypot(baseline['player']['x']-bay['x'],baseline['player']['z']-bay['z'])<.1 and baseline['driving']['nitroFuel']==1, 'Initial car occupies the actual checked Kingston bay with full tank')
        keys(['w','Shift'])
        try:
            used=wait(lambda state:state['driving']['nitroFuel']<.985, 'Native throttle and boost consume real tank', seconds=12)
        finally:
            keys([])
        keys(['s','Space'])
        try:
            stopped=wait(lambda state:abs(state['player']['speed'])<.15, 'Native brake stops car on petrol bay', seconds=12)
        finally:
            keys([])
        fuel=stopped['driving']['nitroFuel']
        page.wait_for_timeout(700)
        resting=record('Actual depleted stationary tank')
        check(abs(resting['driving']['nitroFuel']-fuel)<1e-8, 'Career tank stays depleted while resting')
        offer=resting['nitro']['offer']
        check(offer and offer['ok'] and offer['cost']==45 and offer['station']['id']==bay['id'], 'Actual checked petrol bay offers stationary $45 refill')
        pulse('e')
        filled=wait(lambda state:state['driving']['nitroFuel']==1, 'Native E buys actual full tank')
        check(filled['career']['cash']==1455 and filled['gameplay']['mode']=='vehicle', 'Native refill charges exactly $45 once and keeps player driving')
        pulse('e')
        check(snap()['career']['cash']==1455, 'Full tank cannot charge a second refill')
        capture('01-paid-nitro-refill')


    def gear():
        initial=record('Explicit funded unowned Canalside checkpoint')
        check(initial['career']['cash']==1500 and not initial['career']['gear'].get('jetpack',False), 'Explicit initial funded career owns no jetpack')
        pulse('u')
        denied=record('Native unowned U denial')
        check(not denied['jetpack']['active'] and 'Canalside' in page.locator('#toast').text_content() and '1,200' in page.locator('#toast').text_content(), 'Unowned U gives actual shop and price without launching')
        page.locator('#services-button').click()
        page.locator('#services-filter').select_option('arms')
        buy=page.locator('[data-service-id="canalside-supplies"] [data-service-item="jetpack"]')
        buy.scroll_into_view_if_needed()
        check(buy.is_enabled(), 'Actual nearby Canalside jetpack purchase is eligible')
        buy.click()
        bought=record('Actual jetpack purchase')
        check(bought['career']['cash']==300 and bought['career']['gear']['jetpack'], 'Native purchase pays exact $1200 and grants durable jetpack ownership')
        check(page.locator('[data-service-id="canalside-supplies"] [data-service-item="jetpack"]').is_disabled(), 'Owned jetpack cannot be purchased twice')
        close()
        pulse('u')
        wait(lambda s:s['jetpack']['active'], 'Owned U launches actual jetpack')
        keys(['Space'])
        try:
            flown=wait(lambda s:s['jetpack']['altitude']>1, 'Native held Space raises actual player', seconds=20)
        finally:
            keys([])
        check(flown['jetpack']['charge']<100 and flown['gameplay']['health']>0, 'Live flight consumes charge and retains healthy body')
        capture('01-paid-jetpack-flight')
        pulse('u')
        wait(lambda s:not s['jetpack']['active'], 'Native U lands actual jetpack', seconds=40)
        page.reload(wait_until='load')
        start()
        restored=record('Actual owned jetpack reload')
        check(restored['career']['cash']==300 and restored['career']['gear']['jetpack'], 'Native save/reload preserves exact payment and jetpack ownership')
        pulse('u')
        wait(lambda s:s['jetpack']['active'], 'Reloaded owned jetpack launches without a second purchase')
        pulse('u')
        wait(lambda s:not s['jetpack']['active'], 'Reloaded jetpack lands')
        capture('02-owned-after-reload')

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
        check(far_denied['career']['cash'] == wallet and not far_denied['career'].get('ownedProperties', []), 'Far native purchase cannot debit cash or grant a house')
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
        launched = wait(lambda s: s['drone']['state']['active'] and s['drone']['view']['meshes'] == 1 and s['drone']['view']['visible'] == 0 and s['drone']['view']['drawCalls'] == 0, 'Native phone launches drone with own hull hidden from its camera')
        body = launched['focus']
        focus()
        keys(['w', 'Space'])
        try:
            moved = wait(lambda s: s['drone']['state']['y'] > launched['drone']['state']['y'] + .3 and math.hypot(s['drone']['state']['x'] - launched['drone']['state']['x'], s['drone']['state']['z'] - launched['drone']['state']['z']) > .3, 'Real flight input moves only drone', seconds=25, poll=400)
        finally:
            keys([])
        check(math.hypot(moved['focus']['x'] - body['x'], moved['focus']['z'] - body['z']) < 1e-6 and moved['gameplay']['health'] == launched['gameplay']['health'], 'Authoritative exposed body remains in place with unchanged health')
        check(moved['drone']['state']['battery'] < launched['drone']['state']['battery'], 'Actual supplied-time battery advances')
        check(moved['drone']['view']['visible'] == 0 and moved['drone']['view']['drawCalls'] == 0, 'Piloted drone hull stays outside the camera view after actual movement')
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
        burst = wait(lambda s: len(s['ordnance']['bursts']) > 0, 'Actual fuse produces a bounded visible burst', seconds=40, poll=100, retain=False)
        page.keyboard.press('p')
        check(burst['career']['gear']['grenades'] == grenades - 1 and burst['gameplay']['health'] > 0, 'Native throw is charged once and player survives actual retreat')
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
        check(inside['gameplay']['wanted'] == 0 and not inside['burglary']['alarmed'], 'Quiet successful lock does not automatically report an alarm')
        check(inside['gameplay']['health'] == 60, 'Only burglary setup begins injured for the later real bed-rest check')
        cash = inside['career']['cash']
        for search_index, search in enumerate(planned['searches']):
            station = next(s for s in inside['interiors']['active']['activities'] if s['id'] == search['station']['id'])
            check(station['kind'] == 'stock', 'Source route binds an actual distinct valuables activity')
            for point in search['path']:
                walk(point, tolerance=.3, seconds=25)
            if search_index == 0:
                capture('03-native-entered-house-footprint')
                if args.preview_only:
                    observations.append({'previewOnly': True, 'scope': 'Actual approach, six native lock cues, quiet entry and physical furniture station approach. Loot, bank, cooldown and paid rest are not acceptance claims.'})
                    return
            pulse('q')
            mini = wait(lambda s: s['miniGame']['active'] and s['miniGame']['station']['id'] == station['id'] and s['miniGame']['phase'] == 'memorise', 'Native Q begins distinct house search ' + str(search_index + 1))
            sequence = mini['miniGame']['sequence']
            expected = ['y', 'up', 'x', 'y'] if station['id'].endswith('-kitchen') else ['up', 'x', 'y', 'x'] if station['id'].endswith('-lounge') else ['x', 'up', 'y', 'x']
            check(sequence == expected, 'Actual owner supplies the distinct furniture memory sequence')
            wait(lambda s: s['miniGame']['phase'] == 'repeat', 'Actual search memorisation finishes', seconds=35, poll=250)
            for index, key_name in enumerate(sequence):
                focus()
                page.keyboard.down(names[key_name])
                try:
                    wait(lambda s: s['miniGame']['index'] > index or s['miniGame']['phase'] == 'complete', 'Native search input accepted ' + str(index + 1), seconds=10, poll=150)
                finally:
                    page.keyboard.up(names[key_name])
                page.wait_for_timeout(150)
            carried = wait(lambda s: s['burglary']['carriedLoot'] == search_index + 1, 'Actual completed search adds one carried cache')
            check(carried['career']['cash'] == cash and not carried['career'].get('burglaryCooldowns', {}).get(door['id'], 0), 'Indoor searches neither bank cash nor start the exit cooldown')
            session = carried['miniGame']['sessionId']
            pulse('q')
            repeated = snap()
            check(not repeated['miniGame']['active'] and repeated['miniGame']['sessionId'] == session and repeated['burglary']['carriedLoot'] == search_index + 1, 'Q at an already searched cache cannot create another activity or duplicate carry')
        check(snap()['gameplay']['wanted'] == 0 and not snap()['burglary']['alarmed'], 'Walking and two clean searches keep the burglary quiet')
        for point in planned['toExit']:
            walk(point, tolerance=.3, seconds=25)
        check(snap()['career']['cash'] == cash, 'Carried loot remains unbanked at the indoor exit')
        pulse('e')
        escaped = wait(lambda s: s['interiors']['active'] is None and s['career']['cash'] > cash, 'Normal E exits physically and banks the carried receipt')
        reward = escaped['career']['cash'] - cash
        check(400 <= reward <= 1200 and escaped['career'].get('burglaryCooldowns', {}).get(door['id'], 0) > 0, 'Two real caches pay the authoritative bounded reward and cooldown')
        saved = page.evaluate('JSON.parse(localStorage.getItem("capital-drive-career-v1"))')
        check(saved['cash'] == escaped['career']['cash'] and saved.get('burglaryCooldowns', {}).get(door['id'], 0) > 0, 'Exit writer persists reward and cooldown')
        capture('04-native-burglary-exterior-return')
        # Purchase the same actual house through the phone, with no ownership seed.
        phone('properties')
        page.locator('#city-buy-' + door['id']).click()
        owned = wait(lambda s: door['id'] in s['career'].get('ownedProperties', []), 'Actual nearby phone purchase grants the burgled house')
        offer = next(p for p in fixture['properties'] if p['id'] == door['id'])
        check(owned['career']['cash'] == escaped['career']['cash'] - offer['price'], 'Native safehouse purchase pays its real price')
        close()
        pulse('e')
        entered = wait(lambda s: s['interiors']['active'] and s['interiors']['active']['id'] == door['id'], 'Owned house enters through E without another forced lock')
        check(not entered['burglary']['active'], 'Owned house exemption bypasses the burglary challenge')
        for point in planned['toRest']:
            walk(point, tolerance=.3, seconds=25)
        pulse('q')
        wait(lambda s: s['miniGame']['active'] and s['miniGame']['kind'] == 'rest' and s['miniGame']['station']['id'] == planned['rest']['id'] and s['miniGame']['phase'] == 'cue', 'Actual bed Q exposes the fresh rest hold cue')
        rest_cash = snap()['career']['cash']
        keys([])
        focus()
        page.keyboard.down('x')
        try:
            rested = wait(lambda s: s['miniGame']['phase'] == 'complete' and s['gameplay']['health'] == 100, 'Real three-second bed hold heals through the authoritative rest owner', seconds=35, poll=200)
        finally:
            page.keyboard.up('x')
        check(rested['career']['cash'] == rest_cash - 80, 'Successful safehouse rest debits exactly $80 once')
        page.wait_for_timeout(250)
        check(snap()['career']['cash'] == rest_cash - 80, 'Completed rest cannot debit again')
        saved = page.evaluate('JSON.parse(localStorage.getItem("capital-drive-career-v1"))')
        check(saved['cash'] == rest_cash - 80 and saved['protagonists'][fixture['hero']]['health'] == 100, 'Actual writer saves the paid rest and full hero health')
        capture('05-native-owned-safehouse-rest')
        observations.append({'burglaryScope': 'Prior wealth/equipment and an injured exterior checkpoint were explicit setup. Two distinct actual searches carry loot without indoor cash; the physical exit banks once. The same house is bought through the normal phone and its real bed rest pays $80 and heals through the normal writer. No ownership, immunity, cash reward or health grant was injected during play. This is one source house, not all-house or police-evasion proof.'})

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
        built = subprocess.run(['node', str(source / 'scripts/capital-city-browser-fixture.mjs'), ('city' if args.scenario in ('gear','nitro') else args.scenario)], cwd=source, text=True, capture_output=True, timeout=120)
        (output / 'fixture-build.stdout').write_text(built.stdout)
        (output / 'fixture-build.stderr').write_text(built.stderr)
        assert built.returncode == 0, 'Source fixture builder failed; see retained stdout/stderr'
        fixture = json.loads(built.stdout)
        if args.scenario in ('gear','nitro'):
            fixture['career']['cash']=1500
            fixture['career']['protagonists'][fixture['hero']]['actor']={'x':567.32,'z':-634.87,'yaw':0}
            fixture['initialActor']=fixture['career']['protagonists'][fixture['hero']]['actor']
            fixture['provenance']='Explicit unearned $1500 wealth, equipment and source checkpoint setup. Purchases and movement after Start use native input.'
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
            {'city': city, 'workplace': workplace, 'burglary': burglary_case, 'gear': gear, 'nitro': nitro}[args.scenario]()
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
        result = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'scenario': args.scenario, 'previewOnly': args.preview_only,
                  'verificationScope': 'Native entry/rendering preview only; loot, reward, cooldown, repeat and exit untested' if args.preview_only else 'Full selected native scenario', 'checks': checks, 'errors': errors, 'requests': requests, 'external': external, 'observations': observations,
                  'elapsedSeconds': round(time.monotonic() - started, 2), 'budgetSeconds': budget, 'source_sha256': initial_hashes, 'source_sha256_end': final_hashes, 'source_unchanged': initial_hashes == final_hashes,
                  'screenshots': sorted(p.name for p in output.glob('*.png')), 'limitations': ['Prior wealth, equipment, checkpoint and optional Rowan intro prefix are explicit setup, not earned native progress. Property ownership and stash begin empty; the city case requires an actual nearby purchase.', 'Native inputs use actual clock, collision and authoritative writers; no production state setter or private code is used.', 'Workplace source path omits fixture-listed rendered/parked obstacles; actual native traversal must pass to establish this route.', 'Cloud SwiftShader does not establish Intel N100 FPS, GPU memory, or whole-campaign playability.']}
        (output / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
