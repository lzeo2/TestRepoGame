# Citisten read-only render motion sampler (#58)

## Result and ownership

New runtime module `Games/Citisten3D/render-motion-sample.mjs` exports
`createRenderMotionSampler(world, canvas, { getState = () => null } = {})`, returning
`{ sample() }`. It implements the [agreed boundary](citisten-motion-diagnostic-contract.md).
It does not fix or certify the reported shaking. Site versus private Chromebook
v2 remains unidentified. Native Water/Save/Continue, pixels, GPU health and FPS
acceptance remain open. No quality, animation, save or existing runtime changed.

Only this receipt, that module and
`scripts/citisten_render_motion_sample_check.mjs` belong to this lane. Parent owns
camera input exposure, native integration, manual/inventory and publication.
Sister recorder implementation is not inspected or modified. Parent's untracked
contract is not staged. No delegates, browser, server, profile, installation,
export rebuild, screenshots, remote requests or push. Games added: 0.

## Run and source identity

- Start: 2026-10-28 10:50:14 UTC; hard deadline: 11:02:14 UTC.
- Actual provider/model: `openai-codex/gpt-6-astra`; recorded thinking: `high`.
- Session: `01a18221-b551-70dc-a83b-936e3f0a6c5f`.
- Harness log basename:
  `2026-10-28T10-50-09-621Z_01a18221-b551-70dc-a83b-936e3f0a6c5f.jsonl`.
  Tool commands, outputs and exits are retained there; no extra log artifact.
- Baseline `b00597df7e8ae643a3f871aadfb574357e9312ae`; game tree
  `fe47601d41652fa93fc51860efa655c1607eacb5`, 226 files / 35,157,288 bytes,
  matching the inspected inventory. New module requires parent inventory refresh.
- Initial root free bytes: 2,670,407,680. Pre-receipt: 2,667,638,784.
  Both exceed 2,147,483,648. Owned text is below 1 MB; shared disk changes are not
  attributable solely to this worker. Final disk/commit are in the handoff.

Read quality rules, maintenance README, full 1,032-line game manual, current
quality-mode note, contract, shaking dispatch and both world/camera reports.
Inspected `world.mjs`, `camera.mjs`, `native-actions.mjs`, `buildings.mjs`,
`external-buildings.mjs`, `city-render.mjs`, `terrain.mjs`, `river-render.mjs`,
`materials.mjs`, `daynight.mjs`, `atmosphere.mjs`, simulation/construction fields,
local Three pixel-ratio getter and existing world-stability fixture.

## Observation semantics and bounds

Factory selects the cohort at recording start. No scene traversal runs per
sample. At most 24 deduplicated node references include the scene root, known
landscape, road, bridge, water, ground and public static building batches. Ground
selection matches the exact public AO-map reference among at most 128 immediate
scene children, not a name or guessed mesh order. Factory inspects at most 24
pool entries and 24 batches per inspected pool. Labels are deterministic local
roles/ordinals, never random UUIDs or user text.

**Current public API limitation:** the city adapter hides original GLB batches
behind its private base kit. Public supplemental/wall/site batches are sampled;
logical handle matrices are not passed off as rendered instance buffers. A
`private-base-batches-unobserved` reason reports this gap whenever encountered.
A full original-building silhouette stability claim is therefore not available.
Mobile citizen/zombie/car/patrol/utility pools and sky/weather/event smoke/flame
are excluded by selecting known static owners, not by hiding or modifying them.

Each group is a finite numeric array or null. `keys[group]` labels consecutive
blocks, **not individual numbers**: suffixes state widths (`w16`, `i16`, `client2`,
`rect4`, etc.). Camera blocks are world16/view16; projection is projection16.
Only compare arrays with identical keys and lengths. Missing/nonfinite blocks
are omitted with an explicit reason; all-missing groups stay null. This allows
partial observations without coercing unknowns to zero. `available` requires
complete camera world/view, projection and some static-scene data; it does not
mean complete coverage or a healthy renderer.

Scene blocks copy computed matrixWorld and only instance index 0 when count>0.
No unused capacity, full instance hash or transform recomputation. Coverage node
rows are `[label, attachedAndSame, activeCountOrNull, visible, geometrySame,
instanceAttributeSame]`. Pool rows are `[label, samePool, handleCountOrNull,
batchCountOrNull, sameFirstHandle]`. Identity/count/visibility/geometry/layout
changes and root-child/pool totals flag `changed`, even if matrices stay equal.
Removed/replaced nodes lose their vector keys. The cohort does not silently grow.
Unselected pools/instances, later non-first instances and in-place geometry-buffer
edits are not exhaustively observed.

