# Play-flow audit: Tag Relay

Validation: CODE-REVIEW ONLY. No browser run in this pass; no runtime claims.
Baseline: `5be686e`. Inventory: `docs/maintenance/games/223-tag-relay.md`.
Id 223, registered. Owned report only; no code edited.

## SOURCE INSPECTED

- `Games/Tag Relay/index.html` blob `c1ff3fd1` read fully (rules copy, `#menu`, score row, touch pads).
- `Games/Tag Relay/script.js` blob `af02dcf8`, 66 lines, read fully (`feedback`, `start`, pause/restart/pad handlers, `tagRelaySnapshot`).
- `Games/Tag Relay/game.js` blob `d8910050`, 474 lines. Inspected: lines 399-447 fully (`stopMusic`, `update`, `stopTimer`, `award`, `tick`, `startTimer`, `afterInput`), plus grep of the rest for `canMove|sprite|setInterval|addText|playTune` and `createTagGame` signature.
- Held, not reviewed: `game.js` lines 1-179 and 180-398 (map layouts, input routing, level sequence), `original.js` (upstream port source), `vendor/sprig/*` (vendored engine), `style.css`. Bounded review, not comprehensive.

## FLOW (from source)

Boot: module script; menu overlay `#menu` visible over `#arena` canvas; `#pause`/`#restart` start disabled.
Start: `#start` -> `start()` -> `cleanup()`, `#menu` hidden, `engine = webEngine(canvas)`, `game = createTagGame(engine.api, feedback)`, `canvas.focus()`.
Input/core loop: keyboard WASD (Red) / IJKL (Blue) via Sprig `onInput`; touch pads dispatch synthetic `KeyboardEvent('keydown')` on `#arena` from `button.dataset.key` (both `pointerdown` and detail-0 `click`). Movement is turn-based per key press (`canMove(sprite, dx, dy)`); `afterInput(...)` checks tag immediately. A separate `setInterval(tick, 50)` only advances the round clock.
Score/progression: `#red-score` `#blue-score` from `state.redScore`/`state.blueScore`; `#clock` `state.remaining.toFixed(1)s`; `#round` `Arena n / 14`. `award(red)`: Red scores on overlap, Blue scores if `elapsed >= 7000`; first to 7 wins (`phase = 'won'`, `setMap(end)`).
Restart/exit: `#restart` -> `start()`; `#pause` toggles `game.pause`; `visibilitychange` pauses; on `won` the engine is cleaned up and `engine.api.render()` freezes the final frame (script.js `feedback`).

## ANIMATION EVIDENCE (model vs camera vs plain RAF)

- 2D bitmap Sprig game: no 3D, no camera, no RAF loop in our code. Sprite motion exists only when a player presses a key (`onInput` -> grid step) or when `tick()` advances phase: `between -> round` after 1500ms calls `setMap(levels[level])` (arena swap), and round expiry calls `award(false)`.
- Between inputs, the only changing state is the countdown: `tick()` every 50ms updates `elapsed` and `update()` -> `changed(snapshot())` refreshes `#clock`.
- ROOT FINDING (static feel): during a round the arena picture does not change unless a player moves - no idle animation, no interpolated motion, no RAF redraw of the canvas in our code; Sprig only repaints on state change. Deliberate grid-tag design, but it matches the user's "static" report. Severity: MEDIUM (playable and fair; both players act constantly during a round), LOW for HUD (clock ticks).
- No model/character/wheel/projectile animation claims: none exist in inspected source; `playTune`/`playback` are audio, not motion.

## UI BLOAT: MILD

Persistent/genuine: `#red-score` `#clock` `#blue-score`, `#status`, `#round`, `#pause` `#restart`, `.pad` touch buttons (essential 44px controls), `#arena`.
Static description copy: top `<p class="rules">` (2 lines, persistent), `#menu` `<h2>` + `<p>14 arenas. Two players...</p>`, `#status` ready text repeating WASD/IJKL. The rules line and status duplicate each other.

## POPUP MODAL INVENTORY

None. No `<dialog>`/`showModal` in `index.html` or `script.js`. `#menu` is a start overlay dismissed once by `#start`; `#status` is `role="status"`. No recurring nag possible in inspected source.

## BUGS / FIXES (root locations)

1. Static arena between inputs (inherent to `game.js` grid stepping; `original.js` inherits it). Only fix if desired: cosmetic idle animation would require new authored logic - flag for owner decision, do not fabricate. No defect in correctness.
2. Copy duplication: `p.rules` vs `#status` ready message vs `#menu` paragraph. Consolidate into one acknowledged Help/first-visit card; keep `#status` for live state only.

## RECOMMENDED PLAYABLE VIEW

Keep `#arena`, both `.pad` fieldsets, `#red-score` `#blue-score` `#clock`, `#round`, `#pause` `#restart`, `#status`, `#start` path. Move `p.rules` and the `#menu` descriptive paragraph into one first-run acknowledged Help with a reopen button; keep `#menu`'s `#start` as the only pre-game overlay. No modals exist - add none.
