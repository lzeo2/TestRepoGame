#!/usr/bin/env python3
"""Bounded normal-input Capital Drive CPU profiling; no game-state setters.

Run paired exports with the same options. Cloud SwiftShader is not target GPU
performance. Profiles measure renderer-thread JavaScript/native call samples;
browser process CPU counters separately include software graphics work.
"""
import argparse
from collections import defaultdict
import hashlib
import http.server
import json
import math
from pathlib import Path
import signal
import threading
import time

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def aggregate(profile):
    nodes = {node['id']: node for node in profile['nodes']}
    parents = {child: node['id'] for node in nodes.values() for child in node.get('children', [])}
    own, total, counts = defaultdict(float), defaultdict(float), defaultdict(int)
    for sample, delta in zip(profile.get('samples', []), profile.get('timeDeltas', [])):
        own[sample] += delta / 1000
        counts[sample] += 1
        current = sample
        while current is not None:
            total[current] += delta / 1000
            current = parents.get(current)
    rows = []
    for node_id, node in nodes.items():
        frame = node['callFrame']
        if total[node_id]:
            rows.append(dict(function=frame['functionName'] or '(anonymous)', url=frame['url'],
                             line=frame['lineNumber'] + 1, column=frame['columnNumber'] + 1,
                             self_ms=round(own[node_id], 3), inclusive_ms=round(total[node_id], 3),
                             samples=counts[node_id], node_id=node_id))
    return sorted(rows, key=lambda row: row['self_ms'], reverse=True)


def group_functions(stacks):
    """Combine self samples from the same function in different call stacks."""
    groups = {}
    for row in stacks:
        key = (row['function'], row['url'], row['line'], row['column'])
        group = groups.setdefault(key, {key: row[key] for key in ('function', 'url', 'line', 'column')})
        group['self_ms'] = group.get('self_ms', 0) + row['self_ms']
        group['samples'] = group.get('samples', 0) + row['samples']
    for group in groups.values():
        group['self_ms'] = round(group['self_ms'], 3)
    return sorted(groups.values(), key=lambda row: row['self_ms'], reverse=True)


def process_info(session):
    result = []
    for proc in session.send('SystemInfo.getProcessInfo')['processInfo']:
        row = dict(proc)
        try:
            statm = Path(f"/proc/{proc['id']}/statm").read_text().split()
            row['rss_bytes'] = int(statm[1]) * 4096
            row['command'] = Path(f"/proc/{proc['id']}/comm").read_text().strip()
        except (OSError, IndexError, ValueError):
            pass
        result.append(row)
    return result


