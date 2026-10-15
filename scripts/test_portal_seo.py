#!/usr/bin/env python3
"""Static SEO regression; --browser also checks real portal UI on root/subpath.

Uses existing Playwright/Chromium only. Game documents in launch checks are
explicit fixtures, not gameplay acceptance. The bounded server always closes.
"""
import argparse
import functools
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import struct
import subprocess
import tempfile
import threading
from urllib.parse import unquote, urljoin
import xml.etree.ElementTree as ET
from generate_sitemap import BASE, NS, ROOT, sitemap


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.links = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            self.meta[attrs.get('name', attrs.get('property', '')).lower()] = attrs.get('content')
        if tag == 'link':
            self.links[attrs.get('rel')] = attrs.get('href')


def static_checks():
    content, count = sitemap()
    assert (ROOT / 'sitemap.xml').read_bytes() == content, 'Regenerate sitemap'
    urls = [e.text for e in ET.fromstring(content).findall('.//{' + NS + '}loc')]
    assert len(urls) == count + 1 and all(u.startswith(BASE) for u in urls)
    assert any('%20' in u for u in urls), 'Space-containing paths must be encoded'
    page = Metadata(); page.feed((ROOT / 'index.html').read_text())
    assert page.links['canonical'] == page.meta['og:url'] == BASE
    assert page.meta['og:image'] == BASE + 'assets/portal-share.png'
    assert page.meta['description'] == page.meta['og:description']
    assert page.links['manifest'] == './manifest.webmanifest'
    manifest = json.loads((ROOT / 'manifest.webmanifest').read_text())
    for key in ('id', 'start_url', 'scope'):
        assert urljoin(BASE + 'manifest.webmanifest', manifest[key]) == BASE
    assert manifest['display'] == 'standalone'
    assert manifest['theme_color'] == manifest['background_color'] == '#f5f5f7'
    for icon in manifest['icons'] + [{'src': page.links['apple-touch-icon'], 'sizes': '180x180'}]:
        raw = (ROOT / icon['src']).read_bytes()
        assert raw[:8] == b'\x89PNG\r\n\x1a\n'
        assert 'x'.join(map(str, struct.unpack('>II', raw[16:24]))) == icon['sizes']
    games = json.loads((ROOT / 'games.json').read_text())
    counts = dict.fromkeys(('description', 'og:title', 'og:description'), 0)
    for game in games:
        meta = Metadata()
        path = unquote(game['url']).removeprefix('./')
        meta.feed(subprocess.check_output(['git', 'show', 'HEAD:' + path], cwd=ROOT).decode(errors='replace'))
        for key in counts:
            counts[key] += bool(meta.meta.get(key))
    print(f'PASS static: {count} games, {len(urls)} sitemap URLs, metadata/manifest/3 icon sizes')
    print('Existing Git game-page metadata (not fixed by runtime selection): ' + json.dumps(counts))
    return games


def browser_checks(games):
    from playwright.sync_api import sync_playwright
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000, 'Disk floor reached'
    output = Path(tempfile.mkdtemp(prefix='portal-seo-'))
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
        def do_GET(self):
            if self.path.startswith('/TestRepoGame/'):
                self.path = self.path[len('/TestRepoGame'):]
            super().do_GET()
        def end_headers(self):
            self.send_header('Permissions-Policy', 'fullscreen=()')
            super().end_headers()
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    errors = []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
            try:
                for width, theme, mount in [(1280, 'light', '/'), (1280, 'dark', '/TestRepoGame/'),
                                             (390, 'light', '/TestRepoGame/'), (390, 'dark', '/')]:
                    context = browser.new_context(viewport={'width': width, 'height': 844}, color_scheme=theme)
                    context.route('**/Games/**', lambda route: route.fulfill(content_type='text/html', body='<!doctype html><title>Launch fixture, not gameplay</title>'))
                    page = context.new_page(); page.set_default_timeout(15000)
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('response', lambda response: errors.append(f'HTTP {response.status}: {response.url}') if response.status >= 400 else None)
                    page.goto(origin + mount)
                    page.wait_for_selector('.game-card__info')
                    page.wait_for_function('(n) => document.querySelectorAll(".game-card").length === n', arg=len(games))
                    assert page.title() == 'UNBLOCKMATH // ARCADE'
                    assert page.locator('html').get_attribute('data-theme') == theme
                    assert page.locator('link[rel="manifest"]').evaluate('(e) => e.href') == origin + mount + 'manifest.webmanifest'
                    manifest = context.request.get(origin + mount + 'manifest.webmanifest')
                    assert manifest.ok and manifest.json()['scope'] == './'
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    page.screenshot(path=str(output / f'{width}-{theme}.jpg'), quality=75)
                    # All 125 descriptions use real native Info clicks; no synthesized metadata fixtures.
                    for game in (games if width == 1280 and theme == 'light' else [games[0]]):
                        card = page.locator('.game-card').filter(has=page.get_by_text(game['title'], exact=True))
                        card.locator('.game-card__info').click()
                        expected = game['title'] + ' | UNBLOCKMATH // ARCADE'
                        page.wait_for_function('(t) => document.title === t', arg=expected)
                        assert page.locator('meta[name="description"]').get_attribute('content') == game['title'] + ': ' + game['desc']
                        assert page.locator('meta[property="og:title"]').get_attribute('content') == expected
                        page.locator('.ux-detail__close').click()
                        page.wait_for_function('document.title === "UNBLOCKMATH // ARCADE"')
                    game = games[0]
                    page.locator('.game-card').filter(has=page.get_by_text(game['title'], exact=True)).locator('.game-card__play').click()
                    page.wait_for_function('(t) => document.title.startsWith(t + " | ")', arg=game['title'])
                    assert page.locator('meta[name="description"]').get_attribute('content') == game['title'] + ': ' + game['desc']
                    assert page.locator('link[rel="canonical"]').get_attribute('href') == BASE
                    page.get_by_role('button', name='Close game and return to arcade').click()
                    page.wait_for_function('document.title === "UNBLOCKMATH // ARCADE"')
                    assert page.locator('meta[name="description"]').get_attribute('content') == 'Browse the UNBLOCKMATH arcade by game, genre, or players.'
                    assert page.evaluate('navigator.serviceWorker.getRegistrations().then(r => r.length)') == 0
                    context.close()
            finally:
                browser.close()
        assert not errors, errors
        print(f'PASS browser: {len(games)} Info descriptions; player/reset; root/subpath; desktop/mobile light/dark; no page/HTTP errors; no service worker')
        print('Screenshots: ' + output.name + '/{1280,390}-{light,dark}.jpg (temporary evidence)')
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=3)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true')
    args = parser.parse_args()
    games = static_checks()
    if args.browser:
        browser_checks(games)
