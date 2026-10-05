# Play flow audit: Volley Random (id 6)

## Identity / baseline

- Registered `games.json` id 6, url `Games/VolleyRandom/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (119 files, 6,474,431 bytes).
- Maintenance document basename: `docs/maintenance/games/006-volleyrandom.md`.
- Engine class: compiled Construct 3 export (`scripts/c3runtime.js` 593,825 B minified, `scripts/main.js` 60,921 B minified, `box2d.wasm` + `box2d.wasm.js`, `data.json` project data 193,133 B). Engine mechanics **UNKNOWN** pending engine/runtime review.

## Source inspected

- `Games/VolleyRandom/index.html` blob `e073d21c8285ea0d7b566496e5763c39547da1b7` read completely (38 lines): Construct 3 generator meta, `appmanifest.json` link, global keydown preventDefault for `[32,37,38,39,40]`, `#fb-root`, `box2d.wasm.js`, `scripts/supportcheck.js`, `scripts/offlineclient.js`, `scripts/main.js`, `scripts/register-sw.js`.
- `Games/VolleyRandom/scripts/register-sw.js` blob `f152b5ff...` read: `C3_RegisterSW` registers `sw.js`; `sw.js` blob `acdc27a9...` read: only `// No Service Worker` + `console.log("No Service Worker")` (registration is a no-op - good for static hosting).
- `Games/VolleyRandom/README.md` read: `# Volley-Random / Volley Random` (no provenance beyond title).
- `scripts/main.js` inspected partially (head ~200 lines equivalent, boot/input/DOM-handler region): C3 runtime bootstrap, worker creation with same-origin fetch, RAF tick chain (`Dc/nc/xf`), input listeners (pointer/keyboard/touch), `alert()` error paths (`[C3 runtime]` warnings, project-script failure alerts). `grep https?://` over `main.js`, `register-sw.js`, `offlineclient.js` found no remote loads (fetches are same-origin/data/blob).
- Held: `scripts/c3runtime.js` (593 KB minified), `box2d.wasm.js` (282 KB), `data.json` (project layout/events), `patch/**` (ad/analytics SDK copies) not read in full. Game rules, scoring, win/lose, menus are **UNKNOWN** from the wrapper.

## Flow (wrapper only; engine UNKNOWN)

- Boot: `supportcheck.js` -> `offlineclient.js` -> `main.js` (Construct runtime boot) -> `register-sw.js` (no-op SW). Loading/menus come from `data.json` project, **UNKNOWN**.
- Start/setup/input/core loop: **UNKNOWN**; the wrapper only blocks space/arrow scrolling. Actual controls must be read from the runtime, not assumed from the title.
- Score/progression/win/lose/restart: **UNKNOWN**; do not invent match rules, AI or set scoring from the title.
- Resize: `main.js` uses `window.innerWidth/innerHeight` and canvas `update-size` handler (observed in boot source).

## UI bloat classification: UNKNOWN (engine) / NONE (wrapper)

- Wrapper has no visible chrome besides `noscript` message (`#notSupportedWrap` "This content requires JavaScript", genuine fallback).
- Popup/modal inventory: engine menus **UNKNOWN**. However tracked but unreferenced third-party files exist: `js/analytics_games235.js`, `js/analytics_ubg_v1_4.js`, `js/ubg235_client_v1_1.js`, `patch/js/gm-sdk.js`, `patch/google/ima3-o.js` (647 KB IMA ads), `patch/cdn/*` vendored bootstrap/jquery/fontawesome. `git grep -l "analytics_games235"` and `"ubg235_client"` returned no referencing file -> **not loaded by index/boot path**; they are dormant bundled ad-tech, an offline-policy finding (rule 5/6), not runtime popups.

## Animation / simulation

- C3 runtime drives RAF (`requestAnimationFrame` chain in `main.js`, observed `Dc/nc/xf` around `window.za` classes) and Box2D wasm physics (`box2d.wasm`). Model animation (players, ball) lives in the project events: **opaque/held**; do not conflate the RAF renderer with model animation.

## Findings

1. MEDIUM - Dormant ad/analytics SDK files tracked under `Games/VolleyRandom/patch/**` and `js/analytics_*` (IMA ads, GM SDK, GameDistribution/GameSnacks scripts). Not referenced by the boot path today, but present as offline-policy debt. Evidence-first: confirm zero consumers (`git grep`) before any deletion ticket; do not delete in this audit.
2. LOW - Title `Volley Random - unblocked786 GameDistribution` carries upstream portal branding; house copy would drop "unblocked786 GameDistribution" (report only; no edits in this run).
3. LOW - Global keydown preventDefault for space/arrows applies to the whole document; safe today (no other focusable wrapper UI) but will trap keyboard users if wrapper controls are ever added.

## Recommended playable view

Keep engine canvas, HUD, touch controls and menu (genuine game menu). Remove nothing until a runtime inventory exists. Instructions: none in wrapper - once controls are confirmed at runtime, put them in a one-time acknowledged help with optional reopen; no recurring nags/ads.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, confirm Construct boots with zero external requests, capture menu/start/match/game-over/restart, and verify `patch/**` never executes.
