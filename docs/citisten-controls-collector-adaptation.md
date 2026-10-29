# Citisten collector: Controls then Speed (2026-10-29)

## Scope and source change

The explicit follow-through authorized source-only collector adaptation and
verification against the current DOM fixture. It did not authorize another
unchanged failing GPU run or certify rendering. Existing seed/HUD/clock repairs
are preserved, not reimplemented. Main74 acknowledged those pins and its staged
game tree exactly matched38e18c45/1500eca1, so they were not resent.

Only `Games/Citisten3D/river-upgrade-qa.py` changes in the game tree. Its shared
`native_speed(press, observe, value)` keeps its signature. The existing INPUT read
now reports whether Speed is inside open/closed native Controls and whether its
summary has focus. With closed Controls, normal Tab reaches the summary and Enter
opens it. Normal Tab then reaches Speed; existing arrows, Tab commit/blur and
DOM/simulation/focus checks remain. If the helper opened Controls, bounded
Shift+Tab returns to the summary and Enter restores the closed state. Initially
open Controls remain open. There are no focus setters, forced clicks, DOM open
assignments, select-value setters, tick/state grants or new waits.

Old observations without the two fields retain the exact old keys and reads.
Forward and restoration traversals are bounded to32 each and fail if summary,
opening, focus, speed, blur or closure is wrong. Current closed-panel interactions
necessarily add key/read operations; they are not relabelled as the historical
13-RPC path. Existing midpoint timing observes them through its existing wrappers.
No claim is made about their native-scene timing/performance.

All four production consumers share the helper: river-upgrade runner, expansion
runner, read-only diagnostic and Water/Save collector through observed_speed.
No duplicate per-caller panel handling was added. No runtime MJS/HTML/CSS,
models/vendor/fonts, gameplay/save formats, renderer/security flags or native
runner frozen pins changed.

## Regression evidence

Worker65 committed only `scripts/citisten_controls_collector_check.py` at
`07e2a5e1922d20bc4ebf2ad3d6fcc253946894b6`. Its initial expected failure against the
old helper is retained in `.swarmforge-logs/worker-2026-10-29T03-51-04-115Z-177c4947.log`.
Same sol/high, no subworkers/browser/push. Parent implemented the helper and reran:

```sh
python3 -B scripts/citisten_controls_collector_check.py
python3 -B scripts/citisten_loop_integration_check.py
python3 -B scripts/citisten_midpoint_timing_check.py
python3 -B scripts/citisten_rpc_timing_check.py
python3 -B Games/Citisten3D/river-upgrade-qa.py --self-test
```

All five exit0. New pure fixtures cover repeated0/1/3/10, closed restoration,
already-open preservation, exact legacy keys AND observation stages, and bounded
rejection of refused opening/closure, missing summary, focus theft and blur speed
mutation. Existing checks retain exact legacy RPC/key/poll counts,300 actual-JS
INPUT/STATE wrapper cases and all original capture/fatal/continuity assertions.
AST comparison against38e18c45 finds **only native_speed changed** among original
functions/classes: observed_speed, apartment/Continue midpoints,500ms/5s waits,
timing, capture, cleanup, baseline and source-freeze functions remain identical.
Python syntax and diff checks pass.

Separate attempted `python3 -B scripts/citisten_water_save_qa.py --self-test`
**exits1 at its historical frozen GAME tree check**: expectedcf589170, saw1500eca1.
This old-case guard was NOT weakened/repointed to make it green. Failure remains
in `.tmp/citisten-collector-controls/cpu-attempt1.log`. This is a retained pin
rejection, not new native evidence or acceptance. Other raw CPU output and the
AST receipt remain in that directory.

## Current DOM fixture verification, not native game acceptance

One bounded pass reuses the previous current-entry renderer/world double with
system Chromium, sandbox enabled and WebGL explicitly forbidden. The user-requested
fixture verification needed no generic collector-code approval gate. No unchanged
native GPU configuration was launched. No screenshots were created.

Source at capture: commit07e2a5e plus the frozen working helper SHA256
`a0596f7166a6f425b58b44a9225384a9a177d7e42cb550b2ac56d896c15d2b50`.
Working diff SHA256 `da8c0bfa77f97924318d898506fcf981a9b9622c812215d3d39af442b40b6f08`
was unchanged throughout. Native runtime/UI bytes remain the already-reviewed
78faf916 repairs, not a new shader or scene revision.

Actual entry/UI/INPUT/helper: **24 calls,8 contexts** =1367×910 and390×844,
dark/light, initially closed/open; each context selects0,1,0 through real keyboard
events. All checks pass: selected/simulation speed agree, select blur/document
focus retained, originally closed panels open/close exactly once per call,
already-open panels remain open.522 observations were recorded; maximum complete
call1.9524s in this fixture, NOT a native timing guarantee. Zero page/console/request
errors and zero WebGL calls. No resumed-building/native rendering gate was run.

