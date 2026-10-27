# Foldwild presentation lane receipt

## Follow-up: native screenshot sign correction

The parent rejected the first integrated scenery screenshots: the camp label
covered the player, and the oversized trial label was occluded by the right-hand
trial stone. I inspected the existing
`foldwild-upgrade-evidence/integrated-1280-light-world-scenery-ui.jpg` and
`foldwild-upgrade-evidence/integrated-1280-light-arrival.jpg`; these are failed
pre-correction evidence, not accepted results.

The minimal correction changes only sign placement/size in `view.js`, extends
the existing presentation regression and updates this receipt. Lane 5's
articulated human structure, motion and battle feedback are preserved.

- Cards are now **3 by .75 world units**, down from 5.8 by 1.45. Canvas
  resolution, text, label count, resource cleanup and 28-unit visibility remain
  unchanged. No dynamic scale framework or extra labels were added.
- Ordinary signs use `(site.x + 2, site.z - 2.4)`, ahead of the destination
  rather than toward the default camera. Trial signs use
  `(site.x - 3.3, site.z - 2.4)`, left of the arch and away from the trial stone
  at `(site.x + 3, site.z)`. Northern Clearing's card is therefore centered at
  `(18.7, -28.4)` while Maren remains `(22, -26)` and the stone `(25, -26)`.
- Trial fork signs retain their explicit `path[0].x + 2` lateral position but
  move ahead to `path[0].z - 2.4`. Sign centers remain at y=2.05 on existing posts.
- Exported pure `destinationSignLayout(site, optionalX, optionalZ)` returns
  `{x, y, z, width, height}` and is consumed directly by the actual sign renderer.
  Its overrides preserve explicit fork positioning, including zero coordinates.

Executed source gates, all exit zero:

```sh
node --check Games/Foldwild/view.js
node --check scripts/test_foldwild_presentation.mjs
node scripts/test_foldwild_presentation.mjs
node scripts/test_foldwild_animation.mjs
git diff --check -- Games/Foldwild/view.js scripts/test_foldwild_presentation.mjs docs/foldwild-upgrade-presentation.md
```

New regression output:

```text
PASS: compact sign descriptors, trial-stone separation, explicit fork placement, actual default-camera camp/avatar separation
```

The original 16-human/five-region presentation checks also pass unchanged.
Animation output reports `PASS: actual THREE articulated walk, 149 planted-foot
samples, grounded soles, speed cadence, smooth stop/turn, frozen dt, reduced
motion, immutable diagnostics/controller input, battle anticipation/impact/recovery`.
The added test uses actual THREE camera projection to prove the camp card's right
edge stays left of the fresh-spawn player silhouette at the default camera;
this is geometry coverage, not a screenshot/readability pass for every orbit.

**Corrected native batch remains pending.** No browser/server or Git writer was
started. Source is frozen for the parent's single corrected native batch. Free
disk was 2,632,728,576 bytes before and 2,631,811,072 after the source checks,
above the 2,147,483,648-byte floor. The historical handoff below describes the
initial implementation; this section supersedes its sign geometry and notes the
subsequent lane-5 articulation without claiming ownership of it.

## Scope and status

Lane 4 changed only `Games/Foldwild/view.js`, added
`scripts/test_foldwild_presentation.mjs`, and wrote this receipt. No supplied
creature/model bytes, materials or colors were edited. No dependencies, copied
assets, controller changes, browser runs or push were made.

Implementation is handed to lane 5 for serialized animation changes in
`view.js`. The following describes the lane-4 handoff, not subsequent animation
work. Native visual/readability/performance acceptance remains **unverified**.
The orchestrator owns the maintenance manual, inventory and integration. No lane-4
commit was created: the orchestrator reported an unresolved shared Git writer
lock and explicitly prohibited Git writes. Owned changes remain available for
its reviewed integration commit; concurrent lanes' dirty/staged paths were not
touched.

## Implemented presentation

- Humans now have a rectangular fitted jacket, shirt front, belt/buckle, two
  arms/hands, separate trousers/forward-projecting boots, neck, face, eyes and
  nose. The back-mounted pack and front straps distinguish facing. Hair retains
  short/cropped/long/none variants. Merchants have an apron, mentors a scarf,
  rivals a trial badge; player appearance colors remain configurable.
- Trees have two low-poly crown volumes instead of one. Existing primitive
  scenery batches remain in use; this is not a replacement terrain engine.
- Trial sites receive an open timber arch and two small pennants. The trial's
  metadata coordinate is authoritative: **Northern Clearing is Maren at
  (22, -26)**. The old stone at (16, -40) retains its separate North Trail
  Waystone identity. There is no invented clearing at the decorative stone.
- Brown verge blocks distinguish trial approaches; blue-gray blocks identify
  bridge loops. Blocks are spaced approximately seven world units apart,
  batched with existing boxes. They are presentation only, not movement
  obstacles or an alternative routing graph.
- Four destination labels per region cover camp, trial, bridge loop and
  waystone. A fifth sign at the start of the trial's final route polyline says
  `To <trial name>`. No fiber/habitat labels are added. Signs use local generated
  canvas textures, solid light backgrounds/dark borders and system sans-serif,
  with at most two lines. Sprites face the camera and are distance-gated to
  28 world units. Posts/destination labels are offset from the destination so
  they do not replace its interaction coordinates. Trial signage comes directly
  from `REGION_LAYOUTS.landmarks` and `routes`.

## Actual human structure and lane-5 contract

