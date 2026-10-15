"""Renderer-failure and UI-fixture regression, not rendered-flight acceptance.
Serve repository root on port 8938 first. Requires existing Playwright + Chromium.
Run: python3 Games/Wings/verification/check-browser.py --out /tmp/phase2/wings
"""
import argparse
import json
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:8938/Games/Wings/')
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                               args=['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer'])
    try:
        for theme in ['dark', 'light']:
            for width, height in [(1280, 720), (390, 844)]:
                context = browser.new_context(viewport={'width': width, 'height': height}, color_scheme=theme)
                page = context.new_page()
                errors, external = [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('request', lambda r: external.append(r.url) if not r.url.startswith(args.url) else None)
                page.goto(args.url, wait_until='domcontentloaded')
                page.locator('#render-error[open]').wait_for(timeout=30000)
                assert page.locator('#render-error pre').inner_text()
                prefix = f'{theme}-{width}'
                page.screenshot(path=str(args.out / (prefix + '-failure.png')))
                origin = page.evaluate('performance.timeOrigin')
                page.locator('#retry-low').click()
                page.wait_for_function('(previous) => performance.timeOrigin !== previous', arg=origin)
                page.locator('#render-error[open]').wait_for()
                assert page.evaluate("JSON.parse(localStorage.getItem('wings.settings')).quality") == 'low'
                page.locator('#error-menu').click()
                page.locator('#screen .mi').filter(has_text='Custom setup').click()
                assert page.locator('#screen .mi').filter(has_text='Start offline').count() == 1
                page.get_by_role('button', name='Bots', exact=False).first.click()
                assert page.get_by_role('button', name='Bot skill', exact=False).count() == 1
                page.screenshot(path=str(args.out / (prefix + '-custom.png')))
                page.keyboard.press('ArrowUp')
                if width == 1280:
                    assert page.locator('#screen').evaluate('(el) => el.scrollTop > 0'), 'Keyboard selection must reveal Back'
                # Closing diagnostics must not turn any launch path into HUD-only flight.
                for launch in ['Start offline', 'Solo flight', 'Play with bots']:
                    page.locator('#screen .mi .t').get_by_text(launch, exact=True).click()
                    page.locator('#render-error[open]').wait_for()
                    assert page.locator('#lobby').is_visible()
                    assert page.locator('#busy').is_hidden()
                    assert page.locator('.game-ui').count() == 0
                    page.locator('#error-menu').click()
                    if launch == 'Start offline':
                        page.locator('#screen .mi .t').get_by_text('Back', exact=True).click()
                # Help/settings remain navigable even when the renderer cannot start.
                for menu in ['Controls', 'Settings']:
                    page.locator('#screen .mi .t').get_by_text(menu, exact=True).click()
                    if menu == 'Controls':
                        assert page.locator('#screen .keys').is_visible()
                    else:
                        assert page.locator('#screen .mi .t').get_by_text('Controls', exact=True).is_visible()
                    page.screenshot(path=str(args.out / (prefix + '-' + menu.lower() + '.png')))
                    page.keyboard.press('Escape')
                    assert page.locator('#screen .mi .t').get_by_text('Solo flight', exact=True).is_visible()
                page.goto(args.url + 'check-ui.html', wait_until='networkidle')
                page.wait_for_function("document.title === 'PASS: Wings UI fixture'")
                page.screenshot(path=str(args.out / (prefix + '-spawn-fixture.png')))
                if width < 760:
                    assert page.locator('.spawn').evaluate('(el) => el.scrollHeight > el.clientHeight')
                    page.locator('.spawn').evaluate('(el) => el.scrollTop = el.scrollHeight')
                    page.screenshot(path=str(args.out / (prefix + '-detail-fixture.png')))
                page.get_by_role('button', name='UI fixture only - show HUD').click()
                boxes = page.evaluate('''() => Object.fromEntries(['.hud-radar','.hud-mapwrap','.weapons'].map(s => {
                    const r = document.querySelector(s).getBoundingClientRect();
                    return [s, {x:r.x, y:r.y, right:r.right, bottom:r.bottom}];
                }))''')
                if width < 760:
                    assert boxes['.weapons']['bottom'] <= boxes['.hud-radar']['y'], boxes
                    assert boxes['.weapons']['bottom'] <= boxes['.hud-mapwrap']['y'], boxes
                page.screenshot(path=str(args.out / (prefix + '-hud-fixture.png')))
                results.append({'theme': theme, 'size': [width, height], 'boxes': boxes, 'errors': errors, 'external': external})
                assert not errors and not external
                context.close()
    finally:
        browser.close()
(args.out / 'browser.json').write_text(json.dumps(results, indent=2))
print('PASS: 4 viewport/theme failure screens, Low retry/reload, all 3 launch paths fail closed, Controls/Settings return, offline custom controls, spawn cleanup/layout and HUD fixture separation. No rendered flight.')
