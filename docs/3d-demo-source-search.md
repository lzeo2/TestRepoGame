# Delegation 23: bounded 3D source search

Source-only handoff, 2026-10-01. Actual environment: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6.1-sol`. Read `AGENTS.md`, `docs/CODE_QUALITY.md`,
`docs/circuit-ward-sources.md` and `docs/circuit-ward-models.md`.
Branch verified: `feat/overnight-games`. No build, package install, clone,
checkout, game/catalog edit, owner contact or push. Only this report is committed;
small downloaded source/license evidence is under
`scratch/tmp/3d-demo-source-search/` and is not staged.

Catalog observation at search start: **113 entries; id 224 absent**. This is not
an allocation lock; recheck immediately before registration. Foldwild collector
is explicitly excluded from tonight's registration and from this search.
Existing dirty portal JS and three untracked Circuit Ward CV GLBs are untouched.

## Recommendation to the orchestrator

Use **official three.js r160 spline extrusion**, as an explicitly attributed
**3D demo**, not as a claimed flight game. It has a real existing curve-camera
ride and procedural geometry, no model/texture redistribution gap, and matches
the already tracked r160 engine. Preserve upstream camera/path rendering;
replace developer GUI/debug counters with native playback/geometry controls.
No new engine, collector, invented objectives or fake score is needed.

Second source-viable option: official r160 **pointer-lock controls** procedural
walking/jumping demo. Its MIT dependency closure is smaller, but its mobile
input and pointer-lock assumptions need more adaptation. Neither source is
ready for catalog registration unchanged. The orchestrator must decide whether
the actual adapted demo meets the requested visual quality after ingestion.
No subjective quality/accessibility score or browser success is claimed here.

A procedural physics alternative was inspected but **not cleared**: r160 Rapier
instancing dynamically imports a CDN package. Ammo instancing also has a separate
WASM dependency/license closure. Do not ingest either on this evidence alone.
No fully license-cleared standalone flight game was established in this bound.

## Shared authoritative revision and notices

Official repository: <https://github.com/mrdoob/three.js>.
Tag: <https://github.com/mrdoob/three.js/tree/r160>.
Actual `git ls-remote` output:

```text
643680ed5fc73ba27e32a6529d59cae8c8b3825c refs/tags/r160
d04539a76736ff500cae883d6a38b3dd8643c548 refs/tags/r160^{}
```

All three.js paths below were downloaded from the **peeled commit**, not moving
main. Pinned source URL rule:
`https://raw.githubusercontent.com/mrdoob/three.js/d04539a76736ff500cae883d6a38b3dd8643c548/<path>`.
Browse source at
<https://github.com/mrdoob/three.js/tree/d04539a76736ff500cae883d6a38b3dd8643c548/examples>.

Read the complete root `LICENSE`: MIT, `Copyright © 2010-2023 three.js authors`.
Retain its full permission, copyright and warranty notice with any port, and
preserve relevant source comments. Attribution default: “Adapted from the
three.js authors' r160 spline extrusion example (MIT).” This does not attribute
our changes to upstream, license unrelated models, or create permission for
other libraries. No models, music, images or fonts are used by the two selected
sources. CurveExtras contains mathematical reference links, not asset requests;
preserve those comments. Do not transfer Circuit Ward artwork or its permission
claims to this demo.

### Existing engine reuse, measured from Git objects

`git show 'HEAD:Games/Circuit Ward/vendor/three.module.js'` was read in memory:
**1,272,972 bytes**, SHA-256
`76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495`.
`git ls-tree -l HEAD` reports official engine blob
`0bcc7a286da2c115853ceec9deea19923e10ddc1` and license blob
`d07e209686512b9ac93d7df5481a4a6f622093e7` (1,081 bytes).
These match the existing source-evidence document. No engine copy was downloaded
or written in this task. The orchestrator can extract these tracked objects into
the new port's local vendor directory, or choose a tracked shared local location;
do not depend on an absolute machine path or a sparse checkout being present.
Only the core and notice are needed, not Circuit Ward GLTFLoader or its models.

