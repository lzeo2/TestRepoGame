"""One released <=120s system-Chromium slot; four native-entry screenshots.
Run: timeout 120s python3 -B Games/Citisten3D/save-terrain-qa.py
Camera staging is used ONLY for the landscape photo, not gameplay acceptance.
"""
import functools
import http.server
import json
import runpy
import shutil
import signal
import subprocess
import threading
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.tmp/citisten-save-terrain'

def browsers():
    rows = subprocess.check_output(['ps', '-eo', 'stat=,pid=,args='], text=True)
    return {int(p[1]) for line in rows.splitlines() if len(p := line.split()) > 2
            and not p[0].startswith('Z') and Path(p[2]).name in ('chromium', 'chrome') and '--type=' not in line}

def main():
    assert shutil.disk_usage(ROOT).free >= 2147483648, 'Disk guard'
    assert not browsers(), 'Browser slot busy'
    OUT.mkdir(parents=True, exist_ok=True)
    profile = OUT / f'profile-{time.time_ns()}'
    report = {'screenshots': [], 'errors': [], 'externalRequests': [], 'checks': [], 'cameraStaged': 'terrain overview only'}
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    context = driver = None
    started = time.monotonic()
    def expired(*_): raise TimeoutError('110s action budget exhausted')
    signal.signal(signal.SIGALRM, expired); signal.alarm(110)
    def checkpoint(name):
        report['checks'].append(name)
        (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
        print(name, flush=True)
    try:
        driver = sync_playwright().start()
        context = driver.chromium.launch_persistent_context(str(profile), executable_path='/usr/bin/chromium', headless=True,
            viewport={'width': 1280, 'height': 800}, service_workers='block',
            args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        owned = browsers(); assert len(owned) == 1, 'Unexpected browser roots'
        def route(r):
            if r.request.url.startswith(base + '/'): r.continue_()
            else: report['externalRequests'].append(r.request.url); r.abort()
        context.route('**/*', route)
        page = context.pages[0]; page.set_default_timeout(12000)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
        page.on('requestfailed', lambda r: report['errors'].append(f'{r.url}: {r.failure}'))
        def shot(name):
            assert browsers() == owned, 'Foreign browser contention'
            page.screenshot(path=str(OUT / f'{name}.png'))
            report['screenshots'].append(f'.tmp/citisten-save-terrain/{name}.png'); checkpoint(name)
        url = base + '/Games/Citisten3D/index.html'
        page.goto(url, wait_until='domcontentloaded', timeout=20000)
        page.wait_for_function('window.citisten?.world.loaded', timeout=25000)
        page.locator('[data-mode="defense"]').click()
        if page.locator('.city-tutorial').is_visible(): page.locator('[data-action="tutorial-close"]').click()
        layout = page.evaluate(runpy.run_path(str(ROOT / 'Games/Citisten3D/native-qa.py'))['LAYOUT'])
        page.mouse.move(layout['from']['x'], layout['from']['y']); page.mouse.down()
        page.mouse.move(layout['to']['x'], layout['to']['y']); page.mouse.up()
        shortcuts = {'residential': 'Digit2', 'commercial': 'Digit3', 'industrial': 'Digit4', 'power': 'Digit5', 'water': 'Digit6', 'park': 'Digit9'}
        for b in layout['buildings']:
            page.locator('#world').focus(); page.keyboard.press(shortcuts[b['type']]); page.mouse.click(b['x'], b['y'])
        assert page.evaluate('citisten.sim.state.buildings.length') == 7
        checkpoint('native road and six buildings placed')
        page.locator('#speed').select_option('10')
        page.wait_for_function('citisten.sim.state.time >= 61', timeout=15000)
        assert page.evaluate('!!localStorage.getItem("citisten-save-v1")'), 'Autosave missing'
        checkpoint('60 sim second autosave')
        page.locator('#speed').select_option('0')
        page.locator('[data-action="menu"]').first.click(); page.locator('#save-town').click()
        expected = page.evaluate('JSON.parse(localStorage.getItem("citisten-save-v1")).state')
        assert page.locator('#save-status').inner_text() == 'Town saved on this device.'
        page.reload(wait_until='domcontentloaded', timeout=20000)
        page.wait_for_function('window.citisten?.world.loaded', timeout=25000)
        assert page.locator('#continue-town').is_visible(); shot('01-menu-continue-dark')
        page.locator('#continue-town').click()
        assert page.evaluate('citisten.sim.state') == expected, 'Loaded authoritative state differs'
        shot('02-loaded-mid-game-dark')
        page.locator('#speed').select_option('1'); page.locator('#world').focus(); page.keyboard.press('s')
        page.wait_for_function('citisten.sim.state.dayRemaining <= 60')
        assert page.locator('#skip-night').is_disabled()
        checkpoint('S advances to warning and disables repeated skip')
        # Read-only collider checks plus explicitly staged landscape camera.
        assert page.evaluate('citisten.world.landscape.features.every(b => citisten.world.floorHeight(b.x,b.z)>=b.y+b.h/2)')
        page.evaluate('citisten.world.controls.setPose({x:1250,y:380,z:1450,yaw:.15,pitch:-.7},true)')
        page.wait_for_timeout(300); shot('03-terrain-overview-day-dark')
        page.locator('[data-action="menu"]').first.click()
        page.locator('.city-menu [data-action="theme"]').click()
        page.set_viewport_size({'width': 390, 'height': 844})
        page.locator('#continue-town').scroll_into_view_if_needed(); shot('04-menu-continue-mobile-light')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not report['errors'], report['errors']
        assert not report['externalRequests'], report['externalRequests']
        checkpoint('PASS: four photos, save/load/autosave/skip/solid feature checks, zero errors/external requests')
        report['status'] = 'PASS'
    except BaseException as error:
        report['status'] = 'FAIL'; report['failure'] = repr(error); raise
    finally:
        signal.alarm(0)
        if context: context.close()
        if driver: driver.stop()
        server.shutdown(); server.server_close(); thread.join(timeout=3)
        report['seconds'] = round(time.monotonic() - started, 3)
        report['browserReleased'] = not browsers()
        report['serverReleased'] = not thread.is_alive()
        (OUT / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report), flush=True)

if __name__ == '__main__': main()
