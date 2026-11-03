// CPU automation of ordinary human-player actions, NOT physical human input/native play.
// Run under an exclusive replay slot: timeout -k 3s 120s node Games/Wings/authoring/boat-human-lifecycle-check.mjs
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
const loader = installRetainedHostLoader();
let room;
try {
  const load = path => import(new URL(`src/${path}.ts`, retainedRoot));
  const { DEFAULT_ROOM_CONFIG, RESPAWN_DELAY } = await load('sim/protocol');
  const { RoomEngine, sanitizeConfig, createSnapshotDecoder, WRECK_LINGER } = await load('sim/room-engine');
  const { NEUTRAL_INPUT } = await load('sim/flight');
  const { SPAWN_PROTECTION } = await load('sim/fleet');
  const { BoatHandling: H } = await load('sim/boat-movement');
  const { Input } = await load('input');
  const events = [], errors = [];
  // Recipient-aware in-memory JSON loopback. Production createLoopbackRoom is single-client:
  // adding another human there would deliver each event twice to that one handler.
  const decoders = new Map(), inboxes = new Map();
  const deliver = (id, text) => queueMicrotask(() => {
    if (!decoders.has(id)) decoders.set(id, createSnapshotDecoder());
    const m = decoders.get(id)(JSON.parse(text));
    if (!inboxes.has(id)) inboxes.set(id, []);
    if (m.type === 'events') inboxes.get(id).push(...m.events);
    if (m.type === 'error') errors.push(m.message);
  });
  const engine = new RoomEngine('human-lifecycle', sanitizeConfig({ ...DEFAULT_ROOM_CONFIG,
    vehicleMode: 'boats', bots: 0, listed: false, scoreLimit: 50, timeLimit: 60 }), {
    send: (id, message) => deliver(id, JSON.stringify(message)), sendText: deliver,
  });
  const shooterId = engine.addPlayer('CPU human shooter');
  const victimId = engine.addPlayer('CPU human victim');
  room = { send: message => engine.handle(shooterId, JSON.parse(JSON.stringify(message))),
    step: seconds => engine.advance(seconds), close() { engine.removePlayer(shooterId); engine.removePlayer(victimId); } };
  const handleVictim = message => engine.handle(victimId, JSON.parse(JSON.stringify(message)));
  const shooter = engine.players.get(shooterId), victim = engine.players.get(victimId);
  assert.equal(engine.humanCount(), 2); assert.equal(engine.botCount(), 0);
  for (const p of [shooter, victim]) { assert.equal(p.info.bot, false); assert.equal(p.brain, null); }
  assert.notEqual(shooter.info.team, victim.info.team);
  room.send({ type: 'spawn', kind: 'speedboat' });
  handleVictim({ type: 'spawn', kind: 'speedboat' });
  const own = engine.vehicles.find(v => v.id === shooter.info.vehicleId);
  const target = engine.vehicles.find(v => v.id === victim.info.vehicleId);
  assert(own?.alive && target?.alive);
  const starts = [own, target].map(v => structuredClone(v.flight.position));
  const observed = engine.snapshotFor(shooterId);
  const visible = observed.vehicles.find(v => v.id === target.id);
  const observedOwn = observed.vehicles.find(v => v.id === own.id);
  assert(visible && observedOwn, 'aim only from an actual visible contact and own snapshot');
  // Both boats stay stationary at their legal spawn. Aim from own observed root at the visible root;
  // the production muzzle/gimbal, spread, LOS, projectile range and spawn immunity remain authoritative.
  const direction = visible.flight.position.map((n, i) => n - observedOwn.flight.position[i]);
  const length = Math.hypot(...direction), aim = direction.map(n => n / length);
  const controls = Object.create(Input.prototype);
  controls.keys = new Set(); controls.latched = new Set(); controls.mouseL = true;
  let seq = 0;
  const tick = async fire => {
    controls.mouseL = fire;
    room.send({ type: 'input', seq: ++seq, flight: controls.boatFlightInput({}), seat: controls.boatSeatInput(aim, {}) });
    if (target.alive) handleVictim({ type: 'input', seq,
      flight: { ...NEUTRAL_INPUT, brake: true }, seat: { aim: null, firePrimary: false, fireSecondary: false, flares: false, ability: false } });
    room.step(1 / 60);
    await Promise.resolve(); // JSON event delivery; never read/flush private engine events.
    events.push(...(inboxes.get(shooterId)?.splice(0) ?? []));
    // The other endpoint receives its own copy, not a duplicate in the shooter's event stream.
    inboxes.get(victimId)?.splice(0);
  };
  while (engine.time < SPAWN_PROTECTION - 1 / 60) await tick(true);
  assert.equal(target.hp, target.maxHp, 'real spawn protection prevents early damage');
  assert(!events.some(e => e.type === 'hit' && e.target === target.id));
  for (let n = 0; n < 20 * 60 && target.alive; n++) await tick(true);
  const hits = events.filter(e => e.type === 'hit' && e.target === target.id && e.by === shooterId && e.weapon === 'cannon20');
  const kills = events.filter(e => e.type === 'kill' && e.victim === target.id);
  console.log(JSON.stringify({ phase: 'combat', time: engine.time, targetHp: target.hp,
    shots: events.filter(e => e.type === 'fire' && e.vehicle === own.id).length, hits: hits.length, kills }));
  assert(hits.length > 0, 'ordinary human cannon must produce attributed hit events');
  assert.equal(kills.length, 1, 'exactly one event-proven HUMAN victim death');
  assert.equal(kills[0].weapon, 'cannon20'); assert.equal(kills[0].killer, shooterId);
  assert.equal(kills[0].victimTeam, victim.info.team);
  assert.equal(target.alive, false); assert.equal(target.hp, 0);
  assert.deepEqual(target.seats, [null, null]);
  assert.equal(victim.info.deaths, 1); assert.equal(shooter.info.kills, 1);
  assert.equal(victim.info.vehicleId, null); assert.equal(victim.info.seat, null);
  assert.deepEqual(victim.flight, NEUTRAL_INPUT);
  assert.equal(victim.seat.aim, null); assert.equal(victim.seat.firePrimary, false);
  assert.equal(engine.teamKills[shooter.info.team], 1);
  const diedAt = engine.time;
  assert.equal(victim.info.respawnAt, diedAt + RESPAWN_DELAY);
  const count = engine.vehicles.length, beforeErrors = errors.length;
  handleVictim({ type: 'spawn', kind: 'speedboat' });
  await Promise.resolve();
  assert.equal(engine.vehicles.length, count); assert.equal(victim.info.vehicleId, null);
  assert(errors.slice(beforeErrors).includes('Respawn not ready.'), 'ordinary early spawn explicitly denied');
  while (engine.time < victim.info.respawnAt - 1 / 60) await tick(false);
  handleVictim({ type: 'spawn', kind: 'speedboat' });
  await Promise.resolve();
  assert.equal(victim.info.vehicleId, null, 'last tick before cooldown still denied');
  while (engine.time < victim.info.respawnAt) await tick(false);
  handleVictim({ type: 'spawn', kind: 'speedboat' });
  const fresh = engine.vehicles.find(v => v.id === victim.info.vehicleId);
  assert(fresh?.alive && fresh.id !== target.id);
  assert.equal(fresh.hp, fresh.maxHp); assert.deepEqual(fresh.flight.velocity, [0, 0, 0]);
  assert.equal(fresh.flight.throttle, 0); assert.equal(fresh.flight.tick, 0); assert.equal(fresh.flight.crashed, null);
  assert.deepEqual(fresh.seats, [victimId, null]); assert.deepEqual(victim.flight, NEUTRAL_INPUT);
  assert.equal(victim.seat.aim, null); assert.equal(victim.seat.firePrimary, false);
  assert.equal(victim.queue.length, 0, 'old input buffer drained through ordinary cooldown ticks');
  assert(engine.time - diedAt >= WRECK_LINGER);
  assert(!engine.vehicles.some(v => v.id === target.id), 'ordinary wreck cleanup, no private removal');
  await tick(false);
  // Stationary means no driven translation. Keep the native tick-deterministic vertical bob exactly;
  // the fresh pre-tick spawn above must still have strictly zero velocity on all three axes.
  const bobVelocity = H.bob * Math.sin(2.4 / 60) * (1 - Math.exp(-H.buoyancy / 60)) * 60;
  assert.deepEqual([fresh.flight.velocity[0], fresh.flight.velocity[2]], [0, 0]);
  assert(Math.abs(fresh.flight.velocity[1] - bobVelocity) < 1e-12);
  assert.equal(fresh.hp, fresh.maxHp);
  for (const [i, v] of [own, target].entries()) {
    assert.deepEqual([v.flight.position[0], v.flight.position[2]], [starts[i][0], starts[i][2]]);
    assert(Math.abs(v.flight.position[1]) <= H.bob);
  }
  assert.equal(engine.matchEndedAt, null, 'no match win/reset needed for lifecycle');
  console.log(JSON.stringify({ status: 'PASS_CPU_NOT_PHYSICAL_PLAY', humans: engine.humanCount(),
    bots: engine.botCount(), hitEvents: hits.length, diedAt, respawnAt: engine.time,
    wreckRemoved: true, stationarySpawn: true, neutralInputs: true }));
} finally { room?.close(); loader.dispose(); }
