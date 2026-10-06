#!/usr/bin/env python3
"""Real input: garage-first, three modes, one-time Help, UA-only phone controls.
No save grants/state mutation/injected stepping. Sprint deadline stays110s;
readiness20s. Not full campaign, hardware FPS or photorealism certification.
"""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import tempfile
import threading
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    output = Path(tempfile.mkdtemp(prefix='slipstream-modes-'))
    files = list((ROOT / 'Games/Slipstream Borough').glob('*')) + [Path(__file__), ROOT / 'assets/car-arcade/models.js']
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    errors, observations = [], []
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    print('OUTPUT=' + str(output), flush=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                def watch(page):
                    page.set_default_timeout(20000)
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                    page.on('requestfailed', lambda r: errors.append(r.url))
                    page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
                    page.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin + '/') else (errors.append('External ' + r.request.url), r.abort()))
                def state(page): return page.evaluate('slipstreamSnapshot')
                def full_scene(page):
                    page.wait_for_function('() => { const c=document.querySelector("#viewport canvas"); return c && c.clientWidth===innerWidth && c.clientHeight===innerHeight; }')
                    box = page.locator('#viewport').bounding_box()
                    assert box['x'] == box['y'] == 0
                    assert abs(box['width']-page.viewport_size['width']) <= 1 and abs(box['height']-page.viewport_size['height']) <= 1, box
                    assert page.evaluate('document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth')
                def garage(page):
                    page.wait_for_function('window.slipstreamSnapshot?.phase === "garage" && slipstreamSnapshot.view?.frames>1 && slipstreamSnapshot.view.worldMode==="garage"')
                    s = state(page); assert s['run'] is None
                    assert page.locator('#start').is_visible() and page.locator('#mode').is_visible()
                    assert page.locator('#drive').is_hidden() and page.locator('#hud').is_hidden()
                    assert page.locator('#helpDialog').is_hidden()
                    full_scene(page)
                    menu = page.locator('#garage').bounding_box(); button = page.locator('#start').bounding_box()
                    assert menu['x']>=0 and menu['y']>=0 and menu['y']+menu['height']<=page.viewport_size['height']
                    assert button['y']>=menu['y'] and button['y']+button['height']<=menu['y']+menu['height'], ('primary action below menu fold',button,menu)
                    assert 'cash' in page.locator('#modeGoal').inner_text() or 'finish' in page.locator('#modeGoal').inner_text()
                    return s
                def start(page, mode, first=False):
                    page.locator('#mode').select_option(mode); page.locator('#start').click()
                    page.wait_for_function('slipstreamSnapshot.phase==="run"')
                    if first:
                        assert page.locator('#helpDialog').is_visible() and state(page)['paused']
                        before = state(page)['run']; page.wait_for_timeout(250)
                        assert state(page)['run'] == before
                        page.locator('#closeHelp').click()
                    else:
                        assert page.locator('#helpDialog').is_hidden()
                    page.wait_for_function('!slipstreamSnapshot.paused && slipstreamSnapshot.view.worldMode===slipstreamSnapshot.run.mode')
                    assert state(page)['run']['mode'] == mode
                    full_scene(page)
                    goal = page.locator('#objective').inner_text().lower()
                    assert ('park' in goal and 'bank' in goal) if mode == 'roam' else ('three rivals' in goal) if mode == 'race' else ('evade' in goal and 'payout' in goal), goal
                def shot(page, name): page.screenshot(path=str(output / (name + '.jpg')), quality=76)
                def cockpit_ready(page):
                    page.wait_for_function('() => { const c=slipstreamSnapshot.view.camera; return c.mode==="cockpit" && c.localEye.every((v,i)=>Math.abs(v-c.driverEye[i])<1e-6); }')
                    assert state(page)['view']['camera']['near'] == .025
                def cameras(page, name):
                    assert state(page)['paused']
                    frozen = state(page)['run']
                    if state(page)['view']['camera']['mode'] == 'cockpit':
                        page.keyboard.press('c'); page.wait_for_function('slipstreamSnapshot.view.camera.mode==="chase"')
                    before = state(page)['view']['camera']
                    page.wait_for_timeout(250); assert state(page)['view']['camera'] == before, 'paused camera drifts'
                    shot(page, name+'-chase')
                    page.keyboard.press('c'); cockpit_ready(page); shot(page, name+'-cockpit')
                    assert state(page)['run'] == frozen, 'camera switching changes simulation'
                    page.locator('#cameraToggle').click(); page.wait_for_function('slipstreamSnapshot.view.camera.mode==="chase"')
                    assert page.locator('#viewport').evaluate('v=>v===document.activeElement')
                context = browser.new_context(viewport={'width':1280, 'height':900}, has_touch=True)
                page = context.new_page(); watch(page); page.goto(origin + '/Games/Slipstream%20Borough/')
                initial = garage(page)
                assert initial['profile']['cash'] == 0 and initial['profile']['nextRun'] == 1 and not initial['profile']['testMode']
                assert page.evaluate("localStorage.getItem('slipstream-borough-v1')") is None
                assert not initial['phone'] and page.locator('.touch-controls').is_hidden()
                assert page.locator('#garage details[open]').count() == 0
                shot(page, 'garage-1280')
                page.locator('#garageToggle').click(); assert page.locator('#garage').is_hidden()
                full_scene(page)
                page.locator('#garageToggle').click(); assert page.locator('#garage').is_visible()
                assert page.locator('#start').evaluate('b => b===document.activeElement')
                # Viewport width and touch capability must not switch desktop UA controls on.
                page.set_viewport_size({'width':390,'height':844})
                assert page.locator('.touch-controls').is_hidden()
                page.set_viewport_size({'width':1280,'height':900})
                start(page, 'roam', first=True)
                assert page.evaluate("localStorage.getItem('slipstream-help-v1')") == '1'
                assert len(state(page)['view']['trafficModels']) == 4
                assert state(page)['view']['cityBlocks'] == 36
                assert state(page)['view']['cityArchitecture']['batches'] <= 12
                page.keyboard.down('w'); page.keyboard.down('d')
                try: page.wait_for_function('slipstreamSnapshot.run.world.heading<-.25')
                finally: page.keyboard.up('d'); page.keyboard.up('w')
                turning = state(page)
                assert abs(turning['view']['camera']['heading']-turning['run']['world']['heading'])>.02, 'camera remains rigidly locked to car'
                assert .55 < turning['view']['camera']['carScreen'][1] < .9
                page.keyboard.press('p'); shot(page,'city-turn-chase'); page.keyboard.press('p')
                # Countersteer back toward the open street; do not drive into a wall for a capture.
                page.keyboard.down('w'); page.keyboard.down('a')
                try: page.wait_for_function('slipstreamSnapshot.run.world.heading>=-.02')
                finally: page.keyboard.up('a')
                before_cockpit = state(page)['run']['distance']
                page.keyboard.press('c'); cockpit_ready(page)
                page.wait_for_function('target=>slipstreamSnapshot.run.distance>target',arg=max(10,before_cockpit+3)); page.keyboard.up('w')
                assert state(page)['run']['distance'] > before_cockpit + 2, 'cockpit did not drive normally'
                page.locator('#pause').click(); held = state(page)['run']; page.wait_for_timeout(250)
                assert state(page)['run'] == held
                shot(page, 'city-1280'); cameras(page,'city-1280')
                # Pause button focus must not block the keyboard's resume action.
                page.keyboard.press('p'); assert not state(page)['paused']
                page.locator('#leave').click(); parked = garage(page)['profile']
                assert page.locator('#start').evaluate('b => b===document.activeElement')
                assert parked['careerDistance'] >= 10
                page.locator('summary').filter(has_text='Paint and bodywork').click()
                page.locator('#paint').fill('#173d69'); page.locator('#applyFinish').click()
                assert state(page)['profile']['customizations']['bricklet']['paint'] == '#173d69'
                # Highway modes really start, move, spawn correct entities, pause and abandon.
                start(page, 'cutup')
                assert state(page)['run']['pursuit'] == 'chased' and not state(page)['run']['rivals']
                page.locator('#cruise').check(); page.locator('#viewport').focus(); page.keyboard.down('a')
                page.wait_for_function('slipstreamSnapshot.run.x<.1'); page.keyboard.up('a')
                page.wait_for_function('slipstreamSnapshot.run.police.length>0', timeout=45000)
                page.wait_for_function('slipstreamSnapshot.view.policeModels.length>0')
                page.locator('#pause').click(); shot(page, 'cutup-1280'); cameras(page,'cutup-1280')
                assert state(page)['run']['distance'] >= 340
                page.locator('#leave').click(); after = garage(page)['profile']
                assert after['cash'] == parked['cash'] and after['careerDistance'] == parked['careerDistance']
                start(page, 'race'); assert len(state(page)['run']['rivals']) == 3
                page.locator('#viewport').focus(); page.keyboard.down('a')
                page.wait_for_function('slipstreamSnapshot.run.x<.1'); page.keyboard.up('a')
                assert not state(page)['run']['police'] and page.locator('#deploy').is_hidden()
                page.locator('#pause').click(); cameras(page,'sprint-1280'); page.keyboard.press('p')
                shot(page, 'sprint-1280'); race_start = time.monotonic()
                page.wait_for_function('slipstreamSnapshot.phase==="end"', timeout=110000)
                ended = state(page)
                assert page.locator('#resultTitle').evaluate('r => r===document.activeElement')
                full_scene(page)
                assert page.locator('#result').evaluate('r => getComputedStyle(r).position==="fixed"')
                assert ended['run']['status'] == 'finished' and not ended['profile']['testMode']
                assert ended['profile']['settledRun'] == ended['run']['id'] and ended['profile']['careerDistance'] >= 1200
                race_wall_seconds = time.monotonic()-race_start
                cash, run_id = ended['profile']['cash'], ended['run']['id']
                page.locator('#retry').click(); assert state(page)['run']['mode'] == 'race' and state(page)['run']['id'] > run_id
                assert page.locator('#helpDialog').is_hidden()
                page.locator('#leave').click(); garage(page)
                assert state(page)['profile']['cash'] == cash
                raw = page.evaluate("localStorage.getItem('slipstream-borough-v1')")
                page.reload(); loaded = garage(page)
                assert page.evaluate("localStorage.getItem('slipstream-borough-v1')") == raw
                assert loaded['profile']['cash'] == cash and loaded['helpSeen']
                observations.append({'ordinaryModes':['roam','cutup','race'], 'cityBanked':parked['careerDistance'], 'sprintResult':ended['run']['status'], 'sprintMeters':ended['run']['distance'], 'sprintWallSeconds':race_wall_seconds, 'cash':cash, 'garageReloadUnchanged':True})
                context.close()
                mobile = browser.new_context(viewport={'width':390,'height':844}, user_agent=PHONE, has_touch=True, is_mobile=True)
                page = mobile.new_page(); watch(page); page.goto(origin + '/Games/Slipstream%20Borough/'); assert garage(page)['phone']
                for width,height in [(390,844),(320,740),(844,390)]:
                    page.set_viewport_size({'width':width,'height':height})
                    for theme in ['light','dark']:
                        if page.evaluate('document.documentElement.dataset.theme || "light"') != theme: page.locator('#theme').tap()
                        for mode in ['roam','cutup','race']:
                            page.locator('#mode').select_option(mode); garage(page)
                    page.locator('#mode').select_option('roam')
                    shot(page, f'garage-{width}')
                page.set_viewport_size({'width':390,'height':844})
                start(page, 'roam', first=True)
                assert page.locator('.touch-controls').is_visible()
                page.locator('#cameraToggle').tap(); cockpit_ready(page)
                gas = page.locator('[data-drive="gas"]').bounding_box(); cdp = mobile.new_cdp_session(page)
                cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':gas['x']+gas['width']/2,'y':gas['y']+gas['height']/2}]})
                try: page.wait_for_function('slipstreamSnapshot.run.distance>2')
                finally: cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                page.locator('#pause').tap(); shot(page,'phone-touch-cockpit')
                page.locator('#cameraToggle').tap(); page.wait_for_function('slipstreamSnapshot.view.camera.mode==="chase"')
                for width,height in [(390,844),(320,740),(844,390)]:
                    page.set_viewport_size({'width':width,'height':height}); page.wait_for_timeout(120)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    for selector in ['#pause','#leave','[data-drive="gas"]','[data-drive="left"]']:
                        b = page.locator(selector).bounding_box()
                        assert b['width'] >= 44 and b['height'] >= 44 and b['y'] >= 0 and b['y']+b['height'] <= height+.1, (selector,b,height)
                    assert page.locator('.touch-controls button:visible').evaluate_all('buttons => buttons.every(b => { const r=document.createRange(); r.selectNodeContents(b); return r.getClientRects().length === 1 && b.scrollWidth <= b.clientWidth; })'), 'phone button text wraps or clips'
                    full_scene(page)
                    for selector in ['#hud','#drive']:
                        box = page.locator(selector).bounding_box()
                        assert box['x'] >= 0 and box['y'] >= 0 and box['x']+box['width'] <= width+.1 and box['y']+box['height'] <= height+.1, (selector,box)
                    assert page.locator('#hud').evaluate('hud => getComputedStyle(hud).position==="fixed"')
                    button = page.locator('#cameraToggle').bounding_box()
                    assert button['width']>=44 and button['height']>=44 and button['x']>=0 and button['x']+button['width']<=width+.1
                    hud = page.locator('#hud').bounding_box()
                    assert hud['y']>=button['y']+button['height'] or hud['x']+hud['width']<=button['x'], ('header overlaps HUD',hud,button)
                    shot(page, f'phone-{width}')
                    page.locator('#cameraToggle').tap(); cockpit_ready(page); shot(page,f'phone-{width}-cockpit')
                    page.locator('#cameraToggle').tap(); page.wait_for_function('slipstreamSnapshot.view.camera.mode==="chase"')
                observations.append({'genuineTouchGas':True,'phoneUserAgent':True,'layouts':[390,320,844], 'physicalCockpit':True,'switch':'native C/button/touch','turnLagRadians':abs(turning['view']['camera']['heading']-turning['run']['world']['heading'])})
                mobile.close()
            finally: browser.close()
        assert not errors, errors
        assert all(hashlib.sha256((ROOT / p).read_bytes()).hexdigest()==h for p,h in hashes.items())
        assert sum(p.stat().st_size for p in output.glob('*.jpg')) <= 1_500_000
        assert shutil.disk_usage(ROOT).free >= 2_000_000_000
        (output / 'result.json').write_text(json.dumps({'errors':errors,'assisted':False,'sourceHashes':hashes,'observations':observations},indent=2)+'\n')
        print('PASS real garage-first/three modes/ordinary earned Sprint/retry/reload/one-time Help/keyboard button-focus pause/UA-only controls/genuine touch/mobile bounds/local-only.',flush=True)
    except Exception as error:
        (output / 'failure.json').write_text(json.dumps({'error':str(error),'errors':errors,'sourceHashes':hashes},indent=2)+'\n'); raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=3)


if __name__ == '__main__': main()
