# Mirror sources

Phase 5 additions that remain in the catalog are INGESTED ONLY from permissively-licensed open-source repos (repo + license + commit hash below), stripped of trackers/analytics/external calls per docs/CODE_QUALITY.md and passing scripts/smoke_test_games.py with 0 console errors + 0 failed requests.

UPDATE (operator directive, mirrors only): the 25 built-in-house fallbacks were REMOVED from the catalog and their folders deleted - marked [REMOVED] in the table below. The in-house-built Asteroids..DotRunner set (built pre-ingestion pivot, commit 9bc406c) and all later built fallbacks are gone; only ingested mirrors remain.

| Game | Source | License | Commit |
|------|--------|---------|--------|
| Asteroids | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Space Invaders | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Galaxian | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Missile Command | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Lunar Lander | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Centipede | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Dig Dug | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Frogger | built in-house (pre-ingestion pivot) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| DotRunner | built in-house (pre-ingestion pivot; Pac-Man rules, no branded assets) | original | n/a | **[REMOVED per operator, mirrors-only directive]**
| Pacman | github.com/daleharvey/pacman @ 3acc5e2 | WTFPL | ingested |
| Qix | github.com/astropanic/JIX @ c08594e | MIT | ingested |
| Joust | github.com/cschladetsch/JsJoust @ 88cb734 | MIT | ingested (fixed upstream EnemyAI crash) |
| Tron Light Cycles | github.com/faboyds/Tron @ f95e35b | MIT (+ vendored p5.js 0.6.0, LGPL-2.1) | ingested |
| Snow Rider 3D | built in-house: no genuine OSS mirror (GitHub candidates were ripped commercial Unity builds with ad SDKs) | original | built | **[REMOVED per operator, mirrors-only directive]**
| Duck Hunt | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Curve Fever | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Sokoban | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Nonogram | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Tower of Hanoi | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Puzzle 15 | github.com/arnisritins/15-Puzzle @ 47c82f1 | MIT | ingested |
| Peg Solitaire | github.com/sunjay/peg-solitaire @ 50c447a | MIT | ingested |
| Checkers | github.com/stroibot/Checkers @ 1d0ba0c | MIT | ingested |
| Reversi | github.com/alex-berson/reversi @ c9c1cdc | MIT | ingested |
| Battleship | built in-house (permissive candidates needed webpack/external deps) | original | built | **[REMOVED per operator, mirrors-only directive]**
| Mastermind | github.com/timjb/meisterhirn @ 5e00130 | MIT | ingested |
| Nim | github.com/morimay421/nim @ b7f8392 | MIT | ingested |
| Dots and Boxes | github.com/ayahae79/Dots-and-Boxes @ 5cadc82 | MIT | ingested |
| Ultimate Tic-Tac-Toe | github.com/ZLouisMiguel/ult @ 5894164 | MIT | ingested |
| Klondike Solitaire | github.com/AJimber/KMN_Solitaire @ c25d7a9 | MIT | ingested |
| FreeCell | github.com/taeber/freecell @ e1249a7 | MIT | ingested |
| Blackjack | github.com/Vimal9RAM-NAP/blackjack-web @ 81e00b0 | MIT | ingested |
| Video Poker | github.com/varunbudati/VideoPoker @ 3f2e2ea | MIT | ingested |
| Yahtzee | github.com/taylorhansen/Yahtzee @ 26dec5d | MIT | ingested |
| Dominoes | built in-house (4 MIT candidates violated house rules: emoji/em-dash/gradient, console-only, 4.8MB assets, server dep) | original | built | **[REMOVED per operator, mirrors-only directive]**
| Go Fish | github.com/surenenfiajyan/go-fish | MIT | ingested |
| War | github.com/nthugon/javascriptWAR | MIT | ingested |
| Word Search | github.com/remram44/wordsearch | BSD-3-Clause | ingested |
| Boggle | built in-house (MIT candidates fetched word data from the network) | original | built | **[REMOVED per operator, mirrors-only directive]**
| Word Ladder | github.com/yinggarykairui/word-ladder | MIT | ingested |
| Cryptogram | built in-house (candidates were AGPL multiplayer/React/CLI) | original | built | **[REMOVED per operator, mirrors-only directive]**
| Word Scramble | github.com/GZ30eee/Word-Scramble-Game @ 712322d | MIT | ingested |
| Darts 501 | github.com/you-sk/game-darts @ 514fb3a | MIT | ingested (rules fixed to real 501) |
| Bowling | built in-house (only MIT candidate had broken scoreboard) | original | built | **[REMOVED per operator, mirrors-only directive]**
| Mahjong Lite | github.com/ScriptRaccoon/mahjong-solitaire @ 89dc27b | MIT | ingested (jQuery CDN + PNG art stripped, flat CSS tiles) |
| Penalty Shootout | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Archery | github.com/bibhuticoder/archery-master @ 107cbc9 | GPL-3.0 | ingested (LICENSE shipped) |
| Mini Golf | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Curling | built in-house | original | built | **[REMOVED per operator, mirrors-only directive]**
| Free Throw | github.com/jeremymartinezq/Basketball-game @ 2bf12dc | MIT | ingested |
| Hunt The Wumpus | built in-house (1973 Unlicense BASIC rules referenced) | original | built | **[REMOVED per operator, mirrors-only directive]**
| Backgammon | github.com/binarymax/backgammon.js @ b00c2e6 | MIT | ingested |
| Higher Or Lower | built in-house (candidate was an online API client) | original | built | **[REMOVED per operator, mirrors-only directive]**

