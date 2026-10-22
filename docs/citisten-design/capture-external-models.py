"""Bounded before/after API model and placement photos. No gameplay/FPS claim."""
import argparse
import functools
import hashlib
import http.server
import importlib.util
import json
from pathlib import Path
import signal
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('world_qa', ROOT / 'Games/Citisten3D/world-qa.py')
shared = importlib.util.module_from_spec(spec); spec.loader.exec_module(shared)
# Delivery name, runtime key, largest framing dimension. Before-only proxies are labelled.
MODELS = [
 ('town_hall','townhall',18), ('residential_row','residential',8), ('commercial','commercial',12),
 ('industrial_shed','industrial',10), ('power_plant','power',13), ('water_tower','water',10),
 ('police_station','police',8), ('fire_station','fire',8), ('watchtower','watchtower',11),
 ('wall_segment','wall',10), ('park_lot','park',8), ('tree_deciduous','tree',6),
 ('citizen','citizen',2), ('zombie','zombie',2), ('compact_car','car',4),
 ('patrol_car','patrol_car',4), ('utility_car','utility_car',4)]
PROXIES = {'tree':'park', 'patrol_car':'car', 'utility_car':'car'}
HTML = '''<!doctype html><meta charset="utf-8"><title>CITISTEN external model fixture</title>
<link rel="icon" href="data:,"><style>body{margin:0}canvas{display:block;width:100vw;height:100vh}
pre{position:fixed;bottom:8px;left:8px;margin:0;padding:8px;background:#fff;color:#111;font:13px monospace;pointer-events:none}</style>
<canvas></canvas><pre id="label">Loading model API fixture</pre><script type="module">
import {createWorld} from './world.mjs';
try {
 const world=createWorld(document.querySelector('canvas'),{size:32,pixelRatio:1,modelLOD:0});
 if(world.ready)await world.ready;
 window.fixture={world,show(type,dimension,placement,label){
  for(const pool of world.buildings.pools.values())for(const h of [...pool.handles])world.buildings.remove(h);
  for(const key of [...world.roads.cells]){const c=world.roads.cell(key);world.roads.set(c.x,c.z,false);}
  if(placement){
   world.roads.place({x:8,z:18},{x:24,z:18});
   world.buildings.spawn('residential',{x:-25,z:-25,rotation:Math.PI});
   world.buildings.spawn('commercial',{x:25,z:-25,rotation:Math.PI});
  }
  const handle=world.buildings.spawn(type,{x:0,z:0,rotation:Math.PI});
  const distance=placement?Math.max(32,dimension*2):dimension*1.65+3;
  world.controls.setPose({x:distance*.6,y:Math.max(2,dimension*.4+distance*.35),z:distance,yaw:Math.atan(.6),pitch:-.31},true);
  world.dayNight.setPhase(.5);world.render(.016);document.querySelector('#label').textContent=label;
  return {type,pose:handle.pose,triangles:world.renderer.info.render.triangles,calls:world.renderer.info.render.calls};
 }};
} catch(error){window.fixtureError=String(error);console.error(error);}
</script>'''


def main(phase):
    before=shared.guard()
    if shared.browser_pids(): raise RuntimeError('Shared Chromium busy; no browser launched')
    out=ROOT/'docs/maintenance/audits/citisten-external'/phase;out.mkdir(parents=True,exist_ok=True)
    names=['world','buildings','materials','camera','roads','daynight','world-effects']
    names += ['model-geometry','model-city','model-services','model-agents'] if phase=='before' else ['external-assets','external-buildings','external-materials']
    def hashes():
        return {f'Games/Citisten3D/{n}.mjs':hashlib.sha256((ROOT/f'Games/Citisten3D/{n}.mjs').read_bytes()).hexdigest() for n in names}
    if phase=='before':
        assert hashes()['Games/Citisten3D/buildings.mjs']=='028b63d1efd8a37e07cb8909c84ac13fb8254c1449982483997c2d6305eaaa63', 'BEFORE requires the historical procedural kit; do not relabel the external renderer'
    report={'phase':phase,'scope':'Model/placement API fixtures, not gameplay or performance acceptance',
            'sourceHashes':hashes(),'shots':[],'errors':[],'external':[],'failed':[]}
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*_): pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=ROOT))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    def expired(*_): raise TimeoutError('External model capture exceeded 100 seconds; cleanup reserved within 120-second slot')
    signal.signal(signal.SIGALRM,expired);signal.alarm(100)
    try:
        with sync_playwright() as pw,tempfile.TemporaryDirectory(prefix='.external-qa-',dir=ROOT/'Games/Citisten3D') as profile:
            context=pw.chromium.launch_persistent_context(profile,executable_path='/usr/bin/chromium',headless=True,
                args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
                viewport={'width':1280,'height':720},device_scale_factor=1)
            try:
                owned=shared.browser_pids();assert len(owned)==1,'Launch contention'
                page=context.pages[0]
                page.on('pageerror',lambda e:report['errors'].append(str(e)))
                page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
                page.on('requestfailed',lambda r:report['failed'].append(r.url.replace(base,'LOOPBACK')))
                page.on('request',lambda r:report['external'].append(r.url) if not r.url.startswith((base,'data:','blob:'+base)) else None)
                page.route('**/external-qa.html',lambda route:route.fulfill(content_type='text/html',body=HTML))
                page.goto(base+'/Games/Citisten3D/external-qa.html',wait_until='networkidle')
                page.wait_for_function('window.fixture || window.fixtureError')
                assert not page.evaluate('window.fixtureError || null'),report
                for name,key,dimension in MODELS:
                    rendered=PROXIES.get(key,key) if phase=='before' else key
                    proxy=f' | BEFORE proxy: {rendered}; no standalone {key} existed' if rendered!=key else ''
                    for placement in [False,True]:
                        assert shared.browser_pids()==owned,'Browser contention'
                        view='scene' if placement else 'model'
                        label=f'{phase.upper()} | {name} | {view} API fixture, not gameplay'+proxy
                        data=page.evaluate('a=>fixture.show(...a)',[rendered,dimension,placement,label])
                        filename=f'{name}-{view}.jpg';shared.guard()
                        page.screenshot(path=str(out/filename),type='jpeg',quality=86)
                        report['shots'].append({'model':name,'view':view,'file':filename,'proxy':rendered!=key,**data})
                        assert shared.browser_pids()==owned,'Browser contention'
                assert hashes()==report['sourceHashes'],'Runtime source changed during capture'
                assert not report['errors'] and not report['external'] and not report['failed'],report
                page.evaluate('fixture.world.dispose()')
                report['complete']=True
            finally: context.close()
    finally:
        signal.alarm(0);server.shutdown();server.server_close()
        report['serverClosed']=True
        report['profileRemoved']='profile' in locals() and not Path(profile).exists()
        report['browserClosed']='owned' in locals() and not bool(owned & shared.browser_pids())
        report['diskBefore']=before;report['diskAfter']=shared.guard()
        (out/'results.json').write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps(report,indent=2))
    assert report['browserClosed'] and report['profileRemoved'] and report['serverClosed']
    print(f'EXTERNAL {phase.upper()} API CAPTURE PASS: 17 model/scene pairs, 34 JPEGs, no errors/external requests, owned resources closed')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('phase',choices=['before','after'])
    main(parser.parse_args().phase)
