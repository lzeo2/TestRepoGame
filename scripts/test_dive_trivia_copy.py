#!/usr/bin/env python3
"""Guarded copy/receipt QA: python3 -B scripts/test_dive_trivia_copy.py.

Default dark and selectable light, <=100s including cleanup. Add --dark-default
for cache-cold/JS-disabled first-paint and midgame theme proof (<=120s total).
Fresh system-Chromium profile, no external requests or game-state grants.
"""
import argparse
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import signal
import subprocess
import tempfile
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/maintenance/audits/kirrlion-art-20261022/copy-pass'
POINTS = [10, 15, 30, 60, 85, 100]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def require_slot():
    processes = subprocess.check_output(['ps', '-eo', 'comm=,args='], text=True)
    if any(line.lstrip().startswith(('chromium ', 'chrome ')) and '--type=' not in line
           and '--remote-debugging' in line for line in processes.splitlines()):
        raise SystemExit('BLOCKED: another Chromium owns the shared slot')
    print('PASS process preflight: no foreign Chromium/Chrome root', flush=True)


def main():
    global OUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dark-default', action='store_true')
    args = parser.parse_args()
    if args.dark_default:
        OUT = OUT.parent / 'dark-default'
    require_slot()
    free = int(subprocess.check_output(['df', '-B1', '/', '--output=avail'], text=True).splitlines()[-1])
    if free < 2147483648:
        raise SystemExit('BLOCKED: disk below 2 GiB')
    OUT.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    errors, external = [], []
    report = {'passed': False, 'checks': [], 'screenshots': [],
              'themes': ['abyss-dark-default', 'accessibility-light'],
              'battle': 'BLOCKED: phase 2 is not implemented; no Battle screen fabricated',
              'source_sha256': {name: hashlib.sha256((ROOT / 'Games/Dive Trivia' / name).read_bytes()).hexdigest()
                                for name in ('index.html', 'script.js', 'style.css', 'core.js', 'questions.js')}}
    server = ThreadingHTTPServer(('127.0.0.1', 8919), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = 'http://127.0.0.1:8919'

    def bounded(*_args):
        raise TimeoutError('Work limit reached; 10s reserved for cleanup')

    def passed(label):
        report['checks'].append(label)
        print('PASS ' + label, flush=True)

    def route(req):
        if req.request.url.startswith(origin + '/'):
            req.continue_()
        else:
            external.append(req.request.url)
            req.abort()

    def capture(page, name, selector=None):
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not page.evaluate('''() => [...document.querySelectorAll('.workbench *')].some(e =>
            e.checkVisibility() && e.clientWidth && !e.matches('input,select') && e.scrollWidth > e.clientWidth + 1)''')
        if selector:
            page.locator(selector).evaluate('e => e.scrollIntoView({block:"start"})')
        else:
            page.evaluate('window.scrollTo(0,0)')
        page.screenshot(path=str(OUT / (name + '.png')), animations='disabled')
        report['screenshots'].append(name + '.png')

    def start(page):
        page.locator('#start-number').click()
        return page.evaluate("DiveCore.selectPrompts(DiveQuestions, {mode:'numbered',key:'1'})")

    def complete(page, prompts, mode, label=None):
        total, best, best_points = 0, None, -1
        for i, prompt in enumerate(prompts):
            assert page.locator('#question').text_content() == prompt['text']
            assert page.locator('#timer').is_visible()
            assert page.locator('#answer').is_visible()
            if label and i == 0:
                capture(page, label + '-question', '#game' if 'mobile' in label else None)
            if args.dark_default and label == 'desktop-dark' and i == 3:
                assert page.locator('#depth').text_content() != '0'
                capture(page, 'desktop-dark-midgame')
                page.locator('#theme').click()
                capture(page, 'desktop-light-midgame')
                page.locator('#theme').click()
            if mode == 'pass':
                page.locator('#pass').click()
            else:
                tier = i % 6 if mode == 'tiers' else 5
                pick = next(g for g in prompt['groups'] if g['tier'] == tier)['answers'][0]['text']
                page.locator('#answer').fill(pick)
                page.locator('#answer').press('Enter')
                total += POINTS[tier]
                if POINTS[tier] > best_points:
                    best, best_points = pick, POINTS[tier]
                assert page.locator('#result-title').text_content() == pick
                assert page.locator('#result-copy').text_content() == f'Depth: {total * 10:,} m'
            assert page.locator('#depth').text_content() == f'{total * 10:,}'
            page.locator('#next').click()
        assert page.locator('#finish').is_visible()
        assert page.locator('#finish-total').text_content() == f'{total * 10:,} metres'
        expected = f'Best find: {best} · {best_points} pts' if best else 'Best find: none'
        assert page.locator('#finish-caption').text_content() == expected
        assert page.locator('#results').count() == 0
        assert page.locator('#save-status').text_content() == ''
        if label:
            capture(page, label + '-receipt', '#finish' if 'mobile' in label else None)
        if args.dark_default and label == 'desktop-dark':
            page.locator('#theme').click()
            capture(page, 'desktop-light-results')
            page.locator('#theme').click()
        page.locator('#home').click()
        return total

    signal.signal(signal.SIGALRM, bounded)
    signal.alarm(110 if args.dark_default else 90)
    try:
        with tempfile.TemporaryDirectory(prefix='trivia-copy-') as profile, sync_playwright() as pw:
            require_slot()
            context = pw.chromium.launch_persistent_context(user_data_dir=profile,
                executable_path='/usr/bin/chromium', headless=True, viewport={'width': 1366, 'height': 1000},
                color_scheme='light', service_workers='block')
            try:
                if args.dark_default:
                    first = context.browser.new_context(java_script_enabled=False, color_scheme='light',
                        viewport={'width': 1366, 'height': 1000}, service_workers='block')
                    first.route('**/*', route)
                    first_page = first.new_page()
                    first_page.goto(origin + '/Games/Dive%20Trivia/index.html', timeout=20000)
                    assert first_page.locator('body').get_attribute('class') == 'dark'
                    assert first_page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(5, 9, 20)'
                    assert first_page.evaluate("getComputedStyle(document.documentElement).backgroundColor") == 'rgb(5, 9, 20)'
                    capture(first_page, 'cache-cold-controller-disabled-dark')
                    first.close()
                    passed('dark HTML/CSS first paint even with controller disabled and OS light preference')
                context.route('**/*', route)
                page = context.new_page()
                page.set_default_timeout(8000)
                page.set_default_navigation_timeout(20000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                cdp = context.new_cdp_session(page)
                cdp.send('Network.enable')
                cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
                page.goto(origin + '/Games/Dive%20Trivia/index.html')
                assert page.locator('body').get_attribute('class') == 'dark'
                assert page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(5, 9, 20)'
                assert not page.locator('.how').evaluate('e => e.open')
                assert page.locator('.intro').text_content() == 'Find a rarer answer.'
                assert page.locator('.rules-summary b').all_text_contents() == ['25 s', '7,000 m']
                assert all(chip.endswith('pts') for chip in page.locator('.tier-chip').all_text_contents())
                capture(page, 'desktop-dark-launch')
                if args.dark_default:
                    page.locator('#theme').click()
                    assert page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(237, 242, 248)'
                    capture(page, 'desktop-light-intro')
                    page.locator('#theme').click()
                prompts = start(page)
                complete(page, prompts, 'tiers', 'desktop-dark')
                passed('trimmed launch; seven untouched prompts/tiers; total depth and highest-point best find')
                page.locator('#theme').click()
                assert page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(237, 242, 248)'
                capture(page, 'desktop-light-launch')
                prompts = start(page)
                complete(page, prompts, 'top', 'desktop-light')
                passed('selectable light desktop; equal-point best-find ties retain first answer')
                if args.dark_default:
                    page.reload()
                    assert page.locator('body').get_attribute('class') == 'light'
                    page.evaluate("localStorage.removeItem('dive-trivia:color-theme'); localStorage.setItem('dive-trivia:theme', 'light')")
                    page.reload()
                    assert page.locator('body').get_attribute('class') == 'dark'
                    page.locator('#theme').click()
                    passed('explicit light preference persists; legacy glow-only light value does not opt into light colors')
                page.set_viewport_size({'width': 390, 'height': 844})
                page.locator('#theme').click()
                capture(page, 'mobile-390-launch', '#launch')
                assert page.locator('.intro').evaluate('e => e.getBoundingClientRect().height') <= 28
                prompts = start(page)
                complete(page, prompts, 'pass', 'mobile-390')
                page.locator('.how summary').click()
                capture(page, 'mobile-390-rules', '.how')
                page.locator('.how summary').click()
                passed('390px launch/question/receipt and tier names + pts; all-pass receipt has no best find')
                assert not errors, errors
                assert not external, external
                passed('zero console errors/external requests; no root/internal overflow in captures')
                report['passed'] = True
            finally:
                context.close()
    except Exception as error:
        report['failure'] = type(error).__name__
        raise
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        report['elapsed_seconds_including_cleanup'] = round(time.monotonic() - started, 3)
        report['browser_errors'] = errors
        report['external_requests'] = external
        (OUT / 'report.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
