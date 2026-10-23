# CITISTEN sampled outskirts terrain

## Scope and integration

Existing `Games/Citisten3D` only. This lane changes `terrain.mjs` and
`terrain-check.mjs`; no assets, dependencies, network, catalog additions or push.
The integration owner retains `world.mjs`, `camera.mjs`, the canonical manual
and inventory. The source tree matched inventory tree
`88ccf185435f81855938b0fdc4cef9dbe88b09f4` before this lane's edits.
The manual's solid-slab paragraph and old counts are now historical and need
integration-owner reconciliation with this receipt.

Reviewed flow: native creates world, world creates landscape and passes its
`edge`/`floorHeight` to the existing free camera. The world still owns the flat
city, supplied ground materials, existing water at y=-0.4, render loop, lighting
and disposal. Terrain does not participate in lot picking, simulation or saves.
`save-terrain-qa.py`'s read-only `features` bounds assertion remains compatible.
`boxes` now aliases feature bounds only; slab records and slab diagnostics are
removed because there are no rendered slabs. No runtime caller used those slab
records. Camera code and its swept clearance algorithm remain unchanged.

## Geometry

The outskirts are a continuous indexed heightmap ring with 9,409 stored Float32
samples, 96 cells across and an exact 60-cell-wide city exclusion. Samples on
and within the buildable square are explicitly zero. The city boundary joins
without steps; lower and outer skirts cover the exposed perimeter. Buried
undersides remain omitted. With the native 1,000-unit extent, the sampling step
is 33.333 units and the outer edge is 1,600. Sampled elevations span -18 to
221.308 units. Triangle interpolation, not an independent analytic noise
function, owns the returned surface height.

Smooth sampled hills rise away from the city. Solid vertex colors transition
from grass through upper grass into exposed rock according to elevation and
slope. The east bank rises slightly above the flat foundation before descending
through the existing water surface into a sandy basin. Shore colors grade from
grass to sand and darker submerged sand. No water replacement, alpha foliage,
new textures or shader animation.

Eight edge clusters contain broadleaf trees, pines and grass patches. Trees
combine capped trunks with closed crown volumes. Each grass patch has five
closed tapered blades. Forty-eight closed boulders sit partially buried on
slopes above 45 units with sampled slope greater than 0.2. Feature dimensions
scale with world extent, preserving the 128-lot specimen's flat build area too.

Actual buffer/index and instance counts, checked by the Node regression:

| Geometry | Instances | Triangles per instance | Submitted triangles |
| --- | ---: | ---: | ---: |
| Heightmap top | 1 | 11,232 | 11,232 |
| Outer/city skirts | 1 combined with top | 1,248 | 1,248 |
| Broadleaf trees | 42 | 88 | 3,696 |
| Pines | 22 | 60 | 1,320 |
| Grass patches | 144 | 30 | 4,320 |
| Boulders | 48 | 20 | 960 |
| Landscape total | 256 features + surface | | **22,776** |
| Existing flat city | 1 | 2 | 2 |
| Terrain including city | | | **22,778** |

One heightmap mesh and four static `InstancedMesh` batches use five geometries
and one shared solid `MeshStandardMaterial`. There are **five landscape draws**,
or six including the existing city, before culling and excluding existing water,
city content and shadow passes. Four feature batches cast shadows; terrain
receives them. Draw counts are structural counts of actual scene meshes, not
measured integrated GPU renderer statistics. Instance matrices upload once;
there is no terrain update callback, timer or per-frame geometry generation.
Cleanup disposes all five geometries, the shared material and instance buffers.

The old 8,192-triangle check compared the slab version to an obsolete 64x64
plane. It cannot accommodate a continuous sampled ring plus closed natural
models. It is explicitly replaced with the operator's **strictly below 25,000
triangles** limit, counting all instanced geometry, skirts and the city. This is
not an FPS waiver. The old 7,538-triangle/two-draw landscape+city receipt remains
historical, not the current budget.

## Collision and fall-through preservation

`surfaceHeight` interpolates the same two triangles as the rendered cell.
`floorHeight` takes the maximum of that surface over a radius-wide square,
which conservatively contains the camera's circular footprint. For each touched
cell it checks the clipped rectangle's corners and the endpoints where the
shared diagonal intersects it. Those are all possible maxima of the two linear
triangle planes. It keeps y=0 as a conservative water/city floor.

Each natural feature uses the transformed source model's AABB, including crown
lobes and rotated grass. Clearance flies over the entire bound rather than
threading foliage gaps. A 0.002-unit allowance covers Float32 instance/position
rounding in both footprint and top height. Existing camera snap, target and
smoothed-pose sweeps still use this single floor callback with radius 1 and
2-unit vertical clearance. This remains a flying camera, not walking physics.

## Verification

Commands run from repository root, all exit 0:

```text
node --check Games/Citisten3D/terrain.mjs
node --check Games/Citisten3D/terrain-check.mjs
node Games/Citisten3D/terrain-check.mjs
TERRAIN CHECK PASS: 9409 height samples, 11232 surface + 1248 skirt + 10296 instanced feature triangles; 256 features, 22778/25000 triangles including city, 5 landscape draws; rendered surface/radius/closed models/snap/smoothing/sweep/disposal
node Games/Citisten3D/world-check.mjs
WORLD CHECK PASS: roads/lanes, static/mobile block AO invalidation, water height, sky probe/shadows, day/night, bounded FX; GLB/animation/material tests run separately
node Games/Citisten3D/native-check.mjs
NATIVE CHECK PASS: atomic road cost/occupancy, zone placement, protected hall, stable meshes, grid poses and removal
NATIVE LOOP PASS: static skip, speed 0, input wake, active delta, hidden/resume, pending shots and cleanup
node Games/Citisten3D/save-check.mjs
SAVE CHECK PASS: day/night JSON round trip, roads/buildings/economy/agents/clocks/RNG, deterministic continuation, detached state, invalid/corrupt/denied/quota handling, paused speed, rebuilding/repair/lost hall and one-shot milestone continuity
```

Catalog validation: `CATALOG CHECK PASS: 128 entries, unique IDs/schema/tracked URLs`.
`git diff --check` passed. A targeted source scan found no external loads or
new scheduling calls in either touched module.

The expanded terrain check inspects every rendered terrain triangle, raycasts
the real mesh, checks multiple radius footprints, verifies grass/rock colors,
checks closed feature edges/winding and every actual instanced vertex against
the floor, checks all playable lot centers, and retains snap/smoothing/thin
swept-collider regressions. An initial strict flat-city check found a
6.75e-29-unit boundary height caused by `step * inner` rounding; explicit zero
boundary samples fixed the source, without relaxing the assertion.

`python3 -B scripts/check_maintenance_docs.py` was attempted and blocked with:
`AssertionError: Commit inspected source changes before validating its inventory.`
The lane did not refresh inventory or edit the canonical manual. Integration
must reconcile these after sibling source commits and rerun the checker.

## Remaining acceptance

**FPS and integrated memory are not yet measured for this change.** No browser,
screenshot, native-play or GPU acceptance is claimed. The orchestrator owns the
integrated realism capture, both-theme/mobile review, renderer draw statistics,
performance and memory sampling. Earlier measurements predate this geometry.
No full-fleet gate or push was requested or run. Existing events, saves,
render-sleep/battery behavior and memory fixes were not edited; headless native,
world and save checks above retain their boundaries.
