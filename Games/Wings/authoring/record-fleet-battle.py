#!/usr/bin/env python3
"""Bounded stdlib CDP recording of ORIGINAL AI preview, never served/natural gameplay.

Self-check is browser/server-free. Capture requires a fresh explicit browser-slot
approval. All browser/profile/evidence writes are owned /dev/shm paths. No installs.
"""
import argparse
import base64
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import signal
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('integration', HERE / 'check-fleet-integration-browser.py')
INTEGRATION = importlib.util.module_from_spec(spec)
spec.loader.exec_module(INTEGRATION)
BINARY, FLAGS = INTEGRATION.BINARY, INTEGRATION.FLAGS
LIMIT = 30 * 1024**2
SCOPE = 'ORIGINAL_AI_BATTLE_NOT_GAMEPLAY; explicitly 4x accelerated diagnostic, NOT realtime FPS, game speed, served Wings, natural flight or rights clearance'


def navigation_url(base):
    return base.rstrip('/')+'/'


def comparison_state(frame):
    keys = ('tick', 'simulationMs', 'units', 'poses', 'camera', 'lighting')
    assert all(key in frame and frame[key] is not None for key in keys), 'Comparable quality capture requires camera/lighting DTOs and unchanged authority/poses'
    assert frame['paused'] and frame['tick'] == 800
    return {key: frame[key] for key in keys}


def matches_canvas(frame, canvas):
    assert canvas['width'] > 0 and canvas['height'] > 0
    return abs(frame['camera']['aspect']-canvas['width']/canvas['height']) < 1e-6


def concat_text(frames):
    assert len(frames) >= 2
    lines = ['ffconcat version 1.0']
    for i, frame in enumerate(frames):
        assert frame['file'] == f'frame-{i:04d}.jpg'
        lines.extend([f"file '{frame['file']}'", 'option framerate 1000'])
        if i+1 < len(frames):
            duration = frames[i+1]['timestamp']-frame['timestamp']
            assert duration > 0
            lines.append(f'duration {duration:.9f}')
    return '\n'.join(lines)+'\n'


