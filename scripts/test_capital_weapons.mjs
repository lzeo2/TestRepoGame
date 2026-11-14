import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = async url => {
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const load = async path => import(await moduleURL(new URL(path, import.meta.url)));
const { createGameplay } = await load('../Games/Capital Drive/gameplay.js');
const { createSimulation } = await load('../Games/Capital Drive/simulation.js');
const { WEAPONS } = await load('../Games/Capital Drive/weapons.js');
const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 },
  roads: [{ id: 'main', points: [[-400, 0], [400, 0]], nodes: [1, 2], width: 12, speed: 40 }],
  buildings: [], spawn: { x: 0, z: 0, yaw: 0 }, landmarks: [] };
function fixture({ buildings = [], sandbox = false, hasWeapon = () => true } = {}) {
  const source = { ...map, buildings }, simulation = createSimulation(source, { trafficCount: 0 });
  const strikes = [], alerts = [], events = [];
  const pedestrians = { snapshot: () => [{ x: 9, z: 0, health: 100 }], drainEvents: () => [],
    strike: strike => { strikes.push(strike); return { hits: 0, people: [] }; }, alert: alert => alerts.push(alert) };
  const game = createGameplay(source, simulation, { sandbox, hasWeapon, pedestrians, onEvent: event => events.push(event) });
  assert(game.interact());
  Object.assign(game.state.actor, { x: 0, z: 0, yaw: 0 });
  return { game, simulation, strikes, alerts, events };
}
const advance = (game, seconds, input = {}) => {
  for (let elapsed = 0; elapsed < seconds - 1e-9; elapsed += .01) game.step(Math.min(.01, seconds - elapsed), input);
};
const denied = fixture({ hasWeapon: () => false }).game;
for (const weapon of WEAPONS) assert.equal(denied.setWeapon(weapon.id), false);
assert.equal(denied.setWeapon('laser'), false);
assert.equal(denied.getAmmo('laser'), null); assert.equal(denied.getAmmo('__proto__'), null);
let legacyOwns = false;
const legacy = createGameplay(map, createSimulation(map, { trafficCount: 0 }), { hasPistol: () => legacyOwns });
assert(legacy.addAmmo(24)); assert.equal(legacy.setWeapon('pistol'), false);
legacyOwns = true; assert(legacy.setWeapon('pistol')); assert.deepEqual(legacy.getAmmo('pistol'), { ammo: 12, reserveAmmo: 12 });
assert.equal(legacy.setWeapon('shotgun'), false, 'legacy ownership only unlocks pistol');
const defaults = fixture().game;
assert(defaults.addAmmo(25)); assert.deepEqual(defaults.getAmmo('pistol'), { ammo: 0, reserveAmmo: 25 });
assert(defaults.setWeapon('smg')); assert.equal(defaults.state.ammo, 0);
assert(defaults.addAmmo(31));
assert(defaults.setWeapon('unarmed')); assert(defaults.setWeapon('smg'));
assert.equal(defaults.state.ammo, 0, 'an empty first equip cannot become an instant reload on switching');
assert.equal(defaults.state.reserveAmmo, 31); assert(defaults.reload()); advance(defaults, 1.9);
assert.deepEqual(defaults.getAmmo('smg'), { ammo: 30, reserveAmmo: 1 });
assert.deepEqual(defaults.getAmmo('pistol'), { ammo: 0, reserveAmmo: 25 });

for (const weapon of WEAPONS) {
  const { game, strikes, alerts } = fixture();
  assert(game.addAmmo(weapon.magazine * 3, weapon.id));
  assert(game.setWeapon(weapon.id));
  assert.deepEqual(game.getAmmo(weapon.id), { ammo: weapon.magazine, reserveAmmo: weapon.magazine * 2 });
  const otherPools = Object.fromEntries(WEAPONS.filter(item => item.id !== weapon.id).map(item => [item.id, game.getAmmo(item.id)]));
  game.step(.001, { fire: true });
  assert.equal(game.state.ammo, weapon.magazine - 1, `${weapon.id} spends one round per trigger`);
  assert.equal(strikes.length, weapon.pellets);
  assert(strikes.every(strike => strike.range === weapon.range && strike.damage === weapon.damage));
  assert(strikes.every(strike => strike.kind === (weapon.id === 'pistol' ? 'pistol' : 'firearm')), 'all gun adapters use firearm semantics');
  assert.equal(alerts.length, 1, 'one alert per trigger');
  game.step(0, { fire: true });
  advance(game, weapon.interval - .002, { fire: true });
  assert.equal(game.state.ammo, weapon.magazine - 1, 'cooldown lasts for the weapon interval');
  game.step(.003, { fire: true });
  assert.equal(game.state.ammo, weapon.magazine - 2);
  const poolBeforeSwitch = game.getAmmo(weapon.id);
  assert(game.setWeapon('unarmed')); assert(game.setWeapon(weapon.id));
  assert.deepEqual(game.getAmmo(weapon.id), poolBeforeSwitch, 'switching cannot reload or mint ammunition');
  assert(game.reload());
  assert.equal(game.setWeapon('unarmed'), false, 'switching cannot redirect a reload');
  assert.equal(game.setWeapon(WEAPONS.find(item => item.id !== weapon.id).id), false);
  const reloadBeforePause = game.snapshot(); game.step(0, { fire: true }); assert.deepEqual(game.snapshot(), reloadBeforePause);
  advance(game, weapon.reload - .01, { fire: true });
  assert.deepEqual(game.getAmmo(weapon.id), poolBeforeSwitch, 'reload blocks firing until complete');
  advance(game, .02);
  assert.equal(game.state.ammo, weapon.magazine);
  assert.equal(game.state.reserveAmmo, poolBeforeSwitch.reserveAmmo - 2);
  assert.equal(game.reload(), false, 'a full magazine cannot consume reserve');
  assert(game.addAmmo(100000, weapon.id));
  assert.equal(game.getAmmo(weapon.id).reserveAmmo, weapon.reserveCap);
  assert.equal(game.addAmmo(1, weapon.id), false);
  for (const [id, pool] of Object.entries(otherPools)) assert.deepEqual(game.getAmmo(id), pool, `${weapon.id} leaves ${id} ammunition alone`);
  const detached = game.getAmmo(weapon.id); detached.ammo = 999;
  assert.equal(game.state.ammo, weapon.magazine, 'getAmmo is detached');
  assert(Object.isFrozen(game.snapshot().ammunition[weapon.id]));
  assert.throws(() => { game.snapshot().ammunition[weapon.id].ammo = 999; });
  // Aimed ranges and spread must reach the target adapter without global random/time input.
  advance(game, weapon.interval);
  const start = strikes.length;
  game.step(.001, { fire: true, aim: true, aimYaw: 0 });
  const aimed = strikes.slice(start);
  assert(aimed.every(strike => strike.range === weapon.aimRange));
  assert(aimed.every(strike => Math.abs(strike.yaw) <= weapon.spread + 1e-9));
  if (weapon.pellets > 1) assert.equal(new Set(aimed.map(strike => strike.yaw)).size, weapon.pellets);
}

