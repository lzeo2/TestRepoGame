# Play flow: Sokoban (id 195, registered)

- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. `Games/Sokoban`, 12 files, 105097 bytes. Doc: `docs/maintenance/games/195-sokoban.md` (not owned). CODE-REVIEW ONLY.

## Source inspected

- `Games/Sokoban/index.html` blob `a4a8a6806c96484e7b89d4477e19b177dfcf06d2` read completely (inline script lines ~130-420): `imgPreload`, `init`, `InitMap`, `Point`, `DrawMap`, `initLevel`, `NextLevel`, `go`, `checkFinish`, `Trygo`, `doKeyDown`, `showMoveInfo`, `copyArray`.
- `js/mapdata100.js` (57660 bytes) identified via `git ls-tree` as the `levels[]` data table; content is numeric maps, not logic - not read line by line.
- `CREDITS.md`, `LICENSE` present (MIT lineage); images under `images/`.

## Flow (from source)

1. Boot: `imgPreload(oImgs, cb)` loads block/wall/box/ball/arrow sprites, then `init()` -> `initLevel()` + `showMoveInfo()`. Game is live immediately; no start overlay (header carries the how-to).
2. Start/setup: `initLevel()` copies `levels[iCurlevel]` into `curMap` (`copyArray`), records `curLevel`, sets `curMan = down`, draws floor + map.
3. Input: `<body onkeydown="doKeyDown(event)">` - keyCode 37/65 left, 38/87 up, 39/68 right, 40/83 down; touch via `#dpad-up/left/down/right` buttons calling `go(dir)` (64x56px buttons, >=44px).
4. Core loop: **none** - pure event-driven redraw. `go(dir)` computes the two cells ahead (`p1`, `p2`), `Trygo` enforces walls (`1`), boxes (`3`/`5` pushable, blocked by wall or second box), steps the player (`4`), restores the vacated cell from `curLevel` (goal `2` preserved, `5` -> `2`), then `InitMap()` + `DrawMap()` repaint.
5. Score/progression: `#msg` shows `Level n/100, moves: N` via `showMoveInfo()`. No persistent storage.
6. Win: `checkFinish()` compares `curLevel` goals against `curMap` boxes; on true -> `setTimeout(alert("Level complete!") ; NextLevel(1))`. There is **no lose/deadlock state** in source (a deadlock is only a soft-lock requiring manual restart).
7. Restart/navigation: `NextLevel(-1|1|0)` bound to `Previous level` / `Next level` / `Restart level` buttons.

## UI bloat: MILD

- Persistent: `header h1 "Sokoban"` + `.instructions` paragraph (recurring how-to), `#msg` (genuine HUD), `.button-row` (prev/next/restart - functional), `#canvas`, `.dpad` (essential touch input).
- No gradients, no decorative cards.

## Popups/modals

One blocking `alert("Level complete!")` per level, triggered by `checkFinish()` after a successful push, auto-dismissed into the next level. It is a native modal that interrupts play and cannot be re-opened later; recommended replacement is an in-page `#msg`/overlay state (root: `go()`'s `setTimeout` block), not a hidden header.

## Animation vs simulation

No loop, no animation. State is the 2D `curMap` array; canvas repaints synchronously per move. Images redrawn every move (`InitMap`+`DrawMap`) - cheap for a 16x16 grid.

## Findings

1. MEDIUM - `alert()` level-complete modal (above). Root: `Games/Sokoban/index.html`, `go()` success branch.
2. LOW - `Trygo` bounds check uses `p1.x > curMap.length` / `p1.y > curMap[0].length` (should be `>=`); an off-by-one could index `undefined` at the extreme edge. Guarded in practice by walls; fix at `Trygo` if ever touching this file.
3. LOW - no deadlock detection and no move undo; `NextLevel(0)` restart is the only recovery. Genre-acceptable, no fix.
4. LOW - `.instructions` persists on screen; move to one-time help.

No high-severity findings.

## Recommended playable view

Keep `#canvas`, `#msg`, `.dpad`, `.button-row`. Shorten `header` to title + `#msg`; move `.instructions` into a one-time acknowledged help. Replace the `alert()` with an in-page notice.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: load, move with arrows and with the d-pad, push one box onto a goal, complete a level (see the completion notice, advance), use `Restart level`.
