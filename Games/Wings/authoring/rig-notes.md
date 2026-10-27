# Original fleet presentation rig: CPU checkpoint

`fleet-rig.mjs` is newly authored presentation code with Three injected by the caller. It imports no upstream renderer, simulation, package or network resource. It does not register a served mode, enable weapons, acquire targets, calculate hits/damage or own objectives. The single FC simulation remains authoritative.

## API for the next serialized FC adapter owner

```js
const rig = createFleetRig(THREE, { parent: scene, team: authenticatedFaction });
const container = rig.bindUnit(unitId, loadedGLTF.scene, escortDescriptor);
rig.update(factionSnapshot);
const gun = rig.muzzleWorld(unitId); // { position: [x,y,z], direction: [x,y,z] } or null
const launch = rig.muzzleWorld(subId, 'underwater_launch_port');
const wakeAllowed = rig.wakeEligible(subId);
rig.reset();
rig.dispose();
```

Use actual entries from `model-repairs.json` and the actual `submarine-model.json`, not reconstructed generic vehicle geometry. Binding requires descriptor roots, articulation nodes and muzzle/launch anchors to exist; missing nodes fail rather than silently inventing a rig. The currently supplied generic submarine is supported through its real rotor, dive-plane, steering-plane and launch-node descriptors, including non-identity rest quaternions.

`bindUnit` reparents the loaded object under its returned pose container and caches every loaded node's rest TRS/visibility. Articulation is `restQuaternion * axisAngle(descriptor.axis_local, signedAngle)`. Bounded channels clamp to descriptor limits; propeller channels rotate only their named nodes. The pose container applies body orientation and continuous authoritative position/depth, never substitutes whole-model rotation for a gun or propeller. `muzzleWorld` queries actual loaded anchors and transforms the geometry-derived bore direction; it returns null for absent/hidden/dead units or unknown anchors.

The parent frame is the snapshot coordinate frame (normally an identity scene). Returned muzzle coordinates are Three world coordinates, so the authority adapter must use a matching frame. Input snapshots must be authenticated faction-safe FC snapshots, never private scenario/replay data. Presentation is not an authentication layer.

### Authority-generated `unit.view` channels for measured models

Original FC commit `4cfa721c` now generates these channels for explicitly bound measured models from actual motion, depth and solved mount aim. Session commit `2c1dcb51` forwards them unchanged through faction-safe snapshots. The served upstream host is still unconnected; these are local authority/session integration results, not native gameplay acceptance. This view does not infer heading, aiming or propulsion from class names, targets or secret state:

```js
unit.view = {
  orientation: [qx, qy, qz, qw], // unit body quaternion; identity default
  angles: { main_turret_yaw: signedRad, main_turret_pitch: signedRad },
  spinners: {
    port_propeller_1: { phaseRad, rateRadS, epochSeconds },
    starboard_propeller_2: { phaseRad, rateRadS, epochSeconds },
  },
};
```

Submarine bounded control-plane node names go in the same `angles` map; `propulsion_rotor` goes in `spinners`. The measured authority uses names/axes/rest frames and declared mappings from the descriptor to convert actual depth/turn motion to signed angles. Do not add a second controller here. Propeller phase is `phaseRad + rateRadS * (snapshotSeconds - epochSeconds)`, with speed bounded by the descriptor's `mapping.maximum_rad_s` when supplied (otherwise 100 rad/s), and absent channels at rest. At speed changes, the adapter must rebase phase/epoch continuously; neither wall time nor render-frame accumulation is used.

Clock is `tick * 0.05 + remainderMs / 1000`, matching the inspected FC 50 ms tick. Repeated snapshots are idempotent. Optional trusted `snapshot.paused` freezes presentation time; normal simulation pause retains its clock. Backward ticks/time or older rounds require explicit `reset`. A newer round resets effects, phase context and rest poses before applying the new snapshot. No real mechanical-limit claim is made for the escorts' conservative authoring envelopes.

Authoritative `alive === false` or HP <= 0 stops articulation and starts a finite cosmetic sink (1.5 m/s, hidden after ten simulation seconds). It never changes HP, collision, objective state or the simulation pose. Missing units hide immediately. Actual sinking physics remain FC-owned.

## Events, privacy and ownership

