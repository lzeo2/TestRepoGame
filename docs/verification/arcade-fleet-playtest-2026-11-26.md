# Arcade fleet interaction results

142 game projects, 221 isolated browser attempts.
35 titles had a verified game-control change in at least one fleet attempt.
Combining that evidence with dedicated gameplay observations covers 48 distinct titles.

## Coverage

Chromium used real pointer and keyboard events against local game entry pages.
A game control counts as verified when a game-specific state value or board element changed after its action.
Visible response means the frame changed after input following a still sample.
The animation-only group also changed during the idle sample.
Start control measures entry into a new visible screen.
The remaining outcomes need a deeper game-specific route.
Protected chat coverage stops at its shell. These short sessions do not measure completion of entire stories, device frame rates or multiplayer.

## Latest outcome per title

| Outcome | Titles |
| --- | ---: |
| Game control verified | 35 |
| Visible response | 33 |
| Start control responded | 4 |
| Animation only | 38 |
| No visible change | 18 |
| Frame unavailable | 5 |
| Protected shell | 1 |
| Test interrupted | 8 |

## Runs

A run records the starting Git revision. Source repairs and targeted retries occurred during this sweep.
An asset or script loaded by an earlier attempt can differ from a later one.
Each run directory contains JSON observations and captured frames.

| Run | Starting revision | Entries |
| --- | --- | ---: |
| interaction-pass-01 | `d5c2e95b2857` | 142 |
| interaction-targeted-02 | `d5c2e95b2857` | 16 |
| interaction-targeted-03 | `a6f904aa2e38` | 32 |
| interaction-targeted-04 | `e6b9475f5850` | 30 |
| interaction-targeted-06 | `03d28d3b2ecf` | 1 |

## Dedicated native-input observations

The following longer sessions used individual game controls. Scope identifies exactly how far the evidence reached.
Receipt paths refer to the external session folder or a tracked test script.

