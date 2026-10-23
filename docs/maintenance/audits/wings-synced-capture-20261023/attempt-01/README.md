# Wings synced capture: attempt 1, 2026-10-23

**EXITED capture incomplete. Exit 124; product outcome UNKNOWN / NOT_MEASURED.**
Operator ticket `pi-829842-1792632763581-ba60545e` resumed capture only.
Runtime baseline: `be0de0bdbd263e7b56af1f27a8facee0a6638ae1`.
Exactly one native attempt; no retry, source rebuild or push.

## Route and result

```sh
xvfb-run python3 -B Games/Wings/verification/check-ctf-browser.py --out docs/maintenance/audits/wings-synced-capture-20261023/attempt-01
```

Exit **124**, also retained in `exit-code.txt`; stdout in `capture.log`.
Used synchronous Playwright, system Chromium, headless false, 30s launch ceiling,
15s DOMContentLoaded navigation ceiling and the requested five launch arguments.
Supervisor and collector are **50s**, without an outer 55s wrapper or 20s probe
override. Product boot30/readiness20 limits and full capture assertions remain
unchanged. Existing helper is read-only. No renderer instrumentation/state grants.

`browser.json` retains atomic phase timestamps, real clicks and menu observation:

- Chromium launch phase 1.259s; context creation 2.321s; navigation 2.922s.
- CTF menu 3.293s; seven vehicle clicks selected Patrol Speedboat.
- Screenshot phase 6.025s; menu sample 6.267s; Start offline clicked 6.540s.
- Supervisor expired during `product-gate`. No completed readiness, boat movement
  or ordinary AI-crew flag sample. The maximum product budget could not fit after
  startup within this collector. No boot/readiness failure is inferred.

[Fresh menu screenshot](01-ctf-lobby.png) shows Capture the flag, Patrol Speedboat,
2 bots/team, capture limit 3, time limit 5 min and Start offline. This is menu
proof only, not water/flag gameplay, complete layout acceptance or hardware proof.
No boat-water or airborne-flag screenshot exists. No retained console/page errors,
failed requests or external loads were observed before interruption; this is not
a completed clean gameplay run.

## Verification and cleanup

- `python3 -B Games/Wings/verification/check-ctf-browser.py --self-check`: exit 0.
  Output: `PASS CTF timing verdict self-check; no browser started`; inherited
  atomic receipt/first-error/subreaper regression also passed.
- Read-only postflight assertions: exit 0. Output: `PASS actual receipt deadlines,
  incomplete verdict, cleanup and shared slot clear`.
- `git diff --check`: exit 0.
- Maintenance checker initially exited 1: `Commit inspected source changes before
  validating its inventory.` Inventory refresh belongs to the coordinator.

Parent persisted the timeout before cleanup. Final receipt: supervisorExit 124,
no owned descendants or cleanup errors; browser/server closed, repository-owned
profile removed, supervisor cleanup finished. Independent slot check passed.
No sibling was killed and no outside-repository deletion occurred.

Preflight free bytes: 2,998,063,104; immediately after capture: 2,997,768,192.
Evidence at that point: 63,406 bytes, below 10 MB. Host-wide disk delta is not
attributed solely to this lane. No checkout, install, build or full fleet gate.
Catalog remains 127 games; none added. Legacy release, physical input, hardware,
rights, model/roof/driver and push holds remain. Only the coordinator may decide
whether to use attempt 2.
