#!/usr/bin/env python3
"""Bounded v2 normal-input QA and six committed feature previews. No downloads."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import signal
import subprocess
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'Games/Dive Trivia/previews'
ORIGIN = 'http://127.0.0.1:8923'
URL = ORIGIN + '/Games/Dive%20Trivia/index.html'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def require_slot():
    processes = subprocess.check_output(['ps', '-eo', 'comm=,args='], text=True)
    if any(line.lstrip().startswith(('chromium ', 'chrome ')) and '--type=' not in line
           for line in processes.splitlines()):
        raise SystemExit('BLOCKED: shared browser slot occupied')


def main():
    require_slot()
    free = int(subprocess.check_output(['df', '-B1', '/', '--output=avail'], text=True).splitlines()[-1])
    if free < 2147483648:
        raise SystemExit('BLOCKED: disk below 2 GiB')
    OUT.mkdir(parents=True, exist_ok=True)
    errors, external, failed = [], [], []
    screenshots = []
    started = time.monotonic()
    server = ThreadingHTTPServer(('127.0.0.1', 8923), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def bounded(*_args):
        raise TimeoutError('110s work limit reached; cleanup reserved')

    def route(request):
        if request.request.url.startswith(ORIGIN + '/'):
            request.continue_()
        else:
            external.append(request.request.url)
            request.abort()

    def capture(page, name, mobile=False):
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not page.evaluate('''() => [...document.querySelectorAll('.workbench *')].some(e =>
            e.checkVisibility() && e.clientWidth && !e.matches('input,select') && e.scrollWidth > e.clientWidth + 1)''')
        if mobile:
            page.locator('.workbench').screenshot(path=str(OUT / name), animations='disabled')
        else:
            page.evaluate('window.scrollTo(0, 0)')
            page.screenshot(path=str(OUT / name), animations='disabled')
        screenshots.append(name)

    def typo(page, prompt, excluded=None):
        # Read-only key oracle. No access to the controller's run, clock or storage.
        return page.evaluate('''({prompt, excluded}) => {
          for (const group of prompt.groups.slice().sort((a,b) => b.tier-a.tier)) {
            for (const answer of group.answers) {
              if (answer.text === excluded) continue;
              const chars = Array.from(answer.text);
              for (let i=1; i<chars.length-1; i++) {
                const edited = chars.slice();
                [edited[i], edited[i+1]] = [edited[i+1], edited[i]];
                const input = edited.join('');
                const result = DiveCore.score(prompt, input);
                if (result.closeSpelling && result.answer === answer.text) return {input, ...result};
              }
            }
          }
          throw new Error('No unambiguous typo fixture in current prompt');
        }''', {'prompt': prompt, 'excluded': excluded})

    signal.signal(signal.SIGALRM, bounded)
    signal.alarm(110)
    try:
        with sync_playwright() as pw:
            require_slot()
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
            try:
                context = browser.new_context(viewport={'width': 1366, 'height': 1000}, reduced_motion='reduce', service_workers='block')
                context.route('**/*', route)
                context.route_web_socket('**/*', lambda socket: (external.append(socket.url), socket.close()))
                page = context.new_page()
                page.set_default_timeout(8000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                page.on('requestfailed', lambda request: failed.append(request.url))
                page.goto(URL, timeout=20000)
                page.evaluate('document.fonts.ready')
                page.locator('[data-open-log]').first.click()
                assert page.locator('#log-empty').is_visible()
                assert page.locator('#log-streak').text_content() == '0 days'
                page.locator('#log-home').click()
                page.locator('#playBtn').click()
                day = page.evaluate('DiveCore.utcDate()')
                prompts = page.evaluate("DiveCore.selectPrompts(DiveQuestions, {mode:'daily',key:DiveCore.utcDate()})")
                first = typo(page, prompts[0])
                context.set_offline(True)
                total = 0
                used = set()
                for i, prompt in enumerate(prompts):
                    assert page.locator('#question').text_content() == prompt['text']
                    if i == 0:
                        pick = first
                    else:
                        tier = [4, 5, 1, 2, 3, 4, 5][i]
                        answer = next(a for g in prompt['groups'] if g['tier'] == tier
                                      for a in g['answers'] if a['text'].lower() not in used)
                        pick = {'input': answer['text'], 'answer': answer['text'], 'points': [10, 15, 30, 60, 85, 100][tier]}
                    page.locator('#answer').fill(pick['input'])
                    page.locator('#answer').press('Enter')
                    used.add(pick['answer'].lower())
                    total += pick['points']
                    assert page.locator('#result-title').text_content() == pick['answer']
                    assert page.locator('#score').text_content() == f'{total} / 700 points'
                    if i == 0:
                        assert page.locator('#spelling-note').text_content() == 'Accepted close spelling of ' + first['answer'] + '.'
                        capture(page, '01-typo-accepted-desktop-dark.png')
                    page.locator('#next').click()
                assert page.locator('#finish').is_visible()
                assert page.locator('#finish-total').text_content() == f'{total * 10:,} metres'
                median = sum(p['medianLampreyScore'] for p in prompts)
                assert page.locator('#finish-median').text_content() == f'Reef median: {median} pts. You beat it.'
                capture(page, '02-reef-median-desktop-dark.png')
                print('PASS seven offline normal-input daily rounds, typo penalty and reef median', flush=True)
                context.set_offline(False)
                page.reload()
                page.locator('#playBtn').click()
                page.locator('#answer').fill(first['input'])
                page.locator('#answer').press('Enter')
                assert page.locator('#answer-hint').text_content() == 'Already answered. Try another answer.'
                assert page.locator('#answer-form').is_visible()
                assert page.locator('#score').text_content() == '0 / 700 points'
                page.locator('#theme').click()
                capture(page, '03-already-answered-desktop-light.png')
                page.once('dialog', lambda dialog: dialog.accept())
                page.locator('#quit').click()
                page.locator('[data-open-log]').first.click()
                assert page.locator('#log-best').text_content() == f'{total * 10:,} m'
                assert page.locator('#log-streak').text_content() == '1 day'
                assert page.locator('#log-completed').text_content() == '1'
                assert page.locator('#log-days th').text_content() == day
                assert sum(int(n) for n in page.locator('#log-tiers b').all_text_contents()) == 7
                capture(page, '04-dive-log-desktop-light.png')
                print('PASS reload persistence, already-used retry hint and completed-daily log', flush=True)
                page.locator('#log-home').click()
                page.set_viewport_size({'width': 390, 'height': 844})
                page.locator('#theme').click()
                page.locator('#playBtn').click()
                second = typo(page, prompts[0], first['answer'])
                page.locator('#answer').fill(second['input'])
                page.locator('#answer').press('Enter')
                assert page.locator('#spelling-note').is_visible()
                capture(page, '05-typo-accepted-mobile-dark.png', mobile=True)
                page.once('dialog', lambda dialog: dialog.accept())
                page.locator('#quit').click()
                page.reload()
                page.locator('#playBtn').click()
                page.locator('#answer').fill(second['input'])
                page.locator('#answer').press('Enter')
                assert page.locator('#answer-hint').text_content() == 'Already answered. Try another answer.'
                page.once('dialog', lambda dialog: dialog.accept())
                page.locator('#quit').click()
                page.locator('#theme').click()
                page.locator('[data-open-log]').first.click()
                capture(page, '06-dive-log-mobile-light.png', mobile=True)
                # Also inspect both mobile themes and 320px wrapping without extra captures.
                page.locator('#theme').click()
                page.set_viewport_size({'width': 320, 'height': 800})
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                print('PASS desktop/mobile in both themes; six feature previews', flush=True)
                context.close()
                for fault in ('malformed', 'blocked'):
                    ctx = browser.new_context(service_workers='block')
                    ctx.route('**/*', route)
                    if fault == 'blocked':
                        ctx.add_init_script("Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Blocked', 'SecurityError')}})")
                    else:
                        ctx.add_init_script("localStorage.setItem('dive-trivia:history:v2', '{broken')")
                    tab = ctx.new_page()
                    tab.set_default_timeout(8000)
                    tab.on('pageerror', lambda error: errors.append(str(error)))
                    tab.goto(URL, timeout=20000)
                    tab.locator('#playBtn').click()
                    if fault == 'blocked':
                        answer = tab.evaluate("DiveCore.selectPrompts(DiveQuestions, {mode:'daily',key:DiveCore.utcDate()})[0].groups[0].answers[0].text")
                        tab.locator('#answer').fill(answer)
                        tab.locator('#answer').press('Enter')
                        assert 'Could not save' in tab.locator('#history-status').text_content()
                        tab.once('dialog', lambda dialog: dialog.accept())
                        tab.locator('#quit').click()
                        tab.locator('#playBtn').click()
                        tab.locator('#answer').fill(answer)
                        tab.locator('#answer').press('Enter')
                        assert 'Already answered' in tab.locator('#answer-hint').text_content()
                    for _ in range(7):
                        tab.locator('#pass').click()
                        tab.locator('#next').click()
                    assert tab.locator('#finish-total').text_content() == '0 metres'
                    assert tab.locator('#save-status').text_content() == ('Could not save on this device.' if fault == 'blocked' else '')
                    tab.locator('#finish [data-open-log]').click()
                    assert tab.locator('#log-completed').text_content() == '1'
                    ctx.close()
                assert not errors, errors
                assert not external, external
                assert not failed, failed
                assert len(screenshots) == 6
                print('PASS malformed/blocked storage, zero browser errors/external requests/failed loads', flush=True)
            finally:
                browser.close()
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        print(f'Browser/server closed; slot released; elapsed {time.monotonic() - started:.3f}s', flush=True)


if __name__ == '__main__':
    main()
