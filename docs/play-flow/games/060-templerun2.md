# Play flow audit: Temple Run 2 (id 60)

## Identity / baseline

- Registered `games.json` id 60, url `Games/TempleRun2/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (120 files, 26,868,963 bytes).
- Maintenance document basename: `docs/maintenance/games/060-templerun2.md`.
- Engine class: compiled webpack/Babylon.js bundle (`bundle_original.js`, 15,348,548 B, minified). Engine mechanics **UNKNOWN** pending engine/runtime review.

## Source inspected

- `Games/TempleRun2/index.html` blob `9c0ecff68b737179d8e1fdf1b4479e5af2f9cefd` read completely (154 lines): attribution comment (Babylon.js port vendored from `deploythings123123123/seraph`, commit `ae2fcc6`, Poki/gtag/tab-cloak removed), offline guard (XHR/fetch hook regex `poki\.com|babylonjs\.com|unpkg\.com|typekit\.net|googletagmanager\.com|google-analytics\.com` -> `json/null.json`), `#loader` with spinner/h1/`p.controls` (`Swipe / drag to turn, jump and slide - arrow keys on desktop`), `poki-noop.js`, `bundle_original.js` (deferred), loader-hiding poller (`document.querySelector("canvas") || tries++ > 120` at 250 ms, max 30 s).
- `git ls-tree -r`: `global.css` `b0aaeced...`, `poki-noop.js` `d0270ec2...`, `fonts/temple-run-small-caps.woff2`, local `assets/` (glb tracks, textures, `.ogg` audio, draco decoder), `json/null.json`, plus large webp/jpg splash images.
- Held: `bundle_original.js` (15.3 MB minified webpack bundle) and `772.bundle_original.js` (3,337 B) not read; `global.css` (2,344 B) not read beyond existence. Game mechanics, menus and popups inside the bundle are **UNKNOWN**.

## Flow (wrapper only; engine UNKNOWN)

- Boot: `#loader` (spinner, title, control hint) shown until the poller sees a `<canvas>` (or 30 s timeout, after which the loader hides even on failure - can mask a broken boot).
- Start/setup/input/core loop: engine-owned, **UNKNOWN**. Wrapper only documents swipe/arrow control hint text.
- Score/progression/win/lose/restart: **UNKNOWN**; do not infer runner progression, coin/mission systems or death states from the title.
- Restart/exit: **UNKNOWN** (engine menu).

## UI bloat classification: MILD (wrapper) / UNKNOWN (engine)

- `#loader` is a genuine one-time loading state with control text (keep).
- Large decorative webp/jpg/png files at tree root (e.g. `f56ee7e855...webp` 371 KB, `148fa1b64d...webp` 452 KB) are loaded by the engine/menu as art, not wrapper chrome; classification of engine menus **UNKNOWN**.
- Wrapper has no popups/nags. Engine popups **UNKNOWN**.

## Animation / simulation

- Renderer/animation inside the Babylon.js bundle: **opaque/held**. Do not conflate Babylon's RAF with any model animation; no claims made.

## Findings

1. MEDIUM - `index.html` loader poller hides `#loader` after `tries++ > 120` regardless of boot success; a failed engine start shows an empty black page for ~30 s then "success". Fix: keep loader until canvas exists, and show a retry/error line on timeout instead of hiding unconditionally.
2. LOW - Control hint duplicates in `#loader p.controls` and attribution comment; single one-time help is enough, keep it in the loader (it disappears with it).
3. Held - whether the bundle triggers site-lock/ads beyond the guarded hosts cannot be confirmed without inspecting 15.3 MB minified code; offline guard covers listed hosts only.

## Recommended playable view

Engine canvas + native HUD/touch gestures untouched; wrapper keeps `#loader` one-time hint; no wrapper decorative padding to add or remove. Engine menu/offer popups must be inventoried at runtime before any change.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load of `Games/TempleRun2/index.html`, confirm canvas appears < 30 s, loader hides, swipe/keys respond, no external requests (guard log only).
