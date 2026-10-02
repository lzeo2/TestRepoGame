# Task 89: M2 asynchronous save contract review

**Proposal only. Native acceptance remains HELD.** Read-only investigation,
except this new document. No game/test changes or executions, browser sessions,
new screenshots, installs, sparse changes, registrations or push. The separate
completion contract belongs to another worker.

## Runtime identity and source limits

Requested and observed: `openai-codex/gpt-6-astra`, thinking `high`.
Environment: `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6-astra`,
`PI_REASONING_LEVEL=high`, session ID `01a0fbe6-5937-7362-9727-a4d15d9f5115`.
Session basename:
`2026-10-02T09-16-12-477Z_01a0fbe6-5937-7362-9727-a4d15d9f5115.jsonl`.
Its model-change record `96bc8074` names that provider/model; thinking record
`6746e81a` says `high`. More importantly, this worker's actual first assistant
record `c5cfbc06` reports `api=openai-codex-responses`, `provider=openai-codex`,
`model=gpt-6-astra`, `thinkingLevel=high`. Inherited dispatch labels
`SWARMFORGE_WORKER_PROVIDER=opencode-go` and
`SWARMFORGE_WORKER_MODEL=mimo-v2.6-flash` disagree; actual session execution,
not those labels, establishes the requested configuration.

Reviewed HEAD: `fcf11de7b3aa9eef3b56f41cee9dd45665b3d3f2`.
Current Foldwild tree: `a95c344888434010772c481f419cc9b933bc6dc0`;
entry blob: `9d30203739b60208468345144590cf7c39c237db`;
94 tracked files, 8,948,744 logical bytes. No runtime or M2 working-tree diff.
The inventory and [manual](../maintenance/games/unregistered-foldwild.md)
still identify tree `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`, entry
`b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`, 8,937,020 bytes. They are stale
against these committed save/render changes. In particular, the manual's
unload-save description is no longer current. Main must review/update its
manual and inventory; this worker has no permission to refresh them.

SHA-256 identities:

| File | SHA-256 |
| --- | --- |
| `Games/Foldwild/script.js` | `0a07a0aef5a8955cfe485c5614100c6d2ee14bdbdda7427a1da82870997a42ec` |
| `Games/Foldwild/world.js` | `570b96cadaf55af0b7ff265fae9e0d074b78739b1e1c8a1602db2b8f9c2262e2` |
| `scripts/test_foldwild_m2.py` | `4187de5f03366332af2eddd9bed3a61ac33c9532115ac0b2fb09435bc85c12ea` |

Completely read AGENTS, CODE_QUALITY, ponytail skill, maintenance README/manual,
polish README/input-review/core-save-fix/integration, current controller/world,
M2, core-v2, milestone, polish-save, input-audit and render-lifecycle Python
runners, world/save-v2/save-conflict/continuity pure tests, and documentation
checker. Inspected inventory's Foldwild entry, tracked shared storage callers,
entry status elements and renderer construction-error lines. Read all fourteen
`astra-polish-main-*.log` files and their results ledger. Other authored modules,
full renderer/vendor internals and GLB bytes were not reviewed in this task.
The manual's binary/provenance, campaign and hardware limits remain applicable.

## Evidence: two different failures, neither erased

Main's current results ledger `circuit-workers/astra-polish-main-results.json`
(temporary-root-relative) identifies **fcf11de**, not the older 405173d checkpoint
in integration prose. It records eleven pure suites plus focused save and renderer
fixtures exiting 0; unchanged M2 exits **1**, 27.42066107899882 seconds,
`runtime_hashes_unchanged:true`. These are read historical executions, not worker
reruns. No exact invocation envelope is encoded in that ledger; do not invent one.

Original `circuit-workers/astra-polish-main-m2-unchanged.log` is retained untouched.
SHA-256: `edc0d0feea30ac3b57ee44f3b168cb9ac62c94c3e6f575283764f9e75729f2bf`.
Its exact result object is:

```json
{
  "stages": [],
  "screenshots": [],
  "views": {},
  "errors": [],
  "failed_requests": [],
  "http_errors": [],
  "external_requests": [],
  "negative_fixtures": [],
  "passed": false,
  "storage_delta_bytes": 4096,
  "source_unchanged": true
}
```

Traceback identifies `scripts/test_foldwild_m2.py:355` calling `run()`, then
line 118 (machine-specific traceback prefixes omitted here; raw log unchanged):

