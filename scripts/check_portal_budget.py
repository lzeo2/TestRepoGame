#!/usr/bin/env python3
"""Cold Chromium portal weight check; no launch, scroll, installs or saved artifacts.

Run: python3 -B scripts/check_portal_budget.py
Budget is strictly <2,000,000 local bytes through portal-ready + 1.5s, a stronger
window than first paint alone. External analytics are observed, not blocked or
included in the local gate. Local HTTP is uncompressed, not Netlify delivery.
"""
import functools
import hashlib
import json
import shutil
import threading
from collections import Counter
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUDGET = 2_000_000


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def measure(browser, origin, label, width, height, expected):
    context = browser.new_context(
        viewport={'width': width, 'height': height},
        is_mobile=label == 'mobile', has_touch=label == 'mobile',
        color_scheme='light', service_workers='block',
    )
    try:
        page = context.new_page()
        page.set_default_timeout(15_000)
        requests, failures, errors, frames = [], [], [], []
        pending = set()
        responses = []
        external_wire = []
        cdp = context.new_cdp_session(page)
        cdp.send('Network.enable')
        cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
        remote_ids = set()
        cdp.on('Network.requestWillBeSent', lambda event: remote_ids.add(event['requestId'])
               if urlsplit(event['request']['url']).netloc != urlsplit(origin).netloc else None)
        cdp.on('Network.loadingFinished', lambda event: external_wire.append(event['encodedDataLength'])
               if event['requestId'] in remote_ids else None)

        def requested(request):
            requests.append(request)
            if urlsplit(request.url).netloc == urlsplit(origin).netloc:
                pending.add(request)

        page.on('request', requested)
        page.on('requestfinished', lambda request: pending.discard(request))
        page.on('requestfailed', lambda request: (pending.discard(request), failures.append(request)))
        page.on('response', lambda response: responses.append(response))
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('frameattached', lambda frame: frames.append(frame))
        page.goto(origin + '/index.html', wait_until='domcontentloaded', timeout=20_000)
        page.wait_for_function("n => document.querySelectorAll('.game-card').length === n", arg=expected)
        page.wait_for_selector('.ux-sort__select')
        page.wait_for_function("document.fonts.status === 'loaded'")
        # Do not use the visual-test helper: it forces every lazy image eager.
        page.wait_for_timeout(1500)
        snapshot = page.evaluate("""() => ({
            paints: Object.fromEntries(performance.getEntriesByType('paint').map(e => [e.name, e.startTime])),
            resources: [...performance.getEntriesByType('navigation'), ...performance.getEntriesByType('resource')]
                .map(e => ({name:e.name, start:e.startTime, end:e.responseEnd,
                           encoded:e.encodedBodySize, decoded:e.decodedBodySize, transfer:e.transferSize})),
            blockingScripts: [...document.scripts].filter(s => s.src && !s.async && !s.defer && s.type !== 'module').map(s => s.src),
            images: [...document.querySelectorAll('.game-card img')].map(i => ({
                lazy:i.loading === 'lazy', async:i.decoding === 'async', loaded:i.complete && i.naturalWidth > 0
            }))
        })""")
        local = [r for r in snapshot['resources'] if urlsplit(r['name']).netloc == urlsplit(origin).netloc]
        remote = [r for r in requests if urlsplit(r.url).netloc != urlsplit(origin).netloc]
        counts = Counter(unquote(urlsplit(r.url).path).lstrip('/') or 'index.html'
                         for r in requests if r not in remote)
        static = {}
        for path, count in sorted(counts.items()):
            file = (ROOT / path).resolve()
            assert file.is_relative_to(ROOT) and file.is_file(), f'Local asset missing/unsafe: {path}'
            static[path] = {'bytes': file.stat().st_size, 'requests': count}
        requested_bytes = sum(row['bytes'] * row['requests'] for row in static.values())
        decoded = sum(r['decoded'] for r in local)
        transfer = sum(r['transfer'] for r in local)
        fcp = snapshot['paints'].get('first-contentful-paint')
        images = snapshot['images']
        game_requests = [p for p in counts if p.startswith(('Games/', 'storage/', 'uv/'))]
        bad_local = [unquote(urlsplit(r.url).path) for r in failures if r not in remote]
        bad_status = [unquote(urlsplit(r.url).path) for r in responses
                      if urlsplit(r.url).netloc == urlsplit(origin).netloc and r.status >= 400]
        result = {
            'viewport': label, 'size': [width, height], 'cards': expected,
            'budget_local_bytes_exclusive': BUDGET,
            'local_requested_static_bytes': requested_bytes,
            'local_unique_static_bytes': sum(row['bytes'] for row in static.values()),
            'local_decoded_body_bytes': decoded,
            'local_encoded_body_bytes': sum(r['encoded'] for r in local),
            'local_resource_timing_transfer_bytes': transfer,
            'paint_ms': {k: round(v, 1) for k, v in snapshot['paints'].items()},
            # Full bodies of requests started by FCP, not exact bytes at paint.
            'local_started_by_fcp_full_body_bytes': sum(r['decoded'] for r in local if fcp is not None and r['start'] <= fcp),
            'tile_images': len(images), 'loaded_tiles': sum(i['loaded'] for i in images),
            'lazy_tiles': sum(i['lazy'] for i in images),
            'iframes_attached': len(frames), 'game_requests': game_requests,
            'external_requests': len(remote), 'external_failed': sum(r in remote for r in failures),
            'external_without_response': sum(r not in failures and not any(s.request == r for s in responses) for r in remote),
            'external_cdp_finished_wire_bytes': sum(external_wire),
            'external_resource_timing_bytes': sum(r['transfer'] for r in snapshot['resources'] if r not in local),
            'external_endpoints': sorted({urlsplit(r.url).netloc + urlsplit(r.url).path for r in remote}),
            'local_assets': static,
            'local_resource_timings': [{**r, 'name': unquote(urlsplit(r['name']).path)} for r in local],
        }
        print(json.dumps(result, sort_keys=True), flush=True)
        assert not pending, 'Local requests still pending at observation cutoff'
        assert not bad_local and not bad_status, (bad_local, bad_status)
        assert not errors, errors
        assert fcp is not None, 'No first contentful paint recorded'
        assert 0 < max(requested_bytes, decoded, transfer) < BUDGET, 'Local portal budget exceeded'
        assert not snapshot['blockingScripts'], snapshot['blockingScripts']
        assert images and all(i['lazy'] and i['async'] for i in images), 'Tile lazy/async regression'
        assert any(i['loaded'] for i in images), 'No tile artwork loaded'
        assert any(not i['loaded'] for i in images), 'All tile artwork loaded before scrolling'
        assert not frames and page.locator('iframe').count() == 0, 'Iframe attached before launch'
        assert not game_requests, game_requests
        print(f'PASS {label}: local requested={requested_bytes} decoded={decoded} transfer={transfer} < {BUDGET}; '
              f'lazy={len(images)} loaded={sum(i["loaded"] for i in images)}; no game requests/iframes', flush=True)
    finally:
        context.close()


