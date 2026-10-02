#!/usr/bin/env python3
"""New async-ABI M2 v1 evidence, never an unchanged-M2 acceptance pass.
Based on original SHA256 4187de5f03366332af2eddd9bed3a61ac33c9532115ac0b2fb09435bc85c12ea.
Run: timeout --signal=TERM --kill-after=10s 420s xvfb-run -a python3 -B scripts/test_foldwild_m2_async_v1.py
Not a campaign/hardware/publication gate; output is exclusive to this task.
"""
import functools
import json
import shutil
import threading
import uuid
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from test_foldwild_core_v2 import Handler, snapshot, walk, keyboard_to
from test_foldwild_milestone import source_hashes, ready

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp') / f'foldwild-m2-async-v1-{uuid.uuid4().hex}'
ORIGIN = 'http://127.0.0.1:8891'
SAVE_KEY = 'foldwild-save-v1'


def saved(page):
    page.wait_for_function(
        'document.getElementById("save-state").textContent === '
        '"Progress saved on this device."', timeout=10000)


def raw(page):
    return page.evaluate('localStorage.getItem("foldwild-save-v1")')


def preview(page, selector):
    page.locator(selector).click()
    page.wait_for_function('''() => {const s=window.foldwildSnapshot;
        return s.view.mode==='inspection' && s.view.countLoadedModels===1 &&
        s.view.inspectionBounds && s.view.drawCalls>=2 && s.view.triangles>2 &&
        !document.getElementById('ledger-model-status').textContent.startsWith('Loading')}''')
    assert page.evaluate('''() => {
        const name=document.getElementById('ledger-model-name').getBoundingClientRect();
        const header=document.querySelector('#collection-dialog .dialog-heading').getBoundingClientRect();
        return name.top>=header.bottom && name.bottom<=innerHeight;
    }'''), 'inspection name hidden beneath sticky ledger heading'
    s = snapshot(page)
    assert not s['view']['fallbackModels'], s['view']
    assert s['view']['cacheSize'] <= 12 and s['view']['modelReferences'] == 1
    assert page.evaluate('document.querySelectorAll("canvas").length===1 && document.getElementById("game-canvas").parentElement.id==="ledger-model-host"')
    return s['view']


def layout(page):
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'horizontal overflow'
    assert not page.evaluate('''[...document.querySelectorAll('button,select')].filter(e=>{
        const r=e.getBoundingClientRect();return r.width && r.height && (r.width<44 || r.height<44)
    }).map(e=>e.id || e.textContent)'''), 'small button/select'


