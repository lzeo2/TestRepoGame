<!-- maintenance-game: Games/WordSearch -->
# Word Search maintenance

## Identity and status

Registered ID 186, `word`, not featured; entry `Games/WordSearch/index.html`. Baseline `8c8a055` has two files totaling 22,353 bytes. All word lists, styles and generation logic are embedded. Source supports offline use without downloads; browser play and layout remain unverified in this worker audit.

## Implementation map

Source review coverage: entire entry HTML, inline CSS/JavaScript and BSD `LICENSE`. No compiled engine is present. `THEMES` contains Space, Animals and Fruits words; `WIDTH`/`HEIGHT` are both seven. `placeWords()` sorts long words first, enumerates eight-direction slots and prefers overlap with existing letters. `generatePuzzle()` retries up to eight times and uses `checkWordsInGrid()` to check placed words, normally stopping at eight or more. Display may list fewer than all ten theme words; skipped placements are not phantom targets.

`buildPuzzle()` creates 49 `.cell` gridcells with `data-x`/`data-y` and a roving tabindex, then `#wordlist` items. `rayCells()` builds aligned pointer paths; `attempt()` accepts listed words in either direction. Keyboard selection uses `toggleCell()`, `canExtend()` and `checkKbSelection()`. `markFound()` updates counters and invokes `showEnd(true)` when complete. Entry screens are `#startScreen`, `#playScreen`, `#endOverlay`; `#newGridBtn`, `#giveUpBtn` and menu buttons handle reset/exit.

## Gameplay and controls

Choose a theme to begin. Drag a straight word or tap its first and last letters. Horizontal, vertical, diagonal and reversed reading are supported. Arrow keys move focus one cell at a time; Enter/Space starts or extends an adjacent straight chain, Backspace trims and Escape clears. Keyboard selection recognizes a complete word automatically; it is not an endpoint-only submit model. Found words retain colored cells and crossed-out list entries. Find all targets to win; Give up reports remaining names but does not reveal their coordinates. New grid regenerates the current theme; Menu returns to selection. No sound or time limit exists.

## State and persistence

`grid`, `cellEls`, `targetWords`, `foundWords`, `kbCells`, `previewCells`, `pendingClick`, `dragStart` and `dragging` are module-level in-memory state. No storage keys or saved scores. A 400 ms timeout removes wrong-selection highlighting; it refers to old nodes if a new grid is built, not the current grid. `startTheme()` and `goMenu()` clear pending pointer selection. There is no recurring timer or animation loop.

## Dependencies and provenance

HTML and [sources_8](../../catalog_parts/sources_8.md) cite `https://github.com/remram44/wordsearch`. BSD 3-Clause `LICENSE` names Remi Rampin and retains non-endorsement terms. An upstream revision is not recorded in this evidence; leave it unknown. Original fetch-based wordlists were replaced with embedded themes according to ingestion notes. Current runtime contains no fetch or external asset load.

## Audit findings

- **MEDIUM**, `index.html`, grid pointer listeners: there is no `pointercancel` or `lostpointercapture` cleanup. Interrupted touch gestures can leave `dragging`, `dragStart` and preview state active until another interaction. Recommended repro: begin drag, trigger browser/system gesture cancellation, resume movement. Root fix: share a cancellation handler that clears pointer state and selection without scoring.
- **MEDIUM**, `index.html`, `.cell`: dimensions clamp as low as 38 px, below the required 44 px touch target. Root fix needs a measured mobile layout, possibly scrollable grid/zoom rather than crowding seven columns. This is a source dimensional finding, not screenshot-certified usability.
- **MEDIUM**, `index.html`, `#endOverlay`/`showEnd()`: focus is moved but background controls remain tabbable and no dialog semantics are applied. Minimal fix is native dialog/inert background with explicit restart focus restoration.
- Non-finding: `attempt()` receives source-generated letter text, not arbitrary HTML; target word selectors use fixed embedded words.

## Safe iteration

Preserve the generator/checker agreement and shared eight-direction rule. Input fixes belong at pointer cancellation and common selection cleanup, not in theme-specific code. Avoid deleting generation retries or claiming exactly ten targets. Runtime fixes require another lease; do not add a remote dictionary or generator library.

## Verification

Actually run: inline-script syntax, Git source existence, catalog and document checks; [batch audit](../audits/games-66.md). Native/browser checks: zero. Recommended native tests: solve forward/reverse/diagonal words by drag and keyboard, tap endpoints, nonaligned rejection, cancelled drag, duplicate find, new-grid reset and Give up/Menu. Capture 320/360 px screens and modal tab traversal. Historical EAGLE drag evidence is old and does not cover cancellation.

## Future outlook

Week one should fix cancellation and preserve solvable-generation checks. Week two prioritizes mobile target size and result accessibility. Later curate additional local themes only with source/word-list terms and generation coverage; defer timed modes or online dictionary validation until a real need and offline-compatible source exist.
