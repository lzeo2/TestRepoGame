# Foldwild input audit: acceptance remains held

Delegation 74 is the finish-only, second and last attempt of delegation 69.
Actual environment: `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`.
This checkpoint owns only this report and
`scripts/test_foldwild_input_audit.py`. No new browser execution, runtime patch,
sparse-selection change, asset ingestion, registration or push occurred here.
Delegation 69's supervisor/process exit is **unknown**: its short worker log
contains no final digest. Individual test exit records below are separate facts,
not an inferred supervisor exit or a successful completed delegation.

## Source identity and coverage

Kickoff was `8c8a055813b35bbd5d8b632423328333b4252d43`; finish inspection HEAD
was `6d2ae5df59bd6f0fb2b050324b0e0a4716ce32e5`. Other workers advanced HEAD,
but both revisions have the identical Foldwild tree
`e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`. The inventory agrees for Foldwild:
94 blobs, 8,937,020 logical bytes, entry blob
`b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`. Foldwild remains one of five
unregistered projects; the portal still contains 115 registered games.

Complete read-only inspection here covered Git-backed `index.html`, `style.css`,
`script.js`, `view.js` and `world.js`, including the controller's inspection,
close, focus, input and snapshot paths and the renderer's async/cache/pointer
callbacks. Five authored files were extracted outside the repository, totaling
128,328 bytes. The diagnostic Python script and both temporary full-test variants
were read completely, along with their logs/results and the unchanged M2 script.
Shared `snapshot`, `source_hashes` and `ready` helper implementations were checked.
This is an input-boundary audit, not a new full battle/economy/data-engine review.
Vendor Three.js/GLTFLoader internals and binary models were not fully human-reviewed
in this task. No complete browser engine or model download/diff was performed.

Start future work with the [game manual](../games/unregistered-foldwild.md),
[M2 finish hold](../../foldwild-m2-finish.md) and
[maintenance scope](../SCOPE.md). The previous finish report preserves older
failed runs and ticket `pi-1253312-1790905405820`; those failures are not erased.
Git-backed historical `docs/audit_batches`, `docs/catalog_parts`, `docs/GAMES` and
`docs/wiki` search found no Foldwild mention. This does not revise historical
catalog counts or prove that other games' old reports are current.

## Recovered delegation 69 evidence

Artifact names below are temporary basenames, not permanent evidence links.
Read the matching script/log/status together; a mutable `result.json` alone is
not a fresh gate. No process exit was reconstructed from a filename or screenshot.

| Record | Actual recovered result | Interpretation |
| --- | --- | --- |
| `foldwild69-input.log` and `.status` | Chromium `149.0.7827.196`; eight `CASE` objects, cases 1 through 8, all `passed:true`; `SUMMARY` has 8 cases/8 passes, all four error/request arrays empty, `source_unchanged:true`; status text `0` | Standalone mobile diagnostic succeeded, not unchanged full M2 acceptance. |
| `foldwild69-original.log` and `.status` | Four desktop stages; mobile close then `ready(page,'world')` timeout 30000ms; `passed:false`; all error/request arrays empty; unchanged source; status text `1` | Unmodified foreground M2 failed again. No late-loader or negative-fixture stage reached. |
| `foldwild69-full.py`, `.log`, `.status`, and its result JSON | Added one-second observation after close and conditional post-failure observation/listeners; `AFTER1S` already shows world restoration; seven stages/three fixtures; `passed:true`; unchanged source; status text `0` | Instrumented/delayed variant completed, but it is not the uninstrumented test and cannot close the hold. |
| `foldwild69-after-timeout.py`, `.log`, and its result JSON | Original `ready` first; observation only in its exception handler. Four stages, zero negative fixtures; `passed:false`; unchanged source; timeout traceback | Failure reproduced without pre-failure page observation. No separate status file was found; process exit is unknown, not assigned a numeric value. |

The `foldwild-m2-core/result.json` recovered here agrees with the failed original
run's four-stage report. The successful temporary variant has its own output
directory. Do not substitute its JSON for the failing original report.

