#!/usr/bin/env python3
"""Bounded normal-input developer-entry regression; software WebGL only."""
import argparse
from contextlib import ExitStack
import functools
import http.server
import json
from pathlib import Path
import re
import signal
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUDGET = 180
CODE = 'alopsd'
LIMIT = 1_000_000_000


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path,
                        help='Fresh or empty evidence directory outside the repository.')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be a fresh or empty directory')
    output.mkdir(parents=True, exist_ok=True)
    source = (ROOT / 'Games/Capital Drive/script.js').read_text()
    career_key = re.search(r"const CAREER_KEY = '([^']+)';", source).group(1)
    started = time.monotonic()
    checks, errors, requests, external = [], [], [], []
    failure = None
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def deadline(signum, frame):
        raise TimeoutError(f'Developer-entry browser run exceeded {BUDGET} seconds')

    previous_alarm = signal.signal(signal.SIGALRM, deadline)
    signal.alarm(BUDGET)

    def check(value, label):
        assert value, label
        checks.append(label)

    def snap(page):
        return page.evaluate('capitalDriveSnapshot()')

    def saved(page):
        return page.evaluate('(key)=>localStorage.getItem(key)', career_key)

    def ready(context):
        page = context.new_page()
        page.set_default_timeout(12000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        page.on('response', lambda response: requests.append(f'{response.status} {response.url}')
                if response.status >= 400 else None)
        page.on('request', lambda request: external.append(request.url)
                if urlsplit(request.url).scheme in ('http', 'https') and
                urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        page.route('**/*', lambda route: route.continue_()
                   if urlsplit(route.request.url).scheme not in ('http', 'https') or
                   urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
        page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=45000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
        check(not snap(page)['rendering']['compatibility'], 'Software WebGL available')
        return page

    def start(page, mode):
        page.locator(f'[data-game-mode="{mode}"]').click()
        page.locator('#start-button').click()
        page.wait_for_function('(mode)=>capitalDriveSnapshot().started && capitalDriveSnapshot().gameMode===mode', arg=mode)

    def pause(page):
        page.locator('#pause-button').click()
        check(page.locator('#pause-dialog').is_visible() and snap(page)['paused'], 'Pause opens and stops gameplay')

    def reset_entry(page):
        return (not page.locator('#dev-code-section').evaluate('(element)=>element.open') and
                page.locator('#dev-code-input').input_value() == '' and
                page.locator('#dev-code-status').inner_text() == '')

    def submit(page, value):
        page.locator('#dev-code-input').fill(value)
        page.locator('#dev-code-form button[type=submit]').click()

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            # LIFO: contexts and browser close before the Playwright manager exits.
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            stack.callback(context.close)
            page = ready(context)
            start(page, 'street')
            check(snap(page)['career']['cash'] == 1000 and saved(page) is None, 'Fresh Street Life starts with the normal wallet and no career save')
            pause(page)
            check(reset_entry(page), 'Developer entry is collapsed and empty by default')
            check(CODE not in page.locator('body').inner_text().lower(), 'Rendered text does not reveal the developer input')
            page.locator('#dev-code-section summary').click()
            check(page.locator('#dev-code-input').get_attribute('type') == 'password', 'Developer input is masked')
            before, before_save = snap(page), saved(page)
            page.locator('#dev-code-input').press_sequentially('wasd invalid', delay=80)
            page.wait_for_timeout(200)
            after = snap(page)
            check(after['paused'] and all(after['player'][key] == before['player'][key] for key in ('x', 'z', 'yaw', 'speed')) and
                  after['focus'] == before['focus'], 'Typing movement keys leaves the paused player stationary')
            page.locator('#dev-code-form button[type=submit]').click()
            check(snap(page)['career'] == before['career'] and saved(page) == before_save, 'Invalid input preserves the wallet and existing save bytes')
            check(page.locator('#dev-code-status').inner_text() == 'Code not recognised.' and
                  page.locator('#dev-code-input').input_value() == '', 'Invalid input reports failure and clears the field')
            submit(page, CODE)
            credited = snap(page)['career']
            check(credited['cash'] == LIMIT and page.locator('#cash-value').inner_text() == '$1,000,000,000', 'Actual form updates the wallet to the supported cash limit')
            check(json.loads(saved(page)) == {**credited, 'campaign': {'version': 1, 'completed': before['campaign']['completed']}},
                  'Actual form persists career and campaign through the existing storage key')
            check({key: value for key, value in credited.items() if key != 'cash'} ==
                  {key: value for key, value in before['career'].items() if key != 'cash'}, 'Credit preserves garage, completed missions and all other career fields')
            check(page.locator('#dev-code-input').input_value() == '' and
                  page.locator('#dev-code-status').inner_text() == 'Applied.', 'Successful submission clears input and reports success')
            credited_save = saved(page)
            submit(page, CODE)
            check(snap(page)['career'] == credited and saved(page) == credited_save, 'Repeated submission is idempotent in memory and storage')
            page.locator('#dev-code-input').fill('unfinished')
            page.locator('#resume-button').click()
            page.wait_for_function('!capitalDriveSnapshot().paused')
            pause(page)
            check(reset_entry(page), 'Resume and reopen collapse the entry and clear its input and feedback')
            page.reload(wait_until='load', timeout=45000)
            page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
            start(page, 'street')
            check(snap(page)['career'] == credited and snap(page)['campaign']['completed'] == before['campaign']['completed'] and
                  saved(page) == credited_save, 'Same-context reload preserves credited wallet, garage and completed missions')
            pause(page)
            page.locator('#change-mode-button').click()
            start(page, 'free')
            pause(page)
            check(page.locator('#dev-code-section').is_hidden(), 'Normal Change mode path hides developer entry in Free Roam')
            check(snap(page)['career'] == credited and saved(page) == credited_save, 'Entering Free Roam preserves the banked career unchanged')
            # A separate fresh context makes an accidental sandbox credit observable below the cap.
            fresh = browser.new_context(viewport={'width': 1280, 'height': 800})
            stack.callback(fresh.close)
            free_page = ready(fresh)
            start(free_page, 'free')
            pause(free_page)
            free_page.wait_for_timeout(200)
            check(free_page.locator('#dev-code-section').is_hidden() and snap(free_page)['career']['cash'] == 1000 and
                  saved(free_page) is None, 'Fresh Free Roam has no visible entry and banks no developer credit')
            check(not errors, 'No page or console errors')
            check(not requests, 'No failed requests or HTTP errors')
            check(not external, 'No external runtime requests attempted')
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_alarm)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks,
                  'errors': errors, 'requests': requests, 'external': external,
                  'elapsedSeconds': round(time.monotonic() - started, 2), 'screenshots': [],
                  'limitations': ['Software WebGL only; native/N100 performance unmeasured.',
                                  'Fresh career preserves its default garage and empty completed-mission list; no positive mission grant.']}
        # Browser exceptions can include attempted input values; never publish those values.
        rendered = json.dumps(report, indent=2).replace(CODE, '[redacted]') + '\n'
        (output / 'results.json').write_text(rendered)
        print(rendered, end='', flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
