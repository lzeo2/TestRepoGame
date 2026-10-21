#!/usr/bin/env python3
"""Native-input Jankolock QA. Requires the existing Playwright installation.

python3 -B scripts/test_jankolock_browser.py
--layout-only reproduces lobby/gameplay layouts and touch, NOT the two-round gate.
Artifacts and Chromium's temporary profile stay in /dev/shm/jankolock/browser.
No state grants, synthetic game events, patched clocks, or portrait rendering.
"""
import argparse
from collections import Counter
import functools
import hashlib
import http.server
import json
import math
import os
from pathlib import Path
import tempfile
import threading
import time
import traceback
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('/dev/shm/jankolock/browser')
DESKTOP = {'width': 1440, 'height': 1100}
MOBILE = {'width': 320, 'height': 960}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def progress(message):
    print(message, flush=True)


class Evidence:
    def __init__(self, origin):
        self.origin = origin
        self.report = {'gate': 'NOT RUN', 'errors': [], 'requests': [],
                       'screenshots': [], 'layouts': [], 'rounds': [], 'checks': []}

    def attach(self, context, label):
        def route_request(route):
            url = route.request.url
            if urlsplit(url).scheme in ('data', 'blob', 'about'):
                route.continue_()
            elif urlsplit(url).scheme in ('http', 'https') and url.startswith(self.origin + '/'):
                route.continue_()
            else:
                self.report['errors'].append({'kind': 'external', 'url': url, 'page': label})
                route.abort()
        context.route('**/*', route_request)
        context.on('request', lambda req: self.report['requests'].append(
            {'page': label, 'url': req.url}))
        context.on('requestfailed', lambda req: self.report['errors'].append(
            {'kind': 'requestfailed', 'url': req.url, 'failure': req.failure, 'page': label}))
        context.on('response', lambda res: self.report['errors'].append(
            {'kind': 'http', 'url': res.url, 'status': res.status, 'page': label})
            if res.status >= 400 else None)
        context.on('page', lambda page: self.attach_page(page, label))

    def attach_page(self, page, label):
        page.on('console', lambda msg: self.report['errors'].append(
            {'kind': 'consoleerror', 'message': msg.text, 'page': label})
            if msg.type == 'error' else None)
        page.on('pageerror', lambda error: self.report['errors'].append(
            {'kind': 'pageerror', 'message': str(error), 'page': label}))

    def clean(self):
        require(not self.report['errors'], 'Browser errors (no benign filters): ' +
                json.dumps(self.report['errors'][:8]))
        forbidden = [r for r in self.report['requests'] if any(
            word in urlsplit(r['url']).path.lower() for word in ('portrait', '/vendor/', '.glb'))]
        require(not forbidden, 'Canvas session loaded portrait/vendor: ' + repr(forbidden))

    def save(self):
        (OUT / 'result.json').write_text(json.dumps(self.report, indent=2) + '\n')


class Observer:
    """Consume the real bounded event tail frequently, rejecting missing IDs."""
    def __init__(self, page):
        self.page = page
        self.last = 0
        self.events = []
        self.counts = Counter()
        self.deaths = Counter()
        self.respawns = Counter()
        self.previous = None
        self.samples = []

    def read(self):
        s = self.page.evaluate('window.jankolockSnapshot()')
        events = s['events']
        require(len(events) <= 64 and len(s['bullets']) <= 128 and len(s['effects']) <= 48,
                'Engine observation exceeded bounded collection sizes')
        ids = [e['id'] for e in events]
        require(all(a < b for a, b in zip(ids, ids[1:])), 'Nonmonotonic engine event IDs')
        for e in events:
            if e['id'] <= self.last:
                continue
            require(e['id'] == self.last + 1,
                    f'Event collection gap: expected {self.last + 1}, got {e["id"]}')
            self.last = e['id']
            self.events.append(e)
            self.counts[f'{e["type"]}:{e["actorId"]}'] += 1
        if self.previous and self.previous['round'] == s['round']:
            for before, after in zip(self.previous['actors'], s['actors']):
                if before['alive'] and not after['alive']:
                    self.deaths[after['id']] += 1
                if not before['alive'] and after['alive']:
                    self.respawns[after['id']] += 1
        if s['actors']:
            self.samples.append({'round': s['round'], 'phase': s['phase'], 'time': s['time'],
                                 'influence': s['influence'], 'actors': [
                                     {k: a[k] for k in ('id', 'x', 'y', 'hp', 'alive', 'respawn',
                                                        'cooldowns', 'captureSeconds')}
                                     for a in s['actors']]})
            require(len(self.samples) <= 5000, 'Observation budget exceeded')
        self.previous = s
        return s

    def wait(self, predicate, seconds=8):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            s = self.read()
            if predicate(s):
                return s
            self.page.wait_for_timeout(160)
        raise AssertionError('Timed out waiting for real game observation')

    def report(self):
        return {'events': self.events, 'counts': dict(self.counts),
                'deaths': dict(self.deaths), 'respawns': dict(self.respawns),
                'samples': self.samples, 'final': self.previous}


