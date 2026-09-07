# Codebase Slop Audit — UNBLOCKMATH // ARCADE (portal)

Auditor: glm-5.3-flash worker · Scope: portal only (per `.hermes-swarm/TASK-AUDIT-CODE.md`)
Rubric: `.hermes-swarm/SLOP-CHECKLIST.md` (A1–G6) · Design law: FLAT solid colors, NO gradients, NO glass/blur, NO glow, cyan/teal accent, no emoji UI.
READ-ONLY audit. Nothing was modified. No commits.

## Scope files audited

| File | Size | Notes |
|---|---|---|
| `index.html` | 1,464 lines (48KB, ~1,380 lines of inline `<style>`) | main audit target |
| `assets/portal-ux.js` | 1,359 lines (77KB) | authored UX layer |
| `assets/game-save.js` | 74 lines | shared save util |
| `games.json` | 101 entries | catalog |
| `scripts/smoke_test_games.py` | 114 lines | QA gate |
| `assets/index-CRWHmtoy.js` / `index-CUsUGgbt.css` | minified bundle | read-only reference (Direction A: polish via index.html + CSS only) |

Games/ sparse-checkout note: only 21 game dirs are checked out locally (81 catalog urls missing on disk is an environment artifact of sparse checkout, **not** a finding).

## Evidence commands (quoted output)

```
$ grep -n "backdrop-filter" index.html
415:        backdrop-filter: blur(12px) !important;
416:        -webkit-backdrop-filter: blur(12px) !important;
587:        backdrop-filter: blur(20px) !important;
588:        -webkit-backdrop-filter: blur(20px) !important;
779:        backdrop-filter: none !important;          <- defensive kill (good)
780:        -webkit-backdrop-filter: none !important;
1192:        backdrop-filter: blur(4px);

$ grep -cn "rgba(255, 255, 255" index.html
27

$ grep -n "cubic-bezier(0.34" index.html
477:        animation: modal-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
1186:        animation: modal-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

$ grep -oE "#[0-9a-fA-F]{6}" index.html | sort | uniq -c | sort -rn | head -25
     18 #1d1d1f    18 #06b6d4     8 #e63946      8 #6e6e73      5 #14b8a6
      5 #0e7490     5 #0891b2      4 #e2e0e7      4 #86868b      4 #1a1a2e
      3 #d4a017      3 #6d28d9      3 #0d9488      2 #f0f0f2      2 #ea580c
      2 #db2777      2 #b45309      2 #7c3aed      1 #ff3c6e      1 #f5f5f7
      1 #d97706      1 #b8860b      1 #94a3b8      1 #2a2a2a      1 #121212

$ grep -c "!important" index.html
283

$ node --check assets/portal-ux.js
(no output, exit 0 — syntax OK)
```

Purple-leftover grep (`#7c6aef #9086c4 #b8b0cc #c084fc #6d28d9 #7c3aed #8b5cf6 #3b82f6 #4f46e5 #a78bfa`):
- `index.html`: 6 hits — lines 215, 217, 1219, 1227, 1229 (see A1 below).
- `assets/portal-ux.js`: 0 hits (clean).
- `assets/index-CUsUGgbt.css` (bundle): `#c084fc` ×3 — the bundle's dark-mode `--accent` token. **Neutralized at token level**: index.html:60 `:root { --accent: #06b6d4 }` comes later in cascade order and wins, but the value still ships in the file.

Gradient grep in index.html: 7 matches, **all comments** claiming "no gradients" — zero actual `linear-gradient`/`radial-gradient` declarations. PASS.

## Score tally (rubric: hit = 1, severe cluster = 2)

