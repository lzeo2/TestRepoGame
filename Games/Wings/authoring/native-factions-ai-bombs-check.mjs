// Declared CPU approach/release/protection fixtures. Not natural AI flight or native play acceptance.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
const loader = installRetainedHostLoader();
const dt = 1 / 60;
try {
  const { botInput, createBotBrain, botRandom } = await import(new URL('src/sim/bots.ts', retainedRoot));
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const { createFlightState, bombImpactPoint, quatFromYawPitchRoll } = await import(new URL('src/sim/flight.ts', retainedRoot));
  const { createWeapons, applySeatInput, bombReleasePosition } = await import(new URL('src/sim/combat.ts', retainedRoot));
  const { VEHICLES } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { worldQuery } = await import(new URL('src/sim/geography.ts', retainedRoot));
  const { withFleetSurface } = await import(new URL('src/sim/fleet-world-query.ts', retainedRoot));
  const make = (kind = 'bomber') => ({ id: `${kind}-cpu`, kind, team: 0, alive: true, spawnedAt: -100,
    flight: createFlightState(kind, { position: [3500, 100, 1200], yaw: 0, onGround: false }),
    hp: VEHICLES[kind].maxHp, maxHp: VEHICLES[kind].maxHp, seats: ['pilot', null], aim: [null, null],
    weapons: createWeapons(kind), flareCount: 12, flaresReadyAt: 0, abilityReadyAt: 0, spottedUntil: 100, lastDamagedBy: null });
  const brainFor = v => {
    const b = createBotBrain(3, 1);
    Object.assign(b.state, { vehicleId: v.id, phase: 'transit', role: 'strike', defender: false,
      jitterUntil: 100, jitterYaw: 0, jitterPitch: 0 });
    return b;
  };
  const run = (v, targets, seat = 0, projectiles = [], world = worldQuery, brain = brainFor(v), now = 10) =>
    botInput(brain, { id: seat ? 'officer' : 'pilot', team: v.team, seat, vehicleId: v.id }, v, [v], now,
      [], world, undefined, projectiles, true, targets);
  const noRelease = out => { assert.equal(out.seat.firePrimary, false); assert.equal(out.seat.fireSecondary, false); };
  const predicted = (v, world = worldQuery, ammo = v.weapons[0][0].ammo) => {
    const p = [0, 0, 0];
    assert(bombImpactPoint(bombReleasePosition(v, ammo, [0, 0, 0]), v.flight.velocity, p, world) > 0);
    return p;
  };
  const contact = (p, radius = 10, team = 1) => Object.freeze({ id: 'measured-cpu', kind: 'surface', capital: true, team,
    position: Object.freeze([p[0], 0, p[2]]), aimPosition: Object.freeze([...p]), bombAimRadius: radius });

  // Exact executable base, imported under the retained loader, with original physics and source RNG.
  let base = execFileSync('git', ['show', '70f8fab8:Games/Wings/source/games/wings/src/sim/bots.ts'], { encoding: 'utf8' });
  base = base.replace(/from "(\.\/[^\"]+)"/g, (_, specifier) =>
    `from ${JSON.stringify(new URL(`${specifier}.ts`, new URL('src/sim/bots.ts', retainedRoot)).href)}`);
  const old = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(base, { mode: 'transform' })).toString('base64')}`);
  const originalKinds = ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35', 'f16c', 'mig29',
    'typhoon', 'su35s', 'rafale', 'jf17', 'gripen', 'mig31', 'mirage2000', 'su34', 'fa50', 'yak130',
    'hawkt2', 'su25sm', 'a10c', 'f35a', 'j20', 'tu160'];
  assert.deepEqual(Object.keys(VEHICLES), [...originalKinds, 'ah64d', 'mi28n']);
  let baselineVehicles = execFileSync('git', ['show', '70f8fab8:Games/Wings/source/games/wings/src/sim/vehicles.ts'], { encoding: 'utf8' });
  baselineVehicles = baselineVehicles.replace(/from "(\.[^\"]+)"/g, (_, specifier) =>
    `from ${JSON.stringify(new URL(specifier.endsWith('.json') ? specifier : `${specifier}.ts`, new URL('src/sim/vehicles.ts', retainedRoot)).href)}`);
  const priorVehicles = await import(`data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(baselineVehicles, { mode: 'transform' })).toString('base64')}`);
  assert.deepEqual(Object.keys(priorVehicles.VEHICLES), originalKinds, 'exact executable baseline twenty-five, no dropped parity cases');
  for (const kind of ['ah64d', 'mi28n']) assert.equal(VEHICLES[kind].flight, 'heli');
  // New helicopter class behavior is covered by native-helicopter-pair-check, not unknown-kind old bot behavior.
  let parity = 0;
  for (const kind of originalKinds) for (const disabled of [false, true]) for (const seat of [0, 1]) {
    const a = make(kind), z = structuredClone(a), b = createBotBrain(232, .7), c = old.createBotBrain(232, .7);
    a.seats[1] = z.seats[1] = 'officer';
    const player = { id: seat ? 'officer' : 'pilot', team: 0, seat, vehicleId: a.id };
    for (let tick = 0; tick < 12; tick++) {
      const args = [10 + tick / 10, [], worldQuery, undefined, [], disabled];
      assert.deepEqual(botInput(b, player, a, [a], ...args), old.botInput(c, player, z, [z], ...args));
      assert.deepEqual(b.state, c.state); assert.deepEqual(a, z); parity++;
    }
    assert.equal(botRandom(b), old.botRandom(c));
  }
  console.log(`PASS executable 70f8fab8 ordinary parity: ${parity} inputs, exact old25 prefix/both seats/AA modes, brain and RNG exact`);

  for (const kind of ['bomber', 'tu160']) for (const seat of [0, 1]) {
    const v = make(kind); v.seats[1] = seat ? 'officer' : null;
    v.flight.velocity = [0, -40, -100];
    const p = predicted(v), target = contact(p);
    assert.equal(run(v, [target], seat).seat.firePrimary, true, `${kind}/${seat} supported native bomb load`);
    if (!seat) {
      v.seats[1] = 'officer'; noRelease(run(v, [target], 0)); v.seats[1] = null;
    }
    for (const offset of [8.99, 9.01]) {
      const t = contact([p[0] + offset, p[1], p[2]]);
      assert.equal(run(v, [t], seat).seat.firePrimary, offset < 9, '.9 measured radius boundary');
    }
    for (const radius of [undefined, NaN, Infinity, 0, -1]) {
      const t = { ...target, bombAimRadius: radius }; noRelease(run(v, [t], seat));
    }
    for (const targets of [[], [contact(p, 10, 0)], [contact([p[0] + 5000, p[1], p[2]])]]) {
      const b = brainFor(v); Object.assign(b.state, { strikeShip: 'removed', strikePhase: 'egress', strikeUntil: 50 });
      const out = run(v, targets, seat, [], worldQuery, b); noRelease(out); assert.equal(out.seat.steerBomb, false);
      assert.notEqual(b.state.strikeShip, 'removed');
    }
    for (const cold of [{ ammo: 0, readyAt: 0 }, { ammo: 8, readyAt: 11 }]) {
      Object.assign(v.weapons[seat][0], cold); noRelease(run(v, [target], seat));
    }
    console.log(`PASS ${kind}/${seat}: release/radius edge, missing/invalid radius, empty/friendly/removed/far, ammo/cooldown`);
  }

  // Real host bridge, existing legal fleet geometry/HP/motion. Only initial CPU aircraft pose and
  // expired protection are supplied. No HP/ammo/timing grants, random search or repeated pose writes.
  for (const kind of ['bomber', 'tu160']) for (const seat of [0, 1]) {
    const config = createLocalFleetConfig();
    // Explicit legitimate bomber roster for this CPU fixture, preserving existing entries.
    if (!config.aircraft[0].some(a => a.id === kind)) config.aircraft[0].push({ id: kind, weapons: [] });
    const bridge = createRetainedHostBridge({ mode: 'factions', config,
      rosters: config.aircraft.map(r => r.map(a => a.id)) });
    const room = createLoopbackRoom({ teams: 2, bots: 0, timeLimit: 600 }, 'AI bomb CPU', { onMessage() {} },
      { manual: true, code: `ai-bomb-${kind}-${seat}`, hostBridge: bridge });
    try {
      room.send({ type: 'spawn', kind }); room.step(dt);
      const engine = room.engine, player = engine.players.get(room.playerId);
      const v = engine.vehicles.find(v => v.id === player.info.vehicleId); assert(v);
      const targets = engine.combat.hostFleet.botTargets(0), target = targets.find(t => t.team === 1); assert(target);
      const initial = bridge.snapshot(engine, room.playerId).units.find(u => u.id === target.id);
      const world = withFleetSurface(worldQuery, engine.combat.hostFleet.surfaceHeightAt);
      Object.assign(v.flight, { position: [target.aimPosition[0], 100, target.aimPosition[2] + 200],
        velocity: [0, -40, 0], orientation: quatFromYawPitchRoll(0, 0, 0), angularVelocity: [0, 0, 0],
        onGround: false, gearDown: false, crashed: null, throttle: .5 });
      v.spawnedAt = -100;
      // One deterministic translation sets the declared approach from native model-origin prediction.
      const landing = predicted(v, world);
      v.flight.position[0] += target.aimPosition[0] - landing[0];
      v.flight.position[2] += target.aimPosition[2] - landing[2];
      if (seat) { v.seats[0] = null; v.seats[1] = room.playerId; player.info.seat = 1; }
      const brain = brainFor(v), cs = engine.combat, now = engine.time, events = [];
      const input = botInput(brain, player.info, v, [v], now, [], world, cs.ships, cs.projectiles, true, targets);
      assert.equal(input.seat.firePrimary, true, `${kind}/${seat} initial declared release: ${JSON.stringify({
        prediction: predicted(v, world), target, seats: v.seats, weapons: v.weapons, phase: brain.state.phase })}`);
      applySeatInput(cs, v, seat, input.seat, [v], now, events);
      assert.equal(v.weapons[0][0].ammo, 7); assert.equal(v.weapons[1][0].ammo, 7, 'shared accepted ammo 8 -> 7');
      const bomb = cs.projectiles.find(p => p.weapon === 'bomb'); assert(bomb);
      assert.equal(bomb.owner, room.playerId); assert.equal(bomb.vehicle, v.id);
      assert.deepEqual(bomb.position, bombReleasePosition(v, 8, [0, 0, 0]));
      const guide = (projectiles, contacts = targets) => botInput(brainFor(v), player.info, v, [v], now, [], world, cs.ships, projectiles, true, contacts);
      assert.equal(guide([bomb]).seat.steerBomb, true, 'only actual accepted native bomb is a positive');
      assert.equal(guide([bomb], []).seat.steerBomb, false);
      assert.equal(guide([bomb], [{ ...target, team: 0 }]).seat.steerBomb, false);
      const fall = predicted(v, world);
      assert.equal(guide([bomb], [contact([fall[0] + 601, fall[1], fall[2]])]).seat.steerBomb, false,
        'existing 600m steering limit, no legacy fallback');
      for (const [object, key, value] of [[bomb, 'owner', 'foreign'], [bomb, 'vehicle', 'foreign'],
        [bomb, 'team', 1], [bomb, 'age', -1], [bomb, 'age', bomb.ttl + 1], [v, 'alive', false]]) {
        const saved = object[key]; object[key] = value;
        assert.equal(guide([bomb]).seat.steerBomb, false, `${key} steering guard`); object[key] = saved;
      }
      for (let i = 0; i < 240 && cs.projectiles.includes(bomb); i++) room.step(dt);
      const after = bridge.snapshot(engine, room.playerId), unit = after.units.find(u => u.id === target.id);
      assert(unit.hp < initial.hp, `${kind}/${seat} accepted AI bomb must reach actual fitted HP`);
      assert.notDeepEqual(unit.position, initial.position, 'real moving fleet target');
      assert(after.events.some(e => e.type === 'impact' && e.unit === target.id && e.source === `aircraft_${v.id}`));
      assert.equal(bomb.age, -1); assert(!cs.projectiles.includes(bomb));
      assert.equal(guide(cs.projectiles).seat.steerBomb, false, 'spent native round cannot guide');
      console.log(`PASS ${kind}/${seat} actual botInput -> applySeatInput -> RoomEngine stepCombat: ammo 8->7, moving fitted HP ${initial.hp}->${unit.hp} (declared CPU pose/protection fixture)`);
    } finally { room.close(); }
  }
  // All eight model stations, independent from the integration's first accepted round.
  const tu = make('tu160'); tu.flight.orientation = quatFromYawPitchRoll(.7, .2, -.1);
  const origins = new Set();
  for (let ammo = 8; ammo > 0; ammo--) {
    tu.weapons[0][0].ammo = tu.weapons[1][0].ammo = ammo;
    origins.add(JSON.stringify(bombReleasePosition(tu, ammo, [0, 0, 0])));
    const p = predicted(tu), t = contact(p, .01);
    assert.equal(run(tu, [t]).seat.firePrimary, true, `model station ${ammo} prediction`);
  }
  assert.equal(origins.size, 8);
  console.log('PASS eight rotated Tu160 model-origin predictions; producer privacy/reset/dead/no-model in retained-fleet-targets-check; direct/near authority in native-factions-bombs-check');
} finally { loader.dispose(); }
console.log('native-factions-ai-bombs-check: CPU fixtures only; natural/native AI bombing unverified');
