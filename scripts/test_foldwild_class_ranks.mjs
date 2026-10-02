import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { SPECIES, BY_ID, ELEMENT_WHEEL } from '../Games/Foldwild/data.js';
import { CONTRACTS } from '../Games/Foldwild/economy.js';
import { REGION_LAYOUTS } from '../Games/Foldwild/region-data.js';
import { CLASSES, TRAITS, classRank, classProgress, perksFor, unlockedClasses, synergyFor } from '../Games/Foldwild/builds.js';
import { createCreature, createBattle, validateBattle, applyAction, statsFor } from '../Games/Foldwild/battle.js';

// Copied canonical module fixtures, not native input or naturally earned campaign evidence.
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const supplies = REGION_LAYOUTS.flatMap((layout, region) => layout.points.filter(p => p.type === 'supply').map(p => `${region}:${p.id}`));
const species = SPECIES.map(s => s.id), contracts = Object.keys(CONTRACTS);
const elements = [...new Set(SPECIES.map(s => s.element))].map(element => SPECIES.find(s => s.element === element).id);
const histories = {
  pathfinder: ['claimedSupplies', supplies, [0, 3, 9]], binder: ['caught', species, [3, 10, 25]],
  warden: ['defeatedRivals', [0, 1, 2, 3, 4], [1, 3, 5]],
  tactician: ['caught', elements, [3, 4, 5]], quartermaster: ['contracts', contracts, [1, 3, 6]]
};
for (const [id, [field, values, thresholds]] of Object.entries(histories)) {
  let previous = 0;
  for (let n = 0; n <= values.length; n++) {
    const state = freeze({ [field]: values.slice(0, n) }), before = JSON.stringify(state);
    const expected = thresholds.filter(threshold => n >= threshold).length;
    const progress = classProgress(state, id);
    assert.deepEqual(progress, { rank: expected, current: n, target: thresholds[Math.min(expected, 2)], requirement: progress.requirement });
    assert.equal(typeof progress.requirement, 'string'); assert(progress.requirement.length);
    assert.equal(classRank(state, id), expected);
    assert.equal(unlockedClasses(state).includes(id), expected > 0);
    assert(expected >= previous); previous = expected;
    assert(Object.isFrozen(progress)); assert.throws(() => { progress.rank = 3; });
    assert.equal(JSON.stringify(state), before);
    // Current roster, active class, inventory and purchases never substitute for history.
    assert.equal(classRank({ ...state, roster: [], activeClass: 'pathfinder', inventory: { fiber: 0 }, marks: 0 }, id), expected);
  }
}
assert.equal(classRank({ defeatedRivals: [0, 1], legacyRivals: [2] }, 'warden'), 1);
assert.equal(classRank({ defeatedRivals: [0, 1, 2, 3], legacyRivals: [2] }, 'warden'), 2);
assert.equal(classRank({}, 'none'), 0);
assert.deepEqual(classProgress({}, 'none'), { rank: 0, current: 0, target: 0, requirement: 'No class.' });
const zero = { captureBonus: 0, shieldBonus: 0, switchEnergy: 0, waitEnergy: 0, fiberBonus: 0, contractBonus: 0 };
assert.deepEqual(perksFor('none', 0), zero);
for (const id of Object.keys(CLASSES)) {
  assert.deepEqual(perksFor(id, 0), zero);
  assert.deepEqual(perksFor(id), perksFor(id, 1));
  for (const rank of [1, 2, 3]) {
    const expected = { ...zero };
    if (id === 'pathfinder') expected.fiberBonus = rank;
    if (id === 'binder') expected.captureBonus = [0, 0.04, 0.06, 0.08][rank];
    if (id === 'warden') expected.shieldBonus = rank + 1;
    if (id === 'tactician') expected.switchEnergy = rank;
    if (id === 'quartermaster') expected.contractBonus = [0, 5, 7, 10][rank];
    assert.deepEqual(perksFor(id, rank), expected);
    assert(Object.isFrozen(perksFor(id, rank)));
    assert.throws(() => { perksFor(id, rank).shieldBonus = 999; });
    if (rank === 1) for (const key of Object.keys(CLASSES[id].perks)) assert.equal(expected[key], CLASSES[id].perks[key]);
  }
}
for (const id of ['constructor', '__proto__', 'prototype', 'bad', null, 1]) {
  assert.throws(() => classRank({}, id)); assert.throws(() => classProgress({}, id)); assert.throws(() => perksFor(id));
}
for (const rank of [-1, 4, 1.5, NaN, Infinity, '1', null, {}, []]) assert.throws(() => perksFor('warden', rank));
for (const rank of [1, 2, 3]) assert.throws(() => perksFor('none', rank));
let invoked = 0;
const getter = { configurable: true, get() { invoked++; throw new Error('Getter ran'); } };
for (const [field, values] of Object.values(histories)) {
  for (const bad of [null, Array(1), [values[0], values[0]], Object.create(values), ['unknown']]) {
    assert.throws(() => classRank({ [field]: bad }, 'pathfinder'));
  }
  const record = {}; Object.defineProperty(record, field, getter);
  assert.throws(() => classProgress(record, 'pathfinder'));
  const array = [values[0]]; Object.defineProperty(array, '0', getter);
  assert.throws(() => unlockedClasses({ [field]: array }));
  const iterator = [values[0]]; Object.defineProperty(iterator, Symbol.iterator, getter);
  assert.throws(() => classRank({ [field]: iterator }, 'pathfinder'));
}
for (const state of [Object.create({}), Object.create(null), [], { constructor: 1 }, JSON.parse('{"__proto__":{}}'),
  { defeatedRivals: [1] }, { defeatedRivals: [0, 2] }, { claimedSupplies: ['5:supply-0'] }, { claimedSupplies: ['0:supply-3'] }]) {
  assert.throws(() => classRank(state, 'pathfinder'));
}
const getterTeam = [{ speciesId: 'cindupp' }]; Object.defineProperty(getterTeam, '0', getter);
assert.throws(() => synergyFor(getterTeam));

