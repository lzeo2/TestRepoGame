# CITISTEN

<!-- maintenance-game: Games/Citisten3D -->

## Identity and status

Operator-authorized original city builder, registered as id 241. Entry:
`Games/Citisten3D/index.html`. Native entry commit `b6db8eb`; world integration
and registration were committed externally as `ce1c541`. No swarm push.
Registration does not establish browser/gameplay or performance acceptance.
[Native integration receipt](../../citisten-native-integration.md) records
source review, the `93c104e`/`2540b8c` corrections and bounded native runners
`14a19ab`/`a8d17f5`. Native acceptance is still blocked by recorded timeouts.

## Implementation map

`index.html`, `native.mjs`, `native-actions.mjs` and `native.css` connect
`ui.mjs`, `sim.mjs` and `world.mjs`. `native-loop.mjs` owns the wake/sleep
scheduler; `native-check.mjs` checks its static/hidden paths without a browser. `buildings.mjs` now exports the external
GLB kit, not procedural models. Await `world.ready` before rendering or play.
`external-assets.mjs`, `external-buildings.mjs`, `external-materials.mjs` and
`models/` own supplied rendering assets. See the
[external-model receipt](../../citisten-external-models.md) and
[current mesh API](../../citisten-buildings-api.md). `be3024f` normalizes only
five explicitly declared +Z facades to the legacy -Z front, preserving local
rig pivots and grounding. Earlier procedural receipts are historical.

## Gameplay and controls

Free-build and zombie-defense modes; click/tap lots, drag roads at $10/lot,
select tools, repair by day, pause/resume, restart and change simulation speed.
WASD pans; right drag looks; wheel changes height. Native controls include
camera buttons. Normal-input browser acceptance remains pending.

### Events and first-play help

The native loop drains events even at speed 0; speed never hid the HUD. The
apparent missing board was transient feedback expiring after six wall-clock
seconds. Events now retain the latest notices (one on phones, three on desktop)
until replaced or a new game starts, with a labelled empty state. No simulation
exists before choosing a mode; the initial menu is not a paused running city.
Speed 0 still freezes simulation time, while placement feedback remains usable.

A dismissible five-step tutorial opens on first play; Menu's How to play button
reopens it. Automatic help pauses and restores the current speed; menu replay
returns to the still-paused menu. `citisten-tutorial-seen` stores dismissal when
localStorage works, otherwise dismissal lasts only for this UI session. Node
syntax and simulation/native checks pass. A bounded focused UI-fixture run passed
2/2 (1440px mouse, 390px touch): all five steps, dismissal/input recovery,
first-play flag, menu replay/Escape, denied storage and notices retained beyond
six seconds. Zero page errors; browser/server released. Eight screenshots are
local-only under `.tmp/citisten-onboarding/`; desktop/mobile views in both themes
were reviewed. The expanded `ui-qa.py` suite remains unrun, as does fresh native
gameplay/FPS acceptance. No full-fleet gate or push was attempted.

### Population growth

`sim.mjs` recalculates the economy once per simulated second. Only powered **and**
watered commercial lots (32 jobs each) and industrial lots (96 each) contribute
jobs. Residential demand is `clamp(0.55 + (jobs - population * 0.65) / 1500 -
max(0, taxRate - 0.1) * 4, 0, 1)`. Jobs raise demand, but are not a strict
prerequisite: there is baseline demand even with zero jobs. Commercial and
industrial demand values do not gate manual placement or directly add residents.

Total growth before sharing is `2.7 * residentialDemand *
clamp(1.5 - taxRate * 5, 0, 1)`, divided by the number of **all** residential lots
(minimum divisor 1). Taxes at or below 0.1 avoid the demand penalty and give the
full growth multiplier; going below 0.1 adds no further growth bonus. Each safe
home receives that share, capped at 64 residents. Residents are fractional;
the HUD floors their sum. Capped or unsafe homes do not redistribute their share.

A home grows only if powered, watered, within 16 lots (straight-line distance)
of an active town hall, park, police or fire station, and either crime is below
0.65 or active police are within 16 lots. Crime is
`clamp((population - activePoliceCount * 600 - 200) / 1800, 0, 1)`. Otherwise
the home loses `max(0.2, residents * 0.025)` residents per economy tick, down to 0.
Zones require an orthogonally adjacent road to place. Power/water propagate via
connected roads and matching utility sources to adjacent buildings; disconnected
supply cannot serve homes, and insufficient capacity sheds whole 8x8 districts.
There is no separate commute or road-to-town-hall test for growth; roads matter
through utility connectivity.
These are the baseline formulas; active civic events can temporarily modify
safe-home growth, income, utility demand and crime. The diagnosis UI does not
invent a separate growth mechanic.

### Civic events, milestones and rebuilding

The [events receipt](../../citisten-events.md) describes six deterministic civic
happenings, beginning at tick 240 and repeating every 960 ticks, with active
records in `state.cityEvents`. The native Repair water main button resolves the
active incident's district and uses the existing repair tool ($120, daytime).
The event lane's earlier four fixture shots changed source mid-capture and are
provisional, not a stable native pass.

The [Skylines study](../../citisten-skylines-study.md) owns research and the
bounded diagnosis/milestone/recovery contract, implemented in `579d089` with
regressions in `b7ee9ab`. Named population milestones grant
$750/$1,000/$1,250/$1,500/$2,000 at 500/1,000/1,500/2,000/2,500 residents, once
each; their high-water index survives save/load. Growth diagnosis is simulation
state displayed by the UI, not a new eligibility formula.

When defense loses the hall, its zero-HP object remains selectable. Enemies and
defenders clear without victory credit; a 120-simulation-second daytime grace
allows Repair on the hall for $240. Repair restores the hall and a fresh day;
expiry loses the game. Mode switching and Skip to Night cannot bypass recovery.
The countdown, diagnosis and next milestone are included in snapshots.

### Solid outskirts and camera clearance

`terrain.mjs` adds a deterministic solid-slab landscape outside the buildable
square: gentle edge shelves, taller distant hills, an eastern waterfront basin
using the existing water, clustered box trees and slope boulders. Grass/rock
colors are discrete solid bands. Playable lots remain level, preserving existing
road/building foundations; natural structures occupy edges, not player lots.

Reality check: this game's prior ground was a shallow plane and its free camera
had no floor callback or fall-through suite. The new shared slab/feature data
owns both rendering and `floorHeight`; the camera sweeps radius-aware probes and
clamps snapped, target and smoothed poses above the same solid boxes. It flies
over obstructions rather than providing a walking/physics character controller.
`terrain-check.mjs` covers solid tree/boulder edges, snap, smoothing, narrow-box
sweeps and deterministic generation; `world-check.mjs` retains existing checks.

Current `terrain-check.mjs` independently reports 9,409 height samples,
11,232 surface + 1,248 skirt + 10,296 instanced-feature triangles. Including the
flat city's two triangles, the budget is **22,778/25,000 triangles**, with **256
features and five landscape draws** (one surface, four instanced families).
The supplied city ground retains one material group, so ground plus landscape
needs six draws. This supersedes the obsolete 624-slab/108-box, 7,538-triangle,
one-landscape-draw budget. No per-feature draw calls, animated foliage, extra
assets or remote loads. These are geometry/draw bounds, not FPS/GPU acceptance.

## State and persistence

Simulation owns authoritative state. Native integration keeps stable model
handles, converts grid positions with `roads.center`, drains events once and
recreates simulation state on restart and Continue. `persistence.mjs` stores a
version-1 JSON snapshot at `citisten-save-v1` in localStorage: complete published
state (buildings, budget, population-derived values, mode, speed, waves, civic
and recovery state), ordered road cells, RNG seeds, IDs, fixed-step/economy/
traffic clocks, notice queue and milestone/warning high-water flags. No images
or rendered models are saved. The saved menu/tutorial speed is the player's
selected speed, not the temporary pause.

