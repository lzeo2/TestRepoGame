# Capital Drive: Canberra

<!-- maintenance-game: Games/Capital Drive -->

## Identity and status

Operator-authorized original Canberra open-world preview, catalog 245, static entry
`Games/Capital Drive/index.html`. Two modes share one runtime: **Street Life** has
jobs, cash, a garage, foot combat and police; **Free roam** has all cars, local
address search and map teleporting. The mapped district is the inner south.
Whole-city expansion and a cinematic campaign remain future work. No GTA code,
artwork or branded vehicle assets are used.

## Implementation map

- `script.js`: sole loop, input/camera/modes, local loading, maps/routes, parked
  and abandoned meshes, storage and module integration.
- `simulation.js`: indexed car/actor collision, directed OSM graph, 40 nearby
  reactive traffic cars (cap 56), bounded overtaking/road rage, vehicle claims,
  parked/abandoned descriptors, polygon line of sight and safe teleport.
- `gameplay.js`: foot/sprint/jump, car entry/theft, fists/pistol/aim/reload,
  health, witnessed offences,up to four police cars, sight/search/escape and respawn.
- `progression.js`: recurring ordered jobs, costs/rewards/unlocks, owned garage,
  condition-preserving retrieval and strict career-save validation.
- `street-ui.js`: jobs/garage services and status HUD; no clock or storage owner.
- `actor-view.js`: original articulated adult, generic patrol cars, pooled brief
  effects/objective marker; supplied dt and bounded resources.
- `world-view.js`, `neighbourhood.js`: bilinear terrain, road/footpath ribbons,
  chunked architecture, 9,000 trees, 4,200 frontages and clipped retail paving.
- `landmarks.js`, `landmarks-view.js`: real anchors and dedicated Parliament
  House, Old Parliament House, Manuka Oval and Kingston Powerhouse; exact source
  replacement IDs, near/distant LOD and local procedural architecture.
- `pedestrians.js`:80 instanced fictional adults, safe sidewalk walking,
  panic/anger/knockdown/recovery and causally attributed witness events.
- `navigation.js`, `map-projection.js`, `address-search.js`: directed road routes,
  shared map transform and bounded offline landmark/street/address matching.
- `data/canberra.json`: unchanged 12,572 sourced outlines, 5,197 road runs and
  513 x 513 ACT contour terrain. `data/addresses.json`:3,446 explicit OSM address
  records; some positions are approximate way centroids. Four extra landmark
  anchors are merged at runtime; the geographic source snapshot is not rewritten.

## Gameplay and controls

Choose Street Life or Free roam, then start beside Telopea Park School. WASD or
arrows drive/walk, Shift boosts/sprints, Space handbrakes/jumps. **E** stops then
exits a moving car, or enters/takes a clear nearby car. **1/2** chooses fists/pistol;
right mouse aims, left mouse attacks/fires, F melees and R reloads on foot.
Drag mouse to orbit; vehicle vertical drag looks up/down and stationary views
remain in place. H horns when sound is enabled. M map, J jobs, G garage, P/Esc
pause. Touch driving and action buttons cover smaller/coarse-pointer devices; Pause also opens the garage and sound controls.

Street Life map selections set road routes. Teleport, Start nearby and road
recovery are unavailable, with handler guards as well as hidden controls. Free
roam enables zoom/pan, address results, teleport confirmation/Enter and R recovery.
Clear off-road destinations stay exact; obstructed destinations adjust to clear
land. A mode change restarts at the mapped spawn and cancels a transient job;
sandbox travel never pays career cash or completes a job.

Start Crescent parcel at spawn and deliver down NSW Crescent. Ordered checkpoint,
target-wagon theft and wanted-getaway jobs unlock after that delivery; later jobs
pay more. Each fresh job requires arrival/stage/time conditions and pays once.
Crescent garage is a fictional service marker beside the mapped road: buy,
retrieve, store, repair and paint owned cars there. Retrieval keeps damage/paint;
repair costs cash. Police need actual building-unobstructed sight, then search
last-seen ground; hiding cools the search. Arrest or defeat deducts up to $250,
restores the player at a bounded road approach and preserves completed jobs.

## State and persistence

Root supplies capped 60 Hz simulation and 30/60 Hz rendering targets. Dialogs,
blur/hidden tabs clear held input and pause clocks. `pagehide` saves valid career
state and releases loop/audio/graphics; adapters own no second RAF.

`capital-drive-v1` still stores validated discovered IDs. It accepts the original
seven IDs plus the four runtime landmark IDs. `capital-drive-career-v1` separately
stores version 1, cash,owned vehicles (paint/condition/stored flag) and completed
job IDs. Active jobs and wanted state are transient. Oversized, corrupt or denied
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

- Architecture, characters, landscaping, furniture and gameplay are simplified
  procedural interpretations. Four dedicated landmarks do not certify every
  address or the whole district against Street View. No photogrammetry claim.
- Terrain interpolation residuals: median 0.071 m,p 95 0.609 m,max 37.615 m on held-out
  contour samples. These are numerical consistency, not independent survey error;
  kerbs, road cuts and local extrema remain approximate.
- Intel N100 / 8 GB performance is unmeasured. Software WebGL checks prove functioning
  shaders/interactions, not hardware 30/60 FPS. Actor adapter worst case 47 draws /
  27,996 triangles; four landmark models total about 5,232 triangles before LOD.
- Traffic keeps directed left-hand routing and bounded clearance, with simplified
  overtaking/anger. Signals are scenic. Police use local collider movement and
  line of sight rather than full emergency-driving road navigation.
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
python3 -B scripts/check_capital_drive.py --browser --output <external-output>
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
```

The reusable runner checks every authored module and eleven pure suites, fails
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
Improve police road navigation, driver lane changes, damage presentation and job
variety before adding a larger story campaign. Expand Canberra with bounded
source snapshots and address coverage. Preserve a playable smaller district and
honest evidence rather than claiming a completed city or cinematic GTA equivalent.