Per-game provenance details + rejected-candidate rationale: docs/catalog_parts/sources_{3,4,5,6,7,8,9,10,11}.md, sources_snowrider.md, sources_snowrider.md entries.

# Batch 2 ingested mirrors (operator directive: real mirrors only, zero self-built)

Renumbered ids 195-220 on merge (workers had written colliding provisional ids). Per-game sources:

## Asteroids
- Repo: https://github.com/dmcinnes/HTML5-Asteroids - MIT - commit 930301c (verified: LICENSE byte-identical, game.js matches except documented text/state tweaks)
- Ingested offline; attribution also in Games/Asteroids/CREDITS.md

## Frogger
- Repo: https://github.com/RotaruDan/frogger - GPL-2.0 - commit a4b33cf (shipped README links the repo, base.css byte-identical)

## Missile Command
- Repo: https://github.com/andymason/Missile-Command-JavaScript-Clone - MIT (Andrew Mason 2012) - commit d82cabd (LICENSE + README byte-identical)

## Lunar Lander
- Repo: https://github.com/maryrosecook/retro-games (lunar-lander/) - MIT (Mary Rose Cook) - commit 2c9a822 (lunar-lander.js + index.html byte-identical)

## Space Invaders
- Repo: https://github.com/ozelentok/SpaceInvaders - MIT (Oz Elentok 2018) - commit 02ccd86 (diff -rq clean vs clone)

## Duck Hunt
- Repo: https://github.com/MattSurabian/DuckHunt-JS - MIT (Matt Surabian 2015) - commit 5a28db7 (dist + audio byte-identical)
# Mirror sources - W2

## Sokoban -> Games/Sokoban/

- Repo: https://github.com/shunyue1320/sokoban
- License: MIT (file present in repo)
- Commit: 9d15e6d32a533cf1099f995e30c01ea45ee0f1ff (2026-06-01)
- Ingested: 2026-09-24
- Why this candidate: static self-contained HTML/CSS/JS, no build step, 100 real levels, no external resources.
- Abandoned candidates: haroldo-ok/sokoban (repo not found), sokoban-html5/sokoban-html5.github.io (plan repo, no game), klevze/sokoban (Vite build required).
- Stripped/fixed: help toggle replaced by inline header instructions, Chinese UI strings translated, fixed 560px layout made responsive, added touch d-pad, restyled buttons (44px, AA contrast), fixed title.
- Files shipped: index.html, js/mapdata100.js, images/ (9 sprites), LICENSE, CREDITS.md.
- Validation: python json.load OK, node --check inline JS + mapdata OK, no http(s) refs, no emoji/em-dash in HTML.