Autosave runs after about 60 simulation seconds, not wall-clock seconds. Menu
contains Save, Continue from the last valid save, Restart and existing Resume.
On startup a valid saved town offers Continue; it is not silently loaded.
Unavailable/quota-blocked storage or corrupt/unsupported data produces a status
message without preventing a new town. `sim-snapshot.mjs` validates untrusted
JSON before touching renderer roads; loading reconstructs cells/hall references
and invalidates the road renderer even if the saved version matches its cache.
The native entry accepts only its own grid size. Saving again replaces the
single local slot; there is no cloud sync/export/history.

Defense's Skip to Night button beside Speed, or S while the action is enabled,
runs the normal deterministic fixed steps through the nightfall-warning point
(60 seconds before combat), including economy, traffic and civic events. It is
disabled at the warning, at night and while rebuilding. S otherwise remains
camera-back; the touch camera pad always provides Back. It does not skip
straight into combat. [Save/terrain verification](../../citisten-save-terrain.md)
separates headless continuity checks, staged landscape photos and native inputs.

## Dependencies and provenance

Three.js 0.186.0 remains local with its MIT notice. Existing repository r160
GLTFLoader/BufferGeometryUtils addons retain their notices; current static
model captures exercise this combination, not every glTF feature or gameplay. Operator supplied 17 models plus a terrain set,
claiming original artwork generated by dot. This is supplier provenance, not
independent authorship verification. Intake `bed7dd5` preserved 138 files and
52 GLBs byte-for-byte; canonical hashes were independently checked before
removing `external-art/`. No Blender/bpy or runtime third-party requests added.

## Audit findings

Standalone door AddOn is absent; embedded town-hall door remains at rest.
Terrain has base/normal/packed roughness maps but no delivered AO; existing
analytic ground AO is retained, not represented as supplied baked AO. See
`../audits/citisten-external/intake.json` for 31 metadata discrepancies.
Session LOD defaults to 0, with explicit 1/2 choices; no hidden procedural LOD.
Actual movement drives humanoid walk clips and car wheel roll.

The 40 FPS gate is HOLD: no fresh external-model FPS acceptance exists.
The old 2.257124 FPS measurement predates these assets. The current memory
fixture below is not an FPS measurement. Static per-model AFTER QA is historical
and predates the new renderer hashes; native acceptance and the full-fleet
pre-push gate remain held.

### Independent QA runtime corrections (2026-10-24)

Read-only Paseo QA `8db46a87` found 15/17 supplied models reachable through
native gameplay, absent walker headings, and an 18x15m hall occupying one 10m
lot. This bounded follow-up changes only this game and this manual:

- `footprints.mjs` reserves every lot touched by conservative supplied-model
  X/Z envelopes. The true-scale, centered hall now owns a **3x3 lot reservation**;
  other native buildings fit one lot. This deliberately leaves clearance around
  the hall rather than shrinking its art or moving its center. Placement, atomic
  native road drags, picking for repair/bulldoze, siege occupancy and restored
  occupancy use the same footprint. Utilities reach its outside boundary, not
  only its center. Real LOD0/1/2 mesh bounds are checked against reserved lots.
- Zombies and moving defenders compute heading from their actual movement,
  matching the renderer's local -Z forward axis. Stationary agents retain their
  last heading. Cardinal direction regressions exercise both simulation and
  model synchronization.
- Existing road traffic includes police/fire/power/water endpoints. Trips with
  a police endpoint use `patrol_car`; other service trips use `utility_car`;
  ordinary trips retain the compact `car`. These are routine traffic variants,
  not emergency dispatch, firefighting or new service effects. They share the
  existing 80-car cap, lane occupancy, parking, stable handles and wheel animation.
  A naturally growing headless town spawns all three variants. Source/headless
  reachability now covers 17/17 models, not fresh native visual acceptance.
- Version-1 saves retain optional headings/vehicle variants and validate them.
  Old saves without these fields remain supported **if their layout fits**.
  Saves with roads/buildings inside the enlarged hall reservation are rejected
  before changing renderer roads; no silent demolition or migration is attempted.
  The stored slot is not rewritten by rejection. Legacy-layout migration remains
  unimplemented; starting/saving a new town can still replace the single slot.

Terrain is **not fixed by this follow-up**. `createPlayableGroundGeometry()` now
supplies the actual world geometry to the material regression: two grass
triangles, zero soil, zero shoreline, one ground draw group. The latter two
supplied materials are loaded/cloned but never drawn on this flat playable
plane. Outskirts use separate landscape materials, not those supplied soil/
shoreline maps. The historical depressed fixture still tests all three material
buckets, but no longer stands in for current world material use.

Remaining gaps: no footprint preview/outline, no imported-building camera
collision, no door animation/standalone door AddOn, no soil/shoreline integration
or old-overlap save migration. Native-input, visual animation, 40 FPS, dense-town
memory and supported-GPU acceptance remain held. No model bytes changed, games
added, browser launch/install, full-fleet run or push.

Verification: `node --check` passed for all 10 touched/new modules. Nine targeted
Node suites passed: `runtime-gaps`, `native`, `sim`, `save`, `world`, `terrain`,
`external-materials`, `building-surfaces` (`*-check.mjs`), and
`node --experimental-vm-modules Games/Citisten3D/external-model-check.mjs`.
Actual receipts include `RUNTIME GAPS CHECK PASS`, `FLAT WORLD CHECK PASS`,
`SAVE CHECK PASS`, all strict civic/recovery assertions and all 17 real GLBs at
LOD0/1/2. Image decoding/HTTP are stubbed; these are not GPU results. Existing
fixtures were moved off hall-reserved lots, with utility connections to its
boundary; no assertion/filter was weakened. Scoped `git diff --check` passed.
Catalog validation passed **129 entries**, unique integer IDs, required schema
and Git-tracked URLs. Shared inventory is known stale (including this game's
historical unregistered entry); it is intentionally untouched by operator scope.
`python3 -B scripts/check_maintenance_docs.py` initially exited 1 with
`Commit inspected source changes before validating its inventory.` The final
post-commit result is reported separately; no coverage PASS is claimed here.

### Snapshot payload and frame-error corrections (C6, 2026-10-24)

`sim-snapshot.mjs` now rejects any nonzero building heading before the shared
RoadGrid is touched. Native has no building-rotation operation; its model sync
applied saved headings while footprint reservations remained axis-aligned.
Absent/zero building headings remain valid, as do finite moving-agent headings.
This prevents the reported rotated-commercial road intrusion without rotating
reservations, shrinking supplied art or adding a migration.

The pending-event boundary now validates native/UI consumer payloads, not just
type/time. The source trace covers all `sim.mjs` emit paths, `drainEvents`, native
shot playback into `world-effects.mjs`, UI message formatting and water-main
reaction IDs; preview/QA consumers use the same shot/civic shapes. Shot endpoints
must be finite coordinates in `[0, size)`, with a recognized source and historical
target ID. Civic records reuse active-record definition/title/description/duration,
scheduled ID/start tick and bounded-district validation. Queued starts are checked
at their emission tick, not for continued activity today; expired/repaired ends
need not remain in `state.cityEvents`, and historical shot targets need not remain
alive. End reasons are checked against timed expiry or water-main repair.
Other displayed numeric payloads and milestone definitions are checked as well;
UI eagerly formats its message table, so even optional numeric/name fields on
other notice types cannot carry coercion-crashing objects. Payloads unused by
runtime consumers are not reconstructed or tied to current entity existence.

`native-loop.mjs` clears the in-flight frame in `finally`. Update errors still
propagate unchanged, with no silent retry; a later input wake can schedule again.
The frame guard stays set during update so reentrant wakes cannot queue duplicates.