The standalone script creates **eight**, not 32, fresh mobile contexts in one
browser. No 32-context result is evidenced. It omits the desktop merchant,
battle-continuation, capture and release workload preceding mobile in full M2.
Its successful cases all show, after one second: dialog closed, inspector hidden,
canvas returned to `viewport`, view mode `world`, camera yaw 0, no fallback models,
three world models loaded, viewport 320x700 and DPR 1. Close-button zero bounds
in those observations are expected after closure, not a failed hit-test.

The post-original-timeout observation is the useful negative record:

- Underlying controller `phase:"world"`, `battle:null`, `paused:false`,
  `busy:false`, but presentation `view.mode:"inspection"`.
- `dialogOpen:true`, `inspectorHidden:false`, canvas still in
  `ledger-model-host`, active element `ledger-preview-close`.
- Inspection has 946 rendered frames, one loaded Cindupp model, two draw calls,
  414 triangles and no fallback. This is not simply zero rendering frames or
  a still-loading inspection model.
- Close bounds x163.140625/y80, width123.859375/height44; the current center
  hit-test resolves to `collection-close`.
- Canvas bounds x34/y229.96875, width252/height260; dialog scrollTop177;
  document scroll x/y0; inner viewport 320x700, DPR1; visual viewport scale1,
  offsets0, page offsets0.

This is state **after** the failed original wait, not an event trace of the tap.
It confirms the dialog never completed closure by observation time. It does not
prove which element received pointerdown/up/click during the tap. The successful
instrumented full variant never entered its failure branch, so it supplies no
`POST_FAILURE_EVENTS` evidence. Listeners installed only after failure cannot
retroactively identify the original input target or callback order.

Five screenshot basenames appear in the recovered full-run reports:
`desktop-inspection.jpg` (39,579 bytes), `battle-resumed.jpg` (60,453),
`release-confirm.jpg` (39,261), `mobile-inspection.jpg` (21,691) and
`mobile-inspection-320.jpg` (20,245). These files exist in separate temporary
full-run output directories. No new screenshots or subjective UI approval were
produced here; Main owns image review. The standalone script's 390/320 screenshots
use a `TemporaryDirectory` and are normally discarded on exit.

## Input and restoration implementation map

`index.html` bootstraps local `style.css` and module `script.js`.
`collection-close` is an ordinary `type="button"` inside the sticky ledger heading.
It is not a form submit button and has no separate pointer/touch listener in the
controller. The relevant chain in `Games/Foldwild/script.js` is:

1. `collection()` renders the ledger, clears held input/route and opens native
   `collection-dialog` with `showModal()` when needed.
2. `inspectCreature()` increments `inspectionToken`, shows the inspector,
   reparents the one `game-canvas` into `ledger-model-host`, resizes and awaits
   `view.showInspection()`. After its token/open guards it updates the status.
   For a source button it scrolls the inspector and focuses `ledger-preview-close`
   with `preventScroll:true`.
3. `collection-close` click at line 846 calls `collection-dialog.close()` directly,
   with no phase/busy guard on that button callback.
4. The dialog `close` listener at lines 847-850 closes any release dialog, calls
   `closeInspection()`, clears controller input, resizes, updates HUD and focuses
   the canvas.
5. `closeInspection()` at lines 665-686 invalidates the token, hides the inspector,
   prepends the canvas back to its original viewport and restores world or result
   battle presentation. `showWorld()` clears route/pending point and invokes
   `view.showWorld()`. It is not blocked by `playable()` or `busy` at this boundary.

All other direct callers were traced: `returnToMenu()` uses
`closeInspection(false)`; `ledger-preview-close` restores presentation while the
ledger remains open; confirmed release closes inspection only for its selected
UID. Ledger accessory edits can call `inspectCreature()` again through
`ledgerAction()`. Native Escape closes the dialog through its normal `close`
event; it is not the controller's pause shortcut while a modal is open.

