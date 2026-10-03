# Slipstream Borough driving core (#99)

Current Main extension: [saved finishes/mounted pursuit gadgets and exact verification](slipstream-gadgets.md), commits37228a8/00605e2. Pure15/15 and ordinary native earning/customization/mount/deployment/police slowdown pass; full campaign/hardware/release still separate. Original worker provenance/checkpoint below remains historical.

## Scope and source

Original game logic under the explicit two-original-game exception in `docs/car-arcade-plan.md`; not an ingested-game or upstream-art claim. Parent baseline: `a48a386`. Worker model: `gpt-6-astra`. Owned paths only: `Games/Slipstream Borough/core.js`, `scripts/test_slipstream_core.mjs`, this report. Session log basename: `2026-10-02T12-48-38-890Z_01a0fca8-d7e5-774f-986e-db787d5941a6.jsonl`.

Reads the frozen local `assets/car-arcade/fleet.js` ABI. The local fleet and storage helper were inspected; no rendering/vendor dependency or storage call is used by this core. No downloads, installs, checkout expansion, catalog, manual, inventory, UI, model, existing-game, or vendor edits. The source commit is the commit containing these three paths (reported in the worker handoff).

## Exact exported API

All actions return fresh copied plain data, never mutate arguments, and throw `TypeError`/`RangeError` on invalid input or unavailable transactions. Validators reject unknown keys, non-plain records, accessors, invalid numbers, malformed arrays and identities before consuming their data. Profiles/runs are bounded, not trusted browser security authorities. Structured valid client-side forgery is not cryptographically prevented; there is no secret ledger, signing service, debug setter, or mutable test hook.

- `freshProfile()` -> profile, cash 0, only Bricklet, zero upgrades, level/best 0, nextRun 1, settledRun 0, testMode false.
- `validateProfile(raw)` -> canonical copied profile. Missing upgrade records for owned cars fill with zeros; all profile top-level keys remain required.
- `carStats(profile, id = selected)` -> frozen `{speed,acceleration,handling,toughness}`; car must be owned. Speed in m/s, acceleration in m/s², handling in lateral m/s, toughness is a damage divisor. Effective speed/acceleration increase by 7%/12% of base per engine level; lateral response by 12% per handling level; toughness by 16% per armor level.
- `buyCar(profile, id)` -> copied profile; requires unowned car and sufficient cash, uses fleet price, adds zero upgrades, does not auto-select. Already-owned/invalid IDs reject. Test mode already owns every car, so there is nothing left to purchase.
- `selectCar(profile, id)` -> copied profile with owned car selected.
- `upgradeCost(profile, id, kind)` -> current atomic quote; added by Main atc090df0. Same ownership/kind/maximum-level validation as purchasing; normal `250*(level+1)**2`, test mode0. The controller consumes it before purchase; no duplicate formula.
- `upgradeCar(profile, id, kind)` -> copied profile; `kind` is `engine|handling|armor`. Cost is `250 * (currentLevel + 1) ** 2`, maximum level 5. Test mode upgrades are free, cash stays 1e9.
- `applyCode(profile, text)` -> copied profile; text must be a string of at most 64 characters, compared after trim/lowercase. Wrong text changes nothing. The owner phrase is implemented in source, not displayed by the game. Match persists testMode, all 16 owned IDs and 1e9 cash; upgrades remain at their current levels. Reload validation requires test mode to retain all cars and max cash. No corresponding feature belongs to Garage Borough.
- `startRun(profile, mode)` -> `{profile,run}`; `mode` is `cutup|race`. Returned profile reserves `run.id` from nextRun and increments nextRun. **Save this returned profile before gameplay.** Reload returns to garage without run reconstruction or payout. New starts supersede older outstanding results.
- `GADGETS` -> frozen names/prices/charges/durations/cooldowns for none/smoke/emp.
- `customizeCar(profile,id,{paint,wheels})` -> copied owned-car finish; strict hex colors, free cosmetic changes.
- `fitGadget(profile,id,kind)` -> copied profile; buy smoke150/EMP250 once per owned car and mount it, or switch/remove owned kits free. No default grant; marked test mode spends0.
- `stepRun(run, input, dt)` -> copied run. Input requires `{steer,throttle,brake}` with optional boolean `deploy`, each numeric field finite, steer -1..1 and throttle/brake 0..1; dt finite 0..0.05 seconds. No coercion/clamping of invalid inputs. UI owns any readiness countdown, pause, hidden-tab suspension and fixed-step accumulator. Zero dt or ended run returns an unchanged deep copy. No wall clock, external RNG, DOM or storage.
- `settleRun(profile, run)` -> copied profile. Requires ended current reserved ID (`nextRun - 1`), not previously settled, matching level/car/effective specs. Recomputes/validates rewards and finish order, updates cash/best/settledRun once, increments level on escape or first-place race (cap 12). No frame-based payout; call only from the result transition, then save. Replaying settlement against the updated profile rejects. Old pre-settlement profile snapshots are not a cross-tab transaction; use the shared storage conflict check.

