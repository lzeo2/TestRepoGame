<!-- maintenance-game: Games/RetroBowl -->
# Retro Bowl maintenance

## Identity and status

Registered id **54**, category `sports`; entry `Games/RetroBowl/index.html`. Baseline `8c8a055`: entry `05ed3791ec854efb401de6ae08c1b08d00533477`, tree `5b521472b5553b2dab17b091386d1b88abe9b88d`. The 36 files total 5,592,513 bytes. This is the ordinary game, not the hacked sibling. Offline play is advertised, not newly browser-verified here.

## Implementation map

`index.html` creates `#gm4html5_div_id`, hidden splash `#GM4HTML5_loadingscreen` and 853x480 `#canvas`. It loads `html5game/RetroBowl.js`, supplies `window.PokiSDK_OK`, local SDK methods and `PokiSDK_loadState=0`, then calls `GameMaker_Init()` on window load. Keep this ordering: the compiled initializer and Poki callbacks depend on the globals.

`html5game/uph_poki.js` supplies `poki_init_raw`, callback bridge `poki_script_closure_raw`, lifecycle notifications, commercial/rewarded-break wrappers and `poki_loadbar`. The latter calls `gml_Script_gmcallback_poki_loadbar` for optional style values and reports progress. Text resources include language, names, teams, schedules and uniforms; texture/audio files remain local.

Source review coverage: complete entry, SDK glue, README and LICENSE were read. Selected compiled anchors `GameMaker_Init`, `_Au4`, `_7w4`, `_NE2`, input listeners and save filenames were inspected. The 4,121,962-byte GameMaker output, game rules, embedded vendors and all text data were not reviewed in entirety.

## Gameplay and controls

README credits New Star Games and describes franchise/roster management and football. Catalog says tap/swipe. Compiled event excerpts prove mouse, touch and keyboard plumbing exists, not the exact football key map. `uph_poki.js` deals with ads/loading, not throwing or running controls. Start, match scoring, season progression and reset are engine-owned and need native evidence. Do not add guessed arrow/WASD instructions.

Commercial breaks resolve locally; the wrapper's rewarded break resolves `false`. Preserve this no-reward behavior, rather than manufacturing rewards. Audio unlock paths occur inside the runtime. No authored HTML restart is supplied.

## State and persistence

The compiled save setup names `optiondata.dat`, `savedata.ini`, `savedata2.ini` through `savedata5.ini`, and `savedata_backup.ini` around line 70589. These are virtual save filenames, not necessarily files that must be shipped. `_Au4` probes localStorage; `_NE2(filename)` prepends `_ft._bw4`. `_7w4` constructs a sanitized game-name/runtime namespace. The final namespace value was not resolved during this bounded audit. Export or back up only identified keys before migration; never clear origin storage.

## Dependencies and provenance

Local `LICENSE` is MIT, copyright Echo (2021); README identifies New Star Games as game creator. That mirror notice does not establish rights over New Star Games' compiled game, art or data. No pinned upstream source URL/revision was verified for the game. Retain the existing notice and mark full-game clearance unknown. SDK replacement avoids the wrapper's remote Poki import; compiled URL strings and browser navigation still need execution tracing before asserting total offline closure.

## Audit findings

- **HIGH, provenance hold:** `LICENSE` versus `README.md` creator attribution. Scope of Echo's grant is not demonstrated for the commercial game. Obtain authoritative code/assets permission and a source revision; do not relabel all files MIT.
- **MEDIUM, accessibility:** `index.html`, viewport `user-scalable=0`. Zoom is disabled; canvas controls have no source-verified adjacent instructions. Minimal fix is wrapper zoom restoration and factual instructions after play review.
- **MEDIUM, recovery:** `index.html`, `GameMaker_Init()` call has no shell failure status. Add a bounded readiness/error state at this bootstrap, not a decorative menu.
- **Historical, not current defect:** `docs/audit_batches/playtest_r1.md` recorded a blank canvas and stray `cpd;`. Current compiled source has zero `cpd;` matches and parses successfully. Missing option/save files alone do not prove broken gameplay. The old report remains history, not a current diagnosis.

## Safe iteration

Keep SDK glue and callback signatures intact. Wrapper CSS/loading status is the preferred patch point. Generated GameMaker internals are not a refurbishment canvas; obtain maintainable upstream sources before gameplay edits. Preserve virtual save names and namespace unless a tested migration is authorized. Never copy hacked getter overrides into this build.

## Verification

Actually run: Git inventory and resource inspection; stdin `node --check` passed for `RetroBowl.js`, `uph_poki.js` and the entry's executable inline script. Native runs **0**, screenshots **0**.

Reproduce parser check: `git show HEAD:Games/RetroBowl/html5game/RetroBowl.js | node --check`. Recommended Main-approved HTTP/browser lease: fresh profile, menu to first match, throw/run input, score change, season save, reload and new-game/reset; repeat with storage denied and third-party requests blocked. Record virtual-file fallback behavior separately from actual asset 404s. Main's full loading gate is independent.

## Future outlook

First establish game rights and recheck the historical blank-canvas hold. Next add reliable boot feedback and verify keyboard/touch football input. Month work should prioritize save reload/slot isolation and denied-storage behavior, not new teams or compiled-bundle hand edits. Hardware profiling and an upstream source pin precede any engine upgrade.
