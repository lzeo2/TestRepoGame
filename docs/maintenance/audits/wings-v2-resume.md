# Wings v2 resume: fresh study and phase receipts

## Phase 0: orchestrator study

Resume baseline: `956ef48`, clean tree, 3.2 GB free. The checkout advanced while
this session was stopped. The v2 brief's empty-array/white-airframe description
is historical: current descriptors already contain stores and exhaust, and
`92e470f` / `80d88ae` implemented the geometry/runtime repair. Preserve that work;
verify phases in order rather than overwrite it with a second implementation.
No implementation edit preceded this study. No push or origin write is authorized.
The repository's stricter 2 GiB storage floor remains in force.

Read the brief, standing aircraft contract, current models/repair study/acceptance,
maintenance manual/inventory, authored generator and CPU regression, and current
built aircraft descriptors. Retrieved nine individual source files read-only
from anomalyco/arcade pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181` for
inspection, not runtime dependencies. Read `render/aircraft.ts`, `toon.ts`,
`scene.ts`, `camera.ts`, `sim/vehicles.ts`, relevant spawn/combat/bot boundaries
and `audio/engines.ts`, comparing authored changes in `port.patch` and generated
registry `aircraft-BIwDLCoz.js`. This is a boundary study, not a whole-engine audit.
Hivemind was unavailable (not authenticated; fallback memory directory absent).

### Original-model measurements

Loaded all five original selectable GLBs and both jets with the existing external
Three 0.180.0 GLTFLoader for geometry-only bounds. This is not a 0.186.0 runtime
or rendered-parity test. Serialized counts and material colors were independently
read with Python stdlib. All scene roots have identity scale/rotation.

| Model | Triangles | Bytes | Assignments / unique base colors | Loaded X/Y/Z bounds |
| --- | ---: | ---: | --- | --- |
| F/A-18 | 16,896 | 912,784 | 151 / 10 | 13.5923 / 5.2636 / 18.6550 |
| A-10 | 17,576 | 952,180 | 166 / 12 | 17.8440 / 4.6350 / 16.5300 |
| YF-12 | 18,028 | 780,572 | 123 / 12 | 17.4600 / 5.8585 / 32.2200 |
| Apache | 11,322 | 745,072 | 202 / 10 | 10.8187 / 5.0250 / 17.1133 |
| B-2 | 4,740 | 283,788 | 96 / 10 | 52.6864 / 5.2781 / 21.2862 |
| F-15 | 41,352 | 1,176,316 | 142 / 12 | 13 / 4.315 / 19.44 |
| F-35 | 40,812 | 1,174,768 | 143 / 12 | 10.7 / 3.313559 / 15.7 |

Original assets duplicate material definitions per primitive. F/A-18 has slate
hull, pale belly/stores and team-blue accents; A-10 has olive panels; YF-12 has
charcoal surfaces. They are not literally all black. New hull material colors
are linearized sRGB #232628, #2c2f30, #292c2e, #1d1f20 and #222527; glass,
metal, missiles, livery and emissive cores are intentionally separate.

### Renderer and gameplay interface

- The converter normalizes to aircraft-root space, attaches geometry to the
  nearest configured pivot, bakes rigid skin weights, applies 55-degree creased
  normals and merges paint/metal/livery/glass/emissive batches. Missing pivots
  warn; named empty anchors alone do not animate anything.
- F/A-18 has four underwing and two wingtip missile pivots, two nozzle pivots,
  pilots/gear and a targeting pod. Pilot secondary controls four visible stores,
  officer slots control two. Its locally rotated nozzle cones use -Y, length 1.5.
  YF-12 has three internal stores, twin +Z cones of length 2.4 and moving fins.
  Its original store mapping points at empty pilot slots although AIM-47 belongs
  to the officer: an inherited mismatch, not a pattern to copy into new jets.
- A-10's two stores follow officer slots; barrel/fan spinners use the same rigid
  skeleton. Apache has eight Hellfire stores, rotor spinners and chin turret.
  B-2 has eight bomb stores and hinged doors, dim buried exhaust rather than
  afterburner cones. Original-five behavior is outside this rework's edit scope.
- Store visibility is ceil(ammo/capacity * number of stores), depleted in declared
  order. New jets correctly use two physical stores for each two-round slot.
  Combat launch points are separate from render anchors; the port now rotates
  model-derived hardpoints into world space. Ballistic fire, missile fire and
  combat aim helpers call the shared muzzle boundary.
- Exhaust cones are generated from nozzle subtree cross-sections, attached to
  nozzle bones, and point along the configured local axis. Throttle above .7
  shows cones; boost stretches them and increases HDR glow. This is render-state
  animation, not GLB clips. New jets use twin/single +Z cones respectively.
- Doors use held firing hints and smoothed signed rotations. F-35 selects pilot
  secondary and officer primary, excluding cannon fire. The continuation clears
  stale hints on seat change, pause and ownership loss. Native missile emergence
  and converted family comparison remain open, despite CPU fixture coverage.
- `toon.ts` ordinarily lifts near-black paint toward gunmetal. The current port
  preserves authored hull colors only for F-15/F-35, retaining original-five
  remaps. Scene uses node materials, ACES, quality-dependent shadows/bloom;
  Low bypasses postprocessing. Thumbnails use the actual converter, unlike raw
  standard-Three preview images. Shadows use descriptor span/length and terrain.
- Custom selection/hangar -> validated spawn -> carrier position -> flight and
  weapons -> snapshots -> view. Seven selectable kinds; bot weights stay original
  3/2/2/1.2/.9, plus zero for both new jets. F-15 is 155/215 m/s with cannon20,
  AIM-9 and officer Maverick. F-35 is 130/180 with cannon20 and two independent
  seat slots of radar missiles, using existing stealth rules. Pilot seekers use
  nose direction; officer turret seekers use seat aim. No new weapon ID is needed.
- Cockpit offsets are body-local and rotated with the aircraft. Gunner/bombsight
  offsets add model-specific forward/down clearance; new values and chase sizes
  are in the patch. CPU checks compose GLB ancestry for gun/missile origins and
  compare camera anchors. Both jets reuse the existing fighter procedural engine
  voice, with separate reference/loudness settings; this is not recorded F-15/F-35
  audio. Native listening remains unverified.

### Study findings and ordered work

Current maintenance check: `PASS: 130 game documents cover 125 registered + 5
unregistered games; Git inventory current.` No historical acceptance is promoted.
Existing saved family/top/side images were opened: both jets are dark, with
separate twin/single-engine silhouettes and visible F-15 external stores. These
are historical raw previews, not fresh visual acceptance.

Proceed through Phase 1 palette, Phase 2 shape, Phase 3 exhaust, Phase 4 weapons,
then Phase 5 current regressions/previews. Delegate bounded verification of
already-implemented phases; make only demonstrated fixes. A concrete Phase 5
finding: `check-models-browser.py` still expects old 112/109 draws and
43,392/42,760 triangles, whereas current assets are 142/143 and 41,352/40,812.
Its fixture also lacks reproducible top/side/family controls used for the saved
review images. Exact Three 0.186.0 was not found in the existing Bun cache; do not
silently substitute 0.180.0 for runtime evidence or install dependencies.

Operator visual approval, native missile fire, converted-family parity, hardware
and rights gates remain distinct from structural passes. No new game or ID.

## Phase 1 fresh receipt

Baseline `000947e`, initially clean. Operator-selected `openai-codex/gpt-6-astra`,
low thinking; environment reports `PI_MODEL=gpt-6-astra`. Bounded verification
only: no generator, model, runtime, bundle or manual changes. Read the required
brief/contract, current model registry documentation/manual, Phase 0 receipt,
generator palette and actual converter patch. Wings inventory tree
`c7cd2f1af6d2272185d751d106b3cd8531938a0a` and entry blob
`2d7f08aa3ca94c87da2921c7916bec48d28e13aa` match HEAD.

### Independent palette inspection

`verification/generate-models.py:164` defines `dark_paint`; both generators call
it. It converts 8-bit sRGB to linear components using the standard piecewise
transfer function, writing material indices 0/1/5/6/7. Independent Python stdlib
inspection decoded each GLB JSON chunk and converted its serialized linear
`baseColorFactor` back to sRGB, without importing generator palette values:

| Material index | F-15 / F-35 sRGB | Linear RGB | Primitive assignments F-15 / F-35 |
| --- | --- | --- | --- |
| 0 airframe | #232628 | .01680738, .01938236, .02121901 | 11 / 17 |
| 1 control / edge | #2c2f30 | .02518686, .02842604, .02955683 | 12 / 14 |
| 5 belly | #292c2e | .02217388, .02518686, .02732089 | 3 / 6 |
| 6 radome | #1d1f20 | .01228649, .01370208, .01444384 | 3 / 3 |
| 7 panel | #222527 | .01599629, .01850022, .02028856 | 14 / 11 |

Both serialized hull palettes therefore match the generator and requested dark
range. Separate glass (#485969), collar metal (#a6aaad), livery (#61819e),
missiles (#868b90), orange exhaust and nozzle/recess materials are not white
hull paint. These counts measure primitive assignments, not visible surface area.

Independent family comparison found F/A-18 slate #5c6d80 (29 assignments),
pale #d9dcdf (30), A-10 olive #6b7667 (17), pale olive #aeb5a6 (21), and
YF-12 charcoal #1c1f26 (16), gray #8a929e (31), #4e535c (17).
The originals also contain separate blue livery, pale stores and white details.
The jets share a dark neutral palette closest to YF-12, not identical raw colors
across all aircraft. Inspection printed `PASS independent serialized palette
inspection`, exit **0**; this is data inspection, not visual acceptance.

Read `port.patch`'s actual `buildTemplate` hunk around line 1063: named
`COLOR_OVERRIDES` take precedence; otherwise only `f15`/`f35` batches targeting
`paint` use `b.srcColor.clone()`. Metal-target batches and original aircraft
continue through `paintColor`. `PART_COLORS` processing follows this branch.
Thus the patch avoids the generic near-black gunmetal lift for these jets, not
all material conversion or all aircraft. No patch application, rebuild or native
converter execution was performed in this phase.

### Fresh commands and boundaries

`python3 -B Games/Wings/verification/check-models.py`, exit **0**:

```text
PASS {"assignments": 142, "bytes": 1176316, "materials": 12, "name": "f15", "sha256": "5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf", "triangles": 41352, "unique_materials": 12, "vertices": 25305}
PASS {"assignments": 143, "bytes": 1174768, "materials": 12, "name": "f35", "sha256": "ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197", "triangles": 40812, "unique_materials": 12, "vertices": 25323}
```

Read the checker before running: it compares committed bytes with two fresh
`make().finish()` generations per aircraft entirely in memory, then checks model
structure. It does not overwrite GLBs. Hashes match current `models.md`.

`python3 -B scripts/check_maintenance_docs.py`, exit **0**:

```text
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

