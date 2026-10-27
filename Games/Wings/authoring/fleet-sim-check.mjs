// Original CPU fixtures for the standalone FC authority, not served/native gameplay.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileGeometry, fittedHit } from './fleet-geometry.mjs';
import { createFleet, replayFleet, LIMITS } from './fleet-sim.mjs';
const clone = x => JSON.parse(JSON.stringify(x));
const gun = (id = 'gun') => ({ id, medium: 'surface', range: 1000, speed: 200,
  ttlMs: 10000, cooldownMs: 500, damage: 10, depths: ['surfaced'], ammo: 100 });
const uw = () => ({ id: 'uw', medium: 'underwater', range: 1000, speed: 100,
  ttlMs: 20000, cooldownMs: 6000, damage: 15, depths: ['deep', 'shallow', 'surfaced'], ammo: 2 });
function unit(id, team, position, overrides = {}) {
  return { id, team, kind: 'surface', capital: false, position, half: [12, 5, 12], hp: 60,
    speed: 0, route: [], weapons: [], sensor: null, depth: 'surfaced', depthPlan: [], ...overrides };
}
function fixture(subs = false) {
  const units = [unit('aCapital', 0, [-250, 0, 150], { capital: true }),
    unit('aEscort', 0, [-200, 0, 0], { weapons: [gun()] }),
    unit('bCapital', 1, [250, 0, 150], { capital: true }),
    unit('bEscort', 1, [200, 0, 0], { weapons: [gun()] })];
  if (subs) {
    for (const t of [0, 1]) {
      const escort = units.find(u => u.id === (t ? 'bEscort' : 'aEscort'));
      escort.sensor = { enabled: true, range: 1000, depths: ['surfaced', 'shallow', 'deep'] };
      escort.weapons.push(uw());
      units.push(unit(t ? 'bSub' : 'aSub', t, [t ? 200 : -200, 0, -200], {
        kind: 'sub', depth: 'deep', hp: 40, weapons: [uw()],
        sensor: { enabled: true, range: 1000, depths: ['surfaced', 'shallow', 'deep'] } }));
    }
  }
  return { mode: 'factions', arena: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000,
    bottomY: -100, cell: 20, obstacles: [] }, units,
    aircraft: [[{ id: 'planeA', weapons: [gun('airGun')] }], [{ id: 'planeB', weapons: [gun('airGun')] }]],
    matchMs: 600000, intermissionMs: 15000 };
}
function run(f, ms, parts = [50]) {
  const observed = new Map(); let remaining = ms, i = 0;
  while (remaining) {
    const step = Math.min(remaining, parts[i++ % parts.length]); f.advance(step); remaining -= step;
    for (const e of f.snapshot(0).events) observed.set(e.id, e);
    for (const e of f.snapshot(1).events) observed.set(e.id, e);
  }
  return [...observed.values()];
}
const own = (f, team, id) => f.snapshot(team).units.find(u => u.id === id);
let groups = 0;
function check(name, body) { body(); groups++; console.log(`PASS ${name}`); }

check('real reciprocal surface fire, HP loss, exactly-once sinks and finite event IDs', () => {
  const f = createFleet(fixture()); const events = run(f, 12000);
  for (const [team, id] of [[0, 'aEscort'], [1, 'bEscort']]) {
    assert.equal(own(f, team, id).hp, 0); assert.equal(own(f, team, id).alive, false);
    assert(events.some(e => e.type === 'fire' && e.source === id));
    assert(events.some(e => e.type === 'damage' && e.unit === id));
    assert.equal(events.filter(e => e.type === 'sunk' && e.unit === id).length, 1);
  }
  assert.equal(new Set(events.map(e => e.id)).size, events.length);
  assert(f.snapshot(0).metrics.maxShells <= LIMITS.shells);
});

check('defense priority over nearer passive target', () => {
  const c = fixture(); c.units.push(unit('bDecoy', 1, [-70, 0, -80]));
  const f = createFleet(c); f.advance(500);
  const p = f.snapshot(0).projectiles.find(p => p.source === 'aEscort');
  assert(p); assert(p.velocity[0] > 0); assert.equal(p.velocity[2], 0);
});