const c = (id, uid = id, traitId = 'neutral') => createCreature(id, 40, uid, { traitId });
const inert = () => ({ ...c('kilnarch', 'e'), energy: 0 });
for (const classId of ['none', ...Object.keys(CLASSES)]) {
  const b = createBattle([c('budriv', 'p')], [inert()], { classId });
  assert.equal(b.player.classRank, classId === 'none' ? 0 : 1); assert.equal(b.enemy.classRank, 0);
  const old = structuredClone(b); delete old.player.classRank; delete old.enemy.classRank;
  assert.deepEqual(validateBattle(freeze(old)), b);
  for (const rank of [undefined, -1, 4, 1.5, NaN, Infinity, '1', null, classId === 'none' ? 1 : 0]) {
    assert.throws(() => createBattle([c('budriv', 'p')], [inert()], { classId, classRank: rank }));
    assert.throws(() => createBattle([c('budriv', 'p')], [inert()], { enemyClassId: classId, enemyClassRank: rank }));
    for (const side of ['player', 'enemy']) {
      const bad = structuredClone(b); bad[side].classId = classId; bad[side].classRank = rank;
      assert.throws(() => validateBattle(bad));
    }
  }
}
for (const key of ['classRank', 'enemyClassRank', 'classId']) {
  const options = {}; Object.defineProperty(options, key, getter);
  assert.throws(() => createBattle([c('budriv')], [inert()], options));
}
for (const side of ['player', 'enemy']) {
  const b = createBattle([c('budriv')], [inert()]); Object.defineProperty(b[side], 'classRank', getter);
  assert.throws(() => validateBattle(b));
}
assert.throws(() => createBattle([c('budriv')], [inert()], Object.create({ classRank: 3 })));
assert.equal(invoked, 0);
// Historical recognition never upgrades a pinned pending fight or pays rewards.
const earned = freeze({ caught: species, defeatedRivals: [0, 1, 2, 3, 4], claimedSupplies: supplies, contracts });
for (const classId of Object.keys(CLASSES)) {
  assert.equal(classRank(earned, classId), 3);
  const old = createBattle([c('budriv', 'p')], [inert()], { classId });
  delete old.player.classRank; delete old.enemy.classRank;
  const resumed = validateBattle(old);
  assert.equal(resumed.player.classRank, 1);
  assert.equal(applyAction(resumed, { type: 'wait' }).player.classRank, 1);
  assert.equal(createBattle([c('budriv', 'p')], [inert()], { classId, classRank: classRank(earned, classId) }).player.classRank, 3);
}

