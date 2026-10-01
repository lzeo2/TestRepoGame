#!/usr/bin/env python3
"""Real UI regression: python3 scripts/test_tag_relay.py (about 2 minutes).
Requires the existing Playwright Python package and Chromium, no npm install.
"""
from collections import deque
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import hashlib
import re
import shutil
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'Games/Tag Relay'
QA = Path('/tmp/tag-relay-qa')
source = (GAME / 'original.js').read_bytes()
assert hashlib.sha256(source).hexdigest() == '0e77d6300c9bb205cec07df869f1a66b8ff3f0796077d97c43a12eab54222371'
original = source.decode()
arenas = re.findall(r'map`([^`]+)`', original[original.index('const levels'):])
assert len(arenas) == 14
adapted = (GAME / 'game.js').read_text()
assert re.findall(r'map`([^`]+)`', adapted[adapted.index('const levels'):]) == arenas
assert re.findall(r'bitmap`([^`]+)`', adapted) == re.findall(r'bitmap`([^`]+)`', original)
assert re.findall(r'tune`([^`]+)`', adapted) == re.findall(r'tune`([^`]+)`', original)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
server.daemon_threads = True
thread = Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = f'http://127.0.0.1:{server.server_port}'
errors, failed, external = [], [], []


def snapshot(page):
    return page.evaluate('window.tagRelaySnapshot')


def wait_phase(page, phase):
    page.wait_for_function('(phase) => window.tagRelaySnapshot.phase === phase', arg=phase, timeout=10000, polling=50)


def wait_round(page, arena, red, blue):
    # A prior round/break can already satisfy a phase-only wait. Match all fields.
    page.wait_for_function('''([arena, red, blue]) => {
        const s = window.tagRelaySnapshot;
        return s.phase === 'round' && s.arena === arena &&
               s.redScore === red && s.blueScore === blue;
    }''', arg=[arena, red, blue], timeout=10000, polling=50)


def wait_score(page, red, blue, phase):
    page.wait_for_function('''([red, blue, phase]) => {
        const s = window.tagRelaySnapshot;
        return s.redScore === red && s.blueScore === blue && s.phase === phase;
    }''', arg=[red, blue, phase], timeout=10000, polling=50)


def chase(page):
    """Find a valid arena path, then move only through normal keyboard events."""
    state = snapshot(page)
    rows = arenas[state['arena'] - 1].strip().splitlines()
    start = (state['red']['x'], state['red']['y'])
    goal = (state['blue']['x'], state['blue']['y'])
    queue = deque([(start, '')])
    visited = {start}
    while queue:
        (x, y), path = queue.popleft()
        if (x, y) == goal:
            break
        for dx, dy, key in [(1, 0, 'd'), (-1, 0, 'a'), (0, 1, 's'), (0, -1, 'w')]:
            pos = (x + dx, y + dy)
            if 0 <= pos[1] < len(rows) and 0 <= pos[0] < len(rows[0]) and rows[pos[1]][pos[0]] != 'w' and pos not in visited:
                visited.add(pos)
                queue.append((pos, path + key))
    else:
        raise AssertionError('No legal chase path')
    page.locator('#arena').focus()
    for key in path:
        page.keyboard.press(key)
    assert snapshot(page)['redScore'] == state['redScore'] + 1
    return len(path)


INSTRUMENT = """
(() => {
 const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
 const frames = new Set(); let max = 0;
 window.requestAnimationFrame = callback => {
   // Playwright also requests RAF for click stability; count only the real renderer.
   if (!new Error().stack.includes('/vendor/sprig/web/index.js')) return raf(callback);
   const id = raf(time => { frames.delete(id); callback(time); });
   frames.add(id); max = Math.max(max, frames.size); return id;
 };
 window.cancelAnimationFrame = id => {frames.delete(id); cancel(id);};
 const interval = window.setInterval.bind(window), clear = window.clearInterval.bind(window), timers = new Set();
 window.setInterval = (...args) => {const id = interval(...args); timers.add(id); return id;};
 window.clearInterval = id => {timers.delete(id); clear(id);};
 const timeout = window.setTimeout.bind(window), clearTimeout = window.clearTimeout.bind(window), delays = new Set();
 window.setTimeout = (callback, delay, ...args) => {
   const id = timeout(() => {delays.delete(id); callback(...args);}, delay); delays.add(id); return id;
 };
 window.clearTimeout = id => {delays.delete(id); clearTimeout(id);};
 Object.defineProperty(window, 'tagTestLoops', {get: () => ({frames: frames.size, max, intervals: timers.size, delays: delays.size})});
})();
"""

