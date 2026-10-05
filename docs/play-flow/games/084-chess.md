# Chess (id 84) - play-flow audit report

CODE-REVIEW ONLY. No browser run in this pass.

- Identity: id 84, registered, url `Games/Chess/index.html`.
- Baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 24 files, 365048 bytes.

## Source inspected

- `Games/Chess/index.html` blob `177b2ba649aeb74dd610a4117f8586a49298658c` (2468 bytes, read completely).
- `Games/Chess/script.js` blob `598e5c0538bf8575250da1921431ec067235999c` (10069 bytes, read completely): `minimaxRoot`, `minimax`, `evaluateBoard`, `getPieceValue`, `showGameStatus`, `clearGameStatus`, `onDragStart`, `onDrop`, `onSnapEnd`, `onMouseoverSquare`, `greySquare`, `makeBestMove`, `getBestMove`, `renderMoveHistory`, `ChessBoard('board', cfg)`, `#new-game-btn` handler.
- Not re-read line-by-line (vendored libraries, only names/roles confirmed): `lib/chess.js` blob `f1c34b9e2e2151604db4bef81cc72af92a1ca4b9`, `lib/chessboardjs/js/chessboard-0.3.0.js` blob `6d54ad1d294069e6f68c17770c60039ef8cdd884`, `lib/jquery/jquery-3.2.1.min.js` blob `2216e7a1ac9e2eb5283666130db0ed9e79922b94`. Held: these libraries' internals.

## Flow

- Boot: scripts load jQuery, chess.js rules engine, chessboard.js, `script.js`; `board = ChessBoard('board', cfg)` with `draggable: true`.
- Start/setup: page auto-starts at `position: 'start'`. `#new-game-btn` resets `game = new Chess()`, clears `#move-history`, `#position-count`, `#time`, `#positions-per-s`, `#game-status`.
- Input/core loop: drag-and-drop via `onDrop` -> `game.move({from,to,promotion:'q'})`, then `setTimeout(makeBestMove, 250)`; AI = `minimaxRoot(depth)` alpha-beta over `game.ugly_moves()` with `evaluateBoard` material tables; depth from `#search-depth` `<select>` (1-5, default 3). Hover highlight via `onMouseoverSquare`/`greySquare`. Note: `controls-doc` text also documents click-to-select; that click-select path is NOT in `script.js` - only drag is wired. See finding 2.
- Score/progress: `renderMoveHistory` into `#move-history`; engine stats `#position-count`, `#time`, `#positions-per-s`.
- Win/lose: `showGameStatus()` on `game.game_over()` writes `#game-status` (checkmate/draw/stalemate text) and adds `.visible`. `onDragStart` blocks further moves after checkmate/draw.
- Restart: `#new-game-btn` only. No exit/back inside game (portal provides navigation).

## UI bloat: MILD

- Persistent: `#header` logo image, `.controls-doc` "How to play" paragraph (always visible), `.info` block with search depth, three engine-stat lines (`Positions evaluated`, `Time`, `Positions/s`) separated by `<br>` pairs, `#move-history`.
- Genuine HUD: `#game-status`, `#board`, `#new-game-btn`, `#move-history`.
- Popups/modals: none. No recurring nag/ad/info popups anywhere in source.

## Animation

- No RAF loop authored here. Visual updates are chessboard.js repositioning piece images (`board.position(game.fen())`) and `greySquare` background CSS. Held: chessboard-0.3.0.js internals.

## Findings

1. HIGH - `index.html` `.controls-doc` claims "Click (or tap) a white piece to select it, then click the destination square", but `script.js` only wires `ChessBoard` drag callbacks (`onDragStart`/`onDrop`), no click-to-move handler. On touch devices drag may work via chessboard.js mouse emulation, but the documented tap path is unverified and likely wrong. Fix: either implement click/tap select+drop in `script.js` or correct the text after a real touch test.
2. MEDIUM - `index.html` line 9 loads `../../storage/js/cloak.js` (blob `38c9c6618e7a36548d6019e12d869805f55096da`, present in tree). Shared portal cloak, relative path, offline; but it is a cross-directory script outside the game folder - keep it, do not add new external loads.
3. LOW - engine-stat panel (`#position-count`, `#time`, `#positions-per-s`) is developer telemetry, not gameplay. Candidate to fold into an expandable details row in a decluttered view; keep `#move-history`.
4. LOW - `renderMoveHistory` calls `historyElement.empty()` twice (dead first call).

## Recommended playable view

Keep `#board`, `#game-status`, `#new-game-btn`, `#search-depth`, `#move-history`. Collapse `.controls-doc` into one-time acknowledged help (reopenable). Move `Positions evaluated/Time/Positions/s` behind that help or remove from play view. No popups to remove.

## Validation

CODE-REVIEW ONLY. Smallest needed check: load the page, drag one white piece, confirm AI replies within ~250ms+search, play to a forced mate or use depth 1 to reach `#game-status`, click `#new-game-btn`, and test tap (not drag) on a touch device to confirm finding 1.
