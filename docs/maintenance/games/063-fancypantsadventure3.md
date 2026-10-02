<!-- maintenance-game: Games/FancyPantsAdventure3 -->
# Fancy Pants Adventure 3 maintenance

## Identity and status

Registered id **63**, category `action`, entry `Games/FancyPantsAdventure3/index.html`. Baseline `8c8a055`, entry `04c6581c5c7c4315a49839aec7bfc3e0ac764581`, tree `04869a00fb1b214a6994e85b87625b72d32699ec`. Four files total 42,038,294 bytes. Existing archive wrapper; no runtime modification or native gameplay pass in this task.

## Implementation map

The entry includes root-relative-via-parent resources `../../images/ico.ico` and `../../storage/js/cloak.js`. The latter is currently a tracked 34-byte no-op, not a live cloaking feature. An inline script creates a local `ruffle/ruffle.js` script; variable name `cdnScript` is misleading because its URL is local. On script error, `loadLocalRuffle()` appends `../../storage/ruffle/ruffle.js`.

Window load then obtains `RufflePlayer.newest()`, creates `#player`, appends it to `#ruffle` and calls `player.load("FPAWorld3.swf")`. Primary emulator resolves `c5c02c4e65c1c4423a97.wasm` under `ruffle/`. Shared fallback uses a different emulator family; its optimized/vanilla core JS and two WASM files live under `storage/ruffle/`.

Source review coverage: complete entry/inline CSS and shared no-op cloak; selected primary and shared Ruffle public-path, WASM, playback and storage anchors. The 83,706-byte primary JS and 461,498-byte fallback were not fully human-reviewed. Binary movie/WASM, original platforming rules and all embedded assets were not inspected.

## Gameplay and controls

Catalog calls this a hand-drawn platformer. The wrapper defines no jump/movement keys or touch mappings, score/progress display, restart or menu controls. These are movie-owned and unknown at the reviewed source boundary. Do not write familiar arrow/S controls merely from the franchise. Player pointer/keyboard capability is emulator infrastructure, not a control audit. Verify a real level, death/restart and movement before a maintenance patch promises complete play.

## State and persistence

Authored state consists of the dynamically inserted scripts and player. No wrapper save key or gameplay timer exists. Primary Ruffle exposes localStorage bridge calls; exact SWF save names are unknown. Shared fallback has SOL save-manager/reload interfaces and path/host matching. Preserve `FPAWorld3.swf` URL and save identity; runtime consolidation can change serialization and compatibility even if the wrapper API matches. Never clear all origin storage to restart the movie.

## Dependencies and provenance

All current HTML script/icon targets exist in Git, including shared fallback. Historical `docs/audit_batches/batch_2.md` called them nonexistent; that diagnosis is stale at this HEAD. The directory supplies no README, game source URL, publisher permission, revision pin or license. Title suffix `Seraph` indicates an archive shell, not a redistribution grant. Emulator licensing also needs retained notices for the specific vendored artifact; general Ruffle licensing does not license the movie.

## Audit findings

- **HIGH, rights/notices hold:** `FPAWorld3.swf` and local emulator pair have no bundled game/emulator notice in this four-file tree. Establish source and rights without claiming a default license.
- **MEDIUM, fallback failure recovery:** `loadLocalRuffle()` appends a fallback without its own `onerror`; the window-load bootstrap calls `RufflePlayer.newest()` unconditionally. If both scripts fail, there is no authored failure/retry state. Root fix is one explicit script-readiness/error chain before player construction, not another timeout. Dynamically inserted scripts can delay window load, so absence of an explicit `onload` chain alone does not prove a normal-load race; that remains a targeted browser question.
- **MEDIUM, geometry:** `#ruffle` uses width/height attributes on a div without definite CSS height; the player uses 100% height. Fix shell dimensions after screenshots, preserving movie aspect ratio.
- **LOW, misleading name:** `cdnScript` refers to a local script. Rename only in an approved wrapper cleanup; no remote load was found in this bootstrap.
- **Unverified boundary:** the wrapper sets no explicit SWF networking policy. Test actual movie requests before asserting offline closure.

## Safe iteration

The safe patch point is the script-loading/player-construction chain and container CSS. Preserve the supplied SWF and complete emulator pairs. Do not silently switch this game to shared runtime to save disk; current primary/fallback versions differ and need replay/save tests. Keep fallback rollback explicit and retain third-party notices.

## Verification

Actually run: Git tree/dependency inspection, stdin `node --check` on primary/shared Ruffle and both entry scripts, passed. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/FancyPantsAdventure3/ruffle/ruffle.js | node --check`.

Recommended Main-approved HTTP lease: normal primary boot and forced primary-script failure, fallback readiness, keyboard/touch controls as shown by movie, playable level/death/restart, audio unlock and reload/save. Record all requests with third-party access blocked. Old “functional OK” prose does not replace current gameplay evidence.

## Future outlook

First rights/notices, then explicit fallback failure recovery and real platforming input review. Month work should compare primary/fallback compatibility and player fit at phone/desktop sizes. New art, reconstructed platforming code and shared-runtime migration are deferred until permission, source and native evidence exist.
