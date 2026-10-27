"""Browser-free hero regressions."""
import ast
import base64
import contextlib
import copy
import importlib.util
import io
import json
import subprocess
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

GAME = Path(__file__).resolve().parent
sys.path.insert(0, str(GAME))
spec = importlib.util.spec_from_file_location('native_hero_qa', GAME / 'native-hero-qa.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)
SOURCE = (GAME / 'native-hero-qa.py').read_text()
TREE = ast.parse(SOURCE)

class NativeHeroQA(unittest.TestCase):
  def test_cli_choices_before_browser_imports(self):
    assert qa.HEROES == ('ribbon-seraph', 'spoollash', 'checkmate-regent', 'prism-warden')
    for hero in qa.HEROES:
      assert qa.parse_args(['--hero', hero]).hero == hero
    for argv in ([], ['--hero', 'stampead'], ['--hero', 'all'], ['--hero', '../bad']):
      with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
        qa.parse_args(argv)
      assert caught.exception.code == 2
    assert 'playwright.sync_api' not in sys.modules and 'PIL.Image' not in sys.modules

  def test_process_guard_checks_process_identity_not_shell_text(self):
    rows = '''1 S bash bash -c chromium --remote-debugging-pipe
2 Z chromium chromium --type=renderer
3 S chromium /usr/bin/chromium --type=renderer
4 S node node local/playwright/cli.js run-driver
5 S python3 python3 native-hero-qa.py --hero spoollash
6 S chrome-headless-shell chrome-headless-shell --no-sandbox'''
    assert [r[0] for r in qa.active_browsers(rows)] == ['3', '4', '6']

  def test_network_and_path_guards(self):
    origin = 'http://127.0.0.1:1234'
    for url in (origin + '/Games/a', 'data:image/png;base64,x', 'blob:' + origin + '/id'):
      self.assertTrue(qa.local_url(url, origin))
    for url in ('https://example.test/a', origin + '.evil/a', 'http://localhost:1234/a', 'file:///tmp/a', 'blob:https://example.test/id'):
      self.assertFalse(qa.local_url(url, origin))
    for path in ('/home/someone/private/profile', '/dev/shm/profile-1'):
      assert path.split('/')[1] not in qa.safe_error('failed '+path)

  def test_selected_model_pins_reject_stale_or_missing_models(self):
    for hero in qa.HEROES:
      models = [{'id': name} for name in qa.MODEL_IDS]
      receipt = json.loads((GAME / 'models' / hero / 'receipt.json').read_text())
      selected = next(m for m in models if m['id'] == hero)
      selected.update({k: receipt[k] for k in ('sha256', 'bytes', 'triangles')})
      snapshot = {'models': models, 'runtime': {'hero': hero}, 'diagnostics': {'triangles': 1}}
      assert qa.check_model(snapshot, hero)['sha256'] == receipt['sha256']
      selected['sha256'] = 'stale'
      with self.assertRaises(AssertionError):
        qa.check_model(snapshot, hero)
      selected['sha256'] = receipt['sha256']
      snapshot['models'] = models[:-1]
      with self.assertRaises(AssertionError):
        qa.check_model(snapshot, hero)

  def test_disk_floor_and_total_write_budget(self):
    assert qa.FLOOR == 2178940928 and qa.MAX_BYTES <= 12000000
    for free in (qa.FLOOR, qa.FLOOR + 1):
      with patch.object(qa.subprocess, 'check_output', return_value=f'Avail\n{free}\n'):
        assert qa.guard() == free
    with patch.object(qa.subprocess, 'check_output', return_value=f'Avail\n{qa.FLOOR - 1}\n'):
      with self.assertRaises(RuntimeError):
        qa.guard()
    existing = Mock()
    existing.is_file.return_value = True
    existing.stat.return_value.st_size = qa.MAX_BYTES
    path = Mock()
    path.exists.return_value = False
    with patch.object(qa, 'guard'), patch.object(qa, 'OUT') as out:
      out.rglob.return_value = [existing]
      with self.assertRaises(RuntimeError):
        qa.write_blob(path, b'x')
      path.write_bytes.assert_not_called()

  def test_native_click_guards_and_timer_stability(self):
    good = dict(bounds=[10, 20, 100, 44], visible=True, enabled=True, inViewport=True, hit=True)
    for case in ('visible', 'enabled', 'inViewport', 'hit', 'moving', 'good'):
      now, page, locator = [0.0], Mock(), Mock()
      page.wait_for_timeout.side_effect = lambda ms: now.__setitem__(0, now[0]+ms/1000)
      locator.evaluate.side_effect = lambda *a, **kw: dict(good, **(
        {'bounds': [now[0]*100, 20, 100, 44]} if case == 'moving' else
        {} if case == 'good' else {case: False}))
      with patch.object(qa.time, 'monotonic', side_effect=lambda: now[0]):
        if case == 'good':
          assert qa.native_click(page, locator) == good and now[0] >= .05
          page.mouse.click.assert_called_once_with(60, 42)
        else:
          with self.assertRaises(TimeoutError):
            qa.native_click(page, locator, timeout=100)
          page.mouse.click.assert_not_called()
    script = r'''
const assert=require('node:assert/strict'), vm=require('node:vm'), expression=JSON.parse(process.argv[1]);
const child={}, cover={};let disabled=false,x=10,style={display:'block',visibility:'visible',opacity:'1'},hit=child;
const el={isConnected:true,parentElement:null,matches:()=>disabled,closest:()=>null,
 contains:t=>t===child,getBoundingClientRect:()=>({x,y:20,width:100,height:44,right:x+100,bottom:64})};
const poll=()=>vm.runInNewContext('('+expression+')(el)',{el,getComputedStyle:()=>style,
 document:{elementFromPoint:()=>hit},innerWidth:1280,innerHeight:720});
assert.equal(poll().hit,true);hit=cover;assert.equal(poll().hit,false);hit=child;
disabled=true;assert.equal(poll().enabled,false);disabled=false;
for(const [key,bad,good] of [['visibility','hidden','visible'],['opacity','0','1'],['display','none','block']]){
 style[key]=bad;assert.equal(poll().visible,false);style[key]=good;}
x=-1;assert.equal(poll().inViewport,false);x=1200;assert.equal(poll().inViewport,false);
'''
    result = subprocess.run(['node', '-e', script, json.dumps(qa.ACTIONABILITY)], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stdout+result.stderr

  def test_native_wheel_then_guarded_click(self):
    now, page, locator = [0.0], Mock(), Mock()
    sample = dict(bounds=[10,650,100,44],visible=True,enabled=True,inViewport=False,hit=False,
      scroll=dict(bounds=[0,0,400,600],top=0,safe=True,dy=102))
    locator.evaluate.side_effect = lambda *a, **k: copy.deepcopy(sample)
    def wheel(*args):
      sample.update(bounds=[10,548,100,44],inViewport=True,hit=True)
      sample['scroll']['top'] = 102
    def wait(ms):
      now[0] += ms/1000
      if now[0] >= .15: wheel()
    page.wait_for_timeout.side_effect = wait
    with patch.object(qa.time,'monotonic',side_effect=lambda:now[0]):
      qa.native_click(page,locator)
    page.mouse.move.assert_called_once_with(200,300)
    page.mouse.wheel.assert_called_once_with(0,102)
    page.mouse.click.assert_called_once_with(60,570)
    assert .2 <= now[0] < 10
    page.reset_mock(); sample.update(inViewport=False,hit=False)
    now[0] = 0
    page.wait_for_timeout.side_effect = lambda ms: now.__setitem__(0,now[0]+ms/1000)
    with patch.object(qa.time,'monotonic',side_effect=lambda:now[0]), self.assertRaises(TimeoutError):
      qa.native_click(page,locator)
    assert now[0] == 10
    page.mouse.wheel.assert_called_once_with(0,102)
    page.mouse.click.assert_not_called()

  def test_cdp_fresh_frame_ack_cleanup_and_errors(self):
    class Session:
      def __init__(self):
        self.count, self.calls, self.acks = 0, [], []
      def on(self, event, callback): self.callback = callback
      def remove_listener(self, event, callback):
        assert callback is self.callback
        self.calls.append('remove')
      def frame(self):
        self.count += 1
        self.callback({'sessionId': self.count,
          'data': base64.b64encode(b'cached' if self.count == 1 else b'fresh').decode(),
          'metadata': dict(timestamp=999 if case == 'stale' else 1000+now[0],
          deviceWidth=1 if case == 'malformed' else 1280, deviceHeight=720, pageScaleFactor=1)})
      def send(self, method, params=None):
        self.calls.append(method)
        if method == 'Page.startScreencast':
          if case == 'start-fail': raise original
          if case not in ('none','bootstrap'): self.frame()
        if method == 'Page.screencastFrameAck':
          if case == 'ack-fail' or case == 'active-late-fail' and params['sessionId'] == 3:
            raise ack_error
          if case in ('reentrant', 'active-late-fail') and params['sessionId'] == 1:
            self.frame()
            if case == 'active-late-fail':
              self.frame()
          self.acks.append(params['sessionId'])
        if method == 'Page.stopScreencast':
          assert info['inflightAcks'] == 0 and 'remove' in self.calls
          self.late()
          if case == 'cleanup-fail': raise RuntimeError('stop failed')
          if case == 'slow-cleanup': now[0] = 12.01
      def late(self):
        before = len(self.calls)
        self.callback({'sessionId': 99})
        assert len(self.calls) == before, 'inactive callback ACKed'
      def detach(self):
        self.calls.append('detach')
        self.late()
    original, ack_error = TimeoutError('start failure'), RuntimeError('ACK failure')
    assert "'#theme' if len(report['captures'])%2 else '#help-open'" in SOURCE
    for case in ('normal', 'normal-help', 'bootstrap', 'reentrant', 'none', 'first-only', 'stale', 'malformed', 'late', 'ack-fail',
      'active-late-fail', 'cleanup-fail', 'slow-cleanup', 'start-fail', 'locked', 'covered', 'hovered', 'offscreen'):
      now, session, info = [0.0], Session(), {}
      page = Mock(viewport_size={'width': 1280, 'height': 720})
      context = Mock(); context.new_cdp_session.return_value = session
      page.locator.return_value.evaluate.return_value = dict(bounds=[10,20,100,44],visible=True,enabled=True,
        inViewport=case!='offscreen',hit=case!='covered',unlocked=case!='locked',hovered=case=='hovered')
      def hover(*args):
        if case not in ('none','first-only','late'): session.frame()
      page.mouse.move.side_effect = hover
      def wait(ms):
        now[0] += ms/1000
        if case == 'late': now[0] = 12.01
      page.wait_for_timeout.side_effect = wait
      with self.subTest(case=case), patch.object(qa.time, 'monotonic', side_effect=lambda: now[0]), \
        patch.object(qa.time, 'time', return_value=1000), patch.object(qa.signal, 'signal'), \
        patch.object(qa.signal, 'setitimer'), patch.object(qa.signal, 'getitimer', return_value=(0, 0)):
        if case in ('normal', 'normal-help', 'bootstrap', 'reentrant'):
          selector='#help-open' if case=='normal-help' else '#theme'
          assert qa.capture_viewport(page, context, info, selector) == b'fresh'
          assert info['accepted'] and info['chosenFrame'] == 2
          assert case != 'reentrant' or session.acks == [2, 1]
          if case=='bootstrap':
            assert page.mouse.move.call_count==2
            assert [c.args[0] for c in page.locator.call_args_list]==['#theme','#help-open']
          if case.startswith('normal'):
            page.mouse.move.assert_called_once_with(60,42)
            page.locator.assert_called_once_with(selector)
            assert info['paintRequested'] and info['hoverSelector']==selector
          page.set_viewport_size.assert_not_called()
          page.mouse.click.assert_not_called()
        else:
          with self.assertRaises(Exception) as caught:
            qa.capture_viewport(page, context, info)
          assert not info['accepted']
          assert case != 'start-fail' or caught.exception is original
          if case in ('ack-fail', 'active-late-fail'):
            assert caught.exception is ack_error and info['callbackErrors']
          if case in ('locked','covered','hovered','offscreen'): page.mouse.move.assert_not_called()
        assert page.mouse.move.call_count<=2
        assert session.calls.count('Page.startScreencast') == 1 and info['inflightAcks'] == 0
        if case not in ('late', 'slow-cleanup'):
          assert session.calls.index('remove') < session.calls.index('Page.stopScreencast')
          assert session.calls[-1] == 'detach'
          session.late()

  def test_failed_gate_probe(self):
    report = dict(requestStarted=['portrait_relief.glb'],requestFinished=[],responses=[{'path':'portrait_relief.glb'}])
    page = Mock()
    page.evaluate.return_value = {'falseParts':['triangles'],'stage':'render'}
    qa.probe_startup(page,report,qa.time.monotonic()+3)
    assert report['startupDiagnostic']['falseParts'] == ['triangles']
    assert report['requestCompletion']['portrait'] == {'responses':1,'requestFinished':0}
    assert report['requestCompletion']['lastUnfinished'] == ['portrait_relief.glb']
    page.evaluate.side_effect = TimeoutError('probe')
    qa.probe_startup(page,report,qa.time.monotonic()+3)
    assert report['diagnosticTimeout'] == 'probe'
    assert page.evaluate.call_count == 2
    assert 'probe_startup(page, report, started+WORK_SECONDS)' in SOURCE

  def test_bot_contact(self):
    before={'hero':{'id':'player','hp':100},'bots':[{'id':'bot','targetId':'player','runtime':{'shots':2,'casts':{}}}]}
    after=copy.deepcopy(before);after['bots'][0]['runtime']['shots']+=1;after['hero']['hp']=90
    assert qa.bot_contact(before,after,False)
    for target,shots,hp,invul in [('other',3,90,False),('player',2,90,False),('player',3,100,False),('player',3,90,True)]:
      after['bots'][0].update(targetId=target,runtime={'shots':shots,'casts':{}});after['hero']['hp']=hp
      with self.assertRaises(AssertionError): qa.bot_contact(before,after,invul)
    after['bots'][0].update(targetId='player',runtime={'shots':2,'casts':{'hook':1}});after['hero']['hp']=100
    assert qa.bot_contact(before,after,True)

  def test_stderr_errors_cannot_pass(self):
    assert qa.audit_stderr('')['clean'] and qa.audit_stderr('')['bytes'] == 0
    assert not qa.audit_stderr('ordinary diagnostic')['clean']
    assert qa.audit_stderr('abc')['bytes'] == 3
    for text in ('Exception in callback', 'Error occurred in event listener', 'Unhandled error',
      'Traceback', 'TargetClosedError: closed', 'RuntimeError: failed', 'x'*65537):
      assert not qa.audit_stderr(text)['clean']

  def test_strict_completion_rejects_partial_or_failed_evidence(self):
    tether = {'targetId': 'bot-3', 'left': 2}
    report = {'hero': 'ribbon-seraph',
      'screenshots': [{'kind': x, 'runtime': {'tether': tether}} for x in ('normal-lobby', 'model-preview', 'native-gameplay')],
      'checks': {'movementMetres': 1, 'weapon': {'before': {'shots': 0}, 'after': {'shots': 1}},
      'reload': {'started': 1, 'completed': True}, 'melee': {'fxBefore': 0, 'fxAfter': 1},
      'abilities': [{'slot': slot, 'id': 'tether' if slot == 1 else 'other',
      'castsBefore': 0, 'castsAfter': 1, 'cooldownAfter': 1, 'fxAfter': 1} for slot in range(1, 5)],
      'botCombatObserved': True,
      'tether': {'targetId': 'bot-3', 'sourceTeam': 'carbon', 'range': 14, 'breakDistance': 22,
      'before': {'id': 'bot-3', 'alive': True, 'team': 'ivory', 'hp': 100, 'moveSpeed': 8},
      'linked': {'hp': 80, 'moveSpeed': 5.6, 'time': 75, 'tether': tether},
      'broken': {'hp': 80, 'moveSpeed': 8, 'time': 75, 'tether': None}}},
      'responses': [{'status': 200}], 'errors': [], 'stderrAudit': {'clean': True}, 'sourcesUnchanged': True,
      'cleanup': {'browserClosed': True, 'serverClosed': True}}
    def reject(path, value):
      broken = copy.deepcopy(report)
      target = broken
      for key in path[:-1]:
        target = target[key]
      target[path[-1]] = value
      with self.assertRaises(AssertionError, msg=str(path)):
        qa.require_evidence(broken)
    qa.require_evidence(report)
    for key, bad in [('screenshots', []), ('responses', []), ('responses', [{'status': 404}]),
      ('errors', ['failed request']), ('stderrAudit', {'clean': False}), ('sourcesUnchanged', False),
      ('cleanup', {'browserClosed': False, 'serverClosed': True})]:
      reject([key], bad)
    for key in ('castsAfter', 'cooldownAfter', 'fxAfter'):
      reject(['checks','abilities',0,key], 0)
    for stage, key, value in [('linked','hp',100), ('linked','moveSpeed',8), ('broken','hp',79),
      ('broken','moveSpeed',5.6), ('broken','tether',tether), ('broken','time',76)]:
      reject(['checks','tether',stage,key], value)
    reject(['checks','botCombatObserved'], False)
    for hero in ('checkmate-regent', 'prism-warden'):
      report['hero'] = hero
      report['checks']['targetHit'] = {'targetId':'bot-3', 'before':{'id':'bot-3','alive':True,'hp':100},
        'after':{'id':'bot-3','hp':70}}
      qa.require_evidence(report)
      reject(['checks','targetHit','after','hp'], 100)

  def test_real_fixture_aim_points_are_readonly_and_orbs_unchanged(self):
    script = r'''
import assert from 'node:assert/strict';
import {mountFixtures} from './Games/Jankolock3D/integration-fixtures.mjs';
const seen=[];
class Point {
  constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}
  clone(){return new Point(this.x,this.y,this.z);}
  set(x,y,z){Object.assign(this,{x,y,z});return this;}
  project(){seen.push([this.x,this.y,this.z]);return {x:0,y:0};}
}
const entity=(id,kind,x,y,z)=>Object.freeze({id,kind,hp:100,alive:true,position:Object.freeze({x,y,z})});
const sim=Object.freeze({orbs:Object.freeze([entity('orb','orb',1,2,3)]),
  heroes:Object.freeze([entity('hero','hero',4,5,6),entity('orb','hero',99,99,99)]),
  troopers:Object.freeze([entity('trooper','trooper',7,8,9)]),
  structures:Object.freeze([entity('structure','structure',10,11,12)])});
const before=JSON.stringify(sim);
let aimed=0,rendered=0,updated=0,matrices=0;
const host={sim,controller:{position:new Point(),yaw:0,pitch:0,updateCamera(){updated++;}},
  runtime:{aim(){aimed++;}},actors:{sync(){}},ui:{update(){}},
  view:{camera:{updateMatrixWorld(){matrices++;}},syncStructures(){},renderCamera(){rendered++;}}};
const api=mountFixtures(host);
for(const [id,expected] of [['orb',[1,2,3]],['hero',[4,5.9,6]],['trooper',[7,8.9,9]],['structure',[10,17,12]]]){
  seen.length=0;api.aimAt(id);
  assert.equal(seen.length,40);for(const point of seen)assert.deepEqual(point,expected);
}
assert.equal(aimed,4);assert.equal(rendered,4);assert.equal(updated,4*41);assert.equal(matrices,4*40);
assert.throws(()=>api.aimAt('missing'),/Unknown QA aim target/);
assert.equal(JSON.stringify(sim),before,'aimAt mutated simulation');
console.log('PASS aimAt: readonly centers');
'''
    result = subprocess.run(['node', '--input-type=module', '-'], input=script, text=True,
      cwd=qa.ROOT, capture_output=True, timeout=10)
    assert result.returncode == 0, result.stdout+result.stderr
    assert 'PASS aimAt:' in result.stdout
    print(result.stdout.strip())

  def test_source_boundaries_timeouts_and_native_event_order(self):
    import re
    assert set(re.findall(r'window\.jank3dQA\.(\w+)\(', SOURCE)) == {
      'freeze', 'waves', 'place', 'sync', 'inspectHero', 'clearPreview', 'advance', 'aimAt'}
    for text in ('runtime.cast(', 'sim.damage(', 'networkidle', '.dispatchEvent(', 'setInputFiles('):
      assert text not in SOURCE
    for text in ("wait_until='commit'", "executable_path='/usr/bin/chromium'", "tempfile.tempdir = '/dev/shm'",
      'start_new_session=True', 'os.killpg(child.pid, signal.SIGTERM)', 'os.killpg(child.pid, signal.SIGKILL)',
      'signal.setitimer(signal.ITIMER_REAL, WORK_SECONDS)', 'signal.setitimer(signal.ITIMER_REAL, 15)',
      'TOTAL_SECONDS - (time.monotonic() - cli_started)', "page.mouse.click(640, 390)",
      "page.keyboard.down('KeyW')", "native_click(page, page.locator('[data-close]'))",
      "native_click(page, page.get_by_role('button', name='Start match', exact=True))"):
      assert text in SOURCE, text
    assert qa.WORK_SECONDS <= 150 and qa.TOTAL_SECONDS+7 <= 180
    bodies = {n.name: ast.get_source_segment(SOURCE, n) for n in ast.walk(TREE) if isinstance(n, ast.FunctionDef)}
    body = bodies['capture']
    assert body.index("setup('window.jank3dQA.sync()')") < body.index('snapshot = state()')
    body = bodies['native_key']
    assert 'jank3dQA.sync()' not in body
    assert body.index('freeze(false)') < body.index('page.keyboard.press(code)') < body.index("assert state()['paused']")
    for call in ast.walk(TREE):
      if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute):
        if call.func.attr == 'wait_for_function':
          assert next(ast.literal_eval(k.value) for k in call.keywords if k.arg == 'polling') == 50
        if call.func.attr == 'click':
          assert ast.unparse(call.func.value) == 'page.mouse'
        assert call.func.attr != 'screenshot'
    body = bodies['load']
    assert body.index("frame = state()['diagnostics']['frames']") < body.index('native_click(page, page.locator(') < \
      body.index('window.jank3dSnapshot().runtime.hero===hero') < body.index('window.jank3dSnapshot().diagnostics.frames>n')
    assert 'arg=frame' in body[body.index('window.jank3dSnapshot().diagnostics.frames>n'):]
    assert len(SOURCE.encode()) + Path(__file__).stat().st_size <= 60000

if __name__ == '__main__':
  unittest.main(verbosity=2)
