# Capital Drive mission guidance and map census

## Coverage

| Surface | Exercise | Result |
| --- | --- | --- |
| Roads | Enumerated every road and consecutive source segment, verified graph directions and sampled support at three positions per segment | 27,417 roads, 155,465 segments, 253,236 directed graph edges and 466,395 finite support checks |
| Lane clearance | Placed a saloon at 10%, 50% and 90% on every traffic-eligible directed edge, using all 3,074 static barriers registered by the production factories | 639,234 probes on 213,078 directed edges. 1,465 occupied probes on 305 roads |
| Bridge joins | Compared deck height and the connecting ordinary road at every shared approach endpoint | 841 comparisons with zero height difference after correcting branched abutments. Previous maximum 1.406 m |
| Terrain and transport | Checked all heights in the nine source grids, sampled 956 bridge spans and resolved signals, rail lines and stops | 379,592 finite terrain cells, 339 mapped signals, four rail lines and 14 stops. Short bridge grades reach 22% |
| Map drawing and search | Drew every source polygon through the detail renderer, checked rings and projected vertices, then searched the place names and aliases | 42,406 buildings, 1,533 areas, 21 holes and 499,530 vertices. 1,446 searches across 560 places |
| World geometry | Loaded every streamed generic world district in low and standard modes. Checked submitted vertices, indices, normals, bounds, loading limits and disposal | 4,872 districts in each mode. 12,140,286 low and 23,118,422 standard triangles. Zero collapsed triangles. Peak resident geometry buffers 23,471,424 and 50,288,238 bytes respectively |
| Specialized exteriors | Exercised 25 production factories over 4,137 focus positions each, including Civic, Memorial, airport, neighbourhoods, shops, services, rail and signals | All 8,001 observed geometry allocations disposed. Attribute, index, transform, bounds and live instance checks passed |
| Public and residential interiors | Used actual room entry and exit with the matching exterior IDs. Checked every admitted house plan, plus mesh attributes on a stratified sample | 40 public/store rooms, 4,200 source-backed exterior descriptors and 3,627 eligible lazy house plans. Rendered 51 representative house meshes |
| Story progression | Exercised all three protagonists, the meeting and shared chapters with the domain harness | All 24 main chapters reached completion. Native play sampled individual objectives |

The previous facet pass found 76 submitted triangles collapsed by Float32
rounding in each graphics mode. Emission now uses the final vertex precision
for winding and skips collapsed faces. Canopy cards intentionally use rounded
lighting normals on double-sided geometry. Specialized landmark meshes, actors
and vehicles have separate tests. The district count covers generic streamed
world batches. The separate exterior audit records redundant zero-area faces
in dome caps, tapered ramp skirts, capsule poles and Civic clipping. These
contribute no visible surface. It also distinguishes pooled geometry that was
deliberately nulled for culling.

## Native play

In fresh Chromium profiles, keyboard and mouse inputs opened the gallery case,
produced a wrong-symbol response and advanced the corrected sequence to the
exit objective. On build `8e37de493dd5`, the opening of Milo’s campaign led
the player around the parked car and through the house door. Q selected the
marked case even with the television in range. Completing the symbols
produced one packed-case receipt and advanced the mission to Step 2 of 4.
That run reached the title screen in 72.7 seconds using software WebGL.
The measured time includes loading the game on the shared cloud machine.

[Mission plan](capital-drive-guidance-2026-11-25/mission-plan.png) · [Case activity](capital-drive-guidance-2026-11-25/case-symbols.png)

The native regression uses a fresh directory outside the checkout and checks
the displayed build. The worker is disabled in this scenario to isolate
gameplay. Cache installation has its own browser scenario.

```sh
python3 -B scripts/test_capital_mission_guide_browser.py --build 8e37de493dd5 --output /tmp/capital-campaign-guide-run
```

## Open road findings

The [305-row clearance list](capital-drive-road-clearance-2026-11-25.csv)
identifies the road and affected zero-based source segments. Of the 305 roads,
283 are service roads. Mapped indoor and covered parking lanes can intersect
solid garage meshes. The source-only run found 1,461 occupied probes across
304 roads. Including scene-generated structures adds four Barrine Drive probes
where the model leaves too little clearance under Commonwealth Avenue.

Bowen Drive and Flynn Drive previously contacted the rail or parapet of the
road overhead. Tests now exercise car and foot contacts on both levels.
Remaining examples include the Adelaide Avenue guardrail near Hopetoun Circuit
and the Manuka Circle pool fence. The road graph has 247 weakly connected
traffic-eligible components. The census preserves the mapped separations.

A clear sample establishes a stationary placement for one vehicle. Turns,
other vehicle dimensions, dynamic traffic and user-driven trips can produce
additional collisions. These tests cover the shipped map and its source data.
Street-level geographic correspondence requires independent reference evidence.

## Reproduce

Run these commands from the repository root. The full check includes the
census as an optional group.

```sh
python3 -B scripts/check_capital_drive.py --map-census
node scripts/test_capital_all_roads.mjs --world-obstacles --json > /tmp/capital-roads.json
node scripts/test_capital_map_infrastructure.mjs
node scripts/test_capital_map_features.mjs --world-obstacles
node scripts/test_capital_all_facets.mjs
node scripts/test_capital_exterior_meshes.mjs
node scripts/test_capital_mission_footpath.mjs --actual
node scripts/test_capital_campaign_playability.mjs
node scripts/test_capital_heist_guidance.mjs
```

Add `--strict-clearance` to the road command to make outstanding obstructions
fail the process. The structural, infrastructure and mesh assertions run
independently. The map fixture uses the same source-pack composition as browser
startup. The world-obstacle run also instantiates the barrier-producing
factories in boot order.
