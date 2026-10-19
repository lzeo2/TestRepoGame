# Wings

<!-- maintenance-game: Games/Wings -->

## Identity and status

Registered catalog **232**, entry `Games/Wings/index.html`; catalog remains
125 games. Static offline adaptation of anomalyco/arcade Wings at source pin
`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`, ingested by owner order despite
missing upstream LICENSE. **Integrated repair, not released.**

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

## Future outlook

Complete operator and converted-family review, native missile/audio/physical-input
checks, target-device measurements and rights review. Preserve bounded failures
and record the fresh full fleet result before a separately authorized release
decision. This documentation adds no game, registration, dependency permission or
publication authorization.
