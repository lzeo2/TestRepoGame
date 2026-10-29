# Citisten user render repair, lane 62

## Source-ready only

Four bounded runtime changes: remove the terrain adapter's positive depth bias,
bring the desktop starter view closer, expose visual-clock settledness, and forward
terrain seed through the renderer cache. **The user's green bands and whole-world
shaking remain visually unverified.** No browser/server/GPU launch, slot claim,
screenshot, push, export, new asset or game addition. Catalog remains 129 games.

Base `f66c65c6`; its game tree `ff06ce5f68cbf300d93fd55c5a8396ed563d3cd4`
matches the inspected inventory: 228 files, 35,188,315 bytes. Current source differs;
that inventory is historical until parent integration. The manual/inventory,
native/index/native.css, original lane60/61 diagnostics and sibling seed/UI files
are not owned or staged here. Parent updates canonical maintenance documentation.

Original worker log:
`.swarmforge-logs/worker-2026-10-28T22-57-58-126Z-e09c076e.log`.
Its `state=aborted code=143` remains recorded. The scheduling-message interruption
was not work cancellation. This continuation resumes those exact WIP files, not a
new rendering investigation. Same model `openai-codex/gpt-6-astra`, selected high;
no nested workers or settings changes. Resume session
`01a184c5-173f-701f-b6a4-d21f7a2e9124`, log basename
`2026-10-28T23-07-51-500Z_01a184c5-173f-701f-b6a4-d21f7a2e9124.jsonl`.
The six-minute continuation deadline is 23:13:51 UTC, 2026-10-28.

## Causal depth counterexample, not a screenshot diagnosis

`external-materials.mjs` previously forced factor1/units4 positive polygon offset
onto grass, soil and shoreline. These surfaces are actual terrain, not coplanar
overlays. `world.mjs` draws dry ground at y0 over the large opaque water plane at
y-0.4. Both materials depth-test/write; ground receives but does not cast shadows.
The change removes only that adapter override. Asphalt retains its negative offset;
water height, geometry, groups, supplied factors/maps, analytic AO, fog, normals,
shadow settings, LOD, DPR and art bytes remain unchanged.

The runnable check executes actual `createWorld`, local GLTFLoader, delivered
terrain/building GLBs and real Three matrices. Renderer and PNG bitmap decoding
are explicit doubles: no rasterization, native input or actual framebuffer query.
It executes the old material adapter from Git and the new adapter with identical
geometry, old initial pose and viewport. This isolates bias from the camera fix.

Window depth is affine across each projected ground triangle. The check computes
its screen-space slope and models OpenGL bias as
`factor * max(abs(dz/dx), abs(dz/dy)) + units / (2^24 - 1)`.
D24 is an explicit numerical assumption, NOT measured user hardware. At interior
points it intersects the same view ray with the actual lower water plane, checks
water extent and positive unbiased depth gap, then requires a reversal exceeding
one D24 step. This is a stronger, distinct counterexample than the earlier generic
precision sensitivity finding; it still does not prove the screenshot's cause.

| Viewport | Samples per DPR | Old reversals DPR1 / DPR1.5 | New reversals |
| --- | ---: | ---: | ---: |
| 1367x910 | 106 | 77 / 48 | 0 / 0 |
| 1280x800 | 111 | 89 / 63 | 0 / 0 |
| 1024x768 | 101 | 83 / 58 | 0 / 0 |
| 854x569 | 106 | 100 / 81 | 0 / 0 |
| 390x844 | 120 | 120 / 118 | 0 / 0 |

Example at1367x910/DPR1, triangle37, point(-206.20953178405762,0,-632.4):
water-minus-land gap19.5499316116835 D24 steps, old bias41.22446400004713;
new bias0. This proves an unnecessary source bias can reverse dry-land occlusion
under the stated model. It does not establish z-fighting, temporal motion,
particular green stripes, shader correctness or GPU/compositor behavior.

## Camera, clock and seed boundaries

- `camera.mjs:initialTownPose` changes only the desktop minimum height215 to180.
  The terrain/FOV/aspect-derived fit still wins when larger; phone minimum280
  and maximum400 remain. Actual supplied hall bounds are(-9,0,-7.5)..(9,17,7.5),
  across nine material batches. Hall projected width at1367x910 rises
  59.1754 to74.2246px;1280x800 52.0224 to65.2524;1024x768 49.9415 to62.6423;
  854x569 37.0009 to46.4108. Phone390x844 remains30.1797px: no phone-readability
  improvement is claimed. The new test covers1890 fits across sizes12..200,
  both layouts and five viewports, including hall roof, dry starter and complete
  dry-bank crossing. These checks use omitted legacy seed, not every seeded map.
  Existing756 stricter HUD-envelope fits and composed crossing/picking tests pass
  unchanged. DOM obstruction/readability remains parent's visual gate.
- `daynight.mjs:isSettled(targetPhase)` validates finite numbers and checks shortest
  circular residual<=1e-9. It does not change `approach`'s daylight return, rate,
  animation or scheduler. Ten60/120Hz convergence cases cover wrap in both
  directions and the half-circle bound, plus invalid inputs and tolerance edges.
  Parent must include this query in native's busy predicate and test eventual
  sleep. This leaf alone does not repair native's previously demonstrated early
  sleep, nor explain the separate native Save/Continue failure.
