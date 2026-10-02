# Task 91: separately versioned M2 async ABI v1

**New ABI evidence only, never an unchanged M2 pass. Acceptance remains HELD.**
Main explicitly approved implementation of the sibling proposed in
[m2-async-contract-review](m2-async-contract-review.md). No runtime edits, new
games, registration, installs, downloads, sparse changes or push are authorized.

## Execution identity and reading

Actual execution: `openai-codex/gpt-6-astra`, thinking `high`.
Session `01a0fbf2-3e58-72ca-95dc-e9f5e7df2974`, basename
`2026-10-02T09-29-12-027Z_01a0fbf2-3e58-72ca-95dc-e9f5e7df2974.jsonl`.
Model-change record `7cab936e` and thinking record `9ef19195` agree with
`PI_PROVIDER`, `PI_MODEL`, `PI_REASONING_LEVEL`. Actual assistant record
`87b186e7` reports `api=openai-codex-responses`, `provider=openai-codex`,
`model=gpt-6-astra`, `thinkingLevel=high`. Inherited Swarmforge dispatch labels
say opencode-go/mimo-v2.6-flash; those are not this session's actual execution.

Completely read AGENTS, CODE_QUALITY, ponytail, maintenance README, exact
Foldwild manual, polish README, approved async review, original M2 and both
transitive local helper imports (`test_foldwild_core_v2.py`,
`test_foldwild_milestone.py`), implementation and M2 contracts, input review,
core-save report and integration report. Inspected current controller save queue
and relevant Save/Continue/release/Close handlers. No new full engine/vendor or
binary-model review is claimed. Original helper files are unchanged.

Reviewed HEAD `3ea00d6fff3eb9f54ef3c8c7e85fc49c886a23df`; current runtime tree
`a95c344888434010772c481f419cc9b933bc6dc0`, entry
`9d30203739b60208468345144590cf7c39c237db`. Inventory/manual still identify
`e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9` and entry
`b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`. They are stale, including the manual's
unload-save description. Task scope forbids refreshing them or editing worker92's
completion contract or Main's collection-heist/tycoon plans.

## Bounded implementation

`scripts/test_foldwild_m2_async_v1.py` is a plain sibling copied from the exact
original, not a wrapper, monkeypatch or source-string rewrite. Only the approved
save-completion waits, actual separate save/render failure assertions, exclusive
output/loopback identity and explicit ABI labeling differ. Original game/state,
RNG, rewards, immutable snapshot, byte preservation, model budgets and final error
assertions remain. Save/message success waits are exactly 10000ms. Existing
renderer readiness remains 30000ms; capture remains six attempts, seed 1.

Mobile and delayed-loader blocks are byte-identical to the original: actual CDP
finger drag, 390-to-320 resize, screenshots, one Close tap and original readiness.
No added waits/sleeps, input instrumentation, retries, mouse replacement or state
grants. Existing storage/WebGL/corrupt fixtures remain explicitly **negative**;
they are not natural campaign, physical hardware or rights certification.

Exclusive temporary-root-relative artifacts:

- Output: `foldwild-m2-async-v1-task91-01a0fbf2/` (refuses existing directory).
- Diagnostics: `foldwild-m2-async-v1-task91-01a0fbf2-diagnostics/`.
- Loopback only: `127.0.0.1:8891`, confirmed no listener before execution.
- `validation.log`, `original-sibling.diff`, `source-before.json` are retained
  in diagnostics. Hash manifest includes all 94 tracked game files, original M2,
  both helpers and the new sibling (98 files).

Initial SHA-256 proofs:

| File | SHA-256 |
| --- | --- |
| Original M2 | `4187de5f03366332af2eddd9bed3a61ac33c9532115ac0b2fb09435bc85c12ea` |
| Async v1 | `87bdc2717a9a68ea982c0922e21de77ca2f0b5c0d1a0b27c73657a115891b138` |
| `Games/Foldwild/script.js` | `0a07a0aef5a8955cfe485c5614100c6d2ee14bdbdda7427a1da82870997a42ec` |
| `Games/Foldwild/world.js` | `570b96cadaf55af0b7ff265fae9e0d074b78739b1e1c8a1602db2b8f9c2262e2` |

Pre-run validation: Python AST, original hash and byte-identical mobile/delayed
block checks exit **0**. `diff -u` exits **1**, as expected for different files;
the complete diff was reviewed. `git diff --no-index --check /dev/null` likewise
exits **1** with no whitespace diagnostics (new-file difference), not a claimed
zero exit. The staged whitespace check is recorded separately before commit.
Maintenance checker exits **1**: `AssertionError: Inventory stale: inspect
changes, then run --refresh.` No refresh attempted. Catalog parses to 115 games,
Foldwild remains unregistered. Initial free space 2,327,183,360 bytes; pre-native
sample 2,326,925,312 bytes, both above 2 GB.

## Frozen-run contract and acceptance holds

Commit these two owned files before exactly one invocation:

```sh
timeout --signal=TERM --kill-after=10s 420s xvfb-run -a python3 -B scripts/test_foldwild_m2_async_v1.py
```

Record the actual process exit and retained traceback, not inferred stage success.
Stop after one native failure; no runtime fix or retry. Record before/after source
hash equality independently of the runner, and retain browser/server cleanup.
Execution results will be appended in a second owned documentation commit.

Historical original M2 failed at the single mobile Close in the input review.
The latest original-M2 execution read by the approved report failed earlier at
its synchronous manual-save assertion (exit 1); neither clears Close. Original
M2 is not rerun or modified here. Its current gate remains failed/HELD; this new
ABI can only provide separately classified evidence, not retroactive acceptance.

Remaining holds: unresolved Close compatibility-click root, fresh stable native
acceptance disposition by Main, subjective screenshots, stale maintenance docs,
complete natural campaign/acquisition/evolution/accessory fit and class ranks,
physical input/N100, rights, registration/publication and full-catalog release
gate. Backup rotation is not two-key atomicity, Web Locks cover cooperating tabs
only, and unload does not promise persistence. No game added, ingested or self-made.
