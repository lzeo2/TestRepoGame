"""Reproduce eight UI comparisons, validate an unregistered draft, log preview requests."""
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
import hashlib
import importlib.util
import json
import sys

from PIL import Image, ImageDraw, ImageOps
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DESIGN = ROOT / 'docs/citisten-design'
OUT = ROOT / 'docs/maintenance/audits/citisten-QA'
spec = importlib.util.spec_from_file_location('ui_qa', ROOT / 'Games/Citisten3D/ui-qa.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)

# Explicit source-pixel rectangles, not regenerated or repainted design references.
PIECES = {
    'main-menu': ('menu', None, 'J-I-ui-menu', None),
    'builder-toolbar': ('toolbar', (320, 855, 1265, 940), 'J-B-ui-toolbar', (16, 782, 1174, 854)),
    'zoning-panel': ('toolbar', (520, 705, 1065, 850), 'J-B-ui-toolbar', (310, 624, 880, 774)),
    'budget-power-water': ('hud', (340, 8, 1225, 89), 'J-C-D-ui-hud', (174, 10, 1060, 94)),
    'minimap': ('hud', (1145, 690, 1580, 980), 'J-C-D-ui-hud', (1185, 390, 1430, 750)),
    'day-hud': ('hud', None, 'J-C-D-ui-hud', None),
    'night-alert-defense': ('nightalert', None, 'J-F-G-ui-nightalert', None),
    'game-over': ('gameover', None, 'J-H-ui-gameover', None),
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    qa.disk()
    path.write_text(json.dumps(value, indent=2) + '\n')


def crop(path, box):
    image = Image.open(path).convert('RGB')
    if box:
        x, y, right, bottom = box
        assert 0 <= x < right <= image.width and 0 <= y < bottom <= image.height, (path.name, box)
        image = image.crop(box)
    assert image.width > 0 and image.height > 0
    return image


def comparisons():
    assert len(PIECES) == 8
    rows = []
    for name, (reference, reference_box, built, built_box) in PIECES.items():
        original = DESIGN / f'ui-mockup-{reference}.png'
        for theme in ['dark', 'light']:
            screenshot = OUT / f'{built}-{theme}-1440.png'
            left = ImageOps.contain(crop(original, reference_box), (960, 640))
            right = ImageOps.contain(crop(screenshot, built_box), (960, 640))
            height = max(left.height, right.height, 140) + 90
            collage = Image.new('RGB', (1920, height), '#181c1b')
            collage.paste(left, ((960 - left.width) // 2, 60))
            collage.paste(right, (960 + (960 - right.width) // 2, 60))
            draw = ImageDraw.Draw(collage)
            draw.text((16, 10), f'{name}: generated reference crop (dark original)', fill='white')
            draw.text((976, 10), f'Built UI / {theme} / labelled fixture, not gameplay', fill='white')
            draw.text((16, height - 20), 'Aspect ratios preserved. Crops and source hashes are recorded in J-eight-pieces.json. Reviewer grades.', fill='white')
            output = OUT / f'J-piece-{name}-{theme}.png'
            qa.disk(); collage.save(output)
            rows.append({'piece': name, 'theme': theme, 'collage': output.relative_to(ROOT).as_posix(),
                         'reference': original.relative_to(ROOT).as_posix(), 'referenceSha256': sha(original), 'referenceCrop': reference_box,
                         'built': screenshot.relative_to(ROOT).as_posix(), 'builtSha256': sha(screenshot), 'builtCrop': built_box})
    write_json(OUT / 'J-eight-pieces.json', {'scope': 'Eight planned pieces, two themes; no builder-assigned grade', 'comparisons': rows})
    print('J EVIDENCE: 8 pieces x 2 themes = 16 aspect-preserving comparisons')


def catalog_draft():
    path = ROOT / 'games.json'
    before = sha(path)
    catalog = json.loads(path.read_text())
    draft = json.loads((DESIGN / 'catalog-241.draft.json').read_text())
    required = {'id', 'title', 'cat', 'icon', 'desc', 'url', 'featured'}
    assert set(draft) == required and draft['id'] == 241 and draft['title'] == 'CITISTEN'
    assert draft['cat'] in {game['cat'] for game in catalog}
    assert all(isinstance(draft[key], str) for key in ['title', 'cat', 'icon', 'desc', 'url'])
    assert isinstance(draft['featured'], bool)
    assert 241 not in {game['id'] for game in catalog}
    proposed = catalog + [draft]
    assert len({game['id'] for game in proposed}) == len(proposed)
    assert len(catalog) == 127 and len(proposed) == 128
    assert sha(path) == before, 'Runtime catalog was changed'
    write_json(OUT / 'K-catalog-draft-check.json', {
        'draft': 'docs/citisten-design/catalog-241.draft.json', 'draftSchemaValid': True,
        'runtimeCatalogSha256': before, 'runtimeCatalogUnchanged': True,
        'runtimeCount': len(catalog), 'registered241': False, 'proposedCountOnly': len(proposed),
        'plannedEntryExists': (ROOT / draft['url']).is_file(),
        'blocker': 'Draft only. Planned index.html is missing. Runtime catalog still has 127 entries; K is not established.'})
    print('K DRAFT: schema/ID/count checks OK; games.json unchanged, 127 registered, planned entry missing')


def preview_network():
    qa.browser_slot(); qa.disk()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(qa.QuietHandler, directory=str(ROOT)))
    worker = Thread(target=server.serve_forever, daemon=True); worker.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    traces, errors, failed, external, sockets = [], [], [], [], []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                        args=['--no-sandbox', '--disable-dev-shm-usage'])
            try:
                for theme in ['dark', 'light']:
                    qa.browser_slot()
                    context = browser.new_context(viewport={'width': 1440, 'height': 900}, service_workers='block')
                    attempts, responses = [], []

                    def request(req):
                        local = req.url.startswith(origin + '/')
                        value = urlsplit(req.url).path if local else req.url
                        attempts.append({'pathOrUrl': value, 'method': req.method, 'type': req.resource_type, 'local': local})
                        if not local: external.append(value)

                    def gate(route):
                        if route.request.url.startswith(origin + '/'):
                            route.continue_()
                        else:
                            route.abort('blockedbyclient')

                    context.on('request', request)
                    context.on('response', lambda res: responses.append({'path': urlsplit(res.url).path, 'status': res.status, 'fromServiceWorker': res.from_service_worker}))
                    context.on('requestfailed', lambda req: failed.append({'url': urlsplit(req.url).path, 'reason': req.failure}))
                    context.route('**/*', gate)
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                    page.on('websocket', lambda socket: sockets.append(socket.url))
                    cdp = context.new_cdp_session(page)
                    cdp.send('Network.enable'); cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
                    page.goto(origin + '/Games/Citisten3D/ui-preview.html', wait_until='networkidle')
                    page.wait_for_selector('.city-menu[open]')
                    page.evaluate('document.fonts.ready')
                    if theme == 'light': page.locator('dialog[open] [data-action="theme"]').click()
                    for mode in ['free', 'defense']:
                        page.locator(f'[data-mode="{mode}"]').click()
                        page.wait_for_function("document.querySelector('[data-value=budget]').textContent !== '$0'")
                        page.wait_for_timeout(600)
                        assert page.locator('.city-game').is_visible()
                        assert page.locator('[data-value="phase"]').inner_text().startswith('Day ')
                        qa.browser_slot(); qa.disk()
                        page.screenshot(path=str(OUT / f'L-ui-preview-{mode}-{theme}.png'))
                        page.locator('.city-top [data-action="menu"]').click()
                    context.close()
                    assert attempts and all(row['status'] == 200 and not row['fromServiceWorker'] for row in responses)
                    traces.append({'theme': theme, 'freshContext': True, 'httpCacheDisabled': True, 'serviceWorkersBlocked': True,
                                   'nonLoopbackRequestsDenied': True, 'attempts': attempts, 'responses': responses})
            finally:
                browser.close()
    finally:
        server.shutdown(); server.server_close(); worker.join(timeout=5)
    assert not external and not sockets and not failed and not errors, (external, sockets, failed, errors)
    assets = sorted({row['pathOrUrl'].lstrip('/') for trace in traces for row in trace['attempts'] if row['local']})
    result = {'scope': 'Actual live UI preview, both modes/themes; not an integrated game',
              'entry': 'Games/Citisten3D/ui-preview.html', 'entrySha256': sha(ROOT / 'Games/Citisten3D/ui-preview.html'),
              'integratedEntryPresent': (ROOT / 'Games/Citisten3D/index.html').exists(),
              'wholeGameProofAvailable': False, 'blocker': 'No integrated game index.html. Full-game L remains unestablished.',
              'externalAttempts': external, 'webSockets': sockets, 'failedRequests': failed, 'errors': errors,
              'browserProcessChecks': qa.PROCESS_CHECKS,
              'assetSha256': {asset: sha(ROOT / asset) for asset in assets}, 'traces': traces}
    write_json(OUT / 'L-preview-network-proof.json', result)
    qa.disk()
    (OUT / 'L-preview-fetch-proof.txt').write_text(
        f'Preview only: {len(traces)} fresh theme contexts, both free/defense modes.\n'
        f'External attempts: {len(external)}; sockets: {len(sockets)}; failed requests: {len(failed)}; errors: {len(errors)}.\n'
        'All non-loopback requests denied; HTTP cache disabled; service workers blocked.\n'
        'Every recorded response: 200, not from a service worker. Loaded asset hashes in JSON.\n'
        'Full-game L is NOT established: integrated Games/Citisten3D/index.html is missing.\n')
    print('L PREVIEW NETWORK: 0 external attempts/errors; cold local asset closure only, full-game entry missing')


if __name__ == '__main__':
    qa.disk(); OUT.mkdir(parents=True, exist_ok=True)
    if '--browser' in sys.argv:
        preview_network()
    else:
        comparisons(); catalog_draft()
