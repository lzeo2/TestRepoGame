#!/usr/bin/env python3
"""Bounded ordinary-input feel check. Main must serialize browser admission.
No grants, injected stepping, renderer retries or synthetic gameplay acceptance.
"""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import platform
import playwright
import shutil
import sys
import stat
import signal
import tempfile
import threading
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
FLOOR = 2_147_483_648
FONT_PATHS = ('assets/fonts/bungee/bungee-400-latin.woff2',
              'assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2',
              'assets/fonts/atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2')
AUDITED_DRIVER = '3258d1cf334c6afc95f22aa9c292436cb976b391e0437f1359c83b84f0cb9d66'
SAFE_ARGS = ('--headless', '--enable-automation', '--remote-debugging-pipe',
             '--no-startup-window', '--no-first-run', '--disable-background-networking')


def check_args(args, profile):
    expected = [*SAFE_ARGS, '--user-data-dir=' + str(profile)]
    if args != expected:
        raise RuntimeError('Unsafe or unaudited Chromium arguments; launch refused')


def safe_host():
    if platform.system() != 'Linux' or platform.machine() != 'x86_64' or os.getuid() == 0 or os.geteuid() == 0:
        raise RuntimeError('Requires an admitted non-root Linux x86_64 sandbox host; no Pi/root fallback')
    if any(value and (key.startswith(('PW_', 'PLAYWRIGHT_', 'SELENIUM_', 'LD_', 'CHROME_', 'CHROMIUM_')) or key in ('NODE_OPTIONS', 'PWDEBUG')) for key, value in os.environ.items()):
        raise RuntimeError('Launch-altering environment present; use the approved clean runner environment')
    driver = Path(playwright.__file__).parent / 'driver/package/lib/coreBundle.js'
    if hashlib.sha256(driver.read_bytes()).hexdigest() != AUDITED_DRIVER:
        raise RuntimeError('Unaudited Playwright driver; review this installed version before launch, do not install or bypass')
    # Bypass distro shell launchers: they can append flags after our argv check.
    for binary in (Path('/usr/bin/chromium').resolve(), Path('/usr/lib/chromium/chromium')):
        if not binary.is_file():
            continue
        with binary.open('rb') as stream:
            elf = stream.read(4) == b'\x7fELF'
        info = binary.stat()
        if elf and info.st_uid == 0 and not info.st_mode & 0o022 and os.access(binary, os.X_OK):
            return str(binary)
    raise RuntimeError('No root-owned, non-writable system Chromium ELF; shell wrappers are not an audited launch route')


def check_profile(profile):
    directory = Path(profile)
    info = directory.lstat()
    if not directory.is_absolute() or not stat.S_ISDIR(info.st_mode) or info.st_uid != os.geteuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise RuntimeError('Chromium profile must be an owned, non-symlink absolute 0700 directory')
    # Chromium mkdtemp uses six random characters; allow the longer dotted prefix
    # and leave room for the terminating NUL in sockaddr_un.sun_path[108].
    maximal_socket = os.fsencode(directory) + b'/.org.chromium.Chromium.XXXXXX/SingletonSocket'
    if len(maximal_socket) >= 108:
        raise RuntimeError('Chromium singleton socket path must be shorter than 108 bytes')


def launch_options(profile, executable):
    check_profile(profile)
    args = [*SAFE_ARGS, '--user-data-dir=' + str(profile)]
    check_args(args, profile)
    return dict(executable_path=executable, headless=True, chromium_sandbox=True,
                ignore_default_args=True, args=args, timeout=20000,
                env={'PATH': os.defpath, 'HOME': str(profile), 'TMPDIR': str(profile), 'LANG': 'C.UTF-8'})


def check_sandbox(rows):
    for label in ('PID namespaces', 'Network namespaces', 'Seccomp-BPF sandbox'):
        if not any(' '.join(row.split()) == label + ' Yes' for row in rows):
            raise RuntimeError('Chromium sandbox not proven active: ' + label)


