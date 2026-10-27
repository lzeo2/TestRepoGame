# Foldwild upgrade: lane 6 independent QA

## Current verdict: native batch FAILED; visuals rejected

Two separately authorized frozen-GO batches ran and exited1. Both browsers and
servers stopped. No third launch, hidden retry, runtime edit or Git write by QA.
First evidence remains untouched; corrected batch evidence is in `native-batch-2/`.
Parent rejected the first build's oversized Rest Camp sign. Its subsequent source
correction has NO accepted native capture: corrected batch failed during loading.
Partial passes do not establish complete usability or visual acceptance.

## Phase A: harness ready

Owned paths: `scripts/test_foldwild_upgrade.py`, this receipt, and native evidence
under `foldwild-upgrade-evidence/`. `ui-mockup.svg` is not QA-owned.
No runtime, maintenance manual, inventory, catalog, model or vendor edits.
No staging/commit attempt: the shared index lock remains an orchestrator escalation.

Read repository AGENTS, CODE_QUALITY, maintenance README, Foldwild manual and
Foldwild inventory record. Current entry/tree differ from the inventory while
other lanes integrate; historical native passes are not acceptance of this source.
Recorded inventory tree is `c935f92b7c41a90697fec764e084adf46f0e86ad`;
HEAD tree inspected at Phase A was `58ab32906792f914fa5655396136bf6738100b9a`.

### Executed commands and results

`python3 -B scripts/test_foldwild_upgrade.py` exits 0 and prints:

```text
HARNESS READY: 5 Node suites; v1/v2 fixtures separate from native play. Await GO.
```

This runs these exact independent existing checks, all exit 0:

| Command | Observed result |
| --- | --- |
| `node scripts/test_foldwild_data.mjs` | 80 exact species; all 80 canonical tracked/local SHA matches; 7,300,844 base-model bytes; separate optional descriptor/hash |
| `node scripts/test_foldwild_save_v2.mjs` | v1 migration, neutral builds, legacy Iven badge; v2 schema, economics, profiles, backup/quota/256 KiB boundaries |
| `node scripts/test_foldwild_continuity.mjs` | v1/v2 compatibility; exact effects/profile/active index/action/RNG replay; missed capture; strict identity/accessor rejection |
| `node scripts/test_foldwild_save_conflict.mjs` | exact-primary conflict refusal, preservation, legacy/pending replay, corrupt/version/denied/quota fixtures |
| `node scripts/test_foldwild_optional.mjs` | default-off migration/gates; 500 exact base-world RNG snapshots; controller-stub/pending replay; canonical80/bonus separation |

The optional/controller-stub and synthetic old-save fixtures above are NOT
native-positive play evidence. Full command output and per-file SHA-256 values,
including `navigation.js`, all canonical models, optional model, vendors and
materialized local fonts, are in [phase-a.json](foldwild-upgrade-evidence/phase-a.json).
Python AST parse passes without a browser or bytecode creation.
Scoped `git diff --check` passes. `python3 -B scripts/check_maintenance_docs.py`
exits 1 with the unchanged guard:
`AssertionError: Commit inspected source changes before validating its inventory.`
No manual/inventory workaround was applied.

### Browser batch contract

Executed once after explicit frozen-source GO:

```sh
timeout --signal=TERM --kill-after=10s 600s python3 -B scripts/test_foldwild_upgrade.py --go
```

The harness checks the shared Chromium slot and exact 2,147,483,648-byte disk
floor, pins `/usr/bin/chromium`, starts one ephemeral local server and closes
browser/server in `finally`. No install or browser download. It records all page,
console-error, request-failure, HTTP-error and external-request events without
exclusions; native acceptance requires empty error/failure lists and unchanged
before/after runtime and asset hashes. Evidence has a 5,000,000-byte total cap,
excluding the UI lane's existing mockup. It is a single serial bounded batch.

Baseline737a559f is served without a copied worktree: `git show` supplies only
changed top-level text-runtime responses; models/vendors/fonts are served from
current unchanged files. Integrated runtime text is pinned in memory at batch
start; final hashes must still match, including the new navigation module.

