# Wings CTF source staging, no push

## Corrected scope

The operator cancelled the proposed plane-driven patrol change. Existing Solo
flight, Speedboat patrol and Play with bots actions/defaults remain unchanged.
Speedboat remains in the same eight-vehicle fleet/hangar picker. Capture the flag
opens the same custom setup with its own mode, vehicle, bot, capture-limit and
timer choices. Fleet and CTF selections are independent; returning to Fleet does
not inherit the CTF vehicle or bot defaults.

This is an existing-game extension, catalog **232**, not a new game or ID.
Catalog wording calls CTF a preview and distinguishes the local addition from
Anomaly's original Wings. No push, backend, external asset or dependency change.

## Delivered source behavior

- Two flags/teams. Alive occupied vehicles steal enemy home/dropped flags;
  friendly touch returns a dropped flag. Carry the enemy flag home while the own
  flag is home to score. One flag per vehicle; no client capture/position command.
- Death/removal/empty crew drops the flag on real terrain/water. Automatic return
  after 30 room seconds. Capture limit or timer decides the winner; equal capture
  scores draw. Original intermission/restart clears flags and scores.
- Plane and boat AI on both teams use ordinary flight/seat inputs. CTF bots keep
  their own vehicles rather than being consumed by automatic gunner fill.
  Flag carriers remain visible despite stealth snapshot filtering.
- CTF bases/spawns do not depend on surviving carriers. Boats start in real water;
  aircraft use the existing air-start factory. Return to the own base zone to
  change vehicle. Fleet carrier/deck rules remain unchanged.
- Real C1 water strait between Mainland and Isle 2. Route points in metres:
  `(-400,1100) -> (260,1100) -> (260,840) -> (800,840) -> (800,1100)`.
  Water route 1,720m; direct air distance 1,200m. Terrain/physics seed and geometry
  are unchanged. Boat hull/draft and basin probes passed; normal-input driven
  round trips also passed. [Planning diagram](planning-water-route.png) is
  labelled planning, **not Chromium/gameplay evidence**.
- Four instanced objective batches: homes, route buoys, flagpoles and solid box
  banners. Carried flags follow interpolated vehicle transforms; resources are
  owned/disposed once. CPU fixture with the maximum 12 markers counts 488 triangles,
  not a whole-scene budget or pixel acceptance.
- Fresh CTF scene boot focuses the real requested play area. Actual worker ACK,
  separate 30s availability wait and unchanged 20s readiness/draw predicates remain.
  No pre-launch, density/framebuffer reduction, shader patch or readiness grant.
- Shared settings loader now rejects malformed name/sensitivity/audio values and
  prototype keys, preserving valid saved v6 controls. This does not explain or
  retroactively fix the old native collector's unmeasured menu timeout.

## Review and reproducibility

Private reviewed source ends at `bfcafba`. Parent reviewed worker paths line by
line. Review 57 found zero confirmed high findings and one medium lifecycle
mismatch: base-return permission knew CTF homes, parked-boat cleanup did not.
The fix centralizes both in the mode-aware boat-base predicate. Its isolated CPU
cleanup-clock regression checks survival beyond the 20s abandoned delay and quiet
removal at 60s. Exact pre-fix source revision `6928113` fails the intended assertion.
The earlier one-guard mutation failed at return permission first; it is not
misreported as the parking-specific control. No runtime source was changed by
these test-only builds.

All **70** upstream Git blobs still match pin
`bf5f6277e38ee52e9bfa4ae4a01337b46175c181`. Full `port.patch` clean-applies and
reproduces **88 authored files** byte for byte. Pinned esbuild 0.28.2 / Three
0.186.0 produced **33 files / 5,589,890 bytes**. Diagnostic `build-meta.json` is
not a runtime file; the other 32 files are delivered, with the existing explicit
HTML description/relative-font URL delivery normalization. No install or version
substitution. [Asset retirement](asset-retirement.json) records the nine traced
superseded generated assets; their sole external consumer was historical hash
metadata, retained intact. No model or protected directory was changed.

## Actual CPU evidence

- Pure authority: 13 synthetic rule/copy/limit checks.
- Ordinary-input AI round trips: both teams, speedboat/fighter/F-15/F-35,
  eight captures and zero crashes. Boats capture near tick 10,600; aircraft near
  ticks 1,366-1,596. No pose correction or granted capture.
- Real mixed-team loopback, physics/combat/wire/flag authority: a normal human
  boat spawn, plane/boat AI on each team, flag pickup at 12.02 simulated seconds,
  carrier death/drop at 20.02, later pickup at 32.02 and capture-limit winner
  **team 0 at 43.65**. Clean automatic reset followed. A separate real 60s timer
  fixture uses capture scores/draw, not ship-damage tiebreak. Snapshot mutation
  tests prove copy isolation, not granted gameplay state.
- UI config/flag text/settings/source wiring checks, primitive transform/bounds/
  disposal checks, worker startup and actual-source fake-clock checks pass.
- Existing-model boat, Astra and solo regressions pass. The older boat still
  emits its absent `pilot_1` warning. Strict candidate roof geometry stays FAIL;
  the test was not relaxed. Existing inherited Bun timing failures are not
  rerun or claimed resolved.

Runnable from the site root (source path is the clean applied patch tree):

```sh
node Games/Wings/verification/ctf-check.mjs
node Games/Wings/verification/ctf-bots-check.mjs
node Games/Wings/verification/ctf-view-check.mjs
node Games/Wings/verification/ctf-integration-check.mjs
node Games/Wings/verification/ctf-ui-check.mjs PATH_TO_APPLIED/games/wings
node Games/Wings/verification/check-startup-clock.mjs PATH_TO_APPLIED/games/wings/src/render/scene.ts
```

## Native evidence and remaining decisions: HOLD

**Not captured:** CTF lobby, actual in-flight carried flag, boat-water-route frame.
The [one authorized CTF attempt](native-01/README.md) ended HOLD in launch/connect:
20s probe deadline, 55s supervisor exit 124, no completed page/probe or product
sample. Fresh independent resource cleanup/release did not grant collector PASS.
Launch-only ticket `pi-86463-1792667765599-a1544d84` is pending after advisor
timeout. No retry. Collector-only granular phase follow-up is not browser-retested.

No previous image is relabelled as CTF. Earlier boat-native attempts remain all
HOLD in the [three-attempt receipt](../wings-boat-publish-20261022/browser.json):
CDP3 connected/probed in 17.68s, then its 55s supervisor expired in the menu phase,
with no product-gate result. Not connection failure or measured product failure.
Owned cleanup was independently verified and the slot explicitly released.
Post-connect/menu ticket `pi-829842-1792641745174-2ca752e0` remains unresolved.

The existing boat GLB remains SHA256
`1f0eae7f3b962669c2f95f1ce52e3f27cce008595f4875bae41e9274b24da65a`.
It has the older roof and no driver. The operator's later roof/driver request
conflicts with the earlier byte-identical-model restriction; permission to repair
that same path is awaiting clarification. No newer candidate was substituted.
Whether boat variants need distinct handling/loadouts or team-livery versions
also awaits an answer. Current selection exposes the existing aircraft roster
and one speedboat kind; additional boat loadouts are **not** claimed implemented.

Native layout, physical input, flag/water pixels, roof/driver, audio, hardware,
whole-scene peak budget and rights acceptance remain open. No FPS pass is inferred
from CPU tests. Full **127-game** browser loading gate remains deferred, zero visits
in this lane. Operator review and a separate push order remain mandatory.
