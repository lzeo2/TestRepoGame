<!-- maintenance-game: Games/Reversi -->
# Reversi maintenance

## Identity and status

Registered ID **172**, category `strategy`, entry `Games/Reversi/index.html`. Baseline `8c8a055`; one readable file, 26,862 bytes. Rules, MCTS computer and animated DOM view are inline. No runtime remote dependencies occur in the inspected source; this docs task did not run a browser.

## Implementation map

**Source review coverage:** full file read: HTML/CSS, `createRoot/createNode/selection/expansion/simulation/backprapogation/mcts`, view helpers, rules, turns and keyboard glue. No opaque bundle/binary engine exists.

`init` sizes the board, seeds the array, schedules initial artwork/hints and enables input synchronously. `validMove` scans eight directions; `availableMoves` enumerates candidates; `makeMove` returns the placed disc and all flips. `humanTurn` makes a legal move, disables listeners/hints and schedules `aiTurn` through two animation frames. AI calls synchronous `mcts` with a 1,500ms budget. `gameOver` checks full board or neither side having moves; `winner` counts discs. `flipDisks` relies on CSS animationend to settle colors.

DOM anchors are `.board/.square/.disk`, `#countYou/#countThem/#status`, `#resultOverlay/#againBtn/#restartBtn`. Counts come from the array, not delayed artwork.

## Gameplay and controls

Human is black and moves first from four central discs. Tap a highlighted square; legal captures flip bracketed white discs. Arrows move a cursor; Enter/Space place when `humanInputOn`. One side without moves passes; neither side able to move ends with largest count or draw. Restart reloads, while Play again calls the animated `newGame` path. No sound is implemented.

Initial input is live before the four discs finish appearing, so tests must distinguish logical board state from staged artwork. The new-game animation still uses a delayed input path; it is not identical to initial startup.

## State and persistence

Closure globals own `board`, `player`, constants, `humanInputOn` and keyboard cursor. MCTS nodes copy boards and own visits/wins/children; no worker is used. Multiple setTimeout/requestAnimationFrame callbacks and transition/animation listeners are not stored as cancellable round handles. No save key, localStorage or persistent score exists. Reload is the strongest reset; Play again reuses the same DOM/listeners and must avoid stale visual callbacks.

## Dependencies and provenance

Header, visible footer and [source report](../../catalog_parts/sources_5.md) identify Alexander Berson's `https://github.com/alex-berson/reversi`, revision `c9c1cdc87e03d131463737bbc6e401a9df65f4ac`, claiming MIT. AI was retained; the UI/HUD/keyboard/reset sizing were adapted and service worker/fonts omitted. No separate LICENSE or full MIT grant is tracked in this one-file folder. That missing notice remains a provenance completeness hold, not guessed relicensing.

## Audit findings

- **MEDIUM, static performance:** `aiTurn/mcts` loops synchronously until Date.now exceeds 1,500ms. Input, repaint and Restart cannot run during that task. Root fix: a bounded worker or cooperative slices only after measured hardware evidence; retain legal/pass semantics.
- **MEDIUM, static input gap:** `aiTurn`, `showHints(); setTimeout(enableTouch, 200)`: subsequent human turns advertise legal moves before attaching listeners. Initial `init` fixed this only for startup. Root fix: enable validated input with the hints at one shared turn-readiness boundary.
- **MEDIUM, static animation correctness:** `flipDisks` settles model color only on animationend. Disabling animation for reduced motion without a synchronous settlement would leave stale colors. Root fix: render final color independent of optional animation; preserve the array as truth.
- **Resolved historical startup finding:** current `init` calls `enableTouch` synchronously. P1b's startup hint-window failure is superseded in source; no new native pass is claimed.

## Safe iteration

Patch shared human-turn readiness, not individual click callers. Preserve `validMove/makeMove` behavior and the two-pass end rule. If adding cancellation, tag each new round and reject stale callbacks rather than reloading for every repaint. Keep attribution and authentic license recovery separate from visual changes. Do not default to a new framework or weaker AI to hide freeze evidence.

## Verification

Actually run: Git/catalog identity and inline-script stdin parsing in [batch 65](../audits/games-65.md). **Native runs: 0.** [Historical P1b](../../audit_batches/playtest_p1b.md) had no successful move and did not prove a terminal game.

Recommended native checks: immediate legal startup move, every subsequent hint/input boundary, black/white pass fixtures, full/double-pass endings, Play again versus Reload, resize/rotation, reduced-motion colors and N100 long-task measurements. Sparse source command: `git show HEAD:Games/Reversi/index.html`; Main handles browser extraction/full catalog smoke.

## Future outlook

Week 1: readiness and notice evidence; week 2: non-color board semantics, result focus and reduced-motion settlement. Week 3: measured AI responsiveness changes with unchanged rule tests. Defer multiplayer, save migration and decorative restyling until the local loop has actual play proof.
