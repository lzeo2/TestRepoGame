# AUDIT-UI — Rendered-UI Slop Review (TestRepoGame portal)

Auditor: rendered-UI slop reviewer (glm-5.3-flash worker)
Task: `.hermes-swarm/TASK-AUDIT-UI.md` · Rubric: `.hermes-swarm/SLOP-CHECKLIST.md`
Scope: **what a visitor SEES** — computed styles + pixel measurements of the
rendered portal. Source was only consulted to name exact selectors for the fix
list; the code-quality audit is another worker's job.
Modified: only `.hermes-swarm/ui-slop-shots.py` and this file. No commits.

## Method & evidence base

Driver: `.hermes-swarm/ui-slop-shots.py`
(`xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 .hermes-swarm/ui-slop-shots.py`,
exit=0). It serves the repo root on `127.0.0.1:8831`, loads the portal at
**1366×900**, and captures the 6 screenshots + a JSON evidence blob
(computed fonts/colors/radii/shadows/gradients/backdrop-filters/letter-spacing,
CSS keyframes census, F1 copy scan) printed to stdout. Because the auditor
cannot see images, every visual claim below is backed by either a
**computed-style value** or a **pixel histogram** of a clipped region.

Screenshots in `.hermes-swarm/ui-shots-2/` (mean luminance measured with PIL):

| file | content | mean luma | theme verified |
|---|---|---|---|
| 01-dark-top.png | portal top | 19.8 | DARK |
| 02-dark-mid.png | card grid mid-scroll | 26.3 | DARK |
| 03-tag-filter-row.png | `.ux-tag-filter` row | 25.9 | DARK |
| 04-filtered-action.png | Action pill clicked (27 games) | 19.8 | DARK |
| 05-detail-panel.png | `.game-card__info` detail modal | 9.8 | DARK |
| 06-light-top.png | light theme top | 153.5 | LIGHT |

**Default experience is LIGHT** (`<html data-theme="light">`, body
`rgb(245,245,247)`, text `rgb(29,29,31)`); dark is opt-in via `.theme-toggle`
and persisted in localStorage. Both themes were audited; dark is the canonical
shot set. Full DOM census: 2,839 elements, 101 `.game-card`s, 4 featured.

---

## Section scores (0 = clean, 1 = partial, 2 = slop-cluster)

### A. Color — **2 / 2 — SLOP**

| # | Finding | Evidence |
|---|---|---|
| A1 | **The #1 AI tell: Tailwind-violet pair on 35 category badges, both themes** | computed: `span.game-card__category` bg `rgb(109,40,217)` = #6d28d9 ×25 (classic), `rgb(124,58,237)` = #7c3aed ×10 (strategy); hue 263/262, sat 0.82/0.76. Source of values: `index.html` line 215/218. Plus `div.game-card__thumb` bg `rgb(26,26,46)` #1a1a2e (hue 240) ×101 in both themes, and bundle tokens `--accent:#aa3bff` / `#c084fc` (purple) still active on dark text/border accents |
| A2 | No gradients render anywhere | `backgroundImage` scanned on all 2,839 elements: **gradient count 0** — CLEAN |
| A3 | Glassmorphism cluster | `header.app__header` backdrop-filter `blur(20px)` (light); `button.theme-toggle` `blur(12px)` (both); `.ux-detail__backdrop` `blur(4px)` + `rgba(0,0,0,0.7)`; translucent-hairline recipe exactly per checklist: `.search-bar`, `.ux-tag-filter__pill`, `.category-filter__btn` bg `rgba(255,255,255,0.04)` + border `rgba(255,255,255,0.08)`; `button.game-card__info` `rgba(255,255,255,0.9)` ×101 (light) / `rgba(0,0,0,0.6)` ×101 (dark) |
| A4 | Dark theme is literal #fff on #000 | computed: body color `rgb(255,255,255)`, body/html bg `rgb(0,0,0)` in dark (light is fine: #1d1d1f on #f5f5f7) |
| A5 | **Neon glow layer on 100% of cards** | 101/101 `div.game-card__glow` inset box-shadows at 0.2 alpha: pink `srgb 1 0.235 0.431` ×27, yellow `srgb 1 0.9 0` ×25, cyan `srgb 0 0.81 1` ×20, green `srgb 0 1 0.533` ×19, orange ×8, purple ×2. Plus `a.skip-link` glow `rgba(6,182,212,0.35) 0 4px 14px` and `button.random-game-btn.is-ready` glow `rgba(217,119,6,0.25) 0 4px 14px` |
| A6 | **Neon green accent (law: cyan/teal, never green)** | `#0f8`/`rgb(0,255,136)`, sat 1.0, hue 152: dark active "All" pill bg (pixel-verified: 71% of pill pixels exactly `rgb(0,255,136)`), logo "MATH" span, footer "•" bullets, 19 card glows, search-focus border token `--neon-green:#0f8` |

### B. Typography — **1 / 2 — SLOPPY**

