# Citisten camera and loop shaking diagnosis (#54)

## Result

**No ongoing shaking reproduced in the shared camera/loop CPU scope. No product
source patch is justified by these measurements.** The user reports a real visual
bug, but has not identified site versus private Chromebook v2 export, idle versus
input, or behavior while paused. This report does not reject that observation.
World/render diagnosis belongs to the separate lane; native/GPU acceptance and
the original Water/Save/Continue gate remain unpassed.

Only the new `scripts/citisten_camera_stability_check.mjs` and this receipt are
owned changes. `camera.mjs` and `native-loop.mjs` remain unchanged. No quality,
animation, LOD, DPR, simulation/save, model, native bootstrap or UI change. No
old-red/fixed-green claim: there is no demonstrated shaking root cause to fix.

## Run identity and inspected source

- Actual model: `gpt-6.1-sol`; sole session
  `01a17ca2-cf35-7315-a2db-13d2221fc715`, no subagents.
- Harness log basename:
  `2026-10-27T09-13-27-097Z_01a17ca2-cf35-7315-a2db-13d2221fc715.jsonl`.
- First command: 2026-10-27 09:13:31 UTC. Hard deadline: 09:25:31 UTC.
- Base: `de3ec4e6`; Citisten tree
  `cf589170731afb5e3f974305a449045fc225ac14`, 226 files, 35,157,269 bytes.
  Current Git tree matches `docs/maintenance/inventory.json`.
- Read repository instructions, code quality, maintenance README, complete
  999-line game manual, inventory, parent dispatch, camera/tutorial correction
  receipts and actual camera/loop/native/world/specimen/UI input call sites.
- The parent-owned untracked `docs/citisten-shaking-dispatch.md` was read only.
  Canonical manual/inventory and sister world/render paths remain parent/sister
  owned. No game source changed, so there is no new game inventory to refresh.

## Caller and ownership trace

`index.html` loads only `native.mjs`. `createWorld()` constructs one real Three
PerspectiveCamera and one `createFreeCamera()`. Native creates one
`createNativeLoop()` after assets/UI are ready. Native `tick()` calls
`world.render()` once, and render calls `controls.update()` once. Cached tracked
reference search found no other production controller update owner.

New game/restart/Continue call `initialTownPose(...), true`; camera-pad clicks
change the target without snapping. Native wraps `setPose()` to wake its existing
loop, not to create another one. Captured input/resize/blur wakes share that loop;
visibility suspends then wakes, and pagehide stops before world/UI disposal.
Synchronous save/message calls inside tick can reenter **wake**, whose current
in-flight guard already prevents duplicate scheduling. Update errors propagate
and clear that guard in `finally`; no speculative guard rewrite was made.

`world.html` separately loads `world-demo.mjs`, which owns its own single RAF and
an intentional optional sinusoidal tour. Native does not load that entry. Tour
input-version changes stop the tour. UI preview/QA RAFs are separate fixtures,
not another native update owner. The private export recipe was not needed for
this common-runtime test; export-specific source identity remains unverified.

`world.render()` updates projection only when CSS client dimensions change.
`pickLot()` updates world matrices for its raycast, not camera poses. Day/night,
atmosphere and building updates consume camera state; the sister lane owns their
render/light writers. Native passes full dt to simulation **before** its .25s
render/light cap; the controller independently caps camera dt at .1s. Neither
existing distinction was changed.

## Runnable measurement

```sh
node scripts/citisten_camera_stability_check.mjs
```

Imports the real vendored Three, real controller, actual landscape collision data
and actual native scheduler. Only event targets, pointer capture and RAF delivery
are fake. It never constructs a renderer or invokes native/world rendering. Each
sample records position, quaternion, `matrixWorld`, `matrixWorldInverse` and
projection after real `updateMatrixWorld(true)`. Output contains before/after
matrices, maximum adjacent component deltas, position-axis direction reversals
above 1e-10, sample counts and SHA256 sequence digests.

Sequence dt values are `[0, 1/120, 1/60, .1, .25]` seconds. Snapped pose is
`{x:5,y:215,z:180,yaw:.4,pitch:-.72}`. Unsnapped destination is
`{x:85,y:90,z:40,yaw:.9,pitch:-.4}`. A reversal during an intentional input change
is not an idle oscillation.

| Sequence | Samples | Maximum adjacent deltas / result |
| --- | ---: | --- |
| Snapped idle, each of five fixed dts plus alternating | 6 x 601 | Position, quaternion, world, view, projection all **0**; 0 reversals |
| Unsnapped settling, fixed 1/60 | 901 | Position/world 21.492558515314045; quaternion .03703408006670064; view 29.622333715449827; projection 0; 0 reversals |
| Unsnapped settling, alternating | 901 | Position/world 68.92143806957007; quaternion .11895572219908884; view 77.35451140641425; projection 0; 0 reversals |
| Normal input replay | 2 x 2,674 | Position/world 91.51925843843057; quaternion .05535558437777402; view 65.6518974754157; projection 2.665803839085176; 9 intentional direction reversals |
| Pointer yaw crosses pi | 601 | Position/projection 0; world .03936636487395381; view 7.091337811648549; final yaw error 0 |
| Actual landscape feature clearance | 601 | Position/world/view 6.3475266975319755; quaternion/projection 0; 0 reversals; final clearance exactly 2m |
| Actual loop driving snapped camera | 68 | All matrix/pose deltas 0; no duplicate pending callback |

