<!-- maintenance-game: Games/TowerOfHanoi -->
# Tower of Hanoi maintenance

## Identity and status

Registered ID 196, `puzzle`, not featured; entry `Games/TowerOfHanoi/index.html`. Five files total 15,303 bytes at `8c8a055`. Current game is an ingested DOM drag/tap puzzle with selectable three-to-eight disks, not the historical move-budget version. Runtime is source-local; no browser test was performed here.

## Implementation map

Source review coverage: full HTML, `script.js`, `style.css`, `CREDITS.md`, `LICENSE`; no minified/binary engine omitted. `DOMContentLoaded` caches `.tower`, controls and `#step-counter`, then calls `generateDisks(3)` and `bindDiskEvents()`. `#tower-a`, `#tower-b`, `#tower-c` contain `.disk` nodes. `generateDisks()` assigns `disk-1` onward with ascending numeric size and width. Disk listeners handle dragstart/end and click selection; peg listeners handle dragover/drop and click destination.

Both input paths call `performMove()`, which calls `isValidMove()`, records `{disk,from,to}`, prepends the disk, updates steps and calls `checkWin()`. Undo reverses the last DOM movement. Apply validates 3-8, regenerates and clears all pegs. Reset rebuilds the current count on A. `#win-message` is an inline live status rather than a blocking overlay.

## Gameplay and controls

Source instructions require moving the entire stack from left peg to right, one disk at a time, never larger onto smaller. Tap/click a logical top disk then a peg; desktop drag/drop is also supported. Undo reverses valid recorded moves; Reset returns the current count to A; Apply starts with a new count. Win is based on all current disks being children of C and reports moves. There is no loss/move budget, timer, sound, or custom keyboard movement. Inputs/buttons are keyboard-focusable natively, but disks and pegs are divs without focus/activation support. Do not document arrows or peg-number shortcuts.

## State and persistence

Closure state: `draggedDisk`, `selectedDisk`, `moves`, `stepCount`, `currentDiskCount`. The DOM is the stack model, with `querySelector('.disk')` treated as its top and `prepend()` used for moves/undo. No localStorage keys; reload returns to three disks. A zero-delay dragstart callback adds `.dragging`/`.active-disk`; no continuous JavaScript loop. CSS `.active-disk` has an infinite glow with no reduced-motion override.

## Dependencies and provenance

`CREDITS.md` records `https://github.com/zym9863/Tower-of-Hanoi-Game`, revision `e4118d667f4fe522da888084e027ca0c32ad8ec8`, retrieval 2026-09-24. MIT `LICENSE` names zym. Local modifications removed Google Fonts/gradients, translated copy and added click/tap interaction. Runtime uses only local CSS/JS and browser drag/drop. No fresh upstream comparison or redistribution expansion was performed.

## Audit findings

- **HIGH**, `script.js`, `isValidMove()`: dragstart permits any disk, while validator checks only destination size, not whether disk is top of source. Drag a lower disk to empty B to bypass the puzzle rule. Root fix: enforce source ownership/top-disk condition inside shared validator, protecting both drag and tap.
- **HIGH**, `style.css`, `.tower { flex-direction: column-reverse; }` versus `generateDisks()`/`querySelector('.disk')`: smallest disk is first in DOM but rendered at the bottom, while engine treats it as top. Impact: visible pile orientation conflicts with logical movement. Native screenshot reproduction pending; minimal fix must reconcile visual order with the existing DOM model, not reverse arrays independently.
- **MEDIUM**, `index.html`/`script.js`, `.disk` and `.tower` input: no keyboard play path. Root fix: add focusable semantic peg/disk selection that calls `performMove()` with the same validation.
- **MEDIUM**, `style.css`, fixed 260 px `.tower` height and 44 px disks plus 10 px margins: eight disks require more vertical space than allocated. Overflow is source-derived; measure desktop/phone before choosing flexible height. Add reduced-motion treatment for the glow in the same narrow shell review.

## Safe iteration

Root move validation must serve every caller and prevent non-game drag data from moving arbitrary DOM elements. Preserve undo records and disk IDs while aligning visual/logical order. Keep Apply/Reset cleanup and inline feedback. No speculative solver replacement is needed. Runtime edits remain unauthorized in this documentation lease.

## Verification

Actually run: script syntax, catalog/source existence and docs assertions; [batch audit](../audits/games-66.md). Native checks: zero. Recheck `git show HEAD:Games/TowerOfHanoi/script.js | node --check`. Recommended native sequence: illegal lower-disk drag, valid seven-move three-disk solve, larger-on-smaller rejection, undo, same-peg no-op, Apply 8 and invalid input, mobile pile geometry and keyboard-only solve. Old rod-based playtest selectors do not match this implementation.

## Future outlook

Week one repairs shared move validation and visible stack ordering. Week two prioritizes keyboard play, eight-disk layout and reduced motion. Later add optional optimal-move guidance only after rule invariants and source terms are stable. Defer saved sessions or automated animation rather than broaden the flawed movement model.
