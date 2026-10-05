# Mario Kart Super Circuit play-flow audit (batch 4)

Identity: registered id 117, entry `Games/MarioKartSuperCircuit/index.html`, entry blob `a356b9c35025bdde7992df1f3b45bb5e4d41c0f2`, tree `0239f5974dcc5719a33827d93c35b5e8d1fee6b1`, 2 files, 4,195,058 bytes (entry + `mario-cart-super-circuit.gba`, blob `2ac3e64725b4b4e3bfb99a4b60184c6a55ebd456`). Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/117-mariokartsupercircuit.md` read for orientation; entry re-inspected directly.

Validation status: **CODE-REVIEW ONLY**. No emulator or ROM run this worker. Historical playtest r8 receipts are not this run's test.

## Source inspected

- `Games/MarioKartSuperCircuit/index.html` (blob above, 754 bytes): grep of key lines verified `EJS_player = "#game"`, `EJS_core = "gba"`, `EJS_color = "#000000"`, `EJS_startOnLoaded = true`, `EJS_pathtodata = "../_emulatorjs/data/"`, `EJS_gameUrl = "mario-cart-super-circuit.gba"`, then `<script src="../_emulatorjs/data/loader.js">`.
- Tracked GBA ROM file inventoried by `git ls-tree` (binary, not inspected).

Held: EmulatorJS runtime, mgba packed core, minified emulator and all ROM/racing logic. Engine mechanics **UNKNOWN** pending engine/runtime review.

## Flow (visible wrapper vs opaque engine)

- Boot: wrapper configures EmulatorJS only; shared `loader.js` fetches `emulator.min.js`/`emulator.min.css` and constructs `window.EJS_emulator`.
- Start/setup, input, core loop, score/progression, win/lose, in-game retry: all ROM/emulator-owned, **UNKNOWN**. The entry contains no control mapping, HUD or outcome text. Do not infer drift/item/acceleration keys from franchise knowledge; default GBA bindings live in shared runtime settings (orientation).
- Restart: shared EmulatorJS toolbar only (held). Wrapper authors none.

## UI bloat classification: NONE (wrapper scope)

Only the full-viewport `#game` container and black background. No text, cards, buttons or popups authored. Emulator UI is shared surface, held.

## Popup/modal inventory

None authored. Emulator dialogs held.

## Animation/simulation

None authored; all simulation opaque (mgba + ROM), held. No RAF claim made.

## Findings

- HIGH, rights hold: `EJS_gameUrl` points at a commercial ROM with no LICENSE/source pin or redistribution grant in this 2-file tree. Owner decision; no removal or relabel by this report.
- MEDIUM: shared loader lacks onerror rejection (orientation), leaving a silent blank shell on blocked assets; shared-runtime root fix.
- LOW: catalog/instructions risk: no in-shell controls help exists. Any future help must quote real emulator settings.
- No fix needed: wrapper is minimal; exact cart-spelled ROM filename must be preserved.

## Recommended playable view

Preserve full-viewport container plus emulator-rendered virtual controls and toolbar. Add nothing decorative. A one-time acknowledged controls help, if added, must be sourced from verified emulator bindings.

## Smallest browser check still needed

Local serve with network blocked, confirm ROM boots to menu, start a race with documented keys, confirm frame changes, exercise toolbar restart and one save-state export. 320px portrait/landscape check follows. Full catalog smoke is Main's separate gate.
