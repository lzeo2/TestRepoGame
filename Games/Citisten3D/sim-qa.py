"""Bounded API fixture captures, NOT integrated-game or normal-input acceptance.
Uses only published world/UI APIs; no game renderer or UI implementation here.
Run after sibling Chromium gates finish: python3 -B Games/Citisten3D/sim-qa.py
"""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA'
FLOOR = 2178940928


def disk_guard():
    free = shutil.disk_usage(ROOT).free
    if free < FLOOR:
        raise RuntimeError(f'Disk guard: {free} bytes free, need {FLOOR}')
    return free


def browser_pids():
    processes = subprocess.run(['ps', '-C', 'chromium,chrome', '-o', 'stat=,pid=,args='], capture_output=True, text=True)
    if processes.returncode not in (0, 1):
        raise RuntimeError(f'Cannot verify browser exclusivity: {processes.stderr}')
    return {int(line.split()[1]) for line in processes.stdout.splitlines()
            if line.strip() and not line.lstrip().startswith('Z') and '--type=' not in line}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


SETUP = """async () => {
  const {createWorld} = await import('./world.mjs');
  const {createSimulation} = await import('./sim.mjs');
  const {createUI} = await import('./ui.mjs');
  const root = document.querySelector('#ui'), canvas = document.querySelector('#world');
  let world, sim, ui, handles = new Map();
  function reset(size, mode) {
    if (world) world.dispose(); if (ui) ui.destroy(); handles.clear();
    shotEvents=0;citizenShots=0;lastShot=null;
    world = createWorld(canvas, {size, pixelRatio:1});
    sim = createSimulation({size,mode,seed:8,roads:world.roads});
    ui = createUI(root, {}); ui.showGame();
    world.controls.setPose({x:70,y:230,z:220,yaw:.3,pitch:-.8},true);
  }
  function place(type,x,z) { const r=sim.place(type,x,z); if(!r.ok) throw Error(r.reason); return r.building; }
  let shotEvents=0, citizenShots=0, lastShot=null;
  function sync(events=[]) {
    world.render(1); // expire the previous captured FX frame before applying fresh sim events
    const data=[...sim.state.buildings,...sim.state.cars.map(b=>({...b,type:'car'})),
      ...sim.state.zombies.map(b=>({...b,type:'zombie'})),...sim.state.defenders.map(b=>({...b,type:'citizen'}))];
    const ids=new Set(data.map(b=>b.id));
    for(const [id,h] of handles) if(!ids.has(id)){world.buildings.remove(h);handles.delete(id);}
    for(const b of data){const p={...world.roads.center(b.x,b.z),rotation:b.heading||0};
      if(!handles.has(b.id)) handles.set(b.id,world.buildings.spawn(b.type,p));
      else world.buildings.transform(handles.get(b.id),p);
    }
    for(const e of events) if(e.type==='shot'){
      world.effects.shot({...e.from,y:e.source==='tower'?10:1.5},{...e.to,y:1.2});
      lastShot=e; shotEvents++; if(e.source==='citizen')citizenShots++;
    }
    world.dayNight.setPhase(sim.state.phase==='night'?0:.5);
    ui.update(sim.state,{roads:world.roads,size:sim.state.size}); ui.events(events); world.render(0);
  }
  function advance(seconds,stopOnShot=false){
    const notices=[];
    for(let i=0;i<seconds*4;i++){
      sim.update(.25); const events=sim.drainEvents();
      if(stopOnShot&&events.some(e=>e.type==='shot')){sync([...notices,...events]);return;}
      notices.push(...events.filter(e=>e.type!=='shot'));
    }
    sync(notices);
  }
  function focusShot(){if(!lastShot)return;
    const a=world.roads.center(lastShot.from.x,lastShot.from.z),b=world.roads.center(lastShot.to.x,lastShot.to.z);
    const x=(a.x+b.x)/2,z=(a.z+b.z)/2,side=z>0?-1:1;
    world.controls.setPose({x:x+25*side,y:65,z:z+75*side,yaw:.3+(side<0?Math.PI:0),pitch:-.7},true);world.render(0);
  }
  function summary(){return {time:sim.state.time,mode:sim.state.mode,phase:sim.state.phase,
    population:Math.floor(sim.state.population),budget:sim.state.budget,power:sim.state.power,
    night:sim.state.night,score:sim.state.score,kills:sim.state.kills,townHallHp:sim.state.townHallHp,
    zombies:sim.state.zombies.length,shotEvents,citizenShots,activeFX:world.effects.active};}
  window.qa={
    city(seconds=600){reset(40,'free');
      for(const z of [9,11,13,15,17,19,21,23])world.roads.place({x:5,z},{x:34,z});
      world.roads.place({x:18,z:9},{x:18,z:23});
      place('power',19,10);place('water',20,10);place('police',21,10);place('police',22,10);place('park',15,16);
      for(const z of [12,14,18,22])for(let x=7;x<15;x++)place('residential',x,z);
      for(let x=23;x<33;x++){place('industrial',x,10);place('commercial',x,12);}
      sim.drainEvents();advance(seconds);return summary();},
    grow(){advance(600);return summary();},
    cut(){sim.bulldoze(19,10);advance(10);return summary();},
    overload(){place('power',19,10);for(const z of [14,16,18,22])for(let x=23;x<34;x++)place('industrial',x,z);advance(2);return summary();},
    siege(){reset(24,'defense');world.roads.place({x:0,z:11},{x:23,z:11});world.roads.place({x:13,z:0},{x:13,z:23});
      for(const [x,z] of [[9,9],[15,9],[9,15],[15,15]])place('watchtower',x,z);
      for(const [x,z] of [[12,11],[13,12],[12,13],[11,12]]){world.roads.set(x,z,false);place('wall',x,z);}
      world.controls.setPose({x:45,y:120,z:140,yaw:.3,pitch:-.7},true);
      sim.drainEvents();advance(241);return summary();},
    shot(){advance(60,true);focusShot();return summary();},
    kill(){for(let i=0;i<400;i++){sim.update(.25);const events=sim.drainEvents();if(events.some(e=>e.type==='kill')){sync(events);break;}}focusShot();return summary();},
    wall(){
      for(let i=0;i<4000&&sim.state.score<2;i++){sim.update(.25);sim.drainEvents();}
      for(const b of [...sim.state.buildings])if(b.type==='watchtower')sim.bulldoze(b.x,b.z);
      for(const b of sim.state.buildings)if(b.hp<b.maxHp)sim.repair(b.id);
      for(let i=0;i<2000;i++){sim.update(.25);const events=sim.drainEvents();if(sim.state.buildings.some(b=>b.type==='wall'&&b.hp<b.maxHp)){sync(events);break;}}
      world.controls.setPose({x:20,y:40,z:65,yaw:.3,pitch:-.6},true);world.render(0);return summary();},
    loss(){advance(700);return summary();},
    free(){reset(24,'defense');for(let i=0;i<960;i++)sim.update(.25);sim.drainEvents();sim.setMode('free');advance(700);return summary();},
    citizen(){qa.city();sim.setMode('defense');advance(400,true);focusShot();return summary();},
    theme(value){if(root.dataset.theme!==value)(root.querySelector('dialog[open] [data-action="theme"]')||root.querySelector('[data-action="theme"]')).click();ui.update(sim.state,{roads:world.roads,size:sim.state.size});world.render(0);},
    dispose(){ui.destroy();world.dispose();}
  };
}"""


