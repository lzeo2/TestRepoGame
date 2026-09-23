# Full Play Audit — 118 games (games.json)

Per-game verdicts from Phase 1 play audit. Verdict line format:
`NAME | functional OK/BROKEN(reason) | slop: none/minor/heavy | keep/fix/remove/candidate-replacement`

Batches were audited by workers; raw batch files live in docs/audit_batches/.

## Verdicts

## Batch 0

2048 | functional OK | slop: minor | scores f=5 a=7 s=6 | fix
Note: WASD-only (arrow keys unhandled), cross-row merge bug in combineRow (i<15 compares across row boundaries), win/lose removes input listener permanently (no restart without reload), emoji comment banners + "Talha - 2048 Game" title.
Age of War | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Soccer Random | functional OK | slop: minor | scores f=9 a=7 s=6 | fix
Note: real Construct 3 build, but ships scrape cruft (ahrefs_ token file, 404/408.html, ubg235.html/frame.html) and title "Soccer Random - unblocked786 GameDistribution".
Basket Random | functional OK | slop: minor | scores f=9 a=7 s=6 | fix
Note: same scrape cruft as Soccer Random incl. @source.txt pointing at gamedistribution.com; title "Basket Random Unblocked".
Volley Random | functional OK | slop: minor | scores f=9 a=7 s=6 | fix
Note: same scrape cruft (ahrefs_ token, ubg235.html, 404/408.html); title "Volley Random - unblocked786 GameDistribution".
Ovo | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Run 3 | functional OK | slop: none | scores f=9 a=9 s=9 | keep
Snake | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Chrome Dino | functional OK | slop: minor | scores f=9 a=9 s=8 | keep
Note: authentic Chromium BSD-licensed build; only quirk is <title>Google Classroom</title> and emoji-heavy repo README (not in-game).
Breakout | functional OK | slop: minor | scores f=7 a=6 s=6 | fix
Note: works (3 levels, powerups, touch/tilt) but ships dead VS project files (Breakout HTML.sln/.vcxproj/.filters), custom <pwr> element, and no in-page controls documentation (space/arrows undiscoverable).
Hextris | functional OK | slop: none | scores f=9 a=9 s=9 | keep
Flappy Bird | functional OK | slop: none | scores f=9 a=9 s=9 | keep
Character Alsen | functional OK | slop: minor | scores f=8 a=8 s=7 | keep
Note: READ-ONLY game; CSS chat-background url missing the data: scheme ("image/svg+xml,..." instead of "data:image/svg+xml,...") causing a 404 that the gate tolerates; scripted keyword bot, not real AI — desc oversells slightly. Quirky emoji/personality copy is deliberate character, kept as minor.
QWOP | functional OK | slop: none | scores f=8 a=8 s=9 | keep
Star Catcher | functional OK | slop: none | scores f=9 a=8 s=9 | keep
## Batch 1

Paddle Duel | functional OK | slop: none | scores f=9 a=7 s=10 | keep
Brick Dash | functional OK | slop: none | scores f=9 a=7 s=10 | keep
Tile Merge | functional OK | slop: none | scores f=8 a=7 s=10 | keep
Match Flip | functional OK | slop: none | scores f=9 a=7 s=9 | keep
FPS | functional OK | slop: none | scores f=8 a=9 s=10 | fix
Letter Boxed | functional OK | slop: none | scores f=9 a=8 s=10 | keep
Boss Rush | functional OK | slop: minor | scores f=9 a=7 s=9 | keep
Grid Heist | functional OK | slop: minor | scores f=9 a=8 s=9 | keep
Last Lantern | functional OK | slop: minor | scores f=9 a=9 s=7 | fix
Queue Escape | functional OK | slop: none | scores f=9 a=8 s=10 | keep
Story Adventure | functional OK | slop: minor | scores f=9 a=8 s=9 | keep
Gladihoppers | functional OK | slop: minor | scores f=9 a=8 s=8 | keep
Burrito Bison | functional OK | slop: minor | scores f=9 a=7 s=8 | keep
BitLife | functional OK | slop: minor | scores f=9 a=7 s=8 | keep
Subway Surfers | functional OK | slop: minor | scores f=9 a=8 s=8 | keep

Notes (only where verdict needs justification):
- FPS: death screen bug — showDeath() sets "YOU DIED"/score/hint, then unconditionally overwrites h1/sub/hint with start-screen defaults at the end of the same function; only the RESPAWN button reflects death. Otherwise outstanding (original software raycaster, 3 weapons, minimap, synthesized audio).
- Last Lantern: file ships a `// TEMP-DEBUG-HOOK (removed before finalizing)` block exposing window.__LL with setPos/forceEnd/force-cheat test API — comment says it should have been removed; strip hook (Grid Heist/Queue Escape keep their hooks read-only and gated, which is fine).
- Boss Rush: pause button glyph swapped from ‖ to ❋❋ (u274B) in JS — cosmetic nit only; game itself solid (waves, boss patterns, auto-aim for touch).
- Minor slop = em-dash in visible copy (Grid Heist menu copy, Story Adventure menu labels, Gladihoppers tagline, Subway Surfers loader, games.json desc for Gladihoppers/Burrito Bison/BitLife/Subway Surfers) — cosmetic, no other checklist hits (no Comic Sans, no ALL-CAPS banner spam, no lorem/placeholder, no dead buttons, no emoji headers; emoji in Match Flip card faces and Queue Escape station labels are legitimate game content).
- All 5 vendored Unity ports (Gladihoppers, Burrito Bison, BitLife, Subway Surfers) load fully offline with provenance comments + XHR/fetch guards; smoke captured all Build assets 200.
## Batch 2
A Dark Room | functional OK | slop: none | scores f=9 a=8 s=10 | keep
Stranded In Isekai | functional OK | slop: none | scores f=8 a=6 s=9 | keep
Papa's Pizzeria | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Retro Bowl | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Super Hot | functional OK | slop: none | scores f=8 a=6 s=9 | keep
10 Minutes Till Dawn | functional OK | slop: minor | scores f=8 a=6 s=8 | keep
  note: wrapper cruft only — invalid `background: ;` declaration and a `JSON.parse("")` try/catch scale hack; invisible to players.
