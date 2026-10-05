# Battleship — play-flow audit (batch 1)

- Identity: catalog id 198, registered. `Games/Battleship/`, entry
  `Games/Battleship/index.html` (blob `3966c4b100ff86fcecc30d3bf703de1df5ae70b6`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 6 files / 60,068 B.
  `CREDITS.md` (71f49123) and `LICENSE` (e62ec04c) present, not read.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully. DOM: `h1`, `p.intro` (controls/rules
  paragraph), `#message-log`, `.game-container` with `#player-board`,
  `#computer-board` (`.clickable-board`), `#start-btn`
  (`onclick="startGame()"`, label "Restart Game"), `.legend`, static
  `section.howto` (two rule paragraphs).
- `logic.js` (blob `062212c976f24ba0af01c621632d57a30fe95ede`, 330 lines),
  partial (head constants): `BOARD_SIZE = 10`, `SHIPS_CONFIG`, `STATUS`
  (EMPTY/SHIP/MISS/HIT), `PARTY` (PLAYER/COMPUTER). Ship-placement/AI bodies
  not read line-by-line — held.
- `main.js` (blob `c3e30214a8fec1f89b0c1f198ec3be3f43d364cc`, 145 lines),
  function inventory inspected: `game = new BattleshipLogic()`,
  `isPlayerTurn`, `gameActive`, `aim = {r,c}` keyboard cursor,
  `startGame()` (line 29), `renderBoards()`/`renderBoard(container, boardData,
  isPlayer)` (39/44), `handlePlayerClick(r,c)` (70), `computerTurn()` (95);
  element refs `player-board`, `computer-board`, `message-log`, `start-btn`.
  Bodies of click/turn functions not read verbatim — held at line level.

## Flow (from source)

- Boot: page renders empty boards + intro; game requires `startGame()`
  (button label says "Restart Game" — see findings).
- Input: click/tap cells on `#computer-board`; entry copy documents arrow-key
  aim + Enter to fire, matching the `aim` cursor state in `main.js` (exact
  keydown listener placement held).
- Core loop: `handlePlayerClick` → logic validation → `computerTurn()` when
  turn passes; `renderBoards()` redraws both grids; `#message-log` gives
  feedback.
- Score/progression: hits/misses recorded via `STATUS`; win = sink all 10
  enemy ships per `section.howto` copy (logic body held).
- Win/lose: determined inside `BattleshipLogic` (held) surfaced through
  `gameActive`/message log — exact end-call not read.
- Restart: `#start-btn` → `startGame()`.

## UI bloat: MILD

- Persistent text blocks: `p.intro` (controls summary) and `section.howto`
  (full rules) always rendered below the boards. Genuine documentation, not
  popups; duplicated content between the two.
- Genuine HUD: `#message-log`, boards, `.legend`, restart button.
- No modals, ads, or decorative cards.

## Popups / modals

- None. Feedback is text in `#message-log`.

## Animation / simulation

- Synchronous DOM re-render via `renderBoards()`; no RAF/canvas. Any
  computer-turn delay timers are inside held function bodies.

## Findings

- LOW — button labeled "Restart Game" is the only start path (entry copy also
  says "Press Restart Game"), i.e. first launch reads as a restart. Root:
  `index.html` `#start-btn`. Fix if touched: label "New game"/"Start" until a
  game exists.
- LOW — `p.intro` and `section.howto` duplicate rules; consolidate into
  one-time help.
- Held — `logic.js` placement/AI details and `main.js` function bodies not
  read line-by-line; smallest needed check: read both files fully (475 lines
  total).

## Recommended playable view

Keep boards, `#message-log`, legend, restart. Move `p.intro` + `howto` prose
into one-time acknowledged help with reopen. No recurring popups exist.
