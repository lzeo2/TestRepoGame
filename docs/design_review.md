# PHASE 2 — SECURITY + DESIGN REVIEW

**Scope:** repo @ `HEAD` (commit as of review), portal files on disk (`index.html`, `assets/`, `games.json`, `icons.svg`, `favicon.svg`, `netlify.toml`, `netlify/`, `uv/`) + all of `Games/` via `git grep HEAD` / `git show HEAD:` (games are not checked out locally).
**Standard:** `docs/CODE_QUALITY.md` (offline-first, no secrets, 44px targets, textContent rendering, Esc/focus rules).
**Method:** every claim below is backed by a command output quoted inline or a `file:line` citation. No files were modified other than creating this document. Nothing was committed.

Severity per CODE_QUALITY §6: **CRITICAL** = security hole / external fetch (fix before push) · **HIGH** = unplayable / broken catalog / offline violation · **MEDIUM** = dead code / console errors / minor a11y · **LOW** = style, leftovers.

---

# PART 1 — SECURITY REVIEW

## Check 1 — External third-party JS/CDN loading in games → **FINDING**

Evidence: `git grep -nE 'https?://' HEAD -- 'Games/*/index.html'`, `git grep -hoE '<script[^>]+src="https?://[^"]+"' HEAD -- 'Games/*'`, plus per-domain sweeps (`googletagmanager`, `cdnjs`, `githack`, `paypalobjects`, `jsdelivr`, `unpkg`, `fonts.googleapis`, `poki`, `gamedistribution`, …).

### 1a. Known intentional exceptions (allowlisted for this review)

| Target | Where | Status |
|---|---|---|
| `https://www.worldguessr.com/` iframe | `Games/GeoGuesser/index.html:15` | **Allowlisted** — documented in `Games/GeoGuesser/CREDITS.md` (verified: file exists, credits codergautam/WorldGuessr). Still an external embed: works online only, third-party content. |
| `cdnjs.cloudflare.com/.../three.js/r128/three.min.js` | `Games/OrbitCollector/index.html:75` | **Known offline violation** (confirmed still present, unpinned-to-local). HIGH. |
| Subway Surfers `hwstats.cgi` telemetry | — | **Not found at HEAD** — `git grep -i hwstats HEAD -- Games/` returns 0 matches. Either already removed or inside a compressed Unity data blob (not greppable text). No action beyond confirming during browser QA. |
| seraph ad stubs / provenance | header comments in `Games/{BaldisBasics,BitLife,BurritoBison,PapasPizzeria,SubwaySurfers,SubwaySurfersHacked,TempleRun2}/index.html` (e.g. `TempleRun2/index.html:8`) | **Allowlisted** — vendored-provenance comments; the stub code itself is local. |

### 1b. NEW / unallowlisted external loads

1. **CRITICAL — the portal itself loads Google Analytics.** `index.html:1603-1610`:
   `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ERN6R7YHJ5"></script>` + `gtag('config', …)`.
   Violates offline-first rule #2 on the *portal* (our own code, not a vendored game): network request to googletagmanager.com on every page view, telemetry (IP/UA/referrer) sent to Google, breaks offline use (fails silently online-only), and CSP has no `script-src` to contain it.
   **Fix:** delete lines 1603–1610 (or vendor a no-op). This is the single highest-priority security item.

2. **HIGH — executed gtag inside registered games.**
   - `Games/SubwaySurfers/subwaysurfers/index.html:3` — `<script async src="https://www.googletagmanager.com/gtag/js?id=G-7FN7LEVWXD">`
   - `Games/SubwaySurfersHacked/subwaysurfers/index.html:3` — same tag.
   - `Games/_emulatorjs/data/localization/Translate.html:4` — same tag (loads if the emulator localization page is opened).
   **Fix:** strip the gtag blocks (they are 8 lines each) — TempleRun2 already demonstrates the house pattern (see item 7).