Raw result is losslessly archived in `citisten-controls-collector-dom.json.gz`;
uncompressed SHA256
`1c375515755cf020590b8e6850ea1eb51fd8dd9fa6d98b742f63df7f1f2d9bc8`.
Runner and log: `.tmp/citisten-collector-controls/dom1/`. Existing four HUD contact
sheets and all prior failures/freezes are unchanged. Peak owned files/profile
1,026,952bytes +1,000,000reserve <11,000,000. Elapsed42.200s including5.969s cleanup,
inside110s+25s. Independent closure recheck: ten owned PIDs gone, profile absent,
port45397 closed, lease explicitly released; no competing browser/lease at launch.
Sparse/config/font absence and frozen source/diff unchanged. Free bytes before/
immediately after:2,500,321,280 /2,499,383,296, above2,147,483,648; shared-host delta
is not wholly attributable to these files. No installs/settings changes/push.

## Committed source and inventory boundary

Collector implementation: `1f8f772a`; standalone regression: `07e2a5e1`.
Current game tree `8622d0e29bbaad4ecdf940c4eb0d9bda21239c29`,228files/
35,197,519bytes. Relative to the acknowledged38e snapshot, only the game-tree QA
Python file changes (+1,333bytes); all runtime/model/vendor/font bytes are identical.
Only Citisten's inventory row is refreshed. Catalog129/schema/Git URLs and
maintenance135documents/129registered/6unregistered pass; no games added.

New separate233-hash snapshot:
`.tmp/citisten-collector-controls/freeze-collector-controls1.json`, SHA256
`9a39b186da85c041333f26c822075556b3ca1300140b608e2855a9e0bdb1217b`.
It differs from the preserved priorf42a31c4 freeze only in river-upgrade-qa.py.
This QA-only tree change does not invalidate prior native-runtime/HUD byte identity,
but it does require honest new case pins before any future whole-tree native run.
No pending seed/HUD pins were resent after74's explicit acknowledgement.

## Exact remaining responsive-renderer prerequisite

The collector-code task above is verified; it is not blocked on generic approval.
Actual native acceptance is a separate held gate:

1. Fresh explicit native GO and actual exclusive queue admission/closure, with
   disk floor intact. The consumed fixture pass grants no further launch.
2. An actually responsive installed renderer/browser/display producing non-null,
   stable WebGL2 in the **same context** used for the town: ordinary callbacks,
   trusted input and capture delivery must work before native acceptance starts.
   Do not replay unchanged SwiftShader watchdog loss, blocklisted Mesa/lavapipe or
   failed Broadcom EGL ES3 routes; no blocklist/watchdog/security bypass, fallback
   masquerading as hardware, quality/LOD/DPR/shadow cut or fog concealment.
3. A new explicitly pinned current-source native case/freeze and exact served
   entry/dependency identity. Historical cf589/185/231 cases remain historical;
   do not silently replace their constants or accept their self-tests as current.
4. Keep original normal-input Water/build/pause/Save/reload/Continue flow,500ms
   paused equality and5s resumed completion, strict errors and cleanup. No native
   ticks/state grants, force clicks, timeout inflation or filtered failures.

No particular off-host machine or old device-approval ticket is required, and no
new initial reproduction is requested: the user's screenshot/report already
justified the repairs. Actual terrain/artifacts/shaking/seeded views/native
Water-Save-Continue/GPU/FPS remain **UNPASSED**, native requested frames **0/5**.

## Serial local integration

Ready `ccf71d0727f7b8d37d4eea8fab7035c8fe6bdc61` maps to local integration
`9836fbb62589a174eb263af27880b1340ad336b2`. All five CPU commands above were
independently rerun successfully; all233 new freeze hashes matched before/after
and on the integrated candidate. Full-module AST comparison confirms only INPUT
and native_speed differ; the signature and every other node are unchanged.
The complete game tree equals8622d0e2. Official refresh changes only row241;
newer unrelated inventory/manual content and old freezes remain intact.

The immutable DOM archive/hash was reviewed, not recaptured:24calls/8contexts/
522observations, with actual empty WebGL/error arrays and closed owned resources.
An initial local inspection assumed scalar PASS/zero fields and asserted; actual
archive schema uses descriptive PASS and an empty WebGL event array. That schema
mistake is retained in `.tmp/citisten-ccf71-collection-mistake.json`; no source,
archive or gate was changed to correct it. Independent CPU outputs remain at
`.tmp/citisten-ccf71-focused-checks.log`. No old Water/Save runner was retargeted
or rerun; its original frozen-pin rejection remains a failure, not blanket green.
No runtime asset changes, browser/native run, new game, push or deployment.