No fresh render or screenshot was produced or claimed. Historical raw-family
images and Phase 0's image review are not a Phase 1 visual PASS. Converted-family
parity, lighting/postprocessing, supported-device appearance and operator approval
remain unproven. No palette defect requiring a source edit was found in this
bounded inspection; later phases remain outside scope.

Disk before work: `df -h / | tail -1` reported **3.2G available**. Exact available
bytes before generation were **3,387,424,768**, afterward **3,387,400,192**
(24,576-byte filesystem decrease, not attributed to this process). Both exceed
the stricter **2 GiB** floor. No installs, repository node_modules, generated
files, new games, servers, push or origin writes. This receipt is the owned log;
only its explicit path is committed. Final `git diff --check` exited **0**;
post-append maintenance check exited **0**, with the same 130-document coverage
output above. Pre-commit disk availability: **3,387,371,520 bytes**.

## Resume stop: Phase 1 fresh-render tooling gate

Orchestrator verified worker commit `8b3efc2` and reviewed its actual diff. Sampled
the last 20 lines of `.swarmforge-logs/worker-2026-10-17T04-17-32-925Z-7080a088.log`.
The harness log contains task/result metadata rather than an internal tool trace;
its results are recorded above. One worker, correct requested provider/model,
no scope drift or source edits. No later phase was delegated across this gate.