| Game | Scope | Observation | Receipt |
| --- | --- | --- | --- |
| Run 3 | gameplay | Started Explore from the native character menu. The runner entered the tunnel, then received left, right and jump inputs. The play and steer frames show the live level. | run3-play.png, run3-steer.png |
| Stranded In Isekai | entry | Holding Space on the cover opened map 1 and instantiated its character. Movement and combat on that map need a longer session. | scripts/test_arcade_legacy_startup.py |
| Jetpack Joyride | entry | The Phaser GamePlay scene mounted. A canvas tap and 600 ms hold completed with zero uncaught errors or failed requests. The observation did not measure the avatar’s altitude. | scripts/test_arcade_legacy_startup.py |
| Jetpack Joyride Hacked | entry | The Phaser GamePlay scene mounted. A canvas tap and 600 ms hold completed with zero uncaught errors or failed requests. The observation did not measure the avatar’s altitude. | scripts/test_arcade_legacy_startup.py |
| Doge Miner | gameplay | Clicked through the four-stage introduction and mined once. The mined counter increased from 0 to 1. | scripts/test_arcade_legacy_startup.py |
| Dr. Mario | gameplay | A fresh one-player Level 00 bottle showed four viruses. Holding Right moved the active red capsule across the top of the bottle; Z rotated its orientation and pressing Down advanced the piece toward the viruses. | emulator-deep/114/proof.json |
| Street Fighter II | gameplay | Selected Arcade, Ryu and normal speed. The fight against Ken opened with both health bars and running clock. ArrowUp changed player Ryu from a grounded stance to an airborne pose. Follow-up directional and attack button inputs were accepted in that match. | emulator-deep/115/proof.json |
| Advance Wars | gameplay | Played Field Training, mission 1, Troop Orders. On the battlefield, moved the hand cursor across tiles under native arrow input; pressing A on an unrequested unit/ground triggered Nell’s “No, not there” correction and another prompt. Unit travel and battle resolution remain unverified. | emulator-deep/116/proof.json |
| Mario Kart Super Circuit | gameplay | First run selected Luigi and Peach Circuit. In a fresh second run selected Peach, 50cc Star Cup. Reached Lap 1/3 in eighth position at a standing start, then held A and steered. The kart yaws, moves away from its start position, and the race clock advances to 00:01.95. | emulator-deep/117/proof.json |
| Metroid Fusion | story | Selected File A and started the Metroid Fusion story. Advanced the captioned spaceship/asteroid narrative to the planet scene. On-foot movement and firing as Samus were not verified in this capture. | emulator-deep/118/proof.json |
| Kirby Amazing Mirror | gameplay | Entered File 1, reached the opening gate with the playable pink Kirby and three companions, and used Z to jump. The last image shows Kirby above the ground while the companions remain below. | emulator-deep/120/proof.json |
| Balatro | gameplay | Started an Ante 1 Small Blind game with target 300, initial four hands/four discards and an eight-card hand. D-pad and Z lifted a chosen card, switched the blue/red hand preview to Hi-Card and played it into the scoring area. | emulator-deep/221/proof.json |
| Circuit Ward | gameplay | Live player Z coordinate moved after holding W in a solo wave. Recorded inputs were Click #startSolo, Hold W. | originals-deep/222/proof.json |
| Below the Obvious | gameplay | One valid entry in a daily round scored points and revealed the submitted answer. Recorded inputs were Click #playBtn, Keyboard answer "Barcelona" then Enter. | originals-deep/235/proof.json |
| Steal a Basketballer (Preview) | gameplay | World avatar moved after W from a fresh profile. Recorded inputs were Click #start, Hold W. | originals-deep/246/proof.json |
| Chess Workshop | gameplay | The legal move and an independent Stockfish reply appeared in notation. Recorded inputs were Mouse drag e2 to e4. | originals-deep/247/proof.json |
| Tanks and Soldiers (Preview) | gameplay | Live rifle ammunition count decreased after F. Recorded inputs were Select touch control mode, Click #deploy, Hold F to fire. | originals-deep/248/proof.json |

## Per-game observations

The latest result is shown for each entry. The final column names the latest direct control proof from any listed run, when available.