Prepared coverage: baseline desktop1280x800 and phone390x844 world/scenery/UI;
fresh integrated desktop and single-touch phone, both OS schemes (dark cases
compact world/layout captures); measured canvas geometry with explicit150px
minimum, overflow and44px-target assertions retained. Positive play uses starter
and seed input, actual keyboard/held touch movement, visible Northern Clearing
objective and Walk button, arrival at22,-26, Maren trial preview and Back without
crediting a win, existing wild interaction, a real ability, manual save/reload,
exact pending next-action replay, Flee/Continue and pause/resume. Nearby markers
are explicitly disclosed before clicking their data-point buttons.

Desktop walking records five seconds of the actual canvas using native
`captureStream`/`MediaRecorder`, bounded below1MB. Read-only `playerMotion`
samples are collected approximately every137ms during the same desktop video
and phone held-touch movement. Native assertions require changing arm/knee
angles, a lifted swing foot, at least one grounded foot per sample, no sole
penetration, zero root bob and counter-rotated level boots. Recorded root X/Z
must also agree with the controller position. This is sampled proof, not
whole-frame or hardware-foot-sliding certification.

Reduced motion is enabled through the real checkbox, followed by actual held
movement. Read-only samples must show movement continuing while gait phase,
weight and all joint angles remain frozen. Manual-save JSON must contain the
preference; ordinary reload/Continue must restore the checked preference. The
checkbox is then disabled through input and the saved false value is checked.
No state grant or animation setter is used for positive evidence.

Arrival readiness now requires distance≤1.8m, the Northern Clearing arrival
cue and an enabled button whose exact label is `Preview trial`, simultaneously.
Northern Clearing arrival, Maren preview, wild battle, owned-creature inspection
and world captures are prepared. West bridge capture is not yet included in the
bounded batch.

Additional browser-free check: `node scripts/test_foldwild_animation.mjs` exits0:
`PASS: actual THREE articulated walk, 149 planted-foot samples, grounded soles,
speed cadence, smooth stop/turn, frozen dt, reduced motion, immutable
diagnostics/controller input, battle anticipation/impact/recovery`.
Python AST and synthetic assertion-helper checks also pass: moving/reduced
samples accepted, root bob and changing reduced-motion joint rejected. These
are source/assertion checks, NOT observed native movement or browser acceptance.

Phone inspector reproduction is exactly one Close tap after390→320x844 resize,
with no retries or raised timeouts. Failure is recorded separately with snapshot,
dialog/canvas/focus/hitbox diagnostics and a failure capture, never translated
into a pass. Neither executed batch reached phone inspector Close; its historical
hold remains untested, not passed. See executed coverage below.

No browser launched in Phase A. Phase B below is the one later authorized run.
Existing M2, natural campaign/high-trial, physical-device and rights holds remain. No new games, push or full-fleet gate.
Initial free disk:2,820,186,112 bytes; after harness/checks:2,635,431,936 bytes
(shared workspace activity means the difference is not attributed solely to QA).
The Phase-A handoff via `paseo agent send --no-wait` timed out after15seconds;
no send retry or browser launch followed until explicit GO.

## Phase B: first frozen batch, exit1, partial native evidence

Exact command:

```sh
timeout --signal=TERM --kill-after=10s 600s python3 -B scripts/test_foldwild_upgrade.py --go
```

Preflight pgrep slot was empty; disk2,634,838,016 bytes. System Chromium only.
[Original results](foldwild-upgrade-evidence/native-results.json) record
`passed:false`, `server_stopped:true`, `errors:[]`, identical before/after source
hashes and unchanged assets (independently rehashed after shutdown). No errors
were filtered. Browser-free canonical80 and old-save fixtures remain separate.

Completed before failure:

- Baseline737a559f desktop1280x800 and phone390x844 world captures.
- Integrated desktop1280x800 light: canvas912x700 at(12,52), no horizontal
  overflow, no visible target below44px. Objective visibly named Northern Clearing;
  detail `north · 49 m by trail · Maren · Trial 1/5`; Walk button enabled.
- Actual five-second held-key action and actual canvas recording, with25 read-only
  motion samples: rootY always0; at least one foot grounded in every sample;
  left-arm range0.8800rad, left-knee range1.226897rad; swing lift/level boots pass.
  Controller moved from(0,16) to(0,13), not a state grant. Software rendering is
  slow; do not infer normal gameplay speed or smooth hardware performance.
