# Citisten bounded motion recorder (#57)

## Result and ownership

`Games/Citisten3D/motion-diagnostic.mjs` exports the opt-in observer required by
[the agreed contract](citisten-motion-diagnostic-contract.md). Its only companion
files are `scripts/citisten_motion_diagnostic_check.mjs` and this receipt.
No native entry, controller, CSS, simulation, existing check or canonical manual
was edited. Parent owns actual UI/native-hook integration, canonical manual,
inventory and final tree counts. The sister sampler is not imported by this
module or its test; no dependency on another worker's uncommitted file exists.

This is **diagnostic implementation, not native acceptance or a shaking fix**.
Stable sampled CPU transforms cannot disprove pixel jitter, shading artifacts,
GPU/compositor problems or the user's observation. Native Water/Save/Continue,
context stability, supported hardware, requested images and FPS remain unpassed.
No blanket quality/animation change, browser, server, installation, export,
asset copy, peer contact, worker, push or new game occurred.

## API and parent integration

```js
import { createMotionDiagnostic } from './motion-diagnostic.mjs';

const diagnostic = createMotionDiagnostic({
  readSample: () => sampler.sample(),
  onFinish: report => showDiagnosticReport(report)
});
// Parent's explicit UI action: prepare sampler cohort, then diagnostic.start().
// Parent's existing tick: world.render(...); diagnostic.sample();
// Parent's existing pagehide cleanup: diagnostic.dispose().
```

`sampler` and `showDiagnosticReport` above are parent-owned integration variables,
not new exports or runtime dependencies. Call `sample()` only AFTER the existing
actual render. Starting uses the parent's existing captured input wake only.
Do not change the busy predicate, unpause, start a town, add RAF callbacks or keep
the native loop alive for this observer. The existing paused loop may stop after
about two seconds; the five-second timer then finalizes a partial report without
rendering another frame. UI start/finish must not resize or relayout the canvas.

Signature:

```js
createMotionDiagnostic({
  readSample,
  onFinish,
  now = () => globalThis.performance.now(),
  setTimer = (...args) => globalThis.setTimeout(...args),
  clearTimer = (...args) => globalThis.clearTimeout(...args)
})
```

Defaults are deferred. Importing/constructing, inspecting `report`, cancelling
before start and disposing before start require neither timers nor performance
in a VM. The exported object exposes:

- `start()`: true on start, false if running/disposed or observer setup fails.
  Duplicate starts refuse cleanly; a completed/cancelled capture can restart.
  Start resets the report and installs one 5,000ms deadline timer, but reads no
  sample and owns no render/wake/update callback.
- `sample()`: observes at most 360 existing-loop invocations inside the window.
  Returns false while inactive or if the deadline has already arrived; otherwise
  true for an attempted read, including an explicitly recorded failed read.
- `cancel()`: finalizes once as `cancelled`, removes its timer and does not notify
  `onFinish`. Repeated/inactive cancellation returns false.
- `dispose()`: terminal, idempotent cancellation as `disposed`, no notification.
  Invalidated timer callbacks cannot act after cancel/restart/disposal.
- `report`: detached JSON-compatible copy, or null before first start. It remains
  readable after deadline/cap/cancellation/disposal. Mutating a getter/callback
  copy does not mutate the recorder. `isRunning` is a read-only boolean getter.

The timer only finalizes. An early timer is rescheduled to the same deadline;
a delayed timer records actual elapsed time and overrun. The observer also checks
the deadline before and after reading, so a synchronous slow read cannot report
an invented exact five seconds. JavaScript cannot preempt that synchronous read.
A clock/timer fault terminates as `observer-error`; no game work is retried.

## Sample boundary and bounded report

