#!/usr/bin/env python3
"""Ordinary UI/keyboard/touch: earn cash, customize, buy/mount and deploy gadgets."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import tempfile
import threading
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    output = Path(tempfile.mkdtemp(prefix='slipstream-gadgets-'))
    errors = []
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    print('OUTPUT='+str(output), flush=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            context = browser.new_context(viewport={'width':1280,'height':900}, has_touch=True)
            page = context.new_page(); page.set_default_timeout(20000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('requestfailed', lambda r: errors.append(r.url+':'+str(r.failure)))
            page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
            page.route('**/*', lambda r: r.continue_() if urlsplit(r.request.url).netloc == urlsplit(origin).netloc else (errors.append('External '+r.request.url), r.abort()))
            page.goto(origin+'/Games/Slipstream%20Borough/')
            page.wait_for_function('window.slipstreamSnapshot?.view?.frames>1')
            assert page.evaluate('slipstreamSnapshot.profile.cash===0 && !slipstreamSnapshot.profile.testMode')
            page.locator('#paint').fill('#173d69'); page.locator('#wheelColor').fill('#b59a61')
            page.locator('#applyFinish').click()
            page.wait_for_function('slipstreamSnapshot.view.customization.paint==="173d69" && slipstreamSnapshot.view.customization.wheels==="b59a61"')
            page.locator('#mode').select_option('race'); page.locator('#start').click()
            page.keyboard.down('a'); page.wait_for_function('slipstreamSnapshot.run.x<.1'); page.keyboard.up('a')
            page.wait_for_function('slipstreamSnapshot.phase==="end"', timeout=110000)
            result = page.evaluate('slipstreamSnapshot'); earned=result['profile']['cash']
            assert result['run']['status']=='finished' and earned>=400 and not result['profile']['testMode']
            print('NATURAL earnings='+str(earned), flush=True)
            page.locator('#garageButton').click()
            page.locator('#gadget').select_option('smoke'); page.locator('#fitGadget').click()
            assert page.evaluate('slipstreamSnapshot.profile.customizations.bricklet.gadget')=='smoke'
            assert page.evaluate('slipstreamSnapshot.profile.cash')==earned-150
            page.wait_for_function('slipstreamSnapshot.view.customization.mounted==="smoke"')
            page.locator('#viewport').screenshot(path=str(output/'garage-smoke.jpg'), quality=92)
            page.reload(); page.wait_for_function('window.slipstreamSnapshot?.view?.frames>1')
            assert page.evaluate('slipstreamSnapshot.profile.customizations.bricklet.paint')=='#173d69'
            assert page.evaluate('slipstreamSnapshot.profile.customizations.bricklet.gadget')=='smoke'
            page.locator('#mode').select_option('cutup'); page.locator('#start').click()
            page.keyboard.down('a'); page.wait_for_function('slipstreamSnapshot.run.x<.1'); page.keyboard.up('a')
            page.wait_for_function('slipstreamSnapshot.run.police.length>0', timeout=45000)
            page.keyboard.press('Space')
            page.wait_for_function('slipstreamSnapshot.run.deployments===1 && slipstreamSnapshot.view.effects.smokePuffs===12')
            assert page.evaluate('slipstreamSnapshot.run.charges')==2
            assert page.locator('#deploy').is_disabled()
            page.locator('#viewport').screenshot(path=str(output/'smoke-pursuit.jpg'), quality=92)
            page.locator('#pause').click(); before=page.evaluate('slipstreamSnapshot.run.gadgetTime'); page.wait_for_timeout(200)
            assert page.evaluate('slipstreamSnapshot.run.gadgetTime')==before
            page.locator('#leave').click()
            page.locator('#gadget').select_option('emp'); page.locator('#fitGadget').click()
            assert page.evaluate('slipstreamSnapshot.profile.cash')==earned-400
            page.set_viewport_size({'width':390,'height':844})
            page.locator('#start').tap(); page.wait_for_function('slipstreamSnapshot.run.police.length>0', timeout=45000)
            page.locator('#deploy').tap()
            page.wait_for_function('slipstreamSnapshot.run.deployments===1 && slipstreamSnapshot.view.effects.empVisible')
            assert page.evaluate('slipstreamSnapshot.run.charges')==1
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            box=page.locator('#deploy').bounding_box(); assert box['width']>=44 and box['height']>=44
            page.screenshot(path=str(output/'390-emp.jpg'), quality=92)
            for width,height in [(320,740),(390,844)]:
                page.set_viewport_size({'width':width,'height':height})
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            print('PASS ordinary earned customization/save/load/mounts; keyboard smoke, actual touch EMP; pause freezes timers.', flush=True)
            assert not errors, errors
            (output/'result.json').write_text(json.dumps({'earned':earned,'errors':errors,'assisted':False},indent=2)+'\n')
            browser.close()
    finally:
        server.shutdown();server.server_close();thread.join(timeout=3)


if __name__ == '__main__': main()
