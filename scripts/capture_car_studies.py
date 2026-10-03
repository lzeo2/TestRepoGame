#!/usr/bin/env python3
"""Owner-authorized visual capture. NOT the 20-second runtime acceptance gate."""
import functools
import hashlib
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
    sources = sorted((ROOT/'assets/car-arcade/showcase').glob('*.js'))
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    output = Path(tempfile.mkdtemp(prefix='car-studies-visual-'))
    errors, snapshots = [], []
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    print('VISUAL_ONLY_OUTPUT='+str(output), flush=True)
    result = {'acceptance': False, 'exit': 1, 'sources': hashes, 'errors': errors, 'snapshots': snapshots}
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            page = browser.new_page(viewport={'width':1280,'height':960}, has_touch=True)
            page.set_default_timeout(60000)
            page.set_default_navigation_timeout(20000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('requestfailed', lambda r: errors.append(r.url+':'+str(r.failure)))
            page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
            def route(r):
                if urlsplit(r.request.url).netloc == urlsplit(origin).netloc: r.continue_()
                else: errors.append('External '+r.request.url); r.abort()
            page.route('**/*', route)
            page.goto(origin+'/assets/car-arcade/showcase/')
            page.wait_for_function('window.carStudioSnapshot?.frames>0 && !carStudioSnapshot.error')
            for car in ['pip','brindle']:
                frames = page.evaluate('carStudioSnapshot.frames')
                page.locator('#car').select_option(car)
                page.wait_for_function('a=>carStudioSnapshot.id===a.id && carStudioSnapshot.frames>a.frames && carStudioSnapshot.framed', arg={'id':car,'frames':frames})
                page.locator('#studio').screenshot(path=str(output/(car+'-exterior.jpg')), quality=94)
                for _ in range(9): page.locator('#right').click()
                page.locator('#studio').screenshot(path=str(output/(car+'-rear.jpg')), quality=94)
                page.locator('#reset').click()
                page.locator('#cockpit').click()
                page.wait_for_function('carStudioSnapshot.view==="cockpit" && !carStudioSnapshot.error')
                snapshot = page.evaluate('carStudioSnapshot'); snapshots.append(snapshot)
                eye = [-.34 if car == 'pip' else -.36,1.14,.16]
                assert all(abs(a-b)<.001 for a,b in zip(snapshot['cameraLocal'],eye)), snapshot
                page.locator('#studio').screenshot(path=str(output/(car+'-cockpit.jpg')), quality=94)
                print(json.dumps(snapshot), flush=True)
                page.locator('#cockpit').click()
                page.wait_for_function('carStudioSnapshot.view==="exterior" && carStudioSnapshot.framed')
            page.set_viewport_size({'width':390,'height':844})
            page.wait_for_function('carStudioSnapshot.framed && document.documentElement.scrollWidth<=innerWidth')
            page.screenshot(path=str(output/'390-exterior.jpg'), quality=94)
            page.locator('#cockpit').tap()
            page.wait_for_function('carStudioSnapshot.view==="cockpit"')
            page.screenshot(path=str(output/'390-cockpit.jpg'), quality=94)
            browser.close()
        assert not errors, errors
        assert hashes == {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
        assert sum(p.stat().st_size for p in output.glob('*.jpg')) <= 10_000_000
        result['exit'] = 0
        print('VISUAL CAPTURE COMPLETE; not runtime/performance/legal/photo-quality certification.', flush=True)
    finally:
        (output/'capture.json').write_text(json.dumps(result, indent=2)+'\n')
        server.shutdown(); server.server_close(); thread.join(timeout=3)


if __name__ == '__main__': main()
