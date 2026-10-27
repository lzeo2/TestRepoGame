"""Original composition preview checker; not natural flight/served Wings acceptance.

Self-check only: python3 -B Games/Wings/authoring/check-fleet-integration-browser.py \
  --self-check --three-root "$THREE_ROOT"
Parent-authorized capture additionally needs --browser-slot-approved --out /dev/shm/<new-owned-dir>.
No browser/server is started by --self-check. No downloads, installs or screenshot retries.
"""
import argparse
import ast
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlsplit, urljoin

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('wings_raw_routes', HERE / 'check-fleet-rig-browser.py')
RAW = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(RAW)
BINARY = '/usr/bin/chromium'
FLAGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
DEADLINE_SECONDS = 175  # Plus bounded 3+2 second owned-process cleanup: <=180 seconds total.
SCOPE = 'ORIGINAL COMPOSITION PREVIEW; CPU scenarios/native renderer evidence, not natural flight/served Wings'
LOCAL = ('fleet-integration-preview.mjs', 'fleet-composition.mjs', 'fleet-session.mjs', 'fleet-sim.mjs',
         'fleet-geometry.mjs', 'fleet-rig.mjs', 'fleet-sea-view.mjs', 'map-pack/maps.mjs', 'weather/weather.mjs', 'weather/weather-view.mjs')
EXTRA_THREE = ('build/three.webgpu.js', 'build/three.tsl.js', 'examples/jsm/controls/OrbitControls.js')
MIME = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
        '.json': 'application/json', '.glb': 'model/gltf-binary', '.txt': 'text/plain'}


def assets(root):
    routes = RAW.assets(root)  # Existing exact version/license/three-GLB hash+embedded-resource checks.
    routes['/'] = HERE / 'fleet-integration-preview.html'
    routes.update({'/' + name: HERE / name for name in LOCAL})
    routes.update({'/three/' + name: root.resolve() / name for name in EXTRA_THREE})
    assert all(path.is_file() for path in routes.values()), 'Parent preview/module route absent'
    return routes


def response(raw_path, routes):
    path = RAW.route_path(raw_path, routes)
    if path is None:
        return 404, {'Content-Type': 'text/plain', 'Content-Length': '9', 'Cache-Control': 'no-store'}, b'Not found'
    data = path.read_bytes()
    return 200, {'Content-Type': MIME[path.suffix], 'Content-Length': str(len(data)), 'Cache-Control': 'no-store'}, data


def closure(routes, html=None):
    html = routes['/'].read_text() if html is None else html
    match = re.search(r'<script\s+type=[\"\']importmap[\"\']\s*>(.*?)</script>', html, re.S)
    assert match, 'Actual HTML importmap missing'
    imports_map = json.loads(match[1])['imports']
    assert isinstance(imports_map, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in imports_map.items())
    sources = {url: path.read_text() for url, path in routes.items() if path.suffix in ('.js', '.mjs')}
    program = "import vm from 'node:vm';import fs from 'node:fs';const s=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(Object.fromEntries(Object.entries(s).map(([u,c])=>[u,new vm.SourceTextModule(c).dependencySpecifiers]))));"
    parsed = subprocess.run(['node', '--experimental-vm-modules', '--input-type=module', '-e', program],
                            input=json.dumps(sources), text=True, capture_output=True, check=True, timeout=20)
    count = 0
    for url, imports in json.loads(parsed.stdout).items():
        for item in imports:
            if item in imports_map:
                target = urljoin('/', imports_map[item])
            else:
                prefixes = [key for key in imports_map if key.endswith('/') and item.startswith(key)]
                if prefixes:
                    key = max(prefixes, key=len)
                    assert imports_map[key].endswith('/'), 'Invalid importmap prefix target'
                    target = urljoin('/', imports_map[key] + item[len(key):])
                elif item.startswith(('.', '/')):
                    target = urljoin(url, item)
                else:
                    raise AssertionError('Unknown module import: ' + item)
            assert RAW.route_path(target, routes), (url, target)
            count += 1
    return count