def run():
    free = shutil.disk_usage(ROOT).free
    assert free >= 2_000_000_000, 'disk guard: below 2 GB free'
    hashes = source_hashes()
    OUTPUT.mkdir(exist_ok=False)
    print('EVIDENCE:', OUTPUT, flush=True)
    report = {'stages': [], 'screenshots': [], 'views': {}, 'errors': [], 'failed_requests': [],
              'http_errors': [], 'external_requests': [], 'negative_fixtures': [], 'passed': False}
    server = ThreadingHTTPServer(('127.0.0.1', 8891), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def attach(context):
        def local_only(route):
            if urlsplit(route.request.url).netloc != urlsplit(ORIGIN).netloc:
                report['external_requests'].append(route.request.url)
                route.abort()
            else:
                route.continue_()
        context.route('**/*', local_only)
        page = context.new_page()
        page.set_default_timeout(10000)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
        page.on('requestfailed', lambda r: report['failed_requests'].append(r.url))
        page.on('response', lambda r: report['http_errors'].append(f'{r.status} {r.url}') if r.status >= 400 else None)
        page.goto(ORIGIN + '/Games/Foldwild/')
        page.wait_for_function('window.foldwildSnapshot?.phase==="menu"')
        return page

    def stage(name):
        report['stages'].append(name)
        print('PASS:', name, flush=True)

    def shot(page, name):
        path = OUTPUT / f'{name}.jpg'
        page.screenshot(path=str(path), type='jpeg', quality=55)
        assert path.stat().st_size < 300000
        report['screenshots'].append({'file': path.name, 'bytes': path.stat().st_size})

    def reload_continue(page, mode):
        saved(page)
        page.reload()
        page.wait_for_function('window.foldwildSnapshot?.phase==="menu"')
        page.locator('#continue').click()
        ready(page, mode)
        saved(page)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720})
                page = attach(context)
                page.locator('#seed-input').fill('1')
                page.locator('#start').click()
                ready(page, 'world')
                assert page.evaluate('Object.getOwnPropertyDescriptor(window,"foldwildSnapshot").set===undefined && Object.isFrozen(window.foldwildSnapshot.battle ?? window.foldwildSnapshot.state)')
                walk(page, 'meadow-merchant', 4, 16)
                page.locator('#interact').click()
                page.get_by_role('button', name='Accessories', exact=True).click()
                page.get_by_role('button', name='Paper Badge: 20 Marks', exact=True).click()
                assert snapshot(page)['state']['marks'] == 70
                page.get_by_role('button', name='Archivist', exact=True).click()
                page.get_by_label('hair', exact=False).select_option('long')
                assert snapshot(page)['state']['appearance']['hair'] == 'long'
                page.locator('#service-close').click()
                before = snapshot(page)['state']
                page.locator('#save-now').click()
                saved(page)
                page.wait_for_function(
                    'document.getElementById("message").textContent === '
                    '"Progress saved on this device."', timeout=10000)
                assert 'Progress saved' in page.locator('#message').inner_text()
                assert snapshot(page)['state'] == before, 'explicit save mutated state/RNG'
                page.locator('#collection-btn').click()
                assert page.locator('[data-release="owned-1"]').is_disabled()
                assert 'last ally' in page.locator('[data-uid="owned-1"]').inner_text()
                assert 'Dewgob' not in page.locator('#collection-list').inner_text()
                assert page.locator('[data-species="dewgob"]').count() == 0
                world_yaw = snapshot(page)['view']['cameraYaw']
                report['views']['desktop_inspection'] = preview(page, '[data-inspect="owned-1"]')
                yaw = snapshot(page)['view']['inspectionYaw']
                page.locator('#ledger-rotate-right').click()
                assert abs(snapshot(page)['view']['inspectionYaw'] - yaw) > .7
                assert snapshot(page)['view']['cameraYaw'] == world_yaw
                page.locator('#ledger-model-reset').click()
                assert snapshot(page)['view']['inspectionYaw'] == 0
                draws = snapshot(page)['view']['drawCalls']
                page.locator('[data-uid="owned-1"] select').select_option('badge')
                page.wait_for_function('draws => window.foldwildSnapshot.view.inspectionBounds!==null && window.foldwildSnapshot.view.drawCalls===draws+1', arg=draws)
                report['views']['desktop_badge_inspection'] = snapshot(page)['view']
                assert snapshot(page)['state']['roster'][0]['cosmeticId'] == 'badge'
                assert snapshot(page)['state']['position'] == before['position']
                page.locator('#ledger-inspector').scroll_into_view_if_needed()
                layout(page)
                shot(page, 'desktop-inspection')
                page.locator('#ledger-preview-close').click()
                ready(page, 'world')
                assert page.locator('#collection-dialog').is_visible()
                assert page.evaluate('document.activeElement.dataset.inspect==="owned-1"')
                assert snapshot(page)['state']['position'] == before['position']
                preview(page, '[data-species="cindupp"]')
                page.keyboard.press('Escape')
                ready(page, 'world')
                assert page.evaluate('document.getElementById("game-canvas").parentElement.classList.contains("viewport")')
                stage('merchant badge, saved long hair, one real model, rotation/accessory and same-canvas close/Escape')

                keyboard_to(page, 0, 10)
                keyboard_to(page, -8, 4)
                walk(page, 'wild-0', -10, 4)
                page.locator('#interact').click()
                page.locator('#dialogue-start').click()
                ready(page, 'battle')
                page.locator('#game-canvas').focus()
                page.keyboard.press('1')
                page.wait_for_function('!window.foldwildSnapshot.busy')
                assert page.locator('#capture').is_enabled()
                pending = snapshot(page)['battle']
                assert pending['round'] == 2 and pending['result'] is None
                saved(page)
                assert json.loads(raw(page))['pendingBattle'] == pending
                reload_continue(page, 'battle')
                assert snapshot(page)['battle'] == pending, 'reload altered canonical battle'
                assert snapshot(page)['state']['pendingBattle'] == pending
                assert not snapshot(page)['busy'] and not snapshot(page)['paused']
                page.locator('#game-canvas').scroll_into_view_if_needed()
                shot(page, 'battle-resumed')
                stage('native weakening, exact mid-battle Continue including RNG/log/resources/effects/profile')
                for _ in range(6):
                    page.locator('#capture').click()
                    page.wait_for_function('!window.foldwildSnapshot.busy')
                    saved(page)
                    if snapshot(page)['phase'] == 'result':
                        break
                    assert json.loads(raw(page))['pendingBattle'] == snapshot(page)['battle']
                s = snapshot(page)
                assert s['battle']['result'] == 'captured'
                assert s['state']['roster'][-1]['speciesId'] == 'budriv'
                assert s['state']['pendingBattle'] is None and json.loads(raw(page))['pendingBattle'] is None
                settled = s['state']
                page.locator('#collection-btn').click()
                preview(page, '[data-inspect="owned-2"]')
                page.locator('#ledger-preview-close').click()
                ready(page, 'battle')
                assert snapshot(page)['phase'] == 'result' and page.locator('#result-continue').is_visible()
                assert snapshot(page)['view']['mode'] == 'battle', 'result model key did not reset'
                page.locator('#collection-close').click()
                for _ in range(2):
                    reload_continue(page, 'world')
                    assert snapshot(page)['state'] == settled, 'repeated ended reload duplicated settlement'
                stage('actual seeded Budriv capture, result preview restoration and two reloads without duplicate payout')

                page.locator('#collection-btn').click()
                card = page.locator('[data-uid="owned-2"]')
                assert card.locator('[data-release]').is_disabled(), 'team release not protected'
                card.get_by_role('button', name='Remove from team', exact=True).click()
                card.get_by_role('button', name='Favorite', exact=True).click()
                assert card.locator('[data-release]').is_disabled(), 'favorite release not protected'
                card.get_by_role('button', name='Unfavorite', exact=True).click()
                preview(page, '[data-inspect="owned-2"]')
                card.locator('select').select_option('badge')
                page.wait_for_function('window.foldwildSnapshot.view.inspectionBounds!==null')
                saved(page)
                old = raw(page)
                card.locator('[data-release]').click()
                assert 'Budriv' in page.locator('#release-description').inner_text() and 'owned-2' in page.locator('#release-description').inner_text()
                shot(page, 'release-confirm')
                page.keyboard.press('Escape')
                assert not page.locator('#release-dialog').is_visible() and page.locator('#collection-dialog').is_visible()
                assert raw(page) == old, 'Escape release changed save bytes'
                card.locator('[data-release]').click()
                page.locator('#release-cancel').click()
                assert raw(page) == old, 'cancel release changed save bytes'
                preserved = snapshot(page)['state']
                card.locator('[data-release]').click()
                page.locator('#release-confirm').click()
                after = snapshot(page)['state']
                assert not any(c['uid'] == 'owned-2' for c in after['roster'])
                for key in ['nextUid', 'marks', 'score', 'inventory', 'kites', 'seen', 'caught', 'encounterIndex']:
                    assert after[key] == preserved[key], key
                assert 'budriv' in after['seen'] and 'budriv' in after['caught']
                assert page.locator('#collection-dialog').is_visible() and not page.locator('#ledger-inspector').is_visible()
                assert page.evaluate('document.getElementById("game-canvas").parentElement.classList.contains("viewport")')
                report['views']['seen_only_inspection'] = preview(page, '[data-species="budriv"]')
                page.locator('#collection-close').click()
                ready(page, 'world')
                saved(page)
                fixture_raw = raw(page)
                stage('native team/favorite guards, byte-identical release cancel/Escape, guarded UID-only release and retained seen preview')
                context.close()

                mobile = browser.new_context(viewport={'width': 390, 'height': 700}, has_touch=True, is_mobile=True)
                page = attach(mobile)
                page.locator('#seed-input').fill('1')
                page.locator('#start').tap()
                ready(page, 'world')
                before = snapshot(page)['state']['position']
                heading = snapshot(page)['view']['cameraYaw']
                page.locator('#collection-btn').tap()
                report['views']['mobile_inspection'] = preview(page, '[data-inspect="owned-1"]')
                page.locator('#ledger-model-host').scroll_into_view_if_needed()
                box = page.locator('#game-canvas').bounding_box()
                session = mobile.new_cdp_session(page)
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
                shot(page, 'mobile-inspection')
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
                    return title.top>=r.top && title.bottom<=r.bottom &&
                        r.top>=0 && r.bottom<=innerHeight &&
                        document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===close &&
                        name.top>=heading.getBoundingClientRect().bottom;
                }'''), '320px ledger heading wraps or obscures the name/close target'
                shot(page, 'mobile-inspection-320')
                page.locator('#collection-close').tap()
                ready(page, 'world')
                assert snapshot(page)['state']['position'] == before
                stage('390px single-finger model drag, unchanged world heading/pose, 320px 44px controls and no overflow')
                mobile.close()

                delayed = browser.new_context(viewport={'width': 1100, 'height': 720})
                held = []
                page = attach(delayed)
                page.route('**/cindupp.glb', lambda route: held.append(route))
                page.locator('#seed-input').fill('1')
                page.locator('#start').click()
                ready(page, 'world')
                page.locator('#collection-btn').click()
                page.locator('[data-inspect="owned-1"]').click()
                page.wait_for_function('document.getElementById("ledger-model-status").textContent.startsWith("Loading")')
                assert held, 'late-loader fixture did not intercept the actual request'
                page.locator('#collection-close').click()
                ready(page, 'world')
                for request in held:
                    request.continue_()
                page.wait_for_timeout(300)
                assert snapshot(page)['view']['mode'] == 'world'
                assert page.locator('#ledger-inspector').is_hidden()
                assert page.evaluate('document.getElementById("game-canvas").parentElement.classList.contains("viewport")')
                delayed.close()
                stage('real deferred model request cannot resurrect a closed inspection')

                # Explicit persistence-failure fixtures are separate from the normal gameplay proof.
                quota = browser.new_context(viewport={'width': 1100, 'height': 720})
                quota.add_init_script('localStorage.setItem(' + json.dumps(SAVE_KEY) + ',' + json.dumps(fixture_raw) + '); Storage.prototype.setItem=function(){throw new DOMException("Fixture quota exhausted","QuotaExceededError")};')
                page = attach(quota)
                page.locator('#continue').click()
                ready(page, 'world')
                page.locator('#save-now').click()
                page.wait_for_function('''() => {
                    const status=document.getElementById('save-state').textContent;
                    return status.includes('Could not write Foldwild save:') &&
                        status.includes('Fixture quota exhausted');
                }''', timeout=10000)
                assert page.locator('#save-state').is_visible()
                assert 'Progress saved' not in page.locator('#message').inner_text()
                assert raw(page) == fixture_raw
                report['negative_fixtures'].append('quota failure: explicit save reports unavailable and preserves primary bytes')
                quota.close()
                unavailable = browser.new_context()
                unavailable.add_init_script('localStorage.setItem(' + json.dumps(SAVE_KEY) + ',' + json.dumps(fixture_raw) + '); Storage.prototype.setItem=function(){throw new Error("Fixture storage denied")}; const get=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(name,...args){return /webgl/.test(name)?null:get.call(this,name,...args)};')
                page = attach(unavailable)
                page.locator('#continue').click()
                assert snapshot(page)['phase'] == 'world' and snapshot(page)['view'] is None
                page.locator('#save-now').click()
                page.wait_for_function('''() => {
                    const status=document.getElementById('save-state').textContent;
                    return status.includes('Could not write Foldwild save:') &&
                        status.includes('Fixture storage denied');
                }''', timeout=10000)
                assert page.locator('#save-state').is_visible()
                assert 'Progress saved' not in page.locator('#message').inner_text()
                assert page.locator('#render-state').is_visible()
                assert '3D view unavailable' in page.locator('#render-state').inner_text()
                page.locator('#collection-btn').click()
                page.locator('[data-inspect="owned-1"]').click()
                assert '3D view unavailable' in page.locator('#ledger-model-status').inner_text()
                assert raw(page) == fixture_raw
                report['negative_fixtures'].append('storage/WebGL denied: explicit save and live ledger each disclose failure; bytes preserved')
                unavailable.close()
                corrupt = browser.new_context()
                corrupt.add_init_script('localStorage.setItem("foldwild-save-v1","{broken")')
                page = attach(corrupt)
                assert page.locator('#continue').is_hidden()
                page.locator('#start').click()
                page.locator('#reset-cancel').click()
                assert raw(page) == '{broken'
                assert 'preserved' in page.locator('#starter-description').inner_text()
                report['negative_fixtures'].append('corrupt slot: Continue refused, new-run cancellation preserves original bytes')
                corrupt.close()
                for key in ['errors', 'failed_requests', 'http_errors', 'external_requests']:
                    assert not report[key], (key, report[key])
                assert hashes == source_hashes(), 'source changed during native proof; rerun stable source'
                stage('zero normal browser/load/external errors; distinct quota/corrupt fixtures; unchanged source')
                report['passed'] = True
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        report['storage_delta_bytes'] = free - shutil.disk_usage(ROOT).free
        report['source_unchanged'] = hashes == source_hashes()
        (OUTPUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    print('PASS: Foldwild M2 async ABI v1 only, NOT unchanged M2; screenshots await Main review; campaign/N100/publication held')


if __name__ == '__main__':
    run()
