<!-- maintenance-game: Games/KlondikeSolitaire -->
# Klondike Solitaire maintenance

## Identity and status

Registered ID **178**, category `classic`, entry `Games/KlondikeSolitaire/index.html`. Baseline `8c8a055`; four files, 29,932 bytes. This is local draw-one Klondike with readable rules/rendering. Native play, screenshots and complete solvability were not tested by this docs worker.

## Implementation map

**Source review coverage:** complete HTML, `script.js`, `style.css`, MIT notice and ingestion record read. No compiled engine/art files exist.

Deferred script caches stock/waste/foundation/tableau DOM and result dialogs, then calls `startGame` automatically. `createDeck/shuffle` build 52 cards using Web Crypto; deal creates seven tableau piles with only top cards face-up and 24 stock cards. `buildMove/isValidSequence` capture movable runs. `canMoveToFoundation/canMoveToTableau` are shared validators; `moveDragged/removeFromSource/afterMove` mutate and reveal newly exposed cards.

`autoMove` chooses the first legal tableau before foundation; `autoFoundation` chooses a legal foundation. `drawFromStock` draws one or recycles waste. `saveHistory/undoMove` snapshot/restore cards and move counts. `checkWin/checkStuck/hasAnyLegalMove` determine results. Renderer replaces pile contents and `restoreFocus` uses stable card IDs to preserve keyboard focus.

## Gameplay and controls

Build same-suit foundations ace through king. Tableau descends in alternating colors; empty columns require kings. Click/tap moves to the first valid destination, not a strategic solver-selected best move. Mouse drag selects destinations. Double-click or Shift+Enter requests foundation; ordinary Enter auto-moves a focused card. S draws, U undoes, N deals again; native Tab navigates cards/buttons. Empty stock recycles the waste without shuffling. Win requires four complete foundations; source also offers a no-moves loss, whose detector is flawed below.

New game and result Play again deal fresh cards. Menu also deals immediately; there is no landing screen anymore. No audio exists.

## State and persistence

Global `state` owns four pile families, moves, start timestamp, one timer, dragged move, history, running and focus ID. `startGame` clears prior timer and closes result dialogs before dealing. After win/loss it stops the timer and input guarded by `running`. Undo restores piles/moves but not elapsed time, and is blocked after result. No persistent save keys or storage occur; reload loses progress. CSS card templates use internal deck values, not user-controlled text; innerHTML here is not evidence of XSS by itself.

## Dependencies and provenance

Local MIT `LICENSE` credits AJimber. Header and [source report](../../catalog_parts/sources_6.md) record `https://github.com/AJimber/KMN_Solitaire`, revision `c25d7a989898fa5e1db3aff41950b2106d9fba97`. Deal/move/history code was adapted with English copy, keyboard, flat card backs and a loss detector. No source network comparison was performed. Modern browser features include `.at`, Web Crypto and native `<dialog>`; no external packages/assets are required.

## Audit findings

- **HIGH, static false loss:** `script.js`, `hasAnyLegalMove`: when stock is empty, it tests only current waste top and ignores that `drawFromStock` can recycle the entire waste. A buried playable card can become reachable in the next pass even when the current top is blocked; `checkStuck` falsely ends and locks the round. Root fix: include every legally reachable stock/waste draw cycle, or treat the loss detector conservatively until a complete draw-state search is tested.
- **MEDIUM, static dialog lifecycle:** native Escape can close `#lose-dialog/#win-dialog` while `state.running` stays false; board remains visible but inert, with only New game/Menu recovery. Handle cancel explicitly and communicate ended state rather than implying continued play.
- **MEDIUM, static mobile geometry:** media CSS at 360px gives cards 43.2px wide; seven columns plus six 7px gaps total 344.4px before shell's 24px padding, exceeding available width. Root fix: fit card/gap budget together or provide deliberate accessible scrolling, not hide overflow.
- **Historical limitation:** P2a verified S draws and reset; its covered-waste selector never proved drag/click foundation moves. Current code contains a dblclick handler despite that report's contrary aside.

## Safe iteration

Correct deadlock reasoning in the shared detector, not by suppressing the loss dialog for one button. Preserve recycle order, undo clones and card count. Avoid replacing upstream gameplay with a new engine. Keep result guards and focus restoration; any save feature needs an explicit schema/corruption design, not speculative persistence.

## Verification

Actually run: Git/catalog identity and JS syntax checks in [batch 65](../audits/games-65.md); **0 native runs**. [P2a historical evidence](../../audit_batches/playtest_p2a.md) is bounded draw/reset evidence, not a completed deal.

Recommended native checks: stock/recycle order, buried playable waste card, alternating run drag, king to empty column, ace foundation/double-click, undo revealing a hidden card, true win, dialog Escape, keyboard focus and phone overflow. Sparse read: `git show HEAD:Games/KlondikeSolitaire/script.js`; Main owns browser assets/full catalog gate.

## Future outlook

Week 1: conservative deadlock repair and regression fixture. Week 2: mobile layout, dialog cancel/ended state and reachable-card focus. Later: optional same-deal retry/save only after rules and lifecycle tests. Defer new card art and automatic solver; no external dependency is necessary.