In `view.js`, `showInspection()`/`showWorld()` enter `reset(nextMode)`, which
increments renderer `generation`, releases slots and clears the view's pointer
map. `creature()` awaits the cached GLB promise, then checks disposed/generation/
closed-slot flags **before** attaching a clone. `showInspection()` checks generation
again before applying bounds/camera. Controller `inspectionToken` independently
prevents stale status/focus updates. The observed failure's still-open dialog is
not evidence that a late callback reopened a closed dialog: these callbacks do
not call `showModal()`. The successful temporary delayed-loader case is useful
historical corroboration, not fresh full-gate acceptance.

`pointerDown()` captures trusted canvas pointers in world/inspection;
`pointerMove()` marks >8px movement and orbits inspection;
`pointerUp()` removes pointer state before refusing inspection-world checkpoint
selection; cancel/lost-capture also remove state. Those handlers are attached only
to the canvas, not the close button. `dispose()` removes every listener in that
listener map. There is no source evidence here that capture survives touchEnd or
that an absent button click is fixed by changing those functions. Determine input
routing before a capture patch.

`style.css` scopes the demonstrated heading correction to
`#collection-dialog .dialog-heading h2{flex-basis:100px}`; heading remains sticky
with `z-index:1`, dialog scrolls with max-height80dvh, inspector scroll margin72px,
buttons have minimum44px dimensions. Canvas alone has `touch-action:none`.
Generic buttons have no explicit touch-action policy. A browser gesture/timing
explanation is a hypothesis, not proof or permission to add a CSS workaround.
The existing one-row geometry correction did not resolve the failed native gate.

`foldwildSnapshot` is a non-configurable **getter**, not a callable function or
mutable diagnostic API. It returns a deep-frozen structured clone. Read
`window.foldwildSnapshot.view.mode`, not just `phase`: world simulation phase can
remain world while a modal inspection is active. No setters/state grants/debug
mutators should be added for positive input proof.

## Findings and smallest next action

### HIGH FW-IN-01: unresolved single native close

- **Anchor:** `Games/Foldwild/script.js`, `collection-close` click/dialog close/
  `closeInspection`; `scripts/test_foldwild_m2.py`, mobile single-tap sequence.
- **Impact:** after 390-to-320 resize and a one-finger model drag, full native
  regression can leave the ledger open and its canvas in inspection, blocking
  world restoration. Four successful desktop stages do not make this path usable.
- **Evidence:** original exit1 and post-original-failure state above; zero reported
  console/page/request errors. A current hit-test after timeout cannot certify
  the tap's earlier target. Root classification remains **unknown**, not confirmed
  application callback fault or browser/harness defect.
- **Minimal root fix:** none is established or authorized here. Main must isolate
  whether click reaches the button, native close dispatch occurs, or restoration
  stops. Patch the first demonstrated shared failing boundary, not every caller.
  Do not add repeated taps, mouse substitution, a longer readiness timeout or a
  synthetic `close()` and claim acceptance.

### MEDIUM FW-IN-02: diagnostic success is narrower than acceptance

- **Anchor:** `scripts/test_foldwild_input_audit.py`, eight-context loop,
  one-second `OBSERVE`, imported `source_hashes` and final assertions.
- **Impact:** treating its 8/8 summary as full M2 or 32-context proof would conceal
  the reproduced integrated failure. This is an evidence-scope limitation, not
  eight observed gameplay failures.
- **Minimal correction:** retain the diagnostic label and run unchanged full M2
  separately through Main. `source_hashes()` hashes top-level JS/HTML/CSS only;
  `source_unchanged:true` does not rehash vendor modules or the 80 GLBs. Git tree
  identity here preserves tracked models across the inspected revisions, but no
  separate fresh model-byte acceptance test was run.

The independent context-loss finding and campaign/provenance holds remain in the
game manual; they are not claimed as newly diagnosed causes of this close failure.
No secret, protected-content edit, vendor-notice change or proxy enabling occurred.
Original 80 model blobs remain in the unchanged tracked tree; no ingestion or
original-model edit is authorized by this report. Existing scoped original-delivery
provenance qualifications remain applicable, not a new blanket license claim.

