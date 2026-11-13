# Capital Drive: Canberra source and implementation record

The 13 November Street Life continuation adds two modes, on-foot/combat and
police rules, jobs/garage progression, four dedicated inner-south landmarks and
3,446 explicitly tagged offline addresses. See the [current receipt](verification/capital-drive-street-life-2026-11-13.md),
[landmark references](capital-drive-landmark-references.md) and
[address source record](capital-drive-address-sources.md). Earlier milestone
descriptions below retain their original context where marked.

## Scope and authority

The operator's 12 November 2026 request explicitly authorizes a new original
GTA-like Canberra game in this repository and a subsequent push. The clarified
first milestone is driving and exploration, with fast arcade handling, a chase
camera and mouse orbit, left-hand traffic, parked vehicles and real street data.
The first district covers the inner south, especially Telopea Park School,
Manuka/Kingston intersections and Red Hill. Whole-of-Canberra expansion is future
work. Sites was explicitly excluded. Intel N100, 8 GB RAM and keyboard/mouse are
the target; no real N100 performance result is claimed.

This is authorized original work, not an ingested GTA port. It contains no GTA
code, branded vehicles, copyrighted game artwork or copied Street View imagery.
The original interface, driving logic and generated streetscape were authored
for this request. Existing car-arcade original vehicle factories are reused
without changing their shared ABI or other games.

## Sources and modifications

- OpenStreetMap official v0.6 map API: 18 bounded tile responses, adaptively
  subdivided when the 50,000-node limit was reached. Roads retain real point
  geometry, names, shared node IDs, one-way directions and available speed limits.
  In-bounds contiguous runs are retained; no connecting street segments are
  invented. OSM building/green-space outlines supplement the ACT data.
- ACT Government `ACTGOV_BUILDING_FOOTPRINTS`, ArcGIS item
  `ec6743ed841841ec83dc6c69c9b80dd9`: 4,544 features, yielding 4,663 polygon parts.
  Item metadata specifies Creative Commons Attribution 4.0, Australian Capital
  Territory. The data is incomplete. Heights are not supplied; game heights,
  roof forms and facades are estimates.
- Microsoft GlobalML Building Footprints, official Australia quadkey 311230302,
  2026-02-03 distribution: 3,023 additional outlines, CDLA-Permissive 2.0. Source
  identifiers and the complete licence are retained. These are machine-derived
  outlines, not independently verified current buildings.
- ACT 2020 LiDAR-derived two-metre AHD contours, ArcGIS item
  `8c12c8e2e9f340908164d4aab9355e28`, © Australian Capital Territory, CC-BY 4.0.
  2,130 contour features with a 300-metre margin supply 187,807 samples. Linear
  triangulation produces a 513 by 513 grid with approximately 12.60 by 11.74
  metre cells. Heights remain relative to the existing 550-metre datum.
  This replaces the first build's 129 by 129 Mapzen grid; historical notices stay.

The enriched 13 November snapshot contains 5,197 unchanged road sections,
12,572 building outlines and 1,464 green/water polygons. Source counts are
4,663 ACT, 4,886 OSM and 3,023 Microsoft. Polygon-overlap suppression prioritises
ACT, then OSM, then Microsoft, replacing the original centre-distance heuristic.
It adds 3,049 source outlines without inventing houses. The first enriched
renderer drew 12,562 after skipping ten nested outlines. Street Life additionally
replaces twelve exact ACT footprints with four dedicated landmark studies,
drawing 12,550 ordinary outlines. These are not independently verified current
real-world buildings. The seven original destinations connect to the largest
road component; four added runtime anchors have separate public approaches.

The terrain is a contour interpolation, not the native one-metre LiDAR DEM or a
claim of one-metre accuracy. All grid cells lie inside the source convex hull;
no synthetic/nearest/old-Mapzen fill is used. Held-out contour interpolation
residuals are median 0.071m, p95 0.609m and maximum 37.615m. These measure
interpolation consistency, not independent survey accuracy; local extrema,
depressions, road cuts and the maximum outlier remain limitations. A public GA
five-metre WCS subset returned only zeros and was rejected. See the retained
[quantitative validation](../Games/Capital%20Drive/data/geodata-validation.json).

`Games/Capital Drive/data/canberra.json` records projection, source hashes,
snapshot metadata and approximation notes. `data/LICENSE.md` separates OSM ODbL,
ACT CC-BY and Microsoft CDLA terms and links retained terrain attribution.
The visible footer and local `credits.html` supply human-readable credit.

## Rebuilding the snapshot

Run the developer-only importer with a cache outside the repository:

```sh
python3 scripts/build_capital_drive_map.py --cache <external-cache> --fetch --fetch-details
```

The enriched import requires Python, curl, Pillow, NumPy, Shapely, SciPy,
Pyogrio/OpenFileGDB and Pyproj, installed outside this repository. The official
Microsoft tile and 2020 contour geodatabase remain in the external cache.
These are developer tools, not browser runtime dependencies. The imported data
is projected to local metres, x east and z south, origin 149.137 E / 35.318 S.
The stored hashes identify exact consumed inputs; a new live download can differ.
No raw OSM contributor identity/contact metadata is included in the output.

## Local dependencies

