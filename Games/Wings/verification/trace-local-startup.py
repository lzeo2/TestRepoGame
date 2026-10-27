#!/usr/bin/env python3
"""Bounded local-only Network/RAF diagnostic, not gameplay or screenshot acceptance."""
import argparse
from contextlib import ExitStack
import datetime
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('local_server', ROOT / 'scripts/serve_wings_local.py')
server_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server_module)
BROWSER_ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--disk-cache-size=8388608', '--media-cache-size=1048576',
                '--disable-gpu-shader-disk-cache', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']


def network_record(kind, event):
    result = {key: event[key] for key in ['requestId', 'timestamp', 'wallTime', 'type', 'frameId', 'loaderId',
              'dataLength', 'encodedDataLength', 'errorText', 'canceled', 'blockedReason', 'corsErrorStatus'] if key in event}
    result['event'] = kind
    if kind == 'Network.requestWillBeSent':
        result['request'] = {key: event['request'][key] for key in ['url', 'method', 'initialPriority', 'referrerPolicy']
                             if key in event['request']}
        result['initiator'] = event.get('initiator')
        if event.get('redirectResponse'):
            result['redirectResponse'] = {key: event['redirectResponse'].get(key) for key in ['url', 'status', 'mimeType']}
    if kind == 'Network.responseReceived':
        response = event['response']
        result['response'] = {key: response[key] for key in ['url', 'status', 'mimeType', 'protocol', 'encodedDataLength',
                              'fromDiskCache', 'fromServiceWorker', 'timing'] if key in response}
        result['response']['headers'] = {key: value for key, value in response.get('headers', {}).items()
                                         if key.lower() in ['content-type', 'content-length', 'location']}
    return result


def self_check():
    import ast
    source = ast.parse((ROOT / 'Games/Wings/verification/check-local-factions-browser.py').read_text())
    launches = [node for node in ast.walk(source) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                and node.func.attr == 'launch']
    original = next(node for node in launches if any(k.arg == 'executable_path' for k in node.keywords))
    values = {k.arg: ast.literal_eval(k.value) for k in original.keywords}
    assert values['executable_path'] == '/usr/bin/chromium' and values['args'] == BROWSER_ARGS
    record = network_record('Network.requestWillBeSent', {'requestId': 'r1', 'timestamp': 2, 'wallTime': 100,
        'request': {'url': 'http://127.0.0.1/model.glb', 'method': 'GET', 'headers': {'Cookie': 'not retained'}},
        'initiator': {'type': 'script', 'stack': {'callFrames': [{'functionName': 'load'}]}}})
    assert 'headers' not in record['request'] and record['initiator']['stack']['callFrames'][0]['functionName'] == 'load'
    failed = network_record('Network.loadingFailed', {'requestId': 'r1', 'timestamp': 4, 'errorText': 'net::ERR_ABORTED', 'canceled': True})
    assert failed['canceled'] and failed['errorText'] == 'net::ERR_ABORTED'
    assert network_record('Network.loadingFinished', {'requestId': 'r1', 'timestamp': 5, 'encodedDataLength': 100})['encodedDataLength'] == 100
    print('PASS CPU trace schema, cancellation fields, initiator retention and exact existing browser flags; no browser')


