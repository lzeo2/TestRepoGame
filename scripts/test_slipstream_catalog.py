#!/usr/bin/env python3
"""Ordinary portal search/category/keyboard/touch launch for registered preview225.

No game-state grants/stepping/save seeds. Not whole-game or live-host acceptance.
"""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
TITLE = 'Slipstream Borough: Police Chase (Preview)'


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    catalog = json.loads((ROOT / 'games.json').read_text())
    old = json.loads(subprocess.check_output(['git', 'show', '34ce915:games.json'], cwd=ROOT))
    assert catalog[:-1] == old and len(catalog) == 116
    assert len({g['id'] for g in catalog}) == 116
    game = catalog[-1]
    assert game['id'] == 225 and game['title'] == TITLE and game['cat'] == 'arcade'
    assert game['desc'].startswith('Preview:') and game['featured'] is False
    assert game['url'] == 'Games/Slipstream Borough/index.html'
    files = subprocess.check_output(['git', 'ls-tree', '-rz', '--name-only', 'HEAD'], cwd=ROOT).decode().split('\0')
    assert all(unquote(g['url']) in files for g in catalog)
    sources = [ROOT / 'games.json', ROOT / 'index.html', Path(__file__)]
    sources += list((ROOT / 'Games/Slipstream Borough').glob('*'))
    sources += list((ROOT / 'assets/car-arcade').glob('*.js')) + list((ROOT / 'assets/car-arcade').glob('*.css'))
    sources += list((ROOT / 'assets/car-arcade/vendor').glob('*'))
    sources += list((ROOT / 'assets').glob('index-*')) + list((ROOT / 'assets').glob('portal-*'))
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources if p.is_file()}
    output = Path(tempfile.mkdtemp(prefix='slipstream-listing-'))
    print('OUTPUT=' + str(output), flush=True)
    errors = []
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    observations = []
    def watch(page):
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: errors.append(request.url + ':' + str(request.failure)))
        page.on('response', lambda response: errors.append(f'HTTP {response.status} {response.url}') if response.status >= 400 else None)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=False,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                for width, height in [(1280, 900), (390, 844)]:
                    context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=True)
                    try:
                        context.on('page', watch)
                        context.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).netloc == urlsplit(origin).netloc else (errors.append('External ' + route.request.url), route.abort()))
                        page = context.new_page(); page.set_default_timeout(20000)
                        page.goto(origin + '/')
                        page.locator('.search-bar__input').wait_for()
                        card = page.locator('.game-card').filter(has=page.get_by_text(TITLE, exact=True))
                        card.wait_for(state='attached')
                        for query in ['Slipstream', 'police']:
                            page.locator('.search-bar__input').fill(query)
                            card.wait_for(state='visible')
                            page.wait_for_function('title => { const cards=[...document.querySelectorAll(".bento-grid .game-card")].filter(c=>getComputedStyle(c).display!=="none"); return cards.length===1 && cards[0].querySelector(".game-card__title").textContent.trim()===title; }', arg=TITLE)
                        page.locator('.search-bar__input').fill('')
                        page.locator('.category-filter__btn[data-cat-id="arcade"]').click()
                        card.wait_for(state='visible')
                        page.wait_for_function('() => { const cards=[...document.querySelectorAll(".bento-grid .game-card")].filter(c=>getComputedStyle(c).display!=="none"); return cards.length>1 && cards.every(c=>c.dataset.cat==="arcade"); }')
                        assert page.locator('.category-filter__btn[data-cat-id="arcade"]').get_attribute('aria-pressed') == 'true'
                        # Standard shelf cards omit descriptions; the existing Info panel owns them.
                        card.locator('.game-card__info').click()
                        assert 'Preview:' in page.locator('.ux-detail__desc').inner_text()
                        page.locator('.ux-detail__close').click()
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                        card.scroll_into_view_if_needed()
                        page.screenshot(path=str(output / f'portal-{width}.jpg'), quality=85)
                        if width == 1280:
                            card.focus(); page.keyboard.press('Enter')
                        else:
                            card.locator('.game-card__play').tap()
                        page.wait_for_function('document.fullscreenElement?.classList.contains("ux-player")')
                        element = page.locator('.ux-player__frame').element_handle()
                        frame = element.content_frame()
                        frame.wait_for_function('window.slipstreamSnapshot?.view?.frames>1 && slipstreamSnapshot.phase==="run" && slipstreamSnapshot.run.mode==="roam"')
                        assert unquote(urlsplit(frame.url).path) == '/' + game['url']
                        assert len(context.pages) == 1
                        state = frame.evaluate('slipstreamSnapshot')
                        assert state['profile']['cash'] == 0 and not state['profile']['testMode']
                        assert len(state['run']['traffic']) == len(state['view']['trafficModels']) == 4
                        assert state['view']['modelId'] == 'bricklet'
                        assert frame.locator('#drive').is_visible() and frame.locator('#help').is_visible()
                        assert frame.evaluate('document.documentElement.scrollWidth <= innerWidth')
                        assert not page.locator('.ux-player__controls').is_visible()
                        assert element.evaluate('f => { const r=f.getBoundingClientRect(); return r.x===0 && r.y===0 && r.width===innerWidth && r.height===innerHeight; }')
                        page.screenshot(path=str(output / f'game-{width}.jpg'), quality=85)
                        observations.append({'viewportWidth': width, 'launch': 'keyboard Enter' if width == 1280 else 'genuine touch Play', 'gamePath': game['url'], 'frames': state['view']['frames'], 'trafficCount': len(state['view']['trafficModels']), 'freshUnassisted': True, 'nativeFullscreen': True})
                        page.keyboard.press('Escape')
                        page.wait_for_function('!document.fullscreenElement')
                        if page.locator('.ux-player').count():
                            page.get_by_role('button', name='Close game and return to arcade').click()
                        page.wait_for_function('!document.querySelector(".ux-player")')
                    finally: context.close()
            finally: browser.close()
        assert not errors, errors
        assert all(hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == h for path, h in hashes.items())
        assert sum(p.stat().st_size for p in output.glob('*.jpg')) <= 1_000_000
        assert shutil.disk_usage(ROOT).free >= 2_000_000_000
        (output / 'result.json').write_text(json.dumps({'errors': errors, 'assisted': False, 'sourceHashes': hashes, 'observations': observations}, indent=2) + '\n')
        print('PASS existing115 unchanged, registered225, Police/Slipstream search, Arcade filtering, keyboard and390touch native fullscreen launch, fresh4traffic/20s readiness/local-only/no errors/no overflow/exit.', flush=True)
    except Exception as error:
        (output / 'failure.json').write_text(json.dumps({'error': repr(error), 'errors': errors, 'sourceHashes': hashes}, indent=2) + '\n')
        raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=3)


if __name__ == '__main__':
    main()
