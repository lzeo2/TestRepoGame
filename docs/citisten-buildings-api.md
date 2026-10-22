# CITISTEN building and agent mesh API

`Games/Citisten3D/buildings.mjs`: original procedural geometry, local generated
PBR textures, no borrowed art, remote assets, animation state or simulation logic.
`model-city.mjs`, `model-services.mjs`, `model-agents.mjs` supply detailed meshes;
`model-geometry.mjs` merges indexed parts, vertex contact/directional shading,
subtle UV-edge wear and deterministic window-light variation. Each facade atlas
tile is 512px within a 1024px atlas. Shared Standard material uses color, bump,
roughness and emissive maps. No per-building scene nodes or lights.

```js
const kit = world.buildings;
const p = world.roads.center(building.x, building.z);
const handle = kit.spawn(building.type, p);
kit.transform(handle, {x: p.x, y: 0, z: p.z, rotation: Math.PI / 2, scale: 1});
kit.remove(handle);
```

`createBuildingKit(scene, capacity=10000)` can also be used independently.
Capacity is per type; overflow throws rather than losing instances. Handles
remain stable after swap-removal. Do not retain their mutable `index` value.
`transform` replaces the whole pose, with omitted x/y/z/rotation defaulting to
0 and scale to 1. Invalid/nonfinite transforms and removed handles throw.
`remove` returns false for already removed/foreign handles. `dispose()` frees
GPU buffers and invalidates handles. `types` enumerates supported keys;
`pools` exposes read-only diagnostic meshes/handles, not a mutation interface.
`mesh.count` remains the logical instance count. `detail` is a lazily allocated
high-detail InstancedMesh, not another simulation object. `update(camera,night)`
is called by `world.render`: at most the nearest 16 high-detail instances per
type, within 120m for buildings, 450m for town hall, 35m for agents. Remaining
instances use the retained textured blockout LOD; high-detail instances' low
matrices are hidden. These hard transitions can visibly pop and are not an
asset-quality or frame-rate pass. A camera move of .5m or any pose edit refreshes
LOD; emission updates each render. `version` changes only for static model edits
and invalidates world block AO. `handle.pose`/`matrix` are read-only internals.
Both LODs, generated textures and material are disposed by the kit.

## Complete kit

| Key | Silhouette / nominal footprint |
| --- | --- |
| residential | 23,320 triangles; pitched tiled roofs, windows/doors/gutters; 7.74 x 6.50m, 4.93m high |
| commercial | 23,264; dimensional glazing/sunshades/HVAC; 8.05 x 8.38m, 11.92m high |
| industrial | 16,000; corrugation, shutter bays/sawtooth roof; 9.08 x 8.22m, 6.28m high |
| power | 16,504; stacks, busbars, insulators and pipes; 8 x 7.45m, 13m high |
| water | 10,160; curved tank, braces, valve/railings; 6.24 x 6.07m, 10m high |
| police | 14,388; masonry, glazing, roof dish/vents; 7.22 x 7.64m, 5.19m high |
| fire | 17,788; roller bays, masonry, louvred tower; 8.22 x 7.65m, 7.5m high |
| park | 13,544; two 6,076-triangle branching trees, path and bench; 8m square |
| townhall | 130,904; 16 fluted columns, pediments, four fixed ornamental clocks; 17.6 x 16.08m, 17.06m high |
| wall | 5,556; bevelled masonry, buttresses/crenellations; 10m local X, 1.49m deep |
| watchtower | 10,560; braced frame, stairs/lookout, curved tiles; about 4.07m square, 10.28m high |
| citizen | 28,680; curved clothing, hands, shoes and facial relief; 1.9m high |
| zombie | 29,604; forward hunch/arms, teeth and curved clothing; 1.65m high |
| car | 9,936; wheel arches, curved cabin, tires/rims, mirrors/wipers; 1.7 x 3.51m |

Y=0 is the model base; rotation is radians around +Y, scalar scale must be
positive. Agents face local -Z. Town hall is intentionally about twice the
width of ordinary buildings; simulation/integration must reserve sufficient
visual space. The kit does not perform occupancy or collision checks.
`world.roads.center` converts fractional lot-space sim positions to metres.

Detailed models are static sectional procedural meshes, not scanned/sculpted,
watertight or rigged heroes. The distant LOD remains a blockout. Model-only
Node checks count nondegenerate geometry and finite attributes/bounds; they do
not certify realism or whole-scene rendering performance. See the external
[model wishlist](citisten-design/MODEL-WISHLIST.md).

## Shot-event visual consumer (coordination addition)

`world.effects.shot(event.from, event.to)` accepts sim **grid-space** `{x,z}`
poses (fractional positions allowed). Optional `y` is height in metres, default
1.2. For a watchtower source, integration may supply `{...event.from, y:8}`.
It displays a solid pale-gold tracer and a small cream square impact for .14s.
No glow, targeting, hit detection, damage, audio or simulation mutation.
`world.render(dtSeconds)` renders then expires effects; do not tick them twice.
A fixed 64-slot ring overwrites the oldest shot under overload; no allocation
per shot or unbounded scene nodes. `world.effects.active` is diagnostic.
Invalid/nonfinite/out-of-grid poses throw. `world.dispose()` cleans up the pool.

```js
for (const event of sim.drainEvents()) {
  if (event.type === 'shot') world.effects.shot(event.from, event.to);
}
```

The event discriminator is `type` in the current sim module. Integration owns
other consumers and must drain the queue only once, dispatching all event types.
