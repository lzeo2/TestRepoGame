#!/usr/bin/env python3
"""One bounded CTF UI/boat/AI-crew flag capture; no simulation or renderer grants."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import importlib.util
import json
import socket
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

spec = importlib.util.spec_from_file_location('wings_verifier', Path(__file__).with_name('check-boat-publish.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
ROOT = base.ROOT
COLLECTOR_SECONDS = 50


def remaining_ms(end, ceiling):
    remaining = (end - time.monotonic()) * 1000
    if remaining <= 0:
        raise TimeoutError('50s collector deadline; product outcome unknown unless measured')
    return min(ceiling, remaining)


def product_result(perf):
    start, ready, world = (perf.get(k, 0) for k in ('workerStartMs', 'workerReadyMs', 'worldMs'))
    if not 0 < start <= ready <= world:
        raise ValueError('No ordered product timing receipt')
    boot, draw = ready - start, world - ready
    return {'status': 'PASSED' if boot <= 30000 and draw <= 20000 else 'FAILED',
            'workerBootWaitMs': boot, 'postHandshakeReadinessMs': draw}


def worker(out, headless=False, attempt_number=1):
    assert shutil.disk_usage(ROOT).free >= 2178940928
    base.assert_slot_clear()
    base.enable_subreaper()
    out.mkdir(parents=True, exist_ok=True)
    assert not (out / 'browser.json').exists(), 'Never overwrite/retry a completed native attempt'
    temp = Path(tempfile.mkdtemp(prefix=f'wings-ctf-{os.getpid()}-', dir=ROOT / '.tmp'))
    os.environ['TMPDIR'] = str(temp)  # Driver-created fresh profiles stay inside the owned repository temp.
    started = time.monotonic()
    receipt = {'attemptNumber': attempt_number, 'collectorPID': os.getpid(), 'status': 'HOLD', 'phase': 'initializing',
               'route': 'repo-sync-launch-headless-swiftshader-new-context' if headless else 'repo-sync-launch-headed-new-context', 'tempDirectory': str(temp.relative_to(ROOT)),
               'normalInputOnly': True, 'roleProof': 'AI pilot plus player crew; not manual pilot acceptance',
               'collectorLimitSeconds': COLLECTOR_SECONDS, 'supervisorLimitSeconds': COLLECTOR_SECONDS,
               'launchLimitSeconds': 30, 'navigationLimitSeconds': 15, 'phases': [],
               'productLimitsSeconds': {'workerBootWait': 30, 'postHandshakeReadiness': 20},
               'productGate': {'status': 'NOT_MEASURED'}, 'steps': [], 'screenshots': [],
               'errors': [], 'warnings': [], 'failedRequests': [], 'external': []}

    def phase(name):
        receipt['phase'] = name
        receipt['phases'].append({'phase': name, 'unixSeconds': time.time(),
                                  'elapsedMs': (time.monotonic() - started) * 1000})
        base.save_receipt(out, receipt)

    def deadline(*unused):
        raise TimeoutError('CTF collector/connect deadline; product outcome is measured separately')

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kw):
            super().__init__(*args, directory=str(ROOT), **kw)
        def log_message(self, *unused):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    signal.signal(signal.SIGALRM, deadline)
    receipt['serverPort'] = server.server_port
    signal.alarm(COLLECTOR_SECONDS)
    end = started + COLLECTOR_SECONDS
    phase('launch')
    try:
        # Guard immediately before starting the driver/browser, not merely when reserving the slot.
        base.assert_slot_clear()
        connected_at = time.monotonic()
        phase('driver-start')
        with sync_playwright() as p:
            phase('chromium-launch')
            if headless:
                browser = p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],timeout=30000)
            else:
                browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=False, timeout=30000,
                    args=['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
                          '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            phase('context-create')
            context = browser.new_context(viewport={'width': 1280, 'height': 800}, color_scheme='dark')
            try:
                phase('page-create')
                page = context.new_page()
                receipt['connectProbeMs'] = (time.monotonic() - connected_at) * 1000
                page.on('pageerror', lambda error: receipt['errors'].append(str(error)))
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

                def sample(label):
                    data = page.evaluate('''() => ({game: window.__wings?.game ?? null,
                      stats: window.__wings?.stats ?? null, perf: window.__wings?.perf ?? null,
                      gate: document.querySelector('#render-error[open] pre')?.textContent ?? null})''')
                    receipt['steps'].append({'label': label, 'elapsedMs': (time.monotonic() - started) * 1000, **data})
                    base.save_receipt(out, receipt)
                    return data

                def shot(name):
                    assert shutil.disk_usage(ROOT).free >= 2178940928
                    page.screenshot(path=str(out / name), timeout=5000)
                    receipt['screenshots'].append(name)
                    base.save_receipt(out, receipt)

                def choose(host, text):
                    page.locator(host + ' .mi .t').get_by_text(text, exact=True).locator('..').click(timeout=5000)
                    receipt['steps'].append({'label': 'clicked ' + text,
                                             'elapsedMs': (time.monotonic() - started) * 1000})
                    base.save_receipt(out, receipt)

                phase('navigation')
                page.goto(origin + '/Games/Wings/?webgl', wait_until='domcontentloaded', timeout=15000)
                phase('ctf-menu')
                choose('#screen', 'Capture the flag')
                vehicle = page.locator('#screen .mi .t').get_by_text('Vehicle', exact=True).locator('..')
                for _ in range(8):
                    if 'speedboat' in vehicle.inner_text().lower():
                        break
                    vehicle.click(timeout=3000)
                    receipt['steps'].append({'label': 'cycled vehicle',
                                             'elapsedMs': (time.monotonic() - started) * 1000})
                    base.save_receipt(out, receipt)
                assert 'speedboat' in vehicle.inner_text().lower()
                phase('ctf-menu-screenshot')
                shot('01-ctf-lobby.png')
                sample('CTF menu with speedboat selected')
                phase('product-gate')
                choose('#screen', 'Start offline')
                sample('immediate post-start observation; not readiness proof')
                page.wait_for_function("document.querySelector('#render-error[open]') || (window.__wings?.perf?.sceneMs > 0 && window.__wings?.stats?.drawCalls > 0)", timeout=remaining_ms(end, 50000))
                state = sample('product readiness observed')
                if state['gate']:
                    receipt['productGate'] = {'status': 'FAILED', 'reason': state['gate']}
                    base.save_receipt(out, receipt)
                    shot('renderer-hold.png')
                    raise RuntimeError(state['gate'])
                receipt['productGate'] = product_result(state['perf'])
                base.save_receipt(out, receipt)
                assert receipt['productGate']['status'] == 'PASSED'
                phase('boat-water')
                page.wait_for_function("window.__wings?.game?.mode === 'ctf' && window.__wings.game.state === 'flying' && window.__wings.game.kind === 'speedboat' && window.__wings.game.modelReady", timeout=10000)
                state = sample('boat spawned through normal CTF picker')
                assert state['game']['hp'] > 0 and abs(state['game']['ownRaw'][1]) < 0.5
                assert len(state['game']['ctf']['flags']) == 2
                shot('03-ctf-boat-water.png')
                before = state['game']['ownRaw']
                page.keyboard.down('w')
                try:
                    page.wait_for_timeout(1200)
                finally:
                    page.keyboard.up('w')
                state = sample('held W then released')
                assert sum((a-b)**2 for a,b in zip(before, state['game']['ownRaw'])) > 0.01
                shot('03-ctf-boat-water.png')
                page.keyboard.down('x')
                try:
                    page.wait_for_function('window.__wings.game.speed <= 2', timeout=4000)
                finally:
                    page.keyboard.up('x')
                phase('ordinary-crew-boarding')
                page.keyboard.press('Escape')
                choose('.pause:not([hidden])', 'Switch role')
                choose('.spawn:not([hidden])', 'Join viper [ai]')
                phase('real-carried-flag')
                page.wait_for_function("(() => { const g=window.__wings?.game; return g?.state === 'flying' && g.kind !== 'speedboat' && g.seat === 1 && g.modelReady && g.ctf?.flags.some(f=>f.carrierId === g.vehicleId) })()", timeout=30000)
                state = sample('real AI-piloted plane carries flag with player crew')
                assert state['game']['hp'] > 0 and state['stats']['drawCalls'] > 0
                assert state['game']['ownRaw'][1] > 2
                shot('02-ctf-airborne-flag.png')
                assert not any(receipt[k] for k in ('errors', 'failedRequests', 'external')), receipt
                receipt['status'] = 'PASS normal UI/boat movement/AI-crew flag artifacts; parent pixel review required'
                phase('cleanup')
            except (Exception, KeyboardInterrupt) as error:
                base.record_failure(out, receipt, error)
                raise
            finally:
                receipt['cleanupPhase'] = 'context-close'
                base.save_receipt(out, receipt)
                context.close()
                receipt['cleanupPhase'] = 'browser-close'
                base.save_receipt(out, receipt)
                browser.close()
    except (Exception, KeyboardInterrupt) as error:
        base.record_failure(out, receipt, error)
    finally:
        receipt['cleanupPhase'] = 'owned-descendants'
        base.save_receipt(out, receipt)
        remaining, errors = base.stop_owned_descendants()
        receipt['remainingOwnedProcesses'] = remaining
        receipt['ownershipCleanupErrors'] = errors
        receipt['browserClosed'] = not remaining and not errors
        base.reap_children()
        server.shutdown()
        server.server_close()
        thread.join(timeout=1)
        receipt['serverClosed'] = not thread.is_alive()
        signal.alarm(0)
        if receipt['browserClosed']:
            shutil.rmtree(temp)
        receipt['profileRemoved'] = not temp.exists()
        if not base.collector_completed(receipt):
            receipt['status'] = 'HOLD'
        base.save_receipt(out, receipt)
    return 0 if base.collector_completed(receipt) else 1


def worker_command(out, headless, attempt_number):
    return [sys.executable, '-B', __file__, '--out', str(out), '--worker',
            '--attempt-number', str(attempt_number)] + (['--headless'] if headless else [])


def supervised(out, headless=False, attempt_number=1):
    base.enable_subreaper()
    child = subprocess.Popen(worker_command(out, headless, attempt_number), start_new_session=True)
    code = 124
    try:
        code = child.wait(timeout=COLLECTOR_SECONDS)
    except (subprocess.TimeoutExpired, KeyboardInterrupt):
        print('EXITED capture incomplete: 50s supervisor/interruption; product result separate', flush=True)
    finally:
        receipt = None
        if (out / 'browser.json').exists():
            receipt = json.loads((out / 'browser.json').read_text())
            assert receipt.get('collectorPID') == child.pid, 'Do not overwrite a prior attempt'
            receipt['supervisorExit'] = code
            receipt['supervisorCleanup'] = 'started'
            if code == 124:
                base.mark_collector_timeout(receipt)
                receipt['status'] = 'HOLD'
                receipt.setdefault('failure', '50s supervisor expired; product outcome unknown unless measured')
            base.save_receipt(out, receipt)  # Persist before any cleanup can stall.
        remaining, errors = base.stop_owned_descendants()
        try:
            child.wait(timeout=1)
        except subprocess.TimeoutExpired:
            errors.append('Collector leader did not exit after owned cleanup')
        base.reap_children()
        if receipt is not None:
            receipt['remainingOwnedProcesses'] = remaining
            receipt['ownershipCleanupErrors'] = receipt.get('ownershipCleanupErrors', []) + errors
            receipt['browserClosed'] = not remaining and not receipt['ownershipCleanupErrors']
            with socket.socket() as sock:
                receipt['serverClosed'] = sock.connect_ex(('127.0.0.1', receipt['serverPort'])) != 0
            temp = ROOT / receipt['tempDirectory']
            assert temp.parent == ROOT / '.tmp' and temp.name.startswith(f'wings-ctf-{child.pid}-')
            if receipt['browserClosed'] and temp.exists():
                try:
                    shutil.rmtree(temp)
                except OSError as error:
                    receipt['ownershipCleanupErrors'].append(str(error))
            receipt['profileRemoved'] = not temp.exists()
            receipt['supervisorCleanup'] = 'finished'
            if not base.receipt_passes(receipt):
                receipt['status'] = 'HOLD'
                receipt.setdefault('failure', 'Incomplete collector/cleanup; product result remains separate')
                code = code or 1
            receipt['supervisorExit'] = code
            base.save_receipt(out, receipt)
    return code


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path)
    parser.add_argument('--worker', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--self-check', action='store_true')
    parser.add_argument('--headless', action='store_true', help='Use the authorized system-Chromium SwiftShader launcher')
    parser.add_argument('--attempt-number', type=int, default=1)
    args = parser.parse_args()
    assert args.attempt_number > 0
    if args.self_check:
        command = worker_command(Path('fixture'), True, 2)
        assert command[-3:] == ['--attempt-number', '2', '--headless']
        assert '--headless' not in worker_command(Path('fixture'), False, 1)
        assert COLLECTOR_SECONDS == 50
        assert remaining_ms(time.monotonic() + 60, 30000) == 30000
        assert 0 < remaining_ms(time.monotonic() + 1, 50000) <= 1000
        try:
            remaining_ms(time.monotonic() - 1, 50000)
            raise AssertionError('expired collector deadline accepted')
        except TimeoutError:
            pass
        assert product_result({'workerStartMs':1,'workerReadyMs':27001,'worldMs':46001})['status'] == 'PASSED'
        assert product_result({'workerStartMs':1,'workerReadyMs':30002,'worldMs':30003})['status'] == 'FAILED'
        assert product_result({'workerStartMs':1,'workerReadyMs':2,'worldMs':20003})['status'] == 'FAILED'
        refused = False
        try:
            product_result({})
        except ValueError:
            refused = True
        assert refused, 'missing receipt passed'
        base.self_check()
        print('PASS CTF timing verdict self-check; no browser started')
    else:
        assert args.out is not None
        out = args.out.resolve()
        assert out.is_relative_to(ROOT)
        raise SystemExit(worker(out, args.headless, args.attempt_number) if args.worker
                         else supervised(out, args.headless, args.attempt_number))
