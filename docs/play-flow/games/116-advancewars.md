# Advance Wars — play-flow audit (batch 1)

- Identity: catalog id 116, registered. `Games/AdvanceWars/`, entry
  `Games/AdvanceWars/index.html` (blob `4f76157960c9f8476b4a762d3665a247f525aa84`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 2 files / 2,324,207 B.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above, 730 B), read fully. The wrapper is the shared
  EmulatorJS launcher:
  `EJS_player = "#game"`, `EJS_core = "gba"`, `EJS_startOnLoaded = true`,
  `EJS_pathtodata = "../_emulatorjs/data/"`, `EJS_gameUrl = "advance-wars.zip"`,
  then `<script src="../_emulatorjs/data/loader.js">`. Single `#game` div,
  viewport-fit CSS only.
- `advance-wars.zip` (blob `b4cd2b77620af2ef18300e7820a2f395f88988c0`) is the
  GBA ROM archive: binary, **not inspected**.
- Held: `Games/_emulatorjs/` shared runtime (loader, cores, UI) is outside this
  assignment directory and was not inspected.

## Flow (wrapper visible; engine UNKNOWN)

- Boot: `EJS_startOnLoaded = true` → EmulatorJS loads `advance-wars.zip` into
  the GBA core inside `#game`. Any start/menu screen comes from the ROM or the
  EmulatorJS shell, both **not source-inspected here**.
- Start/setup, input, core loop, score/damage/progression, win/lose, restart:
  **UNKNOWN pending engine/runtime review.** The GBA ROM is a compiled binary;
  no controls, progression, animation or win/lose state may be inferred from
  the title. Emulator input mapping lives in the shared `_emulatorjs` runtime
  (held).

## UI bloat: UNKNOWN

- Wrapper itself: NONE (one `#game` container, no added copy, no popups).
- Emulator menus/overlays (play button, fullscreen, save states) are rendered
  by the shared runtime — inventory not performed in this batch.

## Popups / modals

- None authored in `index.html`. Emulator-runtime overlays held.

## Animation / simulation

- Rendered by the GBA core inside EmulatorJS — opaque. Nothing in this
  directory implements a game loop; do not credit the wrapper with the
  renderer RAF.

## Findings

- No wrapper defects found. The only note is the standing one: gameplay claims
  require an emulator runtime check plus ROM-level review, which this report
  does not make.

## Recommended playable view

No authored chrome to trim. Keep the full-viewport `#game` container; any
playable-view decision depends on the shared EmulatorJS shell review owned
elsewhere.
