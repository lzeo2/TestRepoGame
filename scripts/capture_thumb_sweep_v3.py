#!/usr/bin/env python3
"""Fresh five-game batches. Review RAM candidates before copying any into thumbs.

TMPDIR=/dev/shm python3 -B scripts/capture_thumb_sweep_v3.py --batch 1
python3 -B scripts/capture_thumb_sweep_v3.py --self-test
Serves tracked HEAD game blobs directly, including sparse-excluded dependencies.
No checkout, downloads, state injection, or automatic thumbnail acceptance.
"""
import argparse
import hashlib
import http.server
import io
import json
import mimetypes
import os
from pathlib import Path
import signal
import subprocess
import threading
import time
from urllib.parse import quote, unquote, urlsplit

from PIL import Image, ImageDraw
from capture_game_thumbs import ROOT, VIEWPORT, CHROME, require_space, require_response, validate_jpg

OUT = Path('/dev/shm/thumb-sweep-v3')


class CaptureBudgetExceeded(BaseException):
    """Bypass best-effort UI catches so the hard game deadline cannot be swallowed."""


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def tracked(ref='HEAD'):
    files = {}
    for row in git('ls-tree', '-rz', ref).split(b'\0'):
        if row:
            meta, path = row.split(b'\t', 1)
            mode, kind, oid = meta.split()
            if kind == b'blob' and mode != b'120000':
                files[os.fsdecode(path)] = oid.decode()
    return files


def request_path(url):
    path = unquote(urlsplit(url).path).lstrip('/')
    if '\\' in path or '\x00' in path or any(p in ('.', '..') for p in path.split('/')):
        raise ValueError('unsafe request path')
    return path + 'index.html' if not path or path.endswith('/') else path


def serve(files):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def send_head(self):
            try:
                path = request_path(self.path)
            except ValueError:
                self.send_error(400)
                return None
            # Games always come from immutable HEAD; never trust partial local trees.
            if path.startswith('Games/') or not (ROOT / path).is_file():
                if path not in files:
                    self.send_error(404)
                    return None
                data = git('cat-file', 'blob', files[path])
                self.send_response(200)
                self.send_header('Content-Type', mimetypes.guess_type(path)[0] or 'application/octet-stream')
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                return io.BytesIO(data)
            return super().send_head()

        def log_message(self, *_):
            pass

        def copyfile(self, source, outputfile):
            try:
                super().copyfile(source, outputfile)
            except (BrokenPipeError, ConnectionResetError):
                pass

    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def click(page, selector, actions):
    locator = page.locator(selector).first
    if locator.count() and locator.is_visible():
        locator.click(timeout=1800)
        actions.append('click ' + selector)
        page.wait_for_timeout(500)
        return True
    return False


def interact(page, game, actions):
    # Native controls only. These are attempts, not an assertion of gameplay.
    for _ in range(3):
        found = False
        for selector in ('button:has-text("Start game")', '#start', '#startBtn', '#playBtn',
                         '#start-button', 'button:text-is("Play")', 'button:text-is("Start")',
                         'button:text-is("New Game")', 'button:text-is("Continue")',
                         'button:text-is("Solo")', 'button:text-is("Skip")',
                         '[onclick="startGame()"]'):
            try:
                if click(page, selector, actions):
                    found = True
                    break
            except Exception:
                continue
        if not found:
            break
    title = game['title']
    if 'Cookie Clicker' in title:
        click(page, '#langSelect-EN', actions)
        page.wait_for_timeout(1500)
        for _ in range(8):
            if not click(page, '#bigCookie', actions):
                break
    elif title == 'A Dark Room':
        click(page, '#lightFireButton', actions)
    elif title == 'Server Survival':
        click(page, '[onclick="window.tutorial?.skip()"]', actions)
        click(page, '#tool-waf', actions)
        page.mouse.click(720, 500)
        click(page, '#btn-play', actions)
    elif title == 'JANKOLOCK':
        click(page, '#startBtn', actions)
    elif title in ('Snake', 'Snake Hacked', 'Chrome Dino', 'Breakout', 'Breakout Hacked',
                   'Doodle Jump', 'Doodle Jump Hacked', 'Pacman', 'Qix', 'Joust',
                   'Tron Light Cycles', 'Asteroids', 'Frogger', 'Space Invaders',
                   'Lunar Lander', 'Missile Command', 'Bullet Hell', 'Tag Relay'):
        page.keyboard.press('Space')
        page.keyboard.down('ArrowRight')
        page.wait_for_timeout(450)
        page.keyboard.up('ArrowRight')
        actions.append('Space; ArrowRight 450ms')
    page.wait_for_timeout(1800)


