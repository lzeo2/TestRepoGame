#!/usr/bin/env python3
"""Lane 6: browser-free by default. Native batch ONLY after orchestrator GO.
Phase A: python3 -B scripts/test_foldwild_upgrade.py
Phase B: timeout --signal=TERM --kill-after=10s 590s python3 -B scripts/test_foldwild_upgrade.py --go
No downloads, copied worktree, state grants, retries, or error exclusions.
"""
import argparse
import base64
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
import re
import sys
from pathlib import Path
import shutil
import subprocess
import threading
from time import monotonic
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/foldwild-upgrade-evidence'
CORRECTIVE = OUT / 'corrective-cycle'
FONT_PATHS = ('assets/fonts/bungee/bungee-400-latin.woff2',
              'assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2',
              'assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2')
FLOOR = 2_147_483_648
BUDGET = 5_000_000
SUITES = ('data', 'save_v2', 'continuity', 'save_conflict', 'optional')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def guard():
    free = shutil.disk_usage(ROOT).free
    assert free >= FLOOR, f'disk floor: {free} < {FLOOR}; stop and escalate'
    return free


def text_sources():
    return {p.relative_to(ROOT).as_posix(): p.read_bytes()
            for p in sorted((ROOT / 'Games/Foldwild').iterdir())
            if p.suffix in ('.js', '.html', '.css')}


def hashes(sources):
    return {name: hashlib.sha256(data).hexdigest() for name, data in sources.items()}


def font_bytes():
    # Sparse fonts stay excluded on disk; serve the exact tracked bytes in memory.
    return {name: (ROOT / name).read_bytes() if (ROOT / name).is_file()
            else git('show', 'HEAD:' + name) for name in FONT_PATHS}


def asset_hashes():
    paths = sorted((ROOT / 'Games/Foldwild/models').rglob('*.glb'))
    paths += sorted((ROOT / 'Games/Foldwild/vendor').rglob('*'))
    return hashes({**{p.relative_to(ROOT).as_posix(): p.read_bytes() for p in paths if p.is_file()},
                   **font_bytes()})


def save_report(name, report):
    guard()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / name).write_text(json.dumps(report, indent=2) + '\n')


def phase_a():
    before = guard()
    report = {'browser_launched': False, 'native_acceptance': 'WAITING FOR GO',
              'source_hashes': hashes(text_sources()), 'asset_hashes': asset_hashes(), 'checks': []}
    for suite in SUITES:
        command = ['node', f'scripts/test_foldwild_{suite}.mjs']
        result = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=60)
        item = {'command': ' '.join(command), 'exit': result.returncode,
                'stdout': result.stdout, 'stderr': result.stderr.replace(str(ROOT), '<repo>')}
        report['checks'].append(item)
        print(item['command'], '\n' + result.stdout + item['stderr'], flush=True)
    report['source_hashes_after'] = hashes(text_sources())
    report['disk_before_bytes'] = before
    report['disk_after_bytes'] = shutil.disk_usage(ROOT).free
    report['passed'] = all(c['exit'] == 0 for c in report['checks'])
    CORRECTIVE.mkdir(parents=True, exist_ok=True)
    report['head_at_check'] = git('rev-parse', 'HEAD').decode().strip()
    save_report('corrective-cycle/phase-a-' + report['head_at_check'][:8] + '.json', report)
    assert report['passed'], 'browser-free regression failure; see phase-a.json'
    print('HARNESS READY: 5 Node suites; v1/v2 fixtures separate from native play. Await GO.')


def snap(page):
    return page.evaluate('window.foldwildSnapshot')


def ready(page, mode):
    began = monotonic()
    page.wait_for_function('''mode => {const v=window.foldwildSnapshot?.view;
        return v?.mode===mode && v.countLoadedModels >= (mode==='battle'?2:1)}''',
        arg=mode, timeout=30000)
    initial_frames = snap(page)['view']['frames']  # Baseline only AFTER required models attach.
    remaining_ms = 30000 - (monotonic() - began) * 1000
    if remaining_ms <= 0:
        raise TimeoutError('model/fresh-frame readiness exceeded shared 30s deadline')
    page.wait_for_function('''goal => {const v=window.foldwildSnapshot?.view;
        return v?.mode===goal.mode && v.countLoadedModels >= (goal.mode==='battle'?2:1)
          && v.frames>=goal.initialFrames+3}''',
        arg={'mode': mode, 'initialFrames': initial_frames}, timeout=remaining_ms)
    view = snap(page)['view']
    if monotonic() - began > 30:
        raise TimeoutError('model/fresh-frame readiness exceeded shared 30s deadline')
    assert not view['fallbackModels'], view
    assert view['cacheSize'] <= 12, view