def changed_articulation(before, after):
    prior = {(unit['id'], node['name']): node['quaternion'] for unit in before for node in unit['nodes']}
    changed = []
    for unit in after:
        for node in unit['nodes']:
            key = (unit['id'], node['name'])
            if key not in prior or not re.search('propeller|rudder|plane|turret|gun', node['name'], re.I):
                continue
            a, b = prior[key], node['quaternion']
            assert len(a) == len(b) == 4 and all(math.isfinite(x) for x in a + b), 'Invalid actual node quaternion'
            na, nb = math.sqrt(sum(x*x for x in a)), math.sqrt(sum(x*x for x in b))
            assert na > 0 and nb > 0
            if 1 - abs(sum(x*y for x, y in zip(a, b)) / (na*nb)) > 1e-8:
                changed.append({'unit': key[0], 'node': key[1], 'before': a, 'after': b})
    return changed


def self_check(root):
    routes = assets(root)
    count = closure(routes)
    html = routes['/'].read_text()
    match = re.search(r'<script\s+type=[\"\']importmap[\"\']\s*>(.*?)</script>', html, re.S)
    broken_map = json.loads(match[1]); assert broken_map['imports'].pop('three/webgpu', None)
    broken_html = html[:match.start(1)] + json.dumps(broken_map) + html[match.end(1):]
    try:
        closure(routes, broken_html)
    except AssertionError as error:
        assert 'three/webgpu' in str(error), error
    else:
        raise AssertionError('Removing actual three/webgpu importmap alias must fail static closure')
    print('PASS actual HTML importmap closure; removing three/webgpu rejects real TSL dependency (no source write)')
    for url, path in routes.items():
        code, headers, data = response(url, routes)
        assert code == 200 and RAW.route_path(url, routes) == path
        assert headers['Content-Type'] == MIME[path.suffix] and int(headers['Content-Length']) == len(data)
        assert headers['Cache-Control'] == 'no-store'
    for bad in ('/../package.json', '/%2e%2e/package.json', '//foreign/x', '/?cache=1',
                '/fleet-integration-preview.mjs?x=1', '/Games/Wings/assets/main.js', '/three/package.json',
                '/models/fa18.glb', '/three/build/../../package.json', '/weather/../fleet-sim.mjs'):
        assert response(bad, routes)[0] == 404
    html = routes['/'].read_text()
    assert '/three/build/three.webgpu.js' in html and '/three/build/three.tsl.js' in html
    assert 'fleet-integration-preview.mjs' in html
    for element in ('step', 'toggle', 'restart', 'map', 'weather', 'scenario', 'camera', 'quality'):
        assert f'id="{element}"' in html or f"id='{element}'" in html, element
    enums = {'map': {'island-archipelago', 'fjord-coast', 'coastal-strait'},
             'weather': {'clear', 'fog'}, 'quality': {'low', 'balanced', 'high'}, 'scenario': {'surface', 'submarine'},
             'camera': {'battle', 'overview', 'submarine'}}
    for element, expected in enums.items():
        match = re.search(r'<select[^>]*id=[\"\']' + element + r'[\"\'][^>]*>(.*?)</select>', html, re.S)
        assert match and set(re.findall(r'value=[\"\']([^\"\']+)[\"\']', match[1])) == expected, element
    still = [{'id': 'fixture', 'nodes': [{'name': 'propeller', 'quaternion': [0, 0, 0, 1]}]}]
    moved = [{'id': 'fixture', 'nodes': [{'name': 'propeller', 'quaternion': [0, 1, 0, 0]}]}]
    equivalent = [{'id': 'fixture', 'nodes': [{'name': 'propeller', 'quaternion': [0, 0, 0, -1]}]}]
    assert changed_articulation(still, moved) and not changed_articulation(still, still) and not changed_articulation(still, equivalent)
    source = Path(__file__).read_text()
    ast.parse(source)
    # Execute the actual nested logger: capture payloads legitimately contain a 'name' field.
    import contextlib
    import io
    from types import SimpleNamespace
    logger = next(node for node in ast.walk(ast.parse(source))
                  if isinstance(node, ast.FunctionDef) and node.name == 'phase')
    with tempfile.TemporaryDirectory(prefix='wings-phase-check-', dir='/dev/shm') as directory:
        namespace = {'time': time, 'started': time.monotonic(), 'report': {'phases': []},
                     'args': SimpleNamespace(out=Path(directory)), 'json': json, 'os': os}
        exec(compile(ast.Module(body=[logger], type_ignores=[]), '<actual-preview-logger>', 'exec'), namespace)
        with contextlib.redirect_stdout(io.StringIO()):
            namespace['phase']('capture-start', name='actual-case')
        assert namespace['report']['phases'][0]['name'] == 'actual-case'
        assert json.loads((Path(directory) / 'phases.jsonl').read_text())['phase'] == 'capture-start'
    print('PASS actual phase logger accepts capture name payload and persists the named event')
    assert BINARY == '/usr/bin/chromium' and 'executable_path=BINARY' in source
    assert DEADLINE_SECONDS + 3 + 2 <= 180
    assert 'start_new_session=True' in source and 'os.killpg' in source and 'TemporaryDirectory' in source
    assert 'server.shutdown()' in source and 'server.server_close()' in source and 'browser.close()' in source
    print(f'PASS self-check: reused raw asset validation; {len(routes)} exact routes/headers; {count} parsed static imports')
    print('PASS negative traversal/query/upstream routes; Python AST; system browser/owned cleanup/deadline configuration')
    print('SELF-CHECK ONLY: no browser/server, screenshots, native interaction or renderer PASS')


