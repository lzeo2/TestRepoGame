#!/usr/bin/env python3
"""Focused native M1 layout/feedback check; not a visual or release approval.
Run: PYTHONDONTWRITEBYTECODE=1 xvfb-run python3 scripts/test_foldwild_milestone_layout.py
"""
import functools
import hashlib
import json
import shutil
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from test_foldwild_core_v2 import Handler, snapshot, walk, keyboard_to
from test_foldwild_milestone import ready, battle_start

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-milestone-layout')
ORIGIN = 'http://127.0.0.1:8800'
HINT = 'Wild encounter. Weaken to half HP before using a Latch Kite.'


def targets(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
    small = page.evaluate('''[...document.querySelectorAll('button,input,select,summary')].filter(e=>{
        const r=e.getBoundingClientRect();return r.width && r.height && (r.width<44 || r.height<44)
    }).map(e=>({id:e.id,text:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))''')
    assert not small, small


def bounds(page, mobile):
    page.evaluate('scrollTo(0,0)')
    result = page.evaluate('''() => {
        const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();
            return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}};
        return {canvas:rect('#game-canvas'),viewport:rect('.viewport'),cards:rect('.combatants'),
            actions:Object.fromEntries(['ability-0','ability-1','ability-2','ability-3','capture','wait','flee'].map(id=>[id,rect('#'+id)]))};
    }''')
    targets(page)
    if mobile:
        assert result['cards']['top'] >= result['viewport']['bottom'], result
        assert result['canvas']['height'] == 230, result
        for id in result['actions']:
            assert 0 <= result['actions'][id]['top'] and result['actions'][id]['bottom'] <= page.viewport_size['height'], (id, result)
    return result


def run():
    before = shutil.disk_usage(ROOT).free
    assert before >= 2_000_000_000, 'disk guard: below 2 GB free'
    assets = sorted((ROOT / 'Games/Foldwild').rglob('*.glb'))
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in assets}
    assert len(hashes) == 80, len(hashes)
    OUTPUT.mkdir(exist_ok=True)
    report = {'stages': [], 'bounds': {}, 'views': {}, 'errors': [], 'failed_requests': [],
              'http_errors': [], 'external_requests': [], 'induced_failure_errors': []}
    server = ThreadingHTTPServer(('127.0.0.1', 8800), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def stage(name):
        report['stages'].append(name)
        print('PASS:', name, flush=True)

    def attach(context, failure=False):
        def local(route):
            if urlsplit(route.request.url).netloc != urlsplit(ORIGIN).netloc:
                report['external_requests'].append(route.request.url)
                route.abort()
            elif failure and route.request.url.endswith('.glb'):
                route.fulfill(status=503, body='Intentional model failure regression')
            else:
                route.continue_()
        context.route('**/*', local)
        page = context.new_page()
        errors = report['induced_failure_errors'] if failure else report['errors']
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        if not failure:
            page.on('requestfailed', lambda req: report['failed_requests'].append(req.url))
            page.on('response', lambda res: report['http_errors'].append(f'{res.status} {res.url}') if res.status >= 400 else None)
        page.goto(ORIGIN + '/Games/Foldwild/')
        page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
        page.locator('#seed-input').fill('1')
        page.locator('#start').click()
        return page

    def encounter(page, failure=False):
        keyboard_to(page, 0, 10)
        keyboard_to(page, -8, 4)
        walk(page, 'wild-0', -10, 4)
        page.locator('#interact').click()
        page.locator('#dialogue-cancel').click()
        page.wait_for_function('window.foldwildSnapshot.phase === "world"')
        page.locator('#interact').click()
        page.locator('#dialogue-start').click()
        if failure:
            page.wait_for_function('window.foldwildSnapshot.view.fallbackModels.length===2')
        else:
            ready(page, 'battle')
            assert page.locator('#message').inner_text() == HINT

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720})
                page = attach(context)
                ready(page, 'world')
                walk(page, 'meadow-merchant', 4, 16)
                page.locator('#interact').click()
                assert page.get_by_role('button', name='Sell Latch Kite (0)', exact=True).is_disabled()
                assert 'camp kites cannot be resold' in page.locator('#service-content').inner_text()
                page.get_by_role('button', name='Buy Latch Kite (12)', exact=True).click()
                assert snapshot(page)['state']['marks'] == 78 and snapshot(page)['state']['kites'] == 9
                page.get_by_role('button', name='Sell Recovery Patch (6)', exact=True).click()
                assert snapshot(page)['state']['marks'] == 84
                targets(page)
                page.locator('#service-close').click()
                page.locator('#collection-btn').click()
                label = page.locator('[data-uid="owned-1"] label')
                label_bounds = label.evaluate('''e=>{const r=document.createRange();r.selectNode(e.firstChild);
                    const t=r.getBoundingClientRect(),s=e.querySelector('select').getBoundingClientRect();
                    return {textWidth:t.width,textHeight:t.height,selectTop:s.top,textBottom:t.bottom,labelWidth:e.getBoundingClientRect().width}}''')
                assert label_bounds['textWidth'] < label_bounds['labelWidth'] and label_bounds['textHeight'] < 30
                assert label_bounds['selectTop'] >= label_bounds['textBottom'], label_bounds
                targets(page)
                report['ledger_label'] = label_bounds
                page.locator('#collection-close').click()
                stage('Kite Sell disabled/explained; Buy -12 and patch Sell +6; stacked ledger label')
                encounter(page)
                stage('dialogue cancel returns to world; battle begins with phase-correct hint')
                for width, height, name in [(1280,720,'desktop'), (390,844,'mobile'), (320,800,'mobile320')]:
                    page.set_viewport_size({'width': width, 'height': height})
                    page.wait_for_timeout(400)
                    report['views'][name] = ready(page, 'battle')
                    report['bounds'][name] = bounds(page, width < 899)
                    page.screenshot(path=str(OUTPUT / f'{name}-battle.jpg'), type='jpeg', quality=65)
                    stage(f'{width}x{height} native battle bounds, 44px targets and real two-model loads')
                page.set_viewport_size({'width':390,'height':844})
                page.locator('.combatants summary').first.focus()
                page.keyboard.press('Enter')
                assert page.locator('.combatants details').first.evaluate('e=>e.open')
                assert page.locator('#player-status').is_visible()
                assert page.locator('#player-hp').inner_text() and page.locator('#player-energy').inner_text()
                page.keyboard.press('Enter')
                page.locator('#pause').click()
                assert page.locator('#message').inner_text() == 'Paused. Press P or Escape to resume.'
                page.wait_for_timeout(500)
                assert page.locator('#message').inner_text().startswith('Paused.')
                page.locator('#pause').click()
                assert page.locator('#message').inner_text() == 'Expedition resumed.'
                page.locator('#ability-0').click()
                page.wait_for_function('!window.foldwildSnapshot.busy')
                assert page.locator('#message').inner_text() == 'Expedition resumed.'
                stage('keyboard status disclosure and HP/energy; pause/resume hint survives battle rerenders')
                context.close()
                for key in ['errors','failed_requests','http_errors','external_requests']:
                    assert not report[key], (key, report[key])
                stage('zero normal browser/load/external errors')
                failure_context = browser.new_context(viewport={'width':390,'height':844})
                page = attach(failure_context, failure=True)
                page.wait_for_function('window.foldwildSnapshot.view.fallbackModels.length>0')
                encounter(page, failure=True)
                warning = page.locator('#message').inner_text()
                assert warning.startswith('3D model unavailable. Marker used instead.'), warning
                page.locator('#pause').click()
                assert page.locator('#message').inner_text() == warning
                page.locator('#pause').click()
                assert page.locator('#message').inner_text() == warning
                failure_context.close()
                stage('separate intentional 503 model failures remain disclosed on battle entry/pause/resume')
                assert hashes == {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in assets}
                report['unchanged_glb_count'] = len(hashes)
                report['passed'] = True
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        report['storage_delta_bytes'] = before - shutil.disk_usage(ROOT).free
        (OUTPUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    print('PASS: focused native layout/feedback check; subjective visual review pending Main')


if __name__ == '__main__':
    run()
