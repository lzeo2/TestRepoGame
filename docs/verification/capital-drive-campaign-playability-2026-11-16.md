# Capital Drive: all-mission playability audit

16 November 2026. All **20 normal campaign objective chains and 56 stages pass**
the source-domain harness. This is functional objective and reward evidence,
not 20 complete native playthroughs. Natural travel, real police evasion,
survival and observed human difficulty remain unverified for the full campaign.

## Method and actual blocker fixed

`test_capital_campaign_playability.mjs` loads explicit normal campaign progress
prefix fixtures, then uses `campaign.start`, never developer previews. Real
activity input edges, the extracted controller activity/evidence handoff, the
eight-cue carjacking challenge, simulation vehicle claims, live shop employees,
five-second till handovers, stable fresh recon scans and Dot's thrown-noodle /
melee victory feed the campaign owner. Each stage advances in order; each normal
reward emits once, survives save/reload and does not replay on extra ticks.
Repeated school-alarm failures also reject the previous attempt's receipt.

The harness found a real robbery blocker: ordinary rear-counter staff positions
overlapped rear walls or catering equipment, leaving shops without an employee.
The bounded staff-placement fallback now tries clear positions around the same
counter. Its staff-only exemption covers the non-solid player interaction circle,
not walls, props, central aisles, doors or other adults. All **26 actual shop plans**
have their intended live staff, with clear body placement and a reachable
entry-to-service path. Actual Coals and Scoot handovers pass through the real
Progression owner and controller receipt adapter.

Fixture travel places the player at the tested objective and explicitly clears
police where required. It does not pay travel time, drive the full rendered
world, fight through actual pursuit or prove player survival. Supplied Dot strikes
exercise her actual owner but bypass Gameplay's melee admission and player damage.
Earlier dated native combat receipts cover some of those interactions separately;
they do not establish all 20 end-to-end completions.

## Every mission

Difficulty below is a **source-based estimate**, from 1 (easy) to 4 (hard), not a
score observed from human/native play. Every row passed its full domain chain.
Timers are the actual whole-mission budgets. The route column is the harness's
canonical-start public-road planning estimate; retained hero positions can differ.
Zero means the fixture began locally, not that no movement is required in play.

| Mission | Hero | Stages | Timer | Planned route | Estimated difficulty | Main pressure / next native check |
| --- | --- | ---: | ---: | ---: | --- | --- |
| False start | Kit | 2/2 | 8 min | 0.09 km | 2 | Alarm, real evasion, then return on foot within 30 m of school. |
| Extra credit | Kit | 2/2 | 11 min | 0.89 km | 1 | Park, enter Coals and finish the actual stock task. |
| Present tense | Rowan | 2/2 | 8 min | local | 1 | Reach the office station, complete the outage task, leave. |
| Lunch breakpoint | Rowan | 3/3 | 9 min | 0.67 km | 3 | Counter, noodle throw, actual melee win, then clear the search outside. Hardest opening mission. |
| Touch grass | Milo | 4/4 | 9 min | 1.20 km | 2 | Home packing, regain the car, Coals stock shift. |
| Signed for | Milo | 3/3 | 10 min | 2.42 km | 1 | Parcel pickup, stopped vehicle delivery, on-foot handover. |
| Three receipts | Kit | 2/2 | 10 min | 1.78 km | 1 | Meet on foot, then drive and stop at the next approach. |
| Depot interception | Milo | 2/2 | 6 min | 1.20 km | 3 | Occupied-car theft and a three-star search before delivery. |
| Ledger robbery | Kit | 2/2 | 5 min | 0.91 km | 3 | Real till handover, then clear the search in a stopped car; retry can retain store cooldown. |
| Borrowed wheels | Rowan | 2/2 | 8 min | 5.25 km | 3 | Theft, evasion and finding the Kingston service-road approach. |
| Armed getaway | Rowan | 1/1 | 9 min | 7.09 km | 4 | Three-star escape plus the tightest route/timer estimate. |
| Bridge score | Kit | 3/3 | 11 min | 6.70 km | 3 | Regroup, bridge crossing, then a clear stopped Centre approach. |
| Split the score | Milo | 3/3 | 12 min | local | 2 | Stop at home, pack inside, exit to the actual approach. |
| Shelf life | Rowan | 5/5 | 18 min | 13.30 km | 4 | Two distinct shifts, bridge travel and a long route. |
| Two till problem | Kit | 5/5 | 18 min | 5.02 km | 4 | Two separate fresh robberies, then Red Hill evasion. |
| Carbon copy | Milo | 6/6 | 20 min | 13.71 km | 4 | Packing, theft, bridge, kitchen shift and return handover. |
| Paper trail survey | Rowan | 2/2 | 15 min | 5.30 km | 2 | Deliberate framing and two fresh scans; full-boot sightlines still need native verification. |
| Exit interview | Milo | 2/2 | 15 min | local | 2 | Two distinct public-approach scans with fresh input edges. |
| Sealed account | Kit | 3/3 | 18 min | 3.02 km | 4 | Till robbery plus a separate evidence task, then escape. |
| Pink Earmuffs rematch | Rowan | 2/2 | 15 min | 0.67 km | 3 | Win after the throw, leave on foot and clear the search. Timeout retries preserve player health. |

