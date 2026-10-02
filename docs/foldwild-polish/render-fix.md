# Delegation 81: renderer lifecycle implementation

Actual worker: `openai-codex/gpt-6-astra` (environment verified). Owned paths:
`Games/Foldwild/view.js`, `scripts/test_foldwild_render_lifecycle.py`, this report.
Main owns controller integration, design, images, manual/inventory updates and
acceptance. No other paths edited. Concurrent world/battle changes are other
workers' work, not stable whole-game evidence.

## Read and demonstrated shared roots

Completely read AGENTS, CODE_QUALITY, maintenance README, full Foldwild manual,
polish README and gameplay/UI/input reviews; full current view/controller and
existing `test_foldwild_view_v2.py` / `test_foldwild_inspection.py`. Traced every
tracked createView/showWorld/showBattle/showInspection caller, acquire/release,
generation/reset/dispose, controller frame and inspection restoration. Inspected
THREE's context listener/recovery/disposal boundary, not its entire vendor source.
Initial inventory tree/entry matched Git: `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`
and `b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`.

A separate loopback-8822 negative baseline probe served the pre-edit Git view
through an in-memory Playwright route, without changing files. Actual output:

```text
BASELINE NEGATIVE OBSERVATION: context lost, no authored status/disclosure, frames incremented to 1
BASELINE NEGATIVE OBSERVATION: deferred model still unsettled after 20100ms, no pendingModels status
BASELINE CLEANUP: browser closed; loopback 8822 stopped
BASELINE_PROBE_EXIT=0
```

The shared boundaries, not individual world/battle/ledger workarounds, are fixed:

- Context lost/restored listeners disclose loss; lost render calls do not inflate
  frames. Native THREE recovery reuses the same renderer, canvas and CPU models.
  Restored means `restoring` until the next renderer call completes, then
  `available`. It does not mean pending/failed models loaded. Failure markers
  stay failures across recovery. No forced automatic reload or save mutation.
- Every acquisition has a fixed native 20,000ms deadline. Rejections/timeouts
  remove the failed cache entry and retire its resources. Concurrent consumers
  share that promise/deadline. Late results after cancellation/timeout are
  disposed, never attached. No timeout setting, replacement loader or dependency.
- Existing generation/closed-slot guards prevent stale attachment. Legitimate
  zero-reference loaded bases remain in the existing 12-entry LRU until eviction.
  Retired zero-reference pending entries cancel their timer/promise; late loader
  results still dispose. GLTFLoader has no abort API: cancellation settles view
  work, not the underlying network/decode operation. Timers may be throttled by
  the browser in a background document; the foreground check uses real time.
- Failure/pending diagnostics derive from current slots, not a historical failure
  Set that survives removal of the failed actor. Failed source models remain
  visibly disclosed as markers, never counted as loaded originals.

## ABI and Main integration instructions

Existing `createView(canvas, options)` callers remain valid. Optional
`onDiagnostic(status)` receives a frozen object on changed presentation status:

```js
{ contextStatus: 'available' | 'lost' | 'restoring',
  pendingModels: ['species-id'], fallbackModels: ['species-id: reason'],
  message: 'displayable diagnostic, or empty string' }
```

Both arrays are frozen and deduplicated. These fields are also present in the
read-only `inspect()` result. `loadedModels` continues to count attached CPU
source models, not certify a working WebGL context. Combine it with context
status when displaying readiness. Construction failure still throws as before.

Main should supply a synchronous nonthrowing callback writing `status.message`
via textContent into a separate persistent, visible status region (including
inspection/battle), and remove the controller's failed-model guard on ordinary
`message()` updates. Keep construction failure disclosure separate too. Do not
set permanent `viewFailed` on transient context loss or create another renderer.
Inspector readiness copy must consult context and pending/fallback status, not
only loaded count. Show reload advice when context stays lost; do not silently
reload and risk unsaved progress.

Without a callback the view retains direct `#message` diagnostics, including
pending loading and loss. Loss is reasserted on attempted render while lost;
clearing only removes text still equal to its own previous message. Thus the
old controller remains supported, but fully independent action/error messages
are a next-wave controller integration requirement, not claimed complete here.
The older accessory-surface warning in `cosmetic()` is unchanged and still writes
directly; Main can include that separate warning in subsequent shell integration.
No pointer/touch handlers or game state were changed; the existing sole RAF stays
controller-owned. This patch does not diagnose or repair missing mobile Close
compatibility click.

## Actual foreground verification

Command:
`timeout --signal=TERM --kill-after=5s 90s python3 -B scripts/test_foldwild_render_lifecycle.py`.
Installed Chromium/Playwright, dedicated loopback 8822, no screenshots/files.
First execution exited **1**: Playwright awaited an assigned deferred Promise,
so the pending assertion ran after its timeout. Corrected the harness expressions
with `void 0`, not runtime deadlines or production input. Its finally cleanup ran.
Second execution exited **0**, actual output:

```text
PASS negative fixture: real context loss/restoration, reparenting, retained CPU model and separate diagnostics
PASS negative fixture: shared rejection and honest fallback after context recovery
PASS negative fixture: actual deadline 20004ms; late result disposed, not attached
PASS negative fixtures: stale generation, 12-entry eviction, pending disposal and exactly-once late cleanup
PASS compatibility: direct fallback, callback action separation, one canvas; no console/page errors or external requests
CLEANUP: browser closed; loopback 8822 server stopped
LIFECYCLE_EXIT=0
```

This is explicitly a negative renderer fixture, not ordinary gameplay. It loads
one actual Cindupp model, uses WEBGL_lose_context for real loss/restoration before
and after reparenting, and replaces loader promises in the in-memory harness for
labeled deferred/rejected/resource-disposal cases. No source/vendor replacements
are committed and no game-state setter exists. No assertion uses repeated input,
changed M2, time inflation or a fake clock. Renderer frames are manually invoked
in this isolated fixture, not a new runtime RAF. Text/button gameplay is left
untouched; full controller usability during loss still needs Main's integration
and ordinary-input verification.

Other actual checks:

- `node --experimental-default-type=module --check Games/Foldwild/view.js`: exit 0.
- Python stdlib AST parse of new regression: exit 0, `PASS: Python AST syntax`.
- Owned-path `git diff --check`: exit 0.
- Catalog JSON/unique IDs/tracked URL check: exit 0,
  `PASS: 115 catalog IDs unique and URLs tracked; no games added`.
- `python3 -B scripts/check_maintenance_docs.py`: exit **1** before commit:
  `AssertionError: Commit inspected source changes before validating its inventory.`
  Main must update the Foldwild manual and refresh inventory after integrating
  source milestones, then rerun; those files are outside this assignment.
- `ss -ltn '( sport = :8822 )'`: exit 0, header only, no listener after cleanup.

Fresh lifecycle fixture passes: **1**; ordinary-input/full-M2 acceptance passes:
**0**; full-catalog gate passes: **0**. No native-input acceptance was attempted
while other modules changed. Original M2 Close hold, whole-game/full-polish,
all-80 acquisition, N100 and rights/publication gates remain held/unverified.
No games, catalog edits, model/color/vendor changes, dependencies, installs,
protected changes, sparse-lease changes or push. Scratch/evidence files and
screenshots: **0 bytes**; only three owned source/test/report files grow. Disk
reported **2.4G free** before/after, no exclusive shared-filesystem delta claimed.
The test browser and bounded server close in finally on both pass and failure.
