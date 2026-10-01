# Spline Ride: pinned source and local adaptation

Delegations 27 and 30, 2026-10-01. Final finishing environment verified as
`PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`; branch
`feat/overnight-games`. This task owns only `Games/Spline Ride/`,
`scripts/test_spline_ride.py` and this report. No catalog registration, dependency
installation, engine invention or push. Spline Ride is an **ingested MIT 3D demo**.
Its open-ended lap count is not an invented score or win/lose condition.

## Source and permission

Official source: https://github.com/mrdoob/three.js

Pinned r160 peeled commit: `d04539a76736ff500cae883d6a38b3dd8643c548`.
Original entry:
https://github.com/mrdoob/three.js/blob/d04539a76736ff500cae883d6a38b3dd8643c548/examples/webgl_geometry_extrude_splines.html

Read the complete entry, CurveExtras, OrbitControls, MIT notice,
`AGENTS.md`, `docs/CODE_QUALITY.md` and `docs/3d-demo-source-search.md`.
The entry and helper evidence was read from the source-search worker's existing
`scratch/tmp/3d-demo-source-search/` without modifying or deleting it. The engine
and license were extracted from Git objects at
`HEAD:Games/Circuit Ward/vendor/three.module.js` and
`HEAD:Games/Circuit Ward/vendor/LICENSE`, not from sparse-working-tree assumptions.
`git sparse-checkout add 'Games/Spline Ride'` ran before creating/staging the port.

MIT: copyright © 2010-2023 three.js authors. Full notice retained at
`Games/Spline Ride/vendor/LICENSE`. Human-readable attribution appears in the
visible footer and `CREDITS.md`. This permission covers the original procedural
curve/tube code and retained engine/helpers, not unrelated artwork. No external
model, texture, music or image is used. Stats and lil-gui are **not shipped**.

Shared typography is the already tracked Atkinson Hyperlegible 400/700 Latin
WOFF2, under `assets/fonts/atkinson-hyperlegible/`; copyright 2020 Braille
Institute of America, Inc., SIL OFL 1.1. Its complete existing `OFL.txt` was read
and is linked from the credits. No new font dependency was downloaded.

## Exact byte diagnostics

Upstream paths below are all relative to the pinned three.js commit. Values
were checked against actual bytes before copying. The entry was fully read but
is not stored as a second unused HTML entry.

| Upstream path | Bytes | SHA-256 |
| --- | ---: | --- |
| `examples/webgl_geometry_extrude_splines.html` | 9584 | `afd7d29119ea6dc38d2be2f9f22eb6400b7d3196d1536bd270107ffc6ec07d0d` |
| `build/three.module.js` | 1272972 | `76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495` |
| `LICENSE` | 1081 | `852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d` |
| `examples/jsm/curves/CurveExtras.js` | 7326 | `7a885b15e2078fac929b6a69fce7e1ebe9a0fa1163c2fcc58fc2d49e16f42a19` |
| `examples/jsm/controls/OrbitControls.js` | 29868 | `5a44a9e86a2a0fb11933eed69bc2cd33c76a496854c1aed6ed776efa87d7b064` |

Core and license remain exact. Each helper has exactly one modification:
`from 'three'` becomes `from './three.module.js'`. All math, reference links and
control implementation comments remain unchanged. **Local helpers are not
claimed byte-identical to upstream**:

| Local vendor file | Bytes | SHA-256 |
| --- | ---: | --- |
| `CurveExtras.js` | 7338 | `add455951426cb43c9012f87dc332b16f26dff97e6834ab61c1c9ca2c28c437d` |
| `OrbitControls.js` | 29880 | `6b2f7df940a94e9aefe48466d8722c882e1430072c1dd680e978e0d70527ff00` |

Actual initial output:

```text
Pinned entry, core, notice, curves, controls: 5/5 byte/hash checks PASS
```

The runnable test reverses only the documented import substitution in memory
and checks the upstream vendor hashes again, without fetching anything.

## Preserved behavior and bounded local changes

The sixteen original curve instances and both local Catmull-Rom point lists
are preserved, along with upstream `addTube`, `setScale`, arclength
`getPointAt`/`getTangentAt`, binormal interpolation, offset of 15, normal and
camera quaternion math. Tube geometry is shared by the solid and wire meshes;
old geometry is disposed before replacing a path or tube setting. Default
resolution is 64 longitudinal segments × 8 sides (1024 tube triangles).

Native path select, scale, tube sides, join-ends and look-ahead inputs replace
the developer GUI. Orbit/Ride, Play/Pause and Restart replace the debug view
controls. No Stats, camera-helper widget or debug FPS counter remains. A small
amber marker indicates the sampled path position in Orbit view. The camera
uses the source's external offset; this is not advertised as tunnel flight.

Default Orbit is paused, for all users including reduced-motion users. Play
explicitly starts Ride. Playback accumulates active milliseconds against the
source's 20-second period; progress is the actual normalized path parameter and
Laps is its completed-period count. Pause freezes the parameter/camera; Restart
resets elapsed time, laps, Orbit view and stock OrbitControls state without
starting another RAF loop. Space/R/V shortcuts and paused arrow stepping avoid
intercepting native form-control navigation. Existing touch orbit/pinch input
is retained. Hidden-tab visibility pauses without automatic resume; enabling
reduced motion also pauses. Unload cancels RAF and disposes controls, geometries,
materials, observer and renderer.

