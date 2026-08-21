#!/usr/bin/env python3
"""
Smoke-test every registered game: load its index.html in a real browser, watch
for console errors and failed/4xx network requests, report per game.
Exit code 1 if any game fails. This is the mandatory pre-push QA gate.

Run:  xvfb-run python3 scripts/smoke_test_games.py [--games Wordle,RetroBowl]
"""
import json, os, sys, threading, argparse, http.server
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8767
WAIT_MS = 8000  # real-time wait per game

BENIGN = ("favicon", "react devtools", "autofill", "source map", "devtools",
          "webgl renderer", "webgl rendering context",  # env-software-GL fallback, absent in real browsers
          "failed to load resource",  # duplicate of req capture below; reqs are the ground truth
          "loading fsb failed",       # Unity/FMOD audio banks missing in builds; game runs silent
          "501 (unsupported method",  # local http.server rejects POSTs; harmless analytics stubs
          "pre-main prep time",       # Unity boot-timing info logged as console.error
          "js/null.js",               # ad-slot path resolves to null (seraph builds); ads already neutered
          )
# Per-game engine/plugin debug spam that is non-fatal (documented, reviewable).
KNOWN_BENIGN = {
    "Ovo": ["proui: tag", "aekiro gameobject", "proui-gridview"],
    "Papa's Pizzeria": ["focusmanager"],           # Ruffle compat note, movie still plays
    "BitLife": ["writestringtomemory"],            # emscripten deprecation warning
    "10 Minutes Till Dawn": ["loading fsb failed"],  # audio banks missing in build; game silent but runs
    "Subway Surfers": ["fileutil"],                # Unity save-path quirk; game runs
    "Super Hot": ["hwstats.cgi"],                  # external stats endpoint; fails offline, game runs
    "Retro Bowl": ["savedata.ini", "optiondata.dat"],  # first-run save check 404s, expected
    "Stranded In Isekai": ["-snd.mp3"],            # audio preload aborts on scene swap; files exist
    "Character Alsen": ["svg%3e"],                 # data-URI favicon hack 404s; protected game, original 404
    "Cut the Rope": ["intro_1024.webm", "music"],  # headless lacks h264 (real browsers use mp4); seraph build ships no music files
    "Thumb Fighter": ["add-stylesheet", "safari_fix"],  # C3 headless quirk: runtime injects Safari-only stylesheet; handler rejects on 404, game still runs
}
BENIGN_REQS = ("unity3d.com", "svg%3e", "hwstats.cgi", "savedata.ini", "optiondata.dat",
               "snd.mp3", "http 501",
               "cloak.js",        # shared ad-cloak loader (../../storage/js/cloak.js) 404s in offline builds; benign, non-gameplay
               "storage/js/",     # ad/analytics storage paths referenced by commercial embeds
               "ico.ico", "favicon",  # browser auto-requests /favicon.ico; absent in local builds, harmless
               "about:blank",    # Playwright/Chromium blank-doc scheme error; benign, not a game asset
               "safari_fix.css")  # C3 Safari-only stylesheet; 404s offline, injected at runtime, non-fatal

def benign(text: str) -> bool:
    t = text.lower()
    return any(b in t for b in BENIGN)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", help="comma-separated titles to test (default: all)")
    ap.add_argument("--wait-ms", type=int, default=WAIT_MS)
    args = ap.parse_args()

    games = json.load(open(os.path.join(ROOT, "games.json")))
    if args.games:
        wanted = {g.strip().lower() for g in args.games.split(",")}
        games = [g for g in games if g["title"].lower() in wanted]

    os.chdir(ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT),
          lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=ROOT, **k))
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False,
                                    args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
                                          "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        for g in games:
            errs, fails = [], []
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            page.on("console", lambda m, e=errs: e.append(m.text) if m.type == "error" else None)
            page.on("requestfailed", lambda r, f=fails: f.append(f"{r.url.split('/')[-1]} :: {r.failure}"))
            page.on("response", lambda r, f=fails: f.append(f"HTTP {r.status} {r.url.split('/')[-1]}") if r.status >= 400 else None)
            try:
                page.goto(f"http://127.0.0.1:{PORT}/{g['url']}", timeout=15000, wait_until="domcontentloaded")
                page.wait_for_timeout(args.wait_ms)
                for sel in ("#playBtn", ".play-btn", ".game-card__play", "button:has-text('Play')", "button:has-text('Start')"):
                    try:
                        if page.locator(sel).first.is_visible(timeout=1200):
                            page.locator(sel).first.click(timeout=2000)
                            page.wait_for_timeout(3000)
                            break
                    except Exception:
                        pass
            except Exception as e:
                errs.append(f"PAGE: {e}")
            finally:
                page.close()
            kb = KNOWN_BENIGN.get(g["title"], [])
            def is_benign(t):
                t = t.lower()
                return benign(t) or any(b in t for b in kb)
            bad = [e for e in errs if not is_benign(e)]
            fails = [f for f in fails if not any(b in f.lower() for b in BENIGN_REQS) and not is_benign(f)]
            status = "FAIL" if (bad or fails) else "ok"
            results.append((g["title"], status, bad[:3], fails[:3]))
            print(f"{status:4} {g['title']:28} console_errors={len(bad)} failed_reqs={len(fails)}", flush=True)
        browser.close()
    srv.shutdown()

    nfail = sum(1 for _, s, _, _ in results if s == "FAIL")
    print(f"\n== {len(results) - nfail}/{len(results)} games pass ==")
    for title, status, bad, fails in results:
        if status == "FAIL":
            print(f"  {title}:")
            for e in bad: print(f"    console: {e[:150]}")
            for f in fails: print(f"    req: {f[:150]}")
    return 1 if nfail else 0

if __name__ == "__main__":
    sys.exit(main())
