# Next-session handover: original car photo-quality work

This is the restart document requested by the owner because repeated conversation compaction was losing context. Read this before continuing. It records the actual working tree, not merely committed work.

## Latest owner cockpit/customization/weapon follow-up

Owner requested a viewable, slightly more realistic cockpit plus car customization and mounted weapons including smoke screen. Main implemented directly: `37228a8` adds free saved native-color finishes, per-owned-car smoke150/EMP250 purchase/mount, actual original canisters/roof emitter and bounded effects/charges/cooldowns; `00605e2` preserves EMP slowdown when cops brake ahead. Canonical profile2 migrates version1 in memory through descriptor-safe validation; same scoped key. New exports GADGETS/customizeCar/fitGadget; optional boolean deploy input. Keyboard Space/E and actual touch Deploy, racing disabled, no invincibility/rewards. Shared fleet/models/vendor unchanged. See [current scope, contract, proofs and previews](slipstream-gadgets.md).

Pure15/15 pass. Ordinary native at37228a8 exit0/189.9259s; strengthened00605e2 exit0/205.6968s/zero recorded errors: earned904 cash without grants, saved/reloaded colors/kit, purchased/mounted both, keyboard smoke and touch EMP with measured police slowdown, pause/race guards and320/390 layouts. External final scratch `slipstream-gadgets-l35mvhrw`; ledgers `slipstream-gadgets-native-{1,2}`. No complete campaign/hardware/release claim.

Separate showcase `2d6a5e0` adds physical radio tuner faces and softer dashboard plastics; actual current Brindle/Pip/390 cockpit images personally opened and saved with `-radio` suffix under `docs/car-photo-previews/`. Visual-only exit0/83.9972s, exact eyes/stable hashes/nonblank pictures/zero recorded errors; scratch `car-studies-visual-r6ki7qix`, ledger `car-cockpit-radio-visual`. Counts Pip29,166/26, Brindle29,378/35, each9 textures/983,040 base RGBA bytes. Still stylized; unchanged20s studio startup gate remains held and was not rerun. This is not driving-cockpit integration. Display cockpit inline rather than the prior unviewable link.

This pass edits existing Slipstream, not new games; no catalog registration, new delegation, downloaded assets or push. Maintenance inventory must be refreshed after the committed game-source changes. Sparse temporarily added only Slipstream for this work; restore assets/docs/scripts before final handoff. Old checkpoints below remain historical, not newer state.

## Earlier resume checkpoint

Owner resumed work after compaction and asked for a preview. Commit **`43e76d6`** completes both formerly dirty model edits: original 256x64 plate maps, Pip mounting/placement, Brindle hatch handle/seam and continuous projector covers. `realism.js` now handles `registration-plate`; no unfinished model edits remain. Persistent stub-canvas geometry/resource check `scripts/test_car_study_materials.mjs` passes two cycles per model: Pip29,164 triangles/25 meshes, Brindle29,376/34; each8 textures/917,504 base RGBA bytes. Real lettering is separately visible in the fresh renders.

Current [reviewed previews and evidence](car-photo-previews/README.md) are from43e76d6, scratch basename `car-studies-visual-sev3_n1x`. Visual-only capture exit0/84.8389s, zero recorded errors, unchanged JS hashes, nonblank images and actual cockpit eyes; Main opened the four committed JPEGs. An earlier capture was interrupted by the user's preview request before saving anything; no completed result is attributed to it. The unchanged20s focused gate exits1/41.1914s on initial first-frame readiness, no recorded errors; post-shutdown snapshot unavailable. Ledger basenames `car-detail-native-1` and `car-detail-visual-preview`. No repeat clears the gate. These pictures still look stylized, not photographic.

**Next:** improve demonstrated remaining geometry/material/lighting defects and investigate cold first-frame cost; keep20s QA unchanged. Do not repeat the obsolete instruction below to finish plates or preserve two dirty model files: they have been completed and committed. No game/fleet/vendor/catalog change, registration, publication or push. The remainder records the earlier handover history, not newer acceptance.

## 1. Start here