def state_valid(s):
    assert isinstance(s, dict), 'inspect() must return a DTO'
    for key in ('tick', 'paused', 'mapId', 'weatherPreset', 'scenario', 'simulationMs', 'drawCalls',
                'triangles', 'loadedModels', 'units', 'weather', 'backend', 'poses', 'viewFailures'):
        assert key in s, 'Missing inspect field: ' + key
    assert type(s['tick']) is int and s['tick'] >= 0 and type(s['paused']) is bool
    assert s['simulationMs'] == s['tick'] * 50, 'Authority/weather clock mismatch'
    assert s['weather']['simulationMs'] == s['simulationMs']
    assert all(isinstance(s['weather'][k], (int, float)) and math.isfinite(s['weather'][k]) and
               0 <= s['weather'][k] <= .01 for k in ('fogBase', 'fogSea'))
    models = s['loadedModels']
    assert (len(models) if isinstance(models, list) else models) >= 3, 'Fewer than three actual loaded models'
    assert s['drawCalls'] > 0 and s['triangles'] > 0, 'No actual renderer draw'
    assert s['viewFailures'] == 0, 'Presentation view failed'
    assert isinstance(s['units'], list)
    for unit in s['units']:
        assert isinstance(unit['id'], str) and unit['team'] in (0, 1) and math.isfinite(unit['hp'])
        assert len(unit['position']) == 3 and all(math.isfinite(x) for x in unit['position'])


