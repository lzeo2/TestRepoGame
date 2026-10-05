# Play-flow audit: Spline Ride

Validation: CODE-REVIEW ONLY. No browser run in this pass; no runtime claims.
Baseline: `5be686e`. Inventory: `docs/maintenance/games/224-spline-ride.md`.
Id 224, registered. Owned report only; no code edited.

## SOURCE INSPECTED

- `Games/Spline Ride/index.html` blob `630f1f17` read fully (36 lines; toolbar, readout, stage, help line).
- `Games/Spline Ride/script.js` blob `b55f2f54`, 243 lines, read fully (`addTube`, `animateCamera`, `updateProgress`, `setPlaying`, `restart`, `resize`, `render`, `animate`, snapshot getter, all listeners).
- Held, not reviewed: `vendor/three.module.js`, `vendor/OrbitControls.js`, `vendor/CurveExtras.js` (vendored upstream, not re-audited), `style.css`. Bounded review, not comprehensive.

## FLOW (from source)

Boot: module script builds renderer/controls, `addTube()`, then `setPlaying(false); // Orbit is static by default, including reduced-motion users.`, `raf = requestAnimationFrame(animate)`.
Start/setup: `#play` toggles `setPlaying(!playing)`; `playing` forces `params.animationView = true`. `#path` change rebuilds tube and `restart()`. `#scale`/`#sides`/`#closed` rebuild geometry. `#view` toggles Ride/Orbit; `#ahead` toggles look-ahead.
Input/core loop: `animate(time)` - `if (playing) elapsed += max(0, time - previousTime)`, then `render()` and `updateProgress()`. `render()` is upstream Frenet-frame math: `tubeGeometry.parameters.path.getPointAt(t, position)`, binormal interpolation, `splineCamera.matrix.lookAt(...)`, `renderer.render(scene, params.animationView ? splineCamera : camera)`.
Keyboard: Space play/pause, R restart, V view, arrows step `elapsed += 200ms` only while paused.
Score/progress: `#progress` bar + `#percent` + `#laps` from `elapsed % looptime` (20s lap). No win/lose state (upstream demo adaptation; progress/laps are the score surface).
Restart/exit: `#restart` -> `restart()` resets `elapsed`, Orbit view, `controls.reset()`. `visibilitychange` and `prefers-reduced-motion` pause playback.

## ANIMATION EVIDENCE (model vs camera vs plain RAF)

- All motion here is CAMERA motion: `render()` moves `splineCamera` along `path.getPointAt(t, ...)` and the `#c99647` `marker` sphere copies that position. The tube mesh itself never moves (only `mesh.scale` from `#scale`).
- There is no model/character animation, no wheels, no projectile, no world movement: the scene is a static tube + marker.
- ROOT FINDING (static feel): the game boots paused with `setPlaying(false)` and `params.animationView = false`, i.e. Orbit camera fixed at `camera.position.set(0, 50, 500)` with only user OrbitControls input. Until the user presses `#play` (or Space), nothing in the scene changes while `animate()` still runs `render()` + `updateProgress()` each RAF. Severity: HIGH first impression (deliberate reduced-motion-safe default, but it reads as a dead screen); MEDIUM playability because Play is a visible primary button. During Play the ride camera animates continuously.
- Plain-RAF observation: RAF runs unconditionally from boot even while paused; only `elapsed` and camera state gate visible change.

## UI BLOAT: MILD

Persistent/genuine: `#path` select, `#play`, `#restart`, `#view`, `.readout` (`#progress` `#percent` `#laps`), `#stage` canvas, `#status`.
Static description copy: `<p class="help">Drag to orbit. Pinch or scroll...</p>` (persistent keyboard-help card), the `<details><summary>Geometry</summary>` block is a genuine control tray (collapsed by default - acceptable), `header` subtitle "3D spline demo", footer attribution (keep: required credit).

## POPUP MODAL INVENTORY

None. No `<dialog>`, no `showModal`, no timers producing notices in inspected source. `#status` is a `role="status"` loading/error line only.

## BUGS / FIXES (root locations)

1. Static first screen: `setPlaying(false)` + Orbit default in `Games/Spline Ride/script.js` (init block). Suggested fix, not a hide: auto-Play the ride once on load (respecting `prefers-reduced-motion`, which already pauses via the `reducedMotion` listener), or start in Ride view paused with the marker slowly advancing a preview loop. Keep `#play`/`#restart`.
2. Persistent `<p class="help">` duplicates the canvas `aria-label` and the `#view`/Space/R/V affordances. Move to one acknowledged Help disclosure; no code edited in this pass.

## RECOMMENDED PLAYABLE VIEW

Keep `#path`, `#play`, `#restart`, `#view`, `#progress`/`#percent`/`#laps`, `#stage` canvas + `#status`, the collapsed Geometry tray (real controls), and the footer credit. Replace the persistent `<p class="help">` with one first-run acknowledged Help that can be reopened; no modal ever shown again unprompted (there are none today).
