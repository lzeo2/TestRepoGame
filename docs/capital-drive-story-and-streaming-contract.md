# Capital Drive: story, mission directions and resident geometry contract

Inspected source: 15 November 2026. This records the current original campaign
and local rendering architecture. It does not certify a complete native campaign,
an actual robbery playthrough, the full Rowan lunch route, or N100 performance.
The existing [Canberra life contract](capital-drive-canberra-life-contract.md),
[maintenance manual](maintenance/games/245-capital-drive.md) and dated verification
receipts retain their own evidence and limits.

## State owners and clocks

[`script.js`](../Games/Capital%20Drive/script.js) owns boot, the single animation
loop, fixed gameplay steps, input, dialogs, cameras, modes and the career writer.
[`campaign.js`](../Games/Capital%20Drive/campaign.js) owns chapter order, active
targets, deadlines, independent introduction prefixes, the meeting and completed
shared chapters. [`progression.js`](../Games/Capital%20Drive/progression.js) owns
cash, wages, robberies and owned equipment. Campaign completion emits one reward;
the controller adds it to the existing capped wallet and writes progression and
campaign in the same career record. Selecting another hero changes identity and
appearance between missions. The later
[cache/performance continuation](capital-drive-cache-and-performance-contract.md)
now restores each hero’s own location, health, car and ammo; rewards stay shared.

Active missions and cutscenes are transient. Strict v2 campaign saves retain all
three independently ordered partial introduction prefixes, the selected hero,
meeting and shared prefix. Valid v1 shared progress migrates through the legacy
path. An active mission locks hero selection; cancellation, timeout and recovery
end that lock while retaining completed chapters. Invalid/recovery/sandbox context
cannot start or advance the campaign. The initial placement helper,
[`character-start.js`](../Games/Capital%20Drive/character-start.js), checks separate
car and foot positions for a hero’s first visit; later visits use their checkpoint. Campaign travel has no map teleport.

[`cutscenes.js`](../Games/Capital%20Drive/cutscenes.js) accepts supplied time and
copies bounded original caption scenes: at most six lines and 24 seconds. It owns
no timer, camera, mission or save. Its frozen snapshots supply caption and camera
shot progress to the controller, which frames the live player from a captured
anchor. Hidden or unfocused windows freeze the caption clock. An ordinary in-page,
full-viewport modal overlay uses `role="dialog"` and `aria-modal`, makes its
siblings inert, and traps Tab between its two buttons. The active scene pauses
gameplay and world input; skipping completes the introduction, while cancelling
does not start a mission. A captured run ID, hero and mission must still match before
the controller starts that mission. Completing a caption scene earns no reward.
These are short local camera/caption scenes, not voiced or pre-rendered films.

## Real doors, interpreted rooms and visible directions

[`mission-locations.js`](../Games/Capital%20Drive/mission-locations.js) indexes
the existing door descriptors and returns frozen directions. Before entry, its
target is the actual door approach; inside the matching room it resolves the
actual activity station, counter or live Dot descriptor. It supplies instructions,
distance and the floor marker, without advancing a stage. Missing or mismatched
bindings fall back to the campaign's authored objective rather than inventing a
station.

The school entry in [`interiors.js`](../Games/Capital%20Drive/interiors.js),
`interior-telopea-school`, is an estimated entrance on retained education footprint
`act-101001-0`, approached from `telopea-gate-11`. Construction checks the
original 12 by 16 metre playable wing within that body and a clear approach from
the school gate. The wing contains a corridor, classroom and staff area; its
fictional alarm panel has a nearby `alarm` activity station. This is an original
after-hours game room, not a surveyed school floorplan or real device procedure.

Milo's home is selected deterministically from actual house door descriptors
near Kingston, retaining its source building ID, door, room ID and nearest-road
name. The selector chooses the first clear exterior approach, not an invented
street number. That one room adds a case table and `${roomId}-stash` stock station.
The controller labels it Milo's safehouse, exposes it in search, and guides the
player to the same door and case table. Its living, kitchen, bedroom and bathroom
arrangement remains an interpreted private interior.

[`interiors.js`](../Games/Capital%20Drive/interiors.js) keeps all lightweight
entry descriptors but generates only the entered room plan. Entry requires live
door proximity; walls, furniture and door gaps govern movement. Leaving restores
the captured outside pose at that same door and drops the active plan.
[`interior-view.js`](../Games/Capital%20Drive/interior-view.js), activity and people
adapters load only that room and clear/dispose its meshes on exit. The Centre is
an original partial ground-floor wing with interpreted tenancies and corridors;
it does not represent the whole mall. Exterior buffers remain resident under the
streaming policy below but exterior rendering/updates are suppressed inside.

