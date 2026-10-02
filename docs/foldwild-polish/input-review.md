# Foldwild input review: native Close still held

Delegation 75, diagnostic only. Actual worker: `openai-codex / gpt-6-astra`
(environment `PI_PROVIDER` and `PI_MODEL` verified). No runtime, test, catalog,
vendor, model or sparse-selection edits. No installs, new games or push.
Main retains design, integration and subjective screenshot assessment.

## Source identity and review coverage

Start HEAD: `559f825f2a506a6e777abdcdc170045f29f1b72b`.
Foldwild tree: `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`.
Entry blob: `b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`.
Inventory matches: 94 files, 8,937,020 logical bytes, unregistered.
After execution, every materialized Foldwild file matched its HEAD blob,
including all original model files. This is byte identity, not model-quality
or provenance acceptance. Original colors and 80 GLBs were not changed.

Completely read: `AGENTS.md`, `docs/CODE_QUALITY.md`, maintenance README,
[Foldwild manual](../maintenance/games/unregistered-foldwild.md),
[prior input audit](../maintenance/audits/foldwild-input.md),
[M2 finish](../foldwild-m2-finish.md), [M2 review](../foldwild-m2-review.md);
`Games/Foldwild/{script.js,view.js,style.css,index.html}`;
`scripts/test_foldwild_{m2,input_audit,core_v2,milestone}.py`.
The temporary observation wrapper was also reviewed completely.
Callers of inspection, closure and world restoration were traced with Git grep.
Unread in this task: other authored simulation/data modules, vendor internals,
binary-model contents, historical temporary trace implementations and their raw
logs. Historical outcomes are attributed to the reports, not rerun or upgraded.

Recorded SHA-256 identities, unchanged after both executions:

| File | SHA-256 |
| --- | --- |
| `scripts/test_foldwild_m2.py` | `4187de5f03366332af2eddd9bed3a61ac33c9532115ac0b2fb09435bc85c12ea` |
| `scripts/test_foldwild_input_audit.py` | `27ff760be90a4215081e8ea3254a1f35bbd770268282669533029c4bce583719` |
| `scripts/test_foldwild_core_v2.py` | `9e428f1a66361a3b149c4d707a050786b261b8db79f33e14c5d27d1075fdccd4` |
| `scripts/test_foldwild_milestone.py` | `b93c56bf29d2fd6cbad272cf9d454aa98e6514beea47b2a428a5954f517639b9` |
| `Games/Foldwild/script.js` | `2628c385904de43d7b7b54a1b66bcadb6729e589d807530bd861be24a68d35e8` |
| `Games/Foldwild/view.js` | `441a3eaf82b431a1d8419f071060afeee25ee0d78261eaff779b7d308bdf41a2` |
| `Games/Foldwild/style.css` | `133462a4dda2e064e9f547d8cc125cb14699650abc05c73b9a7a5a23d2e36206` |
| `Games/Foldwild/index.html` | `c3106fb3ae65e9e596ec666971f6c6a2749f544a1bad22e0f550bdf0be789070` |

## Fresh unchanged baseline: exit 1

Exactly one unchanged suite invocation, imported as `test_foldwild_m2 as m`,
changing **only `m.OUTPUT`** before `m.run()`. Output relocation was to the new
scratch directory `foldwild-astra-input-baseline`; port remained 8803.
Foreground envelope: `PYTHONDONTWRITEBYTECODE=1`, `timeout --signal=TERM
--kill-after=10s 420s`, `xvfb-run -a python3 -B`. The shell immediately saved
its actual exit in `run.status`: **1**, not an outer timeout or lost wait status.
`run.log`, `result.json`, `identity.txt` and `old-evidence.sha256` are retained
in that directory. Chromium: `149.0.7827.196`.

Four desktop stages passed: merchant/accessory/inspection restoration;
exact pending-battle Continue; seeded capture and duplicate-settlement protection;
release guards/cancellation/seen-only preview. The mobile drag, unchanged world
position/yaw, renderer-width readiness, layout, heading/name/center-hit checks
and both mobile screenshots completed. The single Close tap returned, then
`scripts/test_foldwild_m2.py:275` failed inside `ready(page, 'world')`:
`Page.wait_for_function: Timeout 30000ms exceeded.`

`passed:false`, `source_unchanged:true`; console/page errors, failed requests,
HTTP errors and external requests were all empty. Zero negative fixtures and
no deferred-loader stage were reached. This result does not itself report the
post-tap dialog state. `ready` at `test_foldwild_milestone.py:28-37` requires
world view, loaded model(s), frames and budgets, not merely world controller phase.
The unchanged baseline remains authoritative and acceptance remains held.

## Separate timing-altered observation: exit 1

One temporary wrapper, `foldwild-astra-input-trace.py`, executed the same source
in memory with a dedicated output directory `foldwild-astra-input-trace` and
port 8812. It added passive capture listeners immediately before the mobile
single Close tap, recording pointer/touch/click/close targets, trusted flag,
coordinates, bounds, center hit and read-only presentation state. A `finally`
observation printed `INSTRUMENTED_CLOSE` after the unchanged readiness wait.
No handler was replaced; no event was canceled; no save/state was granted;
no extra tap, synthetic close or mouse replacement was introduced.
The existing preview helper's `.click()` remained unchanged in both executions;
the contested Close remained `.tap()` and orbit remained CDP finger input.

This instrumentation performs snapshot/layout reads and changes timing. It is
**diagnostic evidence, never an acceptance pass**. The wrapper used a 150-second
foreground bound, exited **1**, and retained its own `run.log`, `run.status` and
`result.json`. Again four desktop stages, zero negative fixtures, empty error
arrays and unchanged source. Neither output overwrote `foldwild-m2-core`.

