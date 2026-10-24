"""Builder evidence only. Run: TMPDIR=/dev/shm python3 -B Games/Jankolock3D/portrait-qa.py
One browser attempt; no fixture query, state grants, DOM hiding or camera changes.
"""
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import subprocess
import threading
from datetime import datetime, timezone
from urllib.parse import urlsplit

os.environ['TMPDIR'] = '/dev/shm'
from PIL import Image, ImageStat
from PIL.PngImagePlugin import PngInfo
from playwright.sync_api import sync_playwright

GAME = Path(__file__).resolve().parent
ROOT = GAME.parents[1]
OUT = ROOT / 'docs/maintenance/audits/jankolock-3d-qa/portrait-resume'
FLOOR = 2178940928


def guard():
    output = subprocess.check_output(['df', '-B1', '/'], text=True)
    available = int(output.splitlines()[-1].split()[3])
    if available < FLOOR:
        raise RuntimeError(f'Storage floor: {available} < {FLOOR}; stop growth')
    return available


def hashes():
    # Includes active integration, scene, loader, configuration and model bytes.
    paths = [p for p in GAME.rglob('*') if p.is_file() and
             (p.suffix in {'.js', '.mjs', '.css', '.html', '.glb'} or
              p.name in {'portrait-config.json', 'portrait-receipt.json'})]
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(paths)}