check('Factions-only strict ownership, team/boarding/seat/bot-shaped forged control rejection', () => {
  assert.throws(() => createFleet({ ...fixture(), mode: 'solo' }));
  const f = createFleet(fixture()); f.addPlayer('alice', 0); f.addPlayer('bob', 1); f.addPlayer('ally', 0);
  for (const request of [{ type: 'spawn', kind: 'aCapital' }, { type: 'spawn', kind: 'planeB' },
    { type: 'board', aircraft: 'aCapital', seat: 0 }, { type: 'man-turret', ship: 'aCapital' },
    { type: 'control', unit: 'aEscort' }, { type: 'team', team: 2 }, { type: 'spawn', kind: 'planeA', team: 1 },
    { type: 'spawn', kind: '__proto__' }]) assert.equal(f.request('alice', request).ok, false);
  assert.equal(f.request('unknown', { type: 'spawn', kind: 'planeA' }).ok, false);
  assert(f.request('alice', { type: 'spawn', kind: 'planeA' }).ok);
  assert(f.request('bob', { type: 'spawn', kind: 'planeB' }).ok);
  assert.equal(f.request('alice', { type: 'board', aircraft: 'aircraft_bob', seat: 1 }).ok, false);
  assert(f.request('ally', { type: 'board', aircraft: 'aircraft_alice', seat: 1 }).ok);
  assert(f.request('alice', { type: 'switch-seat', seat: 0 }).ok); // no accidental airframe deletion
  assert.equal(f.snapshot(0).aircraft.length, 1);
  assert(f.request('alice', { type: 'team', team: 1 }).ok);
  assert.equal(f.snapshot(0).aircraft.length, 0);
  assert.equal(f.snapshot(0).players.find(p => p.id === 'ally').aircraft, null);
  assert.equal(f.request('alice', { type: 'spawn', kind: 'planeA' }).ok, false);
  assert(f.request('alice', { type: 'spawn', kind: 'planeB' }).ok);
});

check('player attacks share projectile/damage path; friendly hull blocks without damage', () => {
  const c = fixture(); c.units.forEach(u => { u.weapons = []; });
  const f = createFleet(c); f.addPlayer('alice', 0); f.request('alice', { type: 'spawn', kind: 'planeA' });
  assert(f.launchAircraftAttack('alice', { aircraft: 'aircraft_alice', weapon: 'airGun', origin: [100, 0, 0], aim: [200, 0, 0] }));
  run(f, 600); assert.equal(own(f, 1, 'bEscort').hp, 50);
  assert(f.snapshot(1).events.some(e => e.type === 'damage' && e.source === 'aircraft_alice'));
  assert.throws(() => f.launchAircraftAttack('alice', { aircraft: 'aEscort', weapon: 'airGun', origin: [0, 0, 0], aim: [200, 0, 0] }));
  const c2 = clone(c); c2.units.push(unit('aBlocker', 0, [0, 0, 0]));
  const ff = createFleet(c2); ff.addPlayer('alice', 0); ff.request('alice', { type: 'spawn', kind: 'planeA' });
  ff.launchAircraftAttack('alice', { aircraft: 'aircraft_alice', weapon: 'airGun', origin: [-100, 0, 0], aim: [200, 0, 0] });
  run(ff, 2000); assert.equal(own(ff, 0, 'aBlocker').hp, 60); assert.equal(own(ff, 1, 'bEscort').hp, 60);
});

