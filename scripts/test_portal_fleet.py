#!/usr/bin/env python3
"""Focused portal focus/empty-state regression; no game or OS IME acceptance."""
import functools
import json
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright
from test_portal_refurbishment import QuietHandler, ROOT, titles

OUTPUT = Path('/tmp/trg-fleet/lane4')


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    count = len(json.loads((ROOT / 'games.json').read_text()))
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox', '--disable-dev-shm-usage'])
            try:
                page = browser.new_page(viewport={'width': 1280, 'height': 900}, color_scheme='light', has_touch=True)
                page.set_default_timeout(15000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='networkidle')
                page.wait_for_selector('.ux-sort__select')
                search = page.locator('.search-bar__input')
                assert len(titles(page)) == count
                page.locator('.ux-tag-filter__pill--fav').click()
                assert page.locator('.ux-empty-hint').inner_text() == "No favorites here yet. Use a game's heart to save it."
                clear = page.locator('.ux-clear-filters')
                clear.focus()
                page.keyboard.press('Enter')
                assert search.evaluate('el => el === document.activeElement')
                assert len(titles(page)) == count
                search.fill('snake')
                # Ordered-subsequence search also matches Merge Cats Defender Hacked.
                assert titles(page) == ['Snake', 'Snake Hacked', 'Merge Cats Defender Hacked']
                page.locator('.game-card[data-title="Snake"] .game-card__play').focus()
                page.keyboard.press('ArrowRight')
                assert page.evaluate('document.activeElement.dataset.title') == 'Snake Hacked'
                page.keyboard.press('End')
                assert page.evaluate('document.activeElement.dataset.title') == 'Merge Cats Defender Hacked'
                page.locator('.game-card[data-title="Snake Hacked"] .game-card__fav').focus()
                page.keyboard.press('Home')
                assert page.evaluate('document.activeElement.dataset.title') == 'Snake'
                page.keyboard.press('Tab')
                assert page.locator('.game-card[data-title="Snake"] .game-card__play').evaluate('el => el === document.activeElement')
                search.fill('sccrrndm')
                assert titles(page) == ['Soccer Random']
                assert page.locator('.bento-grid').evaluate('el => el.getBoundingClientRect().top < 350')
                search.fill('zzzz')
                assert not titles(page)
                assert 'shorter search' in page.locator('.ux-empty-hint').inner_text()
                page.screenshot(path=str(OUTPUT / 'empty-desktop-light.jpg'), quality=80)
                clear.click()
                assert search.evaluate('el => el === document.activeElement')
                assert len(titles(page)) == count
                for width, height, label in [(1280, 900, 'desktop'), (390, 844, 'mobile')]:
                    page.set_viewport_size({'width': width, 'height': height})
                    for theme in ['light', 'dark']:
                        if page.locator('html').get_attribute('data-theme') != theme:
                            page.locator('.theme-toggle').tap()
                        page.evaluate('window.scrollTo(0, 0)')
                        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                        assert page.locator('.ux-sort__select, .ux-tag-filter__pill, .category-filter__btn, .game-card__play, .game-card__fav, .game-card__info').evaluate_all('els => els.every(el => {const r=el.getBoundingClientRect(); return !r.height || (r.width>=44 && r.height>=44);})')
                        page.screenshot(path=str(OUTPUT / f'{label}-{theme}.jpg'), quality=80)
                # Saved-history layout fixture, not proof of a game launch.
                page.evaluate("localStorage.setItem('unblockmath_recent', JSON.stringify([{title:'Snake', url:'Games/Snake/index.html', ts:1}]))")
                page.reload(wait_until='networkidle')
                recent = page.locator('.ux-recent__chip')
                recent.wait_for()
                assert recent.inner_text() == 'Snake'
                assert recent.evaluate('el => el.offsetWidth >= 44 && el.offsetHeight >= 44')
                assert page.locator('.ux-recent').evaluate("el => getComputedStyle(el).scrollbarWidth === 'thin' && getComputedStyle(el).paddingTop === '4px'")
                page.screenshot(path=str(OUTPUT / 'mobile-dark-recent-fixture.jpg'), quality=80)
                assert not errors, errors
                print(f'PASS fleet portal: {count} games; empty hints, reset focus, filtered nested keyboard navigation, native Tab, fuzzy search, 44px targets; desktop/mobile light/dark; saved-recent layout fixture; zero console/page errors')
            finally:
                browser.close()
    finally:
        (OUTPUT / 'console-errors.json').write_text(json.dumps(errors, indent=2) + '\n')
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == '__main__':
    main()