Verification: four touched modules passed `node --check`. Five targeted suites
passed: `save-check.mjs`, `native-check.mjs`, `sim-check.mjs`,
`runtime-gaps-check.mjs` and `terrain-check.mjs`. Actual receipts include
`SAVE PAYLOAD PASS`, `SAVE CHECK PASS`, `NATIVE LOOP PASS`,
`RUNTIME GAPS CHECK PASS`, all civic/skip/snapshot/milestone/diagnosis/recovery
assertions and the terrain counts above. New save regressions cover the three
missing shot/start/end payloads, malformed and boundary payloads, naturally
pending shots and all six civic starts plus expired/repaired ends, deterministic
continuation, absent/zero and moving headings. Every corruption asserts unchanged
RoadGrid set identity, cells, version and stored-slot bytes. Native regressions
cover throw-to-wake recovery and the existing one-frame/hidden/idle/effects paths.
Catalog validation passed 129 entries with unique integer IDs, required schema
and Git-tracked URLs. Scoped `git diff --check` passed. The maintenance checker
exited 1 with `Commit inspected source changes before validating its inventory.`;
shared inventory remains outside this lane's ownership and is not refreshed.
No real GLB rerun was needed: no footprint, model or renderer geometry changed.
No browser, screenshot, asset/install/build, full-fleet run, game addition or push.
Native-input, animation, 40 FPS, dense-town memory and supported-GPU gates remain
held; these text-only checks do not establish native/GPU acceptance.

## Safe iteration

Freeze source during browser captures; serialize shared Git and browser use.
Do not register a specimen in place of this native entry. Preserve source
hashes and imported materials/rig pivots. No new browser download or Blender.

## Verification

World, native-actions, external-model and external-material Node checks pass;
model checks stub HTTP/image decoding and are not GPU acceptance. Canonical
intake replay and smoke-selector regression pass. BEFORE capture recorded
34 JPEGs with zero errors/external requests and owned cleanup; three missing
standalone procedural predecessors are explicitly labelled proxies.

Corrected AFTER QA recorded 34 JPEGs for all 17 models in three separate
<=120-second slots: 12/12/10 photos, each exit 0, empty error/request arrays,
stable world-source hashes and verified cleanup/explicit releases. The earlier
29-shot timeout remains partial, not PASS. Seventeen four-view comparison
plates preserve actual model/scene views. Run `python3 -B
docs/citisten-design/check-external-photos.py` to replay coverage, dimensions,
current renderer hashes and actual LOD0/shadow triangle counts. This is static
API placement evidence, not native actions, browser animation or FPS proof.

Batch 65 targeted smoke passed against `ce1c541` in an explicitly released,
exclusive <=120-second slot: `SMOKE_PORT=8857 xvfb-run -a python3 -B
scripts/smoke_test_games.py --games 241`. Actual output: `ok CITISTEN
console_errors=0 failed_reqs=0`, `== 1/1 games pass ==`, exit 0. Strict preflight
found no Chromium roots/drivers/smoke processes; post-check confirmed none
remained and port 8857 was closed. The browser slot was explicitly released.
This is load-smoke evidence, not native-action or FPS acceptance.

Earlier attempts are rejected: zero-game selection during an external merge,
then interruption with foreign-browser contention. Both receipts are retained
under `../audits/citisten-external/ship/`; the accepted receipt is
`smoke-241-batch65.txt`. `--games 241` now selects IDs and rejects unknown
selectors; error/request filters are unchanged. Later native source fixes need
fresh acceptance. `93c104e` removes simulation time loss from render-delta
clamping, follows the light theme and registers cleanup before asset loading.
`2540b8c` puts native controls in normal HUD flow before toasts, replacing the
positioning observer after a partial screenshot exposed toast occlusion.
`14a19ab` supplies the actual-entry native/offline runner; `a8d17f5` splits it
into checkpointed city/shell suites. The combined run timed out (exit 124,
135.0507s); split CITY failed at a 15s navigation timeout (exit 1, 29.9496s),
before any gameplay assertion. Sources stayed unchanged; CITY cleanup passed.
SHELL and natural combat remain unrun. The server-only probe returned the entry
HTTP 200 in 0.0720s, not a native or offline pass. Results/source hashes are
retained under `../audits/citisten-QA/native/`; unrun/unreached gates stay separate. A targeted pass cannot replace full-fleet
`xvfb-run python3 scripts/smoke_test_games.py` before push.

### Current save/terrain native attempt

The [save/terrain receipt](../../citisten-save-terrain.md) records the combined
headless checks and the fresh exclusive native browser attempt. Save, terrain,
world, native-actions, external-material and full sim checks pass, including
warning-skip equivalence and recovery/milestone continuity. The browser runner
exited 1 after 46.415 seconds: navigation exceeded 20 seconds waiting for
`domcontentloaded`, before any native assertion or photo. **All four requested
native photos remain unproduced and unreviewed; native acceptance stays HOLD.**
Browser/server cleanup passed and the slot was explicitly released. Operator
subsequently authorized one retry using document `commit` plus an explicit
loaded wait up to 45 seconds; harness commit `a3ba48d` applies that guidance.
After operator disk recovery, the retry runner exited 1 at `Browser slot busy`
before creating any browser/server: foreign Chromium appeared between initial
preflight and launch. No foreign process was touched. A subsequent explicit
operator resume order allowed the actual retry after disk and slot preflight
were clear. That browser run exited 1 after 33.314 seconds: initial document
commit and `world.loaded` both passed, but the Zombie defense button click
timed out after 12 seconds while performing the action. No requested photo or
town-placement/save/load/skip assertion was reached; root cause is unproven.
Browser/server cleanup passed and a fresh process check found no Chromium.
The slot was released and the one actual retry is consumed; no further launch.
Native photos remain unproduced and acceptance stays HOLD; slot-coordination
ticket `pi-30350-1792754595538-286388b3` is pending. No push. Stable UI fixture
evidence from sibling lanes is separate from this native-world gate.

### Memory, stacking and render sleep (2026-10-24)

The [bounded receipt](../../citisten-budget.md) and retained JSON/JPEG evidence
record the current fixes and measurements. A deterministic 520-simulation-second
cycle rendered all 17 supplied model types, 128 additional homes and the real
simulation's first wave. Whole-browser observed peak summed RSS was
**1,556,541,440 -> 1,533,505,536 bytes**; proportional resident memory was
**1,132,929,024 -> 1,111,052,288 bytes**. Both samples were already below 2 GB;
these numbers do not establish every late-wave/dense-town case or a 4 GB hardware
pass. Heap is measured separately, not treated as total graphics/process memory.

Inactive sun/moon shadow targets are disposed and cleared at phase transitions,
retaining active 2048px shadows and mixed dawn/dusk. Night allocations now remain
at 68 textures instead of 70; geometry remains 247 throughout the fixture.
Completed GLTF parser references are released; unchanged instance poses no longer
rewrite upload buffers. Building geometry/material sharing and the 64-shot FX
pool already existed and are preserved. No texture compression, art edits or
new animation cap was justified by this first-cycle measurement. Native's existing
24 defenders plus 796 perimeter zombies bound walk actions to 820 at size 200;
the fixture observed 20, including its two extra walkers. The worst case is not
memory-certified by that observation.

The events board now explicitly paints above diagnosis, which paints above other
HUD/native controls. Existing urgent-last ordering is unchanged. Four reviewed
390x844/1440x900 light/dark JPEGs use actual native HTML/CSS with a labelled UI
state fixture, not native gameplay. Hit-testing, notice order and native modal
priority passed. Browser/server/profile were released after every capture run.

