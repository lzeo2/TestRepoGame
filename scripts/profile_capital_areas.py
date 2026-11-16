#!/usr/bin/env python3
"""Profile sourced districts, GPS and lazy interiors through normal browser UI.

Official Free-roam map travel is a controlled streaming fixture, not native
cross-city driving. Run alone on the shared heavy CPU slot with an exact export.
"""
import argparse
import functools
import http.server
import json
import math
from pathlib import Path
import signal
import threading
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright
import profile_capital_sustained as probe
from profile_capital_drive import QuietHandler, write_json

ROOT = Path(__file__).resolve().parents[1]
probe.DTO = """() => {const s=capitalDriveSnapshot();return {player:s.player,focus:s.focus,
 camera:s.camera,rendering:s.rendering,world:s.world,neighbourhood:s.neighbourhood,
 simulationElapsed:s.signals.elapsed,airport:s.airport,webgl:window.__sustainedGLCounts?.(),
 mapView:s.mapView,gameMode:s.gameMode,paused:s.paused,pedestrians:s.pedestrians,
 room:{id:s.interiors.active?.id,view:s.interiorView,peopleView:s.roomPeopleView,
 people:s.roomPeople.length,miniGame:s.miniGame.kind,phase:s.miniGame.phase},
 routePoints:s.routePoints,destination:s.destination,
 gameplay:{mode:s.gameplay.mode,wanted:s.gameplay.wanted,police:s.gameplay.police.length,
 health:s.gameplay.health,weapon:s.gameplay.weapon}};}"""


def full(page):
    probe.release(page)
    return page.evaluate('capitalDriveSnapshot()')


