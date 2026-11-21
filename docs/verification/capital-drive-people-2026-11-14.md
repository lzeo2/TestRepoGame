# Shared people, moving-car contacts and Lambzhou chairs

14 November 2026. Follow-up to merged PR20 (`cf6a2fb5`). This changes the existing
original Capital Drive 245, with no new game, dependency, remote runtime asset,
geographic snapshot or shared car-factory modification. The owner requested
matching pedestrian/driver models, then reported stray restaurant chairs and
cars passing through people.

## Result and ownership

`person-model.js` supplies common rounded shapes, proportions and deterministic
appearances. Pedestrians, occupants, transit, articulated player and police use
the same family. Gameplay captures person identity before a vehicle claim;
displaced adults and the cancelled Yoober driver retain their appearance. All
sixteen car seats follow the actual cockpit, car ground lift and slope pitch.
The [contract](../capital-drive-people-contract.md) records budgets and boundaries.

Simulation now sweeps full vehicle bodies against a bounded spatial index of
live adult circles. Root supplies current pedestrian, contact, officer, fare,
outside driver and on-foot player poses before movement. Contact geometry uses
adult body radii, independently of shop interaction reach. Translation, corner
rotation and legacy impact corrections cannot skip the body checks. Bus/ride
foot probes and flare placement explicitly exempt their own querying person;
other adults remain solid. Patrol turns use the same checked old/new pose.
The physics owner does not change adult health, witnesses or career money.

Native inspection reproduced the isolated Lambzhou chair as pedestrian 0's
arbitrary coffee furniture. The actual restaurant facade, Civic shell and lazy
dining/kitchen room were present. Arbitrary sidewalk chairs are removed; coffee
adults stand holding cups. The two restaurant apron table/chair pairs and entered
room seating remain. Existing source shop geometry/provenance is unchanged.

Workers used disjoint explicit staging windows and did not push. Source milestones
include `95be5514`/`ef8a5e71` shared models, `45286aa8` articulated player/police,
`54eb5f64` transit art, `45bcac0e` seated transforms, `7ab36423` standing coffee,
`65b89283` vehicle/person sweeps, `0fbf8b6e` transport self-clearance and `cfe2ef9c`
checked patrol turns. Root owns controller integration, equipment regression,
runner, documentation/inventory and shipping.

## Verification

- Full authored runner: **193/193 commands passed**, 58 modules and 67 pure
  suites. Log SHA256 `a03ca01a923e8ac09cbfdeef6a8dd8ad3d18340f13cd1cd9b2097c25b6c461da`.
  This includes the actual-map 7,200-frame vehicle clearance and ambient route
  checks, model fits/identity, live-person contacts, transport and police suites.
- Final equipment integration additionally passed with the real Simulation
  queries: the thrower's circle permits the checked path, another adult blocks
  it without spending inventory. Log SHA256
  `f3ba06ac802111e42c7bfdeecbe302179973caf6118bc3fda2802827256e65c4`.
- Final native restaurant flow: **30 checks, 87.87 seconds**, actual Free-roam
  search/travel, normal E entry, clear walking to the real counter, shop actions,
  sandbox reward denial, exit and culling. Result SHA256
  `1b094d1f616b42428a89427a5ffa8b0301908b89b644973f4fed6bc94200ae91`.
- Final native loading/input and labelled shared-model component flow:
  **17 checks, 32.04 seconds**. Actual Free roam starts, E exits and W moves;
  registered bodies are 39 driving (36 pedestrians + 3 contacts) and 40 on foot.
  The component compares standing/seated/exited adults and reads actual instance
  colours. Result SHA256
  `a8ad445c4af0938cf0ed6b637bdcad71920b572470cd57101c5091e6c6726027`.

Both final browser flows report zero console/page errors, failed/HTTP requests
or external runtime attempts. Temporary servers, browsers and contexts closed.
Root reviewed the native street and restaurant exterior/interior captures and
the labelled model comparison. The seated person is partly occluded by the real
car windshield/body. The component is not normal-input carjacking evidence;
vehicle impacts/turns are verified through actual physics/controller regressions,
not a claim of a manually performed native impact.

Retained failures are not counted as passes: the first full runner stopped at
145/191 because an old data-URL pedestrian test loader could not resolve the new
local import; the loader now imports local ESM and all assertions remain. Its
remaining 45 suites passed before the complete final 193 pass. The first new
restaurant investigation stopped after 16 checks at a stale counter waypoint
3.28 m from the 1.25 m interaction radius; the harness now walks the clear aisle
to the actual plan counter and the complete flow passes. Earlier model captures
and native contact counts remain dated evidence, superseded by the final runs.

Maintenance/inventory, catalog and sitemap checks cover 134 registered games /
140 maintained projects. Tracked game payload is 12,909,141 → 12,922,867 bytes
(+13,726). Original sparse selection is restored after shipping. Existing fleet
certificate failures remain separately disclosed; this is not a fresh all-games
loading pass. N100/native GPU FPS, touch play and whole-city realism remain
unmeasured. Further mall/suburb/gym/wildlife expansion is a separate owner-requested
development stage, not claimed complete by this receipt.