- Render only snapshot `projectiles` at their supplied positions. No extrapolated trajectory, seeker, RNG or local collision/damage exists.
- Ordered FC `fire`/`impact` events create short-lived feedback at their authoritative positions. IDs deduplicate history; old/future flashes do not replay. Current limits: 12 unit bindings, 72 projectiles, 128 transient effects and 256 input events.
- The view never relocates shots. Explicitly measured FC units now launch from the authority's solved geometry-backed mounts with signed arc/range/clearance checks; abstract legacy fixtures retain their documented center-origin fallback. Geometry checks compare those poses against the three actual GLBs using real Three math. The served host and real aircraft launch reconciliation remain unimplemented until the upstream gate is resolved.
- Omitted bound submarines cannot be reconstructed from contacts: models, muzzle queries, owned effects and owned projectiles hide. Enemy underwater projectiles are suppressed even if accidentally included. Contacts/cells are never read as exact poses. Surface/deep transition uses authoritative continuous position, not a visual depth-state teleport.
- `wakeEligible` is only eligibility: live, present, near Y=0 and, for submarines, surfaced. It creates no wake or exact contact-position marker; speed/wake rendering remains adapter work.
- `reset` clears visual objects and restores cached loaded-node TRS/visibility. `dispose` is idempotent and performs the best-effort exception-safe cleanup described below. Model meshes, materials, textures and file bytes remain caller-owned and unchanged.

### Disposal exception guarantee

The reproduced defect was a throwing shared-sphere geometry disposal listener: it aborted cleanup before all three owned materials and left the view marked live. The corrected disposer marks ownership **disposed before any cleanup/event dispatch**, snapshots and clears its effect/projectile/binding maps, and releases private owned-resource references. Reentrant disposal returns immediately; other application/binding/reset/muzzle operations reject as disposed.

Each effect/projectile removal, each cached caller-node TRS/visibility restoration, caller-object detach/reparent, owned container/root removal, the owned shared geometry disposal and **all three owned material disposals** are attempted independently. A throwing `removed`, `added`, geometry or material listener cannot skip later cleanup attempts or a later caller binding. Caller meshes/materials/textures are never disposed. Cached binding node/rest/control/anchor references are cleared after their restoration attempts.

After every attempt, failures are reported together in `AggregateError.errors`, retaining the original thrown objects; `.cause` is the first failure. The first call may throw only after that full best-effort pass. Later calls do nothing, even after a failed first pass, avoiding duplicate backend/resource events. The caller must still handle that aggregate; attempted cleanup is not proof that a backend listener actually released GPU resources or that a custom overridden method performed its removal before throwing. No private Three child arrays are forcibly rewritten to disguise a failed operation.

`clearVisuals` remains unchanged and fail-fast for normal reset/round transitions. The shared rest-transform helper defaults to its previous fail-fast behavior for binding/reset; only disposal supplies the collecting runner. Actual callers traced here are the raw preview's reset/dispose lifecycle, composition's once-only rig/weather-finally cleanup, and the real-GLB rig regression. No parent composition/session or test-owner file was edited by the disposer lane.

## Verification and holds

Run with the already available Three 0.186.0 package; install nothing:

```sh
THREE_ROOT="$EXISTING_THREE_PACKAGE" node Games/Wings/authoring/fleet-rig-check.mjs
node --check Games/Wings/authoring/fleet-rig.mjs
node --check Games/Wings/authoring/fleet-rig-check.mjs
```

The check decodes the three actual GLBs' accessor/index buffers and node hierarchy into real Three meshes. Its materials are explicitly factor-only CPU fixtures: embedded escort images are not decoded or rendered. It tests signed clamps, geometry-backed muzzle centers, rotated body pose, actual submarine rest frames/launch anchors/depth/contact hiding, absolute propeller clock/pause/death/reset, real FC snapshot events/projectiles/impacts/sinking, dedupe/caps/expiry and disposal. It verifies unchanged model-buffer bytes and hashes for all eleven existing models and three input GLBs.

The full existing actual-GLB rig check also passes four independent test-owner fault regressions: a throwing geometry listener still attempts all materials once, one throwing material does not skip the others, disposal-listener reentry cannot double-dispose, and actual GLB caller models restore/survive throwing removal/reparent callbacks. The original three-model/28,976-triangle, pose/event/disposal and eleven-original/three-input immutability assertions remain passing. This is CPU cleanup/ownership evidence, not GPU memory or native acceptance.

`repair-escorts-check.py` now checks ownership of only its two escort derivative filenames and exact generator outputs; unrelated derived assets, including the submarine, may coexist. Its geometry, hashes, PNG, reproducibility, articulation and immutability assertions remain intact. A small name-selection regression covers unrelated-artifact coexistence without writing a dummy model.

**CPU-only, not rendered PBR/material, visual realism, native scene, FPS, full-game or gameplay acceptance.** Mixed-atlas glass/converter issues, original-model and upstream rights qualifications, complete FC asset-muzzle/arcs adapter and source-built served integration remain separate holds. No browser/build/install/push is part of this checkpoint.