Fresh invocation of `python3 -B Games/Wings/verification/check-models-browser.py`
with an external output directory exits at argparse with code **2**:

```text
check-models-browser.py: error: Existing Three 0.186.0 not found; supply --three-root. Do not install.
```

Searches of existing Bun/npm caches, package directories and prior staging found
no usable Three 0.186.0. System Chromium is present. The existing Three 0.180.0
used for Phase 0 geometry measurements was not substituted for this render gate.
No fresh screenshot was produced. Existing committed previews remain historical.
The stale expected model counts are a separate known runner defect, not an excuse
to weaken assertions or claim a render PASS.

Consulted Hermes ticket `pi-368449-1792210755198-1ecef1b3`; advice provided further
cache-search locations, which yielded no usable package, and advised requesting
single-use external retrieval permission. This is **not operator approval**.
Unblocking request: supply an existing Three 0.186.0 directory, or authorize
fetching that exact package into bounded external test staging, without repository
node_modules, runtime dependencies or origin writes. Native/converted-renderer
hardware acceptance remains separate even after raw preview tooling is restored.

Phase status: **0 complete; 1 structural checks pass, visual gate blocked;
2-5 not newly accepted in this resume**. Existing repair commits are preserved.
No game added or registered (125 catalog games / 130 projects), no runtime
source or generated assets changed, no push. Disk display remains **3.2 GB free**
from start to stop; this is rounded filesystem usage, not an exact task delta.
Resume commits before this stop receipt: `000947e`, `8b3efc2`.

