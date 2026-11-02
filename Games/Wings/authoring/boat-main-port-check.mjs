// Current-source CPU regression. No browser, native input, rendered pixels or device claims.
// Run: node Games/Wings/authoring/boat-main-port-check.mjs
// Parent-serialized longer lifecycle: add --lifecycle (no worker full simulation).
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';

const loader = installRetainedHostLoader();
const load = path => import(new URL(`src/sim/${path}.ts`, retainedRoot));
const rooms = [];
const lifecycleRequested = process.argv.includes('--lifecycle');
assert(process.argv.slice(2).every(arg => arg === '--lifecycle'), 'only --lifecycle is supported');
try {
  const { createLoopbackRoom } = await load('loopback');
  const { sanitizeConfig, WRECK_LINGER, MATCH_RESTART_DELAY, ABANDONED_DESTROY_DELAY } = await load('room-engine');
  const { DEFAULT_ROOM_CONFIG, RESPAWN_DELAY } = await load('protocol');
  const { VEHICLES, VEHICLE_KINDS } = await load('vehicles');
  const { NEUTRAL_INPUT, stepFlight } = await load('flight');
  const { BoatHandling: H, boatNavigable, stepBoatMovement } = await load('boat-movement');
  const { createBoatState, boatGunController, boatMotionChannels } = await load('boat-native');
  const { boatAIInput } = await load('boat-ai');
  const { worldQuery } = await load('geography');
  const { withFleetSurface } = await load('fleet-world-query');
  const { FLEET, SHIP_SPECS } = await load('fleet');
  const dt = 1 / 60;
  // Execute original Input methods without constructor DOM listeners or a replacement Input.
  const { Input } = await import(new URL('src/input.ts', retainedRoot));
  const controls = Object.create(Input.prototype);
  controls.keys = new Set(); controls.latched = new Set(); controls.mouseL = false;
  const readControls = keys => {
    controls.keys = new Set(keys);
    const out = { aim: [1, 1, 1], throttle: 99, yaw: 99, roll: 99, pitch: 99, boost: true, brake: true };
    assert.equal(controls.boatFlightInput(out), out);
    assert.equal(out.aim, null); assert.equal(out.roll, 0); assert.equal(out.pitch, 0); assert.equal(out.boost, false);
    return out;
  };
  for (const [keys, throttle, yaw, brake] of [
    [[], 0, 0, false], [['KeyW'], 1, 0, false], [['KeyS'], -1, 0, false],
    [['KeyA'], 0, -1, false], [['KeyD'], 0, 1, false],
    [['ArrowLeft'], 0, -1, false], [['ArrowRight'], 0, 1, false],
    [['Space'], 0, 0, true], [['KeyX'], 0, 0, true],
    [['KeyW', 'KeyS', 'KeyA', 'KeyD'], 0, 0, false],
    [['ShiftLeft', 'ArrowUp', 'KeyF', 'KeyV', 'KeyR'], 0, 0, false],
  ]) {
    const out = readControls(keys);
    assert.deepEqual([out.throttle, out.yaw, out.brake], [throttle, yaw, brake]);
  }
  const aim = [0, 0, -1];
  for (const source of ['none', 'mouseL', 'latched', 'held']) {
    controls.keys = new Set(['Space', 'KeyF', 'KeyV', 'KeyR', 'Mouse2']);
    controls.latched = new Set(source === 'latched' ? ['Mouse0'] : ['Space']);
    controls.mouseL = source === 'mouseL';
    if (source === 'held') controls.keys.add('Mouse0');
    const out = { aim: null, firePrimary: true, fireSecondary: true, flares: true, ability: true, steerBomb: true };
    assert.equal(controls.boatSeatInput(aim, out), out);
    assert.equal(out.aim, aim);
    assert.equal(out.firePrimary, source !== 'none', 'Space and aircraft aliases never fire boat gun');
    assert.deepEqual([out.fireSecondary, out.flares, out.ability, out.steerBomb], [false, false, false, false]);
  }
  controls.keys.clear(); controls.latched.clear(); controls.mouseL = false;
  assert.equal(VEHICLE_KINDS.length, 28);
  assert.equal(VEHICLE_KINDS[27], 'speedboat', 'missing or misrouted boat registration fails');
  assert.equal(VEHICLES.speedboat.flight, 'water');
  assert.deepEqual(VEHICLES.speedboat.seatWeapons, [['cannon20', null], [null, null]]);
  assert.notEqual(DEFAULT_ROOM_CONFIG.vehicleMode, 'boats', 'aircraft defaults remain opt-out');
  assert.equal(sanitizeConfig({ vehicleMode: 'boats' }).vehicleMode, 'boats');
  for (const value of ['boat', 'aircraft', '__proto__', '', null, 1, [], {}, true]) {
    // Malformed requests must never opt into boats, including with a boats base.
    for (const base of [DEFAULT_ROOM_CONFIG, { ...DEFAULT_ROOM_CONFIG, vehicleMode: 'boats' }]) {
      let config;
      try { config = sanitizeConfig({ vehicleMode: value }, base); }
      catch (error) { assert(error instanceof TypeError || error instanceof RangeError); continue; }
      assert.notEqual(config.vehicleMode, 'boats', `invalid mode ${JSON.stringify(value)} inherited boat authority`);
    }
  }
  const open = (config = {}, name = 'Boat CPU') => {
    const messages = [];
    const room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, bots: 0, listed: false, ...config }, name,
      { onMessage: message => messages.push(message) }, { manual: true });
    rooms.push(room);
    return { room, messages };
  };
  const vehicleOf = room => room.engine.vehicles.find(v => v.seats[0] === room.playerId && v.alive);
  const advance = (room, seconds) => { for (let t = 0; t < Math.ceil(seconds / dt); t++) room.step(dt); };
  const ordinary = open().room;
  ordinary.send({ type: 'spawn', kind: 'speedboat' });
  assert.equal(ordinary.engine.vehicles.length, 0, 'normal aircraft room must refuse a boat');
  ordinary.send({ type: 'spawn', kind: 'fighter' });
  assert.equal(vehicleOf(ordinary)?.kind, 'fighter', 'normal aircraft spawn still works');
  ordinary.close();

  const { room, messages } = open({ vehicleMode: 'boats' });
  await Promise.resolve();
  assert(messages.some(m => m.type === 'welcome' && m.config.vehicleMode === 'boats'));
  for (const kind of ['fighter', 'apache', '__proto__', null, {}]) {
    room.send({ type: 'spawn', kind });
    assert.equal(room.engine.vehicles.length, 0, 'boats mode refuses aircraft/malformed spawn');
  }
  room.send({ type: 'spawn', kind: 'speedboat' });
  const boat = vehicleOf(room);
  assert(boat && boat.kind === 'speedboat' && boat.flight.kind === 'speedboat', 'real room must spawn the actual boat');
  assert.deepEqual(boat.seats, [room.playerId, null]);
  assert.deepEqual(boat.flight.velocity, [0, 0, 0]);
  assert(boat.flight.position.every(Number.isFinite));
  assert.equal(boat.flight.onGround, false);
  assert.equal(boat.flight.gearDown, false);
  const yaw = q => Math.atan2(2 * (q[0] * q[2] + q[3] * q[1]), 1 - 2 * (q[0] ** 2 + q[1] ** 2));
  assert(boatNavigable(worldQuery, boat.flight.position[0], boat.flight.position[2], yaw(boat.flight.orientation)), 'spawn needs full hull water clearance');
  assert.equal(boatGunController([room.playerId, null]), 0);
  assert.equal(boatGunController([null, 'passenger']), null);
  for (const message of [{ type: 'switch-seat', seat: 1 }, { type: 'board', vehicle: boat.id, seat: 1 }]) {
    room.send(message);
    assert.deepEqual(boat.seats, [room.playerId, null], 'pilot cannot become passenger/gunner');
    assert.equal(room.engine.players.get(room.playerId).info.seat, 0);
  }
  // Normal balancing first fills the opposite team, then naturally admits an ally.
  const opponent = room.engine.addPlayer('Opposite team');
  assert.notEqual(room.engine.players.get(opponent).info.team, boat.team);
  room.engine.handle(opponent, { type: 'team', team: boat.team });
  assert.notEqual(room.engine.players.get(opponent).info.team, boat.team, 'normal balancing denies an overpopulated team');
  room.engine.handle(opponent, { type: 'board', vehicle: boat.id, seat: 1 });
  assert.equal(room.engine.players.get(opponent).info.vehicleId, null, 'opponent cannot board boat');
  const visitor = room.engine.addPlayer('No passenger');
  assert.equal(room.engine.players.get(visitor).info.team, boat.team, 'third human naturally balances onto boat team');
  room.engine.handle(visitor, { type: 'board', vehicle: boat.id, seat: 1 });
  assert.equal(room.engine.players.get(visitor).info.vehicleId, null);
  assert.equal(boat.seats[1], null);
  const friendlyShip = FLEET.find(s => s.team === boat.team && SHIP_SPECS[s.kind].turrets.some(t => t.mannable));
  assert(friendlyShip, 'fixture requires a real mannable native turret');
  room.send({ type: 'man-turret', ship: friendlyShip.id, turret: SHIP_SPECS[friendlyShip.kind].turrets.find(t => t.mannable).id });
  assert.equal(room.engine.players.get(room.playerId).info.turret, null, 'boat mode denies real man-turret path');
  assert.deepEqual(boat.seats, [room.playerId, null]);
  room.engine.handle(visitor, { type: 'spawn', kind: 'speedboat' });
  const second = room.engine.vehicles.find(v => v.seats[0] === visitor);
  assert(second, 'second real pilot gets a water slot');
  assert(Math.hypot(...second.flight.position.map((n, i) => n - boat.flight.position[i])) > 2 * Math.hypot(H.halfLength, H.halfBeam), 'water spawn envelopes must not overlap');
  room.engine.removePlayer(visitor);
  room.engine.removePlayer(opponent);
  const start = [...boat.flight.position];
  let seq = 0;
  const drive = (input, ticks) => {
    for (let i = 0; i < ticks; i++) {
      room.send({ type: 'input', seq: ++seq, flight: { ...NEUTRAL_INPUT, ...input } });
      room.step(dt);
    }
  };
  drive(readControls(['KeyW']), 90); // Actual held W through normal JSON/input jitter path.
  assert(boat.alive && Math.hypot(...boat.flight.velocity) > 0.5);
  assert(Math.hypot(...boat.flight.position.map((n, i) => n - start[i])) > 0.5, 'normal W must route to water motion');
  const beforeYaw = yaw(boat.flight.orientation);
  drive(readControls(['KeyW', 'KeyD']), 30); // Actual D maps to boat yaw, never aircraft roll.
  assert(Math.abs(yaw(boat.flight.orientation) - beforeYaw) > 0.01);
  assert(boat.alive && Math.abs(boat.flight.position[1]) < 0.1, 'no aircraft climb or dryland teleport');
  await Promise.resolve();
  assert(messages.some(m => m.type === 'snapshot' && m.vehicles.some(v => v.id === boat.id && v.kind === 'speedboat')));
  room.close();

  // Small deterministic water fixtures; they supplement, never impersonate, the room above.
  const sea = { groundHeight: () => 0, seabedHeight: () => -10, isWater: () => true,
    onRunway: () => false, half: 1000, ceiling: 1000 };
  const state = () => createBoatState({ position: [0, 0, 0], yaw: 0 }, sea);
  const input = { ...NEUTRAL_INPUT, throttle: 1 };
  const zero = state(), beforeZero = structuredClone(zero);
  stepBoatMovement(zero, input, 0, sea); assert.deepEqual(zero, beforeZero);
  for (const bad of [-1, NaN, Infinity, 0.251]) {
    assert.throws(() => stepBoatMovement(zero, input, bad, sea), RangeError);
    assert.deepEqual(zero, beforeZero, 'invalid dt must not mutate');
  }
  const a = state(), b = state(), routed = state();
  stepBoatMovement(a, input, 4 * dt, sea);
  for (let i = 0; i < 4; i++) stepBoatMovement(b, input, dt, sea);
  assert.deepEqual(a, b, 'whole native tick partitions agree');
  stepFlight(routed, input, dt, sea);
  const direct = state(); stepBoatMovement(direct, input, dt, sea);
  assert.deepEqual(routed, direct, 'shared prediction must consume boat branch, not jet fallback');
  const motion = state();
  for (let i = 0; i < 90; i++) stepBoatMovement(motion, input, dt, sea);
  const speed = Math.hypot(...motion.velocity);
  for (let i = 0; i < 45; i++) stepBoatMovement(motion, { ...input, brake: true }, dt, sea);
  assert(Math.hypot(...motion.velocity) < speed / 2);
  for (let i = 0; i < 90; i++) stepBoatMovement(motion, { ...input, throttle: -1 }, dt, sea);
  assert(motion.velocity[2] > 0, 'S reverses instead of taking off');
  assert.equal(boatMotionChannels(motion, sea).wet, true);
  for (const obstacle of [
    { ...sea, groundHeight: (_x, z) => z < -6 ? 5 : 0, isWater: (_x, z) => z >= -6 },
    { ...sea, segmentHitsBoatSolid: (from, to) => Math.min(from[2], to[2]) <= -6 && Math.max(from[2], to[2]) >= -6 },
    withFleetSurface(sea, (_x, z) => z < -6 ? 5 : null),
    { ...sea, half: 6 },
  ]) {
    const s = state();
    for (let i = 0; i < 90; i++) stepBoatMovement(s, input, dt, obstacle);
    assert(s.position[2] > -1.1 && s.position[2] <= 0, 'shore/native/fitted/boundary stops hull without wrap/teleport');
    assert(s.position.every(Number.isFinite));
  }
  assert.throws(() => createBoatState({ position: [0, 0, 0], yaw: 0 }, { ...sea, isWater: () => false }), RangeError);
  assert.throws(() => createBoatState({ position: [0, 0, 0], yaw: 0 }, { ...sea, segmentHitsBoatSolid: () => true }), RangeError);
  let calls = 0;
  const guarded = state();
  stepBoatMovement(guarded, input, dt, { ...sea, segmentHitsBoatSolid() { calls++; return true; } });
  assert(calls > 0 && guarded.crashed, 'reviewed solid guard must actually be consumed');
  assert.equal(guarded.position[2], 0);
  assert.equal(boatMotionChannels(guarded, sea).wake, 0);

  const contacts = [{ id: 'enemy', team: 1, alive: true, visible: true, position: [0, 1.15, -100], velocity: [0, 0, 0] }];
  const aiState = state(), frozen = structuredClone(aiState), frozenContacts = structuredClone(contacts);
  let rays = 0;
  const blocked = boatAIInput(aiState, 0, contacts, { ...sea, lineOfSight() { rays++; return false; } });
  assert(rays > 0 && !blocked.seat.firePrimary, 'aligned visible contact still requires actual LOS');
  assert(boatAIInput(aiState, 0, contacts, { ...sea, lineOfSight: () => true }).seat.firePrimary);
  assert.equal(boatAIInput(aiState, 0, [{ ...contacts[0], visible: false }], { ...sea, lineOfSight: () => true }).targetId, null);
  assert.deepEqual(aiState, frozen, 'AI grants no state/ammo/pose changes');
  assert.deepEqual(contacts, frozenContacts, 'AI never upgrades contact visibility');

  // Parent-only longer run: normal leave/abandonment death and timeout/restart. No HP,
  // position, private reset, timer or kill grants. Combat death/respawn remains a separate hold.
  if (lifecycleRequested) {
    const lifecycle = open({ vehicleMode: 'boats', timeLimit: 60 }).room;
    lifecycle.send({ type: 'spawn', kind: 'speedboat' });
    const old = vehicleOf(lifecycle); assert(old);
    lifecycle.send({ type: 'leave-vehicle' });
    assert.equal(lifecycle.engine.players.get(lifecycle.playerId).info.vehicleId, null);
    advance(lifecycle, ABANDONED_DESTROY_DELAY + 1);
    assert.equal(old.alive, false, 'ordinary abandonment must kill an empty boat');
    assert.equal(boatMotionChannels(old.flight, sea).wake, 0, 'dead boat has no residual wake');
    advance(lifecycle, WRECK_LINGER + RESPAWN_DELAY + 1);
    assert(!lifecycle.engine.vehicles.some(v => v.id === old.id), 'ordinary wreck cleanup removes float state');
    lifecycle.send({ type: 'spawn', kind: 'speedboat' });
    const fresh = vehicleOf(lifecycle); assert(fresh && fresh.id !== old.id);
    assert.deepEqual(fresh.flight.velocity, [0, 0, 0]);
    assert.equal(fresh.flight.crashed, null);
    assert.equal(fresh.flight.tick, 0);
    advance(lifecycle, 60 + MATCH_RESTART_DELAY + 1);
    assert(!lifecycle.engine.vehicles.some(v => v.id === fresh.id), 'ordinary match restart removes old float state');
    lifecycle.send({ type: 'spawn', kind: 'speedboat' });
    assert(vehicleOf(lifecycle));
    lifecycle.close();
    console.log('PASS extended CPU: normal abandonment death, wreck cleanup, fresh stationary spawn and match restart.');
  }
  console.log('PASS focused boat CPU: real loopback mode isolation, pilot ownership, water spawn/no overlap, held input, prediction routing, partitions, brake/reverse, shore/solid/boundary guards, AI LOS/no grants.');
  console.log('HELD: native pixels/device proof, normal combat death/respawn, full old suites and original combined boat CPU11/12 remain unaccepted.');
  if (!lifecycleRequested) console.log('NOT RUN: longer --lifecycle death/cleanup/restart fixture (parent serializes).');
} finally {
  for (const room of rooms) room.close();
  loader.dispose();
}