check('submarine detection, uncertainty aging/expiry, lose/reacquire, continuous depth', () => {
  const c = fixture(true);
  c.units.forEach(u => { u.weapons.forEach(w => {
    w.damage = 0.01;
    if (w.medium === 'underwater') w.depths = ['shallow', 'deep'];
  }); });
  // No alternate surfaced underwater target: all UW fire now requires a valid sub contact.
  // Explicit finite observation blackout; no omniscient fallback while sensors are disabled.
  c.units.forEach(u => { if (u.sensor) u.sensorPlan = [{ atMs: 1000, enabled: false }, { atMs: 20000, enabled: true }]; });
  for (const u of c.units.filter(u => u.kind === 'sub')) u.depthPlan = [
    { atMs: 1000, depth: 'shallow' }, { atMs: 20000, depth: 'deep' }];
  const f = createFleet(c); assert(!f.snapshot(0).units.some(u => u.id === 'bSub'));
  run(f, 500); assert.equal(f.snapshot(0).contacts.find(c => c.unit === 'bSub').quality, 'confirmed');
  run(f, 5500); const early = own(f, 1, 'bSub'); assert.equal(early.position[1], -25);
  assert.equal(f.snapshot(0).contacts[0].quality, 'suspected');
  run(f, 4000); assert.equal(f.snapshot(0).contacts[0].uncertaintyCells, 3);
  const blackout = run(f, 9000); assert.equal(f.snapshot(0).contacts.length, 0);
  assert(!blackout.some(e => e.type === 'fire' && e.medium === 'underwater' && e.tick >= 120 && e.tick < 400));
  const start = own(f, 1, 'bSub').position[1]; run(f, 1000);
  const mid = own(f, 1, 'bSub').position[1]; assert(mid < start && mid > -65);
  const reacquired = run(f, 5000); assert.equal(f.snapshot(0).contacts[0].quality, 'confirmed');
  assert(reacquired.some(e => e.type === 'fire' && e.medium === 'underwater' && e.tick >= 405));
  assert(!reacquired.some(e => e.type === 'fire' && e.medium === 'underwater' && e.tick >= 400 && e.tick < 405));
  const pub = f.snapshot(0); assert(!pub.units.some(u => u.id === 'bSub'));
  assert(!('position' in pub.contacts[0])); assert(!('estimated' in pub.contacts[0]));
  assert(!pub.projectiles.some(p => p.team === 1 && p.medium === 'underwater'));
  assert(!pub.events.some(e => e.source === 'bSub' || e.unit === 'bSub'));
});

check('sub versus sub and escort counterattack use real finite underwater projectiles', () => {
  const c = fixture(true);
  for (const u of c.units) for (const w of u.weapons) if (w.medium === 'underwater') w.depths = ['shallow', 'deep'];
  const f = createFleet(c); const events = run(f, 14000);
  for (const id of ['aSub', 'bSub', 'aEscort', 'bEscort']) assert(events.some(e => e.type === 'fire' && e.source === id && e.medium === 'underwater'));
  for (const [t, id] of [[0, 'aSub'], [1, 'bSub']]) assert(own(f, t, id).hp < 40);
  assert(f.snapshot(0).metrics.maxUnderwater <= 8);
  assert(f.snapshot(0).metrics.sensorChecks <= Math.floor(14000 / 250) * 16);
});

check('depth eligibility, arena/land/seabed obstruction and required symmetric counterplay', () => {
  const invalid = fixture(true); invalid.units.find(u => u.id === 'aEscort').sensor = null;
  assert.throws(() => createFleet(invalid));
  const shallow = fixture(true); shallow.arena.bottomY = -20;
  shallow.units.filter(u => u.kind === 'sub').forEach(u => { u.half[1] = 8; });
  assert.throws(() => createFleet(shallow)); // deep hull does not clear this configured seabed
  const blocked = fixture(true); blocked.arena.obstacles = [{ min: [-100, -100, -300], max: [100, 10, 300] }];
  const f = createFleet(blocked); run(f, 2000);
  assert.equal(f.snapshot(0).contacts.length, 0);
  assert(!f.snapshot(0).events.some(e => e.type === 'damage'));
  const deep = fixture(true); deep.units.forEach(u => { if (u.kind === 'surface') u.weapons = u.weapons.filter(w => w.medium === 'underwater'); });
  const g = createFleet(deep); g.addPlayer('alice', 0); g.request('alice', { type: 'spawn', kind: 'planeA' });
  assert.throws(() => g.launchAircraftAttack('alice', { aircraft: 'aircraft_alice', weapon: 'airGun', origin: [100, -65, -200], aim: [200, -65, -200] }));
  assert.throws(() => g.launchAircraftAttack('alice', { aircraft: 'aircraft_alice', weapon: 'airGun', origin: [1001, 0, 0], aim: [900, 0, 0] }));
});

