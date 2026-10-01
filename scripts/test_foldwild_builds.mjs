import assert from 'node:assert/strict';
import { SPECIES } from '../Games/Foldwild/data.js';
import { CLASSES, TRAITS, generateIndividual, validateIndividual, unlockedClasses, synergyFor } from '../Games/Foldwild/builds.js';

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const neutral = { profile: { hp: 0, energy: 0, attack: 0, defense: 0, speed: 0 }, traitId: 'neutral', cosmeticId: 'none' };
assert.deepEqual(Object.keys(CLASSES), ['pathfinder', 'binder', 'warden', 'tactician', 'quartermaster']);
assert.deepEqual(Object.keys(TRAITS), ['neutral', 'steady', 'nimble', 'resourceful']);
assert.equal(CLASSES.binder.perks.captureBonus, 0.04);
assert.equal(CLASSES.warden.perks.shieldBonus, 2);
assert.equal(CLASSES.tactician.perks.switchEnergy, 1);
assert.equal(TRAITS.steady.perks.shieldBonus, 1);
assert.equal(TRAITS.nimble.perks.switchEnergy, 1);
assert.equal(TRAITS.resourceful.perks.waitEnergy, 1);
assert.deepEqual(validateIndividual(), neutral);
assert.deepEqual(validateIndividual(freeze({ speciesId: 'cindupp', level: 3 })), neutral);
const samples = new Set();
const traits = new Set();
const amplitudes = new Set();
for (const species of SPECIES) {
  for (const seed of [0, 1, 2, 17, 42, 999, 65535, 0x7fffffff, 0xffffffff, species.number * 2654435761 >>> 0]) {
    const build = freeze(generateIndividual(seed));
    assert.deepEqual(generateIndividual(seed), build);
    assert.deepEqual(Object.keys(build).sort(), ['profile', 'traitId']);
    const values = Object.values(build.profile);
    assert.equal(values.length, 5);
    assert.equal(values.reduce((sum, value) => sum + value, 0), 0);
    assert.ok(values.every(value => Number.isInteger(value) && value >= -8 && value <= 8));
    assert.ok(values.includes(0) && values.some(value => value > 0) && values.some(value => value < 0));
    assert.ok(!values.every(value => value === 8));
    assert.ok(Object.hasOwn(TRAITS, build.traitId));
    const creature = freeze({ speciesId: species.id, ...build, cosmeticId: 'scarf' });
    const before = structuredClone(creature);
    const canonical = validateIndividual(creature);
    assert.deepEqual(canonical, { ...build, cosmeticId: 'scarf' });
    assert.notEqual(canonical.profile, creature.profile);
    assert.deepEqual(creature, before);
    samples.add(JSON.stringify(build));
    traits.add(build.traitId);
    amplitudes.add(Math.max(...values));
    assert.equal(synergyFor(freeze([{ speciesId: species.id }])).id, 'none');
    assert.equal(synergyFor(freeze([{ speciesId: species.id }, { speciesId: species.id }])).id, 'kinship');
  }
}
assert.ok(samples.size > 20);
assert.equal(traits.size, 4);
assert.deepEqual([...amplitudes].sort(), [4, 8]);
for (const seed of [-1, 1.5, NaN, Infinity, '1', null, 0x100000000]) assert.throws(() => generateIndividual(seed));
for (const id of ['constructor', '__proto__', 'toString', 'unknown', null]) {
  assert.throws(() => validateIndividual({ traitId: id }));
  assert.throws(() => validateIndividual({ cosmeticId: id }));
  assert.throws(() => synergyFor([{ speciesId: id }]));
  assert.throws(() => unlockedClasses({ caught: [id] }));
  assert.throws(() => unlockedClasses({ contracts: [id] }));
}
for (const profile of [
  { ...neutral.profile, hp: 9, defense: -9 },
  { ...neutral.profile, hp: 8 },
  { ...neutral.profile, hp: 0.5, energy: -0.5 },
  { ...neutral.profile, hp: NaN },
  { ...neutral.profile, hp: Infinity },
  { ...neutral.profile, hp: '0' },
  { hp: 0, energy: 0, attack: 0, defense: 0 },
  { ...neutral.profile, stamina: 0 },
  JSON.parse('{"hp":0,"energy":0,"attack":0,"defense":0,"speed":0,"__proto__":0}'),
  Object.create(neutral.profile), null, undefined, []
]) assert.throws(() => validateIndividual({ profile }));
assert.throws(() => validateIndividual(Object.create({ traitId: 'steady' })));
assert.throws(() => validateIndividual(JSON.parse('{"__proto__":{}}')));
assert.throws(() => validateIndividual({ constructor: 'neutral' }));
assert.throws(() => validateIndividual({ get profile() { throw new Error('Getter must not run.'); } }), /Missing or invalid profile/);
assert.throws(() => validateIndividual({ traitId: undefined }));
assert.throws(() => validateIndividual({ cosmeticId: undefined }));
assert.deepEqual(unlockedClasses({}), ['pathfinder']);
assert.deepEqual(unlockedClasses(freeze({ caught: ['cindupp', 'briknudge', 'hearthol'], defeatedRivals: [], contracts: [] })),
  ['pathfinder', 'binder']);
