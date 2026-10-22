#!/usr/bin/env python3
"""Real system-Chromium/CDP boat capture. No state grants or renderer overrides."""
import argparse
import ctypes
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, build_opener
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]


def collector_completed(receipt):
    return (receipt.get('status', '').startswith('PASS') and not receipt.get('failure')
            and all(receipt.get(k) for k in ('browserClosed', 'serverClosed', 'profileRemoved'))
            and not receipt.get('remainingOwnedBrowsers') and not receipt.get('remainingOwnedProcesses')
            and not receipt.get('ownershipCleanupErrors'))


def receipt_passes(receipt):
    return collector_completed(receipt) and receipt.get('supervisorExit') == 0


def receipt_json(receipt):
    return json.dumps(receipt, indent=2).replace(str(ROOT), '.').replace(str(Path.home()), '~') + '\n'


def mark_collector_timeout(receipt):
    receipt['collectorTimedOut'] = True
    if receipt.get('productGate', {}).get('status') == 'PASSED':
        receipt['productGate']['status'] = 'PASSED-with-collector-timeout'


def save_receipt(out, receipt):
    # Preserve prior attempts plus a non-recursive snapshot of the current attempt.
    snapshot = {k: v for k, v in receipt.items() if k != 'attempts'}
    history = [a for a in receipt.get('attempts', []) if a.get('attemptNumber') != receipt['attemptNumber']]
    receipt['attempts'] = history + [snapshot]
    temporary = out / '.browser.json.tmp'
    temporary.write_text(receipt_json(receipt))
    temporary.replace(out / 'browser.json')


def enable_subreaper():
    # Linux keeps double-forked/setsid descendants owned by this verifier, not PID 1.
    prctl = ctypes.CDLL(None, use_errno=True).prctl
    prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong]
    if prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER
        raise OSError(ctypes.get_errno(), 'Cannot establish verifier descendant ownership')
    assert hasattr(os, 'pidfd_open') and hasattr(signal, 'pidfd_send_signal'), 'Linux pidfd support required'


def process_info(pid):
    try:
        fields = (Path('/proc') / str(pid) / 'stat').read_text().rsplit(')', 1)[1].split()
        return (int(fields[1]), int(fields[19]), fields[0])  # parent, birth tick, state
    except (FileNotFoundError, ProcessLookupError):
        return None  # Normal exit during the process-table snapshot.


def owned_descendants():
    # ponytail: cleanup-only /proc scan; use a dedicated cgroup if process counts make this costly.
    table = {}
    for entry in Path('/proc').iterdir():
        if entry.name.isdigit():
            info = process_info(int(entry.name))
            if info is not None:
                table[int(entry.name)] = info
    owned = {os.getpid()}
    while True:
        added = {pid for pid, info in table.items() if info[0] in owned} - owned
        if not added:
            break
        owned.update(added)
    return {pid: table[pid] for pid in owned if pid != os.getpid() and table[pid][2] != 'Z'}


def stop_owned_descendants():
    errors = []
    for sig in (signal.SIGTERM, signal.SIGKILL):
        for pid, info in owned_descendants().items():
            fd = None
            try:
                fd = os.pidfd_open(pid)
                current = process_info(pid)
                if current is not None and current[1] == info[1]:
                    signal.pidfd_send_signal(fd, sig)  # PID reuse cannot redirect this signal.
            except ProcessLookupError:
                continue  # It exited between the ownership snapshot and pidfd open.
            except OSError as error:
                errors.append(f'PID {pid}: {error}')
            finally:
                if fd is not None:
                    os.close(fd)
        time.sleep(0.2)
    return sorted(owned_descendants()), errors


def reap_children():
    while True:
        try:
            pid, _ = os.waitpid(-1, os.WNOHANG)
        except ChildProcessError:
            break
        if pid == 0:
            break


def record_failure(out, receipt, error):
    receipt['status'] = 'HOLD'
    message = str(error) or type(error).__name__
    if receipt.get('failure') and receipt['failure'] != message:
        receipt['cleanupFailure'] = message
    receipt.setdefault('failure', message)
    if isinstance(error, TimeoutError) or 'Timeout' in type(error).__name__:
        mark_collector_timeout(receipt)
    save_receipt(out, receipt)


