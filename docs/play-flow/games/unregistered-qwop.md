# Play flow: QWOP (unregistered)

- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Directory `Games/QWOP`, 1 file, 18549 bytes, `id: null`, `registered: false`. Inventory doc: `docs/maintenance/games/unregistered-qwop.md` (not owned here).
- Status: CODE-REVIEW ONLY, no browser run by this worker.
- Provenance note: this is a self-authored canvas reimplementation with its own stick-figure model. It is NOT the original QWOP SWF and no upstream attribution is present in the file. Mechanics below are what THIS source does, not the original game's rules.

## Source inspected

- `Games/QWOP/index.html` blob `c5e38b1f820fc3613eea4014e599b6572f4eef51` read completely (CSS + DOM + one inline script).
- Functions read: `calculatePositions`, `updatePhysics`, `draw`, `gameLoop`, `endGame`, `reset`.
- Selectors read: `#gameCanvas`, `.hud` `#distance` `#best`, `.key[data-key]`, `#helpBtn`, `#helpModal`, `#closeHelp`, `#gameOver`, `#restartBtn`.

## Flow (from source)

1. Boot: script ends with `reset(); gameLoop();` - no start screen; the run begins on load.
2. Start/setup: `reset()` zeroes `runner`, `camera`, `distance`, sets `gameRunning = true`, clears `#gameOver`.
3. Input/core loop: `gameLoop()` = `calculatePositions(); updatePhysics(); draw(); requestAnimationFrame(gameLoop)` - a genuine fixed-state physics step per RAF frame, not a decorative animation. Keys `q/w/o/p` map to `keysPressed` on `keydown`/`keyup` (with `.key.pressed` visual), plus on-screen `.key` buttons via `mousedown/mouseup/mouseleave`. Each held key adds angular velocity to thigh/calf (`thighForce 0.08`, `calfForce 0.1`) damped by `*= 0.95`, clamped to angle ranges; gravity `GRAVITY 0.5`, feet ground-clamp at `GROUND_Y 350`; forward speed `vx += 0.3` when exactly one foot is grounded; `vx *= 0.9`.
4. Score/progression: `distance = max(distance, (hip.x-100)/10)` shown in `#distance`; best persisted in `localStorage['qwop_best']`.
5. Lose: `updatePhysics` calls `endGame()` when `head.y > GROUND_Y-10` or `|torso.angle| > PI*0.35`; `gameRunning=false`, `#gameOver.visible`, best written. No separate win (endless distance game).
6. Restart: `#restartBtn` click or `R` key when not running calls `reset()`.

## UI bloat: MILD

- Persistent decoration: `h1` "QWOP", `.subtitle` tagline, CSS grid background on canvas, `.key-leg` labels. Cosmetic, not blocking.
- Genuine HUD: `.hud` distance/best (essential), `.controls` four 56px touch keys (essential touch input, >=44px).
- One modal: `#helpModal` ("How to Play", Q/W/O/P legend), opened only by `#helpBtn ?`, closed by `#closeHelp`, backdrop click or `Escape`. One-time acknowledged help, reopenable - correct pattern, no nag.
- `#gameOver` overlay is a genuine result state.

## Popups/modals

`#helpModal` (manual trigger, repeat-open allowed, no timer), `#gameOver` (once per fall). No recurring ad/info popups.

## Animation vs simulation

`gameLoop` RAF drives real model updates (`runner.*`, `camera.x`, `distance`) before `draw()`. RAF is not cleaned up on `endGame` but `updatePhysics` early-returns when `!gameRunning`, so no runaway work beyond redraw. Do not report this as "animation only".

## Findings

1. MEDIUM - `gameLoop` keeps requesting frames after `endGame()`; `draw()` still runs every frame while the overlay is up. Fix location: guard the RAF re-request inside `gameLoop()`/`endGame()`, not by hiding the overlay.
2. LOW - `reset()` reassigns `runner` but `calculatePositions` reads module-level `runner`, so reassignment is safe; no fix.
3. LOW - on-screen `.key` uses `mousedown/mouseup` only (no `touchstart`); on touch, browsers synthesise mouse events after tap, so a held key may not stay pressed. Worth verifying; if broken, add `pointerdown/pointerup` on `.key` (same handlers).

No high-severity findings.

## Recommended playable view

Keep `#gameCanvas`, `.hud`, `.controls` keys, `#gameOver`, `#restartBtn`, `#helpModal`. Drop `h1`/`.subtitle`/`.key-leg` decoration from the play view; keep the how-to in the acknowledged help modal only.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: load page, hold Q/W/O/P, confirm the figure advances and `#distance` grows, force a fall, confirm `#gameOver` + `Try Again` reset, reopen help via `?` and close with Escape.
