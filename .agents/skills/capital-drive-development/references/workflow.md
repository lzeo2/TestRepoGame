# Capital Drive development workflow

## Establish the working boundary

1. Read the files listed in SKILL.md, then inspect current Git status, branch,
   source and callers. Do not reset another worker's edits. Use `rg`/`rg --files`
   for authored code and `git ls-files` or `git show HEAD:...` for sparse files.
2. Run `df -h /` before downloads or checkout growth. Below 2 GiB free, stop growth
   and report. Record `git sparse-checkout list` when enabled. Expand only the
   needed game/shared assets with the repository's existing sparse convention;
   preserve the original selection and restore it after verification. Do not
   perform a full Games checkout.
3. This is an existing owner-authorized original game, catalog 245. Read credits,
   `docs/capital-drive-sources.md`, expansion/store-pool contracts, street-reference notes and data licenses before
   changing source-derived content. Do not add runtime remote requests or assets.
4. State concrete owned paths and the behavior being changed. For authorized
   parallel work, use disjoint modules and one exclusive index window per commit.
   Keep each task at most 20 minutes. Never use broad staging or push implicitly.

## Static setup and module ownership

Serve the repository root, not the game folder, because imports use shared local
assets. No npm setup, build step or node_modules is needed. Node pure suites load
local browser modules and local Three.js; they do not require a GPU. Optional
Python Playwright and geodata packages belong in an external environment. Do not
install them into this repository or vendor unrelated tooling.

| Owner | Source/API boundary |
| --- | --- |
| Controller | `script.js`, `index.html`, `style.css`: input, camera, HUD/dialogs, mode guards, render loop, career/discovery storage and target display |
| Simulation | `simulation.js`, `road-network.js`: indexed parked/static barriers and profiled directed left-lane graph, cached access routes, driving/traffic, braking requests, claims, shared swept external vehicle/actor collision and building-obstructed sight |
| Gameplay | `gameplay.js`, `police.js`: injected simulation/pedestrians/equipment callbacks, timed carjacking, foot combat, directed patrols/dismounted officers, recovery transition and single respawn callback |
| Progression | `progression.js`, `services.js`, `stores.js`: mapped parody stores and jobs/cash/garage, location/cost/weapon gates, food/ammo, timed fitness/robbery and saved till cooldowns; validated serialize/load, no DOM/storage |
| Pedestrians | `pedestrians.js`: bounded sidewalk population, alert/strike/reactions, consumed offence events |
| Shared people | `person-model.js`: deterministic appearance and rounded body dimensions; views own pooled geometry and poses, Simulation receives copied contact circles |
| Rendering | `actor-view.js`, `vehicle-occupants-view.js`, `traffic-view.js`, `storefronts-view.js`, `services-view.js`, `bus-view.js`, `landmarks-view.js`, `world-view.js`, `neighbourhood.js`: pooled local geometry, grounding, culling/disposal; no physics/RAF |
| Geographic/navigation data | `data/canberra.json`, `navigation.js`, `map-projection.js`, `landmarks.js`, `address-search.js`, `data/addresses.json`, `data/road-profiles.json`, `districts.js`: consistent projection, source profiles/retail polygon, directed routes and offline lookup |

Coordinates are metres: x east, z south. Yaw forward is
`(-sin(yaw),-cos(yaw))`. Root supplies dt and context. `dt=0` freezes dynamics;
modules never add their own animation loops. Keep detached read-only QA snapshots
and no production gameplay setters. A new adapter must dispose pooled resources
idempotently and must not mutate geographic source data.

Gameplay context for progression is `{pose,onFoot,vehicle,wanted,vehicleHealth,
respawnSerial,health,weapon,reserveAmmo,recovering,sandbox}`. Services require
actual on-foot proximity, legal activity state, costs and equipment. Root applies
only successful heal/ammo results. Gym and robbery advance on supplied active dt;
leaving, recovery or invalid equipment interrupts them without completion.
Robbery cooldowns persist through reload; no click awards cash. Jobs require real arrival, ordered checkpoints, the required
stolen vehicle or a real wanted/clear interval, as appropriate. Clicks cannot
award cash. Failure, cancellation and respawn cannot mark a job complete.
Completed IDs survive penalties. Garage operations validate location, ownership
and costs; root applies successful repair results and local vehicle retrieval.

## Mode, storage and travel rules

Street Life guards both visible UI and action handlers against map teleport and
Start nearby. It uses walking/driving to reach jobs and garages. Free roam keeps
map travel and offline street/address/landmark search but cannot earn career cash
or completion. Mode switches reset world/transient state. Never route sandbox
mission or police callbacks into the career economy.

Keep the existing discovered-place save independent from the separate career
key chosen by the controller. Before modifying save code, trace validation,
migration, read errors, write errors and the overwrite-disable flag. Unknown
versions, corrupt shapes and denied storage must visibly report a problem and
leave the original source unwritten. No origin-wide clear/reset. `serialize()`
returns career data, not active jobs or player teleport positions. Test reload,
unknown versions, malformed owned IDs, duplicate/completion dependencies and
storage denied behavior. Use isolated browser contexts/fixtures for corrupt-save
negative cases; never erase a user's live progress to make a test pass.

