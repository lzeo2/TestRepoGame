import assert from 'node:assert/strict';
import * as data from '../Games/Jankolock/data.js';

const { ARENA, HEROES, ITEMS, RULES, statsFor, draftOffers, botItem } = data;
const ids = ['envelope', 'soles', 'staple', 'forms', 'thermos', 'badge'];
const baseline = { maxHp: 100, speed: 150, damage: 14, shotCooldown: 0.24, abilityMultiplier: 1, spawnShield: 0 };
const original = JSON.stringify([ARENA, HEROES, ITEMS, RULES]);
assert.deepEqual(Object.keys(data).sort(), ['ARENA', 'HEROES', 'ITEMS', 'RULES', 'botItem', 'draftOffers', 'statsFor'].sort());
assert.deepEqual(ARENA, {
  width: 960, height: 600, zone: { x: 480, y: 300, radius: 70 },
  cover: [{ x: 250, y: 130, w: 90, h: 90 }, { x: 620, y: 130, w: 90, h: 90 }, { x: 250, y: 380, w: 90, h: 90 }, { x: 620, y: 380, w: 90, h: 90 }],
  spawns: [{ x: 110, y: 260 }, { x: 110, y: 340 }, { x: 850, y: 260 }, { x: 850, y: 340 }],
});
assert.deepEqual(RULES, { roundSeconds: 60, winInfluence: 40, captureRate: 2, captureWarmup: 1, killInfluence: 4, respawnSeconds: 3, winsNeeded: 3 });
assert.deepEqual(HEROES.map(({ id, name, shape, abilities }) => [id, name, shape, abilities.map(({ id, cooldown }) => [id, cooldown])]), [
  ['courier', 'Tin Courier', 'square', [['rush', 8], ['burst', 7]]],
  ['postmaster', 'Wobble Postmaster', 'round', [['shield', 10], ['slam', 8]]],
  ['clerk', 'Rattle Clerk', 'triangle', [['decoy', 10], ['fan', 8]]],
]);
assert.deepEqual(ITEMS.map(({ id }) => id), ids);
for (const hero of HEROES) {
  assert.deepEqual(Object.keys(hero).sort(), ['id', 'name', 'description', 'shape', 'abilities'].sort());
  assert.ok(hero.description.length > 20);
  for (const ability of hero.abilities) {
    assert.deepEqual(Object.keys(ability).sort(), ['id', 'name', 'description', 'cooldown'].sort());
    assert.ok(ability.name.length && ability.description.length > 20);
  }
}
for (const item of ITEMS) {
  assert.deepEqual(Object.keys(item).sort(), ['id', 'name', 'description'].sort());
  assert.ok(item.name.length && item.description.length > 20);
}
assert.doesNotMatch(original, /\u2014|\p{Extended_Pictographic}|gradient/iu);

function assertFrozen(value) {
  if (value && typeof value === 'object') {
    assert.ok(Object.isFrozen(value));
    Object.values(value).forEach(assertFrozen);
  }
}
[ARENA, HEROES, ITEMS, RULES].forEach(assertFrozen);
assert.throws(() => { ARENA.cover[0].x = 0; }, TypeError);
assert.throws(() => { HEROES[0].abilities[0].cooldown = 0; }, TypeError);
assert.throws(() => ITEMS.push({ id: 'extra' }), TypeError);

assert.deepEqual(statsFor([]), baseline);
const effects = [
  ['envelope', 'maxHp', 120, 140],
  ['soles', 'speed', 165, 181.5],
  ['staple', 'damage', 16.1, 18.515],
  ['forms', 'shotCooldown', 0.216, 0.1944],
  ['thermos', 'abilityMultiplier', 0.9, 0.81],
  ['badge', 'spawnShield', 10, 20],
];
for (const [id, key, once, twice] of effects) {
  for (const [count, expected] of [[1, once], [2, twice]]) {
    const input = Object.freeze(Array(count).fill(id));
    const stats = statsFor(input);
    assertFrozen(stats);
    for (const field of Object.keys(baseline)) {
      assert.ok(Math.abs(stats[field] - (field === key ? expected : baseline[field])) < 1e-10, `${id}: ${field}`);
    }
    assert.deepEqual(input, Array(count).fill(id));
  }
}
const fullyStacked = Object.freeze(ids.flatMap(id => [id, id]));
const allStats = statsFor(fullyStacked);
for (const [, key, , twice] of effects) assert.ok(Math.abs(allStats[key] - twice) < 1e-10);
assert.throws(() => { allStats.maxHp = 0; }, TypeError);

