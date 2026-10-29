// Actual native TS/RoomEngine, with disclosed CPU pose fixtures, not native flight acceptance.
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
const loader = installRetainedHostLoader();
const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
const { killVehicle } = await import(new URL('src/sim/combat.ts', retainedRoot));
const { WEAPONS, VEHICLES } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
const { worldQuery } = await import(new URL('src/sim/geography.ts', retainedRoot));
const dt = 1 / 60;
let groups = 0;
async function check(name, run) { await run(); groups++; console.log(`PASS ${name}`); }
function pose(v, position = [3500, 8, 1200]) {
  Object.assign(v.flight, { position: [...position], velocity: [0, 0, -105],
    orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
    gearDown: false, crashed: null, throttle: .5 });
  v.spawnedAt = -100;
}
function setup({ friendly = false, ordinary = false, hp = 1000, kind = 'warthog' } = {}) {
  const config = createLocalFleetConfig();
  // Keep actual measured geometry and fitting. Only positions/motion/weapons are CPU fixtures.
  Object.assign(config.arena, { minX: 3000, maxX: 4000, minZ: 0, maxZ: 1800, bottomY: -100 });
  for (const u of config.units) Object.assign(u, { position: u.team ? [3500, 0, 1000] : [3800, 0, 1400],
    heading: 0, speed: 0, route: [], weapons: [], hp });
  if (friendly) {
    config.units.push({ ...structuredClone(config.units[1]), id: 'friendly',
      team: 0, capital: false, position: [3500, 0, 1100] });
    config.units[1].position[2] = 900; // Keep the two measured hulls non-overlapping.
  }
  const bridge = ordinary ? null : createRetainedHostBridge({ mode: 'factions', config,
    rosters: config.aircraft.map(a => a.map(p => p.id)) });
  const messages = [], calls = [];
  let nearby = null, nearbyPosition = null;
  const hostBridge = bridge && { ...bridge, beforeStep(host) {
    bridge.beforeStep(host);
    const binding = host.combat.hostFleet, resolve = binding.resolveProjectile;
    // Observe the real current binding after bind(), without replacing fleet implementation.
    binding.resolveProjectile = (...args) => {
      const result = resolve(...args);
      calls.push({ projectile: args[0], from: [...args[1]], to: [...args[2]], max: args[3], damage: args[4], result,
        nearbyPosition: nearby && [...nearby.flight.position] });
      return result;
    };
  } };
  const room = createLoopbackRoom({ teams: 2, bots: 0, timeLimit: 600 }, 'Rocket CPU',
    { onMessage: m => messages.push(m) }, { manual: true, code: 'rocket-cpu', hostBridge });
  // Loopback delivers every connected recipient to one callback. Observe only this viewer.
  for (const key of ['send', 'sendText']) {
    const send = room.engine.hooks[key];
    room.engine.hooks[key] = (id, message) => { if (id === room.playerId) send(id, message); };
  }
  room.send({ type: 'spawn', kind });
  const v = room.engine.vehicles.find(v => v.id === room.engine.players.get(room.playerId).info.vehicleId);
  assert(v); assert.equal(v.seats[0], room.playerId);
  let seq = 0;
  const tick = (fire = false) => {
    if (v.alive) pose(v);
    if (nearby?.alive) pose(nearby, nearbyPosition);
    room.send({ type: 'input', seq: seq++, seat: { aim: [0, 0, -1],
      firePrimary: kind === 'apache' && fire, fireSecondary: kind === 'warthog' && fire } });
    room.step(dt);
  };
  const launch = () => {
    tick(true); tick(true);
    assert.equal(v.weapons[0][kind === 'apache' ? 0 : 1].ammo, 37, 'real applySeatInput spends 38 -> 37');
    const p = room.engine.combat.projectiles.find(p => p.weapon === 'rockets');
    assert(p, 'accepted actual Projectile identity exists');
    assert.equal(p.owner, room.playerId); assert.equal(p.vehicle, v.id);
    return p;
  };
  const addAircraft = (position, team = 1) => {
    const id = room.engine.addPlayer('Nearby CPU aircraft');
    assert.equal(room.engine.players.get(id).info.team, team);
    room.engine.handle(id, { type: 'spawn', kind: 'apache' });
    nearby = room.engine.vehicles.find(v => v.id === room.engine.players.get(id).info.vehicleId);
    assert(nearby); nearbyPosition = position; pose(nearby, position);
    return nearby;
  };
  return { room, bridge, v, calls, messages, tick, launch, addAircraft,
    snapshot: (id = room.playerId) => bridge.snapshot(room.engine, id),
    finish: () => { for (let i = 0; i < 35; i++) tick(); } };
}
const hpOf = (s, id = 'enemy') => s.units.find(u => u.id === id).hp;
const impacts = s => s.events.filter(e => e.type === 'impact');
try {
  for (const kind of ['warthog', 'apache']) await check(`${kind}: one accepted Hydra hits measured FC hull once`, async () => {
    const f = setup({ kind });
    try {
      assert(worldQuery.isWater(3500, 1000)); assert(worldQuery.isWater(3500, 1200));
      const p = f.launch(); f.finish();
      const s = f.snapshot(), hits = f.calls.filter(c => c.result);
      assert.equal(hpOf(s), 904); assert.equal(impacts(s).length, 1);
      assert.equal(s.events.filter(e => e.type === 'damage').length, 1);
      assert.equal(hits.length, 1); assert.equal(hits[0].projectile, p); assert.equal(hits[0].damage, 96);
      assert(!f.room.engine.combat.projectiles.includes(p));
      const { result, from, to, max } = hits[0];
      assert.deepEqual(Object.keys(result).sort(), ['fraction', 'position']);
      assert(result.fraction >= 0 && result.fraction < max && max <= 1);
      assert(result.position.every((n, i) => Number.isFinite(n) && Math.abs(n - from[i] - (to[i] - from[i]) * result.fraction) < 1e-8));
      assert(Object.isFrozen(result)); assert(Object.isFrozen(result.position));
      assert.deepEqual(result.position, impacts(s)[0].position);
      assert.notEqual(result.position, impacts(s)[0].position);
      await new Promise(resolve => queueMicrotask(resolve));
      const events = f.messages.filter(m => m.type === 'events').flatMap(m => m.events);
      assert.equal(events.filter(e => e.type === 'explosion' || e.type === 'crater').length, 0,
        'FC impact must not add duplicate native explosion/water/crater FX');
      assert(!JSON.stringify(events).includes('enemy'), 'no private fleet unit ID in native telemetry');
    } finally { f.room.close(); }
  });
  await check('native aircraft intercepts before fitted hull', () => {
    const f = setup();
    try {
      const target = f.addAircraft([3500, 8, 1120]), hp = target.hp;
      const p = f.launch(); f.finish();
      assert(target.hp < hp); assert.equal(hpOf(f.snapshot()), 1000);
      assert.equal(impacts(f.snapshot()).length, 0); assert(!f.room.engine.combat.projectiles.includes(p));
    } finally { f.room.close(); }
  });
  for (const friendly of [false, true]) await check(`${friendly ? 'friendly' : 'enemy'} fitted hull consumes rocket; native aircraft splash exactly once`, async () => {
    const f = setup({ friendly });
    try {
      // Radius 7.5, center >10m off the ray: no direct sphere interception, within 12m surface splash.
      const target = f.addAircraft([3510, 8, friendly ? 1168 : 1068]), initial = target.hp;
      f.launch(); f.finish();
      const hit = f.calls.find(c => c.result); assert(hit);
      const d = Math.max(0, Math.hypot(...hit.result.position.map((n, i) => n - hit.nearbyPosition[i])) - VEHICLES.apache.radius);
      assert(d > 0 && d < WEAPONS.rockets.splash, `surface distance ${d}; impact ${hit.result.position}; aircraft ${hit.nearbyPosition}`);
      const expected = 60 * (1 - d / 12);
      assert(Math.abs(initial - target.hp - expected) < 1e-8, `one native splash: ${initial - target.hp} vs ${expected}`);
      assert.equal(hpOf(f.snapshot()), friendly ? 1000 : 904);
      if (friendly) assert.equal(hpOf(f.snapshot(), 'friendly'), 1000);
      assert.equal(impacts(f.snapshot()).length, 1);
      assert.equal(f.snapshot().events.filter(e => e.type === 'damage').length, friendly ? 0 : 1);
      await new Promise(resolve => queueMicrotask(resolve));
      const hits = f.messages.filter(m => m.type === 'events').flatMap(m => m.events).filter(e => e.type === 'hit' && e.target === target.id);
      assert.equal(hits.length, 1); assert.equal(hits[0].weapon, 'rockets');
    } finally { f.room.close(); }
  });
  for (const departure of ['death', 'disconnect']) await check(`accepted rocket outlives launcher ${departure}`, () => {
    const f = setup();
    try {
      const p = f.launch(); assert.equal(hpOf(f.snapshot()), 1000);
      let viewer = f.room.playerId;
      if (departure === 'death') assert(killVehicle(f.v, 'crash', null, []));
      else { f.room.engine.removePlayer(viewer); viewer = f.room.engine.addPlayer('New viewer'); }
      for (let i = 0; i < 35; i++) f.room.step(dt);
      const s = f.snapshot(viewer);
      assert.equal(hpOf(s), 904); assert.equal(impacts(s).length, 1);
      assert.equal(s.events.find(e => e.type === 'damage').source, `aircraft_${f.v.id}`);
      assert(!f.room.engine.combat.projectiles.includes(p));
    } finally { f.room.close(); }
  });
  await check('identity, immutable provenance, nearest fractions, pause/outcome and reset reject invalid paths', () => {
    const f = setup({ hp: 96 });
    try {
      const p = f.launch(), cs = f.room.engine.combat;
      const resolve = (...args) => cs.hostFleet.resolveProjectile(...args);
      const from = [3500, 8, 1080], to = [3500, 8, 1000];
      const reject = (q, max = 1) => { assert.equal(resolve(q, from, to, max, 96), false); assert.equal(hpOf(f.snapshot()), 96); };
      reject({ ...p });
      for (const [key, value] of [['owner', 'absent'], ['vehicle', 'absent'], ['team', 1], ['weapon', 'gau8'], ['weapon', 'aim9'], ['weapon', 'bomb'], ['ship', 'native']]) {
        const old = p[key]; p[key] = value; reject(p);
        if (old === undefined) delete p[key]; else p[key] = old;
      }
      reject(p, 0);
      const bow = createLocalFleetConfig().geometry[1].descriptor.collision.island_components
        .filter(box => box.min[1] <= 8 && box.max[1] >= 8).reduce((z, box) => Math.max(z, box.max[2]), -Infinity);
      reject(p, (from[2] - (1000 + bow)) / (from[2] - to[2])); // Exact nonzero native tie wins.
      cs.projectiles.splice(cs.projectiles.indexOf(p), 1); reject(p); cs.projectiles.push(p);
      f.bridge.setPaused(true); reject(p); f.bridge.setPaused(false);
      f.room.engine.matchEndedAt = f.room.engine.time; reject(p); f.room.engine.matchEndedAt = null;
      const hit = resolve(p, from, to, 1, 96); assert(hit);
      assert.equal(hpOf(f.snapshot()), 0);
      assert.equal(resolve(p, from, to, 1, 96), false, 'outcome blocks additional damage');
      const stale = cs.hostFleet.resolveProjectile;
      f.room.engine.resetMatch();
      assert.equal(stale(p, from, to, 1, 96), false, 'obsolete binding');
      const fresh = f.room.engine.combat; fresh.projectiles.push(p);
      assert.equal(fresh.hostFleet.resolveProjectile(p, from, to, 1, 96), false, 'reset clears weak provenance');
      assert.equal(hpOf(f.snapshot()), 96);
    } finally { f.room.close(); }
  });
  await check('ten seconds sustained actual Hydra fire stays within replay bounds', () => {
    const f = setup({ hp: 10000 });
    try {
      for (let i = 0; i < 600; i++) f.tick(true);
      assert(f.v.weapons[0][1].ammo < 38); assert(hpOf(f.snapshot()) < 10000);
      assert.equal(f.snapshot().tick, 200); assert(f.calls.filter(c => c.result).length > 30);
    } finally { f.room.close(); }
  });
  await check('ordinary no-hook native rocket aircraft path unchanged', () => {
    const f = setup({ ordinary: true });
    try {
      assert.equal(f.room.engine.combat.hostFleet, undefined);
      const target = f.addAircraft([3500, 8, 1120]), hp = target.hp;
      const p = f.launch(); f.finish();
      assert(target.hp < hp); assert(!f.room.engine.combat.projectiles.includes(p));
      assert.equal(f.room.engine.combat.hostFleet, undefined);
    } finally { f.room.close(); }
  });
} finally { loader.dispose(); }
console.log(`native-factions-rockets-check: ${groups} actual-source CPU groups PASS; native/GPU unverified; missiles/bombs/AA excluded`);
