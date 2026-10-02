<!-- maintenance-game: Games/BreakoutHacked -->
# Breakout Hacked maintenance

## Identity and status

Registered id **94**, category `classic`, entry [index.html](../../../Games/BreakoutHacked/index.html). Baseline `8c8a055`: 7 files, 41,362 bytes; entry blob `b168c7578c34b25cd22ac57b0ef56323c42aaa80`. Authored canvas logic is readable. High score and endless brick respawn are intentional; source comments' god-mode claim is not implemented for falling.

## Implementation map

Entry exposes `#game`, `#score`, `#level`, `#powerupText`, `#game-over` and `#winner`, then loads script.js. Script sets 400 by 500 canvas, defines LVL1/2/3 arrays and a colorMap, paddle/ball records and bricks. `createGameGrid` populates bricks, `loop` advances/draws, `collides` performs AABB tests, `checkBallBrickCollision` awards score and powerups, `moveBall` checks walls/fall. `resetGame` resets state and schedules a frame. Source review coverage: full entry/script/style/README read. Images and project-file contents were not reviewed; there is no large vendor engine hidden behind the wrapper.

## Gameplay and controls

Left/right arrows set paddle velocity; Space launches or restarts after game over. Enter toggles pause; 1/2/3 selects a level while paused. Touching the paddle launches, dragging moves it, touching level text cycles levels, and paddle touch after death resets. Device orientation gamma drives velocity at sensitivity 1.5 without a reviewed permission request. Score begins 999999, each brick adds 1000, and clearing bricks adds 50000 then repopulates LVL1. `moveBall` still sets isGameOver on a fall; normal loss exists. `resetGame` resets score to 0, so cheat initialization and reset differ. Three powerups widen paddle, slow ball or enlarge ball; duration is counted in brick collisions, not seconds.

## State and persistence

No save key exists. Globals own level, score, flags, ball/paddle geometry and powerup counters. `loop()` is called immediately while ball velocity is zero and keeps scheduling rAF. Touch launch also calls `loop`; reset and resume schedule another frame without cancellation. This permits multiple active chains, especially tapping level while playing. `displayPowerupText` uses an unowned five-second timeout. Key flags and motion lack blur cleanup. `resetPaddle`'s width/height/dx labels are statements, not assignments; resetGame separately restores width but not all motion/ball-size state.

## Dependencies and provenance

No runtime library is needed. README references `https://danieldotwav.github.io/Breakout-HTML/` and its GitHub project; these supplied links establish an attribution lead only, not a pinned revision or verified permission. No LICENSE is present in the seven-file inventory. README's responsive rendering claim is not proof: canvas is fixed-size and CSS does not provide a bounded width rule. Preserve notices/project evidence; do not delete old project files without consumer analysis.

## Audit findings

- **HIGH**, `script.js`, `loop`/touch launch/`resetGame`: independent entry paths schedule overlapping rAF chains. Tap paddle to start then change levels repeatedly; measure movement/frame count. Root fix: one owned frame handle, cancel before reset/resume and never launch a second loop on touch.
- **MEDIUM**, `checkForRandomPowerupChance`: cooldown decrements past zero if random chance fails at exactly zero, preventing later powerups. Clamp cooldown at zero and test repeated failures before success.
- **MEDIUM**, `resetPaddle`/`resetGame`: label syntax does not reset dx; enlarged ball size is not restored. Replace labels with assignments and reset geometry/key state in the single reset boundary.
- **MEDIUM**, `handleTouchMove`: CSS-pixel delta is applied directly to game coordinates while start hit testing scales correctly. Scale drag delta by canvas.width/rect.width when responsive sizing is introduced.
- **MEDIUM**, HTML/style: no visible controls instructions; fixed canvas overflows narrow screens; infinite result animation has no reduced-motion handling. Minimal shell fixes suffice.

## Safe iteration

Preserve high starting score, per-brick bonus and respawn identity unless owner changes semantics. Document fall behavior truthfully. Patch timer/reset/cooldown root functions before aesthetics; leave one small executable regression for each combined logic repair. Do not rewrite the engine or convert collision-based duration into seconds without design approval.

## Verification

Actually run: script Git blob `node --check` **PASS**. Native **0**, screenshots **0**. Recommended: launch once by each input, cycle level during active play, pause/resume repeatedly, compare one-frame movement, fall/restart and reset with active big-ball/wide-paddle. Force cooldown chance failure then success. Test 320 px touch scaling, tilt permission and keyboard blur. [Playtest r6](../../audit_batches/playtest_r6.md) previously played/restarted but did not certify loop ownership. Main owns full gate.

## Future outlook

Prioritize single-loop/reset correctness and powerup availability. Then persistent controls, responsive canvas, input labels/focus and reduced motion. Later profile collision stability at capped speed 8. Defer multiball/AI placeholders and new levels until reliability and source rights are established.
