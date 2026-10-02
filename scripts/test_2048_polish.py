#!/usr/bin/env python3
"""Bounded Chromium regression. Injection is ONLY negative/composition fixtures.
Ordinary progress uses keyboard/CDP genuine touch; no engine hooks or RNG changes.
"""
import functools
import http.server
import json
from pathlib import Path
import shutil
import tempfile
import threading
import time
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def board(rows, **flags):
    return dict(grid=dict(size=4, cells=[[
        dict(position=dict(x=x, y=y), value=rows[y][x]) if rows[y][x] else None
        for y in range(4)] for x in range(4)]), score=0,
        over=False, won=False, keepPlaying=False, **flags)


def main():
    start = time.monotonic()
    assert shutil.disk_usage(ROOT).free >= 2_000_000_000
    shots = Path(tempfile.mkdtemp(prefix="task107-shots-", dir="/tmp"))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_port}/Games/2048/"
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=shutil.which("chromium"), headless=True, args=["--no-sandbox"])
            errors = []

            def page_for(script=None, mobile=False, theme="light"):
                context = browser.new_context(viewport=dict(width=390 if mobile else 1000, height=850),
                    has_touch=mobile, is_mobile=mobile, color_scheme=theme, reduced_motion="reduce")
                if script:
                    context.add_init_script(script)
                page = context.new_page()
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.goto(url)
                page.locator(".tile").first.wait_for()
                return context, page

            def slot(page):
                return page.evaluate("localStorage.getItem('gameState')")

            def fixture(state):
                return "localStorage.setItem('bestScore','4096');localStorage.setItem('unrelated','keep');localStorage.setItem('gameState'," + json.dumps(state) + ");"

            print("ORDINARY UI: keyboard, reload, new game, genuine touch", flush=True)
            for mobile in (False, True):
                for theme in ("light", "dark"):
                    ctx, page = page_for(mobile=mobile, theme=theme)
                    before = slot(page)
                    if mobile:
                        cdp = ctx.new_cdp_session(page)
                        box = page.locator(".game-container").bounding_box()
                        x, y = box['x'] + box['width']/2, box['y'] + box['height']/2
                        for dx, dy in ((-80, 0), (0, -80), (80, 0), (0, 80)):
                            cdp.send("Input.dispatchTouchEvent", dict(type="touchStart", touchPoints=[dict(x=x, y=y)]))
                            cdp.send("Input.dispatchTouchEvent", dict(type="touchMove", touchPoints=[dict(x=x+dx, y=y+dy)]))
                            cdp.send("Input.dispatchTouchEvent", dict(type="touchEnd", touchPoints=[]))
                    else:
                        for key in ("ArrowLeft", "ArrowUp", "ArrowRight", "ArrowDown") * 3:
                            page.keyboard.press(key)
                    after = slot(page)
                    assert before != after
                    page.reload()
                    page.locator(".tile").first.wait_for()
                    assert slot(page) == after
                    page.keyboard.press("Tab")
                    assert page.evaluate("getComputedStyle(document.activeElement).outlineStyle") != "none"
                    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
                    assert page.locator("meta[name=viewport]").get_attribute("content") == "width=device-width, initial-scale=1.0"
                    assert page.locator("#save-status").inner_text() == "Saved on this browser."
                    page.screenshot(path=str(shots / f"{'mobile' if mobile else 'desktop'}-{theme}.jpg"), type="jpeg", quality=55, full_page=True)
                    page.once("dialog", lambda d: d.dismiss())
                    page.keyboard.press("r")
                    assert slot(page) == after
                    page.once("dialog", lambda d: d.accept())
                    restart = page.locator(".restart-button")
                    restart.tap() if mobile else restart.click()
                    assert json.loads(slot(page))["score"] == 0
                    ctx.close()

            print("NEGATIVE fixtures: invalid JSON/shape/stale, scoped consent, conflicts", flush=True)
            valid = board([[2, 2, 0, 0], [0]*4, [0]*4, [0]*4])
            bad_states = ["{", "null", "{}", json.dumps({**valid, "score": -1}),
                json.dumps({**valid, "won": True}), json.dumps({**valid, "keepPlaying": True})]
            malformed = json.loads(json.dumps(valid))
            malformed['grid']['cells'][0][0]['position']['x'] = 3
            bad_states.append(json.dumps(malformed))
            for raw in bad_states:
                ctx, page = page_for(fixture(raw))
                assert "NOT persisted" in page.locator("#save-status").inner_text()
                page.keyboard.press("ArrowLeft")
                assert slot(page) == raw
                page.once("dialog", lambda d: d.dismiss())
                page.keyboard.press("r")
                assert slot(page) == raw
                page.once("dialog", lambda d: d.accept())
                page.locator(".restart-button").click()
                assert slot(page) != raw
                assert page.evaluate("localStorage.getItem('bestScore')") == '4096'
                assert page.evaluate("localStorage.getItem('unrelated')") == 'keep'
                ctx.close()
            ctx, page = page_for()
            page.evaluate("localStorage.setItem('gameState', 'conflict')")
            page.keyboard.press("ArrowLeft")
            page.keyboard.press("ArrowRight")
            assert slot(page) == 'conflict'
            assert "NOT persisted" in page.locator("#save-status").inner_text()
            # Cross-tab writes are best-effort, not an atomic transaction; tested above.
            ctx.close()

            print("NEGATIVE fixtures: denied, read-then-denied, quota", flush=True)
            for index, fault in enumerate(("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('denied','SecurityError')}});",
                "const get=Storage.prototype.getItem;let n=0;Storage.prototype.getItem=function(k){if(++n>2)throw new DOMException('denied','SecurityError');return get.call(this,k)};",
                "Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};")):
                ctx, page = page_for(fixture(json.dumps(valid)) + fault)
                assert "NOT persisted" in page.locator("#save-status").inner_text()
                before = page.locator('.tile-container').inner_html()
                page.keyboard.press("ArrowLeft")
                page.keyboard.press("ArrowRight")
                page.wait_for_function("before => document.querySelector('.tile-container').innerHTML !== before", arg=before)
                if index:
                    page.locator('.tile-4').first.wait_for()
                    assert page.locator(".best-container").inner_text() == '4096'
                # Initial getter denial cannot load the injected board or best.
                # It must remain playable, not pretend those bytes were loaded.
                ctx.close()

            print("COMPOSITION fixtures: preterminal win/loss, keep-going; NOT natural win", flush=True)
            for mobile in (False, True):
                for theme in ('light', 'dark'):
                    win = board([[1024, 1024, 0, 0], [0]*4, [0]*4, [0]*4])
                    ctx, page = page_for(fixture(json.dumps(win)), mobile, theme)
                    page.keyboard.press("ArrowLeft")
                    page.locator(".game-won").wait_for()
                    action = page.locator(".keep-playing-button")
                    assert action.evaluate("e=>getComputedStyle(e).backgroundColor") == 'rgb(0, 0, 0)'
                    assert action.bounding_box()['height'] >= 44
                    action.tap() if mobile else action.click()
                    assert json.loads(slot(page))['keepPlaying'] is True
                    page.keyboard.press("ArrowRight")
                    assert not page.locator(".game-won").count()
                    ctx.close()
            loss = board([[2, 8, 16, 32], [64, 128, 256, 512], [8, 16, 32, 64], [128, 256, 512, 0]])
            ctx, page = page_for(fixture(json.dumps(loss)))
            page.keyboard.press("ArrowRight")
            page.locator(".game-over").wait_for()
            assert slot(page) is None
            page.once("dialog", lambda d: d.accept())
            page.locator(".retry-button").click()
            assert json.loads(slot(page))['score'] == 0
            ctx.close()
            assert not errors, errors
            browser.close()
        assert sum(f.stat().st_size for f in shots.iterdir()) <= 1_000_000
        assert shutil.disk_usage(ROOT).free >= 2_000_000_000
        print(f"PASS; screenshots={shots}; duration={time.monotonic()-start:.2f}s", flush=True)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()

if __name__ == '__main__':
    main()
