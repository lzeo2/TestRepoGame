#!/usr/bin/env python3
"""Native, normal-input Foldwild M1 proof. Not a campaign or Chromebook gate.
Run: xvfb-run python3 scripts/test_foldwild_milestone.py
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

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-milestone-qa')
ORIGIN = 'http://127.0.0.1:8799'
SAVE_KEY = 'foldwild-save-v1'


def source_hashes():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted((ROOT / 'Games/Foldwild').glob('*'))
            if p.suffix in {'.js', '.html', '.css'}}


def ready(page, mode):
    page.wait_for_function('''mode => {const v=window.foldwildSnapshot.view;
        return v && v.mode===mode && v.countLoadedModels >= (mode==='battle'?2:1)
        && v.frames>2}''', arg=mode, timeout=30000)
    v = snapshot(page)['view']
    assert not v['fallbackModels'] and not v['hiddenAvailable'], v
    assert v['cacheSize'] <= 12, v
    assert v['width'] <= (960 if v['quality'] == 'low' else 1280), v
    assert v['height'] <= (540 if v['quality'] == 'low' else 720), v
    return v


def battle_start(page):
    page.locator('#interact').click()
    assert snapshot(page)['phase'] == 'dialogue'
    page.locator('#dialogue-start').click()
    return ready(page, 'battle')


def run():
    free_before = shutil.disk_usage(ROOT).free
    assert free_before >= 2_000_000_000, 'disk guard: below 2 GB free'
    assert (ROOT / 'docs/foldwild-core-v2.md').is_file(), 'wait for core v2 milestone'
    hashes = source_hashes()
    OUTPUT.mkdir(exist_ok=True)
    summary = {'stages': [], 'budgets': {}, 'source_hashes': hashes, 'screenshots': [],
               'errors': [], 'failed_requests': [], 'http_errors': [], 'external_requests': [],
               'model_requests': []}
    server = ThreadingHTTPServer(('127.0.0.1', 8799), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def attach(context):
        def local_only(route):
            if urlsplit(route.request.url).netloc != urlsplit(ORIGIN).netloc:
                summary['external_requests'].append(route.request.url)
                route.abort()
            else:
                route.continue_()
        context.route('**/*', local_only)
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda error: summary['errors'].append(str(error)))
        page.on('console', lambda msg: summary['errors'].append(msg.text) if msg.type == 'error' else None)
        page.on('requestfailed', lambda req: summary['failed_requests'].append(req.url))
        page.on('response', lambda res: summary['http_errors'].append(f'{res.status} {res.url}') if res.status >= 400 else None)
        page.on('request', lambda req: summary['model_requests'].append(urlsplit(req.url).path) if req.url.endswith('.glb') else None)
        page.goto(ORIGIN + '/Games/Foldwild/')
        page.wait_for_function('window.foldwildSnapshot?.phase==="menu"')
        return page

    def shot(page, name):
        page.evaluate('scrollTo(0,0)')
        path = OUTPUT / f'{name}.jpg'
        page.screenshot(path=str(path), type='jpeg', quality=55)
        assert path.stat().st_size < 300000, path.stat().st_size
        summary['screenshots'].append({'file': path.name, 'bytes': path.stat().st_size})

    def stage(name):
        summary['stages'].append(name)
        print('PASS:', name, flush=True)

    def layout(page):
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
        small = page.evaluate('''[...document.querySelectorAll('button, select')].filter(e=>{
            const r=e.getBoundingClientRect();return r.width && r.height && (r.width<44 || r.height<44)
        }).map(e=>({id:e.id,text:e.textContent,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))''')
        assert not small, small

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                desktop = browser.new_context(viewport={'width': 1280, 'height': 720})
                page = attach(desktop)
                page.locator('#seed-input').fill('1')
                page.locator('#start').click()
                summary['budgets']['desktop_world'] = ready(page, 'world')
                assert page.evaluate('Object.getOwnPropertyDescriptor(window,"foldwildSnapshot").set===undefined && Object.isFrozen(window.foldwildSnapshot.state.roster[0])')
                assert snapshot(page)['state']['marks'] == 90
                layout(page)
                shot(page, 'desktop-world')
                stage('native seed-1 starter, read-only snapshot and real village models')
                page.locator('#quality').select_option('standard')
                page.wait_for_function('window.foldwildSnapshot.view.quality==="standard"')
                summary['budgets']['desktop_standard'] = ready(page, 'world')
                page.locator('#quality').select_option('low')
                page.wait_for_function('window.foldwildSnapshot.view.quality==="low"')

                walk(page, 'meadow-merchant', 4, 16)
                page.locator('#interact').click()
                page.get_by_role('button', name='Buy Latch Kite (12)', exact=True).click()
                assert snapshot(page)['state']['marks'] == 78 and snapshot(page)['state']['kites'] == 9
                page.get_by_role('button', name='Sell Recovery Patch (6)', exact=True).click()
                assert snapshot(page)['state']['marks'] == 84 and snapshot(page)['state']['inventory']['patch'] == 1
                shot(page, 'desktop-shop')
                page.get_by_role('button', name='Accessories', exact=True).click()
                page.get_by_role('button', name='Paper Badge: 20 Marks', exact=True).click()
                assert snapshot(page)['state']['marks'] == 64
                page.locator('#service-close').click()
                page.locator('#collection-btn').click()
                page.locator('[data-uid="owned-1"] select').select_option('badge')
                page.locator('#collection-close').click()
                stage('merchant kite -12, patch +6, badge -20 and UID equip')

                keyboard_to(page, 0, 10)
                keyboard_to(page, 0, -18)
                keyboard_to(page, 16, -18)
                walk(page, 'supply-1', 18, -18)
                page.locator('#interact').click()
                assert snapshot(page)['state']['inventory']['fiber'] == 4
                assert snapshot(page)['state']['claimedSupplies'] == ['0:supply-1']
                keyboard_to(page, 0, -18)
                keyboard_to(page, 0, 10)
                walk(page, 'meadow-counter', 4, 10)
                page.locator('#interact').click()
                page.get_by_role('button', name='Deliver 3 fiber', exact=True).click()
                assert snapshot(page)['state']['marks'] == 99 and snapshot(page)['state']['inventory']['fiber'] == 1
                assert page.get_by_role('button', name='Delivery complete', exact=True).is_disabled()
                page.locator('#service-close').click()
                walk(page, 'meadow-mentor', 8, 10)
                page.locator('#interact').click()
                page.get_by_role('button', name='Choose Quartermaster', exact=True).click()
                assert snapshot(page)['state']['activeClass'] == 'quartermaster'
                page.locator('#service-close').click()
                stage('normal walking, Pathfinder fiber bonus, one-shot contract and natural Quartermaster')

                # Actual cottage collision, not a position write or synthetic save.
                page.locator('#game-canvas').focus()
                page.keyboard.down('w')
                page.wait_for_timeout(1800)
                page.keyboard.up('w')
                p = snapshot(page)['state']['position']
                assert 7.34 <= p['z'] < 9 and abs(p['x']-8) < .4, p
                page.wait_for_timeout(200)
                assert snapshot(page)['state']['position'] == p, 'held movement failed to release'
                keyboard_to(page, 0, 10)
                keyboard_to(page, -8, 4)
                walk(page, 'wild-0', -10, 4)
                summary['budgets']['desktop_battle'] = battle_start(page)
                shot(page, 'desktop-battle')
                assert snapshot(page)['battle']['player']['classId'] == 'quartermaster'
                assert snapshot(page)['battle']['synergyEnabled']
                page.locator('#game-canvas').focus()
                page.keyboard.press('1')
                page.wait_for_function('!window.foldwildSnapshot.busy')
                assert page.locator('#capture').is_enabled(), snapshot(page)['battle']
                for _ in range(6):
                    page.locator('#capture').click()
                    page.wait_for_function('!window.foldwildSnapshot.busy')
                    if snapshot(page)['phase'] == 'result':
                        break
                s = snapshot(page)
                assert s['battle']['result'] == 'captured', s['battle']
                captured = s['state']['roster'][-1]
                assert captured['uid'] == 'owned-2' and captured['speciesId'] == 'budriv'
                assert sum(captured['profile'].values()) == 0 and any(captured['profile'].values())
                assert s['state']['marks'] == 121 and s['state']['encounterIndex'] == 1
                stage('cottage collision, native keyboard weakening and actual seeded Budriv capture')
                page.locator('#result-continue').click()
                page.locator('#collection-btn').click()
                owned = page.locator('[data-uid="owned-2"]')
                owned.get_by_role('button', name='Remove from team', exact=True).click()
                assert snapshot(page)['state']['team'] == ['owned-1']
                owned = page.locator('[data-uid="owned-2"]')
                owned.get_by_role('button', name='Add to team', exact=True).click()
                page.locator('[data-uid="owned-2"] select').select_option('badge')
                page.locator('[data-uid="owned-2"]').get_by_role('button', name='Favorite', exact=True).click()
                page.locator('#ledger-search').fill('Budriv')
                assert 'Undiscovered' not in page.locator('#collection-list').inner_text()
                layout(page)
                shot(page, 'desktop-ledger')
                page.locator('#collection-close').click()
                before = snapshot(page)['state']
                page.reload()
                page.wait_for_function('window.foldwildSnapshot?.phase==="menu"')
                page.locator('#continue').click()
                ready(page, 'world')
                after = snapshot(page)['state']
                for key in ['roster', 'team', 'marks', 'inventory', 'contracts', 'activeClass', 'favorites', 'claimedSupplies']:
                    assert before[key] == after[key], key
                stage('UID party remove/add, captured profile/cosmetic/favorite persist after Continue')
                raw = page.evaluate('localStorage.getItem("foldwild-save-v1")')
                page.locator('#new-run').click()
                page.locator('#reset-cancel').click()
                assert page.evaluate('localStorage.getItem("foldwild-save-v1")') == raw
                page.locator('#new-run').click()
                page.locator('#reset-confirm').click()
                assert snapshot(page)['phase'] == 'menu'
                page.locator('#seed-input').fill('1')
                page.locator('#start').click()
                ready(page, 'world')
                assert snapshot(page)['state']['marks'] == 90 and snapshot(page)['state']['kites'] == 8
                assert len(snapshot(page)['state']['roster']) == 1
                stage('cancel preserves raw save; confirmed restart restores fresh resources')
                desktop.close()

                mobile = browser.new_context(viewport={'width': 390, 'height': 700}, has_touch=True, is_mobile=True)
                page = attach(mobile)
                page.locator('#seed-input').fill('1')
                page.locator('#start').tap()
                summary['budgets']['mobile_world'] = ready(page, 'world')
                layout(page)
                shot(page, 'mobile-world')
                session = mobile.new_cdp_session(page)
                page.locator('[data-move="w"]').scroll_into_view_if_needed()
                contacts = []
                for index, key in enumerate(['w', 'd']):
                    box = page.locator(f'[data-move="{key}"]').bounding_box()
                    contacts.append({'id': index+1, 'x': box['x']+box['width']/2, 'y': box['y']+box['height']/2})
                p = snapshot(page)['state']['position']
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': contacts})
                page.wait_for_timeout(600)
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                q = snapshot(page)['state']['position']
                assert q['x'] > p['x']+.3 and q['z'] < p['z']-.3, (p, q)
                page.wait_for_timeout(200)
                assert snapshot(page)['state']['position'] == q
                session.detach()
                keyboard_to(page, 0, 10)
                keyboard_to(page, -8, 4)
                walk(page, 'wild-0', -10, 4)
                summary['budgets']['mobile_battle'] = battle_start(page)
                layout(page)
                shot(page, 'mobile-battle')
                page.locator('#ability-0').tap()
                page.wait_for_function('!window.foldwildSnapshot.busy')
                assert snapshot(page)['battle']['round'] == 2
                assert page.locator('#capture').is_enabled()
                page.locator('#capture').tap()
                page.wait_for_function('!window.foldwildSnapshot.busy')
                assert snapshot(page)['battle']['result'] == 'captured'
                stage('390px real two-contact held movement/release, battle taps and capture')
                page.set_viewport_size({'width': 320, 'height': 700})
                layout(page)
                stage('320px overflow and visible button/select 44px targets')
                mobile.close()
                for key in ['errors', 'failed_requests', 'http_errors', 'external_requests']:
                    assert not summary[key], (key, summary[key])
                assert hashes == source_hashes(), 'game source changed during native proof; rerun frozen source'
                summary['budget_failures'] = [name for name, v in summary['budgets'].items()
                    if v['drawCalls'] >= 50 or v['triangles'] >= 60000]
                assert not summary['budget_failures'], summary['budget_failures']
                stage('zero normal browser/load/external errors, unchanged source and draw/triangle budgets')
                summary['passed'] = True
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        summary['storage_delta_bytes'] = free_before - shutil.disk_usage(ROOT).free
        summary['source_unchanged'] = hashes == source_hashes()
        (OUTPUT / 'result.json').write_text(json.dumps(summary, indent=2) + '\n')
        print(json.dumps(summary, indent=2), flush=True)
    print('PASS: Foldwild M1 native gameplay checks; Main must review pictures, not a visual/campaign/hardware release pass')


if __name__ == '__main__':
    run()
