# Play flow: Snake Hacked (id 95, registered)

- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Directory `Games/SnakeHacked`, 8 files, 346395 bytes. Inventory doc: `docs/maintenance/games/095-snakehacked.md` (not owned here).
- Status: CODE-REVIEW ONLY, no browser run by this worker.

## Source inspected

- `Games/SnakeHacked/index.html` blob `090c42b6d124b9ccd4ebbec7deca653a71b61f58` (read; same as Snake plus a badge).
- `Games/SnakeHacked/game.js` blob `3eea5ca890d207057e6d11ed5ea48e644a56ab1a` read completely, **and** read as a structured diff against baseline `Games/Snake/game.js` blob `6a156e54366b56d58140110d90f574404a7b4305`. Only these deltas exist:
  - `this.score = 999999` in `constructor` and in `restartGame()`.
  - `update()`: head coordinates wrap (`hx<0 -> tileCount-1`, `hx>=tileCount -> 0`, same for y) instead of dying on walls; collision call changed to `if (false) { this.gameOver(); ... }`.
  - eat reward `this.score += 1000` instead of 10.
  - `checkCollision()` body reduced to `return false` (self-collision removed).
  - index.html: `<title>Snake Hacked</title>` plus fixed `.hacked-badge` div "HACKED - God Mode & Infinite Score".
- Structure/functions otherwise identical to `009-snake.md` (same `SnakeGame` class, same selectors).

## Flow (from source)

1. Boot: `DOMContentLoaded -> new SnakeGame()`; idle board, `#start-btn` required.
2. Start: `startGame()` -> `setInterval(update+drawGame, 150)`.
3. Input: arrows/WASD `keydown` with reversal guards; `.control-btn` click d-pad for touch.
4. Core loop: same 150 ms tick; head wraps around edges; **no death path can execute** because `checkCollision()` returns `false` and the `update()` call site is dead-coded (`if (false)`).
5. Score: starts at 999999, +1000 per food; `localStorage['snakeHighScore']` still written in `gameOver()` - which is unreachable during play, so the stored high score only changes if `gameOver()` were somehow called.
6. Win/lose: **no lose state exists by design (god mode); no win state**. The `#game-over` overlay ships in the DOM but has no reachable trigger from gameplay.
7. Restart: `#restart-btn` -> `restartGame()` resets score back to 999999 and hides the overlay; `#start-btn` starts a new run.

## UI bloat: MILD

- Persistent: `.hacked-badge` (fixed top-right, decorative label of the mod - removable from a lean view), `.game-header h1` + scoreboard, canvas, `.instructions` (recurring how-to), d-pad (essential touch), `#start-btn`/`#pause-btn`, dead-but-shipped `#game-over`.
- No gradients, no popups, no modals.

## Popups/modals

None reachable. `#game-over` never shows during play because of the god-mode patch.

## Animation vs simulation

Identical discrete 150 ms `setInterval` simulation as Snake; canvas redrawn per tick. Interval lifecycle (pause/gameover/restart) unchanged from Snake.

## Findings

1. HIGH (product/expectation, not a crash) - the shipped `#game-over` UI and "Play Again" flow are unreachable: `checkCollision()` returns `false` and the `update()` guard is `if (false)`. Root: `Games/SnakeHacked/game.js update()` + `checkCollision()`. Fix, if wanted, belongs there (restore a real predicate), not by hiding the overlay. This is intentional mod behaviour, so the "fix" is a scope decision for the operator, not a bug fix.
2. MEDIUM - `restartGame()` resets score to 999999 while the constructor comment says "max score"; the `#high-score` display therefore reads 999999 immediately. Cosmetic inconsistency of the mod; no code fix required.
3. LOW - `gameOver()`/`localStorage['snakeHighScore']` are effectively dead code paths. Leave in place (evidence rule); do not delete.

## Recommended playable view

Keep canvas, scoreboard, d-pad, start/pause. Drop `.hacked-badge` and the `.instructions` block from the persistent view (how-to into one-time acknowledged help). `#game-over` stays in markup only if a real end state is restored.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: start, steer through a wall and confirm wrap-around, eat food (+1000), confirm no death path fires and `#game-over` stays hidden, restart and confirm score returns to 999999.
