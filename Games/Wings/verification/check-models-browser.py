"""Bounded isolated render check using existing Playwright, Chromium and Three.
Not Wings renderer/flight acceptance. Starts and terminates its own local server.
Run: python3 -B Games/Wings/verification/check-models-browser.py --out /tmp/trg-fleet/lane1
Pass --three-root PATH if Three is not already present in the Bun cache.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import threading
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--three-root', type=Path)
args = parser.parse_args()
if args.three_root is None:
    found = list((Path.home() / '.bun/install/cache').glob('three@0.186.0*/build/three.module.js'))
    if not found:
        parser.error('Existing Three 0.186.0 not found; supply --three-root. Do not install.')
    args.three_root = found[0].parents[1]
three_root = args.three_root.resolve()
assert (three_root / 'build/three.module.js').is_file()
repo = Path(__file__).resolve().parents[3]
args.out.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        route = unquote(urlsplit(path).path)
        if route.startswith('/__three__/'):
            target = (three_root / route.removeprefix('/__three__/')).resolve()
            if not target.is_relative_to(three_root):
                return str(three_root / '__not_found__')
            return str(target)
        return super().translate_path(path)

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(repo)))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f'http://127.0.0.1:{server.server_port}'
results = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
            args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        try:
            for theme, width, height, rear in [('light',1100,720,False),('dark',1100,720,True),
                                              ('light',390,920,False),('dark',390,920,True)]:
                context = browser.new_context(viewport={'width':width,'height':height},color_scheme=theme)
                page = context.new_page()
                errors, warnings, external = [], [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: errors.append(m.text) if m.type=='error' else warnings.append(m.text) if m.type=='warning' else None)
                page.on('request', lambda r: external.append(r.url) if not r.url.startswith(origin+'/') else None)
                page.goto(origin+'/Games/Wings/verification/model-preview.html'+('?rear' if rear else ''),timeout=20000)
                page.wait_for_function("document.title.startsWith('PASS:') || document.title.startsWith('FAIL:')",timeout=20000)
                models = page.evaluate('window.modelResults')
                assert page.title().startswith('PASS:'), page.locator('#status').inner_text()
                assert len(models)==2 and all(m['calls']>0 and m['triangles']>0 for m in models)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                shot = f'{theme}-{width}.png'
                page.screenshot(path=str(args.out/shot),full_page=True,timeout=10000)
                results.append({'theme':theme,'width':width,'rear':rear,'models':models,
                                'errors':errors,'warnings':warnings,'external':external,'screenshot':shot})
                assert not errors and not external, results[-1]
                context.close()
        finally:
            browser.close()
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
    (args.out/'browser.json').write_text(json.dumps(results,indent=2))
print('PASS: 4 isolated model renders (desktop/mobile, light/dark); zero console/page errors or external loads. Not Wings renderer acceptance.')
print(json.dumps(results[0]['models']))