## Source and landmark changes

Read `docs/capital-drive-street-references.md` and `docs/capital-drive-landmark-references.md`
before deciding what has actually been observed. Four March 2026 Street View
samples in the earlier notes establish only those observed exteriors, not whole
city coverage. For a fresh public Street View observation, record the inspected
URL, location, visible imagery date, camera direction and concrete architectural
features. If a panorama fails, report that limitation and use separately cited
public architectural/heritage sources; do not claim it was inspected.

Use reference imagery to inform original geometry, never bundle screenshots,
Google textures, proprietary meshes or copied game assets. Record rights/source
URLs and dates for reusable geographic data. Preserve OSM ODbL, ACT CC-BY 4.0 and
Microsoft CDLA notices and source qualifications. Distinguish observed dimensions
from approximate game geometry. Job/garage markers are fictional locations beside
roads and cannot impersonate real businesses.

Project real anchors using origin 149.137 E, -35.318 S:
`x=(lon-149.137)*111320*cos(-35.318*pi/180)` and
`z=-(lat+35.318)*111320`. Add landmark metadata in `landmarks.js`, bounded geometry
in `landmarks-view.js`, and reference notes. Suppress only individually inspected
source footprint IDs through `replacedBuildingIds(map)`; proximity is not evidence
that every nearby building should disappear. Parliament House prioritizes its
northeast land axis, grass roof/rising wings, curved pale facade, forecourt and
81 m mast. Check terrain grounding and visibility from street approaches, not only
an overhead screenshot. Keep skyline silhouettes visible at their intended LOD.

## Rebuild source-derived files deliberately

Builders are separate manual operations, never part of the check runner. Inspect
their current code and arguments first. Keep an external raw cache and record its
hashes/source dates. The map builder writes tracked `data/canberra.json`; run it
only within an explicitly assigned data change and review the diff. Do not fetch
new data merely to repair UI or gameplay.

```sh
python3 -B scripts/build_capital_drive_map.py --help
python3 -B scripts/build_capital_drive_addresses.py --help
# Choose an existing external source cache; do not put raw objects in Git.
python3 -B scripts/build_capital_drive_map.py --cache "$CAPITAL_SOURCE_CACHE"
python3 -B scripts/build_capital_drive_addresses.py --cache "$CAPITAL_SOURCE_CACHE" --date 2026-11-13
```

Set `CAPITAL_SOURCE_CACHE` to a directory outside the repository. A first import
may use map-builder `--fetch`; optional `--fetch-details` imports Microsoft
outlines and ACT contour data and requires its external scientific/geodata
packages. Both switches run the build afterwards. Review source availability,
licenses, disk cost and output before using them. Reusing the same raw cache is
more reproducible than refetching a changing public endpoint. The address builder
uses explicit tagged OSM nodes/ways, records source hashes and omits unsupported
relations; approximate centroids are not entrances. Do not invent address numbers
or promise complete coverage. Test offline query normalization, missing addresses,
street/landmark results and travel restrictions using the address suite.

Existing terrain is a 513x513 interpolation of ACT 2020 two-metre AHD contours,
roughly 12 m cells, not the unavailable native one-metre DEM. Retain held-out median,
p95 and maximum residuals and provenance. Never silently fill unknown terrain or
replace finite elevations with zeros. Changes to `geodata-validation.json` need
fresh source evidence; never edit expectations just to admit an accidental rebuild.

## Performance and pure verification

Target remains N100/8GB with a capped 60 Hz simulation and 30/60 render options.
Source-level budgets are guards, not hardware FPS acceptance. Keep traffic default 40,
hard limit 56; police at most 4; pooled shots and pedestrians bounded. Current
landmark suite requires five sites, ten merged meshes and fewer than 16000
triangles with near detail 850 m and skyline 4200 m. Extend a budget only with a
measured reason and explicit review. Actor view pools geometry/materials/effects;
read its stats and suite before adding meshes. Avoid per-frame allocations across
the whole city, dynamic textures, new lights per vehicle and high-detail distant
landmarks. Preserve merged chunks, culling, finite buffers and disposal checks.

Run:

```sh
python3 -B scripts/check_capital_drive.py --dry-run
python3 -B scripts/check_capital_drive.py
```

The runner enumerates80 game JavaScript files and95 pure Node suites in its `MODULES`
and `SUITES` constants, including roads, buses, police, occupants and services.
It checks every syntax entry, executes every suite (drive receives the actual map
argument), then runs `git diff --check` plus two Python cache checks:273 commands in the tutorial/UI pass. Keep these
explicit lists current when adding a required module; a missing file fails.
Missing modules/data/suites fail; nothing silently skips. Each pure command has a
120 second limit; total run is bounded to 900 seconds. Actual exit codes are printed.
The first failure stops the run. Fix or report it; do not weaken a suite.

## Bounded browser evidence and handoff