Fixed settling ends at position error `6.394884621840902e-14`, angular error 0.
Alternating settling ends at position error 0, angular error
`2.9802322387695312e-8` radians (acos roundoff). Position error and quaternion
angular error converge monotonically within the stated numeric tolerances.
Both input replay and near-floor final 120-sample tails have exactly zero deltas.

Input sequence: W, A, S, D individually held for 30 alternating-dt updates,
keyup then 180 settling updates each; editable INPUT keydown ignored; held W
released over INPUT and settled; held W cleared by blur; right-drag look,
pointercancel, then ignored stale motion. Pointerup/lostcapture/blur also stop
look. Pixel/line/page wheel modes run -3 then +3 with 90 updates each. Projection
resizes to 390/844, 1440/900, 390/844, then settles for 600 updates. Each replay
is deeply equal, including every matrix sample. A separate drag crosses pi
without a wrap-induced reversal; disposal removes input listeners.

Loop sequence: hidden startup; repeated pending wakes; idle frames at 0/1/2s
then zero polling; input wake after 5s with dt0; an active 5s skipped interval
retains dt5; 60 alternating-dt frames with repeated wakes; visibility cancellation
and dt0 resume after 50s; hidden queued callback skips update; thrown update
propagates unchanged without retry; later wake recovers at dt0; in-flight stop
and later wake remain stopped. Reentrant wakes are a **scheduler stress fixture**,
not a claim that native synchronously emits visibility events during tick. No
suspend+wake-in-update stress-only pattern is labeled a native shaking cause.

Constructor-only measurement: its first dt0 changes quaternion by
`.31930878585700095`, world matrix by `.6051864057360395`, and view matrix by
`125.37809312089851`, with zero positional/projection change. The next dt0 is
exactly unchanged. This confirms a one-time default Euler/pitch assignment, not
continuing oscillation. Native start/Continue and specimen start explicitly snap.

Two complete independent script runs exited 0 and produced byte-identical output
(`cmp` exit 0), SHA256
`8c40552d161ddc4133eb7f060f360ee329a7b7e33ee3042fb5bb7d9f79c6aff7`.
Each run includes 12,028 reported samples counting the duplicate input replay.
Text output is 29,518 bytes; it is local-only, not a new committed artifact.

## Other verification and remaining limits

Actual commands and exits:

- `node Games/Citisten3D/camera-fit-check.mjs`: 0,
  `CAMERA FIT CHECK PASS: 756 current-Three projections`.
- `node Games/Citisten3D/world-check.mjs`: 0, `WORLD CHECK PASS`.
- `node Games/Citisten3D/native-check.mjs`: 0, `NATIVE LOOP PASS`, including
  existing speed0, pending effects, thrown update and cleanup regressions.
- `node Games/Citisten3D/terrain-check.mjs`: 0, `TERRAIN CHECK PASS`,
  9,409 heights and 22,778/25,000 triangles including city.
- `node --experimental-vm-modules Games/Citisten3D/continue-loop-check.mjs`: 0,
  `CONTINUE LOOP PASS`; actual native/UI/loop/sim/save under fake DOM/world/RAF.
  It retains late first dt0, second +.9s completing a 9s site at10x, and full
  simulation delta versus .25 render. Node emitted its normal experimental warning.
- New script: 0 on all runs, `CAMERA STABILITY PASS`.
- `node --check scripts/citisten_camera_stability_check.mjs`: 0.
- Catalog schema/unique-integer-ID/Git-URL validation: 0,
  `CATALOG PASS: 129 entries, required schema, unique integer IDs, Git-tracked URLs`.
- `git diff --check`: 0.
- `python3 -B scripts/check_maintenance_docs.py`: 1, solely
  `Missing docs/maintenance/games/001-brainrotboulevard.md`. No missing manual
  was fabricated and no check was weakened.

These are six targeted Node suites passing, not native/GPU acceptance. Fake event
targets test delivered events, not browser focus/capture propagation. In particular,
UI/native panels stop bubbled keyup while the camera listens on window in bubble
phase. A held key released after focus enters such a panel may remain held until
window blur; that source-level lifecycle risk is **unproven as the reported shake**
and is not hidden by a speculative patch. Real DOM propagation and actual device
CSS-size stability remain outside this run. No source regression reproducing
periodic autonomous movement or duplicate native callbacks was found.

The smallest missing user observation was requested without waiting: **does it
shake while idle immediately after opening, and is that the site or private v2
export?** Paused/input behavior would then separate camera motion from world/light
or display artifacts. No supported-GPU, frame/compositor, export or visual claim
can follow from CPU matrices. No browser/server/profile/install/off-host transfer,
peer contact, screenshots, release gate, game addition, index refresh or push.

Storage: initial available root bytes 2,361,511,936; pre-receipt 2,359,181,312,
both above the 2,147,483,648 floor. Own script/output/receipt growth stays below
1 MB; shared-host free-space changes are not attributable solely to this lane.
Final bytes and explicit-path commit are reported in the handoff.