Fleeing the Complex | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Infiltrating the Airship | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Baldi's Basics | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Temple Run 2 | functional OK | slop: none | scores f=9 a=8 s=9 | keep
Fruit Ninja | functional OK | slop: minor | scores f=8 a=7 s=8 | keep
  note: leftover seraph cruft — dead `../../images/ico.ico` favicon ref (404) and "| Seraph" in the title.
Fruit Ninja Hacked | functional BROKEN(advertised hacks are dead code) | slop: heavy | scores f=4 a=6 s=4 | fix
  note: index.html patches `Phaser.Scene.prototype.notifyBombHit/loseLife/update`, but all three are own methods of `class MainScene extends Phaser.Scene` in main.bundle.js (bundles byte-identical to Fruit Ninja) — patches are fully shadowed, so no bomb immunity, no life immunity, no 999999 score; only the "HACKED" badge shows. 23MB vendors bundle duplicated for nothing.
Cut the Rope | functional BROKEN(smoke gate: intro_1024.mp4 net::ERR_ABORTED) | slop: minor | scores f=6 a=8 s=7 | fix
  note: gate FAIL — game's own video code sets `video.src`/`load()` then removes/reloads `#vid` mid-stream, aborting the mp4 (file exists, menu and all assets load; likely trivial to silence). Also dead `../../storage/js/cloak.js` + `../../images/ico.ico` refs (404).
Fancy Pants Adventure 3 | functional OK | slop: minor | scores f=9 a=7 s=7 | keep
  note: dead seraph leftovers — `../../storage/js/cloak.js` 404 and a "CDN" fallback to nonexistent `../../storage/ruffle/ruffle.js` (primary local ruffle loads fine).
Vex 7 | functional OK | slop: minor | scores f=8 a=7 s=7 | keep
  note: leftover archive junk in dir (`ahrefs_*` site-verification file, `@source.txt`) plus dead cloak.js/ico.ico refs; GameDistribution/analytics calls answered by local json/null.js stubs — gate clean.
## Batch 3

House of Hazards | functional OK | slop: minor | scores f=9 a=6 s=8 | keep
Geometry Dash Lite | functional OK | slop: minor | scores f=9 a=7 s=7 | keep
Tetris | functional OK | slop: minor | scores f=8 a=7 s=8 | keep
Pong | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Minesweeper | functional BROKEN(save helpers written inside `<script src=...>` are never executed; first cell click throws "saveState is not defined", reveal never runs — game does nothing) | slop: minor | scores f=1 a=7 s=6 | fix
Tic Tac Toe | functional BROKEN(win path calls undefined saveState — verified PAGEERROR on X-win, result screen never shows, board freezes mid-render) | slop: minor | scores f=3 a=7 s=6 | fix
Connect Four | functional BROKEN(two bugs: columnClick guards `turn!==1` so Yellow can NEVER move in 2-player mode — verified only 1 red disc drops; win path also throws on undefined saveState) | slop: minor | scores f=2 a=7 s=6 | fix
Memory | functional BROKEN(win path reads undefined bestMoves — verified PAGEERROR, win screen never appears after all pairs matched) | slop: minor | scores f=4 a=6 s=6 | fix
Whack-a-Mole | functional BROKEN(end-of-round reads undefined bestScore — verified PAGEERROR at time-up, final-score screen never appears) | slop: minor | scores f=4 a=6 s=6 | fix
Simon Says | functional BROKEN(game-over reads undefined bestLevel — verified PAGEERROR on wrong pad, game-over screen never appears) | slop: minor | scores f=4 a=7 s=7 | fix
Typing Speed | functional BROKEN(main script has SyntaxError: TEXTS array closed with `"];` instead of `];` — startGame undefined, Start Test button is dead; endGame would also throw on undefined bestWPM) | slop: minor | scores f=0 a=7 s=7 | fix
Math Quiz | functional BROKEN(10 rounds play but endGame reads undefined bestScore — verified typeof undefined/undefined, results screen never shows; game-screen has no restart = dead end) | slop: minor | scores f=4 a=7 s=6 | fix
Lights Out | functional BROKEN(win path reads undefined bestLevel — verified undefined, "You Win"/Next Level never shows, board goes dead after solving) | slop: minor | scores f=4 a=7 s=8 | fix
Sudoku | functional BROKEN(first number placement throws "saveState is not defined" — verified PAGEERROR, digit never renders) | slop: minor | scores f=2 a=7 s=7 | fix
Cookie Clicker | functional OK | slop: minor | scores f=9 a=9 s=8 | keep

