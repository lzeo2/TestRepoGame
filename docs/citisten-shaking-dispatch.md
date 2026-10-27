# Citisten user-reported world shaking

## Current authority and evidence boundary

The operator reports actual entire-world shaking on the user's device. This
supersedes the waiting-only Chromebook checkpoint. The user has NOT identified
whether the report is from the private Chromebook v2 export or the site. Investigate
the common runtime at shipped/pinned`de3ec4e6` first; do not claim an export/site
reproduction or native acceptance from CPU fixtures. No blind renderer retries,
new installations, public uploads, source-snapshot rewrites or competing main push.
Preserve saves/gameplay and intentional animation. Only modify a demonstrated cause.
Release owner`74b61fa7` receives the causal fix for serial deployment.

2026-10-27 09:08:30 UTC: clean HEAD`de3ec4e6`, game tree
`cf589170731afb5e3f974305a449045fc225ac14`,226files/35,157,269bytes. Inventory matches.
Free2,363,334,656 bytes; floor2,147,483,648. No browser is required for the initial
bounded deterministic comparison. No browser slot is held or new artifact copied.

## Disjoint diagnosis lanes

- #54 sol: camera/update-loop, ownership`camera.mjs`, `native-loop.mjs`, new
  `scripts/citisten_camera_stability_check.mjs` and camera diagnosis receipt.
  Trace native/specimen callers, RAF ownership, input lifecycle and dt. Compare
  camera matrices under fixed/snap/idle/input/variable-dt sequences. Native bootstrap
  is read-only in this lane; proposed changes there belong to parent integration.
- #55 astra: world/render, ownership only a demonstrated-cause subset of`world.mjs`,
  `daynight.mjs`, `materials.mjs`, `terrain.mjs`, `atmosphere.mjs`, `river-render.mjs`,
  new `scripts/citisten_world_stability_check.mjs` and world diagnosis receipt.
  Read all matrix/instance/lighting/water/effect writers, CSS sizing and vendor
  precision/depth paths. Sample fixed camera/world/instance matrices and replay
  deterministic sequences. Do not disable all weather/animation or hide supplied art.

Both lanes are browser-free, source-first, bounded to12minutes including own commit
and report, with small text outputs only. No nested workers. They share read access
but not writes; parent owns native integration, dispatch/manual/inventory and final
subjective/cross-lane review. If no cause reproduces, retain exact limits and the
smallest missing user observation rather than invent a patch. Known GPU and native
Water/Save/Continue failures stay failures. No push from this worktree.

## Actual findings and qualified causal fix

- #54 sol, commit`0a83e611`, [camera/loop diagnosis](citisten-camera-shaking-diagnosis.md),
  log`.swarmforge-logs/worker-2026-10-27T09-13-25-772Z-7ae3d19f.log`:3,606 snapped-idle
  samples had zero camera position/quaternion/world/view/projection deltas. Input/
  variable-dt replay and actual scheduler single-owner checks pass. No product edit.
- #55 astra, commit`a73ef8de`, [world/render diagnosis](citisten-world-shaking-diagnosis.md),
  log`.swarmforge-logs/worker-2026-10-27T09-13-25-791Z-e4823b05.log`:552 measured frames
  replayed exactly; fixed world/camera/instances/landmarks/shadow deltas0. Intended
  animations remain active. Depth proximity/fractional shadow-follow movement are
  numeric sensitivities, not demonstrated user-visible shaking. No product edit.
- #56 sol, commit`25f3562d`, [actual DOM red/green](citisten-camera-key-release-fix.md),
  log`.swarmforge-logs/worker-2026-10-27T09-31-39-016Z-a8472872.log`: source trace found
  native panel stops bubbling keyup before the camera's window-bubble handler.
  Physical W-down on canvas, mouse focus into native input, W-up then no input
  reproduces continued camera translation. Capture-phase key release fixes that
  shared-controller cause with one option argument, no cancellation or lost easing.

Over165 controlled fixture frames, post-release target drift327.25→0; final camera
matrix adjacent delta falls to1.68e-12 as easing settles. Native text input remains
usable. The first DOM fixture failed because its route omitted`three.core.js`;
that failure and cleanup remain intact. Corrected DOM test used one browser with
serial old/new source pages, no WebGL/game, and clean teardown5.564s. The initial
fixture browser was a separate retained attempt, not hidden from the count.
No renderer retry, supplied-art change, save mutation or blanket animation removal.

**This proves a conditional stuck-input camera-motion defect. It does not yet
establish that it explains the user's entire-world shaking**, especially if that
occurs immediately on load or while paused without prior input. Origin is still
unknown. Needed discriminator: site or v2 file, whether building silhouettes move
relative to HUD while hands-off/paused, versus only water/shadow shimmer. A short
clip with HUD and building edges can distinguish those cases. Do not certify the
reported symptom fixed from CPU/DOM proof.

## Integration, preservation and serial delivery

Only`Games/Citisten3D/camera.mjs` changes in runtime: keyup now uses
`{ capture: true }`. Game tree`fe47601d41652fa93fc51860efa655c1607eacb5`,226files/
35,157,288bytes, +19bytes. New camera SHA256
`5bc9fdeb1be7bfac300d50fcb4cd09e6c71fa9e02e333dfa0d72c2c9714cf149`.
Parent updates only the current manual/inventory row and live dispatch/delivery.
New separate231-file freeze`.tmp/citisten-shaking-qa/freeze-key-release1.json`,
SHA256`77c052b4340706303a1f129ba37ecb450ee5348d273da85124bc5fa260dff22f`,
differs from prior empty-pool freeze only in camera. Old manifests/raw failures and
already-delivered private Chromebook v2 remain unchanged. No large export rebuilt;
v2 still contains the old controller. Existing native harness pins describe their
older frozen source and must not be silently bypassed or weakened for a new run.

Parent independently reran camera stability, world stability and real save/resume:
3/3 exit0, save5/5 groups. Three touched/new JS syntax checks and diff checks pass.
Worker camera4-suite, world8/8 and baseline camera6-suite evidence is separately
reported, not a fresh supported-GPU/native pass. Source inventory is updated;
maintenance coverage retains the known missing Brainrot manual, not a fabricated
fix. Catalog129; games added0; screenshots0; original native frames0/5 remain.

DOM lease is released from actual cleanup and parent empty executable-aware scan,
not expiry. Release owner`74b61fa7` receives the narrow camera delta plus regression/
qualified report for serial integration. No wholesale branch merge, competing main
push or green-only HOLD is imposed; known-failure release authority remains with
that owner. No claim of deployment until the owner reports it. Overall shaking,
GPU/context stability, Water/Save/Continue and hardware/FPS remain unpassed.