## Three introductions and six shared chapters

All named characters and story events are original fiction. Their connection is
a fraudulent depot account: Kit's club refund, Rowan's approved account and Milo's
double-charged parcels converge through receipts at Kingston.

| Hero | Ordered introductions and actual completion owners |
| --- | --- |
| Kit Vale, student, 18 | **False start:** enter the school wing, complete the alarm task, leave and clear the search on foot. **Extra credit:** park at Coals and finish a real stock shift through Progression. |
| Rowan Pike, corporate, 29 | **Present tense:** complete the Centre PowerPunt station's outage, then leave. **Lunch breakpoint:** visit the Lambzhou counter, talk to Dot, receive her noodle throw followed by actual emitted melee, then leave and clear attention. |
| Milo Finch, basement, 26 | **Touch grass:** pack the case in the bound safehouse, leave through its door and finish Coals stock work. **Signed for:** collect a parcel outside Coals, stop at Kingston and hand over on foot. |

The meeting requires all six introductions. The two other heroes are placed on
checked public roadside approaches, not inside the landmark centre. Following
the meeting, the shared prefix has explicit lead heroes; the campaign UI names
the next required hero when a switch is needed. Existing shared chapter IDs stay
stable for saves.

| Shared ID | Lead hero | Objective and reward |
| --- | --- | --- |
| `late-parcel` | Milo | Depot interception: take an occupied vehicle, deliver it outside Coals and clear police; $350. |
| `under-the-awning` | Kit | Ledger robbery: complete the Coals counter handover, leave in a car and clear police; $450. |
| `borrowed-wheels` | Rowan | Carjack an occupied vehicle, deliver it in Kingston stopped and clear; $700. |
| `quiet-streets` | Rowan | Armed getaway: escape the search and regroup at Red Hill; $800. |
| `across-the-water` | Kit | Regroup at the source Flynn Drive approach when available, cross Commonwealth Avenue Bridge and stop clear at the Centre; $1,000. |
| `home-by-the-lake` | Milo | Park at his safehouse, pack the ledger case inside and leave clear for the split; $1,200. |

The six shared chapters request the other two heroes as transient ground allies.
[`campaign-scenes.js`](../Games/Capital%20Drive/campaign-scenes.js) admits at most
two on checked source-road approaches. They follow with bounded physical sweeps,
remain subject to adult/body and world collision, and can stop at obstacles. They
do not board cars or supply a whole-city path planner. They are hidden indoors;
they provide street cover outside an interior robbery. Local placement at a new
mission is not a continuous crew travel simulation.

Allies target at most four supplied live dismounted police descriptors within
28 metres and clear sight. Shots do at most 12 damage with a 1.1-second cooldown;
the pending shot-event list is capped at four. Gameplay revalidates target, range,
line of sight and recovery before applying police damage. Police can return fire;
ally health/down state is transient and does not independently complete or fail a
chapter. The scenes/view modules own no campaign reward or wallet.

## Task and combat authority

[`interior-activities.js`](../Games/Capital%20Drive/interior-activities.js) owns
supplied-time input scoring and terminal sessions. The fictional alarm requires
a neutral frame, fresh X hold, release and fresh Y confirmation. School alarm,
PowerPunt outage and case-packing outcomes are admitted only from the matching
loaded room, actual terminal station/session and on-foot state. The home action
also checks the selected safehouse and exact stash ID. Work wages still require
the actual matching Progression work session; standing near a stock station does
not pay or complete a chapter.

Campaign stage baselines retain monotonic serials for alarm, presentation, work,
home action, robbery and encounter results. A fresh result must match its required
room/store and outcome; old results cannot satisfy a newly started stage. Frozen
DTOs expose these facts for UI and inspection without granting completion.
[`interior-people.js`](../Games/Capital%20Drive/interior-people.js) owns the live
Dot sequence and immutable captured noodle trajectory. A throw alone, ordinary
peaceful/confrontation outcome or stale encounter serial cannot satisfy lunch.
Interrupted sequences require a fresh valid retry. Ordinary dialogue remains
separate from the mission-bound fight.

Kit's two introductions, Rowan's presentation and Milo's first work mission set
`combat: false`. The controller also protects active paid work, delivery and ride
jobs, as well as activities/cutscenes/paused input. It equips unarmed at protected
mission start and masks aim, fire and melee; Gameplay's attack entry additionally
checks the shared `canAttack` callback. These are attack guards, not immunity from
traffic, police or recovery.

