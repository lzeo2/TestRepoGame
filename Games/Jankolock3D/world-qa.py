"""Bounded native viewer QA. Read-only diagnostics, no state or clock setters."""
import argparse
import functools
import http.server
import io
import json
import mimetypes
from pathlib import Path
import subprocess
import threading
from urllib.parse import unquote, urlsplit
from PIL import Image, ImageDraw, ImageStat
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / 'docs/maintenance/audits/jankolock-3d-qa'
MOCK = ROOT / 'docs/jank3d-design/ui-mockup-world-normalized.png'
FLOOR = 2178940928


def guard():
    output = subprocess.check_output(['df', '-B1', '/'], text=True)
    available = int(output.splitlines()[-1].split()[3])
    if available < FLOOR:
        raise RuntimeError(f'Storage floor: {available} < {FLOOR}')
    return available


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        path = unquote(urlsplit(self.path).path).lstrip('/')
        if '..' in Path(path).parts:
            self.send_error(403)
            return
        # Read-only fallback for sparse-excluded reference files. Never checks out.
        if path.startswith('Games/Foldwild/') and not (ROOT / path).is_file():
            result = subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=ROOT, capture_output=True)
            if result.returncode:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(path)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(len(result.stdout)))
            self.end_headers()
            self.wfile.write(result.stdout)
            return
        super().do_GET()


def variance(path):
    image = Image.open(path).convert('RGB')
    value = sum(ImageStat.Stat(image).var) / 3
    assert value > 100, (path.name, value)
    return round(value, 2)


