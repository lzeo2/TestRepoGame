// CPU mechanical aircraft poses below are NOT native-input, rendering or flight acceptance.
import assert from 'node:assert/strict';
import { createLocalFleetConfig, LOCAL_MODEL_ASSETS } from './local-host-scenario.mjs';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { compileGeometry, clearanceBounds, mountPose } from './fleet-geometry.mjs';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';

const loader = installRetainedHostLoader();
const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
const { TICK_DT } = await import(new URL('src/sim/types.ts', retainedRoot));
const { stepCombat, createCombatState } = await import(new URL('src/sim/combat.ts', retainedRoot));
const { WEAPONS } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
const { isWater, terrainHeight, setFleetState, spawnPoint, posedFleet } = await import(new URL('src/sim/geography.ts', retainedRoot));
const { SHIP_DAMAGE_SCALE } = await import(new URL('src/sim/fleet.ts', retainedRoot));
const config = createLocalFleetConfig();
const geometry = new Map(config.geometry.map(e => [e.id, compileGeometry(e.descriptor)]));
const near = (a, b, epsilon = 1e-6) => assert(a.every((n, i) => Math.abs(n - b[i]) < epsilon), `${a} != ${b}`);
let groups = 0;
async function check(name, body) { await body(); groups++; console.log(`PASS ${name}`); }
function setup() {
  const frames = [], messages = [];
  const bridge = createRetainedHostBridge({ mode: 'factions', config: createLocalFleetConfig(),
    rosters: config.aircraft.map(r => r.map(p => p.id)), onSnapshot: (id, snapshot) => frames.push([id, snapshot]) });
  const room = createLoopbackRoom({ bots: 0, botFill: false, teams: 2, timeLimit: 180 }, 'Local scenario',
    { onMessage: m => messages.push(m) }, { manual: true, hostBridge: bridge });
  return { room, bridge, frames, messages, snapshot: () => bridge.snapshot(room.engine, room.playerId) };
}
// Scan the full conservative measured footprint, not only the unit center or guessed proxy half.
function sea(position, heading, g) {
  const b = clearanceBounds(g, heading);
  const axis = (min, max) => Array.from({ length: Math.ceil((max - min) / 5) + 1 },
    (_, i) => min + (max - min) * i / Math.ceil((max - min) / 5));
  for (const x of axis(b.min[0], b.max[0])) for (const z of axis(b.min[2], b.max[2])) {
    const wx = position[0] + x, wz = position[2] + z;
    assert(terrainHeight(wx, wz) < 0, `terrain at ${wx},${wz}`);
    assert(isWater(wx, wz), `native ship/deck at ${wx},${wz}`);
  }
}

