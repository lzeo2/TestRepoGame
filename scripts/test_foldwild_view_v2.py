#!/usr/bin/env python3
"""Native WebGL1 presentation regression, not a core/campaign or hardware gate."""
import functools
import json
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-view-v2')
HARNESS = b'''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Foldwild view regression</title><style>
body{margin:0;background:#eee9d8;color:#28382f;font:16px system-ui}header{padding:16px}
canvas{display:block;width:100%;height:56vh;touch-action:none}p{padding:0 16px}
</style><header>FOLDWILD / Native presentation check</header><canvas></canvas>
<p id="message">WASD is core-owned. Drag to orbit. These captures test the renderer only.</p>
<script type="module">
import * as THREE from '/Games/Foldwild/vendor/three.module.js';
import {createView} from '/Games/Foldwild/view.js';
import {REGION_LAYOUTS} from '/Games/Foldwild/region-data.js';
import {freshGame,worldPoints} from '/Games/Foldwild/world.js';
import {SPECIES} from '/Games/Foldwild/data.js';
window.checkpoints=[];
window.view=createView(document.querySelector('canvas'),{onCheckpoint:id=>checkpoints.push(id)});
window.species=SPECIES;
const state=freshGame('dewgob',23);
window.world={region:0,position:REGION_LAYOUTS[0].spawn,points:worldPoints(state),appearance:state.appearance};
window.tick=(n=1,dt=1/60)=>{for(let i=0;i<n;i++)view.render(dt);return view.inspect()};
window.pointScreen=id=>{
  const p=world.points.find(p=>p.id===id), rect=document.querySelector('canvas').getBoundingClientRect();
  const c=new THREE.PerspectiveCamera(45,rect.width/rect.height,.1,120), info=view.inspect();
  c.position.set(info.cameraPosition.x,info.cameraPosition.y,info.cameraPosition.z);
  c.lookAt(world.position.x,.6,world.position.z);c.updateMatrixWorld();
  const v=new THREE.Vector3(p.x,.6,p.z).project(c);
  return {x:rect.left+(v.x+1)*rect.width/2,y:rect.top+(1-v.y)*rect.height/2};
};
window.ready=true;
</script>'''


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__foldwild_view_v2':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.send_header('Content-Length', str(len(HARNESS)))
            self.end_headers()
            self.wfile.write(HARNESS)
        elif self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
        else:
            super().do_GET()

    def log_message(self, *_args):
        pass


