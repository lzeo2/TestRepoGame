# QA Gate — Half 2 Smoke Report (worker W2)

- **Run:** `SMOKE_PORT=8768 xvfb-run python3 scripts/smoke_test_games.py --games "$(cat /tmp/games-w2.txt)" 2>&1 | tee docs/qa-w2-smoke.log`
- **Date:** 2026-09-30
- **Scope:** half 2 of the mandatory pre-push QA gate — 60 titles from `/tmp/games-w2.txt` (verified: 60 comma-separated titles).
- **Raw log:** `docs/qa-w2-smoke.log`
- **Note:** first attempt failed with `xvfb-run: error: Xvfb failed to start` (display lock conflict with a parallel worker's Xvfb on :99); retried once after 60 s per instructions and it ran clean.

## Totals

```
== 60/60 games pass ==
```

- **ok:** 60
- **FAIL:** 0
- All 60 lines: `console_errors=0 failed_reqs=0`

## Games with console_errors>0 or failed_reqs>0

**None.** No game in this half reported any console error or failed/4xx request, so there is nothing to triage as REAL-ERROR vs benign (the `BENIGN` / `KNOWN_BENIGN` / `BENIGN_REQS` allow-lists in `scripts/smoke_test_games.py` were not needed for this half).

## First 25 summary lines (verbatim from log)

```
ok   Fireboy & Watergirl: Forest Temple console_errors=0 failed_reqs=0
ok   Fireboy and Watergirl Hacked (Light Temple) console_errors=0 failed_reqs=0
ok   Fireboy and Watergirl Forest Temple Hacked console_errors=0 failed_reqs=0
ok   Fireboy and Watergirl Crystal Temple Hacked console_errors=0 failed_reqs=0
ok   Merge Cats Defender          console_errors=0 failed_reqs=0
ok   Merge Cats Defender Hacked   console_errors=0 failed_reqs=0
ok   Archery                      console_errors=0 failed_reqs=0
ok   Free Throw                   console_errors=0 failed_reqs=0
ok   Backgammon                   console_errors=0 failed_reqs=0
ok   Pacman                       console_errors=0 failed_reqs=0
ok   Qix                          console_errors=0 failed_reqs=0
ok   Joust                        console_errors=0 failed_reqs=0
ok   Tron Light Cycles            console_errors=0 failed_reqs=0
ok   Puzzle 15                    console_errors=0 failed_reqs=0
ok   Peg Solitaire                console_errors=0 failed_reqs=0
ok   Checkers                     console_errors=0 failed_reqs=0
ok   Reversi                      console_errors=0 failed_reqs=0
ok   Mastermind                   console_errors=0 failed_reqs=0
ok   Nim                          console_errors=0 failed_reqs=0
ok   Dots and Boxes               console_errors=0 failed_reqs=0
ok   Ultimate Tic-Tac-Toe         console_errors=0 failed_reqs=0
ok   Klondike Solitaire           console_errors=0 failed_reqs=0
ok   FreeCell                     console_errors=0 failed_reqs=0
ok   Blackjack                    console_errors=0 failed_reqs=0
ok   Video Poker                  console_errors=0 failed_reqs=0
```

## Verdict

**GATE PASS (half 2).** Report-only run — no games edited, no changes to `scripts/smoke_test_games.py`.
