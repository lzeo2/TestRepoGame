# Capital Drive: Canberra

<!-- maintenance-game: Games/Capital Drive -->

## Identity and status

Original operator-authorized Canberra driving/exploration preview. Entry
`Games/Capital Drive/index.html`, catalog allocation 245, arcade category.
First district: Canberra's inner south. Expansion across Canberra, on-foot play,
police pursuits and missions are not included in this milestone.

## Implementation map

- `script.js`: boot, local data loading, renderer/camera/input/menu ownership,
  parked meshes, map zoom/pan/teleport, discovery and save handling.
- `simulation.js`: `createSimulation`, `buildRoadGraph`, `pointOnLane`, indexed
  collision, connected left-hand traffic, `setParkedCars`, safe `teleport` and recovery.
- `map-projection.js`: shared drawing/input transform, CSS scaling and boundary handling.
- `navigation.js`: shortest directed road routes for the exploration map.
- `world-view.js`: bilinear terrain, adaptive road ribbons/bend joins, merged
  spatial chunks, estimated footprint architecture, trees and street signs.
- `pedestrians.js`: pooled animated sidewalk pedestrians and car avoidance.
- `neighbourhood.js`: footprint frontage gardens, driveways, fences, letterboxes,
  lamps, benches, bins, clipped retail paving and generic shop signs, with spatial culling.
- `data/canberra.json`: local OSM/ACT/Microsoft snapshot and ACT contour terrain; geometry
  for rendering, traffic, collision and minimap.

## Gameplay and controls

Start driving from New South Wales Crescent beside Telopea Park School. WASD or
arrows drive, S brakes then reverses, Space handbrakes, Shift boosts. Drag the
mouse to orbit, H horns with audio enabled, R recovers, M opens the map, P/Esc
pauses. Touch buttons offer driving input on small/coarse-pointer devices.

The map sets road routes, starts a drive near seven public destinations, or
teleports to any selected point inside the loaded boundary. Scroll/buttons zoom,
drag pans, click/tap selects and **Teleport here** confirms. Focused map arrows
move the selected point (Shift for larger steps); Enter confirms. Clear off-road
points stay exact; buildings, water and occupied spots adjust to clear ground.
Enter each destination radius to discover it; all seven complete the exploration objective while
free driving remains available. Vehicles and paint are freely selectable.
There is no money economy, combat or real branded vehicle claim. Eighty fictional
adult pedestrians walk on derived footpaths with simple car avoidance.

## State and persistence

One controller animation loop advances a capped 60-Hz simulation; rendering
uses the selected 30/60 FPS target. Dialogs, blur and hidden tabs clear input and
pause movement. `pagehide` releases the loop, audio and graphics resources.
Recovery stops/repositions the car on a road; ambient traffic remains active.
Arbitrary teleports stop steering/velocity, preserve driven distance/crash counts,
repopulate walkers and reset the chase camera. Selecting a point alone does not move.

`capital-drive-v1` saves only version 1 and validated discovered IDs. Oversized,
wrong-shaped, corrupt or denied saves report errors and disable overwriting.
No origin-wide clear, network state, account, multiplayer or shared save API.
`capitalDriveSnapshot()` returns frozen read-only QA diagnostics, not setters.

## Dependencies and provenance

See [source record](../../capital-drive-sources.md) and local game credits.
OSM roads/outlines: © OpenStreetMap contributors, ODbL 1.0. ACT building outlines:
© Australian Capital Territory, CC-BY 4.0. Additional Microsoft GlobalML outlines:
CDLA-Permissive 2.0. Current terrain: ACT 2020 LiDAR-derived two-metre AHD contours,
CC-BY 4.0, interpolated to 513 by 513 cells (about twelve metres). It is not the
native one-metre DEM. Historical Mapzen/USGS/GA attribution is retained separately.
Four March 2026 Street View exteriors informed original school/shop/verge details;
see [reference notes](../../capital-drive-street-references.md). No Google imagery
is bundled. Building heights, facades, trees and furniture are visual interpretations.
Local Three.js r160 MIT, existing original fictional
car factory and local Atkinson OFL font are unchanged. No external runtime loads.

## Audit findings

- Visual fidelity is limited by estimated architecture, procedural vegetation and
  incomplete/machine-derived footprints. Four inspected Street View locations do
  not establish address-by-address or whole-city correspondence; no photogrammetry.
- Contour interpolation does not reproduce kerbs, road cuts or every local peak.
  Held-out contour residuals: median 0.071m, p95 0.609m, maximum 37.615m. This is
  numerical consistency, not independent survey accuracy; the maximum is retained.
- Real N100 / 8 GB performance, native local hardware and extended driving remain
  owner acceptance tasks. Headless/software frames do not establish hardware FPS.
- Signals are scenic; AI uses simplified spacing/courtesy, not signal compliance.
- 3D-unavailable browsers show an explicit 2D compatibility view. Do not report
  that view as successful native 3D rendering.
- Some map components are isolated access roads. Destinations use the main
  connected network; a missing route reports failure rather than inventing one.

## Safe iteration

Preserve graph/mesh/minimap coordinate agreement and left-lane/one-way semantics.
Expand through bounded data districts and culling budgets. Improve selected
landmark facades from verified references with appropriate rights; do not import
Street View photos or proprietary game assets. Keep shared car/fleet ABI and
other games unchanged. Do not turn rendering estimates into source data claims.

## Verification

```sh
node scripts/test_capital_drive.mjs 'Games/Capital Drive/data/canberra.json'
node scripts/test_capital_pedestrians.mjs
node scripts/test_capital_neighbourhood.mjs
node scripts/test_capital_world.mjs
node scripts/test_capital_geodata.mjs
node scripts/test_capital_map.mjs
python3 scripts/test_capital_drive_browser.py
node --check 'Games/Capital Drive/script.js'
node --check 'Games/Capital Drive/world-view.js'
node --check 'Games/Capital Drive/navigation.js'
git diff --check
```

The pure actual-map regression passed on 28,323 nodes, 48,290 directed edges,
12,572 indexed outlines and 26 cars through 60 seconds of simulated time. Static
geometry checks cover finite buffers, multistorey windows, concave roof containment,
bilinear terrain, asphalt clearance, culling and disposal. The
[13 November receipt](../../verification/capital-drive-2026-11-13.md) records
36 browser checks and the current preview changes. The
[historical release receipt](../../verification/capital-drive-2026-11-12.md)
retains the held 123/133 full fleet result; these checks are not full
gameplay, real hardware or city-wide fidelity certification.

## Future outlook

Review the Telopea facade, Manuka/Kingston junction treatments and Red Hill slopes
with owner feedback, then profile the intended N100. Add verified road
furniture and improved lane/intersection rules. Expand adjacent Canberra
districts using bounded snapshots/visibility budgets. On-foot play, pursuits and
missions follow a stable recognisable driving district; they are future scope.
