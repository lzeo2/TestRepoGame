# Original Factions host/session adapter

`fleet-session.mjs` connects the original `fleet-sim.mjs` authority to the existing `fleet-rig.mjs` presentation ABI. It is authored host/session integration, not a served Wings mode, replacement game, bundle hook, transport or player flight implementation. No upstream source is copied or imported.

Read the [primary provenance decision](../../../docs/wings-upstream-provenance.md): retained source/tool identity is known, but no applicable upstream game-code/model adaptation and redistribution grant was established. The operator's reported GPT model creation and scoped Wings-use permission do not clear upstream code. Source-built/public delivery remains held; this adapter changes no shipped entry, generated bundle, source patch, catalog or original asset.

## Trusted host entry and API

```js
const session = createFleetSession({
  mode, config: privateBoundedFleetConfig,
  host: {
    identity: privateHostCapabilityObject,
    authenticate(connection) { return authenticatedPrincipal; }, // { id, team: 0 | 1 }
    stepAircraft({ dtMs, tick, round, environment }) { /* host-owned real flight, optional */ },
    deriveAircraftAttack({ playerId, team, aircraft, weapon, tick, round }) {
      return hostAuthoritativeFlightLaunch; // { origin: [x,y,z], aim: [x,y,z] }
    },
  },
  createView({ playerId, team }) {
    const rig = createFleetRig(THREE, { parent: hostSceneFor(playerId), team });
    // Host binds actual loaded assets/descriptors with rig.bindUnit before returning it.
    return rig;
  },
});
if (session === null) return existingNonFactionsPath();
let lease = session.start(privateHostCapabilityObject);
session.join(authenticatedConnection);
session.request(authenticatedConnection, { type: 'spawn', kind: allowedAircraftKind });
session.update(lease, { sequence: 1, elapsedMs: elapsedIntegerMilliseconds });
session.attack(authenticatedConnection, { weapon: allowedWeaponId });
session.setPaused(privateHostCapabilityObject, true);
session.leave(authenticatedConnection);
lease = session.restart(privateHostCapabilityObject);
session.dispose(privateHostCapabilityObject);
```

This is an API example, not an existing served host entry. Non-Factions modes return `null` before reading config, host or view factories. No normal/solo/custom behavior is replaced. The missing concrete entry is the reviewed, rights-cleared Wings room/controller/protocol integration that supplies real authenticated connections, aircraft flight/launch state, scene/asset bindings and lifecycle wiring. No such upstream hook is fabricated here.

- The host identity is an opaque object compared by identity, not a user-provided name/room code. Keep it and returned clock leases in trusted host code; never serialize them or pass them to views/clients.
- `authenticate` is the host's trusted principal resolver, not a browser assertion. It must bind the real connection to an ID and faction. Factions are fixed for joined identities; arbitrary `team` requests are rejected. A future host faction-change workflow must explicitly restart/re-authenticate, not mutate an untrusted payload.
- Config is cloned and bounded to 262,144 serialized characters, then validated by the real core at start/restart. Core unit, weapon, route, replay and player caps remain effective. At most 32 registered identities per authority lifetime are accepted.
- `createView` receives only frozen `{playerId, team}`. Views receive cloned faction-safe snapshots, never private config, replay/actions, clock leases or authority handles. Their mutations cannot damage authority or another viewer's snapshot. View faults are counted, the local view is disposed, and an ordinary aircraft leave is requested; core intermission restrictions still apply.

## One clock and one combat authority

Only the current object-identity clock lease may call `update`. Inputs must have exactly `sequence` and `elapsedMs`, with a new consecutive sequence and integer elapsed time in 0..250 ms. The session accumulates elapsed time and is the **sole caller of core.advance**, in exact 50 ms steps. There is no timer, RAF loop, dropped-time catch-up or second damage/targeting/projectile engine here. The host must retire any other clock for this authority.

Optional `stepAircraft` runs once before each authority step with the step clock DTO and, when configured, an independently cloned authoritative `environment` frame at that starting tick. It must use actual trusted host flight state, not manufacture client poses. The callback does not own a second weather clock. Mutating its frame cannot change authority or presentation. A thrown host-step error faults the session, invalidates its lease and forbids retry/double advance until explicit restart. Replay/action caps inherited from the core can likewise stop this bounded checkpoint; no indefinite-session acceptance is claimed.

