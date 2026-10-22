"""Real devhero before/after captures: Git-pinned fallback vs current operator art."""
import functools
import hashlib
import http.server
import io
import json
import os
from pathlib import Path, PurePosixPath
import runpy
import subprocess
import threading
from urllib.parse import unquote, urlsplit
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / 'Games/Jankolock3D'
OUT = ROOT / 'docs/maintenance/audits/jankolock-3d-qa/external-models'
BEFORE = 'bf215f0'
helpers = runpy.run_path(str(GAME / 'letter-qa.py'))
guard, growth = helpers['guard'], helpers['visual_growth']


@functools.cache
def old_bytes(path):
    return subprocess.check_output(['git', 'show', f'{BEFORE}:{path}'], cwd=ROOT)


def current_hashes():
    paths = [p for p in GAME.rglob('*') if p.suffix in {'.mjs', '.js', '.html', '.css', '.json', '.glb', '.png'}]
    paths.append(ROOT / 'docs/jank3d-hero-kits.json')
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}


class Handler(helpers['Handler']):
    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path.startswith('/before/'):
            name = path[len('/before/'):]
            if '..' in PurePosixPath(name).parts or not name.startswith(('Games/Jankolock3D/', 'assets/fonts/', 'docs/jank3d-hero-kits.json', 'favicon.svg')):
                self.send_error(404); return
            try:
                data = old_bytes(name)
            except subprocess.CalledProcessError:
                self.send_error(404); return
            self.send_response(200); self.send_header('Content-Type', self.guess_type(name))
            self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)
        elif path.startswith('/after/'):
            self.path = path[len('/after'):]; super().do_GET()
        else:
            self.send_error(404)


def write(path, data):
    guard()
    assert growth() - (path.stat().st_size if path.exists() else 0) + len(data) <= 60000000, 'Whole visual pass60MB cap'
    path.write_bytes(data)


def image(path, picture):
    buffer = io.BytesIO(); picture.save(buffer, format='PNG'); write(path, buffer.getvalue())