Fixed landmarks come from the hall's current public pose and map extent at
factory time. Projection uses only cached view/projection matrices and local
Vector3 arithmetic. Only points in front of near and inside the clip frustum
produce labelled visible CSS-pixel coordinates; no visible points means null and
`no-valid-visible-landmarks`, not giant offscreen jitter. These are fixed world
reference points, not a complete geometry or scene-root projection audit.

Viewport reads client/buffer sizes, DOM rect, raw DPR and optional visualViewport.
Absent values have missing-block reasons. Renderer pixel ratio is deliberately
unqueried: vendor's getter is pure, but this API cannot establish the identity of
a substituted renderer method. No method call is required for cached renderer
info. Frame/call/triangle/geometry/texture counters may remain stale after context
loss; `coverage.health` is always `unqueried`. No events or zero deltas imply GPU
health, pixels or callback progress.

Shading separately copies sun/moon shadow matrices/intensities, phase/daylight,
sun direction, water normal UV offset/repeat, particle elapsed and fog density.
No render, GL/context query, controller update, matrix update, simulation step,
effect synchronization, fetch, timer, listener or RAF. Optional inputState is
copied and validated as KeyW/KeyA/KeyS/KeyD, dragging and nonnegative integer
version. An inputVersion-only controller stays `known:false`, dragging null.
Target is a copied xyz/yaw/pitch getter result.

`getState()` is the actual simulation state boundary, not native's private pause
flag. Copy time/tick/speed and up to eight unfinished construction IDs, factual
BUILD_TIMES types and remaining seconds. Scan at most the first 256 buildings;
coverage records total/scanned/capped so later sites are not declared complete.
No save, notice, name, typed text or snapshot enters the runtime sample.

Samples preserve full floating-point precision. If serialized output approaches
8,000 ASCII bytes, remove scene tail blocks and count/report omissions; shading
also becomes explicitly unavailable if necessary. Tests exercise 24-node extreme
finite matrices, not only sparse identity matrices. No rounding masks movement.
Reads have group-level exception guards with fixed reason codes, never exception
messages containing private text. Returned arrays/objects do not alias sources.

## Executed checks

All commands below ran locally. New check first execution passed without a
failed iteration. No acceptance assertion or existing check was weakened.

| Command | Exit / observed result |
| --- | --- |
| `node --check Games/Citisten3D/render-motion-sample.mjs` | 0 |
| `node --check scripts/citisten_render_motion_sample_check.mjs` | 0 |
| `node scripts/citisten_render_motion_sample_check.mjs` | 0, `RENDER MOTION SAMPLER PASS: 18 scenarios; 100 fixed samples; forbidden calls 0; actual Three + sim, no GPU/createWorld integration` |
| `node Games/Citisten3D/world-check.mjs` | 0, `WORLD CHECK PASS` |
| `node Games/Citisten3D/native-check.mjs` | 0, native/actions/construction and `NATIVE LOOP PASS` |
| `node scripts/citisten_save_resume_check.mjs` | 0, `SAVE RESUME PASS groups=5/5; CPU ONLY` |
| `timeout 35s node --experimental-vm-modules Games/Citisten3D/continue-loop-check.mjs` | 0, `CONTINUE LOOP PASS` |
| `timeout 40s node --experimental-vm-modules scripts/citisten_world_stability_check.mjs` | 0, `WORLD STABILITY PASS: fixed scene/camera/instance/projected/shadow deltas 0; exact replay; intended animation retained; no GPU/user-cause claim` |
| Python catalog schema/ID/Git-URL guard below | 0, `CATALOG PASS: 129 entries, unique integer IDs, schema, Git URLs` |
| `python3 -B scripts/check_maintenance_docs.py` before staging | 1, solely `Missing docs/maintenance/games/001-brainrotboulevard.md` |
| `git diff --check` | 0 |

Catalog guard executed:

```sh
python3 -B - <<'PY'
import json,subprocess
catalog=json.load(open('games.json'))
tracked=set(subprocess.check_output(['git','ls-files','-z']).decode().split('\0'))
assert len(catalog)==129
assert len({g['id'] for g in catalog})==len(catalog)
for g in catalog:
 assert type(g['id']) is int
 assert all(k in g for k in ['id','title','cat','icon','desc','url','featured'])
 assert g['url'] in tracked,g['url']
print('CATALOG PASS: 129 entries, unique integer IDs, schema, Git URLs')
PY
```

