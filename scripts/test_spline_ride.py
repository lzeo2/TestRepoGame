#!/usr/bin/env python3
"""Bounded local-browser spline regression. Not the full-catalog release gate."""
import contextlib
import functools
import hashlib
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Spline Ride'
OUT = Path(os.environ.get('SPLINE_SHOTS', '/tmp/spline-ride-qa'))


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def snapshot(page):
    return page.evaluate('window.splineRideSnapshot')


def wait(page, expression, **kwargs):
    # Timer polling is independent of the application RAF being measured.
    page.wait_for_function(expression, polling=100, **kwargs)


def layout(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
    assert page.locator('button, select, summary').evaluate_all("""nodes => nodes.every(n => {
        const r = n.getBoundingClientRect();
        return !n.checkVisibility() || (r.height >= 44 && r.left >= 0 && r.right <= innerWidth);
    })"""), 'clipped or small control'
    assert page.locator('button').evaluate_all("nodes => nodes.every(n => n.getBoundingClientRect().width >= 44)")
    s = snapshot(page)
    assert 0 < s['width'] <= 1280 and 0 < s['height'] <= 720, s
    assert abs(s['cameraAspects'][0] - s['cameraAspects'][1]) < 1e-10, s
    ratio = page.locator('canvas').evaluate('c => c.clientWidth / c.clientHeight')
    assert abs(s['cameraAspects'][0] - ratio) < .001, s


def pause_check(page):
    page.wait_for_timeout(100)
    before = snapshot(page)
    page.wait_for_timeout(250)
    wait(page, 'f => window.splineRideSnapshot.frames > f', arg=before['frames'])
    after = snapshot(page)
    assert not after['playing'] and after['progress'] == before['progress'], (before, after)
    assert after['cameraPosition'] == before['cameraPosition'], 'paused camera drift'
    assert after['cameraQuaternion'] == before['cameraQuaternion'], 'paused rotation drift'
    assert after['frames'] > before['frames'], ('render loop stopped', before, after)


def main():
    expected = {
        'three.module.js': '76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495',
        'LICENSE': '852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d',
        'CurveExtras.js': '7a885b15e2078fac929b6a69fce7e1ebe9a0fa1163c2fcc58fc2d49e16f42a19',
        'OrbitControls.js': '5a44a9e86a2a0fb11933eed69bc2cd33c76a496854c1aed6ed776efa87d7b064',
    }
    for name, digest in expected.items():
        data = (GAME / 'vendor' / name).read_bytes()
        if name in ('CurveExtras.js', 'OrbitControls.js'):
            assert data.count(b"from './three.module.js'") == 1
            data = data.replace(b"from './three.module.js'", b"from 'three'")
        assert hashlib.sha256(data).hexdigest() == digest, name
    OUT.mkdir(parents=True, exist_ok=True)
    errors, requests, contexts = [], {}, []
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p, contextlib.ExitStack() as cleanup:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=[
                '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader',
                '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
            ])
            cleanup.callback(browser.close)

            def page_for(width, height, touch=False):
                context = browser.new_context(viewport={'width': width, 'height': height},
                    has_touch=touch, reduced_motion='reduce' if touch else 'no-preference', color_scheme='light')
                contexts.append(context)
                seen = []
                requests['mobile' if touch else 'desktop'] = seen

                def route_request(route):
                    if route.request.url.startswith(base):
                        route.continue_()
                    else:
                        errors.append('Blocked external request: ' + route.request.url)
                        route.abort()

                context.route('**/*', route_request)
                page = context.new_page()
                page.set_default_timeout(10000)
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                page.on('response', lambda r: errors.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
                page.on('requestfailed', lambda r: errors.append(f'{r.url}: {r.failure}'))
                page.on('request', lambda r: seen.append(r.url.removeprefix(base)))
                page.add_init_script("""(() => {
                    const native = requestAnimationFrame;
                    let pending = 0;
                    window.splineRafMax = 0;
                    window.requestAnimationFrame = callback => {
                        pending++;
                        window.splineRafMax = Math.max(window.splineRafMax, pending);
                        return native.call(window, time => { pending--; callback(time); });
                    };
                })();""")
                if touch:
                    # Exercise the retained r160 WebGL1 fallback, not just WebGL2.
                    page.add_init_script("""(() => {
                        const native = HTMLCanvasElement.prototype.getContext;
                        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
                            return type === 'webgl2' ? null : native.call(this, type, ...args);
                        };
                    })();""")
                page.goto(base + quote('Games/Spline Ride/index.html'), wait_until='networkidle')
                try:
                    wait(page, 'window.splineRideSnapshot?.frames > 2')
                except Exception:
                    print('Startup diagnostic:', page.locator('#status').text_content(), errors, snapshot(page), flush=True)
                    raise
                assert page.evaluate('Object.isFrozen(window.splineRideSnapshot)')
                assert page.evaluate("!Object.getOwnPropertyDescriptor(window, 'splineRideSnapshot').set")
                assert len([r for r in seen if r.endswith('.js')]) == 4, seen
                assert not snapshot(page)['playing'] and snapshot(page)['view'] == 'Orbit'
                layout(page)
                return page

            def shot(page, name):
                path = OUT / name
                page.screenshot(path=str(path), **({'type': 'png'} if name.endswith('.png') else {'type': 'jpeg', 'quality': 70}))
                assert path.stat().st_size < 500000, path

            page = page_for(1280, 720)
            shot(page, 'desktop-orbit.png')
            initial = snapshot(page)
            page.locator('#play').click()
            wait(page, 'window.splineRideSnapshot.progress > 2')
            ride = snapshot(page)
            assert ride['playing'] and ride['view'] == 'Ride'
            wait(page, 'p => window.splineRideSnapshot.progress > p + 2', arg=ride['progress'])
            assert snapshot(page)['cameraPosition'] != ride['cameraPosition'], 'ride camera did not move'
            shot(page, 'desktop-ride.png')
            page.locator('canvas').focus()
            page.keyboard.press('Space')
            pause_check(page)
            page.keyboard.press('ArrowRight')
            stepped = snapshot(page)['progress']
            assert stepped > ride['progress']
            page.keyboard.press('ArrowLeft')
            assert snapshot(page)['progress'] < stepped
            page.keyboard.press('KeyV')
            assert snapshot(page)['view'] == 'Orbit'
            page.keyboard.press('KeyR')
            assert snapshot(page)['progress'] == 0 and snapshot(page)['laps'] == 0
            assert snapshot(page)['cameraPosition'] == initial['cameraPosition']
            baseline = snapshot(page)['geometryCount']
            options = page.locator('#path option').evaluate_all('nodes => nodes.map(n => n.value)')
            assert len(options) == 16
            for name in options:
                previous = snapshot(page)['frames']
                page.locator('#path').select_option(name)
                wait(page, 'f => window.splineRideSnapshot.frames > f + 1', arg=previous)
                s = snapshot(page)
                assert s['path'] == name and s['geometryCount'] == baseline, s
            page.locator('#path').select_option('GrannyKnot')
            page.locator('summary').click()
            page.locator('#scale').select_option('6')
            page.locator('#sides').select_option('12')
            page.locator('#closed').uncheck()
            page.locator('#ahead').check()
            page.wait_for_timeout(100)
            assert snapshot(page)['geometryCount'] == baseline
            page.locator('#scale').select_option('4')
            page.locator('#sides').select_option('8')
            page.locator('#closed').check()
            page.locator('#ahead').uncheck()
            page.locator('summary').click()
            # One actual 20-second lap; no production setters or clock shortcuts.
            page.locator('#play').click()
            wait(page, 'window.splineRideSnapshot.laps === 1', timeout=26000)
            page.locator('#play').click()
            lap = snapshot(page)
            assert lap['laps'] == 1 and 0 <= lap['progress'] < 100
            page.locator('#restart').click()
            assert snapshot(page)['laps'] == 0 and snapshot(page)['progress'] == 0
            page.emulate_media(color_scheme='dark')
            shot(page, 'desktop-dark.jpg')
            desktop_metrics = snapshot(page)
            assert page.evaluate('window.splineRafMax === 1'), 'multiple RAF loops'
            page.close()

            phone = page_for(390, 844, True)
            assert phone.evaluate("document.querySelector('canvas').getContext('webgl').getParameter(7938)").startswith('WebGL 1.0')
            phone.locator('#play').tap()
            wait(phone, 'window.splineRideSnapshot.progress > 1')
            phone.locator('#view').tap()
            assert snapshot(phone)['view'] == 'Orbit'
            phone.locator('#play').tap()
            pause_check(phone)
            # Real touch orbit and pinch through the stock OrbitControls handlers.
            canvas = phone.locator('canvas').bounding_box()
            x, y = canvas['x'] + canvas['width'] / 2, canvas['y'] + canvas['height'] / 2
            cdp = phone.context.new_cdp_session(phone)
            before = snapshot(phone)['cameraPosition']
            for kind, points in [('touchStart', [{'x': x, 'y': y, 'id': 0}]),
                                 ('touchMove', [{'x': x + 35, 'y': y + 20, 'id': 0}]), ('touchEnd', [])]:
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})
            assert snapshot(phone)['cameraPosition'] != before, 'touch orbit did not move'
            before = snapshot(phone)['cameraPosition']
            for kind, points in [('touchStart', [{'x': x - 30, 'y': y, 'id': 0}, {'x': x + 30, 'y': y, 'id': 1}]),
                                 ('touchMove', [{'x': x - 50, 'y': y, 'id': 0}, {'x': x + 50, 'y': y, 'id': 1}]), ('touchEnd', [])]:
                cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})
            assert snapshot(phone)['cameraPosition'] != before, 'pinch zoom did not move'
            cdp.detach()
            phone.locator('#restart').tap()
            assert snapshot(phone)['progress'] == 0 and snapshot(phone)['view'] == 'Orbit'
            shot(phone, 'mobile-orbit.png')
            phone.set_viewport_size({'width': 320, 'height': 844})
            phone.wait_for_timeout(200)
            layout(phone)
            phone.locator('summary').tap()
            layout(phone)
            phone.locator('#sides').select_option('3')
            phone.locator('summary').tap()
            phone.emulate_media(color_scheme='dark')
            phone.locator('#play').tap()
            wait(phone, 'window.splineRideSnapshot.progress > 1')
            shot(phone, 'mobile-dark-ride.jpg')
            phone.locator('#play').tap()
            pause_check(phone)
            mobile_metrics = snapshot(phone)
            assert phone.evaluate('window.splineRafMax === 1'), 'multiple mobile RAF loops'
            assert not errors, errors
            print('Spline Ride PASS: pinned vendors, 16 paths/disposal, native geometry controls, real 20s lap, keyboard play/pause/step/view/restart, touch play/orbit/pinch/reset, reduced-motion start, 320/390 layouts, both cameras resized, WebGL1 mobile, one RAF, origin-only requests, zero console/page/HTTP/request errors')
            print(json.dumps({'desktop': desktop_metrics, 'mobile': mobile_metrics, 'lap': lap, 'requests': requests}, sort_keys=True))
            print('Screenshots: ' + str(OUT) + ' (3 PNGs and 2 JPEGs, each <500 KB)')
            print('Limit: natural hidden-tab visibility behavior not exercised by this headless run.')
    finally:
        for context in contexts:
            try:
                context.close()
            except Exception:
                pass
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)


if __name__ == '__main__':
    main()