`native-loop.mjs` suspends all scheduled render/simulation callbacks while hidden,
wakes immediately without hidden-time catch-up, and sleeps after two unchanged
seconds at menu/pause/speed 0. Input, camera pose changes, resize and visibility
wake it; pending FX and camera easing settle first. Active simulation and active
pixel ratio are unchanged. Native assertions cover static skip, hidden startup,
visibility resume, pending shots and one-frame scheduling. Sim, native, world,
terrain, save and external model/material suites pass. The receipt records the
initial fixture hit-test correction separately from the accepted 4/4 run. No
native gameplay/FPS or full-fleet acceptance is claimed; no push.

## River and progression upgrade (isolated branch, 2026-10-24)

This ongoing source milestone supersedes the flat-playable-world limitation for
**new** towns, not the historical native/GPU evidence above. No push or publication.
[Dispatch](../../citisten-river-swarm-dispatch.md) records actual six-lane children,
exclusive files and handoffs; [fresh developer study](../../citisten-citybuilder-study.md)
separates fetched Cities: Skylines II, Timberborn and Anno evidence from inference.

- `river-data.mjs` is the single deterministic water/bank/height authority;
  `river-render.mjs` and `world.setTerrain` draw the interior channel with supplied
  grass/soil/shoreline/water materials. The size-200 river passes near the hall,
  with a dry starter footprint. Existing outskirts remain. Water normals scroll;
  there is no fluid, flood, dam, irrigation or river-depletion simulation.
- Native new-game options explicitly enable `river-v1`, timed construction and
  progression. Missing legacy terrain means `legacy-flat`, never a silent flood.
  Existing save-layout rejection for preexisting hall overlaps is unchanged.
- Bridge is a straight east-west dry-bank-to-dry-bank drag: $90 per water lot,
  $10 per dry approach, immediate atomic payment and RoadGrid mutation. Ordinary
  roads cannot enter water. Removing a deck or its immediate approach removes the
  wet span, invalidating the original vehicle/utility routes. Service radii remain
  abstract; this is not an emergency-response/commute simulation.
- `city-content.mjs` adds apartments (160 capacity), workshop (64 jobs and income),
  clinic (12-lot service/+30% safe growth), school (20-lot/+15%), solar (28 power)
  and river pump (65 water, dry bank only). The strongest growth bonus applies,
  never unlimited stacking. Supply is network-local. Solar is always-on abstract
  supply, not weather-dependent generation. [Economy details](../../citisten-river-buildings.md).
- `city-render.mjs` wraps the unchanged supplied kit with instanced authored
  distinguishing features, solar panels and three site stages. Reused art is not
  represented as newly supplied models. Model bytes/provenance remain unchanged.
- `progression.mjs` provides Settlement/Neighborhood/Town/Borough stages at
  0/12/60/150 residents plus functioning-home/jobs, surplus-utility and service
  requirements. Stages retain a monotonic high-water level and pay $300/$500/$750
  once. Essential original tools remain available; stage 1 unlocks apartments,
  workshop/solar and stage 2 clinic/school. The bank pump is available initially.
  Existing five larger population grants remain separate. The next requirements
  use the same pure helpers as simulation; the existing tutorial/events explain
  sites, crossings and rewards. [UI/mockup contract](../../citisten-progression-ui.md).
- Buildings charge once and reserve occupancy immediately, then take 3-18
  simulation seconds to complete. Three rendered stages and the compact HUD
  expose progress; no unfinished utility load/supply, jobs, housing, service,
  income/upkeep or defense output. Pause/speed/save retain exact remaining time.
  Cancelling an unfinished site refunds 75% of recorded payment once; completed
  demolition/destruction refunds nothing. Hall, roads and bridges are immediate.
  [Construction/save contract](../../citisten-construction.md) records strict
  validation and complete legacy migration. Saved new-game flags override callers.
- Enemy perimeter spawns must have finite hall-field reachability, avoiding an
  endless unbridged-bank wave. Both enemy and defender movement excludes water
  unless a road deck exists; blocked defenders reuse RoadGrid routes. Demolishing
  a deck rehomes stranded ephemeral walkers to free dry lots, without score/kills,
  never moving buildings/population. This is not a new citizen commute simulator.
- Native phone tool options collapse after selection to recover canvas space;
  the group button reopens them. Desktop behavior is retained. Minimap water is
  cached from authoritative terrain rather than repeatedly scanning all 40,000 lots.
- Combined headless checks and fresh native verification are recorded in the
  [delivery receipt](../../citisten-river-upgrade-delivery.md), including actual
  source commits, command outputs, native outcomes and screenshot review.
  Historical native-input, 40 FPS, dense-town memory and supported-GPU holds are
  not lifted by source tests. Final combined gates passed 15/15 Node suites,
  syntax for 20 changed/new modules and Python runner syntax. Independent cases
  passed 7/7; catalog/model/vendor preservation passed. Inventory was refreshed
  for this game only (226 files, 35,156,794 bytes, tree `9843521c` after the
  proven notice/builder stacking fix; prior freezes preserved); coverage still
  fails solely on the preexisting missing `001-brainrotboulevard.md` manual.

Initial delivery native acceptance was **HOLD (0/3 cases)**. Desktop mouse and mobile
actual touch started Free build with all production flags, but the runner's
native speed-selector input stayed at 1x instead of pause. No placement, bridge,
construction, natural progression or mid-build save/reload assertion was reached.
No hidden start error, console error or external request was recorded in these
start cases. Original baseline attempts also failed; no BEFORE/AFTER city panorama
exists. One reviewed actual mobile diagnostic JPEG shows the river/bank/hall and
readable HUD, not a built city or acceptance. The receipt records all attempts,
unchanged runtime hashes, cleanup and the 22:16 UTC slot release. Unresolved
Hermes ticket `pi-34159-1792879800712-67019430` timed out. A fresh coordinated
native-select diagnosis and then real gameplay/captures are needed. Original
sparse selection was restored; no game added, full-fleet gate, push or merge.

The explicit resume ran fresh desktop then mobile only, with **0/2 complete
case passes**; no baseline retry or new photo. Harness `fad95a1b` waits for
observable tutorial resume before real Tab/Arrow speed input. Mobile then
successfully selected Paused in both DOM and simulation, but stopped because
no full unobscured crossing was visible from the starting camera. Desktop did
not reach its tutorial-resume/focus barrier within the bounded wait. No road,
bridge, building, progression or reload assertion was reached; acceptance stays
HOLD. Normal camera navigation and desktop resume timing diagnosis are next,
not forced poses or relaxed assertions. QA receipt `a3e89cd7` retains all errors,
HTTP probes/server logs, traces and the original desktop cleanup failure plus
its verified follow-up. Final browser/server/profile cleanup and all 185 original
runtime/asset/font hashes pass; slot released at 22:37 UTC. Runtime remains frozen,
original sparse selection restored, no push. New timed-out Hermes tickets
`pi-21552-1792881387260-11f48ae8` and `pi-56825-1792881456111-ad7c4cc3` initially
timed out but are now answered as **handoff guidance only**. No further browser
launch, harness/runtime edit or gate change followed. The QA receipt documents
frozen close/resume ordering and a single proposed bounded native-state/camera-pad
follow-up requiring separate authorization. Desktop timing remains inconclusive;
native acceptance stays HOLD. See the delivery's latest handoff, not only its
initial run.

### Operator corrective cycle: implemented, native finish blocked

The later explicit GO superseded earlier no-browser/frozen limits. Product
`e9577aa6` makes tutorial Close/Finish/Escape synchronous and idempotent, protects
menu replay/selected speed/stale close/destroy, and collapses selected tool options
on desktop as well as mobile. `a7b63238` adds terrain/viewport/FOV-derived
`camera.mjs:initialTownPose`, called by native start/Continue. No saved gameplay,
model bytes, LOD, pixel ratio or physics/utility rules changed. Read
[UI correction](../../citisten-tutorial-correction.md) and
[camera correction](../../citisten-camera-correction.md) before editing these paths.

