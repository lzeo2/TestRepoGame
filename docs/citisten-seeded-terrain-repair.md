# Citisten seeded terrain repair: CPU-ready handoff

## Scope and provenance

Lane 63 resumed its existing WIP after scheduling interruption, not cancellation.
Model `openai-codex/gpt-6.1-sol`, requested high reasoning, no subagents or model
changes. Original process log:
`.swarmforge-logs/worker-2026-10-28T22-57-58-164Z-21a3f4bd.log`, SHA256
`648702122760f27f6f1da3d7d51d4b317e7ca4449b31c2e0014e24a06332ad12`.
Its recorded ending is `aborted code=143`; that is not a test result.
Resume session `01a184c5-1821-76e6-8066-fbeb27f1a97c` began
2026-10-28 23:07:51 UTC, hard deadline 23:13:51 UTC including commit/report.
Baseline `f66c65c6087c79f34c7e1263cc98b23208a9ee52` remains the regression pin.
Sibling HUD commit `5ac374ae` landed during verification; it is not this lane's work.
A concurrent render commit `d9f1310704acef8694c6185c53fc1563ba9c712a`
included this lane's five explicitly staged files as well as six render-owned files.
Our first commit attempt exited 128 with `index.lock: File exists`; no lock was
removed. The explicit-path retry exited 1, nothing to commit, revealing that
concurrent commit. No history rewrite or sibling edit followed. Our own explicit-
path follow-up records this collision and adds 40 real legacy-slot byte-preservation
checks. The repair source pin is d9f13107; the separate follow-up pin is in the
final handoff. Do not attribute the six render-owned paths to this seed lane.

Read the complete repair contract, private user note, code-quality guide,
maintenance guide/manual and own WIP/test before finishing. Canonical inventory
still identifies published tree `ff06ce5f`, 228 files / 35,188,315 bytes; current
working source intentionally differs. Canonical manual/inventory are parent-owned.
This receipt supplements the existing manual; parent must reconcile them after
integration, without treating earlier visual evidence as current acceptance.

## Actual repair

The pinned old generator ignores its third argument: seed 1 and seed 42 produce
identical 40,000-cell masks. The shared generator now accepts
`createRiverTerrain(size, layout = 'river-v1', terrainSeed = undefined)`.
Omission and explicit 0 retain the exact original formula. Other unsigned seeds
use pure uint mixing for shift, phase, amplitude and frequency, bounded west of
the dry 5x5 starter. Returned terrain has optional `seed` only when explicit.
No assets, mutable gameplay RNG, alternative terrain formula or layout names added.

`createSimulation` accepts/persists optional `state.terrainSeed`. Saved explicit
values, zero and ABSENCE all override caller options. Legacy absence never derives
terrain from economy/event/runtime RNG. `readSnapshot` validates seed/layout before
road mutation and uses that same terrain for footprint and bridge validation.
Snapshot version and storage key remain unchanged; no reset, migration or overwrite.

Owned source: `Games/Citisten3D/{river-data,sim,sim-snapshot}.mjs`.
Owned regression: `scripts/citisten_seeded_terrain_check.mjs`.
No native/world/camera/UI/persistence/manual/inventory edits or staging.

## Executed verification

All following Node commands exited 0:

- `node scripts/citisten_seeded_terrain_check.mjs`
- `node Games/Citisten3D/river-check.mjs`
- `node Games/Citisten3D/river-upgrade-check.mjs`
- `node Games/Citisten3D/save-check.mjs`
- `node Games/Citisten3D/bridge-check.mjs`
- `node Games/Citisten3D/sim-check.mjs`
- `node Games/Citisten3D/expansion-foundation-check.mjs`
- `node Games/Citisten3D/expansion-integration-check.mjs`

The new check was rerun after adding deterministic fuzz and fresh-option road
atomicity assertions. Actual output:

```text
SEEDED TERRAIN PASS: 1403332 pinned legacy samples; 100170 seeded rows; 20 CPU geometries; 10 40k-mask pairs
FUZZ PASS: 6048 deterministic size/seed/continuous-point cases; dry edges/starter and legacy interpolation
SAVE PASS: 45 pinned legacy snapshots; 15 partial-build save/continue restarts; 5 independent RNG/bridge/utility replays; 12 atomic corruptions; native seed0 bridge 83..95
```

