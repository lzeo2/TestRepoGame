"""Native/API hero QA; released slots only, not release acceptance."""
import argparse
import base64
from datetime import datetime, timezone
import functools
import hashlib
import http.server
import io
import json
import math
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import threading
import time
from urllib.parse import urlsplit
import uuid

from qa_roster import HERO_IDS, KITS, MODEL_IDS, runtime_hashes

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/maintenance/audits/jankolock-3d-qa/native-supplied-20261024'
HEROES = ('ribbon-seraph', 'spoollash', 'checkmate-regent', 'prism-warden')
FLOOR = 2178940928
MAX_BYTES = 12000000
WORK_SECONDS = 140
TOTAL_SECONDS = 165

def parse_args(argv=None):
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument('--hero', required=True, choices=HEROES)
  return parser.parse_args(argv)

def guard():
  available = int(subprocess.check_output(
    ['df', '-B1', '/', '--output=avail'], text=True, timeout=3).splitlines()[-1])
  if available < FLOOR:
    raise RuntimeError(f'Disk guard: {available} < {FLOOR}; stop growth')
  return available

def active_browsers(output):
  rows = [line.split(None, 3) for line in output.splitlines()]
  return [r for r in rows if len(r) == 4 and not r[1].startswith('Z') and
    (r[2] in {'chrome', 'chromium', 'chrome-headless-shell'} or
    (r[2] == 'node' and r[3].endswith(' run-driver')))]

def local_url(url, origin):
  return url.startswith((origin + '/', 'data:', 'blob:' + origin + '/'))

def safe_error(error, limit=1500):
  text = str(error).replace(str(ROOT), '<repo>')
  text = re.sub(r'/(?:home|tmp|dev/shm)/[^\s\'\"\)]+', '<host-path>', text)
  return text[:limit]

def write_blob(path, data):
  guard()
  used = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
  replaced = path.stat().st_size if path.exists() else 0
  if used - replaced + len(data) > MAX_BYTES:
    raise RuntimeError('Evidence exceeds 12MB; retain failures')
  path.write_bytes(data)

def check_model(snapshot, hero):
  models = {m['id']: m for m in snapshot['models']}
  assert len(snapshot['models']) == len(models) == 10 and set(models) == MODEL_IDS
  receipt = json.loads((ROOT / 'Games/Jankolock3D/models' / hero / 'receipt.json').read_text())
  for key in ('sha256', 'bytes', 'triangles'):
    assert models[hero][key] == receipt[key], f'Selected model {key} mismatch'
  assert snapshot['runtime']['hero'] == hero
  assert snapshot['diagnostics']['triangles'] > 0
  return models[hero]

def bot_contact(before, after, invulnerable):
  old = {b['id']:b['runtime'] for b in before['bots']}
  assert any(b['targetId']==after['hero']['id'] and
    b['runtime']['shots']+sum(b['runtime']['casts'].values()) > old[b['id']]['shots']+sum(old[b['id']]['casts'].values())
    for b in after['bots']), 'No new player-targeted bot attack'
  delta = after['hero']['hp']-before['hero']['hp']
  assert delta==0 if invulnerable else delta<0, 'Unexpected contact HP'
  return True

def require_evidence(report):
  checks = report['checks']
  assert report['screenshots'] and len(report['screenshots']) == 3
  assert {s['kind'] for s in report['screenshots']} == {'normal-lobby', 'model-preview', 'native-gameplay'}
  assert checks['movementMetres'] > .1
  assert checks['weapon']['after']['shots'] > checks['weapon']['before']['shots']
  assert checks['reload']['started'] > 0 and checks['reload']['completed']
  assert checks['melee']['fxAfter'] > checks['melee']['fxBefore']
  assert sorted(a['slot'] for a in checks['abilities']) == [1, 2, 3, 4]
  for action in checks['abilities']:
    assert action['castsAfter'] == action['castsBefore'] + 1
    assert action['cooldownAfter'] > 0 and action['fxAfter'] > 0
  if report['hero'] in ('ribbon-seraph', 'spoollash'):
    lifecycle = checks['tether']
    before, linked, broken = (lifecycle[k] for k in ('before', 'linked', 'broken'))
    assert before['alive'] and before['team'] != lifecycle['sourceTeam']
    assert linked['tether']['targetId'] == lifecycle['targetId'] == before['id']
    assert linked['tether']['left'] > 0
    assert linked['hp'] < before['hp'] and 0 < linked['moveSpeed'] < before['moveSpeed']
    assert broken['tether'] is None and broken['hp'] == linked['hp']
    assert math.isclose(broken['moveSpeed'], before['moveSpeed'], abs_tol=1e-8)
    assert broken['time'] == linked['time'] and lifecycle['breakDistance'] > lifecycle['range']
    gameplay = next(s for s in report['screenshots'] if s['kind'] == 'native-gameplay')
    assert gameplay['runtime']['tether']['targetId'] == lifecycle['targetId']
    assert sum(a['slot'] == 1 and a['id'] == 'tether' for a in checks['abilities']) == 1
  else:
    hit = checks['targetHit']
    assert hit['before']['alive'] and hit['after']['hp'] < hit['before']['hp']
    assert hit['before']['id'] == hit['after']['id'] == hit['targetId']
  assert checks['botCombatObserved'], 'No bot combat'
  assert report['responses'] and all(r['status'] == 200 for r in report['responses'])
  assert not report['errors'], 'Browser/load errors'
  assert report['stderrAudit']['clean'], 'Nonempty stderr'
  assert report['sourcesUnchanged'], 'Frozen source changed'
  assert report['cleanup']['browserClosed'] and report['cleanup']['serverClosed']