New immutable runtime freeze `a7b63238`, 185 hashes, is retained separately from
all earlier freezes/failures. Corrective checks pass 17/17 Node suites and six JS
syntax checks, with actual UI handlers under a DOM double and 756 real Three
camera projections. They are not visual/performance acceptance.

Actual desktop native input passed Close/Finish/Escape replay and restored 3x,
ordinary water-road rejection, a nine-lot/$570 bridge, all five connected
west-water/east-home/jobs/power/park timed sites and paused-state continuity.
Full native acceptance remains HOLD (0/2 cases, four corrective attempts): locator
RPC failures were corrected in the harness, then screenshot timed out after 5s;
the later 15s hypothesis was not reached before external interruption. No new
JPEG, activation/population, stage/apartment or mid-build reload proof exists.
The final kill/cleanup overran its cap and is retained as an incomplete original
receipt plus verified cleanup supplement, not a rewritten pass.

Browser/server FIRST slot explicitly released 01:03:49 UTC to Foldwild SECOND,
Jank THIRD and Wings FOURTH. No foreign processes touched or new Citisten browser.
QA-only `9cbe858f`/`b3e2e614` adds a normal-input render wake, strict paused-state
checks and capture-error collection: later gameplay checks may run, but missing
previews/errors still force FAIL; fatal action timeout makes no further driver
RPC. This is browser-unverified. See [capture correction](../../citisten-capture-correction.md),
[actual corrective QA](../../citisten-river-fixfinish-qa.md) and delivery's latest
section. Tickets `pi-118102-1792889915187-194a5a07` (locator) and
`pi-21552-1792890346026-e83df6cc` (capture/idle-loop) are now answered after initial
advice timeouts. Harness-only `ca4ca8e6` implements one read-only target snapshot
(style/rect/document visibility), a single bounded 5s/two-rAF readiness probe
before capture, and distinct readiness failures retained through the strict final
capture gate. Pending callbacks are cancelled; fatal action timeout causes no
subsequent diagnostic state RPC. The existing real input and all acceptance/error
filters stay intact. Production helper/JavaScript double tests pass; this is not
GPU/compositor or native proof. No browser/server, runtime edit or new image was
made for that follow-up. Requested previews/natural activation/progression/reload
remain blocked, not replaced by fixtures. No new game, full-fleet release, push
or merge.

### Executed follow-up acceptance (latest)

New operator GO ran two desktop and one touch-mobile case with ca4 capture
corrections; [actual receipt `61ffcf4f`](../../citisten-gameplay-followup.md)
retains all failures. Desktop twice proved the bridge, five supplied completed
sites, natural population 64/stage1, unlocked apartments and exact mid-build
Menu Save/reload/Continue at 9.75s and 9s, including paused continuity. These
previously unreached gameplay checks now have native evidence, not just fixtures.

Native completion/visual acceptance remains HOLD (0/2 layouts): after Continue,
selected/simulation speed 10 but time 394.75/apartment 9s did not advance in the
bounded completion wait. Normal Tab commit/blur `f40362a8` leaves Repair focused
and preserves selected speed; it enabled two-rAF readiness in 1809.4ms, but the
single JPEG still timed out at 15000ms after fonts loaded. This is unresolved
native frame/compositor progress, not a proven construction bug. Mobile reached
its $570/nine-lot bridge, then the 240s action budget expired. No new JPEG exists.
All failed-request/external/runtime filters and final capture gates remain.

All three graceful-close failures are retained, with independent own-only cleanup
supplements confirming closed browser/ports and absent profiles. First slot was
explicitly RELEASED directly to Jank at 04:33:18 UTC, Wings after Jank, before the
worker cap. No Foldwild re-test or further Citisten browser after release.
Runtime stayed frozen; only QA protocol/tests changed, no save or asset changes.
Python selftests and independent 7/7 integration pass; 185 hashes, 44 baseline
files and 27 prior evidence files are unchanged. Source inventory refreshed; original
sparse selection restored. Technical ticket `pi-238612-1792902837104-4b1155c2`
was answered with source-diagnosis guidance, not a proven GPU cause or launch
permission; the following source-only cycle implements that guidance. No blind
repeat, weakened gate, added game, full-fleet run or push.

### Continue/RAF diagnosis: executable, browser-free

One sol worker `fd36c21e` (12-minute cap), commit `b7258052`, added
`continue-loop-check.mjs` and isolated `scripts/citisten_loop_diagnostic.py`.
[Source trace and exact commands](../../citisten-continue-loop-diagnosis.md).
Actual native/UI/loop/sim/save modules execute under fake DOM/world/RAF: speed-0
Save, pagehide, fresh-VM bootstrap, Continue, private pause=false, restored-sim
ownership and stopped predecessor all pass. The first callback after idle has
`dt=0`, even if delivered five wall seconds late; a second callback 0.9s later
completes the 9s site at 10x. Full simulation delta is not render-clamped; a 5s
interval supplies 50 simulation seconds while render/light deltas cap at 0.25.
This demonstrates no product defect and does not prove GPU starvation.

The bounded observational harness installs source-verified read-only CDP
logpoints on actual native RAF/tick/start/render boundaries, recording private
pause/speed/closed, visibility, frame/last/busy, timestamps and simulation tick/
time/remaining values. No setters, independent RAF, actions, screenshots or
launch code. FakeCDP tests pass; actual V8/CDP hook execution remains unverified.
Next measurement is positive start/ownership baseline followed by native callback
count/dt and private gates in the existing 5s completion window: distinguish zero
callbacks, only initial dt0, paused/hidden callbacks, or update/render entry with
no exit. Existing acceptance assertions stay unchanged. No browser/server,
cleanup, relay, installs or push this cycle; all 185 frozen hashes and failed
receipts preserved. No runtime edit, so no new runtime freeze was needed.

### Measured Continue integration: executable, slot-blocked

Sole sol child `f16c8a30-30a9-4ef5-b428-906e7a9bde81`, twelve-minute cap,
finished at 05:21:50 before 05:24:17 UTC; code `d8e70704` integrates opt-in
`--measure-continue` into the existing sync runner, not an alternative input path.
[Exact ready command and tests](../../citisten-loop-measurement-integration.md).
Dedicated read-only CDP observation brackets ordinary Continue and its unchanged
500ms paused comparison/5s completion window. Typed positive start, tick and RAF
baselines are mandatory; owner=false/paused=true remain valid observed values.
Raw diagnostic/Continue/full acceptance outcomes and cleanup are separate.
Production-path integration, async compatibility, runner selftest, actual-module
Continue regression, syntax/catalog/diff checks pass. No native measurement or
new previews: Jank's explicit reservation remains binding, Wings follows Jank;
no release/clearance arrived and process absence was not treated as permission.
No browser/server, slot polling, acknowledgement relay or runtime change occurred.
All 185 frozen hashes and 45 earlier evidence files verify unchanged. New raw
`desktop-followup1-loopmeasure1-{loop-diagnostic,results}.json` paths are planned,
not produced. Preserve the original gates; measure once only after explicit
release/current-owner clearance, floor/process preflight and narrow frozen-font
restoration. Existing gameplay/completion/previews remain OPEN/HOLD; no push.

### Actual loopmeasure1 desktop attempt: latest

