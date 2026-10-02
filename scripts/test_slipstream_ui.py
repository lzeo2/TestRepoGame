#!/usr/bin/env python3
"""Bounded native-input checks; no state grants. Optional assisted Radio test via env."""
import functools
import http.server
import json
import os
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.tmp' / 'slipstream-ui'
OUT.mkdir(parents=True, exist_ok=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/Games/Slipstream%20Borough/'
errors, results = [], []
def snapshot(page):
    return page.evaluate('window.slipstreamSnapshot')
def wait(page, expr, timeout=15000):
    page.wait_for_function(expr, timeout=timeout)
def shot(page, name):
    page.screenshot(path=str(OUT / (name + '.png')))
def observe(page):
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('requestfailed', lambda r: errors.append('request: ' + r.url))
    page.on('response', lambda r: errors.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
    page.on('request', lambda r: errors.append('external: ' + r.url) if not r.url.startswith(('http://127.0.0.1:', 'data:')) else None)

def run_group(name, fn):
    try:
        fn()
        results.append((name, 'PASS'))
    except Exception as e:
        results.append((name, 'FAIL: ' + str(e)))
    print(json.dumps(results[-1]), flush=True)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), headless=False,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        def desktop():
            context = browser.new_context(viewport={'width': 1280, 'height': 850})
            page = context.new_page(); observe(page); page.goto(url)
            wait(page, 'window.slipstreamSnapshot?.view?.frames > 2')
            s = snapshot(page); assert s['profile']['owned'] == ['bricklet'] and s['profile']['cash'] == 0
            assert s['view']['triangles'] > 1000 and s['view']['modelId'] == 'bricklet'
            assert page.evaluate('Object.isFrozen(slipstreamSnapshot.profile.owned)')
            shot(page, 'desktop-garage')
            page.locator('#mode').select_option('race'); page.locator('#start').click()
            wait(page, 'slipstreamSnapshot.run.distance > 2')
            page.keyboard.down('a'); wait(page, 'slipstreamSnapshot.run.x < .15'); page.keyboard.up('a')
            wait(page, 'slipstreamSnapshot.run.distance > 20')
            assert snapshot(page)['run']['rivals'].__len__() == 3
            shot(page, 'desktop-chase')
            print('DESKTOP', json.dumps(snapshot(page)['view']), flush=True)
            page.keyboard.press('p'); before = snapshot(page)['run']['elapsed']; page.wait_for_timeout(150)
            assert snapshot(page)['run']['elapsed'] == before
            page.keyboard.press('p')
            wait(page, "slipstreamSnapshot.phase === 'end'", 110000)
            ended = snapshot(page); assert ended['run']['status'] != 'running'
            assert ended['profile']['settledRun'] == ended['run']['id']
            print('NATURAL_RESULT', json.dumps({k: ended['run'][k] for k in ['status','place','earnings','distance','hp']}), flush=True)
            page.locator('#retry').click(); wait(page, 'slipstreamSnapshot.run.id > 1')
            page.locator('#leave').click()
            raw = page.evaluate("localStorage.getItem('slipstream-borough-v1')")
            page.locator('#reset').click(); page.locator('#cancelReset').click()
            assert page.evaluate("localStorage.getItem('slipstream-borough-v1')") == raw
            page.reload(); wait(page, 'window.slipstreamSnapshot?.view?.frames > 1')
            assert snapshot(page)['phase'] == 'garage' and snapshot(page)['run'] is None
            assert snapshot(page)['profile']['cash'] == ended['profile']['cash']
            context.close()
        run_group('ordinary desktop start/race/retry/save/reload/reset cancellation', desktop)
        def mobile390():
            context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True)
            page = context.new_page(); observe(page); page.goto(url); wait(page, 'window.slipstreamSnapshot?.view?.frames > 1')
            shot(page, '390-garage'); page.locator('#start').tap(); wait(page, 'slipstreamSnapshot.run.distance > 1')
            button = page.locator('[data-drive="left"]'); button.scroll_into_view_if_needed(); b = button.bounding_box()
            session = context.new_cdp_session(page)
            session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':b['x']+b['width']/2,'y':b['y']+b['height']/2}]})
            wait(page, 'slipstreamSnapshot.run.x < 1')
            session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
            page.locator('#viewport').scroll_into_view_if_needed(); shot(page, '390-chase')
            print('TOUCH', json.dumps(snapshot(page)['view']), flush=True)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            context.close()
        run_group('390 native held touch steering', mobile390)
        def narrow():
            context = browser.new_context(viewport={'width':320,'height':740}, has_touch=True, is_mobile=True)
            page = context.new_page(); observe(page); page.goto(url); wait(page, 'window.slipstreamSnapshot?.view?.frames > 1')
            page.locator('#theme').tap(); shot(page, '320-dark-garage')
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('#start').tap(); wait(page, 'slipstreamSnapshot.run.distance > 1'); page.locator('#viewport').scroll_into_view_if_needed(); shot(page, '320-dark-chase')
            context.close()
        run_group('320 dark layout and actual chase', narrow)
        def assisted():
            code = os.environ.get('SLIPSTREAM_RADIO_PHRASE')
            assert code, 'Assisted Radio phrase not supplied; not run'
            context = browser.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True)
            page = context.new_page(); observe(page); page.goto(url); wait(page, 'window.slipstreamSnapshot?.view?.frames > 1')
            assert not snapshot(page)['profile']['testMode']
            page.locator('#phrase').fill(code); page.locator('#radio button').tap()
            s = snapshot(page); assert s['profile']['testMode'] and len(s['profile']['owned']) == 16 and s['profile']['cash'] == 10**9
            page.locator('#upgrades button').first.tap(); assert snapshot(page)['profile']['upgrades']['bricklet']['engine'] == 1
            assert snapshot(page)['profile']['cash'] == 10**9
            context.close()
        run_group('ASSISTED Radio unlock16/free upgrade (not natural progression)', assisted)
        browser.close()
finally:
    server.shutdown(); server.server_close()
print(json.dumps({'groups':results,'native_errors':errors}, indent=2), flush=True)
raise SystemExit(0 if all(status == 'PASS' for _, status in results) and not errors else 1)
