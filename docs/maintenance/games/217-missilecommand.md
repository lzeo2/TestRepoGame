<!-- maintenance-game: Games/MissileCommand -->
# Missile Command maintenance

## Identity and status

Registered id **217**, `classic`, not featured. Entry `Games/MissileCommand/index.html`; baseline `8c8a055`, 5 files, 19,570 bytes. The current game is Andrew Mason's canvas clone with local HUD/end-state modifications. Catalog wording about limited batteries does not accurately describe the unlimited single-turret launch path inspected here.

## Implementation map

Source review coverage: complete HTML, `missile_command.js`, README, CREDITS and MIT LICENSE. No opaque engine or binary assets are shipped in this directory. HTML exposes `#hud`, `#stage` and an unnamed 480 by 600 canvas; the script locates it with `document.querySelector('canvas')` and ends with `MC.init()`.

`MC` contains `engine` and `Wave` closures plus `Entity`, `Turret`, `Home`, `Missile` and `Rocket`. `loadLevel()` builds the turret/six homes and gradient once. `launchRocket()` converts client coordinates through the canvas rectangle. `_gameLoop()` advances waves, creates missiles, updates rockets, draws entities and calls `debugInfo()` for score/wave/city count. `hasHitRocketExplosion()` is the interception boundary; `removeTarget()` updates city survival. `Wave.init()` generates forty difficulty records. Fields named `MirvChance`, `BombChance`, `FlyerChance`, and level `rocketCount` are not consumed by the inspected play loop.

## Gameplay and controls

The game auto-starts; click/tap on the canvas fires a rocket toward the target. Rockets produce expanding/shrinking interception circles; each intercepted missile scores 25. Missiles reaching homes remove those homes; zero homes sets `_state = 'over'`. After all forty waves, the intended state is `won`. Clicking the end screen calls `restart()` and recreates targets, missiles, rockets, score and level. There is no keyboard fire or active-play restart/pause button. Six cities and one unlimited launcher are source-backed; finite ammunition is not.

## State and persistence

Closure variables `_level`, `_score`, `_state`, missile counts and `_entities` own the match. One 30Hz `setInterval` is created by `run()`; `restart()` resets data without adding another interval. `_pause()` exists but is not wired into normal play. End states still redraw every interval. No save key, localStorage or durable score exists. Hidden-tab and pagehide lifecycle are not handled explicitly.

## Dependencies and provenance

[CREDITS](../../../Games/MissileCommand/CREDITS.md) cites `https://github.com/andymason/Missile-Command-JavaScript-Clone`, revision `d82cabdfd73cd60fa46bea98075663c8719ac5df`, and Andrew Mason's MIT [LICENSE](../../../Games/MissileCommand/LICENSE). This run read local evidence without rechecking the upstream tree. No runtime third-party load appears in the inspected path. Personal contact metadata exists in the inherited script header; its value is deliberately not reproduced and was escalated to the owner separately.

## Audit findings

- **HIGH**, `missile_command.js`, `_gameLoop` at `_level += 1`: the final-wave completion increments to 40, then the same tick dereferences `Wave.getWave(_level).MissilesToDetroy` before the next tick's missing-wave guard. Likely final-win TypeError. Repro recommendation: complete wave index 39. Minimal fix: transition/return immediately after increment when no next wave exists.
- **MEDIUM**, `Rocket.prototype.move`, `Math.atan(x / y)` plus negative distance: targeting at/below turret height can travel in the wrong direction or never explode. Repro: click below the red turret or at its horizontal height. Minimal fix: normalized vector/arrival-distance handling in the shared rocket movement routine.
- **MEDIUM**, `_moveEntities` and `_drawEntities`, forward-loop `splice(i, 1)`: consecutive removable entities may be skipped that frame. Decrement index after removal or iterate backwards, preserving interception scoring.
- **CRITICAL policy finding**, script header `@contact`: inherited personal email metadata violates the repository contract. Value withheld; Main must decide minimal redaction, without altering author attribution or license. This documentation worker did not modify runtime.

## Safe iteration

Repair final-wave transitions at `_gameLoop`, not by catching errors in HTML. Preserve the upstream constructor flow and disclosed scoring/restart edits. Do not add speculative MIRV/battery mechanics to justify stale catalog prose; Main owns catalog corrections. Any runtime fix must retain notices and be isolated in a reversible commit.

## Verification

Actually run: complete script passed `node --check` from Git STDIN. No native interaction or screenshots. Repeat: `git show HEAD:Games/MissileCommand/missile_command.js | node --check`. Main alone leases assets for browser tests. Recommended: scaled click accuracy, below-turret shots, two interceptions in one frame, all homes lost/restart, final wave/win/restart, and interval count over repeated replays. Historical `playtest_p1a.md` uses absent `script.js`/HUD fields and cannot clear these findings.

## Future outlook

Week 1: final-wave crash, contact redaction and rocket-vector regression. Week 2: keyboard/touch-equivalent firing and a reachable restart/pause action, with flat shell feedback. Later: elapsed-time scheduling only after preserving difficulty/shot timing. Ammunition limits and expanded enemy types remain deferred rather than silently changing this port's rules.
