# Shared street and vehicle people

14 November 2026. Capital Drive's original fictional adults now share
`person-model.js`: rounded capsule clothing/limbs, low-detail spherical heads,
hair and hands, and box shoes. The shared dimensions, palettes and deterministic
appearance descriptors are used by street pedestrians, vehicle occupants,
Yoober fares/drivers, bus drivers/passengers and the articulated player/police.
The player's warm jacket and officers' navy uniform remain recognisable.

Appearance belongs to the person identity, independently of the vehicle or an
exit event. Simulation includes `personId` in nearby vehicle descriptors;
Gameplay captures it before claiming the vehicle and passes it with the displaced
adult. The controller explicitly identifies the player, police and Yoober driver.
Carjacking and Yoober cancellation therefore keep clothing, skin and hair when
the driver stands outside. Standing height varies; seated people use a uniform
vehicle-specific fit below the roof. These are original stylised adults, not
real people's likenesses or a photorealistic character system.

Pedestrians retain their existing 36 suburban/64 Civic population, physical
contacts, witnesses, coffee/work routines and hold-up phases. Coffee adults now
stand holding a cup: arbitrary sidewalk chairs were visually unrelated to shops
and remained behind after the adult left. These chairs are removed. The two
arranged table/chair pairs on Lambzhou's apron and lazy interior seating remain.
Shared appearances
do not own movement, health, money, storage or a second clock. Lazy room actors
and street contacts retain their existing activity-specific renderers.

## Resource and pose boundaries

- Street people use ten pooled body/prop batches after the chair removal. Geometry is allocated
  when the view is created, never per adult per frame.
- Vehicle occupants share seven batches, three geometries and one material for
  at most 64 seated drivers plus 12 temporary displaced adults. The appearance
  cache is bounded to 128 identities. Culling, pause, expiry and idempotent
  disposal remain required. Car-factory resources are borrowed and untouched.
- Yoober has separate fixed driver/fare/player geometry so simultaneous adults
  can retain their own colours. Fare changes recolour an existing buffer rather
  than rebuilding geometry. The whole ride adapter is bounded to eleven active
  draws; waiting and seated versions of a fare are mutually exclusive.
- Two bus drivers are merged into their existing body batches; the player uses
  one pooled passenger batch. The whole bus view remains at most five draws,
  five geometries/two materials and 3,998 template triangles.
- The player remains articulated for walking, aiming, four weapons and combat;
  dismounted officers retain five pooled articulated parts. The actor adapter's
  tested maximum is 55 meshes/31,398 triangles, with twelve normal foot draws.

## Moving vehicles and adult bodies

Previously, walking checked vehicle bodies but vehicle movement only checked
static geometry and other cars. Simulation now receives a live geometric copy
of street people, contacts, dismounted officers, the outside Yoober driver,
waiting fares and the on-foot player. The player is excluded while seated,
indoors or recovering. The controller refreshes the shared 8 m spatial index
before driving and again after foot movement before external buses/rides move.
Pedestrians copy their small contact descriptors into a reused caller-owned
array; they do not expose mutable internal characters.

The index accepts at most 256 finite, in-bounds active circles, defaults to
0.35 m radius and retains the supplied adult radii. Full oriented vehicle bodies
check end faces, sides and corners. Linear movement uses a continuous rounded
rectangle sweep; turning bounds the corner arcs between samples. Fast movement,
rotation and impact separation cannot bypass the person check. Existing overlap
may escape by outward translation rather than getting deeper. The physics owner
does not move, damage, pay or otherwise mutate a person.

Passenger foot-clearance probes explicitly ignore the querying player's own
`player-body` circle; other adults still block them. Driver foot probes have
their own narrow exemption. Car movement never automatically ignores a person
whose ID happens to match the car. Supplied clocks, safe boarding, full vehicle
collision and existing health/witness owners remain in effect. Read-only contact
counts/query diagnostics help verify that the controller supplied live bodies.

## Reproduce

Run `python3 -B scripts/check_capital_drive.py` from the repository root. The
person-model and occupants suites check shape/proportion agreement, immutable
deterministic identities, variation, carjacking identity capture, all sixteen
cockpit fits, buffer bounds and disposal. Existing pedestrian/routine, actor,
weapon, ride and bus assertions remain in the runner.

`test_capital_vehicle_people.mjs` additionally checks moving cars against standing
adults, actual traffic updates, buses/rides, tiny corner contacts, high movement
requests, densely sampled turns, outward escape, stale/cleared descriptors,
bounded local candidates and pause. Transport suites include live body inputs
so the player's own circle cannot silently break boarding.

For bounded cloud evidence use
`python3 -B scripts/test_capital_people_browser.py --capture --output <fresh-external-directory>`
or the runner's `--browser --people-browser --output` selector. The native section
starts actual Free roam, exits normally and moves with W. A separately labelled
component fixture compares a shared adult standing, seated in original car
artwork and after `addExit`; it does not prove a normal-input carjacking. Its
captures and colour-buffer checks supplement the gameplay authority regression.
The temporary server/browser close at completion. No dependency install or
production gameplay setter is added. Software WebGL and geometry counts do not
establish Intel N100 frame rate.
