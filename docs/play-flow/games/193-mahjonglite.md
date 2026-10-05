# Mahjong Lite play-flow audit (batch 4)

Identity: registered id 193, entry `Games/MahjongLite/index.html`, entry blob `32fb012cbf648e8c44c6caef618f50bbdb3c48a4`, tree `9b9ce57c0550278315f0a3864a0bc48e3a621be0`, 2 files, 20,312 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/193-mahjonglite.md` read for orientation; source re-checked directly.

Validation status: **CODE-REVIEW ONLY**. No browser play this run.

## Source inspected

- `Games/MahjongLite/index.html` (blob above, includes all JS/CSS): full-file function/ID inventory via grep. Functions verified present: `buildTypes`, `createBoard`, `faceFor`, `leftNeighbors`, `rightNeighbors`, `isOpen`, `countMoves`, `suggestMove`, `onTileClick`, `activateCursor`, `moveCursor`, `clearCursor`, `removePair`, `doHint`, `startGame`, `endGame`, `startTimer`, `stopTimer`, `clearHintTimers`, `updateHud`, `fitBoard`, `freeOpenTiles`, `setSelected`. IDs verified: `#board`, `#stage`, `#viewport`, `#score`, `#time`, `#tilesLeft`, `#moves`, `#msg`, `#hintBtn`, `#restartBtn`, `#endOverlay`, `#endTitle`, `#endText`, `#endScore`.
- `removePair` region (lines 359-367) read: `setSelected(null)`, `clearCursor()`, `clearHintTimers()`, then `setTimeout(() => { ... })` at line 366 for the delayed removal; hint blink timers at lines 390/397.
- `LICENSE` (blob `7fedfb413926e4f50d44f9364a0dea5fb4f8f4c0`) inventoried.

Held: the full body of `removePair`'s timeout callback (exact delay duration and the `elsAt` lookups inside) and the complete `COORDINATES`/`faceFor` markup were not re-read line by line this run; the 190ms delay figure comes from the manual and is marked orientation.

## Flow

- Boot: `startGame()` builds a random turtle board from `COORDINATES` level0-level4 (144 tiles) and starts the timer; auto-start, no menu.
- Input: pointer `onTileClick` and keyboard cursor (`moveCursor`/`activateCursor`, Enter/Space select) converge on `removePair`.
- Core loop: no RAF. Event-driven removal plus one `setInterval` timer for `#time`.
- Score/progression: `#score` +10 per pair, hint penalizes up to 5 (orientation), `#tilesLeft`, `#moves`; win bonus `max(0,600-seconds)` (orientation).
- Win/lose: `#endOverlay` with `#endTitle`/`#endText`/`#endScore`: win when all tiles removed; loss when `countMoves()` finds no legal pair after a removal.
- Restart: `#restartBtn` and end-overlay buttons call `startGame()` for a new randomized board (same deal not preserved).

## UI bloat classification: MILD

Persistent: `#msg` hint line and HUD anchors `#score/#time/#tilesLeft/#moves` (genuine HUD, keep). `#endOverlay` result card is a genuine game result. The instructions/"four layers" copy disagrees with the five z levels (orientation): inaccurate but one-time text, not a nag. No ads or promo cards.

## Popup/modal inventory

- `#endOverlay`: appears once per terminal round (win or no-moves), dismissed by restart buttons. Repeat only on new deals.
- No recurring popups, no ad/info modals.

## Animation/simulation

No game loop. Pair removal uses a delayed `setTimeout` inside `removePair` (line 366) with a 190ms visual delay (duration orientation); hint blinks use chained `setTimeout`s pushed to `hintTimers` (lines 390, 397). Timer is interval-based seconds counting.

## Findings

- HIGH: `removePair`'s delayed callback plus `startGame()` reset: the timeout is not stored/cancelled and the callback resolves tiles through the mutable global maps after a restart, so a restart inside the delay window can delete/alter tiles of the new board. Root: shared `removePair` lifecycle. Fix: session token or cancellation plus synchronous logical removal before animation.
- HIGH: during the delay the pair stays in `current` with `running` true, so rapid repeat activation can enqueue the same pair twice and double-count points (same root). Fix: lock input or remove logically at once; cover both pointer and keyboard callers.
- MEDIUM: `fitBoard()` scales 56px faces to roughly 20px at phone widths, under the 44px touch target bar (orientation, not measured). Fix: measured mobile zoom/scroll design.
- LOW: instructions copy (layer count, "pair highlighted") disagrees with code (five z values, one tile highlighted). Fix the copy only.
- No fix needed: neighbor/free-tile rules and flower/season groups are sound; keep.

## Recommended playable view

Keep board, HUD anchors, hint button, result overlay. Move rules text into a one-time acknowledged help with optional reopen. No recurring popups to remove. Keep touch selection; do not shrink targets further.

## Smallest browser check still needed

Select a valid pair then press Restart within the removal delay and inspect the new board; double-click the same pair rapidly and watch `#score`; then one keyboard cursor pass and a phone-width layout look.
