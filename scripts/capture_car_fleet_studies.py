#!/usr/bin/env python3
"""Frozen-source VISUAL ONLY capture. Does not replace the unchanged 20s QA gate.

Run only after Main freezes the builder, profiles and studio. Outputs external
JPEGs and JSON; no images, browser profile or server are left in the repository.
"""
import functools
import hashlib
import io
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import signal
import tempfile
import threading
from urllib.parse import unquote, urlsplit

from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
IDS = 'pip brindle bricklet finch lantern comet orchard horizon morrow relay tempest sunray parcel pebble dockside gravel atlas kestrel vesper'.split()
LIMIT = 10_000_000


def source_hashes():
    files = list((ROOT / 'assets/car-arcade/showcase').glob('*.js'))
    files += list((ROOT / 'assets/car-arcade/showcase').glob('*.html'))
    files += list((ROOT / 'assets/car-arcade/vendor').glob('*.js'))
    files += list((ROOT / 'assets/fonts').rglob('*.woff2'))
    files += [ROOT / 'assets/car-arcade/style.css', Path(__file__).resolve()]
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}


def main():
    free_before = shutil.disk_usage(ROOT).free
    assert free_before >= 2_000_000_000, 'Stop: less than 2GB free'
    chromium = shutil.which('chromium') or shutil.which('chromium-browser')
    assert chromium, 'Installed Chromium required; no download fallback'
    hashes = source_hashes()
    for name in ['detailed.js', 'detail-profiles.js']:
        assert 'assets/car-arcade/showcase/' + name in hashes, 'Freeze sibling sources first'
    output = Path(tempfile.mkdtemp(prefix='car-fleet-visual-'))
    errors, snapshots, images = [], [], []
    result = {'visual_only': True, 'acceptance': False, 'exit': 1, 'sources': hashes,
              'errors': errors, 'snapshots': snapshots, 'images': images, 'free_before': free_before}
    print('VISUAL_ONLY_OUTPUT=' + str(output), flush=True)

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    image_bytes = 0

    def disk_guard():
        assert min(shutil.disk_usage(ROOT).free, shutil.disk_usage(output).free) >= 2_000_000_000, 'Stop: free space below 2GB'

    def frozen():
        assert source_hashes() == hashes, 'Sources changed during visual capture'

    def deadline(*_):
        raise TimeoutError('Bounded 20-minute visual batch expired; not QA success')

    old_alarm = signal.signal(signal.SIGALRM, deadline)
    signal.alarm(1200)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=chromium, headless=True, timeout=20000,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 960}, has_touch=True, service_workers='block')
                page = context.new_page()
                page.set_default_timeout(20000)
                page.set_default_navigation_timeout(20000)
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                page.on('requestfailed', lambda r: errors.append(r.url + ':' + str(r.failure)))
                page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
                page.on('websocket', lambda socket: errors.append('Unexpected socket ' + socket.url))

                def route(r):
                    url = urlsplit(r.request.url)
                    path = unquote(url.path).lstrip('/')
                    if path.endswith('/'):
                        path += 'index.html'
                    if url.scheme == 'http' and url.netloc == urlsplit(origin).netloc and path in hashes:
                        r.continue_()
                    else:
                        errors.append('Non-frozen/local request ' + r.request.url)
                        r.abort()
                context.route('**/*', route)

                def wait_frame(before, mode, car):
                    # A changed mode/selector is not proof a new image was drawn.
                    page.wait_for_function('a => {const s=window.carStudioSnapshot; return s && (s.error || (s.frames>a.frames && s.id===a.id && s.view===a.view));}',
                        arg={'frames': before, 'id': car, 'view': mode}, timeout=60000)
                    s = page.evaluate('carStudioSnapshot')
                    assert not s['error'] and not errors, (s, errors)
                    assert s['refractingMaterials'] == 0 and s['singlePassGlass']
                    assert 0 < s['modelTriangles'] <= 30000 and 0 < s['modelMeshes'] <= 75
                    assert 4 < s['textureCount'] <= 24, 'Live texture lifetime budget'
                    assert page.evaluate('Object.isFrozen(carStudioSnapshot) && Object.isFrozen(carStudioSnapshot.expectedEye)')
                    if mode == 'exterior':
                        assert s['framed'], s
                    else:
                        assert len(s['cameraLocal']) == len(s['expectedEye']) == 3
                        assert all(abs(a - b) < .000001 for a, b in zip(s['cameraLocal'], s['expectedEye'])), s
                    return s

                def action(callback, mode, car):
                    before = page.evaluate('carStudioSnapshot.frames')
                    callback()
                    return wait_frame(before, mode, car)

                def capture(name, snapshot, whole_page=False):
                    nonlocal image_bytes
                    disk_guard(); frozen()
                    data = (page if whole_page else page.locator('#studio')).screenshot(type='jpeg', quality=88, timeout=60000)
                    with Image.open(io.BytesIO(data)) as image:
                        stats = ImageStat.Stat(image.convert('L'))
                        assert stats.mean[0] > 8 and stats.stddev[0] > 3, 'Blank/black render: ' + name
                    assert image_bytes + len(data) <= LIMIT - 250000, 'Capture output budget'
                    disk_guard()
                    (output / name).write_bytes(data)
                    image_bytes += len(data)
                    images.append({'file': name, 'bytes': len(data), 'mean': stats.mean[0], 'stddev': stats.stddev[0]})
                    snapshots.append({'file': name, **snapshot})

                page.goto(origin + '/assets/car-arcade/showcase/', timeout=20000)
                wait_frame(0, 'exterior', 'pip')
                assert page.locator('#car option').evaluate_all('(options)=>options.map(o=>o.value)') == IDS
                for car in IDS:
                    disk_guard(); frozen()
                    exterior = action(lambda: page.locator('#car').select_option(car), 'exterior', car)
                    capture(car + '-exterior.jpg', exterior)
                    cockpit = action(lambda: page.locator('#cockpit').click(), 'cockpit', car)
                    assert page.locator('#cockpit').get_attribute('aria-pressed') == 'true'
                    capture(car + '-cockpit.jpg', cockpit)
                    action(lambda: page.locator('#cockpit').click(), 'exterior', car)
                    print('CAPTURED ' + car + ' exterior/cockpit', flush=True)

                # Real keyboard and touch at 390px, not synthetic state/pose grants.
                car = 'vesper'
                action(lambda: page.set_viewport_size({'width': 390, 'height': 844}), 'exterior', car)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                page.locator('#studio').focus()
                old = page.evaluate('carStudioSnapshot.angle')
                s = action(lambda: page.keyboard.press('ArrowLeft'), 'exterior', car)
                assert s['angle'] < old
                s = action(lambda: page.locator('#reset').tap(), 'exterior', car)
                assert abs(s['angle']) < .000001
                capture('390-exterior.jpg', s)
                capture('390-exterior-ui.jpg', s, True)
                page.locator('#studio').focus()
                s = action(lambda: page.keyboard.press('c'), 'cockpit', car)
                angle, look = s['angle'], s['look']
                s = action(lambda: page.locator('#right').tap(), 'cockpit', car)
                assert s['look'] < look and s['angle'] == angle
                s = action(lambda: page.locator('#reset').tap(), 'cockpit', car)
                assert abs(s['look']) < .000001
                for selector in ['#car', '#cockpit', '#left', '#right', '#reset']:
                    box = page.locator(selector).bounding_box()
                    assert box['width'] >= 44 and box['height'] >= 44
                capture('390-cockpit.jpg', s)
                capture('390-cockpit-ui.jpg', s, True)
                # Selection must retain cockpit mode and use the new physical eye.
                action(lambda: page.locator('#car').select_option('pip'), 'cockpit', 'pip')
                page.locator('#studio').focus()
                action(lambda: page.keyboard.press('Escape'), 'exterior', 'pip')
                assert page.locator('#cockpit').get_attribute('aria-pressed') == 'false'
                context.close()
            finally:
                browser.close()
        frozen(); disk_guard()
        assert not errors, errors
        assert len(images) == 42
        result['exit'] = 0
        print('VISUAL ONLY: 19 exterior/cockpit pairs and 390px keyboard/touch; no QA, performance, photographic or legal certification.', flush=True)
    except BaseException as error:
        result['failure'] = str(error)
        raise
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_alarm)
        server.shutdown(); server.server_close(); thread.join(timeout=3)
        result['free_after'] = shutil.disk_usage(ROOT).free
        result['image_bytes'] = image_bytes
        result['sources_stable'] = source_hashes() == hashes
        # Preserve bounded evidence, not browser profile/cache or a running server.
        data = (json.dumps(result, indent=2) + '\n').encode()
        if result['free_after'] >= 2_000_000_000 and image_bytes + len(data) <= LIMIT:
            (output / 'capture.json').write_bytes(data)
        else:
            print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