| Hit | Points |
|---|---|
| A1 purple live on category badges + detail fallback | 2 (severe) |
| A3 glass/blur (3 live sites) + 27 translucent white surfaces | 2 (severe) |
| A5 colored glow shadows ×4 | 2 (severe) |
| A4 pure #000/#fff (bundle dark) | 1 |
| B1 Inter-first font stack (bundle) | 1 |
| C5 rounded-full pill on every control (9× 999px + 3× 50%) | 1 |
| D4 spring cubic-bezier(0.34,1.56,0.64,1) ×2 | 1 |
| D6 :active on only 2 of ~15 interactive controls | 1 |
| E2 uniform thin-line icon set | 1 |
| E4 ★ glyph as badge icon | 1 |
| G1 duplicate selectors + neutralized-not-removed bundle slop | 1 |
| G2 283× !important + transition:all ×6 | 2 (severe) |
| G3 off-token magic hex | 1 |
| G4 dead attribute writes + dead schema field | 1 |
| G5 copy-paste color map / button styles | 1 |
| G6 arcade/idle/word badges render with NO background + purple fallback | 2 (severe) |
| **Total** | **21 → "reads as AI-generated" band** |

Framing: G2's severity is inflated by the deliberate Direction-A architecture (authored override sheet fighting a minified bundle — that *is* an !important war by construction). The genuinely actionable slop is the surviving law violations (purple, blur, glow), the G6 badge bug, and the dead code.

---

## A. Color

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| A1 | index.html:215 | `.game-card[data-cat="classic"]` badge background `#6d28d9` — literal purple, the #1 AI tell, visible on **25 classic games** (largest category) | high | Re-palette classic to a non-hue-250 color (e.g. slate blue-grey or warm neutral) |
| A1 | index.html:217 | `[data-cat="strategy"]` badge `#7c3aed` — second purple, visible on 10 games | high | Same re-palette (e.g. amber/brown family to pair with gold) |
| A1 | index.html:1219 | `.ux-detail__cat` default background `#6d28d9` — purple fallback for any category without a mapped color (currently arcade/idle/word = 13 games) | high | Change fallback to neutral grey/teal, not purple |
| A1 | index.html:1227,1229 | `.ux-detail__cat[data-cat="classic"/"strategy"]` repeat the same purples | high | Fix together with the two rows above |
| A1 | bundle css:1 | `#c084fc` ×3 as bundle dark `--accent` | info (out of edit scope) | Already neutralized by index.html:60 `:root{--accent:#06b6d4}`; note only |
| A2 | index.html (all) | No decorative gradients anywhere in portal; all 7 "gradient" greps are comments | pass | — |
| A3 | index.html:415-416 | `.theme-toggle` live `backdrop-filter: blur(12px)` on translucent `rgba(255,255,255,0.06)` — glassmorphism, violates FLAT law | high | Delete both blur lines; make background solid (e.g. `#16161c`) |
| A3 | index.html:587-588 | Light-mode header: `backdrop-filter: blur(20px)` + `rgba(255,255,255,0.85)` translucent surface — iOS-glass default | high | Solid `#f5f5f7`, no blur |
| A3 | index.html:1192 | `.ux-detail__backdrop` `backdrop-filter: blur(4px)` | high | Remove line; keep solid `rgba(0,0,0,0.7)` (or fully opaque overlay) |
| A3 | index.html:343-344, 374-375, 408-411, 980-982, 1262, 1300-1302, 586, 420, 992, 1013, 1130, 1138, 1346, 1390, 1394 | 27× translucent white surfaces/borders `rgba(255,255,255,0.04–0.25)` (search bar, filter pills, toggle, tag pills, howto box, close buttons, info button) — translucent-white cluster the rubric calls out | medium | Replace with solid surface tokens (`--bg-card` values / light `#fff`+border), per design law "solid surface colors" |
| A3 | index.html:77-79, 351, 353, 1080-1094 | 7× translucent teal tints `rgba(20,184,166,0.12–0.5)` (proxy btn, search focus ring, recent chips) | medium | Solid tinted surface (e.g. `#0d2a2e`) + solid border |
| A3 | index.html:779-780 | `backdrop-filter: none !important` on `.game-modal__backdrop` — defensive kill of bundle blur | pass (good) | Keep |
| A4 | bundle css:1 (dark `:root`) | Dark mode body = pure `#000` bg / `#fff` text; index.html does not override body background in dark | medium (bundle-owned, but fixable from portal scope) | Add `body { background:#0b0b10; color:#e2e0e7 }` override in index.html (matches theme-color meta at line 8) |
| A5 | index.html:463 | `.random-game-btn:hover` glow `0 6px 20px rgba(217,119,6,0.4)` — saturated amber glow | high | Neutral shadow (`rgba(0,0,0,0.25)`) or none |
| A5 | index.html:503 | `.skip-link` glow `0 4px 14px rgba(6,182,212,0.35)` — cyan glow | high | Drop to neutral shadow |
| A5 | index.html:678 | Light featured badge glow `0 2px 8px rgba(184,134,11,0.25)` | medium | `box-shadow:none` |
| A5 | index.html:709 | Light random-btn glow `0 4px 14px rgba(217,119,6,0.25)` | medium | Neutral shadow |
| A5 | index.html:742-744 | `.game-card__glow { display:none !important }` — bundle still renders an inset accent-glow element; portal neutralizes it | info | Correct fix applied; bundle element itself can't be removed (Direction A) |
| A6 | index.html:60-64 | Accent is cyan `#06b6d4` / teal `#14b8a6` — NOT the "safe emerald" tell; matches law | pass | — |
| A6 | bundle css:1 | `--neon-green:#0f8` logo glow still in bundle; neutralized by index.html:331-334 (`filter:none`, color `--accent-2`) | info | Neutralized; note only |