class CDP:
    """One loopback WebSocket, single-threaded bounded commands/events, RFC6455 masking."""
    def __init__(self, url, deadline, event):
        u = urlsplit(url)
        assert u.scheme == 'ws' and u.hostname == '127.0.0.1'
        self.deadline, self.event, self.counter = deadline, event, 0
        self.read_deadline, self.waiting, self.last_call = deadline, 'WebSocket handshake', None
        self.sock = socket.create_connection((u.hostname, u.port), timeout=2)
        self.sock.settimeout(2)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f'GET {u.path} HTTP/1.1\r\nHost: {u.hostname}:{u.port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        header = bytearray()
        while not header.endswith(b'\r\n\r\n'):
            header.extend(self.exact(1)); assert len(header) < 8192
        accept = base64.b64encode(hashlib.sha1((key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        assert b' 101 ' in header and accept.encode() in header

    def exact(self, n):
        data = bytearray()
        assert n <= 4*1024**2, 'CDP message bound'
        while len(data) < n:
            remaining = min(self.deadline, self.read_deadline)-time.monotonic()
            if remaining <= 0: raise TimeoutError('CDP receive deadline during '+self.waiting)
            self.sock.settimeout(min(2, remaining))
            try:
                chunk = self.sock.recv(n-len(data))
            except socket.timeout:
                continue  # Transient GPU warmup stalls are bounded by command/global deadlines.
            if not chunk: raise EOFError('CDP closed')
            data.extend(chunk)
        return bytes(data)

    def send(self, payload, opcode=1):
        mask = os.urandom(4); n = len(payload)
        header = bytes([0x80 | opcode, 0x80 | (n if n < 126 else 126 if n < 65536 else 127)])
        if n >= 126: header += struct.pack('!H' if n < 65536 else '!Q', n)
        self.sock.sendall(header+mask+bytes(v ^ mask[i % 4] for i, v in enumerate(payload)))

    def command(self, method, params=None):
        self.counter += 1; assert self.counter < 20000
        self.send(json.dumps({'id': self.counter, 'method': method, 'params': params or {}}).encode())
        return self.counter

    def message(self):
        parts = bytearray()
        while True:
            a, b = self.exact(2); assert not b & 128, 'Server frames must be unmasked'
            n = b & 127
            if n == 126: n = struct.unpack('!H', self.exact(2))[0]
            if n == 127: n = struct.unpack('!Q', self.exact(8))[0]
            body = self.exact(n); opcode = a & 15
            if opcode == 9: self.send(body, 10); continue
            if opcode == 10: continue
            if opcode == 8: raise EOFError('CDP closed')
            assert opcode in (0, 1)
            parts.extend(body); assert len(parts) < 4*1024**2
            if a & 128: return json.loads(parts)

    def call(self, method, params=None, timeout=30):
        request = self.command(method, params)
        self.waiting = f'{method} (id {request})'
        self.last_call = {'method': method, 'id': request}
        self.read_deadline = min(self.deadline, time.monotonic()+timeout)
        try:
            while True:
                message = self.message()
                if message.get('id') == request:
                    assert 'error' not in message, message
                    return message.get('result', {})
                if 'method' in message: self.event(message['method'], message.get('params', {}))
        except Exception as error:
            raise RuntimeError(f'CDP {self.waiting} failed: {error}') from error

    def evaluate(self, expression, timeout=30):
        result = self.call('Runtime.evaluate', {'expression': expression, 'returnByValue': True, 'timeout': 5000}, timeout=timeout)
        assert 'exceptionDetails' not in result, result
        return result['result'].get('value')

    def close(self):
        self.sock.close()


def capture(args):
    routes = INTEGRATION.assets(args.three_root)
    started = time.monotonic(); deadline = started+165
    report = {'scope': SCOPE, 'status': 'FAIL', 'native': True, 'flags': FLAGS, 'frames': [], 'phases': [], 'errors': [],
              'disposeMethod': 'existing public lifecycle API; battle controls use genuine CDP mouse input'}
    owned_bytes = 0
    def write(name, data):
        nonlocal owned_bytes
        assert owned_bytes+len(data) <= LIMIT, '30 MiB evidence bound'
        path = args.out/name
        with path.open('xb') as output: output.write(data)
        owned_bytes += len(data)
    def phase(name, state):
        item = {'phase': name, 'elapsedSeconds': time.monotonic()-started, 'state': state}
        report['phases'].append(item)
        print(json.dumps(item), flush=True)
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            code, headers, data = INTEGRATION.response(self.path, routes)
            self.send_response(code)
            for key, value in headers.items(): self.send_header(key, value)
            self.end_headers(); self.wfile.write(data)
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler); server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .05}, daemon=True); thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    browser = cdp = None
    recording = False; record_started = None; frame_bytes = 0
    def event(method, p):
        nonlocal frame_bytes
        if method == 'Fetch.requestPaused':
            url = p['request']['url']
            allowed = url.startswith(('data:', 'blob:')) or (url.startswith(base+'/') and INTEGRATION.RAW.route_path(url[len(base):], routes))
            cdp.command('Fetch.continueRequest' if allowed else 'Fetch.failRequest', {'requestId': p['requestId'], **({} if allowed else {'errorReason': 'BlockedByClient'})})
            if not allowed: report['errors'].append({'blockedRequest': url}); raise AssertionError('Unexpected request: '+url)
        if method == 'Runtime.exceptionThrown': report['errors'].append(p); raise AssertionError('Native page exception')
        if method == 'Runtime.consoleAPICalled' and p.get('type') == 'error': report['errors'].append(p); raise AssertionError('Native console error')
        if method == 'Network.loadingFailed': report['errors'].append(p); raise AssertionError('Native request failure')
        if method == 'Network.responseReceived' and p['response']['status'] >= 400: report['errors'].append(p); raise AssertionError('Native HTTP failure')
        if method == 'Page.screencastFrame':
            cdp.command('Page.screencastFrameAck', {'sessionId': p['sessionId']})
            if not recording or len(report['frames']) >= 240: return
            assert time.monotonic()-record_started <= 75, '75 second screencast ceiling'
            timestamp = p['metadata']['timestamp']; assert isinstance(timestamp, (int, float))
            if report['frames'] and timestamp-report['frames'][-1]['timestamp'] < .32: return
            data = base64.b64decode(p['data'], validate=True); assert data.startswith(b'\xff\xd8')
            frame_bytes += len(data); assert frame_bytes <= 17*1024**2, 'JPEG evidence budget'
            name = f"frame-{len(report['frames']):04d}.jpg"; write(name, data)
            report['frames'].append({'file': name, 'timestamp': timestamp, 'metadata': p['metadata'], 'bytes': len(data)})
    def inspect(timeout=30):
        state = cdp.evaluate('window.fleetIntegration?.inspect()', timeout=timeout)
        report['lastState'] = state
        assert not state or not state.get('error'), state
        return state
    def wait_for(predicate, seconds):
        end = min(deadline, time.monotonic()+seconds)
        while time.monotonic() < end:
            state = inspect(timeout=min(30, max(.001, end-time.monotonic())))
            if state and predicate(state): return state
            time.sleep(.08)
        raise TimeoutError('Native state gate timed out')
    def click(selector):
        end = min(deadline, time.monotonic()+5)
        while not cdp.evaluate(f'(()=>{{const e=document.querySelector({json.dumps(selector)});return !!e&&!e.disabled;}})()'):
            assert time.monotonic() < end, 'Native control unavailable: '+selector
            time.sleep(.08)
        document = cdp.call('DOM.getDocument')['root']['nodeId']
        node = cdp.call('DOM.querySelector', {'nodeId': document, 'selector': selector})['nodeId']
        quad = cdp.call('DOM.getBoxModel', {'nodeId': node})['model']['content']; x, y = sum(quad[::2])/4, sum(quad[1::2])/4
        viewport = cdp.evaluate('({width:innerWidth,height:innerHeight})')
        assert 0 <= x < viewport['width'] and 0 <= y < viewport['height'], 'Native control outside viewport; no force click'
        hit = cdp.evaluate(f'(()=>{{const e=document.querySelector({json.dumps(selector)}),h=document.elementFromPoint({x},{y});return e===h||e.contains(h);}})()')
        assert hit, 'Native control occluded'
        for kind in ['mouseMoved', 'mousePressed', 'mouseReleased']:
            cdp.call('Input.dispatchMouseEvent', {'type': kind, 'x': x, 'y': y, **({} if kind == 'mouseMoved' else {'button': 'left', 'clickCount': 1})})
    def screenshot(name):
        data = cdp.call('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': False})['data']
        write(name+'.png', base64.b64decode(data, validate=True))
    try:
        assert BINARY == '/usr/bin/chromium' and Path(BINARY).is_file(), 'No browser installation/fallback'
        browser = subprocess.Popen([BINARY, *FLAGS, '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
            '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-component-update',
            '--disable-sync', '--disable-application-cache', '--disable-gpu-shader-disk-cache', '--disk-cache-size=1048576',
            '--media-cache-size=1048576', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
            '--user-data-dir='+args.profile, '--window-size=960,640', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            env={**os.environ, 'TMPDIR': '/dev/shm', 'HOME': args.profile, 'XDG_CONFIG_HOME': args.profile+'/config', 'XDG_CACHE_HOME': args.profile+'/cache'})
        active = Path(args.profile)/'DevToolsActivePort'; end = time.monotonic()+15
        while not active.exists():
            assert browser.poll() is None and time.monotonic() < end; time.sleep(.05)
        port = int(active.read_text().splitlines()[0])
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/list', timeout=2) as result: targets = json.load(result)
        cdp = CDP(next(t['webSocketDebuggerUrl'] for t in targets if t['type'] == 'page'), deadline, event)
        for domain in ['Page', 'Runtime', 'Network']: cdp.call(domain+'.enable')
        cdp.call('Fetch.enable', {'patterns': [{'urlPattern': '*'}]})
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 960, 'height': 640, 'deviceScaleFactor': 1, 'mobile': False})
        cdp.call('Page.navigate', {'url': navigation_url(base)})
        opening = wait_for(lambda s: s['ready'] and s['drawCalls'] > 0, 55)
        assert opening['scenario'] == 'surface' and opening['weatherPreset'] == 'clear' and opening['paused'] and opening['tick'] == 0
        assert opening['simulationRate'] == 4, 'Recording must identify the actual explicit 4x diagnostic clock'
        report['simulationRate'] = opening['simulationRate']
        report['performanceClaim'] = 'Accelerated original-module diagnostic only; no realtime FPS or gameplay claim'
        assert opening['loadedModels'] == 3 and len(opening['units']) == 2 and opening['drawCalls'] > 0 and opening['backend']
        assert sorted(u['id'] for u in opening['units']) == ['capital0', 'capital1']
        phase('opening', opening); screenshot('opening')
        for target in [400, 800]:
            click('#step'); approach = wait_for(lambda s: s['tick'] == target and s['paused'], 12)
        assert all(any(abs(a-b) > 1 for a,b in zip(u['position'], next(v for v in opening['units'] if v['id'] == u['id'])['position'])) for u in approach['units'])
        phase('approach-after-two-native-Step20-clicks', approach)
        if cdp.evaluate('!!document.querySelector("#quality")'):
            assert approach.get('sea', {}).get('quality') == 'low', 'Expected actual default low tier'
            before = comparison_state(approach)
            screenshot('approach-low')
            click('#quality')
            for key, code in [('Home', 36), ('ArrowDown', 40), ('Enter', 13)]:
                for kind in ['keyDown', 'keyUp']:
                    cdp.call('Input.dispatchKeyEvent', {'type': kind, 'key': key, 'code': key, 'windowsVirtualKeyCode': code, 'nativeVirtualKeyCode': code})
            balanced = wait_for(lambda s: s['ready'] and s.get('sea', {}).get('quality') == 'balanced', 20)
            assert comparison_state(balanced) == before, 'Native quality selection changed authority, poses, camera or lighting'
            assert cdp.evaluate('document.querySelector("#quality").value') == 'balanced'
            screenshot('approach-balanced')
            report['tierComparison'] = {'label': 'Low versus balanced tier comparison, NOT an original/old-UI before-and-after', 'unchanged': before}
            phase('approach-balanced-tier-comparison', balanced)
        else:
            screenshot('approach')
        recording = True; record_started = time.monotonic()
        cdp.call('Page.startScreencast', {'format': 'jpeg', 'quality': 65, 'maxWidth': 960, 'maxHeight': 640, 'everyNthFrame': 1})
        click('#toggle'); wait_for(lambda s: not s['paused'] and s['tick'] > 800, 5)
        seen = {}; snapshots = []
        end = min(deadline-18, record_started+72)
        final = None
        while time.monotonic() < end:
            state = inspect(); assert state and state['ready'] and state['drawCalls'] > 0 and state['viewFailures'] == 0
            for e in state['events']:
                if e['id'] not in seen or e.get('source') is not None: seen[e['id']] = e
            if len(snapshots) < 240: snapshots.append({'tick': state['tick'], 'units': state['units'], 'outcome': state['outcome']})
            if state['outcome']: final = state; break
            time.sleep(.1)
        assert final and final['outcome']['reason'] == 'capitals' and final['outcome']['winner'] in [0, 1], 'No actual capital victory in recording window; no forced outcome'
        for unit in ['capital0', 'capital1']:
            assert any(e['type'] == 'fire' and e.get('source') == unit for e in seen.values()), 'Missing actual reciprocal fire'
            assert any(e['type'] == 'damage' and e.get('source') == unit and e['damage'] > 0 for e in seen.values()), 'Missing attributed damage'
        assert any(e['type'] == 'sunk' for e in seen.values()) and any(u['hp'] == 0 for u in final['units'])
        assert len(report['frames']) >= 2
        click('#toggle'); paused = wait_for(lambda s: s['paused'], 2); time.sleep(.35); assert inspect()['tick'] == paused['tick']
        recording = False; cdp.call('Page.stopScreencast')
        phase('actual-capital-outcome-paused', final); screenshot('outcome')
        click('#restart'); reset = wait_for(lambda s: s['tick'] == 0 and s['paused'], 8)
        assert reset['outcome'] is None and not reset['events'] and all(u['hp'] == u['maxHp'] for u in reset['units'])
        phase('native-restart', reset)
        # Batch shell/theme/mobile QA in this same owned browser; no extra slot or performance claim.
        cdp.call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-color-scheme', 'value': 'dark'}]})
        screenshot('desktop-dark-restarted')
        cdp.call('Emulation.setDeviceMetricsOverride', {'width': 390, 'height': 844, 'deviceScaleFactor': 1, 'mobile': False})
        canvas = cdp.evaluate('(()=>{const c=document.querySelector("canvas");return {viewport:innerWidth,width:c.clientWidth,height:c.clientHeight};})()')
        assert canvas['viewport'] == 390
        wait_for(lambda s: s['ready'] and matches_canvas(s, canvas), 8)
        report['mobileCanvas'] = canvas
        layout = cdp.evaluate('(()=>({width:innerWidth,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),controls:[...document.querySelectorAll("button,select")].map(e=>({id:e.id,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}))()')
        assert layout['scrollWidth'] <= layout['width'] and all(c['width'] >= 44 and c['height'] >= 44 for c in layout['controls']), layout
        report['mobileLayout'] = layout
        screenshot('mobile-dark')
        cdp.call('Emulation.setEmulatedMedia', {'features': [{'name': 'prefers-color-scheme', 'value': 'light'}]})
        screenshot('mobile-light')
        phase('theme-mobile-layout', layout)
        native_dispose = cdp.evaluate('!!document.querySelector("#dispose")')
        if native_dispose:
            click('#dispose')
            wait_for(lambda s: not s['ready'] and s['tick'] is None, 2)
            report['disposeMethod'] = 'native Dispose control; idempotent public lifecycle receipt readback'
        # Always clean up, but API-only disposal cannot satisfy the requested native-control gate.
        cleanup = cdp.evaluate('window.fleetIntegration.dispose()')
        assert cleanup['disposed'] and not cleanup['animationActive'] and cleanup['activeSessions'] == 0 and not cleanup.get('errors')
        report.update(events=list(seen.values()), samples=snapshots, cleanup=cleanup)
        write('frames.ffconcat', concat_text(report['frames']).encode())
        write('timestamps.json', json.dumps(report['frames'], indent=2).encode())
        ffmpeg = '/usr/bin/ffmpeg' if Path('/usr/bin/ffmpeg').is_file() else None
        if ffmpeg:
            encode = subprocess.Popen([ffmpeg, '-nostdin', '-v', 'error', '-n', '-f', 'concat', '-safe', '0', '-i', str(args.out/'frames.ffconcat'),
                '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '500k', '-maxrate', '500k', '-bufsize', '1000k',
                '-pix_fmt', 'yuv420p', '-fps_mode', 'vfr', '-video_track_timescale', '1000000', '-fs', str(8*1024**2), str(args.out/'battle.mp4')],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                assert encode.wait(timeout=min(12, max(.1, deadline-time.monotonic()))) == 0, 'Existing ffmpeg failed; source frames retained'
                assert (args.out/'battle.mp4').stat().st_size < 8*1024**2-65536, 'Video output may have hit size cutoff; do not call complete'
            finally:
                if encode.poll() is None: encode.terminate(); encode.wait(timeout=2)
        report['status'] = 'PASS_ORIGINAL_AI_BATTLE_NOT_GAMEPLAY' if native_dispose else 'HOLD_NATIVE_DISPOSE_CONTROL'
        assert native_dispose, 'Native Dispose control absent; API cleanup performed, not native disposal acceptance'
    except BaseException as error:
        report['error'] = repr(error)
        raise
    finally:
        if cdp:
            report['lastCommand'] = cdp.last_call
            try: cdp.close()
            except Exception as error: report['errors'].append({'cdpCleanup': repr(error)})
        if browser:
            browser.terminate()
            try: browser.wait(timeout=2)
            except subprocess.TimeoutExpired: browser.kill(); browser.wait(timeout=1)
        server.shutdown(); server.server_close(); thread.join(timeout=1)
        report['elapsedSeconds'] = time.monotonic()-started
        report['outputBytes'] = sum(p.stat().st_size for p in args.out.iterdir() if p.is_file())
        assert report['outputBytes'] < LIMIT-1024**2
        write('receipt.json', json.dumps(report, indent=2).encode())


def self_check(root):
    routes = INTEGRATION.assets(root)
    actual_url = navigation_url('http://127.0.0.1:12345')
    actual_path = urlsplit(actual_url).path
    assert actual_path == '/' and INTEGRATION.RAW.route_path(actual_path, routes) == routes['/']
    assert INTEGRATION.response(actual_path, routes)[0] == 200 and routes['/'].suffix == '.html'
    assert INTEGRATION.response('/fleet-integration-preview.html', routes)[0] == 404, 'Stale startup URL must not be accepted'
    for url, path in routes.items():
        code, _, data = INTEGRATION.response(url, routes); assert code == 200 and data == path.read_bytes()
    INTEGRATION.closure(routes)
    for bad in ['/../package.json', '/%2e%2e/package.json', '/three/package.json', '/Games/Wings/assets/main.js', '/?escape=1', '/weather/../fleet-sim.mjs']:
        assert INTEGRATION.response(bad, routes)[0] == 404
    frames = [{'file': f'frame-{i:04d}.jpg', 'timestamp': n} for i, n in enumerate([10, 10.1, 10.35])]
    concat = concat_text(frames); assert 'duration 0.100000000' in concat and 'duration 0.250000000' in concat and concat.count('file ') == 3
    assert BINARY == '/usr/bin/chromium' and FLAGS == INTEGRATION.FLAGS
    class StalledSocket:
        def __init__(self): self.parts = [b'a', socket.timeout(), b'bc']
        def settimeout(self, _timeout): pass
        def recv(self, _n):
            item = self.parts.pop(0)
            if isinstance(item, Exception): raise item
            return item
    client = CDP.__new__(CDP)
    client.sock = StalledSocket(); client.deadline = client.read_deadline = time.monotonic()+1; client.waiting = 'self-check fragmented receive'
    assert client.exact(3) == b'abc'
    client.deadline = time.monotonic()-1
    try: client.exact(1)
    except TimeoutError as error: assert client.waiting in str(error)
    else: raise AssertionError('Expired CDP deadline accepted')
    frame = {'tick': 800, 'simulationMs': 40000, 'units': [], 'poses': [], 'camera': {}, 'lighting': {}, 'paused': True}
    assert comparison_state(frame)['tick'] == 800
    assert matches_canvas({'camera': {'aspect': 375/390}}, {'width': 375, 'height': 390})
    assert not matches_canvas({'camera': {'aspect': 1}}, {'width': 375, 'height': 390}), 'Scrollbar does not make the actual canvas square'
    print('PASS actual mobile canvas/scrollbar aspect positive and square-assumption negative')
    print('PASS recording self-check: actual root navigation/manifest, exact routes/hashes, traversal rejection, variable timestamps, transient CDP timeout/deadline, quality comparison DTOs; native not run')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--three-root', type=Path, required=True)
    parser.add_argument('--self-check', action='store_true')
    parser.add_argument('--out', type=Path)
    parser.add_argument('--browser-slot-approved', action='store_true')
    parser.add_argument('--capture-child', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--profile', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.self_check: self_check(args.three_root); return
    assert args.browser_slot_approved, 'Fresh explicit parent browser-slot authorization required'
    assert args.out and args.out.resolve().is_relative_to(Path('/dev/shm')) and args.out.resolve() != Path('/dev/shm')
    if args.capture_child:
        assert args.profile and Path(args.profile).resolve().is_relative_to(Path('/dev/shm'))
        capture(args); return
    disk = os.statvfs(HERE); assert disk.f_bavail*disk.f_frsize >= 2*1024**3, 'Root 2 GiB floor'
    shared = os.statvfs('/dev/shm'); assert shared.f_bavail*shared.f_frsize > 96*1024**2, 'Shared memory headroom'
    self_check(args.three_root)
    assert not args.out.exists(), 'Fresh owned output path required'
    args.out.mkdir()
    with tempfile.TemporaryDirectory(prefix='fleet-battle-profile-', dir='/dev/shm') as profile:
        process = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()), '--capture-child', '--browser-slot-approved',
            '--three-root', str(args.three_root.resolve()), '--out', str(args.out.resolve()), '--profile', profile], start_new_session=True,
            env={**os.environ, 'TMPDIR': '/dev/shm', 'PYTHONDONTWRITEBYTECODE': '1'})
        try:
            assert process.wait(timeout=175) == 0, 'Capture failed; preserve partial evidence'
        finally:
            # Always terminate the owned group, even after leader exit: no surviving Chromium children.
            try: os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError: pass
            try: process.wait(timeout=2)
            except subprocess.TimeoutExpired: pass
            try: os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            process.wait(timeout=1)
            if not (args.out/'receipt.json').exists():
                (args.out/'receipt.json').write_text(json.dumps({'scope': SCOPE, 'status': 'FAIL', 'error': 'Supervisor timeout/child failure; partial frames preserved'}))


if __name__ == '__main__': main()
