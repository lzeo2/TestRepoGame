# CITISTEN world maintenance and handover

## Identity and scope

Original terrain/rendering/camera lane for the operator-authorized CITISTEN
project. Standalone entry: `Games/Citisten3D/world.html`. This is a renderer
specimen, not a second game or a catalog registration. No UI, economy, zombie
AI, traffic simulation or wave implementation belongs to this lane.

## Sources and provenance

All terrain, road math, camera, box-model kit and lighting authored for this
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
- `buildings.mjs`: 14 flat-color models and instanced transform pool.
- `world-effects.mjs`: 64-slot render-only shot tracer/impact pool, added at the
  sim lane's explicit coordination request; no targeting or damage logic.
- `world-demo.mjs`, `world.html`: standalone specimen, bounded timing samples,
  automatic fly-through stopped by any camera input.
- `world-check.mjs`: dependency-free Node assertion regression.
- `world-qa.py`: bounded Chromium QA and screenshots, no browser downloads.

## Controls and rendering

WASD pans on the horizontal plane relative to yaw. Right/middle drag rotates
pitch/yaw. Wheel changes camera altitude smoothly with hard target limits
2..400m; pitch remains independently controlled. Pitch spans near-vertical
downward through slightly upward. Position stays within the world boundary.
Input focus in form controls is ignored; blur clears held keys. `dispose()`
removes listeners and GPU resources. No building collision is intended.

`createWorld(canvas,{size=200,lotSize=10,pixelRatio})` exposes scene, renderer,
camera, controls, roads, roadPool, buildings, dayNight, effects, render(dt), pickLot and
dispose. Caller owns its animation frame lifecycle. `controls.setPose(pose,
snap=false)` supports scripted fly-throughs; `.target` provides a read-only pose
snapshot. Render automatically resizes from canvas CSS dimensions.

Default map is 200x200 lots with flat green base and depression noise only at
outer four lots. Grid lines and asphalt are flat; building colors are vertex
colors. No textures, dynamic shadows, postprocessing or runtime remote loads. A 64x64
terrain tessellation is independent of the 200x200 logical lot grid. Ground and
asphalt polygon offsets plus a .5m near plane prevent depth fighting overhead;
grid opacity follows daylight so unlit line colors do not overpower night.
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
Full QA checkpoints its input results before the benchmark so interruption
cannot silently replace a partial run with a complete claim.

Initial Node run: `WORLD CHECK PASS: road edits/routes/lanes/pool, 14 model
types, transforms/removal, day/night interpolation`.
Initial maintenance checker: `PASS: 132 game documents cover 127 registered
+ 5 unregistered games; Git inventory current.` This predates world source
staging/registration and is not new-game inventory acceptance.

## Known blockers and inspected-source limits

Only this lane's authored modules and local dependency identity were inspected.
Three.js internals are not audited. The untouched upstream `three.core.js`
contains one pre-existing whitespace warning at line 49957 (space before tab);
authored diffs are checked separately rather than modifying vendored bytes. No touch camera gestures are implemented;
integrated UI lane must address touch controls if included in release scope.
No native GPU or target-device performance claim without the recorded run.
E traffic behavior and F waves are systems gates, not proven by static models.
The first Chromium attempt caught an initial negative rAF delta relative to
`performance.now()`; clamping the demo's first delta fixes that startup crash.
Its failed report is retained as `WORLD-first-attempt.json`. A following run
was interrupted after seven screenshots, before performance results; it is
not a completed gate. Final evidence must be distinguished from those attempts.
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
