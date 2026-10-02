<!-- maintenance-game: Games/DrMario -->
# Dr. Mario maintenance

## Identity and status

Registered id **114**, category `puzzle`, entry [index.html](../../../Games/DrMario/index.html). Baseline `8c8a055`: two files, 1,049,276 bytes; entry blob `bfe80903d12ca6f157452dfc444164665364c42a`. ROM rights remain pending. This task neither removes nor authorizes publication of the supplied game.

## Implementation map

Entry is a small EmulatorJS wrapper: `#game` occupies 100vw/100vh; globals set EJS_player, EJS_core=`gba`, color black, startOnLoaded=true, pathtodata=`../_emulatorjs/data/` and gameUrl=`Classic NES Series - Dr. Mario (USA, Europe).gba`. Shared loader loads emulator.min.js/min.css by default, transfers globals to config and constructs `window.EJS_emulator`. Shared readable emulator's core map resolves gba to mgba.

Source review coverage: entire entry, shared loader/storage and selected readable emulator core/restart anchors reviewed. ROM binary, packaged core, minified emulator and all game-specific behavior are not human-reviewed. Despite the Classic NES branding, this is a GBA image with gba core, not the NES emulator asserted by historical GAMES.md.

## Gameplay and controls

Wrapper supplies no rule/tutorial/key mapping. Actual gameplay/outcomes reside in ROM; emulator supplies virtual controller/settings. Do not document inferred pill controls. Historical [playtest r7](../../audit_batches/playtest_r7.md) delivered Enter/arrows/X and used emulator Restart, but that is not a control specification or fresh play pass. Restart is an emulator reset, distinct from clearing ROM save progress.

## State and persistence

Wrapper owns no save key/timer. Shared loader config includes optional loadState/defaultControllers but this entry does not set them. Shared EJS_STORAGE uses IndexedDB with caller-provided database/store names and reserved `?EJS_KEYS!` index. Exact per-game DB/key and ROM save behavior were not resolved. Preserve emulator save exports before any URL/name change; identity changes can affect saved-game association.

## Dependencies and provenance

Local shared runtime and the exact GBA filename are load-bearing. No game-directory LICENSE, source pin or ROM redistribution grant exists. Emulator licensing does not license the ROM. Historical metadata/play reports are not rights evidence. Do not claim ownership approval or substitute another ROM.

## Audit findings

- **HIGH**, entry EJS_gameUrl: supplied commercial ROM lacks verified redistribution evidence. Owner rights decision is required before release; do not delete or infer permission.
- **MEDIUM**, `Games/_emulatorjs/data/loader.js`, loadScript/loadStyle: promises never reject on resource error, so missing runtime can leave a blank game. Shared root fix is onerror rejection and useful authored error feedback, coordinated across consumers.
- **MEDIUM**, entry `#game`: only 100vh lacks newer dynamic-viewport fallback; measure browser-chrome clipping. Add 100dvh fallback only after native layout verification.

## Safe iteration

Keep shared runtime path, gba core and exact filename. Shell instructions/error handling are bounded patch points; no binary/core changes. Shared-loader edits require Main's infrastructure ownership and multi-consumer regression.

## Verification

Actually run: Git entry/tree inspection; native **0**, screenshots **0**. Recommended supervisor-approved narrow checkout includes this directory plus shared runtime. Check local dependency/ROM responses, start, control-settings mapping, virtual touch, pause/restart, save-state export/import and reload. Test missing runtime and storage denial. Main owns full gate.

## Future outlook

Rights first; then source-verified control help/error feedback and mobile sizing. Later validate save identity and real-device audio/input latency. Defer ROM replacements, new emulator cores and promotional claims.