def capture_child(args, routes):
    from playwright.sync_api import sync_playwright  # Never imported by self-check.
    def terminate(_signal, _frame):
        raise TimeoutError('Owned preview capture deadline')
    signal.signal(signal.SIGTERM, terminate)
    assert Path(BINARY).is_file(), 'System Chromium missing; never install'
    report = {'scope': SCOPE, 'status': 'FAIL', 'flags': FLAGS, 'cases': [], 'phases': [],
              'requests': [], 'consoleErrors': [], 'consoleInfo': [], 'pageErrors': [], 'requestFailures': [], 'cleanupErrors': [], 'screenshotAttempts': 0}
    pending = {}
    def phase(label, **data):
        item = {'phase': label, 'elapsedSeconds': round(time.monotonic() - started, 3), **data}
        report['phases'].append(item)
        with (args.out / 'phases.jsonl').open('a') as log:
            log.write(json.dumps(item) + '\n')
            log.flush()
            os.fsync(log.fileno())
        print(json.dumps(item), flush=True)
    started = time.monotonic()
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            code, headers, data = response(self.path, routes)
            self.send_response(code)
            for key, value in headers.items():
                self.send_header(key, value)
            self.end_headers()
            self.wfile.write(data)
        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .1}, daemon=True)
    browser = None
    page = None
    cdp = None
    thread.start()
    original_error = None
    try:
        with sync_playwright() as p:
            try:
                phase('launch')
                browser = p.chromium.launch_persistent_context(args.profile, executable_path=BINARY,
                    headless=True, args=FLAGS, timeout=20000, viewport={'width': 1280, 'height': 860}, device_scale_factor=1)
                page = browser.pages[0] if browser.pages else browser.new_page()
                page.set_default_timeout(10000)
                cdp = browser.new_cdp_session(page)
                base = f'http://127.0.0.1:{server.server_port}'
                def guard(route):
                    url = route.request.url
                    if url.startswith(('data:', 'blob:')) or (url.startswith(base + '/') and RAW.route_path(url[len(base):], routes)):
                        route.continue_()
                    else:
                        report['requestFailures'].append({'url': url, 'error': 'Blocked outside exact allowlist'})
                        route.abort()
                def requested(request):
                    item = {'url': request.url, 'state': 'pending'}
                    pending[request] = item
                    report['requests'].append(item)
                def completed(request):
                    item = pending.pop(request, None)
                    if item is not None:
                        item['state'] = 'finished'
                        response_object = request.response()
                        item['status'] = response_object.status if response_object else None
                def failed(request):
                    item = pending.pop(request, None)
                    if item is not None:
                        item['state'] = 'failed'
                    report['requestFailures'].append({'url': request.url, 'error': request.failure})
                page.route('**/*', guard)
                page.on('request', requested)
                page.on('requestfinished', completed)
                page.on('requestfailed', failed)
                def console(message):
                    if message.type == 'error':
                        report['consoleErrors'].append(message.text)
                        phase('console-error', text=message.text)
                    elif message.type in ('info', 'log'):
                        report['consoleInfo'].append(message.text)
                        phase('console-info', text=message.text)
                def page_error(error):
                    report['pageErrors'].append(str(error))
                    phase('page-error', error=str(error))
                page.on('console', console)
                page.on('pageerror', page_error)
                def inspect():
                    error = page.evaluate('fleetIntegration.error')
                    assert not error, error
                    state = page.evaluate('fleetIntegration.inspect()')
                    state_valid(state)
                    return state
                def ready():
                    deadline = time.monotonic() + 65
                    while True:
                        assert not report['pageErrors'] and not report['consoleErrors'], {'pageErrors': report['pageErrors'], 'consoleErrors': report['consoleErrors']}
                        reply = cdp.send('Runtime.evaluate', {'expression': 'window.fleetIntegration ? ({ready:fleetIntegration.ready,error:fleetIntegration.error,scope:fleetIntegration.scope}) : null', 'returnByValue': True, 'timeout': 1000})
                        assert not reply.get('exceptionDetails'), reply
                        status = reply.get('result', {}).get('value')
                        if status and (status.get('ready') or status.get('error')):
                            break
                        assert time.monotonic() < deadline, 'Preview ready/error not reached within 65 seconds'
                        page.wait_for_timeout(100)
                    assert status['ready'] and not status.get('error'), status
                    report['previewScope'] = status['scope']
                    return inspect()
                def stable():
                    before = inspect()
                    assert before['paused'], 'Expected paused preview'
                    page.wait_for_timeout(250)
                    assert inspect()['tick'] == before['tick'], 'Paused authority tick advanced'
                    return before
                def step():
                    before = inspect()
                    phase('step', tickBefore=before['tick'])
                    page.locator('#step').click()
                    page.wait_for_function('(tick)=>fleetIntegration.error || (fleetIntegration.inspect().paused && fleetIntegration.inspect().tick===tick+400)', arg=before['tick'], timeout=15000)
                    state = stable()
                    assert state['simulationMs'] == state['tick'] * 50
                    return state
                def select(selector, value, field):
                    phase('select', control=selector, value=value)
                    page.locator(selector).select_option(value)
                    page.wait_for_function('({field,value})=>fleetIntegration.error || (fleetIntegration.ready && fleetIntegration.inspect()[field]===value && fleetIntegration.inspect().tick===0 && fleetIntegration.inspect().paused)', arg={'field': field, 'value': value}, timeout=15000)
                    return stable()
                def capture(name):
                    assert report['screenshotAttempts'] < 5, 'Screenshot budget exceeded'
                    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                    state = inspect()
                    path = args.out / (name + '.png')
                    phase('capture-start', name=name)
                    report['screenshotAttempts'] += 1
                    page.screenshot(path=str(path), timeout=10000, full_page=False)
                    item = {'name': name, 'state': state, 'viewport': page.viewport_size,
                            'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                    report['cases'].append(item)
                    phase('captured', case=item)
                page.emulate_media(color_scheme='light')
                phase('navigate')
                page.goto(base + '/', wait_until='domcontentloaded', timeout=15000)
                initial = ready()
                assert initial['tick'] == 0 and initial['scenario'] == 'surface' and initial['weatherPreset'] == 'clear'
                phase('ready', state=stable())
                report['context'] = page.evaluate("""()=>{const gl=document.querySelector('canvas').getContext('webgl2');if(!gl)throw Error('No actual WebGL2 context');const e=gl.getExtension('WEBGL_debug_renderer_info');return {version:gl.getParameter(gl.VERSION),shadingLanguage:gl.getParameter(gl.SHADING_LANGUAGE_VERSION),renderer:gl.getParameter(e?e.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(e?e.UNMASKED_VENDOR_WEBGL:gl.VENDOR)};}""")
                before_poses = initial['poses']
                clear20 = step()
                changed = changed_articulation(before_poses, clear20['poses'])
                report['articulation'] = {'before': before_poses, 'after': clear20['poses'], 'changed': changed}
                assert changed, 'No actual articulated node quaternion changed after 20 simulation seconds'
                phase('articulation-verified', changed=changed)
                capture('desktop-light-surface-clear')
                before = inspect()
                phase('run-start')
                page.locator('#toggle').click()
                page.wait_for_function('(tick)=>fleetIntegration.error || (!fleetIntegration.inspect().paused && fleetIntegration.inspect().tick>tick)', arg=before['tick'], timeout=5000)
                page.locator('#toggle').click()
                assert stable()['tick'] > before['tick']
                phase('run-pause')
                phase('restart-start')
                page.locator('#restart').click()
                page.wait_for_function('fleetIntegration.error || (fleetIntegration.ready && fleetIntegration.inspect().tick===0 && fleetIntegration.inspect().paused)', timeout=10000)
                assert stable()['tick'] == 0
                phase('restart')
                page.emulate_media(color_scheme='dark')
                select('#weather', 'fog', 'weatherPreset')
                fog20 = step()
                clear_positions = {u['id']: u['position'] for u in clear20['units'] if u['team'] == 0}
                fog_positions = {u['id']: u['position'] for u in fog20['units'] if u['team'] == 0}
                report['clearFogComparison'] = {'clearPositions': clear_positions, 'fogPositions': fog_positions,
                                                'clearVisibility': clear20['weather'], 'fogVisibility': fog20['weather']}
                assert clear_positions.keys() == fog_positions.keys()
                assert all(max(abs(a-b) for a, b in zip(position, fog_positions[key])) <= 1e-7 for key, position in clear_positions.items()), 'Weather changed nonvisual fixture motion'
                assert sum(fog20['weather'][key] for key in ('fogBase', 'fogSea')) > sum(clear20['weather'][key] for key in ('fogBase', 'fogSea')), 'Fog did not increase actual composed density'
                capture('desktop-dark-surface-fog')
                select('#weather', 'clear', 'weatherPreset')
                select('#map', 'fjord-coast', 'mapId')
                page.locator('#camera').select_option('overview')
                step()
                capture('desktop-fjord-overview')
                select('#scenario', 'submarine', 'scenario')
                page.locator('#camera').select_option('submarine')
                sub_state = step()
                assert any(u['id'] == 'sub0' and u['team'] == 0 for u in sub_state['units']), 'Friendly sub0 absent'
                assert all(u['id'] != 'sub1' for u in sub_state['units']), 'Enemy sub1 exact pose disclosed'
                capture('desktop-submarine')
                page.set_viewport_size({'width': 390, 'height': 844})
                layout = page.evaluate("""()=>{const controls=['step','toggle','restart','map','weather','scenario','camera'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,width:r.width,height:r.height};});return {width:innerWidth,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),controls};}""")
                assert layout['scrollWidth'] <= layout['width'], layout
                assert all(c['width'] >= 44 and c['height'] >= 44 for c in layout['controls']), layout
                report['mobileLayout'] = layout
                capture('mobile-submarine')
                expected_glbs = {url for url, path in routes.items() if path.suffix == '.glb'}
                finished_glbs = {urlsplit(r['url']).path for r in report['requests'] if r['state'] == 'finished' and r.get('status') == 200}
                assert expected_glbs <= finished_glbs, 'Actual GLB requests not all completed'
                assert not any(urlsplit(r['url']).path in expected_glbs for r in pending.values()), 'GLB still pending at disposal'
                assert not pending, 'Requests still pending before disposal/close'
                report['glbsCompletedBeforeDispose'] = sorted(expected_glbs)
                phase('before-dispose', completedGLBs=report['glbsCompletedBeforeDispose'])
                report['disposal'] = page.evaluate('fleetIntegration.dispose()')
                result = report['disposal']
                assert result['disposed'] is True and result['activeSessions'] == 0 and result['animationActive'] is False and not result.get('errors'), result
                assert not report['consoleErrors'] and not report['pageErrors'] and not report['requestFailures'], 'Unfiltered browser errors/requests present'
                phase('interaction-complete')
            except BaseException as error:
                original_error = error
                report['status'] = 'FAIL'
                report['error'] = type(error).__name__ + ': ' + str(error)
                phase('failure', error=report['error'])
                if page is not None and not page.is_closed():
                    try:
                        diagnostic = cdp.send('Runtime.evaluate', {'expression': "(()=>{const a=window.fleetIntegration;let inspect=null,inspectError=null;try{if(typeof a?.inspect==='function')inspect=a.inspect();}catch(e){inspectError=String(e);}return {inspect,inspectError,status:document.getElementById('status')?.textContent??null,ready:a?.ready??false,error:a?.error??null};})()", 'returnByValue': True, 'timeout': 5000})
                        assert not diagnostic.get('exceptionDetails'), diagnostic
                        report['failureDiagnostic'] = diagnostic.get('result', {}).get('value')
                    except BaseException as diagnostic_error:
                        report['failureDiagnosticError'] = str(diagnostic_error)
                    if report['screenshotAttempts'] < 5:
                        report['screenshotAttempts'] += 1
                        try:
                            path = args.out / 'failure.png'
                            page.screenshot(path=str(path), timeout=5000, full_page=False)
                            report['failureScreenshot'] = {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
                        except BaseException as screenshot_error:
                            report['failureScreenshotError'] = str(screenshot_error)
                    else:
                        report['failureScreenshotError'] = 'Five-attempt screenshot budget exhausted'
                raise
            finally:
                if browser is not None:
                    try:
                        browser.close()
                    except Exception as error:
                        report['cleanupErrors'].append(str(error))
                        if original_error is None:
                            raise
        assert not pending, 'Requests still pending after browser.close'
        assert not report['consoleErrors'] and not report['pageErrors'] and not report['requestFailures'] and not report['cleanupErrors'], 'Unfiltered errors during/after browser.close'
        report['status'] = 'PASS_ORIGINAL_PREVIEW_ONLY'
        phase('complete')
    except BaseException as error:
        if original_error is None:
            original_error = error
            report['status'] = 'FAIL'
            report['error'] = type(error).__name__ + ': ' + str(error)
            phase('failure', error=report['error'])
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report['pendingRequests'] = [dict(item) for item in pending.values()]
        with (args.out / 'receipt.json').open('x') as output:
            output.write(json.dumps(report, indent=2) + '\n')
            output.flush()
            os.fsync(output.fileno())
    if original_error:
        raise original_error
    print('PASS original preview interaction/capture only; not natural flight or served Wings', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--three-root', required=True, type=Path)
    parser.add_argument('--self-check', action='store_true')
    parser.add_argument('--out', type=Path)
    parser.add_argument('--browser-slot-approved', action='store_true')
    parser.add_argument('--capture-child', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--profile', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.self_check:
        self_check(args.three_root)
        return
    assert args.out and args.out.resolve().is_relative_to(Path('/dev/shm')), 'Assigned shared-memory output required'
    if args.capture_child:
        assert args.profile
        capture_child(args, assets(args.three_root))
        return
    assert args.browser_slot_approved, 'Parent fresh queue/release/preflight approval required'
    self_check(args.three_root)
    disk = os.statvfs(HERE)
    assert disk.f_bavail * disk.f_frsize >= 2 * 1024**3, 'Root disk below 2 GiB floor'
    assert not args.out.exists(), 'Output must be new and owned'
    args.out.mkdir(parents=True)
    with tempfile.TemporaryDirectory(prefix='fleet-integration-profile-', dir='/dev/shm') as profile:
        command = [sys.executable, '-B', str(Path(__file__).resolve()), '--capture-child', '--three-root', str(args.three_root.resolve()),
                   '--out', str(args.out.resolve()), '--profile', profile]
        process = subprocess.Popen(command, start_new_session=True)
        try:
            assert process.wait(timeout=DEADLINE_SECONDS) == 0, 'Native preview failed; inspect partial receipt/phases'
        finally:
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=2)
            # If hard termination prevented child finally, preserve a terminal error without overwriting evidence.
            if not (args.out / 'receipt.json').exists():
                with (args.out / 'receipt.json').open('x') as output:
                    json.dump({'scope': SCOPE, 'status': 'FAIL', 'error': 'Capture terminated before final receipt',
                               'partialEvidence': 'phases.jsonl', 'exitCode': process.returncode}, output, indent=2)
                    output.write('\n')


if __name__ == '__main__':
    main()
