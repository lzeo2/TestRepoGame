# Wings v2 Phase 4: weapons, converter and registry

## Result and scope

2026-10-18, baseline `c268a60`, initially clean. **CPU checks PASS; native acceptance HOLD.** Verification only, within the ten-minute cap. Only this new receipt changes tracked content. Existing repairs are preserved, not duplicated. No runtime, source, bundle, model, catalog, sparse selection or dependency changes. No installs, servers, screenshots, new games or push. Speedboat is a future separate study and was not inspected.

Read AGENTS, CODE_QUALITY, maintenance README, manual232, resume and Phase 3 receipts, v2 brief, and Wings quality/models/repair-study/repair-acceptance documents. Read the complete actual `verification/astra-check.ts`, model checker and relevant `port.patch` aircraft, camera, flight, vehicles, combat and input/controller sections. The brief's empty registry arrays describe a historical build. Current maintenance inventory passes; catalog remains 125 games / 130 projects.

## Registry and source inspection

Balanced, bounded extraction from `Games/Wings/assets/aircraft-BIwDLCoz.js` confirms:

| Kind / asset | Store weapon slots and declared order | Pivots | Placeholder length / span |
| --- | --- | ---: | --- |
| fighter / fa18 | [0,1]: L2,R2,wingtip L,wingtip R; [1,0] and [1,1]: L1,R1 | 12 | 17.5 / 13 |
| warthog / a10 | [1,0] and [1,1]: R1,L1 | 9 | 16.3 / 17.5 |
| blackbird / yf12 | [0,0] and [0,1]: missile_3,2,1 | 10 | 31 / 17 |
| f15 | [0,1]: L2,R2; [1,0]: L1,R1 | 6 | 19.44 / 13 |
| f35 | [0,1]: L2,R2; [1,0]: L1,R1 | 7 | 15.7 / 10.7 |

L/R names in this table expand to `missile_L1` etc. F-15 has two exhaust pivots and four store pivots. F-35 adds two bay-door pivots to four stores and one exhaust. F-35 doors use local Z angles -1.45 left / +1.45 right, explicitly triggered by [0,1] or [1,0]. Both jets have empty spinner arrays, not empty stores. Fighter has twin -Y cones; blackbird twin +Z cones; A-10 has barrel/fan spinners and no afterburners. The inherited blackbird mapping refers to empty pilot slots although its AIM-47 is an officer weapon. It was not copied or repaired here.

Exact distinct fits from the patch and executed assertions:

| Kind | Pilot primary / secondary | Officer primary / secondary | Cruise / boost | Stealth |
| --- | --- | --- | --- | --- |
| fighter | cannon20 / aim9 | tvmissile / null | 135 / 185 | Not asserted here |
| f15 | cannon20 / aim9 | maverick / null | 155 / 215 | Hidden-stealth predicate false |
| f35 | cannon20 / tvmissile | tvmissile / null | 130 / 180 | true; existing rules |

Both jets inherit fighter HP 450, radius 8 and stall 55. F-15 corner speed/rate is 105/1.2, roll/yaw-turn 4.6/1.05, pitch/roll/yaw response 12/17/9. F-35 is 85/1.3, 4.2/1.15, 12.5/16/9.5. These are inspected tuning values, not independently measured handling rates. Actual simulated speeds printed 208.6962635313792 and 175.9504956374224. The stealth fixture checks unspotted F-35 versus F-15 and that spottedUntil=2 disables hiding at time 1; it does not exercise every stealth targeting rule.

`VehicleSpec.hardpoints` and `muzzlePosition` rotate model-local gun or seat/rail missile positions then add aircraft position; absent overrides retain the original radius-based fallback. Rail parity chooses left/right. The fixture independently composes GLB ancestors and checks both rails in both seats at identity and 90-degree Y rotation, tolerance 1e-6. Gun coordinates are (1.03,.27,-4.098162162162) and (-.958962264151,.53,-3.14).

Camera patch: cockpit eyes (0,1.05,-5.148972972972974) and (0,1.08,-4.291333333333333), pitch +.02/+.035; chase distance/height 28/6 and 25/6. Gunner eyes use Y=-1.4 and cockpit Z; lead 9/6, drop 1.5 each. Actual cockpit fixture output at aircraft Y=100 is [0,101.05,-5.148972972972974] and [0,101.08,-4.291333333333333], quaternion X .009999833334166664 / .017499106784510807. Identity cockpit position, finite quaternion and distinct pitches pass. Rotated muzzle tests are not rotated-camera tests; gunner clearance and native visibility remain unproven.

