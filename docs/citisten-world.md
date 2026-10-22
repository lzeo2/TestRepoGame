# CITISTEN world maintenance and handover

## Identity and scope

Original terrain/rendering/camera lane for the operator-authorized CITISTEN
project. Standalone entry: `Games/Citisten3D/world.html`. This is a renderer
specimen, not a second game or a catalog registration. No UI, economy, zombie
AI, traffic simulation or wave implementation belongs to this lane.

## Sources and provenance

All terrain, road math, camera, procedural mesh kit and lighting authored for this
project. Generic city-building conventions are mechanics references only; no
borrowed art, maps, saves or game UI. Three.js 0.186.0 is copied unchanged from
the operator-supplied cache, with MIT notice at `vendor/THREE-LICENSE.txt`.
Source project: <https://github.com/mrdoob/three.js/tree/r186>. No npm install.
The local package identifies version 0.186.0; no independent upstream commit
identity was verified in this lane.

Vendored SHA-256:

- `three.module.js`: `9052042d676cb0fdc1ddfefe193053f34b7ac0513a616fdac4535d49987812ea`
- `three.core.js`: `9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6`
- `THREE-LICENSE.txt`: `8b378ebe60e2fe500158cb0ac71cb5e8b7d92953c2abcc63a0eb90499653b5bc`

## Runtime and file ownership

- `world.mjs`: world composition, terrain/grid, road mesh pool, fixed specimen.
- `roads.mjs`: occupancy, placement, shortest paths, lane waypoints.
- `camera.mjs`: eased free camera and input lifecycle.
- `daynight.mjs`: phase-driven light/sky look, no simulation clock.
- `buildings.mjs`: stable-handle instance pool, textured distant LOD and bounded nearby detailed LOD.
- `model-{city,services,agents}.mjs`: 14 original detailed Astra-built procedural models; corresponding Node checks enforce geometry budgets.
- `model-geometry.mjs`: indexed part assembly, vertex shading/wear and window-emission variation.
- `materials.mjs`: locally generated facade/ground/asphalt maps, water normals and city-block contact AO.
- `world-effects.mjs`: 64-slot render-only shot tracer/impact pool, added at the
  sim lane's explicit coordination request; no targeting or damage logic.
- `world-demo.mjs`, `world.html`: standalone specimen, bounded timing samples,
  automatic fly-through stopped by any camera input.
- `world-check.mjs`: dependency-free Node assertion regression.
- `world-qa.py`: bounded Chromium QA and screenshots, no browser downloads.
- `material-qa.py`: bounded one-frame-at-a-time material/model visual fixtures; not a performance measurement.

## Controls and rendering

WASD pans on the horizontal plane relative to yaw. Right/middle drag rotates
pitch/yaw. Wheel changes camera altitude smoothly with hard target limits
2..400m; pitch remains independently controlled. Pitch spans near-vertical
downward through near-vertical upward, so towers can be inspected from street level. Position stays within the world boundary.
Input focus in form controls is ignored; blur clears held keys. `dispose()`
removes listeners and GPU resources. No building collision is intended.

`createWorld(canvas,{size=200,lotSize=10,pixelRatio})` exposes scene, renderer,
camera, controls, roads, roadPool, buildings, dayNight, effects, water, blockAO, render(dt), pickLot and
dispose. Caller owns its animation frame lifecycle. `controls.setPose(pose,
snap=false)` supports scripted fly-throughs; `.target` provides a read-only pose
snapshot. Render automatically resizes from canvas CSS dimensions.

Default map remains 200x200 lots, flat buildable ground with depression noise
only at the outer four lots. Generated 512px grass/asphalt textures add detail;
buildings use a 1024px atlas containing four 512px tiles, roughness/bump maps,
vertex AO/shading and variable window emission. Standard/Physical materials,
ACES tone mapping, sun/moon PCF shadows and an analytic sky SH probe replace the
flat Lambert look. No external assets, downloads, bloom or postprocessing.
A 256px analytic AO texture uses actual static-model poses and 8x8-lot block
density, refreshed only on static changes. This is not ray-baked GI or SSAO.
Water sits at Y=-.4 around the buildable terrain perimeter; scrolling normal and
clearcoat-normal maps animate directional specular without altering roads or
simulation occupancy. It is not a river through buildable lots.
A 64x64 terrain tessellation remains independent of the 200x200 logical grid.
Ground/asphalt polygon offsets and a .5m near plane prevent depth fighting;
grid opacity follows daylight.
Demo pixel ratio is exactly 1 for reproducible 1280x720 measurements. Integrated
world default caps device pixel ratio at 1.5.

