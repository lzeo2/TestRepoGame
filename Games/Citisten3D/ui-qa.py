"""Bounded UI regression and labelled fixture captures, not gameplay acceptance."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
import shutil
import subprocess

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA'
FLOOR = 2178940928


def disk():
    assert shutil.disk_usage('/').free >= FLOOR, 'Disk floor: stop evidence writes'


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def shot(page, name):
    disk()
    path = OUT / f'{name}.png'
    page.screenshot(path=str(path))
    return path


def layout(page):
    problems = page.evaluate('''() => {
      const errors = [];
      const dialog = document.querySelector('dialog[open]');
      const scope = dialog || document.querySelector('.city-game');
      for (const el of scope.querySelectorAll('button, summary')) {
        if (!el.checkVisibility()) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 44 || r.height < 44) errors.push('Small target: ' + el.textContent);
        if (r.left < -1 || r.right > innerWidth + 1) errors.push('Clipped target: ' + el.textContent);
      }
      if (scope.scrollWidth > innerWidth) errors.push('Horizontal overflow');
      for (const el of document.querySelectorAll('.citisten-ui *')) {
        const style = getComputedStyle(el);
        if (style.backgroundImage.includes('gradient')) errors.push('Gradient');
        if (style.boxShadow !== 'none' || style.textShadow !== 'none') errors.push('Shadow');
      }
      return errors;
    }''')
    assert not problems, problems


def main():
    # Cooperative browser queue is still required; never kill another lane's browser.
    active = subprocess.run(['pgrep', '-f', '^/usr/(lib/chromium/chromium|bin/chromium)|chrome-linux/chrome'], capture_output=True).returncode
    assert active != 0, 'Another Chromium gate owns the browser slot'
    disk()
    OUT.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '0'))), partial(QuietHandler, directory=str(ROOT)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors, external, failed, captures = [], [], [], []
    before = shutil.disk_usage('/').free
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
            try:
                for width, height in [(1440, 900), (390, 844), (320, 740)]:
                    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', has_touch=width < 600)
                    page = context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
                    page.on('request', lambda req: external.append(req.url) if not req.url.startswith(('http://127.0.0.1:', 'data:')) else None)
                    page.on('requestfailed', lambda req: failed.append(req.url))
                    page.goto(f'http://127.0.0.1:{server.server_port}/Games/Citisten3D/ui-preview.html?fixture')
                    page.wait_for_function('window.citistenPreview')
                    page.evaluate('''async () => {
                      const { createUI } = await import('./ui.mjs');
                      window.citistenPreview.ui.destroy();
                      window.calls = [];
                      window.ui = createUI(document.querySelector('#ui'), {
                        onStart: mode => calls.push(['start', mode]),
                        onTool: tool => calls.push(['tool', tool]),
                        onRestart: mode => calls.push(['restart', mode])
                      });
                      // Deliberately labelled state/roads fixture, not a parallel simulation.
                      window.state = { budget:24500, population:128, peakPopulation:240,
                        power:{demand:64,supply:100}, water:{demand:48,supply:100},
                        mode:'free', phase:'day', night:2, score:3, kills:46,
                        townHallHp:720, townHallMaxHp:1000, buildings:[], zombies:[] };
                      for (let z=1; z<23; z++) for (let x=1; x<23; x++) {
                        if (x === 12 || z === 12) continue;
                        state.buildings.push({type:x<9?'residential':x<16?'commercial':'industrial',x,z});
                      }
                      state.buildings.push({type:'townhall',x:12,z:12});
                      window.map = {size:24, roads:{cells:new Set(),cell(key){return {x:key%24,z:Math.floor(key/24)}}}};
                      for(let i=0;i<24;i++){map.roads.cells.add(12*24+i);map.roads.cells.add(i*24+12)}
                      ui.update(state,map);
                    }''')
                    page.evaluate('document.fonts.ready')
                    for theme in ['dark', 'light']:
                        if theme == 'light':
                            page.locator('dialog[open] [data-action="theme"]').click()
                        assert page.locator('#ui').get_attribute('data-theme') == theme
                        layout(page)
                        # Native focus ring and keyboard start path.
                        page.locator('[data-mode="free"]').focus()
                        assert page.locator('[data-mode="free"]').evaluate("el => getComputedStyle(el).outlineStyle") == 'solid'
                        captures.append(shot(page, f'J-I-ui-menu-{theme}-{width}'))
                        page.keyboard.press('Enter')
                        assert page.evaluate('calls.at(-1)') == ['start', 'free']
                        page.evaluate('state.mode="free"; state.phase="day"; state.budget=24500; state.population=128; state.power={demand:64,supply:100}; ui.update(state,map)')
                        assert not page.locator('.city-night').is_visible()
                        assert page.locator('[data-value="budget"]').inner_text() == '$24,500'
                        layout(page)
                        captures.append(shot(page, f'J-C-D-ui-hud-{theme}-{width}'))
                        page.locator('[data-group="Zone"]').click()
                        page.locator('[data-tool="residential"]').click()
                        assert page.evaluate('calls.at(-1)') == ['tool', 'residential']
                        assert page.locator('[data-tool="residential"]').get_attribute('aria-pressed') == 'true'
                        page.locator('[data-tool="commercial"]').focus()
                        assert page.locator('#city-tooltip-commercial').is_visible()
                        layout(page)
                        captures.append(shot(page, f'J-B-ui-toolbar-{theme}-{width}'))
                        page.evaluate('''() => {
                          state.mode='defense'; state.phase='night'; state.night=3;
                          state.zombies=[{x:23,z:2},{x:23,z:5},{x:22,z:7}];
                          ui.update(state,map);
                          ui.events([{type:'wave-warning'},{type:'wave',night:3}]);
                        }''')
                        page.locator('[data-group="Defense"]').click()
                        page.locator('[data-tool="watchtower"]').click()
                        assert page.locator('[data-tool="barricade"]').is_disabled()
                        assert page.locator('.city-night').is_visible()
                        assert page.locator('.city-hall svg').get_attribute('aria-label') == 'Town hall health 72 percent'
                        layout(page)
                        captures.append(shot(page, f'J-F-G-ui-nightalert-{theme}-{width}'))
                        page.evaluate('''() => {
                          state.budget=23400; state.population=140;
                          state.power={demand:64,supply:0}; ui.update(state,map);
                          ui.events(Array.from({length:100},()=>({type:'placed'})));
                          ui.events([{type:'blackout',active:true},{type:'milestone',population:100}]);
                        }''')
                        assert page.locator('.city-toasts > p').count() <= 3
                        assert page.locator('#city-power').get_attribute('aria-valuetext') == '64 demand, 0 supply'
                        captures.append(shot(page, f'D-ui-blackout-{theme}-{width}'))
                        page.evaluate('state.phase="lost";state.townHallHp=0;ui.update(state,map)')
                        assert page.locator('.city-loss').is_visible()
                        assert page.locator('[data-value="finalPopulation"]').inner_text() == '240'
                        page.keyboard.press('Escape')
                        assert page.locator('.city-loss').is_visible()
                        layout(page)
                        captures.append(shot(page, f'J-H-ui-gameover-{theme}-{width}'))
                        page.locator('[data-action="restart"]').click()
                        assert page.evaluate('calls.at(-1)') == ['restart', 'defense']
                        page.locator('.city-top [data-action="menu"]').click()
                        page.locator('[data-mode="defense"]').click()
                        assert page.evaluate('calls.at(-1)') == ['start', 'defense']
                        page.locator('.city-top [data-action="menu"]').click()
                    # Throwing storage must not break theme controls.
                    page.evaluate("Storage.prototype.setItem = () => { throw Error('Storage denied') }")
                    page.locator('dialog[open] [data-action="theme"]').click()
                    assert page.locator('#ui').get_attribute('data-theme') == 'dark'
                    page.evaluate('ui.events([{type:"placed"},{type:"placed"}]);ui.events([{type:"placed"}])')
                    assert page.locator('.city-toasts > p').count() <= 3
                    page.wait_for_timeout(6200)
                    assert page.locator('.city-toasts > p').count() == 0
                    page.evaluate('ui.destroy()')
                    assert page.locator('#ui').inner_html() == ''
                    context.close()
                assert not errors, errors
                assert not external, external
                assert not failed, failed
            finally:
                browser.close()
        pairs = [('menu','J-I'),('toolbar','J-B'),('hud','J-C-D'),('nightalert','J-F-G'),('gameover','J-H')]
        for name, letters in pairs:
            mockup = Image.open(ROOT / f'docs/citisten-design/ui-mockup-{name}.png').convert('RGB').resize((720,450))
            for theme in ['dark','light']:
                runtime = Image.open(OUT / f'{letters}-ui-{name}-{theme}-1440.png').convert('RGB').resize((720,450))
                collage = Image.new('RGB',(1440,480),'#181c1b')
                collage.paste(mockup,(0,30)); collage.paste(runtime,(720,30))
                draw = ImageDraw.Draw(collage)
                draw.text((12,8),'Generated mockup, solid-palette postprocessing',fill='white')
                draw.text((732,8),f'Chromium UI fixture / {theme} / not gameplay',fill='white')
                disk(); collage.save(OUT / f'J-comparison-{name}-{theme}.png')
        result = {'scope':'UI fixture only, reviewer grades acceptance', 'viewports':[1440,390,320],
                  'themes':['dark','light'], 'screenshots':len(captures), 'collages':10,
                  'errors':errors,'externalRequests':external,'failedRequests':failed,
                  'checks':'native keyboard start, both modes, tool callbacks, focus, theme/storage failure, HP, demand, peak population, toast cap/dedupe/expiry, 44px targets, overflow, no gradients/shadows, destroy',
                  'diskBeforeBytes':before,'diskAfterBytes':shutil.disk_usage('/').free}
        disk(); (OUT / 'J-ui-results.json').write_text(json.dumps(result,indent=2)+'\n')
        print(f'UI CHECK PASS: {len(captures)} fixture screenshots, 10 collages; 3 viewports, 2 themes; zero console/page/network errors')
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)


if __name__ == '__main__':
    main()
