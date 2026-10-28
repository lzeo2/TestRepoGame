# Citisten visual-clock scheduling diagnosis (#61)

## Result

**Confirmed source bug: native can sleep with an unsettled visual clock, then
change whole-scene lighting on an unrelated input wake while simulation stays
paused. This is NOT a demonstrated cause of the user's shaking or artifacts.**

No product patch. Only the new `scripts/citisten_visual_clock_check.mjs` and this
receipt are owned. Parent owns native/manual/checkpoint integration and actual
review. Astra's render-temporal lane is separate and untouched. Whole-world
shaking, unusual artifacts, native Water/Save/Continue, pixels/GPU/FPS remain
**OPEN / UNPASSED**. The user will check the site; original entry is still unknown.
Paused versus unpaused behavior and an optional shot remain useful observations,
not new host-approval prerequisites. No obsolete ticket is used to block review.

## Identity and source

- Model `gpt-6.1-sol`, selected high; no model switch or subagents.
- Session `01a184a5-99b6-706a-a6a4-a47dec792b43`; harness log basename
  `2026-10-28T22-33-27-737Z_01a184a5-99b6-706a-a6a4-a47dec792b43.jsonl`.
- First command 22:33:32 UTC, 2026-10-28; hard ten-minute deadline 22:43:32 UTC.
- Source HEAD `9d959b73`; game tree
  `ff06ce5f68cbf300d93fd55c5a8396ed563d3cd4`, 228 files / 35,188,315 bytes,
  matching the canonical inventory. No game source or inventory changed.
- Existing publication `017e4a47` / `d3dbb39e`, 233 hashes / 80 MIME checks and
  independent 8/8 remain prior evidence, not fresh tests here. Downloaded v2 is
  unchanged. No remote requests, browser, server, install, export, large copies,
  off-host transfer, peer contact, push or screenshot.

Read AGENTS, CODE_QUALITY, maintenance entry/current complete game manual,
relevant inventory, Continue-loop diagnosis/check, native/loop/daynight, prior
camera/world diagnoses, motion integration/check and daynight/budget intent.

## Causal source path and intended behavior

1. `daynight.mjs:3-7,40` identifies a visual-only clock, initializes it to `.5`,
   and maps new defense to `.27`, night to `0`, free play to a cyclic sim-time
   target. Gameplay/saves do not own this interpolated renderer phase.
2. `daynight.mjs:75-78` uses shortest circular distance and caps transition rate
   at `.08` phase/second. Maximum circular distance is `.5`: **6.25 seconds**
   of delivered visual dt can be required. `.5 -> .27` requires 2.875 seconds.
3. `native.mjs:112,125` skips simulation update when privately paused but still
   calls `dayNight.approach` unconditionally whenever a sim exists. Only its dt
   is capped to `.25`. The approach return value is daylight, not settledness.
4. `native.mjs:138` returns busy for running nonlost simulation, shots or camera
   motion, NOT residual visual-phase error. `native-loop.mjs:22-24` consequently
   sleeps after two otherwise-idle seconds. No timer subsequently settles light.
5. `native.mjs:55-83` reuses the world across start/restart/Continue, updates lamps
   from the old daylight, but never resets/approaches its clock in `start`.
   Actual UI `onStart`/`onRestart` at line145 and Continue listener at166 converge
   on this function. Tests execute those ordinary source handlers.
6. `world.mjs:135-143` consumes ambient/sun values, follows light shadow cameras,
   updates building emission, lamps, atmosphere and fog from this shared clock.
   These are whole-scene shading inputs, not world/camera geometry transforms.

The budget receipt documents settling camera easing and pending shots before
sleep, without freezing active simulation. The daynight API calls this a visual
clock independent of gameplay. No inspected requirement says pause intentionally
freezes illumination at an arbitrary intermediate phase. More decisively, actual
native tick continues changing that phase during private pause and on later wake.
This internally inconsistent settlement is the demonstrated bug. A deliberate
pause-look policy would need an explicit separate decision, not inferred intent.

