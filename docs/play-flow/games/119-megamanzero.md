# Mega Man Zero play-flow audit (batch 4)

Identity: registered id 119, entry `Games/MegaManZero/index.html`, entry blob `3ef232cbc6abe64ecb924261797731eca901b705`, tree `de516e20391333688273eed36b051ac602f1d41f`, 2 files, 3,675,568 bytes (entry + `megamanzero.zip`, blob `e4b0bc3cbaa340ead2c2ee2e0aa99608fa8ac9fc`). Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/119-megamanzero.md` read for orientation; entry re-inspected directly.

Validation status: **CODE-REVIEW ONLY**. No emulator or ROM run this worker. Historical R8 receipts are not this run's test.

## Source inspected

- `Games/MegaManZero/index.html` (blob above): full read. Content: `#game` div sized 100vw/100vh; globals `EJS_player="#game"`, `EJS_core="gba"`, `EJS_color="#000000"`, `EJS_startOnLoaded=true`, `EJS_pathtodata="../_emulatorjs/data/"`, `EJS_gameUrl="megamanzero.zip"`; loads `../_emulatorjs/data/loader.js`.
- ROM zip inventoried by `git ls-tree` (binary, not inspected).

Held: EmulatorJS runtime, mgba packed core, minified emulator, decompressor and all ROM content. Engine mechanics **UNKNOWN** pending engine/runtime review.

## Flow (visible wrapper vs opaque engine)

- Boot: wrapper-only configuration; shared loader builds `window.EJS_emulator`.
- Start/setup, input, core loop, score/progression, missions/win/lose, retry: all ROM/emulator-owned, **UNKNOWN**. No weapon, mission or completion logic exists in the entry. Do not document Z-saber actions or level outcomes from catalog copy.
- Restart: shared EmulatorJS toolbar (held); wrapper authors none.

## UI bloat classification: NONE (wrapper scope)

Empty full-viewport container only. No text, cards, buttons, popups or touch controls authored. Emulator-rendered UI is shared surface, held.

## Popup/modal inventory

None authored. Emulator dialogs held.

## Animation/simulation

None authored; simulation opaque (mgba + ROM), held. No RAF claim.

## Findings

- HIGH, rights hold: `EJS_gameUrl` ships a bundled ROM archive with no LICENSE/credits or redistribution evidence in this 2-file tree. Owner decision required; no removal or relabel by this report.
- MEDIUM: shared `data/loader.js` onerror gap (orientation): blocked assets can hang a blank shell silently. Shared-runtime root fix, not a per-game patch.
- MEDIUM: shared IndexedDB save/settings failure paths (orientation); resolve at shared persistence boundaries.
- No fix needed: wrapper markup is minimal and uses relative paths only.

## Recommended playable view

Preserve the full-viewport container and emulator-rendered controls/toolbar. Add no decorative layers. Any controls help must quote verified emulator bindings (orientation lists arrows/Enter/V/X/Z/S/A/Q/E defaults; confirm in Control Settings before publishing).

## Smallest browser check still needed

Local serve, network blocked, boot to ROM title menu, deliberate gameplay input with frame change, toolbar restart, save export/import, storage-denied reload. Full catalog smoke is Main's separate gate.
