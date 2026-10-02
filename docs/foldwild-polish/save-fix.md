# Foldwild optimistic save boundary, delegation 80

Implementation only. Actual environment: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6-astra`. Owned paths are `Games/Foldwild/world.js`,
`scripts/test_foldwild_save_conflict.mjs` and this report. No controller edits.
Main retains design, integration, native acceptance and subjective images.

## Source review and root

Completely read AGENTS, CODE_QUALITY, maintenance README, full Foldwild manual,
polish README and gameplay/UI/input-review reports; actual `world.js`, all of
`script.js` and the world/save_v2/continuity suites. Tracked caller search found
only controller startup `readSave()` and shared `save()` -> `writeSave(state)`
outside the tests. Traced save callers including battle entry/commands/settlement,
Continue, movement autosave, recovery, services, ledger/release, preferences,
manual Save and unload. No alternate writer was found. Other simulation modules,
renderer, vendor and binary internals were not fully reviewed in this task.

Initial Git Foldwild tree `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9` and entry
`b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a` matched maintenance inventory
(94 files, 8,937,020 bytes, unregistered). This initial identity is not frozen-source
acceptance while implementation workers write.

The proven root is the unconditional primary write after backup rotation.
The new pure regression first demonstrates the unchanged unguarded API replacing
score 250 with the stale initial snapshot. The guarded path rejects that same
stale expectation before either `setItem`, including repeated attempts that would
otherwise destroy the newer backup. No save schema, keys, validator rules,
migration, pending battle/RNG, stats, actions, evolution or model bytes changed.

## Exact additive ABI for Main

- `readSave(storage)` and `readSave()` still return exactly `{ state, error }`.
- `readSave(storage, true)` additionally returns `raw`, captured from the **same
  primary getItem** used for parsing. Use `readSave(undefined, true)` for browser
  storage. `raw === null` means absent; a string is the exact original value,
  including whitespace, legacy encoding or invalid JSON. If access throws
  before retrieval, `raw === undefined`; this is NOT an absent slot or permission
  to overwrite. Errors still return `state: null`. No backup fallback occurs.
- `writeSave(state, storage)` / `writeSave(state)` retain their old unguarded
  behavior and return `null` on success or an error string. These legacy calls
  are intentionally NOT protected until controller integration.
- `writeSave(state, storage, expectedPrimary)` opts into the optimistic guard.
  Pass `undefined` for storage to use localStorage. The third argument must be
  exact observed string bytes or `null` to require absence. Explicit `undefined`,
  numbers and objects are errors, not an opt-out. Omit the argument entirely
  only for the legacy contract.
- On mismatch, the exact return is
  `Foldwild save conflict: primary changed; primary and backup preserved.`
  Neither primary nor backup is written. Desired state matching current bytes
  does not bypass a stale expectation. On matching bytes, ordinary validation,
  serialization and backup-before-primary behavior remain unchanged.
- Quota/denial are errors, not successful persistence. Backup failure stops the
  primary write. If backup succeeds but the primary write fails, primary is
  unchanged and backup contains those prior primary bytes, as before. This is
  not a two-key transaction or a promise to retain an older backup on quota.

Controller integration next wave:

1. Initialize the expected value from `readSave(undefined, true).raw`, never from
   serializing its migrated `state`. Preserve current unreadable-slot consent
   handling. Unknown raw after access denial must disable guarded saving.
2. Route EVERY write through shared `save()` with that expectation, including
   movement and unload. On conflict keep the old expectation, stop automatic
   retries and surface a visible reload/explicit-replace choice. Do not silently
   refresh the expectation and retry the stale snapshot. Continue must not
   silently pair stale `savedSlot` with newly observed primary bytes.
3. For a successful guarded write, the next expectation is
   `JSON.stringify(validateSave(theExactSnapshotPassedToWriteSave))`; capture the
   canonical snapshot/serialization for this synchronous attempt, then retain
   those bytes only on success. Do not re-read storage afterward and adopt a
   different tab's value. Initial/replacement observations still use raw bytes,
   not reconstructed state. Never advance expectation on failure.
4. Explicit replacement consent must refer to the primary bytes reviewed by
   the user. Write the chosen validated state with those exact expected bytes;
   if the slot changes again, require a new decision. Preserve corrupt original
   bytes in backup via the existing boundary; do not remove either key first.
5. The check is optimistic, NOT atomic across processes: two writers can both
   read the same value before either writes. It also cannot detect an ABA
   change returning to identical bytes. The `ponytail:` comment marks this
   ceiling. If race-free cooperating tabs are required, controller-owned native
   Web Locks must serialize all cooperating read/check/write paths; unload must
   not bypass that protocol. No lock or browser coordination was added here.

## Requested import/export/recovery follow-up

No new parse/export/recovery exports were needed. The existing world suite locks
the export surface; reuse existing boundaries rather than add unused APIs.
For a local text preview, `readSave({ getItem: () => text })` already invokes
`sizeCheck` on original UTF-8 bytes, JSON parsing and strict `validateSave` before
any write. An explicit backup preview can similarly supply an adapter whose
`getItem` reads `BACKUP_KEY`; do not change normal primary-read fallback policy.
Export a validated snapshot via `JSON.stringify(validateSave(snapshot))`; the
validator already checks canonical serialized size. Controller file reading,
preview/errors, local download and explicit replacement consent remain pending.
Import errors (corrupt, oversized, unsupported version) must end before invoking
`writeSave`; a successful preview is not consent to replace. Apply the guarded
primary-write contract above when the user confirms import or recovery.

## Actual foreground checks

Commands executed directly in the foreground, no server or browser:

```sh
for suite in save_conflict world save_v2 continuity; do
  node --experimental-default-type=module "scripts/test_foldwild_${suite}.mjs"
  code=$?; printf 'EXIT %s=%s\n' "$suite" "$code"
