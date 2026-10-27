"""Raw ADAPTER POSE FIXTURES only. --self-check NEVER launches a server/browser.

Parent owns browser-slot release/preflight. Use existing Three 0.186.0:
python3 -B Games/Wings/authoring/check-fleet-rig-browser.py --self-check --three-root "$THREE_ROOT"
Later capture: omit --self-check; add --browser-slot-approved --out /dev/shm/<owned-output>.
No install, vendor copying, upstream runtime integration or natural-gameplay claim.
"""
import argparse
import ast
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import signal
import struct
import subprocess
import sys
import tempfile
import threading
from urllib.parse import unquote, urlsplit

HERE = Path(__file__).resolve().parent
GAME = HERE.parent
CASES = ('type45-bow', 'type054a-stern', 'submarine-quarter', 'submarine-rear')
BINARY = '/usr/bin/chromium'
DEADLINE_SECONDS = 120
THREE_FILES = ('build/three.module.js', 'build/three.core.js',
               'examples/jsm/loaders/GLTFLoader.js', 'examples/jsm/utils/BufferGeometryUtils.js',
               'examples/jsm/utils/SkeletonUtils.js')
SCOPE = 'ADAPTER POSE FIXTURES, not natural gameplay/served Factions/verified physics/integrated weapon muzzles'


def assets(three_root):
    root = three_root.resolve()
    metadata = json.loads((root / 'package.json').read_text())
    assert metadata['name'] == 'three' and metadata['version'] == '0.186.0'
    assert (root / 'LICENSE').read_text().strip() == (GAME / 'THREE-LICENSE.txt').read_text().strip()
    routes = {'/': HERE / 'fleet-rig-preview.html', '/fleet-rig.mjs': HERE / 'fleet-rig.mjs',
              '/model-repairs.json': HERE / 'model-repairs.json',
              '/submarine-model.json': HERE / 'submarine-model.json',
              '/THREE-LICENSE.txt': GAME / 'THREE-LICENSE.txt'}
    routes.update({'/three/' + name: root / name for name in THREE_FILES})
    descriptors = json.loads((HERE / 'model-repairs.json').read_text())['models']
    assert len(descriptors) == 2
    descriptors += [json.loads((HERE / 'submarine-model.json').read_text())]
    expected = {'models/derived/wings_type45_daring_class.glb',
                'models/derived/wings_type054a_jiangkai_ii.glb',
                'models/derived/generic-attack-submarine.glb'}
    assert {d['file'] for d in descriptors} == expected
    for d in descriptors:
        assert d['objective_only'] and d['player_vehicle_kind'] is None
        path = GAME / d['file']
        assert path.resolve().is_relative_to(GAME.resolve())
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == d['sha256']
        magic, version, length = struct.unpack_from('<III', data)
        assert magic == 0x46546c67 and version == 2 and length == len(data)
        size, kind = struct.unpack_from('<II', data, 12)
        assert kind == 0x4e4f534a
        doc = json.loads(data[20:20+size])
        assert all('uri' not in item for key in ('buffers', 'images') for item in doc.get(key, []))
        assert all(image.get('mimeType') in ('image/png', 'image/jpeg') for image in doc.get('images', []))
        routes['/' + d['file']] = path
    assert all(path.is_file() for path in routes.values())
    return routes


def route_path(raw, routes):
    parsed = urlsplit(raw)
    if parsed.query or parsed.fragment or parsed.netloc or parsed.scheme:
        return None
    decoded = unquote(parsed.path)
    if decoded != parsed.path or '..' in decoded.split('/') or '\\' in decoded:
        return None
    return routes.get(decoded)


def closure(routes):
    """Verify the actual approved package's static module closure, not a guessed loader list."""
    from posixpath import dirname, normpath
    sources = {url: routes[url].read_text() for url in ['/three/' + name for name in THREE_FILES]}
    # Parse, do not execute package code; comments/examples are not module dependencies.
    program = "import vm from 'node:vm';import fs from 'node:fs';const sources=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(Object.fromEntries(Object.entries(sources).map(([url,source])=>[url,new vm.SourceTextModule(source).dependencySpecifiers]))));"
    result = subprocess.run(['node', '--experimental-vm-modules', '--input-type=module', '-e', program],
                            input=json.dumps(sources), text=True, capture_output=True, timeout=15, check=True)
    for url, imports in json.loads(result.stdout).items():
        for item in imports:
            if item == 'three':
                target = '/three/build/three.module.js'
            elif item.startswith('.'):
                target = normpath(dirname(url) + '/' + item)
            else:
                raise AssertionError('Unexpected bare/external import: ' + item)
            assert target in routes, (url, target)