## Runnable diagnostic and recommended acceptance

The finished script retains its real sequence/assertions: fresh 390x700 mobile
context, seed1/Cindupp, native Start/ledger taps, existing preview helper, CDP
single-finger drag, unchanged world position/heading, layout and screenshots,
320 resize with renderer-width readiness, 44px layout/heading/name/center-hit
assertions and **one** close tap. It observes after one second and only installs
read-only page event listeners after recording a failed close; no extra input is
sent. It rejects browser/network errors, source changes and any unsuccessful case.
Server binds loopback port8811, shuts down in `finally`, contexts/browser close,
and the >=2GB disk guard runs before browser output. Use existing Chromium and
Playwright only; Main must hold the narrow checkout lease. Do not rerun inside
this finish-only delegation.

Recommended future observation, not executed in delegation 74:

```sh
PYTHONDONTWRITEBYTECODE=1 timeout --signal=TERM --kill-after=10s 600s xvfb-run -a python3 -B scripts/test_foldwild_input_audit.py
```

Recommended unchanged acceptance, separately scheduled by Main:

```sh
PYTHONDONTWRITEBYTECODE=1 timeout --signal=TERM --kill-after=10s 420s xvfb-run -a python3 -B scripts/test_foldwild_m2.py
```

Capture the foreground process exit/log before cleanup. Retain the exact mobile
390-to-320 case, original finger drag, name visibility, width-readiness, 44px
checks, screenshot and single native close. A stable fresh unchanged full M2 pass
is required before clearing input acceptance; diagnostic/trace success does not
substitute. Main may separately authorize further root investigation. Any future
experimental CSS/observation variant must be labeled and cannot overwrite the
acceptance result. Full registered-catalog smoke is a different Main-owned serial
gate and cannot certify this unregistered game's gameplay.

## Checks actually run in delegation 74

- Python AST parse and compile of the diagnostic: passed without importing it or
  running its browser entrypoint. Both embedded observation JavaScript expressions
  passed `node --check` via stdin. Output:
  `PASS: audit Python AST/compile and both observation JavaScript snippets parse`.
- Git-backed `script.js`, `view.js` and `world.js` passed ESM syntax checks via
  stdin with `node --input-type=module --check`. Output:
  `PASS: three Git-backed Foldwild ESM sources parse via stdin`.
- Report section/relative-link/Git-source assertions passed. Owned-path diff
  whitespace check exited0; the staged new-file whitespace check also passed.
- Recovered log assertions verified eight unique sequential case IDs, all passes,
  exact empty error arrays, unchanged-source summary and status0. Output:
  `PASS: recovered standalone log has 8/8 successful cases and recorded exit 0; diagnostic only`.
- Three recovered JSON reports parsed: instrumented full7 stages/3 fixtures/true;
  after-timeout4/0/false; original4/0/false. These are inherited executions, not
  three new browser passes.
- `python3 -B scripts/check_maintenance_docs.py` ran and failed with
  `AssertionError: Inventory stale: inspect changes, then run --refresh.`
  Foldwild's recorded identity matches; shared inventory refresh belongs to Main,
  not this worker. No refresh or unrelated documentation edit was made.
- `ps` found prior worker PID1268918 absent; loopback8811 had no listener according
  to `ss -ltnp 'sport = :8811'`. No owned orphan cleanup was necessary, and no other
  workers' processes were stopped.
- Initial disk free remained displayed as2.4GiB. Workspace additions are only the
  small report/script; source scratch extraction is128,328 logical bytes. Shared
  filesystem deltas cannot be attributed exclusively to this concurrent worker.

**Gate accounting:** zero new native executions, zero fresh native acceptance
passes, zero full-catalog smoke passes in delegation 74. Recovered diagnostic
success is recorded but input root and unchanged M2 acceptance remain held.
Campaign/finale, natural all-species acquisition/evolution/accessory fit, class
ranks, optional hidden creature, actual N100 hardware, rights/publication and any
registration/push decision remain separate holds. No games were added.