```python
assert 'Progress saved' in page.locator('#message').inner_text()
```

It ends with `AssertionError`. The log does **not** capture the actual message
text or prove a failed write. Source explains the race: a completed native click
is not completion of its async handler/Web Lock. This run reaches neither
inspection nor mobile Close. Restoring the success announcement after `await`
correctly preserves truthfulness but cannot satisfy a synchronous test reliably.

Separately, [input-review](input-review.md) records the earlier unchanged M2
exit 1 at line 275: `Page.wait_for_function: Timeout 30000ms exceeded.` Four
desktop stages and mobile geometry/screenshots preceded one Close tap after
390-to-320 resize. Its separate timing-altered trace saw trusted pointer/touch
completion at Close but **no click or native close event**, leaving dialog open
and canvas in the inspector. Compatibility-click suppression's root is unknown.
Those historical baseline/trace directories and failures remain authoritative
for what they observed. A save-contract runner cannot turn them green. The
current pre-inspection failure neither reproduces nor clears that input defect.

## Shared boundary and every controller save caller

`script.js:67-102` is the sole controller write boundary; tracked search finds
one runtime `writeSave` call, at line 85. `world.js:307-327` remains synchronous:
validate/serialize, read exact primary, reject mismatched expectation without
writing either slot, rotate previous primary to backup, then write primary.
It returns null on success or an error string, not a Promise.

The controller adds asynchronous ordering: capture/validate the snapshot before
enqueueing, publish `Save pending. Keep this tab open until saving finishes.`,
chain on `saveQueue`, acquire native exclusive `foldwild-save` when available,
and perform the guarded write. Only success updates expected bytes/saved slot;
only the last successful pending job publishes `Progress saved on this device.`.
Errors latch `saveBlocked`; nonexplicit subsequent saves refuse further writes.
Even the no-lock branch uses the Promise queue, so it is not a synchronous ABI.

| Caller, current controller lines | Persistence meaning |
| --- | --- |
| `start`, 260 | Fresh expedition, including consented replacement |
| `rest` / `travel`, 318/325 | Recovery and regional position |
| `interact`, 360 | Seen encounter/dialogue state |
| `beginBattle`, 378 | Exact initial pending battle; immediate result uses settlement |
| `command`, 483 | Updated pending battle/resources; ended battle uses settlement |
| `finishBattle`, 538 | Once-only payout/capture/evolution, clear pending battle |
| `collectSupply`, 559 | Supply claim and inventory |
| `serviceAction`, 589 | Trades, cosmetics, recovery, contract, class, appearance |
| `ledgerAction`, 686 | Team, favorite and equipped accessory changes |
| `frame`, 864 | Dirty movement after one active second |
| Continue handler, 898 | Canonical resumed snapshot |
| quality handler, 923 | Render preference |
| release-confirm, 946 | Validated UID-only removal |
| manual Save, 949-953 | Requested message, awaited success announcement only |
| replacement confirmation, 980-988 | Await guarded preview-byte consent before closing/resuming |
| result Continue, 992 | Exploration after settlement |
| reduced-motion handler, 999 | Motion preference |

All nonawaiting callers legitimately mutate in-memory state before persistence;
world/battle/model readiness or `!busy` does not establish durable completion.
`localSnapshot()` synchronizes pendingBattle then validates; saving must not
advance RNG or pay rewards. Reset confirmation and preview await the existing
queue before reading exact primary bytes; reset alone does not write. Export,
file/backup preview and reload are not alternate writers. `beforeunload` only
cancels RAF/disposes view: there is no synchronous save bypass or unload promise.

Feedback is deliberately separated:

- `#save-state` is persistence status, mirrored to an open save-dialog status.
- Manual `#message` first says `Save requested. Check the local save status before
  closing.`; it announces success **only** if `await save()` returns true. Failure
  currently leaves that request message, while the save status explains refusal.
- `#render-state` retains renderer construction/lifecycle failure independently
  of ordinary messages; inspection additionally uses `#ledger-model-status`.

Do not move or duplicate failure channels merely to appease the old assertions.
No fake synchronous success, synchronous lock bypass or generic longer timeout
is justified. A later UX decision about manual error wording is separate work.

## Smallest proposed async test contract