## State and integration

API handovers: [roads](citisten-roads-api.md),
[buildings](citisten-buildings-api.md), [day/night](citisten-daynight-api.md).
`populateWorld` is a demo fixture; integrated simulation must not call it.
`?manual` disables the spectator; `?night=1` sets night; `?size=128&perf`
creates a denser 128x128 specimen. Default standalone size remains 200.
`window.citistenWorld` is demo-only diagnostic access, not sim state.

## Verification

Run `node Games/Citisten3D/world-check.mjs` and syntax-check owned `.mjs` files.
Run `python3 -B Games/Citisten3D/world-qa.py` only while no sibling browser gate
is active. It uses explicit system Chromium, 1280x720, isolated loopback port,
terminates its server/browser, checks disk before each evidence write, and
records actual performance without substituting a smaller framebuffer.
`WORLD_GL=swiftshader` explicitly selects the software backend used for the
headless evidence; `WORLD_PERF_ONLY=1` requests only the bounded benchmark.
The answered batch-31/32 contract requires **60 completed rendered warmup
frames**, then a 15-second sample window. `frameCount` is exposed by the demo
for that assertion; the caller clears its rolling samples after warmup and
its checkpoint screenshot. Actual rAF intervals, sample duration and count
are reported; 40fps remains the hard failure threshold. Scene density and
resolution are unchanged. Process checks before launch and each second abort
on a competing browser. A dedicated temporary profile is created inside this
worktree for each run and removed after its browser closes. Global coordination
is still required; a local lane queue alone is insufficient.

`WORLD_HARDWARE_PROBE=1 WORLD_PERF_ONLY=1` selects the one authorized, explicitly
non-canonical `--use-gl=angle --use-angle=gl` probe. It uses the same scene,
resolution, warmup and 40fps threshold. No renderer means no FPS claim and a
hard failure, with the failure screen retained. Canonical resumed evidence is
named `WORLD-performance-60warmup*`; probe evidence is `WORLD-hardware-probe*`.
The earlier `WORLD-performance*` files remain historical 10-second-warmup
measurements and do not satisfy the subsequently answered 60-frame protocol.
Full QA checkpoints its input results before the benchmark so interruption
cannot silently replace a partial run with a complete claim.

Initial Node run: `WORLD CHECK PASS: road edits/routes/lanes/pool, 14 model
types, transforms/removal, day/night interpolation`.
Initial maintenance checker: `PASS: 132 game documents cover 127 registered
+ 5 unregistered games; Git inventory current.` This predates world source
staging/registration and is not new-game inventory acceptance.

### Pre-material-pass world evidence (2026-10-22)

The original A street/overhead and WORLD-night images below belong to the
pre-PBR source at `e2d2df2`; their original bytes remain in Git. The material
pass reuses those requested filenames, not their old native-input acceptance.
Earlier frame timings below do not measure the new renderer.

All files below are in `docs/maintenance/audits/citisten-QA/`. World evidence
is an API/specimen gate, not integrated-game acceptance or reviewer grading.

- `A-world-street.png`, `A-world-overhead.png`: native wheel reached 2.0075m
  and 399.9008m; four native WASD inputs and both right/middle drags exercised.
  Default spectator movement was observed. Details: `WORLD-results.json`.
- `E-world-lanes-fixture.png`: one API fixture car traversed 30 rendered
  positions along a road route including a corner; each position checked against
  road occupancy. This is not systems-owned traffic behavior acceptance E.
- `WORLD-kit.png`, `WORLD-agents.png`: all 14 kit types plus closer citizen,
  hunched zombie and car silhouettes. Kit fronts/town-hall columns inspected.
- `WORLD-day.png`, `WORLD-night.png`: solid day/night sky and lighting look;
  overhead road depth flicker and bright night-grid artifacts corrected and
  recaptured. This is not wave behavior acceptance F.
