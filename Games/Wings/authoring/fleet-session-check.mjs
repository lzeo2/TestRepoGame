// Original trusted-host CPU integration fixtures, NOT served/natural aircraft gameplay.
import assert from 'node:assert/strict';
import { createFleetSession } from './fleet-session.mjs';
import { readFile } from 'node:fs/promises';
import { compileGeometry, mountPose } from './fleet-geometry.mjs';
import { createWeather } from './weather/weather.mjs';
const escorts = JSON.parse(await readFile(new URL('./model-repairs.json', import.meta.url))).models;
const submarine = JSON.parse(await readFile(new URL('./submarine-model.json', import.meta.url)));
const clone = value => structuredClone(value);
const gun = (id = 'gun') => ({ id, medium: 'surface', range: 1000, speed: 500, ttlMs: 4000,
  cooldownMs: 500, damage: 20, depths: ['surfaced'], ammo: 30 });
const uw = () => ({ id: 'uw', medium: 'underwater', range: 1000, speed: 100, ttlMs: 20000,
  cooldownMs: 6000, damage: 1, depths: ['shallow', 'deep'], ammo: 2 });
const unit = (id, team, position, extra = {}) => ({ id, team, kind: 'surface', capital: true,
  position, half: [10, 8, 70], hp: 40, speed: 0, route: [], weapons: [gun()],
  sensor: null, depth: 'surfaced', depthPlan: [], ...extra });
function config(withSubs = false) {
  const units = [unit('a', 0, [0, 0, -300]), unit('b', 1, [0, 0, 300])];
  if (withSubs) for (const team of [0, 1]) {
    const escort = units[team];
    escort.hp = 10000; escort.weapons = [uw()];
    escort.sensor = { enabled: true, range: 1000, depths: ['shallow', 'deep'] };
    units.push(unit(team ? 'bSub' : 'aSub', team, [team ? 200 : -200, 0, 0], {
      capital: false, kind: 'sub', depth: 'deep', hp: 1000, half: [8, 10, 40], weapons: [],
    }));
  }
  return { mode: 'factions', arena: { minX: -1000, maxX: 1000, minZ: -1000, maxZ: 1000,
    bottomY: -100, cell: 50, obstacles: [] }, units,
    aircraft: [[{ id: 'planeA', weapons: [gun('airGun')] }], [{ id: 'planeB', weapons: [gun('airGun')] }]],
    matchMs: 10000, intermissionMs: 1000 };
}
function fixture(c = config(), { mutate = false, aircraftStep = null } = {}) {
  const identity = Object.freeze({}), connections = new Map(), views = [], launches = [], flightSteps = [];
  const alice = {}, bob = {}, ally = {};
  connections.set(alice, { id: 'alice', team: 0 }); connections.set(bob, { id: 'bob', team: 1 });
  connections.set(ally, { id: 'ally', team: 0 });
  let session, lease, sequence = 0, reenter = false, failingPlayer = null;
  const host = { identity, authenticate: connection => connections.get(connection),
    deriveAircraftAttack: request => {
      launches.push(clone(request));
      assert.deepEqual(Object.keys(request).sort(), ['aircraft', 'playerId', 'round', 'team', 'tick', 'weapon']);
      assert(Object.isFrozen(request));
      // Explicit trusted flight-pose fixture, not actual player flight physics.
      return { origin: [0, 0, 200], aim: [0, 0, 300] };
    },
    stepAircraft: step => { flightSteps.push(step); if (aircraftStep) aircraftStep(step); },
  };
  function createView(principal) {
    assert.deepEqual(Object.keys(principal).sort(), ['playerId', 'team']); assert(Object.isFrozen(principal));
    const spy = { principal, frames: [], eventIds: new Set(), resets: 0, disposals: 0,
      update(safe) {
        for (const forbidden of ['config', 'replay', 'actions', 'arena', 'authority', 'lease']) assert(!(forbidden in safe));
        for (const event of safe.events) {
          const key = `${safe.round}:${event.id}`;
          assert(!spy.eventIds.has(key), 'Session must dedupe delivered event history'); spy.eventIds.add(key);
        }
        if (reenter) assert.throws(() => session.update(lease, { sequence: sequence+1, elapsedMs: 50 }), /Reentrant/);
        if (principal.playerId === failingPlayer) throw new Error('view unavailable');
        spy.frames.push(clone(safe));
        if (mutate && safe.units.length) { safe.units[0].hp = -999; safe.units[0].position[0] = 99999; safe.events.length = 0; }
      },
      reset() { spy.resets++; spy.eventIds.clear(); },
      dispose() { spy.disposals++; },
    };
    views.push(spy); return spy;
  }
  session = createFleetSession({ mode: 'factions', config: c, host, createView });
  lease = session.start(identity);
  return { session, identity, alice, bob, ally, connections, views, launches, flightSteps,
    advance(ms) { sequence++; return session.update(lease, { sequence, elapsedMs: ms }); },
    restart() { lease = session.restart(identity); sequence = 0; return lease; },
    get lease() { return lease; }, get sequence() { return sequence; },
    setReentrant(value) { reenter = value; }, setFailingPlayer(value) { failingPlayer = value; } };
}
let groups = 0;
function check(name, body) { body(); groups++; console.log(`PASS ${name}`); }