def percentile(values, fraction):
    if not values:
        return None
    return sorted(values)[min(len(values) - 1, math.ceil(len(values) * fraction) - 1)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--mode', choices=['3d', '2d'], default='3d')
    parser.add_argument('--quality', choices=['low', 'performance', 'standard'], default='low')
    parser.add_argument('--seconds', type=float, default=8)
    args = parser.parse_args()
    if not 8 <= args.seconds <= 12:
        parser.error('--seconds must be between 8 and 12')
    args.output.mkdir(parents=True, exist_ok=False)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
        lambda *a, **kw: QuietHandler(*a, directory=str(args.root.resolve()), **kw))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    report = dict(mode=args.mode, quality=args.quality, seconds=args.seconds, viewport=[1280, 800], service_workers='block',
                  source_sha256={name: hashlib.sha256((args.root / 'Games/Capital Drive' / name).read_bytes()).hexdigest()
                                 for name in ['index.html', 'script.js', 'simulation.js', 'render-gate.js']
                                 if (args.root / 'Games/Capital Drive' / name).is_file()},
                  limitations='Cloud Chromium software WebGL; not an Intel N100/GPU benchmark. '
                  'RAF intervals include the presentation scheduler, not only game renders. '
                  'CPU profile self time includes V8 native calls but not GPU-process raster threads. '
                  'Performance metric windows include CDP start/stop overhead; inspect DevToolsCommandDuration. '
                  'The program pseudo-frame is unassigned/native work, not attributable JavaScript. '
                  'Service workers are blocked to exclude installation/cache hashing; historical ffb5df6f baseline had no service worker. '
                  'Sequential normal driving is time-based, so faster runs can cover a longer route; this is not an identical simulation trajectory.',
                  errors=[], cases=[])
    browser = None

    def timeout_handler(*_):
        raise TimeoutError('280-second profiling watchdog expired')

    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(280)
    try:
        with sync_playwright() as playwright:
            try:
                launch_args = ['--no-sandbox', '--disable-dev-shm-usage',
                               '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
                if args.mode == '2d':
                    launch_args.append('--disable-webgl')
                browser = playwright.chromium.launch(executable_path='/usr/bin/chromium',
                                                     headless=True, args=launch_args)
                report['browser_version'] = browser.version
                context = browser.new_context(viewport={'width': 1280, 'height': 800}, service_workers='block')
                page = context.new_page()
                page.set_default_timeout(150000)
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                session = page.context.new_cdp_session(page)
                browser_session = browser.new_browser_cdp_session()
                session.send('Performance.enable')
                session.send('Profiler.enable')
                session.send('Profiler.setSamplingInterval', {'interval': 1000})
                page.add_init_script("""window.__capitalProfileReadyAt = null;
                    const timer = setInterval(() => {
                      if (window.capitalDriveSnapshot) {
                        window.__capitalProfileReadyAt = performance.now(); clearInterval(timer);
                      }
                    }, 10);""")
                started = time.monotonic()
                page.goto(f'http://127.0.0.1:{server.server_port}/Games/Capital%20Drive/',
                          wait_until='load', timeout=150000)
                page.wait_for_function('window.__capitalProfileReadyAt !== null', timeout=150000)
                report['startup'] = page.evaluate('({ready_ms:window.__capitalProfileReadyAt, observed_ms:performance.now()})')
                report['startup']['wall_seconds'] = time.monotonic() - started
                report['graphics'] = page.evaluate("""() => { const canvas=document.querySelector('#world canvas');
                    const gl=canvas?.getContext('webgl2') || canvas?.getContext('webgl');
                    if(!gl)return {webgl:false}; const ext=gl.getExtension('WEBGL_debug_renderer_info');
                    return {webgl:true,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
                    vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR)}; }""")
                page.locator('[data-game-mode=street]').click()
                page.locator('#start-button').click()
                page.keyboard.press('p')
                page.wait_for_selector('#pause-dialog[open]')
                page.locator('#quality').select_option(args.quality)
                page.locator('#resume-button').click()
                report['canvas'] = page.locator('#world canvas').evaluate(
                    '(canvas) => ({width:canvas.width,height:canvas.height,css_width:canvas.clientWidth,css_height:canvas.clientHeight})')
                for name in ['idle', 'drive', 'paused']:
                    if name == 'drive':
                        page.keyboard.down('w')
                    if name == 'paused':
                        page.keyboard.press('p')
                        page.wait_for_selector('#pause-dialog[open]')
                    before = page.evaluate('capitalDriveSnapshot()')
                    if before['rendering']['compatibility'] != (args.mode == '2d'):
                        raise RuntimeError('Actual renderer does not match requested mode')
                    if before['rendering']['quality'] != args.quality:
                        raise RuntimeError('Actual renderer quality does not match requested quality')
                    metrics_before = {m['name']: m['value'] for m in session.send('Performance.getMetrics')['metrics']}
                    process_start = time.monotonic()
                    processes_before = process_info(browser_session)
                    session.send('Profiler.start')
                    wall_start = time.monotonic()
                    frames = page.evaluate("""seconds => new Promise(resolve => {
                        const times=[]; const start=performance.now(); let last=null, active=true;
                        function frame(now){if(!active)return;if(last!==null)times.push(now-last);last=now;requestAnimationFrame(frame);}
                        requestAnimationFrame(frame);
                        setTimeout(()=>{active=false;resolve({times,elapsed_ms:performance.now()-start});},seconds*1000);
                    })""", args.seconds)
                    elapsed = time.monotonic() - wall_start
                    profile = session.send('Profiler.stop')['profile']
                    metrics_after = {m['name']: m['value'] for m in session.send('Performance.getMetrics')['metrics']}
                    processes_after = process_info(browser_session)
                    process_wall = time.monotonic() - process_start
                    after = page.evaluate('capitalDriveSnapshot()')
                    if name == 'drive':
                        page.keyboard.up('w')
                    write_json(args.output / f'{name}.cpuprofile', profile)
                    stacks = aggregate(profile)
                    write_json(args.output / f'{name}-stacks.json', stacks)
                    functions = group_functions(stacks)
                    write_json(args.output / f'{name}-functions.json', functions)
                    before_cpu = {p['id']: p['cpuTime'] for p in processes_before}
                    cpu = [dict(p, cpu_seconds_delta=p['cpuTime'] - before_cpu.get(p['id'], p['cpuTime']),
                                cpu_percent_one_core=100*(p['cpuTime'] - before_cpu.get(p['id'], p['cpuTime']))/process_wall)
                           for p in processes_after]
                    case = dict(name=name, wall_seconds=elapsed, process_counter_wall_seconds=process_wall,
                        rendered_frames_delta=(after['rendering']['frames']-before['rendering']['frames'])
                            if 'frames' in before['rendering'] and 'frames' in after['rendering'] else None,
                        performance_metrics_wall_seconds=metrics_after['Timestamp']-metrics_before['Timestamp'],
                        cpu_profile_wall_seconds=(profile['endTime']-profile['startTime'])/1000000,
                        raf_measurement_ms=frames['elapsed_ms'],
                        frame_intervals_ms=dict(count=len(frames['times']), p50=percentile(frames['times'], .5),
                                                p95=percentile(frames['times'], .95), maximum=max(frames['times'], default=None)),
                        frame_intervals_raw_ms=frames['times'],
                        metrics_delta={key: metrics_after[key]-value for key, value in metrics_before.items()
                                       if key in metrics_after and key.endswith(('Duration', 'Count'))},
                        memory_metrics={key: value for key, value in metrics_after.items() if key.startswith('JSHeap')},
                        processes=cpu, snapshot_start=before, snapshot_end=after, top_self=functions[:30])
                    report['cases'].append(case)
                    write_json(args.output / 'report.json', report)
                    print(json.dumps(dict(case=name, wall_seconds=elapsed, frames=case['frame_intervals_ms'],
                                          metrics=case['metrics_delta'], rendering=after['rendering'], top_self=functions[:8])), flush=True)
            finally:
                if browser is not None:
                    browser.close()
    except Exception as error:
        report['fatal'] = str(error)
        raise
    finally:
        signal.alarm(0)
        server.shutdown()
        server.server_close()
        write_json(args.output / 'report.json', report)


if __name__ == '__main__':
    main()