## Tower of Hanoi -> Games/TowerOfHanoi/

- Repo: https://github.com/zym9863/Tower-of-Hanoi-Game
- License: MIT (file present in repo)
- Commit: e4118d667f4fe522da888084e027ca0c32ad8ec8 (2025-12-19)
- Ingested: 2026-09-24
- Why this candidate: fully static (index.html + script.js + style.css), no build step, playable drag-and-drop puzzle with undo/reset and move counter.
- Abandoned candidates: pr0mming/TowerHanoi (Vite + TS build), coderosh/tower-of-hanoi (Vite + TS build, and it is an auto-playing visualizer), lmc22/Tower-of-Hanoi-JavaScript (not evaluated, simpler candidate found first).
- Stripped/fixed: Google Fonts @import removed, CSS gradients removed, og/twitter external meta removed, Chinese UI strings translated, blocking alerts replaced with inline status message, added click/tap-to-move for touch, 44px disks/buttons, inline header instructions.
- Files shipped: index.html, script.js, style.css, LICENSE, CREDITS.md.
- Validation: python json.load OK, node --check script.js OK, no http(s) refs, no gradients, no emoji/em-dash.

## Nonogram -> Games/Nonogram/

- Repo: https://github.com/monkeyArms/nonogram
- License: MIT (file in repo, text starts "The MIT License")
- Commit: a61efe2cb85452417fcdcdb6e2399eb4f7bd45b1 (2019-12-09)
- Ingested: 2026-09-24
- Why this candidate: highest-star MIT nonogram with a prebuilt static bundle (dist/nonogram.min.js), no runtime server needs, fetches only same-directory theme templates.
- Abandoned candidates: jokude/react-nonogram (React build), 1hella/html5-nonogram-game (no license), DomenicoDeFelice/Pi-Nonograms (no license).
- Stripped/fixed: Google Fonts link removed (font stack falls back to sans-serif), Wikipedia/GitHub header icon links removed, sourceMappingURL comment stripped, only runtime files shipped (no src/, webpack config, package files), added inline instructions + score line (filled cells count, solved state) via a small page-level script.
- Files shipped: index.html, dist/nonogram.min.js, dist/themes/default/styles.css, dist/themes/default/templates/ (5 html), example/css/app/styles.css, example/images/ (5 svg), LICENSE, CREDITS.md.
- Validation: python json.load OK, node --check inline JS + min.js OK, no http(s) refs outside w3.org XML namespaces inside data URIs, no fonts/CDN refs, no emoji/em-dash.

## Summary

- All 3 assigned titles ingested, none skipped.
- Fragment: /tmp/games_batch2_2.json (ids 197, 198, 199; other workers already used 195/196, so those were avoided).
- Nothing committed; games.json/index.html/docs untouched.
# Mirror sources - worker W3

## Battleship
- Dir: Games/Battleship/
- Repo: https://github.com/cloudy-sfu/Battleship
- License: GPL-3.0, commit 95941c5f9bb31125a7438f8e7c125f3ab1dccc86 (depth-1 clone)
- Stripped: popup rules page with external Wikipedia link (inlined instead, file removed).
- Added: sentence-case messages, keyboard aim control, responsive board, 44px buttons.
- Files: index.html, style.css, logic.js, main.js, LICENSE, CREDITS.md
- Validation: node --check logic.js + main.js OK; no http(s) in html/js/css; no emoji or em-dash in copy.

## Boggle
- Dir: Games/Boggle/
- Repo: https://github.com/mohdraqeeb3210/boggle
- License: MIT, commit 70a271d037905f7b0a70b7f8f1d5c2ef191e3489
- Stripped: emoji from title/hud/messages, radial-gradient background (flat color now), all-caps word displays.
- Added: keyboard word input (type + Enter, path-validated), inline controls line, 44px button.
- Files: index.html, LICENSE, CREDITS.md
- Validation: extracted inline JS passes node --check; no http(s); no emoji or em-dash; no gradients.

