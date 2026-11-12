"""Optional single bounded UI pass; no fixture injection, downloads or full-fleet run.

python3 -B Games/StealBasketballer/tests/browser.py
Use --artifacts docs/steal-basketballer-design to retain the two captures for review.
Requires an already installed Playwright and system Chromium. Never installs either.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import subprocess
from threading import Thread
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[3]
FLOOR = 2147483648


def disk_guard():
    free = shutil.disk_usage(ROOT).free
    if free < FLOOR:
        raise RuntimeError(f"Disk guard: {free} bytes free; need >= {FLOOR}; no launch")
    return free


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8935)
    parser.add_argument('--artifacts', default='.tmp/steal-basketballer-browser')
    args = parser.parse_args()
    if not 8900 <= args.port <= 65535:
        parser.error('port must be between 8900 and 65535')
    disk_guard()
    if not Path('/usr/bin/chromium').is_file():
        raise RuntimeError('System /usr/bin/chromium is required; no browser downloads')
    if subprocess.run(['pgrep', '-f', 'chrome-linux/chrome'], capture_output=True).returncode == 0:
        raise RuntimeError('Shared browser slot occupied; do not launch concurrently')
    from playwright.sync_api import sync_playwright

    artifacts = ROOT / args.artifacts
    artifacts.mkdir(parents=True, exist_ok=True)
    errors, failed, external = [], [], []
    server = None
    thread = None
    browser = None
    base = f'http://127.0.0.1:{args.port}'
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(QuietHandler, directory=str(ROOT)))
        server.daemon_threads = True
        thread = Thread(target=server.serve_forever, daemon=True)
        thread.start()
        with sync_playwright() as playwright:
            try:
                before = disk_guard()
                browser = playwright.chromium.launch(
                    executable_path='/usr/bin/chromium', headless=True, timeout=15000,
                    args=['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
                )

                def attach(page):
                    page.set_default_timeout(10000)
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                    page.on('response', lambda response: failed.append(f'{response.status} {response.url}') if response.status >= 400 else None)

                def local_only(route):
                    url = route.request.url
                    if urlsplit(url).scheme in ('http', 'https') and not url.startswith(base + '/'):
                        external.append(url)
                        route.abort()
                    else:
                        route.continue_()

                def start(page):
                    attach(page)
                    page.goto(base + '/Games/StealBasketballer/', wait_until='load', timeout=15000)
                    page.wait_for_function('typeof window.basketballerSnapshot === "function" && !document.getElementById("start").disabled')
                    assert 'basketballer' in page.title().lower(), 'Basketball title required'
                    page.locator('#start').click()
                    page.wait_for_function('window.basketballerSnapshot().started')

                desktop = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce', service_workers='block')
                desktop.route('**/*', local_only)
                page = desktop.new_page()
                start(page)
                page.locator('[data-panel="collection"]').click()
                page.wait_for_function('document.querySelectorAll("#album-grid > .card").length === 100')
                assert len(set(page.locator('#album-grid h3').all_text_contents())) == 100, '100 distinct album names'
                page.locator('#close-sheet').click()
                # Natural purchase, not a rich fixture or developer grant, unlocks the battle.
                page.locator('[data-panel="shop"]').click()
                page.locator('[data-action="openMarket"]').click()
                page.locator('[data-action="buy"]').first.click()
                page.wait_for_function('window.basketballerSnapshot().state.roster.length === 1')
                page.locator('#close-sheet').click()
                page.locator('#battle').click()
                page.wait_for_function('''() => {
                    const m = window.basketballerSnapshot().match;
                    return m && m.players.length === 10 && Number.isFinite(m.shotClock) && m.shotClock > 0 && m.shotClock < 24;
                }''')
                match = page.evaluate('window.basketballerSnapshot().match')
                assert [sum(p['side'] == side for p in match['players']) for side in (0, 1)] == [5, 5]
                disk_guard()
                page.screenshot(path=str(artifacts / 'desktop-match.png'), timeout=10000)
                desktop.close()

                phone = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, device_scale_factor=1, reduced_motion='reduce', service_workers='block')
                phone.route('**/*', local_only)
                page = phone.new_page()
                start(page)
                assert page.locator('#joystick').is_visible(), 'Phone touch controls'
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'No phone overflow'
                disk_guard()
                page.screenshot(path=str(artifacts / 'phone-world.png'), timeout=10000)
                phone.close()
                assert not errors and not failed and not external, json.dumps({'pageErrors': errors, 'failed': failed, 'external': external})
                print(f'PASS browser: start, 100 album names, natural recruit, 5v5 shotClock={match["shotClock"]}, phone controls; 2 screenshots; disk before={before} after={shutil.disk_usage(ROOT).free}')
            finally:
                if browser is not None:
                    browser.close()
    finally:
        if server is not None:
            server.shutdown()
            server.server_close()
        if thread is not None:
            thread.join(timeout=2)
        print(json.dumps({'pageErrors': errors, 'failedRequests': failed, 'externalRequests': external}), flush=True)


if __name__ == '__main__':
    main()