ACTIONABILITY = '''el => {
  const r=el.getBoundingClientRect(), bounds=[r.x,r.y,r.width,r.height];
  let visible=el.isConnected, enabled=!el.matches(':disabled') && !el.closest('[inert],[aria-disabled="true"]');
  for(let n=el;n;n=n.parentElement){const s=getComputedStyle(n);
  visible=visible && s.display!=='none' && s.visibility==='visible' && Number(s.opacity)>0;
  }
  let left=0,top=0,right=innerWidth,bottom=innerHeight,scroll=null,owner=null;
  for(let n=el.parentElement;n;n=n.parentElement){
  const s=getComputedStyle(n),a=n.getBoundingClientRect();
  if(/auto|scroll|hidden|clip/.test(s.overflowY+s.overflowX)){
  left=Math.max(left,a.left+n.clientLeft);top=Math.max(top,a.top+n.clientTop);
  right=Math.min(right,a.left+n.clientLeft+n.clientWidth);bottom=Math.min(bottom,a.top+n.clientTop+n.clientHeight);
  }
  if(!owner && /auto|scroll/.test(s.overflowY) && n.scrollHeight>n.clientHeight)owner=n;
  }
  if(owner){
  const h=document.elementFromPoint((left+right)/2,(top+bottom)/2);
  scroll={bounds:[left,top,right,bottom],top:owner.scrollTop,safe:!!h&&(h===owner||owner.contains(h)),
  dy:Math.max(-360,Math.min(360,r.bottom>bottom?r.bottom-bottom+8:r.top<top?r.top-top-8:0))};
  }
  const x=r.x+r.width/2,y=r.y+r.height/2, hit=document.elementFromPoint(x,y);
  return {bounds, visible, enabled, scroll, inViewport:r.width>0 && r.height>0 && r.x>=left && r.y>=top &&
  r.right<=right && r.bottom<=bottom, hit:!!hit && (hit===el || el.contains(hit))};
}'''

def actionable(sample):
  return (all(sample[k] for k in ('visible', 'enabled', 'inViewport', 'hit')) and
    len(sample['bounds']) == 4 and all(math.isfinite(n) for n in sample['bounds']) and
    sample['bounds'][2] > 0 and sample['bounds'][3] > 0)

def native_click(page, locator, timeout=10000):
  deadline, previous, sampled_at = time.monotonic() + timeout / 1000, None, 0
  wheeled, wheels = None, 0
  while time.monotonic() < deadline:
    sample = locator.evaluate(ACTIONABILITY, timeout=max(1, (deadline-time.monotonic())*1000))
    now = time.monotonic()
    if now >= deadline:
      break
    if actionable(sample) and previous == sample['bounds'] and now-sampled_at >= .05:
      page.mouse.click(sample['bounds'][0]+sample['bounds'][2]/2,
        sample['bounds'][1]+sample['bounds'][3]/2)
      return sample
    scroll = sample.get('scroll')
    if sample['visible'] and sample['enabled'] and not sample['inViewport'] and scroll:
      b = scroll['bounds']
      if not scroll['safe'] or b[2]<=b[0] or b[3]<=b[1] or not scroll['dy']:
        raise RuntimeError('Unsafe native scroll')
      progress = (sample['bounds'], scroll['top'])
      if progress != wheeled:
        if wheels>=8:
          raise RuntimeError('Native wheel bound')
        page.mouse.move((b[0]+b[2])/2, (b[1]+b[3])/2)
        page.mouse.wheel(0, scroll['dy'])
        wheeled, wheels = progress, wheels+1
    previous = sample['bounds'] if actionable(sample) else None
    sampled_at = now
    remaining = deadline-time.monotonic()
    if remaining > 0:
      page.wait_for_timeout(min(50, remaining*1000))
  raise TimeoutError('Native button actionability deadline (10s)')

def audit_stderr(text):
  markers = re.findall(r'(?im)^.*(?:Unhandled|TargetClosed|Error occurred in event listener|Traceback|Exception in callback|Error:).*$', text)
  return {'clean': text == '', 'bytes': len(text.encode()),
    'markers': [safe_error(m) for m in markers], 'text': safe_error(text, 65537)}

