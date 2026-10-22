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
`ui.mjs`, `sim.mjs` and `world.mjs`. `buildings.mjs` now exports the external
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
No growth formulas were changed.

## State and persistence

Simulation owns authoritative state. Native integration keeps stable model
handles, converts grid positions with `roads.center`, drains events once and
recreates simulation state on restart. No save/load persistence is claimed.

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

The 40 FPS gate is HOLD: no new external-model performance measurement exists.
The old 2.257124 FPS measurement predates these assets. Static per-model AFTER
QA is complete; native acceptance and the full-fleet pre-push gate remain held.

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

## Future outlook

Finish native-input/animation acceptance, complete the unchanged 40 FPS
measurement, resolve delivery gaps and perform full-fleet release QA.
Operator batch 67b records ledger 241 as missing; use this manual and the
catalog draft rather than inventing a ledger or blocking the registration.
Operator/Hermes owns any push; the world lane does not push.
