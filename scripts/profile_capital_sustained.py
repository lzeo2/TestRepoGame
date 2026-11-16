#!/usr/bin/env python3
"""Bounded sustained Free-roam streaming STRESS FIXTURE, not a natural route.

Official map clicks reposition between sourced places; bridge attempts use only
keyboard driving. Compare stationary Telopea views before/after five minutes; report pose differences.
No screenshots. Run exclusively: one browser, no concurrent CPU benchmark.
"""
import argparse
import hashlib
import http.server
import json
import math
from pathlib import Path
import signal
import threading
import time
from urllib.parse import unquote, urlsplit

from playwright.sync_api import sync_playwright
from profile_capital_drive import QuietHandler, aggregate, group_functions, percentile, process_info, write_json


DTO = """() => {const s=capitalDriveSnapshot();return {player:s.player,focus:s.focus,
 camera:s.camera,rendering:s.rendering,world:s.world,neighbourhood:s.neighbourhood,
 simulationElapsed:s.signals.elapsed,airport:s.airport,webgl:window.__sustainedGLCounts?.(),
 mapView:s.mapView,gameMode:s.gameMode,paused:s.paused};}"""
KEYS = ('w', 'a', 's', 'd', 'Space', 'Shift')

# Weak ownership avoids the instrumentation retaining released GPU wrappers.
GL_INIT = r"""(() => {
 const counts={}, wrapped=new WeakSet();
 function wrap(proto, kind, createName, deleteName){
  if(!proto||!Object.prototype.hasOwnProperty.call(proto,createName)||wrapped.has(proto[createName]))return;
  const create=proto[createName], remove=proto[deleteName], owned=new WeakSet();
  const row=counts[kind]||(counts[kind]={created:0,deleted:0,live:0});
  function make(...args){const obj=create.apply(this,args);if(obj&&!owned.has(obj)){owned.add(obj);row.created++;row.live++;}return obj;}
  function drop(obj,...args){const result=remove.call(this,obj,...args);if(obj&&owned.has(obj)){owned.delete(obj);row.deleted++;row.live--;}return result;}
  wrapped.add(make);proto[createName]=make;proto[deleteName]=drop;
 }
 for(const klass of [window.WebGLRenderingContext,window.WebGL2RenderingContext]){
  if(!klass)continue;
  for(const [kind,createName,deleteName] of [['buffer','createBuffer','deleteBuffer'],['texture','createTexture','deleteTexture'],['program','createProgram','deleteProgram'],['vertexArray','createVertexArray','deleteVertexArray']])
   wrap(klass.prototype,kind,createName,deleteName);
  if(Object.prototype.hasOwnProperty.call(klass.prototype,'getExtension')){
   const original=klass.prototype.getExtension;
   klass.prototype.getExtension=function(name){const ext=original.call(this,name);
    if(ext&&name.toLowerCase()==='oes_vertex_array_object')wrap(ext,'vertexArray','createVertexArrayOES','deleteVertexArrayOES');return ext;};
  }
 }
 Object.defineProperty(window,'__sustainedGLCounts',{value:()=>JSON.parse(JSON.stringify(counts))});
})();"""



def release(page):
    for key in KEYS:
        page.keyboard.up(key)


def snapshot(page):
    # Snapshot construction can be expensive. Never leave a driving key held.
    release(page)
    return page.evaluate(DTO)


def sources(root):
    game = root / 'Games/Capital Drive'
    # Includes all runtime data, styles, vendored dependencies and assets in game.
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
            for directory in (game, root / 'assets')
            for p in sorted(directory.rglob('*')) if p.is_file()} | {
                'favicon.svg': hashlib.sha256((root / 'favicon.svg').read_bytes()).hexdigest()}


