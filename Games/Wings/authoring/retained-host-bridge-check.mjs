// Actual retained RoomEngine integration, executed as transformed TS in memory.
// Mechanical pose fixtures below establish deterministic CPU aim, NOT native/GPU flight.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRetainedHostBridge } from './retained-host-bridge.mjs';
import { applyRetainedHostWiring, HOST_FILES } from './retained-host-wiring.mjs';
import { applyNativeShipCollisionWiring } from './native-ship-collision-wiring.mjs';
import { installRetainedHostLoader, retainedRoot } from './retained-host-loader.mjs';
import { createLocalFleetConfig } from './local-host-scenario.mjs';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const tracked = execFileSync('git', ['ls-files', '-z', 'Games/Wings/source', 'Games/Wings/index.html',
  'Games/Wings/assets', 'Games/Wings/port.patch'], { cwd: repo, encoding: 'utf8' }).split('\0').filter(Boolean);
const hash = value => createHash('sha256').update(value).digest('hex');
const baseline = new Map(tracked.map(path => [path, hash(readFileSync(new URL(path, `file://${repo}`)))]));
let groups = 0;
async function check(name, body) { await body(); groups++; console.log(`PASS ${name}`); }

await check('hash-pinned actual source application rejects drift/repeat and foreign paths', () => {
  assert.deepEqual([...HOST_FILES].sort(), ['src/sim/combat.ts', 'src/sim/loopback.ts', 'src/sim/room-engine.ts']);
  for (const path of HOST_FILES) {
    const source = execFileSync('git', ['show', `66aa582b:Games/Wings/source/games/wings/${path}`],
      { cwd: repo, encoding: 'utf8' });
    const patched = applyRetainedHostWiring(path, source);
    let expected = path === 'src/sim/combat.ts' ? patched.replace(
      '  stepFleetAA(cs, vehicles, dt, now, events)',
      '  // Local fleet objectives own combat; native ships remain passive launch platforms.\n' +
      '  if (!cs.hostFleet) stepFleetAA(cs, vehicles, dt, now, events)') :
      path === 'src/sim/room-engine.ts' ? patched.replace('setFleetState(this.matchTime(), this.config.teams)',
        'setFleetState(this.matchTime(), this.config.teams, !!this.hooks.hostBridge)') : patched;
    if (path === 'src/sim/combat.ts') {
      const beforeCollision = expected;
      expected = applyNativeShipCollisionWiring(beforeCollision);
      assert.throws(() => applyNativeShipCollisionWiring(`${beforeCollision}\n// drift`));
      assert.throws(() => applyNativeShipCollisionWiring(expected));
      for (const invalid of [null, undefined, {}, Buffer.from(beforeCollision)])
        assert.throws(() => applyNativeShipCollisionWiring(invalid));
    }
    if (path === 'src/sim/room-engine.ts') {
      assert(patched.includes('this.combat.ships, this.combat.projectiles, !!this.combat.hostFleet,'));
      assert(patched.includes('this.combat.hostFleet ? this.combat.hostFleet.botTargets?.(v.team) ?? [] : undefined)'));
      assert(!source.includes('this.combat.projectiles, !!this.combat.hostFleet)'));
    }
    assert.equal(readFileSync(new URL(path, retainedRoot), 'utf8'), expected,
      'actual source must equal pinned artifacts, reviewed per-room bot AA context, AA suppression and passive launch-platform filtering');
    assert.notEqual(patched, source);
    assert.throws(() => applyRetainedHostWiring(path, `${source}\n// drift`));
    assert.throws(() => applyRetainedHostWiring(path, patched));
    for (const invalid of [null, undefined, {}, Buffer.from(source)]) {
      assert.throws(() => applyRetainedHostWiring(path, invalid));
    }
  }
  for (const foreign of ['src/ui/lobby.ts', '__proto__', 'constructor', '../src/sim/combat.ts']) {
    assert.throws(() => applyRetainedHostWiring(foreign, ''));
  }
});

