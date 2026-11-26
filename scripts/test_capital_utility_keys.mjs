import assert from 'node:assert/strict';
import { createProgression } from '../Games/Capital Drive/progression.js';

const store = new Map();
globalThis.localStorage = {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => { store.set(key, String(value)); },
};

const {
  UTILITY_KINDS, DEFAULT_UTILITY_KEYS, loadUtilityKeys, saveUtilityKeys,
  rebindUtility, utilityKeyFor, matchUtilityKey, keyLabelFor,
} = await import('../Games/Capital Drive/utility-keys.js');

// Defaults load with no save present.
assert.deepEqual(loadUtilityKeys(), DEFAULT_UTILITY_KEYS);
assert.deepEqual(UTILITY_KINDS, ['medkit', 'repair-kit', 'jammer']);
assert.deepEqual(store.get('capital-drive-utility-keys-v1'), undefined);

// Save/load round-trip persists through localStorage.
saveUtilityKeys({ 'medkit': 'Comma', 'repair-kit': 'Period', 'jammer': 'Slash' });
assert.deepEqual(loadUtilityKeys(), { 'medkit': 'Comma', 'repair-kit': 'Period', 'jammer': 'Slash' });
assert.deepEqual(JSON.parse(store.get('capital-drive-utility-keys-v1')), { 'medkit': 'Comma', 'repair-kit': 'Period', 'jammer': 'Slash' });

// Corrupt saves fall back to defaults.
store.set('capital-drive-utility-keys-v1', '{not json');
assert.deepEqual(loadUtilityKeys(), DEFAULT_UTILITY_KEYS);
store.set('capital-drive-utility-keys-v1', JSON.stringify({ 'medkit': 'Escape', 'repair-kit': 'Nonsense0', 'jammer': 'Digit0' }));
const recovered = loadUtilityKeys();
assert.equal(recovered.medkit, 'Digit8', 'core code rejected on load');
assert.equal(recovered['repair-kit'], 'Digit9', 'invalid code rejected on load');
assert.equal(recovered.jammer, 'Digit0');

// Rebind rejects core controls and other utilities, accepts free codes, persists.
assert(!rebindUtility('medkit', 'KeyW').ok, 'W is a movement control');
assert(!rebindUtility('medkit', 'Digit7').ok, 'weapon digit');
assert(!rebindUtility('medkit', 'KeyH').ok, 'horn');
assert(!rebindUtility('medkit', 'Digit9').ok, 'held by the repair kit');
assert(!rebindUtility('medkit', 'NotACode').ok, 'not a KeyboardEvent.code');
assert.equal(rebindUtility('medkit', 'KeyLessThanUsed').ok, false);
assert(rebindUtility('medkit', 'Comma').ok);
assert.equal(matchUtilityKey('Comma'), 'medkit');
assert.equal(utilityKeyFor('medkit'), 'Comma');
assert.deepEqual(loadUtilityKeys()['medkit'], 'Comma');
assert.equal(keyLabelFor('Comma'), ',');
assert.equal(keyLabelFor('Digit8'), '8');
assert.equal(keyLabelFor('KeyH'), 'H');
assert.equal(rebindUtility('medkit', 'Escape').ok, false, 'escape is reserved for menus');

// The three default keys dispatch through progression.useUtility with a real career context.
loadUtilityKeys();
const map = { spawn: { x: 0, z: 0 } };
const saved = {
  version: 1, cash: 760,
  ownedVehicles: [{ id: 'lantern', color: '#e7e6df', health: 90, stored: false }],
  completedJobs: [], gear: { drone: false, droneStrike: false, jetpack: false, scanner: false, flares: 0, armour: 0, medkits: 2, repairKits: 1, jammers: 1 }, equipment: { pistol: true },
};
const career = createProgression(map, saved);
const careerContext = {
  pose: { x: 0, z: 0, yaw: 0 }, onFoot: true, wanted: 0, vehicleHealth: 40, respawnSerial: 0,
  health: 54, vehiclePose: { x: 1, z: 0, speed: 0, vx: 0, vz: 0 }, jammerTargets: 2,
};
for (const kind of UTILITY_KINDS) {
  const result = career.useUtility(kind, careerContext);
  assert(result.ok, `${kind} dispatches through its default hotkey path`);
  assert.equal(result.kind, kind);
}
assert.equal(career.serialize().gear.medkits, 1, 'career medkit spent once');
assert.equal(career.serialize().gear.repairKits, 0);
assert.equal(career.serialize().gear.jammers, 0);

console.log('Capital utility keys: defaults, persistence round-trip, rebind validation, inverse lookup and career dispatch passed');
