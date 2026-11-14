# Capital Drive: Canberra

<!-- maintenance-game: Games/Capital Drive -->

## Identity and status

Operator-authorized original Canberra open-world preview, catalog 245, static entry
`Games/Capital Drive/index.html`. Three modes share one runtime: **Campaign** has six ordered original missions, **Street Life** has
jobs, cash, a garage, foot combat and police; **Free roam** has all cars, local
address search and map teleporting. The mapped area covers the inner south and a source-derived lake/Civic corridor.
Whole-city coverage and cinematic storytelling remain future work. No GTA code,
artwork or branded vehicle assets are used.

## Implementation map

- `script.js`: sole loop, input/camera/modes, local loading, maps/routes, parked
  and abandoned meshes, storage and module integration.
- `simulation.js`: indexed car/actor collision, directed OSM graph, 40 nearby
  reactive traffic cars (cap 56), bounded overtaking/road rage, vehicle claims,
  parked/abandoned descriptors, polygon line of sight and safe teleport.
- `ride-service.js`/`ride-service-view.js`: one physical NPC-driven Yoober car,
  quoted phone bookings, single boarding debit, clear stopped exits and pooled
  driver-fare waiting/seated passengers. Progression owns repeatable paid fares.
- `gameplay.js`: foot/sprint/jump, car entry/theft, four firearms/aim/reload,
  health, witnessed offences, eight-cue car locks and delayed recovery. `police.js`
  owns up to four road patrols, dismounted officers, sight/search/escape and arrest.
- `progression.js`: recurring ordered jobs, costs/rewards/unlocks, saved four-weapon ownership and owned garage,
  condition-preserving retrieval, food/gun/ammo purchases, playable fitness/paid work, timed robbery,
  cooldowns and strict legacy-compatible career-save validation.
- `street-ui.js`: jobs/garage/shops, five-star HUD and recovery feedback; no clock
  or storage owner. `services.js` combines twenty-six mapped parody stores with fictional gym/arms sites.
  `stores.js`/`data/stores.json` pin source nodes and estimated public frontages.
  `storefronts-view.js` presents twenty generic-capable facades plus a separately managed noodle restaurant in two batches.
- `actor-view.js`: original articulated adult, generic patrol cars, pooled brief
  effects/objective marker and dismounted officers. `vehicle-occupants-view.js`
  presents up to 64 seated drivers and 12 displaced adults; `services-view.js`
  presents two small generic activity signs. `traffic-view.js` instances the
  six traffic models in at most19draws rather than up to320separate draws. Supplied dt and bounded resources.
- `world-view.js`, `neighbourhood.js`: bilinear terrain, road/footpath ribbons,
  chunked architecture, 9,000 trees, 4,200 frontages and clipped retail paving.
- `landmarks.js`, `landmarks-view.js`: real anchors and dedicated Parliament
  House, Old Parliament House, Manuka Oval, Kingston Powerhouse and Manuka Pool; exact source
  replacement IDs, near/distant LOD and local procedural architecture.
- `road-network.js`/`data/road-profiles.json`: source-tagged service/access widths
  and cached legal directed routes; shared swept external vehicle collision.
- `buses.js`/`bus-view.js`: two original unbranded buses, fictional ambient
  circuits on the actual public-road graph and bounded rendering.
- `districts.js`: exact source Manuka retail polygon, shared appearance classifier.
- `pedestrians.js`:80 suburban /160 nearby Civic instanced fictional adults, safe sidewalk walking,
  panic/anger/knockdown/recovery swept player contacts/yielding and causally attributed witness events.
- `navigation.js`, `map-projection.js`, `address-search.js`: directed road routes,
  shared map transform and bounded offline landmark/street/address matching.
- `data/canberra.json`: unchanged 12,572 sourced outlines, 5,197 road runs and
  513 x 513 ACT contour terrain. `data/addresses.json`:3,446 explicit OSM address
  records; some positions are approximate way centroids. Five extra landmark
  anchors and seven parody store approaches are merged at runtime; the geographic source snapshot is not rewritten.

## Gameplay and controls

Choose Campaign, Street Life or Free roam, then start beside Telopea Park School. WASD or
arrows drive/walk, Shift boosts/sprints, Space handbrakes/jumps. **E** stops then
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
At the gym bench hold **X+Y**, then press **ArrowUp** on each
LIFT cue for six repetitions. Early/late presses and releasing grip fail the set.
Drag mouse to orbit; vehicle vertical drag looks up/down and stationary views
remain in place. H horns when sound is enabled. M map, J jobs, G garage, K shops, P/Esc
pause. Touch driving and action buttons cover smaller/coarse-pointer devices; Pause also opens the garage and sound controls.

Street Life map selections set road routes. Teleport, Start nearby and road
recovery are unavailable, with handler guards as well as hidden controls. Free
roam enables zoom/pan, address results, teleport confirmation/Enter and R recovery.
Clear off-road destinations stay exact; obstructed destinations adjust to clear
land. A mode change restarts at the mapped spawn and cancels a transient job;
sandbox travel never pays career cash or completes a job.