## Achtung die Kurve
- Dir: Games/AchtungDieKurve/
- Repo: https://github.com/stravid/achtung-die-kurve
- License: MIT, commit de0d347ee4c0a87c1928e7b339c771991a080dd8 (shipped upstream examples/html demo)
- Stripped: unused vendored jquery.js, all external links (GitHub, author sites, imprint/privacy, browser promo).
- Added: sentence-cased labels, always-visible inline controls text, touch steering (four vertical zones) as minimal mobile glue.
- Files: index.html, javascripts/adk.minified.js, javascripts/script.js, stylesheets/style.css, LICENSE, CREDITS.md
- Validation: node --check adk.minified.js + script.js OK; no http(s) in shipped files; no emoji, em-dash or gradients; HTML tag structure balanced.
# Mirror sources - worker W4 (batch 2)

## 1. Dominoes
- Dir: Games/Dominoes/
- Repo: https://github.com/martakoprivica/Dominoes_web_game
- License: MIT
- Commit: 53fd52326768513c24a0d52b1be3019af11abfb1
- Date retrieved: 2025-09-24
- Stripped: menu landing page (click-to-start gate) and its assets (meni.png, igraj.png, pravila.png, nota1.png, nota2.png, popup.png, polje4.png), menu-only CSS, empty img src, console.log debug output, CRLF line endings.
- Added: visible sentence-case instruction header, click/tap + keyboard fallback (select domino then slot), focus/selection outlines, restart button label and aria-label.
- Files shipped: index.html (game page), bravo.html (win page), style1.css, touch.js, LICENSE, CREDITS.md, 8 tile PNGs, 6 board PNGs, 2 button PNGs, poz2.jpg background, music.mp3 (all local).
- Validation: node --check touch.js OK; no http(s) in shipped code; no emoji/em-dash in HTML copy; all CSS/HTML url() references resolve to shipped files.

## 2. Mini Golf
- Dir: Games/MiniGolf/
- Repo: https://github.com/gamelabz/html5-game-mini-golf
- License: MIT
- Commit: 742dc3530869d51ef8e4fb601a200202a62def81
- Date retrieved: 2025-09-24
- Stripped: golf flag emoji in heading and canvas, CSS gradients (page bg, heading, button), drift animation, uppercase stat label transform, en dash placeholder (now 0).
- Added: touch input handlers mirroring mouse drag-to-aim, keyboard aim (arrow keys) and putt (space/enter), inline header instructions, canvas flagstick drawing replacing the emoji.
- Files shipped: index.html, game.js, style.css, LICENSE, CREDITS.md. No external assets needed (upstream assets/ held only a screenshot).
- Validation: node --check game.js OK; no http(s); no emoji/em-dash/gradients/uppercase in shipped copy.

## 3. Bowling
- Dir: Games/Bowling/
- Repo: https://github.com/iliagrigorevdev/bowling
- License: GPL-3.0
- Commit: 60fa6fe5283869c45515f614f6a99b181c63d499
- Date retrieved: 2025-09-24
- Stripped: nothing (upstream had no intro overlay, no ads, no external hosts; three.js/ammo.js/GLTFLoader already vendored locally).
- Added: fixed sentence-case instruction header with 44px restart button, keyboard glue script (js/keyboard.js: arrows move ball, space/enter bowls, R restarts), scorecard moved below header with solid background for contrast.
- Files shipped: index.html, js/{ammo.js, three.js, GLTFLoader.js, scores.js, bowlphysics.js, bowlchallenge.js, keyboard.js}, res/{scene.gltf, scene.bin, ball.png, lane.png, pin.png}, LICENSE, CREDITS.md. 3.1 MB total.
- Validation: node --check on keyboard.js, bowlchallenge.js, scores.js, bowlphysics.js all OK; no http(s) in index.html or game scripts (three.js/GLTFLoader contain only comment/namespace strings, XHR use is for local files only); no emoji/em-dash in HTML copy; res/ uris all resolve locally.

