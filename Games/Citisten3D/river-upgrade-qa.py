"""Actual native entry, normal input only; diagnostics only read/project/assert.
Prepare (no browser): python3 -B Games/Citisten3D/river-upgrade-qa.py --prepare
After explicit SOURCE FREEZE / BROWSER GO, ONE <=300s owned slot per case:
TMPDIR=/dev/shm timeout 300s python3 -B Games/Citisten3D/river-upgrade-qa.py --case desktop --freeze-label fixfinish1 --run-label fixfinish1 --browser-go
Cases: input (focus/speed only), desktop, mobile; baseline is historical, not resumed.
Use --run-label resume1 to preserve prior evidence. Six JPEGs / 2MB; no installs.
Browser-free helper fixture: python3 -B Games/Citisten3D/river-upgrade-qa.py --self-test
"""
import argparse
import copy
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import threading
import time
from urllib.parse import urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / 'Games/Citisten3D'
OUT = ROOT / '.tmp/citisten-river-qa'
BASELINE = ROOT / '.tmp/citisten-river-before/Games/Citisten3D'
ORIGINAL = '52497b26d72ed2466078e25536d6a434e43a1a4a'
STATE = """() => {const s=citisten.sim?.state;return s?{mode:s.mode,time:s.time,speed:s.speed,
 budget:s.budget,population:s.population,terrainLayout:s.terrainLayout,timedConstruction:s.timedConstruction,
 progressionEnabled:s.progressionEnabled,progressionLevel:s.progressionLevel,power:s.power,water:s.water,
 roads:[...citisten.world.roads.cells],buildings:s.buildings.map(b=>({...b}))}:null;}"""
PROJECT = """async ({x,z}) => {const {Vector3}=await import('./vendor/three.module.js');
 const {world}=citisten,c=document.querySelector('#world'),r=c.getBoundingClientRect(),p=world.roads.center(x,z);
 const v=new Vector3(p.x,0,p.z).project(world.camera),q={x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};
 const picked=world.pickLot(q.x,q.y);
 return v.z>-1&&v.z<1&&q.x>4&&q.x<innerWidth-4&&q.y>4&&q.y<innerHeight-4&&
 document.elementFromPoint(q.x,q.y)===c&&picked?.x===x&&picked?.z===z?q:null;}"""
# Shared with the browser-free real-simulation check: one connected town, not two fixtures.
COMPOSE = """function compose(sim,world,visible){
 const h=sim.state.buildings[0],empty=p=>world.roads.valid(p.x,p.z)&&!sim.buildingAt(p.x,p.z)&&!world.roads.has(p.x,p.z)&&!sim.terrain.isWater(p.x,p.z);
 const rows=Array.from({length:25},(_,i)=>h.z-8+i).sort((a,b)=>Math.abs(a-h.z-3)-Math.abs(b-h.z-3));
 for(const z of rows){
 const wet=Array.from({length:sim.state.size},(_,x)=>x).filter(x=>sim.terrain.isWater(x,z));
 if(!wet.length)continue;const a={x:wet[0]-2,z},b={x:wet.at(-1)+1,z};
 const bridge=world.roads.line(a,b),road=Array.from({length:5},(_,i)=>({x:b.x+i,z}));
 for(const side of [-1,1]){
 const lots=[{type:'water',x:a.x,z:z+side},{type:'residential',x:b.x,z:z+side},
 {type:'commercial',x:b.x+1,z:z+side},{type:'power',x:b.x+2,z:z-side},{type:'park',x:b.x+3,z:z-side}];
 const extra={type:'apartments',x:b.x+4,z:z+side};
 if([...road,...lots,extra].every(empty)&&bridge.every(p=>!sim.buildingAt(p.x,p.z))&&
 [...bridge,...road,...lots,extra].every(visible))return {a,b,wet,bridge,road,lots,extra};
 }}return null;}"""
PLAN = """async () => {const {Vector3}=await import('./vendor/three.module.js');
 const {world,sim}=citisten,c=document.querySelector('#world'),r=c.getBoundingClientRect();
 function visible(p){const w=world.roads.center(p.x,p.z),v=new Vector3(w.x,0,w.z).project(world.camera);
 const x=r.left+(v.x+1)*r.width/2,y=r.top+(1-v.y)*r.height/2,picked=world.pickLot(x,y);
 return v.z>-1&&v.z<1&&x>8&&x<innerWidth-8&&y>8&&y<innerHeight-8&&
 document.elementFromPoint(x,y)===c&&picked?.x===p.x&&picked?.z===p.z;}
 """ + COMPOSE + "return compose(sim,world,visible);}"


def guard():
    free = shutil.disk_usage(ROOT).free
    if free < 2147483648:
        raise RuntimeError(f'Disk floor: {free} bytes; stop growing')
    return free


def roots():
    rows = subprocess.check_output(['ps', '-eo', 'stat=,pid=,args='], text=True)
    return {int(p[1]): line for line in rows.splitlines() if len(p := line.split()) > 2
            and not p[0].startswith('Z') and Path(p[2]).name in ('chromium', 'chrome') and '--type=' not in line}


def freeze():
    paths = [p for p in GAME.rglob('*') if p.is_file() and p.suffix not in ('.py',)
             and p.name != 'river-upgrade-check.mjs' and not p.name.endswith('-check.mjs')]
    paths += [p for p in (ROOT / 'assets/fonts').rglob('*') if p.is_file()]
    return {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}


def baseline_blobs(names):
    assert all('\n' not in name and '\r' not in name for name in names), 'Newline in baseline filename'
    requests = ''.join(f'{ORIGINAL}:Games/Citisten3D/{name}\n' for name in names).encode()
    reply = subprocess.check_output(['git', 'cat-file', '--batch'], input=requests, cwd=ROOT)
    return parse_baseline_blobs(reply, len(names))


def parse_baseline_blobs(reply, count):
    blobs, offset = [], 0
    for _ in range(count):
        end = reply.find(b'\n', offset)
        assert end >= offset, 'Truncated Git blob header'
        fields = reply[offset:end].split(b' ')
        assert len(fields) == 3 and fields[1] == b'blob', 'Missing or wrong-type Git blob'
        oid, _, size = fields
        assert len(oid) in (40, 64) and all(c in b'0123456789abcdef' for c in oid), 'Invalid Git object ID'
        assert size and all(c in b'0123456789' for c in size), 'Invalid Git blob size'
        start = end + 1
        offset = start + int(size)
        assert offset < len(reply) and reply[offset:offset+1] == b'\n', 'Truncated Git blob body'
        blobs.append(reply[start:offset])
        offset += 1
    assert offset == len(reply), 'Trailing Git batch reply'
    return blobs


def baseline_check():
    files = sorted(p for p in BASELINE.iterdir() if p.is_file() and not p.is_symlink())
    assert files, 'Source-only baseline missing'
    expected_blobs = baseline_blobs([p.name for p in files])
    for p, expected in zip(files, expected_blobs):
        assert p.read_bytes() == expected, f'Original baseline changed: {p.name}'
    for name in ('models', 'vendor'):
        assert (BASELINE / name).resolve() == (GAME / name).resolve(), f'Wrong shared {name}'
    assert (BASELINE.parents[1] / 'assets/fonts').resolve() == (ROOT / 'assets/fonts').resolve()
    return {'revision': ORIGINAL, 'sourceFilesCompared': len(files), 'unchanged': True}


INPUT = """() => {const e=document.activeElement,s=document.querySelector('#speed'),c=s?.closest?.('#native-controls details');return {
 activeId:e?.id,activeTag:e?.tagName,documentFocused:document.hasFocus(),
 speedControlsOpen:c?c.open:null,activeSpeedControlsSummary:Boolean(c&&e===c.querySelector('summary')),
 tutorialOpen:Boolean(document.querySelector('.city-tutorial')?.open),
 selectedSpeed:s?.value,selectedIndex:s?.selectedIndex,
 values:s?[...s.options].map(o=>o.value):[],speed:window.citisten?.sim?.state.speed};}"""


