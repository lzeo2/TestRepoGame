# Foldwild corrective cycle: independent runner readiness

## Status and scope

**Latest: native-5 clean targeted PASS2/2 on eb917858; subjective review separate.**
Strict functional/render/capture gates completed with empty separately captured
stderr, no callback/game/diagnostic errors and unchanged runtime/assets. Cleanup
verified and slot explicitly released before receipt writing. This is one clean
bounded requalification, not broad M2/campaign/hardware/rights acceptance. Parent
still owns visual/animation judgment. Native-2 stale images, native-3 callback
failure and all earlier evidence remain immutable. No more browser run is queued. Queue: Citisten first, Foldwild second, Jank third, Wings fourth.
An approximate time is not GO. No foreign-process kills, installs or push.

Owned paths: `scripts/test_foldwild_upgrade.py`,
`scripts/test_foldwild_upgrade_runner.py`, this receipt, and
`foldwild-upgrade-evidence/corrective-cycle/` only. Existing two failed batches,
original QA receipt, screenshots and video are preserved without modification.
No runtime, catalog, manual, inventory, supplied-model or vendor changes.

## Diagnosis and bounded correction

The second historical batch recorded a 10-second `Page.goto` load timeout, then
its failure screenshot also timed out and replaced the primary exception in the
terminal traceback. Its original navigation error survived only in JSON. Empty
runtime-error arrays did not establish a successful load; that report had zero
completed cases and captures. The host/load-stall cause is still **unproven**.

Runner changes:

- Failure diagnostics are secondary: screenshot/DOM/context/browser-cleanup errors
  are recorded separately, never raised over the original per-case exception.
  The first failed case is retained and re-raised after the two distinct current
  cases, not retried. Failed phone Close is still a failed case, not absorbed.
- Navigation and reload explicitly retain `wait_until='load', timeout=10000`.
  App-menu and font readiness are separate explicit 10-second stages after load;
  existing model readiness remains 30 seconds. No navigation/Close timeout was
  increased and no gameplay assertion was relaxed. Failure screenshots get a
  smaller 3-second budget; optional DOM diagnostics use a 1-second CDP budget.
- Stage breadcrumbs precede real movement/video, reduced-motion input,
  arrival/preview, offered-wild routing, ability, pending-save/reload/replay,
  Flee and the single Close tap. DOM-content-loaded/load/crash events are logged.
  Request starts/completions/failures and pending requests at each stage are
  retained alongside HTTP-server path/status timestamps. Failure DOM diagnostics
  include document/font readiness, phase/view, focus, dialog and canvas parent.
- No new baseline contexts. Exactly two fresh current contexts are prepared:
  desktop1280x800 and real-touch390x844, including one390→320 inspector Close tap.
  Compact dark-OS-preference captures reuse these same contexts after normal play.
  Baseline737a559f evidence remains historical and unchanged, not recaptured.
- Runtime text is frozen in the local HTTP handler rather than individually
  fulfilled by Playwright routes. External-request refusal/error collection
  remains. Model/vendor bytes remain current and hash-checked. The three shared
  fonts are read from disk or exact `git show HEAD:<relativePath>` bytes when
  sparse-excluded and served only in memory: no font checkout/copy/install.
- New reports/captures go only into `corrective-cycle/`; unique `native-N/`
  directories prevent overwriting failures. Browser-free default output also
  moves into this owned directory. The aggregate5MB evidence cap still includes
  old files and excludes only the UI lane's mockup.

These changes improve failure attribution and remove redundant browser work;
they are not evidence that the stalled host or corrected visuals now pass.

## Preserved native acceptance checks, awaiting GO

Immediately after fresh world/model readiness, the existing inspector block now
runs BEFORE movement, long routing or battle. It opens the owned creature through
native buttons, resizes phone390→320, checks geometry, and performs exactly one
Close tap. Read-only pre-tap hit-target and immediate post-tap dialog/mode/focus/
canvas diagnostics are retained. It still requires unchanged expedition state,
one canvas restored into the viewport, world mode and loaded models; phone320
geometry is checked before restoring390. The regression asserts there is one
Close call and it precedes walking and wild routing. No synthetic events/retries.
Parent reports controller-close/late-load regression passed and owns the pending
runtime appearance/alias corrective source. This lane changes no runtime and
will test only the later frozen source after separate browser GO.

Fresh starter/seed42 input, Northern Clearing visible goal, Walk button,
≤1.8m arrival plus enabled exact `Preview trial`, Maren preview/Back without a
trial win; genuinely offered `wild-1` through disclosed Nearby markers; real
ability, manual pending save, reload/Continue, exact full next-Wait battle/RNG
comparison and Flee/Continue. No grants, state setters or synthetic battle wins.

Five-second desktop canvas recording and actual held-touch movement retain
read-only `playerMotion` samples, changing arm/knee and lifted-foot assertions,
grounded soles/no root bob/level boots, and position agreement. Reduced motion
is toggled through the checkbox, tested during real movement, saved and restored
through reload; it must freeze gait without preventing movement. Pause/resume,
44px targets, overflow, explicit150px scene minimum, renderer/cache/fallback
checks and one inspector Close tap remain. No retry or timeout inflation.

Existing campaign/high-trial victory, acquisition/evolution, rights, physical
hardware and original M2/single-Close holds remain. First old-source desktop
navigation/Maren/reduced-preference positives do not accept corrected source.
Corrected native battle/save/touch/Close/reduced-motion/visuals remain unaccepted.
Historical Hermes ticket `pi-15078-1792878686888-c26245d5.json` remains unresolved
at this readiness checkpoint; no advice is treated as slot permission.

## Executed browser-free checks

`python3 -B scripts/test_foldwild_upgrade_runner.py` exits0:

```text
PASS: exact 10s load/reload; explicit app/font readiness; primary exception preserved despite screenshot/DOM/cleanup failures; no retry; sparse font SHA; no browser imported
```

