# Citisten world stability diagnosis, lane 55

## Result

**No demonstrated entire-world shaking cause in the tested common world path.
No game file changed.** The actual user report remains unresolved, not disproved.
Site versus private Chromebook v2 export, device, browser, camera position and
whether shaking persists while paused/no-input are still unknown.

The new executable is `scripts/citisten_world_stability_check.mjs`. Its CPU
results do not establish pixels, CSS/compositor behavior, GPU precision, FPS,
native Water/Save/Continue or supported-device acceptance. No blind native retry.
Parent owns manual/inventory/native integration and release owner `74b61fa7`
receives any later demonstrated fix for serial deployment. No push here.

## Run identity and source

- Sole agent, model `gpt-6-astra`, session
  `01a17ca2-cf3c-72df-93d1-7e35295bb547`; no subagents.
- Session log basename:
  `2026-10-27T09-13-27-104Z_01a17ca2-cf3c-72df-93d1-7e35295bb547.jsonl`.
- First command: 2026-10-27 09:13:35 UTC. Hard deadline: 09:25:35 UTC.
- Baseline HEAD `de3ec4e6ba540e8b44c78b021f4a413490169d00`.
  Game tree `cf589170731afb5e3f974305a449045fc225ac14`,
  226 tracked files / 35,157,269 bytes. Current inventory agrees.
- Existing dirty `docs/citisten-shaking-dispatch.md` belongs to parent and is
  untouched. This lane owns only the new executable and this receipt.
- No models, licenses, saves, binaries, exports, dependencies or catalog changes.
  No game added, asset copy, browser, server, install, upload or release gate.

Read the complete game manual, quality rules, maintenance entry, inventory record
and current dispatch. Inspected world, day/night, terrain/material adapters,
atmosphere/lamps, river, external models, city supplements, world/event effects,
building shaders, native/actions/loop/camera and specimen callers. Traced legacy
material/memory/simulation QA callers too; these stage explicit camera/light
changes, not another live native world writer. Vendor matrix, precision, depth
and polygon-offset paths were inspected read-only.

## Actual shared runtime

`native.mjs:tick` updates simulation, synchronizes model handles and incidents,
approaches the visual phase, selects weather, then calls `world.render` with a
0.25-second cap. `world-demo.mjs` deliberately tours unless manual/input stops
it. No specimen tour is called by native. Native owns RAF through its separate
loop, which is sister lane 54's boundary.

`world.render` reads client dimensions and resizes only on a change, with
`renderer.setSize(w,h,false)`. Native and specimen CSS explicitly size canvas to
100% of 100%-height html/body. No source-level intrinsic-canvas feedback was
found. The fixture supplies client sizes and verifies resize decisions, **not
browser CSS layout**, viewport churn or the unidentified export wrapper.

Camera updates precede road sync, light follow, model update, lamps, atmosphere,
AO and terrain UV update. Ground/landscape vertices have no per-frame animation.
Road matrices use y=0.035; legacy grid y=0.012; bridge top y=0.01; water y=-0.4.
Landscape omits the playable interior, not a second overlapping flat ground.
River ground replaces the existing ground geometry; repeated same-layout calls
return without rebuilding. Imported terrain grouping reorders indices, not
vertices. Ground/asphalt already have polygon offsets, respectively `(1,4)` and
`(-1,-2)`, enabled. These materially change the raw depth comparison below.

Stable model handles write static transforms only on changes. Cars/walkers
advance supplied rigs when moved; camera-distance LOD is not switched. City
fire/smoke uses authoritative simulation time. Weather moves particles in its
own vertex shader, not terrain/building positions. Water normal/clearcoat UVs
scroll; building wear/fog shaders do not displace world geometry.

`daynight.follow` follows X/Z without texel snapping and changes the shadow
orthographic radius with camera height. Sun direction changes with visual phase.
This can move shadow sampling while geometry stays still, but fixed camera and
fixed phase produced exactly fixed shadow matrices/coordinates. A staged 1cm
camera-X move produced a maximum 0.039517555975180585 shadow texel displacement.
That is evidence of fractional follow, **not a demonstrated shadow-crawl defect
or the cause of this user's report**. No snapping/lighting patch was guessed.

## Executable measurement

The small loader follows the existing first-scene fixture technique without
running its 155-checkpoint/full-array-hash exercise. Actual `createWorld`, local
Three, GLTFLoader and real LOD0 GLBs run. Only WebGLRenderer, event target and PNG
pixel decoding are doubled. PNG dimensions come from headers; no pixel decode
or graphics compilation happens. RendererDouble explicitly executes real
`scene.updateMatrixWorld(true)`, `camera.updateMatrixWorld(true)` and active
light-shadow `updateMatrices`, so matrices are not accidentally stale.

Staged fixture: town hall, home, one car and walker, road row across the map,
existing outskirts/water and river bridge pool. These are direct API setups,
not native gameplay or the user's town. Snap poses use actual `initialTownPose`;
low-pitch pose is explicit. Samples identify scene child paths, never UUIDs.
Only active instance matrix ranges are compared per frame, not unused capacity.
Twenty actual imported authored modules are compared byte-for-byte across both
loads and at completion; vendor/asset files are read-only, not rehashed wholesale.

Two exact replays each measure 276 frames and execute 287 renderer-double calls:

- Six cases: legacy-flat/river-v1 times desktop 1280x800, phone 390x844 and
  low pitch -0.12 at `(0,215,900)`. Each has 36 frames alternating dt
  `0, 1/120, 1/60, 0.1, 0.25`, fixed pose and phase.
