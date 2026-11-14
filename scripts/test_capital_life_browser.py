#!/usr/bin/env python3
"""Bounded native character, PowerPunt, noodle encounter and gym evidence.

Use an outer watchdog: timeout 600s python3 -B scripts/test_capital_life_browser.py
--scenario all --capture --output <fresh-external-directory>. No installs or state
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
import sys
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUDGET = 560


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scenario', choices=['campaign', 'restaurant', 'gym', 'scenery', 'all'], default='all')
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
    failure, page = None, None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def expired(signum, frame):
        raise TimeoutError(f'Life browser run exceeded {BUDGET} seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(BUDGET)

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
        page.goto(base+'/Games/Capital%20Drive/', wait_until='load', timeout=60000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
        check(not snap()['rendering']['compatibility'], 'Native '+args.scenario+' context has WebGL')

    def start(mode):
        page.locator(f'[data-game-mode="{mode}"]').click()
        page.locator('#start-button').click()
        page.wait_for_function('(mode)=>capitalDriveSnapshot().started&&capitalDriveSnapshot().gameMode===mode', arg=mode)
        focus()

    def walk(target, tolerance=.5, seconds=40, admitted=None):
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

    def local(plan, pose):
        o = plan['origin']; dx, dz = pose['x']-o['x'], pose['z']-o['z']
        return {'x':math.cos(o['yaw'])*dx-math.sin(o['yaw'])*dz, 'z':math.sin(o['yaw'])*dx+math.cos(o['yaw'])*dz}

    def enter(kind):
        pulse('e')
        state = wait(lambda s:s['interiors']['active'] and s['interiors']['active']['type']==kind, 'Normal E '+kind+' entry')
        check(state['interiorView']['meshes'] > 0, 'Normal E loads '+kind+' room geometry')
        return state['interiors']['active']

    def leave(plan):
        walk(room(plan,0,3),tolerance=.4)
        walk(plan['exit'],tolerance=1)
        pulse('e')
        wait(lambda s:s['interiors']['active'] is None, 'Normal E room exit')
        check(snap()['interiorView']['meshes']==0, 'Normal exit disposes the active room')

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

    def finish_context(context, label):
        if sys.exc_info()[0] and page and not page.is_closed():
            try:
                capture(label+'-failure-state')
            except Exception as error:
                observations.append({'failureCapture':str(error)})
        context.close()

    def campaign_case(browser):
        missions, appearances = [], []
        for hero in ('student','basement','corporate'):
            context = browser.new_context(viewport={'width':1280,'height':800})
            try:
                ready(context)
                page.locator('[data-game-mode="campaign"]').click()
                choices = page.locator('#intro-characters [data-character]')
                check(choices.count()==3 and all(choices.nth(i).is_visible() and choices.nth(i).is_enabled() for i in range(3)), 'Fresh campaign exposes three enabled character choices: '+hero)
                page.locator(f'#intro-characters [data-character="{hero}"]').click()
                page.locator('#start-button').click()
                wait(lambda s:s['started'] and s['gameMode']=='campaign' and s['gameplay']['mode']=='foot' and s['actors']['playerVisible'], hero+' native start')
                state=record(hero+' initial campaign')
                check(state['gameplay']['mode']=='foot' and state['actors']['playerVisible'], hero+' starts as a visible on-foot adult')
                check(state['campaign']['character']==hero and not any(state['campaign']['intros'].values()) and not state['campaign']['completed'], hero+' start awards no mission completion')
                missions.append(state['campaign']['next']); appearances.append(state['playerAppearance'])
                capture(hero+'-opening')
                if hero!='corporate':
                    continue
                page.locator('#campaign-start').click(); frames(); focus()
                check(snap()['campaign']['active']['id']==missions[-1], 'Corporate mission begins through the visible campaign button')
                before=snap()['presentation']['serial']
                door=snap()['interiors']['publicEntries'][0]
                walk(door,tolerance=1.5)
                plan=enter('mall')
                station=next(st for st in plan['activities'] if st['kind']=='presentation')
                pos=local(plan,station); unit=next(r for r in plan['rooms'] if r.get('id')=='unit-west-1'); gap=local(plan,unit)
                walk(room(plan,0,gap['z']),tolerance=.4)
                walk(room(plan,-6,gap['z']),tolerance=.4)
                walk(room(plan,-6,pos['z']),tolerance=.3)
                walk(station,tolerance=.35)
                pulse('q'); wait(lambda s:s['miniGame']['active'] and s['miniGame']['kind']=='presentation','PowerPunt admission')
                for index,key in enumerate(('x','y','x'),1):
                    pulse(key)
                    wait(lambda s:s['miniGame']['index']==index,'PowerPunt edit '+str(index))
                state=wait(lambda s:s['presentation']['serial']>before and s['presentation']['outcome']=='outage','Actual PowerPunt outage')
                check(state['campaign']['active']['stage']==1, 'Actual PowerPunt outage advances to the outside goal')
                capture('corporate-powerpunt-outage')
                # Walk through the same open unit gap before returning down the hall.
                walk(room(plan,-6,pos['z']),tolerance=.3)
                walk(room(plan,-6,gap['z']),tolerance=.4)
                walk(room(plan,0,gap['z']),tolerance=.4)
                leave(plan)
                wait(lambda s:'corporate-present-tense' in s['campaign']['intros']['corporate'],'Corporate introduction reward',seconds=15)
                completed=record('corporate actual first mission complete')
                check(completed['career']['cash']==1100 and completed['campaign']['next']=='corporate-lunch-breakpoint','Only the completed corporate mission pays its actual $100 reward')
                page.reload(wait_until='load'); page.wait_for_function('window.capitalDriveSnapshot?.().ready',timeout=60000)
                page.locator('[data-game-mode="campaign"]').click();page.locator('#start-button').click()
                wait(lambda s:s['started'] and s['gameMode']=='campaign','Restored corporate start')
                restored=snap()
                check(restored['campaign']['character']=='corporate' and restored['campaign']['intros']['corporate']==['corporate-present-tense'] and restored['playerAppearance']==appearances[-1], 'Reload preserves corporate appearance and actually earned progress')
            finally:
                finish_context(context,hero)
        check(len(set(missions))==3 and len(set(appearances))==3,'Three campaign heroes have distinct initial missions and appearances')

    def restaurant_case(browser):
        context=browser.new_context(viewport={'width':1280,'height':800})
        try:
            ready(context); start('free')
            page.locator('#map-button').click(); page.locator('#map-search').fill('Lanzhou 1919'); page.locator('#map-search-form button[type=submit]').click()
            result=page.locator('#search-results button').first
            check('Lambzhou 1919' in result.inner_text(),'Actual map search resolves Lambzhou')
            close('map-dialog')
            door=next(site['frontage'] for site in snap()['services'] if site['id']=='store-5656111023')
            map_point(door['x']-math.sin(door['yaw'])*14,door['z']-math.cos(door['yaw'])*14); foot(); look(door)
            state=record('restaurant window cook exterior')
            check(state['noodleShop']['cookVisible'] and state['noodleShop']['sharedCookModel'] and state['noodleShop']['drawCalls']<=5,'Actual exterior exposes the shared-model window cook within five draws')
            capture('lambzhou-window-cook')
            approach(door)
            for choice in ('apologise','confront'):
                plan=enter('shop')
                guest=next(person for person in snap()['roomPeople'] if person.get('character')=='booth-guest')
                check(guest['earmuffs'],'Booth guest has the actual pink-earmuff character descriptor')
                # Talk across the low dining table from the clear central aisle.
                # The live stool blocks a lateral route through the dining seats.
                guest_local=local(plan,guest)
                walk(room(plan,0,guest_local['z']),tolerance=.3)
                def can_talk(state):
                    live=next(person for person in state['roomPeople'] if person['id']==guest['id'])
                    return math.hypot(state['focus']['x']-live['x'],state['focus']['z']-live['z'])<=2.1 and 'talk' in page.locator('#interaction-hint').inner_text().lower()
                walk(room(plan,.7,guest_local['z']),admitted=can_talk)
                check(can_talk(snap()),'Actual booth reach and visible Talk hint admit the conversation')
                look(guest)
                serial=snap()['encounter']['serial']; health=snap()['gameplay']['health']
                pulse('e'); page.locator('#npc-dialog').wait_for(state='visible')
                check(page.locator('[data-dialogue-choice]').count()==2,'Native E opens the two-choice booth conversation')
                page.set_viewport_size({'width':390,'height':844})
                check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'390px conversation has no horizontal overflow')
                for selector in ('[data-dialogue-choice="apologise"]','[data-dialogue-choice="confront"]'):
                    box=page.locator(selector).bounding_box(); check(box['width']>=44 and box['height']>=44,'Conversation choice retains 44px target: '+selector)
                capture('booth-'+choice+'-dialogue-390')
                page.locator('[data-dialogue-choice="'+choice+'"]').click(); frames(); focus(); page.set_viewport_size({'width':1280,'height':800})
                outcome='peaceful' if choice=='apologise' else 'confrontation'
                state=wait(lambda s:s['encounter']['serial']>serial and s['encounter']['phase']=='complete' and s['encounter']['outcome']==outcome,'Actual booth '+outcome,seconds=12)
                check(state['gameplay']['health']==health,'Free roam '+choice+' preserves sandbox health')
                if choice=='confront':
                    page.locator('#pause-button').click()
                    frozen=record('actual booth punch paused')
                    attacker=next(person for person in frozen['roomPeople'] if person['id']==guest['id'])
                    check(attacker['attackSerial']>0 and attacker['attackTimer']>0,'Actual retaliation supplies a live punch animation timer')
                    page.wait_for_timeout(700)
                    paused=snap();still=next(person for person in paused['roomPeople'] if person['id']==guest['id'])
                    check(paused['gameplay']['health']==frozen['gameplay']['health'] and paused['encounter']==frozen['encounter'] and still['attackTimer']==attacker['attackTimer'],'Normal Pause freezes booth punch, health and encounter serial')
                    capture('booth-punch-paused')
                    close('pause-dialog')
                capture('booth-'+outcome)
                walk(room(plan,0,10.6),tolerance=.3); leave(plan)
            check(snap()['career']['cash']==1000,'Free roam restaurant encounters cannot grant career cash')
        finally:
            finish_context(context,'restaurant')

    def gym_case(browser):
        context=browser.new_context(viewport={'width':1280,'height':800})
        try:
            ready(context); start('free'); approach(snap()['gymEntry']); plan=enter('gym')
            kinds=('bench','treadmill','rower','curls')
            check(set(kinds)<={station['kind'] for station in plan['activities']},'Actual gym offers four distinct playable machines')
            for kind in kinds:
                station=next(st for st in plan['activities'] if st['kind']==kind); pos=local(plan,station)
                walk(room(plan,0,pos['z']),tolerance=.4); walk(station,tolerance=.35)
                equipment_kind={'bench':'exercise-bench','curls':'curl-rack'}.get(kind,kind)
                look(next(item for item in plan['furniture'] if item['kind']==equipment_kind))
                pulse('q'); wait(lambda s:s['miniGame']['active'] and s['miniGame']['kind']==kind,'Normal Q '+kind+' admission')
                if kind=='bench':
                    # GRIP waits for held keys, so this native participant frame
                    # cannot consume a short movement-response window.
                    capture('gym-bench-admitted')
                    page.keyboard.down('x'); page.keyboard.down('y')
                    try:
                        for rep in range(1,7):
                            wait(lambda s:s['miniGame']['phase']=='cue','Bench lift cue')
                            pulse('ArrowUp'); wait(lambda s:s['miniGame']['reps']==rep,'Bench repetition '+str(rep))
                        wait(lambda s:s['miniGame']['phase']=='complete','Completed bench set')
                    finally:
                        page.keyboard.up('x'); page.keyboard.up('y')
                else:
                    end=time.monotonic()+55; held=[]
                    try:
                        while time.monotonic()<end:
                            mini=snap()['miniGame']
                            if mini['phase']=='complete':
                                break
                            assert mini['phase'] not in ('failed','cancelled'),mini
                            if mini['phase']=='cue' and not held:
                                held=['x','y'] if kind=='rower' else [mini['expectedKey']]
                                for key in held: page.keyboard.down(key)
                            elif mini['phase']=='release':
                                for key in held: page.keyboard.up(key)
                                held=[]
                            page.wait_for_timeout(45)
                        else: raise AssertionError(kind+' timed out')
                    finally:
                        for key in held: page.keyboard.up(key)
                mini=record(kind+' actual completed set')['miniGame']
                check(mini['phase']=='complete' and mini['mistakes']==0 and mini['reps']==(12 if kind=='treadmill' else 6),'Normal timed input completes '+kind+' without mistakes')
                capture('gym-'+kind+'-complete')
                page.locator('#activity-done').click();frames();focus()
                check(snap()['miniGame']['kind'] is None,'Normal Done clears the completed '+kind+' result')
            # Return to the central aisle before passing the bench and rack.
            walk(room(plan,0,pos['z']),tolerance=.4)
            leave(plan)
            check(not snap()['roomPeople'] and snap()['miniGame']['kind'] is None,'Gym exit clears people and activity resources')
        finally:
            finish_context(context,'gym')

    def scenery_case(browser):
        context=browser.new_context(viewport={'width':1280,'height':800})
        try:
            ready(context); start('free')
            state=record('source street and wildlife descriptors')
            check(state['streetAssets']['sourceStops']>0 and state['wildlife']['animals'],'Source bus stops and bounded wildlife descriptors load')
            gate=next(gate for gate in state['campusGates'] if gate['id']=='telopea-gate-11')
            dx=(gate['inside'][0]-gate['outside'][0])/6;dz=(gate['inside'][1]-gate['outside'][1])/6
            map_point(gate['outside'][0]-dx*10,gate['outside'][1]-dz*10);foot()
            look({'x':gate['x']+dx*9,'z':gate['z']+dz*9})
            check(snap()['campus']['entranceDraws']==1,'Native Telopea entrance displays the bounded flag and rock batch')
            capture('telopea-estimated-entrance-flags')
            assets=json.loads((ROOT/'Games/Capital Drive/data/street-assets.json').read_text())
            stops=[stop for stop in assets['busStops'] if stop.get('shelter')=='yes' and len(stop.get('furniture',[]))>=3]
            stop=min(stops,key=lambda stop:math.hypot(stop['x']-state['focus']['x'],stop['z']-state['focus']['z']))
            map_point(stop['x']+10,stop['z']+10);foot();look(stop)
            check(snap()['streetAssets']['stops']>0 and snap()['streetAssets']['drawCalls']==1,'Native source bus-stop approach renders bounded furniture')
            capture('source-bus-stop')
            barrier=json.loads((ROOT/'Games/Capital Drive/data/highway-barriers.json').read_text())['barriers'][0]
            target={'x':(barrier['a'][0]+barrier['b'][0])/2,'z':(barrier['a'][1]+barrier['b'][1])/2}
            map_point(target['x']+10,target['z']+10);foot();look(target)
            check(snap()['highwayBarriers']['panels']>0 and snap()['highwayBarriers']['drawCalls']<=2,'Native sourced guard rail renders within two draws')
            capture('source-road-guardrail')
            parliament=next(place for place in snap()['places'] if place['id']=='parliament-house')
            map_point(parliament['x'],parliament['z']-230);foot();look(parliament)
            capture('parliament-forecourt')
            animal=state['wildlife']['animals'][0]
            map_point(animal['x']+12,animal['z']+12); foot(); look(animal); frames()
            check(snap()['wildlife']['visible']>0,'Native Free roam approach displays Red Hill wildlife')
            capture('red-hill-kangaroos')
        finally:
            finish_context(context,'scenery')

    try:
        with ExitStack() as stack:
            playwright=stack.enter_context(sync_playwright())
            browser=playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,timeout=30000,args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            scenarios=['campaign','restaurant','gym','scenery'] if args.scenario=='all' else [args.scenario]
            for scenario in scenarios:
                try:
                    {'campaign':campaign_case,'restaurant':restaurant_case,'gym':gym_case,'scenery':scenery_case}[scenario](browser)
                except Exception:
                    if page and not page.is_closed():
                        try: capture(scenario+'-failure-state')
                        except Exception as error: observations.append({'failureCapture':str(error)})
                    raise
            check(not errors,'No page or console errors')
            check(not requests,'No failed requests or HTTP errors')
            check(not external,'No external runtime requests attempted')
    except Exception as error:
        failure=f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0);signal.signal(signal.SIGALRM,prior)
        server.shutdown();server.server_close();thread.join(timeout=2)
        report={'status':'FAIL' if failure else 'PASS','scenario':args.scenario,'failure':failure,'checks':checks,'errors':errors,'requests':requests,'external':external,'observations':observations,'elapsedSeconds':round(time.monotonic()-started,2),'budgetSeconds':BUDGET,'screenshots':sorted(path.name for path in output.glob('*.png')),'limitations':['Software WebGL only; native GPU/N100 performance is unmeasured.','Campaign case naturally earns only the corporate first chapter; lunch travel, other full introductions and the shared meeting are not completed.','Restaurant and all-machine gym cases use Free roam map travel; they do not establish paid career workouts or campaign encounter credit.','Scenery coverage is limited to the actual recorded source descriptors and wildlife approach.','Screenshots require separate visual review.']}
        (output/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2),flush=True)
    if failure: raise SystemExit(1)


if __name__=='__main__':
    main()
