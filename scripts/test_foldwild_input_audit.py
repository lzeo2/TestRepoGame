#!/usr/bin/env python3
"""Observation-only mobile close reproducer; no runtime edits or state injection.
Run: timeout --signal=TERM --kill-after=10s 600s xvfb-run -a python3 -B scripts/test_foldwild_input_audit.py
Diagnostic only, not the unchanged M2 acceptance gate. Requires Main's Foldwild
checkout lease and existing Chromium/Playwright.
"""
import functools
import json
import shutil
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright
from test_foldwild_core_v2 import Handler, snapshot
from test_foldwild_m2 import layout, preview
from test_foldwild_milestone import ready, source_hashes

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'http://127.0.0.1:8811'

# Called only after the original single tap, never before the input under test.
OBSERVE = '''() => {
    const s=window.foldwildSnapshot, d=document.getElementById('collection-dialog');
    const c=document.getElementById('game-canvas'), b=document.getElementById('collection-close');
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    const r=b.getBoundingClientRect(), hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
    return {phase:s.phase,battle:s.battle,paused:s.paused,busy:s.busy,view:s.view,
        dialogOpen:d.open,inspectorHidden:document.getElementById('ledger-inspector').hidden,
        canvasParent:c.parentElement.id||c.parentElement.className,
        activeElement:document.activeElement.id,closeBounds:rect(b),canvasBounds:rect(c),
        closeHit:hit?.id,innerWidth,innerHeight,dpr:devicePixelRatio,
        scroll:{x:scrollX,y:scrollY,dialog:d.scrollTop},
        visualViewport:{width:visualViewport.width,height:visualViewport.height,
            scale:visualViewport.scale,offsetLeft:visualViewport.offsetLeft,
            offsetTop:visualViewport.offsetTop,pageLeft:visualViewport.pageLeft,pageTop:visualViewport.pageTop}};
}'''

# Install only after the failure is already recorded. No retries are performed.
AFTER_FAILURE = '''() => {
    window.__foldwildInputAuditEvents=[];
    for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture',
        'touchstart','touchend','click','resize','scroll']) {
        window.addEventListener(type,e=>window.__foldwildInputAuditEvents.push({
            type:e.type,target:e.target.id, trusted:e.isTrusted,time:performance.now()}),true);
    }
}'''


def run():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000, 'disk guard: below 2 GB free'
    assert (ROOT / 'Games/Foldwild/index.html').is_file(), 'Main checkout lease required'
    hashes = source_hashes()
    cases, errors, failed, http, external = [], [], [], [], []
    server = ThreadingHTTPServer(('127.0.0.1', 8811), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    with tempfile.TemporaryDirectory(prefix='foldwild-input-audit-') as output:
        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                    args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
                print('BROWSER', browser.version, flush=True)
                try:
                    for number in range(1, 9):
                        context = browser.new_context(viewport={'width': 390, 'height': 700}, has_touch=True, is_mobile=True)
                        try:
                            def local_only(route):
                                if urlsplit(route.request.url).netloc != urlsplit(ORIGIN).netloc:
                                    external.append(route.request.url)
                                    route.abort()
                                else:
                                    route.continue_()
                            context.route('**/*', local_only)
                            page = context.new_page()
                            page.set_default_timeout(10000)
                            page.on('pageerror', lambda e: errors.append(str(e)))
                            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                            page.on('requestfailed', lambda r: failed.append(r.url))
                            page.on('response', lambda r: http.append(f'{r.status} {r.url}') if r.status >= 400 else None)
                            page.goto(ORIGIN + '/Games/Foldwild/')
                            page.wait_for_function('window.foldwildSnapshot?.phase==="menu"')
                            page.locator('#seed-input').fill('1')
                            page.locator('#start').tap()
                            ready(page, 'world')
                            before = snapshot(page)['state']['position']
                            heading = snapshot(page)['view']['cameraYaw']
                            page.locator('#collection-btn').tap()
                            preview(page, '[data-inspect="owned-1"]')
                            page.locator('#ledger-model-host').scroll_into_view_if_needed()
                            box = page.locator('#game-canvas').bounding_box()
                            session = context.new_cdp_session(page)
                            contact = {'id': 1, 'x': box['x'] + box['width'] * .3, 'y': box['y'] + box['height'] * .5}
                            session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [contact]})
                            contact['x'] += box['width'] * .35
                            session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [contact]})
                            session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                            session.detach()
                            assert abs(snapshot(page)['view']['inspectionYaw']) > .1
                            assert snapshot(page)['view']['cameraYaw'] == heading
                            assert snapshot(page)['state']['position'] == before
                            layout(page)
                            page.screenshot(path=str(Path(output) / '390.jpg'), type='jpeg', quality=55)
                            page.set_viewport_size({'width': 320, 'height': 700})
                            page.wait_for_function('''() => {
                                const r=document.getElementById('game-canvas').getBoundingClientRect();
                                return innerWidth===320 && window.foldwildSnapshot.view.width===Math.floor(r.width);
                            }''')
                            layout(page)
                            assert page.evaluate('''() => {
                                const heading=document.querySelector('#collection-dialog .dialog-heading');
                                const title=heading.querySelector('h2').getBoundingClientRect();
                                const close=document.getElementById('collection-close');
                                const r=close.getBoundingClientRect();
                                const name=document.getElementById('ledger-model-name').getBoundingClientRect();
                                return title.top>=r.top && title.bottom<=r.bottom && r.top>=0 && r.bottom<=innerHeight &&
                                    document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===close &&
                                    name.top>=heading.getBoundingClientRect().bottom;
                            }'''), '320px ledger heading/name/hit test failed'
                            page.screenshot(path=str(Path(output) / '320.jpg'), type='jpeg', quality=55)
                            page.locator('#collection-close').tap()
                            page.wait_for_timeout(1000)
                            observed = page.evaluate(OBSERVE)
                            case = {'case': number, 'after1s': observed}
                            if observed['dialogOpen'] or observed['view']['mode'] != 'world':
                                page.evaluate(AFTER_FAILURE)
                                page.wait_for_timeout(29000)
                                case['after30s'] = page.evaluate(OBSERVE)
                                case['eventsAfterFailure'] = page.evaluate('window.__foldwildInputAuditEvents')
                            case['passed'] = not observed['dialogOpen'] and observed['view']['mode'] == 'world'
                            assert snapshot(page)['state']['position'] == before
                            cases.append(case)
                            print('CASE', json.dumps(case), flush=True)
                        finally:
                            context.close()
                finally:
                    browser.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)
            report = {'cases': len(cases), 'passes': sum(c['passed'] for c in cases),
                'errors': errors, 'failed_requests': failed, 'http_errors': http,
                'external_requests': external, 'source_unchanged': hashes == source_hashes()}
            print('SUMMARY', json.dumps(report), flush=True)
    assert hashes == source_hashes(), 'runtime source changed during observation'
    assert not any([errors, failed, http, external]), 'browser or network errors'
    assert len(cases) == 8 and all(c['passed'] for c in cases), 'single native close remains held'


if __name__ == '__main__':
    run()