- Actual reduced-motion checkbox, held movement with4 samples (phase/arm/knee
  ranges0), manual save, reload/Continue and checked preference restoration pass;
  preference disabled and saved false through UI afterward. Pause/resume passes.
- Walk button reaches Northern Clearing within1.8m with arrival cue and enabled
  exact `Preview trial`; native Maren preview and Back pass. No trial credited.

Failure boundary, exactly as recorded:

```text
native movement failed to 0,-26: {'x': 0.46468245678492076, 'z': -25.80870200202204, 'yaw': 1.5707963267948966}
```

This is the helper's25-second top-of-loop deadline boundary: final diagnostic
position is0.502518m from target, already inside its unchanged0.65m tolerance.
It does NOT demonstrate a game navigation failure. Original report/captures are
preserved, not relabeled green. Parent authorized one final same-tolerance
position check before throwing, without timeout inflation. Corrected gameplay
chooses the genuinely offered nearby `wild-1` marker at the clearing through the
collapsed native disclosure, rather than an unnecessary keyboard march to
`wild-0`. Parent's deterministic battle prediction is not native battle evidence;
no ability/battle failure occurred because first run stopped before battle.

### First-batch captures, preserved

All paths below are under `docs/foldwild-upgrade-evidence/`:

| File | Bytes |
| --- | ---: |
| `baseline-1280-light-world-scenery-ui.jpg` | 46367 |
| `baseline-390-light-world-scenery-ui.jpg` | 30802 |
| `integrated-1280-light-world-scenery-ui.jpg` | 48653 |
| `integrated-1280-light-arrival.jpg` | 43324 |
| `integrated-1280-light-maren-preview.jpg` | 34464 |
| `integrated-1280-light-failure.jpg` | 42769 |
| `native-walking.webm` | 26242 |
| `native-walking-frames.jpg` | 26900 |

Video verification command:
`ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,avg_frame_rate -of json docs/foldwild-upgrade-evidence/native-walking.webm`
reports VP8,763x540,4.733018seconds,26242bytes. Additional `ffprobe -count_frames`
reports13 actual encoded frames; this is sparse software-rendered evidence, NOT
smooth-animation acceptance. The input was held5seconds; encoded duration is
reported honestly rather than padded. Contact-sheet extraction used:

```sh
ffmpeg -v error -i docs/foldwild-upgrade-evidence/native-walking.webm -vf 'fps=1,scale=300:-1,tile=5x1' -frames:v 1 docs/foldwild-upgrade-evidence/native-walking-frames.jpg
```

Parent personally opened baseline/integrated screenshots and a video frame:
**subjective visual FAIL**. The5.8x1.45 Rest Camp sign near(-0.2,19.5) obstructed
player/legs and the central scene. Live rig diagnostics do not override that
visible failure. Parent serialized a presentation-only sign-size/placement
correction before the next GO; QA made no runtime edit.

## Corrected frozen batch: second and final attempt, exit1 before play

The exact same bounded command above ran once after the separate corrected GO.
The harness automatically selected `native-batch-2/`, preserving every original
file, and retained the5,000,000-byte aggregate evidence limit. No Close retries,
raised timeouts, state fixtures, battle grants or assertion bypasses were added.

Preflight slot empty; disk2,631,491,584 bytes. Primary failure in
[native-batch-2/native-results.json](foldwild-upgrade-evidence/native-batch-2/native-results.json):

```text
case: baseline-1280-light
Page.goto: Timeout 10000ms exceeded.
navigating to local /Games/Foldwild/index.html, waiting until "load"
```

The attempted failure capture also failed:

```text
Page.screenshot: Timeout 10000ms exceeded.
taking page screenshot; waiting for fonts to load; fonts loaded
```

The secondary screenshot exception masks the primary in the terminal traceback;
the original navigation error is retained in JSON. There are zero completed
cases and zero captures/video in this corrected batch. `errors:[]` means no error
events were collected before timeout, NOT a successful load. Source hashes match
before/after; all recorded asset hashes independently match after shutdown.
`server_stopped:true`; postflight pgrep found no held browser slot. Reported
end-of-batch disk2,631,299,072 bytes. No retry or timeout inflation followed.

### Final outcome by requested case

