#!/usr/bin/env python3
"""Bounded portal regression. Positive cases use normal UI; fixtures are labeled."""
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = Path('/tmp/portal-refurbishment')
VISIBLE = '.bento-grid .game-card:visible'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def titles(page, selector=VISIBLE):
    return page.locator(selector).evaluate_all("cards => cards.map(c => c.querySelector('.game-card__title').textContent.trim())")


def wait_count(page, count):
    try:
        page.wait_for_function("n => [...document.querySelectorAll('.bento-grid .game-card')].filter(c => c.getBoundingClientRect().height > 0).length === n", arg=count)
    except Exception:
        print('FAIL count diagnostic:', page.evaluate("""() => ({input:document.querySelector('.search-bar__input')?.value, cards:document.querySelectorAll('.game-card').length, hidden:document.querySelectorAll('[data-ux-search-hidden]').length, status:document.querySelector('.ux-result-status')?.textContent})"""))
        raise
    assert page.locator('.ux-result-status').inner_text() == f'{count} game' + ('s' if count != 1 else '')


def load(page, base, count):
    page.goto(base, wait_until='networkidle')
    page.wait_for_selector('.ux-sort__select')
    wait_count(page, count)


def idle_changes(page):
    # Read-only observation, not a portal state grant or performance benchmark.
    page.wait_for_timeout(600)
    return page.evaluate("""() => new Promise(resolve => {
        let changes = 0;
        const observer = new MutationObserver(records => changes += records.length);
        for (const selector of ['.category-filter', '.ux-result-status', '.ux-recent'])
            observer.observe(document.querySelector(selector), {childList:true, subtree:true, characterData:true});
        setTimeout(() => {observer.disconnect(); resolve(changes);}, 1200);
    })""")


