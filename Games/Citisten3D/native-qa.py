"""Native input only. Run ONE suite only after an explicit browser-slot release.
NATIVE_CASE=city|shell TMPDIR=/dev/shm SMOKE_PORT=8751 timeout 120s python3 -B Games/Citisten3D/native-qa.py
100s actions + 20s cleanup. Diagnostics are read-only; no state/camera grants.
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
import time
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA/native'


def guard():
    if shutil.disk_usage(ROOT).free < 2178940928:
        raise RuntimeError('Disk guard: stop growing')


def browsers():
    rows = subprocess.check_output(['ps', '-eo', 'stat=,pid=,args='], text=True)
    return {int(parts[1]): line for line in rows.splitlines() if len(parts := line.split()) > 2
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
BOUNDS = """() => {
 const panel=document.querySelector('#native-controls'),p=panel.getBoundingClientRect();
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
 const overlap=[...document.querySelectorAll('.city-toasts > *')].filter(visible).some(e=>{const r=e.getBoundingClientRect();return p.left<r.right&&p.right>r.left&&p.top<r.bottom&&p.bottom>r.top;});
 return {visible:visible(panel),top:p.top,hudBottom:document.querySelector('.city-top').getBoundingClientRect().bottom,
 background:getComputedStyle(panel).backgroundColor,toastOverlap:overlap};
}"""


def main():
    case = os.environ.get('NATIVE_CASE', '')
    if case not in ('city', 'shell'):
        raise RuntimeError('Set NATIVE_CASE=city or shell; no combined long run')
    guard()
    if browsers():
        raise RuntimeError('Shared Chromium busy; no browser launched')
    if not (ROOT / 'Games/Citisten3D/index.html').is_file():
        raise RuntimeError('Native entry missing; no fixture substitution')
    folder = OUT / case
    folder.mkdir(parents=True, exist_ok=True)
    run = Path(tempfile.mkdtemp(prefix='run-', dir=folder))
    profile = run / 'profile'
    report = {'case': case, 'status': 'running', 'scope': 'Native input; read-only diagnostics; no grants',
              'directory': run.relative_to(ROOT).as_posix(), 'checks': {}, 'phases': [],
              'held': {k: 'Separate natural-combat slot required; no state grants' for k in ('F', 'G', 'H')},
              'errors': [], 'externalRequests': [], 'screenshots': []}
    started = time.monotonic()
    def checkpoint(phase):
        guard()
        report['phases'].append({'phase': phase, 'seconds': round(time.monotonic()-started, 3)})
        target = run / 'native-results.json'
        temporary = run / 'checkpoint.tmp'
        temporary.write_text(json.dumps(report, indent=2) + '\n')
        temporary.replace(target)
        print(f'NATIVE {case}: {phase}; {target.relative_to(ROOT)}', flush=True)
    def checked(name, value=True):
        report['checks'][name] = value
        checkpoint(name)
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '8751'))),
        functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}'
    def expired(*_):
        raise TimeoutError('Native action/cleanup time budget exhausted')
    signal.signal(signal.SIGALRM, expired)
    signal.alarm(100)
    owned, context, driver = set(), None, None
    checkpoint('starting')
    try:
        probe_started = time.monotonic()
        deadline = probe_started + 5
        while True:
            try:
                with urlopen(base + '/Games/Citisten3D/index.html', timeout=1) as response:
                    assert response.status == 200 and b'./native.mjs' in response.read(), 'Wrong native entry response'
                break
            except OSError:
                if time.monotonic() >= deadline:
                    raise RuntimeError('Native HTTP server did not become ready within 5s')
                time.sleep(.1)
        checked('serverReady', {'status': 200, 'seconds': time.monotonic()-probe_started})
        driver = sync_playwright().start()
        context = driver.chromium.launch_persistent_context(str(profile), executable_path='/usr/bin/chromium',
            headless=True, viewport={'width': 1280, 'height': 800}, service_workers='block',
            args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        owned = {pid for pid, command in browsers().items() if str(profile) in command}
        def exclusive():
            if len(owned) != 1 or set(browsers()) != owned:
                raise RuntimeError('Browser contention; evidence invalid')
        exclusive()
        def route(r):
            if r.request.url.startswith(base + '/'):
                r.continue_()
            else:
                report['externalRequests'].append(r.request.url); r.abort()
        context.route('**/*', route)
        page = context.pages[0]
        page.set_default_timeout(15000)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
        page.on('response', lambda r: report['errors'].append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
        page.on('requestfailed', lambda r: report['errors'].append(f'{r.url}: {r.failure}'))
        def state():
            exclusive(); return page.evaluate(STATE)
        def frames():
            page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
        def shot(name):
            guard(); exclusive()
            assert len(report['screenshots']) < 2, 'Only two screenshots per suite'
            page.screenshot(path=str(run / f'{name}.png'))
            exclusive(); report['screenshots'].append(name); checkpoint('shot:'+name)
        def bounds():
            value = page.evaluate(BOUNDS)
            assert value['visible'] and value['top'] >= value['hudBottom'], value
            assert not value['toastOverlap'], value
            return value
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
        checked('entryReady')
        page.locator('[data-mode="free"]').click()
        page.wait_for_function('window.citisten.sim?.state.mode === "free"')
        frames(); checked('freeStart', state())
        if case == 'city':
            page.locator('#speed').select_option('0')
            initial = state(); page.wait_for_timeout(700)
            assert state()['time'] == initial['time'], 'Pause did not freeze simulation'
            checked('pause', initial)
            layout = page.evaluate(LAYOUT)
            tool('road')
            page.mouse.move(layout['from']['x'], layout['from']['y']); page.mouse.down()
            page.mouse.move(layout['to']['x'], layout['to']['y'], steps=12); page.mouse.up()
            road = state()
            assert road['roads'] == initial['roads']+13 and road['budget'] == initial['budget']-130
            checked('roadDrag', road)
            for point in layout['buildings']:
                tool(point['type']); click(point)
                assert any(b['type']==point['type'] and b['x']==point['lot']['x'] and b['z']==point['lot']['z'] for b in state()['buildings'])
                checked('placed:'+point['type'])
            checked('placement', {'state': state(), 'feedback': page.locator('#feedback').inner_text()})
            for speed in ['1', '3', '10']:
                page.locator('#speed').select_option(speed)
                page.wait_for_function('(n)=>citisten.sim.state.speed===n', arg=int(speed))
                checked('speed:'+speed)
            page.wait_for_function('citisten.sim.state.population>0 && citisten.sim.state.power.served>0 && citisten.sim.state.water.served>0')
            checked('C', state()); checked('cityPanelBounds', bounds()); shot('C-native-city')
            page.locator('#speed').select_option('0')
            plant = next(p for p in layout['buildings'] if p['type']=='power')
            tool('bulldoze'); click(plant); page.locator('#speed').select_option('10')
            page.wait_for_function('citisten.sim.state.power.supply===0 && citisten.sim.state.power.unserved>0')
            checked('D', state()); checked('blackoutPanelBounds', bounds()); shot('D-native-blackout')
            tool('power'); click(plant)
            page.wait_for_function('citisten.sim.state.power.supply>0')
            checked('plantRebuilt', state())
            page.locator('.city-top [data-action="menu"]').click()
            paused = state()['time']; page.wait_for_timeout(700)
            assert state()['time'] == paused
            checked('menuPaused')
            page.locator('.city-menu [data-action="resume"]').click()
            page.wait_for_function('(t)=>citisten.sim.state.time>t', arg=paused)
            page.locator('#repair').click()
            assert page.evaluate('citisten.tool') == 'repair'
            checked('menuResumeRepairTool')
        else:
            context.set_offline(True)
            page.locator('.city-top [data-action="menu"]').click()
            page.locator('[data-mode="defense"]').click()
            page.wait_for_function('citisten.sim?.state.mode==="defense" && citisten.sim.state.night===0')
            defense = state()
            assert defense['population']==0 and defense['roads']==0
            checked('defenseNormalStartAndResetOffline', defense)
            page.locator('.city-top [data-action="menu"]').click()
            page.locator('[data-mode="free"]').click()
            page.wait_for_function('citisten.sim?.state.mode==="free"')
            assert state()['zombies']==0
            checked('I', state())
            page.set_viewport_size({'width': 390, 'height': 844}); frames()
            page.wait_for_function('document.querySelector("#native-controls").getBoundingClientRect().top >= document.querySelector(".city-top").getBoundingClientRect().bottom')
            if page.locator('#ui').get_attribute('data-theme')!='light':
                page.locator('.city-top [data-action="theme"]').click()
            page.wait_for_function('getComputedStyle(document.querySelector("#native-controls")).backgroundColor === "rgb(250, 247, 238)"')
            checked('mobilePanelLight', bounds()); shot('native-mobile-light')
            page.locator('.city-top [data-action="theme"]').click()
            page.wait_for_function('document.querySelector("#ui").dataset.theme === "dark"')
            checked('mobilePanelDark', bounds()); shot('native-mobile-dark')
        assert not report['errors'] and not report['externalRequests'], report
        report['status'] = 'checks-complete'
        checkpoint('checks-complete')
    except Exception as error:
        report.update(status='failed', failure=str(error).replace(str(ROOT), '.'))
        checkpoint('failure')
    finally:
        signal.alarm(20)
        owned |= {pid for pid, command in browsers().items() if str(profile) in command}
        checkpoint('cleanup-start')
        try:
            if context: context.close()
            if driver: driver.stop()
            report['driverClosed'] = True
        except Exception as error:
            report.update(status='failed', cleanupError=str(error).replace(str(ROOT), '.'))
            for pid in owned & set(browsers()):
                os.kill(pid, signal.SIGTERM)
        finally:
            server.shutdown(); server.server_close(); thread.join(timeout=1)
            report.update(serverClosed=not thread.is_alive(), browserClosed=not bool(owned & set(browsers())))
            if report['browserClosed'] and profile.exists():
                shutil.rmtree(profile)
            report['profileRemoved'] = not profile.exists()
            if not all(report.get(k, False) for k in ('driverClosed','serverClosed','browserClosed','profileRemoved')):
                report['status'] = 'failed'
            elif report['status'] == 'checks-complete':
                report['status'] = 'complete'
            checkpoint('finished')
            signal.alarm(0)
    raise SystemExit(0 if report['status']=='complete' else 1)


if __name__ == '__main__':
    main()