**A separately versioned async-ABI M2 runner is justified**, subject to Main's
approval, because the old runner is explicitly frozen and both timing and status
channels changed. Prefer a plainly reviewable sibling such as
`scripts/test_foldwild_m2_async_v1.py`, based on the exact original hash above,
with only the deltas below. No test framework, runtime hooks, source-string
rewriting, monkeypatch wrapper or new state API. Reuse unchanged existing
helpers. This is an explicitly changed ABI test, never an unchanged-M2 pass.
Use separate result/image destinations so original evidence cannot be overwritten.

One small read-only persistence wait suffices, following the existing focused
save test rather than inventing a completion flag:

```python
def saved(page):
    page.wait_for_function(
        'document.getElementById("save-state").textContent === '
        '"Progress saved on this device."',
        timeout=10000)
```

Use the original M2 page's **10,000 ms** default budget explicitly, not a larger
one; retain the 420-second external bound and original 30,000 ms renderer
readiness. No sleeps, retry clicks or seed changes. A timeout or error status is
failure, never permission to proceed. Do not assert that pending must be observed
in ordinary fast saves: it can complete between harness calls. Pending truth is
already exercised by the separate native-lock fixture, not by adding artificial
contention/instrumentation to M2.

The status wait is valid immediately after these UI mutations because `save()`
sets pending synchronously before enqueueing. Do not reuse an old success label
as proof of an unrelated export/import action; export also writes status text.
For persistence checks keep the exact stored-state assertions after the wait;
a message alone never proves correct bytes. Add no wait to the mobile input
sequence, especially between orbit, resize, screenshot, single tap and ready.

### Exact M2 assertion map and proposed deltas

Line references are to the unchanged original.

| Original lines / assertion | Proposed async contract |
| --- | --- |
| 116-119, explicit Save and unchanged state/RNG | Preserve `before`, click once, call `saved(page)`, then bounded `wait_for_function` for `#message` exactly `Progress saved on this device.` (10,000 ms). Keep the original success substring assertion and **entire** `snapshot(page)['state'] == before` assertion. Waiting for the message too avoids assuming the awaiting handler's continuation has already run when status is seen. |
| 160-169, weakened battle persisted before reload | Keep round 2, result-null, capture-enabled and busy checks. Insert `saved(page)` before the existing exact `json.loads(raw(page))['pendingBattle'] == pending`. Preserve exact battle/RNG/log/resources/effects/profile equality after Continue. |
| 90-95, `reload_continue` | Before `page.reload()`, wait saved; after Continue and unchanged `ready(page, mode)`, wait saved before dependent persistence assertions or another reload. This does not add a gameplay action or promise unload persistence. |
| 174-184, up to six original seeded capture commands | Keep the original loop bound, each command and `!busy` wait; do not add attempts. After each command settles, wait saved before either checking exact stored pending battle or taking the result branch. Keep captured Budriv, pending-null in memory **and storage**, and all original outcome assertions. |
| 185-197, settlement and two ended reloads | Keep `settled` and exact full-state equality on both reloads. The helper's saved wait prevents an outstanding Continue write being discarded; it must not permit another payout, resource normalization waiver or reduced comparison. |
| 202-215, remove/favorite/unfavorite/accessory; cancel/Escape bytes | After the last accessory change/inspection readiness and **before** `old = raw(page)`, wait saved to drain these actual queued mutations. Then keep both cancel/Escape byte-equality assertions immediate and unchanged. No wait after cancellation to hide an unintended write. |
| 216-229, confirmed release and `fixture_raw` | Keep immediate UID-removal, retained history, all eight resource/progress-key comparisons, canvas/dialog/preview assertions. Wait saved after the release before collecting `fixture_raw`; fixture must represent the persisted released state, not an earlier queued snapshot. No extra Save click. |
| 303-312, quota fixture | Same stored fixture, throwing `setItem`, Continue and one manual Save. Replace obsolete `#message` contains `Save unavailable` with bounded wait for `#save-state` containing **both** `Could not write Foldwild save:` and `Fixture quota exhausted`. Assert save status visible, no `Progress saved` in `#message`, and retain exact `raw(page) == fixture_raw`. Continue may already have failed; blocked manual Save must still expose that failure, not pass from generic non-success text. |
| 313-325, storage plus WebGL denial | Same fixture and inputs. Wait at most 10,000 ms for save status containing `Could not write Foldwild save:` and `Fixture storage denied`; assert visible and no manual success. Assert `3D view unavailable` in visible **`#render-state`**, not `#message`. Retain phase-world/view-null, live ledger's `3D view unavailable` assertion and exact primary-byte preservation. No renderer `ready` call for intentionally absent WebGL. |
| 326-335, corrupt primary/reset cancellation | Retain hidden Continue, one Start, Cancel, exact `{broken` bytes and preserved warning. Cancellation initiates no save: no success wait belongs here. |
| 233-300, mobile and delayed-loader cases | **No persistence or input changes.** Preserve 390px finger orbit, world yaw/pose, 320px resize/render width/heading/center-hit/44px/overflow checks, single native Close tap, original `ready`, same canvas/model/cache/reference/fallback limits, and delayed-load nonresurrection. |

