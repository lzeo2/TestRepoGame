"""Bounded material/model API specimen captures, not gameplay or FPS acceptance."""
import functools
import http.server
import importlib.util
import json
import os
from pathlib import Path
import signal
import tempfile
import threading
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA'
spec = importlib.util.spec_from_file_location('world_qa', Path(__file__).with_name('world-qa.py'))
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
HTML = '''<!doctype html><meta charset="utf-8"><title>CITISTEN material specimen</title>
<link rel="icon" href="data:,"><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}
pre{position:fixed;bottom:8px;left:8px;background:#fff;color:#111;padding:8px;font:13px monospace;margin:0;pointer-events:none}</style>
<canvas id="world"></canvas><pre id="label">Material/model API fixture, not integrated gameplay</pre>
<script type="module">
import {createWorld,populateWorld} from './world.mjs';
const world=createWorld(document.querySelector('canvas'),{pixelRatio:1}); populateWorld(world);
window.fixture={world,pose(p,phase=.5){world.dayNight.setPhase(phase);world.controls.setPose(p,true);world.render(.016);},
clear(){for(const pool of world.buildings.pools.values())for(const h of [...pool.handles])world.buildings.remove(h);},
stats(){return {draws:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles,
 high:Object.fromEntries([...world.buildings.pools].filter(([,p])=>p.detail?.count).map(([k,p])=>[k,{instances:p.detail.count,triangles:p.detail.geometry.index.count/3}])),
 emission:world.buildings.material.emissiveIntensity,sunShadow:world.dayNight.lights.sun.castShadow,moonShadow:world.dayNight.lights.moon.castShadow,
 finiteProbe:world.dayNight.lights.probe.sh.coefficients.every(v=>v.toArray().every(Number.isFinite)),
 shadowBias:world.dayNight.lights.sun.shadow.bias,normalBias:world.dayNight.lights.sun.shadow.normalBias,
 facadePixels:world.buildings.material.map.image.width,waterOffset:world.water.mesh.material.normalMap.offset.toArray(),
 aoMinimum:Math.min(...world.blockAO.map.image.data.filter((_,i)=>i%4===0))};}};
fixture.pose({x:0,y:400,z:0,yaw:0,pitch:-1.55});
</script>'''


