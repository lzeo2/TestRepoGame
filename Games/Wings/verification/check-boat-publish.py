#!/usr/bin/env python3
"""Real system-Chromium menu/boat capture. No state grants or renderer overrides."""
import argparse
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--internal-worker', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()
    out = args.out.resolve()
    assert out.is_relative_to(ROOT), 'Evidence must stay in the repository'
    assert shutil.disk_usage(ROOT).free >= 2178940928, 'Disk guard reached'
    # Shared-host gate: refuse an existing browser or Playwright driver, never kill one.
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        try:
            command = (proc / 'cmdline').read_bytes().split(b'\0')
        except OSError:
            continue
        if command and (command[0] == b'/usr/lib/chromium/chromium' or
                        (any(b'playwright/driver' in a for a in command) and b'run-driver' in command)):
            raise RuntimeError(f'Browser slot occupied by PID {proc.name}')
    out.mkdir(parents=True, exist_ok=True)
    profile = ROOT / '.tmp' / f'wings-boat-publish-profile-{os.getpid()}'
    assert not profile.exists(), 'Use a fresh dedicated profile'
    receipt = {'status': 'HOLD', 'normalInputOnly': True, 'steps': [],
               'errors': [], 'warnings': [], 'failedRequests': [], 'external': []}

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(ROOT), **kw)

        def log_message(self, *unused):
            pass

    def deadline(*unused):
        raise TimeoutError('45-second collector deadline; external cleanup reserve 15 seconds')

    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(45)
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch_persistent_context(user_data_dir=str(profile),
                executable_path='/usr/bin/chromium', headless=True, timeout=10000,
                viewport={'width': 1280, 'height': 720}, color_scheme='dark',
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                page = browser.new_page()
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
                    item = page.locator('#screen .mi .t').get_by_text(label, exact=True).locator('..')
                    item.click()

                def shot(name):
                    assert shutil.disk_usage(ROOT).free >= 2178940928
                    page.screenshot(path=str(out / name), timeout=7000)
                    receipt.setdefault('screenshots', []).append(name)

                def sample(label):
                    state = page.evaluate('''() => ({game: window.__wings?.game ?? null,
                        stats: window.__wings?.stats ?? null,
                        gate: document.querySelector('#render-error[open] pre')?.textContent ?? null})''')
                    receipt['steps'].append({'label': label, **state})
                    return state

                page.goto(origin + '/Games/Wings/?webgl', wait_until='load')
                choose('Settings')
                graphics = page.get_by_role('button', name='Graphics', exact=False)
                for _ in range(3):
                    if 'low' in graphics.inner_text().lower():
                        break
                    graphics.click()
                assert 'low' in graphics.inner_text().lower()
                page.keyboard.press('Escape')
                patrol = page.locator('#screen .mi .t').get_by_text('Speedboat patrol', exact=True).locator('..')
                patrol.hover()
                shot('01-boat-lobby.png')
                patrol.click()
                page.wait_for_function("document.querySelector('#render-error[open]') || window.__wings?.game?.state === 'flying'", timeout=35000)
                state = sample('normal lobby launch')
                if state['gate'] or not state['game']:
                    shot('02-renderer-hold.png')
                    raise RuntimeError(state['gate'] or 'No live game session')
                assert state['game']['kind'] == 'speedboat', state
                before = state['game']['ownRaw']
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
            finally:
                browser.close()
                receipt['browserClosed'] = True
    except Exception as error:
        receipt['failure'] = str(error)
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        with socket.socket() as sock:
            receipt['serverClosed'] = sock.connect_ex(('127.0.0.1', server.server_port)) != 0
        signal.alarm(0)
        if receipt.get('browserClosed') and profile.exists():
            shutil.rmtree(profile)
        receipt['profileRemoved'] = not profile.exists()
        receipt['modelSHA256'] = hashlib.sha256((ROOT / 'Games/Wings/models/speedboat.glb').read_bytes()).hexdigest()
        (out / 'browser.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(receipt['status'])
    if receipt.get('failure'):
        print(receipt['failure'])
    return 0 if receipt['status'].startswith('PASS') else 1


def supervised():
    # Playwright close can hang after a deadline. Supervise the worker independently.
    worker = subprocess.Popen([sys.executable, '-B', __file__, *sys.argv[1:], '--internal-worker'],
                              start_new_session=True)
    marker = f'--user-data-dir={ROOT / ".tmp" / f"wings-boat-publish-profile-{worker.pid}"}'
    def owned_browsers():
        rows = subprocess.check_output(['ps', '-eo', 'pid=,args='], text=True).splitlines()
        found = []
        for row in rows:
            fields = row.split()
            if len(fields) > 1 and fields[1] == '/usr/lib/chromium/chromium' and marker in fields[2:]:
                found.append(int(fields[0]))
        return found
    code = 124
    try:
        code = worker.wait(timeout=55)
    except (subprocess.TimeoutExpired, KeyboardInterrupt):
        print('HOLD: worker interrupted or exceeded 55 seconds; stopping only owned resources', flush=True)
    finally:
        if worker.poll() is None:
            try:
                os.killpg(worker.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                worker.wait(timeout=1)
            except subprocess.TimeoutExpired:
                os.killpg(worker.pid, signal.SIGKILL)
                worker.wait(timeout=1)
        for sig in (signal.SIGTERM, signal.SIGKILL):
            for pid in owned_browsers():
                try:
                    os.kill(pid, sig)
                except ProcessLookupError:
                    pass
            time.sleep(0.2)
        remaining = owned_browsers()
        print(f'Owned dedicated-profile browsers remaining: {remaining}', flush=True)
        if remaining:
            code = 1
    return code


if __name__ == '__main__':
    raise SystemExit(main() if '--internal-worker' in sys.argv else supervised())
