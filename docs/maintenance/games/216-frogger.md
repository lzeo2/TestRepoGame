<!-- maintenance-game: Games/Frogger -->
# Frogger maintenance

## Identity and status

Registered id **216**, category `classic`, not featured; entry `Games/Frogger/index.html`. Baseline `8c8a055` contains 10 files totaling 68,024 bytes. This is the RotaruDan source port. It is not the five-home, DOM-score implementation referenced in earlier playtest records. The November viewport repair preserves the original course and atlas.

## Implementation map

Source review coverage: complete `index.html`, `base.css`, `engine.js`, `game.js`, sprite-coordinate file `images/sprite.json`, README, CREDITS and GPLv2 LICENSE. Both PNG files were inventoried but not visually reviewed.

`#game` is a 320 by 480 canvas inside `#container`, below `#hud`. `engine.js` defines singleton `Game`, `SpriteSheet`, `GameBoard`, `Sprite`, `TitleScreen` and `Spawner`; `game.js` supplies `Frog`, `DeadFrog`, `Car`, `Trunk`, `Water`, and `Background`. Window load calls `Game.initialize("game", sprites, startGame)`. `SpriteSheet.load()` loads `images/spritesFrogger.png` and calls the ready callback. The `sprites` object in `game.js`, not the legacy `.json` file, is the actual atlas map. `GameBoard.step()` marks/finalizes object removal after stepping; `collide()` routes overlap checks to type-filtered sprite interactions.

## Gameplay and controls

`startGame()` sets the background and starts immediately. Arrow keys set `Game.keys`. Touch players use the four labelled buttons below the court. A tap queues one direction and a held button repeats hops. The frog hops in quarter-second steps, rides a trunk's horizontal velocity, and dies on cars, uncovered water or the ten-second deadline. Reaching `y == 0` calls `winGame()`, adds 100 points, and presents an up-arrow replay prompt. Losing all three lives presents the same input-to-replay path and resets score on replay. Winning preserves cumulative score and remaining lives. There is no five-home completion system, audio UI or stored best score in this source.

## State and persistence

`FROG_SCORE`, `FROG_LIVES`, `CURRENT_FROG_LIVES` and board slots are globals. Frog countdown and spawning use fixed `dt = 30/1000` in a recursive 30ms timeout, not real elapsed time. `Game.loop()` continues through title screens; board replacement avoids creating another loop on replay. `DeadFrog.step()` decrements lives after its death animation and resets lives after final loss. No persistence API or save key is used. Window blur releases held inputs. The simulation continues while its timer runs.

## Dependencies and provenance

[CREDITS](../../../Games/Frogger/CREDITS.md) records `https://github.com/RotaruDan/frogger`, pin `a4b33cf54297b4f71d0e0f31c1911fea2d4b2360`, and GPLv2. The source identifies Dan Cristian Rotaru; README identifies Alien Invasion as the engine basis. [LICENSE](../../../Games/Frogger/LICENSE) is present. Prior upstream comparisons are documented evidence, not rerun here. Images are attributed to the upstream tree without independent asset authorship evidence. There are no external runtime script/font loads in the reviewed entry path.

## Audit findings

The old mobile sizing routine cut off the spawn lane at 850 × 590 by drawing the 320 × 480 course into a 425 × 295 canvas. The entry now retains its original drawing dimensions and the stylesheet scales the complete board between the instructions and controls. The keyboard handler reads the supplied event. Native directional buttons also support screen-reader activation and touch taps independent of simulation tick timing.

## Safe iteration

Preserve the sprite atlas offsets, hop duration, ten-second deadline, winning score and upstream GPL notices. Use the atlas map in `game.js` when changing sprite coordinates. The keyboard and the touch pad both feed the stationary frog’s direction selection and title-screen replay.

## Verification

Run `python3 -B scripts/test_frogger_viewport.py` with Chromium and Playwright installed. On 26 November 2026 it verified all 320 × 480 logical pixels fit on a desktop (850 × 590), portrait phone (390 × 844) and landscape phone (640 × 360). The desktop used ArrowRight. Each touch profile tapped Hop right. In each session the measured green frog sprite moved right from x=159 to x=209 on the actual canvas. Separate receipt folders can be requested with `--output`. Reaching the goal, timer expiry, water/log and car collisions, and win/loss replay still need longer play.

### Static metadata receipt (2026-10-15)

Only the entry head description changed. Entry/tree matched inventory at `e787681`.
[Metadata checks and exact paths](../audits/fleet-followup-descriptions.md).
No engine audit or gameplay acceptance; source-coverage limits and known holds remain.

## Future outlook

Test replay and the ten-second deadline under background throttling, and add a pause control if the game design requires it. Measure actual hop timing before changing the simulation clock.
