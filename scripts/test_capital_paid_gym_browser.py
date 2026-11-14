#!/usr/bin/env python3
"""Optional paid Campaign gym walkthrough diagnostic using native inputs.

Use an outer watchdog: timeout 500s python3 -B
scripts/test_capital_paid_gym_browser.py --capture --output <fresh-external-dir>.
Not part of the default runner. Paid native acceptance remains HELD: both prior verified
public-route runs exhausted software-WebGL budgets before gym admission. This
script encodes the intended six-rep and reload checks, not a past PASS claim.

The 480-second soft deadline allows normal cleanup; the required outer watchdog
bounds stalled browser calls as well. Only detached diagnostics are evaluated;
no save fixtures, gameplay setters, clock changes, or teleporting are used.
"""
import argparse
from contextlib import ExitStack
import functools
import http.server
import json
import math
from pathlib import Path
import sys
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUDGET = 480


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    page, failure, walked = None, None, 0.0
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline():
        if time.monotonic()-started > BUDGET:
            raise TimeoutError(f'Paid gym browser exceeded {BUDGET} seconds')

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
            log.write(json.dumps({'label': label, 'elapsedSeconds': round(time.monotonic()-started, 2), 'state': state})+'\n')
        return state

    def capture(name):
        record(name)
        if args.capture:
            page.screenshot(path=str(output / (name+'.png')), timeout=15000)

    def wait(predicate, label, seconds=15):
        end = time.monotonic()+seconds
        while time.monotonic() < end:
            state = snap()
            if predicate(state):
                return state
            assert state['miniGame']['phase'] not in ('failed', 'cancelled'), state['miniGame']
            page.wait_for_timeout(60)
        record(label+' timeout')
        raise AssertionError(label+' timed out')

    def focus():
        page.locator('#world canvas').focus()

    def frames():
        deadline()
        page.evaluate('()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')

    def pulse(key):
        focus()
        page.keyboard.down(key)
        try:
            frames()
        finally:
            page.keyboard.up(key)
        frames()

    def close(dialog):
        page.locator(f'[data-close="{dialog}"]').click()
        page.locator('#'+dialog).wait_for(state='hidden')
        frames()
        focus()

    def walk(target, tolerance=.3, seconds=180, sprint=True):
        nonlocal walked
        end, last, stalled = time.monotonic()+seconds, None, 0
        while time.monotonic() < end:
            state = snap()
            assert state['gameMode']=='campaign' and state['gameplay']['mode']=='foot'
            assert not state['gameplay']['recovery'], 'Unexpected recovery during physical foot route'
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x']-pose['x'], target['z']-pose['z']
            distance = math.hypot(dx, dz)
            movement = math.hypot(pose['x']-last['x'], pose['z']-last['z']) if last else 0
            walked += movement
            if distance <= tolerance:
                record('walk arrived '+str(target))
                return
            stalled = stalled+1 if last and movement < .025 else 0
            if stalled >= 10:
                record('physical route blocked')
                raise AssertionError(f'Physical foot route blocked at {pose}, {distance:.2f}m before {target}; collisions remain enabled')
            last = pose
            desired = math.atan2(-dx,-dz)
            error = (yaw-desired+math.pi) % (2*math.pi)-math.pi
            # Mouse-steer onto the verified chord, rather than approximating it
            # with diagonal WASD directions that can clip a narrow source corner.
            if abs(error) > .025:
                look(target)
            focus()
            held = ['Shift','w'] if sprint and distance > 4 else ['w']
            for key in held:
                page.keyboard.down(key)
            try:
                if distance < .9:
                    # One actual frame is a small ordinary held-input pulse;
                    # it avoids long event latency overshooting a nearby target.
                    page.evaluate('()=>new Promise(r=>requestAnimationFrame(r))')
                else:
                    page.wait_for_timeout(650 if distance > 6 else max(30,min(160,(distance-tolerance)*90)))
            finally:
                for key in held:
                    page.keyboard.up(key)
        raise AssertionError(f'Physical foot route timed out before {target}')

    def room(plan, x, z):
        o = plan['origin']; c, s = math.cos(o['yaw']), math.sin(o['yaw'])
        return {'x': o['x']+c*x+s*z, 'z': o['z']-s*x+c*z}

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

    def start():
        page.locator('[data-game-mode="campaign"]').click()
        page.locator('#start-button').click()
        wait(lambda s:s['started'] and s['gameMode']=='campaign' and s['gameplay']['mode']=='foot', 'Campaign on-foot start')
        close('campaign-dialog')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, timeout=30000,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width':640, 'height':480})
            stack.callback(context.close)
            page = context.new_page()
            def capture_failure():
                if sys.exc_info()[0] and not issubclass(sys.exc_info()[0], TimeoutError) and not page.is_closed():
                    try:
                        capture('paid-gym-failure-state')
                    except Exception as error:
                        observations.append({'failureCapture':str(error)})
            stack.callback(capture_failure)
            page.set_default_timeout(12000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type=='error' else None)
            page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
            page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status>=400 else None)
            page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http','https') and urlsplit(request.url).netloc!=urlsplit(base).netloc else None)
            page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http','https') or urlsplit(route.request.url).netloc==urlsplit(base).netloc else route.abort())
            page.goto(base+'/Games/Capital%20Drive/', wait_until='load', timeout=60000)
            page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
            check(not snap()['rendering']['compatibility'], 'Fresh context renders native WebGL')
            page.locator('[data-game-mode="campaign"]').click()
            page.locator('#intro-characters [data-character="basement"]').click()
            start()
            initial = record('fresh Milo Campaign')
            check(initial['campaign']['character']=='basement' and initial['career']['cash']==1000 and initial['career']['fitnessLevel']==0,
                  'Fresh Milo starts with default $1000 and fitness zero')
            check(not initial['campaign']['active'] and not initial['campaign']['completed'], 'Briefing closes without starting or completing a mission')
            capture('milo-kingston-start')
            door = initial['gymEntry']
            check(door['serviceId']=='kingston-gym', 'Destination is the original Kingston gym')
            # M104 swept this exact .45m-radius detour against the unchanged
            # source buildings in .2m steps, on public-road/adjacent corridors.
            # Retain the small southern Highgate corner waypoints individually.
            street_route = [(376,-220), (368,-226), (364,-238), (390,-274),
                            (432,-294), (434,-294), (436,-292), (476,-206),
                            (466,-174), (420,-110), (420,-108), (588,26)]
            outside = {'x':door['x']-math.sin(door['yaw'])*2, 'z':door['z']-math.cos(door['yaw'])*2}
            observations.append({'route':'M104 verified southern Highgate loop → Jardine → Eyre → Kennedy',
                                 'waypoints':street_route, 'door':door, 'exteriorEntryPose':outside})
            for x,z in street_route:
                walk({'x':x,'z':z}, tolerance=.3)
            walk(outside, tolerance=.3)
            look(door)
            capture('kingston-gym-physical-arrival')
            check(walked>300 and snap()['career']['cash']==1000, 'More than 300m of actual foot travel reaches gym with cash unchanged')
            pulse('e')
            entered = wait(lambda s:s['interiors']['active'] and s['interiors']['active']['serviceId']=='kingston-gym', 'Normal E Kingston gym entry')
            plan = entered['interiors']['active']
            check(entered['interiorView']['meshes']>0, 'Normal entry creates visible gym room geometry')
            station = next(st for st in plan['activities'] if st['kind']=='bench')
            approach = {'x':plan['exercise']['approachX'], 'z':plan['exercise']['approachZ']}
            check(math.hypot(approach['x']-station['x'],approach['z']-station['z'])<.01, 'Bench exposes its actual reachable approach descriptor')
            walk(room(plan,0,7.1), tolerance=.35, sprint=False)
            walk(approach, tolerance=.3, sprint=False)
            look(plan['exercise'])
            capture('bench-native-approach')
            pulse('e')
            admitted = wait(lambda s:s['miniGame']['active'] and s['miniGame']['kind']=='bench', 'Normal E paid bench admission')
            check(admitted['activity']['type']=='workout' and admitted['activity']['cost']==120 and admitted['career']['cash']==1000,
                  'Actual bench admits a paid $120 workout without charging early')
            capture('bench-activity-grip-cue')
            page.keyboard.down('x'); page.keyboard.down('y')
            try:
                for rep in range(1,7):
                    wait(lambda s:s['miniGame']['phase']=='cue', 'Actual LIFT cue '+str(rep), seconds=12)
                    pulse('ArrowUp')
                    wait(lambda s:s['miniGame']['reps']==rep, 'Actual controlled repetition '+str(rep), seconds=4)
                completed = wait(lambda s:s['miniGame']['phase']=='complete' and s['career']['fitnessLevel']==1, 'Completion event applies paid fitness', seconds=5)
            finally:
                page.keyboard.up('x'); page.keyboard.up('y')
            check(completed['miniGame']['reps']==6 and completed['miniGame']['mistakes']==0 and not completed['miniGame']['active'],
                  'Six real timed repetitions complete with zero mistakes')
            check(completed['career']['cash']==880 and completed['career']['fitnessLevel']==1 and completed['activity'] is None,
                  'Completion event charges exactly $120 and grants exactly one fitness level')
            capture('paid-bench-completion-receipt')
            page.wait_for_timeout(2200)
            check(snap()['career']['cash']==880 and snap()['career']['fitnessLevel']==1, 'Completed set cannot charge or award twice')
            page.locator('#services-button').click()
            page.locator('#services-filter').select_option('gym')
            check('Fitness 1/3' in page.locator('#services-list').inner_text(), 'Visible gym receipt panel reports fitness one')
            capture('paid-gym-fitness-receipt-panel')
            close('services-dialog')
            page.reload(wait_until='load', timeout=60000)
            page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
            restored = record('saved character and paid progress reloaded')
            check(restored['campaign']['character']=='basement' and restored['career']['cash']==880 and restored['career']['fitnessLevel']==1,
                  'Reload restores saved Milo, $880 and fitness one without state grants')
            start()
            page.wait_for_timeout(1500)
            restored = record('restarted saved Milo')
            check(restored['campaign']['character']=='basement' and restored['career']['cash']==880 and restored['career']['fitnessLevel']==1 and restored['activity'] is None,
                  'Normal saved-character restart preserves progress without duplicate charge')
            capture('reloaded-milo-paid-progress')
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests')
    except (Exception, KeyboardInterrupt) as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=2)
        report = {'status':'FAIL' if failure else 'PASS', 'diagnostic':'optional-paid-gym-walkthrough',
                  'failure':failure, 'checks':checks,
                  'errors':errors, 'requests':requests, 'external':external, 'observations':observations,
                  'actualWalkedMetres':round(walked,2), 'elapsedSeconds':round(time.monotonic()-started,2), 'budgetSeconds':BUDGET,
                  'screenshots':sorted(path.name for path in output.glob('*.png')),
                  'limitations':['Software WebGL at 640×480; hardware performance is unmeasured.',
                                 'Targets one original Kingston gym paid bench set; completion is accepted only on PASS.']}
        (output/'results.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2),flush=True)
    if failure:
        raise SystemExit(1)


if __name__=='__main__':
    main()