const loader = installRetainedHostLoader();
const { createLoopbackRoom } = await import(new URL('src/sim/loopback.ts', retainedRoot));
const { TICK_DT } = await import(new URL('src/sim/types.ts', retainedRoot));
const { RoomEngine } = await import(new URL('src/sim/room-engine.ts', retainedRoot));
const { WEAPONS, VEHICLES } = await import(new URL('src/sim/vehicles.ts', retainedRoot));
const { killVehicle } = await import(new URL('src/sim/combat.ts', retainedRoot));
const { SHIP_DAMAGE_SCALE, FLEET, SHIP_SPECS } = await import(new URL('src/sim/fleet.ts', retainedRoot));
const { worldQuery, terrainHeight } = await import(new URL('src/sim/geography.ts', retainedRoot));
assert.deepEqual([...loader.loaded].sort(), [...HOST_FILES].sort());

const unit = (id, team, position, extras = {}) => ({ id, team, kind: 'surface', capital: true,
  position, half: [12, 12, 12], hp: 60, speed: 0, route: [], weapons: [], sensor: null,
  depth: 'surfaced', depthPlan: [], ...extras });
function fleetConfig({ blocker = false, hp = 60 } = {}) {
  const units = [unit('home', 0, [3700, 0, 1400]), unit('target', 1, [3500, 0, 1000], { hp })];
  if (blocker) units.push(unit('friendly', 0, [3500, 0, 1100], { capital: false }));
  return { mode: 'factions', arena: { minX: 3000, maxX: 4000, minZ: 0, maxZ: 1800,
    bottomY: -100, cell: 20, obstacles: [] }, units,
  aircraft: [[{ id: 'fighter', weapons: [] }], [{ id: 'apache', weapons: [] }]],
  matchMs: 600000, intermissionMs: 15000 };
}
function setup(options = {}) {
  const messages = [], statuses = [];
  const bridge = createRetainedHostBridge({ mode: 'factions', config: fleetConfig(options),
    rosters: [['fighter'], ['apache']] });
  assert(bridge);
  let disposals = 0;
  // Count lifecycle calls only. Every simulation method is the actual bridge implementation.
  const hostBridge = { ...bridge, dispose() { disposals++; bridge.dispose(); } };
  const room = createLoopbackRoom({ bots: 0, teams: 2, timeLimit: 600 }, 'Actual host', {
    onMessage: message => messages.push(message), onStatus: status => statuses.push(status),
  }, { manual: true, code: 'retained-host-integration', hostBridge });
  const player = room.engine.players.get(room.playerId);
  let seq = 0;
  const tick = (fire = false, extraPose = () => {}) => {
    const vehicle = room.engine.vehicles.find(v => v.id === player.info.vehicleId);
    if (vehicle) pose(vehicle);
    extraPose();
    room.send({ type: 'input', seq: seq++, seat: { aim: [0, 0, -1], firePrimary: fire,
      fireSecondary: false, flares: false, ability: false, viewDelay: 0 } });
    room.step(TICK_DT);
  };
  const spawn = () => {
    room.send({ type: 'spawn', kind: 'fighter' });
    const vehicle = room.engine.vehicles.find(v => v.id === player.info.vehicleId);
    assert(vehicle, 'real send(spawn) must create an occupied host airframe');
    assert.equal(vehicle.seats[0], room.playerId);
    pose(vehicle);
    return vehicle;
  };
  return { room, bridge, player, messages, statuses, tick, spawn,
    disposals: () => disposals, snapshot: () => bridge.snapshot(room.engine, room.playerId) };
}
// Mechanical fixture: position an actually spawned aircraft for a short, level sea shot.
// Remove spawn protection only to avoid spending six seconds in the aim fixture.
function pose(vehicle, position = [3500, 8, 1200]) {
  Object.assign(vehicle.flight, { position: [...position], velocity: [0, 0, -135], orientation: [0, 0, 0, 1],
    angularVelocity: [0, 0, 0], onGround: false, gearDown: false, crashed: null, throttle: 0.5 });
  vehicle.spawnedAt = -100;
}
const hp = (s, id = 'target') => s.units.find(u => u.id === id).hp;
const drain = () => new Promise(resolve => queueMicrotask(resolve));
const nativeShip = FLEET.find(ship => ship.team === 0);
const nativeTurret = SHIP_SPECS[nativeShip.kind].turrets.find(turret => turret.mannable);
const turretCommand = { type: 'man-turret', ship: nativeShip.id, turret: nativeTurret.id };