Do not weaken final empty error/request arrays, source-hash equality, model
budgets, immutable snapshot checks, release guards or retained history. Separate
feedback channels must each be asserted, not replaced with an OR that allows one
failure to disappear. The negative storage tests must not treat a pending label
or any generic error as confirmation of their specific injected failure.

The old quota test guarantees primary-byte preservation, not two-key atomicity.
The focused save test/pure suites explicitly cover the stronger conflict and
quota-before-write guarantees, and the weaker primary-only quota ceiling: backup
may have rotated. Retain those distinctions; do not promise both slots are always
unchanged. Web Locks serialize cooperating controllers only; no-lock fallback,
noncooperating writers and unload loss remain disclosed limitations.

## Logs, verification and holds

All logs were read, not rerun. Under temporary-root-relative `circuit-workers/`:
`astra-polish-main-{data,regions,economy,builds,battle,battle_v2,world,save_v2,continuity,cap_xp,save_conflict}.log`
report pure checks; `astra-polish-main-polish-save.log` reports focused ordinary
save stages and labeled negative fixtures; `astra-polish-main-render-lifecycle.log`
reports negative renderer fixtures; `astra-polish-main-m2-unchanged.log` is the
failed full M2. Ledger SHA-256:
`29652a8b89f144212d199df534c126e12a2ac4833d5bc425c2595048553f93fe`.
Focused-save log SHA-256:
`77357aa096c692d14911c5b9a1fec275f66d211aa311b9ba281f8238384f1653`.
Renderer log SHA-256:
`68357ed74d6e31bd4ca3058bb717efe352b0e63b99883e4dcea88a5c5a4731ae`.

Actual worker commands before this document was written:

- Owned-path absence check: exit 0; no existing report overwritten.
- `git diff HEAD -- Games/Foldwild scripts/test_foldwild_m2.py`: exit 0, no output.
- `git diff --check`: exit 0, no output.
- `python3 -B scripts/check_maintenance_docs.py`: exit **1**,
  `AssertionError: Inventory stale: inspect changes, then run --refresh.`
  This is a documentation check, not a game test. No refresh attempted.
- `df -h / | tail -1`: exit 0, 2.2G available; `df -B1 / | tail -1`
  recorded 2,328,080,384 available bytes before writing. Above the 2 GB floor.
- A combined inventory/list inspection printed a harmless `wc` unmatched
  `scripts/test_foldwild*.js` diagnostic: actual pure suites use `.mjs` and were
  subsequently located/read. It was not a test result.

After writing this report, the scoped `git diff --check` exited 0 and the
maintenance checker again exited 1 with the same stale-inventory assertion.
Free space remained 2.2G (2,327,916,544 bytes), a shared-filesystem decrease of
163,840 bytes since the recorded prewrite sample, not exclusive worker usage.

No native/pure/full-catalog test was executed by this worker; fresh gate passes
**0**, screenshots **0**. Existing catalog remains 115 registered games; Foldwild
is unregistered. No ingested or self-made game added. The only pre-existing dirty
paths observed were Main's `docs/new-games-plan/collection-heist.md` and
`docs/new-games-plan/tycoon.md`, neither modified nor staged here.

Holds: Main's approval/implementation and fresh frozen-source execution of any
versioned ABI runner; unchanged M2 still failed; unexplained single-touch Close;
stale manual/inventory; subjective desktop/mobile review; complete campaign,
class ranks, natural acquisition/evolution and accessory fit; physical input/N100,
rights, registration/publication and full-catalog release gate. A future async
runner failure at Close must be reported as failure, not bypassed with another
tap, mouse substitution, extra wait, debug state or instrumentation. Even a future
async-runner pass is distinct evidence requiring explicit gate disposition; this
review grants no acceptance or release authority.
