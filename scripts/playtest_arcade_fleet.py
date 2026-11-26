#!/usr/bin/env python3
"""Exercise local game entries through browser input in disposable Chromium contexts.

DOM/state observations and frame comparisons are separate outcomes. Animated
frames alone cannot establish that a canvas game accepted a move. The runner
retains one result per entry and supports a selected retry in a fresh directory.
"""
import argparse
import base64
import asyncio
import collections
import functools
import hashlib
import io
import json
import re
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlsplit

from PIL import Image, ImageChops
from playwright.async_api import Error, async_playwright

ROOT = Path(__file__).resolve().parents[1]
EMULATED = set(range(114, 122)) | {221}
HEAVY = {7, 8, 47, 48, 49, 50, 55, 56, 59, 60, 64, 89, 111, 245}
# A probe names a gameplay control and a value directly affected by it. Read
# these immediately before and after input, so opening a menu cannot pass.
# Controls separated with | are sequential. key:... uses actual key events.
PROBES = {
    'TowerOfHanoi': ('#disk-1|#tower-b', '#step-counter'),
    'MiniGolf': ('key:ArrowLeft|key:Space', '#strokes'),
    'Sokoban': ('key:ArrowRight|key:ArrowLeft|key:ArrowDown|key:ArrowUp', '#msg'),
    'Dominoes': ('drag:#block1>#mesto1', '#mesto1'),
    'SchoolyardCourtyardCast': ('#pause', '#pause'),
    'SchoolyardGapGlide': ('#restart|#start|#pause', '#pause'),
    'Puzzle15': ('key:ArrowRight|key:ArrowLeft|key:ArrowDown|key:ArrowUp', '#moves'),
    'PegSolitaire': ('[data-row="3"][data-col="1"]|[data-row="3"][data-col="3"]', '#pegCount'),
    'Reversi': ('.square:has(.hint-b), .square:has(.hint-w)', '#countYou, #countThem'),
    'Nim': ('button.take[data-n="1"]', '#stones .stone, #status'),
    'DotsAndBoxes': ('.hline', '.hline, #gameStatus'),
    'UltimateTicTacToe': ('.active-board .cell, .small-board .cell', '.cell'),
    'KlondikeSolitaire': ('#stock', '#stock, .waste, #waste'),
    'Blackjack': ('.deal-action', '#player-cards, #dealer-cards, #player-score'),
    'VideoPoker': ('#deal-btn', '#card0, #card1, #deal-btn'),
    'Yahtzee': ('#roll', '#rolls-left'),
    'GoFish': ('#yourCards .card', '#yourCards, .message'),
    'War': ('#actionBtn', '#yourCard, #cpuCard'),
    'WordScramble': ('#reshuffleBtn', '#scrambled'),
    'Darts501': ('#throwBtn', '#score, #turn, #msg'),
    'MahjongLite': ('#hintBtn', '.hintTile, #msg'),
    'Nonogram': ('.playable', '.playable, #score'),
    'Gomoku': ('#board .cell', '#board .stone, #turnIndicator'),
    'Mancala': ('.pit.active', '#board .pit, #scoreA, #scoreB'),
    'Boggle': ('#new', '#grid'),
    'Backgammon': ('.point:has(.ck.white)|.point.target', '#board .point, #status'),
    'FreeThrow': ('key:Space', '#shots-left'),
    'FreeCell': ('.cascade .card:last-child|.cell.empty', '.cells, .cell, .picked'),
    'Battleship': ('#computer-board .cell', '#message-log, #computer-board'),
    'Chess': ('drag:.square-e2>.square-e4', '#move-history'),
    'WordLadder': ('fill:#word:zzzz|#submitBtn', '#msg'),
    'WordSearch': ('[data-x="0"][data-y="0"]', '.cell.sel'),
    'Checkers': ('.okbutton|.checker.white, .checker.black', '.checker.selected'),
    'Mastermind': ('#giveUpBtn', '#status, #newRoundBtn'),
    'Crossword': ('.word-clue|#reveal-answer-button', '#answer-results, .word-clue'),
    'DogeMiner': ('#miner|#miner', '#dogecoins, #dogecoin, #balance'),

    'Snake': ('#restart-btn|#pause-btn', '#pause-btn'),
    'SnakeHacked': ('#restart-btn|#pause-btn', '#pause-btn'),
    'CookieClicker': ('#bigCookie|#bigCookie', '#cookies'),
    'CookieClickerHacked': ('#bigCookie|#bigCookie', '#cookies'),
    'ADarkRoom': ('#lightButton, #stokeButton', '#notifications, #stokeButton, #lightButton'),
    '2048': ('key:ArrowLeft|key:ArrowUp|key:ArrowRight|key:ArrowDown', '.tile-container'),
    'Chess Workshop': ('[data-square="e2"]|[data-square="e4"]', '#play-moves, #play-status'),
}
# Read-only observations of state already exposed by these games. Values are
# restricted to user-driven movement, camera mode or shots rather than a clock.
STATE_PROBES = {
    'ChromeDino': ('key:Space', 'window.Runner?.instance_?.activated'),
    'BreakoutClassic': ('key:ArrowRight', 'typeof paddle === "undefined" ? null : paddle.x'),
    'BreakoutHacked': ('key:ArrowRight', 'typeof paddle === "undefined" ? null : paddle.x'),
    'Asteroids': ('key:Space|key:ArrowRight', 'window.Game?.ship?.rot'),
    'Archery': ('key:ArrowRight', 'typeof kbAngle === "undefined" ? null : kbAngle'),
    'Borough Run': ('#pause', 'window.__gameDebug?.state'),
    'Tag Relay': ('key:d', 'window.tagRelaySnapshot?.red?.x'),
    'Spline Ride': ('#view', 'window.splineRideSnapshot?.view'),
    'Jankolock3D': ('key:w', 'window.jank3dSnapshot?.().controller?.position'),
    'SchoolyardLaneRun': ('key:ArrowRight', 'window.schoolyardGame?.state.player.lane'),
}

