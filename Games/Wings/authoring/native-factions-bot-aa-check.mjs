// Actual native bot functions and RoomEngine. Deterministic CPU poses, not native gameplay acceptance.
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
const loader = installRetainedHostLoader();
try {
  const { botInput, createBotBrain, selectTarget, applyAimSafety, hostileFleetDistance } =
    await import(new URL('src/sim/bots.ts', retainedRoot));
  const { setFleetState, carrierOf, inSafeZone } = await import(new URL('src/sim/geography.ts', retainedRoot));
  const { createWeapons } = await import(new URL('src/sim/combat.ts', retainedRoot));
  const { VEHICLES } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const flat = { groundHeight: () => 0, onRunway: () => false, half: 20000, ceiling: 4000 };
  const make = (id, team, position, kind = 'f15') => ({ id, kind, team, alive: true, spawnedAt: -100,
    flight: { kind, position: [...position], velocity: [0, 0, -150], orientation: [0, 0, 0, 1],
      angularVelocity: [0, 0, 0], throttle: .8, onGround: false, gearDown: false, crashed: null, tick: 0 },
    hp: VEHICLES[kind].maxHp, maxHp: VEHICLES[kind].maxHp, seats: ['pilot', 'officer'], aim: [null, null],
    weapons: createWeapons(kind), flareCount: 12, flaresReadyAt: 0, abilityReadyAt: 0,
    spottedUntil: 100, lastDamagedBy: null });
  const brainFor = v => {
    const b = createBotBrain(3, 1);
    Object.assign(b.state, { vehicleId: v.id, phase: 'transit', role: 'fighter' });
    return b;
  };
  const input = (b, v, enemy, seat, disabled) => botInput(b,
    { id: seat === 0 ? 'pilot' : 'officer', team: v.team, seat, vehicleId: v.id },
    v, [v, enemy], 10, [], flat, undefined, [], disabled);

  setFleetState(0, 2);
  const hostile = carrierOf(1).position, own = carrierOf(0).position;
  const pos = [hostile[0], 1500, hostile[2] + 800];
  assert(hostileFleetDistance(0, pos[0], pos[2]) < 1000);
  assert.equal(hostileFleetDistance(0, pos[0], pos[2], true), Infinity);
  const ordinary = [0, 0, -1], factions = [...ordinary], neutral = [...ordinary];
  applyAimSafety(ordinary, pos, [0, 0, -150], flat, 150, 7, 0, false);
  applyAimSafety(factions, pos, [0, 0, -150], flat, 150, 7, 0, false, true);
  applyAimSafety(neutral, pos, [0, 0, -150], flat, 150, 7, null, false);
  assert(ordinary[2] > 0, 'ordinary steers away from armed carrier');
  assert.deepEqual(factions, neutral, 'host context removes only AA steering');
  assert(factions[2] < 0);
  const me = make('self', 0, pos), enemy = make('enemy', 1, [hostile[0], 1500, hostile[2]], 'fighter');
  assert(inSafeZone(1, enemy.flight.position));
  assert.equal(selectTarget(me, [me, enemy], 10, 9000, null), null);
  assert.equal(selectTarget(me, [me, enemy], 10, 9000, null, true), enemy);
  const pilotBrain = brainFor(me);
  input(pilotBrain, me, enemy, 0, true);
  assert.equal(pilotBrain.state.targetId, enemy.id);
  assert.equal(pilotBrain.state.phase, 'engage');
  input(pilotBrain, me, enemy, 0, false);
  assert.equal(pilotBrain.state.targetId, null, 'cached target must be invalidated when AA returns');
  const officerBrain = brainFor(me);
  input(officerBrain, me, enemy, 1, true);
  assert.equal(officerBrain.state.targetId, enemy.id);
  input(officerBrain, me, enemy, 1, false);
  assert.equal(officerBrain.state.targetId, null);
  enemy.spawnedAt = 10;
  assert.equal(selectTarget(me, [me, enemy], 10, 9000, null, true), null, 'spawn protection remains');
  enemy.spawnedAt = -100; enemy.alive = false;
  assert.equal(selectTarget(me, [me, enemy], 10, 9000, null, true), null, 'dead targets remain excluded');
  enemy.alive = true;
  console.log('PASS same carrier poses: ordinary AA avoidance/target exclusion; host pilot+gunner engage; context false invalidates cached targets');

  // Own umbrella must not suppress either crew seat when native AA is absent.
  const defender = make('defender', 0, [own[0], 1500, own[2] + 400]);
  const raider = make('raider', 1, [own[0], 1500, own[2] - 400], 'fighter');
  assert(inSafeZone(0, defender.flight.position));
  assert.equal(input(brainFor(defender), defender, raider, 0, false).seat.firePrimary, false);
  assert.equal(input(brainFor(defender), defender, raider, 0, true).seat.firePrimary, true);
  const locked = defender.weapons[1][0]; locked.lock = 1; locked.lockTarget = raider.id;
  assert.equal(input(brainFor(defender), defender, raider, 1, false).seat.firePrimary, false);
  assert.equal(input(brainFor(defender), defender, raider, 1, true).seat.firePrimary, true);
  const hullAim = [0, 0, -1];
  applyAimSafety(hullAim, [hostile[0], 5, hostile[2] + 200], [0, 0, -100],
    { ...flat, groundHeight: () => -1000 }, 0, 7, 0, false, true);
  assert(hullAim[1] > .1, 'passive carrier hull still requires climb');
  const terrainAim = [0, 0, -1];
  applyAimSafety(terrainAim, [0, 300, 0], [0, 0, -100],
    { ...flat, groundHeight: () => 500 }, 150, 7, 0, false, true);
  assert(terrainAim[1] > 0, 'terrain clearance remains active');
  assert.equal(hostileFleetDistance(0, pos[0], pos[2]), hostileFleetDistance(0, pos[0], pos[2], false));
  console.log('PASS own-safe pilot cannon/officer lock gating follows context; carrier hull and terrain clearance remain active');

  // Shadow only the trusted collision hook, not botInput, combat, flight or target selection.
  // An actual ordinary room with no hostBridge proves the input follows CombatState.hostFleet itself.
  const room = createLoopbackRoom({ teams: 2, bots: 2, botSkill: 1 }, 'AA context CPU',
    { onMessage() {} }, { manual: true, code: 'native-factions-aa' });
  try {
    for (let i = 0; i < 180; i++) room.step(1 / 60);
    assert.equal(room.engine.botCount(), 4);
    const pilots = [...room.engine.players.values()].filter(p => p.info.bot && p.info.seat === 0);
    assert.equal(pilots.filter(p => p.info.team === 0).length, 2);
    assert.equal(pilots.filter(p => p.info.team === 1).length, 2);
    const p = pilots.find(p => p.info.team === 0), q = pilots.find(p => p.info.team === 1);
    const self = room.engine.vehicles.find(v => v.id === p.info.vehicleId);
    const target = room.engine.vehicles.find(v => v.id === q.info.vehicleId);
    assert(self && target);
    const run = disabled => {
      for (const v of room.engine.vehicles) v.alive = false;
      const c = carrierOf(1).position;
      Object.assign(self, make(self.id, 0, [c[0], 1500, c[2] + 800], self.kind));
      Object.assign(target, make(target.id, 1, [c[0], 1500, c[2]], 'fighter'));
      self.seats = [p.info.id, null]; target.seats = [q.info.id, null];
      p.brain = brainFor(self); q.brain = brainFor(target);
      if (disabled) room.engine.combat.hostFleet = { resolveProjectile() { return false; } };
      else delete room.engine.combat.hostFleet;
      room.step(1 / 60);
      return p.brain.state.targetId;
    };
    assert.equal(run(false), null);
    assert.equal(run(true), target.id, 'actual room passes its combat flag to native botInput');
    assert.equal(run(false), null, 'clearing hostFleet restores ordinary behavior in same room');
    room.engine.resetMatch();
    assert.equal(room.engine.combat.hostFleet, undefined, 'ordinary reset has fresh combat context');
    assert.equal(run(false), null);
  } finally { room.close(); }
  const fresh = createLoopbackRoom({ teams: 2, bots: 0 }, 'Fresh ordinary', { onMessage() {} }, { manual: true });
  try {
    fresh.step(1 / 60);
    assert.equal(fresh.engine.combat.hostFleet, undefined);
    assert.equal(selectTarget(me, [me, enemy], 10, 9000, null), null, 'leave and new room do not leak disabled AA');
  } finally { fresh.close(); }
  console.log('PASS actual RoomEngine: four bots/two per team; combat hook toggles target eligibility; clear/reset/leave/fresh ordinary context do not leak');
} finally { loader.dispose(); }
console.log('native-factions-bot-aa-check: 3 CPU groups PASS; native/runtime verdict unverified');
