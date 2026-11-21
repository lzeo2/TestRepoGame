# Capital Drive: city systems, houses and other-area profiling

16 November 2026, Australia/Sydney. Existing original game 245 only. No game,
catalogue entry, remote runtime dependency, source-map snapshot or shared vehicle
asset was added. See the [contract](../capital-drive-city-systems-contract.md)
for authority, controls, pool limits and interpretation of source footprints.

## Scope and owners

This continuation adds harder-earned wanted stars, six ground officers, SWAT,
temporary high-wanted roadblocks, police spotting aircraft, fictional storefront
cameras, a player camera drone, headlights, hireable indoor-capable guards,
purchasable safehouses, weapon/ammo/cash stashes and two appended shared missions.
Vehicle gunfire and grenade damage dispatch to the actual live car owner.
Grenades have visible supplied-time detonations; lethal street gunfire/blasts
leave casualties down. The full day/night cycle is48 minutes.

Unowned house doors use six real lock cues and a checked one-entry permit.
An actual completed indoor valuables task produces a once-only receipt, consumed
by Progression for$200–600 with a saved300 second cooldown. Owned and Milo's
safehouses cannot be looted. Floor triangles and perimeter walls follow source
exterior polygons at original scale; room divisions/furniture are procedural.
Useful furniture is placed near the entrance, rather than at the far edge of a
wide source outline. TV tasks have visible screens. Houses remain lazy-loaded.

Bridge road rendering, car/occupant support, nearby vehicle collision, route art
and bullet hulls now agree about upper/lower road ownership. Actual Flynn and
Parkes controls retain normal same-level collision while separating overlapping
cars on different levels. Source bridge slabs still block bullets. The shared
covered Bunda passage is open at ground level and retains its upper mass.
This does not establish general multi-floor pedestrian physics.

Inventory profiles persist independently of safe body checkpoints, including
wanted/active-mission saves. Stashed ammo cannot be duplicated by reloading an
old hero pose. Hired health includes a durable downed zero. Pending renewal
cannot charge twice while a paused menu still shows the old dead body.

## Source and domain evidence

The final source gate passed435/435 commands:108 game JavaScript syntax entries,
160 Node suite syntax checks, four support syntax checks, the160 actual suites,
two Python cache checks and whitespace. It completed on the final runtime
without changing source during execution. The retained log is
`capital-other-source-gate-a8.log`. Historical failed logs remain retained;
they are not presented as passing acceptance.

The current campaign audit completes all22 normal owner chains /65 stages, using
actual lock/work/alarm/presentation/evidence/fight/robbery owners where required.
`capital-city-campaign-playability-20261116-a5.json` has SHA256
`b373245b73d73460ec9724a447f8d8974bd1a6e927ec8575225c27deab9a7544`.
Its fixture includes source neighbourhood doors/backyards, terrain bridge/water
checks and airport expansion; rendered civic/campus/shop obstacles and parked
cars remain excluded. Fixture placement and police clearing are explicit.
It proves neither22 native playthroughs nor human difficulty or survival.

Targeted bridge-layer, covered-passage, dynamic cover, car damage, hired health,
stash conservation, camera/offence, drone, headlight and house tests exercise
the real owners. Footprint navigation passed521 physical routes, with a largest
grid of1029/2000 nodes and six retained owner fields. A real narrow source-house
gap missed by the old coarse grid was fixed with bounded finer house cells.

Failed source gates caught stale test-only handoffs/imports and old mission
counts. These were updated to supply the actual new owner/dependency and retain
the real reward/physical assertions. The fresh22-mission audit initially failed
because its extracted controller lacked the burglary owner; all affected routes
were already clear. Adding a real inactive owner restored normal terminal
handoffs. No source geography, collision or completion guard was removed.

## Profiling beyond bridges

Baseline runtime is an exact export of83f476088c6dbb0ca9f66fbea09889f4c65b9486.
Both browser reports retain source hashes before/after, raw CPU profiles,
Performance metrics, actual render counts, transition samples and bounded GL
object diagnostics. Service workers were blocked during profiling.

| Baseline area | Script milliseconds per actual render |
| --- | ---: |
| Telopea |19.82|
| Manuka |16.40|
| Kingston |13.91|
| Red Hill |15.49|
| Civic |15.68|
| Airport |13.24|
| Gym indoor idle, two windows |7.30 /7.06|
| Lambzhou indoor idle, two windows |5.85 /6.01|

The exterior run has13 samples, including24.22 supplied seconds with active GPS,
Performance quality and a return to Telopea. The interior run has six samples,
including physical entry/exit of both rooms. Leaving clears active room meshes,
people and draws. Both reports completed with unchanged sources and no page,
HTTP, request or external-load errors. No bridge-sized script spike was observed
in these short settled samples; this is not a long-session leak verdict.

