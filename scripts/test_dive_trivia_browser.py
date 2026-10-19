#!/usr/bin/env python3
"""Real-input solo regression. Run: python3 -B scripts/test_dive_trivia_browser.py.

Evidence stays ignored. Offline coverage starts after local assets load, not a
cold hosted install. Two contexts prove shared daily prompts, not online play.
"""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import signal
import threading
import time
import traceback
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / '.swarmforge-logs/dive-trivia'
PORT = int(os.environ.get('DIVE_TEST_PORT', '8911'))
POINTS = [10, 15, 30, 60, 85, 100]


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    assert 8900 <= PORT <= 65535, 'DIVE_TEST_PORT must be 8900..65535'
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    report = {'checks': [], 'findings': [], 'external_requests': [],
              'browser_errors': [], 'request_failures': [], 'screenshots': []}
    source_paths = [ROOT / 'Games/Dive Trivia' / name for name in
                    ('index.html', 'script.js', 'core.js', 'questions.js', 'style.css', 'guide.svg')]
    before_sources = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in source_paths}
    started = time.monotonic()
    server = ThreadingHTTPServer(('127.0.0.1', PORT),
                                 functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{PORT}'
    url = origin + '/Games/Dive%20Trivia/index.html'
    browser = None

    def bounded(_signum, _frame):
        raise TimeoutError('Browser regression exceeded 285 seconds')

    previous_alarm = signal.signal(signal.SIGALRM, bounded)
    signal.alarm(285)

    def passed(name):
        report['checks'].append(name)
        print('PASS ' + name, flush=True)

    def route(request_route):
        request = request_route.request
        if urlsplit(request.url).scheme in ('data', 'blob', 'about'):
            request_route.continue_()
        elif request.url.startswith(origin + '/'):
            request_route.continue_()
        else:
            report['external_requests'].append(request.url)
            request_route.abort('blockedbyclient')

    def block_socket(socket):
        report['external_requests'].append(socket.url)
        socket.close(code=1008, reason='Solo regression forbids network transports')

    def watch(page):
        page.set_default_timeout(8000)
        page.on('pageerror', lambda error: report['browser_errors'].append(str(error)))
        page.on('console', lambda message: report['browser_errors'].append(message.text)
                if message.type == 'error' else None)
        page.on('requestfailed', lambda request: report['request_failures'].append(
            {'url': request.url, 'failure': request.failure}))
        page.on('response', lambda response: report['request_failures'].append(
            {'url': response.url, 'status': response.status}) if response.status >= 400 else None)

    def load(page):
        page.goto(url, wait_until='networkidle')
        page.locator('#playBtn').wait_for(state='visible')
        page.evaluate('document.fonts.ready')
        assert page.locator('#launch-error').inner_text() == ''
        assert page.evaluate('Array.from(document.images).every(i => i.complete && i.naturalWidth > 0)')

    def act(page, selector):
        if page.context == touch_context:
            page.locator(selector).tap()
        else:
            page.locator(selector).click()

    def focused(page, element_id):
        assert page.evaluate('document.activeElement.id') == element_id, element_id + ' focus'

    def layout(page, label):
        problems = page.evaluate('''() => {
          const out = [], root = document.documentElement;
          if (root.scrollWidth > root.clientWidth + 1) out.push('horizontal overflow');
          for (const el of document.querySelectorAll('button,input,select,summary,a[href]')) {
            const r = el.getBoundingClientRect();
            if (!el.checkVisibility() || r.right <= 0 || r.bottom <= 0 || r.top < -50) continue;
            if (r.width < 44 || r.height < 44)
              out.push((el.id || el.className || el.tagName) + ' target ' +
                       r.width.toFixed(1) + 'x' + r.height.toFixed(1));
          }
          return out;
        }''')
        for problem in problems:
            report['findings'].append(label + ': ' + problem)

    def capture(page, label, state):
        layout(page, label + '/' + state)
        path = EVIDENCE / (label + '-' + state + '.png')
        page.screenshot(path=str(path), full_page=True, animations='disabled')
        report['screenshots'].append(str(path.relative_to(ROOT)))

    def selection(page, mode, key):
        # Read-only data/seed oracle. Never touches the closure-owned run or clock.
        return page.evaluate('''s => DiveCore.selectPrompts(DiveQuestions, s)
          .map(p => ({id:p.id, text:p.text, pack:p.pack, groups:p.groups}))''',
                             {'mode': mode, 'key': key})

    def question(page, prompt, index):
        assert page.locator('#question').inner_text() == prompt['text']
        assert page.locator('#round-count').inner_text() == f'{index + 1:02d} / 07'
        assert page.locator('#answer').is_visible()
        focused(page, 'answer')

    def answer(page, text):
        # Real keyboard input and native form submission, no DOM event injection.
        page.locator('#answer').press_sequentially(text)
        page.locator('#answer').press('Enter')
        page.locator('#reveal').wait_for(state='visible')
        focused(page, 'next')
        assert not page.locator('#answer-form').is_visible()
        assert not page.locator('#submit-answer').is_visible()

    def finish_run(page, prompts, label=None):
        total = 0
        observed = []
        for index, prompt in enumerate(prompts):
            question(page, prompt, index)
            observed.append(prompt['id'])
            if label and index == 0:
                capture(page, label, 'question')
            tier = index % 6
            pick = next(group for group in prompt['groups'] if group['tier'] == tier)['answers'][0]
            answer(page, pick['text'])
            total += POINTS[tier]
            assert page.locator('#result-title').inner_text() == pick['text']
            assert f'+{POINTS[tier]} POINTS' in page.locator('#result-tier').inner_text()
            assert page.locator('#score').inner_text() == f'{total} / 700 points'
            if index == 0:
                # The locked form cannot accept another submission; typing does not advance.
                page.keyboard.type('ignored')
                page.wait_for_timeout(180)
                assert page.locator('#score').inner_text() == f'{total} / 700 points'
                assert page.locator('#question').inner_text() == prompt['text']
                if label:
                    capture(page, label, 'reveal')
                act(page, '#answer-key summary')
                assert page.locator('#key-groups p').count() == 6
                assert pick['text'] in page.locator('#key-groups').inner_text()
                layout(page, (label or 'run') + '/expanded-key')
            assert page.locator('#next').inner_text() == ('See field notes' if index == 6 else 'Next question')
            act(page, '#next')
        page.locator('#finish').wait_for(state='visible')
        focused(page, 'replay')
        assert page.locator('#finish-total').inner_text() == f'{total * 10:,} metres'
        assert page.locator('#depth').inner_text() == f'{total * 10:,}'
        assert '7 of 7 answers recognized' in page.locator('#finish-caption').inner_text()
        rows = page.locator('#results li')
        assert rows.count() == 7
        for index, prompt in enumerate(prompts):
            assert prompt['text'] in rows.nth(index).inner_text()
        if label:
            capture(page, label, 'results')
        return observed

    def home(page):
        act(page, '#home')
        page.locator('#launch').wait_for(state='visible')
        focused(page, 'playBtn')

    def quit_dive(page, accept):
        messages = []
        def dialog(dialog):
            messages.append(dialog.message)
            dialog.accept() if accept else dialog.dismiss()
        page.once('dialog', dialog)
        act(page, '#quit')
        assert messages == ['Leave this dive? This unfinished result will not be saved.']
        assert page.locator('#launch' if accept else '#game').is_visible()

    try:
        with sync_playwright() as playwright:
            try:
                browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
                desktop_context = browser.new_context(viewport={'width': 1366, 'height': 900},
                                                      reduced_motion='reduce', service_workers='block')
                touch_context = browser.new_context(viewport={'width': 390, 'height': 844},
                                                    is_mobile=True, has_touch=True,
                                                    reduced_motion='reduce', service_workers='block')
                for context in (desktop_context, touch_context):
                    context.route('**/*', route)
                    context.route_web_socket('**/*', block_socket)
                desktop = desktop_context.new_page()
                mobile = touch_context.new_page()
                for page in (desktop, mobile):
                    watch(page)
                    load(page)
                data = desktop.evaluate('DiveQuestions')
                date = desktop.locator('#daily-date').inner_text().split(' ')[0]
                assert date == mobile.locator('#daily-date').inner_text().split(' ')[0]
                expected = selection(desktop, 'daily', date)
                assert expected == selection(mobile, 'daily', date)
                assert len({prompt['id'] for prompt in expected}) == 7
                observed = []
                for page, label in ((desktop, 'desktop-light'), (mobile, 'mobile-390-light')):
                    capture(page, label, 'launch')
                    act(page, '#playBtn')
                    assert page.locator('#run-label').inner_text() == 'DAILY / ' + date
                    observed.append(finish_run(page, expected, label))
                    assert 'saved on this device only' in page.locator('#save-status').inner_text()
                    home(page)
                assert observed[0] == observed[1]
                report['daily'] = {'date': date, 'version': data['version'], 'ids': observed[0]}
                passed('two independent contexts: same seven daily prompt IDs, typed known picks, scores/results')
                passed('all six rarity tiers, single lock then next, answer-key expansion and focus')
                for page, width, label in ((desktop, 1366, 'desktop-dark'),
                                           (mobile, 390, 'mobile-390-dark'),
                                           (mobile, 320, 'mobile-320-dark'),
                                           (mobile, 320, 'mobile-320-light')):
                    page.set_viewport_size({'width': width, 'height': 900 if width > 390 else 844})
                    dark = label.endswith('dark')
                    if page.locator('body').evaluate("e => e.classList.contains('dark')") != dark:
                        act(page, '#theme')
                    capture(page, label, 'launch')
                    act(page, '#playBtn')
                    finish_run(page, expected, label)
                    home(page)
                passed('24 desktop/390/320 light/dark launch/question/reveal/results screenshots')

                # Reload once to verify persisted theme, result and locally loaded assets.
                act(desktop, '#theme')  # dark -> light
                desktop.reload(wait_until='networkidle')
                desktop.evaluate('document.fonts.ready')
                assert not desktop.locator('body').evaluate("e => e.classList.contains('dark')")
                assert 'Last completed: Daily ' + date in desktop.locator('#last-result').inner_text()
                passed('theme and last result survive reload')
                desktop_context.set_offline(True)
                act(desktop, '#playBtn')
                finish_run(desktop, expected)
                home(desktop)
                desktop_context.set_offline(False)
                passed('full seven-round solo works offline AFTER local asset load; no cold-install claim')

                for pack in data['packs']:
                    desktop.locator('#pack').select_option(pack['id'])
                    prompts = selection(desktop, 'pack', pack['id'])
                    assert all(prompt['pack'] == pack['id'] for prompt in prompts)
                    act(desktop, '#start-pack')
                    assert desktop.locator('#run-label').inner_text() == 'PACK / ' + pack['title']
                    finish_run(desktop, prompts)
                    home(desktop)
                    passed('pack start/seven rounds/end: ' + pack['id'])
                for key in ('1', '999999'):
                    desktop.locator('#number').fill(key)
                    act(desktop, '#start-number')
                    assert desktop.locator('#run-label').inner_text() == 'DIVE / ' + key
                    prompts = selection(desktop, 'numbered', key)
                    finish_run(desktop, prompts)
                    act(desktop, '#replay')
                    question(desktop, prompts[0], 0)
                    assert desktop.locator('#score').inner_text() == '0 / 700 points'
                    quit_dive(desktop, False)
                    assert desktop.locator('#question').inner_text() == prompts[0]['text']
                    assert desktop.locator('#round-count').inner_text() == '01 / 07'
                    assert desktop.locator('#answer').is_visible()
                    quit_dive(desktop, True)
                    focused(desktop, 'playBtn')
                    passed('numbered ' + key + ' start/end/restart and quit cancel/confirm')
                for invalid in ('0', '1000000', '1.5'):
                    desktop.locator('#number').fill(invalid)
                    act(desktop, '#start-number')
                    assert desktop.locator('#launch').is_visible()
                    assert not desktop.locator('#number').evaluate('e => e.checkValidity()')
                passed('numbered bounds reject 0, 1000000, fractional values')

                act(desktop, '#playBtn')
                attack = '<script>alert("x")</script>'
                answer(desktop, attack)
                assert attack in desktop.locator('#result-copy').inner_text()
                assert desktop.locator('#reveal script').count() == 0
                assert desktop.locator('#score').inner_text() == '0 / 700 points'
                capture(desktop, 'edge-cases', 'unknown-literal')
                act(desktop, '#next')
                act(desktop, '#pass')
                assert 'Passed.' in desktop.locator('#result-copy').inner_text()
                assert desktop.locator('#score').inner_text() == '0 / 700 points'
                before = time.monotonic()
                act(desktop, '#next')
                assert desktop.locator('#timer').inner_text() == '25 s'
                desktop.locator('#reveal').wait_for(state='visible', timeout=33000)
                elapsed = time.monotonic() - before
                assert 24.5 <= elapsed <= 33, f'Timeout observed after {elapsed:.2f}s'
                assert desktop.locator('#timer').inner_text() == 'Time up'
                assert desktop.locator('#result-title').inner_text() == 'The clock ran out.'
                assert desktop.locator('#score').inner_text() == '0 / 700 points'
                focused(desktop, 'next')
                report['real_timeout_seconds'] = round(elapsed, 3)
                capture(desktop, 'edge-cases', 'real-timeout')
                for _index in range(3, 7):
                    act(desktop, '#next')
                    act(desktop, '#pass')
                act(desktop, '#next')
                assert desktop.locator('#finish-total').inner_text() == '0 metres'
                assert attack in desktop.locator('#results').inner_text()
                assert desktop.locator('#results script').count() == 0
                assert desktop.locator('#results li').count() == 7
                assert desktop.locator('#results strong').all_text_contents() == [attack, 'Passed', 'Time expired'] + ['Passed'] * 4
                passed(f'unknown <script> literal in reveal/results, pass, real timeout {elapsed:.2f}s, zero-score finish')

                for fault in ('malformed', 'blocked'):
                    page = touch_context.new_page()
                    watch(page)
                    if fault == 'malformed':
                        page.add_init_script('''localStorage.setItem('dive-trivia:last:v1', '{broken');
                          localStorage.setItem('dive-trivia:theme', 'not-a-theme');''')
                    else:
                        page.add_init_script('''Object.defineProperty(window, 'localStorage', {
                          get() { throw new DOMException('Blocked by browser regression', 'SecurityError'); }
                        });''')
                    load(page)
                    assert page.locator('#last-result').inner_text() == ''
                    act(page, '#theme')
                    assert page.locator('body').evaluate("e => e.classList.contains('dark')")
                    act(page, '#playBtn')
                    finish_run(page, expected)
                    status = page.locator('#save-status').inner_text()
                    assert ('Storage is unavailable' if fault == 'blocked' else 'saved on this device only') in status
                    home(page)
                    act(page, '#playBtn')
                    question(page, expected[0], 0)
                    quit_dive(page, True)
                    page.close()
                    passed(f'{fault} localStorage: launch, theme, seven typed rounds, save feedback and restart')
                assert 'Online rooms are not enabled' in mobile.locator('.battle').inner_text()
                passed('battle phase 2 remains disabled; no online-session proof claimed')
                desktop.wait_for_timeout(200)
            finally:
                if browser is not None:
                    browser.close()
    except Exception as error:
        traceback.print_exc()
        report['findings'].append(type(error).__name__ + ': ' + str(error))
        print('FAIL ' + report['findings'][-1], flush=True)
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_alarm)
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        if thread.is_alive():
            report['findings'].append('HTTP server thread did not terminate')
        report['elapsed_seconds'] = round(time.monotonic() - started, 3)
        for key in ('external_requests', 'browser_errors', 'request_failures'):
            if report[key]:
                report['findings'].append(key + ': ' + json.dumps(report[key], ensure_ascii=False))
        report['source_sha256'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in source_paths}
        if before_sources != report['source_sha256']:
            report['findings'].append('Game source changed during run; rerun on stable source required')
        report['passed'] = not report['findings']
        (EVIDENCE / 'report.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
        print(f"External attempts: {len(report['external_requests'])}; browser errors: {len(report['browser_errors'])}; request failures: {len(report['request_failures'])}", flush=True)
        print(f"Checks: {len(report['checks'])}; screenshots: {len(report['screenshots'])}; elapsed: {report['elapsed_seconds']}s", flush=True)
        for finding in report['findings']:
            print('FINDING ' + finding, flush=True)
        print('Report: .swarmforge-logs/dive-trivia/report.json', flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