done
node --experimental-default-type=module --check Games/Foldwild/world.js
node --check scripts/test_foldwild_save_conflict.mjs
python3 -B scripts/check_maintenance_docs.py
git diff --check
```

Actual outputs/digest:

| Check | Output/digest | Exit |
| --- | --- | --- |
| save_conflict | PASS: optimistic expected-null/bytes writes; stale primary AND backup preservation; exact raw metadata; unchanged two-argument API; legacy/pending replay; negative corrupt/UTF-8/version/denied/quota fixtures | 0 |
| world | PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80; deterministic points/proximity; immutable inputs; strict schema; scoped storage | 0 |
| save_v2 | PASS: v1 neutral migration and legacy Iven badge; no reload restock; scoped rotating backup, quota failure and UTF-8 256 KiB corrupt-byte preservation | 0 |
| continuity | PASS: optional v1/v2 continuity; exact action/RNG replay; missed capture; five canonical trials; immutable release guards/history | 0 |
| world syntax / regression syntax | no diagnostics | 0 / 0 |
| maintenance | `AssertionError: Commit inspected source changes before validating its inventory.` | 1 |
| diff check | no diagnostics | 0 |

The new regression uses in-memory storage contract fixtures. Stale, corrupt,
invalid expectation, denied and quota cases are explicitly negative fixtures,
not ordinary-input evidence. Pure pending replay is not a native battle pass.
The existing three suites were unchanged. No native acceptance ran concurrently
with this implementation. Test output was returned in the foreground transcript;
no scratch logs or images were written (0 bytes, below 2 MiB). No owned server,
browser or background process was started, so no cleanup was needed.

Main must update `docs/maintenance/games/unregistered-foldwild.md` persistence
and verification sections, then refresh inventory after the integrated source
commits and run `python3 -B scripts/check_maintenance_docs.py` again. Those paths
are expressly outside this delegation. Do not call the coverage gate passed.
Other workers' dirty `battle.js`, `view.js` and cap-XP test were observed and left
alone. Only the three assigned paths are staged for the anonymous commit.

Disk stayed displayed at 2.4G free; shared-tree storage delta cannot be attributed
to this worker. Owned additions are small source/test/report text only. No sparse
change, materialization, dependencies, external loads, vendor/model edits or
protected subsystem changes. Catalog remains 115 by inspected inventory; zero
games added. Native passes 0, full-gate passes 0, screenshots 0. Original M2 Close
hold, full-game/N100/rights, registration/publication and push remain uncleared.