START = {
    'Circuit Ward': '#startSolo', 'Tag Relay': '#start', 'Spline Ride': '#play',
    'Tanks and Soldiers': '#deploy', 'Jankolock3D': '#start',
    'Capital Drive': '#start-button', 'Foldwild': '#start', 'Below the Obvious': '#playBtn',
    'Nim': '#playBtn', 'DotsAndBoxes': '#playBtn', 'Mastermind': '#playBtn',
    'UltimateTicTacToe': '#playBtn', 'War': '#startBtn', 'WordLadder': '#startBtn',
    'WordSearch': '#startScreen .primary', 'StealFootballer': '#start',
    'StealBasketballer': '#start', 'SchoolyardGapGlide': '#start',
    'SchoolyardLaneRun': '#start', 'Night Shift': '#play', 'Borough Run': '#play',
}
# Normalized viewport coordinates refer to the runner's fixed 850 by 590
# viewport. These controls are painted by their engines rather than HTML.
# Each sequence was selected from a captured screen for this version.
CANVAS_MENUS = {
    'SoccerRandom': [(0.50, 0.50)], 'BasketRandom': [(0.50, 0.50)],
    'VolleyRandom': [(0.50, 0.50)], 'Run3': [(0.50, 0.63)],
    'Ovo': [(0.51, 0.48)], 'CutTheRope': [(0.5, 0.56)],
    'Vex7': [(0.50, 0.75)], 'RetroBowl': [(0.79, 0.89)],
    'RetroBowlHacked': [(0.79, 0.89)],
}
START_LABEL = re.compile(r'^(?:start(?: game| match| solo| run)?|play(?: game| now| solo)?|new game|new round|begin|single player|one player|1 player|solo|deal cards|tap to start|click to play)$', re.I)
# Different engines ship independently. A pointer event and controls from a
# different genre are never presented as proof of gameplay.
KEYS = {
    'SoccerRandom': ['ArrowUp', 'w'], 'BasketRandom': ['ArrowUp', 'w'],
    'VolleyRandom': ['ArrowUp', 'w'], 'Ovo': ['ArrowRight', 'ArrowUp', 'ArrowDown'],
    'Run3': ['ArrowLeft', 'ArrowRight', 'Space'], 'ChromeDino': ['Space', 'ArrowUp'],
    'Snake': ['ArrowRight', 'ArrowDown', 'ArrowLeft'], 'SnakeHacked': ['ArrowRight', 'ArrowDown', 'ArrowLeft'],
    'SubwaySurfers': ['ArrowLeft', 'ArrowUp', 'ArrowRight'],
    'SubwaySurfersHacked': ['ArrowLeft', 'ArrowUp', 'ArrowRight'],
    'QWOP': ['q', 'w', 'o', 'p'], 'Hextris': ['ArrowLeft', 'ArrowRight'],
    'SchoolyardGapGlide': ['Space', 'Space'], 'SchoolyardLaneRun': ['ArrowDown', 'ArrowUp'],
    'Tag Relay': ['d', 's', 'j'], 'Circuit Ward': ['d', 'w', 'Space'],
    'Sokoban': ['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'],
    'Joust': ['ArrowRight', 'Space'], 'DriftBoss': ['Space', 'Space'],
    'JavaScriptRacer': ['ArrowUp', 'ArrowRight'], 'SpaceInvaders': ['ArrowRight', 'Space'],
}

class LocalFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass


def titles():
    games = json.loads((ROOT / 'games.json').read_text())
    inventory = json.loads((ROOT / 'docs/maintenance/inventory.json').read_text())
    result = [dict(title=g['title'], directory=g['url'].split('/')[1], entry=g['url'],
                   id=g['id'], registered=True) for g in games]
    result.extend(dict(title=g['title'], directory=g['directory'].split('/')[1],
                       entry=g['entry'], id=None, registered=False)
                  for g in inventory['games'] if not g['registered'])
    return result


async def first_visible(locator):
    for candidate in (await locator.all())[:32]:
        if await candidate.is_visible() and await candidate.is_enabled():
            return candidate
    return None


async def click_element(page, selector):
    el = await first_visible(page.locator(selector))
    if not el:
        return False
    try:
        await el.click(timeout=1000)
        return True
    except Error:
        return False


async def controlled_value(page, selector):
    # Include owned text and stateful classes, excluding hover/focus and CSS
    # animation style. Per-game selectors avoid a clock masquerading as input.
    return await page.locator(selector).evaluate_all("""items => items.map(el =>
      [el.textContent?.trim().slice(0,180),el.className?.baseVal ?? el.className,
       el.getAttribute('aria-label'),el.getAttribute('aria-pressed'),el.children.length])""")


async def surface(page):
    for frame in reversed(page.frames):
        for selector in ['canvas', 'ruffle-player, ruffle-embed, ruffle-object', 'svg[role=img]']:
            for node in (await frame.locator(selector).all())[:6]:
                try:
                    rect = await node.bounding_box(timeout=1800)
                    if rect and rect['width'] >= 140 and rect['height'] >= 90 and await node.is_visible():
                        return node
                except Error:
                    continue
    return None


def pixels(frame):
    with Image.open(io.BytesIO(frame)) as im:
        return im.convert('RGB').resize((160, 96))


def difference(before, after):
    grey = ImageChops.difference(before, after).convert('L')
    return round(sum(grey.histogram()[18:]) / (grey.width * grey.height), 4)


async def screenshot(page):
    try:
        return await page.screenshot(type='jpeg', quality=55, timeout=5000, animations='allow')
    except Error:
        # A busy plugin can stall Playwright's compositor capture. Collect a
        # viewport copy directly through CDP, without changing game state.
        session = await page.context.new_cdp_session(page)
        try:
            frame = await asyncio.wait_for(session.send('Page.captureScreenshot',
                {'format':'jpeg', 'quality':55, 'fromSurface':False}),timeout=5)
            return base64.b64decode(frame['data'])
        except (Error,asyncio.TimeoutError):
            return None
        finally:
            await session.detach()


async def key(page, name):
    await page.keyboard.down(name)
    await page.wait_for_timeout(140)
    await page.keyboard.up(name)
    await page.wait_for_timeout(90)


