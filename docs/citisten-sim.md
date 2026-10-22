# CITISTEN simulation and defense maintenance receipt

## Identity and scope

Original, operator-authorized CITISTEN city simulation and defense code. This
lane does not register the game, publish, push, implement a renderer/camera or
implement UI. Mechanics follow the supplied contract and general city-builder /
wave-defense conventions; no upstream game code, art, text or map data is used.
Acceptance letters requested: C, D, F, G, H, I. Reviewer grades these, not this
receipt. Road traffic also supplies the simulation side of E.

## Source and dependencies

- `Games/Citisten3D/sim.mjs`: authoritative city state, fixed-step clock,
  growth/demand/budget, utility networks, traffic, waves, defenses and loss.
- `Games/Citisten3D/sim-check.mjs`: Node stdlib assertion check and timeline.
- `Games/Citisten3D/sim-qa.py`: bounded browser API-fixture capture harness.
- `docs/citisten-sim-api.md`: integration contract, tuning and ownership.
- `docs/citisten-design/sim-run.txt`: actual fresh Node stdout.
- `docs/citisten-design/sim-browser-run.json`, `sim-browser-console.txt` and
  `sim-browser-exit.txt`: final browser state, stdout and exit-code receipts.

Runtime dependency: world-owned `RoadGrid` only, imported locally. No added npm
packages, remote assets, fetches, sockets or DOM use in the simulation. The QA
harness uses the host's existing Python Playwright and explicitly pinned system
Chromium. It calls published world/UI APIs rather than implementing either.

## Entry and controls

Create with `createSimulation({size,mode,seed,roads:world.roads})`, call
`update(realSeconds)` from integration's existing loop, and read `state`.
Speeds are 0/1/3/10. `setMode('free')` clears live and queued zombies and cancels
the assault. Integration owns placement inputs, road-cost reservation, normal
restart/menu input and time-control buttons. See the API document for methods.

## State ownership and persistence

The module owns state and mutates it in fixed 0.25s steps. Economy runs each
simulated second. Consumers must not mutate state; event arrays are drained
once and shared between UI and world FX. No storage, network, timers or RAF
loops exist in sim. Loss freezes its clock and construction/repair; restart
means creating a fresh simulation. There is no save/load format in this scope.

## Simulation and combat rules

The scripted 32-home, balanced industry/commercial city reaches **1,526 people
at 600 seconds**, at 10% tax, with positive net operating income. Homes cap at
64 residents. Service range is 16 lots. Removing power, water or police causes
measured abandonment. Plants/towers transmit through road adjacency; supply is
isolated per connected network. Whole 8x8 districts are shed on overload,
prioritising the hall district. Fixed district priority is deliberate and does
not rotate for fairness.

Traffic calls world `path` and `lanePoints`, follows right-hand lanes, reserves
one car per directed road segment, queues at occupied segments, parks for two
seconds and despawns. Roads changing invalidate current trips. Trips are a
bounded (80-agent) visual approximation, not a jobs or commuting economy.

Day is 240 simulated seconds at 1x. Waves contain
`ceil(12 * 1.15 ** (night-1))` zombies. Weighted distance fields prefer roads;
structures block entry and take 8 HP bites at one-second intervals. Any kind
of structure can be destroyed, not only walls. Reserving source and destination
lots prevents zombie overlap. Oversized hordes queue outside the perimeter,
then spawn into newly vacant edge lots; queued enemies prevent an early win.
Live siege agents are bounded to one perimeter's worth (at most 796 on the
200-lot grid), preserving the full planned count in the queue rather than
exceeding the world's per-type instance pool.

Watchtowers hit for 18 HP every 0.8s within eight lots. Night-time citizen squads
come from occupied homes and rush the nearest threatened building, shooting
for 10 HP every 1.2s within 3.5 lots. Kills award no drops or money. Repairs in
day cost ceil(missing HP * 0.4). Hall HP is 600; its destruction emits one loss
event carrying nights survived, peak population and kills. Repelled nights add
one to score. World owns brief tracer and impact rendering from `shot` events.

## Verification

`node Games/Citisten3D/sim-check.mjs` exits **0**. Actual output is retained in
`docs/citisten-design/sim-run.txt`, including:

```text
600s city: population=1526 budget=31093.00 initial=30540 income/s=3.49 upkeep/s=1.47 car-movement-observations=20092
Traffic: unique trips=382 jam steps=188 parked steps=2944
Overload: power supply=80 demand=138.08 served=79.08 shed=59.00
Three-night totals: waves=12/14/16 shots=104 kills=26 wall-bite-ticks=132 road-motion-steps=531
```