def projection_check(root, html):
    blocks = re.findall(r'(camera\.position\.copy\(center\).*?)(?=\s*const projected=)', html, re.S)
    assert len(blocks) == 1, 'One actual HTML camera setup block required'
    block = blocks[0]
    refresh = 'camera.updateMatrixWorld(true);'
    assert block.count(refresh) == 1
    broken = block.replace(refresh, '')
    # Execute the actual authored setup and its one-line-removal negative control, math only.
    program = """import assert from 'node:assert/strict';
const T = await import(process.argv[1]);
function setup(camera,center,direction,distance,sphere) {\n""" + block + """\n}
function withoutRefresh(camera,center,direction,distance,sphere) {\n""" + broken + """\n}
function check(setup, direction) {
  const camera=new T.PerspectiveCamera(34,1100/696,.1,2000);
  const center=new T.Vector3(280,17,-60), size=new T.Vector3(80,25,160);
  const box=new T.Box3().setFromCenterAndSize(center,size),sphere=box.getBoundingSphere(new T.Sphere());
  const distance=sphere.radius/Math.sin(T.MathUtils.degToRad(camera.fov/2))/Math.min(1,camera.aspect)*1.16;
  setup(camera,center,direction,distance,sphere);
  const aim=center.clone().project(camera);
  assert(Math.abs(aim.x)<1e-10 && Math.abs(aim.y)<1e-10,'Aim center must project to NDC origin');
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]) {
    const p=new T.Vector3(x,y,z).project(camera);
    assert(Math.abs(p.x)<1 && Math.abs(p.y)<1 && p.z>-1 && p.z<1,'Bounding corner must be in frustum');
  }
}
for(const xyz of [[1,.65,-1],[1,.65,1],[1,.65,-1],[.3,.3,1]]) {
  const direction=new T.Vector3(...xyz).normalize();check(setup,direction);
  assert.throws(()=>check(withoutRefresh,direction),/Aim center must project to NDC origin/);
}
console.log('PASS actual HTML camera block: four centered projections/all corners; removing world refresh fails guard');
"""
    result = subprocess.run(['node', '--input-type=module', '-e', program,
                             (root.resolve() / 'build/three.module.js').as_uri()],
                            text=True, capture_output=True, timeout=15, check=True)
    print(result.stdout.strip())


def cleanup_check(html):
    blocks = re.findall(r'(function disposeResource\(resource\).*?)(?=\nlet descriptorSet;)', html, re.S)
    catches = re.findall(r'\} catch\(error\) \{\n(.*?)\n\}\n</script>', html, re.S)
    assert len(blocks) == len(catches) == 1, 'Actual cleanup helpers and top-level catch required'
    assert 'dispose:cleanupFixture' in html and 'failFixture(error);' in catches[0]
    assert 'disposedResources = new WeakSet()' in html, 'Disposal dedup must not retain owned resources'
    assert html.index('loaded.push(gltf);') < html.index("getDependencies('texture')") < html.index('models.push(')
    assert 'textures.forEach(texture=>loadedTextures.add(texture));' in html
    program = """import assert from 'node:assert/strict';
function fixture({fail=false,partial=false,noRig=false}={}) {
  let finished=false, ctx;
  const disposedResources=new WeakSet(), counts=new Map(), scene={environment:{}}, window={}, SCOPE='CPU fixture';
  const statuses=[], status=text=>statuses.push(text);
  function resource(name,throws=false) {
    return {dispose(){counts.set(name,(counts.get(name)??0)+1);
      if(name==='geometry')ctx.dispose(); // Reentrant disposal must see the flag already set.
      if(throws)throw Error(name+' listener');}};
  }
  const texture=Object.assign(resource('texture'),{isTexture:true});
  const dependency=Object.assign(resource('dependency'),{isTexture:true});
  const geometry=resource('geometry',fail), otherGeometry=resource('otherGeometry');
  const material=Object.assign(resource('material',fail),{map:texture,roughnessMap:texture});
  const otherMaterial=Object.assign(resource('otherMaterial'),{map:texture});
  const object={traverse(visit){for(const node of [
    {isMesh:true,geometry,material:[material,material]},
    {isMesh:true,geometry:otherGeometry,material:otherMaterial}])visit(node);}};
  const loaded=[{scene:object},{scene:object}], models=partial?[]:[{object}];
  const loadedTextures=new Set([texture,dependency]);
  const environment=resource('environment'),pmrem=resource('pmrem'),renderer=resource('renderer',fail);
  const external=resource('external'); // Never in a fixture-owned scene/material/dependency list.
  let disposed=false;
  const rig=noRig?undefined:{root:{parent:{}},stats:()=>({disposed}),dispose(){
    counts.set('rig',(counts.get('rig')??0)+1);disposed=true;this.root.parent=null;
    if(fail)throw Error('rig listener');}};
""" + blocks[0] + """
  function runCatch(error) {
""" + catches[0] + """
  }
  ctx={dispose:cleanupFixture,fail:runCatch,prime(){disposeResource(pmrem);},counts,window,statuses,scene};
  return ctx;
}
const expected=['rig','geometry','otherGeometry','texture','dependency','material','otherMaterial','environment','pmrem','renderer'];
function once(ctx,names=expected) {
  for(const name of names)assert.equal(ctx.counts.get(name),1,name+' must be attempted once');
  assert.equal(ctx.counts.get('external'),undefined);
}
const broken=fixture({fail:true});broken.prime();
assert.throws(()=>broken.dispose(),error=>{
  assert(error instanceof AggregateError);assert.equal(error.errors.length,4);
  assert.deepEqual(error.errors.map(e=>e.message),['rig listener','geometry listener','material listener','renderer listener']);
  return true;
});
once(broken);assert.equal(broken.scene.environment,null);broken.dispose();once(broken);
const partial=fixture({partial:true,noRig:true});
assert.deepEqual(partial.dispose(),{disposed:true,detached:true});
once(partial,expected.filter(name=>name!=='rig'));partial.dispose();once(partial,expected.filter(name=>name!=='rig'));
const failedSetup=fixture({fail:true,partial:true}),original=Error('original PBR readiness failure');
failedSetup.fail(original);assert.equal(failedSetup.window.fleetFixture.ready,false);
assert.equal(failedSetup.window.fleetFixture.error,String(original));
assert.match(failedSetup.window.fleetFixture.cleanupError,/Fixture cleanup failed/);
assert.deepEqual(failedSetup.window.fleetFixture.cleanupErrors,['Error: rig listener','Error: geometry listener','Error: material listener','Error: renderer listener']);
assert.equal(failedSetup.statuses.at(-1),String(original));once(failedSetup);
failedSetup.dispose();once(failedSetup);
const normal=fixture();assert.deepEqual(normal.dispose(),{disposed:true,detached:true});normal.dispose();once(normal);
console.log('PASS actual HTML cleanup/catch: all resources attempted after rig/geometry/material/renderer throws; partial GLTF/dependencies, dedup/reentry/idempotence, original readiness diagnostic retained');
"""
    result = subprocess.run(['node', '--input-type=module', '-e', program], text=True,
                            capture_output=True, timeout=15, check=True)
    print(result.stdout.strip())