## Candidate 1: spline extrusion / camera ride

Pinned entry:
<https://github.com/mrdoob/three.js/blob/d04539a76736ff500cae883d6a38b3dd8643c548/examples/webgl_geometry_extrude_splines.html>.
Official preview: <https://threejs.org/examples/#webgl_geometry_extrude_splines>
(current online preview may differ from r160; **not run**).

Read the complete HTML, CurveExtras, OrbitControls and CSS. Stock dependency tree:

```text
webgl_geometry_extrude_splines.html
  main.css
  three -> build/three.module.js -> no imports
  CurveExtras.js -> three
  OrbitControls.js -> three
  stats.module.js -> no imports
  lil-gui.module.min.js -> no imports
```

The stock import map is local to the upstream repository layout. There are no
texture/model/audio loads in the example. The three.js link is navigation, not
an automatic runtime fetch. Stats and lil-gui are separate upstream libraries,
not covered merely by the three.js root notice; see separate notices below.

For the recommended **native UI adaptation**, the complete retained closure is:
HTML/adapted entry script, authored shell CSS, `three.module.js`, `CurveExtras.js`,
`OrbitControls.js`, three.js `LICENSE`. Remove both debug-library imports and all
associated Stats/GUI setup/update calls; replace the actual GUI handlers with
native controls calling the existing `addTube`, `setScale`, `animateCamera` paths.
Do not silently remove the useful spline/view/geometry controls. Repoint only
imports via a local import map or consistent local module paths.

Source behavior relevant to acceptance:

- Sixteen paths: fourteen CurveExtras classes and two local CatmullRom curves.
  Existing `TubeGeometry` creation, mesh scaling and geometry disposal on change.
- Existing spline camera uses `getPointAt`, `getTangentAt`, tube binormals and
  quaternion orientation. Ride time is `(Date.now() % 20000) / 20000`.
- Default is **external orbit view**, not animation view. Camera offset is 15
  along the computed normal. Do not advertise a tunnel-interior flight: the
  source does not establish that presentation or any collision game.
- Real lap progress can expose the exact existing normalized path parameter.
  A small elapsed-time origin with native start/pause/restart can reset that
  parameter to zero. Label this ride/lap progress, never collected items or score.
  Keep one animation loop; restart must reset state, not launch another loop.
- OrbitControls already supports one-finger orbit and two-finger zoom/pan. Its
  `reset()` exists; keyboard listening is opt-in via `listenToKeyEvents` and is
  **not enabled by the stock HTML**. Native buttons/selects provide keyboard and
  touch playback actions; keyboard orbit/pan can use the existing helper.
- Stock resize updates only the external camera. Adaptation must update both
  camera aspect/projection matrices. Respect reduced motion with paused/manual
  start, permit browser zoom, add visible focus, labels and 44px controls, check
  mobile overflow and retain resize/DPI handling with a sensible pixel-ratio cap.
- No game failure/win or finite completion is upstream. Do not invent one for
  an open-ended demo. A displayed completed lap is legitimate path progress.

### Exact downloaded file inventory (upstream bytes)

| Official path | Bytes | SHA-256 |
| --- | ---: | --- |
| `LICENSE` | 1081 | `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d` |
| `examples/webgl_geometry_extrude_splines.html` | 9584 | `afd7d29119ea6dc38d2be2f9f22eb6400b7d3196d1536bd270107ffc6ec07d0d` |
| `examples/jsm/curves/CurveExtras.js` | 7326 | `7a885b15e2078fac929b6a69fce7e1ebe9a0fa1163c2fcc58fc2d49e16f42a19` |
| `examples/jsm/controls/OrbitControls.js` | 29868 | `5a44a9e86a2a0fb11933eed69bc2cd33c76a496854c1aed6ed776efa87d7b064` |
| `examples/jsm/libs/stats.module.js` | 3514 | `2c71a2f70e89c69e46c2e285fb171bac3dcfd498a85400e94ad5aaf6044ffc06` |
| `examples/jsm/libs/lil-gui.module.min.js` | 29526 | `5e31e7fc4d3a1268550b948463eabe06c7a6c03c158ccb99c78616d2c9682518` |
| `examples/main.css` | 1403 | `57bbd270f4befef0dc767537cd803c30cab549f84aac1bbe86c748520bdfc3fe` |

