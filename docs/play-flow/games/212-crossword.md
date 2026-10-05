# Crossword (id 212) - play-flow audit report

CODE-REVIEW ONLY. No browser run in this pass.

- Identity: id 212, registered, url `Games/Crossword/index.html`.
- Baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 6 files, 136288 bytes.

## Source inspected

- `Games/Crossword/index.html` blob `83c473fc29a4835ca565614c7f6594117c8215ce` (4348 bytes, read completely). Inline ready-handler passes the 16-word `puzzlewords` list to `crosswordPuzzle(puzzlewords)`; second inline script is local glue: `$('#answer-form').hide()`, `#new-puzzle` -> `window.location.reload()`, `updateStatus()` on `setInterval(..., 500)` counting `li.word-clue` vs `span.linkable[data-solved]` into `#status-line`.
- `Games/Crossword/javascript/crossword-puzzle.js` blob `6c39f6be0960620587f19e421731b444e92cdbee` (41025 bytes): inspected by symbol index, NOT read line by line. Functions confirmed present: `areWeInGodMode`, `areWeRandomizingPuzzleWords`, `crosswordPuzzle(puzzlewords)` (main), `showCrossWordOptions`, `revealanswerfunction` (bound to `#reveal-answer-button`), `showCrossWordLists`, `getViewableCrossWordList`, `fillInCrossWordNumbers`, `getBlockingItemNumber`, `getBlockItemNumberPosition`, `showCrossWordPuzzle`, `buildCrosswordLists`. Held: placement/randomization internals below line ~500 and the exact clue-click wiring inside `showCrossWordOptions`; full line-by-line review not claimed.
- Not read: `javascript/jquery.min.js` (vendored), `css/crossword-puzzle.css` (style only). `LICENSE`/`CREDITS.md` present.

## Flow

- Boot: header (`h1`, instructions `<p>`, `#status-line`, `#new-puzzle`), `#root` grid container, `#lists` (`#left-list` Across / `#right-list` Down), `#answer-form` hidden until a clue is clicked.
- Start: no start screen; `crosswordPuzzle()` builds a random board on load. `#new-puzzle` restarts via full reload.
- Input: click clue -> `#position-and-clue` text + `#solution-answer` input; `#answer-button` checks the word (marks `data-solved` on `span.linkable` and `#<word>-listing`), `#cancel-button` hides form, `#reveal-answer-button` fills the answer (disabled when already solved: `$('#reveal-answer-button').attr('disabled', true)` path). Touch/keyboard: native `<input>` and 44px+ buttons per inline CSS (`.letter-cell { height:44px; width:44px }`, `#new-puzzle { min-height:44px }`).
- Core loop: event-driven; the only timer is the 500ms `updateStatus` poll. No RAF/animation loop.
- Progress: `#status-line` "N of M clues solved"; completion sets "Puzzle complete, all N clues solved."
- Win/lose: win = all clues solved (status text only, no overlay, no failure state - open-ended puzzle, no lose state in source).
- Restart: `#new-puzzle` -> `window.location.reload()`.

## UI bloat: MILD

- Persistent: `header` with title, 3-line instruction paragraph, status, New puzzle button; `#lists` clue tables; `#answer-form` (position/clue line, Answer row, Cancel/Answer/Reveal row) shown only after a clue click (genuine game input).
- Popups/modals: none. `#answer-form` is an inline panel, not a modal; `#answer-results` is inline feedback. No ads/nags/recurring dialogs in source.

## Animation

- None authored. Only `setInterval(updateStatus, 500)` text refresh. No RAF, no object/property tweening. Not held: everything animated is absent.

## Findings

1. MEDIUM - `#answer-form` stays visible after a wrong or right answer (hidden only on Cancel or page reload); acceptable, but `#answer-results` has class `hidden` toggled inside held library code - verify in browser that feedback appears.
2. LOW - 500ms polling `setInterval` runs forever (even after completion). Harmless but could be cleared on completion; low priority.
3. LOW - instruction paragraph in `<header>` is permanent descriptive copy; move to one-time help.
4. No fix needed for restart: reload path is explicit and works offline (all scripts local, no external URLs in this entry).

## Recommended playable view

Keep `#root`, `#lists`, `#answer-form`, `#status-line`, `#new-puzzle`. Move the header instruction paragraph into one-time acknowledged help (reopenable). No popups present to remove.

## Validation

CODE-REVIEW ONLY. Smallest needed check: load page, click an across clue, type correct/wrong answers, use Reveal answer, solve all clues to see the completion status line, click New puzzle.
