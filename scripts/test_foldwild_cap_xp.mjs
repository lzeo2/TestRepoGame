import assert from 'node:assert/strict';
import { createCreature, gainXP, GainXP, statsFor } from '../Games/Foldwild/battle.js';
import { freshGame, validateSave, readSave, writeSave, SAVE_KEY } from '../Games/Foldwild/world.js';

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

// Constructed module boundary fixtures, not evidence of natural level-40 play.
assert.equal(GainXP, gainXP);
for (const version of [1, 2]) for (const xp of [0, 9000, 999955, 999956, 999999, 1000000]) {
  const raw = freshGame();
  raw.version = version;
  raw.roster = [{ ...createCreature('hearthol', 40, 'owned-1'), xp, hp: 17, energy: 2 }];
  const original = structuredClone(raw);
  const accepted = validateSave(freeze(raw));
  assert.equal(accepted.roster[0].xp, xp, 'Accepted legacy XP must not be discarded on load');
  const before = structuredClone(accepted);
  freeze(accepted);
  // +44 is a level-two wild reward; +1220 is the maximum three-level-40 reward.
  for (const reward of [0, 44, 1220]) {
    const next = gainXP(accepted.roster[0], reward);
    assert.deepEqual(next, { ...accepted.roster[0], xp: Math.min(1000000, xp + reward) });
    const rewarded = { ...accepted, roster: [next] };
    assert.equal(validateSave(rewarded).roster[0].xp, next.xp);
    const slots = new Map([[SAVE_KEY, JSON.stringify(raw)]]);
    const storage = { getItem: key => slots.get(key) ?? null, setItem: (key, value) => slots.set(key, value) };
    assert.equal(writeSave(rewarded, storage), null);
    assert.deepEqual(readSave(storage), { state: validateSave(rewarded), error: null });
    assert.deepEqual(accepted, before, 'Reward and persistence must not mutate their input');
    assert.deepEqual(raw, original, 'Legacy source must remain unchanged');
  }
}

// Apply thresholds before capping the remainder, including a newly reached level 40.
for (const [speciesId, level, evolved] of [['cindupp', 11, 'briknudge'], ['briknudge', 25, 'hearthol'], ['hearthol', 39, 'hearthol']]) {
  const original = createCreature(speciesId, level, 'owned-1');
  original.xp = 30 + 12 * level - 1;
  original.hp -= 7;
  original.energy -= 2;
  const snapshot = structuredClone(original);
  const next = gainXP(freeze(original), 1);
  assert.equal(next.level, level + 1);
  assert.equal(next.speciesId, evolved);
  assert.equal(next.xp, 0);
  assert.equal(next.hp, statsFor(next).maxHP - 7);
  assert.equal(next.energy, statsFor(next).maxEnergy - 2);
  assert.equal(gainXP({ ...original, hp: 0 }, 1).hp, 0);
  assert.deepEqual(original, snapshot);
}
const advancing = { ...createCreature('hearthol', 39, 'owned-1'), xp: 1000000 };
for (const reward of [44, 600]) {
  const next = gainXP(freeze(advancing), reward);
  assert.equal(next.level, 40);
  assert.equal(next.xp, Math.min(1000000, 1000000 + reward - (30 + 12 * 39)));
  assert.equal(validateSave({ ...freshGame(), roster: [next] }).roster[0].xp, next.xp);
}

// Negative fault fixtures: validation still rejects an imported XP overflow and unsafe sums.
assert.throws(() => validateSave({ ...freshGame(), roster: [{ ...advancing, level: 40, xp: 1000001 }] }), /XP/);
assert.throws(() => gainXP({ ...advancing, xp: Number.MAX_SAFE_INTEGER }, 1), /total xp/);
console.log('PASS: XP cap fixtures; v1/v2 accepted XP retained; near/exact ceiling rewards save/reload; frozen inputs; level 12/26/40 resource deltas; validation rejection unchanged');