try {
  await check('fresh scenario uses actual descriptors, 2800m starts, 1000HP and all seven host-only aircraft profiles', () => {
    assert.equal(config.units.length, 2);
    assert.equal(Math.hypot(...config.units[0].position.map((n, i) => n - config.units[1].position[i])), 2800);
    for (const [i, asset] of LOCAL_MODEL_ASSETS.entries()) {
      assert.equal(asset.url, asset.descriptor.file);
      assert(asset.url.startsWith('models/derived/'));
      assert.deepEqual(config.geometry[i], { id: asset.id, descriptor: asset.descriptor });
      assert(config.units[i].capital); assert.equal(config.units[i].hp, 1000);
      assert.equal(config.units[i].modelId, asset.id);
      assert.equal(config.units[i].weapons[0].mount, 'main_gun');
      assert.equal(config.units[i].sensor, null);
      assert.deepEqual(config.aircraft[i].map(p => p.id), ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35']);
      assert(config.aircraft[i].every(p => p.weapons.length === 0));
    }
    const fresh = createLocalFleetConfig(); fresh.geometry[0].descriptor.bounds.min[0] = -999;
    assert.notDeepEqual(fresh, config); assert.deepEqual(createLocalFleetConfig(), config);
  });

  await check('full measured hull footprints and complete approach routes occupy actual native sea at t0', () => {
    setFleetState(0, 2);
    for (const u of config.units) {
      const end = u.route[0], count = Math.ceil(Math.hypot(end[0] - u.position[0], end[2] - u.position[2]) / 5);
      const heading = Math.atan2(-(end[0] - u.position[0]), -(end[2] - u.position[2]));
      for (let i = 0; i <= count; i++) {
        const p = u.position.map((n, j) => n + (end[j] - n) * i / count);
        sea(p, heading, geometry.get(u.modelId));
      }
      sea(u.position, u.heading, geometry.get(u.modelId));
    }
  });

  await check('native deck spawn preserved; real buffered player cannon damages actual 1000HP fitted objective', async () => {
    const f = setup();
    try {
      const player = f.room.engine.players.get(f.room.playerId);
      const nativeSpawn = spawnPoint(0, 'fighter', 0);
      f.room.send({ type: 'spawn', kind: 'fighter' });
      const v = f.room.engine.vehicles.find(v => v.id === player.info.vehicleId);
      assert(v); near(v.flight.position, nativeSpawn.position); assert(v.flight.onGround);
      const initial = v.weapons[0][0].ammo; let seq = 0;
      // Mechanical host-position fixture, production config/objective HP/damage are unchanged.
      const tick = fire => {
        Object.assign(v.flight, { position: [config.units[1].position[0], 4, config.units[1].position[2] + 220], velocity: [0, 0, -135],
          orientation: [0, 0, 0, 1], angularVelocity: [0, 0, 0], onGround: false,
          gearDown: false, crashed: null, throttle: 0.5 });
        v.spawnedAt = -100;
        f.room.send({ type: 'input', seq: seq++, seat: { aim: [0, 0, -1], firePrimary: fire,
          fireSecondary: false, flares: false, ability: false, viewDelay: 0 } });
        f.room.step(TICK_DT);
      };
      tick(true); assert.equal(v.weapons[0][0].ammo, initial, 'real input jitter buffer');
      tick(true); assert.equal(v.weapons[0][0].ammo, initial - 1);
      for (let i = 0; i < 38; i++) tick(true);
      const snapshot = f.snapshot(), target = snapshot.units.find(u => u.id === 'enemy');
      assert(target.hp < 1000, 'actual fitted hull must take accepted player cannon damage');
      const damage = snapshot.events.filter(e => e.type === 'damage' && e.unit === 'enemy');
      assert(damage.length > 0);
      assert(damage.every(e => e.source === `aircraft_${v.id}` && e.weapon === 'cannon20' &&
        e.team === 0 && e.damage === WEAPONS.cannon20.damage * SHIP_DAMAGE_SCALE.gun));
      assert(f.frames.some(([id, s]) => id === f.room.playerId && s.units.find(u => u.id === 'enemy').hp < 1000));
      await Promise.resolve();
      assert(!f.messages.some(m => m.type === 'events' && m.events.some(e => e.type === 'aa')));
      console.log(`  real cannon: ammo ${initial}->${v.weapons[0][0].ammo}, enemy HP 1000->${target.hp}`);
    } finally { f.room.close(); }
  });

  await check('unmodified production scenario advances natural host/FC time to reciprocal measured AI damage and capital outcome', () => {
    const f = setup(), seen = new Map(); let muzzleChecks = 0;
    try {
      const enemyPlayer = f.room.engine.addPlayer('Other human');
      assert.equal(f.room.engine.players.get(enemyPlayer).info.team, 1);
      assert.equal(f.room.engine.config.bots, 0);
      for (let i = 0; i < 10800 && f.room.engine.matchEndedAt === null; i++) {
        f.room.step(TICK_DT);
        const s = f.snapshot();
        if (i % 60 === 0) for (const u of s.units) {
          sea(u.position, 2 * Math.atan2(u.view.orientation[1], u.view.orientation[3]), geometry.get(u.modelId));
        }
        for (const e of s.events) if (!seen.has(e.id)) {
          seen.set(e.id, e);
          if (e.type === 'fire') {
            const u = s.units.find(u => u.id === e.source), g = geometry.get(u.modelId);
            const heading = 2 * Math.atan2(u.view.orientation[1], u.view.orientation[3]);
            const pose = mountPose(g, u.position, heading, 'main_gun', u.view.angles);
            near(e.position, pose.position);
            const shell = s.projectiles.find(p => p.id === e.projectile);
            if (shell) near(shell.velocity.map(n => n / 240), pose.direction);
            muzzleChecks++;
          }
        }
        // Callback is for the external renderer; do not retain every test frame.
        f.frames.length = 0;
      }
      const s = f.snapshot(), events = [...seen.values()];
      for (const id of ['home', 'enemy']) {
        assert(events.some(e => e.type === 'fire' && e.source === id));
        assert(events.some(e => e.type === 'damage' && e.unit === id && ['home', 'enemy'].includes(e.source)));
      }
      assert(s.outcome); assert.equal(s.outcome.reason, 'capitals');
      assert.notEqual(f.room.engine.matchEndedAt, null);
      assert.equal(f.room.engine.winner, s.outcome.winner);
      assert(events.some(e => e.type === 'sunk'));
      assert(muzzleChecks > 100);
      assert.equal(f.room.engine.vehicles.length, 0, 'AI battle needs no synthetic aircraft or bots');
      assert(Object.values(f.room.engine.combat.ships).every(s => s.hp > 0), 'native launch ships are not FC objectives');
      console.log(`  natural capital outcome: ${(s.tick * 0.05).toFixed(2)}s, winner ${s.outcome.winner}, ` +
        `HP ${s.units.map(u => `${u.id}=${u.hp}`).join('/')}, ${muzzleChecks} measured muzzle checks`);
    } finally { f.room.close(); }
  });

  await check('bridged geography retains only native launch platforms and restores ordinary destroyers', () => {
    const f = setup();
    try {
      f.room.step(TICK_DT);
      assert(posedFleet().length > 0);
      assert(posedFleet().every(ship => ship.kind === 'carrier'));
      setFleetState(0, 2);
      assert(posedFleet().some(ship => ship.kind === 'destroyer'));
    } finally { f.room.close(); }
  });

  await check('bridged CombatState suppresses native AA; identical nonbridge path still acquires and fires', () => {
    const f = setup();
    try {
      f.room.send({ type: 'spawn', kind: 'fighter' });
      const original = f.room.engine.vehicles[0];
      const runs = [];
      for (const bridged of [true, false]) {
        setFleetState(0, 2);
        const v = structuredClone(original), events = [], cs = createCombatState();
        Object.assign(v.flight, { position: [0, 120, -2940], velocity: [0, 0, 0], onGround: false });
        v.spawnedAt = -100;
        if (bridged) cs.hostFleet = { resolveProjectile: () => false };
        for (let i = 1; i <= 600; i++) stepCombat(cs, [v], TICK_DT, i * TICK_DT, events);
        runs.push(events.filter(e => e.type === 'aa').length);
      }
      assert.equal(runs[0], 0); assert(runs[1] > 0, 'ordinary original AA must still fire');
      console.log(`  native AA events: bridged=${runs[0]}, ordinary=${runs[1]}`);
    } finally { f.room.close(); }
  });
} finally { loader.dispose(); }
console.log(`${groups} local-host scenario groups passed (mechanical CPU poses, not native-input acceptance)`);
