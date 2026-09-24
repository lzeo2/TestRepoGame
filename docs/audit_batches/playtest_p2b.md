## Playtest P2b
Cryptogram | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Word Scramble | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Darts 501 | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Bowling | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Mahjong Lite | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Penalty Shootout | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Archery | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Mini Golf | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Curling | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Free Throw | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Hunt The Wumpus | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
Backgammon | played: partially | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
Higher Or Lower | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass

Notes (P2b, all runs: 0 PageErrors, 0 console errors, http.server:8137 + xvfb chromium, 1 screenshot used: shots_playtest/mahjonglite_tileselect.png):
- Cryptogram: typed 4 letters into cells + Enter check -> msg "Fill every cell first (9 left)". Restart unverified: Give up leads to end overlay -> restartBtn, but click was blocked (confirm dialog auto-dismissed by driver) within budget -> nt.
- Word Scramble: wrong answer -> "Not quite. Try again.", Reshuffle re-scrambled (CCLERI -> CCRELI). restartBtn only lives in end overlay (10 rounds x 20s), unreachable in 90s -> nt.
- Free Throw: 3 Space-holds fired 3 shots (shots-left 10->7). restart-button only in game-over screen, not reached -> nt.
- Hunt The Wumpus: moved room 2 -> 10, percept "flapping wings"; driver then timed out clicking disabled #fireBtn (correct behavior: no direction picked yet) before menu-restart check -> nt.
- Mahjong Lite: hint + restart respond; follow-up probe confirmed .tileFront clicks select free tiles (4x selTile, no errors).
- Backgammon: auto-roll (3,3), board clicks select checkers and give legal-move feedback ("not a legal destination"); New match re-rolled dice (1,3) and reset note.
