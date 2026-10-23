"""Isolated speedboat evidence, not native Wings or visual acceptance.

Run from the repository root with existing Playwright/Chromium and external Three:
python3 -B Games/Wings/verification/check-speedboat-browser.py \
    --model .tmp/wings-speedboat-model/reroll/speedboat.glb \
    --three-root ../three-0.186.0/package --out .tmp/boat-reroll-browser
Parent vision review must inspect two angles plus belly before operator previews.
No installation, dependency copying, runtime integration or material recoloring.
Optional --require-pbr requires embedded normal, packed MR and base-color maps;
--baseline-receipt compares all 16 camera/light setups, not changed material pixels.
--self-check exercises receipt parity without Playwright or a browser.
"""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
import platform
from pathlib import Path
import shutil
import signal
import struct
import subprocess
import sys
import threading
import time
from urllib.parse import unquote, urlsplit

ANGLES = ('front', 'side', 'top', 'rear', 'belly', 'bow-quarter', 'stern-quarter')
CASES = [(t, a, 1000, 800) for t in ('light', 'dark') for a in ANGLES]
CASES += [('light', 'bow-quarter', 390, 844), ('dark', 'stern-quarter', 390, 844)]


def receipt_parity(current, baseline):
    """Compare baseline setup fields, allowing additive receipt metadata."""
    differences = []

    def compare(actual, expected, path):
        if isinstance(expected, dict):
            for key, value in expected.items():
                compare(actual.get(key) if isinstance(actual, dict) else None, value, f'{path}.{key}')
        elif isinstance(expected, list):
            if not isinstance(actual, list) or len(actual) != len(expected):
                differences.append(path)
            else:
                for i, value in enumerate(expected):
                    compare(actual[i], value, f'{path}[{i}]')
        elif type(expected) in (int, float) and type(actual) in (int, float):
            if not math.isclose(actual, expected, rel_tol=1e-9, abs_tol=1e-7):
                differences.append(path)
        elif actual != expected:
            differences.append(path)

    def identities(receipt):
        return [tuple(r.get(k) for k in ('theme', 'angle', 'width', 'height'))
                for r in receipt.get('cases', [])]

    for name, receipt in (('current', current), ('baseline', baseline)):
        if identities(receipt) != CASES:
            differences.append(f'{name}.caseIdentities')
    for i, (actual, expected) in enumerate(zip(current.get('cases', []), baseline.get('cases', []))):
        for field in ('camera', 'lighting'):
            if not isinstance(expected.get(field), dict) or not expected[field]:
                differences.append(f'cases[{i}].{field}.missingBaseline')
            else:
                compare(actual.get(field), expected[field], f'cases[{i}].{field}')
    if 'renderSetup' in baseline:
        compare(current.get('renderSetup'), baseline['renderSetup'], 'renderSetup')
    return {'status':'FAIL' if differences else 'PASS', 'differences':differences,
            'caseCount':len(current.get('cases', [])), 'absoluteTolerance':1e-7,
            'relativeTolerance':1e-9,
            'scope':'ordered case identities, camera/projection, baseline lighting and available renderSetup; not pixels/maps'}


def self_check():
    fixture = {'cases':[dict(zip(('theme', 'angle', 'width', 'height'), case),
                            camera={'projection':[1., 0.], 'position':[0., 1., 2.]},
                            lighting={'key':3., 'exposure':1.}) for case in CASES]}
    clone = lambda: json.loads(json.dumps(fixture))
    assert receipt_parity(clone(), fixture)['status'] == 'PASS'
    for field, key in (('camera', 'projection'), ('lighting', 'key')):
        changed = clone()
        changed['cases'][0][field][key] = [2., 0.] if field == 'camera' else 4.
        assert receipt_parity(changed, fixture)['status'] == 'FAIL'
    changed = clone()
    changed['cases'][-1]['angle'] = 'front'
    assert receipt_parity(changed, fixture)['status'] == 'FAIL'
    assert receipt_parity(fixture, changed)['status'] == 'FAIL'
    changed = clone()
    changed['cases'].pop()
    assert receipt_parity(changed, fixture)['status'] == 'FAIL'
    print('PASS: parity accepts identical setup; rejects camera, lighting, identity and count changes')


