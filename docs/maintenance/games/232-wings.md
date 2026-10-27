# Wings

<!-- maintenance-game: Games/Wings -->

## Identity and status

Registered catalog **232**, entry `Games/Wings/index.html`; catalog currently has
129 games. Static offline adaptation of anomalyco/arcade Wings at source pin
`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`, ingested by owner order despite
missing upstream LICENSE.

**Known-failure release, explicitly authorized 2026-10-27:** retained source
`fd0e87fb` is now source-built into the served entry/chunks, preserving original
UI and the actual local Factions GameSession/fleet composition. No authoring-only
preview is substituted. Native renderer/compositor and flight acceptance remain
unpassed; rights qualifications remain unchanged. See the
[exact release/known failures](../../known-failure-release-20261027.md).
The historical no-push/approval/gate statements below retain their dated scope;
this release is not gameplay, GPU, full-fleet or rights certification.

Current geometry milestone `92e470f` and authored regression `f1f7cc6` cover
F-15/F-35 dimensions/contours, dark paint, functional stores/exhaust, recessed
F-35 bays, distinct existing-weapon fits and model-derived launch/camera points.
The orchestrator approved the revised raw geometry after official-reference
comparison before its commit. Final operator approval remains open; bounded
native checks and raw family review are recorded below.
Read the [quality contract](../../../Games/Wings/docs/aircraft-quality-contract.md),
[v2 brief](../../wings-jets-v2-brief.md),
[study](../../../Games/Wings/docs/repair-study.md) and
[model contract](../../../Games/Wings/docs/models.md).

**Fresh full gate: 125/125, exit 0**, tested `b52d942` in 1,579.29 seconds with
unchanged runner/catalog/filters. See the [repair receipt](../audits/wings-repair-20261017.md)
and [machine-readable result](../audits/wings-repair-full-gate-20261017.json).
Historical `2d2eb61` was 124/125, exit 1; the earlier 122/125 also failed. Their
[dated evidence](../audits/fleet-followup-full-gate.md) remains intact.
Loading PASS does not establish full gameplay, target-device or rights acceptance.
No publication or push approval.

## Implementation map

`assets/` is generated Vite output; `models/` contains local GLBs and `fonts/`
retained local fonts/OFL. `port.patch` preserves authored changes against the
pinned source: offline loopback, entry/lobby/spawn lifecycle, renderer gate,
aircraft descriptors/conversion, camera, combat hardpoints and regressions.
Apply to clean upstream source and rebuild; never edit minified output.

The controller owns session lifecycle; `RoomEngine` owns deterministic gameplay.
`vehicles.ts` owns weapon fits and optional model-derived hardpoints;
`combat.ts:muzzlePosition` rotates those coordinates into world space.
`aircraft.ts` converts model nodes into rigid bones/material batches, consumes
ammo to show stores, and animates exhaust/covers. `camera.ts` owns eye/chase
placement. Generator and serialized checker own model structure/budgets.
Inspected boundaries do not constitute a complete engine, shader or rights audit.

## Gameplay and controls

Solo starts offline with no AI aircraft; enemy fleet guns remain active. Bots
and Custom retain existing match rules/configuration. Hangar keys 1-7 include
**6 F-15, 7 F-35**; Custom Aircraft selects the actual initial spawn after the
renderer gate. Original five aircraft and bot weights are preserved; both jets
have bot weight zero.

F-15 pilot uses cannon20/aim9; officer uses maverick. F-35 pilot uses
cannon20/tvmissile; officer uses tvmissile, with existing stealth rules enabled.
These are distinct arcade fits, not operational loadout claims. Each missile
slot has two stores following actual round depletion/regeneration. F-35 covers
respond to both missile slots and exclude cannon fire. No weapon ID/type or
landing-gear feature was added.

Controls depend on the selected upstream steering scheme; use the in-game
Controls page. Default keyboard flight uses W/S throttle, arrows pitch/turn,
A/D roll, Shift boost, mouse weapons; T switches chase/cockpit and 1/2 switch
seats. Keyboard/mouse required: narrow menus do not establish touch flight.
Escape, ordinary menu return and fresh restart passed the final native run.
Physical pointer-lock behavior remains unverified.

## State and persistence

Room state is in memory. `wings.settings` and `wings.autoQuality` persist
preferences; Low retry saves Low and reloads. Session leave disposes listeners
and a fresh match creates a room. Auto-quality benchmarking waits for successful
return to the menu. No account, remote transport, online invitations or fixed
seed override was introduced. Actual storage-failure/device behavior is not
established by the CPU regression.

## Dependencies and provenance

`CREDITS.md` records source pin, owner order and missing-license qualification.
Retained Three 0.186.0 MIT and font OFL notices apply to those components, not
the whole upstream game/model collection. Rights remain unresolved.

Two original Python-stdlib procedural models were authored by
**openai-codex/gpt-6-astra**, repaired by **openai-codex/gpt-6.1-sol**. Upstream
models informed convention/material study; official references informed contour
review. No copied mesh, new texture, image, external model resource, skin or
animation clip. Dark neutral panels, transparent canopy/interior, generic livery,
external F-15 stores and covered F-35 bays use existing local rendering mechanisms.
Original generation does not establish unrestricted rights.

Legacy Astra GLBs/functions were retired after tracked and constructed-path
consumer tracing. The compatibility name `astra-check` now covers current jets.
[Archived receipts](../audits/wings-real-jets.md) preserve old hashes, failures
and intermediate geometry. Current exact hashes/coordinates are in the model contract.

## Audit findings

Historical Pi probes encountered WebGL2 shader/driver stalls, UV warnings and a
HUD-only zero-draw state. The current gate requires a real scene draw and fails
closed on shader/device/zero-draw/timeout errors; Low retry retains upstream
materials. Lazy menu startup avoids unsolicited world initialization. Later
Windows AMD/ANGLE probes achieved WebGPU first draws for both jets, establishing
that bounded host result without curing historical Pi failures or proving flight.

An earlier native automation run had pointer-lock/control limitations and failed
menu return because the canvas intercepted the button; another ended on the spawn
screen before its nominal cockpit capture. Those captures are not cockpit or
flight acceptance. The successful final parent run is scoped separately below.
The crowded mobile failure toast was an inherited UI finding; the continuation
below records its source repair and fresh verification separately.

Current converted jets have six batches: paint/metal/livery/afterburner/glass/flame.
F-15 is 41,744 converted triangles; F-35 41,008. Raw model draws 142/143 and
scene/frame draws are different measurements. Single CPU samples do not prove a
performance gain, target-device budget or native load-time delta.

## Safe iteration

Start from the clean source pin, study actual original aircraft consumers, then
apply/regenerate `port.patch` and build source. Approved external tooling for this
repair: Bun 1.4.2, Vite 7.3.7, Three 0.186.0, Rollup 4.64.5, esbuild 0.28.2.
This bounded exception does not authorize future dependency installation or
repository `node_modules`. The orchestrator owns generated bundle delivery and
fresh clean-pin patch verification. No typecheck PASS is claimed.

The [source recovery receipt](../audits/fleet-followup-wings.md) gives the
staging/rebuild pattern. Trace real consumers, including sparse-excluded and
constructed paths, before deleting assets. Preserve provenance, original-five
behavior, no-network boundaries and generated-source recovery. Commit inspected
source first; refresh inventory deliberately afterward. Run the maintenance
checker; it checks coverage/staleness, not semantic correctness or gameplay.

## Verification

Fresh model checker passes against committed bytes and two generations, including
F-35 store clearance between aperture/closed cover/roof. D19's rebuilt CPU
regression passed: distinct fits/stealth; independently composed GLB gun/store
origins; identity and rotated muzzle tests; ordinary-input offline simulation;
actual converted store depletion one round at a time and real ammo regeneration;
exhaust throttle/boost; both missile door triggers; cannon exclusion; signed
cover movement/reclose; cockpit/anchor math. Original-five speeds/loadouts and
absence of hardpoint overrides are checked. These are CPU/render-state fixtures.

Baseline unavailable-GPU UI regression after `b65acc7`: four cases passed at
1280 x 720 / 390 x 844 in dark/light preferences, exit 0, no page errors or
external requests. [Case data](../audits/wings-repair-ui-20261017.json) covers
fail-closed launch/retry, selection/navigation and spawn/HUD fixtures, not flight.

Source-only build using approved external dependencies succeeded. Current
browser/test bundles are integrated; patch application to the clean pinned index
passes. Independent review parsed 12 JS files and resolved generated local links.
Historical Oct15 model/UI/browser/patch passes remain only dated evidence in the
linked archive; no old PASS is promoted to current acceptance.

