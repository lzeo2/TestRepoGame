<!-- maintenance-game: Games/Spline Ride -->
# Spline Ride maintenance manual

## Identity and status

Spline Ride is registered as **224**, category `simulation`, URL `Games/Spline Ride/index.html`, icon `SR`, not featured. It is an ingested procedural **3D camera demo**, not a flight/action game with collisions, collectibles or invented win/lose rules. Source at `8c8a055813b35bbd5d8b632423328333b4252d43` has entry blob `630f1f172f77bf1702085a4f8ae07cc05944fd86`, tree `f552ec03d2d470f50899dad2aca8846deeb0bc31`, eight files and 1,330,245 logical bytes. ID 224 is already occupied; historical plans reserving it for Foldwild are stale.

The experience exposes sixteen curves, Orbit/Ride camera views and real elapsed lap progress. All runtime imports are local, with two shared local font files; there are no GLB, image, texture or audio loads. Static closure is not fresh browser acceptance. This docs-only task ran zero browsers, created zero screenshots and changed no runtime. [Existing source/QA report](../../spline-ride-sources.md) records a prior focused native pass and its limitations, not a current all-game gate.

## Implementation map

`index.html` loads `style.css` and module `script.js`. Script imports local `vendor/three.module.js`, all exported curves from `vendor/CurveExtras.js` and named `OrbitControls` from `vendor/OrbitControls.js`. Do not assume OrbitControls is a core `THREE` property. The helper imports were rewritten from bare `three` to `./three.module.js`; no import map, package install or build is needed.

`script.js` builds two authored Catmull-Rom point lists plus fourteen CurveExtras instances. `splines` keys match path option values; `labels` supplies human names. Default `params` is GrannyKnot, scale 4, 64 extrusion segments, eight radius segments, closed ends, Orbit and no look-ahead. Native controls are collected in `ui` from IDs `path`, `play`, `restart`, `view`, `scale`, `sides`, `closed`, `ahead`, `progress`, `percent`, `laps`, `stage`, `canvas`, `status`.

`addTube()` removes the old mesh, disposes its shared tube geometry and constructs a new `TubeGeometry`; solid and wire child deliberately share that geometry. `setScale()` changes mesh scale without recreating geometry. `animateCamera()` enables OrbitControls only in Orbit, updates view label/accessible action name and marker visibility. `setPlaying(value)` owns playback intent, timestamps and Play/Pause text/aria-pressed. `restart()` resets elapsed, Orbit view, stopped state, OrbitControls and progress without starting another RAF.

`render()` retains arclength `getPointAt`/`getTangentAt`, binormal interpolation, normal cross product, offset 15 and quaternion orientation. `animate(time)` accumulates milliseconds while playing, renders, counts frames, updates progress and schedules one successor. `resize()` updates both camera aspect/projection matrices from CSS canvas dimensions and sizes DPR-1 buffer within 1280x720. A ResizeObserver tracks `stage`; geometry details expanding on phones should trigger it naturally.

Complete authored HTML/CSS/script and complete CurveExtras were read here. OrbitControls public constructor/reset and bootstrap were inspected, not all its remaining pointer/touch internals; engine internals were not fully human-reviewed. All vendor scripts passed syntax checks via Git blobs. That machine check is not a human review of a 1.27 MB renderer or browser math/performance certification. Binary-engine/art review is inapplicable because this demo has procedural geometry, but renderer source remains a large inherited dependency.

## Gameplay and controls

Default Orbit is paused for everyone, including reduced-motion users. Play switches to Ride and advances along the selected curve. Pause freezes elapsed progress; View can switch between Ride and Orbit independently of playback. Restart returns to initial Orbit and zero elapsed/laps. A lap is 20,000 active milliseconds, not necessarily a physical closed circuit: changing the Join ends control affects tube geometry, while elapsed modulo time still loops the camera parameter. The open PipeSpline can have a visible end-to-start transition; do not claim seamless closed flight for every curve.