def run():
    free_before = shutil.disk_usage(ROOT).free
    assert free_before >= 2_000_000_000, 'disk guard: less than 2 GB free'
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 8794), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = 'http://127.0.0.1:8794'
    errors, external, http_errors, failed, models = [], [], [], [], []
    captures, summary = [], {}

    def attach(context):
        def local_only(route):
            if urlsplit(route.request.url).netloc != urlsplit(origin).netloc:
                external.append(route.request.url)
                route.abort()
            else:
                route.continue_()
        context.route('**/*', local_only)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        page.on('response', lambda response: http_errors.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('requestfailed', lambda request: failed.append(request.url))
        page.on('request', lambda request: models.append(request.url) if request.url.endswith('.glb') else None)
        page.goto(origin + '/__foldwild_view_v2')
        page.wait_for_function('window.ready', timeout=30000)
        assert page.evaluate("world.points.some(p=>p.type==='merchant')"), 'world adapter has not supplied the approved region ABI'
        return page

    def shot(page, name):
        path = OUTPUT / f'{name}.jpg'
        page.screenshot(path=str(path), type='jpeg', quality=65)
        assert path.stat().st_size <= 300000, path.stat().st_size
        captures.append(path)

    def good(info):
        assert not info['fallbackModels'], info
        assert not info['hiddenAvailable'], info
        assert info['cacheSize'] <= 12, info
        assert info['drawCalls'] < 60, info
        assert info['triangles'] < 60000, info
        return info

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                desktop = browser.new_context(viewport={'width': 1280, 'height': 720})
                page = attach(desktop)
                info = good(page.evaluate('async()=>{await view.showWorld(world);return tick(2)}'))
                assert info['quality'] == 'low' and info['width'] <= 960 and info['height'] <= 540, info
                assert info['countLoadedModels'] == 3 and info['npcCount'] == 4, info
                assert len(models) == 3, 'eager model loading'
                assert page.evaluate('Object.isFrozen(view.inspect()) && Object.isFrozen(view.inspect().loadedModels)')
                summary['desktop_world'] = info
                shot(page, 'desktop-world')
                frames = info['frames']
                page.wait_for_timeout(120)
                assert page.evaluate('view.inspect().frames') == frames, 'renderer owns a clock'
                p = page.evaluate("pointScreen('meadow-merchant')")
                page.mouse.click(p['x'], p['y'])
                assert page.evaluate('checkpoints') == ['meadow-merchant'], 'visible POI tap callback'
                page.mouse.move(620, 240)
                page.mouse.down(button='right')
                page.mouse.move(690, 250, steps=5)
                page.mouse.up(button='right')
                assert abs(page.evaluate('view.getCameraYaw()')) > .1
                assert page.evaluate('checkpoints') == ['meadow-merchant'], 'orbit also tapped a marker'
                yaw = page.evaluate('view.getCameraYaw()')
                page.evaluate('view.setPlayerPosition(0,16,.7);tick(2)')
                assert page.evaluate('view.getCameraYaw()') == yaw, 'body turn dragged camera'
                assert abs(page.evaluate('view.recenterCamera();view.getCameraYaw()') - .7) < 1e-9
                info = good(page.evaluate('view.setQuality("standard");tick(1)'))
                assert info['width'] == 1280 and info['height'] <= 720 and info['npcCount'] == 8, info
                assert page.evaluate('(()=>{try{view.setQuality("high");return false}catch{return true}})()')
                page.evaluate('view.setQuality("low");view.orbitCamera(-.7);view.setAppearance({coat:"#7b4f34",skin:"#8c6149"});tick(1)')
                info = good(page.evaluate("async()=>{await view.showBattle({playerSpeciesId:'dewgob',enemySpeciesId:'sootnub',region:3,playerCosmeticId:'scarf',enemyCosmeticId:'badge'});return tick(2)}"))
                assert info['countLoadedModels'] == 2
                summary['desktop_battle'] = info
                shot(page, 'desktop-battle')
                before = info['actorPositions']
                moved = page.evaluate("view.animateAction({type:'ability',side:'player'});tick(10)")
                assert moved['actorPositions']['player']['x'] > before['player']['x'] + .3, moved
                after = page.evaluate('tick(40)')
                assert after['actorPositions']['player']['x'] == before['player']['x']
                base_calls = after['drawCalls']
                kite = page.evaluate("view.animateAction({type:'capture',side:'player',result:'miss'});tick(8)")
                assert kite['drawCalls'] == base_calls + 1, kite
                paused = page.evaluate('tick(1,0)')
                assert paused['actorPositions'] == kite['actorPositions'], 'zero dt moved actors'
                assert page.evaluate('tick(60)')['drawCalls'] == base_calls
                page.evaluate("view.setReducedMotion(true);view.animateAction({type:'ability',side:'player'});tick(10)")
                assert page.evaluate('view.inspect().actorPositions') == before
                page.evaluate('view.setReducedMotion(false)')
                # Real asynchronous scene replacement, no fake loader or alternate data file.
                race = good(page.evaluate("async()=>{const old=view.showWorld(world);await view.showBattle({playerSpeciesId:'pithnip',enemySpeciesId:'thrumkin'});await old;return tick(2)}"))
                assert race['mode'] == 'battle' and race['countLoadedModels'] == 2, race
                cycle = '''async()=>{for(let i=0;i<20;i++){
                  const old=view.showWorld({...world,region:i%5});
                  await view.showBattle({playerSpeciesId:species[i*2].id,enemySpeciesId:species[i*2+1].id,region:i%5});
                  await old;tick(1);
                  if(view.inspect().fallbackModels.length)throw Error('cycle model fallback');
                }await view.showWorld(world);return tick(2)}'''
                first = good(page.evaluate(cycle))
                second = good(page.evaluate(cycle))
                assert second['geometries'] == first['geometries'] and second['textures'] == first['textures'], (first, second)
                assert second['cacheSize'] == first['cacheSize'] == 12
                summary['transition_cycles'] = 40
                summary['stable_resources'] = {key: second[key] for key in ['geometries', 'textures', 'cacheSize']}
                # Actual neighboring source houses constrain the camera ray, without a physics dependency.
                safe = page.evaluate('view.setPlayerPosition(8,10,0);view.orbitCamera(Math.PI);tick(60);view.inspect()')
                assert safe['cameraPosition']['z'] > 7, safe
                page.evaluate('view.dispose();view.dispose()')
                frames = page.evaluate('view.inspect().frames')
                page.evaluate('view.render(.1);view.orbitCamera(1)')
                assert page.evaluate('view.inspect().frames') == frames
                desktop.close()

                mobile = browser.new_context(viewport={'width': 390, 'height': 700}, has_touch=True, is_mobile=True)
                page = attach(mobile)
                info = good(page.evaluate('async()=>{await view.showWorld(world);return tick(2)}'))
                assert info['width'] == 390 and info['height'] <= 540
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                shot(page, 'mobile-world')
                session = mobile.new_cdp_session(page)
                contacts = [{'x': 140, 'y': 240, 'id': 1}, {'x': 240, 'y': 240, 'id': 2}]
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': contacts})
                for p in contacts:
                    p['x'] += 35
                session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': contacts})
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                assert abs(page.evaluate('view.getCameraYaw()')) > .05, 'two-finger orbit'
                assert page.evaluate('checkpoints') == [], 'touch orbit tapped marker'
                session.detach()
                summary['mobile_world'] = info
                # Dispose while a new GLB is pending, then allow the actual request to finish.
                page.evaluate("window.pending=view.showBattle({playerSpeciesId:'kilnarch',enemySpeciesId:'basinull'});view.dispose()")
                page.evaluate('async()=>{await pending}')
                page.wait_for_timeout(100)
                mobile.close()
                assert not errors and not external and not http_errors and not failed, (errors, external, http_errors, failed)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    summary.update(errors=errors, external_requests=external, http_errors=http_errors, failed_requests=failed,
        unique_model_requests=len(set(models)), screenshot_bytes=sum(p.stat().st_size for p in captures),
        screenshots=[str(p) for p in captures], storage_delta=free_before-shutil.disk_usage(ROOT).free)
    print(json.dumps(summary, indent=2))
    print('PASS: native desktop/mobile WebGL1 view, camera, actual models, action motion, 40 races, LRU and disposal')


if __name__ == '__main__':
    run()
