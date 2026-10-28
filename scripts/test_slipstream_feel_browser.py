#!/usr/bin/env python3
"""Bounded ordinary-input feel check. Main must serialize browser admission.
No grants, injected stepping, renderer retries or synthetic gameplay acceptance.
"""
import functools
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import signal
import tempfile
import threading
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
FLOOR = 2_147_483_648


def main():
    assert shutil.disk_usage(ROOT).free >= FLOOR, 'Disk below 2 GiB floor'
    output = Path(tempfile.mkdtemp(prefix='slipstream-feel-'))
    print('OUTPUT=' + str(output), flush=True)
    files = sorted(set((ROOT / 'Games/Slipstream Borough').glob('*')) |
                   set((ROOT / 'assets/car-arcade').glob('*.js')) |
                   {ROOT / 'assets/car-arcade/style.css', ROOT / 'assets/car-arcade/vendor/three.module.js', Path(__file__)})
    def hashes():
        return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in files if p.is_file()}
    frozen = hashes()
    errors, observations = [], []
    started = time.monotonic()
    receipt = {'assisted': False, 'sourceHashes': frozen, 'errors': errors, 'observations': observations, 'passed': False}
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
        with sync_playwright() as pw:
            # One real renderer attempt. Failure is a blocker, never a GPU retry.
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                                         args=['--no-sandbox'], timeout=20000)
            try:
                def watch(page):
                    page.set_default_timeout(20000)
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
            finally: browser.close()
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