- `WORLD-performance.png`, `WORLD-performance.json`, `WORLD-performance-run.txt`:
  **render budget HOLD, exit 1**. System Chromium 149.0.7827.196 / ANGLE
  SwiftShader, 1280x720 framebuffer, 128x128 lots, 3,624 model instances,
  3,721 road lots, 248,878 triangles, 19 calls. Measured **1.823968 FPS** over
  29 frames / 15.8994 seconds; median 449.9ms, p95 1233.4ms. Target remains
  40 FPS; no density/framebuffer reduction or acceptance waiver. 25 process
  checks found no competing browser during warmup/measurement. Page errors,
  console errors, failed requests and external requests were empty. Camera
  pitch bounds separately checked at +/-1.5508 radians.

The initial numeric benchmark above used a 10-second warmup. It is
software-renderer evidence, not the later approved 60-frame protocol or proof
that hardware rendering would pass. Previous timeout/failed attempt logs
are retained separately. Traceback host paths were redacted to relative paths.
A fresh hardware-backed run and/or measured rendering optimization is still
needed for the 40fps gate. No more browser process/server is left by this lane.

### Batch 32 approved rerun

Source protocol milestone: `346aebb`. UI confirmed step 1 complete, and sim
confirmed step 2 at `93c9a80`, before world took the slot. The first pair of
commands refused at process preflight, before any world browser launch; both
refusal logs are preserved. After a fresh clear check, the canonical run and
exactly one non-canonical GL probe ran serially with dedicated temporary
profiles. Both returned **exit 1**, retaining the **40fps hard failure**.

| Run | Warmup frames | Sample frames / actual duration | FPS | Process checks |
| --- | ---: | --- | ---: | ---: |
| Canonical SwiftShader | 61 | 36 / 15.9495s | **2.257124** | 43 |
| Non-canonical GL probe | 60 | 33 / 15.8827s | **2.077732** | 41 |

