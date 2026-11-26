<!-- maintenance-game: Games/Chess -->
# Chess maintenance

## Identity and status

Registered id **84**, category `strategy`, entry [index.html](../../../Games/Chess/index.html). Current update `0135d983`: 25 files, 369,256 bytes; entry blob `681cb8e91148ec06e00a28e3a65a4f99ed5ed1d6`. An authored minimax controller drives vendored chess rules and chessboard.js. Local `chess-worker.js` now owns iterative search; the controller applies only legal replies to the current game. The vendored rules engine is preserved.

## Implementation map

Entry loads `lib/chessboardjs/css/chessboard-0.3.0.css`, `style.css`, local jQuery 3.2.1, `lib/chessboardjs/js/chess.js`, chessboard.js 0.3.0 and `script.js`. Rules own legal moves/FEN/history; rendering owns drag/drop. `minimaxRoot` explores `ugly_moves`, calls `ugly_move`, recurses through alpha-beta `minimax`, then undoes each trial. `evaluateBoard`/`getPieceValue` combine material and piece-square tables. `onDrop` applies a legal move with queen promotion, updates history and schedules a worker search; `onSnapEnd` syncs FEN. The worker receives the current FEN and requested depth, reports the best completed iteration, and is terminated after a 1.2 second budget. `showGameStatus`, `clearGameStatus`, `renderMoveHistory` and New Game update DOM.

Source review coverage: complete entry, authored script and style; rules' draw/game-over/ugly_move API and board's `mousedownSquare`, `touchstartSquare`, `addEvents` reviewed. Vendor rules/rendering were not certified line by line; minified jQuery and redundant `lib/chessjs/chess.js` are not fully human-reviewed. Do not call history markup an XSS flaw merely because it uses append: move strings here originate from the rules engine, not raw player text.

## Gameplay and controls

White is the player, Black the AI. Source supports mouse or touch dragging through chessboard.js; hover highlights legal squares. The entry explains drag and touch-drag controls. No keyboard square-navigation handler was found. Board appears immediately; illegal moves snap back. `#search-depth` offers 1 through 5, default 3; the worker searches by iterative deepening and the UI keeps the best completed legal move when the time budget expires. `#new-game-btn` creates a fresh Chess object, cancels pending delay/search work and returns the board to start. `#game-status` is a polite live region; it reports AI thinking and terminal outcomes. `#position-count`, `#time`, `#positions-per-s` and `#move-history` show search/history metrics.

## State and persistence

Globals `game`, `board`, and `positionCount` hold the current match. No authored storage key or match save exists. AI uses one owned 250 ms reply delay followed by a worker with a 1.2 second deadline. New Game cancels both and invalidates the request before replacing `game`. Input is limited to White's turn, and terminal positions are handled before search. The worker sends algebraic squares; the main thread applies the reply through the legal `game.move` API.

## Dependencies and provenance

Local dependencies are named/versioned in entry paths. `../../storage/js/cloak.js` and `../../images/ico.ico` are inherited references; historical tests report 404s, not essential gameplay dependencies. Directory inventory contains no license/README/source pin. Dependency names alone do not verify licenses or original controller author. [Batch 4](../../audit_batches/batch_4.md) and [playtest r4](../../audit_batches/playtest_r4.md) previously confirmed drag works and click-select does not; these are historical, not newly run evidence.

## Audit findings

- **RESOLVED**, `script.js`, AI reply/reset: one delay timer and one worker are owned and canceled on New Game; moves are accepted only for White when it is that side's turn. Terminal positions do not enter search.
- **RESOLVED**, `index.html`, controls: directions now accurately say drag or touch-drag. Keyboard square navigation remains unsupported.
- **RESOLVED**, `script.js`, terminal status: checkmate and stalemate are checked before the general draw state.
- **RESOLVED**, `script.js` and `chess-worker.js`, depth-five blocking: minimax runs in a local worker with a 1.2 second deadline and iterative deepening; main-thread controls remain responsive. If no completed iteration arrives before the deadline, the game applies the first legal fallback move.

## Safe iteration

Patch authored controller/copy first, not vendor bundles. Preserve queen-promotion behavior unless a real chooser is explicitly requested. Back up FEN/history before any future persistence change. House shell color/focus changes belong in style.css; do not wholesale recolor piece art.

## Verification

Actually run on this change: `node --check Games/Chess/script.js`, `node --check Games/Chess/chess-worker.js`, and `node scripts/test_chess_worker.mjs` passed. Chromium on a local static server performed e2-e4 and observed the legal AI reply Nf6; depth-five search was reset through New Game with no stale reply after 1.7 seconds. During depth-five search, reading the live FEN took 7.3 ms. An advanced checkmate fixture displayed “Checkmate — Black loses!” and the worker regression verified a terminal position returned no move. Browser console had no errors. Native **0**, screenshots **0**. Not checked on a physical touch device or 320 px layout; keyboard square navigation remains unsupported.

### Static metadata receipt (2026-10-15)

Only the entry head description changed. Entry/tree matched inventory at `e787681`.
[Metadata checks and exact paths](../audits/fleet-followup-descriptions.md).
No engine audit or gameplay acceptance; source-coverage limits and known holds remain.

## Future outlook

Prioritize keyboard square navigation and physical-device touch verification. Keep any future search-budget change tied to measurements on the supported low-end device. Defer opening books, stronger engines, multiplayer and save schemas until measured demand; no engine rewrite is needed.
