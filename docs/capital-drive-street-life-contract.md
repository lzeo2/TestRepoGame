# Capital Drive Street Life implementation contract

Operator decisions, 13 November 2026 (Australia/Sydney): continue existing game245.
Grounded Canberra with chaotic driving; on-foot walk/sprint/melee/firearms/aiming,
enter/steal cars, police sight/search/escape, delivery/race/theft/getaway jobs,
persistent cash/owned cars/garage/repair/paint and better-paying jobs. Arrest or
defeat respawns near a station/hospital, deducts cash and preserves completed jobs.
Frequent aggressive traffic, road rage and reactive pedestrians. Keep N100/8GB,
keyboard/mouse, local runtime and original artwork. Prioritise recognisable
inner-south landmarks, especially Parliament House, with actual Street View
samples as visual references. No proprietary imagery is bundled.

Two modes share one source tree/catalog entry. **Street Life** has no map teleport
or Start nearby, including action-handler guards. **Free roam** has those travel
tools plus offline address/landmark/street search. Switching modes resets the
world/transient state; sandbox actions never earn career progress or cash.

## Ownership

Six disjoint worker tasks, at most20minutes each, explicit-path commits coordinated
through root before staging. No worker pushes. Root owns controller, HTML/CSS,
mode/input/camera/HUD/map/search integration, documentation, final QA and shipping.

1. simulation.js and its regression: denser aggressive traffic, vehicle claims,
   foot collision and line of sight adapters.
2. gameplay.js and its regression: foot/combat/vehicle interaction/health/police.
3. pedestrians.js and its regression: panic/anger, hit/strike and event reactions.
4. progression.js and its regression: jobs/cash/garage and validated persistence.
5. actor-view.js and its regression: character, police and combat rendering.
6. landmarks.js, landmarks-view.js, landmark test and reference notes: bounded
   dedicated landmark geometry, real coordinates and source evidence. World-view
   changes limited to skipping explicitly replaced source building IDs.

Existing world/neighbourhood/terrain data, shared car factory, other games,
compiled portal, protected Character AI and proxy/security stay intact. Never
add an animation loop to a module: root supplies dt; dt0 freezes all dynamics.
Read AGENTS/CODE_QUALITY and the game maintenance page. Imports stay local.

## Shared coordinates and controller loop

Metres x=east,z=south. Yaw faces forward (-sin(yaw),-cos(yaw)). Root runs60Hz
simulation, renders30/60 targets and calls: simulation.step(dt,driveInput,focus),
gameplay.step(dt,footInput), progression.update(dt,context), then render adapters.
Root supplies callbacks/objects to gameplay; modules must not depend on DOM or
reach into the controller. Read-only QA snapshots remain detached/frozen.

## Simulation additive API

Preserve current player/traffic/graph/step/reset/teleport/nearestRoad/setParkedCars.
Use40 nearby cars by default, bounded<=56. Stable traffic IDs/array slots; active
false cars are hidden/skipped and only recycled outside visible range.

- step(dt,input,focus=player): focus can be a walking actor; traffic stays nearby.
- setPlayerVehicle({modelId,color}): metadata for current controlled car.
- parkedCars and abandonedCars arrays retain descriptors {id,x,z,yaw,modelId,
  color,active}; setParkedCars preserves caller IDs/metadata. Root hides inactive
  parked instances. Abandoned cars are bounded and have root-owned meshes.
- nearbyVehicles(x,z,radius=7): descriptors including id='player', traffic IDs
  'traffic:N', parked caller IDs and abandoned IDs. Returns clear active candidates.
- claimVehicle(id): {ok,vehicle,stolen,reason}; keeps trip/crash counters, stops car,
  moves controlled-car state to the claimed pose, deactivates claimed source and
  retains prior car as a bounded abandoned descriptor when another car is taken.
- moveActor(actor,dx,dz,radius=.45): mutate actor x/z with building/water/bounds
  and vehicle clearance, returns movement result. No teleports to distant roads.
- hasLineOfSight(a,b): real building polygons obstruct bounded sight segments.

Traffic behaviour fields and honk/event counters may be additive. Keep left-hand
and one-way graph routing; overtaking requires available clearance. Road rage
must still have collision avoidance, cooldown and finite/recoverable states.

## Gameplay additive API (new pure module)

createGameplay(map,simulation,options={pedestrians,heightAt,onVehicleChanged,
onRespawn,onEvent,sandbox:false}). Options are injected, not global imports.
Expose state, step, interact, setWeapon, reload, reset, reportOffence, focus,
snapshot. Implement a bounded actor collider and police fleet (<=4), no DOM/RAF.