This uses fake pages and real exception identities, not a native-play fixture.
It exercises successful load/reload sequencing, original navigation timeout,
secondary screenshot/DOM/cleanup failures, no navigation retry, and exact tracked
font hashes. No Playwright import or browser/server start occurs.

`python3 -B scripts/test_foldwild_upgrade.py` exits0: all five existing Node suites
(data, save_v2, continuity, save_conflict, optional) pass. Data asserts exact80
canonical tracked/local SHA matches and7,300,844 canonical model bytes; v1/v2
fixtures, strict pending identity and exact replay remain separate from native
positive evidence. Full outputs and88local-asset SHA values are retained in
[corrective-cycle/phase-a.json](foldwild-upgrade-evidence/corrective-cycle/phase-a.json).
Python AST and scoped whitespace checks pass. At this dated preparation checkpoint,
no native run had yet been attempted; the later authorized execution is below.

Initial corrective-cycle free disk:2,637,938,688bytes, above2,147,483,648 floor.
Final pre-commit observation:2,630,770,688bytes free. All previously tracked
native evidence files compare byte-for-byte with HEAD; the old failures are
unchanged. The corrective Phase-A receipt contains5/5 passes,88asset hashes and
`browser_launched:false`. Both harness AST checks and the runner regression pass.
Only explicit owned paths enter the first serial QA commit lease after the
observed absent lock/empty index checks. No unrequested push or browser work.

## Fresh freeze after parent integration

At2026-10-25T00:53:22UTC, HEAD independently verified as
`9a23536d96a0da1c217e90692612b602dbe23d99`, with clean Git status before this
receipt update. Runtime commit is `0f6d4339`; current `view.js` SHA-256 is
`b5e5b383a06a4228f2a55a62df6710bead96ed1d4691d1801048270a647c1619`.
All12 current runtime-text hashes, including navigation, are recorded in
[freeze-9a23536d.json](foldwild-upgrade-evidence/corrective-cycle/freeze-9a23536d.json).
All88asset SHA values independently rechecked and match the dated Phase-A asset
manifest. Phase-A runtime hashes remain historical, not claimed current.
Parent reports20Node+10syntax+runner+shell passes; no independent rerun or native
pass is implied here. Free disk2,598,830,080bytes. No code changes, browser launch
or Git writes at this freeze checkpoint; only the QA receipt/freeze file changed.
Citisten's00:50 first GO and planned release/cap times are NOT release permission.
Foldwild still requires Citisten's explicit actual release AND separate parent GO.

## Corrective native-1: authorized command, exit1

After Citisten explicitly released at01:03:49UTC and parent issued01:05UTC GO,
this exact bounded command ran once:

```sh
timeout --signal=TERM --kill-after=10s 600s python3 -B scripts/test_foldwild_upgrade.py --go
```

One serial system `/usr/bin/chromium` batch ran with its own empty-slot check and
2,623,045,632bytes free before launch. Evidence is preserved in
[corrective-cycle/native-1/native-results.json](foldwild-upgrade-evidence/corrective-cycle/native-1/native-results.json).
Both before/after source hashes match the fresh9a23536d freeze, and all88asset
hashes match. `passed:false`, `browser_stopped:true`, `server_stopped:true`,
`sources_frozen:true`, `assets_frozen:true`, `errors:[]`, no final pending requests.
All67requests and67server responses are logged without error exclusions. Empty
error-event lists do not override the two failed case results.

### Desktop failure: primary preserved, startup cause not proven

```text
current-1280: Locator.click: Timeout 10000ms exceeded.
#start was visible, enabled and stable; scrolled into view; performing click action.
```

Navigation/load/app-menu/font stages completed by4.867seconds. Starter input was
at5.003seconds and the click failure at15.018seconds. Read-only failure diagnostics
show document complete, fonts loaded, phase world, renderer frames0, three pending
models (`pluvell`, `budriv`, `leafnock`), no fallback and canvas in the viewport.
Those model requests were not dispatched until20.613–20.625seconds and completed
at21.772–21.781seconds. No pending network request existed at the failure stage.
This localizes the stall to startup/input/render initialization before normal
model-request dispatch, but does not establish its CPU/GPU/driver root cause.
No runtime exception, missing asset or font load error was observed.

The failure screenshot separately timed out at3000ms after fonts loaded. It is
recorded in `diagnostic_errors`; it did NOT mask the original Start-click error
in JSON or the terminal traceback. Desktop never reached the inspector or walk,
so there is no corrected desktop screenshot/video, ability or pending-save proof.

This batch order was **desktop first**, then phone. Phone subsequently loaded and
rendered normally in the second fresh context of the same browser. Therefore the
receipt does NOT prove a phone-close→new-desktop context-reuse/GPU stall. A fresh
browser per case is not implemented as an unsupported root fix; any later topology
experiment requires parent authorization. No timeouts, input acknowledgements,
load readiness or assertions were bypassed.

### Phone partial positives on the actual corrected frozen runtime

-390x844 world: canvas374x286.5625, no horizontal overflow and no visible control
 below44px.320x844 restored world: canvas304x286.5625, also no overflow/small targets.
- Early native owned-creature inspection and exactly one Close after390→320 pass.
 Close hitbox123.859375x44, center hit `collection-close`, pointer events auto.
 Immediate post-tap: dialog closed, world mode, canvas parent viewport, focus
 game-canvas. Original expedition state and single restored canvas checks pass.
- Genuine single-touch held movement advances(0,16)→(0,9.3352), with10read-only
 samples, rootY0 and at least one grounded foot throughout. Left-arm range0.59312rad,
 knee range0.934402rad; lift/boot/no-root-bob and position checks pass. Phone mode
 records motion samples, not a video; desktop failed before its five-second video.
- Reduced-motion checkbox plus genuine held movement passes with6samples:
 phase/arm/knee ranges0. Manual preference save, ordinary reload/Continue,
 restored checkbox and saving false again pass. This is preference persistence,
 NOT pending-battle save/continuation acceptance. Pause/resume also pass.
