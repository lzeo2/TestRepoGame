# Wings F/A-18 structure study and speedboat design

2026-10-19, baseline `e2028d6`. **Parent approved this two-weapon water-class approach after study commit `2fe6f4c`; final acceptance remains gated.**
Notes only; environment confirms `openai-codex/gpt-6-astra`, reasoning `medium`; 15-minute lane cap.
Prior incomplete study `7831179` stopped at 2,147,213,312 free bytes, below 2,147,483,648.
Operator answered ticket `pi-829842-1792388121373-af09fa13`; resume began at 2,631,041,024.
Guard before note: 2,629,754,880. No deletion anywhere, installs, downloads, browser or sparse changes.
Read AGENTS, CODE_QUALITY, maintenance README/manual232, audit resume/Phase 5,
Wings quality/models/repair-study contracts and the entire partial study. Historical passes stay dated.

## Evidence scope: facts, not proposed functionality
Inspected nine read-only files from upstream pin `bf5f6277e38ee52e9bfa4ae4a01337b46175c181`:
`src/render/{aircraft,toon,scene,camera}.ts`, `src/sim/{vehicles,combat,bots,room-engine}.ts`,
`src/audio/engines.ts`. These are unpatched upstream; compared current `Games/Wings/port.patch`.
Balanced, quote-aware object extraction inspected all seven actual built descriptors in
`assets/aircraft-BIwDLCoz.js`; bounded excerpts also checked patched color/doors/gear/input,
spawn/validation/hardpoints/bot weights, loopback/snapshots/audio and renderer-startup boundaries.
No minified bundle was edited or dumped wholesale. The generated aircraft registry matches the patch.
Current static counts independently decoded from GLBs, supporting indexed and non-indexed primitives:

| Kind / model | Triangles | Bytes | Primitive assignments / unique base colors |
| --- | ---: | ---: | ---: |
| fighter / fa18 | 16,896 | 912,784 | 151 / 10 |
| apache / apache | 11,322 | 745,072 | 202 / 10 |
| warthog / a10 | 17,576 | 952,180 | 166 / 12 |
| blackbird / yf12 | 18,028 | 780,572 | 123 / 12 |
| bomber / b2 | 4,740 | 283,788 | 96 / 10 |
| f15 / f15 | 41,352 | 1,176,316 | 142 / 12 |
| f35 / f35 | 40,812 | 1,174,768 | 143 / 12 |

## Current descriptor and F/A-18 contract
`KindConfig`: file, pivots, optional attach(mesh-name -> pivot), stores, spinners, afterburners,
optional turret/ballPod/rollPod/rudders/doors, anchors, placeholder, shadow. Axis is x/y/z.
Stores: weapons `[seat,slot][]`, order `string[]`. Spinner: name, axis, speed(rad/s),
driver rotor/engine/gun. Afterburner: name, axis, optional cone `{dir,sign:1|-1,length}`.
Turret: yaw/pitch node names, seat, yawMax/pitchMin/pitchMax. BallPod: name/seat/maxUp;
rollPod: name/seat; rudders: names/gain/max. Doors: `[name,angle][]`, axis, seat,
optional explicit weapons pairs added by port. Anchors: key/node/optional tip.
Placeholder: length/span/heli boolean; shadow: `[span,length]`. No boat placeholder/movement class exists.
F/A-18 file `fa18`, pivots: gear, pilot_1, pilot_2, targeting_pod_head, afterburner_L/R,
missile_L1/L2/R1/R2, wingtip_missile_L/R. No attach/turret/rollPod/rudders/doors override.
Pilot secondary [0,1] store order: missile_L2, missile_R2, wingtip_missile_L, wingtip_missile_R.
Officer [1,0]+[1,1] order: missile_L1, missile_R1. Pilot fit cannon20/aim9; officer tvmissile/null.
F/A-18: jet, HP 450, radius 8m, cruise/boost/stall 135/185/55m/s, 12 flares, Pilot/Weapons Officer seats.
Store visibility sums configured ammo/capacity, skips duplicate slot IDs and ceil-scales to store count;
first declared store disappears first. F/A-18's four pilot stores represent two rounds, not four.
Both afterburners stretch local Y; generated cones point -Y, length 1.5. Spinners empty.
BallPod targeting_pod_head follows seat 1 with maxUp .15. Anchors: gun -> gun_muzzle,
afterburner_L/R -> same-name nodes, targeting_pod_head -> same-name node; none uses tip.
Placeholder length/span 17.5/13, heli false; shadow 14/18. Gear scales toward gearDown at rate 7,
far views snap; pilots follow occupied seats. Hidden bones retain tiny nonzero scale, not deleted meshes.
Cockpit `[0,1.6,-5.2]`, gunner `[0,-1.4,-3]`, gunner lead/drop 9/1.5; chase dist/height 26/6.
Cockpit rotates body-local eye by orientation. Gunner can use rendered pod world anchor;
adds look-direction lead, world-down drop, floor clearance 1.5. Chase floor clearance is 3.
Shadow casts along sun, queries ground height and a slope stencil, scales/fades with altitude;
shadow span/length is not a collision hull or camera measurement.

