#!/usr/bin/env python3
"""
Rendered-UI slop review driver for the TestRepoGame portal.

Serves the repo root on localhost, loads the portal at 1366x900 and captures
screenshots to .hermes-swarm/ui-shots-2/, then prints a JSON blob of
computed-style evidence (fonts, colors, radii, shadows incl. color(srgb)
glow layers, gradients, backdrop-filters, letter-spacing, keyframes,
banned-phrase copy scan) to stdout for AUDIT-UI.md.

Theme handling: a first-time visitor gets the LIGHT theme by default
(data-theme="light"; dark is opt-in via .theme-toggle and persisted in
localStorage). Canonical sequence:
  load (light default) -> evidence_light -> toggle to dark ->
  shots 01-05 in dark (with probes) -> reload (theme persists, filter
  resets) -> evidence_dark unfiltered + pixel probes (title contrast,
  active pill) -> hover probe -> toggle back to light -> light filter
  probe (pixel) -> shot 06 -> CSS + copy evidence.

Pixel probes exist because the auditor cannot see images: each visual
claim in AUDIT-UI.md is backed either by a computed-style value or by a
measured pixel histogram of a clipped region.

Run: xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 .hermes-swarm/ui-slop-shots.py
"""
import http.server
import json
import os
import sys
import tempfile
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui-shots-2")
PORT = 8831

