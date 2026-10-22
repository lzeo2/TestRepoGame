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
An initial API-fixture capture completed exit 0 with 18 screenshots and zero
page/console/network errors or external requests. Image inspection found a
harness-only missing UTF-8 declaration and clipped tracer-target framing;
both are fixed. A final expanded recapture timed out at 120 seconds while
unrelated trivia and Wings Chromium gates were active. It is NOT a pass and
partly overwrote the initial frames; the existing JSON is the initial run, not
proof that the expanded recapture completed. Final recapture awaits a globally
exclusive browser slot. The harness now refuses live Chromium processes before
creating a server/browser; its busy refusal was explicitly assertion-tested.
API fixtures do not replace integrated normal-input acceptance.

## Visual evidence and limits

The capture harness targets both themes at 1280x800 and saves C/D/F/G/H/I
`*-sim-api-fixture-*.png` under `docs/maintenance/audits/citisten-QA/`, plus
`docs/citisten-design/sim-browser-run.json`. These are explicitly API fixtures
using real simulation state, not the final game entry and not proof of normal
input, mobile gameplay, native device performance or release readiness.
No claim about a rendered result is made before captures are inspected.

## Known blockers and inspected-source limits

The sim and assertion script were inspected completely. World road/model/FX
APIs and UI mounting/state APIs were inspected at their boundary; this lane
has not reviewed or accepted those teams' entire implementations. Citizen
squads use direct steering stopped by walls, not a full obstacle router or an
individual casualty simulation. Traffic is segment-occupancy based, not
physical intersection collision. These limits are explicit, not hidden behind
the fixture captures.

Canonical maintenance validation last failed:
`AssertionError: Inventory stale: inspect changes, then run --refresh.`
An earlier attempt correctly refused concurrent uncommitted world changes.
Operator-delegated lead/Hermes refresh `ce8d2b4` subsequently updated the
inventory, without this lane editing out-of-scope paths. Subsequent source
milestones still require a final lead-owned refresh and canonical game manual.
The initial coordination ticket was `pi-2075977-1792626164639-1ae85e12`.
Global shared-browser coordination is separately pending under
`pi-2075977-1792627216164-ef1c474e`. Other worktrees' processes were not stopped.

The actual game entry, normal-input acceptance, catalog registration and full
registered-game smoke/release gate remain integration/reviewer responsibilities.
No push is requested or performed. No runtime third-party dependency was added.

## Change record and handoff

- `687516b`: initial city, utilities, traffic, waves, defenses and Node check.
- `7c82b0e`: migration tuning, spawn lane reservation fix, oversized horde queue
  and stronger regression assertions.
- `c5be7f0`: bounded live siege agents while retaining queued wave totals,
  citizen-only kill assertions and shared per-tick threat collection.

The evidence/report milestone commits only this lane's paths.
Other live world/UI dirty paths belong to sibling lanes and are not staged.
Initial shared root free space was 4,028,985,344 bytes. Final free bytes and the
shared-workspace storage delta will be recorded after captures; that delta is
not attributable solely to simulation files.
