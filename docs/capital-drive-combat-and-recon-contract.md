# Capital Drive: vertical combat and crew reconnaissance

15 November 2026. Continuation of the existing owner-authorized Capital Drive245
preview. This adds vertical aiming, bounded shooting feedback, deliberate crew
reconnaissance, a separate evidence-case task and actual Pink Earmuffs victories.
It adds no game, source-geography import, runtime remote request, external asset,
physics dependency or second animation loop. The existing
[arms contract](capital-drive-arms-and-streets-contract.md),
[story contract](capital-drive-story-and-streaming-contract.md) and
[crew contract](capital-drive-crew-and-city-contract.md) retain their other limits.

## Input, camera and shooting authority

`script.js` owns input, camera, HUD, sound and the single RAF. On foot, hold Z or
right mouse to aim; mouse movement changes yaw and elevation. Page Up/Down and
the touch LOOK stick also change elevation. Left mouse or FIRE uses the selected
weapon; F punches. Aim pitch is positive upward and clamped to70degrees in either
direction. Activity, passenger, recovery, tutorial and protected-job guards still
apply. The Pink victory stages permit fists and deny firearms through Gameplay's
injected `canFireWeapon` guard.

`camera-control.js` supplies bounded look deltas, the shoulder-camera frame and
an exponential blend based on supplied render dt. Aim brings the camera closer
and eases its field of view from58to50degrees. Indoor camera placement retains
the room sight check and close-camera fallback; workout and cinematic framing
retain their own existing branches. This is a third-person camera: its shoulder
offset and look target are not a guarantee that the centre-screen mark exactly
matches every muzzle ray at close range.

`gameplay.js` owns ammunition, reloads, cooldowns and successful firing attempts.
Held fire preserves elapsed cooldown across fixed steps, with a bounded catch-up
loop and one actual round consumed per emitted trigger. Shotgun pellets share
that one round; at most six pellet rays are generated and the same person is
not damaged repeatedly by one trigger. The original four weapon profiles,
independent ammo pools, ownership checks and offence attribution remain.

`ballistics.js` produces normalized three-dimensional rays with deterministic
weapon spread. Their origin uses the actor's x/z, supplied ground or room floor,
1.35m muzzle height and current jump height. Range is measured along the full
ray. Upright capsule intersections use each live adult's feet height, body
height, radius, health and logical room. Gameplay selects the nearest eligible
body before the nearest obstruction. An upward miss cannot become a horizontal
cone hit on a grounded person.

The controller aggregates outdoor pedestrian, fictional dealer and displaced
Yoober-driver targets, or only the active room's people. Gameplay adds live
same-space dismounted police. Each adult owner exposes read-only shot descriptors
and revalidates the selected live body before applying damage; render snapshots
and caller-provided hit booleans cannot award damage. This does not add damageable
ambient seated car occupants, destructible scenery or vehicle damage from bullets.

## Physical cover and bounded presentation

`shot-obstacles.js` indexes existing building/barrier polygons in64m cells, keeps
polygon holes and roof thickness, and tests actual ray elevation. Outdoor ground
intersection uses bounded samples with a binary refinement. Generated rooms use
their wall/furniture boxes, floor, ceiling and logical outer boundary. A doorway
does not merge the exterior and another room into one target space.

Each firing attempt also supplies current nearby vehicle poses, including buses,
Yoober, patrols and aircraft, with oriented body dimensions and actual altitude.
Cars can block a chest-height shot while an above-roof ray remains clear. Police
use the same cover adapter on their firing cadence. Any occupied-target vehicle
exemption is explicit and limited to that vehicle ID. The solids are simplified
arcade bodies; this is not exact mesh-triangle collision or bullet penetration.

`actor-view.js` uses the existing articulated adult and four original merged gun
silhouettes. Aimed and firing arms follow the supplied pitch. Supplied combat
feedback drives visual recoil; a fresh shot serial and a live matching trace
start a55ms supplied-dt flash at the transformed barrel tip. Traces retain exact
world start/end heights and true three-dimensional length. Legacy descriptors
without heights keep their previous ground-relative defaults; explicit invalid
heights are rejected.