os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- evidence JS
EVIDENCE_JS = r"""(label) => {
    const all = Array.from(document.querySelectorAll('*'));
    const tag = el => el.tagName.toLowerCase() +
        (el.className && typeof el.className === 'string'
            ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');

    const bg = {}, fg = {}, borderC = {};
    const push = (map, v) => { map[v] = (map[v] || 0) + 1; };
    for (const el of all) {
        const s = getComputedStyle(el);
        push(bg, s.backgroundColor);
        push(fg, s.color);
        push(borderC, s.borderTopColor);
    }
    const toList = (m, n) => Object.entries(m).sort((a, b) => b[1] - a[1])
        .slice(0, n).map(([value, count]) => ({ value, count }));

    // parse rgba() AND color(srgb r g b / a) forms
    const rgbOf = str => {
        if (!str || str === 'none') return null;
        let m = str.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
        if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        m = str.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/);
        if (m) return { r: m[1] * 255, g: m[2] * 255, b: m[3] * 255,
                        a: m[4] === undefined ? 1 : +m[4] };
        return null;
    };
    const hsv = ({ r, g, b }) => {
        const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
        const d = mx - mn; let h = 0;
        if (d) {
            const R = r / 255, G = g / 255, B = b / 255;
            if (mx === R) h = ((G - B) / d) % 6;
            else if (mx === G) h = (B - R) / d + 2;
            else h = (R - G) / d + 4;
            h = (h * 60 + 360) % 360;
        }
        return { h, s: mx ? d / mx : 0, v: mx };
    };

    // A1 (purple/indigo 200-290deg) / A6 (green 100-172deg) saturated scan
    const banned = [], greens = [];
    const scanColor = (el, prop, value) => {
        const c = rgbOf(value); if (!c) return;
        const { h, s } = hsv(c);
        if (s > 0.25 && c.a > 0.05) {
            if (h >= 200 && h <= 290)
                banned.push({ el: tag(el), prop, value, hue: Math.round(h), sat: +s.toFixed(2) });
            if (h >= 100 && h < 172)
                greens.push({ el: tag(el), prop, value, hue: Math.round(h), sat: +s.toFixed(2) });
        }
    };
    for (const el of all) {
        const s = getComputedStyle(el);
        scanColor(el, 'background-color', s.backgroundColor);
        scanColor(el, 'color', s.color);
        scanColor(el, 'border-top-color', s.borderTopColor);
        if (s.boxShadow !== 'none') scanColor(el, 'box-shadow', s.boxShadow);
    }
    const dedup = (arr, keyf) => { const seen = new Set(), out = [];
        for (const x of arr) { const k = keyf(x);
            if (!seen.has(k)) { seen.add(k); out.push(x); } } return out; };

    // palette census: which notable exact colors sit on which elements
    const NOTABLE = ['rgb(109, 40, 217)', 'rgb(124, 58, 237)', 'rgb(26, 26, 46)',
                     'rgb(0, 255, 136)', 'rgb(230, 57, 70)', 'rgb(20, 184, 166)',
                     'rgb(13, 148, 136)', 'rgb(234, 88, 12)', 'rgb(219, 39, 119)',
                     'rgb(8, 145, 178)', 'rgb(6, 182, 212)', 'rgb(8, 6, 13)'];
    const census = {};
    for (const target of NOTABLE) {
        const hits = [];
        for (const el of all) {
            const s = getComputedStyle(el);
            const where = [s.backgroundColor, s.color, s.borderTopColor]
                .map((v, i) => v === target ? ['bg', 'text', 'border'][i] : null)
                .filter(Boolean);
            if (where.length) hits.push(tag(el) + ' (' + where.join(',') + ')');
        }
        census[target] = { count: hits.length, elements: [...new Set(hits)].slice(0, 8) };
    }

    // gradients (A2)
    const gradients = [];
    for (const el of all) {
        const bi = getComputedStyle(el).backgroundImage;
        if (bi && bi.includes('gradient('))
            gradients.push({ el: tag(el), value: bi.slice(0, 160) });
    }

    // border-radius distribution (C5)
    const radii = {};
    for (const el of all) {
        const v = getComputedStyle(el).borderTopLeftRadius;
        if (v && v !== '0px') radii[v] = (radii[v] || 0) + 1;
    }
    const parseR = v => parseFloat(v) || 0;
    const gt12 = Object.entries(radii).filter(([v]) => parseR(v) > 12);
    const distinct = Object.keys(radii).map(parseR);

    // box-shadows (A5) — rgba() and color(srgb) both
    const shadows = [], satShadows = [];
    for (const el of all) {
        const sh = getComputedStyle(el).boxShadow;
        if (sh && sh !== 'none') {
            shadows.push({ el: tag(el), value: sh.slice(0, 140) });
            const c = rgbOf(sh);
            if (c) { const { h, s } = hsv(c);
                if (c.a < 1 && s > 0.25 && hsv(c).v > 0.15)
                    satShadows.push({ el: tag(el), value: sh.slice(0, 140), hue: Math.round(h) });
            }
        }
    }

    // per-card neon glow layer census
    const glows = Array.from(document.querySelectorAll('.game-card__glow'));
    const glowColors = {};
    for (const g of glows) {
        const s = getComputedStyle(g);
        glowColors[s.boxShadow] = (glowColors[s.boxShadow] || 0) + 1;
        if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)')
            glowColors['bg:' + s.backgroundColor] =
                (glowColors['bg:' + s.backgroundColor] || 0) + 1;
    }

    // backdrop-filter (A3) + translucent hairline surfaces
    const glass = [], hairlines = [];
    for (const el of all) {
        const s = getComputedStyle(el);
        if (s.backdropFilter && s.backdropFilter !== 'none')
            glass.push({ el: tag(el), value: s.backdropFilter });
        const bc = rgbOf(s.borderTopColor), bgr = rgbOf(s.backgroundColor);
        if (bc && bgr && bc.a > 0.03 && bc.a < 0.3 && bgr.a > 0 && bgr.a < 0.25)
            hairlines.push({ el: tag(el), bg: s.backgroundColor, border: s.borderTopColor });
    }

    // fonts (B1/B2/B3)
    const ff = sel => { const el = document.querySelector(sel);
        return el ? getComputedStyle(el).fontFamily : null; };
    const loaded = Array.from(document.fonts).map(f => f.family + ':' + f.status);

    // letter-spacing (B3/B4)
    const ls = {};
    for (const el of all) {
        const v = getComputedStyle(el).letterSpacing;
        if (v && v !== 'normal') ls[v] = (ls[v] || 0) + 1;
    }

    // headings (B4)
    const headings = all.filter(e => /^H[1-6]$/.test(e.tagName)).slice(0, 10)
        .map(h => { const s = getComputedStyle(h);
            return { el: tag(h), size: s.fontSize, weight: s.fontWeight,
                     ls: s.letterSpacing, transform: s.textTransform }; });

    // emoji-as-UI (E4) — exclude card-suit glyphs used as game content
    const emojiRe = /[\u2600-\u27BF]|[\u2B00-\u2BFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDEFF]|\uD83E[\uDD00-\uDDFF]/;
    const suitRe = /^[\u2660-\u2667]+$/;
    const emojiEls = all.filter(e => e.children.length === 0 && e.textContent &&
        emojiRe.test(e.textContent) && e.textContent.trim().length <= 8 &&
        !suitRe.test(e.textContent.trim()))
        .map(e => tag(e) + ' :: ' + e.textContent.trim());

    // A4 pure white on pure black + card title contrast sanity
    const bodyS = getComputedStyle(document.body);
    const card = document.querySelector('.game-card');
    const title = document.querySelector('.game-card__title');
    const pure = {
        body_color: bodyS.color, body_bg: bodyS.backgroundColor,
        html_bg: getComputedStyle(document.documentElement).backgroundColor,
        pure_white_text: bodyS.color === 'rgb(255, 255, 255)',
        pure_black_bg: [bodyS.backgroundColor,
                        getComputedStyle(document.documentElement).backgroundColor]
            .includes('rgb(0, 0, 0)'),
        card_bg: card && getComputedStyle(card).backgroundColor,
        card_title_color: title && getComputedStyle(title).color,
        card_desc_color: (() => { const d = document.querySelector('.game-card__desc');
            return d ? getComputedStyle(d).color : null; })()
    };

    return {
        theme_label: label,
        theme_attr: document.documentElement.getAttribute('data-theme'),
        counts: { elements: all.length, cards: document.querySelectorAll('.game-card').length },
        colors: { backgrounds: toList(bg, 24), texts: toList(fg, 12),
                  borders: toList(borderC, 14),
                  banned_blue_purple: dedup(banned, x => x.el + x.prop + x.value),
                  saturated_green: dedup(greens, x => x.el + x.prop + x.value),
                  notable_census: census },
        gradients: { count: gradients.length, elements: gradients.slice(0, 12) },
        radius: { distribution: Object.entries(radii).sort((a, b) => b[1] - a[1]),
                  gt12_count: gt12.reduce((n, [, c]) => n + c, 0),
                  distinct_values: distinct.length,
                  min: distinct.length ? Math.min(...distinct) : 0,
                  max: distinct.length ? Math.max(...distinct) : 0 },
        shadows: { count: shadows.length, values: shadows.slice(0, 12),
                   saturated_alpha_count: dedup(satShadows, x => x.el + x.value).length,
                   saturated_alpha: dedup(satShadows, x => x.el + x.value).slice(0, 10) },
        card_glow_layers: { count: glows.length, distribution: glowColors },
        glass: { backdrop_filter: glass,
                 translucent_hairlines: dedup(hairlines, x => x.el + x.bg).slice(0, 8) },
        fonts: { body: ff('body'), heading: ff('h1, h2, h3'), button: ff('button'),
                 webfonts_loaded: loaded },
        letter_spacing: Object.entries(ls).sort((a, b) => b[1] - a[1]).slice(0, 10),
        headings, emoji_ui: emojiEls.slice(0, 10), pure_white_black: pure
    };
}"""