Pause consumes sequential clock inputs but discards paused elapsed time; it does not accumulate a resume jump. The pre-pause sub-tick remainder is retained. The view receives the paused flag without advancing the core. Restart constructs fresh authority, clears pending time/event cursors, resets existing views and issues a new lease; stale leases cannot clock the restarted session.

`request` accepts only ordinary validated aircraft spawn/board/switch-seat/leave paths. Fleet units cannot be spawned, boarded, possessed, manned or damaged by session commands. `attack` accepts **only a weapon ID**: it verifies the current authoritative pilot/aircraft/profile, then asks the trusted host for the actual launch pose. Raw browser origin/aim/aircraft/team fields are rejected, not forwarded. Real core cooldown/ammo, projectile, impact/damage, sinking and objective rules remain the single authority.

`leave` disposes the local rig and requests normal aircraft release. During core intermission it reports `releasePending` rather than claiming a release the core declined; the core's next round reset or host restart clears that ownership. `dispose` drops all session authority references and disposes each remaining view once. Host-owned aircraft objects/listeners, authentication and transport still require the host's own lifecycle cleanup; this adapter neither owns nor fakes them.

## Safe presentation and concurrent measured-asset ABI

`publish` uses real `authority.snapshot(authenticatedFaction)` data, independently cloned for each viewer. If a view throws and cleanup requests aircraft release, it discards cached snapshots and reconciles **all** survivors, including views already published earlier in insertion order. Each failed pass removes one client, so reconciliation takes at most the initial client count (bounded to 32) passes. Current-round event IDs are delivered once per view; cursors survive reconciliation and restart clears them. `snapshot(connection)` is an independently cloned faction-safe observer snapshot, not a replay/config export. Event-time submarine redaction and coarse contacts remain core-owned; no hidden poses are reconstructed.

The adapter forwards actual `unit.view` fields unchanged. It does not create synthetic heading, turret, propeller or control-plane values. The existing rig ABI consumes `orientation`, signed node `angles` and absolute-clock `spinners` as documented in `rig-notes.md`. W14 exclusively owns measured muzzle/arcs, fitted collisions and authoritative view channels.

The concurrent W14 source ABI became available during this lane and is exercised directly: private `config.geometry` entries are `{id, descriptor}`, units reference `modelId` and optional `heading`/`turnRateRadS`, and supported weapons explicitly reference `mount`. The session passes this config only to the authority, not presentation. The measured fixture loads both real escort descriptors, checks reciprocal actual-muzzle firing positions and forwards real authoritative aim/orientation/spinner fields unchanged to the rig ABI spy. A second real-submarine-descriptor fixture verifies continuous depth and actual propeller/control-plane channels without revealing the hostile submerged unit. Anonymous legacy core counterplay units remain explicitly configured fixtures, not invented Type45/Type054A ASW rigs. These observations refer to the inspected concurrent W14 source; its source review/commit remains its owner's gate.

An initial 600 m escort fixture could not produce reciprocal fire under the actual conservative upward-only gun envelopes. The final 220 m face-off fits both real island targets without changing any gun limit or capability check. This is bounded mechanical integration evidence, not balance or long-range combat acceptance.

## Original map/weather/model composition

`fleet-composition.mjs:createFactionsComposition` is the concrete original-module entry above the lower-level session. It selects one real `createMap`, places profiles using measured descriptors, obtains that map's explicit weather allowance, validates weather through the actual sampler, and configures the same FC authority. It binds rigid clones of caller-prepared actual GLB objects into `createFleetRig`, rather than using a presentation spy. It imports no upstream host code and is not a browser entry or alternate game.

```js
const session = createFactionsComposition({
  mode: 'factions', mapId: 'fjord-coast', seed: 771,
  profiles: reviewedFleetProfiles, aircraft: reviewedAircraftProfiles,
  models: preparedModels, // [{ id, descriptor, object: loadedRigidGLBScene }]
  THREE, host: trustedHost,
  weather: { seed: 42, initialPreset: 'rain' },
  createPresentation({ playerId, team }) {
    const { scene, sun, ambient, sampleDaylight } = trustedPresentationFor(playerId);
    const weatherView = createWeatherView(THREE, TSL, { scene, sun, ambient, sampleDaylight });
    return {
      parent: scene,
      presentation: { quality: 'balanced', reducedMotion: true, lightning: 'off' },
      applyEnvironment: weatherView.applyEnvironment,
      dispose: weatherView.dispose,
    };
  },
});
const map = session.world(trustedHost.identity); // Host-only, never a client/config export.
// Start/join/request/update/pause/restart/leave/dispose use the same session API above.
```