Sibling registry findings: Apache already selectable, eight Hellfires [1,1] ordered L4/R4 through L1/R1,
rotors Y -30/X 70, chin yaw/pitch turret, no afterburners. A-10 attaches pod window to pod pivot,
stores R1/L1 on officer slots, gun Z45 and engine fans Z +/-40; roll pod, no cones.
YF-12 stores 3/2/1 map to empty pilot slots although AIM-47 belongs to officer: inherited mismatch,
not a template to copy or an authorized repair. Twin +Z 2.4 cones and yaw-driven fins remain.
B-2 officer [1,0] stores 8 through 1, doors Z +1.45/-1.45, buried dim exhaust, no cones/spinners.
F-15 has four stores split [0,1]/[1,0], twin +Z 1.5 cones, no gear pivot; size/shadow 19.44x13.
F-35 same slot split, single +Z 1.8 cone, Z doors -1.45/+1.45 triggered only by those missile slots;
size/shadow 15.7x10.7. Both have gun and authored weapon/exhaust anchors; no spinners.

## Conversion, materials and scene facts
`buildTemplate` removes model root world transform via inverse; each configured pivot becomes a bone
under its nearest configured ancestor. Geometry uses nearest pivot unless attach overrides it.
Vertices bake into root space with rigid weight 1; inverse bind matrices retain articulated transforms.
Paint/livery/glass use 55-degree creased normals; applyMatrix4 transforms normals as well as positions;
negative determinant reverses triangle winding. Missing nodes warn, not fabricate working features.
Material-value buckets include color/roughness/metalness/opacity, then paint and metal merge with
vertex colors; livery/glass/nav/strobe/glow/afterburner/flame stay role-based. Visors route to metal.
Color precedence: named group override, then authored paint only for f15/f35, otherwise paintColor;
per-part overrides follow. `toon.ts` lifts near-black toward gunmetal. Boat needs its own explicit
preservation branch, not a global remap. `livery_` names become team colors, not arbitrary authored trim.
Anchors compose nearest bone inverse with node transform; tip scans subtree minimum local Z and mean X/Y.
Cones derive nozzle subtree cross-section, follow nozzle bones; throttle >.7 and boost control glow/length.
Scene uses node materials, ACES, quality-dependent shadows/bloom; Low bypasses postprocessing.
Thumbnails use actual converted views. Frame stats read renderer draw calls/triangles after render reset.
First real draw remains mandatory; shader/device/zero-draw errors and 20-second timeout fail closed.

## Selection to simulation to presentation: inspected chain
Custom lobby cycles VEHICLE_KINDS; request.aircraft reaches GameSession after renderer readiness.
Hangar spawn and Custom both send `{type:"spawn",kind}`. Offline net-adapter calls sim/loopback;
actual built loopback JSON-round-trips requests, queues decoded responses, runs RoomEngine and clears
its interval/removes player on close. No remote transport is needed. Existing hangar keys are 1-7.
RoomEngine.handle -> onSpawn validates string membership, match/respawn/leave rules and surviving carrier.
spawnVehicle syncs moving fleet, tests 16 slots with 25m occupied clearance, creates FlightState and
createWeapons, seats player at 0, resets input and applies spawn protection. Exhausted slots wrap today.
Ticks run at 60Hz: consume inputs/bots -> stepFlight -> applySeatInput -> stepCombat; snapshots at 20Hz.
Actual built stepFlight dispatches heli vs jet only. Client prediction and reconciliation also call it;
server-only water changes would desynchronize the boat. Leave currently requires own deck or protection.
Vehicle wire fields: id/kind/team, position/velocity/quaternion/angular velocity/throttle, ground/gear/crash,
HP/seats/aim, ammo per slot/flares/spotted/dead. Own detail adds full weapon runtimes and prediction tick.
Projectile wire carries weapon/owner/vehicle/team/position/velocity/age/ttl; no timed-charge state exists.
Decoder restores vehicles, then GameSession interpolates views, syncs all four firing hints and updates
anchors/stores. Pause/seat/ownership cleanup must remain; new class must survive the same normal lifecycle.
VehicleSpec currently has kind/name/model/flight/maxHp/radius/cruise/boost/stall/seatWeapons/flares/seatNames,
optional stealth and hardpoints `{gun,missiles:[[Vec3,Vec3],[Vec3,Vec3]]}`. FlightModel is jet|heli.
WeaponSpec: id/name/kind/damage/splash/rate/speed/ttl/ammo/refill/refillDelay plus optional range,
lockCone/lockTime/turnRate/spread/turret. Kinds: gun, rockets, missile_lock/scanner, pulse, bomb.
createWeapons makes two runtimes per seat; bombs shared across seats share ammo/cadence. Input checks
protection then dispatches ballistic/bomb/missile; unknown new kinds currently fall through to missiles.
Ballistic shots add shooter velocity and sweep targets/terrain; existing guns have no gravity drop.
Ammo/cooldown/regen and fire/hit/kill/explosion events are authoritative, not cosmetic render hints.
Patched muzzlePosition rotates authored gun/missile points then adds world position; original kinds retain
radius rails. Known source callers: fireBallistic, fireMissile, gunCanReach, gunLeadPoint and Astra tests.
weaponDirection also feeds bots and gun reach/lead; turret arcs and render yaw/pitch must agree.
Built GameSession muzzle flash uses gun/turret anchors, but pilot flash direction uses nose: boat needs
an explicitly scoped aimed-cannon path. Render anchors alone never change authoritative projectile origins.
Current bombs impact immediately through stepBombProjectile/bombImpact; rockets/missiles have reduced
water splash. splash skips owner/friendlies, respects vehicle protection; ship damage is a separate path.
No inspected hull-ram damage mechanic justifies wake-slam. Do not relabel missile/bomb behavior as depth charge.
Bot weights are fighter/apache/warthog/blackbird/bomber = 3/2/2/1.2/.9; f15/f35 zero.
Zero spawn weight does not stop automatic gunner boarding; RoomEngine fills a human's empty second seat.
GameSession sets audio listener and updateVehicles each frame; local held gun audio and event audio are
separate hooks. Built audio fire dispatch defaults unknown IDs to missile sound; new weapons need cases.
EngineVoice uses procedural noise/tones, throttle/speed/Doppler, release/dispose; F/A-18 loudness/ref 1/40.
F15/F35 reuse fighter voice (1/40, .8/35). Boat needs motor/water voice, not burner or helicopter chop.