# CSS-level probes (keyframes, reduced-motion guard, :active, transition:all)
CSS_JS = r"""() => {
    const keyframes = [], usages = [], delays = new Set(), springs = [];
    let cssText = '', activeCount = 0, transAll = 0, important = 0, hoverCount = 0;
    for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch (_) { continue; }
        const walk = rs => { for (const r of rs) {
            if (r.type === CSSRule.MEDIA_RULE && r.cssRules) { walk(r.cssRules); continue; }
            cssText += r.cssText + '\n';
            if (r.type === CSSRule.KEYFRAMES_RULE) keyframes.push(r.name);
            const t = r.style ? r.style.getPropertyValue('animation-name') : '';
            if (t && t !== 'none') usages.push({ sel: r.selectorText, anim: t,
                dur: r.style.getPropertyValue('animation-duration') });
            const ad = r.style ? (r.style.getPropertyValue('animation-delay') + ' ' +
                                  r.style.getPropertyValue('transition-delay')) : '';
            if (ad.trim()) delays.add(ad.trim());
            const tr = r.style ? r.style.getPropertyValue('transition-property') : '';
            if (tr === 'all') transAll++;
            if (r.selectorText && r.selectorText.includes(':active')) activeCount++;
            if (r.selectorText && r.selectorText.includes(':hover')) hoverCount++;
            if (r.cssText.includes('!important')) important++;
            const tim = r.style ? r.style.getPropertyValue('transition-timing-function') +
                ' ' + r.style.getPropertyValue('animation-timing-function') : '';
            if (tim.includes('1.56')) springs.push(r.selectorText);
        } };
        walk(rules);
    }
    return {
        keyframes: keyframes,
        animation_usages: usages,
        stagger_delays: Array.from(delays),
        prefers_reduced_motion: cssText.includes('prefers-reduced-motion'),
        active_rule_count: activeCount,
        hover_rule_count: hoverCount,
        transition_all_count: transAll,
        important_count: important,
        spring_bezier_selectors: [...new Set(springs)],
        translateY_uses: (cssText.match(/translateY\([^)]*\)/g) || []).slice(0, 10)
    };
}"""

