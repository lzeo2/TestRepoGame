# Foldwild M2 final core checkpoint

Delegation 56: actual `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`.
Owned checkpoint paths: `Games/Foldwild/style.css`,
`scripts/test_foldwild_m2.py`, this report. `script.js` is unchanged.
Anonymous author/committer: Arcade Worker, empty email.

## Bounded change

Preserved Main's pending `scroll-margin-top:72px`, strict inspection-name
visibility assertion and renderer-width readiness check after 390-to-320 resize.
The ledger heading alone now uses a 100px title flex basis, keeping the title
and 44px Close ledger button on one row at 320px. Other dialogs are unchanged.
The existing native regression additionally checks this row, visible model name,
close-center hit target and captures a 320px inspection before its single touch
close. No mouse substitution, repeated tap, timeout increase or weakened failure
filter was added. No game API, renderer, simulation, save or asset was changed.

## Input trace and gate status: HELD

The original 180px title basis caused the close button to wrap after resizing:
390px close bounds x233.14/y80 became 320px x33/y113. The scoped layout correction
keeps 320px close bounds x163.14/y80. This fixes the demonstrated heading reflow,
not a proven root cause for the intermittent missing native close.

A temporary read-only standalone event trace recorded trusted pointerdown,
touchstart, pointerup, touchend and click on `collection-close`; the native dialog
closed and presentation returned to world. It exited 0 before the CSS correction.
A full temporary traced run after the correction also recorded all five events
on that button, with world phase/mode and dialog closed. No trace/debug hook was
committed to the game or test, and neither trace mutated expedition state.

The actual committed-test foreground run still failed after its single tap at
`ready(page, 'world')`: exit 1, four positive desktop stages, source unchanged,
zero console/page/load/external errors. Its 320px heading/name/hit checks passed.
An earlier background run completed seven stages and three negative fixtures,
but a shell wait bookkeeping error lost its process exit status; it is not an
exit-verified gate pass. The temporary traced full run exited 0 with seven stages
and three fixtures, but observation changed execution timing and does not erase
the uninstrumented failure. No second implementation attempt or release claim
was made after that failure. The input root remains unresolved; Main must review
and obtain a fresh stable native pass before accepting the integrated gate.

## Actual commands and evidence

- `node --experimental-default-type=module --check Games/Foldwild/script.js`:
  exit 0, no syntax diagnostics (`SYNTAX_EXIT=0`).
- Nine existing pure suites via
  `node --experimental-default-type=module scripts/test_foldwild_<suite>.mjs`:
  data, battle, world, regions, economy, builds, battle_v2, save_v2, continuity;
  all exited 0. Continuity output: `PASS: optional v1/v2 continuity; canonical
  effects/profiles, active index and exact action/RNG replay; missed capture`.
- `PYTHONDONTWRITEBYTECODE=1 timeout 230s xvfb-run -a python3 scripts/test_foldwild_m2.py`:
  `M2_NATIVE_EXIT=1`; unchanged-source mobile-close failure described above.
  Temporary log basename: `foldwild56-m2-final.log`, status basename:
  `foldwild56-m2-final.status`. The 230s outer bound was not reached; normal
  per-assertion timeouts and failure filters stayed unchanged.
- Temporary full input trace: bounded 170s, `TRACE_EXIT=0`; log basename:
  `foldwild56-full-trace.log`. It used the existing native script unchanged
  except temporary event observation and root/import resolution outside Git.
- `git diff --check`: exit 0. All native HTTP servers and browsers terminated.
  No dependencies installed. Disk remained 2.4 GiB free; the final traced run
  reported 32,768 bytes storage delta. No large assets were materialized.

Screenshots in the temporary `foldwild-m2-core` output directory, awaiting Main's
subjective review: `desktop-inspection.jpg`, `battle-resumed.jpg`,
`release-confirm.jpg`, `mobile-inspection.jpg`, `mobile-inspection-320.jpg`.
The 320/390 captures show the name and one-row Close ledger button unobscured;
rotation/reset remain in a scrollable native dialog. Each image is below 61 KiB.
The output JSON now belongs to the temporary passing trace, not the failed
uninstrumented run; consult the separate logs/status files rather than treating
that overwritten JSON as final freshness proof.

No games added, catalog IDs changed, registration or push. Zero full registered-
catalog gate passes in this task. Campaign/finale, natural native evolution,
all-species acquisition/accessory-fit acceptance, class ranks, optional horror,
frontier, provenance/publication and actual N100 hardware certification remain
held. Operator clarification ticket: `pi-1253312-1790905405820`; no answer arrived
during the bounded worker wait. Existing Main ticket remains independently open.
