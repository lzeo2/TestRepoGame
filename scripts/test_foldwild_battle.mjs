import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIES, BY_ID, ABILITIES, ELEMENTS, ELEMENT_WHEEL, OPTIONAL_HIDDEN_SPECIES } from '../Games/Foldwild/data.js';
import { statsFor, createCreature, normalizeCreature, clearEffects, gainXP, GainXP, createBattle, applyAction } from '../Games/Foldwild/battle.js';

const c = (id, level = 3, uid = id) => createCreature(id, level, uid);
const active = side => side.team[side.active];
const act = (b, type = 'wait', fields = {}) => applyAction(b, { type, ...fields });
const effect = (name, appliedAt = 0) => ({ name, remaining: 2, appliedAt });
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function bounds(b) {
  for (const creature of [...b.player.team, ...b.enemy.team]) {
    const s = statsFor(creature);
    assert(Number.isFinite(creature.hp) && creature.hp >= 0 && creature.hp <= s.maxHP);
    assert(Number.isFinite(creature.energy) && creature.energy >= 0 && creature.energy <= s.maxEnergy);
  }
  assert.equal(b.phase, b.result ? 'ended' : 'command');
}

assert.equal(Object.keys(ABILITIES).length, 50);
assert.equal(SPECIES.length, 80);
assert.equal(OPTIONAL_HIDDEN_SPECIES, null);
assert.equal(GainXP, gainXP);
for (const s of SPECIES) {
  assert.equal(BY_ID[s.id], s);
  assert.equal(typeof s.id, 'string');
  assert.equal(s.abilities.length, 4);
  assert(ELEMENTS.includes(s.element));
  for (const name of s.abilities) assert(Object.hasOwn(ABILITIES, name));
  for (const stat of ['hp', 'energy', 'attack', 'defense', 'speed']) assert(Number.isFinite(s.stats[stat]) && s.stats[stat] > 0);
  if (s.evolvesTo) {
    assert(Object.hasOwn(BY_ID, s.evolvesTo));
    assert.equal(s.evolveLevel, s.stage === 1 ? 12 : 26);
    assert.equal(BY_ID[s.evolvesTo].stage, s.stage + 1);
  }
  for (const level of [1, 3, 40]) {
    const creature = c(s.id, level);
    const st = statsFor(creature);
    assert.equal(st.maxHP, Math.floor(s.stats.hp * (1 + 0.045 * (level - 1))));
    assert.equal(st.maxEnergy, Math.floor(s.stats.energy * (1 + 0.045 * (level - 1))));
    assert.equal(creature.hp, st.maxHP);
    assert.equal(creature.energy, st.maxEnergy);
  }
}
for (const a of Object.values(ABILITIES)) {
  assert(Number.isFinite(a.cost) && a.cost >= 0);
  for (const key of ['power', 'heal', 'restore', 'shield']) if (key in a) assert(Number.isFinite(a[key]) && a[key] > 0);
  if (a.status) assert(['Scorch', 'Drag', 'Fray', 'Haze', 'Hush'].includes(a.status));
  for (const key of ['buff', 'debuff']) if (a[key]) {
    assert(['attack', 'defense', 'speed'].includes(a[key].stat));
    assert(a[key].percent > 0 && a[key].percent <= 30);
  }
}

// Every ability runs from a real roster slot, including combined effects.
const used = new Set();
for (const [name, ability] of Object.entries(ABILITIES)) {
  const owner = SPECIES.find(s => s.abilities.includes(name));
  assert(owner, name);
  const player = c(owner.id, 40, 'p');
  player.hp -= 10;
  const target = c('kilnarch', 40, 'e');
  target.energy = 0;
  const before = createBattle([player], [target], { seed: 55 });
  const after = act(before, 'ability', { slot: owner.abilities.indexOf(name) });
  assert(after.log.includes(`p used ${name}.`), name);
  bounds(after);
  if (ability.power) assert(active(after.enemy).hp < target.hp, name);
  if (ability.restore) assert.equal(active(after.player).energy, statsFor(player).maxEnergy);
  used.add(name);
}
assert.equal(used.size, 50);