- Actual desktop height 215; legacy phone height 280. River phone height is
  **383.2491041201123**, not 280, because the actual fit helper raises it to fit
  the crossing. Near/far remain 0.5/5000.
- Maximum absolute scene/node, active-instance, camera, root-transformed landmark
  world-position, projected-pixel, shadow-matrix and shadow-texel deltas: **0**
  in all fixed cases. Forced unchanged-road sync also preserves matrix values.
- 48 changing-phase/traffic/fire/rain frames preserve static nodes, instances and
  camera/landmarks exactly. Intended maximum changes: light-node/shadow matrix
  162.87553679600782; active animated-instance entries 5.425209045410156;
  UV offset 0.0408000000000015; particle elapsed 3.3999999999999986.
  Shadow landmark range changes 5006.007073001982 texels; some selected landmarks
  lie outside the shadow frustum, so this is not a visible-screen motion measure.
- Twelve repeated dt0 resized frames are identical. Same-size calls do not
  resize. A deliberate 1000x700 resize changes projection/landmark pixels once,
  not camera/world matrices. Six resize calls total per replay.
- 92 geometry position buffers remain identical through animation. Same-layout
  identity is retained; river -> flat -> river rebuild restores exact river
  positions and world/instance/camera/shadow state. Disposal closes 140 image
  doubles across two loads; 74 local file-backed requests, no network requests.

The initial fixture run exited 1 at its final aggregate deepStrictEqual because
report poses/material arrays had different VM prototypes. All preceding fixed
and variable checks had passed. The corrected test compares every replay frame
field directly and normalizes only report prototypes through JSON. It passes
without relaxing any numeric equality. This was a fixture defect, not product
old-red/fixed-green evidence. **No causal product red/green pair exists.**

## Depth and precision qualification

Same-screen-ray plane intersections are projected by the actual camera, then
scaled by `2^24-1`. Vertical pixel offsets are separately measured, never
substituted for same-pixel depth. Tests include actual road center rays and the
legacy x=0 grid line, plus a coarse screen grid. D24 is a stated numerical model,
not the unknown user's measured default-framebuffer depth format. Vendor defaults
to highp with capability fallback; no logarithmic/reversed depth is requested.

| Sample | Raw grid-ground D24 steps | Vertical grid offset | Raw asphalt-ground D24 steps |
| --- | ---: | ---: | ---: |
| Legacy phone x=0,z=-950, distance 1262.954m | 0.2959379154, same rounded bin | 0.0073172346px | 0.8632231660, no road at this ray |
| Low pitch x=0,z=-950, distance 1862.451m | 0.2514313421, same rounded bin | 0.0044341675px | 0.7334198850, same bin but no road here |
| Actual road centers, desktop | >=1.4739682746 | not used as depth proof | >=4.2995341093 |
| Actual road centers, river phone | >=0.5092059145 | not used as depth proof | >=1.4852730510 |
| Actual road centers, low pitch | >=0.5121659853 | not used as depth proof | >=1.4939772863 |

These are real numeric separations, **not reproduced raster collisions**:
existing polygon offsets and slope terms are not applied by this calculation;
line raster rules/interpolation/GPU errors are not simulated. River-v1 hides the
grid entirely. The smallest raw asphalt samples do not even have a road at the
ray. No blanket ground/shadow/animation disable, near-plane adjustment or offset
increase is justified as an entire-world fix from these numbers.

## Commands and acceptance

All commands ran locally, Node-only except documented Python guards:

- `node --check scripts/citisten_world_stability_check.mjs`: exit 0.
- `timeout 60s node --experimental-vm-modules scripts/citisten_world_stability_check.mjs`:
  exit 0 after the fixture correction. Final output:
  `WORLD STABILITY PASS: fixed scene/camera/instance/projected/shadow deltas 0; exact replay; intended animation retained; no GPU/user-cause claim`.
- `node Games/Citisten3D/{world,terrain,river,river-upgrade,external-materials,building-surfaces,runtime-gaps,native}-check.mjs`, each separately:
  **8/8 exit 0**. Receipts include `WORLD CHECK PASS`, `TERRAIN CHECK PASS`,
  `RIVER CHECK PASS`, `RIVER UPGRADE CHECK: 7/7 passed`, `FLAT WORLD CHECK PASS`,
  `PASS building surfaces: 381 actual LOD0/1/2 material definitions`,
  `RUNTIME GAPS CHECK PASS` and `NATIVE LOOP PASS`.
- Python catalog guard: `CATALOG PASS: 129 entries, unique integer IDs, schema, Git URLs`, exit 0.
- `python3 -B scripts/check_maintenance_docs.py`: exit 1, solely
  `Missing docs/maintenance/games/001-brainrotboulevard.md`. No fabricated manual,
  refresh or changed-source staleness bypass.
- `git diff --check`: exit 0. Final staged diff and source status checked before commit.

Next discriminating observation: identify site/export and device/browser, then
whether building silhouettes and ground landmarks move relative to the HUD when
paused/no-input, or only shadows/water shimmer. That distinguishes world/camera
motion from shading and CSS/compositor motion. It is not a request to repeat the
known-failing local GPU route. Sister camera/loop diagnosis remains independent.

Initial root free space: 2,361,421,824 bytes, above the 2,147,483,648 floor.
Final disk reading, commit and finish time are reported with the handoff. No
waiver used; owned text output remains below 1MB.
