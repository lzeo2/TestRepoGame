# Citisten corrective native QA

## Scope and readiness

F10 agent `529d6cea-cd27-4ac2-925b-8e19e8523a8e`, Pi session
`01a17083-3666-7337-ba24-ba50b5b59345`, sol/high. Exclusive writes:
`Games/Citisten3D/river-upgrade-qa.py`, this receipt and local evidence.
Runtime is read-only; F8 owns tutorial fixes, F9 owns responsive camera fit.
No game added, registration, full-fleet test or push. Catalog remains 129 games.

Read AGENTS, Code Quality, maintenance entry/manual, inventory identity, the full
old runner, old QA/delivery/dispatch and every retained JSON attempt including
resume focus traces and separate cleanup supplement. Historical native cases
remain failures. Hivemind search failed unauthenticated; fallback index absent.
Manual/inventory updates remain orchestrator-owned.

## Harness corrections (browser-free preparation)

- Compose one visible connected layout: complete same-row bank bridge, east dry
  road/homes/jobs/power/park, sole water tower on an adjacent west dry lot.
  Real growth now demonstrates water crossing instead of an unrelated bridge.
  Build west water first, before later persistent event cards can cover that bank;
  every placement still requires an unobscured lot, with no DOM hiding.
  Read-only validity, projection, canvas hit-test and picked-lot checks precede
  normal inputs. Exact bridge payment and full route length are asserted.
- Native tutorial Close must restore 1x and canvas focus within 12 seconds.
  Desktop also selects 3x with the existing real Tab/Arrow helper, then exercises
  Menu tutorial replay Close, Finish and Escape: replay remains menu-paused,
  Resume restores the selected 3x. No DOM/state setter, focus injection or
  synthetic change event. Mobile uses actual touchscreen taps/drags; the retained
  native speed helper still uses real keys and read-only focus assertions.
- Collapse map/Controls via their native summaries for space. If the composed
  crossing/city is offscreen, at most four real camera-pad inputs (Raise, Left,
  Raise, Back), rechecking after each. No forced pose. Reload replays only those
  actual prior inputs before asserting visible bridge/city and taking photos.
- Keep water-road rejection, paused sites, timed activation, naturally earned
  population >=12/stage 1, supplied completed home/jobs, apartment unlock,
  mid-build Menu Save, reload/Continue exact remaining time, paused continuity,
  completion, both themes, strict all-request/HTTP/console/external errors,
  original baseline integrity and source checks. Unreached checks never pass.
- `--freeze-label` creates/reads `freeze-LABEL.json` with Git HEAD and SHA-256 map;
  `--run-label` separately names every attempt. Exclusive creation prevents
  overwrites. Old `freeze.json` (185 hashes) and all old receipts stay intact.
- Predeclared per-case budget: 240s actions + 25s bounded cleanup, external 300s.
  Graceful browser close gets 12s; any immediate failure is checkpointed, fallback
  signals only owned browser roots, with a separate follow-up receipt. Cleanup
  errors invalidate completion even if fallback later succeeds. Only explicit
  `/usr/bin/chromium`, repository-local profiles, no installs or foreign kills.
- Preserve the existing 29,163-byte diagnostic JPEG. Planned new photos: desktop
  construction + city dark/light (3), mobile city dark/light (2). Six global
  JPEGs, <=2,000,000 bytes. Failures add read-only diagnostics, not photos.
  40 FPS and supported-GPU acceptance stay HOLD regardless of gameplay results.

## Pre-GO checks

Actual output before commit:

```text
PASS native speed protocol fixture; tutorial resume barrier and focus theft (browserLaunched: false)
PASS composed native plan: west water crosses bridge, active east jobs/home, natural stage 1, apartment placement (headless only)
PASS Python ast.parse
RIVER UPGRADE CHECK: 7/7 passed (headless integration, not browser acceptance)
```

The new shared planner regression executes against the real size-200 simulation:
no-visibility rejection, dry/wet positions, ordinary-road rejection, exact bridge
cost/route, ordinary placement, timed utility activation, natural stage 1 and
unlocked apartment placement. This is headless proof, not native acceptance.
Initial disk check: 2513 MiB free (`df -m`); no exact initial-byte sample was
recorded. Floor 2,147,483,648 bytes; no waiver.
No Chromium launched during preparation. Actual source freeze/GO and browser
results will be appended only when recorded by the orchestrator.
Scoped `git diff --check` passed after removing one trailing space. The maintenance
checker exited 1: `Commit inspected source changes before validating its inventory.`
Concurrent runtime paths belong to F8/F9; no shared inventory edit was made.
The exact precommit free-byte sample was 2,630,119,424. A local fingerprint retains
all 14 older evidence files, including original freeze SHA-256
`b0f3370d98dc9641b664c3425064fe1f5835866683cc2342dfaddb375091a243`.

