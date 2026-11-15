# Capital Drive: Canberra

<!-- maintenance-game: Games/Capital Drive -->

## Identity and status

Operator-authorized original Canberra open-world preview, catalog 245, static entry
`Games/Capital Drive/index.html`. Three modes share one runtime. **Campaign** has
three fictional adult protagonists, two opening missions each, a shared Kingston
meeting and six assigned shared heist chapters. **Street Life** has jobs, cash, a
garage, foot combat and police; **Free roam** has all cars, local address search
and map teleporting. The mapped area covers the inner south and a source-derived
lake/Civic corridor. Airport and whole-city coverage remain later work. No GTA code,
artwork or branded vehicle assets are used.

## Implementation map

The [crew/city continuation contract](../../capital-drive-crew-and-city-contract.md)
records analog mobile joysticks, keyboard aiming, live crew seats/window fire and
safe shared-stage character transfers, three appended mission chains, timed hero
powers, grenade/smoke stock and effects, actual garage physics upgrades, street
NPC ragdolls, player-car crumpling/fire, physical rear gardens, day/night/weather
and the sourced airport road extension. Airport terrain/massing are explicitly
estimated; traffic cars do not deform and terminal interiors/flights are absent.

- `script.js`: sole loop, input/camera/modes, local loading, maps/routes, parked
  and abandoned meshes, storage and module integration.
- `simulation.js`: indexed car/actor collision, directed OSM graph, 40 nearby
  reactive traffic cars (cap 56), bounded overtaking/road rage, vehicle claims,
  parked/abandoned descriptors, polygon line of sight and safe teleport. A bounded
  live adult-body index checks moving cars as well as people walking into cars.
- `ride-service.js`/`ride-service-view.js`: one physical NPC-driven Yoober car,
  quoted phone bookings, single boarding debit, clear stopped exits and pooled
  driver-fare waiting/seated passengers. Progression owns repeatable paid fares.
- `gameplay.js`: foot/sprint/jump, car entry/theft, four firearms/aim/reload,
  health, witnessed offences, eight-cue car locks and delayed recovery. `police.js`
  owns up to four road patrols, dismounted officers, sight/search/escape and arrest.
- `police-rooms.js` retains the active room plus rooms occupied by pursuers;
  `interior-navigation.js` binds bounded lazy paths and collision to their actual
  room plans. Ordinary doors admit police; only Milo's bound safehouse is protected.
- `progression.js`: recurring ordered jobs, costs/rewards/unlocks, saved four-weapon ownership and owned garage,
  condition-preserving retrieval, food/gun/ammo purchases, playable fitness/paid work, timed robbery,
  cooldowns and strict legacy-compatible career-save validation.
- `street-ui.js`: jobs/garage/shops, five-star HUD and recovery feedback; no clock
  or storage owner. `services.js` combines twenty-six mapped parody stores, the
  retained fictional Kingston gym/arms sites and three source-backed parody gyms.
  `stores.js`/`data/stores.json` pin source nodes and estimated public frontages.
  `storefronts-view.js` presents twenty generic-capable facades plus a separately managed noodle restaurant in two batches.
- `tutorial.js` observes nine guided-control lessons. The controller owns its
  separate small preference and menu-action serials, with no career rewards.
  `activity-ui.js` caches the existing panel's nodes and avoids unchanged DOM
  writes while activity scoring/payment stays with its original owner.
- `actor-view.js`: original articulated adult, generic patrol cars, pooled brief
  effects/objective marker and dismounted officers. `vehicle-occupants-view.js`
  presents up to 64 seated drivers and 12 displaced adults; `services-view.js`
  presents two small generic activity signs. `traffic-view.js` instances the
  six traffic models in at most19draws rather than up to320separate draws. Supplied dt and bounded resources.
- `person-model.js`: shared rounded adult dimensions/geometry and deterministic
  appearances for street people, occupants, transit, the player and police. The
  selected Kit/Rowan/Milo palette follows foot, driving, passenger and workout poses.
  Vehicle claims preserve the person's identity independently of exit event IDs.
- Player vehicle impacts reuse swept contacts and gravity; `actor-view.js` adds
  a bounded eleven-joint ragdoll, with loose limbs, grounded fall and get-up.
- `world-view.js`, `neighbourhood.js`: bilinear terrain, road/footpath ribbons,
  streamed nearby architecture/vegetation/frontage geometry with real disposal,
  9,000 tree recipes, 4,200 door descriptors and clipped retail paving. Full
  source/collision/navigation metadata remains loaded.
- `landmarks.js`, `landmarks-view.js`: real anchors and dedicated Parliament
  House, Old Parliament House, Manuka Oval, Kingston Powerhouse and Manuka Pool; exact source
  replacement IDs, near/distant LOD and local procedural architecture.
- `road-network.js`/`data/road-profiles.json`: source-tagged service/access widths
  and lane/sidewalk semantics, cached legal directed routes and shared swept
  external vehicle collision. `highway-barriers.js`/view use 658 source-derived
  ground strips, including 49 by Hindmarsh; elevated evidence is excluded.
- `buses.js`/`bus-view.js`: two original unbranded buses, fictional ambient
  circuits on the actual public-road graph, physical stops at sourced stop
  refs2255/2376, seven-second active dwell and bounded rendering. No ACT timetable.
- `street-assets.js`/view: 388 deduplicated source bus-stop facilities, 13 fuel
  sites and 24 fitness venues. One instanced furniture draw; at most80stops and
  12petrol sites nearby. Only three fitness venues become additional gym services.
- `wildlife-view.js`: twelve original reserve-bounded kangaroos with near-only
  animation in one draw. `campus-view.js` adds estimated Telopea landscaping;
  `local-details-view.js` adds original local-history notices. Source facts and
  placement estimates differ.
- `campaign.js`, `character-start.js`, `campaign-scenes.js`/view: three distinct
  introductions, collision-checked initial starts, shared meeting, strict v2
  campaign progress, ground combat companions and authoritative activity serials.
  `cutscenes.js` owns transient supplied-time captions; `mission-locations.js` binds
  actual room doors/stations and the named safehouse without owning cash or clocks.
