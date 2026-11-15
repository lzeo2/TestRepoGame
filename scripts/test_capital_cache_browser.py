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
import tempfile
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
            self.wfile.write(b'<!doctype html><title>Cache test observer</title><link rel="icon" href="data:,">')
        else:
            super().do_GET()


def skip_guided_tutorial(page):
    tutorial = page.locator('#guided-tutorial')
    if tutorial.count():
        tutorial.uncheck()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--scenario', choices=['native', 'fallback', 'fixture', 'restart-fixture', 'heroes', 'all'], default='native')
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
    map_requests = []
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
        page.on('request',lambda request:map_requests.append(request.url) if unquote(urlsplit(request.url).path).startswith(GAME_PATH+'data/') and request.url.endswith('.json') else None)
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
        skip_guided_tutorial(page)
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
            chromium_args = ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
            browser = None
            if args.scenario != 'restart-fixture':
                browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=chromium_args)
                stack.callback(browser.close)

            if args.scenario == 'restart-fixture':
                profile = stack.enter_context(tempfile.TemporaryDirectory(prefix='capital-cache-profile-'))
                first = playwright.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True, args=chromium_args)
                stack.callback(first.close)
                page = new_page(first)
                fixture_url = base + FIXTURE_PATH + 'index.html'
                page.goto(fixture_url)
                page.evaluate('''async()=>{await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;}''')
                page.reload()
                page.wait_for_function('!!navigator.serviceWorker.controller')
                check(page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v1', 'Persistent profile installs the actual tiny worker fixture')
                first.close()
                server.fixture_version = 2
                second = playwright.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True, args=chromium_args)
                stack.callback(second.close)
                second.set_offline(True)
                page = new_page(second)
                mark = len(server.events)
                page.goto(fixture_url, wait_until='load', timeout=20000)
                page.wait_for_function('!!navigator.serviceWorker.controller')
                check(page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v1', 'Whole-browser restart with the same profile restores cached fixture bytes offline')
                check(not server.bodies(mark), 'Offline restarted fixture navigation and asset fetch require zero origin bodies')
                second.close()

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
                    'canberra', 'addresses', 'road-profiles', 'canberra-north', 'north-terrain', 'traffic-signals', 'airport')}
                check(manifest_paths <= urls and runtime_maps <= maps and bool(modules),
                      'Saved cache contains the complete manifest, shared modules and all seven runtime JSON data files')
                start_and_drive(page)
                check(snapshot(page)['career']['cash'] == 1000, 'Ordinary driving grants no career cash')
                page.goto(base + '/__capital_cache_blank', wait_until='load')
                saved = page.evaluate('(k)=>localStorage.getItem(k)', CAREER_KEY)
                check(saved is not None and json.loads(saved)['cash'] == 1000, 'Normal pagehide creates the real career save through the native writer')
                mark = len(server.events)
                request_mark=len(map_requests)
                ready(page)
                check(not map_requests[request_mark:],'Warm startup reads cached map responses directly without page fetch requests')
                check(page.evaluate('!!navigator.serviceWorker.controller'), 'New game page is controlled by its installed game worker')
                warm_counts = server.bodies(mark)
                observations.append({'label': 'warm origin body counts', 'counts': dict(warm_counts)})
                check(not (set(warm_counts) & essential), 'Warm full-game boot reuses all modules and seven JSON files with zero origin bodies')
                context.set_offline(True)
                mark = len(server.events)
                ready(page, reload=True)
                restored = observe(page, 'offline actual ready')
                check(page.evaluate('(k)=>localStorage.getItem(k)', CAREER_KEY) == saved,
                      'Offline reload preserves the actual career save bytes')
                career = {key: value for key, value in json.loads(saved).items() if key not in ('campaign', 'protagonists')}
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

            if args.scenario in ('heroes', 'all'):
                context = browser.new_context(viewport={'width': 1100, 'height': 720})
                stack.callback(context.close)
                page = new_page(context)
                ready(page)

                def campaign_open():
                    page.locator('#world canvas').focus()
                    page.keyboard.press('j')
                    page.locator('#campaign-dialog').wait_for(state='visible')

                def campaign_close():
                    page.locator('#campaign-resume').click()
                    page.locator('#campaign-dialog').wait_for(state='hidden')
                    page.locator('#world canvas').focus()

                def choose(hero):
                    page.locator(f'#campaign-characters [data-character="{hero}"]').click()
                    page.wait_for_function('(hero)=>capitalDriveSnapshot().campaign.character===hero', arg=hero)
                    state = observe(page, 'normal UI selected ' + hero)
                    check(state['campaign']['active'] is None and state['gameplay']['mode'] == ('vehicle' if hero == 'basement' else 'foot'),
                          f'{hero} switches through the normal briefing without starting a mission')
                    check(state['career']['cash'] == 1000 and not any(state['campaign']['intros'].values()) and not state['campaign']['completed'],
                          f'{hero} switch preserves starter cash and unearned campaign progress')
                    return state

                def same_pose(state, checkpoint, label):
                    actor = checkpoint['vehicle'] if checkpoint['mode']=='vehicle' else checkpoint['actor']
                    # The live restore owner may clear a new obstruction within 6 m.
                    check(math.hypot(state['focus']['x']-actor['x'], state['focus']['z']-actor['z']) <= 6.000001 and
                          abs(state['focus']['yaw']-actor['yaw']) < .000001 and
                          state['gameplay']['health'] == checkpoint['health'] and state['gameplay']['weapon'] == checkpoint['weapon'], label)

                page.locator('[data-game-mode="campaign"]').click()
                page.locator('#intro-characters [data-character="student"]').click()
                skip_guided_tutorial(page)
                page.locator('#start-button').click()
                page.wait_for_function('capitalDriveSnapshot().started && capitalDriveSnapshot().gameMode === "campaign"')
                page.locator('#campaign-dialog').wait_for(state='visible')
                initial = observe(page, 'fresh Kit campaign')
                check(initial['campaign']['character'] == 'student' and initial['campaign']['active'] is None and initial['career']['cash'] == 1000,
                      'Fresh Kit starts Campaign with the normal wallet and no active mission')
                campaign_close()
                origin = snapshot(page)['focus']
                page.keyboard.down('w')
                try:
                    page.wait_for_function('(p)=>Math.hypot(capitalDriveSnapshot().focus.x-p.x,capitalDriveSnapshot().focus.z-p.z)>1', arg=origin, timeout=15000)
                finally:
                    page.keyboard.up('w')
                page.locator('#pause-button').click()
                page.locator('#pause-dialog').wait_for(state='visible')
                check(snapshot(page)['paused'], 'Normal Kit walking and Pause use the live game input path')
                page.locator('#resume-button').click()
                page.locator('#pause-dialog').wait_for(state='hidden')
                campaign_open()
                kit = snapshot(page)
                milo = choose('basement')
                kit_checkpoint = milo['protagonists']['student']
                same_pose(kit, kit_checkpoint, 'Switching away captures Kit at his actually walked location')
                home = milo['storyHomes']['basement']
                home_approach = home.get('approach', home)
                check(math.hypot(milo['focus']['x']-home_approach['x'], milo['focus']['z']-home_approach['z']) < 50 and
                      math.hypot(milo['focus']['x']-kit['focus']['x'], milo['focus']['z']-kit['focus']['z']) > 50,
                      'First Milo selection starts at his own mapped home approach')
                rowan = choose('corporate')
                milo_checkpoint = rowan['protagonists']['basement']
                office = next(entry for entry in rowan['interiors']['publicEntries'] if entry['id'] == 'interior-canberra-centre')
                check(math.hypot(rowan['focus']['x']-office['x'], rowan['focus']['z']-office['z']) < 50,
                      'First Rowan selection starts at his own Civic office approach')
                kit_again = choose('student')
                same_pose(kit_again, kit_checkpoint, 'Switching back restores Kit own pose, health and weapon')
                milo_again = choose('basement')
                same_pose(milo_again, milo_checkpoint, 'Switching back restores Milo own pose, health and weapon')
                before_reload = observe(page, 'Milo selected before native save/reload')
                saved = page.evaluate('(key)=>localStorage.getItem(key)', CAREER_KEY)
                save = json.loads(saved)
                check(save['campaign']['character'] == 'basement' and save['cash'] == 1000 and save['protagonists'] == before_reload['protagonists'],
                      'Normal character selection saves Milo and each actual protagonist checkpoint')
                ready(page, reload=True)
                check(page.evaluate('(key)=>localStorage.getItem(key)', CAREER_KEY) == saved,
                      'Reload leaves the native career save bytes intact')
                page.locator('[data-game-mode="campaign"]').click()
                check(page.locator('#intro-characters [data-character="basement"]').get_attribute('aria-pressed') == 'true',
                      'Reload selects the saved Milo in the real Campaign UI')
                skip_guided_tutorial(page)
                page.locator('#start-button').click()
                page.locator('#campaign-dialog').wait_for(state='visible')
                restored = observe(page, 'Milo restored by normal Start after reload')
                same_pose(restored, save['protagonists']['basement'], 'Normal Start restores selected Milo own saved pose, health and weapon')
                check(restored['campaign']['character'] == 'basement' and restored['career'] == before_reload['career'] and
                      all(restored['protagonists'][hero] == save['protagonists'][hero] for hero in ('student', 'corporate')),
                      'Reload preserves the selected hero, inactive hero checkpoints, starter cash and career progress')
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
                    'The restart fixture proves persistent-profile browser restart for the tiny actual worker fixture, not full-game career play after restart.',
                    'Heroes uses real normal UI and starter health; pure authority tests cover injured health and ammunition isolation.',
                    'Hero location checks allow the existing restore owner to clear a new nearby obstruction within six metres.',
                    'Career proof uses normal starter state and native pagehide saving; no synthetic save or state grants.',
                    'Expected offline worker update-check failures are recorded separately from uncaught game errors.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({'status': report['status'], 'checks': len(checks), 'elapsedSeconds': report['elapsedSeconds']}), flush=True)
    return 1 if failure else 0


if __name__ == '__main__':
    sys.exit(main())
