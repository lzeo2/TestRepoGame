#!/usr/bin/env python3
"""Native unseeded Garage Borough check; no state grants. Software WebGL, not FPS certification."""
import functools
import json
import os
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('GARAGE_UI_OUTPUT', '/tmp/garage-ui-103'))

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

def run():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    OUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors, external, failed = [], [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context(viewport={'width':1280, 'height':900}, has_touch=True)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('request', lambda r: external.append(r.url) if urlsplit(r.url).hostname not in ('127.0.0.1', None) else None)
            page.on('requestfailed', lambda r: failed.append(r.url))
            page.goto(f'http://127.0.0.1:{server.server_port}/Games/Garage%20Borough/')
            page.wait_for_function('window.garageSnapshot?.view?.triangles > 0')
            snap = lambda: page.evaluate('window.garageSnapshot')
            assert snap()['business']['cash'] == 800
            assert not snap()['business']['inventory']
            assert page.evaluate('Object.isFrozen(garageSnapshot.business.customers[0])')
            page.get_by_role('button', name='Start business', exact=True).click()
            page.get_by_role('button', name='Buy Bricklet80 / $200', exact=True).click()
            page.wait_for_function('garageSnapshot.business.inventory.length === 1')
            assert snap()['business']['cash'] == 600
            page.get_by_role('button', name='Restore +25 / $50', exact=True).click()
            page.wait_for_function('garageSnapshot.business.inventory[0].condition === 70')
            assert snap()['business']['cash'] == 550
            page.get_by_role('button', name='Pause', exact=True).click()
            state = snap()['business']
            assert snap()['paused']
            page.locator('#scene').focus()
            angle = snap()['view']['angle']
            page.keyboard.press('ArrowRight')
            assert snap()['view']['angle'] > angle
            for width in [1280,390,320]:
                page.set_viewport_size({'width':width,'height':900})
                page.locator('#scene').scroll_into_view_if_needed()
                page.wait_for_function('document.documentElement.scrollWidth <= innerWidth')
                for theme in ['light','dark']:
                    if page.evaluate('document.documentElement.dataset.theme || "light"') != theme:
                        page.locator('#theme').click()
                    page.locator('#scene').scroll_into_view_if_needed()
                    page.screenshot(path=str(OUT/f'garage-{width}-{theme}.png'))
            # Actual touchscreen input to an accessible rotation button.
            angle = snap()['view']['angle']
            page.get_by_role('button', name='Rotate car left', exact=True).tap()
            assert snap()['view']['angle'] < angle
            assert snap()['business'] == state, 'Paused inspection must not advance business'
            raw = page.evaluate('localStorage.getItem("garage-borough-v1")')
            page.once('dialog', lambda dialog: dialog.dismiss())
            page.get_by_role('button', name='Reset business', exact=True).click()
            assert page.evaluate('localStorage.getItem("garage-borough-v1")') == raw
            assert snap()['business'] == state
            page.reload()
            page.wait_for_function('window.garageSnapshot?.view?.triangles > 0')
            assert snap()['business'] == state, 'Exact clock, buyers, cash and stock reload'
            page.get_by_role('button', name='Open saved business', exact=True).click()
            page.get_by_role('button', name='Sell to #1 / $500', exact=True).click()
            page.wait_for_function('garageSnapshot.business.sales === 1')
            page.get_by_role('button', name='Pause', exact=True).click()
            result=snap()
            assert result['business']['cash'] == 1050
            assert result['business']['reputation'] == 1
            assert result['business']['inventory'] == []
            assert all(c['uid'] != 1 for c in result['business']['customers'])
            assert result['view']['triangles'] < 100000
            assert result['view']['drawCalls'] <= 100
            print(json.dumps({'native':'PASS normal buy/repair/sell, pause, exact reload, reset cancel, keyboard/touch rotation', 'result':result, 'consoleErrors':errors, 'external':external, 'failedRequests':failed}, indent=2))
            assert not errors and not external and not failed
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000

if __name__ == '__main__':
    run()
