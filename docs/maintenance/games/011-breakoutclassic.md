# Breakout maintenance

<!-- maintenance-game: Games/BreakoutClassic -->

## Identity and status

Registered id 11, title Breakout, category `classic`, entry `Games/BreakoutClassic/index.html`. Seven tracked files, 40,593 bytes at `8c8a055`. Runtime is local HTML, CSS and JavaScript. No new gameplay/native certification is claimed.

## Implementation map

Source review coverage: all entry HTML, `script.js`, `style.css` and README read. No minified engine. `#game` becomes a 400-by-500 canvas. `LVL1`, `LVL2`, `LVL3` are character grids; `createGameGrid()` expands non-`X` cells into `bricks`. `loop()` updates paddle/ball, calls `checkBallPaddleCollision()` and `checkBallBrickCollision()`, then draws walls, ball, bricks and paddle. `collides()` is AABB collision. UI anchors are `#score`, `#level`, `#game-over`, `#winner`, `#powerupText`. `resetGame()` is shared by keyboard restart, numbered level selection and touch level cycling.

## Gameplay and controls

Space launches a stationary ball and restarts after failure/win. Held left/right arrows move the paddle; Enter toggles the level-selection pause, and 1/2/3 select a grid while paused. Clearing the current grid wins; dropping below the canvas loses. Each brick adds one point; every twenty points speeds the ball by 1.3. Random powerups widen the paddle, halve ball speed or enlarge the ball. Their durations count brick collisions, not elapsed seconds. Touch the paddle to start/restart, drag to move, tap `LEVEL` to cycle. `handleTilt()` assigns velocity from device gamma; permission handling is absent. No sound path was found.

## State and persistence

Global `ball`, `paddle`, `bricks`, `score`, `currentLevel`, `isGameOver`, `isPaused` and powerup flags own the match. No storage/save key. `loop()` schedules rAF only while active; paused/game-over branches stop scheduling. However there is no single frame handle, and touch start calls `loop()` while the initial idle loop is already running. `displayPowerupText()` creates an untracked five-second timeout. `gameStarted` is touch-only and is not reset by `resetGame()`.

## Dependencies and provenance

No runtime third-party load in current HTML/CSS. Fonts named in CSS are fallback names, not fetched dependencies. README identifies `https://github.com/danieldotwav/Breakout-HTML` and its GitHub Pages demo. No LICENSE was found in the seven-file tree; a README describing an homage is not redistribution permission. Upstream revision and applicable code/art terms remain unresolved. Historical wiki external-font status is stale relative to the current entry.

## Audit findings

- HIGH, `script.js: loop()` / touch-start `loop()`: first paddle tap starts a second rAF chain. Repeated `resetGame()` from live level cycling also schedules another chain. Native repro recommended: compare movement before/after several level taps. Root fix: one owned rAF id, cancel it before reset, and never directly start a second loop.
- MEDIUM, `resetPaddle()`: `width: PADDLE_WIDTH`, `height: PADDLE_HEIGHT`, `dx: 0` are labels, not property assignments. Paddle velocity survives reset. Assign `paddle.dx` and dimensions explicitly.
- MEDIUM, `resetGame()`: enlarged ball size is not restored; `setBallSize(ORIGINAL_BALL_SIZE)` is missing. Repro: restart while BIG BALL is active.
- MEDIUM, `checkForRandomPowerupChance()`: cooldown decrements below zero if the random roll misses exactly zero, preventing future powerups. Use a nonnegative cooldown and `<= 0` readiness.
- MEDIUM, HTML and `style.css: p`: controls are not explained in-page; result text animates forever without reduced-motion handling. Add concise factual instructions and a motion preference override, not another launch screen.

## Safe iteration

Fix scheduling once at `loop/resetGame`, covering all callers. Preserve the three grids and intentional powerup effects. Convert `#level` to a real keyboard-operable control only with approved wrapper work. Do not edit Visual Studio files or delete them without tracked-consumer evidence. Save migration is unnecessary because none exists.

## Verification

Actually run: Git-blob `script.js` through `node --check`, exit 0. No native test/screenshots. Historical `playtest_0.md` recorded Space launch, score change, failure and restart; it did not test duplicate loops or powerup reset. Recommended source command: `git show HEAD:Games/BreakoutClassic/script.js | node --check`. Main must lease a narrow tree for native keyboard/touch, repeated resets, tilt-unavailable behavior and mobile screenshots. Full-catalog loading is a separate Main gate.

## Future outlook

Week-one work: rights evidence and single-loop ownership; leave one reset regression. Next repair powerup cooldown/reset and expose controls/focus. Later profile scaled touch coordinates and tilt permissions on actual hardware. Defer extra levels/multiball until the existing lifecycle works reliably.
