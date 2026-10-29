// Actual retained RoomEngine/loopback/bridge. Synthetic kind partitions are NOT national rosters.
// CPU authority evidence only; no aircraft poses, HP, controls or RNG grants for positive spawning.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
const loader = installRetainedHostLoader();
let groups = 0;
function pass(label) { groups++; console.log(`PASS ${label}`); }
const dt = 1 / 60;
const state = engine => JSON.stringify(engine, (key, value) => {
  if (key === 'hooks' || typeof value === 'function') return undefined;
  if (value instanceof Map) return [...value];
  if (value instanceof Set) return [...value];
  return value;
});
try {
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const { RoomEngine, sanitizeConfig } = await import(new URL('src/sim/room-engine.ts', retainedRoot));
  const { chooseBotVehicle, createBotBrain, botRandom } = await import(new URL('src/sim/bots.ts', retainedRoot));
  const { VEHICLE_KINDS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { DEFAULT_ROOM_CONFIG } = await import(new URL('src/sim/protocol.ts', retainedRoot));
  const rosters = [['f35', 'warthog'], ['fighter', 'apache']];
  const makeBridge = (lists = rosters) => createRetainedHostBridge({ mode: 'factions',
    config: createLocalFleetConfig(), rosters: lists });
  const setup = (code, lists = rosters, bots = 2) => {
    const bridge = makeBridge(lists);
    const room = createLoopbackRoom({ teams: 2, bots, maxPerTeam: 4, timeLimit: 600 }, 'Roster CPU',
      { onMessage() {} }, { manual: true, code, hostBridge: bridge });
    return { room, bridge, engine: room.engine };
  };

  // Compare executable pre-change code, not a second handwritten chooser or inferred RNG parity.
  const baselinePin = 'f4ccb5b98b6d832aad4d3d1b52b2569d562f87c3';
  function baselineModule(file, overrides = {}, pin = baselinePin) {
    let source = execFileSync('git', ['show', `${pin}:Games/Wings/source/games/wings/${file}`], { encoding: 'utf8' });
    source = source.replace(/from "(\.\/[^"]+)"/g, (_, specifier) =>
      `from ${JSON.stringify(overrides[specifier] ?? new URL(`${specifier}.ts`, new URL(file, retainedRoot)).href)}`);
    return `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source, { mode: 'transform' })).toString('base64')}`;
  }
  // Preserve all historical populations, then test ordinary twenty-seven against
  // its registration checkpoint. Unequal weighted pools are not RNG parity.
  const currentPin = 'ee8c6c59';
  assert.equal(VEHICLE_KINDS.length, 27);
  assert.deepEqual(VEHICLE_KINDS.slice(25), ['ah64d', 'mi28n']);
  const currentBotsURL = baselineModule('src/sim/bots.ts', {}, currentPin);
  const { RoomEngine: OldRoomEngine } = await import(baselineModule('src/sim/room-engine.ts', { './bots': currentBotsURL }, currentPin));
  for (const [pin, kinds] of [[baselinePin, VEHICLE_KINDS.slice(0, 7)], ['5dac8f90', VEHICLE_KINDS.slice(0, 9)], ['af7bbedb', VEHICLE_KINDS.slice(0, 11)], ['7d9b0eff', VEHICLE_KINDS.slice(0, 13)], ['e6a17c51', VEHICLE_KINDS.slice(0, 15)], ['a62749e6', VEHICLE_KINDS.slice(0, 17)], ['41609030', VEHICLE_KINDS.slice(0, 19)], ['424e8fb4', VEHICLE_KINDS.slice(0, 20)], ['c61d2c8f', VEHICLE_KINDS.slice(0, 21)], ['4cac4413', VEHICLE_KINDS.slice(0, 22)], ['f6ba2421', VEHICLE_KINDS.slice(0, 23)], ['fcd7abc6', VEHICLE_KINDS.slice(0, 24)], ['3fda22c0', VEHICLE_KINDS.slice(0, 25)], [currentPin, VEHICLE_KINDS]]) {
    const prior = await import(baselineModule('src/sim/bots.ts', {}, pin));
    for (const crowded of [[], kinds.map((kind, i) => ({ id: `v${i}`, kind, team: 0, alive: true }))]) {
      const a = createBotBrain(232, .5), b = createBotBrain(232, .5), c = createBotBrain(232, .5);
      for (let i = 0; i < 1000; i++) {
        const expected = prior.chooseBotVehicle({ team: 0 }, [], crowded, () => botRandom(a));
        assert.equal(chooseBotVehicle({ team: 0 }, [], crowded, () => botRandom(b), kinds), expected);
        assert.equal(a.state.rng, b.state.rng);
        if (pin === currentPin) {
          assert.equal(chooseBotVehicle({ team: 0 }, [], crowded, () => botRandom(c)), expected);
          assert.equal(a.state.rng, c.state.rng);
        }
      }
    }
  }
  for (const code of ['ordinary-roster-1', 'ordinary-roster-2']) {
    const config = sanitizeConfig({ ...DEFAULT_ROOM_CONFIG, teams: 2, bots: 2 });
    const current = new RoomEngine(code, config, { send() {} });
    const old = new OldRoomEngine(code, config, { send() {} });
    const id = current.addPlayer('Ordinary'), oldId = old.addPlayer('Ordinary');
    assert.equal(id, oldId);
    current.handle(id, { type: 'spawn', kind: 'fighter' }); old.handle(id, { type: 'spawn', kind: 'fighter' });
    for (let i = 0; i < 300; i++) { current.advance(dt); old.advance(dt); }
    assert.equal(state(current), state(old), 'ordinary full engine output including IDs/brains/seats/meta unchanged');
    assert.equal(current.rng(), old.rng(), 'ordinary room RNG consumption unchanged');
  }
  pass('executable parity: 2000 seven + 2000 nine + 2000 eleven + 2000 thirteen + 2000 fifteen + 2000 seventeen + 2000 nineteen + 2000 twenty + 2000 twenty-one + 2000 twenty-two + 2000 twenty-three + 2000 twenty-four subset choices and RNG, 2000 twenty-five subset choices and RNG, 2000 ordinary/all-twenty-seven choices and RNG; two actual ordinary room outputs');

  for (const list of [...rosters, ['f35'], ['apache'], ['bomber'], ['f15'], ['blackbird'], ['ah64d'], ['mi28n'], ['future-kind', 'warthog']]) {
    for (const value of [0, .1, .5, .999999, 1, NaN]) {
      const selected = chooseBotVehicle({ team: 0 }, [], [], () => value, list);
      assert(list.includes(selected) && VEHICLE_KINDS.includes(selected));
    }
  }
  let calls = 0;
  for (const list of [[], ['future-kind'], ['MiG-29']])
    assert.equal(chooseBotVehicle({ team: 0 }, [], [], () => { calls++; return 0; }, list), undefined);
  assert.equal(calls, 0, 'no fighter fallback or RNG consumption for unsupported/empty partitions');
  for (const lists of [[[], ['fighter']], [['f35'], []], [['future-kind'], ['fighter']], [['f35', 'f35'], ['fighter']]])
    assert.throws(() => makeBridge(lists), /rosters required/);
  pass('all weighted/fallback boundaries filter registered kinds; empty/unknown/duplicate bridge configurations fail closed');

  const unbound = makeBridge();
  assert.throws(() => unbound.aircraftRoster({}, 0), /Bound room/);
  assert.equal(unbound.stats().bindings, 0); unbound.dispose();
  const original = rosters.map(r => [...r]);
  const { room, bridge, engine } = setup('roster-authority', original, 0);
  try {
    const own = engine.players.get(room.playerId).info;
    const list = bridge.aircraftRoster(engine, 0);
    assert(Object.isFrozen(list)); assert.deepEqual(list, rosters[0]);
    assert.strictEqual(list, bridge.aircraftRoster(engine, 0));
    original[0].push('fighter'); assert.deepEqual(list, rosters[0]);
    assert.throws(() => list.push('fighter'), TypeError);
    const foreign = new RoomEngine('foreign', sanitizeConfig({ ...DEFAULT_ROOM_CONFIG, teams: 2, bots: 0 }), { send() {} });
    const before = bridge.stats();
    for (const team of [-1, 2, undefined, '0']) assert.throws(() => bridge.aircraftRoster(engine, team), /Bound room/);
    assert.throws(() => bridge.aircraftRoster(foreign, 0), /Bound room/);
    assert.deepEqual(bridge.stats(), before, 'roster reads cannot bind/rebind');
    room.send({ type: 'spawn', kind: 'f35' });
    const vehicle = engine.vehicles.find(v => v.id === own.vehicleId);
    assert(vehicle && vehicle.kind === 'f35');
    // Trusted direct calls must reject before fleet synchronization, seats, ID, metadata or RNG changes.
    const rng = engine.rng; let rngCalls = 0;
    engine.rng = () => { rngCalls++; return rng(); };
    for (const kind of ['fighter', 'apache', 'future-kind']) {
      const saved = state(engine), binding = engine.combat.hostFleet;
      assert.throws(() => engine.spawnVehicle(own, kind), /unavailable for this faction/);
      assert.equal(state(engine), saved); assert.strictEqual(engine.combat.hostFleet, binding);
    }
    assert.equal(rngCalls, 0); engine.rng = rng;
    const savedTeam = own.team; own.team = 2;
    const invalidTeamState = state(engine);
    assert.throws(() => engine.spawnVehicle(own, 'f35'), /Bound room/);
    assert.equal(state(engine), invalidTeamState); own.team = savedTeam;
    const nextId = engine.nextId;
    for (const message of [
      { type: 'spawn', kind: 'fighter' }, { type: 'spawn', kind: 'future-kind' },
      { type: 'team', team: 1 }, { type: 'hello', team: 1 },
      { type: 'man-turret', ship: 't0-carrier', turret: 'aa0' },
      { type: 'board', vehicle: 'forged', seat: 0 }, { type: 'switch-seat', seat: 7 },
    ]) {
      const saved = state(engine);
      assert.doesNotThrow(() => room.send(message)); assert.equal(state(engine), saved);
    }
    assert.equal(engine.nextId, nextId);
    room.send({ type: 'switch-seat', seat: 1 }); assert.equal(own.seat, 1);
    room.send({ type: 'switch-seat', seat: 0 }); assert.equal(own.seat, 0);
    const enemyId = engine.addPlayer('Opposing aircraft');
    assert.equal(engine.players.get(enemyId).info.team, 1);
    engine.handle(enemyId, { type: 'spawn', kind: 'fighter' });
    const enemyAircraft = engine.vehicles.find(v => v.seats[0] === enemyId);
    assert(enemyAircraft);
    const beforeBoard = state(engine);
    room.send({ type: 'board', vehicle: enemyAircraft.id, seat: 1 });
    assert.equal(state(engine), beforeBoard);
    const enemySeats = [...enemyAircraft.seats];
    room.send({ type: 'switch-seat', vehicle: enemyAircraft.id, seat: 1 });
    assert.equal(own.vehicleId, vehicle.id); assert.equal(own.seat, 1);
    assert.deepEqual(enemyAircraft.seats, enemySeats, 'forged switch-seat vehicle cannot transfer ownership');
    room.send({ type: 'switch-seat', seat: 0 });
    // Negative corrupted-kind fixture only, never positive bot-spawn evidence.
    vehicle.kind = 'fighter';
    const another = engine.addPlayer('Board negative');
    engine.players.get(another).info.team = 0;
    const saved = state(engine);
    engine.handle(another, { type: 'board', vehicle: vehicle.id, seat: 1 });
    assert.equal(state(engine), saved);
    vehicle.kind = 'f35';
    engine.resetMatch();
    assert.strictEqual(bridge.aircraftRoster(engine, 0), list);
    assert.deepEqual(bridge.aircraftRoster(engine, 1), rosters[1]);
    room.send({ type: 'spawn', kind: 'f35' });
    assert(engine.vehicles.some(v => v.kind === 'f35' && v.seats[0] === room.playerId));
    bridge.dispose();
    assert.throws(() => bridge.aircraftRoster(engine, 0), /disposed/);
    assert.throws(() => engine.spawnVehicle(own, 'f35'), /disposed/);
  } finally { room.close(); }
  pass('immutable cached same-room/team roster/reset/disposal and direct spawn atomicity; forged human spawn/team/turret/board/seat rejection');

  let naturalRespawns = 0;
  for (const code of ['synthetic-roster-1', 'synthetic-roster-2', 'synthetic-roster-3']) {
    const { room, engine } = setup(code);
    const sorties = new Map(), flown = new Set();
    try {
      for (let tick = 0; tick < 7200; tick++) {
        room.step(dt);
        for (const v of engine.vehicles) {
          assert(rosters[v.team].includes(v.kind), `${code}: forbidden team ${v.team} kind ${v.kind}`);
          const pilot = engine.players.get(v.seats[0]);
          if (pilot?.info.bot && v.alive) {
            if (!sorties.has(pilot.info.id)) sorties.set(pilot.info.id, new Set());
            sorties.get(pilot.info.id).add(v.id);
            if (pilot.brain.state.vehicleId === v.id) flown.add(pilot.info.id);
            assert(v.flight.position.every(Number.isFinite));
          }
        }
        if (tick % 120 === 0) await Promise.resolve();
      }
      const bots = [...engine.players.values()].filter(p => p.info.bot);
      for (const team of [0, 1]) assert.equal(bots.filter(p => p.info.team === team).length, 2);
      assert.equal(sorties.size, 4, 'four real pilots spawned naturally, no dummy planes');
      assert.equal(flown.size, 4, 'native botInput ran for all four naturally spawned pilots');
      const counts = [...sorties.values()].map(ids => ids.size);
      naturalRespawns += counts.reduce((sum, n) => sum + n - 1, 0);
      console.log(`  ${code}: four native bots, natural sortie counts ${counts.join('/')}`);
    } finally { room.close(); }
  }
  assert(naturalRespawns > 0, 'natural deaths/respawns must occur without test state grants');
  pass(`three distinct synthetic-partition rooms: two bots/team, 120s each, ${naturalRespawns} natural respawns, every actual kind legal`);

  // Disclosed negative crew-seat fixture: vacate one real bot and age a real human seat.
  // Positive bot creation/respawn proof above does not use this state manipulation.
  const crew = setup('crew-roster-negative');
  try {
    crew.room.send({ type: 'spawn', kind: 'f35' });
    for (let i = 0; i < 2; i++) crew.room.step(dt);
    const human = crew.engine.players.get(crew.room.playerId).info;
    const aircraft = crew.engine.vehicles.find(v => v.id === human.vehicleId);
    const bot = [...crew.engine.players.values()].find(p => p.info.bot && p.info.team === human.team);
    crew.engine.vacate(bot.info); bot.info.respawnAt = 0;
    crew.engine.meta.get(aircraft.id).gunnerEmptySince = -10;
    aircraft.kind = 'fighter'; // Corrupt existing native aircraft for rejection only.
    crew.engine.updateBots();
    assert.notEqual(bot.info.vehicleId, aircraft.id, 'bot cannot crew a forbidden human aircraft');
    assert(rosters[bot.info.team].includes(crew.engine.vehicles.find(v => v.id === bot.info.vehicleId).kind));
    aircraft.kind = 'f35';
    crew.engine.vacate(bot.info); bot.info.respawnAt = 0;
    crew.engine.updateBots();
    assert.equal(bot.info.vehicleId, aircraft.id); assert.equal(bot.info.seat, 1);
  } finally { crew.room.close(); }
  pass('native crew branch rejects corrupted forbidden kind and still accepts a legal human gunner seat (disclosed fixture)');

  // An injected empty trusted roster is a negative API fixture; constructor validation above remains intact.
  for (const unsupported of [[], ['future-kind']]) {
    const legal = makeBridge();
    const empty = createLoopbackRoom({ teams: 2, bots: 2 }, 'Unsupported negative', { onMessage() {} },
      { manual: true, code: 'unsupported-roster-negative', hostBridge: { ...legal, aircraftRoster: () => unsupported } });
    try {
      for (let i = 0; i < 120; i++) empty.step(dt);
      assert.equal(empty.engine.botCount(), 4); assert.equal(empty.engine.vehicles.length, 0);
      assert.throws(() => empty.engine.spawnVehicle(empty.engine.players.get(empty.playerId).info, 'fighter'), /unavailable/);
      assert.doesNotThrow(() => empty.send({ type: 'spawn', kind: 'f35' }));
      assert.equal(empty.engine.vehicles.length, 0);
    } finally { empty.close(); }
  }
  pass('empty/unknown trusted-roster negatives: bots stay unspawned and human rejection does not crash RoomEngine');
} finally { loader.dispose(); }
console.log(`native-faction-rosters-check: ${groups} CPU groups PASS; named faction assets/UI/native pixels remain unaccepted`);