// All 25 wheel pairs, with both strong and reverse damage and neutral pairs.
let strong = 0, reverse = 0;
for (const own of ELEMENTS) for (const other of ELEMENTS) {
  const a = SPECIES.find(s => s.element === own && ABILITIES[s.abilities[0]].power);
  const d = SPECIES.find(s => s.element === other && s.tier === 'boss');
  const player = c(a.id, 40, 'p');
  const enemy = c(d.id, 40, 'e');
  enemy.energy = 0;
  const multiplier = ELEMENT_WHEEL[own] === other ? 1.5 : ELEMENT_WHEEL[other] === own ? 0.75 : 1;
  if (multiplier === 1.5) strong++;
  if (multiplier === 0.75) reverse++;
  const expected = Math.max(1, Math.floor(ABILITIES[a.abilities[0]].power * statsFor(player).attack / statsFor(enemy).defense * multiplier));
  const after = act(createBattle([player], [enemy]), 'ability', { slot: 0 });
  assert.equal(enemy.hp - active(after.enemy).hp, expected, `${own}/${other}`);
}
assert.equal(strong, 5);
assert.equal(reverse, 5);

let b = createBattle([c('cindupp', 40, 'p')], [c('cindupp', 1, 'e')]);
b = act(b, 'ability', { slot: 3 });
assert.equal(active(b.player).shield.remaining, 2);
b = act(b);
assert.equal(active(b.player).shield.remaining, 1);
b = act(b);
assert.equal(active(b.player).shield, null);
b = act(b, 'ability', { slot: 3 });
b = act(b, 'ability', { slot: 3 });
assert(active(b.player).shield.hp <= 18);
assert.equal(active(b.player).shield.remaining, 2);

b = createBattle([c('ashbarrow', 40, 'p')], [c('cindupp', 1, 'e')]);
b = act(b, 'ability', { slot: 3 });
assert.equal(active(b.player).buffs.defense.percent, 25);
assert.equal(active(b.player).buffs.defense.remaining, 2);
b = act(b, 'ability', { slot: 3 });
assert.equal(active(b.player).buffs.defense.percent, 25);
b = act(b);
assert.equal(active(b.player).buffs.defense.remaining, 1);
b = act(b);
assert.deepEqual(active(b.player).buffs, {});

// Damage over time bypasses a shield and ticks exactly twice.
const scorched = c('kilnarch', 40, 'p');
scorched.status = effect('Scorch');
scorched.shield = { hp: 22, remaining: 2, appliedAt: 0 };
const harmless = c('kilnarch', 40, 'e');
harmless.energy = 0;
b = createBattle([scorched], [harmless]);
const hp = scorched.hp;
b = act(b);
assert.equal(active(b.player).hp, hp - 6);
assert.equal(active(b.player).shield.hp, 22);
assert.equal(active(b.player).status.remaining, 1);
b = act(b);
assert.equal(active(b.player).hp, hp - 12);
assert.equal(active(b.player).status, null);
b = act(b);
assert.equal(active(b.player).hp, hp - 12);

// Actual status application before/after victim action stamps the right counter.
for (const [id, name] of [['cindupp', 'Scorch'], ['dewgob', 'Drag'], ['budriv', 'Fray'], ['shardip', 'Haze'], ['murnub', 'Hush']]) {
  const enemy = c('kilnarch', 40, 'e');
  enemy.energy = 0;
  b = act(createBattle([c(id, 40, 'p')], [enemy]), 'ability', { slot: 1 });
  assert.equal(active(b.enemy).status.name, name);
  const remaining = active(b.enemy).status.remaining;
  assert([1, 2].includes(remaining));
  for (let i = 0; i < remaining; i++) b = act(b);
  assert.equal(active(b.enemy).status, null);
}
const hush = c('cindupp', 40, 'p');
hush.energy = 0;
hush.status = effect('Hush');
b = createBattle([hush], [harmless]);
const blocked = act(b, 'ability', { slot: 2 });
assert.equal(blocked.round, b.round);
assert.equal(active(blocked.enemy).turnsTaken, 0);
b = act(b);
assert.equal(active(b.player).energy, 3);
assert.equal(active(b.player).status.remaining, 1);
b = act(b, 'ability', { slot: 2 });
assert.equal(active(b.player).energy, 8); // 3 - surcharge2 + restore7
assert.equal(active(b.player).status, null);

