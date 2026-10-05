# Dots and Boxes (id 176) - play-flow audit report

CODE-REVIEW ONLY. No browser run in this pass.

- Identity: id 176, registered, url `Games/DotsAndBoxes/index.html`.
- Baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 4 files (index/script/style/LICENSE), 20605 bytes.

## Source inspected

- `Games/DotsAndBoxes/index.html` blob `b518eb91be40e73d9fd15cb228534eed2db6cc05` (3229 bytes, read completely).
- `Games/DotsAndBoxes/script.js` blob `6e4186351bfdb1ed22ac51a3a9a118592bf884ba` (10940 bytes, read completely). Functions: `isLine`, `isBox`, `ownerOf`, `boxOwner`, `adjacentBoxes`, `sidesOwned`, `createBoard`, `onLineClick`, `claim`, `checkCompletedBoxes`, `switchPlayer`, `updateStatus`, `continuePlay`, `aiMove`, `allOpenLines`, `moveKbCursor`, `startRound`, `showEndOverlay`, `setMode`, `toMenu`, `play`; listeners on `#modeAi #mode2p #playBtn #newRoundBtn #menuBtn #againBtn #overlayMenuBtn` and document `keydown`.
- Header comment records provenance (github.com/ayahae79/Dots-and-Boxes, MIT, commit `5cadc823...`) and local modifications.

## Flow

- Boot: `#startScreen` visible, `#gameScreen`/`#endOverlay` have `.hidden`. `setMode("ai")` on load.
- Start: `#playBtn` -> `play()` sets names ("You"/"Computer" or "Player 1/2"), swaps screens, `startRound()` resets scores/`boxesDone`/`gameOver`, rebuilds board via `createBoard()` (9x9 element grid; even/even = `.dot`, even/odd = `button.hline`, odd/even = `button.vline` with aria-labels, odd/odd = `.box`).
- Input/core loop: click/tap `button.hline|vline` -> `onLineClick` (blocked while `gameOver || aiTimer`, and while AI's turn) -> `claim()` adds `.owned1/.owned2`, `checkCompletedBoxes` awards `POINTS = 10` per completed box into `score1/score2`, updates `#score1 #score2 #boxesLeft`. No-draw turn passes via `switchPlayer()`. AI: `continuePlay()` schedules `setTimeout(aiMove, 520)` when `currentPlayer === 2`; `aiMove` picks completes > safe > all open lines at random. Keyboard: arrows move `.kb-cursor`, Enter/Space claim, `N` new round, Escape closes end overlay to menu.
- Win/lose: `boxesDone >= TOTAL_BOXES (16)` -> `gameOver = true`, `showEndOverlay()` writes `#endTitle` ("You win"/"Computer wins"/"Draw"/"Player N wins"), `#endResult`, `#endDetail`, focuses `#againBtn`.
- Restart: `#againBtn`/`#newRoundBtn` -> `startRound()`; `#menuBtn`/`#overlayMenuBtn` -> `toMenu()` back to `#startScreen`.

## UI bloat: MILD

- Persistent: `#startScreen` carries title + description + a full `Controls` panel (4 bullet lines). In game: `header.topbar` (title `h2.title`, score cards `#card1/#card2`, `#newRoundBtn`, `#menuBtn`), `#gameStatus`, `#boxesLeft`. All functional; the start-screen controls block is the only always-on instructional copy.
- Popups/modals: exactly one, `#endOverlay` (end-of-round result + Play again/Menu). Triggered once per round end, not recurring. No ad/info/nag popups.

## Animation

- No RAF loop. Pure event-driven class changes; AI uses one `setTimeout`. The computer's "thinking" is only `#gameStatus` text swap. Nothing held/opaque.

## Findings

1. MEDIUM - start-screen copy says "Fill the board to win" while `showEndOverlay()` also handles a Draw (possible on score tie). Minor rules wording; no code fix required.
2. LOW - `onLineClick({currentTarget: el})` synthesizes an event object for keyboard path - works, but a direct `claim(el)` refactor would be clearer. Optional.
3. LOW - `updateStatus()` is skipped when `gameOver` inside `claim()` via early `return` after `checkCompletedBoxes` - status keeps last text behind the overlay; harmless.
4. No fix needed for input lock: `aiTimer` guard prevents double claims; verified in source.

## Recommended playable view

Keep board, `#gameStatus`, score cards, `#boxesLeft`, `#newRoundBtn`, `#menuBtn`, end overlay buttons. Move the `Controls` bullet list from `#startScreen` into a one-time acknowledged help (reopenable). No recurring popups exist.

## Validation

CODE-REVIEW ONLY. Smallest needed check: play Vs computer to fill all 16 boxes, confirm overlay text and `#againBtn` restart, then `N` key new round and arrow-key cursor claim.
