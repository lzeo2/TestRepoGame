# Play flow audit: Word Ladder (id 188)

## Identity / baseline

- Registered `games.json` id 188, url `Games/WordLadder/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (2 files, 24,795 bytes).
- Maintenance document basename: `docs/maintenance/games/188-wordladder.md`.
- Provenance (in-source comment): word list "Verbatim from the MIT source (yinggarykairui/word-ladder)"; `LICENSE` MIT `fdb7d0da...`.

## Source inspected

- `Games/WordLadder/index.html` blob `5ec498291441e408970f458dc82b41185ca03070` inspected in ranges (688 lines total):
  - Lines 179-233 (markup): `#startScreen.screen` (h1 + start), `#playScreen` (`h1`, `#chainbox #chain`, `#targetlab #target`, `#status`, `#playForm` `#word` input + `#submitBtn` + `#undoBtn`, `#msg`, `#menuBtn`), `#endOverlay.overlay.hidden` (`#endTitle`, `#endText`, `#againBtn`, `#endMenuBtn`).
  - Lines 234-326 read: IIFE open, embedded `WORDS` string (curated 4-letter dictionary) + `MAX_MOVES = 12` (line 320).
  - Lines 327-438 **structurally grepped only, not read line-by-line**: `buildNeighbours(list)`, `largestComponent(list, nbr)`, `bfsFrom(start)`, `puzzleFor(seed)` (+ `pick`, `phase` helpers), `diffCount`, `firstDiff`. Held: exact puzzle-generation/solvability logic.
  - Lines 440-687 read completely: state (`PUZ/START/TARGET/par/chain/over/seedCount`, `el` selector map), `rungLabel/rungEl/render/say`, `newLadder`, `endGame`, `fold/normalise/reject/commit/undo`, composition (IME) handling, wiring (`startBtn/againBtn/menuBtn/endMenuBtn`, form submit, input events).

## Flow

- Boot: no gate; `#startScreen` shown (start button), play/end screens hidden.
- Start/setup: `#startBtn`/`#againBtn` -> `newLadder()`: up to 10 attempts of `puzzleFor("rnd-" + seedCount + "-" + random)`; on success sets `START`/`TARGET` (4-letter uppercase), `par`, `chain = [START]`; on total failure shows `#msg` "Could not build a ladder. Please start again." (warn) and stays on the screen.
- Input: `#word` input (auto-`fold()`ed to A-Z x4 with NFD normalization + combining-mark strip), `#submitBtn`/form submit -> `commit()`; `#undoBtn` pops `chain`; IME composition guarded (`compositionstart/end`, `isComposing`).
- Core loop/rules in `commit()`: reject if `< 4` letters ("Needs four letters."), not in `WORDSET` ("<W> is not in the list."), same word, `diffCount(w, prev) !== 1` ("Change exactly one letter."), already used ("Already used that word.") - each via `say(msg, warn)` into `#msg[aria-live]`. Valid -> `chain.push(w)`, re-render.
- Score/progression: `#status` "Moves: N of 12 - best possible: P" (`MAX_MOVES = 12`, `par` from `bfsFrom` distance); ladder rendered as `.rung` divs with the changed letter `.hot` and `aria-label` "word, Nth letter changed"; `#targetlab` flips to "reached" + `.solved` class on success.
- Win/lose: `w === TARGET` -> `endGame(true)` `#endOverlay` "Ladder solved" (+ moves vs par); exhausting `MAX_MOVES` -> `endGame(false)` "Out of moves" (+ par disclosure).
- Restart/exit: `#againBtn` (new ladder), `#endMenuBtn`/`#menuBtn` -> `goMenu()` (back to `#startScreen`). No dead ends; `#undoBtn`/`#word` disabled appropriately when `over` or solved.

## UI bloat classification: MILD

- Genuine screens: `#startScreen` (rules + start), `#playScreen` HUD (`#status`, chain, input row), `#endOverlay` one-shot dialog with focus to `#againBtn`.
- Persistent copy on `#playScreen` - check at capture time: `#status` is functional (moves/par), not bloat.
- `#startScreen` holds the instructions (persistent only while not playing) - acceptable as start screen; if a playable view trims anything, move its text to one-time help.
- Popups: exactly one (`#endOverlay`). No recurring nags/ads. `#msg` is inline status feedback.

## Animation / simulation

- No RAF; pure DOM re-render in `render()` on each move (chain rebuilt from scratch each time), `chainbox.scrollTop = scrollHeight` auto-scroll. `#msg` class swap is the only visual change; no decorative animation.

## Findings

1. HELD - Puzzle generator (`buildNeighbours`/`largestComponent`/`bfsFrom`/`puzzleFor`, lines ~327-438) not read line-by-line; solvability/`par` correctness and word-list graph construction remain unverified. This is the only uninspected logic in the file.
2. LOW - `newLadder` failure path leaves the player on `#startScreen` with a warn message and no auto-retry beyond the 10 in-loop attempts; acceptable, message is actionable ("Please start again.").
3. LOW - `commit()` returns silently when `prev === TARGET` before render disables inputs - unreachable in practice because `render()` disables `#submit` when solved. No fix.
4. Copy check: no em-dashes in game copy (status uses `·`); sentence case.

## Recommended playable view

Keep `#playScreen` HUD exactly as-is (chain, target, status, input, undo, menu). Keep `#startScreen` as the one-time rules screen or fold into acknowledged help. Keep `#endOverlay`. No nags to remove or add.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, start a ladder, submit 3 valid + 2 invalid moves (verify each `#msg`), solve or exhaust 12 moves, verify both `#endOverlay` paths and `#menuBtn`; 360px screenshot.
