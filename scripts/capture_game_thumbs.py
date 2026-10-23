#!/usr/bin/env python3
"""Fill missing portal art, sequentially, without overwriting hand-picked JPGs.

Run: TMPDIR=/dev/shm python3 -B scripts/capture_game_thumbs.py
Regression: python3 -B scripts/capture_game_thumbs.py --self-test
Failures are retained in .tmp/thumbs_state.json; remove a failure entry to retry.
"""
import functools
import hashlib
import http.server
import io
import json
import os
import re
import shutil
import socketserver
import sys
import threading
import time
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "thumbs"
STATE = ROOT / ".tmp" / "thumbs_state.json"
PORT = int(os.environ.get("THUMB_PORT", "8913"))
CHROME = "/usr/bin/chromium"
VIEWPORT = {"width": 1280, "height": 720}
PER_GAME_TIMEOUT_MS = 60_000
SETTLE_SECONDS = 7
SKIP = {"Eaglercraft"}
MIN_FREE = 2 * 1024**3


def slug(title):
    return re.sub(r"[^a-z0-9]+", "", title.lower()) or "game"


def aliases():
    source = (ROOT / "assets" / "portal-ux.js").read_text()
    mapping = source.split("var THUMBS = ", 1)[1].split(";", 1)[0]
    return json.loads(re.sub(r",\s*}", "}", mapping))


def entry_path(url):
    parsed = urlsplit(url)
    path = (ROOT / unquote(parsed.path)).resolve()
    if parsed.scheme or parsed.netloc or not path.is_relative_to(ROOT):
        raise ValueError("not a local catalog path")
    if not path.is_file():
        raise FileNotFoundError(f"missing local entry: {url}")
    return path


def require_response(response):
    if response is None or response.status != 200:
        raise ValueError(f"navigation HTTP {response.status if response else 'no response'} (expected 200)")


def validate_jpg(data, known):
    digest = hashlib.md5(data).hexdigest()
    if digest in known:
        raise ValueError(f"duplicate JPG of {known[digest]}")
    with Image.open(io.BytesIO(data)) as image:
        stats = ImageStat.Stat(image.convert("L"))
    if stats.stddev[0] < 8:
        raise ValueError(f"blank JPG: mean={stats.mean[0]:.2f}, sd={stats.stddev[0]:.2f} < 8")
    return digest


def require_space():
    free = shutil.disk_usage(ROOT).free
    if free < MIN_FREE:
        raise RuntimeError(f"storage STOP: {free} bytes free, below {MIN_FREE}")


def serve():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


def main():
    require_space()
    if os.environ.get("TMPDIR") != "/dev/shm":
        raise RuntimeError("set TMPDIR=/dev/shm for browser scratch")
    games = json.loads((ROOT / "games.json").read_text())
    state = json.loads(STATE.read_text()) if STATE.exists() else {"done": [], "fail": {}}
    mapping = aliases()
    todo = []
    for game in games:
        title, url = game.get("title", ""), game.get("url", "")
        if not title or not url or title in SKIP:
            continue
        name = mapping.get(title, slug(title))
        if (OUT / f"{name}.jpg").is_file():
            continue
        # A stale done record never substitutes for an actual image.
        if title not in state["fail"]:
            todo.append((title, url, name))
    print(f"missing thumbs to attempt: {len(todo)}; retained failures: {len(state['fail'])}", flush=True)
    if not todo:
        return

    OUT.mkdir(parents=True, exist_ok=True)
    known = {hashlib.md5(p.read_bytes()).hexdigest(): p.name for p in OUT.glob("*.jpg")}
    from playwright.sync_api import sync_playwright

    httpd = serve()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True, executable_path=CHROME,
                args=["--no-sandbox", "--disable-dev-shm-usage",
                      "--use-gl=angle", "--use-angle=swiftshader",
                      "--autoplay-policy=no-user-gesture-required"])
            try:
                for title, url, name in todo:
                    require_space()
                    dest = OUT / f"{name}.jpg"
                    if dest.exists():
                        continue  # an earlier alias may just have supplied it
                    started = time.time()
                    page = None
                    try:
                        entry_path(url)  # do not even navigate absent local entries
                        page = browser.new_page(viewport=VIEWPORT)
                        response = page.goto(f"http://127.0.0.1:{PORT}/{quote(url, safe='/')}",
                                             wait_until="domcontentloaded", timeout=PER_GAME_TIMEOUT_MS)
                        require_response(response)
                        page.wait_for_timeout(SETTLE_SECONDS * 1000)
                        data = page.screenshot(type="jpeg", quality=70)
                        validate_jpg(data, known)
                        with Image.open(io.BytesIO(data)) as image:
                            output = io.BytesIO()
                            image.convert("RGB").resize((480, 270), Image.Resampling.LANCZOS).save(
                                output, format="JPEG", quality=70)
                        data = output.getvalue()
                        digest = validate_jpg(data, known)
                        require_space()
                        dest.write_bytes(data)  # rejected images never reach disk
                        known[digest] = dest.name
                        if title not in state["done"]:
                            state["done"].append(title)
                        print(f"ok {title} {time.time()-started:.0f}s -> {dest.name}", flush=True)
                    except Exception as exc:
                        if isinstance(exc, RuntimeError) and str(exc).startswith("storage STOP"):
                            raise
                        state["fail"][title] = f"{type(exc).__name__}: {str(exc)[:200]}"
                        print(f"FAIL {title}: {state['fail'][title]}", flush=True)
                    finally:
                        if page is not None:
                            page.close()
                    STATE.parent.mkdir(exist_ok=True)
                    STATE.write_text(json.dumps(state, indent=1))
            finally:
                browser.close()
    finally:
        httpd.shutdown()
        httpd.server_close()
    print(f"done: {len(state['done'])} ok, {len(state['fail'])} fail", flush=True)


def self_test():
    from types import SimpleNamespace
    assert slug("Snake Hacked") == "snakehacked"
    assert aliases()["Snake Hacked"] == "snakehacked"
    assert entry_path("index.html") == ROOT / "index.html"
    for url in ("__missing_thumb_entry__.html", "../outside.html", "https://example.invalid/game"):
        try:
            entry_path(url)
        except (ValueError, FileNotFoundError):
            pass
        else:
            raise AssertionError(url)
    require_response(SimpleNamespace(status=200))
    for response in (None, SimpleNamespace(status=404), SimpleNamespace(status=500)):
        try:
            require_response(response)
        except ValueError:
            pass
        else:
            raise AssertionError(response)
    def jpg(image):
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=70)
        return output.getvalue()
    textured = Image.new("RGB", (480, 270))
    textured.paste("white", (240, 0, 480, 270))
    data = jpg(textured)
    digest = validate_jpg(data, {})
    for candidate, known in ((data, {digest: "existing.jpg"}), (jpg(Image.new("RGB", (480, 270), "white")), {})):
        try:
            validate_jpg(candidate, known)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid capture accepted")
    print("thumbnail guard self-test: PASS (local path, HTTP 200, aliases, duplicate, blank)")


if __name__ == "__main__":
    self_test() if "--self-test" in sys.argv else main()
