# 2048 — play-flow audit (batch 1)

- Identity: unregistered maintenance project, no catalog id. `Games/2048/`,
  entry `Games/2048/index.html` (blob `066181c3ede8fb8cc8664d492ec5d0c22f0581f4`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 13 files / 54,122 B.
  Provenance comment in entry: Gabriele Cirulli, MIT (see `LICENSE.txt`, `b0dbfa4d`).
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully: DOM is `.scores-container`
  (`.score-container`, `.best-container`), `.game-container > .game-message`
  (`.keep-playing-button`, `.retry-button`), `.grid-container`, `.tile-container`,
  `#save-status`, `.restart-button`, `.game-intro`, `.game-explanation`.
- `js/game_manager.js` (blob `7c83ec0f95c951a1179abb0cb25f56a47f8b6c08`),
  function inventory inspected: `GameManager.setup`, `addStartTiles`,
  `addRandomTile`, `move(direction)`, `getVector`, `buildTraversals`,
  `findFarthestPosition`, `movesAvailable`, `tileMatchesAvailable`, `actuate`,
  `restart`, `keepPlaying`, `isGameTerminated`.
- `js/application.js` (blob `2c1108e757a0e49af7b9ee48dcc45bd8e61cb806`), read fully:
  one `window.requestAnimationFrame` callback constructs
  `new GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager)`.
- `js/keyboard_input_manager.js` (blob `ca01b3ce8995a5a20ac50219712d1ef95297ed99`),
  partial (grep of bindings): `document.addEventListener("keydown", ...)` line 53,
  `bindButtonPress(".retry-button" | ".restart-button" | ".keep-playing-button")`
  lines 72-74, each binds `click` + `touchend` (line 140-143), touch events
  (`touchstart` etc. line 10).
- Held, not inspected: `js/grid.js`, `js/tile.js`, `js/html_actuator.js`,
  `js/local_storage_manager.js` (blob `e37f68ae...`), `style/main.css`,
  and the full body of `keyboard_input_manager.js`.

## Flow (from source)

- Boot: `application.js` rAF → `GameManager` `setup()` places start tiles → `actuate()`.
- Input → core loop: keydown directions feed `GameManager.move(direction)`; merges via
  `buildTraversals`/`findFarthestPosition`; `movesAvailable()`/`tileMatchesAvailable()`
  decide termination; `isGameTerminated()` gates the message overlay.
- Score: `.score-container` / `.best-container` updated in `actuate()` (actuator body held).
- Win/lose: `.game-message` overlay carries `.keep-playing-button` and `.retry-button`;
  exact trigger text lives in `html_actuator.js` (held).
- Restart: `.restart-button` ("New Game") and `.retry-button` via `bindButtonPress`.
- Entry copy claims "Press R or New Game to restart with confirmation"; the R-key
  binding was not confirmed in inspected ranges — held, needs verification.

## UI bloat: MILD

- Persistent non-HUD copy on the play page: `.game-intro`
  ("Join the numbers and get to the 2048 tile!") and the `.game-explanation`
  "How to play" paragraph plus attribution line, always rendered under the board.
  Not popups, just persistent description text.
- Genuine HUD/menus: `.scores-container`, `.game-container`, `.game-message`
  overlay, `#save-status` (`role="status"`), `.grid-container`/`.tile-container`.

## Popups / modals

- Only `.game-message` (win/lose, `.retry-button` / `.keep-playing-button`).
  One-time per terminated game, not recurring. No ad/info modals in entry.

## Animation / simulation

- Model-driven DOM actuation (tiles appended/transitioned by `html_actuator.js`,
  held). `animframe_polyfill.js` provides rAF. No renderer-only RAF found in
  inspected files beyond `application.js` boot.

## Findings

- LOW — persistent how-to/attribution paragraphs duplicate the same guidance on
  every visit; no fix needed for playability. Root: `index.html`
  `.above-game`, `.game-explanation`.
- Held — R-key restart-with-confirmation claim in entry copy unverified
  (`keyboard_input_manager.js` body not fully read).

## Recommended playable view

Keep `.heading` scores, board, `.restart-button`, `.game-message` actions,
`#save-status`. Fold `.game-intro` + `.game-explanation` into a one-time
acknowledged help panel with optional reopen. No recurring popups present.