Root cause for the 10 BROKEN entries (Minesweeper, Tic Tac Toe, Connect Four, Memory, Whack-a-Mole, Simon Says, Typing Speed, Math Quiz, Lights Out, Sudoku): each writes its save helpers (`saveState`/`clearSave`/`checkSaved`/`bestScore` etc.) as *inline content of `<script src="../../assets/game-save.js">`*, which browsers never execute — verified `typeof saveState === "undefined"` at runtime in a real browser for all 10, while Tetris/Pong (helpers in a proper separate script) are `function`. One-line fix: split the helpers into their own `<script>` block. Shared slop across the same 10: hidden-dead "Continue" button (checkSaved never runs), "Clear Save" button throws when clicked, and a duplicated "Main Menu" button stacked twice in the game-over screen (8 games; Sudoku's are on separate screens, fine). Connect Four needs the extra `turn!==1` PvP fix; Typing Speed needs the `"];` quote fix. Load-only smoke gate passes 15/15 because none of these fire until interaction — worth adding an interaction pass to the gate.
## Batch 4
Bloons TD | functional OK | slop: none | f=8 a=7 s=9 | keep — hub page linking 4 real BTD sub-builds (btd/btd2/btd3/btd4 all present), clean minimal styling.
Drift Boss | functional OK | slop: minor | f=9 a=8 s=8 | keep — full build (game.js 4.5MB, splash/orientate assets present); em-dash in controls hint.
Wordle | functional OK | slop: none | f=9 a=8 s=8 | keep — 2.8MB fully-inline single file, zero external refs, gate clean.
Doodle Jump | functional OK | slop: none | f=9 a=8 s=9 | keep — offline CloudAPI stub replaces cloud service; all assets local.
Chess | functional OK | slop: minor | f=8 a=7 s=7 | fix — working minimax AI + drag/touch board, but "How to play" claims click-select-move while chessboard.js 0.3.0 is drag-only (no click handler); em-dash status strings; cloak.js 404 benign.
Thumb Fighter | functional OK | slop: minor | f=8 a=7 s=7 | fix — C3 build runs clean, but dead ref: link manifest appmanifest.json does not exist (404); cloak.js 404 benign.
Jetpack Joyride | functional OK | slop: none | f=8 a=8 s=9 | keep — Phaser 3.24 build, cloak.js removed with explanatory comment, gate clean.
Jetpack Joyride Hacked | functional OK | slop: minor | f=8 a=7 s=7 | keep — hack VERIFIED live by runtime probe: window.game exists, all 8 scenes' update() wrapped (body.enable=false invincibility + forced coins), localStorage.setItem intercept installed; pulsing red HACKED badge = minor slop.
Doge Miner | functional OK | slop: none | f=8 a=7 s=8 | keep — React build, local assets, cloak.js/ico 404 benign, gate clean.
Hangman | functional OK | slop: none | f=9 a=8 s=9 | keep — self-contained: start/play/end screens, score, restart, keyboard + on-screen keys, 5 rounds.
Retro Bowl Hacked | functional OK | slop: minor | f=8 a=7 s=8 | keep — hack patched inline in GM runtime getter _AK: returns 99999/999 early for coach_credit/salary_cap/boost_salary_cap before falling through — live path, not shadowed; Poki SDK stubbed locally.
Cookie Clicker Hacked | functional OK | slop: minor | f=9 a=7 s=8 | keep — interval sets global Game.cookies/cookiesEarned/cookiesPs; Game is a plain global in main.js, patch not shadowed and tops up every 2s; (Orteil license header asks no re-hosting — worth a legal glance, not a code defect).
Flappy Bird Hacked | functional OK | slop: minor | f=9 a=8 s=8 | keep — hack live: hitPipe(){return false} + ground clamp + best=99999; loss state unreachable (intended god mode), win at 20 pipes still reachable.
Tetris Hacked | functional OK | slop: minor | f=7 a=7 s=7 | fix — hacks effective (startGame 999999/level100, lock() wipes board + 10000×level score, gameOver() never reachable), but newPiece "// HACKED: always find valid position" is a no-op comment (dead claim), gameOver() is dead code, and level=100 forces 50ms ticks = near-unplayable speed.
Age of War Hacked | functional OK | slop: none | f=9 a=8 s=9 | keep — both badge claims live: gold+=99999/s in update(), buy() grants player units hp×10/dmg×5/range×2 (one-hit kills vs vanilla enemies); clean custom build.
## Batch 5

Breakout Hacked | functional OK | slop: minor | scores f=7 a=6 s=6 | fix
Note: hack verified in source (score starts 999999, +1000/brick, +50000 + brick respawn when cleared); still ships dead VS project files (.sln/.vcxproj/.filters), custom <pwr> element, no in-page controls doc — same debt as base Breakout.
Snake Hacked | functional OK | slop: minor | scores f=9 a=8 s=8 | keep
Note: hack verified — collision gated behind `if (false)`, checkCollision() hard-returns false (god mode), wrap-around walls, score 999999 +1000/food; controls doc + mobile dpad present; minor cruft = repo files (LICENSE/README/screenshots) shipped in game dir.
Pokemon Unbound | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Note: minimal EmulatorJS wrapper (gba core, auto-start); menu/saves/keyboard+touch all come from EmulatorJS; smoke fetched ROM zip + core 200.
Pokemon Unbound Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: ROM byte-identical to base (md5 51fef53e...), hack = runtime cheats, verified wired to real bundled EmulatorJS APIs (EJS_cheats parsed at emulator.js:304-314 → gameManager.setCheat(index, checked, code), 1s re-apply on 'start' event); 0 console errors while re-apply ran → no dead calls.
Pokemon Emerald | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Pokemon Emerald Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: same pattern as Unbound Hacked — identical ROM (md5 605b89b6...), cheat hook verified against emulator.js/GameManager.js, not dead code.
Pokemon Fire Red | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Pokemon Fire Red Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: identical ROM (md5 51901a6e...), same verified cheat wiring; Walk-Through-Walls code is a FireRed-compatible TWE protocol code.
Pokemon Ruby | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Pokemon Ruby Hacked | functional OK | slop: none | scores f=9 a=7 s=8 | keep
Note: identical ROM (md5 3e1b2065...), same verified cheat wiring (Ruby addresses differ from FireRed — correct per game).
Subway Surfers Hacked | functional OK | slop: minor | scores f=9 a=8 s=8 | keep
Note: judged as Unity wrapper per scope — provenance comment, XHR/fetch offline guards routing backends to json/null.json, loader+progress+controls doc ("Steer, jump and roll — swipe/drag or arrow keys"), all Build assets 200; hack wraps real gameInstance.SendMessage (coin/score val→999999, blocks crash/die/death methods, ScoreManager/SetCoins pulse) — wired to real Unity API, no console errors while active; method-name matching is runtime-dependent; badge = minor slop.
Crossy Road | functional OK | slop: minor | scores f=9 a=8 s=9 | keep
Note: full boot verified (bootstrap→asset-loader→three/game.min.js all 200, sprites/audio loaded); minor cruft = stray 1-byte `hi` file + unreferenced poki-sdk.js/poki-sdk-core-v2.234.2.js (216KB dead, never loaded by index.html).
Crossy Road Hacked | functional BROKEN(dead hack) | slop: minor | scores f=9 a=7 s=7 | remove
Note: scam build — scripts/ dirs byte-identical to Crossy Road; the hack hooks window.playerController/window.textScore, but game.min.js only ever touches module-scoped `y2N.default.playerController` / textScore and never assigns either on window (grep: 0 hits) → god mode + 999999 score never apply; you get the plain game plus a badge. Exact duplicate → remove.
Doodle Jump Hacked | functional OK | slop: minor | scores f=8 a=7 s=8 | keep
Note: hack verified against real structure — `var Doodle` global (main.js), 'Game' state registered, bundle has this.gameOver/this.player/this.score → gameOver no-op override, score forced 999999, fall-rescue all take effect; offline CloudAPI stub + controls hint (tilt/←→) present; slop = emoji badge "⚡HACKED⚡" and broken CSS `border-radius:8pxpointer-events:none;` (one declaration swallows the other, badge can intercept taps).
Dr. Mario | functional OK | slop: none | scores f=9 a=7 s=9 | keep
Note: clean EmulatorJS GBA wrapper, site-branded title, ROM fetched 200 (filename spaces URL-encoded fine).

Smoke gate: `== 15/15 games pass ==` — every game ok, console_errors=0 failed_reqs=0.
## Batch 6

Street Fighter II | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: minimal EmulatorJS GBA wrapper; ROM (8,388,608 B) fetched 200, mgba core + 7z extractor 200, gate clean; 2p-versus claim matches EmulatorJS control settings; no custom chrome, no slop.
Advance Wars | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid (contains "Advance Wars (USA) (Rev 1).gba", testzip clean), EmulatorJS extracted it live (extractzip.js 200), gate clean.
Mario Kart Super Circuit | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: ROM 4,194,304 B fetched 200, gate clean; file named "mario-cart-super-circuit.gba" (typo 'cart') but reference and file match — works as-is.
Metroid Fusion | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid, extracted live, gate clean; same boilerplate wrapper as the rest of the GBA row.
Mega Man Zero | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid (Mega Man Zero USA/Europe), gate clean.
Kirby Amazing Mirror | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: 6.8MB zip valid + extracted, gate clean; "&" in filename URL-encodes fine.
Sonic Advance | functional OK | slop: none | f=9 a=7 s=9 | keep
Note: zip valid (contains Sonic Advance USA), gate clean.
Helix Jump | functional OK | slop: minor | f=9 a=8 s=8 | keep
Note: full CrazyGames build, self-contained (VOODOO-H5SDK inlined, no external fetches, gate clean); slop = unreferenced crazygames-sdk-v1.js (41KB dead file — index.html/gameplay.js never load it; bundle only reads a pre-existing CrazyGames.CrazySDK global, guarded, 0 console errors).
Crush the Castle | functional OK | slop: none | f=9 a=8 s=9 | keep
Note: Ruffle self-hosted correctly — ruffle.js + c5c02c4e65c1c4423a97.wasm + SWF all 200, gate clean; only slop-adjacent detail is the "| Seraph" port branding in <title>.
Geometry Rash | functional OK | slop: minor | f=9 a=8 s=8 | keep
Note: Construct 2 export, every sprite/audio 200, gate clean (appmanifest.json/offline.appcache refs point at absent files but Chrome never fetched them → dead refs, harmless); "| Seraph" title branding only.
Poor Bunny | functional OK | slop: none | f=8 a=8 s=8 | fix
Note: gate FAIL (2 failed reqs) — bundle injects ./poki-sdk.js which doesn't ship (404); game still boots with 0 console errors, all Stencyl assets 200; fix = ship a local PokiSDK stub (pattern used by other builds) or strip the loader.
Poor Bunny Hacked | functional BROKEN(hack never takes effect) | slop: heavy | f=3 a=6 s=4 | remove
Note: "Poor Bunny.js" is md5-identical to base (646a2d19…); the inline hack hooks killActor/Box2D (0 hits in the bundle), scans for a window engine global that is never assigned, bumps a local _score into DOM score nodes a canvas game never renders, and "unlocks skins" via localStorage (bundle touches localStorage once, no skin keys) → invincibility/auto-collect/all-unlocks all inert; only the fixed "HACKED - Invincible + Auto-Collect" badge is visible = scam build, plus the same poki-sdk.js 404 gate FAIL.
Fireboy and Watergirl | functional OK | slop: minor | f=7 a=7 s=8 | fix
Note: gate FAIL (8 failed reqs) — missing json/{domains,internal,sitelock,contracted,special}.json, images/branding_logo_agame.png and a root-level /main.min.js; temple data/atlases/audio all 200 → levels play; catalog title mismatch: build is actually "Fireboy & Watergirl 2: Light Temple" (index title + game.json id "light").
Fireboy & Watergirl 4: Crystal Temple | functional OK | slop: none | f=9 a=8 s=9 | keep
Note: complete json/ config set present (the only F&W build that passes), every asset 200, gate clean, controls in-game (WASD/arrows).
Fireboy & Watergirl: Forest Temple | functional OK | slop: minor | f=7 a=7 s=8 | fix
Note: gate FAIL (10 failed reqs) — json/ dir is empty (5 config 404s) + branding_logo_agame.png + /main.min.js + menu assets TempleHallForest.jpg and GameNameForest.png missing (Crystal build ships all of these) → menu visibly degraded; temple/audio data all 200 → levels play.

Smoke gate: `== 11/15 games pass ==` (EXIT=1). FAILs: Poor Bunny + Poor Bunny Hacked (poki-sdk.js 404 ×2 each), Fireboy and Watergirl (8 failed reqs: 5 json configs + branding + /main.min.js), Fireboy & Watergirl: Forest Temple (10 failed reqs: 5 json configs + branding + /main.min.js + TempleHallForest.jpg + GameNameForest.png). All 11 other games: console_errors=0 failed_reqs=0.
## Batch 7

Fireboy & Watergirl Fairy Tales | functional OK(404 NewCharAssets.png fairy sprite; smoke gate FAIL) | slop: minor | scores f=8 a=8 s=7 | fix
Fireboy and Watergirl Hacked (Light Temple) | functional OK(hack verified: temple.json initial=true on 41/41 levels + engine `f.initial?1:0`; smoke gate FAIL 3x404 config json) | slop: minor | scores f=8 a=8 s=7 | fix
Fireboy and Watergirl Forest Temple Hacked | functional OK(hack verified: initial=true 32/32 levels; smoke gate FAIL, json/ dir empty so 4x404) | slop: minor | scores f=8 a=8 s=6 | fix
Fireboy and Watergirl Crystal Temple Hacked | functional OK(hack verified: initial=true 39/39 levels; smoke gate pass) | slop: minor | scores f=8 a=8 s=7 | keep
Fireboy and Watergirl Fairy Tales Hacked | functional OK(hack verified: initial=true 32/32 levels; smoke gate FAIL same NewCharAssets.png 404 as base) | slop: minor | scores f=8 a=8 s=7 | fix
GeoGuesser | functional OK(pure iframe embed of worldguessr.com, needs internet, no local game code; smoke gate FAIL on 3rd-party localStorage SecurityError) | slop: none | scores f=5 a=6 s=9 | keep
Merge Cats Defender | functional OK | slop: minor | scores f=9 a=8 s=9 | keep
Merge Cats Defender Hacked | functional OK(hack verified: START_COINS 999999, all unit cost:0, 17/17 cats in STARTER_UNLOCKS, isolated save key pawdefense.save.hacked.v1) | slop: none | scores f=9 a=8 s=9 | keep
Neon Snake | functional OK | slop: none | scores f=9 a=9 s=10 | keep
Neon Breakout | functional OK | slop: minor | scores f=9 a=9 s=9 | keep
Neon Flappy | functional OK(no win state - endless best-score only, repo contract asks for win/lose) | slop: none | scores f=8 a=9 s=10 | fix
Neon Boss Rush | functional OK | slop: minor | scores f=9 a=9 s=9 | keep
Orbit Collector | functional OK(smoke gate pass, but three.js r128 loaded from cdnjs = external dependency; win overlay is mislabeled "Game Over", no lose state, touch input undocumented) | slop: minor | scores f=7 a=7 s=7 | fix

Notes:
- Smoke gate (2 runs, identical): `== 8/13 games pass ==` - FAIL: Fireboy & Watergirl Fairy Tales (404 NewCharAssets.png), Fireboy and Watergirl Hacked (Light Temple) (404 domains/sitelock/internal.json), Fireboy and Watergirl Forest Temple Hacked (404 domains/contracted/special.json), Fireboy and Watergirl Fairy Tales Hacked (404 NewCharAssets.png), GeoGuesser (2x worldguessr SecurityError on localStorage). PASS: Crystal Temple Hacked, Merge Cats Defender, Merge Cats Defender Hacked, Neon Snake, Neon Breakout, Neon Flappy, Neon Boss Rush, Orbit Collector. All failures have console_errors=0 except GeoGuesser, so the F&W 404s are non-fatal asset/config misses, but the gate is red and must be fixed or explicitly signed off.
- "Hacked" verification: all 4 Fireboy hacked variants differ from their base copies ONLY in `data/*/temple.json` (`"initial": true` added to every level) + index.html badge, and every engine honors it (`f.initial ? 1 : 0` -> state 1 = unlocked). Merge Cats Defender Hacked differs only in Config.js/Units.js/index.html. Hacks are real, not just badges.
- Neon 4-game duplication check: NOT copy-paste. md5 of every script/style/html differs; mechanics are distinct (snake grid / breakout bricks / flappy gates / boss bullet-hell). Shared neon palette + overlay/panel pattern is a deliberate house style; only inconsistency is structure (NeonSnake + NeonBreakout inline <style>, NeonFlappy + NeonBossRush external style.css) and a duplicated roundRect() helper in Snake/Breakout.
- Slop hits: em-dash in visible control copy (NeonBreakout index.html L157-159, NeonBossRush L44-47, MergeCats landing tips - the last two are vendored/original text); inline `overlfow` typo in FireboyAndWatergirlHacked/index.html body style; per-game `.hacked-badge` CSS block copy-pasted into all 4 Fireboy hacked index.html files; `source.txt` provenance files point at html5.gamedistribution.com (same provenance-marker slop flagged in Batch 0). No Comic Sans, no emoji headers, no lorem ipsum, no dead buttons (every start/retry/resume/menu button in all 13 games is wired), no ALL-CAPS banner spam beyond game titles.
- GeoGuesser is intentionally a third-party embed (decision documented in Games/GeoGuesser/CREDITS.md, incl. prior API-key leak removal); verdict `keep` means keep-with-reported-exception - its gate failure is external console noise the gate cannot distinguish from a real error.
## Phase 1b interactive playtest

Real-browser interactive play (Playwright under xvfb): start screens clicked through, real keys/inputs, 10-30s+ interaction per game, state changes + restart paths verified. Format:
`TITLE | played | controls | state | restart | verdict: pass/play-broken(how far)/fail`
Raw batch files: docs/audit_batches/playtest_*.md, playtest_r*.md. Screenshots sample: docs/audit_batches/shots_playtest/.

### Batch 0
2048 | played yes | controls yes (WASD only, arrows unhandled) | state yes | restart nt (no restart affordance; board freezes on You LOSE) | pass
Age of War | played yes | controls yes | state yes (gold/score/wave) | restart nt | pass
Snake | played yes | controls yes | state yes | restart yes | pass
Chrome Dino | played yes | controls yes | state yes | restart yes | pass
Flappy Bird | played yes | controls yes | state yes | restart yes | pass
Character Alsen | played yes | controls yes | state yes | restart nt | pass
QWOP | played yes | controls yes | state yes | restart yes | pass
Star Catcher | played yes | controls yes | state yes | restart nt | pass
Ovo | played yes | controls yes | state yes | restart nt | pass
Soccer Random | played yes | controls yes | state yes | restart nt | pass
Basket Random | played yes | controls yes | state yes | restart nt | pass (non-fatal ad-stub PageError)
Volley Random | played yes | controls yes | state yes | restart nt | pass
Hextris | played yes | controls yes | state yes | restart nt | pass
Breakout | played yes | controls yes (Space launch, HELD arrows) | state yes | restart yes | pass
Run 3 | played partially | controls no | state no | restart nt | play-broken (loads a live but STATIC canvas; clicks/Space/arrows change nothing; JSON.parse PageError at startup)

### Batch 1
Paddle Duel | yes | yes | yes | nt | pass
Brick Dash | yes | yes | yes | nt | pass
Tile Merge | partially | yes | yes | yes | play-broken (cursor+SPACE select never merged in budget; mechanics unclear) - borderline, gameplay loop reachable
Match Flip | yes | yes | yes | yes | pass
FPS | yes | yes | yes | nt | pass (death screen "YOU DIED" overwrite confirmed in source, not reached live)
Letter Boxed | yes | yes | yes | yes | pass
Boss Rush | yes | yes | yes | nt | pass
Grid Heist | yes | yes | yes | yes | pass
Last Lantern | yes | yes | yes | yes | pass (debug cheat hook window.__LL shipped - confirmed)
Queue Escape | partially | no | no | nt | play-broken (Start Shift clicked twice; menu never transitions to gameplay; keys produce no change; never entered gameplay)
Story Adventure | yes | yes | yes | nt | pass
Gladihoppers | yes | yes | yes | yes | pass
Burrito Bison | yes | no | no | nt | play-broken (loader completes, scene renders idle, but all inputs produce no change - stuck at title/menu)
BitLife | yes | yes | yes | nt | pass
Subway Surfers | yes | yes | yes | nt | pass (needed WebGL env flags; PageError was no-WebGL env artifact)

### Batch 2 (A Dark Room..Vex 7)
A Dark Room | yes | yes | yes | nt | pass
Stranded In Isekai | yes | yes | yes | nt | pass
Papa's Pizzeria | yes | yes | yes | nt | pass
Retro Bowl | played no | controls no | state no | nt | fail (blank blue canvas, never reaches start; RetroBowl.js ends with stray `cpd;` -> "cpd is not defined" kills GameMaker boot; 404 optiondata.dat)
Super Hot | no | no | no | nt | environment-limited (Unity _glGetString throws under swiftshader; runs on real GPU browsers)
10 Minutes Till Dawn | partially | yes | yes | nt | pass
Fleeing the Complex | partially | yes | yes | nt | pass
Infiltrating the Airship | partially | yes | yes | nt | pass (external NewgroundsPromo.swf fetch CORS-blocked - offline hygiene issue)
Baldi's Basics | partially | yes | yes | nt | pass (main menu reached; start click not landed in budget)
Temple Run 2 | partially | yes | yes | nt | play-broken (loader stalls ~91-98%, "PRESS SPACE TO PLAY" ignored - run never starts)
Fruit Ninja | played no | controls no | state no | nt | fail (poki-sdk.js never loaded by any script tag -> "PokiSDK is not defined" kills Phaser boot; black screen)
Fruit Ninja Hacked | no | no | no | nt | fail (same boot death + hack hooks inert - no scene exists to hook; only HACKED badge renders)
Fancy Pants Adventure 3 | partially | yes? | unconfirmed | nt | play-broken (Ruffle canvas up but renderer stalls; gameplay entry unconfirmed)
Cut the Rope | partially | yes | yes | nt | pass (menu + drag-cuts work; replay nt)
Vex 7 | no | no | no | nt | fail (#loader never clears, PLAY dead, 0 pixel change; js/null.js stub suspected where boot code should be)

### Batch 3 (House of Hazards..Cookie Clicker)
House of Hazards | no | no | no | nt | play-broken (Poki loader maps loader=unity -> patch/js/unity.js MISSING -> loader chain dies; Unity build never fetched)
Geometry Dash Lite | partially | no | no | nt | play-broken (Unity boots fully, canvas animates, but all input produces EXACTLY 0 change - core loop unresponsive)
Tetris | yes | yes | yes | yes | pass (restart button mislabelled "Main Menu")
Pong | yes | yes | yes | yes | pass
Minesweeper | partially | yes | no | nt | play-broken (first cell click throws "saveState is not defined" BEFORE reveal -> 0 cells ever reveal; CONFIRMED game-save.js inline-in-src pattern)
Tic Tac Toe | yes | yes | yes | nt | play-broken (X win -> "saveState is not defined"; winning mark never drawn, over-screen never shows)
Connect Four | partially | yes | yes | nt | play-broken (2P: Yellow can NEVER move, CONFIRMED; vs-AI: phantom win -> saveState undefined -> input freeze)
Memory | yes | yes | yes | nt | play-broken (6/6 win -> "bestMoves is not defined"; win screen never appears)
Whack-a-Mole | partially | yes | yes | nt | play-broken (time-up -> "bestScore is not defined" FIRST line; game-over screen never appears)
Simon Says | partially | yes | yes | nt | play-broken (game-over -> "bestLevel is not defined"; over-screen never appears, input dead)
Typing Speed | no | no | no | nt | fail (script SyntaxError `"];` at load - whole script dead; Start Test throws startGame undefined)
Math Quiz | yes | yes | yes | nt | play-broken (answered all 10 -> "bestScore is not defined"; results screen never appears)
Lights Out | yes | yes | yes | nt | play-broken (win -> "bestLevel is not defined"; win screen never appears)
Sudoku | partially | no | no | nt | play-broken (FIRST numpad placement -> "saveState is not defined"; number never renders; input loop dead)
Cookie Clicker | yes | yes | yes | yes (wipe save) | pass

### Batch 4
Bloons TD | hub verified in Phase 1 (4 sub-builds present) | pass (sub-build boot not re-verified live in R4 - see playtest_r4.md)
Drift Boss | yes | yes | yes | nt | pass
Wordle | yes | yes | yes | yes | pass
Doodle Jump | yes | yes | yes | nt | pass
Chess | yes | yes | yes | nt | pass-with-issue (click-select-move claim vs drag-only chessboard.js - verify controls doc accuracy)
Thumb Fighter | played no | controls no | state no | nt | play-broken (C3 title screen renders, but never advances: 60s idle + clicks + Enter/Space + key mash all leave it on title; no play button reachable)
Jetpack Joyride | yes | yes | yes | nt | pass (distance 0000M->00097M, best saved)

### Batch 5 (Hacked row)
Jetpack Joyride Hacked | yes | yes | yes | nt | pass (hack: invincibility + coins verified live)
Doge Miner | yes | yes | yes | nt | pass
Hangman | yes | yes | yes | yes | pass
Retro Bowl Hacked | played no | controls no | state no | nt | play-broken/fail (identical to base: stray `cpd;` -> engine boot aborts, blank canvas)
Cookie Clicker Hacked | yes | yes | yes | no (wipe gets instantly re-funded by hack) | pass
Flappy Bird Hacked | yes | yes | yes | yes | pass (god mode live)
Tetris Hacked | yes | yes | yes | nt (no restart by design; over screen never reachable) | pass (level 100 speed confirmed)
Age of War Hacked | yes | yes | yes | yes | pass (hack income + VICTORY! reached)

### Batch 6 (GBA row + web)
Breakout Hacked | yes | yes | yes | yes | pass (hacked score live)
Snake Hacked | yes | yes | yes | nt (god mode = unlosable) | pass
Pokemon Unbound | yes | yes | yes | yes (Save State + Restart verified) | pass
Pokemon Unbound Hacked | yes | yes | yes | yes | pass (cheat UI 4 toggles live)
Pokemon Emerald | yes | yes | yes | yes | pass
Pokemon Emerald Hacked | yes | yes | yes | yes | pass (cheat UI live)
Pokemon Fire Red | yes | yes | yes | yes | pass
Pokemon Fire Red Hacked | yes | yes | yes | yes | pass (cheat UI live)
Pokemon Ruby | yes | yes | yes | yes | pass

### Batch 7 (GBA row 2 + F&W + misc)
Pokemon Ruby Hacked | yes | yes | yes | yes | pass (cheat auto-enable fired)
Subway Surfers Hacked | yes | yes | yes | nt | pass (WebGL env note; [HACK] active)
Crossy Road | played partially | controls no | state no | nt | play-broken (loader stalls <1%, NO canvas ever created in 75s x2; 9x "PokiSDK is not defined" - bootstrap references PokiSDK but index.html never loads it)
Crossy Road Hacked | partially | no | no | nt | play-broken (boots EXACTLY like base, same stall; dead hack confirmed at runtime)
Doodle Jump Hacked | partially | yes? | yes | nt | play-broken borderline (boots to Menu, but play button click never landed - harness coordinate limitation, NOT proven game fault)
Dr. Mario | yes | yes | yes | yes | pass
Street Fighter II | yes | yes | yes | yes | pass
Advance Wars | yes | yes | yes | yes | pass
Mario Kart Super Circuit | yes | yes | yes | yes | pass
Metroid Fusion | yes | yes | yes | yes | pass
Mega Man Zero | yes | yes | yes | yes | pass
Kirby Amazing Mirror | yes | yes | yes | yes | pass
Sonic Advance | yes | yes | yes | yes | pass
Helix Jump | played no | controls no | state no | nt | play-broken (boot PageError "Cannot read properties of undefined (reading 'CrazySDK')" kills init; start screen never dismisses)
Crush the Castle | no | no | no | nt | play-broken/env (Ruffle unsupported-content dialog + stage never animates under swiftshader; may run on real GPU browsers)
Geometry Rash | no | no | yes (runtime ticks) | nt | fail (c2runtime layout never starts; Menu never begins)
Poor Bunny | no | no | no | no | fail (canvas present but renders all-black forever; never plays; poki-sdk.js 404 non-fatal)
Poor Bunny Hacked | no | no | no | nt | fail (identical all-black; hack inert)
Fireboy and Watergirl | yes | yes | yes | yes | pass (levels load despite 7 config 404s)
Fireboy & Watergirl 4: Crystal Temple | partially | yes | yes | no | pass
Fireboy & Watergirl: Forest Temple | yes | yes | yes | no | pass
Fireboy & Watergirl Fairy Tales | no | no | no | nt | play-broken (menu -> PageError "undefined 'index'" + 404 NewCharAssets.png freezes rendering before gameplay)
Fireboy and Watergirl Hacked (Light Temple) | yes | yes | yes | yes | pass
Fireboy and Watergirl Forest Temple Hacked | yes | yes | yes | no | pass
Fireboy and Watergirl Crystal Temple Hacked | yes | yes | yes | no | pass
Fireboy and Watergirl Fairy Tales Hacked | no | no | no | nt | play-broken (identical crash to base Fairy Tales)
GeoGuesser | partially | yes | yes | nt | pass (iframe embed; needs internet)
Merge Cats Defender | yes | yes | yes | nt | pass
Merge Cats Defender Hacked | yes | yes | yes | nt | pass (999999 coins live)
Neon Snake | yes | yes | yes | yes | pass
Neon Breakout | yes | yes | yes | yes | pass
Neon Flappy | yes | yes | yes | yes | pass (endless by design)
Neon Boss Rush | yes | yes | yes | nt | pass
Orbit Collector | yes | yes | yes | nt | pass-with-flags (no lose state; win overlay mislabeled "Game Over"; three.js from cdnjs = offline violation)

### Phase 1b summary
PASS ~87 | play-broken/fail ~24 | environment-limited ~3 | scam builds confirmed dead in play: Fruit Ninja Hacked, Poor Bunny Hacked, Crossy Road Hacked
Systemic bugs (root-cause fixes, one pattern each):
1. game-save.js inline-in-src pattern -> 10 classic games break at first interaction/end-game (Minesweeper, Tic Tac Toe, Connect Four, Memory, Whack-a-Mole, Simon Says, Math Quiz, Lights Out, Sudoku + Tetris/Pong unaffected).
2. TypingTest `"];` SyntaxError kills whole script.
3. Connect Four `turn!==1` blocks Yellow in 2P + AI phantom-win freeze.
4. PokiSDK referenced but never loaded: Fruit Ninja (black screen), Crossy Road (no canvas), Poor Bunny (black screen), Poor Bunny Hacked (same), House of Hazards (missing unity.js).
5. Retro Bowl + Hacked: stray `cpd;` -> GameMaker boot aborts, blank canvas.
6. Fairy Tales (base+hacked): missing NewCharAssets.png -> render freeze; 2048 no restart; 2048/queue-escape-class start loops.

## Phase 4 vibe-slop decisions

Removed (heavy slop / confirmed scam dead-hack builds, all verified dead in Phase 1b play):
- Fruit Ninja Hacked: hack hooks inert (own class methods shadow the prototype patches), game never boots (PokiSDK never loaded -> black screen), 23MB duplicate vendors bundle. `chore: remove Fruit Ninja Hacked`
- Poor Bunny Hacked: script md5-identical to base, all hacks 0-hit, renders all-black like base; badge-only scam.
- Crossy Road Hacked: scripts byte-identical to base, window hooks provably never assigned by game code, same pre-canvas loader stall as base.

Kept-with-issues (borderline, real games, fixable - LIST only, no removal):
- Retro Bowl + Retro Bowl Hacked: stray `cpd;` token at EOF of RetroBowl.js aborts GameMaker boot under headless (blank canvas). Candidate fix: strip token; do not remove (flagship title).
- Temple Run 2: loader stalls ~91-98% headless; verify on real browser before any decision.
- Vex 7: PLAY dead headless (loader never clears). Candidate fix: investigate js/null.js stub.
- Geometry Dash Lite: boots + animates but headless input produces 0 change; likely harness artifact - re-verify on real device.
- House of Hazards: missing patch/js/unity.js (loader chain dies) - candidate fix: ship the loader file or repoint.
- Crossy Road (base) + Poor Bunny (base): PokiSDK referenced but not loaded / poki-sdk 404; never render headless. Candidate fix: ship local PokiSDK stub (pattern exists in other builds).
- Fireboy & Watergirl Fairy Tales (base + hacked): 404 assets/atlasses/NewCharAssets.png -> PageError freezes render pre-gameplay. Candidate fix: supply the atlas or strip its usage.
- Queue Escape: Start Shift never transitions to gameplay headless. Burrito Bison: inputs produce no observable change headless (title tap detection).
- 2048: WASD-only + no restart path (board freezes on You LOSE) + cross-row merge bug; fix candidate, not removal.
- Typing Speed: `"];` SyntaxError kills entire script; Connect Four `turn!==1` blocks Yellow in 2P + AI phantom-win; both one-line fixes - queued for a fix round, not removals (games otherwise intact).
- Orbit Collector: keep, but must vendor three.js (offline rule) + add lose state + rename win overlay.

## Post-removal full smoke gate (115 games)

Chunked run after removals (commit af5be80): 113/115 pass across 9 chunks.
- Run 3: `planet5.png`/`autoContent.json` net::ERR_NETWORK_CHANGED = environment network blip; both are local bundled assets (verified: autoContent.json ships in Games/Run3/tn6pS9dCf37xAhkJv/text/, no external URL in Run3.js). PASS on re-run semantics; signed off as flake.
- Cut the Rope: intro_1024.mp4 net::ERR_ABORTED - the game's own video code aborts its mp4 mid-stream (file exists, menu + all assets load, plays). Known quirk documented in batch 2; signed off.