HTML = r'''<!doctype html>
<html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,"><title>Speedboat raw reroll evidence</title>
<style>
* { box-sizing:border-box } body { margin:0; font:14px system-ui,sans-serif }
header { height:80px; padding:10px 16px } h1 { font-size:18px; margin:0 0 4px }
p { margin:0 } canvas { display:block } body { background:#e9e7e0; color:#17191c }
body.dark { background:#1a1d22; color:#eee }
</style>
<header><h1>Speedboat raw model</h1><p id="label"></p></header><canvas></canvas>
<script type="importmap">{"imports":{"three":"/__three__/build/three.module.js","three/addons/":"/__three__/examples/jsm/"}}</script>
<script type="module">
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
try {
  if (T.REVISION !== '186') throw Error('Three revision must be 186');
  const renderer = new T.WebGLRenderer({canvas:document.querySelector('canvas'),
    antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFShadowMap;
  const scene = new T.Scene();
  scene.environmentIntensity = .55;
  const room = new RoomEnvironment();
  const pmrem = new T.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  const hemi = new T.HemisphereLight(0xe7f3ff, 0x807667, .6);
  const key = new T.DirectionalLight(0xfff2dc, 3);
  const fill = new T.DirectionalLight(0xe7f3ff, .45);
  key.castShadow = true;
  key.shadow.mapSize.set(2048,2048);
  key.shadow.bias = -.00005;
  key.shadow.normalBias = .015;
  scene.add(hemi, key, fill, key.target, fill.target);
  const gltf = await new GLTFLoader().loadAsync('/__model__.glb');
  // GLTFLoader awaits image dependencies; explicitly decode/check every embedded texture too.
  const textures = await gltf.parser.getDependencies('texture');
  await Promise.all(textures.map(async texture => {
    const image = texture.image;
    if (image?.decode) await image.decode();
    if (!(image?.width > 0 && image?.height > 0)) throw Error('PBR image not loaded');
    renderer.initTexture(texture);
  }));
  const mapSlots = ['normalMap','roughnessMap','metalnessMap','map'];
  const snapshot = m => {
    const index = gltf.parser.associations.get(m)?.materials;
    const definition = gltf.parser.json.materials[index];
    if (!definition) throw Error('Material has no GLB definition');
    const pbr = definition.pbrMetallicRoughness ?? {};
    const expected = {normalMap:definition.normalTexture?.index,
      roughnessMap:pbr.metallicRoughnessTexture?.index,
      metalnessMap:pbr.metallicRoughnessTexture?.index, map:pbr.baseColorTexture?.index};
    const maps = Object.fromEntries(mapSlots.map(slot => {
      const texture = m[slot], sourceIndex = expected[slot];
      if (!!texture !== (sourceIndex !== undefined)) throw Error(`Unexpected/missing ${slot}: ${m.name}`);
      if (!texture) return [slot,null];
      const textureIndex = gltf.parser.associations.get(texture)?.textures;
      const colorSpace = slot === 'map' ? T.SRGBColorSpace : T.NoColorSpace;
      if (textureIndex !== sourceIndex || texture.colorSpace !== colorSpace)
        throw Error(`Wrong ${slot} source/color space: ${m.name}`);
      const image = texture.image;
      if (!(image?.width > 0 && image?.height > 0)) throw Error(`Unloaded ${slot}`);
      const source = gltf.parser.json.textures[textureIndex].source;
      if (!Number.isInteger(gltf.parser.json.images[source]?.bufferView))
        throw Error(`Non-embedded ${slot}`);
      return [slot,{textureIndex,imageIndex:source,colorSpace:texture.colorSpace,
        width:image.width,height:image.height,channel:texture.channel,loaded:true}];
    }));
    // GLTF factors are linear. Reject fake runtime color/factor overrides rather than correcting them.
    const base = pbr.baseColorFactor ?? [1,1,1,1];
    if (m.color.toArray().some((v,i)=>Math.abs(v-base[i])>1e-7) ||
        Math.abs(m.opacity-base[3])>1e-7 ||
        Math.abs(m.metalness-(pbr.metallicFactor ?? 1))>1e-7 ||
        Math.abs(m.roughness-(pbr.roughnessFactor ?? 1))>1e-7)
      throw Error(`Runtime material factors differ from GLB: ${m.name}`);
    if (m.roughnessMap !== m.metalnessMap) throw Error(`MR maps must share a packed texture: ${m.name}`);
    return {definition:index, name:m.name, type:m.type,
      color:m.color.toArray(), metalness:m.metalness, roughness:m.roughness,
      opacity:m.opacity, transparent:m.transparent, alphaTest:m.alphaTest,
      side:m.side, depthWrite:m.depthWrite, emissive:m.emissive.toArray(),
      emissiveIntensity:m.emissiveIntensity, transmission:m.transmission ?? 0,
      thickness:m.thickness ?? 0, ior:m.ior ?? 1.5,
      clearcoat:m.clearcoat ?? 0, clearcoatRoughness:m.clearcoatRoughness ?? 0,
      envMapIntensity:m.envMapIntensity, maps, sourceFactorsMatch:true,
      normalScale:m.normalScale.toArray(), packedMR:m.roughnessMap ? m.roughnessMap===m.metalnessMap : false};
  };
  const model = gltf.scene;
  scene.add(model); model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model);
  const center = box.getCenter(new T.Vector3());
  const radius = box.getSize(new T.Vector3()).length()/2;
  if (!(radius > 0 && Number.isFinite(radius))) throw Error('Invalid bounds');
  const materials = new Map(), points = [];
  let triangles = 0, assignments = 0;
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    triangles += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count)/3;
    const slots = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    assignments += slots.length;
    for (const m of slots) {
      materials.set(m.uuid, m);
    }
    const positions = mesh.geometry.attributes.position;
    for (let i=0; i<positions.count; i++)
      points.push(new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld));
  });
  const materialSnapshots = () => [...materials.values()].map(snapshot);
  const originalMaterials = JSON.stringify(materialSnapshots());
  window.asset = {three:T.REVISION, triangles, assignments,
    materials:materialSnapshots(), bounds:{min:box.min.toArray(),max:box.max.toArray()},
    modelMatrix:model.matrixWorld.toArray(), radius,
    texturesLoaded:textures.length, mapsReadyBeforeRender:true, materialOverrides:false};
  window.renderSetup = {outputColorSpace:renderer.outputColorSpace,
    toneMapping:'ACESFilmic',exposure:renderer.toneMappingExposure,pixelRatio:renderer.getPixelRatio(),
    environment:{source:'procedural RoomEnvironment PMREM',sigma:.04,intensity:scene.environmentIntensity,
      mapping:scene.environment.mapping,colorSpace:scene.environment.colorSpace,
      width:scene.environment.image.width,height:scene.environment.image.height},
    lights:{hemisphere:{sky:hemi.color.toArray(),ground:hemi.groundColor.toArray(),intensity:hemi.intensity},
      key:{color:key.color.toArray(),intensity:key.intensity},
      fill:{color:fill.color.toArray(),intensity:fill.intensity}},
    shadows:{enabled:renderer.shadowMap.enabled,type:renderer.shadowMap.type,
      bias:key.shadow.bias,normalBias:key.shadow.normalBias,mapSize:key.shadow.mapSize.toArray()}};
  const context = renderer.getContext(), debug = context.getExtension('WEBGL_debug_renderer_info');
  window.runtimeEnvironment = {userAgent:navigator.userAgent,webGLVersion:context.getParameter(context.VERSION),
    vendor:context.getParameter(debug ? debug.UNMASKED_VENDOR_WEBGL : context.VENDOR),
    renderer:context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER)};
  const poses = {
    front:[[0,0,-1],[0,1,0]], side:[[1,0,0],[0,1,0]],
    top:[[0,1,0],[0,0,-1]], rear:[[0,0,1],[0,1,0]],
    belly:[[0,-1,0],[0,0,-1]],
    'bow-quarter':[[.9,.6,-1.2],[0,1,0]],
    'stern-quarter':[[-.9,.6,1.2],[0,1,0]]
  };
  // Fit the actual projected geometry in each orthographic view; model scale stays identity.
  const camera = new T.OrthographicCamera();
  window.renderCase = async ({theme,angle,width,height}) => {
    if (JSON.stringify(materialSnapshots()) !== originalMaterials) throw Error('Material mutated between cases');
    document.body.className = theme;
    document.querySelector('#label').textContent = `${theme} / ${angle} / -Z bow, +Y up` +
      (angle === 'belly' ? ' / BELOW-LIT DIAGNOSTIC, not game lighting' : ' / raw materials');
    const h = height-80, aspect = width/h;
    camera.near=radius*.01; camera.far=radius*8;
    camera.position.copy(center).add(new T.Vector3(...poses[angle][0]).normalize().multiplyScalar(radius*3));
    camera.up.set(...poses[angle][1]); camera.lookAt(center);
    camera.updateMatrixWorld(true);
    const viewBox = new T.Box3().setFromPoints(points.map(p=>p.clone().applyMatrix4(camera.matrixWorldInverse)));
    const size = viewBox.getSize(new T.Vector3()), mid = viewBox.getCenter(new T.Vector3());
    const halfY = Math.max(size.y,size.x/aspect)*.56, halfX = halfY*aspect;
    camera.left=mid.x-halfX; camera.right=mid.x+halfX;
    camera.top=mid.y+halfY; camera.bottom=mid.y-halfY;
    camera.updateProjectionMatrix();
    key.position.copy(center).add(new T.Vector3(-2,angle==='belly' ? -3 : 3,-2).multiplyScalar(radius));
    fill.position.copy(center).add(new T.Vector3(2,angle==='belly' ? -2 : 1,2).multiplyScalar(radius));
    key.target.position.copy(center); fill.target.position.copy(center);
    Object.assign(key.shadow.camera,{left:-radius*1.5,right:radius*1.5,top:radius*1.5,bottom:-radius*1.5,near:.1,far:radius*10});
    key.shadow.camera.updateProjectionMatrix();
    scene.background = new T.Color(theme==='dark' ? 0x303741 : 0xcbd0d1);
    renderer.setSize(width,h);
    const renderStarted = performance.now();
    renderer.render(scene,camera);
    renderer.getContext().finish(); // Complete GPU work before recording wall time, not a GPU timer query.
    const renderWallMs = performance.now()-renderStarted;
    if (JSON.stringify(materialSnapshots()) !== originalMaterials) throw Error('Render-time material override');
    const projected = points.map(p=>p.clone().project(camera));
    const clipping = projected.some(p=> !Number.isFinite(p.x+p.y+p.z) ||
      Math.abs(p.x)>=.98 || Math.abs(p.y)>=.98 || Math.abs(p.z)>=1);
    // Hash only foreground pixels as a second check beyond camera matrices and background.
    const gl = renderer.getContext(), pixels = new Uint8Array(width*h*4);
    gl.readPixels(0,0,width,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const bg = pixels.slice(0,3), foreground = [], colors = new Set();
    let borderPixels=0;
    for (let i=0;i<pixels.length;i+=4) {
      if (Math.max(...bg.map((c,j)=>Math.abs(c-pixels[i+j])))<=8) continue;
      foreground.push(pixels[i],pixels[i+1],pixels[i+2]);
      colors.add(`${pixels[i]>>3},${pixels[i+1]>>3},${pixels[i+2]>>3}`);
      const x=(i/4)%width, y=Math.floor(i/4/width);
      if (x<2 || x>=width-2 || y<2 || y>=h-2) borderPixels++;
    }
    const digest = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)))
      .map(n=>n.toString(16).padStart(2,'0')).join('');
    return {theme,angle,width,height,renderWallMs,camera:{type:camera.type,position:camera.position.toArray(),
      up:camera.up.toArray(),target:center.toArray(),projection:camera.projectionMatrix.toArray(),
      view:camera.matrixWorldInverse.toArray(),near:camera.near,far:camera.far},
      lighting:{environment:'procedural RoomEnvironment PMREM',environmentIntensity:scene.environmentIntensity,
        hemisphere:hemi.intensity,key:key.intensity,fill:fill.intensity,selfShadows:true,shadowMapSize:2048,
        keyPosition:key.position.toArray(),fillPosition:fill.position.toArray(),
        belowLitDiagnostic:angle==='belly',toneMapping:'ACESFilmic',exposure:renderer.toneMappingExposure},
      clipping,borderPixels,foregroundPixels:foreground.length/3,foregroundColors:colors.size,
      foregroundHash:await digest(new Uint8Array(foreground)),
      projectedGeometryHash:await digest(new TextEncoder().encode(JSON.stringify(projected.map(p=>
        [p.x,p.y].map(n=>Number(n.toFixed(5))))))),
      calls:renderer.info.render.calls,renderTriangles:renderer.info.render.triangles,
      overflow:document.documentElement.scrollWidth>innerWidth || document.documentElement.scrollHeight>innerHeight};
  };
  window.ready = true;
} catch (e) { window.bootError=String(e); console.error(e); }
</script></html>'''