## Operator GO and fresh raw renders (2026-10-18)

Operator resumed at `cd1c2bd`, including the three existing local commits, and
provided existing external Three 0.186.0 at
`~/.hermes/cache/tools/three-0.186.0/package`. No installation, vendoring or
runtime dependency change. Initial free space: 2,351,915,008 bytes. The stricter
2 GiB floor applies. Push to main is authorized only after committed work and
the fresh unchanged full 125-game gate pass; the scope addition below also
requires interactive new-vehicle acceptance.

Parent measured all six current raw renders before changing expectations. An
in-memory measurement invocation replaced only the stale count assertion with
printing; every other assertion remained. Each front/rear/underside,
desktop/mobile and light/dark case reported the same values:

| Model | Old expected calls / triangles | Fresh measured calls / triangles |
| --- | --- | --- |
| F-15 | 112 / 43,392 | 142 / 41,352 |
| F-35 | 109 / 42,760 | 143 / 40,812 |

Worker `478097f` changed only that tuple and the actual unchanged-assertion
runner then passed **6/6**, exit 0, Three revision 186, zero console/page errors
or external requests. Evidence: `.tmp/wings-v2-resume/measured/` and
`.tmp/wings-v2-resume/accepted/`, each with `browser.json` and six PNGs.
Logs: `.swarmforge-logs/wings-v2-measure.log` and
`.swarmforge-logs/wings-v2-phase1-runner.log`.

Parent opened all six measured images with vision. Both airframes are near-black,
not white; F-15 has twin vertical tails, twin nacelles, rectangular intakes and
external stores. F-35 has a shorter broad chined body, canted tails and one
nozzle. Rear views show orange exhaust discs and metallic collars. Mobile views
remain contained and legible. No obvious missing upper/front/rear surfaces.
The default underside lighting is too dark to clear belly normals visually;
a separately labeled lit-belly diagnostic is required rather than claiming
that the numerical PASS establishes visual correctness. Raw GLBs do not contain
the converter-generated animated cones, so cone acceptance belongs to Phase 3.
These are standard-Three fixtures, not native Wings or operator approval.

Reviewed the exact one-line diff and sampled the final 20 lines of both the
worker harness log `worker-2026-10-18T10-52-16-554Z-3a78438d.log` and its tee log
`worker-20261018-215232.log` under `.swarmforge-logs/`. No drift; no further
assertions or runtime changes requested.

## Additional operator order: one new selectable class