def self_check(root):
    routes = assets(root)
    closure(routes)
    for url, path in routes.items():
        assert route_path(url, routes) == path
    for bad in ('/../package.json', '/%2e%2e/package.json', '/three/package.json', '/fleet-sim.mjs',
                '/models/fa18.glb', '//external/x', '/?escape=1', '/three/build/../../package.json'):
        assert route_path(bad, routes) is None
    html = (HERE / 'fleet-rig-preview.html').read_text()
    modules = re.findall(r'<script type="module">(.*?)</script>', html, re.S)
    assert len(modules) == 1
    result = subprocess.run(['node', '--input-type=module', '--check'], input=modules[0], text=True,
                            capture_output=True, timeout=15, check=False)
    assert result.returncode == 0, result.stderr
    projection_check(root, html)
    cleanup_check(html)
    for token in ('GLTFLoader', 'createFleetRig', 'bindUnit', 'muzzleWorld', 'matrixWorld',
                  'expectedWorld', 'paused:true', 'dead:true', 'rig.reset()', 'rig.dispose()',
                  'ADAPTER POSE FIXTURES', 'metalnessMap', 'roughnessMap', 'getDependencies', 'cleanupFixture', 'disposeResource(resource)'):
        assert token in html, token
    assert html.count('new T.WebGLRenderer(') == 1 and html.count('<canvas ') == 1
    assert all(name in html for name in CASES)
    assert not re.search(r'(?:src|href)=[\'\"]https?://|https?://', html)
    source = Path(__file__).read_text()
    ast.parse(source)
    assert "executable_path=BINARY" in source and BINARY == '/usr/bin/chromium'
    assert 'server.shutdown()' in source and 'browser.close()' in source and 'server.server_close()' in source
    assert 'TemporaryDirectory' in source and 'start_new_session=True' in source and 'os.killpg' in source
    assert DEADLINE_SECONDS <= 120
    print(f'PASS self-check: {len(routes)} exact routes, actual Three static closure, three hashed embedded GLBs')
    print('PASS inline ESM node --check; Python AST; route rejection; one renderer/canvas; pose/material/lifecycle checks')
    print('PASS system Chromium/deadline/finally cleanup configuration; NO browser/server launched')