def self_check():
    good = dict(status='PASS fixture', browserClosed=True, serverClosed=True, profileRemoved=True, supervisorExit=0)
    assert receipt_passes(good)
    assert not receipt_passes({k: v for k, v in good.items() if k != 'supervisorExit'}), 'no final supervisor receipt'
    for key, value in [('browserClosed', False), ('serverClosed', False), ('profileRemoved', False),
                       ('failure', 'injected close failure'), ('remainingOwnedBrowsers', [123]),
                       ('remainingOwnedProcesses', [456]), ('ownershipCleanupErrors', ['injected signal failure']),
                       ('supervisorExit', 124), ('status', 'HOLD')]:
        assert not receipt_passes({**good, key: value}), key
    passed = {'status': 'HOLD', 'productGate': {'status': 'PASSED'}}
    mark_collector_timeout(passed)
    assert passed['productGate']['status'] == 'PASSED-with-collector-timeout'
    assert not receipt_passes(passed), 'product success cannot grant gameplay or cleanup success'
    unknown = {'productGate': {'status': 'NOT_MEASURED'}}
    mark_collector_timeout(unknown)
    assert unknown['productGate']['status'] == 'NOT_MEASURED'
    assert str(ROOT) not in receipt_json({'failure': f'{ROOT}/.tmp/fixture'})
    with TemporaryDirectory(prefix='wings-receipt-', dir=ROOT / '.tmp') as directory:
        r = {'attemptNumber': 3, 'attempts': [{'attemptNumber': 1}, {'attemptNumber': 2}],
             'status': 'HOLD', 'productGate': {'status': 'PASSED'}}
        save_receipt(Path(directory), r)
        mark_collector_timeout(r)
        save_receipt(Path(directory), r)
        stored = json.loads((Path(directory) / 'browser.json').read_text())
        assert [a['attemptNumber'] for a in stored['attempts']] == [1, 2, 3]
        assert stored['productGate']['status'] == 'PASSED-with-collector-timeout'
        assert 'attempts' not in stored['attempts'][-1]
        assert not (Path(directory) / '.browser.json.tmp').exists()
        record_failure(Path(directory), r, TimeoutError('injected navigation timeout'))
        # A later close error must not erase the failure saved before cleanup began.
        record_failure(Path(directory), r, RuntimeError('injected context close error'))
        stored = json.loads((Path(directory) / 'browser.json').read_text())
        assert stored['failure'] == 'injected navigation timeout'
        assert stored['cleanupFailure'] == 'injected context close error'
        assert stored['status'] == 'HOLD' and not receipt_passes(stored)
    enable_subreaper()
    # The escaped child has no profile token and a different session/group; leader exits first.
    fixture = subprocess.Popen([sys.executable, '-B', '-c',
        'import os,time; pid=os.fork(); '
        'os._exit(0) if pid else None; os.setsid(); '
        'print(os.getpid(),flush=True); time.sleep(3)'], stdout=subprocess.PIPE, text=True)
    try:
        escaped = int(fixture.stdout.readline())
        fixture.wait(timeout=1)
        assert escaped in owned_descendants(), 'subreaper must retain ownership after leader exits'
        remaining, errors = stop_owned_descendants()
        assert not remaining and not errors, (remaining, errors)
    finally:
        stop_owned_descendants()
        fixture.wait(timeout=1)
        fixture.stdout.close()
        reap_children()
    print('PASS receipt/ownership: no false PASS; atomic history and first failure retained; escaped markerless child stopped after leader exit; paths sanitized')


