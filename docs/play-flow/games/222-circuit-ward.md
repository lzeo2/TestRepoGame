# Play-flow audit: Circuit Ward

Validation: CODE-REVIEW ONLY. No browser run in this pass; no runtime claims.
Baseline: `5be686e`. Inventory: `docs/maintenance/games/222-circuit-ward.md`.
Id 222, registered. Owned report only; another worker owns game fixes. No code edited.

## SOURCE INSPECTED

- `Games/Circuit Ward/index.html` blob `b9c50b6a` read fully (menu/lobby/pause/touch DOM).
- `Games/Circuit Ward/script.js` blob `2fd2c23b`, 801 lines. Inspected ranges: lines 46-206 (state/`wire`), 680-801 fully (`robot`, `interpolated`, `draw`, `frame`). Grep coverage over whole file for `requestAnimationFrame|lerp|rotation|wheel|bob|recoil`.
- Held, not reviewed: lines 1-45, 47-679 (input, cover/ray math, model-pool setup, boot), `multiplayer.js` blob `c5b3e9e3` not inspected, `style.css` not inspected, GLB contents opaque. This is a bounded range review, not comprehensive.

## FLOW (from source)

Boot: `index.html` loads `./script.js` module; `if (webgl) requestAnimationFrame(frame)` (line 800). Menu is `#menu` panel over `#overlay` with `#startSolo` / `#hostRoom` / `#joinRoom`.
Start: `run.phase === 'playing'` gates `stepRun` in `frame` (line ~781): `if (run?.phase === 'playing') { run = stepRun(run, inputs, dt); live = wire(run); }`.
Input/core loop: `frame(now)` clamps dt to 0.05, builds `inputs` Map, calls `stepRun`, broadcasts at 50ms (`now - networkAt >= 50`), then `draw(now)`.
Progression: HUD `#shield` `#wave` `#score` `#remaining` (index.html). Scores documented in menu text (walkers 100, drones 150). Win/lose and retry live in `#matchPanel` (`#resumeBtn` `#retryBtn` `#menuBtn`); exact HP/wave completion rules were in the held line range, not re-derived here.
Restart: `#retryBtn` / `#freshSolo` / `#menuBtn` present in `#matchPanel`.

## ANIMATION EVIDENCE (model vs camera vs plain RAF)

- Renderer RAF always runs (`frame` -> `draw` -> `renderer.render(scene, camera)`).
- Model/actor motion exists during play: `interpolated(actor, previous?.players, amount)` lerps x/z between snapshots (line ~687); walker bob `Math.sin(live.time * 7 + bot.id) * 0.025` passed to `robot(...)` as `bob` (line 725); repair-cell bob `0.27 + Math.sin(live.time * 2 + cell.id) * 0.035` (line 753); weapon recoil `weapon.position.z = ... -Math.max(0,(feedbackUntil - now)/90) * 0.035` (line ~700); tracer pulses `positions.setXYZ` from `traces` with `until: now + 70` (lines ~745-765).
- ROOT FINDING (static feel): in lobby the simulation never advances. `live` starts as `{ phase: 'lobby', ..., time: 0, bots: [] }` (line 206, reset again line 314) and `run.time += dt` only happens inside `stepRun` while `phase === 'playing'`. The attract scene drawn in lobby is three fixed demo bots (lines 708-712) whose bob term is `Math.sin(live.time * 7 + bot.id)` with `live.time === 0`, so the offset is a constant. Camera is fixed `camera.position.set(0, 2.8, 9); camera.rotation.set(-0.12, 0, 0)` (line 706). Result: the first screen the user sees is a frozen frame; the RAF loop is running but no scene property changes. Severity: HIGH first-impression, gameplay itself is animated.
- No `AnimationMixer` / skeletal clip playback found by grep; GLB models are instanced static meshes moved by matrices, not clip-animated. Model animation = translation/bob only.

## UI BLOAT: MILD

Persistent/genuine: `#hud`, `#crosshair`, `#touchControls` (essential touch), `#touchFire`, `#menu` start path.
Description text inside `#menu`: intro `<p>` plus `<h2>Controls</h2><ul class="controls">` plus two `<p class="small">` rule/score paragraphs. `#matchPanel` repeats a `<p class="small">` control recap. These are static instruction cards, not HUD.

## POPUP MODAL INVENTORY

- `#menu` / `#lobby` / `#matchPanel` are `#overlay` sections toggled `hidden`, opened by explicit user action (start, pause, pairing). No recurring timer-driven nag found in inspected ranges.
- `#playNote` is `role="status"`, `#status` is `role="status"`; triggers in held ranges not fully traced.

## BUGS / FIXES (root locations)

1. Frozen lobby attract scene (above). Fix, not hide: step a lightweight preview clock for `live.time` (or bob using `performance.now()`) while `phase === 'lobby'`, and optionally a slow camera drift. Owner: Circuit Ward fix worker.
2. Menu instruction cards duplicated in `#matchPanel`. Fix: single acknowledged help.

## RECOMMENDED PLAYABLE VIEW

Keep `#hud`, `#crosshair`, `#touchControls`, `#startSolo`/`#hostRoom`/`#joinRoom`, `#retryBtn`, `#resumeBtn`, `#menuBtn`, `#pauseBtn`. Move `#menu` `<ul class="controls">` and the two `.small` rule paragraphs plus the `#matchPanel` recap into one Help dialog, shown once and acknowledged, reopenable from a Help button. No recurring popups. No game code edited in this pass.