// Backwash targets own cleanse; it leaves stat modifiers untouched.
const washer = c('basinull', 40, 'p');
washer.status = effect('Hush');
washer.buffs.attack = { percent: -25, remaining: 2, appliedAt: 0 };
b = act(createBattle([washer], [harmless]), 'ability', { slot: 2 });
assert.equal(active(b.player).status, null);
assert.equal(active(b.player).buffs.attack.percent, -25);
assert(active(b.enemy).hp < harmless.hp);
// A self buff replaces a same-stat negative status, rather than stacking.
const braced = c('ashbarrow', 40, 'p');
braced.status = effect('Fray');
b = act(createBattle([braced], [harmless]), 'ability', { slot: 3 });
assert.equal(active(b.player).status, null);
assert.equal(active(b.player).buffs.defense.percent, 25);

// Shield absorbs first, but cannot make damage or HP negative.
const protectedTarget = c('kilnarch', 40, 'e');
protectedTarget.energy = 0;
protectedTarget.shield = { hp: 22, remaining: 2, appliedAt: 0 };
b = act(createBattle([c('cindupp', 1, 'p')], [protectedTarget]), 'ability', { slot: 0 });
assert.equal(active(b.enemy).hp, protectedTarget.hp);
assert(active(b.enemy).shield.hp < 22);
const fragileShield = { ...protectedTarget, shield: { hp: 1, remaining: 2, appliedAt: 0 } };
b = act(createBattle([c('aurelvane', 40, 'p')], [fragileShield]), 'ability', { slot: 0 });
assert.equal(active(b.enemy).shield, null);
assert(active(b.enemy).hp < fragileShield.hp);
// Scorch reapplication refreshes the one status, never adds a second DOT.
const burningTarget = c('kilnarch', 40, 'e');
burningTarget.energy = 0;
burningTarget.status = { name: 'Scorch', remaining: 1, appliedAt: 0 };
b = act(createBattle([c('cindupp', 40, 'p')], [burningTarget]), 'ability', { slot: 1 });
assert.equal(active(b.enemy).status.name, 'Scorch');
assert.equal(active(b.enemy).status.remaining, 2); // slower player applies after enemy's action
assert.equal(b.log.filter(line => line === 'e took 6 Scorch damage.').length, 1);
// Enemy healing is affordable, below 30%, and never monopolizes consecutive turns.
const lowEnemy = c('kilnarch', 40, 'e');
lowEnemy.hp = 40;
b = act(createBattle([c('kilnarch', 40, 'p')], [lowEnemy]));
assert(b.log.includes('e used Heat Stitch.'));
assert.equal(active(b.enemy).hp, 60);
b = act(b);
assert(b.log.includes('e used Crucible Cry.'));
assert.equal(active(b.enemy).energy, lowEnemy.energy - 6 - 8);
// Enemy with zero energy and Hush uses universal Wait, not an invented slot.
const mutedEnemy = c('cindupp', 40, 'e');
mutedEnemy.energy = 0;
mutedEnemy.status = effect('Hush');
b = act(createBattle([c('kilnarch', 40, 'p')], [mutedEnemy]));
assert(b.log.includes('e waited and restored 3 energy.'));
assert.equal(active(b.enemy).energy, 3);
// Hush can interrupt a queued zero-cost restore; fall back without negative energy.
const interrupted = c('cindupp', 1, 'p');
interrupted.energy = 0;
const silencer = c('murnub', 40, 'e');
silencer.energy = 5;
b = act(createBattle([interrupted], [silencer]), 'ability', { slot: 2 });
assert(b.log.includes('e used Hollow Note.'));
assert(b.log.includes('p waited and restored 3 energy.'));
assert(!b.log.includes('p used Ember Bank.'));
assert.equal(active(b.player).energy, 3);
assert.equal(active(b.player).status.remaining, 1);
// Same-stat statuses and signed modifiers replace each other in both directions.
const hazyTarget = { ...harmless, status: effect('Haze') };
b = act(createBattle([c('hushpip', 40, 'p')], [hazyTarget]), 'ability', { slot: 3 });
assert.equal(active(b.enemy).status, null);
assert.equal(active(b.enemy).buffs.attack.percent, -25);
const buffedTarget = { ...harmless, buffs: { attack: { percent: 25, remaining: 2, appliedAt: 0 } } };
b = act(createBattle([c('shardip', 40, 'p')], [buffedTarget]), 'ability', { slot: 1 });
assert.equal(active(b.enemy).status.name, 'Haze');
assert.equal(active(b.enemy).buffs.attack, undefined);
const boosted = c('cindupp', 40, 'p');
boosted.buffs.attack = { percent: 20, remaining: 2, appliedAt: 0 };
b = act(createBattle([boosted], [harmless]), 'ability', { slot: 0 });
assert.equal(harmless.hp - active(b.enemy).hp,
  Math.max(1, Math.floor(18 * Math.floor(statsFor(boosted).attack * 1.2) / statsFor(harmless).defense)));

