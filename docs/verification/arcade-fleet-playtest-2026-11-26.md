# Arcade fleet interaction results

142 game projects (136 registered and 6 unlisted), 267 isolated fleet browser attempts.
50 titles had a verified game-control change in at least one fleet attempt.
Combining that evidence with dedicated gameplay observations covers 139 distinct titles. The other 3 have more limited evidence in these sessions.

## Coverage

Chromium used real pointer and keyboard events against local game entry pages.
A game control counts as verified when a game-specific state value or board element changed after its action.
Visible response means the frame changed after input following a still sample.
The animation-only group also changed during the idle sample.
Start control measures entry into a new visible screen.
The remaining outcomes need a deeper game-specific route.
Protected chat coverage stops at its shell. These short sessions do not measure completion of entire stories, device frame rates or multiplayer.

## Entries without a verified game control

- **Character Alsen**. The protected chat shell opened. The session did not send a message.
- **Blackout**. Selected Capture the Flag and Office in the normal menu. The match HUD showed Office Tower, two flags, and a three-capture win condition. The software WebGPU run lost its GPU instance during shader compilation before weapon input could be verified.
- **Slope**. The offline-unavailable notice returned to the arcade through its real Back to Arcade link. The game engine was intentionally removed from this unlisted entry.

## Latest outcome per title

| Outcome | Titles |
| --- | ---: |
| Game control verified | 50 |
| Visible response | 23 |
| Start control responded | 4 |
| Animation only | 42 |
| No visible change | 12 |
| Frame unavailable | 6 |
| Protected shell | 1 |
| Unavailable by design | 1 |
| Test interrupted | 3 |

## Runs

A run records the starting Git revision. Source repairs and targeted retries occurred during this sweep.
An asset or script loaded by an earlier attempt can differ from a later one.
Each run directory contains JSON observations and captured frames. The last three columns count entries where that kind of event was observed. A missing optional asset can appear in these counts even when the game runs.

| Run | Starting revision | Entries | Page exceptions | Local HTTP errors | Off-origin HTTP blocked |
| --- | --- | ---: | ---: | ---: | ---: |
| interaction-pass-01 | `d5c2e95b2857` | 142 | 16 | 4 | 12 |
| interaction-targeted-02 | `d5c2e95b2857` | 16 | 0 | 0 | 3 |
| interaction-targeted-03 | `a6f904aa2e38` | 32 | 1 | 2 | 1 |
| interaction-targeted-04 | `e6b9475f5850` | 30 | 0 | 0 | 1 |
| interaction-targeted-05 | `e36ad2ddefd1` | 13 | 0 | 0 | 0 |
| interaction-targeted-06 | `03d28d3b2ecf` | 1 | 0 | 0 | 0 |
| interaction-targeted-07 | `d69b6e719ffc` | 8 | 0 | 0 | 0 |
| interaction-targeted-08 | `4ff80b644dca` | 2 | 0 | 0 | 0 |
| interaction-targeted-09 | `eb6c78934ffc` | 3 | 0 | 0 | 0 |
| interaction-targeted-10 | `c07dd9123ea8` | 4 | 0 | 0 | 0 |
| interaction-targeted-11 | `f6b98a1dd5aa` | 3 | 0 | 0 | 0 |
| interaction-targeted-12 | `7364d4ddecbc` | 1 | 0 | 0 | 0 |
| interaction-targeted-13 | `1bb1b4c5fc3b` | 9 | 0 | 0 | 0 |
| interaction-targeted-14 | `ae4e79a491a2` | 3 | 0 | 0 | 0 |

## Dedicated native-input observations

The following longer sessions used individual game controls. Scope identifies exactly how far the evidence reached.
Receipt paths refer to the external session folder or a tracked test script.