def main():
    before = disk_guard()
    if browser_pids():
        raise RuntimeError('Shared Chromium busy; wait for exclusive slot.')
    if not (ROOT / 'Games/Citisten3D/ui.mjs').is_file():
        raise RuntimeError('UI API source not available; do not substitute a mock HUD')
    OUT.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8743'))), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    errors, external, report = [], [], {'evidence': 'API fixture, not integrated game acceptance'}
    def expired(*_):
        raise TimeoutError('Sim API fixture gate exceeded 100 seconds')
    signal.signal(signal.SIGALRM, expired)
    signal.alarm(100)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                owned = browser_pids()
                if len(owned) != 1:
                    raise RuntimeError('Browser launch contention; discard this run')
                page = browser.new_page(viewport={'width': 1280, 'height': 800}, reduced_motion='reduce')
                page.on('pageerror', lambda e: errors.append(str(e)))
                page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                page.on('response', lambda r: errors.append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
                page.on('requestfailed', lambda r: errors.append(f'{r.url}: {r.failure}'))
                page.on('request', lambda r: external.append(r.url) if not r.url.startswith(('http://127.0.0.1:', 'data:')) else None)
                html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>CITISTEN sim API fixture, not game entry</title><link rel="icon" href="data:,"><link rel="stylesheet" href="./ui.css"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#world{position:fixed;inset:0;width:100%;height:100%}</style></head><body><canvas id="world"></canvas><div id="ui"></div></body></html>'
                page.route('**/sim-fixture.html', lambda route: route.fulfill(status=200, content_type='text/html', body=html))
                page.goto(f'http://127.0.0.1:{server.server_port}/Games/Citisten3D/sim-fixture.html')
                page.evaluate(SETUP)
                for letter, expression in [('C-initial', 'city(0)'), ('C', 'grow()'), ('D', 'cut()'), ('D-overload', 'overload()'), ('F', 'siege()'), ('G', 'shot()'), ('G-kill', 'kill()'), ('F-wall', 'wall()'), ('H', 'loss()'), ('I', 'free()'), ('G-citizen', 'citizen()')]:
                    report[letter] = page.evaluate(f'qa.{expression}')
                    page.evaluate('document.fonts.ready')
                    page.wait_for_timeout(300)  # allow the UI's documented minimap throttle to expire
                    for theme in ['dark', 'light']:
                        page.evaluate('(theme)=>qa.theme(theme)', theme)
                        page.wait_for_timeout(80)
                        disk_guard()
                        if browser_pids() != owned:
                            raise RuntimeError('Sibling browser appeared; discard this run')
                        page.screenshot(path=str(OUT / f'{letter}-sim-api-fixture-{theme}.png'))
                        if browser_pids() != owned:
                            raise RuntimeError('Sibling browser appeared during capture; discard this run')
                page.evaluate('qa.dispose()')
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        signal.alarm(0)
    report.update(errors=errors, externalRequests=external, diskBefore=before, diskAfter=disk_guard())
    disk_guard()
    (ROOT / 'docs/citisten-design/sim-browser-run.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    assert not errors and not external, 'Browser errors or external requests'
    assert report['C']['population'] >= 1400 and report['D']['population'] < report['C']['population']
    assert report['D']['power']['unserved'] > 0 and report['F']['zombies'] > 0
    assert report['G']['activeFX'] > 0 and report['G-kill']['kills'] > 0
    assert report['G-citizen']['citizenShots'] > 0 and report['G-citizen']['activeFX'] > 0
    assert report['H']['phase'] == 'lost' and report['H']['score'] == 2
    assert report['I']['mode'] == 'free' and report['I']['zombies'] == 0 and report['I']['shotEvents'] == 0


if __name__ == '__main__':
    main()
