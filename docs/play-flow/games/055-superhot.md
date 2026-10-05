# Play flow audit: Super Hot (id 55)

## Identity / baseline

- Registered `games.json` id 55, url `Games/Superhot/index.html` (verified; catalog has 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (8 files, 45,537,221 bytes).
- Maintenance document basename: `docs/maintenance/games/055-superhot.md`.
- Engine class: compiled Unity/Emscripten (emscripten-era build, gzipped `webgl.datagz` / `webgl.jsgz` / `webgl.memgz`). Engine mechanics **UNKNOWN** pending engine/runtime review.

## Source inspected

- `Games/Superhot/index.html` blob `3fdd1ae3a5271510d054dd200d7ebee17cc1aa34` read completely (30 lines): `#unityContainer` 960x600 with `canvas.emscripten#canvas`, `Module = { TOTAL_MEMORY: 268435456, dataUrl: "webgl.datagz", codeUrl: "webgl.jsgz", memUrl: "webgl.memgz" }`, `UnityLoader.js` + `main.js` script tags.
- `Games/Superhot/main.js` blob `7abf4838c659b23380988e2a167ae9dc0ec1fe59` read completely (4 lines): comment-only attribution (3kh0 fork credit, echo-the-coder); tab-cloak/analytics removed; no runtime code.
- `Games/Superhot/styles.css` blob `9395fc8bd074b1fad3bde15cfdd782e9e3f99f10` read completely (40 lines): `.webgl-content`, `.logo`/`.progress` loader styles, footer styles, trailing `* { background-color: #2C3547; }`.
- Held: `UnityLoader.js` (36,687 B minified), `webgl.jsgz` (23.4 MB), `webgl.datagz` (20.2 MB), `webgl.memgz` (1.6 MB). All game logic is inside compiled gzip blobs; not inspected.

## Flow (wrapper only; engine UNKNOWN)

- Boot: `Module` config points at local gz assets; `UnityLoader.js` drives fetch/instantiate. The `.logo` / `.progress` loader elements are present in markup with inline `display: none`, so no wrapper-visible loading feedback is guaranteed.
- Start/setup: **UNKNOWN** (engine menu).
- Input/core loop: **UNKNOWN**. Wrapper documents no controls; there is no control text anywhere in the wrapper.
- Score/progression/win/lose/restart: **UNKNOWN**. Do not infer SUPERHOT's time-move mechanic or any win/lose state from the title.

## UI bloat classification: NONE (wrapper) / UNKNOWN (engine)

- Wrapper contains only the canvas container; no authored popups, banners or description cards. `.logo`/`.progress` are genuine loader parts (currently hidden inline).
- Engine-side menus/HUD/popups **UNKNOWN**.

## Animation / simulation

- All rendering and model animation inside compiled `webgl.*` blobs, **UNKNOWN**. Wrapper defines no RAF or object updates; the CSS loader keyframes are absent (no animation in wrapper).

## Findings

1. MEDIUM - `styles.css` references `progressLogo.Light.png`, `progressEmpty/Full.Light.png`, `Dark` variants and `fullscreen.png` that are absent from the tree (only `hot.jpg`, `main.js`, `styles.css`, `UnityLoader.js`, `webgl.*` exist). Dead references; harmless only because `.logo`/`.progress` are `display:none`. Fix: strip the unused loader-image rules or restore the files; do not unhide them without the assets.
2. LOW - No loading or control feedback visible to the player before the engine paints; smallest fix is a static wrapper hint line (already the house pattern) added to the wrapper, not to the engine.
3. LOW - Trailing global `* { background-color: #2C3547; }` forces background on every element; scope it to `body`/`.webgl-content` to avoid fighting engine-created DOM.

## Recommended playable view

Canvas only, preserve engine HUD once it renders; remove nothing from the engine. Add a one-time control hint in the wrapper (currently missing) rather than persistent overlays; no recurring popups.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load of `Games/Superhot/index.html`, confirm the gz build boots, note any loader flash, capture start screen and controls visibility in a real browser.