**Final native evidence:** the parent probe on Windows Edge WebGPU/AMD passed
normal-input takeoff/climb above 120 m, turn, boost, cockpit/chase, cannon fire,
Escape, ordinary menu return (zero sessions) and fresh restart (one session) for
both jets. A separate normal-input dive/death and keys 6/7 respawn check passed
for each jet with HP 450, pause off and pointer lock restored; the precise death
cause was not event-proven. No console/page errors or external requests. Root reviewed raw family
comparisons and the saved [native previews](../../../Games/Wings/docs/previews-v2/README.md).
The forward cockpit view is usable; black coaming/nose remains below the reticle.
Headless pointer-lock acquisition failed and keyboard fallback worked. Physical
mouse capture, missile targeting/fire, audio, converted-family parity, Pi GPU and
native load-time delta remain unverified. Two worker readiness failures preceded
the successful parent run; no product acceptance was inferred from those failures.

**Baseline catalog evidence:** 125 visits, 125 passes, zero failures, exit 0 on
`b52d942`. Original coding sparse configuration restored exactly; protected hashes
unchanged; clean repository; owned HTTP server closed and adapter processes ended.
Peak materialization 195,853,427 bytes, 300 MiB cap and stricter 2 GiB floor.
No target/wait/filter override or retry. Existing exclusion counts are not logged,
so this is not unfiltered clean loading or complete gameplay/offline acceptance.
Ovo's historical transport failure did not recur; its root cause is not proven.
Two generated Three shader-template whitespace findings remain in the repair
range (aircraft chunk line 30, astra bundle line 3848); authored scopes pass
separately. The historical artifact-path finding remains qualified; the mobile
toast source repair and new verification are recorded below.

## Continuation (2026-10-17)

The continuation after `a3f5554` clears all four local weapon hints on every
input frame. Changing pilot/officer seats, pausing, or losing local ownership
must not retain a trigger or explicit boost override. The new helper is used by
the real game controller and exercised with a converted F-35 view. No weapon,
flight tuning, network protocol or original-five model data changed.

The renderer recovery dialog now owns renderer-startup errors without a duplicate
toast. Other error toasts wrap within the viewport and sit above the mobile
footer. The real toast helper is exercised by a clearly labeled UI fixture.
The current source-built continuation passed all four unavailable-GPU UI cases,
exit 0, including duplicate-error and toast-bound assertions. The fresh unchanged
catalog gate passed **125/125, exit 0** at `bfbc564` in 1,591.93 seconds, with exact
sparse/config restoration and unchanged protected hashes. Peak materialization
was 195,853,427 bytes; existing filters/exclusions remain qualified. The
successful `b52d942` gate above covers the earlier runtime only.
The [continuation receipt](../audits/wings-continuation-20261017.md)
records exact scopes and bounded collector failures.

The rebuilt CPU regression also acquired and fired each existing missile fit
through real simulation functions: F-15 pilot AIM-9 and officer Maverick, F-35
pilot/officer TV missile. Each case checked own ammo 2 to 1, ownership/target,
model-derived launch coordinates and the corresponding converted store; F-35
covers reopened and reclosed. These deliberately positioned CPU fixtures do not
establish native target acquisition or missile gameplay.

Windows audio diagnostics captured running 48 kHz contexts and nonzero master
PCM for both jets during idle, throttle and cannon phases. Gun sources ended
after release; flight sources ended on menu return with zero sessions. Both
attempts later timed out on the harness's incorrect restart-state label, so this
is partial graph evidence, not a whole-harness pass, listening test or missile
audio acceptance.

A corrected Pi Low/software-WebGL2 probe on the earlier `a3f5554` runtime reached
the renderer and failed closed with `First scene draw timed out`. WebGPU was
unavailable; the screenshot also timed out. Default headless graphics exposed no
usable context. These results do not establish physical Pi GPU behavior. Earlier
collector/selector failures remain recorded in the continuation receipt.

## Standards

- Geometry: indexed finite attributes, valid buffers/accessors/node tree, identity
  root, -Z forward/+Y up, all material definitions used, intentional glass,
  at least 40 meaningful assignments, dark neutral family and no real insignia.
- Rig: actual store geometry on ammo-linked pivots, active exhaust discs/cones,
  recessed covered F-35 bays, correct signed door movement and geometry-derived
  launch/camera coordinates. No empty-feature assertion or generic-rail substitute.
- Recovery: source-only build from pin, retained notices, clean-pin patch check;
  generated bundles are never hand-edited.
- Native: final normal-input and visual acceptance, rights and release gates stay
  separate from structural/CPU passes. No full-fleet pass or push is inferred.

| Model | Triangle limits | Strict byte ceiling | Actual triangles / vertices / bytes | Assignments / unique materials |
| --- | --- | --- | --- | --- |
| F-15 | 40,000-55,000 | <1,200,000 | 41,352 / 25,305 / 1,176,316 | 142 / 12 |
| F-35 | 35,000-50,000 | <1,200,000 | 40,812 / 25,323 / 1,174,768 | 143 / 12 |
| Speedboat experimental raw asset | 12,000-18,000 | <2,097,152 (embedded PBR) | 17,252 / 24,746 / 1,411,020 | 258 / 92 |

These are asset limits, not supported-device performance claims. Reference asset
triangles: F/A-18 16,896; YF-12 18,028. Their converted totals add 392 flame
triangles each; scenery is not a selectable-model budget precedent.

Existing checks, from repository root:

```sh
python3 -B Games/Wings/verification/check-models.py
node Games/Wings/verification/astra-check.mjs
node Games/Wings/verification/solo-check.mjs
python3 -B Games/Wings/verification/check-models-browser.py --out "$EVIDENCE"
python3 -B scripts/check_maintenance_docs.py
```

Use source-built current bundles and approved existing dependencies. Raw-model
browser fixtures are standard Three, not Wings' native renderer. Unavailable-GPU
UI and same-browser menu sequence runners establish only their labeled scopes.
Terminate owned temporary servers; install nothing merely to reproduce a report.

## V2 resume study (2026-10-17)

The [fresh resume receipt](../audits/wings-v2-resume.md) starts at `956ef48`:
Phase 0 independently studied current descriptors, original models and pinned
renderer/gameplay source; Phase 1 palette and repeated generation pass. On
2026-10-18 the operator supplied existing external Three 0.186.0. Six fresh raw
renders measured stable 142/143 calls and 41,352/40,812 triangles; `478097f`
updates only stale count expectations from 112/109 and 43,392/42,760. The actual
runner passes 6/6, zero errors/external loads. Parent reviewed all six images;
dark paint and distinct front/rear silhouettes are visible, but dim belly lighting
requires a lit-belly diagnostic before visual clearance. Raw fixtures do not
prove converter cones or native rendering. Fixture `8f20a62` adds reproducible
top/side/lit-belly and original-family views. Nine fresh diagnostic captures and
six default cases pass. Parent reviewed top/side/front/rear and lit bellies:
recognizable distinct silhouettes, continuous dark surfaces and external stores;
no visible inverted patches. Raw geometry/palette review is accepted within that
scope. Fresh [Phase 3](../audits/wings-v2-phase3.md) and
[Phase 4](../audits/wings-v2-phase4.md) CPU checks pass exhaust, distinct weapon
acquisition/fire/store/bay/hardpoint/input behavior and converter/registry checks.
Phase 3's native collector timed out before launch, so native exhaust, weapon/bay
pixels and converted-family acceptance remain unverified. On 2026-10-19 the
operator accepted these as hardware receipts, not automatic gate/push blockers.
[Phase 5](../audits/wings-v2-phase5.md) fresh CPU checks pass and saved 6/6 plus
9/9 raw receipts validate. Six reviewed 2026-10-18 previews are now retained under
`docs/previews-v2/` within Wings, with explicit dates and fixture limits. Previous
native/fleet results remain dated.

The operator additionally authorized one new selectable non-plane class after
the jet lanes, with a study/design commit before implementation. Apache already
is selectable; the operator selected SPEEDBOAT, superseding the parent's tank
proposal before implementation. Honest water handling and unique class weapons
are required, not another heli or re-skinned jet.
See the receipt for the full geometry, animation, unique-weapon, scene-budget and
interactive acceptance gates. No new portal game or catalog ID. Push is authorized
only after all newly required acceptance and a fresh 125/125 full gate. The
2026-10-18 run stopped below the disk floor. The operator answered storage ticket
`pi-829842-1792322142957-ab609a47` and resumed on 2026-10-19 with only about
6.9 MB above the floor. Capacity must be checked before growth, including each
checkout's projected bytes. Release each batch to coding sparse selection before
the next batch. No outside-repository deletion is authorized. Full fleet gate
still has 0/125 visits; speedboat structure study precedes implementation, then
full gate, interactive boat playtest and push only if all green. See the resume
receipt for exact measurements, sampled logs, commits and continuation order.