def browser_clock_expression(expression):
    """Same synchronous call once; failed RPCs cannot return timing metadata."""
    return """() => {
 const clock=()=>{try{const n=performance.now();return typeof n==='number'&&Number.isFinite(n)?n:null;}catch{return null;}};
 const browserClock={entryMilliseconds:clock(),exitMilliseconds:null,durationMilliseconds:null};
 let value;
 try{value=(EXPRESSION)();}
 finally{try{browserClock.exitMilliseconds=clock();
   if(browserClock.entryMilliseconds!==null&&browserClock.exitMilliseconds!==null){
     const duration=browserClock.exitMilliseconds-browserClock.entryMilliseconds;
     if(Number.isFinite(duration)&&duration>=0)browserClock.durationMilliseconds=duration;}
   }catch{/* Diagnostic failure must not replace the original value or throw. */}}
 return {value,browserClock};
}""".replace('EXPRESSION', expression)


class MidpointTiming:
    """Host RPC spans plus optional separate browserClock expression durations."""
    def __init__(self, report, persist, *, clock=time.monotonic, cap=1024, browser_clock=False):
        self.report, self.persist, self.clock = report, persist, clock
        self.browser_clock = browser_clock
        self.active, self.last_state_host = False, None
        self.data = {'kind': 'host-only', 'nativeLoopPhaseStatus': 'not-measured-by-host-timing',
                     'records': [], 'cap': cap, 'overflow': False, 'dropped': 0,
                     'evidenceErrors': [], 'evidenceErrorsDropped': 0, 'fatalActionTimeout': False}
        report['midpointTiming'] = self.data

    def safe(self, action, primary=None):
        try:
            return action()
        except BaseException as error:
            if isinstance(error, (TimeoutError, KeyboardInterrupt, SystemExit)):
                self.data['fatalActionTimeout'] = True
                if primary is None:
                    raise
            elif len(self.data['evidenceErrors']) < 16:
                self.data['evidenceErrors'].append(type(error).__name__)
            else:
                self.data['evidenceErrorsDropped'] += 1

    def call(self, name, action, **fields):
        if not self.active:
            return action()
        record = {'operation': name, **fields}
        def begin():
            record['hostEntry'] = self.clock()
            if len(self.data['records']) < self.data['cap']:
                self.data['records'].append(record)
            else:
                self.data.update(overflow=True, dropped=self.data['dropped'] + 1)
        self.safe(begin)
        try:
            return action()
        except BaseException as error:
            record['exception'] = type(error).__name__
            if isinstance(error, (TimeoutError, KeyboardInterrupt, SystemExit)):
                self.data['fatalActionTimeout'] = True
            raise
        finally:
            primary = sys.exc_info()[1]
            def finish():
                record['hostExit'] = self.clock()
                record['hostElapsedSeconds'] = record['hostExit'] - record['hostEntry']
                if 'budgetSeconds' in fields:
                    record['overrunSeconds'] = max(0, record['hostElapsedSeconds'] - fields['budgetSeconds'])
                if name == 'state.evaluate':
                    self.last_state_host = record['hostExit']
            self.safe(finish, primary)

    def evaluate(self, name, page, expression, **fields):
        measured = self.active and self.browser_clock
        result = self.call(name, lambda: page.evaluate(
            browser_clock_expression(expression) if measured else expression), **fields)
        if not measured:
            return result
        value = result['value']  # Unwrap before lastState, inputTrace or acceptance.
        def retain():
            samples = self.data.setdefault('browserClocks', [])
            if len(samples) < self.data['cap']:
                samples.append({'operation': name, **fields, 'browserClock': result['browserClock']})
            else:
                self.data['browserClocksDropped'] = self.data.get('browserClocksDropped', 0) + 1
        self.safe(retain)
        return value

    def partial(self, sample):
        def retain():
            building = next(b for b in sample['buildings'] if b['type'] == 'apartments'
                            and 0 < b['constructionRemaining'] < b['constructionTotal'])
            self.data['successfulPartial'] = {'hostObservationMonotonic': self.last_state_host,
                'simulationTime': sample['time'], 'remaining': building['constructionRemaining'],
                'state': copy.deepcopy(sample)}
            self.call('partial.persist', self.persist)
        self.safe(retain)


def observed_state(page, exclusive, report, timing):
    def read():
        timing.call('state.exclusive', exclusive)
        value = timing.evaluate('state.evaluate', page, STATE)
        report['lastState'] = value
        return value
    return timing.call('state', read)


def observed_wait(page, predicate, seconds=12, *, timing, clock=time.monotonic):
    def run():
        # Preserve the original deadline implementation, including late-success behavior.
        deadline = clock() + seconds
        while clock() < deadline:
            if timing.call('wait.predicate', predicate):
                return
            timing.call('wait.pollSleep', lambda: page.wait_for_timeout(100))
        raise AssertionError('Native condition not reached within bounded wait')
    return timing.call('wait', run, budgetSeconds=seconds)


def observed_input(page, exclusive, report, start, stage, timing):
    def read():
        timing.call('input.exclusive', exclusive, stage=stage)
        sample = timing.evaluate('input.evaluate', page, INPUT, stage=stage)
        report['inputTrace'].append({'stage': stage, 'seconds': round(time.monotonic() - start, 3), **sample})
        return sample
    return timing.call('input_sample', read, stage=stage)


def observed_speed(press, observe, wait, state, value, timing):
    def run():
        native_speed(lambda key: timing.call('keypress', lambda: press(key), key=key, speed=value),
                     observe, value)
        timing.call('speed.verification', lambda: wait(lambda: state()['speed'] == value, 3), speed=value)
    return timing.call('speed', run, speed=value)


def apartment_midpoint(state, speed, wait, timing):
    timing.active = True
    try:
        speed(1)
        def partial():
            sample = state()  # The SAME existing predicate read, never a second RPC.
            matched = any(b['type'] == 'apartments' and 0 < b['constructionRemaining'] < b['constructionTotal']
                          for b in sample['buildings'])
            if matched:
                timing.partial(sample)
            return matched
        wait(partial, 5)
        speed(0)
        midpoint = state(); remaining = next(b['constructionRemaining'] for b in midpoint['buildings'] if b['type'] == 'apartments')
        assert 0 < remaining < 12
        return midpoint, remaining
    finally:
        primary = sys.exc_info()[1]
        try:
            timing.safe(timing.persist, primary)  # Host-only; secondary failure never masks primary.
        finally:
            timing.active = False


def tutorial_resumed(sample):
    return not sample['tutorialOpen'] and sample['speed'] == 1 and sample['activeId'] == 'world'


def native_speed(press, observe, value):
    # Tab never opens a select popup; arrows on the closed select commit change.
    sample = observe(f'beforeSpeed:{value}')
    opened_controls = False
    for _ in range(32):
        if sample['activeId'] == 'speed':
            break
        if sample.get('speedControlsOpen') is False and sample.get('activeSpeedControlsSummary'):
            press('Enter')
            sample = observe('afterSpeedControlsOpen')
            assert sample.get('speedControlsOpen') is True, f'Controls did not open: {sample}'
            opened_controls = True
        else:
            press('Tab')
            sample = observe('afterTab')
    assert sample['activeId'] == 'speed' and sample['documentFocused'] and not sample['tutorialOpen'], f'Select focus not reached: {sample}'
    target = sample['values'].index(str(value))
    delta = target - sample['selectedIndex']
    for _ in range(abs(delta)):
        press('ArrowDown' if delta > 0 else 'ArrowUp')
        sample = observe('afterArrow')
        assert sample['activeId'] == 'speed', f'Select lost focus: {sample}'
    assert sample['selectedSpeed'] == str(value) and sample['speed'] == value, f'Native select/sim mismatch: {sample}'
    # Normal Tab commits/blurs the select; a focused native popup may starve rAF.
    press('Tab')
    sample = observe('afterSpeedTabCommit:' + str(value))
    assert sample['activeId'] != 'speed' and sample['documentFocused'] and not sample['tutorialOpen'], f'Select did not blur: {sample}'
    assert sample['selectedSpeed'] == str(value) and sample['speed'] == value, f'Native blur changed select/sim: {sample}'
    if opened_controls:
        # Restore only what this call opened, so the overlay cannot cover tools.
        for _ in range(32):
            if sample.get('activeSpeedControlsSummary'):
                break
            press('Shift+Tab')
            sample = observe('afterSpeedControlsBackTab')
        assert sample.get('activeSpeedControlsSummary') and sample['documentFocused'] and not sample['tutorialOpen'], f'Controls summary focus not reached: {sample}'
        press('Enter')
        sample = observe('afterSpeedControlsClose')
        assert sample.get('speedControlsOpen') is False and sample['documentFocused'] and not sample['tutorialOpen'], f'Controls did not close: {sample}'
        assert sample['selectedSpeed'] == str(value) and sample['speed'] == value, f'Controls close changed select/sim: {sample}'