check('normal/solo/custom decline without touching config, host, views or clocks', () => {
  for (const mode of ['normal', 'solo', 'custom', undefined]) {
    const options = { mode, get config() { throw new Error('normal config touched'); }, get host() { throw new Error('normal host touched'); } };
    assert.equal(createFleetSession(options), null);
  }
  assert.throws(() => createFleetSession({ mode: 'factions', config: config(), host: {}, createView() {} }));
  const identity = {}, bad = createFleetSession({ mode: 'factions', config: { ...config(), units: [] },
    host: { identity, authenticate() {}, deriveAircraftAttack() {} }, createView() { throw new Error('must not create view'); } });
  assert.throws(() => bad.start(identity)); assert.equal(bad.stats().status, 'new');
});

check('one unforgeable clock lease, integer 50ms ownership, bounded/reentrant/paused input', () => {
  const f = fixture(); f.session.join(f.alice); f.setReentrant(true);
  assert.throws(() => f.session.start(f.identity));
  for (const lease of [{ generation: 1 }, {}, null]) assert.throws(() => f.session.update(lease, { sequence: 1, elapsedMs: 50 }));
  for (const elapsedMs of [-1, .5, NaN, Infinity, 251, '50'])
    assert.throws(() => f.session.update(f.lease, { sequence: 1, elapsedMs }));
  assert.throws(() => f.session.update(f.lease, { sequence: 2, elapsedMs: 50 }));
  assert.throws(() => f.session.update(f.lease, { sequence: 1, elapsedMs: 50, clock: 'other' }));
  assert.deepEqual(f.advance(17), { steps: 0, tick: 0, pendingMs: 17, viewFailures: 0 });
  assert.equal(f.advance(33).tick, 1);
  assert.throws(() => f.session.update(f.lease, { sequence: 2, elapsedMs: 50 }));
  assert.equal(f.flightSteps.length, 1); assert.equal(f.flightSteps[0].dtMs, 50);
  assert.throws(() => f.session.setPaused({}, true));
  f.session.setPaused(f.identity, true);
  assert.equal(f.advance(250).steps, 0); assert.equal(f.session.snapshot(f.alice).tick, 1);
  assert.equal(f.views[0].frames.at(-1).paused, true);
  f.session.setPaused(f.identity, false); assert.equal(f.advance(250).steps, 5);
  assert.equal(f.flightSteps.length, 6);
  const previous = f.lease; f.restart();
  assert.throws(() => f.session.update(previous, { sequence: 1, elapsedMs: 50 }));
  assert.equal(f.session.snapshot(f.alice).tick, 0); assert.equal(f.session.stats().pendingMs, 0);
  f.session.dispose(f.identity);
});

