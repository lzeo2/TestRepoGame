# Capital Drive street-life expansion, 14 November 2026

Owner order following merged sports PR11: less dense street presentation, clearer
Manuka shops/pool and inner-south landmarks, more realistic original materials,
buses, visible drivers, carjacking, robbery, gun acquisition, food/gym services,
five-star wanted feedback, road/foot police and a gentler hospital transition.
Existing original game245, no new catalog entry. Merge follows the owner's
explicit merge-all instruction after focused verification and disclosed limits.

## Ownership and shared boundaries

All workers read AGENTS/quality/manual/skill, use the selected Sol model, own
explicit disjoint files, work at most20minutes and commit only in an exclusive
index window. No push, browser, server, remote runtime assets or shared car-factory
edits. Source geographic JSON/terrain/addresses stay byte-identical. Root owns
script.js/index.html/style.css/street-ui.js/progression.js, UI/economy/integration,
written reference/maintenance prose, test runner, subjective/browser review.

- C1: road-network.js, simulation.js, data/road-profiles.json, reproducible road
  profile builder, own new road/collision tests plus existing drive test.
- C2: landmarks.js/landmarks-view.js, landmark test. Exact pool basin and one
  inspected ACT replacement; original material detail, preserved Parliament cues.
- C3: buses.js/bus-view.js and new bus test. Fictional ambient circuits on actual
  public roads; two bounded unbranded buses, no real route/timetable claims.
- C4: actor-view.js, vehicle-occupants-view.js and actor/occupant tests. Police car
  remains visible after officer dismount; occupants inside local car geometry.
- C5: gameplay.js, police.js and gameplay/police tests. Wanted/road pursuit/foot
  officer, timed occupied-car taking, acquired pistol and delayed recovery.
- C6: world-view.js/neighbourhood.js, new districts.js and world/neighbourhood
  tests. Narrow service streets via profiles, source retail polygon and original
  surface/glazing detail. Root owns written references and integrates new imports
  in other test loaders if needed; do not edit other workers' tests.

## Interfaces agreed before implementation

C1 road-network.js exports roadProfile(road), applyRoadProfiles(map,sidecar) and
createRoutePlanner(graph). roadProfile returns driveWidth,pavementWidth,hasKerb,
markings,trafficAllowed,busAllowed. Sidecar maps exact exported road IDs to cached
OSM service/access/width tags with source hashes; no source coordinates rewritten.
applyRoadProfiles returns an annotated runtime map without mutating its input.
Planner.findEdges(start,goal,{kind:'car'|'bus'}) returns legal directed edges or[].
It is bounded, no route search every frame. Simulation uses profile width for
lanes and excludes private/parking/driveway traffic. Preserve existing graph API.

Simulation adds setExternalVehicles(list), canOccupy(pose,{length,width,ignoreId})
and moveVehicle(vehicle,dx,dz,{length,width}) with bounded front/middle/rear sweep,
self-ID exclusion and external blockers in player/foot/traffic contacts.
External descriptor: id,x,z,yaw,length,width,active; stable references allowed.
requestVehicleStop(id,seconds) requests bounded braking, not instant claiming;
nearbyVehicles adds occupied true for traffic, false for parked/abandoned.

C3 createBuses(map,simulation) returns vehicles,step(dt),reset(),snapshot(). Uses
C1 planner and swept movement, turns/brakes without teleporting at junctions,
stops briefly at fictional safe layover points. createBusView(scene,heightAt)
returns update(vehicles,focus),stats,dispose. Cars/buses respect shared external
vehicle blockers; root registers buses and patrol car poses each step.

C5 createGameplay API remains compatible. New injected hasPistol() and fitness()
read career ownership/upgrades; sandbox has its own supplied loadout. Public
addAmmo(amount),heal(amount) apply successful root-owned purchases. State exposes
carjacking and recovery progress. Occupied-car interaction requests a stop and
holds a bounded taking action; only a successful claim changes player vehicle.
onCarjacked callback supplies displaced adult pose/id for visual exit. Own current
unoccupied vehicle/parked entry stays compatible. Police preserve sight through
actual building geometry, search last seen, obey road graph in cars, stop and
spawn an officer on foot, reboard/replan as needed. At most4car/officer units.

Police state retains x/z/yaw for the active observer, adds mode:'vehicle'|'foot'
and car:{x,z,yaw,speed,active,length,width,id}. Parked patrol car remains an external
blocker. Officer position is x/z in foot mode. C4 renders from this contract.
Recovery has reason,phase,elapsed,duration/progress, blocks actions and delays the
existing single respawn/penalty callback until transfer. No instant visual jump.

C4 createVehicleOccupantsView(scene,heightAt) returns update(dt,{cars,focus}),
addExit({id,x,z,yaw}),stats,dispose(). Cars supply id,x,z,yaw,modelId,active,occupied
and optional dimensions. Instance seated adults inside transparent glazing using
local geometry. The inherited factory cabin is left-hand-drive; do not pretend
moving a head changes its baked wheel. Exits are pooled adults with bounded life.
ActorView uses police.mode/car for separate officer/patrol presentation.

C2 adds Manuka Pool using cached OSM58851110 exact basin quad and sports-centre
51677758 context; suppress only act-75267-0 (generic block occupying water).
Preserve nearby act-92000-0/95964-0/125329-0. Extend landmark budgets by measured
small geometry only, retain mast/forecourt/roof/flag regression protections.

C6 districts.js uses source retail polygon OSM31974923 for Manuka classification,
shared by world/neighbourhood; no arbitrary global radius inflation. Profile
width affects asphalt, kerbs, footpaths and furnishing setbacks consistently.
Keep all real road runs/parallel carriageways, lower detail on driveways/aisles.
Original locally generated material grain/controlled variation and glazing may
improve realism; no photographic textures or surveyed-detail claims.

## Root services and verification

Root adds fictional food/gym/arms/robbery service points beside mapped commercial
streets, location/wanted/on-foot/cost gates and single authoritative payouts.
Preserve strict legacy career saves and separate Free roam: no career teleport,
no sandbox earnings, safe validation and no overwrite of invalid saves. Star HUD
shows1–5, shops/actions concise; recovery overlay transitions visibly.

Cheap actual source suites gate each milestone. Then one bounded coordinated
browser pass with normal input plus explicitly labeled visual-only fixtures for
far viewpoints/high wanted or unavailable expensive paths. Preserve failed runs.
Source provenance/Street View observation limits, software-WebGL/native/N100
limits and historical fleet failures stay explicit. Update reusable skill/runner
for every new required module. Root merges the completed PR after verification.
