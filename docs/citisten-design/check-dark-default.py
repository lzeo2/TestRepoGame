"""Cache-cold first-default-dark UI proof, then one native light toggle per screen."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import hashlib
import importlib.util
import json

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA/dark-default'
spec = importlib.util.spec_from_file_location('ui_qa', ROOT / 'Games/Citisten3D/ui-qa.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


def snapshot(page):
    return page.evaluate('''() => {
      const root=document.querySelector('#ui'), style=getComputedStyle(root);
      const dialog=document.querySelector('dialog[open]');
      const scope=dialog || document.querySelector('.city-game');
      return {
        theme:root.dataset.theme, panel:style.getPropertyValue('--panel').trim(),
        ink:style.getPropertyValue('--text').trim(), accent:style.getPropertyValue('--accent').trim(),
        base:getComputedStyle(document.documentElement).backgroundColor,
        initialFocus:document.activeElement.id || document.activeElement.tagName,
        focusOutline:getComputedStyle(document.activeElement).outlineStyle,
        focusedButtons:[...scope.querySelectorAll('button:focus-visible')].map(el=>el.textContent),
        panels:[...scope.querySelectorAll('.panel')].filter(el=>el.checkVisibility()).map(el=>({
          background:getComputedStyle(el).backgroundColor, ink:getComputedStyle(el).color,
          radius:getComputedStyle(el).borderRadius, shadow:getComputedStyle(el).boxShadow
        }))
      };
    }''')


def shot(page, name):
    qa.browser_slot(); qa.disk()
    page.screenshot(path=str(OUT / name))


def main():
    qa.browser_slot(); qa.disk(); OUT.mkdir(parents=True, exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(qa.QuietHandler,directory=str(ROOT)))
    thread=Thread(target=server.serve_forever,daemon=True); thread.start()
    result={'complete':False,'scope':'UI fixtures only; reviewer grades; no integrated game entry',
            'systemPreference':'light','cacheDisabled':True,'serviceWorkersBlocked':True,
            'screens':[],'external':[],'errors':[],'failedRequests':[],
            'sourceSha256':{f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in [
                'Games/Citisten3D/ui-preview.html','Games/Citisten3D/ui.mjs','Games/Citisten3D/ui.css']}}
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            try:
                for screen in ['menu','toolbar','hud','night-alert','gameover']:
                    qa.browser_slot()
                    context=browser.new_context(viewport={'width':1440,'height':900},color_scheme='light',service_workers='block',reduced_motion='reduce')
                    page=context.new_page(); page.set_default_timeout(10000)
                    page.on('pageerror',lambda error:result['errors'].append(str(error)))
                    page.on('console',lambda message:result['errors'].append(message.text) if message.type=='error' else None)
                    page.on('request',lambda req:result['external'].append(req.url) if not req.url.startswith(('http://127.0.0.1:','data:')) else None)
                    page.on('requestfailed',lambda req:result['failedRequests'].append(req.url))
                    responses=[]
                    page.on('response',lambda response:responses.append({'path':response.url.split(f':{server.server_port}',1)[-1], 'status':response.status,'serviceWorker':response.from_service_worker}))
                    page.add_init_script('''
                      window.__defaultFrames=[];
                      function sample(){
                        const root=document.querySelector('#ui');
                        if(root){
                          const style=getComputedStyle(root);
                          window.__defaultFrames.push({time:performance.now(),theme:root.dataset.theme,
                            base:getComputedStyle(document.documentElement).backgroundColor,
                            panel:style.getPropertyValue('--panel').trim(),
                            buttonRings:[...document.querySelectorAll('dialog[open] button:focus-visible')].filter(el=>el.checkVisibility()).length});
                        }
                        if(!window.__darkCaptured)requestAnimationFrame(sample);
                      }
                      requestAnimationFrame(sample);
                    ''')
                    cdp=context.new_cdp_session(page)
                    cdp.send('Network.enable'); cdp.send('Network.setCacheDisabled',{'cacheDisabled':True})
                    page.goto(f'http://127.0.0.1:{server.server_port}/Games/Citisten3D/ui-preview.html?fixture',wait_until='networkidle',timeout=20000)
                    page.wait_for_function('window.citistenPreview && window.__defaultFrames.length')
                    page.evaluate('document.fonts.ready')
                    assert page.evaluate("localStorage.getItem('citisten-theme')") is None
                    assert page.evaluate('document.activeElement.id')=='city-menu-title'
                    assert page.locator('#city-menu-title').evaluate("el=>getComputedStyle(el).outlineStyle")=='none'
                    if screen!='menu':
                        page.locator('[data-mode="'+('defense' if screen in ['night-alert','gameover'] else 'free')+'"]').click()
                        page.evaluate('''screen=>{
                          const state={mode:screen==='night-alert'||screen==='gameover'?'defense':'free',
                            phase:screen==='night-alert'?'night':screen==='gameover'?'lost':'day',
                            night:3,score:3,kills:46,population:128,peakPopulation:240,budget:24500,
                            power:{demand:64,supply:100},water:{demand:48,supply:100},
                            townHallHp:screen==='gameover'?0:720,townHallMaxHp:1000,
                            buildings:[{type:'townhall',x:100,z:100}],zombies:[]};
                          citistenPreview.ui.update(state);
                          if(screen==='hud')citistenPreview.ui.events([{type:'placed'}]);
                          if(screen==='night-alert')citistenPreview.ui.events([{type:'wave',night:3}]);
                        }''',screen)
                        if screen=='toolbar':
                            page.locator('[data-group="Zone"]').click(); page.locator('[data-tool="residential"]').click()
                        if screen=='night-alert':
                            page.locator('[data-group="Defense"]').click(); page.locator('[data-tool="watchtower"]').click()
                    dark=snapshot(page)
                    assert dark['theme']=='dark' and dark['panel']=='#242927' and dark['ink']=='#f5f2e9'
                    assert not dark['focusedButtons'], dark
                    if screen=='gameover':
                        assert dark['initialFocus']=='city-loss-title'
                        assert page.locator('#city-loss-title').evaluate("el=>getComputedStyle(el).outlineStyle")=='none'
                    assert dark['panels'] and all(x['background']=='rgb(36, 41, 39)' and x['radius']=='4px' and x['shadow']=='none' for x in dark['panels'])
                    shot(page,f'J-dark-default-{screen}-dark.png')
                    frames=page.evaluate('''()=>{window.__darkCaptured=true;return window.__defaultFrames}''')
                    assert all(x['theme']=='dark' and x['base']=='rgb(24, 28, 27)' and not x['buttonRings'] for x in frames), frames
                    assert all(not x['panel'] or x['panel']=='#242927' for x in frames)
                    if screen=='menu':
                        qa.keyboard_focus(page,'[data-mode="free"]')
                    scope=page.locator('dialog[open]') if screen in ['menu','gameover'] else page.locator('.city-top')
                    scope.locator('[data-action="theme"]').click()
                    light=snapshot(page)
                    assert light['theme']=='light' and light['panel']=='#faf7ee' and light['ink']=='#20251f'
                    assert light['panels'] and all(x['background']=='rgb(250, 247, 238)' and x['radius']=='4px' and x['shadow']=='none' for x in light['panels'])
                    assert page.evaluate("localStorage.getItem('citisten-theme')")=='light'
                    shot(page,f'J-dark-default-{screen}-light.png')
                    context.close()
                    assert responses and all(x['status']==200 and not x['serviceWorker'] for x in responses)
                    result['screens'].append({'screen':screen,'order':['cold default dark','native light toggle'],
                                              'defaultFrames':frames,'dark':dark,'light':light,'responses':responses})
            finally:
                browser.close()
        assert not result['errors'] and not result['external'] and not result['failedRequests'],result
        result['complete']=True
        print('DARK DEFAULT CHECK PASS: 5 cache-cold default-dark screens, 5 native light-toggle proofs; no boot button rings; zero errors/external requests')
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)
        result['browserProcessChecks']=qa.PROCESS_CHECKS
        qa.disk(); (OUT/'J-dark-default-results.json').write_text(json.dumps(result,indent=2)+'\n')


if __name__=='__main__':
    main()
