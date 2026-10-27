"""Cache-cold dark-default UI check. One system Chromium, no gameplay fixtures."""
import functools
import hashlib
import http.server
import io
import json
import os
from qa_roster import HERO_IDS
from pathlib import Path
import runpy
import subprocess
import threading
from urllib.parse import urlsplit

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / 'Games/Jankolock3D'
OUT = ROOT / 'docs/maintenance/audits/jankolock-3d-qa/dark-default'
helpers = runpy.run_path(str(GAME / 'letter-qa.py'))
guard, growth = helpers['guard'], helpers['visual_growth']


def hashes():
    files = [p for p in GAME.rglob('*') if p.suffix in {'.mjs', '.js', '.html', '.css', '.glb', '.json', '.png'}]
    files.append(ROOT / 'docs/jank3d-hero-kits.json')
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(files)}


def write(path, data):
    guard()
    assert growth() - (path.stat().st_size if path.exists() else 0) + len(data) <= 60000000, 'Whole visual-pass60MB cap'
    path.write_bytes(data)


def main():
    before = guard()
    processes = subprocess.check_output(['ps', '-eo', 'stat=,comm=,args='], text=True)
    assert not [r for line in processes.splitlines() if len(r := line.split(None, 2)) == 3
                and r[1] in {'chrome', 'chromium'} and not r[0].startswith('Z') and '--type=' not in r[2]], 'Sibling browser active'
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'status': 'RUNNING', 'runnerSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'kind': 'Native theme UI only; normal pages, no qa query or gameplay grants',
              'storageBefore': before, 'sourceHashes': hashes(), 'firstPaint': [], 'screenshots': [], 'responses': [], 'errors': []}
    save = lambda: write(OUT / 'evidence.json', (json.dumps(report, indent=2) + '\n').encode())
    save()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8949'))),
               functools.partial(helpers['Handler'], directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{server.server_port}'
    style = """() => {const r=document.documentElement,s=getComputedStyle(r);return {
      theme:r.dataset.theme,scheme:s.colorScheme,background:s.backgroundColor,paper:s.getPropertyValue('--paper').trim(),
      text:s.getPropertyValue('--text').trim()||s.getPropertyValue('--ink').trim(),
      overflow:document.documentElement.scrollWidth>innerWidth};}"""
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                      args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                def context(mobile=False, scripts=True):
                    ctx = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 720},
                          is_mobile=mobile, has_touch=mobile, java_script_enabled=scripts,
                          color_scheme='light', reduced_motion='reduce')
                    def route(r):
                        if urlsplit(r.request.url).netloc == urlsplit(origin).netloc:
                            r.continue_()
                        else:
                            report['errors'].append('Blocked nonlocal request: ' + r.request.url); r.abort()
                    ctx.route('**/*', route)  # Routing also disables the HTTP cache.
                    ctx.on('page', lambda page: (
                        page.on('pageerror', lambda e: report['errors'].append(str(e))),
                        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None),
                        page.on('requestfailed', lambda r: report['errors'].append(r.failure)),
                        page.on('response', lambda r: report['responses'].append({'path': urlsplit(r.url).path, 'status': r.status}))))
                    return ctx

                # CSS/HTML alone must be dark, before async modules/models can initialize.
                cold = context(scripts=False)
                for entry in ['index.html', 'systems.html', 'world.html', *[f'heroes/devhero-{i}.html' for i in range(1, 5)]]:
                    page = cold.new_page()
                    assert page.goto(origin + '/Games/Jankolock3D/' + entry, wait_until='networkidle').status == 200
                    initial = page.evaluate(style)
                    assert initial['theme'] == 'dark' and initial['scheme'] == 'dark', (entry, initial)
                    assert initial['background'] in {'rgb(37, 41, 43)', 'rgb(32, 35, 33)'}, (entry, initial)
                    report['firstPaint'].append({'entry': entry, 'javascriptDisabled': True, 'osPreference': 'light', **initial})
                    page.close()
                cold.close(); save()

                def capture(page, name, expected, mobile=False):
                    colors = page.evaluate(style)
                    assert colors['theme'] == expected and colors['scheme'] == expected and not colors['overflow'], colors
                    assert page.get_by_role('button', name='Light theme' if expected == 'dark' else 'Dark theme', exact=True).get_attribute('aria-pressed') == str(expected == 'dark').lower()
                    image = Image.open(io.BytesIO(page.screenshot(full_page=mobile))).convert('RGB')
                    buffer = io.BytesIO(); image.save(buffer, format='PNG'); data = buffer.getvalue()
                    file = name + '.png'; write(OUT / file, data)
                    report['screenshots'].append({'file': file, 'sha256': hashlib.sha256(data).hexdigest(),
                              'size': list(image.size), 'colors': colors, 'kind': 'Unaltered native viewport' if not mobile else 'Unaltered native full-page'})
                    save(); print('capture ' + name, flush=True)

                for mobile in [False, True]:
                    prefix = 'mobile-' if mobile else ''
                    for lobby in [True, False]:
                        ctx = context(mobile)
                        # Stop sampling before the deliberate light toggle, not before first paint.
                        ctx.add_init_script("""window.themePaints=[];window.themeSampling=true;
                          function sample(){if(!window.themeSampling)return;const r=document.documentElement;
                            if(r){const s=getComputedStyle(r);if(s.getPropertyValue('--paper'))window.themePaints.push({theme:r.dataset.theme,scheme:s.colorScheme});}
                            requestAnimationFrame(sample);}requestAnimationFrame(sample);""")
                        page = ctx.new_page(); page.set_default_timeout(30000)
                        cdp = ctx.new_cdp_session(page); cdp.send('Network.enable'); cdp.send('Network.clearBrowserCache'); cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
                        assert page.goto(origin + '/Games/Jankolock3D/index.html', wait_until='networkidle').status == 200
                        page.wait_for_function('window.jank3dSnapshot?.().diagnostics.triangles > 0')
                        paints = page.evaluate('window.themeSampling=false;window.themePaints')
                        assert paints and all(s['theme'] == 'dark' and s['scheme'] == 'dark' for s in paints), paints
                        report['firstPaint'].append({'entry': 'index.html', 'cacheDisabled': True, 'osPreference': 'light', 'mobile': mobile, 'samples': paints})
                        if lobby:
                            assert set(page.locator('[data-hero]').evaluate_all('(cards)=>cards.map(card=>card.dataset.hero)')) == set(HERO_IDS)
                            capture(page, prefix + 'hero-select-default-dark', 'dark', mobile)
                            page.get_by_role('button', name='Light theme', exact=True).click()
                            capture(page, prefix + 'hero-select-light', 'light', mobile)
                        else:
                            page.get_by_role('button', name='Start match', exact=True).click()
                            page.wait_for_function('window.jank3dSnapshot().playing')
                            assert page.locator('.sys-shop').is_visible()
                            capture(page, prefix + 'shop-default-dark', 'dark', mobile)
                            page.locator('[data-close]').click()
                            assert page.locator('#minimap').is_visible()
                            # Canvas minimap must use the same dark panel token, not its former light fill.
                            pixel = page.locator('#minimap').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(2,2,1,1).data)')
                            assert pixel[:3] == [48, 54, 56], pixel
                            capture(page, prefix + 'hud-minimap-default-dark', 'dark', mobile)
                            page.get_by_role('button', name='Light theme', exact=True).click()
                            light_pixel = page.locator('#minimap').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(2,2,1,1).data)')
                            assert light_pixel[:3] == [247, 243, 232], light_pixel
                            capture(page, prefix + 'hud-minimap-light', 'light', mobile)
                            page.get_by_role('button', name='Shop (B)', exact=True).click()
                            capture(page, prefix + 'shop-light', 'light', mobile)
                        ctx.close()
                report['status'] = 'COMPLETE-builder-checks-only'
            finally:
                browser.close()
    except Exception as error:
        report['status'] = 'FAILED'; report['failure'] = f'{type(error).__name__}: {error}'; raise
    finally:
        server.shutdown(); server.server_close()
        report['sourceHashesAfter'] = hashes(); report['sourcesUnchanged'] = report['sourceHashes'] == report['sourceHashesAfter']
        if not report['sourcesUnchanged'] or report['errors'] or any(r['status'] != 200 for r in report['responses']):
            report['status'] = 'FAILED'
        report['storageAfter'] = guard(); report['growthBytes'] = growth(); save()
    assert report['sourcesUnchanged'] and not report['errors'] and all(r['status'] == 200 for r in report['responses']), report['errors']
    print(f'DARK DEFAULT: {len(report["screenshots"])} captures, {len(report["responses"])} HTTP200, zero errors; CSS-first dark on all7 entries; sources stable')


if __name__ == '__main__':
    main()
