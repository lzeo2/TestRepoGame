# Foldwild UI polish: targeted QA receipt

## Scope and current status

**Native visual verification is BLOCKED, not passed.** Runtime owners committed shell
`c0cbf340` and controller `c89a18ff`. This task owns only the new
`scripts/test_foldwild_ui_polish.py` and this receipt. Existing tests, runtime,
canonical manual and inventory are not edited here. New check commit: `1d06901f`
(`feat: add bounded Foldwild UI polish regression check`). Catalog remains 128 games;
Foldwild is the existing preview 226, not a new registration. Games added: **0**.

The new check uses ordinary seed-42 input, native disclosures/search/filter,
manual save/recovery reachability, last-ally release protection, the original
canvas for inspection/rotation, exactly one mobile Close after a 390-to-320 resize,
and an ordinary routed battle/ability/Flee/Continue loop. It checks desktop/mobile
under both OS color preferences, visible focus, 44px targets, frame bounds and
ability heading/effect typography. Foldwild retains its fixed light shell; this
is not a new dark theme. These are intended assertions, **not completed coverage**.
No grants, input retries, timeout increases, error exclusions or existing-test edits.

## Actual verification

- Python `compile` of the new check: `PASS: new targeted UI check Python syntax`.
- `python3 -B scripts/test_foldwild_m2_shell.py`: `Ran 1 test in 0.035s`, `OK`, exit 0.
- `node --experimental-default-type=module --check Games/Foldwild/script.js`:
  no diagnostics, exit 0.
- Owned-path `git diff --check`: no diagnostics, exit 0.
- `python3 -B scripts/check_maintenance_docs.py`: exit 1,
  `AssertionError: Commit inspected source changes before validating its inventory.`
  Other agents have dirty game sources. No global inventory refresh attempted here.
- Main separately reported fresh 13/13 pure suites, shell 1/1 and 128-entry catalog
  checks green. The independently committed mechanical receipt is
  [UI polish checks](foldwild-ui-polish-checks.md), commit `df77d00d`.
  My own duplicate pure loop was interrupted after data/battle passed; it is not
  counted as another 13-suite pass.

## Browser attempts and evidence

Command for a future reserved slot:

```sh
timeout --signal=TERM --kill-after=10s 300s python3 -B scripts/test_foldwild_ui_polish.py
```

System Chromium is pinned to `/usr/bin/chromium`; no browser downloads or installs.
A late process guard rejects an occupied shared browser slot. The check owns a
bounded ephemeral-port server, closes contexts/browser/server in `finally`, and
caps JPEG captures below 2 MiB. Results retain before/after source hashes and the
original exception without taking a secondary screenshot that could mask it.

1. **First launch failed before any completed case or capture.** Admission saw a
   free slot, but a sibling started during Playwright setup. A secondary failure
   screenshot timed out (`Page.screenshot: Timeout 10000ms exceeded`) and masked
   the initial exception. That diagnostic bug is fixed in the new check. The
   initial exception/root cause cannot be reconstructed from this run; browser
   overlap is context, not a proven cause. Log:
   `.tmp/foldwild-ui-polish-qa/run.log`. Results:
   `.tmp/foldwild-ui-polish-qa/7c07e26eeaf145f7a02c3cce1f704953/results.json`.
2. **Retry admission blocked before a second browser launched, exit 1.** A Wings
   browser entered during startup; the late guard reported
   `AssertionError: shared browser slot occupied: 563690`. Log:
   `.tmp/foldwild-ui-polish-qa/retry.log`. Results:
   `.tmp/foldwild-ui-polish-qa/a81aeb6d7b9142f6822e893be315aaca/results.json`.
   Earlier exit-75 shell preflights likewise launched nothing. Playwright emitted
   pending-connection cancellation diagnostics during this guard abort, not a
   game pass or a game-console finding.

Both records have `passed: false`, zero completed cases, zero captures and equal
before/after hashes for all 11 authored runtime files. **No screenshot directory
contains reviewable images.** Main must not infer visual approval. At cleanup,
`ps` showed no remaining processes for first-run timeout/Python PIDs 559172/559173
or retry wrapper 563564. The guarded retry never launched Chromium. Servers were
closed by the runner's `finally`; unrelated sibling browsers were not stopped.

Paseo sends repeatedly timed out. Coordination advice ticket
`pi-541223-1792798884569-21ef47f8` grants no approval; slot escalation
`pi-541223-1792799334683-f373a3a3` was cancelled/unresolved. Main is coordinating
the shared slot. Main subsequently ordered **ABANDON further browser attempts**
after these two failures. Browser hold is released; no third run is scheduled.
Any future native check requires separately coordinated scope and a reserved slot.

Two initial Git staging attempts also failed on a persistent worktree `index.lock`.
No lock was removed or process killed. Read-only inspection later found the lock
absent; explicit-path staging/commit then succeeded. Git advice ticket
`pi-541223-1792799518072-c809b226` needed no lock intervention.

## Frozen source hashes (SHA-256)

Both attempts matched these values, including after runtime commits landed:

```text
battle.js       4517e1a93664b16376f6cba529ca049f338cb2aca2096819b283e9ea63feccda
builds.js       1bd4855b088290a4000e329e4e6c3d156a53cc17fbe5dba212e82e83fb89abe3
campaign.js     2d333e96cd7707b70ea20aecc4abfdbdaab27c7b77deaebe82004123f0593072
data.js         069df5f77f47d76eaea8d1cc76bc930e435a1857048696a17c07d5246e3e4c83
economy.js      644ffdd23ff75edb8dfd639447bad42692ccd8b2bf7112e6468a3c8c4a6194f0
index.html      f24630f31e4fad36e0ac4259e6c0c75297d4c102cf40849ecd65457a9791f1bd
region-data.js  0857e6851570af51f124f36545b0870f6c56351ac214106dadb0bce21cb05f17
script.js       7ac0e594019de524f0e61e8ac3cd9e87d1f6b1d67336e65f57adf1b10ffd6376
style.css       34a895a0271dff8cb1e9a2c76e84501cde06f42b44c58f74ff21783bfeca8bc3
view.js         d41faf3b928ab7858222911797fe12146814a922d5ea69c91249f71759562b1e
world.js        7b8c430f55aaee87cc009b5704d791a8afb25532a0509c3770fc2cee7a2ab4bd
```

No supplied models/vendor bytes, catalog, registration, sparse selection or security
settings changed here. Original/async M2 and single-mobile-Close stability,
natural campaign/acquisition/evolution, rights and physical-device holds remain.
No full-fleet smoke, release or push. Capture bytes: **0**. Initial shared free
storage was **2,748,481,536 bytes**; immediately before final reporting it was
**2,718,097,408 bytes**, a shared-host reduction of **30,384,128 bytes**, not an
attribution to these small test/report artifacts.