def main():
    before = shared.guard()
    if shared.browser_pids():
        raise RuntimeError('Shared Chromium busy; no browser launched')
    report = {'scope': 'PBR/procedural mesh API specimens; not gameplay, photorealism certification or FPS acceptance',
              'errors': [], 'external': [], 'failed': [], 'shots': {}}
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '0'))),
                functools.partial(Handler, directory=ROOT))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    def expired(*_):
        raise TimeoutError('Material QA exceeded 180 seconds')
    signal.signal(signal.SIGALRM, expired); signal.alarm(180)
    try:
        with sync_playwright() as pw, tempfile.TemporaryDirectory(prefix='.material-qa-', dir=ROOT / 'Games/Citisten3D') as profile:
            context = pw.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
                viewport={'width':1280,'height':720}, device_scale_factor=1)
            try:
                owned = shared.browser_pids()
                assert len(owned) == 1, 'Launch contention'
                page = context.pages[0]
                page.on('pageerror', lambda e: report['errors'].append(str(e)))
                page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                page.on('requestfailed', lambda r: report['failed'].append(r.url.replace(base, 'LOOPBACK')))
                page.on('request', lambda r: report['external'].append(r.url) if not r.url.startswith((base, 'data:')) else None)
                page.route('**/material-qa.html', lambda route: route.fulfill(content_type='text/html', body=HTML))
                page.goto(base + '/Games/Citisten3D/material-qa.html', wait_until='networkidle')
                page.wait_for_function('window.fixture?.world.renderer.info.render.calls > 0')
                report['renderer'] = page.evaluate('''() => {const gl=fixture.world.renderer.getContext(),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);}''')
                def shot(name, text, pose, phase=.5):
                    assert shared.browser_pids() == owned, 'Browser contention'
                    page.evaluate('([p,phase,text])=>{fixture.pose(p,phase);document.querySelector("#label").textContent=text;}', [pose,phase,text])
                    shared.guard()
                    page.screenshot(path=str(OUT / name))
                    report['shots'][name] = page.evaluate('fixture.stats()')
                    assert report['shots'][name]['finiteProbe'], 'Nonfinite sky lighting'
                    with Image.open(OUT / name) as image:
                        region = image.crop((0, 0, 1280, 650))
                        if name == 'A-world-overhead.png':
                            assert max(ImageStat.Stat(region).mean) > 20, 'Black material render'
                        if name == 'WORLD-night.png':
                            warm = sum(r > 80 and r > g * 1.1 and g > b * 1.15 for r, g, b in region.convert('RGB').get_flattened_data())
                            assert warm > 50, 'Night windows not visibly lit'
                            report['shots'][name]['warmWindowPixels'] = warm
                    assert shared.browser_pids() == owned, 'Browser contention'
                street = {'x':-45,'y':2,'z':5,'yaw':-1.57079632679,'pitch':.03}
                shot('A-world-overhead.png', 'WORLD MATERIAL FIXTURE | 400m | real shadows + block/contact AO | distance LOD',
                     {'x':0,'y':400,'z':0,'yaw':0,'pitch':-1.55})
                shot('A-world-street.png', 'WORLD MATERIAL FIXTURE | 2m | original detailed meshes + 512px facade tiles | not gameplay', street)
                shot('WORLD-night.png', 'WORLD NIGHT MATERIAL FIXTURE | window emission + moon shadows | not gameplay', street, 0)
                shot('WORLD-water-detail.png', 'WORLD WATER FIXTURE | animated normals + directional specular | shoreline outside buildable lots',
                     {'x':-998,'y':8,'z':0,'yaw':1.57079632679,'pitch':-1.1})
                before_offset = page.evaluate('fixture.world.water.mesh.material.normalMap.offset.toArray()')
                page.evaluate('fixture.world.render(.5)')
                after_offset = page.evaluate('fixture.world.water.mesh.material.normalMap.offset.toArray()')
                assert before_offset != after_offset, 'Water animation did not advance'
                shared.guard()
                page.screenshot(path=str(OUT / 'WORLD-water-motion.png'))
                with Image.open(OUT / 'WORLD-water-detail.png') as a, Image.open(OUT / 'WORLD-water-motion.png') as b:
                    difference = ImageChops.difference(a, b).convert('L')
                    changed = sum(difference.histogram()[1:])
                assert changed > 100, 'Water shading did not visibly change'
                report['waterAnimation'] = {'before': before_offset, 'after': after_offset, 'changedPixels': changed}
                page.evaluate('''() => {fixture.clear();fixture.world.buildings.types.forEach((type,i)=>fixture.world.buildings.spawn(type,{x:(i%7-3)*22,z:Math.floor(i/7)*25,rotation:Math.PI}));}''')
                shot('WORLD-material-kit.png', 'MODEL API FIXTURE | 14 original procedural types | high-detail assets, not sculpted art',
                     {'x':0,'y':40,'z':86,'yaw':0,'pitch':-.55})
                page.evaluate('''() => {fixture.clear();['citizen','zombie','car'].forEach((type,i)=>fixture.world.buildings.spawn(type,{x:(i-1)*2.5,z:0,rotation:Math.PI}));}''')
                shot('WORLD-material-agents.png', 'MODEL API FIXTURE | citizen 28,680 / zombie 29,604 / car 9,936 triangles | static, not rigged',
                     {'x':0,'y':2.2,'z':8,'yaw':0,'pitch':-.13})
                assert not report['errors'] and not report['external'] and not report['failed'], report
                for data in report['shots'].values():
                    assert data['facadePixels'] >= 1024 and data['normalBias'] > 0 and data['shadowBias'] < 0
                assert report['shots']['WORLD-night.png']['moonShadow']
                assert report['shots']['WORLD-night.png']['emission'] > report['shots']['A-world-street.png']['emission']
                assert report['shots']['A-world-overhead.png']['aoMinimum'] < 255
                page.evaluate('fixture.world.dispose()')
            finally:
                context.close()
    finally:
        signal.alarm(0); server.shutdown(); server.server_close()
        report['serverClosed'] = True
        report['profileRemoved'] = 'profile' in locals() and not Path(profile).exists()
        report['browserClosed'] = 'owned' in locals() and not bool(owned & shared.browser_pids())
        report['diskBefore'] = before; report['diskAfter'] = shared.guard()
        (OUT / 'WORLD-material-results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))
    assert report['browserClosed'] and report['profileRemoved'] and report['serverClosed']
    print('MATERIAL QA PASS: seven captures, animated water, shadow/emission/AO checks; no errors/external requests; owned resources closed')


if __name__ == '__main__':
    main()