Canonical profile fields exactly: `{version:2,cash,owned,selected,upgrades,level,best,nextRun,settledRun,testMode,customizations}`. Version1 migrates to stock finishes/no mounted kits in memory. Per-owned-car customizations exactly `{paint,wheels,gadget,gadgets}`; strict six-digit hex, selected none/smoke/emp, at most two distinct purchased kits, mounted kit must be owned. `owned` is unique known IDs including bricklet; selected must be owned; upgrades contains only owned IDs and `{engine,handling,armor}` integers 0..5. Cash/best cap 1e9; level 0..12; nextRun 1..1e9 (starting at exhausted cap rejects); settledRun integer 0..nextRun-1; testMode boolean. Reset by obtaining a fresh profile only after UI consent, saving only this game's key `slipstream-borough-v1`.

## Run and renderer fields

All fields below are required. UI should treat runs as read-only, retain the returned object each step and never attach presentation properties.

| Field | Meaning / bounds |
| --- | --- |
| `id` | Reserved immutable integer run identity |
| `mode`, `status` | `cutup|race`; `running|escaped|busted|finished` |
| `carId`, `upgrades`, `stats`, `level` | Start snapshot of selected owned car, three upgrade levels, four effective stats, difficulty 0..12 |
| `distance`, `finishDistance` | Player progress in meters, 0..endpoint; endpoint `1200 + 150*level` |
| `speed`, `x` | m/s up to effective maximum; lateral position -6.2..6.2, road lane centers -5.25/-1.75/1.75/5.25 |
| `hp` | Body integrity 0..100, not raw toughness; higher toughness reduces collision damage |
| `heat` | Cutup only, 0..5; distance, near misses and level increase pursuit |
| `score`, `earnings` | Integer display score; earnings **0 while running**, final bankable amount after end |
| `traffic`, `police`, `rivals` | Copied entity arrays, at most 7/2/3 respectively, never over 12 NPCs total |
| `elapsed` | Active simulation seconds only, 0..240; deadline busts stopped/incomplete runs |
| `place` | Race position 1..4, distance-based while racing, actual crossing-time order on finish; cutup uses 1 |
| `seed` | Private-to-simulation deterministic uint32 LCG state, initialized from run ID |
| `nextEntity` | Monotonic entity identity allocator, 1..10000 (actual runs use far fewer) |
| `spawnClock` | Seconds until next traffic spawn attempt, 0..10 |
| `collisionCooldown` | Remaining global body-damage cooldown, 0..1.2 seconds |
| `nearMisses`, `collisions` | Bounded integer event counts, not frame counts |
| `arrest` | Police low-speed containment timer, 0..3 seconds, decays when clear |
| `finishTime` | Null until reaching endpoint, then interpolated crossing timestamp |
| `appearance`, `gadget` | Start snapshot of paint/wheels and mounted kit; checked at settlement |
| `charges`, `deployments` | Remaining/used kit capacity; sum equals starting pursuit allowance, race0 |
| `gadgetTime`, `gadgetCooldown`, `gadgetHeld` | Bounded active-time timers and boolean rising-edge latch; pause is owned by UI |

Each entity has exactly `{id,carId,x,distance,speed,passed,hit,finishTime}`. IDs are unique within the run, retained across copies; carId is a fleet ID. x/distance/speed use player units; render relative forward z as `-(entity.distance-run.distance)`. Traffic/police finishTime remains null; each rival records its own real endpoint crossing time and distance stops at the endpoint. `passed` consumes the once-only passing opportunity; `hit` prevents a collision from later paying a near-miss bonus. These are simulation data, not renderer handles.

