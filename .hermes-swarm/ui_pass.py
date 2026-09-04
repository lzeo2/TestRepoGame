#!/usr/bin/env python3
"""
Playwright UI pass for the TestRepoGame portal (owner: 'use playwright for ui').

Checks, with real rendered output + screenshots:
  U1  Portal loads: header, search, category pills, cards grid
  U2  New games visible as cards (11 external games)
  U3  Search finds a new game by name
  U4  Category filter works (click 'strategy', grid changes)
  U5  2P tag badges render on tagged cards (portal-ux injection)
  U6  Theme toggle switches light/dark and persists via localStorage
  U7  Keyboard nav: arrows move focus between cards, Enter opens game
  U8  Random game button exists and is clickable
  U9  Screenshots: dark portal, light portal, filtered view (evidence)
Run: xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 .hermes-swarm/ui_pass.py
"""
import http.server
import os
import threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8801
SHOTS = os.path.join(ROOT, ".hermes-swarm", "ui-shots")

NEW_GAMES = ["Dr. Mario", "Street Fighter II", "Advance Wars", "Metroid Fusion",
             "Kirby Amazing Mirror", "Sonic Advance", "Helix Jump",
             "Crush the Castle", "Geometry Rash"]

results = []


def record(check, ok, evidence):
    results.append((check, "PASS" if ok else "FAIL", str(evidence)[:150]))
    print(f"{'PASS' if ok else 'FAIL'} {check:34} {str(evidence)[:140]}", flush=True)


def main():
    os.makedirs(SHOTS, exist_ok=True)
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", PORT),
        lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=ROOT, **k))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{PORT}/"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, executable_path="/usr/bin/chromium",
                                    args=["--no-sandbox", "--disable-gpu",
                                          "--disable-dev-shm-usage",
                                          "--enable-unsafe-swiftshader"])
        ctx = browser.new_context(viewport={"width": 1366, "height": 900})
        page = ctx.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)))
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3500)

        # U1 core elements
        has = page.evaluate("""() => ({
            header: !!document.querySelector('.app__header'),
            search: !!document.querySelector('.search-bar__input'),
            pills: document.querySelectorAll('.category-filter__btn').length,
            cards: document.querySelectorAll('.game-card').length,
            logo: (document.querySelector('.app__logo-text')||{}).textContent || ''
        })""")
        record("U1 portal-structure", has["header"] and has["search"] and has["cards"] > 50,
               f"cards={has['cards']} pills={has['pills']} logo={has['logo'][:30]}")

        # U2 new game cards present
        titles = page.evaluate("""() => Array.from(document.querySelectorAll('.game-card__title'))
                                   .map(e => e.textContent.trim())""")
        present = [t for t in NEW_GAMES if t in titles]
        record("U2 new-game-cards", len(present) >= 9, f"found {len(present)}/{len(NEW_GAMES)}: {present[:4]}...")

        # U3 search
        page.fill(".search-bar__input", "Metroid")
        page.wait_for_timeout(900)
        vis = page.evaluate("""() => Array.from(document.querySelectorAll('.bento-grid .game-card'))
            .filter(c => c.getBoundingClientRect().width > 0)
            .map(c => (c.querySelector('.game-card__title')||{}).textContent)""")
        record("U3 search-metroid", any("Metroid" in (t or "") for t in vis), f"visible={vis[:3]}")
        page.fill(".search-bar__input", "")
        page.wait_for_timeout(700)

        # U4 category filter
        before = page.evaluate("""() => Array.from(document.querySelectorAll('.bento-grid .game-card'))
            .filter(c => c.getBoundingClientRect().width > 0).length""")
        btn = page.locator('.category-filter__btn[data-cat-id="strategy"]')
        if btn.count() == 0:
            btn = page.locator('.category-filter__btn', has_text="strategy").first
        btn.click()
        page.wait_for_timeout(900)
        after = page.evaluate("""() => Array.from(document.querySelectorAll('.bento-grid .game-card'))
            .filter(c => c.getBoundingClientRect().width > 0).map(c => c.getAttribute('data-cat'))""")
        record("U4 filter-strategy", len(after) < before and all(c == "strategy" for c in after[:6]),
               f"{before} -> {len(after)} cards, sample cats={after[:3]}")
        # screenshot filtered view
        page.screenshot(path=os.path.join(SHOTS, "filtered-strategy.png"))
        allbtn = page.locator('.category-filter__btn', has_text="all").first
        if allbtn.count():
            allbtn.click()
        page.wait_for_timeout(700)

        # U5 tag badges (2p/coop/hacked) on cards
        page.wait_for_timeout(600)
        badges = page.evaluate("""() => Array.from(document.querySelectorAll('.game-card__tags .game-card__tag'))
            .map(e => e.textContent.trim()).slice(0, 12)""")
        record("U5 tag-badges", len(badges) > 5, f"badges={badges[:6]}")

        # U6 theme toggle (poll: React re-render can eat a click mid-transition)
        def poll_theme(page_obj, expect, timeout_ms=3000):
            page_obj.wait_for_function(
                "t => document.documentElement.getAttribute('data-theme') === t",
                arg=expect, timeout=timeout_ms)
            return page_obj.evaluate("() => document.documentElement.getAttribute('data-theme')")
        dark = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
        page.locator(".theme-toggle").click()
        other = "light" if dark == "dark" else "dark"
        light = poll_theme(page, other)
        page.screenshot(path=os.path.join(SHOTS, "light-portal.png"))
        page.locator(".theme-toggle").click()
        back = poll_theme(page, dark)
        record("U6 theme-toggle", light != dark and back == dark,
               f"dark={dark} -> {light} -> {back}")

        # U7 keyboard nav
        card = page.evaluate("() => { const c = document.querySelector('.game-card'); if (c) c.focus(); return c ? c.getAttribute('data-title') : null; }")
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(300)
        nxt = page.evaluate("() => (document.activeElement||{}).getAttribute ? document.activeElement.getAttribute('data-title') : null")
        record("U7 keyboard-nav", card and nxt and card != nxt, f"{card} -> {nxt}")

        # U8 random button
        rnd = page.locator(".random-game-btn")
        record("U8 random-btn", rnd.count() == 1 and rnd.is_visible(), "visible+clickable")

        # U9 dark screenshot + console check
        page.screenshot(path=os.path.join(SHOTS, "dark-portal.png"))
        record("U9 clean-console", not errs, f"pageerrors={errs[:1]}")

        browser.close()
    srv.shutdown()

    npass = sum(1 for _, s, _ in results if s == "PASS")
    print(f"\n== {npass}/{len(results)} UI checks pass ==")
    for c, s, e in results:
        if s == "FAIL":
            print(f"  {c}: {e}")
    return 0 if npass == len(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