Core + notice + entry + curves + orbit totals **1,320,831 upstream bytes**, before
small authored shell changes. No build step or decoder is required.

### Separate stock debug-library license evidence

- lil-gui header declares **0.17.0**, George Michael Brower, MIT. Actual tag
  resolution: object `5c69952ab62d427fd11512d194459ad2fc9ea035`, peeled
  `944f6ef6f4cb63cbcdb97b5044a91aec84ce1f96`.
  Complete notice read/downloaded from
  <https://raw.githubusercontent.com/georgealways/lil-gui/944f6ef6f4cb63cbcdb97b5044a91aec84ce1f96/LICENSE.md>:
  `Copyright (c) 2019 George Michael Brower`, MIT, 1,077 bytes. Retain separately
  if keeping GUI. The guessed `LICENSE` and `dist/lil-gui.esm.min.js` paths returned
  404; no byte identity with a separately built lil-gui artifact is claimed.
  The actual distributable is pinned to the three.js commit and carries that
  version/license header. Recommended adaptation does not ship it.
- Stats module declares revision 16. Official stats.js r16 resolved to tag object
  `dc235adaaa8b66d357139ba1321dafbee1fdf507`, peeled
  `c93fcbfe64062b05bce137fdf3465a195af25e14`.
  Complete pinned notice:
  <https://raw.githubusercontent.com/mrdoob/stats.js/c93fcbfe64062b05bce137fdf3465a195af25e14/LICENSE>,
  MIT, `Copyright (c) 2009-2016 stats.js authors`, 1,082 bytes, SHA-256
  `9d23ed2d037cc4b97860dc61dc3787ca2c1faac8b11402064a6fa90e91360adc`.
  Read/diffed upstream `src/Stats.js`: three.js removes its author header, changes
  `>` to `>=` for the one-second update, indentation, and CommonJS to ESM export.
  It is not byte-identical. Retain the separate notice and attribution if keeping
  Stats. Recommended adaptation omits this debug FPS widget.

## Candidate 2: procedural walking/jumping demo

Pinned entry:
<https://github.com/mrdoob/three.js/blob/d04539a76736ff500cae883d6a38b3dd8643c548/examples/misc_controls_pointerlock.html>.
Read complete HTML and PointerLockControls. Exact closure:

```text
misc_controls_pointerlock.html -> main.css
  three -> build/three.module.js -> no imports
  PointerLockControls.js -> three
```

No debug libraries, external models, textures, fonts or sounds. Generated floor
vertices/colors and 500 randomly positioned boxes are source procedural geometry,
not separate downloaded artwork. License: the same three.js MIT notice.

| Official path | Bytes | SHA-256 |
| --- | ---: | --- |
| `examples/misc_controls_pointerlock.html` | 8052 | `616d896d7b8391de5ed98932571e4f64d70f5e99d7279f8fb9b8f7292e3c5056` |
| `examples/jsm/controls/PointerLockControls.js` | 3347 | `b6ac6e2331d02fc877c49727c879b3f78e974dc56f43f2fcb89b03230e1f52ca` |

Existing start overlay, WASD/arrows, space jump, mouse look, unlock/resume,
velocity/gravity and downward raycast support walking/jumping. No collectibles,
score, target course, restart, touch movement/look or mobile pointer-lock fallback
exists. Horizontal collision is not implemented; do not describe it as a fully
colliding platformer. A reset of position/orientation/velocity and movement flags
is feasible without recreating the engine. Mobile requires explicit touch
movement/look/jump and a play-state path independent of `controls.isLocked`.
That is materially more work than the spline demo. Honest progress could be
current position/height, not an invented item total. Main must decide whether
this open-ended demo is useful enough; no numeric quality score assigned.

