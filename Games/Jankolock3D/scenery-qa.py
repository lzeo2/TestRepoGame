"""Bounded scene/HUD review and native terrain-edge probe; system Chromium only.
Run from repo root: TMPDIR=/dev/shm timeout 240s python3 -B Games/Jankolock3D/scenery-qa.py
Screenshots/report go to /dev/shm/jankolock-scenery, not historical audit images.
Scene placement uses existing labeled loopback fixtures, NOT native route proof.
"""
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import subprocess
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
EDGES_ONLY = '--edges-only' in sys.argv
OUT = Path('/dev/shm/jankolock-scenery-camera' if EDGES_ONLY else '/dev/shm/jankolock-scenery')


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    processes = subprocess.check_output(['ps', '-eo', 'stat=,comm=,args='], text=True)
    assert not [line for line in processes.splitlines() if len(r := line.split(None, 2)) == 3
                and r[1] in {'chrome', 'chromium'} and not r[0].startswith('Z') and '--type=' not in r[2]], 'Sibling browser active'
    assert os.statvfs(ROOT).f_bavail * os.statvfs(ROOT).f_frsize >= 2147483648, 'Disk floor'
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'status': 'RUNNING', 'errors': [], 'responses': 0, 'captures': [], 'checks': [],
              'kind': 'Loopback API scene placements plus native keyboard edge probes; no native full-lane claim'}
    files = ['world-scene.mjs', 'environment.mjs', 'game.mjs', 'integration-ui.mjs', 'integration.css',
             'index.html', 'traversal.mjs', 'heroes/player-controller.mjs']
    hashes = lambda: {f: hashlib.sha256((Path(__file__).parent / f).read_bytes()).hexdigest() for f in files}
    report['sources'] = hashes()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8957'))),
        functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                ctx = browser.new_context(viewport={'width': 1280, 'height': 720}, reduced_motion='reduce')
                def route(r):
                    if r.request.url.startswith(origin + '/'):
                        r.continue_()
                    else:
                        report['errors'].append('Nonlocal request: ' + r.request.url); r.abort()
                ctx.route('**/*', route)
                page = ctx.new_page(); page.set_default_timeout(20000)
                page.on('pageerror', lambda e: report['errors'].append(str(e)))
                page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                page.on('requestfailed', lambda r: report['errors'].append(str(r.failure)))
                def response(r):
                    report['responses'] += 1
                    if r.status >= 400:
                        report['errors'].append(f'HTTP {r.status}: {r.url}')
                page.on('response', response)
                page.goto(origin + '/Games/Jankolock3D/index.html?qa=traversal', wait_until='networkidle', timeout=60000)
                page.wait_for_function('window.jank3dQA && window.jank3dSnapshot().diagnostics.frames > 0', timeout=60000)
                page.locator('#start').click()
                page.locator('[data-close]').click()

                def capture(name):
                    layout = page.evaluate('''() => ({overflow:document.documentElement.scrollWidth>innerWidth,
                      small:[...document.querySelectorAll('button')].filter(b=>b.getClientRects().length)
                        .filter(b=>{const r=b.getBoundingClientRect();return r.width<44||r.height<44}).map(b=>b.textContent)})''')
                    assert not layout['overflow'] and not layout['small'], layout
                    assert not page.locator('.sys-hud [data-health]').is_visible(), 'Duplicate health'
                    assert not page.locator('.integration-inventory').is_visible(), 'Empty inventory panel'
                    page.screenshot(path=str(OUT / (name + '.png')), timeout=20000, full_page=True)
                    report['captures'].append({'file': name + '.png', 'layout': layout,
                        'diagnostics': page.evaluate('jank3dSnapshot().diagnostics')})
                    print('CAPTURE ' + name, flush=True)

                # Normal native start; then freeze only for deterministic review captures.
                page.evaluate('jank3dQA.freeze()')
                if not EDGES_ONLY:
                    capture('desktop-dark-street')
                    page.locator('#theme').click(); capture('desktop-light-street')
                    page.locator('#theme').click()
                    page.set_viewport_size({'width': 390, 'height': 844})
                    capture('mobile-dark-street')
                    page.locator('#theme').click(); capture('mobile-light-street')
                    page.locator('#theme').click()
                    page.set_viewport_size({'width': 1280, 'height': 720})
                    for name, position in [('graft', {'x': -240, 'y': 0, 'z': -245}),
                                           ('greenhedge', {'x': 240, 'y': 0, 'z': -245}),
                                           ('plaza', {'x': 120, 'y': -6, 'z': 120})]:
                        page.evaluate('(p)=>jank3dQA.place(p,Math.PI,-.03)', position)
                        capture('scene-fixture-' + name)
                for name, position, limit in [('sewer', {'x': 64, 'y': -10, 'z': 20}, 65),
                                               ('plaza', {'x': 169, 'y': -6, 'z': 120}, 170)]:
                    page.evaluate('(p)=>{jank3dQA.place(p,0,0);jank3dQA.freeze(false)}', position)
                    start = page.evaluate('jank3dSnapshot().time')
                    page.locator('#game').focus(); page.keyboard.down('d')
                    try:
                        page.wait_for_function('(t)=>jank3dSnapshot().time >= t + .6', arg=start, timeout=15000)
                    finally:
                        page.keyboard.up('d')
                    page.evaluate('jank3dQA.freeze()')
                    p = page.evaluate('jank3dSnapshot().controller.position')
                    assert position['x'] + .1 < p[0] <= limit + .01 and p[1] >= position['y'] - .1, (name, p)
                    report['checks'].append({'nativeEdge': name, 'position': p, 'setup': position})
                    capture('native-edge-' + name)
                ctx.close()
            finally:
                browser.close()
        assert not report['errors'], report['errors']
        assert hashes() == report['sources'], 'Sources changed during capture'
        report['status'] = 'PASS-targeted-only'
    except Exception as e:
        report['status'] = 'FAILED'; report['failure'] = str(e); raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)
        (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f'PASS: {len(report["captures"])} captures, two native edge probes, {report["responses"]} responses, zero errors; browser/server closed')


if __name__ == '__main__':
    main()
