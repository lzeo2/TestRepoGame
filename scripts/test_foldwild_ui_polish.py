#!/usr/bin/env python3
"""Scoped ordinary-input UI polish check, not M2/campaign/device acceptance.
Run: timeout --signal=TERM --kill-after=10s 300s python3 -B scripts/test_foldwild_ui_polish.py
Uses system Chromium; writes <2 MiB of captures under .tmp/foldwild-ui-polish-qa/.
"""
import functools
import json
import shutil
import subprocess
import threading
import uuid
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright
from test_foldwild_core_v2 import Handler, keyboard_to, snapshot, walk
from test_foldwild_milestone import ready, source_hashes

ROOT = Path(__file__).resolve().parents[1]


def geometry(page):
    result = page.evaluate('''() => {
        const rect = e => {const r=e.getBoundingClientRect();
            return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,
            frame:rect(document.querySelector('.play-layout')),canvas:rect(document.querySelector('#game-canvas')),
            small:[...document.querySelectorAll('button,select,summary,a')].filter(e=>{
                const r=e.getBoundingClientRect();return r.width && r.height && (r.width<44 || r.height<44);
            }).map(e=>e.id || e.textContent)};
    }''')
    assert not result['overflow'] and not result['small'], result
    frame, canvas = result['frame'], result['canvas']
    assert frame['y'] >= 0 and frame['bottom'] <= result['height'], result
    assert canvas['width'] > 0 and canvas['height'] >= 180, result
    assert canvas['x'] >= frame['x'] and canvas['right'] <= frame['right'], result
    assert canvas['y'] >= frame['y'] and canvas['bottom'] <= frame['bottom'], result
    return result


