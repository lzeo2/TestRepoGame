// Current-menu CPU automation, NOT physical human input or rendered GameSession acceptance.
// Exclusive slot only: timeout -k 3s 120s node Games/Wings/authoring/boat-five-pilot-main-check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate as yieldTurn } from 'node:timers/promises';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
assert.equal(process.argv.length, 2, 'no fixture overrides');
const loader = installRetainedHostLoader();
let room, aircraftRoom, latest = null, stage = 'startup';
const began = performance.now();
const report = { peakPilots: 0, fireEvents: 0, hitEvents: 0, humanHitEvents: 0,
  humanDamageEvents: 0, humanDeaths: 0, humanRespawns: 0, earlyRespawnDenials: 0, kills: [] };
const progress = () => console.log(JSON.stringify({ stage, wallSeconds: (performance.now() - began) / 1000,
  simSeconds: room?.engine.time ?? 0, scores: room?.engine.teamKills, ...report }));
try {
  const load = path => import(new URL(`src/${path}.ts`, retainedRoot));
  const { createLoopbackRoom } = await load('sim/loopback');
  const { DEFAULT_ROOM_CONFIG } = await load('sim/protocol');
  const { MATCH_RESTART_DELAY } = await load('sim/room-engine');
  const { boatGunPose } = await load('sim/boat-native');
  const { leadPoint } = await load('sim/combat');
  const { WEAPONS } = await load('sim/vehicles');
  const { Input } = await load('input');
  // Execute the actual final menu item callback; do not copy its configuration into a fixture.
  const lobby = readFileSync(new URL('src/ui/lobby.ts', retainedRoot), 'utf8');
  const marker = '{ label: "Boat Combat", run:';
  assert.equal(lobby.split(marker).length, 2);
  const from = lobby.indexOf(marker), to = lobby.indexOf('\n    ],', from);
  assert(to > from);
  const item = lobby.slice(from, to).trim().replace(/,$/, '');
  let request;
  new Function('DEFAULT_ROOM_CONFIG', 'opts', `return (${item});`)(DEFAULT_ROOM_CONFIG,
    { onStart(value) { request = value; } }).run();
  assert.equal(request.mode, 'offline'); assert.equal(request.aircraft, 'speedboat');
  assert.deepEqual([request.config.vehicleMode, request.config.teams, request.config.bots,
    request.config.botSkill, request.config.maxPerTeam, request.config.scoreLimit, request.config.timeLimit,
    request.config.listed], ['boats', 2, 2, 0.5, 3, 5, 180, false]);
  const humanVehicles = new Set(), errors = [], ends = [];
  room = createLoopbackRoom(request.config, 'CPU human pilot', { onMessage(m) {
    if (m.type === 'snapshot') {
      latest = m;
      const me = m.players.find(p => p.id === room.playerId);
      if (me?.vehicleId) humanVehicles.add(me.vehicleId);
      report.humanDeaths = Math.max(report.humanDeaths, me?.deaths ?? 0);
    } else if (m.type === 'error') errors.push(m.message);
    else if (m.type === 'events') for (const e of m.events) {
      if (e.type === 'fire') report.fireEvents++;
      if (e.type === 'hit') {
        report.hitEvents++;
        if (e.by === room.playerId) report.humanHitEvents++;
        if (humanVehicles.has(e.target)) report.humanDamageEvents++;
      }
      if (e.type === 'kill') { report.kills.push(e); progress(); }
      if (e.type === 'match-end') ends.push(e);
    }
  } }, { manual: true }); // Default production room code/RNG, not a seed override.
  const engine = room.engine;
  assert.equal(engine.humanCount(), 1); assert.equal(engine.botCount(), 4);
  assert.deepEqual([0, 1].map(t => [...engine.players.values()].filter(p => p.info.bot && p.info.team === t).length), [2, 2]);
  const human = engine.players.get(room.playerId);
  assert.equal(human.info.bot, false); assert.equal(human.brain, null);
  room.send({ type: 'spawn', kind: request.aircraft }); // Same ordinary initial request as GameSession.connect.
  const initial = engine.vehicles.find(v => v.id === human.info.vehicleId);
  assert(initial?.alive); humanVehicles.add(initial.id);
  await Promise.resolve();
  const controls = Object.create(Input.prototype);
  controls.keys = new Set(); controls.latched = new Set(); controls.mouseL = false;
  let seq = 0, earlyRequested = 0, ending = null, reset = null;
  stage = 'five-pilot-combat'; progress();
  const maximumTicks = Math.ceil((request.config.timeLimit + MATCH_RESTART_DELAY + 1) * 60);
  for (let tick = 0; tick < maximumTicks; tick++) {
    if (!ending && latest) {
      const me = latest.players.find(p => p.id === room.playerId);
      if (me && !me.vehicleId && me.deaths > earlyRequested) {
        earlyRequested = me.deaths;
        const before = errors.length;
        room.send({ type: 'spawn', kind: request.aircraft });
        await Promise.resolve();
        assert.equal(human.info.vehicleId, null, 'early respawn denied without grants');
        assert(errors.slice(before).includes('Respawn not ready.'));
        report.earlyRespawnDenials++;
      } else if (me && !me.vehicleId && latest.time >= me.respawnAt) {
        const old = human.info.vehicleId;
        room.send({ type: 'spawn', kind: request.aircraft });
        if (human.info.vehicleId && human.info.vehicleId !== old) {
          const fresh = engine.vehicles.find(v => v.id === human.info.vehicleId);
          assert(fresh.alive && fresh.hp === fresh.maxHp);
          assert.deepEqual(fresh.flight.velocity, [0, 0, 0]);
          assert.equal(human.flight.throttle, 0); assert.equal(human.seat.firePrimary, false);
          humanVehicles.add(fresh.id); report.humanRespawns++;
        }
      }
      const own = latest.vehicles.find(v => v.id === me?.vehicleId && v.alive);
      const contacts = latest.vehicles.filter(v => v.alive && v.team !== me?.team);
      if (own) {
        contacts.sort((a, b) => Math.hypot(...a.flight.position.map((n, i) => n - own.flight.position[i])) -
          Math.hypot(...b.flight.position.map((n, i) => n - own.flight.position[i])) || a.id.localeCompare(b.id));
        let aim = null;
        if (contacts.length) {
          const target = contacts[0], origin = boatGunPose(own.flight, null).origin, point = [0, 0, 0];
          const time = leadPoint(origin, own.flight.velocity, WEAPONS.cannon20.speed,
            target.flight.position, target.flight.velocity, point);
          if (time > 0 && time <= WEAPONS.cannon20.ttl) aim = point.map((n, i) => n - origin[i]);
        }
        controls.mouseL = !!aim;
        room.send({ type: 'input', seq: ++seq, flight: controls.boatFlightInput({}), seat: controls.boatSeatInput(aim, {}) });
      }
    }
    room.step(1 / 60); await Promise.resolve();
    const live = engine.vehicles.filter(v => v.alive && v.seats[0]);
    report.peakPilots = Math.max(report.peakPilots, live.length);
    for (const v of engine.vehicles) { assert.equal(v.kind, 'speedboat'); assert.equal(v.seats[1], null); }
    if (!ending && engine.matchEndedAt !== null) {
      ending = { time: engine.matchEndedAt, winner: engine.winner, scores: [...engine.teamKills] };
      assert.equal(report.peakPilots, 5); assert(report.fireEvents > 0 && report.hitEvents > 0);
      assert(report.kills.some(e => e.weapon === 'cannon20' && e.killer), 'actual attributed cannon kill');
      assert(Math.max(...ending.scores) >= 5, 'score objective, not a clock-only outcome');
      assert(ends.some(e => e.reason === 'score' && e.winner === ending.winner));
      stage = 'ordinary-intermission'; progress();
    }
    if (ending && engine.matchEndedAt === null) {
      reset = engine.time;
      assert(reset - ending.time >= MATCH_RESTART_DELAY);
      assert.deepEqual(engine.teamKills, [0, 0]); assert.deepEqual(engine.scores, [0, 0]);
      assert.equal(engine.vehicles.length, 0); assert.equal(engine.combat.projectiles.length, 0);
      assert.equal(human.info.vehicleId, null); assert.equal(human.info.deaths, 0); assert.equal(human.info.kills, 0);
      assert.equal(human.queue.length, 0);
      room.send({ type: 'spawn', kind: request.aircraft });
      const fresh = engine.vehicles.find(v => v.id === human.info.vehicleId);
      assert(fresh?.alive && fresh.hp === fresh.maxHp); assert.deepEqual(fresh.flight.velocity, [0, 0, 0]);
      break;
    }
    if (tick % 120 === 0) progress();
    if (tick % 30 === 0) await yieldTurn(); // Let the external resource/deadline guard deliver termination.
  }
  assert(ending && reset !== null, 'real score end and ordinary reset within original simulation limits');
  room.close();
  aircraftRoom = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, bots: 0, listed: false }, 'Fresh aircraft',
    { onMessage() {} }, { manual: true });
  aircraftRoom.send({ type: 'spawn', kind: 'fighter' });
  assert.equal(aircraftRoom.engine.vehicles[0]?.kind, 'fighter');
  assert.equal(aircraftRoom.engine.config.vehicleMode, undefined);
  stage = 'PASS_CPU_NOT_NATIVE';
  console.log(JSON.stringify({ ...report, stage, ending, reset,
    humanLifecycle: report.humanDeaths ? 'observed branches counted above' : 'death/respawn NOT REACHED in this match',
    menuLimit: 'Actual menu item callback; close/fresh ordinary room, not a rendered menu/GameSession',
    grants: false }));
} catch (error) { progress(); throw error; }
finally { room?.close(); aircraftRoom?.close(); loader.dispose(); }
