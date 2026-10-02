import assert from 'node:assert/strict';
import { SPECIES, BY_ID, ABILITIES, ELEMENT_WHEEL } from '../Games/Foldwild/data.js';
import { CLASSES, TRAITS, generateIndividual, validateIndividual, synergyFor } from '../Games/Foldwild/builds.js';
import { statsFor, createCreature, normalizeCreature, clearEffects, gainXP, createBattle, applyAction, validateBattle } from '../Games/Foldwild/battle.js';

const c = (id, uid = id, options = {}, level = 40) => createCreature(id, level, uid, options);
const active = side => side.team[side.active];
const act = (battle, type = 'wait', fields = {}) => applyAction(battle, { type, ...fields });
const inert = () => ({ ...c('kilnarch', 'e'), energy: 0 });
const timed = (extra = {}) => ({ remaining: 2, appliedAt: 0, ...extra });
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function bounds(b) {
  assert(b.log.length <= 128 && b.log.every(line => typeof line === 'string' && line.length <= 512));
  for (const creature of [...b.player.team, ...b.enemy.team]) {
    const max = statsFor(creature);
    assert(creature.hp >= 0 && creature.hp <= max.maxHP);
    assert(creature.energy >= 0 && creature.energy <= max.maxEnergy);
    assert(!creature.shield || creature.shield.hp > 0 && creature.shield.hp <= 26);
    assert.deepEqual(validateIndividual(creature), {
      profile: creature.profile, traitId: creature.traitId, cosmeticId: creature.cosmeticId
    });
  }
  assert.deepEqual(validateBattle(freeze(b)), b);
}

// Neutral migration and seeded sidegrades for every canonical species, including both evolutions.
for (const [i, species] of SPECIES.entries()) {
  const options = { ...generateIndividual(i + 109), cosmeticId: 'scarf' };
  assert.deepEqual(generateIndividual(i + 109), generateIndividual(i + 109));
  assert.equal(Object.values(options.profile).reduce((sum, value) => sum + value, 0), 0);
  assert(Object.values(options.profile).every(value => Number.isInteger(value) && value >= -8 && value <= 8));
  for (const level of [1, 3, 12, 26, 40]) {
    const plain = createCreature(species.id, level, `p-${i}`);
    const neutral = createCreature(species.id, level, `p-${i}`, { profile: plain.profile, traitId: 'neutral', cosmeticId: 'none' });
    assert.deepEqual(plain, neutral);
    const legacy = structuredClone(plain);
    delete legacy.profile; delete legacy.traitId; delete legacy.cosmeticId;
    assert.deepEqual(normalizeCreature(freeze(legacy)), plain);
    const varied = createCreature(species.id, level, `p-${i}`, freeze(options));
    for (const key of ['hp', 'energy', 'attack', 'defense', 'speed']) {
      assert.equal(statsFor(plain)[key], Math.floor(species.stats[key] * (1 + 0.045 * (level - 1))));
      assert.equal(statsFor(varied)[key], Math.floor(species.stats[key] * (1 + 0.045 * (level - 1)) * (1 + options.profile[key] / 100)));
    }
    assert.equal(varied.hp, statsFor(varied).maxHP);
    assert.equal(varied.energy, statsFor(varied).maxEnergy);
  }
  const original = createCreature(species.id, 1, `evolve-${i}`, options);
  original.hp -= 5; original.energy -= 2;
  const next = gainXP(freeze(original), 11000);
  assert.equal(next.level, 40);
  assert.deepEqual(validateIndividual(next), validateIndividual(original));
  assert.equal(next.uid, original.uid);
  assert.equal(next.hp, statsFor(next).maxHP - 5);
  assert.equal(next.energy, statsFor(next).maxEnergy - 2);
  let evolved = species;
  while (evolved.evolvesTo) evolved = BY_ID[evolved.evolvesTo];
  assert.equal(next.speciesId, evolved.id);
  assert.equal(gainXP({ ...original, hp: 0 }, 11000).hp, 0);
}
for (const options of [
  { traitId: 'bogus' }, { cosmeticId: 'https://bad' }, { profile: {} },
  { profile: { hp: 8, energy: 8, attack: 8, defense: 8, speed: 8 } },
  { profile: { hp: 9, energy: -8, attack: -1, defense: 0, speed: 0 } },
  { profile: { hp: 0.5, energy: -0.5, attack: 0, defense: 0, speed: 0 } },
  { profile: { hp: 0, energy: 0, attack: 0, defense: 0, speed: 0, arbitrary: 0 } },
  { attack: 9000 }
]) assert.throws(() => c('cindupp', 'p', options));