def capture_viewport(page, context, info, selector='#theme'):
  began, wall = time.monotonic(), time.time()
  old_handler = signal.getsignal(signal.SIGALRM)
  old_timer = signal.getitimer(signal.ITIMER_REAL)
  budget = min(12, old_timer[0]) if old_timer[0] else 12
  deadline = began + budget
  session = frame = primary = callback_error = None
  active, inflight = True, 0
  hovers, painted = [], -1
  viewport = dict(page.viewport_size)
  info.update(method='CDP Page.startScreencast', format='jpeg', quality=92,
    viewport=viewport, budgetSeconds=budget, requestedAt=wall,
    accepted=False, frameCount=0, frames=[], inflightAcks=0,
    callbackErrors=[], cleanupErrors=[],
    paintRequested=False, paintRequest='native header hover', hoverSelector=selector, hoverRequests=hovers)

  def expired(*_):
    raise TimeoutError('CDP capture exceeded absolute 12s/shared work deadline')

  def timed(action, cleanup=False):
    remaining = deadline-time.monotonic()-(0 if cleanup else min(1, budget/4))
    if remaining <= 0:
      expired()
    signal.setitimer(signal.ITIMER_REAL, remaining)
    return action()

  def received(event):
    nonlocal frame, inflight, callback_error
    if not active:
      info['inactiveEvents'] = info.get('inactiveEvents', 0)+1
      return
    info['frameCount'] += 1
    sequence = info['frameCount']
    inflight += 1
    info['inflightAcks'] = inflight
    try:
      metadata = event.get('metadata', {})
      info['frames'].append({'index': sequence, 'metadata': metadata})
      if sequence > 1 and frame is None:
        assert metadata['timestamp'] >= wall, 'Stale compositor timestamp'
        assert metadata['deviceWidth'] == viewport['width'] and metadata['deviceHeight'] == viewport['height']
        assert metadata['pageScaleFactor'] == 1, 'Scaled viewport capture'
        frame = event
        info.update(chosenFrame=sequence, metadata=metadata)
    except Exception as error:
      info['callbackErrors'].append(safe_error(error))
      callback_error = callback_error or error
    finally:
      try:
        timed(lambda: session.send('Page.screencastFrameAck', {'sessionId': event['sessionId']}))
      except Exception as error:
        info['callbackErrors'].append(safe_error(error))
        callback_error = callback_error or error
      finally:
        inflight -= 1
        info['inflightAcks'] = inflight

  signal.signal(signal.SIGALRM, expired)
  try:
    session = timed(lambda: context.new_cdp_session(page))
    session.on('Page.screencastFrame', received)
    timed(lambda: session.send('Page.startScreencast', {'format': 'jpeg', 'quality': 92,
      'maxWidth': viewport['width'], 'maxHeight': viewport['height'], 'everyNthFrame': 1}))
    while frame is None:
      if callback_error:
        raise callback_error
      if len(hovers)<2 and (not hovers or info['frameCount']>painted):
        painted = info['frameCount']
        if hovers: selector = '#help-open' if selector=='#theme' else '#theme'
        hovers.append(selector)
        info['paintRequested'] = True
        sample = timed(lambda: page.locator(selector).evaluate(
          f'el => ({{...({ACTIONABILITY})(el), unlocked:document.pointerLockElement===null, hovered:el.matches(":hover")}})'))
        assert sample['unlocked'] and not sample['hovered'] and actionable(sample), 'Unsafe native capture hover'
        info['hoverBounds'] = sample['bounds']
        x,y,w,h = sample['bounds']
        timed(lambda: page.mouse.move(x+w/2,y+h/2))
      timed(lambda: page.wait_for_timeout(min(50, max(1, (deadline-time.monotonic())*1000))))
    if callback_error:
      raise callback_error
    pixels = base64.b64decode(frame['data'], validate=True)
    assert pixels, 'Empty compositor frame'
  except Exception as error:
    primary = error
  finally:
    active = False
    if session is not None:
      def drain():
        while inflight:
          timed(lambda: page.wait_for_timeout(10), cleanup=True)
      for label, action in [('remove-listener', lambda: session.remove_listener('Page.screencastFrame', received)),
        ('drain-acks', drain), ('stop', lambda: session.send('Page.stopScreencast')),
        ('detach', session.detach)]:
        try:
          timed(action, cleanup=True)
        except Exception as error:
          info['cleanupErrors'].append({'operation': label, 'error': safe_error(error)})
    info['elapsedSeconds'] = time.monotonic()-began
    signal.setitimer(signal.ITIMER_REAL, 0)
    signal.signal(signal.SIGALRM, old_handler)
    if old_timer[0]:
      signal.setitimer(signal.ITIMER_REAL, max(.001, old_timer[0]-info['elapsedSeconds']), old_timer[1])
  primary = primary or callback_error
  if primary:
    info['primaryError'] = safe_error(primary)
    raise primary
  if info['cleanupErrors']:
    raise RuntimeError('CDP cleanup failed: ' + str(info['cleanupErrors']))
  if info['elapsedSeconds'] > budget:
    expired()
  assert page.viewport_size == viewport
  info['accepted'] = True
  return pixels

class Handler(http.server.SimpleHTTPRequestHandler):
  def log_message(self, *_):
    pass