def geometry(page):
    info = page.evaluate('''() => ({width:innerWidth,height:innerHeight,
      overflow:document.documentElement.scrollWidth>innerWidth,
      canvas:document.querySelector('#game-canvas').getBoundingClientRect().toJSON(),
      small:[...document.querySelectorAll('button,select,summary,a')].filter(e=>{
        const r=e.getBoundingClientRect();return r.width && r.height && (r.width<44 || r.height<44)
      }).map(e=>e.id||e.textContent),goal:document.querySelector('#objective-title')?.textContent,
      detail:document.querySelector('#objective-detail')?.textContent,
      action:document.querySelector('#navigate-objective')?.textContent})''')
    assert not info['overflow'] and not info['small'], info
    assert info['canvas']['height'] >= 150 and info['canvas']['width'] > 0, info
    return info


def check_motion(samples, reduced=False):
    assert len(samples) >= 3, 'insufficient native motion samples'
    poses = [sample['motion'] for sample in samples]
    assert all(p is not None for p in poses), 'playerMotion diagnostics missing'
    for sample, pose in zip(samples, poses):
        assert abs(pose['position']['y']) < 1e-7, pose
        assert math.hypot(pose['position']['x'] - sample['position']['x'],
                          pose['position']['z'] - sample['position']['z']) < .31, sample
        assert any(limb['grounded'] for limb in pose['limbs'].values()), pose
        for limb in pose['limbs'].values():
            assert limb['sole']['y'] >= -1e-7, pose
            assert abs(limb['hip'] + limb['knee'] + limb['ankle']) < 1e-7, pose
    if reduced:
        assert all(p['weight'] == 0 and p['phase'] == 0 for p in poses), poses
        for side in ('left', 'right'):
            for joint in ('arm', 'hip', 'knee', 'ankle'):
                values = [p['limbs'][side][joint] for p in poses]
                assert max(values) - min(values) < 1e-7, (side, joint, values)
    else:
        assert any(p['speed'] > .01 and p['weight'] > 0 for p in poses), poses
        for joint in ('arm', 'knee'):
            values = [p['limbs']['left'][joint] for p in poses]
            assert max(values) - min(values) > 1e-5, (joint, values)
        assert any(limb['sole']['y'] > .002 for p in poses for limb in p['limbs'].values()), poses


def diagnose(report, case, label, action):
    """Secondary evidence failures never replace the primary gameplay/load error."""
    try:
        return action()
    except Exception as error:
        report.setdefault('diagnostic_errors', []).append(
            {'case': case, 'diagnostic': label, 'error': str(error)})
        return None


def failure(report, case, error, probes=()):
    record = {'case': case, 'type': type(error).__name__, 'error': str(error)}
    report['failures'].append(record)
    report.setdefault('primary_failure', record)
    for label, action in probes:
        diagnose(report, case, label, action)


def record_evidence_failure(report, case, error, primary):
    failure(report, case, error)
    report['cases'][case].setdefault('evidence_failures', []).append(str(error))
    report['cases'][case]['status'] = 'failed'
    report['passed'] = False
    return primary if primary is not None else error


def load_menu(page, mark, url=None):
    mark('navigation-start' if url else 'reload-start')
    if url:
        page.goto(url, wait_until='load', timeout=10000)
    else:
        page.reload(wait_until='load', timeout=10000)
    mark('document-load')
    page.wait_for_function('window.foldwildSnapshot?.phase === "menu"', timeout=10000)
    mark('app-menu-ready')
    page.wait_for_function('''document.fonts.status==='loaded'
      && document.fonts.check('16px Atkinson') && document.fonts.check('700 16px Atkinson')
      && document.fonts.check('22px Bungee')''', timeout=10000)
    mark('fonts-ready')


def wait_for_wild(page, point_id):
    # Await imports once outside polling: a Promise(false) is still truthy to the poller.
    target = page.evaluate('''async id => {const {worldPoints}=await import('./world.js');
      return worldPoints(foldwildSnapshot.state).find(p=>p.id===id)}''', point_id)
    assert target and target['type'] == 'wild', 'offered wild target missing'
    page.wait_for_function('''p => {
      const s=foldwildSnapshot.state.position, button=document.querySelector('#interact');
      const distance=Math.hypot(s.x-p.x,s.z-p.z);
      return distance>=1.2-1e-7 && distance<=1.4 && !button.disabled
        && button.textContent.includes(p.label)}''', arg=target, timeout=45000)
    return target


