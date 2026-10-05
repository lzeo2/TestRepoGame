# Play flow audit: 10 Minutes Till Dawn (id 56)

## Identity / baseline

- Registered `games.json` id 56, url `Games/TenMinutesTillDawn/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (7 files, 50,485,494 bytes).
- Maintenance document basename: `docs/maintenance/games/056-tenminutestilldawn.md`.
- Engine class: compiled Unity WebGL (WASM). Engine mechanics **UNKNOWN** pending engine/runtime review.

## Source inspected

- `Games/TenMinutesTillDawn/index.html` blob `df718c04d022ecf0c2fbfc3caae3347b900b08ef` read completely (84 lines): `UnityLoader.instantiate("gameContainer", "Build/10MinutesTillDawnWebGL.json")`, `scaleToFit` derived from `JSON.parse("")` -> false in practice (`!!JSON.parse("")` throws -> catch -> `scaleToFit = true`), `onResize()` letterboxing with 675/1200 aspect, `body onload="onResize();"`, `#gameContainer[data-pixelated="true"]` canvas image-rendering rules.
- `git ls-tree -r`: `Build/10MinutesTillDawnWebGL.{json}` `0d0d38ac...` (593 B), `.data.unityweb` 27,343,110 B, `.wasm.code.unityweb` 22,479,428 B, `.wasm.framework.unityweb` 498,105 B, `Build/UnityLoader.js` `c5b293ba...` (159,436 B), `icon.png`.
- Held: `UnityLoader.js` (minified), `10MinutesTillDawnWebGL.json` contents not dumped (config), compiled wasm/data blobs not inspected. All gameplay logic **UNKNOWN**.

## Flow (wrapper only; engine UNKNOWN)

- Boot: `UnityLoader.instantiate` with no `onProgress` callback - no wrapper loading indicator at all; `#gameContainer` starts empty, engine paints when ready.
- Start/setup/input/core loop: **UNKNOWN**. No controls text anywhere in the wrapper.
- Score/progression/win/lose/restart: **UNKNOWN**. Do not infer survival/wave/upgrade mechanics from the title.
- Resize behavior: `onResize()` letterboxes to a fixed 1200x675 aspect and re-centers; runs on load and window resize.

## UI bloat classification: NONE (wrapper) / UNKNOWN (engine)

- Wrapper has no headers, cards, popups or instructions; only the transparent `#gameContainer` on a black body. Engine HUD/menus **UNKNOWN**.
- No modal inventory possible from wrapper.

## Animation / simulation

- All model/render animation inside compiled Unity blobs: **opaque/held**. Wrapper performs only DOM resize math; no RAF, no object property updates.

## Findings

1. MEDIUM - No boot feedback: if the WASM build fails, the page is a black screen with no error or retry. Smallest fix: wrapper loader + error line in `index.html` (house pattern used by other Unity wrappers), not engine edits.
2. LOW - `scaleToFit` block tries `JSON.parse("")` as a config probe (always throws -> catch -> true); harmless but obscure dead configurability. Fix: set `scaleToFit = true` directly.
3. LOW - No control hint in wrapper; add one one-time line (e.g. in a loader) once controls are confirmed at runtime. Do not document controls from the title.

## Recommended playable view

Engine canvas + native HUD/touch kept as-is; add only a one-time loader/hint wrapper layer; no persistent description cards; no recurring popups added (engine popups **UNKNOWN** pending runtime review).

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, confirm build boots and letterboxes correctly on desktop and 360px width, capture start screen and record actual controls before documenting them.
