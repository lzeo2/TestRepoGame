// Actual botInput, flight and accepted seat input. CPU fixtures, not RoomEngine FC wiring or gameplay.
import assert from 'node:assert/strict';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
const loader = installRetainedHostLoader();
try {
  const { botInput, createBotBrain, leadDirection, noseInto, applyAimSafety } = await import(new URL('src/sim/bots.ts', retainedRoot));
  const { createFlightState, quatFromYawPitchRoll, stepFlight } = await import(new URL('src/sim/flight.ts', retainedRoot));
  const { createWeapons, createCombatState, applySeatInput, ROCKET_GRAVITY } = await import(new URL('src/sim/combat.ts', retainedRoot));
  const { VEHICLES, WEAPONS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { setFleetState, carrierOf } = await import(new URL('src/sim/geography.ts', retainedRoot));
  const flat = { groundHeight: () => 0, onRunway: () => false, half: 20000, ceiling: 4000 };
  const make = (kind = 'f15', team = 0, position = [2000, 220, 2000]) => ({
    id: `${kind}-${team}`, kind, team, alive: true, spawnedAt: -100,
    flight: createFlightState(kind, { position, yaw: 0, onGround: false }),
    hp: VEHICLES[kind].maxHp, maxHp: VEHICLES[kind].maxHp, seats: ['pilot', 'officer'], aim: [null, null],
    weapons: createWeapons(kind), flareCount: 12, flaresReadyAt: 0, abilityReadyAt: 0,
    spottedUntil: 100, lastDamagedBy: null,
  });
  const contact = (id, team, position, aimPosition = position) => Object.freeze({ id, team, kind: 'surface', capital: true,
    position: Object.freeze([...position]), aimPosition: Object.freeze([...aimPosition]), bombAimRadius: 10 });
  const hostile = contact('fc-capital-not-native', 1, [2050, 0, 1250], [2080, 55, 1260]);
  const contacts = Object.freeze([hostile]);
  const brainFor = v => {
    const b = createBotBrain(3, 1);
    Object.assign(b.state, { vehicleId: v.id, phase: 'transit', role: 'strike', defender: true,
      jitterUntil: 100, jitterYaw: 0, jitterPitch: 0 });
    return b;
  };
  const run = (b, v, fleet = contacts, seat = 0, air = [], missiles = [], projectiles = [], world = flat) => botInput(b,
    { id: seat ? 'officer' : 'pilot', team: v.team, seat, vehicleId: v.id }, v, [v, ...air], 10,
    missiles, world, undefined, projectiles, true, fleet);
  const lead = (v, id, target = hostile) => {
    const out = [0, 0, 0], w = WEAPONS[id];
    leadDirection(v.flight.position, v.flight.velocity, target.aimPosition, [0, 0, 0], w.speed,
      w.kind === 'rockets' ? ROCKET_GRAVITY : 0, out);
    return out;
  };
  const face = (v, axis) => { v.flight.orientation = quatFromYawPitchRoll(Math.atan2(-axis[0], -axis[2]), Math.asin(axis[1]), 0); };
  const near = (a, b) => a.forEach((x, i) => assert(Math.abs(x - b[i]) < 1e-10, `${a} != ${b}`));
  const noShots = out => { assert.equal(out.seat.firePrimary, false); assert.equal(out.seat.fireSecondary, false); assert.equal(out.seat.steerBomb, false); };
  setFleetState(0, 2);
  assert(Math.hypot(carrierOf(1).position[0] - hostile.position[0], carrierOf(1).position[2] - hostile.position[2]) > 3000);
  const before = JSON.stringify(contacts);
  const v = make(), b = brainFor(v), expected = lead(v, 'cannon20');
  face(v, expected);
  const start = structuredClone(v.flight), out = run(b, v);
  assert.equal(b.state.strikeShip, hostile.id); assert.equal(b.state.phase, 'strike');
  near(out.seat.aim, expected); assert.equal(out.seat.firePrimary, true); assert.equal(out.seat.fireSecondary, false);
  assert(out.flight.aim.every(Number.isFinite)); assert(Math.abs(out.flight.throttle) <= 1);
  assert.deepEqual(v.flight, start, 'botInput only commands controls, never teleports');
  const cs = createCombatState(), events = [], ammo = v.weapons[0][0].ammo;
  applySeatInput(cs, v, 0, out.seat, [v], 10, events);
  assert.equal(v.weapons[0][0].ammo, ammo - 1); assert.equal(cs.projectiles.length, 1);
  assert.equal(cs.projectiles[0].weapon, 'cannon20'); assert.equal(cs.missiles.length, 0);
  stepFlight(v.flight, out.flight, 1 / 60, flat);
  assert.equal(v.flight.tick, start.tick + 1); assert.notDeepEqual(v.flight.position, start.position);
  assert.equal(JSON.stringify(contacts), before, 'frozen safe contacts unchanged');
  for (const state of [{ ammo: 0, readyAt: 0 }, { ammo: 10, readyAt: 11 }]) {
    const cold = make(); face(cold, lead(cold, 'cannon20')); Object.assign(cold.weapons[0][0], state);
    noShots(run(brainFor(cold), cold));
  }
  const away = make(); face(away, [0, 0, 1]); noShots(run(brainFor(away), away));
  const far = make(); far.flight.position[2] += 5000; noShots(run(brainFor(far), far));
  console.log('PASS measured FC deck lead differs from native carrier; real cannon ammo/projectile, native flight controls, readiness/cone/range, immutable contacts');

  const rocket = make('apache'); rocket.flight.velocity = [0, 0, 0]; face(rocket, lead(rocket, 'rockets'));
  const rockets = run(brainFor(rocket), rocket);
  near(rockets.seat.aim, lead(rocket, 'rockets')); assert.equal(rockets.seat.firePrimary, true);
  const rcs = createCombatState(), rammo = rocket.weapons[0][0].ammo;
  applySeatInput(rcs, rocket, 0, rockets.seat, [rocket], 10, []);
  assert.equal(rocket.weapons[0][0].ammo, rammo - 1); assert.equal(rcs.projectiles[0].weapon, 'rockets');
  const gau = make('warthog'); face(gau, lead(gau, 'gau8'));
  assert.equal(run(brainFor(gau), gau).seat.firePrimary, true);
  const gunner = make('apache'); gunner.flight.velocity = [0, 0, 0]; face(gunner, lead(gunner, 'chaingun30'));
  const gb = brainFor(gunner), gunout = run(gb, gunner, contacts, 1);
  near(gunout.seat.aim, lead(gunner, 'chaingun30')); assert.equal(gunout.seat.firePrimary, true);
  assert.equal(gunout.seat.fireSecondary, false, 'hellfire never substitutes for a FC gun');
  const air = make('fighter', 1, [2000, 220, 1300]);
  const airb = brainFor(gunner); run(airb, gunner, contacts, 1, [air]); assert.equal(airb.state.targetId, air.id);
  const threat = { id: 17, team: 1, target: gunner.id, position: [2000, 220, 1600] };
  noShots(run(brainFor(gunner), gunner, contacts, 1, [], [threat]));
  const db = brainFor(rocket); Object.assign(db.state, { threatId: 17, threatSeenAt: 0, threatDelay: 0 });
  run(db, rocket, contacts, 0, [], [{ ...threat, target: rocket.id }]); assert.equal(db.state.phase, 'defend');
  const scanner = make('blackbird'), sb = brainFor(scanner);
  sb.state.guideTargetId = air.id; sb.state.guideUntil = 20;
  run(sb, scanner, contacts, 1, [air], [{ id: 9, owner: 'officer', vehicle: scanner.id, team: 0, steered: true, scanTarget: air.id }]);
  assert.equal(sb.state.guideTargetId, air.id); assert.equal(sb.state.guideUntil, 10.5);
  console.log('PASS actual rocket/GAU-8/chaingun fits; accepted rocket ammo; gunner air/scanner and missile defence priority');

  const raider = make('fighter', 1, [6000, 800, 2000]);
  const friendly = contact('friendly-fc', 0, [6000, 0, 2200]);
  const defend = make(), defended = brainFor(defend);
  run(defended, defend, [hostile, friendly], 0, [raider]); assert.equal(defended.state.phase, 'engage');
  const notDefended = brainFor(defend); run(notDefended, defend, contacts, 0, [raider]);
  assert.equal(notDefended.state.phase, 'strike', 'no legacy friendly fleet substitution');
  Object.assign(notDefended.state, { strikePhase: 'egress', strikeUntil: 50 });
  noShots(run(notDefended, defend, []));
  assert.equal(notDefended.state.strikeShip, null); assert.equal(notDefended.state.strikePhase, 'approach');
  assert.equal(notDefended.state.strikeUntil, 0); assert.equal(notDefended.state.phase, 'transit');
  for (const remaining of [[], [friendly]]) {
    noShots(run(brainFor(gunner), gunner, remaining, 1));
    const stale = brainFor(defend); stale.state.strikeShip = 'removed-hidden-or-dead';
    run(stale, defend, remaining); assert.equal(stale.state.strikeShip, null);
  }
  console.log('PASS friendly FC proximity controls defence preference; empty/friendly-only/removed contacts clear cached strike with no native fallback');

  // Bombers now support fitted strikes, but this displaced prediction still must not release.
  for (const kind of ['bomber', 'tu160', 'blackbird', 'f15', 'f35', 'warthog']) {
    const unsupported = make(kind); unsupported.seats[1] = null;
    for (const rt of unsupported.weapons.flat()) if (rt) { rt.lock = 1; rt.lockTarget = 'ship:t1-carrier'; }
    const bomb = { id: 77, weapon: 'bomb', owner: 'pilot', vehicle: 'not-current', team: 0,
      age: 1, ttl: 30, position: [2000, 100, 2000], velocity: [0, -100, -150] };
    noShots(run(brainFor(unsupported), unsupported, contacts, 1, [], [], [{ ...bomb, owner: 'officer' }]));
    if (kind === 'bomber' || kind === 'tu160' || kind === 'blackbird') {
      const ub = brainFor(unsupported); noShots(run(ub, unsupported, contacts, 0, [], [], [bomb]));
      if (kind === 'blackbird') assert.equal(ub.state.phase, 'transit');
      for (const seat of [0, 1]) noShots(run(brainFor(unsupported), unsupported, [], seat, [], [], [bomb]));
    }
  }
  let eligible = 0;
  for (let seed = 0; seed < 20; seed++) {
    const fresh = make(), brain = createBotBrain(seed, 1);
    run(brain, fresh); if (brain.state.role === 'strike') eligible++;
  }
  assert(eligible > 0 && eligible < 20, 'gun-only F15 pilot can roll strike, not forced');
  for (const kind of Object.keys(VEHICLES)) for (const disabled of [false, true]) {
    const left = make(kind), right = structuredClone(left), a = createBotBrain(9, .7), z = createBotBrain(9, .7);
    const player = { id: 'pilot', team: 0, seat: 0, vehicleId: left.id };
    const x = botInput(a, player, left, [left], 10, [], flat, undefined, [], disabled);
    const y = botInput(z, player, right, [right], 10, [], flat, undefined, [], disabled, undefined);
    assert.deepEqual(x, y); assert.deepEqual(a.state, z.state); assert.deepEqual(left, right);
  }
  const hull = carrierOf(1).position, safeAim = [0, 0, -1];
  applyAimSafety(safeAim, [hull[0], 5, hull[2] + 200], [0, 0, -100], { ...flat, groundHeight: () => -1000 }, 0, 7, 0, false, true);
  assert(safeAim[1] > .1, 'native hull clearance remains');
  const terrain = [0, 0, -1];
  applyAimSafety(terrain, [0, 300, 0], [0, 0, -100], { ...flat, groundHeight: () => 500 }, 150, 7, 0, false, true);
  assert(terrain[1] > 0, 'supplied world overlay remains');
  console.log('PASS displaced bomber predictions/empty lists and unsupported missile fits fail closed; supported bomber positives in native-factions-ai-bombs-check; undefined API and physical clearance');
} finally { loader.dispose(); }
console.log('native-factions-targets-check: 4 CPU groups PASS; standalone bot controls, see retained-fleet-targets-check for RoomEngine/hits; native gameplay unverified');