- Northern Clearing Walk,≤1.8m arrival plus enabled exact `Preview trial`, Maren
 preview and Back pass without crediting a trial. Actual corrected screenshots
 are available for parent subjective review, not automatically accepted polish.

Phone failed when waiting to tap hidden `#dialogue-start` (10000ms). No battle
opened. The failure screenshot visibly says four fiber were gathered; the native
Interact actually collected the supply near(18,-18), not the intended wild near
(10,-8). Read-only final position was(17.1221758,-18.6891401), still en route.
No ability, battle failure, Flee or exact pending-save next-action was exercised.

### Diagnosed runner bug and authorized browser-free fix

The historical wild-route `wait_for_function` predicate was async. Installed
Playwright polling was inspected: it executes `const success = predicate(); if
(success) fulfill(success)` without awaiting the predicate first. A Promise that
resolves false is itself truthy, so that wait finished before reaching the wild.
This explains the premature supply interaction; it is not a game battle defect.

Parent explicitly authorized the runner fix after diagnosis. `wait_for_wild` now
awaits a read-only module import/actual target lookup in `page.evaluate` once,
then polls a **synchronous** Boolean distance≤1.8/enabled/action-label predicate
with that target passed through `arg`. The existing45000ms limit is unchanged.
No async `wait_for_function` predicate remains anywhere in the runner. No runtime
patch, state grant, weakened check or native retry followed.

`python3 -B scripts/test_foldwild_upgrade_runner.py` exits0 and now additionally
prints:

```text
PASS: Promise(false) pitfall; actual synchronous wild poll rejects far/disabled/wrong-target and accepts arrived
```

It executes the actual runner expression in Node's standard `vm`, demonstrates
Promise(false) truthiness, checks far/arrived/disabled/wrong-target fixtures, asserts
all polling returns Boolean, and AST-rejects reintroduced async wait predicates.
Existing exact10s navigation, primary/secondary error preservation, no-retry,
early single-Close ordering and sparse-font SHA regressions still pass.
This browser-free fix is NOT a native rerun or acceptance result.

### Captures, outcomes, cleanup and handoff

Six JPEGs under `corrective-cycle/native-1/`,158,654capture bytes total:
`current-390-world-scenery-ui.jpg`, `current-390-character.jpg`,
`current-390-320-inspector-before-close.jpg`, `current-390-arrival.jpg`,
`current-390-maren-preview.jpg`, `current-390-failure.jpg`.
The whole native-1 directory is245,032bytes including the exact results log.
All older failures, captures and video remain untouched. No new video exists.

| Requested gate | Corrective native-1 result |
| --- | --- |
| Desktop ordinary Start/render/inspection/video | FAIL at Start acknowledgement; not completed |
| Actual phone one390→320 Close | PASS once, with state/canvas/mode/hit diagnostics |
| Phone articulated touch movement and reduced checkbox/preference reload | Partial positive passes above |
| Corrected Northern Clearing and Maren preview | Phone PASS; desktop not reached |
| Real wild ability/pending save/reload/exact next action/Flee | NOT REACHED; async runner bug diagnosed/fixed only browser-free |
| Both OS schemes | Dark captures not reached |
| Subjective corrected visual acceptance and hardware pacing | Held for parent review; not claimed |

End-of-batch free disk2,622,500,864bytes; later observation2,621,476,864bytes.
No own Chromium remote-debugging roots remained after closure; no foreign process
was killed. Playwright browser.close completed (its temporary profile is managed
by Playwright); no profile path was retained for an independent deletion audit.
The browser/server are stopped and Foldwild explicitly RELEASED its slot by
parent message; Jank still requires parent's next GO. No second corrective browser
attempt is queued or authorized by this receipt. Existing historical M2, broad
campaign/acquisition/evolution, rights and physical-device holds remain separate.
QA-only commit lease covers this runner regression/fix and receipt/evidence;
no runtime, asset, catalog, manual, inventory, install or push change.

## Cold-start attribution prep: browser-free, waiting for fourth-slot release

New `scripts/diagnose_foldwild_start.py` is a separate diagnostic, NOT an
acceptance runner or speculative runtime fix. Default invocation is browser-free;
`python3 -B scripts/diagnose_foldwild_start.py` exits0 with:

```text
PASS: fake CPU profile inclusive/exclusive/stack weights; malformed profile rejection; primary click preserved after secondary profiler failure; no browser
```

Existing `python3 -B scripts/test_foldwild_upgrade_runner.py` also exits0, including
the actual synchronous wild-poll/Promise(false) regression. No changes to that
runner, its fix, source-gate tests or the parent-reported20Node gates were made.
AST passes. No browser launched in this preparation; all old failures remain.

Only after Wings FOURTH explicitly releases AND parent sends fresh GO:

```sh
timeout --signal=TERM --kill-after=10s 110s python3 -B scripts/diagnose_foldwild_start.py --go
```

The script checks slot/disk and exact frozen runtime/88asset manifests before
launch, uses one fresh desktop1280x800 context with system `/usr/bin/chromium`,
and serves exact runtime/fonts through a small local HTTP handler/shared QA
helpers. No baseline contexts, install, runtime patch, browser-topology workaround,
input retry or state grant. Existing load/menu/font/click10s and model-ready30s
limits remain. If Start click times out, that original exception remains a
failure even if model readiness later succeeds; this cannot become acceptance.

Read-only init instrumentation records passive Start click CAPTURE/BUBBLE times,
first RAF/first RAF after Start, and PerformanceObserver long tasks. CDP CPU
Profiler uses10000microseconds(10ms), starts BEFORE the single click, and stops
after the existing model-readiness boundary or its failure. Compact profile output
is below300,000bytes: sample-delta weighted inclusive/exclusive functions and
root-to-leaf stacks, with explicit sampling/native-GPU attribution limitations.
This targets whether context/size/terrain/render/input initialization dominates;
it does not presume context reuse or promise exact native getContext/GPU timing.
Parent additionally compared native-1 HTTP-server GLB timestamps20.661/20.699/
20.701seconds with client dispatch: delay is not merely late Python request-event
delivery. This is parent-supplied timing evidence, not a measured GPU root cause.