check('capital-only outcomes, simultaneous draw, once-only match end and exact reset', () => {
  const c = fixture(); c.units = c.units.filter(u => u.capital);
  c.units[0].position = [-50, 0, 0]; c.units[1].position = [50, 0, 0];
  c.units.forEach(u => { u.hp = 10; u.weapons = [gun()]; }); c.intermissionMs = 1000;
  const f = createFleet(c); const events = run(f, 1000);
  assert.deepEqual(f.snapshot(0).outcome, { winner: null, reason: 'capitals' });
  assert.equal(events.filter(e => e.type === 'match-end').length, 1);
  run(f, 1000); assert.equal(f.snapshot(0).round, 1); assert.equal(f.snapshot(0).outcome, null);
  assert.equal(f.snapshot(0).contacts.length, 0); assert(f.snapshot(0).units.every(u => u.hp === 10));
  assert(f.snapshot(0).events.some(e => e.type === 'reset'));
  const timeout = fixture(); timeout.units.forEach(u => { u.weapons = []; }); timeout.matchMs = 1000;
  const t = createFleet(timeout); run(t, 1000); assert.deepEqual(t.snapshot(0).outcome, { winner: null, reason: 'time' });
});

check('integer partition determinism, JSON snapshots/replay, rejected malformed inputs', () => {
  const c = fixture(true), a = createFleet(c), b = createFleet(c);
  run(a, 12000, [50]); run(b, 12000, [1, 17, 39, 113, 400]);
  assert.deepEqual(a.snapshot(0), b.snapshot(0)); assert.deepEqual(a.snapshot(1), b.snapshot(1));
  assert.deepEqual(replayFleet(JSON.parse(JSON.stringify(a.exportReplay()))).snapshot(0), a.snapshot(0));
  assert.deepEqual(JSON.parse(JSON.stringify(a.snapshot(0))), a.snapshot(0));
  for (const ms of [-1, NaN, Infinity, 0.1, 10001, '50']) assert.throws(() => a.advance(ms));
  assert.throws(() => a.snapshot(2)); assert.throws(() => replayFleet({ version: 2, config: c, actions: [] }));
  assert.throws(() => createFleet({ ...c, unexpected: true }));
  const tooMany = fixture();
  for (let i = 0; i < 7; i++) tooMany.units.push(unit(`extra${i}`, 0, [-800 + i * 50, 0, -800]));
  assert.throws(() => createFleet(tooMany));
  const bad = fixture(); bad.units[0].position[0] = NaN; assert.throws(() => createFleet(bad));
});

check('surfaced/shallow/deep transitions have continuous clearance, blocked ceilings and surface vulnerability', () => {
  const c = fixture(true);
  c.units.forEach(u => { u.weapons.forEach(w => { w.damage = 0.01; }); });
  c.units.find(u => u.id === 'aSub').depthPlan = [{ atMs: 0, depth: 'surfaced' }];
  const f = createFleet(c); run(f, 2000);
  assert(own(f, 0, 'aSub').position[1] < -5 && own(f, 0, 'aSub').position[1] > -65);
  run(f, 2000); assert.equal(own(f, 0, 'aSub').depth, 'surfaced');
  f.addPlayer('bob', 1); f.request('bob', { type: 'spawn', kind: 'planeB' });
  f.launchAircraftAttack('bob', { aircraft: 'aircraft_bob', weapon: 'airGun', origin: [-200, 0, -300], aim: [-200, 0, -200] });
  const before = own(f, 0, 'aSub').hp; run(f, 600); assert(own(f, 0, 'aSub').hp < before);
  const blocked = clone(c); blocked.arena.obstacles.push({ min: [-230, -45, -230], max: [-170, -35, -170] });
  const b = createFleet(blocked); run(b, 5000);
  assert(own(b, 0, 'aSub').position[1] < -50);
  assert(b.snapshot(0).events.some(e => e.type === 'depth-blocked' && e.unit === 'aSub'));
});

