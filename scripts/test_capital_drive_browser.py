#!/usr/bin/env python3
"""Real-input driving, route, storage, fallback and responsive browser checks."""
import argparse
import http.server
import json
import math
from pathlib import Path
import tempfile
import threading
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    output = args.output or Path(tempfile.mkdtemp(prefix='capital-drive-qa-'))
    output.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
        lambda *a, **kw: QuietHandler(*a, directory=str(ROOT), **kw))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    url = base + '/Games/Capital%20Drive/'
    errors, failures, external, checks = [], [], [], []

    def track(page):
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.on('requestfailed', lambda r: failures.append(r.url + ': ' + str(r.failure)))
        page.on('response', lambda r: failures.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        page.on('request', lambda r: external.append(r.url) if urlsplit(r.url).scheme in ('http', 'https') and not r.url.startswith(base + '/') else None)

    def ready(page):
        page.goto(url, wait_until='load', timeout=120000)
        page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=120000)

    def snap(page):
        return page.evaluate('capitalDriveSnapshot()')

    def select_map_point(page, x, z, touch=False):
        canvas = page.locator('#full-map')
        canvas.scroll_into_view_if_needed()
        rect = canvas.bounding_box()
        view = snap(page)['mapView']
        size = canvas.evaluate('(e) => ({width:e.width,height:e.height})')
        px = ((x - view['x']) * view['scale'] + size['width'] / 2) / size['width']
        py = ((z - view['z']) * view['scale'] + size['height'] / 2) / size['height']
        cx, cy = rect['x'] + px * rect['width'], rect['y'] + py * rect['height']
        if touch:
            page.touchscreen.tap(cx, cy)
        else:
            page.mouse.click(cx, cy)

    def check(condition, message):
        assert condition, message
        checks.append(message)
        print('PASS', message, flush=True)

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            page = context.new_page()
            track(page)
            ready(page)
            check(not snap(page)['rendering']['compatibility'], '3D renderer boots with the complete local map')
            check(snap(page)['pedestrians']['count'] == 80 and snap(page)['pedestrians']['visible'] > 0, 'walking pedestrians are populated around the driving area')
            check(snap(page)['neighbourhood']['frontages'] > 2000, 'gardens, driveways and street furniture are integrated')
            page.screenshot(path=str(output / 'desktop-intro.png'))
            page.get_by_role('button', name='Start driving').click()
            page.wait_for_function('capitalDriveSnapshot().discovered.includes("telopea")')
            before = snap(page)['player']
            people_before = snap(page)['pedestrians']['sample']
            page.keyboard.down('w')
            page.wait_for_timeout(1100)
            page.keyboard.down('d')
            page.keyboard.down('Space')
            page.wait_for_timeout(500)
            page.keyboard.up('w')
            page.keyboard.up('d')
            page.keyboard.up('Space')
            after = snap(page)['player']
            check(after['odometer'] > before['odometer'] + 4 and abs(after['yaw'] - before['yaw']) > .05, 'normal keyboard input accelerates, steers and drifts')
            people_after = snap(page)['pedestrians']['sample']
            check(any(math.hypot(a['x'] - b['x'], a['z'] - b['z']) > .1 for a, b in zip(people_before, people_after)), 'pedestrians move during normal play')
            page.keyboard.press('p')
            page.wait_for_selector('#pause-dialog[open]')
            paused = snap(page)['player']
            page.keyboard.down('w')
            page.wait_for_timeout(400)
            page.keyboard.up('w')
            check(snap(page)['player'] == paused, 'pause freezes simulation and releases driving input')
            page.locator('#resume-button').click()
            page.keyboard.press('m')
            page.wait_for_selector('#map-dialog[open]')
            parked = snap(page)['player']
            check(not page.locator('#teleport-button').is_enabled(), 'map teleport waits for an explicit destination')
            check(page.locator('#full-map').evaluate('(e) => Math.abs(e.width / e.height - e.clientWidth / e.clientHeight) < .01'),
                  'map canvas preserves geographic aspect ratio')
            page.get_by_role('button', name='Zoom in', exact=True).click()
            check(snap(page)['mapView']['zoom'] > 1, 'map supports zooming for precise destination selection')
            map_before = snap(page)['mapView']
            rect = page.locator('#full-map').bounding_box()
            page.mouse.move(rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2)
            page.mouse.down()
            page.mouse.move(rect['x'] + rect['width'] / 2 + 60, rect['y'] + rect['height'] / 2 + 20, steps=8)
            page.mouse.up()
            map_after = snap(page)['mapView']
            check(map_after['x'] < map_before['x'] and map_after['z'] < map_before['z'] and snap(page)['mapSelection'] is None,
                  'dragging pans the map without selecting or teleporting')
            select_map_point(page, 160, -430)
            check(math.hypot(snap(page)['mapSelection']['x'] - 160, snap(page)['mapSelection']['z'] + 430) < .01,
                  'zoomed and panned map selection matches the world point')
            page.screenshot(path=str(output / 'map-teleport.png'))
            page.get_by_role('button', name='Zoom out', exact=True).click()
            select_map_point(page, 160, -430)
            selected = snap(page)['mapSelection']
            check(math.hypot(selected['x'] - 160, selected['z'] + 430) < .01 and snap(page)['player'] == parked,
                  'clicking the CSS-scaled map selects the correct world point without moving the car')
            page.locator('#teleport-button').click()
            arrived = snap(page)['player']
            check(math.hypot(arrived['x'] - 160, arrived['z'] + 430) < .01 and abs(arrived['speed']) < .01,
                  'teleport reaches a chosen off-road park point exactly and stops the vehicle')
            check(abs(arrived['odometer'] - parked['odometer']) < .01, 'teleport preserves the driven trip distance')
            page.keyboard.press('m')
            select_map_point(page, 160, -430)
            page.keyboard.press('ArrowRight')
            check(abs(snap(page)['mapSelection']['x'] - 200) < .01, 'keyboard arrows move the map selection')
            page.keyboard.press('Enter')
            check(abs(snap(page)['player']['x'] - 200) < .01 and not page.locator('#map-dialog').is_visible(), 'Enter teleports from the focused map')
            page.keyboard.press('m')
            page.locator('[data-place="redhill"]').get_by_role('button', name='Set route').click()
            check(snap(page)['routePoints'] > 10, 'Red Hill route follows the connected road graph')
            page.screenshot(path=str(output / 'canberra-map.png'))
            page.locator('[data-place="redhill"]').get_by_role('button', name='Start nearby').click()
            page.wait_for_function('capitalDriveSnapshot().discovered.includes("redhill")')
            check(snap(page)['pedestrians']['visible'] > 0, 'map arrivals repopulate nearby walking pedestrians')
            page.screenshot(path=str(output / 'red-hill.png'))
            page.get_by_role('button', name='Vehicle', exact=True).click()
            page.get_by_label('Paint', exact=True).select_option('#394956')
            page.get_by_role('button', name='Suburban SUV').click()
            check(page.locator('#car-label').inner_text() == 'SUV', 'vehicle and paint selectors update the playable car')
            page.keyboard.press('r')
            page.wait_for_timeout(200)
            check(abs(snap(page)['player']['speed']) < 1, 'recovery returns the car to a road at rest')
            for ident in ['manuka', 'kingston', 'foreshore', 'griffith', 'narrabundah', 'telopea']:
                page.keyboard.press('m')
                page.locator(f'[data-place="{ident}"]').get_by_role('button', name='Start nearby').click()
                page.wait_for_function('(id) => capitalDriveSnapshot().discovered.includes(id)', arg=ident)
            check(len(snap(page)['discovered']) == 7, 'all seven places are discoverable using the normal map controls')
            page.wait_for_timeout(300)
            page.screenshot(path=str(output / 'telopea-driving.png'))
            page.keyboard.press('p')
            page.get_by_label('Appearance', exact=True).select_option('light')
            page.locator('#resume-button').click()
            page.screenshot(path=str(output / 'desktop-light.png'))
            page.reload(wait_until='load')
            page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=120000)
            check(len(snap(page)['discovered']) == 7, 'discovery progress survives a normal reload')
            page.close()

            # Explicit fixtures exercise unavailable APIs, without granting gameplay progress.
            fallback = context.new_page()
            fallback.add_init_script("const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type,...args){return type.startsWith('webgl') ? null : original.call(this,type,...args)};")
            track(fallback)
            ready(fallback)
            check(snap(fallback)['rendering']['compatibility'], 'missing WebGL has an explicit playable map fallback')
            fallback.get_by_role('button', name='Start driving').click()
            fallback.keyboard.down('w')
            fallback.wait_for_timeout(750)
            fallback.keyboard.up('w')
            check(snap(fallback)['player']['odometer'] > 1, 'compatibility view uses the same working driving simulation')
            fallback.screenshot(path=str(output / 'compatibility-view.png'))
            fallback.close()
            denied = context.new_page()
            denied.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage disabled','SecurityError')}})")
            track(denied)
            ready(denied)
            denied.get_by_role('button', name='Start driving').click()
            denied.keyboard.press('p')
            check('could not be loaded' in denied.locator('#save-status').inner_text(), 'storage denial is reported without preventing play')
            denied.close()

            phone = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            mobile = phone.new_page()
            track(mobile)
            ready(mobile)
            mobile.screenshot(path=str(output / 'phone-intro.png'))
            mobile.get_by_role('button', name='Start driving').click()
            check(mobile.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'phone layout has no horizontal overflow')
            for button in mobile.locator('[data-drive]').all():
                rect = button.bounding_box()
                check(rect and rect['width'] >= 44 and rect['height'] >= 44, 'touch driving target is at least 44 pixels')
            mobile.screenshot(path=str(output / 'phone-driving.png'))
            mobile.get_by_role('button', name='Map', exact=True).click()
            select_map_point(mobile, 160, -430, touch=True)
            check(mobile.locator('#teleport-button').is_enabled(), 'a real touch tap selects a map teleport point')
            mobile.locator('#teleport-button').click()
            check(abs(snap(mobile)['player']['x'] - 160) < .01, 'touch map teleport reaches the selected park point')
            mobile.get_by_role('button', name='Pause').click()
            mobile.get_by_label('Appearance', exact=True).select_option('light')
            mobile.locator('#resume-button').click()
            mobile.screenshot(path=str(output / 'phone-light.png'))
            phone.close()
            context.close()
            browser.close()
        check(not errors, 'no console or uncaught page errors: ' + str(errors))
        check(not failures, 'all local assets loaded successfully: ' + str(failures))
        check(not external, 'no third-party runtime requests: ' + str(external))
        report = dict(checks=len(checks), screenshots=sorted(p.name for p in output.glob('*.png')), errors=errors, failures=failures, external=external)
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2), flush=True)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
