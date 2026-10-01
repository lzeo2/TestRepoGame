# Foldwild authored region data, milestone 1

Delegation 42 implements `Games/Foldwild/region-data.js` and its focused check.
Actual worker provider/model: `openai-codex/gpt-6.1-sol`. This is data and pure
navigation for the approved existing RPG, not a completed five-chapter campaign.
No catalog entry, game ID, publication or push is part of this change.

## Adapter contract

Exports are `REGION_DEFINITIONS`, its identical alias `REGIONS`,
`REGION_LAYOUTS`, `movePosition(region, position, dx, dz)` and
`routeTo(region, from, target)`. Region arguments are integer indices 0..4.
Definitions and layouts are recursively frozen. Returned movement positions
and route waypoints are fresh objects; neither function changes its inputs.
The existing `world.js` adapter and core remain separately owned.

Each layout includes bounds, spawn, flat palette, path polylines, `pathWidth`
(default 3.5 m), primitive props, rectangular colliders, waynodes, static points
and three `wildSites`. Each wild site has x/z, a canonical habitat element and
basic/evolved tier preference. The adapter, not this module, selects species,
levels and `wild-0`/`wild-1`/`wild-2` encounter points.

| Index | Region | Habitat | NPCs | Shops | Trial character |
| --- | --- | --- | ---: | --- | --- |
| 0 | Rootfold Meadow | Loamveil | 10 | meadow-main, meadow-road | Maren |
| 1 | Stillwater Reach | Rillune | 10 | reach-main, reach-road | Sola |
| 2 | Emberstep Quarry | Cindrel | 10 | quarry-main, quarry-road | Neri |
| 3 | Stonefold Ridge | Gleamric | 9 | ridge-main, ridge-road | Iven |
| 4 | Quietfold Hollow | Hushmere | 9 | hollow-main | Oren |

Every region spans x/z -80..80: 25,600 m² gross each, 128,000 m² total. Spawn is
`{x:0,z:16,yaw:0}` on the village approach, not a water crossing. Houses are
closed exterior volumes; their front approach positions remain reachable.
Paths take open ground around buildings and quarry/ridge shelves. The regions
vary channel side, bridge positions, terrace obstacles, trail loops and groves.

Rootfold retains the assigned camp (-4,18), merchant (4,16), tailor (8,16),
mentor (8,10), supply counter (4,10), residents (-8,12), (-12,20), (12,22),
(16,20), Maren (22,-26) and north gate (0,-70). The west road merchant is
(-40,12), beyond the bridge. Its x -24..-16 channel has bridges at z 12 and -30.
All channels use 6 m collision openings at their two bridge decks. There are
96 trees per region (480 total), arranged from authored grove positions and
fixed offsets. Trees have no collision; repeated primitives can be instanced
by the view. Houses, rock shelves and water do have collision.

NPC counts include `npc`, `merchant`, `mentor`, `contract` and `rival` points.
They exclude camps, exits, supplies and generated wild encounters. Twelve
actors are marked principal: five trailkeepers, five mentors and the first two
main merchants. Every actor has an original short three-paragraph dialogue.
These are static identities and conversations, not reactive quest arcs or NPC
movement routines. The view must cull nearby actors rather than simulate all 48.

`camp`, `rival` and `exit` remain region-local stable IDs. Each region also has
`supply-0`/`supply-1`/`supply-2`: three fiber per pickup. Validate/claim these using
`${region}:${id}`, never a global unqualified point ID. Supplies are data, not
self-paying transactions. Main counters carry `${shopId}-supply` contract IDs;
road merchants carry both their shop and road supply-contract IDs. Tailors
share the main shop without creating extra shops. Runtime economy exports were
inspected and their nine shop/contract IDs match this data exactly.

## Navigation behavior

Movement sweeps x then z, clips against every relevant obstacle face, and
slides along it. Large deltas cannot tunnel through a collider. The 0.35 m
player radius also applies to bounds, so centers stop at +/-79.65. Missing yaw
defaults to zero; supplied yaw is preserved. Invalid region indices, non-finite
coordinates/deltas/yaw and blocked/out-of-bounds starting movement positions
throw. Recovery/migration to a safe spawn belongs at the save/core boundary;
this module does not silently teleport a stuck player.

Routes use segment/AABB slab visibility with radius-expanded rectangles, then
a bounded Dijkstra scan through authored trail/bridge nodes and obstacle-corner
nodes. No dependencies, physics engine, navmesh or runtime path generation
framework is introduced. Unsafe or unreachable endpoints produce `[]`;
malformed coordinates/indices throw. A successful route includes the exact
requested target. Straight visibility returns just that target. Collision
faces permit tangency within a 1e-8 m numerical tolerance. The graph contains
fewer than 100 nodes per map; its quadratic scan is explicitly bounded.

## Runnable evidence

```sh
node --experimental-default-type=module --check Games/Foldwild/region-data.js
node --check scripts/test_foldwild_regions.mjs
node --experimental-default-type=module scripts/test_foldwild_regions.mjs
```

Focused regression output:

```text
PASS: 5 regions, 128000 m², 480 trees, 48 NPCs (12 principal), 9 shops/contracts; 73 POI + 15 wild routes, 185 collision-safe segments; water/bridge/house/sliding/bounds/invalid inputs/immutability
regions test exit: 0
```

Both syntax checks exit 0. The regression checks every static POI and wild site
from spawn, independently samples complete route segments at 5 cm intervals,
and follows them with the actual movement function. It also checks authored
path centerlines, every house front approach, alternate-bank routing, bridge
crossing width, water/building blocking, sliding, large deltas, corner avoidance,
bounds margins, invalid inputs, fresh deterministic imports and frozen inputs.
An intermediate bridge-width check caught a cottage too close to Rootfold's
bridge approach; the cottage was moved before the final passing run.

The authored layout/primitive positions and NPC copy are new original work for
this authorized development task. No GLBs, supplied species constants, local
renderer/fonts, licenses or optional horror data were edited or generated. No
new runtime network loads, packages, textures or artwork files were added.

Held for integration/main review: rendering and screenshots, camera/appearance,
world/save adapter reexports, core service interactions, trial teams and unlocks,
reactive campaign content, all-species acquisition, final expedition and hardware
profiling. No browser server or screenshot task ran here. This pure-data check
is not a full-game gate, visual acceptance or N100 certification. Full registered
catalog gate passes for this worker: zero. Foldwild remains unregistered.
