#!/usr/bin/env python3
"""Portrait integrity regression (stdlib). Optional CPU preview and browser checks.

python3 -B scripts/test_jankolock_portrait.py [--preview] [--browser]
Preview/test artifacts live only in RAM, not in the game asset directory.
"""
import argparse
import copy
import hashlib
import json
import math
import pathlib
import struct

ROOT = pathlib.Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Jankolock'
HASH = 'abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9'
SIZE = 10972672
TRIANGLES = 421968
FORMATS = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}
WIDTHS = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def integer(value, low=0):
    require(type(value) is int and value >= low, 'invalid integer')
    return value


def check_resources(value):
    if isinstance(value, dict):
        require('uri' not in value, 'external/embedded URI forbidden')
        for item in value.values():
            check_resources(item)
    elif isinstance(value, list):
        for item in value:
            check_resources(item)
    elif isinstance(value, float):
        require(math.isfinite(value), 'nonfinite JSON number')


def unpack_glb(data):
    require(len(data) >= 20, 'short GLB')
    magic, version, length = struct.unpack_from('<4sII', data)
    require(magic == b'glTF' and version == 2 and length == len(data), 'bad GLB header')
    chunks, offset = [], 12
    while offset < len(data):
        require(offset + 8 <= len(data), 'short chunk header')
        size, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        require(size % 4 == 0 and offset + size <= len(data), 'bad chunk bounds')
        chunks.append((kind, data[offset:offset + size]))
        offset += size
    require([c[0] for c in chunks] == [0x4E4F534A, 0x004E4942], 'expected JSON and BIN chunks')
    return json.loads(chunks[0][1]), chunks[1][1]


