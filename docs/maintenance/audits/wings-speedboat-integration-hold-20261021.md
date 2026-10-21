# Wings speedboat source checkpoint, 2026-10-21

## Delivery status

**HOLD, no push.** Private source checkpoint
`c04b506c2db5ccc31aec51ce88f44e2800d8c09e` is in
`.tmp/wings-speedboat-source/`, not the public repository's history.
Preserve that directory and the candidate artifacts until delivery. Main's
`Games/Wings/port.patch`, generated runtime and registered game entry were not
replaced. This is not a playable-boat deployment or an acceptance exception.
The operator's full-fleet exception remains distinct from required boat play.
No games or catalog IDs were added by this lane. Multinational jets have not begun.

## Reviewed implementation

Parent read the complete runtime and subsequent prepared diffs before private
commit. Independent challenge review accepted the source checkpoint, not release.
Water controls, driver `pilot_1`, boat projectile bodies, event-only cannon audio,
roster order and exhaustive maps are integrated privately. Existing seven slots
remain ordered; boat is eighth, with zero automatic boat spawn weight.

Reproduced defects were repaired: moving ships intruding into an occupied hull
now enter the existing crash/death path; actual cannon rounds each emit an event
and start at the real muzzle; submerged charges survive passing ships until their
two-second fuse; editor focus/releases clear held input. Explicit explosion
surfaces take precedence over the proximity flak heuristic. Boat pause help
matches controls; passenger text no longer promises unimplemented spotting.

## Actual checks