TARGET = """selector=>{const nodes=document.querySelectorAll(selector),e=nodes[0];
 const info={count:nodes.length,documentVisibility:document.visibilityState,documentHidden:document.hidden,
   target:null,style:null,rect:null,disabled:null,box:false,x:null,y:null,hit:false,area:null};
 if(!e)return info;
 const r=e.getBoundingClientRect(),s=getComputedStyle(e),x=r.x+r.width/2,y=r.y+r.height/2;
 let area=null,p=e.parentElement;
 while(p){if(p.scrollHeight>p.clientHeight+2&&/(auto|scroll)/.test(getComputedStyle(p).overflowY)){
   const a=p.getBoundingClientRect();area={x:a.x,y:a.y,width:a.width,height:a.height};break;}p=p.parentElement;}
 return {...info,target:{tag:e.tagName,id:e.id,hidden:e.hidden,ariaHidden:e.getAttribute('aria-hidden'),
   ariaExpanded:e.getAttribute('aria-expanded')},
   style:{display:s.display,visibility:s.visibility,opacity:s.opacity,pointerEvents:s.pointerEvents},
   rect:{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom,left:r.left},
   disabled:e.matches(':disabled'),box:r.width>0&&r.height>0,x,y,
   hit:e.contains(document.elementFromPoint(x,y)),area};}"""
FRAME_READY = """milliseconds=>new Promise(resolve=>{
 const start=performance.now();let frames=0,frame=null,timer,settled=false;
 function finish(ready,error=null){if(settled)return;settled=true;clearTimeout(timer);
   if(frame!==null)cancelAnimationFrame(frame);
   resolve({ready,frames,elapsedMilliseconds:performance.now()-start,error});}
 function tick(){try{frames++;if(performance.now()-start>=milliseconds)finish(false);
   else if(frames===2)finish(true);else frame=requestAnimationFrame(tick);}
   catch(error){finish(false,String(error));}}
 try{timer=setTimeout(()=>finish(false),milliseconds);frame=requestAnimationFrame(tick);}
 catch(error){finish(false,String(error));}
})"""


def target_diagnostic(page, selector, report):
    # One read-only RPC per observation, bounded handoff history, no alternate action path.
    info = page.evaluate(TARGET, selector)
    history = report.setdefault('targetDiagnostics', [])
    if len(history) == 32:
        history.pop(0)
        report['targetDiagnosticsDropped'] = report.get('targetDiagnosticsDropped', 0) + 1
    history.append({'selector': selector, **info})
    return info


def capture_shot(page, path, name, state, input_sample, report, checkpoint):
    photos = list(path.parent.glob('*.jpg'))
    assert len(photos) < 6, 'Six-photo total cap reached; inspect previous outputs'
    assert not path.exists(), 'Never overwrite an earlier photo'
    before = state()
    assert before is not None and before['speed'] == 0, 'Photos require actual paused STATE'
    input_sample('beforePhotoWake:' + name)
    page.keyboard.press('Shift')  # Normal input wakes the existing loop; browser hypothesis only.
    input_sample('afterPhotoWake:' + name)
    assert state() == before, 'Photo wake changed paused STATE'
    fatal_timeout = False
    stage = 'readiness'
    try:
        # Two scheduled frames are not proof of GPU/compositor completion.
        readiness = page.evaluate(FRAME_READY, 5000)
        report.setdefault('captureReadiness', []).append({'name': name, **readiness})
        if not readiness['ready']:
            raise RuntimeError('Two-rAF readiness failed: ' + (readiness.get('error') or 'deadline exceeded (5000ms)'))
        stage = 'screenshot'
        page.screenshot(path=str(path), type='jpeg', quality=55, timeout=15000)
    except TimeoutError:
        fatal_timeout = True
        raise  # The action-budget alarm is fatal, not a deferred capture error.
    except Exception as error:
        detail = {'name': name, 'path': path.relative_to(ROOT).as_posix(),
                  'stage': stage, 'error': str(error).replace(str(ROOT), '.')}
        report['captureErrors'].append(detail)
        checkpoint('photoError:' + name, detail)
        return
    finally:
        if not fatal_timeout:
            assert state() == before, 'Capture changed paused STATE'
        assert sum(p.stat().st_size for p in path.parent.glob('*.jpg')) <= 2_000_000, 'JPEG total exceeds 2MB'
    assert path.is_file() and path.stat().st_size > 0, 'Capture produced no image'
    report['screenshots'].append(path.relative_to(ROOT).as_posix())
    checkpoint('photo:' + name)


def capture_gate(report, required):
    missing = [p.relative_to(ROOT).as_posix() for p in required
               if p.relative_to(ROOT).as_posix() not in report['screenshots']
               or not p.is_file() or p.stat().st_size == 0]
    assert not report['captureErrors'] and not missing, f'Required capture gate failed: missing={missing}; errors={report["captureErrors"]}'