3. **HIGH — runtime fetch to a mutable third-party host (supply chain).**
   `Games/_emulatorjs/data/emulator.js:233` → `fetch('https://raw.githack.com/EmulatorJS/EmulatorJS/main/data/version.json')` (same in `emulator.min.js:1`). Whatever raw.githack serves gets consumed by the emulator; online users execute third-party-controlled content, offline users get a console error.
   **Fix:** stub the URL with a local `json/null.json?…`-style route (repo's existing offline-patch idiom) or remove the update check.

4. **MEDIUM — external images incl. a tracking pixel.**
   `Games/CookieClicker/index.html:117-118`: PayPal donate button `<input type="image" src="https://www.paypalobjects.com/...btn_donate_LG.gif">` and `https://www.paypalobjects.com/nl_NL/i/scr/pixel.gif` (1×1 tracking pixel; `CookieClickerHacked` inherits the same markup). Every page load pings paypalobjects.
   **Fix:** vendor the button image locally, delete the pixel.

5. **MEDIUM — dormant gtag/analytics injectors (dead but armed).**
   - `Games/BasketRandom/js/analytics_ubg_v1_4.js:6` → `newScript.src = "https://www.googletagmanager.com/gtag/js?id=" + id`
   - `Games/SoccerRandom/js/analytics_ubg_v1_4.js:6`, `Games/SoccerRandom/js/analytics_games235.js:22`
   - `Games/VolleyRandom/js/analytics_ubg_v1_4.js:6`, `Games/VolleyRandom/js/analytics_games235.js:22`
   None of these files are referenced from their game's `index.html` (`git grep -ln 'analytics_ubg|analytics_games235' -- Games/<g>/index.html` → no matches) → not executed today, but one import away from a violation.
   - `Games/FruitNinja/manifest.json:4` contains a gtag `<script>` — this file is *linked* via `FruitNinja/index.html:11 <link rel="manifest">`; browsers never execute manifest contents (inert), but it makes the manifest invalid JSON/HTML and keeps a live gtag snippet in the tree.
   **Fix:** delete the analytics files and clean FruitNinja's manifest.

6. **MEDIUM — Google Fonts / unpkg / ad-CDN references inside game subtrees** (executed only if the referencing file is loaded — most are QA/patch dirs, but they are reachable from entry points or mod loaders):
   - `Games/SoccerRandom/patch/cdn/bootstrap.4.5.0.min.css:12` and `Games/VolleyRandom/.../bootstrap.4.5.0.min.css:12` — `@import url("https://fonts.googleapis.com/css?family=Source+Sans+Pro…")`.
   - `Games/Ovo/src/mods/modloader/levelselector.js:116` and `Games/Ovo/dimensions_qa_v{3,4,7}/test.js:109` — `@import url('https://fonts.googleapis.com/css2?family=Ubuntu…')`.
   - `Games/Ovo/src/mods/modloader/ai.js:144` — `addScript("https://unpkg.com/brain.js@latest/…")`; `multiplayer.js:4617,4646` — unpkg notie CSS/JS; `multiplayer.js:7254` — unpkg peerjs. (`@latest` = unpinned, worst case.)
   - `Games/Ovo/dimensions_qa_v*/` QA builds reference `https://gameframe.crazygames.com/crazygames-gameframe-v1.bundle.js` and `https://dcqi4aodgg8tv.cloudfront.net/…/apsvid.js` (Amazon APS video ad SDK).
   - `Games/FireboyAndWatergirl*/version.js:2` — `libs=[https://cdn.jsdelivr.net/npm/@azerion/phaser@2.6/…]` (jsDelivr fallback list; entry uses local requirejs — dormant).
   - GameDistribution ad SDK with live endpoints: `Games/Vex7/gamedistribution/js/main.min.js:7042` `fetch("https://tag.atom.gamedistribution.com/v1/atm?…")` (note `:4927` shows an existing offline route `json/ping.json?https://msgrt.gamedistribution.com/…` — the ping was patched, the atm tag was not); similar SDK code embedded in `Games/BasketRandom/js/main.min.js` and the Fireboy `*.min.js` bundles; Poki SDK endpoints (`api.poki.com`, `t.poki.io`, `geo.poki.io`, `devs-api.poki.com`) embedded in Poki-vendored games (CrossyRoad, FruitNinja, SubwaySurfers, Ovo).
   - `Games/HouseOfHazards/patch/cdn/webfont/webfont.1.5.18.js` / `1.6.26.js` — Google WebFont loader (loads from `fonts.googleapis.com` when active).
   **Fix:** strip `@import` font rules (use system fonts), delete unpkg `addScript` calls in modloaders, delete QA ad-CDN script tags in `Ovo/dimensions_qa_*`.

7. **Note (positive) — offline guards exist and work for XHR/fetch:** `Games/TempleRun2/index.html:105` monkeypatches `XMLHttpRequest.open` + `fetch` to no-op external URLs (`poki.com|babylonjs.com|unpkg.com|typekit.net|googletagmanager.com|google-analytics.com`). **Gap:** it does *not* block `<script src>` — which is exactly how the gtag tags in item 2 load. Any Phase-3 remediation must remove the tags, not rely on guards.

8. **LOW — external links only (navigate on click, no resource load):** `Games/Ovo/index.html:175` (dedragames.com), Ovo's browser-upgrade links (whatbrowser.org, mozilla.org, …), `Games/GeometryDashLite` `gamecomets.com`, `browsehappy.com`; `Games/LetterBoxed/index.html:7` `http://www.w3.org/…` inside a `data:` favicon (inert XML namespace, harmless).

**Verdict: FINDING — 1 CRITICAL (portal gtag), 3 HIGH (game gtag ×2 pages + emulator githack; OrbitCollector cdnjs is a known exception), several MEDIUM/LOW.**

## Check 2 — Dangerous patterns (eval / new Function / document.write / innerHTML sinks / postMessage) → **FINDING (low severity)**

### eval / new Function / document.write
Sweep: `git grep -lE 'eval\(|new Function|document\.write' HEAD -- 'Games/*'` → 130 files, but ~125 are **vendored engines** (ruffle, Construct `c2runtime.js`, requirejs, Phaser, Unity/emscripten, prebid, GameAnalytics, poki/crazygames SDKs) — local code, not a web eval sink. First-party hits classified:

| Location | Pattern | Assessment |
|---|---|---|
| `Games/ADarkRoom/script/state_manager.js:83,91,166,180` | `eval('('+fullPath+') = value')` etc. | **LOW/MEDIUM.** First-party state setter. Input is developer-constructed key paths, not URL/postMessage data → not injectable today, but it is real `eval` in first-party code (CODE_QUALITY §3 "No eval()"). Rewrite with a path-walking getter/setter. |
| `Games/ADarkRoom/index.html:40,41,92` | `document.write('<script src="lang/'+lang+'/strings.js">…')` | **LOW.** `lang` comes from page config (not query string). Still the classic document.write pattern; replace with DOM insertion. |
| `Games/DriftBoss/game.js:43690` | `new Function("return this")()` | **LOW — benign idiom** (storage-support probe, also in `Games/TempleRun2/bundle_original.js:300396`). |
| `Games/HelixJump/gameplay.js:1` | obfuscated (`_0x…` names) `new Function('return this')` | **LOW.** Obfuscated first-party-ish file — worth one human eyeball during QA; matches the rest of the obfuscated bundle. |
| `Games/CookieClicker{,Hacked}/main.js:10067` | `'eval()'` string | **False positive** — it's the name of a Cookie Clicker upgrade. |

### innerHTML fed from location.search / location.hash / document.referrer / postMessage
`git grep -nE 'innerHTML' HEAD -- 'Games/*' | grep -E 'location\.(search|hash)|document\.referrer|e\.data|event\.data'` → **no first-party hits** (only jQuery/engine internals where `e.location` is the window object, not a sink). **No DOM XSS sink of this class found. PASS on the sink itself.**

### postMessage with wildcard target origin
Widespread, all inside vendored SDKs, sending *outward* (to `window.parent`) with no DOM sink on receipt in our pages:
- `Games/HelixJump/crazygames-sdk-v1.js` — `postMessage(e,"*")` ×3 (init handshake to gameframe, 3 parent levels up).
- Poki SDKs (`CrossyRoad*/poki-sdk-core-*.js`, `SubwaySurfers*/…`, `FruitNinja*/…`) — `postMessage(s,"*")`, `postMessage(o,"*")`.
- `Games/Vex7/gamedistribution/js/main.min.js` ×2, `Games/*/patch/google/ima3-o.js` (IMA ads), Unity emscripten main-loop pings (`postMessage(emscriptenMainLoopMessageId,"*")` in SubwaySurfers/TenMinutesTillDawn builds), `Games/Ovo/*/c2runtime.js`.
Receivers type-check `e.data.type` and never write it into the DOM via innerHTML (verified by the sink grep above). **LOW** (SDK idiom; nothing to fix without rewriting SDKs).

### Portal bundle (`assets/index-CRWHmtoy.js`)
- `eval(` / `new Function` / `document.write` → **0 matches** (`grep -oE … | sort | uniq -c` empty).
- `innerHTML` → 5 matches, all React internals (`dangerouslySetInnerHTML` plumbing, MathML setup, `suppressHydrationWarning` allow-list). The catalog path renders `children:e.title`, `children:e.cat`, `children:e.desc`, `children:e.icon` → React escapes → **text semantics**.
- `postMessage(null)` → React scheduler's `MessageChannel` ping (benign).
- No `location.search` / `location.hash` / `document.referrer` / `message` listener anywhere in the bundle. **PASS.**

**Verdict: FINDING — MEDIUM at worst (first-party `eval` in A Dark Room), otherwise vendored-engine noise. No exploitable injection sink found in games or portal.**

## Check 3 — localStorage keys & collisions → **FINDING**

58 distinct literal keys found (`localStorage\.(get|set|remove)Item\("…"` sweep across Games).

### Portal keys (all clean vs games)
| Key | Defined at | Collides with a game? |
|---|---|---|
| `unblockmath_favorites` | bundle (`var Ku=\`unblockmath_favorites\``) | No |
| `unblockmath_recent` | `assets/portal-ux.js:1044` | No |
| `unblockmath_sort` | `assets/portal-ux.js:1183` | No |
| `theme` | `assets/portal-ux.js:762` | No game uses `'theme'` (grep 0 hits) — but the name is generic: **LOW** future-collision risk. Rename to `unblockmath_theme` when convenient (note: renames must migrate stored value). |
| `__um_probe` | `index.html:21` (read-only probe) | No |

Favorites/recents parsing is guarded per CODE_QUALITY §4: bundle does `try{JSON.parse…}catch{}` + `Array.isArray` filter; `portal-ux.js recordRecent/getRecentList` same. Corrupt data cannot crash. **PASS.**

### Cross-game collisions (same key, ≥2 different games)
| Key | Games | Severity |
|---|---|---|
| `__c2save_<slot>` (`"__c2save_" + savingToSlot`) | **GeometryRash** (`Games/GeometryRash/c2runtime.js:7024`) and **Ovo** (`Games/Ovo/*/c2runtime.js:7085` etc.) — same origin, generic slot ids | **MEDIUM — real save overwrite.** Playing Geometry Rash can clobber Ovo level progress and vice versa. Construct-2 default; needs a per-game key prefix (`<game>_c2save_<slot>`) — that's a game-side patch, schedule with game work, not Phase 3. |
| `qwop_best` | QWOP **and** QwopRemake (two different games) | **MEDIUM** — high scores leak between distinct games. |
| `CookieClickerGame`, `CookieClickerGameBeta`, `CookieClickerGameBetaDungeons`, `CookieClickerGameOld`, `CookieClickerGamev10466` | CookieClicker + CookieClickerHacked | MEDIUM — hacked variant overwrites vanilla save (probably unintended; decide: share or namespace). |
| `DJ_calibrated`, `DJ_stats`, `DJ_localTopScores`, `DJ_directionalShooting`, `DJ_Doodle_name`, `DJ_soundToggle`, `DJ_calibrate` | DoodleJump + DoodleJumpHacked | MEDIUM (same decision as above). |
| `flappy-best` | FlappyBird + FlappyBirdHacked | LOW/MEDIUM |
| `snakeHighScore` | Snake + SnakeHacked | LOW/MEDIUM |
| `pokiMigrated` | CrossyRoad(+Hacked), FruitNinja(+Hacked), SubwaySurfers(+Hacked) | LOW — Poki SDK's own flag; one boolean, harmless. |
| `fb-fairytales:settings` | Fireboy Fairy Tales + Hacked | LOW |
| `adagio` | Ovo + Wordle | LOW — ad-SDK id bucket. |
| `test` | DriftBoss (`game.js:60168,6206-207`), GeometryRash (`c2runtime.js:23316`), TempleRun2 (`bundle_original.js:300396`) | **LOW — benign**: all are set-then-remove storage-support probes. |
| `testingLocalStorage` | Fireboy family ×8 + HelixJump + Ovo | LOW — vendor probes, self-cleaning. |
| `i18next.translate.*` | Fireboy family (same vendored lib) | LOW. |
| `modSettings`, `guiSettings`, `myCat`, `lastPromptTime/Id`, `ob_source`, `_pubcid`, `_lr_env`, `idl_env`, `panoramaId`, `id5id`, `hadronId`, `prebid.cookieTest`, `ejs-*`, `__c2save_*` (Ovo-internal) | Ovo subtree only (same game, many builds) | OK — intra-game, no cross-game conflict. |

Caveat: literal-string sweep misses keys computed from variables; treat the table as the complete *static* picture.

**Verdict: FINDING — 2× MEDIUM real collisions (`__c2save_`, `qwop_best`), a family of original↔hacked save shares needing a policy decision, rest benign. Portal keys clean.**

## Check 4 — Portal XSS (games.json rendering + URL params) → **PASS**

- **Rendering:** the bundle renders catalog fields only as JSX children — grep of `assets/index-CRWHmtoy.js` shows `game-card__title`←`children:e.title`, `game-card__category`←`children:e.cat`, `game-card__desc`←`children:e.desc`, thumb span←`children:e.icon`. React escapes all of them (textContent-equivalent). The 5 `innerHTML` occurrences are React internals (unused `dangerouslySetInnerHTML` plumbing) — **no games.json field reaches an HTML sink.**
- **portal-ux.js:** every catalog-driven write uses `textContent` / `createElement` (`ux-detail__desc.textContent = game.desc`, `chip.textContent = entry.title`, `tagEl.textContent`, `aria-label` concatenations…). Its `innerHTML` assignments are all *static authored constants* (the `GAME_ICONS`/`CATEGORY_ICONS` SVG maps, theme-toggle sun/moon SVG, info-button SVG, loading spinner markup). **No user/catalog string flows into them.**
- **URL params:** `grep -E 'location\.(search|hash)' assets/index-CRWHmtoy.js assets/portal-ux.js index.html` → **zero**. No referrer or `postMessage` handling anywhere in portal code. There is no query-string attack surface.
- **Navigation guard:** `assets/portal-ux.js:492 safeGamePath()` requires `Games/`, rejects `scheme:`, `//`, `..`, `%2e/%2f/%5c/%00`, backslashes, control chars — applied to card opens, recents, random button, and the "Open in new tab" href; the bundle mirrors it (`__portalSafeSrc`). A malicious `games.json` `url` cannot become `javascript:` or an external navigation.
- **Hardening note (LOW):** `netlify.toml` CSP is only `frame-ancestors 'self'` — no `script-src`, so there is no browser-level backstop if a future edit introduces an HTML sink. Consider adding `script-src 'self' 'unsafe-inline'` (inline scripts exist in index.html) once gtag (Check 1) is removed.

**Verdict: PASS.** (Worst case from a malicious games.json edit: misleading *text* and a neutralized URL — not script.)

## Check 5 — netlify.toml + netlify/ functions → **PASS**

- `netlify.toml`: the only `/bare/*` definition is the **commented-out template** at the bottom (requires an operator-controlled host, explicitly warns against public relays); comments document that the old `tomp.app` open relay was removed and requests 404 meanwhile. Only other redirect: `/uv → /uv/` (status 200, internal path, no open redirect).
- Headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: frame-ancestors 'self'` — present. `/uv/sw.js` gets `Service-Worker-Allowed: /` (scoped to that one file; required by UV, doesn't widen anything else).
- `netlify/functions/bare.js`: returns static JSON only (`proxyEnabled:false`, `localBare:false`), reads at most `process.env.PUBLIC_BARE_URL` (documented informational), performs **no forwarding, no redirect, no header injection**. No secrets in the file.
- Secrets scan across portal surface (`index.html games.json netlify.toml netlify/ uv/ assets/` for `api_key|secret|token|password|ghp_|sk-…` → **no hits**; absolute-path scan `/home/|C:\\` → **no hits**).

**Verdict: PASS.**

---

# PART 2 — DESIGN REVIEW (portal: index.html + assets/index-CUsUGgbt.css + assets/portal-ux.js + icons.svg + favicon.svg)

Overall: the portal is in good shape — skip-link, focus rings, Esc handling, arrow-key grid navigation, focus trap + restore, `aria-live` result counts, reduced-motion blocks, safe-area insets, loading/error/empty states all exist (CODE_QUALITY §4 is mostly honored). The findings below are the gaps.

### Typography hierarchy

- **D-1 · MEDIUM — no real `<h1>`; dialog titles out-shout the site title.** `index.html` contains zero `<h1>/<h2>` elements (grep: none); the site title is the bundle's `.app__logo-text` div, upgraded to `role="heading" aria-level="1"` by JS (`assets/portal-ux.js applyGrouping()`) and styled at `1.4rem/800` (`index.html:344`). Meanwhile `.ux-detail__title` is `1.5rem/700` (`index.html` detail panel block) and `.game-modal__title` is `1.25rem` — the hierarchy is inverted (a popup heading > site heading), and the bundle's `h1{font-size:56px}` rule (`assets/index-CUsUGgbt.css` line 1) is dead code.
  **Fix:** bump `.app__logo-text` to ~1.6rem; cap `.ux-detail__title` at 1.35rem and `.game-modal__title` at 1.35rem so no dialog exceeds the page title.
- **D-2 · MEDIUM — unreadably small text tiers.** `.game-card__tag` at `0.55rem` (`index.html:249`) ≈ 8.8px, and `.game-card--featured::after` "FEATURED" at `0.55rem !important` (`index.html:315`); category badges at `0.6rem` (`index.html:214`) ≈ 9.6px. CODE_QUALITY flags "tiny unreadable fonts".
  **Fix:** tags/badges ≥ 0.7rem (11px); keep weight 600.
- **D-3 · LOW — letter-spacing sprawl:** `-1.68px` (dead h1), `-.24px` (h2), `-.03em` (logo), `.18px` (body), `.04/.05/.06/.07/.1/.12/.16em` across chips/badges/footer. **Fix:** collapse to three roles: display `-0.03em`, UI labels `0.06em`, footer `0.12em`.
- **D-4 · LOW — unit mixing:** authored CSS mixes `rem` (Phase-4) and `px` (inline §13 `gap:12px`, `padding:2px 7px`), while the bundle uses `rem`. **Fix:** one unit (rem) in authored layers.

### Spacing rhythm & cascade

- **D-5 · MEDIUM — four stacked stylesheets fighting with `!important`.** Order: bundle minified CSS → authored Phase-4 block (`assets/index-CUsUGgbt.css` after line 1) → two authored inline `<style>` blocks in `index.html`. Symptoms: `.game-card--featured::after` defined **3×** (bundle-CSS accent version, `index.html` §5 gold version — both `!important`, later wins); `.game-card__glow` hidden **2×**; `prefers-reduced-motion` blocks **3×**; `.game-modal__footer` safe-area padding defined **2×**; `999px` pill radius set for `.category-filter__btn` in `index.html` §8 then overridden to `6px !important` in the same file's sprint block. Comments promise behavior the cascade then contradicts.
  **Fix (Phase 3):** consolidate all authored overrides into a single appended block with one `!important` policy; delete defeated duplicates (dead `.game-card--featured` accent rule, second glow kill, duplicate reduced-motion, duplicate modal safe-area).
- **D-6 · MEDIUM — three radius languages:** cards `20px`/`28px` (bundle `--radius`/`--radius-lg`), modal `16px` (inline §11) vs `24px` bottom-sheet (Phase-4), controls split between `999px` (search, skip-link, random, proxy, featured badge) and `6px` (category chips, tags, recent chips — sprint block). **Fix:** scale = controls `999px`, cards `20px`, dialogs `16px`, badges `6px` — and remove the conflicting rules.
- **D-7 · LOW — gap rhythm:** section gaps `1.5rem` / featured `1.25rem` / grid `1rem` / mobile `12px` / chips `.6rem`; card padding `1rem` → `.85rem` at 400px. Not off by much, but un-tokenized. **Fix:** `--gap-section:1.5rem; --gap-grid:1rem; --gap-tight:.75rem`.

### Color / contrast / flat-color house rules

- **D-8 · MEDIUM — white-on-cyan fails AA (4.5:1).** `#fff` on `--accent #06b6d4` ≈ **2.5:1** at:
  `.skip-link` (`index.html:509` block, `background:var(--accent); color:#fff`), `.ux-clear-filters` (`index.html:1109`), `.ux-tag-filter__pill[aria-pressed="true"]` (`index.html:1073`), `.ux-detail__play` (`index.html:1355`). The Play button was already fixed to dark text (`color:#06212a`, sprint block) — the siblings weren't.
  **Fix:** use the same dark-on-cyan (`#08252b`) for all four (light-mode variants already fine).
- **D-9 · MEDIUM — category badge white-on-color failures.** Badges force `color:#fff !important` (`index.html:211-218`) on per-category colors at `0.6rem/600` (small text → 4.5:1 required). Measured: `puzzle #ea580c` ≈ **3.6:1**, `classic #0d9488` ≈ **4.0:1**, `riddle/simulation #0891b2` ≈ **3.9:1**, `action #e63946` ≈ **4.1:1** — all fail; `story #db2777` 4.6, `multiplayer #b45309` 4.6 barely pass. Same colors are reused in `.ux-detail__cat` (`index.html` detail block) → same failure.
  **Fix:** darken the four failing badge fills (e.g. puzzle `#c2410c`, classic `#0f766e`, cyan badges `#0e7490`, action `#b91c1c`) — or bump badge font to 0.7rem and darken anyway.
- **D-10 · LOW — flat-rule compliance is good, residue remains:** glows removed, gradients suppressed (thumbs flat, footer flat, featured flat), but `assets/index-CUsUGgbt.css` bundle layer still ships `.skeleton:before` shimmer `linear-gradient` (subtle, acceptable), `.game-card--featured` gradient background and `.game-card__thumb` radial+linear (overridden by later flat rules — dead weight, delete in D-5 consolidation), and the `--neon-*` token set still lives in bundle `:root` (logo accent `#0f8`, footer even-spans `#0f8`, `.app__logo-icon` glow killed). Muted text `#b3b3bf` on `#0b0b10` ≈ 8:1 ✓; `#888` on dark ≈ 5.4:1 ✓; light mode is consistently re-declared ✓. No low-contrast *body* text found beyond D-8/D-9.
- **D-11 · LOW — `meta theme-color #0b0b10` + `color-scheme dark`** while a light theme exists; `portal-ux.js` updates the `color-scheme` meta on toggle but `theme-color` stays dark (browser chrome mismatch in light mode). **Fix:** update `theme-color` in `applyTheme()` — note: portal-ux.js edit (authored file, adjacent scope).

### Mobile 360px

Breakpoints: bundle uses modern `width<=1024/1200/900/768/600/480/400`; inline adds `1024/768/640/480/400` (comment claims "1024 / 768 / 375px" but the code says 400 — comment is wrong). At 360px: header stacks (search `flex: 1 1 100%`), category row scrolls horizontally, grid drops to **1 column** (`≤400px`), modal becomes bottom sheet with safe areas — solid.

- **D-12 · MEDIUM — overflow is masked, not prevented:** `index.html:111,114` `html,body { overflow-x: hidden }`. This hides real horizontal overflow instead of fixing it (bundle `#root` also had `width:1126px` until inline neutralizes it). **Fix:** keep the guard but re-test at 360/320 with devtools "overflow" highlighting once per release; prefer `max-width:100%` on children.
- **D-13 · MEDIUM — touch targets < 44px (CODE_QUALITY §4 violation):**
  - `.game-card__play { min-height: 36px !important }` — `index.html:289` — overrides the Phase-4 44px rule. Primary CTA of every card.
  - `.theme-toggle` `42×42` — `index.html:426-427`, shrinks to **`38×38`** at ≤480px — `index.html:557-558`.
  - `.ux-net-banner__dismiss` `min 28px` — `index.html:1202-1203`.
  - (Passing, for the record: fav 44, close 44, search-clear 44 via `min-width`, chips/pills `min-height:44px`, proxy/random 44/48.)
  **Fix:** play → 44px; theme-toggle → 44×44 both tiers; banner dismiss → 44px hit area (visual × can stay small inside).
- **D-14 · MEDIUM — tag chips are 44×44 squares of 8.8px text.** `.game-card__tag` `min-width:44px; min-height:44px; font-size:0.55rem; padding:1px 5px` (`index.html:246-252`) — a 2-tag card ("2p", "coop") renders two nearly-square pills taller than the text needs, stacking two rows and inflating card height; at `≤400px` single-column this makes cards ragged.
  **Fix:** `min-width` → drop (keep `min-height:44px` for the target), font → `0.7rem`, `padding: 0 12px`.
- **D-15 · LOW — hidden horizontal scrollers have no affordance:** `.category-filter`, `.ux-tag-filter`, `.ux-recent` all `scrollbar-width:none` + `overflow-x:auto` at mobile (`index.html` UX section). Content past the right edge is invisible with no visual cue. **Fix:** edge fade mask (`mask-image: linear-gradient(90deg,#000 85%,transparent)`) or keep a thin scrollbar.
- **D-16 · LOW — bottom-corner fixed buttons:** Random (left, `index.html:454`) + Proxy (right, `index.html:64`) both sit on the bottom safe area; at 360px they consume ~50% of the bottom row each and can overlap long card content; Random's label has no `white-space:nowrap` so the pill can wrap to two lines. ≤400px caps it at `max-width: calc(50vw - 1rem)` — good. **Fix:** add `white-space:nowrap` + slightly smaller label at ≤480.
- **D-17 · LOW — `will-change: transform` on every `.game-card`** (`index.html:807`) — 118 persistent compositor layers on a low-end Chromebook target. **Fix:** remove (hover transition doesn't need it).

### Broken thumbnails / icons

Evidence: `games.json` icon fields vs `assets/thumbs/` (88 files) vs `GAME_ICONS`/`CATEGORY_ICONS` in `portal-ux.js` vs `icons.svg` sprite ids; all 118 `games.json` urls verified resolvable: `git cat-file -e HEAD:<url>` for every entry → **0 missing, 0 duplicate ids** (PASS on link integrity).

- **D-18 · MEDIUM — three games get the *wrong* fallback icon.** `CATEGORY_ICONS` (`assets/portal-ux.js`, category fallback map) has entries for `action, classic, sports, strategy, puzzle, riddle, story, simulation, multiplayer` but **not `arcade`, `word`, `idle`**; `getGameIcon()` then falls through to `CATEGORY_ICONS['classic']` (paddle-and-ball). The three affected tiles: **Neon Snake, Neon Breakout, Neon Flappy** (cat=`arcade`, no thumb file, no specific icon) render a *paddle* icon.
  **Fix:** add `arcade`, `word`, `idle` icons to `CATEGORY_ICONS` — this is `portal-ux.js` (authored), listed below but flagged as beyond CSS-only scope. CSS-only mitigation: none meaningful.
- **D-19 · MEDIUM — `games.json.icon` is effectively dead but still rendered (flash + mixed icon systems).** 110/118 entries are `''`; 8 are emoji (`⚔️` ×7 Fireboy variants, `🌍` GeoGuesser). The bundle renders `e.icon` as text into `.game-card__icon` immediately; ~80ms later the MutationObserver in `portal-ux.js` replaces it with an `<img>` (103 games) or SVG (15 games). Result: brief empty/emoji thumbs (emoji→SVG swap for 8 games), and `icon` references nothing — `icons.svg` contains only 6 **social** symbols (`github-icon` etc.) and `grep icons.svg` finds **no references anywhere in the portal** (dead file), while `favicon.svg` is properly linked (`index.html:5`).
  **Fix:** CSS-only guard in `index.html`: `.game-card__icon:not(:has(>svg)):not(:has(>img)) { visibility:hidden }` (or `font-size:0`) to kill the flash; separately decide the schema fate of `icon` (document it as emoji-only or drop rendering).
- **D-20 · LOW — 15 of 118 games have no real thumbnail art** (88 slugs cover 103 titles via shared original/hacked art): the 7 non-base Fireboy variants, GeoGuesser, Merge Cats Defender(+Hacked), Neon Snake/Breakout/Flappy/Boss Rush, Orbit Collector → they fall back to white-line category SVGs while everything else shows photos/art: visually inconsistent row. **Fix:** add thumbs for these 15 (asset work, `assets/thumbs/`, plus 15 `THUMBS` entries) — non-CSS scope.

### Dead tiles / category accuracy

- **D-21 · LOW — category mislabels (search/filter IA):** `Wordle` is `riddle` while a `word` category exists (`Hangman` only) — Wordle under "Riddle" and not under "Word"; `Typing Speed` is `arcade` (it's a word/typing skill); sibling pairs diverge: `Subway Surfers` = `action` vs `Subway Surfers Hacked` = `arcade`, `Doodle Jump` = `action` vs `Doodle Jump Hacked` = `arcade` — the Hacked clones filter into a different bucket than their originals; `House of Hazards` is the sole `multiplayer` entry (primarily single-player minigames) and `GeoGuesser` (featured) sits in `puzzle` though it is geography/travel.
  **Fix:** `games.json` edits (Wordle→word, Typing Speed→word, align Hacked siblings to originals' cat). Note `games.json` is data, allowed outside the CSS-only rule but flag for Phase 3 content pass.
- **D-22 · LOW — featured grid orphan row:** 5 featured games (`Ovo, Run 3, Tetris, Minesweeper, GeoGuesser`) in `.bento-grid__featured { repeat(2,1fr) }` (`assets/index-CUsUGgbt.css:40`) → last row has 1 card + a hole. **Fix (CSS-only):** `.bento-grid__featured > :last-child:nth-child(odd) { grid-column: 1 / -1; }` (or curate to 4/6 featured in `games.json`).
- **D-23 · LOW — dead modal layer (code, but shows up as dead styling surface):** `portal-ux.js initCardNewTab()` intercepts every `.game-card` click in capture phase (`preventDefault + stopImmediatePropagation`) and opens the game in a new tab — the bundle's `.game-modal` iframe dialog can therefore **never open** from the grid. Yet the modal carries: ~120 lines of inline CSS (§11 + Phase-4 bottom-sheet block + bundle `.game-modal*` rules), `addModalControls/addModalDialogSemantics/addModalLoadingState/trapModalFocus/Esc` machinery (~150 lines in portal-ux.js), plus `.game-modal__open` styles. If the interception ever misses (future React handler registered on a subtree before document, etc.), users land in an undocumented modal.
  **Fix:** either delete the modal styling/machinery in Phase 3, or keep the modal as the in-site play surface and drop the new-tab interception — decide one. (Deleting = large but safe CSS win.)
- **D-24 · LOW — `storage/js/cloak.js` vestigial tags:** 10 game entry pages load `../../storage/js/cloak.js` (Chess, CutTheRope, DogeMiner, FancyPantsAdventure3, GeometryDashLite, HouseOfHazards, SubwaySurfers{,Hacked}, ThumbFighter, Vex7). The file exists in git (skip-worktree locally) and is a deliberate no-op (`/* no-op cloak (offline-first) */`) — no 404, no external load. Jetpack Joyride already removed its tag with an explanatory comment. **Fix:** remove the tags in the same game-side cleanup as D-18's cohort (cosmetic).

### Keyboard / a11y

- **PASS items:** skip-link present in markup (`index.html:1613`) *and* re-ensured by JS (`portal-ux.js ensureSkipLink()`), targets `#main-content` (JS creates `<main id=main-content>` if the bundle lacks it); one consistent focus language (`outline: 2px solid #06b6d4` across cards/chips/search/close/skip/proxy — sprint block + Phase-4 blocks agree); Esc closes the game modal (`portal-ux` Esc → `.game-modal__close`), clears search (two handlers: debounced reset + fuzzy reset), closes the detail dialog (`trapDetailFocus`); arrows/Home/End move between cards, Enter/Space opens, `/` focuses search, `i` opens info; focus trap + focus restore to opener on close (`syncModal`/`closeDetailPanel`); `aria-live` result counter + loading status; `role=dialog aria-modal aria-labelledby` set correctly; favorites/recents/sort all crash-guarded.
- **D-25 · MEDIUM — nested interactive elements inside `role="button"`:** `applyCardMetadata()` sets each `.game-card` to `role="button"` + `tabindex="0"`, but every card contains real `<button>`s (favorite star, info button, tag filter chips, play link). Screen readers/AT flatten or misreport this (button inside button).
  **Fix (needs portal-ux.js):** drop `role="button"` on the card (keep `tabindex`, `aria-keyshortcuts`, `aria-label`, and the JS Enter handler), or move `role=button` semantics onto the title only.
- **D-26 · LOW — undocumented shortcuts:** `/` (search) and `i` (info) exist but nothing on-page says so (games must document controls on-page per CODE_QUALITY §3; portal UX held to the same spirit). **Fix:** `placeholder="Search games  ( / )"` on the search input (CSS can't do this — bundle owns the placeholder; alternatively a footer hint line in `index.html`, which is in scope).
- **D-27 · LOW — `ux-net-banner` (offline banner, `z-index:1002`) overlays the theme toggle (`z-index:1000`) at the top edge when offline.** **Fix:** `top` offset when visible, or lower z-index below the toggle.

---

# PART 3 — PRIORITIZED FIX LIST (Phase 3 UI polish)

Scope legend: **[CSS/HTML]** = `index.html` + `assets/index-CUsUGgbt.css` only (the allowed Phase-3 surface). **[+ux]** = also needs `assets/portal-ux.js` (authored, unminified — please confirm scope). **[game]** = needs `Games/…` or `games.json` (separate track).

### P0 — security, must fix before next push (not "polish", tracked here so Phase 3 doesn't ship around them)
1. **[HTML] Remove portal gtag block** — `index.html:1603-1610` (CRITICAL, Check 1b.1). Delete the `<script async src=gtag…>` + config script.
2. **[game] Strip gtag from** `Games/SubwaySurfers/subwaysurfers/index.html`, `Games/SubwaySurfersHacked/subwaysurfers/index.html`, `Games/_emulatorjs/data/localization/Translate.html` (HIGH).
3. **[game] Neutralize `_emulatorjs/data/emulator.js:233` raw.githack fetch** (HIGH, supply chain) and vendor CookieClicker's PayPal images locally, drop the tracking pixel (MEDIUM).

### P1 — a11y + contrast (all **[CSS/HTML]**)
4. Touch targets ≥44px: `.game-card__play` 36→44 (`index.html:289`), `.theme-toggle` 42/38→44 (`:426,557`), banner dismiss 28→44 hit area (`:1202`). *(D-13)*
5. White-on-cyan → dark-on-cyan `#08252b`: `.skip-link`, `.ux-clear-filters`, `.ux-tag-filter__pill[aria-pressed=true]`, `.ux-detail__play`. *(D-8)*
6. Darken failing category badge fills (puzzle `#ea580c`, classic `#0d9488`, riddle/simulation `#0891b2`, action `#e63946`) in both `.game-card__category` and `.ux-detail__cat`; badge/tag font ≥0.7rem. *(D-9, D-2)*
7. Featured-grid orphan rule: `.bento-grid__featured > :last-child:nth-child(odd){grid-column:1/-1}`. *(D-22)*

### P2 — structure & dead weight (**[CSS/HTML]**)
8. Consolidate the three style layers into one authored block; delete duplicates: 3rd `.game-card--featured::after`, 2nd glow-kill, duplicate reduced-motion, duplicate modal safe-area, dead bundle-layer featured/thumb gradients. *(D-5, D-10)*
9. Unify radius scale (controls 999 / cards 20 / dialogs 16 / badges 6) and remove the self-contradicting 999→6px pill rules. *(D-6)*
10. Type hierarchy: logo → 1.6rem; `.ux-detail__title`/`.game-modal__title` ≤1.35rem; letter-spacing roles (3 values). *(D-1, D-3)*
11. Kill icon flash: `.game-card__icon:not(:has(>svg)):not(:has(>img)){visibility:hidden}` (with `@supports` guard). *(D-19)*
12. Remove `will-change:transform` from `.game-card` (`index.html:807`); add `white-space:nowrap` to `.random-game-btn`. *(D-17, D-16)*
13. Decide + delete the dead `.game-modal*` styling (after resolving D-23 direction); fix the wrong comment "1024/768/375" → actual breakpoints; fix `theme-color` on light mode if scope allows. *(D-23, D-5, D-11)*

### P3 — authored-JS + data (needs scope beyond CSS; schedule or defer explicitly)
14. **[+ux]** Add `arcade`/`word`/`idle` to `CATEGORY_ICONS` (fixes the 3 wrong Neon tiles). *(D-18)*
15. **[+ux]** Drop `role="button"` from cards (keep tabindex/Enter); document `/` and `i` hints; net-banner z-index. *(D-25, D-26, D-27)*
16. **[game/data]** `games.json` category pass (Wordle→word, Typing Speed→word, align Hacked siblings, revisit GeoGuesser/House of Hazards); add 15 missing thumbs; decide `icon` field fate; remove `cloak.js` tags. *(D-21, D-20, D-19, D-24)*
17. **[game]** Namespacing collisions: `__c2save_` (GeometryRash↔Ovo), `qwop_best` (QWOP↔QwopRemake), decide original↔hacked save sharing policy. *(Check 3)*

**Verification for every fix above:** `python3 -c "import json;…"` catalog parse + per-url `git cat-file -e`, `grep -rE 'https?://' index.html assets/` (must return only expected links after P0), `node --check assets/portal-ux.js`, and a 360px + keyboard-only pass (skip-link → arrows → Enter → Esc) per CODE_QUALITY §7.
