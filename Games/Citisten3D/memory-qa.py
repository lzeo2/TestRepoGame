"""Bounded render/simulation memory fixture, not native-input or hardware acceptance.
TMPDIR=/dev/shm timeout 180s python3 -B Games/Citisten3D/memory-qa.py before|after
System Chromium only; owns/releases its server/profile. No screenshots or traces.
"""
import functools
import http.server
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile
import threading
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '.tmp/citisten-budget'


def tree_bytes(folder):
    total = 0
    for path in Path(folder).rglob('*'):
        try:
            if path.is_file(): total += path.stat().st_size
        except FileNotFoundError:
            pass  # Chromium atomically replaces its owned profile files.
    return total


def browser_roots():
    rows = subprocess.check_output(['ps', '-eo', 'stat=,pid=,args='], text=True)
    return {int(p[1]) for row in rows.splitlines() if len(p := row.split()) > 2
            and not p[0].startswith('Z') and Path(p[2]).name in ('chrome', 'chromium')
            and '--type=' not in row}


def process_memory(root):
    children = {root}
    rows = subprocess.check_output(['ps', '-eo', 'pid=,ppid='], text=True)
    pairs = [tuple(map(int, row.split())) for row in rows.splitlines()]
    for _ in range(8):
        children.update(pid for pid, parent in pairs if parent in children)
    rss = pss = 0
    for pid in children:
        try:
            for line in Path(f'/proc/{pid}/smaps_rollup').read_text().splitlines():
                if line.startswith('Rss:'): rss += int(line.split()[1]) * 1024
                if line.startswith('Pss:'): pss += int(line.split()[1]) * 1024
        except (FileNotFoundError, ProcessLookupError):
            pass
    return {'rssBytes': rss, 'pssBytes': pss}


SETUP = """async () => {
 const {createWorld}=await import('./world.mjs');
 const {createSimulation}=await import('./sim.mjs');
 const {syncModels}=await import('./native-actions.mjs');
 const world=createWorld(document.querySelector('canvas'),{size:200,pixelRatio:1.5});
 window.probe={world,cache:new Map(),syncModels}; await world.ready;
 const sim=createSimulation({mode:'defense',roads:world.roads}); probe.sim=sim;
 world.roads.place({x:90,z:101},{x:118,z:101});
 for(const [type,x,z] of [['power',99,102],['water',101,102],['park',103,102],['police',105,102],['fire',107,102],['watchtower',100,103],['commercial',104,100],['industrial',106,100]]) {
  if(!sim.place(type,x,z).ok) throw Error('Fixture placement failed:'+type);
 }
 for(let x=90;x<99;x++) if(!sim.place('residential',x,100).ok) throw Error('Home placement failed');
 // Render every supplied model type plus repeated static instances. These extra
 // handles are render stress only, never represented as native gameplay proof.
 world.buildings.types.forEach((type,i)=>world.buildings.spawn(type,{x:(i%8-4)*12,z:-60-Math.floor(i/8)*15}));
 for(let i=0;i<128;i++) world.buildings.spawn('residential',{x:(i%16-8)*12,z:60+Math.floor(i/16)*12});
 world.controls.setPose({x:5,y:170,z:200,yaw:0,pitch:-.72},true);
 probe.step=(seconds)=>{
  for(let t=0;t<seconds;t++){
   sim.update(1); const events=sim.drainEvents();
   for(const e of events)if(e.type==='shot')world.effects.shot({...e.from,y:2},{...e.to,y:1.2});
  }
  syncModels(world,sim.state,probe.cache);
  world.dayNight.setPhase(sim.state.phase==='day'?.5:0);world.render(.25);
  return {time:sim.state.time,phase:sim.state.phase,night:sim.state.night,
   zombies:sim.state.zombies.length,defenders:sim.state.defenders.length};
 };
 return probe.step(0);
}"""
SAMPLE = """() => {
 const {world,sim}=probe;const r=world.renderer.info;
 const textures=new Set(),sources=new Set(),geometries=new Set();let geometryBytes=0;
 world.scene.traverse(n=>{
  if(n.geometry&&!geometries.has(n.geometry)){
   geometries.add(n.geometry);for(const a of Object.values(n.geometry.attributes))geometryBytes+=a.array.byteLength;
   geometryBytes+=n.geometry.index?.array.byteLength||0;
  }
  if(n.instanceMatrix)geometryBytes+=n.instanceMatrix.array.byteLength;
  for(const m of [].concat(n.material||[]))for(const v of Object.values(m))if(v?.isTexture){textures.add(v);sources.add(v.source);}
 });
 return {time:sim.state.time,phase:sim.state.phase,night:sim.state.night,zombies:sim.state.zombies.length,
  defenders:sim.state.defenders.length,fxActive:world.effects.active,
  renderer:{memory:{...r.memory},render:{...r.render},programs:r.programs.length},
  geometryArrayBytes:geometryBytes,textureObjects:textures.size,textureSources:sources.size,
  activeClips:[...world.buildings.pools.values()].reduce((n,p)=>n+p.handles.filter(h=>h.action).length,0)};
}"""


