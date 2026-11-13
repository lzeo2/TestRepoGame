# Capital Drive detail and teleport iteration, 13 November 2026

This continues existing original game **245**, Capital Drive: Canberra. No game
was added or registered in this iteration. Catalog remains **133**, with **139**
projects and **six** unregistered projects. PR #6 was already merged into main;
the new changes are prepared on `feat/canberra-world-detail` for a follow-up
draft review. This is not a merge or deployment decision.

## Changes

- **12,572** real-source building outlines, up from 9,523: 4,663 ACT, 4,886 OSM,
  3,023 Microsoft GlobalML. Polygon-overlap suppression replaces centre-distance
  filtering. The renderer draws 12,562 after ten nested outlines are skipped.
  All 5,197 road runs, bounds, destination coordinates and spawn are unchanged.
- Terrain changes from a 129 by 129 Mapzen grid to **513 by 513** ACT 2020
  LiDAR-derived contour interpolation, approximately 12.60 by 11.74 metre cells.
  It uses 2,130 actual two-metre AHD contours, 187,807 source samples and no
  nearest/old-source/invented fill. This is not the native one-metre DEM.
- Local procedural brick/render/roof/grass surfaces, multistorey framed windows,
  eaves/chimneys, concave-footprint roof triangulation, broadleaf tree canopies,
  soft contact shadows and 4,200 frontage gardens/driveways replace the sparser
  treatment. School and shopping areas receive more recognisable details.
  School window allocation covers all 35 long facades within the existing
  120-window budget, and the arches face NSW Crescent. Bounded paved forecourts
  connect 38 Manuka/Kingston commercial setbacks to the derived sidewalk:
  13,364 triangles, approximately 9,043m², within an 18,000-triangle ceiling.
- Four exterior Street View panoramas displaying March 2026 imagery were
  actually inspected at Telopea/NSW Crescent, Manuka/Flinders Way,
  Kingston/Giles Street and Red Hill/Pelsart Street. The
  [reference record](../capital-drive-street-references.md) identifies coordinates,
  observations and approximation limits. No Google imagery was bundled.
- **M** opens the map. Zoom, pan and select a point, then **Teleport here**
  confirms. Arrows adjust the point and Enter confirms. Clear off-road ground
  remains exact; building/water/occupied destinations adjust to clear ground.
  Teleporting preserves driven distance and resets movement, camera and walkers.

## Validation

The focused browser integration reports **36 passed**, zero console/page errors,
zero failed local requests and zero third-party runtime requests. It uses real
keyboard/mouse/touch events for driving/drift, moving walkers, pause, map zoom,
drag/pan, CSS-scaled point selection, exact park teleport, keyboard confirmation,
all seven discoveries, car/paint selection, recovery and save reload. Desktop
and phone screenshots cover both themes. Separate explicit fixtures test denied
storage and unavailable WebGL; neither is treated as 3D acceptance.

One parallel capture attempt failed the driving check while it used fixed
1.1/0.5-second input durations. `ef3df90` changes those waits to bounded observed
travel/steering conditions with real keys held; the original movement assertion
is unchanged. The final single-browser run is the 36-check result above. No
failure was filtered or reclassified, and this does not establish hardware FPS.

The [machine receipt](capital-drive-browser-2026-11-13.json) records the result.
[Actual previews](../capital-drive-previews/README.md) are software WebGL captures,
not concept imagery or a measured N100 benchmark.
The final browser pass used `ef3df90`; subsequent changes only format source
notices or add evidence/inventory documentation. The
[preview diagnostics](capital-drive-renderer-2026-11-13.json) include a working
3D frame with 80 draw calls and 326,767 rendered triangles at Red Hill; that
single software frame is not a hardware performance result.

Pure checks passed:

```text
PASS connected directed road graph, one-way directions, left lanes and legal navigation
PASS teleport exact off-road arrival, building/water/edge safety, invalid rejection and preserved trip statistics
PASS actual map: 28323 nodes, 48290 directed edges, 12572 indexed buildings, 26 cars
PASS actual Canberra map: 80 adults, 3153 safe paths, 59 initially visible, <=8 draws
PASS neighbourhood finite geometry, upward pavement, real frontage, park/building avoidance, culling and disposal
PASS bounded retail aprons: facade-to-sidewalk connection, finite/upward draped surfaces, residential exclusion and road/park/building clipping
PASS actual map: 38 retail footprints, 13364 apron triangles, 9043 square metres
PASS world bilinear DEM, multistorey facade, concave roof containment, asphalt clearance, finite geometry, culling and disposal
PASS actual ACT school: 35 long facades have both window rows; 120 windows; arches face NSW Crescent
PASS geodata: 12572 attributed real-source outlines; 513x513 ACT contour terrain
PASS map pointer projection, CSS scaling, zoom, boundary and unmapped padding
```