- B1 (1): one unchosen font — body = heading = button = `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`; `document.fonts` shows **zero webfonts loaded** → renders as whatever the OS default is. The default AI stack, unmodified.
- B2 (0): no mono on body copy.
- B3 (1): `letter-spacing: 0.18px` uniform on **1,444 of 2,839 elements** across every hierarchy level; no pairing anywhere.
- B4 (0): headings are modest (`h3.game-card__title` 24.3px/600 and 18px/600, `ls 0.18px`); negative tracking only ×2 (`-0.756px`). Not the tracking-tight hero default.

### C. Layout — **1 / 2 — SLOPPY**

- C1 (1): 101 cards, identical anatomy (child signature `game-card__thumb|body|glow|info` on every card), 20px radius ×194, uniform grid. Functional catalog, but zero variation.
- C2/C3/C4 (0): no hero/testimonials/pricing/FAQ skeleton, no eyebrow pill, no emoji-over-headline — CLEAN.
- C5 (1): two mechanical defaults reused everywhere — `999px` full-round pills ×14 (category + tag pills) and big radii on everything: computed radius distribution `20px ×194, 4px ×102, 50% ×102, 8px ×101, 12px ×101, 3px ×31, 999px ×14, 28px ×8, 10px ×7`; **318 elements with radius > 12px**.

### D. Motion — **1 / 2 — SLOPPY**

- D1 (0): no scroll fade-up (`translateY` uses are only hover −1/−2px and modal 16px) — CLEAN.
- D2 (0): `ux-pulse`/`shimmer` only on loading skeletons — CLEAN.
- D3 (0): all `animation-delay`/`transition-delay` values are `0s` — no linear stagger — CLEAN.
- D4 (1): spring overshoot `cubic-bezier(0.34,1.56,0.64,1)` on `.game-modal__content` and `.ux-detail`; framer-motion springs in the bundle (`stiffness: 100/500/550`, `whileHover scale 1.05/1.02`).
- D5 (1): **no `prefers-reduced-motion` guard** while 7 `@keyframes` (shimmer, ux-pulse, modal-in, ux-category-enter, ux-spin, ux-random-ready, ux-skeleton-pulse), 42 `:hover` rules and transitions run.
- D6 (0): `:active` rules ×2 exist — CLEAN.

### E. Components — **1 / 2 — SLOPPY**

- E1 (0): no Tailwind class soup; custom token CSS — CLEAN.
- E2 (0): only a handful of inline SVGs (search, dice, sun/moon) — not "everywhere" — CLEAN.
- E3 (0): no terminal mockup — CLEAN.
- E4 (0): no emoji UI (♠♦♣♥ are game-content glyphs inside Minesweeper-card thumbs, excluded) — CLEAN.
- E5 (1): solid colored pill-badge system on every card — 8 category colors incl. the purple pair (A1), plus **13 badges with no background at all**: arcade ×9, idle ×3, word ×1 get `background: rgba(0,0,0,0)` with `color: rgb(255,255,255)` → invisible labels (pixel-verified below).

### F. Copy — **0 / 2 — CLEAN**

- F1: all 12 banned phrases scanned on `body.textContent`, case-insensitive — **every count = 0** (no "get started", "seamlessly", "welcome to", "AI-powered", "dive into", "enjoy"…).
- F2 (0): no weightless marketing headline; copy is functional ("101 games", "Offline mode - all games work offline").

### Totals

Section points: **A2 B1 C1 D1 E1 F0 = 6 / 12 → per the checklist's own scale: "5–9: sloppy, clean up."**
Raw checklist hits ≈ 14 (over the "10+ reads as AI-generated" line) — but the excess is concentrated in one subsystem: **the color/glow layer (A)**. Structure, copy, gradients and motion restraint are genuinely good.

## Overall verdict: **SLOPPY** (A-section is a SLOP cluster; the rest is default-ish, not slop)

The site reads as a hand-patched vibe-coded neon arcade: a "Flat Premium" patch
(`index.html` inline block, `--accent: #06b6d4` cyan) sits on top of an older
purple/neon token system (`--accent:#aa3bff`, `--neon-green:#0f8`,
`--neon-red:#ff3c6e`…), and the two systems fight — with three shipped
**readability bugs** as collateral (below). The visitor sees: purple category
badges, neon glows behind every thumbnail, a frosted-glass header, a neon-green
active pill in dark and an **invisible** active pill in light.

---

## Shipped readability bugs (what a visitor actually cannot read)

1. **DARK: every card title is invisible.** Computed `h3.game-card__title`
   color `rgb(8,6,13)` on card bg `rgb(26,26,26)` (~1.3:1). Pixel clip of two
   title regions: **100% of pixels dark<60** — top colors `rgb(26,26,26)` 77%
   (card bg) + `rgb(8,6,13)` 10% (the glyphs). 101/101 cards affected.
