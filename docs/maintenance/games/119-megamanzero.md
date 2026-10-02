# Mega Man Zero maintenance manual

<!-- maintenance-game: Games/MegaManZero -->

Source baseline: `8c8a055`. Documentation-only static review, delegation 64.

## Identity and status

Registered ID **119**, category `action`, not featured. Entry: `Games/MegaManZero/index.html` ([local entry](../../../Games/MegaManZero/index.html)). Tracked tree: **2 files, 3,675,568 bytes**; entry blob `3ef232cbc6abe64ecb924261797731eca901b705`. Existing emulator/ROM entry, not a new port. Local references establish an offline-capable boot path, not legal clearance or a current native pass. Rights review is held; no content removal or replacement is authorized.

## Implementation map

`index.html` creates only `#game`, sized to `100vw` by `100vh`, then sets `EJS_player`, `EJS_core="gba"`, black `EJS_color`, `EJS_startOnLoaded=true`, and `EJS_pathtodata="../_emulatorjs/data/"`. The exact game URL is `megamanzero.zip`. Shared `data/loader.js` loads `emulator.min.js` and `emulator.min.css`, copies globals into config and constructs `window.EJS_emulator`.

**Source review coverage:** full 23-line entry and shared loader/storage/GameManager read; selected readable `emulator.js` anchors `getCore`, `defaultControllers`, `loadSettings`, `saveSettings`, `checkForUpdates` inspected. GBA resolves to `mgba`, whose local packed core is `cores/mgba-wasm.data`. The production minified emulator, decompressor and packed core/ROM were not fully human-reviewed or executed; readable/minified equivalence is not certified.

## Gameplay and controls

The catalog describes action-platforming and the Z-saber. Neither weapon logic nor mission selection exists in this HTML; document actual in-game prompts only after an authorized play session.

Auto-start applies to the emulator, not necessarily the ROM title menu. Shared default-controller source lists arrows as D-pad, Enter as START, V as SELECT, X/Z/S/A as numbered face buttons, Q/E as shoulder inputs. Exact GBA button semantics and game actions need checking in Control Settings and the ROM tutorial. Touch/gamepad and audio facilities belong to EmulatorJS; the entry contains no own touch controls or mute button. Shared toolbar has restart, pause and save/load-state facilities, contingent on core support. Do not add invented win/loss screens.

## State and persistence

The wrapper has no independent game state, timers or save key. Shared settings use `ejs-settings` plus `ejs-mgba-settings`; changing bindings can affect every GBA entry on the same origin. `EmulatorJS-roms`, `EmulatorJS-core`, `EmulatorJS-bios`, and `EmulatorJS-states` are IndexedDB databases. `getBaseFileName` derives save identity from the loaded filename unless `EJS_gameName` is supplied; none is supplied here. `GameManager.saveSaveFiles` syncs the core save filesystem, and a `beforeunload` listener requests saving. This is not proof that every browser completes the async write on exit. Export saves before changing archive names or core versions.

## Dependencies and provenance

No LICENSE, CREDITS or pinned ROM source occurs in this two-file game tree. EmulatorJS source identifies version 4.0.6 and links its upstream project at https://github.com/EmulatorJS/EmulatorJS, but a runtime URL/version is not a verified license inventory for every core. No ROM distribution permission was established. Earlier `docs/GAMES.md` and wiki counts/status claims are historical, not clearance; remaining ROM entries are distinct from previously removed IDs96-103.

## Audit findings

- **HIGH, rights hold:** `index.html` / `EJS_gameUrl` delivers a bundled game archive without source/redistribution evidence. Impact: publication remains legally unverified. Minimal resolution: owner obtains ROM-specific permission evidence and decides disposition; do not assume the emulator license covers it.
- **MEDIUM, load failure feedback:** shared `data/loader.js` / `loadScript` and `loadStyle` attach `onload` but no `onerror`. Blocking either production asset can leave bootstrap awaiting forever. Proposed root fix belongs to the shared runtime owner: reject failures and show a local, accessible retry state once, not four wrapper workarounds.
- **MEDIUM, save failure risk:** readable `emulator.js` / `saveSettings` has unguarded storage access/writes, while `storage.js` / `put` leaves an IndexedDB open-error promise unsettled. Reproduce with denied/quota storage; native result not run. Resolve at shared persistence boundaries with in-memory fallback and honest feedback, preserving existing keys.
- **Triage, not a claimed active production fetch:** readable emulator `checkForUpdates` fetches a remote version only for debug or loopback hosts. Production minified equivalence needs confirmation before asserting external-load reachability.

## Safe iteration

Limit future changes to documented `EJS_*` configuration and bounded shell feedback. Coordinate shared-loader changes across all emulator consumers; do not patch four copies independently or hand-edit packed engines. Preserve archive identity and migrate saves explicitly if renaming is approved. Roll back only the authorized wrapper/runtime commit, never reset the shared tree. No proxy, ROM substitution, networking or registration change is part of this task.

## Verification

**Actually run:** Git tree/blob inspection and entry inline-script syntax through stdin; shared loader syntax is separately reproducible. Batch totals and limitations are in [audit 64](../audits/games-64.md). Native/browser runs and screenshots in this task: **zero**. Historical [R8](../../audit_batches/playtest_r8.md) recorded emulator boot/toolbar restart for this title, with indirect frame/key evidence; it does not establish completion or save reliability at the current baseline.

Sparse-safe check: `git show HEAD:Games/MegaManZero/index.html`; `git show HEAD:Games/_emulatorjs/data/loader.js | node --check`. For later native verification, Main must lease only this game plus required shared runtime in a bounded Git-backed serving directory, not change worker sparse selection. Disable external traffic, test title-menu start, deliberate gameplay input, audio unlock, toolbar restart, save export/import and reload with storage denied. Test mobile rotation/focus. Full unfiltered catalog smoke remains Main's separate release gate.

## Future outlook

Week 1: resolve archive rights and inventory shared runtime notices. Week 2: shared load/storage failure feedback and verified controls help outside the emulator canvas. Week 3: save compatibility testing before considering any runtime upgrade. Week 4: low-power hardware timing, audio and touch review. Defer netplay, rebranding and engine replacement; they do not solve these entry-specific holds.