Path select contains Granny knot, Heart, Viviani, Knot, Helix, Trefoil, Torus, Cinquefoil, two polynomial knots, four decorated torus knots, Pipe spline and closed Catmull-Rom. Path change rebuilds then restarts. Geometry menu supplies Scale 2/4/6/8/10, sides 3/8/12, Join ends and Look ahead. Scale changes geometry presentation; sides/closed rebuild the tube without resetting elapsed automatically. Look ahead chooses a forward point at `t + 30/pathLength`; otherwise camera looks along tangent. The marker samples the current path position in Orbit; Ride hides it.

Space toggles play/pause, R restarts and V changes view. While paused, arrows change elapsed by 200 ms, forward for Up/Right and backward for Down/Left, with zero floor. Shortcuts ignore select/input/button/summary/link targets and Alt/Ctrl/Meta. They do not enable keyboard OrbitControls pan: `listenToKeyEvents` is not called. Keyboard users can operate all native selectors/buttons and paused path stepping; an optional orbit/zoom button enhancement should use existing control APIs rather than advertise unimplemented keyboard drag.

Mouse drag or one-finger touch orbits; wheel/pinch zooms. OrbitControls defaults also provide mouse pan/two-finger dolly-pan, but native acceptance should test the actual configured helper, not assume every browser gesture. Min/max orbit distance are 100/2000. Canvas is keyboard-focusable and its aria-label states verified shortcuts; progress is native `<progress>`, percent/laps are `<output>`. The toolbar controls have minimum 44px height, visible focus and mobile in-flow geometry controls. Canvas remains cream in either shell theme; no wholesale art recolor or motion soundtrack is present.

No score/failure/win/combat, sound toggle or finite campaign exists. Completed laps are meaningful simulation progress. A refurbishment must preserve that identity, rather than wrapping it in a decorative launch screen or adding fake gameplay to satisfy generic portal standards.

## State and persistence

`params`, `playing`, `elapsed`, `previousTime`, `frames` are module-local owners. There are **no localStorage/IndexedDB save keys** or remote session dependencies. Reload returns defaults. `looptime` is 20,000 ms and progress `(elapsed % looptime)/looptime*100`; completed laps are floor(elapsed/looptime). Pause calls `setPlaying` to reset the previous timestamp, avoiding paused-time accumulation. `animate` still draws while stopped; paused means no ride progression, not no CPU/GPU rendering.

Hidden-tab visibility calls `setPlaying(false)` with no automatic resume. Enabling reduced motion also pauses; initial start is already paused regardless of media preference. An explicit Play remains a user motion request. Resize does not reset elapsed or controls. Before unload, the controller cancels RAF, disconnects observer, disposes OrbitControls, tube/marker geometry, marker/solid/wire materials and renderer. Geometry replacements dispose the old geometry once despite solid/wire sharing; preserve that invariant when adding styles.

`window.splineRideSnapshot` is a getter returning a frozen diagnostics object, including `playing`, `view`, `path`, progress/laps/frames, geometryCount/drawCalls, buffer width/height and frozen camera position/quaternion/aspects. It is not a mutator or source of hidden test time injection. Snapshot values are last rendered diagnostics: renderer frame counts alone cannot establish N100 FPS, successful unload or natural hidden-tab behavior.

## Dependencies and provenance

Official upstream: <https://github.com/mrdoob/three.js>; original entry `examples/webgl_geometry_extrude_splines.html` at r160 peeled commit **`d04539a76736ff500cae883d6a38b3dd8643c548`**. Copyright belongs to the three.js authors. Complete MIT permission/warranty notice stays at `Games/Spline Ride/vendor/LICENSE`; `CREDITS.md` identifies the ingested demo and local changes. No independent external art license is needed for the generated tube/marker, but do not transfer this permission to another game's artwork.

Engine is 1,272,972 bytes and MIT notice 1,081. Local CurveExtras is 7,338 bytes and OrbitControls 29,880 bytes. Helpers differ only by the documented import rewrite; they are not called upstream byte-identical. Exact pinned/local SHA-256 values and reversal check live in [source evidence](../../spline-ride-sources.md). Original Stats/lil-gui developer tooling was not shipped. Shared Atkinson 400/700 files use the retained SIL OFL 1.1 notice under `assets/fonts/atkinson-hyperlegible`; that is a separate typography dependency. Source mathematical URLs in CurveExtras are reference comments, not runtime loads.