Eighteen new scenarios cover fixed/copy/mutation, camera, resize, active instance,
unused/mobile exclusions, shading, unknown input, held input/target, missing
renderer, unavailable/throwing sources, removed/replaced geometry, pool/layout
changes, NaN, invalid landmarks, bounded construction, cap/dedup/large values,
private base/frozen matrices, and final source/snapshot/road preservation.
Throwing matrix/update/renderer/context methods detect forbidden calls. Source
bytes and actual full simulation snapshot/road identity/cells remain unchanged.

The new sampler's own fixture uses actual local Three and simulation, but a tiny
explicit world fixture. The existing world stability executable separately runs
actual createWorld/local GLBs: 276 measured frames replayed twice, 287 renderer
calls per replay and 92 unchanged geometry buffers. It exports no reusable
fixture; no 300-line loader was copied into this check. **Sampler-on-createWorld
and recorder/native Continue integration remain parent verification**, not claimed
by the separate passing executable. Renderer and image decoding there are doubles;
these checks do not establish native visual/shaking/SaveContinue/FPS acceptance.

## #59 focused actual-world follow-up (2026-10-28)

This is a new integration/coverage task, not a retry or retrospective pass for
#58's original timeout. Its `e59956d9` commit and original evidence above remain.
Only the same three owned paths change. Parent's dirty camera/native/HTML/CSS and
untracked contract remain untouched and unstaged. No recorder change, source
freeze, inventory refresh, agents, browsers, servers, installs, model copies,
exports, private v2, peer contact or push. Games added: 0; catalog: 129.

Start 11:12:40 UTC; hard deadline 11:20:40 UTC. Model `gpt-6-astra`, session
`01a18236-41d0-74f1-abc0-b654f86183da`; command/output log basename
`2026-10-28T11-12-36-307Z_01a18236-41d0-74f1-abc0-b654f86183da.jsonl`.
Initial root free: 2,665,918,464 bytes, above the 2,147,483,648 floor.
Final commit/disk are reported in the handoff. No waiver used. The inventory still
records tree `fe47601d41652fa93fc51860efa655c1607eacb5`, while inspected HEAD's
actual game tree is `54a966ac30b8f9b6d471c67f3a73a1e85b873b4b`; parent owns reconciliation.

### Source-authoritative selection and limits

Full source trace: `external-assets.mjs:MODEL_DIRECTORIES` maps the supplied model
types to directories; its loader preserves GLB materials. `building-surfaces.mjs`
uses delivered `directory__slot` names and clones the original material.
`external-buildings.mjs:materialFor/prepare/allocate` retains that material while
merging static primitives and adding actual InstancedMeshes directly to scene.
`city-render.mjs` hides the original kit behind `base` handles, maps additions via
`NEW_BUILDINGS.modelType`, and exposes only supplementary/wall batches.
`external-materials.mjs` independently uses the supplied terrain namespace.
No logical handle matrices, UUIDs, node-name guesses or pose proxies select bases.

The existing ground scan now inspects at most 128 direct children once, retaining
namespace-matched candidates. Existing public landscape/road/bridge/water/ground
and supplementary/wall selection keeps priority and behavior. Remaining slots
select static supplied materials using MODEL_DIRECTORIES minus all five mobile
types. Weather/flame/sky materials cannot match that static directory allowlist.
References deduplicate; labels use bounded `baseN` ordinals. No visibility writes.

`coverage.base` records factory `scanned`, `matched`, `selected`, sample `sampled`
(first-active-instance blocks actually retained), `unmatched` expected base
namespaces, `capped` (scan or cohort cap), and always `partial:true`. A namespace
match does NOT establish every material batch, instance or pixel. Byte omissions
remain separately counted by `omittedSceneBlocks` and `sample-byte-cap`.
`private-base-batches-unobserved` remains when an expected namespace cannot be
selected; a beyond-child-128 test preserves that reason and proves no later
rescan. Other pool/byte limits and changed-coverage semantics remain intact.

Observed fixture: 17 matched original hall/home batches, 14 selected and sampled,
24 total cohort nodes, 704 scene numbers, zero unmatched expected namespaces.
Three original batches remain omitted by the cohort cap; the direct-child scan
also reaches its 128 limit. Both hall and home have captured original batches.
All other active instances, late children, pixels and renderer health remain
unobserved. No whole-world/all-silhouette stability claim follows.

