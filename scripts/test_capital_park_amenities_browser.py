#!/usr/bin/env python3
"""Photograph mapped park amenities through Capital Drive's normal Free roam controls."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import signal
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
VIEWPORT = {'width': 1000, 'height': 600}
SENSITIVITY = .0045


def activate(locator):
    locator.focus()
    locator.press('Enter', no_wait_after=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def observe(page):
    # Only export the fields used by the checks. No game objects are mutated.
    return page.evaluate('''() => {
      const s = window.capitalDriveSnapshot();
      return {mode:s.gameMode, started:s.started, paused:s.paused, focus:s.focus,
        onFoot:s.gameplay.mode === "foot", camera:s.camera, park:s.parkAmenities,
        selection:s.mapSelection, drone:s.drone.state, quality:s.rendering.quality, compatibility:s.rendering.compatibility};
    }''')


def face(page, target, offset, pitch):
    current = observe(page)
    focus, camera = current['focus'], current['camera']
    if current['drone']['active']:
        focus = current['drone']
    yaw = math.atan2(focus['x'] - target['x'], focus['z'] - target['z']) + offset
    delta = (camera['footYaw'] - yaw + math.pi) % (2 * math.pi) - math.pi
    dx, dy = delta / SENSITIVITY, (camera['footPitch'] - pitch) / SENSITIVITY
    box = page.locator('#world canvas').bounding_box()
    x = box['x'] + box['width'] * (.16 if dx >= 0 else .84)
    y = box['y'] + box['height'] * .5
    page.mouse.move(x, y)
    page.mouse.down(button='middle')
    try:
        page.mouse.move(x + dx, y + dy, steps=max(2, math.ceil(abs(dx)/110), math.ceil(abs(dy)/110)))
    finally:
        page.mouse.up(button='middle')


def photograph(page, query, out, report):
    page.locator('#world canvas').focus()
    page.keyboard.press('m')
    page.locator('#map-search').fill(query)
    page.locator('#map-search').press('Enter', no_wait_after=True)
    match = page.locator('#search-results button').filter(has_text=query).first
    match.wait_for(timeout=10000)
    title = match.inner_text()
    print('Selected', title, flush=True)
    report['lastSearch']={'query':query,'label':title}
    activate(match)
    target = observe(page)['selection']
    assert target and query.lower() in title.lower(), f'Search result did not match {query}'

    # Search centres the map at 5x. Move the landing marker away from the
    # equipment so the arriving car does not occupy the intended photograph.
    canvas = page.locator('#full-map')
    canvas.press('ArrowDown')
    desired = observe(page)['selection']
    separation = math.hypot(desired['x']-target['x'], desired['z']-target['z'])
    assert 4 <= separation <= 14, f'Expected a nearby mapped approach, got {separation:.1f} m'
    activate(page.locator('#teleport-button'))
    page.locator('#map-dialog').wait_for(state='hidden', timeout=10000)
    page.locator('#world canvas').focus()
    page.keyboard.press('e')
    page.wait_for_function('() => capitalDriveSnapshot().gameplay.mode === "foot"', polling=1200, timeout=12000)
    pose = observe(page)['focus']
    initial = math.hypot(pose['x']-target['x'],pose['z']-target['z'])
    assert initial < 35, f'{query} official travel arrived {initial:.1f} m away'
    print('On foot',query,'at',round(initial,2),'metres',flush=True)
    report['lastArrival']={'query':query,'distance':round(initial,3),'focus':pose,'target':target}
    page.screenshot(path=str(out/f'{query}-arrival.png'),timeout=20000)
    if initial > 3.8:
        face(page, target, 0, 0)
        page.keyboard.down('w')
        try:
            page.wait_for_function('''p => {
              const f=capitalDriveSnapshot().focus;
              return Math.hypot(f.x-p.x, f.z-p.z) < 3.8;
            }''', arg={'x':target['x'], 'z':target['z']}, polling=600, timeout=35000)
        finally:
            page.keyboard.up('w')
    # A slight three-quarter angle keeps the foreground player away from the subject.
    face(page, target, .2, -.16)
    page.wait_for_timeout(1600)
    state = observe(page)
    distance = math.hypot(state['focus']['x']-target['x'],state['focus']['z']-target['z'])
    assert distance <= 4.5, f'{query} is too far from the player for the close view'
    assert state['onFoot'] and state['mode'] == 'free' and not state['paused']
    assert state.get('park'), 'Park renderer diagnostics missing'
    kind='bbqs' if query.startswith('BBQ') else 'fountains'
    assert state['park'][kind] > 0 and state['park']['drawCalls'] > 0, f'{query} inactive in park renderer'
    page.screenshot(path=str(out/f'{query}-on-foot.png'),timeout=20000)

    # The built-in Free roam camera drone can take a closer unobstructed photo.
    page.locator('#world canvas').focus()
    page.keyboard.press('t')
    activate(page.locator('#city-drone-open'))
    activate(page.locator('#city-drone-launch'))
    page.wait_for_function('() => capitalDriveSnapshot().drone.state.active', polling=1200, timeout=10000)
    drone = observe(page)['drone']
    horizontal = math.hypot(drone['x'] - target['x'], drone['z'] - target['z'])
    pitch = math.atan2(.85 - drone['altitude'], max(.5, horizontal))
    face(page, target, 0, pitch)
    page.wait_for_timeout(2200)
    page.screenshot(path=str(out/f'{query}.png'),timeout=20000)
    photo = observe(page)
    page.locator('#world canvas').focus()
    page.keyboard.press('o')
    page.wait_for_function('() => !capitalDriveSnapshot().drone.state.active', polling=1200, timeout=10000)
    report['visits'].append({'query':query, 'label':title, 'selection':target, 'arrivalDistance':initial,
        'footDistance':distance, 'photoDistance':horizontal, 'camera':photo['camera'], 'drone':drone, 'park':photo['park']})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--build', required=True)
    parser.add_argument('--bbq', required=True, help='Barbecue asset ID from the park dataset')
    parser.add_argument('--fountain', required=True, help='Drinking fountain asset ID from the park dataset')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--quality', choices=('performance','low','standard','realism'), default='performance')
    args = parser.parse_args()
    out = args.output.resolve()
    if ROOT == out or ROOT in out.parents or out.exists():
        parser.error('Choose a fresh output directory outside the repository.')
    if not args.bbq.isalnum() or not args.fountain.isalnum():
        parser.error('Use the alphanumeric asset IDs from the park dataset.')
    out.mkdir(parents=True)
    report = {'build':args.build,'quality':args.quality,'viewport':VIEWPORT,'visits':[],'external':[],'errors':[]}
    started = time.monotonic()
    server = ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    base = f'http://127.0.0.1:{server.server_port}'
    threading.Thread(target=server.serve_forever,daemon=True).start()

    def expire(*_):
        raise TimeoutError('Park browser run exceeded twelve minutes')

    signal.signal(signal.SIGALRM,expire)
    signal.alarm(720)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
            try:
                context = browser.new_context(viewport=VIEWPORT, device_scale_factor=.8, service_workers='block')
                page = context.new_page()
                page.on('pageerror',lambda error:report['errors'].append(str(error)))
                page.on('request',lambda r:report['external'].append(r.url)
                    if urlsplit(r.url).scheme in ('http','https') and not r.url.startswith(base+'/') else None)
                try:
                    page.goto(base+'/Games/Capital%20Drive/',wait_until='domcontentloaded',timeout=45000)
                    page.wait_for_function("() => document.querySelector('#loading')?.textContent === 'Ready'",polling=1800,timeout=425000)
                    report['readySeconds'] = round(time.monotonic()-started,2)
                    print('World ready',report['readySeconds'],'seconds',flush=True)
                    assert page.locator('#build-version').inner_text() == args.build, 'Build badge changed'
                    activate(page.locator('[data-game-mode=free]'))
                    tutor = page.locator('#guided-tutorial')
                    if tutor.is_checked():
                        tutor.press('Space', no_wait_after=True)
                    page.locator('#startup-quality').select_option(args.quality)
                    activate(page.locator('#start-button'))
                    page.wait_for_function('() => capitalDriveSnapshot().started',polling=1200)
                    assert not observe(page)['compatibility'], 'Software WebGL failed to start'
                    report['startedSeconds'] = round(time.monotonic()-started,2)
                    for query in (args.bbq,args.fountain):
                        photograph(page, query, out, report)
                        print('Photographed', query, flush=True)
                    assert not report['errors'], report['errors']
                    assert not report['external'], report['external']
                    report['status'] = 'PASS'
                except Exception:
                    try:
                        report['lastState'] = observe(page)
                        page.screenshot(path=str(out/'failure.png'),timeout=8000)
                    except Exception:
                        pass
                    raise
            finally:
                browser.close()
    except Exception as error:
        report['status'] = 'FAIL'
        report['failure'] = str(error)
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        report['elapsedSeconds'] = round(time.monotonic()-started, 2)
        (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(report['status'],report.get('failure',''),report['elapsedSeconds'],'seconds',flush=True)
    return int(report['status'] != 'PASS')


if __name__ == '__main__':
    raise SystemExit(main())