`createHuman(colors, geometry, material)` is an exported actual THREE scene-graph
builder. The latter two arguments are cached resource lookup functions, not
constructors. It requests only `geometry('box')` and `material(color)`; it does
not own/dispose those shared resources. It returns a `THREE.Group` named `human`.
Local **+Z is front**, ground is **y = 0**, standing height is approximately
1.7 world units. The existing view applies `playerYaw + Math.PI` to the player
root, matching the controller's negative-forward yaw convention.

`rig.userData.pivots` contains these named groups, also discoverable with
`rig.getObjectByName(name)`:

| Pivot | Local root position | Children / intended use |
| --- | --- | --- |
| `torso` | `(0, .85, 0)` | jacket, shirt, belt, buckle, pack, straps, role accessory |
| `head` | `(0, 1.27, 0)` | neck, face, nose, two eyes, optional hair and hair-back |
| `leftArm` | `(-.29, 1.12, 0)` | sleeve and hand below shoulder |
| `rightArm` | `(.29, 1.12, 0)` | sleeve and hand below shoulder |
| `leftLeg` | `(-.115, .73, 0)` | trouser and boot below hip |
| `rightLeg` | `(.115, .73, 0)` | trouser and boot below hip |

These six pivots are **siblings under the root**, not a skeleton. Rotating an
arm around local X swings its sleeve and hand together; rotating torso does not
implicitly rotate head/limbs. Left/right names denote negative/positive local X.
There are no elbow/knee pivots, skinning, animation clips or creature rigs.
Repeated mesh names such as `eye`, `hand`, `boot`, `pack-strap` are not unique;
find a hand/boot beneath its named limb, not globally by an assumed unique name.

Inside the view, `player` is a normal rendered human group. `buildNPCs()` assigns
a detached human group to each presentation point's `p.rig` in `npcs`; these
rigs face the player on creation. Their shared box meshes are rendered through
one `THREE.InstancedMesh`, not added individually to the scene. `npcParts`
contains `{ mesh, parts }`, where `parts` are those rig mesh nodes in instance
order. `updateNPCParts()` updates the rig world matrices, copies each part's
`matrixWorld` into its instance, marks the instance buffer dirty and recomputes
its bounding sphere. Lane 5 can animate `p.rig.userData.pivots`, then call this
function. Do not restore the old `{ mesh, def }` NPC update loop or add detached
rigs to the visible root, which would duplicate their rendering.

No `view.setNavigation()` API was added. Static metadata-driven signs work through
existing world presentation; dynamic goal ownership/wiring remains the
orchestrator's navigation/controller scope.

## Resource and lifecycle boundaries

The builder currently uses at most 23 cached-box parts per human, including hair
and one role accessory. NPC limits remain four on low quality and eight on
standard, represented by one box batch rather than one draw per part. Player
parts remain ordinary meshes. Extra tree crowns and route marks join existing
instanced scenery batches. No new geometry kind, light, shadow pass or RAF was
introduced.

Five sign canvases per region are 512 by 128 pixels each. Their textures and
sprite materials are tracked in `labelResources`, disposed on reset, and their
label references cleared. Cached primitive geometries/materials retain existing
view-wide disposal. Sign pixel size and added human detail require actual GPU
measurement; no frame-rate or memory acceptance is claimed.

The WebGL context-loss diagnostics, local GLTF loader, 20-second deadline,
generation tokens, ref-counted model cache/eviction, late-result disposal,
inspection framing and sole controller clock remain unchanged. Lane 4 removed
the old NPC whole-body bob update while retaining the pre-existing player/wild
motion for lane 5 to address. Reduced-motion behavior was not expanded into a
new animation system.

## Verification and remaining gates

Executed before the animation handoff:

```sh
node --check Games/Foldwild/view.js
node --check scripts/test_foldwild_presentation.mjs
node scripts/test_foldwild_presentation.mjs
git diff --check -- Games/Foldwild/view.js scripts/test_foldwild_presentation.mjs
```

All exited zero. The runnable check printed:

```text
PASS: 16 actual human rigs, cached geometry, grounded proportions, moving arm pivots, role outfits; five region sign identities and actual Northern Clearing coordinates
```

This imports the actual view exports and local THREE module. It constructs 16
hair/role combinations, checks real bounds/grounded soles/front/back geometry,
shared resource identity, named pivot hierarchy, actual arm-to-hand motion,
independence from the face, outfit variants and a 27-part regression ceiling.
It checks the real five-region sign metadata, exact rival positions and the
Northern Clearing name/coordinates, excludes collectible label spam and accepts
legacy metadata absence. It is not a source-grep-only test or a renderer mock.

The required `python3 -B scripts/check_maintenance_docs.py` was also run and
exited 1: `AssertionError: Commit inspected source changes before validating its
inventory.` Concurrent game sources are still dirty/staged. No inventory refresh
or Git writer was attempted; the orchestrator must reconcile after integration.
The receipt's scoped whitespace check exited zero.

No browser was launched. Required later serial native QA must judge sign
legibility/occlusion and overlap at desktop/narrow touch sizes, actual first-play
wayfinding, character appearance/front orientation, reduced motion, transition
resource cleanup and low/standard budgets. Existing stable M2 single-close,
natural campaign/save/device/provenance holds are not cleared by these checks.

Disk free was 2,266,697,728 bytes at initial inspection and 2,266,132,480 after
the source check; both exceeded the 2,147,483,648-byte floor. A later receipt
check read 2,819,334,144 bytes amid concurrent operator/lane activity; that change
is not attributed to this lane. After writing/checking this receipt, free space
was 2,819,080,192 bytes. No cleanup or waiver was used.