- `districts.js`: exact source Manuka retail polygon, shared appearance classifier.
- `pedestrians.js`:36 suburban /64 nearby Civic instanced fictional adults, safe sidewalk walking,
  panic/anger/knockdown/recovery swept player contacts/yielding and causally attributed witness events.
- `navigation.js`, `map-projection.js`, `address-search.js`: directed road routes,
  shared map transform and bounded offline landmark/street/address matching.
- `game-data.js`, `cache-client.js`, `service-worker.js`: local map loading,
  direct verified stored-map Responses and the scoped content-versioned cache.
  `dev-missions.js` matches the unadvertised mission-selector entry; Campaign and
  the controller retain preview ownership and restore the original character.
- `data/canberra.json`: unchanged 12,572 sourced outlines, 5,197 road runs and
  513 x 513 ACT contour terrain. `data/addresses.json`:3,446 explicit OSM address
  records; some positions are approximate way centroids. Five extra landmark
  anchors and seven parody store approaches are merged at runtime; the geographic source snapshot is not rewritten.

## Gameplay and controls

Fresh players can leave Guided controls checked for nine short playable lessons.
The guide observes real camera movement, walking, car entry/driving/stopping,
manual routing and menu actions. Skip or replay from Controls & help, F1 or Pause;
existing careers opt in. Lesson progress is saved separately from career money
and missions. Attacks are disabled during guided controls and return when it
ends or is skipped. Help is available before starting; it groups the full controls
by task rather than placing every key on the start panel.

Choose Campaign, Street Life or Free roam. Campaign initially places Kit Vale
(18, Telopea student), Rowan Pike (29, Civic analyst) or Milo Finch (26, basement
regular) at a checked character-specific approach; changing character mid-session
returns to that hero’s own saved location/state. A first visit uses their opening
approach. Street Life/Free roam retain the mapped Crescent start. WASD
or arrows drive/walk, Shift boosts/sprints, Space handbrakes/jumps. **E** stops then
exits a moving car, enters a nearby empty car, or starts taking an occupied car.
Unfamiliar parked and occupied cars require an eight-key timed unlock sequence.
Occupied drivers must stop first; remain close and visible throughout. Cars you
have already driven stay unlocked for immediate re-entry. **E** cancels an attempt.
**1–5** chooses fists/pistol/shotgun/SMG/carbine; buy owned weapons at supplies or fictional street contacts first;
right mouse aims, left mouse attacks/fires, F melees and R reloads on foot.
**Q** starts the nearby interior mini-game or paid shop task; **T** opens the
Yoober/Lemon phone. Book outside on foot, walk beside the stopped Yoober and E
boards; E exits at the destination or requests a stop during travel. Drive for
Yoober requires an owned legal four-door and two-second stopped pickups/drop-offs.
At equipment, **E** or **Q** starts the selected gym activity. Bench uses held
**X+Y** with timed **ArrowUp** for six reps; treadmill uses twelve alternating
X/Y taps; curls use six alternating sustained X/Y lifts; rowing uses six X+Y
drives followed by releases. Follow the displayed cues, then use Done to dismiss
the completed result. Early/late presses and incorrect holds count as mistakes.
Milo's first visit starts in his existing Lantern Saloon. His Coals/Kingston travel
stages require driving and stopping; home, stock and parcel handovers remain real
foot actions. Outside on foot, Phone > Route to my car guides to the actual car.
Drag mouse to orbit; vehicle vertical drag looks up/down and stationary views
remain in place. H horns when sound is enabled. M map, J jobs, G garage, K shops, P/Esc
pause. Touch driving and action buttons cover smaller/coarse-pointer devices; Pause also opens the garage and sound controls.

Street Life map selections set road routes. Teleport, Start nearby and road
recovery are unavailable, with handler guards as well as hidden controls. Free
roam enables zoom/pan, address results, teleport confirmation/Enter and R recovery.
Clear off-road destinations stay exact; obstructed destinations adjust to clear
land. A mode change cancels a transient job and resets mode-specific state; initial
campaign placement uses the checked selected-character start. Sandbox travel
never pays career cash or completes a job.

Street Life starts with Crescent parcel on NSW Crescent. Ordered checkpoint,
target-wagon theft and wanted-getaway jobs unlock after that delivery; later jobs
pay more. Franklin and Kennedy deliveries are available immediately for$400/$450.
Noodle preparation pays$60 and shop stocking pays$45 after the actual task completes.
No time-only, interrupted or Free-roam task pays. Each fresh job requires arrival/stage/time conditions and pays once.
Ordinary jobs, stock/noodle shifts and legal owned-car Yoober driver fares work
at zero through five wanted stars; police keep pursuing. Explicit lose-the-search
stages still need clear wanted status. Other activity/ownership/recovery guards remain.
Crescent garage is a fictional service marker beside the mapped road: buy,
retrieve, store, repair and paint owned cars there. Retrieval keeps damage/paint;
repair costs cash. Police need actual building-unobstructed sight, then search
last-seen ground; hiding cools the search. Arrest or defeat deducts up to $250,
transfers through a 3.4 second fade/recovery sequence, restores the player at a
bounded road approach and preserves completed jobs. The penalty is applied once.

Shops routes to 31 service points: 26 mapped parody shops such as Coals, four
gyms and the supplies site. The three additional gyms are Fitness Eventually,
Hybrid Patience and Occasional Fitness, at retained source fitness venues with
estimated public approaches. Enter a mapped shop and visit its counter: food
costs $35 for 35 health; supplies stock includes a $450 pistol and $60 ammunition.
A successful interactive workout costs $120 times the current upgrade step and
improves sprinting through three fitness levels. The matching live room,
equipment/session, reach, sight and career state must still agree at completion;
cancelled/interrupted or caller-shaped results cannot charge or award fitness.
Free-roam and level-three workouts are practice. Shop hold-ups require an actual
owned-gun or recent-punch threat, a matching live employee/room and uninterrupted
nearby handover; witnessed offences raise wanted level. A completed till handover
pays once and retains its 180 active-second empty cooldown through reload.
Leaving interrupts the action. Ordinary counter interactions retain matching-room
and clear-sight guards. Gyms have entered rooms and equipment; the generic
supplies activity remains exterior.
Retired fictional food-marker cooldown keys remain valid in older saves. Free
roam cannot purchase, bank fitness upgrades or earn robbery cash. See [store sources](../../capital-drive-store-sources.md).

