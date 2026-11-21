# Capital Drive expansion verification, 14 November 2026

Owner order: after the sports fixes, improve Canberra street density, Manuka shops
and pool, landmark/material appearance, buses/drivers, carjacking/robbery/gun
acquisition, gyms/food, wanted stars, foot police and hospital transitions.
Sports PR11 merged as `813ac160`; GitHub Pages reports that build complete.
Existing game245 only. Catalog remains134, source projects140, six unregistered.
No new game, runtime dependency or external asset added.

## Result and authority

Six bounded disjoint Sol workers plus root integrate the expansion under the
[shared contract](../capital-drive-expansion-contract.md). Source milestones are
`8228028c` pool/landmarks, `6623c5dc` street/district appearance, `b3d8eb4e` occupants,
`45f3a729` profiles/collision, `772ac550` police/actions, `cd5399e6` buses,
`910c09d1` route cache, `0c2c1553` service signs, root `9cbf48e8` integration,
and `a0a240b5` real-map patrol/boarding fixes. Browser tool updates are
`c806897f`/`8fae4290`. Each worker committed only its assigned paths; none pushed.

All5197real road runs remain. Exact cached OSM access/service tags narrow
presentation of driveways/parking aisles and exclude1926ways from ambient traffic.
The sidecar matches all exported IDs, has2051tagged records and18tile hashes.
Routes cache legal adjacency; cars/police/buses share bounded swept external
vehicle contacts. Two original unbranded10.6m buses use fictional circuits on
actual public directed roads, with steering, braking, collisions and layovers.
No real route/timetable is claimed.

The exact Manuka retail polygon fixes appearance of western commercial blocks:
15footprints classified,34whole-map aprons/11618triangles/7839m². Source OSM
Manuka Pool water replaces only the ACT block over the basin; nearby buildings
remain. Five landmarks use5316triangles/10meshes/two materials. Parliament's
entrance,81m mast, lawn/flag and forecourt regressions remain. Surface roughness,
grain, glazing and reduced furniture/tree density give clearer streets. These
are original procedural interpretations guided by recorded street observations,
not new imagery scans. Pool geometry comes from OSM; no pool panorama was newly
inspected. Reference notes retain exact source versions and hashes.

Drivers sit inside local car geometry; four dismounted officers retain their
parked patrol cars. Occupied-car taking requests gradual braking and requires
close/slow/visible contact through1.8seconds before a claim; displaced adult
rendering is separate from witness state. Patrols follow legal directed roads,
turn/brake, dismount, search last seen ground, retry obstructions and approach a
clear door to reboard. Five stars expose existing wanted0–5. Hospital/station
recovery fades through a3.4second transfer and applies the existing penalty once.

Four fictional service sites offer food, a gym and supplies. Food35health/$35;
pistol$450 and ammunition$60; eight-second workouts improve sprinting through
three levels with120/240/360costs. Shop robbery requires the owned equipped gun,
four uninterrupted nearby seconds and a witnessed offence; payouts occur once
and empty till cooldown180active seconds survives reload. Progression owns every
cost/reward; the renderer owns none. Legacy v1 saves accept the new optional
strictly validated equipment/fitness/cooldown fields. Invalid saves remain
unwritten. Free roam cannot earn career cash or complete activities, and Street
Life still has no map teleport. Owned guns start a new career session with24rounds;
ammunition and active activities are transient. Real business identities are not
invented. Reusable skill/workflow/runner now cover all new modules and cases.

## Fresh source checks

`python3 -B scripts/check_capital_drive.py`: **57/57 PASS** (22authored syntax,
17suite syntax,17executed suites and diff check). This covers actual-map driving,
causal pedestrians, district/frontage/terrain/projection, gameplay/progression,
actor/landmark/address, road access and sweeps, buses, police, occupants and
service authority/signs. All source/JSON remains finite and resource disposal is
idempotent. Subsequent police fixes passed fresh police/gameplay and syntax checks.
The final runner-selection repair passed Python AST and dry-run: expansion is
now the default browser suite; `--classic-browser` retains the earlier suite.

Actual-profile police regression: road4980512-0,86.343m travel, dismount, maximum
step0.300m. Four clear public-lane spawn candidates pass real canOccupy checks.
Real external-car collider boarding and blocked reverse/replan tests pass.
Officers use bounded local detours, not a full sidewalk navigation mesh; no claim
that every blocked road can always be cleared. Buses pass actual-map120second
travel, directed closure, bounded displacement, front blockage, pause/reset,
layover and finite renderer/disposal tests. Budgets: buses4draws/2264triangles;
occupants at most64drivers/12exits in4draws; actor adapter52maxdraws/28668triangles;
service signs2draws/112triangles. Counts are geometry guards, not hardware FPS.

Service suite checks location/on-foot/wanted/sandbox/cost/equipment denial without
wallet changes, successful food/gun/ammo, interrupted/completed workouts, single
robbery payout, cooldown reload, legacy input and corrupt new-field rejection.
These detached authority fixtures do not claim natural browser purchases.

