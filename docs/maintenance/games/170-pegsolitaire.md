<!-- maintenance-game: Games/PegSolitaire -->
# Peg Solitaire maintenance

## Identity and status

Registered ID **170**, category `puzzle`, entry `Games/PegSolitaire/index.html`. Baseline `8c8a055`; one file, 15,911 bytes. The local English-cross rules and vanilla DOM controller use no external resources. Runtime remained read-only; current native runs: none.

## Implementation map

**Source review coverage:** full HTML/CSS/inline script and source header read. Every gameplay function is readable; there is no minified engine or binary asset coverage gap.

`TILES` distinguishes BLANK `2`, FILLED `4`, EMPTY `8`. `BOARDS.english` is the seven-row cross with an empty center. `Board.copy` clones rows; `getTilesBetween/isFilledBetween/getMovesAroundTile` generate orthogonal two-step jumps. `moveTileTo` mutates source/intermediate/destination; the controller only calls it for destinations marked from the legal move generator.

`buildCells` creates 49 buttons with row/column data. `render` hides/disables nonholes, highlights selection/legal destinations and updates `#pegCount/#moveCount`. `onCellActivate` is the shared mouse/keyboard path; successful jumps snapshot the board, mutate, render and call `checkEnd`. `pegsLeft/anyMovesLeft` distinguish one-peg win from no-jump loss.

## Gameplay and controls

Auto-start begins with 32 pegs. Select a peg and tap a blue landing hole to remove the jumped neighbor. Arrows move a clamped 7 by 7 cursor; Enter or Space activates its coordinate. The cursor may visit blank cells, which are not selectable. Tapping the selected peg clears it; tapping elsewhere either selects another peg or clears selection. Undo is available for at most ten undo actions in a live round, not merely a ten-snapshot stack. Restart and result Play again reset the English board.

Exactly one peg anywhere wins; there is no requirement to end at the center. No jumps with multiple pegs loses and locks further play. No audio is implemented.

## State and persistence

The controller owns `board`, `undoStack`, `undosLeft`, `moves`, `selected`, `playing`, `cells`, `cursor`, `kbMode`. Each snapshot is a board copy, and Undo restores it while decrementing its allowance and moves. End locks Undo because `doUndo` requires `playing`. No persistent keys, timer, animation loop or network state exists. Reload discards progress. `startRound` resets cursor but not `kbMode`; a keyboard outline may remain after Restart, which is harmless visual state rather than a corrupted board.

## Dependencies and provenance

Header and [source evidence](../../catalog_parts/sources_5.md) record Sunjay Varma, `https://github.com/sunjay/peg-solitaire`, revision `50c447a770e9dd2fa08fd2949f2b67a10ac5d9df`, claiming MIT. Rules came from `board.js`; the old jQuery/Handlebars/Bootstrap view was replaced with this vanilla controller. No separate LICENSE/full MIT terms are tracked in the one-file folder. Header attribution is not sufficient evidence that all notice obligations were retained; verify and restore the authentic notice in a separately authorized patch.

## Audit findings

- **MEDIUM, static keyboard routing:** global keydown consumes Enter/Space whenever `playing`, even when Undo or Restart has native focus. It activates `cursor` and prevents native button activation. Recommended repro: Tab to Undo after a jump, press Enter. Root fix: allow focused native buttons to handle activation, as other wrappers already do.
- **MEDIUM, static accessibility:** `buildCells` gives position-only aria-labels; `render` does not expose occupied/empty/selected/legal state. Root fix: update concise state labels in the existing renderer, and announce result/count changes without relying on color.
- **MEDIUM, notice evidence gap:** no full license terms in tracked folder despite MIT attribution. This is provenance completeness, not a declaration the code is unlicensed.

## Safe iteration

Keep `getMovesAroundTile` as the legality boundary, shared by destination marking and end detection. If exporting `moveTileTo` more broadly, validate distance/orthogonality there before exposing arbitrary calls. Do not change the English layout or add a center-only win accidentally. Preserve undo allowance semantics unless an explicit feature order changes them. No new framework is needed for the two input/label fixes.

## Verification

Actually run: Git/source/catalog identity and inline JS syntax parsing in [batch 65](../audits/games-65.md). **Native runs: 0.** [P1b history](../../audit_batches/playtest_p1b.md) observed a jump (32 to 31 pegs, zero to one moves) and Restart, not ten Undos or either terminal condition.

Recommended native checks: legal center jump, diagonal/occupied rejection, ten Undos, keyboard-focused Undo/Restart, known one-peg solution and dead-end result. Assert each jump reduces count by one and Undo restores it. Source command: `git show HEAD:Games/PegSolitaire/index.html`; Main owns any asset checkout/full smoke.

## Future outlook

Week 1: notice verification and native-button routing. Week 2: stateful accessible labels, result focus and small-phone target measurements (the seven-column CSS does not guarantee every viewport reaches 44px). Later: optional replay of the same puzzle, not invented levels or generated art.