def sheet(batch, records):
    image = Image.new('RGB', (960, len(records) * 292), '#dddddd')
    draw = ImageDraw.Draw(image)
    for i, record in enumerate(records):
        for j, stage in enumerate(('initial', 'candidate')):
            path = OUT / f'{record["index"]:03d}-{stage}.jpg'
            if path.exists():
                with Image.open(path) as frame:
                    image.paste(frame.resize((480, 270)), (j * 480, i * 292 + 22))
        draw.text((4, i * 292 + 4), f'{record["index"]:03d} {record["title"]} | initial / candidate', fill='black')
    image.save(OUT / f'batch-{batch:02d}.jpg', quality=85)


def merge_records(previous, records):
    merged = dict(previous)
    merged.update((r['index'], r) for r in records)
    return [merged[index] for index in sorted(merged)]


def capture(batch, only=None, steps=None):
    require_space()
    assert os.environ.get('TMPDIR') == '/dev/shm', 'Use RAM browser scratch: TMPDIR=/dev/shm'
    # A sibling's downloaded Chromium must not overlap this system-browser pass.
    siblings = subprocess.run(['pgrep', '-f', 'chrome-linux/chrome'], capture_output=True)
    assert siblings.returncode == 1, 'Sibling Chromium active; sequence captures instead'
    OUT.mkdir(exist_ok=True)
    games = json.loads((ROOT / 'games.json').read_text())
    head = git('rev-parse', 'HEAD').decode().strip()
    files = tracked(head)
    assert all(g['url'] in files for g in games)
    report_path = OUT / f'batch-{batch:02d}.json'
    previous_records = {r['index']: r for r in json.loads(report_path.read_text())} if report_path.exists() else {}
    records = []
    server = serve(files)
    origin = f'http://127.0.0.1:{server.server_port}'
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME, headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
                      '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
            try:
                for index in range((batch-1)*5, min(batch*5, len(games))):
                    if only and index+1 != only:
                        if index+1 in previous_records:
                            records.append(previous_records[index+1])
                        continue
                    require_space()
                    game = games[index]
                    record = dict(index=index+1, id=game['id'], title=game['title'], head=head,
                        entry_blob=files[game['url']], source_tree=git('rev-parse', head + ':' + '/'.join(game['url'].split('/')[:2])).decode().strip(),
                        status='unreviewed', actions=[], errors=[], external=[], http_errors=[])
                    start = time.monotonic()
                    context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
                    def route(r):
                        url = r.request.url
                        if urlsplit(url).scheme in ('data', 'blob', 'about') or url.startswith(origin + '/'):
                            r.continue_()
                        else:
                            record['external'].append(url)
                            r.abort()
                    context.route('**/*', route)
                    page = context.new_page()
                    page.set_default_timeout(2000)
                    page.on('pageerror', lambda error: record['errors'].append(str(error)[:300]))
                    page.on('response', lambda r: record['http_errors'].append(str(r.status)+' '+urlsplit(r.url).path) if r.status >= 400 else None)
                    def expired(*_):
                        raise CaptureBudgetExceeded('120 second automation budget exhausted')
                    previous = signal.signal(signal.SIGALRM, expired)
                    prior_seconds = previous_records.get(index+1, {}).get('seconds', 0)
                    if prior_seconds >= 110:
                        signal.signal(signal.SIGALRM, previous)
                        context.close()
                        records.append(previous_records[index+1])
                        continue
                    signal.alarm(max(1, int(115-prior_seconds)))
                    try:
                        response = page.goto(origin + '/' + quote(game['url'], safe='/'), wait_until='domcontentloaded', timeout=35000)
                        require_response(response)
                        record['http_status'] = response.status
                        page.wait_for_timeout(5000)
                        try:
                            page.screenshot(path=str(OUT / f'{index+1:03d}-initial.jpg'), type='jpeg', quality=78, timeout=5000)
                        except Exception:
                            record['initial_warning'] = 'initial screenshot timed out; gameplay attempt continues'
                        if steps is None:
                            interact(page, game, record['actions'])
                        else:
                            for action in steps:
                                record['actions'].append(action)
                                if action[0] == 'click':
                                    page.mouse.click(*action[1:], delay=120)
                                elif action[0] == 'wait':
                                    page.wait_for_timeout(action[1])
                                elif action[0] == 'key':
                                    page.keyboard.press(action[1], delay=120)
                                elif action[0] == 'hold':
                                    page.keyboard.down(action[1])
                                    page.wait_for_timeout(action[2])
                                    page.keyboard.up(action[1])
                                elif action[0] == 'selector':
                                    page.locator(action[1]).first.click(timeout=2000)
                                elif action[0] == 'fill':
                                    page.locator(action[1]).fill(action[2])
                                elif action[0] == 'scroll':
                                    page.mouse.wheel(0, action[1])
                                    page.wait_for_timeout(250)
                                else:
                                    raise ValueError('Unknown native action: '+str(action))
                        data = page.screenshot(type='jpeg', quality=78, timeout=15000)
                        # Dark genuine scenes can have low variance: do not silently accept them.
                        try:
                            validate_jpg(data, {})
                        except ValueError as exc:
                            record['guard_warning'] = str(exc)
                        (OUT / f'{index+1:03d}-candidate.jpg').write_bytes(data)
                        record['candidate_sha256'] = hashlib.sha256(data).hexdigest()
                        record['text'] = page.locator('body').inner_text(timeout=2500)[:2000]
                        record['buttons'] = page.locator('button,input[type=button],a').evaluate_all('(els)=>els.filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,id:e.id,text:e.innerText||e.value})).slice(0,40)')
                    except (Exception, CaptureBudgetExceeded) as exc:
                        record['status'] = 'needs-manual'
                        record['reason'] = f'{type(exc).__name__}: {str(exc)[:180]}'
                    finally:
                        signal.alarm(0)
                        signal.signal(signal.SIGALRM, previous)
                        context.close()
                    record['seconds'] = round(prior_seconds+time.monotonic()-start, 2)
                    records.append(record)
                    report_path.write_text(json.dumps(merge_records(previous_records, records), indent=2)+'\n')
                    print(f'{index+1:03d} {game["title"]}: {record["status"]} {record["seconds"]}s', flush=True)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
    report_path.write_text(json.dumps(merge_records(previous_records, records), indent=2)+'\n')
    sheet(batch, records)
    print(f'Batch {batch} closed browser/server; review {OUT.name}/batch-{batch:02d}.jpg', flush=True)


