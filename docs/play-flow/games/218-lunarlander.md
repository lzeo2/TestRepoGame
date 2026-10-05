# Lunar Lander play-flow audit (batch 4)

Identity: registered id 218, entry `Games/LunarLander/index.html`, entry blob `7e4d0c3948fbc8579132b436c525178b55ede09e`, tree `78c2433b72baac9177e8e9f36d3dbb026b5c3d02`, 4 files, 10,897 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/218-lunarlander.md` read for orientation; source re-checked directly.

Validation status: **CODE-REVIEW ONLY**. No browser run this worker.

## Source inspected

- `Games/LunarLander/index.html` (blob above): full read. Minimal shell: `<h1>Lunar Lander</h1>` and `<canvas id="screen" width="310" height="310">`, script in `<head>`. No controls, no HUD, no buttons.
- `Games/LunarLander/lunar-lander.js` (blob `2dbf9f080110c1177b2d20d1cc8ae9c3a312e3f8`, 8,565 bytes): full-file function inventory via grep: `Game`, `MountainLine`, `Line`, `LandingPadLine`, `Player`, `Keyboarder`, `drawLine`, `anyLinesIntersecting`, `isColliding`, `reportCollisions`, `createMountains`, `ordinate`, `tick`. `KEYS` tokens present in `Keyboarder`.

Held: line-by-line re-read of the physics bodies this run; per-frame constants and the boost latch semantics come from manual orientation and should be re-confirmed in the smallest browser check.

## Flow

- Boot: window-load listener constructs `Game` after `#screen` exists; terrain built with `createMountains()`.
- Start/setup: auto-starts immediately, no menu.
- Input: `Keyboarder` key-state map; left/right rotate, up engages boost, down releases it (orientation; latch behavior held for native confirmation). No touch input exists.
- Core loop: recursive `requestAnimationFrame` `tick` calling `update()` then `draw()` on the 310x310 canvas.
- Score/progression: **none**. No score, fuel, timer or HUD in source. The catalog's limited-fuel wording is not implemented (no fuel variable found).
- Win/lose: crash removes the player body (`Player.collision` -> `removeBody`); padded landing zeroes velocity. No win/lose text, no restart affordance: outcome UI is **absent**, not merely unverified.
- Restart: page reload only.

## UI bloat classification: NONE

Only the `h1` and canvas exist. No cards, no popups, no decorative layers. Missing rather than bloated: no instructions and no touch controls.

## Popup/modal inventory

None. No modal, no nag.

## Animation/simulation

Real simulation: `Game.bodies` line segments updated per RAF frame, `reportCollisions()` dispatching collision callbacks, `MountainLine`/`LandingPadLine` as collision surfaces. RAF is never cancelled, including after player removal (confirmed by manual; loop cancellation grep not re-run).

## Findings

- HIGH: `lunar-lander.js::Player.collision` removes the player without any outcome or reset UI; the loop keeps drawing empty terrain and the only recovery is a browser reload. Root: crash path has no lifecycle owner. Fix: expose outcome/reset on the existing `Game` instance; never stack a second `Game` (each construction would add another RAF and listeners).
- MEDIUM: physics advances per frame with fixed gravity/boost increments, refresh-rate dependent (orientation, not measured). Fix: bounded elapsed-time accumulator preserving 60Hz tuning.
- MEDIUM: `#screen` has no documented controls, no touch path. Fix: truthful instruction text plus native controls feeding `Keyboarder` state; do not invent fuel.
- No fix needed: geometry helpers and terrain generation are clean; no bloat to remove.

## Recommended playable view

Keep the canvas and any added HUD/controls. Add a one-time acknowledged controls help (rotate, boost latch) with optional reopen; place outcome text (crash/landed) directly in the shell, not a recurring popup. Remove nothing: the page is already minimal.

## Smallest browser check still needed

Load, hold ArrowUp to boost, rotate with left/right, crash into a mountain, confirm the shell offers a restart without reload; verify ArrowDown cuts thrust and check timing at 60Hz.
