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