assert.deepEqual(unlockedClasses({ defeatedRivals: [0] }), ['pathfinder', 'warden']);
assert.deepEqual(unlockedClasses({ contracts: ['hollow-main-supply'] }), ['pathfinder', 'quartermaster']);
const progress = freeze({ caught: ['cindupp', 'dewgob', 'budriv'], defeatedRivals: [0, 1], contracts: ['meadow-main-supply'] });
const before = structuredClone(progress);
assert.deepEqual(unlockedClasses(progress), Object.keys(CLASSES));
assert.deepEqual(progress, before);
for (const state of [
  { caught: ['cindupp', 'cindupp', 'cindupp'] }, { caught: Array(3) },
  { defeatedRivals: [5] }, { defeatedRivals: [-1] }, { defeatedRivals: [0.5] },
  { defeatedRivals: ['0'] }, { defeatedRivals: [0, 0] },
  { contracts: ['meadow-main-supply', 'meadow-main-supply'] }, { contracts: null }
]) assert.throws(() => unlockedClasses(state));
const coverage = synergyFor(freeze([{ speciesId: 'cindupp' }, { speciesId: 'dewgob' }, { speciesId: 'budriv' }]));
assert.deepEqual(Object.keys(coverage).sort(), ['id', 'name', 'description', 'switchEnergy', 'shieldBonus'].sort());
assert.equal(coverage.id, 'coverage');
assert.equal(coverage.switchEnergy, 1);
assert.equal(coverage.shieldBonus, 0);
const kinship = synergyFor(freeze([{ speciesId: 'cindupp' }, { speciesId: 'briknudge' }, { speciesId: 'dewgob' }]));
assert.equal(kinship.id, 'kinship');
assert.equal(kinship.switchEnergy, 0);
assert.equal(kinship.shieldBonus, 1);
for (const team of [
  [{ speciesId: 'cindupp' }], [{ speciesId: 'cindupp' }, { speciesId: 'dewgob' }],
  [{ speciesId: 'cindupp' }, { speciesId: 'flarivet' }, { speciesId: 'dewgob' }]
]) {
  const none = synergyFor(freeze(team));
  assert.equal(none.id, 'none');
  assert.equal(none.switchEnergy, 0);
  assert.equal(none.shieldBonus, 0);
}
coverage.switchEnergy = 100;
assert.equal(synergyFor([{ speciesId: 'cindupp' }, { speciesId: 'dewgob' }, { speciesId: 'budriv' }]).switchEnergy, 1);
for (const team of [[], Array(1), [{ speciesId: 'cindupp' }, {}, {}], Array(4).fill({ speciesId: 'cindupp' }), null]) {
  assert.throws(() => synergyFor(team));
}
assert.throws(() => synergyFor([Object.create({ speciesId: 'cindupp' })]));
const copy = validateIndividual();
copy.profile.hp = 8;
assert.deepEqual(validateIndividual(), neutral);
console.log(`Foldwild builds: PASS (80 species x 10 seeds, ${samples.size} builds, neutral migration, caps, unlocks, synergy, prototype guards).`);