def separation(page, point_id):
    s = snap(page)
    target = s['view']['actorPositions'].get(point_id)
    if target is None:
        target = next(p['pose']['position'] for p in s['view']['npcMotion'] if p['id'] == point_id)
    player = s['state']['position']
    distance = math.hypot(player['x'] - target['x'], player['z'] - target['z'])
    assert 1.2 - 1e-7 <= distance <= 1.4, (point_id, player, target, distance)
    return {'point': point_id, 'player': player, 'rendered_target': target, 'distance': distance}


def capture_viewport(page, context, details):
    """One native viewport frame, absolute 3s including setup/cleanup; no fallback."""
    began = monotonic()
    viewport = dict(page.viewport_size)
    assert viewport['width'] > 0 and viewport['height'] > 0
    details.update(method='CDP Page.startScreencast', format='jpeg', quality=55,
                   viewport=viewport, every_nth_frame=1, budget_seconds=3,
                   accepted=False, frame_count=0, frames=[], inflight_acks=0, cleanup_errors=[])
    session, frame, primary, callback_primary = None, None, None, None
    active, inflight = True, 0
    callback_errors = details.setdefault('callback_errors', [])
    try:
        session = context.new_cdp_session(page)
        def received(event):
            nonlocal frame, inflight, callback_primary
            if not active:
                details['inactive_events'] = details.get('inactive_events', 0) + 1
                return
            details['frame_count'] += 1  # Sequence at ENTRY, before a reentrant synchronous ACK.
            sequence = details['frame_count']
            inflight += 1
            details['inflight_acks'] = inflight
            try:
                arrived = monotonic() - began
                details['frames'].append({'index': sequence, 'elapsed_seconds': arrived,
                                          'metadata': event.get('metadata', {})})
                if sequence == 2:
                    details.update(chosen_frame=2, frame_elapsed_seconds=arrived,
                                   metadata=event.get('metadata', {}))
                    frame = event
                session.send('Page.screencastFrameAck', {'sessionId': event['sessionId']})
            except Exception as error:
                callback_errors.append({'file': details.get('file'), 'frame': sequence,
                                        'type': type(error).__name__, 'error': str(error)})
                if callback_primary is None:
                    callback_primary = error
            finally:
                inflight -= 1
                details['inflight_acks'] = inflight
        session.on('Page.screencastFrame', received)
        session.send('Page.startScreencast', {'format': 'jpeg', 'quality': 55,
            'maxWidth': viewport['width'], 'maxHeight': viewport['height'], 'everyNthFrame': 1})
        while frame is None:
            if callback_primary is not None:
                raise callback_primary
            remaining = 3 - (monotonic() - began)
            if remaining <= 0:
                raise TimeoutError('CDP viewport frame exceeded absolute 3s deadline')
            page.wait_for_timeout(min(50, remaining * 1000))
        if callback_primary is not None:
            raise callback_primary
        if monotonic() - began > 3 or details['frame_elapsed_seconds'] > 3:
            raise TimeoutError('CDP viewport frame arrived after absolute 3s deadline')
        pixels = base64.b64decode(frame['data'], validate=True)
        assert pixels, 'empty viewport frame'
    except Exception as error:
        primary = error
        details['primary_error'] = str(error)
    finally:
        active = False
        if session is not None:
            actions = [('remove-listener', lambda: session.remove_listener('Page.screencastFrame', received))]
            def drain():
                while inflight:
                    remaining = 3 - (monotonic() - began)
                    if remaining <= 0:
                        raise TimeoutError('inflight screencast ACKs exceeded absolute 3s')
                    page.wait_for_timeout(min(50, remaining * 1000))
            actions.extend([('drain-acks', drain), ('stop', lambda: session.send('Page.stopScreencast')),
                            ('detach', session.detach)])
            for label, action in actions:
                try:
                    action()
                except Exception as error:
                    details['cleanup_errors'].append({'operation': label, 'error': str(error)})
        details['elapsed_seconds'] = monotonic() - began
    if primary is None:
        primary = callback_primary
    if primary is not None:
        details['primary_error'] = str(primary)
        raise primary
    if details['elapsed_seconds'] > 3:
        raise TimeoutError('CDP viewport capture/cleanup exceeded absolute 3s deadline')
    if details['cleanup_errors']:
        raise RuntimeError('CDP viewport cleanup failed: ' + str(details['cleanup_errors']))
    details['accepted'] = True
    return pixels


