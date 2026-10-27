#!/usr/bin/env python3
"""Cold-start attribution, NOT native acceptance. Default: browser-free self-check.
Only after explicit shared-slot GO:
timeout --signal=TERM --kill-after=10s 110s python3 -B scripts/diagnose_foldwild_start.py --go
"""
import argparse
import base64
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import signal
import threading
from time import monotonic
from urllib.parse import unquote, urlsplit
import subprocess

import test_foldwild_upgrade as qa

TRACE = r'''(() => {
  const events=[],longtasks=[];
  const record=kind=>events.push({kind,at:performance.now()});
  Object.defineProperty(window,'foldwildStartTrace',{get:()=>structuredClone({events,longtasks})});
  requestAnimationFrame(()=>record('first-raf'));
  for(const capture of [true,false]) window.addEventListener('click',event=>{
    if(event.target.closest?.('#start')){
      record(capture?'start-click-capture':'start-click-bubble');
      if(capture)requestAnimationFrame(()=>record('first-raf-after-start'));
    }
  },{capture,passive:true});
  if(PerformanceObserver.supportedEntryTypes.includes('longtask'))
    new PerformanceObserver(list=>{for(const e of list.getEntries())
      if(longtasks.length<128)longtasks.push({start:e.startTime,duration:e.duration,name:e.name})
    }).observe({type:'longtask',buffered:true});
})()'''


def summarize(profile):
    """Sample-delta weighted inclusive stacks, microseconds; not exact native/GPU timing."""
    nodes = {n['id']: n for n in profile['nodes']}
    parents = {child: n['id'] for n in profile['nodes'] for child in n.get('children', [])}
    inclusive, exclusive, stacks = {}, {}, {}
    samples, deltas = profile.get('samples', []), profile.get('timeDeltas', [])
    assert len(samples) == len(deltas), 'profile sample/delta mismatch'
    for leaf, duration in zip(samples, deltas):
        assert leaf in nodes and duration >= 0, 'invalid profile sample'
        exclusive[leaf] = exclusive.get(leaf, 0) + duration
        chain, seen, node = [], set(), leaf
        while node is not None:
            assert node not in seen, 'cyclic profile'
            seen.add(node)
            chain.append(node)
            inclusive[node] = inclusive.get(node, 0) + duration
            node = parents.get(node)
        key = tuple(reversed(chain))
        stacks[key] = stacks.get(key, 0) + duration

    def frame(node):
        f = nodes[node]['callFrame']
        return {'function': f.get('functionName') or '(anonymous)',
                'source': urlsplit(f.get('url', '')).path.lstrip('/'),
                'line': f.get('lineNumber', -1) + 1}

    return {'sampling_interval_us': 10000, 'sample_count': len(samples),
            'sample_weight_us': sum(deltas),
            'profile_wall_us': profile.get('endTime', 0) - profile.get('startTime', 0),
            'weight_definition': 'sample timeDeltas; inclusive sums each ancestor; not exact GPU/native timing',
            'functions': [{**frame(n), 'inclusive_us': inclusive[n], 'exclusive_us': exclusive.get(n, 0)}
                          for n in sorted(inclusive, key=inclusive.get, reverse=True)[:80]],
            'stacks': [{'frames': [frame(n) for n in chain], 'weight_us': weight}
                       for chain, weight in sorted(stacks.items(), key=lambda p: p[1], reverse=True)[:40]]}


def self_check():
    def node(i, name, children=()):
        return {'id': i, 'callFrame': {'functionName': name, 'url': '', 'lineNumber': 0}, 'children': list(children)}
    profile = {'nodes': [node(1, 'root', [2]), node(2, 'terrain', [3]), node(3, 'render')],
               'samples': [3, 2, 3], 'timeDeltas': [10000, 20000, 10000], 'startTime': 0, 'endTime': 40000}
    result = summarize(profile)
    values = {f['function']: (f['inclusive_us'], f['exclusive_us']) for f in result['functions']}
    assert values == {'root': (40000, 0), 'terrain': (40000, 20000), 'render': (20000, 20000)}
    assert result['stacks'][0]['weight_us'] == 20000 and result['sample_weight_us'] == 40000
    try:
        summarize({**profile, 'timeDeltas': [1]})
    except AssertionError:
        pass
    else:
        raise AssertionError('malformed profile accepted')
    report = {'failures': []}
    original = TimeoutError('original click timeout')
    try:
        try:
            raise original
        except Exception as error:
            qa.failure(report, 'cold-start', error, (('profile-stop', lambda: (_ for _ in ()).throw(RuntimeError('secondary profiler failure'))),))
            raise
    except Exception as caught:
        assert caught is original
    assert report['primary_failure']['error'] == str(original)
    print('PASS: fake CPU profile inclusive/exclusive/stack weights; malformed profile rejection; primary click preserved after secondary profiler failure; no browser')