Minor scrapes below8m/s cause no wear; body injury starts only with severe
impacts at18m/s. A wrecked car stops and allows E exit without hospital recovery.
Medical transfer occurs when character health reaches zero. Reckless reports
require close danger, sustained exposure or actual contact, with an eight-second
report cooldown; normal50km/h road travel near a footpath is covered by a clear
regression. Gunfire/assault retain their own immediate rules.

## State and persistence

Root supplies capped 60 Hz simulation and 30/60 Hz rendering targets. Dialogs,
blur/hidden tabs clear held input and pause clocks. `pagehide` saves valid career
state and releases loop/audio/graphics; adapters own no second RAF.

`capital-drive-v1` stores validated discovered place IDs. `capital-drive-career-v1`
retains its version1 wallet, owned vehicles, completed jobs, weapon/gear ownership,
fitness and robbery/mugging cooldowns, with strict optional legacy fields. Active
jobs, ammunition, workouts and encounters are transient. The controller saves an
optional campaign field atomically with career cash. Campaign v2 stores the
selected hero, each ordered two-mission introduction prefix, shared meeting and
retained six-chapter prefix. Existing campaign v1 completion migrates through the
legacy path without resetting completed chapters or replaying rewards. Fresh
campaigns select a protagonist and complete all six introductions before the
meeting. Fresh mission baselines reject old work/presentation/encounter serials.
Unknown/corrupt/oversized saves reject and denied writes stay unwritten. Sandbox
never writes career state.
Only this game's keys are read/written; no origin-wide clear.

`capitalDriveSnapshot()` exposes detached/frozen QA state, including focus,
gameplay, serialized career, places, address count, renderer/landmark/actor stats
and camera orbit/pitch. It contains no production setters. Career serialization
excludes active jobs by design; browser tests observe the stage HUD and normal
completion rather than granting state.

## Dependencies and provenance

See [source record](../../capital-drive-sources.md),
[landmark references](../../capital-drive-landmark-references.md),
[address sources](../../capital-drive-address-sources.md),
[city-life sources](../../capital-drive-canberra-life-sources.md) and in-game credits.
OSM roads/outlines/explicit address tags: OpenStreetMap contributors, ODbL 1.0.
ACT footprints and 2020 LiDAR-derived two-metre AHD contours: Australian Capital
Territory, CC-BY 4.0. Microsoft GlobalML outlines: CDLA-Permissive 2.0. The 513 x 513
terrain grid has about 12 m cells and is not the native one-metre DEM. Historical
Mapzen attribution stays retained separately.

Earlier dated Street View samples informed original architectural cues; the notes
record actual positions and obstructed/rejected views. The new lookup failed at
the browser-control connection before a panorama loaded, so no fresh Street View
observation is claimed. The official Centre viewer did not yield an observed
floorplan; the Monaro-inspired wing remains a partial ground-floor interpretation.
Google imagery, official floorplans and proprietary reference art are not bundled.
Local Three.js r160 MIT, unchanged original car factory and local Atkinson OFL
font remain. All runtime data/imports/assets are local; developer caches and
browser/geodata tooling stay outside the repository.

## Audit findings

### Guided controls and interface work, latest15 November2026

The [tutorial/UI contract](../../capital-drive-tutorial-and-ui-contract.md) and
[receipt](../../verification/capital-drive-tutorial-ui-2026-11-15.md) describe this
continuation. First-run guided play is optional and replayable, uses actual
observations with fresh baselines, and gives no cash or mission credit. Menus
pause the world; only their real successful named actions can credit a matching
menu lesson. Stale counters, pause/teleport jumps and passenger motion cannot
substitute for walking/driving. Strict tiny UI preferences use a separate key.

The start panel is shorter, Help uses native expandable topics, mobile header
targets are at least44px, and light-theme focus/progress/stars have stronger
contrast. Shop/garage/help shortcuts remain in Pause on narrow screens. Toasts
and ordinary interaction hints clear the player status/minimap. Successful manual
Set route returns to play and starts at actual player focus, including on foot.

The hidden activity panel previously rewrote properties and queried controls on
every RAF, including outdoors and paused. The cached adapter preserves real
event draining and scoring, while3600unchanged-render fixtures record no extra
DOM writes, queries or element creation. Active cues/progress still follow the
actual activity snapshot. The paired profile receipt distinguishes these DOM
savings from graphics/process CPU; N100 hardware remains unmeasured.

### Crew catch-up, latest15 November2026

The owner requested companions teleport to the player. Shared-mission crew now
recruit near the actual player and catch up when over35m away, including during
driving/transit, or after about3active seconds stuck over10m away. Bounded local
landing checks avoid physical obstructions and other adults; failed placement
retains the crew for a throttled retry. Health, identity and cooldowns survive;
dead companions stay down. Normal nearby following and combat still use physical
sweeps. Objective changes alone do not relocate the crew. Indoor hiding and the
fixed Kingston meeting remain. See the [story contract](../../capital-drive-story-and-streaming-contract.md)
and [fresh receipt](../../verification/capital-drive-crew-catchup-2026-11-15.md).

### Indoor pursuit, driving starts and direct stored maps, latest15 November2026

The [indoor pursuit contract](../../capital-drive-indoor-pursuit-contract.md) and
[receipt](../../verification/capital-drive-indoor-pursuit-2026-11-15.md) record the
latest continuation. Police physically approach a known ordinary doorway, leave
their car, traverse the actual school gate when needed and enter through a clear
landing. Indoor pursuit, shots and arrest use the same plan-bound furniture/wall
collision and logical room as the player. Officers walk to the exit before
resuming outdoor tactics. Milo's exact safehouse room excludes them; ordinary
houses do not. Unknown unseen entries remain undiscovered until witnessed/reported.
Only active/pursuer-occupied plans remain, at most five; navigation caps2000nodes
per room and four cached owner fields. The indoor pool creates officers without
patrol-car geometry. No remote police spawning or cross-room shots are used.