def inspect(document, binary):
    """Strict, uncompressed static GLB subset used by this exact portrait."""
    check_resources(document)
    require(document['asset']['version'] == '2.0', 'wrong glTF version')
    require(not document.get('extensionsRequired'), 'unsupported required extension')
    buffers = document['buffers']
    require(len(buffers) == 1, 'expected one embedded buffer')
    size = integer(buffers[0]['byteLength'], 1)
    require(size <= len(binary) <= size + 3, 'buffer length mismatch')
    views = document['bufferViews']
    for view in views:
        require(view['buffer'] == 0, 'bad buffer reference')
        start, length = integer(view.get('byteOffset', 0)), integer(view['byteLength'], 1)
        require(start + length <= size, 'bufferView out of bounds')
        if 'byteStride' in view:
            stride = integer(view['byteStride'], 4)
            require(stride <= 252 and stride % 4 == 0, 'invalid byteStride')
    decoded, summaries = [], []
    for accessor in document['accessors']:
        require('sparse' not in accessor, 'sparse accessor unsupported for portrait')
        kind, shape = accessor['componentType'], accessor['type']
        require(kind in FORMATS and shape in WIDTHS, 'unsupported accessor layout')
        view_id = integer(accessor['bufferView'])
        require(view_id < len(views), 'bad accessor view')
        view = views[view_id]
        width, code = WIDTHS[shape], FORMATS[kind]
        unit = struct.calcsize(code)
        count = integer(accessor['count'], 1)
        start = integer(accessor.get('byteOffset', 0))
        stride = view.get('byteStride', width * unit)
        require(stride >= width * unit and stride % unit == 0, 'bad accessor stride')
        require(start % unit == 0 and (view.get('byteOffset', 0) + start) % unit == 0,
                'misaligned accessor')
        require(start + (count - 1) * stride + width * unit <= view['byteLength'],
                'accessor out of bounds')
        base = view.get('byteOffset', 0) + start
        fmt = struct.Struct('<' + code * width)
        values = [fmt.unpack_from(binary, base + i * stride) for i in range(count)]
        require(all(math.isfinite(v) for row in values for v in row), 'nonfinite accessor')
        low = [min(row[i] for row in values) for i in range(width)]
        high = [max(row[i] for row in values) for i in range(width)]
        for field, actual in [('min', low), ('max', high)]:
            if field in accessor:
                require(len(accessor[field]) == width and all(
                    math.isclose(a, b, rel_tol=1e-6, abs_tol=1e-8)
                    for a, b in zip(actual, accessor[field])), 'accessor metadata bounds mismatch')
        decoded.append(values)
        summaries.append({'count': count, 'type': shape, 'componentType': kind,
                          'actualMin': low, 'actualMax': high})
    triangles, vertices = 0, 0
    for mesh in document['meshes']:
        for primitive in mesh['primitives']:
            require(primitive.get('mode', 4) == 4, 'portrait must use triangles')
            attrs = primitive['attributes']
            require('POSITION' in attrs, 'missing positions')
            for ref in attrs.values():
                require(type(ref) is int and 0 <= ref < len(decoded), 'bad attribute reference')
            positions = document['accessors'][attrs['POSITION']]
            require(positions['type'] == 'VEC3' and positions['componentType'] == 5126,
                    'invalid positions')
            count = positions['count']
            require(all(document['accessors'][ref]['count'] == count for ref in attrs.values()),
                    'attribute count mismatch')
            vertices += count
            ref = integer(primitive['indices'])
            require(ref < len(decoded), 'bad index reference')
            accessor = document['accessors'][ref]
            require(accessor['type'] == 'SCALAR' and accessor['componentType'] in (5121, 5123, 5125),
                    'invalid index type')
            indices = decoded[ref]
            require(len(indices) % 3 == 0 and all(0 <= row[0] < count for row in indices),
                    'index out of range or partial triangle')
            require(0 <= primitive['material'] < len(document.get('materials', [])), 'bad material')
            triangles += len(indices) // 3
    nodes = document['nodes']
    for node in nodes:
        if 'mesh' in node:
            require(0 <= node['mesh'] < len(document['meshes']), 'bad node mesh')
        for field, length in [('matrix', 16), ('translation', 3), ('rotation', 4), ('scale', 3)]:
            if field in node:
                require(len(node[field]) == length, 'bad node transform')
    visiting, visited = set(), set()

    def visit(ref):
        require(type(ref) is int and 0 <= ref < len(nodes), 'bad node reference')
        require(ref not in visiting, 'node cycle')
        if ref in visited:
            return
        visiting.add(ref)
        for child in nodes[ref].get('children', []):
            visit(child)
        visiting.remove(ref)
        visited.add(ref)

    for ref in range(len(nodes)):
        visit(ref)
    for scene in document['scenes']:
        for ref in scene.get('nodes', []):
            require(type(ref) is int and 0 <= ref < len(nodes), 'bad scene node')
    require(0 <= document.get('scene', 0) < len(document['scenes']), 'bad default scene')
    for image in document.get('images', []):
        require(0 <= image['bufferView'] < len(views), 'bad image resource')
    require(not document.get('skins') and not document.get('animations'), 'unexpected dynamic resources')
    return {'triangles': triangles, 'vertices': vertices, 'meshes': len(document['meshes']),
            'materials': len(document.get('materials', [])), 'images': len(document.get('images', [])),
            'skins': 0, 'animations': 0, 'buffers': len(buffers), 'bufferViews': len(views),
            'accessors': summaries, 'externalURIs': 0, 'integrity': 'PASS'}


def reject_regressions(document, binary):
    # Tiny malformed copies exercise failures without duplicating the full binary.
    cases = []
    bad = copy.deepcopy(document); bad['buffers'][0]['uri'] = 'remote.glb'; cases.append((bad, binary))
    bad = copy.deepcopy(document); bad['bufferViews'][0]['byteLength'] += len(binary); cases.append((bad, binary))
    bad = copy.deepcopy(document); bad['accessors'][0]['count'] += 99; cases.append((bad, binary))
    bad = copy.deepcopy(document); bad['accessors'][1]['max'][0] += 1; cases.append((bad, binary))
    broken = bytearray(binary)
    struct.pack_into('<I', broken, document['bufferViews'][0].get('byteOffset', 0), 0xffffffff)
    cases.append((document, broken))
    broken = bytearray(binary)
    struct.pack_into('<f', broken, document['bufferViews'][1]['byteOffset'], float('nan'))
    cases.append((document, broken))
    for bad, data in cases:
        try:
            inspect(bad, data)
        except ValueError:
            continue
        raise AssertionError('malformed GLB accepted')
    print('integrity rejection regressions: 6 PASS')