def self_test():
    # Browser-free protocol fixture, NOT proof of Chromium's native select behavior.
    sample = dict(activeId='world', activeTag='CANVAS', documentFocused=True,
                  tutorialOpen=False, selectedSpeed='1', selectedIndex=1,
                  values=['0', '1', '3', '10'], speed=1)
    assert tutorial_resumed(sample)
    assert not tutorial_resumed({**sample, 'speed': 0})
    assert not tutorial_resumed({**sample, 'activeId': 'speed'})
    assert not tutorial_resumed({**sample, 'tutorialOpen': True})
    keys = []
    def press(key):
        keys.append(key)
        if key == 'Tab':
            leaving = sample['activeId'] == 'speed'
            sample.update(activeId='world' if leaving else 'speed', activeTag='CANVAS' if leaving else 'SELECT')
        else:
            assert sample['activeId'] == 'speed' and key in ('ArrowUp', 'ArrowDown')
            index = sample['selectedIndex'] + (1 if key == 'ArrowDown' else -1)
            assert 0 <= index < len(sample['values'])
            sample.update(selectedIndex=index, selectedSpeed=sample['values'][index], speed=int(sample['values'][index]))
    def observe(_):
        return dict(sample)
    for value in (0, 1, 3, 10, 0):
        native_speed(press, observe, value)
    assert keys == (['Tab', 'ArrowUp', 'Tab'] + ['Tab', 'ArrowDown', 'Tab'] * 3
                    + ['Tab', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'Tab'])
    assert sample['activeId'] != 'speed'
    def trapped(key):
        if key == 'Tab' and sample['activeId'] == 'speed':
            return
        press(key)
    sample.update(activeId='speed', activeTag='SELECT')
    try:
        native_speed(trapped, observe, 0)
    except AssertionError as error:
        assert 'did not blur' in str(error)
    else:
        raise AssertionError('Trapped select must fail')
    def changed_on_blur(key):
        leaving = key == 'Tab' and sample['activeId'] == 'speed'
        press(key)
        if leaving:
            sample.update(selectedSpeed='1', selectedIndex=1, speed=1)
    try:
        native_speed(changed_on_blur, observe, 0)
    except AssertionError as error:
        assert 'blur changed' in str(error)
    else:
        raise AssertionError('Blur must preserve selected and simulation speeds')
    sample.update(activeId='world', activeTag='CANVAS', selectedSpeed='0', selectedIndex=0, speed=0)
    sample.update(activeId='speed', activeTag='SELECT')
    def stolen(key):
        press(key)
        sample['activeId'] = 'world'
    try:
        native_speed(stolen, observe, 1)
    except AssertionError as error:
        assert 'lost focus' in str(error)
    else:
        raise AssertionError('Focus theft must fail, not become gameplay acceptance')
    print('PASS native speed protocol fixture; normal Tab commit/blur, retained DOM/sim speed, trapped/changed blur rejection, tutorial resume barrier and focus theft (browserLaunched: false)')
    # Exercise the production capture branch without files, images, or a browser.
    from types import SimpleNamespace
    from unittest.mock import Mock
    path = Mock(spec=Path)
    path.relative_to.return_value = Path('.tmp/citisten-river-qa/fake.jpg')
    path.exists.return_value = False
    path.is_file.return_value = True
    path.stat.return_value = SimpleNamespace(st_size=100)
    path.parent.glob.return_value = [path]
    ready = {'ready': True, 'frames': 2, 'elapsedMilliseconds': 20, 'error': None}
    def fixture(error=None, states=None, readiness=ready):
        report = {'captureErrors': [], 'screenshots': []}
        page = SimpleNamespace(keyboard=SimpleNamespace(press=Mock()), screenshot=Mock(side_effect=error),
                               evaluate=Mock(return_value=readiness))
        observe = Mock(side_effect=states) if states else Mock(return_value={'speed': 0, 'time': 2})
        trace, checkpoint = Mock(), Mock()
        capture_shot(page, path, 'fixture', observe, trace, report, checkpoint)
        page.keyboard.press.assert_called_once_with('Shift')
        page.evaluate.assert_called_once_with(FRAME_READY, 5000)
        if readiness['ready']:
            page.screenshot.assert_called_once_with(path=str(path), type='jpeg', quality=55, timeout=15000)
        else:
            page.screenshot.assert_not_called()
        assert trace.call_args_list[0].args == ('beforePhotoWake:fixture',)
        assert trace.call_args_list[1].args == ('afterPhotoWake:fixture',)
        return report, checkpoint
    fatal = TimeoutError('action budget exhausted')
    fatal_state = Mock(side_effect=[{'speed': 0}, {'speed': 0}, AssertionError('post-timeout driver RPC')])
    fatal_page = SimpleNamespace(keyboard=SimpleNamespace(press=Mock()), screenshot=Mock(side_effect=fatal),
                                 evaluate=Mock(return_value=ready))
    fatal_report = {'captureErrors': [], 'screenshots': []}
    fatal_checkpoint = Mock()
    path.parent.glob.reset_mock()
    try:
        capture_shot(fatal_page, path, 'fatal', fatal_state, Mock(), fatal_report, fatal_checkpoint)
    except TimeoutError as error:
        assert error is fatal
    else:
        raise AssertionError('Fatal action timeout must propagate')
    assert fatal_state.call_count == 2, 'No state RPC after fatal screenshot timeout'
    assert path.parent.glob.call_count == 2, 'Filesystem budget check must still run'
    assert not fatal_report['captureErrors'] and not fatal_report['screenshots']
    fatal_checkpoint.assert_not_called()
    fatal_page.evaluate.side_effect = fatal
    fatal_page.screenshot.reset_mock()
    fatal_state.reset_mock(side_effect=True)
    fatal_state.side_effect = [{'speed': 0}, {'speed': 0}, AssertionError('post-timeout driver RPC')]
    try:
        capture_shot(fatal_page, path, 'fatal-readiness', fatal_state, Mock(), fatal_report, fatal_checkpoint)
    except TimeoutError as error:
        assert error is fatal
    else:
        raise AssertionError('Fatal readiness action timeout must propagate')
    assert fatal_state.call_count == 2
    fatal_page.screenshot.assert_not_called()
    fatal_checkpoint.assert_not_called()
    print('PASS fatal capture action TimeoutError propagates; no post-timeout state RPC; filesystem cap retained (NOT browser proof)')
    report, checkpoint = fixture(RuntimeError('capture deadline'))
    downstream = []
    downstream.append('mandatory gameplay can continue')
    assert downstream and report['captureErrors'][0]['error'] == 'capture deadline'
    assert not report['screenshots'] and checkpoint.call_args.args[0] == 'photoError:fixture'
    def must_fail(action, message):
        try:
            action()
        except AssertionError as error:
            assert message in str(error), str(error)
        else:
            raise AssertionError('Invalid capture must not pass')
    must_fail(lambda: capture_gate(report, [path]), 'Required capture gate failed')
    must_fail(lambda: capture_gate({'captureErrors': [], 'screenshots': []}, [path]), 'Required capture gate failed')
    for readiness in ({**ready, 'ready': False, 'frames': 0, 'elapsedMilliseconds': 5000},
                      {**ready, 'ready': False, 'frames': 2, 'elapsedMilliseconds': 5001},
                      {**ready, 'ready': False, 'error': 'frame scheduling error'}):
        deferred, marked = fixture(readiness=readiness)
        assert deferred['captureErrors'][0]['stage'] == 'readiness'
        assert not deferred['screenshots'] and marked.call_args.args[0] == 'photoError:fixture'
        must_fail(lambda: capture_gate(deferred, [path]), 'Required capture gate failed')
    report, _ = fixture()
    capture_gate(report, [path])
    must_fail(lambda: capture_gate({**report, 'captureErrors': [{'error': 'retained'}]}, [path]), 'Required capture gate failed')
    path.is_file.return_value = False
    must_fail(lambda: capture_gate(report, [path]), 'Required capture gate failed')
    path.is_file.return_value = True
    path.exists.return_value = True
    must_fail(fixture, 'Never overwrite')
    path.exists.return_value = False
    must_fail(lambda: fixture(states=[{'speed': 1}]), 'actual paused STATE')
    must_fail(lambda: fixture(states=[{'speed': 0}, {'speed': 0, 'time': 1}]), 'Photo wake changed')
    must_fail(lambda: fixture(RuntimeError('capture deadline'), [{'speed': 0}, {'speed': 0}, {'speed': 1}]), 'Capture changed')
    path.parent.glob.return_value = [path] * 6
    must_fail(fixture, 'Six-photo total cap')
    path.parent.glob.return_value = [path]
    path.stat.return_value.st_size = 2_000_001
    must_fail(fixture, 'JPEG total exceeds 2MB')
    print('PASS production capture helper fakepage: bounded Shift/JPEG, deferred error, downstream continuation, strict missing/error gate, paused-state and 6-photo/2MB guards (NOT browser proof)')
    # The actual shared snapshot uses one evaluate and retains only the latest 32 observations.
    diagnostic_page = SimpleNamespace(evaluate=Mock(return_value={'count': 0, 'box': False}))
    diagnostics = {}
    assert target_diagnostic(diagnostic_page, '#missing', diagnostics) == {'count': 0, 'box': False}
    diagnostic_page.evaluate.assert_called_once_with(TARGET, '#missing')
    for _ in range(40):
        target_diagnostic(diagnostic_page, '#missing', diagnostics)
    assert len(diagnostics['targetDiagnostics']) == 32 and diagnostics['targetDiagnosticsDropped'] == 9
    probe_script = """import assert from 'node:assert/strict';import vm from 'node:vm';
 const targetSource=TARGET_SOURCE,frameSource=FRAME_SOURCE;
 const rect={x:10,y:20,width:40,height:60,top:20,right:50,bottom:80,left:10};
 const style={display:'block',visibility:'visible',opacity:'1',pointerEvents:'auto',overflowY:'auto'};
 const parent={scrollHeight:200,clientHeight:100,parentElement:null,getBoundingClientRect:()=>rect};
 const element={tagName:'BUTTON',id:'tool',hidden:false,parentElement:parent,
   getBoundingClientRect:()=>rect,getAttribute:name=>name==='aria-expanded'?'true':null,
   matches:selector=>{assert.equal(selector,':disabled');return false;},contains:hit=>hit===element};
 let nodes=[element],queries=0;
 const document={visibilityState:'visible',hidden:false,querySelectorAll:selector=>{
   assert.equal(selector,'#tool');queries++;return nodes;},elementFromPoint:(x,y)=>{
   assert.equal(x,30);assert.equal(y,50);return element;}};
 const target=vm.runInNewContext('('+targetSource+')',{document,getComputedStyle:()=>style});
 const info=JSON.parse(JSON.stringify(target('#tool')));assert.equal(queries,1);
 assert.deepEqual(info,{count:1,documentVisibility:'visible',documentHidden:false,
   target:{tag:'BUTTON',id:'tool',hidden:false,ariaHidden:null,ariaExpanded:'true'},
   style:{display:'block',visibility:'visible',opacity:'1',pointerEvents:'auto'},rect,
   disabled:false,box:true,x:30,y:50,hit:true,area:{x:10,y:20,width:40,height:60}});
 nodes=[];assert.equal(target('#tool').count,0);nodes=[element,element];assert.equal(target('#tool').count,2);
 style.visibility='hidden';assert.equal(target('#tool').style.visibility,'hidden');
 async function probe(times,timer=false,throws=false){let now=0,id=0;const frames=new Map(),timers=new Map();
   const run=vm.runInNewContext('('+frameSource+')',{performance:{now:()=>now},
     setTimeout:(fn,ms)=>{assert.equal(ms,5000);timers.set(++id,fn);return id;},
     clearTimeout:id=>timers.delete(id),cancelAnimationFrame:id=>frames.delete(id),
     requestAnimationFrame:fn=>{if(throws)throw Error('RAF unavailable');frames.set(++id,fn);return id;}});
   const promise=run(5000);
   for(const time of times){now=time;const [id,fn]=frames.entries().next().value;frames.delete(id);fn();}
   if(timer){now=5000;[...timers.values()][0]();}
   const result=await promise;assert.equal(frames.size,0);assert.equal(timers.size,0);return result;
 }
 assert.equal((await probe([10,20])).ready,true);
 assert.equal((await probe([5001])).ready,false);
 assert.equal((await probe([10,5000])).ready,false);
 assert.equal((await probe([],true)).frames,0);
 assert.match((await probe([],false,true)).error,/RAF unavailable/);
 console.log('PASS production target snapshot fields/one-evaluate/32-record cap; two-rAF ready, timer/late deadline and error cleanup (Node VM doubles, NOT browser proof)');
 """.replace('TARGET_SOURCE', json.dumps(TARGET)).replace('FRAME_SOURCE', json.dumps(FRAME_READY))
    subprocess.run(['node', '--input-type=module', '-e', probe_script], cwd=ROOT, check=True)
    print('PASS production readiness defer/no-photo and strict final rejection; fatal readiness timeout makes no post-timeout state RPC (NOT browser proof)')
    for value in ('fixfinish1', 'a-2', 'Z'):
        assert label_valid(value)
    for value in ('', '../bad', 'a/b', 'x' * 41):
        assert not label_valid(value)
    script = """import assert from 'node:assert/strict';
 import {createSimulation} from './Games/Citisten3D/sim.mjs';
 import {applyTool} from './Games/Citisten3D/native-actions.mjs';
 """ + COMPOSE + """
 const sim=createSimulation({size:200,terrainLayout:'river-v1',timedConstruction:true,progressionEnabled:true});
 const layout=compose(sim,{roads:sim.roads},()=>true);assert(layout);
 assert.equal(compose(sim,{roads:sim.roads},()=>false),null);
 const water=layout.lots.find(p=>p.type==='water'),home=layout.lots.find(p=>p.type==='residential');
 assert(water.x<layout.wet[0]&&home.x>layout.wet.at(-1));
 assert.equal(applyTool(sim,'road',layout.a,layout.b).ok,false);
 const budget=sim.state.budget;
 assert(applyTool(sim,'bridge',layout.a,layout.b).ok);
 assert.equal(budget-sim.state.budget,layout.wet.length*90+(layout.bridge.length-layout.wet.length)*10);
 assert.equal(sim.roads.path(layout.a,layout.b).length,layout.bridge.length);
 assert(applyTool(sim,'road',layout.road[0],layout.road.at(-1)).ok);
 for(const p of layout.lots)assert(applyTool(sim,p.type,p).ok,JSON.stringify(p));
 sim.setSpeed(10);for(let i=0;i<80&&sim.state.progressionLevel<1;i++)sim.update(.25);
 assert(sim.state.population>=12&&sim.state.progressionLevel>=1);
 for(const p of layout.lots){const b=sim.buildingAt(p.x,p.z);assert.equal(b.constructionRemaining,0);assert(b.powered&&b.watered);}
 assert(applyTool(sim,'apartments',layout.extra).ok);
 console.log('PASS composed native plan: west water crosses bridge, active east jobs/home, natural stage 1, apartment placement (headless only)');
 """
    subprocess.run(['node', '--input-type=module', '-e', script], cwd=ROOT, check=True)


