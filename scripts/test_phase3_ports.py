#!/usr/bin/env python3
"""Focused offline-browser checks for the Phase 3 ingested ports, not a release gate."""
import argparse
import json
from pathlib import Path
import subprocess
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def server_survival(page):
    page.locator('[onclick="startGame()"]').click()
    page.locator('[onclick="window.tutorial?.skip()"]').click()
    assert page.evaluate('STATE.gameStarted && STATE.gameMode === "survival"')
    page.keyboard.press('c')
    assert page.evaluate('STATE.activeTool') == 'connect'
    page.locator('#tool-waf').click()
    page.mouse.click(720, 500)
    page.wait_for_function('STATE.services.length === 1')
    assert page.evaluate('STATE.money') == 460
    page.locator('#btn-play').click()
    page.wait_for_function('STATE.elapsedGameTime > 0.2')
    page.locator('#btn-pause').click()
    assert page.evaluate('STATE.timeScale') == 0
    page.locator('#btn-restart').click()
    assert page.evaluate('STATE.services.length === 0 && STATE.money === 500')
    return 'start, keyboard C, native firewall placement ($500 to $460), play/pause, restart ($500/empty): PASS'


CHECKS = {'ServerSurvival': server_survival}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game', choices=CHECKS)
    parser.add_argument('--port', type=int, default=8233)
    args = parser.parse_args()
    output = ROOT / 'docs/phase3-evidence'
    output.mkdir(exist_ok=True)
    base = f'http://127.0.0.1:{args.port}'
    server = subprocess.Popen(['python3', '-m', 'http.server', str(args.port), '--bind', '127.0.0.1'], cwd=ROOT,
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        time.sleep(1)
        assert server.poll() is None, 'Test port already in use'
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            context = browser.new_context(viewport={'width': 1440, 'height': 1000})
            errors, bad, external = [], [], []
            def route(request):
                if request.request.url.startswith(base + '/'):
                    request.continue_()
                else:
                    external.append(request.request.url)
                    request.abort()
            context.route('**/*', route)
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('response', lambda r: bad.append([r.status, r.url.replace(base, '')]) if r.status >= 400 else None)
            page.goto(f'{base}/Games/{args.game}/index.html', wait_until='domcontentloaded', timeout=60000)
            page.wait_for_timeout(2000)
            result = CHECKS[args.game](page)
            for theme in ('light', 'dark'):
                page.emulate_media(color_scheme=theme)
                page.screenshot(path=str(output / f'{args.game}-desktop-{theme}.png'))
            page.set_viewport_size({'width': 390, 'height': 844})
            for theme in ('light', 'dark'):
                page.emulate_media(color_scheme=theme)
                page.screenshot(path=str(output / f'{args.game}-mobile-{theme}.png'))
            report = {'game': args.game, 'result': result, 'console_errors': errors,
                      'http_errors': bad, 'external_requests': external,
                      'renderer': 'Chromium SwiftShader; not hardware-performance acceptance'}
            (output / f'{args.game}.json').write_text(json.dumps(report, indent=2) + '\n')
            print(json.dumps(report, indent=2))
            assert not errors and not bad and not external
            browser.close()
    finally:
        server.terminate()
        server.wait()


if __name__ == '__main__':
    main()
