<!-- maintenance-game: Games/MarioKartSuperCircuit -->
# Mario Kart Super Circuit maintenance

## Identity and status

Registered id **117**, category `arcade`, entry [index.html](../../../Games/MarioKartSuperCircuit/index.html). Baseline `8c8a055`: two files, 4,195,058 bytes; entry blob `a356b9c35025bdde7992df1f3b45bb5e4d41c0f2`. Existing ROM wrapper, no new game. Redistribution rights remain an owner hold.

## Implementation map

Entry creates #game, uses 100vh/100dvh sizing and root favicon.svg. Globals set player #game, core gba, black color, startOnLoaded=true, data path `../_emulatorjs/data/` and exact game URL `mario-cart-super-circuit.gba` (cart spelling is the tracked dependency, not a typo to casually fix). Shared loader loads emulator.min.js/min.css and constructs EJS_emulator; readable emulator maps gba to mgba.

Source review coverage: whole entry, shared loader/storage and selected readable emulator core/restart anchors read. ROM, packaged core, minified runtime and racing-engine logic were not human-reviewed. Wrapper reading cannot certify handling, physics, unlocks or art provenance.

## Gameplay and controls

No actual racing/menu control mapping exists in wrapper HTML. Emulator owns control settings/virtual controller, ROM owns start/course/race/outcome/retry. Do not infer acceleration/drift/item keys from franchise familiarity. Historical [playtest r8](../../audit_batches/playtest_r8.md) reports emulator start/frame changes/key delivery and restart, not a complete race or this audit's native verification. Accessibility labels must be based on real controller settings and tutorial evidence.

## State and persistence

No authored wrapper save key/timer. Shared loader's config can transfer controller/loadState settings, unset here. Shared EJS_STORAGE is IndexedDB-based with caller-defined store/database and reserved `?EJS_KEYS!`. Actual game identity/ROM save mapping remains unknown in this bounded review. Restart invokes emulator/gameManager, not a progress wipe. Export states before changing gameUrl/name because saved-game association may depend on resource identity.

## Dependencies and provenance

The exact local GBA filename and shared EmulatorJS data/mgba runtime are load-bearing. Directory has no LICENSE/source pin or ROM redistribution grant. Valid ROM presence, emulator license or prior successful play is not copyright clearance. No replacement/rename/delete authorized; keep provenance uncertainty explicit.

## Audit findings

- **HIGH**, entry EJS_gameUrl: commercial ROM rights not established; obtain owner-reviewed evidence before release, without relabeling it as open source.
- **MEDIUM**, shared `loader.js`, loadScript/loadStyle: resource failures never reject their promises; blank shell can persist. Minimal root fix is shared onerror rejection/feedback under Main's infrastructure lease, not duplicate per-game loader rewrites.
- **MEDIUM**, entry #game-only shell: no persistent factual controls/error/recovery help. Inspect native settings before adding instructions. Dynamic viewport fallback exists; whether virtual controls remain visible is still a native measurement.

## Safe iteration

Prefer authored wrapper help/focus/error feedback; preserve gba core, data path and exact cart-spelled ROM filename. Do not modify supplied ROM or compiled/minified engine. Shared loader/storage changes require cross-game coordination and save exports, with rollback to original resources.

## Verification

Actually run: Git entry/tree inspection; native **0**, screenshots **0**. Recommended supervisor-approved narrow checkout with shared runtime: local ROM/core responses, menu and course start, actual race controls, finish/retry, emulator pause/restart and save-state export/import/reload. Test 320 px portrait/landscape, touchscreen overlap, fullscreen exit, denied storage and missing dependency feedback. Main owns full catalog smoke.

## Future outlook

First settle ROM rights/source identity, then loader failures and accurate controller help. Later measure race input/audio latency and mobile save continuity on real hardware. Defer replacement ROMs, multiplayer claims and additional courses until expressly authorized and verified.
