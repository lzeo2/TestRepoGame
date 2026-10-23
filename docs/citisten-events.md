# Citisten civic events receipt

## Source and scope

`799e1ab` adds six original civic happenings to the existing game; `aceaeb6`
adds regression checks. No games, assets, dependencies, network loads or catalog
entries were added. The catalog remains 128 registered games. This implements
scheduled opportunities/incidents, visible consequences and player responses;
no Cities: Skylines names, content or assets were copied.

Simulation remains authoritative. `ui.mjs` formats notices and dispatches an
optional `onEventAction(id)` callback; it does not calculate effects. The existing
wave and blackout emission paths are preserved. The retained board, eight-second
message deduplication, one/three mobile/desktop notice limits and urgent-notice
ordering from `8f96811` remain. Civic notices precede wave warnings/blackouts/waves.

## Runtime contract

One tick is the existing quarter-second step. First start: tick 240 (60 seconds).
Subsequent slots: every 960 ticks (240 seconds), cycling through the six types.
Districts are the existing 8-by-8 utility districts, labelled by zero-based
`x,z` district coordinates. An immutable original seed and slot ordinal choose
among sorted occupied districts, preferring residential districts for festivals.
This does not consume the traffic/combat random stream. An already-active type
in the selected district cannot spawn twice, including a later rotation.

`state.cityEvents` contains active records with `id`, `type`, `title`,
`description`, `district`, `startTick` and `durationTicks`. Start/end emissions
are `city-event-start` / `city-event-end`, carrying `event`; an end also carries
`reason: 'expired' | 'repaired'`. Descriptions are emitted only on start.

| Type | Effect | Duration |
| --- | --- | --- |
| Street Festival | Selected district: home happiness +0.2; safe-home growth and residential/business tax income x1.25 | 960 ticks |
| Water Main Burst | Selected district's water demand x2, consuming capacity through the existing network/shedding logic | Until paid repair |
| Power Surcharge Day | Collected tax income x0.75, without changing the chosen tax rate or growth formula | 960 ticks |
| Farmers Market | Supplied commercial income x1.5 within eight lots of a powered/watered park | 960 ticks |
| Inspection Day | City crime minus 0.3, clamped at zero | 960 ticks |
| Cold Snap | Night-phase power demand x1.5 | 960 ticks |

`durationTicks: 0` explicitly denotes the repair-only water incident, not a
zero-length buff. The water leak halves usable capacity for affected demand;
spare capacity can absorb it without an outage. Cold Snap uses the existing
night phase; free build has no nights and therefore no cold power multiplier.
Effects are recalculated on existing economy ticks, with expiry processed before
that tick's economy calculation. Water repair refreshes water service immediately.

Repair costs $120, requires daytime and sufficient funds, and works on any lot
in the affected district through `applyTool(sim, 'repair', lot)` and
`sim.repair(buildingId, lot)`. It takes priority over ordinary building damage
in that district in this milestone. The HUD adds a Repair water main button.
Native integration must resolve its event ID against active state, convert the
district origin to a lot and call `applyTool`; that callback wiring belongs to
the coordinated save/terrain lane, not this source commit.

## Coordinated snapshot and skip APIs

The save/terrain operator request added `sim.snapshot()` and
`createSimulation({snapshot, roads?})`. Version 1 contains a detached JSON copy of
published state, ordered road cells and runtime fields `seed`, `eventSeed`,
`nextId`, `accumulator`, `economyClock`, `trafficClock`, `revision`, `warned`,
`milestone`, `wasBlackout`, `roadVersion` and `events`. Pending notices are included
so undrained events survive restoration. Cells, hall references and lazy siege
caches are reconstructed; supplied roads are mutated only after validation.
`sim-snapshot.mjs` validates finite JSON, bounded collections, clocks, agent IDs,
lots/routes, building values and civic metadata before restoration.

`skipToNight()` returns false outside defense/day or at/below 60 seconds
remaining. Otherwise it runs the normal fixed-step advancement to the warning,
including economy/traffic/civic effects, returns true and cannot skip again at
the warning. It does not teleport directly into combat.

Shared sim/UI/tests were explicitly released after `aceaeb6`. The coordinated
Skylines lane owns subsequent grants, growth diagnosis and hall recovery, including
retained zero-HP hall validation and recovery skip guards. This receipt describes
the event milestone, not acceptance of those later changes. The save/terrain lane
owns the final combined canonical maintenance manual and inventory refresh.

## Verification and limits

Actual results at the event milestone:

- `node --check` passed for sim, snapshot validator, UI, native actions and sim checks.
- `node Games/Citisten3D/sim-check.mjs`, exit 0: all existing assertions retained;
  final output included `CIVIC CHECK PASS`, `SKIP CHECK PASS` and
  `SNAPSHOT CHECK PASS`. Tests cover all six effects, scheduling boundaries,
  district/park/night limits, expiry, indefinite incident/no duplicates, failed
  and successful paid repair, paused time, seed/delta replay, skip equivalence,
  detached restoration and corrupt input rejection without road mutation.
- `node Games/Citisten3D/native-check.mjs`: `NATIVE CHECK PASS`.
- `git diff --check` passed; added code contains no third-party runtime loads.
- Catalog validation: `CATALOG PASS: 128 unique IDs, required schema and tracked URLs`.

One bounded, exclusive system-Chromium fixture slot exercised actual sim/UI APIs
at 1440x900 and 390x844, in both themes. All UI assertions completed: persistent
notice after 8.2 seconds, visible 44px repair action without builder overlap,
paid callback repair and urgent wave precedence. Error and external-request
arrays were empty. Four screenshots were visually reviewed: flat panels,
readable wrapping and visible black repair controls. Local-only artifacts:
`.tmp/citisten-events/` and `.tmp/citisten-events-qa.txt`.

**The browser gate exited 1**, because `ui.mjs` changed during capture after shared
source release. Desktop/mobile therefore depict different in-progress source
versions; screenshots are provisional, not stable release evidence. Browser and
server cleanup both passed (`browserReleased: true`, `serverReleased: true`), and
the slot was explicitly released to save/terrain. No native world/gameplay, FPS,
full-fleet gate or push is claimed. A fresh stable-source integrated pass remains
necessary; no historical PASS substitutes for it.

The maintenance checker passed before editing (134 manuals / 128 registered /
6 unregistered). The final attempted check correctly stopped with
`Commit inspected source changes before validating its inventory.` because sibling
lanes were actively editing game sources. Final combined refresh/check remains
with the designated save/terrain owner; no shared docs were overwritten here.

Root free space: 3,025,821,696 bytes at start and 3,021,783,040 bytes before this
receipt, a 4,038,656-byte reduction across concurrent lanes, not attributable solely
to this change. No browser downloads, history rewrites or external deletions.