- `world.mjs:setTerrain(layout, terrainSeed)` forwards the optional third generator
  argument and compares both returned layout and seed before reusing terrain.
  The actual function body runs against a small generator/geometry double:
  old code ignores seed; new calls7,7,8,0,undefined,undefined make four rebuilds,
  preserve repeated-seed/legacy identity and distinguish explicit0 from absence.
  The sibling generator owns validation and exact legacy/zero geometry. Existing
  string-only callers remain valid. Parent must pass `sim.state.terrainSeed` from
  native; new-game seed and restore/save integration are not claimed here.

Native was inspected at continuation start: it still called one-argument
`setTerrain` and did not yet consume `isSettled`. Those are intentional parent
handoff dependencies, not code silently included in this commit. Keyup capture,
clearance, camera easing and input handling are unchanged.

## Commands and outcomes

All seven targeted executable commands below exited0 during this continuation:

```sh
node --experimental-vm-modules scripts/citisten_user_render_repair_check.mjs
node Games/Citisten3D/camera-fit-check.mjs
node Games/Citisten3D/external-materials-check.mjs
node Games/Citisten3D/world-check.mjs
node scripts/citisten_camera_stability_check.mjs
node Games/Citisten3D/river-check.mjs
node Games/Citisten3D/terrain-check.mjs
```

Exact new summary:

```text
USER RENDER REPAIR PASS: 10 old-red/new-green depth cases; seed forwarding/cache boundary; 10 clock convergence cases; 1890 framing cases; 74 local asset reads; CPU ONLY, no pixel/native acceptance
```

Other output includes `CAMERA FIT CHECK PASS: 756 current-Three projections`,
`FLAT WORLD CHECK PASS: two grass triangles; supplied soil/shoreline explicitly unused`,
`WORLD CHECK PASS`, `CAMERA STABILITY PASS`, `RIVER CHECK PASS: sizes 12..200,
2686194 cells` and `TERRAIN CHECK PASS: 9409 height samples`. Camera stability
retains zero snapped-idle matrix deltas and zero stopped-keyup target drift.
The new check ran twice successfully, including the added explicit-zero cache case.
Expected experimental-VM warning only; no failed executable attempt in this resume.
Original aborted worker's unreported command results are not invented or promoted.

`node --check` passed all four changed runtime modules and the new script (five
files). Catalog schema/unique integer IDs/Git-tracked URLs passed129 entries.
`git diff --check` passed. No new runtime external load was added; the test's
synthetic origin intercepts only local model bytes, not an external fetch.

`python3 -B scripts/check_maintenance_docs.py` exited1:
`AssertionError: Commit inspected source changes before validating its inventory.`
The shared tree includes ongoing sibling/parent changes. No inventory refresh,
manual fabrication or weakening. The known missing Brainrot manual remains a
separate historical blocker, not the output of this particular invocation.

No native/browser/full-fleet, final seed/save integration, final native busy-loop
or screenshot gate ran in this lane. Actual user artifacts, motion, Water/Save/
Continue, requested native previews and supported-device/FPS acceptance remain
OPEN. Parent owns integration and fresh evidence; prior failures remain intact.

## Commit boundary incident

Commit `d9f1310704acef8694c6185c53fc1563ba9c712a` contains the six owned
paths below PLUS five sibling seed paths staged concurrently in the shared index:
`Games/Citisten3D/river-data.mjs`, `Games/Citisten3D/sim.mjs`,
`Games/Citisten3D/sim-snapshot.mjs`, `scripts/citisten_seeded_terrain_check.mjs`
and `docs/citisten-seeded-terrain-repair.md`. Explicit-path `git add --sparse`
was used, but the subsequent plain commit consumed that shared index. This was
an ownership-isolation error, not intentional authorization to commit sibling work.
No history rewrite or sibling revert was attempted. Integrator must reconcile
this mixed commit with the seed worker before treating it as an isolated READY
handoff. Its actual parent is UI commit `5ac374ae108aefc86a2db46bb705d7b53520057e`,
which landed after the initial `f66c65c6` baseline. All five syntax checks and the
new render repair executable passed again against the committed source, exit0.
This receipt correction is committed with an explicit path-only commit.

## Ownership and storage

Intended commit scope was only `Games/Citisten3D/{camera,daynight,external-materials,world}.mjs`,
`scripts/citisten_user_render_repair_check.mjs` and this receipt. Existing camera/
material/world assertions required no edits. Sibling `river-data`, `sim`,
`sim-snapshot`, UI and UI checks/new checks, plus parent contract/native work,
were not added by this lane's staging command; the shared-index collision above
nevertheless included the five seed paths. No supplied assets, vendor, settings, sparse
selection, old diagnostics or source manifests are changed.

Resume preflight free space2,605,703,168 bytes; pre-receipt2,522,648,576 bytes,
both above2,147,483,648. Owned text growth stays below1MB. Shared disk changes are
not attributable solely to this lane. Exact final disk bytes and commit accompany
the handoff. No cleanup or waiver used.