for (const rank of [1, 2, 3]) for (const traitId of Object.keys(TRAITS)) for (const synergyEnabled of [false, true]) {
  const kin = [c('budriv', 'p', traitId), c('vinchew', 'reserve')];
  const before = freeze(createBattle(kin, [inert()], { classId: 'warden', classRank: rank, synergyEnabled }));
  const after = applyAction(before, { type: 'ability', slot: 3 });
  assert.equal(after.player.team[0].shield.hp, Math.min(26, 22 + rank + 1 + TRAITS[traitId].perks.shieldBonus + Number(synergyEnabled)));
  assert.equal(before.player.team[0].shield, null); assert.equal(after.player.classRank, rank);
  for (const energy of [0, statsFor(c('murnub')).maxEnergy - 1]) {
    const team = [c('cindupp', 'p'), c('dewgob', 'reserve'), { ...c('murnub', 'incoming', traitId), energy }];
    const b = createBattle(team, [inert()], { classId: 'tactician', classRank: rank, synergyEnabled });
    const switched = applyAction(freeze(b), { type: 'switch', index: 2 });
    assert.equal(switched.player.team[2].energy, Math.min(statsFor(team[2]).maxEnergy,
      energy + rank + TRAITS[traitId].perks.switchEnergy + Number(synergyEnabled)));
  }
  const waiting = applyAction(createBattle([{ ...c('budriv', 'p', traitId), energy: 0 }], [inert()],
    { classId: 'warden', classRank: rank }), { type: 'wait' });
  assert.equal(waiting.player.team[0].energy, 3 + TRAITS[traitId].perks.waitEnergy);
}
for (const rank of [1, 2, 3]) {
  const enemy = { ...c('budriv', 'e', 'steady'), energy: 4 }; enemy.hp /= 2;
  const shielded = applyAction(createBattle([c('kilnarch', 'p')], [enemy, c('vinchew', 'e2')],
    { kind: 'rival', enemyClassId: 'warden', enemyClassRank: rank, synergyEnabled: true }), { type: 'wait' });
  assert(shielded.log.includes('e used Bark Wrap.')); assert.equal(shielded.enemy.team[0].shield.hp, 26);
  const oldId = SPECIES.find(s => ELEMENT_WHEEL[BY_ID.cindupp.element] === s.element).id;
  const newId = SPECIES.find(s => ELEMENT_WHEEL[s.element] === BY_ID.cindupp.element).id;
  const switching = createBattle([c('cindupp', 'p')], [c(oldId, 'old'), { ...c(newId, 'new', 'nimble'), energy: 0 }],
    { kind: 'rival', enemyClassId: 'tactician', enemyClassRank: rank });
  switching.round = 3;
  assert.equal(applyAction(switching, { type: 'wait' }).enemy.team[1].energy, rank + 1);
  for (const ratio of [0.5, 0.01]) for (const status of [null, { name: 'Hush', remaining: 2, appliedAt: 0 }]) {
    for (const seed of [0, 670, 671, 770, 800, 850, 900, 1710, 1720, 2000, 4095]) {
      const target = inert(); target.hp *= ratio; target.status = status;
      const b = freeze(createBattle([c('kilnarch', 'p')], [target], { classId: 'binder', classRank: rank, seed }));
      const chance = Math.min(0.9, 0.12 + 0.75 * (1 - ratio) + (status ? 0.08 : 0) + [0, 0.04, 0.06, 0.08][rank]);
      const roll = ((Math.imul(1664525, seed) + 1013904223) >>> 0) / 0x100000000;
      const next = applyAction(b, { type: 'capture' });
      assert.equal(next.result === 'captured', roll < chance);
      assert.deepEqual(applyAction(validateBattle(b), { type: 'capture' }), next);
    }
  }
}

// Digest recorded by executing the same trace at unchanged df5b853 runtime a95c344.
// Only the new side rank metadata is stripped; every old field, RNG and log is compared.
const traces = [];
for (const classId of ['none', 'pathfinder', 'binder', 'warden', 'tactician', 'quartermaster']) for (const seed of [1, 671, 1000, 2000]) {
  const p = c('budriv', 'p', 'steady'), r = c('dewgob', 'r', 'nimble'), e = c('kilnarch', 'e');
  p.energy = 12; r.energy = 0; e.energy = 0; e.hp /= 2; e.status = { name: 'Hush', remaining: 2, appliedAt: 0 };
  let b = createBattle([p, r], [e], { classId, seed, synergyEnabled: true });
  delete b.player.classRank; delete b.enemy.classRank;
  for (const action of [{ type: 'ability', slot: 3 }, { type: 'wait' }, { type: 'switch', index: 1 },
    { type: 'switch', index: 0 }, { type: 'capture' }, { type: 'ability', slot: 1 }, { type: 'wait' }]) {
    const old = structuredClone(b); delete old.player.classRank; delete old.enemy.classRank;
    b = applyAction(freeze(b), action);
    assert.deepEqual(applyAction(freeze(old), action), b);
    const legacy = structuredClone(b); delete legacy.player.classRank; delete legacy.enemy.classRank; traces.push(legacy);
  }
}
assert.equal(createHash('sha256').update(JSON.stringify(traces)).digest('hex'),
  'c5eb75962d4e52847e4b436df2fa5451a3061f1e5c12c24a29e94709a5ba165d');
console.log('PASS: class rank thresholds/history/immutable perks; getter/prototype/duplicate/rank rejection; pinned shield/switch/capture/Wait stacks and caps; 168 baseline legacy replay snapshots exact');
