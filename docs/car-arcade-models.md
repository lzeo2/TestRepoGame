# Car arcade fleet/model source checkpoint

Task #98, Anonymous Arcade Worker <>, parent `a48a38630fd29df505c0701dee5bc80cc858ad23`.
Session log basename: `2026-10-02T12-48-38-942Z_01a0fca8-d819-77e1-9f92-81e2b43c2c12.jsonl`.
Model environment reported `gpt-6-astra`. Source and test are committed together
with this report; obtain the exact source commit from its Git history.

## Authority and source

The explicit two-original-game/model authorization is recorded in
[the complete implementation plan](car-arcade-plan.md). This is original authored
procedural vehicle geometry, not an ingested game or copied vehicle asset. Pip
Borough uses an original generic retrocompact profile, not an OEM body, name,
logo or replica. No downloaded textures, GLBs, fonts or vehicle artwork. This is
source/originality evidence, not a legal noninfringement guarantee or a claim
that the library license establishes provider-output rights.

Imports use only the existing local `assets/car-arcade/vendor/three.module.js`
and `BufferGeometryUtils.js`, the parent's documented pinned r160 library/helper
with local MIT notice. The helper merge implementation and relevant local THREE
geometry/material constructors were inspected before use. No vendor bytes were
edited. At initial inspection no game/controller callers existed; the frozen
plan is the coordination contract. No existing game, catalog, manual, inventory,
other worker path, sparse selection or dependency was changed by this worker.

## Exact exports and integration ABI

`assets/car-arcade/fleet.js` exports only `CARS` and `BY_ID`:

- `CARS`: frozen ordered array of 16 individually frozen flat records.
- Record fields exactly `{id,name,price,speed,acceleration,handling,toughness,
  style,color,length,width,height}`. IDs, names and prices match the plan.
- `BY_ID`: frozen null-prototype ID-to-record map, referencing the same records.
- Colors are `#RRGGBB` strings. Nominal dimensions are meters; stats are original
  authored balancing inputs, not measured real-car specifications.

`assets/car-arcade/models.js` exports only:

- `createCar(id, {color} = {}) -> THREE.Group`. Unknown IDs throw `RangeError`.
  Color accepts a six-digit hex string or integer RGB `0..0xffffff`; invalid,
  inherited/accessor or unknown options throw `TypeError`. Undefined color uses
  fleet paint. No arbitrary objects are passed to THREE's color parser.
- `disposeCars() -> undefined`. Final cleanup after all consumers/renderers stop.
  Disposes every cached geometry/material exactly once, clears caches, and is
  idempotent. A subsequent `createCar` builds fresh resources.

Root `name` equals car ID. Forward is **-Z**, +Y is up. Four wheels sit at y=0
at rest. Wheel order is front-left, front-right, rear-left, rear-right; each is a
separate Mesh rotating about local X. Rotate the root to orbit/show the whole car.
`group.userData` is frozen and contains:

```text
{carId, wheels, triangles, drawCalls,
 dimensions: {width,height,length},
 profile: {form,wheelRadius,axleHeight,wheelbase,forward,wheelAxis,measurement}}
```

`wheels` is a frozen array of mutable render objects, intentionally permitting
normal wheel animation, not a gameplay/debug setter. Dimensions/profile are
frozen. Dimensions measure the unrotated local geometry including protrusions;
fleet nominal dimensions and measured render bounds are therefore not identical.
`wheelRadius` is the construction radius; `axleHeight` is the measured resting
wheel-center height. Metadata has no cache, economic state, grant or test hooks.

Instances have independent objects/transforms but share geometry and pooled
materials. Treat those resources as read-only: use the color factory argument,
not material mutation. Removing one instance must NOT dispose its resources.
There are four geometry buffers per prototype (paint, colored detail/interior,
glass and wheel), with wheel geometry drawn four times. Static trim, rims,
tread blocks, upholstery and other details use vertex colors and merged indexed
buffers. Three static meshes plus four wheel meshes give seven draws in a
single normal color pass; transparent glass explicitly uses one pass. This is
not a measured renderer.info total or a promise about caller-added passes/shadows.

## Distinction and measured budgets