Landmarks now mean fixed **scene-local reference points** from the initial public
hall pose/map extent. Projection first applies the already computed scene
matrixWorld, then cached view/projection. No matrices are recomputed. A root move
therefore changes scene and projected groups while camera stays unchanged. These
points still do not follow later independent building-instance movement.

### Executed integration and regression

The added local loader/renderer/image-header doubles occupy about 75 lines, not a
copy of the world-stability report. Actual createWorld, local Three/GLTFLoader,
18 existing LOD0 GLBs, river, road/bridge, town hall/home, all five mobile model
types and actual createSimulation sharing world roads execute. PNG dimensions
come from headers only: **no pixel decode or GPU work**. FakeRenderer explicitly
updates scene/camera/shadow matrices outside sampling, as true render does.
Its info counters are fixture counters, not real GPU draw/resource measurements.
Fixture-only instance-buffer perturbations are diagnostic tests, not game
acceptance or production transform changes. No runtime snapshot serialization.

The original 18 scenarios and numeric assertions remain. Added cases prove:

1. Actual parent inputState getter is known; 100 fixed real-world samples agree.
   Full simulation snapshot, road Set identity/cells, source matrices and renderer/
   update counters stay unchanged across sampling.
2. Exactly 14/17 original hall/home first-instance perturbations appear in scene,
   not camera/projection/projected/shading; the three omissions match the cap.
   All five mobile material families remain excluded.
3. Root movement changes scene/projected, not camera/projection.
4. Genuine phase and water frame updates change shading only; frozen computed
   root/camera/view/projection matrices remain readable without recomputation.
5. Three real samples enter the unchanged recorder using an injected fake clock.
   All seven groups have 3 valid/0 unavailable samples, zero read errors, positive
   scene delta and zero camera delta; report stays below 16 KB. The earlier
   24-node cap case also feeds the recorder without vector rejection.
6. Beyond-scan namespace remains unmatched/private-unobserved after child reorder.
7. Actual full snapshot/roads/loaded source bytes remain unchanged, forbidden
   mutator/context/timer/RAF/fetch calls: **0**.

The first expanded run failed an overbroad test expectation that every original
batch was selected. A diagnostic rerun identified `residential_row__slate` beyond
the 24-node cap: 17 matched/14 selected, no byte omission. The corrected test now
requires exactly 14 captured and 3 omitted, both building namespaces represented,
and explicit capped metadata. No original assertion or acceptance gate weakened.

Recorder's existing `facts` sanitizer has 64 visits, 8 object keys and 24 array
items. Full node/pool coverage cannot fit: real integration observes
`metadata-limit`, `partial:true`. Compact base counts are early enough to survive;
the test asserts their preservation. Tail metadata is NOT promised complete.
Recorder/raw reasons also describe capped sampling and unqueried renderer ratio.
No recorder fix or false-green report is claimed.

Commands executed (all exits 0 except the documented maintenance blocker):

```sh
node --check Games/Citisten3D/render-motion-sample.mjs
node --check scripts/citisten_render_motion_sample_check.mjs
timeout 30s node --experimental-vm-modules scripts/citisten_render_motion_sample_check.mjs
node Games/Citisten3D/world-check.mjs
node Games/Citisten3D/native-check.mjs
node scripts/citisten_save_resume_check.mjs
git diff --check
python3 -B scripts/check_maintenance_docs.py
```

Actual outputs: `RENDER MOTION SAMPLER PASS: 25 scenarios; 100 fixed samples;
forbidden calls 0; actual createWorld + 18 GLBs + sim + recorder; CPU doubles,
no GPU acceptance`, `WORLD CHECK PASS`, `NATIVE LOOP PASS`, and
`SAVE RESUME PASS groups=5/5; CPU ONLY`. The catalog guard reproduced the exact
Python command above: `CATALOG PASS: 129 entries, unique integer IDs, schema, Git URLs`.
Maintenance exits 1: `Commit inspected source changes before validating its
inventory.` Parent owns dirty game sources and stale inventory; no fabricated
Brainrot manual or source snapshot was created. Historical renderer failures
were not retried. Native Water/Save/Continue and user-visible shaking remain
**UNPASSED**. No screenshot, hardware, FPS or release acceptance is implied.