def continue_midpoint(page, click, wait, state, speed, checkpoint, remaining, diagnostic=None):
    """The ordinary acceptance path; optional observation adds NO input/wait."""
    original_started = False
    try:
        if diagnostic:
            diagnostic.start()
            diagnostic.mark('before-Continue')
        original_started = True
        click('#continue-town')
        if diagnostic:
            diagnostic.mark('after-Continue')
        wait(lambda: state() is not None)
        continued = state()
        assert continued['speed'] == 0
        assert next(b['constructionRemaining'] for b in continued['buildings'] if b['type'] == 'apartments') == remaining
        page.wait_for_timeout(500); assert state() == continued
        checkpoint('continueExactPausedMidpoint', continued)
        speed(10)
        if diagnostic:
            diagnostic.mark('completion-window-before')
        try:
            wait(lambda: any(b['type'] == 'apartments' and b['constructionRemaining'] == 0 for b in state()['buildings']), 5)
        finally:
            if diagnostic:
                primary = sys.exc_info()[1]
                try:
                    diagnostic.mark('completion-window-after')  # filesystem only, even on fatal
                except BaseException as error:
                    if isinstance(error, (TimeoutError, KeyboardInterrupt, SystemExit)):
                        diagnostic.data['fatalActionTimeout'] = True
                    if primary is None:
                        raise
        speed(0); checkpoint('unlockedApartmentsCompleted', state())
        if diagnostic:
            diagnostic.data['continueAcceptanceOutcome'] = 'passed'
    except BaseException as error:
        if diagnostic:
            diagnostic.data.update(continueAcceptanceOutcome='failed' if original_started else 'not-reached',
                                   acceptanceOutcome='failed' if original_started else 'not-completed-diagnostic-setup-failure')
            diagnostic.data['originalException' if original_started else 'diagnosticSetupException'] = type(error).__name__
        raise
    finally:
        if diagnostic:
            primary = sys.exc_info()[1]
            try:
                cleanup_error = diagnostic.close(primary)
            except BaseException as error:
                diagnostic.data['diagnosticOutcome'] = 'invalid-cleanup-or-evidence-failure'
                diagnostic.data['cleanupErrors'].append(type(error).__name__)
                fatal = isinstance(error, (TimeoutError, KeyboardInterrupt, SystemExit))
                if fatal:
                    diagnostic.data['fatalActionTimeout'] = True
                if primary is None and fatal:
                    raise
                # Diagnostic-only failures never abort original previews/gates;
                # preserve any original primary exception, including IO failure.
            else:
                if primary is None and isinstance(cleanup_error, (TimeoutError, KeyboardInterrupt, SystemExit)):
                    raise cleanup_error


def label_valid(value):
    return bool(value) and len(value) <= 40 and all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-' for c in value)