def main():
    before = guard()
    processes = subprocess.check_output(['ps', '-eo', 'stat=,comm=,args='], text=True)
    assert not [r for line in processes.splitlines() if len(r := line.split(None, 2)) == 3 and r[1] in {'chrome', 'chromium'} and not r[0].startswith('Z') and '--type=' not in r[2]], 'Sibling browser active'
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'status': 'RUNNING', 'beforeRevision': BEFORE, 'runnerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'kind': 'Actual native devhero/integrated viewports; before served from Git, after from current files. No staged camera or gameplay grants.',
              'storageBefore': before, 'sourceHashes': current_hashes(), 'screenshots': [], 'cases': [], 'responses': [], 'errors': []}
    save = lambda: write(OUT / 'evidence.json', (json.dumps(report, indent=2) + '\n').encode())
    save()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8950'))), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    def capture(page, name):
        picture = Image.open(io.BytesIO(page.screenshot())).convert('RGB'); assert picture.size == (1280, 720)
        path = OUT / (name + '.png'); image(path, picture)
        report['screenshots'].append({'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'size': list(picture.size), 'kind': 'Unaltered native viewport'})
        save(); print('capture ' + name, flush=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                      args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                def new_page():
                    ctx = browser.new_context(viewport={'width': 1280, 'height': 720}, color_scheme='light', reduced_motion='reduce')
                    def route(r):
                        if urlsplit(r.request.url).netloc == urlsplit(origin).netloc: r.continue_()
                        else: report['errors'].append('Blocked external request'); r.abort()
                    ctx.route('**/*', route)
                    page = ctx.new_page(); page.set_default_timeout(45000)
                    page.on('pageerror', lambda e: report['errors'].append(str(e)))
                    page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                    page.on('requestfailed', lambda r: report['errors'].append(r.failure))
                    page.on('response', lambda r: report['responses'].append({'path': urlsplit(r.url).path, 'status': r.status}))
                    return ctx, page
                for index, hero in enumerate(['stampead', 'turretina', 'snipeoff', 'gooey'], 1):
                    case = {'hero': hero, 'views': {}}
                    for phase in ['before', 'after']:
                        ctx, page = new_page()
                        assert page.goto(f'{origin}/{phase}/Games/Jankolock3D/heroes/devhero-{index}.html', wait_until='networkidle').status == 200
                        page.wait_for_function('window.heroSnapshot?.().time > .25')
                        snap = page.evaluate('window.heroSnapshot()'); assert snap['hero'] == hero
                        assert page.locator('html').get_attribute('data-theme') == 'dark'
                        assert snap['position'] == [0, 0, 8] and abs(snap['yaw']) < 1e-6
                        if phase == 'after':
                            assert snap['model']['origin'] == 'operator-external' and snap['model']['unmatchedPaletteSlots'] == []
                        capture(page, hero + '-' + phase); case['views'][phase] = snap
                        if phase == 'after':
                            page.locator('#range').focus(); page.keyboard.down('KeyW')
                            page.wait_for_function('window.heroSnapshot().position[2] < 7.7'); page.keyboard.up('KeyW')
                            case['nativeWalk'] = page.evaluate('window.heroSnapshot()')
                            assert case['nativeWalk']['position'][2] < snap['position'][2] - .25
                            if hero == 'turretina':
                                page.keyboard.press('Digit1')
                                page.wait_for_function('window.heroSnapshot().lastAbility === "turret" && window.heroSnapshot().deployments === 1')
                                capture(page, 'deployed-stapler-after'); case['nativeTurret'] = page.evaluate('window.heroSnapshot()')
                        ctx.close()
                    pair = Image.new('RGB', (2560, 752), '#25292b')
                    pair.paste(Image.open(OUT / f'{hero}-before.png'), (0, 32)); pair.paste(Image.open(OUT / f'{hero}-after.png'), (1280, 32))
                    draw = ImageDraw.Draw(pair); draw.text((12, 10), f'BEFORE: committed procedural fallback {BEFORE}', fill='white'); draw.text((1292, 10), 'AFTER: operator dot rigid_v2, unchanged delivered GLB', fill='white')
                    image(OUT / f'{hero}-before-after.png', pair)
                    report['cases'].append(case); save()
                ctx, page = new_page()
                assert page.goto(origin + '/after/Games/Jankolock3D/index.html', wait_until='networkidle').status == 200
                page.wait_for_function('window.jank3dSnapshot?.().diagnostics.triangles > 0')
                snap = page.evaluate('window.jank3dSnapshot()')
                assert {m['id'] for m in snap['models']} == {'stampead','turretina','snipeoff','gooey','deployed_stapler','trooper'}
                assert page.locator('html').get_attribute('data-theme') == 'dark'
                capture(page, 'integrated-lobby-after')
                page.get_by_role('button', name='Start match', exact=True).click()
                page.wait_for_function('window.jank3dSnapshot().playing'); page.locator('[data-close]').click()
                assert len(page.evaluate('window.jank3dSnapshot().bots')) == 5
                capture(page, 'integrated-hud-after'); report['integrated'] = page.evaluate('window.jank3dSnapshot()')
                ctx.close()
                assert not report['errors'] and all(r['status'] == 200 for r in report['responses']), report['errors']
                report['status'] = 'COMPLETE-builder-checks-only'
            finally:
                browser.close()
    except Exception as error:
        report['status'] = 'FAILED'; report['failure'] = f'{type(error).__name__}: {error}'; raise
    finally:
        server.shutdown(); server.server_close()
        report['sourceHashesAfter'] = current_hashes(); report['sourcesUnchanged'] = report['sourceHashes'] == report['sourceHashesAfter']
        if not report['sourcesUnchanged']: report['status'] = 'FAILED'
        report['storageAfter'] = guard(); report['growthBytes'] = growth(); save()
    assert report['sourcesUnchanged']
    print(f'EXTERNAL MODELS: {len(report["cases"])} before/after pairs, {len(report["screenshots"])} native captures; {len(report["responses"])} HTTP200; zero errors; source stable')


if __name__ == '__main__':
    main()