def capture_child(args, routes):
    # Imported ONLY in the explicitly requested capture child, never during --self-check.
    from playwright.sync_api import sync_playwright
    def terminate_owned_child(_signum, _frame):
        raise TimeoutError('Owned capture deadline; closing browser and server')
    signal.signal(signal.SIGTERM, terminate_owned_child)
    assert Path(BINARY).is_file(), 'System Chromium required; do not install'
    requests, failures, errors = [], [], []
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            path = route_path(self.path, routes)
            requests.append(self.path)
            if path is None:
                self.send_error(404)
                return
            data = path.read_bytes()
            mime = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
                    '.json': 'application/json', '.glb': 'model/gltf-binary', '.txt': 'text/plain'}[path.suffix]
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(data)
        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': .1}, daemon=True)
    thread.start()
    browser = None
    report = {'scope': SCOPE, 'cases': [], 'status': 'FAIL'}
    try:
        with sync_playwright() as playwright:
            try:
                browser = playwright.chromium.launch_persistent_context(args.profile,
                    executable_path=BINARY, headless=True, timeout=20000,
                    viewport={'width': 1100, 'height': 800}, device_scale_factor=1)
                page = browser.pages[0] if browser.pages else browser.new_page()
                page.set_default_timeout(20000)
                base = f'http://127.0.0.1:{server.server_port}'
                def guard(route):
                    url = route.request.url
                    if url.startswith(('data:', 'blob:')):
                        route.continue_()
                    elif url.startswith(base + '/') and route_path(url[len(base):], routes):
                        route.continue_()
                    else:
                        failures.append('Disallowed request')
                        route.abort()
                page.route('**/*', guard)
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('console', lambda message: errors.append(message.text) if message.type == 'error' else None)
                page.on('requestfailed', lambda request: failures.append(urlsplit(request.url).path))
                page.goto(base + '/', wait_until='domcontentloaded', timeout=20000)
                page.wait_for_function('window.fleetFixture !== undefined', timeout=45000)
                ready = page.evaluate('({ready:fleetFixture.ready,error:fleetFixture.error})')
                assert ready['ready'], ready.get('error')
                report['proofs'] = page.evaluate('fleetFixture.proofs')
                report['materials'] = page.evaluate('fleetFixture.materials')
                for name in CASES:
                    report['cases'].append(page.evaluate('(name)=>fleetFixture.renderCase(name)', name))
                    page.screenshot(path=str(args.out / (name + '.png')), timeout=15000)
                report['disposal'] = page.evaluate('fleetFixture.dispose()')
                assert report['disposal']['disposed'] and report['disposal']['detached']
                assert not errors and not failures, (errors, failures)
                report['status'] = 'PASS_RAW_FIXTURE_ONLY'
            finally:
                if browser is not None:
                    browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        report['errors'] = errors
        report['failedRequests'] = failures
        report['requests'] = requests
        (args.out / 'receipt.json').write_text(json.dumps(report, indent=2) + '\n')
    print('PASS four raw pose captures and native matrix/PBR/lifecycle assertions; NOT gameplay/integrated muzzle acceptance')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--three-root', type=Path, required=True)
    parser.add_argument('--self-check', action='store_true')
    parser.add_argument('--out', type=Path)
    parser.add_argument('--browser-slot-approved', action='store_true',
                        help='Parent confirms Citisten/Foldwild/Jank RELEASE and fresh preflight')
    parser.add_argument('--capture-child', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--profile', help=argparse.SUPPRESS)
    args = parser.parse_args()
    if args.self_check:
        self_check(args.three_root)
        return
    assert args.out and args.out.resolve().is_relative_to(Path('/dev/shm')), 'Capture output must be assigned shared memory'
    if args.capture_child:
        assert args.profile, 'Owned temporary profile required'
        capture_child(args, assets(args.three_root))
        return
    assert args.browser_slot_approved, 'Parent must confirm all three sibling releases and fresh preflight'
    self_check(args.three_root)
    # Parent must obtain ALL sibling release receipts and a fresh disk/browser preflight before this branch.
    available = os.statvfs(HERE)
    assert available.f_bavail * available.f_frsize >= 2 * 1024**3, '2 GiB root floor'
    assert not args.out.exists(), 'Use a new owned output directory'
    args.out.mkdir(parents=True)
    with tempfile.TemporaryDirectory(prefix='fleet-rig-profile-', dir='/dev/shm') as profile:
        command = [sys.executable, '-B', str(Path(__file__).resolve()), '--capture-child',
                   '--three-root', str(args.three_root.resolve()), '--out', str(args.out.resolve()), '--profile', profile]
        process = subprocess.Popen(command, start_new_session=True)
        try:
            code = process.wait(timeout=DEADLINE_SECONDS)
            assert code == 0, f'Capture child exit {code}; inspect owned receipt'
        finally:
            # Only this runner's newly created process group; never a sibling browser/session.
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGTERM)
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait(timeout=3)


if __name__ == '__main__':
    main()
