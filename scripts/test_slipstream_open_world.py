#!/usr/bin/env python3
"""Bounded normal-input city/progression check. Run only after source is frozen.

No grants, save seeding, simulation stepping or snapshot mutation. A completed
highway race proves earned mileage, not city escape. This does not certify
natural escape, whole-fleet balance, visual quality, rights or hardware speed.
Also checks the cached Wardline renderer in ordinary city/highway chases.
"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import json
import math
import time
from pathlib import Path
import shutil
import tempfile
import threading
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    output = Path(tempfile.mkdtemp(prefix='slipstream-city-'))
    sources = list((ROOT / 'Games/Slipstream Borough').glob('*')) + list((ROOT / 'assets/car-arcade').glob('*.js'))
    sources += [ROOT / 'assets/car-arcade/vendor/three.module.js', ROOT / 'assets/car-arcade/vendor/BufferGeometryUtils.js', Path(__file__)]
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources if p.is_file()}
    errors = []

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    print('OUTPUT=' + str(output), flush=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = None
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 900}, has_touch=True)
                page = context.new_page()
                page.set_default_timeout(20000)
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                page.on('requestfailed', lambda r: errors.append(r.url + ':' + str(r.failure)))
                page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
                page.route('**/*', lambda r: r.continue_() if urlsplit(r.request.url).netloc == urlsplit(origin).netloc else (errors.append('External ' + r.request.url), r.abort()))

                def snapshot():
                    return page.evaluate('slipstreamSnapshot')

                def ready():
                    page.wait_for_function('window.slipstreamSnapshot?.view?.frames>1 && slipstreamSnapshot.phase==="run" && slipstreamSnapshot.run.mode==="roam"')

                def patrol():
                    page.wait_for_function('slipstreamSnapshot.view.policeModels.length===slipstreamSnapshot.run.police.length && slipstreamSnapshot.view.policeModels.length>0')
                    state = snapshot()
                    assert page.evaluate('Object.isFrozen(slipstreamSnapshot.view.policeModels[0].pose)')
                    for model, cop in zip(state['view']['policeModels'], state['run']['police']):
                        assert model['id'] == 'wardline' and model['carId'] == cop['carId'] == 'lantern'
                        assert model['triangles'] <= 8000 and model['drawCalls'] <= 12
                        assert abs(model['wheelAngle']) > 0
                        if state['run']['mode'] == 'roam':
                            assert model['pose'] == cop['world']
                        else:
                            assert model['pose'] == {'x': cop['x'], 'z': -(cop['distance'] - state['run']['distance']), 'heading': 0}
                    assert state['view']['textureCount'] <= 4  # Three local road signs plus one shared police map.
                    return state['view']['policeModels']

                def traffic():
                    state = snapshot()
                    entities = {e['id']: e for e in state['run']['traffic']}
                    models = state['view']['trafficModels']
                    assert 1 <= len(entities) <= 4 and len(models) == len(entities)
                    assert page.evaluate('Object.isFrozen(slipstreamSnapshot.view.trafficModels[0].pose)')
                    for model in models:
                        entity = entities[model['entityId']]
                        assert model['carId'] == entity['carId']
                        assert model['pose'] == entity['world']
                        assert all(math.isfinite(v) for v in model['pose'].values()) and math.isfinite(model['wheelAngle'])
                    return models

                page.goto(origin + '/Games/Slipstream%20Borough/')
                ready()
                first = snapshot()
                assert first['profile']['cash'] == 0 and not first['profile']['testMode']
                assert first['run']['pursuit'] == 'roaming' and first['run']['speed'] == 0
                assert first['run']['world']['x'] == first['run']['world']['z'] == 0
                assert first['view']['worldMode'] == 'roam' and first['view']['cityBlocks'] == 36
                assert first['view']['pose'] == first['run']['world']
                assert page.locator('#drive').is_visible() and page.locator('#cruise').is_visible()
                assert page.locator('#help').is_visible() and page.locator('#pause').is_visible()
                assert page.evaluate('Object.isFrozen(slipstreamSnapshot.run.world)')
                first_traffic = traffic()
                assert first['view']['drawcalls'] <= 80 and first['view']['triangles'] <= 45000
                page.wait_for_function('(previous) => slipstreamSnapshot.view.trafficModels.some(m=>{const old=previous.find(e=>e.entityId===m.entityId);return old&&Math.hypot(m.pose.x-old.pose.x,m.pose.z-old.pose.z)>.5&&Math.abs(m.wheelAngle-old.wheelAngle)>.1})', arg=first_traffic)
                moving_traffic = traffic()
                assert any(a['pose'] != b['pose'] for a, b in zip(first_traffic, moving_traffic))
                assert snapshot()['run']['distance'] == 0 and snapshot()['profile']['cash'] == 0
                page.keyboard.down('w')
                page.wait_for_function('slipstreamSnapshot.run.distance>40')
                page.keyboard.down('d')
                page.wait_for_function('Math.abs(slipstreamSnapshot.run.world.heading)>.04')
                page.keyboard.up('d')
                page.keyboard.up('w')
                moved = snapshot()['run']
                assert moved['world'] != first['run']['world'] and moved['pursuit'] == 'roaming'
                page.keyboard.down('s')
                page.wait_for_function('slipstreamSnapshot.run.speed<.1')
                page.keyboard.up('s')
                page.wait_for_function('slipstreamSnapshot.run.pursuit==="chased" && slipstreamSnapshot.run.police.length>0', timeout=45000)
                cop = snapshot()['run']['police'][0]['world']
                page.wait_for_function('(p) => slipstreamSnapshot.run.police.some(c=>Math.hypot(c.world.x-p.x,c.world.z-p.z)>.5)', arg=cop)
                page.wait_for_function('slipstreamSnapshot.run.police.some(c=>Math.hypot(c.world.x-slipstreamSnapshot.run.world.x,c.world.z-slipstreamSnapshot.run.world.z)<5.5)')
                page.locator('#pause').click()
                frozen = snapshot()['run']
                city_models = patrol()
                city_traffic = traffic()
                page.wait_for_timeout(2000)
                assert snapshot()['run'] == frozen
                assert snapshot()['view']['policeModels'] == city_models and traffic() == city_traffic
                page.screenshot(path=str(output / 'city-patrol.jpg'), quality=90)
                page.locator('#theme').click()
                page.screenshot(path=str(output / 'city-patrol-dark.jpg'), quality=90)
                page.locator('#theme').click()
                page.set_viewport_size({'width': 390, 'height': 844})
                page.screenshot(path=str(output / '390-patrol.jpg'), quality=90)
                page.set_viewport_size({'width': 1280, 'height': 900})
                page.locator('#leave').click()
                page.wait_for_function('slipstreamSnapshot.view.policeModels.length===0 && slipstreamSnapshot.view.world.police===0 && slipstreamSnapshot.view.trafficModels.length===0')
                parked = snapshot()['profile']
                assert parked['careerDistance'] == int(frozen['distance'])
                assert parked['cash'] >= 0 and not parked['testMode']
                page.reload()
                ready()
                assert snapshot()['profile']['careerDistance'] == parked['careerDistance']
                assert snapshot()['profile']['cash'] == parked['cash']
                traffic()
                page.locator('#leave').click()  # zero-distance fresh run cannot repay the previous run
                assert snapshot()['profile']['careerDistance'] == parked['careerDistance']
                assert snapshot()['profile']['cash'] == parked['cash']
                assert 'Next free car:' in page.locator('#career').inner_text()
                assert 'Mileage locked' in page.locator('#catalog').inner_text()
                options = page.locator('#gadget').inner_text()
                assert all(category in options for category in ['discreet', 'loud', 'utility'])
                assert page.locator('#gadget option[value="repair"]').is_disabled()
                assert 'locked until 3500 m' in page.locator('#gadget option[value="repair"]').inner_text()
                page.locator('#paint').fill('#173d69')
                page.locator('#wheelColor').fill('#b59a61')
                page.locator('#stripe').fill('#f2e8c4')
                page.locator('#stripeEnabled').check()
                page.locator('#spoiler').check()
                page.locator('#applyFinish').click()
                finish = snapshot()['profile']['customizations']['bricklet']
                assert finish['stripe'] == '#f2e8c4' and finish['spoiler'] is True
                page.wait_for_function('slipstreamSnapshot.view.customization.stripe==="#f2e8c4" && slipstreamSnapshot.view.customization.spoiler && slipstreamSnapshot.view.customization.stripeSegments===12')
                striped_draws = snapshot()['view']['drawcalls']
                page.locator('#stripeEnabled').uncheck()
                page.locator('#applyFinish').click()
                page.wait_for_function('slipstreamSnapshot.view.customization.stripeSegments===0')
                assert snapshot()['view']['drawcalls'] == striped_draws - 1
                page.locator('#stripeEnabled').check()
                page.locator('#applyFinish').click()
                page.wait_for_function('slipstreamSnapshot.view.customization.stripeSegments===12')
                assert snapshot()['view']['drawcalls'] == striped_draws
                page.locator('#viewport').scroll_into_view_if_needed()
                page.screenshot(path=str(output / 'garage-custom.jpg'), quality=90)

                # Ordinary highway play is an explicitly separate earned-mileage check.
                page.locator('#mode').select_option('race')
                page.locator('#start').click()
                page.locator('#cruise').check()
                page.locator('#viewport').focus()
                page.keyboard.down('a')
                page.wait_for_function('slipstreamSnapshot.run.x<.1')
                page.keyboard.up('a')
                race_started = time.monotonic()
                assert page.locator('#deploy').is_hidden()
                page.wait_for_function('slipstreamSnapshot.phase==="end"', timeout=110000)
                race_wall_seconds = time.monotonic() - race_started
                race = snapshot()
                assert race['view']['policeModels'] == [] and race['view']['world']['police'] == 0
                assert race['run']['status'] == 'finished'
                assert race['profile']['careerDistance'] >= 1200 and 'pip' in race['profile']['owned']
                assert not race['profile']['testMode']
                page.locator('#garageButton').click()
                assert page.locator('#gadget option[value="repair"]').is_disabled()
                page.locator('#gadget').select_option('smoke')
                page.locator('#fitGadget').click()
                assert snapshot()['profile']['customizations']['bricklet']['gadget'] == 'smoke'
                saved = snapshot()['profile']
                page.reload()
                ready()
                assert snapshot()['profile']['cash'] == saved['cash']
                assert snapshot()['profile']['customizations'] == saved['customizations']
                page.keyboard.press('Space')
                page.wait_for_function('slipstreamSnapshot.run.deployments===1')
                assert snapshot()['run']['charges'] == 2
                assert page.locator('#deploy').is_disabled()
                page.locator('#pause').click()
                frozen = snapshot()['run']
                page.wait_for_timeout(200)
                assert snapshot()['run'] == frozen
                page.locator('#leave').click()
                page.locator('#mode').select_option('roam')
                page.set_viewport_size({'width': 390, 'height': 844})
                page.locator('#start').tap()
                traffic()
                assert snapshot()['run']['charges'] == 3
                page.locator('#deploy').tap()
                page.wait_for_function('slipstreamSnapshot.run.deployments===1')
                # Real held touchscreen gas, not a synthetic JS click or simulation call.
                gas = page.locator('[data-drive="gas"]')
                gas.scroll_into_view_if_needed()
                box = gas.bounding_box()
                cdp = context.new_cdp_session(page)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2}]})
                try:
                    page.wait_for_function('slipstreamSnapshot.run.distance>1')
                finally:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                    cdp.detach()
                for width, height in [(320, 740), (390, 844)]:
                    page.set_viewport_size({'width': width, 'height': height})
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    for selector in ['#deploy', '#pause', '[data-drive="gas"]']:
                        box = page.locator(selector).bounding_box()
                        assert box['width'] >= 44 and box['height'] >= 44
                page.screenshot(path=str(output / '390-city.jpg'), quality=90)

                # The same live police factory is used by normal highway pursuit.
                page.locator('#leave').tap()
                page.set_viewport_size({'width': 1280, 'height': 900})
                page.locator('#mode').select_option('cutup')
                page.locator('#start').click()
                page.locator('#cruise').check()
                page.wait_for_function('slipstreamSnapshot.run.police.length>0', timeout=45000)
                page.wait_for_function('slipstreamSnapshot.view.policeModels[0]?.wheelAngle<0')
                page.locator('#pause').click()
                highway_models = patrol()
                page.screenshot(path=str(output / 'highway-patrol.jpg'), quality=90)
                page.locator('#leave').click()
                page.wait_for_function('slipstreamSnapshot.view.policeModels.length===0')
                # Reload tears down and recreates both factory caches; no new grant.
                page.reload()
                ready()
                assert snapshot()['view']['policeModels'] == []
                traffic()
                assert not snapshot()['profile']['testMode']
                assert not errors, errors
                assert all(hashlib.sha256((ROOT / p).read_bytes()).hexdigest() == h for p, h in hashes.items()), 'Source changed during acceptance'
                assert shutil.disk_usage(ROOT).free >= 2_000_000_000
                assert sum(p.stat().st_size for p in output.glob('*.jpg')) <= 10_000_000
                (output / 'result.json').write_text(json.dumps({'errors': errors, 'assisted': False, 'sourceHashes': hashes,
                    'cityBankedMeters': parked['careerDistance'], 'highwayEarnedMeters': race['run']['distance'],
                    'raceWallSeconds': race_wall_seconds, 'firstCityTrafficModels': first_traffic, 'movingCityTrafficModels': moving_traffic,
                    'naturalCityEscape': 'not tested', 'cityPoliceModels': city_models, 'highwayPoliceModels': highway_models}, indent=2) + '\n')
                print('PASS normal city movement/turning, real civilian traffic movement/poses/pause/removal/reload, live Wardline city/highway patrol, pause/removal/reload, one-shot parking, earned highway mileage unlock, saved stripe/spoiler, category locks, keyboard/touch deployment and mobile overflow.', flush=True)
                print('NOT ACCEPTANCE: natural city escape, whole campaign, subjective visuals, rights and hardware.', flush=True)
            except Exception as error:
                diagnostic = {'error': str(error), 'errors': errors, 'sourceHashes': hashes}
                if page is not None and not page.is_closed():
                    try:
                        diagnostic['snapshot'] = snapshot()
                        page.screenshot(path=str(output / 'failure.jpg'), quality=85, timeout=5000)
                    except Exception as capture_error:
                        diagnostic['captureError'] = str(capture_error)
                (output / 'failure.json').write_text(json.dumps(diagnostic, indent=2) + '\n')
                raise
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


if __name__ == '__main__':
    main()