## Converter behavior and limits

The normalization body is unchanged context outside the patch hunks. Bounded built-browser extraction shows it selects the named aircraft root (scene fallback), updates world matrices, and computes inverse(root.matrixWorld) * node.matrixWorld. Bones attach to the nearest configured ancestor pivot, verified by name and object identity, with root bone fallback. Explicit `attach` mappings can override mesh attachment. Geometry receives rigid skin indices and weight 1. Negative transform determinant reverses triangle winding by swapping the second and third indices after transformation. Missing configured pivots warn rather than throw; unresolved exhaust bones skip generated cones. Missing anchor nodes warn and skip that anchor. These are inspected branches, not injected failure tests.

All seven serialized model roots contain only their name and children, hence default identity translation/rotation/scale. Fresh jet fixtures assert identity roots and validate converted attached geometry for tested store, door and exhaust bones. The run does not inject nonidentity roots, mirrored transforms or missing pivots, so those edge-case behaviors remain source-inspected, not runtime regression-proven. No rebuild or full source/binary reproducibility claim: extracting added `astra-check.ts` from the patch yielded exact text equality True with tracked source, and bounded `.mjs` inspection located corresponding launch-origin, pause and ownership assertions.

## Fresh acquisition, firing and render-state evidence

The runner creates isolated entities at [0,5000,0] and a hostile fighter at [0,5000,-600]. Positions stay fixed during acquisition; real `applySeatInput` and `stepCombat` execute. Fleet actors are absent. Each case asserts no missile before firing, no early completed lock, target lock/event, ammo 2 before fire and 1 afterward, exactly one missile, correct owner/vehicle/team/seat/weapon/target, initial age -TICK_DT, launch velocity, and one-tick-back origin resolving to the model hardpoint. A subsequent real missile step must advance a finite trajectory.

Actual printed fixture values:

| Kind / seat / slot | Weapon | Acquire ticks | Model muzzle (world) | Hidden / visible store |
| --- | --- | ---: | --- | --- |
| f15 / 0 / 1 | aim9 | 132 | [-4.25,4999.6,1.313513513514] | missile_L2 / missile_R2 |
| f15 / 1 / 0 | maverick | 150 | [-2.55,4999.52,.105081081081] | missile_L1 / missile_R1 |
| f35 / 0 / 1 | tvmissile | 150 | [-.91858490566,4999.85,.397733333333] | missile_L2 / missile_R2 |
| f35 / 1 / 0 | tvmissile | 150 | [-.535,4999.85,-.1256] | missile_L1 / missile_R1 |

All four print ammo=1. Owners are `f15-seat-0-pilot`, `f15-seat-1-officer`, `f35-seat-0-pilot`, `f35-seat-1-officer`; targets are `f15-hostile` or `f35-hostile`. Post-step positions respectively:

```text
[-4.248304733988269,4999.6001595544485,1.2579581563954072]
[-2.5489882300720583,4999.52019045081,.07730337612420701]
[-.9182291398408088,4999.850058094655,.3560666756798119]
[-.5347924380004896,4999.850058194954,-.16726666344340924]
```

Converted store scale assertions require the first store below .001 and second above .9 after real firing, with unrelated groups still above .9. Separate manual ammo-depletion fixtures test both rounds and order, then real `stepCombat` regeneration restores one round/store at a time using refill/ammo intervals. Thus second-round depletion is a render fixture, not a second actual acquisition/fire case.

Each real F-35 fire fixture explicitly supplies the same firing hint used by the client, opens doors over 60 updates, releases it and recloses over 240. Separate signed-travel fixtures average actual converted door vertices in bone-local space: each missile slot opens over 120 updates, angle exceeds 1 radian and center Y falls more than .05; release over 240 returns angle below .001 and Y within .001. Cannon-only hint must keep doors closed. Exact angles/Y samples are not printed; only these assertions passed. This is not observed native missile emergence.

