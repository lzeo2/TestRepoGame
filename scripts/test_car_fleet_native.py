#!/usr/bin/env python3
"""One bounded real-renderer fleet gallery; no game state or modeling substitutes."""
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import tempfile
import threading
from urllib.parse import urlsplit
from uuid import uuid4

from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
IDS = 'bricklet pip parcel finch lantern comet orchard pebble dockside horizon morrow gravel relay tempest atlas sunray'.split()
FILES = ['assets/car-arcade/' + p for p in ('models.js', 'fleet.js', 'vendor/three.module.js', 'vendor/BufferGeometryUtils.js', 'vendor/LICENSE')]
HTML = '''<!doctype html><meta charset="utf-8"><title>Frozen fictional fleet review</title>
<link rel="icon" href="data:,"><style>body{margin:0;background:#ddd9cf;font:18px sans-serif}h1{position:absolute;margin:16px;font-size:20px}canvas{display:block}</style>
<h1></h1><script type="module">
import * as T from '/assets/car-arcade/vendor/three.module.js';
import {CARS} from '/assets/car-arcade/fleet.js';
import {createCar,disposeCars} from '/assets/car-arcade/models.js';
const check=(v,m)=>{if(!v)throw Error(m)};
check(T.REVISION==='160','renderer revision');
const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(800,600);renderer.shadowMap.enabled=false;
renderer.setClearColor('#ddd9cf');document.body.append(renderer.domElement);
const scene=new T.Scene(), camera=new T.PerspectiveCamera(36,800/600,.05,100);
scene.add(new T.HemisphereLight(0xffffff,0x797268,2));
const light=new T.DirectionalLight(0xffffff,3);light.position.set(5,8,-6);scene.add(light);
const floor=new T.Mesh(new T.PlaneGeometry(40,40),new T.MeshStandardMaterial({color:'#bab5a8',roughness:1}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.002;scene.add(floor);
const grid=new T.GridHelper(20,40,0x999387,0xaaa497);grid.position.y=-.001;scene.add(grid);
let current=null;const resources=new Map(), rows=[];
function track(car){car.traverse(o=>{if(o.isMesh)for(const r of [o.geometry,o.material])if(!resources.has(r)){resources.set(r,0);r.addEventListener('dispose',()=>resources.set(r,resources.get(r)+1));}})}
function draw(){renderer.render(scene,camera)}
window.gallery={ids:CARS.map(c=>c.id), revision:T.REVISION, show(id){
  if(current)scene.remove(current);
  const spec=CARS.find(c=>c.id===id), car=createCar(id);current=car;scene.add(car);track(car);
  const bounds=new T.Box3().setFromObject(car), size=bounds.getSize(new T.Vector3());
  check([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),'finite bounds');
  check(Math.abs(bounds.min.y)<1e-6,'ground');
  check(car.userData.wheels.length===4,'four wheels');
  car.userData.wheels.forEach((w,i)=>{check(Math.abs(new T.Box3().setFromObject(w).min.y)<1e-6,'wheel ground');check(i<2?w.position.z<0:w.position.z>0,'front -Z');});
  const colors=new Set();let triangles=0;
  car.traverse(o=>{if(!o.isMesh)return;triangles+=o.geometry.index.count/3;
    for(const a of Object.values(o.geometry.attributes))check(Array.from(a.array).every(Number.isFinite),'finite attribute');
    const c=o.geometry.attributes.color;for(let i=0;i<c.count;i++)colors.add([c.getX(i),c.getY(i),c.getZ(i)].join(','));
    const n=o.geometry.attributes.normal;for(let i=0;i<n.count;i++)check(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))>.9,'nonzero normal');
  });
  check(car.children[0].material.color.getHexString()===spec.color.slice(1),'actual paint');
  check(colors.size>=8,'detail colors');
  camera.position.set(size.z*1.05,size.z*.80,-size.z*1.24);camera.lookAt(0,size.y*.48,0);camera.updateMatrixWorld();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    const p=new T.Vector3(x,y,z).project(camera);check(Math.abs(p.x)<.95&&Math.abs(p.y)<.95&&Math.abs(p.z)<1,'unclipped frame');
  }
  floor.visible=grid.visible=false;draw();
  const actual={triangles:renderer.info.render.triangles,drawcalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries};
  check(actual.triangles===triangles&&triangles<=8000&&actual.drawcalls===7,'actual render budget');
  const before=actual.geometries, again=createCar(id);track(again);
  car.children.forEach((m,i)=>check(m!==again.children[i]&&m.geometry===again.children[i].geometry&&m.material===again.children[i].material,'shared cache'));
  scene.remove(car);scene.add(again);draw();check(renderer.info.memory.geometries===before,'repeat cache');
  scene.remove(again);draw();check(renderer.info.render.calls===0&&renderer.info.memory.geometries===before,'release retains cache');
  scene.add(car);floor.visible=grid.visible=true;draw();
  check(renderer.info.programs.every(p=>!p.diagnostics||p.diagnostics.runnable!==false),'shader compilation');
  document.querySelector('h1').textContent=spec.name+' / front three-quarter';
  const row={id,...actual,fallback:0,ground:bounds.min.y,wheelGround:car.userData.wheels.map(w=>new T.Box3().setFromObject(w).min.y),colors:colors.size,bounds:size.toArray()};rows.push(row);return row;
},finish(){
  scene.remove(current);floor.visible=grid.visible=false;draw();check(renderer.info.render.calls===0,'empty frame');
  const cached=renderer.info.memory.geometries, old=current.children[0].geometry;
  renderer.dispose();disposeCars();disposeCars();check([...resources.values()].every(n=>n===1),'exact final disposal');
  const fresh=createCar('bricklet');check(fresh.children[0].geometry!==old,'fresh cache');
  const second=new T.WebGLRenderer();second.setPixelRatio(1);second.setSize(64,64);const s=new T.Scene();s.add(fresh);second.render(s,camera);
  const rebuilt={triangles:second.info.render.triangles,drawcalls:second.info.render.calls,geometries:second.info.memory.geometries};
  check(rebuilt.geometries===4&&rebuilt.drawcalls===7&&rebuilt.triangles===5704,'fresh renderer');
  second.dispose();disposeCars();floor.geometry.dispose();floor.material.dispose();grid.geometry.dispose();grid.material.dispose();
  return {cached,disposedResources:resources.size,rebuilt,rows};
}};
</script>'''


