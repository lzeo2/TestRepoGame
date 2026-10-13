"""Bounded Chromium shell/input check; SIM/HUD fixtures are not rendered driving.
Run: python3 -B Games/Getaway/verification/check-browser.py <evidence-dir>
"""
import functools
import http.server
import json
from pathlib import Path
import shutil
import sys
import threading
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[3]
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
server = http.server.ThreadingHTTPServer(('127.0.0.1', 8937), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = 'http://127.0.0.1:8937'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server', '--enable-unsafe-webgpu', '--use-angle=swiftshader'])
        for mobile, theme in [(False, 'light'), (False, 'dark'), (True, 'light'), (True, 'dark')]:
            context = browser.new_context(viewport={'width':390 if mobile else 1280, 'height':844 if mobile else 720}, is_mobile=mobile, has_touch=mobile, color_scheme=theme)
            page = context.new_page()
            errors, failed, external, sockets, console_errors = [], [], [], [], []
            page.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('requestfailed', lambda r: failed.append([r.url, r.failure]))
            page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
            page.on('websocket', lambda s: sockets.append(s.url))
            def route(r):
                if r.request.url.startswith(origin + '/'):
                    r.continue_()
                else:
                    external.append(r.request.url)
                    r.abort()
            page.route('**/*', route)
            response = page.goto(origin + '/Games/Getaway/', wait_until='networkidle')
            page.wait_for_timeout(1500)
            label = ('mobile' if mobile else 'desktop') + '-' + theme
            fallback = not page.evaluate('!!window.__view')
            print(f'{label}: HTTP {response.status}; GPU fallback={fallback}; ' + page.locator('#overlay').inner_text().replace('\n', ' '))
            page.screenshot(path=str(out / (label + '.png')))
            # Test the production error-screen restart BEFORE constructing any fixture.
            page.locator('.solo-help summary').click()
            page.screenshot(path=str(out / (label + '-controls.png')))
            before = page.evaluate('performance.timeOrigin')
            page.locator('#solo-reset').click()
            page.wait_for_load_state('networkidle')
            assert page.evaluate('performance.timeOrigin') != before
            print(label + ': production restart changed timeOrigin')
            if fallback:
                assert 'WebGPU' in page.locator('#overlay').inner_text()
                page.evaluate('''async () => {
                    const {LocalSession,Hud,Camera,Controls,soloControls} = await import('./verification/sim.mjs');
                    document.getElementById('overlay').replaceChildren();
                    const label = document.createElement('p');
                    label.textContent = 'SIM/HUD fixture - no 3D renderer';
                    label.style.cssText = 'position:fixed;top:180px;left:12px;color:white;background:black;z-index:30';
                    document.body.append(label);
                    const s = new LocalSession('Dax', {robber:'muscle',cop:'cruiser'});
                    const controls = new Controls(); soloControls(controls);
                    const hud = new Hud(document.getElementById('hud'),s.city);
                    const cam = new Camera();
                    for(let i=0;i<1200;i++) s.update(1/60,controls.read(1/60));
                    window.fixture = {s, controls, hud, cam};
                }''')
                page.locator('.solo-help summary').focus()
                page.keyboard.press('Space')
                assert page.locator('.solo-help').evaluate('(e) => e.open')
                assert not page.evaluate('fixture.controls.read(1/60).handbrake')
                page.keyboard.press('Space')
                page.locator('#view').focus()
                page.keyboard.down('Space')
                assert page.evaluate('fixture.controls.read(1/60).handbrake')
                assert not page.locator('.solo-help').evaluate('(e) => e.open')
                page.keyboard.up('Space')
                page.keyboard.down('ArrowUp')
                driven = page.evaluate('''() => {
                    const {s,controls,hud,cam} = fixture;
                    const start=s.update(0,controls.read(0)).cars.find(c=>c.ownerId===s.myId);
                    let view;
                    for(let i=0;i<120;i++) view=s.update(1/60,controls.read(1/60));
                    const car=view.cars.find(c=>c.ownerId===s.myId); cam.snap(car.x,car.z);
                    hud.update(view,{myId:s.myId,cam,width:innerWidth,height:innerHeight,dt:1/60,events:[],players:s.players(),room:s.room,status:s.status()});
                    return {distance:Math.hypot(car.x-start.x,car.z-start.z),cars:view.cars.length,phase:view.phase,clock:document.querySelector('.c-time').textContent};
                }''')
                page.keyboard.up('ArrowUp')
                assert driven['distance'] > 1 and driven['cars'] >= 5 and driven['clock']
                if mobile:
                    box = page.locator('[data-code="ArrowUp"]').bounding_box()
                    assert box['width'] >= 44 and box['height'] >= 44
                    cdp = context.new_cdp_session(page)
                    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[{'x':box['x']+box['width']/2, 'y':box['y']+box['height']/2}]})
                    assert page.evaluate('fixture.controls.read(1/60).throttle') == 1
                    cdp.send('Input.dispatchTouchEvent', {'type':'touchCancel', 'touchPoints':[]})
                    assert page.evaluate('fixture.controls.read(1/60).throttle') == 0
                print(label + ': focus/Space isolated; SIM/HUD ' + json.dumps(driven))
                page.screenshot(path=str(out / (label + '-sim-hud.png')))
            page.locator('.solo-help summary').click()
            page.select_option('#solo-mode', '1')
            page.select_option('#solo-robber', 'compact')
            page.select_option('#solo-cop', 'interceptor')
            page.get_by_role('button', name='Start selected mode').click()
            page.wait_for_load_state('networkidle')
            assert page.locator('#solo-robber').input_value() == 'compact'
            assert page.locator('#solo-cop').input_value() == 'interceptor'
            assert page.locator('#solo-mode').input_value() == '1'
            assert 'Free drive' in page.locator('#solo-mode-label').text_content()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            print(label + ': mode/car selection round-trip; errors=' + json.dumps(errors) + '; failed=' + json.dumps(failed) + '; external=' + json.dumps(external) + '; sockets=' + json.dumps(sockets))
            print(label + ': console_errors=' + json.dumps(console_errors))
            assert not errors and not failed and not external and not sockets
            context.close()
        # Inject only GPU startup failures, never simulation state, to cover early-return/catch paths.
        for failure, value in [('missing', 'undefined'), ('adapter-reject', '{requestAdapter:async()=>{throw Error("adapter rejected")}}'), ('device-reject', '{requestAdapter:async()=>({requestDevice:async()=>{throw Error("device rejected")}})}')]:
            context = browser.new_context()
            context.add_init_script('Object.defineProperty(navigator,"gpu",{value:' + value + ',configurable:true})')
            page = context.new_page()
            page.goto(origin + '/Games/Getaway/', wait_until='networkidle')
            assert 'WebGPU' in page.locator('#overlay').inner_text()
            before = page.evaluate('performance.timeOrigin')
            page.locator('.solo-help summary').click()
            page.locator('#solo-reset').click()
            page.wait_for_load_state('networkidle')
            assert page.evaluate('performance.timeOrigin') != before
            print('PASS: production reset after injected ' + failure)
            context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
