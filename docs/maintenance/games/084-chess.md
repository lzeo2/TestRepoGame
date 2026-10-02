<!-- maintenance-game: Games/Chess -->
# Chess maintenance

## Identity and status

Registered id **84**, category `strategy`, entry [index.html](../../../Games/Chess/index.html). Baseline `8c8a055`: 24 files, 365,048 bytes; entry blob `177b2ba649aeb74dd610a4117f8586a49298658c`. An authored minimax controller drives vendored chess rules and chessboard.js. No runtime edits or native tests were authorized here.

## Implementation map

Entry loads `lib/chessboardjs/css/chessboard-0.3.0.css`, `style.css`, local jQuery 3.2.1, `lib/chessboardjs/js/chess.js`, chessboard.js 0.3.0 and `script.js`. Rules own legal moves/FEN/history; rendering owns drag/drop. `minimaxRoot` explores `ugly_moves`, calls `ugly_move`, recurses through alpha-beta `minimax`, then undoes each trial. `evaluateBoard`/`getPieceValue` combine material and piece-square tables. `onDrop` applies a legal move with queen promotion, updates history and schedules `makeBestMove`; `onSnapEnd` syncs FEN. `showGameStatus`, `clearGameStatus`, `renderMoveHistory` and New Game update DOM.

Source review coverage: complete entry, authored script and style; rules' draw/game-over/ugly_move API and board's `mousedownSquare`, `touchstartSquare`, `addEvents` reviewed. Vendor rules/rendering were not certified line by line; minified jQuery and redundant `lib/chessjs/chess.js` are not fully human-reviewed. Do not call history markup an XSS flaw merely because it uses append: move strings here originate from the rules engine, not raw player text.

## Gameplay and controls

White is the player, Black the AI. Source supports mouse or touch dragging through chessboard.js; hover highlights legal squares. Entry copy falsely claims two-click selection. No keyboard square-navigation handler was found. Board appears immediately; illegal moves snap back. `#search-depth` offers 1 through 5, default 3; higher depths search synchronously on the UI thread. `#new-game-btn` creates a fresh Chess object and returns the board to start. `#game-status` is a polite live region; `#position-count`, `#time`, `#positions-per-s` and `#move-history` show search/history metrics.

## State and persistence

Globals `game`, `board` and `positionCount` hold the current match. No authored storage key or match save exists. AI uses an unrecorded 250 ms timeout. Reset replaces the global game but does not cancel pending work, so an old reply can mutate a fresh match. Drag-start forbids black pieces and terminal games but does not explicitly reject moves during Black's turn. End-game handling calls `showGameStatus` without returning from `getBestMove`; an absent best move reaches the rules API.

## Dependencies and provenance

Local dependencies are named/versioned in entry paths. `../../storage/js/cloak.js` and `../../images/ico.ico` are inherited references; historical tests report 404s, not essential gameplay dependencies. Directory inventory contains no license/README/source pin. Dependency names alone do not verify licenses or original controller author. [Batch 4](../../audit_batches/batch_4.md) and [playtest r4](../../audit_batches/playtest_r4.md) previously confirmed drag works and click-select does not; these are historical, not newly run evidence.

## Audit findings

- **HIGH**, `script.js`, `onDrop`/`makeBestMove`/New Game: unowned timeout and absent turn/terminal guard permit a reset race and terminal `ugly_move(undefined)`. Minimal fix: keep/cancel one reply timer on reset, reject player moves unless White's turn, return early on terminal games and guard a missing best move in the shared reply function. Reproduce by resetting within 250 ms of e2-e4, or making a terminal move.
- **MEDIUM**, `index.html`, `.controls-doc`: promises click-select absent from actual handlers. Correct copy to drag; add keyboard move entry separately rather than claiming unsupported keys.
- **MEDIUM**, `script.js`, `showGameStatus`: `in_draw()` includes stalemate and other draws; the preceding draw branch makes the explicit stalemate branch unreachable and labels all draws stalemate. Test specific conditions first and use factual generic draw wording.
- **MEDIUM**, same file, `getBestMove`: depth 5 blocks main-thread input; profile before introducing a worker or lowering limits.

## Safe iteration

Patch authored controller/copy first, not vendor bundles. Preserve queen-promotion behavior unless a real chooser is explicitly requested. Back up FEN/history before any future persistence change. House shell color/focus changes belong in style.css; do not wholesale recolor piece art.

## Verification

Actually run: `git show HEAD:Games/Chess/script.js | node --check` passed. Native **0**, screenshots **0**. Recommended: drag e2-e4 at depths 1/3/5, verify one Black reply; reset during pending reply; test checkmate/stalemate/repetition and no reply after terminal move. Measure depth-5 blocking on target hardware. Test touch drag, 320 px layout, tab focus and keyboard-only play limitation. Main owns full smoke.

## Future outlook

Prioritize timer/turn/end-game correctness, then truthful controls and keyboard access. Add a bounded move-reply regression check with those repairs. Defer opening books, stronger engines, multiplayer and save schemas until measured demand; no rewrite is needed for the identified defects.
