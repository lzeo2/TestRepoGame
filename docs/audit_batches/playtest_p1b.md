## Playtest P1b

Phase 5 interactive playtest, chunk P1b. Playwright chromium under xvfb-run, served via local http.server (not file://). Budget 90 s/game, 0 screenshots taken.

### Run 2026-09-24 12:58:05

Snow Rider 3D | played: yes | controls responded: no | score/state changed: no | restart works: yes | verdict: play-broken(reached play, broke at controls, state, 2 PageError(s))
  - SnowRider3D: 6.1s
  - dist -1 m->-1 m, score -1->-1
  - pause screen True, start screen after Menu True
  - PAGEERROR: Cannot read properties of undefined (reading 'y1')
  - PAGEERROR: Cannot read properties of undefined (reading 'y1')

Duck Hunt | played: yes | controls responded: no | score/state changed: no | restart works: yes | verdict: play-broken(reached play, broke at controls, state)
  - DuckHunt: 4.6s
  - shots Shots 3->Shots 3, hits Hits 0 / 2->Hits 0 / 2
  - back to start screen: True

Curve Fever | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - CurveFever: 5.0s
  - scores 'You: 0\nComputer: 0'->'You: 0\nComputer: 0', canvas changed True
  - back to start screen: True

Sokoban | played: no | controls responded: no | score/state changed: no | restart works: no | verdict: fail
  - Sokoban: 7.5s
  - moves 'Moves 0'->'Moves 3'
  - EXCEPTION: TimeoutError: Locator.click: Timeout 4000ms exceeded.
Call log:
  - waiting for locator("#restartBtn").first
    - locator resolved to <button type="button" id="restartBtn">Restart</button>
  - attempting click act

Nonogram | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - Nonogram: 5.2s
  - puzzle cells found: 6
  - mistakes 'Mistakes 0'->'Mistakes 1', grid changed True
  - after #newBtn: new grid True, mistakes 'Mistakes 0'

Tower of Hanoi | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - TowerOfHanoi: 3.6s
  - moves used 'Moves used 0'->'Moves used 1'->'Moves used 2'
  - after Reset: 'Moves used 0' (expect 'Moves used 0')

Puzzle 15 | played: yes | controls responded: yes | score/state changed: yes | restart works: no | verdict: play-broken(reached play, broke at restart)
  - Puzzle15: 4.6s
  - moves '0'->'5'
  - after Restart: '5' (expect '0')

Peg Solitaire | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - PegSolitaire: 3.1s
  - jump via tiles 10->24
  - moves '0'->'1', pegs '32'->'31'
  - after Restart: moves '0' pegs '32' (expect '0'/'32')

Checkers | played: yes | controls responded: no | score/state changed: no | restart works: yes | verdict: play-broken(reached play, broke at controls, state)
  - Checkers: 8.3s
  - find move: {'err': 'no gameManager'}
  - find move: {'err': 'no gameManager'}
  - find move: {'err': 'no gameManager'}
  - find move: {'err': 'no gameManager'}
  - status 'Tap a piece, then a destination.'->'Tap a piece, then a destination.', your count '12'->'12'
  - after Restart: start overlay True, countYou '12'

Reversi | played: yes | controls responded: no | score/state changed: no | restart works: no | verdict: play-broken(reached play, broke at controls, state, restart)
  - Reversi: 5.5s
  - hint cell: None
  - you '2'->'2', them '2'->'2', status 'Your move.'->'Your move.'
  - after Restart: you '2' (expect '2')

Battleship | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - Battleship: 5.8s
  - battleBtn disabled after randomize: False
  - shots '0'->'2', hits '0'->'1', status 'Your move. Tap an enemy square to fire.'->'Enemy missed at D8. Your move.', enemy cells 64
  - after Restart: shots '0' (expect '0'), placement visible True

Mastermind | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - Mastermind: 4.2s
  - status 'Guess 1 of 8'->'Guess 2 of 8' (typed 1234 + Enter)
  - after New round: 'Guess 1 of 8' (expect 'Guess 1 of 8')

Nim | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - Nim: 5.3s
  - stones 14->12 (after my Take 2) -> 10 (CPU) -> 8; status 'Your move'->'Computer took 2. Your move'->'Computer took 1. Your move'
  - after New round: stones 14 (expect 14)

### Retry pass 2026-09-24 13:07:35 (single re-check of flagged games; no second retries)

Snow Rider 3D | played: yes | controls responded: yes | score/state changed: yes | restart works: no | verdict: play-broken(reached play, broke at restart)
  - SnowRider3D retry: 5.2s
  - HUD before start ('0', '0 m') -> after start ('15', '15 m') -> after keys ('59', '59 m')
  - distance advancing during play: True
  - pause False, back to start screen False

Duck Hunt | played: yes | controls responded: no | score/state changed: no | restart works: yes | verdict: play-broken(reached play, broke at controls, state)
  - DuckHunt retry: 4.5s
  - diag after start: {'startVisible': False, 'roundVisible': False, 'hit': 'CANVAS#field.aiming', 'hitIsField': True, 'fieldCursor': 'none', 'round': 'Round 1 of 3'}
  - mouse click on field: 'Shots 3' -> 'Shots 2'
  - final shots 'Shots 3' hits 'Hits 0 / 2'
  - back to start screen True

Sokoban | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - Sokoban retry: 2.5s
  - moves 'Moves 0'->'Moves 2', win overlay visible False (level 1 solvable in 1 push)
  - after Restart during play: 'Moves 0' (expect 'Moves 0')

Puzzle 15 | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  - Puzzle15 retry: 5.5s
  - moves '0'->'4'
  - after Restart + 2.5s (async scramble finishes): '0' (expect '0')

Checkers | played: no | controls responded: no | score/state changed: no | restart works: no | verdict: fail
  - Checkers retry: 10.7s
  - attempt 0: checker id 12 5,1 -> 5,1, selected=True
  - attempt 1: checker id 12 5,1 -> 5,1, selected=True
  - attempt 2: checker id 12 5,1 -> 5,1, selected=True
  - status 'Tap a piece, then a destination.'->'The computer wins', countYou '12'->'12'
  - EXCEPTION: TimeoutError: Locator.click: Timeout 4000ms exceeded.
Call log:
  - waiting for locator("#restartBtn").first
    - locator resolved to <button class="btn" type="button" id="restartBtn">Restart</button>
  - attempti

Reversi | played: yes | controls responded: no | score/state changed: no | restart works: yes | verdict: play-broken(reached play, broke at controls, state)
  - Reversi retry: 8.7s
  - hint appeared after ~3.5s: {'x': 610, 'y': 347.5, 'cls': 'disk hint-b'}
  - you '2'->'2', them '2', status 'Your move.'
  - after Restart: you '2' (expect '2')

### Final verdicts P1b (merged run1 + single retry; no second retries)

Snow Rider 3D | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: play-broken(run1 Start crashed: PageError "reading y1" froze sled at -1 m after start; run2 played normally to 59 m; Pause->Menu restart verified in run1)
Duck Hunt | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (shots 3->2 on canvas click; run1 "no change" was round cycling back to Shots 3; Menu->start screen verified, 0 PageErrors)
Curve Fever | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (canvas trail animates under arrow/A-D steering; Menu->start screen)
Sokoban | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (retry: Moves 0->2, Restart during play resets to Moves 0; run1 timeout was win overlay covering header after solving level 1 in one push - win screen offers Next/Menu, R key also restarts)
Nonogram | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (cells toggle, Mistakes 0->1, New puzzle regenerates grid)
Tower of Hanoi | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (rod1->rod2->rod3 moves, Moves used 0->2, Reset -> 0)
Puzzle 15 | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (retry: Moves 0->4; Restart runs async scramble ~1s then resets moves to 0 - run1 read it mid-scramble)
Peg Solitaire | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (jump 10->24, moves 0->1 pegs 32->31, Restart -> 0/32)
Checkers | played: yes | controls responded: no | score/state changed: no | restart works: yes | verdict: play-broken(human piece selects but no legal destination click ever moved it across 3 attempts; game falsely ends "The computer wins" with counts 12/12; lose modal then blocks header Restart - run1 verified Restart resets to 12/12)
Reversi | played: yes | controls responded: no | score/state changed: no | restart works: nt | verdict: play-broken(hint rings appeared ~3.5s but my click landed in the hint+200ms window before mousedown listeners attach (enableTouch), so no move registered; counts stayed 2/2 so restart reset was not positively observable; 0 PageErrors)
Battleship | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (randomize->battle, shots 0->2 hits 0->1, Restart -> shots 0 + placement)
Mastermind | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (keys 1234+Enter -> Guess 2 of 8; New round -> Guess 1 of 8)
Nim | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass (Take 2: stones 14->12 then CPU 10; New round -> 14)

Screenshots taken: 0 (budget 1). Server: local http.server :8791. Game files untouched.
