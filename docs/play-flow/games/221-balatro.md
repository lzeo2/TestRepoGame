# Balatro — play-flow audit (batch 1)

- Identity: catalog id 221, registered. `Games/Balatro/`, entry
  `Games/Balatro/index.html` (blob `8ad822e5059e5ab6ac355c591b65706432227e2a`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 3 files / 5,062,742 B.
  `CREDITS.md` present (blob `582c093c`, not read).
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above, 730 B), read fully. Shared EmulatorJS wrapper:
  `EJS_player = "#game"`, `EJS_core = "gba"`, `EJS_startOnLoaded = true`,
  `EJS_pathtodata = "../_emulatorjs/data/"`,
  `EJS_gameUrl = "balatro-gba-0.2.2.gba"`, then `../_emulatorjs/data/loader.js`.
- `balatro-gba-0.2.2.gba` (blob `7461b0a45d21099283459a3699e52930f4b8d293`)
  is the ROM binary: **not inspected**.
- Held: `Games/_emulatorjs/` shared runtime (outside assignment directory);
  `CREDITS.md`.

## Flow (wrapper visible; engine UNKNOWN)

- Boot: `EJS_startOnLoaded = true` → EmulatorJS mounts the GBA core in `#game`
  and loads the ROM. Any title/menu is rendered by the ROM or emulator shell.
- Start/setup, input, core loop, score/progression, win/lose, restart:
  **UNKNOWN pending engine/runtime review.** This is a compiled ROM; no game
  rules, animation, controls or progression may be inferred from the title.
  Emulator control mapping lives in the held shared runtime.

## UI bloat: UNKNOWN

- Authored wrapper: NONE — one `#game` div, no copy, no popups.
- Emulator shell overlays (play/fullscreen/save-state menus): inventory belongs
  to the `_emulatorjs` review, not performed here.

## Popups / modals

- None authored in `index.html`.

## Animation / simulation

- Opaque (GBA core). No loop code in this directory; do not credit the
  wrapper with the emulator's frame pumping.

## Findings

- No wrapper defects found. Standing note: any playable/progression claim
  needs an emulator runtime check plus ROM-level review, which this report
  does not make.

## Recommended playable view

Nothing authored to trim. Keep full-viewport `#game`; shell-level decisions
belong to the shared EmulatorJS review.
