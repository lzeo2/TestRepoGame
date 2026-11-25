#!/usr/bin/env python3
"""Bounded portal layout and catalog-retry checks; no game runtime acceptance."""
import functools
import json
import threading
from pathlib import Path
from http.server import ThreadingHTTPServer
from playwright.sync_api import sync_playwright
from test_portal_refurbishment import QuietHandler, ROOT


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    shots = Path('/tmp/portal-discovery')
    shots.mkdir(exist_ok=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                         args=['--no-sandbox', '--disable-dev-shm-usage'])
            context = browser.new_context(viewport={'width': 1440, 'height': 1000})
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            base = f'http://127.0.0.1:{server.server_port}/'
            page.goto(base, wait_until='networkidle')
            page.wait_for_selector('.ux-search-key')
            for width, height, label in [(1440, 1000, 'desktop'), (390, 844, 'mobile'), (320, 800, 'narrow')]:
                page.set_viewport_size({'width': width, 'height': height})
                for theme in ['light', 'dark']:
                    if page.locator('html').get_attribute('data-theme') != theme:
                        page.locator('.theme-toggle').click()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
                    desc = page.locator('.game-card__desc').first
                    assert desc.is_visible() and desc.inner_text().strip()
                    assert page.locator('.game-card').count() == page.locator('.game-card__desc').count()
                    assert desc.evaluate('el => getComputedStyle(el).webkitLineClamp') == '2'
                    assert page.locator('.game-card__play, .game-card__fav, .game-card__info').evaluate_all('els => els.every(el => {const r=el.getBoundingClientRect();return r.width>=44 && r.height>=44})')
                    page.screenshot(path=str(shots / f'{label}-{theme}.png'))
            page.keyboard.press('/')
            assert page.locator('.search-bar__input').evaluate('el => el === document.activeElement')
            print('PASS discovery: descriptions, search shortcut, 44px actions, 1440/390/320 layouts in both themes')
            context.close()

            # Explicit failure fixture: fail authored metadata fetch once while
            # allowing the compiled portal catalog to render normally.
            context = browser.new_context()
            context.add_init_script('''(() => {
              const original = window.fetch;
              window.__metadataAttempts = 0;
              window.fetch = function(url, ...args) {
                if (String(url).includes('games.json') && new Error().stack.includes('portal-ux.js')) {
                  window.__metadataAttempts++;
                  if (window.__metadataAttempts === 1) return Promise.reject(new Error('fixture: transient catalog failure'));
                }
                return original.call(this, url, ...args);
              };
            })();''')
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(base, wait_until='networkidle')
            page.get_by_role('button', name='Retry catalog', exact=True).wait_for()
            page.wait_for_timeout(500)
            assert page.evaluate('window.__metadataAttempts') == 1, 'failure must not create retry storm'
            page.get_by_role('button', name='Retry catalog', exact=True).click()
            page.wait_for_selector('.ux-catalog-error', state='detached')
            page.wait_for_selector('.ux-sort__select')
            page.locator('.search-bar__input').fill('Snake')
            card = page.locator('.game-card[data-title="Snake"]')
            card.locator('.game-card__info').click()
            assert page.locator('.ux-detail__desc').inner_text().strip()
            page.keyboard.press('Escape')
            page.route('**/Games/Snake/index.html', lambda route: route.fulfill(body='<!doctype html><title>Portal route fixture</title>', content_type='text/html'))
            card.locator('.game-card__play').click()
            page.wait_for_selector('.ux-player[open]')
            assert page.locator('.ux-player__frame').get_attribute('src') == 'Games/Snake/index.html'
            assert page.evaluate('window.__metadataAttempts') == 2
            page.keyboard.press('Escape')
            page.wait_for_function('!document.fullscreenElement')
            page.get_by_role('button', name='Close game and return to arcade').click()
            page.route('**/Games/**', lambda route: route.fulfill(body='<!doctype html><title>Random route fixture</title>', content_type='text/html'))
            page.locator('#random-game-btn').click()
            page.wait_for_selector('.ux-player[open]')
            catalog_urls = {game['url'] for game in json.loads((ROOT / 'games.json').read_text())}
            assert page.locator('.ux-player__frame').get_attribute('src') in catalog_urls
            assert not errors, errors
            print('PASS recovery: one failed metadata request, explicit retry, details, card launch and random launch restored; zero pageerrors')
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == '__main__':
    main()
