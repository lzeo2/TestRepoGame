# Asteroids — play-flow audit (batch 1)

- Identity: catalog id 215, registered. `Games/Asteroids/`, entry
  `Games/Asteroids/index.html` (blob `b2852e18f597cad0864bd50f3e81c69983c517d4`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 9 files / 255,664 B.
  Provenance files `CREDITS.md` (16a3561a), `LICENSE` (974c5488) present, not read.
  Header comment in `game.js`: "Canvas Asteroids, Copyright (c) 2010 Doug McInnes".
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully. `#hud` (h1 + instruction paragraph),
  `#game-container`, `#canvas` (780x540), touch pads `#left-controls`
  (`#up` Thrust, `#left`, `#right`) and `#right-controls` (`#space` Fire),
  both `display:none` until shown by script (activation in `ipad.js`, held).
- `game.js` (blob `7a68e614a196de672a9b08350e8d2a9cf0fc8b16`, 1,217 lines),
  partial: lines 1-40 and 1130-1217 read verbatim, plus structural grep.
  Inspected facts: `KEY_CODES` map (space/left/up/right/f/g/h/m/p),
  `KEY_STATUS` set by `$(window).keydown/keyup`; `Matrix` scene-graph helper
  with `updateGrid()`/`draw()`; main loop `mainLoop` → `Game.FSM.execute()`,
  `sprites[i].run(delta)`, score rendered via `Text.renderText`,
  lives drawn as `extraDude`s, timing `delta = elapsed / 30`, requeue through
  `requestAnimFrame(mainLoop, canvasNode)` unless `paused`; keydown toggles
  `f` (framerate), `p` (pause/resume calling `mainLoop()`), `m` (SFX.muted).
  Held: lines ~41-1129 — FSM states, ship/asteroid/bullet objects, spawn and
  game-over/restart transitions.
- Held files: `ipad.js` (touch pad wiring), `jquery-1.4.1.min.js`,
  `vector_battle_regular.typeface.js`, wav assets, `CREDITS.md`, `LICENSE`.

## Flow (from source)

- Boot: scripts load in order, jQuery ready handler starts `mainLoop()` (line
  region 1130+ is inside `$(document).ready` style wrapper).
- Input: keyboard via `KEY_STATUS`; pause `p`, mute `m`, framerate `f` verified.
  Touch buttons exist in DOM; their event wiring is in held `ipad.js`.
- Core loop: `Game.FSM.execute()` per frame drives state; sprite `run(delta)`
  updates model; HUD score/lives drawn each frame.
- Score: `Game.score` rendered top-right; lives count `Game.lives`.
- Win/lose and restart: implemented inside the held FSM region — **not
  verified here**; do not assume a specific game-over/restart path from this
  report.
- Partial coverage must be read as: ranges 1-40 and 1130-1217 inspected;
  ~1,090 middle lines held.

## UI bloat: MILD

- `#hud` paragraph ("Steer with the left and right arrows…") is a persistent
  one-line controls doc above the board — genuine, small; candidate for
  one-time help.
- Touch pads `#left-controls`/`#right-controls` are essential touch input.
- No modals, ads, or decorative cards in the entry.

## Popups / modals

- None authored in `index.html`. In-canvas state text (`Paused`) is HUD.

## Animation / simulation

- Real model loop: `mainLoop` mutates sprite state via `run(delta)` then
  redraws; frame timing computed from `Date.now()` deltas. Not a decorative
  RAF — but the FSM/state-machine details are held.

## Findings

- MEDIUM — report/coverage gap: FSM and game-over logic (game.js ~41-1129)
  uninspected; smallest needed check: read that range before any acceptance.
- LOW — persistent instruction paragraph duplicates what one-time help could
  carry; root `index.html` `#hud`. No fix required for playability.

## Recommended playable view

Keep `#canvas`, touch pads, in-canvas score/lives. Fold `#hud` paragraph into
one-time acknowledged help. No popups to remove.
