# Terrain realism: bounded source-only lane

## Scope and integration

Only `src/render/world/tile-gen.ts` changes runtime behavior. Geography remains
pure and byte-identical. Existing domain-warped islands, hills, ridges, canyons,
hydraulic erosion and thermal smoothing already produce substantial coastal
relief. Replacing that geometry or adding a GLB would duplicate the authoritative
surface without evidence of a benefit. GLBs remain aircraft/ship assets, not terrain.

Normals now cross actual jittered grid secants, including one-sided boundary
secants. Adjacent clusters share shading at the same LOD. Muted mineral variation
follows broad tilted bedding; scree occupies middle slopes, soil shows on drier
shoulders, and hollows retain damp vegetation. The old altitude-only snow tint
at roughly 400 m is removed from these low coastal hills with palm shorelines.
These are procedural approximations, not measured geology or climate data.
The valley-occlusion cache now invalidates when the baked height array changes.
No geometry, topology, renderer, lighting, network, asset or fleet rules change.

Cherry-pick this commit into the source integration checkout. Rebuild the normal
worker and main-thread paths together. Parent owns port.patch, built artifacts,
main maintenance manual/inventory and browser review; this lane writes none of
those files. Do not edit generated delivery JS. No push or release is implied.

## Traced consumers

There is **no `floorHeight` symbol** in the current source. The collision floor is
`groundHeight`: water-clamped `terrainMeshHeight`, overridden by active ship
hulls/decks/superstructures. `terrainHeight` aliases the mesh query. Both renderer
LOD0 positions and `terrainMeshHeight` consume `worldMesh` heights, jittered x/z
and per-cell diagonals. Deep submerged triangles are culled by the renderer;
skirts hide LOD seams and are not collision surfaces. LOD1+ remains an existing
approximation, not an exact collision claim.

`groundHeight` feeds flight/gear/AGL, bots, combat, camera, aircraft placement,
scene/menu placement and game HUD/aim computations. `heightBound` accelerates
segment collision; `segmentHitsGround` feeds weapons, line-of-sight and HUD.
`surfaceType`, `isWater`, terrain/water queries and ship queries share geography.
Direct mesh-height consumers include tree slope/placement, shore-depth rows,
preview craters and the terrain query wrappers. HUD minimap uses `terrainHeight`.
The worker and streamer fallback call the same `generateCluster`, `generateTrees`
and `generateShoreRows`; streamer uploads position/normalized normal/color/index
arrays without a geometry replacement. Palette stays dependency-free; no Three
or DOM import enters the CPU generators.

## Runnable regression

From the isolated source root, set `ESBUILD_JS` to the existing approved esbuild
0.28.2 `lib/main.js`, then run this in-memory bundle. No installs or output files:

```sh
node - <<'JS'
const esbuild = require(process.env.ESBUILD_JS);
if (esbuild.version !== '0.28.2') throw Error('Expected approved esbuild 0.28.2');
const result = esbuild.buildSync({
  entryPoints: ['games/wings/terrain-realism-check.ts'],
  bundle: true, platform: 'node', format: 'cjs', write: false
});
const Module = require('module');
const m = new Module(process.cwd() + '/terrain-check.cjs', module);
m.filename = process.cwd() + '/terrain-check.cjs';
m.paths = module.paths;
m._compile(result.outputFiles[0].text, m.filename);
JS
```

The check covers every actual indexed LOD0 surface triangle at three strict
interiors, exact baked/core vertex equality, water-clamped collision floors,
conservative bounds, finite unit upward normals, perpendicularity to real
secants, seam shading across all four LODs, coast/hill/valley presence, moving
fleet and launch-centerline seabed clearance, seed sensitivity and repeat bakes.
An alternate-seed color golden comes from a fresh cold process and detects stale
AO after a seed switch. Intentional palette changes require remeasuring it.
Height interpolation tolerance is 1e-8 m, not a geometry approximation. No timing
threshold was added or weakened.

## Measurements

Default seed 1464421959, same before/after:

- 160,801 baked vertices; 320,000 full-grid triangles.
- Generated triangles by LOD, including skirts: **13,188 / 3,640 / 1,070 / 357**.
- LOD0: 12,792 retained surface triangles, 396 skirt triangles.
- 38,376 strict interior samples; maximum height error **1.535e-12 m**.
- Baked range **-74.378822 to 574.529968 m**. The pre-existing clearance shelf
  extends below the nominal -40 m sea floor; that is not a new relief change.
- Coast vertices (-5..8 m): 938; land vertices: 4,981; local valley samples: 870.
- Baked geometry SHA-256:
  `66bc73870d4e552d09ad4c9f991819c01c6244d22ed8baa5c4724c391d6c4bda`.
- Runtime source bytes: geography **36,893 -> 36,893**; tile generator
  **13,198 -> 14,106**, combined **50,091 -> 50,999** (+908 bytes).

Matched one-shot CPU benchmark bundles used original HEAD tile-gen versus changed
tile-gen in separate module instances, same geography and 25 clusters at all four
LODs. It measured generation only, excluding regression assertions:

| Measurement | Before | After |
| --- | ---: | ---: |
| Bake process CPU ms | 745.286 | 792.328 |
| Bake wall ms | 3,896.170 | 1,289.061 |
| Generate 100 clusters process CPU ms | 767.427 | 966.623 |
| Generate 100 clusters wall ms | 21,993.790 | 1,451.409 |
| Triangles summed over all LODs | 18,255 | 18,255 |

CPU is `process.cpuUsage` user + system; wall is `performance.now`. Contention
makes wall samples noisy. Extra shading and actual-position normals cost CPU;
this is not a performance improvement claim. Initial baseline regression took
2,850.64 ms wall (bake 614.52 ms, 100,000 queries 49.71 ms). The expanded post-change
regression took 37,014.71 ms wall (bake 1,684.51 ms, queries 83.62 ms) in another
contended run; the seam/secant checks also add test-only work. Final regression:
**PASS**, 8,848.39 ms wall / 5,187.11 ms process CPU; bake 2,625.52 ms wall;
100,000 queries 171.45 ms wall. Running the new regression against original
HEAD tile-gen fails the actual-jitter normal assertion, as intended. Bundled
`node --check`, owned `git diff --check` and external-load/path scan pass.

Read-only main catalog check: **128 entries**, unique IDs/schema/tracked URLs
PASS. Main maintenance checker is blocked by existing unrelated Games changes:
`Commit inspected source changes before validating its inventory.` Main files
were not changed or committed by this lane. The inventory entry blob matches
current Wings index; its recorded tree differs from current main, so the old
manual/inventory is not promoted as current acceptance. No GPU/browser/FPS or
visual acceptance was measured. Parent must review native terrain appearance
and worker integration before delivery.