def probe_startup(page, report, deadline):
  began = time.monotonic()
  timer, handler = signal.getitimer(signal.ITIMER_REAL), signal.getsignal(signal.SIGALRM)
  budget = min(3, deadline-began)
  def expired(*_):
    raise TimeoutError('Startup diagnostic deadline')
  try:
    if budget<=0: expired()
    signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, budget)
    report['startupDiagnostic'] = page.evaluate('''() => {
  const output=document.getElementById('loading-status'), start=document.getElementById('start');
  const type=typeof window.jank3dSnapshot;let snapshot=null,error=null;
  try{if(type==='function')snapshot=window.jank3dSnapshot();}catch(e){error=String(e);}
  const parts={snapshot:type==='function',models:snapshot?.models?.length===10,
  triangles:snapshot?.diagnostics?.triangles>0,start:!!start&&!start.disabled};
  return {readyState:document.readyState,visibility:document.visibilityState,hasFocus:document.hasFocus(),
  loading:output?.textContent,stage:output?.dataset.stage,snapshotType:type,snapshot,snapshotError:error,
  cards:document.querySelectorAll('[data-hero]').length,startDisabled:start?.disabled,parts,
  falseParts:Object.keys(parts).filter(k=>!parts[k]),
  resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('portrait_relief.glb'))
  .map(r=>({name:new URL(r.name).pathname,responseEnd:r.responseEnd,bytes:r.encodedBodySize}))};
  }''')
  except Exception as error:
    report['diagnosticTimeout' if isinstance(error,TimeoutError) else 'diagnosticError'] = safe_error(error)
  finally:
    signal.setitimer(signal.ITIMER_REAL, 0)
    signal.signal(signal.SIGALRM, handler)
    if timer[0]: signal.setitimer(signal.ITIMER_REAL,max(.001,timer[0]-(time.monotonic()-began)),timer[1])
  from collections import Counter
  pending = Counter(report['requestStarted'])-Counter(report['requestFinished'])
  report['requestCompletion'] = {'started':len(report['requestStarted']), 'headers':len(report['responses']),
    'finished':len(report['requestFinished']), 'lastUnfinished':list(pending.elements())[-10:],
    'portrait':{k:sum('portrait_relief.glb' in (p['path'] if isinstance(p,dict) else p) for p in report[k])
    for k in ('responses','requestFinished')}}