The notes-only [speedboat structure study](../../wings-speedboat-study.md) landed
as `7831179` but stopped incomplete on a renewed floor breach. It is not design
approval; do not begin geometry or runtime implementation yet. Parent confirmed
2,144,706,560 free bytes. Renewed storage ticket
`pi-829842-1792388121373-af09fa13` requires operator-side recovery. Batch release
cannot make the largest approximately 196 MB game fit in a few MB margin.
Full gate remains unrun, boat interactive acceptance absent and no push.

## Speedboat study and raw reroll continuation (2026-10-19)

Operator answered the renewed storage ticket and recovered capacity. Parent
measured 2,631,307,264 free bytes at the next entry. No outside-repository deletion
or dependency installation. Completed F/A-18 study `2fe6f4c` precedes the approved
water-class cannon/depth-charge design. Builder `a017419` proves reproducible
baseline source output using existing esbuild 0.28.2 and external Three 0.186.0.
The current served runtime is unchanged; private staged boat implementation is
not yet delivered, selectable or fully accepted.

The operator approved the initial hull shape but required greater realism.
Generator `f3ce4dd` began at 16,344 triangles/14 materials/121 assignments;
`b70d464` first reroll was rejected by parent as too flat. `6c375af` refined
functional panel PBR, neutral AO and micro-detail. Parent closed a bow gap exposed
by the true front view: final experimental `models/speedboat.glb` is 17,252
triangles, 92 used material definitions and 258 assignments. Near-black hull,
subdued ochre, differentiated non-skid/glass/metal/rubber and texture-free
clearcoat/vertex occlusion. The model checker now checks all three committed
models against repeated generation; original jet bytes remain exact.

[Sixteen rendered PNG files](../../../Games/Wings/docs/previews-v2/speedboat-reroll/README.md)
include true front/side/top/rear/lit-belly and both quarter angles, both themes,
plus mobile quarters. Parent inspected multiple angles and belly, then recaptured
after closure. No errors/external/failed requests. Photographic realism remains
operator judgment; parent still describes the result as a clean game model.
[Full reroll receipt](../audits/wings-speedboat-reroll.md) separates raw captures,
private converter/physics/combat work, interrupted audio WIP and all remaining
runtime/input/camera/performance/full-gate/interactive holds. No new game or ID.
No push or deploy verification. Release-between-batches and disk checks remain
mandatory when the completed runtime eventually reaches its full fleet gate.

## Operator publication exception (2026-10-20)

Leo explicitly ordered pushing committed main without waiting for the full gate.
See the [exception receipt](../audits/wings-operator-push-exception.md). This is
not a full-gate or interactive boat PASS. Free space was 1,963,855,872 bytes,
below the strict 2 GiB floor: full gate remains blocked, 0/125 visits. No bulk
checkout or outside-repository deletion. Storage ticket
`pi-829842-1792461943936-5201d0a7` is pending.

Roof/driver generator and heading-runner edits remain unstaged WIP and are not
published as completed fixes. Their interrupted capture receipt has one image,
zero heading diagnostics and a Broken pipe collector failure. Private boat
runtime integration also remains incomplete; committed served bundles still
have seven selectable kinds. Publish only the complete committed milestones,
verify live delivery, and fix forward if later tests find regressions. Do not
interpret the operator's exception as permission to falsify acceptance.

## Capacity-authorized source checkpoint resume

[Current checkpoint and hold receipt](../audits/wings-speedboat-integration-hold-20261021.md)
records private source `c04b506`, reviewed boat integration and the closed-roof,
seated-driver candidate. Saved generated boat, Astra and solo checks passed again;
build closure and candidate hash match. These CPU results do not establish play.

Capacity is above the strict builder guard, but the approved external Three
package is absent in this process despite reported restoration. Native EGL sees
Broadcom V3D; two separate hardware-browser capability routes produced no WebGL2
context. No further Wings launch, native acceptance, runtime delivery or push.
Restore tooling and a supported browser route before paired delivery. Earlier
tracked WIP is no longer present; saved reviewed diffs and private source survive.
Current maintenance coverage passes for 126 registered and five unregistered
games. Full fleet remains deferred; no new game or multinational jet in this lane.

## Speedboat PBR surface pass (2026-10-24)

The operator cleared the experimental boat's preceding realism gate and ordered
this material-only pass. `8aa3cece` adds 30 deterministic embedded PNGs using the
existing Python-stdlib generator and UVs: base-color weather masks, packed
metallic/roughness and tangent-space normal maps across ten finish families.
`70ab7d52` refines hull streaks, salt, irregular wear at the existing finish-zone
boundaries and fine non-skid grain. Wetness follows interpolated existing hull
Y=0, not an arbitrary horizontal image stripe. Painted hull/rubber/glass remain
dielectric; exposed steel/bronze remain metallic. Trim is subdued neutral patrol
paint. No downloaded textures, runtime fetches, new dependency or runtime changes.

Current GLB SHA-256:
`7fee0b74e7c746a2dff2b7c4b5bed58c39b9ddbbc0c55592f1eb27941b4f2aee`.
Size is 1,411,020 bytes, **+341,728** from 1,069,292. The boat-only byte ceiling
is now 2 MiB for embedded maps; aircraft limits are unchanged. All 1,160 original
accessors and their bytes, UVs, normals, vertex AO, indices, meshes, nodes and
transforms remain exact. Triangles stay **17,252**, assignments **258**, materials
**92**; both jets regenerate byte-exact. No geometry exception was requested.

Fresh browser-free results: PBR/immutable-geometry regression PASS (2,368
waterline samples, 51 panel-edge samples; generation 7.362 seconds), models 3/3
PASS, preview parity self-check PASS, Python compile and embedded JS `node --check`
PASS, catalog 128 unique IDs/schema/tracked URLs PASS. Runnable checks:

```sh
python3 -B Games/Wings/verification/check-speedboat-pbr.py
python3 -B Games/Wings/verification/check-models.py
python3 -B Games/Wings/verification/check-speedboat-browser.py --self-check
```

Preview runner `91af1637` preserves all sixteen original case identities,
orthographic fitting, lights, procedural RoomEnvironment PMREM reflections,
ACES/sRGB and exposure; it verifies GLB material factors/maps without overrides
and records render wall time. `e38b71c2` separates document commit from the
existing 60-second model/material readiness wait; 210/230-second hard deadlines
and all render assertions remain intact.

[Saved evidence and precise capture hold](../../../Games/Wings/docs/previews-v2/speedboat-pbr/README.md):
the **initial PBR candidate** `8aa3cece` genuinely captured 16/16, with baseline
camera/light parity, no clipping/overflow/errors/external/failed requests, all
92 materials mapped and 75.505-second total duration. Parent reviewed two
quarters, side, lit belly and both mobile captures; hull weathering was too faint
and deck grain too coarse, prompting the final refinement. Those images do
**not** depict the final `70ab7d52` GLB. Final-model attempts produced **0/16**:
two navigation timeouts, one readiness timeout and one launch timeout. Later
attempts overlapped sibling Chromium sessions; causation is not proven. Own
browser/server exited between batches, no sibling was killed. New Wings browser
launches are held for Foldwild QA agent40ef5d0's reserved next slot, relayed via
the requested shared READY file. Final-model visual acceptance remains open.

Maintenance checker was run unchanged and stopped with `Commit inspected source
changes before validating its inventory.` Other lanes own dirty Games files and
`inventory.json`; this lane does not overwrite their work or claim a whole-repo
coverage PASS. Full-fleet smoke was not run. No new game, registration, runtime
delivery or push. Historical native/release/rights qualifications remain.

## Deterministic time-of-day lighting (2026-10-24)

The [lighting implementation and Node receipt](../audits/wings-time-of-day.md)
records the source-built runtime replacing the fixed storm lighting. A pure
absolute-room-time sampler starts at 09:00 and repeats a full day/night/day every
600 simulation seconds. The existing interpolated gameplay timeline drives the
moving solar light, procedural skybox/disc, cloud and ocean colors/reflections,
shadow direction, hemisphere ambient and height fog with smooth interpolation.
There is no theme toggle, date dependency or random lighting seed.

