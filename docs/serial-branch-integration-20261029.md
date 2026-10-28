# Serial ready-branch integration checkpoint

## Authority and distinct delivery states

User ordered completed repairs integrated, with `74b61fa7` the sole main writer.
Fresh remote base: `d3dbb39ed840cd47200e62f8e8d736c281b9e151`.
Local integration branch: `integrate/ready-game-repairs-20261029`.

**This batch is merged locally, NOT pushed, NOT deployed and NOT native accepted.**
Slipstream's owner explicitly handed off source-ready, not release-ready code
without push authority. The merge request is not a blanket failed-check waiver.
Remote main and the public runtime remain at the earlier published checkpoint.
No whole mixed-history branch was merged; each commit below was reconstructed
from its owned paths, then fast-forwarded into the main-based integration branch.
Original source commits/branches and other owners' dirty work remain intact.

## Exact source to integrated mapping

| Scope | Source commit | Local integrated commit |
| --- | --- | --- |
| Citisten renderer diagnostic | `7b08e47cec8b7c06b8ade07152e104ea6aa9eb68` | `74574399a8e5e03fb13a9f30a32e6991bcd19d80` |
| Citisten visual-clock diagnostic | `f66c65c6087c79f34c7e1263cc98b23208a9ee52` | `363e560469d762e36a3a5ae9dab2978b697c17b2` |
| Jank measured scope/manual only | `438a424d750076ead33bf45ac0349907424c94c2` | `40ccc0bbec808fb9569d32946ab313a8b180075f` |
| Slipstream controller/input | `3ceeb27bdd00ff2d5017ef612c1e8a3f417d54dc` | `d2ac4aaf07d0a655eb449402406b699d8761d2b4` |
| Slipstream map/view | `8355e04e4c1eb1eada45843c28a139366ea29cd5` | `d0e14848bcdbca68e2b0cfd07e45fec61853a74b` |
| Slipstream core integration | `13f5270c9f162dace125846ec7159c6f360e60dc` | `731d60a82ff1e3d1ed93669a4a9454289f7075d9` |
| Slipstream slow-reverse correction/native hold | `478a02a1cadc155763ca892584d27795a58bd0b7` | `a816b4b11783f1b01f6368de709d45a001fbd136` |
| Slipstream final docs/evidence | `382393c22ff8f3907c84c85fbea5120293a05f2f` | `b0ac72b70a612e69cf835d12daf8bf7bbb6c4c3a` |

Slipstream's source inventory was deliberately excluded from the snapshot patch.
Official refresh of the actual integrated tree changed **only row225**, in
`6471f5c93aaf821512827083e8d3252ccf8080b4`; that commit also links the two new
Citisten diagnoses from its current manual. No unrelated inventory row was copied.
The deferred-phase order is recorded in `85f800f0` and
[post-integration-debloat.md](post-integration-debloat.md).

## Completed scoped content and gates

### Citisten: diagnostics, not a runtime repair

Only the two new scripts and their two source receipts were imported. Runtime
remains exact tree `ff06ce5f68cbf300d93fd55c5a8396ed563d3cd4` (228 files), already
published by `017e4a47`/`da16004a`/`d3dbb39e`. No new game dependency or runtime
publication is required for these diagnostic-only additions.

Independent immutable-RAM verification used92 exact Git blobs, no model pack,
no live WIP source and no browser. Two syntax checks and both executables passed:
renderer8 cases/25 shadow frames/max matrix error0; visual clock reproduces
phase approximately.34 versus target.27 at60/120Hz, and night Continue.32→.16
on later wake, with original Continue assertions unchanged. This demonstrates an
**unfixed source clock bug**, not its repair or the cause of user artifacts.
An initial independent renderer invocation lost its result to the collector log
cap: that invocation remains **UNVERIFIED**. Its unchanged rerun passed. Raw
collection and the prior log remain retained locally at
`.tmp/citisten-f66-independent-checks.log`.

New screenshot/seed/HUD/runtime repair work is still source-owner WIP and excluded,
including its changed native/UI/camera/event/Continue files and visual-clock test.
Whole-world shaking, artifacts, native Water/Save/Continue, GPU/pixels/FPS and the
private downloaded v2 remain unchanged/unpassed. Source-lane missing-Brainrot
findings do not override current main's separately repaired coverage.

### Jank: qualified manual update only

Applied exactly the37-line `c19405ab..438a424d` hunk, preserving main's19 newer
lines and boot-JSON repair `1d301113`. Combined manual blob:
`bf564f8b8923b82ff48c8fde4ea97c4b9e8d323c`. Runtime remains exact
`cd2298dd42ea4ef4cce6ec034044a7870bef2ebe`; no QA/game logic was merged.
All three boot definitions remain present and unchanged from the published fix;
owner's fresh three canonical HTTP200/hash readbacks are source-delivery evidence.