// Every class and trait independently: neutral class/trait adds nothing by accident.
for (const classId of ['none', ...Object.keys(CLASSES)]) {
  const perks = classId === 'none' ? TRAITS.neutral.perks : CLASSES[classId].perks;
  for (const traitId of Object.keys(TRAITS)) {
    const trait = TRAITS[traitId].perks;
    let player = c('budriv', 'p', { traitId });
    let b = act(createBattle([player], [inert()], { classId }), 'ability', { slot: 3 });
    assert.equal(active(b.player).shield.hp, 22 + perks.shieldBonus + trait.shieldBonus);
    assert.equal(active(b.player).shield.remaining, 2);
    bounds(b);
    player = { ...player, energy: 0 };
    b = act(createBattle([player], [inert()], { classId }));
    assert.equal(active(b.player).energy, 3 + trait.waitEnergy + perks.waitEnergy);
    const reserve = { ...c('budriv', 'reserve', { traitId }), energy: 0 };
    b = act(createBattle([c('cindupp', 'p'), reserve], [inert()], { classId }), 'switch', { index: 1 });
    assert.equal(active(b.player).energy, perks.switchEnergy + trait.switchEnergy);
    bounds(b);
  }
}

const kin = [c('budriv', 'p', { traitId: 'steady' }), c('vinchew', 'reserve')];
assert.equal(synergyFor(kin).id, 'kinship');
let b = act(createBattle(freeze(kin), freeze([inert()]), { classId: 'warden', synergyEnabled: true }), 'ability', { slot: 3 });
assert.equal(b.player.classId, 'warden');
assert.equal(b.player.synergyId, 'kinship');
assert.equal(active(b.player).shield.hp, 26);
assert.equal(normalizeCreature(active(b.player)).shield.hp, 26);
assert.throws(() => normalizeCreature({ ...active(b.player), shield: timed({ hp: 27 }) }));
b = act(createBattle(kin, [inert()], { classId: 'warden' }), 'ability', { slot: 3 });
assert.equal(b.player.synergyId, 'kinship'); // Display is derived even while effects are disabled.
assert.equal(active(b.player).shield.hp, 25);

const coverage = [c('cindupp', 'p'), c('dewgob', 'reserve'), c('murnub', 'incoming', { traitId: 'nimble' }, 6)];
coverage[2].energy = 0;
assert.equal(statsFor(coverage[2]).maxEnergy, 31);
assert.equal(synergyFor(coverage).id, 'coverage');
b = act(createBattle(coverage, [inert()], { classId: 'tactician', synergyEnabled: true }), 'switch', { index: 2 });
assert.equal(active(b.player).energy, 3);
assert.equal(b.player.synergyId, 'coverage');
b = act(createBattle(coverage, [inert()], { classId: 'tactician' }), 'switch', { index: 2 });
assert.equal(active(b.player).energy, 2);
const cappedCoverage = structuredClone(coverage);
cappedCoverage[2].energy = 30;
b = act(createBattle(cappedCoverage, [inert()], { classId: 'tactician', synergyEnabled: true }), 'switch', { index: 2 });
assert.equal(active(b.player).energy, 31);
const fullWait = { ...c('budriv', 'p', { traitId: 'resourceful' }), energy: statsFor(c('budriv')).maxEnergy - 1 };
b = act(createBattle([fullWait], [inert()]));
assert.equal(active(b.player).energy, statsFor(fullWait).maxEnergy);
// Families in the canonical roster are single-element, so both synergy requirements cannot overlap.
for (const family of new Set(SPECIES.map(s => s.family))) {
  assert.equal(new Set(SPECIES.filter(s => s.family === family).map(s => s.element)).size, 1);
}

// Damage is still the original ability table and elemental formula, now using individual stats.
const varied = c('cindupp', 'p', { profile: { hp: 0, energy: 0, attack: 8, defense: -8, speed: 0 } });
const damageTarget = inert();
b = act(createBattle([varied], [damageTarget]), 'ability', { slot: 0 });
assert.equal(damageTarget.hp - active(b.enemy).hp,
  Math.floor(ABILITIES['Coal Nudge'].power * statsFor(varied).attack / statsFor(damageTarget).defense));
