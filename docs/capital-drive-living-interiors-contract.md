# Living interiors and activities, 14 November 2026

Existing owner-authorized Capital Drive245. Continuing merge-all order applies.
Scope: closer actual noodle restaurant references, staff/diners, busier Civic,
pedestrian collisions, nearby notable parody stores, the actual Civic skate park,
and purposeful interiors with playable mini-games. No new game/catalog entry.
The old source snapshots, compact buffers, sandbox rules and save compatibility
remain. Source/reference photographs are inspection inputs, never bundled assets.

Use disjoint Sol workers, max20minutes per task, explicit owned commits with
exclusive index windows. Root owns integration/input/UI/economy/camera/subjective
review/documentation/release. No worker push. No new packages/runtime remote assets.

M1 owns pedestrians.js and test_capital_pedestrians.mjs. Add adaptive bounded
Civic population using actual safe sidewalks/shared-street edges, instancing and
cached spatial queries. Export clipMovement(actor,dx,dz,radius) returning clipped
dx/dz/blocked before the controller applies wall movement. People yield/react,
never block doors permanently. Preserve witness attribution/ordinary-driving gates.

M2 owns new interior-people.js and test_capital_interior_people.mjs. Pure createInteriorPeople()
load(plan),update(dt,{actor,activity}),clipMovement(actor,dx,dz,radius),snapshot(),clear().
Own new interior-people-view.js createInteriorPeopleView(scene,heightAt) load(plan),
update(people,dt,{activity}),clear(),stats,dispose(). Staff/diners/shopkeepers and
mall visitors are fictional adults; active interior only, pooled <=16 people and
<=6 draws. No door/counter/aisle obstruction. Interior load/clear must be lazy.
Bench exercise view may render a lying player and animated bar at plan.exercise
without changing actor world state. Root hides the regular player while exercising.

M3 owns new interior-activities.js and test_capital_interior_activities.mjs.
createInteriorActivities(): load(plan),nearest(pose),start(id,context),step(dt,input,context),
cancel(),clear(),snapshot(),drainEvents(). Add per-plan stations: noodle order game,
shop stock memory, house TV reflex/cooking/rest, mall arcade/stock and gym bench.
Bench: hold X+Y, press ArrowUp on a timed cue for each repetition; releasing grip,
early/late presses and key-repeat cannot award repetitions. Edge-triggered input,
6 reps, clear success/failure/retry/cancel, paused dt0 freezes clocks. No economy or
storage owner. Completed events fire once; sandbox may practise but cannot earn.
Stations derive plan furniture and expose world x/z/yaw/radius/label/kind. Bench
activity exposes lift0..1 and reps for animation. Leaving/recovery cancels session.

M4 owns interiors.js/interior-view.js/test_capital_interiors.mjs. Add source-tied
enterable fictional Kingston gym through createGymEntry(map,service) exported from
interiors.js; select nearest actual clear source frontage, no invented survey.
publicEntries may include gym serviceId. Gym plan has exercise station/bench/rack/
bar and walkable approach, with plan.exercise marker. Add matching activity stations
in plan.activities (id/kind/label/x/z/yaw/radius) for every enterable house/shop/mall/gym,
coordinate M3 schema directly. Existing twenty-one stores and mall/house lazy
lifecycle/counter/disposal stay covered. Improve noodle room material/layout only
where actual inspected reference supports it; root supplies exterior observations.

M5 initially owns no production files: audit actual nearby named POIs and the
Civic skate park from retained north OSM cache and official public references.
Report exact IDs, bounds, features, named streets/entrances and missing evidence.
Then root grants a bounded source/geometry implementation after source review.

Root integrates player/NPC swept collision, activity HUD and edge keys, gym financial
start/finish authority, NPC view lifecycle, new source/store/skate adapters, normal
browser tests and source docs. Existing services remain available; no shop/home
may be a dead room. Gym training uses minigame completion, never an automatic timer.
No map teleport in Campaign/Street Life; Free roam cannot bank rewards.