check('surface shell and underwater caps are exercised under pressure, not merely compared to zero', () => {
  const c = fixture(); c.units = [];
  for (const team of [0, 1]) for (let i = 0; i < 5; i++) {
    const weapons = Array.from({ length: 4 }, (_, n) => ({ ...gun(`mount${n}`), range: 1200, speed: 60, ttlMs: 20000 }));
    c.units.push(unit(`side${team}ship${i}`, team, [team ? 400 : -400, 0, -300 + i * 150], { capital: i === 0, weapons, hp: 10000 }));
  }
  const f = createFleet(c); run(f, 2000); assert.equal(f.snapshot(0).metrics.maxShells, 64);
  assert(f.snapshot(0).metrics.skippedShots > 0);
  const sub = fixture(true);
  for (const u of sub.units) {
    u.sensor = { enabled: true, range: 1000, depths: ['surfaced', 'shallow', 'deep'] };
    u.weapons = [{ ...uw(), speed: 50, depths: ['shallow', 'deep'] }];
  }
  const b = createFleet(sub); run(b, 7000); assert.equal(b.snapshot(0).metrics.maxUnderwater, 8);
  assert(b.snapshot(0).metrics.skippedShots > 0);
});

check('fractional final projectile step clamps range while preserving exact-boundary hits', () => {
  function shot(targetX) {
    const c = fixture(); c.units = [unit('aCapital', 0, [-200, 0, 200], { capital: true }),
      unit('bCapital', 1, [targetX, 0, 0], { capital: true, half: [0.25, 0.25, 0.25] })];
    c.aircraft[0][0].weapons[0] = { ...gun('airGun'), range: 100, speed: 333, ttlMs: 1000 };
    const f = createFleet(c); f.addPlayer('alice', 0); f.request('alice', { type: 'spawn', kind: 'planeA' });
    f.launchAircraftAttack('alice', { aircraft: 'aircraft_alice', weapon: 'airGun', origin: [0, 0, 0], aim: [100, 0, 0] });
    const events = run(f, 500); return { f, events };
  }
  const outside = shot(110);
  assert.equal(own(outside.f, 1, 'bCapital').hp, 60);
  assert(!outside.events.some(e => e.type === 'damage'));
  assert.equal(outside.f.snapshot(0).projectiles.length, 0);
  const boundary = shot(100.25);
  assert.equal(own(boundary.f, 1, 'bCapital').hp, 50);
  assert(boundary.events.some(e => e.type === 'impact' && Math.abs(e.position[0] - 100) < 1e-9));
});

check('W13 hostile immunity and friendly blocker repro: reserve generated aircraft namespace', () => {
  function shoot(id, team) {
    const c = fixture(); c.units = [unit('a', 0, [-200, 0, 0], { capital: true }),
      unit(id, team, [100, 0, 0], { capital: team === 1, half: [1, 1, 1] }),
      ...(team === 0 ? [unit('b', 1, [150, 0, 0], { capital: true, half: [1, 1, 1] })] : [])];
    c.aircraft[0][0].weapons[0] = { ...gun('airGun'), range: 200, cooldownMs: 6000, ammo: 2 };
    const f = createFleet(c); f.addPlayer('alice', 0); f.request('alice', { type: 'spawn', kind: 'planeA' });
    f.launchAircraftAttack('alice', { aircraft: 'aircraft_alice', weapon: 'airGun', origin: [0, 0, 0], aim: [200, 0, 0] });
    f.advance(1000); return f.snapshot(0);
  }
  assert.equal(shoot('target', 1).units.find(u => u.id === 'target').hp, 50);
  assert.equal(shoot('target', 0).units.find(u => u.id === 'b').hp, 60);
  for (const team of [0, 1]) assert.throws(() => shoot('aircraft_alice', team), /Invalid fleet unit/);
  const sub = fixture(true); sub.units.find(u => u.kind === 'sub').id = 'aircraft_alice';
  assert.throws(() => createFleet(sub), /Invalid fleet unit/);
});

