<!-- maintenance-game: Games/DoodleJumpHacked -->
# Doodle Jump Hacked maintenance

## Identity and status

Registered id **109**, category `arcade`, entry [index.html](../../../Games/DoodleJumpHacked/index.html). Baseline `8c8a055`: 45 files, 4,097,860 bytes; entry blob `302b27e4660e044bc781c10420bf9e148c3da028`. This is an existing cheat variant, not a new game or an authorized engine replacement. Runtime remains unchanged.

## Implementation map

The entry loads `api.js`, `js/phaser.min.js`, `js/fulltilt.min.js`, `js/build/production.min.js`, `js/NoSleep.min.js` and `js/main.js`. Bootstrap constructs `Doodle.game` at 640 by 960, registers Boot/Preload/Game/Menu/Settings/Calibrate/Scores and starts Boot. The local CloudAPI stub has inert score, logo/link and gameplay methods. Production anchors include `GameState.init`, `create`, `update`, `gameOver`, `moveScreen`, `playerShoot`, `writeScore`, and Settings/Calibrate save operations.

Source review coverage: entry, api and main read; corresponding production GameState and save/menu/calibration anchors inspected in both variants. Phaser, sensor/media vendor libraries, all art/audio and every minified bonus/platform branch were not fully human-reviewed. The wrapper's `applyHacks` is read in full and is the primary variant maintenance boundary.

## Gameplay and controls

The Menu Play sprite sits at `(130,230)` in world space; generic canvas-center clicks do not prove a failed start. Arrows steer, device tilt can steer, Space/up shoot, and tap calls shooting. Sprite pause/resume and menu/settings controls remain engine-owned. `applyHacks` waits for `Doodle.game.state.states.Game.player`, replaces that state's `gameOver` with a no-op and starts a 16 ms interval. It forces score and score-label text to 999999, keeps `player.alive` true and rescues falls below y=2000 by moving the player to y=400 with upward velocity -800. Ordinary loss/restart is intentionally suppressed; do not invent a mandatory failure state for this variant.

## State and persistence

The `patched` closure flag allows one patch application; a separate 200 ms polling interval continues even after success. The 16 ms cheat interval re-resolves the Game state, but neither interval is owned by Phaser state shutdown or cleared by this wrapper. Game init itself resets score before the cheat restores it. Origin-wide keys are `DJ_stats`, `DJ_localTopScores`, `DJ_Doodle_name`, `DJ_soundToggle`, `DJ_directionalShooting`, `DJ_calibrated` and `DJ_calibrate`, shared with id 83. High scores normally commit through `gameOver`/`writeScore`; suppressing that path means an infinite score display is not proof of durable high-score saving.

## Dependencies and provenance

All entry scripts are local and CloudAPI is intentionally offline. No LICENSE/README/source revision is tracked in this game directory. Commercial-name/art presence does not establish redistribution rights; upstream provenance remains unknown. [Batch 5](../../audit_batches/batch_5.md) describes earlier cheat inspection; [playtest r7](../../audit_batches/playtest_r7.md) explicitly missed the Play sprite and is not proof the game itself cannot start. Its old badge-emoji observation is stale: current badge text is simply HACKED.

## Audit findings

- **HIGH**, `js/build/production.min.js`, `GameState.init`/`ScoresState.init`: malformed `DJ_stats` or `DJ_localTopScores` throws before play. Minimal root fix is a validated, recoverable save-load boundary in verified source, with shared-key migration coordinated with id 83.
- **MEDIUM**, `index.html`, `badge.style.cssText`: `border-radius:8pxpointer-events:none;` combines two declarations, losing intended pointer transparency. The overlay can absorb taps. Insert the missing semicolon; verify computed `pointer-events` and tap-through.
- **MEDIUM**, `index.html`, `applyHacks`: perpetual 200 ms poll and unowned 16 ms timer survive state transitions. Clear discovery polling on success and scope the active patch timer to game lifetime, preserving god mode. Empty catches currently conceal patch drift.
- **MEDIUM**, production orientation closures: reviewed Game/Calibrate rAF chains lack teardown. Repeated state visits need callback-count verification before source-level repair.

## Safe iteration

Keep cheat values, rescue thresholds and loss suppression unless owner requests a behavior change. Repair authored badge/timer ownership rather than rewriting physics. Do not treat local god mode as a security vulnerability. Preserve library notices and offline stub behavior. Any change to shared saves must support backup, rollback and explicit normal/hacked separation.

## Verification

Actually run: production JS from Git through `node --check` passed. Native sessions **0**, screenshots **0**. Recommended narrow-checkout browser checks: click real Play bounds, confirm patched score, steer/shoot, fall-rescue, pause and visit Menu/Game repeatedly while counting timers. Inspect computed badge styles and keyboard/help access. Inject invalid saved JSON in an isolated profile and verify safe recovery after an authorized fix. Main performs the separate full-catalog gate.

## Future outlook

First repair badge and lifecycle ownership; next harden saves and keep controls/help recoverable. Later profile repeated-state CPU and mobile sensor permissions. Defer stronger cheats, new artwork and source regeneration until provenance and rights are verified.
