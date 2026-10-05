# Play flow: SameGame (id 206, registered)

- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Directory `Games/SameGame`, 7 files, 15044 bytes. Inventory doc: `docs/maintenance/games/206-samegame.md` (not owned here).
- Status: CODE-REVIEW ONLY, no browser run by this worker.

## Source inspected

- `Games/SameGame/index.html` blob `ec5ff27af749f3738b31aca711adda65ee1def09` read completely.
- `samegame.js` blob `25ea8dd63f51329ce77b68dbb5e7e22a069bab19` read completely (author's readable pre-golfed source, js1k-2017, Gabor Bata, MIT): `state`, `reset`, `rect`, `draw`, `mark`, `swap`, `points`, `canvas.onmousedown` handler.
- `glue.js` blob `af1a984811136de9bc5b78f858f21af505dc6542` read completely: `takeSnapshot`, `drawCursor`, `toClient`, `fire`, `clickCell`, `newGame`, touch + keyboard handlers.
- `CREDITS.md`, `LICENSE` read (upstream `gaborbata/samegame1k` commit 91df2de, MIT, retrieved 2026-09-24, documented modifications).

## Flow (from source)

1. Boot: scripts run `reset()` + `draw()` at load - the board is immediately playable; no start screen.
2. Start/setup: `reset()` fills `table[]` with `Math.random()*4+1` color indices, zeroes score `s` and marked count `m`.
3. Input: mouse `canvas.onmousedown` (responsive coordinate scale `sx/sy`); touch via `glue.js touchstart` -> re-dispatch to `onmousedown` (single finger, `preventDefault` to avoid double action); keyboard: arrows move `cur {r,c}`, Enter/Space -> `clickCell()`, `N` -> `newGame()`.
4. Core loop: **there is no loop at all** - no RAF, no interval. State changes only on pointer/keyboard events; `draw()` repaints after each handler.
5. Score/progression: `points = (m-2)^2` added to `s` on removal; status bar draws `[New] Score: N Marked: M (+pts)`. Gravity: tiles drop within column then columns shift left (both loops in the mousedown handler).
6. Win/lose: after a removal the handler recomputes `m` over the board; if no group of >1 remains, `m = -1` and the status draws `Game Over` (no modal). Clearing the whole board leaves only singletons - also `Game Over` with a higher score; no separate victory banner in source.
7. Restart: click the `[New]` text region (x < 42px in the status bar) or press `N` -> `reset()`.

## UI bloat: NONE

Persistent: `header` (h1 + two instruction paragraphs), canvas `#a`, `#footer` credit line. Canvas status bar `[New] Score:` is genuine game HUD. No modals, no gradients, no popups.

## Popups/modals

None. `Game Over` is text drawn inside the canvas status line, not a dialog.

## Animation vs simulation

No animation and no simulation loop: pure event-driven canvas redraw. Do not read the absence of RAF as missing gameplay - the model is `table[]`, mutated synchronously in the input handler.

## Findings

1. LOW - "Game Over" is only 10px-tall status text (`[New] Score: ... Game Over`); easy to miss on mobile. If fixed, draw it in `draw()` in `samegame.js`, not as an overlay outside the canvas.
2. LOW - `header` instructions are persistent copy; move to one-time help (docs/presentation only).
3. INFO - `glue.js` snapshots the canvas with `getImageData` for the keyboard cursor; on a 528x288 canvas this is cheap. No fix.

No high-severity findings.

## Recommended playable view

Keep canvas `#a` (including its status bar), the keyboard/touch glue, and the `#footer` credit. Shorten `header` to a title and move the how-to into a one-time acknowledged help.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: tap a group of >=2 (score rises, tiles fall), tap a singleton (no removal), press `N` (new deal), finish a board and confirm `Game Over` text plus arrow-key cursor + Enter clearing.
