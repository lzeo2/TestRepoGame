import assert from 'node:assert/strict';
import { gearForMode } from '../Games/Capital Drive/free-roam-gear.js';
import { createProgression, UTILITY_GEAR } from '../Games/Capital Drive/progression.js';

const map = { spawn: { x: 0, z: 0 } };
const saved = {
  version: 1, cash: 760,
  ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 90, stored: false }],
  completedJobs: [],
  gear: { scanner: false, flares: 1, armour: 26, medkits: 1 },
  equipment: { pistol: true },
};
const career = createProgression(map, saved);
const before = career.serialize();
const gear = gearForMode(career.state.gear, true);
assert(Object.isFrozen(gear));
assert.notEqual(gear, career.state.gear);
for (const kind of ['drone', 'droneStrike', 'jetpack', 'scanner']) assert.equal(gear[kind], true);
for (const utility of Object.values(UTILITY_GEAR)) assert.equal(gear[utility.field], utility.capacity);
assert.equal(gear.flares, 12);
assert.equal(gear.grenades, 6);
assert.equal(gear.smokeGrenades, 6);
assert.equal(gearForMode(career.state.gear, false), career.state.gear);

const practice = {
  pose: { x: 0, z: 0 }, onFoot: true, health: 54, vehicleHealth: 40, wanted: 0, respawnSerial: 0, sandbox: true,
  vehiclePose: { x: 1, z: 0, speed: 0, vx: 0, vz: 0 }, jammerTargets: 1,
};
const attempts = gear.flares + 2;
for (let i = 0; i < attempts; i++) {
  assert.deepEqual(career.utilityAvailability('medkit', practice), { ok: true, heal: 35, remaining: 3, practice: true });
  assert.equal(career.useUtility('medkit', practice).heal, 35);
  assert.equal(career.useUtility('repair-kit', practice).vehicleHealth, 75);
  assert.equal(career.useUtility('jammer', practice).practice, true);
  assert.equal(career.consumeFlare(practice).flares, 12);
}
assert(!career.useUtility('medkit', { ...practice, health: 100 }).ok);
assert(!career.useUtility('repair-kit', { ...practice, vehiclePose: { ...practice.vehiclePose, x: 30 } }).ok);
assert(!career.useUtility('jammer', { ...practice, jammerTargets: 0 }).ok);
assert(!career.useUtility('medkit', { ...practice, preview: true }).ok);
assert(!career.consumeFlare({ ...practice, interior: {} }).ok);
assert.deepEqual(career.drainEvents(), [], 'practice actions do not write progression events');
assert.deepEqual(career.serialize(), before, 'unlimited practice never spends career inventory or cash');
const restored = createProgression(map, career.serialize());
assert.deepEqual(restored.serialize(), before);
assert.equal(gearForMode(restored.state.gear, false).scanner, false);
assert.equal(restored.useUtility('medkit', { ...practice, sandbox: false }).remaining, 0);
assert.equal(restored.consumeFlare({ ...practice, sandbox: false }).flares, 0);
console.log('PASS free-roam unlocks all equipment, preserves repeated toolkit and flare practice, and reloads untouched career supplies');