Explicit operator reservation transfer authorized one desktop attempt; sole sol
worker `cd2a6837` ran it once, receipts `db07710b`/`ddc36324`.
[Exact execution, raw data and release](../../citisten-native-loopmeasure1.md).
Exit 1 after 130.407s: acceptance failed before Save/Continue, diagnostic
`invalid-not-reached`, empty records/markers and no typed native baselines.
The strict midpoint assertion at `river-upgrade-qa.py:845` saw remaining 0/12s:
normal speed-1 and speed-0 commits were 13.111s apart. Partial observation had
succeeded, but its exact sample was not retained. Review existing wait/state RPC
and normal pause traversal timing before changing anything; no GPU/Continue
fault is established. No native callback/delta/private-state measurement exists.
Construction readiness also failed; no new JPEG. One attempt, no replay/fix.
Graceful owned cleanup and independent port/profile checks passed; original
sparse selection restored, 185 hashes/44 baseline/45 prior files preserved.
Actual release directly to Jank once at 07:07 UTC; Wings EXCLUDED. No runtime,
harness, source inventory or freeze change, no push. Native completion/valid
Continue measurement and requested previews remain OPEN/HOLD.

### Midpoint timing instrumentation: browser-free F17

One sol child `49ee9c8b`, ten-minute cap, code `48c2f126` and receipt `f1409e5e`;
[exact source/tests/handoff](../../citisten-midpoint-timing.md). The existing
successful partial STATE sample is detached and persisted before ordinary pause,
with host/simulation time and remaining. Bounded host entry/exit spans cover the
same wait/predicate/state RPCs, ownership checks and individual key/observation
calls; no added browser roundtrip, altered key, budget, polling or assertion.
Production regression keeps partial10 -> paused0 failing with the original bare
AssertionError and partial10 -> paused9 succeeding unchanged. Exactly 5 STATE +
8 INPUT reads and old 3/5/3 waits are retained. Diagnostic IO/clock/serialization
errors cannot mask success/primary failure; fatal no-RPC behavior is preserved.
All five regression commands, syntax/protocol AST/preservation/catalog checks
pass; maintenance coverage still lacks the Brainrot manual. Runtime185 and failed
raw evidence unchanged, no new freeze or native measurement. Jank's reservation
was not contacted or polled. No browser/server/replay/runtime patch or push.
Any next browser attempt requires reviewed evidence first; acceptance stays OPEN.

### Actual midpointmeasure1: latest native attempt

Operator-authorized sole reservation, one sol worker `f9ce0c4c`, receipt
`3071e8bb`: [exact raw outcome](../../citisten-native-midpointmeasure1.md).
Exactly one desktop run, exit 1/189.524s, no successful partial, speed0 or
Save/Continue. All 165 host spans completed without overflow/evidence errors.
After-Arrow INPUT evaluate took 18.362s inside speed1's 19.133s; partial wait
elapsed 13.302s against its unchanged 5s budget, including an 8.728s STATE RPC.
The last apartment was complete at speed1, time572.75. Existing deadline checking
cannot interrupt a blocking predicate; no budget/condition was changed to pass.
Private-loop baselines are absent, diagnostic invalid/not-reached: not a measured
zero-RAF trace or GPU/product fault. No new JPEG; capture readiness also failed.
Graceful owned browser/server/profile cleanup, original sparse3 and preservation
passed; parent-only slot release at07:48, Jank HELD browser-free/Wings EXCLUDED.
No source/harness/runtime change, new freeze or retry. Next source review is the
existing observe/evaluate dispatch/return path, distinguishing browser task queue,
transport and JS work without guessing. Acceptance and previews remain OPEN/HOLD.

### F19 source audit and finite RPC timing candidate

One sol child `29650267`, eight-minute cap, code `bd74c946`:
[installed-source references and executable checks](../../citisten-rpc-audit.md).
INPUT performs bounded DOM/option reads; STATE copies seven buildings/thirteen
roads without calling simulation, pathfinding or rendering. Native DOM costs
remain opaque. Actual Playwright1.62.0 Python/compiled Node dispatch and recursive
serialization are traced with installed package-relative references. Current host
spans do not attribute their unmeasured costs; no runtime correction is justified.

Opt-in `--measure-rpc-clock` wraps the existing same evaluate call only at midpoint.
Original value/throw is preserved; browser-own entry/exit/duration are stored
separately, never subtracted from host timestamps. Default behavior, INPUT/STATE
bodies, key sequence, waits and strict gates remain unchanged. Actual-JS stub
regression passes 300 equivalence/fault-clock cases; Python tests preserve one RPC,
original errors and success9/failure0. All five prior checks also pass. These are
NOT backend performance results. Long measured expression interval directs review
inside that interval; short interval with long host RPC directs review outside
it, including serialization/dispatch, not a proven queue or GPU cause.
STOP automatic retries: no third attempt authorized, no browser/server/contact,
new preview, runtime patch or push. Frozen185 and old raw evidence unchanged.
Slot unreserved, Jank held/Wings excluded; native acceptance remains OPEN/HOLD.

### F20 actual RPC clocks; F21 cleanup IO correction

The new operator cycle superseded earlier no-browser holds for one bounded run.
Sol child `970d46d9`, [actual receipt `09a9bc9c`](../../citisten-native-rpcmeasure1.md),
ran desktop `rpcmeasure1` once. Real partial10.25 and Menu Save/reload/Continue
paused equality passed at simulation335. All31 browser expression clocks valid,
0–1.7ms; corresponding host RPCs were at most154.334ms. Earlier multi-second
stalls did not recur and cannot be explained retroactively. Completion still
failed after5.0488s; only2/7 native probe baselines were established, so no
zero-callback/GPU/product conclusion or game patch is justified. No new JPEG.
Original cleanup alarm in baseline Git reads is preserved; independent owned
cleanup/sparse3/hash185/baseline44/prior105 preservation passed. Actual release
to Jank once09:21:02 UTC; Wings excluded. No unchanged replay.

Concrete harness correction: sol `e71e0b0b`, `b9bc48ba`/`e9486023`,
[regression and host timings](../../citisten-baseline-verification.md), batches44
Git reads into one while retaining every individual byte/symlink check and all
25/12/3 cleanup alarms. Binary framing, missing/type/size/truncation/trailing and
per-file corruption regressions plus six existing checks pass. This reduces
verification work, not proof that real teardown or native completion is fixed;
no browser was rerun for it. Runtime185/old raw files unchanged, no new freeze.
Callback/probe validity remains blocked under pending technical ticket
`pi-21552-1792920462427-fecb046f` (not permission). No speculative runtime fix,
state grants, preview substitution, push or full-fleet release. Acceptance OPEN.

### F22: actual V8 probe validity and passive pause classification

Standing continuation executed concrete browser-free verification, one sol child
`d17c1b87`, commit `9d9a0f05`:
[exact output/limits](../../citisten-probe-validity.md). Internal Node inspector
loads the production plan and actual native-loop source; all five exact conditions
produce typed wake7/suspend3/RAF-entry8/dt7/after-update7 records with zero pauses.
This proves those conditions work in the Node fixture, not Chrome callback
availability or a product defect; native.mjs probes are not executed by that test.
Sync observation now retains bounded passive Debugger.paused reason/locations,
never resumes/evaluates; a pause invalidates data even with all seven baselines.
Original errors, fatal cleanup and own-listener isolation remain covered. All
8 offline commands pass; runtime185 and prior114 evidence files are unchanged.
No browser/source-runtime change or native acceptance claim, no push. Jank remains
reservation owner and RUNNING at the last check; no message was sent. 40-hero
intake is Jank-owned, deferred until its safe idle checkpoint. Native OPEN/HOLD.

### F23: all ten native condition scopes verified in V8