def main():
    assert sys.argv[1:] in ([], ['--startup-trace']), 'Only --startup-trace is supported'
    diagnostic = sys.argv[1:] == ['--startup-trace']
    executable = safe_host()
    assert shutil.disk_usage(ROOT).free >= FLOOR, 'Disk below 2 GiB floor'
    output = Path(tempfile.mkdtemp(prefix='slipstream-feel-'))
    print('OUTPUT=' + str(output), flush=True)
    files = sorted(set((ROOT / 'Games/Slipstream Borough').glob('*')) |
                   set((ROOT / 'assets/car-arcade').glob('*.js')) |
                   {ROOT / 'assets/car-arcade/style.css', ROOT / 'assets/car-arcade/vendor/three.module.js',
                    ROOT / 'assets/car-arcade/vendor/BufferGeometryUtils.js', Path(__file__)} |
                   {ROOT / path for path in FONT_PATHS})
    def hashes():
        return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    frozen = hashes()
    errors, observations = [], []
    started = time.monotonic()
    receipt = {'assisted': False, 'sourceHashes': frozen, 'errors': errors, 'observations': observations, 'passed': False,
               'startupTrace': [], 'diagnosticX86': diagnostic, 'browserClosed': False}
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_): pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}'
    def expired(*_):
        raise TimeoutError('110-second native harness deadline')
    old_alarm = signal.signal(signal.SIGALRM, expired)
    signal.alarm(110)
    try:
        with tempfile.TemporaryDirectory(prefix='p') as profile, sync_playwright() as pw:
            # Suppress ALL audited Playwright defaults, not just the sandbox bypass.
            browser = pw.chromium.launch(**launch_options(profile, executable))
            try:
                session = browser.new_browser_cdp_session()
                argv = session.send('Browser.getBrowserCommandLine')['arguments']
                if not argv or argv[0] != executable:
                    raise RuntimeError('Unexpected effective Chromium executable')
                check_args(argv[1:], profile)
                receipt['launchPolicy'] = {'driverSha256': AUDITED_DRIVER, 'chromiumSandbox': True,
                                         'effectiveArgs': [*SAFE_ARGS, '--user-data-dir=<owned-profile>']}
                proof = browser.new_context()
                try:
                    page = proof.new_page()
                    page.set_default_timeout(20000)
                    page.goto('chrome://sandbox', wait_until='domcontentloaded', timeout=20000)
                    rows = page.locator('tr').all_text_contents()
                    check_sandbox(rows)
                    receipt['sandboxRows'] = [' '.join(row.split()) for row in rows]
                finally:
                    proof.close()
                receipt['browserVersion'] = browser.version
                def watch(page):
                    page.set_default_timeout(20000)
                    if diagnostic:
                        # Read-only trusted-event/phase markers survive a blocked post-click evaluate.
                        page.add_init_script('''(() => {
                          const emit = (type, trusted = null) => console.info('__SLIPSTREAM_START__' + JSON.stringify({
                            type, trusted, ms: performance.now(), phase: document.documentElement?.dataset.phase,
                            helpOpen: document.querySelector('#helpDialog')?.open
                          }));
                          for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'])
                            document.addEventListener(type, e => { if(e.target?.id === 'start') emit(type, e.isTrusted); }, true);
                          document.addEventListener('DOMContentLoaded', () => {
                            emit('dom-ready');
                            new MutationObserver(() => emit('phase')).observe(document.documentElement,
                              {attributes:true, attributeFilter:['data-phase']});
                          }, {once:true});
                        })();''')
                        def marker(message):
                            if message.text.startswith('__SLIPSTREAM_START__') and len(receipt['startupTrace']) < 64:
                                receipt['startupTrace'].append(json.loads(message.text[len('__SLIPSTREAM_START__'):]))
                        page.on('console', marker)
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
                    page.on('requestfailed', lambda r: errors.append('Request failed: ' + r.url))
                    page.on('response', lambda r: errors.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
                    page.route('**/*', lambda r: r.continue_() if r.request.url.startswith(origin + '/') else (errors.append('External: ' + r.request.url), r.abort()))
                def state(page):
                    return page.evaluate('window.slipstreamSnapshot')
                def ready(page):
                    page.goto(origin + '/Games/Slipstream%20Borough/', wait_until='domcontentloaded')
                    page.wait_for_function('() => window.slipstreamSnapshot?.view?.frames > 1 || !document.querySelector("#renderError").hidden')
                    assert page.locator('#renderError').is_hidden(), 'BLOCKED: real renderer unavailable; no retry'
                    s = state(page)
                    assert s['phase'] == 'garage' and s['run'] is None and s['view']
                    assert s['profile']['cash'] == 0 and not s['profile']['testMode']
                    assert s['profile']['nextRun'] == 1
                    if diagnostic:
                        receipt.setdefault('rendererInfo', []).append(page.evaluate('''() => {
                          const canvas=document.querySelector('#viewport canvas');
                          const gl=canvas.getContext('webgl2') || canvas.getContext('webgl');
                          const ext=gl?.getExtension('WEBGL_debug_renderer_info');
                          return {frames:slipstreamSnapshot.view.frames, version:gl?.getParameter(gl.VERSION),
                            renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null};
                        }'''))
                def start(page, first=False):
                    page.locator('#start').click()
                    page.wait_for_function('slipstreamSnapshot.phase === "run"')
                    if first:
                        assert page.locator('#helpDialog').is_visible() and state(page)['paused']
                        frozen_run = state(page)['run']
                        page.wait_for_timeout(200)
                        assert state(page)['run'] == frozen_run, 'Help must freeze simulation'
                        page.locator('#closeHelp').click()
                    page.wait_for_function('!slipstreamSnapshot.paused && slipstreamSnapshot.run.elapsed > 0')
                def pause_check(page, mobile=False):
                    if mobile: page.locator('#pause').tap()
                    else: page.keyboard.press('p')
                    assert state(page)['paused'] and state(page)['steering'] == 0
                    frozen_run = state(page)['run']
                    page.wait_for_timeout(200)
                    assert state(page)['run'] == frozen_run, 'Paused run changed'
                    if mobile: page.locator('#pause').tap()
                    else: page.keyboard.press('p')
                    assert not state(page)['paused'] and state(page)['steering'] == 0
                def shot(page, name):
                    page.screenshot(path=str(output / (name + '.jpg')), type='jpeg', quality=40)
                desktop = browser.new_context(viewport={'width':960, 'height':640})
                try:
                    page = desktop.new_page(); watch(page); ready(page); start(page, first=True)
                    assert 'patrol' in page.locator('#objective').inner_text().lower()
                    page.keyboard.down('w')
                    try:
                        page.wait_for_function('slipstreamSnapshot.run.speed > 3 && slipstreamSnapshot.run.distance > 1')
                        before = state(page)['run']['world']['heading']
                        page.keyboard.down('d')
                        try:
                            page.wait_for_function('h => slipstreamSnapshot.steering > .2 && Math.abs(slipstreamSnapshot.run.world.heading-h) > .02', arg=before)
                        finally: page.keyboard.up('d')
                        page.wait_for_function('slipstreamSnapshot.steering === 0')
                        page.keyboard.down('s')
                        try:
                            speed = state(page)['run']['speed']
                            page.wait_for_function('s => slipstreamSnapshot.run.speed < s', arg=speed)
                        finally: page.keyboard.up('s')
                    finally: page.keyboard.up('w')
                    pause_check(page)
                    page.keyboard.press('p'); shot(page, 'desktop-driven-turn'); page.keyboard.press('p')
                    # Force no state: ordinary gas reaches a real boundary/building collision.
                    page.keyboard.down('w')
                    try: page.wait_for_function('slipstreamSnapshot.run.collisions > 0', timeout=25000)
                    finally: page.keyboard.up('w')
                    damaged = state(page)
                    assert damaged['run']['hp'] < 100 and page.locator('#recover').is_visible()
                    old_id = damaged['run']['id']
                    bank = damaged['profile']['cash']
                    page.locator('#recover').click()
                    restarted = state(page)
                    assert restarted['phase'] == 'run' and restarted['run']['id'] > old_id
                    assert restarted['run']['hp'] == 100 and restarted['run']['mode'] == 'roam'
                    assert restarted['profile']['cash'] == bank, 'Unfinished respawn must not pay'
                    assert not page.locator('#cruise').is_checked() and restarted['steering'] == 0
                    assert page.locator('#helpDialog').is_hidden()
                    # Drive a fresh stock car, brake on the central road, and meet real patrol.
                    page.keyboard.down('w')
                    try: page.wait_for_function('slipstreamSnapshot.run.distance > 35')
                    finally: page.keyboard.up('w')
                    page.keyboard.down('s')
                    try: page.wait_for_function('slipstreamSnapshot.run.speed <= 0')
                    finally: page.keyboard.up('s')
                    page.wait_for_function('slipstreamSnapshot.run.pursuit === "chased" && slipstreamSnapshot.run.police.length > 0', timeout=25000)
                    chase = state(page)
                    assert chase['run']['arrest'] == 0 and chase['run']['hp'] == 100
                    cop, player = chase['run']['police'][0]['world'], chase['run']['world']
                    assert cop['z'] - player['z'] > 40, 'First real patrol must be behind the northbound player'
                    page.keyboard.press('p'); page.keyboard.press('m'); shot(page, 'desktop-real-patrol')
                    observations.append({'keyboardGasTurnBrake': True, 'pauseFrozen': True, 'realCollisionUnpaidRespawn': True, 'oldRun': old_id, 'newRun': restarted['run']['id'], 'naturalPatrol': chase['run']})
                finally: desktop.close()
                mobile = browser.new_context(viewport={'width':390, 'height':844}, user_agent=PHONE, has_touch=True, is_mobile=True)
                try:
                    page = mobile.new_page(); watch(page); ready(page); start(page, first=True)
                    assert state(page)['phone'] and page.locator('.touch-controls').is_visible()
                    points = []
                    for ident, name in enumerate(['gas', 'left'], 1):
                        box = page.locator(f'[data-drive="{name}"]').bounding_box()
                        assert box and box['width'] >= 44 and box['height'] >= 44
                        points.append({'id': ident, 'x': box['x']+box['width']/2, 'y': box['y']+box['height']/2})
                    cdp = mobile.new_cdp_session(page)
                    cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints': points})
                    try:
                        page.wait_for_function('slipstreamSnapshot.run.speed > 1 && slipstreamSnapshot.steering < -.2 && Math.abs(slipstreamSnapshot.run.world.heading) > .01')
                    finally: cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints': []})
                    page.wait_for_function('slipstreamSnapshot.steering === 0')
                    pause_check(page, mobile=True)
                    shot(page, 'phone-held-touch')
                    observations.append({'genuineHeldTouchGasTurn': True, 'touchRelease': True, 'phonePauseFrozen': True})
                finally: mobile.close()
            finally:
                browser.close()
                receipt['browserClosed'] = True
        assert not errors, errors
        assert hashes() == frozen, 'Source changed during native check'
        assert sum(p.stat().st_size for p in output.glob('*.jpg')) < 300000, 'Capture budget exceeded'
        assert shutil.disk_usage(ROOT).free >= FLOOR, 'Disk below floor after check'
        receipt['passed'] = True
        print('PASS ordinary keyboard/start/Help/gas/turn/brake/pause/collision/unpaid respawn and genuine held phone touch; source frozen; no grants.', flush=True)
    except Exception as error:
        receipt['failure'] = f'{type(error).__name__}: {error}'
        print('BLOCKED/FAIL: ' + receipt['failure'], flush=True)
        raise
    finally:
        signal.alarm(0)
        signal.signal(signal.SIGALRM, old_alarm)
        server.shutdown(); server.server_close(); thread.join(timeout=3)
        receipt['serverPort'] = server.server_port
        receipt['serverClosed'] = server.socket.fileno() == -1 and not thread.is_alive()
        receipt['sourceUnchanged'] = hashes() == frozen
        receipt['elapsedSeconds'] = time.monotonic()-started
        receipt['freeBytesAfter'] = shutil.disk_usage(ROOT).free
        (output / 'result.json').write_text(json.dumps(receipt, indent=2)+'\n')


if __name__ == '__main__':
    main()