def main():
    assert shutil.disk_usage(ROOT).free >= 2 * 1024**3, 'Disk below 2 GiB: stop and ask operator'
    chromium = shutil.which('chromium')
    assert chromium, 'Existing system Chromium required; do not install'
    sources = [ROOT / 'index.html', ROOT / 'games.json',
               *ROOT.glob('assets/index-*.js'), *ROOT.glob('assets/index-*.css'),
               *ROOT.glob('assets/portal-*.js'), *ROOT.glob('assets/portal-*.css')]
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    print('Source SHA256 ' + json.dumps(hashes, sort_keys=True), flush=True)
    expected = len(json.loads((ROOT / 'games.json').read_text()))
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=chromium, headless=True,
                                         args=['--no-sandbox', '--disable-dev-shm-usage'])
            try:
                print('Chromium ' + browser.version, flush=True)
                for label, width, height in [('desktop', 1280, 900), ('mobile', 390, 844)]:
                    measure(browser, f'http://127.0.0.1:{server.server_port}', label, width, height, expected)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
    assert all(hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == digest
               for p, digest in hashes.items()), 'Portal sources changed during measurement; rerun after writers settle'
    print('PASS portal local budget: 2/2 viewports. External bytes are network-dependent; '
          'zero timing bytes do not prove zero traffic. Not the full game smoke gate.')


if __name__ == '__main__':
    main()