## B. Typography

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| B1 | bundle css:1 (body rule) + index.html:12-14 comment | `font-family:Inter,-apple-system,...` — Inter listed first but never loads offline (no CDN, no local file), so every user actually gets system-ui. The tell is nominal | low | Either drop "Inter," from an index.html body override (one line) or accept + document |
| B2 | — | No mono font on body copy (mono token exists, used only for `code`) | pass | — |
| B3 | index.html | One family, but hierarchy built from weight (600/700/800), size, and case — not the uniform-flatness tell | pass | — |
| B4 | — | No `text-5xl font-bold tracking-tight` default headline; logo is 1.25rem/800 | pass | — |

## C. Layout

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| C1 | — | Identical card grid — but it's a game catalog; uniform cards are the product, not a landing-page tell | pass (inherent) | — |
| C2 | — | No nav>hero>features>testimonials>pricing>faq>cta>footer order; single app grid | pass | — |
| C3 | — | No eyebrow pill / sparkle emoji above a headline | pass | — |
| C4 | — | Single `.app` max-width 1400px container (bundle), not max-w-7xl + uniform py-24 | pass | — |
| C5 | index.html:83, 290, 342, 359, 366, 451, 502, 974, 1078 (999px ×9) + 409, 812, 1155 (50% ×3) | Every floating control is a pill: proxy btn, featured badge, search, search-clear, category pills, random btn, skip link, tag pills, recent chips, theme toggle, info button | medium | Vary radii by role: keep pills for chips/filters only; give search, random-btn, skip-link 8–10px radii |