Fresh Milo starts behind the wheel, and his first errands have explicit driving
legs. Existing checkpoints remain authoritative. Phone routing returns a player
to their actual car. Ordinary work and driver fares allow wanted stars; explicit
escape objectives and other activity restrictions remain. A private session-only
mission selector previews all thirteen chapters with their real heroes, zero
campaign rewards and original campaign prefixes. Cancel/finish restores checked
body/car/health/ammo. A blocked return retains its snapshot for explicit Retry
return; it cannot be overwritten or trigger per-frame placement loops.

The current worker closure is99files/15,672,251bytes. On controlled warm visits,
the six map Responses are read directly from its pinned active cache revision,
so no page map-fetch requests are needed. A750ms bounded failure falls back to
ordinary loading. Cold loading, parsing/indexing and scene construction remain.
The reusable source runner now requires78game JS files,92Node suites and two
Python checks,265commands total. See the fresh receipt for native results and
retained failures. N100 hardware, whole-campaign completion, safehouse native
evasion and naturally earned wanted-job rewards remain unverified.

The later [vehicle-impact contract](../../capital-drive-vehicle-impact-contract.md)
adds pre-stop contact velocity from actual moving sweeps. Fast hits launch the
on-foot player, with bounded horizontal travel through the existing colliders
and an eleven-joint damped ragdoll; gentle bumps stay grounded. Launch/fall/get-up
last2.6active seconds. Career damage caps36; Free roam retains health protection.
Lethal hits fall before the existing hospital transition. Being hit creates no
offence against the victim. Player-only joint work reuses existing meshes and
has no extra RAF or distant-NPC physics. Browser component evidence is labelled
programmatic, rather than an ordinary native career collision or hardware test.

### Repeat loading, character resumes and CPU, later15 November2026

The [cache/CPU contract](../../capital-drive-cache-and-performance-contract.md) and
[receipt](../../verification/capital-drive-cache-cpu-2026-11-15.md) record this
continuation. After real boot, a game-scoped worker stores the93-file local closure
(15,602,350bytes) with content hashes. Repeat visits use CacheStorage; six map JSONs
need no repeat origin transfer. New revisions reuse unchanged assets, verify
complete installation and wait for open game tabs to close. Offline reopening
works after successful installation; denied/unavailable storage keeps online play.
Only this game's old response caches are cleaned. Career saves are separate.
Regenerate `cache-manifest.js` after final runtime edits and check it before commit.

`protagonist-state.js` adds an optional strict per-hero checkpoint to the existing
career writer. Kit/Rowan/Milo now return to their own pose, health, vehicle and
ammo. A room capture resumes at its actual outside door. Busy/wanted/recovery
states lock switching; completed missions, cash and ownership remain shared.
The native menu/switch/reload case passed24checks without state grants.
Dot's ordinary dialogue has an explicit Fight choice: actual noodle throw then
fists. F punches; movement dodges. The ordinary confrontation cannot grant
Rowan's mission credit. Protected work disables Fight. Real-room collision and
retaliation tests preserve the table/booth and other contact guards. A separate
16-check native Free-roam fight confirms the actual throw, NPC punch and player
F reducing her health; it is not career mission completion.

Actual CPU samples identified repeated traffic polygon checks and continuous
paused redraws. Conservative exact AABB filtering and distant-body rejection
retain original near-contact formulas; differential40-car trajectories match.
Pauses stop rendering once stable, while pending chunks, resizes, caption scenes
and live tracking remain supported. Paired cloud driving ScriptDuration fell
3.247→1.265seconds per~8second3D window; the2D control fell3.925→1.169.
Paused3D rendered zero frames (software GPU CPU32.53→0.04seconds). These are
short cloud SwiftShader observations, not N100 measurements or a universal FPS
promise. The new software-default Performance preset caps640×360/20FPS;
hardware defaults Low960×540/30. Saved explicit choices override detection.
In the measured software scene, Performance rendered162frames/8.08s versus
118/8.17s on Low, with12%less graphics-process CPU. Lower resolution is a tradeoff.

Native caching passed18checks including zero warm map/module origin bodies,
offline normal driving and exact save preservation. A lightweight persistent
browser restart fixture passed5; fallback/update-isolation fixtures are separate.
That dated runner contained74game JS files,85pure Node suites and two Python cache
checks (247commands); final acceptance for that milestone is in its receipt. Historical
230/220 counts below retain their dated scope.

### Clear missions, crew and streamed geometry, 15 November 2026

The [story and streaming contract](../../capital-drive-story-and-streaming-contract.md)
and [follow-up receipt](../../verification/capital-drive-campaign-followup-2026-11-15.md)
record the current architecture. Guides name the destination and metres, route to
its actual rendered approach, then mark the real indoor counter, person or task.
Milo’s safehouse binds one existing Jardine Street house and furnishes its ledger
station only on entry. Telopea’s estimated after-hours wing has an actual entered
room and a held-X/release/fresh-Y alarm task. This replaces Kit’s old flyer task
under its retained save ID. Completed historical chapters are not replayed.

Each chapter starts with a short skippable caption scene on the existing world.
Job chapters and active mini-games deny attacks before ammo/offence/cooldown
writes. The actual school alarm intentionally starts a one-star search once.
Shared chapter owners are Milo, Kit, Rowan, Rowan, Kit and Milo. Two bounded allies
follow and fight visible foot police outdoors; they do not board cars or join
indoor rooms. Police have sidearms with sight/range/cooldown guards and compare
foot intercept time with return/drive/dismount time before boarding a usable car.

Production enables real world and neighbourhood geometry eviction. Actual Low
world attribute bytes fall286,446,573 full→15,835,095 opening; six-area peak16,541,880.
Neighbourhood full19,629,540→1,182,060 settled; peak2,011,932. All4,200door descriptors
remain, and source geometry hashes match on revisits. Full source map, colliders,
routing graph and addresses stay in memory. One interior loads on entry and
releases on exit. These measurements do not measure total RAM or N100 FPS.