F1_PHRASES = ["get started", "effortlessly", "seamlessly", "streamline your workflow",
              "unlock the power of", "build faster", "ship smarter", "welcome to",
              "ai-powered", "dive into", "jump into", "enjoy"]

COPY_JS = """(phrases) => {
    const t = document.body.textContent.toLowerCase();
    return phrases.map(p => ({ phrase: p, count: t.split(p).length - 1 }));
}"""


# ---------------------------------------------------------------- pixel probes
def clip_sample(page, selector, nth, label, pad=3):
    """Clip-screenshot an element region and analyze its pixels with PIL.
    Returns a dict: size, mean RGB, luma buckets, top colors, ink shares."""
    from PIL import Image
    loc = page.locator(selector).nth(nth)
    loc.scroll_into_view_if_needed()
    page.wait_for_timeout(250)
    box = loc.bounding_box()
    if not box:
        return {"label": label, "error": "no bounding box"}
    x = max(0, box["x"] - pad); y = max(0, box["y"] - pad)
    w = min(1366 - x, box["width"] + 2 * pad); h = min(900 - y, box["height"] + 2 * pad)
    path = os.path.join(tempfile.gettempdir(), f"clip-{label}.png")
    page.screenshot(path=path, clip={"x": x, "y": y, "width": w, "height": h})
    im = Image.open(path).convert("RGB")
    px = list(im.getdata())
    n = len(px)
    lumas = [0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b in px]
    mean = tuple(round(sum(c[i] for c in px) / n) for i in range(3))
    buckets = {"dark<60": 0, "mid60-180": 0, "light>180": 0}
    for L in lumas:
        buckets["dark<60" if L < 60 else ("mid60-180" if L < 180 else "light>180")] += 1
    top = {}
    for c in px:
        top[c] = top.get(c, 0) + 1
    top3 = sorted(top.items(), key=lambda kv: -kv[1])[:4]
    share = lambda k: round(buckets[k] / n, 3)
    return {"label": label, "size": f"{im.width}x{im.height}", "mean_rgb": mean,
            "shares": {k: share(k) for k in buckets},
            "top_colors": [f"rgb{c} x{cnt} ({round(cnt / n, 2)})" for c, cnt in top3]}


def shot(page, name):
    page.screenshot(path=os.path.join(OUT, name))
    print(f"[shot] {name}", flush=True)


def verify_shots():
    """I cannot see images: verify each PNG's mean luminance so theme labels
    in the report are backed by pixel evidence."""
    from PIL import Image
    for name in sorted(os.listdir(OUT)):
        if not name.endswith(".png"):
            continue
        im = Image.open(os.path.join(OUT, name)).convert("L").resize((68, 45))
        data = list(im.getdata())
        mean = sum(data) / len(data)
        kind = "LIGHT" if mean > 200 else ("DARK" if mean < 60 else "MID")
        print(f"[verify] {name} mean_luma={mean:.1f} -> {kind}", flush=True)


