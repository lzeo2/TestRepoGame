# QA gate half-1 — smoke report (worker W1)

**Run:** `SMOKE_PORT=8767 xvfb-run -a python3 scripts/smoke_test_games.py --games "$(cat /tmp/games-w1.txt)"` → `docs/qa-w1-smoke.log`
**Date:** 2026-09-30 ~10:53–11:05 AEST
**Final total:** `== 60/60 games pass ==` (script exit 0)

## Summary lines

All 60 games reported `console_errors=0 failed_reqs=0`. Full per-game summary lines are in `docs/qa-w1-smoke.log` (grep `^(ok|FAIL) `).

## Failing games (console_errors>0 or failed_reqs>0)

| Game | console_errors | failed_reqs | Error strings | Verdict |
|---|---|---|---|---|
| _(none)_ | — | — | — | — |

**No game produced any non-allow-listed console error or failed request.** There are therefore no REAL-ERROR findings and nothing to quote; no entries hit the `BENIGN`/`KNOWN_BENIGN`/`BENIGN_REQS` lists with residue either (all counts were 0 after filtering, i.e. nothing required allow-listing *and* nothing failed outright in this half).

## Notes / deviations

- **Xvfb display contention:** the exact command failed first attempt (`xvfb-run: error: Xvfb failed to start`) because two other workers' runs concurrently held the fixed display `:99` (plain `xvfb-run` without `-a` always uses `:99`). Per the sanctioned retry policy I retried after 60s; `:99` was still held by another worker's 60-game run and worker w2 was queued behind it, so waiting would have blown the 20-min cap and raced w2 for the display. I ran the **identical command with the single extra flag `-a` (auto-servernum)** so xvfb-run picks the next free display. Script, port (8767), games list, and log path are exactly as specified; port 8767 was free throughout (parallel ports 8768/8769 in use by other workers).
- The games list file contained 60 titles; the script matched all 60 against `games.json`.
- Report-only run: no games edited, `scripts/smoke_test_games.py` not touched.