Gameplay keeps at most16brief trace descriptors. Each actor view retains its
existing eight trace instances. Its existing impact batch has fixed capacity16,
covering trace endpoints, the four existing police muzzle slots and the player
flash without another draw. There is no frame-time geometry/material creation,
texture, point light, independent clock or additional RAF. Empty room-filtered
inputs, culling and disposal clear presentation; player ragdolls, police-room
visibility and vehicle occupancy retain their original owners.

The reticle shows an actual-hit cue from Gameplay's successful attack event,
with a reload progress display and dry-fire message. Reduced-motion preference
suppresses reticle recoil scaling. With the existing Sound control enabled,
local synthesized shot, reload and dry-fire cues use a fixed six-voice cap and
one reusable noise buffer. Ended voices disconnect their nodes. Audio remains
optional and browser audio admission still applies; no downloaded sound is used.

## Simulation cadence and projection allocations

The controller retains1/60second simulation steps independently of display
quality. Its RAF delta is capped before accumulation. `render-gate.js` adds a
supplied-timestamp frame pacer that keeps cadence after small late frames and
skips catch-up rendering bursts after long stalls. Performance, low and standard
profiles retain their20/30/60fps targets and existing resolution caps. Static
paused menus still render only when their revision, tracking, cinematic or
pending-chunk state needs a frame; hidden tabs retain their pause/input guards.
These are scheduling targets, not measured device frame rates.

The recon subject projection reuses one controller-owned `THREE.Vector3`, updates
the camera matrix before projecting and hides an off-screen subject. It does not
allocate a projection vector per frame. Combat DOM references are cached and
unchanged values/styles are not rewritten. This narrow allocation statement does
not claim that the whole controller or Three.js renderer is allocation-free.

## Deliberate reconnaissance and evidence receipts

`recon.js` owns observation timing, scan edges and transient receipts. A marked
subject must be framed on foot in Campaign, outside interiors in the matching logical space,
with a clear physical view, living actor and no recovery. Current mission guides
require a2to18m stand-off and1.1active seconds of steady observation. Position,
speed and angle tolerances reset an interrupted view. Pausing, recovery, a changed
mission/stage or leaving the valid context cannot produce a scan receipt.

Waiting only readies the scan. A fresh I press or SCAN action after readiness
creates a receipt bound to mission ID, stage, target ID, logical space and serial.
Holding I early cannot bank a later automatic success. The phone's recon action
closes dialogs and returns focus to the camera. The world subject marker, steady
progress and ready state describe that same live objective. The scanning panel
and close camera appear only on foot within40m of the subject; driving and far
travel retain normal map/route guidance. During nearby framing, the route card
is hidden so it cannot overlap the camera panel. Physical cover and
smoke can block observation. Cheap distance, facing, speed and steadiness checks
run before physical sight: far travel and unframed views perform zero map rays.
Authored distances are sanitized to2–18m, nonfinite heights are rejected, and
the controller rejects any invalid or over40m three-dimensional recon ray before
smoke, vehicle or solid queries. This guard does not shorten weapon/police rays.

Campaign accepts only a fresh matching documented receipt for the current recon
stage. The controller similarly accepts an evidence receipt only from a completed
live `interior-activities.js` session at the exact active room's evidence station,
for the current evidence mission and living on-foot actor. Session IDs prevent
replaying the same completion. Neither receipt owner writes career cash or saves.

Coals contains a separate original ledger-case prop and task station. E or Q
starts it within reach. X/Y change the displayed dial value, with release and
settle phases between input edges; ArrowUp confirms each displayed channel.
Wrong, overlapping or early input resets the sequence and consumes the existing
mistake allowance. Three matching channel confirmations produce `secured`.
It is a separate task from the till handover and ordinary paid stock work.
An independently completed case task gives no mission-bound evidence or wages.

## Ordered crew chapters and Pink Earmuffs

The existing first nine shared chapters and strict saved prefixes remain in
order. Four chapters append to them, giving13shared chapters and20entries in the
developer chapter list: six introductions, the crew meeting and the shared arc.
Preview entries remain transient and cannot bank career completion or rewards.

