# CITISTEN simulation API (sim team)

Renderer-free ES module: `Games/Citisten3D/sim.mjs`. No DOM or third-party dependencies.

## Integration contract

```js
import { createSimulation, BUILDINGS } from './sim.mjs';
const sim = createSimulation({ mode: 'free', size: 200, seed: 1, roads });
sim.update(realDeltaSeconds); // fixed simulation steps, respects pause/speed
sim.setSpeed(0); // 0, 1, 3, 10
sim.setMode('defense'); // 'free' disables all assaults, clears active enemies
sim.place('residential', x, z); // returns {ok, reason?, building?}; integer lots
sim.bulldoze(x, z); // town hall protected
sim.repair(buildingId); // day only, spends budget
sim.setTaxRate(0.1); // 0..0.3
const state = sim.state; // live state; integration reads, does not mutate
const events = sim.drainEvents(); // toast/FX events, consume once per frame
```

The simulation pre-places the town hall at `floor(size/2), floor(size/2)`.
Integration must render this and subsequent buildings. Building types:
`residential`, `commercial`, `industrial`, `power`, `water`, `police`, `fire`,
`park`, `townhall`, `wall`, `watchtower`. `BUILDINGS` exports cost, HP,
upkeep and utility loads. Buildings occupy one logical lot; the world kit
may draw the town hall larger. Placement needs an empty non-road lot.
Road placement/bulldoze is world-owned; `sim.spend(amount)` reserves construction
costs before integration calls its roads API. Utility/path caches detect road edits.

`state` supplies `population`, `peakPopulation`, `budget`, `income`, `upkeep`,
`netIncome`, `demand: {residential, commercial, industrial}` (0..1),
`power` and `water` (`{supply, demand, served, unserved}`), `crime` (0..1),
`mode`, `speed`, `phase` (`day`, `night`, `lost`), `dayRemaining`, `night`,
`score`, `kills`, `townHallHp`, `townHallMaxHp`, `time`, plus `buildings`,
`cars`, `zombies`, `defenders` arrays. All positions use grid `x,z`, not metres.
Buildings expose `id,type,x,z,hp,maxHp,residents,powered,watered,serviced`.
Agents expose `id,x,z`; cars also `heading` (world Y rotation in radians,
models facing local -Z), `lane` and `parked`. Map grid positions with
`world.roads.center(agent.x,agent.z)` before calling world kit transforms.

FX events: `shot` contains `from:{x,z}`, `to:{x,z}`, `source` (`tower` or
`citizen`) and `target`; call the world team's tracer/impact API. Other event
names include `placed`, `removed`, `damaged`, `destroyed`, `blackout`,
`wave-warning`, `wave`, `night-survived`, `milestone`, `lost`, `repaired`.
Events carry `time`; loss carries `score`, `peakPopulation`, `kills`.
There is no rendering or UI in this module.

## Roads handshake

The simulation directly imports the world team's `RoadGrid` from `roads.mjs`.
Pass `world.roads` to share the authoritative grid. Traffic calls `path` and
`lanePoints`; utilities use `has`/`neighbors`; cache invalidation uses `version`.
There is no duplicate road implementation. Integration must reject road edits
on occupied building lots before calling world road placement. Zone lots require
an adjacent road. Use `world.buildings.spawn/transform/remove` to draw sim arrays.

## FX request / integration hold

`shot` events already contain exact `from`/`to` grid positions. World/integration
must convert with `world.roads.center`, raise muzzle/impact height and render a
brief tracer plus impact. `damaged`, `destroyed` and `kill` can drive world FX.
The currently published world kit has no tracer/impact method. Simulation does
not implement a second renderer or UI to hide this gap. This request was sent
to both world and UI lanes. C/D/F/G/H/I screenshots and visible tower/citizen
shots remain integration gates, not implied by headless assertions.

## Gates

The headless check is `node Games/Citisten3D/sim-check.mjs`. It will print three
scripted nights, a 600-second population/budget run, blackout/abandonment,
free-mode suppression and wall/damage/kill/loss assertions. Browser QA C/D/F/G/H/I
requires the integration scene; headless results are not screenshot acceptance.
