#!/usr/bin/env python3
"""Bounded normal-input expansion checks; artifacts stay outside the repository.

Legacy storage is an explicitly labelled input fixture. No gameplay state setters
or renderer fixtures are used as positive interaction evidence.
"""
import argparse
import http.server
import json
import math
from pathlib import Path
import signal
import tempfile
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--backend-report', type=Path, help='Attach a separately produced fresh backend report without treating browser checks as backend proof')
    parser.add_argument('--walk-kiosk', action='store_true', help='Also attempt the normal-input short kiosk walk')
    args = parser.parse_args()
    output = (args.output or Path(tempfile.mkdtemp(prefix='capital-expansion-'))).resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, failures, external, observations = [], [], [], [], []
    browser = None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), lambda *a, **kw: QuietHandler(*a, directory=str(ROOT), **kw))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    url = base + '/Games/Capital%20Drive/'

    def deadline(signum, frame):
        raise TimeoutError('Expansion browser run exceeded 470 seconds')

    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(470)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snapshot(page):
        return page.evaluate('capitalDriveSnapshot()')

    def ready(page):
        page.set_default_timeout(12000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('requestfailed', lambda r: failures.append(f'{r.url}: {r.failure}'))
        page.on('response', lambda r: failures.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        page.on('request', lambda r: external.append(r.url) if urlsplit(r.url).scheme in ('http', 'https') and not r.url.startswith(base + '/') else None)
        page.goto(url, wait_until='load', timeout=45000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
        check(not snapshot(page)['rendering']['compatibility'], 'Software WebGL renderer available')

    def start(page, mode):
        page.locator(f'[data-game-mode={mode}]').click()
        page.locator('#start-button').click()
        page.wait_for_function('(mode) => capitalDriveSnapshot().started && capitalDriveSnapshot().gameMode === mode', arg=mode)

    def capture(page, name):
        page.screenshot(path=str(output / (name + '.png')))
        (output / (name + '.json')).write_text(json.dumps(snapshot(page), indent=2) + '\n')

    def close_dialog(page, name):
        page.locator(f'[data-close="{name}"]').click()

    def pause_check(page, label):
        page.keyboard.press('p')
        page.wait_for_selector('#pause-dialog[open]')
        before = snapshot(page)['gameplay']
        page.keyboard.down('w')
        page.wait_for_timeout(200)
        page.keyboard.up('w')
        check(snapshot(page)['gameplay'] == before, label + ' pause freezes gameplay')
        page.locator('#resume-button').click()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                # Explicit legacy-version-1 input fixture, isolated browser context.
                legacy = {'version': 1, 'cash': 1234, 'ownedVehicles': [{'id': 'lantern', 'color': '#e7e6df', 'health': 87, 'stored': False}], 'completedJobs': []}
                context.add_init_script("if(!sessionStorage.getItem('legacy-seeded')){localStorage.setItem('capital-drive-career-v1'," + json.dumps(json.dumps(legacy)) + ");sessionStorage.setItem('legacy-seeded','1');}")
                page = context.new_page()
                ready(page)
                check(snapshot(page)['career']['cash'] == 1234 and snapshot(page)['career']['ownedVehicles'][0]['health'] == 87, 'Legacy v1 cash and vehicle condition load')
                start(page, 'street')
                wanted = page.locator('#wanted-level').inner_text()
                check(wanted.count('☆') + wanted.count('★') == 5, 'Street Life wanted HUD shows five star slots')
                page.keyboard.press('e')
                page.wait_for_function('capitalDriveSnapshot().gameplay.mode === "foot"')
                page.keyboard.press('2')
                check(snapshot(page)['gameplay']['weapon'] == 'unarmed', 'Pistol is locked before buying equipment')
                page.keyboard.press('m')
                page.wait_for_selector('#map-dialog[open]')
                check(not page.locator('#teleport-button').is_visible() and page.get_by_role('button', name='Start nearby', exact=True).count() == 0, 'Street Life hides teleport and Start nearby')
                address = next(a for a in json.loads((ROOT / 'Games/Capital Drive/data/addresses.json').read_text())['addresses'] if a.get('number') and a.get('street'))
                page.locator('#map-search').fill(f"{address['number']} {address['street']}")
                page.locator('#map-search-form').get_by_role('button', name='Search', exact=True).click()
                check('OSM tagged address' not in page.locator('#search-results').inner_text(), 'Street Life excludes explicit address results')
                page.locator('#map-search').fill('New South Wales Crescent')
                page.locator('#map-search-form').get_by_role('button', name='Search', exact=True).click()
                page.locator('#search-results button').first.click()
                before = snapshot(page)['focus']
                page.locator('#full-map').focus()
                page.keyboard.press('Enter')
                check(snapshot(page)['focus'] == before, 'Street Life address selection cannot teleport')
                if page.locator('#map-dialog').is_visible():
                    close_dialog(page, 'map-dialog')
                page.locator('#services-button').click()
                page.wait_for_selector('#services-dialog[open]')
                check(page.locator('[data-service-id]').count() >= 4, 'Shops dialog lists fictional service sites')
                cash = snapshot(page)['career']['cash']
                remote = page.locator('[data-service-id="canalside-supplies"] [data-service-item="pistol"]')
                if remote.is_enabled():
                    remote.click()
                else:
                    # Explicit negative handler fixture; never positive purchase proof.
                    remote.evaluate("(button) => button.dispatchEvent(new MouseEvent('click', {bubbles:true}))")
                check(snapshot(page)['career']['cash'] == cash and not snapshot(page)['career']['equipment']['pistol'], 'Remote pistol purchase denies without cash loss')
                page.locator('[data-service-route]').first.click()
                check(snapshot(page)['routePoints'] > 0, 'Normal service route button sets a road route')
                if page.locator('#services-dialog').is_visible():
                    close_dialog(page, 'services-dialog')
                if args.walk_kiosk:
                    yaw = snapshot(page)['camera']['footYaw']
                    target = next(s for s in snapshot(page)['services'] if s['id'] == 'crescent-kiosk')
                    walk_end = time.monotonic() + 30
                    while time.monotonic() < walk_end:
                        actor = snapshot(page)['gameplay']['actor']
                        dx, dz = target['x'] - actor['x'], target['z'] - actor['z']
                        if math.hypot(dx, dz) < 6:
                            break
                        forward = -math.sin(yaw) * dx - math.cos(yaw) * dz
                        lateral = math.cos(yaw) * dx - math.sin(yaw) * dz
                        key = ('w' if forward > 0 else 's') if abs(forward) > abs(lateral) else ('d' if lateral > 0 else 'a')
                        page.keyboard.down(key)
                        page.wait_for_timeout(200)
                        page.keyboard.up(key)
                    actor = snapshot(page)['gameplay']['actor']
                    check(math.hypot(actor['x'] - target['x'], actor['z'] - target['z']) < 8, 'Normal WASD walk reaches nearby kiosk')
                pause_check(page, 'Desktop')
                capture(page, 'desktop-street-life')
                before_reload = snapshot(page)['career']
                page.reload(wait_until='load')
                page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=45000)
                reloaded = snapshot(page)['career']
                check(all(reloaded[k] == before_reload[k] for k in ('version', 'cash', 'ownedVehicles', 'completedJobs')), 'Reload preserves legacy v1 career fields')
                start(page, 'free')
                for query, name in [('Manuka Pool', 'manuka-pool'), ('Manuka shops', 'manuka-shops'), ('Parliament House', 'parliament-house'), (f"{address['number']} {address['street']}", 'explicit-address')]:
                    page.keyboard.press('m')
                    page.locator('#map-search').fill(query)
                    page.locator('#map-search-form').get_by_role('button', name='Search', exact=True).click()
                    page.locator('#search-results button').first.click()
                    page.locator('#teleport-button').click()
                    page.wait_for_function('!capitalDriveSnapshot().paused')
                    check(snapshot(page)['gameMode'] == 'free', 'Normal Free roam search/teleport: ' + query)
                    capture(page, name)
                observations.append({'kind': 'read-only runtime counts', 'buses': snapshot(page).get('buses'), 'occupants': snapshot(page).get('occupants')})
                buses = snapshot(page)['buses']
                check(len(buses) == 2, 'Two bounded ambient buses are integrated')
                bus = next(b for b in buses if b.get('active', True))
                page.keyboard.press('m')
                canvas = page.locator('#full-map')
                rect = canvas.bounding_box()
                view = snapshot(page)['mapView']
                size = canvas.evaluate('(e) => ({width:e.width,height:e.height})')
                # Normal map input beside an observed live bus; no state injection.
                x, z = bus['x'] + 11, bus['z'] + 15
                px = ((x-view['x'])*view['scale']+size['width']/2)/size['width']
                py = ((z-view['z'])*view['scale']+size['height']/2)/size['height']
                page.mouse.click(rect['x']+px*rect['width'], rect['y']+py*rect['height'])
                page.locator('#teleport-button').click()
                page.keyboard.press('p')
                page.wait_for_selector('#pause-dialog[open]')
                capture(page, 'observed-bus-nearby-paused')
                page.locator('#resume-button').click()
                context.close()
                for mode in ('street', 'free'):
                    phone = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
                    mobile = phone.new_page()
                    ready(mobile)
                    start(mobile, mode)
                    check(mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Phone has no horizontal overflow: ' + mode)
                    mobile.get_by_role('button', name='Enter or exit vehicle').tap()
                    mobile.wait_for_function('capitalDriveSnapshot().gameplay.mode === "foot"')
                    check(snapshot(mobile)['gameplay']['mode'] == 'foot', 'Phone normal exit action: ' + mode)
                    pause_check(mobile, 'Phone ' + mode)
                    capture(mobile, 'phone-' + mode)
                    phone.close()
            finally:
                browser.close()
                browser = None
        check(not errors, 'Zero page and console errors: ' + str(errors))
        check(not failures, 'Zero failed requests or HTTP errors: ' + str(failures))
        check(not external, 'Zero external runtime requests: ' + str(external))
    except Exception as error:
        observations.append({'failure': str(error)})
        raise
    finally:
        signal.alarm(0)
        if browser is not None:
            browser.close()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        backend = json.loads(args.backend_report.read_text()) if args.backend_report else None
        report = dict(backendReport=backend, checks=checks, errors=errors, failures=failures, external=external, observations=observations,
                      elapsedSeconds=round(time.monotonic() - started, 2), screenshots=sorted(p.name for p in output.glob('*.png')),
                      limitations=['Software WebGL; N100 FPS unmeasured.', 'Police pursuit/recovery correctness belongs to pure backend suites.', 'No renderer fixture is positive gameplay evidence.'])
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__':
    main()
