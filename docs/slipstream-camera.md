# Slipstream: road-leading chase and driving cockpit

Owner reports that the camera feels stuck centering the car and that there is
no cockpit mode. This scope changes existing Slipstream225, not its physics,
economy, save schema, catalog, private phrase, vendor bytes or other games.

## Root cause and minimal patch

`view.draw` previously recomputed a rigid car-yaw chase position every frame.
Garage orbit existed, but no driving camera choice; parked showcase cockpit work
was not driving integration. Both City and highway camera paths are now shared
at the actual view boundary. Chase eye, heading and aim use bounded time-based
exponential following, shortest-angle yaw across signed PI, modest speed-based
look-ahead, and a lower-screen car composition. Highway lane changes have lateral
lag and steering lead. City resolves the existing full-footprint obstruction
ray **after** smoothing, preventing interpolation through buildings. New runs,
view switches and garage return reset camera tracking. Controller passes zero
camera delta while paused/blocked/terminal; hidden/blur guards remain. Reduced
motion removes added smoothing. No uncontrolled shake, camera roll, grants or
changed world collision.

The renderer has validated `setCamera('chase'|'cockpit')`. Controller's in-memory
choice switches with C or the44px camera button while driving; native editable,
modifier/composition/dialog and key-repeat guards remain. Choice is retained
within the visit/retry, not written into the banked save. Garage remains its
original orbit and hides the driving toggle. The cockpit camera is at the
**physical driver eye inside the actual selected live car**, transformed with
its position/yaw, looking through its real windshield. Steering wheel, dashboard,
pillars and roof are original existing geometry, not a flat screen overlay.
Player-only glazing clone has .12opacity in cockpit/.38outside; NPC/shared glass
is unchanged and clones dispose exactly once. Near plane .025m,58° landscape
lens/70° portrait and slight2.29° roadward pitch reduce roof dominance without
hiding/cropping cabin or HUD. Full-window canvas/all menus stay intact; short
landscape HUD reserves room for the third header button. Phone controls remain
mobile-UA-only, not viewport/touch-driven.

## Shared factory boundary and provenance

Completed authorized explicit Codex/Astra/high worker21 owns only
`assets/car-arcade/models.js` and `scripts/test_car_arcade_models.mjs`, commit
`dd149815f14b13cccb8703240c541feb287836a1`, exit0/98.56752678798512s.
Main independently verifies36actualassistantrecords exclusively
`openai-codex-responses/openai-codex/gpt-6-astra`. Additive immutable cached
`userData.cockpit={eye,target}` is derived from existing16cabin profiles, front
seat/headrest/wheel/belt/roof positions, including short pickup roof. No geometry,
materials, transforms, textures, triangle/draw counts or cache ownership changes.
Actual windshield/opaque sightline ray checks and unchanged base16 fingerprint
`e74179a90ad7f865ae30dc7346c2da08968c56a01adfe958e0a8f91641966128`
pass across3cache recreations/249cachedresources disposed exactly once. Main
traces both Git-backed consumers (Slipstream and Garage view) plus Patrol's
Lantern reuse; Garage has no consumer of the added metadata and is not modified.
Heavy showcase factories were not substituted into the driving ABI.

Main implements actual view/controller/HTML/CSS and focused checks, commits
`c1c8b89` then framing/test correction `603f662`. Existing render regression
checks all16physical local-eye transforms with real Three matrices/raycast but
stubbed GPU, time-lag/PIwrap/pause/reset/city cover/private glass and exact-one
resource disposal: explicitly synthetic, not all16earned/native acquisition.
Pure clock/15core/9world/5traffic/base16/Patrol checks and syntax/AST pass.

## Native evidence and limits

[Retained process/source/model receipts and previews](slipstream-camera-previews/README.md).
First c1c8b89 native exit0/201.0496s, but Main rejected roof-heavy framing and a
City wall-facing capture. The test had also waited for a positive right-turn
heading even though `stepCity` subtracts steering; it waited through angular wrap.
Main corrected the sign, pauses captures, countersteers back to the open street
and requires baseline-relative actual cockpit movement, without injected stepping
or deadlines changes. It narrowed/pitched the actual cockpit camera, not hiding
roof meshes or faking visible driving. Initial technical pass is retained as
historical, not final framing acceptance.

Final frozen `603f662108b536db7148c740efa51a21d9e92e66` native **exit0 /
209.901016253978s**, HEAD unchanged, errors[], assistedfalse. Real City turn lag
.06849946932084972rad, cockpit W/genuine held-phone Gas movement, C/button/tap
switches and paused camera/run freeze; all three ordinary modes, City20m bank,
Cutup realpolice/unpaid abandon, ordinary1200m Sprint53.72620056592859wallseconds,
once-only940cash, same-mode retry/save/reload/Help/focus/fullwindow/both themes/
320/390/844bounds/44pxtargets/header-HUD nonoverlap. Readiness20s/race110s/outer240s
remain unchanged. Source hash includes shared model. Native car is the earned-play
starter; all16physical transform/geometry coverage above is synthetic, not native
whole fleet/campaign proof. Real portal native **exit0/77.56651780300308s** on the same frozen603f662,
HEAD unchanged, realcurrent-tabfullscreen/garagefirst/Drive/4traffic/local/noerrors.
Current unchanged full116releasegate frozen9b402829ec06c33bd94937e032209055464d2a7a
**exit0/1457.6410388989607s/116of116pass**, restoredcleanbaseline/minfree2442944512;
[complete receipt/status manifest](slipstream-camera-previews/README.md#current-full116-release-gate).
Source/waits/filter/exclusions unchanged. Ovo passed unchanged; its historical
15stimeout was not erased or diagnosed as fixed. Normalmainpush/remoteexacthash
verification follows docs-onlyreceipt; transport is not hosting verification.

Cabins/cars/scenery remain stylized, no new instruments/animated hands/free-look
or detailed live fleet promise. Physical phone/Safari/GPU/FPS, natural Cityescape,
full campaign/equipment/rights remain held. Circuit Ward animations remain
unimplemented; its separate model-route approval/default-worker quota hold and
84/122initial game audit/38missing reports are not cleared. No new games.
