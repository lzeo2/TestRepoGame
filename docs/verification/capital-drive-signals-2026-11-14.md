# Signals, contacts, transport and hold-up verification

14 November 2026, Australia/Sydney. Continuing Capital Drive 245 and the owner's
standing push/merge-all order. No new game, registration, package, remote runtime
service, source-road/building/terrain rewrite, shared car-factory change or proxy
change. The [contract](../capital-drive-signals-transport-crime-contract.md)
records player controls, source limits, cash/physics authority and reproduction.

## Diagnoses and resulting behavior

The starting position was already clear in the actual expanded/profiled geometry,
including 554 pool/campus/skate/Civic/noodle barriers,887 parked descriptors and40 cars.
Forward/reverse first-second movement passed before the fix. The controller loaded
a saved zero-condition Lantern and supplied brake continuously. Explicit career
start now repairs only that wrecked starter to 35%, announces it and saves normally.
Healthy condition/paint/cash/jobs/other wrecks and denied-save guards remain.

Independent exact old-code failures proved unchecked post-translation traffic yaw,
pre-translation player steering, static building/fence/water road conflicts, false
opposing-lane leads and crossing-yield overshoot. Checked angular steps, bounded
static ambient-lane admission, clear opposing-lane classification and a hard yield
travel cap fix these without removing physical objects or teleporting visible cars.

Measured factory models were larger than uniform4.5×1.8 bodies; walking's old 1.8 m
circle missed vehicle ends and also created overly wide side clearance. Fleet-sized
bodies, swept circle/oriented-box walking and rotated full-body parked indexing
now cover all six models, active player/traffic/parked/abandoned/bus/ride descriptors,
fast/diagonal/corner contacts and steering. New tests also preserve clear walking
space beside bodies and prove zero distant reads with2,000 far parked descriptors.
The full geometry fixture audits 7,200 frames with all40 bodies clear, all40 cars
progressing over 30 m excluding refresh jumps, and 1,279 selected static-clear lanes.
Final stopped 60/120 counts 13/15 include legitimate queues. Separate map-only old
junction/parking fixtures remain strict and pass; their counts are not citywide FPS
or a universal no-congestion claim.

339 exact OSM nodes from 34 pinned source tiles produce 347 heads/96 estimated groups.
Source metadata/coordinates/hash and conflict-phase, upstream stopping, amber,
committed clearance, pause/reset and external full-body caps pass. Nearby heads
use five pooled draws. Source positions are real; timings, grouping and sidewalk
offsets are estimates. No player auto-brake or remote runtime request was added.

GPS compiles route turns/along-route distance; yellow map/minimap and SVG HUD arrows
show direction/metres. Live Yoober map tracking advances one world clock with
player input frozen. Purple car position/map centre are observed together. Root
removed duplicate/overlapping store labels and added collision-aware label placement;
final dark/light desktop/390px frames were reviewed.

Continuous ride lookahead reduces OSM-vertex hesitation: the controlled actual 534 m
fixture measures135.15→81.57 simulation seconds, slow time32.88→12.17 seconds. Corners,
blockers and red/amber caps remain. Nearby user cancellations may provoke one
bounded fictional driver; remote/sandbox/recovery/mode cancellations do not.
Combat, LOS/cooldown and swept body authority pass; three view batches remain.

Buses expose actual front-left doors, bounded braking requests, stopped boarding,
live attachment and clear swept exits. Native rides are free fictional gameplay;
the circuits are not real timetables. View budget is at most 5 draws, 2,372 template
triangles,5 geometries/2 materials after its lazy passenger. The player uses chase/orbit,
not a new interior-camera mode.

Scanner/flare purchases, strict legacy-compatible gear and failed-placement no-spend
guards pass. Normal inventory caps 12; three transient 20-second beacons render in
four lightless pooled draws. NPC patrol markers need scanner ownership for distant
or occluded coverage. Actual employee/pedestrian callbacks bind threat, health,
room/store, reach and serial throughout phased handovers. NPC modules only animate;
Progression/the existing writer own a single payout and strict 180-second cooldowns.
Actual attributed punches authorize fists; equipping a gun plus deliberate demand
authorizes firearm intimidation. Cancel/death/leave/recovery/sandbox cannot pay.

## Code and source checks

`python3 -B scripts/check_capital_drive.py`: **185/185 commands PASS**, exit0.
56 module syntax checks,64 suite syntax checks,64 pure suites and diff check.
Full log SHA256 `d787b25c2817e7e9e4ad0a38530a089fb57508ba8edb811f3b361ebac0024da9`.
Later map-label/theme/capture/optional browser-selector changes received fresh
syntax/diff and native tracking review; no physics assertion was removed.

The initial complete attempt stopped at129/185 because an old ride test required
the literal 4.5 m body after the real descriptor became 4.66 m. The test now verifies
the forwarded length equals the actual descriptor, retaining movement-stop checks.
Historical yaw fixtures explicitly preserve their captured 4.5×1.8 size; the obsolete
foot-circle side expectation now tests the real Atlas side. Eight legacy simulation
test imports now resolve local dependencies directly, retaining their assertions.

Signal sidecar SHA256:
`b78aa692fdb71f7bc77721759eb08231815914a0f850f6ca1705b0d012e74ae3`.
Its 85,596 bytes rebuild exactly from external cached tiles using only standard
Python. Source base/north hashes are pinned; no new data download was needed.