Durable atomic stage JSON checkpoints precede critical browser/CDP calls, so a
hard kill leaves the last entered boundary. Internal100s admission plus external
TERM at110s/kill after10s caps total process lifetime at120s including grace;
TERM enters cleanup when Python can handle it. This tightens only the diagnostic
outer budget, not application load/click/model timeouts.
Profile-stop, trace, failure screenshot and cleanup errors are secondary and do
not replace the original click exception. A3s actual screenshot and five-second
actual-keyboard canvas video are attempted only as diagnostic evidence (video
only if world/model ready), under the existing aggregate5MB cap. Browser/server
close in finally; future execution must verify roots/closure rather than infer
success from a checkpoint. Files go only into unique
`corrective-cycle/start-diagnostic-N/` directories. No native run is authorized
by this prep receipt or by an approximate slot-release time.

Preparation free disk2,619,695,104bytes initially;2,619,301,888bytes after
browser-free checks, above2,147,483,648-byte floor. Diagnostic prep committed as
`a2adb777`; QA-only explicit-path commit lease requires absent lock/empty index.
No push.

## Prepared native phone video parity, NOT executed

After the separate diagnostic-prep commit, parent required actual walking video
for BOTH future native cases. The existing native runner now unconditionally
starts/stops the same canvas captureStream/MediaRecorder in desktop and phone,
with five seconds of actual held keyboard or genuine single-touch input. Each
case writes its own `current-1280-walking.webm` or `current-390-walking.webm` in
the new run directory. No previous video can be overwritten. Limits remain
below1,000,000bytes per video and5,000,000bytes across all evidence; gait/grounding
checks are unchanged. The safe northward spawn lane is traversed through real
input only; normal controller navigation refreshes afterward. Reduced-motion
movement stays one second, and early Close, full battle/save/exact replay and
all readiness/input timeouts remain unchanged. Five-second action duration is
not timeout inflation and encoded duration will be measured rather than padded.

The browser-free runner regression now AST-checks unconditional video start/stop,
shared five-second held input, and per-case filename, alongside all existing
checks. It and the profiler self-check pass; no browser or new native capture
was produced. Latest observed free disk2,618,748,928bytes. Still waiting for
Wings FOURTH actual release AND separate parent GO for any future browser run.

## Authorized cold-start probe: one execution, diagnostic exit1

After Wings' explicit release and parent01:23UTC probe GO, ran exactly once:

```sh
timeout --signal=TERM --kill-after=10s 110s python3 -B scripts/diagnose_foldwild_start.py --go
```

Own preflight: zero Chromium roots,2,617,999,360bytes free. Runtime and88asset
hashes matched the frozen manifests before/after. Results, compact CPU summary,
video and postflight are in `corrective-cycle/start-diagnostic-1/`. No runtime or
runner edits, case retry, full acceptance batch or later browser launch followed.

**The historical Start timeout was NOT reproduced.** Click returned in4.16735s
within the original10s limit; world/models were ready at13.4793s from probe start.
Read-only event trace: capture7699.9ms, bubble9207.5ms (1507.6ms input handler),
first post-Start RAF9219.9ms (12.4ms after bubble). Long tasks include1518ms during
input and731ms during subsequent rendering. Instrumentation can alter timing;
this does not clear the earlier intermittent cold-start failure.

Sample-delta weighted10ms CPU profile:430samples,4,560,656microseconds accounted,
4,566,773microseconds profile wall interval. Inclusive attribution:

| Function/stack boundary | Sampled inclusive milliseconds |
| --- | ---: |
| Start handler |1479.782 |
| createView |1307.086 |
| native `getContext` bridge inside createView |1193.551 |
| terrain |50.493 |
| WebGLRenderer.setSize |10.173 |
| render |709.663 |
| getExtension under first render program selection |496.953 |

The captured input task is dominated by context acquisition rather than terrain
or setSize. This is sampled call-stack attribution, NOT measured GPU timing,
proof of why the prior15-second startup stalled, or permission for a speculative
renderer change. Idle accounts for1863.309ms of the profile. Top80functions and
40stacks are retained in59,314byte `cpu-summary.json`; raw profile43,229bytes was
received but not retained. Full event/long-task/request timings are in `results.json`.

The ordinary page screenshot timed out at the fixed diagnostic3000ms; it remains
a secondary diagnostic error. That is why this probe exits1 despite successful
click/model readiness. No exception was hidden or converted into acceptance.
A five-second real held-W action produced `diagnostic-walking.webm` (37,247bytes):
controller(0,16)→(0,11.8). `ffprobe` reports VP8,763x540,18frames,3.408867s encoded
video. Input was held5s; sparse software frames yield a shorter encoded span.
No padding or smooth/hardware performance claim. `diagnostic-video-frame.jpg`
(17,526bytes) is an actual canvas frame extracted at video1s with:

```sh
ffmpeg -v error -ss 1 -i docs/foldwild-upgrade-evidence/corrective-cycle/start-diagnostic-1/diagnostic-walking.webm -frames:v 1 -q:v 4 docs/foldwild-upgrade-evidence/corrective-cycle/start-diagnostic-1/diagnostic-video-frame.jpg
```

That derived image is NOT relabeled as the failed full-page screenshot. Parent
must review it/video separately. Native battle/save/exact replay, both-case video
and broader visual/campaign acceptance remain held; this instrumented probe tests
none of those gates.

Cleanup receipts: browser.close succeeded, server stopped, subsequent pgrep
found zero Chromium roots, and no default `playwright_chromiumdev_profile-*`
directories remained in the system temporary directory. No foreign kill or
external cleanup. End-of-batch free disk2,617,831,424bytes; after frame extraction
2,617,524,224bytes. Aggregate evidence before postflight812,282bytes, below5MB.
Foldwild explicitly released the probe slot to parent for Jank. No full retry is
queued; another browser run requires separately coordinated explicit GO.

