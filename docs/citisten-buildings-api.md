# CITISTEN building and agent mesh API

`Games/Citisten3D/buildings.mjs` exports `createExternalBuildingKit` from
`external-buildings.mjs`. Supplied local GLBs replace the procedural runtime
kit; the original factories and their old checks are historical, not loaded by
this entry. No remote assets, simulation mutation or invented gameplay actions.

```js
const world = createWorld(canvas, { modelLOD: 0 });
await world.ready;
const kit = world.buildings;
const p = world.roads.center(building.x, building.z);
const handle = kit.spawn(building.type, p);
kit.transform(handle, { x: p.x, y: 0, z: p.z, rotation: Math.PI / 2, scale: 1 });
kit.remove(handle);
```

`createBuildingKit(scene, capacity=10000, {lod=0}={})` works independently;
await `kit.ready`. Spawning/transforming handles before readiness is supported,
but no model is rendered until its resources exist. Failed loading rejects
readiness, rather than substituting a procedural asset. Capacity is per type;
overflow and invalid/nonfinite transforms throw. `transform` replaces the
whole pose: omitted x/y/z/rotation are 0, scale is 1 and must be positive.
Handles remain stable after swap-removal; never retain their mutable index.
`remove` returns false for already removed or foreign handles.

`types` enumerates 17 keys. `pools` is diagnostic, not a mutation API:
`p.mesh.count` counts logical instances and `p.mesh.getMatrixAt` copies their
root matrices. **p.mesh is not a render mesh.** `p.batches` contains actual
InstancedMeshes. Static geometry is merged by material/attribute layout;
rigid animated primitives are instanced without per-handle geometry/texture
copies. There is no `kit.material` singleton or old `p.detail` blockout LOD.

LOD is explicit for the session: 0, 1 or 2. Only that GLB alternative is loaded,
not three copies of its embedded maps. LOD0 is the default, including distant
instances; no camera-dependent hidden downgrade or 40 FPS claim. `update(camera,
night, dtSeconds)` scales emission from its original baseline and advances
motion; `world.render` calls it once. Actual changed agent poses drive supplied
citizen/zombie walk loops; stationary poses stop advancing the clip. Car wheel
roll follows signed distance and authored wheel radius. Doors, steering and
other unsupported sim actions remain in their authored rest poses.

`version` invalidates static block AO on static edits only. `handle.pose` and
`matrix` are read-only diagnostics. `dispose()` invalidates handles, releases
batches/mixers/geometries/materials/maps/bitmaps and is idempotent. Independent
kit instances do not share an unsafe process-global resource lifetime.

## Supplied kit

Counts are actual LOD0 triangles, not the old procedural numbers or render
passes (shadow draws can count the same geometry again).

| Runtime key | Delivery directory | LOD0 triangles |
| --- | --- | ---: |
| residential | residential_row | 21,046 |
| commercial | commercial | 45,388 |
| industrial | industrial_shed | 11,702 |
| power | power_plant | 28,576 |
| water | water_tower | 24,500 |
| police | police_station | 21,614 |
| fire | fire_station | 28,550 |
| park | park_lot + shared tree assembly | 3,356 + 7,350 |
| townhall | town_hall | 111,163 |
| wall | wall_segment | 9,228 |
| watchtower | watchtower | 8,988 |
| citizen | citizen | 20,455 |
| zombie | zombie | 20,553 |
| car | compact_car | 9,608 |
| tree | tree_deciduous | 7,350 |
| patrol_car | patrol_car | 9,980 |
| utility_car | utility_car | 9,980 |

Coordinates are metres, Y-up, with base grounding retained. Rotation is radians
around +Y. Agent forward is -Z. Five rigs explicitly declare architectural
facades +Z; the adapter normalizes only those scene wrappers to the kit's -Z
front, preserving every authored node-local pivot and all LOD ground offsets.
The 18 x 15m town hall exceeds one 10m lot; integration must leave visual space.
The kit does not own occupancy/collisions. `roads.center` converts fractional
sim lot positions into metres. Car variants are optional appearances, not new
simulation services. Park uses the supplied shared-tree assembly recipe.

See `docs/maintenance/audits/citisten-external/intake.json` for source hashes,
LOD payloads, channel dimensions and metadata discrepancies. Supplier originality
is a provenance claim, not independent authorship/photorealism verification.
Missing standalone door AddOn and absent terrain AO remain recorded findings.

## Shot-event visual consumer

`world.effects.shot(event.from,event.to)` accepts sim **grid-space** x/z and
optional metre y (default 1.2). It draws a short tracer/impact, not damage,
targeting, audio or simulation state. `world.render(dt)` expires effects; do not
tick twice. A fixed 64-slot ring bounds allocation. Invalid poses throw and
`world.dispose()` frees the pool. Integration drains `sim.drainEvents()` only
once and dispatches all event types, including `type === 'shot'`.

## Runnable checks

```sh
node --experimental-vm-modules Games/Citisten3D/external-model-check.mjs
node Games/Citisten3D/external-materials-check.mjs
node Games/Citisten3D/world-check.mjs
python3 -B docs/citisten-design/check-external-assets.py --canonical-only
```

Model checks use real GLB data with stubbed HTTP/image decoding. They do not
certify GPU rendering, native gameplay or performance; fresh browser evidence
and the unchanged 40 FPS gate are separate.