- Branch: `feat/overnight-games`.
- Latest implementation commit before this handover: **`562671e5eb907418f23e5381217e871cea84a072`**.
- **Two intentionally preserved, unfinished working-tree edits:** `assets/car-arcade/showcase/pip.js` and `assets/car-arcade/showcase/brindle.js`. Do not reset them, stage unrelated files, or mistake them for verified finished work.
- Latest owner instruction before this handover request: **stop asking permission and execute the photo-quality work directly**. The earlier request for permission for a 60-second visual capture is no longer awaiting an answer. The owner subsequently requested this handover; implementation was paused to write it.
- Immediate goal: improve the existing original **Pip Borough** and **Brindle Borough** studies to photographic appearance, with believable curved bodies, tinted glazing, workshop surroundings and a real physical cockpit camera.
- **The goal is not achieved yet.** Latest reviewed images render correctly but remain conspicuously stylized. Do not call screenshot success, triangle counts or PBR maps “photo quality.”
- **The unchanged 20-second runtime acceptance gate remains held.** The successful longer visual captures do not clear it. No native acceptance run was made after the newest committed rendering fixes.
- No push, registration, new game, live-fleet replacement or driving-cockpit integration occurred in this continuation.

Read `AGENTS.md`, `docs/CODE_QUALITY.md`, this document, `docs/car-photo-quality-plan.md`, `docs/car-cockpit-plan.md`, `docs/car-realistic-studies.md`, then the complete current showcase source and both capture/test scripts. The older plans have not yet been updated with this continuation; this handover is the newer status record.

## 2. Operating constraints

- Sparse checkout remains **assets / docs / scripts**. Missing local `Games/` does not mean absent deployed games. Check Git inventory rather than checking out all games.
- Last measured free space: **2,299,469,824 bytes**; shared filesystem. Check again before operations and stop below 2,000,000,000 bytes. Last `df` reported about 2.2G available.
- Offline-first; no installs, new libraries, CDNs, downloaded photos/textures/HDR/OEM meshes, external runtime requests or generated photography standing in for geometry. Original procedural PBR textures are authorized.
- These are distinct fictional original designs, not renamed OEM replicas or a legal-clearance claim.
- Showcase-only: do not silently replace the 16-car gameplay fleet or install this parked cockpit in either game.
- Keep `Games/Character AI/` read-only, Eaglercraft offline/licensing notes, vendor notices and `/bare/*` disabled. Do not edit compiled portal bundles.
- Explicit owned-path staging only; no `git add -A`, resets/cleans of sibling work, history rewriting or push without authorization. Anonymous commits use `Arcade Worker` with empty author/committer email.
- Genuine Astra delegation, if used, must be actual `openai-codex` / `gpt-6-astra`, independently verified in assistant session metadata. Do not relabel another provider. Disjoint bounded worker paths; workers commit, Main reviews source and actual images.
- After two failed checks, stop/escalate rather than blindly retrying or extending QA waits. The owner does not want routine permission prompts; this does not authorize weakening acceptance or claiming failures passed.
- House UI: local Bungee/Atkinson/system fonts, flat colors, black buttons, cards 6px/buttons 4px, keyboard/focus and at least 44px targets; no UI gradients/glow/neon/glass/emojis/em dashes.
- The full unfiltered pre-push smoke gate and its bounded sparse/storage restoration need renewed authorization; no release gate was run in this continuation.

## 3. Newly committed work

```
562671e fix: isolate workshop reflection capture and reject blank previews
ff5d14b fix: align cockpit dials and capture actual workshop reflections
73806a6 docs: retain photo-quality target and current render failures
88e5e13 fix: preserve live shader programs across car resource handoff
7df09ed test: check generated surface texture lifetime during real car inspection
```

`ff5d14b`:

- Brindle dial faces changed from cylinders to +Z-facing circles, giving upright correct circular UVs. The later real cockpit capture confirms legible upright instruments.
- Pip clear lamp lens made more curved; original fine lens bump texture added to the material decorator and lens opacity reduced. Paint bump removed while retaining roughness detail; workshop surface pattern contrast reduced.
- Whole expensive graphics initialization deferred until a task after document load, not just the first render. Scheduling guards require renderer/current car; the initialization timer is cancelled on pagehide.
- First attempted to generate reflections from the live physically lit workshop and changed shadow mode. This attempt produced black frames despite an exit-0 capture; see the evidence table. Do not treat that intermediate commit as visually accepted.
- Added `scripts/capture_car_studies.py`, a deliberately separate visual-only capture utility.

`562671e`:

