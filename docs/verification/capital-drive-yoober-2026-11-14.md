# Yoober, trading and geometry verification

14 November 2026, Australia/Sydney. Continuing the existing original Capital
Drive 245 and the owner's standing push/merge-all order. No new game, catalog ID,
package, remote runtime service, third-party asset or source-map rewrite.
The [contract](../capital-drive-yoober-contract.md) records player controls,
money/physical boundaries, source limits and reproducible commands.

## Result and implementation

T's Yoober section quotes a destination and creates one physical NPC saloon.
The directed public-road planner assigns its approach and journey; swept vehicle
collision and stopped clear boarding/exits remain authoritative. Booking is free,
boarding charges once and actual cash uses the existing career writer. Supplied
passenger focus follows the live car; movement, jump, attacks and ordinary claims
are excluded aboard. The camera uses chase/orbit. Terminal phases release busy
state; recovery/mode/Free-roam travel resets the transient ride. Blocked traffic
can delay/cancel a trip; no teleport/collision bypass was added.

Two legal, owned four-door driver fares use existing transient jobs, strict v1
completed IDs and capped wallet rewards. Two-second stopped pickup/drop-off clocks
reset on departure/speed. Model binding, stolen/wanted/health/recovery/mode checks
prevent incomplete or invalid pay. A bounded adult waits at a clear source curb,
then appears seated. The view privately owns one car and three small batches,
with a tested maximum ten draws, seven geometries and four materials. Two thousand
booking updates do not grow its node/resource counts; disposal is isolated.

Wanted stars alone now permit food, weapons and ammo at the true purchase owner
and UI. Contacts no longer panic merely because of wanted state. Actual nearby
gunfire/damage still interrupts them. Reach, sight, interior, stock, ownership,
cash and ammo-capacity checks remain. Other safe work/ride/garage rules remain.

## Geometry and rendering

The paired merged base+north+terrain fixture measured world attribute bytes
534,265,329→286,722,933 (46.33% less), triangles 8,513,470→4,155,544 (51.19% less),
and meshes 3,127→2,194. At the spawn, visible world draws fell 93→61 and visible
triangles 433,881→181,728 (58.12% less). Neighbourhood attributes fell
36,342,540→19,630,188 (45.98% less), triangles 673,010→363,522.

Exact cross-quality terrain, footprint-wall, road, pavement and water attribute
hashes match. Accepted trees, school identity, fences/hedges/driveways and all
4,200 house-door descriptors remain. Ordinary facade/roof/tree subdivision and
tertiary ornament/visibility are reduced. The runtime boots Low geometry; the
normal constructor remains compatible. Low resolution is capped at 960×540;
Standard retains the existing 1440×900 target. Quality selection changes render
rate/resolution and does not rebuild city geometry. This measures attributes and
visible geometry, not total RAM, native-GPU frame time or N100 FPS.

Actual-map comparison command: `node scripts/test_capital_low_detail.mjs --actual`.
The retained geometry log SHA256 is
`bcc13dda6e727d538ee02fd3ab1c505eccc5dbf33fbabc90331bf72449c68fb4`.
No importer or source data regeneration was needed.

## Native normal-input evidence

The focused Playwright script uses normal keys/mouse, real clocks and detached
snapshots, with fresh external output and bounded context/browser/server cleanup.
No positive career save, cash, position, job completion or time grant was used.

- Passenger final: **20 checks PASS**, 237.50 seconds, exit 0. Actual on-foot
  pickup approach, phone quote/request, NPC approach, E boarding, full 534 m road
  journey, stopped arrival and E exit. Starting cash $1,000→$978 once; no earnings
  or completed jobs. 390/391 px UI/targets and visible marked car/driver checked.
  Report SHA256 `b8f8adb000ff7f202d752d397dddfc3a61822eb387e1ff41963fb18cbc86511f`.