## Water facts and recovery limits
Built geography `geography-DSfv9zZq.js`: sea level 0; groundHeight includes ship surfaces and clamps
terrain at sea level; isWater rejects ship footprints before testing terrain height <= sea level.
WorldQuery exposes groundHeight/onRunway/isWater/half/ceiling. Built spawnPoint uses catapults or Apache
helipads at deckHeight + 2.2/1.9, with current carrier pose. This is not a valid boat water spawn.
Authored `src/sim/{flight,geography,fleet,types,protocol,loopback}.ts` are absent from the nine-file staging;
patch hunks are not full files. Terrain generation/water-render implementation and dependency closure
remain uninspected. Needed exact import boundaries: `src/render/world-view.ts`, `src/render/effects.ts`,
`src/input.ts`, `src/ui/{game,lobby,spawn}.ts`; resolve `../audio` to its real entry file during recovery
(file versus directory index unknown), plus its imports. Do not invent an ocean module path.
Parent recovery directory `.tmp/wings-speedboat-source` was absent at inspection; parent owns recovery/tools.
Build script patch uses vite build, not typecheck. Package/lock/config/cache closure and a fresh clean-pin
patch application/build are unproven here. No installs or alternative dependency versions authorized.
Before any shared fix, parent must trace ALL recovered callers, including tests, prediction, preview,
HUD/audio and constructed paths. Above caller sets are bounded evidence, not a whole-source completeness claim.

## Speedboat design, approved for bounded implementation
One new kind `speedboat`, movement class `water`, not heli; preserve all original seven behaviors.
Use existing FlightState pose/velocity for deterministic buoyancy: damp vertical error toward sea level
plus model waterline offset, planar forward thrust, lateral drag/drift, yaw response scaled by speed,
limited reverse and coasting drag. No lift, stall, flight banking, boost climb or carrier catapult velocity.
Provisional limits: forward 28m/s, reverse 7m/s, yaw <=.8rad/s; tune only after CPU and normal-input checks.
W/S signed throttle, A/D yaw; arrows may alias yaw but never pitch/lift; release coasts. Both steering
schemes need boat branches. Neutral unpiloted input coasts safely; no forced aircraft autopilot.
Spawn at sea level beside surviving friendly carrier, outside expanded posed hull bounds and other boats;
probe bounded candidates, require water/depth under hull corners, reject land/decks/world edges and fail
with an explicit error if none fit. No modulo fallback onto occupied/deck slots. Do not inherit deck velocity.
Sweep hull footprint along motion against coastline and ships; beach by removing inward velocity/thrust,
retain outward reverse escape, never climb terrain or teleport. Damped cosmetic bob/heel must stay bounded.
Safe return/change-class zone is water near own surviving carrier at low speed, never on its flight deck.
Keep two seats without new crew framework: skipper [deckcannon,depthcharge], passenger [null,null];
disable boat bot spawn and automatic boat gunner filling. Passenger view/seat switch must not trap the player.
Deck cannon: new gun ID, existing finite-speed ballistic sweep, no seeker/homing/lock; not a missile clone.
Provisional 4 shots/s, 350m/s, 35 damage, 120 rounds, no splash; existing straight gun trajectory, no drop claim.
Turret yaw +/-100 degrees, elevation -5 to +35; match authoritative clamp, barrel pivot and muzzle flash.
Timed stern depthcharge: new WeaponKind/ID with explicit dispatch before missile fallback and TTL discard.
Four visible stores [0,1], deterministic launch behind stern, inherited planar velocity, gravity to water,
then submerged drag/sink; fuse 2s, blast radius 18m, provisional damage 180, release <=1/s.
At fuse expiry emit one water splash and radial hostile vehicle/ship damage through existing ownership,
protection/scoring rules; no crater, guidance, immediate water-impact explosion or friendly damage.
Land/deck release is rejected; land-stranded charges expire inert. Age/ttl and weapon ID should suffice
for snapshots if wet state derives from position; prove round-trip equivalence before adding wire fields.
Use existing refill/cooldown fields; propose cannon 30s refill/2s delay, charge 40s/4s. No wake-slam this scope.

