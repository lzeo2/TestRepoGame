# Crossword: maintenance manual

<!-- maintenance-game: Games/Crossword -->

## Identity and status

Registered ID 212, category `classic`, featured `false`. Entry: `Games/Crossword/index.html` ([open source](../../../Games/Crossword/index.html)). Source baseline `8c8a055`; 6 tracked files, 136,288 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected `index.html`, stylesheet and grouping/matrix/render/answer sections of the readable 1601-line `javascript/crossword-puzzle.js` in bounded views; generator coverage is partial; local jQuery vendor was syntax-checked but not fully human-reviewed. Entry passes sixteen fixed word/clue pairs to `crosswordPuzzle` on document ready. This randomizes arrangement of a fixed vocabulary, not fresh external clues.

`generateCrosswordBlockSources` groups matching words around spines; `buildCrosswordBlocks` lays them horizontally/vertically; `compactCrosswordBlockSources/buildCrosswordBlockGraphs` join/trim matrices; `buildCrosswordLists/showCrossWordPuzzle/showCrossWordLists` render. `showCrossWordOptions` binds answer/reveal/cancel on `#answer-form`; `getViewableCrossWordList` produces `.word-clue` list markup. Entry glue polls solved attributes every 500ms and writes `#status-line`.

## Gameplay and controls

Click/tap an Across/Down clue, type the complete answer in `#solution-answer`, and activate Answer. Comparison lowercases but does not trim. Wrong answers can retry; Reveal fills letters and counts as solved with a red strikeout. Cancel closes the fixed form. Completing all rendered clues changes the progress text; New puzzle reloads. There is no score, timed failure or external word feed. Keyboard text entry/buttons work, but clickable clue list items are not focusable controls.

## State and persistence

Matrix/position objects are construction-local; `crosswordclues` is global and populated during generation. Runtime solved state lives in `span.linkable[data-solved]` and letter cells, not a durable model. No storage/save/audio exists. Progress interval persists until page unload; reload starts a fresh board. Recalling crosswordPuzzle on the same DOM appends new grids/lists and listeners rather than a supported reset.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/HoldOffHunger/jquery-crossword-puzzle-generator, revision `797d689fe5b9811a5bbd0922bff769c0f4583eb4`. Shipped `LICENSE` inspected: BSD-3-Clause. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- MEDIUM, `javascript/crossword-puzzle.js::generateCrosswordBlockSources`: `unmatchedwords` is recreated inside each outer iteration, then assigned to the same `(unmatched)` slot. Multiple unmatched words overwrite earlier ones and can disappear. Recommended fixture: input two disjoint words. Minimal root fix: accumulate unmatched words outside the loop before one final assignment; count requested versus rendered clues.
- MEDIUM, `showCrossWordOptions/getViewableCrossWordList`: clues are click-only list items and form lacks dialog focus/Escape behavior. Replace activation with native labeled buttons and restore clue focus on close.
- MEDIUM, `css/crossword-puzzle.css::#answer-form`: fixed 30em width and 40-character input can overflow mobile; constrain form/input and inspect screenshots.
- LOW, `buildCrosswordBlockGraphs/viewPuzzle`: production debug output and implicit globals remain. Review callers before cleanup. Clue strings are static today; markup concatenation is not demonstrated remote-input XSS, but must become safe DOM if user datasets are added.

## Safe iteration

Fix unmatched accumulation at the grouping source, not the status counter. Preserve generator/answer mechanics and BSD-3-Clause notice. New clue content needs deliberate editing/rights review, not remote fetching. Keep current sixteen-word source as a regression fixture and never claim all clues are retained merely because the status reaches its smaller rendered total.

## Verification

Recommended native sequence: wrong answer, correct answer, reveal, cancel, all rendered clues complete, reload. Add disjoint-word generator fixture and assert rendered count. Keyboard-tab to each clue and verify form focus/return; test 360px input width. Native was not run; static parsing does not establish random graph correctness.

Actually run: Git blob inventory and `node --check` via standard input for 4 external/inline script units, 4/4 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/Crossword/javascript/crossword-puzzle.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: unmatched-word preservation and counts. Week 2: clue buttons, form focus/escape, responsive board scrolling and live progress. Later: deterministic random fixtures for coordinates/numbering and explicit vocabulary selection. No external puzzle service or generalized authoring platform is needed.