Start Crescent parcel at spawn and deliver down NSW Crescent. Ordered checkpoint,
target-wagon theft and wanted-getaway jobs unlock after that delivery; later jobs
pay more. Franklin and Kennedy deliveries are available immediately for$400/$450.
Noodle preparation pays$60 and shop stocking pays$45 after the actual task completes.
No time-only, interrupted or Free-roam task pays. Each fresh job requires arrival/stage/time conditions and pays once.
Crescent garage is a fictional service marker beside the mapped road: buy,
retrieve, store, repair and paint owned cars there. Retrieval keeps damage/paint;
repair costs cash. Police need actual building-unobstructed sight, then search
last-seen ground; hiding cools the search. Arrest or defeat deducts up to $250,
transfers through a 3.4 second fade/recovery sequence, restores the player at a
bounded road approach and preserves completed jobs. The penalty is applied once.

Twenty-three service points can be routed to from Shops, including twenty-one actual mapped
parody stores such as Coals. Enter a mapped shop on foot and visit its counter: food
costs $35 for 35 health, the supplies dealer sells a $450 pistol and $60 ammunition,
and eight-second gym sessions cost $120 per current upgrade step to improve
sprinting through three levels. Taking a shop till requires an equipped owned
pistol and four uninterrupted nearby seconds; the witnessed offence raises
wanted level. Each till pays once and retains its 180 active-second empty cooldown
through reload. Store interactions also require the active matching interior and clear sight to its counter; leaving interrupts a till action. Generic gym/supplies activities remain exterior.
Retired fictional food-marker cooldown keys remain valid in older saves. Free
roam cannot purchase, train or earn robbery cash. See [store sources](../../capital-drive-store-sources.md).

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

`capital-drive-v1` still stores validated discovered IDs. It accepts the original
seven IDs plus runtime landmark IDs and twenty-one mapped store IDs. `capital-drive-career-v1` separately
stores version 1, cash, owned vehicles (paint/condition/stored flag), completed
job IDs, pistol ownership, fitness level and till cooldowns. The three new fields
are optional on legacy v1 input and strictly validated when present. Ammunition
and active training/robbery are transient; an owned gun starts with 24 rounds
when starting a career session. The controller also accepts an optional validated campaign field with an ordered completed-chapter prefix, saved atomically with career cash. Legacy saves start at chapter one. Unknown fields still reject the save. Active jobs and wanted state are transient. Oversized, corrupt or denied
sources report failure and remain unwritten. Sandbox never writes career state.
Only this game's keys are read/written; no origin-wide clear.

`capitalDriveSnapshot()` exposes detached/frozen QA state, including focus,
gameplay, serialized career, places, address count, renderer/landmark/actor stats
and camera orbit/pitch. It contains no production setters. Career serialization
excludes active jobs by design; browser tests observe the stage HUD and normal
completion rather than granting state.

## Dependencies and provenance

See [source record](../../capital-drive-sources.md),
[landmark references](../../capital-drive-landmark-references.md),
[address sources](../../capital-drive-address-sources.md) and in-game credits.
OSM roads/outlines/explicit address tags: OpenStreetMap contributors, ODbL 1.0.
ACT footprints and 2020 LiDAR-derived two-metre AHD contours: Australian Capital
Territory, CC-BY 4.0. Microsoft GlobalML outlines: CDLA-Permissive 2.0. The 513 x 513
terrain grid has about 12 m cells and is not the native one-metre DEM. Historical
Mapzen attribution stays retained separately.

Actual Street View samples informed original architectural cues; the notes
record dates, positions and obstructed/rejected views. Google images are not
bundled. Local Three.js r160 MIT, unchanged original car factory and local Atkinson
OFL font remain. All runtime data/imports/assets are local; developer caches and
browser/geodata tooling stay outside the repository.

## Audit findings

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
injured/frightened contacts can still decline. Gym/garage/work/ride rules retain
their own wanted restrictions. This supersedes the purchase wanted lock below.

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

`interior-activities.js` owns seven playable activity kinds; `interior-people.js`
and its view add up to16 active adults in at most6 batches, loaded/cleared with
the room. The gym has an enterable original room, an animated press and six timed
repetitions. Houses have cooking/TV/rest; shops stock/order tasks; the concourse
has games. Work wages and exercise progression validate the actual matching
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
bath arrangements, shops shelves/counters and the Centre an original four-unit
concourse. These are not actual private floorplans or an exact mall interior.
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
Original base map, address and profile bytes stay unchanged. Both lake bridges
connect to Civic on the real directed graph. The full lake polygon retains its
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
  shaders/interactions, not hardware 30/60 FPS. Actor adapter worst case 52 draws / 28,668 triangles; five landmarks total 12,790 triangles
  in 10 meshes / two materials. Buses add 4 draws / 2,264 triangles; occupants use at most
  four draws; generic signs use 2 draws /56triangles; mapped facades add2draws/1288triangles.
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
python3 -B scripts/check_capital_drive.py --browser --living-browser --output <external-output>
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
```

The reusable runner checks 57 authored modules and 65 pure suites (188 commands), fails
on missing files or actual command errors and bounds subprocess lifetimes. Browser
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
variety before adding a larger story campaign. Expand Canberra with bounded
source snapshots and address coverage. Preserve a playable smaller district and
honest evidence rather than claiming a completed city or cinematic GTA equivalent.