## Fragment
- /tmp/games_batch2_4.json (ids 195-197), validated with python3 json.load.
# Mirror sources - worker 5 (batch 2)

## Hearts Classic
- Dir: Games/HeartsClassic/
- Repo: https://github.com/yyjhao/html5-hearts
- License: BSD 2-Clause style (LICENSE file shipped)
- Commit: 501fffd98964ff1a543020be09e7efe4cc7c8f6a
- Stripped: Google Analytics snippet, GitHub fork ribbon, appcache manifest, unused js/game_old.js + js/test.js
- Adaptations: added one inline instruction line; flattened CSS gradients to solid colors
- Files: index.html, style.css, LICENSE, CREDITS.md, js/ (26 files incl. require.js + jquery-2.0.3.min.js), img/ (5 png)
- Validation: python json.load OK; node --check all js OK; no external http(s) loads; no emoji/em-dash/ALL-CAPS in visible HTML copy

## Spider Solitaire
- Dir: Games/SpiderSolitaire/
- Repo: https://github.com/lklynet/spider-solitaire
- License: MIT (LICENSE file shipped), Copyright (c) 2025 Lee Kelly
- Commit: d4478182a93da6b02ab9f590bb2f7409461077a4
- Built once with vite (one-time bundling), shipped dist as static files
- Stripped/changed: absolute asset paths made relative, 8x CSS text-transform:uppercase removed, body radial-gradient removed, title fixed to "Spider Solitaire"
- Adaptations: inline instruction line in header; keyboard glue (tabindex + Enter/Space click) for cards/stock/foundations
- Files: index.html, assets/index-Bj0xLQJV.js, assets/index-DeC-DNJ1.css, spider.svg, LICENSE, CREDITS.md
- Validation: node --check bundle OK; no external loads (only react.dev string in error text + w3.org namespaces); no emoji/em-dash; no ALL-CAPS CSS left
- Note: rejected candidates - lrusso/Spider (no license), NicholasBallard/spider-solitaire-HTML5 (MIT but empty repo), fabrigeas/SpiderSolitaire (no license), SpiderSolitaireOnline (empty), baspinarenes (CC0 but CRA build risk), aloxuhik (Unity, 913MB)
# W6 mirror sources

## SameGame (shipped)
- Repo: https://github.com/gaborbata/samegame1k
- License: MIT, Copyright (c) 2017 Gabor Bata (LICENSE file copied)
- Commit: 91df2de82549b64c17e5bbba7e28646bfac3c3f1 (2021-12-20)
- Date ingested: 2026-09-24
- Dir: Games/SameGame/
- Files: index.html, samegame.js (readable original from optimization-phases/01), glue.js (touch + keyboard), samegame1k.png, LICENSE, CREDITS.md
- Stripped: Open Graph / Twitter social meta tags; fixed footer overlay (moved to normal flow); no external scripts or fonts existed.
- Adaptations: inline sentence-case instructions header (no intro overlay), responsive canvas scale fix in pointer handler, touch + keyboard glue, N = new game.
- Validation: node --check on samegame.js + glue.js OK; grep https?:// in shipped html/js: no matches; no emoji/em-dash in HTML copy.

## Mancala (pending)
## Gomoku (pending)
# Mirror sources - worker W8

## 1. Tower defense

- Dir: `Games/TowerDefense/`
- Repo: https://github.com/oldj/html5-tower-defense
- License: MIT (Copyright (c) 2017 oldj)
- Commit: e3e009c767121e98d6ff02c85fb442c774b6391
- Ingested: 2025-09-24
- Stripped: external footer links (about/source/blog anchors); switched the Chinese bundle + Chinese copy to English sentence-case copy. No scripts/fonts/CDN/analytics were referenced by the shipped page.
- Glue added: visible inline instructions header, touch-to-click translation on the canvas.
- Files: index.html, td-pkg-en-min.js, favicon.ico, LICENSE, CREDITS.md
- Fragment: /tmp/games_batch2_8.json (entry id 195)

## 2. JavaScript Racer