- Reflection capture now clones the actual workshop geometry into a **separate scene with fresh basic capture materials**, borrowing only the live garage geometry and color maps. It captures at car-window height. No invented softbox room or downloaded HDR.
- Capture cleanup disposes only its new materials and PMREM generator; borrowed geometry/maps remain owned by the live garage. The resulting environment render target has its own final disposal.
- Restored previously used `PCFSoftShadowMap` mode. Capture-material isolation plus restoring that shadow mode produced valid actual images; the exact individual cause of the preceding black-frame bug was not separately isolated.
- Explicit `ponytail:` comment records the ceiling: diffuse workshop capture, not fully physically lit reflected surroundings.
- Visual capture now rejects blank/black JPEGs using Pillow brightness/variation checks. Existing installed Pillow only; no installation.

The committed base has Pip **29,092 triangles / 24 meshes**, Brindle **28,808 / 33**, garage **4,344 / 13**. Car decoration at this base uses **7 textures / 851,968 RGBA bytes**, garage **8 / 917,504**. A canvas-stub Node check passed finite attributes and car triangle/texture-byte limits before the first new commit; stub checks are not real typography/visual proof.

## 4. Unfinished edits: continue carefully

These edits happened **after** the latest valid capture, and are **not in any reviewed image**:

### `assets/car-arcade/showcase/pip.js`

- Adds fresh `MeshStandardMaterial` named `registration-plate`, with `userData.label = 'PIP 08'`.
- Adds small rounded front/rear plate geometry using the existing rounded helper.

### `assets/car-arcade/showcase/brindle.js`

- Adds the equivalent `registration-plate` material with fictional label `BRD 16`.
- Moves rear handle forward to be visible rather than buried in rear stamping.
- Adds a closed thin hatch seam following the actual rear-cap parameterization, using existing trim material and tube geometry.
- Adds front/rear plate boxes.

**Important incompleteness:** `realism.js` has **no `registration-plate` decorator yet**. Labels are metadata only; current plates will be plain white, not legible plates. Complete the minimal original canvas-map treatment with proper front/rear UV orientation and owned disposal, or deliberately remove only these unfinished plate additions using targeted edits. Do not leave blank plates and claim finished detail.

Last quick checks on the dirty tree:

```
pip 29116 25 meshes; plate material: true
brindle 29344 34 meshes; plate material: true
```

Both dirty model JS syntax checks passed. These counts are under the 30,000-triangle limit but leave limited margin, especially Brindle. **No full finite-buffer/UV/fresh-resource/ground/disposal checks or browser capture were run for these dirty edits.** Plate placement, seam appearance, new texture ownership/bytes and UV orientation still need verification. Do not report the committed-base checks as checking this newer tree.

## 5. Actual capture evidence

Artifacts are external scratch files, not committed preview assets. Locate log/result basenames under the external `circuit-workers` scratch directory; image folders below are in the Hermes scratch cache. `capture.json` inside each image folder records source hashes, errors and snapshots. Use the recorded hashes, not the current dirty tree, to associate images with source.

| Capture | Source | Process result | Actual visual interpretation |
| --- | --- | --- | --- |
| `car-photo-visual-1` | `73806a6` | exit 0, 86.913s | Original current PBR iteration finally seen. Exterior/rear/cockpit inspected for both cars. Issues identified: rotated Brindle instruments, flat lamps, artificial reflections. Still stylized. |
| `car-photo-visual-2` | `ff5d14b` | exit 0, 85.732s | **Visually failed.** Both exteriors black; cabins mostly black. No console errors. The then-script checked frame counters, not image contents, so exit 0 was a false positive for usable pictures. This prompted source repair and blank-image rejection. |
| `car-photo-visual-3` | `562671e` | exit 0, 83.433s | Valid nonblank exterior/rear/cockpit and mobile capture. No recorded errors/external requests, source hashes unchanged, image brightness/variation checks pass. Still not photographic. |

Image folder basenames:

- First: `car-studies-visual-xtxjtt2i`
- Black intermediate: `car-studies-visual-d69uk2c7`
- **Latest valid committed-base capture:** `car-studies-visual-x8j78p6n`

Each folder contains `pip-exterior.jpg`, `pip-rear.jpg`, `pip-cockpit.jpg`, `brindle-exterior.jpg`, `brindle-rear.jpg`, `brindle-cockpit.jpg`, `390-exterior.jpg`, `390-cockpit.jpg`, `capture.json`.