def main():
    label = sys.argv[1] if len(sys.argv) == 2 else ''
    if label not in ('before', 'after'): raise ValueError('Choose before|after')
    if shutil.disk_usage(ROOT).free < 1500000000: raise RuntimeError('Disk hard halt')
    if browser_roots(): raise RuntimeError('Browser slot busy')
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'label': label, 'scope': 'Accelerated full simulation cycle; 128 repeated homes + all 17 model types; SwiftShader, 960x600 DPR1.5; not native-input/hardware acceptance',
              'samples': [], 'errors': [], 'peakPssBytes': 0, 'peakRssBytes': 0, 'profilePeakBytes': 0,
              'sourceRevision': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'sourceHashes': {name: hashlib.sha256((Path(__file__).parent / name).read_bytes()).hexdigest()
                               for name in ('world.mjs', 'daynight.mjs', 'external-assets.mjs', 'external-buildings.mjs', 'world-effects.mjs', 'native-actions.mjs', 'terrain.mjs')}}
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/Games/Citisten3D/'
    done = threading.Event()
    owned = set()
    def expired(*_): raise TimeoutError('150s action budget exhausted')
    signal.signal(signal.SIGALRM, expired); signal.alarm(150)
    started = time.monotonic()
    try:
        with tempfile.TemporaryDirectory(prefix='citisten-memory-', dir='/dev/shm') as tmp:
            # Includes Playwright artifacts and Chromium's NONpersistent profile.
            os.environ['TMPDIR'] = tmp
            def monitor():
                while not done.wait(.25):
                    size = tree_bytes(tmp)
                    report['profilePeakBytes'] = max(report['profilePeakBytes'], size)
                    for pid in owned:
                        mem = process_memory(pid)
                        report['peakPssBytes'] = max(report['peakPssBytes'], mem['pssBytes'])
                        report['peakRssBytes'] = max(report['peakRssBytes'], mem['rssBytes'])
                    if size > 12000000:
                        report['errors'].append('12MB profile cap exceeded')
                        for pid in owned: os.kill(pid, signal.SIGTERM)
                        return
            watcher = threading.Thread(target=monitor, daemon=True); watcher.start()
            with sync_playwright() as driver:
                browser = driver.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                    args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
                          '--disable-gpu-shader-disk-cache', '--disk-cache-size=1', '--media-cache-size=1',
                          '--disable-background-networking', '--disable-component-update'])
                owned.update(browser_roots())
                if len(owned) != 1: raise RuntimeError('Browser contention')
                context = browser.new_context(viewport={'width': 960, 'height': 600}, service_workers='block')
                page = context.new_page(); page.set_default_timeout(30000)
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                context.route('**/*', lambda route: route.continue_() if route.request.url.startswith(base.rsplit('Games/', 1)[0]) else route.abort())
                page.route('**/memory-fixture.html', lambda route: route.fulfill(content_type='text/html', body='<style>html,body{margin:0}canvas{width:960px;height:600px}</style><canvas></canvas>'))
                page.goto(base + 'memory-fixture.html', wait_until='commit')
                cdp = context.new_cdp_session(page); cdp.send('Performance.enable')
                def sample(name):
                    row = page.evaluate(SAMPLE); row['name'] = name
                    metrics = {m['name']: m['value'] for m in cdp.send('Performance.getMetrics')['metrics']}
                    row['heapUsedBytes'] = int(metrics['JSHeapUsedSize']); row['heapTotalBytes'] = int(metrics['JSHeapTotalSize'])
                    row.update(process_memory(next(iter(owned)))); report['samples'].append(row)
                    report['peakPssBytes'] = max(report['peakPssBytes'], row['pssBytes'])
                    report['peakRssBytes'] = max(report['peakRssBytes'], row['rssBytes'])
                    print(label, name, json.dumps(row), flush=True)
                page.evaluate(SETUP); sample('day-start')
                page.evaluate('probe.step(120)'); sample('mid-day')
                page.evaluate('probe.step(119)'); sample('day-end')
                page.evaluate('probe.step(1)'); sample('night-start')
                # Walk the entire first night, including zero-HP recovery if it falls.
                for i in range(1, 31):
                    state = page.evaluate('probe.step(10)')
                    sample(f'night+{i*10}')
                    if state['phase'] != 'night': break
                if report['samples'][-1]['phase'] == 'night': raise AssertionError('Cycle did not finish')
                page.evaluate('probe.world.dispose()')
                browser.close()
    finally:
        signal.alarm(0); done.set()
        if 'watcher' in locals(): watcher.join(timeout=2)
        server.shutdown(); server.server_close()
        report['seconds'] = round(time.monotonic() - started, 3)
        report['released'] = not (owned & browser_roots())
        (OUT / f'{label}.json').write_text(json.dumps(report, indent=2) + '\n')
    assert not report['errors'], report['errors']
    assert report['released'], 'Browser not released'
    assert report['peakRssBytes'] < 1800000000, 'Keep at least 200MB below the 2GB target'
    assert len({s['renderer']['memory']['geometries'] for s in report['samples']}) == 1, 'Geometry accumulated during cycle'
    assert max(s['activeClips'] for s in report['samples']) <= 822, '796 perimeter zombies + 24 defenders + 2 fixture walkers'
    if label == 'after':
        assert max(s['renderer']['memory']['textures'] for s in report['samples']) <= 68, 'Inactive shadow targets retained'
    print('MEMORY PASS', label, 'peak PSS', report['peakPssBytes'], 'peak RSS', report['peakRssBytes'], 'profile peak', report['profilePeakBytes'], flush=True)


if __name__ == '__main__': main()
