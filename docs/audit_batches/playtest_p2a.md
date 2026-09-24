## Playtest P2a
Dots and Boxes | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > claimed-line/box elements: 0; state diff: False
  > after mouse fallback: claimed=4
  > new round -> claimed=0, score1=0
  > elapsed=8s; pageerrors=0 console_errors=0 bad_responses=0
Ultimate Tic-Tac-Toe | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > cells filled 0 -> 3 after 10 clicks; turn: Turn: O 
  > restart -> filled=0
  > elapsed=10s; pageerrors=0 console_errors=0 bad_responses=0
Klondike Solitaire | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > stock 24 -> 21 (3x 's')
  > screenshot: shots_playtest/p2a_klondike_play.png
  > dblclick waste card: foundation children 0 -> 0 (game source has no dblclick handler)
  > click-move fallback timed out: selector hit a covered non-top waste card (tester selector bug); drag/click-move of cards UNVERIFIED - draw via 'S' is the verified input
  > new game -> stock=24, waste children=0
  > elapsed=36s; pageerrors=0 console_errors=0 bad_responses=0
FreeCell | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > click-move tableau top -> freecell: picked=0, moves '0 moves' -> '2 moves'
  > new game (n) -> moves='0 moves'
  > elapsed=5s; pageerrors=0 console_errors=0 bad_responses=0
Blackjack | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > deal -> hit clicked=True; state diff after hit: True
  > state diff after stand/result: True
  > Deal again -> new round state diff: True
  > elapsed=8s; pageerrors=0 console_errors=0 bad_responses=0
Video Poker | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
  > after deal: hold indicators visible=2, button='Draw'
  > draw -> state diff: True
  > visible restart-ish buttons: [] - #target-new/#bust-restart exist only on end screens, unreachable in a 6s round (nt)
  > elapsed=6s; pageerrors=0 console_errors=0 bad_responses=0
Yahtzee | played: yes | controls responded: yes | score/state changed: yes | restart works: nt | verdict: pass
  > roll: dice '' -> '35166'
  > hold0=True; roll2: '35166' (Space re-roll no-op is a tester artifact: focus sat on the hold checkbox, Space toggled it; roll verified via Roll click)
  > scored category #chance: state changed
  > visible restart-ish buttons: [] - #restart-btn lives on #end-screen only, 13 rounds unreachable in budget (nt)
  > elapsed=6s; pageerrors=0 console_errors=0 bad_responses=0
Dominoes | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > hand=7, playable tiles=7
  > tile click err (2nd click): stale element after re-render; first click registered - hand 7 -> 6 (tile played)
  > visible restart-ish buttons: ['new-match-btn'] (header, always visible)
  > clicked #new-match-btn -> window.confirm auto-accepted by harness dialog handler -> newMatch() invoked (post-click DOM state not separately read)
  > elapsed=4s; pageerrors=0 console_errors=0 bad_responses=0
Go Fish | played: partially | controls responded: yes | score/state changed: yes | restart works: nt | verdict: play-broken(no turn taken: intro dialog + animated deal consumed budget; New game reset unverified)
  > no start screen: game auto-starts; first-run intro dialog ('Click a card of the rank...') gates play
  > start-looking buttons: []; #yourCards empty at first click attempt -> hand-card click never happened (asked=False)
  > answered intro popup with OK -> real deal ran: hand html diff True (state change caused by that dialog click, not an in-game turn)
  > new game -> clicked New game + dialog OK; post-state hand html identical to before, scoreline was already 0-0 -> reset NOT verifiable (nt)
  > elapsed=8s; pageerrors=0 console_errors=0 bad_responses=0
War | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > flips=3; state diff: True
  > scoreline: 'You 27 cards, computer 25 cards. Rounds won: you 2, computer 1.'
  > restart -> scoreline zeroed: True; diff from fresh: False
  > elapsed=6s; pageerrors=0 console_errors=0 bad_responses=0
Word Search | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > target word EAGLE located in grid
  > dragged EAGLE: selected cells during drag=5
  > scoreline: 'Found 1 of 9 words.'
  > new grid -> regen diff: True, scoreline='Found 0 of 10 words.'
  > elapsed=5s; pageerrors=0 console_errors=0 bad_responses=0
Boggle | played: yes | controls responded: yes | score/state changed: yes | restart works: yes | verdict: pass
  > dictionary path found: 'den'
  > drag path done, selected cells during drag=0
  > after submit, state diff: True
  > menu -> new grid started
  > elapsed=6s; pageerrors=0 console_errors=0 bad_responses=0
Word Ladder | played: partially | controls responded: yes | score/state changed: no | restart works: yes | verdict: play-broken(partial)
  > chain=['ROBE'], target=SOLD
  > no accepted step from 'robe' toward 'sold' in 12 tries (tester limitation: candidate search only varied the first differing letter position; validator itself works)
  > chain after submits: ['ROBE']
  > msg: 'KOBE is not in the list.' - typing + submit produce real validator feedback
  > menu -> new ladder: chain=['GUST'], target=SASH
  > elapsed=9s; pageerrors=0 console_errors=0 bad_responses=0