For browser work, choose a fresh external directory. The runner enforces that it
is outside the repository and requires both flags:

```sh
python3 -B scripts/check_capital_drive.py --browser --output "$CAPITAL_QA_OUTPUT"
```

Set `CAPITAL_QA_OUTPUT` explicitly. The browser suite uses its own temporary
localhost server, shuts it down in `finally`, and writes results/screenshots there.
The runner has a 600 second browser limit, kills the test process group on timeout
on the target Linux environment, and writes `runner-results.json` alongside the
browser's `results.json`. A failed run is still failed if screenshots exist.
The default browser suite is `scripts/test_capital_district_browser.py`;
`--expansion-browser` selects the prior expansion suite, while
`--classic-browser` selects the earlier retained suite. Optional `--walk-kiosk`
is available on the expansion script directly. It must use actual keys and a
clear route around the parked car, with path samples retained on failure. The
earlier greedy-walk failure and later successful waypoint walk remain distinct
results. Suite coverage is whatever its current assertions establish; old counts
never become acceptance for new features.

Use normal keys/mouse for positive proof: walk/sprint, stop/exit/enter a nearby
vehicle, aim/fire/melee and reload, wanted sight/search/escape, nearby delivery,
ordered race, stolen target handoff, garage costs/retrieval, reload persistence,
free-roam address search/map travel, Street Life travel denial, pause and blur.
Inspect actual desktop/mobile frames in both themes, landmark approaches,
keyboard focus and 44 px touch controls. Snapshot reads aid diagnosis but are not
permission to grant money, move actors or complete jobs synthetically. Report
unexercised flows and real N100/native-device holds.

For an optional interactive preview, use one foreground terminal server with an
external time bound, for example `timeout 120s python3 -m http.server 8765 --bind
127.0.0.1`, and open `/Games/Capital%20Drive/`. Stop it when the preview ends; no
persistent dev server. This command assumes an available port and Linux timeout.

Commit explicit owned paths after syntax/pure gates and any required browser
review. Record commit IDs, exact command outcomes, source hashes, artifact paths,
remaining limitations and every dirty path. No automatic full-fleet test or push:
the full registered-catalog release gate runs only for an explicit push/release
order; the historical 123/133 result remains held until superseded by fresh full
fleet evidence. Targeted passes do not erase that hold.

After the inspected source commit, the documentation owner updates
`docs/maintenance/games/245-capital-drive.md`, then deliberately refreshes Git-backed
inventory with `python3 -B scripts/check_maintenance_docs.py --refresh` and verifies
`python3 -B scripts/check_maintenance_docs.py`. Refresh is not a substitute for
reviewed prose and must not be mixed into the runner. Publication remains a
separate operator decision.


## Road-profile reproducibility and new visual limits

`python3 -B scripts/build_capital_road_profiles.py --cache <external-cache> --output <temporary-json>`
rebuilds only the compact OSM service/access sidecar. Compare its bytes/hash before
replacing the tracked file. The source map, addresses and terrain validation must
stay unchanged for presentation/gameplay work. Runtime applies source tags to a
new shallow map; road coordinates and the source database are retained.

Register buses and patrol `car` descriptors with `simulation.setExternalVehicles`
before movement, then update them as stable objects. All vehicle-sized movement
uses `moveVehicle`; foot actors use `moveActor`. Never use a pedestrian circle for
a ten-metre bus. Carjacking requests gradual braking before claiming, and displaced
adult render callbacks do not manufacture witness state. Driver art must respect
the inherited left-seat car cockpit; buses use original right-seat geometry.

Buses run fictional circuits on real public roads. Mapped store coordinates use verified OSM retail nodes with original parody
labels. Door/frontage placement is estimated; gym/arms activities stay fictional. Pool water follows exact
OSM corners, while coping/entrance art stays approximate. More natural original
surface grain is not photogrammetry. At least one useful approach frame is needed
for landmarks: teleporting to Parliament's centre can show a wall and does not
establish visible-landmark quality. Use normal Free roam map input to an observed
forecourt approach and mouse orbit, retaining the actual capture.


## Mapped stores, pool contacts and forgiving response

Rebuild with explicit external paths and compare both generated files:

```sh
python3 -B scripts/build_capital_stores.py --cache <external-cache> --north-cache <external-north-cache> --output <temporary-json> --module-output <temporary-js> --precinct-output <temporary-precinct-json> --precinct-module-output <temporary-precinct-js>
node scripts/test_capital_stores.mjs --cache <external-cache> --north-cache <external-north-cache>
```

The selection is bounded to source-verified retail POIs with a clear public
frontage. Exclude ambiguous back doors rather than inventing an entrance.
Game-facing text uses parody names; actual names are provenance/search inputs.
Keep retired shop cooldown IDs valid and new tills independent. Root injects
building sight checks into Progression, including during timed activities.
No remote or sandbox action can pay career cash.

Pool barriers/gates and basin are exported from landmarks.js and added only to
the runtime map. Skip the exact obsolete basin ACT collider, preserve nearby
buildings and source files. Test the actual-map gate walk, fence contacts and
water blocker in test_capital_sites.mjs before claiming physical enclosure.

