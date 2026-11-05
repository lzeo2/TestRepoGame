// Separate two-human/zero-AI score1 CPU regression, NOT five-pilot or native acceptance.
// Exclusive slot: timeout -k 3s 60s node Games/Wings/authoring/boat-score-reset-main-check.mjs
import assert from 'node:assert/strict';
import { setImmediate as yieldTurn } from 'node:timers/promises';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
assert.equal(process.argv.length, 2, 'no fixture overrides');
const loader = installRetainedHostLoader(), began = performance.now();
let engine, aircraft, phase = 'combat';
const timing = Object.fromEntries(['combat', 'intermission'].map(p => [p,
  { ticks: 0, advanceMs: 0, deliveryMs: 0, clientMs: 0 }]));
const events = [], snapshots = new Map(), decoders = new Map();
let shooterId, victimId, ended, reset, hits = 0;
try {
  const load = path => import(new URL(`src/${path}.ts`, retainedRoot));
  const { RoomEngine, sanitizeConfig, createSnapshotDecoder, MATCH_RESTART_DELAY } = await load('sim/room-engine');
  const { DEFAULT_ROOM_CONFIG, RESPAWN_DELAY } = await load('sim/protocol');
  const { NEUTRAL_INPUT } = await load('sim/flight');
  const { WEAPONS } = await load('sim/vehicles');
  const { Input } = await load('input');
  // Only configuration differs from the menu match: score1 is accepted by the unchanged sanitizer.
  // Normal damage/protection/weapon/collision rules and the full15s restart delay are not changed.
  const config = sanitizeConfig({ ...DEFAULT_ROOM_CONFIG, vehicleMode: 'boats', teams: 2,
    bots: 0, maxPerTeam: 1, scoreLimit: 1, timeLimit: 180, listed: false });
  assert.equal(config.scoreLimit, 1); assert.equal(config.vehicleMode, 'boats');
  // Recipient-aware JSON transport for two real humans, never single-client loopback event duplication.
  const deliver = (id, text) => queueMicrotask(() => {
    if (!decoders.has(id)) decoders.set(id, createSnapshotDecoder());
    const message = decoders.get(id)(JSON.parse(text));
    if (message.type === 'snapshot') snapshots.set(id, message);
    if (id === shooterId && message.type === 'events') events.push(...message.events);
  });
  engine = new RoomEngine('local', config, {
    send: (id, message) => deliver(id, JSON.stringify(message)), sendText: deliver,
  });
  shooterId = engine.addPlayer('CPU shooter'); victimId = engine.addPlayer('CPU victim');
  const send = (id, message) => engine.handle(id, JSON.parse(JSON.stringify(message)));
  for (const id of [shooterId, victimId]) send(id, { type: 'spawn', kind: 'speedboat' });
  assert.equal(engine.humanCount(), 2); assert.equal(engine.botCount(), 0);
  const shooter = engine.players.get(shooterId), victim = engine.players.get(victimId);
  assert.equal(shooter.info.bot, false); assert.equal(victim.info.bot, false);
  assert.equal(shooter.brain, null); assert.equal(victim.brain, null);
  assert.notEqual(shooter.info.team, victim.info.team);
  const oldIds = [shooter.info.vehicleId, victim.info.vehicleId];
  // Public visibility query only for the initial sample; subsequent aim uses actual wire snapshots.
  snapshots.set(shooterId, engine.snapshotFor(shooterId));
  const controls = Object.create(Input.prototype);
  controls.keys = new Set(); controls.latched = new Set(); controls.mouseL = false;
  let seq = 0;
  const tick = async fire => {
    const sample = timing[phase];
    let start = performance.now();
    if (fire) {
      const s = snapshots.get(shooterId), own = s.vehicles.find(v => v.id === oldIds[0] && v.alive);
      const target = s.vehicles.find(v => v.id === oldIds[1] && v.alive && v.team !== own?.team);
      const aim = own && target ? target.flight.position.map((n, i) => n - own.flight.position[i]) : null;
      controls.mouseL = !!aim;
      send(shooterId, { type: 'input', seq: ++seq,
        flight: controls.boatFlightInput({}), seat: controls.boatSeatInput(aim, {}) });
    }
    sample.clientMs += performance.now() - start;
    start = performance.now(); engine.advance(1 / 60); sample.advanceMs += performance.now() - start;
    start = performance.now(); await Promise.resolve(); sample.deliveryMs += performance.now() - start;
    sample.ticks++;
    if (sample.ticks % 30 === 0) await yieldTurn(); // External guard can terminate the owned process.
  };
  for (let n = 0; n < 20 * 60 && engine.matchEndedAt === null; n++) await tick(true);
  ended = engine.matchEndedAt;
  assert.notEqual(ended, null, 'real cannon score outcome, not a clock/time grant');
  const kills = events.filter(e => e.type === 'kill');
  hits = events.filter(e => e.type === 'hit' && e.by === shooterId && e.target === oldIds[1]).length;
  assert(hits > 0); assert.equal(kills.length, 1);
  assert.equal(kills[0].weapon, 'cannon20'); assert.equal(kills[0].killer, shooterId);
  assert.equal(kills[0].victim, oldIds[1]); assert.equal(victim.info.deaths, 1);
  assert.equal(victim.info.vehicleId, null); assert.equal(victim.info.respawnAt, ended + RESPAWN_DELAY);
  assert.equal(shooter.info.kills, 1); assert.equal(engine.teamKills[shooter.info.team], 1);
  assert.equal(engine.winner, shooter.info.team);
  assert(events.some(e => e.type === 'match-end' && e.reason === 'score' && e.winner === shooter.info.team));
  console.log(JSON.stringify({ phase: 'real-score-end', ended, hits, kills, scores: engine.teamKills }));
  phase = 'intermission';
  // Ordinary neutral request releases fire; no state mutation and no paused clock/AI/combat bypass.
  controls.mouseL = false;
  send(shooterId, { type: 'input', seq: ++seq, flight: controls.boatFlightInput({}), seat: controls.boatSeatInput(null, {}) });
  for (let n = 0; n < Math.ceil(MATCH_RESTART_DELAY * 60) + 2 && engine.matchEndedAt !== null; n++) {
    await tick(false);
    if (engine.matchEndedAt !== null) {
      assert(engine.time - ended < MATCH_RESTART_DELAY, 'intermission must reset once the ordinary delay expires');
      assert.equal(engine.matchEndedAt, ended, 'genuine end timestamp stays stable');
    }
  }
  assert.equal(engine.matchEndedAt, null); reset = engine.time;
  assert(reset - ended >= MATCH_RESTART_DELAY);
  assert(reset - ended < MATCH_RESTART_DELAY + 2 / 60);
  assert.deepEqual(engine.teamKills, [0, 0]); assert.deepEqual(engine.scores, [0, 0]);
  assert.equal(engine.winner, null); assert.equal(engine.matchStartedAt, reset);
  assert.equal(engine.vehicles.length, 0); assert.equal(engine.combat.projectiles.length, 0);
  for (const p of [shooter, victim]) {
    assert.equal(p.info.vehicleId, null); assert.equal(p.info.seat, null);
    assert.equal(p.info.kills, 0); assert.equal(p.info.deaths, 0); assert.equal(p.info.respawnAt, 0);
    assert.deepEqual(p.flight, NEUTRAL_INPUT); assert.equal(p.seat.firePrimary, false);
    assert.equal(p.queue.length, 0);
    send(p.info.id, { type: 'spawn', kind: 'speedboat' });
    const fresh = engine.vehicles.find(v => v.id === p.info.vehicleId);
    assert(fresh?.alive && !oldIds.includes(fresh.id)); assert.equal(fresh.hp, fresh.maxHp);
    assert.deepEqual(fresh.flight.velocity, [0, 0, 0]); assert.equal(fresh.flight.tick, 0);
    assert.equal(fresh.weapons[0][0].ammo, WEAPONS.cannon20.ammo);
  }
  for (const id of [shooterId, victimId]) engine.removePlayer(id);
  assert.equal(engine.humanCount(), 0);
  const { createLoopbackRoom } = await load('sim/loopback');
  aircraft = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, bots: 0, listed: false }, 'Fresh aircraft',
    { onMessage() {} }, { manual: true });
  aircraft.send({ type: 'spawn', kind: 'fighter' });
  assert.equal(aircraft.engine.config.vehicleMode, undefined); assert.equal(aircraft.engine.vehicles[0]?.kind, 'fighter');
  phase = 'PASS_SEPARATE_CPU_SCORE_RESET_NOT_FIVE_PILOT';
  console.log(JSON.stringify({ phase, ended, reset, hits, humans: 2, bots: 0, scoreLimit: 1,
    restartDelay: MATCH_RESTART_DELAY, timings: timing, wallSeconds: (performance.now() - began) / 1000,
    holds: 'Not five-pilot/native play or a full GameSession/menu; post-round fresh spawn is not mid-match respawn-cooldown acceptance.' }));
} catch (error) {
  console.log(JSON.stringify({ phase, simSeconds: engine?.time, ended, reset, hits, timings: timing })); throw error;
} finally { for (const id of [shooterId, victimId]) if (id) engine?.removePlayer(id); aircraft?.close(); loader.dispose(); }