try:
    QA.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=shutil.which('chromium'), headless=True,
                                    args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 1100, 'height': 1100})
        context.add_init_script(INSTRUMENT)
        def route(request):
            if urlsplit(request.request.url).netloc != urlsplit(origin).netloc:
                external.append(request.request.url)
                request.abort()
            else:
                request.continue_()
        context.route('**/*', route)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.on('requestfailed', lambda req: failed.append(req.url + ': ' + str(req.failure)))
        page.on('response', lambda res: failed.append(f'{res.status}: {res.url}') if res.status >= 400 else None)
        page.goto(origin + '/Games/Tag%20Relay/', wait_until='networkidle')
        assert page.locator('#start').is_visible()
        assert page.evaluate('tagTestLoops.frames') == 0
        page.screenshot(path=str(QA / 'desktop-menu.png'))
        page.locator('#start').click()
        wait_phase(page, 'round')
        assert snapshot(page)['red'] == {'x': 0, 'y': 0}
        assert snapshot(page)['blue'] == {'x': 11, 'y': 8}
        assert page.evaluate('Object.isFrozen(tagRelaySnapshot) && Object.isFrozen(tagRelaySnapshot.red)')
        for _ in range(10):
            page.keyboard.press('d')
        for _ in range(3):
            page.keyboard.press('j')
        assert snapshot(page)['red'] == {'x': 10, 'y': 0}
        assert snapshot(page)['blue'] == {'x': 8, 'y': 8}
        assert 0 < snapshot(page)['remaining'] <= 7
        page.screenshot(path=str(QA / 'desktop-gameplay.png'))
        page.locator('#pause').click()
        paused = snapshot(page)
        page.wait_for_timeout(800)
        page.locator('#arena').focus()
        page.keyboard.press('s')
        assert snapshot(page) == paused
        assert page.evaluate('tagTestLoops.intervals') == 0
        page.locator('#pause').click()
        assert not snapshot(page)['paused']
        page.locator('#restart').click()
        assert snapshot(page)['redScore'] == snapshot(page)['blueScore'] == 0
        assert snapshot(page)['red'] == {'x': 0, 'y': 0}
        # Synthetic visibility is a test-only document fixture, never a game-state setter.
        page.evaluate("Object.defineProperty(document, 'hidden', {value:true, configurable:true}); document.dispatchEvent(new Event('visibilitychange'))")
        hidden = snapshot(page)
        page.wait_for_timeout(600)
        assert snapshot(page) == hidden and hidden['paused']
        page.evaluate("delete document.hidden; document.dispatchEvent(new Event('visibilitychange'))")
        assert snapshot(page)['paused']  # explicit resume, no background points
        page.locator('#pause').click()
        # Both pads, including simultaneous independent touch points, at mobile widths.
        for width in (320, 390):
            page.set_viewport_size({'width': width, 'height': 844})
            page.locator('#restart').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            for button in page.locator('[data-key]').all():
                box = button.bounding_box()
                assert box['width'] >= 44 and box['height'] >= 44, box
            red = page.get_by_role('button', name='Red Right', exact=True).bounding_box()
            blue = page.get_by_role('button', name='Blue Left', exact=True).bounding_box()
            cdp = context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [
                {'x': red['x'] + red['width']/2, 'y': red['y'] + red['height']/2, 'id': 1},
                {'x': blue['x'] + blue['width']/2, 'y': blue['y'] + blue['height']/2, 'id': 2}]})
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            cdp.detach()
            assert snapshot(page)['red']['x'] == 1
            assert snapshot(page)['blue']['x'] == 10
        page.screenshot(path=str(QA / 'mobile-gameplay.png'))
        # A mixed match exercises arenas 1-13, including both scoring paths.
        page.set_viewport_size({'width': 1100, 'height': 1100})
        page.locator('#restart').click()
        movement = 0
        for round_number in range(13):
            wait_round(page, round_number + 1, (round_number + 1) // 2, round_number // 2)
            assert snapshot(page)['arena'] == round_number + 1
            before = snapshot(page)
            red_point = round_number % 2 == 0
            if red_point:
                movement += chase(page)
            wait_score(page, before['redScore'] + int(red_point),
                       before['blueScore'] + int(not red_point),
                       'won' if round_number == 12 else 'between')
            assert snapshot(page)['texts'] == 1
            if round_number < 12:
                assert snapshot(page)['phase'] == 'between'
                locked = snapshot(page)
                page.keyboard.press('d')
                assert snapshot(page)['red'] == locked['red']
        assert snapshot(page)['phase'] == 'won'
        assert snapshot(page)['redScore'] == 7 and snapshot(page)['blueScore'] == 6
        assert 'Red Wins!' in page.locator('#status').inner_text()
        terminal = snapshot(page)
        for key in 'wasdijkl' * 3:
            page.keyboard.press(key)
        page.wait_for_timeout(1700)
        assert snapshot(page) == terminal
        assert page.evaluate('tagTestLoops.frames === 0 && tagTestLoops.intervals === 0 && tagTestLoops.delays === 0')
        # Timeout-only match verifies Blue can actually reach seven, never a setter.
        page.locator('#restart').click()
        for point in range(1, 8):
            wait_round(page, point, 0, point - 1)
            wait_score(page, 0, point, 'won' if point == 7 else 'between')
            assert snapshot(page)['blueScore'] == point
        assert snapshot(page)['redScore'] == 0
        assert 'Blue Wins!' in page.locator('#status').inner_text()
        for key in 'wasdijkl':
            page.keyboard.press(key)
        assert page.evaluate('tagTestLoops.frames === 0 && tagTestLoops.intervals === 0 && tagTestLoops.delays === 0')
        for _ in range(5):
            page.locator('#restart').click()
        assert snapshot(page)['redScore'] == snapshot(page)['blueScore'] == 0
        assert snapshot(page)['red'] == {'x': 0, 'y': 0}
        assert snapshot(page)['blue'] == {'x': 11, 'y': 8}
        assert page.evaluate('tagTestLoops.max === 1 && tagTestLoops.frames === 1 && tagTestLoops.intervals === 1')
        page.evaluate("window.dispatchEvent(new Event('pagehide'))")
        page.wait_for_timeout(100)
        assert page.evaluate('tagTestLoops.frames === 0 && tagTestLoops.intervals === 0 && tagTestLoops.delays === 0')
        page.goto('about:blank')
        assert not errors, errors
        assert not failed, failed
        assert not external, external
        assert sum(path.stat().st_size for path in QA.glob('*.png')) < 500_000
        print(f'Normal errors: page/console={len(errors)}, requestfailed/HTTP4xx={len(failed)}, external={len(external)}')
        # Explicit negative fixture is isolated from normal-game error totals.
        negative = browser.new_context()
        fixture = negative.new_page()
        negative_errors, negative_console, negative_failed, negative_http = [], [], [], []
        fixture.on('pageerror', lambda error: negative_errors.append(str(error)))
        fixture.on('console', lambda msg: negative_console.append(msg.text) if msg.type == 'error' else None)
        fixture.on('requestfailed', lambda req: negative_failed.append(req.url))
        fixture.on('response', lambda res: negative_http.append(res.status) if res.status >= 400 else None)
        fixture.route('**/tag-relay-negative-abort', lambda route: route.abort())
        fixture.goto(origin + '/Games/Tag%20Relay/', wait_until='networkidle')
        fixture.evaluate('''() => {
            setTimeout(() => { console.error('known negative console'); throw new Error('known negative pageerror'); }, 0);
            fetch('/tag-relay-negative-missing').catch(() => {});
            fetch('/tag-relay-negative-abort').catch(() => {});
        }''')
        fixture.wait_for_timeout(500)
        assert negative_errors == ['known negative pageerror'], negative_errors
        assert 'known negative console' in negative_console, negative_console
        assert len(negative_failed) == 1 and negative_http == [404], (negative_failed, negative_http)
        print(f'Known negative fixture ONLY: pageerror={len(negative_errors)}, consoleerror={len(negative_console)}, requestfailed={len(negative_failed)}, HTTP4xx={len(negative_http)} (expected)')
        negative.close()
        browser.close()
        print(f'Tag Relay: 14 original arenas/assets/tunes unchanged; {movement} legal chase moves; Red 7-6 and Blue 7-0; pause/visibility/restart/two-touch 320/390; one RAF, no terminal timers; 0 page/console/request errors; 3 screenshots under 500KB. Catalog not changed; full smoke NOT run.')
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
    assert not thread.is_alive()
