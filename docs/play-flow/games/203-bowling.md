# Play flow review: Bowling (id 203)

Validation status: CODE-REVIEW ONLY. No browser run was performed in this pass.

## Identity

- Game: Bowling, catalog id 203, registered, entry `Games/Bowling/index.html`.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`.
- Inventory document: `docs/maintenance/games/203-bowling.md`.
- Provenance per `Games/Bowling/CREDITS.md` (blob 301c5c06... not applicable; CREDITS blob b734726a... wait: CREDITS = blob from ls-tree): upstream `github.com/iliagrigorevdev/bowling`, commit 60fa6fe5, GPL-3.0, retrieved 2025-09-24. Local portal mods: header, restart button, `js/keyboard.js` glue only.

## Source inspected (all read in full at baseline)

- `Games/Bowling/index.html` (blob c13f130793a851a2020fdacfec857b328e0efe60): wrapper + `.gamebar` header (h1, instruction `<p>`, `#restartBtn`), loads ammo.js, three.js, GLTFLoader.js, scores.js, bowlphysics.js, bowlchallenge.js, keyboard.js. Libs (three/ammo/GLTFLoader) not re-read, treated as vendor.
- `Games/Bowling/js/bowlchallenge.js` (6c2ba98ab): full read. `init()`, `initScene()`, `addPlayer()`, `updateGame()`, `updateScene()`, `animate()`/`render()`, `onActionDown/Move/Up`, mouse+touch handlers, `Imitation` class.
- `Games/Bowling/js/bowlphysics.js` (4f50123ac): full read. `class BowlPhysics`, `updatePhysics()`, `releaseBall()`, `positionBall()`, `detectStandingPins()`, `resetPhysics()`, `STATIC_BOXES`, Ammo.js rigid bodies.
- `Games/Bowling/js/scores.js` (a478bcab6): full read. `class Scores`, `addThrowResult()`, 10-frame strike/spare scoring, `calculateTotalScore()`.
- `Games/Bowling/js/keyboard.js` (bbde04abbd): full read. Portal glue: arrow keys reposition ball, Space/Enter/Up releases (`releaseBall(BALL_VELOCITY_MAX, 0.0)`), R or `#restartBtn` calls `restartGame()`.

## Flow (from source)

- Boot: `init()` at script end builds THREE scene, loads `res/scene.gltf`, then `Ammo().then(initScene)`; `initScene()` adds local player (slot 0) and calls `animate()`. Game is playable immediately; no start screen.
- Start/setup per frame: player drags ball sideways (`onActionMove` -> `physics.positionBall`) and flicks forward (`onActionUp` -> `releaseBall(velocity, angle)`), or keyboard glue above.
- Core loop: `requestAnimationFrame(animate)` -> `render()` -> `updateScene(dt)` -> `updateGame(player, dt)` -> `physics.updatePhysics(dt)` (Ammo `stepSimulation`).
- Score/progression: after `simulationTime > FRAME_ROLL_TIME` (3.0 s), `detectStandingPins()` counts downed pins, `scores.addThrowResult()` advances frames; scorecard `scoresDiv.innerHTML` updated for local player. Pins respawn via `resetPhysics(false, pinsMask)` keeping standing pins across the two throws of a frame.
- End: frame 10 complete sets `scores.gameOver`; then `alert("Game over")` and scores reset to a fresh `Scores()` (open-ended 10-frame game, no win state).
- Restart: `#restartBtn`/R (`keyboard.js restartGame()` resets `p.scores` and `physics.resetPhysics()`).
- Held: AI `Imitation` opponents exist in code but `addImitation(-1)/(1)` calls are commented out in `initScene()`; no multiplayer path active.

## Animation/simulation

Real physics-driven animation: meshes are synced from Ammo bodies every frame in `syncView()` (`syncMeshToBody` reads `getCenterOfMassTransform`). Not a decorative RAF; ball/pin motion is model state.

## UI bloat: MILD

- Persistent `.gamebar` header: `h1` "Bowling" + inline instruction paragraph + `#restartBtn` (44px min-height, good). The instruction paragraph is persistent on-page help; per house rules it should move to one-time acknowledged help with optional reopen. Persistent across play.
- `scoresDiv` (fixed top-center monospace scorecard) is genuine essential HUD; keep.
- No title cards, description cards, or marketing copy in wrapper.

## Popups/modals

- One recurring native `alert("Game over")` in `bowlchallenge.js updateGame()` at every game end. Blocking browser modal, no dismissal choice, immediately followed by silent score reset. No other modals in wrapper.

## Findings

1. MEDIUM: `alert("Game over")` is a recurring blocking modal and the only end-of-game feedback; the scorecard silently resets. Fix: replace with an inline notice in the `.gamebar` or scorecard area (e.g., reuse `scoresDiv` text "Game over - press Restart"), no modal.
2. LOW/MEDIUM: Header instruction paragraph is persistent copy over the play surface. Fix: move to one-time help overlay, reopenable from a Help control; keep `#restartBtn` visible.
3. LOW: `keyboard.js` Space/Enter release is suppressed only when focus is on BUTTON/A; if focus is on body, Enter also fires while `#restartBtn` is focused-after-click? (`onButton` check covers button focus.) No fix needed beyond keeping the check.
4. LOW: `restartGame()` mid-roll resets state while `simulationActive` may be true; `resetPhysics()` sets `simulationActive=false`, so no crash seen in source. Watch in runtime check.

## Recommended playable view

Keep canvas, `.gamebar` h1 + Restart, `scoresDiv` HUD, touch drag/flick input. Remove the persistent instruction paragraph into one-time help. No other wrapper chrome to remove. No game source changes made in this pass.

## Smallest needed browser check

Load entry over a local static server: confirm GLTF+Ammo boot, drag/flick throw, keyboard throw, scorecard update over 2 frames, Restart mid-game, and the Game over alert at frame 10 (or reduced frame count via play).
