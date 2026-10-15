# Wings real-jets milestone archive (2026-10-15)

Dated evidence retained from the pre-closeout manual and model contract at
`2d8ba30`. All “current”, “pending”, “unchanged”, “next” and imperative wording
below describes its individual historical milestone, NOT current acceptance.
The retired Astra geometry and early opaque-canopy jets are not current assets.
Latest contracts: [Wings manual](../games/232-wings.md) and
[models](../../../Games/Wings/docs/models.md). Latest full gate remains
124/125, exit 1, HOLD; earlier 122/125 failed and is historical. No rerun.
Original relative links in the snapshots use their original document locations;
external evidence paths are normalized to relative labels only. No receipt or
hash evidence was discarded.

## Archived maintenance manual

# Wings

<!-- maintenance-game: Games/Wings -->

## Identity and status

Registered as catalog **232**, entry `Games/Wings/index.html`. Static offline adaptation of anomalyco/arcade Wings at `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. The historical `unregistered-wings.md` path now forwards here. Direct owner ingestion order despite missing upstream LICENSE. Registration is not rendered-flight or publication acceptance.

## Implementation map

Vite-built modules in `assets/`, local GLB models in `models/`, local fonts and OFL notices in `fonts/`. `port.patch` records staging changes, including the renderer boundary, menu/CSS, offline adapter and verification sources. Apply it from the pinned upstream repository root, then build `games/wings` with Bun and the relative-base Vite configuration. Build remains Vite-only by operator instruction; no typecheck PASS is claimed.

Inspected: entry/main, scene host, game-session lifecycle, lobby, pause/spawn, targeted HUD copy/CSS, loopback regression. The flight/combat/room engines, Three internals, world/material shaders and models were not rewritten. This is not an exhaustive shader, engine or asset-rights audit.

## Gameplay and controls

Solo flight uses zero AI aircraft, but enemy fleet guns remain active. Play with bots uses two teams and normal AI skill. Custom setup reuses upstream configuration controls for bots, skill, teams, pilot capacity, score and time limits. Start always requests `mode: offline` and `listed: false`. Match rules remain upstream Fleet Strike rules; exposing a score setting does not invent a new scoring mode.

Choose among seven aircraft with the hangar menu or keys 1-7 (6 F-15-style, 7 F-35-style). Custom setup's Aircraft row selects the initial real spawn after the renderer gate; Solo and bots retain the hangar. Default W/S throttle, arrows pitch/turn, A/D roll, Q/E full roll, Shift boost, mouse steering and weapons. Controls lists the selected upstream input scheme. Keyboard/mouse required; narrow-screen menu support is not touch-flight support. Visible Back to menu uses the existing session leave path. Escape/pointer-lock gameplay behavior still needs supported-GPU acceptance.

## State and persistence

Local room state is in memory. Settings use `wings.settings`; automatic quality uses `wings.autoQuality`. Retry with Low saves the existing Low preference and reloads. Back to menu disposes the local session; starting again creates a new room. Spawn and pause listeners are now disposed on exit, rather than surviving detached UI roots. No account, remote transport, fixed-seed override or online invitations.

## Dependencies and provenance

See `Games/Wings/CREDITS.md` for source URL, revision, live URL, missing-license qualification and owner order. Retained Three.js 0.186.0 MIT and font OFL notices do not establish rights to the game/models. No new runtime third-party loads or dependencies. Existing upstream art/typography preserved.

Fleet lane1 (`39f4ef3`) added two operator-approved, original AI-generated
procedural models: `astra-interceptor.glb` (46,840 bytes, 328 triangles) and
`astra-trainer.glb` (55,712 bytes, 368 triangles), each below 200,000 bytes.
See `Games/Wings/docs/models.md` for hashes, provenance qualifications, -Z forward/
+Y up/+X right orientation, scale 1 and named anchors. No third-party model input
was used according to the generator receipt; that is not a universal rights
guarantee and does not resolve Wings' missing license. Follow-up task 2 integrates both into the custom picker, spawn protocol, simulation,
render descriptors, camera and audio maps. See the model contract for actual modest
handling differences and retained fighter rules. Standard Three historical previews
are not Wings material acceptance. Native flight, cockpit and propeller acceptance
remain held; the new ordinary-input simulation regression passes both kinds.

## Audit findings

Phase 1 observed WebGL2 shader validation errors and HUD-only flight with zero draw calls. Phase 2 now waits for a world-ready scene draw before permitting a session, captures Three's WebGL compiler/linker logs, stops the animation loop on shader/scene/device failure, and displays a persistent diagnostic dialog. Zero draws and first-draw timeout also fail closed. The Low retry uses the upstream preference, not replacement materials or a renderer rewrite.

**Flight shader/driver root cause remains unresolved.** Fresh software Low/Balanced probes warned about missing UV attributes, then screenshot/close operations hung. The shader failure could not be isolated within the bounded attempts. A GPU-driver stall can also delay JavaScript timers; the timeout is not an independent watchdog. No WebGPU or WebGL2 rendered-flight PASS is claimed. The diagnostic dialog was verified with deliberately unavailable GPU contexts, not as proof of reproducing every shader failure.

The follow-up removes a proven lifecycle defect: `main.ts` unconditionally called `bootScene()` after menu paint, starting world streaming, context creation and shader work before any flight request. Now the existing common `start()` path alone boots the scene and still awaits its first real draw before creating a session. Initial menu/Controls/Settings need no GPU. First-launch automatic quality benchmarking moves to the first successful return to the menu, where a live backdrop exists; its hardware behavior remains unverified. No renderer, shader, quality threshold or smoke filter was replaced.

Mobile spawn now stacks the list and detail in a real scrolling container. HUD radar/map sit below weapon labels. Decorative gradients and game-facing em dashes were removed; functional compass ticks/fades and spotting masks remain. Browser theme preference does not recolor the retained upstream dark game shell.

## Safe iteration

Patch pinned staging source, rebuild, replace only Wings dist files, and regenerate `port.patch`. The follow-up received the clean pinned source read-only and applied the complete previous patch to an external 9.3 MiB staging tree, with cached dependencies and public assets symlinked rather than installed/copied. Bun with cached Vite 7.3.7 rebuilt the source; regenerated `port.patch` passes `git apply --check` against the pin. Source recovery is no longer a blocker. Spawn-framing/navigation/failure-copy polish remains separate. Task 2 subsequently integrates the two authorized Astra aircraft without changing the task 1 lifecycle boundary. Do not re-fetch upstream or hand-edit bundles. The lane1 GLBs remain byte-preserved, with orientation contract in `Games/Wings/docs/models.md`; task 2 now supplies selection, flight tuning and provisional cockpit placement. Trace old hashed asset consumers before removing stale bundles. Keep notices and regression sources. Never restore worker/network services, edit minified output, or claim simulation/UI fixtures establish native flight. The pre-gate documentation lane reconciles inventory after committed follow-up source/model-doc changes; this does not lift rendering or rights holds.

## Verification

Phase 2 shipped checks:

- `node Games/Wings/verification/solo-check.mjs`: ordinary-input takeoff from y=22.2 to y=1459.632; speed 177.720; fresh session at time 0; ordinary dive crashed at 4.0167 seconds; live respawn at 14.0167 seconds. No position/health grants. Rendering not tested.
- Serve repository root on port 8938, then `python3 Games/Wings/verification/check-browser.py --out "$EVIDENCE"` with an external evidence directory. Uses existing Playwright/Chromium; no dependency install. Tests unavailable-renderer dialog, Low retry/reload, custom menu controls, actual spawn-component listener cleanup and scrolling, and explicitly synthetic HUD layout. Four desktop/mobile and light/dark preference combinations; fixture screenshots are not gameplay.
- `check-ui.html` is the renderer-free regression fixture, not a game mode. Its title becomes `PASS: Wings UI fixture` only after quick-launch and disposed-listener assertions.

2026-10-15 lane2 reran the solo regression and expanded `verification/check-browser.py` (also mirrored into `port.patch`). The browser check now uses real menu clicks to assert all three launch routes (Custom Start, Solo flight, Play with bots) remain fail-closed after dismissing renderer diagnostics: lobby visible, busy overlay hidden, no session UI. It also checks Controls/Settings and Escape return. All four viewport/theme cases passed; this deliberately disables GPU contexts and does not reproduce shader stalls or certify flight. Fresh screenshots and `browser.json` have the external evidence label `trg-fleet/lane2/`; see [lane2 audit](../audits/fleet-2026-10-15-lane2.md). Its 118-versus-125 inventory error was historical; lane7 has now added the missing Wings record and canonical manual path.

Historical screenshots/probes have the external evidence label `phase2/wings/`. Inspected mobile spawn/detail, HUD fixture, custom setup and renderer-error screenshots, plus desktop error/layout screenshots. Functional scroll and non-overlap are UI-only evidence. Real flight, aircraft visibility, native combat/audio, crash-respawn, pointer-lock exit and fresh rendered restart remain held. Those focused checks were not the full catalog gate; no push occurred.

Fleet lane1's structural/deterministic GLB check and four isolated desktop/mobile
light/dark Three 186 renders passed, without external requests or console/page
errors. Main reviewed two model previews and judged silhouettes distinct; this
is not Wings flight/material acceptance. Evidence label: `trg-fleet/lane1/`.
Fleet lane2 changed only tests and the matching `port.patch` hunk, not Wings
runtime/gameplay. The full [lane6 gate](../audits/fleet-2026-10-15-lane6.md) later
logged Wings `ok` but **failed 122/125 overall**. [Triage](../audits/fleet-2026-10-15-triage.md)
reproduced native context-creation stalls in Server Survival/Astray after Wings;
each passed independently and their pair passed without Wings. Underlying cause
remains unresolved. Do not translate a short Wings load window into first-draw
or flight acceptance.

Follow-up task 1: the unchanged native Wings -> Server Survival -> Astray smoke sequence reproduced **1/3, exit 1** before the source fix and passed **3/3, exit 0** twice afterward (including the final build). `verification/check-context-sequence.py` leaves that same-browser regression runnable with a 90-second outer process bound and port 8982; individual runner timeouts/filters remain unchanged. It browses the Wings menu, not flight. The updated unavailable-GPU UI test passes all four viewport/theme cases after clicking Play, including Low reload, all three fail-closed launch routes, menu navigation and the existing spawn/HUD fixtures. The ordinary-input simulation regression passes unchanged. Menu/error screenshots were inspected in desktop/mobile and light/dark preference combinations; upstream dark styling remains. See [follow-up evidence and rebuild instructions](../audits/fleet-followup-wings.md). The failed full 122/125 release gate is not superseded. Inventory refresh belongs to the coordinator.

Task 2 verification: source Vite rebuild and clean pin patch applicability pass;
`node Games/Wings/verification/astra-check.mjs` checks both selectable kinds through
offline config/spawn/snapshot/simulation and GLB descriptors/camera math. Ordinary
input reaches y=1597.911 / 1275.162 and speeds 190.323 / 161.557. Original solo and
immutable-model checks pass. Actual custom picker plus renderer-free request/spawn
fixture and all four unavailable-GPU cases pass. Shared-browser sequence initially
returned 2/3 (Astray reload ERR_ABORTED); two unchanged retries returned 3/3,
including final build. Keep that transient failure in the evidence, not a clean
all-attempts claim. Converted-material preview timed out at its 40-second outer
bound. No rendered-flight PASS. Evidence/rebuild recipe:
[fleet follow-up](../audits/fleet-followup-wings.md).

Current pre-gate integration: task 1 is `3b9e92d`, task 2 is `d435f12`.
The task 2 worker committed before its 20-minute deadline but reached that limit
before final output; task logs remain available. Main independently passed Astra,
solo, immutable-model and static SEO checks and reviewed desktop-dark/mobile-light
picker screenshots: both labels fit. Failure toast/footer remains crowded; no
polished-flight claim. This documentation lane reran the nonbrowser checks and
refreshes inventory only after all Games changes are committed. The generated
Astra regression was 884,415 bytes at `d435f12`. A subsequent Bun 1.4.3
`--minify` rebuild of unchanged source reduces it to **539,850 bytes**, test-only,
with the existing Three MIT notice unchanged. All three machine-specific path
comments are absent from current output; original artifact history is not remediated.
Astra output is byte-identical to the old regression's stdout; original solo,
immutable-model and syntax checks pass. Global follow-up diff whitespace still
fails: 21 regression shader-literal findings and the untouched runtime finding.
Current-change diff check passes, not the baseline range. Exact locations and
rebuild command are in the follow-up recipe. No source logic or GLBs changed;
inventory reconciliation after this output commit belongs to the coordinator.
Do not hand-edit bundles or call a scoped check globally clean. See the
[pre-gate handover](../audits/fleet-followup-handover.md) for findings, identity map
and pending ticket `1792052078368`. Fresh full gate is next, not accepted yet.

### F-15-style geometry milestone (integration PENDING)

The original stdlib-only `verification/generate-models.py` now also produces
`models/f15.glb`: gear-up, twin engines/nozzles, upright twin tails, swept
shoulder wings, rectangular intake mouths and opaque bubble canopy. No downloaded
mesh/image input or dependencies. Shared indexed exterior contour/airfoil vertices
include normals and UV0; identity root, -Z forward/+Y up, named cockpit, gun,
wing, stabilizer and exhaust anchors. Legacy functions and GLBs remain unchanged.
Actual serialized asset: **50,040 triangles / 26,510 vertices / 1,171,544 bytes**;
SHA-256 `359341d7d9088f46f0efd98c25ce68bdaf0c3e4e27835d8f1993355238008e6d`.
Two independent generations match the file byte-for-byte. Geometry checks pass
finite/unit normals, winding, index bounds, UV0 and no duplicate/degenerate
triangles; existing legacy model check passes (exit 0). First generation exceeded
the byte budget; reduced nozzle tessellation now passes both strict budgets.
External evidence label: `wings-f15-evidence/` (generation and geometry logs).

**Pending:** picker/runtime/descriptors, model-contract documentation, converted
material/visual review and supported-GPU flight/load-time acceptance. This is
approximately 2.8 times the heaviest existing selectable aircraft triangle count,
not a measured loading-time result. No runtime integration, check-models change,
new game, full-gate run or push. Existing rendering/rights/release holds remain.
Maintenance check is blocked until committed-source inventory refresh by the final
docs worker; this milestone deliberately does not refresh inventory.

### F-35-style geometry milestone (integration PENDING)

Added original stdlib-only `f35()` to `verification/generate-models.py`, reusing
unchanged `f15_patch` indexed surface writing. `models/f35.glb` has a broad blended
single-engine body, trapezoidal wings, canted twin tails, diamond intake lips,
opaque canopy, conforming underside bay seams and one nozzle, gear-up. Gray
opaque materials, normals/UV0, identity root and required named anchors are present.
No reference mesh/image, download, dependency or runtime integration was used.
Actual serialized asset: **40,312 nondegenerate triangles / 21,662 vertices /
962,976 bytes**; SHA-256
`3b0e859a6aaac303e20e95ca5c7c26b620ecb95f9e8f76d7916aabae0f0d69fe`.
Generator assertions check serialized budgets, finite attributes, unit normals,
face winding against averaged vertex normals, indices and duplicate/degenerate
faces. Initial per-vertex winding assertion rejected the swept stabilizer;
face-averaged winding passes. Two completed generator runs and actual output-byte
comparison pass (exit 0); F-15's recorded hash and both legacy outputs are
unchanged. Legacy checker and scoped diff check pass (exit 0). External evidence
label: `wings-f35-evidence/`, including `generation-2.log` and `legacy.log`.
Maintenance checker exits 1 for stale inventory; refresh is deliberately deferred
to the final docs worker. Picker/descriptors, model-contract update, visual review,
converted materials and supported-GPU flight/load-time acceptance remain pending.
Triangle count is about 2.24 times the 18,028-triangle selectable YF-12, not a
measured loading-time result. No screenshots, new games, full-gate run or push;
existing rendering/rights/release holds remain unchanged.

### Recovered F-15/F-35 integration milestone (2026-10-15)

Recovered the interrupted source-built runtime replacement, without changing any
model or generator. Seven-kind hangar keys 6/7 and Custom `StartRequest.aircraft`
now select `f15`/`f35`; the renderer-free fixture verifies real loopback spawns.
Original five specs/handling entries and bot weights remain unchanged; new weights
are zero. F-15 cruise/boost 155/215, corner 105/1.2, roll 4.6; F-35 130/180,
corner 85/1.3, roll 4.2. Full response/camera values are in the current integration
section of `Games/Wings/docs/models.md`. Both descriptors are gear-up, without
propeller/pivot/store animation, and use existing gun anchors and loading paths.
No new external runtime loads or dependencies.

Fresh cached Vite build and clean-pin patch applicability pass (exit 0). Deployed
HTML/chunks match rebuilt output. Original solo regression passes (exit 0).
Unavailable-GPU browser check passes all four desktop/mobile/theme cases (exit 0),
including Custom labels, spawn hotkeys, listener cleanup and fail-closed launch
routes. Its bounded HTTP server terminates in `finally`. Prior interrupted UI
attempt failed with connection refused, not a gameplay failure or PASS. External
evidence label: `wings-jets-recovery/` (build, solo, UI, patch and consumer logs;
screenshots under `ui/`). Retired hashed chunks were traced through cached Git
consumers and rebuilt imports; historical audit mentions remain preserved.

**Pending:** 40+ material assignments per jet, material/visual exploration, fresh
jet-specific `astra-check` source/bundle regression, native flight/cockpit/load-time
acceptance and final Standards/provenance cleanup. No new Astra-regression PASS.
Existing Astra regression remains historical and does not exercise these jets.
Current full-fleet release result remains **124/125, exit 1, HOLD** (earlier
122/125 is historical); neither is superseded by this targeted milestone. No
full-fleet rerun, new game, model deletion, inventory refresh or push. Inventory
reconciliation remains with the final documentation worker after source commit.

### F-15 material enrichment receipt (2026-10-15)

Only the original generator and F-15 GLB changed. The transparent canopy now
covers an omitted upper-skin aperture with sill/frame, cockpit tub, coaming,
seat and bulkheads. Separate radome/belly/access panels, conforming control
seams, flush gear-door panels, generic `livery_` wing/fin strips, pitot/antenna,
and collar/petal/recess exhaust geometry reuse **10 material definitions across
112 actual visible primitive assignments**. Named wing/fuselage/centerline weapon
anchors are attachment coordinates only, not a loadout or physics change.
No textures/images, skins, animations, external loads, downloaded/copied mesh
geometry, shader or lighting edits. Gear remains up.

Actual serialized F-15: **43,392 triangles / 25,483 vertices / 1,185,940 bytes**;
SHA-256 `5787ebe4d03fc70ce08036ad1a37a7eff6ee1a0b73d132939a27cb02964ba0f8`.
Moderately reduced curved tessellation makes room for real parts within the
40k-55k / strict 1.2 MB limits. The obsolete immutable F-15 assertion is removed;
determinism, finite/unit attributes, winding, nondegenerate/unique triangles,
index bounds, material usage and budgets are checked by the generator. F-35
remains byte-identical at SHA-256
`3b0e859a6aaac303e20e95ca5c7c26b620ecb95f9e8f76d7916aabae0f0d69fe`;
both legacy GLBs are unchanged.

Reference material/node inventories measured F/A-18 **151 assignments / 10
unique material values**, YF-12 **123 / 12**, A-10 **166 / 12**, all zero textures.
Their stored definition counts equal their assignment counts; our palette is
explicitly reused. Inspected staging `render/aircraft.ts`, `toon.ts`, `scene.ts`:
opaque colors bake/merge into paint and metal, `livery_` ancestry selects team
paint, alpha transparency selects glass, emissive selects glow/nav. Current
`CREASE_ANGLE` is **55 degrees (about 0.960 radians), not 0.78**. Existing storm
materials, ACES and thumbnail lights remain untouched. Assignments are not a
promise of that many Wings draw calls.

Two generator runs and matching logs, serialized structural checks, unchanged
legacy checker and scoped diff check pass (exit 0). Four bounded external
standard-Three 186 previews pass (exit 0), desktop/mobile front/rear in light/dark
preferences, F-15 alongside F/A-18, zero console/page errors or external requests.
F-15 fixture draws 112 calls / 43,392 triangles. This is **not Wings converted
material, thumbnail, cockpit or native flight acceptance**; orchestrator owns
visual judgment. External evidence label: `wings-jets-materials/` (per-material
JSON inventories, deduplicated summaries, generation logs, `browser.json`,
`light-1100.png`, `dark-1100.png`, `light-390.png`, `dark-390.png`). No tracked
fixture changes. Maintenance checker remains exit 1 for pre-existing stale
inventory; final inventory/Standards/model-contract cleanup and F-35 enrichment
belong to subsequent tasks. Full-fleet **124/125 HOLD**, rights and hardware holds
remain; no new games, full-gate run, legacy deletion or push.

### F-35 material enrichment receipt (2026-10-15)

Original stdlib generator now gives F-35 a genuine upper-skin cockpit aperture,
transparent framed canopy, tub/floor/seat/coaming/bulkheads, radome/belly/access
panels, leading-edge and control strips, restrained `livery_` marks, flush bay
and separate gear-door markings, and one collar/24-petal/recess nozzle. The old
inner intake lip at x=.83, z=-3.12 intersected the broad body (radius >1.4);
forward/outboard diamond mouths now connect through tapered shoulder ducts.
Weapon-bay/wing/exhaust nodes are attachment coordinates, not simulated stores.
Gear stays up. No textures/images, skins, clips, copied mesh input, dependencies,
runtime, renderer, tracked preview or other verification-file changes.

Actual F-35: **42,760 triangles / 25,285 vertices / 1,173,404 bytes**, **109 visible
primitive material assignments / 10 definitions / 10 unique values**. SHA-256:
`5e3cd65a8fa1c890907878b3219c863cfdfe4f63bc6da638b846411a5f5caafb`.
F-15 remains **43,392 triangles / 25,483 vertices / 1,185,940 bytes**, 112 assignments
and 10 definitions, byte-identical at
`5787ebe4d03fc70ce08036ad1a37a7eff6ee1a0b73d132939a27cb02964ba0f8`.
Both legacy GLBs also remain unchanged. F-35 is about 2.37 times YF-12's triangle
count; load-time and hardware cost have not been measured.

Read the F/A-18, YF-12 and A-10 material-by-material summary receipts and inspected
staging `render/aircraft.ts`, `toon.ts`, `scene.ts`: source alpha routes to shared
Wings glass (opacity .62), not preservation of authored .38; `livery_` routes to
team paint; opaque values remap to vertex colors and merge into paint/metal
batches. Creased normals use 55 degrees. Storm environment, procedural weathering,
clearcoat, tone mapping and thumbnail lights remain untouched. Source assignments
are not runtime draw-call counts; standard Three does not exercise this pipeline.

Two final generator runs, in-run byte comparisons, cross-run file hashes and full
serialized finite/unit-normal/winding/index/duplicate/degenerate checks pass for
both jets (exit 0). Legacy checker and scoped diff check pass (exit 0). Obsolete
F-35 immutable hash/opaque-only assertions are replaced with meaningful material
usage and intentional-glass checks. Six bounded standard-Three previews pass
(exit 0), comparing F-15/F-35/F/A-18 front/rear and light/dark undersides, plus
mobile front/rear; zero console/page errors or external requests. Worker inspected
all views: exposed intake mouths, cockpit parts, canted tails and single nozzle
read separately; underside bays remain flush, with fine seams pixel-limited at
comparison scale. Preview server terminates. Main visual judgment and Wings
converted-render/UI/native-flight acceptance remain held.

External evidence label: `wings-f35-materials/` (`generation-1.log`,
`generation-2.log`, `hashes-1.txt`, `hashes-2.txt`, per-jet material JSON,
`browser.json`, six PNGs, `preview.py`, `preview.html`, `legacy.log`). Maintenance
checker remains **exit 1: inventory stale**, observed before changes; final
Standards/model-contract/inventory cleanup belongs to the next task. Full-fleet
**124/125 HOLD**, rights and hardware holds are unchanged. No new games, legacy
deletion, full-gate run or push.

### Jet descriptor and source-built CPU regression receipt (2026-10-15)

Updated only the two new `render/aircraft.ts` descriptors in authored staging,
then rebuilt Vite runtime assets and `port.patch`. Gun anchors are preserved;
F-15 now exposes wing-inner/outer, fuselage, centerline and twin exhaust nodes;
F-35 exposes wing, bay and single exhaust nodes. These are attachment metadata,
not additional weapons, stores, loadout or animation. No shader, material,
physics, generator or GLB edits. Actual converted model bounds are F-15
**13 × 4.315000 × 18.5**, F-35 **10.600000 × 3.305779 × 15**; F-15 placeholder
and shadow length now include the pitot at 18.5 instead of 18.15.

The compatibility-named `verification/astra-check.ts` now exercises `f15` and
`f35`; its `.mjs` is rebuilt with cached Bun `--target=node --minify` (921,355
bytes), never hand-edited. Checks cover actual current hashes from the two
material receipts above, offline/unlisted zero-bot config, invalid-kind rejection,
real spawn and wire snapshots, ordinary-input takeoff/turn, unchanged original
five cruise/boost pairs, strict triangle/byte budgets, 40+ assignments, no
textures/images/skins/clips, identity roots, no animated gear/prop/stores,
all attachment nodes and finite cockpit math matching each GLB cockpit marker.
Takeoff reaches y=1383.761507 / 1258.210354 and speeds 208.696264 / 175.950496.

The same runnable regression uses a test-only Node local-fetch adapter and the
**existing exported** `createAircraftView`, `aircraftReady`, `aircraftStats` and
`preloadAircraft`. It runs the actual GLTFLoader and template conversion without
a GPU, export hooks or a replacement converter. Every jet triangle survives;
real view anchors match GLB translations. Source and converted counts:

| Selectable model | Source meshes / material objects | Converted triangles / batches | Local load + conversion + view ms |
| --- | ---: | ---: | ---: |
| F/A-18 (`fighter`) | 151 / 151 | 17,288 / 8 | 461.560 |
| YF-12 (`blackbird`) | 123 / 123 | 18,420 / 8 | 284.415 |
| F-15 | 112 / 10 | 43,392 / 4 | 295.507 |
| F-35 | 109 / 10 | 42,760 / 4 | 202.183 |

Both jets have one bone and four verified paint/metal/livery/glass batches.
F-15 batch triangles: **37,476 / 2,908 / 704 / 2,304**; F-35:
**36,488 / 3,072 / 896 / 2,304**. Converted glass opacity is .62.
Reference totals include each existing converter's 392 procedural flame triangles
above its GLB triangle count. Source material counts are material objects, not
unique values or rendered draw calls. The table reports one sequential
cold-template sample per kind in the identical fixture, including local file I/O,
GLTF parse, conversion, view setup and event-loop wait. It is **not isolated parse
or conversion timing**, statistically controlled comparative performance, network
loading, GPU upload, shader compilation or rendered-flight acceptance. JIT/cache
and order effects prevent interpreting the lower F-35 time as faster hardware
loading. No AC-130 reference was used.

External evidence label: `wings-jets-regression/`: `astra.log`, `bun.log`,
`vite.log`, `solo.log`, `patch.log`, `consumers.txt`, `retired.json`,
`patch-diff.txt`, `diff.log`, `maintenance.log`. Bun build, actual jet/CPU
regression, Vite build, clean-pin patch applicability, original solo regression,
regression syntax, all ten runtime chunk syntax checks and 125-entry catalog
schema/unique-ID/tracked-URL validation each exit **0**. Retired hashes were
traced across cached tracked content (including sparse content), then checked
absent from rebuilt HTML/chunk imports before deletion; consumers were only the
replaced Wings runtime chunks and entry. Initial per-hash consumer scan hit its
20-second outer bound; one combined full tracked scan completed successfully.
`git diff --check` exits **2** for inherited generated shader-literal whitespace
in the rebuilt test bundle; no bundle surgery or shader rewrite was used.
Maintenance checker exits **1**, requiring committed-source inventory
reconciliation by the final documentation lane. No inventory refresh here.

No browser/GPU rerun or screenshots in this CPU-first task. Existing UI evidence
is historical, not a new visual PASS. Full-fleet **124/125 HOLD**, missing-license,
native rendering/cockpit/flight and hardware/load-time holds remain. No new games,
legacy deletion, dependency install, full-fleet rerun or push. Pinned source and
cache remain read-only; no HTTP server was needed. Final model contract, Standards
and inventory cleanup remain assigned to the coordinator/documentation lane.

### Legacy model migration cleanup receipt (2026-10-15)

Removed only retired `astra-interceptor.glb` / `astra-trainer.glb` and their
`interceptor()` / `trainer()` generators. Before deletion, full cached Git
reference scans (including sparse content) and constructed-path inspection found
live consumers only in the replaced generator/checker/preview. The preview's
`../models/astra-` plus name construction was explicitly traced and migrated.
Current runtime descriptors use `file: "f15"` / `"f35"`; lobby specs use
`models/f15.glb` / `models/f35.glb`. Historical documentation is retained, not
interpreted as a runtime consumer. All solid/loft/slab/box helpers still have jet
callers. Geometry, `.finish()` and its historical generator identifier are
unchanged; runtime, CPU regression bundles, patch and model contract are untouched.

One shared serialized validator replaces duplicate F-15/F-35 checks. Both the
standalone generator and committed-file checker enforce hard per-jet triangle
budgets, strict <1,200,000 bytes, >=40 assignments, complete material use, glass,
GLB chunks/buffer/accessor bounds, finite attributes, unit normals, winding,
unique/nondegenerate faces, valid indices/tree, identity root and orientation,
and no external resources/textures/images/skins/clips. The checker compares actual
committed bytes with two fresh generations. Unchanged measured outputs:

| Model | Triangles | Vertices | Bytes | Assignments / unique material values |
| --- | ---: | ---: | ---: | ---: |
| F-15 | 43,392 | 25,483 | 1,185,940 | 112 / 10 |
| F-35 | 42,760 | 25,285 | 1,173,404 | 109 / 10 |

Hashes remain those in the material receipts above. Generation and structural
checks each passed twice (exit 0); existing `astra-check.mjs` and `solo-check.mjs`,
Python/preview/CPU-script syntax and scoped `git diff --check` passed (exit 0).
Tracked isolated standard-Three preview now loads only both jets and asserts
exact model/call/triangle counts. Browser output: `PASS: 6 isolated model renders
(desktop/mobile, light/dark, underside); zero console/page errors or external
loads. Not Wings renderer acceptance.` Its 115-second alarm bounds the process;
owned HTTP server closes in `finally`. Six fresh screenshots inspected: distinct
silhouettes, twin/single nozzles and dark flush bay panels are visible; fine seams
remain pixel-limited at comparison scale. No new native-flight acceptance.

External evidence label: `wings-migration-cleanup/` (cached consumer scans,
constructed-path/helper trace, generation/structural logs, CPU logs, browser JSON
and six PNGs). Evidence is under 1 MB; no dependency install. Maintenance check
exits 1 for stale inventory, already present before cleanup; final inventory,
Standards and model-contract reconciliation remain assigned to the final docs
task. No games added (catalog remains 125), full-fleet rerun or push. Existing
**124/125 HOLD**, rights and native hardware/rendering holds remain unchanged.

## Future outlook

On supported hardware, isolate the fallback shader/compiler failure and verify first scene, takeoff, turning, combat, crash/respawn, back-to-menu and a fresh session. Preserve the honest failure boundary while doing so. Resolve redistribution rights before release; do not replace upstream flight with fabricated gameplay to satisfy a render gate.


## Archived model contract

# Astra aircraft: model provenance and integration contract

## Scope and provenance

The operator explicitly approved **two AI-generated Wings aircraft models** for
this fleet run. These are original procedural low-poly geometry authored by
**openai-codex/gpt-6-astra**, using the Python-standard-library generator
`../verification/generate-models.py` (generator identifier: Wings astra geometry
generator v1). No third-party model, texture, image, traced reference, or copied
mesh was input. Existing Wings files were inspected only for loader, coordinate,
scale and node conventions. These are fictional aircraft, not branded replicas.

No additional third-party asset-license requirement was identified for these
new geometry files because they contain no third-party asset input. This is
**not** a guarantee of copyright ownership, copyrightability, non-infringement,
or unrestricted rights in every jurisdiction. It does not resolve the existing
upstream Wings game's missing-license qualification. Existing Three MIT and
other upstream notices still apply to their respective components.

| Asset under `Games/Wings/models/` | Bytes | Triangles | SHA-256 |
| --- | ---: | ---: | --- |
| `astra-interceptor.glb` | 46840 | 328 | `4b718b8b7fe0c32c85adb373b421dc08e4500bef4ae87f82c62fcba5ca4bf83e` |
| `astra-trainer.glb` | 55712 | 368 | `98f01e24c65201e70da94ceaf3638555880ed9ecea1595dcb082e2ed490c7b1d` |

Generator SHA-256:
`a0a219230de1ff48b92d34d570737e982f599f8a0d22e01c352046a44e43d4fc`.
Generation is deterministic. Both assets are below the strict 200,000-byte limit.
No textures, external buffers, compression decoders, skins or baked animation
clips are required. Each mesh includes indexed triangles, flat outward normals
and UV0. Root transforms are identity.

## Current F-15/F-35 integration milestone (2026-10-15)

This receipt supersedes the historical Astra runtime integration below. Slots
6/7 now select `f15` / `f35`, labelled **F-15-style** / **F-35-style**, in the
hangar and Custom `StartRequest.aircraft`. Original five kinds and bot weights
are unchanged; both new bot weights are zero. Models and generator are unchanged
by this integration. These are original procedural Astra-authored approximations,
not downloaded meshes or engineering replicas; existing rights qualifications stand.

| Kind | Cruise / boost m/s | Corner speed / rate | Roll / yaw-turn rad/s | Pitch / roll / yaw response | Cockpit eye / pitch | Chase distance / height |
| --- | --- | --- | --- | --- | --- | --- |
| f15 | 155 / 215 | 105 / 1.2 | 4.6 / 1.05 | 12 / 17 / 9 | (0, 1.05, -4.9) / +0.02 | 28 / 6 |
| f35 | 130 / 180 | 85 / 1.3 | 4.2 / 1.15 | 12.5 / 16 / 9.5 | (0, 1.08, -4.1) / +0.035 | 25 / 6 |

F-15 has higher speed and roll rate; F-35 has lower corner speed and higher
corner rate for tighter turns. Both inherit fighter stall 55, radius 8, HP 450,
weapons and remaining physics. Both descriptors have empty pivots, stores,
spinners and afterburners; no propeller or landing-gear animation. Gun anchors
resolve to `gun_muzzle`: F-15 (1.03, 0.27, -3.9), F-35 (-0.95, 0.53, -3).
Placeholder length/span and shadows are 18.15/13 and 15/10.6 respectively.
Cockpit coordinates match the GLB markers; native visibility remains unaccepted.

Fresh Vite build, original solo regression and four unavailable-GPU UI cases
pass. UI fixtures exercise actual Custom requests/loopback spawns and keys 1/6/7,
not rendered flight. Evidence label: `wings-jets-recovery/`. The old
`astra-check.ts`/`.mjs` are deliberately deferred and do NOT certify these jets.
40+ material assignments per jet, transparent canopy/interior work, broad visual
exploration, converted-material review, load-time measurements, new jet simulation
regression and final provenance/Standards cleanup remain pending. No native flight
or new Astra-regression PASS is claimed.

## Historical integration status (follow-up task 2)

Both aircraft are now wired into offline Custom setup and the seven-aircraft
hangar (keys 6/7). Custom selection is a local `StartRequest.aircraft`, not a new
room/network setting: after the unchanged renderer/first-draw gate, the session
sends the existing validated `spawn` message. Solo/bot launch routes retain their
hangar. Unknown kinds return an error. The original five tuning entries and bot
selection weights are unchanged; Astra bot weights are zero.

Actual arcade handling relative to fighter:

| Kind | Cruise / boost m/s | Corner speed / rate | Roll / direct yaw-turn rad/s | Pitch response | Cockpit eye / pitch |
| --- | --- | --- | --- | --- | --- |
| Interceptor | 145.8 / 199.8 | 99.36 / 1.034 | 3.76 / 0.9024 | 10.34 | (0, 1.35, -3) / +0.02 rad |
| Trainer | 121.5 / 166.5 | 82.8 / 1.188 | 4.32 / 1.0368 | 11.88 | (0, 1.35, -0.65) / +0.035 rad |

Roll/yaw response also scales by 0.94/1.08. Fighter stall 55, radius 8,
HP 450, weapons, thrust, collision and remaining handling rules are retained.
Trainer uses the existing fixed-wing jet physics and fighter audio, not a new
propeller simulation. Chase offsets are 26/6 and 22/6 metres. Camera sight offsets
are provisional, not native cockpit acceptance. The descriptors below are now
implemented; trainer fixed gear is not a pivot and its prop rotates on local Z.
Thumbnails reuse scene.ts's existing kind/team loader, view and bounds framing;
no separate decorative images or renderer bypass were added.

`node Games/Wings/verification/astra-check.mjs` checks both loopback spawns,
wire snapshots, ordinary-input takeoff/turn, descriptor nodes, hashes and cockpit
math. `check-ui.html` now additionally checks actual custom-menu requests reach
real loopback spawns for both kinds, plus keys 1/6/7 and listener disposal.
These fixtures are not rendered flight. Four native desktop/mobile/theme UI
cases pass. An isolated upstream aircraft-preview build using the new Wings
converter/materials hit its 40-second outer bound; no converted-render PASS.
World flight, thumbnails, prop animation and native cockpit acceptance stay held.

## Original integration contract and historical fixture evidence

Use distinct picker labels **Astra Interceptor** and **Astra Trainer** and the
filenames above; do not overwrite upstream GLBs. Model/root names are
`astra-interceptor` and `astra-trainer`. Coordinates are **-Z nose/forward,
+Y up, +X right**, at **scale 1**, in Wings' meter-like world units. No model
rotation or normalization is needed. The origin is near the fuselage center;
this is not a ground-centered asset.

| Model | Bounds X/Y/Z | Silhouette | Suggested placeholder length/span |
| --- | --- | --- | --- |
| Interceptor | 12 / 3.7 / 17.15 | Long pointed nose, swept wings, twin canted fins, twin exhausts | 17.15 / 12 |
| Trainer | 11.2 / 4.275 / 9.55 | Short round body, straight high wing, single fin, two-blade prop, fixed gear | 9.55 / 11.2 |

Named nodes shared by both: `cockpit`, `gun_muzzle`, `wing_L`, `wing_R`,
`stabilizer_L`, `stabilizer_R`, `canopy`, `fuselage`. `gun_muzzle` is an anchor,
not a visible weapon or promise of a specific loadout. The trainer propeller
pivot is `propeller`, translated to `(0, 0, -4.7)`; its blades are local to that
pivot. Rotate about **local Z**. The trainer `gear` group contains its connected
crossbar, struts, wheels and tailwheel. The interceptor has no gear geometry.
Do not advertise retractable gear or movable control surfaces for these assets.

Suggested minimal render descriptors matching the inspected deployed loader:

- Interceptor: `file: "astra-interceptor"`, `pivots: []`, `stores: []`,
  `spinners: []`, `afterburners: []`,
  `anchors: [{key: "gun", node: "gun_muzzle"}]`, `shadow: [12, 17.15]`.
- Trainer: `file: "astra-trainer"`, `pivots: ["propeller"]`, `stores: []`,
  `spinners: [{name: "propeller", axis: "z", speed: 40, driver: "engine"}]`,
  `afterburners: []`, `anchors: [{key: "gun", node: "gun_muzzle"}]`,
  `shadow: [11.2, 9.55]`.
- Both placeholders use `heli: false`. Do not add `gear` to trainer pivots if
  keeping its fixed gear visible: the existing update loop scales a registered
  `gear` bone according to gearDown. No `pilot_1`/`pilot_2` meshes are supplied.
- Optional cockpit markers: interceptor `(0, 1.35, -3)`, trainer
  `(0, 1.35, -0.65)`. Configure camera offsets in authored source, not the GLB.

**Handling suggestions, not flight-tested tuning:** relative to the existing
fighter baseline, try interceptor top speed 1.08x and turn response 0.94x;
trainer top speed 0.90x and turn response 1.08x. Keep existing physics, loadout,
stall constraints and collision rules until the source owner validates them.
Start cockpit pitch at the baseline and only change after native view testing.
Dimensions do not automatically update gameplay collision radii.

### Loader evidence and material limits

Read-only inspection used HEAD `8165683`'s deployed
`assets/aircraft-D9mwCKGU.js` (loader/rig converter `qV`, configuration `gc`,
creator `PG`) and root/accessor metadata from `fa18.glb`, `yf12.glb`, and
`a10.glb`. The converter preserves root-relative transforms, gathers named
pivots and anchors, remaps ordinary material colors into its toon palette,
and recognizes `livery_` ancestor names. The generated wing accents deliberately
use `livery_wing_L/R` so team identification can survive that remapping.
The placeholder nose and forward vector confirm -Z forward; models are not
rescaled by the converter. This is inspection evidence, not permission to edit
the minified bundle.

Opaque painted PBR materials use moderate/high roughness; dark opaque canopies
avoid sorting/transparency dependencies. No emissive materials or textures are
needed. The existing Wings converter replaces these materials with its own
shaders, so the fixture colors are **not** a guarantee of the in-game palette.
Existing Wings shader/device failures are not fixed by these assets.

## Reproduce and verify

From the repository root, with existing tools only:

```sh
python3 -B Games/Wings/verification/generate-models.py
python3 -B Games/Wings/verification/check-models.py
python3 -B Games/Wings/verification/check-models-browser.py --out trg-fleet/lane1
```

The browser check discovers an already-cached Three 0.186.0 or accepts
`--three-root PATH`; it does not install anything. Its temporary loopback server
serves that dependency only for the fixture and terminates in `finally`.
`model-preview.html` is a verification fixture, not a game entry; open it through
this server rather than expecting `/__three__/` on the deployed site.

Historical lane1 checks passed (2026-10-15, before integration):

- Structural/size regression: deterministic bytes, GLB chunks, buffer bounds,
  node tree, finite attributes, normals/winding, indices, distinct propeller rig,
  no external textures/buffers and <2,000 triangles per aircraft.
- Four isolated Chromium/SwiftShader + Three **186** renders: 1100x720 and
  390x920, light/dark preferences, front/rear quarter views. Both models draw in
  each run (14/20 draw calls, 328/368 triangles). Zero console/page errors,
  zero warnings, zero external requests. This uses standard Three WebGLRenderer,
  **not Wings' renderer, shaders or rig converter**.
- Evidence outside Git: `trg-fleet/lane1/browser.json` and
  `light-1100.png`, `dark-1100.png`, `light-390.png`, `dark-390.png` in that folder.
- Catalog check: 125 unique IDs, expected schema, and tracked entry URLs.

The original lane1 run claimed no actual Wings rendered-flight, picker, material-converter, propeller animation,
collision, handling, native hardware, full-catalog smoke or release acceptance. No game was added or registered. No push.

## Blockers and ownership

Historical lane1 blocker (resolved by follow-up task 1): local staging TypeScript source was not found; a help ticket was raised instead
of fetching upstream or editing minified bundles. Follow-up task 2 committed picker/handling integration at `d435f12`; supported-GPU
acceptance remains held. Historical lane ownership and inventory receipt follow:
Lane 2 owned source recovery, implementation and the Wings maintenance manual.
Lane 7 owned inventory refresh: `check_maintenance_docs.py` already reported
`Inventory stale: inspect changes, then run --refresh.` before these changes,
and the recorded inventory had no Wings entry. This lane does not refresh it.
The model fixture is deliberately separate from the existing held renderer gate.
