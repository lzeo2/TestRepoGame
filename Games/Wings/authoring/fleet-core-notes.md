# Original FC core checkpoint

`fleet-sim.mjs` and its local `fleet-geometry.mjs` math dependency are original simulation code, not copied upstream source, a RoomEngine adapter, served Factions integration or a new game. No existing seven-kind behavior/assets/bundles/patch were changed. Optional weather below integrates only the original local fleet authority. Upstream rights remain a separate integration gate.

Run: `node Games/Wings/authoring/fleet-sim-check.mjs` (14 CPU groups) and `node Games/Wings/authoring/fleet-weather-check.mjs` (7 integration groups). Touched modules pass `node --check`.

Raw rig fixture preparation: `python3 -B Games/Wings/authoring/check-fleet-rig-browser.py --self-check --three-root "$THREE_ROOT"` checks exact local routes, actual Three import closure, hashed embedded GLBs, inline ESM syntax and cleanup/deadline configuration without a server/browser. The four planned native raw views remain **ADAPTER POSE FIXTURES**, not natural gameplay, integrated muzzles or served Factions. Actual capture is parent-only after Citisten/Foldwild/Jank RELEASE and fresh preflight; `--browser-slot-approved` records that assertion. No capture PASS is claimed.

API: `createFleet(config)`, `advance(integerMilliseconds)`, `addPlayer(authenticatedId, faction)`, `request(id, command)`, `launchAircraftAttack(id, trustedLaunch)`, `snapshot(authenticatedFaction)`, `exportReplay()` and `replayFleet(replay)`. The later adapter must authenticate IDs/factions and derive aircraft launch poses from its real simulation, never forward raw client launch coordinates. Aircraft ownership/seat records here are validation state, not flight physics. Register aircraft bots through the same validated requests, not a bypass.

Integer-ms advances (0..10,000 per call) accumulate 50 ms ticks without dropped time. Replay validates and re-executes a bounded action log. Replay/config contain private scenario poses: authority storage only, NEVER client/HUD data. Only faction snapshots are presentation-safe. No network, renderer, clock or global room state.

Implemented: bounded original axis-aligned water arena/obstructions, deterministic AI routes, surface acquisition/defense preference, finite shared projectile/swept-hit/damage/sink authority, aircraft attack entry, capital outcomes/intermission, three continuous submarine depth states, sensor/contact uncertainty/expiry, estimated-area underwater attacks and symmetric escort counterplay. Small fixture has one carrier/escort/sub per faction. Pressure checks actually reach 64 surface and eight underwater projectiles. Caps: ten surface/two subs, four mounts/unit, four sensors/contacts/faction, sixteen sensor checks/250 ms, 256 retained events, 4,096 replay actions.

W13 correction: vessel IDs reserve the generated `aircraft_` namespace, preventing source-ID collision immunity and friendly-blocker bypass. Bounded private event-time redactions retain faction visibility when emitted: resurfacing cannot reveal earlier underwater coordinates; legitimate visible fire and redacted friendly damage remain available. Both runnable repros now join the range-boundary and existing replay/cap checks.

Deliberate ceilings: unbound legacy fixtures retain axis-aligned boxes; measured bindings use rotated fitted hull/deck/island slab hits at fixed-tick yaw with translation sweeps. Movement broadphase is conservative rotation-safe radial bounds, not precise hull contact; within-tick rotational collision is not continuous rigid-body physics. Straight finite projectiles, at most four route points/eight depth or sensor schedule entries, two non-refilling underwater rounds/unit, no turret subcomponent HP, seeker or splash system. Coarse cells have deterministic centers, not exact submarine tracks. These are conservative original-core mechanics, not naval realism or fitted model acceptance. Match/HP settings are scenario inputs, not claims about upstream defaults.

W7's [provenance receipt](../../../docs/wings-upstream-provenance.md), commit `7338a2e`, authenticates all 70 retained files and 13 original assets and re-verifies approved tools. Actual subtree ancestry provides no applicable redistribution grant; source identity is not an outstanding rerun.

Remaining: applicable upstream code and asset permission, reviewed source-built RoomEngine/protocol adapter and delivery, authoritative aircraft pose/cooldown reconciliation, remaining class bindings and turret subcomponent damage, repaired/new models and animation/material consumers, complete roster/fleet composition, matching source-built delivery, native visible fleet exchange, performance/balance/release gates. Renderer must consume this authority rather than implement independent damage/targeting. No browser/build/install/push occurred. Parent owns maintenance/resume receipts; commit requires its shared-index window.

## Measured authority binding and host handoff

Optional config extension (no filesystem/network loader inside the core):

```js
config.geometry = [{ id: 'escortA', descriptor: measuredModelRepairEntry }];
unit.modelId = 'escortA';
unit.heading = 0; // radians, nose -Z; optional, default 0
unit.turnRateRadS = 0.3; // optional, 0.01..0.6
unit.weapons[0].mount = 'main_gun'; // surface only
// For the actual submarine descriptor, an explicitly configured underwater weapon
// instead binds 'underwater_launch_port' or 'underwater_launch_starboard'.
```

