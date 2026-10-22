"""Bounded native-input checks of labeled systems fixtures, not integrated gameplay."""
import functools
import hashlib
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
MOCK = ROOT / 'docs/jank3d-design/ui-mockup-systems-normalized.png'


def guard():
    available = int(subprocess.check_output(['df', '-B1', '/', '--output=avail'], text=True).splitlines()[-1])
    assert available >= 2178940928, f'Storage floor: {available} bytes'
    return available


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        path = unquote(urlsplit(self.path).path).lstrip('/')
        if '..' in Path(path).parts:
            self.send_error(403)
            return
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


def main():
    before = guard()
    sibling = subprocess.run(['pgrep', '-f', '[c]hrome-linux/chrome|[c]hromium.*--remote-debugging-pipe'], capture_output=True)
    if sibling.returncode == 0:
        raise RuntimeError('Sibling Chromium active; sequence browser gates')
    guard(); QA.mkdir(parents=True, exist_ok=True)
    report = {'evidenceClass': 'Native input against explicit actor/shop fixtures; software WebGL; not integrated or hardware acceptance',
              'storageBefore': before, 'screenshots': [], 'errors': [], 'responses': [], 'observations': {},
              'sourceHashes': {name: hashlib.sha256((ROOT / 'Games/Jankolock3D' / name).read_bytes()).hexdigest()
                               for name in ['systems.mjs', 'systems-demo.mjs', 'systems-ui.mjs', 'systems-view.mjs', 'systems.css', 'systems.html']}}
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720}, color_scheme='light', reduced_motion='reduce')
                def local_only(route):
                    if urlsplit(route.request.url).netloc == urlsplit(origin).netloc:
                        route.continue_()
                    else:
                        report['errors'].append('Blocked external request'); route.abort()
                context.route('**/*', local_only)
                page = context.new_page(); page.set_default_timeout(20000)
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                page.on('console', lambda msg: report['errors'].append(msg.text) if msg.type == 'error' else None)
                page.on('requestfailed', lambda request: report['errors'].append(f'{urlsplit(request.url).path}: {request.failure}'))
                page.on('response', lambda response: report['responses'].append({'path': urlsplit(response.url).path, 'status': response.status}))
                state = lambda: page.evaluate('window.jank3dSystemsSnapshot()')
                def capture(name, mobile=False):
                    # Named historical theme comparisons, not a default-theme claim.
                    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme', 'dark' if 'dark' in name else 'light')
                    if not mobile:
                        page.evaluate('() => new Promise(resolve => { window.scrollTo(0, 0); requestAnimationFrame(() => requestAnimationFrame(resolve)); })')
                        page.wait_for_function('window.scrollY === 0')
                        if page.locator('.sys-page-header').count():
                            assert page.locator('.sys-page-header').bounding_box()['y'] == 0
                    guard()
                    image = Image.open(io.BytesIO(page.screenshot())).convert('RGB')
                    if mobile:
                        frame = Image.new('RGB', (1280, 720), '#25292b'); frame.paste(image, (0, 0)); image = frame
                    assert image.size == (1280, 720), image.size
                    variance = sum(ImageStat.Stat(image).var) / 3
                    assert variance > 100, (name, variance)
                    path = QA / f'systems-{name}.png'; image.save(path)
                    report['screenshots'].append({'path': str(path.relative_to(ROOT)), 'variance': round(variance, 2),
                        'kind': '390x720 native viewport padded to1280x720' if mobile else 'native1280x720'})
                    print(f'capture: {path.name}', flush=True)
                def load(query=''):
                    response = page.goto(origin + '/Games/Jankolock3D/systems.html' + query, wait_until='networkidle')
                    assert response.status == 200
                    page.wait_for_function('window.jank3dSystemsSnapshot?.().calls > 0')
                    page.evaluate('document.fonts.ready')
                def aim_orb():
                    s = state(); orb = next(o for o in s['orbs'] if o['type'] == 'floating')
                    projected = next(p for p in s['projections'] if p['id'] == orb['id'])
                    bounds = page.locator('canvas').bounding_box()
                    assert -1 < projected['x'] < 1 and -1 < projected['y'] < 1, projected
                    page.mouse.click(bounds['x'] + (projected['x'] + 1) / 2 * bounds['width'],
                                     bounds['y'] + (1 - projected['y']) / 2 * bounds['height'])
                response = page.goto(origin + '/Games/Foldwild/index.html', wait_until='networkidle')
                assert response.status == 200
                page.evaluate('document.fonts.ready'); capture('foldwild-reference')
                load(); capture('shop-implemented')
                assert page.locator('.sys-flex').bounding_box()['y'] + page.locator('.sys-flex').bounding_box()['height'] <= 720
                initial = state(); assert initial['hero']['souls'] == 4800 and initial['hero']['level'] == 13
                page.get_by_role('button', name='Buy Lifesteal', exact=True).click()
                page.get_by_role('button', name='Buy Slow rounds', exact=True).click()
                page.get_by_role('button', name='Buy Dash charge', exact=True).click()
                bought = state(); assert bought['hero']['souls'] == 0 and bought['hero']['level'] == 13
                assert bought['stats']['lifesteal'] == 0.2 and bought['stats']['projectileSlow'] == 0.3
                assert bought['stats']['maxDashCharges'] == 2
                start = bought['hero']['position']
                page.locator('[data-active="dash-charge"]').click()
                after = state()['hero']['position']; assert round(after['z'] - start['z'], 3) == 10
                report['observations']['purchasesAndDash'] = {'before': initial['hero'], 'after': bought['hero'], 'dashDistance': after['z'] - start['z']}
                capture('shop-purchased')
                page.keyboard.press('b'); assert page.locator('.sys-shop').is_hidden()
                page.keyboard.press('b'); assert page.locator('.sys-shop').is_visible()
                page.keyboard.press('Escape'); assert page.locator('.sys-shop').is_hidden()
                page.keyboard.press('b')
                page.get_by_role('radio', name='Tier 4 / 6,400').check()
                assert page.get_by_role('button', name='Buy Armor pierce').is_disabled()
                capture('shop-tier4')
                page.emulate_media(color_scheme='dark'); load(); capture('shop-dark')
                page.emulate_media(color_scheme='light'); load('?fixture=waves')
                wave = state(); assert len(wave['troopers']) == 24
                report['observations']['wave'] = {'count': len(wave['troopers']), 'time': wave['time'], 'phase': wave['phase']}
                capture('wave')
                load('?fixture=orbs'); capture('orbs')
                before_orb = state()['hero']['souls']; aim_orb()
                page.wait_for_function('window.jank3dSystemsSnapshot().hero.souls > 4800')
                report['observations']['secure'] = {'before': before_orb, 'after': state()['hero']['souls']}
                # Hold native movement into the 5m magnet radius; no state assignment.
                page.keyboard.down('a')
                try:
                    page.wait_for_function('window.jank3dSystemsSnapshot().hero.souls >= 4880', timeout=5000)
                finally:
                    page.keyboard.up('a')
                report['observations']['groundPickup'] = state()['hero']; capture('orbs-claimed')
                for _ in range(3):
                    current = state()
                    target = next(t for t in current['troopers'] if t['team'] == 'ivory' and t['lane'] == 'midway' and t['hp'] > 0)
                    projected = next(p for p in current['projections'] if p['id'] == target['id'])
                    bounds = page.locator('canvas').bounding_box()
                    page.mouse.click(bounds['x'] + (projected['x'] + 1) / 2 * bounds['width'], bounds['y'] + (1 - projected['y']) / 2 * bounds['height'])
                    page.wait_for_timeout(350)
                damaged = next(t for t in state()['troopers'] if t['id'] == target['id'])
                assert 0 < damaged['candleScale'] < 1, damaged
                report['observations']['candleBurn'] = damaged; capture('trooper-burn')
                load('?fixture=deny'); aim_orb()
                page.wait_for_function('window.jank3dSystemsSnapshot().hero.souls > 4800')
                report['observations']['deny'] = state()['hero']; capture('orb-denied')
                load('?fixture=respawn')
                assert not state()['hero']['alive'] and page.locator('.sys-shop').is_visible()
                page.get_by_role('radio', name='Tier 1 / 800').check()
                page.get_by_role('button', name='Buy Health', exact=True).click()
                assert state()['hero']['hp'] == 0
                capture('respawn-shop')
                page.wait_for_function('window.jank3dSystemsSnapshot().hero.alive', timeout=10000)
                respawn = state()['hero']; assert respawn['position']['z'] == -430 and respawn['hp'] == 1120
                report['observations']['respawn'] = respawn
                page.keyboard.down('x')
                try:
                    page.wait_for_function('document.querySelector(".sys-notice").textContent === "Returned to base."', timeout=6000)
                finally:
                    page.keyboard.up('x')
                report['observations']['recallAtBaseRing'] = state()['hero']['position']
                page.set_viewport_size({'width': 390, 'height': 720}); page.emulate_media(color_scheme='dark'); load()
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                page.locator('.sys-shop').scroll_into_view_if_needed(); capture('mobile-dark', mobile=True)
                for button in page.locator('button:visible').all():
                    r = button.bounding_box(); assert r['width'] >= 44 and r['height'] >= 44, r
                page.emulate_media(color_scheme='light'); capture('mobile-light', mobile=True)
                page.set_viewport_size({'width': 1280, 'height': 720})
                context.close()
            finally:
                browser.close()
        guard()
        comparison = Image.new('RGB', (2560, 752), '#eee9d8')
        comparison.paste(Image.open(MOCK).convert('RGB'), (0, 32))
        comparison.paste(Image.open(QA / 'systems-shop-implemented.png'), (1280, 32))
        draw = ImageDraw.Draw(comparison)
        draw.text((12, 10), 'CODEX-IMAGEN MOCKUP: fixed 8-color transform; original preserved', fill='#242820')
        draw.text((1292, 10), 'IMPLEMENTED: native 1280x720 capture, isolated shop fixture', fill='#242820')
        comparison.save(QA / 'systems-ui-comparison.png')
        report['comparison'] = 'docs/maintenance/audits/jankolock-3d-qa/systems-ui-comparison.png'
        assert not report['errors'], report['errors']
        assert all(r['status'] == 200 for r in report['responses']), report['responses']
    except Exception as error:
        report['failure'] = str(error)
        raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=3)
        report['storageAfter'] = guard()
        guard(); (QA / 'systems-browser-evidence.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({k: v for k, v in report.items() if k not in ('screenshots', 'responses')}, indent=2), flush=True)
    print(f"Browser checks completed: {len(report['screenshots'])} captures, {len(report['errors'])} recorded errors; reviewer decides acceptance.")


if __name__ == '__main__':
    main()
