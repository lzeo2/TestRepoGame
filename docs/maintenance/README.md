# Maintenance manual: UNBLOCKMATH // ARCADE

This is the starting point for changing any existing game or site feature. Read
[AGENTS](../../AGENTS.md) and [CODE_QUALITY](../CODE_QUALITY.md) first. The manual
is a source-grounded audit and maintenance guide, not a claim that every legacy
game meets today's standards. Some engines are compiled, some rights are
unverified, and some native interactions remain held.

The catalog contains **115 registered games**. Git contains **122 game projects**
plus the shared `Games/_emulatorjs` runtime. The seven unregistered games are
2048, Foldwild, Garage Borough, Hextris, QWOP, Slipstream Borough and Slope. Sparse exclusion is intentional: a missing
local Games folder does not mean a broken deployment. See [inventory](inventory.json)
for exact tracked counts, entry hashes, source-tree hashes and manual paths.

## How a future agent should use this manual

1. Find the exact project below. Read its complete page, especially source-review
   coverage, actual state owner, dependencies, audit findings and verification.
2. Check current source, not just screenshots or a familiar game name. Use
   `git show HEAD:Games/ExactFolder/index.html` and inspect relevant callees.
   Origin can lag local work. Do not assume an upstream game's controls, save keys
   or license apply to this adapted version.
3. Trace every caller of the shared boundary before a fix. Reuse its existing
   helper; avoid a replacement engine, configuration framework or cosmetic overlay
   hiding broken gameplay. Record the root cause, smallest patch and one regression.
4. Preserve Character AI's read-only boundary, disabled proxy, vendor notices,
   supplied original model bytes and any Eaglercraft GPL/ownership safeguards.
   Audit findings do not authorize deleting content or changing copyright policy.
5. Obtain a narrow checkout only if assets/browser verification require it. Check
   disk first, record the sparse selection, assign disjoint paths and restore the
   selection afterward. No installs, broad Games checkout or persistent servers.
6. Verify source/syntax, then actual normal-input play. Exercise start, controls,
   pause if present, completion/failure, restart and storage failure. A load-only
   smoke pass does not prove a round works; a layout fixture is not gameplay.
7. Commit only owned paths. Update the affected manual and inventory after the
   source milestone, then run the coverage checker. Explain any stale historical
   report instead of silently deleting it. Keep implementation and reporting commits
   bounded and reviewable.
8. Registration and publication are separate decisions. Before a separately
   authorized push, run the unchanged **full** registered-catalog browser gate.
   Never filter failures, replace touch with mouse, use state grants as positive
   proof or interpret a lost process status as success.

### Documentation check

```sh
python3 -B scripts/check_maintenance_docs.py
```

The checker compares Git-backed source trees/entries against the inventory and
requires one correctly identified page with all nine maintenance sections for
every game. It is a coverage/staleness guard, not a semantic reviewer. After an
inspected and committed source change, refresh deliberately:

```sh
python3 -B scripts/check_maintenance_docs.py --refresh
python3 -B scripts/check_maintenance_docs.py
```

The index below is refreshed from the canonical catalog/inventory. Per-game prose
must still be reviewed and maintained by a human/agent, not blindly regenerated.

## Site-feature guides

| Feature boundary | Maintenance guide |
| --- | --- |
| Catalog loading, launch, categories, search, sort, chips, favorites, recent history and metadata | [Portal](site/portal.md) |
| Theme, local fonts, style tokens, keyboard, touch, focus and visual review | [Accessibility and style](site/accessibility-and-style.md) |
| localStorage keys, formats, failures, privacy and origin-wide state | [Browser state](site/browser-state.md) |
| Static/native tests, focused proof, screenshots, sparse full gate and limitations | [Testing](site/testing.md) |
| Static Netlify publication, routes, functions, headers and asset delivery | [Deployment and routing](site/deployment-and-routing.md) |
| Ultraviolet launcher, missing dependencies, service-worker scope and disabled Bare backend | [Disabled proxy](site/proxy-disabled.md) |
| Shared EmulatorJS bootstrap, local data/cores and ROM boundaries | [Emulation runtime](site/emulation-runtime.md) |
| Rights evidence, source/licensing gates, sparse/storage discipline and protected content | [Rights and sparse workflow](site/rights-and-sparse-workflow.md) |
| Renderers, whole-model animation, asset budgets, manual LAN and real hardware gates | [3D games and budgets](site/3d-games-and-budgets.md) |