During this resume the operator explicitly authorized ONE new selectable Wings
vehicle, not a portal game or catalog ID. Finish the ordered jet Phase 2-5 lanes,
then dispatch one bounded `openai-codex/gpt-6-astra` study/design worker before
implementation. The study must land first and trace F/A-18 descriptors, converter,
spawn/combat/bots/camera/audio and weapon behaviors end to end. Subsequent
implementation lanes remain bounded, explicit-path commits, never worker push.

Current built registry contains selectable fighter, Apache, A-10, YF-12, B-2,
F-15 and F-35. Apache already covers helicopter flight. Parent initially proposed
a tracked tank; the operator then explicitly selected **SPEEDBOAT**, superseding
that proposal before any new-vehicle implementation. Skip the heli option.
Study F/A-18 structure first, then design honest water handling, a deck gun and
unique class-specific secondaries such as wake-slam or depth charges. No missile
clones or re-skinned slow jet. Exact design remains subject to the source study.

Use the authored generator and regression pipeline, 12,000-18,000 triangles,
at least 40 meaningful material assignments, near-black family base with rich
accents and a measured visible scene below 120,000 triangles. Recognizable
silhouette, moving wake/propulsion/turret or equivalent real animation, geometry-derived
anchors and at least two fresh rendered angles are required. New-vehicle normal
spawn and firing every weapon with verified state changes are additional push
gates. Do not reinterpret CPU fixtures as this interactive acceptance. No new
dependency installation or runtime external loads. Storage constraints may hold
implementation and publication even after the study succeeds.

## Phase 2 fresh geometry and family review

Delegation 2 was interrupted by the operator's speedboat decision, leaving only
the assigned fixture dirty and no commit. Delegation 3 resumed that same scope,
reviewed and completed it as `8f20a62`. No generator/model/runtime edit. Added
allowlisted `top`, `side`, `underside-lit` angles and `family=1` for F/A-18,
A-10 and YF-12, preserving default fixture behavior. Diagnostic belly lighting
is explicitly labeled, and family cameras fit each model rather than implying
absolute-scale comparison.

Fresh checks: nine diagnostic/family cases pass, all default six renders pass,
repeated-generation model checker passes, extracted module syntax and diff
checks pass. Counts/dimensions remain stable; no errors, external loads, overflow
or diagnostic clipping. Evidence: `.tmp/wings-v2-resume/phase2/browser.json`,
nine adjacent PNGs and `phase2-default/`. Parent reviewed the top, side, both
lit-belly themes, desktop family front and mobile family side images. The lit
bellies now show continuous surfaces and the F-15 stores, with no visible holes
or inverted-normal patches. F-35 closed bay seams are visible; internal stores
and opening travel still require the converted-state checks, not this image.
Top/front/rear distinguish the twin-engine vertical-tail F-15 from the broad,
shorter single-engine/canted-tail F-35. Parent accepts these raw geometry and
palette fixtures within their scope, not as engineering replicas or native
converted-family/operator approval. Original-five palettes remain untouched.

Sampled the final 20 lines of `.swarmforge-logs/worker-20261018-105940.log` and
reviewed the actual fixture diff. The worker reported a timed-out Hermes framing
advice request, followed by independently passing framing checks; no model
change was made to conceal the collector issue. No further runtime intervention.
Inventory staleness after its source commit was expected and parent-owned.

## Phase 3 and Phase 4 receipts

- [Phase 3](wings-v2-phase3.md), `c268a60`: actual CPU loader/converter,
  exhaust geometry/attachment, idle/throttle/boost visibility and glow/stretch
  assertions pass; solo regression passes. F-15 converts to 41,744 triangles,
  including 392 generated cone triangles; F-35 to 41,008 including 196.
  Native collector stopped on a Settings actionability timeout before Low/Solo.
  No native scene/exhaust screenshot or acceptance from that attempt.