async def trial(page, g, result, evidence, base):
    start = time.monotonic()
    ident, directory = g['id'], g['directory']
    url = base + quote(g['entry'])
    response = await page.goto(url, wait_until='domcontentloaded', timeout=30000)
    result['http'] = response.status if response else None
    if result['http'] != 200:
        result['outcome'] = 'entry-unavailable'
        return
    await page.wait_for_timeout(4800 if ident in HEAVY or ident in EMULATED else 1000)
    if directory == 'Character AI':
        # Protected interactive chat. Inspect its visible shell without sending
        # a message, opening account UI or inspecting its implementation.
        await page.screenshot(path=str(evidence/'after.jpg'), type='jpeg', quality=55, timeout=7000)
        result['outcome'] = 'protected-shell-observed'
        return
    if ident == 245:
        try:
            await page.wait_for_function('()=>window.capitalDriveSnapshot?.().ready', timeout=135000)
            await click_element(page,'[data-game-mode="free"]')
            await page.locator('#guided-tutorial').uncheck()
            await page.locator('#startup-quality').select_option('performance')
        except Error:
            pass
    if directory in CANVAS_MENUS:
        await page.wait_for_timeout(2400)
    before_text = await page.evaluate("document.body?.innerText || ''")
    result['initialText'] = ' '.join(before_text.split())[:240]
    started = False
    if directory in START and await click_element(page, START[directory]):
        result['inputs'].append('Start '+START[directory])
        started = True
    else:
        button = await first_visible(page.get_by_role('button',name=START_LABEL))
        if button:
            label = await button.inner_text()
            try:
                await button.click(timeout=1200)
                started = True
                result['inputs'].append('Start '+label.strip()[:40])
            except Error:
                pass
    for fraction_x, fraction_y in CANVAS_MENUS.get(directory, []):
        await page.mouse.click(round(fraction_x*850),round(fraction_y*590))
        result['inputs'].append(f'Canvas menu at {fraction_x:.2f}, {fraction_y:.2f}')
        await page.wait_for_timeout(700)
    await page.wait_for_timeout(550)
    before = await screenshot(page)
    await page.wait_for_timeout(650)
    idle = await screenshot(page)
    if idle:
        (evidence/'before.jpg').write_bytes(idle)
    verified = False
    if directory in PROBES or directory in STATE_PROBES:
        if directory in STATE_PROBES:
            steps, selector = STATE_PROBES[directory]
            async def sample():
                return await page.evaluate(selector)
        else:
            steps, selector = PROBES[directory]
            async def sample():
                return await controlled_value(page, selector)
        previous = await sample()
        inputs_before = len(result['inputs'])
        for step in steps.split('|'):
            if step.startswith('key:'):
                await key(page, step[4:])
                result['inputs'].append(step)
            elif step.startswith('drag:'):
                start_selector, end_selector = step[5:].split('>', 1)
                src = await first_visible(page.locator(start_selector))
                dst = await first_visible(page.locator(end_selector))
                if src and dst:
                    await src.drag_to(dst,timeout=2200)
                    result['inputs'].append(step)
            elif step.startswith('fill:'):
                field, value = step[5:].split(':',1)
                src = await first_visible(page.locator(field))
                if src:
                    await src.fill(value)
                    result['inputs'].append(step)
            elif await click_element(page, step):
                result['inputs'].append('Click '+step)
        await page.wait_for_timeout(180)
        current = await sample()
        if len(result['inputs']) != inputs_before and current != previous:
            proof = {'selector': selector}
            if isinstance(previous,list) and isinstance(current,list):
                index = next((i for i,(a,b) in enumerate(zip(previous,current)) if a!=b),
                             min(len(previous),len(current)))
                proof.update(index=index, beforeCount=len(previous), afterCount=len(current))
                previous = previous[index] if index < len(previous) else None
                current = current[index] if index < len(current) else None
            proof.update(before=str(previous)[:230],after=str(current)[:230])
            result['proof'] = proof
            verified = True
    if not verified:
        node = await surface(page)
        if node:
            rect = await node.bounding_box()
            if rect:
                x = rect['x'] + rect['width'] * .5
                y = rect['y'] + rect['height'] * .5
                await page.mouse.click(x, y)
                result['inputs'].append('Click visible game surface')
        keys = KEYS.get(directory)
        if ident in EMULATED:
            keys = ['Enter','Enter','z','ArrowRight','x']
        for command in keys or ['ArrowRight','ArrowUp','Space']:
            await key(page,command)
            result['inputs'].append(command)
    await page.wait_for_timeout(650)
    after = await screenshot(page)
    if after:
        (evidence/'after.jpg').write_bytes(after)
    idle_delta = difference(pixels(before),pixels(idle)) if before and idle else None
    delta = difference(pixels(idle),pixels(after)) if idle and after else None
    result.update(idlePixelFraction=idle_delta,postInputPixelFraction=delta)
    final_text = ' '.join((await page.evaluate("document.body?.innerText || ''")).split())
    result['finalText'] = final_text[:240]
    if verified:
        result['outcome'] = 'game-control-state-confirmed'
    elif delta is not None and idle_delta is not None and delta >= .002 and idle_delta < .0005:
        result['outcome'] = 'visible-response-after-input'
    elif started and ' '.join(before_text.split()) != final_text:
        result['outcome'] = 'start-control-responded'
    elif (delta or 0) >= .002 or (idle_delta or 0) >= .002:
        result['outcome'] = 'animated-surface-input-unconfirmed'
    elif delta is None:
        result['outcome'] = 'input-sent-frame-unavailable'
    else:
        result['outcome'] = 'input-attempted-no-observed-change'
    result['elapsedSeconds'] = round(time.monotonic()-start, 2)


