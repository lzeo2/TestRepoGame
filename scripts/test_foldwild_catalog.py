#!/usr/bin/env python3
"""Preview226 portal/native entry proof; not stable M2 or natural campaign acceptance.
Normal UI only. 20s entry/model readiness, 180s outer deadline; original M2 untouched.
"""
import functools
import hashlib
from http.server import ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright
from test_foldwild_core_v2 import Handler, snapshot, keyboard_to
from test_slipstream_modes import PHONE, ROOT


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    catalog=json.loads((ROOT/'games.json').read_text())
    old=json.loads(subprocess.check_output(['git','show','1673670:games.json'],cwd=ROOT))
    assert len(catalog)==117 and len({g['id'] for g in catalog})==117
    assert catalog[:-2]==old[:-1]
    assert {k:v for k,v in catalog[-2].items() if k!='desc'}=={k:v for k,v in old[-1].items() if k!='desc'}
    game=catalog[-1];assert game['id']==226 and game['cat']=='story' and game['featured'] is False
    assert game['url']=='Games/Foldwild/index.html' and '(Preview)' in game['title'] and game['desc'].startswith('Preview:')
    output=Path(tempfile.mkdtemp(prefix='foldwild-listing-'));print('OUTPUT='+str(output),flush=True)
    files=list((ROOT/'Games/Foldwild').rglob('*'))+[ROOT/'games.json',Path(__file__)]
    hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    errors,observations=[],[]
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start();origin=f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path=shutil.which('chromium'),headless=False,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            try:
                for width,height in [(1280,900),(390,844)]:
                    options={'viewport':{'width':width,'height':height},'has_touch':True}
                    if width==390:options.update(user_agent=PHONE,is_mobile=True)
                    context=browser.new_context(**options)
                    try:
                        context.route('**/*',lambda r:r.continue_() if urlsplit(r.request.url).netloc==urlsplit(origin).netloc else (errors.append('External '+r.request.url),r.abort()))
                        page=context.new_page();page.set_default_timeout(20000)
                        page.on('pageerror',lambda e:errors.append(str(e)))
                        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
                        page.on('requestfailed',lambda r:errors.append(r.url))
                        page.on('response',lambda r:errors.append(f'HTTP {r.status} {r.url}') if r.status>=400 else None)
                        page.goto(origin+'/');page.locator('.search-bar__input').fill('Foldwild')
                        card=page.locator('.game-card').filter(has=page.get_by_text(game['title'],exact=True));card.wait_for(state='visible')
                        page.locator('.search-bar__input').fill('');page.locator('.category-filter__btn[data-cat-id="story"]').click();card.wait_for(state='visible')
                        card.locator('.game-card__info').click();assert 'Preview:' in page.locator('.ux-detail__desc').inner_text();page.locator('.ux-detail__close').click()
                        card.scroll_into_view_if_needed();page.screenshot(path=str(output/f'portal-{width}.jpg'),quality=76)
                        if width==1280:card.focus();page.keyboard.press('Enter')
                        else:card.locator('.game-card__play').tap()
                        page.wait_for_function('document.fullscreenElement?.classList.contains("ux-player__frame")')
                        frame=page.locator('.ux-player__frame').element_handle().content_frame()
                        frame.wait_for_function('window.foldwildSnapshot?.phase==="menu"')
                        assert unquote(urlsplit(frame.url).path)=='/'+game['url']
                        assert frame.evaluate('localStorage.getItem("foldwild-save-v1")') is None
                        frame.locator('#seed-input').fill('1');frame.locator('#start').click()
                        frame.wait_for_function('foldwildSnapshot.phase==="world" && foldwildSnapshot.view?.mode==="world" && foldwildSnapshot.view.countLoadedModels>=1 && foldwildSnapshot.view.frames>2')
                        assert not snapshot(frame)['view']['fallbackModels']
                        before=snapshot(frame)['state']['position']
                        (output/f'before-movement-{width}.json').write_text(json.dumps({'snapshot':snapshot(frame),'document':frame.evaluate('({hidden:document.hidden,active:document.activeElement.id,focus:document.hasFocus()})')},indent=2)+'\n')
                        if width==1280:
                            frame.locator('#game-canvas').focus();page.keyboard.down('w')
                            try:frame.wait_for_function('p=>{const q=foldwildSnapshot.state.position;return (q.x-p.x)**2+(q.z-p.z)**2>.01}',arg=before)
                            finally:page.keyboard.up('w')
                        else:
                            button=frame.locator('[data-move="w"]');button.scroll_into_view_if_needed();box=button.bounding_box();cdp=context.new_cdp_session(page)
                            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]})
                            try:frame.wait_for_function('p=>{const q=foldwildSnapshot.state.position;return (q.x-p.x)**2+(q.z-p.z)**2>.01}',arg=before)
                            finally:cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
                        after=snapshot(frame)['state']['position'];assert (after['x']-before['x'])**2+(after['z']-before['z'])**2>.01
                        frame.locator('#collection-btn').click();frame.locator('#collection-close').click()
                        frame.wait_for_function('!document.querySelector("#collection-dialog").open && foldwildSnapshot.view.mode==="world"')
                        if width==1280:
                            keyboard_to(frame,-10,4,page.keyboard);frame.locator('#interact').click();frame.locator('#dialogue-start').click()
                            frame.wait_for_function('foldwildSnapshot.phase==="battle" && foldwildSnapshot.view.countLoadedModels>=2 && !foldwildSnapshot.busy')
                            round_before=snapshot(frame)['battle']['round'];frame.locator('#ability-0').click()
                            frame.wait_for_function('r=>!foldwildSnapshot.busy && foldwildSnapshot.battle.round>r',arg=round_before)
                            frame.locator('#flee').click();frame.wait_for_function('foldwildSnapshot.phase==="result" && !foldwildSnapshot.busy')
                            frame.locator('#result-continue').click();frame.wait_for_function('foldwildSnapshot.phase==="world"')
                        frame.locator('#pause').click();frame.locator('#game-canvas').scroll_into_view_if_needed()
                        assert frame.evaluate('document.documentElement.scrollWidth<=innerWidth')
                        page.screenshot(path=str(output/f'world-{width}.jpg'),quality=76)
                        s=snapshot(frame);observations.append({'viewport':[width,height],'launch':'keyboard Enter' if width==1280 else 'genuine Play tap','movement':'keyboard W' if width==1280 else 'genuine held Forward touch','before':before,'after':after,'view':s['view'],'state':s['state'],'nativeFullscreen':True,'wildTurnAndFlee':width==1280})
                    finally:context.close()
            finally:browser.close()
        assert not errors,errors
        assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in hashes.items())
        (output/'result.json').write_text(json.dumps({'sourceHashes':hashes,'errors':errors,'assisted':False,'observations':observations,'holds':'Original/async M2, inspection single-close, full campaign, physical devices remain held.'},indent=2)+'\n')
        print('PASS preview226 search/Story/Info, keyboard and genuine phone fullscreen launch, fresh original models, movement, basic ledger close and desktop natural wild turn/flee. Not M2/campaign clearance.',flush=True)
    except Exception as e:
        (output/'failure.json').write_text(json.dumps({'error':repr(e),'errors':errors,'observations':observations,'sourceHashes':hashes},indent=2)+'\n');raise
    finally:server.shutdown();server.server_close();thread.join(timeout=3)


if __name__=='__main__':main()
