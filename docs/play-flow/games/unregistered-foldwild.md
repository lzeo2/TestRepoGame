# Play-flow audit: Foldwild

Validation: CODE-REVIEW ONLY. No browser run in this pass; no runtime claims.
Baseline: `5be686e`. Inventory: `docs/maintenance/games/unregistered-foldwild.md`.
Unregistered (id null), owner-authorized existing original. Supplied GLB originals kept; hardware gate unresolved here. Owned report only; no code edited.

## SOURCE INSPECTED

- `Games/Foldwild/index.html` blob `690ba0a5` read head fully (menu, HUD, trail controls, dialogs referenced).
- `Games/Foldwild/script.js` blob `367acdcd`, 1153 lines. Inspected: lines 166-217 (`setPhase`, `updateHUD`, `updateProximity`), 374-437 (dialogue/service modal paths), 576-604 (battle outcome/`result`), 909-965 (`move`, `frame`), 1081-1153 (result-continue, keydown, boot `setPhase('menu')`, RAF start). Grep over whole file for `showModal|dialog|setPhase|keydown`.
- `Games/Foldwild/view.js` blob `62bd47d5`, 644 lines. Inspected: lines 460-545 fully (`clearEffect`, `animateAction`, `render`, `resize`, `setQuality`, `setAppearance`, `orbitCamera`). Grep coverage for `camera.position|rotation|lerp|AnimationMixer|mixer`.
- `Games/Foldwild/world.js` blob `98457f7c` - grep only (movement/collision internals held).
- HELD, not reviewed: `battle.js`, `economy.js`, `data.js` (38K), `campaign.js`, `builds.js`, `region-data.js`, view.js lines 1-459 and 546-644 (scene construction, `cameraPosition`, `nearbyVisuals`), script.js remaining ~700 lines, all GLB contents (opaque; no `AnimationMixer` reference exists in the two inspected JS files). Bounded range review, not comprehensive.

## FLOW (from source)

Boot: module script; `setPhase('menu')` (line 1148), `rafId = requestAnimationFrame(frame)` (line 1153).
Start: `#start` -> `slotPresent ? confirmReset(start) : start()` (line 967); `[data-starter]` buttons pick the first ally (`chooseStarter`); `#continue` resumes.
Input/core loop: `frame(time)` (line 935) - dt clamped 0.05, `busy` timing 0.45s, `phase === 'world' -> move(dt)` (WASD/arrows -> `movePosition` -> `view?.setPlayerPosition(x, z, yaw)`), `updateProximity()`, and a throttled `view?.render(renderElapsed)` at 1/60 or 1/30 depending on `state.quality` while `phase !== 'menu'`.
Progression: `#marks` `#kites` `#class-name`, `#score` `#dex-count`, `#campaign-objective`, trials counter `Trials n/5` (line 105). Battles -> `result(...)` -> `setPhase('result')` with `#result-continue` (line 1081) returning to world. Five rival trials = campaign completion (`'Five routes cleared'`, line 604).
Restart/exit: `#new-run`, `#result-continue`, `#pause`, save tools (`#save-now`, export/import).

## ANIMATION EVIDENCE (model vs camera vs plain RAF)

Real per-frame updates in `view.render(dtSeconds)` (view.js 477+):
- Character bob while walking: `player.position.y = walking ? Math.abs(Math.sin(elapsed * 13)) * .075 : 0` (line 483).
- Ally-slot idle bob: `slot.frame.position.y = Math.sin(elapsed * 1.8 + ...) * .025` (line 484).
- NPC instance bob: `oy + Math.sin(elapsed * 1.4 + i) * .012` (line 487).
- Camera: `cameraPosition(false, dt)` lerps - `camera.position.lerp(desiredCamera, 1 - Math.exp(-dt * 7))` (line 411) plus collision `avoidCamera`.
- Battle action effects: `animateAction` drives capture kite arc (`Math.sin(t * Math.PI) * 1.1`, rotation `.25*sin, t*.6, -.5*t`) and ability/hit lunges offset from static anchors (lines 493-505).
- Player yaw from movement: `next.yaw = Math.atan2(-actualX, -actualZ)` in `move` (line 931).
- All idle/bob/effect motion is disabled when `reducedMotion` is set (view.js 481, 466) or `#reduce-motion` is checked - correct behavior, but means reduced-motion users see a genuinely still scene.
- No skeletal clip animation: no `AnimationMixer`/`mixer.`/`.animations` hits in view.js or script.js; GLB models are static meshes moved by transforms.
- ROOT FINDING (static feel): in `phase === 'menu'` `frame` skips `view.render` entirely (line 945: `if (phase !== 'menu' && !document.hidden)`), so the 3D canvas is untouched before Start; and in `inspection`/idle world state nothing moves unless the player moves (bobs are subtle amplitudes .012-.075 units). First screen = DOM menu over a non-updated canvas. Severity: MEDIUM (world play does animate); the small bob amplitudes plus quality-throttled 30fps render at `low` (default `#quality` option "Low" in index.html) make motion easy to read as static. No world-scrolling, wheels or projectiles exist in this genre.

## UI BLOAT: MILD

Persistent/genuine: `#world-hud`, `#message`, `#team-list`, `#nearby-actions`, `#interact` `#rest`, toolbar (`#collection-btn` `#save-now` `#services-btn` `#pause` `#new-run` `#camera-reset`, `#quality`, `#reduce-motion`), `.travel` details, `#battle-panel`.
Static description copy: `#menu` two `<p class="help">` control lines, `#world-help` persistent instruction line (also the canvas `aria-describedby`), `#save-coordination .help`, `#starter-description`. All persistent instruction text.

## POPUP MODAL INVENTORY (from source)

- `#dialogue-dialog`: opened by trail point/service interactions (`showModal()` lines 382, 402); closed to enter battle (line 422). Interaction-gated, not recurring.
- `#service-dialog` (line 654), `#save-dialog` (lines 128-139), `#reset-dialog` (line 287), `#collection-dialog` (lines 769-793). All explicit user actions.
- No timer-driven or repeating nag popup found in inspected ranges. `#message` is `role="status"` feedback (keep).

## BUGS / FIXES (root locations)

1. Menu-phase canvas never rendered (`script.js` line 945 gate + boot order). Fix, not hide: render one frame (or a slow idle camera) before `setPhase('menu')` finishes so the 3D scene is visible behind `#menu`. Root: `Games/Foldwild/script.js` `frame`, `Games/Foldwild/view.js` `render`.
2. Default `Quality: low` (30fps cap) plus tiny bob amplitudes reads as static. Consider `standard` default; keep `#reduce-motion` semantics.
3. Instruction lines duplicated (`#menu` help, `#world-help`, canvas `aria-describedby`). Consolidate into one acknowledged Help.

## RECOMMENDED PLAYABLE VIEW

Keep `#world-hud`, `#battle-panel` action buttons, `#nearby-actions`, `#interact` `#rest`, toolbar buttons, `#message`, `#pause`, `#start`/`#continue`/`[data-starter]`, save `#status` lines, `#reduce-motion`/`#quality`. Move the `#menu` control help paragraphs and `#world-help` into one first-run acknowledged Help dialog with a persistent Help reopen; `#dialogue-dialog` and `#service-dialog` are genuine gameplay menus - keep them, no added recurring popups.
