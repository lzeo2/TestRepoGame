#!/usr/bin/env python3
"""Bounded real-game cold/warm/offline cache proof; no save or mission grants.

Run with an outer watchdog, for example: timeout 300s python3 -B
scripts/test_capital_cache_browser.py --output <fresh-external-directory>.
The fallback and lightweight worker-update fixtures can run separately.
"""
import argparse
from collections import Counter
from contextlib import ExitStack
import functools
import hashlib
import http.server
import json
import math
from pathlib import Path
import signal
import sys
import threading
import time
from urllib.parse import unquote, urljoin, urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Capital Drive'
GAME_PATH = '/Games/Capital Drive/'
FIXTURE_PATH = '/__capital_cache_fixture/game/'
CAREER_KEY = 'capital-drive-career-v1'


class CountedServer(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self):
        super().__init__(('127.0.0.1', 0), functools.partial(CountedHandler, directory=str(ROOT)))
        self.events, self.fixture_version = [], 1
        self.lock = threading.Lock()

    def record(self, path, size, status=200):
        with self.lock:
            self.events.append({'path': path, 'bytes': size, 'status': status})

    def bodies(self, since=0):
        with self.lock:
            return Counter(event['path'] for event in self.events[since:] if event['bytes'] > 0)


class CountedHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        # Origin body counts must never be hidden by the browser HTTP cache.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def copyfile(self, source, target):
        size = 0
        try:
            while data := source.read(128 * 1024):
                target.write(data)
                size += len(data)
        finally:
            self.server.record(unquote(urlsplit(self.path).path), size)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path.startswith('/__capital_cache_fixture/'):
            version = self.server.fixture_version
            document = b'<!doctype html><title>Cache worker fixture</title><link rel="icon" href="data:,"><p>Worker fixture only</p>'
            asset = f'fixture-v{version}'.encode()
            manifest = {'version': hashlib.sha256(f'fixture-v{version}'.encode()).hexdigest(), 'files': [
                {'url': name, 'sha256': hashlib.sha256(body).hexdigest(), 'bytes': len(body)}
                for name, body in [('index.html', document), ('asset.js', asset)]]}
            files = {'index.html': ('text/html', document), 'asset.js': ('text/javascript', asset),
                     'cache-manifest.js': ('text/javascript', ('self.CAPITAL_CACHE_MANIFEST = ' + json.dumps(manifest) + ';').encode()),
                     'service-worker.js': ('text/javascript', (GAME / 'service-worker.js').read_bytes())}
            name = path.removeprefix(FIXTURE_PATH)
            if path == '/__capital_cache_fixture/sibling.txt':
                kind, body = 'text/plain', f'sibling-v{version}'.encode()
            elif name in files:
                kind, body = files[name]
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            self.server.record(path, len(body))
        elif path == '/__capital_cache_blank':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(b'<!doctype html><title>Cache test observer</title>')
        else:
            super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--scenario', choices=['native', 'fallback', 'fixture', 'all'], default='native')
    parser.add_argument('--budget', type=int, default=240, choices=range(30, 601), metavar='30..600')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, page_errors, console_errors, failed_requests, external, observations = [], [], [], [], [], []
    failure = None
    server = CountedServer()
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    game_url = base + '/Games/Capital%20Drive/'

    def expired(signum, frame):
        raise TimeoutError(f'Cache browser run exceeded {args.budget} seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(args.budget)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snapshot(page):
        return page.evaluate('capitalDriveSnapshot()')

    def observe(page, label):
        state = snapshot(page)
        observations.append({'label': label, 'elapsedSeconds': round(time.monotonic() - started, 2), 'state': state})
        return state

    def new_page(context):
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: page_errors.append(str(error)))
        page.on('console', lambda message: console_errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: failed_requests.append({'url': request.url, 'failure': request.failure}))
        page.on('request', lambda request: external.append(request.url)
                if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        session = context.new_cdp_session(page)
        session.send('Network.enable')
        session.send('Network.setCacheDisabled', {'cacheDisabled': True})
        return page

    def ready(page, reload=False):
        if reload:
            page.reload(wait_until='load', timeout=60000)
        else:
            page.goto(game_url, wait_until='load', timeout=60000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
        check(not snapshot(page)['rendering']['compatibility'], 'Actual full game boots with software WebGL')

    def start_and_drive(page):
        page.locator('[data-game-mode="street"]').click()
        page.locator('#start-button').click()
        page.wait_for_function('capitalDriveSnapshot().started && capitalDriveSnapshot().gameMode === "street"')
        before = snapshot(page)['player']
        page.locator('#world canvas').focus()
        page.keyboard.down('w')
        try:
            page.wait_for_function('(p)=>capitalDriveSnapshot().player.odometer > p.odometer+2', arg=before, timeout=20000)
            page.keyboard.down('d')
            try:
                page.wait_for_function('(p)=>Math.abs(capitalDriveSnapshot().player.yaw-p.yaw) > .04', arg=before, timeout=20000)
            finally:
                page.keyboard.up('d')
        finally:
            page.keyboard.up('w')
        after = snapshot(page)['player']
        check(after['odometer'] > before['odometer'] + 2 and math.hypot(after['x']-before['x'], after['z']-before['z']) > 1,
              'Actual Start and held W/D accelerate, steer and move the native car')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)

            if args.scenario in ('native', 'all'):
                context = browser.new_context(viewport={'width': 1100, 'height': 720})
                stack.callback(context.close)
                context.add_init_script("""window.__cacheRegistrationTrace=[];
                    const register=navigator.serviceWorker.register.bind(navigator.serviceWorker);
                    navigator.serviceWorker.register=(...args)=>{window.__cacheRegistrationTrace.push({ready:!!window.capitalDriveSnapshot?.().ready,time:performance.now()});return register(...args)};
                    window.__cacheStatusTrace=[];new MutationObserver(()=>{const e=document.querySelector('#cache-status');if(e&&!window.__cacheStatusTrace.includes(e.textContent))window.__cacheStatusTrace.push(e.textContent)}).observe(document,{subtree:true,childList:true,characterData:true});""")
                page = new_page(context)
                ready(page)
                cold = observe(page, 'cold actual ready')
                check(cold['career']['cash'] == 1000 and page.evaluate('(k)=>localStorage.getItem(k)', CAREER_KEY) is None,
                      'Fresh native career has its normal $1000 wallet and no synthetic save')
                page.wait_for_function('document.querySelector("#cache-status")?.textContent.includes("Saved for faster starts")', timeout=60000)
                trace = page.evaluate('({registration:__cacheRegistrationTrace,status:__cacheStatusTrace})')
                observations.append({'label': 'cold cache traces', **trace})
                check(trace['registration'] and all(item['ready'] for item in trace['registration']), 'Cache registration begins after real boot readiness')
                check(any('Saving' in status for status in trace['status']), 'Cache UI reports population before saved status')
                inventory = page.evaluate('''async()=>{const rows=[];for(const name of await caches.keys()){const cache=await caches.open(name);const urls=(await cache.keys()).map(r=>new URL(r.url).pathname);if(urls.some(u=>decodeURIComponent(u).startsWith('/Games/Capital Drive/')))rows.push({name,urls});}return rows;}''')
                observations.append({'label': 'cold cache inventory', 'caches': inventory})
                urls = {unquote(url) for item in inventory for url in item['urls']}
                manifest_source = (GAME / 'cache-manifest.js').read_text()
                manifest = json.loads(manifest_source[manifest_source.index('{'):].rstrip().removesuffix(';'))
                manifest_paths = {unquote(urlsplit(urljoin(game_url, file['url'])).path) for file in manifest['files']}
                modules = {path for path in manifest_paths if path.endswith('.js')}
                maps = {path for path in manifest_paths if path.endswith('.json')}
                essential = modules | maps
                runtime_maps = {GAME_PATH + 'data/' + name + '.json' for name in (
                    'canberra', 'addresses', 'road-profiles', 'canberra-north', 'north-terrain', 'traffic-signals')}
                check(manifest_paths <= urls and runtime_maps <= maps and len(modules) >= 73,
                      'Saved cache contains the complete manifest, shared modules and all six runtime JSON data files')
                start_and_drive(page)
                check(snapshot(page)['career']['cash'] == 1000, 'Ordinary driving grants no career cash')
                page.goto(base + '/__capital_cache_blank', wait_until='load')
                saved = page.evaluate('(k)=>localStorage.getItem(k)', CAREER_KEY)
                check(saved is not None and json.loads(saved)['cash'] == 1000, 'Normal pagehide creates the real career save through the native writer')
                mark = len(server.events)
                ready(page)
                check(page.evaluate('!!navigator.serviceWorker.controller'), 'New game page is controlled by its installed game worker')
                warm_counts = server.bodies(mark)
                observations.append({'label': 'warm origin body counts', 'counts': dict(warm_counts)})
                check(not (set(warm_counts) & essential), 'Warm full-game boot reuses all modules and six JSON files with zero origin bodies')
                context.set_offline(True)
                mark = len(server.events)
                ready(page, reload=True)
                restored = observe(page, 'offline actual ready')
                check(page.evaluate('(k)=>localStorage.getItem(k)', CAREER_KEY) == saved,
                      'Offline reload preserves the actual career save bytes')
                career = {key: value for key, value in json.loads(saved).items() if key != 'campaign'}
                check(restored['career'] == career, 'Offline full-game boot restores the native wallet, garage and completed-job state')
                start_and_drive(page)
                check(not (set(server.bodies(mark)) & essential), 'Offline actual driving requires no origin module or map bodies')
                context.set_offline(False)
                page.close()
                context.close()

            if args.scenario in ('fallback', 'all'):
                context = browser.new_context(viewport={'width': 1100, 'height': 720})
                stack.callback(context.close)
                context.add_init_script("""navigator.serviceWorker.register=()=>Promise.reject(new DOMException('Cache test registration denied','SecurityError'));
                    for(const name of ['open','keys','match'])Object.defineProperty(CacheStorage.prototype,name,{value:()=>Promise.reject(new DOMException('Cache test storage denied','SecurityError'))});""")
                page = new_page(context)
                ready(page)
                page.wait_for_function('document.querySelector("#cache-status")?.textContent.includes("could not be saved")')
                check(snapshot(page)['career']['cash'] == 1000, 'Denied cache registration/storage preserves the normal native career')
                start_and_drive(page)
                check(not page.evaluate('!!navigator.serviceWorker.controller'), 'Denied optional cache still permits normal full-game boot and play')
                context.close()

            if args.scenario in ('fixture', 'all'):
                context = browser.new_context()
                stack.callback(context.close)
                page = new_page(context)
                fixture_url = base + FIXTURE_PATH + 'index.html'
                page.goto(fixture_url)
                page.evaluate('''async()=>{await caches.open('unrelated-sibling-cache');await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;}''')
                page.reload()
                page.wait_for_function('!!navigator.serviceWorker.controller')
                check(page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v1', 'Isolated worker fixture serves installed v1 bytes')
                server.fixture_version = 2
                page.evaluate('navigator.serviceWorker.getRegistration().then(r=>r.update())')
                page.wait_for_function('navigator.serviceWorker.getRegistration().then(r=>!!r.waiting)', timeout=30000)
                check(page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v1', 'Waiting v2 does not replace a running v1 game client')
                fixture_prefix = 'capital-drive-files-v1-' + FIXTURE_PATH.replace('/', '%2F') + '-'
                check(page.evaluate('(prefix)=>caches.keys().then(names=>names.filter(name=>name.startsWith(prefix)).length)', fixture_prefix) == 2,
                      'Waiting update retains both complete fixture revisions')
                check(page.evaluate('fetch("../sibling.txt").then(r=>r.text())') == 'sibling-v2', 'Sibling request outside the worker scope reaches current origin bytes')
                check(page.evaluate('caches.has("unrelated-sibling-cache")'), 'Update installation preserves unrelated sibling caches')
                page.close()
                page = new_page(context)
                page.goto(base + '/__capital_cache_blank')
                page.wait_for_function('(scope)=>navigator.serviceWorker.getRegistration(scope).then(r=>!!r?.active&&!r.waiting)', arg=base + FIXTURE_PATH, timeout=30000)
                page.goto(fixture_url)
                page.wait_for_function('!!navigator.serviceWorker.controller')
                check(page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v2', 'Closing all old clients permits v2 activation on reopen')
                check(page.evaluate('(prefix)=>caches.keys().then(names=>names.filter(name=>name.startsWith(prefix)).length)', fixture_prefix) == 1,
                      'Activation removes only the obsolete cache in its own fixture scope')
                check(page.evaluate('caches.has("unrelated-sibling-cache")'), 'Activation cleanup preserves unrelated origin cache')
                context.close()

            check(not page_errors, 'No uncaught browser errors')
            check(not external, 'No external runtime requests')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
        print('FAIL', failure, flush=True)
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, prior)
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        report = {'status': 'FAIL' if failure else 'PASS', 'scenario': args.scenario, 'failure': failure,
                  'checks': checks, 'pageErrors': page_errors, 'consoleErrors': console_errors,
                  'failedRequests': failed_requests, 'external': external, 'observations': observations,
                  'originResponses': server.events, 'elapsedSeconds': round(time.monotonic()-started, 2),
                  'budgetSeconds': args.budget, 'limitations': ['Software WebGL only; no hardware FPS claim.',
                    'The optional worker fixture proves update lifecycle and scope, not native career earnings.',
                    'Career proof uses normal starter state and native pagehide saving; no synthetic save or state grants.',
                    'Expected offline worker update-check failures are recorded separately from uncaught game errors.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({'status': report['status'], 'checks': len(checks), 'elapsedSeconds': report['elapsedSeconds']}), flush=True)
    return 1 if failure else 0


if __name__ == '__main__':
    sys.exit(main())
