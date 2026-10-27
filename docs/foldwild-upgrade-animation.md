# Foldwild lane 5: articulated movement receipt

## Final freeze: ready for QA

Parent reported at 21:42: **19 Node suites, 10 JavaScript syntax checks and the
shell check passed**. This is parent-reported integration evidence, distinct
from the 18 suites executed by this lane below.

**Lane 5 is finished; `view.js` and runtime are frozen for QA.** This final
update changes this receipt only. No further runtime edits or background work
will occur during QA. No commit or Git writer was attempted; operator clearance
of the shared index lock remains pending. The required native movement video,
scenery screenshots, visual judgment and maintenance reconciliation listed below
remain parent-owned outstanding gates, not completed lane-5 work.

Disk free before this final documentation-only update was 2,635,378,688 bytes,
above the 2,147,483,648-byte floor.

## Ownership and integration status

Lane 5 edits only `Games/Foldwild/view.js`,
`scripts/test_foldwild_animation.mjs` and this receipt. **No commit was made.**
The shared index lock remained present; no Git write, retry, lock deletion or
other lane's staging was attempted. The orchestrator owns lock clearance and
reviewed integration.

`view.js` is deliberately **combined lane-4 and lane-5 source**, not solely
lane-5 work. Lane 4 supplied the human builder, six named pivots, NPC instance
batch, scenery/sign changes and sign cleanup. Those uncommitted changes remain.
Lane 5 adds jointed legs, movement/battle helpers and pose diagnostics on top.
The [lane-4 receipt](foldwild-upgrade-presentation.md) describes its earlier
handoff: its statement that knees are absent is historical, superseded below.
Its existing test was not edited. Other dirty/staged/untracked files belong to
concurrent lanes and are not included in this lane's claimed deliverables.

## Implemented behavior

- The six supplied pivots are retained. Each hip now has a named knee and ankle
  group. Two .35-unit links use sagittal inverse kinematics; ankle counter-rotation
  keeps the box boot sole horizontal. One extra cached-box shin per leg means at
  most 25 human meshes, still below the existing 27-part regression ceiling.
- Actual controller displacement advances a one-world-unit stride cycle. During
  its planted half-cycle a foot moves backward relative to the root at the same
  rate as forward root travel; during recovery it lifts .13 units. The opposite
  arm swings at the shoulder. Start/stop weights ease exponentially and settle
  exactly to the grounded neutral pose, with no root Y bounce or idle motion.
- Facing interpolates over the shortest angular difference toward the existing
  authoritative controller yaw plus PI. There is no new clock, RAF, controller
  movement logic, input format or save field. Teleports do not become footstep
  distance. Paused render dt freezes the gait.
- World creatures and waiting NPCs are purposefully still. No source creature
  skeleton, skinning or authored animation clip is claimed. These are procedural
  human transform joints and whole-frame battle feedback, not rigged GLB animation.
- Ability feedback now anticipates, lunges, applies a delayed target impact and
  recovers from static anchors. Hit recoil also recovers. Existing capture-kite
  flight remains. Reduced motion suppresses gait/action motion, resets soles and
  uses immediate facing; existing camera reduced-motion behavior remains.
- Local supplied models, colors and bytes, loader/deadline, generation/ref-count
  cache, disposal/context handlers, quality/model/NPC limits are retained. No
  dependency, asset, network load, additional geometry kind or light was added.

## Read-only QA diagnostics

`view.inspect().playerMotion` is null outside the world, otherwise a frozen
snapshot with `position`, rendered `yaw`, sampled `speed`, stride `phase`, blend
`weight` and `limbs.left/right`. Each limb reports `hip`, `knee`, `ankle`, `arm`
angles in radians, world-space `sole: {x,y,z}` and `grounded` (sole within .002
of the ground plane). `npcMotion` is a frozen list of `{id, pose}` with the same
structure. `actorPositions` continues to expose creature frame anchors.

Diagnostics update only THREE world matrices; they do not move joints, advance
animation, write controller state or expose mutable scene objects. Native QA
can sample arm/knee changes and lifted soles while moving; compare planted sole
XZ between straight-walk frames; then verify both soles at Y=0 and weight=0 after
stopping. Use actual controller input, not a state setter. Turning/start/stop
blend intervals deliberately reposition feet; straight steady stance is the
no-slide invariant. Root grounding is against the existing flat world plane;
bridge-deck appearance and sharp turns still require native visual judgment.

## Executed checks

All 18 distinct targeted Node suites passed:

```sh
node scripts/test_foldwild_animation.mjs
node scripts/test_foldwild_presentation.mjs
# Each name expanded as scripts/test_foldwild_<name>.mjs:
# data regions world battle_v2 continuity optional exploration navigation
# battle economy builds save_v2 cap_xp save_conflict class_ranks campaign
node --check Games/Foldwild/view.js
node --check scripts/test_foldwild_animation.mjs
```

Animation output:

```text
PASS: actual THREE articulated walk, 149 planted-foot samples, grounded soles, speed cadence, smooth stop/turn, frozen dt, reduced motion, immutable diagnostics/controller input, battle anticipation/impact/recovery
```

Presentation output:

```text
PASS: 16 actual human rigs, cached geometry, grounded proportions, moving arm pivots, role outfits; five region sign identities and actual Northern Clearing coordinates
```

The new suite imports the **actual functions used by render**, constructing real
scene graphs with the vendored THREE module, not source-grep assertions. It checks
world-space foot contact without penetration, planted stance, actual arm/knee
motion, speed cadence including speed 4, paused dt, smooth wraparound turn,
settled idle, reduced motion, immutable snapshots/controller input and battle
anticipation/impact/recovery. It is not a WebGL/native-play acceptance test.
The first animation run caught negative zero in the stopped arm angle; the
implementation now normalizes the zero-weight forward offset and the unchanged
strict idle comparison passes.

Sparse-aware catalog validation printed `PASS: 129 catalog entries, unique
integer IDs/schema/tracked URLs; no catalog changes`. The data suite verified
all 80 original model hashes/7,300,844 bytes and the optional 6,384,292-byte SHA.
Scoped `git diff --check` passed. No games were added or registered.

`python3 -B scripts/check_maintenance_docs.py` was run and exited 1:
`AssertionError: Commit inspected source changes before validating its inventory.`
The inventory already predates current source changes. The canonical maintenance
manual and inventory are outside this lane's three owned paths; the orchestrator
must update/reconcile them after source integration and rerun the checker.

## Held acceptance and resource receipt

No browser, installation, server, screenshot, video, push or release gate was run.
FW-PREVIEW-2 movement video and scenery screenshots remain mandatory in the
parent's reserved serial native QA pass. Neither these runtime helper tests nor
historical screenshots establish subjective walking/scenery polish, GPU budgets,
physical-device acceptance, natural campaign completion or resolution of the
single-tap inspector-close/M2 hold.

Disk free before changes was 2,820,431,872 bytes; the pre-receipt observation was
2,818,777,088 bytes, both above the 2,147,483,648-byte floor. Concurrent lanes were
active, so that global delta is not attributed solely to this lane. No cleanup
or waiver was used.
