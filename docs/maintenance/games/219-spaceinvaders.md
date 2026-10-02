<!-- maintenance-game: Games/SpaceInvaders -->
# Space Invaders maintenance

## Identity and status

Registered id **219**, `classic`, not featured; entry `Games/SpaceInvaders/index.html`. Baseline `8c8a055` contains 15 files, 577,745 bytes. The current entry title is Shooter Game. This is the Oz Elentok upstream port, not the wave/menu implementation in historical playtests. All entry loads are relative/local, with no native/browser pass claimed.

## Implementation map

Source review coverage: entire entry, CREDITS/LICENSE, and all five authored files under `javascripts/`: `Const.js`, `SpaceShip.js`, `CDetection.js`, `Game.js`, `Main.js`. The 93,436-byte jQuery 1.8.2 minified vendor implementation was not human-reviewed in entirety; PNG assets were inventoried, not visually reviewed.

HTML has `#gameview` canvas and `#background` image. Scripts load jQuery, constants, entity classes, collision detector, game then bootstrap in that order. `Main.js` waits for window load, creates `SI.Game` and calls `start()`. `Const.js` snapshots viewport dimensions into `SI.Sizes` and creates four image objects. `initializeGame()` constructs a player, rectangular enemy rows, rocket/explosion arrays, score/lives and one interval. `CDetection.detectHitEnemies()` returns row/column deletion coordinates. `SpaceShip`, `Rocket` and `Explosion` own movement/render state; `drawAllElements()` handles frame-based sprite animation and canvas HUD.

## Gameplay and controls

Play starts automatically. Left/right move; **up fires**. No Space mapping exists. Touchmove positions the ship horizontally; touchstart fires. The player starts with three lives, limited to eight simultaneous rockets. Destroyed ships score five points; deleting an entire row increases enemy horizontal speed. Clearing all rows wins; zero lives or enemy arrival near the ground loses. `newGamePrompt()` uses native `confirm('...Play Again?')`; acceptance resets a match and rejection leaves the stopped canvas. There is no finite wave campaign, mute or pause action in this source.

## State and persistence

The SI.Game instance owns arrays, points, lives, frame count and interval `clock`; global `SI` owns initial dimensions/images/constants. End detection clears the interval before prompting. `initializeGame()` resets entities and counters, but does not reset movement flags `moveLeft`/`moveRight`. Document-wide input listeners are installed once in `start()`. No localStorage/save API occurs in authored code. Resize/orientation changes do not recalculate SI.Sizes; no visibility/blur release is provided.

## Dependencies and provenance

[CREDITS](../../../Games/SpaceInvaders/CREDITS.md) records `https://github.com/ozelentok/SpaceInvaders`, revision `02ccd86d3841d90cff99b85b05adc0cd052d7570`. [LICENSE](../../../Games/SpaceInvaders/LICENSE) is MIT, Oz Elentok, 2018. Prior byte-identical asset/runtime comparisons were not rerun. Retain notices and distinguish code permission from independent asset authorship. Images and jQuery are local; source URLs in notices are not runtime fetches.

## Audit findings

- **HIGH**, `Game.js`, interval ordering in `initializeGame`: `deleteExplodedEnemyShips()` can empty `enemies.ships`, but `launchEnemyRocket()` runs before `checkEndGame()` and dereferences a random row when its fire counter is due. Recommended repro: destroy the final enemy on the enemy-fire tick. Root fix: stop/end-check immediately after the final deletion, or guard the shared enemy-fire routine.
- **MEDIUM**, `deleteExplodedEnemyShips`, successive `splice(col, 1)` using detector indices: multiple hits in one row shift later indices, risking wrong removals/score. Delete unique hit coordinates in descending column order or mark and filter survivors.
- **MEDIUM**, `SpaceShip.js`, `SpaceShip.move` bottom clamp: writes `this.x = SI.Sizes.height - this.height` instead of clamping y. The ordinary loss threshold may mask this defect; fix the shared axis assignment, not a caller workaround.
- **MEDIUM**, entry viewport `user-scalable=no` and `Const.js` snapshot sizes: zoom disabled and orientation is stale. Allow zoom, then implement one coherent geometry-resize path rather than changing only canvas attributes.

## Safe iteration

Keep SI namespace/load ordering, enemy-row behavior, five-point scoring and original images. Correct shared deletion/end ordering before touching draw code. Native restart control can replace the blocking prompt only as an approved wrapper change. Runtime is read-only for this audit. Do not upgrade jQuery or rewrite sprites merely to match house aesthetics.

## Verification

Actually run: all six JS files including jQuery passed Git-blob STDIN syntax checks; browser/native tests **zero**. Repeat `git show HEAD:Games/SpaceInvaders/javascripts/Game.js | node --check`. Main owns any narrow game lease. Recommended: up firing, touch drag/fire, simultaneous hits, final kill on fire tick, three-hit loss and both confirm responses, resize, and movement after replay. Historical `playtest_p1a.md`'s wave HUD/Menu controls are absent here and cannot clear current defects.

## Future outlook

Week 1: final-enemy crash/deletion indexing regressions and axis clamp. Week 2: reachable instructions/restart, focus-loss release and mobile resize review. Later: replace document-wide touch interception with canvas-scoped pointer input if measured testing warrants it. Campaign modes, new enemies and upstream art recoloring are deferred.
