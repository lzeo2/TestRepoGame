# Play flow: Snake (id 9, registered)

- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Directory `Games/Snake`, 8 files (incl. 2 screenshots + README), 345937 bytes. Inventory doc: `docs/maintenance/games/009-snake.md` (not owned here).
- Status: CODE-REVIEW ONLY, no browser run by this worker.

## Source inspected

- `Games/Snake/index.html` blob `9f247f70ad8c8ecde1fc5debdb162afd9fdad9d1` read completely.
- `Games/Snake/game.js` blob `6a156e54366b56d58140110d90f574404a7b4305` read completely (single `class SnakeGame`, ~430 lines).
- `style.css` skimmed for layout only; `LICENSE`, `README.md` present (localisation/readme, not logic).
- Functions read: `constructor`, `initializeGame`, `setupEventListeners`, `startGame`, `togglePause`, `update`, `checkCollision`, `generateFood`, `drawGame/drawGrid/drawSnake/drawFood/drawPauseScreen`, `gameOver`, `restartGame`, `updateScoreDisplay`, plus the `roundRect` polyfill.
- Selectors: `#gameCanvas`, `.control-btn[data-direction]`, `#start-btn`, `#pause-btn`, `#restart-btn`, `#game-over`, `#final-score`, `#current-score`, `#high-score`.

## Flow (from source)

1. Boot: `DOMContentLoaded -> new SnakeGame()`. Board draws idle (`drawGame()`); nothing moves until start. No start overlay; the how-to is the static `.instructions` block.
2. Start: `#start-btn` -> `startGame()` sets `gameRunning`, defaults direction to right, and starts `setInterval(update+drawGame, 150)` (fixed 150 ms tick, not RAF). Button becomes `Playing...` and disabled.
3. Input: `document keydown` (arrows + WASD, with reversal guards `if (this.dy !== 1)` etc.) and `.control-btn` click handlers for touch (4 arrow buttons). Both early-return unless `gameRunning && !gamePaused`.
4. Core loop: `update()` advances head by `dx/dy`, `checkCollision()` (wall: `x<0||x>=tileCount` etc.; self: linear scan), `snake.unshift(head)`, eat -> `score += 10` + `generateFood()` (rejection loop avoids spawning on the snake), else `snake.pop()`.
5. Score: `#current-score`, high score in `localStorage['snakeHighScore']` written in `gameOver()`.
6. Lose: `gameOver()` clears the interval, writes best, unhides `#game-over` (final score + `#restart-btn`). No win state (endless score game) - correct for genre.
7. Restart: `#restart-btn` -> `restartGame()` resets snake/score/food, hides overlay, re-enables `#start-btn`. Pause: `#pause-btn` toggles `togglePause()` (clears/recreates the interval, draws `PAUSED`).

## UI bloat: MILD

- Persistent: `.game-header h1 "Snake Game"` + scoreboard (HUD, keep), `#gameCanvas`, `.instructions` ("How to Play" + 3 lines - recurring description, should be one-time help), `.mobile-controls` d-pad (essential touch, sizes come from `style.css`), `#start-btn`/`#pause-btn` (essential), `#game-over` overlay (genuine result).
- No gradients, no popups, no modals beyond `#game-over`.

## Popups/modals

Only `#game-over` (shown once per death, hidden on restart). No ad/info popups.

## Animation vs simulation

Simulation is a discrete 150 ms `setInterval` tick mutating `snake[]`/`food`/`score`; canvas redraw happens in the same tick. `drawPauseScreen` is a static overlay. Interval is cleared on pause/gameOver/restart (no runaway loop found; `startGame` guards `if (this.gameRunning) return`).

## Findings

1. MEDIUM - `restartGame()` calls `generateFood()` but leaves `gameRunning = false` and the interval stopped: after "Play Again" the player must press `#start-btn` again. That is a valid two-step restart, but the overlay text does not say so; verify in a browser and, if confusing, restart the loop from `restartGame()` (root: `restartGame`, caller `#restart-btn`).
2. LOW - `keydown` reversal guard prevents instant 180° turns; deliberate. No fix.
3. LOW - `drawSnake` fills `fillRect` and then `roundRect` + `fill` per segment (double draw). Cosmetic only, no fix.

No high-severity findings.

## Recommended playable view

Keep `#gameCanvas`, scoreboard, `.mobile-controls`, `#start-btn`, `#pause-btn`, `#game-over`. Move `.instructions` how-to into a one-time acknowledged help (re-openable), leaving the header as title + score only.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: start, steer with keyboard and with the d-pad buttons, eat one food (score +10), hit a wall (`#game-over`), press `#restart-btn` then `#start-btn`, confirm high score persists in `localStorage['snakeHighScore']`.
