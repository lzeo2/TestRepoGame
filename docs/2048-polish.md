# 2048 polish checkpoint: unaccepted

Task107 genuinely delegated the existing MIT port, not a new original game or replacement. Its worker timed out with **exit143**, no reply, report or commit. Main inspected and preserved the partial edits rather than discarding sibling work. Registration and release remain held.

## Changes and trust boundary

Four authored files changed: `index.html`, `style/main.css`, `js/local_storage_manager.js`, `js/game_manager.js`. Upstream engines, input/Grid/Tile, MIT notice and assets remain unchanged. Source pin and original attribution remain in [the port record](ports-2048.md). No downloaded art/fonts, new dependency, copyright clearance or source-license replacement.

The patch enables zoom, adds an accessible persistence status, corrects score-label/message-action contrast, guards storage reads/writes, validates a bounded4x4 board before construction and compares previously read slot bytes. Existing `gameState` and `bestScore` keys remain; corrupt/conflicting bytes block automatic writes. Memory-only play is explicitly labeled. Best scores/unrelated keys are preserved during scoped recovery. `keepPlaying` now persists its changed flag immediately.

This is a **partial repair**, not established correctness. Its blocking `window.confirm` reset remains subject to the modal/cross-tab ordering concern found independently in Garage Borough. Exact-byte checks are best-effort, not atomicity, ABA or noncooperating-writer protection. The raw guard counts8192 characters, not a general8192-byte UTF-8 guarantee. The current loss composition check does not pass; do not weaken its assertion or inflate waits.

## Retained failures

The worker left `scripts/test_2048_polish.py`, separating ordinary keyboard/genuine touch/reload/reset-cancel from injected negative and preterminal composition fixtures.

- `task107-native-1.log`: ordinary groups reached storage faults, then failed `.tile-4` assertion. The later test distinguishes initial denied getter from restored-board cases; this does not retroactively pass the first attempt.
- `task107-native-2.log`: ordinary and negative groups reached preterminal composition, then failed `.game-over` readiness with **`Timeout30000ms exceeded`**. No terminal loss/retry acceptance, full suite pass or final worker exit0 is claimed.
- Both log files remain outside Git. The worker deadline exited143. No third native attempt, registration or push followed. Escalation ticket `pi-912882-1790950284367` is pending.

Main's syntax/AST/whitespace checks are recorded in the car integration checkpoint. They do not replace either failed browser run. Main did not personally inspect the2048 captures in this checkpoint.

## Next bounded work

Trace the loss fixture through restored Grid and move/actuate; distinguish fixture defects from game/storage behavior. Investigate consent with a nonblocking native dialog and real concurrent writer, without sleeping around a modal race. Keep negative/composition results distinct from a naturally earned2048 win. After demonstrated root fixes and authorized bounded QA, update the exact maintenance manual and inventory; no ID is reserved here. Hextris's executable-save parser remains a separate hold, not fixed by this work.