This example names required host callbacks, not already-installed Wings hooks. `createWeatherView` is the original `weather/weather-view.mjs` adapter; inject the matching existing Three/TSL modules. Its `sampleDaylight(simulationMs)` callback returns `{sunIntensity, ambientIntensity, fogColor:[r,g,b]}` from the host's fresh daylight sample, not last frame's weather-scaled intensities. The adapter installs real NodeMaterial scene fog and updates real lights; it is not a native shader/pixel or whole-game weather acceptance. Rain/cloud/sky/lightning, custom fog-disabled materials and actual host consumers remain separate.

An optional `createPresentation.dispose` owns presentation resources such as that weather adapter. Composition calls it once after rig cleanup on leave, publication failure and disposal, and also after returned-factory setup failures (including invalid preferences/world roots and partial binding). Rig cleanup uses `finally`, so weather cleanup still runs if rig disposal throws; a setup failure plus cleanup failure reports both through `AggregateError`. A factory that throws before returning its resources must still clean them up itself. Restart resets rig state and publishes time zero without allocating another weather graph.

`models` are preloaded trusted rigid resources; the composition clones object/node transforms but shares original geometry/material/texture resources without replacing their PBR values. The caller owns those resources and its scene/environment consumer; disposing a rig restores/detaches its clones and disposes only rig-owned effects. Skinned assets and transformed world roots reject rather than silently misaligning authority muzzle coordinates. Map mesh buffers remain shared read-only under the map API; do not transfer/detach them.

The existing session clock supplies the trusted aircraft callback with the authoritative starting-tick environment; the composition adds the actual selected `worldQuery`. Published environment frames use the resulting tick. Weather quality/motion/lightning preferences affect only presentation, never authoritative visibility or damage. Consumers must use `environment.visibility`, which includes base density, not the weather-only visibility subfield. Apply sun/ambient multipliers to freshly sampled daylight once, never cumulatively. Actual Wings shader/particle/daylight and flight/prediction consumers still require rights-cleared host wiring. No nonzero wind acceleration or physical aircraft flight is fabricated by this entry.

Surface-only measured pairs are an executable valid slice. Six-role fixtures with real submarine rigs still need explicitly anonymous legacy ASW counterplay until real model-compatible escort launch art and authority trajectories exist. The composition does not erase `modelId`, infer launch capabilities, or bypass the FC symmetric-counterplay check. Unbound legacy units remain host-owned presentation, not magically modeled by this rig. See the map/core notes for conservative route and shared-fleet-intel visibility limits.

The new `fleet-composition-check.mjs` uses real serialized GLB meshes and nodes plus Three math, with factor-only CPU materials. It does not decode embedded texture images or draw pixels. Its explicit trusted aircraft-pose fixtures and anonymous ASW fixtures are not natural flight or a model-ready full fleet.

## Runnable receipts and limits

```sh
node --check Games/Wings/authoring/fleet-session.mjs
node --check Games/Wings/authoring/fleet-session-check.mjs
node Games/Wings/authoring/fleet-session-check.mjs
THREE_ROOT="$EXISTING_THREE_PACKAGE" node Games/Wings/authoring/fleet-composition-check.mjs
```

Nine runnable session groups (the prior eight plus authoritative weather/step-copy/pause/restart coverage) use the real FC core and a fleet-rig ABI spy. The separate composition check exercises the actual rig using the shared GLB geometry fixture instead of duplicating its decoder. Covered: non-Factions decline, strict host identity/faction, single/paused/reentrant/stale clock rejection, ordinary aircraft ownership/requests, host-derived attacks, real reciprocal AI shots/HP/sinks/objectives, event dedupe, hidden submarine redaction, mutation isolation, flight-step faults and leave/restart/disposal. The trusted aircraft launch coordinates in the fixture are explicitly fixtures, not natural-input flight evidence.

**CPU host/session integration only.** Real GLB articulation remains separately checked by `fleet-rig-check.mjs`; no new rendered-material/native/PBR/FPS acceptance is implied. Actual served host entry, remote transport/authentication wiring, complete real aircraft pose/cooldown reconciliation, legal/source-build delivery, complete roster and native gameplay remain open. No browser, build, install, backend, new game ID or push is part of this lane.