Each measured weapon needs one unique compatible actual mount; no weapon/sensor is enabled by a model name or descriptor capability label. Escort descriptors currently have no underwater launch origins: binding an ASW weapon to their gun fails. Original legacy counterplay fixtures do not establish model-backed ASW launchers.

FC emits `unit.modelId` plus `unit.view = { orientation, angles, spinners }` in faction-safe snapshots. Orientation is xyzw yaw from authoritative motion; `angles` uses actual descriptor node names and signed axes/limits. Gun angles come from the reachable straight-ray solution. Sub plane channels come from actual depth/turn rate via the descriptor mapping; props use actual horizontal speed and continuous rebased `{phaseRad, rateRadS, epochSeconds}`. The view host passes these unchanged to `fleet-rig.mjs`; it must not add a second aim/damage authority or synthesize hidden submarine poses.

Measured gun launch positions and directions now compose actual root yaw, yaw/pitch pivots, muzzle and bore frames. Range, fitted own-hull clearance, obstruction and friendly-line checks start there. Reachable fitted superstructure points allow real reciprocal damage; downward targets outside the supplied signed pitch fail closed, not fake-aligned. No ballistic capability was added. The submarine uses its actual fixed outlet ray, checked against measured forward loft clearance; hidden-target firing intersects only the contact cell/depth area, never the private target hull. Hits still go through the single physical projectile/damage authority.

Run `THREE_ROOT="$EXISTING_THREE_PACKAGE" node Games/Wings/authoring/fleet-geometry-check.mjs`: nine CPU groups cover three actual GLB hashes/node frames, identity/rotated muzzle/outlet transforms, signed arc rejection, fitted OBB/island hits, reciprocal measured-origin fire/sinks, range/clearance/friendly rejection, live prop/plane channels, submarine outlet damage and replay. W16's legal-API regressions additionally reject the deep hull at bottom -25 when its full swept minY would penetrate the seabed, block invalid descent/full-body obstacles, and keep rootY -8.125 hidden while measured top is still below water. Clearance uses separately compiled full/static/available swept bounds, not smaller damage boxes; measured submarine top drives the shared depth/target/privacy decision. Legacy unmeasured fixtures alone retain symmetric-half fallback. Existing 14 core groups remain required. These are original local authority/geometry integration results, not source-built upstream RoomEngine integration, served play, native visuals or full fleet/model acceptance.

## Optional shared weather authority

```js
config.weather = {
  config: createWeather(explicitMapPolicyOptions).config,
  baseVisibility: {fogBase:0, fogSea:0, fogFalloff:1/300}, // optional whole DTO
  minimumTransmittance: 0.1, // optional, 0.01..1
};
// Every configured fleet AND aircraft weapon must explicitly classify acquisition:
weapon.acquisition = 'visual'; // or 'nonvisual'; never inferred from name/medium/model
```

`createWeather` is the existing original `weather/weather.mjs` API; map policy belongs to the actual map/composition owner, not this fixture. The core normalizes and serializes its config. Omit `config.weather` to preserve previous contracts and snapshots (no environment field/classification requirement). An explicitly supplied acquisition field is always validated.

Opt-in snapshots add `environment:{simulationMs,weather,visibility,minimumTransmittance}`. `weather` is the actual sampler's default-presentation DTO at `tick*50`; `visibility` adds base and weather density. Base defaults to zero density/falloff 1/300. Nonzero base sea fog requires matching falloff across all allowed weather endpoints when weather can add sea fog; unsupported mixed exponentials or density overflow reject, never silently approximate. The host must use this SAME composed visibility for presentation. No extra clock, timer, RNG state, quality-dependent sensing or flight force is introduced. Fractional core remainder does not advance weather beyond the last authoritative tick.

AI eligibility and trusted aircraft visual launch validation both call the shared `canAcquireVisual` rule at actual from/aim coordinates and the same threshold. Blocked visual shots consume no rounds or launch events. Explicit nonvisual weapon behavior and the existing sonar/contact sampler remain unchanged; symmetric submarine counterplay is not weakened. Measured escorts still lack ASW launch origins.

Disclosure is explicit **shared fleet intel**, not actual aircraft-observer sensors: live surfaced friendly fleet roots are optical observers, with the same transmittance test plus geometric obstruction. No live eligible observer means no hostile visual disclosure. Hostile surface/surfaced-sub poses/HP/view markers outside this coverage are omitted. Submerged enemies remain omitted even with confirmed sonar contact; the contact ledger retains its coarse nonvisual uncertainty DTO. Event-time private redactions are retained AND current visibility is reapplied: a later clearing cannot disclose previously hidden hostile firing origins/targets. Hidden attackers may yield source-null feedback on visible friendly impacts/damage. Weather-visible hostile surface projectiles expose only id/source/team/medium/position, not remaining distance, velocity, damage or lifetime; hidden origins are redacted, enemy underwater projectiles remain suppressed. Private config/replay are authority storage only, never view data.

Focused checks cover strict classification/config, composition/falloff, clear/dense positive and negative AI AND aircraft shots with actual damage, explicit nonvisual and sonar counterplay, both factions' event-time/current privacy and projectile reduction, core zero-advance pause/time partitions and JSON replay. Actual host aircraft positions, parent visual-environment wiring, map policy and source-built served/native delivery remain separate integration gates. No browser/build/push in this lane.