## Browser phases retained separately

The first normal-input attempt passed10checks, then failed an optional greedy
kiosk walk after62.87seconds. It chose a direct path obstructed by the parked car;
that report remains [FAIL evidence](capital-drive-expansion-initial-fail-2026-11-14.json).
It is not silently counted as a full pass.

The mandatory rerun completed **28checks in112.2seconds**, zero page exceptions,
console errors, HTTP/failed requests or external runtime requests. Its
[raw receipt](capital-drive-expansion-browser-2026-11-14.json) verifies actual
WebGL startup, explicitly labeled legacy-v1 input/reload, normal E exit, gun lock,
five star slots, Street Life address/teleport denial, service list/route and remote
purchase rejection, pause, actual Free roam address/landmark search/teleport and
both phone modes/no overflow. The remote-handler dispatch is labeled a negative
fixture, never positive purchase evidence. The legacy input fixture grants no
progress completion and is separately identified.

A focused normal-WASD waypoint walk passed at **5.5735m** from the kiosk, retaining
its [path/snapshot](capital-drive-expansion-focused-2026-11-14.json). The runner
now contains that route around the car and path diagnostics. Separate normal-UI
map clicks/mouse orbit yielded a bus-front view with visible seated driver, and
Parliament's exposed entrance/full mast/lawn/forecourt. Those
[final focused snapshots](capital-drive-expansion-focused-final-2026-11-14.json)
are distinct from the28-check suite. The earlier centre-wall Parliament frame
and foot-camera mast crop were rejected as useful landmark previews; the
[foot phase](capital-drive-expansion-parliament-foot-2026-11-14.json) is retained.
No production state setter or camera injection was used. The consolidated helper
script was syntax checked after these individually exercised scenarios; a new
full suite run is not claimed after helper consolidation.

Root reviewed pool water/coping, Manuka awnings/aprons, bus driver/front, full
Parliament mast/entrance and portrait Street Life captures. All browsers and
bounded temporary servers closed. Raw images stay outside Git in the task's
expansion preview directory. Positive live gun purchase, workout/robbery completion,
carjacking and high-wanted arrest remain pure-suite coverage, not natural native
acceptance. This distinction prevents read-only diagnostics from becoming fake
progress evidence.

## Source preservation and limits

`data/canberra.json` is unchanged7791998bytes, SHA256
`f62bdacc290865799023f461b0be923d0fc48a8a7ca75fcfb241637c5790f425`.
Addresses remain626814bytes, SHA256
`9186624ae78f0863baca806cfccd03a9b907708e229d70926322ff9959a78ab9`.
Terrain validation remains SHA256
`ea8a7a1b644db00d7087295007df4a3063613417152197cca0bc32ac0b797276`.
The existing contour grid is approximately12m sampling, not native1m DEM.
Road-profile repeat build is byte-identical (source versions/hashes in sidecar).

System Chromium used no-sandbox/disable-dev-shm-usage/enable-unsafe-swiftshader/
ignore-gpu-blocklist, so no native sandbox or physical Intel N100/8GB performance
claim follows. Visuals remain stylised procedural art; inherited car interiors
are left-hand-drive while road traffic is left-hand. New buses use a right-side
driver/left-side doors. Software tests do not establish full emergency-driving AI.
The historical fleet123/133 certificate-failure hold stays separate; focused
passes do not turn it green. Owner explicitly authorized all completed PR merges.
Shared car factory, protected game, bundled portal and proxy policy are untouched.

| Current source | SHA256 |
| --- | --- |
| `Games/Capital Drive/script.js` | `a6edb422e5ecda67d2322827f62df49e215cc086bd4849ba37b284bfb6762db5` |
| `Games/Capital Drive/simulation.js` | `8ce35d60b5f782efa1098a709680e20126475e9fb35404daff6e99e018d4547c` |
| `Games/Capital Drive/gameplay.js` | `fc822cd1f3143c9930379937326203472dd7c21888517432ac2c4dc2ddcdda34` |
| `Games/Capital Drive/police.js` | `55ec12358bfc3ef1661d440f06a6712e0566dd3ba8f715af8f01b42a799cf12c` |
| `Games/Capital Drive/progression.js` | `96da0593df2b618ab5e5eb40a354bc321caba5feb64f30e5d002b76d410cff89` |
| `Games/Capital Drive/world-view.js` | `82276acab6c1611f9fea97a7ea0a7bbabc732a03f2b2ad7c3a82eda302be50aa` |
| `Games/Capital Drive/landmarks-view.js` | `d91b50f4d362e42d0bf8cb90fefdbd9d5efaa68630164cba3c3c35c9eb0d7910` |
| `Games/Capital Drive/data/road-profiles.json` | `73584fc2014d54ee9beb9137c27f337b13f3aa666f94b7bbec66f734d6b76968` |