try {
  await check('bounded static native bot guard rejects invalid counts, fill, teams and later reconfiguration', () => {
    const config = createLocalFleetConfig();
    const makeBridge = () => createRetainedHostBridge({ mode: 'factions', config,
      rosters: config.aircraft.map(roster => roster.map(a => a.id)) });
    for (const invalid of [{ bots: -1 }, { bots: .5 }, { bots: 3 }, { bots: NaN },
      { bots: '2' }, { bots: Infinity }, { botFill: 1 }, { botFill: -1 }, { teams: 3 }]) {
      const bridge = makeBridge();
      try {
        const room = new RoomEngine('invalid', { teams: 2, bots: 0, maxPerTeam: 10,
          scoreLimit: 50, timeLimit: 600, listed: false, name: 'Guard' }, { send() {} });
        Object.assign(room.config, invalid); // Exercise the bridge boundary, before native config normalization.
        assert.throws(() => bridge.beforeStep(room), /0\.\.2 static bots/);
      } finally { bridge.dispose(); }
    }
    for (const bots of [0, 1, 2]) {
      const bridge = makeBridge();
      const room = createLoopbackRoom({ teams: 2, bots, botFill: 0 }, 'Bounded native bots',
        { onMessage() {} }, { manual: true, hostBridge: bridge });
      try {
        room.step(TICK_DT); assert.equal(room.engine.botCount(), bots * 2);
        room.engine.config.bots = bots === 2 ? 1 : 2;
        assert.throws(() => bridge.beforeStep(room.engine), /Static bot count/);
      } finally { room.close(); }
    }
  });

  await check('two native bots per faction spawn authoritative aircraft and fire authenticated rounds into fleet', async () => {
    const config = fleetConfig({ hp: 1000 });
    const all = ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35'];
    const bridge = createRetainedHostBridge({ mode: 'factions', config, rosters: [all, all] });
    const messages = [];
    const room = createLoopbackRoom({ teams: 2, bots: 2, botSkill: 1 }, 'Native bot bridge',
      { onMessage: m => messages.push(m) }, { manual: true, code: 'native-ai-0', hostBridge: bridge });
    try {
      for (let i = 0; i < 180; i++) room.step(TICK_DT);
      assert.equal(room.engine.botCount(), 4);
      const bots = [...room.engine.players.values()].filter(p => p.info.bot);
      assert(bots.every(p => p.brain && p.info.turret === null));
      assert.deepEqual([0, 1].map(t => bots.filter(p => p.info.team === t).length), [2, 2]);
      const shooter = room.engine.vehicles.find(v => v.team === 0 && VEHICLES[v.kind].seatWeapons[0][0] === 'cannon20');
      assert(shooter, `seeded native cannon bot required: ${room.engine.vehicles.map(v => v.kind)}`);
      const bot = room.engine.players.get(shooter.seats[0]);
      assert(bot.info.bot && bot.info.vehicleId === shooter.id);
      const target = room.engine.vehicles.find(v => v.team === 1);
      assert(target);
      const ammo = shooter.weapons[0][0].ammo;
      let checkedRound = false;
      for (let i = 0; i < 90; i++) {
        pose(shooter); pose(target, [3500, 8, 800]);
        room.step(TICK_DT);
        const combat = room.engine.combat;
        const round = combat.projectiles.find(p => p.owner === bot.info.id && p.weapon === 'cannon20');
        if (round && !checkedRound) {
          assert.equal(round.vehicle, shooter.id); assert.equal(round.team, bot.info.team);
          const resolve = combat.hostFleet.resolveProjectile;
          const from = [3500, 8, 1050], to = [3500, 8, 950];
          const before = hp(bridge.snapshot(room.engine, room.playerId));
          assert.equal(resolve(round, from, to, .1, 2), false, 'nearer native collision fraction excludes farther fleet');
          assert.equal(hp(bridge.snapshot(room.engine, room.playerId)), before);
          assert.equal(resolve({ ...round }, from, to, 1, 2), false);
          const owner = round.owner; round.owner = room.playerId;
          assert.equal(resolve(round, from, to, 1, 2), false); round.owner = owner;
          checkedRound = true;
        }
      }
      assert(checkedRound, 'actual bot round checked while still in current CombatState');
      assert(shooter.weapons[0][0].ammo < ammo, 'actual native botInput must spend real cannon ammo');
      const snap = bridge.snapshot(room.engine, room.playerId);
      assert(hp(snap) < 1000, 'bot-owned real cannon rounds must hit the intervening fleet hull');
      assert(snap.events.some(e => e.type === 'damage' && e.source === `aircraft_${shooter.id}`));
      await drain();
      assert(messages.some(m => m.type === 'snapshot' && m.players.some(p => p.bot && p.team === 1)));
      const native = room.engine.snapshotFor(room.playerId);
      for (const team of [0, 1]) assert(native.vehicles.some(v => v.team === team && v.alive));
      assert.equal(room.engine.players.get(room.playerId).info.turret, null);
    } finally { room.close(); }
  });

  await check('fixture uses legal native open sea, all three actual TS hooks executed', () => {
    for (const [x, z] of [[3500, 1000], [3500, 1100], [3500, 1200], [3700, 1400]]) {
      assert(worldQuery.isWater(x, z)); assert(terrainHeight(x, z) < 0);
      assert.equal(worldQuery.groundHeight(x, z), 0);
    }
  });

  await check('real buffered input owns cannon magazine/cooldown and damages fleet hull', async () => {
    const f = setup();
    try {
      const v = f.spawn(), rt = v.weapons[0][0], initial = rt.ammo;
      assert.equal(initial, WEAPONS.cannon20.ammo);
      f.room.send({ type: 'input', seq: 0, seat: { aim: [0, 0, -1], firePrimary: true } });
      assert.equal(rt.ammo, initial, 'handle must buffer input, not fire immediately');
      f.tick(true); assert.equal(rt.ammo, initial, 'jitter holds first input');
      f.tick(true); assert.equal(rt.ammo, initial - 1);
      const ready = rt.readyAt;
      f.tick(true); assert.equal(rt.ammo, initial - 1, 'cooldown prevents next-tick duplicate');
      assert.equal(rt.readyAt, ready);
      for (let i = 0; i < 35; i++) f.tick(true);
      const spent = initial - rt.ammo, damage = 60 - hp(f.snapshot());
      assert(spent >= 8 && spent <= 11, `native rate consumed ${spent} rounds`);
      assert(damage > 0, 'actual accepted cannon rounds must damage fleet');
      const perRound = WEAPONS.cannon20.damage * SHIP_DAMAGE_SCALE.gun;
      assert(Math.abs(damage / perRound - Math.round(damage / perRound)) < 1e-8,
        `damage ${damage} must use native ship damage scale`);
      assert(damage <= spent * perRound + 1e-8);
      // Native guns emit at burst start or quarter-second boundaries, not per round.
      // This early continuous burst misses both; release past readyAt, then start a real new burst.
      for (let i = 0; i < 12; i++) f.tick(false);
      const beforeBurst = rt.ammo;
      f.tick(true); f.tick(true); f.tick(true);
      assert(rt.ammo < beforeBurst, 'new buffered burst must consume native ammo');
      await drain();
      assert(f.messages.some(m => m.type === 'events' && m.events.some(e =>
        e.type === 'fire' && e.weapon === 'cannon20' && e.vehicle === v.id)));
      assert(f.player.ack >= 0, 'real consumeTick acknowledged the seat input');
    } finally { f.room.close(); }
  });

  for (const departure of ['death', 'disconnect']) {
    await check(`accepted real cannon round survives launcher ${departure} with original attribution`, () => {
      const f = setup({ hp: 1 });
      try {
        const v = f.spawn(), rt = v.weapons[0][0], initial = rt.ammo;
        f.tick(true); f.tick(true);
        const combat = f.room.engine.combat;
        assert.equal(rt.ammo, initial - 1);
        assert.equal(combat.projectiles.length, 1, 'one real accepted round, no synthetic fire');
        const round = combat.projectiles[0];
        const attribution = [round.owner, round.vehicle, round.team, round.weapon];
        assert.deepEqual(attribution, [f.room.playerId, v.id, 0, 'cannon20']);
        assert(round.age >= 0, 'actual combat resolver already stepped this accepted round');
        assert.equal(hp(f.snapshot()), 1, 'launcher departs before the round reaches FC');
        let viewer = f.room.playerId;
        if (departure === 'death') {
          assert(killVehicle(v, 'crash', null, []), 'controlled life fixture kills the real airframe');
          assert.equal(v.alive, false);
        } else {
          f.room.engine.removePlayer(f.room.playerId);
          assert.equal(f.room.engine.players.has(f.room.playerId), false);
          viewer = f.room.engine.addPlayer('Fresh real viewer');
          assert.notEqual(viewer, f.room.playerId);
        }
        for (let i = 0; i < 30 && f.room.engine.matchEndedAt === null; i++) f.room.step(TICK_DT);
        const snapshot = f.bridge.snapshot(f.room.engine, viewer);
        assert.equal(rt.ammo, initial - 1, 'only the original accepted round spent ammo');
        assert.deepEqual([round.owner, round.vehicle, round.team, round.weapon], attribution);
        assert.equal(hp(snapshot), 0, 'original in-flight round must sink the FC target');
        const damage = snapshot.events.find(e => e.type === 'damage' && e.unit === 'target');
        assert(damage); assert.equal(damage.source, `aircraft_${v.id}`);
        assert.equal(damage.team, 0); assert.equal(damage.weapon, 'cannon20');
        const sunk = snapshot.events.find(e => e.type === 'sunk' && e.unit === 'target');
        assert(sunk); assert.equal(sunk.source, `aircraft_${v.id}`);
        assert.equal(sunk.team, 1); assert.equal(sunk.sourceTeam, 0);
        assert.equal(snapshot.events.filter(e => e.type === 'damage').length, 1);
        assert.equal(f.room.engine.winner, 0);
      } finally { f.room.close(); }
    });
  }

  await check('real round provenance rejects copies, mutation, invalid initial ownership and stale reset callbacks', () => {
    const f = setup();
    try {
      const v = f.spawn(); f.tick(true); f.tick(true);
      const combat = f.room.engine.combat, round = combat.projectiles[0];
      assert(round);
      const resolve = combat.hostFleet.resolveProjectile;
      const from = [3500, 8, 1050], to = [3500, 8, 950];
      const reject = projectile => {
        assert.equal(resolve(projectile, from, to, 1, 2), false);
        assert.equal(hp(f.snapshot()), 60);
      };
      reject({ ...round }); // Unregistered copy cannot acquire or inherit provenance.
      for (const [field, value] of [['owner', 'absent'], ['vehicle', 'absent'], ['team', 1],
        ['weapon', 'gau8'], ['ship', 'native-ship']]) {
        const before = round[field]; round[field] = value; reject(round);
        if (before === undefined) delete round[field]; else round[field] = before;
      }
      combat.projectiles.splice(combat.projectiles.indexOf(round), 1);
      reject(round); // Captured identity still requires current combat array membership.
      combat.projectiles.push(round);
      // A registered copy is still a new identity and must pass initial live ownership checks.
      const copy = { ...round }; combat.projectiles.push(copy);
      assert(killVehicle(v, 'crash', null, [])); reject(copy);
      combat.projectiles.pop();
      f.room.engine.resetMatch(); // Real host reset replaces CombatState and clears the fleet.
      assert.notEqual(f.room.engine.combat, combat);
      assert(combat.projectiles.includes(round));
      reject(round); // Retained obsolete callback must not reintroduce old-generation damage.
      const freshCombat = f.room.engine.combat;
      freshCombat.projectiles.push(round);
      assert.equal(freshCombat.hostFleet.resolveProjectile(round, from, to, 1, 2), false,
        'reset must clear provenance even if an old real round is reintroduced into current combat');
      assert.equal(hp(f.snapshot()), 60);
      freshCombat.projectiles.pop();
      assert.equal(f.bridge.stats().generations, 2);
    } finally { f.room.close(); }
  });

  await check('ten seconds of actual sustained cannon fire stays within replay bounds', () => {
    const f = setup({ hp: 10000 });
    try {
      const v = f.spawn();
      for (let i = 0; i < 600; i++) f.tick(true);
      assert.equal(f.room.engine.tick, 600);
      assert(v.weapons[0][0].ammo < WEAPONS.cannon20.ammo - 100);
      assert(hp(f.snapshot()) < 10000);
      assert.equal(f.snapshot().tick, 200, 'one 50ms fleet clock follows the actual 60Hz host');
    } finally { f.room.close(); }
  });

  await check('friendly FC hull consumes real rounds without friendly/enemy damage', () => {
    const f = setup({ blocker: true });
    try {
      const v = f.spawn();
      for (let i = 0; i < 40; i++) f.tick(true);
      assert(v.weapons[0][0].ammo < WEAPONS.cannon20.ammo);
      assert.equal(hp(f.snapshot(), 'friendly'), 60); assert.equal(hp(f.snapshot()), 60);
    } finally { f.room.close(); }
  });

  await check('nearer actual native aircraft intercepts fire before FC hull', () => {
    const f = setup();
    try {
      const shooter = f.spawn();
      const enemyId = f.room.engine.addPlayer('Native obstruction');
      f.room.engine.handle(enemyId, { type: 'spawn', kind: 'apache' });
      const enemy = f.room.engine.vehicles.find(v => v.id === f.room.engine.players.get(enemyId).info.vehicleId);
      assert(enemy); const initialHp = enemy.hp;
      for (let i = 0; i < 40; i++) f.tick(true, () => pose(enemy, [3500, 8, 1110]));
      assert(shooter.weapons[0][0].ammo < WEAPONS.cannon20.ammo);
      assert(enemy.hp < initialHp, 'native sweep must actually intercept and damage aircraft');
      assert.equal(hp(f.snapshot()), 60);
    } finally { f.room.close(); }
  });

  await check('real handle enforces faction roster, immutable team, turret and boarding boundaries', () => {
    const f = setup();
    try {
      f.room.send({ type: 'spawn', kind: 'apache' }); assert.equal(f.player.info.vehicleId, null);
      f.room.send({ type: 'spawn', kind: 'home' }); assert.equal(f.player.info.vehicleId, null);
      f.room.send({ type: 'team', team: 1 }); assert.equal(f.player.info.team, 0);
      f.room.send({ type: 'hello', name: 'Forged team', team: 1 }); assert.equal(f.player.info.team, 0);
      f.room.send(turretCommand); assert.equal(f.player.info.turret, null, 'real native turret must also reject in Factions');
      f.room.send({ type: 'board', vehicle: 'home', seat: 0 }); assert.equal(f.player.info.vehicleId, null);
      const enemyId = f.room.engine.addPlayer('Other faction');
      f.room.engine.handle(enemyId, { type: 'spawn', kind: 'apache' });
      const enemy = f.room.engine.players.get(enemyId).info.vehicleId;
      assert(enemy);
      f.room.send({ type: 'board', vehicle: enemy, seat: 1 }); assert.equal(f.player.info.vehicleId, null);
      assert.equal(f.spawn().kind, 'fighter');
    } finally { f.room.close(); }
  });

  await check('pause stops host ticks, accumulator, FC clock and ammo; resume advances once', () => {
    const f = setup();
    try {
      const v = f.spawn(); f.tick(true); f.tick(true);
      f.bridge.setPaused(true); assert.equal(f.bridge.paused(), true);
      const before = [f.room.engine.tick, f.room.engine.time, f.room.engine.accumulator,
        JSON.stringify(f.snapshot()), v.weapons[0][0].ammo];
      for (let i = 0; i < 10; i++) f.room.step(0.249);
      assert.deepEqual([f.room.engine.tick, f.room.engine.time, f.room.engine.accumulator,
        JSON.stringify(f.snapshot()), v.weapons[0][0].ammo], before);
      f.bridge.setPaused(false); f.tick(false);
      assert.equal(f.room.engine.tick, before[0] + 1);
    } finally { f.room.close(); }
  });

  await check('real cannon victory uses native 15-second restart and fresh CombatState binding', async () => {
    const f = setup({ hp: 2 });
    try {
      f.spawn();
      for (let i = 0; i < 60 && f.room.engine.matchEndedAt === null; i++) f.tick(true);
      assert.equal(f.room.engine.winner, 0); assert.notEqual(f.room.engine.matchEndedAt, null);
      assert.equal(hp(f.snapshot()), 0);
      const oldCombat = f.room.engine.combat, endedAt = f.room.engine.matchEndedAt;
      for (let i = 0; i < 900 && f.room.engine.time - endedAt < 14.9; i++) f.tick(false);
      assert(f.room.engine.time - endedAt >= 14.9, 'intermission must not stall the host clock');
      assert.equal(f.room.engine.matchEndedAt, endedAt);
      for (let i = 0; i < 20 && f.room.engine.matchEndedAt !== null; i++) f.tick(false);
      assert.equal(f.room.engine.matchEndedAt, null, 'native reset must occur after 15 seconds');
      assert(f.room.engine.time - endedAt >= 15);
      assert.notEqual(f.room.engine.combat, oldCombat);
      assert(f.room.engine.combat.hostFleet, 'reset must bind the fresh CombatState');
      assert.equal(hp(f.snapshot()), 2); assert.equal(f.player.info.vehicleId, null);
      const fresh = f.spawn(); assert.equal(fresh.weapons[0][0].ammo, WEAPONS.cannon20.ammo);
      for (let i = 0; i < 60 && f.room.engine.matchEndedAt === null; i++) f.tick(true);
      assert.equal(f.room.engine.winner, 0); assert.equal(hp(f.snapshot()), 0);
      await drain();
      assert(f.messages.some(m => m.type === 'events' && m.events.some(e => e.type === 'match-end' && e.winner === 0)));
    } finally { f.room.close(); }
  });

  await check('close disposes bridge exactly once; ordinary no-bridge loopback stays native', async () => {
    const f = setup();
    f.room.close(); f.room.close();
    assert.equal(f.disposals(), 1, 'loopback closes/disposes exactly once');
    assert.equal(f.room.engine.players.size, 0);
    f.bridge.dispose(); // disposal itself must also be idempotent
    assert.equal(typeof f.bridge.stats(), 'object');
    for (const mode of ['solo', 'normal', 'custom']) assert.equal(createRetainedHostBridge({ mode }), null);
    const messages = [];
    const room = createLoopbackRoom({ bots: 0 }, 'Native compatibility', { onMessage: m => messages.push(m) }, { manual: true });
    try {
      assert.equal(room.engine.combat.hostFleet, undefined);
      room.send(turretCommand);
      assert.deepEqual(room.engine.players.get(room.playerId).info.turret,
        { ship: nativeShip.id, turret: nativeTurret.id }, 'native mode retains real turret control');
      room.send({ type: 'leave-vehicle' });
      room.send({ type: 'spawn', kind: 'fighter' });
      assert.equal(room.engine.vehicles.length, 1);
      room.send({ type: 'team', team: 1 }); assert.equal(room.engine.players.get(room.playerId).info.team, 1);
      room.step(TICK_DT); assert.equal(room.engine.tick, 1);
      await drain(); assert(messages.some(m => m.type === 'welcome'));
    } finally { room.close(); }
  });
} finally {
  loader.dispose();
  for (const [path, digest] of baseline) assert.equal(hash(readFileSync(new URL(path, `file://${repo}`))), digest, `${path} changed`);
  console.log(`PASS ${baseline.size} current source/UI/bundle/patch files byte-unchanged by check`);
}
console.log(`${groups} actual retained-host integration groups passed (direct patched TS, not native GPU)`);
