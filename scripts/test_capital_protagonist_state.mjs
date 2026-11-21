import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = async url => {
  let source = await readFile(url, 'utf8');
  for (const match of [...source.matchAll(/from ['"](\.[^'"]+)['"]/g)]) source = source.replace(match[1], await moduleURL(new URL(match[1], url)));
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const { createProtagonistState, PROTAGONIST_IDS } = await import(await moduleURL(new URL('../Games/Capital Drive/protagonist-state.js', import.meta.url)));
const { WEAPONS } = await import(await moduleURL(new URL('../Games/Capital Drive/weapons.js', import.meta.url)));
const clone = value => JSON.parse(JSON.stringify(value));
const bounds = { minX: -500, maxX: 500, minZ: -1000, maxZ: 1000 };
const options = { bounds };
const make = (n = 1) => ({ mode: n === 2 ? 'vehicle' : 'foot', actor: { x: n * 10, z: n * -20, yaw: n / 10 },
  vehicle: { x: n * 30, z: n * -40, yaw: n / 5, modelId: ['lantern', 'orchard', 'relay'][n - 1], color: n === 1 ? 0xe7e6df : '#123ABC', health: 100 - n * 12, stolen: n === 3 },
  health: 100 - n * 17, weapon: ['pistol', 'shotgun', 'smg'][n - 1],
  ammunition: Object.fromEntries(WEAPONS.map(weapon => [weapon.id, { ammo: Math.min(n, weapon.magazine), reserveAmmo: Math.min(n * 10, weapon.reserveCap) }])) });
let checks = 0;
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const rejects = fn => { assert.throws(fn, /Invalid protagonist checkpoint/); checks++; };
const store = createProtagonistState(null, options);
check(store.serialize(), { version: 1, student: null, corporate: null, basement: null }, 'legacy absence is valid');
const expected = [];
for (let n = 1; n <= 3; n++) {
  const input = make(n), output = store.capture(PROTAGONIST_IDS[n - 1], input);
  input.actor.x = 499; input.ammunition.pistol.ammo = 0;
  assert(Object.isFrozen(output) && Object.isFrozen(output.vehicle) && Object.isFrozen(output.ammunition.pistol)); checks++;
  expected.push(output);
}
for (let n = 1; n <= 3; n++) check(store.get(PROTAGONIST_IDS[n - 1]), expected[n - 1], 'each hero owns their complete checkpoint');
check(expected[0].vehicle.color, '#e7e6df'); check(expected[1].vehicle.color, '#123abc');
const serialized = store.serialize(), restored = createProtagonistState(clone(serialized), options);
check(restored.serialize(), serialized, 'reload preserves all three independently');
const originalSave = clone(serialized);
delete originalSave.student.ammunition.sniper;
delete originalSave.student.ammunition.rpg;
const migrated = createProtagonistState(originalSave, options).get('student').ammunition;
check(migrated.pistol, serialized.student.ammunition.pistol, 'legacy checkpoint keeps its original ammo');
check(migrated.sniper, { ammo: 0, reserveAmmo: 0 }, 'legacy checkpoint starts with an empty sniper pool');
check(migrated.rpg, { ammo: 0, reserveAmmo: 0 }, 'legacy checkpoint starts with an empty RPG pool');
assert.notEqual(store.get('student'), store.get('student')); checks++;
assert.throws(() => { serialized.student.actor.x = 12; }, TypeError); checks++;
bounds.maxX = 1;
store.capture('student', make(1)); checks++;
const badCheckpoints = [
  value => { value.extra = true; }, value => { value.actor.speed = 20; },
  value => { value.vehicle.recovery = {}; }, value => { value.ammunition.pistol.extra = 1; },
  value => { value.ammunition.rocket = { ammo: 1, reserveAmmo: 1 }; },
  value => { delete value.ammunition.carbine; }, value => { value.actor.x = 501; },
  value => { value.vehicle.z = -1001; }, value => { value.actor.yaw = Infinity; },
  value => { value.actor.x = NaN; }, value => { value.health = -1; },
  value => { value.health = 101; }, value => { value.vehicle.health = 101; },
  value => { value.vehicle.modelId = 'not-a-car'; }, value => { value.vehicle.modelId = '__proto__'; },
  value => { value.vehicle.color = '#abcd'; }, value => { value.vehicle.color = 0x1000000; },
  value => { value.vehicle.stolen = 1; }, value => { value.mode = 'passenger'; },
  value => { value.weapon = 'rocket'; }, value => { value.ammunition.pistol.ammo = .5; },
  value => { value.ammunition.pistol.reserveAmmo = -1; }, value => { value.actor = []; },
  value => { Object.defineProperty(value.actor, 'x', { value: 10, enumerable: false }); },
  value => { Object.defineProperty(value.actor, 'x', { get: () => 10, enumerable: true }); },
  value => { value.actor[Symbol('extra')] = 1; },
];
for (const mutate of badCheckpoints) {
  const before = store.serialize(), value = make(); mutate(value);
  rejects(() => store.capture('student', value)); check(store.serialize(), before, 'rejection preserves last valid checkpoint');
}
for (const weapon of WEAPONS) {
  for (const [key, cap] of [['ammo', weapon.magazine], ['reserveAmmo', weapon.reserveCap]]) {
    const value = make(); value.ammunition[weapon.id][key] = cap + 1;
    rejects(() => store.capture('corporate', value));
    const corrupt = clone(store.serialize()); corrupt.corporate = value;
    rejects(() => createProtagonistState(corrupt));
  }
}
for (const mutate of [value => { value.version = 2; }, value => { value.fourth = null; },
  value => { delete value.student; }, value => { value.student = {}; }, value => { value.student.actor.extra = true; }]) {
  const value = clone(serialized); mutate(value); rejects(() => createProtagonistState(value));
}
rejects(() => store.get('fourth')); rejects(() => store.capture('fourth', make()));
rejects(() => createProtagonistState(undefined, { bounds: { minX: 1, maxX: 0, minZ: 0, maxZ: 1 } }));
rejects(() => createProtagonistState([])); rejects(() => store.capture('student', null));
const detachedInput = clone(serialized), detachedStore = createProtagonistState(detachedInput);
detachedInput.student.health = 0;
check(detachedStore.get('student').health, serialized.student.health, 'loaded saves stay detached');
const boundary = make();
boundary.actor.x = -500; boundary.actor.z = 1000; boundary.health = 0;
boundary.vehicle.x = 500; boundary.vehicle.z = -1000; boundary.vehicle.health = 0;
boundary.weapon = 'unarmed';
for (const weapon of WEAPONS) boundary.ammunition[weapon.id] = { ammo: weapon.magazine, reserveAmmo: weapon.reserveCap };
check(createProtagonistState(null, { bounds: { minX: -500, maxX: 500, minZ: -1000, maxZ: 1000 } }).capture('student', boundary).ammunition,
  boundary.ammunition, 'actual weapon caps, map edges, zero health and unarmed are valid');
assert(Buffer.byteLength(JSON.stringify(serialized), 'utf8') < 8192); checks++;
console.log(`Capital protagonist checkpoints: ${checks} checks passed.`);
