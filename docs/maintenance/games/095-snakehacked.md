<!-- maintenance-game: Games/SnakeHacked -->
# Snake Hacked maintenance

## Identity and status

Registered id **95**, category `classic`, entry [index.html](../../../Games/SnakeHacked/index.html). Baseline `8c8a055`: 8 files, 346,395 bytes; entry blob `090c42b6d124b9ccd4ebbec7deca653a71b61f58`. Existing readable canvas variant; invulnerability/wrapping are intentional, not a security exploit.

## Implementation map

`DOMContentLoaded` creates SnakeGame from game.js. Constructor finds `#gameCanvas`, sets gridSize 20/tileCount 20 for a 400-square canvas, initializes snake/food/direction/score and binds controls. `startGame` owns a 150 ms interval; `update` moves/wraps the head, consumes food and grows; drawing methods render grid/snake/food. `generateFood`, `togglePause`, `gameOver`, `restartGame` and `updateScoreDisplay` form maintenance boundaries. A roundRect polyfill supports older canvas implementations.

Source review coverage: complete entry, game.js, style.css and English README read. Chinese README and screenshot pixels were not reviewed; there is no compiled gameplay engine. DOM includes `#current-score`, `#high-score`, `#start-btn`, `#pause-btn`, hidden `#game-over/#final-score/#restart-btn` and `.control-btn[data-direction]`.

## Gameplay and controls

Start button begins rightward movement. WASD (either case), arrows and mobile direction buttons steer with current-axis reversal checks; controls are ignored while stopped/paused. Pause clears interval and Resume creates one. Walls wrap, collision check is deliberately disabled and score starts 999999 with +1000 per food. HTML's avoid-walls/self instruction is stale. No Space pause binding exists despite README saying so. Native loss never occurs: `gameOver` call sits in `if(false)`. Play Again is inside the permanently hidden game-over overlay, so users have no reachable reset during ordinary god-mode play.

## State and persistence

Instance owns snake segments, food, dx/dy, gameRunning/gamePaused and gameLoop. Restart clears interval, resets score/snake/direction, generates food, hides overlay and re-enables Start; it does not auto-start. Constructor reads `snakeHighScore` directly from localStorage; only unreachable `gameOver()` writes it. This origin-wide key may be shared with another Snake variant. A displayed large current score is therefore not proof high-score persistence works. Food placement repeatedly samples until no segment occupies the tile, with no full-board termination.

## Dependencies and provenance

Runtime is vanilla canvas/DOM/localStorage with no entry CDN. README links `https://quecue.github.io/snake-game` and claims MIT. Inventory has no standalone LICENSE or pinned upstream revision, so this is a supplied license claim needing verification, not a fully verified grant or asset provenance. Keep README and screenshot evidence. Its base rules/10-point rewards differ from current hacked code and must not drive controls documentation.

## Audit findings

- **HIGH**, `game.js`, `generateFood`: rejection loop cannot terminate if occupied tiles cover the board. God mode can continue growing instead of losing. Reproduce in an isolated test by populating all 400 unique cells and calling generateFood; root fix computes free cells and handles none explicitly without removing invulnerability.
- **MEDIUM**, entry `#restart-btn` and `update`'s disabled loss branch: reset exists only in unreachable overlay. Expose existing restart action outside that overlay; preserve god mode rather than fabricating death.
- **MEDIUM**, constructor/gameOver save: direct localStorage access can throw and high scores never commit during ordinary play. Guard storage reads/writes and commit improvements at food/explicit reset as designed, with a separate variant key/migration if approved.
- **MEDIUM**, key handler: no preventDefault or blur/input-queue discipline. Arrows can scroll and multiple turns within one tick can bypass intended reversal restriction. Restrict consumed keys to active game and track the last committed direction if that rule is intended.
- **LOW**, README/HTML instructions: unsupported Space pause and collision warnings should be corrected to actual variant behavior.

## Safe iteration

Reuse SnakeGame methods; do not replace with a new game. Keep wrap/+1000/god-mode identity. Add a visible reset button using existing restartGame, labeled mobile directions and explicit focus. Do not clear all storage; preserve/export current high-score data before namespace changes. Verify full-board behavior with one small runnable assertion when authorized to patch logic.

## Verification

Actually run: game.js Git blob `node --check` **PASS**. Native **0**, screenshots **0**. Recommended: Start, eat food, wrap each wall, self-overlap, pause/resume repeatedly, expose/reuse reset after patch and verify one interval. Exercise full-board food generation, denied/corrupt storage and keyboard scrolling. Check 320 px mobile canvas/button fit and focus. [Playtest r6](../../audit_batches/playtest_r6.md) previously observed play/pause but restart was untested/unreachable. Main owns full gate.

## Future outlook

First bound food generation and expose reset; next save lifecycle, truthful controls, keyboard/focus and reduced-motion styling. Later test long god-mode sessions for growth/rendering cost. Defer new game modes, collision restoration and new artwork pending owner scope/source verification.
