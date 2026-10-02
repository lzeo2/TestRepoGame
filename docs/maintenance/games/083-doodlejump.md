<!-- maintenance-game: Games/DoodleJump -->
# Doodle Jump maintenance

## Identity and status

Registered id **83**, category `action`, entry [index.html](../../../Games/DoodleJump/index.html). Baseline `8c8a055`: 45 tracked files, 4,096,695 bytes; entry blob `88c901a4058ef234c5074490490aa68f6299ad5f`. Local dependency paths are source evidence, not an offline play certification. This assignment changes documentation only.

## Implementation map

`index.html` loads `api.js`, Phaser, FULLTILT, `js/build/production.min.js`, NoSleep and `js/main.js`, in that order. `main.js` constructs `Doodle.game` at 640 by 960, registers Boot, Preload, Game, Menu, Settings, Calibrate and Scores, then starts Boot. Boot enables arcade physics and SHOW_ALL scaling; Preload loads image/atlas, scene, statistics and audio resources from `assets/`. Useful gameplay anchors are `GameState.init/create/update`, `jumpState`, `moveScreen`, `loadLevel`, `loadScene`, `playerShoot`, `gameOver`, `setHighScore` and `writeScore`.

Source review coverage: entry, CloudAPI stub and main bootstrap read completely; production bundle's GameState flow and selected Menu/Preload/Settings/Scores/Calibrate anchors inspected. Phaser's 791,364-byte vendor engine, FULLTILT internals, NoSleep media internals, sprite assets and every platform/bonus branch were not human-reviewed in entirety. This is not full engine certification.

## Gameplay and controls

Menu's `playButton` is a sprite at world `(130,230)`, not canvas center. Its input-up transition fades into Game. Player automatically bounces on platforms; `moveScreen` increases altitude score and generates more terrain. Left/right cursor keys accelerate horizontally; FULLTILT supplies orientation movement until cursor control takes over. Space and up-arrow call `playerShoot`; tap also shoots, optionally aimed according to `DJ_directionalShooting`. Pause/resume are canvas sprites, not DOM buttons. Falling and obstacle interactions call `gameOver`, exposing `playAgainButton` and `menuButton`. Both can first call the inert CloudAPI game-over hook before a subsequent input transitions. The hint documents only tilt/left/right and disappears after ten seconds. Actual sensor permission, audio and restart behavior require browser verification.

## State and persistence

Game state owns score, pooled platforms/bonuses/obstacles/bullets, player physics and `player.playerTimer`. Save keys include `DJ_stats`, `DJ_localTopScores`, `DJ_Doodle_name`, `DJ_calibrated`, `DJ_calibrate`, `DJ_soundToggle` and `DJ_directionalShooting`. Reads parse saved statistics/scores directly; writes mostly catch storage failures. Both this game and id 109 use the same origin-wide keys. Independent orientation `requestAnimationFrame` closures are created in Game and Calibrate; no corresponding shutdown anchor was found in the reviewed bundle. NoSleep enables on first touch and removes that listener, but the wrapper does not disable it on exit.

## Dependencies and provenance

CloudAPI is a local no-op; score submission callback reports success without a remote leaderboard. Store URL strings survive in the bundle but reviewed input handlers use `void 0`, not automatic fetches. No license, README or source pin exists in this directory's tracked inventory. Limasky-branded preload art is not permission evidence. Redistribution/source revision remain unknown. Historical [batch 4](../../audit_batches/batch_4.md) and [playtest r4](../../audit_batches/playtest_r4.md) record older working play, not this assignment's verification.

## Audit findings

- **HIGH**, `js/build/production.min.js`, `GameState.init`/`ScoresState.init`: unguarded `JSON.parse(localStorage.getItem("DJ_stats"))` and score parsing can abort state entry on corrupt storage. Reproduce with invalid JSON in a disposable profile; root fix is one validated save-read boundary retaining the bad value for export, not unconditional deletion.
- **MEDIUM**, same file, Game/Calibrate orientation closures: each entry schedules another independent rAF chain with no reviewed teardown. Re-enter calibration/game repeatedly and count callbacks. Stop the chain at state shutdown in legitimate source, preserving sensor calibration.
- **MEDIUM**, `index.html`, viewport and `#controls-hint`: zoom prohibited and instructions expire without a recoverable help action. Restore zoom and persistent accessible help in the wrapper.

## Safe iteration

Patch hint/viewport or stub contracts first. Preserve state names, atlas frame names, portrait coordinates and existing save formats. Do not hand-rewrite Phaser or the production bundle; locate corresponding upstream source before engine fixes. Coordinate any save-key namespace migration with id 109, retaining export/rollback copies. CloudAPI success is deliberately local and must never be advertised as cloud persistence.

## Verification

Actually run: `git show HEAD:Games/DoodleJump/js/build/production.min.js | node --check` passed. Git inventory and source reads completed; native sessions **0**, screenshots **0**. Recommended: serve a supervisor-approved narrow checkout, click the Play sprite using scaled world coordinates, steer, shoot, pause, fall, restart twice and reload saved scores. Test denied/corrupt storage, sensor permission refusal, repeated Settings/Calibrate visits and touch wake-lock release. Check all requests stay local. Main owns the unchanged full-catalog smoke gate.

## Future outlook

First harden saved-data reads and timer shutdown from verified source. Next make controls available after the transient hint, including shooting and a keyboard-reachable pause action. Later profile repeated-session CPU and real device tilt/audio; defer new skins, online scores and engine replacement until rights and source are established.