check('W13 resurfacing repro: event-time private coordinates never become public history', () => {
  const c = fixture();
  c.units = [unit('a', 0, [0, 0, 0], { capital: true, half: [1, 1, 1] }),
    unit('b', 1, [300, 0, 100], { capital: true, half: [1, 1, 1] })];
  for (const u of c.units) {
    u.weapons = [{ ...uw(), range: 1, speed: 200, damage: 10, depths: ['shallow', 'deep'] }];
    u.sensor = { enabled: true, range: 1, depths: ['shallow', 'deep'] };
  }
  c.units.push(unit('sub', 1, [100, 0, 0], { kind: 'sub', depth: 'deep', half: [1, 1, 1],
    weapons: [{ ...uw(), range: 200, speed: 200, damage: 10, depths: ['surfaced'] }],
    depthPlan: [{ atMs: 1000, depth: 'surfaced' }] }));
  const f = createFleet(c); f.advance(500);
  const privateFire = f.snapshot(1).events.find(e => e.type === 'fire' && e.source === 'sub');
  assert(privateFire); assert.deepEqual(privateFire.position, [100, -65, 0]);
  assert.equal(f.snapshot(0).contacts.length, 0);
  assert(!f.snapshot(0).events.some(e => e.id === privateFire.id));
  f.advance(4500); assert.equal(own(f, 1, 'sub').depth, 'surfaced');
  assert(!f.snapshot(0).events.some(e => e.id === privateFire.id));
  assert(f.snapshot(1).events.some(e => e.id === privateFire.id));
  // Preserve a legitimate own-hull damage report, but do not disclose the hidden attacker ID.
  assert(f.snapshot(0).events.some(e => e.type === 'damage' && e.unit === 'a' && e.source === null));
  f.advance(2000);
  const visibleFire = f.snapshot(0).events.find(e => e.type === 'fire' && e.source === 'sub');
  assert(visibleFire && visibleFire.id !== privateFire.id && visibleFire.tick >= 130);
  assert(!f.snapshot(0).events.some(e => e.id === privateFire.id));
  assert(!JSON.stringify(f.snapshot(0).events).includes('[100,-65,0]'));
  assert.deepEqual(replayFleet(JSON.parse(JSON.stringify(f.exportReplay()))).snapshot(0), f.snapshot(0));
  assert(f.snapshot(0).events.length <= LIMITS.eventHistory);
});

// Accepted-fire adapter fixtures only, not native RoomEngine integration.
const hostShot = (overrides = {}) => ({ source: 'hostAircraft', team: 0, weapon: 'cannon20',
  from: [100, 0, 0], to: [300, 0, 0], damage: 10, maxFraction: 1, ...overrides });
