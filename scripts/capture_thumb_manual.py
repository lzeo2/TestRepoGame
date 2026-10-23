#!/usr/bin/env python3
"""Native-input manual thumbnail session, at most five games and 180s per game.

TMPDIR=/dev/shm python3 -B scripts/capture_thumb_manual.py
Send JSON arrays to /dev/shm/thumb-manual/command.json; read reply.json.
Commands: open ID, click X Y, key KEY, hold KEY MS, wait MS, selector CSS,
snap, info, finish REASON, quit. Candidates require separate visual acceptance.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import time
from urllib.parse import quote, urlsplit

from capture_game_thumbs import CHROME, ROOT, VIEWPORT, require_space, require_response
from capture_thumb_sweep_v3 import CaptureBudgetExceeded, git, serve, tracked

OUT = Path('/dev/shm/thumb-manual')


def remaining(start):
    return max(0, 180 - (time.monotonic() - start))


def main():
    require_space()
    assert os.environ.get('TMPDIR') == '/dev/shm'
    assert subprocess.run(['pgrep', '-f', 'chrome-linux/chrome'], capture_output=True).returncode == 1, 'Sibling browser active'
    OUT.mkdir(exist_ok=True)
    command = OUT / 'command.json'
    reply = OUT / 'reply.json'
    command.unlink(missing_ok=True)
    reply.unlink(missing_ok=True)
    games = {g['id']: g for g in json.loads((ROOT / 'games.json').read_text())}
    head = git('rev-parse', 'HEAD').decode().strip()
    files = tracked(head)
    server = serve(files)
    origin = f'http://127.0.0.1:{server.server_port}'
    record = context = page = None
    count = 0

    def expire(*_):
        raise CaptureBudgetExceeded('180s game deadline')

    def finish(reason):
        nonlocal record, context, page
        signal.alarm(0)
        if record:
            record['seconds'] = round(time.monotonic() - started, 2)
            record['reason'] = reason
            (OUT / f'{record["id"]}.json').write_text(json.dumps(record, indent=2) + '\n')
        if context:
            context.close()
        record = context = page = None

    signal.signal(signal.SIGALRM, expire)
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=CHROME, headless=True,
                args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader',
                      '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
            try:
                while True:
                    try:
                        if not command.exists():
                            time.sleep(.1)
                            continue
                        actions = json.loads(command.read_text())
                        command.unlink()
                        result = {}
                        for action in actions:
                            op, *args = action
                            if op == 'quit':
                                finish('session closed')
                                reply.write_text(json.dumps({'closed': True}))
                                return
                            if op == 'open':
                                assert record is None, 'finish current game first'
                                assert count < 5, 'five-game batch exhausted; quit and restart'
                                require_space()
                                count += 1
                                game = games[int(args[0])]
                                started = time.monotonic()
                                record = dict(id=game['id'], title=game['title'], head=head,
                                    entry_blob=files[game['url']], source_tree=git('rev-parse', head+':'+ '/'.join(game['url'].split('/')[:2])).decode().strip(),
                                    actions=[], errors=[], external=[], http_errors=[], candidates=[])
                                signal.alarm(180)
                                context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
                                def route(r):
                                    if urlsplit(r.request.url).scheme in ('data', 'blob', 'about') or r.request.url.startswith(origin+'/'):
                                        r.continue_()
                                    else:
                                        record['external'].append(urlsplit(r.request.url).netloc)
                                        r.abort()
                                context.route('**/*', route)
                                page = context.new_page()
                                page.set_default_timeout(1800)
                                page.on('pageerror', lambda e: record['errors'].append(str(e)[:200]) if record else None)
                                page.on('response', lambda r: record['http_errors'].append(str(r.status)+' '+urlsplit(r.url).path) if record and r.status >= 400 else None)
                                require_response(page.goto(origin+'/'+quote(game['url'], safe='/'), wait_until='domcontentloaded', timeout=35000))
                            elif op == 'finish':
                                finish(args[0])
                            else:
                                assert page is not None, 'open a game first'
                                record['actions'].append(action)
                                if op == 'click':
                                    page.mouse.click(*args)
                                elif op == 'key':
                                    page.keyboard.press(args[0], delay=100)
                                elif op == 'type':
                                    page.keyboard.type(args[0], delay=50)
                                elif op == 'hold':
                                    page.keyboard.down(args[0])
                                    page.wait_for_timeout(args[1])
                                    page.keyboard.up(args[0])
                                elif op == 'wait':
                                    page.wait_for_timeout(args[0])
                                elif op == 'selector':
                                    page.locator(args[0]).first.click(timeout=1800)
                                elif op == 'snap':
                                    name = f'{record["id"]}-{len(record["candidates"])}.jpg'
                                    cdp = context.new_cdp_session(page)
                                    try:
                                        data = base64.b64decode(cdp.send('Page.captureScreenshot',
                                            {'format': 'jpeg', 'quality': 80, 'fromSurface': True})['data'])
                                    finally:
                                        cdp.detach()
                                    (OUT / name).write_bytes(data)
                                    record['candidates'].append(dict(file=name, sha256=hashlib.sha256(data).hexdigest()))
                                    result['screenshot'] = name
                                elif op == 'info':
                                    result['text'] = page.locator('body').inner_text(timeout=2000)[:3500]
                                    result['controls'] = page.locator('button,input,select,a').evaluate_all('(es)=>es.filter(e=>e.getClientRects().length).map(e=>({tag:e.tagName,id:e.id,text:(e.innerText||e.value||"").slice(0,100)})).slice(0,50)')
                                else:
                                    raise ValueError(op)
                        if record:
                            result['remaining'] = round(remaining(started), 1)
                        reply.write_text(json.dumps(result))
                    except CaptureBudgetExceeded as exc:
                        finish(str(exc))
                        reply.write_text(json.dumps({'expired': str(exc)}))
                    except Exception as exc:
                        reply.write_text(json.dumps({'error': str(exc)[:400]}))
            finally:
                finish('session closed')
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    if '--self-test' in __import__('sys').argv:
        assert 179 <= remaining(time.monotonic()) <= 180
        assert remaining(time.monotonic()-181) == 0
        assert not isinstance(CaptureBudgetExceeded(), Exception)
        print('PASS: monotonic 180s deadline and uncaught budget exception')
    else:
        main()