`syncAircraftInput` writes all four seat/slot hints every frame and retains explicit boost only for active pilot input. The real controller calls it before the alive guard; `setLocal(false)` independently clears all hints and resets boost inference. Converted F-35 tests cover pilot missile to released officer, officer missile to pilot cannon, null paused/inactive input, ownership loss without another frame, and officer transition clearing pilot boost override. Remote inferred glow must exceed explicit-false glow by 1.5. Final null-seat/null-input call executes but has no subsequent observation. These checks do not automate the browser pause/seat UI.

Original-five assertions preserve exact cruise/boost pairs 135/185,75/98,105/135,190/260,150/180; all five exact loadouts; no hardpoint overrides; and original bomber either-slot door trigger. Original rows remain spread unchanged in the patch. This is bounded invariance, not bytewise or whole-game behavior equivalence.

## Budgets and actual measurements

Independent serialized inspection matched documented raw counts. An initial counting probe raised `KeyError: 'indices'` on non-indexed original geometry; the corrected probe uses POSITION count when indices are absent. No asset edit was made.

| Asset | Raw triangles | Bytes |
| --- | ---: | ---: |
| fa18 | 16,896 | 912,784 |
| a10 | 17,576 | 952,180 |
| yf12 | 18,028 | 780,572 |
| apache | 11,322 | 745,072 |
| b2 | 4,740 | 283,788 |
| f15 | 41,352 | 1,176,316 |
| f35 | 40,812 | 1,174,768 |

Fresh checker prints F-15 25,305 vertices, 142 assignments, 12 materials/unique materials; F-35 25,323 vertices, 143 assignments, 12/12. SHA-256 values match `models.md`: `5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf` and `ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197`. Committed bytes equal two fresh in-memory generations. Each is strictly below 1,200,000 bytes and inside its respective 40,000-55,000 / 35,000-50,000 triangle limits.

| Kind | Converted triangles / batches / bones | Flame triangles | Load/conversion/view ms |
| --- | --- | ---: | ---: |
| fighter | 17,288 / 8 / 13 | 392 | 449.868833 |
| blackbird | 18,420 / 8 / 11 | 392 | 308.14047000000005 |
| f15 | 41,744 / 6 / 7 | 392 | 291.224475 |
| f35 | 41,008 / 6 / 8 | 196 | 255.77495399999998 |

Jet converted bounds printed [13,4.315000057220459,20.86118984222412] and [10.700000762939453,3.3135594725608826,17.421499252319336]. Added cones explain converted lengths beyond raw 19.44/15.7. Six batches are paint/metal/livery/afterburner/glass/flame. These match documented converted budgets, not raw 142/143 draws or native scene/frame calls. Single CPU timings include file I/O, parse, conversion and view setup; no performance gain or device acceptance follows.

## Commands, logs and gates

From repository root, stdout/stderr were tee-recorded in `.swarmforge-logs/wings-v2-phase4.log` and `.swarmforge-logs/worker-20261018-111227.log`:

```sh
node Games/Wings/verification/astra-check.mjs
node Games/Wings/verification/solo-check.mjs
python3 -B Games/Wings/verification/check-models.py
python3 -B scripts/check_maintenance_docs.py
```

Each individual exit was 0. Three requested checks passed, plus maintenance. Solo printed speed 177.71992985939158, freshTime 0, crashAt 4.016666666666667, respawnAt 14.016666666666666, respawnAlive true and:

```text
PASS: offline takeoff, fresh session, ordinary-input crash and respawn; rendering not tested
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Storage blocker: initial rounded `df -h` showed 2.2G available, but the exact reading at command start was **2,134,093,824 bytes**, below the strict **2,147,483,648-byte floor** by 13,389,824 bytes. The command group had already executed when this was noticed. Further workspace growth stopped except the required safe receipt/commit; subsequent inspection was in memory, no extraction files. Exact initial bytes were not captured, so no task-attributed storage delta is claimed. Do not resume materialization or release work until the floor is restored by authorized means.

Native missile acquisition/fire, rendered bay/store transitions, converted-family visual parity, physical input, listening/audio, supported hardware, operator approval, rights and fresh unchanged full-catalog release gate remain open. No native attempt or screenshot in this phase. Prior native and fleet passes remain dated; CPU passes do not promote them. Parent owns manual summary updates. Only this receipt is staged explicitly with a `docs:` commit; no publication authorization follows.
