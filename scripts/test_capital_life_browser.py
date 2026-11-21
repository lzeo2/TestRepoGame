#!/usr/bin/env python3
"""Bounded native character, PowerPunt, noodle encounter and gym evidence.

Use an outer watchdog: timeout 600s python3 -B scripts/test_capital_life_browser.py
--scenario rowan-lunch --capture --output <fresh-external-directory>. No installs or state
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
COMPONENT_BUDGET = 100


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def skip_guided_tutorial(page):
    tutorial = page.locator('#guided-tutorial')
    if tutorial.count():
        tutorial.uncheck()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scenario', choices=['campaign', 'rowan-lunch', 'school-story', 'cutscene-ui', 'noodle-component', 'restaurant', 'gym', 'scenery', 'all'], default='all')
    parser.add_argument('--capture', action='store_true')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    budget = COMPONENT_BUDGET if args.scenario in ('noodle-component','cutscene-ui') else BUDGET
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
        raise TimeoutError(f'Life browser run exceeded {budget} seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(budget)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        return page.evaluate('capitalComponentSnapshot()' if args.scenario=='noodle-component' else 'capitalDriveSnapshot()')

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

    def ready(context, document=None):
        nonlocal page
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        if document:
            page.route('**/__capital-life-component',lambda route:route.fulfill(content_type='text/html',body=document))
        page.goto(base+('/__capital-life-component' if document else '/Games/Capital%20Drive/'), wait_until='load', timeout=60000)
        page.wait_for_function('window.capitalComponentSnapshot?.().ready' if document else 'window.capitalDriveSnapshot?.().ready', timeout=60000)
        check(not snap()['rendering']['compatibility'], ('Component ' if document else 'Native ')+args.scenario+' context has WebGL')

    def start(mode):
        page.locator(f'[data-game-mode="{mode}"]').click()
        skip_guided_tutorial(page)
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

    def begin_campaign():
        page.locator('#campaign-start').click()
        page.locator('#cutscene-dialog').wait_for(state='visible')
        page.locator('#cutscene-skip').click()
        page.locator('#cutscene-dialog').wait_for(state='hidden')
        wait(lambda s:s['campaign']['active'] is not None,'Normal cutscene Skip starts the mission')
        frames();focus()

    def corporate_presentation():
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
        state=wait(lambda s:s['presentation']['serial']>before and s['presentation']['outcome']=='outage' and s['campaign']['active']['stage']==1,'Actual PowerPunt outage and campaign stage')
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
        return completed

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
                skip_guided_tutorial(page)
                page.locator('#start-button').click()
                wait(lambda s:s['started'] and s['gameMode']=='campaign' and s['gameplay']['mode']=='foot' and s['actors']['playerVisible'], hero+' native start')
                state=record(hero+' initial campaign')
                check(state['gameplay']['mode']=='foot' and state['actors']['playerVisible'], hero+' starts as a visible on-foot adult')
                check(state['campaign']['character']==hero and not any(state['campaign']['intros'].values()) and not state['campaign']['completed'], hero+' start awards no mission completion')
                missions.append(state['campaign']['next']); appearances.append(state['playerAppearance'])
                capture(hero+'-opening')
                if hero!='corporate':
                    continue
                begin_campaign()
                check(snap()['campaign']['active']['id']==missions[-1], 'Corporate mission begins through the visible campaign button')
                corporate_presentation()
                page.reload(wait_until='load'); page.wait_for_function('window.capitalDriveSnapshot?.().ready',timeout=60000)
                page.locator('[data-game-mode="campaign"]').click()
                skip_guided_tutorial(page)
                page.locator('#start-button').click()
                wait(lambda s:s['started'] and s['gameMode']=='campaign','Restored corporate start')
                restored=snap()
                check(restored['campaign']['character']=='corporate' and restored['campaign']['intros']['corporate']==['corporate-present-tense'] and restored['playerAppearance']==appearances[-1], 'Reload preserves corporate appearance and actually earned progress')
            finally:
                finish_context(context,hero)
        check(len(set(missions))==3 and len(set(appearances))==3,'Three campaign heroes have distinct initial missions and appearances')

    def frozen_encounter(state):
        return {key:state[key] for key in ('roomPeople','encounter','campaign','gameplay')}

    def rowan_lunch_case(browser):
        context=browser.new_context(viewport={'width':1280,'height':800})
        try:
            ready(context)
            page.locator('[data-game-mode="campaign"]').click()
            page.locator('#intro-characters [data-character="corporate"]').click()
            skip_guided_tutorial(page)
            page.locator('#start-button').click()
            wait(lambda s:s['started'] and s['gameMode']=='campaign' and s['gameplay']['mode']=='foot','Fresh Rowan campaign start')
            initial=record('rowan fresh career')
            check(initial['career']['cash']==1000 and not any(initial['campaign']['intros'].values()),'Fresh Rowan has only actual starting cash and no earned introductions')
            begin_campaign()
            corporate_presentation()
            page.locator('#jobs-button').click()
            baseline=record('rowan partial intro before switches')
            for hero in ('student','basement','corporate'):
                choice=page.locator('#campaign-characters [data-character="'+hero+'"]')
                check(choice.is_enabled(),'Partial Rowan introduction permits visible '+hero+' selection')
                choice.click(); frames()
                state=record('partial intro selected '+hero)
                check(state['campaign']['character']==hero and state['playerAppearance']=='player:'+hero,'Visible '+hero+' switch updates selected identity and appearance')
                check(state['focus']==baseline['focus'] and state['player']==baseline['player'] and state['career']['cash']==baseline['career']['cash'] and state['campaign']['intros']==baseline['campaign']['intros'],'Partial intro '+hero+' selection neither travels nor earns progress')
            page.reload(wait_until='load');page.wait_for_function('window.capitalDriveSnapshot?.().ready',timeout=60000)
            page.locator('[data-game-mode="campaign"]').click()
            skip_guided_tutorial(page)
            page.locator('#start-button').click()
            wait(lambda s:s['started'] and s['gameMode']=='campaign','Rowan actual progress reload')
            restored=record('partial Rowan intro restored')
            check(restored['campaign']['character']=='corporate' and restored['campaign']['intros']['corporate']==['corporate-present-tense'] and restored['career']['cash']==1100,'Reload preserves selected Rowan and the actually earned partial introduction')
            begin_campaign()
            check(snap()['campaign']['active']['id']=='corporate-lunch-breakpoint','Visible campaign button starts actual Lunch breakpoint')
            page.locator('#jobs-button').click()
            choices=page.locator('#campaign-characters [data-character]')
            check(choices.count()==3 and all(choices.nth(i).is_disabled() for i in range(3)),'Active Lunch breakpoint locks all three visible hero choices')
            capture('rowan-lunch-hero-lock')
            page.locator('#campaign-resume').click();frames();focus()
            # The retained Centre body crosses Bunda's mapped road. This public
            # detour was swept against actual geometry and generated parked cars.
            for waypoint in ({'x':-263,'z':-4173},{'x':-257,'z':-4122},{'x':-273.5,'z':-4111.5},{'x':-336.5,'z':-4083},{'x':-431,'z':-4275},{'x':-360.5,'z':-4341},{'x':-357.5,'z':-4366.5},{'x':-366.5,'z':-4405.5}):
                walk(waypoint,tolerance=1,seconds=80,sprint=True)
                record('native public walking waypoint')
            door=next(site['frontage'] for site in snap()['services'] if site['id']=='store-5656111023')
            walk(door,tolerance=2.1)
            capture('rowan-lunch-native-arrival')
            plan=enter('shop')
            counter=plan['counter']
            walk(room(plan,0,local(plan,counter)['z']),tolerance=.4)
            walk(counter,tolerance=1.8)
            wait(lambda s:s['campaign']['active']['stage']==1,'Actual restaurant counter advances lunch encounter stage')
            guest=next(person for person in snap()['roomPeople'] if person.get('character')=='booth-guest')
            guest_local=local(plan,guest)
            walk(room(plan,0,local(plan,counter)['z']),tolerance=.4)
            walk(room(plan,0,guest_local['z']),tolerance=.3)
            def can_talk(state):
                live=next(person for person in state['roomPeople'] if person['id']==guest['id'])
                return math.hypot(state['focus']['x']-live['x'],state['focus']['z']-live['z'])<=2.1 and 'talk' in page.locator('#interaction-hint').inner_text().lower()
            walk(room(plan,.7,guest_local['z']),admitted=can_talk)
            look(guest)
            serial=snap()['encounter']['serial']
            pulse('e');page.locator('#npc-dialog').wait_for(state='visible')
            check(page.locator('[data-dialogue-choice]').count()==2,'Actual career booth E opens both normal dialogue answers')
            capture('rowan-lunch-normal-dialogue')
            # The ordinary apology answer must still trigger this mission's
            # authored sequence, without requiring a synthetic confrontation.
            page.locator('[data-dialogue-choice="apologise"]').click()
            page.locator('#pause-button').click()
            windup=record('rowan noodle windup paused')
            throwing=next(person for person in windup['roomPeople'] if person['id']==guest['id'])
            check(windup['encounter']['phase']=='noodle-windup' and throwing['noodleThrow']['phase']=='windup' and windup['encounter']['serial']==serial,'Normal apology begins actual noodle windup without premature credit')
            page.wait_for_timeout(500)
            check(frozen_encounter(snap())==frozen_encounter(windup),'Paused read-only people, gameplay and campaign snapshots remain identical during noodle windup')
            capture('rowan-noodle-windup-paused')
            close('pause-dialog')
            flight=wait(lambda s:s['encounter']['phase']=='noodle-flight','Actual noodle flight',seconds=15)
            page.locator('#pause-button').click()
            flight=record('rowan noodle trajectory paused')
            throwing=next(person for person in flight['roomPeople'] if person['id']==guest['id'])
            trajectory=throwing['noodleThrow']
            check(trajectory and trajectory['phase']=='flight' and trajectory['from'] and trajectory['to'] and flight['encounter']['serial']==serial,'Live noodle flight exposes its actual trajectory before encounter credit')
            page.wait_for_timeout(500)
            check(frozen_encounter(snap())==frozen_encounter(flight),'Normal Pause freezes the read-only noodle trajectory snapshot')
            capture('rowan-noodle-flight-paused')
            close('pause-dialog')
            state=wait(lambda s:s['encounter']['serial']>serial and s['encounter']['outcome']=='noodle-fight' and s['campaign']['active']['stage']==2,'Actual throw then guest melee and campaign stage',seconds=15)
            page.locator('#pause-button').click()
            state=record('rowan actual guest punch paused')
            attacker=next(person for person in state['roomPeople'] if person['id']==guest['id'])
            check(state['encounter']['phase']=='complete' and attacker['attackSerial']>0 and attacker['attackTimer']>0,'Only actual noodle throw and actual NPC punch complete the career encounter')
            check(state['campaign']['active']['stage']==2 and state['career']['cash']==1100,'Actual encounter advances exit stage without early lunch reward')
            page.wait_for_timeout(500)
            check(frozen_encounter(snap())==frozen_encounter(state),'Normal Pause freezes actual guest punch and encounter completion')
            capture('rowan-noodle-punch-paused')
            close('pause-dialog')
            walk(room(plan,0,10.6),tolerance=.3);leave(plan)
            done=wait(lambda s:'corporate-lunch-breakpoint' in s['campaign']['intros']['corporate'],'Actual lunch exit reward',seconds=20)
            check(done['career']['cash']==1250 and done['campaign']['active'] is None,'Actual counter, noodle fight and normal exit award lunch $150 exactly once')
            capture('rowan-lunch-earned-complete')
        finally:
            finish_context(context,'rowan-lunch')

    def cutscene_ui_case(browser):
        context=browser.new_context(viewport={'width':1280,'height':800})
        try:
            ready(context)
            page.locator('[data-game-mode="campaign"]').click()
            page.locator('#intro-characters [data-character="student"]').click()
            skip_guided_tutorial(page)
            page.locator('#start-button').click()
            wait(lambda s:s['started'] and s['gameMode']=='campaign','Fresh Kit cutscene UI start')
            for label,width,height in (('desktop',1280,800),('mobile',390,844)):
                page.set_viewport_size({'width':width,'height':height})
                page.locator('#campaign-start').click()
                page.locator('#cutscene-dialog').wait_for(state='visible')
                check(page.evaluate("document.activeElement?.id==='cutscene-skip'"),'Cutscene '+label+' initially focuses Skip')
                page.keyboard.press('Tab')
                check(page.evaluate("document.activeElement?.id==='cutscene-cancel'"),'Cutscene '+label+' Tab reaches Back to briefing')
                page.keyboard.press('Tab')
                check(page.evaluate("document.activeElement?.id==='cutscene-skip'"),'Cutscene '+label+' Tab wraps within the overlay')
                page.keyboard.press('Shift+Tab')
                check(page.evaluate("document.activeElement?.id==='cutscene-cancel'"),'Cutscene '+label+' Shift+Tab wraps within the overlay')
                check(page.evaluate("[...document.querySelector('#game').children].filter(e=>e.id!=='cutscene-dialog').every(e=>e.inert)"),'Cutscene '+label+' makes background siblings inert')
                dom=page.evaluate("""()=>{
                  const describe=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,id:e.id,className:e.className,open:e.open??null,rect:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom},display:s.display,visibility:s.visibility,background:s.backgroundColor,opacity:s.opacity,position:s.position,zIndex:s.zIndex,before:{background:getComputedStyle(e,'::before').backgroundColor,height:getComputedStyle(e,'::before').height},after:{background:getComputedStyle(e,'::after').backgroundColor,height:getComputedStyle(e,'::after').height}}};
                  return {viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},selected:['#cutscene-dialog','.cutscene-caption','#toast'].map(s=>describe(document.querySelector(s))),points:[100,200].map(y=>({x:Math.min(640,innerWidth/2),y,stack:document.elementsFromPoint(Math.min(640,innerWidth/2),y).map(describe),opaqueCovering:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.left<Math.min(640,innerWidth/2)&&r.right>Math.min(640,innerWidth/2)&&r.top<y&&r.bottom>y&&s.display!=='none'&&s.visibility!=='hidden'&&s.backgroundColor!=='rgba(0, 0, 0, 0)'&&s.opacity!=='0';}).map(describe)}))};
                }""")
                (output/('dom-'+label+'.json')).write_text(json.dumps(dom,indent=2)+'\n')
                observations.append({'cutsceneUi':label,'domFile':'dom-'+label+'.json','topOpaqueIds':[[e['id'] or e['className'] for e in p['opaqueCovering']] for p in dom['points']]})
                check(dom['selected'][2]['visibility']=='hidden','Cutscene '+label+' hides the normal gameplay toast')
                check(dom['viewport']['scrollWidth']<=width,'Cutscene '+label+' has no horizontal overflow')
                for selector in ('#cutscene-skip','#cutscene-cancel'):
                    box=page.locator(selector).bounding_box()
                    check(box['width']>=44 and box['height']>=44,'Cutscene '+label+' retains 44px '+selector+' button')
                caption=dom['selected'][1]['rect']
                check(caption['y']>height*.45 and caption['bottom']<=height,'Cutscene '+label+' places readable captions at the bottom')
                capture('cutscene-ui-'+label)
                if label=='desktop':
                    page.keyboard.press('Escape')
                    page.locator('#campaign-dialog').wait_for(state='visible')
                    check(snap()['campaign']['active'] is None and snap()['career']['cash']==1000,'Cutscene UI actual Escape returns to briefing without mission or reward')
                    page.locator('#campaign-start').click()
                    page.locator('#cutscene-dialog').wait_for(state='visible')
                    page.locator('#cutscene-cancel').click()
                    page.locator('#campaign-dialog').wait_for(state='visible')
                    check(snap()['campaign']['active'] is None,'Cutscene UI normal Cancel retains the briefing without starting a mission')
                else:
                    page.locator('#cutscene-skip').click()
                    wait(lambda s:s['campaign']['active'] is not None,'Cutscene UI normal Skip starts the actual mission')
                    check(snap()['career']['cash']==1000,'Cutscene UI inputs do not grant career rewards')
                    check(page.evaluate("[...document.querySelector('#game').children].every(e=>!e.inert)"),'Cutscene Skip restores background interaction')
        finally:
            finish_context(context,'cutscene-ui')

    def school_story_case(browser):
        context=browser.new_context(viewport={'width':1280,'height':800})
        try:
            ready(context)
            page.locator('[data-game-mode="campaign"]').click()
            page.locator('#intro-characters [data-character="student"]').click()
            skip_guided_tutorial(page)
            page.locator('#start-button').click()
            wait(lambda s:s['started'] and s['gameMode']=='campaign' and s['gameplay']['mode']=='foot','Fresh Kit career start')
            initial=record('school story actual fresh Kit')
            check(initial['career']['cash']==1000 and not any(initial['campaign']['intros'].values()),'School story starts with actual starting cash and no introduction reward')
            page.locator('#campaign-start').click()
            page.locator('#cutscene-dialog').wait_for(state='visible')
            first=page.locator('#cutscene-line').inner_text()
            check(bool(first) and bool(page.locator('#cutscene-speaker').inner_text()) and bool(page.locator('#cutscene-title').inner_text()),'Actual school cutscene displays title, speaker and caption')
            before=record('school cutscene first caption')
            capture('school-cutscene-caption')
            page.keyboard.down('w');page.keyboard.press('f')
            try:
                page.wait_for_timeout(400)
            finally:
                page.keyboard.up('w')
            during=snap()
            check(during['focus']==before['focus'] and during['career']['cash']==1000 and during['campaign']['active'] is None and during['gameplay']['attackSerial']==before['gameplay']['attackSerial'],'Actual cutscene blocks held movement and attack without starting or paying a mission')
            page.wait_for_function('(line)=>document.querySelector("#cutscene-line").textContent!==line',arg=first,timeout=10000)
            check(page.locator('#cutscene-dialog').is_visible(),'Supplied-time cutscene advances to another actual caption')
            capture('school-cutscene-next-caption')
            page.locator('#cutscene-cancel').click()
            page.locator('#campaign-dialog').wait_for(state='visible')
            cancelled=record('school cutscene normal cancel')
            check(cancelled['campaign']['active'] is None and cancelled['career']['cash']==1000 and not any(cancelled['campaign']['intros'].values()),'Normal cutscene Cancel returns to briefing without mission or reward')
            begin_campaign()
            active=record('school mission after normal Skip')
            check(active['campaign']['active']['id']=='student-paper-chase' and active['campaign']['active']['name']=='False start','Normal Skip starts renamed False start while preserving its saved mission ID')
            pulse('f')
            box=page.locator('#world canvas').bounding_box()
            page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
            frames()
            denied=record('school active mission actual attack attempts')
            fields=('attackSerial','attackTimer','ammo','reserveAmmo','health','wanted')
            check(all(denied['gameplay'][key]==active['gameplay'][key] for key in fields) and denied['career']['cash']==active['career']['cash'],'Actual F and mouse attacks in combat-disabled school mission consume no ammo, timers, health, wanted or cash')
            gate=next(g for g in snap()['campusGates'] if g['id']=='telopea-gate-11')
            for point in ({'x':gate['outside'][0],'z':gate['outside'][1]},{'x':gate['inside'][0],'z':gate['inside'][1]}):
                look(point)
                walk(point,tolerance=.45)
            crossed=record('school native mapped public gate crossing')
            check(crossed['gameplay']['mode']=='foot','Actual foot travel crosses the mapped public school gate')
            state=snap()
            entry=state.get('schoolEntry') or next(e for e in state['interiors']['publicEntries'] if e['type']=='school')
            look(entry.get('approach',entry))
            walk(entry.get('approach',entry),tolerance=.6)
            look(entry)
            walk(entry,tolerance=1.8)
            plan=enter('school')
            check(plan['id']=='interior-telopea-school' and any(f['kind']=='alarm-panel' for f in plan['furniture']),'Normal E loads the actual lazy school room and fictional alarm prop')
            station=next(st for st in plan['activities'] if st['kind']=='alarm')
            walk(room(plan,0,local(plan,station)['z']),tolerance=.35)
            walk(station,tolerance=.4)
            look(next(f for f in plan['furniture'] if f['kind']=='alarm-panel'))
            serial=snap()['schoolAlarm']['serial']
            pulse('q')
            wait(lambda s:s['miniGame']['active'] and s['miniGame']['kind']=='alarm' and s['miniGame']['phase']=='arm','Actual school alarm admission and first cue')
            check('X' in page.locator('#activity-prompt').inner_text() and snap()['miniGame']['expectedKey']=='x','Visible school alarm cue agrees with its actual first input')
            capture('school-lazy-room-alarm-cue')
            focus();page.keyboard.down('x')
            try:
                wait(lambda s:s['miniGame']['phase']=='release','Actual held X reaches alarm release cue')
            finally:
                page.keyboard.up('x')
            wait(lambda s:s['miniGame']['phase']=='confirm','Actual alarm X release reaches fresh Y cue')
            pulse('y')
            triggered=wait(lambda s:s['schoolAlarm']['serial']>serial and s['campaign']['active']['stage']==1 and s['gameplay']['wanted']>=1,'Actual alarm event advances school escape and creates wanted search')
            check(triggered['miniGame']['outcome']=='triggered' and triggered['career']['cash']==1000 and not triggered['campaign']['intros']['student'],'Actual X hold, release and fresh Y emit the school alarm without early mission reward')
            capture('school-actual-alarm-triggered')
            walk(room(plan,0,local(plan,station)['z']),tolerance=.35)
            leave(plan)
            outside=record('school actual normal exit with active escape')
            check(outside['interiors']['active'] is None and outside['interiorView']['meshes']==0,'Normal school exit disposes its lazy room after the actual alarm')
            observations.append({'scope':'School story proves actual captions/cancel/skip, attack denial, mapped gate travel, lazy room, actual alarm and normal exit. Police evasion, clear search and the first mission reward are not claimed.','wantedAtExit':outside['gameplay']['wanted'],'cashAtExit':outside['career']['cash']})
        finally:
            finish_context(context,'school-story')

    def noodle_component_case(browser):
        document = """<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#222;color:white;font:16px sans-serif}header{padding:12px;background:#151515}button{padding:12px;margin:4px}canvas{display:block}#status{color:#ffc978}