check('trusted faction identity, ordinary aircraft requests and host-only launch pose; no vessel control', () => {
  const f = fixture();
  assert.throws(() => f.session.join({}));
  f.session.join(f.alice); f.session.join(f.bob); f.session.join(f.ally);
  assert.throws(() => f.session.join(f.alice));
  const forged = {}; f.connections.set(forged, { id: 'alice', team: 1 });
  assert.throws(() => f.session.snapshot(forged));
  for (const command of [{ type: 'spawn', kind: 'a' }, { type: 'spawn', kind: 'planeB' },
    { type: 'board', aircraft: 'a', seat: 0 }, { type: 'control', unit: 'a' },
    { type: 'damage', unit: 'b', damage: 100 }, { type: 'team', team: 1 }])
    assert.equal(f.session.request(f.alice, command).ok, false);
  assert.throws(() => f.session.request(f.alice, { type: 'spawn', kind: 'planeA', team: 1 }));
  assert(f.session.request(f.alice, { type: 'spawn', kind: 'planeA' }).ok);
  assert(f.session.request(f.bob, { type: 'spawn', kind: 'planeB' }).ok);
  assert.equal(f.session.request(f.alice, { type: 'board', aircraft: 'aircraft_bob', seat: 1 }).ok, false);
  assert(f.session.request(f.ally, { type: 'board', aircraft: 'aircraft_alice', seat: 1 }).ok);
  assert(f.session.request(f.alice, { type: 'switch-seat', seat: 0 }).ok);
  assert.equal(f.session.attack(f.ally, { weapon: 'airGun' }).ok, false);
  assert.throws(() => f.session.attack(f.alice, { weapon: 'airGun', origin: [0, 0, 300], aim: [0, 0, 300] }));
  assert.equal(f.launches.length, 0);
  assert(f.session.attack(f.alice, { weapon: 'airGun' }).ok);
  assert.equal(f.session.attack(f.alice, { weapon: 'airGun' }).ok, false);
  assert.equal(f.launches[0].aircraft, 'aircraft_alice');
  f.advance(100);
  const safe = f.session.snapshot(f.bob);
  assert.equal(safe.units.find(u => u.id === 'b').hp, 20);
  assert(safe.events.some(e => e.type === 'damage' && e.source === 'aircraft_alice'));
  assert(f.session.leave(f.alice).released);
  assert.equal(f.views[0].disposals, 1);
  assert.equal(f.session.snapshot(f.ally).players.find(p => p.id === 'ally').aircraft, null);
  assert.throws(() => f.session.request(f.alice, { type: 'spawn', kind: 'planeA' }));
  f.session.join(f.alice); assert(f.session.request(f.alice, { type: 'spawn', kind: 'planeA' }).ok);
  f.session.dispose(f.identity);
});

check('real reciprocal AI shots, HP loss/sinks/objectives, deduped presentation and restart/disposal', () => {
  const f = fixture(); f.session.join(f.alice); f.session.join(f.bob);
  const collected = new Map();
  for (let i = 0; i < 100; i++) {
    f.advance(50); const state = f.session.snapshot(f.alice);
    for (const e of state.events) collected.set(e.id, e);
    if (state.outcome) break;
  }
  for (const id of ['a', 'b']) {
    assert([...collected.values()].some(e => e.type === 'fire' && e.source === id));
    assert([...collected.values()].some(e => e.type === 'damage' && e.unit === id));
    assert.equal([...collected.values()].filter(e => e.type === 'sunk' && e.unit === id).length, 1);
  }
  assert.deepEqual(f.session.snapshot(f.alice).outcome, { winner: null, reason: 'capitals' });
  assert.equal([...collected.values()].filter(e => e.type === 'match-end').length, 1);
  const oldViews = [...f.views]; f.restart();
  const reset = f.session.snapshot(f.alice);
  assert.equal(reset.tick, 0); assert.equal(reset.outcome, null);
  assert.equal(reset.events.length, 0); assert.equal(reset.projectiles.length, 0);
  assert(reset.units.every(u => u.hp === u.maxHp && u.alive));
  assert(oldViews.every(v => v.resets === 1 && v.eventIds.size === 0));
  f.session.dispose(f.identity); f.session.dispose(f.identity);
  assert(oldViews.every(v => v.disposals === 1)); assert.equal(f.session.stats().clients, 0);
  assert.throws(() => f.advance(50)); assert.throws(() => f.session.snapshot(f.alice));
});

check('faction-safe view ABI and hidden submarine redaction; mutable view copies cannot damage authority', () => {
  const f = fixture(config(true), { mutate: true }); f.session.join(f.alice); f.session.join(f.bob);
  for (let i = 0; i < 20; i++) f.advance(50);
  for (const [index, hidden] of [[0, 'bSub'], [1, 'aSub']]) {
    const spy = f.views[index], current = spy.frames.at(-1);
    assert(!current.units.some(u => u.id === hidden));
    assert(!current.events.some(e => e.source === hidden || e.unit === hidden));
    assert(!current.projectiles.some(p => p.team !== index && p.medium === 'underwater'));
    for (const contact of current.contacts) assert(!('position' in contact));
    assert(current.units.every(u => u.hp > 0));
    assert(f.session.snapshot(index ? f.bob : f.alice).units.every(u => u.hp > 0 && u.position[0] !== 99999));
  }
  assert.equal(f.session.stats().viewFailures, 0);
  assert(!('exportReplay' in f.session)); assert(!('advance' in f.session)); assert(!('authority' in f.session));
  f.session.dispose(f.identity);
});

