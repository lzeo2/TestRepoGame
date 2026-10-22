"""Actual-entry native-input QA. Run ONLY after an explicit browser-slot release.
TMPDIR=/dev/shm SMOKE_PORT=8751 python3 -B Games/Citisten3D/native-qa.py
No simulation grants, controller calls or camera mutation via diagnostics.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA/native'


def guard():
    if shutil.disk_usage(ROOT).free < 2178940928:
        raise RuntimeError('Disk guard: stop growing')


def browsers():
    rows = subprocess.check_output(['ps', '-eo', 'stat=,pid=,args='], text=True)
    return {int(parts[1]) for line in rows.splitlines() if len(parts := line.split()) > 2
            and not parts[0].startswith('Z') and Path(parts[2]).name in ('chromium', 'chrome')
            and '--type=' not in line}


STATE = """() => {const s=window.citisten.sim?.state;
 return s?{mode:s.mode,phase:s.phase,time:s.time,speed:s.speed,budget:s.budget,population:s.population,
 power:s.power,water:s.water,score:s.score,kills:s.kills,night:s.night,townHallHp:s.townHallHp,
 zombies:s.zombies.length,roads:citisten.world.roads.cells.size,
 buildings:s.buildings.map(b=>({id:b.id,type:b.type,x:b.x,z:b.z,powered:b.powered,watered:b.watered}))}:null;}"""
LAYOUT = """async () => {
 const {Vector3}=await import('./vendor/three.module.js');
 const {world,sim}=citisten,c=document.querySelector('#world'),r=c.getBoundingClientRect();
 const hall=sim.state.buildings.find(b=>b.type==='townhall');
 function point(x,z){const p=world.roads.center(x,z),v=new Vector3(p.x,.1,p.z).project(world.camera);
  const q={x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2,lot:{x,z}};
  return v.z>-1&&v.z<1&&q.y>220&&q.y<520&&document.elementFromPoint(q.x,q.y)===c?q:null;}
 for(let dz=3;dz<16;dz++)for(let dx=-12;dx<2;dx++){
  const x=hall.x+dx,z=hall.z+dz;
  const lots=Array.from({length:13},(_,i)=>({x:x+i,z}));
  const buildings=[['residential',2,-1],['commercial',5,-1],['industrial',6,-1],['power',3,1],['water',4,1],['park',5,1]];
  const all=[...lots,...buildings.map(([,a,b])=>({x:x+a,z:z+b}))];
  if(all.some(p=>!world.roads.valid(p.x,p.z)||world.roads.has(p.x,p.z)||sim.state.buildings.some(b=>b.x===p.x&&b.z===p.z)))continue;
  const projected=all.map(p=>point(p.x,p.z));if(projected.some(p=>!p))continue;
  return {from:projected[0],to:projected[12],buildings:buildings.map(([type,a,b])=>({type,...point(x+a,z+b)}))};
 }
 throw Error('No clear visible road/building plot; do not force camera or state');
}"""


def main():
    guard()
    if browsers():
        raise RuntimeError('Shared Chromium busy; no browser launched')
    if not (ROOT / 'Games/Citisten3D/index.html').is_file():
        raise RuntimeError('Native entry missing; no fixture substitution')
    OUT.mkdir(parents=True, exist_ok=True)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8751'))),
        functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    report = {'scope': 'Native input; diagnostics read-only; no state grants', 'checks': {},
              'held': {'F': 'Natural wave not reached within bounded core run',
                       'G': 'Combat not reached through native input',
                       'H': 'Natural hall loss/restart not reached'}, 'errors': [], 'externalRequests': []}
    def expired(*_):
        raise TimeoutError('Native QA exceeded 120 seconds')
    signal.signal(signal.SIGALRM, expired)
    signal.alarm(120)
    owned, profile = set(), None
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='citisten-native-', dir='/dev/shm') as profile:
            context = p.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium',
                headless=True, viewport={'width': 1280, 'height': 800}, service_workers='block',
                args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                owned = browsers()
                if len(owned) != 1:
                    raise RuntimeError('Browser launch contention')
                def exclusive():
                    if browsers() != owned:
                        raise RuntimeError('Competing browser appeared; native evidence invalid')
                def route(request):
                    if request.request.url.startswith(base + '/'):
                        request.continue_()
                    else:
                        report['externalRequests'].append(request.request.url)
                        request.abort()
                context.route('**/*', route)
                page = context.pages[0]
                page.set_default_timeout(20000)
                page.on('pageerror', lambda e: report['errors'].append(str(e)))
                page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                page.on('response', lambda r: report['errors'].append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
                page.on('requestfailed', lambda r: report['errors'].append(f'{r.url}: {r.failure}'))
                def state():
                    exclusive()
                    return page.evaluate(STATE)
                def shot(name):
                    guard(); exclusive()
                    page.screenshot(path=str(OUT / f'{name}.png'))
                    exclusive()
                def tool(name):
                    groups = {'road': 'Road', 'bulldoze': 'Bulldoze', 'residential': 'Zone',
                              'commercial': 'Zone', 'industrial': 'Zone', 'power': 'Service', 'water': 'Service', 'park': 'Service'}
                    page.locator(f'[data-group="{groups[name]}"]').click()
                    if name not in ('road', 'bulldoze'):
                        page.locator(f'[data-tool="{name}"]').click()
                    assert page.evaluate('citisten.tool') == name
                def click(point):
                    page.mouse.click(point['x'], point['y'])
                page.goto(base + '/Games/Citisten3D/index.html', wait_until='domcontentloaded')
                page.wait_for_function('window.citisten?.world')
                page.locator('[data-mode="free"]').click()
                page.wait_for_function('window.citisten.sim?.state.mode === "free"')
                page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                page.locator('#speed').select_option('0')
                initial = state(); page.wait_for_timeout(700)
                assert state()['time'] == initial['time'], 'Pause did not freeze simulation'
                layout = page.evaluate(LAYOUT)
                tool('road')
                page.mouse.move(layout['from']['x'], layout['from']['y']); page.mouse.down()
                page.mouse.move(layout['to']['x'], layout['to']['y'], steps=12); page.mouse.up()
                road = state()
                assert road['roads'] == initial['roads'] + 13
                assert road['budget'] == initial['budget'] - 130, 'Road drag not atomically charged'
                for point in layout['buildings']:
                    tool(point['type']); click(point)
                    assert any(b['type'] == point['type'] and b['x'] == point['lot']['x'] and b['z'] == point['lot']['z'] for b in state()['buildings'])
                report['checks']['placement'] = {'before': initial, 'after': state(), 'feedback': page.locator('#feedback').inner_text()}
                for speed in ['1', '3', '10']:
                    page.locator('#speed').select_option(speed)
                    page.wait_for_function('(n)=>citisten.sim.state.speed===n', arg=int(speed))
                page.wait_for_function('citisten.sim.state.population>0 && citisten.sim.state.power.served>0 && citisten.sim.state.water.served>0')
                report['checks']['C'] = state(); shot('C-native-city')
                page.locator('#speed').select_option('0')
                plant = next(p for p in layout['buildings'] if p['type'] == 'power')
                tool('bulldoze'); click(plant)
                page.locator('#speed').select_option('10')
                page.wait_for_function('citisten.sim.state.power.supply===0 && citisten.sim.state.power.unserved>0')
                report['checks']['D'] = state(); shot('D-native-blackout')
                tool('power'); click(plant)
                page.wait_for_function('citisten.sim.state.power.supply>0')
                page.locator('.city-top [data-action="menu"]').click()
                paused = state()['time']; page.wait_for_timeout(700)
                assert state()['time'] == paused
                page.locator('.city-menu [data-action="resume"]').click()
                page.wait_for_function('(t)=>citisten.sim.state.time>t', arg=paused)
                page.locator('#repair').click()
                assert page.evaluate('citisten.tool') == 'repair'
                report['checks']['menuResumeRepairTool'] = True
                context.set_offline(True)  # already-loaded native controls must still work
                page.locator('.city-top [data-action="menu"]').click()
                page.locator('[data-mode="defense"]').click()
                page.wait_for_function('citisten.sim?.state.mode==="defense" && citisten.sim.state.night===0')
                defense = state()
                assert defense['population'] == 0 and defense['roads'] == 0
                report['checks']['defenseNormalStartAndResetOffline'] = defense
                shot('I-native-defense-start-offline')
                page.locator('.city-top [data-action="menu"]').click()
                page.locator('[data-mode="free"]').click()
                page.wait_for_function('citisten.sim?.state.mode==="free"')
                assert state()['zombies'] == 0
                report['checks']['I'] = state(); shot('I-native-free-start-offline')
                page.set_viewport_size({'width': 390, 'height': 844})
                page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
                page.wait_for_function('document.querySelector("#native-controls").getBoundingClientRect().top >= document.querySelector(".city-top").getBoundingClientRect().bottom')
                if page.locator('#ui').get_attribute('data-theme') != 'light':
                    page.locator('.city-top [data-action="theme"]').click()
                page.wait_for_function('getComputedStyle(document.querySelector("#native-controls")).backgroundColor === "rgb(250, 247, 238)"')
                report['checks']['mobilePanelLight'] = page.evaluate('() => ({top:document.querySelector("#native-controls").getBoundingClientRect().top,hudBottom:document.querySelector(".city-top").getBoundingClientRect().bottom,background:getComputedStyle(document.querySelector("#native-controls")).backgroundColor})')
                shot('native-mobile-light')
                page.locator('.city-top [data-action="theme"]').click()
                page.wait_for_function('document.querySelector("#ui").dataset.theme === "dark"')
                shot('native-mobile-dark')
            finally:
                context.close()
    except Exception as error:
        report['failure'] = str(error).replace(str(ROOT), '.')
        raise
    finally:
        server.shutdown(); server.server_close(); thread.join(timeout=5); signal.alarm(0)
        report.update(serverClosed=True, browserClosed=not bool(owned & browsers()),
                      profileRemoved=profile is None or not Path(profile).exists())
        guard()
        (OUT / 'native-results.json').write_text(json.dumps(report, indent=2) + '\n')
    assert not report['errors'] and not report['externalRequests'], report
    print('NATIVE CORE QA COMPLETE: native placement, speed, menu/resume, two modes and offline controls; F/G/H HELD')


if __name__ == '__main__':
    main()
