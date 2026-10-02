<!-- maintenance-game: Games/Frogger -->
# Frogger maintenance

## Identity and status

Registered id **216**, category `classic`, not featured; entry `Games/Frogger/index.html`. Baseline `8c8a055` contains 10 files totaling 68,024 bytes. This is the RotaruDan source port. It is not the five-home, DOM-score implementation referenced in earlier playtest records. Runtime remains unchanged by this documentation task.

## Implementation map

Source review coverage: complete `index.html`, `base.css`, `engine.js`, `game.js`, sprite-coordinate file `images/sprite.json`, README, CREDITS and GPLv2 LICENSE. Both PNG files were inventoried but not visually reviewed.

`#game` is a 320 by 480 canvas inside `#container`, below `#hud`. `engine.js` defines singleton `Game`, `SpriteSheet`, `GameBoard`, `Sprite`, `TitleScreen`, `Spawner` and `TouchControls`; `game.js` supplies `Frog`, `DeadFrog`, `Car`, `Trunk`, `Water`, and `Background`. Window load calls `Game.initialize("game", sprites, startGame)`. `SpriteSheet.load()` loads `images/spritesFrogger.png` and calls the ready callback. The `sprites` object in `game.js`, not the legacy `.json` file, is the actual atlas map. `GameBoard.step()` marks/finalizes object removal after stepping; `collide()` routes overlap checks to type-filtered sprite interactions.

## Gameplay and controls

`startGame()` sets the background and starts immediately. Arrow keys set `Game.keys`; touch platforms get canvas-drawn directional controls. The frog hops in quarter-second steps, rides a trunk's horizontal velocity, and dies on cars, uncovered water or the ten-second deadline. Reaching `y == 0` calls `winGame()`, adds 100 points, and presents an up-arrow replay prompt. Losing all three lives presents the same input-to-replay path and resets score on replay. Winning preserves cumulative score and remaining lives. There is no five-home completion system, audio UI or stored best score in this source.

## State and persistence

`FROG_SCORE`, `FROG_LIVES`, `CURRENT_FROG_LIVES` and board slots are globals. Frog countdown and spawning use fixed `dt = 30/1000` in a recursive 30ms timeout, not real elapsed time. `Game.loop()` continues through title screens; board replacement avoids creating another loop on replay. `DeadFrog.step()` decrements lives after its death animation and resets lives after final loss. No persistence API or save key is used. There is no blur-release/pause lifecycle in inspected code.

## Dependencies and provenance

[CREDITS](../../../Games/Frogger/CREDITS.md) records `https://github.com/RotaruDan/frogger`, pin `a4b33cf54297b4f71d0e0f31c1911fea2d4b2360`, and GPLv2. The source identifies Dan Cristian Rotaru; README identifies Alien Invasion as the engine basis. [LICENSE](../../../Games/Frogger/LICENSE) is present. Prior upstream comparisons are documented evidence, not rerun here. Images are attributed to the upstream tree without independent asset authorship evidence. There are no external runtime script/font loads in the reviewed entry path.

## Audit findings

- **HIGH**, `engine.js`, `Game.setupInput`: listeners accept `e` but read `event.keyCode`. This relies on nonportable ambient `window.event`; input can throw or fail in browsers without it. Recommended repro: arrow key in Firefox. Minimal root fix: use the passed `e` in both listeners.
- **MEDIUM**, `engine.js`, `Game.setupMobile`: width/height and lane positions are cached before mobile canvas resizing; the canvas is absolutely positioned at page origin. Bounds can disagree with the actual canvas and cover the instructional HUD. Minimal fix: preserve logical canvas dimensions and scale only presentation, or synchronize all geometry after resizing.
- **MEDIUM**, `TouchControls.trackTouch`: coordinates divide client positions by multiplier without canvas offset/CSS scale. Test controls after scroll/portrait resize; map through the canvas bounding rectangle once.
- **LOW**, second top-level `this.setupMobile`: duplicated implementation is not the method called by initialization. Do not remove it or backup art without the repository-wide consumer audit required by policy.

## Safe iteration

Fix the shared input handlers before changing frog movement. Preserve atlas offsets, hop duration, deadline, cumulative-win scoring and upstream GPL notices. Keep the source map in `game.js` authoritative; do not convert the unconsumed `.json` file and assume runtime changed. Runtime corrections require separate authorization and a reversible explicit-path commit.

## Verification

Actually run: `engine.js` and `game.js` passed Git-blob STDIN `node --check`; native/browser checks: **zero**. Repeat with `git show HEAD:Games/Frogger/engine.js | node --check`. Main must own any narrow game materialization. Recommended browser checks: arrows without ambient event, ten-second expiry, car/water/log collisions, win and final-loss replay, touch bounds on portrait screens, and HUD visibility. Earlier `playtest_p1a.md` describes a superseded implementation and is not current verification.

## Future outlook

Week 1: browser-portable keyboard repair and coordinate diagnosis. Week 2: stable portrait layout, labeled accessible directional buttons and an explicit pause affordance, with Main image review. Later: elapsed-time scheduling after measuring the effect on hop/spawn behavior. Do not rewrite the game or fabricate additional homes to match historical documentation.