Main personally opened the latest Pip exterior/cockpit, Brindle exterior/rear/cockpit and 390 cockpit. The remaining two latest images were captured but not personally opened in this continuation. Upright Brindle dial lettering and actual cockpit perspective are visible. The bodies still have toy-like flat areas, sparse trim/hardware, visibly simplified cabin surfaces and limited material/lighting depth. Brindle rear appears too blank; the unfinished seam/handle/plate edits were started to address that. Mobile cockpit is real 3D, not a flat dashboard overlay.

Actual camera snapshots at both successful new capture sources:

- Pip local eye `[-0.34, 1.14, 0.16]`.
- Brindle local eye `[-0.36, 1.14, 0.16]`.
- Latest cockpit snapshots: 17 live renderer textures; no refraction, single-pass glass; garage 4,344 triangles/13 meshes; `error: null`.
- Snapshot `triangles` is drawn-frame geometry, **not total factory triangles**; do not equate these metrics.

## 6. Tests and remaining acceptance

Visual utility:

```sh
xvfb-run -a python3 -B scripts/capture_car_studies.py
```

This uses Chromium/SwiftShader, a local temporary HTTP server, real select/buttons/touch, 1280x960 plus 390x844 views, original physical-eye checks, local-only requests/error collection, frozen JS hashes, at least 2GB free space and JPEG total at most 10MB. Readiness/control waits are **60 seconds**; navigation remains **20 seconds**. It is explicitly **not** runtime, performance, rights or photographic certification.

Full focused gate:

```sh
xvfb-run -a python3 -B scripts/test_car_realistic_studio.py
```

Keep every existing assertion and 20-second wait unchanged. Previous gate failures:

1. At `7df09ed`, exit 1 / 49.200s: same-car selection frame readiness exceeded 20s.
2. At `88e5e13`, exit 1 / 41.234s: first-frame readiness exceeded 20s.

Both had no recorded browser errors. Second failure's snapshot was unavailable because Playwright had already exited: `Event loop is closed! Is Playwright already stopped?`. No successful current focused-gate result supersedes these. Earlier cockpit check at `66d81d6` failed actual-eye matching; at `df377cc` navigation exceeded 20s. Old optimized native successes at `2c3cbb8` are older geometry/materials, not current acceptance.

Source changes since those failures are meaningful, but do not prove first-frame or selection cost is fixed. A future bounded current-source gate run is new evidence; do not silently reinterpret the longer capture as that run. Fix failed-diagnostic lifecycle inside Playwright if investigating; do not weaken assertions or blindly run a third identical attempt.

Software rendering is on **aarch64 Cortex-A72**, not N100. Prior diagnostic measured roughly 18s first-frame cost on older source. Target-device FPS is unmeasured.

## 7. ABI and lifetime invariants

Files: `assets/car-arcade/showcase/{index.html,studio.js,pip.js,brindle.js,garage.js,realism.js}`; local Three.js r160 vendor is unchanged.

- Showcase `createCar()` returns a fresh group/resources, forward **-Z**, four actual grounded wheels, ground tolerance ±.015m, at most 30,000 triangles/75 meshes. Distinct from live gameplay factory's forward-Z/shared-cache ABI.
- Preserve root metadata `name`, `wheels`, `front`, `showcaseOnly`, physical `cockpit` eye/target.
- Finite matching position/UV attributes on every merged geometry; factory has no material maps. Viewer `decorateCar`/`decorateGarage` adds fresh original generated maps, with sharing permitted within a root only and exactly-once disposal.
- Dial faces must be physical, upright +Z-facing geometry; map color space sRGB, bump/roughness linear. No global texture cache.
- Studio remains event-driven, DPR 1, ACES/sRGB, 1024 soft shadow map, procedural PMREM and alpha glazing (`transmission=0`, `forceSinglePass=true`). Inside window opacity .12, outside .55 restored.
- Cockpit uses transformed actual eye/target, FOV 62/near .025; exterior FOV 32/near .1 with projected eight-corner fitting. C toggles, Escape returns outside, arrows/buttons/pointer look or rotate, reset centers current mode. View survives car changes. It is a parked study, not driving.
- `window.carStudioSnapshot` is read-only/frozen; cameraLocal derives from the actual camera, framing from projection. Do not counterfeit readiness/framing to pass tests.
- Keep old rendered car resources until replacement renders, then dispose. At most one retired rendered car. Pagehide disposes scene, retired car, environment/renderer and cancels pending initialization/render; BFCache pageshow reloads.
- Live texture acceptance ceiling remains 24; generated-map ownership and lifetime matter more than counting files.