assert.equal(BY_ID.cindupp.stats.defense, 30);
assert.equal(ABILITIES['Bark Wrap'].shield, 22);
assert.equal(Object.keys(ABILITIES).length, 50);

// Capture has exactly the canonical Binder bonus, capped at 0.9; profiles/cosmetics survive capture.
for (const classId of ['none', ...Object.keys(CLASSES)]) for (const traitId of Object.keys(TRAITS)) {
  for (const ratio of [0.5, 0.01]) for (const seed of [0, 670, 671, 700, 1710, 4095]) {
    const target = c('kilnarch', 'wild', { ...generateIndividual(44), cosmeticId: 'paper-hat' });
    target.hp = statsFor(target).maxHP * ratio;
    target.energy = 0;
    if (ratio === 0.01) target.status = timed({ name: 'Hush' });
    const chance = Math.min(0.9, 0.12 + 0.75 * (1 - ratio) + (target.status ? 0.08 : 0) + (classId === 'binder' ? 0.04 : 0));
    const roll = ((Math.imul(1664525, seed) + 1013904223) >>> 0) / 0x100000000;
    const battle = freeze(createBattle([c('kilnarch', 'p', { traitId })], [target], { seed, classId }));
    const next = act(battle, 'capture');
    assert.deepEqual(act(battle, 'capture'), next);
    assert.equal(next.result === 'captured', roll < chance);
    if (next.captured) {
      assert.deepEqual(validateIndividual(next.captured), validateIndividual(target));
      assert.equal(next.captured.status, null);
      assert.equal(next.captured.turnsTaken, 0);
    }
    bounds(next);
  }
}

// Enemy-only Binder does not alter the player's chance.
const halfWild = { ...inert(), hp: statsFor(inert()).maxHP / 2 };
assert.notEqual(act(createBattle([c('kilnarch', 'p')], [halfWild], { seed: 671, enemyClassId: 'binder' }), 'capture').result, 'captured');

// Switching clears only outgoing temporary state, never resets its in-battle counter or restores a KO.
const outgoing = c('cindupp', 'p');
outgoing.turnsTaken = 12;
outgoing.status = timed({ name: 'Scorch', appliedAt: 12 });
outgoing.shield = timed({ hp: 18, appliedAt: 12 });
outgoing.buffs.defense = timed({ percent: 25, appliedAt: 12 });
b = act(createBattle([outgoing, coverage[2]], [inert()], { classId: 'tactician' }), 'switch', { index: 1 });
assert.equal(b.player.team[0].turnsTaken, 13);
assert.equal(b.player.team[0].hp, outgoing.hp);
assert.equal(b.player.team[0].status, null);
assert.equal(b.player.team[0].shield, null);
assert.deepEqual(b.player.team[0].buffs, {});
b = act(b, 'switch', { index: 0 });
assert.equal(active(b.player).turnsTaken, 13);
b = act(b, 'switch', { index: 1 });
assert.equal(b.player.team[0].turnsTaken, 14);
const dead = { ...coverage[2], hp: 0, energy: 0 };
const invalidSwitch = createBattle([c('cindupp', 'p'), dead], [inert()], { classId: 'tactician', synergyEnabled: true });
const rejected = act(freeze(invalidSwitch), 'switch', { index: 1 });
assert.equal(rejected.round, 1);
assert.equal(rejected.player.team[1].energy, 0);

const doomed = { ...createCreature('budriv', 1, 'doomed', { traitId: 'resourceful' }), hp: 1, energy: 0 };
const automaticReserve = { ...c('murnub', 'auto', { traitId: 'nimble' }), energy: 0 };
b = act(createBattle([doomed, automaticReserve, { ...c('dewgob', 'other'), energy: 0 }],
  [c('aurelvane', 'e')], { classId: 'tactician', synergyEnabled: true }));
assert.equal(b.player.team[0].hp, 0);
assert.equal(b.player.team[0].energy, 0);
assert.equal(b.player.team[0].turnsTaken, 0);
assert.equal(b.player.active, 1);
assert.equal(active(b.player).energy, 0); // Automatic KO replacement is not a voluntary switch perk.