check('trusted flight-step failure faults closed; no retry/double advance until explicit restart', () => {
  let bad = true;
  const f = fixture(config(), { aircraftStep() { if (bad) throw new Error('host flight unavailable'); } });
  f.session.join(f.alice);
  assert.throws(() => f.advance(50), /host flight unavailable/);
  assert.equal(f.session.stats().status, 'faulted'); assert.throws(() => f.advance(50), /faulted/);
  bad = false; f.restart(); assert.equal(f.advance(50).tick, 1); f.session.dispose(f.identity);
});

check('W16 failed-view cleanup reconciles same-faction survivors in BOTH publication orders without replaying events', () => {
  for (const order of ['failing-first', 'failing-last']) {
    const f = fixture();
    for (const connection of order === 'failing-first' ? [f.alice, f.ally] : [f.ally, f.alice]) f.session.join(connection);
    f.advance(250); f.advance(250); // Deliver real FC fire events before the failure/reconciliation pass.
    const survivor = f.views.find(v => v.principal.playerId === 'ally');
    const failed = f.views.find(v => v.principal.playerId === 'alice');
    const eventsBefore = new Set(survivor.eventIds), framesBefore = survivor.frames.length;
    assert(eventsBefore.size > 0);
    f.setFailingPlayer('alice');
    assert(f.session.request(f.alice, { type: 'spawn', kind: 'planeA' }).ok);
    const presented = survivor.frames.at(-1), current = f.session.snapshot(f.ally);
    assert.deepEqual(presented.aircraft, current.aircraft);
    assert.deepEqual(presented.players, current.players);
    assert.equal(presented.aircraft.length, 0);
    assert.equal(current.players.find(p => p.id === 'alice').aircraft, null);
    assert.deepEqual(survivor.eventIds, eventsBefore);
    assert.equal(survivor.frames.length-framesBefore, order === 'failing-first' ? 1 : 2);
    assert.equal(failed.disposals, 1); assert.equal(f.session.stats().clients, 1);
    assert.equal(f.session.stats().viewFailures, 1);
    f.session.dispose(f.identity);
  }
});

check('weather authority frames reach the one flight step by copy and freeze on pause/restart', () => {
  const c = config();
  c.weather = { config: createWeather({ seed: 7, allowedPresets: ['rain'] }).config };
  for (const u of c.units) for (const w of u.weapons) w.acquisition = 'visual';
  for (const roster of c.aircraft) for (const a of roster) for (const w of a.weapons) w.acquisition = 'visual';
  const delivered = [];
  const f = fixture(c, { aircraftStep(step) {
    assert(Object.isFrozen(step));
    assert.equal(step.environment.simulationMs, step.tick * 50);
    delivered.push(clone(step.environment));
    step.environment.visibility.fogBase = .009; // Trusted callback still cannot mutate authority state.
  } });
  f.session.join(f.alice);
  const initial = f.session.snapshot(f.alice).environment;
  assert.equal(f.advance(17).steps, 0); assert.equal(delivered.length, 0);
  assert.equal(f.advance(33).steps, 1); assert.deepEqual(delivered[0], initial);
  const first = f.session.snapshot(f.alice).environment;
  assert.equal(first.simulationMs, 50); assert.notEqual(first.visibility.fogBase, .009);
  assert.deepEqual(f.views[0].frames.at(-1).environment, first);
  f.session.setPaused(f.identity, true); f.advance(250);
  assert.equal(delivered.length, 1); assert.deepEqual(f.session.snapshot(f.alice).environment, first);
  f.session.setPaused(f.identity, false); f.advance(50);
  assert.deepEqual(delivered[1], first); assert.equal(f.session.snapshot(f.alice).environment.simulationMs, 100);
  f.restart(); assert.deepEqual(f.session.snapshot(f.alice).environment, initial);
  f.advance(50); assert.deepEqual(delivered.at(-1), initial);
  f.session.dispose(f.identity);
});

