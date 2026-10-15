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
from update_game_descriptions import (Head, PROTECTED, OTHER_OWNERS, REPLACE,
                                      catalog_entries, description_for, entry_bytes,
                                      git_bytes, patch)


def description_checks(baseline=None):
    # ASCII entities preserve UTF-8, legacy encodings, BOM and CRLF byte-for-byte.
    description = 'A "quote" & <tag>, café and 日本語'
    for raw in (
        b'\xef\xbb\xbf<!doctype html><HEAD>\r\n<meta charset="utf-8">\r\n</HEAD><body>unchanged</body>',
        b'<head><meta charset="windows-1252"><title>caf\xe9</title></head><body>\x80</body>',
        b'<head><!-- </head> --><script>var s="</head>";</script><style>/* </head> */</style></head><body></body>',
        b'<head><title>Title</title></head><body><meta name="description" content="body only"></body>',
    ):
        updated = patch(raw, description)
        before, after = Head(raw), Head(updated)
        start, end, value = after.descriptions[0]
        newline = b'\r\n' if b'\r\n' in raw else b'\n'
        assert value == description
        assert updated[:start] + updated[end + len(newline):] == raw
        assert start == before.ends[0] and end < after.ends[0]
        assert patch(updated, description) == updated
    raw = b'<head><meta NAME="Description" content="old"></head><body>unchanged</body>'
    assert patch(raw, description) == raw  # Preserve meaningful existing metadata.
    updated = patch(raw, description, replace=True)
    old_start, old_end, _ = Head(raw).descriptions[0]
    start, end, value = Head(updated).descriptions[0]
    assert value == description
    assert raw[:old_start] == updated[:start] and raw[old_end:] == updated[end:]
    assert patch(updated, description, replace=True) == updated
    for invalid in (b'<body>no head</body>', b'<head><meta name="description"><meta name="description"></head>'):
        try:
            patch(invalid, description)
        except AssertionError:
            pass
        else:
            raise AssertionError('Ambiguous head/description accepted')

    entries = list(catalog_entries())
    protected = [path for _, path in entries if path.startswith(PROTECTED)]
    assert protected == ['Games/Character AI/Alsen.html']
    assert git_bytes('rev-parse', 'HEAD:Games/Character AI').strip() == b'b7b7e60e98c11b6ccdebbf8f480a072b8b6f2017'
    assert not git_bytes('diff', '--name-only', 'HEAD', '--', PROTECTED).strip()
    eligible = [(game, path) for game, path in entries if not path.startswith(PROTECTED)]
    assert len(entries) == 125 and len(eligible) == 124
    if baseline:
        owned = [(game, path) for game, path in eligible if not path.startswith(OTHER_OWNERS)]
        for game, path in owned:
            original = git_bytes('show', baseline + ':' + path)
            assert entry_bytes(path) == patch(original, description_for(game), game['id'] in REPLACE), path
        print(f'PASS metadata-only: {len(owned)} owned entries unchanged outside the approved description patch')
    missing = []
    for _, path in eligible:
        descriptions = Head(entry_bytes(path)).descriptions
        if len(descriptions) != 1 or not descriptions[0][2].strip():
            missing.append(path)
    assert not missing, 'Missing/duplicate static head descriptions (no pending-owner exemption): ' + repr(missing)
    print('PASS descriptions: 124/124 nonprotected entries; Character AI unchanged; byte-preserving parser fixtures')


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


def static_checks(baseline=None):
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
    description_checks(baseline)
    counts = dict.fromkeys(('description', 'og:title', 'og:description'), 0)
    for game in games:
        meta = Metadata()
        path = unquote(game['url']).removeprefix('./')
        meta.feed(entry_bytes(path).decode(errors='replace'))
        for key in counts:
            counts[key] += bool(meta.meta.get(key))
    print(f'PASS static: {count} games, {len(urls)} sitemap URLs, metadata/manifest/3 icon sizes')
    print('Static game-page metadata (worktree where present, otherwise HEAD): ' + json.dumps(counts))
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
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--browser', action='store_true')
    mode.add_argument('--check', action='store_true', help='Static checks only; no writes (the default)')
    parser.add_argument('--metadata-baseline', help='Also assert metadata-only entry diffs against this Git revision')
    args = parser.parse_args()
    games = static_checks(args.metadata_baseline)
    if args.browser:
        browser_checks(games)