def active_browser_processes(output):
    rows = [line.split(None, 3) for line in output.splitlines()]
    return [row for row in rows if len(row) == 4 and not row[1].startswith('Z') and
            (row[2] in {'chrome', 'chromium'} or
             (row[2] == 'node' and row[3].endswith(' run-driver')))]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    guard()
    OUT.mkdir(parents=True, exist_ok=False)  # Archive an earlier attempt before rerunning.
    report = {'kind': 'portrait lobby builder checks, not H acceptance or full-game QA',
              'utc': datetime.now(timezone.utc).isoformat(), 'status': 'FAIL',
              'qa_directory_approval': 'operator-approved maintenance audit directory',
              'browser_attempts': 0, 'errors': [], 'requests': [], 'screenshots': [],
              'checks': {}, 'source_before': hashes(), 'storage_before': guard()}
    server = thread = None
    try:
        processes = subprocess.check_output(['ps', '-eo', 'pid=,stat=,comm=,args='], text=True)
        busy = active_browser_processes(processes)
        if busy:
            report['status'] = 'SKIP'
            # No process command lines in committed evidence: they may contain host paths.
            raise RuntimeError(f'Browser/Playwright process match ({len(busy)} live processes); no browser attempt')
        guard()
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
                  functools.partial(Handler, directory=str(ROOT)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f'http://127.0.0.1:{server.server_port}'
        with sync_playwright() as pw:
            guard()
            report['browser_attempts'] = 1
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                       args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720},
                           device_scale_factor=1, color_scheme='light', reduced_motion='reduce')

                def route_request(route):
                    url = route.request.url
                    if url.startswith(origin + '/') or url.startswith(('data:', 'blob:')):
                        route.continue_()
                    else:
                        report['errors'].append('Blocked nonlocal request: ' + urlsplit(url).netloc)
                        route.abort()

                context.route('**/*', route_request)
                page = context.new_page()
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                page.on('console', lambda msg: report['errors'].append(msg.text) if msg.type == 'error' else None)
                page.on('response', lambda response: report['requests'].append(
                    {'path': urlsplit(response.url).path, 'status': response.status}))
                page.on('requestfailed', lambda request: report['errors'].append(
                    f'{urlsplit(request.url).path}: {request.failure}'))
                response = page.goto(origin + '/Games/Jankolock3D/index.html', wait_until='networkidle', timeout=45000)
                assert response.status == 200, f'Index HTTP {response.status}'
                page.wait_for_function('typeof window.jank3dSnapshot === "function"', timeout=20000)
                page.wait_for_function('window.jank3dSnapshot().diagnostics.triangles > 0', timeout=10000)
                for theme in ['dark', 'light']:
                    if page.locator('html').get_attribute('data-theme') != theme:
                        page.locator('#theme').click()
                    assert page.locator('html').get_attribute('data-theme') == theme
                    page.wait_for_timeout(500)
                    snapshot = page.evaluate('window.jank3dSnapshot()')
                    assert snapshot['playing'] is False and snapshot['fixture'] is None
                    assert snapshot['portrait'] == {
                        'bytes': 3228372,
                        'sha256': '8463eee8276187cacaba912d9540279ad1bb338aa382e9448632aa9a33892514',
                        'vertices': 61893, 'triangles': 124512, 'units': 'm',
                        'source': 'in-house supplied photo-derived relief, not a scan'}
                    assert snapshot['diagnostics']['triangles'] >= 124512
                    path = OUT / f'portrait-lobby-{theme}.png'
                    guard()
                    page.screenshot(path=str(path), full_page=False)
                    with Image.open(path) as image:
                        assert image.size == (1280, 720), image.size
                        variance = sum(ImageStat.Stat(image.convert('RGB')).var) / 3
                        # Left scene area excludes the hero-selection panel.
                        scene_variance = sum(ImageStat.Stat(image.convert('RGB').crop((0, 90, 780, 620))).var) / 3
                        assert variance > 100 and scene_variance > 100, 'Blank screenshot/scene'
                    report['screenshots'].append({'path': path.relative_to(ROOT).as_posix(),
                        'kind': 'unaltered native viewport', 'theme': theme,
                        'variance': variance, 'scene_variance': scene_variance,
                        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'snapshot': snapshot})
                with Image.open(OUT / 'portrait-lobby-light.png') as image:
                    box = (430, 130, 720, 570)
                    crop = image.crop(box)
                    info = PngInfo()
                    info.add_text('Description', 'CROP of portrait-lobby-light.png at (430,130,720,570), original pixels; not a separate view')
                    guard()
                    crop.save(OUT / 'portrait-detail.png', pnginfo=info)
                    report['screenshots'].append({'path': (OUT / 'portrait-detail.png').relative_to(ROOT).as_posix(),
                        'kind': 'crop, not a separate view; no resizing',
                        'source': (OUT / 'portrait-lobby-light.png').relative_to(ROOT).as_posix(), 'box': box})
                config = json.loads((GAME / 'portrait-config.json').read_text())
                receipt = json.loads((GAME / 'portrait-receipt.json').read_text())
                asset = (GAME / config['url']).read_bytes()
                assert len(asset) == config['bytes'] == receipt['derived']['bytes']
                assert hashlib.sha256(asset).hexdigest() == config['sha256'] == receipt['derived']['sha256']
                required = {'/Games/Jankolock3D/index.html', '/Games/Jankolock3D/game.mjs',
                            '/Games/Jankolock3D/portrait.js', '/Games/Jankolock3D/portrait-config.json',
                            '/Games/Jankolock3D/models/portrait_relief.glb'}
                seen = {r['path'] for r in report['requests'] if r['status'] == 200}
                assert required <= seen, f'Missing local loads: {sorted(required - seen)}'
                assert all(r['status'] == 200 for r in report['requests']), 'Non-200 response'
                assert not report['errors'], 'Browser errors recorded'
                report['checks'] = {'native_dimensions_and_pixel_variance': True,
                    'observed_lobby_playing_false_no_fixture': True, 'portrait_metadata_and_pins': True,
                    'observed_local_http_closure': True, 'browser_errors_zero': True}
                report['status'] = 'PASS'
            finally:
                browser.close()
    except Exception as error:
        report['errors'].append(str(error).replace(str(ROOT), '<repo>'))
    finally:
        if server:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)
        report['server_shutdown'] = server is None or not thread.is_alive()
        report['source_after'] = hashes()
        report['concurrent_source_changes'] = sorted(p for p in
            report['source_before'].keys() | report['source_after'].keys()
            if report['source_before'].get(p) != report['source_after'].get(p))
        report['source_concurrency_limit'] = 'Before/after hashes cannot exclude edit-and-revert or changes between resource reads.'
        report['storage_after'] = guard()
        guard()
        (OUT / 'portrait-qa.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({k: report[k] for k in ['status', 'browser_attempts', 'checks', 'errors',
              'concurrent_source_changes', 'server_shutdown', 'storage_before', 'storage_after']}), flush=True)
    return 0 if report['status'] == 'PASS' else 1


if __name__ == '__main__':
    raise SystemExit(main())