## D. Motion

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| D1 | index.html:477-484 | `modal-in`: opacity 0 + `translateY(16px) scale(0.97)` on modal open — D1-adjacent but not the scroll-reveal tell (no IntersectionObserver fade-ups anywhere) | low | Acceptable; could drop scale to taste |
| D2 | index.html:866-871 | `ux-skeleton-pulse` opacity pulse — on the *skeleton loading grid* only, not a "popular" badge | pass | — |
| D3 | — | No animation-delay staggering anywhere (`animation-delay` grep: 0 hits) | pass | — |
| D4 | index.html:477 | Modal entry on spring curve `cubic-bezier(0.34,1.56,0.64,1)` — the exact rubric curve | medium | Swap to `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-out, no overshoot) |
| D4 | index.html:1186 | Same spring curve on `.ux-detail` panel | medium | Same swap |
| D5 | index.html:553-569, 1422-1434 | Two full `prefers-reduced-motion` blocks covering transitions/animations | pass | — |
| D6 | index.html:423, 739 | `:active` states exist on exactly 2 controls (theme-toggle, game-card). Category pills (377), tag pills (988), detail play/close (1287, 1307), recent chips (1087), clear-filters (1030) are hover-only | low | Add shared `:active { transform: translateY(0)/scale(.98) }` rules for pills and buttons |

## E. Components

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| E1 | — | No Tailwind/shadcn class soup anywhere | pass | — |
| E2 | index.html markup (globe, dice), portal-ux.js:668-697 (sun/moon), 1200 (info circle) | All icons are one uniform 24-grid thin-stroke (stroke-width 2) set — the "interchangeable Lucide" tell, but hand-inlined, consistent, offline | low | Acceptable; optionally give 2–3 icons distinctive weight (e.g. dice filled) |
| E3 | — | No terminal mockup / traffic-light dots | pass | — |
| E4 | index.html:285 | `content: '★ Featured'` — ★ text glyph used as badge icon | low-medium | Replace with plain `Featured` text (the gold pill already signals it) or an inline SVG star |
| E4 | portal-ux.js:83 | Memory icon uses card-suit glyphs ♠♦♣♥ as SVG `<text>` | low | Borderline (illustrative, inside an SVG drawing); acceptable, or draw suit paths |
| E5 | — | Category badges are solid saturated fills (2-7px padding), not pastel `bg-blue-100 text-blue-800` pills | pass | — |

## F. Copy

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| F1 | games.json (all 101 descs scanned) | Zero hits for: get started / effortlessly / seamlessly / streamline / unlock the power / build faster / ship smarter / welcome to / dive into / jump into / AI-powered | pass | — |
| F1 | index.html + portal-ux.js UI strings | Visible copy is terse/functional ("Skip to content", "Random Game", "Loading game…", "No games found", "Clear filters") | pass | — |
| F2 | — | Headline = site wordmark; card titles = game names. Nothing weightless | pass | — |

## G. Code smells of vibe coding

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| G1 | index.html:349+761, 358+771, 466+823 | Duplicate top-level selectors: `.search-bar__input`, `.search-bar__clear`, `.random-game-btn__icon` each defined twice (sections 7/10 vs UX-polish section) | medium | Merge each pair into one rule in the UX section |
| G1 | index.html:284+675+750 | `.game-card--featured::after` declared 3× (base, light-theme, polish) | medium | Merge polish + base; keep light-theme variant only |
| G1 | index.html:178+525, 186+529 | `.game-card__icon svg` declared 2× + again inside the 640px media block | low | Fold the mobile overrides into the 640px block only |
| G1 | index.html:742-751 | Bundle slop (glow element, fav hover) still shipped, neutralized by kill-rules | info | Inherent to Direction A; keep the kills |
| G2 | index.html (whole file) | **283 `!important`** — the entire sheet is an override war against the bundle; !important is the only mechanism | high (structural) | Direction A makes some of this necessary; consolidate: one override block per component instead of 3 layers, deleting redundant `!important` where a later plain rule would win |
| G2 | index.html:377, 988, 1087, 1159, 1287, 1307 | `transition: all` ×6 (category pills, tag pills, recent chips, net-banner dismiss, detail play/close) | medium | Enumerate properties (`background, border-color, color, transform`) |
| G2 | bundle css ×5 | `transition:all` in bundle (game-card__play, fav, clear, close) | info | Out of edit scope |
| G3 | index.html:60-64 | `:root` declares only 4 tokens (--accent, --accent-2, --danger, --gold) while the file hardcodes ~20 others | medium | Declare `--surface`, `--text-body` (#e2e0e7), `--thumb-bg` (#1a1a2e), `--accent-deep` (#0e7490), `--amber` (#d97706 or delete) |
| G3 | index.html:448, 463, 709 | `#d97706` amber random-btn — a one-off accent that is neither --gold (#d4a017) nor --accent | medium | Tokenize or switch to var(--gold) |
| G3 | index.html:676 | `#b8860b` second gold in light theme ≠ --gold | low | Use `color-mix(in srgb, var(--gold) 85%, black)` or a `--gold-deep` token |
| G3 | index.html:599, 714, 1337-1338, 1362 | `#0e7490` (light cyan) used 5× undeclared | low | Token `--accent-deep` |
| G3 | index.html:147, 292, 449, 1201 | `#1a1a2e` used 4× undeclared (thumb bg, badge text, panel bg) | low | Token `--surface-2` |
| G3 | index.html:80, 411, 1083, 1202 | `#e2e0e7` body text used 4× undeclared | low | Token `--text-body` |
| G3 | index.html:291 | Featured badge `background:#d4a017` hardcoded while `--gold` exists | low | `background: var(--gold)` |
| G3 | index.html (18×) | Every `var(--accent, #06b6d4)` re-hardcodes the fallback — defensive but doubles as magic-number noise | low | Declare tokens on `:root` once, drop fallbacks in the same file |
| G4 | portal-ux.js:172-175 | `data-featured` written on every card; **zero readers** (no CSS, no JS consumes it) | medium | Delete the write (and its `hasAttribute` guard) |
| G4 | portal-ux.js:196-200, 829 | `data-title` written on card, thumb, and tags container with comment "for CSS pseudo-element content" — **no `attr()` usage exists** in index.html or bundle CSS. Comment is false; attribute is dead | medium | Delete writes + fix comment |
| G4 | games.json:101/101 entries | `"icon": ""` — schema field dead in every entry (portal renders its own SVG map; bundle ignores it) | medium | Drop the field in a schema-v2 cleanup, or populate 3-4 and use them |
| G4 | portal-ux.js:1060-1061, 1073-1074 | Corrupt localStorage in `recordRecent`/`getRecentList` swallowed and reset silently — acceptable guard, but `recordRecent`'s nested `catch(e2)` swallows even the *reset* path | low | Comment or console.warn once (no spam) |
| G4 | portal-ux.js:260, 638, 654, 727, 230, 847 | Empty catches: popup-blocked fallback (260, has fallback behavior), theme storage (638/654/727), catalog catch-noop (230/847) — all deliberate, none hide real logic errors | pass (documented guards) | — |
| G4 | portal-ux.js (all 60 functions) | Dead-JS sweep: `trapModalFocus`, `doClearFilters`, `handler` flagged by naive count are **passed as references** (addEventListener) — no function is truly uncalled; zero `console.log` | pass | — |
| G4 | game-save.js:55-73 | `listAll()` exported but never called by any game (TicTacToe/ConnectFour use only load/save/clear) or portal | low | Keep (documented "if needed") or delete |
| G5 | index.html:214-222 vs 1227-1235 | Category→color map duplicated verbatim in two selectors (9 lines each); they will drift (riddle/simulation already share `#0891b2`) | medium | Single shared map: emit one rule list `[data-cat]` used by both badges, or move colors to portal-ux that sets `--cat-color` (bundle already supports the var) |
| G5 | index.html:897-910 vs 1030-1041 | `.app__error button` and `.ux-clear-filters` are the same button (accent bg, 44px, radius 8, focus ring) typed twice; error button restyled a third time in light theme | low | One `.ux-btn-primary` class used by both |
| G5 | index.html:594-719 | Light theme re-states full component styles per component instead of swapping tokens | low | Long-term: theme via token swap only |
| G6 | index.html:213-222 + games.json | **arcade (9), idle (3), word (1) categories have no badge color** → index.html sets `color:#fff !important; border:none` (lines 229-236) but no background → white text on transparent = invisible chip on 13 games | high | Add `[data-cat="arcade"|"idle"|"word"]` colors, or a default background on `.game-card__category` |
| G6 | index.html:1219 | Same gap in detail panel falls back to **purple** `#6d28d9` for those 13 games (visible purple where the user never chose one) | high | Neutral default + add the 3 missing cats |
| G6 | — | Features claimed vs implemented: favorites persist (`unblockmath_favorites` in bundle), recent-plays persist, skip link, slash-focus, offline banner, detail panel — all verified implemented. Smoke-test gate exists and clicks Play buttons | pass | — |

