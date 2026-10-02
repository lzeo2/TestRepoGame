# Snake maintenance

<!-- maintenance-game: Games/Snake -->

## Identity and status

Registered id 9, category `classic`, entry `Games/Snake/index.html`, not featured. Reviewed at source baseline `8c8a055`. Eight tracked files occupy 345,937 bytes. The runtime references only local `style.css` and `game.js`; source closure is not a current browser/offline certification.

## Implementation map

Source review coverage: read all of `index.html`, `game.js` and `style.css`, plus `README.en.md` and `LICENSE`. There is no compiled gameplay engine. `DOMContentLoaded` constructs `SnakeGame`; its constructor resolves `#gameCanvas`, creates the 2D context, uses 20-pixel cells on a 400-pixel canvas and sets `tileCount` to 20. `setupEventListeners()` binds keyboard, `.control-btn[data-direction]`, `#start-btn`, `#pause-btn` and `#restart-btn`. `update()` computes the next head, calls `checkCollision()`, grows on food and delegates spawning to `generateFood()`. `drawGame()` layers grid, snake, food and pause text. A `roundRect` prototype fallback supports older canvas implementations.

## Gameplay and controls

Start Game starts rightward movement at one step per 150 ms. Arrows or WASD change direction; mobile buttons call duplicated direction logic. Food awards ten points and retains the tail segment. Walls and body contact call `gameOver()`. Pause/Resume toggles the interval; Space is not implemented despite the README claiming it pauses. Play Again calls `restartGame()` but does not automatically start: the player must press Start Game again. No completion state exists for filling the board. Audio is absent from inspected runtime code.

## State and persistence

The instance owns `snake`, `dx`, `dy`, `food`, `score`, `gameRunning`, `gamePaused` and `gameLoop`. `snakeHighScore` is the sole storage key; it is read unguarded during construction and written unguarded when a new record ends. Pause, game over and restart each clear the active interval. Restart preserves high score but resets body, score and button labels. No saved active run or visibility-pause handler exists.

## Dependencies and provenance

Native Canvas, DOM, timers and localStorage only. `LICENSE` is MIT, copyright QueCue, 2025. README links `https://quecue.github.io/snake-game`; it does not pin an upstream revision. The README's gradient and Space-pause claims are not descriptions of current implementation. Keep the notice; do not infer asset terms from screenshots alone.

## Audit findings

- HIGH, `game.js: generateFood()`: when all 400 cells are occupied the rejection loop never terminates. Static repro: populate every cell and call the method. Root fix: detect board completion before attempting food selection, leaving a restart path.
- MEDIUM, `setupEventListeners()`: several turns can occur between ticks, permitting a net reversal (right, then up, then left before `update`). Queue at most one turn per tick in a shared keyboard/touch direction setter.
- MEDIUM, constructor and `gameOver()`: unavailable storage can prevent boot or prevent the result overlay after a record. Guard read/write and validate a finite nonnegative score.
- MEDIUM, keyboard handler: arrows do not prevent default scrolling. Scope cancellation to handled keys while running. `checkCollision()` also counts the departing tail as occupied even on a non-growing tick; decide and regression-test the intended rule.

These are source findings, not newly observed browser failures.

## Safe iteration

Patch the class, not a new engine. Consolidate both direction callers only when fixing their shared tick rule. Preserve `snakeHighScore` or migrate it explicitly. CSS changes belong to `#gameCanvas`, `.control-btn` and button focus states; retain the logical 20-by-20 board when scaling its display. Revert only the individual approved change if regression checks fail.

## Verification

Actually run: Git-blob `game.js` piped to `node --check`, exit 0. No native browser run or screenshots in this task. Historical `docs/audit_batches/playtest_0.md` recorded start, wall death and restart, not full-board completion. Recommended: export only the assigned text blobs with `git show HEAD:Games/Snake/game.js`, inspect using the read tool, and have Main lease a narrow asset tree for native tests. Test rapid turns, pause/resume, blocked storage, record death, mobile width and board completion. The serial full-catalog smoke remains Main's separate release gate.

## Future outlook

First fix food termination and storage failure handling with a tiny runnable regression. Next validate keyboard scrolling, focus and touch targets on actual mobile screenshots. Later consider saved runs only if requested; do not add networking, a build step or a new dependency to this small game.
