#!/usr/bin/env python3
"""Browser-free regression for native QA runner failure/readiness boundaries."""
import ast
import base64
import hashlib
import json
from pathlib import Path
import subprocess
import sys

import test_foldwild_upgrade as qa


class FakePage:
    def __init__(self, fail=None):
        self.calls = []
        self.fail = fail

    def goto(self, url, **options):
        self.calls.append(('goto', options))
        if self.fail:
            raise self.fail

    def reload(self, **options):
        self.calls.append(('reload', options))

    def wait_for_function(self, expression, **options):
        self.calls.append(('wait', options))
        assert 'foldwildSnapshot' in expression or 'document.fonts' in expression


def raises(error):
    raise error


def check_capture():
    class Clock:
        now = 0
        def __call__(self):
            return self.now

    class Session:
        def __init__(self, clock, delivery, broken=False, slow_cleanup=False):
            self.clock, self.delivery = clock, delivery
            self.broken, self.slow_cleanup = broken, slow_cleanup
            self.calls = []
            self.frame_count = 0
            self.completed_acks = []
        def on(self, event, callback):
            assert event == 'Page.screencastFrame'
            self.callback = callback
        def remove_listener(self, event, callback):
            assert event == 'Page.screencastFrame' and callback is self.callback
            self.calls.append(('remove-listener', None))
        def send(self, method, params=None):
            self.calls.append((method, params))
            if method == 'Page.startScreencast' and self.broken:
                raise original
            if method == 'Page.startScreencast' and self.delivery in ('late', 'late-second'):
                if self.delivery == 'late':
                    self.clock.now = 3.01
                self.frame()
            if method == 'Page.screencastFrameAck':
                if self.delivery == 'ack-fail':
                    raise ack_error
                if self.delivery == 'reentrant' and params['sessionId'] == 1:
                    self.frame()  # Frame2 ACK completes before Frame1 ACK.
                self.completed_acks.append(params['sessionId'])
            if method == 'Page.stopScreencast':
                assert details['inflight_acks'] == 0, 'stop issued before pending ACKs drained'
                assert ('remove-listener', None) in self.calls
                before = len(self.calls)
                self.callback({'sessionId': 99})  # A queued callback, despite listener removal.
                assert len(self.calls) == before, 'inactive stop event issued ACK'
                if self.slow_cleanup:
                    self.clock.now += 3
                if self.broken:
                    raise RuntimeError('secondary stop failure')
        def frame(self):
            self.frame_count += 1
            pixels = b'cached-old-frame' if self.frame_count == 1 else b'viewport-pixel-fixture'
            self.callback({'sessionId': self.frame_count, 'data': base64.b64encode(pixels).decode(),
                           'metadata': {'sequence': self.frame_count, 'deviceWidth': Page.viewport_size['width'], 'deviceHeight': 844, 'pageScaleFactor': 1}})
        def detach(self):
            self.calls.append(('detach', None))
            before = len(self.calls)
            self.callback({'sessionId': 100})
            assert len(self.calls) == before, 'inactive detached event issued ACK'
            if self.broken:
                raise RuntimeError('secondary detach failure')

    class Page:
        viewport_size = {'width': 320, 'height': 844}
        def wait_for_timeout(self, ms):
            clock.now += ms / 1000
            if session.delivery == 'frame' or session.delivery in ('first-only', 'reentrant', 'ack-fail') and not session.frame_count:
                session.frame()
            if session.delivery == 'late-second' and session.frame_count == 1:
                clock.now = 3.01
                session.frame()

    class Context:
        def new_cdp_session(self, page):
            return session

    saved_clock = qa.monotonic
    original = TimeoutError('original CDP start failure')
    ack_error = RuntimeError('active ACK failed')
    try:
        for delivery, broken, slow, width in [('frame', False, False, 1280), ('frame', False, False, 390),
                ('frame', False, False, 320), ('none', False, False, 320), ('late', False, False, 320),
                ('first-only', False, False, 320), ('late-second', False, False, 320),
                ('frame', True, False, 320), ('frame', False, True, 320),
                ('reentrant', False, False, 320), ('ack-fail', False, False, 320)]:
            Page.viewport_size = {'width': width, 'height': 844}
            clock = Clock()
            session = Session(clock, delivery, broken, slow)
            qa.monotonic = clock
            shared_errors = []
            details = {'file': 'fake-viewport.jpg', 'callback_errors': shared_errors}
            try:
                pixels = qa.capture_viewport(Page(), Context(), details)
            except Exception as error:
                assert not details['accepted']
                if delivery == 'late':
                    assert details['frames'][0]['elapsed_seconds'] > 3
                if delivery == 'late-second':
                    assert details['chosen_frame'] == 2 and details['frame_elapsed_seconds'] > 3
                if delivery == 'first-only':
                    assert details['frame_count'] == 1 and 'chosen_frame' not in details
                if broken:
                    assert error is original and len(details['cleanup_errors']) == 2
                elif delivery == 'ack-fail':
                    assert error is ack_error and len(shared_errors) == 1
                    report = {'callback_errors': shared_errors, 'failures': [], 'cases': {'case': {}}, 'passed': True}
                    assert qa.record_evidence_failure(report, 'case', error, None) is ack_error
                    decoded = json.loads(json.dumps(report))
                    assert not decoded['passed'] and decoded['callback_errors'][0]['error'] == str(ack_error)
                else:
                    assert isinstance(error, TimeoutError) and (delivery != 'frame' or slow)
            else:
                assert delivery in ('frame', 'reentrant') and not broken and not slow
                if delivery == 'reentrant':
                    assert session.completed_acks == [2, 1]
                assert pixels == b'viewport-pixel-fixture' and details['elapsed_seconds'] <= 3
                assert details['metadata']['deviceWidth'] == width and details['accepted']
                assert details['frame_count'] == 2 and details['chosen_frame'] == 2
                assert [f['metadata']['sequence'] for f in details['frames']] == [1, 2]
                assert details['metadata']['sequence'] == 2
            assert session.calls[0] == ('Page.startScreencast', {'format': 'jpeg', 'quality': 55,
                'maxWidth': width, 'maxHeight': 844, 'everyNthFrame': 1})
            assert sum(method == 'Page.startScreencast' for method, _ in session.calls) == 1
            assert ('Page.stopScreencast', None) in session.calls and session.calls[-1] == ('detach', None)
            assert session.calls.index(('remove-listener', None)) < session.calls.index(('Page.stopScreencast', None))
            before = len(session.calls)
            session.callback({'sessionId': 101})
            assert len(session.calls) == before and details['inflight_acks'] == 0
            if not broken:
                for i in range(1, session.frame_count + 1):
                    assert ('Page.screencastFrameAck', {'sessionId': i}) in session.calls
    finally:
        qa.monotonic = saved_clock
    print('PASS: CDP cached-first/second-fresh absolute3s; listener removed before stop/detach; inactive events never ACK; reentrant ACK2-before-ACK1 selects event2; active ACK errors JSON-FAIL; primary preserved')


