# Batch 65: targeted CITISTEN load smoke

Tested source HEAD: `ce1c541`. The operator explicitly released an exclusive
<=120-second slot and froze other source/Git/sparse operations. Strict preflight
asserted zero Chromium roots, Playwright drivers and smoke processes, exactly
one selected catalog row (241/CITISTEN), and a present native entry.

Command (110-second supervisor, 5-second cleanup allowance):

```sh
SMOKE_PORT=8857 xvfb-run -a python3 -B scripts/smoke_test_games.py --games 241
```

Actual output in `smoke-241-batch65.txt`:

```text
ok   CITISTEN                     console_errors=0 failed_reqs=0

== 1/1 games pass ==
```

Exit 0. Post-check found zero Chromium roots/drivers/smoke processes and port
8857 closed. World explicitly released the slot to native owner `de41b4b`.
Free disk: 3,148,967,936 -> 3,148,820,480 bytes (shared-host delta -147,456).
No Blender or swarm push. This is neither full-fleet smoke, native gameplay
acceptance, per-model AFTER QA nor a 40 FPS pass. Those gates remain open.
Later native source changes require new acceptance; they do not inherit this pass.

## Rejected history

`smoke-241-rejected-zero-match.txt`: zero-game selection amid the external
`c7c5d38` merge/sparse/stash activity. `0/0` is not acceptance.
`smoke-241.txt`: interrupted attempt with a foreign Chromium root present;
no completed result and no acceptance. No foreign process was killed.

## Canonical preservation and inventory

`bed7dd5` preserved 138 delivery files / 52 GLBs. Main independently compared
all source/canonical SHA256s and verified canonical paths were committed before
removing only `external-art/`. Canonical-only replay passed.

The documentation refresh records committed CITISTEN source and the existing
upstream Jankolock metadata. The latter's four-file source diff was inspected:
live xray target membership, pooled cage visuals and corresponding regressions.
Those changes arrived through `c7c5d38`, not world edits. The refreshed README
also repairs that merge's old Jankolock entry link. No Jankolock source or catalog
row was edited by world. Maintenance validation covers hashes/sections, not
acceptance of either game.
