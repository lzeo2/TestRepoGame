#!/usr/bin/env python3
"""Native-input layout check; --baseline records the pre-fix geometry only."""
import argparse
import functools
import json
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from time import monotonic
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright
from test_foldwild import loaded, snapshot, walk, idle

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-layout-qa')


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def geometry(page):
    return page.evaluate('''() => {
        const ids = ['game-canvas','world-hud','message','player-name','enemy-name',
            'player-hp','enemy-hp','player-energy','enemy-energy',
            'ability-0','ability-1','ability-2','ability-3','capture','wait','flee','pause','new-run'];
        const bounds = element => {
            const r = element.getBoundingClientRect();
            return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,
                visible:r.width>0 && r.height>0, inFrame:r.y>=0 && r.bottom<=innerHeight};
        };
        return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
            nodes:Object.fromEntries(ids.map(id=>[id,bounds(document.getElementById(id))])),
            targets:[...document.querySelectorAll('button,a,label.motion-setting')]
                .map(bounds).filter(r=>r.visible && r.y>=0),
            text:[...document.querySelectorAll('.combatants h2,.ability-choices button')].map(e=>e.textContent)};
    }''')


def check(page, metrics, battle, narrow=False):
    assert metrics['scrollWidth'] <= metrics['width'], metrics
    assert all(r['width'] >= 44 and r['height'] >= 44 for r in metrics['targets']), metrics['targets']
    nodes = metrics['nodes']
    assert nodes['game-canvas']['visible'] and nodes['game-canvas']['inFrame'] and nodes['game-canvas']['height'] >= 180, nodes
    view = snapshot(page)['view']
    ratio = nodes['game-canvas']['width'] / nodes['game-canvas']['height']
    assert abs(view['width'] / view['height'] - ratio) < .02, (view, ratio)
    assert view['frames'] > 3 and view['drawCalls'] > 0 and not view['fallbackModels'], view
    if battle:
        essential = ['player-name','enemy-name','player-hp','enemy-hp','player-energy','enemy-energy','ability-0','ability-1']
        if not narrow:
            essential += ['ability-2','ability-3','capture','wait','flee']
        assert all(nodes[id]['visible'] and nodes[id]['inFrame'] for id in essential), nodes
        for id in ['ability-0','ability-1','ability-2','ability-3','capture','wait','flee','pause','new-run']:
            page.locator('#' + id).scroll_into_view_if_needed()
            r = page.locator('#' + id).bounding_box()
            assert r['x'] >= 0 and r['x'] + r['width'] <= metrics['width'], (id, r)
        page.evaluate('window.scrollTo(0,0)')
    else:
        for id in ['world-hud','score','dex-count','kites','save-state','collection-btn']:
            assert page.locator('#' + id).is_visible(), id


def run():
    baseline = argparse.ArgumentParser()
    baseline.add_argument('--baseline', action='store_true')
    before = baseline.parse_args().baseline
    started = monotonic()
    free = shutil.disk_usage(ROOT).free
    assert free >= 2_000_000_000, 'disk guard: less than 2 GB free'
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    errors = {'page': [], 'console': [], 'requests': [], 'http': [], 'external': []}
    results, images = {}, []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            try:
                for name, width, height in [('desktop',1100,720), ('mobile',390,844)]:
                    context = browser.new_context(viewport={'width':width,'height':height}, has_touch=name=='mobile', is_mobile=name=='mobile')
                    def local_only(route):
                        if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                            errors['external'].append(route.request.url)
                            route.abort()
                        else:
                            route.continue_()
                    context.route('**/*', local_only)
                    page = context.new_page()
                    page.set_default_timeout(30000)
                    page.on('pageerror', lambda error: errors['page'].append(str(error)))
                    page.on('console', lambda msg: errors['console'].append(msg.text) if msg.type=='error' else None)
                    page.on('requestfailed', lambda request: errors['requests'].append(request.url))
                    page.on('response', lambda response: errors['http'].append(str(response.status)+' '+response.url) if response.status>=400 else None)
                    page.goto(origin + '/Games/Foldwild/')
                    page.wait_for_function('window.foldwildSnapshot?.phase === "menu"')
                    assert snapshot(page)['view'] is None
                    page.locator('[data-starter="dewgob"]').click()
                    page.locator('#start').click()
                    loaded(page, 3)
                    page.wait_for_function('window.foldwildSnapshot.view.frames > 3')
                    page.evaluate('window.scrollTo(0,0)')
                    results[name+'-world'] = geometry(page)
                    if not before:
                        check(page, results[name+'-world'], False)
                    if name=='mobile' and not before:
                        image = OUTPUT / 'mobile-world.jpg'
                        page.screenshot(path=str(image), type='jpeg', quality=85, full_page=False)
                        images.append(image)
                    walk(page, 'wild-1')
                    page.locator('#interact').click()
                    page.locator('#dialogue-start').click()
                    loaded(page, 2)
                    page.wait_for_timeout(300)
                    page.evaluate('window.scrollTo(0,0)')
                    results[name+'-battle'] = geometry(page)
                    if not before:
                        check(page, results[name+'-battle'], True)
                        image = OUTPUT / (name+'-battle.jpg')
                        page.screenshot(path=str(image), type='jpeg', quality=85, full_page=False)
                        images.append(image)
                        page.locator('#pause').click()
                        assert snapshot(page)['paused']
                        page.locator('#pause').click()
                        assert not snapshot(page)['paused']
                        round_before = snapshot(page)['battle']['round']
                        page.locator('#ability-0').click()
                        idle(page)
                        assert snapshot(page)['battle']['round'] == round_before + 1
                        if name=='mobile':
                            page.set_viewport_size({'width':320,'height':740})
                            page.wait_for_timeout(300)
                            page.evaluate('window.scrollTo(0,0)')
                            results['narrow-battle'] = geometry(page)
                            check(page, results['narrow-battle'], True, narrow=True)
                    context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    assert not any(errors.values()), errors
    size = sum(image.stat().st_size for image in images)
    assert size <= 500000, size
    print(json.dumps({'baseline':before,'metrics':results,'errors':errors,'screenshot_bytes':size,
        'seconds':round(monotonic()-started,2),'storage_delta':free-shutil.disk_usage(ROOT).free}, indent=2))
    print('BASELINE recorded' if before else 'PASS: native world/battle layouts, loaded GLBs, 44px targets, no overflow, native ability input')


if __name__ == '__main__':
    run()