Interior profiles still identify traffic/static polygon collision as material
named JavaScript work while indoors. Much sampled time is unattributed
`(program)` or idle; it must not be assigned to a particular game function.
Software graphics and these short samples do not establish Intel N100 FPS.
ScriptDuration per render is distinct from total CPU, wall time or device FPS.

The exact retained reports are `capital-other-areas-baseline-20261116-a1/report.json`
(SHA256 `c7e17087272d5060ba94c4a6f1807e450a1710992bdf995b3760d3b2c267d4db`)
and `capital-other-interiors-baseline-20261116-a1/report.json`
(SHA256 `687b8a55137e78ffaa5f5bc6faf277c4530d092a9422cc99f1d1293777580578`).
Artifacts remain external to the repository.

The isolated route differential measured five long GPS queries at approximately
180 ms before /36 ms after A* search, while retaining optimal cost and reachability.
The six-officer navigation regression removes repeated BFS eviction:186 builds
before versus six warm fields for the fixed-target workload, with identical
waypoints. These are bounded source measurements, not whole-game FPS gains.
Across at most seven retained police room contexts, the two added fields cost
at most112 KB. No collision or traffic population was removed for those gains.

## Native evidence and retained failures

The city harness explicitly seeds prior wealth/equipment/checkpoints; none is
described as earned gameplay. House ownership and stash start empty. Actions
use normal DOM, keyboard/mouse, the real clock and authoritative writer.

The first burglary run used a source fixture missing boot roof/managed-shopping
preparation, so it arranged a different house door from the real game. That
fixture was corrected to match actual boot preparation. A retained favicon404
was an incomplete external source export, repaired before subsequent launches.

The second run proved native lock/entry, actual indoor search, exact bounded pay,
saved cooldown and denied repeated search. Police then arrested the player during
the attempted exit and charged$250. The run remains failed as an escape test;
the arrest is a real gameplay result, not a collision bypass or a successful
getaway. The harness now stops on recovery instead of continuing to drive the
released car toward the obsolete indoor waypoint. Clean escape remains unproved.

The final city run passed 37 checks in 121.88 seconds, with no page/console/HTTP/
request errors or external runtime loads and unchanged source hashes. It proves
far-purchase denial, actual $15,000 house purchase, a $1,200 hired guard, real phone
menus, vulnerable stationary-body drone controls/recall, owned-room entry,
weapon/cash/ammo transfers, a real carried/stashed split across reload, N input,
and native grenade debit/fuse/burst followed by normal P pause. Its retained
`capital-city-native-20261116-a3/results.json` has SHA256
`bef2a684099f52c3d0c8c6df1dae313ea30dbc5f3f429bc9115c6c9dc7ef0888`.
Enemy damage during flight remains owner-test evidence, not an arranged native
attack in this run. The first city attempt stopped on a test assertion typo;
the next passed the core flows but missed a brief burst during redundant driver
snapshot/focus work. Removing that work lets the real P input preserve the burst;
no runtime clock, explosion duration or immunity was changed for capture.

The current workplace run passed nine checks in 180.13 seconds, including actual
Bunda walking and E into Lambzhou, with no page/console/HTTP/request errors or
external runtime loads. Its retained `capital-workplace-native-20261116-a1/results.json`
has SHA256 `8fd074d63b2ec2d3d3945e15289416f55eba5fba6b15e7b28feac01ead027939`.
It seeds Rowan's first intro prefix and checkpoint, and proves physical travel,
not earned progression. The furnished house entry preview passed 12 checks in
72.34 seconds; `capital-house-native-20261116-a4/results.json` has SHA256
`8cfae31a6add3d2307aaa4ea8a04663e951469c1266afa2fd91f19eb9504cb16`.

Entry previews are explicitly limited to native lock/entry, physical walking and
room rendering. They do not claim loot, earnings, cooldown or escape acceptance.
An entrance-camera heading issue was corrected after visual inspection, and
wide houses now place useful furniture near the entrance. Preview-only scope is
separate from the unchanged full burglary flow.

## Reproduction and release continuation

Use the local [skill](../../.agents/skills/capital-drive-development/SKILL.md) and
its [workflow](../../.agents/skills/capital-drive-development/references/workflow.md).
Run one heavy browser, benchmark or source gate at a time. Keep output external,
source exports exact, failed attempts intact and configured private inputs out
of reports and captures. Refresh the game cache after final runtime edits and
the Git-backed maintenance inventory after committing source. The final closure
is128 files /17,270,462bytes, version
`d084a06d8c8345ce134cbf8a91f2b79982303849ef0049b26e7f40171842bfc2`.
Maintenance coverage passed140 game manuals /134 registered entries; the sitemap
passed134 Git-backed URLs. No new game was registered.