| Game | Latest result | Attempts | Verified control or value |
| --- | --- | ---: | --- |
| Soccer Random | No visible change | 2 |  |
| Basket Random | Visible response | 2 |  |
| Volley Random | Visible response | 2 |  |
| Ovo | Animation only | 2 |  |
| Run 3 | Test interrupted | 2 |  |
| Snake | Animation only | 3 |  |
| Chrome Dino | Game control verified | 3 | key:Space |
| Breakout | Game control verified | 2 | key:ArrowRight |
| Character Alsen | Protected shell | 1 |  |
| Gladihoppers | Animation only | 1 |  |
| Burrito Bison | No visible change | 2 |  |
| BitLife | Animation only | 1 |  |
| Subway Surfers | Visible response | 1 |  |
| A Dark Room | Animation only | 2 |  |
| Stranded In Isekai | Visible response | 2 |  |
| Papa's Pizzeria | Animation only | 1 |  |
| Retro Bowl | No visible change | 2 |  |
| Super Hot | Animation only | 3 |  |
| 10 Minutes Till Dawn | Visible response | 1 |  |
| Fleeing the Complex | Animation only | 2 |  |
| Infiltrating the Airship | Animation only | 2 |  |
| Baldi's Basics | Animation only | 2 |  |
| Temple Run 2 | Animation only | 1 |  |
| Cut the Rope | Test interrupted | 2 |  |
| Fancy Pants Adventure 3 | Test interrupted | 3 |  |
| Vex 7 | Animation only | 2 |  |
| Geometry Dash Lite | No visible change | 1 |  |
| Cookie Clicker | Game control verified | 1 | Click #bigCookie + Click #bigCookie |
| Bloons TD | Visible response | 1 |  |
| Drift Boss | Animation only | 1 |  |
| Doodle Jump | Animation only | 1 |  |
| Chess | Game control verified | 2 | drag:.square-e2>.square-e4 |
| Jetpack Joyride | Animation only | 2 |  |
| Jetpack Joyride Hacked | Animation only | 2 |  |
| Doge Miner | Animation only | 2 |  |
| Retro Bowl Hacked | No visible change | 2 |  |
| Cookie Clicker Hacked | Test interrupted | 2 |  |
| Breakout Hacked | Game control verified | 2 | key:ArrowRight |
| Snake Hacked | Game control verified | 3 | Click #pause-btn |
| Subway Surfers Hacked | No visible change | 1 |  |
| Doodle Jump Hacked | Animation only | 1 |  |
| Dr. Mario | Animation only | 1 |  |
| Street Fighter II | Animation only | 1 |  |
| Advance Wars | Visible response | 1 |  |
| Mario Kart Super Circuit | Animation only | 1 |  |
| Metroid Fusion | Animation only | 1 |  |
| Mega Man Zero | Animation only | 1 |  |
| Kirby Amazing Mirror | Visible response | 1 |  |
| Sonic Advance | Visible response | 1 |  |
| Crush the Castle | Visible response | 1 |  |
| Fireboy and Watergirl | Animation only | 1 |  |
| Fireboy & Watergirl 4: Crystal Temple | Animation only | 1 |  |
| Fireboy & Watergirl: Forest Temple | Animation only | 1 |  |
| Fireboy and Watergirl Hacked (Light Temple) | Animation only | 1 |  |
| Fireboy and Watergirl Forest Temple Hacked | Animation only | 1 |  |
| Fireboy and Watergirl Crystal Temple Hacked | Animation only | 1 |  |
| Merge Cats Defender | Animation only | 2 |  |
| Merge Cats Defender Hacked | Animation only | 1 |  |
| Archery | Visible response | 3 |  |
| Free Throw | Game control verified | 2 | key:Space |
| Backgammon | Start control responded | 2 |  |
| Pacman | No visible change | 1 |  |
| Qix | Visible response | 1 |  |
| Joust | Animation only | 2 |  |
| Tron Light Cycles | No visible change | 1 |  |
| Puzzle 15 | Game control verified | 1 | key:ArrowRight + key:ArrowLeft + key:ArrowDown + key:ArrowUp |
| Peg Solitaire | Game control verified | 2 | Click [data-row="3"][data-col="1"] + Click [data-row="3"][data-col="3"] |
| Checkers | Visible response | 2 |  |
| Reversi | Game control verified | 2 | Click .square:has(.hint-b), .square:has(.hint-w) |
| Mastermind | Visible response | 2 |  |
| Nim | Game control verified | 1 | Click button.take[data-n="1"] |
| Dots and Boxes | Game control verified | 1 | Click .hline |
| Ultimate Tic-Tac-Toe | Game control verified | 1 | Click .active-board .cell, .small-board .cell |
| Klondike Solitaire | Game control verified | 1 | Click #stock |
| FreeCell | Game control verified | 2 | Click .cascade .card:last-child + Click .cell.empty |
| Blackjack | Game control verified | 1 | Click .deal-action |
| Video Poker | Game control verified | 1 | Click #deal-btn |
| Yahtzee | Game control verified | 1 | Click #roll |
| Go Fish | Game control verified | 1 | Click #yourCards .card |
| War | Game control verified | 1 | Click #actionBtn |
| Word Search | Game control verified | 2 | Click [data-x="0"][data-y="0"] |
| Word Ladder | Game control verified | 2 | fill:#word:zzzz + Click #submitBtn |
| Word Scramble | Game control verified | 1 | Click #reshuffleBtn |
| Darts 501 | Game control verified | 1 | Click #throwBtn |
| Mahjong Lite | Game control verified | 1 | Click #hintBtn |
| Sokoban | Visible response | 1 |  |
| Tower of Hanoi | No visible change | 1 |  |
| Nonogram | Game control verified | 1 | Click .playable |
| Battleship | Game control verified | 2 | Click #computer-board .cell |
| Boggle | Game control verified | 1 | Click #new |
| Achtung die Kurve | Visible response | 1 |  |
| Dominoes | No visible change | 1 |  |
| Mini Golf | No visible change | 2 |  |
| Bowling | Visible response | 1 |  |
| Hearts Classic | No visible change | 1 |  |
| Spider Solitaire | Visible response | 2 |  |
| SameGame | Visible response | 1 |  |
| Tower Defense | No visible change | 2 |  |
| JavaScript Racer | Frame unavailable | 2 |  |
| Rhythm | No visible change | 1 |  |
| Bullet Hell | Frame unavailable | 2 |  |
| Cribbage | Animation only | 1 |  |
| Crossword | Visible response | 2 |  |
| Gomoku | Game control verified | 2 | Click #board .cell |
| Mancala | Game control verified | 3 | Click .pit.active |
| Asteroids | Game control verified | 2 | key:Space + key:ArrowRight |
| Frogger | Animation only | 1 |  |
| Missile Command | Visible response | 1 |  |
| Lunar Lander | No visible change | 1 |  |
| Space Invaders | Animation only | 2 |  |
| Duck Hunt | No visible change | 1 |  |
| Balatro | Test interrupted | 1 |  |
| Circuit Ward | Start control responded | 1 |  |
| Tag Relay | Game control verified | 2 | key:d |
| Spline Ride | Game control verified | 2 | Click #view |
| Slipstream Borough: Police Chase (Preview) | Visible response | 2 |  |
| Foldwild: Open-World RPG (Preview) | Visible response | 1 |  |
| Steal a Footballer for Your Team | Frame unavailable | 2 |  |
| Night Shift | Visible response | 1 |  |
| Borough Run | Visible response | 1 |  |
| Blackout | Visible response | 1 |  |
| Getaway | No visible change | 1 |  |
| Wings | Visible response | 1 |  |
| Server Survival | Test interrupted | 2 |  |
| Astray | Animation only | 1 |  |
| Below the Obvious | Animation only | 2 |  |
| JANKOLOCK | Visible response | 2 |  |
| CITISTEN | Frame unavailable | 2 |  |
| Lane Run | Game control verified | 2 | key:ArrowRight |
| Gap Glide | Visible response | 3 |  |
| Courtyard Cast | Visible response | 1 |  |
| Brainrot Boulevard: After Dark | Test interrupted | 2 |  |
| Capital Drive: Canberra (Preview) | Test interrupted | 2 |  |
| Steal a Basketballer (Preview) | Frame unavailable | 2 |  |
| Chess Workshop | Visible response | 2 |  |
| Tanks and Soldiers (Preview) | Visible response | 2 |  |
| 2048 (unlisted) | Game control verified | 2 | key:ArrowLeft + key:ArrowUp + key:ArrowRight + key:ArrowDown |
| Garage Borough (unlisted) | Visible response | 2 |  |
| Hextris (unlisted) | Start control responded | 2 |  |
| Jankolock (unlisted) | Start control responded | 2 |  |
| QWOP (unlisted) | Animation only | 2 |  |
| Slope (unlisted) | No visible change | 2 |  |

## Reproduction

Run from a checkout with the game assets present and Python Playwright, Pillow and Chromium available.

```sh
python3 -B scripts/playtest_arcade_fleet.py --output <new-external-run-dir>
python3 -B scripts/playtest_arcade_fleet.py --games 8,11 --output <new-retry-dir>
python3 -B scripts/summarize_arcade_playtests.py <first-run-dir> <retry-dir> --observations docs/verification/arcade-native-controls-2026-11-26.json
```