Sol child `bd180157`, commit `4a5630c0`:
[actual source/probe results](../../citisten-native-probe-validity.md). The existing
Continue scenario is reused with optional test-only mount/debug hooks; its 60
original assertions remain identical. Actual inspector checks all ten production
conditions in both original and fresh VM contexts: 20 source-verified breakpoints,
181 typed Runtime records, zero pauses. Fresh saved speed0 rebind, private pause,
owner and tick-before/after fields execute and complete the 9s site at10x.
Nine offline commands pass. This is NOT Chrome/performance/native acceptance;
fake DOM/world/RAF and known in-memory inspect export remain explicit limits.
No production condition, gameplay/runtime/freeze change, new browser or push.
Jank still RUNNING at10:25:39, no peer message;40-hero intake/handoff is deferred
until its safe idle checkpoint. Native acceptance remains OPEN/HOLD.

### F24: failure-inspection errors no longer delete the observer

One sol child `26896ca6`, two-name fix `d4e90b28`, receipt `ba817bc1`, scoped
regression `ae39f9e5`: [actual handler AST proof](../../citisten-failure-diagnostic.md).
Python deleted the outer observer after `except Exception as diagnostic`; a
secondary failure-UI/input-read error could make cleanup references unbound.
Only that exception alias and its string use are renamed. Actual old code
reproduces four UnboundLocalError cases; ten fixed cases preserve observer/None,
primary report data/checkpoints and no inspection RPC after timeout/fatal guards.
Ten offline commands pass. No proof this caused F20, native completion or teardown;
no game/runtime/window/input/probe changes. Runtime185 and failed evidence remain
unchanged, no new freeze or browser. Jank still RUNNING10:43:08: no message,
40-hero intake or reservation takeover. Acceptance OPEN/HOLD, no push.

### F25: interrupted cleanup now retains a failed receipt

Code `13bc1731`, follow-up `13614e0d`:
[actual production cleanup AST proof](../../citisten-cleanup-receipt.md).
The old baseline TimeoutError skipped final fields/disarm. The new outer guard
retains gameplay failure and cleanup cause, rethrows the SAME error, initializes
unreached checks to null, and keeps known flags. Sink/metadata/disarm errors cannot
mask the primary abort. Existing25/12/7/3 limits/controller/PID policy/success
predicate and F24 handler are AST-identical. After terminal disarm only best-effort
host receipt persistence runs, still requiring the existing external300 bound;
this is not cleanup performance or real teardown acceptance. Internal diagnostic
strings copy AS RECORDED, not as acceptance authority. Eleven offline commands
pass, including22 abort cases. No runtime/input/probe/capture change or native
replay; runtime185/old failed evidence unchanged. Real teardown/native completion/
previews remain OPEN/HOLD. Jank still RUNNING11:01:59, no contact/intake/slot use.
An unnecessary nested sol worker aborted143; the child announced local completion
and committed. Actual process provenance is preserved in the linked receipt and
dispatch; no second worker. No games added or push.

### F27: operator-resumed actual desktop/mobile acceptance, 2026-10-26

[Actual finite cycle and raw evidence](../../citisten-native-resume-20261026.md),
commit`194c4d94`: stale overnight reservation resolved from real process scans,
not running-agent labels. Exactly one case per viewport; **0/2 accepted**.
Desktop proved natural64/stage1/unlock and exact8.25s paused Save/reload/Continue
including500ms equality; resumed completion failed after original5.068s window.
Construction photo's own two-rAF readiness counted0 callbacks over5s, no JPEG.
Native diagnostic invalid2/7 with0 passive pauses: no valid zero-native-callback
or GPU/product cause claim. Mobile natural64/stage1, apartment remaining10.5s,
then240s action timeout before Save. Original12s graceful-close error retained;
owned fallback/ports/profiles verified closed. No new screenshots, retries, source
or diagnostic changes; not complete city previews or hardware acceptance.
Sparse3/runtime185/baseline44/prior126 unchanged. Actual closure and empty parent
01:20:14 process scan support durable reservation RELEASED. No Jank/Wings contact
or interruption, no40-hero/shared-runtime work, no games/push. Native completion,
valid Chrome measurement and real previews remain HOLD. A fresh environment with
working ordinary callback/capture delivery is the next discriminator, not an
unproven game-loop rewrite or unchanged failing retry.

### Economy expansion foundation (2026-10-26)

Explicit [new operator brief](../../citisten-economy-events-expansion-brief.md)
supersedes the old runtime freeze for new implementation, not old acceptance
history. [Current delivery](../../citisten-economy-events-delivery.md) records
ownership and gates. HUD resident/capacity/supplied-job separation and visible
morale are implemented. Authoritative economy now derives aggregate values from
active buildings and applies bounded home morale to growth and unsafe-home loss;
neutral safe conditions retain the old growth rate. Park/clinic/school amenities
add0.12 morale and a capped growth effect; after festival expiry a supplied park
now retains0.62 morale (the old exact0.5 assertion was updated for this authorized
mechanic, not removed). Paused clocks and old saves remain supported.
Wall topology derives all16 cardinal masks on sync; explicit wallRotation0..3
is validated/saved, Rotate wall tool/R selects completed walls. Construction,
neighbor removal and reload invalidate derived joins. Actual supplied bounds and
geometry/cache tests pass, but unused main-axis corner stubs and real placement
previews remain an explicit unfinished visual gate. No new visual acceptance.
That foundation checkpoint is historical. The subsequent integrated layer below
supersedes its unfinished code status, not its unverified visual acceptance.
No asset provenance change, games added, installs or push; prior failed evidence
and immutable manifests preserved. Original native/capture/hardware holds remain.

### Integrated economy, development and spatial events

The [expansion delivery](../../citisten-economy-events-delivery.md) records actual
nine child-lane logs/commits and parent integration. Native new towns now enable
five paid/timed research choices, two building-upgrade levels and food/materials/
finished-goods production. Agronomy/Fabrication are exclusive; Logistics/Education
cross branches. Upgrades raise output/utility load/maintenance, without free HP
or flat income. Powered/watered workers, hall-connected roads, stock/input limits,
export demand and upkeep-reserved imports constrain actual money. The economy
panel separates tax/services/exports/imports/upkeep/net, stocks and bottlenecks.
Old unflagged saves migrate only when native requests expansion; explicit saved
flags/options win. Deliberate new-game seed/scenario selection varies resources
and incidents, Continue never resets them. Timers pause and survive save/load.

Fire/outage/flood records target actual buildings/tiles, cause health/utility/
production/housing effects and expire finitely. Supplied fire stations accelerate
recovery; paid90/70/110 responses resolve hazards. Shared instanced fire/smoke,
flood tiles, festival flags and per-instance diffuse/emissive outage tint consume
authoritative state and simulation time. Effect lifecycle clears on resolution,
new/load and disposal. Connected supplied-art wall segments now omit unused arms.
CPU geometry/resource checks are not visual/GPU/FPS acceptance.

Parent fresh17/17 suites pass; integrated14/14 includes paid natural progression,
midwork pause/reload, deterministic replay, actual incidents/health/response,
20 corruptions before road mutation, and a rounding-ledger regression. Three
measured eight-home strategies cover upkeep/imports, with distinct pollution/
food/morale tradeoffs; small industry-heavy layouts can lose money. This is not
universal balance, all-seed or defense acceptance. Old exact morale expectations
were updated for new bounded behavior; festival still adds its advertised20points.
Prior raw failures/manifests remain unchanged. New implementation needs its own
headed capture evidence for HUD, wall corners, burning and extinguished state;
those visual gates are not yet passed. No new game, remote asset, install or push.
Two actual headed attempts now remain failed in the
[expansion native receipt](../../citisten-expansion-native-acceptance.md): initial
locator input timeout; changed main-world physical-input route passed seed/start/
tutorial/pause then stopped at visible Water tool hit=false, with covering element
unknown. A MeshDepthMaterial validation error with empty program log also remains
an original strict failure. No shader/GPU/callback cause established. No further
visual task after two failures,0/5 new images; technical ticket
`pi-340949-1792987949165-696c5e67` subsequently answered with read-only diagnostic
requirement and no source cause established. Own cleanup/source/evidence/sparse restored;
parent04:13:17 actual process scan empty, reservation RELEASED. New231-file phase
manifest is separate from historical freezes. Exact initial sparse-byte proof is
unavailable for the first attempt, but backed-up exact bytes verified on follow-up.

