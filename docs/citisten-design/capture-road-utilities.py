"""E car sequence + D utilities matrix. API evidence, not a game entry."""
import functools
import http.server
import importlib.util
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import threading
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('sim_qa', ROOT / 'Games/Citisten3D/sim-qa.py')
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)
OUT = shared.OUT


def disk_guard():
    free = int(subprocess.check_output(['df','-B1','--output=avail','/'],text=True).splitlines()[-1])
    if free < shared.FLOOR:
        raise RuntimeError(f'Disk guard: {free} bytes free')
    return free


SETUP = """async () => {
  const {createWorld}=await import('./world.mjs');
  const {createUI}=await import('./ui.mjs');
  const {Vector3}=await import('./vendor/three.module.js');
  const fixtures=await import('/docs/citisten-design/road-utility-fixtures.mjs');
  const world=createWorld(document.querySelector('#world'),{size:32,pixelRatio:1});
  const root=document.querySelector('#ui'), caption=document.querySelector('#caption'), marker=document.querySelector('#marker');
  let fixture,ui,carHandle;
  function clear(){
    if(ui)ui.destroy();ui=null;root.style.display='none';marker.hidden=true;
    for(const pool of world.buildings.pools.values())for(const handle of [...pool.handles])world.buildings.remove(handle);
    for(const key of [...world.roads.cells]){const p=world.roads.cell(key);world.roads.set(p.x,p.z,false);}
  }
  function buildings(){for(const b of fixture.sim.state.buildings)world.buildings.spawn(b.type,world.roads.center(b.x,b.z));}
  window.proof={
    startTraffic(){clear();caption.style.top='auto';caption.style.bottom='12px';fixture=fixtures.trafficFixture(world.roads);buildings();
      carHandle=world.buildings.spawn('car');
      world.controls.setPose({x:-35,y:150,z:75,yaw:0,pitch:-1.15},true);
      return {id:fixture.id,route:fixture.route};},
    traffic(segment){const p=fixture.checkpoint(segment),pos=world.roads.center(p.x,p.z);
      world.buildings.transform(carHandle,{...pos,y:.08,rotation:p.heading});world.render(0);
      const screen=new Vector3(pos.x,2,pos.z).project(world.camera);
      marker.hidden=false;marker.style.left=((screen.x+1)*innerWidth/2-24)+'px';marker.style.top=((1-screen.y)*innerHeight/2-25)+'px';
      marker.textContent='Car '+p.id+' ↓';
      caption.textContent='E API fixture, not integrated acceptance | Real sim car '+p.id+' | Segment '+p.segment+' / '+(fixture.route.length-2)+' | Time '+p.time+'s\\nOnly the tracked agent is drawn; simulation owns movement. Same camera for all six frames.';
      const a=marker.getBoundingClientRect(),b=caption.getBoundingClientRect();
      if(a.left<0||a.right>innerWidth||a.top<0||a.bottom>innerHeight||(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))throw Error('Tracked car annotation clipped or covered');
      return {...p,observations:fixture.observations.length};},
    utility(name){clear();caption.style.top='100px';caption.style.bottom='auto';fixture=fixtures.utilityFixture(name,world.roads);buildings();
      root.style.display='';ui=createUI(root,{});ui.showGame();
      world.controls.setPose({x:0,y:230,z:155,yaw:0,pitch:-1.05},true);world.render(0);
      return fixture.summary;},
    theme(theme){if(root.dataset.theme!==theme)root.querySelector('[data-action="theme"]').click();
      ui.update(fixture.sim.state,{roads:world.roads,size:32});world.render(0);
      if(root.querySelector('canvas').getBoundingClientRect().width>350)throw Error('UI minimap escaped its bounds');
      const s=fixture.summary, line=k=>{const v=s[k];return k+': supply '+v.supply.toFixed(2)+', demand '+v.demand.toFixed(2)+', served '+v.served.toFixed(2)+', unserved '+v.unserved.toFixed(2);};
      caption.textContent='D API fixture: '+s.case+' | Not integrated acceptance\\n'+line('power')+'\\n'+line('water')+'\\nHome (24,12): powered='+s.target.powered+', watered='+s.target.watered;
    },
    observations(){return fixture.observations;},
    dispose(){if(ui)ui.destroy();world.dispose();}
  };
}"""