Traffic-view batches preserve the six factory silhouettes, colors and glass;
only its owned clones/materials/instance buffers may be disposed. Keep the
player car full detail and seated occupants visible. Static collider and parked
queries must remain spatially bounded; performance claims distinguish traffic
draws from total frame time and software rendering from N100 hardware.

Wrecks are disabled vehicles, not character knockouts. Root blocks their driving
input and permits E exit. Impact velocity governs damage; health-only knockout
starts medical transfer. Reckless pedestrian reports require actual close
vehicle danger and a cooldown; normal50km/h driving or foot movement must stay
clear. Pass a stable speed0 foot focus and the actual witness sight callback.

## Campaign, rooms and northern map

Use `docs/capital-drive-district-sources.md` for exact builder arguments and source
limits. The OSM north builder needs external Shapely for its pinned overlap audit;
the optional ACT terrain importer uses external geodata packages. Preserve the
base snapshot and source node IDs. A new overlay must pass source hash/rebuild,
directed route, island-hole area, physical bridge/water and seam tests. Water is
flat at its documented design level; the bridge sampler must not raise terrain.

The controller strips and validates the optional campaign payload before legacy
Progression validation, then writes chapter completion and rewards atomically in
the same career key. Completed chapters must form a prefix; recovery fails only
the transient mission. Test retries, sandbox denial and duplicate reward events.
Do not grant saves/state as positive browser completion evidence.

`neighbourhood.entries` is the shared list of rendered house doors. Public Centre
entries are tied to exact source facade edges. Only one room plan/view may be
active; entering requires normal on-foot proximity and leaving returns to the same
saved outside pose. Indoor movement/camera use interior walls; exterior police
retain their own movement. Service positions resolve to the active counter and
leaving interrupts a robbery. Test source shops and lazy lifecycle/disposal.

For graphics changes, count buffer bytes separately from draw calls and frame
time. Normalized byte colours/normals preserve positions and UVs with explicit
component error bounds. GPU/native performance remains a separate measurement.
Retain failed normal-input runs and name harness causes; never walk through a car
or shelf in a test to manufacture a pass.

The priority noodle restaurant has a dedicated facade adapter; exclude its ID
from generic storefront geometry. Keep real-name aliases while displaying the
parody. Its service position must resolve to the lazy room's counter, not the
exterior approach. The stores builder/regression now requires both retained south
and north caches. Preserve the old20 descriptors when extending this registry.
Use `--browser --priority-shop-browser --output <fresh-external-directory>` for
source search, normal E entry, restaurant detail/counter/exit, sandbox denial,
culling, errors and a fresh corrected Civic-sign frame. This focused flow does
not replace the full district or hardware checks.


## Living Civic and paid work

Read `docs/capital-drive-living-sources.md` before changing the restaurant, five
Civic extras or skate park. Rebuild Civic extras twice using the pinned north
OSM and ACT caches, external outputs and `build_capital_civic_extras.py`; compare
JSON and module bytes. Exact ACT park boundaries govern both facade/roof cuts and
physics; ramp height and rail descriptors are shared with rendering. Test a car
near an inner boundary as well as walking clearance: resolving towards the old
outer facade can throw a stationary car across the building.

Every lazy room has frozen furniture-linked activity stations. Keep mini-game
clocks and input in `interior-activities.js`, bounded active NPCs in
`interior-people.js`, and cash in Progression. Start a paid noodle/stock shift only
after the real activity session starts. Completion must verify its exact live
room, station, session, player reach and terminal result. Cancel, respawn,
leaving and sandbox mode cannot pay. Ordinary paid stock/noodle work permits
wanted stars; police continue pursuing. Bank the event once through the existing
career writer. Rental fees similarly use a synchronous validated one-time payment
callback, never an independent wallet. Pickup requires the real nearby asset;
movement uses the normal collision path and stopping ends the ride in place.

Run `test_capital_work_jobs.mjs` and `test_capital_skate_opening.mjs` for these
boundaries; the main runner includes both. For a full new interior/rental player
flow use `check_capital_drive.py --browser --living-browser --output` with a fresh
external directory. The suite uses read-only diagnostics for observation, normal
Free-roam map controls for travel and actual keyboard/mouse input for play.
Paid career guard regressions do not substitute for native career-play evidence.
Keep optional actor.y distinct from measured terrain; an absent optional field
can serialize as null and is not alone proof of a height failure. Inspect actual
rendering and a finite ground sampler before changing terrain.


## Vehicle unlock sequences and distributed rentals

`vehicle-challenges.js` owns preparation/cue clocks, fresh single-key edges,
progress, deadlines and exactly-once outcomes. The scooter has four lenient cues;
the car has eight shorter cues. Controller/gameplay admission must validate the
actual target, mode, distance, stopped car and unobstructed view before and after
completion. A displayed sequence or a caller-shaped permit alone does not prove
completion. Root verifies the live session/event/target before the rental owner
consumes the one-use permit; it never routes this path through the hire wallet.
Keep previously driven cars unlocked while retaining challenges for unknown cars.