def walk(page, target, tolerance=2.3):
    for _ in range(100):
        state = full(page)
        pose, yaw = state['focus'], state['camera']['footYaw']
        dx, dz = target['x']-pose['x'], target['z']-pose['z']
        distance = math.hypot(dx, dz)
        if distance <= tolerance:
            return
        forward = (-math.sin(yaw)*dx-math.cos(yaw)*dz)/distance
        lateral = (math.cos(yaw)*dx-math.sin(yaw)*dz)/distance
        keys = []
        if abs(forward) >= .38:
            keys.append('w' if forward > 0 else 's')
        if abs(lateral) >= .38:
            keys.append('d' if lateral > 0 else 'a')
        for key in keys:
            page.keyboard.down(key)
        try:
            page.wait_for_timeout(160 if distance < 2 else 320)
        finally:
            probe.release(page)
    raise RuntimeError('Bounded physical foot approach did not reach its target')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenario', choices=['exteriors', 'interiors'], default='exteriors')
    args = parser.parse_args()
    root, output = args.root.resolve(), args.output.resolve()
    if any(output == parent or parent in output.parents for parent in (ROOT, root)):
        parser.error('Output must be outside repository and source export')
    output.mkdir(parents=True, exist_ok=False)
    report = {'scenario': args.scenario, 'samples': [], 'transitions': [], 'repositions': [],
              'transition_profiles': [], 'retained_memory': [], 'sources_before': probe.sources(root),
              'loaded_resources': {}, 'errors': [], 'http_errors': [], 'external_requests': [],
              'request_failures': [], 'limitations': [
                  'Cloud SwiftShader; no N100 FPS acceptance.',
                  'Official Free-roam map arrivals, not naturally driven routes.',
                  'Public snapshots construct full DTOs outside active CPU windows.',
                  'Paused forced-GC diagnostics are separate from active CPU samples.',
                  'Eight-second requested timers can overrun; actual metric/profile duration is retained.']}
    handler = functools.partial(QuietHandler, directory=str(root))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'

    def expire(*_):
        raise TimeoutError('Area profiling exceeded its 900-second watchdog')
    signal.signal(signal.SIGALRM, expire)
    signal.alarm(900)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
                context.add_init_script(probe.GL_INIT)
                def route(request):
                    if urlsplit(request.request.url).hostname in ('127.0.0.1', None):
                        request.continue_()
                    else:
                        report['external_requests'].append(request.request.url)
                        request.abort()
                context.route('**/*', route)
                page = context.new_page()
                page.set_default_timeout(30000)
                page.on('pageerror', lambda e: report['errors'].append(str(e)))
                page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                page.on('requestfailed', lambda r: report['request_failures'].append(r.url))
                def response_seen(response):
                    if response.status >= 400:
                        report['http_errors'].append({'url': response.url, 'status': response.status})
                    relative = unquote(urlsplit(response.url).path).lstrip('/')
                    path = root / relative
                    if path.is_dir():
                        path = path / 'index.html'
                    if path.is_file() and root in path.resolve().parents:
                        import hashlib
                        report['loaded_resources'][str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
                page.on('response', response_seen)
                page.goto(base+'/Games/Capital%20Drive/', wait_until='load', timeout=150000)
                page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=150000)
                page.locator('[data-game-mode=free]').click()
                page.locator('#guided-tutorial').uncheck()
                page.locator('#start-button').click()
                page.locator('#pause-button').click()
                page.locator('#quality').select_option('low')
                page.locator('#resume-button').click()
                session = context.new_cdp_session(page)
                browser_session = browser.new_browser_cdp_session()
                session.send('Performance.enable')
                session.send('Profiler.enable')
                session.send('Profiler.setSamplingInterval', {'interval': 1000})
                assert not full(page)['rendering']['compatibility'], '3D renderer required'
                def measure(name):
                    row = probe.sample(page, session, browser_session, output, name)
                    report['samples'].append(row)
                    write_json(output/'report.json', report)
                    print('SAMPLED', name, flush=True)
                def arrive(name, point):
                    probe.transition_profile(page, session, output, name, point, report)
                if args.scenario == 'exteriors':
                    data = [json.loads((root/'Games/Capital Drive/data'/f'{name}.json').read_text())
                            for name in ('canberra', 'canberra-north', 'airport')]
                    places = {p['id']: p for d in data for p in d.get('landmarks', [])}
                    for name in ('telopea', 'manuka', 'kingston', 'redhill', 'canberra-centre', 'canberra-airport'):
                        arrive(name, places[name])
                        measure(name+'-settled')
                    arrive('civic-gps-control', places['canberra-centre'])
                    measure('civic-without-gps')
                    page.locator('#map-button').click()
                    page.locator('#map-search').fill('Canberra Airport')
                    page.locator('#map-search-form button[type=submit]').click()
                    page.locator('#search-results button').first.click()
                    page.locator('#map-route-button').click()
                    page.wait_for_selector('#map-dialog', state='hidden')
                    start = probe.snapshot(page)['simulationElapsed']
                    for i in range(8):
                        measure(f'civic-active-gps-{i}')
                        if probe.snapshot(page)['simulationElapsed']-start >= 20:
                            break
                    report['gps_supplied_seconds'] = probe.snapshot(page)['simulationElapsed']-start
                    page.locator('#pause-button').click()
                    page.locator('#quality').select_option('performance')
                    page.locator('#resume-button').click()
                    measure('civic-performance-quality')
                    arrive('telopea-return', places['telopea'])
                    measure('telopea-return-performance')
                else:
                    for kind in ('gym', 'noodles'):
                        state = full(page)
                        door = state['gymEntry'] if kind == 'gym' else next(
                            s['frontage'] for s in state['services'] if s['id'] == 'store-5656111023')
                        arrive(kind+'-approach', {'x': door['x']-math.sin(door['yaw'])*10,
                                                'z': door['z']-math.cos(door['yaw'])*10})
                        if full(page)['gameplay']['mode'] != 'foot':
                            page.keyboard.press('e')
                        page.wait_for_function('capitalDriveSnapshot().gameplay.mode==="foot"')
                        car, pose = full(page)['player'], full(page)['focus']
                        dx, dz = door['x']-car['x'], door['z']-car['z']
                        length = math.hypot(dx, dz)
                        if length > 3:
                            fx, fz = dx/length, dz/length
                            side = 1 if (pose['x']-car['x'])*fz-(pose['z']-car['z'])*fx >= 0 else -1
                            walk(page, {'x': car['x']+fx*4.5+fz*side*4.5,
                                        'z': car['z']+fz*4.5-fx*side*4.5}, .8)
                        walk(page, door)
                        page.keyboard.press('e')
                        page.wait_for_function('capitalDriveSnapshot().interiors.active!==null')
                        plan = full(page)['interiors']['active']
                        report.setdefault('entered_rooms', []).append({'kind': kind, 'id': plan['id']})
                        measure(kind+'-indoor-idle')
                        measure(kind+'-indoor-repeat')
                        walk(page, plan['exit'], 1.1)
                        page.keyboard.press('e')
                        page.wait_for_function('capitalDriveSnapshot().interiors.active===null')
                        measure(kind+'-after-exit')
                report['complete'] = True
            finally:
                browser.close()
    except Exception as error:
        report['failure'] = str(error)
        raise
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        report['sources_after'] = probe.sources(root)
        report['sources_unchanged'] = report['sources_before'] == report['sources_after']
        write_json(output/'report.json', report)


if __name__ == '__main__':
    main()
