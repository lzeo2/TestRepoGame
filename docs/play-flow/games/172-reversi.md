# Play flow: Reversi (id 172, registered)

- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Directory `Games/Reversi`, 1 file, 26862 bytes. Inventory doc: `docs/maintenance/games/172-reversi.md` (not owned here).
- Status: CODE-REVIEW ONLY, no browser run by this worker.

## Source inspected

- `Games/Reversi/index.html` blob `3ea6905bb008100f5d278926adca7317e210190f`: header comment + CSS (lines 1-213) and the merged script (lines 214-850) read; the whole file was covered in two reads with line-addressed ranges; no section held back.
- Sections: `js/ai.js` merged verbatim (`createRoot`, `createNode`, `selection`, `expansion`, `simulation`, `backprapogation`, `mcts`), UI (`hideHints`, `showHints`, `squareCoords`, `setBoardSize`, `startingSetup`, `flipDisks`, `endGame`, `clearBoard`, `enableTouch`, `disableTouch`, `setStatus`, `updateCounts`), rules (`initBoard`, `validMove`, `randomMove`, `availableMoves`, `makeMove`, `boardFull`, `gameOver`, `winner`), turn flow (`aiTurn`, `humanTurn`, `newGame`, `init`, `kbMark`).
- Selectors: `.disk`, `#countYou`, `#countThem`, `#status`, `#restartBtn`, `#resultOverlay`, `#resultTitle`, `#result-stats`, `#againBtn`, `.kb-cursor`.
- Provenance comment: github.com/alex-berson/reversi, MIT, commit c9c1cdc.

## Flow (from source)

1. Boot: `window load -> setBoardSize()`; `init()` builds the board and `startingSetup()` places the four central discs; game auto-starts (start overlay removed upstream per header comment).
2. Start/setup: `newGame()`/`init()` clear cells, `human = black`, `player = human`.
3. Input: `square.addEventListener('touchstart'|'mousedown', humanTurn)`; keyboard `window keydown` moves the cursor and Enter places via `kbMark()`.
4. Core loop: `humanTurn` validates with `availableMoves`/`validMove`, calls `makeMove`, `flipDisks` (flip animation with `animationend` listeners), then `togglePlayer` -> `aiTurn`, which runs `mcts(board, color, startTime, 1.5s budget)` inside `requestAnimationFrame`-scheduled steps (double-rAF used to yield; this is computation scheduling, not renderer animation of the model). Pass rules: `availableMoves` empty -> `setStatus` notice and turn passes; `gameOver` when neither side can move.
5. Score: live disc counts `#countYou` / `#countThem` via `updateCounts()`, `#status` text for turn/pass.
6. Win/lose: `winner(board)` -> `endGame()` sets `#resultTitle`, `#result-stats`, unhides `#resultOverlay` (win / loss / draw).
7. Restart: `#restartBtn` and `#againBtn` -> `newGame()` (rematch keeps human as black, per header).

## UI bloat: NONE

Persistent: `header.page-head` (title + rules paragraph), `#hud` (counts, status, Restart), board, optional `#resultOverlay`. No gradients, no decorative cards, no repeated popups. Board cells are 44px+ per header notes.

## Popups/modals

Single `#resultOverlay`, triggered only by `endGame()`, dismissed via `#againBtn`. No ad/info/nag popups in source.

## Animation vs simulation

Two distinct mechanisms, do not conflate: (a) CSS flip animation on discs (`animationend`/`transitionend` handlers in `flipDisks`/`clearBoard`) is presentation; (b) the rules engine and MCTS (`mcts` with 1.5 s budget) are the simulation, scheduled from `aiTurn` via nested `requestAnimationFrame` so the UI stays responsive. Human input is disabled (`humanInputOn = false`, `disableTouch()`) while the AI thinks.

## Findings

1. LOW - MCTS budget is wall-clock (`Date.now()` based, 1.5 s) so AI turn latency varies by device; acceptable, no fix.
2. LOW - `backprapogation` is misspelled but consistent; renaming is churn, no fix.
3. INFO - no defects found in pass/win detection during read; `gameOver`/`winner` handle the double-pass end correctly.

No high-severity findings. No code fix mandated.

## Recommended playable view

Keep board, `#hud`, `#resultOverlay`, `#restartBtn`, click/touch/keyboard input. Fold `header.page-head` rules text into a one-time acknowledged help with optional reopen.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: load, confirm 4 starting discs, place a legal disc and see flips, confirm pass notice when the human has no move, finish a game to `#resultOverlay`, press `#againBtn` and confirm reset.