## Geometry, acceptance and bounded implementation handoff
Reuse Python-stdlib Model generator, not external meshes. Target 12,000-18,000 triangles, >=40 meaningful
assignments; distinct deep-V hull, chine rails, foredeck cannon, low glazed cabin, stern racks and twin props.
Dark linearized base matching family, warm ochre/copper trim, pale waterline/details, team patches kept
separate from authored trim. No gradients, real insignia or copied jet geometry. Preserve provenance limits.
Identity root, meters, -Z forward/+Y up. Named cannon yaw/pitch, prop_L/R and charge_1..4 carry real meshes.
Derive helm_eye, chase framing, cannon pivot/barrel tip, stern_exit, wake points and waterline from GLB
geometry; simulation composes articulated muzzle transforms, not static jet hardpoints. Add minimal boat
hardpoint/placeholder fields only as needed. Prop rotation follows signed propulsion; bounded pooled wake
follows speed/water contact and clears on death/restart. No afterburners, hidden rotor or idle airborne wake.
Disjoint tasks, each <=10 minutes; split unfinished tasks, do not silently extend or overlap paths:
1. Model lane: generator + speedboat.glb only; then separate checker lane owns check-models.py.
2. Simulation lane: sim types/vehicles/flight/geography/fleet/combat/room-engine/bots; split serially by file.
3. Presentation lane: render aircraft/camera/effects; separate serial UI lane owns input and ui game/lobby/spawn/HUD.
4. Audio lane: engines plus recovered audio entry/SFX owners; no render/sim edits.
5. Verification lane: dedicated boat CPU regression and existing preview/browser fixtures, not runtime files.
6. Parent alone integrates port.patch/generated bundles, build config, manual/inventory and visual approval.
CPU acceptance: deterministic generation, finite normals/indexing/material use, root/pivot/store checks,
geometry-derived camera/muzzle/stern coordinates under rotated poses; spawn water/carrier/land exclusion,
reverse/coast/drift/beaching/no airlift; prediction reconciliation; ammo/cooldowns/fuse/one splash/damage,
friendly/protection tests, snapshot round-trip, input cleanup, restart disposal and original-seven invariance.
Two fresh rendered angles minimum (bow-quarter and stern-quarter), desktop/mobile dark/light parent review;
show real prop/wake/turret and each store depletion. Raw model views do not prove converted/native rendering.
Measure actual total visible scene <120,000 triangles with terrain/fleet/other vehicles/effects, recording
quality/camera/peak during spawn, cruising and both weapons. Frame renderer totals are conservative;
asset sums or an empty preview do not pass. If existing world exceeds budget, report before any shared fix.
After source-built CPU/visual acceptance: fresh unchanged full 125-game gate, THEN normal-input boat spawn,
steer/reverse/beach recovery, each weapon's verified ammo/projectile/fuse/hit state changes, menu/restart.
No browser/fleet/native test ran in this note lane: 0/125 visits, no screenshots, no new class delivered.
Maintenance checker passes 130 documents/125 registered + 5 unregistered; inventory current.
GLB probe corrected for non-indexed primitives. Upstream LICENSE remains missing; Three/font notices do not license Wings.
Logs: `.swarmforge-logs/wings-speedboat-study-complete.log` and `.swarmforge-logs/worker-20261019-061727.log`.
No push. Parent approved the design and recovered 70 pinned source files with blob verification.
Existing-tool esbuild builder `a017419` passes baseline build/CPU checks; see the reroll receipt
at `docs/maintenance/audits/wings-speedboat-reroll.md` for private work, preview files and open gates.