## Prepared viewport capture correction: browser-free only

Following the preserved Page.screenshot failures, parent authorized a different
asynchronous native viewport path, not a larger timeout or runtime fix. The
prepared full native runner now uses `CDP Page.startScreencast` (JPEG55,
maxWidth/maxHeight from the CURRENT page viewport, everyNthFrame1). It listens for
`Page.screencastFrame`, ACKs the sessionId, pumps only within one absolute3s
budget, then stops and detaches in finally. Setup, frame receipt and cleanup
elapsed time are recorded; a frame arriving late or total elapsed>3 is rejected,
even if pixels eventually exist. A hung CDP start remains under the external
batch cap; no acceptance can be inferred beyond3s. Cleanup errors cannot replace
a primary capture exception. No fallback path or capture retry is added; if a
normal viewport attempt already failed, the case boundary skips another failure
capture and records that skip rather than requesting the same pixels again.

Both normal and failure-diagnostic captures use this path. It captures native
viewport UI pixels, not just the canvas and not a reconstructed/mockup image.
The next manifest records method, viewport dimensions, JPEG quality, stride,
3s budget, frame/total timings, raw CDP metadata, accepted flag and cleanup errors.
Only accepted bytes are saved. No Page.screenshot call remains in the prepared
full native runner; the earlier one-off probe/its failed screenshot evidence is
historical and untouched. This is not evidence of a GPU/model root cause.

Browser-free fake-CDP regression covers1280/390/320 current widths, frame ACK,
stop/detach, no-frame timeout, late frame rejection, cleanup deadline rejection,
original exception identity despite stop+detach errors, and exactly one start.
The existing AST guard rejects Page.screenshot calls, async wait predicates and
changes to early single Close ordering or unconditional five-second/per-case
video. All game/font/model/state/44px/readiness/save/replay/reduced-motion checks
remain; application input/readiness timeouts and20Node source gates are untouched.

`python3 -B scripts/test_foldwild_upgrade_runner.py` passes, including:

```text
PASS: CDP native viewport/current dimensions; frame ACK; absolute 3s/no-frame/late-frame/cleanup deadlines; stop+detach; primary exception preserved
```

Python AST and the profiler self-check also pass. No browser or capture was
launched in this prep; Jank owns its coordinated retry slot. A second full
corrective desktop/touch run is only prepared, not authorized until that queue
explicitly releases and parent sends another GO. No runtime/dependency/asset
change, foreign kill, baseline context, timeout inflation or push.

## Second corrected full-batch readiness, awaiting next parent GO

Viewport-capture commit `a8343201` landed and its regression passed. Parent
acknowledged Wings'01:32UTC explicit release and reviewed the3s/no-fallback path.
No browser is launched by this readiness update; fresh slot/disk admission and
another explicit parent GO are still required. The prepared command is now:

```sh
timeout --signal=TERM --kill-after=10s 590s python3 -B scripts/test_foldwild_upgrade.py --go
```

TERM590s plus10s kill grace caps total process lifetime at600s including cleanup;
existing internal570s budget and application timeouts/assertions are unchanged.
The already available report writer now checkpoints at existing stage boundaries
and immediately before each viewport-capture call. No new framework or fallback.
All old/diagnostic receipts remain immutable; future output uses the next unique
native directory. Runtime/source freeze is unchanged.

Final information-yield correction: a viewport-capture exception is recorded as
an evidence/case/overall FAIL and retains the first original exception, but does
not abort independent native movement/video/battle/save checks. Functional
exceptions still abort that case. A case with any failed capture cannot become
passed even if functional checks finish; the batch finally raises the first
original error. No capture retry, fallback, longer deadline or assertion removal.
Browser-free regression proves later functional success cannot turn the media
gate green and multiple media failures retain the first exception. No browser
launched; still awaiting parent GO.

## Native-2 executed: functional PASS, stale-visual FAIL retained

Executed once after explicit01:36UTC GO:
`timeout --signal=TERM --kill-after=10s 590s python3 -B scripts/test_foldwild_upgrade.py --go`.
`corrective-cycle/native-2/native-results.json` is preserved unmodified: exit0,
functional2/2PASS, zero runtime/case/diagnostic errors, frozen12runtime/88asset
hashes, stopped browser/server. Own preflight had zero roots and2,613,915,648bytes;
after batch2,612,539,392bytes. Slot was explicitly released immediately after
cleanup, before receipt work. No roots/default temporary Chromium profiles remained.

Both desktop1280x800 and genuine-touch390x844 completed early one Close (phone
390→320), unchanged state/single-canvas/world readiness,44px/overflow checks,
actual five-second movement with articulated/grounded read-only samples, one-second
reduced-motion movement and preference save/reload, pause/resume, Northern Clearing
Walk/arrival/Maren preview/Back, offered Budriv wild1, ability0, manual pending save,
reload/Continue, exact complete next-Wait battle/RNG comparison and Flee/Continue.
No state grant or imported positive-play fixture. Dark OS views reused contexts.
Desktop immediate Close sample observed a transition from inspection after the
dialog closed; the existing later world/model/canvas/state checks passed without
another click. Phone immediate sample was already world/viewport. This targeted
pass does not replace the original/async full M2 stability gate.

13CDP viewport JPEGs and two actual walking videos were retained (648,362media
bytes); protocol capture totals0.1483–1.7420seconds, all below3s. Parent then
proved at least two semantically stale captures: desktop wild-battle still shows
world avatar/Budriv while HUD is battle; desktop arrival still says distance3/
Stop walking after the arrival predicate. Functional assertions remain PASS;
visual evidence is NOT accepted. See `native-2/visual-review.json`. No original
image, video or native result is overwritten or deleted.

