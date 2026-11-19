#!/usr/bin/env python3
"""Native courier QA with explicit, unearned initial wealth and foot checkpoints.

Run under an outer watchdog. Only initial browser storage is arranged; ordering,
cancellation, walking and E handover use real UI/input and the ordinary clock.
No snapshot mutation, private codes, Free-roam travel or earned-wealth claim.
"""
import argparse
from contextlib import ExitStack
import functools
import hashlib
import http.server
import json
import math
from pathlib import Path
import re
import signal
import subprocess
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
# Source-domain checkpoints from the two-order actual-source diagnostic. A fresh
# --fixture-report may replace them; these are setup, never evidence of walking.
FIXTURES = {
    'food': {'sourceId': 'store-4069717184', 'itemId': 'food', 'name': 'Belloucies',
             'checkpoint': {'x': -381.5437857694898, 'z': 284.0283893894465, 'yaw': .9241980350432283}},
    'arms': {'sourceId': 'dealer-barton', 'itemId': 'pistol', 'name': 'Morrow Vale',
             'checkpoint': {'x': -320.28860749683247, 'z': -1073.5079436416288, 'yaw': -.13565201479281683}},
}
FIXTURE_BUILDER = r"""
import {readFile} from 'node:fs/promises';
import {createProgression} from './Games/Capital Drive/progression.js';
import {createProtagonistState} from './Games/Capital Drive/protagonist-state.js';
import {WEAPON_IDS} from './Games/Capital Drive/weapons.js';
const map=JSON.parse(await readFile('./Games/Capital Drive/data/canberra.json','utf8'));
const actor=JSON.parse(process.argv[1]),progression=createProgression(map);
progression.state.cash=100000;
const ammunition=Object.fromEntries(WEAPON_IDS.map(id=>[id,{ammo:0,reserveAmmo:0}]));
const protagonists={version:1,student:{mode:'foot',actor,health:60,weapon:'unarmed',ammunition,
  vehicle:{x:map.spawn.x,z:map.spawn.z,yaw:map.spawn.yaw||0,modelId:'lantern',color:'#e7e6df',health:100,stolen:false}},corporate:null,basement:null};
createProtagonistState(protagonists,{bounds:map.bounds});
const career={...progression.serialize(),campaign:{version:2,character:'student',intros:{student:[],corporate:[],basement:[]},meeting:false,legacy:false,completed:[]},protagonists};
console.log(JSON.stringify(career));
"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenario', choices=['food', 'arms', 'all'], default='all')
    parser.add_argument('--fixture-report', type=Path, help='Optional JSON from test_capital_delivery_actual.mjs')
    parser.add_argument('--capture', action='store_true')
    args = parser.parse_args()
    source, output = args.root.resolve(), args.output.resolve()
    if any(output == p or p in output.parents for p in (ROOT, source)):
        parser.error('--output must be external to source and repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    fixtures = json.loads(json.dumps(FIXTURES))
    if args.fixture_report:
        report = json.loads(args.fixture_report.read_text())
        for order in report['orders']:
            kind = order['kind']
            if kind in fixtures:
                fixtures[kind] = {'sourceId': order['source']['id'], 'itemId': order['quote']['itemId'],
                                  'name': order['source']['name'], 'checkpoint': order['checkpoint']}
    (output / 'checkpoint-fixtures.json').write_text(json.dumps(fixtures, indent=2) + '\n')
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    failure = None
    server = thread = context = page = None
    held = set()

    def hashes():
        game = source / 'Games/Capital Drive'
        paths = [*game.glob('*.js'), *game.glob('data/*.json'), game / 'index.html', game / 'style.css',
                 source / 'scripts/test_capital_delivery_browser.py', source / 'scripts/test_capital_delivery_actual.mjs',
                 source / 'scripts/capital-city-browser-fixture.mjs', source / 'scripts/capital-campaign-fixture.mjs']
        return {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}

    initial_hashes = hashes()

    def deadline(_signum, _frame):
        raise TimeoutError('Native courier browser budget exceeded 600 seconds')

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        return page.evaluate('capitalDriveSnapshot()')

    def record(label):
        state = snap()
        with (output / 'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'elapsedSeconds': time.monotonic() - started, 'state': state, 'hudCash': cash()}) + '\n')
        return state

    def cash():
        return int(re.sub(r'[^0-9]', '', page.locator('#cash-value').inner_text()))

    def saved():
        return page.evaluate('JSON.parse(localStorage.getItem("capital-drive-career-v1"))')

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

    def pulse(key):
        focus()
        page.keyboard.down(key)
        try:
            page.wait_for_timeout(80)
        finally:
            page.keyboard.up(key)

    def wait(predicate, label, seconds=20):
        end = time.monotonic() + seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return record(label)
            page.wait_for_timeout(250)
        record(label + ' timed out')
        raise AssertionError(label + ' timed out')

    def close():
        while page.locator('dialog[open]').count():
            page.keyboard.press('Escape')
            page.wait_for_timeout(100)
        wait(lambda s: not s['paused'], 'Actual dialog close resumes world')
        focus()

    def phone():
        if page.locator('dialog[open]').count():
            close()
        page.locator('#phone-button').click()
        page.locator('#city-deliveries-open').click()
        page.locator('#city-dialog').wait_for(state='visible')
        check(snap()['paused'], 'Delivery phone pauses the single clock')

    def capture(label):
        record(label)
        if args.capture:
            page.screenshot(path=str(output / (label + '.png')), timeout=15000)

    def walk(target, tolerance=.7, seconds=35):
        end, previous, stalled = time.monotonic() + seconds, None, 0
        try:
            while time.monotonic() < end:
                state = snap()
                assert not state['paused'] and state['gameplay']['mode'] == 'foot' and not state['gameplay']['recovery'], 'Native handover walking must remain live, outside and on foot'
                pose, yaw = state['focus'], state['camera']['footYaw']
                dx, dz = target['x'] - pose['x'], target['z'] - pose['z']
                gap = math.hypot(dx, dz)
                if gap <= tolerance:
                    return record('Native foot handover approach reached')
                stalled = stalled + 1 if previous and math.hypot(pose['x'] - previous['x'], pose['z'] - previous['z']) < .025 else 0
                assert stalled < 14, 'Actual foot collision blocked handover; no teleport fallback'
                previous = pose
                forward = (-math.sin(yaw) * dx - math.cos(yaw) * dz) / gap
                lateral = (math.cos(yaw) * dx - math.sin(yaw) * dz) / gap
                wanted = []
                if abs(forward) > .3:
                    wanted.append('w' if forward > 0 else 's')
                if abs(lateral) > .3:
                    wanted.append('d' if lateral > 0 else 'a')
                keys(wanted)
                page.wait_for_timeout(100 if gap < 2 else 200)
            raise AssertionError('Native foot handover approach timed out')
        finally:
            keys([])

    def start():
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=90000)
        check(not snap()['rendering']['compatibility'], 'Software WebGL boots')
        page.locator('[data-game-mode=campaign]').click()
        page.locator('#intro-characters [data-character=student]').click()
        page.locator('#guided-tutorial').uncheck()
        page.locator('#start-button').click()
        wait(lambda s: s['started'] and s['gameMode'] == 'campaign', 'Normal Campaign start resumes initial checkpoint')
        page.locator('#campaign-dialog').wait_for(state='visible')
        close()
        check(snap()['campaign']['active'] is None, 'Briefing closes without a mission')

    def case(kind, fixture):
        baseline = record(kind + ' explicit initial save fixture')
        check(baseline['career']['cash'] == 100000 and baseline['gameplay']['health'] == 60 and baseline['gameplay']['weapon'] == 'unarmed', 'Unearned initial $100000, health60 and unarmed fixture accepted')
        check(math.hypot(baseline['focus']['x'] - fixture['checkpoint']['x'], baseline['focus']['z'] - fixture['checkpoint']['z']) < 1, 'Actual save reader restores the checked customer foot checkpoint')
        check(not baseline['career']['equipment'].get('pistol'), 'Initial pistol ownership is absent')
        button_id = '#city-delivery-' + fixture['sourceId'] + '-' + fixture['itemId']
        phone()
        order_button = page.locator(button_id)
        check(order_button.is_enabled(), 'Real source item has an available phone quote')
        price = re.search(r'\$([\d,]+)', order_button.inner_text())
        assert price, 'Real phone must show the full paid delivery price'
        cost = int(price.group(1).replace(',', ''))
        capture(kind + '-phone')
        order_button.click()
        first = wait(lambda s: s['deliveries']['phase'] == 'approaching' and not s['paused'], 'Native order dispatches physical courier')
        wait(lambda s: cash() == 100000 - cost, 'Actual HUD reflects exactly one reserved quote')
        check(first['gameplay']['health'] == 60, 'Booking grants no premature heal')
        check(saved()['cash'] == 100000, 'Pending transient order remains fully refundable in the persisted career')
        check(not first['career']['equipment'].get('pistol'), 'Booking grants no premature weapon')
        phone()
        page.locator('#city-delivery-cancel').click()
        cancelled = wait(lambda s: cash() == 100000, kind + ' actual phone cancellation refund')
        check(cancelled['deliveries']['phase'] == 'cancelled' and cancelled['career']['cash'] == 100000, 'Native cancellation refunds the complete delivery quote once')
        check(saved()['cash'] == 100000, 'Cancellation writer retains refunded cash')
        close()
        wait(lambda s: not s['deliveries']['car']['active'], 'Cancelled physical van releases after actual clock time', 40)
        phone()
        page.locator(button_id).click()
        dispatched = wait(lambda s: s['deliveries']['phase'] == 'approaching' and not s['paused'], 'Second native order dispatches')
        order_id = dispatched['deliveries']['order']['orderId']
        check(order_id != first['deliveries']['order']['orderId'], 'New order has a distinct receipt identity')
        initial_car = dispatched['deliveries']['car']
        dropoff = dispatched['deliveries']['dropoff']
        check(math.hypot(initial_car['x'] - dropoff['x'], initial_car['z'] - dropoff['z']) >= 30, 'Courier starts at source road away from customer')
        end, previous, travelled = time.monotonic() + 240, dispatched, 0
        while time.monotonic() < end:
            state = snap()
            courier = state['deliveries']
            assert courier['phase'] not in ('failed', 'cancelled'), 'Physical courier interrupted: ' + courier.get('reason', '')
            check_pose = state['focus']
            assert math.hypot(check_pose['x'] - baseline['focus']['x'], check_pose['z'] - baseline['focus']['z']) < 1, 'Waiting never moves the player'
            a, b = previous['deliveries']['car'], courier['car']
            travelled += math.hypot(a['x'] - b['x'], a['z'] - b['z'])
            if courier['phase'] == 'waiting':
                break
            previous = state
            page.wait_for_timeout(500)
        else:
            record(kind + ' courier driving timeout')
            raise AssertionError('Physical courier did not reach its road stop within240 wall seconds')
        arrived = record(kind + ' physical van stopped')
        check(travelled > 30 and arrived['deliveries']['car']['speed'] <= .05, 'Observed courier travels and actually stops')
        check(cash() == 100000 - cost and arrived['gameplay']['health'] == 60 and not arrived['career']['equipment'].get('pistol'), 'Arrival keeps one reserved debit and never grants heal or weapon')
        capture(kind + '-arrived')
        car, player = arrived['deliveries']['car'], arrived['focus']
        # Approach the near side of the actual live van, retaining real collision.
        side = 1 if (player['x'] - car['x']) * math.cos(car['yaw']) - (player['z'] - car['z']) * math.sin(car['yaw']) >= 0 else -1
        target = {'x': car['x'] + math.cos(car['yaw']) * 2.8 * side, 'z': car['z'] - math.sin(car['yaw']) * 2.8 * side}
        walk(target)
        pulse('e')
        completed = wait(lambda s: s['deliveries']['phase'] == 'completed', 'Native E performs actual local courier handover')
        wait(lambda s: cash() == 100000 - cost, 'Handover HUD retains exactly one debit')
        check(completed['career']['cash'] == 100000 - cost, 'Handover commits exactly one debit to career serialization')
        stored = saved()
        check(stored['cash'] == completed['career']['cash'], 'Normal writer persists the final delivery cash')
        if kind == 'food':
            source_site = next(s for s in completed['services'] if s['id'] == fixture['sourceId'])
            expected_health = min(100, 60 + source_site['heal'])
            check(completed['gameplay']['health'] == expected_health and stored['protagonists']['student']['health'] == expected_health, 'Actual meal handover heals and saves the real source meal amount')
        else:
            check(completed['career']['equipment'].get(fixture['itemId']) and stored['equipment'].get(fixture['itemId']), 'Actual arms handover grants and saves purchased ownership')
            check(completed['gameplay']['weapon'] == fixture['itemId'], 'Actual gameplay equips the delivered weapon')
            check(sum(stored['protagonists']['student']['ammunition'][fixture['itemId']].values()) > 0, 'Actual writer saves the delivered starter ammunition')
        before_cash, before_health = completed['career']['cash'], completed['gameplay']['health']
        pulse('e')
        after = record(kind + ' repeated E cannot replay delivery')
        check(after['career']['cash'] == before_cash and after['gameplay']['health'] == before_health, 'Repeated E cannot debit or heal twice')
        capture(kind + '-completed')
        page.reload(wait_until='load')
        start()
        resumed = record(kind + ' saved delivery resumes')
        check(resumed['career']['cash'] == before_cash and resumed['gameplay']['health'] == before_health, 'Reload retains the authoritative completed delivery effects')
        if kind == 'arms':
            check(resumed['career']['equipment'].get(fixture['itemId']), 'Reload retains purchased arms ownership')
        check(resumed['deliveries']['phase'] == 'idle', 'Transient courier is not replayed after reload')

    try:
        signal.signal(signal.SIGALRM, deadline)
        signal.alarm(600)
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(source)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            for kind in (['food', 'arms'] if args.scenario == 'all' else [args.scenario]):
                fixture = fixtures[kind]
                built = subprocess.run(['node', '--input-type=module', '-e', FIXTURE_BUILDER, json.dumps(fixture['checkpoint'])], cwd=source, text=True, capture_output=True, timeout=30)
                (output / (kind + '-fixture.stdout')).write_text(built.stdout)
                (output / (kind + '-fixture.stderr')).write_text(built.stderr)
                assert built.returncode == 0, 'Initial ordinary save fixture builder failed'
                career = json.loads(built.stdout)
                context = browser.new_context(viewport={'width': 960, 'height': 640})
                try:
                    seed = json.dumps(json.dumps(career))
                    context.add_init_script('if(!sessionStorage.getItem("courier-fixture-installed")){localStorage.setItem("capital-drive-career-v1",' + seed + ');sessionStorage.setItem("courier-fixture-installed","1");}localStorage.setItem("capital-drive-rendering-v1","performance");')
                    page = context.new_page()
                    page.set_default_timeout(15000)
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                    page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
                    page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
                    page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
                    page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
                    page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=45000)
                    start()
                    case(kind, fixture)
                except Exception:
                    if page is not None:
                        try:
                            keys([])
                            capture(kind + '-failure')
                        except Exception as capture_error:
                            observations.append({'failureCapture': str(capture_error)})
                    raise
                finally:
                    context.close()
                    context = page = None
            check(not errors, 'No browser page or console errors')
            check(not requests, 'No failed local runtime requests')
            check(not external, 'No external runtime requests')
            check(hashes() == initial_hashes, 'Source hashes remain unchanged through native QA')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0)
        if server:
            server.shutdown()
            server.server_close()
        if thread:
            thread.join(timeout=2)
        result = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'scenario': args.scenario,
                  'checks': checks, 'errors': errors, 'requests': requests, 'external': external, 'observations': observations,
                  'source_sha256': initial_hashes, 'source_sha256_end': hashes(), 'elapsedSeconds': time.monotonic() - started,
                  'screenshots': sorted(p.name for p in output.glob('*.png')),
                  'limitations': ['Initial $100000, health60, zero ammunition, unarmed actor and customer foot checkpoints are unearned setup, not native progression.', 'All later delivery actions use real phone buttons, WASD, E, ordinary collision and the sole world clock. No game setters, clock acceleration, dev codes or map teleport.', 'Only selected source routes and local walking are exercised; traffic, police or blocked roads may legitimately interrupt and fail the scenario.', 'Cloud software WebGL does not establish Intel N100 FPS, GPU acceptance or touch travel.']}
        (output / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
