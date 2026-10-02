<!-- maintenance-game: Games/2048 -->
# 2048 maintenance

## Identity and status

**Unregistered**, no current catalog id/category; entry `Games/2048/index.html`. Baseline `8c8a055`: 13 files, 48,584 bytes. Do not confuse it with another registered tile-merging game or allocate a historical id. This is a local Gabriele Cirulli-style source tree with current MIT notice. Documentation does not authorize registration. Dated Task107/Main checkpoint602f76a changes four authored files and leaves an unaccepted runnable browser check; current pins/counts are in the inventory. See [partial-polish evidence](../../2048-polish.md).

## Implementation map

Source review coverage: complete entry, all ten `js/` files, full `style/main.css` and `LICENSE.txt`. No binary/minified engine remains unreviewed in this assigned tree. HTML loads bind/classlist/RAF polyfills, input manager, DOM actuator, Grid/Tile, storage manager, GameManager and application in order. `application.js` schedules construction of `GameManager(4, KeyboardInputManager, HTMLActuator, LocalStorageManager)`.

`GameManager.move()` obtains direction vectors, traverses farthest-first, merges matching tiles once via `mergedFrom`, adds score, spawns a new tile only when moved and checks remaining moves. `Grid` owns bounds/serialization and tile cells; `Tile` owns position/value/previous-position data. `HTMLActuator` renders `.tile-container`, `.score-container`, `.best-container` and `.game-message` using textContent and RAF updates. CSS has 500px desktop and 280px mobile boards plus reduced-motion overrides.

## Gameplay and controls

A four-by-four grid starts with two random tiles; new tiles are 2 with 90 percent probability, otherwise 4. Source-proven keys: arrows, W/A/S/D, Vim K/L/J/H, and R restart. Swiping the board uses a ten-pixel threshold and dominant direction. New Game and Try again restart; Keep going continues after reaching 2048. Matching values double and score their merged value. No moves sets loss; 2048 sets win, with optional continued play. No sound or continuous simulation loop exists.

## State and persistence

GameManager owns grid, score, `over`, `won` and boolean `keepPlaying`. The prototype method shares the `keepPlaying` name, but the listener binds it **before** setup creates the instance boolean, so that naming is not itself a current callback failure. `LocalStorageManager` retains generic **`bestScore`** and **`gameState`** keys; checkpoint602f76a removes the destructive support probe/fakeStorage in favor of guarded real operations, explicit memory-only status and a bounded4x4 pre-construction validator. Same-read bytes are compared before writes; corrupt/conflicting slots block automatic persistence. GameManager still plays in memory on errors; #save-status never claims those moves persisted. Loss/restart preserves bestScore. Scoped recovery uses blocking confirmation, whose concurrent-writer ordering remains held; exact-byte checks are not atomic. Keep-going now actuates its flag immediately. The current loss composition check fails, so this patch is not accepted.

## Dependencies and provenance

[LICENSE.txt](../../../Games/2048/LICENSE.txt) grants MIT terms, copyright 2014 Gabriele Cirulli. Entry credits Cirulli and 1024 by Veewo Studio. No CREDITS/source pin or verified upstream URL is shipped in this directory; do not invent a revision or use familiarity as evidence of byte-identical upstream. Runtime references are local scripts/CSS and root favicon; font uses a system stack. [The port record](../../ports-2048.md) supplies upstream `gabrielecirulli/2048` pin `478b6ec346e3787f589e4af751378d06ded4cbbc` and ingestion02a2765. Documentary provenance does not prove fresh byte identity or blanket asset rights.

## Audit findings

- **HIGH**, `js/local_storage_manager.js`, `getGameState`: unguarded `JSON.parse(stateJSON)` and `GameManager.setup`/`Grid.fromState` unchecked shape can abort startup on corrupt same-origin data. Recommended repro: set `gameState` to malformed JSON, then reload; repeat valid JSON with missing grid cells. Minimal root fix: parse/schema-check once in storage restoration and fall back to a fresh game without destroying best score.
- **MEDIUM**, same manager's generic keys: other same-origin pages can collide with saves. Repository-wide consumer trace is needed before migration. Introduce game-scoped keys with validated one-time legacy import only under runtime authorization.
- **MEDIUM**, entry viewport `user-scalable=no`: browser zoom is disabled despite native-readable DOM content. Remove zoom restriction; verify board layout rather than shrinking labels.
- **CURRENT HIGH/HOLD**, checkpoint602f76a: storage validation, zoom and contrast repairs exist but the second native attempt times out on preterminal `.game-over`. Blocking consent also needs the real cross-tab check prompted by Garage's failure. Old recommendations above describe the baseline; do not report them as unchanged or the successor as accepted.
- Non-finding: actuator tile values use textContent, not user-controlled HTML; score/message strings are constructed internally. No XSS claim is made from generic DOM manipulation.

## Safe iteration

Patch restoration at LocalStorageManager, shared by startup/restart, rather than add defensive checks in every grid method. Preserve farthest-first traversal, once-per-move merging, probability, keep-going behavior and MIT notice. Do not register or replace the game to satisfy counts. Save migration must back up/validate legacy data and have a rollback plan; do not clear unrelated origin storage.

## Verification

Actually run: all ten JS files passed Git-blob STDIN `node --check`; native/browser tests **zero**. Repeat `git show HEAD:Games/2048/js/game_manager.js | node --check`. Main owns a narrow source lease for recommended checks: deterministic pair/triple/four-tile merges, no-op move without spawn, keyboard/swipe, winning/keep-going, loss/restart, reload persistence and corrupt/denied storage. Unregistered games are not exercised by the full registered-catalog gate. Later Task107 ran two failed native attempts: first `.tile-4` assertion, second loss readiness `Timeout30000ms exceeded`; worker timed out143 without commit/report. Main inspected/checkpointed its edits, owned JS syntax and test AST pass, but ran no third browser attempt. Ordinary/negative/composition groups in those partial logs are not a whole-suite pass or natural2048 win. Escalation `pi-912882-1790950284367` is pending.

## Future outlook

First diagnose the current loss fixture through restored Grid/move/actuate and consent concurrency without weakened assertions or timing workarounds. Recheck ordinary keyboard/swipe and negative recovery after a demonstrated root fix. Keep generic keys until a consumer trace permits migration. Contrast/zoom edits need accepted fresh review before registration. A new engine, extra board sizes and broad CSS redesign are deferred.