Current source verification passed230/230 commands. Native school evidence passed18
checks through captions, attack protection, actual alarm and room exit; it stops
before evasion/reward. Nine programmatic noodle-component checks establish the
actual throw/punch engine and view, not a naturally earned lunch mission. The
bounded native Rowan lunch walk failed at a source-building corner; its failure
and earlier caption-layout artifacts are retained. The final in-page caption
overlay passed28 desktop/mobile focus/input checks and visual review; its top
rectangle is gone. Full shared heists, paid gym
career completion and target-hardware performance remain unverified.

### Campaign switching and Rowan's lunch, 15 November 2026

J opens Campaign and permits changing among Kit, Rowan and Milo between any
missions, including partly completed introductions. Active missions lock all
choices; completion, cancellation or failure releases them. Independent ordered
intro prefixes survive switching/reload in the existing v2 format. Mid-session
selection originally shared a position. The later cache/CPU continuation below
supersedes that behavior with separate saved character locations and state.

Rowan's lunch now requires Dot to throw noodles at him before a live melee attack.
The controller enables this sequence only for the active lunch encounter objective;
the counter must be visited first. Both dialogue replies lead to the story
sequence. Ordinary restaurant dialogue keeps its peaceful/confrontation choices.
A released bowl follows its stored trajectory when Rowan retreats. Nonlethal
interruption and anger timeout permit a fresh retry; old throw credit cannot
complete it. Death, coercion, reach, sight, pause and current player-health guards
remain. Twelve strands/five bowl pieces reuse the accessory batch, retaining six
room-person draws. See the [follow-up receipt](../../verification/capital-drive-campaign-followup-2026-11-15.md)
for current checks; the 14 November counts below remain dated evidence.

### Canberra life and three-character campaign, 14 November 2026

The [city-life contract](../../capital-drive-canberra-life-contract.md),
[source record](../../capital-drive-canberra-life-sources.md) and
[verification receipt](../../verification/capital-drive-canberra-life-2026-11-14.md)
supersede the older six-chapter-only campaign, bench-only gym and generic shop
room descriptions below. Each protagonist has two opening missions; all six
introductions converge at Three receipts before the retained six courier chapters.
Rowan's PowerPunt uses three fresh X/Y/X edits and a fictional Microstall outage;
only that live terminal event advances the mission. Work requires a fresh matching
completed shift. Campaign v1 progress and rewards remain intact on migration.

Lambzhou has a near-only exterior window cook and a lazy indoor cook pulling
original noodle strands. Dot is a fictional adult guest in pink earmuffs; nearby
bag-dispute dialogue permits apology or confrontation with bounded retaliation.
Sight, health, pause, cooldown and authoritative encounter serials govern it.
The character does not depict or allege behaviour by a real customer.

Accepted native evidence is 74 checks across four cases: campaign, restaurant,
gym and scenery. It proves Rowan's first mission and PowerPunt outage, the tested
restaurant choices, all four Free-roam workout inputs/Done/exit, and the recorded
source scenery approaches. It does not establish naturally completed paid career
workouts, the complete six introductions/shared meeting, campaign lunch credit,
all-city appearance or an N100 frame rate. Those limits and retained earlier
failures stay explicit in the receipt. Source authority tests cover paid workouts
and replay guards; normal paid-career acceptance remains held.

Source exports retain 388 stop facilities, 13 fuel sites (12 petrol/one hydrogen)
and 24 fitness venues; only three become additional gym services. Shelters require
source evidence and furniture clears roads/solid bodies. Six apparent canopy/body
matches all fail 95% coverage, so zero whole ACT bodies are changed. Highway rails
use 73 exact source ways: 998 evidence segments, 658 ground runtime strips and 49
Hindmarsh strips; 340 elevated segments are omitted from flat collision/rendering.
Two fictional bus circuits dwell at source stops2255/2376 for seven active seconds.
ACT suburb attributes guide distinct Red Hill/Narrabundah palettes, gardens,
verandas and rear shelters; these remain architectural estimates. Twelve original
kangaroos stay inside a source Red Hill reserve boundary. Telopea
rocks/flags/garden positions and local-history notice geometry remain estimates.

The Centre remains an original partial ground-floor interpretation: exact tenant
adjacency, escalators and the whole-mall floorplan were not observed. No fresh
Street View panorama was loaded during the failed browser-control connection.
Airport coverage and actual Intel N100/native GPU performance remain future gates.

### Shared street and vehicle people, 14 November 2026

The [shared-people contract](../../capital-drive-people-contract.md) records the
single rounded model family, stable person identities and bounded adapters.
Drivers retain their appearance when displaced or when a Yoober driver steps out.
The active protagonist keeps the selected palette across foot, driving and
passenger poses; police retain navy uniforms. Existing crowd routines, collisions, health,
witnesses and career owners remain authoritative. The
[verification receipt](../../verification/capital-drive-people-2026-11-14.md)
distinguishes normal-input loading/movement from the labelled component comparison.
Moving vehicles now check live adult circles through continuous full-body sweeps;
traffic, buses and rides share the same contact owner. Foot clearance only exempts
the querying passenger's own circle. The controller supplies current street
people and its on-foot player before movement, without changing health or cash.

The Lambzhou report reproduced an unrelated brown chair from a pedestrian coffee
routine, not a missing restaurant shell. Arbitrary sidewalk chairs are removed;
coffee adults stand holding cups. The arranged restaurant apron furniture and
entered dining/kitchen room remain. Actual-source ray/culling checks and a normal
entry/counter/exit browser flow cover the restaurant separately.

### Signals, full contacts, transport and hold-ups, 14 November 2026

The later [road-arrow follow-up](../../verification/capital-drive-road-arrows-2026-11-14.md)
adds `road-guidance-view.js`: yellow outlined world-space arrows ahead of the manual
driver, following the existing route at 12/24/36 m with terrain height and estimated
left-lane placement. They hide on foot, indoors, for passengers, at arrival, reversed
away from the route or too far off route. Map/HUD arrows and next-turn distance
remain. At most three markers/two draws use 4,992 buffer bytes, without physics,
progression, source data or lights changing.

The [contract](../../capital-drive-signals-transport-crime-contract.md) and
[receipt](../../verification/capital-drive-signals-2026-11-14.md) record the newer
signal/arrow/tracking, traffic, transport, equipment and crime work. These supersede
the scenic-signal, uniform vehicle-body and legacy button-only robbery descriptions.

