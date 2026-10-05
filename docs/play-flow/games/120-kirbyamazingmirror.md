# Kirby Amazing Mirror play-flow audit (batch 4)

Identity: registered id 120, entry `Games/KirbyAmazingMirror/index.html`, entry blob `74b7a4a0ad7d7d634a5e53c5b3174f46897a3e35`, tree `0057c675893099120e3c4e8713822d1620473fe1`, 2 files, 7,090,963 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/120-kirbyamazingmirror.md` read for orientation; entry re-inspected directly.

Validation status: **CODE-REVIEW ONLY**. No emulator or ROM run by this worker.

## Source inspected

- `Games/KirbyAmazingMirror/index.html` (blob above, 719 bytes): full read. Content is exactly: `#game` div (100vw/100vh), globals `EJS_player="#game"`, `EJS_core="gba"`, `EJS_color="#000000"`, `EJS_startOnLoaded=true`, `EJS_pathtodata="../_emulatorjs/data/"`, `EJS_gameUrl="Kirby & the Amazing Mirror (Europe) (En,Fr,De,Es,It).zip"`, then `<script src="../_emulatorjs/data/loader.js">`.
- Second tracked file: `Games/KirbyAmazingMirror/Kirby & the Amazing Mirror (Europe) (En,Fr,De,Es,It).zip`, blob `167a1a32c74cf7f503a3ca007834a167e7d3` per `git ls-tree` (archive, binary, not inspected).

Held: the EmulatorJS runtime (`../_emulatorjs/data/`), the mgba packed core, the minified emulator and the ROM contents. Engine mechanics are **UNKNOWN** pending engine/runtime review.

## Flow (visible wrapper vs opaque engine)

- Boot: wrapper only configures EmulatorJS and loads shared `loader.js`. Visible shell is an empty black full-viewport container.
- Start/setup, input, core loop, score/progression, win/lose: all ROM/emulator-owned, **UNKNOWN**. No control mapping, HUD, or outcome screen exists in this entry's source; default GBA bindings live in the shared runtime (orientation only, not re-read here).
- Restart: belongs to the shared EmulatorJS toolbar (held). The wrapper authors no restart control.

## UI bloat classification: NONE (wrapper scope)

Only `#game` and inline reset CSS exist. No authored text, no cards, no popups, no touch controls. Emulator toolbar/UI is shared-runtime surface, held and not classified here.

## Popup/modal inventory

None authored. Any emulator dialogs (loading, settings, errors) are shared-runtime behavior, held.

## Animation/simulation

None authored. All rendering and simulation are opaque (mgba core + ROM), held. No RAF claim is made.

## Findings

- HIGH, rights hold: `EJS_gameUrl` ships a commercial ROM archive with no LICENSE/CR E DITS or redistribution evidence in this 2-file tree. Owner decision required; no removal or relabeling by this report.
- MEDIUM: shared `data/loader.js` attaches `onload` without `onerror` (orientation from manual, not re-read this run): a blocked asset can leave a blank shell with no feedback. Root fix belongs to the shared runtime owner.
- LOW: `EJS_gameUrl` contains spaces and `&`; URL resolution must keep the exact filename. No fix, just a rename warning.
- No fix needed: wrapper markup is minimal and honest.

## Recommended playable view

Preserve the full-viewport container and whatever controls the shared emulator renders (virtual pad, toolbar). No description cards or title overlays exist to remove. Any future controls help must be one-time acknowledged and sourced from real emulator settings, not franchise assumptions.

## Smallest browser check still needed

Serve the repo root locally, load the entry with network blocked, confirm the ROM boots to the title menu, press a documented key, confirm frame change, and exercise the emulator toolbar restart. Audio unlock and save export are follow-ups. Full catalog smoke remains a separate Main-owned gate.