The dated source manual's79,317/60,000 count is historical. Latest owner handoff
reports dirty async candidates79,174/60,000, still17/18 and size-failed. Both dirty
QA files and the newer working manual were excluded. Five guarded CPU profiles
cover18/160 proposed slots;142 remain held. This is not forty-hero/native parity.
Historical Warden zero-frame/cleanup failures remain failures; current async
candidate native behavior is unmeasured. New Stampead feel work has no ready
committed repair in this checkpoint.

### Slipstream: exact final source, native FAIL retained

The five source commits were integrated in order, not squashed into unrelated
history. Final game tree matches the source exactly:
`730c963fbe683fb7bde48f8e14a15f019697e3f4`,9 files/123,430bytes.
[Final manifest](slipstream-feel-evidence/final-manifest.json) SHA256
`6aad7c927cac5cf2176d3a8643affc0b96397f4199e9006845a3789bb56e6d7c` and all16
listed candidate hashes match, including unchanged shared assets/vendor.
[Source scope, exact outputs and retained failures](slipstream-game-feel.md).

Independent12/12 targeted Node suites passed, with13 syntax checks and Python
harness AST parsing. Evidence covers30/60/120Hz,196 safe rear spawns/60 deferrals,
slow reverse/12m NPC clearance, four connected shortcuts/40 parcels/61 nodes,
all16 steering/reverse and existing collision/save/payout/restart/resource guards.
Same stock Bricklet at4s/60Hz:68.900→105.459km/h; top90→112.5km/h. These are
simulation results, not satisfying-feel or device-performance acceptance. Full
independent command outputs/exits remain at
`.tmp/slipstream-382-independent-checks.log`. Owner's final5/5 local HTTP
entry/core/controller/world/view proof is reused only after exact candidate
identity verification; it is not a public deployment or gameplay test.

The **single admitted native attempt FAILED**, exit1/40.1116s at source
`13f5270c`, manifest`76ec2c173e15c93a76fb03311536e6f8b069450bcf202631c3ee09d6858228b2`.
System Chromium reached render/garage readiness; ordinary Start timed out20s
while performing the click. Errors[], observations[], zero captures/gameplay
cases. No guessed GPU cause, no native driving/chase/touch/feel acceptance.
The later slow-reverse fix is source-tested only. No retry was authorized or run.
[Failure](slipstream-feel-evidence/native-result.json) and
[actual cleanup/released lease](slipstream-feel-evidence/native-cleanup.json)
remain explicit. A future attempt needs a changed Start-stall diagnosis and fresh
exclusive admission, not longer deadlines, GL retries or forced input. No release
or publication authority was supplied for this source-only handoff.

## Still owned or not proven ready

- **Wings:** source repair/expansion continues in its isolated owner worktree.
  Inventory sampled54cd258a→92e66eeb; later observed head
  `efa89ed6a6fa1c15ee1012aa15a68187f99ab388` stages helicopter adapters pending
  clearance, not a frozen READY handoff. Do not merge its advancing branch wholesale.
  A scoped source/docs/build pin, original-UI served bundle identity and relevant
  changed-behavior results are still needed. Prior sixteen-kind unforced sampling
  failed on zero Rafale/Yak births, not proven flight defects; it is not silently
  green. Native renderer/input/device/flight/rights gates remain open. Published
  `62412ef5` source and47bf QA readiness fix are already represented by45c1b626/
  885cbb20, not stranded. Healthy workers continue without settings changes.
- **Foldwild:** source11707038 runtime is already exact main6929cd6f; integration
  6efa1470/releasec223c583 and later public proofs remain. Scoped Native5 clean2/2
  does not certify full natural campaign, older M2, hardware or rights gates.
- **Historical refs:** tree/merge-base inventory distinguishes content equivalence
  from mere ancestry. Old release/key-release/boot-fix/quality branches are already
  represented. Dive Trivia v2 branch-only feature content13758f40/bd4f1e5e and
  legacy Wings collector/assets are inventoried as divergent/unproven, not declared
  ready current repairs or automatically authorized expansion. Preserve them for
  scoped compatibility/readiness review, not a mixed-history merge.

## Safety, publication and subsequent phase

All other game trees, shared assets/models/fonts/vendor, catalog, portal,
Character AI and proxy/backend bytes are preserved. No source worktree was
modified by integration. Catalog129/projects135, zero games added (neither
new ports nor self-made additions). Maintenance:
`PASS: 135 game documents cover 129 registered + 6 unregistered games; Git inventory current.`
Coverage is not semantic/gameplay certification. No full-fleet run or push.

Debloat remains **QUEUED, NOT STARTED**. Do not overlap current writers or delete
models, tests/evidence, saves, games or telemetry. At a safe subsequent checkpoint,
measure actual served payload/references before targeted authored-code/UI work;
report real before/after measurements afterward. No savings or performance claim
has been made from repository/test size.