</style><header><strong>PROGRAMMATIC COMPONENT PREVIEW: supplied-dt restaurant fixture</strong><div>No native campaign, travel, save, cash or reward evidence.</div><button id="begin">Begin dialogue</button><button id="reply">Reply: apology</button><button id="play">Play to next captured phase</button><button id="clear">Clear and dispose</button><span id="status">Ready</span></header><script type="module">
import * as THREE from '/assets/car-arcade/vendor/three.module.js';
import {createInteriors} from '/Games/Capital%20Drive/interiors.js';
import {createInteriorView} from '/Games/Capital%20Drive/interior-view.js';
import {createInteriorPeople} from '/Games/Capital%20Drive/interior-people.js';
import {createInteriorPeopleView} from '/Games/Capital%20Drive/interior-people-view.js';
import {createActorView} from '/Games/Capital%20Drive/actor-view.js';
import {MAPPED_STORES} from '/Games/Capital%20Drive/stores.js';
const store=MAPPED_STORES.find(s=>s.id==='store-5656111023');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x303945);
scene.add(new THREE.HemisphereLight(0xffffff,0x77716a,2));
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1280,650);document.body.append(renderer.domElement);
const interiors=createInteriors({buildings:[{...store.building,id:store.buildingId}],landmarks:[]},{stores:[store],heightAt:()=>0});
const entry=interiors.entries[0],plan=interiors.enter(entry,{x:entry.x-Math.sin(entry.yaw),z:entry.z-Math.cos(entry.yaw)});
const roomView=createInteriorView(scene),people=createInteriorPeople(),view=createInteriorPeopleView(scene,()=>0),hero=createActorView(scene,()=>0,{policeLimit:0});
roomView.load(plan);people.load(plan);view.load(plan);hero.setPlayerAppearance('player:corporate');
const guest=people.snapshot().find(p=>p.character==='booth-guest'),o=plan.origin,c=Math.cos(o.yaw),sn=Math.sin(o.yaw);
const gz=sn*(guest.x-o.x)+c*(guest.z-o.z),actor={x:o.x+c*.7+sn*gz,z:o.z-sn*.7+c*gz,y:0,health:100,speed:0};actor.yaw=Math.atan2(-(guest.x-actor.x),-(guest.z-actor.z));
const midpoint={x:(actor.x+guest.x)/2,z:(actor.z+guest.z)/2};
const camera=new THREE.PerspectiveCamera(44,1280/650,.05,100);camera.position.set(midpoint.x-c*1.5-sn*3.4,2.3,midpoint.z+sn*1.5-c*3.4);camera.lookAt(midpoint.x,1.05,midpoint.z);
let playing=false,disposed=false,stop='flight',elapsed=0;const events=[];
const ctx={actor,hasLineOfSight:interiors.hasLineOfSight};
document.querySelector('#begin').onclick=()=>{const r=people.startDialogue(guest.id,{...ctx,scriptedFight:true});if(!r.ok)throw Error(JSON.stringify(r));};
document.querySelector('#reply').onclick=()=>{const r=people.respondDialogue(guest.id,'apologise',ctx);if(!r.ok)throw Error(JSON.stringify(r));playing=true;};
document.querySelector('#play').onclick=()=>{stop='punch';playing=true;};
document.querySelector('#clear').onclick=()=>{playing=false;people.clear();view.clear();roomView.clear();view.dispose();roomView.dispose();hero.dispose();disposed=true;};
function draw(){requestAnimationFrame(draw);if(disposed)return;const dt=playing?1/60:0;elapsed+=dt;people.update(dt,ctx);events.push(...people.drainEvents());const live=people.snapshot(),g=live.find(p=>p.id===guest.id);view.update(live,dt);hero.update({mode:'foot',actor,weapon:'unarmed',attackTimer:0},{dt,focus:actor});if(stop==='flight'&&g.noodleThrow?.phase==='flight'&&g.noodleThrow.time>=.23)playing=false;if(stop==='punch'&&g.attackSerial>0&&g.attackTimer<.41)playing=false;document.querySelector('#status').textContent=(playing?'Playing: ':'Paused: ')+people.encounter.phase;renderer.render(scene,camera);}
window.capitalComponentSnapshot=()=>({ready:true,componentPreview:true,label:'Programmatic component preview; no native career evidence',rendering:{compatibility:false},playing,elapsed,disposed,encounter:people.encounter,roomPeople:people.snapshot(),view:view.stats,interiorView:{...roomView.stats},events:structuredClone(events)});draw();
</script>"""
        context=browser.new_context(viewport={'width':1280,'height':800})
        try:
            ready(context,document)
            check(snap()['componentPreview'],'Evidence is explicitly a programmatic component preview')
            page.locator('#begin').click();page.locator('#reply').click()
            state=wait(lambda s:not s['playing'] and s['encounter']['phase']=='noodle-flight','Component owner reaches actual flight')
            guest=next(p for p in state['roomPeople'] if p.get('character')=='booth-guest')
            check(guest['noodleThrow']['from'] and guest['noodleThrow']['to'] and state['view']['throwSegmentLimit']==12 and state['view']['drawCalls']<=6,'Component flight has actual source trajectory, twelve strand limit and six-draw bound')
            capture('programmatic-component-noodle-flight')
            page.wait_for_timeout(300);check(snap()==state,'Component Pause freezes supplied-dt owner and read-only snapshots')
            page.locator('#play').click()
            state=wait(lambda s:not s['playing'] and s['encounter']['outcome']=='noodle-fight','Component owner emits actual throw then melee')
            check(any(e['type']=='noodles-throw' for e in state['events']) and any(e['type']=='retaliation' and e['kind']=='melee' for e in state['events']),'Programmatic component records actual owner throw and actual melee events')
            capture('programmatic-component-noodle-punch')
            page.locator('#clear').click()
            state=record('programmatic component disposed')
            check(state['disposed'] and not state['roomPeople'] and state['view']['drawCalls']==0 and state['view']['geometryCount']==0 and state['interiorView']['meshes']==0,'Component clear and dispose release people and lazy room geometry')
        finally:
            finish_context(context,'noodle-component')

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
                    {'campaign':campaign_case,'rowan-lunch':rowan_lunch_case,'school-story':school_story_case,'cutscene-ui':cutscene_ui_case,'noodle-component':noodle_component_case,'restaurant':restaurant_case,'gym':gym_case,'scenery':scenery_case}[scenario](browser)
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
        report={'status':'FAIL' if failure else 'PASS','scenario':args.scenario,'componentPreview':args.scenario=='noodle-component','failure':failure,'checks':checks,'errors':errors,'requests':requests,'external':external,'observations':observations,'elapsedSeconds':round(time.monotonic()-started,2),'budgetSeconds':budget,'screenshots':sorted(path.name for path in output.glob('*.png')),'limitations':['Software WebGL only; native GPU/N100 performance is unmeasured.','noodle-component is a programmatic supplied-dt module fixture; it proves no native career travel, mission, save, cash or reward.','Campaign case earns the corporate first chapter; rowan-lunch additionally checks native lunch travel and encounter when selected. Other full introductions and the shared meeting are not covered.','Restaurant and all-machine gym cases use Free roam map travel; they do not establish paid career workouts or campaign encounter credit.','Scenery coverage is limited to the actual recorded source descriptors and wildlife approach.','school-story stops after the actual alarm and normal exit; police evasion, clear search and school mission reward are not claimed.','Screenshots require separate visual review.']}
        (output/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2),flush=True)
    if failure: raise SystemExit(1)


if __name__=='__main__':
    main()