No guide grants new proxy/backend permission. Local assets do not automatically
prove cold offline closure, legal redistribution rights, absence of dormant
analytics or target-device performance.

## Audit, refurbishment and month outlook

- [Audit scope and evidence contract](SCOPE.md): what the run covers and what it
  explicitly cannot certify.
- [Car source/QA checkpoint](../car-arcade-integration.md): two authorized original projects, existing-port review/partial polish and explicit release holds.
- [Integrated audit](AUDIT.md): ranked, triaged findings and actual verification;
  machine candidates separated from confirmed defects.
- [Reviewed previews](previews.md): seven real fresh-run captures with Main's
  visual judgment and remaining readability limits.
- [Refurbishment plan](REFURBISHMENT.md): small waves, acceptance criteria and
  future-agent task contracts, not 115 speculative redesigns.
- [3D expansion outlook](3d-outlook.md): source-verified research and conditional
  slots for a few additional lightweight experiences over four weeks.
- [Static tree audit](audits/static-tree.md), [complexity review](audits/complexity.md),
  [portal review](audits/portal.md), [infrastructure review](audits/infrastructure.md),
  [3D review](audits/3d.md) and [Foldwild input diagnosis](audits/foldwild-input.md).
- Game audit groups: [61](audits/games-61.md), [62](audits/games-62.md),
  [63](audits/games-63.md), [64](audits/games-64.md), [65](audits/games-65.md),
  [66](audits/games-66.md), [67](audits/games-67.md), [68](audits/games-68.md).

Prior evidence remains useful but dated: [overnight gate](../overnight-gate.md),
[Foldwild M1](../foldwild-milestone-review.md), [M1 layout correction](../foldwild-milestone-layout.md),
[M2 held review](../foldwild-m2-review.md) and [M2 failed-input investigation](../foldwild-m2-finish.md).
A later diagnosis does not retroactively turn those failed runs green. Follow the
integrated audit for fresh verification and each project's current status.

## Registered and unregistered game index

The directory links point to actual deployed entry paths. When sparse, use Git to
inspect them; do not materialize all assets just to make local Markdown links open.
Unregistered entries are maintenance projects, not portal additions. No new ID is
reserved by appearing here.

