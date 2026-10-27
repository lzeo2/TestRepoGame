# Foldwild exploration lane receipt

## Integration contract

- Lane owns only `Games/Foldwild/region-data.js`, `Games/Foldwild/world.js`, `scripts/test_foldwild_exploration.mjs` and this receipt.
- **Controller integration:** call `worldPoints(state, { exploration: true })` for presentation. Default calls retain the exact legacy point objects, deterministic selections and snapshot contract. Enriched points add `landmarkId`, `locationName`, `arrival`, `description`, `rewardHint`, `routeId`. Use `description`/`rewardHint` in existing interaction text and `arrival` once on route completion; no persistent discovery flags are introduced.
- `REGION_LAYOUTS[region].landmarks`: named destinations with `{id, name, x, z, pointIds, routeId, description, arrival, rewardHint}`. All trial landmarks match the actual rival coordinates. **Northern Clearing** is Maren's existing `rival` at **(22, -26)** in Rootfold Meadow, not the decorative stone at (16, -40). The name in first-play guidance must use this identity.
- `REGION_LAYOUTS[region].routes`: `{id, name, landmarkId, paths}`; `paths` contains collision-safe authored polylines for renderer/route descriptions. Existing `routeTo` remains authoritative for actual movement; these are not an alternative navmesh.
- Navigation and renderer workers may consume these layout fields directly through their existing region-data import. `navigationObjective` already calls the opt-in adapter and uses the exact `locationName` in its objective and arrival cue. No extra world exports, point types, save fields, assets or creature changes.
- `nearbyPoint(state)` deliberately retains its legacy result. For interaction copy, resolve its `id` against the enriched point list. Do not replace original NPC dialogue or battle rules with route prose; append the brief description/reward hint where useful.

## Implemented

Five exact named trial destinations: Northern Clearing (22, -26), Channel Bend (-34, -54), Upper Kiln Shelf (24, -54), Northern Terrace (22, -62), Eastern Grove Clearing (14, -54). Every trial gains a small visible amber waystone three meters east of the actual actor, carrying matching `label` and `landmarkId`. The five original decorative stones stay at their exact coordinates; Quiet Stone Grove remains at (0, -50), preserving the optional visitor's existing setting beside it at (-8, -50).

Five bridge loops are named and describe the real crossings. Fifteen short, collision-safe visible trail spurs connect existing fiber caches to the authored trail network; the renderer already draws `layout.paths`, so these are not unused route records. No markers, NPCs, caches or payouts were added. Cache hints explain the existing choice between one-time delivery and sale. Existing collection state suppresses claimed caches, without a new discovery/save field. Habitat identity uses the existing habitat element and named local site rather than revealing any undiscovered species. Challenge hints distinguish the base trial, return lesson and optional rematch. Opt-in bonus metadata appears only if the existing optional encounter gate actually emits that point.

## Verification

- `node scripts/test_foldwild_exploration.mjs`: `PASS: 5 exact trial identities/visible waystones, 15 useful cache spurs, 120 safe route segments; legacy point output/save schema preserved; delivery/claim/rematch/optional separation and canonical80`.
- All **14 existing pure suites** passed unchanged: data, battle, battle_v2, economy, builds, world, regions, save_v2, continuity, cap_xp, save_conflict, class_ranks, campaign, optional. In particular the optional suite retains its exact 500 full base-world snapshots; class ranks retains 168 legacy replay snapshots; data retains all 80 canonical model hashes.
- `node --check` passed for both changed game modules and the new regression. Scoped `git diff --check` passed.
- The new test checks metadata immutability and getter refusal, all named targets' actual reachability, every named route segment at 5 cm intervals, physical trial-waystone association, exact original stone positions, real existing delivery payout/one-time claim, campaign/rematch wording and opt-in canonical selection invariance. These are source/fixture checks, not natural-play acceptance.
- Starting free disk: 2,268,930,048 bytes. Post-suite observation: 2,266,488,832 bytes; shared workspace activity is included in this observation, not attributed solely to this lane.

Orchestrator owns controller integration, manual/inventory updates and native visual acceptance. No browser, install, copied worktree, model/asset change, new game, publication or push. Existing campaign, M2, native-device and rights holds remain.
