#!/usr/bin/env python3
"""Ordinary sandbox UI/keyboard/held touch; no grants or injected stepping.
20s readiness; run under a 180s outer deadline. Not owner-device FPS proof.
"""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright
from test_slipstream_modes import PHONE, ROOT


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    output = Path(tempfile.mkdtemp(prefix='slipstream-sandbox-'))
    print('OUTPUT=' + str(output), flush=True)
    files = list((ROOT / 'Games/Slipstream Borough').glob('*')) + [Path(__file__)]
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    errors, observations = [], []
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
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
                def start(page):
                    page.goto(origin + '/Games/Slipstream%20Borough/')
                    page.wait_for_function('window.slipstreamSnapshot?.view?.frames>1')
                    initial = state(page)['profile']
                    page.locator('#mode').select_option('sandbox')
                    page.locator('#sandboxCar').select_option('comet')
                    menu,button=page.locator('#garage').bounding_box(),page.locator('#start').bounding_box()
                    assert button['y']>=menu['y'] and button['y']+button['height']<=menu['y']+menu['height'], ('sandbox Start below menu fold',menu,button)
                    page.locator('#start').click(); page.locator('#closeHelp').click()
                    page.wait_for_function('slipstreamSnapshot.run?.mode==="sandbox" && !slipstreamSnapshot.paused && slipstreamSnapshot.view.modelId==="comet"')
                    assert state(page)['profile'] == initial
                    return initial
                context = browser.new_context(viewport={'width':1280,'height':900}, has_touch=True)
                page = context.new_page(); watch(page); initial = start(page)
                assert page.locator('.touch-controls').is_hidden()
                page.locator('#sandboxTools summary').click()
                ids = page.locator('#testCar option').evaluate_all('es=>es.map(e=>e.value)')
                assert len(ids) == 16 and len(set(ids)) == 16
                for car in ids:
                    page.locator('#testCar').select_option(car)
                    page.wait_for_function('id=>slipstreamSnapshot.view.modelId===id', arg=car)
                    s = state(page)
                    assert s['run']['carId'] == car and s['run']['mode'] == s['view']['worldMode'] == 'sandbox'
                    assert s['view']['world'] == {'traffic':0,'police':0,'rivals':0}
                    assert s['view']['cityBlocks'] == 36 and s['profile'] == initial
                    assert page.evaluate("localStorage.getItem('slipstream-borough-v1')") is None
                page.locator('#testCar').select_option('bricklet')
                for id, steps in [('handlingScale',25),('steerResponse',2)]:
                    page.locator('#'+id).focus(); page.keyboard.press('Home')
                    for _ in range(steps): page.keyboard.press('ArrowRight')
                assert state(page)['sandboxSettings']['bricklet'] == {'handling':1.5,'response':3}
                page.locator('#testCar').select_option('comet'); page.locator('#testCar').select_option('bricklet')
                assert page.locator('#handlingValue').inner_text() == '1.50×'
                page.locator('#sandboxTools summary').click(); page.locator('#viewport').focus()
                page.keyboard.down('s'); page.wait_for_function('slipstreamSnapshot.run.speed===-6 && slipstreamSnapshot.run.world.z>1'); page.keyboard.up('s')
                back = state(page); assert back['view']['wheelAngle'] > 0 and back['run']['earnings'] == 0
                page.keyboard.down('w'); page.wait_for_function('slipstreamSnapshot.run.speed>1'); page.keyboard.up('w')
                page.keyboard.press('p'); frozen = state(page)['run']; page.wait_for_timeout(200); assert state(page)['run'] == frozen
                page.locator('#sandboxTools summary').click()
                page.screenshot(path=str(output/'desktop-tuning.jpg'), quality=76)
                page.locator('#restoreHandling').click(); assert state(page)['sandboxSettings']['bricklet'] == {'handling':1,'response':5}
                page.locator('#leave').click(); assert state(page)['profile'] == initial
                assert page.evaluate("localStorage.getItem('slipstream-borough-v1')") is None
                observations.append({'desktopAll16':ids,'reverse':back['run'],'reverseView':back['view'],'careerUnchanged':True})
                # Ordinary banked City uses the same reverse physics but retains its real reservation/settlement.
                page.locator('#mode').select_option('roam');page.locator('#start').click()
                page.wait_for_function('slipstreamSnapshot.run?.mode==="roam" && !slipstreamSnapshot.paused')
                page.locator('#viewport').focus();page.keyboard.down('s')
                try:page.wait_for_function('slipstreamSnapshot.run.speed===-6 && slipstreamSnapshot.run.world.z>1')
                finally:page.keyboard.up('s')
                city=state(page);assert city['profile']['nextRun']==2 and not city['profile']['testMode']
                page.locator('#leave').click();assert state(page)['profile']['settledRun']==1
                observations.append({'bankedCityReverse':city['run'],'reservedAndSettledOnce':True})
                context.close()
                context = browser.new_context(viewport={'width':320,'height':740}, user_agent=PHONE, is_mobile=True, has_touch=True)
                page = context.new_page(); watch(page); initial = start(page)
                assert page.locator('.touch-controls').is_visible()
                button = page.locator('[data-drive="brake"]'); button.scroll_into_view_if_needed()
                box = button.bounding_box(); cdp = context.new_cdp_session(page)
                cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':box['x']+box['width']/2,'y':box['y']+box['height']/2}]})
                try: page.wait_for_function('slipstreamSnapshot.run.speed===-6 && slipstreamSnapshot.run.world.z>1')
                finally: cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
                page.locator('#pause').tap()
                for width,height in [(320,740),(390,844),(844,390)]:
                    page.set_viewport_size({'width':width,'height':height})
                    page.locator('#sandboxTools summary').tap()
                    page.wait_for_function('document.querySelector("#sandboxTools").open')
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight')
                    boxes = {id:page.locator('#'+id).bounding_box() for id in ['sandboxTools','hud','drive','mapPanel']}
                    for b in boxes.values(): assert b['x']>=0 and b['y']>=0 and b['x']+b['width']<=width+1 and b['y']+b['height']<=height+1, boxes
                    a,b = boxes['sandboxTools'], boxes['drive']; assert a['y']+a['height']<=b['y'], boxes
                    a,b = boxes['sandboxTools'], boxes['hud']; assert a['y']>=b['y']+b['height'], boxes
                    page.screenshot(path=str(output/f'phone-{width}.jpg'), quality=76)
                    page.locator('#sandboxTools summary').tap()
                    observations.append({'phoneViewport':[width,height],'bounds':boxes,'careerUnchanged':state(page)['profile']==initial})
                page.locator('#leave').tap(); assert state(page)['profile'] == initial
                assert page.evaluate("localStorage.getItem('slipstream-borough-v1')") is None
                context.close()
                # Explicit negative fixture, not positive play evidence: malformed career bytes stay locked/preserved.
                context = browser.new_context(viewport={'width':1280,'height':900})
                context.add_init_script("localStorage.setItem('slipstream-borough-v1','{broken')")
                page=context.new_page();watch(page);start(page)
                page.locator('#leave').click();page.locator('#mode').select_option('roam')
                assert page.locator('#start').is_disabled()
                assert page.evaluate("localStorage.getItem('slipstream-borough-v1')") == '{broken'
                observations.append({'negativeFixture':'corrupt career: sandbox available, banked drive locked, raw bytes preserved'})
                context.close()
            finally: browser.close()
        assert not errors, errors
        assert all(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()==h for p,h in hashes.items())
        (output/'result.json').write_text(json.dumps({'sourceHashes':hashes,'errors':errors,'assisted':False,'observations':observations},indent=2)+'\n')
        print('PASS all16 ordinary sandbox selections, session-only tuning/defaults, keyboard and held-touch reverse, no career writes, phone bounds; corrupt-storage fixture separate.',flush=True)
    except Exception as e:
        (output/'failure.json').write_text(json.dumps({'error':repr(e),'errors':errors,'observations':observations,'sourceHashes':hashes},indent=2)+'\n')
        raise
    finally: server.shutdown(); server.server_close(); thread.join(timeout=3)


if __name__ == '__main__': main()