[`police.js`](../Games/Capital%20Drive/police.js) retains directed legal-road
driving and swept foot pursuit. A dismounted officer compares foot closing ETA
against walking to the actual car door, acceleration/drive and final approach,
with a margin and bounded one-second replanning. Reboarding requires a clear car,
door and forward sweep, a usable route and a clear destination approach. This is
local tactical estimation, not guaranteed pursuit around every obstruction.

Live dismounted officers may fire within 52 metres and sight when wanted is at
least three, or when the player presents an active armed threat. Armed ground
allies can also become targets during combat. Officers returning to cars do not
fire. Shot events do nine damage on a 1.1-second cooldown; Gameplay applies player
damage and routes ally hits back through live ally validation. A one-star unarmed
school alarm alone does not authorize gunfire. Wanted and recovery remain owned
by Gameplay/Police, never by captions or mission directions.

## Resident geometry, retained source data and measurement limits

The controller enables `streaming: true` and Low geometry for
[`world-view.js`](../Games/Capital%20Drive/world-view.js) and
[`neighbourhood.js`](../Games/Capital%20Drive/neighbourhood.js). Both use 350 metre
chunks and store source recipes rather than expanded distant vertices. Loading
builds real BufferGeometry; eviction disposes it, removes scene references and
releases its typed attributes. This differs from keeping all city buffers and
only hiding distant meshes.

World streaming preloads the opening district, queues around 575 metres, evicts
beyond 1,050 metres and caps residency at 36 chunks. Movement queue refresh uses
80 metre cells and builds at most two chunks per update. Neighbourhood streaming
queues around 525 metres, evicts beyond 900 metres, caps at 49 chunks and builds
one chunk per update. Visibility distances are separate from residency. Materials,
textures and bounded reusable primitive geometry remain shared until disposal.

The full merged map, roads/navigation graph, address/search data, terrain source,
source recipes and complete house/door descriptors remain in memory. Exterior
eviction does not remove collision geography or make a distant door disappear.
This is geometry streaming, not streamed source-data downloads or a bound on the
whole application's memory.

The recorded actual merged-map Low comparison measures retained geometry
attribute-array bytes:

| Adapter | Complete non-streaming reference | Opening/settled source area | Observed peak across the tested route |
| --- | ---: | ---: | ---: |
| World | 286,446,573 | 15,835,095 opening | 16,541,880 |
| Neighbourhood | 19,629,540 | 1,182,060 settled | 2,011,932 |

These are CPU typed-buffer byte counts for attributes intended for GPU upload;
they are not measured total RAM, GPU driver allocation, process RSS or N100 FPS.
Positions/UVs remain Float32; compact static normals/colours use normalized bytes.
The comparison checks exact complete-reference chunk hashes, eviction, bounded
load budgets and deterministic revisits. A pure Three.js fixture does not prove
native frame rate or smoothness while travelling/loading on target hardware.

## Reproducible checks and retained acceptance limits

Run from the repository root with existing Node/Python, without dependency
installation. The `--actual` cases build the full reference in the test process
for comparison; their temporary test memory is not runtime resident memory.

```sh
node scripts/test_capital_world_streaming.mjs --actual
node scripts/test_capital_neighbourhood_streaming.mjs --actual
node scripts/test_capital_cutscenes.mjs
node scripts/test_capital_campaign.mjs
node scripts/test_capital_campaign_scenes.mjs
node scripts/test_capital_mission_locations.mjs
node scripts/test_capital_character_starts.mjs
node scripts/test_capital_interiors.mjs
node scripts/test_capital_interior_activities.mjs
node scripts/test_capital_interior_people.mjs
node scripts/test_capital_gameplay.mjs
node scripts/test_capital_police.mjs
node scripts/test_capital_progression.mjs
python3 -B scripts/check_capital_drive.py
python3 -B scripts/check_maintenance_docs.py
git diff --check
```

These commands describe repeatable verification, not a claim that this document's
author reran every suite. Pure suites establish state/collision/serial and buffer
properties within their fixtures. Native input evidence and failures belong in
the dated receipt. Full shared-heist completion, full lunch completion, whole-mall
coverage, surveyed private interiors, hardware performance and the fleet release
gate must not be inferred from these checks. No new game, geography rewrite,
shared-car ABI change, external runtime service or publication is authorized by
this contract. Preserve the protected Character AI tree and disabled proxy.
