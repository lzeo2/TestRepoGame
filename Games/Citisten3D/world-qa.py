"""Bounded world-only QA. Uses system Chromium; never downloads a browser."""
import functools
import http.server
import json
import os
from pathlib import Path
import signal
import subprocess
import threading
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/citisten-QA'
FLOOR = 2178940928


def guard():
    available = int(subprocess.check_output(['df', '-B1', '--output=avail', '/'], text=True).splitlines()[-1])
    if available < FLOOR:
        raise RuntimeError(f'Disk floor: {available} < {FLOOR}; stop and notify operator')
    return available


def main():
    # Shared board: do not race another team's Chromium. No process is killed here.
    processes = subprocess.check_output(['ps', '-eo', 'args'], text=True).splitlines()
    if any((line.startswith('/usr/lib/chromium/chromium ') and '--type=' not in line) or 'chrome-linux/chrome --' in line for line in processes):
        raise RuntimeError('Sibling Chromium active; sequence QA before retrying')
    before = guard()
    OUT.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SMOKE_PORT', '0'))), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    report = {'scope': 'World API fixtures, not integrated game acceptance', 'errors': [], 'externalRequests': [], 'failedRequests': []}
    def timeout(*_):
        raise TimeoutError('World QA exceeded 180 seconds')
    signal.signal(signal.SIGALRM, timeout)
    signal.alarm(180)
    try:
        with sync_playwright() as p:
            args = ['--no-sandbox', '--enable-unsafe-swiftshader']
            if os.environ.get('WORLD_GL'):
                args.append('--use-angle=' + os.environ['WORLD_GL'])
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=args)
            try:
                page = browser.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
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
                page.goto(base + '/Games/Citisten3D/world.html?manual', wait_until='networkidle')
                page.wait_for_function('window.citistenWorld?.world.renderer.info.render.calls > 0')
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
                    page.keyboard.down(key); page.wait_for_timeout(180); page.keyboard.up(key)
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
                page.evaluate(f'{world}.controls.setPose({{x:5,y:35,z:25,yaw:0,pitch:0}},true)')
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
                  w.buildings.types.forEach((type,i)=> w.buildings.spawn(type,{x:(i%7-3)*22,z:Math.floor(i/7)*25}));
                  w.controls.setPose({x:0,y:65,z:95,yaw:0,pitch:-.62},true);
                }''')
                page.wait_for_timeout(300)
                shot('WORLD-kit.png', 'WORLD KIT | top row: residential commercial industrial power water police fire\nBottom: park townhall wall watchtower citizen zombie car')
                page.evaluate('''() => {
                  const w=citistenWorld.world;
                  w.buildings.spawn('citizen',{x:-2,z:80});w.buildings.spawn('zombie',{x:0,z:80});w.buildings.spawn('car',{x:3,z:80});
                  w.controls.setPose({x:0,y:4,z:89,yaw:0,pitch:-.25},true);
                }''')
                page.wait_for_timeout(300)
                shot('WORLD-agents.png', 'WORLD BASE MODELS | citizen / hunched zombie / car\nStatic primitive silhouettes, no AI')
                page.goto(base + '/Games/Citisten3D/world.html?size=128&perf&manual', wait_until='networkidle')
                page.wait_for_function('window.citistenWorld')
                page.evaluate('citistenWorld.world.controls.setPose({x:0,y:400,z:250,yaw:0,pitch:-.9},true)')
                page.wait_for_function('citistenWorld.samples.length >= 120', timeout=90000)
                report['performance'] = page.evaluate('citistenWorld.stats()')
                report['performance']['targetFps'] = 40
                report['performance']['meetsTarget'] = report['performance']['fps'] >= 40
                perf = report['performance']
                shot('WORLD-performance.png', f'WORLD PERFORMANCE | 128 x 128 | 1280 x 720\n{perf["fps"]:.2f} fps | target 40 | {perf["modelInstances"]} model instances\n{perf["triangles"]} triangles | {perf["calls"]} calls | {perf["frames"]} measured frames\n{report["renderer"]}')
                assert not report['errors'] and not report['externalRequests'] and not report['failedRequests'], report
            finally:
                browser.close()
    finally:
        signal.alarm(0)
        server.shutdown(); server.server_close()
        report['diskBefore'] = before
        report['diskAfter'] = guard()
        (OUT / 'WORLD-results.json').write_text(json.dumps(report, indent=2) + '\n')
        print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