At an assumed average 12 m/s, route distance plus tested action/hold time already
exceeds Armed getaway's budget by about 58 s and Shelf life's by 37 s. At 16 m/s
their remaining estimates are 90 s and 240 s; every mission has a positive estimate
at that speed. These are **optimistic planning scenarios**, not measured driving
times: traffic, getting in/out, navigation errors, combat and police evasion add
time. No timer was changed merely to make this fixture pass. Armed getaway,
Shelf life, Borrowed wheels and Carbon copy are priorities for native balance
testing. At 12 m/s the latter two leave only 37 s and 44 s before unmeasured costs.

## Reachability limits retained

The fixture includes expanded map data, generated door/backyard metadata and some
barriers. It omits some rendered boot obstacles, terrain, parked cars and airport
geometry. It checks graph connectivity, objective-radius intersections, road
vertices and selected lateral probes, not complete swept vehicle journeys.
The initial audit retained blocked road-vertex probes in nine missions. All share
the Canberra Centre footprint over covered Bunda Street: source `osm-46081156`
has `layer=1`, but the current ground collision treats its full polygon as solid.
Three Bunda vertices are inside it. The source graph has a road detour via
Akuna Street, Cooyong Street and Petrie Street (about 592 m versus 246 m directly).
The source geometry defect is real; those initial findings do not prove nine
whole missions impossible. A source-pinned routing guard now excludes eight
intersecting Bunda travel arcs, including approaches whose shared endpoints lie
on the solid facade. It retains all source segments and physical collision;
GPS, traffic and service routing share the resulting graph.

Strict static whole-car checks pass in both directions: 592 m southbound and
627 m northbound, with 1,226/1,300 samples respectively at both centrelines and
the actual directed driver-lane offsets, no more than 0.5 m apart. A first sweep
incorrectly included a replaced Petrie building; the final fixture derives and
asserts the controller's exact replacement IDs. The initial failed attempts are
retained. Final detour log SHA256:
`9e42d0c28eef1e6f15688eb77a542eaafd4f11889c3bbec8ce9aaaeb2baf9db2`.
This verifies the static source detour, not corner rotation, moving traffic,
terrain or every decorative boot collider. The true covered-street architectural
opening remains future work; real Bunda Street is not described as closed.

The final all-mission report has 19/20 clear car-vertex routes. Armed getaway retains
one blocked Capital Circle centreline vertex; its lateral road-width probe is
clear. That is not a demonstrated unavoidable wall, and remains a labelled HOLD
until full swept/native traversal. No fixture self-collision is counted as a road
blocker: probes explicitly ignore the player's own vehicle.

The nearest GPS graph node is also not the objective itself. Bridge score's route
passes inside its goal discs even though a final graph node lies outside. For
Borrowed wheels, the nearest service-road segment is about 20 m from the Kingston
goal (26 m radius), while the graph endpoint is about 77 m away; natural access
along that spur remains unverified. Split the score's canonical start is already
local, and the nearby road segment is about 15 m from its approach despite a
graph endpoint just beyond 26 m. These findings remain visible in the JSON rather
than being erased or treated as full physical passes.

## Reproduce and evidence

Run from the repository root, with no browser or CPU benchmark running:

```sh
node scripts/test_capital_local_recovery.mjs
node scripts/test_capital_campaign_retry.mjs
node scripts/test_capital_retry_controller.mjs
node scripts/test_capital_shop_staff.mjs
node scripts/test_capital_covered_road_routes.mjs
node scripts/test_capital_campaign_playability.mjs --output ../capital-drive-evidence/campaign-playability.json
```

Create the external output parent first. The final scoped audit is
`capital-campaign-playability-20261116-a7.json`, SHA256
`2eabf1ddf8c5d89734dae1e3327599fe564a36814c03e511bcb194dc4c81e54a`.
It passes 20/20 normal chains and 56/56 stages after the routing correction; earlier
failed/triage and pre-routing attempts are retained externally. Automatic retry
and local medical placement are covered by
their actual-owner regressions. Neither the campaign report nor those controller
fixtures establish a native knockout-to-recovery-to-retry journey.