def assert_slot_clear():
    for row in subprocess.check_output(['ps', '-eo', 'pid=,args='], text=True).splitlines():
        fields = row.split()
        if len(fields) < 2:
            continue
        browser = Path(fields[1]).name in ('chromium', 'chrome', 'chrome-headless-shell')
        driver = fields[1].endswith('/playwright/driver/node') and 'run-driver' in fields[2:]
        if browser or driver:
            raise RuntimeError(f'Browser slot occupied by PID {fields[0]}')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--self-check', action='store_true', help='Check verdicts without starting a browser')
    parser.add_argument('--internal-worker', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    out = args.out.resolve()
    assert out.is_relative_to(ROOT), 'Evidence must stay in the repository'
    assert shutil.disk_usage(ROOT).free >= 2178940928, 'Disk guard reached'
    assert_slot_clear()
    out.mkdir(parents=True, exist_ok=True)
    previous = json.loads((out / 'browser.json').read_text()) if (out / 'browser.json').exists() else {}
    history = previous.get('attempts', [])
    assert isinstance(history, list)
    enable_subreaper()
    profile = ROOT / '.tmp' / f'wings-boat-publish-profile-{os.getpid()}'
    assert not profile.exists(), 'Use a fresh dedicated profile'
    receipt = {'status': 'HOLD', 'route': 'manual-chromium-cdp-new-context', 'collectorPID': os.getpid(),
               'attemptNumber': max((a['attemptNumber'] for a in history), default=0) + 1,
               'attempts': history, 'phase': 'initializing', 'normalInputOnly': True,
               'steps': [], 'errors': [], 'warnings': [], 'failedRequests': [], 'external': [],
               'connectProbeLimitSeconds': 20, 'collectorLimitSeconds': 50, 'supervisorLimitSeconds': 55,
               'productLimitsSeconds': {'workerBootWait': 30, 'postHandshakeReadiness': 20},
               'productGate': {'status': 'NOT_MEASURED'},
               'limits': 'Collector timeout is HOLD/unknown; a separately measured valid product receipt is retained.'}
    save_receipt(out, receipt)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(ROOT), **kw)

        def log_message(self, *unused):
            pass

    def deadline(*unused):
        raise TimeoutError('Collector/connect limit reached; see phase, not an inferred product failure')

    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(50)
    collector_end = time.monotonic() + 50
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    chrome = browser = context = log = None
    try:
        # No Playwright driver exists at this immediate shared-slot check.
        assert_slot_clear()
        connect_start = time.monotonic()
        connect_end = min(collector_end, connect_start + 20)
        signal.alarm(max(1, math.ceil(connect_end - time.monotonic())))
        receipt['phase'] = 'chromium-start'
        save_receipt(out, receipt)
        log = (ROOT / '.tmp' / f'wings-cdp-{os.getpid()}.stderr.log').open('wb')
        chrome = subprocess.Popen(['/usr/bin/chromium', '--headless', '--no-sandbox',
            '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
            '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
            '--disable-component-update', '--disable-sync', '--disable-extensions',
            '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0',
            f'--user-data-dir={profile}', 'about:blank'],
            stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=log, start_new_session=True)
        receipt['chromiumPID'] = chrome.pid
        receipt['phase'] = 'cdp-probe'
        save_receipt(out, receipt)
        active = profile / 'DevToolsActivePort'
        opener = build_opener(ProxyHandler({}))
        while True:
            if chrome.poll() is not None:
                raise RuntimeError(f'Owned Chromium exited before CDP, code={chrome.returncode}')
            if time.monotonic() >= connect_end:
                raise TimeoutError('20-second CDP endpoint startup limit')
            try:
                lines = active.read_text().splitlines()
                if len(lines) < 2 or not lines[1].startswith('/devtools/browser/'):
                    raise ValueError('CDP port file not complete')
                port = int(lines[0])
                assert 0 < port < 65536
                with opener.open(f'http://127.0.0.1:{port}/json/version', timeout=min(0.5, connect_end-time.monotonic())) as response:
                    endpoint = json.load(response)['webSocketDebuggerUrl']
                address = urlsplit(endpoint)
                assert address.scheme == 'ws' and address.hostname in ('127.0.0.1', 'localhost') and address.port == port
                break
            except (OSError, ValueError, KeyError):
                time.sleep(0.1)
        receipt['endpointReady'] = True
        save_receipt(out, receipt)
        with sync_playwright() as p:
            receipt['phase'] = 'cdp-connect'
            save_receipt(out, receipt)
            remaining = connect_end - time.monotonic()
            if remaining <= 0:
                raise TimeoutError('20-second CDP connect/probe limit')
            browser = p.chromium.connect_over_cdp(endpoint, timeout=remaining * 1000)
            receipt['cdpConnected'] = True
            receipt['phase'] = 'context-probe'
            save_receipt(out, receipt)
            context = browser.new_context(viewport={'width': 1280, 'height': 720}, color_scheme='dark')
            try:
                page = context.new_page()
                assert time.monotonic() <= connect_end, 'CDP/context probe exceeded 20 seconds'
                receipt['connectProbeMs'] = (time.monotonic() - connect_start) * 1000
                receipt['phase'] = 'menu'
                signal.alarm(max(1, math.ceil(collector_end - time.monotonic())))
                save_receipt(out, receipt)
                page.on('pageerror', lambda e: receipt['errors'].append(str(e)))
                page.on('console', lambda m: receipt['errors' if m.type == 'error' else 'warnings'].append(m.text)
                        if m.type in ('error', 'warning') else None)
                page.on('requestfailed', lambda r: receipt['failedRequests'].append(urlsplit(r.url).path))
                page.on('response', lambda r: receipt['failedRequests'].append(f'{r.status} {urlsplit(r.url).path}') if r.status >= 400 else None)
                def route(r):
                    if r.request.url.startswith(origin + '/'):
                        r.continue_()
                    else:
                        receipt['external'].append(r.request.url)
                        r.abort()
                page.route('**/*', route)

                def choose(label):
                    page.locator('#screen .mi .t').get_by_text(label, exact=True).locator('..').click()

                def shot(name):
                    assert shutil.disk_usage(ROOT).free >= 2178940928
                    page.screenshot(path=str(out / name), timeout=7000)
                    receipt.setdefault('screenshots', []).append(name)
                    save_receipt(out, receipt)

                def sample(label):
                    state = page.evaluate('''() => ({game: window.__wings?.game ?? null,
                        stats: window.__wings?.stats ?? null, perf: window.__wings?.perf ?? null,
                        gate: document.querySelector('#render-error[open] pre')?.textContent ?? null})''')
                    receipt['steps'].append({'label': label, **state})
                    save_receipt(out, receipt)
                    return state

                receipt['phase'] = 'menu-navigation'
                save_receipt(out, receipt)
                page.goto(origin + '/Games/Wings/?webgl', wait_until='domcontentloaded', timeout=15000)
                receipt['phase'] = 'menu-settings'
                save_receipt(out, receipt)
                choose('Settings')
                receipt['phase'] = 'menu-graphics'
                save_receipt(out, receipt)
                graphics = page.get_by_role('button', name='Graphics', exact=False)
                for _ in range(3):
                    if 'low' in graphics.inner_text().lower():
                        break
                    graphics.click()
                assert 'low' in graphics.inner_text().lower()
                page.keyboard.press('Escape')
                patrol = page.locator('#screen .mi .t').get_by_text('Speedboat patrol', exact=True).locator('..')
                patrol.hover()
                receipt['phase'] = 'menu-lobby-capture'
                save_receipt(out, receipt)
                shot('01-boat-lobby.png')
                receipt['phase'] = 'await-product-gate'
                save_receipt(out, receipt)
                patrol.click()
                page.wait_for_function("document.querySelector('#render-error[open]') || (window.__wings?.perf?.sceneMs > 0 && window.__wings?.stats?.drawCalls > 0)", timeout=50000)
                state = sample('product readiness observed')
                if state['gate']:
                    receipt['productGate'] = {'status': 'FAILED', 'reason': state['gate']}
                    save_receipt(out, receipt)
                    shot('02-renderer-hold.png')
                    raise RuntimeError(state['gate'])
                perf = state['perf']
                assert 0 < perf['workerStartMs'] <= perf['workerReadyMs'] <= perf['worldMs']
                boot_ms = perf['workerReadyMs'] - perf['workerStartMs']
                draw_ms = perf['worldMs'] - perf['workerReadyMs']
                assert state['stats']['drawCalls'] > 0
                receipt['productGate'] = {'status': 'PASSED' if boot_ms <= 30000 and draw_ms <= 20000 else 'FAILED',
                                          'workerBootWaitMs': boot_ms, 'postHandshakeReadinessMs': draw_ms}
                save_receipt(out, receipt)
                assert receipt['productGate']['status'] == 'PASSED', 'product readiness exceeded pinned limits'
                receipt['phase'] = 'await-boat'
                save_receipt(out, receipt)  # Persist proof BEFORE movement/capture/cleanup can time out.
                page.wait_for_function("window.__wings?.game?.state === 'flying' && window.__wings?.perf?.aircraftMs > 0", timeout=20000)
                state = sample('normal boat launch')
                assert state['game']['kind'] == 'speedboat' and state['game']['hp'] > 0
                assert abs(state['game']['ownRaw'][1]) < 0.5
                shot('02-boat-water-frame.png')
                before = state['game']['ownRaw']
                receipt['phase'] = 'water-movement'
                save_receipt(out, receipt)
                page.keyboard.down('w')
                try:
                    page.wait_for_timeout(2500)
                finally:
                    page.keyboard.up('w')
                state = sample('held W then released')
                assert state['game']['kind'] == 'speedboat' and state['game']['state'] == 'flying'
                assert state['game']['hp'] > 0 and abs(state['game']['ownRaw'][1]) < 0.5
                assert sum((a-b)**2 for a,b in zip(before, state['game']['ownRaw'])) > 0.01
                assert state['stats']['drawCalls'] > 0
                shot('02-boat-water-frame.png')
                assert not any(receipt[k] for k in ('errors', 'failedRequests', 'external')), receipt
                receipt['status'] = 'PASS normal lobby launch and water movement; parent pixel review required'
                receipt['phase'] = 'cleanup'
                save_receipt(out, receipt)
            except (Exception, KeyboardInterrupt) as error:
                record_failure(out, receipt, error)  # Save BEFORE context.close can stall.
                raise
            finally:
                receipt['cleanupPhase'] = 'context-close'
                save_receipt(out, receipt)
                context.close()
                receipt['cleanupPhase'] = 'browser-close'
                save_receipt(out, receipt)
                browser.close()
    except (Exception, KeyboardInterrupt) as error:
        record_failure(out, receipt, error)
    finally:
        remaining, cleanup_errors = stop_owned_descendants()
        receipt['remainingOwnedProcesses'] = remaining
        receipt['ownershipCleanupErrors'] = cleanup_errors
        if chrome is not None:
            try:
                chrome.wait(timeout=1)
            except subprocess.TimeoutExpired:
                cleanup_errors.append('Chromium leader did not exit after owned-descendant cleanup')
        receipt['browserClosed'] = not remaining and not cleanup_errors
        reap_children()
        if log is not None:
            log.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        with socket.socket() as sock:
            receipt['serverClosed'] = sock.connect_ex(('127.0.0.1', server.server_port)) != 0
        signal.alarm(0)
        if receipt.get('browserClosed') and profile.exists():
            shutil.rmtree(profile)
        receipt['profileRemoved'] = not profile.exists()
        if not all(receipt.get(k) for k in ('browserClosed', 'serverClosed', 'profileRemoved')):
            receipt['status'] = 'HOLD'
        receipt['modelSHA256'] = hashlib.sha256((ROOT / 'Games/Wings/models/speedboat.glb').read_bytes()).hexdigest()
        save_receipt(out, receipt)
    print(receipt['status'])
    if receipt.get('failure'):
        print(receipt['failure'].replace(str(ROOT), '.').replace(str(Path.home()), '~'))
    return 0 if collector_completed(receipt) else 1


