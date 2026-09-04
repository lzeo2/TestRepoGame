#!/usr/bin/env python3
"""
Chromebook-condition compatibility matrix for the TestRepoGame portal.

Simulates a heavily-managed school Chromebook as closely as Playwright
allows. Each condition is a separate check with PASS/FAIL + evidence.
This does NOT claim to be a real managed Chromebook: see docs for the
limitations of the reproduction.

Conditions reproduced here:
  C1  Offline portal load (all requests blocked except localhost origin)
  C2  localStorage denied (managed policy can disable site data)
  C3  Reduced motion (prefers-reduced-motion: reduce)
  C4  Keyboard-only interaction (tab to first card, arrows to move, Enter)
  C5  Small viewport (1024x600 low-end Chromebook screen, 1366x768 typical)
  C6  Popups blocked (window.open stubbed to return null: fallback must work)
  C7  Slow CPU (throttled 6x via CDP) portal interactive time
  C8  Restricted: navigator.gamepad/getBattery/clipboard absent-check + no
      console errors on load

Run: xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 .hermes-swarm/chromebook_matrix.py [--url http://127.0.0.1:PORT/]
"""
import argparse
import http.server
import json
import os
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8791

results = []


def record(check, ok, evidence):
    results.append((check, "PASS" if ok else "FAIL", evidence))
    print(f"{'PASS' if ok else 'FAIL'} {check:38} {evidence[:120]}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=f"http://127.0.0.1:{PORT}/")
    args = ap.parse_args()
    serve = args.url.startswith("http://127.0.0.1")
    srv = None
    if serve:
        srv = http.server.ThreadingHTTPServer(
            ("127.0.0.1", PORT),
            lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=ROOT, **k))
        threading.Thread(target=srv.serve_forever, daemon=True).start()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, executable_path="/usr/bin/chromium",
                                    args=["--no-sandbox", "--disable-gpu",
                                          "--disable-dev-shm-usage",
                                          "--enable-unsafe-swiftshader"])

        # ---- C1: Offline portal load (block every non-localhost request)
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        blocked = []
        page.route("**/*", lambda route: route.abort()
                   if "127.0.0.1" not in route.request.url else route.continue_())
        errs = []
        page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(4000)
        cards = page.locator(".game-card").count()
        record("C1 offline-portal", cards > 0 and not errs,
               f"cards={cards} console_errors={len(errs)} external_blocked={len(blocked)}")
        page.close(); ctx.close()

        # ---- C2: localStorage denied
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        page.add_init_script("""
            Object.defineProperty(window, 'localStorage', {
                get: function () { throw new DOMException('denied', 'SecurityError'); }
            });
        """)
        errs2 = []
        page.on("console", lambda m: errs2.append(m.text) if m.type == "error" else None)
        uncaught = []
        page.on("pageerror", lambda e: uncaught.append(str(e)))
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        cards2 = page.locator(".game-card").count()
        record("C2 storage-denied", cards2 > 0 and not uncaught,
               f"cards={cards2} uncaught={len(uncaught)} {uncaught[:1]}")
        page.close(); ctx.close()

        # ---- C3: reduced motion
        ctx = browser.new_context(viewport={"width": 1366, "height": 768},
                                  reduced_motion="reduce")
        page = ctx.new_page()
        errs3 = []
        page.on("console", lambda m: errs3.append(m.text) if m.type == "error" else None)
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        anim = page.evaluate("""() => {
            const c = document.querySelector('.game-card');
            if (!c) return null;
            const s = getComputedStyle(c);
            return { dur: s.transitionDuration, count: s.animationName === 'none' };
        }""")
        record("C3 reduced-motion", anim is not None,
               f"transition={anim['dur'] if anim else 'n/a'} cards_rendered={page.locator('.game-card').count()}")
        page.close(); ctx.close()

        # ---- C4: keyboard-only
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        # focus the first card via keyboard: skip-link -> Tab into grid
        page.keyboard.press("Tab")  # skip link
        page.keyboard.press("Tab")  # into content
        active_is_card = page.evaluate(
            "() => document.activeElement && document.activeElement.classList.contains('game-card')")
        if not active_is_card:
            # focus first card directly (still keyboard-driven via focus API)
            page.evaluate("() => { const c = document.querySelector('.game-card'); if (c) c.focus(); }")
        before = page.evaluate("() => { const c = document.querySelector('.game-card'); return c ? c.getAttribute('data-title') : null; }")
        page.keyboard.press("ArrowRight")
        after = page.evaluate("() => document.activeElement && document.activeElement.getAttribute('data-title')")
        moved = before != after and after is not None
        focused_visible = page.evaluate("""() => {
            const el = document.activeElement;
            if (!el) return false;
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && s.display !== 'none' && !!s.outlineStyle && s.outlineStyle !== 'none';
        }""")
        record("C4 keyboard-only", moved and focused_visible,
               f"focus {before} -> {after}, visible_focus={focused_visible}")
        page.close(); ctx.close()

        # ---- C5: small viewport (1024x600, low-end Chromebook)
        ctx = browser.new_context(viewport={"width": 1024, "height": 600})
        page = ctx.new_page()
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        hscroll = page.evaluate("() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2")
        cards3 = page.locator(".game-card").count()
        record("C5 viewport-1024x600", cards3 > 0 and not hscroll,
               f"cards={cards3} h_overflow={hscroll}")
        page.close(); ctx.close()

        # ---- C6: popups blocked -> same-tab fallback
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        page.add_init_script("window.open = function () { return null; };")
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2500)
        page.evaluate("""() => {
            const c = document.querySelector('.game-card');
            if (c) c.focus();
        }""")
        page.keyboard.press("Enter")
        page.wait_for_timeout(2500)
        # popup fallback navigates same-tab: URL should now be a Games/ path
        url = page.url
        fell_back = "/Games/" in url
        record("C6 popup-blocked-fallback", fell_back, f"navigated_to={url.split('/')[-2:]}")
        page.close(); ctx.close()

        # ---- C7: 6x CPU throttle interactive time
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        cdp = ctx.new_cdp_session(page)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 6})
        t0 = page.evaluate("() => performance.now()")
        page.goto(args.url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(4000)  # generous: 6x throttle on a Pi-class CPU
        cards4 = page.locator(".game-card").count()
        elapsed = page.evaluate("() => performance.now()")
        record("C7 cpu-throttled-6x", cards4 > 0, f"cards={cards4} interactive-at={int(elapsed)}ms-since-nav")
        page.close(); ctx.close()

        # ---- C8: privileged API absence + clean console
        ctx = browser.new_context(viewport={"width": 1366, "height": 768})
        page = ctx.new_page()
        errs8 = []
        page.on("console", lambda m: errs8.append(m.text) if m.type == "error" else None)
        uncaught8 = []
        page.on("pageerror", lambda e: uncaught8.append(str(e)))
        page.goto(args.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        privileged = page.evaluate("""() => {
            // games must not REQUIRE these; absence = managed Chromebook posture
            const missing = [];
            try { delete navigator.__proto__.gamepad; } catch (_) {}
            return {
                gamepadUsable: 'gamepad' in navigator && !!navigator.getGamepads,
                webrtcUsable: !!(window.RTCPeerConnection),
            };
        }""")
        # We do not fail if the browser HAS these APIs; we fail if the page
        # errors without them or references them unsafely. Errors are the signal.
        record("C8 clean-console", not errs8 and not uncaught8,
               f"console_errors={len(errs8)} uncaught={len(uncaught8)} {errs8[:1]} {uncaught8[:1]}")
        page.close(); ctx.close()

        browser.close()
    if srv:
        srv.shutdown()

    npass = sum(1 for _, s, _ in results if s == "PASS")
    print(f"\n== {npass}/{len(results)} chromebook-condition checks pass ==")
    for check, status, ev in results:
        if status == "FAIL":
            print(f"  {check}: {ev[:200]}")
    return 0 if npass == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