339 exact OSM signal nodes from 34 pinned caches produce 347 estimated heads in
96 groups. One simulation clock owns phases and red/amber travel caps for traffic,
buses and Yoober. The player keeps direct control. Five pooled draws show nearby
heads, without lights/assets fetched remotely. Timings, grouping and sidewalk
offsets remain estimates. GPS shows yellow turn arrows and along-route distances.
T's Track driver advances the world/map while player input stays frozen; ordinary
dialogs still pause, and no career teleport or earnings are enabled.

The saved starter's zero-condition brake, unchecked traffic/player rotations,
static source-road collider conflicts and false opposing-lane/crossing queues were
reproduced separately. Starter-only assistance restores a saved wreck to 35% on a
new career start. Actual model body sizes, swept walking boxes, checked steering,
rotated parked indexing and cached ambient-lane admission preserve collision.
Full-runtime 7,200-frame regressions keep all 40 bodies clear and all 40 make real
progress. Original strict junction checks remain enabled. Stopped counts include
legitimate queues; no universal free-flow or hardware-FPS claim.

Yoober's continuous lookahead reduces vertex hesitation while preserving corners,
obstacles and lights. Nearby cancellations can provoke one bounded fictional
driver; remote/recovery/mode/sandbox cancellations do not. At a bus's front-left
door, E requests a stop within 10 m, boards beside the stopped clear door, and
stops/exits while aboard. The player has a visible seated passenger and chase/orbit
camera, with no new interior-camera toggle. Foot combat/rentals/jobs are excluded.

K arms stock includes a scanner ($500) and packs of three flares ($120), capped at
12. B uses a checked short flare throw on foot; at most three 20-second beacons
exist. Scanner ownership reveals nearby occluded patrols. Strict optional v1 gear
and mugging cooldowns retain legacy saves; Free-roam previews never spend/save.
Equip an owned gun or actually punch a living pedestrian/employee, then E demands
valuables/the till. The bound adult visibly complies through intimidation,
emptying and handover; E cancels. Employees require the matching store/room and
bounded counter/staff reach. Only completed handover pays once, with 180-second
cooldowns. Ordinary purchase reach stays strict. NPC modules grant no cash.
Source road/building/terrain snapshots and shared vehicle artwork are unchanged.

### Yoober, five-star trading and default geometry, 14 November 2026

The [Yoober contract](../../capital-drive-yoober-contract.md) records one physical
NPC car, fixed quoted boarding fees, phone destinations/cancellation, safe exits,
the supplied passenger focus/input guard and two repeatable paid driver fares.
The [verification receipt](../../verification/capital-drive-yoober-2026-11-14.md)
separates normal-input proof, actual geometry measurements and device limits.
The Crescent/Franklin fares pay$45/$110 through the existing strict v1 wallet.
No Uber service, real driver, external API or Street Life teleport is used.

Ordinary food/weapon/ammo purchasing now allows wanted stars, including five.
Other reach, stock, cash, ownership, sight, interior and activity checks remain.
Contact panic follows actual gunfire/damage rather than wanted stars alone;
injured/frightened contacts can still decline. The later indoor-pursuit continuation
also removes the ordinary work/driver-fare wanted lock; gym/garage/rental/passenger
rules retain their own restrictions. This supersedes the purchase wanted lock below.

The game now boots the Low world/neighbourhood geometry. Paired actual merged-map
world attributes fell534,265,329→286,722,933bytes; neighbourhood36,342,540→19,630,188.
World triangles fell8,513,470→4,155,544. At spawn, world draws93→61 and visible
triangles433,881→181,728. Exact terrain/walls/roads/pavement/water attributes,
source footprints, accepted tree positions, structural garden boundaries and all
4,200door descriptors are preserved. Ordinary facade/roof/tree/ornament detail
and visibility are reduced; landmarks and physics are unchanged. Low render
resolution caps960×540. Standard changes target rate/resolution, without rebuilding
the city. These measurements establish geometry savings, not N100 FPS or total RAM.

### Arms, quieter adults and parking correction, 14 November 2026

The later [arms and streets contract](../../capital-drive-arms-and-streets-contract.md)
and [verification receipt](../../verification/capital-drive-arms-streets-2026-11-14.md) supersede the single-pistol,80/160crowd and narrow-curb decoration descriptions
below. Four original arcade firearms have independent ammo pools and visual
silhouettes; shared profiles govern economy, combat and UI. Legacy v1 ownership
saves remain valid. Three original fictional adult contacts offer local stock;
K's weapons filter/Route and E beside a contact expose actual stock. Every purchase
requires valid on-foot proximity, clear view, available stock/cash/cap and a clear
wanted/recovery/activity state. Disabled buttons explain their reason.

Canalside's old approach is physically clear in actual expanded-map sweeps/LOS.
The reported loading cursor was the disabled-button CSS, not network loading.
Owned items, full ammo packs, wanted, funds and distance now display clear states.
Prices/controls, native sale evidence and limitations are in the new receipt.

Public crowd caps are36 suburban/64 Civic. Chairs/cups, phones and work gestures
interrupt into panic/fleeing; selected assertive adults retaliate only against a
close actual aggressor with LOS/cooldown. Source/door-safe sites, separation and
paused routines are covered. At most11 crowd draws plus six small contact draws.

The original2,360decorative cars included2,065public-lane physical overlaps.
Parking now uses source parking aisles and truly wide safe curbs, rejecting
invalid narrow curb slots. Visible/physical positions share887validated slots;
the original parking-only replay improved36stops to17. A later crossing-priority
fix clears two reproduced permanent junction cycles with physical sweeps intact.
Current fixed-parking40-carreplay:7/18stopped at60/120s, versus17/26beforepriority.
These results do not claim that all independent junction/building delays are repaired.

### Visible cues and distributed vehicle locks, 14 November 2026

The later [unlock contract](../../capital-drive-unlock-contract.md) and
[verification receipt](../../verification/capital-drive-unlocks-2026-11-14.md) supersede the
three-stand fleet and automatic taking timer below. Every mini-game exposes its
full sequence, completed/current tiles, a large current-key cue and response-time
bar. Stock sequences remain visible while repeating. Bench still requires held
X+Y with timed ArrowUp; Q starts indoor games. E cancels; P/Esc pauses.