All indoor mini-games expose sequence/index/current key and cue timing from their
state owner. Render those fields directly, including bench grip instructions; do
not duplicate scoring or hard-code independent countdowns in DOM handlers. E
cancels and P/Esc pauses. Waiting, wrong/held/chord input and stale events cannot
claim a vehicle. Clear old events before a retry so a cancelled session cannot
consume the replacement target.

Distribution uses stable source-road estimates and safety grids, not invented
actual operator coordinates. Preserve source IDs and old anchors, avoid lanes,
water, private/sensitive areas and known doors, and select nearest visible assets
before capping the instance buffers. Keep the active ride in that budget.

For browser QA use `--browser --theft-browser --output` with fresh external
evidence. Observe snapshot and current DOM cue together; software screenshots
consume real response time. Capture, cancel through normal input, then retry a
fresh session rather than extending the game clock or deleting a failed run.
The pause-entry check is `--dev-browser`; configured values stay out of public
copy. A grant through that UI proves the form/save path, not legitimate job pay.


## Weapon economy, adult routines and road clearance

Trace `weapons.js` into Gameplay, Progression and street UI before editing. Keep
current ammo aliases compatible, preserve independent pools on switching, and
clip each pellet before target adapters. Canonical firearm hit kinds must reach
pedestrian adapters; new gun IDs are trace/model identities. Duplicate ownership,
wrong-stock ammo, full packs, remote/panicked contacts, sandbox, recovery and
recovery state cannot spend cash. Wanted stars alone allow ordinary purchasing.
Validate old pistol-only v1 saves and strict new
optional weapon booleans. Root owns the sole save writer.

K lists current eligibility and costs; actual disabled states use explanatory
copy and a not-allowed cursor. Never relocate a service or remove a guard just
because a purchase was denied: test actual approach geometry, mode, ownership,
funds, ammo and actual contact panic first. For native acceptance spend actual starting
money through normal controls; do not grant a save or use sandbox money as proof.
A foot route may need the real school gate and a normal detour around cars.

Keep ambient chairs/cups/work sites source-safe and clear of known doors. Lower
density does not remove swept contacts, aggressor attribution, ordinary-driving
protections or pause behavior. Injury/gunfire interrupts routines; sight/cooldown
and personality govern retaliation. View code owns no independent clocks.

For traffic jams reproduce the actual generator and seed. Lane offsets, physical
width and predictive brake clearance all matter: narrow-road decorative parking
can block an entire directed route. Source parking aisles provide off-through-road
slots. Test whole-car clearance, deterministic physical occupancy, mission target
retention, buses, pause and local spatial queries. Do not release queues by
ignoring collisions or teleporting cars. Separate legitimate player blockage from
mutual junction/turning deadlocks and source-building overlap findings.

## Yoober and measured Low geometry

Read docs/capital-drive-yoober-contract.md. Register the one ride-car descriptor
alongside buses/patrol cars before movement. Quotes/search run only on phone
actions, not in the frame loop. Booking charges nothing. The authoritative boarding
session checks live reach, mode, funds and a clear stopped vehicle before its
single debit. Terminal states must release activeFare. Passenger attachment and
snapshot anchors must agree, E must not intercept distant unrelated interactions,
and mouse orbit must use the vehicle branch aboard. Clear transient rides on mode,
teleport, recovery and respawn; no career travel shortcut or reward is allowed.

Driver work uses existing job clocks, strict ownership and one save writer. Place
the waiting passenger on a clear source-road curb; the driving marker stays on the
road. Two-second stopped pickup/drop-off cannot be replaced by elapsed waiting,
passing at speed, a different car, sandbox input or a synthetic completed save.
The focused native script supports --scenario passenger or driver with a fresh
external output; --capture batches the explicitly needed new-flow frames. The
common runner also exposes --browser --yoober-browser --output and kills the
browser process group on its existing limit. Keep failed runs separately.

Low constructors preserve source footprints, terrain/walls/roads/pavement/water,
accepted tree positions, structural garden boundaries and door descriptors. The
default synthetic geometry suite is cheap; --actual performs a paired merged-map
comparison outside the browser. Log buffer bytes, triangles and visible draws
separately from total RAM/frame time. Never infer N100 hardware performance from
cloud software rendering. Normal constructor defaults remain backward compatible.

## Signals, body contacts and live NPC handovers

Read docs/capital-drive-signals-transport-crime-contract.md. Rebuild signals with
scripts/build_capital_signals.py --south-cache <external-south> --north-cache
<external-north> --output <external-output>; compare the exact sidecar bytes.
Source nodes are real; controller phases, stop bars and pole offsets are estimates.
Only Simulation advances/resets phases. The red/amber limit must cap actual motion,
including bus/ride braking branches, not just a target speed. Committed cars clear.