The three-night city survives twice, then its towers are deliberately removed
and surviving walls repaired in day. Third-night wall bites precede hall bites;
recorded hall damage totals exactly 600 and triggers exactly one loss. Tests
also cover a citizen-only wave repelled (12 kills), crime abandonment,
disconnected utility islands,
road cuts, pause/10x, invalid input, protected hall, frozen loss, mid-wave free
mode and 12-night overflow spawning (352 kills, no unaccounted queued enemies).

`node --check` passes for both authored ES modules. The Python capture harness
parses without bytecode writes. `git diff --check` passes for owned changes.
The final current-source API-fixture capture completed **exit 0**, with **22
screenshots**, zero page/console/network errors and zero external requests.
`sim-browser-run.json` matches that final run. It records 1,526 people at 600s,
blackout and overload, an edge wave, a tower kill, a third-night wall assault,
2 survived nights / 26 kills / hall HP 0 at loss, citizen fire and no live
zombies or shot events after switching to free mode. Owned browser/driver/
server resources closed before handing the shared slot to Wings/Jankolock.

History: the initial 18-frame fixture run completed exit 0. Image inspection
then caught harness-only missing UTF-8 and clipped-target framing, now fixed.
An intervening expanded attempt timed out at 120s amid unrelated browser gates;
that attempt was NOT counted as a pass. The final run replaced its partial
frames. Exact ps root-PID checks now enforce exclusivity before launch and
before/after every capture, with a 100s alarm and finally cleanup. The busy
refusal/root detection was independently assertion-tested (including ignored
zombies and renderer children). API fixtures do not replace integrated
normal-input acceptance.

## Visual evidence and limits

The capture harness targets both themes at 1280x800 and saves C/D/F/G/H/I
`*-sim-api-fixture-*.png` under `docs/maintenance/audits/citisten-QA/`, plus
`docs/citisten-design/sim-browser-run.json`. These are explicitly API fixtures
using real simulation state, not the final game entry and not proof of normal
input, mobile gameplay, native device performance or release readiness.
Twenty-two final frames are retained (C initial/grown, D cut/overload, F wave/
wall, G tracer/kill/citizen, H loss, I free, each in dark/light). Frames were
inspected in both themes: population/budget and overload values are visible;
tower and citizen tracers are visible; H shows 2 nights survived and 26 kills;
free-mode minimap contains no zombie blips. These observations are not
acceptance grades. No claim about a rendered result is made before captures
are inspected.

## Known blockers and inspected-source limits

The sim and assertion script were inspected completely. World road/model/FX
APIs and UI mounting/state APIs were inspected at their boundary; this lane
has not reviewed or accepted those teams' entire implementations. Citizen
squads use direct steering stopped by walls, not a full obstacle router or an
individual casualty simulation. Traffic is segment-occupancy based, not
physical intersection collision. These limits are explicit, not hidden behind
the fixture captures.

**Canonical maintenance blocker closed in Batch34.** World-owned approved
handover `56b45fc` supersedes the earlier `ce8d2b4` refresh and includes the
[canonical unregistered manual](maintenance/games/unregistered-citisten3d.md),
README and current Git inventory. Sim independently reran the plain checker:

```text
PASS: 133 game documents cover 127 registered + 6 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Earlier stale-inventory and concurrent-dirty-source refusals remain historical,
not open blockers. No out-of-scope canonical paths were edited by this lane.
The initial coordination ticket was `pi-2075977-1792626164639-1ae85e12`.
Global shared-browser coordination was escalated under
`pi-2075977-1792627216164-ef1c474e`; an explicit global UI-to-sim handoff allowed
the final uncontended run. Other worktrees' processes were not stopped.
World's final Batch32 canonical sample reports **2.257124 fps SwiftShader**,
so its 40fps gate remains FAIL/HOLD. Its one GL probe reports **2.077732 fps**,
with null renderer/artifact and hardware inconclusive. Historical 1.82 fps is
superseded as the final measurement, not erased. This lane does not convert
these results into a hardware/rendering pass.

The actual game entry, normal-input acceptance, catalog registration and full
registered-game smoke/release gate remain integration/reviewer responsibilities.
No push is requested or performed. No runtime third-party dependency was added.

## Batch32 FX handoff

Step 2 updates only simulation documentation/fixtures, not runtime, world or UI
source. The API doc now states the exact event fields/units and fixes an
ambiguous conversion sentence: `effects.shot` takes GRID x/z unchanged;
conversion to world metres happens inside the world API, while optional y is
already metres. It maps damage/destruction/kill events without inventing new
world methods or re-applying gameplay damage.

`docs/citisten-design/replay-fx.mjs` adds a 45-LOC Node-stdlib fixture producer.
It emits real simulation events into `sim-fx-replay.json`, including initial
roads/buildings and source hashes. Actual output on both runs:

```text
FX replay: 351 events, 104 shots, 600 hall damage, score 2, kills 26, loss at 828.25s
Byte-identical FX replay regeneration verified
```

Its assertions verify all three waves and exact expected outcome; source syntax
and diff checks passed. Two regenerations produced byte-identical JSON. No
browser was needed or launched for this docs/data change; the UI-owned slot
remained held. Existing 22 API-fixture captures are not newly regraded.
Step 2 landed as `93c9a80` and world was notified that it has no sim browser
hold. Runtime/check/harness remain 721 LOC; the docs-only producer adds 45.

The post-step checker correctly refused uncommitted sibling source:
`AssertionError: Commit inspected source changes before validating its inventory.`
At that check the only dirty paths were sibling-owned `ui-qa.py`, `world-qa.py`,
`docs/citisten-ui-api.md`, `docs/maintenance/README.md`,
`docs/maintenance/audits/citisten-QA/J-ui-results.json` and
`docs/maintenance/audits/citisten-QA/J-ui-batch32-run.txt`. No sim-owned paths
were dirty or staged. Batch34 handover `56b45fc` has since closed that
maintenance item, with the independent plain checker passing as quoted above.
Final Batch32 root-free snapshot was 3,846,430,720 bytes
(182,554,624 less than session start, shared across swarms).

## Per-letter headless evidence rerun

The operator-requested fresh run of `node Games/Citisten3D/sim-check.mjs`
completed exit 0 with empty stderr. Seven committed logs under
`docs/maintenance/audits/citisten-QA/letter-{C,D,E,F,G,H,I}-sim.log` retain the
full shared-suite timeline, exact command/exit, Node version, UTC time, Git
provenance and SHA-256 hashes of sim/check/road sources. Each identifies its
relevant assertions and existing screenshot stems; they are evidence for
review, not builder-assigned acceptance grades.

| Letter | Fresh headless evidence |
| --- | --- |
| C | 1,526 citizens at 600s; budget 30,540 to 31,093.00; income 3.49/s vs upkeep 1.47/s; crime abandonment. |
| D | Destroyed plant and water cuts cause abandonment; power demand 138.08 exceeds 80 supply; 59.00 shed; isolated-network and road-cut assertions. |
| E | 382 unique trips, 20,092 movement observations, 188 jam steps, 2,944 parked steps; unique moving-lane occupancy and despawn asserted through world roads APIs. |
| F | Edge waves 12/14/16, 531 road-motion steps, 132 wall bite ticks; intact walls block and zombies do not overlap. |
| G | 104 tower shots, 26 kills in defended nights; citizen-only wave repelled with 72 shots / 12 kills; day repair exercised. |
| H | Two survived nights; exactly 600 hall damage; one loss at 828.25s; lost clock frozen and hall protected. |
| I | Free-build suppresses waves; mid-assault switch clears live and pending waves; pause/10x and queued-horde clearing asserted. |

No runtime or test source changed for this rerun, so canonical maintenance
validation still passes. Existing 22 API-fixture images cover C/D/F/G/H/I in
both themes. Dedicated E movement frames are queued behind the UI-owned
browser slot; no concurrent browser is launched. Visible/native/integrated and
hardware acceptance is not established by these Node logs.

## Change record and handoff

- `687516b`: initial city, utilities, traffic, waves, defenses and Node check.
- `7c82b0e`: migration tuning, spawn lane reservation fix, oversized horde queue
  and stronger regression assertions.
- `c5be7f0`: bounded live siege agents while retaining queued wave totals,
  citizen-only kill assertions and shared per-tick threat collection.

- `5814277`: guarded API capture harness, initial browser JSON and scoped
  maintenance receipt. Source is frozen pending reviewer/integration work.

The evidence/report milestone commits only this lane's paths. Runtime plus
Node check plus Python harness are **721 LOC** (354 + 173 + 194).
Registered catalog stays **127 games**, no entry added or registered by this
lane; CITISTEN simulation code is original, not ingested. No push.

Gate accounting: Node regression exit 0; two completed API-fixture browser runs
exit 0 (initial 18 frames and final 22 frames), with one intervening timeout
explicitly not passed. Browser-busy refusal/root detection, two JS syntax
checks, Python parse, tracked-catalog static validation and owned diff checks
completed. Full registered-game browser gate was not run, so no release
decision is implied.

At Batch34 closure the shared working tree was clean; no sibling dirty paths
remain. The pre-edit root-free snapshot was 2,655,043,584 bytes. Earlier storage
snapshots below are historical and shared across swarms, not a sim-only cost.
Initial shared root free space was
4,028,985,344 bytes; the final browser run measured 3,871,305,728 before and
3,868,348,416 after (2,957,312 bytes less free during capture). Against session
start this is 160,636,928 bytes less free, shared across all swarms and not
attributable solely to simulation files. Final command output retains the end
snapshot. Owned browser/server resources are closed; no further browser runs
are planned.