| Game | Scope | Observation | Receipt |
| --- | --- | --- | --- |
| Soccer Random | gameplay | Releasing the Up arrow after a hold lifted the right team’s players. The other pair stayed on the ground. | vendor-deep/4/proof.json |
| Basket Random | gameplay | Right team jumped after the native Up input. Default embedded ad cancellation and both menu clicks completed without a page error. | vendor-deep/5/proof.json |
| Volley Random | gameplay | Releasing the Up arrow after a hold lifted the right team’s players. The other pair stayed on the ground. | vendor-deep/6/proof.json |
| Ovo | gameplay | Native Right moved the registered OvO 1.4.5 player horizontally on level 1; its vertical coordinate stayed fixed. | vendor-deep/7/proof.json |
| Run 3 | gameplay | Started Explore from the native character menu. The runner entered the tunnel, then received left, right and jump inputs. The play and steer frames show the live level. | run3-play.png, run3-steer.png |
| Snake | gameplay | Steered, toggled pause and resume with P, crashed and started a new game. | root-deep/Snake.json |
| Gladihoppers | gameplay | Entered the Trainer’s native Unity tutorial. Holding A completed its requested movement and opened the lesson on stances. | unity-deep/verified-gladi/movement.jpg, trainer2.jpg |
| Burrito Bison | gameplay | Advanced through the story, dragged the wrestler away from the ropes and released to launch. Clicked the in-flight slam prompt and reached the post-run mission panel. | unity-deep/bison-display/session.log, launch.jpg, smash.jpg |
| BitLife | gameplay | Started a new life and aged twice. Closed the age-two flu event and opened Relationships, which displayed the parents and a pet. | unity-deep/bitlife/age-2.jpg, family.jpg |
| Subway Surfers | gameplay | Cleared local onboarding, started a run with Space and tap, and used upward input. The score advanced from 5 to 35 to 44 while the player continued along the track. | unity-deep/subway-local/session.log, jump.jpg, checkpoint.jpg |
| Stranded In Isekai | gameplay | Entered map 1 and moved the active character using an arrow key. | controls-deep/StrandedInIsekai/proof.json |
| Papa's Pizzeria | gameplay | Created an empty-slot profile, skipped the intro, visited all four tutorial stations, and took Cooper’s order. The live game produced ticket 001 with four toppings, cut instructions and a bake time. Cooking and serving that order to completion were not tested. | classics-deep/53/proof.json |
| Retro Bowl | gameplay | Started an original Buffalo career, selected the favorite-team checkbox, skipped the introductory office tutorial, and entered the Week 18 match against New York J. Started the opening kickoff from Get Ready. Quarter clock, possession and score then advanced; a Buffalo field goal made it 3–0. This run did not verify a manual offensive pass. | classics-deep/54/proof.json |
| Super Hot | gameplay | Advanced the introduction to the first 3D encounter. WASD and mouse input moved the camera in the scene with the opponent and reticle visible. | unity-deep/superhot-display/ |
| 10 Minutes Till Dawn | gameplay | Selected Shana and the revolver, entered survival and held the left mouse button. Displayed ammunition fell from 006/006 to 005/006 as the timer counted down. One optional Steam wishlist navigation was blocked offline. | verified-last-native/TenMinutesTillDawn.json |
| Fleeing the Complex | gameplay | The original software-graphics run remained near the start of its preloader after two minutes. With the shared current Ruffle Canvas renderer the PLAY button appeared, the game reached Holding B, and the native Play Dead choice caused the branch-specific Fail screen (“Pretty convincing there”, unique 1, fail count 1). Retry was then selected. | classics-deep/57/proof.json |
| Infiltrating the Airship | gameplay | Reached Operation ready for launch, started the live airship introduction and chose Sticky Hand from the four entry routes. Henry hung from the pink hand on the outside of the ship, and the game advanced to a new set of choices inside the Toppat cargo hold. | classics-deep/58/proof.json |
| Baldi's Basics | gameplay | Entered Story Mode with zero of seven notebooks. Holding W moved through the hall and D strafed, changing the view of the fixed exit sign and doors. The repaired wrapper fit across all four tested viewport sizes. An optional Unity analytics request was blocked. | unity-deep/verified-baldi-fixed/moved.jpg, strafe.jpg, session.log |
| Temple Run 2 | gameplay | Paused an active run, confirmed Restart, and saw score 5,526 and distance 552 reset to zero. One session also showed an empty-cloud course and an undefined track-definition exception. Two fresh runs did not reproduce it. Jumping and collisions remain unverified. | vendor-deep/60/proof.json |
| Cut the Rope | gameplay | Clicked Play and dragged across the first rope. Om Nom received the candy with three stars. The result showed 5,439 points, then the Next button advanced. | unity-deep/rope-display/three-stars.jpg, solved.jpg, next.jpg |
| Fancy Pants Adventure 3 | gameplay | Clicked Play Now in World 3, advanced the bedroom dialogue with Up, and used S at the prompt to jump from the bed. The next frame shows Fancy Pants in the air above the window; left input then moved the hero across the floor toward the bedroom door. The original software-GPU attempt timed out taking its first frame. | classics-deep/63/proof.json |
| Vex 7 | gameplay | Holding D in the playable tutorial hub moved the character X -150 to -132. Horizontal speed rose from zero to 3.6 while the character stayed on the same platform. | vendor-deep/64/proof.json |
| Geometry Dash Lite | gameplay | Selected Stereo Madness in Normal Mode and started Attempt 1. A native pointer press sent the cube into a rotating airborne pose. Esc opened the in-level pause menu and the game recorded a new 3% normal-mode best. | classics-deep/66/proof.json |
| Bloons TD | gameplay | Chose Bloons TD 1 through the hub and New Game. Selected the brown dart tower from Build Towers and placed it on the grass inside the bend. The tower appeared with a range circle and upgrade/sell controls, and money dropped from 650 to 400 while lives remained 40. | classics-deep/80/proof.json |
| Drift Boss | gameplay | Held Space through the driving tutorial. The car turned right and activated checkpoint two. Releasing the key registered the next steering direction. | unity-deep/drift-display/checkpoint3.jpg, held-32.jpg, released-18.jpg |
| Doodle Jump | gameplay | Selected Play. ArrowRight moved the player horizontally while the avatar continued its automatic jump. | root-deep/DoodleJump.json |
| Jetpack Joyride | gameplay | Held the flight control after starting the run. The player rose by more than five world units. | controls-deep/JetpackJoyride/proof.json |
| Jetpack Joyride Hacked | gameplay | Held the flight control after starting the run. The player rose by more than five world units. | controls-deep/JetpackJoyrideHacked/proof.json |
| Doge Miner | gameplay | Clicked through the four-stage introduction and mined once. The mined counter increased from 0 to 1. | scripts/test_arcade_legacy_startup.py |
| Retro Bowl Hacked | gameplay | Set the favorite-team checkbox, started a new Buffalo franchise as coach Devonta Lumpkin, and entered Week 18 against New York J in the modified edition. Native input started the kickoff; the clock went from 2:00 to 1:50 as New York J began its possession. The modified banner was visible. A manually completed pass and the advertised credit/salary display were not tested. | classics-deep/89/proof.json |
| Cookie Clicker Hacked | gameplay | The first normal cookie click changed the visible counter from zero to one. | root-deep/CookieClickerHacked.json |
| Snake Hacked | gameplay | Steered, toggled pause and resume and crossed a wrapping boundary. | root-deep/SnakeHacked.json |
| Subway Surfers Hacked | gameplay | Started a fresh run, steered against a barrier, then opened pause and observed the mission score of 44. | unity-deep/subway-hacked-fixed/pause.jpg, session.log |
| Doodle Jump Hacked | gameplay | Selected Play. ArrowRight moved the player horizontally during the automatic jump. | root-deep/DoodleJumpHacked.json |
| Dr. Mario | gameplay | A fresh one-player Level 00 bottle showed four viruses. Holding Right moved the active red capsule across the top of the bottle; Z rotated its orientation and pressing Down advanced the piece toward the viruses. | emulator-deep/114/proof.json |
| Street Fighter II | gameplay | Selected Arcade, Ryu and normal speed. The fight against Ken opened with both health bars and running clock. ArrowUp changed player Ryu from a grounded stance to an airborne pose. Follow-up directional and attack button inputs were accepted in that match. | emulator-deep/115/proof.json |
| Advance Wars | gameplay | Played Field Training, mission 1, Troop Orders. On the battlefield, moved the hand cursor across tiles under native arrow input; pressing A on an unrequested unit/ground triggered Nell’s “No, not there” correction and another prompt. Unit travel and battle resolution remain unverified. | emulator-deep/116/proof.json |
| Mario Kart Super Circuit | gameplay | First run selected Luigi and Peach Circuit. In a fresh second run selected Peach, 50cc Star Cup. Reached Lap 1/3 in eighth position at a standing start, then held A and steered. The kart yaws, moves away from its start position, and the race clock advances to 00:01.95. | emulator-deep/117/proof.json |
| Metroid Fusion | gameplay | Started File A, followed Samus through the X infection and BSL approach, and reached the live Quarantine Bay briefing. After dismissing that briefing, the HUD read Energy 99. Right turned/moved Samus right; the subsequent A raised her from the platform into a jump, then she landed. | emulator-deep/118/proof.json |
| Mega Man Zero | gameplay | Chose New Game, completed the rescue opening, and reached an active Zero with a health meter. Right moved Zero into the Pantheon group. The jump key sent Zero up above the rocks and the B button produced a combat impact immediately afterward. Repeated input returned Zero to ground among the enemies. | emulator-deep/119/proof.json |
| Kirby Amazing Mirror | gameplay | Entered File 1, reached the opening gate with the playable pink Kirby and three companions, and used Z to jump. The last image shows Kirby above the ground while the companions remain below. | emulator-deep/120/proof.json |
| Sonic Advance | gameplay | Selected Game Start and entered a playable beach stage as Amy Rose. Holding Right moved Amy past a palm and scrolled new terrain into view. Pressing A sent her into the air, she landed, and another A produced the second jump. Stage timer advanced from 00:00.35 to 00:03.82. | emulator-deep/121/proof.json |
| Crush the Castle | gameplay | Old renderer showed an unsupported Flash prompt and remained black after Run Anyway. The shared August 2026 Ruffle reached Play, New Game and Castle 1. Two pointer inputs started and released the first shot, changing the live camera from the emplacement to the castle and producing the reload prompt. | classics-deep/123/proof.json |
| Fireboy and Watergirl | gameplay | Horizontal movement of real Phaser level character while holding the right arrow. | vendor-deep/127/proof.json |
| Fireboy & Watergirl 4: Crystal Temple | gameplay | Horizontal movement of real Phaser level character while holding the right arrow. | vendor-deep/128/proof.json |
| Fireboy & Watergirl: Forest Temple | gameplay | Right arrow moved Fireboy while Watergirl stayed still in the first Forest Temple level. | vendor-deep/129/proof.json |
| Fireboy and Watergirl Hacked (Light Temple) | gameplay | Horizontal movement of real Phaser level character while holding the right arrow. | vendor-deep/131/proof.json |
| Fireboy and Watergirl Forest Temple Hacked | gameplay | Horizontal movement of real Phaser level character while holding the right arrow. | vendor-deep/132/proof.json |
| Fireboy and Watergirl Crystal Temple Hacked | gameplay | Horizontal movement of real Phaser level character while holding the right arrow. | vendor-deep/133/proof.json |
| Merge Cats Defender | gameplay | Entered the first battle and placed a Tabby Gunner in a previously empty tower slot. | controls-deep/MergeCatsDefender/proof.json |
| Merge Cats Defender Hacked | gameplay | Entered the first battle and placed a Tabby Gunner in a previously empty tower slot. | controls-deep/MergeCatsDefenderHacked/proof.json |
| Backgammon | gameplay | Rolled 4 and 1 and moved a white checker from point 24 to the highlighted legal point 23. The board’s checker counts changed. | more-classics/Backgammon/proof.json |
| Pacman | gameplay | Started a round with N after audio initialization. Right-direction input moved the yellow player from x=115 to x=168. | verified-seven-native/Pacman.json |
| Qix | gameplay | ArrowUp moved the player from y=597 to y=592. The shipped game describes itself as a drawing prototype. | verified-seven-native/Qix.json |
| Joust | gameplay | ArrowRight moved the rider from x=100 to x=110.67. Space changed vertical velocity from +38.04 to −191.85. | verified-seven-native/Joust.json |
| Tron Light Cycles | gameplay | Turned the blue light cycle downward with S. Its heading changed from [1, 0] to [0, 1] and its trail grew from 2 to 5 cells. | more-classics/TronLightCycles/proof.json |
| Checkers | gameplay | Moved the piece from square 40 to 33 and observed both board squares change. | root-deep/Checkers.json |
| Mastermind | gameplay | Entered 1, 2, 3 and 4, then pressed Enter. The game advanced to guess 2 of 8. | root-deep/Mastermind.json |
| Achtung die Kurve | gameplay | Blue's live trail turned from 120° to 144° as its head moved. Gold continued on its original heading of 178°. | more-classics/AchtungDieKurve/proof.json |
| Dominoes | gameplay | Selected the first domino and placed it in the empty first slot with native keyboard input. | controls-deep/Dominoes/proof.json |
| Bowling | gameplay | Used the aim control to move the release position from 0 to 0.07, then pressed Space to begin the roll. | verified-seven-native/Bowling.json |
| Hearts Classic | gameplay | Received a 13-card hand, picked three cards and confirmed the pass. Selected a legal card and clicked Go to play it. | verified-seven-native/HeartsClassic.json |
| SameGame | gameplay | Clicked adjacent matching colours to select and remove the group. The board changed after the second click. | root-deep/SameGame.json |
| Tower Defense | gameplay | Selected the normal turret in the palette and clicked grid tile (4,2). The empty tile gained 262 green turret pixels. | verified-seven-native/TowerDefense.json |
| JavaScript Racer | gameplay | Held the accelerator. The dashboard speed reached 20 mph. | root-deep/JavaScriptRacer.json |
| Bullet Hell | gameplay | The ship moved right from x=300 to x=308 while firing. Pressing C consumed one bomb (2 to 1). | more-classics/BulletHell/proof.json |
| Cribbage | gameplay | Picking a face-down card revealed the opening cut. The game awarded the first crib with the message “You drew the lower card! You get the first crib.” | more-classics/CribbageClassic/proof.json |
| Crossword | gameplay | Submitted the matching answer for an across clue. The solved count increased from 0 of 16 to 1 of 16. | verified-seven-native/Crossword.json |
| Frogger | gameplay | The full 320 × 480 board fit in three viewports. ArrowRight on desktop and one Hop right tap in portrait and landscape each moved the visible frog from x=159 to x=209. | frogger-viewport/results.json |
| Missile Command | gameplay | Fired a countermeasure at a clear part of the sky. The white detonation at the clicked area increased from 0 to 570 bright pixels. | more-classics/MissileCommand/proof.json |
| Lunar Lander | gameplay | Applied thrust and turned right. The lander and visible exhaust extended from 20 to 29 pixels high, shifted laterally and drew 111 inked pixels instead of 76. | more-classics/LunarLander/proof.json |
| Duck Hunt | gameplay | A visible duck awarded points in normal Level 1. P paused the game and C opened the same-origin creator, whose form launched the named custom level. | more-classics/DuckHunt/proof.json |
| Balatro | gameplay | Started an Ante 1 Small Blind game with target 300, initial four hands/four discards and an eight-card hand. D-pad and Z lifted a chosen card, switched the blue/red hand preview to Hi-Card and played it into the scoring area. | emulator-deep/221/proof.json |
| Circuit Ward | gameplay | Live player Z coordinate moved after holding W in a solo wave. | originals-deep/222/proof.json |
| Slipstream Borough: Police Chase (Preview) | gameplay | Using the accelerator increased the live car speed in a race. | originals-deep/225/proof.json |
| Foldwild: Open-World RPG (Preview) | gameplay | Selected a starter, entered the world and focused the normal game canvas. Holding W moved the active player from z=16 to z=15.4. | root-deep/Foldwild.json |
| Steal a Footballer for Your Team | gameplay | World avatar moved after W from a fresh profile. | originals-deep/227/proof.json |
| Blackout | match setup | Selected Capture the Flag and Office in the normal menu. The match HUD showed Office Tower, two flags, and a three-capture win condition. The software WebGPU run lost its GPU instance during shader compilation before weapon input could be verified. | originals-deep/230/proof.json |
| Getaway | gameplay | Pressed H during an active chase. The HUD changed to Engine off · dark and the pursuit clock and minimap advanced. This cloud GPU rendered the 3D world white. | verified-last-native/Getaway.json |
| Wings | gameplay | Clicking the flying F/A-18F fired one Vulcan round. Live magazine read 600 before and 599 immediately afterward. Chromium timed out on in-flight screenshot compositing; per-action diagnostic readings and menu screenshots are available. | originals-deep/232/proof.json |
| Server Survival | gameplay | Clicked Sandbox Mode and placed a DNS service using the tools and grid. The service count increased from zero to one and the budget fell from $2,000 to $1,950. | verified-last-native/ServerSurvival.json |
| Astray | gameplay | Held Right during active play. The simulated ball moved from x=1 to x=1.01229. | verified-last-native/Astray.json |
| Below the Obvious | gameplay | One valid entry in a daily round scored points and revealed the submitted answer. | originals-deep/235/proof.json |
| JANKOLOCK | gameplay | Normal free movement changed the live hero controller horizontal position. | originals-deep/240/proof.json |
| CITISTEN | gameplay | Opening the active town menu with Escape paused the city simulation, changing its actual time multiplier from 1 to 0. | originals-deep/241/proof.json |
| Gap Glide | gameplay | Space started flight from a stationary Ready state. The HUD switched to Gliding. | controls-deep/SchoolyardGapGlide/proof.json |
| Courtyard Cast | gameplay | Space launched the next character from the normal court. The throw queue advanced. | controls-deep/SchoolyardCourtyardCast/proof.json |
| Brainrot Boulevard: After Dark | gameplay | The normal mobile start button entered the boulevard. Tapping pause from the running HUD opened the game menu. | controls-deep/BrainrotBoulevard/proof.json |
| Capital Drive: Canberra (Preview) | gameplay | In normal 3D Free roam, W then D moved the vehicle 5.754 m, changed heading by 0.079 radians and reached 39 km/h in second gear. Build 385c082ce2af reported no page exception or external request. Separately, the 2D campaign test used seeded introductory progress and switched between the direct radio route and Milo’s longer case-table handover. | docs/verification/arcade-canberra-2026-11-26/README.md, free-roam-driving.webp and sibling preview folder canberra-park-detail/crew-radio-native-a4/results.json |
| Steal a Basketballer (Preview) | gameplay | World avatar moved after W from a fresh profile. | originals-deep/246/proof.json |
| Chess Workshop | gameplay | The legal move and an independent Stockfish reply appeared in notation. | originals-deep/247/proof.json |
| Tanks and Soldiers (Preview) | gameplay | Live rifle ammunition count decreased after F. | originals-deep/248/proof.json |
| Hextris | gameplay | Started the round, rotated the main hex from lane 0 to 1 with Left, then returned to lane 0 with Right. | more-classics/Hextris/proof.json |
| Jankolock | gameplay | The active match changed the ability from “Receipt Rush / ready” to “Receipt Rush / 7.9s” and disabled it during cooldown. | more-classics/Jankolock/proof.json |
| QWOP | gameplay | The two left-leg controls changed the runner’s thigh angle from 1.57 to 1.35 radians. A completed race was not tested. | more-classics/QWOP/proof.json |
| Slope | unavailable by design | The offline-unavailable notice returned to the arcade through its real Back to Arcade link. The game engine was intentionally removed from this unlisted entry. | root-deep/Slope.json |