## scripts/smoke_test_games.py

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| G4 | smoke_test_games.py:17 | `BENIGN` includes catch-all `"failed to load resource"` — documented as duplicate of request capture, but a console error with *no* matching failed request (e.g. CSP violation) would be masked | low | Narrow it to exact Chromium wording match or drop it (requests are ground truth, as the comment itself says) |
| — | smoke_test_games.py (whole) | No console.log spam, no empty catches, correct lambda default-arg binding (`e=errs, f=fails`), deterministic exit code | pass | — |

## games.json

| ID | File:line | Finding | Severity | Suggested fix |
|---|---|---|---|---|
| G4 | all 101 entries | `"icon": ""` dead field (see G4 above) | medium | Schema cleanup |
| G6 | arcade/idle/word entries (13 games: Typing Speed, Crossy Road ± Hacked, Doodle Jump Hacked, Subway Surfers Hacked, Helix Jump, Geometry Rash, Mario Kart, Sonic Advance, Cookie Clicker ± Hacked, Doge Miner, Hangman) | Categories unmapped in CSS (see G6 above) — direct user-visible effect | high | Map the 3 cats or default color |
| — | ids | Non-contiguous ids (gaps at 2-3, 21-22, 26-30, 32-34, 38-41, 43, 45-46, 61, 105-106, 108, 110) and id 105 (Fruit Ninja Hacked) appears before id 62 — no duplicate ids; parse-valid | info | Cosmetic; ordering by id not required by consumers |
| F1 | — | No slop phrases in any desc; no emoji | pass | — |