Keep model-sized swept contacts for walking and driving, angular checks, rotated
parked bounds and local queries. Existing historical rotation fixtures explicitly
retain their old dimensions. Static ambient-lane feasibility must exclude dynamic
queues; avoid source collider conflicts without deleting buildings/fences/water.
Preserve old failing fixtures and strict junction assertions. Legitimate queues
behind the player or red signals must be distinguished from permanent overlap.

The guidance helper compiles turns once per changed route, reports along-route
metres and filters dense bends. Live Yoober map follow advances one world clock
with player input cleared/braked; hidden tabs and ordinary menus remain paused.
Pan/zoom/recenter exits follow. Test the actual car position and map centre together.
Bus E uses the front-left door, a bounded stop request and stopped clear sweeps;
active mini-game/rental cancellation takes priority over nearby boarding.

Equipment and handover cash belong to Progression. Never let NPC rendering grant
money or callers supply live target facts. Bind room/store/target/respawn serial,
check threat and health throughout, and pay exactly once with strict saved cooldowns.
Fists require an attributed recent actual punch. A behind-counter demand may use
bounded staff/counter reach while ordinary purchases retain their strict radius.
Clear lazy room people/state on leave. Maintain gear caps and no-consume failures.

For normal-input evidence, use --browser --signals-browser --output or
--browser --crime-browser --output. The focused scripts also select individual
scenarios. Travel a career normally; Free-roam map travel may preview signals,
buses/flares but cannot prove purchased equipment or earned crime money. Retain
failed geometry/timing approaches and correct the real path instead of weakening
collision. Check actual hands-up/emptying poses and source-bound target snapshots.

## Three protagonists and city-life scenes

Read the city-life contract and source record. Campaign v2 stores three ordered
intro prefixes, a meeting flag, the selected character and the retained shared
prefix. Keep v1 completed chapters and reward history during migration. Root owns
serial baselines for real PowerPunt, completed work and booth outcomes; a stale
event or sandbox action cannot complete a new objective. Mid-session selection
restores independent validated pose/health/car/ammo and changes mission ownership. Allow it
between any missions, retaining multiple partial intro prefixes through reload;
only active missions lock selection. Initial
character-start placement checks the actual expanded map and parked bodies.

`campaign-scenes.js` supplies two other adults during the meeting and the six
shared heists, with shared car/foot contacts. Ground allies follow and exchange
authoritative shots with visible foot police outdoors; they do not board cars or
join indoor rooms. The owner-requested catch-up recruits near the actual player
and permits checked teleport when distant/stuck, with bounded throttled local
placement, health/identity/cooldown preservation and no resurrection. Keep the
fixed Kingston meeting and ordinary nearby sweeps. Target-only changes do not
relocate allies; pause/interior/recovery retain their guards. Test actual roads,
cars, adults, doors, blocked retries, transit and dead crew before shipping.
Its view cannot grant mission credit. The selected
hero must remain consistent in foot, cockpit, transit and workout adapters.
`interior-people.js` owns live dialogue, peaceful/confrontational outcomes and
attributed retaliation. Rowan's active lunch encounter uses scriptedFight:true: a
validated noodle throw must precede an actual melee emission for noodle-fight
credit. Ordinary peaceful/confrontation outcomes do not advance that objective.
Released visual flight follows captured positions despite target departure;
nonlethal/timeout retries require a new throw. Resume pending conversations after
Esc without replaying the outcome serial. Free roam protects player health; prove an emitted punch
with its actual serial/timer rather than expecting sandbox injury.

For native evidence, use the life selector or individual cases in fresh external
directories. Cases run separately to keep each software-WebGL run bounded:

```sh
timeout 600s python3 -B scripts/test_capital_life_browser.py --scenario campaign --capture --output <fresh-campaign-directory>
timeout 600s python3 -B scripts/test_capital_life_browser.py --scenario rowan-lunch --capture --output <fresh-rowan-lunch-directory>
timeout 600s python3 -B scripts/test_capital_life_browser.py --scenario restaurant --capture --output <fresh-restaurant-directory>
timeout 600s python3 -B scripts/test_capital_life_browser.py --scenario gym --capture --output <fresh-gym-directory>
timeout 600s python3 -B scripts/test_capital_life_browser.py --scenario scenery --capture --output <fresh-scenery-directory>
```

All-machine Free-roam completion proves cues, participant poses and disposal,
not paid career progression. The optional `test_capital_paid_gym_browser.py`
diagnostic is outside the default runner and currently HELD: source-clear public
travel did not reach admission before its watchdog. Retain that result; do not
grant money, teleport or weaken collisions to turn it green. The known Highgate
2.2m source passage overlaps an ACT body; use the documented public detour until
a shared visual/height/collision correction is separately implemented.

Street-asset and barrier builders require explicit external pinned caches.
Compare two generated JSON/module outputs to each other and tracked files.
Source stop positions do not establish current timetables or exact shelter art;
actual bus dwell uses two compatible source stops and fictional routes. Canopy
replacement requires the documented polygon coverage; current six candidates
all fail, so no whole ACT body is changed. Elevated rails are not ground walls.
Reserve-bound wildlife and suburb materials are interpretations with bounded
instances. Whole-centre tenant adjacency and fresh Street View remain unverified;
do not promote architectural text into an observed floorplan or screenshot.