def worker(hero, attempt):
  guard()
  os.environ['TMPDIR'] = '/dev/shm'
  tempfile.tempdir = '/dev/shm'
  from PIL import Image, ImageStat
  from playwright.sync_api import sync_playwright

  report_path = OUT / f'{attempt}.json'
  report = {'hero': hero, 'attempt': attempt, 'status': 'FAIL', 'kind': 'Native hero builder QA; software WebGL, not hardware/release acceptance',
    'setupPolicy': 'Normal lobby first; loopback API placement/aim/clock/camera, NOT native progression. No state grants/direct casts; normal bots.',
    'limits': {'workSeconds': WORK_SECONDS, 'supervisorSeconds': TOTAL_SECONDS, 'combinedEvidenceBytes': MAX_BYTES},
    'screenshots': [], 'responses': [], 'errors': [], 'checks': {}, 'steps': [],
    'requestStarted': [], 'requestFinished': [],
    'sourceHashes': runtime_hashes(ROOT), 'cleanup': {'browserClosed': False, 'serverClosed': False},
    'unexercised': ['Full matches, balance, hardware, touch, exhaustive combat.']}
  checks = report['checks']
  server = thread = browser = page = None
  stderr_stream = tempfile.TemporaryFile(mode='w+', dir='/dev/shm')
  sys.stderr.flush()
  saved_stderr = os.dup(2)
  os.dup2(stderr_stream.fileno(), 2)
  started = time.monotonic()

  def step(label):
    print(f'{hero}: {label}', flush=True)
    report['steps'].append({'step': label, 'elapsed': round(time.monotonic() - started, 2)})

  def save():
    write_blob(report_path, (json.dumps(report, indent=2) + '\n').encode())

  def expired(*_):
    raise TimeoutError(f'Bounded {WORK_SECONDS}s work deadline')

  def record_error(value):
    if len(report['errors']) >= 100:
      raise RuntimeError('Browser error cap exceeded')
    report['errors'].append(safe_error(value))

  signal.signal(signal.SIGALRM, expired)
  signal.signal(signal.SIGTERM, expired)
  signal.setitimer(signal.ITIMER_REAL, WORK_SECONDS)
  try:
    step('disk/process/freeze preflight')
    report['storageBefore'] = guard()
    busy = active_browsers(subprocess.check_output(
      ['ps', '-eo', 'pid=,stat=,comm=,args='], text=True, timeout=3))
    assert not busy, f'QA slot busy: {len(busy)} browsers/drivers'
    assert report['sourceHashes'] == runtime_hashes(ROOT), 'Source not frozen at preflight'
    save()
    step('owned loopback server')
    guard()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    server.daemon_threads = True
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as pw:
      try:
        step('system Chromium, shm profile')
        guard()
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, timeout=15000,
          args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = browser.new_context(viewport={'width': 1280, 'height': 720}, device_scale_factor=1,
          reduced_motion='reduce', color_scheme='light', service_workers='block')
        def route_request(route):
          if local_url(route.request.url, origin):
            route.continue_()
          else:
            record_error('Blocked nonlocal load: ' + urlsplit(route.request.url).path)
            route.abort()
        context.route('**/*', route_request)
        page = context.new_page()
        page.set_default_timeout(10000)
        page.set_default_navigation_timeout(25000)
        page.on('pageerror', record_error)
        page.on('console', lambda m: record_error(m.text) if m.type == 'error' else None)
        page.on('requestfailed', lambda r: record_error(urlsplit(r.url).path + ': ' + str(r.failure)))
        page.on('request', lambda r: report['requestStarted'].append(urlsplit(r.url).path))
        page.on('requestfinished', lambda r: report['requestFinished'].append(urlsplit(r.url).path))
        def response_seen(response):
          if len(report['responses']) >= 400:
            raise RuntimeError('Response cap exceeded')
          report['responses'].append({'path': urlsplit(response.url).path, 'status': response.status})
        page.on('response', response_seen)
        state = lambda: page.evaluate('window.jank3dSnapshot()')

        def load(query):
          step('commit/model readiness: ' + (query or 'normal lobby'))
          response = page.goto(origin + '/Games/Jankolock3D/index.html' + query, wait_until='commit')
          assert response.status == 200
          page.wait_for_function('''() => typeof window.jank3dSnapshot === 'function' &&
  window.jank3dSnapshot().models.length === 10 &&
  window.jank3dSnapshot().diagnostics.triangles > 0 &&
  !document.getElementById('start').disabled''', timeout=30000, polling=50)
          assert set(page.locator('[data-hero]').evaluate_all('(xs)=>xs.map(x=>x.dataset.hero)')) == set(HERO_IDS)
          assert page.locator('[data-hero]').count() == 8
          step('maps/fonts readiness')
          maps = ['/' + p.relative_to(ROOT).as_posix() for p in
            sorted((ROOT / 'Games/Jankolock3D/textures/environment').glob('*.png'))]
          assert len(maps) == 11, 'Pinned environment-map roster'
          page.wait_for_function('''paths => document.fonts.status === 'loaded' && paths.every(path =>
  performance.getEntriesByType('resource').some(r => new URL(r.name).pathname === path && r.responseEnd > 0))''',
            arg=maps, timeout=10000, polling=50)
          assert not page.locator('img').evaluate_all('(xs)=>xs.some(x=>!x.complete||x.naturalWidth===0)')
          step('native hero-card click: ' + hero)
          frame = state()['diagnostics']['frames']
          native_click(page, page.locator(f'[data-hero="{hero}"]'))
          page.wait_for_function('(hero)=>window.jank3dSnapshot().runtime.hero===hero', arg=hero, polling=50)
          assert page.locator(f'[data-hero="{hero}"]').get_attribute('aria-pressed') == 'true'
          check_model(state(), hero)
          page.wait_for_function('(n)=>window.jank3dSnapshot().diagnostics.frames>n', arg=frame, polling=50)
          checks['selectedRender'] = {'before': frame, 'after': state()['diagnostics']['frames'],
            'hero': hero, 'observedAt': time.time()}

        def capture(kind):
          step('capture genuine JPEG: ' + kind)
          if kind=='native-gameplay': setup('window.jank3dQA.sync()')
          snapshot = state()
          if snapshot['playing']:
            assert snapshot['paused'], 'Capture not frozen'
          guard()
          info = {}
          report.setdefault('captures', []).append(info)
          raw = capture_viewport(page, context, info, '#theme' if len(report['captures'])%2 else '#help-open')
          after_capture = state()
          assert after_capture['runtime'] == snapshot['runtime'], 'Capture changed runtime'
          assert after_capture['time'] == snapshot['time'] and after_capture['playing'] == snapshot['playing']
          assert page.evaluate('({width:innerWidth,height:innerHeight})') == {'width': 1280, 'height': 720}
          assert info['metadata']['timestamp'] >= checks['selectedRender']['observedAt']
          if snapshot['playing']:
            assert after_capture['paused']
            assert after_capture['diagnostics']['frames'] == snapshot['diagnostics']['frames'], 'Frozen capture redrew'
          decoded = Image.open(io.BytesIO(raw))
          assert decoded.format in ('JPEG', 'PNG'), 'Not genuine image pixels'
          image = decoded.convert('RGB')
          assert image.size == (1280, 720)
          variance = sum(ImageStat.Stat(image).var) / 3
          scene_variance = sum(ImageStat.Stat(image.crop((0, 120, 760, 600))).var) / 3
          assert variance > 100 and scene_variance > 100, 'Blank viewport/scene'
          assert len(raw) <= 850000, 'Per-capture evidence bound'
          path = OUT / f'{attempt}-{kind}.jpg'
          assert not path.exists(), 'Never overwrite a capture'
          write_blob(path, raw)
          report['screenshots'].append({'path': path.relative_to(ROOT).as_posix(), 'kind': kind,
            'sha256': hashlib.sha256(raw).hexdigest(), 'bytes': len(raw), 'variance': variance,
            'sceneVariance': scene_variance, 'selectedModel': check_model(state(), hero),
            'runtime': snapshot['runtime'], 'context': checks.get('gameplayCapture') if kind == 'native-gameplay' else kind})
          save()

        def setup(script, arg=None):
          step('labeled API setup: ' + script)
          return page.evaluate(script, arg)

        def advance(seconds):
          setup('(s)=>{window.jank3dQA.freeze(false); window.jank3dQA.advance(s); window.jank3dQA.freeze(true);}', seconds)

        def native_key(code):
          step('native key: ' + code)
          page.evaluate('window.jank3dQA.freeze(false)')
          page.keyboard.press(code)
          assert state()['paused'], 'Native handler not frozen'
          return state()['runtime']

        def cast_ability(ability):
          before = state()['runtime']
          after = native_key('Digit' + str(ability['slot']))
          observation = {'slot': ability['slot'], 'id': ability['id'], 'name': ability['name'],
            'castsBefore': before['casts'].get(ability['id'], 0), 'castsAfter': after['casts'].get(ability['id'], 0),
            'cooldownBefore': before['cooldowns'].get(str(ability['slot']), 0),
            'cooldownAfter': after['cooldowns'][str(ability['slot'])], 'fxBefore': before['fx'],
            'fxAfter': after['fx'], 'buffs': after['buffs'], 'projectiles': after['projectiles'], 'deployments': after['deployments']}
          checks['abilities'].append(observation)
          assert observation['castsAfter'] == observation['castsBefore'] + 1
          assert observation['cooldownAfter'] > 0 and observation['fxAfter'] > 0
          save()
          return after

        def aim_live_bot():
          snapshot = state()
          enemies = {b['id']: b for b in snapshot['bots'] if b['alive'] and b['team'] != snapshot['hero']['team']}
          assert enemies, 'No live enemy bot'
          target = next(iter(enemies.values()))
          p = target['position']
          assert abs(p['y']) < .1, 'Target not on base-ground'
          placement = {'x': p['x'] - 7, 'y': p['y'], 'z': p['z']}
          checks.setdefault('combatSetup', []).append({'requestedTargetId': target['id'],
            'enemyBotsBefore': list(enemies.values()), 'placement': placement, 'distance': 7,
            'kind': 'API base-ground placement/body aim; not native travel/aim'})
          setup('(p)=>window.jank3dQA.place(p,-Math.PI/2,0)', placement)
          setup('(id)=>window.jank3dQA.aimAt(id)', target['id'])
          return enemies

        load('')
        assert state()['fixture'] is None and not state()['playing']
        checks['normalLobby'] = {'models': 10, 'cards': 8, 'noFixture': True}
        capture('normal-lobby')
        load('?qa=abilities')
        page.wait_for_function('typeof window.jank3dQA === "object"', polling=50)
        step('native start/shop close')
        native_click(page, page.get_by_role('button', name='Start match', exact=True))
        page.wait_for_function('window.jank3dSnapshot().playing && window.jank3dSnapshot().bots.length===5', polling=50)
        if page.locator('.sys-shop').is_visible():
          native_click(page, page.locator('[data-close]'))
        page.locator('#game').focus()
        setup('window.jank3dQA.waves(); window.jank3dQA.place({x:0,y:0,z:-200},Math.PI,-.04)')
        assert all(b['mode'] != 'passive' for b in state()['bots']), 'Normal bots required'
        checks['botBaseline'] = state()['bots']

        page.evaluate('''document.addEventListener('keydown', e=>{
  if (/^(Digit[1-4]|KeyQ|KeyR)$/.test(e.code)) window.jank3dQA.freeze(true);
  }); document.addEventListener('pointerdown', e=>{
  if(e.target.id==='game' && e.button===0) window.jank3dQA.freeze(true);
  });''')
        setup('window.jank3dQA.inspectHero()')
        page.evaluate('''() => { const note=document.createElement('p'); note.id='native-qa-camera';
  note.textContent='QA API camera: actual supplied model, no FX hiding';
  note.style.cssText='position:fixed;top:76px;left:12px;z-index:20;background:#111;color:#fff;padding:8px';
  document.body.append(note); }''')
        capture('model-preview')
        page.evaluate('document.getElementById("native-qa-camera").remove()')
        setup('window.jank3dQA.clearPreview(); window.jank3dQA.sync()')
        kit = next(k for k in KITS if k['id'] == hero)
        checks['abilities'] = []
        tether_case = hero in ('ribbon-seraph', 'spoollash')
        if tether_case:
          enemies = aim_live_bot()
          ability = next(a for a in kit['abilities'] if a['slot'] == 1)
          linked_runtime = cast_ability(ability)
          linked_state = state()
          assert linked_runtime['tether'], 'Native tether missed'
          target_id = linked_runtime['tether']['targetId']
          assert target_id in enemies, 'Tether missed live enemy'
          victim = next(b for b in linked_state['bots'] if b['id'] == target_id)
          lifecycle = checks['tether'] = {'targetId': target_id,
            'sourceTeam': linked_state['hero']['team'], 'before': enemies[target_id], 'range': ability['range'],
            'linked': {'hp': victim['hp'], 'moveSpeed': victim['moveSpeed'], 'position': victim['position'],
            'humanPosition': linked_state['controller']['position'],
            'time': linked_state['time'], 'tether': linked_runtime['tether']}}
          assert victim['hp'] < enemies[target_id]['hp'], 'No actual tether damage'
          assert 0 < victim['moveSpeed'] < enemies[target_id]['moveSpeed'], 'No systems-owned linked slow'
          checks['gameplayCapture'] = 'Native Digit1 live-bot tether; API placement/aim'
          capture('native-gameplay')
          p = victim['position']
          break_position = {'x': p['x'] - ability['range'] - 8, 'y': p['y'], 'z': p['z']}
          lifecycle['breakPlacement'] = break_position
          setup('(p)=>window.jank3dQA.place(p,-Math.PI/2,0)', break_position)
          broken_state = state()
          victim_after = next(b for b in broken_state['bots'] if b['id'] == target_id)
          lifecycle['broken'] = {'hp': victim_after['hp'], 'moveSpeed': victim_after['moveSpeed'],
            'position': victim_after['position'], 'humanPosition': broken_state['controller']['position'],
            'time': broken_state['time'], 'tether': broken_state['runtime']['tether']}
          lifecycle['breakDistance'] = math.dist(broken_state['controller']['position'],
            [victim_after['position'][axis] for axis in ('x', 'y', 'z')])
          assert lifecycle['broken']['tether'] is None, 'Range break did not clear tether'
          assert lifecycle['broken']['hp'] == lifecycle['linked']['hp'], 'Cleanup changed victim HP'
          assert lifecycle['broken']['time'] == lifecycle['linked']['time'], 'Cleanup advanced time'
          assert math.isclose(victim_after['moveSpeed'], enemies[target_id]['moveSpeed'], abs_tol=1e-8), 'Slow leaked'
          save()
        setup('window.jank3dQA.place({x:0,y:0,z:-200},Math.PI,-.04)')
        before_position = state()['controller']['position']
        step('native W, API clock')
        page.evaluate('window.jank3dQA.freeze(false)')
        page.keyboard.down('KeyW')
        try:
          advance(.35)
        finally:
          page.keyboard.up('KeyW')
        after_position = state()['controller']['position']
        moved = math.dist(before_position, after_position)
        assert moved > .1, (before_position, after_position)
        checks['movementMetres'] = moved
        checks['movement'] = {'before': before_position, 'after': after_position,
          'native': 'held W', 'clock': 'API .35s, not native elapsed time'}
        shot_enemies = aim_live_bot() if not tether_case else None
        before = state()['runtime']
        step('native canvas weapon')
        page.evaluate('window.jank3dQA.freeze(false)')
        page.mouse.click(640, 390)
        assert state()['paused']
        after = state()['runtime']
        assert after['shots'] > before['shots'] and after['ammo'] < before['ammo']
        checks['weapon'] = {'before': before, 'after': after}
        if shot_enemies:
          damaged = [b for b in state()['bots'] if b['id'] in shot_enemies and b['hp'] < shot_enemies[b['id']]['hp']]
          assert damaged, 'Native weapon missed enemy HP'
          victim = damaged[0]
          checks['targetHit'] = {'targetId': victim['id'], 'before': shot_enemies[victim['id']],
            'after': victim, 'native': 'Mouse weapon HP delta; API body aim'}
        step('native Escape unlock')
        page.keyboard.press('Escape')
        page.locator('#game').focus()
        setup('window.jank3dQA.place({x:0,y:0,z:-200},Math.PI,-.04)')
        reloading = native_key('KeyR')
        assert reloading['reload'] > 0
        advance(reloading['reload'] + .1)
        reloaded = state()['runtime']
        assert reloaded['reload'] == 0 and reloaded['ammo'] > after['ammo']
        checks['reload'] = {'started': reloading['reload'], 'completed': True, 'ammo': reloaded['ammo']}
        advance(.7)
        before_fx = state()['runtime']['fx']
        melee = native_key('KeyQ')
        assert melee['fx'] > before_fx
        checks['melee'] = {'fxBefore': before_fx, 'fxAfter': melee['fx'],
          'limit': 'Native melee FX only, not damage'}
        for ability in kit['abilities']:
          if tether_case and ability['slot'] == 1:
            continue
          cast_ability(ability)
        if not tether_case:
          checks['gameplayCapture'] = 'Native actions; live-bot weapon HP delta recorded separately'
          capture('native-gameplay')
        step('live enemy contact, API .05s')
        contact = state()
        enemy = next(b for b in contact['bots'] if b['alive'] and b['team']!=contact['hero']['team'] and abs(b['position']['y'])<.1)
        placement = dict(enemy['position'],x=enemy['position']['x']-7)
        setup('(p)=>window.jank3dQA.place(p,-Math.PI/2,0)',placement)
        before = state()
        invulnerable = any(a.get('invulnerable',False) and a['id'] in before['runtime']['buffs'] for a in kit['abilities'])
        advance(.05)
        observed = state()
        bots = observed['bots']
        assert len(bots) == 5 and all(b['mode'] != 'passive' for b in bots)
        checks['botsAfter'] = bots
        checks['botContact'] = {'enemy':enemy['id'],'placement':placement,'before':before,'after':observed,
          'expectedInvulnerable':invulnerable,'hpDelta':observed['hero']['hp']-before['hero']['hp']}
        checks['botCombatObserved'] = bot_contact(before,observed,invulnerable)
        checks['finalHero'] = observed['hero']
        report['unexercised'].append('Only tether/weapon HP deltas prove hits; other casts prove cooldown/FX only.')
      except Exception:
        if page and not report['screenshots']:
          probe_startup(page, report, started+WORK_SECONDS)
        raise
      finally:
        step('close owned browser/context')
        if browser:
          browser.close()
          report['cleanup']['browserClosed'] = True
  except Exception as error:
    report['failure'] = type(error).__name__ + ': ' + safe_error(error)
  finally:
    signal.setitimer(signal.ITIMER_REAL, 15)
    try:
      step('server cleanup/freeze/receipt')
      if server:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
      report['cleanup']['serverClosed'] = server is None or not thread.is_alive()
      report['sourceHashesAfter'] = runtime_hashes(ROOT)
      report['sourcesUnchanged'] = report['sourceHashes'] == report['sourceHashesAfter']
      report['sourceLimit'] = 'Freeze sources; hashes miss edit/revert.'
      report['storageAfter'] = guard()
      report['elapsedSeconds'] = round(time.monotonic() - started, 2)
      sys.stderr.flush()
      os.dup2(saved_stderr, 2)
      os.close(saved_stderr)
      saved_stderr = None
      stderr_stream.seek(0)
      report['stderrAudit'] = audit_stderr(stderr_stream.read(65537))
      if 'failure' not in report:
        require_evidence(report)
        report['status'] = 'PASS-builder-native-checks-only'
    except Exception as error:
      report['failure'] = type(error).__name__ + ': ' + safe_error(error)
      report['status'] = 'FAIL'
    finally:
      if saved_stderr is not None:
        sys.stderr.flush()
        os.dup2(saved_stderr, 2)
        os.close(saved_stderr)
      stderr_stream.close()
      try:
        save()
      except Exception as error:
        print('Receipt write blocked: ' + safe_error(error), file=sys.stderr, flush=True)
        report['status'] = 'FAIL'
      signal.setitimer(signal.ITIMER_REAL, 0)
  print(f'{hero}: {report["status"]}; receipt {report_path.relative_to(ROOT)}', flush=True)
  return 0 if report['status'] == 'PASS-builder-native-checks-only' else 1

