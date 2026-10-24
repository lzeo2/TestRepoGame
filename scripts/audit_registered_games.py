#!/usr/bin/env python3
"""Sparse-safe targeted audit support, not a fleet smoke/release gate.

Import visit(game) for one serialized, network-denied browser visit. Callers
must exercise real controls and distinguish observed play from load-only proof.
Run --self-test for the Git URL boundary check. No downloads or checkouts.
"""
import contextlib
import fcntl
import hashlib
import json
import mimetypes
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
FLOOR = 2 * 1024**3
LOCK = Path(tempfile.gettempdir()) / 'testrepogame-browser-audit.lock'


def tracked_files():
    result = {}
    for row in subprocess.check_output(['git', 'ls-tree', '-rz', 'HEAD'], cwd=ROOT).split(b'\0'):
        if row:
            meta, path = row.split(b'\t', 1)
            mode, kind, oid = meta.split()
            if kind == b'blob' and mode != b'120000':
                result[os.fsdecode(path)] = oid.decode()
    return result


def request_path(url):
    path = unquote(urlsplit(url).path).lstrip('/')
    if '\\' in path or '\x00' in path or any(p in ('.', '..') for p in path.split('/')):
        return None
    return path + 'index.html' if not path or path.endswith('/') else path


def storage_snapshot(page):
    """Record persistent key identities and value hashes, never personal save data."""
    data = page.evaluate("""() => {
        const result = {localStorage: {}, sessionStorage: {}, errors: []};
        for (const name of ['localStorage', 'sessionStorage']) {
            try {
                const store = window[name];
                for (let i = 0; i < store.length; i++) {
                    const key = store.key(i);
                    result[name][key] = store.getItem(key);
                }
            } catch (error) { result.errors.push(name + ': ' + error.message); }
        }
        return result;
    }""")
    for name in ('localStorage', 'sessionStorage'):
        data[name] = {key: {'sha256': hashlib.sha256(value.encode()).hexdigest(),
                            'length': len(value)} for key, value in data[name].items()}
    data['cookies'] = [{key: cookie[key] for key in ('name', 'path', 'expires', 'httpOnly', 'secure')}
                       | {'sha256': hashlib.sha256(cookie['value'].encode()).hexdigest()}
                       for cookie in page.context.cookies()]
    return data


def handler(files):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_GET(self):
            path = request_path(self.path)
            if path not in files:
                self.send_error(404)
                return
            local = ROOT / path
            # Existing authored edits remain visible, as with a normal dev server.
            # Sparse-excluded blobs are streamed from Git, never checked out.
            if local.is_file() and not local.is_symlink():
                stream = local.open('rb')
                size = local.stat().st_size
                proc = None
            else:
                oid = files[path]
                size = int(subprocess.check_output(['git', 'cat-file', '-s', oid], cwd=ROOT))
                proc = subprocess.Popen(['git', 'cat-file', 'blob', oid], cwd=ROOT, stdout=subprocess.PIPE)
                stream = proc.stdout
            try:
                self.send_response(200)
                mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
                if path.endswith(('.js', '.mjs')):
                    mime = 'text/javascript'
                elif path.endswith('.wasm'):
                    mime = 'application/wasm'
                self.send_header('Content-Type', mime)
                self.send_header('Content-Length', str(size))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                shutil.copyfileobj(stream, self.wfile, 64 * 1024)
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                stream.close()
                if proc:
                    proc.wait()
    return Handler


@contextlib.contextmanager
def visit(game, wait_ms=5000):
    """Yield (page, evidence); keep evidence even if caller interaction fails.

    The lock covers the entire browser lifetime. All diagnostics are retained;
    denied external requests are findings, not filtered passing requests.
    """
    from playwright.sync_api import sync_playwright
    evidence = {'id': game['id'], 'title': game['title'], 'url': game['url'],
                'console_errors': [], 'page_errors': [], 'http_errors': [],
                'failed_requests': [], 'external_requests': [], 'actions': []}
    with LOCK.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if shutil.disk_usage(ROOT).free < FLOOR:
            raise RuntimeError('Disk below 2 GiB: stop growth and ask operator.')
        files = tracked_files()
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler(files))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f'http://127.0.0.1:{server.server_port}'
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                    args=['--no-sandbox', '--disable-dev-shm-usage'])
                try:
                    context = browser.new_context(viewport={'width': 960, 'height': 640}, service_workers='block')
                    def route(request):
                        if urlsplit(request.request.url).scheme in ('http', 'https') and not request.request.url.startswith(origin + '/'):
                            evidence['external_requests'].append(request.request.url)
                            request.abort()
                        else:
                            request.continue_()
                    context.route('**/*', route)
                    page = context.new_page()
                    page.on('console', lambda msg: evidence['console_errors'].append(msg.text) if msg.type == 'error' else None)
                    page.on('pageerror', lambda error: evidence['page_errors'].append(str(error)))
                    page.on('response', lambda response: evidence['http_errors'].append({'status': response.status, 'url': response.url.replace(origin, '')}) if response.status >= 400 else None)
                    page.on('requestfailed', lambda request: evidence['failed_requests'].append({'url': request.url.replace(origin, ''), 'failure': request.failure}))
                    try:
                        response = page.goto(origin + '/' + game['url'], wait_until='domcontentloaded', timeout=30000)
                        evidence['entry_status'] = response.status if response else None
                        page.wait_for_timeout(wait_ms)
                        evidence['before'] = page.locator('body').inner_text(timeout=3000)[:8000]
                        evidence['initial_storage'] = storage_snapshot(page)
                        yield page, evidence
                    finally:
                        if not page.is_closed():
                            try:
                                evidence['after'] = page.locator('body').inner_text(timeout=3000)[:8000]
                                evidence['canvas_count'] = page.locator('canvas').count()
                                evidence['final_storage'] = storage_snapshot(page)
                            except Exception as error:
                                evidence['capture_error'] = str(error)
                finally:
                    browser.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)


def self_test():
    assert request_path('/Games/A%20B/index.html?x=1') == 'Games/A B/index.html'
    assert request_path('/Games/A/') == 'Games/A/index.html'
    for url in ('/Games/../secret', '/Games/%2e%2e/secret', '/Games/A%5cB', '/%00'):
        assert request_path(url) is None, url
    files = tracked_files()
    games = json.loads((ROOT / 'games.json').read_text())
    assert len({g['id'] for g in games}) == len(games)
    assert all(g['url'] in files for g in games)
    print(f'PASS: URL boundary and {len(games)} Git-backed catalog entries')


if __name__ == '__main__':
    if sys.argv[1:] != ['--self-test']:
        raise SystemExit('Use --self-test, or import visit(game) for a targeted audit.')
    self_test()