- Verified 70 pristine upstream Git blob hashes at
  `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. Regenerated candidate patch applies
  cleanly and reproduces the reviewed source byte for byte.
- Fresh reviewed build: **26 files, 3,687,946 bytes**, esbuild 0.28.2 and external
  Three 0.186.0, matching retained license. No installation or version fallback.
  Generated boat, Astra and solo checks all pass. Clean-pin rebuild and boat
  check also pass. No typecheck or native-render claim.
- Boat check covers actual loader/converter, source PBR times AO, driver bone
  occupancy, water input/replay, camera math, 27 moving-hull cases, arbitrary-phase
  cannon events and moving-ship submerged-charge fuses. Fixtures assigning actors
  are explicitly CPU fixtures, not normal-input gameplay proof.
- Unchanged Bun suites: **300 passed, 3 timing failures**. AA tick, world bake and
  coherent-height timing thresholds were not weakened. CPU-load causality is
  unproven. Separate actual-Three pilot suite: **27/27**.
- Candidate GLB: **17,624 triangles, 97 materials, 284 assignments, 1,149,920 bytes**;
  SHA256 `29754e214cddfb64af8a4e1ab71d6b6c6bcf947612eb5170ce710cccb048e5dc`.
  Driver 360 triangles; opaque closed roof 164. Fresh generation matches candidate.
- Raw Three collector: **52/52 beauty captures**, **36/36 roof/glass poses**,
  zero errors/external loads/failed requests. Old asset diagnostic correctly
  fails with 24 roof-coverage failures, open roof and absent driver. Parent reviewed
  all candidate contact sheets plus full-size front and banked views: continuous
  roof and visible seated driver in this raw scope, not native acceptance.

## Blocking native result

Two real Chromium normal-menu attempts selected Low and launched Solo flight.
Forced WebGL2 and default WebGPU-to-WebGL2 fallback both failed closed with
`First scene draw timed out`, before GameSession creation. No boat spawn,
driving, weapon gameplay, seat switching, native roof/driver pixels or audible
behavior was accepted. Four captures show menu/failure states only. Both owned
browsers and HTTP servers closed. No third local renderer retry or gate override.

Native ticket `pi-1694451-1792546285206-bf2e97a9` remains pending. Restore a
supported native browser/session, complete actual interaction and visual review,
then deliver patch/model/matching bundles and run checks before the authorized
push and live verification. High ocean plus candidate hull already totals
121,016 source triangles before scenery/effects; this is an acceptance hold,
not a measured frame peak. Inherited malformed-settings validation remains a
separate finding. The operator-deferred 125-game run remains unrun. Concurrent
Jankolock registration advanced the current catalog to **126 games**; a future
full gate must enumerate that current catalog, not claim 125 as complete coverage.
This Wings lane made **0 fleet visits**.

## Local evidence and pending main paths

- `.tmp/wings-boat-reviewed-build/` and `.tmp/wings-boat-clean-pin-build/`.
- `.tmp/wings-boat-reviewed-port.patch` (263,435 bytes).
- `.tmp/wings-boat-final-generated/` and `.tmp/wings-boat-final-roof-views/`.
- `.tmp/wings-boat-old-roof-diagnostic/` and `.tmp/wings-boat-native-playtest/`.
- `.swarmforge-logs/wings-boat-final-regression.log`.
- `.swarmforge-logs/wings-boat-final-challenge.log`.
- `.swarmforge-logs/wings-boat-final-native-collection.log`.

These ignored artifacts are local, not promised permanent public evidence. The
first release-build directory retains a stale failing boat fixture; use the
reviewed or clean-pin build, not that directory. Main generator/heading-runner
WIP and builder's boat-check entry remain uncommitted pending paired delivery;
do not commit the new generator against the old GLB. Main inventory still
represents committed source, not these pending edits. Do not refresh it to imply
acceptance. Root capacity stayed above the strict 2 GiB floor; no bulk checkout
or outside-repository deletion. Concurrent Jankolock work was not staged or reset.

Owned main WIP paths at the original checkpoint:

- `Games/Wings/verification/generate-models.py`: prepared roof/driver generator.
- `Games/Wings/verification/check-speedboat-browser.py`: reviewed heading diagnostics.
- `scripts/build_wings.mjs`: prepared boat-check entry for candidate source.
- `docs/maintenance/games/232-wings.md`: current checkpoint/hold disclosure.
- This receipt: current checks, failure history and resumption details.

Private tree was clean after `c04b506`. Main was deliberately uncommitted;
source/model/runtime delivery was not complete. That maintenance guard exited 1:
`Commit inspected source changes before validating its inventory.` No refresh or
bypass. Owned diff checks and builder syntax passed. Final free space was
2,634,727,424 bytes versus entry 2,673,389,568, a shared-host delta of
-38,662,144 bytes, not solely attributed to this lane.

## Capacity-authorized resume

The operator reported restored capacity and authorized resumption. Fresh entry
measurement was 2,628,980,736 free bytes, above the 2,178,940,928-byte builder
floor plus reserve. No outside-repository deletion was performed by this lane.

Private `c04b506` remains clean. All three saved, self-contained generated boat,
Astra and solo checks passed again. Saved build output sizes/import closure and
candidate GLB hash passed. These checks need no external Three package because
the previously built checks already bundle it; they are not a fresh source build.
The external Three directory is now absent from this process's filesystem,
contrary to the operator's reported availability. Exact-path inspection and a
bounded existing-cache search found no replacement. No installation or version
fallback was attempted. Tooling ticket `pi-829842-1792598595177-263d5e68` remains
pending after advisory timeout.

A separate read-only hardware investigation found readable/writable V3D render
nodes and native EGL reporting Broadcom V3D 4.2.14.0 / OpenGL ES 3.1. Both bounded
browser capability routes, headless ANGLE/GLES and Xvfb ANGLE/Vulkan with the
Broadcom ICD, returned `webgl2: false` with software rasterization disabled.
Neither produced a browser GL draw, so no further Wings launch was attempted.
Sandbox remained enabled; both browsers and owned Xvfb closed. Blank capability
captures are not game screenshots. Evidence:
`.tmp/wings-boat-hardware-route/report.json` and
`.swarmforge-logs/wings-boat-hardware-route-probe.log`.

At this resume, the earlier tracked generator, heading-runner, builder and manual
WIP was no longer present. This lane did not reset it. Saved generator/runner
review diffs still pass `git apply --check`; source/model/build candidates remain
available. They were not reapplied as an incomplete delivery. The maintenance
checker now passes: 131 documents cover 126 registered and five unregistered
games, with current Git inventory. No inventory refresh was needed.

Native gameplay and High scene-budget acceptance remain held, independently of
capacity. Restore the exact approved external package and provide a working
supported browser route before finishing actual boat play, paired delivery,
authorized push and live verification. No runtime publication, new game,
multinational-jet implementation or full-fleet visit occurred in this resume.