## Third-party HTML5 games (report-only, no changes proposed)

| Game | Finding |
|---|---|
| `Games/HelixJump/index.html` | 1 gradient: `.background-gradient` legacy `-webkit-gradient(linear,…from(#e66465),to(#9198e5))` — red→periwinkle full-page background (rubric A1/A2 pattern). Third-party port; noted, **not** proposed for modification |
| `Games/CrushTheCastle/index.html` | Clean — no gradients, no backdrop-filter, no colored glows |
| `Games/GeometryRash/index.html` | Clean — same checks pass (Construct 3 export) |

---

## Prioritized removal list (top 10)

1. **index.html:587-588** — delete light-header `backdrop-filter: blur(20px)` + `-webkit-` twin; set `background: #f5f5f7` solid. (A3, glass on the most-visible surface)
2. **index.html:415-416** — delete theme-toggle `blur(12px)` + twin; solid `#16161c`-style background. (A3)
3. **index.html:1192** — delete `.ux-detail__backdrop` `blur(4px)`. (A3)
4. **index.html:215, 217, 1227, 1229** — re-palette classic/strategy badges off purple (`#6d28d9`, `#7c3aed`) onto law-compliant solid colors. (A1, 35 visible cards)
5. **index.html:1219** — change `.ux-detail__cat` purple default to neutral; and **add arcade/idle/word colors** to both maps (fixes the invisible-badge bug on 13 games at the same time). (A1+G6)
6. **index.html:463** — random-btn hover glow `rgba(217,119,6,0.4)` → neutral `rgba(0,0,0,0.25)`; same treatment for 503 (cyan skip-link glow), 678 + 709 (light gold/amber glows). (A5 ×4)
7. **index.html:214-222 vs 1227-1235** — collapse the duplicated category color map into one shared block (or set `--cat-color` from portal-ux, which the bundle pill style already consumes). (G5/G3, kills drift risk)
8. **assets/portal-ux.js:172-175 and 196-200 + 829** — delete dead `data-featured` and `data-title` writes (zero readers; the data-title comment claims CSS pseudo-element use that doesn't exist). (G4)
9. **index.html:285** — `'★ Featured'` → `'Featured'` (gold pill already carries the signal; removes the text-glyph icon). (E4)
10. **index.html:448 + 676 + 599/714/1337-1338/1362 + 291** — tokenize the off-palette hexes: `#d97706`→`--gold` or new token, `#b8860b`→gold-mix, `#0e7490`→`--accent-deep`, badge bg→`var(--gold)`. (G3)

*Honorable mentions (just outside top 10): merge the 3 duplicate selector pairs (G1); replace 6× `transition:all`; solid surfaces for the 27 `rgba(255,255,255,…)` cluster; drop `"icon":""` from games.json; `body{background:#0b0b10}` dark override (A4).*
