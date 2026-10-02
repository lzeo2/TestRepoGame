#!/usr/bin/env python3
"""One native renderer/canvas: real-model inspection, races and bounded resources.

This is a presentation check, not the core ledger loop or a hardware FPS gate.
"""
import functools
import json
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = Path('/tmp/foldwild-m2-inspection')
HARNESS = b'''<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Foldwild inspection regression</title><style>
body{margin:0;background:#eee9d8;color:#28382f;font:16px system-ui}
header,p{padding:12px;margin:0}section{max-width:520px;margin:0 auto}
canvas{display:block;width:100%;height:240px;touch-action:none}
</style><header>FOLDWILD / Native creature inspection</header>
<section id="world-host"><canvas aria-label="Creature inspection"></canvas></section>
<section id="inspection-host"></section><p id="label"></p><p id="message" role="status"></p>
<script type="module">
import * as THREE from '/Games/Foldwild/vendor/three.module.js';
import {createView} from '/Games/Foldwild/view.js';
import {SPECIES} from '/Games/Foldwild/data.js';
import {freshGame,worldPoints} from '/Games/Foldwild/world.js';
window.species=SPECIES;window.checkpoints=[];
window.canvas=document.querySelector('canvas');
window.view=createView(canvas,{onCheckpoint:id=>checkpoints.push(id)});
const state=freshGame('dewgob',23);
window.world={region:0,position:state.position,points:worldPoints(state),appearance:state.appearance};
window.tick=(n=1,dt=0)=>{for(let i=0;i<n;i++)view.render(dt);return view.inspect()};
window.preview=async(id,cosmetic='none')=>{
  document.querySelector('#inspection-host').append(canvas);view.resize();
  document.querySelector('#label').textContent=SPECIES.find(s=>s.id===id).name+' / '+cosmetic;
  await view.showInspection({speciesId:id,cosmeticId:cosmetic});return tick();
};
window.back=async()=>{
  document.querySelector('#world-host').append(canvas);view.resize();
  await view.showWorld(world);return tick();
};
window.fits=()=>{
  const info=view.inspect(),rect=canvas.getBoundingClientRect();
  const c=new THREE.PerspectiveCamera(45,rect.width/rect.height,.1,120);
  const p=info.cameraPosition,t=info.cameraTarget,b=info.inspectionBounds;
  c.position.set(p.x,p.y,p.z);c.lookAt(t.x,t.y,t.z);c.updateMatrixWorld();
  if(!b)return false;
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
    const v=new THREE.Vector3(x,y,z).project(c);
    if(!Number.isFinite(v.x)||!Number.isFinite(v.y)||Math.abs(v.x)>.96||Math.abs(v.y)>.96||Math.abs(v.z)>1)return false;
  }return true;
};
window.ready=true;
</script></html>'''


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__foldwild_inspection':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
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
    server = ThreadingHTTPServer(('127.0.0.1', 8801), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = 'http://127.0.0.1:8801'
    errors, external, http_errors, failed, models, captures = [], [], [], [], [], []
    summary = {}

    def good(info, mode='inspection', count=1):
        assert info['mode'] == mode and info['countLoadedModels'] == count, info
        assert not info['fallbackModels'] and not info['hiddenAvailable'], info
        assert info['cacheSize'] <= 12 and info['modelReferences'] == count, info
        assert info['drawCalls'] < 60 and info['triangles'] < 60000, info
        return info

    def shot(page, name):
        path = OUTPUT / f'{name}.jpg'
        page.screenshot(path=str(path), type='jpeg', quality=65)
        assert path.stat().st_size < 300000
        captures.append(path)

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 720})
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
                page.goto(origin + '/__foldwild_inspection')
                page.wait_for_function('window.ready', timeout=30000)
                assert page.evaluate('typeof view.showInspection') == 'function'
                assert page.evaluate('document.querySelectorAll("canvas").length') == 1
                good(page.evaluate('async()=>{await view.showWorld(world);return tick()}'), 'world', 3)
                yaw = page.evaluate('view.orbitCamera(.73);view.getCameraYaw()')
                for invalid in ['missing', None, 7, '__proto__']:
                    assert page.evaluate('async id=>{try{await view.showInspection({speciesId:id});return false}catch{return true}}', invalid)
                assert page.evaluate('async()=>{try{await view.showInspection({speciesId:"cindupp",cosmeticId:"missing"});return false}catch{return true}}')
                assert page.evaluate('view.inspect().mode') == 'world', 'invalid input changed presentation'
                roster = page.evaluate('species.map(s=>({id:s.id,family:s.family}))')
                assert len(roster) == 80
                representatives = list({s['family']: s['id'] for s in reversed(roster)}.items())
                assert len(representatives) == 10
                max_draws, max_triangles = 0, 0
                transitions = 0
                for entry in roster:
                    info = good(page.evaluate('id=>preview(id)', entry['id']))
                    transitions += 1
                    assert info['loadedModels'][0].endswith('/' + entry['id'] + '.glb'), info
                    max_draws = max(max_draws, info['drawCalls'])
                    max_triangles = max(max_triangles, info['triangles'])
                    assert page.evaluate('fits()'), entry
                    assert page.evaluate('''()=>{for(let i=0;i<4;i++){view.orbitCamera(Math.PI/2);tick();if(!fits())return false}
                      view.recenterCamera();tick();return view.inspect().inspectionYaw===0}'''), entry
                    assert page.evaluate('view.getCameraYaw()') == yaw
                for family, species_id in representatives:
                    for accessory in ['none', 'badge', 'scarf', 'paper-hat']:
                        info = good(page.evaluate('(args)=>preview(...args)', [species_id, accessory]))
                        transitions += 1
                        assert page.evaluate('fits()'), (family, accessory)
                        shot(page, f'desktop-{family.lower()}-{accessory}')
                assert transitions == 120
                summary.update(species_none=80, representative_families=10, preview_transitions=transitions,
                    accessory_scope='none/badge/scarf/paper-hat on one species per family; not all-80 fit approval',
                    max_none_draw_calls=max_draws, max_none_triangles=max_triangles)
                frames = page.evaluate('view.inspect().frames')
                page.wait_for_timeout(120)
                assert page.evaluate('view.inspect().frames') == frames, 'view owns a RAF'
                # Real pointer drag and explicit controls work even when simulation dt=0 and motion is reduced.
                page.evaluate('view.setReducedMotion(true);view.recenterCamera();tick()')
                rect = page.locator('canvas').bounding_box()
                page.mouse.move(rect['x'] + 100, rect['y'] + 120)
                page.mouse.down()
                page.mouse.move(rect['x'] + 180, rect['y'] + 120, steps=4)
                page.mouse.up()
                rotated = page.evaluate('tick()')
                assert abs(rotated['inspectionYaw']) > .1 and page.evaluate('fits()')
                assert page.evaluate('checkpoints') == []
                assert page.evaluate('view.getCameraYaw()') == yaw
                page.evaluate('view.orbitCamera(NaN);view.orbitCamera(Infinity);view.recenterCamera();tick()')
                assert page.evaluate('view.inspect().inspectionYaw') == 0
                restored = good(page.evaluate('back()'), 'world', 3)
                assert restored['cameraYaw'] == yaw
                assert page.evaluate('canvas.parentElement.id') == 'world-host'
                # A closing world restoration and newer selection must win over genuine in-flight loads.
                race = good(page.evaluate('''async()=>{const old=view.showInspection({speciesId:'kilnarch'});
                  const newer=view.showInspection({speciesId:'basinull'});await back();await Promise.all([old,newer]);return tick()}'''), 'world', 3)
                assert race['cameraYaw'] == yaw
                newer = good(page.evaluate('''async()=>{const old=view.showInspection({speciesId:'hearthol'});
                  await view.showInspection({speciesId:'vesselorn',cosmeticId:'scarf'});await old;return tick()}'''))
                assert newer['loadedModels'] == ['models/Cupfin/vesselorn.glb']
                cycle = '''async()=>{for(let i=0;i<20;i++){
                  await view.showWorld({...world,region:i%5});tick();
                  await view.showBattle({playerSpeciesId:species[(i%10)*2].id,enemySpeciesId:species[(i%10)*2+1].id,region:i%5});tick();
                  await view.showInspection({speciesId:species[(i%10)*2].id,cosmeticId:i%2?'badge':'scarf'});tick();
                  const s=view.inspect();if(s.fallbackModels.length||s.cacheSize>12||s.modelReferences!==1)throw Error('transition resource failure');
                }return tick()}'''
                first = good(page.evaluate(cycle))
                second = good(page.evaluate(cycle))
                for key in ['cacheSize', 'modelReferences', 'geometries', 'textures']:
                    assert first[key] == second[key], (key, first, second)
                summary.update(repeat_world_battle_inspection_cycles=40,
                    stable_resources={key: second[key] for key in ['cacheSize', 'modelReferences', 'geometries', 'textures']})
                # The SAME view and canvas at phone width, including a real single-touch drag.
                page.set_viewport_size({'width': 390, 'height': 700})
                session = context.new_cdp_session(page)
                session.send('Emulation.setTouchEmulationEnabled', {'enabled': True, 'maxTouchPoints': 1})
                for species_id, accessory in [('cindupp', 'none'), ('dewgob', 'scarf'), ('flarivet', 'paper-hat'), ('budriv', 'badge')]:
                    info = good(page.evaluate('args=>preview(...args)', [species_id, accessory]))
                    assert page.evaluate('fits()')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    assert page.locator('canvas').bounding_box()['height'] == 240
                    shot(page, f'mobile-{species_id}-{accessory}')
                rect = page.locator('canvas').bounding_box()
                contact = {'x': rect['x'] + 100, 'y': rect['y'] + 120, 'id': 1}
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [contact]})
                for delta in [20, 40, 60]:
                    session.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{**contact, 'x': contact['x'] + delta}]})
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                assert abs(page.evaluate('tick().inspectionYaw')) > .1, 'single-touch drag did not orbit'
                assert page.evaluate('fits()') and page.evaluate('checkpoints') == []
                assert page.evaluate('view.getCameraYaw()') == yaw
                page.evaluate('view.recenterCamera();tick()')
                assert page.evaluate('view.inspect().inspectionYaw') == 0
                session.detach()
                page.evaluate('document.querySelector("#inspection-host").style.maxWidth="180px";view.resize();tick()')
                assert page.evaluate('fits()'), 'portrait inspection frame clipped'
                assert page.evaluate('()=>{view.orbitCamera(Math.PI/2);tick();return fits()}')
                page.evaluate('document.querySelector("#inspection-host").style.maxWidth="520px";view.resize();tick()')
                assert not errors and not external and not http_errors and not failed, (errors, external, http_errors, failed)
                summary.update(normal_console_page_errors=0, normal_http_errors=0, normal_failed_requests=0, external_requests=0,
                    unique_model_requests=len(set(models)))
                # Intentional local load failure is isolated from the normal-path assertions above.
                page.route('**/models/Kilnback/kilnarch.glb', lambda route: route.fulfill(status=404, body='intentional missing model'))
                fallback = page.evaluate("async()=>{await view.showInspection({speciesId:'kilnarch'});return tick()}")
                assert fallback['countLoadedModels'] == 0 and len(fallback['fallbackModels']) == 1, fallback
                assert 'kilnarch' in fallback['fallbackModels'][0]
                summary['intentional_failure'] = {'fallbackModels': fallback['fallbackModels'], 'http_errors': len(http_errors)}
                assert len(http_errors) == 1 and not failed and not external
                page.unroute('**/models/Kilnback/kilnarch.glb')
                good(page.evaluate("()=>preview('kilnarch')"))
                # Dispose with an uncached real request pending; no late model can return.
                page.evaluate("window.pending=view.showInspection({speciesId:'thrumkin'});view.dispose();view.dispose()")
                page.evaluate('async()=>{await pending}')
                disposed = page.evaluate('tick()')
                assert disposed['cacheSize'] == 0 and disposed['modelReferences'] == 0 and disposed['countLoadedModels'] == 0
                assert disposed['inspectionBounds'] is None
                frozen_frames = disposed['frames']
                page.evaluate('view.orbitCamera(1);view.render(.1)')
                assert page.evaluate('view.inspect().frames') == frozen_frames
                assert page.evaluate('document.querySelectorAll("canvas").length') == 1
                assert len(errors) == 1 and '404' in errors[0], errors
                assert len(http_errors) == 1 and not failed and not external, (http_errors, failed, external)
                context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    summary.update(screenshots=[str(path) for path in captures], screenshot_bytes=sum(path.stat().st_size for path in captures),
        storage_delta_bytes=free_before-shutil.disk_usage(ROOT).free)
    print(json.dumps(summary, indent=2))
    print('PASS: 80 actual species, 120 previews, independent rotation, 40 scene cycles, single-touch, races, disposal and isolated fallback')


if __name__ == '__main__':
    run()