## Story locations and resident geometry

Read docs/capital-drive-story-and-streaming-contract.md and the dated follow-up
receipt before changing these boundaries. Keep the source school gate/door,
late-bound safehouse ID and actual activity station consistent with mission guides.
Select the nearest clear source home with cheap sorting before collision queries;
never sweep every house each frame. A guide is a read-only DTO, never a new clock,
reward owner or alternate coordinate system. Preserve fresh serial baselines across
stages, including when optional input fields are absent.

Cutscenes are bounded captions driven by the controller clock and existing world
camera. Hidden/blurred scenes freeze; Skip starts one real mission and Cancel pays
nothing. Attack denial must precede ammo/cooldown/offence writes for job chapters
and mini-games. Police return-to-car decisions include moving-target interception,
actual car/door reach and legal directed routes. Allies only damage actual foot
police through the gameplay owner; view effects cannot apply damage.

```sh
timeout 120s node scripts/test_capital_world_streaming.mjs --actual
timeout 120s node scripts/test_capital_neighbourhood_streaming.mjs --actual
timeout 120s node scripts/test_capital_mission_locations.mjs
timeout 120s node scripts/test_capital_cutscenes.mjs
timeout 120s node scripts/test_capital_campaign_scenes.mjs
timeout 180s python3 -B scripts/test_capital_life_browser.py --scenario school-story --capture --output <fresh-external-school-directory>
timeout 120s python3 -B scripts/test_capital_life_browser.py --scenario cutscene-ui --capture --output <fresh-external-ui-directory>
timeout 120s python3 -B scripts/test_capital_life_browser.py --scenario noodle-component --capture --output <fresh-external-component-directory>
```

Actual-map streaming comparisons retain full source collision and metadata, verify
resident attribute hashes after revisits and bound loads/evictions. They measure
attribute arrays, not total process/GPU memory. The noodle component is explicitly
programmatic supplied-dt evidence; never present it as native career reward proof.
School-story stops after the alarm and normal exit, before evasion/reward. Keep
failed native travel receipts and source blockers instead of deleting buildings.


## Cached downloads, character resumes and actual CPU profiles

Read docs/capital-drive-cache-and-performance-contract.md. Regenerate the manifest
only after final runtime source changes, then run its check. The content-derived
version covers the exact local closure plus worker logic. Own caches are scoped
and verified; unchanged hash entries can be reused. Default worker waiting
protects existing game tabs. No forced reload, root scope or broad cache deletion.

```sh
python3 -B scripts/build_capital_cache.py --write
python3 -B scripts/build_capital_cache.py --check
python3 -B scripts/test_capital_cache_manifest.py
node scripts/test_capital_cache.mjs
node scripts/test_capital_protagonist_state.mjs
node scripts/test_capital_character_switching.mjs
node scripts/test_capital_collision_performance.mjs
node scripts/test_capital_render_gate.mjs
python3 -B scripts/test_capital_cache_browser.py --scenario native --output <fresh-external-directory>
python3 -B scripts/test_capital_cache_browser.py --scenario heroes --output <fresh-external-heroes-directory>
python3 -B scripts/profile_capital_drive.py --root <exact-source-export> --mode 3d --quality low --seconds 8 --output <fresh-external-profile-directory>
```

Validate the whole actual cache manifest, not an invented fixed JSON/module count.
There are six runtime map files and an additional credits-linked validation JSON.
On a controlled warm boot, game-data.js reads all six Responses directly from the
active worker's exact allowlisted hash keys; its bounded750ms fallback uses local
fetches. Test descriptor scope/revision, denied/missing/old-worker fallback and
no mixing of revisions. Warm network proof disables ordinary HTTP caching, checks
that no page map-fetch requests occur and counts origin response bodies;
a persistent-browser fixture separately proves cache survives restart. Offline
career evidence must use the actual native writer, with both optional campaign
and protagonists envelope fields separated from Progression's serialized state.

Hero checkpoints use the same writer and strict optional outer field, preserving
legacy saves. Restore exact ammo without first-equip loading and validate physical
placement before state mutation; rollback failed switches. Room captures use their
real captured outside pose. Busy missions/work/rides/wanted/recovery lock switching.

Profile baseline and candidate with the same viewport, settings and input duration.
Block service workers during CPU comparisons so first cache population cannot
contaminate the measured play window. Record raw cpuprofiles and source hashes;
(program) is unattributed/native work, not a JavaScript function. RAF frequency
is not actual render frequency. Software GPU CPU can exceed100%of one core across
threads. Short cloud windows and time-based routes are not N100 benchmarks.

## Indoor pursuit, wanted work and private mission previews