// NPC class/trait/kinship applies through the same shield resolution root.
const shieldEnemy = c('budriv', 'e', { traitId: 'steady' });
shieldEnemy.hp = Math.floor(shieldEnemy.hp * 0.5);
shieldEnemy.energy = 4;
b = act(createBattle([c('kilnarch', 'p')], [shieldEnemy, c('vinchew', 'e2')],
  { kind: 'rival', enemyClassId: 'warden', synergyEnabled: true }));
assert(b.log.includes('e used Bark Wrap.'));
assert.equal(active(b.enemy).shield.hp, 26);
assert.equal(b.enemy.classId, 'warden');
b = act(b);
assert.equal(b.log.at(-1), 'e used Mulch Rest.'); // No affordable attack after spending its four energy.
assert.equal(active(b.enemy).energy, 7);
assert.equal(active(b.enemy).shield.remaining, 1);
const afterRecoveryLogLength = b.log.length;
b = act(b);
assert(b.log.slice(afterRecoveryLogLength).includes('e used Pith Peck.'));
assert.equal(active(b.enemy).energy, 5);

const cleanser = c('basinull', 'e');
cleanser.status = timed({ name: 'Scorch' });
b = act(createBattle([c('kilnarch', 'p')], [cleanser]));
assert(b.log.includes('e used Backwash.'));
assert.equal(active(b.enemy).status, null);
assert.equal(active(b.enemy).energy, cleanser.energy - ABILITIES.Backwash.cost);
const resourcefulEnemy = { ...c('kilnarch', 'e', { traitId: 'resourceful' }), energy: 0 };
b = act(createBattle([c('kilnarch', 'p')], [resourcefulEnemy], { enemyClassId: 'quartermaster' }));
assert.equal(active(b.enemy).energy, 4);
assert(b.log.includes('e waited and restored 4 energy.'));

// Enemy switches once to a clearly superior element on round 3; attacks target the incoming ally.
const targetElement = BY_ID.cindupp.element;
const oldSpecies = SPECIES.find(s => ELEMENT_WHEEL[targetElement] === s.element);
const nextSpecies = SPECIES.find(s => ELEMENT_WHEEL[s.element] === targetElement);
const oldEnemy = c(oldSpecies.id, 'old');
oldEnemy.turnsTaken = 7;
oldEnemy.status = timed({ name: 'Scorch', appliedAt: 7 });
const newEnemy = { ...c(nextSpecies.id, 'new', { traitId: 'nimble' }), energy: 0 };
let switching = createBattle([c('cindupp', 'p')], [oldEnemy, newEnemy], { kind: 'rival', enemyClassId: 'tactician' });
switching.round = 3;
const switched = act(freeze(switching), 'ability', { slot: 0 });
assert.equal(switched.enemy.active, 1);
assert.equal(switched.enemy.team[0].hp, oldEnemy.hp);
assert.equal(switched.enemy.team[0].turnsTaken, 8);
assert.equal(switched.enemy.team[0].status, null);
assert.equal(switched.enemy.team[1].energy, 2);
assert.equal(switched.enemy.team[1].turnsTaken, 0);
assert(switched.enemy.team[1].hp < newEnemy.hp);
assert.equal(switched.player.team[0].hp, switching.player.team[0].hp);
assert.deepEqual(act(switching, 'ability', { slot: 0 }), switched);
const noPingPong = { ...switched, round: 6 };
assert.equal(act(noPingPong).enemy.active, 1);

