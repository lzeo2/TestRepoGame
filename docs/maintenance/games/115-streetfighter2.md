<!-- maintenance-game: Games/StreetFighter2 -->
# Street Fighter II maintenance

## Identity and status

Registered id **115**, category `action`, entry [index.html](../../../Games/StreetFighter2/index.html). Baseline `8c8a055`: two files, 8,389,317 bytes; entry blob `897300ce7bcebf0ee01b2ac2e69baaa5f8895750`. Existing ROM wrapper; rights pending, no runtime changes authorized.

## Implementation map

Entry creates `#game`, then sets EJS_player=`#game`, core=`gba`, color black, startOnLoaded=true, pathtodata=`../_emulatorjs/data/`, gameUrl=`Super Street Fighter II Turbo - Revival (USA).gba`. It loads shared loader.js. Loader selects emulator.min.js/min.css unless debug is explicitly enabled and constructs EJS_emulator from copied config. Readable emulator maps gba to mgba. This is the Revival GBA image, not the SNES game historical GAMES.md labels it as.

Source review coverage: complete entry, shared loader/storage and selected readable emulator core/restart anchors inspected. ROM, core binary, minified runtime and fighting-game engine were not fully human-reviewed; no native moveset/combos are inferred from title.

## Gameplay and controls

Wrapper has no game-specific start, moves, restart or keyboard tutorial. Emulator owns virtual gamepad and control settings; ROM owns menu/fight/outcome. Historical [playtest r7](../../audit_batches/playtest_r7.md) observed key delivery, advancing frames and emulator Restart. It does not establish exact attack mappings, two-player support or complete match/retry behavior. Document those only after source or actual native tutorial inspection.

## State and persistence

No wrapper storage key exists. Shared EJS_STORAGE is IndexedDB-backed with caller-defined database/store and reserved `?EJS_KEYS!` index. Exact game save identity/ROM battery behavior remains unresolved. Emulator Restart saves current save files then restarts through gameManager in reviewed non-netplay path; it is not a wipe. Entry config does not enable a netplay server or controller overrides.

## Dependencies and provenance

Local GBA image plus shared EmulatorJS data/core are required. No game-directory LICENSE, upstream revision or ROM grant is tracked. Shared runtime rights do not clear supplied commercial game bytes. Mirror/history existence is not permission. Keep path/name stable until rights and save migration are reviewed.

## Audit findings

- **HIGH**, entry EJS_gameUrl: unverified ROM redistribution rights are an owner release hold. No removal or alternative ROM authorized.
- **MEDIUM**, shared `loader.js`, loadScript/loadStyle: absent onerror rejection can strand loading promises and blank shell when resources fail. Fix shared boundary once under Main's ownership, not four copied wrapper catch blocks.
- **MEDIUM**, entry #game 100vh: no 100dvh fallback; browser chrome can clip controls. Reproduce portrait/landscape on actual mobile device before bounded sizing patch.
- **MEDIUM**, entry control documentation: no factual game-specific mapping is supplied. Read emulator settings/tutorial before adding persistent accessible help.

## Safe iteration

Wrapper CSS/help/error contract is the narrow patch surface. Preserve gba core/Revival identity, no ROM modification or generated/minified-engine editing. Coordinate shared-loader failures with every consumer and export state before renaming gameUrl.

## Verification

Actually run: Git entry/tree review; native **0**, screenshots **0**. Recommended supervisor-owned narrow checkout with shared runtime: confirm ROM/core local responses, menu selection, actual fight inputs, outcome/rematch, emulator pause/restart and save-state roundtrip. Test touch layout, fullscreen escape, audio and denied storage. Main owns full-catalog gate.

## Future outlook

Resolve ROM rights first, then accurate controls and loader error feedback. Later measure fighting input latency and mobile controller reachability. Defer multiplayer, ROM replacement and rebranding without source/owner authorization.
