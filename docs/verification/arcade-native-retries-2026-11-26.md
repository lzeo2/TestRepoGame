# Selected arcade playthroughs, 26 November 2026

These sessions used the catalog HTML entries on a local static server,
Chromium and software-rendered graphics. Each game received a fresh
browser profile. Mouse, drag and keyboard input drove the games.
The browser intercepted requests to non-local servers before sending them.
These results describe first-session play and specific failure paths.

| Game | Inputs and observed outcome | Remaining limit |
| --- | --- | --- |
| Subway Surfers | In the original build, the animated title stayed on screen after tapping and pressing Space. With the bridge repaired, Space started a run. The score advanced from 5 to 35 to 44. Pause showed 44 points toward the 1,000-point mission. Home, Leave and Space returned to the title and started a new run at 5. | The Unity build logs that it cannot save its optional online settings. The tested offline run kept working. |
| Subway Surfers Hacked | Started a run, jumped and moved to the right at a barrier. Its pause menu showed 44 points. A second fresh run after removing the obstructing badge clearly displayed 38 points and the Up-arrow tutorial prompt. | This verifies running and steering. The scope did not include a separate invincibility or coin multiplier test. |
| Super Hot | Clicked the title to enter the first white corridor with a red opponent, reticle and WASD/mouse instruction. Moving the mouse and strafing changed the visible camera direction and geometry. The fresh fixed run did not attempt the Unity hardware survey. | Encounter completion and restart were not established. SwiftShader reported unsupported timer functions and WebGL framebuffer feedback warnings. |
| Burrito Bison | Clicked through the opening comic, dragged the wrestler back from the ropes and released. Used the rocket-slam prompt, earned a new **43 m** record and **18 coins**, opened the mission results, and used the results arrow to return to the ring. | The shop purchase and upgraded booster loop were outside the session. No HTTP 501 recurred from the offline service reply. |
| Cut the Rope | Clicked Play and dragged left to right across the first rope. The falling candy collected three stars and reached Om Nom. The Excellent result awarded **5,439** points. Next began the transition to the following level. | The game showed its native “A Little Too Slow” dialog on this software-rendered device. Clicking Let's Play dismissed it. |
| BitLife | Chose New Life and aged from 0 to 1 to 2. Closed a generated flu event. The updated journal recorded the ages and health event. Relationships showed the new character's two parents and pet. | Later life stages and persistence across devices were outside the session. Its Unity glue logged a deprecated memory helper. |
| Drift Boss | Clicked Play, advanced the booster tutorial, selected Start Drift and reached the driving tutorial. Holding and releasing Space steered right and left and completed all five tutorial checkpoints. Continued into the race, reached Game Over with a score and a new best of **53**. Verified the repaired hint can be dismissed by mouse or by Tab and Enter. | The run used the starter car without buying a booster. |

## Reproducing the checks

Start from the registered entry in a fresh profile. Keep the on-screen HUD
and launcher in the frame. On Subway, wait for the game's own birth-month and
year selector; the Unity loader can finish before this screen exists. The
disposable test used the game's local onboarding without selecting its
advertising-consent offer. Follow the in-game prompts before pressing Space.

For Burrito Bison, the opening logo and comics precede the actual ring.
Drag from the wrestler back and down, release, then click the rocket-slam
prompt. The results first show mission progress, followed by the record
and coins. In Drift Boss, advance every booster explanation and select
Start Drift before testing the steering control.

If browser screenshot capture stalls while a Unity game is drawing, run
one visible Chromium window on an authenticated private Xorg display. A
framebuffer screenshot records what the player sees independently of the
browser screenshot compositor. Continue sending input through Chromium.
The joint fleet run stored the per-game JPEGs and action logs under
`unity-deep/` in its external evidence directory.

For a focused check of the offline adapters, run
`node scripts/test_arcade_trust_boundaries.mjs`. The test exercises local
callback and URL handling in both Subway editions, Burrito Bison, Super Hot,
EmulatorJS and the registered OvO build.