function hostFixture() { const c = fixture(); c.units.forEach(u => { u.weapons = []; }); return c; }
check('host segment actual fitted swept collision and nearest hull without synthetic fire costs', () => {
  const c = hostFixture();
  const descriptor = JSON.parse(readFileSync(new URL('./model-repairs.json', import.meta.url))).models[0];
  c.geometry = [{ id: 'measured', descriptor }];
  const target = c.units.find(u => u.id === 'bEscort');
  Object.assign(target, { modelId: 'measured', heading: Math.PI / 2, speed: 10, route: [[100, 0, 0]] });
  const f = createFleet(c); f.addPlayer('alice', 0); f.request('alice', { type: 'spawn', kind: 'planeA' });
  const aircraft = f.snapshot(0).aircraft;
  const previous = [...target.position]; f.advance(50);
  const current = own(f, 1, target.id), input = hostShot();
  const expected = fittedHit(compileGeometry(descriptor), input.from, input.to, current.position,
    Math.PI / 2, previous);
  const hit = f.resolveHostSegment(input);
  assert(expected !== null); assert.equal(hit.fraction, expected); assert.equal(hit.unit, target.id);
  assert.equal(hit.damage, 10); assert.equal(hit.hp, 50);
  assert.deepEqual(hit.position, input.from.map((n, i) => n + (input.to[i] - n) * expected));
  assert.deepEqual(f.snapshot(0).aircraft, aircraft); assert.equal(f.snapshot(0).projectiles.length, 0);
  assert(!f.snapshot(0).events.some(e => e.type === 'fire'));
  const nearest = createFleet(hostFixture());
  assert.equal(nearest.resolveHostSegment(hostShot({ from: [-300, 0, 0] })).unit, 'aEscort');
});
check('host friendly hull obstructs without damage and player commands cannot call adapter', () => {
  const c = hostFixture(); c.units.push(unit('blocker', 0, [150, 0, 0]));
  const f = createFleet(c), hit = f.resolveHostSegment(hostShot());
  assert.deepEqual(hit, { unit: 'blocker', fraction: .19, position: [138, 0, 0], damage: 0, hp: 60 });
  assert.equal(own(f, 1, 'bEscort').hp, 60);
  assert.deepEqual(f.snapshot(0).events.map(e => e.type), ['impact']);
  f.addPlayer('alice', 0); assert.equal(f.request('alice', { type: 'hostSegment', input: hostShot() }).ok, false);
});
check('host maxFraction strictly reserves native ties and endpoint equality', () => {
  for (const maxFraction of [0, .2, .44]) {
    const f = createFleet(hostFixture()); assert.equal(f.resolveHostSegment(hostShot({ maxFraction })), null);
    assert.equal(own(f, 1, 'bEscort').hp, 60); assert.equal(f.snapshot(0).events.length, 0);
  }
  assert(createFleet(hostFixture()).resolveHostSegment(hostShot({ maxFraction: .440001 })));
  const f = createFleet(hostFixture());
  assert.equal(f.resolveHostSegment(hostShot({ to: [188, 0, 0] })), null);
  assert.equal(f.resolveHostSegment(hostShot({ from: [100, 50, 0], to: [300, 50, 0] })), null);
  assert.equal(f.resolveHostSegment(hostShot({ from: [200, 0, 0], maxFraction: .001 })).fraction, 0);
});
check('host closest arena obstacle wins but not later obstacles or native collisions', () => {
  for (const x of [140, 188, 230]) {
    const c = hostFixture(); c.arena.obstacles = [{ min: [x, 11, -2], max: [x + 2, 20, 2] }];
    // Elevated obstacles clear the initial hull but can block the descending segment.
    c.units.find(u => u.id === 'bEscort').half[1] = 10;
    const f = createFleet(c);
    // Sloping segment crosses the wall before reaching the hull at y < 10.
    const input = hostShot({ from: [100, 18, 0], to: [300, 0, 0] });
    const result = f.resolveHostSegment(input);
    if (x === 140) { assert.equal(result, null); assert.equal(f.snapshot(0).events[0].type, 'blocked'); }
    else assert.equal(result.unit, 'bEscort');
  }
  const c = hostFixture(); c.arena.obstacles = [{ min: [0, -10, -5], max: [10, 10, 5] },
    { min: [140, -10, -5], max: [150, 10, 5] }];
  const f = createFleet(c); assert.equal(f.resolveHostSegment(hostShot({ maxFraction: .1 })), null);
  assert.equal(f.snapshot(0).events.length, 0);
});
check('host invalid vectors/damage/fields and replay cap reject before mutation', () => {
  const f = createFleet(hostFixture()), before = f.exportReplay(), snapshot = f.snapshot(0);
  const invalid = [null, {}, { ...hostShot(), extra: true },
    ...['source', 'weapon'].flatMap(key => ['', 'bad id', 'x'.repeat(49), 1].map(value => ({ ...hostShot(), [key]: value }))),
    ...[2, -1, '0', null].map(team => hostShot({ team })),
    ...[0, -1, 10001, NaN, Infinity, '10', undefined].map(damage => hostShot({ damage })),
    ...[-1, 1.1, Infinity, NaN, undefined].map(maxFraction => hostShot({ maxFraction })),
    ...['from', 'to'].flatMap(key => [[0, 0], [0, 0, 0, 0], [NaN, 0, 0], [Infinity, 0, 0],
      [100001, 0, 0], ['0', 0, 0], new Array(3), null].map(value => ({ ...hostShot(), [key]: value })))];
  for (const input of invalid) assert.throws(() => f.resolveHostSegment(input), TypeError);
  assert.deepEqual(f.exportReplay(), before); assert.deepEqual(f.snapshot(0), snapshot);
  for (let i = 0; i < LIMITS.replayActions; i++) f.advance(0);
  assert.throws(() => f.resolveHostSegment(hostShot()), /Replay action cap/);
  assert.deepEqual(f.snapshot(0), snapshot);
  assert.throws(() => replayFleet({ ...before, actions: [{ type: 'hostSegment', input: hostShot({ damage: 0 }) }] }));
});
check('host replay equality, immediate capital outcome and intermission no-op rejection', () => {
  const f = createFleet(hostFixture());
  f.resolveHostSegment(hostShot({ from: [0, 0, 150], to: [400, 0, 150], damage: 10000 }));
  assert.deepEqual(f.snapshot(0).outcome, { winner: 0, reason: 'capitals' });
  const before = f.exportReplay(), snapshot = f.snapshot(0);
  assert.throws(() => f.resolveHostSegment(hostShot()), /Intermission/);
  assert.deepEqual(f.exportReplay(), before); assert.deepEqual(f.snapshot(0), snapshot);
  assert.deepEqual(snapshot.events.map(e => e.type), ['impact', 'damage', 'sunk', 'match-end']);
  assert(snapshot.events.filter(e => e.source && e.type !== 'sunk').every(e => e.team === 0));
  assert.equal(snapshot.events.find(e => e.type === 'sunk').team, 1, 'sunk team remains the victim faction');
  assert.equal(snapshot.events.find(e => e.type === 'sunk').sourceTeam, 0);
  const replay = replayFleet(clone(before));
  for (const team of [0, 1]) assert.deepEqual(replay.snapshot(team), f.snapshot(team));
  assert.deepEqual(replay.exportReplay(), before);
});
check('host excludes submerged hulls and preserves weather event-time redaction', () => {
  const c = fixture(true), f = createFleet(c);
  assert.equal(f.resolveHostSegment(hostShot({ from: [100, -65, -200], to: [300, -65, -200] })), null);
  assert.equal(own(f, 1, 'bSub').hp, 40);
  for (const u of c.units) for (const w of u.weapons) w.acquisition = 'nonvisual';
  for (const a of c.aircraft.flat()) for (const w of a.weapons) w.acquisition = 'visual';
  c.weather = { config: { seed: 42, allowedPresets: ['clear'], initialPreset: 'clear' },
    baseVisibility: { fogBase: .01, fogSea: 0, fogFalloff: 1 / 300 }, minimumTransmittance: .9 };
  const hidden = createFleet(c);
  hidden.resolveHostSegment(hostShot());
  assert(!hidden.snapshot(0).events.some(e => e.unit === 'bEscort'));
  const damage = hidden.snapshot(1).events.find(e => e.type === 'damage');
  assert(damage); assert.equal(damage.team, 0);
  assert.equal(hidden.snapshot(1).events.find(e => e.type === 'impact').source, null);
  for (const team of [0, 1]) assert.deepEqual(replayFleet(hidden.exportReplay()).snapshot(team), hidden.snapshot(team));
});
check('sustained native empty segments and adjacent clocks do not exhaust bounded replay', () => {
  const f = createFleet(hostFixture());
  const miss = hostShot({ from: [100, 50, 0], to: [300, 50, 0] });
  for (let i = 0; i < 30000; i++) {
    assert.equal(f.resolveHostSegment(miss), null);
    f.advance(i % 3 === 0 ? 16 : 17);
  }
  assert(f.exportReplay().actions.length < 100);
  for (const team of [0, 1]) assert.deepEqual(replayFleet(f.exportReplay()).snapshot(team), f.snapshot(team));
});
console.log(`PASS ${groups} original standalone FC groups; no native RoomEngine integration or renderer acceptance claimed`);