def fixtures(root):
    data = [json.loads((root / 'Games/Capital Drive/data' / f'{n}.json').read_text())
            for n in ('canberra', 'canberra-north')]
    school = next(p for d in data for p in d.get('landmarks', []) if p['id'] == 'telopea')
    bridges = []
    for name in ('Commonwealth Avenue', 'Kings Avenue'):
        candidates = [r for d in data for r in d['roads'] if r.get('name') == name
                      and str(r.get('sourceTags', {}).get('bridge', r.get('tags', {}).get('bridge', r.get('bridge', 'no')))) not in ('no', 'None', 'False')]
        def length(r):
            return sum(math.dist(a, b) for a, b in zip(r['points'], r['points'][1:]))
        road = max(candidates, key=length)
        a, b = road['points'][0], road['points'][-1]
        bridges.append(dict(name=name, road_id=road['id'], points=road['points'],
                            length=length(road), yaw=math.atan2(-(b[0]-a[0]), -(b[1]-a[1])),
                            start=dict(x=a[0], z=a[1]), end=dict(x=b[0], z=b[1])))
    return school, bridges


def reposition(page, point, records=None):
    release(page)
    page.locator('#map-button').click()
    page.wait_for_selector('#map-dialog[open]')
    canvas = page.locator('#full-map')
    for _ in range(20):
        state = snapshot(page)
        geometry = canvas.evaluate('(c)=>({w:c.width,h:c.height})')
        box = canvas.bounding_box()
        view = state['mapView']
        x = ((point['x']-view['x'])*view['scale']+geometry['w']/2)*box['width']/geometry['w']
        y = ((point['z']-view['z'])*view['scale']+geometry['h']/2)*box['height']/geometry['h']
        if 0 <= x <= box['width'] and 0 <= y <= box['height']:
            break
        if view['zoom'] <= 1:
            raise RuntimeError('Sourced fixture outside fully zoomed-out official map')
        page.locator('#map-zoom-out').click()
    else:
        raise RuntimeError('Official map zoom-out did not reach sourced fixture')
    canvas.click(position={'x': x, 'y': y})
    page.locator('#teleport-button').click()
    page.wait_for_selector('#map-dialog', state='hidden')
    page.wait_for_timeout(500)
    arrived = snapshot(page)
    delta = math.dist((arrived['player']['x'], arrived['player']['z']), (point['x'], point['z']))
    arrived['reposition'] = {'source_point':point, 'actual_player':arrived['player'],
                             'delta_metres':delta, 'official_map_click':True}
    if records is not None:
        records.append(arrived['reposition'])
    if delta > 150:
        raise RuntimeError(f'Official map arrival differs from sourced fixture by {delta:.1f}m')
    return arrived


def settle(page, name, records, seconds=20):
    """Bounded queue drain, logged separately from stationary sample windows."""
    started = time.monotonic()
    rows = []
    quiet = 0
    while time.monotonic()-started < seconds:
        state = snapshot(page)
        row = {'elapsed_seconds':time.monotonic()-started,
               'world':state['world'], 'neighbourhood':state['neighbourhood'],
               'airport':state['airport'], 'webgl':state['webgl']}
        rows.append(row)
        queued = (state['world'].get('queuedChunks', 0)
                  + state['neighbourhood'].get('queue', 0)
                  + state['airport'].get('pendingChunks', 0))
        quiet = quiet+1 if queued == 0 else 0
        if quiet >= 3:
            break
        page.wait_for_timeout(500)
    result = {'name':name, 'settled':quiet >= 3, 'rows':rows,
              'wall_seconds':time.monotonic()-started, 'limit_seconds':seconds}
    records.append(result)
    return result


def transition_profile(page, session, output, name, point, report):
    """Profile official map UI plus streaming construction, never steady-state."""
    before = snapshot(page)
    session.send('Profiler.start')
    started = time.monotonic()
    try:
        arrived = reposition(page, point, report['repositions'])
        settled = settle(page, name+'-arrival', report['transitions'],
                         seconds=12 if report['scenario'] == 'bridge-windows' else 20)
    finally:
        release(page)
        profile = session.send('Profiler.stop')['profile']
        write_json(output / (name+'-transition.cpuprofile'), profile)
        write_json(output / (name+'-transition-functions.json'), group_functions(aggregate(profile)))
    report['transition_profiles'].append({'name':name,'before':before,'arrival':arrived,
        'after':snapshot(page),'settled':settled['settled'],'wall_seconds':time.monotonic()-started,
        'includes':'Official map UI/polling/teleport, geometry construction and bounded queue drain; not stationary CPU cost'})


