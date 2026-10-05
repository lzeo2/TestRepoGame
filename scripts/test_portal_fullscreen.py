#!/usr/bin/env python3
"""Run with xvfb-run -a python3 -B scripts/test_portal_fullscreen.py.

All-catalog routing uses explicitly mocked game documents, not gameplay proof.
Snake gameplay uses its real unchanged files. Denial uses real Permissions-Policy.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import tempfile
import threading
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    games = json.loads((ROOT / 'games.json').read_text())
    output = Path(tempfile.mkdtemp(prefix='portal-fullscreen-'))
    print('OUTPUT=' + str(output), flush=True)
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
        def end_headers(self):
            if 'deny-fullscreen=1' in self.path:
                self.send_header('Permissions-Policy', 'fullscreen=()')
            super().end_headers()
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    errors = []
    def watch(page):
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('response', lambda response: errors.append(f'HTTP {response.status} {response.url}') if response.status >= 400 else None)
    def check_player(page, url, native=True):
        page.wait_for_function('document.querySelector(".ux-player")?.open')
        page.wait_for_function('(native) => !!document.fullscreenElement === native', arg=native)
        frame = page.locator('.ux-player__frame')
        assert frame.get_attribute('src') == url and frame.get_attribute('allowfullscreen') is not None
        assert frame.evaluate('f => { const r=f.getBoundingClientRect(); return r.x===0 && r.y===0 && r.width===innerWidth && r.height===innerHeight; }')
        assert page.locator('.ux-player__controls').is_visible() is (not native)
        assert page.locator('.game-modal').count() == 0 and len(page.context.pages) == 1
        assert page.evaluate('getComputedStyle(document.documentElement).overflow === "hidden"')
        document_frame = frame.element_handle().content_frame()
        document_frame.wait_for_url('**/' + url.replace(' ', '%20'))
        document_frame.wait_for_load_state('load')
        return document_frame
    def close_player(page):
        page.keyboard.press('Escape')
        page.wait_for_function('!document.fullscreenElement')
        if page.locator('.ux-player').count():
            page.get_by_role('button', name='Close game and return to arcade').click()
        page.wait_for_function('!document.querySelector(".ux-player")')
        assert len(page.frames) == 1
        # Chromium briefly suppresses immediate re-entry after user Escape.
        page.wait_for_timeout(1100)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=False, args=['--no-sandbox'])
            try:
                context = browser.new_context(viewport={'width':1280, 'height':900}, has_touch=True)
                context.on('page', watch)
                # Explicit routing fixture: native fullscreen/real portal input, no game acceptance.
                context.route('**/Games/**', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><title>Routing fixture</title><p>Routing fixture, not gameplay.</p>'))
                page = context.new_page(); page.set_default_timeout(20000); page.goto(origin + '/')
                page.wait_for_selector('.ux-sort__select')
                for game in games:
                    card = page.locator('.game-card').filter(has=page.get_by_text(game['title'], exact=True))
                    card.locator('.game-card__play').click()
                    check_player(page, game['url'])
                    close_player(page)
                assert page.locator('.ux-recent__chip').count() <= 8
                snake = next(g for g in games if g['title'] == 'Snake')
                card = page.locator('.game-card[data-title="Snake"]')
                for method in ['card', 'keyboard', 'info', 'recent', 'random']:
                    if method == 'card': card.locator('.game-card__title').click()
                    elif method == 'keyboard': card.focus(); page.keyboard.press('Enter')
                    elif method == 'info':
                        card.locator('.game-card__info').click(); page.locator('.ux-detail__play').click()
                    elif method == 'recent': page.get_by_role('button', name='Snake', exact=True).click()
                    else: page.locator('#random-game-btn').click()
                    url = page.locator('.ux-player__frame').get_attribute('src')
                    assert url in [g['url'] for g in games]
                    if method != 'random': assert url == snake['url']
                    check_player(page, url); close_player(page)
                context.close()
                # Real game: ordinary Start, Pause/Resume, wall loss and restart, no grants.
                context = browser.new_context(viewport={'width':1280, 'height':900})
                context.on('page', watch)
                page = context.new_page(); page.set_default_timeout(20000); page.goto(origin + '/')
                page.wait_for_selector('.ux-sort__select')
                page.locator('.game-card[data-title="Snake"] .game-card__play').click()
                frame = check_player(page, snake['url'])
                frame.locator('#start-btn').click()
                frame.locator('#pause-btn').click(); assert frame.locator('#pause-btn').inner_text() == 'Resume'
                frame.locator('#pause-btn').click(); frame.locator('#game-over:not(.hidden)').wait_for()
                frame.locator('#restart-btn').click(); assert frame.locator('#start-btn').is_enabled()
                page.screenshot(path=str(output / 'real-snake-fullscreen.jpg'), quality=80)
                close_player(page); assert frame.is_detached()
                context.close()
                for width in (390, 320):
                    context = browser.new_context(viewport={'width':width, 'height':844}, has_touch=True)
                    context.on('page', watch)
                    context.route('**/Games/**', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><p>Denied-fullscreen routing fixture, not gameplay.</p>'))
                    page = context.new_page(); page.set_default_timeout(20000); page.goto(origin + '/?deny-fullscreen=1')
                    page.wait_for_selector('.ux-sort__select')
                    assert not page.evaluate('document.fullscreenEnabled')
                    page.locator('.game-card[data-title="Snake"] .game-card__play').tap()
                    check_player(page, snake['url'], native=False)
                    assert not page.get_by_role('button', name='Fullscreen', exact=True).is_visible()
                    back = page.get_by_role('button', name='Close game and return to arcade')
                    assert back.evaluate('b=>b.offsetWidth>=44 && b.offsetHeight>=44')
                    if width == 390: page.screenshot(path=str(output / 'denied-390-routing-fixture.jpg'), quality=80)
                    back.tap(); page.wait_for_function('!document.querySelector(".ux-player")')
                    assert page.evaluate('document.activeElement.closest(".game-card")?.dataset.title === "Snake"')
                    context.close()
            finally: browser.close()
        assert not errors, errors
        (output / 'result.json').write_text(json.dumps({'errors':errors, 'catalogRoutingFixtures':len(games), 'entryPoints':['Play','card','Enter','Info Play','recent','random'], 'realSnake':'Start/Pause/Resume/wall loss/restart/frame detached', 'deniedFullscreenWidths':[390,320]}, indent=2)+'\n')
        print(f'PASS {len(games)} native fullscreen routing fixtures/all entrypoints; real Snake UI; actual policy denial390/320, edge-to-edge/back/focus/frame cleanup/no errors.', flush=True)
    except Exception as error:
        (output / 'failure.json').write_text(json.dumps({'error':repr(error),'errors':errors}, indent=2)+'\n'); raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=3)


if __name__ == '__main__': main()
