# Delegation 82: guarded controller saves and local recovery

Actual worker environment: `openai-codex/gpt-6-astra`. Checkpoint implementation,
**not accepted full polish**. Owned paths: `Games/Foldwild/script.js`,
`index.html`, `style.css`, `scripts/test_foldwild_polish_save.py`, this report.
Main owns direction, images, integration, manual/inventory and acceptance.

## Review and boundary

Read AGENTS, CODE_QUALITY, maintenance README, complete Foldwild manual, polish
README and all three input/gameplay/UI reviews, save-fix and render-fix ABI
reports. Completely read actual controller, world, entry and CSS; relevant native
core-v2/milestone helpers/suites and pure save_conflict/save_v2/continuity suites.
Tracked caller search found only startup readSave and shared controller save as
runtime storage callers. Traced all shared save callers through autosave,
Continue, preferences, manual save, reset, services/ledger, battle commands and
settlement. Renderer ABI report was read; full current view/vendor internals and
original binary models were not re-reviewed in this task.

Initial source was stable at `c4dfad0`, following `d8293ed` and `2268982`.
Current tree was `9c58cc52f0a0bd27347344fde2ad2b89a75b75d6`, entry
`b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`. Inventory still described prior tree
`e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`; this expected implementation staleness
is not acceptance. Main must update its owned manual/inventory after integration.

## Runtime contract

- Startup uses `readSave(undefined, true)`; expected bytes are the exact initial
  raw read. Unknown raw on denied storage is never treated as an absent slot.
- Every write uses shared asynchronous `save()`, a same-tab Promise queue and,
  when available, native exclusive Web Lock **`foldwild-save`**. No additional
  storage key, schema/version, dependency or remote request exists.
- Each caller captures and validates its canonical snapshot before enqueueing.
  Queue jobs use the last successful expectation, avoiding self-conflict between
  queued snapshots. Successful expected bytes come from that exact serialized
  snapshot, not a later primary reread. Errors never advance the expectation.
- Conflict/error stops further automatic writes, retaining the original
  expectation. The user can export this tab, reload the stored run, or preview
  an explicit replacement. A replacement carries the reviewed raw bytes into
  the guarded write; a later primary change requires a fresh decision.
- Reset consent likewise captures exact primary bytes. Returning to the menu
  does not delete a key or write a placeholder; the subsequent fresh run saves
  with the consented expectation. Corrupt primary replacement still rotates
  exact corrupt bytes into backup. Denied raw disables replacement confirmation.
- Pending is reported until the actual locked write completes. No synchronous
  unload bypass exists: unload only stops RAF/disposes the renderer. **Unsaved or
  queued work may be lost on close.** Visible copy requires waiting for saved
  status, and explicitly says unload does not save.
- Without Web Locks the visible disclosure and `ponytail:` comment state the
  optimistic, non-atomic ceiling and recommend one tab. Locks serialize only
  cooperating current controllers; older/noncooperating writers and ABA changes
  are not protected by that protocol.

## Exact new shell controls

`#save-tools` is outside hidden menu/world/battle layouts. The existing unique
`#save-state` moved here from collapsed world Field record. `#save-coordination`
is always displayed; `#render-state` separately retains renderer diagnostics and
initial WebGL construction failure while ordinary action messages remain usable.
The view receives its existing `onDiagnostic` callback. No fake 3D fallback is
claimed: native controls still operate when WebGL construction is denied.

Inside native Save files and recovery details:

- `#save-export`: canonical local in-memory snapshot (or valid loaded menu slot)
  through `validateSave`, actual JSON Blob download `foldwild-save.json`, temporary
  anchor removed and ObjectURL revoked after dispatch.
- `#save-file`: local file input. Rejects `File.size > 256 * 1024` **before**
  `.text()`, then reuses `readSave(adapter)` for strict validation and UTF-8 size.
- `#save-backup`: explicit validated `BACKUP_KEY` preview through readSave adapter;
  no automatic primary fallback.
- `#save-replace`: preview this tab as replacement; `#save-reload`: native confirm
  before reload, explicitly warning about unsaved progress.
- `#save-dialog`: native modal freezes game input via existing modal guard;
  `#save-preview` describes incoming/stored/local runs and backup rotation;
  `#save-primary-bytes` is a read-only exact-byte textarea; `#save-dialog-status`
  reports pending/errors; `#save-confirm` and `#save-cancel` commit or cancel.
- Existing reset dialog adds `#reset-preview` and `#reset-primary-bytes` with the
  same exact-byte consent. Existing collection-click/touch handlers and CSS
  gesture policy were untouched.

Visible status is outside world HUD in all controller phases and renderer
failure. Native modal backdrops still cover the underlying shell; replacement
has its own status mirror. Main should judge modal/320px visual integration and
all-phase discoverability; no image or accessibility acceptance is claimed.

