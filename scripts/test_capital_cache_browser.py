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
import re
import subprocess
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
        self.legacy_worker = None
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
            build = hashlib.sha256(f'fixture-v{version}'.encode()).hexdigest()[:12]
            document = (f'<!doctype html><title>Cache worker fixture</title><link rel="icon" href="data:,">'
                        f'<section id="start-panel"><p>Worker fixture only</p><p id="cache-status"></p></section>'
                        f'<code id="build-version">{build}</code><button id="cache-update" type="button" hidden>Load update</button>'
                        f'<script src="code.js"></script>').encode()
            client = (GAME / 'cache-client.js').read_bytes()
            launcher = (GAME / 'cache-launcher.js').read_bytes()
            worker = self.server.legacy_worker if version == 1 and self.server.legacy_worker else (GAME / 'service-worker.js').read_bytes()
            worker = re.sub(rb"const buildId = '[0-9a-f]{12}';", f"const buildId = '{build}';".encode(), worker)
            asset = f'fixture-v{version}'.encode()
            code = f'window.fixtureCode = "fixture-v{version}";'.encode()
            manifest = {'build': build, 'version': hashlib.sha256(f'fixture-v{version}'.encode()).hexdigest(), 'files': [
                {'url': name, 'sha256': hashlib.sha256(body).hexdigest(), 'bytes': len(body)}
                for name, body in [('index.html', document), ('asset.js', asset), ('cache-client.js', client), ('cache-launcher.js', launcher), ('code.js', code)]]}
            files = {'index.html': ('text/html', document), 'asset.js': ('text/javascript', asset),
                     'cache-manifest.js': ('text/javascript', ('self.CAPITAL_CACHE_MANIFEST = ' + json.dumps(manifest) + ';').encode()),
                     'service-worker.js': ('text/javascript', worker), 'cache-client.js': ('text/javascript', client), 'cache-launcher.js': ('text/javascript', launcher), 'code.js': ('text/javascript', code)}
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
    parser.add_argument('--scenario', choices=['native', 'fallback', 'fixture', 'restart-fixture', 'heroes', 'build', 'all'], default='native')
    parser.add_argument('--budget', type=int, default=240, choices=range(30, 601), metavar='30..600')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    source_paths = ['index.html','style.css','script.js','cache-client.js','cache-launcher.js','service-worker.js','cache-manifest.js']
    source_paths = sorted(set(source_paths + [str(path.relative_to(GAME)) for path in GAME.rglob('*') if path.is_file() and path.suffix in ('.js','.json','.html','.css')]))
    def source_hashes():
        return {name:hashlib.sha256((GAME/name).read_bytes()).hexdigest() for name in source_paths}
    source_before = source_hashes()
    harness_sha256 = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
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

    def wait_async(page, predicate, arg=None, timeout=30000):
        end = time.monotonic() + timeout / 1000
        while time.monotonic() < end:
            if page.evaluate(predicate, arg):
                return
            page.wait_for_timeout(100)
        raise AssertionError('Asynchronous worker/cache lifecycle observation timed out')

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
        # The controller installs the snapshot function at the end of boot. Poll
        # its presence without serializing the entire world on every frame.
        page.wait_for_function('''() => typeof window.capitalDriveSnapshot === 'function'
            || document.querySelector('#loading[role=alert]')''', polling=250, timeout=180000)
        error = page.locator('#loading[role=alert]')
        if error.count():
            raise AssertionError(error.text_content())
        observations.append({'label':'ready after navigation', 'elapsedSeconds':round(time.monotonic() - started, 2)})
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
                    'canberra', 'addresses', 'road-profiles', 'canberra-north', 'north-terrain', 'traffic-signals', 'airport', 'airport-terrain')}
                check(manifest_paths <= urls and runtime_maps <= maps and bool(modules),
                      'Saved cache contains the complete manifest, shared modules and all eight runtime JSON data files')
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
                check(not (set(warm_counts) & essential), 'Warm full-game boot reuses all modules and eight JSON files with zero origin bodies')
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

            if args.scenario == 'build':
                context = browser.new_context(viewport={'width':1280,'height':800})
                stack.callback(context.close)
                context.add_init_script('localStorage.setItem("capital-drive-rendering-v1","performance")')
                page = new_page(context)
                ready(page)
                manifest_source = (GAME/'cache-manifest.js').read_text()
                manifest = json.loads(manifest_source[manifest_source.index('{'):].rstrip().removesuffix(';'))
                expected = manifest['build']
                check(page.locator('#build-version').text_content() == expected, 'Actual full-game corner badge matches generated manifest build')
                page.wait_for_function('() => document.querySelector("#cache-status").textContent.includes("Saved for faster starts")', timeout=60000)
                observations.append({'label':'actual build menu','build':expected,'state':snapshot(page),
                    'sourceSHA256':{name:hashlib.sha256((GAME/name).read_bytes()).hexdigest() for name in ['index.html','style.css','script.js','cache-client.js','cache-launcher.js','service-worker.js','cache-manifest.js']}})
                page.screenshot(path=str(output/'build-menu-desktop.png'))
                page.set_viewport_size({'width':390,'height':844})
                page.wait_for_timeout(250)
                bounds = page.locator('#build-version').evaluate('(e)=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight}}')
                check(bounds['left'] >= 0 and bounds['right'] <= bounds['width'] and bounds['top'] >= 0 and bounds['bottom'] <= bounds['height'], 'Build badge remains visible within 390px mobile viewport')
                observations.append({'label':'mobile build badge bounds',**bounds})
                page.screenshot(path=str(output/'build-menu-mobile.png'))
                page.set_viewport_size({'width':1280,'height':800})
                page.locator('[data-game-mode=free]').click()
                skip_guided_tutorial(page)
                page.locator('#start-button').click()
                page.wait_for_function('capitalDriveSnapshot().started && !capitalDriveSnapshot().paused')
                state = observe(page,'actual current build Telopea Free roam')
                check(state['gameMode'] == 'free' and not state['rendering']['compatibility'] and state['rendering']['quality'] == 'performance' and page.locator('#build-version').text_content() == expected, 'Current full-game build starts actual WebGL Free roam with visible badge')
                page.screenshot(path=str(output/'build-telopea-performance.png'))
                page.locator('#map-button').click()
                page.locator('#map-search').fill('Capital Defence Depot')
                page.locator('#map-search-form button[type=submit]').click()
                page.locator('#search-results button').first.click()
                page.locator('#teleport-button').click()
                page.locator('#map-dialog').wait_for(state='hidden')
                page.wait_for_timeout(1500)
                depot=observe(page,'official Free-roam depot arrival')
                place=next(place for place in depot['places'] if place['id']=='capital-defence-depot')
                check(math.hypot(depot['player']['x']-place['x'],depot['player']['z']-place['z'])<150 and depot.get('defenceDepot'), 'Actual search and official Free-roam teleport reach rendered fictional depot')
                page.screenshot(path=str(output/'build-defence-depot.png'))
                context.close()

            if args.scenario in ('fixture', 'all'):
                revision = '01f8c861719c1621d4ffe454847702aacdae5134'
                server.legacy_worker = subprocess.check_output(['git', 'show', revision + ':Games/Capital Drive/service-worker.js'], cwd=ROOT)
                observations.append({'label':'upgrade fixture source', 'legacyWorkerRevision':revision,
                    'legacyWorkerSHA256':hashlib.sha256(server.legacy_worker).hexdigest(),
                    'currentWorkerSHA256':hashlib.sha256((GAME/'service-worker.js').read_bytes()).hexdigest(),
                    'currentClientSHA256':hashlib.sha256((GAME/'cache-client.js').read_bytes()).hexdigest(),
                    'scope':'Actual legacy worker and current cache-client over tiny explicit fixture assets, not a complete old game.'})
                for playing in (True, False):
                    server.fixture_version = 1
                    context = browser.new_context()
                    stack.callback(context.close)
                    page = new_page(context)
                    fixture_url = base + FIXTURE_PATH + 'index.html'
                    page.goto(fixture_url)
                    page.evaluate('''async()=>{const c=await caches.open('unrelated-sibling-cache');await c.put('/unrelated-sentinel',new Response('keep-me'));localStorage.setItem('capital-drive-career-v1','fixture-save-sentinel');await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});await navigator.serviceWorker.ready;}''')
                    page.reload()
                    page.wait_for_function('!!navigator.serviceWorker.controller')
                    check(page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v1', 'Legacy actual worker controls complete v1 fixture')
                    token = page.evaluate('''(playing)=>{window.fixtureStarted=playing;window.fixtureToken='same-document';document.querySelector('#start-panel').hidden=playing;return document.querySelector('#build-version').textContent;}''', playing)
                    page.evaluate('''async()=>{const {setupGameCache}=await import('./cache-client.js');setupGameCache({canReload:()=>!window.fixtureStarted});}''')
                    page.wait_for_function('document.querySelector("#cache-status").textContent.includes("Saved for faster starts")')
                    context.set_offline(True)
                    page.wait_for_function('!navigator.onLine')
                    server.fixture_version = 2
                    context.set_offline(False)
                    page.wait_for_function('navigator.onLine')
                    expected = hashlib.sha256(b'fixture-v2').hexdigest()[:12]
                    wait_async(page, '''(build)=>new Promise(async resolve=>{const reg=await navigator.serviceWorker.getRegistration();if(!reg?.active||reg.waiting||reg.installing)return resolve(false);const channel=new MessageChannel();const timer=setTimeout(()=>{channel.port1.close();resolve(false)},1000);channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data?.type==='CAPITAL_CACHE_BUILD'&&e.data.build===build)};navigator.serviceWorker.controller.postMessage({type:'CAPITAL_CACHE_BUILD'},[channel.port2]);})''', arg=expected, timeout=30000)
                    prefix = 'capital-drive-files-v1-' + FIXTURE_PATH.replace('/', '%2F') + '-'
                    wait_async(page, '(prefix)=>caches.keys().then(names=>names.filter(name=>name.startsWith(prefix)).length===1)', arg=prefix)
                    check(page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v2', 'Fully hashed v2 worker activates automatically without closing the old tab')
                    check(page.evaluate('(name)=>caches.has(name)', prefix + hashlib.sha256(b'fixture-v2').hexdigest()), 'Only the exact new content-addressed scoped cache remains')
                    check(page.evaluate('caches.open("unrelated-sibling-cache").then(c=>c.match("/unrelated-sentinel")).then(r=>r.text())') == 'keep-me', 'Migration deletes old scoped cache and preserves unrelated cached response')
                    check(page.evaluate('localStorage.getItem("capital-drive-career-v1")') == 'fixture-save-sentinel', 'Worker migration preserves career save bytes')
                    if playing:
                        check(page.evaluate('window.fixtureToken') == 'same-document' and page.locator('#build-version').text_content() == token, 'Already-started session does not reload or switch running document build')
                        page.locator('#cache-update').wait_for(state='visible')
                        check(page.locator('#cache-update').is_disabled() and page.locator('#cache-update').text_content() == 'Update ready · start menu', 'Running session sees the pending update in its footer')
                        check(page.evaluate('fetch("../sibling.txt").then(r=>r.text())') == 'sibling-v2', 'Sibling fetch remains outside worker scope')
                        page.evaluate('window.fixtureStarted=false;document.querySelector("#start-panel").hidden=false')
                        page.wait_for_function('(build)=>document.querySelector("#build-version").textContent===build', arg=expected)
                        check(page.evaluate('typeof window.fixtureToken') == 'undefined', 'Returning to the menu applies the ready build without reopening the tab')
                    else:
                        page.wait_for_function('(build)=>document.querySelector("#build-version").textContent===build', arg=expected)
                        check(page.evaluate('typeof window.fixtureToken') == 'undefined', 'Unstarted menu automatically reloads into newly activated build')
                    check(page.locator('#build-version').text_content() == expected and page.evaluate('window.fixtureCode') == 'fixture-v2' and page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v2', 'Online next document displays exact new build badge and code bytes')
                    context.set_offline(True)
                    page.reload(wait_until='load')
                    check(page.locator('#build-version').text_content() == expected and page.evaluate('window.fixtureCode') == 'fixture-v2' and page.evaluate('fetch("asset.js").then(r=>r.text())') == 'fixture-v2', 'Offline reload serves exact activated build document badge and asset')
                    check(page.evaluate('localStorage.getItem("capital-drive-career-v1")') == 'fixture-save-sentinel', 'Offline new build retains save sentinel')
                    observations.append({'label':'upgrade lifecycle result','playing':playing,'oldBuild':token,'newBuild':expected,'cacheNames':page.evaluate('caches.keys()')})
                    context.close()

            check(source_hashes() == source_before, 'Exact cache build and client source hashes remain unchanged')
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
        report = {'sourceSHA256':source_before,'sourceSHA256End':source_hashes(),'sourcesUnchanged':source_before == source_hashes(),'harnessSHA256':harness_sha256, 'status': 'FAIL' if failure else 'PASS', 'scenario': args.scenario, 'failure': failure,
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
