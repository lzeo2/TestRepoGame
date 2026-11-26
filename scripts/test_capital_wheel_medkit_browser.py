#!/usr/bin/env python3
"""Verify the shipped wheel and Health HUD using normal keyboard, mouse and touch input."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def run(output, compatibility=False):
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    checks, errors, external, failed = [], [], [], []

    def check(label):
        checks.append(label)
        print('PASS', label, flush=True)

    def local_request(route):
        url = urlsplit(route.request.url)
        if url.scheme in ('http', 'https') and url.netloc != urlsplit(origin).netloc:
            external.append(route.request.url)
            route.abort()
        else:
            route.continue_()

    try:
        with sync_playwright() as playwright:
            gpu_flags = ['--disable-webgl'] if compatibility else [
                '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
            ]
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=[
                '--no-sandbox', '--disable-dev-shm-usage', *gpu_flags,
            ])
            context = browser.new_context(has_touch=True, is_mobile=True, viewport={'width': 390, 'height': 820},
                                          service_workers='block')
            context.route('**/*', local_request)
            page = context.new_page()
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('response', lambda response: failed.append(response.url) if response.status >= 400 else None)
            page.goto(origin + '/Games/Capital%20Drive/', wait_until='domcontentloaded', timeout=60000)
            page.wait_for_function('() => window.capitalDriveSnapshot?.().ready', polling=250, timeout=160000)
            assert page.evaluate('() => capitalDriveSnapshot().rendering.compatibility') == compatibility
            page.locator('[data-game-mode=free]').tap()
            page.locator('#guided-tutorial').uncheck()
            preset = page.locator('#startup-quality')
            if preset.is_enabled():
                preset.select_option('performance')
            page.locator('#start-button').tap()
            page.wait_for_function('() => capitalDriveSnapshot().started && capitalDriveSnapshot().gameMode === "free"')
            canvas = page.locator('#world canvas').first
            canvas.focus()
            wheel = page.locator('#weapon-wheel')
            page.keyboard.press('1')
            expect(wheel).to_be_hidden()
            page.keyboard.press('e')
            page.wait_for_function("() => document.body.classList.contains('on-foot')")
            check('Normal start and exit reach an on-foot game. The wheel stays closed in the car')

            canvas.focus()
            page.keyboard.press('[')
            expect(wheel).to_be_hidden()
            page.keyboard.press('Tab')
            expect(wheel).to_be_hidden()
            assert page.evaluate('() => document.activeElement !== document.querySelector("#world canvas")')
            canvas.focus()
            page.keyboard.down('1')
            expect(wheel.get_by_role('group', name='Weapon wheel')).to_be_visible()
            fists = wheel.get_by_role('button', name='Equip fists')
            pistol = wheel.get_by_role('button', name='Equip Pistol', exact=False)
            expect(wheel.locator('.wheel-slot')).to_have_count(7)
            expect(fists).to_have_class('wheel-slot active')
            page.keyboard.press('ArrowRight')
            expect(pistol).to_have_class('wheel-slot active')
            page.keyboard.up('1')
            expect(wheel).to_be_hidden()
            expect(page.locator('#weapon-label')).to_contain_text('PISTOL', ignore_case=True)
            check('The old bracket leaves the wheel closed and Tab advances focus. 1 and the arrows equip the next slot on release')

            page.keyboard.down('1')
            fists.hover()
            page.keyboard.up('1')
            expect(page.locator('#weapon-label')).to_contain_text('FISTS', ignore_case=True)
            page.keyboard.down('1')
            pistol.hover()
            page.keyboard.press('Escape')
            page.keyboard.up('1')
            expect(wheel).to_be_hidden()
            expect(page.locator('#weapon-label')).to_contain_text('FISTS', ignore_case=True)
            check('Mouse hover selects on key release. Escape dismisses the wheel without equipping')

            equip = page.get_by_role('button', name='Open weapon wheel')
            equip.tap()
            expect(pistol).to_be_visible()
            page.screenshot(path=output / 'weapon-wheel-touch.png', timeout=30000)
            pistol.tap()
            expect(wheel).to_be_hidden()
            expect(page.locator('#weapon-label')).to_contain_text('PISTOL', ignore_case=True)
            equip.tap()
            fists.hover()
            page.touchscreen.tap(8, 155)
            expect(wheel).to_be_hidden()
            expect(page.locator('#weapon-label')).to_contain_text('PISTOL', ignore_case=True)
            check('Native touch selects a slot. A backdrop tap leaves the current weapon equipped')

            medkit = page.get_by_role('button', name='Medkit 3 8')
            phone = page.locator('#phone-dialog')
            health = page.locator('#health-value')
            expect(health).to_have_text('100')
            expect(medkit).to_be_visible()
            assert medkit.bounding_box()['height'] >= 44
            medkit.tap()
            expect(phone).to_be_hidden()
            expect(page.locator('#toast')).to_have_text('Health is already full.')
            expect(page.locator('#medkit-count')).to_have_text('3')
            canvas.focus()
            page.keyboard.press('8')
            expect(phone).to_be_hidden()
            expect(page.locator('#medkit-count')).to_have_text('3')
            page.keyboard.press('t')
            expect(phone).to_be_visible()
            page.locator('#city-gear-open').tap()
            gear = page.locator('#city-dialog')
            expect(gear).to_be_visible()
            expect(gear.get_by_role('button', name='Use repair kit')).to_be_visible()
            expect(gear.get_by_text('Medkit', exact=False)).to_have_count(0)
            page.locator('#city-close').tap()
            expect(gear).to_be_hidden()
            if phone.is_visible():
                phone.get_by_role('button', name='Close phone').tap()
            check('The 44px Health medkit and shortcut are independent of the phone and preserve stock at full health')

            page.set_viewport_size({'width': 320, 'height': 700})
            equip.tap()
            boxes = [slot.bounding_box() for slot in wheel.get_by_role('button').all()]
            assert len(boxes) == 7 and all(box['width'] >= 44 and box['height'] >= 44 and box['x'] >= 0
                                           and box['x'] + box['width'] <= 320 for box in boxes)
            expect(wheel.get_by_role('button', name='Equip fists')).to_be_visible()
            check('Seven usable touch slots fit at 320px')
            assert not (errors or external or failed), (errors, external, failed)
            check('No page exception, external request or failing HTTP asset')
            browser.close()
    finally:
        (output / 'result.json').write_text(json.dumps({'checks': checks, 'pageErrors': errors,
                                                         'external': external, 'httpFailures': failed,
                                                         'compatibility': compatibility}, indent=2) + '\n')
        server.shutdown()
        thread.join(timeout=3)
        server.server_close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path, help='New directory outside the repo for evidence.')
    parser.add_argument('--compatibility', action='store_true', help='Use the game’s native 2D fallback.')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    output.mkdir(parents=True, exist_ok=False)
    run(output, args.compatibility)
