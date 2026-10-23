# Citisten save, landscape and night-warning delivery

## Scope and commits

Existing registered game 241 only; catalog unchanged at 128 games. No game,
asset download, dependency, remote load, publication or push added. Shared source
ownership was respected: events supplied snapshot/skip hooks in `799e1ab` and
`aceaeb6`; milestone/diagnosis/recovery landed in `579d089` and `b7ee9ab`.
Work was committed on top of the shared branch's landed commits, without
rewriting or overwriting sibling work. See [events](citisten-events.md),
[study](citisten-skylines-study.md) and the [manual](maintenance/games/241-citisten3d.md).

Save/terrain milestones:

- `55147c4`: solid outskirts, shared height probes, swept free camera and checks.
- `c8b86f0`: landscape contract/manual; its coverage attempt correctly stopped
  while sibling game source was dirty, not a PASS.
- `ea2d4c0`: snapshot validation for canonical milestone/recovery state.
- `98d21e1`: closed natural-box undersides, including canopy bottoms.
- `67a8bef`: guarded local save/autosave, menu Save/Continue/Restart and S control.
- `3b5e057`: save round trips and bounded native-entry photo runner.
- `661b649`: active civic repair callback through the existing repair tool.
- `f84b1c3`: inconsistent-state rejection and stable-source capture checks.

## Runtime boundaries

`citisten-save-v1` stores JSON, not images: complete published state, ordered
roads, RNG streams, IDs, fractional clocks, warnings, pending notices and
milestone high-water state. Constructor validation precedes mutation of supplied
roads. Continue reuses UI's recreated-game route and forces road mesh refresh.
Menu/tutorial pause does not overwrite the saved selected speed. Autosave uses
60 simulation seconds; explicit Save uses the same guarded storage path. One
local slot is replaced on save; no cloud/export/history or cross-tab merging.
Blocked/corrupt storage reports a message and still permits a fresh town.

Skip to Night runs the normal deterministic steps to the 60-second nightfall
warning, not straight into combat. It preserves economy, civic and traffic
consequences and refuses night/rebuild/repeated-warning requests. S overrides
camera-back only while available; the camera pad always supplies Back.

Reality-noted: Citisten previously had a flat mesh and free camera, not an
existing slab/fall-through controller. The new landscape is outside the
buildable square so foundations remain aligned. 624 slabs and 108 natural boxes
share exact render/probe dimensions. Camera target/snap/smoothing/sweeps stay
above these boxes; this is a flying camera, not walking physics. The eastern
basin exposes existing water; discrete grass/rock bands, clustered trees and
boulders use solid colors. Natural boxes are closed; buried slab undersides are
omitted. Ground plus surroundings uses 7,538 triangles versus the previous
8,192 and two draws versus the previous three ground material groups. One
batched landscape mesh, no per-feature draw calls. This is a geometry/draw bound,
not measured FPS acceptance. No natural features needed to be skipped as unsafe;
parks retain their existing supplied models, with new clusters confined to edges.

## Actual headless verification

All commands exited 0 on the combined runtime source:

- `node --check` on native, persistence, save-check, sim-snapshot, terrain,
  terrain-check, camera, world and world-check modules.
- `node Games/Citisten3D/save-check.mjs`: `SAVE CHECK PASS`, covering day/night,
  roads/buildings/economy/agents/clocks/RNG, subsequent state/events equality,
  detached snapshots, invalid data before road mutation, corrupt/oversize JSON,
  denied getter/read/write/quota, paused speed, natural rebuilding, loaded repair,
  retained lost hall and one-shot milestone continuity.
- `node Games/Citisten3D/terrain-check.mjs`: `TERRAIN CHECK PASS: 624 slabs, 108
  natural boxes, 7538/8192 triangles, single landscape draw; solid
  probes/snap/smoothing/sweep`.
- `node Games/Citisten3D/world-check.mjs`: `WORLD CHECK PASS`, including forced
  road refresh when a loaded save reuses the renderer's previous version.
- `node Games/Citisten3D/native-check.mjs`: `NATIVE CHECK PASS`.
- `node Games/Citisten3D/external-materials-check.mjs`: `PASS external terrain`;
  the old default fixture confirms three material groups/8,192 triangles.
- `node Games/Citisten3D/sim-check.mjs`: existing city/three-night assertions and
  `CIVIC`, `SKIP`, `SNAPSHOT`, `MILESTONE`, `DIAGNOSIS`, `RECOVERY CHECK PASS`.
- `git diff --check` passed. Catalog audit: `CATALOG PASS: 128 unique IDs,
  required schema and tracked URLs`. New runtime code has no third-party loads.

## Browser gate: HOLD

The granted exclusive system-Chromium slot was used once with a fresh
repo-local profile and a 120-second outer bound:

```sh
timeout 120s python3 -B Games/Citisten3D/save-terrain-qa.py
```

Exit 1, actual duration **46.415 seconds**, including launch and cleanup:
`Page.goto: Timeout 20000ms exceeded`, waiting for `domcontentloaded` at the
native entry. This repeats the recorded native navigation blocker; no production
root cause is proven. **Zero native assertions or screenshots were reached.**
Empty error/external-request arrays before navigation readiness are not a clean
loading or offline pass. The runner preserves source hashes and targets four
photos: Continue menu, loaded mid-game, day landscape overview and mobile/light
Continue menu. Only the landscape camera is staged; no gameplay-state grants.
All four photos remain unproduced/unreviewed, not silently replaced by UI fixtures.

Local failure evidence: `.tmp/citisten-save-terrain/result.json` and
`.tmp/citisten-save-terrain-qa.txt`. `browserReleased: true` and
`serverReleased: true`; a fresh process check confirmed no Chromium remained.
The slot was explicitly released. Second-slot advice/approval request ticket
`pi-513647-1792721062741-b0b3ded3` is unresolved; no second browser was launched.
The earlier coordination ticket `pi-513647-1792719577800-efd62909` was resolved by
the operator's ownership/slot answer. One terrain delegation was aborted before
work; all delivered terrain changes were retained by this lane.

Native visual acceptance, the existing 40 FPS/hardware gate and the unchanged
full-catalog pre-push gate remain HOLD/unrun. No push. Storage was 3,025,162,240
bytes free at lane start and 3,014,234,112 after the browser attempt, a
10,928,128-byte reduction across concurrent lanes, not solely this change.
No disk waiver, browser download, external deletion or history rewrite.