Night reduces actual visibility on every quality preset and automatically enables
one real local-aircraft landing light, or a steeper Apache searchlight. Light and
target follow the aircraft and are removed on daylight, death, seat leave and
disposal. Balanced/High use a focused solar shadow map; Low's existing contact
shadow now follows the sun and fades at the horizon. Reflection intensity also
falls at night. Bot sensing, weapon targeting and flight physics are unchanged.
Existing storm flashes now follow a fixed room-time schedule rather than random
frame-time strikes. Controls explain the cycle and automatic lights.

Fresh delivered lighting, solo and converted-jet Node regressions all pass,
including 4,801 sampler sweep values and real converted F-15/Apache light
transforms/lifecycle. All 18 delivered JS/MJS files and the builder parse; catalog
128 IDs/schema/tracked URLs, local references, clean retained-pin patch recovery
and owned diff whitespace checks pass. The builder preserves shader text while
escaping template newlines, rather than suppressing whitespace failures.
No new game, aircraft, registration, dependency, external load, browser capture,
full-fleet smoke or push. These are CPU/render-state results, not native/pixel
acceptance; historical hardware, supported-renderer and rights limits remain.

## Supplied 30-model archive preflight (2026-10-24, integration held)

Lane A inspected `Wings_Base_30_Models.zip` entirely in memory; no supplied
scripts were executed and **no archive entries were extracted**. Archive SHA-256:
`4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8`.
ZIP CRC, 65 unique safe relative paths (no traversal, absolute paths or symlinks),
exact manifest membership/sizes and all 64 non-self SHA-256 values pass.
`manifest.json` explicitly declares a null self-hash, not a corrupt hash; its
independently computed SHA-256 is
`8d361c9cecd761b4338732144bf424e07f1752745117023ef9ec42e4f2e03e6a`.
Total archive uncompressed bytes: **7,820,266**, including metadata. The actual
30 GLBs total **7,635,836 bytes / 111,494 indexed triangles**, matching
`models.json`; GLB headers, byte counts, SHA-256 values, triangle counts and
absence of external buffer/image URIs were checked independently. This is not
full geometry, texture, visual or native compatibility acceptance.

The exact `models.json` IDs/files match the actual GLBs and both lookup lists:
**18 fixed-wing aircraft + 2 helicopters + 10 vessels**, not 20 fixed-wing jets.
All standard slots resolve to the 20 aircraft; all 30 faction slots resolve.
The source roster is:

- Fixed-wing: F-16C, MiG-29, Su-35S, F-35A, Eurofighter Typhoon, Rafale C,
  JAS 39C Gripen, J-20, MiG-31BM, Mirage 2000C, JF-17 Block III, FA-50,
  Su-34, Tu-160, A-10C, Su-25SM, Hawk T2 and Yak-130.
- Helicopters: AH-64D Apache and Mi-28N.
- Vessels: Charles de Gaulle, Queen Elizabeth class, Type 45 Daring class,
  Aquitaine FREMM, CB90 H, Liaoning Type 001, Admiral Kuznetsov Project 1143.5,
  Type 055 Renhai, Type 054A Jiangkai II and Type 022 Houbei.

**Selected / extracted / wired: 0 / 0 / 0; unwired: all 30.** Existing aircraft,
GLBs, runtime, catalog and seven-kind selection are unchanged. Vessels are
archive-staged, faction-only candidates, **not locally staged or playable**.
The current runtime has fleet carrier/destroyer entities, but no separate
Factions selection mode was found in delivered JS or the retained source patch;
existing fleet entities do not establish that mode or compatibility with these
new vessel hulls. No replacement fleet or fabricated Factions menu was added.

### Study and exact integration blockers

Fresh inspection measured the original GLBs (triangles/material definitions):
F/A-18 16,896/151, A-10 17,576/166, YF-12 18,028/123, Apache 11,322/202,
B-2 4,740/96; all original roots retain unit scale. Original materials, the
per-kind registry and real converter were inspected, not inferred from names.
`assets/chunk-FWTONZ2W.js` contains named pivots, ammo-linked stores, exhaust
cones, anchors, dimensions and shadows; `assets/chunk-LU3F6XZF.js` contains
kind/loadout tables. F/A-18 uses six removable missiles and twin exhausts,
A-10 missile stores/fans/gun rotation, YF-12 three internal missiles/twin exhausts,
Apache eight Hellfires/rotors/chin turret, and B-2 eight bombs/hinged doors.
`port.patch` preserves authored aircraft, camera, combat, spawn/lobby and audio
changes. Existing model-derived hardpoints and camera offsets must stay aligned.

1. The supplied GLBs are visual base geometry, with **+Z forward**, versus
   Wings' **-Z forward**. Their aircraft node lists have no named missile,
   bomb, weapon, gun, exhaust or afterburner nodes. In particular the supplied
   F-35A has no bay doors/stores; supplied Apache rotor names differ and it has
   no chin turret/Hellfire stores. Repointing existing loaders would remove
   working features, not integrate compatible replacements. Rigid-control JSON
   is descriptive metadata, not Wings runtime registration or a weapon rig.
2. The native converter rebuilds material batches from factors/colors rather
   than retaining supplied PBR texture maps. A raw glTF load would therefore
   not prove dark-family appearance parity. Geometry-fit orientation, derived
   camera/weapon points, functional stores and applicable exhaust require
   authored adaptation and their own regression, not copied kind constants.
3. Served code is generated output; there is no existing authored local JS
   extension hook for adding complete kinds across these boundaries. The
   maintenance contract forbids hand-editing generated bundles, and this lane
   explicitly forbids builds/installs. Safe source-built delivery therefore
   cannot be completed within this lane's allowed operations. No dead binary
   dump or unserved source-only integration was substituted.

Archive provenance asserts original OpenAI-assistant Blender 4.3.2 geometry and
procedural PBR, no third-party models/textures and no manufacturer endorsement;
its authoring model version is not exposed. These are supplied assertions, not
independent rights verification. There is no separate license file in the 65
entries. Existing upstream Wings rights remain unresolved. Retain the supplied
README/provenance and obtain a clear redistribution basis before future ingestion.

Fresh browser-free receipts on the unchanged runtime:
`node Games/Wings/verification/astra-check.mjs`,
`node Games/Wings/verification/solo-check.mjs` and
`node Games/Wings/verification/lighting-check.mjs` all exit 0. They cover existing
converted aircraft/combat, offline simulation and lighting only, **not supplied
asset integration or gameplay acceptance**. No runtime JS changed, hence no new
mapping/geometry regression or touched-JS syntax gate is applicable. No build,
browser, screenshot, server, full smoke, registration, new game or push occurred.
The unchanged maintenance checker exits 1 with `Inventory stale: inspect changes,
then run --refresh.` after the sibling Ribbon source commit; this is not a Wings
runtime failure or coverage PASS. Inventory refresh remains the orchestrator's
scope after this documentation-only checkpoint; this lane does not modify shared
inventory or the maintenance index.

## Four-worker source/model follow-up (2026-10-24)

The [execution receipt](../audits/foldwild-wings-swarm-20261024.md) records W1's
30/30 independent decoded bounds/triangle agreement and W2's source recovery
inspection. The [external-generator repair specification](../../wings-supplied-model-repair-spec.md)
contains measured per-model bounds and specific repairs for all30 identities:
orientation with signed axes/winding, actual versus proposed rig names, store/
exhaust/bay/camera origins, converter-compatible materials/livery and vessel
waterline/deck/island/collision requirements. These are repair instructions, not
completed derivative models, approved loadouts or new runtime descriptor consumers.

Retained host original source accepts the current `port.patch` in a read-only
application check; 28 existing source preimages match patch blob prefixes.
Approved Three0.186.0/esbuild0.28.2 tooling is present. Thus source/tool availability
is not the present blocker, though no complete source rebuild was run or accepted.
The compliant route remains authored TypeScript changes and regenerated matching
runtime/check bundles, never hand-edited output. Existing source/build guards
remain unchanged. A separate Factions ruleset must enforce rosters in RoomEngine
spawn/team/boarding/bot paths, not only menus or transport `StartRequest.mode`.

Integration remains **HOLD** on redistribution basis, functional rig repair and
source-built mode/combat delivery. The subsequent operator decisions below resolve
AI fleet objectives versus player ships, not those remaining gates. All30 assets
remain archive-only and unwired;
seven existing selectable kinds are unchanged. No Factions mode, new playable
vessel, new game, build, browser acceptance or push. Both W2 and the orchestrator
reran existing Astra/solo/lighting regressions: 3/3 pass, CPU/render-state only.

## Operator fleet decisions and bounded implementation (2026-10-24)

**WINGS-AI-FLEET:** Leo selected AI-controlled fleet objectives in **separate
Factions**, never player-controllable ships. Players attack or defend those
objectives; ordinary selection remains aircraft-only. The first bounded slice
keeps all ten vessel candidates objective-only, with no player ship seats,
boarding/control transfer, water-driving controller or ship cockpit. No carrier
air wing, deck launch/recovery or mobile-spawn feature is implied.

