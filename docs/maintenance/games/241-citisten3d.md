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

624 slabs plus 108 natural boxes are batched in one landscape draw. With the
flat city's two triangles the terrain budget is 7,538 triangles, below the old
8,192-triangle plane. The supplied city ground is retained as one material group
(previous ground used up to three), so ground plus landscape needs two draws.
No per-feature draw calls, animated foliage, extra assets or remote loads. This
is a geometry/draw bound, not a measured FPS acceptance; that gate remains held.

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

## Future outlook

Finish native-input/animation acceptance, complete the unchanged 40 FPS
measurement, resolve delivery gaps and perform full-fleet release QA.
Operator batch 67b records ledger 241 as missing; use this manual and the
catalog draft rather than inventing a ledger or blocking the registration.
Operator/Hermes owns any push; the world lane does not push.
