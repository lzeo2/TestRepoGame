# CITISTEN building and agent mesh API

`Games/Citisten3D/buildings.mjs`: original flat-color box geometry; no textures,
borrowed art, external assets, animation state or simulation logic. One merged,
vertex-colored geometry and one InstancedMesh per used type, shared Lambert
material. No per-building scene nodes or lights.

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

## Complete kit

| Key | Silhouette / nominal footprint |
| --- | --- |
| residential | Three small terraced houses, red roof caps, doors; 7.5 x 5.7m |
| commercial | Mid-rise 11m block, storefront and roof cap; 7.4m square |
| industrial | Broad low shed, loading door; 9 x 8m |
| power | Plant and two unequal chimney stacks; 8 x 7m |
| water | Elevated square tank on four slender legs; 5.6m square |
| police | Low station, dark blue fascia and roof block; 7m square |
| fire | Red station with twin pale garage doors and hose tower; 8 x 7m |
| park | Grass slab, two block-canopy trees and bench; 8m square |
| townhall | Distinct 16m-wide civic hall, four columns, 17m clock tower |
| wall | 10m segment with five crenellations; local X axis |
| watchtower | Tall post, platform and enclosed lookout; 4m square |
| citizen | Upright torso, separate legs/arms, raised head; 1.9m tall |
| zombie | Broad hunched torso, forward head, extended arms; 1.65m tall |
| car | Box chassis, raised cabin, four dark wheels, headlights; 1.7 x 3.5m |

Y=0 is the model base; rotation is radians around +Y, scalar scale must be
positive. Agents face local -Z. Town hall is intentionally about twice the
width of ordinary buildings; simulation/integration must reserve sufficient
visual space. The kit does not perform occupancy or collision checks.
`world.roads.center` converts fractional lot-space sim positions to metres.

No weapon/tracer/damage FX are implemented in this lane: systems owns behavior
and its visual events. Base models are static blockouts, not rigged heroes.