Videos: desktop47,479bytes/763x540/20frames/4.080711s encoded; phone155,684bytes/
374x286/60frames/5.347191s. Both actual input actions lasted5s; sparse desktop
encoding is shorter and not padded or claimed smooth hardware performance.
Two derived1fps contact sheets are labeled `*-walking-frames.jpg`. Full timing,
geometry, chosen target, pre/post Close samples and motion samples are in JSON.
Fresh browser-free data/save_v2/continuity/save_conflict/optional suites all exit0,
including canonical80SHA matches/7,300,844bytes and v1/v2/exact replay fixtures.
Those fixtures remain separate from native-positive play. Postflight records the
commands; the parent-reported20Node gates are neither changed nor silently rerun.

## Diagnosed freshness correction: browser-free PASS, no rerun yet

`ready` now uses ONE absolute30s budget: first await mode and required model
count; only THEN snapshot global frames. Require three subsequent renders with
mode/model conditions still satisfied, using ONLY remaining time. This fixes the
reviewed edge where old frames accumulated before model attachment. Final elapsed
checking rejects late completion; no timeout is reset/increased.

CDP capture now ACKs/discards its FIRST potentially cached frame and chooses the
SECOND subsequent frame only. The same absolute3s includes setup/pumping/cleanup;
a first-only or late second frame fails. Both frame metadata/timings, received
count and chosen index are recorded. No forced render, mutation, fallback or retry.
Media failures still leave overall/case FAIL and first original error intact
while independent functional checks continue.

Browser-free regression passes: actual readiness JS rejects old frames, wrong
mode and missing models;20s model delay leaves10s, not another30s; late completion
fails. Fake CDP proves cached bytes are never returned, first-only fails, second
bytes are selected, late second fails3s, both frames ACKed and stop/detach/primary
cleanup protections retained. Existing synchronous poll/media-failure/video/early
Close guards pass. No runtime/source/88asset change or browser launch in this fix.
Broad visual approval, hardware pacing, campaign/acquisition/evolution, rights,
original M2 stability and release/full-fleet/push holds remain separate. Parent's
inventory edit is not owned/staged by this lane.

## Native-3: final strict-freshness hypothesis execution

After explicit01:47UTC GO, ran once:
`timeout --signal=TERM --kill-after=10s 590s python3 -B scripts/test_foldwild_upgrade.py --go`.
Own preflight: zero roots,2,610,728,960bytes free. Output:
`corrective-cycle/native-3/`. The process exits0 and original `native-results.json`
reports both cases passed, but this is **NOT a clean audited pass**: terminal
callback failure below is additional evidence, not excluded because JSON missed it.

### Native functional outcome retained

Both fresh desktop1280x800 and real-touch390x844 completed mode/models THEN
three fresh renders within the single shared30s budget; early inspector Close
(phone390→320, exactly one tap); unchanged state/single-canvas/world restoration;
44px/overflow; actual5s keyboard/touch gait/grounding; one-second reduced gait
freeze with continued movement and preference save/reload; pause/resume; Northern
Clearing Walk/arrival/Preview/Maren Back; real offered Budriv wild1/ability0;
manual pending save/reload and full exact next-Wait/RNG comparison; Flee/Continue;
dark-OS-preference geometry/captures. No grants, fixtures or synthetic events.
Both immediate post-Close diagnostics were closed/world/viewport/game-canvas.

Walking samples: desktop29, phone27; rootY0 and a grounded sole throughout.
Arm ranges0.8800/1.02784rad, knee ranges1.226897/1.224868rad. Both reduced-motion
runs have6samples and zero arm/knee phase movement, with saved preference reload.
These sampled positives do not imply hardware pacing or a naturally completed
campaign. Last completed-case checkpoint138.566seconds; bound not exhausted.
Runtime12text hashes and88asset hashes are identical before/after. Original JSON
has138requests, no game-error events, and empty failure/diagnostic-error arrays;
those arrays are incomplete for the SDK callback event documented next.

### Unhandled terminal callback: audited clean-pass HOLD

At phone wild-battle viewport capture, before manual pending save, the terminal
reported:

```text
Exception in callback SyncBase._sync.<locals>.<lambda>()
capture_viewport.received -> session.send('Page.screencastFrameAck', ...)
playwright._impl._errors.TargetClosedError: CDPSession.send: Target page, context or browser has been closed
```

Exact message and relevant relative trace boundary are preserved in
`native-3/callback-error.txt`; original JSON remains unmodified. The callback's
ACK exception escaped the helper's synchronous try/catch through Playwright event
dispatch and was not collected by its JSON error arrays. A queued frame callback
through stop/detach is the diagnosed shutdown-race hypothesis. Some other phone
captures recorded a third frame while correctly retaining frame2; this capture
recorded two before the late ACK failed. This is a harness diagnostic defect,
not evidence of a game exception or permission to silently waive the media gate.
No code fix, retry, fallback, deadline increase or another browser launch followed.
`postflight.json` records `audited_clean_harness_pass:false` despite original
`passed:true`, retaining the functional2/2 result separately.

### Captures and reviewed-versus-unreviewed distinction

13full-viewport JPEGs and2walking videos retained,682,694native media bytes.
Each JPEG selected frame2, recording both first/discarded and second metadata;
recorded synchronous capture totals0.1929–0.6894seconds under3s. This protocol
result does NOT by itself establish pixel freshness; parent must inspect the
arrival and battle images against the native-2 proven stale examples before
accepting visuals. No image is substituted, overwritten or relabeled accepted.

Desktop video:67,084bytes,763x540,29frames,4.388794s encoded from5s actual held-W.
Phone:165,600bytes,374x286,63frames,5.332651s from5s actual held touch. No padding
or smooth hardware claim. Derived contact sheets (19,561/20,733bytes) are named
`current-1280-walking-frames.jpg` and `current-390-walking-frames.jpg`, extracted
with the previously recorded1fps/scale280/tile4x1 command. They are review aids,
not replacement native viewport screenshots. Every old artifact remains intact.

### Cleanup and final handoff