The large core retains an upstream indentation warning recorded historically; changing pinned bytes merely to remove that warning would invalidate the existing identity evidence. No complete engine audit, package vulnerability certification or remote re-verification of the old three.js tag was performed in this task.

## Audit findings

- **MEDIUM SR-01:** `script.js`, document `keydown` callback. Unlike Circuit Ward/Foldwild toggle shortcuts, it does not reject `event.repeat`. Holding Space repeatedly toggles playback; holding V repeatedly toggles camera view. Minimal shared fix: ignore repeated toggle/reset shortcuts while preserving deliberate arrow stepping if desired. Recommended native repro: focus canvas, hold Space or V beyond OS repeat delay and inspect snapshot/UI transitions. Not run here.
- **MEDIUM SR-02:** `script.js`, renderer initialization/`animate`; no explicit context-loss UI/restore policy after startup. Initial catch disables controls, but mid-session context loss does not tell users why graphics stopped. Minimal fix: report loss through `status`, stop playback and require reload or controlled reconstruction; do not silently replay a lost context. Recommended native repro uses loss extension during Ride, then verifies progress/control diagnostics. Not run here.
- **LOW SR-03:** `script.js`, `animate` draws continuously while default Orbit or Pause is static. This is bounded to one loop but wastes idle battery. Minimal fix: demand-render on control/change/resize while stopped, or a conservative idle cadence, only after testing pause snapshot expectations. Do not create multiple loops to implement restart.

Keyboard orbit/zoom coverage and missing in-game Arcade link are refurbishment decisions, not claims of broken current launch. Existing browser unload cleanup is source-inspected, not independently instrumented. No hostile input sink or network endpoint is introduced by the observed controls.

## Safe iteration

Use native toolbar handlers and existing `addTube`/`restart` rather than redesigning the renderer. Keep upstream curve lists/math and notices; avoid editing compiled engine. Test every path after changing frame indexing or camera math, especially open/closed end behavior. Keep both camera aspects updated and geometry memory stable over repeated side/path changes. Do not add texture/font/CDN dependencies.

If restart state changes, maintain one pending RAF and reset elapsed rather than spawning an animation. Tests should use read-only snapshot and real active time for the lap. There is no save migration to perform; do not add storage simply because other games save. Revert an owned authored milestone explicitly if it regresses camera sampling, without reset/amend or changes to another worker's paths.

## Verification

Actually run here: 20 assigned-game JS Git blobs passed module syntax checks, catalog parse identified registered id 224 and 115 total entries; no native run/screenshot/full smoke. Recommended focused command after Main's temporary narrow source lease is `python3 scripts/test_spline_ride.py`, inspecting current script first. Its historical pass asserted pinned vendors, sixteen path switches/disposal, real 20-second lap, keyboard actions, touch orbit/pinch/reset, low-width layouts, both camera resizing and origin-only requests.

Historical native report recorded two geometries/three desktop draws and two mobile draws; these are not refreshed measurements. Natural hidden-tab behavior, independent unload disposal observation and actual hardware frame pacing remain separate tests. Recheck repeated-key behavior and context loss before accepting refurbishment. Main must review current desktop/mobile screenshots in both themes and run unchanged full registered-catalog smoke before any release decision. Loading gates do not establish camera-demo accessibility or gameplay provenance.

## Future outlook

Prioritize toggle-repeat/context-loss fixes, then idle rendering and keyboard orbit/zoom if owner accessibility review requires them. Keep factual `simulation` labeling. An N100 8 GB/64 GB target and 60 FPS standard goal are provisional; no desktop frame count is hardware proof. A later month should select genuinely playable source-licensed 3D games separately, not claim this demo already supplies racing or flight mechanics. No new ID, autonomous monthly work, publication or push is authorized here.
