# Play-flow audit: Garage Borough

Validation: CODE-REVIEW ONLY. No browser run in this pass; no runtime claims.
Baseline: `5be686e`. Inventory: `docs/maintenance/games/unregistered-garage-borough.md`.
Unregistered (id null). Owned report only; no code edited.

## SOURCE INSPECTED

- `Games/Garage Borough/index.html` blob `5d58bb68` read fully (14 lines, all DOM/dialogs).
- `Games/Garage Borough/script.js` blob `96824a0d`, 104 lines, read fully (`frame`, `refresh`, `action`, `syncView`, all `$('id')` handlers).
- `Games/Garage Borough/view.js` blob `7082271c`, 84 lines, read fully (`createView`, `update`, `rotate`, `render`, `closeup`).
- Grep only: `core.js` blob `c4ac8e46` (233 lines) not read; `tickBusiness`/`buyStock`/`sellCar` internals held. `assets/car-arcade/models.js`, `fleet.js`, `storage.js` not inspected. Bounded review, not comprehensive.

## FLOW (from source)

Boot: module script; `view = createView($('scene'))` in try/catch, else `#gl-error` shown. `raf = requestAnimationFrame(frame)` at end of file.
Start: `#start` -> `started = true; paused = false` -> `refresh(true)`. `active()` = `started && !paused && business.status === 'playing' && !!view`.
Input/core loop: `frame(now)` -> `tickBusiness(business, dt)` (dt capped .05), save every 1000ms, `refresh()` every 250ms, `view.render()` every RAF with `$('render-stats')` update. Pointer drag / `#left` `#right` / ArrowLeft/Right call `view.rotate()`. `#closeup` calls `view.closeup()`.
Score/progression: `#cash` `#sales` `#rent` `#capacity`, `#customers`, `#inventory` cards, `#result` win text "Garage of the day! Ten real customer sales." (10 sales = won); `status === 'closed'` when rent uncovered.
Restart/reset: `#reset` -> `#reset-dialog` (`#confirm-reset` / `#cancel-reset`), `#continue` when won.

## ANIMATION EVIDENCE (model vs camera vs plain RAF)

- RAF runs continuously and `renderer.render(scene, camera)` fires every frame (`render()` in view.js), but NO scene property is written inside `render()`. No wheel spin, no bob, no camera motion, no world scroll.
- The only object motion is user-driven: module-level `let angle = -.5`; `rotate(delta){ angle += delta; ... car.rotation.y = angle; }` on the stand car (`put('stand', preview, 0, 6.7, angle)`), triggered only by pointer drag, arrow keys, `#left`/`#right`.
- Camera only moves in `closeup(enabled)` (two fixed positions). `update(business, selected)` writes static instance matrices for `lifts` and `workers` from `business.bays`/`business.staff` - counts, not frames; workers never animate.
- ROOT FINDING (static feel): the 3D viewport is a still life unless the user drags/rotates. It is plain renderer RAF over a static scene; nothing conveys motion or state change in 3D. No GLB model/character animation (shared `createCar` used as static prop; wheels never rotated here). Severity: HIGH for feel, MEDIUM for playability (the game is a management sim; the DOM ledger carries state).

## UI BLOAT: MILD

Persistent/genuine: `#cash` `#sales` `#rent` `#capacity` HUD, `#inventory`, `#catalog`, `#customers`, `#start` `#pause` `#reset` `#hire` `#expand`, `#left` `#right` `#closeup` (essential canvas controls), `#render-stats` (diagnostic noise).
Static description copy: `#intro` paragraph, `#status` first-time hint, `p.shop-sign`, `#empty` note, catalogue `<p>`, and `#help-dialog` 4 paragraphs. Persistent instructional, not HUD.

## POPUP MODAL INVENTORY

- `#help-dialog`: `$('help').onclick = () => { pause(); $('helpDialog'... }` in this file it is `$('help').onclick=()=>{pause();$('help-dialog').showModal();}` - user-triggered only, closes with `method="dialog"` form. No repeat/nag trigger found.
- `#reset-dialog`: user-triggered, requires explicit confirm. No recurring popups in inspected source.

## BUGS / FIXES (root locations)

1. Static 3D scene (view.js `render()`, `update()`). Fix if desired: idle auto-rotation of the stand car (`angle += small dt term` inside `render()` when not dragging) or a subtle camera drift. Do not fake gameplay motion. Root: `Games/Garage Borough/view.js`.
2. Instruction copy split across `#intro`, `#status`, `#help-dialog`. Consolidate; no game-code edit required from this audit.

## RECOMMENDED PLAYABLE VIEW

Keep `#cash`/`#sales`/`#rent`/`#capacity`, `#start` `#pause` `#reset` `#continue`, `#hire` `#expand`, `#inventory`, `#catalog` buy buttons, `#customers`, `#left` `#right` `#closeup` touch controls, `#gl-error`/`#save-error`. Fold `#intro`, the catalogue paragraph, `p.shop-sign` and the `#help-dialog` how-to text into one Help dialog shown once on first visit with a persistent Help button to reopen. No recurring nag popups (none exist today - do not add any).