The actual-map simulation includes a 60-second soak. Terrain checks cover finite
AHD heights, preserved geometry contract, source counts/hashes and disclosed
interpolation residuals. Map projection checks include all four fractional
boundary corners on desktop and phone dimensions, invalid coordinates and CSS
scaling. Syntax, Python AST and whitespace checks passed for changed authored
files. Sitemap validation remains 133 Git-backed entries plus the portal.

## Limits and release status

Held-out contour residuals have median absolute difference **0.071m**, p95
**0.609m**, maximum **37.615m**. They measure interpolation consistency, not
independent survey accuracy. The final terrain includes every contour sample;
the large maximum residual and unsampled peaks/depressions remain disclosed.
Building heights, ordinary facades, vegetation and furniture are still estimates.
Four Street View checks do not establish whole-district visual correspondence.

The intended Intel N100 / 8 GB target has not been profiled. Low/standard 30/60 FPS
are scheduling targets. Software rendering demonstrates working shaders and
interaction, not target-device performance. Rendering culls spatial chunks and
distant facade details; the larger map and architecture still need owner hardware
acceptance. Whole Canberra, missions, police and on-foot play remain future work.

The unchanged full-catalog gate was **not rerun for this draft-only iteration**.
The dated [12 November receipt](capital-drive-2026-11-12.md) retains the previous
**123/133, exit 1, release HOLD** result: ten other games failed certificate
validation; Capital Drive passed that run. It is not a fresh all-games result
for this revision. The prior operator authorization to upload a draft for review
does not convert that hold into merge/deployment acceptance. No smoke filters,
TLS rules, proxy settings, shared car code or other games were changed.

## Reproduction

```sh
node scripts/test_capital_drive.mjs 'Games/Capital Drive/data/canberra.json'
node scripts/test_capital_pedestrians.mjs
node scripts/test_capital_neighbourhood.mjs
node scripts/test_capital_world.mjs
node scripts/test_capital_geodata.mjs
node scripts/test_capital_map.mjs
python3 scripts/test_capital_drive_browser.py --output <external-output>
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
git diff --check
```

Browser tooling, raw source archives and enriched-import Python libraries stay
outside the repository. Runtime remains static and local. Temporary QA servers
terminate after their captures; the separate playable ZIP includes the game,
necessary local dependencies, notices and launch instructions.

## Source milestones and footprint

Subagents handled separate simulation, geodata and scenery paths; a read-only
integration review caught pointer-ID routing and floating boundary issues, both
fixed in the root map integration. The last two scenery fixes were prompted by
actual runtime preview review. Workers committed explicit owned paths, with
exclusive index windows and no worker pushes.

| Commit | Scope | Primary source Git blob |
| --- | --- | --- |
| `9afe2f5` | Safe arbitrary teleport placement; simulation regression | `simulation.js`: `0dcbeb976c231f49bf35576df4f07a0e9af3446f` |
| `5a2c9f9` | Enriched footprints, contour terrain, import and source validation | `data/canberra.json`: `04810b99bf32be26d0b18d521ffad16ba9489a49` |
| `4739537` | Architecture, surfaces, canopy and fuller neighbourhood | `world-view.js`: `6eaeb9cb862e3cf145e25fffc6f0c1c2e1eca6b2` |
| `964ac8a` | Root map selection/zoom/pan/teleport, input guards and browser checks | Root integration commit |
| `e5d21ad` | School facade coverage and street-facing arches | `world-view.js`: `7eb6d9e20247f8f02dbaec4af58f1f86e6069045` |
| `28ff2dc` | Clear commercial frontage paving and avoidance checks | `neighbourhood.js`: `fed108feb437a328e40adf2692b6596504a23843` |
| `ef3df90` | Wait for actual movement/steering in the browser harness | Assertion thresholds retained |

Source paths above are under `Games/Capital Drive/`; tests/importer paths are
under `scripts/`. The 7,791,998-byte map JSON has SHA-256
`f62bdacc290865799023f461b0be923d0fc48a8a7ca75fcfb241637c5790f425`
and records 42 consumed-input hashes. Game payload grows from 5,633,251 to
7,986,198 bytes (**+2,352,947 bytes**); unchanged shared assets are excluded.
More than 27GiB disk remained free. Verification docs, previews and maintenance
inventory reconciliation are committed separately from the implementation.
