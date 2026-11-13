# Capital Drive: Canberra source and implementation record

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
- Mapzen Terrarium elevation archive: six zoom-13 PNGs decoded to a 129 by 129
  sampled grid. Elevation is stored relative to a 550-metre datum. This retains
  the broad real topography, not kerb-level survey accuracy. Terrain source and
  licence notices are retained in the data folder.

The local snapshot contains 5,197 road sections, 9,523 building outlines and
1,464 green/water polygons. Some outlines are duplicated/inset representations;
the renderer skips 204 wholly nested OSM outlines. Its 9,319 rendered buildings
must not be confused with independently verified current real-world buildings.
All seven destinations connect to the largest road component.

`Games/Capital Drive/data/canberra.json` records projection, source hashes,
snapshot metadata and approximation notes. `data/LICENSE.md` separates OSM ODbL
and ACT CC-BY terms and links the complete retained terrain attribution.
The visible footer and local `credits.html` supply human-readable credit.

## Rebuilding the snapshot

Run the developer-only importer with a cache outside the repository:

```sh
python3 scripts/build_capital_drive_map.py --cache /tmp/capital-drive-import --fetch
```

The import requires Python, curl and Pillow, already available during this run.
They are developer tooling, not browser runtime dependencies. The imported data
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
collisions, the directed road graph and 26 seeded nearby traffic cars. Traffic
uses the left lane, one-ways and simple spacing/junction courtesy. Decorative
signals do not control vehicles; this is not a full road-rule simulation.

`world-view.js` consumes the shared real geometry and bilinear terrain. It uses
350-metre merged chunks, distance culling, procedural road textures/sign atlases,
estimated footprint architecture and 9,000 distributed low-cost trees. Facade
details, landscaping and street furniture are interpretations, not photogrammetry.

`pedestrians.js` adds 80 fictional adult walkers on collision-checked sidewalk
paths. It uses eight instanced body-part batches, animated limbs, terrain-matched
shoes and simple car avoidance. `neighbourhood.js` adds 2,800 footprint frontages
with driveways, hedges, low fences, letterboxes and doors, plus lamps, benches,
bins and original generic shop signs. These details are original interpretations,
not evidence of actual occupants, businesses or current landscaping.

`script.js` owns the single animation loop, input lifecycle, rendering, camera,
local maps, vehicle selection, menus and discovery. `navigation.js` routes over
the simulation's directed graph. The local `capital-drive-v1` save contains only
the version and discovered landmark IDs. Invalid/denied storage is reported and
not silently overwritten. No other game's storage is read or cleared.

Browsers without WebGL receive an explicitly labelled playable top-down map
view using the same driving/traffic rules. That fallback is distinct from 3D
acceptance. Low mode targets 30 FPS and caps drawing resolution; standard targets
60 FPS. These are scheduling targets, not measured hardware guarantees.

## Verification

Pure regressions cover one-ways, connected routing, left lanes, acceleration,
reverse, braking, steering/drift, footprint boundary contacts, parked obstacles,
traffic spacing/locality, recovery and directed navigation. The actual snapshot
test uses 28,323 nodes and 48,290 directed edges through a 60-second simulation.

`scripts/test_capital_drive_browser.py` runs normal-input interaction, discovery
and save reload, map routes, car/paint selection, pause/recovery, desktop/phone
layout and local-request checks. Explicit fixtures cover unavailable WebGL and
denied storage; they do not grant gameplay state. Screenshots are real Chromium
renders, not concept imagery. Software-rendered checks do not prove N100 speed.
Full-fleet release results are recorded separately; targeted checks are not a
replacement for the unchanged all-games push gate.