def main():
    games = json.loads((ROOT / 'games.json').read_text())
    assert len({g['id'] for g in games}) == len(games)
    assert len({g['title'] for g in games}) == len(games)
    count = len(games)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('PORTAL_TEST_PORT', '8813'))), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    SHOTS.mkdir(parents=True, exist_ok=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
            context = browser.new_context(viewport={'width': 1280, 'height': 720}, color_scheme='light', has_touch=True)
            page = context.new_page()
            page.set_default_timeout(5000)
            errors = []
            page.on('pageerror', lambda error: (errors.append(str(error)), print('PAGEERROR:', str(error))))
            base = f'http://127.0.0.1:{server.server_port}/index.html'
            load(page, base, count)
            baseline = titles(page, '.bento-grid__standard .game-card')
            search = page.locator('.search-bar__input')
            if os.environ.get('PORTAL_BASELINE'):
                print('BASELINE idle observed mutations:', idle_changes(page))
                search.fill('zzzz')
                print('BASELINE immediate nonempty visible:', len(titles(page)))
                search.press('Escape')
                page.locator('.ux-sort__select').select_option('title')
                page.locator('.ux-sort__select').select_option('catalog')
                print('BASELINE catalog restored:', titles(page, '.bento-grid__standard .game-card') == baseline)
                # Negative corruption fixture only; no positive gameplay claim.
                page.evaluate("localStorage.setItem('unblockmath_recent', '[null]')")
                page.reload(wait_until='networkidle')
                page.wait_for_timeout(400)
                print('BASELINE null-history pageerrors:', len(errors))
                context.close()
                browser.close()
                return

            changes = idle_changes(page)
            assert changes == 0, changes
            print('PASS P-03 idle: 0 observed mutations over 1200ms after settling')
            # Native input: fuzzy-only title hit must remain mounted, synchronously.
            search.fill('sccrrndm')
            assert titles(page) == ['Soccer Random'], titles(page)
            assert page.locator('.game-card').count() == count
            assert search.input_value() == 'sccrrndm'
            page.screenshot(path=str(SHOTS / 'desktop-light-search.jpg'), type='jpeg', quality=75)
            search.press('Escape')
            wait_count(page, count)
            search.fill('zzzz')
            wait_count(page, 0)
            page.locator('.ux-clear-filters').click()
            wait_count(page, count)
            search.fill('Snake')
            search.fill('')
            wait_count(page, count)
            print('PASS P-01 native fuzzy search, no hits, Escape, Clear filters, empty input')

            # Synthetic IME protocol fixture, not trusted OS IME acceptance.
            search.evaluate("""input => {
                input.dispatchEvent(new CompositionEvent('compositionstart', {bubbles:true}));
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'sccrrndm');
                input.dispatchEvent(new InputEvent('input', {bubbles:true, isComposing:true, data:'sccrrndm'}));
            }""")
            page.wait_for_timeout(250)
            assert page.locator('.game-card').count() == count
            search.evaluate("input => input.dispatchEvent(new CompositionEvent('compositionend', {bubbles:true, data:'sccrrndm'}))")
            wait_count(page, 1)
            assert titles(page) == ['Soccer Random']
            search.press('Escape')
            wait_count(page, count)
            print('PASS synthetic composition fixture (OS IME not tested)')

            # Native favorites and filter combinations; React must not erase query.
            search.fill('sccrrndm')
            page.locator('.game-card[data-title="Soccer Random"] .game-card__fav').click()
            page.wait_for_timeout(300)
            assert search.input_value() == 'sccrrndm'
            assert titles(page) == ['Soccer Random']
            fav = page.locator('.ux-tag-filter__pill--fav')
            fav.click()
            wait_count(page, 1)
            two = page.locator('.ux-tag-filter__pill[data-tag="2p"]')
            two.click()
            wait_count(page, 1)
            page.locator('.category-filter__btn[data-cat-id="sports"]').click()
            wait_count(page, 1)
            assert search.input_value() == 'sccrrndm'
            page.locator('.ux-tag-filter__pill[data-tag="hacked"]').click()
            wait_count(page, 0)
            page.locator('.ux-clear-filters').click()
            wait_count(page, count)
            page.locator('.category-filter__btn[data-cat-id="word"]').click()
            wait_count(page, sum(g['cat'] == 'word' for g in games))
            page.locator('.category-filter__btn[data-cat-id="all"]').click()
            wait_count(page, count)
            favorites = page.evaluate("localStorage.getItem('unblockmath_favorites')")
            assert json.loads(favorites) == [next(g['id'] for g in games if g['title'] == 'Soccer Random')]
            print('PASS native favorite/search/tag/bundle category/extra category intersections')

            sort = page.locator('.ux-sort__select')
            sort.select_option('title')
            assert titles(page, '.bento-grid__standard .game-card') != baseline
            page.reload(wait_until='networkidle')
            page.wait_for_selector('.ux-sort__select')
            assert sort.input_value() == 'title'
            sort.select_option('catalog')
            assert titles(page, '.bento-grid__standard .game-card') == baseline
            sort.select_option('category')
            sort.select_option('catalog')
            assert titles(page, '.bento-grid__standard .game-card') == baseline
            print('PASS P-04 catalog order after A to Z, reload, Category')

            # Negative storage fixtures only, independent disposable page state.
            cases = ['[null]', '[1]', '{bad', json.dumps([
                None, 1, {}, {'title':'bad','url':'https://invalid.example','ts':1},
                {'title':'bad','url':'Games/%2e%2e/x','ts':1},
                {'title':'bad','url':' Games/Snake/index.html','ts':1},
                {'title':1,'url':'Games/Snake/index.html','ts':1},
                {'title':'bad','url':'Games/Snake/index.html','ts':'1'},
                {'title':'bad','url':'Games/Snake/index.html','ts':None},
                {'title':'bad','url':'Games/Snake/index.html','ts':float('inf')},
            ]).replace('Infinity', '1e999')]
            # Sentinel is a synthetic unrelated game key, not a real user's save.
            page.evaluate("localStorage.setItem('portal_test_game_sentinel', 'preserve')")
            for raw in cases:
                page.evaluate("raw => localStorage.setItem('unblockmath_recent', raw)", raw)
                page.reload(wait_until='networkidle')
                page.wait_for_selector('.ux-sort__select')
                page.locator('.ux-sort__select').select_option('recent')
                assert page.locator('.ux-recent__chip').count() == 0
                wait_count(page, count)
            oversized = [{'title':f'Fixture {i}', 'url':f'Games/Fixture{i}/index.html', 'ts':i} for i in range(1000)]
            oversized.insert(1, oversized[0])
            page.evaluate("raw => localStorage.setItem('unblockmath_recent', raw)", json.dumps(oversized))
            page.reload(wait_until='networkidle')
            page.wait_for_selector('.ux-recent__chip')
            assert page.locator('.ux-recent__chip').count() == 8
            assert len(set(page.locator('.ux-recent__chip').all_text_contents())) == 8
            assert idle_changes(page) == 0
            # Normal UI Play records a real catalog entry, even after bad old data.
            page.evaluate("localStorage.setItem('unblockmath_recent', '[null]')")
            page.locator('.ux-sort__select').select_option('catalog')
            search.fill('sccrrndm')
            page.locator('.game-card[data-title="Soccer Random"] .game-card__play').click()
            page.wait_for_selector('.ux-player[open]')
            assert page.locator('.ux-player__frame').get_attribute('src') == next(g['url'] for g in games if g['title'] == 'Soccer Random')
            page.wait_for_function('document.fullscreenElement?.classList.contains("ux-player__frame")')
            page.locator('.ux-player__frame').element_handle().content_frame().wait_for_load_state('load')
            page.keyboard.press('Escape')
            page.wait_for_function('!document.fullscreenElement')
            if page.locator('.ux-player').count():
                page.get_by_role('button', name='Close game and return to arcade').click()
            page.wait_for_function('!document.querySelector(".ux-player")')  # Gameplay is deliberately not this portal test.
            records = page.evaluate("JSON.parse(localStorage.getItem('unblockmath_recent'))")
            game = next(g for g in games if g['title'] == 'Soccer Random')
            assert len(records) == 1 and records[0]['url'] == game['url'] and records[0]['title'] == game['title']
            assert isinstance(records[0]['ts'], int) and records[0]['ts'] > 0
            assert page.evaluate("localStorage.getItem('portal_test_game_sentinel')") == 'preserve'
            assert page.evaluate("localStorage.getItem('unblockmath_favorites')") == favorites
            search.press('Escape')
            wait_count(page, count)
            page.locator('.ux-sort__select').select_option('recent')
            assert titles(page, '.bento-grid__standard .game-card')[0] == 'Soccer Random'
            page.locator('.ux-sort__select').select_option('catalog')
            print('PASS P-02 malformed/mixed/unsafe/nonfinite/oversized history, dedup eight, native launch writer, unrelated storage preserved')

            # Normal UI theme toggles, native focus/keyboard and mobile taps.
            page.locator('.theme-toggle').click()
            assert page.locator('html').get_attribute('data-theme') == 'dark'
            search.fill('sccrrndm')
            page.screenshot(path=str(SHOTS / 'desktop-dark-search.jpg'), type='jpeg', quality=75)
            search.press('Escape')
            for width, height in [(390, 844), (320, 800)]:
                page.set_viewport_size({'width':width,'height':height})
                for theme in ['light', 'dark']:
                    if page.locator('html').get_attribute('data-theme') != theme:
                        page.locator('.theme-toggle').tap()
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1 && document.body.scrollWidth <= innerWidth + 1")
                    assert page.locator('.theme-toggle, .ux-sort__select, .ux-tag-filter__pill, .game-card__play, .game-card__info, .game-card__fav, .ux-recent__chip').evaluate_all("els => els.every(el => {const r=el.getBoundingClientRect(); return !r.height || (r.width >=44 && r.height >=44);})")
                    search.focus()
                    assert page.locator('.search-bar').evaluate("el => getComputedStyle(el).outlineStyle === 'solid' && parseFloat(getComputedStyle(el).outlineWidth) >= 2")
                    search.fill('sccrrndm')
                    info = page.locator('.game-card[data-title="Soccer Random"] .game-card__info')
                    info.tap()
                    page.wait_for_function("document.activeElement.classList.contains('ux-detail__play')")
                    page.keyboard.press('Tab')
                    assert page.locator('.ux-detail__close').evaluate('el => el === document.activeElement')
                    page.keyboard.press('Escape')
                    assert info.evaluate('el => el === document.activeElement')
                    search.press('Escape')
                    wait_count(page, count)
                    if width == 390:
                        page.screenshot(path=str(SHOTS / f'mobile-{theme}.jpg'), type='jpeg', quality=75)
            assert not errors, errors
            print('PASS desktop/mobile 390/320 both themes: native taps, focus, dialog keyboard, targets, overflow; zero portal pageerrors')
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    print(f'portal refurbishment checks passed: {count} catalog entries; four JPEG screenshots')


if __name__ == '__main__':
    main()
