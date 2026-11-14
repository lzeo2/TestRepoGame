#!/usr/bin/env python3
"""Bounded native Free roam loading/input and shared-person component evidence.

The temporary /__people_fixture__ route is a presentation fixture, not gameplay.
It uses unchanged local car artwork and the production person/occupant view APIs.
No production state setters, installs, or persistent servers are used.
"""
import argparse
from contextlib import ExitStack
import functools
import http.server
import json
from pathlib import Path
import signal
import threading
import time
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BUDGET = 180
FIXTURE = r'''<!doctype html><html lang="en"><meta charset="utf-8">
<title>Capital Drive shared adult component evidence</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#e9e7df;color:#242c30;font:18px system-ui,sans-serif}
header{padding:24px 32px 16px}h1{margin:0 0 8px;font-size:26px}p{margin:6px 0;line-height:1.5}
main{display:grid;grid-template-columns:1fr 1.5fr;gap:20px;padding:0 28px 24px}section{background:#f7f5ef;border:1px solid #bcbfb7}
h2{font-size:20px;margin:16px 20px 4px}section p{margin:4px 20px 16px;font-size:16px}canvas{display:block;width:100%;height:570px}
footer{padding:0 32px 20px}button{background:#232c30;color:white;border:0;padding:13px 20px;font:inherit;cursor:pointer}
</style><header><h1>Shared adult: standing, driving and leaving</h1>
<p>Component presentation fixture. Local production person model, occupant view and unchanged Morrow open-cabin car artwork.</p>
<p id="identity"></p></header><main><section><h2>Standing reference</h2><p>Same adult identity and clothing. Full body and feet.</p><canvas id="standing"></canvas></section>
<section><h2 id="phase">Seated driver</h2><p id="description">Actual cockpit anchor and roof-fit scale. The open cabin makes the seated adult visible.</p><canvas id="vehicle"></canvas></section></main>
<footer><button id="exit">Show the same adult after exit</button><p>This fixture is separate from the native Free roam check; it does not demonstrate a normal gameplay exit or trip.</p></footer>
<script type="module">
import * as THREE from '/assets/car-arcade/vendor/three.module.js';
import {createCar,disposeCars} from '/assets/car-arcade/models.js';
import {appearanceForPerson,createPersonGeometries,emitPersonParts,PERSON_MODEL} from '/Games/Capital%20Drive/person-model.js';
import {createVehicleOccupantsView} from '/Games/Capital%20Drive/vehicle-occupants-view.js';
const id='ped:17',appearance=appearanceForPerson(id),geometries=createPersonGeometries(),resources=[];
const rendererFor=canvas=>{const r=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});r.setSize(canvas.clientWidth,570,false);r.setPixelRatio(1);r.setClearColor(0xe6e9e3);return r;};
function environment(){const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfffaf0,0x6f786c,2.3));const sun=new THREE.DirectionalLight(0xffffff,2.5);sun.position.set(-4,8,-6);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshLambertMaterial({color:0xa9aaa0}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;scene.add(floor);resources.push(floor.geometry,floor.material);
const strip=new THREE.Mesh(new THREE.BoxGeometry(50,.08,.7),new THREE.MeshLambertMaterial({color:0xd8d4c7}));strip.position.set(0,.01,3.6);scene.add(strip);resources.push(strip.geometry,strip.material);return scene;}
const standingScene=environment(),vehicleScene=environment();
const adult=new THREE.Group();adult.scale.setScalar(appearance.height);standingScene.add(adult);
emitPersonParts(appearance,{kind:'standing',stride:0},(name,x,y,z,sx,sy,sz,color,rx=0)=>{const material=new THREE.MeshLambertMaterial({color});resources.push(material);const mesh=new THREE.Mesh(geometries[PERSON_MODEL.shapes[name]],material);mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.x=rx;mesh.scale.set(sx,sy,sz);adult.add(mesh);});
const car=createCar('morrow',{color:'#657e85'});car.position.y=.18;vehicleScene.add(car);
const occupants=createVehicleOccupantsView(vehicleScene,()=>0);
const vehicle={id:'fixture-car',personId:id,modelId:'morrow',x:0,z:0,yaw:0,occupied:true,active:true};
occupants.update(0,{cars:[vehicle],focus:{x:0,z:0}});
const standingRenderer=rendererFor(document.querySelector('#standing')),vehicleRenderer=rendererFor(document.querySelector('#vehicle'));
const standingCamera=new THREE.PerspectiveCamera(33,document.querySelector('#standing').clientWidth/570,.1,60);standingCamera.position.set(-2.5,1.65,-4);standingCamera.lookAt(0,.9,0);
const vehicleCamera=new THREE.PerspectiveCamera(39,document.querySelector('#vehicle').clientWidth/570,.1,60);vehicleCamera.position.set(-2.8,2.1,-4.1);vehicleCamera.lookAt(-.15,.8,0);
let phase='seated';
function render(){standingRenderer.render(standingScene,standingCamera);vehicleRenderer.render(vehicleScene,vehicleCamera);}
function snapshot(){const parts=[];vehicleScene.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.count){const bounds=[],colors=[];for(let i=0;i<mesh.count;i++){const color=new THREE.Color();mesh.getColorAt(i,color);colors.push(color.getHex());const matrix=new THREE.Matrix4();mesh.getMatrixAt(i,matrix);bounds.push(new THREE.Vector3().setFromMatrixPosition(matrix).toArray());}parts.push({name:mesh.name,count:mesh.count,positions:bounds,colors});}});return {ready:true,phase,personId:id,appearance:{...appearance},standingPartColors:adult.children.map(mesh=>({name:mesh.name,color:mesh.material.color.getHex()})),standingAppearanceKey:appearance.key,vehicleAppearanceKey:appearanceForPerson(vehicle.personId).key,modelId:'morrow',occupants:{...occupants.stats},parts,resources:{standing:{...standingRenderer.info.render},vehicle:{...vehicleRenderer.info.render},geometries:Object.keys(geometries).length}};}
window.peopleFixtureSnapshot=()=>structuredClone(snapshot());
document.querySelector('#identity').textContent=`Adult ${appearance.id} · appearance ${appearance.key}`;
document.querySelector('#exit').addEventListener('click',()=>{if(phase!=='seated')return;vehicle.occupied=false;occupants.addExit({id:vehicle.id,personId:id,x:-1.5,z:-.1,yaw:.2});occupants.update(0,{cars:[vehicle],focus:{x:0,z:0}});phase='exited';document.querySelector('#phase').textContent='Same driver after exit';document.querySelector('#description').textContent='Production occupant exit pool; stable adult identity, skin, hair and clothes.';render();});
window.addEventListener('pagehide',()=>{occupants.dispose();resources.forEach(value=>value.dispose());Object.values(geometries).forEach(value=>value.dispose());disposeCars();standingRenderer.dispose();vehicleRenderer.dispose();},{once:true});
render();
</script></html>'''


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if urlsplit(self.path).path == '/__people_fixture__':
            payload = FIXTURE.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            super().do_GET()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--capture', action='store_true')
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external, observations = [], [], [], [], []
    failure, page = None, None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def expired(signum, frame):
        raise TimeoutError(f'People browser run exceeded {BUDGET} seconds')

    previous_alarm = signal.signal(signal.SIGALRM, expired)
    signal.alarm(BUDGET)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def attach(target):
        target.set_default_timeout(12000)
        target.on('pageerror', lambda error: errors.append(str(error)))
        target.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
        target.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
        target.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        target.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http', 'https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
        target.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http', 'https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())

    def record(label, expression):
        state = page.evaluate(expression)
        observations.append({'label': label, 'state': state})
        return state

    def capture(name):
        if args.capture:
            page.screenshot(path=str(output / (name + '.png')), timeout=12000)

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, timeout=30000,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width': 1280, 'height': 800})
            stack.callback(context.close)
            page = context.new_page()
            attach(page)
            try:
                page.goto(base + '/Games/Capital%20Drive/', wait_until='load', timeout=60000)
                page.wait_for_function('window.capitalDriveSnapshot?.().ready', timeout=60000)
                check(not page.evaluate('capitalDriveSnapshot().rendering.compatibility'), 'Native game uses WebGL, not compatibility fallback')
                page.locator('[data-game-mode="free"]').click()
                page.locator('#start-button').click()
                page.wait_for_function('capitalDriveSnapshot().started&&capitalDriveSnapshot().gameMode==="free"')
                page.wait_for_function('capitalDriveSnapshot().pedestrians.visible>0&&capitalDriveSnapshot().occupants.drivers>0', timeout=15000)
                state = record('native Free roam driving', 'capitalDriveSnapshot()')
                check(state['pedestrians']['visible'] > 0, 'Native Free roam has visible pedestrian batches')
                check(state['occupants']['drivers'] > 0, 'Native Free roam has visible traffic-driver batches')
                page.locator('#world canvas').focus()
                page.keyboard.press('e')
                page.wait_for_function('capitalDriveSnapshot().gameplay.mode==="foot"&&capitalDriveSnapshot().actors.playerVisible', timeout=15000)
                before = record('native E exit', 'capitalDriveSnapshot()')
                check(before['actors']['playerVisible'], 'Normal E exit displays the adult player')
                page.keyboard.down('w')
                try:
                    page.wait_for_timeout(450)
                finally:
                    page.keyboard.up('w')
                after = record('native short walk', 'capitalDriveSnapshot()')
                check(after['gameplay']['mode'] == 'foot' and ((after['focus']['x']-before['focus']['x'])**2 + (after['focus']['z']-before['focus']['z'])**2) > .01, 'Normal W input moves the on-foot player')
                capture('native-free-roam-adults')
                page.close()
                page = context.new_page()
                page.set_viewport_size({'width': 1440, 'height': 960})
                attach(page)
                page.goto(base + '/__people_fixture__', wait_until='load', timeout=15000)
                page.wait_for_function('window.peopleFixtureSnapshot?.().ready', timeout=15000)
                seated = record('component seated and standing reference', 'peopleFixtureSnapshot()')
                check(seated['occupants']['drivers'] == 1 and seated['occupants']['exits'] == 0, 'Component fixture renders one actual cockpit driver')
                check(seated['standingAppearanceKey'] == seated['vehicleAppearanceKey'], 'Component standing and seated adult share the same appearance identity')
                check(seated['resources']['standing']['triangles'] > 0 and seated['resources']['vehicle']['triangles'] > 0, 'Both component canvases render nonempty local geometry')
                capture('component-standing-and-seated')
                page.locator('#exit').click()
                exited = record('component same adult after exit', 'peopleFixtureSnapshot()')
                check(exited['phase'] == 'exited' and exited['occupants']['drivers'] == 0 and exited['occupants']['exits'] == 1, 'Component exit replaces the seated driver with one standing adult')
                check(exited['appearance'] == seated['appearance'], 'Component exit preserves identity, skin, hair, clothing and height')
                check([(part['name'], part['colors']) for part in exited['parts']] == [(part['name'], part['colors']) for part in seated['parts']], 'Actual seated and exited instance colors match for every body part')
                check(exited['occupants']['drawCalls'] <= 7, 'Component occupant rendering remains bounded to seven batches')
                capture('component-same-adult-after-exit')
                check(not errors, 'No native game or component page/console errors')
                check(not requests, 'No failed requests or HTTP errors')
                check(not external, 'No external runtime request attempts')
            except Exception:
                try:
                    capture('failure-state')
                except Exception as capture_error:
                    observations.append({'failureCapture': str(capture_error)})
                raise
    except Exception as error:
        failure = f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, previous_alarm)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report = {'status': 'FAIL' if failure else 'PASS', 'failure': failure, 'checks': checks,
                  'errors': errors, 'requests': requests, 'external': external, 'observations': observations,
                  'elapsedSeconds': round(time.monotonic() - started, 2), 'budgetSeconds': BUDGET,
                  'screenshots': sorted(path.name for path in output.glob('*.png')),
                  'limitations': ['Native check uses actual Free roam start/E/W inputs and read-only snapshots; no career trip or NPC carjacking is demonstrated.',
                                  'Component route is an external test fixture, not a normal gameplay scene; it directly supplies presentation descriptors to public view APIs.',
                                  'The unchanged Morrow open cabin reveals its seated driver; the actual windshield and body still partially occlude the adult. Other roofs may obscure more of the seated body.',
                                  'Software WebGL only; N100/native GPU performance and touch travel remain unmeasured.',
                                  'Screenshots require separate visual review.']}
        (output / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps({key: value for key, value in report.items() if key != 'observations'}, indent=2), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