The phone offers the nearest eight rides. Scooters may be hired or hacked through
four 1.4-second cues; unfamiliar cars need eight 1-second cues with a stricter
mistake limit. Time/held-key spam cannot unlock anything. The controller requires
the exact live completion session/target, close visible reach and the correct
mode before making a one-time claim. Interrupted, failed, moving, remote or
recovery attempts cannot claim a vehicle. Theft uses existing witnessed offences;
Free roam remains a sandbox. A used car's unlocked descriptor permits re-entry.

Lemons now total56 physical assets across33 deterministic points in ten areas,
including Manuka, Kingston, Griffith, Narrabundah, Red Hill, Barton and Civic/lake
approaches. Source-derived footpath estimates avoid lanes, buildings, water,
restricted/sensitive areas and known approaches. These are fictional placements,
not actual fleet coordinates. Nearest24 within180m render in at most5 batches;
vehicles are parked singly/in pairs rather than on large docks.

Pause also has a collapsed optional developer entry. Its configured value is not
advertised in UI or these instructions. Input is masked/cleared; the existing
capped wallet and save writer own changes. Invalid inputs and sandbox/recovery
cannot alter it; reload preserves valid state without replacing career progress.
The focused browser check observes the actual form action, not mission earnings.

### Living interiors, hire rides and paid work, 14 November 2026

The [living source notes](../../capital-drive-living-sources.md) record the actual
viewed restaurant exterior and official interior photographs, five exact Civic
store POIs, nine source paths and ACT SKPK6 boundary. The left preparation line,
right dining side, oxblood facade, cream transom and black frames follow those
observations; room dimensions/doors and ordinary building art remain estimates.
No new restaurant Street View panorama was accessible after explicit approval;
the cloud browser failed technically. No imagery/logos/murals are bundled.

`interior-activities.js` now owns eleven playable activity kinds; `interior-people.js`
and its view add up to16 active adults in at most6 batches, loaded/cleared with
the room. Each gym has an enterable original room and four distinct workout
machines, with participant/equipment poses and input-driven completion. Houses
have cooking/TV/rest; shops stock/order tasks; the concourse has games. Work wages and exercise progression validate the actual matching
room, station/session and player. A repeated Q cannot cancel pay eligibility.

`micromobility.js`/view provide six pooled fictional Lemon scooters/e-bikes at
three source-road stands. T phone hires a nearby actual asset for$20/$30; WASD
rides, S brakes, E ends a stopped ride in place. Cash stays in Progression and
sandbox travel cannot bank/spend it. Recovery, mode changes and teleport reset
or freeze the hire; it cannot move during a medical transfer.

`civic-extras.js`/view present five source shops and a walkable park in one draw.
The exact ACT park polygon cuts the overlapping roof/facade and collider. Shared
ramp heights and a physical rail agree with visible geometry. A car's inner-edge
contact resolves locally into the opening rather than jumping to the old outer
facade. Source geography is unchanged. The pinned offline builder reproduces
both generated files byte-for-byte. See the [living verification receipt](../../verification/capital-drive-living-2026-11-14.md) for current
normal-input results, previews, source budgets and retained failures.

### Precincts, lazy rooms, Civic and campaign, 14 November 2026

The owner requested more faithful Manuka precincts, believable neighbourhoods,
enterable homes/shops with backyards, Telopea fencing, the lake/Centre connection,
performance work and a campaign. See the [source record](../../capital-drive-district-sources.md)
and [verification receipt](../../verification/capital-drive-districts-2026-11-14.md).
Twenty source-backed Manuka parody shops occupy five distinct precincts;
Lambzhou1919 is a separately detailed twenty-first store at Civic. Exact-source
paving and inferred frontage units are separated; no surveyed tenancy/parking
plan is claimed. Six original campaign chapters have briefings, timed objectives,
recovery failure/retry, single rewards and saved completion. J opens Campaign in
that mode; Campaign has no map teleport, while Free roam never advances it.

`interiors.js` generates one furnished layout on explicit E entry at a rendered
door, with wall/furniture collision, door gaps and same-door return. `interior-view.js`
creates/disposes only its active meshes. Houses use plausible living/kitchen/bed/
bath arrangements. Groceries use aisles/checkouts/fridges; fast food uses
kitchen/pickup/booths; cafes and general shops have distinct furnishings. The
Centre uses an inscribed Monaro-inspired partial ground-floor wing with stone
portals, coffers and patterned floors. These are not actual private floorplans
or a verified whole-mall interior.
`suburb-character.js` and neighbourhood geometry add bounded rear gardens,
coherent frontages, local palettes and clearer tree shading. Source footprints
and nearest public roads guide these approximations; cadastral lots are not known.

`shopping-view.js`, `campus.js`/`campus-view.js` and `civic-view.js` own dedicated
centre/paving, Telopea boundary and Civic/bridge presentation. Same campus/parapet
segments govern collision. The214-point school site has186 closed fence spans
and11 estimated public-path openings; decorative old school fencing is suppressed.
Open roof-only shelters render as canopies and permit movement underneath.

`map-expansion.js` merges the local north sidecar and suppresses51 audited
OSM/ACT duplicate bodies only while their paired base IDs remain present.
Original base map and address bytes stay unchanged. The separate road-profile
sidecar now includes pinned source lane/sidewalk tags without changing widths.
Both lake bridges connect to Civic on the real directed graph. The full lake polygon retains its
island holes; western portions extend beyond the drivable rectangle. `terrain.js`
shares ACT-derived ground, estimated continuous bridge decks and radius-aware
water exemptions with rendering/collision. North terrain is259×157 at roughly25m
cells with a100m seam blend, not a native DEM or bathymetry model. The fixed
normal555.93mAHD lake surface is not a live water-level reading.

Static world/neighbourhood normals and colours use normalized byte attributes;
positions/UVs/triangle counts are preserved. A paired merged-map fixture measured
1,073,925,468→563,969,097 attribute bytes (47.49% less). This is buffer storage,
not total browser RAM or an N100 FPS measurement. Exterior graphics buffers are
not updated/rendered while inside. Native hardware acceptance remains open.