## Native normal-input results

All successful complete reports below use normal keys/mouse, actual clocks,
detached snapshots and fresh external outputs, with no wallet/save/position grants.
Contexts/browsers/temporary servers close. Each reports no page/console errors,
failed requests, HTTP errors or external runtime attempts.

| Complete case | Checks | Seconds | Report SHA256 |
| --- | ---: | ---: | --- |
| Core starting car/live tracking/GPS/signal phases |30|149.76|`edc28b01a17278d09835dc2f278e9c1ff968fa28a8703ac1dc62ee9635b601cf`|
| Independent Free-roam flare preview |10|43.58|`c6b2071176bde7c0fec8696e7b8c2422bb82110782be90ab6b30699c0a2704ee`|
| Bus boarding/travel/braking/exit and flare tail |18|79.51|`6b6eb087e2a97cc0238739cd0ce3bd908e35c4e82c8837fd49012d25c21911a9`|
| Coals employee hold-up retry |29|270.61|`bb282c45e0e535500c8a4e7ad146a0208672800287a044c3cf727853fc33b56a`|
| Final dark/light tracking/map review |17|55.17|`3d309d4471226eacf3c8f6635b7539cfbd983064b0a42428fd0e60f99d2cd542`|

These five complete runs total 104 checks. The core starts the untouched car with
W, brakes/exits, requests a real ride and proves car/traffic/signal-clock movement
while held W leaves the mapped player still. GPS direction/distance changes on
real driving. A source head changes green→amber→red on its actual clock.
The bus case uses normal Free-roam map travel, clear parking, stop E, door walk,
board E, over 8 m actual travel/focus following, moving E braking and stopped E exit.
No career money changes. Three real B throws/cap/lifetime/view checks are sandbox
preview evidence, not proof of purchasing paid equipment.

The initial combined crime run actually completed pedestrian ped:6 mugging:
F caused its recent-punch threat, E bound its live ID, all phases were observed,
cash $1,000→$1,045/cooldown were saved, wanted rose, and repeated E paid nothing.
That run is **overall FAIL**, because its later shop walk met a shelf 0.65 m short
of the exact counter target. Its70 prior assertions are not added to the 104 complete
checks. The failed report remains:
`4b00f348e246d20a2eb50653dda87857b341c4949cb2f2922ceaed5cc53d0b2d`.

The shop-only retry took the center aisle normally, entered actual Coals, punched
the actual employee and demanded the till with E. It proved E cancellation without
pay, same-target restart, all phases, one $220 handover ($1,000→$1,220), saved cooldown,
police response and no repeat pay. No gun/save/travel grant was needed.

## Retained failures, review and limits

Two early bus approaches failed honestly: an actor stood 7 m from the door outside
the original 6 m controller admission, then a closer parked car blocked the true
door sweep. The controller's request range now matches the bus owner's 10 m API;
actual boarding still needs stopped close clear reach. The next bounded run kept
the original clear 3.8 m parking and passed. Neither collision nor reach assertions
were removed. All failed artifacts remain separate.

Read-only review found nearby bus admission stealing E from rental dismount.
Root excluded busy states; executing the actual handler proves busCalls 0 and one
rental dismount. Seven targeted suites and script syntax passed. Root inspected
signal, GPS, bus, dark/light tracking and crime frames. Crime HUD/phases are clear,
but the player partly hides the mugging victim and a deliberate camera turn clips
the shop employee at the right edge. Those frames do not establish visual polish.

Long routes, every controller group, all models in native play, paid scanner/flare
purchases in this run, native driver rage, touch travel/combat and N100/native-GPU
FPS remain unmeasured separately. Simulation seconds and geometry/draw budgets are
not frame-rate or total-RAM measurements. Historical fleet 123/133 certificate
failure HOLD remains separate under the continuing targeted merge order; no fresh
all-games PASS is claimed.

## Milestones

M42 `ea7df461`; M43 `a67dba47`; M44 `4904db69`; M45 `b48f97e1`; starter `ef63dea8`;
M51 gear `3f125049`; M50 bus `8d1e4b90`; M49 driver `342e567f`; M47 rotation `34b8be41`;
M52 routing `b23dc683`; M56 people `26bee220`; M55 economy `ba3f2457`; M48/M57 harness
`f9aa249c`; M54 contacts `55fe4f42`; M58crime harness `cc561bb9`; root integration
`03b33224`; M59 theme captures `5ef4d1d7`. M46/M53 were read-only diagnoses/reviews.
Workers used disjoint paths, bounded tasks, explicit commits and exclusive index
windows, and did not push. Root owns integration, written contract/manual/skill,
inventory and shipping. Release/merge/live hashes remain external facts recorded
after deployment. Original sparse selection is restored; no test server remains.

Catalog uniqueness/schema/Git paths passed for134games; maintenance passed140
projects(134registered/sixunregistered), and the134-game sitemap plus portal passed.
Tracked Capital Drive payload12,735,668→12,899,894bytes(+164,226); the signal sidecar
is85,596bytes. No game was added. All other source geographic data and protected/
shared paths were unchanged. Existing raw developer caches and captures remain
external; no installed package or persistent server was added.