const golden = [
  [0, [['envelope', 'soles', 'forms'], ['soles', 'staple', 'forms'], ['staple', 'forms', 'badge'], ['envelope', 'forms', 'badge']], ['forms', 'envelope', 'thermos']],
  [240, [['envelope', 'staple', 'badge'], ['staple', 'soles', 'badge'], ['staple', 'forms', 'soles'], ['envelope', 'soles', 'badge']], ['thermos', 'envelope', 'thermos']],
  [0xffffffff, [['soles', 'staple', 'forms'], ['envelope', 'soles', 'thermos'], ['envelope', 'soles', 'staple'], ['staple', 'badge', 'envelope']], ['thermos', 'staple', 'thermos']],
];
for (const [seed, offers, bots] of golden) {
  assert.deepEqual([1, 2, 3, 4].map(round => draftOffers(seed, round, [])), offers);
  assert.deepEqual([1, 2, 3].map(actor => botItem(seed, 1, actor, [])), bots);
}

let draftPaths = 0;
function checkDrafts(seed, items = []) {
  if (items.length === 4) {
    draftPaths += 1;
    statsFor(items);
    return;
  }
  const input = Object.freeze([...items]);
  const before = JSON.stringify(input);
  const round = items.length + 1;
  const offers = draftOffers(seed, round, input);
  assertFrozen(offers);
  assert.equal(offers.length, 3);
  assert.equal(new Set(offers).size, 3);
  assert.deepEqual(draftOffers(seed, round, input), offers);
  assert.throws(() => offers.push('badge'), TypeError);
  for (const id of offers) {
    assert.ok(ids.includes(id));
    assert.ok(input.filter(item => item === id).length < 2);
    checkDrafts(seed, [...input, id]);
  }
  for (const actor of [1, 2, 3]) {
    const id = botItem(seed, round, actor, input);
    assert.equal(typeof id, 'string');
    assert.ok(ids.includes(id));
    assert.ok(input.filter(item => item === id).length < 2);
    assert.equal(botItem(seed, round, actor, input), id);
  }
  assert.equal(JSON.stringify(input), before);
}
for (const seed of [0, 240, 0xffffffff]) checkDrafts(seed);
assert.equal(draftPaths, 243);
for (const seed of [0, 240, 0xffffffff]) {
  for (const actor of [1, 2, 3]) {
    const items = [];
    for (let round = 1; round <= 4; round += 1) {
      items.push(botItem(seed, round, actor, Object.freeze([...items])));
      statsFor(items);
    }
    assert.equal(items.length, 4);
  }
}
// Every legal inventory through four picks still leaves at least three choices.
let inventories = 0;
function checkInventory(items = []) {
  for (const seed of [0, 0xffffffff]) {
    const offers = draftOffers(seed, Math.min(items.length + 1, 4), Object.freeze([...items]));
    assert.equal(offers.length, 3);
    for (const id of offers) assert.ok(items.filter(item => item === id).length < 2);
  }
  inventories += 1;
  if (items.length === 4) return;
  for (const id of ids) {
    if (items.filter(item => item === id).length < 2) checkInventory([...items, id]);
  }
}
checkInventory();

for (const items of [undefined, null, {}, 'soles', ['unknown'], ['__proto__'], ['constructor'], [0], [{}], [Symbol('item')], Array(1), ...ids.map(id => [id, id, id])]) {
  assert.throws(() => statsFor(items));
  assert.throws(() => draftOffers(240, 1, items));
  assert.throws(() => botItem(240, 1, 1, items));
}
const badNumbers = [NaN, Infinity, -Infinity, -1, 0x100000000, 1.5, '1', null, undefined, true, 1n, {}, [], Symbol('number')];
for (const value of badNumbers) {
  assert.throws(() => draftOffers(value, 1, []), RangeError);
  assert.throws(() => botItem(value, 1, 1, []), RangeError);
}
for (const value of [...badNumbers, 0, 5, 0xffffffff]) {
  assert.throws(() => draftOffers(240, value, []), RangeError);
  assert.throws(() => botItem(240, value, 1, []), RangeError);
}
for (const value of [...badNumbers, 4, 0xffffffff]) {
  assert.throws(() => botItem(240, 1, value, []), RangeError);
}
const lastEligible = Object.freeze(fullyStacked.filter(id => id !== 'badge'));
assert.equal(botItem(0, 4, 3, lastEligible), 'badge');
assert.throws(() => draftOffers(0, 4, lastEligible), RangeError);
assert.throws(() => botItem(0, 4, 3, fullyStacked), RangeError);
assert.throws(() => draftOffers(0, 4, fullyStacked), RangeError);
assert.equal(JSON.stringify([ARENA, HEROES, ITEMS, RULES]), original);
console.log(`PASS jankolock data: exact exports, frozen contract, stats/caps, 3 golden seeds (0/240/uint32-max), ${draftPaths} four-draft paths, ${inventories} legal inventories, bot picks, bad inputs, no mutation`);