Commands after new freeze and explicit GO only (fresh run label per attempt):

```sh
python3 -B Games/Citisten3D/river-upgrade-qa.py --prepare --freeze-label fixfinish1
TMPDIR=/dev/shm timeout 300s python3 -B Games/Citisten3D/river-upgrade-qa.py --case desktop --freeze-label fixfinish1 --run-label attempt1 --browser-go
TMPDIR=/dev/shm timeout 300s python3 -B Games/Citisten3D/river-upgrade-qa.py --case mobile --freeze-label fixfinish1 --run-label attempt1 --browser-go
```

## First corrective desktop attempt

Explicit SOURCE FREEZE / BROWSER GO arrived at 00:50 UTC: runtime HEAD
`a7b632389bada1c93b1d63a14ed3efd237664f97`, including UI `e9577aa6`.
The orchestrator created `freeze-fixfinish1.json` (185 hashes), SHA-256
`83812948fe728b171b6a69472d7b02d3ca98f418a48b7ef506318a29647d9c4d`.
Desktop ran `--freeze-label fixfinish1 --run-label fixfinish1`, exit 1 in
207.958s. Evidence: `.tmp/citisten-river-qa/desktop-fixfinish1-fixfinish1-results.json`
and corresponding owned server log. Actual native checks passed:

- Automatic tutorial Close restored 1x/canvas focus; real Tab/Arrow selected 3x.
- Menu replay Close, five-step Finish and Escape each stayed menu-paused, then
  native Resume restored 3x. Paused selection and production flags passed.
- Composed unobscured row 103, native ordinary water-road rejection, complete
  nine-lot bridge (83..91), exact $570 payment and full nine-lot route passed.
- Dry east road extended to lot 95. West water, east home and commercial sites
  were placed by mouse while simulation time stayed 0, with exact full remaining
  times in the final state. These are partial placements, not city acceptance.

Failure: `Locator.bounding_box: Timeout 2000ms exceeded` waiting for
`[data-tool="power"]` after the raw Service-group input. No console/request/HTTP
or external error. No photo consumed. Browser/server/profile closed directly;
new runtime hashes, baseline and freeze-file hash all unchanged. Free bytes
2,628,292,608 -> 2,627,612,672 (shared-host reading).

Diagnosis: the raw group click had no observable DOM-open barrier before the
2s bounding-box request. The failure alone does not prove a product defect.
Harness now waits up to 12s for the actual requested tool to become visible and
for native selected-tool state after normal input. It retains full hit/pick gates.
Failure diagnostics additionally retain groups/options and camera state. Native
road placement uses only drag endpoints; reduce six interpolated moves to one
real mouse/touch move, retaining down/move/up and the identical complete span.
This avoids repeated GPU-paced input round trips, not road checks or rendering.
No runtime edit, state setter, injected city, source-freeze replacement or error
filter change. Node/selftest gates are rerun before this harness commit.
Operator approved these changes before any retry. The subsequent click helper
also batches count, disabled, nonempty box, center hit-test and real scroll-area
reads into one DOM snapshot per attempt, preserving every predicate and native
pointer/touch action. No additional browser or runtime change is hidden by this.

## Corrective mobile attempt

Mobile `--run-label attempt2` on harness `90603beb` exited 1 in 114.985s.
Automatic Close/resume, Tab/Arrow pause and production flags passed. It failed
`Locator.is_visible: Timeout 2000ms exceeded` checking Road after its normal group
input, before placement. Read-only failure DOM showed tools visible, Road expanded,
Road/Bridge enabled and the corrected camera pose. This does not prove a product
defect. Errors/external arrays empty; all cleanup/baseline/freeze flags true;
zero photos consumed. Evidence `mobile-fixfinish1-attempt2-results.json` and log.

After these two concrete locator timeouts, Hermes was consulted with exact errors
and final DOM. Advice timed out after 10s; ticket
`pi-118102-1792889915187-194a5a07` remains pending. The smallest further harness
correction uses a read-only DOM visibility read (positive bounding rectangle,
computed visibility not hidden) instead of the locator's independent 2s RPC
limit, still under the same finite 12s group-open and 240s action budgets.
Normal pointer/touch, selected tool, hit-test and gameplay gates are unchanged.
The already approved desktop retry uses a fresh attempt label; no blind identical
retry, runtime edit or new freeze.

