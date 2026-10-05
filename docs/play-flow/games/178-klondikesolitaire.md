# Klondike Solitaire play-flow audit (batch 4)

Identity: registered id 178, entry `Games/KlondikeSolitaire/index.html`, entry blob `210322ed916087f6d4e7c79eba7e2d9ad15ff454`, tree `7ea37f3e91b146441e610ee33a2dda836daf0d90`, 4 files, 29,932 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/178-klondikesolitaire.md` read for orientation; source re-checked directly.

Validation status: **CODE-REVIEW ONLY**. No browser play by this worker. Historical P2a receipts are not this run's test.

## Source inspected

- `Games/KlondikeSolitaire/script.js` (blob `978505e99993af991429f4b2e13fc2c7be220774`, 18,101 bytes): full-file grep for function definitions and listener registrations; loss-detector region lines 455-505 read verbatim. Verified functions: `render`, `restoreFocus`, `renderStock`, `renderWaste`, `renderFoundations`, `renderTableau`, `createCardElement`, `buildMove`, `canDrag`, `canDrop`, `moveDragged`, `removeFromSource`, `canMoveToFoundation`, `canMoveToTableau`, `isValidSequence`, `afterMove`, `flipAvailableCards`, `drawFromStock`, `autoFoundation`, `autoMove`, `checkWin`, `hasAnyLegalMove`, `checkStuck`, `saveHistory`, `undoMove`, `cloneCards`, `updateTimer`, `toMenu`. Listeners verified: `click`, `dragstart`, `dragend`, `dblclick`, `focus`, `keydown`, `dragover`, `dragleave`, `drop`.
- Verbatim region read: `hasAnyLegalMove()` returns true when `state.stock.length > 0`; with empty stock it tests only `state.waste.at(-1)`; `checkStuck()` sets `state.running=false`, clears `state.timerId`, fills `#loseSummary` and calls `els.loseDialog.showModal()`.

Held: the remaining ~10KB of `script.js` (render/drag/undo bodies) and full `style.css`/`index.html` line-by-line re-read this run; their behavior descriptions come from the function inventory plus manual orientation.

## Flow

- Boot: deferred script caches pile/dialog elements, then auto-calls `startGame`.
- Start/setup: fresh shuffled 52-card deal, seven tableau piles, 24-card stock; timer starts.
- Input: click/tap auto-moves to first legal destination; drag with drop targets; `dblclick`/Shift+Enter to foundation; `keydown` for S draw, U undo, N deal.
- Core loop: no RAF; event-driven DOM re-render (`render` replaces pile contents).
- Score/progression: move count and elapsed time (`updateTimer`), win when four foundations complete (`checkWin`), loss when `checkStuck` proves no move.
- Win/lose: native `<dialog>` `#win-dialog`/`#lose-dialog` with Play again focus.
- Restart: Play again / New game / Menu deal fresh hands; reload also resets. No persistence keys.

## UI bloat classification: MILD

Persistent non-game surface: instructions/menu text and the dialog chrome around the board (from `index.html`, orientation-level). Genuine game HUD: timer/move readouts and the result dialogs; keep. Essential touch input: card drop targets; keep. No ads, no promo cards.

## Popup/modal inventory

- `#lose-dialog`: triggered once when `checkStuck` proves deadlock; repeatable only via new deals. Escape can cancel it (manual finding, dialog `cancel` handling not re-verified this run).
- `#win-dialog`: triggered on `checkWin`, same shape.
- No recurring nag, ad or info popup exists.

## Animation/simulation

No simulation loop. Card reveal/move is synchronous DOM replacement; only `updateTimer` interval ticks time. No decorative animation claims.

## Findings

- HIGH: `script.js::hasAnyLegalMove` with empty stock tests only the current waste top and ignores that `drawFromStock` recycles the waste into the stock (code comment at line ~460 asserts recycle cannot change reachability; recycling reverses order and exposes buried cards on later draws). A reachable card buried under the current top causes a false `checkStuck` loss that locks the round. Root: loss detector. Fix: include the full stock/waste draw cycle in legality search, or stay conservative (no loss dialog) until verified.
- MEDIUM: `#lose-dialog`/`#win-dialog` Escape-close leaves `state.running=false` with a dead but visible board; only New game/Menu recovers. Root: dialog `cancel` path. Fix: handle cancel and surface an explicit ended state.
- MEDIUM: mobile column width overflow at 360px (manual, not re-measured this run). Root: media CSS card budget. Fix: fit cards+gaps together.
- No fix needed: `restoreFocus`/stable card IDs and shared validators are good structure; do not add a solver.

## Recommended playable view

Keep board, timer/moves HUD, result dialogs, touch drag/click input, New game/Menu. Move deal/rules description text into a one-time acknowledged help with optional reopen. No recurring popups exist.

## Smallest browser check still needed

Deal, bury a playable waste card under an unplayable top with empty stock, trigger draw/recycle, and confirm no false loss dialog; then one drag-to-foundation move and one Escape on the lose dialog.