Priority `noodle-shop-view.js` adds a source-positioned Lambzhou1919 facade,
searchable under Lanzhou1919. Two actual official Canberra interior photos inform
the original timber/booth/blue-seat/open-kitchen room. It loads only on E entry,
uses2,412triangles/one draw and disposes on exit; its facade uses1,438/three.
Four exterior furniture footprints share movement geometry. No copyrighted photo/
mural/logo is bundled, and the entrance/floorplan remain estimates.


### Mapped stores, pool enclosure and forgiving driving, 14 November 2026

The owner requested real store locations/parody names, an enclosed Manuka Pool,
and relief from lag, early medical transfers and overly sensitive reckless
reports. The [new receipt](../../verification/capital-drive-stores-pool-2026-11-14.md)
separates source/interaction evidence and retained harness failures. Seven stores
use exact cached OSM nodes and matched footprints, with estimated public-facing
doors. Pool fences/walls follow the exact80vertex site; a2.16m gate is physically
passable, water/fence spans block movement and the heritage entrance is original
approximate art. The pool-only old ACT block collision is replaced.

Traffic reuses the same six models in instanced batches: a40car all-visible
fixture falls from320to19draws (94.1% fewer traffic draws, not overall FPS).
Parked-car broad-phase queries stop sweeps scanning the entire city; a2000far-car
regression records zero distant predicates. Ordinary foot movement cannot be
reported as vehicle contact, and witness checks receive actual line of sight.
Medical recovery now requires character KO; a disabled car allows exit. Damage
and reckless thresholds/cooldowns are described above and tested independently.
Geographic/address/terrain JSON and the shared car factory remain unchanged.


### Street-life expansion, 14 November 2026

See the [expansion contract](../../capital-drive-expansion-contract.md) and
[fresh verification](../../verification/capital-drive-expansion-2026-11-14.md).
The pass adds exact-source access profiles, a source retail-polygon correction,
visible Manuka Pool, buses/occupants, road and foot police, service activities,
five-star feedback and recovery transitions. Source geographic/address/terrain
files remain byte-identical. The 57-command pure pass and 28-check browser pass
have separate scope; the retained direct-walk failure was followed by a successful
normal-input waypoint walk. Normal bus-front and Parliament forecourt views were
reviewed separately. Expensive new positive purchase/robbery/training paths have
authority regressions; they are not claimed as naturally earned browser sessions.


- Architecture, characters, landscaping, furniture and gameplay are simplified
  procedural interpretations. Five dedicated landmarks do not certify every
  address or the whole district against Street View. No photogrammetry claim.
- Terrain interpolation residuals: median 0.071 m,p 95 0.609 m,max 37.615 m on held-out
  contour samples. These are numerical consistency, not independent survey error;
  kerbs, road cuts and local extrema remain approximate.
- Intel N100 / 8 GB performance is unmeasured. Software WebGL checks prove functioning
  shaders/interactions, not hardware 30/60 FPS. Actor adapter tested maximum 55 meshes / 31,398 triangles, with twelve normal foot draws; five landmarks total 12,790 triangles
  in 10 meshes / two materials. Buses use at most 5 draws / 3,998 template triangles including a passenger; occupants use at most
  seven pooled draws; generic signs use 2 draws /56triangles; mapped facades add2draws/1288triangles.
  Instanced traffic is at most19draws for40cars, preserving original models. These are bounded geometry,
  not hardware-performance measurements.
- Traffic keeps directed left-hand routing and bounded clearance, with simplified
  overtaking/anger. Signals use sourced positions and estimated physical stop
  phases. Patrols use directed legal roads, bounded
  acceleration/turning, brake/dismount and last-seen search; officers use swept
  local obstacle avoidance. This is not full sidewalk navigation and cannot
  guarantee passage around every blocked road. The inherited car cockpit is
  left-hand-drive; the new buses have a right-side driver and left-side doors.
- Characters are fictional adults; damage/knockdown is non-graphic and pooled.
  Witness events identify their offender; AI road rage must not implicate a
  stationary innocent player or direct another driver's retaliation at them.
- WebGL-unavailable browsers use an explicitly labelled playable 2 D fallback.
  Address coverage is incomplete and never invents/interpolates missing numbers.
- The dated fleet certificate failures are recorded separately. Targeted tests
  and user merge authorization are not a fresh all-games loading pass.

## Safe iteration

Use the local [development skill](../../../.agents/skills/capital-drive-development/SKILL.md)
and [workflow](../../../.agents/skills/capital-drive-development/references/workflow.md).
Preserve one clock, module boundaries, coordinate/collider agreement, strict
career validation, mode guards and offline closure. Keep shared car ABI and
other games untouched. Test new witness events for actor attribution, and fresh
missions for duplicate/replayed reward errors. Expand data through bounded
imports with retained source hashes; never turn rendering estimates into data.

## Verification

```sh
python3 -B scripts/check_capital_drive.py
python3 -B scripts/check_capital_drive.py --browser --life-browser --output <external-output>
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
```

The current reusable runner checks90game JavaScript files and112pure Node suites
plus two Python cache checks (317 syntax/source commands), fails on missing files or command errors and bounds
subprocess lifetimes. The tutorial/UI receipt records the latest run,
while the earlier230/230 story/streaming and220/220 city-life results remain
separately dated. Browser
QA uses normal keyboard/mouse/touch events; explicit negative fixtures cover
unavailable WebGL, denied storage and hidden teleport guards. Actual-map physics
uses 28,323 nodes /48,290 directed edges /40 traffic cars. Current Street Life
browser evidence, pictures, source milestones and dated fleet limits are recorded
in the [Street Life receipt](../../verification/capital-drive-street-life-2026-11-13.md).
Historical 12/13 November receipts remain separately dated.

## Future outlook

Profile a repeatable inner-south route on the intended N100; refine landmark
approaches/terrain seams and ordinary architecture from further verified views.
Improve officer navigation, driver lane changes, damage presentation and job
variety while completing native career evidence for the three-character story.
Airport coverage is a later expansion. Expand Canberra with bounded source
snapshots and address coverage. Preserve a playable smaller district and
honest evidence rather than claiming a completed city or cinematic GTA equivalent.