def retained_memory(page, session, browser_session, name):
    release(page)
    page.locator('#pause-button').click()
    page.wait_for_selector('#pause-dialog[open]')
    def measure():
        return {'snapshot':snapshot(page), 'heap':session.send('Runtime.getHeapUsage'),
                'processes':process_info(browser_session),
                'metrics':{m['name']:m['value'] for m in session.send('Performance.getMetrics')['metrics']}}
    try:
        before = measure()
        session.send('HeapProfiler.enable')
        session.send('HeapProfiler.collectGarbage')
        after = measure()
        return {'name':name, 'measurement':'explicit paused GC retained-memory diagnostic; separate from CPU windows',
                'before_gc':before, 'after_gc':after}
    finally:
        page.locator('#resume-button').click()


def drive(page, bridge, seconds=24):
    before = reposition(page, bridge['start'])
    start = time.monotonic()
    poses = []
    index = 1
    points = bridge['points']
    while time.monotonic()-start < seconds:
        pose = snapshot(page)['player']
        poses.append({k: pose.get(k) for k in ('x', 'z', 'yaw', 'speed', 'odometer')})
        if index < len(points)-1 and math.dist((pose['x'], pose['z']), points[index]) < 18:
            index += 1
        target = points[index]
        desired = math.atan2(-(target[0]-pose['x']), -(target[1]-pose['z']))
        delta = math.atan2(math.sin(desired-pose['yaw']), math.cos(desired-pose['yaw']))
        page.keyboard.down('w')
        if abs(delta) > .08:
            page.keyboard.down('a' if delta > 0 else 'd')
        page.wait_for_timeout(350)
        release(page)
        if index == len(points)-1 and math.dist((pose['x'], pose['z']), target) < 18:
            break
    after = snapshot(page)
    origin = before['player']
    finish = after['player']
    return dict(source_bridge=bridge, before=before, after=after, poses=poses,
                elapsed_seconds=time.monotonic()-start,
                achieved_distance=math.dist((origin['x'], origin['z']), (finish['x'], finish['z'])),
                achieved_odometer=finish.get('odometer', 0)-origin.get('odometer', 0),
                endpoint_distance=math.dist((finish['x'], finish['z']), points[-1]),
                reached_source_endpoint=index == len(points)-1 and math.dist((finish['x'], finish['z']), points[-1]) < 25,
                claim='Keyboard bridge attempt after official map reposition; no complete natural-route claim')