def preview(document, binary):
    """Exact-file CPU triangle painter, not WebGL or hardware acceptance."""
    import numpy as np
    from PIL import Image, ImageDraw
    # Integrity above establishes this portrait's contiguous accessor layouts.
    def array(ref):
        a = document['accessors'][ref]
        view = document['bufferViews'][a['bufferView']]
        dtype = {5121: '<u1', 5125: '<u4', 5126: '<f4'}[a['componentType']]
        return np.frombuffer(binary, dtype=dtype, count=a['count'] * WIDTHS[a['type']],
                             offset=view.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, WIDTHS[a['type']])
    primitive = document['meshes'][0]['primitives'][0]
    v = array(primitive['attributes']['POSITION']).astype(float)
    f = array(primitive['indices']).reshape(-1, 3)
    colors = array(primitive['attributes']['COLOR_0'])[:, :3].astype(float)
    normals = array(primitive['attributes']['NORMAL'])
    light = np.array([-0.35, 0.55, 1.0]); light /= np.linalg.norm(light)
    shaded = colors * (0.55 + 0.45 * np.maximum(0, normals @ light))[:, None]
    center = (v.min(axis=0) + v.max(axis=0)) / 2
    scale = 650 / np.ptp(v, axis=0)[1]
    projected = np.column_stack((400 + (v[:, 0] - center[0]) * scale,
                                 390 - (v[:, 1] - center[1]) * scale))
    tri_colors = np.clip(shaded[f].mean(axis=1), 0, 255).astype('uint8')
    order = np.argsort(v[f, 2].mean(axis=1), kind='stable')
    image = Image.new('RGB', (800, 800), '#eee8dc')
    draw = ImageDraw.Draw(image)
    for i in order:
        draw.polygon([tuple(p) for p in projected[f[i]]], fill=tuple(tri_colors[i]))
    out = pathlib.Path('/dev/shm/jankolock/portrait')
    out.mkdir(parents=True, exist_ok=True)
    path = out / 'exact-file-cpu-front.png'
    image.save(path)
    print('CPU preview:', path, '(all 421968 triangles, front orthographic painter; not browser/hardware)')