| Coverage | First batch | Corrected batch |
| --- | --- | --- |
| Baseline desktop1280 light | Captured | Navigation timeout |
| Baseline390 light | Captured | Not reached |
| Integrated1280 light native walk/arrival/preview/preferences | Partial passes above, then helper deadline FAIL | Not reached |
| Integrated390 light actual-touch gameplay | Not reached | Not reached |
|390→320 single-touch inspector Close | Not reached, historical hold remains | Not reached |
| Integrated1280/390 dark compact views | Not reached | Not reached |
| Native wild ability/manual pending save/reload/exact Wait/Flee | Not reached | Not reached |
| Desktop reduced-motion checkbox/held movement/preference save+reload | Partial positive only on old oversized-sign source | Not reached |
| Phone reduced-motion movement/preference save+reload | Not reached | Not reached |
| Corrected-sign visible gait/scenery/character acceptance | Not captured | Not reached |
| West bridge native capture | Not run | Not run |

Two failed attempts exhaust this worker's native-run allowance. No further
browser run is scheduled or implied. Hermes advice ticket
`pi-15078-1792878686888-c26245d5.json` remains pending after a10-second advice timeout;
it asks for bounded host/navigation diagnostics, not permission to retry.
Existing M2/single-Close, natural campaign/high-trial victory, capture/evolution,
rights and physical-device holds remain. New GUI acceptance is explicitly HELD.
No new games, registration, full-fleet gate, push, Git staging/commit, runtime,
manual or inventory changes by this lane.

Final postflight: Python AST and both owned-text whitespace checks pass;
both failed receipts still have frozen source hashes, independently matching
assets and stopped servers. Six first-batch screenshots, one derived contact
sheet and one video remain; corrected batch has none. Aggregate native/Phase-A
evidence is396,105bytes excluding the UI mockup, below5MB. Latest observed disk
is2,630,270,976bytes (initial lane observation2,820,186,112; shared-host delta
189,915,136bytes, not attributed solely to these396KB of evidence). All lane-owned
paths remain untracked for orchestrator integration because no Git writes were
authorized. Other dirty runtime/dispatch paths belong to the integrating lanes.

## Final independent handoff

Parent acknowledged both failures and the stop. **No third browser launch.**
Positive native navigation, Maren preview, movement diagnostics and desktop
reduced-motion preference/save observations belong ONLY to the first frozen
runtime with the rejected oversized sign. Corrected runtime has no accepted
native loading, visual, navigation, battle, pending-save continuity, actual-touch,
inspector-Close or reduced-motion evidence. In particular preference JSON saving
is not proof of a native pending-battle save/reload/next-action loop. Whole native
battle/save/touch/reduced-motion acceptance remains incomplete.

Parent reports final19Node/syntax/shell source checks passed at21:52. That is
parent-supplied source-gate evidence, not an independent rerun here or a browser
pass. This lane's independently executed5Node suites and animation check remain
listed separately above.

Final read-only asset verification: all88recorded local asset SHA-256 values
still match the second batch manifest. Canonical80 supplied GLBs remain
7,300,844bytes; full per-file SHA values are preserved in both native manifests
and `phase-a.json`. For compact reconciliation, SHA-256 of canonical-model
`{relativePath:sha256}` JSON sorted by keys with separators `(',',':')` is
`510e3684903a092a58d99badd1c1ae0bb4860c1f584901e16957dd22774e600b`.
Separate optional model SHA-256 remains
`bc77d7c17a4638f37acb5547a490f50f07fda818f6261e6767e674823d64562c`.
No supplied model, vendor or font change by this lane; no protected-game edit.
Both server-finally receipts say stopped, and final pgrep returns no occupied
Chromium slot. Latest observed free storage2,629,771,264bytes, still above the
2,147,483,648-byte floor. No runtime/Git writes, downloads or package installs.
Hermes ticket `pi-15078-1792878686888-c26245d5.json` is unresolved at handoff.

Commit handoff: operator cleared the lock and authorized this lane as the sole
serial Git writer for its QA paths only. Parent restored the original narrow
sparse selection after the88-asset proof; shared fonts are sparse-excluded again,
not changed or deleted from Git. This later QA-only commit does not change any
failed result, acceptance hold or historical no-Git-write observation above.
