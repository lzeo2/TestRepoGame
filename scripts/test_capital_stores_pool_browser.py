#!/usr/bin/env python3
"""Bounded normal-input stores/pool review; software rendering, never a hardware benchmark."""
import argparse
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


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    browser, page = None, None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    def deadline(signum, frame):
        raise TimeoutError('Stores/pool browser run exceeded 470 seconds')
    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(470)
    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)
    def snap(p):
        return p.evaluate('capitalDriveSnapshot()')
    def capture(p, name):
        p.screenshot(path=str(output / (name + '.png')))
        (output / (name + '.json')).write_text(json.dumps(snap(p), indent=2) + '\n')
    def ready(p):
        p.set_default_timeout(12000)
        p.on('pageerror', lambda e: errors.append(str(e)))
        p.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        p.on('requestfailed', lambda r: requests.append(f'{r.url}: {r.failure}'))
        p.on('response', lambda r: requests.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        p.on('request', lambda r: external.append(r.url) if urlsplit(r.url).scheme in ('http', 'https') and not r.url.startswith(base + '/') else None)
        p.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=45000)
        p.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
        check(not snap(p)['rendering']['compatibility'], 'Software WebGL available')
    def start(p, mode):
        p.locator(f'[data-game-mode={mode}]').click()
        p.locator('#start-button').click()
        p.wait_for_function('(m)=>capitalDriveSnapshot().started && capitalDriveSnapshot().gameMode===m', arg=mode)
    def close(p, dialog):
        p.locator(f'[data-close="{dialog}"]').click()
    def search(p, query):
        p.keyboard.press('m')
        p.locator('#map-search').fill(query)
        p.locator('#map-search-form button[type=submit]').click()
        return p.locator('#search-results button')
    def teleport_point(p, x, z):
        p.keyboard.press('m')
        canvas = p.locator('#full-map')
        rect, view = canvas.bounding_box(), snap(p)['mapView']
        size = canvas.evaluate('(e)=>({width:e.width,height:e.height})')
        px = ((x-view['x'])*view['scale']+size['width']/2)/size['width']
        py = ((z-view['z'])*view['scale']+size['height']/2)/size['height']
        check(0 <= px <= 1 and 0 <= py <= 1, 'Requested map approach is in visible map bounds')
        p.mouse.click(rect['x']+px*rect['width'], rect['y']+py*rect['height'])
        p.locator('#teleport-button').click()
        p.wait_for_function('!capitalDriveSnapshot().paused')
        observations.append({'kind':'normal map click arrival', 'requested':{'x':x,'z':z}, 'actual':snap(p)['focus']})
    def foot(p):
        if snap(p)['gameplay']['mode'] != 'foot':
            p.keyboard.press('e')
            p.wait_for_function('capitalDriveSnapshot().gameplay.mode==="foot"')
    def look(p, x, z, vertical=0):
        state = snap(p)
        desired = math.atan2(-(x-state['focus']['x']), -(z-state['focus']['z']))
        delta = (state['camera']['footYaw']-desired+math.pi)%(2*math.pi)-math.pi
        rect = p.locator('#world canvas').bounding_box()
        # Pointer capture permits a wrapped yaw drag beyond the canvas bounds.
        cx, cy = rect['x']+rect['width']/2, rect['y']+rect['height']/2
        p.mouse.move(cx, cy)
        p.mouse.down()
        p.mouse.move(cx+delta/.006, cy+vertical, steps=8)
        p.mouse.up()
        p.wait_for_timeout(250)
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            context = browser.new_context(viewport={'width':1280,'height':800})
            page = context.new_page()
            ready(page)
            start(page, 'street')
            initial = snap(page)
            page.keyboard.down('w')
            page.wait_for_timeout(1800)
            page.keyboard.up('w')
            page.keyboard.press('e')
            page.wait_for_function('capitalDriveSnapshot().gameplay.mode==="foot"', timeout=15000)
            after = snap(page)
            observations.append({'kind':'short normal road drive and stop/exit', 'before':initial, 'after':after})
            check(math.hypot(after['player']['x']-initial['player']['x'],after['player']['z']-initial['player']['z'])>1, 'Normal short road drive moves car')
            check(not after['gameplay'].get('recovery') and after['gameplay']['wanted']==0, 'Short road pass ends clear without hospital transfer')
            page.keyboard.press('2')
            check(snap(page)['gameplay']['weapon']=='unarmed', 'Fresh Street Life pistol remains locked')
            names = [s['name'] for s in snap(page)['services'] if s.get('sourceName')]
            check('Coals' in names and 'Paperback Chain' in names, 'Mapped parody registry integrated')
            page.locator('#services-button').click()
            check(all(name in page.locator('#services-list').inner_text() for name in names), 'Shops displays all mapped parody labels')
            check('Coles' not in page.locator('#services-list').inner_text(), 'Provenance business name absent from Shops copy')
            cash = snap(page)['career']['cash']
            check(page.locator('[data-service-activity=robbery]:enabled').count()==0, 'Remote fresh-career robberies disabled')
            check(snap(page)['career']['cash']==cash, 'Remote Shops inspection earns no cash')
            close(page,'services-dialog')
            results = search(page,'Coals')
            check('Coals' in results.first.inner_text(), 'Street Life searches parody name')
            results.first.click()
            check(not page.locator('#teleport-button').is_visible(), 'Street Life hides teleport')
            before = snap(page)['focus']
            page.locator('#full-map').focus()
            page.keyboard.press('Enter')
            check(snap(page)['focus']==before and snap(page)['routePoints']>0, 'Street Life normal map Enter sets route without teleport')
            if page.locator('#map-dialog').is_visible():
                close(page,'map-dialog')
            capture(page,'street-stores-route')
            page.reload(wait_until='load')
            page.wait_for_function('window.capitalDriveSnapshot?.().ready',timeout=45000)
            start(page,'free')
            sandbox_cash = snap(page)['career']['cash']
            for query in ('Coals','Paperback Chain'):
                result=search(page,query)
                check(query in result.first.inner_text(),'Free roam searches '+query)
                result.first.click()
                page.locator('#teleport-button').click()
                page.wait_for_function('!capitalDriveSnapshot().paused')
                foot(page)
                store=next(s for s in snap(page)['services'] if s['name']==query)
                look(page,store['frontage']['x'],store['frontage']['z'])
                check(snap(page)['storefronts']['visible']>0,'Mapped storefront visible near '+query)
                capture(page,'frontage-'+query.lower().replace(' ','-'))
            result=search(page,'Coles')
            check('Coals' in result.first.inner_text(),'Source-name search resolves parody display label')
            close(page,'map-dialog')
            page.locator('#services-button').click()
            check(page.locator('[data-service-activity=robbery]:enabled').count()==0,'Sandbox till actions disabled')
            check(snap(page)['career']['cash']==sandbox_cash,'Sandbox map travel earns no career cash')
            close(page,'services-dialog')
            result=search(page,'Manuka Pool')
            result.first.click()
            page.locator('#teleport-button').click()
            page.wait_for_function('!capitalDriveSnapshot().paused')
            gate=snap(page)['poolGates'][0]
            for side in ('outside','inside'):
                teleport_point(page,*gate[side])
                foot(page)
                if side=='outside':
                    look(page,gate['x'],gate['z'])
                else:
                    look(page,gate['x'],gate['z'])
                    capture(page,'pool-gate-inside-entrance')
                    pool=next(p for p in snap(page)['places'] if p['id']=='manuka-pool')
                    look(page,pool['x'],pool['z'], -45)
                capture(page,'pool-gate-'+side)
            state=snap(page)
            check(state['trafficView']['drawCalls']<=19,'Traffic adapter stays within nineteen merged draw calls')
            observations.append({'kind':'software-only renderer observations','rendering':state['rendering'],'trafficView':state['trafficView'],'storefronts':state['storefronts']})
            intervals=page.evaluate('''()=>new Promise(resolve=>{const times=[];let last=performance.now();function frame(now){times.push(now-last);last=now;if(times.length===30)resolve(times);else requestAnimationFrame(frame)}requestAnimationFrame(frame)})''')
            observations.append({'kind':'software browser RAF intervals ms; observer only, not native FPS benchmark','samples':intervals})
            context.close()
            for theme in ('dark','light'):
                phone=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
                page=phone.new_page()
                ready(page)
                start(page,'free')
                page.keyboard.press('p')
                page.locator('#theme').select_option(theme)
                page.locator('#resume-button').click()
                page.get_by_role('button',name='Enter or exit vehicle').tap()
                page.wait_for_function('capitalDriveSnapshot().gameplay.mode==="foot"')
                check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Phone '+theme+' has no horizontal overflow')
                capture(page,'phone-'+theme)
                phone.close()
            # Isolated legacy input fixture: validation only, never earned gameplay proof.
            legacy={'version':1,'cash':1234,'ownedVehicles':[{'id':'lantern','color':'#e7e6df','health':87,'stored':False}],'completedJobs':[], 'robberyCooldowns':{'crescent-kiosk':27,'manuka-store':31}}
            fixture=browser.new_context(viewport={'width':960,'height':720})
            fixture.add_init_script('localStorage.setItem("capital-drive-career-v1",'+json.dumps(json.dumps(legacy))+');')
            page=fixture.new_page()
            ready(page)
            loaded=snap(page)['career']
            check(loaded['cash']==1234 and loaded['robberyCooldowns']==legacy['robberyCooldowns'],'Isolated legacy v1 fixture accepts retired till cooldown IDs')
            check(not loaded['equipment']['pistol'],'Legacy missing equipment defaults to locked pistol')
            observations.append({'kind':'isolated legacy load fixture only','input':legacy,'loaded':loaded})
            fixture.close()
            page=None
            check(not errors,'No page or console errors')
            check(not requests,'No failed requests or HTTP errors')
            check(not external,'No external runtime requests')
    except Exception as error:
        observations.append({'failure':str(error)})
        if page is not None and not page.is_closed():
            try:
                capture(page,'failure-state')
            except Exception as capture_error:
                observations.append({'captureFailure':str(capture_error)})
        raise
    finally:
        signal.alarm(0)
        if browser is not None:
            browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report={'checks':checks,'errors':errors,'requests':requests,'external':external,'observations':observations,
                'elapsedSeconds':round(time.monotonic()-started,2),'screenshots':sorted(p.name for p in output.glob('*.png')),
                'limitations':['Software WebGL only; N100/native FPS unmeasured.','Short road pass is not long-duration driving-tuning proof.','Police, hospital tuning and robbery authority require pure suites; no positive wallet/wanted grants.','Screenshots require human review for sign legibility and pool enclosure quality.','Legacy save is an isolated validation fixture, not naturally earned gameplay.']}
        (output/'results.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2),flush=True)


if __name__=='__main__':
    main()