def check_ready():
    now = [0]
    class ReadyPage:
        def __init__(self, late=False):
            self.calls, self.frames, self.late = [], 40, late
        def evaluate(self, _expression):
            return {'view': {'mode': 'battle', 'countLoadedModels': 2, 'frames': self.frames,
                             'fallbackModels': [], 'cacheSize': 2}}
        def wait_for_function(self, expression, **options):
            self.calls.append((expression, options))
            if len(self.calls) == 1:
                assert options == {'arg': 'battle', 'timeout': 30000}
                now[0], self.frames = 20, 100  # Models attach only after 20s/old rendered frames.
            else:
                assert options == {'arg': {'mode': 'battle', 'initialFrames': 100}, 'timeout': 10000}
                now[0], self.frames = (30.01 if self.late else 29), 103
    saved = qa.monotonic
    try:
        qa.monotonic = lambda: now[0]
        page = ReadyPage()
        qa.ready(page, 'battle')
        now[0] = 0
        try:
            qa.ready(ReadyPage(late=True), 'battle')
        except TimeoutError:
            pass
        else:
            raise AssertionError('shared30s readiness deadline reset/ignored')
    finally:
        qa.monotonic = saved
    result = subprocess.run(['node', '--input-type=module', '-e', '''
      import assert from 'node:assert/strict';import vm from 'node:vm';
      const [model,fresh]=JSON.parse(process.argv[1]);
      const v={mode:'battle',countLoadedModels:1,frames:100},ctx={window:{foldwildSnapshot:{view:v}}};
      const poll=(expression,arg)=>vm.runInNewContext('('+expression+')(arg)',{...ctx,arg});
      assert.equal(poll(model,'battle'),false);v.countLoadedModels=2;assert.equal(poll(model,'battle'),true);
      const goal={mode:'battle',initialFrames:100};
      assert.equal(poll(fresh,goal),false);v.frames=102;assert.equal(poll(fresh,goal),false);
      v.frames=103;assert.equal(poll(fresh,goal),true);
      v.mode='world';assert.equal(poll(fresh,goal),false);v.mode='battle';v.countLoadedModels=1;
      assert.equal(poll(fresh,goal),false);
    ''', json.dumps([p[0] for p in page.calls])], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stdout + result.stderr
    print('PASS: model delay20s leaves10s of shared30s; baseline AFTER models; actual predicates reject old frames/wrong mode/missing models; late completion fails')


def run():
    check_capture()
    check_ready()
    raw = 'Exception in callback at /machine/path/worker.py:7\nTraceback\nFile "/machine/path/worker.py", line 7\nTargetClosedError: failed\n'
    sanitized, markers = qa.audit_stderr(raw)
    assert len(markers) == 3 and '/machine/path' not in sanitized
    assert not qa.audit_stderr('ordinary diagnostic output')[1]
    assert qa.audit_stderr('Unhandled callback')[1] and qa.audit_stderr('Error occurred in event listener')[1]
    postflight = {'passed': True, 'browser_stopped': True, 'server_stopped': True,
                  'sources_frozen': True, 'assets_frozen': True, 'stderr_audit': {'clean': True}}
    assert qa.clean_postflight(postflight)
    postflight['callback_errors'] = [{'error': 'late active ACK failure'}]
    assert not qa.clean_postflight(postflight)
    postflight['callback_errors'] = []
    postflight['stderr_audit'] = {'clean': not markers, 'error_markers': markers}
    assert not qa.clean_postflight(postflight), 'process/functional PASS cannot waive stderr errors'
    print('PASS: separately captured stderr markers force failed audit even on JSON/process PASS; stack paths sanitized')
    media = {'failures': [], 'cases': {'phone': {'status': 'started'}}, 'passed': True}
    first, second = TimeoutError('first media failure'), TimeoutError('second media failure')
    retained = qa.record_evidence_failure(media, 'phone', first, None)
    retained = qa.record_evidence_failure(media, 'phone', second, retained)
    media['cases']['phone']['functional_passed'] = True  # Independent checks may subsequently succeed.
    assert retained is first and media['primary_failure']['error'] == str(first)
    assert not media['passed'] and media['cases']['phone']['status'] == 'failed'
    assert len(media['cases']['phone']['evidence_failures']) == 2
    print('PASS: media failure stays overall/case FAIL despite later functional success; first original error retained')
    for reload in (False, True):
        page, marks = FakePage(), []
        qa.load_menu(page, marks.append, None if reload else 'http://localhost/game')
        assert page.calls == [('reload' if reload else 'goto', {'wait_until': 'load', 'timeout': 10000}),
                              ('wait', {'timeout': 10000}), ('wait', {'timeout': 10000})]
        assert marks == ['reload-start' if reload else 'navigation-start', 'document-load',
                         'app-menu-ready', 'fonts-ready']

    primary = TimeoutError('original navigation timeout')
    report, marks = {'failures': []}, []
    page = FakePage(primary)
    try:
        try:
            qa.load_menu(page, marks.append, 'http://localhost/game')
        except Exception as error:
            qa.failure(report, 'desktop', error, (
                ('screenshot', lambda: raises(TimeoutError('secondary screenshot timeout'))),
                ('dom', lambda: raises(RuntimeError('secondary page unavailable')))))
            qa.diagnose(report, 'desktop', 'context-close', lambda: raises(RuntimeError('cleanup failure')))
            raise
    except Exception as caught:
        assert caught is primary, 'primary exception replaced by diagnostics/cleanup'
    else:
        raise AssertionError('primary failure swallowed')
    assert marks == ['navigation-start'], 'failed load incorrectly advanced to app readiness'
    assert len(page.calls) == 1, 'navigation retried'
    assert report['failures'] == [{'case': 'desktop', 'type': 'TimeoutError', 'error': str(primary)}]
    assert [e['diagnostic'] for e in report['diagnostic_errors']] == ['screenshot', 'dom', 'context-close']
    assert qa.diagnose(report, 'desktop', 'success', lambda: 7) == 7

    class WildPage:
        def evaluate(self, expression, point_id):
            assert expression.lstrip().startswith('async') and point_id == 'wild-1'
            self.target = {'id': point_id, 'type': 'wild', 'x': 10, 'z': -8, 'label': 'Budriv'}
            return self.target

        def wait_for_function(self, expression, **options):
            assert options == {'arg': self.target, 'timeout': 45000}
            self.expression = expression

    wild = WildPage()
    assert qa.wait_for_wild(wild, 'wild-1') is wild.target
    # Execute the ACTUAL polling expression against far/near/disabled/wrong-label fixtures.
    # Also demonstrate why the historical async false predicate incorrectly stopped polling.
    result = subprocess.run(['node', '--input-type=module', '-e', '''
      import assert from 'node:assert/strict'; import vm from 'node:vm';
      const [expression,target]=JSON.parse(process.argv[1]);
      const old=async()=>false; assert.equal(Boolean(old()),true); assert.equal(await old(),false);
      const button={disabled:false,textContent:'E · Meet Budriv'};
      const context={target,foldwildSnapshot:{state:{position:{x:22,z:-26}}},document:{querySelector:()=>button}};
      const poll=()=>{const r=vm.runInNewContext('('+expression+')(target)',context);
        assert.equal(typeof r,'boolean','poll must not return a truthy Promise');return r};
      assert.equal(poll(),false,'far from wild must keep polling');
      context.foldwildSnapshot.state.position={x:11.3,z:-8}; assert.equal(poll(),true);
      button.disabled=true; assert.equal(poll(),false);button.disabled=false;
      button.textContent='Gather supply';assert.equal(poll(),false);button.textContent='E · Meet Budriv';
      context.foldwildSnapshot.state.position={x:11.801,z:-8};assert.equal(poll(),false);
      context.foldwildSnapshot.state.position={x:11.1,z:-8};assert.equal(poll(),false,'standing too close');
      console.log('PASS: Promise(false) pitfall; actual synchronous wild poll rejects far/disabled/wrong-target and accepts arrived');
    ''', json.dumps([wild.expression, wild.target])], capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stdout + result.stderr
    print(result.stdout.strip())

    class SeparationPage:
        def evaluate(self, _expression):
            return {'state': {'position': {'x': 11.3, 'z': -8}}, 'view': {
                'actorPositions': {'wild-1': {'x': 10, 'z': -8}},
                'npcMotion': [{'id': 'rival', 'pose': {'position': {'x': 10, 'z': -8}}}]}}
    assert 1.2 <= qa.separation(SeparationPage(), 'rival')['distance'] <= 1.4
    assert 1.2 <= qa.separation(SeparationPage(), 'wild-1')['distance'] <= 1.4
    # Narrow sparse fonts are read-only Git-backed bytes, not installs/materialization.
    fonts = qa.font_bytes()
    assert tuple(fonts) == qa.FONT_PATHS
    for name, data in fonts.items():
        assert hashlib.sha256(data).digest() == hashlib.sha256(qa.git('show', 'HEAD:' + name)).digest()
    source = Path(qa.__file__).read_text()
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == 'wait_for_function':
            expression = ast.literal_eval(node.args[0])
            assert 'async' not in expression, 'async predicate accidentally reintroduced'
    assert "actions.extend([('drain-acks', drain), ('stop'," in source
    assert "and not report.get('callback_errors')" in source
    assert "report.get('stderr_audit', {}).get('clean', False)" in source
    assert source.index("report['passed'] = clean_postflight(report)") > source.index("'browser-close'")
    assert not any(isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr == 'screenshot'
                   for n in ast.walk(tree)), 'legacy screenshot path reintroduced'
    play = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == 'play')
    direct_calls = [n.value for n in play.body if isinstance(n, ast.Expr) and isinstance(n.value, ast.Call)]
    scripts = [ast.literal_eval(c.args[0]) for c in direct_calls
               if isinstance(c.func, ast.Attribute) and c.func.attr == 'evaluate']
    assert sum('recorder.start()' in s for s in scripts) == 1, 'video start must be unconditional for both cases'
    assert any(isinstance(n, ast.Assign) and isinstance(n.value, ast.Call)
               and isinstance(n.value.func, ast.Attribute) and n.value.func.attr == 'evaluate'
               and 'q.recorder.stop()' in ast.literal_eval(n.value.args[0]) for n in play.body), 'video stop must be unconditional'
    walking = next(c for c in direct_calls if isinstance(c.func, ast.Name) and c.func.id == 'held')
    assert ast.literal_eval(walking.args[2]) == 5 and isinstance(walking.args[3], ast.Name) and walking.args[3].id == 'phone'
    assert "f'{name}-walking.webm'" in source, 'per-case video filename missing'
    assert source.count("tap(page, '#collection-close', phone)") == 1
    assert source.index("mark('single-close-tap')") < source.index("mark('native-walking-video')")
    assert source.index("mark('single-close-tap')") < source.index("mark('offered-wild-marker-route')")
    assert 'playwright.sync_api' not in sys.modules, 'browser tooling imported by browser-free runner'
    print('PASS: exact 10s load/reload; explicit app/font readiness; primary exception preserved despite screenshot/DOM/cleanup failures; no retry; sparse font SHA; no browser imported')


if __name__ == '__main__':
    run()
