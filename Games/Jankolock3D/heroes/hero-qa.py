#!/usr/bin/env python3
"""Bounded native-input evidence. Run from repository root. No state grants."""
import hashlib
import json
import math
import shutil
import subprocess
import threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from PIL import Image, ImageStat, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'docs/maintenance/audits/jankolock-3d-qa/heroes-resume'

def source_hashes():
    paths = [p for p in (ROOT/'Games/Jankolock3D').rglob('*') if p.suffix in {'.mjs','.js','.html','.css','.json','.glb','.png'}]
    paths += [Path(__file__).resolve(), ROOT/'docs/jank3d-hero-kits.json']
    paths += list((ROOT/'assets/fonts').rglob('*.woff2'))
    paths += [ROOT/f'docs/jank3d-design/ui-mockup-heroes{suffix}.png' for suffix in ['', '-mobile']]
    return {p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

def capacity():
    free = shutil.disk_usage(ROOT).free
    if free < 2178940928:
        raise RuntimeError(f'Disk guard: {free} bytes free; halt asset writes')

def snapshot(page):
    return page.evaluate('window.heroSnapshot()')

def capture(page, name, full=False):
    capacity()
    path = OUT / f'heroes-{name}.png'
    page.screenshot(path=str(path), full_page=full)
    variance = sum(ImageStat.Stat(Image.open(path).convert('RGB')).var) / 3
    assert variance > 80, (name, variance)
    return {'file': path.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'size': list(Image.open(path).size), 'variance': round(variance, 2), 'snapshot': snapshot(page)}

def twin(mockup, implemented, output, size=(1280, 720)):
    capacity()
    result = Image.new('RGB', (size[0] * 2, size[1] + 32), '#eee9d8')
    labels = ImageDraw.Draw(result)
    for index, file in enumerate([mockup, implemented]):
        image = Image.open(file).convert('RGB'); image.thumbnail(size)
        result.paste(image, (index * size[0], 32))
        labels.text((index * size[0]+12, 10), ['Generated mockup', 'Implemented page'][index], fill='#242820')
    result.save(output)


def main():
    capacity()
    processes=subprocess.check_output(['ps','-eo','stat=,comm=,args='],text=True)
    assert not [r for line in processes.splitlines() if len(r:=line.split(None,2))==3 and r[1] in {'chrome','chromium'} and not r[0].startswith('Z') and '--type=' not in r[2]], 'Sibling browser active; serialize QA'
    OUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 8937), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    evidence, errors, responses, checks, requests = [], [], [], [], []
    report = {'status':'RUNNING', 'scope':'Builder evidence for E, reviewer grades separately; normal inputs, no state grants',
              'screenshots':evidence, 'checks':checks, 'errors':errors, 'responses':responses, 'requests':requests,
              'sourceRevision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
              'sourceHashes':source_hashes(), 'storageBefore':shutil.disk_usage(ROOT).free}
    def watch(context):
        def page_events(page):
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('console',lambda message:errors.append(message.text) if message.type=='error' else None)
            page.on('requestfailed',lambda request:errors.append(f'{request.url}: {request.failure}'))
            def response_event(response):
                requests.append({'url':response.url.removeprefix('http://127.0.0.1:8937/'),'status':response.status})
                if response.status>=400:errors.append(f'HTTP {response.status}: {response.url}')
            page.on('response',response_event)
        context.on('page',page_events)
        context.route('**/*',lambda route:route.continue_() if route.request.url.startswith(('http://127.0.0.1:8937/','blob:http://127.0.0.1:8937/','data:')) else (errors.append('External request: '+route.request.url),route.abort())[-1])
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context(viewport={'width': 1280, 'height': 720}, color_scheme='light')
            watch(context)
            page = context.new_page()
            page.add_init_script('window.keyLog=[];for(const type of ["keydown","keyup","pointerlockchange"]){addEventListener(type,e=>keyLog.push({type,code:e.code,locked:!!document.pointerLockElement}),true)}')
            for hero in range(1, 5):
                response = page.goto(f'http://127.0.0.1:8937/Games/Jankolock3D/heroes/devhero-{hero}.html')
                responses.append({'hero': hero, 'status': response.status}); assert response.status == 200
                page.wait_for_function('window.heroSnapshot && window.heroSnapshot().time > .25')
                # Explicit accessibility-mode selection; the cold default is checked by theme-qa.py.
                page.get_by_role('button', name='Light theme', exact=True).click()
                evidence.append(capture(page, f'{hero}-light'))
                page.locator('#theme').click(); evidence.append(capture(page, f'{hero}-dark')); page.locator('#theme').click()
                for slot in range(1, 5):
                    page.locator('#reset').click()
                    page.locator(f'button[data-slot="{slot}"]').click()
                    data = snapshot(page); assert data['lastAbility'] and sum(data['casts'].values()) == 1, data
                    evidence.append(capture(page, f'{hero}-ability-{slot}'))
                    checks.append(f'hero {hero} ability {slot} normal button input: {data["lastAbility"]}')
                if hero==3:
                    page.locator('#reset').click();page.locator('[data-slot="1"]').click()
                    page.locator('#capture').click();page.wait_for_function('window.heroSnapshot().pointerLocked')
                    page.mouse.down();page.wait_for_function('window.heroSnapshot().targets.find(t=>t.id==="center").hp<=150')
                    page.mouse.up();assert snapshot(page)['targets'][1]['alive']
                    page.keyboard.press('4');page.mouse.down()
                    page.wait_for_function('!window.heroSnapshot().targets.find(t=>t.id==="center").alive')
                    page.mouse.up();assert 'xray' in snapshot(page)['buffs']
                    evidence.append(capture(page,'xray-target-death'))
                    page.wait_for_function('window.heroSnapshot().targets.find(t=>t.id==="center").alive')
                    assert 'xray' in snapshot(page)['buffs']
                    evidence.append(capture(page,'xray-target-respawn'))
                    page.wait_for_function('!window.heroSnapshot().buffs.includes("xray")')
                    evidence.append(capture(page,'xray-expired'));page.keyboard.press('Escape')
                    checks.append('Native Snipeoff reveal across dummy death/respawn and original expiry; membership geometry also has Node regression')
            page.goto('http://127.0.0.1:8937/Games/Jankolock3D/heroes/devhero-1.html')
            page.wait_for_function('window.heroSnapshot && window.heroSnapshot().time > .2')
            page.locator('#capture').click()
            page.wait_for_function('window.heroSnapshot().pointerLocked')
            start_yaw = page.locator('canvas').bounding_box()
            page.mouse.move(start_yaw['x'] + 200, start_yaw['y'] + 200)
            page.mouse.move(start_yaw['x'] + 260, start_yaw['y'] + 220)
            evidence.append(capture(page, 'pointerlook'))
            page.keyboard.press('Escape'); page.locator('#reset').click(); page.locator('#capture').click()
            page.wait_for_function('window.heroSnapshot().pointerLocked')
            page.mouse.down(button='right'); page.wait_for_function('window.heroSnapshot().fov < 52')
            evidence.append(capture(page, 'aim')); page.mouse.up(button='right'); checks.append('Pointer lock and RMB FOV zoom observed')
            page.keyboard.press('Space'); page.wait_for_function('window.heroSnapshot().jumps === 1 && window.heroSnapshot().position[1] > .3')
            page.keyboard.press('Space'); page.wait_for_function('window.heroSnapshot().jumps === 2')
            evidence.append(capture(page, 'double-jump')); page.keyboard.press('Space'); assert snapshot(page)['jumps'] == 2
            page.wait_for_function('window.heroSnapshot().grounded', timeout=15000); checks.append('Two airborne jumps, third jump rejected, grounded reset')
            page.keyboard.down('w'); page.keyboard.press('Shift'); page.wait_for_function('window.heroSnapshot().stamina < 90')
            evidence.append(capture(page, 'dash')); page.keyboard.up('w'); checks.append('Shift dash stamina debit observed')
            page.keyboard.press('Escape'); page.locator('#reset').click(); page.locator('#capture').click(); page.wait_for_function('window.heroSnapshot().pointerLocked')
            page.keyboard.down('w'); page.keyboard.down('Control')
            try:
                page.wait_for_function('window.heroSnapshot().state === "sprint" && window.heroSnapshot().position[2] < 6')
            except Exception:
                report['sprintFailure']={'snapshot':snapshot(page),'keys':page.evaluate('keyLog'),'focus':page.evaluate('document.hasFocus()')}
                raise
            page.keyboard.down('c'); page.wait_for_function('window.heroSnapshot().infiniteAmmo')
            before=snapshot(page); page.mouse.down(); page.wait_for_function('window.heroSnapshot().shots > 0')
            after=snapshot(page); assert after['ammo'] == before['ammo'] and after['infiniteAmmo'], after
            evidence.append(capture(page, 'slide')); page.mouse.up(); page.keyboard.up('c');page.keyboard.up('Control');page.keyboard.up('w')
            page.wait_for_function('!window.heroSnapshot().infiniteAmmo'); checks.append('Sprint, slide, real slide shot without ammunition debit, exit clears infinite ammunition')
            page.keyboard.press('Escape'); page.locator('#reset').click();page.locator('canvas').focus()
            page.keyboard.down('s'); page.wait_for_function('window.heroSnapshot().position[2] > 13');page.keyboard.up('s');page.wait_for_timeout(250)
            wall=snapshot(page); distance=math.dist(wall['position'],wall['camera']); assert distance < 3.8, wall
            evidence.append(capture(page, 'camera-wall-clamp'));checks.append(f'Native backward walk: camera distance {distance:.2f}m at rear wall')
            page.keyboard.down('s');page.wait_for_timeout(1600);page.keyboard.up('s');assert snapshot(page)['position'][2]<17, snapshot(page)
            checks.append('Rear-wall movement collision observed')
            context.close()
            mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,color_scheme='light')
            watch(mobile);mp=mobile.new_page()
            mp.goto('http://127.0.0.1:8937/Games/Jankolock3D/heroes/devhero-1.html');mp.wait_for_function('window.heroSnapshot && window.heroSnapshot().time > .2')
            assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
            mp.get_by_role('button', name='Light theme', exact=True).tap()
            evidence.append(capture(mp,'mobile-light'));evidence.append(capture(mp,'mobile-full-light',full=True))
            mp.locator('#theme').tap();evidence.append(capture(mp,'mobile-dark'));evidence.append(capture(mp,'mobile-full-dark',full=True))
            mp.locator('[data-slot="2"]').tap();assert snapshot(mp)['lastAbility']=='volley'
            mp.locator('[data-edge="jump"]').tap();mp.wait_for_function('window.heroSnapshot().jumps === 1')
            forward=mp.locator('[data-hold="KeyW"]');forward.scroll_into_view_if_needed();rect=forward.bounding_box()
            start=snapshot(mp)['position'][2];cdp=mobile.new_cdp_session(mp)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':rect['x']+rect['width']/2,'y':rect['y']+rect['height']/2}]})
            mp.wait_for_function('(start)=>window.heroSnapshot().position[2] < start-.3',arg=start)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            mp.wait_for_function('!window.heroSnapshot().held.includes("KeyW")')
            checks.append('390px touch ability/jump/held movement/release, both themes, no horizontal overflow')
            mobile.close();browser.close()
        twin(ROOT/'docs/jank3d-design/ui-mockup-heroes.png',OUT/'heroes-1-light.png',OUT/'heroes-mockup-vs-implemented.png')
        twin(ROOT/'docs/jank3d-design/ui-mockup-heroes-mobile.png',OUT/'heroes-mobile-full-light.png',OUT/'heroes-mobile-mockup-vs-implemented.png',(390,1040))
        capacity()
        sheet=Image.new('RGB',(1280,800),'#eee9d8');labels=ImageDraw.Draw(sheet)
        for hero in range(1,5):
            for slot in range(1,5):
                image=Image.open(OUT/f'heroes-{hero}-ability-{slot}.png').crop((12,125,930,661));image.thumbnail((320,180))
                x=(slot-1)*320;y=(hero-1)*200;sheet.paste(image,(x,y+20));labels.text((x+8,y+5),f'Hero {hero} / Ability {slot}',fill='#242820')
        sheet.save(OUT/'heroes-fx-contact-sheet.png')
        assert not errors, errors
        report['sourceHashesAfter']=source_hashes()
        report['sourcesUnchanged']=report['sourceHashes']==report['sourceHashesAfter']
        assert report['sourcesUnchanged'], 'Source/resource bytes changed during capture'
        report['status']='COMPLETE-builder-checks-only'
        print(f'hero-qa: {len(responses)} hero pages HTTP 200; {len(evidence)} screenshots; {len(checks)} observations; {len(errors)} retained errors; source hashes stable. Reviewer acceptance pending.')
    except Exception as error:
        report['status']='FAILED';report['failure']=f'{type(error).__name__}: {error}'
        raise
    finally:
        server.shutdown();server.server_close()
        report['storageAfter']=shutil.disk_usage(ROOT).free
        capacity();(OUT/'heroes-browser-report.json').write_text(json.dumps(report,indent=2)+'\n')

if __name__ == '__main__':
    main()