// Every ray is clipped by the real polygon LOS adapter, including off-centre pellets.
const wall = { id: 'wall', points: [[15, -30], [18, -30], [18, 30], [15, 30]], height: 8 };
for (const weapon of WEAPONS) {
  const { game, strikes, events } = fixture({ buildings: [wall] });
  Object.assign(game.state.actor, { x: 10, z: 0, yaw: -Math.PI / 2 });
  game.addAmmo(weapon.magazine, weapon.id); game.setWeapon(weapon.id);
  // The target must be untouched even though it is within nominal range.
  const police = { id: 'behind-wall', x: 23, z: 0, health: 100, mode: 'foot' };
  game.state.police.push(police);
  game.step(.001, { fire: true, aim: true, aimYaw: -Math.PI / 2 });
  assert.equal(police.health, 100);
  assert.equal(strikes.length, weapon.pellets);
  assert(strikes.every(strike => strike.range > 4.8 && strike.range < 5.1));
  assert(game.state.shots.every(shot => shot.endX < 15 && Number.isFinite(shot.endZ)));
  assert.equal(events.filter(event => event.kind === 'offence').length, 1, 'pellets report only one trigger offence');
}
// Fixed supplied input produces identical spread; police take at most one hit per trigger.
const fan = () => {
  const { game, strikes } = fixture({ sandbox: true });
  game.setWeapon('shotgun');
  const police = { id: 'nearby', x: 0, z: -5, health: 100, mode: 'foot' };
  game.state.police.push(police); game.step(.001, { fire: true });
  assert.equal(police.health, 82);
  return strikes.map(strike => strike.yaw);
};
assert.deepEqual(fan(), fan());
const free = fixture({ sandbox: true, hasWeapon: () => false }).game;
assert.deepEqual(free.getAmmo('pistol'), { ammo: 12, reserveAmmo: 72 });
for (const weapon of WEAPONS) {
  assert(free.setWeapon(weapon.id));
  assert.equal(free.state.ammo, weapon.magazine);
  advance(free, 5, { fire: true });
  assert(free.state.shots.length <= 16, 'sustained automatic fire keeps bounded traces');
  assert.equal(free.state.wanted, 0);
}
free.reset({ sandbox: false });
assert.equal(free.state.weapon, 'unarmed');
for (const weapon of WEAPONS) assert.deepEqual(free.getAmmo(weapon.id), { ammo: 0, reserveAmmo: 0 });
assert.equal(free.setWeapon('carbine'), false);
assert.equal(free.addAmmo(0), false); assert.equal(free.addAmmo(NaN), false);
assert.equal(free.addAmmo(Infinity), false); assert.equal(free.addAmmo(2, 'laser'), false);
// Career ammunition does not survive reset or a delayed recovery transfer.
const recovering = fixture().game;
for (const weapon of WEAPONS) recovering.addAmmo(weapon.magazine * 2, weapon.id);
recovering.setWeapon('carbine'); recovering.step(.001, { fire: true }); assert(recovering.reload());
recovering.state.health = 0; recovering.step(.01);
assert.equal(recovering.state.reloading, 0, 'recovery cancels an in-flight reload');
assert.equal(recovering.setWeapon('pistol'), false); assert.equal(recovering.addAmmo(20), false);
advance(recovering, 3.5);
assert.equal(recovering.state.weapon, 'unarmed');
for (const weapon of WEAPONS) assert.deepEqual(recovering.getAmmo(weapon.id), { ammo: 0, reserveAmmo: 0 });
console.log('Capital weapons: four profiles, ownership, isolated capped pools, switching/reload/pause, deterministic spread, per-pellet polygon clipping, trigger offences, bounded traces, sandbox and recovery PASS');