Both camera aspect/projection matrices update from CSS canvas dimensions.
Pixel ratio is 1 and the drawing buffer fits within 1280×720. CSS fills the
stage; no picking feature is claimed. Cream canvas, matte steel-blue tube,
subtle dark wire and amber marker use the requested house palette. Native
controls have 44px height, buttons have 44px minimum width, visible focus,
semantic progress and allowed browser zoom. Light/dark shell follows the system
color scheme; canvas remains cream. Geometry details become in-flow on narrow
screens. The sole diagnostic API is a getter returning a frozen
`window.splineRideSnapshot`, with frozen camera arrays and no setters.

## Runnable checks and limitations

From repository root (or run the test by path from another working directory):

```sh
for f in 'Games/Spline Ride/script.js' 'Games/Spline Ride/vendor/three.module.js' 'Games/Spline Ride/vendor/CurveExtras.js' 'Games/Spline Ride/vendor/OrbitControls.js'; do
  node --experimental-default-type=module --check "$f" || exit
done
python3 scripts/test_spline_ride.py
git diff --check -- 'Games/Spline Ride' scripts/test_spline_ride.py docs/spline-ride-sources.md
```

The focused test serves the repository with an ephemeral bounded server,
terminates it in `finally`, closes the browser through a stdlib `ExitStack` even
on assertion failure, blocks every non-origin request, and rejects all
console errors, page errors, failed requests and HTTP >=400 responses with no
allowlist. It asserts four actual JS loads (entry plus three vendor imports),
real path progress/camera changes, pause stability, reset, all sixteen path
switches with stable geometry count, geometry controls, one pending RAF,
real 20-second lap, touch orbit/pinch and 320/390 layouts. Desktop and reduced-
motion mobile use only two contexts; desktop closes before mobile. Mobile
forces the retained WebGL1 fallback. No live game setter or synthetic elapsed
clock shortcut exists. Snapshot frames measure actual rendered frames.

Browser verification status is recorded below after the bounded run. Parser
success alone is not a release or subjective visual-quality claim. Natural
hidden-tab behavior is not exercised by the headless test. Main owns screenshot
review, catalog registration and the mandatory **full-catalog** smoke gate
before any release decision. This worker does not push.

### Actual final verification: delegation 30

Final `python3 scripts/test_spline_ride.py` exit: **0**. The bounded final run
began at 23:33:00 +10:00 with no other Chromium GPU process observed. Actual
output is preserved in the temporary `spline-ride-qa/regression.log`:

```text
Spline Ride PASS: pinned vendors, 16 paths/disposal, native geometry controls, real 20s lap, keyboard play/pause/step/view/restart, touch play/orbit/pinch/reset, reduced-motion start, 320/390 layouts, both cameras resized, WebGL1 mobile, one RAF, origin-only requests, zero console/page/HTTP/request errors
Limit: natural hidden-tab visibility behavior not exercised by this headless run.
```

Measured desktop: 439 frames, 2 geometries, 3 draw calls, buffer 1238×466.
Real completed lap: 1 lap, progress 1.2994999997615742%, 431 frames, Ride view.
Mobile final: 141 frames, 2 geometries, 2 draw calls, buffer 294×403.
Each context made exactly eight origin requests: HTML, CSS, entry JS, three
vendor JS modules and two existing fonts. No other runtime loads occurred.
These frame counts are diagnostics, not a measured hardware FPS claim.

Three fresh PNG captures for main's review: `desktop-orbit.png`,
`desktop-ride.png`, `mobile-orbit.png`. Two fresh theme captures:
`desktop-dark.jpg`, `mobile-dark-ride.jpg`. Each is below 500 KB, under the
temporary `spline-ride-qa` output directory. Main has not yet reviewed them;
older JPEGs from delegation 27 are not evidence for this final run.

Two earlier delegation-30 runs failed and are preserved separately as
`regression-trial1.log` and `regression-trial2.log`. The first hit the existing
10-second startup timeout while Foldwild's GPU browser was active, with no
browser errors and 3 rendered frames at diagnostic collection. The quiet
second run reached playback but its fixed 250 ms pause sample saw no additional
frame. This was a test sampling assumption, not proof that rendering stopped.
The pause check now waits for an actual later rendered frame using the existing
bounded synchronous predicate; all progress, camera-stability and render-loop
assertions remain. No timeouts were extended, errors suppressed, production
state setters added, generic gates changed or source animation rewritten.
Buttons now use 4px corners and shell panels 6px corners. The final complete
run passed all original interaction and error assertions.

Earlier delegation-27 test instrumentation failures are separate from this
verification. Natural hidden-tab behavior, independently instrumented unload
resource disposal, subjective screenshot review and the full-catalog release
gate remain unverified. Source unload disposal was inspected; browser and
server teardown ran through the test's bounded cleanup paths. No catalog
addition in this phase; registration is main's separate step.

Final static checks: all four new JavaScript modules passed
`node --experimental-default-type=module --check`; the Python test compiled
in memory. The unchanged catalog contained 113 entries with unique IDs,
required fields and tracked URLs. Authored HTML/CSS/JS had no external runtime
loads. The unstaged owned diff passed `git diff --check`; the staged complete
port reported one upstream `space before tab in indent` at
`vendor/three.module.js:46517`. That exact upstream byte is retained rather than
silently changing the pinned engine or claiming a completely clean diff check.
Game files total 1,330,245 bytes. Rounded free space was 2.2 GB on delegation-30
entry and 2.3 GB at final checks; concurrent workers make this unsuitable as a
measurement of this port's storage delta.
