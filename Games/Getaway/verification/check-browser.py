"""Bounded local check. Run from repo root; requires installed Playwright/Chromium.
python3 Games/Getaway/verification/check-browser.py <screenshot-directory>
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
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 8932), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
origin = 'http://127.0.0.1:8932'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server',
                  '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=vulkan', '--use-vulkan=swiftshader'])
        for mobile, theme in [(False, 'light'), (False, 'dark'), (True, 'light'), (True, 'dark')]:
            context = browser.new_context(viewport={'width':390 if mobile else 1280, 'height':844 if mobile else 720},
                                          is_mobile=mobile, has_touch=mobile, color_scheme=theme)
            page = context.new_page()
            errors, failed, external, sockets = [], [], [], []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
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
            response = page.goto(origin + '/Games/Getaway/', wait_until='networkidle', timeout=30000)
            page.wait_for_timeout(1500)
            label = ('mobile' if mobile else 'desktop') + '-' + theme
            fallback = not page.evaluate('!!window.__view')
            print(f'{label}: HTTP {response.status}; fallback={fallback}; body=' + page.locator('body').inner_text()[:150].replace('\n', ' '))
            page.screenshot(path=str(out / (label + '.png')))
            if fallback:
                assert 'WebGPU' in page.locator('#overlay').inner_text(), 'Unexpected boot failure'
                # Explicit renderer-free fixture, not evidence that the 3D game rendered.
                result = page.evaluate('''async () => {
                    const {LocalSession,Hud,Camera,Controls,soloControls} = await import('./verification/sim.mjs');
                    document.getElementById('overlay').replaceChildren();
                    const label = document.createElement('p');
                    label.textContent = 'SIM/HUD fixture - no 3D renderer';
                    label.style.cssText = 'position:fixed;top:160px;left:12px;color:white;background:black;z-index:30';
                    document.body.append(label);
                    const s = new LocalSession('Dax', {robber:'muscle',cop:'cruiser'});
                    const controls = new Controls(); soloControls(controls);
                    const hud = new Hud(document.getElementById('hud'),s.city);
                    const cam = new Camera();
                    const start = s.update(0,controls.read(0)).cars[0];
                    window.fixture = {s, controls, hud, cam};
                    return {x:start.x,z:start.z,seed:s.city.seed};
                }''')
                page.keyboard.down('ArrowUp')
                driven = page.evaluate('''() => {
                    const {s,controls,hud,cam} = fixture;
                    let view;
                    for(let i=0;i<120;i++) view=s.update(1/60,controls.read(1/60));
                    const car=view.cars[0]; cam.snap(car.x,car.z);
                    hud.update(view,{myId:s.myId,cam,width:innerWidth,height:innerHeight,dt:1/60,
                        events:[],players:s.players(),room:s.room,status:s.status()});
                    return {x:car.x,z:car.z,cars:view.cars.length,clock:document.querySelector('.c-time').textContent};
                }''')
                page.keyboard.up('ArrowUp')
                assert ((driven['x']-result['x'])**2+(driven['z']-result['z'])**2)**0.5 > 1
                assert driven['cars'] == 1 and driven['clock']
                if mobile:
                    button = page.locator('[data-code="ArrowUp"]')
                    box = button.bounding_box()
                    assert box['width'] >= 44 and box['height'] >= 44
                    cdp = context.new_cdp_session(page)
                    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[{'x':box['x']+box['width']/2, 'y':box['y']+box['height']/2}]})
                    assert page.evaluate('fixture.controls.read(1/60).throttle') == 1
                    cdp.send('Input.dispatchTouchEvent', {'type':'touchCancel', 'touchPoints':[]})
                    assert page.evaluate('fixture.controls.read(1/60).throttle') == 0
                print(label + ': SIM/HUD fixture ' + json.dumps(driven))
                page.screenshot(path=str(out / (label + '-sim-hud.png')))
            else:
                before = page.evaluate('({x:__view.cars[0].x,z:__view.cars[0].z})')
                page.keyboard.down('ArrowUp'); page.wait_for_timeout(2500); page.keyboard.up('ArrowUp')
                after = page.evaluate('({x:__view.cars[0].x,z:__view.cars[0].z})')
                assert ((after['x']-before['x'])**2+(after['z']-before['z'])**2)**0.5 > 1
                print(label + ': rendered keyboard drive moved')
            print(label + ': console_errors=' + json.dumps(errors) + '; request_failures=' + json.dumps(failed) + '; external=' + json.dumps(external) + '; sockets=' + json.dumps(sockets))
            assert response.status == 200 and not errors and not failed and not external and not sockets
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.locator('.solo-help summary').click()
            page.locator('#solo-reset').click()
            page.wait_for_load_state('networkidle')
            assert page.evaluate('typeof window.fixture === "undefined"')
            print(label + ': restart reloaded')
            context.close()
        browser.close()
finally:
    server.shutdown()
    server.server_close()
