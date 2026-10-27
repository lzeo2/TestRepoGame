#!/usr/bin/env python3
"""Bounded loopback-only server for the ignored Wings local build; no asset copying."""
import argparse
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import mimetypes
from pathlib import Path
import threading
import time
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BUILD = ROOT / '.tmp/wings-livebug-fixed-62412ef5'


@contextmanager
def local_server(build=DEFAULT_BUILD, port=0):
    build = Path(build).resolve()
    assert build.is_relative_to(ROOT / '.tmp') and (build / 'index.html').is_file(), 'Use an existing ignored local build'

    class Handler(BaseHTTPRequestHandler):
        def do_HEAD(self):
            self.send_file(False)

        def do_GET(self):
            self.send_file(True)

        def send_file(self, body):
            path = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
            if '\\' in path or '..' in Path(path).parts:
                self.send_error(404)
                return
            base = ROOT / 'Games/Wings' if path.startswith(('models/', 'fonts/')) else build
            target = (base / path).resolve()
            if not target.is_relative_to(base) or not target.is_file():
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(target)[0] or 'application/octet-stream')
            self.send_header('Content-Length', str(target.stat().st_size))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            if body:
                with target.open('rb') as source:
                    while chunk := source.read(65536):
                        self.wfile.write(chunk)

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', type=Path, default=DEFAULT_BUILD)
    parser.add_argument('--port', type=int, default=8787)
    parser.add_argument('--seconds', type=int, default=180)
    args = parser.parse_args()
    assert 1 <= args.seconds <= 600, 'Local server lifetime must be 1..600 seconds'
    with local_server(args.build, args.port) as url:
        print(f'Local Wings entry: {url}/index.html (closes in {args.seconds}s)', flush=True)
        time.sleep(args.seconds)
