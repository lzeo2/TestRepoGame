# JANKOLOCK 3D systems integration

## Identity and status

Original, renderer-independent gameplay simulation. `systems.mjs` imports nothing,
including the rejected 2D engine. No DOM, renderer, geometry, networking, storage,
randomness or third-party runtime dependencies. This is a bounded systems module,
not a complete game or native-input acceptance report. No catalog changes.

## Implementation map

```js
import { createWorldData } from './world-data.mjs';
import { createSystems, ITEMS } from './systems.mjs';
const sim = createSystems(createWorldData()); // or createSystems() without world
const player = sim.addHero({ id: 'player', team: 'carbon', lane: 'midway' });
sim.step(1 / 60); // seconds, never a timestamp
```

World input is copied, never mutated. Exactly three distinct `{id,x,color?,waypoints?}`
lanes are required. Waypoints are at least two finite `{x,y,z}` points, ordered
along carbon-to-ivory travel (z endpoints also determine orientation). Missing
waypoints use lane x, z=-390/0/+390. Missing world or missing `spawns` uses the
procedural three-lane chain; a supplied incomplete/invalid spawn list throws.
Each lane/team needs one guardian, one walker, two base guardians, two shrines,
and one patron spawn, with unique IDs and finite positions. Other world fields
are ignored. Only carbon and ivory teams are supported, with carbon at negative z.

**Shared Patron:** select the `midway` lane's Patron per team, otherwise the lane
nearest x=0. Ignore the other four Patron spawns for simulation. Their rendering
and geometry belong to the world/integrator owner. There are 38 simulated
objectives: 18 lane objectives plus one shared Patron per team.

## Public API

- `ITEMS`: frozen array of frozen `{id,name,tier,cost,description,active?}` records.
- `createSystems(world?)`: fresh simulation; malformed world throws `TypeError`.
- `addHero({id,team,lane?,position?,souls?,earnedSouls?})`: returns the live hero.
  Lane defaults to midway/central; position defaults to own base. IDs must be
  unique nonempty strings, at most 120 characters. Invalid options throw
  `TypeError`. Soul seeds are optional **fixture/import state**, not rewards:
  `0 <= souls <= earnedSouls <= 1e9`, earned defaults to souls. No item seeds.
- `step(dt)`: `{ok,steps,time}` or `{ok:false,reason}`. Reject nonnumeric,
  nonfinite, negative or >3600-second calls, without advancing. Maximum one hour
  per call bounds accidental timestamp work. Accumulate fractional time into
  deterministic 0.05s substeps; no wall time is dropped. Visible time is completed
  ticks only. Calls can be chunked differently with identical results. After a
  victory time still advances, but gameplay is frozen.
- `damage(targetId,amount,sourceId,{kind='projectile'}?)`: structured result
  `{ok,amount,killed}` or failure. Positive finite raw damage <=1e9; kind is
  projectile/melee/ability. Requires live enemy entities, active match, finite
  positions and range (hero 32m, melee 4m, trooper 20m, structure 28m). Always
  checks objective vulnerability. There is **no bypass flag**. Hero damage is
  multiplied by level/items then target armor; projectile calls consume ammo
  and obey fire interval/reload. Ability/melee cooldowns belong to the kit/input
  caller, except this module's heavy item. Never pass `stats().damage` as raw
  damage, which would apply its multiplier twice. A basic shot uses raw 24.
- `shootOrb(heroId,orbId)`: structured result. Live hero, floating live orb,
  active match, within 60m, consumes one round; reload applies. Orb shots do not
  share the weapon's projectile fire-interval timer. Either team can shoot once.
- `buyItem(heroId,itemId)`: `{ok,reason?}`; validates ownership, slots, shop and
  funds before changing state. Duplicate items cannot stack. Dead purchases
  change max HP but keep HP=0 until respawn.
- `activateItem(heroId,itemId,options?)`: `{ok,reason?}`; owned active item,
  living hero and active match required. Two arguments work: dash defaults
  toward enemy z; heavy chooses nearest enemy in 4m with normal target priority.
  Optional dash `direction:{x,z}` is normalized; optional heavy `targetId`
  selects a target. Invalid inputs and failed heavy acquisition cost nothing.
