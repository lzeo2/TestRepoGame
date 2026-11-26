#!/usr/bin/env python3
"""Exercise literal roster labels and the existing hover/remove controls locally."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main():
    root = Path(__file__).resolve().parent.parent
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=root))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
            try:
                page = browser.new_page()
                page.set_default_timeout(8000)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(f'http://127.0.0.1:{server.server_port}/Games/AchtungDieKurve/')
                name = 'Willow <Blue> & River'
                for value in [name, 'Casey']:
                    page.locator('#playerNameInput').fill(value)
                    page.locator('#addPlayerButton').click()
                rows = page.locator('#playerList li')
                assert rows.count() == 2
                row = rows.filter(has_text=name)
                assert row.count() == 1 and row.locator(':scope > *').count() == 1
                assert '0 points' in row.inner_text()
                row.hover()
                row.get_by_text('Remove', exact=True).click()
                assert rows.count() == 1 and 'Casey' in rows.first.inner_text(), (rows.all_inner_texts(), errors)
                assert not page.locator('#startGame').is_visible()
                page.locator('#playerNameInput').fill('New rider')
                page.locator('#addPlayerButton').click()
                assert rows.count() == 2 and rows.filter(has_text='New rider').count() == 1
                assert page.locator('#startGame').is_visible()
                assert not errors, errors
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print('PASS literal rider name, score, two-player roster and native Remove with zero page errors.')


if __name__ == '__main__':
    main()
