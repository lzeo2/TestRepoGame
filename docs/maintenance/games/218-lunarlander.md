<!-- maintenance-game: Games/LunarLander -->
# Lunar Lander maintenance

## Identity and status

Registered id **218**, category `classic`, not featured. Entry `Games/LunarLander/index.html`; baseline `8c8a055` has 4 files and 10,897 bytes. It is Mary Rose Cook's small line-geometry game. The catalog's limited-fuel claim is not implemented: the inspected player has no fuel variable. Local dependency closure is clear; actual gameplay quality is not established by this static review.

## Implementation map

Source review coverage: complete entry, `lunar-lander.js`, CREDITS and MIT LICENSE. All game logic is readable JavaScript in one IIFE; no compiled/vendor engine, image or audio files are present. Head loads the script; its window-load listener creates `Game` after `#screen` exists. The canvas is 310 by 310, with a plain h1 and no other gameplay DOM.

`Game` owns `bodies`, creates terrain with `createMountains()`, and runs a recursive RAF tick calling `update()` then `draw()`. `MountainLine` and `LandingPadLine` wrap line segments. `Player` stores hull/base/exhaust lines, center, angle and velocity. `reportCollisions()` gathers body pairs before dispatching collision callbacks. `geom.translate`, `geom.rotate`, and `geom.linesIntersecting` provide the shared geometry boundary; parallel line segments return false.

## Gameplay and controls

Game begins immediately. `Keyboarder.KEYS` proves left/right rotate; **up switches boost on and down switches it off**. Thrust is latched, not hold-to-thrust. Gravity and boost update velocity each frame. Correctly oriented base contact with a `LandingPadLine` zeros velocity; contact with terrain or an unsuitable pad removes the player body. Landing acceptance checks angle, not descent speed. No score, fuel, landing-result text, restart button, touch control, pause or audio is implemented. Reloading the page is the only obvious replay path and regenerates terrain. These omissions should not be filled with imagined classic-game rules in later documentation.

## State and persistence

`Game.bodies` and the Player object own the simulation; `Keyboarder` has a closure-local key-state map. There are no persistence keys or localStorage calls. RAF is never cancelled, including after player removal. Each physics step adds fixed gravity `0.002` and boost `-0.004`; rotation also advances per frame rather than elapsed time. Constructing another Game without cleanup would add another loop and more window listeners, so a reset must not merely call the constructor repeatedly.

## Dependencies and provenance

[CREDITS](../../../Games/LunarLander/CREDITS.md) records `https://github.com/maryrosecook/retro-games`, subdirectory `lunar-lander/`, revision `2c9a82216cd4a97bd4bb2b9c40f95dbb0a6d2222`. [LICENSE](../../../Games/LunarLander/LICENSE) grants MIT terms and names Mary Rose Cook and contributors. CREDITS claims byte-identical code/HTML ingestion; no remote comparisons were rerun here. The sole runtime dependency is local `lunar-lander.js` plus browser Canvas/RAF/input APIs.

## Audit findings

- **HIGH**, `lunar-lander.js`, `Player.collision` at `this.game.removeBody(this)`: crash removes the player without outcome/restart UI; the loop keeps drawing empty terrain. Recommended repro: let the unboosted craft hit a mountain, then attempt replay without browser reload. Root fix: expose outcome/reset on the existing Game instance and restore a player after cleanup, not stack new Game loops.
- **MEDIUM**, `Player.update`, `applyGravity`, `applyBoost`: physics is refresh-rate dependent. Repro recommendation: compare timed descent at 60Hz and high-refresh displays. Minimal fix: a bounded elapsed-time/fixed-step accumulator in the shared tick, with regression for original 60Hz tuning.
- **MEDIUM**, `index.html`, `#screen`: controls and thrust latch are undocumented in-page and touch access is absent. Add truthful instruction text and native controls feeding Keyboarder state; do not add invented fuel.
- Evidence gap, not a bug verdict: safe-landing speed is not tested or constrained. Changing that rule would require an explicit gameplay decision, not a maintenance inference.

## Safe iteration

Work at Game lifecycle and Keyboarder boundaries. Preserve terrain generation, line art, angle rules and source attribution. A reset should detach/reuse input and own one RAF; a shell can report crash/landing without replacing physics. Runtime edits were not authorized in this task. Keep fixes separate from Main-owned catalog prose and reversible via explicit commit reversion.

## Verification

Actually run: `lunar-lander.js` passed Git-blob STDIN `node --check`. Zero browser/native runs and no screenshots. Repeat `git show HEAD:Games/LunarLander/lunar-lander.js | node --check`. Main alone may lease this game for browser testing. Recommended checks: left/right, boost latch and down cutoff, angled crash, pad contact, post-crash replay, focus loss and refresh-rate comparison. Historical `playtest_p1a.md` references missing fuel/HUD/restart elements and does not verify this implementation.

## Future outlook

Week 1: truthful control/fuel documentation and a single-owner outcome/reset design. Week 2: accessible touch controls and reachable replay with desktop/mobile review. Later: measured physics timing modernization. Fuel economy, levels, sounds and a complete engine rewrite remain deferred gameplay changes, not required to make this port maintainable.
