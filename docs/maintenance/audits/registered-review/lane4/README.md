# Lane 4: source-only registered-game audit

Baseline: `acf759833a2cd06fb8e6c249cefe5e95c27eb9d8`, current 129-entry `games.json`, zero-based slice `[65:86]` (21 games). This initial receipt preserves scope before the bounded evidence extension. All 21 complete maintenance manuals and inventory records were read. Current Git source, not sparse worktree availability, is the evidence authority.

**Runtime checks: 0.** No browser, server, probe, process termination, checkout, download, install, source change, publication or push. Existing hung browser was not touched. No games added. Main owns subjective slop and removal decisions. No save support alone is not a removal reason.

Load and reload are **NOT VERIFIED** for every row. Gameplay descriptions below are source observations, not acceptance. Persistence present means **NOT VERIFIED (source only)**, never a working-save claim. Cookie path is not applicable to these localStorage keys. LocalStorage shares origin, not game directory. Evidence extension will provide exact source ranges, asset resolutions and tree comparisons.

| ID | Title | Load | Gameplay source | Assets | Slop/provenance | Save status / mechanism / keys / namespace | Reload | Source-only candidates |
|---|---|---|---|---|---|---|---|---|
|169|Puzzle 15|NOT VERIFIED|Auto-shuffle, tile/gap input, moves/time, solve, scramble restart|Inline entry tracked|MIT attribution header; full notice gap|NOT VERIFIED (source only); localStorage `p15-best`, game-prefix, best only|NOT VERIFIED|Overlapping shuffle timers; notice recovery|
|170|Peg Solitaire|NOT VERIFIED|English board, jump/undo, peg/move counts, terminal result, restart|Inline entry tracked|MIT attribution header; full notice gap|none; no key/path|NOT VERIFIED|Native-button key interception; notice recovery|
|171|Checkers|NOT VERIFIED|Auto-board, select/move, piece counts, blocked-side result, reload restart|Inline entry tracked|MIT attribution header; full notice gap|none; no key/path|NOT VERIFIED|Capture-only false loss and turn guard review|
|172|Reversi|NOT VERIFIED|Auto-board, pointer/keys, disc counts, pass/end, newGame/reload|Inline entry tracked|MIT attribution header; full notice gap|none; no key/path|NOT VERIFIED|Synchronous MCTS; hint/input readiness|
|174|Mastermind|NOT VERIFIED|Play, color entry/check, row/score, win/lose, newRound|Local engine/script/style tracked|Tim Baumann MIT notice tracked|none; no key/path|NOT VERIFIED|Give-up terminal consistency|
|175|Nim|NOT VERIFIED|Play, take 1–3, stones/score, final stone, startRound|Inline entry tracked|morimay421 MIT notice tracked|none; no key/path|NOT VERIFIED|Misere winner accounting|
|176|Dots and Boxes|NOT VERIFIED|Play, edge claims, boxes/score, result, startRound|Local script/style tracked|Ayah Jawad MIT notice tracked|none; no key/path|NOT VERIFIED|Keyboard exact-class comparison|
|177|Ultimate Tic-Tac-Toe|NOT VERIFIED|Auto-start, forced board moves, score/results, resetGame|Local script/style tracked|Louis Miguel MIT notice tracked|none; no key/path|NOT VERIFIED|Drawn mini-board global winner|
|178|Klondike Solitaire|NOT VERIFIED|Auto-deal, stock/card moves, counts/time, result, startGame|Local script/style tracked|AJimber MIT notice tracked|none; undo is in-memory|NOT VERIFIED|Waste-recycle false loss|
|179|FreeCell|NOT VERIFIED|Auto-deal, Auto/Pick/Undo, move/time, foundation result, new deal|Local script/style tracked|Taeber Rapczak MIT notice tracked|none; deck/history APIs in-memory|NOT VERIFIED|Empty-cascade selection and stale auto-move|
|180|Blackjack|NOT VERIFIED|Ready table/Deal, hit/stand/double/split, bankroll, target/broke, resetGame|Local script/style tracked|Vimal Ram MIT notice tracked|NOT VERIFIED (source only); localStorage `bj_chips`, `bj_highest`, `bj_title`, game-prefix; no hand save|NOT VERIFIED|Action guards, save timing, delayed bankruptcy|
|181|Video Poker|NOT VERIFIED|Ready table, Deal/hold/Draw, balance, target/bust, resetGame|Local script/style tracked|Varun MIT notice tracked|NOT VERIFIED (source only); localStorage `videoPokerTheme`, game-specific preference only|NOT VERIFIED|Unguarded storage; affordability and variant changes|
|182|Yahtzee|NOT VERIFIED|Auto-ready, roll/hold/category, total/rounds, end, reload restart|Local script/style tracked|Taylor Hansen MIT notice tracked|none; no key/path|NOT VERIFIED|Final upper-bonus ordering|
|184|Go Fish|NOT VERIFIED|Auto-deal, ask/draw, books, seven-book result, newGame|Inline entry tracked|Suren Enfiajyan MIT notice; upstream pin unknown|NOT VERIFIED (source only); localStorage `difficulty`, generic origin-wide preference|NOT VERIFIED|Unguarded startup read; collision risk|
|185|War|NOT VERIFIED|Start, Flip/War, card counts, exhaustion result, startGame|Inline entry tracked|Nathan Hugon MIT notice; upstream pin unknown|none; no key/path|NOT VERIFIED|Final round undercount; result semantics|
|186|Word Search|NOT VERIFIED|Theme start, drag/keys, found words, complete/give-up, new grid|Inline entry tracked|Remi Rampin BSD-3 notice; upstream pin unknown|none; no key/path|NOT VERIFIED|Pointer cancellation; touch target review|
|188|Word Ladder|NOT VERIFIED|Start, submit/undo, moves/par, target/limit, newLadder|Inline dictionary/entry tracked|Kairui Ying MIT notice; upstream pin unknown|none; no key/path|NOT VERIFIED|IME submit risk; result semantics|
|190|Word Scramble|NOT VERIFIED|Auto-start, answer/reshuffle, score/time/rounds, end, startGame|Inline word list/entry tracked|MIT notice and pinned source header|none; no key/path|NOT VERIFIED|Malformed `arakter` word record|
|191|Darts 501|NOT VERIFIED|Auto-start, pointer/keyboard throws, score/turns, double-out/limit, reset|Inline SVG/synth audio tracked|Yusuke MIT notice and pinned header|none; no key/path|NOT VERIFIED|Stale endTurn callback; ring boundary|
|193|Mahjong Lite|NOT VERIFIED|Auto-deal, pair input/hint, score/time/tiles, end, startGame|Inline faces/coordinates tracked|ScriptRaccoon MIT notice and pinned header|none; no key/path|NOT VERIFIED|Delayed duplicate pair/removal after restart|
|195|Sokoban|NOT VERIFIED|Image-preload start, keys/dpad, moves/level, goals, NextLevel(0)|Map script and eight sprites tracked|MIT/CREDITS pin; separate map/art authorship unverified|none; no key/path|NOT VERIFIED|Bounds/box conservation/readiness|

## Initial gates and limits

Actual Node catalog check: `PASS catalog schema/unique IDs/Git URLs: 129`. No game code was executed. Manuals' historical passes do not establish current acceptance. Inventory top-level count says 127, unlike current catalog 129; per-tree identity is checked separately in the extension. No allegation of theft follows from incomplete notice or source-pin evidence. No runtime asset decode or offline closure is claimed. Sokoban's level matrices and binary artwork require separate coverage; source-range limits must not be promoted into a complete semantic engine review.
