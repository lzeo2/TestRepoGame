<!-- maintenance-game: Games/Nonogram -->
# Nonogram maintenance

## Identity and status

Registered ID 197, `puzzle`, not featured; `Games/Nonogram/index.html`. Sixteen files total 62,483 bytes at `8c8a055`. Entry draws an 8 by 8 random puzzle using a local bundled library. Unlike most single-file word games, GUI templates are fetched from the same site; local HTTP hosting is required. No native browser/network test was run here.

## Implementation map

Source review coverage: entire entry, both CSS files, all five HTML templates, `CREDITS.md`, `LICENSE`; minified `dist/nonogram.min.js` read for bootstrap, GUI loading, state/input/reset and generation boundaries. Its compact solver internals were not independently algorithm-certified; binary/SVG artwork was not visually reviewed. No unminified build source is shipped.

UMD bundle exports `Nonogram.Puzzle`, `Creator`, `Solver`, `Gui`. Entry calls `creator.createRandom(8,8)`, constructs `Gui('dist/themes/default')`, then `gui.draw(puzzle)`. GUI adds `dist/themes/default/styles.css` and fetches `controls-game.html`, `controls-generate.html`, `console.html`, `preview-grid.html`, `puzzle-grid.html`. `Promise.all` gates drawing. Templates define `[data-nonogram-puzzle-grid-table]`, cell `data-index`, generate dimensions, examples, board sizes, Reset/Solve controls and `#nonogram-puzzle-fill-mode`.

Bundle GUI anchors include `_makePuzzlePlayable`, `_resetPuzzle`, `_showPuzzleSolved`, `drawSolution`, `drawPreview`, `_resizeBoardForAvailableScreen`. Authored `updateScore()` reads rendered cells after document clicks and at initial load.

## Gameplay and controls

Click/tap cells to fill or cross; lowercase `x` on keyup triggers the mode checkbox through a synthetic click. Source copy says X, but handler tests exact lowercase. There is no arrow-key cell traversal or Enter-to-fill binding. Generate offers dimensions 5-30; examples and Tiny/Small/Medium/Large are local library options. Reset clears user marks; Solve reveals stored solution and marks solved. Manual win uses `Puzzle.checkUserSolution()`, comparing each user's positive mark against solution. No time limit, failure counter or audio exists. Do not import older “Mistakes” game claims.

## State and persistence

Puzzle owns `cells`, `grid`, row/column hints, width/height and `creator`; cells have `solution`, `userSolution`, `aiSolution`. GUI owns puzzle, templates, board size and click mode. No localStorage keys. Template promises and draw callbacks are asynchronous; library has a global keyup listener but no recurring gameplay timer. Authored click listener schedules `updateScore()` after 30 ms. That delay is not a reliable signal for template drawing completion. Generator repeatedly tries solver-approved random grids synchronously without an explicit attempt/time cap.

## Dependencies and provenance

`CREDITS.md` records `https://github.com/monkeyArms/nonogram`, revision `a61efe2cb85452417fcdcdb6e2399eb4f7bd45b1`, retrieval 2026-09-24. MIT text is shipped; it contains no named copyright line, so author remains the recorded upstream handle rather than an invented person. Notice says runtime-only ingestion and stripped source-map comment. Local template innerHTML is a fixed trusted-resource boundary, not user-input XSS evidence. Same-origin fetch is not a third-party offline violation; it does make file-URL launching unreliable.

## Audit findings

- **MEDIUM**, `index.html`, `updateScore()`: checks `.solved` on the outer `[data-nonogram-puzzle-grid]`, while `_showPuzzleSolved()` adds it to the nested `.nonogram-puzzle-grid` table. Authored status never detects completion. Root fix: query the table or engine solved state, and update when async drawing completes.
- **HIGH**, `dist/nonogram.min.js`, template `load()` anchor `new Promise(...fetch(e.path).then...)`: failures do not reject the enclosing promise and lack catch/UI feedback. Missing template can strand an empty GUI indefinitely. Root fix belongs in upstream loader's returned promise/error path, restored from verified source rather than hand-editing bundle.
- **MEDIUM**, bundle `createRandom()` anchor `!1===m`: unbounded synchronous retry can freeze the main thread on hard/degenerate generation. Status: static performance risk, duration not measured. Minimal fix requires bounded generation and recoverable failure at upstream source.
- **MEDIUM**, `index.html` viewport `user-scalable=no`, template hidden checkbox and non-focusable cells: zoom/keyboard accessibility is restricted. Root fix: allow zoom and add a keyboard cell/mode path without changing puzzle rules.

## Safe iteration

Authored status/viewport changes can remain in HTML/CSS; do not hand-edit the minified engine. Loader/generator fixes require retrieving verified corresponding source under a separate lease, preserving MIT terms and rebuilding only with approved tooling outside this repository. Keep the local template layout and data selectors intact.

## Verification

Actually run: bundle and inline-script syntax plus Git dependency/catalog/doc checks; [batch audit](../audits/games-66.md). Native checks: zero. Recheck bundle using `git show HEAD:Games/Nonogram/dist/nonogram.min.js | node --check`. Recommended native HTTP tests: all five template 200 responses, delayed/missing template feedback, fill/cross/lowercase x, Solve/manual completion status, Reset, generated dimensions and phone zoom. Old mistakes-counter playtest does not cover this bundle.

## Future outlook

First repair authored solved-status observation and review asynchronous initialization feedback. Then obtain readable upstream source for loader/generation bounds and keyboard/zoom refurbishment. Profile 30-square generation on target hardware before promising expanded puzzles. Defer saved grids or new solver features until library error handling and provenance/build reproducibility are established.