All sizes 12..200 are covered. CPU ground vertices repeat exactly, remain bounded,
have upward nondegenerate triangles and agree with authoritative terrain heights.
The legacy corpus executes pinned original river source and pinned simulation
source with current dependency imports; it is not a complete frozen-engine replay.
Legacy river source SHA256:
`e90ef05fb222ca086da9b6380c4ebed8304534e1e98ab889f8cd3707ed652d81`.
Corpus includes flat/river saves, fractional clocks, varied economy seeds and five
old native-coordinate bridge saves. Missing-layout saves remain legacy-flat.

Water-mask differences at size 200 (cells / maximum course difference in lots):

| Seeds | Cells | Lots |
| --- | ---: | ---: |
| 0 / 1 | 548 | 2.08 |
| 0 / 2 | 1374 | 9.97 |
| 0 / 42 | 1470 | 8.24 |
| 0 / 4294967295 | 1148 | 6.47 |
| 1 / 2 | 1030 | 9.28 |
| 1 / 42 | 1742 | 10.21 |
| 1 / 4294967295 | 1142 | 6.95 |
| 2 / 42 | 2400 | 9.74 |
| 2 / 4294967295 | 1312 | 7.57 |
| 42 / 4294967295 | 1752 | 8.29 |

All ten pairs also have different actual CPU render vertices, not just hashes or
resource factors. This is source/water-mask evidence, NOT native visual success.

Five seeds each complete three real `saveTown` / `readSave` / reconstruction cycles
with unfinished construction, exact snapshots/money/IDs/clocks and unchanged slot
bytes. Forty legacy flat/river snapshots also pass actual storage save/read/restore
with caller seed42 ignored, absent metadata retained and original slot bytes equal.
Gameplay RNG then advances independently; restored terrain remains identical.
Seeded crossings carry roads/power/water; cutting one disconnects both utilities.
Explicit zero preserves the published bridge endpoints 83..95 at z100.

Eight invalid saved seeds and four invalid/missing seeded layouts reject before
caller RoadGrid set identity/cells/version or storage bytes change. Non-JSON NaN
and Infinity are rejected directly and their serialized null forms are rejected;
explicit undefined rejects as a raw object, while JSON omission remains legacy.
Seven invalid fresh seed options also preserve caller roads. No assertion, filter,
fixture acceptance or version gate was weakened.

Other actual output includes `RIVER UPGRADE CHECK: 7/7 passed`,
`INTEGRATION PASS groups=14/14 corruptionRejections=20 targetQuarterChecks=1732`,
`SAVE PAYLOAD PASS`, `SAVE CHECK PASS`, and `BRIDGE CHECK PASS`.
`node --check` passed all four touched/new JS modules. `git diff --check` exited 0.
Catalog validation exited 0: `CATALOG PASS: 129 unique IDs/schema/tracked URLs`.
No games added, runtime external loads, assets, installs, browser/server or push.

Maintenance command `python3 -B scripts/check_maintenance_docs.py` exited 1:
`AssertionError: Commit inspected source changes before validating its inventory.`
Sibling game edits remain active; no refresh or weakening attempted. The existing
missing Brainrot manual remains a documented independent coverage blocker.

## Parent integration and remaining holds

Parent must pass `terrainSeed: options.seed` only for NEW towns and call
`world.setTerrain(sim.state.terrainLayout, sim.state.terrainSeed)`. Renderer/minimap
caches must distinguish absence, zero and nonzero seeds. Continue must not parse a
new seed, regenerate an old map or overwrite a rejected save. Those paths belong
to other lanes and were not claimed accepted by this source check.

Caller audit additionally found `city-event-effects.mjs:37` reconstructs its own
terrain using only layout and caches only layout. Flood decal elevation can therefore
use the wrong course in seeded towns. This is outside this lane's allowed paths:
parent must route its reconstruction/cache through `state.terrainSeed` and check
seed-switch flood placement. This finding is NOT repaired by the current commit.

Native Water/Save/Continue, actual seed screenshots, whole-world shaking, green
bands, hardware/FPS and final integrated acceptance remain OPEN/HOLD. No browser,
server or slot was launched/contacted; Slipstream reservation is untouched.
Frozen source manifests are historical; supplied models/vendor/fonts were not edited.

Initial fresh free space: 2,605,654,016 bytes. Pre-receipt check: 2,522,705,920 bytes,
above the 2,147,483,648 floor. Shared concurrent growth is not attributable to this
small text-only lane. No cleanup or waiver. Final commit pin/free bytes appear in
the handoff report; original process failure and all previous evidence are retained.