<!-- game-index:start -->
| ID/status | Game maintenance page | Entry |
| --- | --- | --- |
| 4 | [Soccer Random](games/004-soccerrandom.md) | `Games/SoccerRandom/index.html` |
| 5 | [Basket Random](games/005-basketrandom.md) | `Games/BasketRandom/index.html` |
| 6 | [Volley Random](games/006-volleyrandom.md) | `Games/VolleyRandom/index.html` |
| 7 | [Ovo](games/007-ovo.md) | `Games/Ovo/1.4.5/index.html` |
| 8 | [Run 3](games/008-run3.md) | `Games/Run3/tn6pS9dCf37xAhkJv/index.html` |
| 9 | [Snake](games/009-snake.md) | `Games/Snake/index.html` |
| 10 | [Chrome Dino](games/010-chromedino.md) | `Games/ChromeDino/dino.html` |
| 11 | [Breakout](games/011-breakoutclassic.md) | `Games/BreakoutClassic/index.html` |
| 14 | [Character Alsen](games/014-character-ai.md) | `Games/Character AI/Alsen.html` |
| 47 | [Gladihoppers](games/047-gladihoppers.md) | `Games/Gladihoppers/index.html` |
| 48 | [Burrito Bison](games/048-burritobison.md) | `Games/BurritoBison/index.html` |
| 49 | [BitLife](games/049-bitlife.md) | `Games/BitLife/index.html` |
| 50 | [Subway Surfers](games/050-subwaysurfers.md) | `Games/SubwaySurfers/index.html` |
| 51 | [A Dark Room](games/051-adarkroom.md) | `Games/ADarkRoom/index.html` |
| 52 | [Stranded In Isekai](games/052-strandedinisekai.md) | `Games/StrandedInIsekai/index.html` |
| 53 | [Papa's Pizzeria](games/053-papaspizzeria.md) | `Games/PapasPizzeria/index.html` |
| 54 | [Retro Bowl](games/054-retrobowl.md) | `Games/RetroBowl/index.html` |
| 55 | [Super Hot](games/055-superhot.md) | `Games/Superhot/index.html` |
| 56 | [10 Minutes Till Dawn](games/056-tenminutestilldawn.md) | `Games/TenMinutesTillDawn/index.html` |
| 57 | [Fleeing the Complex](games/057-fleeingthecomplex.md) | `Games/FleeingTheComplex/index.html` |
| 58 | [Infiltrating the Airship](games/058-infiltratingtheairship.md) | `Games/InfiltratingTheAirship/index.html` |
| 59 | [Baldi's Basics](games/059-baldisbasics.md) | `Games/BaldisBasics/index.html` |
| 60 | [Temple Run 2](games/060-templerun2.md) | `Games/TempleRun2/index.html` |
| 62 | [Cut the Rope](games/062-cuttherope.md) | `Games/CutTheRope/index.html` |
| 63 | [Fancy Pants Adventure 3](games/063-fancypantsadventure3.md) | `Games/FancyPantsAdventure3/index.html` |
| 64 | [Vex 7](games/064-vex7.md) | `Games/Vex7/index.html` |
| 66 | [Geometry Dash Lite](games/066-geometrydashlite.md) | `Games/GeometryDashLite/index.html` |
| 79 | [Cookie Clicker](games/079-cookieclicker.md) | `Games/CookieClicker/index.html` |
| 80 | [Bloons TD](games/080-bloonstd.md) | `Games/BloonsTD/index.html` |
| 81 | [Drift Boss](games/081-driftboss.md) | `Games/DriftBoss/index.html` |
| 83 | [Doodle Jump](games/083-doodlejump.md) | `Games/DoodleJump/index.html` |
| 84 | [Chess](games/084-chess.md) | `Games/Chess/index.html` |
| 86 | [Jetpack Joyride](games/086-jetpackjoyride.md) | `Games/JetpackJoyride/index.html` |
| 87 | [Doge Miner](games/087-dogeminer.md) | `Games/DogeMiner/index.html` |
| 89 | [Retro Bowl Hacked](games/089-retrobowlhacked.md) | `Games/RetroBowlHacked/index.html` |
| 90 | [Cookie Clicker Hacked](games/090-cookieclickerhacked.md) | `Games/CookieClickerHacked/index.html` |
| 94 | [Breakout Hacked](games/094-breakouthacked.md) | `Games/BreakoutHacked/index.html` |
| 95 | [Snake Hacked](games/095-snakehacked.md) | `Games/SnakeHacked/index.html` |
| 107 | [Jetpack Joyride Hacked](games/107-jetpackjoyridehacked.md) | `Games/JetpackJoyrideHacked/index.html` |
| 109 | [Doodle Jump Hacked](games/109-doodlejumphacked.md) | `Games/DoodleJumpHacked/index.html` |
| 111 | [Subway Surfers Hacked](games/111-subwaysurfershacked.md) | `Games/SubwaySurfersHacked/index.html` |
| 114 | [Dr. Mario](games/114-drmario.md) | `Games/DrMario/index.html` |
| 115 | [Street Fighter II](games/115-streetfighter2.md) | `Games/StreetFighter2/index.html` |
| 116 | [Advance Wars](games/116-advancewars.md) | `Games/AdvanceWars/index.html` |
| 117 | [Mario Kart Super Circuit](games/117-mariokartsupercircuit.md) | `Games/MarioKartSuperCircuit/index.html` |
| 118 | [Metroid Fusion](games/118-metroidfusion.md) | `Games/MetroidFusion/index.html` |
| 119 | [Mega Man Zero](games/119-megamanzero.md) | `Games/MegaManZero/index.html` |
| 120 | [Kirby Amazing Mirror](games/120-kirbyamazingmirror.md) | `Games/KirbyAmazingMirror/index.html` |
| 121 | [Sonic Advance](games/121-sonicadvance.md) | `Games/SonicAdvance/index.html` |
| 123 | [Crush the Castle](games/123-crushthecastle.md) | `Games/CrushTheCastle/index.html` |
| 127 | [Fireboy and Watergirl](games/127-fireboyandwatergirl.md) | `Games/FireboyAndWatergirl/index.html` |
| 128 | [Fireboy & Watergirl 4: Crystal Temple](games/128-fireboyandwatergirlcrystaltemple.md) | `Games/FireboyAndWatergirlCrystalTemple/index.html` |
| 129 | [Fireboy & Watergirl: Forest Temple](games/129-fireboyandwatergirlforesttemple.md) | `Games/FireboyAndWatergirlForestTemple/index.html` |
| 131 | [Fireboy and Watergirl Hacked (Light Temple)](games/131-fireboyandwatergirlhacked.md) | `Games/FireboyAndWatergirlHacked/index.html` |
| 132 | [Fireboy and Watergirl Forest Temple Hacked](games/132-fireboyandwatergirlforesttemplehacked.md) | `Games/FireboyAndWatergirlForestTempleHacked/index.html` |
| 133 | [Fireboy and Watergirl Crystal Temple Hacked](games/133-fireboyandwatergirlcrystaltemplehacked.md) | `Games/FireboyAndWatergirlCrystalTempleHacked/index.html` |
| 136 | [Merge Cats Defender](games/136-mergecatsdefender.md) | `Games/MergeCatsDefender/index.html` |
| 137 | [Merge Cats Defender Hacked](games/137-mergecatsdefenderhacked.md) | `Games/MergeCatsDefenderHacked/index.html` |
| 149 | [Archery](games/149-archery.md) | `Games/Archery/index.html` |
| 152 | [Free Throw](games/152-freethrow.md) | `Games/FreeThrow/index.html` |
| 154 | [Backgammon](games/154-backgammon.md) | `Games/Backgammon/index.html` |
| 160 | [Pacman](games/160-pacman.md) | `Games/Pacman/index.html` |
| 161 | [Qix](games/161-qix.md) | `Games/Qix/index.html` |
| 162 | [Joust](games/162-joust.md) | `Games/Joust/index.html` |
| 163 | [Tron Light Cycles](games/163-tronlightcycles.md) | `Games/TronLightCycles/index.html` |
| 169 | [Puzzle 15](games/169-puzzle15.md) | `Games/Puzzle15/index.html` |
| 170 | [Peg Solitaire](games/170-pegsolitaire.md) | `Games/PegSolitaire/index.html` |
| 171 | [Checkers](games/171-checkers.md) | `Games/Checkers/index.html` |
| 172 | [Reversi](games/172-reversi.md) | `Games/Reversi/index.html` |
| 174 | [Mastermind](games/174-mastermind.md) | `Games/Mastermind/index.html` |
| 175 | [Nim](games/175-nim.md) | `Games/Nim/index.html` |
| 176 | [Dots and Boxes](games/176-dotsandboxes.md) | `Games/DotsAndBoxes/index.html` |
| 177 | [Ultimate Tic-Tac-Toe](games/177-ultimatetictactoe.md) | `Games/UltimateTicTacToe/index.html` |
| 178 | [Klondike Solitaire](games/178-klondikesolitaire.md) | `Games/KlondikeSolitaire/index.html` |
| 179 | [FreeCell](games/179-freecell.md) | `Games/FreeCell/index.html` |
| 180 | [Blackjack](games/180-blackjack.md) | `Games/Blackjack/index.html` |
| 181 | [Video Poker](games/181-videopoker.md) | `Games/VideoPoker/index.html` |
| 182 | [Yahtzee](games/182-yahtzee.md) | `Games/Yahtzee/index.html` |
| 184 | [Go Fish](games/184-gofish.md) | `Games/GoFish/index.html` |
| 185 | [War](games/185-war.md) | `Games/War/index.html` |
| 186 | [Word Search](games/186-wordsearch.md) | `Games/WordSearch/index.html` |
| 188 | [Word Ladder](games/188-wordladder.md) | `Games/WordLadder/index.html` |
| 190 | [Word Scramble](games/190-wordscramble.md) | `Games/WordScramble/index.html` |
| 191 | [Darts 501](games/191-darts501.md) | `Games/Darts501/index.html` |
| 193 | [Mahjong Lite](games/193-mahjonglite.md) | `Games/MahjongLite/index.html` |
| 195 | [Sokoban](games/195-sokoban.md) | `Games/Sokoban/index.html` |
| 196 | [Tower of Hanoi](games/196-towerofhanoi.md) | `Games/TowerOfHanoi/index.html` |
| 197 | [Nonogram](games/197-nonogram.md) | `Games/Nonogram/index.html` |
| 198 | [Battleship](games/198-battleship.md) | `Games/Battleship/index.html` |
| 199 | [Boggle](games/199-boggle.md) | `Games/Boggle/index.html` |
| 200 | [Achtung die Kurve](games/200-achtungdiekurve.md) | `Games/AchtungDieKurve/index.html` |
| 201 | [Dominoes](games/201-dominoes.md) | `Games/Dominoes/index.html` |
| 202 | [Mini Golf](games/202-minigolf.md) | `Games/MiniGolf/index.html` |
| 203 | [Bowling](games/203-bowling.md) | `Games/Bowling/index.html` |
| 204 | [Hearts Classic](games/204-heartsclassic.md) | `Games/HeartsClassic/index.html` |
| 205 | [Spider Solitaire](games/205-spidersolitaire.md) | `Games/SpiderSolitaire/index.html` |
| 206 | [SameGame](games/206-samegame.md) | `Games/SameGame/index.html` |
| 207 | [Tower Defense](games/207-towerdefense.md) | `Games/TowerDefense/index.html` |
| 208 | [JavaScript Racer](games/208-javascriptracer.md) | `Games/JavaScriptRacer/index.html` |
| 209 | [Rhythm](games/209-rhythm.md) | `Games/Rhythm/index.html` |
| 210 | [Bullet Hell](games/210-bullethell.md) | `Games/BulletHell/index.html` |
| 211 | [Cribbage](games/211-cribbageclassic.md) | `Games/CribbageClassic/index.html` |
| 212 | [Crossword](games/212-crossword.md) | `Games/Crossword/index.html` |
| 213 | [Gomoku](games/213-gomoku.md) | `Games/Gomoku/index.html` |
| 214 | [Mancala](games/214-mancala.md) | `Games/Mancala/index.html` |
| 215 | [Asteroids](games/215-asteroids.md) | `Games/Asteroids/index.html` |
| 216 | [Frogger](games/216-frogger.md) | `Games/Frogger/index.html` |
| 217 | [Missile Command](games/217-missilecommand.md) | `Games/MissileCommand/index.html` |
| 218 | [Lunar Lander](games/218-lunarlander.md) | `Games/LunarLander/index.html` |
| 219 | [Space Invaders](games/219-spaceinvaders.md) | `Games/SpaceInvaders/index.html` |
| 220 | [Duck Hunt](games/220-duckhunt.md) | `Games/DuckHunt/index.html` |
| 221 | [Balatro](games/221-balatro.md) | `Games/Balatro/index.html` |
| 222 | [Circuit Ward](games/222-circuit-ward.md) | `Games/Circuit Ward/index.html` |
| 223 | [Tag Relay](games/223-tag-relay.md) | `Games/Tag Relay/index.html` |
| 224 | [Spline Ride](games/224-spline-ride.md) | `Games/Spline Ride/index.html` |
| Unregistered | [2048](games/unregistered-2048.md) | `Games/2048/index.html` |
| Unregistered | [Foldwild](games/unregistered-foldwild.md) | `Games/Foldwild/index.html` |
| Unregistered | [Garage Borough](games/unregistered-garage-borough.md) | `Games/Garage Borough/index.html` |
| Unregistered | [Hextris](games/unregistered-hextris.md) | `Games/Hextris/index.html` |
| Unregistered | [QWOP](games/unregistered-qwop.md) | `Games/QWOP/index.html` |
| Unregistered | [Slipstream Borough](games/unregistered-slipstream-borough.md) | `Games/Slipstream Borough/index.html` |
| Unregistered | [Slope](games/unregistered-slope.md) | `Games/Slope/index.html` |
<!-- game-index:end -->