Shared construction helpers do not imply identical bodies: authored cowl/roof/
rear-glass locations, belt heights, width tapers and wheelbases differ, plus
form-specific geometry. Every car has fender arcs, seams, handles, grille slats,
front/rear lamps, mirrors, wipers, seats/headrests/dashboard/steering wheel,
exhausts, treaded tires and rims. The starter adds patchwork, scratches/rust and
lamp tape. Pip has its own short tapered cabin and cream roof; van/panel forms
have taller panel inserts; wagon/scout have rails; roadster has no roof and has
roll hoops; pickup has an open ribbed rear bed; GT/sport forms have long hoods,
fastbacks/vents/splitters and selected rear wings. No artificial logos.

CPU geometry measurements (meters, rounded to three decimals), seven draws each:

| ID | Triangles | Width | Height | Length | Form |
| --- | ---: | ---: | ---: | ---: | --- |
| bricklet | 5704 | 1.704 | 1.480 | 3.670 | worn boxy starter |
| pip | 5596 | 1.744 | 1.550 | 3.340 | original retrocompact |
| parcel | 5576 | 1.784 | 1.835 | 3.740 | tall panel hatch |
| finch | 5960 | 1.804 | 1.300 | 3.980 | small sport/lip |
| lantern | 5516 | 1.884 | 1.510 | 4.600 | saloon |
| comet | 5960 | 1.924 | 1.280 | 4.340 | fastback coupe |
| orchard | 5564 | 1.914 | 1.625 | 4.840 | long-roof wagon |
| pebble | 5716 | 1.884 | 1.590 | 3.870 | rally hatch |
| dockside | 5600 | 2.044 | 2.085 | 5.140 | van |
| horizon | 5576 | 2.004 | 1.350 | 4.940 | long-hood GT |
| morrow | 5968 | 1.864 | 1.228 | 4.100 | open roadster |
| gravel | 5684 | 2.084 | 1.915 | 4.530 | crossover/scout |
| relay | 5516 | 1.964 | 1.470 | 4.980 | touring saloon |
| tempest | 5996 | 2.044 | 1.240 | 4.400 | winged sprint |
| atlas | 5612 | 2.204 | 1.980 | 5.340 | utility pickup |
| sunray | 5996 | 2.144 | 1.200 | 4.780 | low wedge/halo |

## Runnable checks and limits

Commands run from repository root:

```sh
node --experimental-default-type=module scripts/test_car_arcade_models.mjs
node --experimental-default-type=module --check assets/car-arcade/fleet.js
node --experimental-default-type=module --check assets/car-arcade/models.js
node --experimental-default-type=module --check scripts/test_car_arcade_models.mjs
python3 -B scripts/check_maintenance_docs.py
git diff --check
```

All exited **0**. Regression output:

> PASS: 16 distinct normalized prototypes, 3 all-car disposal cycles, 249 resources each disposed once; finite buffers, sharing, metadata, hostile inputs.

The regression examines actual THREE geometry/index/attribute buffers, exact
fleet fields and prices, normalized geometry uniqueness (not merely different
scales/colors), measured bounds/ground contact, per-car triangle/draw counts,
independent transforms, shared resources, repeated disposal/recreation, frozen
metadata, malicious IDs/options/colors and rejection without invoking getters.
It uses the real local library; no mocks, screenshots, cheat or progression
fixtures. CPU dispose-event checks do not certify GPU driver memory reclamation.

Maintenance checker output:

> PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.
> Coverage only: section presence does not certify documentation accuracy or gameplay.

That covers the pre-registration inventory only. Main owns subsequent game
registration/manual/inventory work. No game was registered or published here.

Holds: no browser screenshot review, subjective final silhouette/detail approval,
real renderer draw/memory timing, mobile hardware FPS, natural progression,
whole-campaign balance, full-catalog browser gate or legal clearance is claimed.
No push. Synthetic geometry PASS is not native gameplay acceptance.

Initial free disk: **2,337,792,000 bytes**; final pre-commit free disk:
**2,336,538,624 bytes**, shared-workspace change **1,253,376 bytes**, below the
30 MB cap and above the 2,000,000,000-byte guard. The three source/test files
total 22,035 bytes; this report adds approximately 8 KB. The authored-runtime
external-load/machine-path scan and staged diff check also exited 0.
Concurrent sibling files remain owned by their workers.