The exact sampler shape remains the agreed contract. Seven groups are recognized:
`camera`, `projection`, `target`, `viewport`, `scene`, `projected`, `shading`.
Each vector must be a nonempty numeric Array of at most 1,024 finite components.
Each group has a nonempty, bounded string key/identity Array. The key count need
not equal component count, since one cohort identity may describe a matrix.
Only equal vector lengths AND exactly equal ordered keys are compared. Changed
keys/counts increment `coverageChanged`, not motion. Null, empty, malformed or
nonfinite vectors become unavailable, never replacement zero vectors. No delta
is computed across an unavailable read. Finite operands producing an overflowing
delta are also explicitly unavailable for that comparison.

For each group the report keeps counts and `maxAbsDelta` (adjacent comparable
samples) plus `maxAbsFromFirst` (only when the first cohort still matches).
`maxAbsDelta` stays null without a valid comparison. First-baseline distance can
be zero on its first sample; it is not a stability verdict. No transforms, full
frame history, pixel buffers or unbounded save/state data enter the report.

First/last observations retain:

- Input `known`, WASD-only `heldMovementCodes`, drag state and finite version.
  Unknown input has null held/drag/version, not a claim of no input. Known held
  arrays over 16 items are unavailable; arbitrary keys, typed text and event
  objects are not retained. Held movement and dragging observed during the
  capture are also accumulated separately from detected changes.
- Finite render frame/call/triangle/geometry/texture counters, or null with a
  reason. These are observations, not FPS or proof of native callback health.
- Finite simulation time/tick/speed, or null with a reason; bounded construction
  facts and `constructionObservedCount`. This count describes retained list
  coverage, not an inferred total city count. Sampler coverage metadata can
  separately carry actual bounded counts/context qualifications.
- First/last sampler coverage metadata. Nested facts have depth, entry, list,
  character, node-budget and serialized-size limits; oversized/invalid facts
  yield explicit reasons/nulls. Diagnostic metadata text is limited to small
  ASCII labels; non-ASCII string characters become `?`. This is not a general
  object/save serializer. It intentionally preserves no caught exception text.

Example report keys, shown as an excerpt rather than a complete capture:

```json
{
  "schema": 1,
  "plannedDurationMs": 5000,
  "maxSamples": 360,
  "startedAtMs": 1000,
  "deadlineMs": 6000,
  "finishedAtMs": 6200,
  "elapsedMs": 5200,
  "overrunMs": 200,
  "finishReason": "deadline",
  "sampleCount": 21,
  "sampleSpanMs": 2000,
  "groups": {
    "camera": {
      "validSamples": 21,
      "unavailableSamples": 0,
      "comparisons": 20,
      "changedComparisons": 20,
      "coverageChanged": 0,
      "lastValueCount": 48,
      "maxAbsDelta": 0.5,
      "maxAbsFromFirst": 2
    }
  },
  "observations": ["camerachanged", "partial"],
  "partial": true
}
```

Actual reports contain all seven group records, timing, reasons, input aggregates
and first/last observations. Metadata/reasons are bounded and no sample history
is retained; the stress regression's report is **7,266 bytes**, below 16 KiB.
The only retained vector snapshots are first/previous comparable cohorts, released
on finish. `successfulReads`, `unavailableReads`, `readErrors`, `primaryReadFault`
and `finishCallbackError` remain distinct. Read errors do not propagate through
the game loop. Finish callback exceptions are recorded without replacing the
primary read fault or retrying UI. The module catches only its observer/read/
callback/timer work; it does not wrap or suppress native render/update errors.

All times and intervals use the single injected `now` clock, never subtraction
between host, renderer frame and simulation clock origins. Timing includes first/
last sample start, interval count/min/max/sum, actual span, and total/max observer
read/aggregation duration. It excludes finish-UI callback time. Sample counts
include attempted observations, not independently measured delivered frames.

Observations are literal: `input/targetchanged`, `camerachanged`,
`viewport/projectionchanged`, `sampledscenechanged`, `projectedchanged`,
`shadingchanged`, `noRecordedMotionInSampledData`, `unavailable`, `partial`.
Camera-only changes with stable target stay separate; no camera-easing-as-drift
claim or root-cause classifier exists. No-motion can coexist with partial or
unavailable coverage and is never a visual/GPU pass.

