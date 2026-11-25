# Capital Drive sourced geography, levels and performance

Use the repository's current builders and local source records. The procedures
below were checked against authored command interfaces; they are not new source,
coverage, gameplay or performance results. Run builders only when source/data
work is authorized. Optional geospatial and browser dependencies and raw downloads
belong outside the checkout.

## Separate observation, inference and game fiction

Roads, footprints, names and tagged heights come from pinned source observations.
Procedural façades, untagged heights, windows, gardens, service timing, robbery
plots and original interiors are authored interpretations. A real place name or
building outline does not establish a surveyed entrance, internal floorplan,
security/access arrangement, legal permission or current operating status.

Read the relevant records:

- `docs/capital-drive-sources.md`, `docs/capital-drive-address-sources.md` and
  `docs/capital-drive-district-sources.md` for the retained base/source layers.
- `docs/capital-drive-north-west-sources.md`,
  `docs/capital-drive-regional-sources.md` and the airport source notes for
  expanded extents and rebuild order.
- `docs/capital-drive-war-memorial-sources.md` and the landmark/reference notes
  for original architecture over inspected source footprints.
- `Games/Capital Drive/data/terrain-attribution.md`, credits and each sidecar's
  metadata for source URLs, dates, digest, license, datum and stated limitations.

Retain OSM ODbL attribution and source IDs; ACT terrain licensing/attribution and
archive pins; and the terms of any retained Microsoft footprint source. Reference
photos, map imagery, proprietary textures and logos are not runtime asset grants.
Use public references for original geometry and record exactly what was observed.
Do not fetch new geography merely to repair a UI or controller bug.

## Coordinate and ownership contracts

Local units are metres, x east and z south. The retained projection origin is
149.137 E, -35.318 S. Follow `map-projection.js` and the builder's shared projection
functions; approximately:

```text
x = (longitude - 149.137) * 111320 * cos(-35.318 * pi / 180)
z = -(latitude + 35.318) * 111320
yaw forward = (-sin(yaw), -cos(yaw))
```

Do not reproject an overlay independently, round canonical seam coordinates or
repair navigation by inventing connecting roads. Preserve source node IDs,
complete shared coordinates, oneway/access/speed tags, source geometry and the
retained road profiles. Rendering widths and estimated untagged defaults are
separate from observed tags. Keep private/parking/service access rules with the
importer and graph owners.

`map-expansion.js` owns exact-coordinate segment dedupe/splitting, aligned node
slices, building footprint dedupe and water constituent replacement.
`north-west.js` and `regional-expansion.js` preserve earlier road references/tags
and terrain priority around that composition. `regional-expansion.js` records
per-region stats and searchable `regionalPlaces`; artwork promotion requires an
existing retained building ID. A new view must suppress generic rendering only
for the exact IDs it actually manages. Do not suppress an entire district or
remove physical source collision to accommodate a decorative replacement.

## Rebuild reproducibly from pinned external caches

Before changing a source file:

1. Record the checked-out revision, relevant source-file hashes, source URLs,
   licenses, manifest dates and intended geographic extent. Establish what the
   retained snapshot includes and what is absent.
2. Inspect the builder's `--help` and source. Identify fixed output paths, optional
   downloads and external library requirements. The base map builder writes its
   normal tracked outputs; use an isolated authorized source checkout for a
   candidate build rather than casually overwriting the active game.
3. Use an existing external raw cache. Confirm every pinned input digest. A cache
   directory existing does not prove it contains all requested tiles. Keep raw
   pulls and optional NumPy/Shapely/Pyogrio/Pyproj/SciPy outside Git.
4. Write candidate overlays/grids and reports outside the checkout where the
   builder supports `--output`. Compare IDs, geometry, counts, tags, bounds,
   coverage and source pins before deliberately adopting them.
5. Check source seam connectivity, complete/overlapping building bodies, water
   rings, terrain support, public approaches and source/body collisions. Regenerate
   cache only after adopted runtime/data changes settle.

Discover exact interfaces without fetching:

```sh
python3 -B scripts/build_capital_drive_map.py --help
python3 -B scripts/build_capital_north.py --help
python3 -B scripts/build_capital_north_west.py --help
python3 -B scripts/build_capital_regions.py --help
python3 -B scripts/build_capital_region_terrain.py --help
```

The base/north/north-west/airport builders have explicit `--fetch` switches;
base map detail acquisition has `--fetch-details`. Those switches are source
acquisition actions, not verification. Pinned inputs may reject changed live
bytes; preserve that failure and obtain a reviewed new source record rather
than disabling verification. `build_capital_regions.py` reads its external
`manifest.json` and verifies each raw file hash; it is not a downloader.

For the current region packs, create/verify one supported grid, then build in
retained precedence order: Belconnen, north, south. `CAPITAL_*` variables below
must point to deliberate external inputs/output locations set for this task;
these examples do not assign or expose credentials.

```sh
python3 -B scripts/build_capital_region_terrain.py \
  --source "$CAPITAL_CONTOUR_ARCHIVE" \
  --extent 149.02 -35.46 149.20 -35.16 --cell-metres 100 \
  --check-coverage --report "$CAPITAL_EVIDENCE/coverage.json"
python3 -B scripts/build_capital_region_terrain.py \
  --source "$CAPITAL_CONTOUR_ARCHIVE" \
  --extent 149.02 -35.46 149.20 -35.16 --cell-metres 100 \
  --output "$CAPITAL_EVIDENCE/regional-grid.json"
python3 -B scripts/build_capital_regions.py --region belconnen \
  --source-cache "$CAPITAL_BELCONNEN_CACHE" \
  --terrain-grid "$CAPITAL_EVIDENCE/regional-grid.json" \
  --output "$CAPITAL_EVIDENCE/region-belconnen.json"
python3 -B scripts/build_capital_regions.py --region north \
  --source-cache "$CAPITAL_NORTH_CACHE" \
  --terrain-grid "$CAPITAL_EVIDENCE/regional-grid.json" \
  --earlier-region "$CAPITAL_EVIDENCE/region-belconnen.json" \
  --output "$CAPITAL_EVIDENCE/region-north.json"
python3 -B scripts/build_capital_regions.py --region south \
  --source-cache "$CAPITAL_SOUTH_CACHE" \
  --terrain-grid "$CAPITAL_EVIDENCE/regional-grid.json" \
  --earlier-region "$CAPITAL_EVIDENCE/region-belconnen.json" \
  --earlier-region "$CAPITAL_EVIDENCE/region-north.json" \
  --output "$CAPITAL_EVIDENCE/region-south.json"
```

The explicit extent is the existing regional-source recipe, not automatic
approval for a larger map. For a different bounded task, `--overlay` may be
repeated to derive an extent from staged overlays. Inspect the configured margin.
A failed coverage run writes its report when requested and must not be reported
as an exported supported grid. Missing source support requires a smaller/split
extent or separately attributed real observations; do not clamp, nearest-fill,
substitute a flat plane or fabricate a bridge to hide the gap.

The region importer canonicalizes earlier source nodes and records prior packs.
Keep complete source footprints and avoid a density cap silently deleting most
of an inhabited suburb. Its current housing audit uses explicit residential
source tags in bounded 750 m windows, with a minimum 75% of eligible source homes
for the configured windows. That fraction describes eligible source coverage,
not complete real-world housing. Review `HOUSING_WINDOWS`, allocation limits,
rejected/overlapping outlines and emitted `housingCoverage` before changing a
cap or adding a district. A road-rich JSON can still have unacceptable housing.

For deliberate adoption, inspect the checked-in sidecar diff and run:

```sh
node scripts/test_capital_regional_expansion.mjs
node scripts/test_capital_regions_actual.mjs
node scripts/test_capital_regional_water.mjs
node scripts/test_capital_geodata.mjs
node scripts/test_capital_roads.mjs
node scripts/test_capital_canberra_coverage.mjs
node scripts/test_capital_bridge_clearance.mjs
node scripts/test_capital_residential.mjs --render
```

