<!-- maintenance-game: Games/AdvanceWars -->
# Advance Wars maintenance

## Identity and status

Registered id **116**, category `strategy`, entry [index.html](../../../Games/AdvanceWars/index.html). Baseline `8c8a055`: two files, 2,324,207 bytes; entry blob `4f76157960c9f8476b4a762d3665a247f525aa84`. Existing zipped ROM wrapper; rights unresolved. No registration/publication/ROM changes occur here.

## Implementation map

Entry provides #game with 100vh then 100dvh fallback, root favicon.svg and EmulatorJS globals: player #game, core gba, color black, startOnLoaded=true, data path `../_emulatorjs/data/`, game URL `advance-wars.zip`. Shared loader loads minified emulator/CSS and constructs EJS_emulator. Readable emulator maps gba to mgba; compression/extractzip.js is a shared dependency for this archive.

Source review coverage: complete entry, shared loader/storage and selected emulator core/restart anchors reviewed. ZIP contents were not extracted in this task, ROM/core binaries and compression/minified runtime are not fully human-reviewed. [Batch 6](../../audit_batches/batch_6.md) historically records archive member `Advance Wars (USA) (Rev 1).gba` and clean testzip, but this is not a newly performed archive check.

## Gameplay and controls

Game rules, menus and campaign/outcomes live in the ROM, not HTML. No wrapper control mapping is defined. Emulator provides controls/settings and virtual touch UI; exact mappings must come from its runtime settings and game's tutorial. [Playtest r7](../../audit_batches/playtest_r7.md) historically delivered keys, observed zip extraction/frame change and clicked Restart; it is not full campaign verification or this assignment's native evidence.

## State and persistence

No local wrapper save key or loop exists. Shared loader can accept loadState/controller config but this entry supplies neither. EJS_STORAGE uses IndexedDB, caller-defined database/store and `?EJS_KEYS!`; exact game DB/save keys and archive-derived identity were not resolved. Emulator restart is not save deletion. Keep filename/archive identity stable, export state before any migration and test resume independently of loading.

## Dependencies and provenance

Local ZIP and shared EmulatorJS data, mgba core and extractor are required. No LICENSE/source revision/ROM redistribution grant is present in the assigned two-file directory. Neither emulator license nor a valid archive clears commercial ROM rights. Do not replace the archive with an arbitrary mirror or assume original franchise ownership from familiar name.

## Audit findings

- **HIGH**, entry EJS_gameUrl: ROM redistribution evidence absent; owner rights decision required before release. This audit records hold, not deletion approval.
- **MEDIUM**, shared `loader.js`, loadScript/loadStyle: no resource onerror rejection can leave blank loading forever. Repair the shared promise/error boundary with Main's infrastructure lease and multi-wrapper tests.
- **MEDIUM**, entry empty #game shell: no recoverable, game-specific control/error help before emulator UI arrives. Add factual labels after inspecting native controller configuration; do not invent arrow/action mappings.

## Safe iteration

Authored wrapper dimensions/favicon/help are safe first surfaces. Preserve gba core, ZIP path and shared runtime, and do not edit ROM/minified bundles. Archive changes need verified same-game source, rights and explicit save compatibility checks, not a storage cleanup shortcut.

## Verification

Actually run: Git entry/tree review; native **0**, screenshots **0**. Recommended supervisor-approved narrow checkout with shared runtime: ZIP integrity/member selection, local extractor/core requests, tutorial/menu input, turn progression, mission save/reload, emulator save-state export/import and restart. Test dynamic viewport, touch focus, missing ZIP/runtime and storage denial. Main owns the independent full smoke gate.

## Future outlook

Rights and archive provenance first; reliable loader error feedback and verified controller help next. Later test campaign-save continuity and handheld layouts on real devices. Defer archive replacement, new missions and engine changes pending rights/source authorization.