def run():
    free = shutil.disk_usage(ROOT).free
    assert free >= 2_147_483_648, 'disk guard: below 2 GiB free'
    hashes = source_hashes()
    output = ROOT / '.tmp/foldwild-ui-polish-qa' / uuid.uuid4().hex
    output.mkdir(parents=True)
    print('EVIDENCE:', output.relative_to(ROOT), flush=True)
    report = {'source_hashes': hashes, 'cases': {}, 'captures': [], 'errors': [], 'passed': False}
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'

    def shot(page, name):
        path = output / f'{name}.jpg'
        page.screenshot(path=str(path), type='jpeg', quality=55)
        report['captures'].append({'file': path.name, 'bytes': path.stat().st_size})
        assert sum(item['bytes'] for item in report['captures']) < 2 * 1024 * 1024

    try:
        with sync_playwright() as pw:
            occupied = subprocess.run(['pgrep', '-f',
                '[c]hrome-linux/chrome|^/usr/lib/chromium/chromium.*--remote-debugging-pipe'],
                capture_output=True, text=True)
            assert occupied.returncode == 1, 'shared browser slot occupied: ' + occupied.stdout.strip()
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
                      '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                for width, height in ((1280, 800), (390, 844)):
                    for scheme in ('light', 'dark'):
                        name = f'{width}-{scheme}'
                        context = browser.new_context(viewport={'width': width, 'height': height},
                            has_touch=width == 390, color_scheme=scheme, reduced_motion='reduce')
                        page = context.new_page()
                        page.set_default_timeout(10000)

                        def local_only(route):
                            if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                                report['errors'].append('External: ' + route.request.url)
                                route.abort()
                            else:
                                route.continue_()

                        context.route('**/*', local_only)
                        page.on('pageerror', lambda e: report['errors'].append(str(e)))
                        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                        page.on('requestfailed', lambda r: report['errors'].append('Request failed: ' + r.url))
                        page.on('response', lambda r: report['errors'].append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
                        click = lambda selector: getattr(page.locator(selector), 'tap' if width == 390 else 'click')()
                        try:
                            page.goto(origin + '/Games/Foldwild/')
                            page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                            page.locator('#seed-input').fill('42')
                            click('#start')
                            ready(page, 'world')
                            assert snapshot(page)['state']['reducedMotion']
                            report['cases'][name] = {'world': geometry(page)}
                            page.locator('#game-canvas').focus()
                            page.keyboard.press('Tab')
                            page.locator('#pause').focus()
                            assert page.locator('#pause').evaluate('e => e.matches(":focus-visible") && getComputedStyle(e).outlineStyle !== "none"')
                            shot(page, name + '-world')
                            click('.field-record > summary')
                            for selector in ('#campaign-objective', '#team-list', '#class-progress', '[data-region="0"]'):
                                assert page.locator(selector).is_visible(), selector
                            click('.field-record > summary')
                            click('.expedition-options > summary')
                            before = snapshot(page)['state']
                            click('#save-now')
                            page.wait_for_function('document.getElementById("save-state").textContent === "Progress saved on this device."')
                            assert snapshot(page)['state'] == before, 'manual save mutated expedition'
                            click('.expedition-options > summary')
                            click('#save-tools summary')
                            for selector in ('#save-export', '#save-backup', '#save-replace', '#save-reload', '#save-file'):
                                assert page.locator(selector).is_visible(), selector
                            click('#save-tools summary')
                            click('#collection-btn')
                            assert page.locator('#collection-list [data-uid]').count() == 1
                            assert page.locator('#collection-list > section').count() < 10, 'unknown placeholder card wall'
                            assert page.locator('[data-release]').first.is_disabled(), 'last ally release enabled'
                            assert '79 species still undiscovered' in page.locator('#collection-list').inner_text()
                            stats = page.locator('#collection-list [data-uid] details')
                            assert not stats.evaluate('e => e.open')
                            stats.locator('summary').click()
                            assert stats.locator('p').is_visible() and 'Individual modifiers:' in stats.inner_text()
                            assert 'Neutral:' in stats.inner_text()
                            stats.locator('summary').click()
                            page.locator('#ledger-search').fill('Dewgob')
                            assert page.locator('#collection-list section').count() == 0
                            assert 'Dewgob' not in page.locator('#collection-list').inner_text()
                            page.locator('#ledger-search').fill('Cindupp')
                            assert page.locator('#collection-list [data-uid]').count() == 1
                            page.locator('#ledger-search').fill('')
                            page.locator('#ledger-filter').select_option('Rillune')
                            assert page.locator('#collection-list section').count() == 0
                            page.locator('#ledger-filter').select_option('Cindrel')
                            assert page.locator('#collection-list [data-uid]').count() == 1
                            page.locator('#ledger-filter').select_option('all')
                            shot(page, name + '-ledger')
                            click('[data-inspect="owned-1"]')
                            ready(page, 'inspection')
                            assert page.evaluate('document.querySelectorAll("canvas").length===1 && document.getElementById("game-canvas").parentElement.id==="ledger-model-host"')
                            yaw = snapshot(page)['view']['inspectionYaw']
                            click('#ledger-rotate-right')
                            assert snapshot(page)['view']['inspectionYaw'] != yaw
                            if width == 390:
                                page.set_viewport_size({'width': 320, 'height': 740})
                            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                            shot(page, name + '-inspection')
                            click('#collection-close')  # Exactly one native touch after 390 -> 320 resize.
                            page.wait_for_function('!document.getElementById("collection-dialog").open && window.foldwildSnapshot.view.mode==="world"')
                            ready(page, 'world')
                            assert page.evaluate('document.getElementById("game-canvas").parentElement.classList.contains("viewport")')
                            assert snapshot(page)['state'] == before, 'inspection altered expedition'
                            if width == 390:
                                page.set_viewport_size({'width': width, 'height': height})
                            # Ordinary authored lanes, then the native marker route and battle buttons.
                            keyboard_to(page, 0, 10)
                            keyboard_to(page, -8, 4)
                            walk(page, 'wild-0', -10, 4)
                            click('#interact')
                            click('#dialogue-start')
                            ready(page, 'battle')
                            report['cases'][name]['battle'] = geometry(page)
                            for slot in range(4):
                                ability = page.locator(f'#ability-{slot}')
                                assert ability.locator('strong').inner_text().startswith(f'{slot + 1}. ')
                                assert ability.locator('p').inner_text()
                                assert ability.locator('p').evaluate('e => getComputedStyle(e).fontWeight') == '400'
                            shot(page, name + '-battle')
                            turn = snapshot(page)['battle']['round']
                            click('#ability-0')
                            page.wait_for_function('r => !foldwildSnapshot.busy && foldwildSnapshot.battle.round > r', arg=turn)
                            click('#flee')
                            page.wait_for_function('foldwildSnapshot.phase === "result" && !foldwildSnapshot.busy')
                            click('#result-continue')
                            ready(page, 'world')
                            report['cases'][name]['single_close_and_turn'] = True
                            print('PASS:', name, 'world/save/recovery/ledger/resize-close/battle-turn', flush=True)
                        except Exception as error:
                            report['failure'] = {'case': name, 'error': str(error)}
                            raise
                        finally:
                            context.close()
                assert not report['errors'], report['errors']
                assert source_hashes() == hashes, 'source changed during check; not frozen evidence'
                report['passed'] = True
            finally:
                browser.close()
    except Exception as error:
        report.setdefault('failure', {'error': str(error)})
        raise
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        report['source_hashes_after'] = source_hashes()
        report['storage_delta_bytes'] = free - shutil.disk_usage(ROOT).free
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PASS: 4 desktop/mobile OS-scheme cases; local-only; unchanged source. Existing M2 holds NOT cleared.')


if __name__ == '__main__':
    run()
