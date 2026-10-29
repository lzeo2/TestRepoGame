# Serial ready-branch integration checkpoint

## Authority and distinct delivery states

User ordered completed repairs integrated, with `74b61fa7` the sole main writer.
Fresh remote base: `d3dbb39ed840cd47200e62f8e8d736c281b9e151`.
Local integration branch: `integrate/ready-game-repairs-20261029`.

### Subsequent Wings READY continuation

The prior0736 pending-Wings inventory below is historical. Latest runtime
`5b3065df`, binding`ed563114`, docs`f98e2529` are now integrated locally as
`eb5e2bc8933ad214b1e9c94d9afd4c1123bd8aa4` atop0736, selecting ONLY the full
source alternative. Original-UI rebuild26files/4,122,701bytes exactly matches
build-tree SHA256`493d45e73a1ff5714ea83b91c613311f7dd3692f35be0364314c1d59fcca07db`.
Accepted clearance plus7source/3generated executables pass;101/101 actual local
HTTP hashes/MIMEs pass with closed resources. Only Wings' actual inventory row
is refreshed; restored001 and all other reviewed candidates remain intact.
[Full mapping, build identity, collection failures and native holds](wings-f98-integration.md).
No push/deployment/native acceptance or new waiver. Citisten38e is now separately
integrated below. Debloat has read-only measurements only, no implementation.

### Subsequent Citisten READY code continuation

Runtime `78faf916182be40f757d5a2928d0f04d82886d6a`, including `44f0be47`,
reviewed through `38e18c45893094c80bccb116427822782f5c4477`, is now locally
integrated as **`1593979468621d83240dfb2a373ebd72a4d6e269`**. Inventory-only
`d9a9047e` refreshes exactly row241. The full 228-file/35,196,186-byte game tree
is exactly `1500eca1b81e4ffa8b5cc6a8c9f242256e0c7043`, equal to38e, not just
a subset or the older diagnostics. All233 new source-freeze hashes match.

Actual code now includes seeded terrain/save/cache propagation, cancel-safe town
controls, compact HUD/named notices, initial town framing, clock settlement and
collapsed/on-demand Map. The atomic final snapshot preserves the documented mixed
`d9f13107` staging rather than duplicating seed/render implementations.
Eight fresh focused executables and18syntax checks passed; lossless output is
[citisten-38e-integration-checks.log.gz](citisten-38e-integration-checks.log.gz).
The historical diagnostic-only clock status below is superseded for source code,
not proof that reported shaking/artifacts or old completion failures are cured.

Four labelled HUD contact sheets were personally reviewed, with dense phone/
short-landscape limits. Their8/8 DOM checks used an explicit world/renderer double;
they are not native-world evidence. Native0/5, Water/Save/Continue, pixels/GPU/FPS,
private Chromebook v2 and prior failure witnesses remain unchanged/unpassed.
No browser, push, deployment or new public-runtime proof was claimed. Fresh remote
readback remains `d3dbb39ed840cd47200e62f8e8d736c281b9e151`.

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

### Citisten: historical diagnostic-only checkpoint

At this earlier checkpoint only two new scripts and their source receipts were
imported. Runtime then remained exact tree `ff06ce5f68cbf300d93fd55c5a8396ed563d3cd4` (228 files), already
published by `017e4a47`/`da16004a`/`d3dbb39e`. No new game dependency or runtime
publication is required for these diagnostic-only additions.

Independent immutable-RAM verification used92 exact Git blobs, no model pack,
no live WIP source and no browser. Two syntax checks and both executables passed:
renderer8 cases/25 shadow frames/max matrix error0; visual clock reproduces
phase approximately.34 versus target.27 at60/120Hz, and night Continue.32→.16
on later wake, with original Continue assertions unchanged. This demonstrates an
**then-unfixed source clock bug**, not its repair or the cause of user artifacts.
An initial independent renderer invocation lost its result to the collector log
cap: that invocation remains **UNVERIFIED**. Its unchanged rerun passed. Raw
collection and the prior log remain retained locally at
`.tmp/citisten-f66-independent-checks.log`.

Screenshot/seed/HUD/runtime work was excluded from that diagnostic snapshot; the
later reviewed38e atomic code is now integrated above. Whole-world shaking,
artifacts, native Water/Save/Continue, GPU/pixels/FPS and the
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
candidate native behavior is unmeasured. That historical checkpoint excluded
subsequent Stampead feel repairs.

The later source-ready `ec282022` includes apex fade, camera timing, protected hit
notices (`af0e75bd`) and midpoint turning (`bdbd2b83`). Four independent focused
executables passed, including159real source-callback groups and approximately
0.011997m30/120Hz turn-endpoint difference. A separate unchanged standalone
`integration-test.mjs` reached its carbon600s-chain output but exceeded the
100-second collection bound (exit124,100.133s); no ivory/completion PASS was
collected. This incomplete gate is not a proven new gameplay regression or a
waiver. Two later planned suites were not run. Full output remains locally at
`.tmp/jank-ec282-focused-checks.log.gz`. This snapshot is not yet integrated;
Citisten was committed independently rather than blocked by this Jank check.
Dirty QA remains79,174bytes with exact original SHA256s, no live child process;
source manual and new untracked playability draft were not copied or modified.

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

## Prior0736 inventory (historical dispositions)

- **Wings (superseded for source integration by eb5e2bc8 above):** source repair/expansion continues in its isolated owner worktree.
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

Debloat implementation remains **NOT STARTED**. The disjoint read-only baseline
was recorded at `af2e3bfb`:14direct HTTP declarations,213,016response-body transfer
bytes/635,848decoded bytes, including optional metadata/fonts. It is not a browser
waterfall or savings/performance proof. Gameplay integration took priority.
Do not overlap writers or delete models, tests/evidence, saves, games or telemetry;
no cleanup or authored portal implementation has occurred.
