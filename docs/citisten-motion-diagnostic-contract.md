# Citisten bounded motion diagnostic contract

## Authority and scope

OTHER-GAMES-CONTINUE explicitly resumes useful Citisten shaking and native
Save/Continue investigation in quality mode. The key-release fix is already live;
it does not prove whole-world shaking solved. Origin remains unknown: site or
already-downloaded Chromebook v2. Do not wait solely for feedback while a useful
observational diagnostic can distinguish remaining causes. No unchanged failed
GPU run, animation/quality removal, install, save mutation or competing push.

Baseline`b00597df`, game tree`fe47601d41652fa93fc51860efa655c1607eacb5`,226files/
35,157,288bytes.2026-10-28 10:45:10 UTC free2,673,164,288 bytes; floor2,147,483,648.
No browser slot held. Two bounded disjoint workers, existing models unchanged.

## Module boundary agreed before delegation

Astra owns new`Games/Citisten3D/render-motion-sample.mjs`, its Node check and receipt.
Export`createRenderMotionSampler(world, canvas, { getState = () => null } = {})`.
Factory selects a bounded cohort when recording starts; `sample()` only reads:

```
{
 available: boolean, reasons: string[],
 groups: { camera: number[]|null, projection: number[]|null,
           target: number[]|null, viewport: number[]|null,
           scene: number[]|null, projected: number[]|null,
           shading: number[]|null },
 keys: { [groupName]: string[] },
 input: { known: boolean, held: string[], dragging: boolean|null, version: number|null },
 render: { frame, calls, triangles, geometries, textures },
 sim: { time, tick, speed, construction: bounded list } | null,
 coverage: bounded diagnostic metadata
}
```

Unknown/missing fields are null with reasons, never guessed healthy/zero. Compare
vectors only with identical keys/lengths. Camera excludes projection, so viewport
projection changes are separable from camera transforms. Read existing computed
matrices, at most24 static cohort nodes and one active instance per mesh; exclude
mobile agents/sky/weather/event motion from that cohort. Projected fixed landmarks
are labelled/visibility-qualified. Sample shadow/phase/water UV/weather separately.
No GL queries, render/update/matrix recompute, independent RAF, timers, event
listeners, simulation methods or asset fetches in the sampler. Bounded scalar
simulation/construction reads only; no full saves, typed text or credentials.
Optional`controls.inputState` is a read-only copy supplied by parent integration.

Sol owns new`Games/Citisten3D/motion-diagnostic.mjs`, its Node check and receipt.
Export`createMotionDiagnostic({ readSample, onFinish, now, setTimer, clearTimer })`
with browser defaults and methods`start()`, `sample()`, `cancel()`, `dispose()`
and read-only`report` getter. Runtime5,000ms timer, maximum360 existing-loop samples;
no sampler-owned RAF/update/render/wake. Timer finalizes only; a sleeping/blocked
loop can yield partial/no data. Preserve actual elapsed time and overrun/missing
samples, not a false measured5s or no-jitter pass. Missing reads/failures stay
explicit. Aggregate max deltas by equal-shaped group, input/coverage/context facts,
first/last bounded render/sim observations and sample timing. Report categories
are observations, not root-cause/visual acceptance. Do not retain unbounded arrays.
No persistence/network/blob/clipboard behavior. Guard duplicate starts, dispose,
UI-callback/read errors and timer cleanup. Dependency-injected clock/timer is for
small deterministic tests, not an abstraction framework.

Parent owns`native.mjs`, `index.html`, minimal`native.css`, read-only camera input
getter, native integration test, manual/inventory/dispatch/freeze/handoff. Add one
opt-in control within existing Controls details, static recording status and a
bounded selectable report. Source tick calls sample AFTER existing render; do not
change busy predicate, simulation/render delta ordering, original500ms/5s gates,
quality or existing input. No new RAF. Start/finish UI must not relayout the canvas.
No auto-running diagnostic or new runtime third party. Pagehide disposes timers.

## Verification and evidence limits

Test fixed state, input/target/easing motion, viewport/projection changes, sampled
scene motion, shading-only animation, absent/zero frames, changed cohort, bad
reads, delayed timer and bounds/cancel/dispose. Prove no renderer/update calls,
source/snapshot mutation or extra loop ownership. Run relevant existing native/
Continue/save regressions after parent integration. A GPU pixel artifact with
stable sampled transforms must be reported as unresolved rendering/shading/
compositor possibility, never proven absent. Serial deploy belongs to74b61fa7;
verify exact served entry/new module dependencies after publication. Do not claim
native Water/Save/Continue or user-shaking acceptance from CPU/HTTP evidence.