- `setRetreat(heroId,held)`: structured result, strict boolean input.
- `shopAvailable(heroId)`: boolean; dead or within 20m of own base, not finished.
- `stats(heroId)`: derived stats or null. Includes maxHp, damage,
  damageMultiplier, moveSpeed, maxAmmo, fireInterval, range, armor, armorPierce,
  lifesteal, projectileSlow, burstMultiplier, maxDashCharges and tier label.
- `moveHero(heroId,position)`: structured result; live hero, finite x/y/z within
  +/-1e6. Replaces position and cancels recall for movement >0.1m. This is an
  adapter boundary, **not collision or speed enforcement**. Caller owns ordinary
  movement, uses stats().moveSpeed, and resolves all movement/dash geometry.
- `drainEvents()`: returns queued events and empties the same public event array.

State: `time` seconds; `phase` pregame/laning/midgame/finished; `winner`
null/carbon/ivory; `heroes`, `troopers`, `orbs`, `structures`, `events`, `lanes`,
`bases`, `retreatRings`. Entities have unique IDs, team, position; combatants
have hp/maxHp/alive. Heroes expose souls (spendable), earnedSouls (cumulative),
level, items (IDs), flexSlots, alive, respawnRemaining, ammo, status deadlines,
cooldowns and recall. Troopers expose targetId, waypoint, distanceMarched,
candleScale and emissiveScale; the latter two scale with HP, floored at 0.15.
Structures expose type/lane/vulnerable/patronPhase. Orbs expose type, souls,
team (killer team), eligibleIds, born, expiresAt and claimed.

Read arrays afresh after stepping: dead troopers and claimed/expired orbs are
pruned. Returned entities are live integration state, not a server/anti-cheat
boundary. Integrators may set position through moveHero; do not edit HP,
vulnerability, items, earned totals, phase or winner to implement gameplay.

## Gameplay and controls

- Pregame lasts 30s. Wave 1 occurs exactly at t=30, then 55,80,... Every wave
  spawns four troopers per team per lane (24). Each has 180 HP, speed 8m/s,
  raw 12 damage, 1s attack interval. Follow the copied waypoint polyline, then
  approach the shared Patron when unlocked. No automatic hero bots are included.
- Automatic targeting chooses nearest enemy **trooper > hero > unlocked
  structure**, within range. A nearer lower-priority target never wins.
  Guardians, walkers, base guards and Patrons return fire; shrines do not.
  Locked structures can defend but cannot take damage. Cloaked heroes are
  excluded from automatic targeting, not invulnerable to explicit damage.
- Trooper deaths drop 80 total base souls, or 120 after **600 active seconds**
  (t=630). Half floats for 6s: shooter receives it, secure or deny. Half is a
  ground orb lasting 18s. Snapshot living killer-team heroes within **5m at
  death** as original ground eligibility. Nearest eligible living hero still
  within 5m attracts it at 10m/s; contact within 0.4m plus this tick's travel
  claims the whole half. Not shared among heroes; no late arrivals, enemy
  pickup or automatic floating timeout reward. Expired orbs pay nothing.
- For each reward, compute team earned totals including dead heroes. If behind,
  multiplier is `1 + min(.26, .26*(enemyEarned-ownEarned)/max(1,enemyEarned))`.
  Never boost the leading/tied team. Spending cannot affect this comparison.
- Level is `min(20,1+floor(earnedSouls/400))`, never reduced by purchases. Each
  level adds 35 HP and 5% base damage. Tier labels: clerk L1-5, associate L6-10,
  supervisor L11-15, director L16-20. Base hero: 500 HP, raw shot24, speed8,
  magazine12, 0.3s shots, 1.5s automatic reload, armor10%. Hero kill pays killer100
  base souls (with comeback); objective kills do not pay souls.
- Shop tier prices: 800/1600/3200/6400. IDs/effects are in ITEMS. Lifesteal heals
  20% of actual damage; slow rounds reduce victim movement 30% for2s. Armor
  pierce ignores80% of armor (structures normally25%). Glass multiplies damage
  1.6 and max HP .75. Burst triples a projectile impact for3s and fire interval
  becomes0.1s (one round/impact), 15s cooldown. Heavy charges0.6s, then normal
  melee damage120 if target remains alive/in4m/unlocked; 12s cooldown starts on
  activation, even if release misses. `heavy_release` reports the result.
  Cloak lasts5s, cooldown20s, breaks on attacking or taking damage. Dash grants
  two charges, moves10m immediately, recharges one every5s. No collision here.