- Driver final: **13 checks PASS**, 52.16 seconds, exit 0. Actual phone start,
  clear distinct curb waiting pose, rendered waiting adult, owned starter car,
  stopped pickup, visible seated passenger, normal short driving/stopped drop-off
  and $1,000→$1,045 once. Remaining at drop-off cannot duplicate pay. 391 px frame.
  Report SHA256 `95d4c4122252334718e44e20d9220e381e862d592f7a2f98c990aa7c16c67b27`.

Both final runs record no page/console errors, failed requests, HTTP errors or
external runtime attempts. Root inspected actual phone, waiting car/driver,
arrival and corrected curb frames. Small later phone feedback/Lemon expansion
changes have syntax/source review; screenshots are the preceding captured copy.
The passenger mouse-orbit correction landed after that context loaded, so its
native drag is unexercised separately. Source review/targeted checks cover it.

## Retained failures and review

Passenger attempt one passed 13 checks, including real boarding, single debit and
travel, then correctly failed: snapshot seatPose had a 0.38 m offset while the
allocation-free gameplay anchor used the car centre. Root aligned the detached
snapshot with the actual live chase-focus anchor. The test was not weakened;
the full final journey then passed. Failed report SHA256
`c84d34c9ee0717e8ba265fb3f0d7f496aac4bbf5a54fd140b9aab96a15054095`.

The first driver run passed 12 checks in 50.00 seconds. Root's visual review found
the waiting adult on the road-centre marker. A shared clear curb waitingPose and
an additional native assertion corrected it; the final 13-check run is separate.

Read-only integration review found two real controller gaps: distant waiting
rides intercepted unrelated E actions, and passenger drag used the foot branch.
Root restricted boarding interception to 3.5 m and routed passenger dragging to
vehicle orbit, excluding fire/aim bookkeeping. Both fixes were reread. Seven
focused suites passed, followed by changed gameplay/ride checks. New passenger
tests prove live attachment, no foot movement/jump/attacks/claims, unchanged ammo
and normal detachment. Ordinary wanted-denial expectations were updated because
the user explicitly changed that rule; wanted-five positive debits and retained
negative guards are tested, including no panic from stars alone.

The shared source runner passed **154/154 commands** on final integration:
51 module syntax checks, 51 suite syntax checks, 51 pure suites and diff check.
Final complete log SHA256:
`1a333d763359aa3eda9c2e14970ab7d3b01676eda439cc1558277a19ea77026a`.
Native evidence does not substitute for the code gate or claim
that long driver fares, every destination, passenger camera drag, touch travel,
native GPU/N100 frame rate or whole-city traffic are accepted. Existing independent
source-building/traffic holds remain. The historical fleet123/133 certificate
failure HOLD is retained under the continuing targeted merge order; no fresh
all-games PASS is claimed.

## Milestones and handoff

M35 physical rides `682e152f`, allocation-free getters `50c85992`, terminal fare
guard `c628d738`; M36 economy `7f71aa89`; M37 Low geometry `e4031cf1`; M38 art
`9b9ad899`; M39/M40 native harness `a851dc6e`; M41 read-only review. Root owns
controller/phone/purchase UI, attachment, curb placement and final tests in
`516131c8`, plus the written
contract/manual/skill/inventory. Workers used disjoint paths, bounded tasks and
exclusive explicit staging windows; none pushed. Art/source logs and the native
run manifest remain external. Original sparse checkout is restored after release.

Catalog validation passed for 134 unique registered IDs/schema/tracked paths;
maintenance passed 140 projects (134 registered plus six unregistered), and the
134-game sitemap plus portal passed. The tracked Capital Drive payload changed
12,697,795→12,735,668 bytes (+37,873); this code/data size is separate from runtime
geometry buffers. Source data files, protected Character AI, portal bundle,
disabled proxy and shared car factory were unchanged. No persistent test server
or installed package remains. Deployment/merge facts are recorded as external
release evidence after publication, without rewriting older release records.