- [Phase 4](wings-v2-phase4.md), `4044742`: actual CPU acquisition/fire for all
  four seat/slot fits, ammo 2 to 1, launch ownership/coordinates, corresponding
  converted store, regeneration, signed F-35 cover travel and both triggers,
  cannon exclusion, input hint cleanup, model-derived camera/hardpoint checks
  and original-five invariance pass. Geometry repeated-generation and solo
  checks pass. Root-space normalization, nearest-pivot and mirrored-winding
  branches were source-inspected; unexercised edge branches are not test passes.
  Native missile/bay visuals remain open.

Reviewed both full receipts and their commit stats. Sampled final 20 lines of
`.swarmforge-logs/worker-20261018-110805.log` (Phase 3) and
`worker-20261018-111227.log` (Phase 4). No runtime edits or unauthorized class
work. Chose not to alter weapon tuning, original models, renderer failure gates
or smoke filters. Phase 3 collector failure remains explicit, not a product
verdict. Phase 4 noticed the exact disk-floor breach only after its command group
executed; this timing is a process failure, not permission to continue growth.
Parent stopped further lanes immediately on receipt of that result.

## Storage stop and handover

Parent confirmed free space **2,109,014,016 bytes**, below the strict
**2,147,483,648-byte** floor by **38,469,632 bytes**. No bulk checkout or package
installation occurred in this run; the cause of filesystem growth is unproven.
Local ignored `.tmp` is 2.4 MiB and worker logs 1.2 MiB, so deleting small run
evidence would not restore adequate gate headroom. No unrelated data deletion,
garbage collection or history rewrite was attempted.

Filed storage blocker ticket `pi-829842-1792322142957-ab609a47` in
`~/.swarm-help/`; the advisory timed out after 120 seconds and remains unresolved.
The Phase 2 worker's earlier framing-advice timeout was
`pi-834757-1792321387110-fd2710ea`; framing checks subsequently passed independently,
so no implementation change followed that advice failure.

Only small safe handover documentation was written after the stop. No further
browser, extraction, checkout, build, new-vehicle worker or installation.
Read-only static checks after stop passed:

```text
PASS: 125 catalog entries, unique IDs, required schema and Git-backed URLs
PASS: 12 Wings JavaScript syntax checks
PASS: authored fixture module syntax
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

`git diff --check cd1c2bd..HEAD` exited 0. The two source changes are verification
fixtures only; no runtime/model bytes, catalog entries, smoke scripts or
allowlists changed. Inventory was refreshed after each source commit. No new
game or selectable vehicle was built/registered; speedboat is the authorized
next class, not delivered functionality.

| Phase / gate | Current status |
| --- | --- |
| 0 study | Complete, scoped source study retained |
| 1 raw palette/render | 6/6 fresh renders; visual clearance supplemented by lit belly |
| 2 raw geometry/family | 9/9 diagnostics, 6/6 default regression; parent pixel review accepted within fixture scope |
| 3 exhaust | CPU pass; fresh native exhaust render held |
| 4 weapons/converter | CPU/structure pass; fresh native weapon/bay visuals held |
| 5 preview/native consolidation | Blocked, fresh raw screenshots remain ignored evidence, not yet saved as final tracked previews |
| Speedboat structure/design | Not dispatched, must follow Phase 2-5 lanes and land before geometry |
| Speedboat implementation/playtest | Not started; required normal-input weapon state changes not established |
| Mandatory full 125-game smoke | **NOT RUN: 0/125 visits**, storage blocked; no current full-gate PASS |
| Push/deploy | **NO PUSH**, new acceptance gates and full gate incomplete |

Historical 125/125 receipts do not substitute for this run. Exclusions: none
newly applied or measured because no fleet visit ran; the unchanged existing
runner filters remain documented elsewhere. No goto-timeout rerun was needed.
Sparse patterns were never changed, so no temporary game payload requires
restoration. Existing Character AI remained untouched. No persistent server.

Latest pre-handover available space: **2,108,895,232 bytes**, down
**243,019,776 bytes** from the initial 2,351,915,008; filesystem-wide difference,
not task-attributed usage. Restore authorized capacity with sufficient headroom
for the largest approximately 196 MB game plus browser overhead before resuming.
The new speedboat also needs the existing approved source-build toolchain and a
supported interactive renderer; this run did not acquire or validate those.
Do not push merely because storage later recovers: finish all pending gates.

## Capacity recovery and Phase 5 continuation (2026-10-19)

Operator answered `pi-829842-1792322142957-ab609a47` and resumed. Reported free
bytes 2,154,393,600; parent measured 2,154,369,024 at entry, only 6,885,376 above
the strict floor. No outside-repository deletion, package install or GC allowed.
Projected checkout/build growth must fit above the floor, not just pass a rounded
`df` display. Each fleet batch must release to coding sparse selection before
the next batch is added. This prevents accumulation, not an oversized individual
batch. Further external capacity recovery remains operator-only.

Operator clarified that unavailable native Pi GPU output is a documented hardware
receipt, not by itself a gate/push blocker; SwiftShader is the supported CPU path.
No assertion is weakened and no new successful native pixels are inferred. Full
fleet and normal-input boat spawn/every weapon/state-change/restart remain gates.

Delegation 6 produced [Phase 5 consolidation](wings-v2-phase5.md), `c24103f`:
four fresh checks pass; saved 6/6 default and 9/9 diagnostic receipts validate,
not recaptured that day. Parent retained six previously reviewed images in
`Games/Wings/docs/previews-v2/resume-20261018-*.png`, commit `bde775e`, with dates,
lighting and raw/native distinctions. No runtime/model/catalog change.
Phase 4/5 CPU/raw-preview lanes are complete within these documented limits;
remaining native scopes stay unverified hardware receipts. The speedboat
F/A-18 study/design lane follows before any implementation.

Sampled final 20 lines of `.swarmforge-logs/worker-20261019-052955.log`, reviewed
the receipt and actual commit. The worker corrected its own 101-line receipt
constraint to 99 lines after an assertion; no product defect or weakened check.
Chose not to rerun browser profiles with only a few MB headroom, change models,
alter tuning, bypass rendering or modify fleet filters. First new source change
was only retained preview evidence; maintenance inventory refreshed afterward.

## Renewed capacity stop before speedboat implementation

Delegation 7 committed the explicitly incomplete
[F/A-18/speedboat study](../../wings-speedboat-study.md), `7831179`. It establishes
schema/store/pivot/converter findings, but built-registry, camera/audio and full
spawn/combat/water/toolchain tracing remain incomplete. It is not an approved
implementation contract. No geometry/runtime implementation may follow yet.

Worker entered with 2,148,413,440 free bytes; guard measured 2,147,213,312, below
the 2,147,483,648 floor. It stopped reading/output growth except its safe note
and commit. Parent confirmed **2,144,706,560 bytes**, 2,777,088 below floor.
No browser, bulk checkout, installation, download or outside-repository deletion
in that lane. Filesystem growth is not attributed solely to the small study.

Sampled final 20 lines of `.swarmforge-logs/worker-20261019-053450.log`, reviewed
the complete 92-line study and commit. No drift into geometry; deliberately did
not approve the proposed weapons or missing runtime design. Logs also include
`.swarmforge-logs/wings-speedboat-study.log`. Worker provider/model was requested
as `openai-codex/gpt-6-astra`, medium; no claim of independently verified internal
thinking setting. Only notes changed; original runtime remains untouched.

Filed renewed ticket `pi-829842-1792388121373-af09fa13` under `~/.swarm-help/`;
advice timed out after 10 seconds. Further recovery is operator-only. Releasing
between batches is required but cannot make a single 195,853,427-byte game fit
in a 6.9 MB margin. Even releasing the roughly 16.7 MB current Games payload
would not close that gap. Request at least the largest-game payload plus measured
browser/build/source/Git overhead above the floor; 500 MB extra is a practical
starting buffer, not a substituted floor or guaranteed complete build budget.
Project actual growth before every checkout regardless of rounded `df`.

Current full gate remains **0/125 visits, NOT RUN**, not a green result. No
exclusions newly measured/applied. Boat design/build/interactive tests remain
unstarted. No push/deploy verification. Capacity recovery alone is not acceptance.
Safe handover is committed, inventory current and coding sparse selection unchanged.