def run():
    from playwright.sync_api import sync_playwright
    before = qa.guard()
    def terminated(_signum, _frame):
        raise TimeoutError('external diagnostic TERM deadline')
    signal.signal(signal.SIGTERM, terminated)
    occupied = subprocess.run(['pgrep', '-af', '[c]hrome-linux/chrome|^/usr/lib/chromium/chromium.*--remote-debugging-pipe'], capture_output=True, text=True)
    assert occupied.returncode == 1, 'shared browser occupied: ' + occupied.stdout
    sources, fonts = qa.text_sources(), qa.font_bytes()
    assets = qa.asset_hashes()
    freeze = json.loads((qa.CORRECTIVE / 'freeze-9a23536d.json').read_text())
    reference = json.loads((qa.CORRECTIVE / 'phase-a.json').read_text())
    assert qa.hashes(sources) == freeze['source_hashes'], 'runtime changed since explicit freeze'
    assert assets == reference['asset_hashes'], 'frozen local assets changed'
    index = 1
    output = qa.CORRECTIVE / f'start-diagnostic-{index}'
    while output.exists():
        index += 1
        output = qa.CORRECTIVE / f'start-diagnostic-{index}'
    output.mkdir(parents=True)
    began = monotonic()
    report = {'purpose': 'cold-start timing diagnostic, NOT acceptance', 'acceptance': False,
              'source_hashes': qa.hashes(sources), 'asset_hashes': assets, 'disk_before_bytes': before,
              'stages': [], 'requests': [], 'errors': [], 'failures': [], 'captures': []}

    def budget():
        qa.guard()
        assert monotonic() - began < 100, 'internal diagnostic deadline'
        assert sum(p.stat().st_size for p in qa.OUT.rglob('*') if p.is_file() and p.name != 'ui-mockup.svg') < qa.BUDGET, 'aggregate evidence cap'

    def persist():
        qa.guard()
        data = json.dumps(report, indent=2) + '\n'
        path = output / 'results.json'
        temp = output / 'checkpoint.tmp'
        temp.write_text(data)
        temp.replace(path)

    def stage(name):
        budget()
        report['stages'].append({'stage': name, 'elapsed': monotonic() - began})
        persist()  # Durable boundary BEFORE the following browser/CDP call.
        print('STAGE:', name, flush=True)

    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            name = unquote(urlsplit(self.path).path).lstrip('/')
            body = sources.get(name, fonts.get(name))
            if body is None:
                return super().do_GET()
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript' if name.endswith('.js') else 'text/css' if name.endswith('.css') else 'font/woff2' if name.endswith('.woff2') else 'text/html')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(qa.ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    primary, browser, context, session = None, None, None, None
    try:
        with sync_playwright() as pw:
            try:
                stage('browser-launch')
                browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                    args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
                context = browser.new_context(viewport={'width': 1280, 'height': 800})
                context.add_init_script(TRACE)
                page = context.new_page()
                page.set_default_timeout(10000)

                def route(r):
                    if urlsplit(r.request.url).netloc != urlsplit(origin).netloc:
                        report['errors'].append({'type': 'external', 'url': r.request.url})
                        r.abort()
                    else:
                        r.continue_()
                context.route('**/*', route)
                page.on('request', lambda r: report['requests'].append({'event': 'start', 'url': r.url, 'elapsed': monotonic() - began}))
                page.on('requestfinished', lambda r: report['requests'].append({'event': 'finished', 'url': r.url, 'elapsed': monotonic() - began}))
                page.on('requestfailed', lambda r: report['errors'].append({'type': 'request', 'url': r.url, 'error': r.failure}))
                page.on('response', lambda r: report['errors'].append({'type': 'http', 'url': r.url, 'status': r.status}) if r.status >= 400 else None)
                page.on('pageerror', lambda e: report['errors'].append({'type': 'page', 'error': str(e)}))
                page.on('console', lambda m: report['errors'].append({'type': 'console', 'error': m.text}) if m.type == 'error' else None)
                qa.load_menu(page, stage, origin + '/Games/Foldwild/index.html')
                page.locator('#seed-input').fill('42')
                stage('profiler-enable')
                session = context.new_cdp_session(page)
                session.send('Profiler.enable')
                stage('profiler-interval-10000us')
                session.send('Profiler.setSamplingInterval', {'interval': 10000})
                stage('profiler-start-before-click')
                session.send('Profiler.start')
                try:
                    stage('cold-start-click-once-10s')
                    page.locator('#start').click(timeout=10000)
                    stage('click-returned')
                except Exception as error:
                    primary = error
                    qa.failure(report, 'cold-start-click', error)
                    stage('click-failed-preserved')
                try:
                    stage('world-model-readiness-existing-30s')
                    qa.ready(page, 'world')
                    report['world_ready'] = True
                except Exception as error:
                    report['world_ready'] = False
                    if primary is None:
                        primary = error
                        qa.failure(report, 'world-readiness', error)
                    else:
                        qa.diagnose(report, 'world-readiness', 'secondary', lambda: (_ for _ in ()).throw(error))
                finally:
                    stage('profiler-stop-secondary')
                    def stop_profile():
                        profile = session.send('Profiler.stop')['profile']
                        summary = summarize(profile)
                        summary['raw_profile_bytes_received'] = len(json.dumps(profile))
                        encoded = json.dumps(summary, indent=2)
                        assert len(encoded.encode()) < 300000, 'compact profile cap'
                        (output / 'cpu-summary.json').write_text(encoded + '\n')
                        report['profile_file'] = 'cpu-summary.json'
                    qa.diagnose(report, 'cold-start', 'profile-stop', stop_profile)
                stage('read-only-trace-and-view')
                def trace():
                    report['trace'] = page.evaluate('window.foldwildStartTrace')
                    report['view'] = qa.snap(page)['view']
                qa.diagnose(report, 'cold-start', 'trace', trace)
                stage('diagnostic-screenshot')
                def capture():
                    path = output / 'diagnostic-world.jpg'
                    page.screenshot(path=str(path), type='jpeg', quality=55, timeout=3000)
                    report['captures'].append({'file': path.name, 'bytes': path.stat().st_size})
                qa.diagnose(report, 'cold-start', 'screenshot', capture)
                if report.get('world_ready'):
                    stage('diagnostic-five-second-actual-walk')
                    page.evaluate('''() => {const stream=document.querySelector('canvas').captureStream(12),chunks=[];
                      const recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:500000});
                      window.qaStartVideo={stream,chunks,recorder};recorder.ondataavailable=e=>chunks.push(e.data);recorder.start()}''')
                    report['walk_before'] = qa.snap(page)['state']['position']
                    page.locator('#game-canvas').focus()
                    page.keyboard.down('w')
                    try:
                        page.wait_for_timeout(5000)
                    finally:
                        page.keyboard.up('w')
                    report['walk_after'] = qa.snap(page)['state']['position']
                    stage('diagnostic-video-stop')
                    encoded = page.evaluate('''() => new Promise(resolve=>{const q=qaStartVideo;
                      q.recorder.onstop=async()=>{q.stream.getTracks().forEach(t=>t.stop());
                        const bytes=new Uint8Array(await new Blob(q.chunks).arrayBuffer());
                        resolve(btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')))};q.recorder.stop()})''')
                    video = base64.b64decode(encoded)
                    assert 0 < len(video) < 1000000
                    budget()
                    (output / 'diagnostic-walking.webm').write_bytes(video)
                    report['captures'].append({'file': 'diagnostic-walking.webm', 'bytes': len(video)})
            except Exception as error:
                if primary is None:
                    primary = error
                    qa.failure(report, 'diagnostic', error)
                else:
                    qa.diagnose(report, 'diagnostic', 'secondary', lambda: (_ for _ in ()).throw(error))
            finally:
                qa.diagnose(report, 'cleanup', 'checkpoint', lambda: stage('cleanup-before-calls'))
                if session:
                    qa.diagnose(report, 'cleanup', 'profiler-disable', lambda: session.send('Profiler.disable'))
                    qa.diagnose(report, 'cleanup', 'session-detach', session.detach)
                if context:
                    qa.diagnose(report, 'cleanup', 'context-close', context.close)
                if browser:
                    report['browser_stopped'] = qa.diagnose(report, 'cleanup', 'browser-close', lambda: (browser.close(), True)[1]) is True
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        report['server_stopped'] = not thread.is_alive()
        report['source_hashes_after'] = qa.hashes(qa.text_sources())
        report['asset_hashes_after'] = qa.asset_hashes()
        report['frozen'] = report['source_hashes'] == report['source_hashes_after'] and assets == report['asset_hashes_after']
        report['disk_after_bytes'] = shutil.disk_usage(qa.ROOT).free
        qa.diagnose(report, 'cleanup', 'final-checkpoint', persist)
    print('DIAGNOSTIC:', output.relative_to(qa.ROOT), 'acceptance=false', flush=True)
    if primary is not None:
        raise primary
    assert not report['errors'] and not report.get('diagnostic_errors') and report['frozen'], report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--go', action='store_true', help='requires Wings actual release AND explicit parent GO')
    run() if parser.parse_args().go else self_check()
