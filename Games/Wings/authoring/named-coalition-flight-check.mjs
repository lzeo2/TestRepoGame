// CPU fixtures in ordinary rooms, not NativeRenderer, pixels or human-input acceptance.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';
import { coalitionPair } from './coalition-rosters.mjs';
import { compileGeometry, fittedHit } from './fleet-geometry.mjs';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
import { HOST_FILES } from './retained-host-wiring.mjs';

const root = new URL('../../../', import.meta.url);
const output = 'docs/wings-local-native/sixteen-aircraft-coalition-flight.json';
const preflightOnly = process.argv.includes('--preflight');
const historicalReceipts = ['named-coalition-flight.json', 'expanded-coalition-flight.json', 'six-aircraft-coalition-flight.json', 'four-vessel-coalition-flight.json', 'eight-aircraft-coalition-flight.json', 'five-vessel-coalition-flight.json', 'ten-aircraft-coalition-flight.json', 'twelve-aircraft-coalition-flight.json', 'six-vessel-coalition-flight.json', 'thirteen-aircraft-coalition-flight.json', 'fourteen-aircraft-coalition-flight.json', 'fifteen-aircraft-coalition-flight.json']
  .map(file => { const path = `docs/wings-local-native/${file}`; return { path, sha256: shaFile(path) }; });
const declaredCases = [['nato', 'named-coalition-nato'], ['eastern', 'named-coalition-eastern'],
  ['nato', 'named-coalition-six-mixed']];