`build_capital_molonglo.py` and `build_capital_west_belconnen.py` accept
`--source-cache`, `--terrain-grid` and `--output`. Fetch raw OSM tiles into an
external cache with `--fetch-source`, then attach a grid built from the pinned
ACT archive with `build_capital_region_terrain.py`. Test routes from the city to
each new district and back before updating the game bootstrap.

`build_capital_residential.py --cache-root <external-cache-parent>` rebuilds
the supplement from the three retained regional caches. Apply it after the road
and terrain overlays. Its source acceptance and omission counts go in
`docs/capital-drive-residential-sources.md`. Check that the composed map keeps
the previous source owners and that representative new streets stay within
the world renderer's resident chunk budget.

Check the exact suite's scope before interpreting output. Seam nodes and routed
lane samples are distinct from continuous normal-input driving across the seam.

## Terrain coverage, water and floor levels

`terrain.js` is the support owner: `groundHeightAt`, `roadHeightAt`,
`vehicleHeightAt`, `bridgeHeightAt` and `isOnBridge` serve different questions.
Keep the existing tiles in their established priority and append regional grids
with the authored 150 m transition outside retained coverage. The terrain builder
verifies the ACT contour archive pin, finite dimensions/cells, interpolation
support and distance to observations. Regional cells are bounded to 75–100 m.
The current ACT importer interpolates in EPSG:7855 and exports AHD elevations
minus the documented 550 m datum offset. Keep CRS, vertical datum and offset
metadata with the grid; do not subtract the offset a second time in a view.
This is coarse contour-derived terrain, not a native DEM, independent survey,
bathymetry or measured road/deck surface.

Source water polygons retain holes/islands and any supplied `surfaceY`. Water
surface estimates and lowered visible ground do not authorize changing the
collision/elevation grid or raising an entire district. Rendering must respect
higher-priority terrain rectangles, actual shoreline geometry and island holes.

Bridge decks and approaches need one shared corridor/support model. A nearby
bridge in x/z does not imply every actor/car/shot is on its upper level. Keep
road-owned vehicle height, approach grading, water exemptions, adult bases,
traffic/parked hulls, shadows, camera and ballistics coherent. Do not apply a
blanket bridge exemption or global vertical offset to fix one road sample.

Indoor actors and projectiles use the active room's `floorY` and exact room ID;
shared x/z coordinates do not authorize interactions through an exterior wall or
between floors. A ray carries the appropriate interior ID and vertical origin.
Skyline/stunt/aircraft support likewise comes from the physical owner, not the
rendered mesh's pose alone.

```sh
node scripts/test_capital_terrain.mjs
node scripts/test_capital_bridge_roads.mjs
node scripts/test_capital_bridge_approaches.mjs
node scripts/test_capital_bridge_vehicle_layers.mjs
node scripts/test_capital_vehicle_support_views.mjs
node scripts/test_capital_water_contact.mjs
node scripts/test_capital_ballistics.mjs
node scripts/test_capital_police_rooms.mjs
```

## Houses, source footprints and streamed resources

`neighbourhood.js` retains source footprints, rendered door descriptors and
checked fitted backyards. `interiors.js` derives the actual active room plan;
`interior-navigation.js` owns its shared collider/navigation. Prefer exact source
outline geometry where supported. Fitted walls, rooms and gardens are original
interpretations, not observed cadastral boundaries or house floorplans.

Room plans/meshes/adults allocate on entry and dispose on leave. Exterior
`world-view.js`/`neighbourhood.js` streaming should allocate near geometry and
evict distant buffers; hiding a full resident city is not streaming. Preserve
source metadata, physical colliders, door approaches, deterministic regeneration,
LOD access paths, bounded idle queues and disposal. A hidden or Low-detail view
must not remove the physical location or disable its interior.

