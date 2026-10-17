# Wings v2 resume: fresh study and phase receipts

## Phase 0: orchestrator study

Resume baseline: `956ef48`, clean tree, 3.2 GB free. The checkout advanced while
this session was stopped. The v2 brief's empty-array/white-airframe description
is historical: current descriptors already contain stores and exhaust, and
`92e470f` / `80d88ae` implemented the geometry/runtime repair. Preserve that work;
verify phases in order rather than overwrite it with a second implementation.
No implementation edit preceded this study. No push or origin write is authorized.
The repository's stricter 2 GiB storage floor remains in force.

Read the brief, standing aircraft contract, current models/repair study/acceptance,
maintenance manual/inventory, authored generator and CPU regression, and current
built aircraft descriptors. Retrieved nine individual source files read-only
from anomalyco/arcade pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181` for
inspection, not runtime dependencies. Read `render/aircraft.ts`, `toon.ts`,
`scene.ts`, `camera.ts`, `sim/vehicles.ts`, relevant spawn/combat/bot boundaries
and `audio/engines.ts`, comparing authored changes in `port.patch` and generated
registry `aircraft-BIwDLCoz.js`. This is a boundary study, not a whole-engine audit.
Hivemind was unavailable (not authenticated; fallback memory directory absent).

### Original-model measurements

Loaded all five original selectable GLBs and both jets with the existing external
Three 0.180.0 GLTFLoader for geometry-only bounds. This is not a 0.186.0 runtime
or rendered-parity test. Serialized counts and material colors were independently
read with Python stdlib. All scene roots have identity scale/rotation.

| Model | Triangles | Bytes | Assignments / unique base colors | Loaded X/Y/Z bounds |
| --- | ---: | ---: | --- | --- |
| F/A-18 | 16,896 | 912,784 | 151 / 10 | 13.5923 / 5.2636 / 18.6550 |
| A-10 | 17,576 | 952,180 | 166 / 12 | 17.8440 / 4.6350 / 16.5300 |
| YF-12 | 18,028 | 780,572 | 123 / 12 | 17.4600 / 5.8585 / 32.2200 |
| Apache | 11,322 | 745,072 | 202 / 10 | 10.8187 / 5.0250 / 17.1133 |
| B-2 | 4,740 | 283,788 | 96 / 10 | 52.6864 / 5.2781 / 21.2862 |
| F-15 | 41,352 | 1,176,316 | 142 / 12 | 13 / 4.315 / 19.44 |
| F-35 | 40,812 | 1,174,768 | 143 / 12 | 10.7 / 3.313559 / 15.7 |

Original assets duplicate material definitions per primitive. F/A-18 has slate
hull, pale belly/stores and team-blue accents; A-10 has olive panels; YF-12 has
charcoal surfaces. They are not literally all black. New hull material colors
are linearized sRGB #232628, #2c2f30, #292c2e, #1d1f20 and #222527; glass,
metal, missiles, livery and emissive cores are intentionally separate.

### Renderer and gameplay interface

- The converter normalizes to aircraft-root space, attaches geometry to the
  nearest configured pivot, bakes rigid skin weights, applies 55-degree creased
  normals and merges paint/metal/livery/glass/emissive batches. Missing pivots
  warn; named empty anchors alone do not animate anything.
- F/A-18 has four underwing and two wingtip missile pivots, two nozzle pivots,
  pilots/gear and a targeting pod. Pilot secondary controls four visible stores,
  officer slots control two. Its locally rotated nozzle cones use -Y, length 1.5.
  YF-12 has three internal stores, twin +Z cones of length 2.4 and moving fins.
  Its original store mapping points at empty pilot slots although AIM-47 belongs
  to the officer: an inherited mismatch, not a pattern to copy into new jets.
- A-10's two stores follow officer slots; barrel/fan spinners use the same rigid
  skeleton. Apache has eight Hellfire stores, rotor spinners and chin turret.
  B-2 has eight bomb stores and hinged doors, dim buried exhaust rather than
  afterburner cones. Original-five behavior is outside this rework's edit scope.
- Store visibility is ceil(ammo/capacity * number of stores), depleted in declared
  order. New jets correctly use two physical stores for each two-round slot.
  Combat launch points are separate from render anchors; the port now rotates
  model-derived hardpoints into world space. Ballistic fire, missile fire and
  combat aim helpers call the shared muzzle boundary.
- Exhaust cones are generated from nozzle subtree cross-sections, attached to
  nozzle bones, and point along the configured local axis. Throttle above .7
  shows cones; boost stretches them and increases HDR glow. This is render-state
  animation, not GLB clips. New jets use twin/single +Z cones respectively.
- Doors use held firing hints and smoothed signed rotations. F-35 selects pilot
  secondary and officer primary, excluding cannon fire. The continuation clears
  stale hints on seat change, pause and ownership loss. Native missile emergence
  and converted family comparison remain open, despite CPU fixture coverage.
- `toon.ts` ordinarily lifts near-black paint toward gunmetal. The current port
  preserves authored hull colors only for F-15/F-35, retaining original-five
  remaps. Scene uses node materials, ACES, quality-dependent shadows/bloom;
  Low bypasses postprocessing. Thumbnails use the actual converter, unlike raw
  standard-Three preview images. Shadows use descriptor span/length and terrain.
- Custom selection/hangar -> validated spawn -> carrier position -> flight and
  weapons -> snapshots -> view. Seven selectable kinds; bot weights stay original
  3/2/2/1.2/.9, plus zero for both new jets. F-15 is 155/215 m/s with cannon20,
  AIM-9 and officer Maverick. F-35 is 130/180 with cannon20 and two independent
  seat slots of radar missiles, using existing stealth rules. Pilot seekers use
  nose direction; officer turret seekers use seat aim. No new weapon ID is needed.
- Cockpit offsets are body-local and rotated with the aircraft. Gunner/bombsight
  offsets add model-specific forward/down clearance; new values and chase sizes
  are in the patch. CPU checks compose GLB ancestry for gun/missile origins and
  compare camera anchors. Both jets reuse the existing fighter procedural engine
  voice, with separate reference/loudness settings; this is not recorded F-15/F-35
  audio. Native listening remains unverified.

### Study findings and ordered work

Current maintenance check: `PASS: 130 game documents cover 125 registered + 5
unregistered games; Git inventory current.` No historical acceptance is promoted.
Existing saved family/top/side images were opened: both jets are dark, with
separate twin/single-engine silhouettes and visible F-15 external stores. These
are historical raw previews, not fresh visual acceptance.

Proceed through Phase 1 palette, Phase 2 shape, Phase 3 exhaust, Phase 4 weapons,
then Phase 5 current regressions/previews. Delegate bounded verification of
already-implemented phases; make only demonstrated fixes. A concrete Phase 5
finding: `check-models-browser.py` still expects old 112/109 draws and
43,392/42,760 triangles, whereas current assets are 142/143 and 41,352/40,812.
Its fixture also lacks reproducible top/side/family controls used for the saved
review images. Exact Three 0.186.0 was not found in the existing Bun cache; do not
silently substitute 0.180.0 for runtime evidence or install dependencies.

Operator visual approval, native missile fire, converted-family parity, hardware
and rights gates remain distinct from structural passes. No new game or ID.
