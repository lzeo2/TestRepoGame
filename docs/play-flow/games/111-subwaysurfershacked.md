# Play flow audit: Subway Surfers Hacked (id 111)

## Identity / baseline

- Registered in `games.json` id 111, url `Games/SubwaySurfersHacked/index.html` (verified against catalog, 116 entries).
- Source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (21 files, 144,518,418 bytes).
- Maintenance document basename: `docs/maintenance/games/111-subwaysurfershacked.md`.
- Engine class: compiled Unity WebGL (WASM). Engine mechanics **UNKNOWN** pending engine/runtime review; only wrapper evidence below.

## Source inspected

- `Games/SubwaySurfersHacked/index.html` blob `a267aec1330b6040bf407c3045b54bc3f543b079` read completely (243 lines): inline offline guard (XHR/fetch hook regex `kiloo(-games)?\.com|sybogames|...|poki\.com`), hack override IIFE, `UnityLoader.instantiate("gameContainer", "Build/SanFrancisco/SanFrancisco.json", ...)`, `UnityProgress`, `hideLoader`, `my4399UnityModule` getter shim, `#loader` markup, `#hackBadge` div.
- `git ls-tree -r` for the full tree: `Build/SanFrancisco/*` (`.data.unityweb` 27,979,216 B, `.wasm.code.unityweb` 25,765,359 B, `.wasm.framework.unityweb`), `Build/UnityLoader.js` `187ef642...`, `js/poki-noop.js` `076960db...`, duplicated `subwaysurfers/` copy of the same build, `subwaysurfers/poki-sdk*.js`, `4399.z.js`.
- Held: `Build/UnityLoader.js` (237 KB minified), `SanFrancisco.wasm.*` (compiled), `subwaysurfers/*` duplicates and `poki-sdk-core-v2.234.2.js` (214 KB) not read. Mechanic claims (lane movement, scoring, death) cannot be derived from the wrapper.

## Flow (wrapper only; engine UNKNOWN)

- Boot: `#loader` spinner + progress bar, `UnityLoader.instantiate` with `onProgress: UnityProgress`, `onRuntimeInitialized: hideLoader`. Engine load failure path not visible in wrapper.
- Start/setup: no authored start screen; once the Unity runtime boots the game canvas owns the session. Menu, runs, mission/daily-quest logic live in the compiled build (**UNKNOWN**).
- Input: wrapper text `Steer, jump and roll - swipe/drag or arrow keys.` (`#loader p.controls`) is the only control documentation; actual input handling is in WASM (**UNKNOWN**).
- Score/progression: wrapper injects `gameInstance.SendMessage('ScoreManager', 'SetCoins', 999999)` every 2 s for 60 s and rewrites `SendMessage` so any method matching `/coin|score|collect/i` gets `val = 999999`; a second layer swallows methods matching `/crash|hit|die|death|gameover|life|damage|obstacle/i` (invincibility). Beyond these hooks, run progression is **UNKNOWN**.
- Win/lose: endless runner; engine death/run-over state **UNKNOWN** (crash messages are intercepted by the hack layer, so wrapper-visible lose signalling is intentionally suppressed).
- Restart/exit: **UNKNOWN** (engine menu).

## UI bloat classification: MILD

- Persistent: `#hackBadge` fixed top-right red "HACKED" badge (`pointer-events:none`, z-index 9999) is decorative, persistent over all engine UI.
- `#loader` (h1 "Subway Surfers", spinner, `.progress`, `.controls` line) is a genuine loading state, removed by `hideLoader`.
- No popup/modal inventory possible from wrapper: engine popups (missions, offers, pause) live in the compiled build, **UNKNOWN**. Wrapper adds no recurring nag; offline guard only logs `--fx--SubwaySurfers offline route--`.

## Animation / simulation

- Renderer RAF is inside `UnityLoader.js` / WASM (**UNKNOWN**); wrapper adds only CSS `spinner-spin` keyframes on `#loader .spinner`, which is a loading indicator, not game animation.

## Findings

1. MEDIUM - `index.html` hack layer: `_coinTimer` stops after `setTimeout(..., 60000)`, so the forced 999999 coin display can drift after the first minute (coins spent or UI reset are no longer re-forced). Fix: re-apply on SendMessage coin traffic instead of a wall-clock timer, or document the decay; do not blanket-hide the HUD.
2. LOW - `subwaysurfers/` duplicates the whole `Build/` (two copies of ~54 MB wasm/data in the tree). Evidence-first check of consumers is required before any removal; no removal recommended in this audit.
3. LOW - `#hackBadge` is a decorative persistent overlay; in a playable view it can be dropped while keeping `#loader` controls text and engine HUD untouched.

## Recommended playable view

Keep engine canvas, `#loader` control hint (then hide loader), native HUD/actions/touch. Remove `#hackBadge` decoration only. Instructions already appear once in `#loader`; any future help should be one-time acknowledged, no recurring popups (engine popups **UNKNOWN** pending runtime review).

## Validation

CODE-REVIEW ONLY. No browser run performed. Smallest needed check: load `Games/SubwaySurfersHacked/index.html` over a bounded local server, confirm Unity boots offline, HUD renders, run + restart works, and no network leaves the origin (offline guard logs only).