New negative observation, in dispatch order:

| Event | Target | Trusted | Time, page milliseconds |
| --- | --- | --- | --- |
| pointerdown | collection-close | true | 6916.70 |
| touchstart | collection-close | true | 6917.80 |
| gotpointercapture | collection-close | true | 6927.30 |
| pointerup | collection-close | true | 6928.40 |
| lostpointercapture | collection-close | true | 6929.50 |
| touchend | collection-close | true | 6930.60 |

**No `click`, `close` or `pointercancel` was recorded through the timeout.**
Pointer down/up coordinates were approximately (225.07, 102), inside stable
Close bounds (163.140625, 80, 123.859375, 44). Every recorded center hit was
`collection-close`. All recorded capture-phase `defaultPrevented` values were
false; this does not establish their final post-dispatch values.

After timeout: dialog open, inspector visible, canvas in `ledger-model-host`,
active element `ledger-preview-close`, controller phase world but view inspection.
Inspection had 948 frames, one loaded Cindupp, two draw calls, 414 triangles,
no fallback, yaw -0.9015999755859383, buffer 252x260. World yaw remained zero.

## Boundary classification and minimal next step

**HIGH FW-IN-75: touch delivered, compatibility click absent in the failing trace.**
The first demonstrated failing boundary is between completed trusted touch/pointer
input on the intended Close button and the `click` that its application handler
consumes. This narrows the previous unknown routing/restoration classification:

- `index.html:64`: ordinary enabled button, not a form submit action.
- `script.js:846`: Close has only a click handler, directly calling native
  `collection-dialog.close()`, without busy/phase guards.
- `script.js:847-850`: native close event runs shared restoration.
- `script.js:665-686`: hides inspector, invalidates async token, reparents canvas,
  restores world/result, resizes and restores focus. Callers at 202, 849, 851,
  865 cover menu, dialog close, preview-back and selected release.
- `script.js:630-664`, callers 610/707/727: async preview, token/open checks,
  scroll and preview-back focus. No delayed preview callback reopens the dialog.
- `view.js:510-551`: pointer capture/orbit/release handlers attach to the canvas,
  not Close; release/cancel removes pointer bookkeeping. Captured events on Close
  in this failing trace contradict routing to stale canvas capture at that tap.
- `style.css:85-97,138-139`: scrollable dialog, sticky one-row heading, inspector
  scroll margin. Canvas has `touch-action:none` at line 36; button touch behavior
  is otherwise native. Geometry checks passed, not evidence for another reflow fix.

No restoration defect is demonstrated: the required click/close never appeared.
The underlying reason for missing compatibility click remains **unknown**.
Browser gesture suppression, previous orbit/resize interaction and harness input
sequencing are hypotheses, not established root causes. Capture logging is not
browser-internal gesture tracing and starts after the orbit, so it cannot establish
that preceding gesture's lifecycle or final cancellation flags.

**No minimal runtime repair is justified yet.** Do not add pointerup/touchend
closure, blanket capture release, repeated taps, delays or a longer timeout on
this evidence. A button-specific `touch-action:manipulation` experiment would
still be a hypothesis, not an approved repair or acceptance substitute.

The next discriminating signal, if Main authorizes further diagnosis, is one
continuous passive event record spanning orbit end, resize and the single Close:
final cancellation state, touch identifiers, click/detail, capture owner and target,
plus viewport coordinates. If down/up miss the button, fix routing/actionability;
if correctly delivered touch ends without click, isolate gesture/click synthesis
before changing controller restoration. If a trusted click reaches the button,
then observe dialog `open` becoming false and the native `close` event before
investigating `closeInspection`. A closed dialog with canvas still in the host
would be the first direct restoration-failure signal. None was observed here.
Any timing-altered success cannot clear the unchanged full-M2 hold.

## Artifacts, checks and remaining holds

Both scratch output directories contain the following images, relative to each
named directory; Main has not assessed this task's captures:

| Image | Bytes each |
| --- | ---: |
| `desktop-inspection.jpg` | 39,579 |
| `battle-resumed.jpg` | 60,453 |
| `release-confirm.jpg` | 39,261 |
| `mobile-inspection.jpg` | 21,691 |
| `mobile-inspection-320.jpg` | 20,245 |

Checks actually run:

- Post-run Git-blob comparison: exit 0,
  `PASS: all 94 materialized Foldwild files match HEAD blobs`.
- Recorded source/test/helper SHA comparison: exit 0, eight unchanged identities.
- SHA verification of all six old `foldwild-m2-core` outputs: exit 0, all `OK`.
- `python3 -B scripts/check_maintenance_docs.py`: exit 0,
  `PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.`
  Coverage only, not gameplay or semantic acceptance.
- Both runs reached browser and server `finally` cleanup. Ports 8803/8812 had
  no listener afterward; process inspection showed no remaining owned test
  browser/Xvfb/wrapper process. No other worker processes were stopped.

Disk displayed 2.4 GiB free before and after. Retained scratch totals:
197,403 bytes baseline, 198,982 trace, 2,802 wrapper, total **399,187 bytes**,
below 2 MB. The baseline/trace report filesystem deltas were 106,496/98,304 bytes;
these are shared-filesystem observations, not exclusive growth accounting.

Fresh unchanged M2 acceptance passes: **0 of 1**. Instrumented diagnostic:
**failed, 1 execution**. Full registered-catalog smoke passes: **0**, not run.
No fresh campaign, all-species acquisition/evolution/accessory-fit, actual N100
hardware, rights/publication, registration or release approval. Original M2
failures and older evidence remain preserved. Only this new report is committed;
no implementation is proposed as demonstrated, and no gate is cleared.
