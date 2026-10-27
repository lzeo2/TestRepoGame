// Actual source, seeded native AI and serialized room snapshots. CPU only, no browser-state overrides.
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';

const loader = installRetainedHostLoader();
try {
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const { chooseBotVehicle, createBotBrain, botRandom, botInput } = await import(new URL('src/sim/bots.ts', retainedRoot));
  const { VEHICLES, VEHICLE_KINDS, WEAPONS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { DEFAULT_ROOM_CONFIG } = await import(new URL('src/sim/protocol.ts', retainedRoot));
  const { createWeapons, createCombatState, applySeatInput } = await import(new URL('src/sim/combat.ts', retainedRoot));
  const { setFleetState } = await import(new URL('src/sim/geography.ts', retainedRoot));
  const pilot = { id: 'selection', team: 0 };
  const select = () => {
    const brain = createBotBrain(232, .5);
    return Array.from({ length: 1000 }, () => chooseBotVehicle(pilot, [], [], () => botRandom(brain)));
  };
  const selection = select();
  assert.deepEqual(selection, select(), 'selection uses a repeatable per-brain RNG');
  assert.deepEqual([...new Set(selection)].sort(), [...VEHICLE_KINDS].sort(), 'every registered native kind has positive bot weight');
  for (const kind of ['f15', 'f35']) {
    assert.equal(VEHICLES[kind].flight, 'jet');
    assert.equal(WEAPONS[VEHICLES[kind].seatWeapons[0][0]].kind, 'gun');
    assert.equal(WEAPONS[VEHICLES[kind].seatWeapons[0][1]].kind, 'missile_lock');
    assert.equal(WEAPONS[VEHICLES[kind].seatWeapons[1][0]].kind, 'missile_lock');
  }
  console.log('PASS seeded weighted selection includes all seven registered native kinds and supported jet weapon fits');

  // Same controlled open-air fire fixture as the retained bot tests, not a natural encounter claim.
  setFleetState(0, 0);
  for (const kind of ['f15', 'f35']) {
    const make = (kind, team, z) => ({ id: `fixture-${team}`, kind, team, alive: true,
      flight: { kind, position: [0, 2000, z], velocity: [0, 0, -150], orientation: [0, 0, 0, 1],
        angularVelocity: [0, 0, 0], throttle: .8, onGround: false, gearDown: false, crashed: null, tick: 0 },
      hp: VEHICLES[kind].maxHp, maxHp: VEHICLES[kind].maxHp, seats: ['bot', null], aim: [null, null],
      weapons: createWeapons(kind), flareCount: 12, flaresReadyAt: 0, abilityReadyAt: 0, spottedUntil: 100, lastDamagedBy: null });
    const me = make(kind, 0, 0), enemy = make('fighter', 1, -800), vehicles = [me, enemy];
    const bot = { ...pilot, id: 'bot', seat: 0, vehicleId: me.id };
    const brain = createBotBrain(3, 1), flat = { groundHeight: () => 0, onRunway: () => true, half: 8000, ceiling: 4000 };
    const out = botInput(brain, bot, me, vehicles, 10, [], flat);
    assert.equal(out.seat.firePrimary, true, `${kind} native bot fires aligned cannon`);
    const combat = createCombatState(), events = [], ammo = me.weapons[0][0].ammo;
    applySeatInput(combat, me, 0, out.seat, vehicles, 10, events);
    assert.equal(me.weapons[0][0].ammo, ammo - 1);
    assert(combat.projectiles.some(p => p.weapon === 'cannon20' && p.vehicle === me.id && p.owner === 'bot'));
    me.weapons[0][1].lockTarget = enemy.id; me.weapons[0][1].lock = .5;
    assert.equal(botInput(brain, bot, me, vehicles, 10.1, [], flat).seat.fireSecondary, false);
    me.weapons[0][1].lock = 1;
    assert.equal(botInput(brain, bot, me, vehicles, 10.2, [], flat).seat.fireSecondary, true);
    const officer = { ...bot, seat: 1 };
    me.seats[1] = bot.id;
    me.weapons[1][0].lockTarget = enemy.id; me.weapons[1][0].lock = .5;
    const officerBrain = createBotBrain(3, 1);
    assert.equal(botInput(officerBrain, officer, me, vehicles, 20, [], flat).seat.firePrimary, false);
    me.weapons[1][0].lock = 1;
    assert.equal(botInput(officerBrain, officer, me, vehicles, 20.1, [], flat).seat.firePrimary, true);
  }
  console.log('PASS both jets: native bot cannon spends ammo and creates owned rounds; pilot/officer missiles wait for full lock (CPU fixture)');

  const observed = new Set();
  for (let seed = 0; seed < 24; seed++) {
    const messages = [];
    const room = createLoopbackRoom({ teams: 2, bots: 2, maxPerTeam: 4 }, 'Roster CPU',
      { onMessage: message => messages.push(message) }, { manual: true, code: `native-ai-${seed}` });
    try {
      room.send({ type: 'spawn', kind: 'fighter' });
      for (let tick = 0; tick < 180; tick++) room.step(1 / 60);
      await Promise.resolve();
      const snap = room.engine.snapshotFor(room.playerId);
      assert.equal(snap.players.filter(p => p.bot && p.team === 0).length, 2);
      assert.equal(snap.players.filter(p => p.bot && p.team === 1).length, 2);
      assert.equal(snap.players.filter(p => !p.bot).length, 1);
      assert(messages.some(m => m.type === 'snapshot' && m.players.some(p => p.bot && p.team === 1)));
      const human = snap.players.find(p => p.id === room.playerId);
      assert(snap.vehicles.some(v => v.id === human.vehicleId && v.seats[0] === room.playerId));
      for (const team of [0, 1]) {
        const planes = room.engine.vehicles.filter(v => v.team === team && v.alive);
        assert.equal(planes.length, team === 0 ? 3 : 2);
        assert(planes.length <= 4);
        for (const plane of planes) {
          assert(plane.flight.position.every(Number.isFinite));
          const bot = room.engine.players.get(plane.seats[0]);
          if (bot.info.bot) {
            observed.add(plane.kind);
            assert.equal(bot.brain.state.vehicleId, plane.id, 'real native botInput ran');
            assert(bot.flight.aim.every(Number.isFinite));
          }
        }
      }
      // Stealth enemies legitimately disappear from the opposing snapshot; all allies remain serialized.
      for (const plane of room.engine.vehicles.filter(v => v.team === 0 && v.alive)) {
        assert(snap.vehicles.some(v => v.id === plane.id));
      }
    } finally { room.close(); }
  }
  assert(observed.has('f15') && observed.has('f35'), 'seeded real rooms must spawn and fly both registered jets');
  console.log('PASS 24 real RoomEngine rooms: two AI per team, human seat, bounded 3/2 aircraft, native brain/flight and serialized allied/enemy players');

  const solo = createLoopbackRoom({ bots: 0 }, 'Solo CPU', { onMessage() {} }, { manual: true });
  try { for (let i = 0; i < 180; i++) solo.step(1 / 60); assert.equal(solo.engine.botCount(), 0); assert.equal(solo.engine.vehicles.length, 0); }
  finally { solo.close(); }
  assert.equal(DEFAULT_ROOM_CONFIG.maxPerTeam, 10, 'native default is player capacity, not a four-aircraft bridge cap');
  const config = createLocalFleetConfig();
  const bridge = createRetainedHostBridge({ mode: 'factions', config,
    rosters: config.aircraft.map(roster => roster.map(a => a.id)) });
  let factions;
  try {
    factions = createLoopbackRoom({ teams: 2, bots: 2, maxPerTeam: 4 }, 'Native Factions CPU',
      { onMessage() {} }, { manual: true, hostBridge: bridge });
    for (let i = 0; i < 180; i++) factions.step(1 / 60);
    assert.equal(factions.engine.botCount(), 4);
    assert(factions.engine.vehicles.some(v => v.team === 0));
    assert(factions.engine.vehicles.some(v => v.team === 1));
  } finally { factions?.close(); bridge.dispose(); }
  console.log('PASS explicit Solo has no AI; bounded Factions native allies/enemies use the actual bridge');
} finally { loader.dispose(); }