```sh
node scripts/test_capital_house_footprints.mjs
node scripts/test_capital_footprint_navigation.mjs
node scripts/test_capital_yard_fit.mjs
node scripts/test_capital_world_streaming.mjs
node scripts/test_capital_neighbourhood_streaming.mjs
node scripts/test_capital_low_detail.mjs --actual
```

Check generated geometry arrays, bounds, normal/UV finiteness, resource ownership,
resident versus visible counts and disposal after a round trip. Triangle/buffer
savings do not establish RAM usage or native FPS.

## Profile a question with comparable evidence

First define a reproduction: source revision/hashes, actual map/pose, direction,
camera, mode, viewport, quality, population, warm/cold cache, duration and whether
travel is natural or explicitly staged. Check renderer identity. Low,
Performance, Standard and Realism have different render cadence/resolution
contracts in `render-gate.js`; do not compare a 20 FPS cap to a 60 FPS cap and
call the difference an optimization. `graphics-diagnostics.js` records only
completed renders and finite actual elapsed windows; RAF callbacks alone are
not render counts.

Run one heavy source workload, profiler or browser at a time. Use exact baseline
and candidate exports, the same harness bytes/options/seed and fresh external
outputs. Do not install browsers or relax sandbox/network policy to obtain a
measurement. Keep rejected/failed runs and any unaccepted environment evidence.

Start with a bounded pure source question when appropriate:

```sh
node scripts/profile_capital_simulation.mjs --output "$CAPITAL_EVIDENCE/simulation.json"
node scripts/profile_capital_foliage.mjs --root "$CAPITAL_EXPORT" \
  --output "$CAPITAL_EVIDENCE/foliage.json" --quality low --samples 160 --idle 600
node scripts/profile_capital_collision.mjs --root "$CAPITAL_EXPORT" \
  --output "$CAPITAL_EVIDENCE/collision" --frames 18000 \
  --seed 20261117 --allocation-frames 0
```

Inspect the current scripts before running. Simulation output requires an
existing external parent and a fresh file; the collision harness creates a fresh
output directory and refuses an existing one. These are explicit supplied-time
workloads, not native driving. Compare complete state/contact checksums and
per-call work before claiming an equivalent speedup. The foliage tool measures
geometry/streaming workload, not WebGL rendering.

For explicitly needed browser CPU evidence:

```sh
python3 -B scripts/profile_capital_drive.py --root "$CAPITAL_EXPORT" \
  --output "$CAPITAL_EVIDENCE/native-cpu" --mode 3d --quality low --seconds 8
python3 -B scripts/analyse_capital_profile.py "$CAPITAL_CPU_PROFILE" \
  --output "$CAPITAL_EVIDENCE/flamegraph.html"
python3 -B scripts/profile_capital_sustained.py --root "$CAPITAL_EXPORT" \
  --output "$CAPITAL_EVIDENCE/sustained" --scenario sustained --quality low \
  --seconds 390 --mode bridge-attempts
```

Review each `--help`, its admission/cleanup logic and the applicable performance
contract first. An eight-second request can overrun under load; record actual
profiling/wall durations. The sustained procedure is a deliberate multi-minute
measurement, not an everyday smoke check. Official map-click setup in a stress
scenario remains fixture travel and must be labeled.

Report separate measurements: renderer-thread ScriptDuration, sampled
self/inclusive CPU stacks, process CPU/RSS, heap/allocation samples, actual renders,
RAF callbacks, supplied simulation time, wall duration, resident GPU buffer bytes
and logical resource counts. A logical GL object count is neither bytes nor RAM.
Allocation sampling is a separate phase from timing; forced GC/post-GC heap does
not by itself prove a leak. Cloud SwiftShader/CPU rendering never certifies Intel
N100 FPS or another user's GPU/8 GB memory behavior.

Optimize the measured owner: spatial indexes/local queries, stable buffers,
instancing, real eviction and idle render gating. Retain collision trajectories,
source geometry, populations and correctness. Rerun the relevant regression and
paired workload once; broaden only for a new unresolved concern. Record exact
limits instead of turning synthetic timing into a whole-game performance claim.
