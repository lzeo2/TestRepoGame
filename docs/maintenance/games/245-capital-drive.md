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
- `gameplay.js`: foot/sprint/jump, car entry/theft, fists/pistol/aim/reload,
  health, witnessed offences, timed carjacking and delayed recovery. `police.js`
  owns up to four road patrols, dismounted officers, sight/search/escape and arrest.
- `progression.js`: recurring ordered jobs, costs/rewards/unlocks, owned garage,
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
An occupied car must brake and stay close through the 1.8 second taking action.
**1/2** chooses fists/owned pistol; purchase the pistol at the supplies outlet first;
right mouse aims, left mouse attacks/fires, F melees and R reloads on foot.
**Q** starts the nearby interior mini-game or paid shop task; **T** opens the
Lemon hire phone. At the gym bench hold **X+Y**, then press **ArrowUp** on each
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
  overtaking/anger. Signals are scenic. Patrols use directed legal roads, bounded
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

The reusable runner checks44authored modules and36pure suites (117commands), fails
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