def comparison(report):
    if not MOCK.exists():
        report['mockupHold'] = 'Normalized AI design missing; run world-mockup.py first.'
        return
    guard()
    source = Image.open(MOCK).convert('RGBA')
    flat = Image.new('RGBA', source.size, '#b6c9d0')
    flat.alpha_composite(source)
    # Resizing/compositing is comparison-only; generated originals remain untouched.
    combined = Image.new('RGB', (2560, 752), '#25292b')
    combined.paste(flat.convert('RGB').resize((1280, 720)), (0, 32))
    combined.paste(Image.open(QA / 'world-implemented.png'), (1280, 32))
    draw = ImageDraw.Draw(combined)
    draw.text((16, 10), 'TRANSFORMED AI MOCKUP: fixed palette via world-mockup.py, resized', fill='#f1eee5')
    draw.text((1296, 10), 'RUNTIME: native 1280x720 screenshot', fill='#f1eee5')
    path = QA / 'world-ui-comparison.png'
    combined.save(path)
    report['screenshots'].append({'path': str(path.relative_to(ROOT)), 'variance': variance(path), 'kind': 'labeled comparison, not a runtime-only capture'})
    report['mockupTransform'] = 'Second of exactly two AI attempts; deterministic fixed-palette transform. Originals preserved. Layout comparison, not gameplay proof; reviewer approval separate.'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--native', action='store_true', help='Ride every lane end-to-end using native keyboard input')
    parser.add_argument('--port', type=int, default=8941)
    args = parser.parse_args()
    before = guard()
    if subprocess.run(['pgrep', '-f', '[c]hrome-linux/chrome|[c]hromium.*--remote-debugging-pipe'], capture_output=True).returncode == 0:
        raise RuntimeError('Sibling Chromium active; sequence browser gates')
    server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{args.port}'
    report = {'evidenceClass': 'native input, software WebGL; no hardware acceptance', 'runKind': 'native-traversal' if args.native else 'ui-only', 'storageBefore': before, 'screenshots': [], 'errors': [], 'requests': [], 'nativeZipEndpoints': []}
    try:
        with sync_playwright() as pw:
            guard()
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720}, color_scheme='dark', reduced_motion='reduce')
                context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(origin) or route.request.url.startswith('data:') else route.abort())
                page = context.new_page()
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                page.on('console', lambda msg: report['errors'].append(msg.text) if msg.type == 'error' else None)
                page.on('response', lambda response: report['requests'].append({'url': urlsplit(response.url).path, 'status': response.status}))
                page.on('requestfailed', lambda request: report['errors'].append(f'{urlsplit(request.url).path}: {request.failure}'))
                guard()
                QA.mkdir(parents=True, exist_ok=True)

                def state():
                    return page.evaluate('window.jank3dWorldSnapshot().traveler')

                def shot(name):
                    guard()
                    path = QA / f'world-{name}.png'
                    page.screenshot(path=str(path))
                    entry = {'path': str(path.relative_to(ROOT)), 'variance': variance(path), 'snapshot': page.evaluate('window.jank3dWorldSnapshot?.()')}
                    report['screenshots'].append(entry)
                    print(json.dumps({'capture': name, 'traveler': entry['snapshot']}), flush=True)

                def move(key, condition, timeout=90000):
                    page.keyboard.down(key)
                    try:
                        page.wait_for_function(condition, timeout=timeout, polling=100)
                    finally:
                        page.keyboard.up(key)

                response = page.goto(origin + '/Games/Foldwild/index.html', wait_until='networkidle')
                assert response.status == 200
                page.evaluate('document.fonts.ready')
                shot('foldwild-reference')
                response = page.goto(origin + '/Games/Jankolock3D/world.html', wait_until='networkidle')
                assert response.status == 200
                page.wait_for_function('window.jank3dWorldSnapshot?.().render.calls > 0')
                page.evaluate('document.fonts.ready')
                shot('implemented')
                comparison(report)
                if args.native:
                    page.locator('#world').focus()
                    move('s', 'window.jank3dWorldSnapshot().traveler.z < -383')
                    for index, lane in enumerate(['graft', 'midway', 'greenhedge']):
                        if index:
                            target = -10 if index == 1 else 230
                            move('a', f'window.jank3dWorldSnapshot().traveler.x >= {target - .3}')
                        page.keyboard.press('e')
                        page.wait_for_function('window.jank3dWorldSnapshot().traveler.mode === "zip"')
                        page.wait_for_function('window.jank3dWorldSnapshot().traveler.zipT > .12 && window.jank3dWorldSnapshot().traveler.zipT < .88', timeout=30000)
                        shot(lane + '-zip-ride')
                        page.wait_for_function('window.jank3dWorldSnapshot().traveler.mode === "free"', timeout=120000)
                        endpoint = state()
                        report['nativeZipEndpoints'].append({'lane': lane, 'state': endpoint})
                        shot(lane + '-arrival')
                        # Walk away from the station, then return. Heading remains pi.
                        delta = -4 if endpoint['z'] > 0 else 4
                        target_z = endpoint['z'] + delta
                        key = 's' if delta < 0 else 'w'
                        op = '<=' if delta < 0 else '>='
                        move(key, f'window.jank3dWorldSnapshot().traveler.z {op} {target_z}')
                        walked = state()
                        assert walked['walk'] and walked['grounded'] and abs(walked['z'] - endpoint['z']) >= 4
                        report.setdefault('nativeArrivalWalks', []).append({'lane': lane, 'state': walked})
                        reverse = 'w' if delta < 0 else 's'
                        op = '>=' if delta < 0 else '<='
                        move(reverse, f'window.jank3dWorldSnapshot().traveler.z {op} {endpoint["z"]}')
                        page.wait_for_timeout(900)
                page.locator('#fly').click()
                page.wait_for_timeout(1200)
                shot('aerial')
                page.locator('#fly').click()
                page.emulate_media(color_scheme='light')
                shot('light')
                page.set_viewport_size({'width': 390, 'height': 720})
                for scheme in ['dark', 'light']:
                    page.emulate_media(color_scheme=scheme)
                    page.wait_for_timeout(300)
                    guard()
                    raw = page.screenshot()
                    # Keep the genuine 390px capture at left of a standardized evidence canvas.
                    mobile = Image.new('RGB', (1280, 720), '#25292b')
                    mobile.paste(Image.open(io.BytesIO(raw)), (0, 0))
                    path = QA / f'world-mobile-{scheme}.png'
                    guard()
                    mobile.save(path)
                    report['screenshots'].append({'path': str(path.relative_to(ROOT)), 'variance': variance(path), 'kind': 'actual 390x720 viewport, padded to 1280x720'})
                report['mobile'] = page.evaluate('({overflow:document.documentElement.scrollWidth>innerWidth, buttons:[...document.querySelectorAll("button")].filter(b=>b.getBoundingClientRect().width).map(b=>({text:b.textContent,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height}))})')
                assert not report['mobile']['overflow']
                assert all(b['w'] >= 44 and b['h'] >= 44 for b in report['mobile']['buttons'])
                assert not report['errors'], report['errors']
                assert all(r['status'] == 200 for r in report['requests']), report['requests']
                report['completed'] = True
            finally:
                browser.close()
    except Exception as error:
        report['failure'] = f'{type(error).__name__}: {error}'
        raise
    finally:
        server.shutdown()
        server.server_close()
        report['storageAfter'] = guard()
        guard()
        payload = json.dumps(report, indent=2) + '\n'
        (QA / 'world-evidence.json').write_text(payload)
        (QA / ('world-native-evidence.json' if args.native else 'world-ui-evidence.json')).write_text(payload)
        print(json.dumps({'completed': report.get('completed', False), 'captures': len(report['screenshots']), 'endpoints': len(report['nativeZipEndpoints']), 'errors': report['errors'], 'failure': report.get('failure')}), flush=True)


if __name__ == '__main__':
    import signal

    def bounded_timeout(*_):
        raise TimeoutError('Bounded QA timeout')

    # A bounded timeout must still close the browser/server and save failures.
    signal.signal(signal.SIGTERM, bounded_timeout)
    main()
