#!/usr/bin/env python3
"""Focused original-art regression and evidence. No packages/browser downloads.

Run: python3 -B scripts/test_kirrlion_art.py
Optional live comparison: add --reference (network used only by reference tab).
Two mobile viewport-only captures: add --mobile-recapture (50s work +10s cleanup).
Refuses to launch while another Chromium is running. Evidence is not runtime art.
"""
import argparse
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import signal
import subprocess
import threading
import tempfile
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/maintenance/audits/kirrlion-art-20261022/abyss'


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', action='store_true')
    parser.add_argument('--mobile-recapture', action='store_true',
                        help='Two 320px viewport-only shots after three real answers; <=60s including cleanup')
    parser.add_argument('--budget-seconds', type=int, choices=(50, 160), default=160,
                        help='Work alarm; allow 10 additional seconds for cleanup')
    args = parser.parse_args()
    if args.mobile_recapture:
        args.budget_seconds = 50
    def require_slot():
        processes = subprocess.check_output(['ps', '-eo', 'comm=,args='], text=True)
        if any(line.lstrip().startswith(('chromium ', 'chrome ')) and
               '--type=' not in line and '--remote-debugging' in line
               for line in processes.splitlines()):
            raise SystemExit('BLOCKED: another Chromium owns the shared browser slot')
        print('Browser preflight: ps has no foreign Chromium/Chrome parent', flush=True)
    require_slot()
    available = subprocess.check_output(['df', '-B1', '/', '--output=avail'], text=True)
    if int(available.splitlines()[-1]) < 2147483648:
        raise SystemExit('BLOCKED: disk below 2 GiB')
    OUT.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    server = ThreadingHTTPServer(('127.0.0.1', 8917),
        functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = 'http://127.0.0.1:8917'
    errors, external = [], []
    report = {'checks': [], 'reference': 'not requested', 'passed': False,
              'source_sha256': {name: hashlib.sha256((ROOT / 'Games/Dive Trivia' / name).read_bytes()).hexdigest()
                                for name in ('index.html', 'style.css', 'script.js', 'guide.svg', 'ocean.svg', 'core.js', 'questions.js')}}

    def limit(*_args):
        raise TimeoutError('Art check work budget exceeded; 10 seconds reserved for cleanup')

    def passed(text):
        report['checks'].append(text)
        print('PASS ' + text, flush=True)

    def shot(page, name):
        page.screenshot(path=str(OUT / (name + '.png')), full_page=True,
                        animations='disabled')

    def route(req):
        if req.request.url.startswith(origin + '/'):
            req.continue_()
        else:
            external.append(req.request.url)
            req.abort()

    signal.signal(signal.SIGALRM, limit)
    signal.alarm(args.budget_seconds)
    try:
        with tempfile.TemporaryDirectory(prefix='kirrlion-art-') as profile, sync_playwright() as pw:
            require_slot()
            context = pw.chromium.launch_persistent_context(
                user_data_dir=profile, executable_path='/usr/bin/chromium', headless=True,
                viewport={'width': 1366, 'height': 1000})
            browser = context.browser
            try:
                context.route('**/*', route)
                page = context.new_page()
                page.set_default_timeout(10000)
                page.on('pageerror', lambda err: errors.append(str(err)))
                page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                page.goto(origin + '/Games/Dive%20Trivia/index.html')
                assert page.locator('#sonar').get_attribute('aria-pressed') == 'false'
                assert page.locator('#guide img').evaluate("e => getComputedStyle(e).animationDuration") == '2s'
                assert page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(5, 9, 20)'
                assert page.locator('.ocean').evaluate("e => getComputedStyle(e).backgroundColor") == 'rgba(0, 0, 0, 0)'
                assert page.locator('#theme').text_content() == 'Dim glow'
                if args.mobile_recapture:
                    page.set_viewport_size({'width': 320, 'height': 844})
                    prompts = page.evaluate("DiveCore.selectPrompts(DiveQuestions, {mode:'numbered',key:'1'})")
                    page.locator('#start-number').click()
                    total = 0
                    for i, prompt in enumerate(prompts[:3]):
                        group = max(prompt['groups'], key=lambda group: group['tier'])
                        page.locator('#answer').fill(group['answers'][0]['text'])
                        page.locator('#answer').press('Enter')
                        total += [10, 15, 30, 60, 85, 100][group['tier']]
                        if i < 2:
                            page.locator('#next').click()
                    assert page.locator('#depth').inner_text() == f'{total * 10:,}'
                    page.wait_for_timeout(950)
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    page.evaluate('window.scrollTo(0, 0)')
                    page.screenshot(path=str(OUT / 'abyss-mobile-320-column-viewport.png'))
                    page.locator('.workbench').evaluate('e => e.scrollIntoView({block:"start"})')
                    page.screenshot(path=str(OUT / 'abyss-mobile-320-game-viewport.png'))
                    assert not errors, errors
                    assert not external, external
                    passed('two 320px viewport-only captures at real three-answer depth; no overflow/errors/external requests')
                    report['passed'] = True
                    return
                shot(page, 'abyss-desktop-launch')
                page.locator('.ocean-world').screenshot(path=str(OUT / 'abyss-bands-scanlines.png'))
                page.locator('.masthead').screenshot(path=str(OUT / 'abyss-glow-title.png'))
                page.locator('#sonar').click()
                assert page.locator('#sonar').text_content() == 'Sonar on'
                page.locator('.instruments').screenshot(path=str(OUT / 'abyss-sonar-ui.png'))
                page.locator('#sonar').click()
                assert page.locator('#sonar').text_content() == 'Sonar off'
                passed('abyss is default; transparent full-page column; sonar muted/toggles; 2-second bob')
                prompts = page.evaluate("DiveCore.selectPrompts(DiveQuestions, {mode:'numbered',key:'1'})")
                page.locator('#start-number').click()
                total = 0
                for i, prompt in enumerate(prompts):
                    if i == 3:
                        page.evaluate('window.scrollTo(0, 0)')
                        shot(page, 'abyss-desktop-midgame-question')
                    group = max(prompt['groups'], key=lambda group: group['tier'])
                    answer = group['answers'][0]['text']
                    page.locator('#answer').fill(answer)
                    page.locator('#answer').press('Enter')
                    total += [10, 15, 30, 60, 85, 100][group['tier']]
                    assert page.locator('#depth').inner_text() == f'{total * 10:,}'
                    page.wait_for_timeout(950)
                    relative = page.locator('#guide').evaluate('''e => {
                        const r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect();
                        return (r.top + r.height / 2 - p.top) / p.height;
                    }''')
                    assert abs(relative - total / 700) < 0.005, (relative, total)
                    if i == 2:
                        shot(page, 'abyss-desktop-midgame-reveal')
                        page.locator('#guide').screenshot(path=str(OUT / 'abyss-mascot.png'))
                        page.locator('#theme').click()
                        assert page.locator('#theme').text_content() == 'Restore glow'
                        assert page.evaluate("getComputedStyle(document.body).backgroundColor") == 'rgb(5, 9, 20)'
                        shot(page, 'abyss-desktop-dim-glow')
                        page.locator('#theme').click()
                        for width in (390, 320):
                            page.set_viewport_size({'width': width, 'height': 844})
                            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                            shot(page, f'abyss-mobile-{width}-midgame')
                            page.evaluate('window.scrollTo(0, 0)')
                            page.screenshot(path=str(OUT / f'abyss-mobile-{width}-column-viewport.png'))
                            page.locator('.workbench').evaluate('e => e.scrollIntoView({block:"start"})')
                            page.screenshot(path=str(OUT / f'abyss-mobile-{width}-game-viewport.png'))
                            page.locator('#theme').click()
                            shot(page, f'abyss-mobile-{width}-dim-glow')
                            page.locator('#theme').click()
                        page.set_viewport_size({'width': 1366, 'height': 1000})
                    page.locator('#next').click()
                assert page.locator('#finish').is_visible()
                passed('seven real-input answers: 10 metres per point and proportional eased mascot at every score')
                page.locator('#home').click()
                assert page.locator('#depth').inner_text() == '0'
                assert page.locator('#guide').evaluate("e => e.style.top") == '0%'
                page.emulate_media(reduced_motion='reduce')
                assert page.locator('#guide img').evaluate("e => getComputedStyle(e).animationName") == 'none'
                assert page.locator('#guide').evaluate("e => getComputedStyle(e).transitionDuration") == '0s'
                passed('home resets depth; reduced motion disables bob and descent easing')
                assert not errors, errors
                assert not external, external
                passed('no console errors or external runtime requests')
                report['passed'] = True
                if args.reference:
                    # Reference uses a separate un-routed context; never enters the game bundle.
                    reference = browser.new_context(viewport={'width': 1366, 'height': 1000})
                    ref = reference.new_page()
                    try:
                        ref.goto('https://krillion.to/en', wait_until='domcontentloaded', timeout=25000)
                        ref.wait_for_timeout(3000)
                        shot(ref, 'reference-krillion-live')
                        report['reference'] = {'url': ref.url, 'title': ref.title()}
                        from PIL import Image, ImageDraw
                        ours = Image.open(OUT / 'abyss-desktop-midgame-question.png').convert('RGB')
                        theirs = Image.open(OUT / 'reference-krillion-live.png').convert('RGB')
                        panels = []
                        for image in (ours, theirs):
                            image.thumbnail((683, 1600))
                            panels.append(image)
                        combined = Image.new('RGB', (1366, max(i.height for i in panels) + 36), '#050914')
                        draw = ImageDraw.Draw(combined)
                        draw.text((12, 10), 'Below the Obvious / original art', fill='#e8f1ff')
                        draw.text((695, 10), 'krillion.to/en / live reference, not runtime art', fill='#e8f1ff')
                        for x, image in zip((0, 683), panels):
                            combined.paste(image, (x, 36))
                        combined.save(OUT / 'side-by-side.png')
                    except Exception as error:
                        report['reference'] = 'BLOCKED: ' + type(error).__name__
                        print(report['reference'], flush=True)
                    finally:
                        reference.close()
            finally:
                browser.close()
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        report['elapsed_seconds_including_cleanup'] = round(time.monotonic() - started, 3)
        report['browser_errors'] = errors
        report['external_runtime_requests'] = external
        filename = 'mobile-viewport-report.json' if args.mobile_recapture else 'focused-report.json'
        (OUT / filename).write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
