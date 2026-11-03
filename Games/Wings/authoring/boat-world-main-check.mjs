// Current-source CPU checks, not native controls, rendered contact or audio proof.
// Add --combat for the parent-serialized ordinary AI combat/score/reset observation.
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
assert(process.argv.slice(2).every(arg => arg === '--combat'));
const loader = installRetainedHostLoader();
let room;
try {
  const load = path => import(new URL(`src/${path}.ts`, retainedRoot));
  const { boatCollisionWorld } = await load('sim/boat-world');
  const { createBoatState } = await load('sim/boat-native');
  const { NEUTRAL_INPUT, stepFlight } = await load('sim/flight');
  const { EngineVoice } = await load('audio/engines');
  const { sanitizeConfig } = await load('sim/room-engine');
  const bounded = sanitizeConfig({ vehicleMode: 'boats', teams: 4, bots: 99, maxPerTeam: 99, botFill: 99 });
  assert.equal(bounded.teams, 2); assert.equal(bounded.bots, 3);
  assert.equal(bounded.maxPerTeam, 4); assert.equal(bounded.botFill, 3);
  assert.equal(sanitizeConfig({ teams: 4 }).teams, 4, 'ordinary four-team config stays unchanged');
  const sea = { groundHeight: () => 0, seabedHeight: () => -10, isWater: () => true,
    onRunway: () => false, half: 1000, ceiling: 1000 };
  const vessel = (id, z, yaw) => ({ id, kind: 'speedboat', alive: true,
    flight: { ...createBoatState({ position: [0, 0, z], yaw }, sea), kind: 'speedboat' } });
  const a = vessel('a', 14, 0), b = vessel('b', -14, Math.PI), boats = [a, b];
  const drive = { ...NEUTRAL_INPUT, throttle: 1 };
  assert.equal(boatCollisionWorld(sea, [a], 'a'), sea, 'self is not an obstacle');
  for (let i = 0; i < 240; i++) {
    for (const boat of boats) stepFlight(boat.flight, drive, 1 / 60, boatCollisionWorld(sea, boats, boat.id));
    assert(a.flight.position[2] - b.flight.position[2] >= 10, 'head-on hulls must not overlap/tunnel');
  }
  assert(a.flight.position[2] < 14 && b.flight.position[2] > -14, 'normal throttle advances before contact');
  assert(Math.hypot(...a.flight.velocity) < 0.2 && Math.hypot(...b.flight.velocity) < 0.2);
  b.alive = false;
  assert(boatCollisionWorld(sea, boats, 'a').segmentHitsBoatSolid(b.flight.position, b.flight.position), 'wreck stays solid');
  assert.equal(boatCollisionWorld(sea, [a], 'a'), sea, 'removed wreck frees the shared world');
  assert.throws(() => new EngineVoice(null, 'boat', 'speedboat', a), /Boat motor audio is not ported/,
    'no jet/rotor or AudioContext fallback for an unported motor');
  console.log('PASS shared CPU world: head-on movement/contact, self exclusion, retained wreck/removal and explicit no-jet-audio boundary.');
  if (process.argv.includes('--combat')) {
    const { createLoopbackRoom } = await load('sim/loopback');
    const { DEFAULT_ROOM_CONFIG } = await load('sim/protocol');
    const { MATCH_RESTART_DELAY } = await load('sim/room-engine');
    room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, vehicleMode: 'boats', bots: 1,
      maxPerTeam: 3, scoreLimit: 1, timeLimit: 60, listed: false }, 'CPU observer', { onMessage() {} }, { manual: true });
    let damage = false, projectiles = false, moving = false, pilots = 0;
    for (let tick = 0; tick < 60 * 60 && room.engine.matchEndedAt === null; tick++) {
      room.step(1 / 60);
      const list = room.engine.vehicles;
      pilots = Math.max(pilots, list.filter(v => v.alive && v.seats[0]).length);
      for (const v of list) {
        assert.equal(v.kind, 'speedboat'); assert.equal(v.seats[1], null);
        assert(v.flight.position.every(Number.isFinite));
        damage ||= v.hp < v.maxHp;
        moving ||= Math.hypot(...v.flight.velocity) > 0.5;
      }
      projectiles ||= room.engine.combat.projectiles.length > 0;
    }
    assert.equal(pilots, 2, 'two ordinary AI pilots, no gunner or actor grants');
    assert(moving && damage && projectiles, 'actual ordinary AI must move, fire and deal damage');
    assert.notEqual(room.engine.matchEndedAt, null);
    assert(Math.max(...room.engine.teamKills) >= 1, 'real combat kill, not a clock-only outcome');
    const ended = room.engine.time, scores = [...room.engine.teamKills];
    for (let i = 0; i < Math.ceil((MATCH_RESTART_DELAY + 1) * 60); i++) room.step(1 / 60);
    assert.equal(room.engine.matchEndedAt, null);
    assert.deepEqual(room.engine.teamKills, [0, 0]);
    console.log(JSON.stringify({ pilots, moving, damage, projectiles, ended, scores, reset: room.engine.time }));
    console.log('PASS current-main two-pilot AI CPU combat/score/ordinary reset. This is not the historical combined 12-case suite.');
  }
} finally { room?.close(); loader.dispose(); }
