# Play flow: Space Invaders (id 219, registered)

- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. `Games/SpaceInvaders`, 15 files, 577745 bytes. Doc: `docs/maintenance/games/219-spaceinvaders.md` (not owned). CODE-REVIEW ONLY.

## Source inspected

- `index.html` blob `f0f04536b0ebf03d6f2a68a95b70a403371c9faf` read completely (canvas `#gameview`, `#background` img, jQuery 1.8.2 vendored, `Const/SpaceShip/CDetection/Game/Main` scripts).
- `javascripts/Game.js` blob `b64e4e030fa6656803f334ca9c8c0a7b4a19a1c1` read completely: `SI.Game`, `start`, `initializeCanvas`, `attachKeyboardEvents`, `initializeGame`, `checkEndGame`, `createEnemyShips`, `lockRocketLauncher`/`freeRocketLauncher`, `deleteExplodedRockets`, `deleteExplodedEnemyShips`, `deleteDoneExplosions`, `checkPlayerStatus`, `launchEnemyRocket`, `launchPlayerRocket`, `onKeyDown`/`onKeyUp`, `moveAllElements`, `movePlayerShip`, `moveEnemyShips`, `moveRockets`, `drawAllElements` and the draw helpers.
- `javascripts/Main.js` blob (75 bytes) read: `$(window).load(function(){ new SI.Game().start(); })`.
- `Const.js`, `SpaceShip.js`, `CDetection.js` present; `CREDITS.md`/`LICENSE` read (upstream ozelentok/SpaceInvaders, MIT, commit 02ccd86).

## Flow (from source)

1. Boot: `Main.js` constructs `SI.Game` and `start()` -> `initializeCanvas()` (sizes `#gameview`, shows `#background`), `attachKeyboardEvents()`, `initializeGame()`, `drawAllElements()`.
2. Start/setup: `initializeGame()` builds `playerShip`, enemy grid (`createEnemyShips(rows, cols)`), `SI.CDetection`, resets `points`, `lives = 3`, `enemyPhase`, `frames`, then starts `this.clock = setInterval(..., SI.Sizes.MSPF)`.
3. Input: `keydown/keyup` arrows (`SI.Keys.Left/Right` move flags; `Up` fires `launchPlayerRocket()`); touch `touchmove` moves the ship to `touch.pageX`, `touchstart` fires.
4. Core loop (fixed `setInterval`, not RAF): `moveAllElements` -> `deleteExplodedRockets` -> `deleteExplodedEnemyShips` (hit detection via `detector.detectHitEnemies`, `points += pointModifer`, emptied rows removed and `enemySpeed += enemyStepHort`) -> `deleteDoneExplosions` -> `checkPlayerStatus` (`lives -= 1` on hit) -> `drawAllElements` (sprite phase every 5 frames) -> `launchEnemyRocket` (every `turnUntilFire` ticks, random ship) -> `freeRocketLauncher` -> `checkEndGame`.
5. Score: `this.points`, `lives` drawn by `drawStatus()`.
6. Win/lose: `checkEndGame()` - no enemies left -> `clearInterval(clock)` + `newGamePrompt('You Win!')`; `lives == 0` or enemies reach `bottomMargin` -> `newGamePrompt('You Lost!')`.
7. Restart: `newGamePrompt` (defined in `Game.js`, re-runs the prompt -> `initializeGame()` path); treat exact dialog markup as read-continuation - see Findings.

## UI bloat: NONE

Persistent: canvas `#gameview`, background image, in-canvas status line drawn by `drawStatus()`. The `<title>` is "Shooter Game" (catalog title differs; cosmetic). No header paragraphs, no cards, no gradients in the wrapper.

## Popups/modals

`newGamePrompt(...)` is the only modal path (win/lose, once per round, triggers on `checkEndGame`). It is a genuine result state, not an ad/info nag.

## Animation vs simulation

Simulation = position/velocity state mutated in the `setInterval` tick (`movePlayerShip`, `moveEnemyShips`, `moveRockets`); rendering = `drawAllElements`. The 5-frame `enemyPhase` cycle is sprite animation inside the same tick. Interval is cleared in `checkEndGame` before prompting (no runaway loop).

## Findings

1. LOW - `SI.Game` constructor sets `this.lives = 2` but `initializeGame()` sets `3`; the effective value is 3. Dead assignment; remove at constructor if touching the file.
2. LOW - `deleteDoneExplosions` uses loop variable `i` after the loop (works but fragile). No functional fix.
3. INFO - title "Shooter Game" vs catalog "Space Invaders": docs-only mismatch.

No high-severity findings.

## Recommended playable view

Keep canvas, background, status drawing, win/lose prompt, keyboard + touch input. Nothing to remove; there is no decorative wrapper.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: load, move with arrows, fire with Up/tap, destroy one enemy (score rises), lose a life, reach one end state, confirm restart path.
