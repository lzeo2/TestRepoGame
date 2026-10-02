<!-- maintenance-game: Games/Checkers -->
# Checkers maintenance

## Identity and status

Registered ID **171**, category `strategy`, entry `Games/Checkers/index.html`. Baseline `8c8a055`; one file, 43,765 bytes. Ten readable upstream class files are merged with authored controls/HUD. Local-only source supports offline dependency closure, not complete rules validation.

## Implementation map

**Source review coverage:** the entire HTML/CSS/script read, including all classes and glue. There are no unseen runtime files. Preserve misspelled API names when locating callers: `DrawManger`, `IsValidPlacetoMove`, `GetAllPosibleTiles` are actual identifiers.

`window.onload` constructs `GameManager`, its `Board`, `DrawManger` and `AI`, then draws tiles/checkers and counts. `Checker` owns move/capture/promotion; `Tile.InRange` classifies one-step and two-step diagonal distances. `Board.MustAttack` identifies capture-capable pieces. Checker click uses `DrawManger.Select`; empty-tile click uses `GameManager.Select`. The latter decides ordinary move, repeated jump or result and schedules AI after one second. `AI.GetPossibleMoves/DoJump/Move` implement captures and random ordinary moves with king preference.

`Logger.Log` uses `#status`; `Message.Show/ShowWithHeader` create `#outerMessageBox/#messagebox`; `OkButton` removes them. `updateHUD` scans the model into `#countYou/#countThem`, not DOM piece counts.

## Gameplay and controls

Human light pieces (player 2) start in the bottom three rows and move upward; computer dark pieces (player 1) move downward. Men are forward-only and kings both ways. Capture is advertised as mandatory; a multi-jump can keep the selected checker. Reach the far row to receive `.king-mark`. Tap a checker then a destination; arrows move a synthetic cursor and Enter/Space dispatches checker/tile clicks. Restart reloads. Message OK dismisses a warning/result; it does not itself restart. No audio or save menu exists.

## State and persistence

`gameManager` is closure-scoped, not a `window` debugging API. The model owns an 8 by 8 occupancy matrix, tile/checker lists, turn, human player and game-over flag. Removed checker objects remain with empty `position`. AI `active` controls callbacks; `Stop` toggles rather than setting false. Several delayed turn/move callbacks are not tracked/cancelled. Reload is the reset boundary. No storage keys or persistent record appear.

## Dependencies and provenance

Header and [ingestion record](../../catalog_parts/sources_5.md) identify stroibot's `https://github.com/stroibot/Checkers`, revision `1d0ba0ca0394fdee49a5ba08d7224b30c6cfa524`, claiming MIT. The 10 by 10 original was adapted to 8 by 8 with 12 pieces per side, graphics simplified and keyboard/HUD added. The lone HTML header does not include full MIT terms and no LICENSE blob exists. Verify the original notice before stronger rights clearance.

## Audit findings

- **HIGH, static rules:** `GameManager.Select`, opening `GetPossibleMoves` test, considers only ordinary one-step moves. A position with captures but no ordinary steps can falsely lose before evaluating a selected jump. Root fix: one legal-action enumerator including mandatory captures for both result checking and AI/human action selection.
- **HIGH, static turn guard:** `GameManager.Select` checks game-over but not `playerTurn` before moving a previously selected checker. `DrawManger.Select` can still leave selected state around forced/multi-jump paths. Recommended repro: click a destination during the one-second computer delay. Root fix: enforce turn ownership in the shared tile action handler and clear/lock stale selection at turn end.
- **MEDIUM, static:** forced selection adds `.selected` without deselecting another capture-capable checker; `GameManager.Select` takes the first selected DOM node, not necessarily the last chosen piece. Root fix: single model selection, or reuse `Deselect` for that branch.
- **Resolved historical findings:** current `PlaceCheckers` uses absolute row/column parity and `#hud` is above result-overlay z-index. P1b's opposite-color setup/covered Restart report is not the current implementation; native retest is still needed.

## Safe iteration

Fix legality centrally, not by excluding difficult positions from tests. Preserve forward-only men, kings and board parity. Avoid rewriting classes or changing variant rules under the name of refurbishment. Set AI inactive idempotently and cancel scheduled work in an authorized lifecycle patch. Retain all source attribution and document each rules change.

## Verification

Actually run: source/catalog inventory and inline JS syntax checks, [batch 65](../audits/games-65.md); **0 native runs**. [Historical P1b](../../audit_batches/playtest_p1b.md) recorded input failure and later source was patched; this audit does not claim that fix played successfully.

Recommended native checks: first legal light move, forced capture-only position, selecting between two capturers, chained jump, promotion, blocked-side result, clicks during AI delay, Restart with modal and keyboard cursor. Read with `git show HEAD:Games/Checkers/index.html`; Main owns native source lease/full gate.

## Future outlook

Week 1: deterministic legality/turn tests before AI improvements. Week 2: accessible square/piece labels, result focus and reduced-motion transitions. Later: bounded AI action selection instead of random retry recursion, after profiling. Defer online play and variant expansion.