### Earlier read-only display prerequisite (launch route later corrected)

Separately authorized [read-only diagnostic](../../citisten-readonly-diagnostic.md),
`b44fd174`, did not run a third acceptance cycle. A visible/focused empty page on
headed Chromium149/Playwright1.62 and Xvfb`:99` counted0 ordinary rAF callbacks in
5003.8ms, so stopped BEFORE Citisten navigation. Water stack/live shader queries
remain uncollected; no product/GPU cause or source fix proven. Own resources
closed in2.710s,231 hashes/160 prior artifacts and exact config/sparse preserved;
reservation released, no Wings/Jank interruption. At that checkpoint the request was:
provide/establish a working callback-delivering display before authorizing the
remaining read-only observations. Do not repeat the failed environment or bypass
input/render checks. Source17-suite/14-group evidence remains distinct from these
unmet visual/native gates. No source or rendering settings changed in diagnosis.

### Proven toast interception and limited retest

The later environment handoff identified a measured software-compositor launch
route while retaining SwiftShader WebGL. [Read-only Water/GL results](../../citisten-readonly-water-shader-result.md)
then reproduced the exact Water center covered by a `Placed` notification,
toasts z3 above builderz1. No modal/clipping cause was inferred. GL queries found
a lost context and unavailable live logs/status/sources; completed RPCs are not
shader validity. Old shader failure and native holds remain, no renderer fix.

Narrow product fix`7217b5cf` raises builder toz4, preserving notices/civic actions.
[Actual DOM-only red/green regression](../../citisten-toast-layer-fix.md) verified
desktop ordinary Water click after the fix; phone controls, persistent notices,
repair callback and keyboard focus passed. One initial fixture tutorial assumption
failed and is preserved; corrected setup passed. No native acceptance, screenshots
or shader/game-loop changes. Current working source differs from old231 manifest
ONLY in`ui.css`; new `freeze-toast-layer1.json` separately records231 hashes,
SHA256`fad2c74e919a226103907b3dee2dda750197999f0620de8189d1f32f3644db5c`.
Original raw failures/manifests unchanged. Own resources closed, exactsparse/config
restored, reservation released from actual closure; no Wings contact/handoff,
installs/newgames/push. Four original suites pass; shader/context-loss investigation
and requested native frames0/5 remain HOLD, not scope complete.

### Context-loss investigation and current focused native failure

[Integrated investigation](../../citisten-context-loss-repair.md), commits
`89ff864b`/`90ae688b`/`97d2e33a`/`325af7e8`, adds comparison, resource/lifecycle,
normal-input Water/Save gate and read-only crash-dump tooling, not game source.
Retained minimal/menu/first-town contexts were healthy;23 links/46 compiles passed
in one comparison, but duplicate-source storage and sampling/deadline gates failed.
No full comparison/protocol acceptance or historical shader clearance is claimed.
Actual shipped-source resource contracts pass; the five disposed callbacks retained
until teardown are a secondary CPU finding, not a demonstrated GPU leak or cause.

The new requested actual gate is0/1 FAIL: context lost after Free Build before
Water; paused partial construction, Save/Reload/Continue and completion unreached.
[Matching GPU dump](../../citisten-gpu-dump-analysis.md) identifies `GpuWatchdog`
and the installed deliberate hang-recovery path, consistent with exit512. It does
not identify OOM, a product shader fault or LLVM/JIT versus raster work. Matching
SwiftShader symbols are missing. No game patch, quality cut, watchdog/security
bypass or retry is justified. The original profile-scan/cleanup failure remains;
subsequent independent owned closure/source/prior-hash/sparse/config proof does
not retroactively pass that protocol. Parent7/7 focused commands pass; coverage
still fails the missing Brainrot manual. Current game tree/226files/35,156,794bytes
and inventory are unchanged. All leases released; new native frames0/5, source
repair/native/visual/hardware/FPS gates remain HOLD. No new games or push.

### GPU-REPAIR-NEXT: neutral empty-pool reduction

The later operator explicitly superseded waiting on debug symbols: inspect local
application workload and installed renderer alternatives, no off-host crash upload.
[First-scene isolation](../../citisten-first-scene-workload.md) executes real vendor
traversals and actual local modules. Visible zero-count instanced meshes prepare
programs/buffers before Three skips drawing. Applied fix`5d97968d` sets visibility
at all six count-owning modules, preserving positive instances and lamp night gates.
The exact16 replacements skip8 menu/9 first-town empty render candidates and1/2
shadow candidates in the retained open-frustum fixture. These are not measured
compiled-program/GPU-memory/FPS reductions. No quality, shadow, LOD or DPR change.

[Applied-source checks](../../citisten-empty-pools-fix.md):155 lifecycle checkpoints,
zero current visibility violations, active geometry/matrices/colors/counts preserved;
8/8 CPU suites pass. [Independent save/resume](../../citisten-save-resume-regression.md)
passes5/5 groups, exact10.25s partial JSON save/reload,500ms CPU pause, dt0 wake and
simulated1.025s completion at10x within unchanged5s. CPU results are not native input.
[Installed Mesa Vulkan](../../citisten-mesa-renderer-result.md) was selected but
WebGL2 blocklisted; stop before Citisten, no override. Its concurrent sibling-file
fingerprint change is retained separately, not hidden as preservation success.

Current game226files/35,157,269bytes/treecf589170; entry unchanged. Old freezes,
failures and proposal RED logs stay immutable. Separate231-file current freeze
`freeze-empty-pools1.json` SHA256
`a0e093cc706e820586ff0b759f6acfa416c58c1c48763cc8076c382a082b6305`
differs from toast freeze only in the six authorized modules. Actual
[changed-source SwiftShader case](../../citisten-empty-pools-native-result.md)
`a01d2545` passed minimal clears but lost context at menu before seed/Free Build,
0/1; Water, partial construction and Save/Continue were unreached. Cached counts
18/13/11 geometry/textures/programs were sampled during loss, not steady-state or
FPS proof. Parent physical Vulkan enumeration found V3D4.2.14.0, but the separate
[Broadcom browser case](../../citisten-broadcom-renderer-result.md)`4756efde` failed
EGL ES3 creation/WebGL2 null and stopped before game. No bypass, fallback-as-pass,
symbol upload or repeated configuration. These tested routes did not establish a
supported local path; not a universal impossibility claim about all configurations.

Parent final4/4 cheap commands pass with save/resume5/5 CPU groups;351 prior and231
source hashes/config/sparse verified before live integration prose updates. All
three new browser leases released from actual owned closure. The canonical
investigation lists concrete existing supported-host prerequisites: current local
static source/freeze/fonts, an already-installed GPU/browser/display that truly
provides ordinary WebGL2, isolated profile, same-context minimal/native test and
unchanged normal-input500ms/5s acceptance. No particular off-host machine is assumed
available, and no transfer/remote execution happened or is authorized. Independent
CPU/save work completed; native Water/Save/Continue, context stability, requested0/5
frames and hardware/FPS remain unpassed. No further launch planned, push or new game.

## Future outlook

Finish native-input/animation acceptance, complete the unchanged 40 FPS
measurement, resolve delivery gaps and perform full-fleet release QA.
Operator batch 67b records ledger 241 as missing; use this manual and the
catalog draft rather than inventing a ledger or blocking the registration.
Operator/Hermes owns any push; the world lane does not push.