- Dir: `Games/JavaScriptRacer/`
- Repo: https://github.com/jakesgordon/javascript-racer (original codeincomplete.com JavaScript Racer v4)
- License: MIT (Copyright (c) 2012-2016 Jake Gordon and contributors)
- Commit: 3e8a060b5900755db27f899612a74a77427c853e
- Ingested: 2025-09-24
- Stripped: dead version links (v1-v3 not shipped), stray loading text; only comments carry http URLs, nothing loads externally (audio, images, scripts, css are all local).
- Glue added: touch buttons (accelerate/brake/steer) + restart button, responsive style block, music unlocked on first user interaction instead of autoplay.
- Files: index.html, common.css, common.js, stats.js, images/*.png (background, sprites, mute), music/racer.mp3, music/racer.ogg, LICENSE, CREDITS.md
- Fragment: /tmp/games_batch2_8.json (entry id 196)
# W9 mirror sources (batch 2)

## 1. Games/Rhythm
- Repo: https://github.com/ChloeLiang/rhythm-game
- License: MIT, Copyright (c) 2018 Liang Xin, Chloe
- Commit: 4995fbf1573f0dbdfac00bfe99c18523b610f24d (2018-12-05)
- Ingested: 2026-09-24
- Files shipped: index.html, css/style.css, scripts/script.js, scripts/song.js, media/music.mp3, LICENSE, CREDITS.md (952K)
- Stripped: Google Fonts (Playball), icons8 favicon, remote og:image/og:url, external menu links, heart char, gradients, uppercase text transforms, unused screenshot.gif.
- Glue added: inline controls header, pointer/touch input on keys, clear/failed result heading, "Play again" restart, pointer-events off on faded menu.
- Validation: node --check script.js/song.js OK; zero http(s) references; no emoji/em-dash/gradients in shipped UI.
- Rejected candidates: 111116/webosu (MIT, but fetches beatmaps from remote sayobot API, no bundled songs, not offline-usable).

## 2. Games/BulletHell
- Repo: https://github.com/selenebun/bullethell
- License: MIT, Copyright (c) 2020 Amelia Clarke
- Commit: 75173f8c37868ac7f30b886da6d28560e8e4418b (2020-12-07)
- Ingested: 2026-09-24
- Files shipped: index.html, style.css, scripts/ (main.js, util.js, class/, template/, lib/p5.min.js), fonts/SourceCodePro-Regular.ttf, LICENSE, CREDITS.md (668K, 28 files)
- Stripped: nothing external existed (p5.js and font vendored upstream); dropped upstream readme (unreferenced) in favor of CREDITS.md.
- Glue added: touch/mouse drag-to-move and hold-to-fire in player controls, sidebar notices for lose (ship destroyed, level restarts) and win (boss killed, next level), touch line in inline Controls list.
- Validation: node --check on all 22 shipped js files OK; zero http(s) loads (p5.min.js contains only license/comment URLs); no emoji/em-dash/gradients in shipped UI.

## Pending
- 3. Tents (in progress)
# Mirror sources — batch 2, worker 10

Recorded 2026-09-24. All provenance established by shallow-cloning the candidate repo to `/tmp/mirror_clones/` and byte-comparing files against the shipped dir (`diff` / `diff -rq`). Nothing committed.

## Task A — provenance for the 6 timed-out ingest dirs

Every dir below got a `Games/<Dir>/CREDITS.md` written with the same details.

### Games/Asteroids
- Repo: https://github.com/dmcinnes/HTML5-Asteroids
- License: MIT — Copyright (c) 2010 Doug McInnes
- Commit: 930301cbda83ed3b120f64b801d937d077ee2da0 (2016-01-13)
- Verification: shipped `LICENSE` byte-identical to upstream; `game.js`/`ipad.js` match upstream except small documented edits (state rename `waiting`→`start`, sentence-case canvas text, generic touch detection replacing iPad-only code); asset set (jquery 1.4.1, vector battle typeface, 2 wav files) identical.
- Modifications: offline ingest, analytics stripped; new index.html (HUD + touch controls).

### Games/Frogger
- Repo: https://github.com/RotaruDan/frogger
- License: GPL-2.0 (upstream LICENSE + README state GNU GPL v2)
- Commit: a4b33cf54297b4f71d0e0f31c1911fea2d4b2360 (2014-03-17)
- Verification: shipped README.md is the upstream README and links to this exact repo; `base.css` byte-identical; `engine.js`/`game.js` differ only in the documented edits.
- Modifications: offline ingest, analytics stripped; removed rotate `alert()`s, replaced `bangers` web font with system fonts, auto-start + score HUD, new index.html.

### Games/MissileCommand
- Repo: https://github.com/andymason/Missile-Command-JavaScript-Clone
- License: MIT — Copyright (c) 2012 Andrew Mason
- Commit: d82cabdfd73cd60fa46bea98075663c8719ac5df (2012-11-05)
- Verification: shipped `LICENSE` and `README.md` byte-identical to upstream; `missile_command.js` is upstream + additive edits (score/wave HUD, win/restart state, scaled click coordinates).
- Modifications: offline ingest, analytics stripped; new index.html wrapper.

### Games/LunarLander
- Repo: https://github.com/maryrosecook/retro-games (subdir `lunar-lander/`)
- License: MIT — Copyright (c) 2013-2014 Mary Rose Cook and contributors
- Commit: 2c9a82216cd4a97bd4bb2b9c40f95dbb0a6d2222 (2014-08-22)
- Verification: `lunar-lander.js` and `index.html` byte-identical to upstream; LICENSE is the upstream MIT text.
- Modifications: offline ingest, analytics stripped; no code changes (LICENSE.md renamed to LICENSE, screenshot dropped).

### Games/SpaceInvaders
- Repo: https://github.com/ozelentok/SpaceInvaders
- License: MIT — Copyright (c) 2018 Oz Elentok
- Commit: 02ccd86d3841d90cff99b85b05adc0cd052d7570 (2018-09-02)
- Verification: `javascripts/`, `images/`, `vendor/`, `apple-touch-icon.png` all byte-identical (`diff -rq` clean); shipped `LICENSE` == upstream `LICENSE.txt`.
- Modifications: offline ingest, analytics stripped; only HTML head rewritten (viewport meta).

### Games/DuckHunt
- Repo: https://github.com/MattSurabian/DuckHunt-JS (upstream ships the game as a webpack build; we ship its `dist/`)
- License: MIT — Copyright (c) 2015 Matt Surabian
- Commit: 5a28db7442ebc7dc8060342413df24c0319f4190 (2026-03-27)
- Verification: `duckhunt.js`, `audio.json`, `sprites.json`, `audio.mp3`, `audio.ogg`, `sprites.png` byte-identical to upstream `dist/`; `LICENSE` byte-identical; index.html keeps upstream title "DuckHuntJS" and meta author "Matt Surabian".
- Modifications: offline ingest, analytics stripped; only the prebuilt `dist/` runtime shipped (no build tooling).

Note: the candidate `github.com/Urshoulder/duckhunt` and the `duckHuntJS`-named repos (evKoval etc.) are unrelated; the authoritative match is `MattSurabian/DuckHunt-JS` (author matches the LICENSE copyright and the index.html meta author tag).

## Task B — sources

### Games/CribbageClassic
- Repo: https://github.com/jeffbcole/jeffbcole.github.io (upstream of cribbageclassic.com; repo `CNAME` + `cribbage_privacy.html` confirm the site)
- License: Apache-2.0 (shipped LICENSE byte-identical to upstream)
- Commit: 9a3fd29a25776a232fbb584ff3dd5dd6c35f2628 (2026-03-02)
- Verification: `cards.css`, `game.js`, `computerPlayer.js`, `scoreboard.css`, `images/` byte-identical; other js/css are upstream with small edits (Google Analytics gtag block removed, app-store redirect removed, auto-start, how-to overlay).
- CREDITS: dir previously had NO CREDITS.md — one was written during this task (Games/CribbageClassic/CREDITS.md).

### Games/Crossword
- Repo: https://github.com/HoldOffHunger/jquery-crossword-puzzle-generator
- License: BSD 3-Clause — Copyright (c) 2017 Benjamin Tepolt
- Commit: 797d689fe5b9811a5bbd0922bff769c0f4583eb4 (re-verified this session: clone HEAD == CREDITS.md commit)
- Verification: `css/crossword-puzzle.css` and `LICENSE` byte-identical; `javascript/crossword-puzzle.js` differs only in the two reworded message strings documented in its CREDITS.md; local `javascript/jquery.min.js` is vendored jQuery 3.2.1 (MIT), served locally per CREDITS.
- CREDITS: Games/Crossword/CREDITS.md already present and accurate.

## Task B — completeness checks (both PASS)

- CribbageClassic: index.html present; 32 local refs, 0 missing; all 5 JS files pass `node --check`; no external `src/href` loads; LICENSE (Apache-2.0) present; CREDITS.md now present.
- Crossword: index.html present; 3 local refs, 0 missing; both JS files pass `node --check`; no external `src/href` loads; LICENSE (BSD-3) + CREDITS.md present.
- Catalog fragments written to /tmp/games_batch2_10.json (ids 205 Cribbage, 206 Crossword; both ids unused in games.json, max id currently 193).

## Disk / cleanup

Clones used ~10 MB total under /tmp/mirror_clones/; left in place for audit.
# Mirror sources - W12

## Gomoku (id 214)
- Dir: `Games/Gomoku/`
- Repo: https://github.com/kevin2014123/gomoku-ai
- License: GPL-3.0 (LICENSE file verified in clone)
- Commit: 0da7b551af7354cdaffab9f156ecbfd3d9c01fa6
- Cloned to /tmp/gomoku-ai on 2026-09-25.
- Stripped: Font Awesome CDN link, 3 external MixKit audio files, dummyimage.com star banner, GitHub star solicitation block, donation button + agreement modal, author button/modal + inline script/styles, reward-page window.open, emoji, one UI gradient.
- Added: inline sentence-case instructions in header (game starts on load; no intro overlay existed upstream).
- Files shipped: index.html, script.js, style.css, LICENSE, CREDITS.md.
- Validation: `node --check script.js` OK; no http(s) refs remain; no emoji/em-dash in shipped copy.

## Mancala (id 215)
- Candidate 1 REJECTED: https://github.com/AlexHedley/mancala (MIT, commit 7e0a29a5c6229dd0f17ed18fddd971a1d565c2e8) - it is an Angular game-log listing page, not a playable Mancala game.
- Dir: `Games/Mancala/`
- Repo: https://github.com/99fk/mancala-html
- License: GPL-3.0 (LICENSE file verified in clone)
- Commit: 67b4573f8171863ba66b991f221b63f6b0b990c5
- Cloned to /tmp/mancala-99 on 2026-09-25.
- Already fully offline single-file (WebAudio, data-URI favicon): nothing external stripped.
- Modified: removed uppercase transform on section titles, added 44px min-height on controls, added inline sentence-case instructions in header, em-dash draw status -> "Draw", em-dash in code comment tidied.
- Files shipped: index.html, LICENSE, CREDITS.md.
- Validation: extracted inline JS passes `node --check`; no external http(s) refs (only GPL header links); no emoji/em-dash in shipped copy; game starts on load with win/lose in move log, restart, undo/redo, hint (h key), click/touch + keyboard input.

## Balatro (id 221)
- Dir: `Games/Balatro/`
- Source: https://github.com/OutBlade/balatro-web @ 3c8cf43
- ROM: GBALATRO v0.2.2 (https://github.com/GBALATRO/balatro-gba), MIT fan project
- License: MIT (demake); original Balatro IP belongs to LocalThunk/Playstack
- Wrapper: house EmulatorJS pattern (local ROM + shared local ../_emulatorjs loader, startOnLoaded)
- Validation: browser boot test passed, title screen renders, PLAY/OPTIONS visible, zero 4xx
