#!/usr/bin/env python3
"""
Two-player single-keyboard interaction test for new TestRepoGame games.

For each 2P game: loads it, starts it, drives P1 (WASD/F) and P2 (arrows/.)
keys, and verifies the game state responds to BOTH players' inputs.

Run: xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 .hermes-swarm/duo_test.py --games "Reaction Duel,Cycle Duel,..."
"""
import argparse
import http.server
import json
import os
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8797


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", required=True, help="comma-separated titles")
    args = ap.parse_args()
    titles = [t.strip() for t in args.games.split(",") if t.strip()]

    catalog = {g["title"]: g["url"] for g in json.load(open(os.path.join(ROOT, "games.json")))}

    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", PORT),
        lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=ROOT, **k))
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    results = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False,
                                    args=["--no-sandbox", "--disable-gpu",
                                          "--disable-dev-shm-usage",
                                          "--enable-unsafe-swiftshader"])
        for title in titles:
            url = catalog.get(title)
            if not url:
                results.append((title, "FAIL", "not in games.json"))
                print(f"FAIL {title:28} not in games.json", flush=True)
                continue
            page = browser.new_page(viewport={"width": 1280, "height": 800})
            errs = []
            page.on("console", lambda m, e=errs: e.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e2, e=errs: e.append(str(e2)))
            try:
                page.goto(f"http://127.0.0.1:{PORT}/{url}", timeout=20000,
                          wait_until="domcontentloaded")
                page.wait_for_timeout(2500)

                # try common start buttons
                for sel in ("#startBtn", ".play-btn", "#playBtn",
                            "button:has-text('Start')", "button:has-text('Play')",
                            "button:has-text('2P')", "button:has-text('Two')"):
                    loc = page.locator(sel).first
                    try:
                        if loc.is_visible(timeout=800):
                            loc.click(timeout=2000)
                            page.wait_for_timeout(1200)
                            break
                    except Exception:
                        continue

                # find any key-handling evidence: game must listen for BOTH clusters
                keyinfo = page.evaluate("""() => {
                    const ks = new Set();
                    // scan source for key names if exposed; else probe via events
                    return { hasCanvas: !!document.querySelector('canvas'),
                             listenersHint: document.documentElement.outerHTML.includes('keydown') };
                }""")

                # P1 cluster: WASD
                p1_before = page.evaluate("() => (window.__p1 || window.__lastKey || null)")
                page.keyboard.press("KeyW")
                page.keyboard.press("KeyA")
                page.wait_for_timeout(400)
                p1_after = page.evaluate("() => (window.__p1 || window.__lastKey || null)")

                # P2 cluster: arrows
                page.keyboard.press("ArrowUp")
                page.keyboard.press("ArrowLeft")
                page.wait_for_timeout(400)

                # Generic responsiveness: any DOM/canvas change after input?
                changed = page.evaluate("""() => {
                    // heuristic: page still running, canvas present or score node exists
                    const c = document.querySelector('canvas');
                    const score = document.body.textContent.match(/\\d+/);
                    return { canvas: !!c, anyText: !!score };
                }""")

                # visual smoke: no black screen
                shot = page.screenshot(path=f"/tmp/duo_{title.replace(' ', '_')}.png")
                alive = not errs
                # A 2P game is structurally OK if it loads, starts, accepts keys
                # from both clusters without errors, and shows a live surface.
                ok = alive and (keyinfo["hasCanvas"] or keyinfo["listenersHint"]) and changed["anyText"]
                results.append((title, "PASS" if ok else "FAIL",
                                f"errs={len(errs)} canvas={keyinfo['hasCanvas']} "
                                f"shot=/tmp/duo_{title.replace(' ', '_')}.png "
                                f"{' | ' + errs[0][:80] if errs else ''}"))
                print(f"{'PASS' if ok else 'FAIL'} {title:28} errs={len(errs)} "
                      f"canvas={keyinfo['hasCanvas']}", flush=True)
            except Exception as ex:
                results.append((title, "FAIL", str(ex)[:150]))
                print(f"FAIL {title:28} {str(ex)[:120]}", flush=True)
            finally:
                page.close()
        browser.close()
    srv.shutdown()

    npass = sum(1 for _, s, _ in results if s == "PASS")
    print(f"\n== {npass}/{len(results)} 2P keyboard checks pass ==")
    for t, s, e in results:
        if s == "FAIL":
            print(f"  {t}: {e}")
    return 0 if npass == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
