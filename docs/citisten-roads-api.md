# CITISTEN roads API

World-owned source: `Games/Citisten3D/roads.mjs` and `createRoadPool` in
`world.mjs`. Original placement math and renderer, not a traffic simulation.

```js
import { createWorld } from '../Games/Citisten3D/world.mjs';
const world = createWorld(canvas); // default 200 x 200 lots, 10 metres per lot
const roads = world.roads;
roads.place({x: 80, z: 100}, {x: 120, z: 100});
roads.place({x: 100, z: 100}, {x: 100, z: 120});
const route = roads.findPath({x: 80, z: 100}, {x: 100, z: 120});
const lane = roads.lanePoints(route); // metre coordinates, right-hand traffic
world.render(dtSeconds); // syncs pooled mesh only after occupancy changes
```

## Coordinates and placement

- Integer lot coordinates `x,z` in `[0,size)`; Y is up, +Z south. All flat land
  is Y=0; slight noise is confined to the outer four lots. World metre centre:
  `((x+.5-size/2)*lotSize, 0, (z+.5-size/2)*lotSize)`.
- `center(x,z)` also accepts fractional indices for interpolated sim agents.
  `worldToCell(worldX,worldZ)` returns an integer cell or `null` outside bounds.
- `line(a,b)` returns an inclusive cardinal X-then-Z drag preview. `place(a,b,
  present=true)` applies it, returning those cells; `false` bulldozes.
- `set(x,z,present=true)` edits one cell and returns whether it changed.
  Invalid edits throw `RangeError` before partial placement.
- `has(x,z)` / `hasRoad(x,z)` report occupancy. `neighbors(x,z)` gives existing
  four-neighbour roads. `version` changes on each actual occupancy edit.
- `cells` is a Set of `key(x,z)` indices; `cell(key)` reverses that encoding.
  Read only: mutation must use set/place so version and mesh stay coherent.
- `world.pickLot(clientX,clientY)` casts onto Y=0; returns lot or null.
- `createRoadPool(scene,grid)` owns one InstancedMesh, capacity `size*size`, flat
  dark-gray 10m squares forming continuous strips. `sync()` rebuilds active
  transforms only on version changes; `dispose()` releases resources. Systems
  may add markings later, but should not duplicate the asphalt mesh pool.

## Routing contract (E integration boundary)

`path(a,b)` / `findPath(a,b)` return shortest cardinal road cells including both
endpoints, or `[]` for disconnected/missing endpoints. Same endpoint returns
one cell. BFS is bounded at 40,000 cells; systems should cache routes by version.
No road diagonal, agent movement, speed, traffic rules, collision or simulation
clock is implemented here.

`lanePoints(route)` returns metre `{x,y:.08,z}` waypoints, 1.8m right of each
centreline. At corners a miter intersects the two offset segments, keeping each
segment inside its road strip. Reverse routes occupy the opposite lane. It
rejects absent roads, diagonals, jumps and immediate U-turns. Empty route gives
`[]`. Recompute after road version changes; systems advance cars along the
segments, choose turns and re-route as needed. Car model faces local -Z, so a
segment `(dx,dz)` uses `rotation = Math.atan2(-dx,-dz)`.

## Verification / limitations

`node Games/Citisten3D/world-check.mjs` checks cardinal placement, bounds,
version edits, BFS connectivity, deletion, opposite lanes and corner offsets.
Standalone cars are static lane specimens, not E traffic acceptance. The QA
harness moves a car along exported lane points only to prove interoperability;
systems-owned live traffic remains a separate reviewer gate.