Before writing this receipt, browser.close/server stop succeeded; pgrep found
zero Chromium roots and the system temporary directory contained no default
Playwright Chromium profiles. Foldwild directly notified parent of explicit slot
RELEASE, functional results, unhandled callback and exact paths. No foreign kills,
external cleanup, runtime/asset changes or push. After batch free disk
2,609,479,680bytes; later before derived frames2,609,274,880bytes. Aggregate evidence
before postflight2,657,037bytes, below5MB. Parent inventory remains out of scope.

Original/async M2 stability, broad natural campaign/capture/evolution, rights,
physical-device performance, subjective visual approval and release/full-fleet
holds remain separate. This was the one authorized fresh-frame hypothesis run.
No further browser or capture attempt is queued; return to parent before any
repeat. Browser-free regressions may pass but did not simulate this queued
post-detach ACK race; the observed diagnostic is not weakened away.

## Callback lifecycle correction: browser-free only, native verification pending

Native-3 artifacts and the exact sanitized terminal-boundary excerpt were first
committed as `6ca92e97`, retaining functional2/2PASS and the non-clean harness
verdict. Parent retains the new fresh pixels for review; no prior artifact was
changed to hide the callback error. Parent inventory is excluded from both leases.

The capture helper now assigns event sequence AT CALLBACK ENTRY, before any
synchronous/reentrant ACK. Only exact event2 can become the selected frame, even
when ACK2 completes before ACK1. Every active callback catches ACK/processing
exceptions into a mutable list shared with the report and preserves the original
exception for a failed capture. No exception-type whitelist is used. Inactive
callbacks do not issue ACKs. Shutdown sets inactive and removes the listener
BEFORE drain/stop/detach. Final reviewed order is remove listener, drain already
issued ACK replies within the SAME absolute3s, stop screencast, then detach. Stop
cannot cancel an outstanding ACK; inactive new frames never issue another ACK.
The fake stop operation asserts zero in-flight ACKs and the order guard passes.
Timeouts, cleanup errors or active callback errors still fail; no longer budget,
forced rendering, state grant, fallback or retry. Capture/model readiness and
all gameplay/media-failure gates remain unchanged.

Final batch checks AFTER contexts/browser close include the shared callback-error
list. A late mutation cannot leave the final report green. New native invocations
also capture stderr separately into the run directory. On normal cleanup it is
sanitized to `stderr.txt` (repository/runtime prefixes replace machine paths) and
audited for Unhandled, TargetClosed, event-listener errors, Traceback or Exception
in callback markers. Any marker forces failed postflight even if gameplay/JSON
otherwise passed; original errors are not filtered. Captured text is re-emitted
after restoring stderr for the operator timeline. A hard-killed `stderr.pending`
is incomplete raw evidence: sanitize/audit it before any commit, never infer a
clean result. No native stderr file has yet been produced by this code revision.

Browser-free runner regression passes: events during stop/after detach issue no
ACK; ACK2-before-ACK1 completion still chooses event2; active ACK failure preserves
exception identity, serializes its callback error and forces case/overall FAIL;
shared30s model+fresh-frame and absolute3s capture limits still reject late results.
Stderr marker/sanitization fixtures and existing synchronous wild poll, five-second
both-case video, single Close, media-failure/first-error guards all pass. The
profiler self-check also passes. No browser launch or runtime/88asset edit occurred.
At this preparation checkpoint a clean harness/native result was NOT claimed;
the separately authorized native-4 requalification follows. Source freeze remains
unchanged; no further launch is queued after that run.

## Native-4 clean callback requalification,02:04UTC GO

Ran exactly once at harness commit `d7c39e73`:

```sh
timeout --signal=TERM --kill-after=10s 590s python3 -B scripts/test_foldwild_upgrade.py --go
```

Own preflight: zero Chromium roots and2,607,607,808bytes free. The batch exits0,
2/2desktop1280x800/actual-touch390x844 cases PASS. Final checks AFTER browser/context
closure include mutable callback errors and separately captured stderr:
`callback_errors:[]`, `errors:[]`, `failures:[]`, no diagnostic errors;
`stderr.txt` is0bytes and audit clean, no terminal callback/Traceback observed.
Source12text and88asset SHA values match before/after and the existing freeze.
No gameplay/readiness/capture assertion, timeout or error filter was weakened.

Both cases completed early one Close (phone390→320 exactly one tap), unchanged
state/single-canvas/world/model restoration,44px/overflow, actual5s keyboard or
held touch with changing grounded gait, reduced checkbox1s movement/gait freeze
and preference save/reload, pause/resume, Northern Clearing Walk/arrival/Maren
preview/Back without trial credit, offered Budriv wild1 and actual ability0,
manual pending save/reload, full exact next-Wait battle/RNG replay, Flee/Continue,
and dark-OS geometry/views. Desktop immediate Close diagnostic was transitional
inspection before the original eventual world/canvas checks passed; no second
click. Phone immediate diagnostic was already world/viewport/game-canvas.

13full-viewport JPEGs selected exact frame2, with first-frame metadata retained;
all captures had zero in-flight ACKs at completion and totals0.2082–1.2536s within
absolute3s including remove-listener/drain/stop/detach. Two actual5s walking videos:
desktop67,084bytes/763x540/29frames/4.596451s encoded; phone172,444bytes/374x286/
66frames/5.439816s encoded. Sparse desktop span is honestly shorter, not padded or
claimed hardware-smooth. Both had29read-only motion samples, rootY0 and grounded
soles; reduced runs each6samples with zero arm movement. Native media690,800bytes;
derived four-frame review sheets19,622/19,773bytes. Parent must judge the actual
arrival/battle/scenery/character/UI frames and movement, not infer polish from
protocol success. Whole original/async M2 stability remains distinct.

Artifacts: `corrective-cycle/native-4/native-results.json`, `stderr.txt`,
`postflight.json`, thirteen descriptive JPEGs, both `*-walking.webm` and derived
`*-walking-frames.jpg`. All native-2/native-3/prior failure artifacts remain
unchanged, including the native-3 terminal callback and audited non-clean verdict.
Last completed-case checkpoint135.979s; the600s total bound was not exhausted.