Read `docs/capital-drive-indoor-pursuit-contract.md` and its dated receipt. Keep
logical interior IDs on bodies/traces: same-coordinate outdoor and indoor actors
must not exchange damage. Cars approach legal-road doors; officers dismount and
walk the actual source gate/approach, entering only through a clear nearby landing.
Do not spawn pursuers inside. Only the bound Milo safehouse is excluded. Retain
at most active plus four occupied room contexts, lazy2000node navigation and four
owner fields per room. Swept furniture/wall clearance is shared with the player.
The indoor actor pool omits car clones/lights and disposes on leave. Outdoor allies
can cover outdoor police while the player is inside.

Milo's fresh start uses his existing saloon; saved checkpoints keep their state.
Drive legs must still require stopping; foot packing/shift/handover stays real.
Ordinary jobs/work/owned legal driver fares permit zero through five stars, while
explicit escape targets require clear wanted. Preserve reach/session/ownership/
recovery/mode and once-only pay guards, plus protected-work attack denial.

Private mission previews use the existing masked Pause entry, all thirteen actual
chapters and active.character for appearance/HUD/scripted encounters. No configured
input belongs in source, help, reports or captures. Preview rewards/prefixes stay
separate from career completion. Restore the captured original body/car/health/ammo
through checked placement on cancel/finish/failure; retain a blocked return for
explicit retry without repeated frame-loop searches or overwrite by another mode.
The public offline matcher is a convenience, not authentication.

```sh
node scripts/test_capital_police_rooms.mjs
node scripts/test_capital_interior_navigation.mjs
node scripts/test_capital_character_switching.mjs
node scripts/test_capital_game_data.mjs
node scripts/test_capital_dev_missions.mjs
node scripts/test_capital_mission_hud.mjs
timeout 240s python3 -B scripts/test_capital_indoor_police_browser.py --scenario police --capture --output <fresh-external-directory>
timeout 120s python3 -B scripts/test_capital_indoor_police_browser.py --scenario milo --capture --output <fresh-external-directory>
timeout 120s python3 -B scripts/test_capital_indoor_police_browser.py --scenario developer --code-file <external-private-code-file> --capture --output <fresh-external-directory>
```

The native developer case proves the configured UI exception and Cancel, not
ordinary unlocks or completed missions. Safehouse exclusion, blocked return and
wanted wages have source fixtures; do not describe them as native career runs.
Keep failing native evidence and correct its cause before a new attempt.

## Vehicle impacts and player ragdoll

Read `docs/capital-drive-vehicle-impact-contract.md`. Record actual approaching
moveVehicle contacts before braking, never canOccupy probes. Keep the32event
bound and player-body/same-space identity. Gameplay owns supplied-time swept
translation, severity/cooldown/damage, airborne height and delayed lethal recovery.
The actor adapter owns only eleven fixed joint springs and sampled ground lift;
reuse meshes and retain zero-dt freeze/reset/disposal. Do not move the gameplay
root from the view or turn every crowd member into a physics object.

```sh
node scripts/test_capital_vehicle_contacts.mjs
node scripts/test_capital_vehicle_impacts.mjs
node scripts/test_capital_ragdoll.mjs
timeout 180s python3 -B scripts/test_capital_vehicle_impact_browser.py --output <fresh-external-component-directory>
```

That fixture deliberately arranges a real-module contact and supplies steps.
Label its rendering/pose evidence programmatic; it is not native career travel
or N100 performance acceptance. Lethal fall must finish before hospital, while
ordinary low-speed bumps, sandbox protection and all shared colliders remain.

## Guided controls and cached activity presentation

Read `docs/capital-drive-tutorial-and-ui-contract.md`. The tutorial owns only
supplied observation state; root owns real UI serials and its separate strict
preference. Do not credit automatic navigation, stale actions, paused movement,
entry/teleport jumps or passengers as a player's lesson. Menu actions pause the
world: call observeMenu only after the named actual successful action, without
an invented dt. Keep Skip, replay, fresh resume baselines, denied storage and
no career/body writes covered. Existing non-tutorial native scripts uncheck
Guided controls through the actual checkbox before Start; no save/state grants.

The activity adapter caches fixed nodes and mutates only changed values. Keep
event draining and matching live work/fitness sessions in the original controller;
an inactive panel is not permission to skip authority. Verify active cue timing,
tile reuse, terminal/leave clearing and zero unchanged DOM writes/queries/creation.
Use an exact source export for paired CPU/UI evidence, record hashes at both
ends, and distinguish DOM/style work from software graphics and real hardware.

```sh
node scripts/test_capital_tutorial.mjs
node scripts/test_capital_tutorial_controller.mjs
node scripts/test_capital_activity_ui.mjs
timeout 660s python3 -B scripts/test_capital_tutorial_browser.py --capture --output <fresh-external-native-directory>
timeout 660s python3 -B scripts/test_capital_tutorial_browser.py --root <exact-export> --scenario layout --capture --output <fresh-external-layout-directory>
```

Review real desktop/mobile dark/light captures for header targets, readable
controls, coach/HUD spacing and Help keyboard/Escape behavior. Paired profiles
use the same viewport, quality and normal-input duration, with tutorial unchecked
and service workers blocked to exclude cache installation. Keep failed native
approaches and concurrent-source caveats instead of describing them as final.