def layout(page, evidence, name):
    data = page.evaluate('''() => {
      const visible = el => el.getClientRects().length > 0;
      const controls = [...document.querySelectorAll('button,summary,.pad')].filter(visible)
        .map(el => {const r=el.getBoundingClientRect(); return {
          id:el.id || el.dataset.hero || el.dataset.item || el.tagName,
          width:r.width,height:r.height};});
      return {viewport:innerWidth, document:document.documentElement.scrollWidth, controls};
    }''')
    evidence.report['layouts'].append({'name': name, **data})
    require(data['document'] <= data['viewport'], f'{name}: horizontal overflow {data}')
    require(all(c['width'] >= 44 and c['height'] >= 44 for c in data['controls']),
            f'{name}: control smaller than 44px: {data["controls"]}')


def capture_states(page, evidence, observer, state):
    """Four fresh screenshots of the actual current state, never a fixture."""
    for device, viewport in [('desktop', DESKTOP), ('mobile', MOBILE)]:
        page.set_viewport_size(viewport)
        for theme in ('light', 'dark'):
            if page.locator('html').get_attribute('data-theme') != theme:
                page.locator('#themeBtn').click()
            page.wait_for_timeout(120)
            if observer:
                observer.read()
            name = f'{device}-{theme}-{state}'
            layout(page, evidence, name)
            path = OUT / f'{name}.png'
            page.screenshot(path=str(path), full_page=True, timeout=15000)
            evidence.report['screenshots'].append(str(path))
            if observer:
                observer.read()
    page.set_viewport_size(DESKTOP)
    page.locator('#arena').focus()
    progress(f'CAPTURE {state}: desktop/mobile light/dark; no overflow; controls >=44px')


def loaded(page, origin):
    page.goto(origin + '/Games/Jankolock/index.html', wait_until='networkidle', timeout=20000)
    page.wait_for_function('typeof window.jankolockSnapshot === "function"')
    require(page.evaluate('''() => {
      const d=Object.getOwnPropertyDescriptor(window,'jankolockSnapshot');
      const s=jankolockSnapshot();
      return !d.writable && !d.configurable && Object.isFrozen(s) &&
        Object.isFrozen(s.actors) && Object.isFrozen(s.events);
    }'''), 'Observation diagnostic is not read-only and deeply frozen')


def start_postmaster(page):
    page.locator('[data-hero="postmaster"]').click()
    require(page.locator('[data-hero="postmaster"]').get_attribute('aria-pressed') == 'true',
            'Native hero card did not select Postmaster')
    page.locator('#startBtn').click()
    page.wait_for_function('jankolockSnapshot().phase === "playing"')
    require(page.evaluate('jankolockSnapshot().heroId') == 'postmaster', 'Wrong hero started')


def clear_native(page, held):
    page.mouse.up()
    for key in tuple(held):
        page.keyboard.up(key)
    held.clear()


def drive(page, observer, s, held):
    player = s['actors'][0]
    enemy = min((a for a in s['actors'] if a['alive'] and a['team'] == 1),
                key=lambda a: math.hypot(a['x'] - player['x'], a['y'] - player['y']), default=None)
    dx, dy = 456 - player['x'], 300 - player['y']
    wanted = set()
    if player['alive']:
        if abs(dx) > 5:
            wanted.add('d' if dx > 0 else 'a')
        if abs(dy) > 5:
            wanted.add('s' if dy > 0 else 'w')
    for key in held - wanted:
        page.keyboard.up(key)
    for key in wanted - held:
        page.keyboard.down(key)
    held.clear()
    held.update(wanted)
    if enemy:
        box = page.locator('#arena').bounding_box()
        x = box['x'] + (40 + enemy['x'] + (enemy['y'] - 300) * .07) * box['width'] / 1040
        y = box['y'] + (80 + enemy['y'] * .9) * box['height'] / 700
        page.mouse.move(x, y)
        page.mouse.down()
        if player['alive'] and player['cooldowns'][0] <= .01:
            page.keyboard.press('q')
        if player['alive'] and player['cooldowns'][1] <= .01 and math.hypot(
                enemy['x'] - player['x'], enemy['y'] - player['y']) <= 70:
            page.keyboard.press('e')
    else:
        page.mouse.up()