2. **LIGHT: the active category pill has no readable label.** Computed
   `.category-filter__btn.active` = `color rgb(255,255,255)` on bg
   `rgb(240,240,242)`/`rgb(255,255,255)`, contrast **1.14 / 1.02**; pixel clip
   of the active pill: **0% ink pixels** (uniform `rgb(241,241,243)` 60%+).
   Mechanism: `html[data-theme="light"] .category-filter__btn { background:#fff
   !important }` (specificity 0-2-1) beats `.category-filter__btn.active {
   background: var(--cat-color,…) !important }` (0-2-0), while
   `html[data-theme="light"] .category-filter__btn.active { color:#fff !important }`
   still applies. In DARK the same pill renders white-on-neon `#00ff88`
   (contrast **1.34**) or white-on-`#ff3c6e` (**3.43**) — inconsistent per
   category and below AA 4.5.
3. **LIGHT: 13 category badges are invisible.** No rule exists for
   `arcade`/`idle`/`word` → `background: rgba(0,0,0,0)` + `color:#fff` on white
   cards; pixel clip of an "arcade" badge in light: **100% white pixels**.

---

## Prioritized fixes (exact selector → exact new value; flat law: solid colors, no gradients, no blur/glass, no glow, cyan/teal accent, black buttons)

**P0 — readability (ship blockers)**

1. `html[data-theme="dark"] .game-card__title { color: rgb(244, 244, 247); }`
   (was `#08060d` on `#1a1a1a`). Dark titles must be light ink.
2. One active pill for both themes, black per the design law — replace the
   neon inline `background` (JS sets `background: n.color` on the active pill)
   and the light override:
   `.category-filter__btn.active, html[data-theme="light"] .category-filter__btn.active { background: rgb(29, 29, 31) !important; color: rgb(255, 255, 255) !important; border-color: rgb(29, 29, 31) !important; box-shadow: none !important; }`
3. Give the orphan badges a surface:
   `.game-card[data-cat="arcade"] .game-card__category, .game-card[data-cat="idle"] .game-card__category, .game-card[data-cat="word"] .game-card__category { background: rgb(8, 145, 178); }`
   (cyan-700, consistent with riddle/simulation).

**P1 — color de-slop (section A)**

4. Retire the purple pair — `.game-card[data-cat="classic"] .game-card__category { background: rgb(20, 184, 166); }` (was `#6d28d9`);
   `.game-card[data-cat="strategy"] .game-card__category { background: rgb(8, 145, 178); }` (was `#7c3aed`);
   same values for the matching `.ux-detail__cat[data-cat=…]` rules (default `.ux-detail__cat { background: #6d28d9 }` → `rgb(20, 184, 166)`).
5. Make the patch's cyan the only accent: delete/override bundle tokens
   `--accent: #aa3bff` and `--accent: #c084fc` → `#06b6d4` (patch already declares it at `index.html:57`).
6. Retire neon green `#0f8`/`#00ff88` → `rgb(6, 182, 212)` (cyan-500) in: JS category map `all:` entry, logo "MATH" span, footer bullets, `--neon-green` token (search focus border).
7. `.game-card__glow { display: none; }` — removes all 101 inset neon glows (the glow colors themselves can be deleted from the JS map).
8. De-glass: `.app__header { backdrop-filter: none; background: rgb(245, 245, 247); }` (dark: `rgb(0, 0, 0)` → prefer `rgb(10, 10, 11)`);
   `.theme-toggle { backdrop-filter: none; background: rgb(255, 255, 255); }` (dark: `rgb(42, 42, 42)`); `.ux-detail__backdrop { backdrop-filter: none; }` (keep the 0.6 black dim).
9. `.game-card__info { background: rgb(255, 255, 255); }` light / `rgb(42, 42, 42)` dark (was 0.9/0.6 translucent ×101).
10. Kill remaining glows: `a.skip-link { box-shadow: none; }` (keep the outline), `.random-game-btn.is-ready { box-shadow: none; }`, `.category-filter__btn.active { box-shadow: none !important; }`.
11. Optional A4: dark body `rgb(0,0,0)` → `rgb(10, 10, 11)`; light is already fine.

**P2 — polish (B/C/D)**

12. Two radius tokens, no full-round controls: `.game-card, .game-card__thumb { border-radius: 12px; }` (was 20px); `.category-filter__btn, .ux-tag-filter__pill, .search-bar { border-radius: 8px; }` (was 999px).
13. Reduced-motion guard (D5): `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }`.
14. De-spring the modals (D4): `.game-modal__content, .ux-detail { animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }` — ease-out, no overshoot.
15. Deliberate type hierarchy (B): keep Inter for UI, but differentiate — `.game-card__title { letter-spacing: -0.01em; }`, meta/labels `.game-card__category { letter-spacing: 0.08em; }` instead of one global 0.18px.

**Do NOT change:** zero gradients (A2), clean copy (F), no emoji UI, functional
card grid, restrained keyframe set — these are already compliant with the law.

---

## Reproduce

```
xvfb-run -a /home/leozhang/.local/geo-venv/bin/python3 .hermes-swarm/ui-slop-shots.py
```
Prints the full JSON evidence (both themes) to stdout; writes the 6 PNGs to
`.hermes-swarm/ui-shots-2/`; self-verifies each shot's mean luminance.