## Per-game observations

Each row distinguishes the latest quick fleet attempt from separate game-specific sessions. The last column identifies the direct fleet input when observed.

| Game | Latest fleet attempt | Fleet attempts | Dedicated session | Verified fleet input |
| --- | --- | ---: | --- | --- |
| Soccer Random | No visible change | 2 | gameplay |  |
| Basket Random | Visible response | 2 | gameplay |  |
| Volley Random | Visible response | 2 | gameplay |  |
| Ovo | Animation only | 3 | gameplay |  |
| Run 3 | Test interrupted | 2 | gameplay |  |
| Snake | Animation only | 3 | gameplay |  |
| Chrome Dino | Game control verified | 3 |  | key:Space |
| Breakout | Game control verified | 2 |  | key:ArrowRight |
| Character Alsen | Protected shell | 1 |  |  |
| Gladihoppers | Animation only | 1 | gameplay |  |
| Burrito Bison | No visible change | 2 | gameplay |  |
| BitLife | Animation only | 1 | gameplay |  |
| Subway Surfers | Visible response | 1 | gameplay |  |
| A Dark Room | Game control verified | 4 |  | Click #lightButton |
| Stranded In Isekai | Visible response | 2 | gameplay |  |
| Papa's Pizzeria | Animation only | 1 | gameplay |  |
| Retro Bowl | No visible change | 2 | gameplay |  |
| Super Hot | Animation only | 3 | gameplay |  |
| 10 Minutes Till Dawn | Visible response | 1 | gameplay |  |
| Fleeing the Complex | Animation only | 2 | gameplay |  |
| Infiltrating the Airship | Animation only | 2 | gameplay |  |
| Baldi's Basics | Animation only | 2 | gameplay |  |
| Temple Run 2 | Animation only | 1 | gameplay |  |
| Cut the Rope | Animation only | 3 | gameplay |  |
| Fancy Pants Adventure 3 | Animation only | 5 | gameplay |  |
| Vex 7 | Animation only | 2 | gameplay |  |
| Geometry Dash Lite | No visible change | 1 | gameplay |  |
| Cookie Clicker | Game control verified | 1 |  | Click #bigCookie + Click #bigCookie |
| Bloons TD | Visible response | 1 | gameplay |  |
| Drift Boss | Animation only | 1 | gameplay |  |
| Doodle Jump | Animation only | 1 | gameplay |  |
| Chess | Game control verified | 2 |  | drag:.square-e2>.square-e4 |
| Jetpack Joyride | Animation only | 2 | gameplay |  |
| Jetpack Joyride Hacked | Animation only | 2 | gameplay |  |
| Doge Miner | Animation only | 2 | gameplay |  |
| Retro Bowl Hacked | No visible change | 2 | gameplay |  |
| Cookie Clicker Hacked | Frame unavailable | 3 | gameplay |  |
| Breakout Hacked | Game control verified | 2 |  | key:ArrowRight |
| Snake Hacked | Game control verified | 3 | gameplay | Click #pause-btn |
| Subway Surfers Hacked | No visible change | 1 | gameplay |  |
| Doodle Jump Hacked | Animation only | 1 | gameplay |  |
| Dr. Mario | Animation only | 2 | gameplay |  |
| Street Fighter II | Animation only | 2 | gameplay |  |
| Advance Wars | Animation only | 2 | gameplay |  |
| Mario Kart Super Circuit | Animation only | 2 | gameplay |  |
| Metroid Fusion | Animation only | 2 | gameplay |  |
| Mega Man Zero | Visible response | 2 | gameplay |  |
| Kirby Amazing Mirror | Animation only | 2 | gameplay |  |
| Sonic Advance | Animation only | 2 | gameplay |  |
| Crush the Castle | Visible response | 1 | gameplay |  |
| Fireboy and Watergirl | Animation only | 1 | gameplay |  |
| Fireboy & Watergirl 4: Crystal Temple | Animation only | 1 | gameplay |  |
| Fireboy & Watergirl: Forest Temple | Animation only | 1 | gameplay |  |
| Fireboy and Watergirl Hacked (Light Temple) | Animation only | 1 | gameplay |  |
| Fireboy and Watergirl Forest Temple Hacked | Animation only | 1 | gameplay |  |
| Fireboy and Watergirl Crystal Temple Hacked | Animation only | 1 | gameplay |  |
| Merge Cats Defender | Animation only | 2 | gameplay |  |
| Merge Cats Defender Hacked | Animation only | 1 | gameplay |  |
| Archery | Game control verified | 4 |  | key:ArrowRight |
| Free Throw | Game control verified | 2 |  | key:Space |
| Backgammon | Start control responded | 2 | gameplay |  |
| Pacman | No visible change | 1 | gameplay |  |
| Qix | Visible response | 1 | gameplay |  |
| Joust | Animation only | 2 | gameplay |  |
| Tron Light Cycles | No visible change | 1 | gameplay |  |
| Puzzle 15 | Game control verified | 1 |  | key:ArrowRight + key:ArrowLeft + key:ArrowDown + key:ArrowUp |
| Peg Solitaire | Game control verified | 2 |  | Click [data-row="3"][data-col="1"] + Click [data-row="3"][data-col="3"] |
| Checkers | Visible response | 2 | gameplay |  |
| Reversi | Game control verified | 2 |  | Click .square:has(.hint-b), .square:has(.hint-w) |
| Mastermind | Visible response | 2 | gameplay |  |
| Nim | Game control verified | 1 |  | Click button.take[data-n="1"] |
| Dots and Boxes | Game control verified | 1 |  | Click .hline |
| Ultimate Tic-Tac-Toe | Game control verified | 1 |  | Click .active-board .cell, .small-board .cell |
| Klondike Solitaire | Game control verified | 1 |  | Click #stock |
| FreeCell | Game control verified | 2 |  | Click .cascade .card:last-child + Click .cell.empty |
| Blackjack | Game control verified | 1 |  | Click .deal-action |
| Video Poker | Game control verified | 1 |  | Click #deal-btn |
| Yahtzee | Game control verified | 1 |  | Click #roll |
| Go Fish | Game control verified | 1 |  | Click #yourCards .card |
| War | Game control verified | 1 |  | Click #actionBtn |
| Word Search | Game control verified | 2 |  | Click [data-x="0"][data-y="0"] |
| Word Ladder | Game control verified | 2 |  | fill:#word:zzzz + Click #submitBtn |
| Word Scramble | Game control verified | 1 |  | Click #reshuffleBtn |
| Darts 501 | Game control verified | 1 |  | Click #throwBtn |
| Mahjong Lite | Game control verified | 1 |  | Click #hintBtn |
| Sokoban | Game control verified | 2 |  | key:ArrowRight + key:ArrowLeft + key:ArrowDown + key:ArrowUp |
| Tower of Hanoi | Game control verified | 2 |  | Click #disk-1 + Click #tower-b |
| Nonogram | Game control verified | 1 |  | Click .playable |
| Battleship | Game control verified | 2 |  | Click #computer-board .cell |
| Boggle | Game control verified | 1 |  | Click #new |
| Achtung die Kurve | Visible response | 1 | gameplay |  |
| Dominoes | Game control verified | 4 | gameplay | activate:#block1 + activate:#mesto1 |
| Mini Golf | Game control verified | 3 |  | key:ArrowLeft + key:Space |
| Bowling | Visible response | 1 | gameplay |  |
| Hearts Classic | No visible change | 1 | gameplay |  |
| Spider Solitaire | Game control verified | 3 |  | double:.stock |
| SameGame | Visible response | 1 | gameplay |  |
| Tower Defense | No visible change | 2 | gameplay |  |
| JavaScript Racer | Frame unavailable | 2 | gameplay |  |
| Rhythm | Game control verified | 2 |  | hold:s |
| Bullet Hell | Frame unavailable | 2 | gameplay |  |
| Cribbage | Animation only | 1 | gameplay |  |
| Crossword | Visible response | 2 | gameplay |  |
| Gomoku | Game control verified | 2 |  | Click #board .cell |
| Mancala | Game control verified | 3 |  | Click .pit.active |
| Asteroids | Game control verified | 2 |  | key:Space + key:ArrowRight |
| Frogger | Game control verified | 3 | gameplay | key:ArrowRight |
| Missile Command | Visible response | 1 | gameplay |  |
| Lunar Lander | No visible change | 1 | gameplay |  |
| Space Invaders | Game control verified | 3 |  | key:ArrowRight |
| Duck Hunt | Animation only | 2 | gameplay |  |
| Balatro | Animation only | 2 | gameplay |  |
| Circuit Ward | Start control responded | 1 | gameplay |  |
| Tag Relay | Game control verified | 2 |  | key:d |
| Spline Ride | Game control verified | 2 |  | Click #view |
| Slipstream Borough: Police Chase (Preview) | Visible response | 3 | gameplay |  |
| Foldwild: Open-World RPG (Preview) | Visible response | 1 | gameplay |  |
| Steal a Footballer for Your Team | Frame unavailable | 2 | gameplay |  |
| Night Shift | Game control verified | 3 |  | key:j |
| Borough Run | Game control verified | 4 |  | key:p |
| Blackout | Visible response | 1 | match setup |  |
| Getaway | No visible change | 1 | gameplay |  |
| Wings | Visible response | 1 | gameplay |  |
| Server Survival | Visible response | 4 | gameplay |  |
| Astray | Animation only | 1 | gameplay |  |
| Below the Obvious | Animation only | 2 | gameplay |  |
| JANKOLOCK | Animation only | 3 | gameplay |  |
| CITISTEN | Frame unavailable | 2 | gameplay |  |
| Lane Run | Game control verified | 2 |  | key:ArrowRight |
| Gap Glide | Game control verified | 4 | gameplay | key:Space |
| Courtyard Cast | Game control verified | 4 | gameplay | key:Space |
| Brainrot Boulevard: After Dark | Test interrupted | 4 | gameplay |  |
| Capital Drive: Canberra (Preview) | Test interrupted | 2 | gameplay |  |
| Steal a Basketballer (Preview) | Frame unavailable | 2 | gameplay |  |
| Chess Workshop | Visible response | 2 | gameplay |  |
| Tanks and Soldiers (Preview) | Visible response | 2 | gameplay |  |
| 2048 (unlisted) | Game control verified | 2 |  | key:ArrowLeft + key:ArrowUp + key:ArrowRight + key:ArrowDown |
| Garage Borough (unlisted) | Game control verified | 3 |  | Click #hire |
| Hextris (unlisted) | Start control responded | 2 | gameplay |  |
| Jankolock (unlisted) | Start control responded | 2 | gameplay |  |
| QWOP (unlisted) | Animation only | 2 | gameplay |  |
| Slope (unlisted) | Unavailable by design | 3 | unavailable by design |  |

## Reproduction

Run from a checkout with the game assets present and Python Playwright, Pillow and Chromium available.

```sh
python3 -B scripts/playtest_arcade_fleet.py --output <new-external-run-dir>
python3 -B scripts/playtest_arcade_fleet.py --games 8,11 --output <new-retry-dir>
python3 -B scripts/summarize_arcade_playtests.py <first-run-dir> <retry-dir> --observations docs/verification/arcade-native-controls-2026-11-26.json
```
