#!/usr/bin/env python3
"""Ordinary keyboard/held touch only: real crashes, clear loss and same-mode respawn.
No save grants, injected stepping or game-state mutation. Readiness20s/outer120s.
Browser emulation, not physical-device/FPS or natural arrest certification.
"""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
from playwright.sync_api import sync_playwright
from test_slipstream_modes import ROOT, PHONE


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    output = Path(tempfile.mkdtemp(prefix='slipstream-recovery-'))
    files = list((ROOT / 'Games/Slipstream Borough').glob('*')) + [Path(__file__), ROOT / 'assets/car-arcade/models.js']
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    head = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    errors, observations = [], []
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    print('OUTPUT='+str(output),flush=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            try:
                def watch(page):
                    page.set_default_timeout(20000)
                    page.on('pageerror',lambda e:errors.append(str(e)))
                    page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
                    page.on('requestfailed',lambda r:errors.append(r.url))
                    page.on('response',lambda r:errors.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
                    page.route('**/*',lambda r:r.continue_() if r.request.url.startswith(origin+'/') else (errors.append('External '+r.request.url),r.abort()))
                def state(page): return page.evaluate('slipstreamSnapshot')
                def shot(page,name): page.screenshot(path=str(output/(name+'.jpg')),quality=78)
                def start(page,mode):
                    page.wait_for_function('slipstreamSnapshot?.phase==="garage" && slipstreamSnapshot.view?.frames>1')
                    page.locator('#mode').select_option(mode);page.locator('#start').click()
                    page.wait_for_function('slipstreamSnapshot.phase==="run"')
                    if page.locator('#helpDialog').is_visible():page.locator('#closeHelp').click()
                    page.wait_for_function('!slipstreamSnapshot.paused && slipstreamSnapshot.view.frames>2')
                    assert state(page)['profile']['testMode'] is False
                def map_bounds(page):
                    assert page.locator('#mapPanel').is_visible() and page.locator('#minimap').is_visible()
                    map_box=page.locator('#mapPanel').bounding_box();hud=page.locator('#hud').bounding_box();controls=page.locator('#drive').bounding_box()
                    for box in [map_box,hud,controls]:
                        assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=page.viewport_size['width']+1 and box['y']+box['height']<=page.viewport_size['height']+1,box
                    def overlap(a,b):return a['x']<b['x']+b['width'] and b['x']<a['x']+a['width'] and a['y']<b['y']+b['height'] and b['y']<a['y']+a['height']
                    assert not overlap(map_box,hud) and not overlap(map_box,controls),'map covers essential HUD/controls'
                    assert page.locator('#mapPanel summary').bounding_box()['height']>=44
                    assert page.locator('#mapInfo').inner_text()
                context=browser.new_context(viewport={'width':1280,'height':900})
                page=context.new_page();watch(page);page.goto(origin+'/Games/Slipstream%20Borough/')
                start(page,'race');map_bounds(page)
                page.keyboard.press('m');assert not page.locator('#minimap').is_visible()
                page.keyboard.press('m');map_bounds(page)
                page.locator('#mapPanel summary').focus();page.keyboard.press('Space');assert not page.locator('#minimap').is_visible()
                page.keyboard.press('Space');assert page.locator('#minimap').is_visible()
                page.locator('#viewport').focus()
                before=state(page);page.keyboard.down('w');page.keyboard.down('d')
                page.wait_for_function('slipstreamSnapshot.run.collisions>0 && slipstreamSnapshot.phase==="run"')
                page.keyboard.up('d');page.keyboard.up('w');page.keyboard.press('p')
                crash=state(page);assert crash['run']['hp']<100 and page.locator('#crashNotice').is_visible()
                assert 'Crash!' in page.locator('#crashText').inner_text() and page.locator('#recover').is_visible()
                assert abs(crash['run']['x'])<=6.2 and crash['run']['collisions']>=1 and abs(crash['view']['pose']['heading'])<=.04
                shot(page,'minor-crash')
                page.locator('#recover').click();page.wait_for_function('slipstreamSnapshot.phase==="run" && slipstreamSnapshot.run.hp===100')
                restarted=state(page)
                assert restarted['run']['mode']=='race' and restarted['run']['id']==crash['run']['id']+1
                assert restarted['profile']['cash']==before['profile']['cash']==0 and restarted['profile']['careerDistance']==0
                assert not page.locator('#cruise').is_checked() and page.locator('#helpDialog').is_hidden()
                page.keyboard.down('w');page.keyboard.down('d')
                page.wait_for_function('slipstreamSnapshot.phase==="end" && slipstreamSnapshot.respawnRemaining>0')
                page.keyboard.up('d');page.keyboard.up('w')
                wreck=state(page)
                assert wreck['run']['hp']==0 and wreck['run']['status']=='busted'
                assert page.locator('#resultTitle').inner_text()=='Car wrecked' and 'Respawning in' in page.locator('#respawnStatus').inner_text()
                assert page.locator('#resultTitle').evaluate('e=>e===document.activeElement')
                page.locator('#help').click();countdown=state(page)['respawnRemaining'];page.wait_for_timeout(450)
                assert state(page)['respawnRemaining']==countdown,'Help does not freeze respawn'
                shot(page,'wreck-help-paused');page.locator('#closeHelp').click();shot(page,'wreck-countdown')
                page.wait_for_function('id=>slipstreamSnapshot.phase==="run" && slipstreamSnapshot.run.id>id',arg=wreck['run']['id'])
                respawned=state(page)
                assert respawned['run']['mode']=='race' and respawned['run']['hp']==100 and respawned['run']['id']==wreck['run']['id']+1
                assert respawned['profile']['settledRun']==wreck['run']['id'] and respawned['profile']['cash']==wreck['profile']['cash']
                assert not page.locator('#cruise').is_checked() and respawned['steering']==0
                settled=respawned['profile'];page.wait_for_timeout(450);assert state(page)['profile']==settled
                map_bounds(page);shot(page,'race-respawn')
                observations.append({'ordinaryKeyboardCrash':crash,'manualUnpaidRestart':restarted,'ordinaryWreck':wreck,'automaticSameModeRespawn':respawned})
                context.close()
                mobile=browser.new_context(viewport={'width':390,'height':844},user_agent=PHONE,has_touch=True,is_mobile=True)
                page=mobile.new_page();watch(page);page.goto(origin+'/Games/Slipstream%20Borough/');start(page,'roam')
                assert state(page)['phone'] and page.locator('.touch-controls').is_visible()
                for width,height in [(390,844),(320,740),(844,390)]:
                    page.set_viewport_size({'width':width,'height':height});map_bounds(page);shot(page,f'map-{width}')
                page.set_viewport_size({'width':390,'height':844});gas=page.locator('[data-drive="gas"]').bounding_box();cdp=mobile.new_cdp_session(page)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':gas['x']+gas['width']/2,'y':gas['y']+gas['height']/2,'id':1}]})
                try:page.wait_for_function('slipstreamSnapshot.run.distance>6')
                finally:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                page.locator('#pause').tap();shot(page,'touch-city-map');assert state(page)['run']['distance']>6
                observations.append({'ordinaryHeldTouchCity':state(page),'mapDimensions':[[390,844],[320,740],[844,390]],'assisted':False})
                mobile.close();assert not errors,errors
                assert head==subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
                assert all(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==value for name,value in hashes.items())
                (output/'observations.json').write_text(json.dumps({'head':head,'hashes':hashes,'errors':errors,'assisted':False,'observations':observations},indent=2))
                print('PASS real collision/body loss/unpaid restart/wreck/countdown/Help freeze/once-only settlement/same-mode respawn/north-up map bounds/ordinary held phone touch. Arrest and physical hardware held.',flush=True)
            except Exception as error:
                (output/'failure.json').write_text(json.dumps({'head':head,'hashes':hashes,'errors':errors,'failure':str(error),'assisted':False},indent=2))
                try:
                    page.screenshot(path=str(output/'failure.jpg'),quality=78)
                    (output/'failure-state.json').write_text(json.dumps(state(page),indent=2))
                except Exception:pass
                raise
            finally:browser.close()
    finally:server.shutdown();server.server_close()

if __name__=='__main__':main()