def main():
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", PORT),
        lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=ROOT, **k))
    srv.daemon_threads = True
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False,
                                    args=["--no-sandbox", "--disable-gpu",
                                          "--disable-dev-shm-usage",
                                          "--enable-unsafe-swiftshader"])
        ctx = browser.new_context(viewport={"width": 1366, "height": 900})
        page = ctx.new_page()
        page.goto(f"http://127.0.0.1:{PORT}/", wait_until="domcontentloaded",
                  timeout=30000)
        page.wait_for_selector(".game-card", timeout=15000)
        page.wait_for_timeout(1500)

        # -- default theme evidence (first-time visitor = light, unfiltered)
        light_ev = page.evaluate(EVIDENCE_JS, "default-on-first-visit")

        # -- switch to DARK (canonical audit theme) for shots 01-05
        page.locator("button.theme-toggle").click()
        page.wait_for_timeout(1200)

        # 1 -- dark portal, top
        shot(page, "01-dark-top.png")

        # 2 -- scrolled mid-page (standard card grid)
        page.evaluate("() => window.scrollTo(0, document.body.scrollHeight * 0.45)")
        page.wait_for_timeout(700)
        shot(page, "02-dark-mid.png")

        # 3 -- tag-filter row visible
        page.evaluate("() => { document.querySelector('.ux-tag-filter')"
                      ".scrollIntoView({block: 'start'}); window.scrollBy(0, -40); }")
        page.wait_for_timeout(500)
        shot(page, "03-tag-filter-row.png")
        tag_evidence = page.evaluate("""() => {
            const pill = document.querySelector('.ux-tag-filter__pill');
            const s = pill ? getComputedStyle(pill) : null;
            return { pill_bg: s && s.backgroundColor, pill_color: s && s.color,
                     pill_radius: s && s.borderRadius, pill_shadow: s && s.boxShadow };
        }""")

        # 4 -- filtered view (click the Action category pill) + contrast probe
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(300)
        page.locator(".category-filter__btn", has_text="Action").first.click()
        page.wait_for_timeout(900)
        shot(page, "04-filtered-action.png")
        filter_evidence = page.evaluate("""() => {
            const b = document.querySelector('.category-filter__btn.active');
            const s = b ? getComputedStyle(b) : null;
            const L = c => { const m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
                if (!m) return 0; const f = v => { v /= 255;
                    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
                return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]); };
            let ratio = null;
            if (s) { const a = L(s.backgroundColor), t = L(s.color);
                ratio = +(((Math.max(a, t) + 0.05) / (Math.min(a, t) + 0.05)).toFixed(2)); }
            const status = document.querySelector('.ux-result-status');
            return { active_pill: b && b.textContent.trim(),
                     active_bg: s && s.backgroundColor, active_color: s && s.color,
                     active_border: s && s.borderTopColor,
                     active_radius: s && s.borderRadius, contrast_ratio: ratio,
                     status: status && status.textContent.trim() };
        }""")
        pill_pixels_dark = clip_sample(page, ".category-filter__btn.active", 0,
                                       "dark-active-pill")

        # 5 -- game detail panel (click .game-card__info on first card)
        page.evaluate("() => window.scrollTo(0, 0)")
        page.wait_for_timeout(300)
        page.locator("button.game-card__info").first.click()
        page.wait_for_timeout(900)
        shot(page, "05-detail-panel.png")
        panel_evidence = page.evaluate("""() => {
            return Array.from(document.querySelectorAll(
                '.ux-detail__backdrop, .ux-detail__panel'))
                .map(e => { const s = getComputedStyle(e);
                    const r = e.getBoundingClientRect();
                    return { el: e.tagName.toLowerCase() + '.' + String(e.className).slice(0, 40),
                             bg: s.backgroundColor, radius: s.borderRadius,
                             shadow: s.boxShadow.slice(0, 120), backdrop: s.backdropFilter,
                             size: `${Math.round(r.width)}x${Math.round(r.height)}` };
                });
        }""")
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)

        # reload: dark theme persists via localStorage, Action filter resets
        page.reload(wait_until="domcontentloaded")
        page.wait_for_selector(".game-card", timeout=15000)
        page.wait_for_timeout(1500)

        # dark-theme evidence, unfiltered
        dark_ev = page.evaluate(EVIDENCE_JS, "dark-unfiltered")

        # pixel probes: is the dark-mode card title actually readable?
        title_probe = {}
        for i, nm in ((0, "dark-title-card0"), (8, "dark-title-card8")):
            title_probe[nm] = clip_sample(page, ".game-card__title", i, nm)
        badge_probe = {"dark-badge-card0":
                       clip_sample(page, ".game-card__category", 0, "dark-badge-card0")}

        # hover probe: card lift/shadow on hover
        hover_ev = []
        for idx in (4, 6):
            card = page.locator(".game-card").nth(idx)
            card.scroll_into_view_if_needed()
            page.wait_for_timeout(250)
            before = card.evaluate(
                "el => { const s = getComputedStyle(el);"
                " return { shadow: s.boxShadow.slice(0, 110), transform: s.transform }; }")
            card.hover()
            page.wait_for_timeout(600)
            after = card.evaluate(
                "el => { const s = getComputedStyle(el);"
                " return { shadow: s.boxShadow.slice(0, 110), transform: s.transform }; }")
            hover_ev.append({ "card_index": idx, "before": before, "after": after })

        # -- back to LIGHT theme: filter contrast probe + shot 06
        page.evaluate("() => window.scrollTo(0, 0)")
        page.locator("button.theme-toggle").click()
        page.wait_for_timeout(1200)
        page.locator(".category-filter__btn", has_text="Action").first.click()
        page.wait_for_timeout(900)
        filter_light = page.evaluate("""() => {
            const b = document.querySelector('.category-filter__btn.active');
            const s = b ? getComputedStyle(b) : null;
            const L = c => { const m = c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
                if (!m) return 0; const f = v => { v /= 255;
                    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
                return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]); };
            let ratio = null;
            if (s) { const a = L(s.backgroundColor), t = L(s.color);
                ratio = +(((Math.max(a, t) + 0.05) / (Math.min(a, t) + 0.05)).toFixed(2)); }
            return { active_pill: b && b.textContent.trim(),
                     active_bg: s && s.backgroundColor, active_color: s && s.color,
                     contrast_ratio: ratio };
        }""")
        pill_pixels_light = clip_sample(page, ".category-filter__btn.active", 0,
                                        "light-active-pill")
        badge_pixels_light = clip_sample(page, ".game-card__category", 0,
                                         "light-badge-card0")
        # reset filter, then the light shot
        page.locator(".category-filter__btn", has_text="All").first.click()
        page.wait_for_timeout(900)
        shot(page, "06-light-top.png")
        light_state = page.evaluate("""() => ({
            theme_attr: document.documentElement.getAttribute('data-theme'),
            body_bg: getComputedStyle(document.body).backgroundColor,
            body_color: getComputedStyle(document.body).color,
            header_backdrop: (() => { const h = document.querySelector('.app__header');
                return h ? getComputedStyle(h).backdropFilter : null; })(),
            toggle_backdrop: (() => { const t = document.querySelector('.theme-toggle');
                return t ? getComputedStyle(t).backdropFilter : null; })()
        })""")

        css_ev = page.evaluate(CSS_JS)
        copy_ev = page.evaluate(COPY_JS, F1_PHRASES)
        browser.close()
    srv.shutdown()

    result = {
        "url": f"http://127.0.0.1:{PORT}/", "viewport": "1366x900",
        "captured_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "default_theme": "light (data-theme=light; dark opt-in via toggle, localStorage)",
        "evidence_light": light_ev, "evidence_dark": dark_ev,
        "probe_dark_tag_filter": tag_evidence,
        "probe_dark_filtered": filter_evidence, "pixels_dark_active_pill": pill_pixels_dark,
        "probe_dark_detail_panel": panel_evidence,
        "pixels_dark_card_title": title_probe, "pixels_dark_badge": badge_probe,
        "probe_light_filtered": filter_light, "pixels_light_active_pill": pill_pixels_light,
        "pixels_light_badge": badge_pixels_light, "probe_light_state": light_state,
        "hover_probe": hover_ev, "copy_f1_scan": copy_ev, "css": css_ev,
    }
    print("=== UI-SLOP EVIDENCE JSON ===")
    print(json.dumps(result, indent=1))
    verify_shots()
    return 0


if __name__ == "__main__":
    sys.exit(main())