- Three.js r160 at pinned commit `d04539a76736ff500cae883d6a38b3dd8643c548`,
  unchanged at `assets/car-arcade/vendor/three.module.js`; MIT notice retained.
- Original fictional car factory `assets/car-arcade/models.js` and its fleet.
  Everyday saloon, wagon, SUV, executive tourer and ute selections are an art
  direction choice, not a statistical survey of local vehicle registrations.
- Atkinson Hyperlegible regular, local OFL font. No new fonts or dependencies.

No runtime CDN, remote map tiles, third-party fetches or account/backend are
required. Credits contain ordinary external source links; play does not load
those sites. Existing protected games, compiled portal bundles and proxy/security
settings are untouched.

## Implementation boundaries

`simulation.js` owns fixed-step driving, indexed footprint and parked-car
collisions, safe arbitrary-point teleporting, the directed road graph and 26
seeded nearby traffic cars in the initial preview; Street Life raises this to
40 (cap 56), with bounded anger, evasion and clearance-gated overtaking.
Traffic uses the left lane, one-ways and simple
spacing/junction courtesy. Decorative
signals do not control vehicles; this is not a full road-rule simulation.

`world-view.js` consumes the shared real geometry and bilinear terrain. It uses
350-metre merged chunks, distance culling, local procedural surface/sign atlases,
framed multistorey windows, triangulated roofs and 9,000 distributed broadleaf
trees. Nearer facade details are distance-culled. School and shopping-district
treatments follow [four inspected Street View references](capital-drive-street-references.md).
Brick/cream school architecture, arched windows, low parapet shops, awnings,
crossings and verges are interpretations, not photogrammetry. Soft contact
shadows provide grounding without real-time shadow maps.

`pedestrians.js` adds 80 fictional adult walkers on collision-checked sidewalk
paths. It uses eight instanced body-part batches, animated limbs, terrain-matched
shoes and simple car avoidance. `neighbourhood.js` adds 4,200 footprint frontages
with driveways, hedges, low fences, letterboxes and doors, plus lamps, benches,
bins and original generic shop signs. Bounded brick-colour paved aprons connect
mapped Manuka/Kingston commercial frontages to derived sidewalks where clear;
roads, parks, buildings and residential footprints are excluded. These details are original interpretations,
not evidence of actual occupants, businesses or current landscaping.

`script.js` owns the single animation loop, input lifecycle, rendering, camera,
local maps, vehicle selection, menus and discovery. The full map supports
zoom/pan and arbitrary destinations, including clear off-road ground. Buildings,
water and occupied positions adjust to nearby clear ground; trip distance is
preserved. Mouse/touch selects, arrows move the point and Enter confirms.
These travel actions are now Free roam only; Street Life guards the handlers and
uses map selections for road routes. Sandbox actions never earn career progress.
`map-projection.js` shares the drawing/input coordinate transform.
`navigation.js` routes over the simulation's directed graph.
The local `capital-drive-v1` save contains only
the version and discovered landmark IDs. Invalid/denied storage is reported and
not silently overwritten. No other game's storage is read or cleared.

Browsers without WebGL receive an explicitly labelled playable top-down map
view using the same driving/traffic rules. That fallback is distinct from 3D
acceptance. Low mode targets 30 FPS and caps drawing resolution; standard targets
60 FPS. These are scheduling targets, not measured hardware guarantees.

## Verification

Pure regressions cover one-ways, connected routing, left lanes, acceleration,
reverse, braking, steering/drift, footprint boundary contacts, parked obstacles,
traffic spacing/locality, recovery, safe off-road teleports and directed navigation.
Map tests include CSS scaling, zoom, boundary rounding and unmapped padding.
Terrain/footprint checks retain source counts/hashes and finite AHD heights;
world checks cover bilinear heights, concave roofs, pavement clearance and culling.
The actual snapshot test uses 28,323 nodes and 48,290 directed edges through a
60-second simulation.

`scripts/test_capital_drive_browser.py` runs normal-input interaction, discovery
and save reload, map routes, zoom/pan/teleport, car/paint selection, pause/recovery, desktop/phone
layout and local-request checks. Explicit fixtures cover unavailable WebGL and
denied storage; they do not grant gameplay state. Screenshots are real Chromium
renders, not concept imagery. Software-rendered checks do not prove N100 speed.
Full-fleet release results are recorded separately; targeted checks are not a
replacement for the unchanged all-games push gate.

The current gameplay rules are original pure modules. On-foot collisions,
weapons, health, witnessed offences, building-occluded police sight/search and
respawn live in `gameplay.js`; ordered jobs, cash, owned cars and validated saves
live in `progression.js`. `actor-view.js` renders original adult articulation,
generic patrol vehicles and bounded brief effects. `street-ui.js` adapts menus
and HUD without owning a clock. Two career/discovery storage keys remain local.
No school affiliation, real occupants or police endorsement is implied.

Dedicated landmark models are hand-authored interpretations of verified official
facts and the documented Street View samples. Near/detail and distant skyline
meshes total about 5,232 triangles; clearings only remove generated trees from
the modelled Parliament forecourt and oval playing field. Ground source heights
are unchanged. No reference images are bundled. The reusable local development
skill and bounded checker are in `.agents/skills/capital-drive-development/` and
`scripts/check_capital_drive.py`; neither authorizes publication or hides failures.