**WINGS-FLEET-V-FLEET:** opposing AI fleets must also actively attack each other
and defend friendly assets within explicit supported weapon capabilities. The
simulation must own bounded hostile acquisition, range/cooldown-limited attacks,
real HP damage, sinking/destruction and objective updates. Visible firing/impact
feedback must reflect that authoritative state; friendly fire is off by default.
Passive objectives or visual-only projectiles do not meet the order. Model names
are not evidence that naval missiles, AA channels or other weapons exist.

The [bounded source-first plan](../../wings-ai-fleet-implementation.md) reuses W2's
completed source-recovery findings and [W1's committed repair measurements](../../wings-supplied-model-repair-spec.md)
from `b84f6250`. Two delegated Wings workers update those disjoint documents;
this is not a repeat archive/source audit. Future lane **FC / W2 integration
owner** is the single authoritative fleet-combat source owner for fleet/combat/
room-engine and required protocol/type/snapshot boundaries. Aircraft work must
hand off overlapping shared simulation files before FC edits them. Rendering
consumes simulation events/state, never a second targeting/damage implementation.

Next tasks are source baseline recovery from the known retained original/current
patch; separate validated room rules and authoritative aircraft-only ownership;
capability-limited fleet combat and objective lifecycle; class-specific vessel
render/collision/weapon-event wiring; then regression and native acceptance.
Stages are bounded and ordered in the plan; no source build was run here.
Model repairs/redistribution basis, exact source authentication and authorized
matching bundle delivery, mode/balance validation and native/performance proof
remain genuine gates. Source and approved tooling were found; do not reopen
source absence or AI-versus-player scope as blockers. No rights waiver, dependency
install, generated bundle edit, runtime/model change or push is authorized by
this documentation decision. The active upgrade swarm retains all Foldwild work;
no Foldwild path or shared maintenance inventory was changed by this follow-up.

Documentation checks: new links in the four Wings documents resolve; privacy,
scoped whitespace and unchanged runtime/catalog/Foldwild boundaries pass. Wings'
Git tree still matches its inventory record. The full-link scan also found an
unchanged historical speedboat-PBR README link whose target is not tracked; it is
reported, not silently removed or counted as a link PASS. The unchanged maintenance
checker exits1 on missing `docs/maintenance/games/001-brainrotboulevard.md`, outside
this Wings lane. No new CPU/native combat test was run: the plan labels future
regressions as planned and does not claim Factions is implemented.

## Permitted implementation resume (2026-10-25)

The operator resumed real source/model work. The user reports creating the
supplied models with GPT and grants scoped Wings use/repair. Record this as
**user-reported generated provenance and scoped permission**, not independently
verified originality or upstream code/model license clearance. The
[implementation receipt](../../wings-implementation-resume.md) records exact
ownership and milestone results. No Foldwild, Citisten or Jankolock path is owned
by this Wings wave; Jank's active shared-index owner coordinates commit windows.

The [primary upstream report](../../wings-upstream-provenance.md), `7338a2e`,
authenticates all70 retained original files and13 deployed original public files
against primary pinned Git blobs. It traces the actual subtree import/original
root ancestry and finds no applicable redistribution grant. Exact Three0.186.0
and esbuild0.28.2 tools, binary and builder guards are reverified. Source identity
and tooling are resolved; new upstream-derived copying/delivery remains **HOLD**
until a rightsholder grant identifies the game/pin, adaptation/compiled public
hosting scope, notices and separate upstream-model coverage. The user's supplied
model permission does not grant those rights.

Permissible work proceeds locally rather than waiting on documentation:

- `4b3398ef`: original dependency-free `authoring/fleet-sim.mjs`, its runnable
  check and core notes. The orchestrator independently reran **12/12 CPU groups**
  and both syntax checks. It exercises reciprocal fire, real HP/sinks and defense
  preference; faction/aircraft-only ownership; shared player/AI projectile damage
  with friendly obstruction; continuous depth/water eligibility; finite contacts,
  expiry/reacquisition and no exact hidden-sub pose; sub/escort counterfire;
  actual64-surface/8-underwater cap saturation; capital outcomes/reset; integer-ms
  partition/replay and exact range-boundary rejection. Review reproduced a final
  projectile-step overshoot; FC fixed it and left a boundary regression. A
  contact-blackout test was strengthened to assert no underwater fire plus
  positive reacquisition rather than depend on an optional target field.
- `ecf8a6a1`: two supplied Type45/Type054A escort derivatives under
  `models/derived/`, with stdlib generator/check and `authoring/model-repairs.json`.
  Independent rerun passes two byte-reproducible outputs, **11,960** reflected
  triangles, six unchanged embedded PNG maps,22 pose/clearance checks and all11
  existing models/archive unchanged. This supersedes the earlier archive-only
  status for these two local derivatives only; all supplied assets remain
  **unwired to the served game**. Actual turret/prop geometry, signed limits,
  measured muzzle and collision references are recorded. Mixed-atlas glass,
  native converter/material integration and fitted gameplay remain held.
- `3d32b642`: original generic submarine asset/generator/check/descriptor,
  **17,016 triangles / 336,996 bytes**, seven geometry-backed controls, two
  aperture-backed launch origins. Independent parent check exits0 for367 poses,
  continuous swept bounds,242 launch-clearance samples, reproducibility and all11
  original models unchanged. It is newly authored unnamed art, not a supplied
  mesh or certified real-class replica; scoped permission and authorship limits
  are retained in its manifest.
- `5055672c`: original injected-Three presentation rig/check/notes. Independent
  parent CPU run covers three actual GLBs /28,976 triangles, signed control
  limits, posed/rotated muzzle queries, propeller pause/death/reset, submarine
  depth/contact-safe hiding and finite event-correlated fire/impact/projectile/
  sinking presentation. It never applies targeting or damage. The escort
  regression now scopes its two owned derivatives, preserving every content
  assertion while allowing the authorized submarine alongside them.
- `16154d87`: independent W13 review reproduced generated-aircraft/vessel ID
  collision and resurfacing disclosure of old private underwater event origins.
  FC reserves its aircraft namespace and stores bounded private event-time
  faction redactions. Parent review and **14/14 CPU groups +2 syntax checks**
  pass, including both reproduced regressions, friendly obstruction, replay and
  legitimate visible damage/fire. No second combat owner or ignored failure.
- `4dfe8901`: raw three-asset GLTFLoader/PBR fixture/runner. Parent browser-free
  self-check passes13 explicit routes, actual Three dependency closure, three
  hashed embedded assets, inline ESM/Python syntax, negative routes and bounded
  system-browser/cleanup configuration. Four views are prepared; no native or
  gameplay result follows from this self-check. Fourth-slot queue still governs
  any capture; runtime and model originals remain unchanged.

[Raw native evidence](../../wings-implementation-native/README.md): attempt1
failed before the first capture at a reproduced stale-camera-matrix helper
boundary; `31d65cb0` fixes it and preserves all clipping guards with an actual-
HTML positive/removal-negative CPU check. Attempt2 produced four actual raw
images, nine material records and native draw/pose/disposal proof, but its gate
still **FAILS** on two retained GLB request-failure events. No error filtering,
clean-loading PASS, natural combat or whole-vehicle realism approval follows.
Parent reviewed all four images: the escorts remain simple boxy base art, and the
submarine remains a generic original game asset, not a real-class certification.
Both batches kept14 route/runner hashes unchanged, cleaned up and released the
shared slot with zero roots/no profiles. No third launch this cycle. Hermes advice
was requested after two failed attempts and cancelled; ticket
`pi-12722-1792891919886-7a787220` remains unresolved, not authorization.

At the initial `4b3398ef` checkpoint, the FC module was isolated, using
axis-aligned fixture collision and center-origin shots. The measured integration
below supersedes those limitations for explicitly bound models and makes their
pose channels authoritative. Abstract legacy fixtures retain their documented
fallbacks. Aircraft ownership remains validation, not a replacement flight engine;
none of these CPU results clears full43-identity realism, native gameplay or the
upstream served-host rights gate.

That checkpoint used the Citisten/Foldwild/Jankolock/Wings browser queue. The
current follow-up queue is Citisten first, Jankolock second, Wings third, with
explicit releases and fresh preflight required. No new Wings browser launch is
part of the source follow-up. No build,
new dependency, minified bundle edit, original-seven replacement, new game,
registration, public release or push is part of these local milestones.

## Measured authority and host/session follow-up (2026-10-25)

The resumed order advanced beyond the isolated core without copying uncleared
upstream code or making a replacement game:

- `4cfa721c`: original `authoring/fleet-geometry.mjs` and authority changes bind
  actual descriptors/mounts, solve signed gun poses, launch at measured origins,
  test fitted rotated hull/island boxes and translation sweeps, and generate
  orientation/aim/propeller/control-plane channels from actual simulation state.
  Unsupported mounts fail closed; current escort assets do not acquire ASW
  launchers by class name. Straight gun solutions outside real signed envelopes
  reject rather than invent ballistics.
- `2c1dcb51`: original `authoring/fleet-session.mjs` connects the real authority
  to trusted host identity/aircraft callbacks and the presentation ABI. One
  unforgeable sequential clock owns ticks; ordinary aircraft requests/attacks,
  safe faction snapshots, pause, view-failure reconciliation, leave/restart and
  disposal are implemented. Normal/solo/custom return to their existing path.
  The view test is explicitly an ABI spy, not served/native flight evidence.
- Parent and independent W16 review pass **14 core +9 geometry +8 session groups**.
  Actual three-GLB node frames are checked using real Three math. Three reproduced
  defects now have regressions: full submarine appendages could cross the seabed,
  fully submerged geometry could be labeled surfaced and reveal exact position,
  and failed-view aircraft cleanup could leave a surviving viewer stale. Full
  static/swept clearance, measured-top classification and bounded all-survivor
  reconciliation close those cases without relaxing prior assertions.

**The served Factions entry is still absent.** The
[exact integration gap and user-action evidence](../../wings-served-integration-gap.md)
names the lobby, game lifecycle, RoomEngine/protocol, snapshot/render and real
flight boundaries that require upstream-derived edits and a matching source
build. Source/tool availability is proven; the missing item is an applicable
rightsholder grant covering the pinned game, compiled browser hosting/adaptation
and its eight original GLBs, not another model-only permission or bare GO.
No generated bundle edit, script-hook disguise or new substitute app is used.

Other unfinished work remains explicit: fitted fixed-tick rather than continuous
rotational physics, complete ASW escort art/capability wiring, real host aircraft
reconciliation, full roster/realism and native loading/performance acceptance.
The existing raw request-failure gate is not rerun or cleared by this follow-up.
Separate weather/map extension lanes own their own source/docs and are not
attributed to these authority/session commits. Catalog129/normal seven-kind
served output and all existing model bytes are unchanged; no new game or push.

## Durable authored-source recovery (2026-10-25)

`Games/Wings/source/` now retains the authored source in Git rather than only an
ignored staging checkout. All 70 retained pristine Git blob hashes and sizes
matched the recovered pinned receipt; the current `port.patch` clean-applied.
The checkpoint contains 77 patched baseline files, 1,294,495 source bytes before
its manifest/README. Three unused upstream art mockups and the upstream server
are omitted explicitly; no GLB, font, dependency, backend or served bundle was
copied or changed. See the [source guide](../../../Games/Wings/source/README.md).

The exact existing Three 0.186.0/esbuild 0.28.2 builder produced 25 files,
3,543,748 bytes, matching the daylight baseline receipt. This is source recovery,
not delivery of the lost realism candidate, photographic review or FPS evidence.
The [source-loss receipt](../audits/wings-realism-interruption.md) remains dated
and qualified. No browser, full-fleet smoke, new game or push.

## Recovered realism source candidate (2026-10-25)

The candidate under `Games/Wings/source/` is **source-only, not delivered**.
The served `port.patch`, HTML, assets, GLBs and bundled regressions are unchanged.
Saved write/edit operations were replayed with unique exact-text guards against
the recovered daylight baseline; this is not restoration of the lost Git objects.

- Aircraft: source PBR factors survive batching through a vertex attribute, with
  shared local ORM/normal maps and restrained weathering. All seven aircraft
  model hashes/triangle counts are unchanged. The converted-jet check now asserts
  exact source-factor coverage per vertex rather than obsolete fixed batch
  defaults; six batches, geometry, rig, weapons and lifecycle checks remain.

- Terrain: recovered jitter-aware normals, mineral/scree/soil coloration and
  seed-sensitive shading-cache invalidation. Geography, heightmap, fleet clearance
  and collision topology are unchanged; 38,376 triangle-interior samples pass
  with maximum error `1.535e-12 m`. The existing game already has hills, valleys
  and coastlines; no duplicate GLB terrain was introduced.

- Clouds: recovered bounded world-space density marching, extinction, forward
  scattering, wind drift and opaque-depth clipping. Low remains off; Balanced
  uses one volume and High two. Six actual GLSL graph cases pass across standard,
  reversed and logarithmic depth. Graph construction is not GPU compilation.

- Shadows: recovered native CSM helper and daylight/scene wiring. Balanced uses
  two 1024-square maps; High uses three 2048-square maps. The quality transition
  replaces the light identity to invalidate the cached graph. Three resource
  cases and seven target disposals pass. Filtering is softened fixed-radius PCF,
  **not** contact-hardening or variable penumbra; the Low blob stays approximate.

Fresh [source-recovery checks](../audits/wings-realism-source-recovery.md) pass
all five CPU/graph suites plus final lighting, solo and converted-jet regressions.
The final candidate build is 25 files / 3,569,870 bytes, +26,122 bytes versus the
verified lighting baseline; all 18 generated JS/MJS files parse. This is staging
output only. Native pixels, FPS, contact-hardening penumbra and aircraft wind
buffeting are not accepted. No browser, runtime replacement, full-fleet smoke,
new game or push.

## Original-module composition (CONTINUE-WINGS-0920)

The [bounded composition receipt](../../wings-composition-0920.md) connects actual
original maps, weather, FC authority, session and model rigs, not an alternate
game or generated-bundle hook. `authoring/fleet-composition.mjs` binds rigid
clones of prepared real GLB scenes; one session clock forwards authoritative
weather to the trusted aircraft callback with the selected real `worldQuery`.
Quality/motion preferences do not alter combat visibility. Measured map placement
checks full/swept bounds, all-yaw radius, initial route heading and hull separation.
Normal/solo/custom still decline without touching their existing host path.

`47a4abcd` adds explicit visual/nonvisual acquisition and shared composed density
for AI/player launch validation. Weather snapshots use friendly-fleet intel,
not fabricated aircraft sensors; current and historical redaction protect hostile
poses/HP and hidden submarines. Sonar/nonvisual channels retain their own rules.
Parent independently reran 14 core, 9 geometry, 7 weather and 9 session groups.
Actual-model composition checks use 28,976 serialized triangles, real node
transforms and factor-only CPU materials, not decoded textures or native pixels.

The end-to-end check exposed unreachable parallel escort patrols, corrected by
actual center-lane map staging/navigation without widening weapons or hulls.
The 40-HP one-sided encounter remains an explicit regression; baseline 1,000-HP
fixtures separately establish reciprocal fire/damage/sinking. A timed draw with
untouched capitals is not called an objective victory. The receipt separates
that case from ordinary aircraft attacks on actual capital objectives.

The served Factions entry remains absent. Rights-cleared lobby/RoomEngine/flight,
map worker/cache, native scene/atmosphere and matching rebuild integration are
still required at the [precise host boundaries](../../wings-served-integration-gap.md).
Real escort ASW art/trajectories remain absent, so all-measured six-role fleets
reject; mixed submarine-animation fixtures explicitly use anonymous legacy
counterplay. Actual aircraft physics/prediction, nonzero wind, full roster,
GPU/native/performance and realism are not accepted. Recorded upstream rights
HOLD and user-reported GPT asset provenance remain unchanged. No model, served
bundle, retained host source, catalog, new game, build, browser or push here.

## Original fog/light consumer follow-up

The [composition receipt](../../wings-composition-0920.md#auto-continue-actual-foglight-consumer-and-cleanup)
now records a real original Three/TSL environment consumer, not only a callback
DTO. `authoring/weather/weather-view.mjs` installs stable world-ray height fog
uniforms and scales real lights from fresh daylight samples, using exactly the
provided composed density. It adds no clock, wind force, rain/cloud or lightning.
The new optional composition cleanup hook releases its resources once on leave,
view failure, disposal and failed returned-factory setup; external fog/light
owners and caller model resources are preserved.

Independent review reproduced callback reentry and cross-scene light ownership
gaps; guarded atomic application and ancestry checks fix both. Parent independently
reran **8 consumer +15 actual-model composition groups**, including real GLSL/WGSL
node-material graph generation and once-only real-scene cleanup, in81 seconds
combined. Graph generation and CPU optical quadrature are not shader GPU numeric
parity, driver compilation, screenshots, native flight or FPS acceptance.

Only original modules/tests/notes changed. Retained host source, normal seven-kind
runtime, assets, catalog and protected/unrelated games remain untouched. Actual
native scene/atmosphere/prediction consumers and the applicable upstream grant
remain required; no browser, source rebuild, registration or push occurred.

## Cleanup fault follow-up and current tool hold

Actual-Three fault injection reproduced skipped cleanup: one geometry disposal
listener exception prevented all three owned materials from being attempted and
left the disposed flag false. The shared rig now closes ownership first,
attempts all cleanup/restoration independently, clears references and aggregates
causes. Four new strict fault/reentry/real-model restoration cases passed in the
worker's then-available Three environment. The raw fixture likewise now cleans
partial GLTF resources and attempts its rig/environment/model/renderer cleanup
without losing the original setup error. Actual-HTML CPU cleanup tests preserve
existing camera/routes/PBR guards; no new browser acceptance is claimed.

The external Three0.186.0 cache disappeared during an idle gap, so one fresh
attempt failed before its first test. The same approved MIT library has now been
recovered from its primary registry after archive-integrity and approved
metadata/license hash verification, without package-manager installation,
repository dependencies or scripts. Fresh parent replay passes15 composition
groups (including rig-error cleanup) and the complete raw fixture CPU self-check
in70 seconds; independent replay passes8 consumer groups plus the actual-GLB rig
check and4 fault cases. All6 JS syntax checks pass. These are new tool-backed
receipts, not promoted pre-removal results; GPU/native acceptance remains held.

See the [current checkpoint](../../wings-composition-0920.md#approved-tool-recovery-and-fresh-replay)
for exact tool identity and the approved idle-only index handoff. These source
changes land in coordinator-granted sequential checkpoints; foreign Jank work
is preserved and only the Wings inventory row follows the source commits. Upstream rights and served-host integration remain
separate holds. No model, catalog, retained host source, served rebuild, browser,
new game or push is part of this follow-up.

## Initial original-module visual integration preview (2026-10-26, historical)

The operator requested actual local visual evidence rather than another rights
study. The [new preview and retained artifacts](../../wings-original-preview/README.md)
compose original maps/authority/session/weather/rigs with two supplied escort
derivatives and the existing generic submarine. The companion HTML/module use
only the approved local Three package and embedded model assets; no upstream
host/bundle, model bytes, catalog or normal seven-kind runtime changed.

Fresh browser-free checks pass12 actual-source startup cases plus actual draw-loop
pacing/cancellation, import-map removal-negative and phase-logger regressions.
They cover all three maps, surface/submarine, clear/fog, no spawned aircraft,
private hostile submarine poses and real-consumer cleanup. Native source wiring
bugs (missing `three/webgpu` alias and invalid empty aircraft rosters) and a
checker logging collision were fixed without weakening the authority or gates.

The retained1280x860 clear-skirmish image shows both real escorts and authoritative
fire/damage at tick400: HP900/660,21 draws/15,965 triangles and changed actual
propeller/turret quaternions. The latest software-WebGL2/SwiftShader pass also
passes native Run/Pause and restart after the preview yields125ms between
continuous draws. **Full native gate remains FAIL**: fog compile/draw and state
publication succeed, but the next native Step actionability wait times out after
10s and its diagnostic screenshot after5s. No fog/overview/submarine/mobile
capture is accepted, no force-click/error filter/timeout extension was used and
all five unsuccessful receipts are preserved. Browsers/servers/profiles/leases
were released; the next action is a distinct supported-graphics or bounded
lower-buffer diagnostic of the fog compositor/input stall, not an unchanged
retry. Technical ticket `pi-341161-1792980473670-9acd81e2` remains unresolved.

This is an explicitly unserved diagnostic, not a replacement game, actual flight,
real-class ASW fit, hardware/FPS result or delivered Factions. The served-host gap
remains labeled, without a new license audit, dependency install, game, build,
registration or push. Only Wings-owned source/evidence/manual belong to this checkpoint; active Jank
edits and forty-hero intake are not competing work here. Source/evidence remain
unstaged pending explicit index grants: a bounded300s natural-idle observation
still found the coordinator running, so no prompt/staging/commit was sent or
inferred. Ticket `pi-341161-1792981513773-8afca1ac` records exact windows. Wings-only
inventory refresh must follow committed source and has not occurred; the unchanged
maintenance checker stops at its uncommitted-source guard, not a coverage PASS.

## Separated starts, actual AI battle and bounded realism (2026-10-26)

The [current original-battle receipt and actual media](../../wings-original-battle/README.md)
supersede the earlier clear-skirmish preview for this bounded module scope.
Operator requirements preserve the original Anomaly-exported UI and aircraft-only
ordinary player selection. The authoring dashboard is never installed into the
game. Supplied destroyers may be reused as AI targets/allies in ordinary planes
mode using the same assets/rigs, not duplicate packs or player ship controls;
actual upstream host wiring remains a separately gated integration.

Map-pack version2 derives separation/formation from measured full hulls, relevant
weapon reach and10s of closing distance, validates full route/depth/water clearance
and publishes only a complete legal plan. Submarines start with their own faction.
Two flagships converge rather than remaining unreachable. Same map/seed/profile
and partitioned input replay remain deterministic; no arcs, ammunition, HP or
geometry bounds are weakened. The old four-surface escort fixture still records
its explicitly named time draw/one-sided negative, not an invented victory.

Fresh parent verification passes **83 CPU cases/groups**:28 maps,15 actual-model
composition,13 independent staging,12 actual-preview startup plus1 scheduling,
10 sea-view and4 complete AI-battle groups. The three actual 1,000-HP flagships
encounters sink a capital at69.15/73.20/75.20 sim seconds and reach Team1 capital
victory, with227 independent actual muzzle checks and reciprocal attributed damage.
The ordinary aircraft CPU case still uses50 real attacks/1,000 damage against a
moving capital, not a claimed natural-flight integration.

**Native PASS_ORIGINAL_AI_BATTLE_NOT_GAMEPLAY:** the clear archipelago pass records
31.577s/32 actual960x640 frames from real opposing movement/fire/damage to the
capital outcome; separate opening/40s approach images prove the earlier separated
start. Native Run/Pause, same-state low/balanced comparison, restart, native Close
and desktop/mobile light/dark/layout checks pass, zero errors, clean owned
browser/server/profile/lease release. It uses software SwiftShader and an explicitly
nominal4x diagnostic clock, not measured device FPS or a new game speed setting.
The first pass's later incorrect square-canvas QA assertion remains an unaltered
FAIL receipt; comparing the actual375x390 canvas fixes the assertion, not the UI.

The bounded original marine layer consumes safe motion/damage/events for measured
bow/stern foam, near-water splashes, damage smoke/fire and finite tiered pools.
27,304B of original procedural ripple/feather textures break the previous flat
specular patch/opaque foam plates without new assets or caller-material overrides.
Actual comparable images are reviewed, but tiling, coarse terrain, boxy silhouettes
and mixed glass atlases remain visible: **no photorealism claim**. Real-class ASW,
full roster, native flight/aircraft effects, fog parity/input, original-mode host
wiring, hardware performance and served Factions remain outstanding. No source
rebuild, install, new game, registration, release or push. The actual yielded-index
handoff now lands source/evidence at `449549cf`, `c55f3834`, `97e837dc` and
`64550d7a`, exactly40 frozen paths. `40935dea` updates ONLY Wings inventory to227
files /24,295,430B, tree `3f6865288e71e7b5003e1835050359da4312f3e3`, preserving
all other rows. Fresh51 fast CPU cases plus authored syntax/catalog/diff gates pass;
prior83-case/native receipts remain attached to hash-identical code/media, not
claimed as newly rerun browser evidence. Global coverage still requires its own
clean-source/manual gates. Next owned integration is the marine layer's safe-frame,
reset and dispose lifecycle inside the original composition, not a new host/UI.

## Isolated retained-host bridge (2026-10-26)

The [bounded delivery receipt](../../wings-host-bridge-delivery.md) replaces the
previous fixture-only host gap for the tested cannon boundary, not the served
Factions hold. Original `authoring/retained-host-bridge.mjs` and hash-pinned,
add-only `retained-host-wiring.mjs` execute against the actual retained TypeScript
in memory, without modifying or distributing the host preimages. The real
RoomEngine owns flight, seats, ammo, cooldown and nearest native collisions;
existing FC owns fitted fleet damage/sinks/objectives. Original UI and all111
source/entry/bundle/patch files remain byte-unchanged. No new game or push.

Fresh checks: **13 actual-host +22 core +9 session +7 weather groups** pass,
including accepted buffered cannon fire, sustained fire/replay capacity,
friendly/native obstruction, faction restrictions, pause, actual native15s
reset/restart and close/disposal. Follow-up `886ef504` fixes a reproduced loss of
in-flight damage after launcher death/disconnect: immutable per-round provenance
preserves original attribution without relaxing initial ownership validation.
Unregistered copies, mutated identity and stale/reset combat callbacks reject. Existing Astra/solo/lighting checks also pass.
These are deterministic CPU pose fixtures, not served/native flight evidence.
The old battle/media is not rebuilt or promoted to host gameplay acceptance.

Two human factions and straight guns only; unsupported bot factions reject.
Host missile/bomb/ASW and AA reconciliation remain absent. The native generic
fleet/world/map must still be suppressed or matched, supplied rigs/weather bound
to GameSession, and separate original-style start wiring source-built before
served acceptance. The source is present; applicable upstream adaptation/public
hosting permission remains unresolved. The delivery receipt contains one unsent
permission draft and the precise next normal-input/visual acceptance criterion.
No irrelevant browser capture or repeated unavailable-upstream lookup was made.

## Local-only playable integration

The operator now authorizes retained-copy engineering and testing locally,
separate from publication. The [local integration receipt](../../wings-local-integration.md)
names the exact source changes, ignored playable entry and targeted results.
Original MenuNav/GameSession/HUD now start and display a real Factions loopback
session. Actual host cannon rounds damage fitted supplied-model capital ships;
existing rigs consume that same safe state. No replacement UI, second RAF,
model duplication, published chunk edit, license claim or push.

Fresh targeted checks:13 direct-host,6 native-ocean scenario,6 real-view and3
actual local-session composition groups pass, plus generated Astra/solo/lighting
checks. Player ammo600→589 corresponds to enemyHP1000→989.2 in the CPU pose
fixture. The actual local-session test also proves view/HUD data, pause/dispose,
natural capital outcome and native15s automatic reset; GLB image loading/timers
are explicitly instrumented, not claimed as native play. The native runner
uses original input and is serialized through the shared browser queue. Its
first launch failed on a proved Unix socket path-length limit, fixed with short
owned`.tmp/t`. The second reached the original menu then failed the existing
Low/WebGL2 first-scene-draw timeout before GameSession, retaining two aborted
native ship GLB requests. Actual menu/failure captures and unfiltered errors are
saved in the receipt; no native flight or fitted-fleet pixel PASS is claimed.
No third unchanged launch or first-draw gate bypass. Next is a distinct renderer
diagnosis/supported route, not another source-permission audit.

Passive follow-up `8521b605` exposes a bounded startup snapshot before hostRef:
callback/paced-frame/render counts, phase/blockedAt, world-ready/streamer stats
and error strings. Four CPU/static groups verify detached data and exact
pre-patch render/timer/gate preservation. The collector's CPU failure fixture
now verifies capture before Playwright cleanup; it is not a native attempt.
The ignored observed build is26 files /3,808,897 bytes. No new browser launch,
screenshot or native acceptance; the answered diagnostic ticket retains HOLD.

The operator subsequently released ONE controlled startup-only capture. It
failed before GameSession but recorded16 draws/85,001 triangles, two completed
frames, worldReadyfalse, zero terrain clusters and two pending jobs, with no
failed/external requests. This is not a zero-draw failure or a GPU-health PASS.
The exact worker-versus-render-delay cause remains unproven. Source fix`7ff95b21`
defers the first full render until minimum terrain readiness while continuing
normal updates/replies; after startup, terrain gaps still render. Original20s
timeout, visual quality and nonzero/full-draw readiness requirements remain.
Four preserved checks plus10 actual-loop CPU cases and3 actual local-session
composition groups pass. The ignored terrain-first build is26 files /3,808,951
bytes. No post-fix browser was run: the single release is consumed. The receipt
retains first-failure evidence and the precise unverified native acceptance.

One later operator-authorized post-fix startup-only validation crossed the
original firstDraw gate: actual GameSession/playerp1 entered spawn, one fitted
fleet root advanced host ticks30→640/FC ticks10→213, and both actual model
positions matched authority. Final diagnostics show28 draws/264,171 triangles,
19 terrain clusters and no renderer/shader errors. Overall gate stillFAIL:
the10s startup screenshot and5s diagnostic screenshot timed out, and three
aborted model requests remain unfiltered. Only the menu image is accepted; no
flight inputs or native player-combat/pixel/performance claim. The exact receipt
records the new capture/resource bottleneck; no retry, quality/timeout weakening,
install, publication or push. Native startup progress is real but is not a clean
loading/gameplay PASS.

Collector-only follow-up`bf91c4e4` keeps HTTP alive until after all diagnostics
and browser/driver cleanup, records the first DTO before a blocking image, and
avoids a duplicate image attempt after screenshot failure. Failed requests gain
monotonic time/collector-phase metadata but are never filtered; cleanup-time
failures still force FAIL. Nine CPU fault cases plus bounded local HTTP routes
pass, including a thrown close error and no startup inputs. No application or
renderer changes and no new native run; the saved post-fix FAIL/abort timing
uncertainty remains. A further live diagnostic needs a new bounded capture release.

The operator then released one repaired-collector startup-only capture at
`ba1ed2e2`: overallFAIL96.285s, primary60s startup wait plus5s failure-image
timeout. First inspection nevertheless found nativep1/spawn and live fitted
fleets. The two aborted model requests were now timed in`run`, at14.089s
(destroyer) and62.781s(Type054A), before diagnostics/cleanup; they cannot be
classified as cleanup-only for this run. Scene callbacks82/completed renders6
stayed unchanged across snapshots while host ticks35→339 and fleet transforms
advanced. Diagnostics show28 draws/264,171 triangles,19 terrain clusters and no
renderer/shader errors, not a pre-session zero-draw failure. Exact cancellation/
render/capture/polling causes are unproven. One failure-image attempt only,
no flight inputs/retry/new app patch, and all owned browser/server resources
closed. The exact JSON/menu receipt preserves FAIL and the specific new evidence.

The subsequent operator-authorized [two-launch trace phase](../../wings-local-trace-phase.md)
adds only verification instrumentation: `local-trace-probe.js` plus its CPU fake-
native check, and `trace-local-startup.py`. The observer preserves native RAF/
cancel/abort delegation and samples existing debug DTOs at1Hz, without scheduling
RAF or controlling game state. The runner keeps original browser args/quality,
collects bounded CDP metadata without response bodies, retains evidence before
cleanup, and separates diagnostic completion from acceptance. CPU checks pass;
launch hypotheses/results are in the linked phase receipt. No app/served asset
change or new gameplay acceptance follows from adding these diagnostic files.
Launch1 retained seven HTTP200/full-body cancellations with zero explicit JS
abort/RAF-cancel calls, even with no images or RAF polling; the18s presentation gap
had continued60Hz host ticks. Launch2's CPU-checked direct-GLB-body probe selects
FileLoader's existing native-buffer fallback only to test the response-stream
boundary. It is not a production fetch patch or a failure-filter exception.

Launch2 completed11/11 GLBs with0 failed requests,0 override errors and no
request filtering; graphics remained slow (6.36s max synchronous RAF, timer-live
presentation gaps). Supported repair`5fb5fbf9` adds small`render/glb.ts`:
native fetch/arrayBuffer, original200/0 status validation and existing GLTF parser/
resource base, shared across all three loaders. Cache/retry/dispose behavior stays
unchanged. Actual helper/error/route and three local-session CPU groups pass; the
fresh ignored direct-buffer build has26 files/3,809,712 bytes and clean import/
worker closure. Default bounded HTTP serving/routes were checked without a
browser. No production fetch monkeypatch, parser/dependency change, quality/
timeout weakening, new asset or third launch. Native post-fix pixels/player/
performance acceptance remains held; the needed change is a responsive GPU/
compositor route or quality-preserving profiling evidence, not an unchanged retry.

Native carrier launch platforms remain, but bridged native destroyer collision/
presentation and old AA are suppressed. Normal modes restore original behavior.
Factions uses the original aircraft selector; no naval seats/team changes. HUD
capital bars show FC health, not passive carrier health. The local ignored
build/server entry is documented; served HTML/chunks/models/fonts/catalog and
`port.patch` remain unchanged. Native and publication acceptance stay separate.

## Future outlook

Complete operator and converted-family review, native missile/audio/physical-input
checks, target-device measurements and rights review. Preserve bounded failures
and record the fresh full fleet result before a separately authorized release
decision. This documentation adds no game, registration, dependency permission or
publication authorization.