`partial` conservatively flags missing/changed coverage, unknown input, observer
reasons, non-deadline completion, fewer than two samples, or gaps over 250ms at
the start/end/between observations. Overrun over 250ms also flags partial. This
250ms coverage marker is not an FPS target or callback-health diagnosis. Even a
complete sampled-data window cannot certify unsampled transforms or pixels.

## Verification and run identity

Sole model `gpt-6.1-sol`, session `01a18221-b4c5-70fe-befe-e556ea8e98f4`.
Session log basename:
`2026-10-28T10-50-09-481Z_01a18221-b4c5-70fe-befe-e556ea8e98f4.jsonl`.
First command 2026-10-28 10:50:16 UTC; deadline 11:02:16 UTC, including commit/report.
Baseline `b00597df`, game tree `fe47601d41652fa93fc51860efa655c1607eacb5`,
226 files / 35,157,288 bytes, matching inventory before this addition.
Read full contract, quality-mode note, instructions/quality rules, maintenance
README/full Citisten manual and camera/world causal reports. Inspected the real
native render hook, native scheduler and simulation/save boundaries read-only.

Actual commands and outputs:

- `node --check Games/Citisten3D/motion-diagnostic.mjs` and
  `node --check scripts/citisten_motion_diagnostic_check.mjs`: exit 0.
- `node scripts/citisten_motion_diagnostic_check.mjs`: exit 0,
  `MOTION DIAGNOSTIC PASS: 16 cases; CPU observer only, no native/GPU/visual acceptance`.
  Frozen samples, category separation, absent/zero frames, empty/null/nonfinite/
  malformed groups, cohort shape changes, read faults, callback exceptions,
  360-sample bound, delayed/early timers, slow read overrun, cancellation/restart/
  disposal, missing VM timers, clock faults and overflow are deterministic.
  Full contract-shaped sampler stubs run 360 fake-clock reads against a real
  simulation; snapshot is unchanged and poisoned game update/save/control/render
  methods have zero calls. This does not import or verify the sister sampler.
- `node Games/Citisten3D/native-check.mjs`: exit 0, including `NATIVE LOOP PASS`.
- `node --experimental-vm-modules Games/Citisten3D/continue-loop-check.mjs`:
  exit 0, `CONTINUE LOOP PASS`; Node's normal VM experimental warning is retained.
- `node scripts/citisten_save_resume_check.mjs`: exit 0,
  `SAVE RESUME PASS groups=5/5; CPU ONLY, not WebGL/native input/pixels/FPS or Water/SaveContinue acceptance`.
- `node scripts/citisten_camera_stability_check.mjs`: output
  `CAMERA STABILITY PASS: real Three world/view/projection matrices; CPU fixture only; no shaking root cause reproduced`.
- Catalog validation: exit 0,
  `CATALOG PASS: 129 entries, required schema, unique integer IDs, Git-tracked URLs`.
- Maintenance coverage before staging: exit 1, known
  `Missing docs/maintenance/games/001-brainrotboulevard.md`. Adding this module
  also requires parent-owned inventory reconciliation after commit; no manual
  was fabricated or checker weakened. Final post-commit result is in the handoff.
- Scoped staged diff and final syntax/test status are reported with the commit.

Three initial fixture failures are retained in the session: nonempty typed-array
freeze unsupported by Node; callback override bypassed the test's count wrapper;
power site's expected duration was mistakenly water's 10s instead of actual 12s.
Fixed fixture mechanics/expectation without changing product behavior or weakening
invariance. A later source review added post-read deadline/overhead measurement;
all 16 cases pass again with a read crossing the five-second deadline.

Five targeted Node suites pass, not five native gates. Screenshots 0, browser
runs 0, games added 0. Initial root free bytes 2,670,403,584, above the
2,147,483,648 floor; owned text growth remains below 1 MB. Final disk/commit/time
are in the handoff. No unrequested push; parent/sister dirty paths remain owned
by their writers and are not staged here.