Immediately after command return, browser/server stopped flags were verified,
pgrep found zero roots, no default temporary Playwright Chromium profiles remained,
and parent received explicit slot RELEASE with results/paths before this long
receipt. No foreign kill or external cleanup. End-of-batch disk2,606,624,768bytes;
later before derived sheets2,606,452,736bytes. Aggregate evidence before postflight
3,617,757bytes, below5MB. Runner regression and profiler self-check pass afterward;
no new browser, code/runtime/asset/manual/inventory edit, install or push. Existing
Foldwild only: no game added, ingested, authored or registered by QA. Parent's
dirty inventory is explicitly excluded from staging. Subjective review, broad
campaign/acquisition/evolution, original M2 stability, rights, physical-device and
full-fleet/release/push holds remain. No further browser or capture is queued.

## New product-polish freeze eb917858: browser-free prep only

Parent changed runtime in `eb917858` after native-4 review: auto routes stop
beside targets and phase changes reset the controls panel scroll. QA made no
runtime edit. New script SHA is
`51bacd230419a605d017a5129e950d7f6db0de9e7c267f538ab8503044230f4a`;
view remains `b5e5b383a06a4228f2a55a62df6710bead96ed1d4691d1801048270a647c1619`.
All12runtime hashes independently compared: script is the sole difference;
all88asset hashes unchanged. New `freeze-eb917858.json` and full dated
`phase-a-eb917858.json` retain current hashes/results without overwriting old
Phase-A/native4 evidence. Native4's clean result applies only to old script.

Future arrival checks keep45s but require1.2-1e-7≤distance≤1.4m plus enabled
Preview trial. The wild synchronous poll uses the same standoff interval and
matching enabled action. Read-only rendered rival/wild positions are recorded
and independently asserted against player distance; no NPC overlap is granted.
After Flee/Continue/world readiness, BEFORE manual save or any visual scroll,
assert the objective heading has visible bounds below the sticky toolbar and
inside the controls panel/viewport. Only after that phase assertion/manual save,
the final dark capture may center the objective through native DOM scrollIntoView;
this is visual setup, not a state grant. All model/frame/ACK/stderr, functional,
video and deadline gates remain unchanged.

Browser-free runner (including actual wild predicate accepting1.3m and rejecting
1.1m/too far plus rendered-target separation fixtures) passes. Fresh data/save_v2/
continuity/save_conflict/optional5of5PASS, including canonical80SHA/old-save/exact
replay fixtures. Parent reports20Node+shell/syntax with standoff/phase-reset source
regression PASS; this is not an independent20suite rerun or new native acceptance.
No browser launched; awaiting coordinated parent GO for this actual product change.
Parent inventory remains excluded from the QA commit.

## Native-5: changed product qualified cleanly,02:22UTC GO

One authorized run at product `eb917858`/harness `7ac773ca`:
`timeout --signal=TERM --kill-after=10s 590s python3 -B scripts/test_foldwild_upgrade.py --go`.
Own preflight independently verified script51bacd23/viewb5e5b383, zero roots and
2,604,535,808bytes free. Native-5 exits0, clean2/2desktop1280x800/real-touch390x844
cases. Captured `stderr.txt` is0bytes; stdout had no exception, and callback,
game, failure and diagnostic arrays are all empty.12runtime/88asset hashes match
before/after. Every original domain, model/fresh-frame/3s capture/ACK/stderr,
single Close, real ability, manual pending save/reload/exact Wait RNG/Flee,
reduced-motion preference, dark and both-video condition remains enforced.

Strict rendered-actor separation, metres (required1.2-1e-7..1.4):

| Case | Maren | Budriv wild1 |
| --- | ---: | ---: |
| Desktop |1.228956083 |1.205278181 |
| Actual touch |1.390321814 |1.367051817 |

Arrival still requires enabled exact Preview trial within the same45s; Maren is
previewed/backed out, not defeated. After Flee/Continue/world ready and BEFORE
manual save/any visual setup, objective visibility passes in both cases with
panel scrollTop0. Desktop heading top120 is below sticky-toolbar bottom112;
phone heading top406.5625 is below toolbar bottom398.5625. Full heading bounds
are inside panel/viewport. Only afterward does the final dark capture center the
objective via native DOM scrolling. No game state grant or old-save pose migration.

13native viewport JPEGs plus2actual walking videos retained (689,700media bytes).
Second-frame capture totals0.1473–0.8259s under the unchanged absolute3s. Desktop
video70,546bytes/763x540/30frames/4.677269s encoded; phone165,999bytes/374x286/
64frames/5.225274s. Both real held actions were5s; desktop sparsity is not padded
or sold as hardware smoothness. Derived four-frame sheets19,655/19,112bytes are
review aids. Actual frame/video judgment remains parent's gate, not parser inference.

Artifacts: `corrective-cycle/native-5/native-results.json`, empty `stderr.txt`,
`postflight.json`, thirteen named JPEGs, two `*-walking.webm` and two derived
`*-walking-frames.jpg`. Native-4's CLEAN old-script result and every earlier
failure/functional receipt remain untouched. Last case checkpoint137.254s;
the600s total bound was not exhausted. Browser-free runner regression passes
afterward; current5Node/canonical80/old-save fixtures remain in dated Phase-A and
are separate from positive native play. No full-fleet or second attempt ran.

Immediately on stop, browser/server flags, zero Chromium roots and no default
temporary Chromium profiles were verified, and explicit slot RELEASE was sent
before this long receipt. No more browser/capture is queued. End-of-batch free
disk2,603,630,592bytes; later before derived sheets2,603,470,848bytes. Aggregate
before postflight4,596,573bytes, still below5MB with all old evidence preserved.
Only QA receipt/artifacts enter the commit; parent inventory excluded. No runtime,
asset, roster/RNG, install, foreign kill or push change. Original full M2 stability,
broad campaign/acquisition/evolution, rights, device/performance, subjective final
visual approval and release/full-fleet gates remain separate holds.