## Executable reproduction

```sh
node --experimental-vm-modules scripts/citisten_visual_clock_check.mjs
```

Reuses `runContinueScenario({onMounted})`. Its actual native/UI/tick, scheduler,
simulation, roads, snapshot and persistence modules execute; the existing fake
world's `dayNight.approach` stub is explicitly replaced with actual
`createDayNight(new THREE.Scene())`. No copied tick or new test framework.
Unique native source anchors guard ordering/predicate/start routes. Full snapshots
are read via the actual simulation's `snapshot()`, never granted or edited.

DOM, world rendering, input propagation and RAF delivery are doubles. The fixed
camera and static landmark use real Three CPU matrices but are fixture objects,
not a claim of real native world transforms or pixels. `setPhase` is used only
for declared CPU setup/reset/circular controls. Native handlers create towns,
select speed, pause, Save, Continue and restart; this is not physical-browser-input
or model-pixel acceptance.

| Case | Dense positive-dt callbacks | Sleep phase / target | After one later input-wake window |
| --- | ---: | --- | --- |
| New defense speed0, constructor `.5`, 60Hz | 120 over exactly 2s | `.34 / .27` | `.27` |
| New defense speed0, explicit `.5` reset, 120Hz | 240 over exactly 2s | `.34 / .27` | `.27` |
| Actual night Save/Continue speed0, 60Hz | 120 over exactly 2s | `.32 / 0` | `.16`, still unsettled |

Every window additionally has one initial dt0 callback, which is asserted not to
advance phase. Thus 60Hz means 121 callbacks total, not an exaggerated 120 frames
plus two seconds of sparse `.25` clamped callbacks. The first two cases establish
the time-based bound independently at 60Hz and 120Hz. A ten-second asleep interval
supplies no callbacks and makes no clock progress.

For the first case, daylight remains1 at sleep instead of the target's
`0.6843745344807767`. A plain captured click wake changes sun intensity3 to
`2.05312360344233`, environment1 to `0.7096245717223145`, and sky RGB, with
identical full snapshots, stored bytes and camera/projection/landmark matrices.

Night setup uses actual production simulation at10x with one delivered24s interval
to naturally reach night, then normal speed0/Menu Save/Continue. That **sparse
setup is explicit**, not the measured reproduction interval or evidence of typical
physical timing. Its render/light dt caps at.25, leaving clock`.48`; Continue
preserves it. The following measured windows are dense60Hz. Daylight1 at sleep
becomes0 after the later wake, sun3 becomes0, moon0 becomes.8 and environment1
becomes.08, still with unchanged simulation snapshot/save bytes/fixed matrices.
The naturally initialized new-defense case needs no sparse setup at all.

Additional controls execute the actual tick path:

- Private menu pause still approaches phase, proving it is not a consistent
  intentional visual freeze. Restart and new-mode start preserve clock identity
  and phase before the next callback, as does actual Continue.
- Running simulation, pending shots and camera movement each keep callbacks
  pending beyond three seconds. Shots/camera are explicit fixture inputs.
- Circular `.98 -> .02` and `.02 -> .98` take the short path. Antipodal `.5 -> 0`
  with dt.25 produces `.48`, validating the signed tie and circular bound.
- A clearly labelled **counterfactual**, not production code: resetting the idle
  deadline through pending-frame wakes only while circular residual exceeds1e-9
  allows `.5 -> .27` to settle in173 positive60Hz callbacks. It uses the same
  native tick/clock/one scheduler owner. This illustrates residual-aware busy
  eligibility; it is not a shipped extra wake/RAF policy.

All original Continue scenario timestamps/assertions execute unchanged afterward,
including fresh-VM ownership, full sim dt versus render clamp, hidden/stopped/stale
callbacks and the9s-at10x completion proof. Native collector's existing500ms pause
and5s completion pins and all failed receipts remain untouched.

