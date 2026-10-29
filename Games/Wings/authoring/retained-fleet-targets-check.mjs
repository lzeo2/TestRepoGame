// Actual safe fleet -> RoomEngine bot -> accepted native fire. CPU poses, not a playtest.
import assert from 'node:assert/strict';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
import { compileGeometry, fittedHit } from './fleet-geometry.mjs';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
const loader = installRetainedHostLoader();
try {
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const { createBotBrain, leadDirection } = await import(new URL('src/sim/bots.ts', retainedRoot));
  const { quatFromYawPitchRoll } = await import(new URL('src/sim/flight.ts', retainedRoot));
  const { WEAPONS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  function fixture(config = createLocalFleetConfig(), bots = 0) {
    const bridge = createRetainedHostBridge({ mode: 'factions', config,
      rosters: config.aircraft.map(r => r.map(a => a.id)) });
    const room = createLoopbackRoom({ teams: 2, bots, botSkill: 1 }, 'Targets CPU', { onMessage() {} },
      { manual: true, code: 'fc-targets-boundary', hostBridge: bridge });
    return { bridge, room };
  }
  const config = createLocalFleetConfig(), f = fixture(config, 2);
  let disposedQuery;
  try {
    for (let i = 0; i < 420; i++) f.room.step(1 / 60); // Expire the real six-second spawn protection.
    assert.equal(f.room.engine.botCount(), 4);
    const frame = f.bridge.snapshot(f.room.engine, f.room.playerId);
    const binding = f.room.engine.combat.hostFleet, contacts = binding.botTargets(0);
    assert.equal(contacts.length, 2); assert.strictEqual(binding.botTargets(0), contacts);
    assert(Object.isFrozen(contacts));
    for (const t of contacts) {
      assert.deepEqual(Object.keys(t).sort(), ['id', 'team', 'kind', 'capital', 'position', 'aimPosition', 'bombAimRadius'].sort());
      assert(Object.isFrozen(t) && Object.isFrozen(t.position) && Object.isFrozen(t.aimPosition));
      const u = frame.units.find(u => u.id === t.id);
      assert(u.alive && u.kind === 'surface'); assert.deepEqual(t.position, u.position);
      const g = compileGeometry(config.geometry.find(g => g.id === u.modelId).descriptor);
      const box = g.descriptor.collision.deck ?? g.descriptor.collision.hull;
      assert(Number.isFinite(t.bombAimRadius) && t.bombAimRadius > 0);
      assert.equal(t.bombAimRadius, .5 * Math.min(box.max[0] - box.min[0], box.max[2] - box.min[2]),
        'safe radius independently measured from the existing aim component');
      const h = 2 * Math.atan2(u.view.orientation[1], u.view.orientation[3]);
      assert.equal(fittedHit(g, t.aimPosition, t.aimPosition, t.position, h), 0, 'actual measured component contains aim point');
      assert(t.aimPosition[1] > 0);
    }
    assert.throws(() => { contacts[0].position[0] += 10; }, TypeError);
    for (const team of [-1, 2, NaN, '0']) assert.throws(() => binding.botTargets(team), /faction/);
    f.bridge.beforeStep(f.room.engine);
    assert.deepEqual(binding.botTargets(0), [], 'stale binding cannot disclose current contacts');
    console.log('PASS actual safe producer: measured above-water aim points, no model/authority handles, immutable bounded contacts/cache, faction/stale guards');

    const pilot = [...f.room.engine.players.values()].find(p => p.info.bot && p.info.team === 0 &&
      f.room.engine.vehicles.find(v => v.id === p.info.vehicleId)?.kind === 'warthog');
    assert(pilot, 'fixed room seed supplies an existing native gun/rocket pilot');
    const plane = f.room.engine.vehicles.find(v => v.id === pilot.info.vehicleId);
    const target = f.room.engine.combat.hostFleet.botTargets(0).find(t => t.team === 1);
    // Deliberate legal CPU approach fixture, not a synthetic enemy, pose grant in gameplay or an auto-flight claim.
    Object.assign(plane.flight, { position: [target.aimPosition[0], target.aimPosition[1] + 100, target.aimPosition[2] + 700],
      velocity: [0, 0, -135], throttle: .7, angularVelocity: [0, 0, 0], onGround: false, gearDown: false, crashed: null });
    const aim = [0, 0, 0];
    leadDirection(plane.flight.position, plane.flight.velocity, target.aimPosition, [0, 0, 0], WEAPONS.gau8.speed, 0, aim);
    plane.flight.orientation = quatFromYawPitchRoll(Math.atan2(-aim[0], -aim[2]), Math.asin(aim[1]), 0);
    pilot.brain = createBotBrain(3, 1);
    Object.assign(pilot.brain.state, { vehicleId: plane.id, phase: 'transit', role: 'strike', defender: false,
      jitterUntil: 100, jitterYaw: 0, jitterPitch: 0 });
    plane.weapons[0][1].ammo = 0; // Isolate real cannon damage; rockets have a separate accepted-fire regression.
    const ammo = plane.weapons[0][0].ammo;
    const initialHP = frame.units.find(u => u.id === target.id).hp;
    let after;
    for (let i = 0; i < 90; i++) {
      f.room.step(1 / 60);
      after = f.bridge.snapshot(f.room.engine, f.room.playerId);
      if (after.units.find(u => u.id === target.id).hp < initialHP) break;
    }
    assert.equal(pilot.brain.state.strikeShip, target.id, 'actual RoomEngine threads FC IDs, not legacy carrier IDs');
    assert(plane.weapons[0][0].ammo < ammo, 'real bot controls spent native ammo');
    assert(after.units.find(u => u.id === target.id).hp < initialHP, 'accepted native bot round reached fitted FC damage authority');
    const impacts = after.events.filter(e => e.type === 'impact' && e.unit === target.id && e.source === `aircraft_${plane.id}`);
    assert(impacts.length > 0);
    console.log(`PASS actual RoomEngine bot -> native gun/provenance -> fitted FC impact; ammo ${ammo}->${plane.weapons[0][0].ammo}, enemy HP ${after.units.find(u => u.id === target.id).hp} (CPU pose fixture)`);
    const old = f.room.engine.combat.hostFleet;
    f.bridge.reset(f.room.engine);
    assert.deepEqual(old.botTargets(0), []);
    assert.notStrictEqual(f.room.engine.combat.hostFleet.botTargets(0), contacts);
    disposedQuery = f.room.engine.combat.hostFleet.botTargets;
  } finally { f.room.close(); }
  assert.throws(() => disposedQuery(0), /disposed/);

  for (const scenario of ['lethal', 'friendly', 'private-friendly']) {
    const config = createLocalFleetConfig(), friendly = scenario !== 'lethal';
    // Declared CPU fixture: legal 1 HP hulls, static measured geometry, no fleet weapons.
    // Production HP, weapons, hull fitting and native projectile physics stay unchanged.
    Object.assign(config.arena, { minX: 3000, maxX: 4000, minZ: 0, maxZ: 1800, bottomY: -100 });
    for (const u of config.units) Object.assign(u, { position: u.team ? [3500, 0, 1000] : [3800, 0, 1400],
      heading: 0, speed: 0, route: [], weapons: [], hp: 1 });
    if (friendly) {
      config.units.push({ ...structuredClone(config.units[1]), id: 'friendly', team: 0, capital: false,
        position: [3500, 0, 1100] });
      config.units[1].position[2] = 900;
    }
    if (scenario === 'private-friendly') config.weather = {
      config: { seed: 42, allowedPresets: ['clear'], initialPreset: 'clear' },
      baseVisibility: { fogBase: .01, fogSea: 0, fogFalloff: 1 / 300 }, minimumTransmittance: .9 };
    const bridge = createRetainedHostBridge({ mode: 'factions', config,
      rosters: config.aircraft.map(r => r.map(a => a.id)) });
    const hits = [];
    const room = createLoopbackRoom({ teams: 2, bots: 0 }, 'Fresh targets CPU', { onMessage() {} },
      { manual: true, code: 'fc-targets-freshness', hostBridge: { ...bridge, beforeStep(host) {
        bridge.beforeStep(host);
        const binding = host.combat.hostFleet, resolve = binding.resolveProjectile;
        binding.resolveProjectile = (...args) => {
          const before = [binding.botTargets(0), binding.botTargets(1)];
          for (const team of [0, 1]) assert.equal(before[team].some(t => t.id === 'enemy'),
            scenario !== 'private-friendly' || team === 1, 'prime each faction cache before actual impact');
          const saved = structuredClone(before), hit = resolve(...args);
          if (hit) {
            assert.strictEqual(host.combat.hostFleet, binding, 'assert freshness without snapshot/rebinding');
            for (const team of [0, 1]) {
              const after = binding.botTargets(team);
              assert.deepEqual(before[team], saved[team], 'previous immutable DTO is not rewritten');
              assert(Object.isFrozen(after));
              assert.strictEqual(binding.botTargets(team), after, 'fresh safe projection remains cached');
              if (!friendly) assert(!after.some(t => t.id === 'enemy'), 'same-binding read must omit newly dead hull');
              else assert.deepEqual(after, before[team], 'friendly obstruction grants no new contact/pose');
              for (const t of after) {
                assert.deepEqual(Object.keys(t).sort(), ['id', 'team', 'kind', 'capital', 'position', 'aimPosition', 'bombAimRadius'].sort());
                assert(Object.isFrozen(t) && Object.isFrozen(t.position) && Object.isFrozen(t.aimPosition));
              }
              if (scenario === 'private-friendly' && team === 0)
                assert(after.every(t => t.team === 0), 'successful friendly impact cannot disclose private enemy');
            }
            hits.push({ projectile: args[0], damage: args[4], hit });
          } else for (const team of [0, 1])
            assert.strictEqual(binding.botTargets(team), before[team], 'miss/rejection preserves safety cache');
          return hit;
        };
      } } });
    try {
      room.send({ type: 'spawn', kind: 'warthog' });
      const plane = room.engine.vehicles.find(v => v.id === room.engine.players.get(room.playerId).info.vehicleId);
      assert(plane); let seq = 0;
      const tick = fire => {
        Object.assign(plane.flight, { position: [3500, 8, 1200], velocity: [0, 0, -105],
          orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
          gearDown: false, crashed: null, throttle: .5 });
        plane.spawnedAt = -100; // Disclosed native spawn-protection fixture, not gameplay acceptance.
        room.send({ type: 'input', seq: seq++, seat: { aim: [0, 0, -1], fireSecondary: fire } });
        room.step(1 / 60);
      };
      tick(true); tick(true);
      assert.equal(plane.weapons[0][1].ammo, 37, 'real accepted Hydra spends 38 -> 37');
      const projectile = room.engine.combat.projectiles.find(p => p.weapon === 'rockets');
      assert(projectile && projectile.owner === room.playerId && projectile.vehicle === plane.id);
      for (let i = 0; i < 35; i++) tick(false);
      assert.equal(hits.length, 1); assert.strictEqual(hits[0].projectile, projectile);
      assert.equal(hits[0].damage, 96);
      const frame = bridge.snapshot(room.engine, room.playerId); // Only AFTER same-binding assertions.
      if (scenario === 'private-friendly') assert(!frame.units.some(u => u.id === 'enemy'));
      else assert.equal(frame.units.find(u => u.id === 'enemy').hp, friendly ? 1 : 0);
      assert.equal(frame.events.filter(e => e.type === 'damage').length, friendly ? 0 : 1);
      const stale = room.engine.combat.hostFleet.botTargets, oldDTO = stale(0), saved = structuredClone(oldDTO);
      bridge.reset(room.engine);
      assert.deepEqual(stale(0), []); assert.deepEqual(oldDTO, saved);
      const fresh = room.engine.combat.hostFleet.botTargets;
      room.close();
      assert.throws(() => fresh(0), /disposed/); assert.throws(() => stale(0), /disposed/);
      assert.deepEqual(oldDTO, saved);
    } finally { room.close(); }
  }
  console.log('PASS accepted native Hydra: same-binding lethal freshness for both factions, friendly/private obstruction, immutable DTOs and reset/disposal (1 HP CPU fixture)');

  const fog = createLocalFleetConfig();
  fog.weather = { config: { seed: 42, allowedPresets: ['clear'], initialPreset: 'clear' },
    baseVisibility: { fogBase: .01, fogSea: 0, fogFalloff: 1 / 300 }, minimumTransmittance: .9 };
  for (const u of fog.units) for (const w of u.weapons) w.acquisition = 'visual';
  const hidden = fixture(fog);
  try {
    hidden.room.step(1 / 60);
    for (const team of [0, 1]) {
      const targets = hidden.room.engine.combat.hostFleet.botTargets(team);
      assert.equal(targets.length, 1); assert(targets.every(t => t.team === team), 'no hidden hostile pose or legacy substitute');
    }
  } finally { hidden.room.close(); }
  const unmodelled = createLocalFleetConfig(); unmodelled.geometry = [];
  // Anonymous legacy proxies, not narrowed measured ships; the negative needs legal water clearance.
  for (const u of unmodelled.units) { delete u.modelId; u.half = [10, 5, 30]; u.weapons = []; }
  const empty = fixture(unmodelled);
  try { empty.room.step(1 / 60); assert.deepEqual(empty.room.engine.combat.hostFleet.botTargets(0), []); }
  finally { empty.room.close(); }
  const ordinary = createLoopbackRoom({ teams: 2, bots: 0 }, 'Ordinary', { onMessage() {} }, { manual: true });
  try { ordinary.step(1 / 60); assert.equal(ordinary.engine.combat.hostFleet, undefined); }
  finally { ordinary.close(); }
  console.log('PASS real opaque-weather privacy, unmodelled empty contacts, reset/disposal and fresh ordinary isolation');
} finally { loader.dispose(); }
console.log('retained-fleet-targets-check: 4 actual integration groups PASS; native pixels/input unverified');
