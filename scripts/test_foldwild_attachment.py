#!/usr/bin/env python3
"""Native WebGL1 previews; independently measure accessory contact to source triangles."""
import functools
import hashlib
import json
import shutil
import sys
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

sys.dont_write_bytecode = True
from test_foldwild_inspection import Handler as InspectionHandler, HARNESS, ROOT
from playwright.sync_api import sync_playwright

OUTPUT = Path('/tmp/foldwild-m2-attachments')
EXTRA = b'''
import {GLTFLoader} from '/Games/Foldwild/vendor/GLTFLoader.js';
const sourceLoader=new GLTFLoader();let source=null,sourceId=null;
window.contact=async(id,target=2.4)=>{
  if(sourceId!==id){
    if(source)source.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const m of Array.isArray(n.material)?n.material:[n.material])m.dispose()}});
    source=(await sourceLoader.loadAsync('/Games/Foldwild/'+species.find(s=>s.id===id).model)).scene;
    sourceId=id;
  }
  const a=view.inspect().cosmeticAttachments[0];
  if(!a?.attached||a.speciesId!==id)throw Error('missing actual attachment '+id);
  const info=view.inspect();
  if(!Object.isFrozen(info.cosmeticAttachments)||!Object.isFrozen(a)||!Object.isFrozen(a.anchor)||!Object.isFrozen(a.position))throw Error('mutable metadata');
  source.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const scale=target/Math.max(size.x,size.y,size.z);
  const inner=new THREE.Vector3(a.position.x-a.side*a.thickness/2,a.position.y,a.position.z);
  if(inner.distanceTo(new THREE.Vector3(a.anchor.x,a.anchor.y,a.anchor.z))>1e-7)throw Error('accessory inner face is not anchored');
  const triangle=new THREE.Triangle(),closest=new THREE.Vector3();let distance=Infinity;
  const vertex=(mesh,i,v)=>v.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld)
    .sub(new THREE.Vector3(center.x,box.min.y,center.z)).multiplyScalar(scale);
  // Independent triangle distance, not the implementation's ray hit or bounding-box fit claim.
  source.traverse(mesh=>{if(!mesh.isMesh)return;
    const g=mesh.geometry,count=g.index?g.index.count:g.attributes.position.count;
    for(let i=0;i<count;i+=3){
      vertex(mesh,g.index?g.index.getX(i):i,triangle.a);
      vertex(mesh,g.index?g.index.getX(i+1):i+1,triangle.b);
      vertex(mesh,g.index?g.index.getX(i+2):i+2,triangle.c);
      triangle.closestPointToPoint(inner,closest);distance=Math.min(distance,inner.distanceTo(closest));
    }
  });
  if(!Number.isFinite(distance)||distance>.00001)throw Error('floating accessory '+id+' distance '+distance);
  return {distance,attachment:a};
};
'''
HARNESS = HARNESS.replace(b'window.ready=true;', EXTRA + b'window.ready=true;')


class Handler(InspectionHandler):
    def do_GET(self):
        if self.path == '/__foldwild_attachment':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(HARNESS)))
            self.end_headers()
            self.wfile.write(HARNESS)
        else:
            super().do_GET()


def run():
    free_before = shutil.disk_usage(ROOT).free
    assert free_before >= 2_000_000_000, 'disk guard: less than 2 GB free'
    models = sorted((ROOT / 'Games/Foldwild/models').glob('*/*.glb'))
    assert len(models) == 80
    hashes = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in models}
    OUTPUT.mkdir(exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 8804), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = 'http://127.0.0.1:8804'
    errors, external, http_errors, failed, captures, distances = [], [], [], [], [], []
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
                page.on('response', lambda response: http_errors.append(response.url) if response.status >= 400 else None)
                page.on('requestfailed', lambda request: failed.append(request.url))
                page.goto(origin + '/__foldwild_attachment')
                page.wait_for_function('window.ready', timeout=30000)
                assert page.evaluate('typeof view.showInspection') == 'function'
                roster = page.evaluate('species.map(s=>({id:s.id,family:s.family}))')
                assert len(roster) == 80
                for entry in roster:
                    for cosmetic in ['badge', 'scarf']:
                        info = page.evaluate('args=>preview(...args)', [entry['id'], cosmetic])
                        assert info['countLoadedModels'] == 1 and info['modelReferences'] == 1, info
                        assert info['loadedModels'][0].endswith('/' + entry['id'] + '.glb'), info
                        assert not info['fallbackModels'] and info['cacheSize'] <= 12, info
                        assert page.evaluate('fits()'), entry
                        result = page.evaluate('id=>contact(id)', entry['id'])
                        distances.append(result['distance'])
                        assert result['attachment']['cosmeticId'] == cosmetic
                assert len(distances) == 160
                # Representative native captures, then the two reported defects at side/three-quarter angles.
                representatives = list({s['family']: s['id'] for s in reversed(roster)}.items())
                assert len(representatives) == 10
                def shot(name):
                    path = OUTPUT / (name + '.jpg')
                    page.screenshot(path=str(path), type='jpeg', quality=65)
                    assert path.stat().st_size < 300000
                    captures.append(path.name)
                for family, species_id in representatives:
                    for cosmetic in ['none', 'badge', 'scarf', 'paper-hat']:
                        page.evaluate('args=>preview(...args)', [species_id, cosmetic])
                        assert page.evaluate('fits()')
                        shot('desktop-' + family.lower() + '-' + cosmetic)
                for species_id, cosmetic, width in [('raymote', 'scarf', 1280), ('budriv', 'badge', 390)]:
                    page.set_viewport_size({'width': width, 'height': 720})
                    page.evaluate('args=>preview(...args)', [species_id, cosmetic])
                    for angle, label in [(0, 'front'), (3.141592653589793/4, 'three-quarter'), (3.141592653589793/4, 'side')]:
                        page.evaluate('angle=>{view.orbitCamera(angle);tick()}', -angle if cosmetic == 'scarf' else angle)
                        assert page.evaluate('fits()')
                        shot(species_id + '-' + cosmetic + '-' + label)
                page.evaluate('document.querySelector("#inspection-host").style.maxWidth="180px";view.resize();tick()')
                assert page.evaluate('fits()')
                frames = page.evaluate('view.inspect().frames')
                page.wait_for_timeout(2000)
                assert page.evaluate('view.inspect().frames') == frames, 'view owns a RAF'
                assert page.evaluate('document.querySelectorAll("canvas").length') == 1
                assert not errors and not external and not http_errors and not failed, (errors, external, http_errors, failed)
                page.evaluate('view.dispose()')
                assert page.evaluate('view.inspect().cosmeticAttachments.length') == 0
                context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    assert hashes == {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in models}, 'source model bytes changed'
    summary = dict(actual_source_models=80, badge_scarf_contacts=160,
        max_independent_triangle_distance=max(distances), unchanged_source_sha256=80,
        normal_console_page_errors=len(errors), http_errors=len(http_errors), failed_requests=len(failed), external_requests=len(external),
        screenshots=captures, screenshot_bytes=sum((OUTPUT / name).stat().st_size for name in captures),
        storage_delta_bytes=free_before-shutil.disk_usage(ROOT).free)
    print(json.dumps(summary, indent=2))
    print('PASS: 160 actual badge/scarf source-triangle contacts; 46 native captures; unchanged 80 GLBs; no autonomous RAF or browser/request errors')


if __name__ == '__main__':
    run()