- Six standard slots. Every enemy Walker killed grants that entire killer team
  one flex slot, capped3; future heroes inherit it. Maximum9 distinct items.
- Death: `5 + 2*floor(activeSeconds/60)` seconds. Respawn at own central base,
  full HP/ammo. Within20m of base, heal10% max HP per second while alive.
- UI owns B/shop display. Hold X by calling setRetreat(true). At own lane ring
  (guardian z plus45m toward own base, radius6) a safe3s stationary channel
  teleports to own base. Movement >0.1m, attack, damage, release or death cancels.
  Movement/damage/attack block automatic restart while held: release then press
  again to rearm. No channel from enemy rings or arbitrary lane positions.

## Objective chain and director

Each defending lane independently unlocks guardian -> walker -> both base
guardians -> both shrines. Both base guardians must die before either shrine
can take damage. All six defending shrines, across all three lanes, must die
before the **single shared defending Patron** becomes vulnerable. The first
valid hit on Patron P1 triggers P2, never an immediate victory: retreat20m
further toward its base, max HP6000 ->3000 and restore to3000. A second distinct
attack (or later attacks) must kill P2. No overflow carries between phases.
Destroy either team's P2 and the opposing team wins. `damage()` enforces every
lock, including arbitrary raw scripted attacks.

At t=30 phase becomes laning; at t=630 it becomes midgame and troop bounties
increase. Victory overrides all director phases. Important events are `wave`,
`phase`, `damage`, `orb_drop`, `orb_shot`, `orb_pickup`, `souls`, `purchase`,
`item_active`, `heavy_release`, `hero_death`, `respawn`, `recall_start`,
`recall_cancel`, `recall_complete`, `flex_slot`, `objective_fall`, `patron_phase`,
`victory`. Events carry deterministic tick time and entity/team fields.

## State and persistence

All state is memory-only. Create a new simulation to reset. No saves, remote
loads, background timers or asynchronous work. Step only from the integrator's
single game loop; drain events for presentation rather than retaining them.
Linear target scans fit this bounded three-lane mode, not a large crowd engine.

## Dependencies and provenance

Node regression uses only node:assert, node:fs, node:path and node:url. Runtime
uses only JavaScript built-ins. Mechanics reference supplied in the shared
operator spec: https://deadlock.wiki/Mechanics (research URL only, never loaded
at runtime). No reference-game engine, art, text or assets are imported.

## Audit findings and verification

```sh
node --check Games/Jankolock3D/systems.mjs
node --check Games/Jankolock3D/systems-test.mjs
node Games/Jankolock3D/systems-test.mjs
python3 -B scripts/check_maintenance_docs.py
```

Regression covers clocks/chunks, waypoint copying, priorities, candle state,
orbs/expiry/eligibility, XP/comeback, shop/stat/active effects, respawn/recall,
t=630 transition, locked chains and both victory directions. It also runs a
600-wall-second match, with actual marching/fighting waves and normal damage API.
The fixture explicitly logs every scripted hero shot, reposition policy and
absence of buffs. No objective HP assignment, forced win or lock bypass.
The timeline records 19 objective falls, Patron P2 transition at570 and victory
at590; clock continues to600. Troopers contribute240 objective hits/2160 damage.
This proves the scripted systems path, **not native input or hardware acceptance**.

Every run overwrites only the relative evidence location
`docs/maintenance/audits/jankolock-3d-qa/systems-timeline.json`, resolved from the
module rather than current working directory. Disk space is checked before
mkdir/write, stopping below2,178,940,928 available bytes. No screenshots are
created because this task owns no renderer/UI. The maintenance checker was run:
`AssertionError: Inventory stale: inspect changes, then run --refresh.` The
orchestrator must reconcile the global maintenance inventory/manual after
concurrent 3D commits; those paths are outside this worker's four-file authorization.

## Safe iteration and future outlook

Keep economy/locks centralized here. Regression must remain runnable with no
world module present. Geometry, collision, kit cooldowns, rendering, visual
review, full-fleet browser smoke, registration, publication and native hardware
verification remain integrator/reviewer gates. No push is authorized here.