// Canonical snapshot metadata, bounded logs and rejection of untrusted bonus/debug fields.
const snapshot = createBattle(coverage, [inert()], { classId: 'tactician', synergyEnabled: true });
const saved = structuredClone(snapshot);
freeze(snapshot);
for (const action of [{ type: 'ability', slot: 0 }, { type: 'wait' }, { type: 'switch', index: 2 },
  { type: 'capture' }, { type: 'flee' }, { type: 'unknown' }]) {
  const next = applyAction(snapshot, freeze(action));
  assert.deepEqual(snapshot, saved);
  assert.notEqual(next, snapshot);
  bounds(next);
}
assert.deepEqual(clearEffects(freeze(varied)).profile, varied.profile);
const oldSnapshot = structuredClone(saved);
delete oldSnapshot.synergyEnabled;
for (const side of [oldSnapshot.player, oldSnapshot.enemy]) { delete side.classId; delete side.classRank; delete side.synergyId; }
const migrated = validateBattle(freeze(oldSnapshot));
assert.equal(migrated.synergyEnabled, false);
assert.equal(migrated.player.classId, 'none');
assert.equal(migrated.player.classRank, 0);
assert.equal(migrated.enemy.classRank, 0);
assert.equal(saved.player.classRank, 1);
assert.equal(migrated.player.synergyId, 'coverage');
for (const mutate of [
  raw => { raw.player.classId = 'bogus'; }, raw => { raw.enemy.classId = null; },
  raw => { raw.result = 'won'; raw.phase = 'ended'; },
  raw => { raw.result = 'captured'; raw.phase = 'ended'; raw.enemy.team[0].hp /= 2;
    raw.captured = clearEffects(raw.enemy.team[0]); raw.captured.traitId = 'nimble'; },
  raw => { raw.synergyEnabled = null; }, raw => { raw.synergyEnabled = 'true'; },
  raw => { raw.player.synergyId = 'kinship'; }, raw => { raw.player.perks = { shieldBonus: 9000 }; },
  raw => { raw.player.team[0].captureBonus = 1; }, raw => { raw.debug = true; },
  raw => { raw.log = Array(129).fill('a'); }, raw => { raw.log = ['a'.repeat(513)]; },
  raw => { raw.log = [7]; }, raw => { raw.log = new Array(1); },
  raw => { raw.player.team[0].hp = NaN; }, raw => { raw.player.team[0].traitId = '__proto__'; },
  raw => { raw.player.team[0].cosmeticId = 'bad'; }, raw => { raw.player.team[0].profile.hp = 8; },
  raw => { raw.player.team[0].uid = 'a'.repeat(81); }, raw => { raw.player.team[0].shield = timed({ hp: 27 }); },
  raw => { raw.player.team[0].status = timed({ name: 'Scorch', arbitrary: 1 }); },
  raw => { raw.payload = 'x'.repeat(256 * 1024); },
  raw => { Object.defineProperty(raw.player, 'classId', { get() { throw new Error('getter invoked'); } }); }
]) {
  const raw = structuredClone(saved); mutate(raw);
  assert.throws(() => validateBattle(raw), /Invalid|Unknown|Profile|must be finite/);
}
for (const classId of ['bogus', '__proto__', null, 4]) {
  assert.throws(() => createBattle([varied], [inert()], { classId }));
  assert.throws(() => createBattle([varied], [inert()], { enemyClassId: classId }));
}
let long = createBattle([c('kilnarch', 'p')], [inert()]);
for (let i = 0; i < 200; i++) long = act(freeze(long), 'unknown');
assert.equal(long.log.length, 128);
bounds(long);

// Deterministic build/class/trait/utility/switch replay, no utility-only stall in 200 rounds.
function replay(seed, classId) {
  let battle = createBattle(['cindupp', 'dewgob', 'budriv'].map((id, i) => c(id, `p${i}`, generateIndividual(seed + i), 18)),
    ['murnub', 'dewgob', 'budriv'].map((id, i) => c(id, `e${i}`, generateIndividual(seed + i + 3), 18)),
    { kind: 'rival', seed, classId, enemyClassId: classId, synergyEnabled: true });
  for (let round = 0; round < 200 && !battle.result; round++) {
    const player = active(battle.player);
    const slot = BY_ID[player.speciesId].abilities.findIndex(name => ABILITIES[name].power &&
      ABILITIES[name].cost + (player.status?.name === 'Hush' ? 2 : 0) <= player.energy);
    battle = slot < 0 ? act(freeze(battle)) : act(freeze(battle), 'ability', { slot });
    bounds(battle);
  }
  assert(battle.result, `Utility stall: seed ${seed}, class ${classId}`);
  return battle;
}
for (const classId of ['none', ...Object.keys(CLASSES)]) for (const seed of [1, 123, 670, 671]) {
  assert.deepEqual(replay(seed, classId), replay(seed, classId));
}
console.log('PASS: battle v2 all 80 profiles/evolutions; every class/trait; capture boundaries; 31 energy/26 shield caps; synergy gating; NPC utility/switch targeting; frozen-input replay; canonical snapshots/log limits');
