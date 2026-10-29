// Actual RoomEngine/applySeatInput bombs. Disclosed CPU poses, not native gameplay acceptance.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compileGeometry, fittedHit, fittedDistance } from './fleet-geometry.mjs';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
const loader = installRetainedHostLoader();
const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
const { killVehicle, stepCombat, shipDamageFor, applySeatInput } = await import(new URL('src/sim/combat.ts', retainedRoot));
const { WEAPONS, VEHICLES } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
const { worldQuery, segmentHitsGround } = await import(new URL('src/sim/geography.ts', retainedRoot));
const { bombImpactPoint, stepBomb } = await import(new URL('src/sim/flight.ts', retainedRoot));
const { withFleetSurface } = await import(new URL('src/sim/fleet-world-query.ts', retainedRoot));
const dt = 1 / 60;
let groups = 0;
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`); }
function pose(v, position, velocity = [0, -40, 0]) {
  Object.assign(v.flight, { position: [...position], velocity: [...velocity], orientation: [0, 0, 0, 1],
    angularVelocity: [0, 0, 0], onGround: false, gearDown: false, crashed: null, throttle: .5 });
  v.spawnedAt = -100;
}
function setup({ friendly = false, ordinary = false, hp = 4000, position = [3500, 100, 1030], velocity = [0, -40, 0] } = {}) {
  const config = createLocalFleetConfig();
  Object.assign(config.arena, { minX: 3000, maxX: 4000, minZ: 0, maxZ: 1800, bottomY: -100 });
  for (const u of config.units) Object.assign(u, { position: u.team ? [3500, 0, 1000] : [3800, 0, 1400],
    heading: 0, speed: 0, route: [], weapons: [], hp });
  if (friendly) {
    config.units.push({ ...structuredClone(config.units[1]), id: 'friendly', team: 0, capital: false });
    config.units[1].position[2] = 800;
  }
  const bridge = ordinary ? null : createRetainedHostBridge({ mode: 'factions', config,
    rosters: config.aircraft.map(a => a.map(p => p.id)) });
  const calls = [], nearCalls = [], messages = [];
  let nearby = null, nearbyPosition = null;
  const hostBridge = bridge && { ...bridge, beforeStep(host) {
    bridge.beforeStep(host);
    const binding = host.combat.hostFleet, resolve = binding.resolveProjectile, near = binding.resolveBombNearMiss;
    binding.resolveBombNearMiss = (...args) => {
      const beforeTargets = binding.botTargets(0), result = near(...args);
      nearCalls.push({ projectile: args[0], age: args[0].age, position: [...args[1]], radius: args[2], damage: args[3], result,
        beforeTargets, afterTargets: binding.botTargets(0), nearbyPosition: nearby && [...nearby.flight.position] });
      return result;
    };
    binding.resolveProjectile = (...args) => {
      const beforeTargets = binding.botTargets(0);
      const result = resolve(...args);
      calls.push({ projectile: args[0], age: args[0].age, from: [...args[1]], to: [...args[2]], max: args[3], damage: args[4], result,
        beforeTargets, afterTargets: result && binding.botTargets(0), nearbyPosition: nearby && [...nearby.flight.position] });
      return result;
    };
  } };
  const room = createLoopbackRoom({ teams: 2, bots: 0, timeLimit: 600 }, 'Bomb CPU',
    { onMessage: m => messages.push(m) }, { manual: true, code: 'bomb-cpu', hostBridge });
  for (const key of ['send', 'sendText']) {
    const send = room.engine.hooks[key];
    room.engine.hooks[key] = (id, message) => { if (id === room.playerId) send(id, message); };
  }
  room.send({ type: 'spawn', kind: 'bomber' });
  const v = room.engine.vehicles.find(v => v.id === room.engine.players.get(room.playerId).info.vehicleId);
  assert(v); assert.equal(v.seats[0], room.playerId);
  let seq = 0;
  const tick = (fire = false) => {
    if (v.alive) pose(v, position, velocity);
    if (nearby?.alive) pose(nearby, nearbyPosition, [0, 0, 0]);
    room.send({ type: 'input', seq: seq++, seat: { aim: [0, -1, 0], firePrimary: fire } });
    room.step(dt);
  };
  const launch = () => {
    tick(true); tick(true);
    assert.equal(v.weapons[0][0].ammo, 7, 'actual B-2 ammo 8 -> 7');
    const p = room.engine.combat.projectiles.find(p => p.weapon === 'bomb');
    assert(p); assert.equal(p.owner, room.playerId); assert.equal(p.vehicle, v.id);
    return p;
  };
  const addAircraft = (position, team = 1) => {
    const id = room.engine.addPlayer('Blast CPU');
    assert.equal(room.engine.players.get(id).info.team, team);
    room.engine.handle(id, { type: 'spawn', kind: 'apache' });
    nearby = room.engine.vehicles.find(v => v.id === room.engine.players.get(id).info.vehicleId);
    nearbyPosition = position; pose(nearby, position, [0, 0, 0]); return nearby;
  };
  return { room, bridge, v, calls, nearCalls, messages, tick, launch, addAircraft,
    snapshot: (id = room.playerId) => bridge.snapshot(room.engine, id),
    finish: () => { for (let i = 0; i < 180; i++) tick(); } };
}
const hpOf = (s, id = 'enemy') => s.units.find(u => u.id === id).hp;
const impacts = s => s.events.filter(e => e.type === 'impact');
try {
  for (const oblique of [false, true]) await check(`accepted B-2 ${oblique ? 'oblique' : 'vertical'} bomb uses native 2700 damage once`, async () => {
    const f = setup(oblique ? { position: [3485, 100, 1180], velocity: [10, -40, -100] } : {});
    try {
      assert.equal(shipDamageFor('bomb'), 2700); assert(worldQuery.isWater(3500, 1030));
      const p = f.launch(); f.finish();
      const hits = f.calls.filter(c => c.result), s = f.snapshot();
      assert.equal(hpOf(s), 1300); assert.equal(impacts(s).length, 1);
      assert.equal(s.events.filter(e => e.type === 'damage').length, 1);
      assert.equal(hits.length, 1); assert.equal(hits[0].projectile, p); assert.equal(hits[0].damage, 2700);
      assert.equal(f.nearCalls.length, 0, 'fitted direct hit never invokes near-miss callback');
      assert.equal(f.room.engine.combat.hostFleet.resolveBombNearMiss(p, hits[0].result.position, 45, 1350), false);
      assert(!f.room.engine.combat.projectiles.includes(p)); assert.equal(p.age, -1);
      const { result, from, to, max } = hits[0];
      assert(result.fraction >= 0 && result.fraction < max);
      assert(result.position.every((n, i) => Math.abs(n - from[i] - (to[i] - from[i]) * result.fraction) < 1e-8));
      assert(Object.isFrozen(result)); assert(Object.isFrozen(result.position));
      assert.deepEqual(result.position, impacts(s)[0].position);
      await new Promise(resolve => queueMicrotask(resolve));
      const events = f.messages.filter(m => m.type === 'events').flatMap(m => m.events);
      assert.equal(events.filter(e => e.type === 'explosion' || e.type === 'crater').length, 0);
    } finally { f.room.close(); }
  });
  await check('native water near fitted hull uses analytic component distance once and keeps aircraft/FX policy', () => {
    const f = setup({ position: [3528, 100, 1030], hp: 500 });
    try {
      const target = f.addAircraft([3545, 10, 1030]), initial = target.hp;
      const p = f.launch(), cs = f.room.engine.combat, events = [];
      for (let i = 0; i < 180 && cs.projectiles.includes(p); i++) {
        pose(target, [3545, 10, 1030], [0, 0, 0]);
        stepCombat(cs, [target], dt, f.room.engine.time + i * dt, events);
      }
      assert.equal(f.calls.filter(c => c.result).length, 0, 'no direct fitted damage');
      assert.equal(f.nearCalls.length, 1);
      const hit = f.nearCalls[0], g = compileGeometry(createLocalFleetConfig().geometry[1].descriptor);
      const d = fittedDistance(g, hit.position, [3500, 0, 1000], 0);
      assert(d > 0 && d < 45); assert.equal(hit.radius, 45); assert.equal(hit.damage, 1350);
      assert.equal(hit.result, 1); assert.equal(hpOf(f.snapshot()), Math.max(0, 500 - 1350 * (1 - d / 45)));
      assert.equal(impacts(f.snapshot()).length, 1);
      const aircraftDistance = Math.max(0, Math.hypot(...hit.position.map((n, i) => n - target.flight.position[i])) - VEHICLES.apache.radius);
      assert(aircraftDistance < 27);
      assert(Math.abs(initial - target.hp - Math.min(initial, 900 * (1 - aircraftDistance / 27))) < 1e-8);
      assert.equal(events.filter(e => e.type === 'hit' && e.target === target.id).length, 1);
      assert.equal(events.filter(e => e.type === 'explosion' && e.surface === 'water').length, 1);
      assert.equal(events.filter(e => e.type === 'crater').length, 0);
      assert(hit.beforeTargets.some(t => t.id === 'enemy')); assert(!hit.afterTargets.some(t => t.id === 'enemy'));
      p.age = 1; cs.projectiles.push(p);
      assert.equal(cs.hostFleet.resolveBombNearMiss(p, hit.position, 45, 1350), false, 'spent impact rejects replay');
      assert.equal(cs.hostFleet.resolveProjectile(p, [3500, 100, 1030], [3500, 0, 1030], 1, 2700), false);
    } finally { f.room.close(); }
  });
  await check('accepted B-2 first-step water near-miss authenticates and blasts at the same age (CPU pose fixture)', () => {
    const f = setup();
    try {
      f.tick(); // Bind the real room before the test-only low pose, not normal flight.
      pose(f.v, [3528, 3.1, 1030], [0, -40, 0]);
      const cs = f.room.engine.combat, now = f.room.engine.time, events = [];
      assert.equal(f.v.weapons[0][0].ammo, 8); assert.equal(cs.projectiles.length, 0);
      applySeatInput(cs, f.v, 0, { firePrimary: true, aim: [0, -1, 0] }, [f.v], now, events);
      assert.equal(f.v.weapons[0][0].ammo, 7, 'native fireBomb accepted ammo 8 -> 7');
      assert.equal(events.filter(e => e.type === 'fire' && e.weapon === 'bomb').length, 1);
      assert.equal(cs.projectiles.length, 1);
      const p = cs.projectiles[0];
      assert.equal(p.weapon, 'bomb'); assert.equal(p.owner, f.room.playerId); assert.equal(p.vehicle, f.v.id);
      assert.equal(p.age, 0); assert(p.position[1] > 0 && p.position[1] < .11);
      assert.equal(f.calls.length, 0); assert.equal(f.nearCalls.length, 0);
      stepCombat(cs, [], dt, now, events);
      assert.equal(f.calls.length, 1, 'first and terminal resolve segment');
      assert.equal(f.nearCalls.length, 1);
      const segment = f.calls[0], hit = f.nearCalls[0];
      assert.equal(segment.projectile, p); assert.equal(segment.result, false, 'no direct fitted hit');
      assert(segment.from[1] > 0 && segment.to[1] < 0);
      assert.equal(segment.age, dt); assert.equal(hit.age, segment.age, 'same-age authentication permits native blast');
      assert.equal(hit.projectile, p);
      assert(hit.position.every((n, i) => Math.abs(n - [3528, 0, 1030][i]) < 1e-6), 'native water contact near [3528, 0, 1030]');
      assert(worldQuery.isWater(hit.position[0], hit.position[2]));
      const g = compileGeometry(createLocalFleetConfig().geometry[1].descriptor);
      const gap = fittedDistance(g, hit.position, [3500, 0, 1000], 0);
      assert(gap > 0 && gap < hit.radius, 'positive fitted gap within native splash radius');
      assert.equal(hit.radius, WEAPONS.bomb.splash); assert.equal(hit.damage, 1350); assert.equal(hit.result, 1);
      const expected = 4000 - hit.damage * (1 - gap / hit.radius);
      assert(expected > 0 && expected < 4000); assert.equal(hpOf(f.snapshot()), expected);
      assert.equal(impacts(f.snapshot()).length, 1);
      assert.equal(f.snapshot().events.filter(e => e.type === 'damage').length, 1);
      assert.equal(events.filter(e => e.type === 'explosion' && e.surface === 'water').length, 1);
      assert.equal(events.filter(e => e.type === 'crater' || e.type === 'ship-hit').length, 0);
      assert(!cs.projectiles.includes(p)); assert.equal(p.age, -1);
      stepCombat(cs, [], dt, now + dt, events);
      assert.equal(hpOf(f.snapshot()), expected); assert.equal(f.nearCalls.length, 1);
      assert.equal(impacts(f.snapshot()).length, 1);
      assert.equal(events.filter(e => e.type === 'explosion').length, 1, 'native FX exactly once');
    } finally { f.room.close(); }
  });
  await check('near-miss provenance, first-blast authentication, pause, expiry, round and friendly guards', () => {
    const f = setup({ friendly: true });
    try {
      const p = f.launch(); f.tick();
      const cs = f.room.engine.combat, near = cs.hostFleet.resolveBombNearMiss;
      const blast = q => near(q, [3528, 0, 1030], 45, 1350);
      assert.equal(blast({ ...p }), false);
      for (const [key, value] of [['owner', 'absent'], ['vehicle', 'absent'], ['team', 1], ['weapon', 'rockets'], ['ship', 'native'], ['age', -1], ['age', p.ttl + 1]]) {
        const old = p[key]; p[key] = value; assert.equal(blast(p), false);
        if (old === undefined) delete p[key]; else p[key] = old;
      }
      const copy = { ...p }; cs.projectiles.push(copy);
      assert.equal(blast(copy), false, 'blast cannot first authenticate actual array member');
      cs.hostFleet.resolveProjectile(copy, copy.position, copy.position, 0, 2700);
      f.bridge.setPaused(true); assert.equal(blast(p), false); f.bridge.setPaused(false);
      const ended = f.room.engine.matchEndedAt; f.room.engine.matchEndedAt = 1;
      assert.equal(blast(p), false); f.room.engine.matchEndedAt = ended;
      assert.equal(blast(p), 0, 'friendly fitted hull excluded');
      assert.equal(blast(p), false, 'zero-hit callback is spent too');
      assert.equal(hpOf(f.snapshot(), 'friendly'), 4000);
      f.room.engine.resetMatch(); assert.equal(blast(p), false);
      f.room.engine.combat.projectiles.push(p);
      assert.equal(f.room.engine.combat.hostFleet.resolveBombNearMiss(p, [3528, 0, 1030], 45, 1350), false);
    } finally { f.room.close(); }
  });
  for (const departure of ['death', 'disconnect']) await check(`authenticated near-miss survives launcher ${departure}`, () => {
    const f = setup({ position: [3528, 100, 1030] });
    try {
      f.launch(); let viewer = f.room.playerId;
      if (departure === 'death') assert(killVehicle(f.v, 'crash', null, []));
      else { f.room.engine.removePlayer(viewer); viewer = f.room.engine.addPlayer('Viewer'); }
      for (let i = 0; i < 180; i++) f.room.step(dt);
      const s = f.snapshot(viewer); assert(hpOf(s) < 4000); assert.equal(impacts(s).length, 1);
      assert.equal(f.calls.filter(c => c.result).length, 0); assert.equal(f.nearCalls.length, 1);
      const d = fittedDistance(compileGeometry(createLocalFleetConfig().geometry[1].descriptor), f.nearCalls[0].position, [3500, 0, 1000], 0);
      assert(Math.abs(4000 - hpOf(s) - 1350 * (1 - d / 45)) < 1e-8);
    } finally { f.room.close(); }
  });
  await check('native spawn protection and first-segment live occupied owner/team/roster guards', () => {
    const f = setup();
    try {
      f.tick();
      const cs = f.room.engine.combat, now = f.room.engine.time;
      const input = { firePrimary: true, aim: [0, -1, 0] };
      f.v.spawnedAt = now;
      applySeatInput(cs, f.v, 0, input, [f.v], now, []);
      assert.equal(f.v.weapons[0][0].ammo, 8); assert.equal(cs.projectiles.length, 0);
      f.v.spawnedAt = -100;
      applySeatInput(cs, f.v, 0, input, [f.v], now, []);
      const p = cs.projectiles.find(p => p.weapon === 'bomb'); assert(p);
      assert.equal(f.v.weapons[0][0].ammo, 7);
      const player = f.room.engine.players.get(f.room.playerId).info;
      for (const [object, key, value] of [
        [f.v, 'alive', false], [player, 'team', 1], [f.v, 'team', 1],
        [player, 'vehicleId', null], [f.v.seats, 0, null], [f.v, 'kind', 'unsupported'],
      ]) {
        const old = object[key]; object[key] = value;
        assert.equal(cs.hostFleet.resolveProjectile(p, p.position, p.position, 1, 2700), false);
        object[key] = old;
      }
      f.finish();
      assert.equal(hpOf(f.snapshot()), 1300); assert.equal(f.calls.filter(c => c.result).length, 1);
    } finally { f.room.close(); }
  });
  await check('production 1000 HP takes native 2700 hit; same-binding target cache clears on kill', () => {
    const f = setup({ hp: 1000 });
    try {
      f.launch(); f.finish();
      const hits = f.calls.filter(c => c.result), s = f.snapshot();
      assert.equal(hits.length, 1); assert.equal(hits[0].damage, 2700);
      assert.equal(hpOf(s), 0); assert.equal(s.units.find(u => u.id === 'enemy').alive, false);
      assert.equal(impacts(s).length, 1); assert.equal(s.events.filter(e => e.type === 'damage').length, 1);
      assert(hits[0].beforeTargets.some(t => t.id === 'enemy'));
      assert(!hits[0].afterTargets.some(t => t.id === 'enemy'));
      assert(Object.isFrozen(hits[0].beforeTargets));
      assert(hits[0].beforeTargets.some(t => t.id === 'enemy'), 'old immutable contact DTO stays unchanged');
    } finally { f.room.close(); }
  });
  for (const friendly of [false, true]) await check(`${friendly ? 'friendly' : 'enemy'} hull consumes bomb; actual native aircraft blast once`, async () => {
    const f = setup({ friendly });
    try {
      const target = f.addAircraft([3535, 20, 1030]), initial = target.hp;
      f.launch(); f.finish();
      const hit = f.calls.find(c => c.result); assert(hit);
      const d = Math.max(0, Math.hypot(...hit.result.position.map((n, i) => n - hit.nearbyPosition[i])) - VEHICLES.apache.radius);
      assert(d > 0 && d < WEAPONS.bomb.splash);
      const expected = 900 * (1 - d / 45);
      assert(Math.abs(initial - target.hp - expected) < 1e-8, `${initial - target.hp} vs ${expected}`);
      assert.equal(hpOf(f.snapshot()), friendly ? 4000 : 1300);
      if (friendly) assert.equal(hpOf(f.snapshot(), 'friendly'), 4000);
      assert.equal(impacts(f.snapshot()).length, 1);
      await new Promise(resolve => queueMicrotask(resolve));
      const events = f.messages.filter(m => m.type === 'events').flatMap(m => m.events);
      assert.equal(events.filter(e => e.type === 'hit' && e.target === target.id).length, 1);
    } finally { f.room.close(); }
  });
  for (const departure of ['death', 'disconnect']) await check(`empty first bomb segments authenticate before launcher ${departure}`, () => {
    const f = setup();
    try {
      const p = f.launch(); assert(f.calls.some(c => c.projectile === p && !c.result));
      let viewer = f.room.playerId;
      if (departure === 'death') assert(killVehicle(f.v, 'crash', null, []));
      else { f.room.engine.removePlayer(viewer); viewer = f.room.engine.addPlayer('Viewer'); }
      for (let i = 0; i < 180; i++) f.room.step(dt);
      const s = f.snapshot(viewer); assert.equal(hpOf(s), 1300);
      assert.equal(impacts(s).length, 1); assert.equal(s.events.find(e => e.type === 'damage').source, `aircraft_${f.v.id}`);
    } finally { f.room.close(); }
  });
  await check('copies/mutated provenance, strict native tie, pause and stale reset reject', () => {
    const f = setup();
    try {
      const p = f.launch(), cs = f.room.engine.combat;
      const from = [3500, 100, 1030], to = [3500, 0, 1030];
      const resolve = (...args) => cs.hostFleet.resolveProjectile(...args);
      const reject = (q, max = 1) => { assert.equal(resolve(q, from, to, max, 2700), false); assert.equal(hpOf(f.snapshot()), 4000); };
      reject({ ...p });
      for (const [key, value] of [['owner', 'absent'], ['vehicle', 'absent'], ['team', 1], ['weapon', 'rockets'], ['ship', 'native']]) {
        const old = p[key]; p[key] = value; reject(p); if (old === undefined) delete p[key]; else p[key] = old;
      }
      reject(p, 0);
      const height = cs.hostFleet.surfaceHeightAt(3500, 1030); assert(height > 0);
      reject(p, (100 - height) / 100); // Native ground/deck exactly ties fitted hull.
      cs.projectiles.splice(cs.projectiles.indexOf(p), 1); reject(p); cs.projectiles.push(p);
      f.bridge.setPaused(true); reject(p); f.bridge.setPaused(false);
      const stale = cs.hostFleet.resolveProjectile;
      f.room.engine.resetMatch();
      assert.equal(stale(p, from, to, 1, 2700), false);
      const fresh = f.room.engine.combat; fresh.projectiles.push(p);
      assert.equal(fresh.hostFleet.resolveProjectile(p, from, to, 1, 2700), false);
    } finally { f.room.close(); }
  });
  await check('fitted island gaps and actual native ground before hull reject accepted bomb', () => {
    const f = setup();
    try {
      const p = f.launch(), cs = f.room.engine.combat;
      const descriptor = createLocalFleetConfig().geometry[1].descriptor, g = compileGeometry(descriptor);
      let gap = null;
      const y = descriptor.collision.deck.max[1] + 2;
      for (let z = g.clearance.min[2]; z < g.clearance.max[2] && !gap; z += .5) {
        const a = [3450, y, 1000 + z], b = [3550, y, 1000 + z];
        if (fittedHit(g, a, b, [3500, 0, 1000], 0) === null) gap = [a, b];
      }
      assert(gap, 'measured island gap above deck');
      assert.equal(cs.hostFleet.resolveProjectile(p, ...gap, 1, 2700), false);
      const from = [3450, -1, 1030], to = [3500, 4, 1030];
      const ground = segmentHitsGround(from, to);
      assert.equal(ground, 0); assert(fittedHit(g, from, to, [3500, 0, 1000], 0) > ground);
      assert.equal(cs.hostFleet.resolveProjectile(p, from, to, ground, 2700), false);
      assert.equal(hpOf(f.snapshot()), 4000);
    } finally { f.room.close(); }
  });
  await check('actual native steering uses bound measured hull ray without damage; absent callback keeps legacy', () => {
    const f = setup();
    try {
      const p = f.launch(), cs = f.room.engine.combat, now = f.room.engine.time;
      const input = { steerBomb: true, aim: [.01, -1, 0] };
      const binding = cs.hostFleet, measured = binding.surfaceSegment;
      assert.equal(typeof measured, 'function', 'actual bridge must bind the measured authority query');
      delete binding.surfaceSegment;
      applySeatInput(cs, f.v, 0, input, [f.v], now, []);
      const legacy = [...p.steerTo], calls = f.calls.length;
      const origin = [...p.position];
      let rayCall;
      binding.surfaceSegment = (a, b) => { const t = measured(a, b); rayCall = { a: [...a], b: [...b], t }; return t; };
      applySeatInput(cs, f.v, 0, input, [f.v], now, []);
      assert(rayCall.t > 0 && rayCall.t < 1);
      assert.deepEqual(p.steerTo, rayCall.a.map((n, i) => n + (rayCall.b[i] - n) * rayCall.t));
      assert(p.steerTo[1] > legacy[1], 'real fitted hull, not native water, receives steering aim');
      assert.equal(f.calls.length, calls, 'read-only steering does not invoke damage resolution');
      const ray = .001; // Separate earlier-hit API fixture; the actual measured binding is verified above.
      cs.hostFleet.surfaceSegment = (a, b) => { assert.deepEqual(a, origin); assert(b[1] < a[1]); return ray; };
      applySeatInput(cs, f.v, 0, input, [f.v], now, []);
      assert(p.steerTo[1] > legacy[1]); assert.equal(f.calls.length, calls);
      assert.equal(hpOf(f.snapshot()), 4000);
      delete cs.hostFleet.surfaceSegment;
      applySeatInput(cs, f.v, 0, input, [f.v], now, []);
      assert.deepEqual(p.steerTo, legacy);
      const predicted = [0, 0, 0], basePredicted = [0, 0, 0];
      const tf = bombImpactPoint(p.position, p.velocity, predicted, withFleetSurface(worldQuery, cs.hostFleet.surfaceHeightAt));
      const baseTf = bombImpactPoint(p.position, p.velocity, basePredicted, worldQuery);
      assert(tf > .2 && tf < baseTf, 'actual fitted surface shortens native drag prediction');
      const expectedPosition = [...p.position], expectedVelocity = [...p.velocity];
      let ax = (p.steerTo[0] - predicted[0]) / tf / .5, az = (p.steerTo[2] - predicted[2]) / tf / .5;
      const a = Math.hypot(ax, az), cap = Math.min(25, 15 / dt);
      if (a > cap) { ax *= cap / a; az *= cap / a; }
      expectedVelocity[0] += ax * dt; expectedVelocity[2] += az * dt;
      stepBomb(expectedPosition, expectedVelocity, dt);
      stepCombat(cs, [], dt, now, []);
      assert.deepEqual(p.position, expectedPosition); assert.deepEqual(p.velocity, expectedVelocity);
      assert(p.steerDv >= 0 && p.steerDv <= 15);
    } finally { f.room.close(); }
  });
  await check('accepted expired bomb never queries or damages hull', () => {
    const f = setup();
    try {
      const p = f.launch(), count = f.calls.length; p.age = p.ttl;
      f.tick(); assert(!f.room.engine.combat.projectiles.includes(p));
      assert.equal(f.calls.length, count); assert.equal(hpOf(f.snapshot()), 4000);
    } finally { f.room.close(); }
  });
  for (const [name, position, surface] of [
    ['water', [3700, 100, 1030], 'water'],
    ['terrain crater', [-1000, 140, 700], 'ground'],
    ['legacy carrier direct', [0, 100, -2940], 'ground'],
    ['legacy carrier near-miss', [0, 100, -2880], 'water'],
  ]) await check(`no-hook and real-hook misses retain identical native ${name}`, () => {
    const outcomes = [];
    for (const ordinary of [true, false]) {
      const f = setup({ ordinary, position });
      try {
        const p = f.launch(), events = [], cs = f.room.engine.combat;
        for (let i = 0; i < 180 && cs.projectiles.includes(p); i++) stepCombat(cs, [], dt, f.room.engine.time + i * dt, events);
        assert(!cs.projectiles.includes(p));
        assert.equal(events.filter(e => e.type === 'explosion' && e.surface === surface).length, 1);
        if (name === 'terrain crater') assert.equal(events.filter(e => e.type === 'crater').length, 1);
        if (name.startsWith('legacy carrier')) assert(events.some(e => e.type === 'ship-hit'), 'legacy ship damage remains');
        if (name === 'legacy carrier direct') assert.equal(f.nearCalls.length, 0, 'native direct ship skips near-miss callback');
        outcomes.push({ events, ships: cs.ships, craters: cs.craters });
        if (!ordinary) assert.equal(hpOf(f.snapshot()), 4000);
      } finally { f.room.close(); }
    }
    assert.deepEqual(outcomes[0], outcomes[1]);
  });
} finally { loader.dispose(); }
assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools');
const three = resolve(process.env.THREE_ROOT), manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
const { build } = await import(pathToFileURL(resolve(process.env.ESBUILD_ROOT, 'lib/main.js')));
const aliases = { name: 'approved-three', setup(api) {
  api.onResolve({ filter: /^three(?:\/.*)?$/ }, args => {
    const key = args.path === 'three' ? '.' : `.${args.path.slice(5)}`;
    let target = manifest.exports[key];
    if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
      if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
    if (typeof target === 'object') target = target.import;
    return { path: resolve(three, target) };
  });
} };
const compiled = await build({ bundle: true, write: false, outdir: 'in-memory-bomb-check', format: 'esm', minify: true,
  legalComments: 'none', platform: 'browser', entryPoints: [fileURLToPath(new URL('src/main.ts', retainedRoot))],
  define: { 'import.meta.env.BASE_URL': '"./"', 'import.meta.env.DEV': 'false' }, plugins: [aliases] });
assert(compiled.outputFiles[0].contents.length > 0);
console.log(`PASS actual main.ts write:false compile (${compiled.outputFiles[0].contents.length} bytes)`);
console.log(`native-factions-bombs-check: ${groups} actual-source CPU groups PASS; native pixels/natural bombing/bot bombing unverified; fitted near-miss CPU fixtures only; measured steering binding exercised`);
