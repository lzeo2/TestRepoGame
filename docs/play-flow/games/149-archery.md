# Archery — play-flow audit (batch 1)

- Identity: catalog id 149, registered. `Games/Archery/`, entry
  `Games/Archery/index.html` (blob `d73f863b586aabaa68f29140891c1792ee16f134`,
  21,869 B, 583 lines; single self-contained file), source baseline
  `5be686e1ab350c8ddce7a827c413612e421c3a5c`. `LICENSE` present (blob `9cecc1d4`,
  not read).
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html`, partial: header comment region (lines 1-41: "640x500 canvas.
  Self-contained, offline-first, no trackers"), all DOM/structure via grep
  (lines 66-119) and function inventory (lines 429-576). Not read line-by-line
  in the physics body (approx. lines 120-428) — arrow flight/power/aim math
  **held**.
- Actual names seen: `canvas`/`ctx` (`#canvas` 640x500, `tabindex="0"`),
  HUD ids `arrowsLeft`, `score`, `wind`, `endOverlay`, `verdict`, `finalScore`,
  `againBtn`, `restartBtn`; functions `newWind()`, `resolveShot(pts,x,y)`,
  `endRound()`, `startRound()`, `drawWindVane()`, `drawPopups()`, `update()`,
  `clearInput()`.
- Input bindings: `pointerdown/move/up/cancel` + `lostpointercapture` on canvas
  with `setPointerCapture` (lines 533-557), `window` blur → `clearInput`,
  `document` keydown gated `if (e.target !== canvas ...)` (line 561) for
  arrows/space/R (implied by `aria-label`; exact key cases inside held range),
  `againBtn`/`restartBtn` click → `startRound` (lines 575-576).

## Flow (from source)

- Boot: static header + HUD rendered immediately; game starts via `startRound()`
  (invocation point inside held range).
- Start/setup: `startRound()` resets round state and `canvas.focus()`.
- Input/core loop: pointer drag sets aim/power on canvas; `update()` is the
  per-frame callback (its scheduling inside held range); `resolveShot` scores
  impacts, `newWind()` randomizes wind per shot/round.
- Score/progression: HUD `#score`, `#arrowsLeft` (10 arrows), `#wind`,
  target shown statically as 15; end copy says "You scored X of 40 possible
  with 10 arrows".
- Win/lose: `endRound()` fills `#verdict`/`#finalScore` and shows `#endOverlay`
  ("Round over").
- Restart: `#againBtn` "Play again" and `#restartBtn` "Restart round", both →
  `startRound`.

## UI bloat: MILD

- Persistent `.page-head` (h1 + `.controls` doc) above HUD: genuine controls
  documentation, always visible — candidate to fold into one-time help.
- Genuine HUD: `.hud` stats, `.stage` canvas, `.bar` with restart, `#endOverlay`
  (one-time round-end modal with clear action).
- No ads, no decorative cards, no recurring popups.

## Popups / modals

- Only `#endOverlay` at round end; dismissed by `Play again`. `drawPopups()`
  draws in-canvas feedback (score popups), not DOM modals.

## Animation / simulation

- Canvas model update in `update()` with in-canvas drawing (`drawWindVane`,
  `drawPopups`); physics body held, so per-frame property updates are claimed
  only at function level, not verified line-by-line.

## Findings

- LOW — persistent header duplicates controls guidance on every visit; root:
  `index.html` `.page-head`. Fix if touching: move to one-time acknowledged
  help; keep HUD and `.bar` restart.
- Held — arrow physics/aim/power implementation (lines ~120-428) and the exact
  keydown case list not read.

## Recommended playable view

Keep `.hud`, canvas, `#endOverlay`, `.bar` restart. Trim `.page-head`
description into one-time help with reopen. No recurring popups exist.
