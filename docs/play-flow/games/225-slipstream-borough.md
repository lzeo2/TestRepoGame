# Play-flow audit: Slipstream Borough (Police Chase, Preview)

Validation: CODE-REVIEW ONLY. No browser run in this pass; no runtime claims.
Baseline: `5be686e`. Inventory: `docs/maintenance/games/225-slipstream-borough.md`.
Id 225, registered. Owned report only; no code edited.

## SOURCE INSPECTED

- `Games/Slipstream Borough/index.html` blob `2a463119` read fully (all DOM/dialogs/touch controls).
- `Games/Slipstream Borough/script.js` blob `ca6d8134`, 187 lines: lines 1-135 read fully (`load`, `save`, `garageUI`, `setPhase`, `start`, `finish`, `leave`, `input`, `updateHud`, `pause`, `frame`), plus grep of 136-187 for handlers/loop (`frame` RAF at 134, key/dialog handlers 144-187).
- `Games/Slipstream Borough/view.js` blob `a79bf088`, 279 lines, read fully (`createView`, `select`, `draw`, `inspect`).
- `Games/Slipstream Borough/world.js` blob `08b310a7` and `clock.js` blob `0eca2de8` read fully.
- Held, not reviewed: `core.js` blob `8a03513c` (406 lines) - `stepRun`, `startRun`, `settleRun`, pursuit/heat logic not re-derived; `style.css`; `assets/car-arcade/*` (fleet/models/patrol). Bounded review, not comprehensive.

## FLOW (from source)

Boot: `load(); bootView(); setPhase('garage'); start('roam'); raf = requestAnimationFrame(frame);` (line 187).
Start: `#start` -> `start(mode)` -> `core.startRun(profile, mode)` -> `setPhase('run')`, `$('viewport').focus()`.
Input/core loop: `frame(now)` fixed-step `while (accumulator >= 1/60) run = core.stepRun(run, input(), 1/60)`; `input()` maps WASD/arrows + `held` touch set + `#cruise` checkbox; `view.draw(profile, run, steer)` every RAF; HUD refreshed when `now - lastHud > 160`.
Score/progression: `#hud` text - `run.score`, `run.distance`, `run.hp`, heat/arrest, `run.place` in race, unlock mileage in `#career`/`#catalog`. Terminal states handled in `finish()` -> `#result` with `#resultTitle`/`#resultText` (`Finished/ Escaped/ Parked/ Busted`) -> `#retry` / `#garageButton`.
Restart/exit: `#retry` (Drive again), `#leave` (park+bank for roam), `#reload` / `#reset` -> `#resetDialog`.

## ANIMATION EVIDENCE (model vs camera vs plain RAF)

Animated when `phase === 'run'` (view.js `draw`):
- Wheels: `wheelAngle -= Math.max(0, distance - lastDistance) / player.userData.profile.wheelRadius;` applied `for (const wheel of player.userData.wheels) wheel.rotation.x = run ? wheelAngle : 0;`. NPC wheels likewise from per-entity `traveled`.
- World scroll (highway): lane `lines` re-instanced at `-Math.floor(i/3)*10 + distance % 10 + 20`, buildings at `distance % 15 + 25` - real background movement.
- Player yaw `player.rotation.y = -steer * .10` lean; roam chase camera with obstruction raycast (`ray.intersectObject(cityBuildings)`), fixed chase cam in highway modes, orbit cam in garage.
- Effects: smoke puff instance drift `Math.sin(i*7 + run.elapsed)`, EMP `pulse.scale.setScalar(6 + (3 - run.gadgetTime) * 20)`, decoy `5 + Math.sin(run.elapsed * 5)`, boost flame `flames.scale.z = .9 + .2*Math.sin(run.elapsed * 24)`, repair ring growth.
- ROOT FINDING (static feel): in `phase === 'garage'` `setPhase` sets `run = null`, so `draw` takes the `else` branch: `camera.position.set(Math.sin(orbit)*7, 3.1, Math.cos(orbit)*7)` with `orbit` changed only by drag/`#orbitLeft`/`#orbitRight`; wheels forced to 0; `highway.visible = city.visible = false` world hidden. The garage is therefore a frozen scene driven by plain renderer RAF. **Main erratum:** fresh boot explicitly calls `start('roam')` (as this report's Flow already records), so garage is NOT the first screen by default. Static garage alone cannot explain the user's report of static driving. Running source updates wheels/world/camera/effects, but responsiveness and visible quality still need ordinary native reproduction on the user's device.
- No skeletal/`AnimationMixer` playback found by grep. **Main erratum:** live cars are procedural shared `createCar` meshes, not GLB props; scene transforms/wheel rotation/effects are distinct from authored character clips. No claim of all-source or visual animation acceptance.

## UI BLOAT: HIGH (persistent descriptive copy)

- Persistent in `#drive`: `<p class="small">W / Up: gas...</p>` control line plus `#cruise` label - visible every run, duplicate of `#helpDialog` content.
- Persistent in `#garage`: long gadget explanation `<p class="small">Discreet: smoke and decoy...</p>` and the mileage/banking `<p class="small">City Garage parks and banks...</p>`; `#quip` shows rotating flavor lines.
- Genuine/essential: `#hud`, `.touch-controls` (`#deploy`), `#pause`, `#leave`, `#result`, `#start`, catalog select buttons, `#customize`, `#equipment`.

## POPUP MODAL INVENTORY

- `#helpDialog` (5 long paragraphs): `$('help').onclick = () => { if (phase === 'run' && !paused) pause(); $('helpDialog').showModal(); }` (line 167). User-triggered, `#closeHelp` closes. No auto-repeat.
- `#resetDialog`: `#reset` -> `showModal()` (line 174), explicit confirm.
- Non-modal statuses `#io`, `#feedback`, `#renderError` (with `#renderRetry`). No timer-driven nag found in inspected ranges.

## BUGS / FIXES (root locations)

1. Frozen garage scene (view.js `draw` else-branch + `setPhase` nulling `run`). Fix, not hide: slow idle orbit (`orbit += dt * k` inside `draw` when `!run && !dragging`) or keep a showroom turntable rotation on the selected car. Root: `Games/Slipstream Borough/view.js`, caller `frame` in `script.js`.
2. Duplicated persistent instruction paragraphs in `#drive`/`#garage` overlapping `#helpDialog`. Consolidate into acknowledged one-time Help with reopen; keep HUD/touch.

## RECOMMENDED PLAYABLE VIEW

Keep `#hud`, `.touch-controls` incl. `#deploy`, `#cruise`, `#pause`, `#leave`, `#start`, `#result` + `#retry`/`#garageButton`, `#garage` purchase/select/upgrade buttons, `#customize`, `#equipment`, `#io`/`#renderError` feedback. Remove from persistent view: the `#drive` control `<p>`, the `#garage` gadget and banking paragraphs, and fold the `#helpDialog` bulk into one first-run acknowledged Help with a persistent Controls button to reopen. No recurring popups.
