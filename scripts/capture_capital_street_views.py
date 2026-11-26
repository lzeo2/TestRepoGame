"""Capture reproducible street-level Capital Drive geometry with local Chromium."""
import argparse
import io
import json
import shutil
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *args):
        pass


def main():
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--chromium', default=shutil.which('chromium'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    http = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(root)))
    threading.Thread(target=http.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path=args.chromium, args=[
                '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'])
            page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
            failures = []
            page.on('pageerror', lambda error: (failures.append(str(error)), print(str(error), flush=True)))
            page.goto(f'http://127.0.0.1:{http.server_port}/scripts/capital-street-preview.html', wait_until='domcontentloaded')
            page.wait_for_function("typeof window.captureCapitalStreet === 'function'", timeout=180_000)
            for shot in ('parliament', 'manuka'):
                stats = page.evaluate('name => window.captureCapitalStreet(name)', shot)
                if min(stats['world'][key] for key in ('buildings', 'roadSegments', 'trees', 'chunks')) <= 0:
                    raise RuntimeError(f'Missing geographic geometry in {shot}')
                capture = page.locator('canvas').screenshot(timeout=60_000)
                with Image.open(io.BytesIO(capture)) as frame:
                    frame.convert('RGB').save(args.output / f'{shot}-street.webp', quality=90, method=6)
                print(json.dumps(stats), flush=True)
            if failures:
                raise RuntimeError(failures)
            browser.close()
    finally:
        http.shutdown()
        http.server_close()


if __name__ == '__main__':
    main()