def verify_item(page, observer, item):
    s = observer.read()
    player = s['actors'][0]
    require(s['round'] == 2 and s['phase'] == 'playing', 'Draft did not start round two')
    require(player['items'] == [item], 'Draft must apply exactly one player item')
    require(all(len(a['items']) == 1 for a in s['actors']), 'Bots did not receive comparable picks')
    require(len(s['botPicks']) == 3, 'Missing visible bot draft')
    require(s['influence'] == [0, 0] and player['hp'] == player['maxHp'],
            'Round reset did not reset influence/heal player')
    if item == 'envelope':
        require(player['maxHp'] == 120, 'Envelope maximum HP was not applied')
    elif item == 'badge':
        require(player['shield'] == 10, 'Badge spawn shield was not applied')
    elif item == 'thermos':
        page.keyboard.press('q')
        observer.wait(lambda view: 8 < view['actors'][0]['cooldowns'][0] <= 9)
    elif item == 'forms':
        box = page.locator('#arena').bounding_box()
        page.mouse.click(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        page.mouse.down()
        observer.wait(lambda view: .19 < view['actors'][0]['shotCooldown'] <= .216001)
        page.mouse.up()
    else:
        raise AssertionError('Unimplemented item-stat observation: ' + item)
    progress(f'DRAFT pick1={item}; applied next round; player/bots each have exactly one item')


def two_rounds(page, evidence, observer, deadline):
    held = set()
    last_progress = 0
    captured_gameplay = False
    try:
        while len(evidence.report['rounds']) < 2:
            require(time.monotonic() < deadline, 'Two-round wall-clock budget exhausted')
            s = observer.read()
            if s['phase'] == 'roundResult':
                clear_native(page, held)
                evidence.report['rounds'].append(s)
                progress(f'ROUND {s["round"]} complete: winner={s["result"]["winner"]} '
                         f'reason={s["result"]["reason"]} influence={s["influence"]}')
                require(sum(s['wins']) == len(evidence.report['rounds']), 'Wrong real round score')
                capture_states(page, evidence, observer, f'result-round{s["round"]}')
                if len(evidence.report['rounds']) == 2:
                    break
                page.locator('#continueBtn').click()
                draft = observer.read()
                require(draft['phase'] == 'draft' and len(draft['offers']) == 3 and
                        len(set(draft['offers'])) == 3, 'Expected three distinct draft offers')
                require(page.locator('[data-item]').count() == 3, 'Expected three native item cards')
                stopped = observer.read()
                capture_states(page, evidence, observer, 'draft')
                require(observer.read()['time'] == stopped['time'], 'Draft clock advanced')
                item = next(i for i in ('envelope', 'badge', 'thermos', 'forms') if i in draft['offers'])
                evidence.report['draft'] = {'offers': draft['offers'], 'chosen': item}
                page.locator(f'[data-item="{item}"]').click()
                verify_item(page, observer, item)
                continue
            require(s['phase'] == 'playing', f'Unexpected phase while driving: {s["phase"]}')
            drive(page, observer, s, held)
            if not captured_gameplay and s['actors'][0]['captureSeconds'] > 0:
                clear_native(page, held)
                capture_states(page, evidence, observer, 'gameplay')
                captured_gameplay = True
            if time.monotonic() - last_progress >= 12:
                progress(f'PLAY round={s["round"]} clock={s["time"]:.1f} '
                         f'influence={[round(n, 1) for n in s["influence"]]} '
                         f'events={observer.last} deaths={sum(observer.deaths.values())} '
                         f'respawns={sum(observer.respawns.values())}')
                last_progress = time.monotonic()
            page.wait_for_timeout(160)
        require(captured_gameplay, 'Player never contributed actual capture')
        require(any(s['result']['winner'] == 0 for s in evidence.report['rounds']),
                'Two natural rounds completed without a player-team win')
        require(observer.counts['shot:0'] > 10 and observer.counts['ability:0'] >= 2,
                'Missing actual player shots/abilities')
        require(all(any(sample['actors'][0]['cooldowns'][slot] > 0
                        for sample in observer.samples) for slot in (0, 1)),
                'Did not observe both actual player abilities on cooldown')
        require(all(observer.counts[f'shot:{i}'] > 0 for i in (1, 2, 3)), 'Bots did not fight')
        require(any(e['type'] == 'kill' for e in observer.events), 'No real combat death event')
        require(any(e['type'] == 'capture' for e in observer.events), 'No real capture event')
        require(sum(observer.deaths.values()) > 0 and sum(observer.respawns.values()) > 0,
                'No observed death followed by completed respawn')
        require(any(a['captureSeconds'] > 0 for s in evidence.report['rounds'] for a in s['actors']),
                'No actual capture contribution')
        evidence.report['checks'].append('two complete native-input rounds; real win; shots; abilities; capture; death/respawn; draft/stat')
        page.locator('#resultResetBtn').click()
        clean_lobby(page)
        capture_states(page, evidence, None, 'restart-lobby')
        evidence.report['checks'].append('restart clears items/scores/actors/events to hero lobby')
    finally:
        clear_native(page, held)
        evidence.report['desktop_observations'] = observer.report()


def clean_lobby(page):
    s = page.evaluate('jankolockSnapshot()')
    require(s['phase'] == 'lobby' and s['round'] == 1 and s['wins'] == [0, 0] and
            s['influence'] == [0, 0] and s['time'] == 60 and not s['actors'] and
            not s['bullets'] and not s['offers'] and not s['events'] and s['result'] is None,
            'Reset retained match residue')
    require(page.locator('#lobbyPanel').is_visible() and page.locator('#startBtn').is_enabled(),
            'Restart did not return usable hero selection')


def touch_checks(browser, evidence, origin):
    context = browser.new_context(viewport=MOBILE, has_touch=True, device_scale_factor=1,
                                  reduced_motion='reduce')
    evidence.attach(context, 'mobile-touch')
    observer = None
    try:
        page = context.new_page()
        loaded(page, origin)
        start_postmaster(page)
        observer = Observer(page)
        observer.read()
        page.locator('#movePad').scroll_into_view_if_needed()
        move, aim = (page.locator(selector).bounding_box() for selector in ('#movePad', '#aimPad'))
        require(move and aim, 'Touch pads not visible at 320px')
        def point(box, ident, offset):
            return {'id': ident, 'x': box['x'] + box['width'] / 2 + offset,
                    'y': box['y'] + box['height'] / 2, 'radiusX': 4, 'radiusY': 4, 'force': 1}
        cdp = context.new_cdp_session(page)
        before = observer.read()
        points = [point(move, 1, 27), point(aim, 2, 27)]
        touch_active = False
        try:
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': points})
            touch_active = True
            active = observer.wait(lambda s: s['actors'][0]['x'] > before['actors'][0]['x'] + 15
                                   and observer.counts['shot:0'] >= 2)
            require(active['time'] < before['time'], 'Touch test did not advance real game clock')
            require(page.locator('#movePad i').evaluate('el=>el.style.transform') and
                    page.locator('#aimPad i').evaluate('el=>el.style.transform'),
                    'Move and aim/fire were not simultaneously owned')
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
            touch_active = False
            page.wait_for_timeout(200)
            cancelled = observer.read()
            shots = observer.counts['shot:0']
            for _ in range(4):
                page.wait_for_timeout(160)
                stopped = observer.read()
            require(abs(stopped['actors'][0]['x'] - cancelled['actors'][0]['x']) < .01 and
                    abs(stopped['actors'][0]['y'] - cancelled['actors'][0]['y']) < .01,
                    'Pointer cancellation left movement stuck')
            require(observer.counts['shot:0'] == shots, 'Pointer cancellation left firing stuck')
            require(not page.locator('#movePad i').evaluate('el=>el.style.transform') and
                    not page.locator('#aimPad i').evaluate('el=>el.style.transform'),
                    'Pointer cancellation left stick indicators active')
        finally:
            if touch_active:
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
            cdp.detach()
        abilities = observer.counts['ability:0']
        page.locator('#abilityQ').tap()
        observer.wait(lambda s: observer.counts['ability:0'] > abilities and
                      s['actors'][0]['cooldowns'][0] > 0)
        page.locator('#pauseBtn').tap()
        paused = observer.read()
        require(paused['phase'] == 'paused', 'Native pause failed')
        for _ in range(4):
            page.wait_for_timeout(160)
            require(observer.read() == paused, 'Paused simulation/clock advanced')
        page.locator('#resumeBtn').tap()
        observer.wait(lambda s: s['phase'] == 'playing' and s['time'] < paused['time'])
        for theme in ('light', 'dark'):
            if page.locator('html').get_attribute('data-theme') != theme:
                page.locator('#themeBtn').tap()
            observer.read()
            layout(page, evidence, f'mobile-touch-{theme}')
            path = OUT / f'mobile-touch-{theme}-gameplay.png'
            page.screenshot(path=str(path), full_page=True, timeout=15000)
            evidence.report['screenshots'].append(str(path))
            observer.read()
        page.locator('#restartBtn').tap()
        clean_lobby(page)
        evidence.report['checks'].append('320px simultaneous native touch MOVE/AIM/FIRE; pointercancel releases; Q tap; pause frozen/resume; restart')
        progress('MOBILE PASS: simultaneous CDP touch; cancel stops move/fire; Q tap; pause/resume clock; reset')
    finally:
        if observer:
            evidence.report['touch_observations'] = observer.report()
        context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--layout-only', action='store_true')
    parser.add_argument('--port', type=int, default=8916)
    parser.add_argument('--seconds', type=int, default=540, help='real two-round wall-clock budget, max 600')
    args = parser.parse_args()
    require(8910 <= args.port <= 65535, 'Port must be >=8910')
    require(30 <= args.seconds <= 600, 'Budget must be 30..600 real seconds')
    require(os.statvfs('/').f_bavail * os.statvfs('/').f_frsize >= 2 * 1024 ** 3,
            'Root free space below 2GiB floor')
    OUT.mkdir(parents=True, exist_ok=True)
    os.environ['TMPDIR'] = os.environ['SMOKE_TMP'] = str(OUT)
    tempfile.tempdir = str(OUT)
    origin = f'http://127.0.0.1:{args.port}'
    evidence = Evidence(origin)
    evidence.report['mode'] = 'layout-only (NOT full gate)' if args.layout_only else 'full native two-round gate'
    evidence.report['sources'] = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in [ROOT / 'Games/Jankolock' / name for name in ('engine.js', 'data.js', 'ui.js', 'style.css', 'index.html')]}
    started = time.monotonic()
    server = None
    thread = None
    failures = []
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', args.port),
            functools.partial(Handler, directory=str(ROOT)))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--disable-gpu'], timeout=30000)
            try:
                context = browser.new_context(viewport=DESKTOP, device_scale_factor=1,
                                              reduced_motion='reduce')
                evidence.attach(context, 'desktop')
                try:
                    page = context.new_page()
                    loaded(page, origin)
                    capture_states(page, evidence, None, 'lobby')
                    start_postmaster(page)
                    observer = Observer(page)
                    if args.layout_only:
                        capture_states(page, evidence, observer, 'gameplay-layout-only')
                    else:
                        two_rounds(page, evidence, observer, time.monotonic() + args.seconds)
                except Exception as error:
                    failures.append(f'desktop: {type(error).__name__}: {error}')
                    progress('FAIL ' + failures[-1])
                    traceback.print_exc(limit=4)
                    try:
                        path = OUT / 'desktop-failure.png'
                        page.screenshot(path=str(path), full_page=True, timeout=10000)
                        evidence.report['screenshots'].append(str(path))
                    except Exception as screenshot_error:
                        failures.append('failure screenshot: ' + str(screenshot_error))
                finally:
                    context.close()
                try:
                    touch_checks(browser, evidence, origin)
                except Exception as error:
                    failures.append(f'mobile: {type(error).__name__}: {error}')
                    progress('FAIL ' + failures[-1])
                    traceback.print_exc(limit=4)
                evidence.clean()
            finally:
                browser.close()
    except Exception as error:
        failures.append(f'runner: {type(error).__name__}: {error}')
        progress('FAIL ' + failures[-1])
    finally:
        if server:
            server.shutdown()
            server.server_close()
        if thread:
            thread.join(timeout=5)
        evidence.report['failures'] = failures
        evidence.report['elapsed_seconds'] = round(time.monotonic() - started, 2)
        evidence.report['gate'] = 'FAIL' if failures else ('LAYOUT ONLY PASS; full gate NOT RUN' if args.layout_only else 'PASS')
        evidence.save()
    progress(f'{evidence.report["gate"]}: rounds={len(evidence.report["rounds"])} '
             f'checks={len(evidence.report["checks"])} errors={len(evidence.report["errors"])} '
             f'wall={evidence.report["elapsed_seconds"]}s; {OUT / "result.json"}')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