## Second corrective desktop attempt

Desktop `--run-label attempt2`, harness `b915d299`, reached **all five** native
sites and passed exact paused-state continuity, plus the prior native replay,
water-road rejection and full bridge cost/route checks. It then failed the
construction screenshot's 5s deadline after fonts loaded (83.439s total, exit 1).
No photo was created; no errors/external requests; direct cleanup and all source,
baseline/freeze checks passed. This confirms the panel-visibility correction
worked in this attempt, not full gameplay acceptance. A changed capture hypothesis
raises only the capture deadline to 15s within the unchanged overall action budget.
A final fresh desktop attempt is externally shortened to respect the original
01:03:29 hard cap; timeout remains failure, not permission to omit any gate.

## Final interruption and explicit release

Final desktop `attempt3`, harness `e511c4e0`, ran at 01:01:15 UTC with external
`timeout -k 30s 110s` (shorter than the normal case command to bound the task).
It again passed native tutorial Close/Finish/Escape replay, pause/flags, composed
visibility, ordinary-road rejection and full exact-cost/route bridge. Last
checkpoint: **98.461s**. The command exited **137**, without an exception/finally
receipt. The original JSON truthfully remains `running` at that checkpoint; it
was not overwritten as failure or success. No photo or later-site/growth/save
assertion is claimed. The final attempt never reached the changed 15s capture
hypothesis, so that change has **no browser verification**.

The 110s timeout plus 30s hard-kill grace ended after the 01:03:29 task cap;
mandatory independent cleanup followed. This is an overrun, not an on-time finish.
The planned final command should have reserved more time for kill grace and
reporting. No further browser launch was made. At 01:03:45 UTC, independent
inspection found zero Chromium roots but the owned profile still present. Verified
its recorded server port closed, removed **only** that repository-local profile,
and wrote a separate `desktop-fixfinish1-attempt3-cleanup-followup.json`:

```text
status: interrupted; exitCode: 137
browserClosed: true; serverClosed: true; profileRemoved: true
sourcesUnchanged: true; all14OldEvidenceFilesUnchanged: true
baseline: 44 source files unchanged
freeBytesAfter: 2623393792; newPhotos: 0
```

**BROWSER/SERVER SLOT RELEASED** and orchestrator notified immediately after that
check. Handoff order remains Foldwild `74b61fa7`, then Jank `783d54ad`;
only the orchestrator coordinates their launches.

## Final result and limits

- Browser-free planner/selftest and independent integration **7/7 PASS**. Python
  AST and scoped diff checks pass. No Node runtime source was changed by this lane.
- Native **0/2 complete case passes**, across four actual corrective attempts:
  three failed and one externally interrupted. Desktop has real native bridge,
  five paused construction sites and tutorial replay evidence. Natural timer
  activation, population 12/stage 1, apartment use, mid-build save/Continue,
  completion and final themes remain **unreached**, not failed simulation proofs.
- **Zero new JPEGs**. Only the unchanged 29,163-byte old diagnostic exists, inspected
  during preparation. No new actual construction/city/light-theme preview could
  be inspected. Five requested captures remain missing; no visual acceptance.
- Three finalized failed cases retained empty error/external arrays. The last
  interrupted case has empty arrays only through its checkpoint, not a clean
  complete run. Every HTTP/request error remains retained; no filters weakened.
- Both freeze files remain immutable. New freeze still matches all 185 hashes;
  all 14 older evidence files and the source-only 44-file baseline are unchanged.
  Harness commits do not replace the frozen runtime SHA. No runtime, model/vendor,
  catalog, original baseline, other game, registration, full-fleet gate or push.
- Exact precommit free bytes 2,630,119,424 -> final cleanup 2,623,393,792
  (delta -6,725,632, shared host, not solely lane-attributed). No waiver/floor breach.
  Initial `df -m` sample was 2513 MiB, not an exact-byte reading.
- Native/animation, 40 FPS and supported-GPU gates remain **HOLD**. Unresolved
  Hermes ticket `pi-118102-1792889915187-194a5a07` is advice, not acceptance.

Owned commits: `54d35e4d`, `70540d03`, `3b717302`, `90603beb`, `b915d299`,
`e511c4e0`; final reporting commit follows. No games added; no build/register
commits. Local JSON/logs/old evidence remain ignored under `.tmp/` intentionally.
Manual/inventory and integration reporting remain orchestrator-owned.