def main(argv=None):
  cli_started = time.monotonic()
  args = parse_args(argv)
  attempt = os.environ.get('_NATIVE_HERO_QA_ATTEMPT')
  if attempt:
    assert re.fullmatch(re.escape(args.hero) + r'-\d{8}T\d{6}Z-[a-f0-9]{8}', attempt)
    return worker(args.hero, attempt)
  guard(); OUT.mkdir(parents=True, exist_ok=True)
  attempt = args.hero + '-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
  failure_path = OUT / f'{attempt}-supervisor.json'
  receipt = {'hero': args.hero, 'attempt': attempt, 'status': 'FAIL',
    'kind': 'Supervisor; evidence in worker JSON', 'timeoutSeconds': TOTAL_SECONDS}
  write_blob(failure_path, (json.dumps(receipt, indent=2) + '\n').encode())
  env = dict(os.environ, TMPDIR='/dev/shm', _NATIVE_HERO_QA_ATTEMPT=attempt)
  guard()
  child = subprocess.Popen([sys.executable, '-B', str(Path(__file__).resolve()), '--hero', args.hero],
    env=env, start_new_session=True)
  def interrupted(*_):
    raise KeyboardInterrupt
  signal.signal(signal.SIGTERM, interrupted)
  try:
    code = child.wait(timeout=max(.1, TOTAL_SECONDS - (time.monotonic() - cli_started)))
  except (subprocess.TimeoutExpired, KeyboardInterrupt):
    os.killpg(child.pid, signal.SIGTERM)
    try:
      child.wait(timeout=6)
    except subprocess.TimeoutExpired:
      os.killpg(child.pid, signal.SIGKILL)
      child.wait(timeout=1)
    code = 124
    receipt['failure'] = 'Supervisor timeout/interruption; inspect worker/cleanup'
  receipt['exitCode'] = code
  receipt['status'] = 'PASS-worker-exited' if code == 0 else 'FAIL'
  write_blob(failure_path, (json.dumps(receipt, indent=2) + '\n').encode())
  return code

if __name__ == '__main__':
  raise SystemExit(main())