def supervised():
    enable_subreaper()
    worker = subprocess.Popen([sys.executable, '-B', __file__, *sys.argv[1:], '--internal-worker'],
                              start_new_session=True)
    code = 124
    try:
        code = worker.wait(timeout=55)
    except (subprocess.TimeoutExpired, KeyboardInterrupt):
        print('HOLD: worker interrupted or exceeded 55 seconds; stopping only owned resources', flush=True)
    finally:
        remaining, cleanup_errors = stop_owned_descendants()
        try:
            worker.wait(timeout=1)
        except subprocess.TimeoutExpired:
            cleanup_errors.append('Collector leader did not exit after owned-descendant cleanup')
        reap_children()
        print(f'Owned descendant processes remaining: {remaining}', flush=True)
        if remaining or cleanup_errors:
            code = code or 1
        if '--out' in sys.argv:
            out = Path(sys.argv[sys.argv.index('--out') + 1]).resolve()
            if out.is_relative_to(ROOT) and (out / 'browser.json').exists():
                receipt = json.loads((out / 'browser.json').read_text())
                if receipt.get('collectorPID') != worker.pid:
                    print('No receipt from this invocation; prior attempts left unchanged', flush=True)
                    return code
                receipt['supervisorExit'] = code
                receipt['remainingOwnedProcesses'] = remaining
                receipt['ownershipCleanupErrors'] = cleanup_errors
                if remaining or cleanup_errors:
                    receipt['status'] = 'HOLD'
                if code == 124:
                    mark_collector_timeout(receipt)
                if not receipt_passes(receipt):
                    receipt['status'] = 'HOLD'
                    receipt.setdefault('failure', 'Collector did not complete with verified cleanup; product gate outcome unknown')
                    code = code or 1
                save_receipt(out, receipt)
    return code


if __name__ == '__main__':
    if '--self-check' in sys.argv:
        self_check()
    else:
        raise SystemExit(main() if '--internal-worker' in sys.argv else supervised())
