# Catalog part 8: provenance

Batch 8: four games **ingested** from permissively-licensed open-source
repositories (3x MIT, 1x BSD-3-Clause; LICENSE file shipped in each game
folder), one game **built** in-house because no candidate met the offline
rules. No third-party art, audio or fonts are bundled; every visual is flat
CSS drawn by the shipped code. All word lists are small local embedded arrays
(never fetched).

## Go Fish (Games/GoFish/) - ingested

- **Repo:** https://github.com/surenenfiajyan/go-fish
- **License:** MIT (LICENSE shipped), Copyright (c) 2024 Suren Enfiajyan
- **Taken:** the full `GoFish` game class and its DOM/CSS animation model
  (ask-rank turns, difficulty-weighted AI from `#generateOpponentGuess`,
  books of four collected as "fishes", first to 7 books wins, keyboard
  Enter-to-ask cards, dialog flow).
- **Rejected from search:** `IamYVJ/literature` (MIT, but a 190KB
  multiplayer client with a networking server component; wrong shape for a
  self-contained game), `austinbeaufort/go-fish` and others (no license).
- **Modifications:** inlined into a single `index.html` (module import
  removed); sound pack dropped (the `fetch('card.mp3')` and AudioContext
  path violated offline/single-file); suit PNGs replaced with flat text
  suits (`data-suit`/`data-red` attributes); card-back repeating gradients
  and fish image replaced with flat fills; custom `font.ttf` dropped for
  system fonts; external GitHub/blog link buttons and their emoji removed;
  fixed `width=428` viewport replaced with a responsive meta tag; new
  `Books: you N, computer N` score line; welcome dialog now documents the
  controls; restart-abort race fixed with a run counter; deck-empty edge
  case in `#waitForYourFish` guarded; buttons raised to 44px.

## War (Games/War/) - ingested

- **Repo:** https://github.com/nthugon/javascriptWAR
- **License:** MIT (LICENSE shipped), Copyright 2017 Nathan Hugon
- **Taken:** the `Game`/`Card` round engine nearly verbatim (Fisher-Yates
  shuffle, pot comparison via `getInt`, recursive war ties, players with
  empty hands eliminated, last player standing wins = deck exhaustion), plus
  the flip/war button flow concept.
- **Modifications:** hot-seat multi-player select replaced with a fixed
  You vs Computer match; remote card art (`deckofcardsapi.com` PNGs) and
  Google Fonts removed, cards are drawn locally as flat divs; new UI with
  start screen documenting controls, score line (cards held + rounds won),
  win/lose/draw end overlay and restart; Space-bar flip; engine hardened for
  the both-sides-emptied edge case (`game.draw` guard) that could throw in
  the original.

## Word Search (Games/WordSearch/) - ingested

- **Repo:** https://github.com/remram44/wordsearch
- **License:** BSD 3-Clause (LICENSE shipped), Copyright (c) 2024, Remi Rampin
- **Taken:** the eight-direction checker (`checkWordInGrid`,
  `checkWordsInGridDir`, `checkWordsInGrid`) and the constraint-sorted
  grid generator (place longest words first, prefer slots that overlap
  placed letters) from `play.js`/`generator.js`, and the straight-ray
  selection model.
- **Rejected from search:** `jessefromearth/worddd` (MIT, but broken: words
  marked found by clicking the word list itself, dead placement branches,
  console spam), `remram44` generator UI itself dropped because it fetches
  `wordlists/*.txt` at runtime.
- **Modifications:** single-file game shell with three embedded themed word
  sets (space, animals, fruits; no fetch); pointer drag selection with
  ray preview plus tap-start/tap-end mode; keyboard mode (arrow cursor,
  Enter extends a straight chain, Backspace trims, Esc clears); generation
  verified by the game's own checker so every listed word is findable;
  score line, win overlay, give-up lose overlay, new-grid/menu restart,
  flat 360px-safe styling.

## Boggle (Games/Boggle/) - built (not ingested)

- **Built in-house**, no external source reused. Flat CSS, embedded
  dictionary array, `index.html` only.
- **Reason built, not ingested:** every genuine Baggable candidate failed
  the offline-first rule at its core:
  - `jpk3lly/Wordgame_Javascript` (MIT): validates every word with
    `fetch(https://api.dictionaryapi.dev/...)` and persists scores through
    firebase; stripping both removes the game's core logic, and the repo
    also ships a 2.7MB image set.
  - `lquixada/boggle` (MIT): multi-platform (React Native) solver-style
    project, not a static browser game.
  - `insightcoder/boggle-dictionary` (MIT): its `dictionary.js` is a
    definition-render helper; no actual word list is shipped.
- **Spec compliance:** 4x4 or 5x5 grid chosen on the start screen;
  dictionary words are planted on the grid by the placement algorithm and
  validated against the same embedded array; chains must touch (8-way) with
  no repeats; real Boggle scoring by length (3=1, 4=2, 5=4, 6=7, 7=11);
  3-minute timer (interval cleared on end/restart); clear win (target
  reached) and lose (timer expires below target) states; start screen with
  documented mouse, touch and keyboard controls.

## Word Ladder (Games/WordLadder/) - ingested

- **Repo:** https://github.com/yinggarykairui/word-ladder
- **License:** MIT (LICENSE shipped), Copyright (c) 2026 Kairui Ying
- **Taken:** the engine and its hand-written curated ladder dictionary
  (874 four-letter words, verified byte-identical to the source list,
  embedded verbatim), the wildcard-bucket neighbour graph
  (`buildNeighbours`), largest-component extraction, `bfsFrom`,
  solvable-by-construction `puzzleFor` (distance 3-5 from the same seeded
  stream), one-letter-step validation and the changed-letter rung
  rendering with screen-reader labels.
- **Rejected from search:** `Felicity-Jin/Word-ladder-web` and
  `fuyuxiang693/word-ladder` (both MIT but fetch their word files at
  runtime), `abhisheknair1729/word-ladder` (MIT but ships an 10.8MB
  `wordPairs.js`), `marrow16/gowordladder` (Go solver, not a web game).
- **Modifications:** daily/streak/localStorage/share machinery removed
  (including its external demo URL); flat restyle with no gradients and no
  uppercase text transforms; visible em-dash strings rewritten; new start
  screen documenting controls; seeded `New ladder` restart; move-limit
  lose state (12 moves vs par) with win/lose overlays; score line
  (moves used vs best-possible par).

## Gate

`xvfb-run python3 scripts/smoke_test_games.py --games "Go Fish,War,Word Search,Boggle,Word Ladder"`
passed twice (before and after final fixes): 5/5 games, `console_errors=0
failed_reqs=0` each. An additional Playwright interaction pass exercised
dialogs, turns, drags, keyboard paths, undo and every end state with zero
console/page errors. `games.json` restored byte-for-byte after the gate
(`git diff games.json` empty).