const outgoing = c('kilnarch', 40, 'p');
outgoing.status = effect('Scorch');
outgoing.shield = { hp: 18, remaining: 2, appliedAt: 0 };
outgoing.buffs.defense = { percent: 25, remaining: 2, appliedAt: 0 };
b = createBattle([outgoing, c('kilnarch', 40, 'reserve')], [c('cindupp', 1, 'e')]);
b = act(b, 'switch', { index: 1 });
assert.equal(b.player.active, 1);
assert.equal(b.player.team[0].hp, outgoing.hp);
assert.equal(b.player.team[0].status, null);
assert.equal(b.player.team[0].shield, null);
assert.deepEqual(b.player.team[0].buffs, {});
assert.equal(active(b.enemy).turnsTaken, 1);
assert.equal(b.player.team[0].turnsTaken, 1);
for (const index of [-1, 1, 3, NaN]) assert.equal(act(b, 'switch', { index }).round, b.round);

const doomed = c('cindupp', 1, 'doomed');
doomed.hp = 1;
b = act(createBattle([doomed, c('kilnarch', 40, 'reserve')], [c('aurelvane', 40, 'e')]), 'ability', { slot: 0 });
assert.equal(b.player.team[0].hp, 0);
assert.equal(b.player.team[0].turnsTaken, 0);
assert.equal(b.player.active, 1);
assert.equal(b.result, null);
assert.equal(act(b, 'switch', { index: 0 }).round, b.round);
b = act(createBattle([doomed], [c('aurelvane', 40, 'e')]), 'ability', { slot: 0 });
assert.equal(b.result, 'lost');
assert.equal(b.phase, 'ended');
assert.deepEqual(act(b), b);
const dead = c('cindupp');
dead.hp = 0;
assert.equal(createBattle([dead], [harmless]).result, 'lost');
assert.equal(createBattle([harmless], [dead]).result, 'won');
const enemyDead = c('cindupp', 1, 'e1');
enemyDead.hp = 1;
b = act(createBattle([c('aurelvane', 40, 'p')], [enemyDead, c('cindupp', 1, 'e2')], { kind: 'rival' }), 'ability', { slot: 0 });
assert.equal(b.enemy.active, 1);
assert.equal(b.enemy.team[0].turnsTaken, 0);
assert.equal(b.enemy.team[1].turnsTaken, 0);
b = act(b, 'ability', { slot: 0 });
assert.equal(b.result, 'won');