## Known quota ceiling and escalation

The unchanged world ABI writes backup before primary. If backup succeeds and
primary then throws quota, primary remains intact but an older backup has already
rotated. It cannot promise a two-key transaction. No remove/clear/rollback that
could destroy an absent backup was added. Error copy explicitly discloses this
ceiling. Thus the requested guarantee that **both** bytes remain identical for
all quota failures is **not satisfied** by this checkpoint.

Escalated interpretation to Hermes ticket `pi-1312746-1790928325843`; no answer
received during the bounded task. The focused test includes separate quota-before-
write and primary-only quota cases, but execution did not reach their assertions
(see below). Existing pure save suites do pass their documented primary-only
quota/backup-rotation cases. Do not mislabel those as both-slot atomicity.

## Actual verification, including two failures

Command twice, dedicated loopback 8823, installed Chromium/Playwright:

```sh
timeout --signal=TERM --kill-after=5s 180s python3 -B scripts/test_foldwild_polish_save.py
```

Both foreground exits were **1**. Both printed these seven stage results before
the separately labeled platform fixture failed:

```text
PASS ordinary tabs: fresh/manual/Continue/walk; stale Save and unload preserve both slots
PASS native lock queue: pending truthful, snapshots ordered, no self-conflict
PASS ordinary pending battle: real Blob JSON export, import cancel/confirm, exact next-command replay, explicit backup recovery
PASS negative file fixture: corrupt, both slots untouched
PASS negative file fixture: oversized, both slots untouched
PASS negative file fixture: unsupported, both slots untouched
PASS ordinary replacement race: consent bound to exact previewed primary
```

1. First failed in negative initial-WebGL-denial fixture: attempted Rest before
   walking to camp, so the legitimately disabled button timed out. Corrected the
   new test to walk via the ordinary camp marker first, using the existing helper.
2. Second passed that ordinary fallback walk/rest and initial denial/no-lock
   assertions, then failed while installing the quota fixture. Playwright invoked
   the function returned by an assignment expression, immediately throwing
   `Page.evaluate: QuotaExceededError: quota fixture`. Corrected fixture setup to
   a block-bodied arrow returning undefined; **not rerun** after two failures.

Escalated two-failure stop to `pi-1312746-1790928862720`. No third native attempt,
no weakened original assertion and no M2/core-v2/milestone test edits. The final
new suite still needs a fresh run: remaining primary-quota, corrupt-slot and
denied-read native assertions are **unverified**. Ordinary stage results are
partial evidence, not a complete focused-suite pass. Both finally blocks printed
`CLEANUP: browser closed; loopback 8823 stopped`; subsequent `ss` showed no listener.
No positive state grants/debug mutations were used. Platform/storage shims are
explicit negative fixtures; the ordinary run exported its real pending battle.

After runtime edits, unchanged pure suites all exited **0**:

| Suite | Actual output digest |
| --- | --- |
| save_conflict | PASS: optimistic expected-null/bytes writes; stale primary AND backup preservation; exact raw metadata; legacy/pending replay; negative fixtures |
| save_v2 | PASS: v1 migration; strict v2 validation; no reload restock; scoped rotating backup, quota and UTF-8 preservation |
| continuity | PASS: exact action/RNG replay; missed capture; five trials; immutable release guards/history; scoped backup/quota preservation |

`node --experimental-default-type=module --check Games/Foldwild/script.js`: exit 0.
Python stdlib AST: `PASS Python AST`. Catalog check: `PASS catalog: 115 unique IDs,
tracked URLs`. `git diff --check`: exit 0. Added-load review: only local Blob URL
for export, no new network loader. `python3 -B scripts/check_maintenance_docs.py`
exited **1** before commit: `AssertionError: Commit inspected source changes
before validating its inventory.` Main must refresh only after manual review.

## Handoff and holds

Fresh complete focused native passes **0/2**; partial ordinary save stages passed
twice. Pure checks **3/3**. Full M2, full-catalog, core-v2 and milestone acceptance
passes **0** in this task; optional courtesy suites were not run. Original M2
missing compatibility click/root cause remains held, untouched. All-campaign,
real N100, rights, hardware, publication and registration holds remain.

No screenshots (0 bytes); native output returned in foreground transcript, no
scratch log/image files retained. Download is browser-managed and removed with
its context; source/test/report additions only. Disk displayed **2.4G free** before
and after, no measurable exclusive shared-filesystem delta claimed. No sparse
change, installs, original model/color edits, additions (ingested or self-made),
new IDs or push. Catalog stays 115; Foldwild stays unregistered. Concurrent
untracked `docs/new-games-plan/` belongs to another worker and is not staged here.