state fields: mode='vehicle'|'foot'; actor={x,z,yaw,speed,jumpHeight}; health100;
vehicleHealth100; weapon='unarmed'|'pistol'; ammo; aiming; wanted0..5;
pursuit='clear'|'pursuit'|'search'; heat; police array; shots array; respawnSerial;
vehicle={modelId,color,stolen}; event/message. focus() returns the actor or
simulation.player according to mode. Input uses world moveX/moveZ, aimYaw,
sprint,jump,aim,fire,melee; key interactions call interact() once per press.

E exits a stopped car to clear nearby ground or claims a nearby vehicle using
the simulation adapter. onVehicleChanged(vehicle) lets root update car meshes.
On foot: fists/pistol, cooldown/ammo/reload, hitscan/raycast clipped by buildings,
pedestrian strike/panic, police damage and non-graphic impact feedback. Police
offences escalate; actual line of sight follows/chases, then searches last seen
position; hiding cools wanted, a fresh offence resets escape. Do not show police
seeing through buildings. Respawn restores health at mapped public station or
hospital road approach; callback penalises career and clears transient job.
reset({sandbox}) clears transient state. Sandbox has no police/career penalties.
Root owns vehicle steering/drive input. Mode switching/resetting is not earning.

## Pedestrians additive API

Preserve update(player,dt,traffic),resetPopulation,stats,snapshot,dispose.
Add alert({x,z,radius,kind}) and strike({x,z,yaw,range,damage,kind}) returning hit
counts/descriptor(s). No gore. State includes health/reaction/fear/anger with
bounded timers and recovery/recycling; hits produce visible knockdown/stun/flee.
Expose drainEvents() for witnessed offences/occasional adult retaliation; root
or gameplay consumes once. World movement stays on safe generated sidewalks.
Snapshot adds health/reaction fields without breaking existing fields.

## Progression additive API (new pure module)

createProgression(map,saved=null) owns validated career state but no localStorage.
Expose state,jobs,garage,startJob(id,context),update(dt,context),cancelJob(),
penalize(reason),buyVehicle(id),repairVehicle(),paintVehicle(id,color),
storeVehicle(vehicle),serialize(),drainEvents(). Bad saved data throws; root
keeps the bad/denied source unwritten. Use a separate career save key; keep
the existing discovered-places save independently migrated by root.

Initial cash1000, owned lantern. Other original cars buyable; store/repair/paint
have actual costs and feedback. Missions include>=one delivery, race with ordered
checkpoints, target vehicle theft and wanted getaway. Completion earns once per
run, persists completed IDs and unlocks better-paying jobs. No instant grants
from job clicks; destinations require actual arrival. ctx={pose,onFoot,vehicle,
wanted,vehicleHealth,respawnSerial}; active job has stage/target/remaining/reward.
Root maps its target and draws markers. Job/garage coordinates are approximate
gameplay locations beside real roads, not assertions about real businesses.

## Actor view (new Three adapter)

createActorView(scene,heightAt) -> update(state,{dt,time,focus,objective}),stats,
dispose. Render original articulated adult player only in foot mode, pistol/aim/
melee/walk/sprint animations, bounded police cars using unchanged local car
factory with generic light bars, brief shots/impact effects and objective marker.
Read gameplay schema above; add no physics/RAF or DOM. Geometry/materials pooled,
far objects culled, correct grounding/disposal. No logos/assets from GTA or police.

## Landmark adapter

landmarks.js is pure data: LANDMARKS array {id,name,x,z,radius,description,lat,lon},
and replacedBuildingIds(map) returning exact source footprint IDs to suppress.
Use existing local projection origin149.137E,-35.318S; coordinates must be real.
createLandmarksView(scene,map,heightAt) -> update(focus,time),stats,dispose.
Parliament House takes priority: correct orientation, broad grass roof/rising
wings, curved pale frontage, formal forecourt and recognisable81m flag mast.
Also bounded dedicated Old Parliament House, Manuka Oval and Kingston Powerhouse
and other justified inner-south public landmarks. Follow verified references;
document approximations. LOD/culling must retain visible skyline silhouettes at
appropriate distances without imposing heavy detail city-wide. Root extends
camera far plane; distant landmarks may need fog-aware materials. Correctly
dispose pooled geometry. Root merges extra landmarks at runtime, does not rewrite
the geographic source snapshot or fabricate geodata claims.

## Verification and reusable workflow

Each worker leaves meaningful pure regression(s), syntax/diff checks and an exact
commit/digest report. Root runs the original regressions and focused real-input
browser tests for both modes, pause/input, vehicle entry/stealing, combat/wanted,
jobs/garage/save, landmark visibility, address search and teleport restrictions.
No production state setters or synthetic gameplay grants as positive browser
proof. Capture actual desktop/mobile frames, both themes. Keep raw source/CLI/
browser tooling outside repo. Write a local reusable development SKILL.md and
bounded check script covering ownership, data/reference import, run/test/preview,
save migration, budgets, maintenance refresh and review handoff. No Sites.