async def examine(browser, g, output, origin):
    slug = re.sub('[^a-z0-9]+','-',g['directory'].lower()).strip('-')
    evidence = output / slug
    evidence.mkdir()
    result = dict(g, inputs=[], errors=[], failedLocal=[], externalBlocked=[], outcome='harness-error')
    if not g['entry'] or not (ROOT/g['entry']).is_file():
        result['outcome'] = 'entry-unavailable'
        return result
    result['entrySHA256'] = hashlib.sha256((ROOT/g['entry']).read_bytes()).hexdigest()
    context = await browser.new_context(viewport={'width':850,'height':590},service_workers='block',
                                        accept_downloads=False, permissions=[])
    async def guard(route):
        parsed = urlsplit(route.request.url)
        if parsed.scheme in ('http','https') and parsed.netloc != urlsplit(origin).netloc:
            if parsed.netloc not in result['externalBlocked']:
                result['externalBlocked'].append(parsed.netloc)
            await route.abort()
        else:
            await route.continue_()
    await context.route('**/*',guard)
    await context.route_web_socket(re.compile(r'^wss?://'),lambda socket: socket.close())
    page = await context.new_page()
    page.set_default_timeout(1800)
    page.on('dialog',lambda modal: modal.dismiss())
    def error(msg):
        clean = str(msg).replace(origin, '')
        if len(result['errors']) < 6 and clean not in result['errors']:
            result['errors'].append(clean[:240])
    page.on('pageerror',error)
    def observe(response):
        if response.status >= 400 and response.url.startswith(origin):
            value = [response.status,urlsplit(response.url).path]
            if value not in result['failedLocal'] and len(result['failedLocal']) < 12:
                result['failedLocal'].append(value)
    page.on('response',observe)
    try:
        await asyncio.wait_for(trial(page,g,result,evidence,origin),timeout=205 if g['id']==245 else 70)
    except (Error,asyncio.TimeoutError) as exc:
        result['error'] = str(exc).replace(origin,'')[:350] or 'Time budget exceeded'
        try:
            stopped = await screenshot(page)
            if stopped:
                (evidence/'stopped.jpg').write_bytes(stopped)
        except Error:
            pass
    finally:
        await context.close()
    result['entryUnchanged'] = result['entrySHA256'] == hashlib.sha256((ROOT/g['entry']).read_bytes()).hexdigest()
    return result


async def run(args):
    games = titles()
    if args.games:
        wanted = set(args.games.split(','))
        games = [game for game in games if str(game['id']) in wanted or game['directory'] in wanted]
        missing = wanted - {str(g['id']) for g in games} - {g['directory'] for g in games}
        if missing:
            raise ValueError('Unknown games: '+', '.join(sorted(missing)))
    output = args.output.resolve()
    if output == ROOT or ROOT in output.parents:
        raise ValueError('Select a fresh output directory outside the repository.')
    output.mkdir(parents=True,exist_ok=False)
    server = ThreadingHTTPServer(('127.0.0.1',0),functools.partial(LocalFiles,directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever,daemon=True)
    thread.start()
    origin = f'http://127.0.0.1:{server.server_port}/'
    queue = asyncio.Queue()
    for g in games:
        queue.put_nowait(g)
    results = []
    harness_digest = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    revision = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    try:
        async with async_playwright() as p:
            async def worker():
                browser = await p.chromium.launch(executable_path=args.chromium,headless=True,
                        args=['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader',
                              '--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
                try:
                    while not queue.empty():
                        game = queue.get_nowait()
                        result = await examine(browser,game,output,origin)
                        print(f"{game['title']}: {result['outcome']}",flush=True)
                        results.append(result)
                        with (output/'progress.jsonl').open('a') as stream:
                            stream.write(json.dumps(result,ensure_ascii=False)+'\n')
                finally:
                    await browser.close()
            await asyncio.gather(*(worker() for _ in range(args.workers)))
    finally:
        server.shutdown()
        server.server_close()
    report = dict(revision=revision, harnessSHA256=harness_digest, count=len(results),
                  outcomes=dict(collections.Counter(r['outcome'] for r in results)),
                  games=sorted(results,key=lambda g:g['directory'].lower()))
    (output/'results.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(report['outcomes']),flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--games',help='Optional comma-separated directories or catalog IDs')
    parser.add_argument('--workers',choices=[1,2,3],type=int,default=2)
    parser.add_argument('--chromium',default='/usr/bin/chromium')
    asyncio.run(run(parser.parse_args()))
