<!-- maintenance-game: Games/Sokoban -->
# Sokoban maintenance

## Identity and status

Registered ID 195, `puzzle`, not featured. Entry `Games/Sokoban/index.html`; twelve files total 105,097 bytes at `8c8a055`. The current port contains 100 maps and eight local sprites, not the older five-level implementation described in catalog parts. No game files were materialized or changed. Browser play is untested in this assignment.

## Implementation map

Source review coverage: entire entry's CSS/bootstrap/gameplay script, `CREDITS.md`, `LICENSE`; first 120 lines of `js/mapdata100.js` inspected as representative data, whole file syntax checked. Remaining level matrices and binary sprite artwork were not individually human-reviewed or solved. `imgPreload()` must load all eight `oImgs` paths before `init()` calls `initLevel()`. `InitMap()` draws 16-square floor cells at 35 px into `#canvas`; `DrawMap()` draws sprites and records `perPosition`. Canvas is fixed 560 square internally but CSS scales it.

`initLevel()` clones a level to `curMap` while `curLevel` retains original goal positions. `go()` calculates forward `p1`/`p2`; `Trygo()` mutates boxes/player and restores the previous cell. `checkFinish()` compares original goals to current boxes. `NextLevel(-1/0/1)` clamps navigation/restart and resets moves. `showMoveInfo()` updates `#msg`. Directional button IDs are `dpad-up`, `dpad-left`, `dpad-down`, `dpad-right`.

## Gameplay and controls

Arrow keys or WASD move; labeled directional buttons provide touch/click movement. Push boxes, never pull; all goals must hold boxes to complete. A blocking completion alert schedules next-level navigation. Previous/Next can skip levels freely; Restart level restores its original matrix. Final level completion clamps back to the last level rather than a separate campaign win. There is no undo, deadlock loss, time limit, sound or start overlay in current source. Those features must not be copied from historical docs.

## State and persistence

Globals own `iCurlevel`, `curMap`, `curLevel`, `curMan`, `perPosition`, `moveTimes` and sprite images. No storage/save keys. Cell values include floor 0, wall 1, goal 2, box 3, player 4, box-on-goal 5. `go()` schedules a zero-delay completion callback without a completion lock or session token. Keyboard handler lives on body and does not prevent arrow scrolling. There is no continuous animation loop; rendering occurs on movement/level change.

## Dependencies and provenance

`CREDITS.md` records `https://github.com/shunyue1320/sokoban`, revision `9d15e6d32a533cf1099f995e30c01ea45ee0f1ff`, retrieval 2026-09-24. MIT `LICENSE` names 舜岳. Notice says original maps/sprites and game logic were retained. The general MIT record is present; separate sprite/level authorship beyond that claim was not independently verified. Preserve all notices and do not replace artwork or infer franchise ownership.

## Audit findings

- **HIGH**, `index.html`, `Trygo()`: p1 bounds use `>` instead of `>=`, and p2 has no bounds check. Edge coordinates can dereference an absent row. Root fix: validate both candidate cells before lookup, with row-specific limits. Native reachability on every map remains untested; deterministic edge-state test recommended.
- **HIGH**, `index.html`, `Trygo()` push blocker: destination rejects values 1 and 3 but not 5. Level data includes 5, so pushing into an initial box-on-goal can overwrite it and destroy box conservation. Root fix: recognize both box encodings at the shared destination guard, or normalize encodings consistently.
- **HIGH**, `index.html`, `imgPreload()`/body input: no image `onerror` recovery and no ready guard. Broken sprite leaves initialization permanently pending; early keys/buttons can call movement with undefined `curMap`/sprites. Root fix: explicit readiness/error state shared by every movement/navigation caller.
- **MEDIUM**, `index.html`, `go()`: repeated inputs on a solved board can queue repeated alerts/level advances. Root fix: lock completion and invalidate pending transition on level change.

## Safe iteration

Maintain original goal metadata when moving boxes, and add conservation checks before modifying movement. Patch `Trygo()` once for keyboard/dpad callers. Preserve map numbering and sprites. Do not replace the engine with an invented puzzle or remove maps based on wrapper inspection. Runtime is read-only here; any later code patch needs its own bounded lease.

## Verification

Actually run: entry inline script and whole map-data syntax checks plus source/catalog/doc assertions; [batch audit](../audits/games-66.md). Native checks: zero. Recheck data with `git show HEAD:Games/Sokoban/js/mapdata100.js | node --check`. Recommended native cases: wait for all sprites, early input, failed image, box-on-goal destination, edges, restart/move counter, completion spam and final level. Historical five-level/undo playtest is superseded and does not validate this port.

## Future outlook

First fix readiness, movement bounds and box conservation. Then replace blocking alerts with accessible completion status, prevent key scrolling and verify scaled canvas/high-DPI rendering. Month work should obtain level/sprite provenance detail and sample difficult maps. Defer save/undo until map encoding and transitions have deterministic coverage.