## Failure attempts and verification

First new check run failed `TypeError: ctx.arc is not a function` in the actual
UI night minimap. The existing fake canvas never covered combat and lacks `arc`
and `fill`. Only this new fixture extends its map context with those two no-op
methods. No production or old test edit, condition relaxation or error filtering.
Second run passed. Node emits its expected experimental-VM warning.

Observed commands/results:

```text
node --check scripts/citisten_visual_clock_check.mjs
  exit0
node --experimental-vm-modules scripts/citisten_visual_clock_check.mjs
  CONTINUE LOOP PASS: actual native/UI/loop/sim/save/roads; ...
  VISUAL CLOCK PASS: 60/120Hz stranded phase, ordinary wake lighting change with frozen snapshots/save/matrices; natural night Continue; private pause; restart/new mode persistence; 3 busy controls; circular wrap; labelled counterfactual; original Continue assertions intact
node Games/Citisten3D/native-check.mjs
  NATIVE CHECK PASS / NATIVE CONSTRUCTION MODELS PASS / NATIVE LOOP PASS
node Games/Citisten3D/world-check.mjs
  WORLD CHECK PASS
node --experimental-vm-modules scripts/citisten_motion_native_check.mjs
  MOTION NATIVE PASS: 14 callback checkpoints x observer off/on; ...
node scripts/citisten_save_resume_check.mjs
  SAVE RESUME PASS groups=5/5; CPU ONLY, ...
python3 -B scripts/check_maintenance_docs.py
  exit1: Missing docs/maintenance/games/001-brainrotboulevard.md
```

Five targeted Node executables pass, plus syntax. Catalog guard passes129 entries,
unique integer IDs/schema/Git URLs. Diff whitespace checks pass. The known missing
manual is not fabricated; parent retains manual/checkpoint integration ownership.

Read-only preservation verifies **233/233 frozen hashes**:228 local files and five
sparse Git blobs, without materializing absent fonts. Manifest SHA256 remains
`6f1e9460bd80692048064f9e311fe3f5bcf46c12844995d637448fba36bdf4a0`.
Game tree matches inventory; assets and original source freeze are unchanged.

## Minimal fix options for parent review, not implemented

1. Preferred bounded scope: include shortest-circular-phase residual in native's
   busy predicate, using a small settledness query/helper rather than treating
   `approach`'s daylight return as a Boolean. Keep runningSim/shots/camera, hidden
   suspension, dt0 wake and one-owner behavior unchanged. Test convergence and
   eventual sleep at60/120Hz plus pause/new/load/night/Skip-to-Night targets.
2. Separately consider snapping visual phase to authoritative target on new town,
   restart and Continue, if transition continuity across towns is unwanted. This
   fixes inherited phase on those routes, but alone does NOT cover an unsettled
   in-town transition followed by pause. It is not a substitute for option1.

Do not remove animation/render quality, add an always-running RAF, change saved
state, widen old gates or guess a camera/render correction from these numbers.

**This cannot explain `nativeWindowSaveContinue` completion failure at10x**:
that state already makes native return busy regardless of the light clock. Earlier
500ms/5s failures, invalid probe baselines and native/GPU holds remain exactly as
recorded. Neither new user symptom is attributed to this clock without website
observations. This is a distinct demonstrated source scheduling defect, not a
retroactive diagnosis of visual shaking, unusual artifacts or GPU stalls.

Initial root free bytes2,423,312,384; pre-receipt2,416,926,720, above the
2,147,483,648 floor, no waiver. Owned text growth is below1MB. Shared-host disk
changes are not solely this lane's usage. Exact final bytes, commit and completion
time are reported at handoff. Zero games added (neither ingested nor self-made),
zero screenshots/browser gates, no push. Other dirty paths belong to the parallel
render-temporal/parent lanes and are not staged here.