def cleanup_failure_receipt(report, target, error, diagnostic):
    """Host-only best effort after terminal cleanup abort; never infer a pass."""
    report.update(status='failed', acceptanceOutcome='failed',
                  cleanupException={'type': type(error).__name__})
    try:
        report['cleanupException']['message'] = str(error).replace(str(ROOT), '.')
    except BaseException:
        pass  # A broken exception formatter cannot replace the cleanup error.
    for key in ('diagnosticOutcome', 'continueAcceptanceOutcome'):
        report.setdefault(key, None)
    try:
        data = diagnostic.data if diagnostic is not None else None
        if type(data) is dict:
            for key in ('diagnosticOutcome', 'continueAcceptanceOutcome'):
                value = data.get(key)
                if type(value) is str and value:
                    report[key] = value
            setup_error = data.get('diagnosticSetupException')
            if type(setup_error) is str and setup_error:
                report['acceptanceOutcome'] = 'not-completed-diagnostic-setup-failure'
    except BaseException:
        pass  # Host-only metadata read must not replace the primary abort.
    target.write_text(json.dumps(report, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--case', choices=('input', 'desktop', 'mobile'))  # Baseline disabled for this resume.
    parser.add_argument('--run-label', default='', help='Unique alphanumeric/hyphen evidence suffix')
    parser.add_argument('--freeze-label', default='', help='New named immutable freeze; independent of capture run label')
    parser.add_argument('--self-test', action='store_true', help='Browser-free input/capture fixtures and headless planner')
    parser.add_argument('--browser-go', action='store_true', help='Only after explicit orchestrator GO')
    parser.add_argument('--measure-continue', action='store_true', help='Opt-in source-verified sync CDP observation; never acceptance')
    parser.add_argument('--measure-rpc-clock', action='store_true', help='Opt-in same-RPC browser expression duration at midpoint; not queue timing')
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if any(value and not label_valid(value) for value in (args.run_label, args.freeze_label)):
        parser.error('Labels must be 1-40 ASCII letters, digits or hyphens')
    freeze_path = OUT / (f'freeze-{args.freeze_label}.json' if args.freeze_label else 'freeze.json')
    if args.measure_continue and (args.prepare or args.case not in ('desktop', 'mobile') or not args.run_label):
        parser.error('--measure-continue requires desktop/mobile and a fresh --run-label, not --prepare')
    free = guard()
    baseline = baseline_check()
    if args.prepare:
        OUT.mkdir(parents=True, exist_ok=True)
        hashes = freeze()
        head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
        payload = {'head': head, 'sha256': hashes} if args.freeze_label else hashes
        with freeze_path.open('x') as receipt:
            receipt.write(json.dumps(payload, indent=2) + '\n')
        print(json.dumps({'prepared': True, 'baseline': baseline, 'freeBytes': free, 'browserLaunched': False}))
        return
    if not args.browser_go or not args.case:
        parser.error('Browser forbidden without --case and explicit --browser-go after orchestrator GO')
    frozen = json.loads(freeze_path.read_text())
    expected = frozen['sha256'] if args.freeze_label else frozen
    assert freeze() == expected, 'Source changed since --prepare; require new SOURCE FREEZE'
    assert not roots(), 'Foreign Chromium roots present; no browser/server launched'
    stem = '-'.join(filter(None, (args.case, args.freeze_label, args.run_label)))
    profile = OUT / f'{stem}-profile'
    assert not profile.exists(), 'Owned profile already exists; inspect prior cleanup first'
    target = OUT / f'{stem}-results.json'
    assert not (OUT / f'{stem}-server.log').exists(), 'Prior server log exists; use a fresh run label'
    target.touch(exist_ok=False)  # Never replace an older attempt's receipt.
    report = {'case': args.case, 'runLabel': args.run_label, 'status': 'running', 'baseline': baseline,
              'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'sessionId': os.environ.get('PI_SESSION_ID'), 'freeBytesBefore': free,
              'checks': {}, 'errors': [], 'externalRequests': [], 'screenshots': [], 'captureErrors': [], 'inputTrace': [],
              'sourceHashes': expected, 'nativeInputOnly': True,
              'freezeFile': freeze_path.relative_to(ROOT).as_posix(),
              'freezeHead': frozen.get('head') if args.freeze_label else None,
              'freezeFileSHA256': hashlib.sha256(freeze_path.read_bytes()).hexdigest(),
              'actionBudgetSeconds': 240, 'cleanupBudgetSeconds': 25}
    diagnostic = None
    if args.measure_continue:
        # Import is browser-free. Dedicated session is created only at the
        # post-reload world-ready boundary, never shared with mobile touch CDP.
        sys.path.insert(0, str(ROOT / 'scripts'))
        from citisten_loop_diagnostic import SyncObservation
        diagnostic_path = OUT / f'{stem}-loop-diagnostic.json'
        assert not diagnostic_path.exists(), 'Never overwrite a prior diagnostic'
        report['loopDiagnosticFile'] = diagnostic_path.relative_to(ROOT).as_posix()
        diagnostic = SyncObservation(lambda: context.new_cdp_session(page), diagnostic_path)
    start = time.monotonic()
    def checkpoint(name, value=True):
        report['checks'][name] = value
        report['seconds'] = round(time.monotonic() - start, 3)
        target.write_text(json.dumps(report, indent=2) + '\n')
        print(f'{args.case}: {name} ({report["seconds"]}s)', flush=True)
    midpoint_timing = MidpointTiming(report, lambda: target.write_text(json.dumps(report, indent=2) + '\n'),
                                     browser_clock=args.measure_rpc_clock)
    phase = 'action'
    def expired(*_):
        raise TimeoutError(f'{phase} budget exhausted; unreached checks are NOT passes')
    signal.signal(signal.SIGALRM, expired)
    signal.signal(signal.SIGTERM, expired)
    signal.alarm(240)
    server = None
    server_log = None
    thread = None
    page = context = driver = None
    owned = set()
    try:
        server_log = (OUT / f'{stem}-server.log').open('x')
        report['serverLog'] = f'.tmp/citisten-river-qa/{stem}-server.log'
        class Handler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, fmt, *values):
                server_log.write((fmt % values).replace(str(ROOT), '.') + '\n')
                server_log.flush()
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{server.server_port}'
        path = '/Games/Citisten3D/index.html'
        entry_url = base + path
        # One exact native entry probe on this owned, listening server. No retry.
        report['preflight'] = {'url': entry_url, 'listening': thread.is_alive(), 'serverAddress': list(server.server_address)}
        checkpoint('ownedServerListening')
        if args.case != 'baseline':
            with urlopen(entry_url, timeout=3) as response:
                body = response.read()
                report['preflight'].update(status=response.status, finalURL=response.geturl(), bytes=len(body))
                assert response.status == 200 and response.geturl() == entry_url and body == (GAME / 'index.html').read_bytes(), 'Exact native entry preflight failed'
            checkpoint('exactNativeEntryProbe')
        from playwright.sync_api import sync_playwright
        driver = sync_playwright().start()
        assert not roots(), 'Foreign browser appeared before launch'
        mobile = args.case == 'mobile'
        context = driver.chromium.launch_persistent_context(str(profile), executable_path='/usr/bin/chromium',
            headless=True, viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 800},
            is_mobile=mobile, has_touch=mobile, device_scale_factor=1, service_workers='block',
            args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        owned = {pid for pid, command in roots().items() if str(profile) in command}
        def exclusive():
            assert len(owned) == 1 and set(roots()) == owned, 'Browser contention invalidates evidence'
        def route(r):
            if urlsplit(r.request.url).netloc == urlsplit(base).netloc:
                r.continue_()
            else:
                report['externalRequests'].append(r.request.url)
                r.abort()
        context.route('**/*', route)
        page = context.pages[0]
        page.set_default_timeout(2000)
        page.on('pageerror', lambda e: report['errors'].append(str(e)))
        page.on('console', lambda m: report['errors'].append(m.text) if m.type == 'error' else None)
        page.on('requestfailed', lambda r: report['errors'].append(f'{r.url}: {r.failure}'))
        page.on('response', lambda r: report['errors'].append(f'HTTP {r.status}: {r.url}') if r.status >= 400 else None)
        cdp = context.new_cdp_session(page) if mobile else None
        def state():
            return observed_state(page, exclusive, report, midpoint_timing)
        def wait(predicate, seconds=12):
            return observed_wait(page, predicate, seconds, timing=midpoint_timing)
        def tap_xy(x, y):
            if mobile:
                page.touchscreen.tap(x, y)
            else:
                page.mouse.click(x, y)
        def click(selector):
            for attempt in range(3):
                info = target_diagnostic(page, selector, report)
                assert info['count'] == 1, f'Expected one visible selector: {selector}'
                assert not info['disabled'], f'Disabled: {selector}'
                assert info['box'], f'No box: {selector}'
                x, y = info['x'], info['y']
                if info['hit']:
                    tap_xy(x, y)
                    return
                # Same read-only scroll/hit predicates, one DOM round trip.
                area = info['area']
                assert area and attempt < 2, f'Occluded, no native scroll route: {selector}'
                sx = area['x'] + area['width'] * .75
                sy = max(8, min(page.viewport_size['height']-8, area['y'] + area['height'] * .7))
                delta = min(160, area['height'] * .5) * (1 if y > sy else -1)
                if mobile:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': sx, 'y': sy}]})
                    try:
                        for i in range(1, 7):
                            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': sx, 'y': sy-delta*i/6}]})
                    finally:
                        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
                else:
                    page.mouse.move(sx, sy); page.mouse.wheel(0, delta)
                page.wait_for_timeout(150)
        def input_sample(stage):
            return observed_input(page, exclusive, report, start, stage, midpoint_timing)
        def speed(value):
            return observed_speed(page.keyboard.press, input_sample, wait, state, value, midpoint_timing)
        def visible(selector):
            info = target_diagnostic(page, selector, report)
            return info['box'] and info['style']['visibility'] != 'hidden'
        def tool(name):
            groups = {'road': 'Road', 'bridge': 'Road', 'residential': 'Zone', 'commercial': 'Zone',
                      'apartments': 'Zone', 'power': 'Service', 'water': 'Service', 'park': 'Service'}
            selector = f'[data-tool="{name}"]'
            if not visible(selector):
                click(f'[data-group="{groups[name]}"]')
                wait(lambda: visible(selector), 12)
            if not (args.case == 'baseline' and name == 'road'):
                click(selector)
            wait(lambda: page.evaluate('citisten.tool') == name, 12)
        def collapse_space():
            for selector in ('.city-map', '#native-controls details'):
                if page.locator(selector).count() and page.locator(selector).get_attribute('open') is not None:
                    click(selector + ' > summary')
        def camera_input(action):
            # Existing pad only; expose/collapse using real taps/clicks, never setPose.
            selector = f'[data-camera="{action}"]'
            if not visible(selector):
                click('#native-controls details > summary')
            before = page.evaluate('citisten.world.controls.target')
            click(selector)
            collapse_space()
            wait(lambda: page.evaluate('''() => {const {world}=citisten,p=world.controls.target,c=world.camera.position;
              return Math.hypot(c.x-p.x,c.y-p.y,c.z-p.z)<1;}'''), 6)
            checkpoint('camera:' + action + ':' + str(len(report.get('cameraInputs', []))), {'before': before, 'after': page.evaluate('citisten.world.controls.target')})
            report.setdefault('cameraInputs', []).append(action)
        def visible_plan():
            collapse_space()
            layout = page.evaluate(PLAN)
            for action in ('up', 'left', 'up', 'back'):
                if layout:
                    break
                camera_input(action)
                layout = page.evaluate(PLAN)
            assert layout, 'No composed unobscured full crossing/city after four real pad inputs; product camera/layout needs diagnosis'
            checkpoint('composedVisiblePlan', layout)
            return layout
        def replay_tutorial(exit_action):
            chosen = int(input_sample('beforeReplay')['selectedSpeed'])
            click('.city-top [data-action="menu"]')
            wait(lambda: state()['speed'] == 0 and page.locator('.city-menu').get_attribute('open') is not None)
            click('[data-action="tutorial"]')
            wait(lambda: input_sample('replayOpen')['tutorialOpen'])
            if exit_action == 'Finish':
                for _ in range(5):
                    click('[data-action="tutorial-next"]')
            elif exit_action == 'Escape':
                page.keyboard.press('Escape')
            else:
                click('[data-action="tutorial-close"]')
            wait(lambda: not input_sample('replayClosed')['tutorialOpen'], 12)
            assert page.locator('.city-menu').get_attribute('open') is not None and state()['speed'] == 0
            click('[data-action="resume"]')
            wait(lambda: state()['speed'] == chosen and page.locator('.city-menu').get_attribute('open') is None, 12)
            checkpoint('menuReplay:' + exit_action, input_sample('replayRestored'))
        def point(lot):
            q = page.evaluate(PROJECT, {'x': lot['x'], 'z': lot['z']})
            assert q, f'Lot occluded/offscreen; no force click: {lot}'
            return q
        def drag(a, b):
            p, q = point(a), point(b)
            if mobile:
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': p['x'], 'y': p['y']}]})
                try:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': q['x'], 'y': q['y']}]})
                finally:
                    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            else:
                page.mouse.move(p['x'], p['y']); page.mouse.down()
                try:
                    page.mouse.move(q['x'], q['y'], steps=1)
                finally:
                    page.mouse.up()
        def build(lot):
            tool(lot['type']); q = point(lot); tap_xy(q['x'], q['y'])
            wait(lambda: any(b['type'] == lot['type'] and b['x'] == lot['x'] and b['z'] == lot['z'] for b in state()['buildings']), 3)
        def shot(name):
            guard(); exclusive()
            capture_shot(page, OUT / f'{stem}-{name}.jpg', name, state, input_sample, report, checkpoint)
        page.goto(entry_url, wait_until='commit', timeout=15000)
        page.wait_for_function('window.citisten?.world.loaded', timeout=45000)
        checkpoint('actualEntryReady')
        click('.city-mode-cards [data-mode="free"]')
        checkpoint('freeBuildInputSent')
        wait(lambda: state() is not None)
        checkpoint('freeBuildStarted', state())
        if page.locator('.city-tutorial').is_visible():
            click('[data-action="tutorial-close"]')
            input_sample('afterTutorialCloseClick')
            # close is queued: resume restores 1x AND focuses canvas asynchronously.
            wait(lambda: tutorial_resumed(input_sample('awaitTutorialResume')), 12)
            checkpoint('tutorialResumeSettled')
        input_sample('beforeSpeedInput')
        if args.case == 'desktop':
            speed(3)
            for exit_action in ('Close', 'Finish', 'Escape'):
                replay_tutorial(exit_action)
        if args.case == 'input':
            click('#speed')
            input_sample('afterSpeedClick')
            page.keyboard.press('Escape')
            input_sample('afterPopupEscape')
            # Leave via Tab, then the helper reaches the CLOSED select via Tab.
            page.keyboard.press('Tab')
            input_sample('afterPopupTabAway')
        speed(0)
        checkpoint('speedPaused', state())
        if args.case == 'input':
            for value in (1, 3, 10, 0):
                speed(value)
                checkpoint(f'nativeSpeed:{value}', input_sample('speedVerified'))
            checkpoint('inputDiagnosisOnlyNoGameplayClaim')
        else:
            if args.case != 'baseline':
                s = state()
                assert s['terrainLayout'] == 'river-v1' and s['timedConstruction'] is True and s['progressionEnabled'] is True
                checkpoint('productionFlags', s)
                tool('road'); layout = visible_plan(); river = layout
                before = state(); drag(river['a'], river['b'])
                assert state() == before, 'Invalid ordinary water road mutated paused state'
                assert 'bridge' in page.locator('#feedback').inner_text().lower()
                checkpoint('ordinaryRoadWaterRejected')
                tool('bridge'); drag(river['a'], river['b'])
                s = state(); assert len(s['roads']) > len(before['roads'])
                assert all(river['a']['z']*200+x in s['roads'] for x in range(river['a']['x'], river['b']['x']+1))
                cost = len(river['wet'])*90 + (len(river['bridge'])-len(river['wet']))*10
                assert s['budget'] == before['budget'] - cost
                route = page.evaluate('({a,b})=>citisten.world.roads.path(a,b)', {'a': river['a'], 'b': river['b']})
                assert len(route) == len(river['bridge'])
                checkpoint('fullBankBridge', {'river': river, 'cost': cost, 'route': route, 'state': s, 'input': 'touch drag' if mobile else 'mouse drag'})
            tool('road')
            drag(layout['road'][0], layout['road'][-1])
            for lot in layout['lots']:
                build(lot)
            initial = state()
            if args.case != 'baseline':
                assert all(b['constructionRemaining'] > 0 for b in initial['buildings'] if b['type'] != 'townhall')
                page.wait_for_timeout(600); assert state() == initial, 'Paused sites progressed'
                checkpoint('nativeTimedSitesPaused', initial)
                if not mobile:
                    shot('desktop-construction')
                speed(10)
                wait(lambda: state()['progressionLevel'] >= 1 and state()['population'] >= 12, 45)
                speed(0)
                grown = state()
                for lot in layout['lots']:
                    building = next(b for b in grown['buildings'] if b['x'] == lot['x'] and b['z'] == lot['z'])
                    assert building['constructionRemaining'] == 0 and building['powered'] and building['watered'], 'Site/utility activation missing'
                assert len([b for b in grown['buildings'] if b['type'] == 'water']) == 1
                checkpoint('naturalLevelOneActivationPopulation', grown)
                checkpoint('westBankWaterSuppliesEastHomeAndJobs')
                extra = layout['extra']; build(extra)
                midpoint, remaining = apartment_midpoint(state, speed, wait, midpoint_timing)
                click('.city-top [data-action="menu"]'); click('#save-town')
                saved = page.evaluate('JSON.parse(localStorage.getItem("citisten-save-v1"))')
                assert saved['state']['speed'] == 0
                checkpoint('midpointSavedViaMenu', {'remaining': remaining, 'state': midpoint})
                page.reload(wait_until='commit', timeout=12000)
                page.wait_for_function('window.citisten?.world.loaded', timeout=20000)
                continue_midpoint(page, click, wait, state, speed, checkpoint, remaining, diagnostic)
                # Reload resets the real camera. Replay only the earlier ordinary inputs.
                collapse_space()
                for action in report.get('cameraInputs', [])[:]:
                    camera_input(action)
                assert all(page.evaluate(PROJECT, {'x': p['x'], 'z': p['z']}) for p in layout['bridge'] + layout['lots']), 'Reload view must show the actual bridge and city'
            else:
                speed(10); wait(lambda: state()['population'] > 0, 8); speed(0)
                checkpoint('originalNativeCity', state())
            prefix = args.case
            shot(prefix + '-dark')
            if args.case != 'baseline':
                click('.city-top [data-action="theme"]')
                assert page.locator('#ui').get_attribute('data-theme') == 'light'
                shot(prefix + '-light')
        assert not report['errors'] and not report['externalRequests'], 'Console/request errors retained in result'
        assert freeze() == expected and baseline_check() == baseline, 'Sources changed during evidence'
        names = ([] if args.case == 'input' else
                 ['desktop-construction', 'desktop-dark', 'desktop-light'] if args.case == 'desktop' else
                 ['mobile-dark', 'mobile-light'])
        capture_gate(report, [OUT / f'{stem}-{name}.jpg' for name in names])
        checkpoint('requiredCapturesComplete')
        report['status'] = 'checks-complete'
    except Exception as error:
        report.update(status='failed', failure=str(error).replace(str(ROOT), '.'))
        if (not isinstance(error, TimeoutError) and not midpoint_timing.data['fatalActionTimeout']
                and not (diagnostic and diagnostic.data.get('fatalActionTimeout'))
                and page and not page.is_closed()):
            try:
                report['failureUI'] = page.evaluate('''() => ({
                  menuError:document.querySelector('.city-menu-error')?.textContent,
                  loading:document.querySelector('#loading')?.textContent,
                  loadingHidden:document.querySelector('#loading')?.hidden,
                  dialogs:[...document.querySelectorAll('dialog')].map(e=>({className:e.className,open:e.open})),
                  feedback:document.querySelector('#feedback')?.textContent,
                  simPresent:Boolean(window.citisten?.sim),speed:window.citisten?.sim?.state.speed,
                  selectedSpeed:document.querySelector('#speed')?.value,
                  activeId:document.activeElement?.id,activeTag:document.activeElement?.tagName,
                  documentFocused:document.hasFocus(),
                  tool:window.citisten?.tool,toolsHidden:document.querySelector('.city-tools')?.hidden,
                  groups:[...document.querySelectorAll('[data-group]')].map(e=>({group:e.dataset.group,expanded:e.getAttribute('aria-expanded')})),
                  tools:[...document.querySelectorAll('[data-tool]')].map(e=>({tool:e.dataset.tool,disabled:e.disabled})),
                  camera:window.citisten?.world.controls.target})''')
                # Keep the remaining five photo slots for planned fresh gameplay.
                input_sample('failure')
            except Exception as diagnostic_error:
                report['diagnosticError'] = str(diagnostic_error).replace(str(ROOT), '.')
        checkpoint('failure')
    finally:
        cleanup_flags = ('browserClosed', 'serverClosed', 'profileRemoved', 'sourcesUnchanged', 'baselineUnchanged', 'freezeFileUnchanged')
        for name in cleanup_flags:
            report.setdefault(name, None)  # Unreached verification is UNKNOWN.
        cleanup_exception = None
        try:
            phase = 'cleanup (25s total, graceful close 12s)'
            cleanup_deadline = time.monotonic() + 25
            def cleanup_alarm(seconds):
                signal.setitimer(signal.ITIMER_REAL, max(.1, min(seconds, cleanup_deadline-time.monotonic())))
            owned |= {pid for pid, command in roots().items() if str(profile) in command}
            cleanup_alarm(12)
            try:
                if context:
                    context.close()
            except Exception as error:
                report['cleanupError'] = str(error).replace(str(ROOT), '.')
                report['immediateCleanup'] = {'browserClosed': not bool(owned & set(roots())), 'profileRemoved': not profile.exists()}
                checkpoint('immediateCleanupFailure')
                cleanup_alarm(7)
                for sig in (signal.SIGTERM, signal.SIGKILL):
                    for pid in owned & set(roots()):
                        try:
                            os.kill(pid, sig)
                        except ProcessLookupError:
                            pass
                    deadline = time.monotonic() + 2
                    while owned & set(roots()) and time.monotonic() < deadline:
                        time.sleep(.1)
            try:
                cleanup_alarm(3)
                if driver:
                    driver.stop()
            except Exception as error:
                report['driverCleanupError'] = str(error).replace(str(ROOT), '.')
                checkpoint('driverCleanupFailure')
            cleanup_alarm(3)
            if server:
                server.shutdown(); server.server_close()
            if thread:
                thread.join(timeout=1)
            if server_log:
                server_log.close()
            report['browserClosed'] = not bool(owned & set(roots()))
            report['serverClosed'] = not thread or not thread.is_alive()
            if report['browserClosed'] and profile.exists():
                shutil.rmtree(profile)  # Owned repository-local profile only.
            report['profileRemoved'] = not profile.exists()
            report['sourcesUnchanged'] = freeze() == expected
            report['baselineUnchanged'] = baseline_check() == baseline
            report['freezeFileUnchanged'] = hashlib.sha256(freeze_path.read_bytes()).hexdigest() == report['freezeFileSHA256']
            report['freeBytesAfter'] = shutil.disk_usage(ROOT).free
            if report.get('cleanupError'):
                followup = OUT / f'{stem}-cleanup-followup.json'
                with followup.open('x') as receipt:
                    receipt.write(json.dumps({'followupOnly': True, **{k: report[k] for k in cleanup_flags}}, indent=2)+'\n')
            if (report['status'] == 'checks-complete' and all(report[k] for k in cleanup_flags)
                    and not report['errors'] and not report['externalRequests'] and not report['captureErrors']
                    and not report.get('cleanupError') and not report.get('driverCleanupError')):
                report['status'] = 'complete'
            else:
                report['status'] = 'failed'
            report['acceptanceOutcome'] = ('not-completed-diagnostic-setup-failure'
                                           if diagnostic and diagnostic.data.get('diagnosticSetupException')
                                           else report['status'])
            if diagnostic:
                diagnostic.acceptance(report['acceptanceOutcome'])  # host-only; also after fatal action timeout
                report['diagnosticOutcome'] = diagnostic.data['diagnosticOutcome']
                report['continueAcceptanceOutcome'] = diagnostic.data['continueAcceptanceOutcome']
            elif args.measure_continue:
                report['diagnosticOutcome'] = 'not-reached'
            checkpoint('finished')
        except BaseException as error:
            cleanup_exception = error
            raise
        finally:
            try:
                signal.setitimer(signal.ITIMER_REAL, 0)
            except BaseException as error:
                if cleanup_exception is None:
                    cleanup_exception = error
                    raise
            finally:
                if cleanup_exception is not None:
                    try:
                        cleanup_failure_receipt(report, target, cleanup_exception, diagnostic)
                    except BaseException:
                        pass  # Host sink/metadata errors cannot replace the primary abort.
    raise SystemExit(0 if report['status'] == 'complete' else 1)


if __name__ == '__main__':
    main()