def browser_check():
    import functools
    import http.server
    import os
    import tempfile
    import threading
    from playwright.sync_api import sync_playwright

    os.environ['TMPDIR'] = '/dev/shm'
    tempfile.tempdir = '/dev/shm'
    pathlib.Path('/dev/shm/jankolock/portrait').mkdir(parents=True, exist_ok=True)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 8915),
        functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    html = '''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body><main id="host"></main><script type="module">
      import {mountPortrait} from './portrait.js';
      window.mountPortrait=mountPortrait; window.closedCount=0;
      host.addEventListener('portraitclose',()=>window.closedCount++);
      window.begin=()=>{window.abort=new AbortController();window.pending=mountPortrait(host,
        {signal:abort.signal,reducedMotion:true}).then(handle=>{window.handle=handle;return handle.status});};
      window.loaded=true;
      </script></body></html>'''
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
                timeout=30000)
            context = browser.new_context(viewport={'width': 900, 'height': 780}, has_touch=True)
            requests, errors = [], []
            context.on('request', lambda req: requests.append(req.url.split('8915')[-1]))
            context.on('page', lambda page: page.on('pageerror', lambda error: errors.append(str(error))))
            context.route('**/__portrait_test__.html', lambda route: route.fulfill(content_type='text/html', body=html))
            origin = 'http://127.0.0.1:8915/Games/Jankolock/'
            page = context.new_page()
            page.goto(origin + '__portrait_test__.html')
            page.wait_for_function('window.loaded')
            require(not any('/vendor/' in url or '.glb' in url for url in requests), 'eager portrait resources')
            print('browser module import: no vendor/GLB requests PASS')
            context.route('**/portrait-config.json', lambda route: route.fulfill(
                json={'enabled': False, 'integrity': 'ABSENT'}))
            require(page.evaluate('async()=>{begin();return await pending}') == 'unavailable', 'disabled manifest failed')
            require(not any('/vendor/' in url or '.glb' in url for url in requests), 'disabled portrait requested resources')
            page.get_by_role('button', name='Back', exact=True).click()
            require(page.evaluate('closedCount===1 && host.children.length===0'), 'native Back failed')
            context.unroute('**/portrait-config.json')
            require(page.evaluate('async()=>{begin();abort.abort();return await pending}') == 'disposed', 'abort failed')
            require(page.evaluate('host.children.length===0'), 'abort left DOM')
            print('browser disabled manifest / Back / immediate cancellation: PASS')
            # Force only WebGL unavailable. Native Canvas2D must still function.
            page.evaluate('''()=>{window.originalContext=HTMLCanvasElement.prototype.getContext;
              HTMLCanvasElement.prototype.getContext=function(type,...args){
              return type.startsWith('webgl') ? null : originalContext.call(this,type,...args);};}''')
            require(page.evaluate('async()=>{begin();return await pending}') == 'unavailable', 'WebGL fallback failed')
            require(page.evaluate("Boolean(document.createElement('canvas').getContext('2d'))"), 'Canvas2D blocked')
            require(not any('.glb' in url for url in requests), 'fallback fetched dense asset')
            page.get_by_role('button', name='Back', exact=True).click()
            page.evaluate('()=>{HTMLCanvasElement.prototype.getContext=originalContext;}')
            print('browser forced WebGL unavailable / Canvas2D intact: PASS')
            counts = page.evaluate('''async()=>{
              const {GLTFLoader}=await import('./vendor/GLTFLoader.js');
              const buffer=await (await fetch('./assets/portrait_relief.glb')).arrayBuffer();
              const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),
                x=>x.toString(16).padStart(2,'0')).join('');
              const gltf=await new GLTFLoader().parseAsync(buffer,location.href);
              let vertices=0,triangles=0;gltf.scene.traverse(o=>{if(o.isMesh){
                vertices+=o.geometry.attributes.position.count;triangles+=o.geometry.index.count/3;
                o.geometry.dispose();o.material.dispose();}});
              return {hash,bytes:buffer.byteLength,vertices,triangles};}''')
            require(counts == {'hash': HASH, 'bytes': SIZE, 'vertices': 210986, 'triangles': TRIANGLES}, 'GLTF browser load mismatch')
            print('browser exact-byte GLTFLoader parse: PASS', json.dumps(counts, separators=(',', ':')))
            # Check late GLTF parse cleanup by delaying only the loader promise.
            page.evaluate('''async()=>{const {GLTFLoader}=await import('./vendor/GLTFLoader.js');
              window.Loader=GLTFLoader;window.originalParse=GLTFLoader.prototype.parseAsync;
              GLTFLoader.prototype.parseAsync=async function(...args){
                const gltf=await originalParse.apply(this,args);window.lateParsed=true;
                gltf.scene.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>window.lateDisposed=true);});
                await new Promise(r=>window.releaseLate=r);return gltf;};}''')
            page.evaluate('begin()')
            page.wait_for_function('window.lateParsed || window.handle?.status==="unavailable"', timeout=45000)
            if page.evaluate('Boolean(window.lateParsed)'):
                page.get_by_role('button', name='Back', exact=True).click()
                page.evaluate('releaseLate()')
                require(page.evaluate('async()=>await pending') == 'disposed', 'late GLTF mount survived Back')
                require(page.evaluate('lateDisposed && host.children.length===0'), 'late GLTF resources leaked')
                print('browser Back during delayed GLTF parse: resources disposed PASS')
            else:
                print('browser native WebGL creation unavailable; late-load render check UNPROVEN')
                page.evaluate('handle.dispose()')
            page.evaluate('()=>{Loader.prototype.parseAsync=originalParse;}')
            page.evaluate('window.handle=null;begin()')
            page.wait_for_function('window.handle && handle.status!=="loading"', timeout=45000)
            status = page.evaluate('handle.status')
            if status == 'ready':
                page.keyboard.down('w')
                try:
                    page.wait_for_function("document.querySelector('[role=status]').textContent.includes('Bonk')", timeout=15000)
                finally:
                    page.keyboard.up('w')
                require('Bonk' in page.get_by_role('status').inner_text(), 'pawn did not bump cylinder')
                page.screenshot(path='/dev/shm/jankolock/portrait/browser-swiftshader-lobby.png', timeout=10000)
                print('browser software screenshot: /dev/shm/jankolock/portrait/browser-swiftshader-lobby.png')
                page.evaluate('handle.setReducedMotion(false)')
                left = page.get_by_role('button', name='Left', exact=True).bounding_box()
                touch = context.new_cdp_session(page)
                touch.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [
                    {'x': left['x'] + left['width'] / 2, 'y': left['y'] + left['height'] / 2}]})
                page.wait_for_timeout(100)
                touch.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
                touch.detach()
                page.evaluate('handle.setReducedMotion(true)')
                page.evaluate('''()=>{document.querySelector('#host canvas').dispatchEvent(
                    new Event('webglcontextlost',{cancelable:true}));}''')
                require(page.evaluate('handle.status') == 'unavailable', 'context loss not handled')
                page.get_by_role('button', name='Back', exact=True).click()
                print('browser SwiftShader lobby / WASD pedestal bump / touch cancel / context loss / Back: PASS')
                print('browser raster source: Pi SwiftShader only; supported hardware acceptance UNVERIFIED')
            else:
                require(status == 'unavailable', 'unexpected lobby status')
                page.get_by_role('button', name='Back', exact=True).click()
                print('browser native WebGL unavailable; rendered lobby / bump UNPROVEN, Back PASS')
            # Integrity failure and abort while the dense asset is in flight.
            context.route('**/portrait_relief.glb', lambda route: route.fulfill(body=b'invalid'))
            require(page.evaluate('async()=>{begin();return await pending}') == 'unavailable', 'bad bytes enabled portrait')
            page.get_by_role('button', name='Back', exact=True).click()
            context.unroute('**/portrait_relief.glb')
            require(not errors, 'browser page errors: ' + repr(errors))
            print('browser invalid asset / no page errors: PASS')
            # Integration contract: ordinary Canvas match start never imports the hall.
            requests.clear()
            page.goto(origin + 'index.html')
            page.wait_for_function('typeof window.jankolockSnapshot === "function"')
            page.locator('[data-hero]').first.click()
            page.locator('#startBtn').click()
            page.wait_for_function('jankolockSnapshot().phase === "playing"')
            page.wait_for_timeout(400)
            require(not any('/vendor/' in url or 'portrait' in url or '.glb' in url for url in requests),
                    'combat requested portrait resources')
            require(not errors, 'integration page errors: ' + repr(errors))
            print('browser actual UI native hero / Start / Canvas combat: zero portrait/vendor requests PASS')
            context.close(); browser.close()
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--browser', action='store_true')
    parser.add_argument('--write-receipt', action='store_true')
    args = parser.parse_args()
    data = (GAME / 'assets/portrait_relief.glb').read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    require(len(data) == SIZE and digest == HASH, 'exact asset mismatch')
    document, binary = unpack_glb(data)
    stats = inspect(document, binary)
    require(stats['triangles'] == TRIANGLES, 'actual triangle count mismatch')
    receipt = {'asset': 'assets/portrait_relief.glb', 'sha256': digest, 'bytes': len(data),
               **stats, 'supplierPhotorealism': 'FAIL', 'supportedHardware': 'UNVERIFIED'}
    if args.write_receipt:
        (GAME / 'assets/portrait-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    else:
        require(json.loads((GAME / 'assets/portrait-receipt.json').read_text()) == receipt,
                'receipt does not match inspected file')
    config = json.loads((GAME / 'portrait-config.json').read_text())
    require(config['enabled'] is True and config['integrity'] == 'PASS' and
            config['url'] == receipt['asset'] and config['sha256'] == digest and config['bytes'] == SIZE,
            'manifest not integrity-gated')
    reject_regressions(document, binary)
    print(json.dumps(receipt, separators=(',', ':')))
    if args.preview:
        preview(document, binary)
    if args.browser:
        browser_check()


if __name__ == '__main__':
    main()
