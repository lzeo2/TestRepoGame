"""Bounded world-only QA. Uses system Chromium; never downloads a browser."""
import functools
import http.server
import json
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA'
FLOOR = 2178940928


def guard():
    available = int(subprocess.check_output(['df', '-B1', '--output=avail', '/'], text=True).splitlines()[-1])
    if available < FLOOR:
        raise RuntimeError(f'Disk floor: {available} < {FLOOR}; stop and notify operator')
    return available


def browser_pids():
    result = set()
    for row in subprocess.check_output(['ps', '-eo', 'pid=,args='], text=True).splitlines():
        pid, command = row.strip().split(maxsplit=1)
        if Path(command.split()[0]).name in ('chromium', 'chrome') and '--type=' not in command:
            result.add(int(pid))
    return result


def main():
    # Shared board: do not race another team's Chromium. No process is killed here.
    if browser_pids():
        raise RuntimeError('Sibling Chromium active; sequence QA before retrying')
    before = guard()
    hardware_probe = os.environ.get('WORLD_HARDWARE_PROBE') == '1'
    evidence = 'WORLD-hardware-probe' if hardware_probe else 'WORLD-performance-60warmup'
    OUT.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '0'))), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    report = {'scope': 'Non-canonical hardware probe' if hardware_probe else 'World API fixtures, not integrated game acceptance',
              'errors': [], 'externalRequests': [], 'failedRequests': [], 'warmupFramesRequired': 60, 'targetFps': 40,
              'dedicatedProfile': True}
    def timeout(*_):
        raise TimeoutError('World QA exceeded 180 seconds')
    signal.signal(signal.SIGALRM, timeout)
    signal.alarm(180)
    try:
        with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='.world-qa-profile-', dir=ROOT / 'Games/Citisten3D') as profile:
            angle = 'gl' if hardware_probe else os.environ.get('WORLD_GL', 'swiftshader')
            args = ['--no-sandbox', '--use-gl=angle', '--use-angle=' + angle]
            if not hardware_probe:
                args.append('--enable-unsafe-swiftshader')
            context = p.chromium.launch_persistent_context(profile, executable_path='/usr/bin/chromium', headless=True,
                                                           args=args, viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
            browser = context.browser
            report['browserVersion'] = browser.version
            report['angleRequested'] = angle
            try:
                owned_browser = browser_pids()
                if len(owned_browser) != 1:
                    raise RuntimeError('Browser launch contention; no valid measurement')
                page = context.pages[0] if context.pages else context.new_page()
                def wait_exclusive(seconds):
                    for _ in range(seconds):
                        if browser_pids() != owned_browser:
                            raise RuntimeError('Sibling browser appeared during benchmark; discard measurement')
                        report['exclusiveBrowserChecks'] = report.get('exclusiveBrowserChecks', 0) + 1
                        page.wait_for_timeout(1000)
                    if browser_pids() != owned_browser:
                        raise RuntimeError('Browser contention at measurement boundary')
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                page.on('console', lambda message: report['errors'].append(message.text) if message.type == 'error' else None)
                page.on('requestfailed', lambda request: report['failedRequests'].append(request.url.replace(base, 'LOOPBACK')))
                page.on('request', lambda request: report['externalRequests'].append(request.url) if not request.url.startswith(base) and not request.url.startswith('data:') else None)
                def shot(name, text):
                    page.evaluate('''text => {
                      let label = document.querySelector('#qa-label');
                      if (!label) { label = document.createElement('pre'); label.id='qa-label';
                        label.style.cssText='position:fixed;left:12px;top:12px;margin:0;background:#fff;color:#111;padding:12px;font:16px monospace;z-index:5;pointer-events:none'; document.body.append(label); }
                      label.textContent = text;
                    }''', text)
                    guard()
                    page.screenshot(path=str(OUT / name))
                    page.evaluate("document.querySelector('#qa-label').remove()")
                def performance_check():
                    page.goto(base + '/Games/Citisten3D/world.html?size=128&perf&manual', wait_until='networkidle')
                    page.wait_for_function('window.citistenWorld || document.querySelector("pre")')
                    if not page.evaluate('Boolean(window.citistenWorld)'):
                        report['renderer'] = 'Unavailable: world WebGL renderer could not initialize'
                        shot(evidence + '.png', report['scope'] + '\n' + report['renderer'] + '\nNo FPS measured; 40 FPS gate not met')
                        raise RuntimeError(report['renderer'])
                    report['renderer'] = page.evaluate('''() => {
                      const gl=citistenWorld.world.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
                      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
                    }''')
                    report['pitchBounds'] = page.evaluate('''() => {
                      const c=citistenWorld.world.controls;
                      c.setPose({x:0,y:2,z:0,pitch:-100},true); const low=c.target.pitch;
                      c.setPose({x:0,y:2,z:0,pitch:100},true); return [low,c.target.pitch];
                    }''')
                    assert report['pitchBounds'][0] < -1.5 and report['pitchBounds'][1] > 1.5
                    page.evaluate('citistenWorld.world.controls.setPose({x:0,y:400,z:250,yaw:0,pitch:-.9},true)')
                    first = page.evaluate('citistenWorld.frameCount')
                    for _ in range(100):
                        wait_exclusive(1)
                        warmed = page.evaluate('citistenWorld.frameCount') - first
                        if warmed >= 60:
                            break
                    else:
                        raise RuntimeError('60-frame warmup not completed within bounded wait')
                    report['warmupFramesObserved'] = warmed
                    shot(evidence + '-warmup.png', f'{report["scope"]}\nWarmup checkpoint: {warmed} rendered frames, minimum 60')
                    page.evaluate('async () => { await new Promise(requestAnimationFrame); citistenWorld.samples.length = 0; }')
                    wait_exclusive(15)
                    report['performance'] = page.evaluate('citistenWorld.stats()')
                    assert report['performance']['frames'] > 0, 'No frames in 15-second measurement window'
                    perf = report['performance']
                    perf['targetFps'] = 40
                    perf['meetsTarget'] = perf['fps'] >= 40
                    shot(evidence + '.png', f'{report["scope"]} | 128 x 128 | 1280 x 720\n{perf["fps"]:.2f} fps | target 40 | {perf["modelInstances"]} model instances\n{perf["triangles"]} triangles | {perf["calls"]} calls | {perf["frames"]} measured frames\n{report["renderer"]}')
                    assert not report['errors'] and not report['externalRequests'] and not report['failedRequests'], report
                    if not perf['meetsTarget']:
                        raise RuntimeError(f'Render budget HOLD: {perf["fps"]:.2f} fps < 40 fps')
                if os.environ.get('WORLD_PERF_ONLY'):
                    performance_check()
                    return
                page.goto(base + '/Games/Citisten3D/world.html', wait_until='networkidle')
                page.wait_for_function('window.citistenWorld?.world.renderer.info.render.calls > 0')
                tour_start = page.evaluate('citistenWorld.world.controls.target')
                page.wait_for_function('start => citistenWorld.world.controls.target.x !== start.x', arg=tour_start, timeout=15000)
                report['spectatorMoved'] = True
                page.evaluate('citistenWorld.stopTour()')
                report['renderer'] = page.evaluate('''() => {
                  const gl=citistenWorld.world.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
                  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
                }''')
                world = 'citistenWorld.world'
                page.evaluate(f'{world}.controls.setPose({{x:5,y:35,z:25,yaw:0,pitch:-.04}},true)')
                page.mouse.move(640, 360)
                movement = {}
                for key in ['w', 'a', 's', 'd']:
                    start = page.evaluate(f'{world}.controls.target')
                    page.keyboard.down(key)
                    try:
                        page.wait_for_function('start => { const p=citistenWorld.world.controls.target; return Math.abs(p.x-start.x)+Math.abs(p.z-start.z)>.1; }', arg=start, timeout=10000)
                    finally:
                        page.keyboard.up(key)
                    end = page.evaluate(f'{world}.controls.target')
                    assert abs(start['x'] - end['x']) + abs(start['z'] - end['z']) > .1, key
                    movement[key] = {'before': start, 'after': end}
                report['nativePan'] = movement
                for button in ['right', 'middle']:
                    start = page.evaluate(f'{world}.controls.target')
                    page.mouse.move(600, 350); page.mouse.down(button=button)
                    page.mouse.move(640, 360, steps=4); page.mouse.up(button=button)
                    end = page.evaluate(f'{world}.controls.target')
                    assert end['yaw'] != start['yaw'] and end['pitch'] != start['pitch']
                report['nativeRotate'] = ['right', 'middle']
                # Set framing only; zoom itself must be achieved by real wheel input.
                page.evaluate(f'{world}.controls.setPose({{x:-45,y:35,z:5,yaw:-Math.PI/2,pitch:0}},true)')
                for _ in range(3): page.mouse.wheel(0, -2000); page.wait_for_timeout(100)
                page.wait_for_function('citistenWorld.world.camera.position.y < 2.02', timeout=10000)
                report['streetY'] = page.evaluate(f'{world}.camera.position.y')
                shot('A-world-street.png', f'WORLD CAMERA FIXTURE | native wheel zoom\nHeight {report["streetY"]:.3f} m | WASD + right/middle drag tested')
                for _ in range(4): page.mouse.wheel(0, 2000); page.wait_for_timeout(100)
                page.wait_for_function('citistenWorld.world.camera.position.y > 399.9', timeout=10000)
                report['overheadY'] = page.evaluate(f'{world}.camera.position.y')
                page.evaluate(f'{world}.controls.setPose({{x:0,y:400,z:0,yaw:0,pitch:-1.55}},true)')
                page.wait_for_timeout(300)
                shot('A-world-overhead.png', 'WORLD CAMERA FIXTURE | native wheel reached 400 m\n200 x 200 lots, 10 metres per lot')
                page.evaluate(f'{world}.controls.setPose({{x:110,y:100,z:155,yaw:.5,pitch:-.58}},true)')
                page.wait_for_timeout(300)
                shot('WORLD-day.png', 'WORLD LIGHTING FIXTURE | phase .5, day')
                page.evaluate(f'{world}.dayNight.setPhase(0)'); page.wait_for_timeout(300)
                shot('WORLD-night.png', 'WORLD LIGHTING FIXTURE | phase 0, night\nNo wave or simulation acceptance claimed')
                # Trace a moving visual specimen through a corner, using only the published API.
                report['laneFixture'] = page.evaluate('''async () => {
                  const w=citistenWorld.world; w.dayNight.setPhase(.5);
                  const n=w.roads.size/2;
                  w.roads.place({x:n-3,z:n},{x:n+3,z:n});
                  w.roads.place({x:n+3,z:n},{x:n+3,z:n+4});
                  const route=w.roads.path({x:n-3,z:n},{x:n+3,z:n+4});
                  const points=w.roads.lanePoints(route), car=w.buildings.spawn('car',points[0]);
                  const seen=[];
                  for(let i=1;i<points.length;i++) {
                    const a=points[i-1], b=points[i], yaw=Math.atan2(a.x-b.x,a.z-b.z);
                    for(let t=0;t<=1;t+=.5) {
                      const pose={x:a.x+(b.x-a.x)*t,y:.08,z:a.z+(b.z-a.z)*t,rotation:yaw};
                      const cell=w.roads.worldToCell(pose.x,pose.z);
                      if(!w.roads.has(cell.x,cell.z)) throw Error('Car left road');
                      w.buildings.transform(car,pose); seen.push(pose);
                      await new Promise(requestAnimationFrame);
                    }
                  }
                  w.controls.setPose({x:25,y:35,z:65,yaw:0,pitch:-.65},true);
                  return {route,waypoints:points,renderedPositions:seen.length};
                }''')
                page.wait_for_timeout(300)
                shot('E-world-lanes-fixture.png', 'E WORLD API FIXTURE | car traversed 30 lane positions + corner\nNot systems traffic acceptance')
                # Isolate kit with no invented gameplay, same renderer and public spawn API.
                page.evaluate('''() => {
                  const w=citistenWorld.world;
                  for(const p of w.buildings.pools.values()) for(const h of [...p.handles]) w.buildings.remove(h);
                  w.buildings.types.forEach((type,i)=> w.buildings.spawn(type,{x:(i%7-3)*22,z:Math.floor(i/7)*25,rotation:Math.PI}));
                  w.controls.setPose({x:0,y:65,z:95,yaw:0,pitch:-.62},true);
                }''')
                page.wait_for_timeout(300)
                shot('WORLD-kit.png', 'WORLD KIT | top row: residential commercial industrial power water police fire\nBottom: park townhall wall watchtower citizen zombie car')
                page.evaluate('''() => {
                  const w=citistenWorld.world;
                  w.buildings.spawn('citizen',{x:-2,z:80,rotation:Math.PI/2});w.buildings.spawn('zombie',{x:0,z:80,rotation:Math.PI/2});w.buildings.spawn('car',{x:3,z:80,rotation:Math.PI/2});
                  w.controls.setPose({x:0,y:4,z:89,yaw:0,pitch:-.25},true);
                }''')
                page.wait_for_timeout(300)
                shot('WORLD-agents.png', 'WORLD BASE MODELS | citizen / hunched zombie / car\nStatic primitive silhouettes, no AI')
                guard()
                (OUT / 'WORLD-results.json').write_text(json.dumps(report, indent=2) + '\n')
                performance_check()
            finally:
                context.close()
    finally:
        signal.alarm(0)
        server.shutdown(); server.server_close()
        report['serverClosed'] = True
        if 'profile' in locals():
            report['profileRemoved'] = not Path(profile).exists()
        if 'owned_browser' in locals():
            report['browserClosed'] = not bool(owned_browser & browser_pids())
        report['diskBefore'] = before
        report['diskAfter'] = guard()
        name = evidence + '.json' if os.environ.get('WORLD_PERF_ONLY') else 'WORLD-results.json'
        (OUT / name).write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