def audit_stderr(text):
    text = text.replace(str(ROOT), '<repo>')
    text = re.sub(r'File "/[^"]*/([^/"]+)"', r'File "<runtime>/\1"', text)
    text = re.sub(r'(?<=at )/[^:\s]+', lambda m: '<runtime>/' + m.group().rsplit('/', 1)[-1], text)
    markers = re.findall(r'(?im)^.*(?:Unhandled|TargetClosed|Error occurred in event listener|Traceback|Exception in callback).*$', text)
    return text, markers


def clean_postflight(report):
    return bool(report['passed'] and not report.get('diagnostic_errors')
        and not report.get('callback_errors') and report.get('stderr_audit', {}).get('clean', False)
        and report.get('browser_stopped', False) and report['server_stopped']
        and report['sources_frozen'] and report['assets_frozen'])


def native_batch():
    from playwright.sync_api import sync_playwright
    before = guard()
    slot = subprocess.run(['pgrep', '-af',
        '[c]hrome-linux/chrome|^/usr/lib/chromium/chromium.*--remote-debugging-pipe'],
        capture_output=True, text=True)
    assert slot.returncode == 1, 'shared browser slot occupied: ' + slot.stdout
    sources = text_sources()
    assert 'Games/Foldwild/navigation.js' in sources, 'navigation must be integrated before GO'
    assets = asset_hashes()
    fonts = font_bytes()
    report = {'scope': 'fresh current desktop/touch only; historical baseline evidence preserved',
              'source_hashes': hashes(sources), 'asset_hashes': assets,
              'cases': {}, 'captures': [], 'errors': [], 'failures': [], 'passed': False,
              'disk_before_bytes': before, 'fixture_evidence': 'corrective-cycle/phase-a-eb917858.json (not native-positive)'}
    output = CORRECTIVE / 'native-1'
    index = 1
    while output.exists():
        index += 1
        output = CORRECTIVE / f'native-{index}'
    output.mkdir(parents=True, exist_ok=True)
    print('EVIDENCE:', output.relative_to(ROOT), flush=True)
    deadline = monotonic() + 570

    started = monotonic()
    report['stages'], report['requests'], report['server_requests'] = [], [], []
    pending = {}

    def mark(stage):
        report['stages'].append({'case': name, 'stage': stage, 'elapsed': monotonic() - started,
                                 'pending': list(pending.values())})
        save_report((output / 'native-results.json').relative_to(OUT), report)
        print('STAGE:', name, stage, flush=True)

    class Handler(SimpleHTTPRequestHandler):
        def do_GET(self):
            path = unquote(urlsplit(self.path).path).lstrip('/')
            body = sources.get(path, fonts.get(path))
            if body is None:
                return super().do_GET()
            kind = 'text/javascript' if path.endswith('.js') else 'text/css' if path.endswith('.css') else 'font/woff2' if path.endswith('.woff2') else 'text/html'
            self.send_response(200)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_request(self, code='-', size='-'):
            report['server_requests'].append({'path': self.path, 'status': code, 'elapsed': monotonic() - started})

        def log_message(self, *_args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'

    def budget():
        guard()
        assert monotonic() < deadline, 'bounded batch deadline'
        size = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file() and p.name != 'ui-mockup.svg')
        assert size < BUDGET, f'evidence budget {size} >= {BUDGET}'

    def shot(page, filename):
        nonlocal primary
        budget()
        path = output / (filename + '.jpg')
        details = {'file': path.relative_to(OUT).as_posix(), 'accepted': False,
                   'callback_errors': report.setdefault('callback_errors', [])}
        report.setdefault('capture_attempts', []).append(details)
        mark('viewport-capture:' + filename)
        try:
            pixels = capture_viewport(page, context, details)
        except Exception as error:
            primary = record_evidence_failure(report, name, error, primary)
            return  # Media gate remains failed; independent functional checks continue.
        path.write_bytes(pixels)
        report['captures'].append({**details, 'bytes': len(pixels)})
        budget()

    def tap(page, selector, phone):
        budget()
        getattr(page.locator(selector), 'tap' if phone else 'click')()

    def held(page, key, seconds, phone, context, samples=None):
        def wait_held():
            if samples is None:
                page.wait_for_timeout(seconds * 1000)
                return
            end = monotonic() + seconds
            while monotonic() < end:
                page.wait_for_timeout(min(137, max(0, (end - monotonic()) * 1000)))
                state = snap(page)  # Read-only diagnostics; no animation timer or state setter.
                samples.append({'elapsed': seconds - max(0, end - monotonic()),
                    'position': state['state']['position'], 'motion': state['view'].get('playerMotion')})
        if phone:
            button = page.locator(f'[data-move="{key}"]')
            button.scroll_into_view_if_needed()
            box = button.bounding_box()
            session = context.new_cdp_session(page)
            try:
                session.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints':
                    [{'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2, 'id': 1}]})
                wait_held()
            finally:
                session.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                session.detach()
        else:
            page.locator('#game-canvas').focus()
            page.keyboard.down(key)
            try:
                wait_held()
            finally:
                page.keyboard.up(key)

    def manual_save(page, phone):
        tap(page, '.expedition-options > summary', phone)
        tap(page, '#save-now', phone)
        page.wait_for_function('document.querySelector("#save-state").textContent === "Progress saved on this device."')
        tap(page, '.expedition-options > summary', phone)
        return page.evaluate('localStorage.getItem("foldwild-save-v1")')

    def play(page, phone, context, name):
        report['cases'][name]['world'] = geometry(page)
        mark('objective-and-layout')
        assert 'Northern Clearing' in page.locator('#objective-title').inner_text()
        assert 'Walk to Northern Clearing' in page.locator('#navigate-objective').inner_text()
        assert page.locator('#navigate-objective').is_enabled()
        shot(page, name + '-world-scenery-ui')
        state = snap(page)['state']
        mark('owned-inspector')
        tap(page, '#collection-btn', phone)
        tap(page, '[data-inspect="owned-1"]', phone)
        ready(page, 'inspection')
        assert page.evaluate('document.querySelectorAll("canvas").length===1 && document.querySelector("canvas").parentElement.id==="ledger-model-host"')
        shot(page, name + '-character')
        if phone:
            page.set_viewport_size({'width': 320, 'height': 844})
            geometry(page)
            shot(page, name + '-320-inspector-before-close')
        try:
            page.locator('#collection-close').scroll_into_view_if_needed()
            report['cases'][name]['close_hit_target'] = page.locator('#collection-close').evaluate('''e => {
              const r=e.getBoundingClientRect();return {rect:r.toJSON(),
                centerHit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.id,
                pointerEvents:getComputedStyle(e).pointerEvents};}''')
            mark('single-close-tap')
            tap(page, '#collection-close', phone)  # ONE tap, no retries or timeout inflation.
            report['cases'][name]['close_immediate_posttap'] = page.evaluate('''() => ({
              open:document.querySelector('#collection-dialog').open,mode:foldwildSnapshot.view.mode,
              canvasParent:document.querySelector('canvas').parentElement.className,
              active:document.activeElement?.id})''')
            page.wait_for_function('!document.querySelector("#collection-dialog").open && foldwildSnapshot.view.mode==="world"')
            ready(page, 'world')
            assert snap(page)['state'] == state
            assert page.evaluate('document.querySelectorAll("canvas").length===1 && document.querySelector("canvas").parentElement.classList.contains("viewport")')
            report['cases'][name]['single_close'] = 'PASS'
            if phone:
                report['cases'][name]['320_world_geometry'] = geometry(page)
                page.set_viewport_size({'width': 390, 'height': 844})
        except Exception:
            report['cases'][name]['single_close'] = 'FAIL'
            raise  # Shared case boundary preserves the primary and collects safe diagnostics.
        before_move = snap(page)['state']['position']
        # Both cases record actual canvas frames, never synthetic animation or mocked state.
        page.evaluate('''() => {const chunks=[]; const stream=document.querySelector('canvas').captureStream(12);
          window.qaRecording={stream,chunks};const recorder=new MediaRecorder(stream,{mimeType:'video/webm',videoBitsPerSecond:500000});
          qaRecording.recorder=recorder;recorder.ondataavailable=e=>chunks.push(e.data);recorder.start();}''')
        mark('native-walking-video')
        samples = report['cases'][name]['walking_motion_samples'] = []
        held(page, 'w', 5, phone, context, samples)
        after_move = snap(page)['state']['position']
        assert math.hypot(after_move['x']-before_move['x'], after_move['z']-before_move['z']) > .5
        encoded = page.evaluate('''() => new Promise(resolve=>{const q=qaRecording;
          q.recorder.onstop=async()=>{q.stream.getTracks().forEach(t=>t.stop());
            const bytes=new Uint8Array(await new Blob(q.chunks).arrayBuffer());
            resolve(btoa(Array.from(bytes,b=>String.fromCharCode(b)).join('')))};q.recorder.stop()})''')
        video = base64.b64decode(encoded)
        assert 0 < len(video) < 1_000_000
        guard()
        path = output / f'{name}-walking.webm'
        path.write_bytes(video)
        report['captures'].append({'file': path.relative_to(OUT).as_posix(), 'bytes': len(video)})
        budget()
        check_motion(samples)
        report['cases'][name]['native_movement'] = {'before': before_move, 'after': after_move,
            'touch': phone, 'held_seconds': 5, 'video': path.relative_to(OUT).as_posix()}
        mark('reduced-motion-checkbox-and-movement')
        # Actual preference input suppresses gait while ordinary movement still advances.
        tap(page, '.expedition-options > summary', phone)
        tap(page, '#reduce-motion', phone)
        assert page.locator('#reduce-motion').is_checked() and snap(page)['state']['reducedMotion']
        tap(page, '.expedition-options > summary', phone)
        reduced_samples = report['cases'][name]['reduced_motion_samples'] = []
        held(page, 'w', 1, phone, context, reduced_samples)
        check_motion(reduced_samples, reduced=True)
        assert math.hypot(reduced_samples[-1]['position']['x'] - reduced_samples[0]['position']['x'],
                          reduced_samples[-1]['position']['z'] - reduced_samples[0]['position']['z']) > .5
        assert json.loads(manual_save(page, phone))['reducedMotion'] is True
        load_menu(page, mark)
        tap(page, '#continue', phone)
        ready(page, 'world')
        assert snap(page)['state']['reducedMotion'] and page.locator('#reduce-motion').is_checked()
        tap(page, '.expedition-options > summary', phone)
        tap(page, '#reduce-motion', phone)
        tap(page, '.expedition-options > summary', phone)
        assert json.loads(manual_save(page, phone))['reducedMotion'] is False
        report['cases'][name]['reduced_motion_saved_reload'] = True
        mark('reduced-preference-save-reload-passed')
        tap(page, '#pause', phone)
        assert snap(page)['paused']
        tap(page, '#pause', phone)
        assert not snap(page)['paused']
        mark('northern-clearing-route')
        tap(page, '#navigate-objective', phone)
        page.wait_for_function('''() => {const p=foldwildSnapshot.state.position;
          const distance=Math.hypot(p.x-22,p.z+26);
          return distance>=1.2-1e-7 && distance<=1.4
            && /At Northern Clearing/.test(document.querySelector('#objective-detail').textContent)
            && document.querySelector('#navigate-objective').textContent.trim()==='Preview trial'
            && !document.querySelector('#navigate-objective').disabled}''', timeout=45000)
        report['cases'][name]['maren_separation'] = separation(page, 'rival')
        mark('arrival-with-preview-action')
        shot(page, name + '-arrival')
        assert 'Preview trial' in page.locator('#navigate-objective').inner_text()
        tap(page, '#navigate-objective', phone)
        assert 'Maren' in page.locator('#dialogue-title').inner_text()
        shot(page, name + '-maren-preview')
        tap(page, '#dialogue-cancel', phone)
        assert not snap(page)['state']['defeatedRivals'], 'preview must not credit a trial'
        mark('maren-preview-back-passed')
        mark('offered-wild-marker-route')
        # Choose the existing nearby habitat offered at the clearing, not a long return march.
        tap(page, '.nearby-markers > summary', phone)
        assert page.locator('[data-point="wild-1"]').is_visible()
        report['cases'][name]['chosen_wild'] = page.locator('[data-point="wild-1"]').inner_text()
        tap(page, '[data-point="wild-1"]', phone)
        report['cases'][name]['wild_route_target'] = wait_for_wild(page, 'wild-1')
        report['cases'][name]['wild_separation'] = separation(page, 'wild-1')
        tap(page, '.nearby-markers > summary', phone)
        tap(page, '#interact', phone)
        tap(page, '#dialogue-start', phone)
        ready(page, 'battle')
        mark('battle-models-ready-real-ability')
        shot(page, name + '-wild-battle')
        turn = snap(page)['battle']['round']
        tap(page, '#ability-0', phone)
        page.wait_for_function('r=>!foldwildSnapshot.busy && foldwildSnapshot.battle.round>r', arg=turn)
        mark('manual-pending-save')
        raw = manual_save(page, phone)
        pending = snap(page)['battle']
        expected = page.evaluate('''async () => {const {applyAction}=await import('./battle.js');
          return applyAction(foldwildSnapshot.battle,{type:'wait'})}''')
        load_menu(page, mark)
        tap(page, '#continue', phone)
        ready(page, 'battle')
        assert snap(page)['battle'] == pending
        assert page.evaluate('localStorage.getItem("foldwild-save-v1")') == raw
        tap(page, '#wait', phone)
        page.wait_for_function('!foldwildSnapshot.busy')
        assert snap(page)['battle'] == expected, 'pending next-action/RNG replay mismatch'
        mark('exact-replay-passed-flee')
        tap(page, '#flee', phone)
        page.wait_for_function('foldwildSnapshot.phase==="result" && !foldwildSnapshot.busy')
        tap(page, '#result-continue', phone)
        ready(page, 'world')
        objective = page.evaluate('''() => {
          const panel=document.querySelector('.trail-controls'), heading=document.querySelector('#objective-title');
          const p=panel.getBoundingClientRect(),h=heading.getBoundingClientRect(),t=document.querySelector('.toolbar').getBoundingClientRect();
          return {panel:p.toJSON(),heading:h.toJSON(),toolbar:t.toJSON(),scrollTop:panel.scrollTop,
            visible:h.width>0 && h.height>0 && h.top>=Math.max(p.top,t.bottom)-1
              && h.bottom<=Math.min(p.bottom,innerHeight)+1 && h.left>=p.left-1 && h.right<=p.right+1};}''')
        report['cases'][name]['objective_after_battle_before_save'] = objective
        assert objective['visible'], objective
        manual_save(page, phone)
        report['cases'][name]['native_battle_save_resume'] = True

    stderr_stream, saved_stderr = None, None
    try:
        stderr_stream = (output / 'stderr.pending').open('w+')
        saved_stderr = os.dup(2)
        sys.stderr.flush()
        os.dup2(stderr_stream.fileno(), 2)
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle',
                      '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            try:
                primary = None
                for width in (1280, 390):
                    budget()
                    name = f'current-{width}'
                    phone = width == 390
                    report['cases'][name] = {'status': 'started'}
                    pending.clear()
                    context = browser.new_context(viewport={'width': width, 'height': 844 if phone else 800},
                        has_touch=phone, color_scheme='light', reduced_motion='no-preference')
                    def route(request_route):
                        request = request_route.request
                        parsed = urlsplit(request.url)
                        if parsed.netloc != urlsplit(origin).netloc:
                            report['errors'].append({'case': name, 'type': 'external', 'url': request.url})
                            request_route.abort()
                        else:
                            request_route.continue_()
                    context.route('**/*', route)
                    page = context.new_page()
                    page.set_default_timeout(10000)
                    def request_started(req):
                        record = {'case': name, 'url': req.url, 'resource': req.resource_type,
                                  'started': monotonic() - started}
                        pending[id(req)] = record
                        report['requests'].append(record)
                    def request_done(req):
                        record = pending.pop(id(req), None)
                        if record is not None:
                            record['finished'] = monotonic() - started
                            record['failure'] = req.failure
                    page.on('request', request_started)
                    page.on('requestfinished', request_done)
                    page.on('requestfailed', request_done)
                    page.on('domcontentloaded', lambda: mark('dom-content-loaded-event'))
                    page.on('load', lambda: mark('load-event'))
                    page.on('crash', lambda: mark('page-crash'))
                    page.on('pageerror', lambda error: report['errors'].append({'case': name, 'type': 'page', 'error': str(error)}))
                    page.on('console', lambda msg: report['errors'].append({'case': name, 'type': 'console', 'error': msg.text}) if msg.type == 'error' else None)
                    page.on('requestfailed', lambda req: report['errors'].append({'case': name, 'type': 'request', 'url': req.url, 'error': req.failure}))
                    page.on('response', lambda res: report['errors'].append({'case': name, 'type': 'http', 'status': res.status, 'url': res.url}) if res.status >= 400 else None)
                    def dom_diagnostics():
                        session = context.new_cdp_session(page)
                        try:
                            report['cases'][name]['failure_dom'] = session.send('Runtime.evaluate', {
                                'expression': '''JSON.stringify({ready:document.readyState,
                                  fonts:document.fonts.status,phase:window.foldwildSnapshot?.phase,
                                  view:window.foldwildSnapshot?.view,active:document.activeElement?.id,
                                  dialog:document.querySelector('#collection-dialog')?.open,
                                  closeRect:document.querySelector('#collection-close')?.getBoundingClientRect().toJSON(),
                                  canvasParent:document.querySelector('canvas')?.parentElement.className})''',
                                'returnByValue': True, 'timeout': 1000})
                        finally:
                            session.detach()
                    try:
                        load_menu(page, mark, origin + '/Games/Foldwild/index.html')
                        page.locator('#seed-input').fill('42')
                        mark('starter-input')
                        tap(page, '#start', phone)
                        ready(page, 'world')
                        mark('world-models-ready')
                        play(page, phone, context, name)
                        page.emulate_media(color_scheme='dark')
                        page.locator('#objective-title').evaluate("e => e.scrollIntoView({block:'center'})")
                        report['cases'][name]['dark_geometry'] = geometry(page)
                        shot(page, name + '-dark-ui')
                        report['cases'][name]['functional_passed'] = True
                        report['cases'][name]['status'] = 'failed' if report['cases'][name].get('evidence_failures') else 'passed'
                        mark('case-complete')
                    except Exception as error:
                        primary = primary or error
                        report['cases'][name]['status'] = 'failed'
                        mark('case-failed')
                        probes = [('dom', dom_diagnostics)]
                        attempts = report.get('capture_attempts', [])
                        if attempts and Path(attempts[-1]['file']).name.startswith(name + '-') and not attempts[-1]['accepted']:
                            report['cases'][name]['failure_capture_skipped'] = 'viewport attempt already failed; no retry'
                        else:
                            probes.append(('failure-capture', lambda: shot(page, name + '-failure')))
                        failure(report, name, error, probes)
                    finally:
                        diagnose(report, name, 'context-close', context.close)
                if primary is not None:
                    raise primary
                assert not report['errors'], report['errors']
                assert not report['failures'], report['failures']
                assert hashes(text_sources()) == report['source_hashes'], 'integrated source changed; acceptance invalid'
                assert asset_hashes() == assets, 'assets changed; frozen evidence invalid'
                report['passed'] = True
            except Exception as error:
                if not report['failures']:
                    failure(report, 'batch', error)
                if primary is not None:
                    raise primary
                raise
            finally:
                report['browser_stopped'] = diagnose(report, 'batch', 'browser-close', lambda: (browser.close(), True)[1]) is True
    finally:
        def finish_stderr():
            if saved_stderr is not None:
                sys.stderr.flush()
                os.dup2(saved_stderr, 2)
                os.close(saved_stderr)
            if stderr_stream is not None:
                stderr_stream.flush()
                stderr_stream.seek(0)
                text, markers = audit_stderr(stderr_stream.read())
                stderr_stream.seek(0)
                stderr_stream.truncate()
                stderr_stream.write(text)
                stderr_stream.flush()
                stderr_stream.close()
                (output / 'stderr.pending').replace(output / 'stderr.txt')
                report['stderr_audit'] = {'file': 'stderr.txt', 'bytes': len(text.encode()),
                                         'error_markers': markers, 'clean': not markers}
                if text:
                    sys.stderr.write(text)
        diagnose(report, 'batch', 'stderr-finalize', finish_stderr)
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
        report['server_stopped'] = not thread.is_alive()
        report['source_hashes_after'] = hashes(text_sources())
        report['asset_hashes_after'] = asset_hashes()
        report['sources_frozen'] = report['source_hashes'] == report['source_hashes_after']
        report['assets_frozen'] = report['asset_hashes'] == report['asset_hashes_after']
        report['pending_requests_at_end'] = list(pending.values())
        report['disk_after_bytes'] = shutil.disk_usage(ROOT).free
        report['passed'] = clean_postflight(report)
        save_report((output / 'native-results.json').relative_to(OUT), report)
    assert report['passed'], 'cleanup/diagnostic failure; see native-results.json'
    print('PASS: current desktop/touch, both OS schemes; no campaign/device acceptance')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--go', action='store_true', help='ONLY use after explicit orchestrator frozen-source/browser GO')
    args = parser.parse_args()
    native_batch() if args.go else phase_a()
