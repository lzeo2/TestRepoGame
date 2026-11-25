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
            assert card.locator('.game-card__info').evaluate('el => el === document.activeElement')
            # Real DOM/modal lifecycle checks: preserve an already-inert sibling,
            # isolate late siblings, wrap native Tab and restore focus on every exit.
            page.evaluate('''() => {
              const existing = document.createElement('section');
              existing.id = 'existing-inert'; existing.inert = true;
              document.body.append(existing);
            }''')
            for exit_path in ['close', 'backdrop', 'escape', 'route', 'back', 'close']:
                card.focus()
                page.keyboard.press('i')
                page.wait_for_selector('.ux-detail')
                assert page.locator('.ux-detail__play').evaluate('el => el === document.activeElement')
                assert page.evaluate('''() => [...document.body.children].every(el =>
                  el.matches('.ux-detail') ? !el.inert : el.inert)''')
                page.evaluate('''() => { const el=document.createElement('button');
                  el.id='late-background'; el.textContent='Background fixture'; document.body.append(el); }''')
                page.wait_for_function("document.getElementById('late-background').inert")
                page.keyboard.press('Shift+Tab')
                assert page.locator('.ux-detail__close').evaluate('el => el === document.activeElement')
                page.keyboard.press('Tab')
                assert page.locator('.ux-detail__play').evaluate('el => el === document.activeElement')
                if exit_path == 'close':
                    page.keyboard.press('Tab')
                    page.keyboard.press('Enter')
                elif exit_path == 'backdrop':
                    page.locator('.ux-detail__backdrop').click(position={'x': 5, 'y': 5})
                elif exit_path == 'escape':
                    page.keyboard.press('Escape')
                elif exit_path == 'route':
                    page.evaluate("location.hash = 'detail-route-fixture'")
                else:
                    page.evaluate("history.pushState({}, '', '#detail-back-fixture'); history.back()")
                page.wait_for_selector('.ux-detail', state='detached')
                assert card.locator('.game-card__info').evaluate('el => el === document.activeElement')
                assert page.locator('#existing-inert').evaluate('el => el.inert')
                assert page.locator('#late-background').evaluate('el => !el.inert')
                assert page.locator('#root').evaluate('el => !el.inert')
                page.evaluate("document.getElementById('late-background').remove()")
                page.keyboard.press('Tab')
                assert not page.locator('.ux-detail').count()
            page.evaluate("document.getElementById('existing-inert').remove()")
            print('PASS detail modal: native keyboard, Tab wrap, repeated close/reopen, backdrop/Escape/route exits, focus and inert restoration')
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