def main():
    started = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('model', 'three-root', 'out'):
        parser.add_argument('--' + name, type=Path)
    parser.add_argument('--baseline-receipt', type=Path, help='Compare 16 case identities and camera/light setup')
    parser.add_argument('--require-pbr', action='store_true', help='Require normal, packed MR and sRGB color maps')
    parser.add_argument('--self-check', action='store_true', help='Test receipt parity without launching a browser')
    args = parser.parse_args()
    if args.self_check:
        self_check()
        return
    if not all((args.model, args.three_root, args.out)):
        parser.error('--model, --three-root and --out are required unless --self-check')
    from playwright.sync_api import sync_playwright
    baseline = json.loads(args.baseline_receipt.read_text()) if args.baseline_receipt else None
    if baseline is not None:
        assert receipt_parity(baseline, baseline)['status'] == 'PASS', 'Baseline needs the exact 16 ordered cases and camera/light data'
    model, three, out = args.model.resolve(), args.three_root.resolve(), args.out.resolve()
    repo = Path(__file__).resolve().parents[3]
    assert not three.is_relative_to(repo), 'Three must remain external to the repository'
    assert json.loads((three/'package.json').read_text())['version'] == '0.186.0'
    assert model.is_file(), 'Model missing; supply an existing GLB'
    assert model.stat().st_size <= 10*1024**2, 'Model exceeds fixture input budget'
    raw = model.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', raw)
    assert (magic, version, length) == (b'glTF', 2, len(raw)), 'Invalid GLB header'
    size, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    document = json.loads(raw[20:20+size])
    for item in document.get('buffers', []) + document.get('images', []):
        assert 'uri' not in item, 'Only self-contained GLB resources are allowed'
    budget = 30*1024**2
    ancestor = out
    while not ancestor.exists():
        ancestor = ancestor.parent
    assert shutil.disk_usage(ancestor).free >= 2*1024**3+budget, 'Need 2 GiB floor plus 30 MiB budget'
    assert not out.exists() or not any(out.iterdir()), 'Use a fresh empty evidence directory'
    out.mkdir(parents=True, exist_ok=True)
    receipt = {'model':args.model.name, 'modelSHA256':hashlib.sha256(raw).hexdigest(),
               'modelBytes':len(raw), 'materialDefinitions':len(document.get('materials', [])),
               'cases':[], 'errors':[], 'external':[], 'failedRequests':[],
               'requirePBR':args.require_pbr,
               'environment':{'python':platform.python_version(), 'system':platform.system(),
                              'machine':platform.machine(), 'chromiumBinary':'/usr/bin/chromium',
                              'launchArgs':['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']},
               'timingScope':'renderWallMs: browser render plus GL finish; caseWallMs: viewport/render/readback/hash/screenshot/save; totalDurationSeconds: worker including cleanup, excluding receipt write',
               'status':'FAIL', 'visualReview':'NOT PERFORMED: parent must inspect two angles plus belly'}
    used_bytes = 0

    def save(name, data):
        nonlocal used_bytes
        assert used_bytes+len(data)<=budget, 'Evidence exceeds 30 MiB'
        assert shutil.disk_usage(out).free-len(data)>=2*1024**3, 'Disk floor reached'
        (out/name).write_bytes(data)
        used_bytes += len(data)

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            route = unquote(urlsplit(self.path).path)
            if route == '/':
                data, content_type = HTML.encode(), 'text/html'
            elif route == '/__model__.glb':
                data, content_type = raw, 'model/gltf-binary'
            elif route.startswith('/__three__/'):
                target = (three/route.removeprefix('/__three__/')).resolve()
                if not target.is_relative_to(three) or not target.is_file() or target.suffix != '.js':
                    self.send_error(404)
                    return
                data, content_type = target.read_bytes(), 'text/javascript'
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

        def log_message(self, *unused):
            pass

    def deadline(signum, frame):
        raise TimeoutError('210-second render deadline reached')

    signal.signal(signal.SIGALRM, deadline)
    signal.alarm(210)
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    try:
        with sync_playwright() as p:
            chromium = '/usr/bin/chromium'
            assert Path(chromium).is_file(), 'Existing /usr/bin/chromium required; do not install'
            browser = p.chromium.launch(executable_path=chromium, headless=True, timeout=20000,
                args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
            try:
                page = browser.new_page(viewport={'width':1000,'height':800})
                page.set_default_timeout(20000)

                def guard(route):
                    if not route.request.url.startswith(origin+'/'):
                        receipt['external'].append(route.request.url)
                        route.abort()
                    else:
                        route.continue_()

                page.route('**/*', guard)
                page.on('pageerror', lambda e: receipt['errors'].append(str(e)))
                page.on('console', lambda m: receipt['errors'].append(m.text) if m.type=='error' else None)
                page.on('requestfailed', lambda r: receipt['failedRequests'].append(r.url))
                page.on('response', lambda r: receipt['failedRequests'].append(f'{r.status}: {r.url}') if r.status>=400 else None)
                page.goto(origin, wait_until='load')
                page.wait_for_function('window.ready || window.bootError', timeout=60000)
                assert page.evaluate('window.ready'), page.evaluate('window.bootError')
                asset = page.evaluate('window.asset')
                receipt['asset'] = asset
                receipt['renderSetup'] = page.evaluate('window.renderSetup')
                receipt['environment'].update(page.evaluate('window.runtimeEnvironment'), chromiumVersion=browser.version)
                map_counts = {slot:sum(m['maps'][slot] is not None for m in asset['materials'])
                              for slot in ('normalMap','roughnessMap','metalnessMap','map')}
                receipt['pbrVerification'] = {'mapMaterialCounts':map_counts,
                    'mapsReadyBeforeRender':asset['mapsReadyBeforeRender'],
                    'sourceFactorsMatch':all(m['sourceFactorsMatch'] for m in asset['materials']),
                    'materialOverrides':asset['materialOverrides'],
                    'baselineMapsCompared':False,
                    'note':'Original receipt has no maps; map/pixel parity is intentionally not required'}
                if args.require_pbr:
                    assert all(map_counts.values()), 'PBR requires normal, packed MR and base-color maps'
                    assert any(m['packedMR'] for m in asset['materials']), 'No packed MR texture'
                for theme, angle, width, height in CASES:
                    case_started = time.perf_counter()
                    page.set_viewport_size({'width':width,'height':height})
                    result = page.evaluate('c => window.renderCase(c)',
                        dict(theme=theme,angle=angle,width=width,height=height))
                    shot = page.screenshot(timeout=15000)
                    name = f'boat-reroll-{theme}-{angle}-{width}.png'
                    save(name, shot)
                    result.update(screenshot=name, screenshotSHA256=hashlib.sha256(shot).hexdigest(),
                                  caseWallMs=(time.perf_counter()-case_started)*1000)
                    receipt['cases'].append(result)
                    assert not result['clipping'] and not result['borderPixels'] and not result['overflow'], result
                    assert result['foregroundPixels']>width*(height-80)*.005 and result['foregroundColors']>20, 'Blank/flat render'
                    print(f'CAPTURE {name}: {result["foregroundPixels"]} foreground pixels', flush=True)
                assert not any(receipt[k] for k in ('errors','external','failedRequests')), 'Browser/network errors'
                for theme in ('light','dark'):
                    group = [r for r in receipt['cases'] if r['theme']==theme and r['width']==1000]
                    for key in ('foregroundHash','projectedGeometryHash','screenshotSHA256'):
                        assert len({r[key] for r in group})==7, f'Duplicate {key}'
                    assert len({tuple(r['camera']['position']) for r in group})==7, 'Duplicate camera pose'
                assert 12000<=asset['triangles']<=18000, f'Triangle budget: {asset["triangles"]}'
                definitions = receipt['materialDefinitions']
                used = {m['definition'] for m in asset['materials']}
                assert definitions>=40, f'Need >=40 material definitions, found {definitions}'
                assert asset['assignments']>=40, 'Need >=40 material assignments'
                assert used==set(range(definitions)), 'Every material definition must be drawn'
                assert all(m['type'] in ('MeshStandardMaterial','MeshPhysicalMaterial') for m in asset['materials'])
                if baseline is not None:
                    receipt['baselineParity'] = receipt_parity(receipt, baseline)
                    receipt['baselineParity']['baselineSHA256'] = hashlib.sha256(args.baseline_receipt.read_bytes()).hexdigest()
                    assert receipt['baselineParity']['status'] == 'PASS', receipt['baselineParity']
                receipt['status'] = 'STRUCTURAL AND CAPTURE CHECKS PASS; VISUAL REVIEW REQUIRED'
            finally:
                browser.close()
    except Exception as error:
        receipt['failure'] = str(error)
        raise
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        signal.alarm(0)
        receipt['evidenceBytesBeforeReceipt'] = used_bytes
        receipt['totalDurationSeconds'] = time.perf_counter()-started
        receipt['caseWallTotalMs'] = sum(r['caseWallMs'] for r in receipt['cases'])
        save('browser.json', json.dumps(receipt, indent=2).encode())
        print(receipt['status'], flush=True)
    print('16 captures. No visual, photorealism, native renderer or gameplay PASS claimed.')


if __name__ == '__main__':
    if sys.argv[-1:] == ['--internal-worker']:
        sys.argv.pop()
        main()
    else:
        # A separate process group bounds even a stalled browser close or driver call.
        worker = subprocess.Popen([sys.executable, '-B', __file__, *sys.argv[1:],
                                   '--internal-worker'], start_new_session=True)
        try:
            code = worker.wait(timeout=230)
        except (subprocess.TimeoutExpired, KeyboardInterrupt):
            os.killpg(worker.pid, signal.SIGTERM)
            try:
                worker.wait(timeout=3)
            except subprocess.TimeoutExpired:
                pass
            code = 124
            print('FAIL: hard process deadline/interruption; partial evidence only', flush=True)
        finally:
            try:
                os.killpg(worker.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            worker.wait(timeout=3)
        sys.exit(code)