No separate mutable finish object exists: the ended run itself is the result. `escaped` means cutup endpoint, `finished` means race endpoint at any place, `busted` means zero hp, 3 seconds police containment at speed below 5, or 240 active seconds. Display status, place, score, earnings, distance, nearMisses and elapsed from that run. Retry requires `startRun` again, not editing its ID/status.

## Simulation and economy

Traffic starts at least 110 meters plus two seconds of player speed ahead, with further randomized spacing and no same-spawn-distance block within 28 meters. Cars move, passed traffic despawns behind; no unavoidable immediate spawn overlaps. Three rivals accelerate independently and steer away from upcoming traffic. Level-zero targets are 80%/84.5%/89% of the player's effective top speed, increasing with difficulty. They do not win by timer. This is a bounded arcade rival heuristic, not a full tire/AI traffic-physics simulator.

Cutup heat summons one cop at heat 1, two at heat 3. Cops spawn at least 65 meters behind, approach, steer toward the player, collide and contain; they brake ahead instead of disappearing down the road. Higher level increases traffic frequency and pursuit speed/response. Initial cop aligns behind the player's lane to create real contact risk rather than merely a decorative distant chase.

Body contact within 4.3 longitudinal / 1.55 lateral meters deals `24*100/toughness` hp, reduces speed to 56%, and sets a 1.2-second cooldown. Passing a non-hit traffic car behind 4.3 meters, with lateral clearance 1.55..<3.2 and speed advantage over 2 m/s, grants one near miss. Score is `floor(distance*2) + 100*nearMisses`, capped 1e9. On end, earnings are `floor(distance*.32) + 30*nearMisses` plus 180 for escape or race-place prizes 400/220/120/60. Bust retains earned distance/near misses but has no completion bonus. Collision itself pays nothing. Prior ownership/upgrades are retained; there are no repair/fuel charges or softlocks.

## Executed checks and evidence limits

Commands from repository root:

```
node --experimental-default-type=module scripts/test_slipstream_core.mjs
node --experimental-default-type=module --check 'Games/Slipstream Borough/core.js'
node --experimental-default-type=module --check scripts/test_slipstream_core.mjs
python3 -B scripts/check_maintenance_docs.py
```

Current regression: exit 0, `PASS 15 Slipstream core groups; synthetic/controller/cheat evidence only, no native natural-progression claim.` Both syntax commands exit 0. Covers exact exports, default/reload/difficulty, descriptor rejection, malformed/negative inputs, copied deterministic replay/finiteness, purchases/upgrades/reset, collision/armor/cooldown, once-only near miss, police approach/contact/containment, three actual rival finishes, late fourth-place finish, timeout, escape, first place, reservation/replay/forged-reward rejection and separately labeled persistent test-mode all16/free upgrades/max cash.

Actual fixture statistics: `STATS starter race 50.60s place=1 hp=100 cash=874; escape 50.60s hp=100 cash=684`. A simple source-only controller centers the vehicle and accelerates. These are deterministic regression results, **not human/native keyboard/touch, screenshots, naturally earned garage progression, whole-campaign balance, or performance evidence**. Funded purchase fixtures and cheat checks are explicitly synthetic.

The first regression attempt exited 1 on police collision coverage: the original cop lane alignment could contain a stopped player without making contact. Spawn alignment was corrected; rerun passed all 12 groups. No test filtering or contract replacement.

Historical worker checkpoint maintenance command exited 1: `AssertionError: Inventory stale: inspect changes, then run --refresh.` New parallel game/shared paths are not yet inventoried. Main owns inventory/manual updates; this task does not edit them. Browser/full-catalog smoke, screenshots, native controls, natural progression, renderer acceptance, registration, release and push remain held. No games registered and no push performed.

Initial free bytes: 2,337,857,536; pre-report check: 2,336,722,944 (workspace growth 1,134,592 bytes including concurrent workers, below 30 MB and above 2e9 free). Final owned sizes/diff and post-commit storage are reported in the handoff.
