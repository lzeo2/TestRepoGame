<!-- maintenance-game: Games/RetroBowlHacked -->
# Retro Bowl Hacked maintenance

## Identity and status

Registered id **89**, category `sports`, entry [index.html](../../../Games/RetroBowlHacked/index.html). Baseline `8c8a055`: 35 files, 5,592,655 bytes; entry blob `71c5faa1e7e88f82a8a3678e3014282fa06f4fed`. Existing GameMaker HTML5 port with intentional credit/salary cheats; historical runtime failure is unresolved by this docs-only task.

## Implementation map

Entry creates `#gm4html5_div_id`, hidden `#GM4HTML5_loadingscreen`, `#canvas` initially 853 by 480 and a noninteractive `#hacked-badge`. It loads `html5game/RetroBowl.js`, declares local Poki no-ops, then calls `GameMaker_Init()` on window load. `html5game/uph_poki.js` provides extension glue including `poki_init_raw`, callback closures, commercial/rewarded breaks and `poki_loadbar`; game-generated loading owns extension integration. Text files hold teams, names, records, language, schedule, achievements and uniforms.

Source review coverage: entire entry and Poki glue, tracked LICENSE, selected generated runtime save/cheat anchors read. RetroBowl.js is 4,122,176 bytes and was not fully human-reviewed. Key patch point `_AK(section,key,default)` returns 99999 for `coach_credit`, 999 for `salary_cap` and `boost_salary_cap` before the original INI getter. `_eL` writes numeric values; `_AK` call sites show `savegame` load fields. Do not infer a fully audited engine from these anchors.

## Gameplay and controls

Wrapper advertises unlimited credits/salary cap but contains no playable controls tutorial or start/restart handlers. These reside in generated game rooms/scripts. Credit/roster/schedule fields establish management state but not exact throw/tackle keys. Known controls remain engine-owned and must be captured from actual tutorial/menu. The cheat modifies save-load values, not every spending operation each frame; a badge is not proof of persistent infinite credit during the session. Poki commercialBreak resolves true, rewardedBreak false, so no real ads/rewarded service exist.

## State and persistence

Generated INI fields include `savegame`'s `coach_credit`, `salary_cap`, `boost_salary_cap`, match count and related options. Runtime `_NE2(filename)` prefixes localStorage keys with `_ft._bw4`; `_7w4` builds a sanitized game-name/version prefix. Exact final keys were not resolved here. Storage access in reviewed runtime helpers is guarded. GameMaker owns loop/rooms/save lifecycle; wrapper initializes once per browser load, with no explicit failure/retry affordance. Cheat values can reappear on save reads after reload; preserve this variant behavior.

## Dependencies and provenance

Tracked `LICENSE` says MIT, copyright 2021 Echo. Its presence is verified; applicability to the commercial engine/game art is not established. [GAMES.md](../../GAMES.md) identifies New Star Games and a Seraph mirror for the base port, not independently verified rights for this exact hacked tree. Mirror availability is not permission. Do not extend the Echo notice into a blanket franchise redistribution claim. Local no-op Poki glue must stay offline.

## Audit findings

- **HIGH**, `html5game/RetroBowl.js`, startup boundary: historical [playtest r5](../../audit_batches/playtest_r5.md) reports `cpd is not defined`, blank canvas and optiondata.dat/savedata.ini misses. Current syntax passes and literal `cpd` was not found in the bounded current scan; exact generated/runtime dependency must be isolated by fresh stack/request evidence. No runtime success is claimed.
- **MEDIUM**, `index.html`, load listener: `GameMaker_Init()` has no wrapper error state. A boot exception strands a blue canvas. Add useful load/error feedback at the authored boundary after identifying the real failure, not an unrelated retry engine.
- **MEDIUM**, viewport/canvas CSS: zoom is prohibited and fixed initial canvas depends on engine resizing. Verify mobile safe-area, aspect ratio and tutorial access before bounded shell changes.

## Safe iteration

Preserve `_AK` cheat semantics; root repair belongs in verified original GameMaker source, not blind edits to generated names. Wrapper error/help and local SDK contracts are safer first patches. Back up actual game-prefixed save values before migrations. Never treat savedata.ini's missing initial request alone as a fatal game defect without tracing fallback behavior.

## Verification

Actually run: RetroBowl.js Git blob `node --check` **PASS**. Native **0**, screenshots **0**. Recommended narrow-checkout test: capture init exception stack and missing response consumers, reach actual menu, play tutorial/match, spend credits, save/reload and restart. Verify unlimited credit/salary intent independently of badge text, audio controls and offline requests. Main owns full gate; historical screenshots are not fresh release evidence.

## Future outlook

First isolate init failure and establish source/license applicability. Then accessible error/controls copy, mobile sizing and save lifecycle tests. Defer roster additions, generated-engine edits and online services until boot and rights are settled.