def hashes():
    return {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in FILES}


def main():
    free = shutil.disk_usage(ROOT).free
    assert free >= 2_000_000_000, free
    before = hashes()
    output = Path(tempfile.mkdtemp(prefix='car-fleet-native-'))
    private = '/' + uuid4().hex + '.html'
    html = output / 'gallery.html'
    html.write_text(HTML)
    errors, warnings = [], []

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def do_GET(self):
            if urlsplit(self.path).path == private:
                data = html.read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(data)
            elif urlsplit(self.path).path in ['/' + p for p in FILES]:
                super().do_GET()
            else:
                self.send_error(404)

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    print(f'OUTPUT={output} initial_free={free} screenshots=0/5000000', flush=True)
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = browser.new_page(viewport={'width': 800, 'height': 600}, device_scale_factor=1)
            page.set_default_timeout(20000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: (errors if m.type == 'error' else warnings).append(m.text) if m.type in ('error', 'warning') else None)
            page.on('requestfailed', lambda r: errors.append(r.url + ':' + str(r.failure)))
            page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
            def route(r):
                if urlsplit(r.request.url).netloc == urlsplit(origin).netloc:
                    r.continue_()
                else:
                    errors.append('external ' + r.request.url)
                    r.abort()
            page.route('**/*', route)
            runs = []
            for cycle in range(2):
                page.goto(origin + private) if cycle == 0 else page.reload()
                page.wait_for_function('window.gallery !== undefined')
                assert page.evaluate('gallery.ids') == IDS
                for car in IDS:
                    print(json.dumps(page.evaluate('(id)=>gallery.show(id)', car)), flush=True)
                    if cycle == 0:
                        page.screenshot(path=str(output / (car + '.png')))
                        assert sum(p.stat().st_size for p in output.glob('*.png')) <= 5_000_000
                runs.append(page.evaluate('gallery.finish()'))
            version = browser.version
            browser.close()
        sheet = Image.new('RGB', (1000, 800), '#ddd9cf')
        for i, car in enumerate(IDS):
            with Image.open(output / (car + '.png')) as image:
                sheet.paste(image.resize((250, 188)), ((i % 4) * 250, (i // 4) * 200))
            ImageDraw.Draw(sheet).text(((i % 4) * 250 + 5, (i // 4) * 200 + 187), car, fill='black')
        sheet.save(output / 'contact-sheet.png')
        images = {p.name: {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(output.glob('*.png'))}
        assert sum(v['bytes'] for v in images.values()) <= 5_000_000
        assert hashes() == before, 'source changed during review'
        assert shutil.disk_usage(ROOT).free >= 2_000_000_000
        result = dict(browser=version, sources=before, runs=runs, images=images, errors=errors, warnings=warnings, final_free=shutil.disk_usage(ROOT).free)
        (output / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result), flush=True)
        assert not errors, errors
        print('PASS: 16 native cars, reload, cache/release/disposal; model gallery only.')
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)


if __name__ == '__main__':
    main()
