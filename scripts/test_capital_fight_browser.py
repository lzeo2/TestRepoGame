#!/usr/bin/env python3
"""Bounded native ordinary booth Fight evidence through real game input.

Use an outer watchdog: timeout 180s python3 -B scripts/test_capital_fight_browser.py
 --capture --output <fresh-external-directory>. No installs or state
grants. Free roam map travel establishes presentation, never career completion.
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
BUDGET = 120


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    budget = BUDGET
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    failure, page = None, None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def expired(signum, frame):
        raise TimeoutError(f'Fight browser run exceeded {budget} seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(budget)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
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
            page.wait_for_timeout(60)
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

    def close(dialog):
        page.locator(f'[data-close="{dialog}"]').click()
        page.locator('#'+dialog).wait_for(state='hidden')
        frames()
        focus()

    def ready(context):
        nonlocal page
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base+'/Games/Capital%20Drive/',wait_until='load',timeout=60000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready',timeout=60000)
        check(not snap()['rendering']['compatibility'],'Native ordinary fight context has WebGL')

    def start(mode):
        page.locator(f'[data-game-mode="{mode}"]').click()
        page.locator('#start-button').click()
        page.wait_for_function('(mode)=>capitalDriveSnapshot().started&&capitalDriveSnapshot().gameMode===mode', arg=mode)
        focus()

    def walk(target, tolerance=.5, seconds=40, admitted=None, sprint=False):
        end, last, stalled = time.monotonic()+seconds, None, 0
        while time.monotonic() < end:
            state = snap()
            pose, yaw = state['focus'], state['camera']['footYaw']
            dx, dz = target['x']-pose['x'], target['z']-pose['z']
            distance = math.hypot(dx, dz)
            if (admitted(state) if admitted else distance <= tolerance):
                return
            assert distance > 1e-6, 'Foot target reached without semantic admission'
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
            if sprint and distance > 3:
                held.append('Shift')
            focus()
            for key in held:
                page.keyboard.down(key)
            try:
                page.wait_for_timeout(max(25,min(160,distance*180)) if distance < 2 else 320)
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
        page.mouse.move(x,y)
        page.mouse.down(button='right')
        try:
            page.mouse.move(x+delta/.006,y,steps=8)
        finally:
            page.mouse.up(button='right')
        frames()

    def room(plan, x, z):
        o = plan['origin']; c, s = math.cos(o['yaw']), math.sin(o['yaw'])
        return {'x':o['x']+c*x+s*z,'z':o['z']-s*x+c*z}

    def enter(kind):
        pulse('e')
        state = wait(lambda s:s['interiors']['active'] and s['interiors']['active']['type']==kind, 'Normal E '+kind+' entry')
        check(state['interiorView']['meshes'] > 0, 'Normal E loads '+kind+' room geometry')
        return state['interiors']['active']

    def map_point(x,z):
        page.locator('#map-button').click()
        for _ in range(8):
            if snap()['mapView']['zoom'] <= 1:
                break
            page.locator('#map-zoom-out').click()
        canvas = page.locator('#full-map')
        rect, view = canvas.bounding_box(), snap()['mapView']
        size = canvas.evaluate('e=>({width:e.width,height:e.height})')
        px = ((x-view['x'])*view['scale']+size['width']/2)/size['width']
        pz = ((z-view['z'])*view['scale']+size['height']/2)/size['height']
        assert 0<=px<=1 and 0<=pz<=1, 'Map target outside selectable canvas'
        page.mouse.click(rect['x']+px*rect['width'],rect['y']+pz*rect['height'])
        page.locator('#teleport-button').click()
        wait(lambda s:not s['paused'], 'Normal Free roam map arrival')
        focus()

    def foot():
        if snap()['gameplay']['mode']!='foot':
            pulse('e')
            if snap()['gameplay']['mode']!='foot':
                pulse('e')
            wait(lambda s:s['gameplay']['mode']=='foot', 'Normal E car exit')

    def approach(door):
        map_point(door['x']-math.sin(door['yaw'])*14,door['z']-math.cos(door['yaw'])*14)
        foot()
        car, pose = snap()['player'], snap()['focus']
        dx, dz = door['x']-car['x'], door['z']-car['z']; length=math.hypot(dx,dz)
        if length>3:
            fx,fz=dx/length,dz/length
            side=1 if (pose['x']-car['x'])*fz-(pose['z']-car['z'])*fx>=0 else -1
            walk({'x':car['x']+fx*4.5+fz*side*4.5,'z':car['z']+fz*4.5-fx*side*4.5},tolerance=.8)
        walk(door,tolerance=2.1)

    def guest(state):
        return next(p for p in state['roomPeople'] if p.get('character')=='booth-guest')

    try:
        with ExitStack() as stack:
            playwright=stack.enter_context(sync_playwright())
            browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=30000,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context=browser.new_context(viewport={'width':1280,'height':800})
            stack.callback(context.close)
            try:
                ready(context);start('free')
                initial=record('Free roam start')
                cash=initial['career']['cash'];campaign=initial['campaign']
                page.locator('#map-button').click()
                page.locator('#map-search').fill('Lanzhou 1919')
                page.locator('#map-search-form button[type=submit]').click()
                check('Lambzhou 1919' in page.locator('#search-results button').first.inner_text(),'Actual map search resolves Lambzhou')
                close('map-dialog')
                door=next(site['frontage'] for site in snap()['services'] if site['id']=='store-5656111023')
                approach(door)
                plan=enter('shop')
                check(plan['variant']=='noodles' and guest(snap())['earmuffs'],'Normal E loads the actual pink-earmuff guest')
                walk(room(plan,0,10.6),tolerance=.15)
                def can_talk(state):
                    live=guest(state)
                    return math.hypot(state['focus']['x']-live['x'],state['focus']['z']-live['z'])<=2.1 and 'talk' in page.locator('#interaction-hint').inner_text().lower()
                walk(room(plan,.55,10.6),tolerance=.06,admitted=can_talk,seconds=12)
                check(can_talk(snap()),'Real WASD reaches the clear aisle Talk hint')
                look(guest(snap()))
                baseline=record('Reachable ordinary booth guest')
                serial=baseline['encounter']['serial'];attack=guest(baseline)['attackSerial'];health=baseline['gameplay']['health']
                pulse('e');page.locator('#npc-dialog').wait_for(state='visible')
                fight=page.locator('[data-dialogue-choice="fight"]')
                check(fight.inner_text()=='Fight' and fight.is_enabled(),'Actual ordinary dialogue exposes enabled Fight choice')
                fight.click();frames();focus()
                state=wait(lambda s:guest(s).get('noodleThrow',{} ) and guest(s)['noodleThrow']['phase']=='windup','Actual bowl windup',seconds=10)
                check(state['encounter']['serial']==serial,'Choosing Fight alone grants no completion')
                record('Actual bowl windup')
                state=wait(lambda s:guest(s).get('noodleThrow',{}) and guest(s)['noodleThrow']['phase']=='flight','Actual released noodle trajectory',seconds=10)
                check(state['encounter']['serial']==serial and guest(state)['noodleThrow']['from'] and guest(state)['noodleThrow']['to'],'Actual bowl flight precedes completion')
                record('Actual bowl flight')
                state=wait(lambda s:guest(s)['attackSerial']>attack and s['encounter']['serial']==serial+1,'Actual NPC fist retaliation',seconds=10)
                check(state['encounter']['outcome']=='confrontation','Ordinary fight cannot supply campaign noodle-fight credit')
                before=guest(state)['health'];player_attack=state['gameplay'].get('attackSerial',0)
                look(guest(state));pulse('f')
                state=wait(lambda s:guest(s)['health']<before,'Actual F player hit',seconds=5)
                check(state['gameplay']['attackSerial']>player_attack and guest(state)['health']==before-25,'Actual Gameplay F reduces guest health by 25')
                check(state['gameplay']['health']==health,'Free roam protects player health; no player injury is claimed')
                page.locator('#pause-button').click()
                frozen=record('Actual F hit paused')
                page.wait_for_timeout(350)
                check(snap()['roomPeople']==frozen['roomPeople'] and snap()['encounter']==frozen['encounter'],'Normal Pause freezes the live fight')
                capture('earmuff-fight-after-player-hit')
                check(frozen['career']['cash']==cash and frozen['campaign']==campaign,'Free roam fight grants no career cash or campaign progress')
                check(not errors,'No page or console errors')
                check(not requests,'No failed requests or HTTP errors')
                check(not external,'No external runtime requests')
            except Exception:
                if page and not page.is_closed():
                    try:capture('fight-failure-state')
                    except Exception as error:observations.append({'failureCapture':str(error)})
                raise
    except Exception as error:
        failure=f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0);signal.signal(signal.SIGALRM,prior)
        server.shutdown();server.server_close();thread.join(timeout=2)
        report={'status':'FAIL' if failure else 'PASS','failure':failure,'checks':checks,'errors':errors,'requests':requests,'external':external,'observations':observations,'elapsedSeconds':round(time.monotonic()-started,2),'budgetSeconds':budget,'screenshots':sorted(p.name for p in output.glob('*.png')),'limitations':['Normal Free roam map travel only; no career travel, player injury, lunch reward or campaign completion is claimed.','Software WebGL; no native GPU/N100 performance acceptance.','Screenshots require separate visual review.']}
        (output/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2),flush=True)
    if failure:raise SystemExit(1)


if __name__=='__main__':
    main()
