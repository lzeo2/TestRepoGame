# Play flow audit: Tron Light Cycles (id 163)

## Identity / baseline

- Registered `games.json` id 163, url `Games/TronLightCycles/index.html` (verified; 116 entries).
- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`; batch `6.json` (5 files, 428,531 bytes; p5.min.js is the bulk).
- Maintenance document basename: `docs/maintenance/games/163-tronlightcycles.md`.
- Provenance (in-source): `github.com/faboyds/Tron`, MIT, commit `f95e35bc26f0c3778162c3de6e42a19c9fc60b2a`; p5.js 0.6.0 vendored (LGPL-2.1, `p5-LICENSE.txt`).

## Source inspected

- `index.html` blob `41efa36a0cc7633b0318ff3572d5d7654352df0c` read completely (118 lines): provenance comment, `#restartBtn` (fixed, 44+px), `header.page-head` h1 + rules paragraph, `#pads` two touch d-pads (`.pad-btn[data-key]` 46px cells, `@media (pointer: coarse)`), boot script: `window.tronStart()` on load, `restartBtn` -> `tronRestart`, pad buttons -> `window.handleKey(code)` on touchstart/mousedown.
- `sketch.js` blob `4207ef7421d065d87fe0662a51d3f30e0d6079f1` read completely (167 lines): `setup()`, `draw()`, `keyPressed()`, `handleKey(keyCode)`, `window.tronStart/tronRestart`, `gameOver(winner, loser)`, `Player` constructor with `update/show/direction/checkIfDied/reset`.
- `p5.min.js` blob `030e98d99e51...` vendored library, not read (third-party runtime).

## Flow

- Boot: p5 `setup()` -> `createCanvas(600,600)`, both `Player`s created (P1 at 0,0 moving right; P2 clamped start at 600,600 -> first `update()` constrains to 580,580 with initial speedX = -1), `frameRate(15)`, `background(0)`; index then calls `tronStart()` so the round auto-starts (start overlay removed by design).
- Start/setup: after `tronRestart()` or `gameOver()`, `paused = 1` and `draw()` paints the pause card ("Tron Light cycle 1v1" / "Press SPACE to start"); Space (`keyCode === 32` in `handleKey`) or `tronStart()` resumes.
- Input: P1 `W A S D` (87/83/65/68), P2 arrows (UP/DOWN/LEFT/RIGHT constants); reversal blocked by `speedX/speedY` guards; touch pads fire the same `handleKey`.
- Core loop: `draw()` while `!paused`: `background(0)`, `player1/2.update()` (push `[x,y]` to `tail`, move `scl` 20 px, `constrain` to bounds), `checkIfDied(other)` for both, `show()` (tail dots + head rect).
- Round end: `gameOver(winner, loser)` resets both, floods the canvas with the winner's color (`rect(0,0,...)`), sets `paused = 1`.
- Score/progression: **none** - no round counter or score anywhere; wins are only visible as a one-frame color flood until restart/space. Restart/exit: `#restartBtn` -> `tronRestart` (paused, requires Space to resume).

## UI bloat classification: MILD

- Persistent: `header.page-head` (h1 + long rules paragraph) always above the canvas; candidate for one-time acknowledged help.
- Genuine HUD: `#restartBtn` (44px, `aria-label`), `#pads` touch d-pads (essential touch input) - keep both.
- Pause card text drawn on canvas ("Press SPACE to start") is genuine state feedback, not bloat.
- Popups: none. No modals.

## Animation / simulation

- Real model simulation, not decorative: 15 fps `draw()` moves `Player.x/y`, grows `Player.tail`, collision scan each frame (`dist(...) < 1` against own and opponent tail cells). CSS `:active` on pads is the only CSS animation.

## Findings

1. HIGH - `checkIfDied` only detects trail collisions; there is no wall death. `update()` `constrain()`s position to the canvas, so a rider hitting a wall slides along it indefinitely, contradicting `header.page-head` copy "Steer the other rider into a wall to win the round." Either add a wall-collision death (compare pre-constrain position to bounds in `Player.update`/`checkIfDied`) or fix the copy. Root: `sketch.js` `Player.prototype.update` + `checkIfDied`, callers `draw()`.
2. MEDIUM - No score/round tracking: after `gameOver()` the winner color is drawn once, then `draw()` renders the pause card over it (pause branch repaints `background`? No: pause branch draws text over the existing flood only when `paused`, but `tronRestart` calls `background(0)` clearing it). Result: no persistent indication of who won; two players can lose track. Fix: small round-counter HUD (kept outside the canvas) updated in `gameOver`.
3. MEDIUM - Touch dead-end: `tronRestart()` sets `paused = 1` and only Space (`handleKey` 32) resumes; the touch pads have no start key. A touch-only player who taps Restart cannot resume. Fix: resume on any pad press or add a Start button to `#pads`.
4. LOW - In one frame both `checkIfDied` calls can fire `gameOver` twice (winner flood applied twice, second call overwrites with loser as winner of the second call); harmless visually but illogical. Guard with `if (paused) return;` at the top of `checkIfDied`.

## Recommended playable view

Keep canvas, `#restartBtn`, both `#pads`, pause-card text. Move `header.page-head` paragraph into one-time acknowledged help (reopenable). No popups exist.

## Validation

CODE-REVIEW ONLY. Smallest needed check: bounded local load, play a 20 s round with keyboard, verify trail death, restart, Space resume, and the touch-pad resume dead-end on a coarse-pointer device/DevTools emulation.