## 8. Broader project state: do not mix into this pass

Catalog remains **115 registered games**, highest id 224; maintenance **122 projects = 115 registered + 7 unregistered**. Unregistered: 2048, Foldwild, Garage Borough, Hextris, QWOP, Slipstream Borough, Slope. New original games were explicitly owner-authorized earlier, but no further new game is authorized by this handover.

- **Slipstream Borough:** existing separate original traffic/police/racing/garage game with 16-car fleet. Historical natural first-place 1200m finish/save/retry/touch evidence; broader purchases/upgrades/police/difficulty/balance acceptance remains incomplete. Private garage owner-code details stay out of help/captures/reports; do not print them here.
- **Garage Borough:** existing original business tycoon. Historical natural buy/repair/sale passed, but concurrent reset preservation failed twice. Commit `7ee3910` replaces blocking reset confirmation with native dialog/storage-event lock; regression remains unrun. See `docs/garage-ui.md` and `scripts/test_garage_ui.py`.
- **Foldwild:** ending/ranks/rematches/schema3 and save/renderer repairs implemented. Pure/fixture successes do not clear flaky genuine mobile Close or natural full campaign/collection/evolution acceptance. Original M2 synchronous-feedback expectation still fails. See `docs/foldwild-polish/{completion-integration,m2-async-check,README}.md`.
- **2048:** partial polish checkpoint `602f76a`; two native failures (tile readiness then terminal loss `.game-over` timeout). Loss/storage-consent behavior unaccepted. See `docs/2048-polish.md`.
- **Hextris:** executable JSONfn save revival, storage fault boundary and mobile pause/help issues remain held; see source-port review docs. Do not delete licensed vendors without evidence.
- Ten source-first genre candidates researched, zero ingestion GO. No speculative original additions.
- No current unfiltered release gate. Historical 115/115 gate at `3b3bc7a` was real but old; does not certify current work or full gameplay/rights/hardware. No push in this continuation.

## 9. Concrete next actions

1. Check disk, Git status/log and sparse list; retain the two dirty model edits. Read the current full source, not only this summary.
2. Personally inspect latest committed-base images in `car-studies-visual-x8j78p6n`; they establish the real shortfalls, not photographic completion.
3. Finish or deliberately remove the incomplete registration-plate work. Verify actual UV orientation, plate placement, Brindle hatch contour/handle, resource freshness, finite attributes, ground/wheels, triangle/mesh limits and texture bytes/disposal. Keep game/fleet/vendor/catalog untouched.
4. Use bounded real captures after source changes and personally open images. Preserve failures, hashes and meaningful distinctions. Do not substitute older images or manufacture photos.
5. Investigate or run the unchanged focused acceptance on frozen current source when appropriate. Do not extend 20-second waits to clear the gate. Stop/escalate after two failures.
6. Update `docs/car-photo-quality-plan.md`, `docs/car-realistic-studies.md`, linked unregistered car maintenance manuals and this handover with truthful current visual/runtime status. They presently lag the new capture work.
7. Commit owned milestones anonymously; no push/registration. Be direct with the owner: show actual results and state what is still stylized or held rather than asking routine permission or claiming “photo quality.”

## 10. Safe restart commands

```sh
df -h / | tail -1
git status --short
git log -6 --oneline
git sparse-checkout list
git diff -- assets/car-arcade/showcase/pip.js assets/car-arcade/showcase/brindle.js
node --experimental-default-type=module --check assets/car-arcade/showcase/studio.js
node --experimental-default-type=module --check assets/car-arcade/showcase/pip.js
node --experimental-default-type=module --check assets/car-arcade/showcase/brindle.js
git diff --check
```

Do not use the generic local URL-existence check against sparse-excluded games as evidence of missing deployed files. Use the existing Git-backed catalog/maintenance inventory tooling. Do not start unrelated gameplay repair or a full checkout merely to resume this car study.