| Shared chapter | Required action |
| --- | --- |
| 10. Paper trail survey | Rowan documents the fictional Book Moo collection notice and its separate departure sightline. |
| 11. Exit interview | Milo separately documents the safehouse escape approach and Kingston handover sightline. |
| 12. Sealed account | Kit completes the Coals till robbery, secures the separate evidence case, then escapes to Red Hill with the search clear. |
| 13. Pink Earmuffs rematch | Rowan wins the actual Lambzhou booth fight, then leaves on foot and clears the search. |

Recon prepares the ordered score through required campaign progress. It does not
silently grant loot, teleport the crew or substitute a caption timer for the
robbery, case or getaway owners. Existing campaign completion events and the
single career writer bank only the final chapter result.

Both the modern lunch encounter and appended rematch require `noodle-victory`.
Dot first throws the bowl, then uses readable melee windup/recovery phases and
checked movement on the room floor. F punches deal the ordinary25damage. Victory
requires an actual zero-health knockdown after at least two attributed player
fist hits following the bowl throw; with full health this takes four normal hits.
Dot throwing, landing her own punch, waiting or simply receiving two hits does
not win. Campaign also validates the matching mission, room, store, completed
encounter and fresh serial before advancing to the separate exit stage.

Interrupted throws, early knockouts and disallowed hits enter retry. Speak to
Dot and explicitly choose Rematch to reset her fight health, transient damage
and hit count for a new session. Opening the dialogue alone does not reset her.
A rematch cannot heal or reposition the player. Completed modern victories do
not automatically heal Dot into another active fight or emit repeated receipts.
Legacy non-victory encounter behavior remains separately supported.

## Reproduction and current evidence limits

Run from the repository root, using the existing local Node/Python tools:

```sh
python3 -B scripts/check_capital_drive.py --dry-run
python3 -B scripts/check_capital_drive.py
node scripts/test_capital_ballistics.mjs
node scripts/test_capital_dynamic_shot_cover.mjs
node scripts/test_capital_adult_shot_targets.mjs
node scripts/test_capital_combat_presentation.mjs
node scripts/test_capital_camera_control.mjs
node scripts/test_capital_combat_controller.mjs
node scripts/test_capital_recon.mjs
node scripts/test_capital_recon_heists.mjs
node scripts/test_capital_evidence_activity.mjs
node scripts/test_capital_pink_victory.mjs
```

The native harness serves the repository temporarily, blocks external runtime
requests, records observations/source hashes and closes its browser/server. Use
a fresh output directory outside the repository; this is a relative example:

```sh
timeout 600s python3 -B scripts/test_capital_combat_recon_browser.py --capture --output ../capital-drive-evidence/combat-recon-native
```

`--scenario aim`, `recon`, `case` or `rematch` selects one bounded flow. The aim
flow starts fresh Free roam and checks real upward/downward firing, held fire,
keyboard and touch elevation. Its live-body hit cue can remain explicitly held
when no unobstructed sample target is available. The other flows seed accepted
chapter prefixes and structured exterior checkpoints. Their prior missions and
travel are fixtures, not naturally earned in that run. Scans, room entry, case
inputs and Pink punches use actual browser controls and clocks.

The intended native scope is a completed two-scan survey, a standalone case task
and a real Pink KO advancing only to its exit stage. It does not establish the
whole sealed-account heist, a mission-bound native evidence receipt, the final
rematch reward or natural completion of all13shared chapters. Captures cover
selected desktop/mobile and light/dark states, with at most six frames.

The [verification receipt](verification/capital-drive-combat-recon-2026-11-15.md)
records351final source commands,48combined native checks and16final recon checks,
plus two matched candidate profile runs. Actual hit/cue proof is retained from a
same-runtime attempt with an unrelated later navigation failure. Source/counter
checks prove the final recon sight bound; inactive Free-roam profiles do not
measure that mission path. Audible quality, whole-campaign native completion
and Intel N100 frame-rate improvement remain unmeasured. Software WebGL, source
hashes, CPU samples and target-hardware FPS remain distinct evidence.