const catchable = c('kilnarch', 40, 'e');
catchable.hp = Math.floor(statsFor(catchable).maxHP / 2);
catchable.energy = 0;
let hit, miss;
for (let seed = 0; seed < 4096 && (!hit || !miss); seed++) {
  const before = createBattle([harmless], [catchable], { seed });
  const after = act(before, 'capture');
  if (after.result === 'captured') hit = { seed, after };
  else miss = { seed, after };
}
assert(hit && miss);
assert.equal(hit.after.phase, 'ended');
assert.equal(hit.after.captured.uid, catchable.uid);
assert.equal(hit.after.captured.status, null);
assert.equal(hit.after.captured.hp, catchable.hp);
assert.equal(active(hit.after.enemy).turnsTaken, 0);
assert.equal(active(miss.after.enemy).turnsTaken, 1);
assert.equal(active(miss.after.player).turnsTaken, 1);
assert.equal(miss.after.round, 2);
assert.deepEqual(act(createBattle([harmless], [catchable], { seed: hit.seed }), 'capture'), hit.after);
let no = createBattle([harmless], [c('kilnarch', 40, 'e')]);
assert.equal(act(no, 'capture').round, 1);
assert.equal(act(no, 'capture').seed, no.seed);
no = createBattle([harmless], [catchable], { kind: 'rival' });
for (const type of ['capture', 'flee']) {
  assert.equal(act(no, type).result, null);
  assert.equal(act(no, type).round, 1);
}
assert.equal(act(createBattle([harmless], [catchable]), 'flee').result, 'fled');
// Check exact chance boundaries and status bonus, not only existence of hit/miss.
for (const ratio of [0.5, 0.01]) for (const status of [null, effect('Hush')]) {
  const target = { ...catchable, hp: statsFor(catchable).maxHP * ratio, status };
  const probability = Math.min(0.9, 0.12 + 0.75 * (1 - ratio) + (status ? 0.08 : 0));
  for (const seed of [0, 670, 671, 2000, 4095]) {
    const roll = ((Math.imul(1664525, seed) + 1013904223) >>> 0) / 0x100000000;
    const next = act(createBattle([harmless], [target], { seed }), 'capture');
    assert.equal(next.result === 'captured', roll < probability);
    if (next.captured) {
      assert.equal(next.captured.status, null);
      assert.deepEqual(next.captured.buffs, {});
      assert(next.captured.hp >= 1);
    }
  }
}

// Speed/status modifiers alter the real damage/order, not the stored base stats.
for (const [name, stat] of [['Haze', 'attack'], ['Fray', 'defense']]) {
  const p = c('kilnarch', 40, 'p');
  const e = c('kilnarch', 40, 'e');
  e.energy = 0;
  (stat === 'attack' ? p : e).status = effect(name);
  b = act(createBattle([p], [e]), 'ability', { slot: 2 });
  const atk = stat === 'attack' ? Math.floor(statsFor(p).attack * 0.8) : statsFor(p).attack;
  const def = stat === 'defense' ? Math.floor(statsFor(e).defense * 0.8) : statsFor(e).defense;
  assert.equal(e.hp - active(b.enemy).hp, Math.max(1, Math.floor(42 * atk / def)));
}
const dragged = c('cindupp', 3, 'p');
const speedPeer = c('cindupp', 3, 'e');
dragged.status = effect('Drag');
b = act(createBattle([dragged], [speedPeer]), 'ability', { slot: 0 });
assert(b.log[0].startsWith('e used'));

function xpTo(from, to) { let xp = 0; for (let level = from; level < to; level++) xp += 30 + 12 * level; return xp; }
for (const [id, expected] of [['sparvane', 'sparvane'], ['sootnub', 'ashbarrow'], ['cindupp', 'hearthol']]) {
  const original = c(id, 1, 'stable');
  original.hp -= 10;
  original.energy -= 3;
  const next = gainXP(freeze(original), xpTo(1, 26) + 5);
  assert.equal(next.speciesId, expected);
  assert.equal(next.level, 26);
  assert.equal(next.xp, 5);
  assert.equal(next.uid, 'stable');
  assert.equal(next.hp, statsFor(next).maxHP - 10);
  assert.equal(next.energy, statsFor(next).maxEnergy - 3);
}
assert.equal(gainXP(c('cindupp', 11), 30 + 12 * 11 - 1).speciesId, 'cindupp');
assert.equal(gainXP(c('cindupp', 11), 30 + 12 * 11).speciesId, 'briknudge');
assert.equal(gainXP(c('briknudge', 25), 30 + 12 * 25).speciesId, 'hearthol');
assert.equal(gainXP(dead, 10000).hp, 0);
let nearLimit = gainXP(c('cindupp', 39), 30 + 12 * 39 + 9000);
assert.equal(nearLimit.level, 40);
assert.equal(nearLimit.xp, 9000);
nearLimit = gainXP(nearLimit, 5);
assert.equal(nearLimit.level, 40);
assert.equal(nearLimit.xp, 9005);