def main():
    before = disk_guard()
    budget = int(os.environ.get('CAPTURE_SECONDS','150'))
    if not 1 <= budget <= 150:
        raise ValueError('CAPTURE_SECONDS must be 1..150')
    if shared.browser_pids():
        raise RuntimeError('Shared Chromium busy; no browser launched')
    OUT.mkdir(parents=True, exist_ok=True)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '0'))), functools.partial(shared.QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    report = {'scope':'E/D published-API fixtures, not integrated normal-input acceptance','errors':[],'externalRequests':[]}
    def expired(*_):
        raise TimeoutError(f'E/D capture exceeded {budget} seconds')
    signal.signal(signal.SIGALRM, expired)
    signal.alarm(budget)
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='.ed-qa-profile-',dir=ROOT/'Games/Citisten3D') as profile:
            context = p.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],viewport={'width':1280,'height':800},device_scale_factor=1)
            try:
                owned = shared.browser_pids()
                if len(owned)!=1:
                    raise RuntimeError('Browser launch contention')
                page = context.pages[0]
                page.on('pageerror',lambda e:report['errors'].append(str(e)))
                page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
                page.on('requestfailed',lambda r:report['errors'].append(r.failure))
                page.on('response',lambda r:report['errors'].append(f'HTTP {r.status}') if r.status>=400 else None)
                page.on('request',lambda r:report['externalRequests'].append(r.url) if not r.url.startswith(('http://127.0.0.1:','data:')) else None)
                html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>CITISTEN E/D API evidence</title><link rel="icon" href="data:,"><link rel="stylesheet" href="./ui.css"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#world{position:fixed;inset:0;width:100%;height:100%}#caption{position:fixed;top:100px;left:12px;z-index:20;background:white;color:black;padding:10px;font:15px monospace;white-space:pre;margin:0;pointer-events:none}#marker{position:fixed;z-index:15;background:white;color:black;font:16px monospace;padding:2px;pointer-events:none}</style></head><body><canvas id="world"></canvas><div id="ui"></div><pre id="caption"></pre><span id="marker" hidden></span></body></html>'
                page.route('**/ed-fixture.html',lambda route:route.fulfill(status=200,content_type='text/html',body=html))
                page.goto(f'http://127.0.0.1:{server.server_port}/Games/Citisten3D/ed-fixture.html')
                page.evaluate(SETUP)
                def shot(name):
                    disk_guard()
                    if shared.browser_pids()!=owned:raise RuntimeError('Competing browser; discard run')
                    page.screenshot(path=str(OUT/name))
                    if shared.browser_pids()!=owned:raise RuntimeError('Competing browser during capture')
                report['traffic']=page.evaluate('proof.startTraffic()')
                report['traffic']['checkpoints']=[]
                for i,segment in enumerate([0,7,14,18,24,27],1):
                    report['traffic']['checkpoints'].append(page.evaluate('(n)=>proof.traffic(n)',segment))
                    shot(f'E-car-sequence-{i:02}.png')
                report['traffic']['observations']=page.evaluate('proof.observations()')
                report['utilities']=[]
                cases=['connected','power-removed','water-removed','both-removed','road-cut','road-restored','power-overload','water-overload','isolated-sources']
                for name in cases:
                    report['utilities'].append(page.evaluate('(name)=>proof.utility(name)',name))
                    page.evaluate('document.fonts.ready')
                    page.wait_for_timeout(300)
                    for theme in ['dark','light']:
                        page.evaluate('(theme)=>proof.theme(theme)',theme)
                        shot(f'D-utilities-{name}-{theme}.png')
                page.evaluate('proof.dispose()')
            finally:
                context.close()
    finally:
        server.shutdown();server.server_close();thread.join(timeout=5);signal.alarm(0)
    report.update(browserClosed=not bool(owned & shared.browser_pids()),profileRemoved=not Path(profile).exists(),serverClosed=True,diskBefore=before,diskAfter=disk_guard())
    disk_guard()
    (OUT/'DE-api-results.json').write_text(json.dumps(report,indent=2)+'\n')
    assert not report['errors'] and not report['externalRequests'], report
    assert report['browserClosed'] and report['profileRemoved'] and report['serverClosed'], 'Owned resources remain'
    groups=[('E-car-sequence.png',[f'E-car-sequence-{i:02}.png' for i in range(1,7)])]
    groups += [(f'D-utilities-matrix-{theme}.png',[f'D-utilities-{name}-{theme}.png' for name in cases]) for theme in ['dark','light']]
    for name,files in groups:
        disk_guard()
        plate=Image.new('RGB',(1280*3,800*((len(files)+2)//3)),'white')
        for i,file in enumerate(files):
            with Image.open(OUT/file) as image:plate.paste(image,(i%3*1280,i//3*800))
        plate.save(OUT/name);plate.close()
    print(f'E/D API CHECK PASS: same real car across 6 checkpoints; 9 utility cases in 2 themes; 24 screenshots + 3 plates; no errors/external requests')
    print(json.dumps({key:report[key] for key in ['browserClosed','profileRemoved','serverClosed','diskBefore','diskAfter']}))


if __name__=='__main__':
    main()
