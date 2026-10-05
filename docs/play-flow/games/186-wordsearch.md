# Play flow audit: Word Search (id 186)

## Identity / baseline

- Registered `games.json` id 186, url `Games/WordSearch/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (2 files, 22,353 bytes).
- Maintenance document basename: `docs/maintenance/games/186-wordsearch.md`.
- Provenance: `LICENSE` MIT `7b2661bf...` (1,519 B; upstream URL held - not restated in inspected header).

## Source inspected

- `Games/WordSearch/index.html` blob `99cc190c256edf7eae8e461b5ede096350554bdc` inspected in ranges (687 lines total):
  - Lines 1-200 read via UI grep: `#startScreen.screen` (h1 "Word Ladder"-style rules + theme buttons `button[data-theme]` = space/animals/fruits), `#playScreen` (`h1#themeTitle`, grid container, `#scoreline`, `#wordlist`, `#newGridBtn`, `#giveUpBtn`, `#menuBtn`), `#endOverlay.overlay.hidden` (`#endTitle`, `#endText`, `#againBtn`, `#endMenuBtn`).
  - Lines 201-399 **partially read**: `checkWordInGrid`, `checkWordsInGridDir`, `checkWordsInGrid` (overlap validation) read region ~229-271; `placeWords` (272-329), `generatePuzzle` (330-366), `buildPuzzle`/`cellIndex` (367-407) **grepped only, not read line-by-line** - generator placement/solvability logic HELD.
  - Lines 400-687 read completely: `updateScore`, `clearSelections`, `flashWrong`, `markFound`, `spellingOf`, `attempt`, `rayCells`, `setPreview`, `cellFromPoint`, pointer handlers (`pointerdown/pointermove/pointerup` with `setPointerCapture`), keyboard handlers (`focusCell`, `toggleCell`, `canExtend`, `checkKbSelection`, `gridEl keydown` arrows/Enter/Space/Backspace/Escape), `showEnd`, `startTheme`, `goMenu`, button wiring (`[data-theme]`, `#newGridBtn`, `#againBtn`, `#menuBtn`, `#endMenuBtn`, `#giveUpBtn`).

## Flow

- Boot: `#startScreen` with three theme buttons; play/end screens hidden.
- Start/setup: `startTheme(key)` -> `buildPuzzle()` (generates grid + `targetWords`), hides start/end, shows `#playScreen` with `h1#themeTitle`; `#newGridBtn` regenerates the same theme.
- Input (two full paths): pointer - `pointerdown` on a `.cell` (`elementFromPoint` + `setPointerCapture`), drag preview along `rayCells` (8-direction, only orthogonal/diagonal aligned cells), `pointerup` commits; a single tap arms `pendingClick` for tap-first/tap-last selection. Keyboard - arrows move focus (`.cell[tabIndex]` roving), Enter/Space extend selection via `toggleCell` (direction locked by `canExtend`), Backspace pops, Escape clears.
- Core loop: `attempt(cells)` compares `spellingOf` forward and reversed against `targetWords`; hit -> `markFound` (adds to `foundWords`, `li.found`, cells `.found`, `updateScore`) ; miss -> `flashWrong` (`.wrong` 400 ms). Already-found words are skipped (`!foundWords.has(word)`).
- Score/progression: `#scoreline` "Found N of M words." (live `updateScore`); `#wordlist` items gain `.found`.
- Win/lose: all found -> `showEnd(true)` "Puzzle solved" (names the theme); `#giveUpBtn` -> `showEnd(false)` "Puzzle given up" listing still-hidden words and marking the whole list found.
- Restart/exit: `#againBtn` (new grid, same theme), `#newGridBtn` (same), `#menuBtn`/`#endMenuBtn` -> `goMenu()` back to `#startScreen`. No dead ends.

## UI bloat classification: MILD

- Genuine screens: `#startScreen` (rules + theme select = start menu), `#playScreen` HUD (`#themeTitle`, `#scoreline`, `#wordlist`, `#newGridBtn`, `#giveUpBtn`, `#menuBtn`), `#endOverlay` one-shot dialog (focus to `#againBtn`).
- Persistent copy: rules paragraph lives only on `#startScreen` - acceptable; if trimming for a playable view, keep theme buttons + grid + word list + Give up/Menu, move rules to one-time help.
- Popups: exactly one `#endOverlay`. No recurring nags/ads/modals.

## Animation / simulation

- No RAF. Selection preview is class-driven (`.sel` added/removed per `pointermove` via `setPreview`), `.wrong` flash via 400 ms `setTimeout`, `.found` persists. Grid state updates are synchronous DOM; no decorative animation.

## Findings

1. HELD - Puzzle generator (`placeWords`, `generatePuzzle`, `buildPuzzle`, lines ~272-407) not read line-by-line; word placement, overlap rules and theme word lists (`THEMES`) are unverified. Everything downstream of `targetWords` is verified.
2. LOW - `rayCells` returns `[a]` (single cell) for a non-aligned drag endpoint, so `pointerup` treats it as a tap and arms `pendingClick` on the start cell - slightly surprising but harmless (next tap attempts a 2-cell straight selection).
3. LOW - `#giveUpBtn` marks all remaining `wordlist` items `.found` on loss (visual "revealed" state) while `showEnd` also lists them in `#endText` - duplicate but harmless disclosure.
4. Copy check: sentence case, no em-dashes observed in inspected ranges.

## Recommended playable view

Keep grid, `#wordlist`, `#scoreline`, theme title, `#newGridBtn`, `#giveUpBtn`, `#menuBtn`, `#endOverlay`. `#startScreen` is a genuine menu (keep; rules can be collapsed to one-time help if trimming). No nags to add or remove.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, pick a theme, find one word by drag and one by keyboard, trigger a wrong flash, Give up, `#againBtn`/`#menuBtn` paths; 360px screenshot.
