#!/usr/bin/env python3
"""Capture real screenshots as portal thumbnails for games lacking art.

Fill-only: skips games that already have assets/thumbs/<slug>.jpg. Uses the
system chromium (no downloads), one browser at a time (Pi constraint), serves
the repo over loopback http so relative paths work like production. Records
per-game failures instead of aborting; resumable via .tmp/thumbs_state.json.

Run: /home/leozhang/.hermes/venv/bin/python scripts/capture_game_thumbs.py
"""
import json, os, re, sys, threading, time, http.server, socketserver, functools
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "thumbs"
STATE = ROOT / ".tmp" / "thumbs_state.json"
PORT = int(os.environ.get("THUMB_PORT", "8913"))
CHROME = os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium")
VIEWPORT = {"width": 1280, "height": 720}
PER_GAME_TIMEOUT_MS = 60_000
SETTLE_SECONDS = 7
SKIP = {"Eaglercraft"}  # offline-strict, heavy emulator; hand pick if ever wanted


def slug(title: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "", title.lower())
    return s or "game"


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    games = json.loads((ROOT / "games.json").read_text())
    state = json.loads(STATE.read_text()) if STATE.exists() else {"done": [], "fail": {}}
    todo = []
    for g in games:
        title, url = g.get("title", ""), g.get("url", "")
        if not title or not url or title in SKIP:
            continue
        if slug(title) in {Path(p).stem for p in os.listdir(OUT)}:
            continue  # existing hand-picked art wins
        if title in state["done"] or title in state["fail"]:
            continue
        todo.append((title, url))
    print(f"missing thumbs: {len(todo)}", flush=True)
    if not todo:
        return

    OUT.mkdir(parents=True, exist_ok=True)
    serve()
    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, executable_path=CHROME,
            args=["--no-sandbox", "--disable-dev-shm-usage",
                  "--use-gl=angle", "--use-angle=swiftshader",
                  "--autoplay-policy=no-user-gesture-required"])
        page = browser.new_page(viewport=VIEWPORT)
        for title, url in todo:
            target = f"http://127.0.0.1:{PORT}/{url}"
            t0 = time.time()
            try:
                page.set_default_timeout(PER_GAME_TIMEOUT_MS)
                page.goto(target, wait_until="domcontentloaded", timeout=PER_GAME_TIMEOUT_MS)
                page.wait_for_timeout(SETTLE_SECONDS * 1000)
                page.screenshot(path=str(OUT / f"{slug(title)}.jpg"), type="jpeg", quality=68)
                state["done"].append(title)
                print(f"ok {title} {time.time()-t0:.0f}s", flush=True)
            except Exception as exc:
                state["fail"][title] = f"{type(exc).__name__}: {str(exc)[:160]}"
                print(f"FAIL {title}: {state['fail'][title]}", flush=True)
                try:
                    page.goto("about:blank")
                except Exception:
                    pass
            STATE.parent.mkdir(exist_ok=True)
            STATE.write_text(json.dumps(state, indent=1))
        browser.close()
    print(f"done: {len(state['done'])} ok, {len(state['fail'])} fail", flush=True)


if __name__ == "__main__":
    main()
