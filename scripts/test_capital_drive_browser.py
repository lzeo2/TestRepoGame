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
_ADDRESS = next(item for item in json.loads((ROOT / 'Games/Capital Drive/data/addresses.json').read_text())['addresses'] if item.get('number') and item.get('street'))
ADDRESS_QUERY = f"{_ADDRESS['number']} {_ADDRESS['street']}"


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

    def frames(page, count=8):
        page.evaluate('(count) => new Promise(resolve => { let n = 0; function tick(){ if (++n >= count) resolve(); else requestAnimationFrame(tick); } requestAnimationFrame(tick); })', count)

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
            page.locator('[data-game-mode=free]').click()
            page.get_by_role('button', name='Start driving').click()
            page.wait_for_function('capitalDriveSnapshot().discovered.includes("telopea")')
            before = snap(page)['player']
            people_before = snap(page)['pedestrians']['sample']
            page.keyboard.down('w')
            page.wait_for_function('(start) => capitalDriveSnapshot().player.odometer > start.odometer + 5', arg=before, timeout=15000)
            page.keyboard.down('d')
            page.keyboard.down('Space')
            page.wait_for_function('(start) => Math.abs(capitalDriveSnapshot().player.yaw - start.yaw) > .08', arg=before, timeout=15000)
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
            frames(page)
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
            page.keyboard.press('m')
            for query in ['Parliament House', ADDRESS_QUERY]:
                page.locator('#map-search').fill(query)
                page.locator('#map-search-form').get_by_role('button', name='Search', exact=True).click()
                result = page.locator('#search-results button').first
                result.wait_for(state='visible')
                result.click()
                selected_search = snap(page)['mapSelection']
                check(page.locator('#full-map').evaluate('(e) => document.activeElement === e'), 'search selection focuses the map: ' + query)
                page.locator('#teleport-button').click()
                arrival = snap(page)['player']
                check(math.hypot(arrival['x'] - selected_search['x'], arrival['z'] - selected_search['z']) < 150 and abs(arrival['speed']) < .01,
                      'Free roam search reaches a safely adjusted local point: ' + query)
                if query == 'Parliament House':
                    page.keyboard.press('m')
                    select_map_point(page, selected_search['x'], selected_search['z'] - 350)
                    page.locator('#teleport-button').click()
                    view = page.locator('#world canvas').bounding_box()
                    page.mouse.move(view['x'] + view['width'] * .5, view['y'] + view['height'] * .5)
                    car = snap(page)['player']
                    toward = math.atan2(-(selected_search['x'] - car['x']), -(selected_search['z'] - car['z']))
                    orbit_delta = (toward - car['yaw'] + math.pi) % (2 * math.pi) - math.pi
                    page.mouse.down()
                    page.mouse.move(view['x'] + view['width'] * .5 - orbit_delta / .006,
                                    view['y'] + view['height'] * .5 - 110, steps=20)
                    frames(page, 24)
                    page.mouse.up()
                    check(snap(page)['camera']['lookPitch'] > .3, 'normal vertical mouse orbit pitches the camera toward the landmark skyline')
                    check(snap(page)['landmarks']['visibleNear'] + snap(page)['landmarks']['visibleDistant'] > 0, 'dedicated landmarks are visible after normal Parliament House search travel')
                    page.screenshot(path=str(output / 'parliament-house.png'))
                page.keyboard.press('m')
            page.get_by_role('button', name='Close map').click()
            page.get_by_role('button', name='Garage', exact=True).click()
            page.get_by_label('Paint', exact=True).select_option('#394956')
            page.get_by_role('button', name='Suburban SUV').click()
            check(page.locator('#car-label').inner_text() == 'SUV', 'vehicle and paint selectors update the playable car')
            page.get_by_role('button', name='Close vehicle selection').click()
            page.keyboard.press('r')
            page.wait_for_function('Math.abs(capitalDriveSnapshot().player.speed) < 1')
            check(abs(snap(page)['player']['speed']) < 1, 'recovery returns the car to a road at rest')
            for ident in [place['id'] for place in snap(page)['places']]:
                page.keyboard.press('m')
                page.locator(f'[data-place="{ident}"]').get_by_role('button', name='Start nearby').click()
                page.wait_for_function('(id) => capitalDriveSnapshot().discovered.includes(id)', arg=ident)
                if ident in ['old-parliament-house', 'manuka-oval', 'kingston-powerhouse']:
                    frames(page, 8)
                    page.screenshot(path=str(output / (ident + '.png')))
            check(len(snap(page)['discovered']) == snap(page)['totalPlaces'], 'all mapped places are discoverable using the normal map controls')
            frames(page)
            page.screenshot(path=str(output / 'telopea-driving.png'))
            page.keyboard.press('p')
            page.get_by_label('Appearance', exact=True).select_option('light')
            page.locator('#resume-button').click()
            page.screenshot(path=str(output / 'desktop-light.png'))
            page.reload(wait_until='load')
            page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=120000)
            check(len(snap(page)['discovered']) == snap(page)['totalPlaces'], 'discovery progress survives a normal reload')
            page.close()

            # Independent career context: every positive action uses ordinary UI/input.
            street_context = browser.new_context(viewport={'width': 1280, 'height': 800})
            street = street_context.new_page()
            track(street)
            ready(street)
            street.get_by_role('button', name='Start driving').click()
            check(snap(street)['gameMode'] == 'street', 'Street Life is the normal starting mode')
            frames(street, 20)
            check(snap(street)['gameplay']['wanted'] == 0, 'stationary Street Life player is not blamed for ambient traffic offences')
            street.keyboard.press('j')
            street.locator('.job-option').filter(has=street.get_by_role('heading', name='Crescent parcel', exact=True)).get_by_role('button', name='Start job').click()
            street.locator('#job-progress').filter(has_text='Stage 2/2').wait_for(state='visible', timeout=15000)
            initial_cash = snap(street)['career']['cash']
            street.keyboard.down('w')
            try:
                street.wait_for_function('capitalDriveSnapshot().career.completedJobs.includes("crescent-parcel")', timeout=30000)
            finally:
                street.keyboard.up('w')
            check(snap(street)['career']['cash'] == initial_cash + 300, 'normal driving completes parcel delivery and earns exactly $300')
            earned = snap(street)['career']
            street.reload(wait_until='load')
            street.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=120000)
            check(snap(street)['career'] == earned, 'career cash, owned vehicles and completed jobs survive reload')
            street.get_by_role('button', name='Start driving').click()
            street.keyboard.press('m')
            street.wait_for_selector('#map-dialog[open]')
            check(not street.locator('#teleport-button').is_visible() and street.get_by_role('button', name='Start nearby').count() == 0,
                  'Street Life exposes neither Teleport nor Start nearby')
            stationary = snap(street)['player']
            select_map_point(street, 160, -430)
            street.locator('#full-map').focus()
            street.keyboard.press('Enter')
            check(snap(street)['player'] == stationary and snap(street)['routePoints'] > 0, 'Street Life map Enter sets a route without moving the car')
            # Explicit negative fixture invokes an inaccessible action to test its guard.
            street.locator('#teleport-button').evaluate('(button) => button.click()')
            check(snap(street)['player'] == stationary, 'hidden teleport action handler rejects Street Life travel')
            if street.locator('#map-dialog').is_visible():
                street.get_by_role('button', name='Close map').click()
            street.keyboard.press('e')
            street.wait_for_function('capitalDriveSnapshot().gameplay.mode === "foot"', timeout=10000)
            actor_before = snap(street)['gameplay']['actor']
            street.keyboard.down('w')
            street.wait_for_function('(a) => Math.hypot(capitalDriveSnapshot().gameplay.actor.x-a.x,capitalDriveSnapshot().gameplay.actor.z-a.z) > .6', arg=actor_before, timeout=10000)
            street.keyboard.down('Shift')
            street.wait_for_function('capitalDriveSnapshot().gameplay.actor.speed > 5', timeout=10000)
            street.keyboard.up('Shift')
            street.keyboard.up('w')
            check(snap(street)['gameplay']['mode'] == 'foot', 'E exits the stopped car and WASD/Shift walk and sprint')
            street.keyboard.down('Space')
            street.wait_for_function('capitalDriveSnapshot().gameplay.actor.jumpHeight > .1', timeout=10000)
            street.keyboard.up('Space')
            check(snap(street)['gameplay']['actor']['jumpHeight'] > 0, 'Space makes the walking actor jump')
            street.keyboard.press('1')
            check(snap(street)['gameplay']['weapon'] == 'unarmed', '1 selects fists')
            street.keyboard.press('2')
            street.wait_for_function('capitalDriveSnapshot().gameplay.weapon === "pistol"')
            ammo = snap(street)['gameplay']['ammo']
            rect = street.locator('#world canvas').bounding_box()
            street.mouse.move(rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2)
            street.mouse.down(button='right')
            street.wait_for_function('capitalDriveSnapshot().gameplay.aiming')
            street.mouse.down(button='left')
            street.wait_for_function('(a) => capitalDriveSnapshot().gameplay.ammo < a', arg=ammo, timeout=10000)
            street.mouse.up(button='left')
            street.mouse.up(button='right')
            check(snap(street)['gameplay']['ammo'] < ammo, 'right mouse aims and left mouse fires a real round')
            street.wait_for_function('capitalDriveSnapshot().gameplay.wanted > 0 && capitalDriveSnapshot().gameplay.police.length > 0', timeout=15000)
            check(snap(street)['gameplay']['police'] != [], 'witnessed gunfire raises wanted level and deploys police')
            street.keyboard.press('p')
            street.wait_for_selector('#pause-dialog[open]')
            paused_gameplay = snap(street)['gameplay']
            street.keyboard.down('w')
            frames(street)
            street.keyboard.up('w')
            check(snap(street)['gameplay'] == paused_gameplay, 'pause freezes character pose, health and police dynamics')
            street.locator('#resume-button').click()
            street.screenshot(path=str(output / 'street-life-on-foot.png'))
            street_context.close()

            # Explicit fixtures exercise unavailable APIs, without granting gameplay progress.
            fallback = context.new_page()
            fallback.add_init_script("const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type,...args){return type.startsWith('webgl') ? null : original.call(this,type,...args)};")
            track(fallback)
            ready(fallback)
            check(snap(fallback)['rendering']['compatibility'], 'missing WebGL has an explicit playable map fallback')
            fallback.locator('[data-game-mode=free]').click()
            fallback.get_by_role('button', name='Start driving').click()
            fallback.keyboard.down('w')
            fallback.wait_for_function('capitalDriveSnapshot().player.odometer > 1', timeout=15000)
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
            for button in mobile.locator('#touch-actions button').all():
                rect = button.bounding_box()
                check(rect and rect['width'] >= 44 and rect['height'] >= 44, 'touch character target is at least 44 pixels')
            check(snap(mobile)['gameMode'] == 'street', 'phone starts in Street Life')
            mobile.get_by_role('button', name='Enter or exit vehicle').tap()
            mobile.wait_for_function('capitalDriveSnapshot().gameplay.mode === "foot"', timeout=10000)
            check(snap(mobile)['gameplay']['mode'] == 'foot', 'phone E action exits the car')
            frames(mobile, 20)
            check(snap(mobile)['gameplay']['wanted'] == 0, 'stationary phone pedestrian is not blamed for ambient traffic offences')
            mobile.screenshot(path=str(output / 'phone-street-life.png'))
            mobile.get_by_role('button', name='Pause', exact=True).tap()
            mobile.get_by_role('button', name='Change mode').tap()
            mobile.locator('[data-game-mode=free]').tap()
            mobile.get_by_role('button', name='Start driving').tap()
            check(snap(mobile)['gameMode'] == 'free' and snap(mobile)['gameplay']['mode'] == 'vehicle', 'phone mode switch resets into Free roam driving')
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
    except Exception as error:
        report = dict(checks=len(checks), passed=checks, error=str(error), errors=errors, failures=failures, external=external,
                      screenshots=sorted(p.name for p in output.glob('*.png')))
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        raise
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
