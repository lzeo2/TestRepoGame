#!/usr/bin/env python3
"""One bounded native local-entry pass; normal input only, no pose/state grants."""
import argparse
from contextlib import ExitStack
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('local_server', ROOT / 'scripts/serve_wings_local.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def self_check():
    with module.local_server() as url:
        for path in ['index.html', 'models/derived/wings_type45_daring_class.glb', 'fonts/plex-mono-400-latin.woff2']:
            with urlopen(f'{url}/{path}') as response:
                assert response.status == 200
                response.read()
        for path in ['../AGENTS.md', '%2e%2e/AGENTS.md', 'Games/Character%20AI/index.html', 'source/games/wings/src/main.ts']:
            try:
                urlopen(f'{url}/{path}')
            except Exception as error:
                assert getattr(error, 'code', None) == 404
            else:
                raise AssertionError(f'Unexpected route: {path}')
    print('PASS local entry/shared assets and negative routes; bounded loopback server closes')
    # CPU mocks only: native() is exercised without a browser or evidence writes.
    from contextlib import contextmanager, redirect_stdout
    from io import StringIO
    from unittest.mock import Mock, patch
    print('CPU COLLECTOR FIXTURES ONLY (no actual browser; synthetic results are not native evidence):')
    cases = ['startup-failure', 'startup-success', 'renderer-failure', 'image-timeout',
             'diagnostics-failure', 'cleanup-abort', 'cleanup-error', 'cleanup-close-error', 'cleanup-external']
    for case in cases:
        events, hooks = [], {}
        server_open = False
        original = TimeoutError('simulated ' + case)
        ready = {'game': {'state': 'spawn'}, 'renderer': {'phase': 'render-return', 'error': '',
                 'worldReady': True, 'render': {'drawCalls': 1}}}
        if case == 'renderer-failure':
            ready['renderer']['error'] = 'simulated late startup failure'
        page = Mock()
        page.on.side_effect = lambda name, callback: hooks.update({name: callback})
        if case in ['startup-failure', 'diagnostics-failure']:
            page.wait_for_function.side_effect = original

        def capture(expression):
            assert server_open and 'stop' not in events and 'close' not in events, events
            events.append('capture')
            if case == 'image-timeout' and ready['renderer']['phase'] == 'after-image':
                hooks['requestfailed'](Mock(url='http://127.0.0.1:1/models/diagnostic.glb', failure='net::ERR_ABORTED'))
            if case == 'diagnostics-failure':
                raise RuntimeError('simulated diagnostic evaluation failure')
            return json.loads(json.dumps(ready))

        def image(**kwargs):
            assert server_open and 'stop' not in events and 'close' not in events, events
            name = Path(kwargs['path']).name
            events.append(name)
            if name == 'startup-ready.png':
                assert events[-2] == 'capture', 'Ready DTO must precede startup image'
                assert kwargs['timeout'] == 10000
                if case == 'image-timeout':
                    hooks['requestfailed'](Mock(url='http://127.0.0.1:1/models/startup.glb', failure='net::ERR_ABORTED'))
                    ready['renderer']['phase'] = 'after-image'
                    raise original
            if name in ['startup-failure.png', 'failure.png']:
                assert kwargs['timeout'] == 5000
                if case == 'diagnostics-failure':
                    raise RuntimeError('simulated diagnostic image failure')

        def close_browser():
            assert server_open
            events.append('close')
            if case == 'cleanup-close-error':
                raise RuntimeError('simulated browser close failure')
            if case in ['cleanup-abort', 'image-timeout']:
                hooks['requestfailed'](Mock(url='http://127.0.0.1:1/models/carrier.glb', failure='net::ERR_ABORTED'))
            if case == 'cleanup-error':
                hooks['pageerror']('simulated cleanup page error')

        def stop_driver():
            assert server_open and events[-1] == 'close', events
            events.append('stop')
            if case == 'cleanup-abort':
                hooks['requestfailed'](Mock(url='http://127.0.0.1:1/models/destroyer.glb', failure='net::ERR_ABORTED'))
            if case == 'cleanup-external':
                hooks['request'](Mock(url='https://example.invalid/unexpected'))

        @contextmanager
        def server():
            nonlocal server_open
            server_open = True
            events.append('server-open')
            try:
                yield 'http://127.0.0.1:1'
            finally:
                assert events[-2:] == ['close', 'stop'], events
                events.append('server-close')
                server_open = False

        page.evaluate.side_effect = capture
        page.screenshot.side_effect = image
        browser, driver, manager = Mock(), Mock(), Mock()
        browser.new_context.return_value.new_page.return_value = page
        browser.close.side_effect = close_browser
        driver.chromium.launch.return_value = browser
        driver.stop.side_effect = stop_driver
        manager.start.return_value = driver
        caught = None
        with patch('playwright.sync_api.sync_playwright', return_value=manager), \
             patch.object(module, 'local_server', side_effect=server), \
             patch('subprocess.run', return_value=Mock(stdout='')), patch.object(Path, 'mkdir'), \
             patch.object(Path, 'write_text') as write, patch.dict(os.environ), redirect_stdout(StringIO()) as output:
            try:
                native(ROOT / '.tmp/collector-cpu-fixture', startup_only=True)
            except Exception as error:
                caught = error
            report = json.loads(write.call_args.args[0])
        assert events[-3:] == ['close', 'stop', 'server-close'] and not server_open, events
        assert not page.keyboard.mock_calls and not page.mouse.mock_calls
        page.set_viewport_size.assert_not_called()
        if case == 'startup-success':
            assert caught is None and report['result'] == 'PASS_INSTRUMENTED_STARTUP_ONLY_NOT_FLIGHT'
        else:
            assert caught is not None and report['result'] == 'FAIL'
            assert '"result": "PASS' not in output.getvalue()
        if case in ['startup-failure', 'diagnostics-failure', 'image-timeout']:
            assert caught is original and report['exception'] == str(original)
        if case == 'startup-failure':
            assert 'startup' in report and 'last' in report and 'captureError' not in report
            assert events.count('startup-failure.png') == 1 and 'failure.png' not in events
        if case == 'image-timeout':
            assert report['startup']['renderer']['phase'] == 'render-return'
            assert report['last']['renderer']['phase'] == 'after-image'
            assert report['captureError'] == str(original)
            assert [r['collectorPhase'] for r in report['failed']] == ['run', 'failure-capture', 'cleanup']
            assert all(r['error'] == 'net::ERR_ABORTED' and r['observedMs'] >= 0 for r in report['failed'])
            assert [e for e in events if e.endswith('.png')] == ['original-menu.png', 'startup-ready.png']
        if case == 'diagnostics-failure':
            assert 'diagnostic evaluation failure' in report['captureError']
        if case == 'cleanup-abort':
            assert len(report['failed']) == 2
            assert all(r['error'] == 'net::ERR_ABORTED' and r['collectorPhase'] == 'cleanup'
                       and 0 <= r['observedMs'] <= report['durationSeconds'] * 1000 + 1 for r in report['failed'])
            assert report['failed'][0]['observedMs'] <= report['failed'][1]['observedMs']
        if case == 'cleanup-error':
            assert report['errors'] == ['simulated cleanup page error']
        if case == 'cleanup-close-error':
            assert report['cleanupErrors'] == ['browser: simulated browser close failure']
        if case == 'cleanup-external':
            assert report['external'] == ['https://example.invalid/unexpected']
        print(f'PASS CPU mock case: {case}; server/browser/driver order and no startup inputs')


def native(out, startup_only=False):
    from playwright.sync_api import sync_playwright
    roots = ''.join(subprocess.run(['pgrep', '-ax', name], capture_output=True, text=True).stdout
                    for name in ['chromium', 'chrome'])
    assert not roots.strip(), f'Browser queue occupied: {roots}'
    assert shutil.disk_usage(ROOT).free >= 2147483648
    assert out.is_relative_to(ROOT / '.tmp'), 'Evidence stays in the assigned ignored workspace'
    out.mkdir(parents=True, exist_ok=False)
    # Chromium's Unix socket path must fit sun_path; keep its owned temp root short.
    temporary = ROOT / '.tmp/t'
    temporary.mkdir(exist_ok=True)
    os.environ['TMPDIR'] = str(temporary)
    report = {'scope': 'local original UI/GameSession, no state grants or publication', 'errors': [], 'failed': [], 'external': [], 'phases': {}}
    start = time.monotonic()
    browser = None
    playwright = None
    page = None
    server = ExitStack()
    primary_error = None
    collector_phase = 'run'
    image_failed = False
    failure_image_taken = False

    def screenshot(name, **kwargs):
        nonlocal image_failed
        try:
            page.screenshot(path=str(out / name), **kwargs)
        except Exception as error:
            image_failed = True
            report.setdefault('captureError', str(error))
            raise

    def diagnostics(key, image):
        nonlocal collector_phase, failure_image_taken
        collector_phase = 'failure-capture'
        try:
            report[key] = page.evaluate('({game:window.__wings?.game, stats:window.__wings?.stats, renderer:window.__wings?.startup, error:document.querySelector("#render-error pre")?.textContent, toast:document.querySelector("#toast")?.textContent})')
        except Exception as error:
            report.setdefault('captureError', str(error))
        if not image_failed and not failure_image_taken:
            failure_image_taken = True
            try:
                screenshot(image, timeout=5000)
            except Exception:
                pass  # screenshot retained its error; never replace the primary failure.

    try:
        url = server.enter_context(module.local_server())
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, timeout=30000,
            args=['--no-sandbox', '--disable-dev-shm-usage', '--disk-cache-size=8388608', '--media-cache-size=1048576',
                  '--disable-gpu-shader-disk-cache', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        context = browser.new_context(viewport={'width': 960, 'height': 640}, reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda error: report['errors'].append(str(error)))
        page.on('console', lambda message: report['errors'].append(message.text) if message.type == 'error' else None)
        page.on('requestfailed', lambda request: report['failed'].append({'url': request.url.replace(url, ''), 'error': request.failure,
            'observedMs': round((time.monotonic() - start) * 1000, 3), 'collectorPhase': collector_phase}))
        page.on('request', lambda request: report['external'].append(request.url) if request.url.startswith(('http:', 'https:')) and not request.url.startswith(url + '/') else None)
        page.add_init_script("localStorage.setItem('wings.settings',JSON.stringify({quality:'low',muted:true}));localStorage.setItem('wings.autoQuality','1')")
        page.goto(url + '/index.html?webgl', wait_until='domcontentloaded', timeout=30000)
        screenshot('original-menu.png')
        page.locator('#screen .mi .t').get_by_text('Factions', exact=True).click()
        try:
            page.wait_for_function("window.__wings?.game?.state === 'spawn' && window.__wings.game.fleet?.frame?.units?.length === 2", timeout=60000)
        except Exception:
            diagnostics('startup', 'startup-failure.png')
            raise
        report['phases']['spawn'] = page.evaluate('window.__wings.game')
        report['startup'] = page.evaluate('({game:window.__wings?.game, renderer:window.__wings?.startup})')
        if startup_only:
            screenshot('startup-ready.png', timeout=10000)
            report['startup'] = page.evaluate('({game:window.__wings?.game, renderer:window.__wings?.startup})')
            observed = report['startup']['renderer']
            # GameSession creation passed initial world readiness; spawn-camera LOD gaps are permitted.
            assert observed['render']['drawCalls'] > 0 and not observed['error'], observed
            assert not report['errors'] and not report['failed'] and not report['external'], report
            report['result'] = 'PASS_INSTRUMENTED_STARTUP_ONLY_NOT_FLIGHT'
            return
        assert page.locator('.spawn .tabs').is_hidden(), 'No player naval seats in Factions'
        page.keyboard.press('1')
        page.wait_for_function("window.__wings?.game?.state === 'flying'", timeout=15000)
        page.wait_for_function("document.querySelectorAll('.hud-obj .cb').length === 2", timeout=10000)
        report['phases']['flying'] = page.evaluate('window.__wings.game')
        initial = report['phases']['flying']
        assert initial['fleet']['objects'] > 0 and initial['fleet']['visible']
        assert initial['fleet']['roots'] == 1
        for model in initial['fleet']['models']:
            state = next(u for u in initial['fleet']['frame']['units'] if u['id'] == model['id'])
            assert model['visible'] and all(abs(a - b) < 1e-6 for a, b in zip(model['position'], state['position']))
        page.keyboard.down('w')
        page.keyboard.down('Shift')
        page.wait_for_function("window.__wings.game.speed > 65", timeout=30000)
        page.keyboard.down('ArrowDown')
        page.wait_for_function("window.__wings.game.pos[1] > 40", timeout=15000)
        page.keyboard.up('ArrowDown')
        page.mouse.move(480, 320)
        page.mouse.down(button='left')
        page.wait_for_function("window.__wings.game.ammo[0] < 600", timeout=20000)
        page.wait_for_timeout(2000)
        page.mouse.up(button='left')
        page.keyboard.up('w')
        page.keyboard.up('Shift')
        report['phases']['flight-fire'] = page.evaluate('window.__wings.game')
        assert report['phases']['flight-fire']['pos'] != initial['pos']
        screenshot('local-factions-flight.png', timeout=20000)
        page.keyboard.press('Escape')
        page.wait_for_selector('.pause:not([hidden])', timeout=10000)
        page.wait_for_timeout(500)
        paused = page.evaluate('window.__wings.game.fleet.hostTick')
        page.wait_for_timeout(700)
        assert page.evaluate('window.__wings.game.fleet.hostTick') == paused
        report['phases']['pausedTick'] = paused
        page.locator('.pause .mi .t').get_by_text('Leave match', exact=True).click()
        page.wait_for_function('window.__wings.game === undefined', timeout=15000)
        report['phases']['menuReturn'] = True
        page.locator('#screen .mi .t').get_by_text('Factions', exact=True).click()
        page.wait_for_function("window.__wings?.game?.fleet?.frame?.units?.length === 2", timeout=30000)
        fresh = page.evaluate('window.__wings.game')
        assert fresh['fleet']['generations'] == 1 and fresh['fleet']['objects'] == initial['fleet']['objects']
        assert fresh['fleet']['roots'] == 1, 'previous scene resources must be removed on leave'
        assert all(u['hp'] == 1000 for u in fresh['fleet']['frame']['units'])
        report['phases']['freshSession'] = fresh
        page.locator('.spawn .mi .t').get_by_text('Leave match', exact=True).click()
        page.wait_for_function('window.__wings.game === undefined', timeout=10000)
        page.set_viewport_size({'width': 390, 'height': 844})
        page.emulate_media(color_scheme='light')
        screenshot('original-menu-mobile-light.png')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        assert not report['errors'] and not report['failed'] and not report['external'], report
        report['result'] = 'PASS_LOCAL_SESSION_FLIGHT_FIRE_FLEET_VIEW_PAUSE_RESTART'
    except Exception as error:
        primary_error = error
        report['result'] = 'FAIL'
        report['exception'] = str(error)
        if page:
            diagnostics('last', 'failure.png')
        raise
    finally:
        collector_phase = 'cleanup'
        for name, close in [('browser', browser.close if browser else None),
                            ('driver', playwright.stop if playwright else None), ('server', server.close)]:
            if close:
                try:
                    close()
                except Exception as error:
                    report.setdefault('cleanupErrors', []).append(f'{name}: {error}')
        late_failure = report['errors'] or report['failed'] or report['external'] or report.get('cleanupErrors')
        if late_failure:
            report['result'] = 'FAIL'
            report.setdefault('exception', 'Collector errors or failed/external requests, including cleanup')
        report['durationSeconds'] = round(time.monotonic() - start, 3)
        try:
            (out / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
            print(json.dumps({'result': report.get('result'), 'seconds': report['durationSeconds'], 'evidence': str(out.relative_to(ROOT))}), flush=True)
        except Exception:
            if primary_error is None:
                raise
        if primary_error is None and late_failure:
            raise AssertionError(report['exception'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-check', action='store_true')
    parser.add_argument('--startup-only', action='store_true', help='Stop after the one instrumented startup result; no flight inputs')
    parser.add_argument('--out', type=Path, default=ROOT / '.tmp/wings-local-evidence')
    args = parser.parse_args()
    if args.self_check:
        self_check()
    else:
        def deadline(*_):
            raise TimeoutError('240-second local native pass deadline')
        signal.signal(signal.SIGALRM, deadline)
        signal.alarm(240)
        native(args.out.resolve(), startup_only=args.startup_only)
