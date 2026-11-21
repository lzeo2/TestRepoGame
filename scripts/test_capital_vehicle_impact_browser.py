#!/usr/bin/env python3
"""PROGRAMMATIC component evidence for real swept car contact and impact poses.

This supplied-dt fixture is not native career, natural traffic or reward evidence.
Run with: timeout 180s python3 -B scripts/test_capital_vehicle_impact_browser.py
--output <fresh-external-directory>. No installed dependencies or production edits.
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
BUDGET = 140
DOCUMENT = r'''<!doctype html><meta charset="utf-8"><title>Vehicle impact component</title>
<link rel="icon" href="data:,"><style>
body{margin:0;background:#20272d;color:#fff;font:15px sans-serif}header{padding:12px;background:#111b23}strong{color:#ffc46b}button{padding:10px 16px;margin:8px 5px 0 0;font:inherit}canvas{display:block}#status{margin-left:12px}
</style><header><strong>PROGRAMMATIC COMPONENT: car impact and articulated recovery</strong><div>Supplied-dt test geometry. No native career, natural traffic, save, cash or reward evidence.</div><button id="before">Before contact</button><button id="slow">3 m/s contact</button><button id="air">28 m/s contact: airborne</button><button id="ground">Advance: fallen</button><button id="getup">Advance: getting up</button><button id="land">Advance: standing</button><button id="pause">Repeat dt=0</button><button id="dispose">Dispose</button><span id="status"></span></header>
<script type="module">
import * as THREE from '/assets/car-arcade/vendor/three.module.js';
import {createSimulation} from '/Games/Capital%20Drive/simulation.js';
import {createGameplay} from '/Games/Capital%20Drive/gameplay.js';
import {createActorView} from '/Games/Capital%20Drive/actor-view.js';
let rafCalls=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{rafCalls++;return raf(fn);};
const map={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},roads:[],buildings:[],spawn:{x:200,z:200,yaw:0}};
const simulation=createSimulation(map,{trafficCount:0}),contacts=[];
const drain=simulation.drainVehicleImpacts;simulation.drainVehicleImpacts=()=>{const real=drain();contacts.push(...structuredClone(real));return real;};
const gameplay=createGameplay(map,simulation,{sandbox:true});
const scene=new THREE.Scene();scene.background=new THREE.Color(0xb9cbd5);
scene.add(new THREE.HemisphereLight(0xffffff,0x776e55,2.4));
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.setSize(1280,650);document.body.append(renderer.domElement);
const camera=new THREE.PerspectiveCamera(42,1280/650,.05,100);
const planeGeometry=new THREE.PlaneGeometry(70,70),groundMaterial=new THREE.MeshStandardMaterial({color:0x879170,roughness:1});
const ground=new THREE.Mesh(planeGeometry,groundMaterial);ground.rotation.x=-Math.PI/2;ground.position.y=-.01;scene.add(ground);
const grid=new THREE.GridHelper(60,30,0x63716a,0x78856f);grid.position.y=.005;scene.add(grid);
const roadGeometry=new THREE.BoxGeometry(7,.02,60),roadMaterial=new THREE.MeshStandardMaterial({color:0x555958,roughness:1});const road=new THREE.Mesh(roadGeometry,roadMaterial);road.position.y=-.005;scene.add(road);
const carGeometry=new THREE.BoxGeometry(1.8,1.1,4.5),carMaterial=new THREE.MeshStandardMaterial({color:0xc0543e,roughness:.7});
const carMesh=new THREE.Mesh(carGeometry,carMaterial);scene.add(carMesh);
const view=createActorView(scene,()=>0,{policeLimit:0});view.setPlayerAppearance('player:student');
const actorRoot=scene.getObjectByName('Street Life actors').getObjectByName('Adult player');
const trackedGeometries=new Set(),trackedMaterials=new Set(),disposedGeometries=new Set(),disposedMaterials=new Set();
scene.traverse(object=>{if(object.geometry)trackedGeometries.add(object.geometry);for(const material of object.material?(Array.isArray(object.material)?object.material:[object.material]):[])trackedMaterials.add(material);});
for(const geometry of trackedGeometries)geometry.addEventListener('dispose',()=>disposedGeometries.add(geometry.uuid));
for(const material of trackedMaterials)material.addEventListener('dispose',()=>disposedMaterials.add(material.uuid));
const car={id:'fixture:car',x:0,z:6,yaw:0,speed:0,vx:0,vz:0,length:4.5,width:1.8,active:true};
let elapsed=0,frames=0,disposed=false,movement=null,maximumHeight=0,maximumTravel=0,lastPhase='before';
const box=new THREE.Box3();
function people(){simulation.setExternalPeople([{id:'player-body',x:gameplay.state.actor.x,z:gameplay.state.actor.z,radius:.35}]);}
function metrics(){
 scene.updateMatrixWorld(true);let minimumY=Infinity,finite=true;const joints=[];
 actorRoot.traverseVisible(object=>{finite&&=object.matrixWorld.elements.every(Number.isFinite);if(object.isMesh){if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();box.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld);minimumY=Math.min(minimumY,box.min.y);}if(object.isGroup)joints.push({name:object.name,position:object.position.toArray(),rotation:[object.rotation.x,object.rotation.y,object.rotation.z],matrix:object.matrixWorld.toArray()});});
 return {finite,minimumY:Number.isFinite(minimumY)?minimumY:null,joints,rootRotation:[actorRoot.rotation.x,actorRoot.rotation.y,actorRoot.rotation.z]};
}
function render(){
 if(disposed)return;const actor=gameplay.state.actor;
 view.update(gameplay.state,{dt:0,focus:actor});
 carMesh.position.set(car.x,.55,car.z);carMesh.rotation.y=car.yaw;
 const lift=Math.min(2.5,actor.jumpHeight*.35);camera.position.set(actor.x+7,3.8+lift,actor.z+9);camera.lookAt(actor.x,.9+actor.jumpHeight*.6,actor.z);
 renderer.render(scene,camera);frames++;document.querySelector('#status').textContent=`${lastPhase}: ${view.stats.ragdoll?.phase||'unreported'} / ${elapsed.toFixed(2)} s`;
}
function tick(dt=1/60){
 people();gameplay.step(dt);elapsed+=dt;view.update(gameplay.state,{dt,focus:gameplay.state.actor});
 maximumHeight=Math.max(maximumHeight,gameplay.state.actor.jumpHeight);maximumTravel=Math.max(maximumTravel,Math.hypot(gameplay.state.actor.x,gameplay.state.actor.z));
}
function reset(){
 Object.assign(car,{x:0,z:6,yaw:0,speed:0,vx:0,vz:0});simulation.setExternalVehicles([car]);
 gameplay.reset({sandbox:true,onFoot:true,startPose:{x:0,z:0,yaw:Math.PI/2}});contacts.length=0;elapsed=0;maximumHeight=0;maximumTravel=0;movement=null;lastPhase='before';people();render();
}
function contact(speed){reset();car.speed=speed;car.vz=-speed;movement=simulation.moveVehicle(car,0,-5);car.speed=0;car.vz=0;tick();}
function advance(predicate,label){for(let i=0;i<300;i++){if(predicate()){lastPhase=label;render();return;}tick();}throw Error(`Actual component phase unavailable: ${label}`);}
document.querySelector('#before').onclick=reset;
document.querySelector('#slow').onclick=()=>{contact(3);for(let i=0;i<30;i++)tick();lastPhase='slow grounded contact';render();};
document.querySelector('#air').onclick=()=>{contact(28);advance(()=>elapsed>=.4&&gameplay.state.actor.jumpHeight>.8&&view.stats.ragdoll?.phase==='airborne','airborne');};
document.querySelector('#ground').onclick=()=>advance(()=>elapsed>=1.4&&view.stats.ragdoll?.phase==='fallen','fallen');
document.querySelector('#getup').onclick=()=>advance(()=>gameplay.state.actor.impactTime<=.36&&view.stats.ragdoll?.phase==='getting-up','getting-up');
document.querySelector('#land').onclick=()=>advance(()=>gameplay.state.actor.impactTime===0&&gameplay.state.actor.jumpHeight===0&&view.stats.ragdoll?.phase==='idle','standing');
document.querySelector('#pause').onclick=()=>{for(let i=0;i<12;i++)tick(0);render();};
document.querySelector('#dispose').onclick=()=>{view.dispose();scene.remove(ground,grid,road,carMesh);for(const object of [planeGeometry,groundMaterial,roadGeometry,roadMaterial,carGeometry,carMaterial,grid.geometry,...(Array.isArray(grid.material)?grid.material:[grid.material])])object.dispose();renderer.dispose();disposed=true;};
window.capitalImpactSnapshot=()=>({ready:true,programmaticComponent:true,label:'Supplied-dt component; no native career evidence',elapsed,frames,disposed,rafCalls,movement,contacts:structuredClone(contacts),maximumHeight,maximumTravel,gameplay:gameplay.snapshot(),view:view.stats,pose:disposed?null:metrics(),resources:{geometries:trackedGeometries.size,materials:trackedMaterials.size,disposedGeometries:disposedGeometries.size,disposedMaterials:disposedMaterials.size},actorAttached:!!scene.getObjectByName('Street Life actors'),renderer:{calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures},sceneChildren:scene.children.length});
reset();
</script>'''


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        parser.error('--output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        parser.error('--output must be fresh or empty')
    output.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    checks, errors, requests, external = [], [], [], []
    failure, page = None, None
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'

    def expired(signum, frame):
        raise TimeoutError(f'Vehicle component exceeded {BUDGET} seconds')

    prior = signal.signal(signal.SIGALRM, expired)
    signal.alarm(BUDGET)

    def check(value, label):
        assert value, label
        checks.append(label)
        print('PASS', label, flush=True)

    def snap():
        return page.evaluate('capitalImpactSnapshot()')

    def record(label):
        state = snap()
        with (output/'snapshots.jsonl').open('a') as log:
            log.write(json.dumps({'label': label, 'elapsedSeconds': round(time.monotonic()-started, 2), 'state': state})+'\n')
        return state

    def capture(label):
        state = record(label)
        page.screenshot(path=str(output/(label+'.png')), timeout=10000)
        return state

    def pause_stable(label):
        before = snap()
        page.locator('#pause').click()
        after = snap()
        check(all(before[key] == after[key] for key in ('elapsed', 'gameplay', 'pose', 'view', 'contacts', 'maximumHeight', 'maximumTravel')), label+' supplied dt=0 freezes actual physics and articulated pose')

    try:
        with ExitStack() as stack:
            playwright = stack.enter_context(sync_playwright())
            browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, timeout=30000, args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            stack.callback(browser.close)
            context = browser.new_context(viewport={'width':1280,'height':850})
            stack.callback(context.close)
            page = context.new_page()
            page.set_default_timeout(15000)
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
            page.on('requestfailed', lambda request: requests.append(f'{request.url}: {request.failure}'))
            page.on('response', lambda response: requests.append(f'{response.status} {response.url}') if response.status >= 400 else None)
            page.on('request', lambda request: external.append(request.url) if urlsplit(request.url).scheme in ('http','https') and urlsplit(request.url).netloc != urlsplit(base).netloc else None)
            page.route('**/*', lambda route: route.continue_() if urlsplit(route.request.url).scheme not in ('http','https') or urlsplit(route.request.url).netloc == urlsplit(base).netloc else route.abort())
            page.route('**/__capital-impact-component', lambda route: route.fulfill(content_type='text/html',body=DOCUMENT))
            try:
                page.goto(base+'/__capital-impact-component',wait_until='load',timeout=45000)
                page.wait_for_function('window.capitalImpactSnapshot?.().ready',timeout=45000)
                before = capture('programmatic-component-before-contact')
                check(before['programmaticComponent'] and 'PROGRAMMATIC COMPONENT' in page.locator('header').inner_text(), 'Evidence explicitly identifies programmatic component scope')
                check(before['pose']['finite'] and before['renderer']['calls'] > 0 and before['renderer']['triangles'] > 0, 'Actual Three renderer presents finite checked-in actor geometry')
                page.locator('#slow').click()
                slow = record('actual slow swept contact')
                check(slow['movement']['blocked'] and any(e['targetId']=='player-body' and e['offenderId']=='fixture:car' and e['speed']==3 for e in slow['contacts']), 'Real broadphase and swept low-speed car contact reaches Gameplay')
                check(slow['maximumHeight']==0 and slow['maximumTravel']<.2 and slow['gameplay']['health']==100, '3 m/s contact stays grounded with mild movement')
                page.locator('#air').click()
                air = capture('programmatic-component-airborne')
                check(air['movement']['blocked'] and any(e['targetId']=='player-body' and e['offenderId']=='fixture:car' and e['speed']==28 for e in air['contacts']), 'Real broadphase and swept fast car contact preserves pre-braking velocity')
                check(air['gameplay']['actor']['jumpHeight']>.8 and air['maximumTravel']>.3 and air['view']['ragdoll']['phase']=='airborne', '28 m/s contact physically launches root and drives airborne articulation')
                rotations = [j['rotation'] for j in air['pose']['joints'] if j['name'] in ('Hip','Knee','Shoulder','Elbow')]
                check(len(rotations)>=8 and len({tuple(round(v,3) for v in rotation) for rotation in rotations})>=4 and max(abs(v) for v in air['pose']['rootRotation'][::2])>.15, 'Airborne actor tumbles with distinct actual limb rotations')
                check(air['pose']['finite'] and air['pose']['minimumY']>=-.015, 'Airborne visible actor matrices are finite and clear the ground')
                pause_stable('Airborne')
                page.locator('#ground').click()
                fallen = capture('programmatic-component-fallen')
                check(fallen['gameplay']['actor']['jumpHeight']==0 and fallen['view']['ragdoll']['phase']=='fallen' and fallen['maximumTravel']>4, 'Actual launch lands after visible horizontal root travel')
                check(fallen['pose']['finite'] and fallen['pose']['minimumY']>=-.015, 'Fallen visible articulated geometry remains above ground')
                pause_stable('Fallen')
                page.locator('#getup').click()
                rising = capture('programmatic-component-getting-up')
                check(rising['view']['ragdoll']['phase']=='getting-up' and rising['pose']['finite'] and rising['pose']['minimumY']>=-.015, 'Bounded recovery articulates a grounded get-up pose')
                page.locator('#land').click()
                standing = capture('programmatic-component-standing')
                check(standing['gameplay']['actor']['impactTime']==0 and standing['gameplay']['actor']['jumpHeight']==0 and standing['view']['ragdoll']['phase']=='idle', 'Impact owner finishes landing and recovery')
                check(standing['rafCalls']==0 and standing['view']['geometryCount']==before['view']['geometryCount'] and standing['view']['materialCount']==before['view']['materialCount'], 'Component creates no RAF loop or per-impact geometry/material growth')
                page.locator('#dispose').click()
                disposed = record('component disposed')
                resources = disposed['resources']
                check(disposed['disposed'] and disposed['view']['disposed'] and not disposed['actorAttached'] and disposed['view']['drawCalls']==0 and resources['disposedGeometries']==resources['geometries'] and resources['disposedMaterials']==resources['materials'], 'Component disposal detaches actor and disposes every tracked scene geometry and material')
                check(not errors,'No browser or console errors')
                check(not requests,'No failed requests or HTTP errors')
                check(not external,'No external runtime requests')
            except Exception:
                try:
                    capture('programmatic-component-failure')
                except Exception:
                    pass
                raise
    except Exception as error:
        failure=f'{type(error).__name__}: {error}'
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM,prior)
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        result={'status':'FAIL' if failure else 'PASS','programmaticComponent':True,'failure':failure,'checks':checks,'errors':errors,'requests':requests,'external':external,'elapsedSeconds':round(time.monotonic()-started,2),'budgetSeconds':BUDGET,'screenshots':sorted(p.name for p in output.glob('*.png')),'limitations':['Programmatic component fixture with controlled car/body setup and supplied dt; no natural traffic or native career acceptance.','Actual swept contact, Gameplay motion and ActorView pose are exercised without injected impact events.','Software WebGL only; target hardware, natural frequency and camera feel remain unmeasured.']}
        (output/'results.json').write_text(json.dumps(result,indent=2)+'\n')
        print(json.dumps(result,indent=2),flush=True)
    if failure:
        raise SystemExit(1)


if __name__=='__main__':
    main()