function shaFile(path) { return createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex'); }
const command = 'timeout 240s node Games/Wings/authoring/named-coalition-flight-check.mjs';
const started = performance.now();
const sha = value => createHash('sha256').update(value).digest('hex');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const paths = git(['ls-files', 'Games/Wings/source',
  'Games/Wings/authoring/*.mjs', 'Games/Wings/authoring/*.json',
  'Games/Wings/authoring/supplied-fighters', 'Games/Wings/models/derived',
  'Games/Wings/models/supplied', 'Games/Wings/models/*.glb']).split('\n');
paths.push('Games/Wings/authoring/named-coalition-flight-check.mjs');
const hashes = Object.fromEntries([...new Set(paths)].sort().map(path => [path, sha(readFileSync(new URL(path, root)))]));
const stdout = [];
const log = text => { stdout.push(text); console.log(text); };
const receipt = { command, head: git(['rev-parse', 'HEAD']), node: process.version,
  historicalReceipts, declaredCases,
  acceptance: { naturalStrikeAcceptance: false, battleOutcomeAcceptance: false, nativePixelsAcceptance: false },
  stdout, stdoutScope: 'All case summaries and final test status; receipt digest line excluded.',
  limits: { simulatedSecondsPerCase: 120, stepSeconds: 1 / 60, wallCommandSeconds: 240,
    scriptWallSeconds: 230, evidenceBytes: 1200000, projectileSamplesPerCase: 64,
    stop: '120 simulation seconds or actual authoritative match outcome only' },
  scope: 'CPU fixtures, ordinary room join, normal native carrier spawns and native bots. No human input, renderer, pixel or natural-strike acceptance.',
  correlationSemantics: 'Unchanged resolver returns fraction/position only. Every accepted segment must match a public authority impact by source, weapon, position and same host/authority tick. Actual event.unit determines membership/team. Friendly impacts consume the native round without damage; no target IDs are inferred. Current source applyImpact emits impact even for friendly consumption. Dual faction-safe snapshots preserve privacy; missing events fail correlation.',
  grants: [], hashes, glbCount: Object.keys(hashes).filter(path => path.endsWith('.glb')).length, cases: [] };
assert.equal(receipt.glbCount, 54, 'all current GLBs pinned');
const availableBytes = () => Number(execFileSync('df', ['-B1', '/', '--output=avail'], { encoding: 'utf8' }).trim().split('\n').at(-1).trim());
receipt.storageBeforeBytes = availableBytes();
assert(receipt.storageBeforeBytes >= 2147483648, 'strict 2 GiB disk floor');
const loader = installRetainedHostLoader();
let exitCode = 0;
try {
  const { VEHICLES, NATIVE_FIGHTER_MODELS, WEAPONS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
  const { ARMOR } = await import(new URL('src/sim/combat.ts', retainedRoot));
  const supplied = JSON.parse(readFileSync(new URL('Games/Wings/authoring/supplied-fighters/models.json', root))).assets;
  assert.equal(Object.keys(VEHICLES).length, 23);
  assert(Object.keys(VEHICLES).every(kind => Number.isFinite(ARMOR[kind]) && ARMOR[kind] > 0));
  assert.deepEqual(Object.entries(NATIVE_FIGHTER_MODELS).filter(([, model]) => Object.hasOwn(model, 'afterburning')).map(([kind]) => kind).sort(), ['a10c', 'f35a', 'hawkt2', 'su25sm', 'yak130']);
  for (const kind of ['a10c', 'f35a', 'hawkt2', 'su25sm', 'yak130']) assert.equal(NATIVE_FIGHTER_MODELS[kind].afterburning, false);
  for (const kind of ['a10c', 'su25sm', 'yak130']) assert.deepEqual(NATIVE_FIGHTER_MODELS[kind].exhausts.map(({ node, anchor }) => [node, anchor]), [
    ['exhaust_core_L', 'exhaust_L'], ['exhaust_core_R', 'exhaust_R']]);
  assert.deepEqual(NATIVE_FIGHTER_MODELS.su25sm.controls.map(({ node, axis, driver }) => [node, axis, driver]), [
    ['aileron_L', 'x', 'roll'], ['elevator_L', 'x', 'pitch'], ['aileron_R', 'x', 'roll'],
    ['elevator_R', 'x', 'pitch'], ['rudder_center', 'y', 'yaw']]);
  assert.deepEqual(NATIVE_FIGHTER_MODELS.a10c.controls.map(({ node, axis, driver }) => [node, axis, driver]), [
    ['aileron_L', 'x', 'roll'], ['elevator_L', 'x', 'pitch'], ['rudder_L', 'y', 'yaw'],
    ['aileron_R', 'x', 'roll'], ['elevator_R', 'x', 'pitch'], ['rudder_R', 'y', 'yaw']]);
  assert.deepEqual(VEHICLES.a10c.seatWeapons, [['gau8', 'aim9'], ['maverick', null]]);
  assert.equal(WEAPONS.gau8.id, 'gau8'); assert.equal(WEAPONS.gau8.kind, 'gun');
  assert.equal(WEAPONS.gau8.damage, 14); assert.equal(WEAPONS.gau8.rate, 30); assert.equal(WEAPONS.gau8.ammo, 1100);
  // F-35A opts out of afterburner visuals only; real engine afterburning is not modeled.
  assert.deepEqual(NATIVE_FIGHTER_MODELS.f35a.exhausts.map(({ node, anchor }) => [node, anchor]), [['exhaust_core', 'exhaust']]);
  assert.deepEqual(NATIVE_FIGHTER_MODELS.f35a.controls.map(({ node, axis, driver }) => [node, axis, driver]), [
    ['flaperon_L', 'x', 'roll'], ['tailplane_L', 'x', 'pitch'], ['flaperon_R', 'x', 'roll'],
    ['tailplane_R', 'x', 'pitch'], ['rudder_1', 'y', 'yaw'], ['rudder_2', 'y', 'yaw']]);
  assert(!NATIVE_FIGHTER_MODELS.f35a.native_pivots.includes('canopy'), 'canopy remains closed');
  assert.deepEqual(VEHICLES.f35a.seatWeapons, [['cannon20', 'aim9'], ['tvmissile', null]]);
  assert.deepEqual(NATIVE_FIGHTER_MODELS.hawkt2.exhausts.map(({ node, anchor }) => [node, anchor]), [['exhaust_core', 'exhaust']]);
  assert.deepEqual(NATIVE_FIGHTER_MODELS.hawkt2.controls.map(({ node, axis, driver }) => [node, axis, driver]), [
    ['elevon_L', 'x', 'roll'], ['tailplane_L', 'x', 'pitch'], ['elevon_R', 'x', 'roll'],
    ['tailplane_R', 'x', 'pitch'], ['rudder_1', 'y', 'yaw']]);
  receipt.registeredAircraft = Object.entries(NATIVE_FIGHTER_MODELS).map(([kind, model]) => {
    const source = supplied.find(asset => asset.model_id === model.source_model_id);
    assert(source, `${kind}: registered source ID exists in supplied metadata`);
    const sourceFile = `Games/Wings/models/supplied/${source.model_file.split('/').at(-1)}`;
    assert.equal(shaFile(sourceFile), model.source_sha256);
    assert.equal(shaFile(`Games/Wings/${model.file}`), model.sha256);
    assert(Number.isFinite(ARMOR[kind]) && ARMOR[kind] > 0);
    const gun = kind === 'a10c' ? 'gau8' : 'cannon20';
    assert.equal(VEHICLES[kind].seatWeapons[0][0], gun, `${kind}: exact native gun fit`);
    for (const id of VEHICLES[kind].seatWeapons.flat().filter(Boolean))
      assert(Object.hasOwn(WEAPONS, id) && WEAPONS[id].id === id, `${kind}: actual registered weapon only`);
    return { kind, model, sourceFile, sourceMetadata: source, armor: ARMOR[kind],
      vehicle: VEHICLES[kind], weapons: VEHICLES[kind].seatWeapons.map(seat => seat.map(id => id ? WEAPONS[id] : null)) };
  });
  assert.deepEqual(receipt.registeredAircraft.map(row => row.kind).sort(), ['a10c', 'f16c', 'f35a', 'fa50', 'gripen', 'hawkt2', 'jf17', 'mig29', 'mig31', 'mirage2000', 'rafale', 'su25sm', 'su34', 'su35s', 'typhoon', 'yak130']);
  const setups = declaredCases.map(([choice, code]) => {
    const config = createLocalFleetConfig(choice), profiles = coalitionPair(choice);
    const rosters = config.aircraft.map(row => row.map(aircraft => aircraft.id));
    assert.deepEqual(rosters, choice === 'nato' ? [['f16c', 'typhoon', 'rafale', 'gripen', 'mirage2000', 'fa50', 'hawkt2', 'a10c', 'f35a'], ['mig29', 'su35s', 'jf17', 'mig31', 'su34', 'yak130', 'su25sm']] : [['mig29', 'su35s', 'jf17', 'mig31', 'su34', 'yak130', 'su25sm'], ['f16c', 'typhoon', 'rafale', 'gripen', 'mirage2000', 'fa50', 'hawkt2', 'a10c', 'f35a']]);
    const result = { choice, code, rosters, profiles: profiles.map((profile, team) => {
      assert.deepEqual(rosters[team], profile.aircraft);
      const aircraft = rosters[team].map(kind => {
        const model = NATIVE_FIGHTER_MODELS[kind];
        assert(profile.aircraftModels.includes(model.source_model_id));
        assert.equal(VEHICLES[kind].model, model.file);
        return { kind, source: model.source_model_id, model: model.file, sha256: model.sha256 };
      });
      assert.deepEqual(profile.vessels.map(v => [v.id, v.capital]), profile.id === 'nato'
        ? [['type45', true], ['aquitaine', false], ['cb90', false]] : [['type054a', true], ['type055', false], ['type022', false]]);
      const units = config.units.filter(unit => unit.team === team);
      assert.equal(units.length, 3);
      assert.equal(units.filter(unit => unit.capital).length, 1);
      const vessels = profile.vessels.map(vessel => {
        const unit = units.find(unit => unit.modelId === vessel.id);
        assert(unit && profile.vesselModels.includes(vessel.source));
        assert.equal(unit.capital, vessel.capital);
        assert.equal(unit.id, (team === 0 ? 'home' : 'enemy') + (vessel.capital ? '' : vessel.id === 'cb90' ? '-cb90' : vessel.id === 'type022' ? '-type022' : '-escort'));
        assert.equal(unit.kind, 'surface');
        const descriptor = config.geometry.find(g => g.id === unit.modelId)?.descriptor;
        assert.equal(descriptor?.source_model_id, vessel.source);
        const source = supplied.find(asset => asset.model_id === vessel.source);
        assert(source && vessel.name.length > 0);
        assert.equal(descriptor.source_sha256, source.sha256);
        const file = `Games/Wings/${descriptor.file}`;
        assert(file in hashes, 'actual vessel GLB is tracked and pinned');
        assert.equal(shaFile(file), descriptor.sha256);
        const rawFile = `Games/Wings/models/supplied/${source.model_file.split('/').at(-1)}`;
        const sourceFile = rawFile in hashes ? rawFile : null;
        if (sourceFile) assert.equal(shaFile(sourceFile), descriptor.source_sha256);
        else assert(['type45', 'type054a'].includes(vessel.id), 'new supplied vessel raw GLB must be tracked and pinned');
        const geometry = compileGeometry(descriptor);
        assert(geometry.boxes.length > 0);
        assert.equal(descriptor.player_vehicle_kind, null);
        if (['cb90', 'type022'].includes(vessel.id)) {
          assert(!Object.hasOwn(VEHICLES, vessel.id), 'unarmed boat is not a native player vehicle kind');
          assert.equal(unit.capital, false);
          assert.deepEqual(unit.weapons, []); assert.equal(unit.sensor, null);
          assert.equal(descriptor.main_gun_geometry, null); assert.equal(geometry.gun, null);
          assert.deepEqual(descriptor.launch_origins, []); assert.deepEqual(geometry.launches, []);
          assert.deepEqual(descriptor.supported_runtime_weapon_capabilities, []);
          if (vessel.id === 'cb90') {
            assert.equal(geometry.controls.length, 1);
            assert.equal(geometry.controls[0].node, 'bow_ramp_pitch');
            assert.deepEqual(geometry.controls[0].limits_rad, [0, 0]);
          } else {
            assert.deepEqual(geometry.controls, []);
            assert.deepEqual(descriptor.articulation, []);
            assert.equal(geometry.boxes.length, 5, 'two pontoons, deck and two cabins');
            const pontoons = geometry.boxes.filter(b => b.min[1] < 0 && b.max[1] > 0);
            assert.equal(pontoons.length, 2);
            assert(pontoons.some(b => b.max[0] < 0) && pontoons.some(b => b.min[0] > 0));
            assert.equal(fittedHit(geometry, [0, 0, geometry.clearance.min[2] - 5],
              [0, 0, geometry.clearance.max[2] + 5], [0, 0, 0], 0), null, 'waterline tunnel remains empty');
          }
        } else {
          assert(geometry.gun, 'old four armed vessels retain measured guns');
          assert.deepEqual(unit.weapons, createLocalFleetConfig().units[0].weapons);
        }
        return { ...vessel, unit: unit.id, file, sha256: descriptor.sha256, sourceFile,
          sourceSha256: descriptor.source_sha256, geometryBoxes: geometry.boxes.length,
          controls: geometry.controls, armed: geometry.gun !== null };
      });
      return { team, coalition: profile.id, aircraft, aircraftModels: profile.aircraftModels,
        vesselModels: profile.vesselModels, vessels };
    }), units: structuredClone(config.units), projectileCount: 0, projectileSamples: [], impacts: [],
      friendlyConsumptions: [], damage: 0, nativeFire: {}, fleetGunFire: Object.fromEntries(config.units.map(u => [u.id, 0])), crewRides: [], aircraft: [] };
    assert.deepEqual(config.units.map(unit => unit.id), choice === 'nato'
      ? ['home', 'home-escort', 'home-cb90', 'enemy', 'enemy-escort', 'enemy-type022']
      : ['home', 'home-escort', 'home-type022', 'enemy', 'enemy-escort', 'enemy-cb90']);
    assert.equal(config.geometry.length, 6);
    assert.equal(new Set(config.units.map(unit => unit.modelId)).size, 6);
    return { choice, code, config, rosters, result };
  });
  receipt.staticPreflight = { passed: true, scenarios: setups.length, vesselIdentities: 6, glbs: receipt.glbCount };
  if (preflightOnly) {
    log('PASS write-free static preflight: three fixed cases, sixteen aircraft, six vessel identities, 54 tracked GLBs, source hashes, capitals, unarmed boats and distinct controls; no simulation.');
  } else {
  const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
  const { DEFAULT_ROOM_CONFIG } = await import(new URL('src/sim/protocol.ts', retainedRoot));
  for (const { choice, code, config, rosters, result } of setups) {
    const bridge = createRetainedHostBridge({ mode: 'factions', config, rosters });
    const records = new Map(), births = new WeakMap(), seenEvents = new Set(), pending = [];
    const projectileDigest = createHash('sha256');
    receipt.cases.push(result);
    let restore = () => {}, room;
    const observer = { ...bridge,
      beforeStep(host) {
        restore();
        bridge.beforeStep(host);
        const binding = host.combat.hostFleet, original = binding.resolveProjectile;
        binding.resolveProjectile = function(projectile, ...args) {
          let birth = births.get(projectile);
          if (!birth && !projectile.ship) {
            const player = host.players.get(projectile.owner);
            assert(player?.info.bot, 'native aircraft projectile owner is a real bot');
            assert.equal(player.info.vehicleId, projectile.vehicle);
            assert(projectile.age <= 1 / 60 + 1e-8, 'capture launch callback including immediate impacts');
            const vehicle = host.vehicles.find(v => v.id === projectile.vehicle);
            assert(rosters[projectile.team].includes(vehicle.kind));
            assert(Object.hasOwn(WEAPONS, projectile.weapon), 'actual registered projectile weapon');
            assert.equal(WEAPONS[projectile.weapon].kind, 'gun');
            assert.equal(projectile.weapon, VEHICLES[vehicle.kind].seatWeapons[0][0], 'exact legal native kind gun, no normalized labels');
            birth = Object.freeze({ nativeProjectileID: projectile.id, owner: projectile.owner,
              vehicle: projectile.vehicle, team: projectile.team, kind: vehicle.kind, weapon: projectile.weapon,
              launchTick: host.tick, ageAtFirstCallback: projectile.age, phase: player.brain.state.phase,
              strikePhase: player.brain.state.strikePhase, strikeShip: player.brain.state.strikeShip,
              position: Object.freeze([...args[0]]) });
            births.set(projectile, birth); result.projectileCount++;
            projectileDigest.update(JSON.stringify(birth) + '\n');
            if (result.projectileSamples.length < 64) result.projectileSamples.push(birth);
          }
          const hit = original.call(this, projectile, ...args);
          assert.strictEqual(host.combat.hostFleet, binding, 'original binding identity retained');
          if (hit && birth) {
            assert(Number.isFinite(hit.fraction) && hit.fraction >= 0 && hit.fraction < args[2]);
            const expected = args[0].map((n, i) => n + (args[1][i] - n) * hit.fraction);
            assert.deepEqual([...hit.position], expected, 'original accepted fraction determines position');
            pending.push(Object.freeze({ ...birth, hitTick: host.tick, fraction: hit.fraction,
              from: Object.freeze([...args[0]]), to: Object.freeze([...args[1]]), maxFraction: args[2],
              hitPhase: host.players.get(birth.owner)?.brain?.state.phase ?? null,
              hitStrikePhase: host.players.get(birth.owner)?.brain?.state.strikePhase ?? null,
              position: Object.freeze([...hit.position]) }));
          }
          return hit;
        };
        restore = () => { binding.resolveProjectile = original; assert.strictEqual(binding.resolveProjectile, original); };
      },
      afterStep(host) { try { return bridge.afterStep(host); } finally { restore(); } },
    };
    try {
      room = createLoopbackRoom({ ...DEFAULT_ROOM_CONFIG, teams: 2, bots: 2, botFill: 0,
        listed: false, timeLimit: config.matchMs / 1000 }, 'Named coalition CPU', {
        onMessage(message) {
          if (message.type !== 'events') return;
          for (const event of message.events) if (event.type === 'fire') {
            const row = records.get(event.vehicle);
            if (row) {
              assert(Object.hasOwn(WEAPONS, event.weapon) && VEHICLES[row.kind].seatWeapons.flat().includes(event.weapon), 'native fire retains exact registered kind fit');
              row.nativeFire[event.weapon] = (row.nativeFire[event.weapon] ?? 0) + 1;
              result.nativeFire[event.weapon] = (result.nativeFire[event.weapon] ?? 0) + 1; }
          }
        },
      }, { manual: true, code, hostBridge: observer });
      result.roomConfig = { ...room.engine.config };
      assert.equal(room.engine.config.botSkill, undefined, 'retain native default skill');
      for (let tick = 0; tick < 7200 && room.engine.matchEndedAt === null; tick++) {
        assert(performance.now() - started < 230000, 'bounded CPU wall time');
        room.step(1 / 60);
        const host = room.engine;
        for (const vehicle of host.vehicles) {
          assert(rosters[vehicle.team].includes(vehicle.kind), 'every native spawn is roster legal');
          let row = records.get(vehicle.id);
          if (!row) {
            row = { id: vehicle.id, kind: vehicle.kind, team: vehicle.team, birthTick: host.tick,
              start: [...vehicle.flight.position], spawnedOnGround: vehicle.flight.onGround,
              end: [], phases: {}, firstPhases: {}, maxAltitude: vehicle.flight.position[1],
              maxDistance: 0, airborneTicks: 0, minContactDistance: null, nativeFire: {},
              initialHP: vehicle.hp, hp: vehicle.hp, minHP: vehicle.hp,
              initialAmmo: vehicle.weapons.flat().map(w => w?.ammo ?? null), ammo: [], ammoSpent: 0,
              samples: [], alive: vehicle.alive };
            row.ammo = [...row.initialAmmo]; records.set(vehicle.id, row);
          }
          assert(records.size <= 64, 'bounded native births');
          const position = vehicle.flight.position;
          assert(position.every(Number.isFinite));
          row.end = [...position]; row.alive = vehicle.alive;
          row.hp = vehicle.hp; row.minHP = Math.min(row.minHP, vehicle.hp);
          row.maxAltitude = Math.max(row.maxAltitude, position[1]);
          row.maxDistance = Math.max(row.maxDistance, Math.hypot(...position.map((n, i) => n - row.start[i])));
          if (vehicle.alive && !vehicle.flight.onGround) row.airborneTicks++;
          const ammo = vehicle.weapons.flat().map(w => w?.ammo ?? null);
          ammo.forEach((n, i) => { if (n !== null && row.ammo[i] !== null && n < row.ammo[i]) row.ammoSpent += row.ammo[i] - n; });
          row.ammo = ammo;
          for (const id of vehicle.seats.filter(Boolean)) {
            const player = host.players.get(id);
            assert.equal(player.info.team, vehicle.team, 'all crew rides are roster/team legal');
            assert.equal(player.info.vehicleId, vehicle.id);
            if (!result.crewRides.some(r => r.player === id && r.vehicle === vehicle.id))
              result.crewRides.push({ player: id, vehicle: vehicle.id, team: vehicle.team, kind: vehicle.kind, bot: player.info.bot, seat: player.info.seat, tick: host.tick });
            if (!player.brain || player.info.seat !== 0) continue;
            const state = player.brain.state;
            assert.equal(state.skill, 0.5, 'native default skill, no grants');
            row.phases[state.phase] = (row.phases[state.phase] ?? 0) + 1;
            row.firstPhases[state.phase] ??= host.tick;
            if (state.strikeShip) assert(config.units.some(unit => unit.id === state.strikeShip && unit.team !== vehicle.team));
            const target = host.combat.hostFleet.botTargets(vehicle.team).find(t => t.team !== vehicle.team);
            if (target) { const distance = Math.hypot(...target.aimPosition.map((n, i) => n - position[i]));
              row.minContactDistance = Math.min(row.minContactDistance ?? Infinity, distance); }
            if (tick % 600 === 0) row.samples.push({ tick: host.tick, phase: state.phase,
              strikePhase: state.strikePhase, target: state.targetId, strikeShip: state.strikeShip,
              position: [...position], onGround: vehicle.flight.onGround });
          }
        }
        const frames = [0, 1].map(team => {
          const player = [...host.players.values()].find(player => player.info.team === team);
          assert(player, 'actual faction principal for safe snapshot');
          return bridge.snapshot(host, player.info.id);
        });
        const frame = frames[0];
        assert.deepEqual(frames[0].outcome, frames[1].outcome);
        result.outcome = frame.outcome;
        const hulls = [...new Map(frames.flatMap(f => f.units).map(u => [u.id, u])).values()];
        assert.equal(hulls.length, 6, 'actual surface dual-safe snapshots contain all production vessels');
        result.hulls = hulls.map(u => {
          const unit = config.units.find(unit => unit.id === u.id);
          assert(unit && unit.team === u.team && unit.modelId === u.modelId && unit.capital === u.capital);
          return { id: u.id, team: u.team, modelId: u.modelId, capital: u.capital, hp: u.hp, alive: u.alive };
        });
        const events = [...new Map(frames.flatMap(f => f.events).map(event => [event.id, event])).values()].sort((a, b) => a.id - b.id);
        for (const event of events) {
          if (seenEvents.has(event.id)) continue;
          seenEvents.add(event.id);
          if (event.type === 'fire' && Object.hasOwn(result.fleetGunFire, event.source)) {
            result.fleetGunFire[event.source]++;
            assert(!['cb90', 'type022'].includes(config.units.find(u => u.id === event.source).modelId), 'both unarmed boats never fire');
          }
          if (!event.source?.startsWith('aircraft_')) continue;
          if (event.type === 'impact') {
            const index = pending.findIndex(hit => event.source === `aircraft_${hit.vehicle}` &&
              hit.weapon === event.weapon && hit.hitTick === host.tick && hit.position.every((n, i) => n === event.position[i]));
            assert(index >= 0, 'FC impact matches original native projectile, owner, weapon, position and tick');
            const [hit] = pending.splice(index, 1);
            const unit = config.units.find(unit => unit.id === event.unit);
            assert(unit && hulls.some(hull => hull.id === unit.id && hull.team === unit.team && hull.modelId === unit.modelId));
            assert.equal(event.team, hit.team); assert.equal(event.tick, frame.tick);
            const correlated = { ...hit, authorityTick: event.tick, impactEvent: event.id,
              source: event.source, unit: event.unit, unitTeam: unit.team, modelId: unit.modelId, capital: unit.capital };
            if (unit.team === hit.team) result.friendlyConsumptions.push({ ...correlated, damage: 0 });
            else result.impacts.push(correlated);
          } else if (event.type === 'damage') {
            const hit = result.impacts.find(h => h.impactEvent === event.id - 1 && h.unit === event.unit && h.authorityTick === event.tick && `aircraft_${h.vehicle}` === event.source && h.weapon === event.weapon);
            assert(hit && event.damage > 0, 'damage pairs with accepted native projectile');
            hit.damage = event.damage; result.damage += event.damage;
          }
        }
        assert.equal(pending.length, 0, 'all accepted resolver hits correlate to FC impacts');
        await Promise.resolve();
      }
      result.seconds = room.engine.time; result.tick = room.engine.tick;
      result.matchEndedAt = room.engine.matchEndedAt;
      result.stopReason = result.matchEndedAt === null ? 'simulation-limit' : 'authoritative-match-outcome';
      if (result.matchEndedAt === null) {
        assert.equal(result.tick, 7200, 'full production case without an outcome');
        assert(Math.abs(result.seconds - 120) < 1e-7, 'full 120 simulation seconds');
        assert.equal(result.outcome, null, 'no unacknowledged authoritative outcome');
      } else {
        assert(result.outcome, 'early stop requires actual authoritative outcome, not null victory');
        assert.equal(result.matchEndedAt, result.seconds, 'stop immediately at actual match end');
        assert(result.tick <= 7200 && result.seconds <= 120 + 1e-7);
      }
      result.botCount = room.engine.botCount(); assert.equal(result.botCount, 4);
      result.botsByTeam = [0, 1].map(team => [...room.engine.players.values()].filter(p => p.info.bot && p.info.team === team).length);
      assert.deepEqual(result.botsByTeam, [2, 2]);
      const human = room.engine.players.get(room.playerId).info;
      assert.equal(human.vehicleId, null, 'human normal join, no input or forced spawn');
      result.human = { team: human.team, vehicleId: human.vehicleId, inputSent: false };
      result.aircraft = [...records.values()];
      result.phaseTicks = {};
      for (const row of result.aircraft) for (const [phase, ticks] of Object.entries(row.phases))
        result.phaseTicks[phase] = (result.phaseTicks[phase] ?? 0) + ticks;
      result.ammoSpent = result.aircraft.reduce((sum, row) => sum + row.ammoSpent, 0);
      result.projectileDigest = projectileDigest.digest('hex');
      result.impactCount = result.impacts.length;
      result.friendlyConsumptionCount = result.friendlyConsumptions.length;
      result.acceptedSegmentCount = result.impactCount + result.friendlyConsumptionCount;
      result.hitsByVessel = config.units.map(unit => ({ id: unit.id, modelId: unit.modelId, team: unit.team,
        damaging: result.impacts.filter(hit => hit.unit === unit.id).length,
        friendlyConsumed: result.friendlyConsumptions.filter(hit => hit.unit === unit.id).length }));
      assert(result.impacts.every(hit => hit.damage > 0), 'every accepted impact retains paired positive damage');
      result.naturalStrikeAcceptance = false;
      result.movementByKind = rosters.flat().map(kind => ({ kind, births: result.aircraft.filter(r => r.kind === kind).length,
        airborneMoving: result.aircraft.filter(r => r.kind === kind && r.airborneTicks > 60 && r.maxDistance > 100).length }));
      result.movementByTeam = [0, 1].map(team => ({ team,
        airborneMoving: result.aircraft.filter(r => r.team === team && r.airborneTicks > 60 && r.maxDistance > 100).length }));
      result.firstBlockedPhase = result.movementByTeam.some(r => r.airborneMoving === 0) ? 'takeoff' : null;
      log(JSON.stringify({ choice, code, seconds: result.seconds, ticks: result.tick, stopReason: result.stopReason, births: records.size,
        movement: result.movementByKind, projectiles: result.projectileCount, impacts: result.impactCount,
        damage: result.damage, outcome: result.outcome }));
    } catch (error) {
      result.error = String(error);
      result.seconds = room?.engine.time ?? null; result.tick = room?.engine.tick ?? null;
      result.matchEndedAt = room?.engine.matchEndedAt ?? null;
      result.stopReason = performance.now() - started >= 230000 ? 'wall-budget-FAIL' : 'observer-FAIL';
      result.aircraft = [...records.values()];
      throw error;
    } finally { restore(); room?.close(); }
  }
  assert.deepEqual([...loader.loaded].sort(), [...HOST_FILES].sort(), 'all actual retained native hooks loaded');
  for (const [path, hash] of Object.entries(hashes))
    assert.equal(sha(readFileSync(new URL(path, root))), hash, `source/tool unchanged: ${path}`);
  for (const { path, sha256 } of historicalReceipts)
    assert.equal(shaFile(path), sha256, `historical receipt remains byte-exact: ${path}`);
  receipt.historicalReceiptsUnchanged = true;
  receipt.sourceAndToolsUnchanged = true;
  receipt.movementAcrossCases = receipt.registeredAircraft.map(({ kind }) => ({ kind,
    births: receipt.cases.reduce((sum, result) => sum + result.movementByKind.find(row => row.kind === kind).births, 0),
    airborneMoving: receipt.cases.reduce((sum, result) => sum + result.movementByKind.find(row => row.kind === kind).airborneMoving, 0) }));
  receipt.blockedKinds = receipt.movementAcrossCases.filter(row => row.airborneMoving === 0).map(row => ({ ...row,
    firstBlockedPhase: row.births === 0 ? 'spawn' : 'takeoff' }));
  for (const result of receipt.cases)
    assert(result.movementByTeam.every(row => row.airborneMoving > 0), `${result.choice}: a team lacks ordinary airborne movement`);
  assert.equal(receipt.blockedKinds.length, 0, 'registered kinds lacking ordinary airborne movement across three fixed cases; inspect blockedKinds');
  log('PASS sixteen-aircraft/six-vessel coalition legal native spawns and all sixteen kinds airborne across three fixed production cases; CPU only, zero impacts allowed.');
  }
} catch (error) {
  exitCode = 1; receipt.error = String(error); console.error(String(error));
} finally {
  receipt.loadedNativeHooks = [...loader.loaded].sort(); loader.dispose();
  receipt.hashesAfter = Object.fromEntries(Object.keys(hashes).map(path => [path, shaFile(path)]));
  receipt.sourceAndToolsUnchanged = Object.entries(hashes).every(([path, hash]) => receipt.hashesAfter[path] === hash);
  receipt.historicalReceiptsAfter = historicalReceipts.map(({ path }) => ({ path, sha256: shaFile(path) }));
  receipt.historicalReceiptsUnchanged = historicalReceipts.every(({ path, sha256 }, i) =>
    receipt.historicalReceiptsAfter[i].path === path && receipt.historicalReceiptsAfter[i].sha256 === sha256);
  if (!receipt.sourceAndToolsUnchanged || !receipt.historicalReceiptsUnchanged) {
    exitCode = 1; receipt.integrityError = 'Source/tool/model or historical receipt changed during command';
  }
  receipt.glbCountAfter = git(['ls-files', 'Games/Wings/models/*.glb']).split('\n').filter(Boolean).length;
  if (receipt.glbCountAfter !== 54) { exitCode = 1; receipt.integrityError = 'Tracked GLB count changed'; }
  receipt.storageAfterBytes = availableBytes();
  receipt.exitCode = exitCode; receipt.durationSeconds = (performance.now() - started) / 1000;
  receipt.stdoutSha256 = sha(stdout.join('\n') + '\n');
  const text = JSON.stringify(receipt, null, 2) + '\n';
  assert(Buffer.byteLength(text) < 1200000, 'bounded evidence JSON; do not truncate positive checks');
  if (!preflightOnly) {
    assert(receipt.storageAfterBytes >= 2147483648, 'strict 2 GiB disk floor before receipt write');
    writeFileSync(new URL(output, root), text, { flag: 'wx' });
    console.log(`receipt=${output} sha256=${sha(text)} exit=${exitCode} duration=${receipt.durationSeconds.toFixed(3)}s`);
  }
  process.exitCode = exitCode;
}