def trace(args):
    from playwright.sync_api import sync_playwright
    for name in ['chromium', 'chrome']:
        assert subprocess.run(['pgrep', '-x', name], capture_output=True).returncode != 0, 'Browser queue occupied'
    now = datetime.datetime.now(datetime.timezone.utc)
    for path in (Path.home() / '.swarm-help').glob('*browser*.json'):
        try:
            lease = json.loads(path.read_text())
            expiry = lease.get('expires_utc')
            if lease.get('status') == 'active' and expiry and datetime.datetime.fromisoformat(expiry.replace('Z', '+00:00')) > now:
                raise RuntimeError('Active browser reservation: ' + path.name)
        except (ValueError, TypeError):
            pass
    assert shutil.disk_usage(ROOT).free >= 2147483648 + 32 * 1024 * 1024
    out = args.out.resolve()
    assert out.is_relative_to(ROOT / '.tmp') and 10 <= args.seconds <= 110
    out.mkdir(parents=True, exist_ok=False)
    temporary = ROOT / '.tmp/t'
    temporary.mkdir(exist_ok=True)
    os.environ['TMPDIR'] = str(temporary)
    lease_path = Path.home() / '.swarm-help' / ('wings-trace-browser-' + now.strftime('%Y%m%d-%H%M%S') + '.json')
    lease = {'owner': 'wings-isolated-delivery-trace', 'pid': os.getpid(), 'status': 'active',
             'claimed_utc': now.isoformat(), 'expires_utc': (now + datetime.timedelta(seconds=300)).isoformat(),
             'scope': args.hypothesis + '; diagnostic only, no screenshot/RAF wait, no retry/push'}
    lease_path.write_text(json.dumps(lease, indent=2) + '\n')
    start = time.monotonic()
    report = {'scope': 'passive local diagnostic, not acceptance', 'hypothesis': args.hypothesis,
              'headed': False, 'directGlbBody': args.direct_glb_body, 'observationSeconds': args.seconds, 'network': [], 'failed': [],
              'console': [], 'pageErrors': [], 'lifecycle': [], 'external': [], 'dropped': {}, 'snapshots': [],
              'sourceCheckpoint': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
              'maxEventBytes': 8 * 1024 * 1024, 'eventBytes': 0}
    phase = 'run'
    resources = ExitStack()
    browser = driver = page = cdp = None

    def append(key, value, cap=2048):
        size = len(json.dumps(value).encode())
        if len(report[key]) < cap and report['eventBytes'] + size <= report['maxEventBytes']:
            report[key].append(value)
            report['eventBytes'] += size
        else:
            report['dropped'][key] = report['dropped'].get(key, 0) + 1

    def persist():
        # Keep first causal evidence even if a later browser/driver close hangs.
        (out / 'trace.json').write_text(json.dumps(report, separators=(',', ':')) + '\n')

    def retain(kind, event):
        record = network_record(kind, event)
        record.update(observedMs=round((time.monotonic() - start) * 1000, 3), phase=phase)
        append('network', record)

    def snapshot(label):
        before = time.monotonic()
        result = cdp.send('Runtime.evaluate', {'expression': '(()=>{const p=window.__wingsDiagnosticTrace?.read();if(p)p.directBody=window.__wingsDirectBodyTrace?.read()??null;return p})()',
                          'returnByValue': True, 'timeout': 3000})
        append('snapshots', {'label': label, 'observedMs': round((time.monotonic() - start) * 1000, 3),
               'roundTripMs': round((time.monotonic() - before) * 1000, 3), 'result': result}, 8)

    try:
        url = resources.enter_context(server_module.local_server())
        report['origin'] = url
        driver = sync_playwright().start()
        browser = driver.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                         timeout=30000, args=BROWSER_ARGS)
        context = browser.new_context(viewport={'width': 960, 'height': 640}, reduced_motion='reduce')
        page = context.new_page()
        page.on('requestfailed', lambda request: append('failed', {'url': request.url.replace(url, ''),
                'error': request.failure, 'phase': phase, 'observedMs': round((time.monotonic() - start) * 1000, 3)}))
        page.on('request', lambda request: append('external', request.url) if request.url.startswith(('http:', 'https:'))
                and not request.url.startswith(url + '/') else None)
        page.on('console', lambda message: append('console', {'type': message.type, 'text': message.text}, 256))
        page.on('pageerror', lambda error: append('pageErrors', str(error), 128))
        cdp = context.new_cdp_session(page)
        cdp.send('Network.enable')
        cdp.send('Page.enable')
        cdp.send('Page.setLifecycleEventsEnabled', {'enabled': True})
        report['browserVersion'] = cdp.send('Browser.getVersion')
        for kind in ['Network.requestWillBeSent', 'Network.responseReceived', 'Network.dataReceived', 'Network.loadingFinished', 'Network.loadingFailed']:
            cdp.on(kind, lambda event, kind=kind: retain(kind, event))
        for kind in ['Page.lifecycleEvent', 'Page.frameNavigated', 'Page.frameDetached', 'Inspector.detached']:
            cdp.on(kind, lambda event, kind=kind: append('lifecycle', {'event': kind, **event}, 256))
        probe = ROOT / 'Games/Wings/verification/local-trace-probe.js'
        page.add_init_script(script=probe.read_text() + '\n//# sourceURL=wings-local-trace-probe.js')
        if args.direct_glb_body:
            body_probe = ROOT / 'Games/Wings/verification/direct-glb-body-probe.js'
            page.add_init_script(script=body_probe.read_text() + '\n//# sourceURL=wings-direct-glb-body-probe.js')
        page.add_init_script("localStorage.setItem('wings.settings',JSON.stringify({quality:'low',muted:true}));localStorage.setItem('wings.autoQuality','1')")
        page.goto(url + '/index.html?webgl', wait_until='domcontentloaded', timeout=30000)
        page.locator('#screen .mi .t').get_by_text('Factions', exact=True).click()
        report['clickedAtMs'] = round((time.monotonic() - start) * 1000, 3)
        # Fixed observation window, NOT a readiness gate or RAF-based polling/forcing.
        page.wait_for_timeout(args.seconds * 1000)
        snapshot('end-of-observation')
        report['diagnosticResult'] = 'TRACE_COLLECTED_NOT_ACCEPTANCE'
        persist()
    except Exception as error:
        report['diagnosticResult'] = 'TRACE_PARTIAL_NOT_ACCEPTANCE'
        report['exception'] = str(error)
        if cdp and time.monotonic() - start < 160:
            try:
                snapshot('first-failure')
            except Exception as error:
                report['snapshotError'] = str(error)
        persist()
        raise
    finally:
        phase = 'cleanup'
        signal.alarm(30)
        for name, close in [('browser', browser.close if browser else None),
                            ('driver', driver.stop if driver else None), ('server', resources.close)]:
            if close:
                try:
                    close()
                except Exception as error:
                    report.setdefault('cleanupErrors', []).append(f'{name}: {error}')
        report['durationSeconds'] = round(time.monotonic() - start, 3)
        persist()
        lease.update(status='released', released_utc=datetime.datetime.now(datetime.timezone.utc).isoformat())
        lease['browser_processes'] = sum([subprocess.run(['pgrep', '-ax', name], capture_output=True, text=True).stdout.splitlines()
                                          for name in ['chromium', 'chrome']], [])
        lease_path.write_text(json.dumps(lease, indent=2) + '\n')
        signal.alarm(0)
        print(json.dumps({'diagnosticResult': report.get('diagnosticResult'), 'seconds': report['durationSeconds'],
                          'evidence': str(out.relative_to(ROOT)), 'ownedReleaseBrowserRoots': len(lease['browser_processes'])}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-check', action='store_true')
    parser.add_argument('--hypothesis')
    parser.add_argument('--out', type=Path)
    parser.add_argument('--seconds', type=int, default=85)
    parser.add_argument('--direct-glb-body', action='store_true', help='Diagnostic FileLoader native-arrayBuffer fallback, GLB only')
    args = parser.parse_args()
    if args.self_check:
        self_check()
    else:
        assert args.hypothesis and args.out, 'Document hypothesis and provide a fresh ignored output directory'
        def deadline(*_):
            raise TimeoutError('180-second trace deadline')
        signal.signal(signal.SIGALRM, deadline)
        signal.alarm(180)
        trace(args)