def sample(page, session, browser_session, output, name):
    before = snapshot(page)  # Releases movement keys before the recorded interval.
    process_started = time.monotonic()
    proc_before = process_info(browser_session)
    metrics_before = {m['name']: m['value'] for m in session.send('Performance.getMetrics')['metrics']}
    session.send('Profiler.start')
    started = time.monotonic()
    try:
        try:
            raf = page.evaluate("""() => new Promise(resolve=>{let last=null,active=true;const times=[];
              const start=performance.now();
              function tick(t){if(!active)return;if(last!==null)times.push(t-last);last=t;requestAnimationFrame(tick)}
              requestAnimationFrame(tick);setTimeout(()=>{active=false;resolve({times,elapsed_ms:performance.now()-start})},8000)})""")
        finally:
            # Bound profiler/Performance/process observations BEFORE keyup no-ops,
            # expensive public snapshot construction, aggregation or file writes.
            profile = session.send('Profiler.stop')['profile']
            profile_wall_seconds = time.monotonic()-started
            metrics_after = {m['name']: m['value'] for m in session.send('Performance.getMetrics')['metrics']}
            proc_after = process_info(browser_session)
            process_elapsed = time.monotonic()-process_started
    finally:
        release(page)
    write_json(output / f'{name}.cpuprofile', profile)
    write_json(output / f'{name}-functions.json', group_functions(aggregate(profile)))
    old = {p['id']: p for p in proc_before}
    cpu = [{'id': p['id'], 'type': p['type'],
            'cpu_percent_one_core': 100*(p['cpuTime']-old[p['id']]['cpuTime'])/process_elapsed,
            'rss_bytes': p.get('rss_bytes')} for p in proc_after if p['id'] in old]
    frames = raf['times']
    return dict(name=name, before=before, after=snapshot(page), raf_ms=frames,
                raf_p50_ms=percentile(frames, .5), raf_p95_ms=percentile(frames, .95),
                requested_timer_seconds=8, observed_raf_window_ms=raf['elapsed_ms'],
                profile_duration_seconds=(profile['endTime']-profile['startTime'])/1e6,
                profiler_wall_seconds=profile_wall_seconds,
                performance_timestamp_delta=metrics_after.get('Timestamp', 0)-metrics_before.get('Timestamp', 0),
                process_window_seconds=process_elapsed, process_cpu=cpu,
                processes_before=proc_before, processes_after=proc_after,
                metrics_before=metrics_before, metrics_after=metrics_after)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scenario', choices=['sustained', 'bridge-windows'], default='sustained',
                        help='bridge-windows: matched short stationary/map-transition windows, no sustained claim')
    parser.add_argument('--seconds', type=int, default=390, help='Sustained wall-time floor, 360–720; includes paused diagnostics')
    parser.add_argument('--minimum-active-seconds', type=float, default=0,
                        help='Optional supplied simulation-clock floor: 0 disabled, or 305–600 seconds')
    parser.add_argument('--quality', choices=['low', 'performance', 'standard'], default='low')
    parser.add_argument('--mode', choices=['bridge-attempts', 'streaming-stress'], default='bridge-attempts')
    parser.add_argument('--chromium', default='/usr/bin/chromium')
    args = parser.parse_args()
    root, output = args.root.resolve(), args.output.resolve()
    if not 360 <= args.seconds <= 720:
        parser.error('--seconds must be 360–720 (900-second total watchdog)')
    if args.minimum_active_seconds != 0 and not 305 <= args.minimum_active_seconds <= 600:
        parser.error('--minimum-active-seconds must be 0 or 305–600')
    if args.scenario == 'bridge-windows' and args.minimum_active_seconds:
        parser.error('--minimum-active-seconds is only meaningful for sustained scenario')
    if output == root or root in output.parents:
        parser.error('--output must be a fresh directory outside the repository')
    output.mkdir(parents=True, exist_ok=False)
    school, bridges = fixtures(root)
    report = dict(watchdog_seconds=360 if args.scenario == 'bridge-windows' else 900, scenario=args.scenario, sustained_claim=args.scenario == 'sustained',
                  requested_wall_floor_seconds=args.seconds if args.scenario == 'sustained' else None, transition_profiles=[], repositions=[], transitions=[], retained_memory=[], loaded_resources={}, mode=args.mode, quality=args.quality, source_sha256=sources(root),
                  fixtures={'school': school, 'bridges': bridges}, errors=[], external_requests=[],
                  request_failures=[], http_errors=[], samples=[], attempts=[], chronology=[],
                  limitations='Explicit Free-roam map stress fixtures, not natural continuous travel. '
                  'Stationary CPU windows separate static-area cost from residency growth. '
                  'Cloud software WebGL is not N100 hardware evidence. RAF is presentation timing. '
                  'WebGL counters are logical create/delete balances, not driver bytes; GC does not imply GPU release. '
                  'Snapshot DTO is small but existing public snapshot builds full state internally. '
                  'Browser process CPU/RSS include graphics; profiler covers renderer thread only.')
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
        lambda *a, **kw: QuietHandler(*a, directory=str(root), **kw))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    browser = None
    def timeout(*_):
        raise TimeoutError('Total profiling watchdog expired (360s short / 900s sustained)')
    signal.signal(signal.SIGALRM, timeout)
    signal.alarm(360 if args.scenario == 'bridge-windows' else 900)
    try:
        with sync_playwright() as pw:
            try:
                browser = pw.chromium.launch(executable_path=args.chromium, headless=True,
                    args=['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
                report['browser_version'] = browser.version
                context = browser.new_context(viewport={'width':1280, 'height':800}, service_workers='block')
                def route(request_route):
                    url = request_route.request.url
                    if urlsplit(url).hostname not in ('127.0.0.1', None):
                        report['external_requests'].append(url)
                        request_route.abort()
                    else:
                        request_route.continue_()
                context.route('**/*', route)
                context.add_init_script(GL_INIT)
                page = context.new_page()
                page.set_default_timeout(30000)
                page.on('pageerror', lambda e: report['errors'].append(str(e)))
                page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
                page.on('websocket', lambda socket: report['external_requests'].append('WebSocket:'+socket.url))
                page.on('requestfailed', lambda r: report['request_failures'].append({'url':r.url,'failure':r.failure}))
                def response_seen(response):
                    if response.status >= 400:
                        report['http_errors'].append({'url':response.url,'status':response.status})
                    relative = unquote(urlsplit(response.url).path).lstrip('/')
                    path = (root / relative).resolve()
                    if path.is_dir():
                        path = path / 'index.html'
                    if root in path.parents and path.is_file():
                        report['loaded_resources'][str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
                page.on('response', response_seen)
                page.goto(f'http://127.0.0.1:{server.server_port}/Games/Capital%20Drive/', wait_until='load', timeout=150000)
                page.wait_for_function('typeof capitalDriveSnapshot === "function"', timeout=150000)
                page.locator('[data-game-mode=free]').click()
                if page.locator('#guided-tutorial').count():
                    page.locator('#guided-tutorial').uncheck()
                page.locator('#start-button').click()
                page.locator('#pause-button').click()
                page.locator('#quality').select_option(args.quality)
                page.locator('#resume-button').click()
                session = context.new_cdp_session(page)
                browser_session = browser.new_browser_cdp_session()
                session.send('Performance.enable')
                session.send('Profiler.enable')
                session.send('Profiler.setSamplingInterval', {'interval':1000})
                initial = snapshot(page)
                if initial['rendering']['compatibility'] or initial['rendering']['quality'] != args.quality:
                    raise RuntimeError('Requested 3D quality unavailable')
                report['graphics'] = page.locator('#world canvas').evaluate('''c => {
                    const gl=c.getContext('webgl2')||c.getContext('webgl');
                    if(!gl)return {webgl:false};const ext=gl.getExtension('WEBGL_debug_renderer_info');
                    return {webgl:true,width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,
                     renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
                     vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),
                     version:gl.getParameter(gl.VERSION),maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),
                     maxRenderbufferSize:gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),maxViewportDims:Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS))};}''')
                started = time.monotonic()
                simulation_initial = snapshot(page)['simulationElapsed']
                simulation_current = simulation_initial
                report['simulation_clock_initial'] = simulation_initial
                report['minimum_active_seconds'] = args.minimum_active_seconds
                # Streaming-only mode preserves heading; driving mode reports the
                # resulting pose mismatch instead of claiming an identical view.
                transition_profile(page, session, output, 'telopea-initial', school, report)
                report['retained_memory'].append(retained_memory(page, session, browser_session, 'telopea-initial'))
                settle(page, 'telopea-initial-after-gc-resume', report['transitions'])
                report['samples'].append(sample(page, session, browser_session, output, 'telopea-initial'))
                after_five = False
                iteration = 0
                while ((iteration < 2) if args.scenario == 'bridge-windows' else
                       (time.monotonic()-started < args.seconds
                        or simulation_current-simulation_initial < args.minimum_active_seconds or not after_five)):
                    if time.monotonic()-started >= 720:
                        raise TimeoutError('720-second sustained wall cap reached before supplied simulation-clock target')
                    if (args.scenario == 'sustained' and time.monotonic()-started >= 305
                        and simulation_current-simulation_initial >= args.minimum_active_seconds and not after_five):
                        transition_profile(page, session, output, 'telopea-return', school, report)
                        report['retained_memory'].append(retained_memory(page, session, browser_session, 'telopea-return'))
                        settle(page, 'telopea-return-after-gc-resume', report['transitions'])
                        report['samples'].append(sample(page, session, browser_session, output, 'telopea-post5min'))
                        after_five = True
                    bridge = bridges[iteration % len(bridges)]
                    prefix = 'first' if iteration < 2 else ('post5min' if after_five else 'repeated')
                    name = f'{prefix}-{iteration}-{bridge["road_id"]}'
                    if args.mode == 'bridge-attempts' and args.scenario == 'sustained':
                        attempt = drive(page, bridge)
                        attempt['name'] = name
                        report['attempts'].append(attempt)
                    else:
                        if iteration < 2 or (after_five and not any(p['name'].startswith('post5min') for p in report['transition_profiles'])):
                            transition_profile(page, session, output, name, bridge['start'], report)
                        else:
                            reposition(page, bridge['start'], report['repositions'])
                            settle(page, name+'-arrival', report['transitions'])
                        if args.scenario == 'sustained':
                            page.wait_for_timeout(12000)
                    report['chronology'].append({'name':name,'elapsed_seconds':time.monotonic()-started,'snapshot':snapshot(page)})
                    if iteration < 4 or (after_five and not any(s['name'].startswith('bridge-post5min') for s in report['samples'])):
                        report['samples'].append(sample(page, session, browser_session, output, 'bridge-'+name))
                    simulation_current = report['chronology'][-1]['snapshot']['simulationElapsed']
                    report['simulation_clock_final'] = simulation_current
                    report['simulation_clock_delta'] = simulation_current-simulation_initial
                    iteration += 1
                    write_json(output / 'report.json', report)
                if args.scenario == 'bridge-windows':
                    transition_profile(page, session, output, 'telopea-return', school, report)
                    report['retained_memory'].append(retained_memory(page, session, browser_session, 'telopea-return'))
                    settle(page, 'telopea-return-after-gc-resume', report['transitions'])
                    report['samples'].append(sample(page, session, browser_session, output, 'telopea-return'))
                    after_five = False
                simulation_current = snapshot(page)['simulationElapsed']
                report['simulation_clock_final'] = simulation_current
                report['simulation_clock_delta'] = simulation_current-simulation_initial
                telopea = [s for s in report['samples'] if s['name'].startswith('telopea-')]
                if len(telopea) == 2:
                    a, b = [s['before']['player'] for s in telopea]
                    report['telopea_comparison'] = dict(
                        position_delta=math.dist((a['x'], a['z']), (b['x'], b['z'])),
                        yaw_delta=math.atan2(math.sin(b['yaw']-a['yaw']), math.cos(b['yaw']-a['yaw'])),
                        exact_heading_expected=args.mode == 'streaming-stress' or args.scenario == 'bridge-windows',
                        limitation='Bridge driving changes heading; compare camera DTO before attributing draw-count changes')
                report['sustained_wall_seconds'] = time.monotonic()-started
                report['clock_basis'] = 'wall time since initial fixture, includes separately logged pauses/GC/queue transitions; simulation_clock_delta separately measures supplied unpaused time'
                report['complete'] = ((iteration == 2) if args.scenario == 'bridge-windows' else
                                      (after_five and simulation_current-simulation_initial >= args.minimum_active_seconds))
                report['source_sha256_after'] = sources(root)
                report['loaded_resources_after'] = {name:hashlib.sha256((root/name).read_bytes()).hexdigest() for name in report['loaded_resources']}
                report['loaded_resources_unchanged'] = report['loaded_resources'] == report['loaded_resources_after']
                report['sources_unchanged'] = report['source_sha256'] == report['source_sha256_after']
                release(page)
            finally:
                if browser:
                    browser.close()
    except Exception as error:
        report['failure'] = str(error)
        raise
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        write_json(output / 'report.json', report)


if __name__ == '__main__':
    main()