check('W14 measured escort muzzle/aim/propeller and submarine control-plane channels flow through safe rig ABI', () => {
  const c = config();
  c.geometry = escorts.map((descriptor, i) => ({ id: `escortModel${i}`, descriptor }));
  // Close face-off keeps both actual conservative, upward-only gun envelopes on real island geometry.
  c.units = [unit('a', 0, [0, 0, 110], { hp: 10000, modelId: 'escortModel0', heading: .1,
    speed: 2, route: [[0, 0, -600]], weapons: [{ ...gun(), mount: 'main_gun' }] }),
    unit('b', 1, [0, 0, -110], { hp: 10000, modelId: 'escortModel1', heading: Math.PI,
      speed: 2, route: [[0, 0, 600]], weapons: [{ ...gun(), mount: 'main_gun' }] })];
  const f = fixture(c); f.session.join(f.alice); f.session.join(f.bob);
  const fitted = escorts.map(compileGeometry), seenFire = new Set();
  let aimed = false, spun = false;
  for (let i = 0; i < 50; i++) {
    f.advance(50);
    const safe = f.session.snapshot(f.alice), frame = f.views[0].frames.at(-1);
    for (const u of safe.units) {
      assert.deepEqual(frame.units.find(v => v.id === u.id).view, u.view);
      assert.equal(u.view.orientation.length, 4);
      assert(Math.abs(Math.hypot(...u.view.orientation)-1) < 1e-6);
      const descriptor = escorts[u.id === 'a' ? 0 : 1];
      for (const control of descriptor.articulation) {
        if (control.limits_rad) {
          const angle = u.view.angles[control.node];
          if (angle !== undefined) {
            assert(angle >= control.limits_rad[0] && angle <= control.limits_rad[1]);
            if (Math.abs(angle) > .0001) aimed = true;
          }
        } else {
          const spin = u.view.spinners[control.node];
          assert(spin && spin.rateRadS > 0 && spin.rateRadS <= 8 && spin.epochSeconds <= safe.tick*.05);
          if (spin.phaseRad > 0) spun = true;
        }
      }
    }
    for (const event of frame.events.filter(e => e.type === 'fire' && e.tick === safe.tick)) {
      const u = safe.units.find(v => v.id === event.source), index = event.source === 'a' ? 0 : 1;
      const heading = 2*Math.atan2(u.view.orientation[1], u.view.orientation[3]);
      const muzzle = mountPose(fitted[index], u.position, heading, 'main_gun', u.view.angles);
      event.position.forEach((n, j) => assert(Math.abs(n-muzzle.position[j]) < 1e-6));
      seenFire.add(event.source);
    }
  }
  assert.deepEqual([...seenFire].sort(), ['a', 'b']); assert(aimed && spun);
  f.session.dispose(f.identity);
  const sc = config(true);
  sc.geometry = [{ id: 'originalSub', descriptor: submarine }];
  for (const u of sc.units.filter(u => u.kind === 'sub')) {
    u.modelId = 'originalSub'; u.heading = 0; u.speed = 2;
    u.route = [[u.position[0], 0, -200]]; u.depthPlan = [{ atMs: 0, depth: 'shallow' }];
  }
  // Counterplay remains explicitly configured anonymous core fixtures, not invented escort ASW rigs.
  const s = fixture(sc); s.session.join(s.alice); s.session.join(s.bob);
  const depths = [];
  for (let i = 0; i < 10; i++) {
    s.advance(50); const safe = s.session.snapshot(s.alice), frame = s.views[0].frames.at(-1);
    const own = safe.units.find(u => u.id === 'aSub');
    depths.push(own.position[1]);
    assert.deepEqual(frame.units.find(u => u.id === 'aSub').view, own.view);
    assert(!frame.units.some(u => u.id === 'bSub'));
    assert(own.view.spinners.propulsion_rotor.rateRadS > 0);
    for (const name of ['stern_dive_port', 'stern_dive_starboard', 'bow_dive_port', 'bow_dive_starboard'])
      assert(own.view.angles[name] > 0 && own.view.angles[name] <= .3);
  }
  assert(depths.every((depth, i) => !i || depth > depths[i-1]));
  s.session.dispose(s.identity);
});

console.log(`PASS: ${groups} session groups; real FC host/clock/aircraft/AI combat/redaction/lifecycle integration; measured authoritative aim/propeller/control-plane channels forwarded to fleet-rig ABI spy.`);
console.log('CPU HOST FIXTURE ONLY: not served/natural flight, transport, upstream clearance, renderer build or native gameplay acceptance.');