const frozenTeam = freeze([outgoing, c('kilnarch', 40, 'reserve')]);
const originalBattle = createBattle(frozenTeam, freeze([harmless]));
const saved = structuredClone(originalBattle);
freeze(originalBattle);
for (const action of [{ type: 'ability', slot: 0 }, { type: 'wait' }, { type: 'switch', index: 1 }, { type: 'capture' }, { type: 'flee' }, { type: 'unknown' }]) {
  const next = applyAction(originalBattle, freeze(action));
  assert.notEqual(next, originalBattle);
  assert.deepEqual(originalBattle, saved);
  bounds(next);
}
assert.notEqual(clearEffects(outgoing), outgoing);
assert.equal(outgoing.status.name, 'Scorch');

const badInputs = [NaN, Infinity, -Infinity];
for (const n of badInputs) {
  for (const key of ['hp', 'energy', 'xp', 'turnsTaken']) assert.throws(() => normalizeCreature({ ...c('cindupp'), [key]: n }));
  assert.throws(() => gainXP(c('cindupp'), n));
  assert.throws(() => createBattle([harmless], [catchable], { seed: n }));
}
for (const id of ['unknown', '__proto__', 'constructor', null, 1]) assert.throws(() => createCreature(id));
for (const level of [0, 41, 1.5, NaN]) assert.throws(() => c('cindupp', level));
assert.throws(() => gainXP(c('cindupp'), -1));
assert.throws(() => gainXP({ ...c('cindupp'), xp: Number.MAX_SAFE_INTEGER }, 1));
for (const team of [[], [harmless, harmless, harmless, harmless]]) assert.throws(() => createBattle(team, [catchable]));
assert.throws(() => createBattle([harmless], [catchable, catchable]));
assert.throws(() => createBattle([harmless], [catchable], { kind: 'unknown' }));
assert.throws(() => createBattle([harmless], [catchable], { active: 1 }));
assert.throws(() => normalizeCreature({ ...c('cindupp'), status: effect('unknown') }));
const capped = normalizeCreature({ ...c('cindupp'), hp: 1e20, energy: -10 });
assert.equal(capped.hp, statsFor(capped).maxHP);
assert.equal(capped.energy, 0);
for (const action of [null, {}, { type: 'ability', slot: -1 }, { type: 'ability', slot: 4 }, { type: 'ability', slot: NaN }]) {
  assert.equal(applyAction(saved, action).round, saved.round);
}
for (const key of ['seed', 'round']) assert.throws(() => act({ ...saved, [key]: NaN }));
assert.throws(() => act({ ...saved, phase: 'ended' }));

// Replay complete battles, not just first-step RNG; everything stays bounded.
function replay(seed) {
  let battle = createBattle([c('cindupp', 15, 'p'), c('dewgob', 15, 'p2')],
    [c('budriv', 12, 'e'), c('murnub', 12, 'e2')], { kind: 'rival', seed });
  for (let i = 0; i < 100 && !battle.result; i++) {
    const p = active(battle.player);
    const names = BY_ID[p.speciesId].abilities;
    const slot = names.findIndex(name => ABILITIES[name].power && ABILITIES[name].cost + (p.status?.name === 'Hush' ? 2 : 0) <= p.energy);
    battle = slot >= 0 ? act(battle, 'ability', { slot }) : act(battle);
    bounds(battle);
  }
  assert(battle.result, 'Battle did not terminate in 100 commands.');
  return battle;
}
assert.deepEqual(replay(1234), replay(1234));
const source = readFileSync(new URL('../Games/Foldwild/battle.js', import.meta.url), 'utf8');
assert(!/https?:\/\/|fetch\s*\(|WebSocket|document\.|window\./.test(source));
console.log('PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only');
console.log(`Capture reproducibility: hit seed=${hit.seed}, miss seed=${miss.seed}`);