def self_test():
    assert not isinstance(CaptureBudgetExceeded(), Exception)
    assert merge_records({1: {'index': 1, 'old': True}, 2: {'index': 2}},
                         [{'index': 1, 'new': True}]) == [{'index': 1, 'new': True}, {'index': 2}]
    assert request_path('/Games/Character%20AI/Alsen.html?v=1') == 'Games/Character AI/Alsen.html'
    assert request_path('/') == 'index.html'
    for bad in ('/Games/../a', '/Games/%2e%2e/a', '/Games/A%5cB', '/a%00'):
        try:
            request_path(bad)
        except ValueError:
            pass
        else:
            raise AssertionError(bad)
    files = tracked()
    server = serve(files)
    try:
        from urllib.request import urlopen
        from urllib.error import HTTPError
        origin = f'http://127.0.0.1:{server.server_port}'
        path = 'Games/Snake/index.html'
        with urlopen(origin+'/'+path) as response:
            assert response.status == 200
            assert response.read() == git('cat-file', 'blob', files[path])
        try:
            urlopen(origin+'/Games/__missing__/index.html')
        except HTTPError as error:
            assert error.code == 404
        else:
            raise AssertionError('missing game served')
    finally:
        server.shutdown()
        server.server_close()
    print('PASS: retry record preservation, URL guards, sparse HEAD blob identity, genuine missing-file HTTP 404')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--batch', type=int, choices=range(1,27))
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--game', type=int, help='retry one catalog index within its remaining 120s budget')
    parser.add_argument('--steps', type=json.loads, help='JSON native click/wait/key/hold/selector/fill actions')
    args = parser.parse_args()
    self_test() if args.self_test else capture((args.game-1)//5+1 if args.game else args.batch or 1, args.game, args.steps)
