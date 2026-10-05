# Play flow: Puzzle 15 (id 169, registered)

- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Directory `Games/Puzzle15`, 1 file, 11739 bytes. Inventory doc: `docs/maintenance/games/169-puzzle15.md` (not owned here).
- Status: CODE-REVIEW ONLY, no browser run by this worker.

## Source inspected

- `Games/Puzzle15/index.html` blob `138322aadf1641d64c3a7384d363dc2f1d750e92` read completely (single inline `<script>` IIFE). Provenance comment in file: ingested from github.com/arnisritins/15-Puzzle, MIT, commit 47c82f1.
- Functions read: `buildGrid`, `getCell`, `getEmptyCell`, `getAdjacentCells`, `getEmptyAdjacentCell`, `shiftCell`, `checkOrder`, `startTimer`, `winRound`, `scramble`, `startRound`, `readBest`/`writeBest`/`renderBest`.
- Selectors read: `#puzzle`, `.cell` / `#cell-r-c`, `.empty`, `#hud`, `#moves`, `#time`, `#best`, `#restartBtn`, `#resultOverlay`, `#againBtn`.

## Flow (from source)

1. Boot: page loads, `startRound()` runs at end of IIFE, so the board auto-starts (no start overlay; header text `header.page-head p` carries the how-to).
2. Start/setup: `scramble()` rebuilds the grid then runs a 100-step `setInterval(…, 8)` random walk of legal moves (never reverses the previous move) so the deal is solvable; input locked (`playing = false`) until it finishes, then `startTimer()` starts a 1 s `setInterval`.
3. Input/core loop: `puzzle.addEventListener("click")` calls `shiftCell(e.target, true)`; `window keydown` with `keyMap` (arrows + WASD) moves the gap into the neighbouring cell. No RAF and no frame loop: the board is DOM state, transitions are CSS (`transition: left .12s, top .12s`).
4. Score/progression: move counter `#moves`, wall-clock `#time`, best moves in `localStorage["p15-best"]` (try/catch guarded). Each player move schedules `checkOrder` via `setTimeout(…, 130)`.
5. Win: `checkOrder()` scans cells 1..15 in order with empty at (3,3) then `winRound()` stops the timer, writes best, fills `#result-stats` and unhides `#resultOverlay`. No lose state exists (a puzzle has none) - correct for this genre, not a defect.
6. Restart/exit: `#restartBtn` and `#againBtn` both call `scramble()`.

## UI bloat: NONE

Persistent: `header.page-head` (title + one paragraph instructions), `#hud` (moves/time/best + Restart), `#puzzle`. No decorative cards, no gradients, no repeated popups. The only modal is `#resultOverlay` (win only, one-shot, dismissed only by `#againBtn`).

## Popups/modals

Single overlay `#resultOverlay`, triggered by `winRound()` only, not re-triggered while hidden. No ad/info/nag popups in source.

## Animation vs simulation

No simulation loop. `scramble()`'s 8 ms interval is a deal generator, not renderer animation; tile motion is CSS transition on `.cell` left/top. `checkId`/`timerId` are cleared on `scramble()`/`winRound()` (no runaway timers found).

## Findings

1. LOW - `shiftCell` mutates `id` and `style.cssText` of two nodes as its swap primitive. Fragile but functional; no fix required for play flow.
2. LOW - `e.target` on click can be a child-less div only (cells have no children), so no mis-target risk observed. No fix.
3. INFO - `playing` gates input during shuffle; keys are swallowed silently. Acceptable.

No high-severity findings. No code fix mandated by this review.

## Recommended playable view

Keep `#hud`, `#puzzle`, `#resultOverlay`, restart/play-again, click + arrow/WASD input. Move `header.page-head p` how-to into a one-time acknowledged help with optional reopen. Nothing else to remove.

## Validation status

CODE-REVIEW ONLY. Smallest still-needed browser check: load `Games/Puzzle15/index.html`, confirm shuffle completes, slide with click and arrow key, reach `#resultOverlay`, press `#againBtn`, verify `p15-best` writes.