## Physics alternative: inspected, not license/offline cleared

Pinned source paths actually retrieved/read:

- `examples/physics_rapier_instancing.html` (4,339 bytes), SHA-256
  `d6dafce7d0d6c7c20468473c828cfe09245af54ff17b38aa3f6f35b4827fa467`.
- `examples/jsm/physics/RapierPhysics.js` (4,188 bytes), SHA-256
  `f4fa749a104897fa63d3943b77f687183e21951129cbe1658bf3d0c9e23e3675`.
- `examples/physics_ammo_instancing.html` (4,380 bytes), SHA-256
  `4de4d9e00c892692c05ce82d82d8b6169059d4e6af2b4a4273ea8ef693eefdbb`.
- `examples/jsm/physics/AmmoPhysics.js` (7,018 bytes), SHA-256
  `4a181a4f692481921f0bc88f2c7fef1ae870fbf3f2780a4bd711b222f86416a0`.

Both generate 400 boxes and 400 spheres and reuse OrbitControls/Stats. Rapier
wrapper imports `https://cdn.skypack.dev/@dimforge/rapier3d-compat@0.11.2`
dynamically, then calls `init()`; this is an actual forbidden runtime load, not
just a documentation URL. Its package/WASM transitive closure and separate
license were **not verified or downloaded**. Ammo HTML loads
`jsm/libs/ammo.wasm.js`; loader/WASM/Bullet/Emscripten closure was **not audited**.
Do not assume the three.js MIT notice covers either engine. Both use separate
simulation and respawn intervals; teardown/reset would have to own these timers.
Neither provides meaningful user progress or restart in the inspected source.

Oimo guesses at this revision returned 404, including both
`webgl_physics_oimo_instancing.html` and `physics_oimo_instancing.html`,
`jsm/physics/OimoPhysics.js`, and `jsm/libs/oimo.module.js`. WebGL-prefixed Ammo/
Rapier entry guesses also returned 404; their corrected `physics_*` paths above
succeeded. These failures are recorded, not presented as viable sources.

## API compatibility and observed checks

Static inspection of the tracked r160 export list:

```text
Geometry False
BufferGeometry True
TubeGeometry True
CatmullRomCurve3 True
Curve True
OrbitControls False
SRGBColorSpace True
```

OrbitControls is an **addon**, not `THREE.OrbitControls`. Import it explicitly.
Legacy `THREE.Geometry`, `.vertices`, old global example controls and removed
legacy geometry constructors cannot be dropped into r160. Both chosen examples
already use current geometry attributes and matching r160 ESM imports.

A stdlib source scan asserted no `TextureLoader`, `GLTFLoader`, `AudioLoader`,
`fetch`, `WebSocket` or `XMLHttpRequest` calls, and no legacy `Geometry(...)`
constructor in the two entries plus retained curves/control helpers: **5/5 PASS**.
Import inspection found only `three` in each retained helper, no core imports.
This is bounded **source inspection**, not a runtime sandbox, proof about all
possible engine APIs, browser execution or offline smoke pass. No preview,
screenshot, browser/WebGL test, release gate or accessibility test was run.

Source accessibility facts: both stock HTML files disable viewport user scaling;
both lack labeled native restart/progress UI. Spline source has existing touch
orbit; stock keyboard orbit is not wired. Pointer-lock source has keyboard
movement but no touch input and a non-button start element. These are adaptation
requirements, not a passing accessibility score.

Before registration, main must inspect real desktop/mobile screenshots in both
themes, verify genuine controls/progress/reset, block external requests during a
locally vendored browser run, leave one small regression check, validate catalog
id/schema/tracked URL and script syntax, and retain the mandatory full-game smoke
and no-push gates. This task authorizes no registration or new self-made game.