Both used the unchanged 128x128 grid, 1280x720 framebuffer, 3,624 model
instances, 3,721 road lots, 248,878 triangles and 19 draw calls. Canonical
renderer: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 16.0.0)
(0x0000C0DE)), SwiftShader driver)`. Its median/p95 frame intervals were
416.6/816.7ms. The GL probe used `--use-gl=angle --use-angle=gl`; its renderer
query returned **null**, not a hardware identity. Its screenshot contains a
large dark blank region, so hardware acceleration is **inconclusive**, not
established. Do not interpret its rAF timing as a valid native-GPU result.
No second hardware probe was attempted.

Evidence in `docs/maintenance/audits/citisten-QA/`:

- `WORLD-performance-60warmup.json`, `WORLD-performance-60warmup.png`,
  `WORLD-performance-60warmup-warmup.png`, `WORLD-batch32-canonical-run.txt`.
- `WORLD-hardware-probe.json`, `WORLD-hardware-probe.png`,
  `WORLD-hardware-probe-warmup.png`, `WORLD-batch32-hardware-run.txt`.
- `WORLD-batch32-canonical-refused.txt`, `WORLD-batch32-hardware-refused.txt`.

Both reports have empty error/failed-request/external-request arrays and true
`browserClosed`, `serverClosed`, `profileRemoved`. A fresh process and worktree
profile-directory check also found no world resources left. The slot was
explicitly released to sim/Wings; UI requested no further browser time.
Traceback host prefixes are redacted; measured JSON and screenshots are unchanged.
The render budget remains **HOLD**. No catalog change, full-fleet gate or push.

### E road sequence and D utility matrix extension

The operator requested stronger E/D API evidence without changing runtime
ownership. `docs/citisten-design/road-utility-fixtures.mjs` consumes the existing
RoadGrid and simulation APIs. `check-road-utilities.mjs` is the Node assertion
runner; `capture-road-utilities.py` uses the existing world/UI renderers.
No simulation, UI, camera or rendering runtime is replaced or modified.

Run `node docs/citisten-design/check-road-utilities.mjs`. The fixture checks a
real sim-owned car (id 7), its 29-cell L-shaped route and six segment checkpoints
0/7/14/18/24/27, with road occupancy checked on every simulation step. Movement
is exclusively `sim.update(.25)`; rendering follows the selected agent's state.
Only that tracked car is drawn, explicitly labeled in the screenshots.

Nine independent utility cases cover connected supply, power removal, water
removal, both removed, road cut, road restored, power overload, water overload
with sufficient power, and isolated sources with spare aggregate capacity.
Removal is through the bulldoze API, not a claim of zombie-destruction input.
Every case asserts the expected supply result through real economy updates.
The single tracked home can remain supplied while another district is shed;
aggregate unserved demand and the home flags are reported separately.

Run `python3 -B docs/citisten-design/capture-road-utilities.py` only after an
explicit shared-browser handoff. It reuses the guarded sim QA browser check,
uses system Chromium and a dedicated temporary profile, checks disk per write,
and captures six E frames plus nine D cases in both themes. Collages are
unaltered full-size frame grids; captions are QA annotations, not game UI.
The Node check passed. Final guarded recapture with `CAPTURE_SECONDS=60`
completed **exit 0**: **24 screenshots + 3 plates**, no page/console/request
errors or external requests, and verified browser/server/profile cleanup.
Wings explicitly handed off the slot; world explicitly released it to Jankolock
integration afterward. The screenshots and all three plates were inspected.

Evidence in `docs/maintenance/audits/citisten-QA/`:

- `E-car-sequence-01.png` through `06.png`, plus `E-car-sequence.png`: the same
  car id 7 at simulation times 1.5, 6.5, 11.75, 14.75, 19.25 and 21.5 seconds.
  The fixed camera and uncovered tracking label show the turn and distinct
  road segments. `DE-api-results.json` retains the route and 87 on-road
  observations, including the intermediate simulation steps.
- `D-utilities-<case>-<dark|light>.png` and `D-utilities-matrix-dark.png` /
  `D-utilities-matrix-light.png`: nine cases, same ordering in each theme.
  Power overload sheds 34 units while water remains supplied; water overload
  sheds 15 units while power remains supplied. Road restoration recovers both
  home flags. Isolated sources retain 80 power / 100 water capacity but serve
  none of the disconnected demand. Exact values are in `DE-api-results.json`.
- `DE-node-run.txt`, `DE-capture-run.txt`: actual assertion/capture output.

Initial visual review caught an overly broad harness canvas rule and a caption
covering early car positions, fixed with minimap/annotation bounds assertions.
`DE-first-review-*`, `E-car-first-review.png`, `D-utilities-first-review.png`
retain that non-accepted first capture. A later attempt was interrupted to
honor earlier reservations; `DE-queue-yield-run.txt` is not a pass. Its SIGINT
reached Python but Playwright close stalled; the owned alarm handler released
that wait and process/profile absence was verified. `DE-capture-refused.txt`
records an earlier busy preflight. Traceback host paths are redacted.

This is stronger E/D API evidence, not a new integrated-game acceptance grade,
not combat-driven plant destruction, and not a resolution of the 40fps hold.

All five tracked `ui-mockup-{menu,toolbar,hud,nightalert,gameover}.png` plates
already exist and pass PNG verification. Their combined zoning, utilities,
minimap and day/night coverage is documented in `docs/citisten-design/README.md`;
no regeneration or runtime art replacement is needed.

### Procedural material/mesh upgrade (operator order, 2026-10-22)

Blender/bpy is not used. The external [model wishlist](citisten-design/MODEL-WISHLIST.md)
was published immediately at `f515977` as a pure operator art request. Astra
workers delivered original source-only geometry at `f909e39` (city), `377acd5`
(services), `970ba71` (agents); their receipts are `MODEL-*-worker.txt` in the QA
directory. Three zero-argument factory maps preserve the existing 14 type keys.
Geometry/UV/bounds/nondegeneracy checks pass. Detailed counts and dimensions are
in the [mesh API](citisten-buildings-api.md); town hall is 130,904 triangles,
citizen 28,680, zombie 29,604, car 9,936, and each park tree 6,076.

World checks cover stable handles, LOD restoration, PBR atlas dimensions,
contact/block AO invalidation, water-normal motion, finite sky SH coefficients,
shadow settings and disposal. Up to 16 nearest instances/type use high detail;
other instances retain textured blockouts. Visible LOD pops and the limited
shadow region remain known compromises. Triangle counts do not certify realism
or performance. There is no new 40fps result; the old failure remains a hold.

Final material QA completed **exit 0**, with **seven screenshots** at 1280x720
using system Chromium/SwiftShader. The requested `A-world-overhead.png` (400m),
`A-world-street.png` (2m) and `WORLD-night.png` are freshly re-shot. These poses
are API-set, not a new native-wheel/input acceptance. `WORLD-material-kit.png`
and `WORLD-material-agents.png` expose the architecture and detailed static
people/car. `WORLD-water-detail.png` / `WORLD-water-motion.png` show the same
shore framing before/after a .5-second normal-map advance: **456,403 changed
pixels**. The night frame has **7,885 warm window pixels**, with moon shadows.
All seven images were visually inspected. `WORLD-material-results.json` and
`WORLD-material-run.txt` retain the actual checks; errors, failed and external
requests are empty. Owned browser/server/profile cleanup is confirmed and the
shared slot explicitly released. `WORLD-material-node.txt` records four passing
Node checks. These are material/model fixtures, not integrated gameplay or FPS.

The first attempt left an empty log and no completion status;
`WORLD-material-interrupted-run.txt` is not a pass. The next attempt failed the
water pixel-motion assertion. Inspection found black PBR materials: copying a
Color into a Vector3 produced nonfinite sky SH coefficients. Explicit RGB
assignment and a finite-SH regression fixed the source; rejected images/report/
log remain as `WORLD-material-rejected-*`. A subsequent successful API capture
still had regular grass patterning; `WORLD-material-pregrass-*` retains it.
Periodic clumps were replaced by seamless irregular value noise before the final
run. The harness rejects black overhead renders and unlit night windows, not
merely console errors. Traceback host prefixes are redacted.

Subjective result: visibly richer original procedural assets, **not photorealistic
final art**. Repeated forms, abrupt distant blockout LOD, sparse surroundings,
limited shadow coverage, lobed tree crowns and stylized anatomy remain. The
wishlist's current scores are 3..5/10 for present assets; absent car variants
stay at 1. External authored art is still requested; no Blender/bpy was used.

The stale shared-worktree index lock was removed by the operator after
verification, resolving ticket `pi-31413-1792656684902-540247cf` for this commit.
No agent removed that external admin file or bypassed the index. Inventory
refresh must follow the inspected world and concurrent UI source commits.

## Known blockers and inspected-source limits

Only this lane's authored modules and local dependency identity were inspected.
Three.js internals are not audited. The untouched upstream `three.core.js`
contains one pre-existing whitespace warning at line 49957 (space before tab);
authored diffs are checked separately rather than modifying vendored bytes. No touch camera gestures are implemented;
integrated UI lane must address touch controls if included in release scope.
No native GPU or target-device performance claim without a recorded run.
Performance advice ticket `pi-2075770-1792626920824-a20b4c64` was answered in
Hermes batch 31 and resumed in batch 32. It approves the 60-frame warmup +
15-second canonical measurement and one bounded non-canonical hardware probe;
it grants no waiver of the 40fps gate. The earlier browser-coordination ticket
is superseded by that slot clearance, with fresh process guards still required.
E traffic behavior and F waves are systems gates, not proven by static models.
The first Chromium attempt caught an initial negative rAF delta relative to
`performance.now()`; clamping the demo's first delta fixes that startup crash.
Its failed report is retained as `WORLD-first-attempt.json`. A following run
was interrupted after seven screenshots, before performance results; it is
not a completed gate. A later spectator harness assertion used a fixed 700ms
wait that was shorter than software-renderer startup; it now waits for actual
camera movement (still fails if absent). The next full run verified all world
fixtures but timed out waiting for 120 samples after a 60-frame warmup. This
motivated the fixed-time benchmark, not a lower FPS threshold. The old timeout
log's traceback source lines were read from disk after the harness was edited;
its executed wait was the 120-sample version. Final numeric performance evidence
must be distinguished from those attempts.
Town hall is wider than one lot; placement must reserve visual clearance.
The 40fps target is not accepted until measured, and software rendering may be
a host blocker. Reviewer, not builder, assigns acceptance letters.

## Maintenance procedure

Keep edits local; rerun road/model/lighting regression and browser input checks.
Retain the road version invalidation contract and stable swap-removal handles.
Coordinate changes to type names/coordinates with the sim and integration lanes.
Do not mutate `roads.cells` directly. No dependencies or new art are required.

## Shipping gates

No catalog changes or push in this lane. Main orchestrator owns registration,
canonical maintenance inventory/manual integration and the full-fleet gate.
Targeted world QA does not replace the mandatory full registered-game smoke
before any separately authorized push.
