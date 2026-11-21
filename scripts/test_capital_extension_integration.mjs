import assert from 'node:assert/strict';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createGameplay } from '../Games/Capital Drive/gameplay.js';
import { WEAPONS } from '../Games/Capital Drive/weapons.js';

const map = { bounds: { minX: -5000, maxX: 5000, minZ: -5000, maxZ: 5000 },
  roads: [{ id: 'main', type: 'residential', name: 'Main', points: [[0, 4000], [0, -4000]], nodes: [1, 2], width: 12, speed: 50 }],
  buildings: [], landmarks: [], spawn: { x: -2.3, z: 1000, yaw: 0 } };
const near = (actual, expected, message = '') => assert(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} != ${expected}`);
const simTick = (simulation, frames, input) => { for (let i = 0; i < frames; i++) simulation.step(1 / 60, input); };
const gameTick = (gameplay, frames, input = {}) => { for (let i = 0; i < frames; i++) gameplay.step(1 / 60, input); };
function trajectory(options = {}) {
  const simulation = createSimulation(map, { trafficCount: 0, ...options });
  simTick(simulation, 120, { throttle: 1 }); simTick(simulation, 45, { throttle: 1, steer: .25 }); simTick(simulation, 30, { brake: true });
  return Object.fromEntries(['x', 'z', 'yaw', 'speed', 'vx', 'vz'].map(key => [key, simulation.player[key]]));
}
// Recorded from the pre-extension Simulation at 0f4933d3, with the input sequence above.
const original = { x: .18354334470907008, z: 952.111578355592, yaw: -.18098532136891182,
  speed: 12.482412579381368, vx: 2.2061211761760946, vz: -12.28598246167515 };
for (const result of [trajectory(), trajectory({ vehicleMods: () => ({ engine: 0, brakes: 0, handling: 0 }), powerModifiers: () => ({}) }),
  trajectory({ vehicleMods: () => ({ engine: NaN, brakes: -1, handling: .5 }), powerModifiers: () => ({ engine: NaN, handling: -5 }) })]) {
  for (const [key, value] of Object.entries(original)) near(result[key], value, `stock ${key}`);
}
function upgradeMetric(kind, tier) {
  const simulation = createSimulation(map, { trafficCount: 0, vehicleMods: () => ({ [kind]: tier }) });
  simTick(simulation, 90, { throttle: 1 });
  if (kind === 'brakes') simTick(simulation, 15, { brake: true });
  if (kind === 'handling') simTick(simulation, 20, { throttle: 1, steer: .5 });
  return kind === 'handling' ? Math.abs(simulation.player.yaw) : simulation.player.speed;
}
for (const kind of ['engine', 'brakes', 'handling']) {
  const levels = [0, 1, 2].map(tier => upgradeMetric(kind, tier));
  assert(kind === 'brakes' ? levels[0] > levels[1] && levels[1] > levels[2] : levels[0] < levels[1] && levels[1] < levels[2], `${kind}: both purchased tiers change real physics`);
  near(upgradeMetric(kind, 99), levels[2]); near(upgradeMetric(kind, -99), levels[0]); near(upgradeMetric(kind, '2'), levels[0]);
}
let mods = {}, powers = {};
const liveSimulation = createSimulation(map, { trafficCount: 0, vehicleMods: () => mods, powerModifiers: () => powers });
simTick(liveSimulation, 30, { throttle: 1 });
const stockSpeed = liveSimulation.player.speed;
liveSimulation.reset(); mods = { engine: 2 }; powers = { engine: 1.25 };
simTick(liveSimulation, 30, { throttle: 1 });
assert(liveSimulation.player.speed > stockSpeed * 1.4, 'live callbacks are read after construction');
assert.deepEqual(trajectory({ powerModifiers: () => ({ engine: Infinity, handling: Infinity }) }), trajectory({ powerModifiers: () => ({ engine: 1.25, handling: 1.25 }) }), 'vehicle powers clamp to bounded values');

function gameFixture(options = {}, world = map) {
  const simulation = createSimulation(world, { trafficCount: 0 });
  const gameplay = createGameplay(world, simulation, { hasWeapon: () => true, ...options });
  gameplay.reset({ sandbox: !!options.sandbox, onFoot: true, startPose: { x: 0, z: 500, yaw: 0 } });
  return { simulation, gameplay };
}
let power = {};
const { gameplay: powered } = gameFixture({ powerModifiers: () => power, sandbox: true });
powered.state.health = 63;
const ammoBeforePower = powered.snapshot().ammunition;
gameTick(powered, 30, { moveX: 1 }); const stockWalk = powered.state.actor.x;
power = { footSpeed: 1.5 }; gameTick(powered, 30, { moveX: 1 });
near(powered.state.actor.x - stockWalk, stockWalk * 1.5, 'walking boost uses the actual body');
assert.deepEqual(powered.snapshot().ammunition, ammoBeforePower); assert.equal(powered.state.health, 63);
const jumpHeight = factor => { const { gameplay } = gameFixture({ powerModifiers: () => ({ jump: factor }) }); gameplay.step(1 / 60, { jump: true }); return gameplay.state.actor.jumpHeight; };
assert(jumpHeight(1.5) > jumpHeight(1)); near(jumpHeight(99), jumpHeight(1.5)); near(jumpHeight(NaN), jumpHeight(1));
function gunFixture(factor = 1) {
  const fixture = gameFixture({ sandbox: true, powerModifiers: () => ({ reload: factor, gunAttack: factor }) });
  fixture.gameplay.addAmmo(60, 'pistol'); fixture.gameplay.setWeapon('pistol');
  return fixture.gameplay;
}
const normalGun = gunFixture(), fastGun = gunFixture(.5);
gameTick(normalGun, 36, { fire: true }); gameTick(fastGun, 36, { fire: true });
assert(fastGun.state.ammo < normalGun.state.ammo, 'attack interval changes actual shot consumption');
for (const gun of [normalGun, fastGun]) {
  const before = gun.state.ammo + gun.state.reserveAmmo;
  assert(gun.reload()); const expected = 1.4 * (gun === fastGun ? .5 : 1);
  near(gun.state.reloading, expected);
  gameTick(gun, Math.ceil(expected * 60) + 1);
  assert.equal(gun.state.ammo + gun.state.reserveAmmo, before, 'reload moves existing ammunition without granting it');
  assert.equal(gun.state.health, 100);
}

const fanout = [], impact = gameFixture({ onVehicleImpacts: (events, dt) => fanout.push({ events, dt }) });
impact.simulation.setExternalPeople([{ id: 'player-body', x: 0, z: 500, radius: .35 }]);
const hittingCar = { id: 'traffic:integration', modelId: 'lantern', x: -8, z: 500, yaw: -Math.PI / 2, speed: 20, vx: 20, vz: 0, active: true };
impact.simulation.moveVehicle(hittingCar, 8, 0);
impact.gameplay.step(0);
assert.equal(fanout.length, 0, 'paused gameplay neither drains nor fans out contacts');
impact.gameplay.step(1 / 60);
assert.equal(fanout.length, 1); assert.equal(fanout[0].events.length, 1);
assert.equal(fanout[0].events[0].targetId, 'player-body');
assert(impact.gameplay.state.health < 100 && impact.gameplay.state.actor.impactTime > 0, 'the same real contact still launches and damages the player');
impact.gameplay.step(1 / 60); assert.equal(fanout[1].events.length, 0, 'the contact itself fans out once');

const checkpoint = { mode: 'foot', actor: { x: -20, z: 500, yaw: 0 }, health: 91, weapon: 'pistol',
  vehicle: { x: -2.3, z: 1000, yaw: 0, modelId: 'lantern', color: '#aabbcc', health: 80, stolen: false },
  ammunition: Object.fromEntries(WEAPONS.map(weapon => [weapon.id, { ammo: 0, reserveAmmo: weapon.id === 'pistol' ? 7 : 0 }])) };
const ally = { id: 'campaign-ally:corporate', appearanceId: 'player:corporate', x: 8, z: 500, yaw: .6, health: 42, active: true, seated: false };
const handover = gameFixture(), game = handover.gameplay;
game.state.wanted = 3; game.state.heat = 9; game.state.vehicleHealth = 67;
game.state.police.push({ id: 'retained', x: 20, z: 500, health: 100, mode: 'foot' });
const police = game.state.police, previousPolice = structuredClone(police), car = { ...handover.simulation.player }, previousVehicle = { ...game.state.vehicle };
assert(game.switchToCompanion(ally, checkpoint).ok);
assert.deepEqual({ x: game.state.actor.x, z: game.state.actor.z, yaw: game.state.actor.yaw }, { x: ally.x, z: ally.z, yaw: ally.yaw });
assert.equal(game.state.health, 42); assert.equal(game.state.wanted, 3); assert.equal(game.state.heat, 9);
assert.equal(game.state.police, police); assert.deepEqual(police, previousPolice);
assert.deepEqual(handover.simulation.player, car); assert.deepEqual(game.state.vehicle, previousVehicle); assert.equal(game.state.vehicleHealth, 67);
assert.deepEqual(game.snapshot().ammunition, checkpoint.ammunition);
game.setWeapon('unarmed'); game.setWeapon('pistol'); assert.deepEqual(game.getAmmo('pistol'), { ammo: 0, reserveAmmo: 7 }, 'empty personal magazine cannot auto-reload during handover');
for (const invalid of [{ health: 0 }, { health: 101 }, { x: NaN }, { seated: true }, { active: false }, { id: 'ped:1' }]) {
  const before = game.snapshot(); assert.equal(game.switchToCompanion({ ...ally, ...invalid }, checkpoint).ok, false); assert.deepEqual(game.snapshot(), before);
}
for (const [field, value, previous] of [['mode', 'vehicle', 'foot'], ['recovery', {}, null], ['carjacking', {}, null], ['health', 0, 42]]) {
  game.state[field] = value;
  const before = game.snapshot(); assert.equal(game.switchToCompanion(ally, checkpoint).ok, false); assert.deepEqual(game.snapshot(), before);
  game.state[field] = previous;
}
game.state.actor.impactTime = .2;
const impactedBefore = game.snapshot(); assert.equal(game.switchToCompanion(ally, checkpoint).ok, false); assert.deepEqual(game.snapshot(), impactedBefore);
game.state.actor.impactTime = 0;
const equipmentBefore = game.snapshot(); assert.equal(game.switchToCompanion(ally, { ...checkpoint, ammunition: {} }).ok, false); assert.deepEqual(game.snapshot(), equipmentBefore);
handover.simulation.setExternalPeople([{ id: 'other-adult', x: ally.x, z: ally.z, radius: .35 }]);
assert.equal(game.switchToCompanion(ally, checkpoint).ok, false, 'another actual adult still blocks the target pose');
handover.simulation.setExternalPeople([{ id: ally.id, x: ally.x, z: ally.z, radius: .35 }]);
assert.equal(game.switchToCompanion(ally, checkpoint).ok, true, 'only the promoted ally own body is exempted during the checked handover');
const blockedWorld = { ...map, buildings: [{ id: 'blocked', points: [[6, 498], [10, 498], [10, 502], [6, 502]], height: 4 }] };
const blocked = gameFixture({}, blockedWorld), blockedBefore = blocked.gameplay.snapshot(), blockedCar = { ...blocked.simulation.player };
assert.equal(blocked.gameplay.switchToCompanion(ally, checkpoint).ok, false);
assert.deepEqual(blocked.gameplay.snapshot(), blockedBefore); assert.deepEqual(blocked.simulation.player, blockedCar);

const blastWorld = { ...map, buildings: [{ id: 'wall', points: [[1, 490], [1.4, 490], [1.4, 510], [1, 510]], height: 4 }] };
let interior = null, strikeCalls = [], blastEvents = [];
const blast = gameFixture({ getInterior: () => interior,
  pedestrians: { strike: args => { strikeCalls.push(args); return { hits: 1 }; } }, onEvent: event => blastEvents.push(event) }, blastWorld);
Object.assign(blast.gameplay.state.actor, { x: 0, z: 502 }); Object.assign(blast.simulation.player, { x: 0, z: 506 });
blast.gameplay.state.police.push({ id: 'visible', x: 0, z: 504, health: 100 }, { id: 'wall-blocked', x: 2, z: 500, health: 100 },
  { id: 'other-space', x: 0, z: 502, health: 100, interiorId: 'other-room' }, { id: 'out-of-radius', x: 0, z: 509, health: 100 },
  { id: 'dead', x: 0, z: 500, health: 0 });
const grenade = { type: 'explosion', x: 0, z: 500, radius: 8, maxDamage: 80, interiorId: null };
for (const change of [{ type: 'gunshot' }, { radius: 0 }, { radius: 9 }, { maxDamage: 101 }, { maxDamage: 0 }, { x: NaN }]) {
  const before = blast.gameplay.snapshot(); assert.equal(blast.gameplay.applyExplosion({ ...grenade, ...change }), false); assert.deepEqual(blast.gameplay.snapshot(), before);
}
assert(blast.gameplay.applyExplosion(grenade));
near(blast.gameplay.state.health, 40); near(blast.gameplay.state.vehicleHealth, 88);
assert.deepEqual(blast.gameplay.state.police.map(unit => unit.health), [60, 100, 100, 100, 0]);
assert.equal(strikeCalls.length, 1); assert.equal(strikeCalls[0].kind, 'explosion'); assert.equal(strikeCalls[0].damage, 80); assert.equal(strikeCalls[0].range, 8);
assert.equal(strikeCalls[0].hasLineOfSight(grenade, { x: 2, z: 500 }), false, 'the adult adapter receives actual wall sight');
assert.equal(blastEvents.filter(event => event.kind === 'explosion').length, 1);
const health = blast.gameplay.state.health;
assert(blast.gameplay.applyExplosion({ ...grenade, interiorId: 'other-room' }));
assert.equal(strikeCalls.length, 1); assert.equal(blast.gameplay.state.health, health); near(blast.gameplay.state.police[2].health, 40);
interior = { id: 'current-room' };
assert(blast.gameplay.applyExplosion({ ...grenade, interiorId: null }));
assert.equal(strikeCalls.length, 1, 'an exterior blast cannot strike the overlapping current-room population');
console.log('Capital extension integration: stock trajectories, tiered real vehicle physics, live movement/jump/weapon powers, once-only impact fanout, live-body ally handover and scoped physical blast damage PASS');
