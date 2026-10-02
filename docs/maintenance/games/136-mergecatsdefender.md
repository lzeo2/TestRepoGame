# Merge Cats Defender maintenance manual

<!-- maintenance-game: Games/MergeCatsDefender -->

Source baseline: `8c8a055`. Documentation-only static review, delegation 64.

## Identity and status

Registered ID **136**, category `strategy`, not featured. Entry: `Games/MergeCatsDefender/index.html` ([local entry](../../../Games/MergeCatsDefender/index.html)). Tracked tree: **207 files, 45,995,457 bytes**; entry blob `aa5406aca163d7299555969600f9981de6123658`. Existing source-based Phaser game with local assets. Normal economy starts battle coins at 200, drips 25 and gates cat unlocks on stage clears. Saved campaign currency is separate from per-battle currency. Offline dependency references are source-backed; no new native verification was run.

## Implementation map

`index.html` loads classic scripts in dependency order: local `src/lib/phaser.js`, Data config/units/enemies/waves, Core save/audio/display, asset/UI helpers, entities, six scenes and `src/main.js`. `main.js` constructs `window.PawDefenseGame` at 1280x720, Phaser.AUTO, FIT and CENTER_BOTH; plain block `#game` lets ScaleManager own centering. `BootScene.preload` loads sheets manifest and CrimSun logo, then Preload queues assets/registers animations and waits at least 1200ms including loading. `PD.Assets.queueAll` maps local UI/music paths and multipart sheets; texture-limit checks skip unsupported effect textures. `PD.buildLayout` transforms source-art anchors into 15 tower and five frontline hit positions.

**Source review coverage:** full entry and every nonvendor JavaScript file read in the base tree, plus every changed hacked file by byte comparison/diff. Function anchors include `Save.load`, `Display.compute/bindLayout`, `Assets.queueAll/registerAnims`, all scenes, entity stepping/damage, and `BattleScene` placement/waves/pause/results. Landing.create exposes Play, How to Play and Settings. Phaser's 1,375,976-byte vendor bundle and binary art/audio were not fully human-reviewed. Sheets manifest was parsed, not every texture visually reviewed.

## Gameplay and controls

Landing Play opens LevelMap, then a stage opens SquadSelect and Start opens Battle. Choose up to six unlocked cats. Pointer/touch selects a dock unit then an empty matching position; shooter cats occupy towers, Guardian/Boxing occupy frontline. Drag existing units to the painted trash bin to discard without refund; there is no implemented merge/upgrade operation in the reviewed BattleScene despite title/catalog wording. Units target their lane; splash impacts also reach adjacent lanes, with snapshot iteration protecting removal. Survive every wave to win; base health reaching zero loses. Retry restarts the current scene, Next Stage/World Map navigate after results. Escape and the pause control toggle pause; gameplay deployment and menus lack a keyboard selection path. Portrait invokes a rotate guard, not portrait lane play. Settings expose local music, synthesized sound and vibration toggles.

## State and persistence

`PD.Save` caches data, stores coins/gems/unlocks/roster/cleared/settings, fills missing defaults, and normalizes display choices. Key is `pawdefense.save.v1`. `clearLevel` records cleared stages and awards coins/gems; roster saves before battle. `PD.normalizeRoster` filters unknown IDs but does not deduplicate or cap loaded squads. Battle owns units/enemies/projectile/FX pools, coins, baseHP, wave counters, pause/guard flags and scene-clock spawn/drip timers. Win/lose remove drip event; scene shutdown handles engine timers. `PD.Display.bindLayout` unregisters scene listeners on shutdown/destroy. `PD.Audio` owns one soundtrack across scenes plus short WebAudio tones; local tracks are declared in `PD.MUSIC.files`. Display is currently fixed to FIT despite retained fit/fill APIs.

## Dependencies and provenance

`CREDITS.md` identifies CrimSun (crimSun-dev), https://github.com/crimSun-dev/merge-cats-defender and permission issue https://github.com/crimSun-dev/merge-cats-defender/issues/1. It explicitly says permission was requested and formal license pending. Attribution and noncommercial intent are **not** permission. No verified pinned upstream revision or game/art/audio license grant was found here. Source mentions CraftPix source art; individual asset rights need separate evidence. The local Phaser minified prefix does not supply a verified game license; its complete notice inventory remains unverified. CREDITS' historical removal/consolidation notes are not authority to delete more assets.

## Audit findings

- **HIGH, rights hold:** `CREDITS.md` / pending permission. Resolve written game and asset rights before redistribution/refurbishment beyond owner-authorized scope.
- **HIGH, malformed save crash:** `src/Core/Save.js` / `load`, after JSON.parse, uses `k in this.data` without validating object shape. Valid JSON `null` or a primitive can escape the parse catch and crash boot; wrong-type unlock arrays later crash selection. Root fix: validate loaded root, arrays, numeric fields and settings before merging defaults; preserve recoverable progress rather than clear the whole origin.
- **MEDIUM, keyboard accessibility:** `src/Interface/UIKit.js` / `pillButton` and scene cards only bind pointer input; Escape pauses but does not make menus/deploy usable. Add a bounded keyboard/focus path to the shared UI and squad/placement flow; do not claim full keyboard support.
- **MEDIUM, portrait pause interaction:** `BattleScene._togglePause` can unpause scene timers with `_guarded` still true via Escape, while `update` remains guard-blocked. Proposed root fix: one guarded pause-state decision used by Escape, settings and orientation transitions; test no spawns/economy advance behind rotate prompt.
- **LOW, inaccurate affordance copy:** catalog mentions merging/upgrading, but reviewed controls implement selection, placement and disposal; help says stop enemies at the left edge while wall attacks are actual failure route. Main owns copy correction after native confirmation.
No new exploit claim is made from intentional economy cheats or internal canvas text. Historical batch-7/R10 passes do not cover malformed saves, victory/retry or current hacked auto-advance.

## Safe iteration

Use readable modules, not `phaser.js`, as patch points. Preserve source-art transforms, typed placement and muzzle origins; geometry must move the painted hit regions and previews together. Maintain splash candidate snapshot and FX full-reset invariants. Save repair belongs in `Save.load` used by Boot, UI and settings, not scattered catches at each caller. Keep hacked economy/key isolation when applying shared-source repairs. Do not add a second title gate or rewrite upstream combat. Source/license approval precedes asset replacement.

## Verification

**Actually run:** all local JS syntax through stdin, JSON parse, Git byte comparisons and tree inventory; no browser/screenshots (**zero native**). Historical [R10](../../audit_batches/playtest_r10.md) reached battle/deployment in both games; restart was explicitly not tested, and hacked now skips the old title gate.

`git show HEAD:Games/MergeCatsDefender/src/Core/Save.js | node --check` reproduces a sparse-safe syntax check. Main's later bounded Git-backed runtime lease should test new/old/corrupt/denied saves, full start flow, correct tower/frontline placement, splash kills, drag-to-trash cancellation, pause/settings/rotation combinations, loss Retry and win rewards/reload. Compare both slots without clearing them. Review 360px portrait rotate UI and landscape hit-target sizes on actual hardware. Full catalog gate remains separate.

## Future outlook

Week 1: pending rights and save-shape triage. Week 2: bounded keyboard path and guard/pause regression after authorization. Week 3: save compatibility, campaign result and audio lifecycle QA, including hacked old-slot migration. Week 4: texture-budget/frame-time measurements and small-screen target review. Defer speculative merge systems, new cat art and compile-tool changes; first correct existing documented behavior and preserve attribution.
