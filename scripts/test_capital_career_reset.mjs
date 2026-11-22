import assert from 'node:assert/strict';
import {CAPITAL_PROGRESS_KEYS, CAREER_KEY, SAVE_KEY, TUTORIAL_KEY, clearCapitalProgress} from '../Games/Capital Drive/career-reset.js';

function fixture(entries, hooks = {}) {
  const values = new Map(Object.entries(entries)), removals = [], writes = [];
  const storage = {
    getItem(key) { hooks.read?.(key); return values.get(key) ?? null; },
    removeItem(key) { removals.push(key); values.delete(key); hooks.remove?.(key, values); },
    setItem(key, value) { writes.push(key); hooks.write?.(key); values.set(key, value); },
    clear() { assert.fail('A game reset must never clear unrelated browser storage.'); },
  };
  return {storage, values, removals, writes};
}

const progress = {[SAVE_KEY]:'{"discovered":["Kingston"]}', [TUTORIAL_KEY]:'',
  [CAREER_KEY]:'{"cash":4700,"campaignWorld":{"version":1},"campaignAftermath":{"version":1}}'};
const preferences = {'capital-drive-rendering-v1':'performance', 'capital-drive-theme':'light',
  'capital-drive-sound':'on', 'different-game:save':'rank 12'};
const all = {...progress, ...preferences};
assert(Object.isFrozen(CAPITAL_PROGRESS_KEYS));
assert.deepEqual(new Set(CAPITAL_PROGRESS_KEYS), new Set(['capital-drive-v1','capital-drive-career-v1','capital-drive-tutorial-v1']));

const success = fixture(all);
assert.equal(clearCapitalProgress(success.storage).ok, true);
assert.deepEqual(Object.fromEntries(success.values), preferences);
assert.deepEqual(success.removals, CAPITAL_PROGRESS_KEYS);
assert.equal(clearCapitalProgress(success.storage).ok, true, 'repeating the reset is harmless');
assert.deepEqual(success.removals, CAPITAL_PROGRESS_KEYS);

const unreadable = fixture(all, {read(key) { if (key === CAREER_KEY) throw new Error('denied'); }});
assert.equal(clearCapitalProgress(unreadable.storage).ok, false);
assert.deepEqual(unreadable.removals, [], 'snapshot every key before mutation');
assert.deepEqual(Object.fromEntries(unreadable.values), all);
assert.equal(clearCapitalProgress(null).ok, false);

const interrupted = fixture(all, {remove(key) { if (key === CAREER_KEY) throw new Error('blocked after mutation'); }});
const recovered = clearCapitalProgress(interrupted.storage);
assert.equal(recovered.ok, false);
assert.match(recovered.message, /saved progress was restored/);
assert.deepEqual(Object.fromEntries(interrupted.values), all, 'rollback restores the original raw strings, including empty values');
assert.deepEqual(interrupted.writes, [...CAPITAL_PROGRESS_KEYS].reverse());

const concurrent = fixture(all, {remove(key, values) {
  if (key === CAREER_KEY) { values.set(SAVE_KEY,'new progress from another tab'); throw new Error('blocked'); }
}});
const incomplete = clearCapitalProgress(concurrent.storage);
assert.equal(incomplete.ok, false);
assert.match(incomplete.message, /before all saved progress could be restored/);
assert.deepEqual(Object.fromEntries(concurrent.values), {...all, [SAVE_KEY]:'new progress from another tab'});

const concurrentNext = fixture(all, {remove(key, values) {
  if (key === SAVE_KEY) values.set(TUTORIAL_KEY,'new tutorial progress');
}});
assert.equal(clearCapitalProgress(concurrentNext.storage).ok, false);
assert.deepEqual(Object.fromEntries(concurrentNext.values), {...all, [TUTORIAL_KEY]:'new tutorial progress'});
assert.deepEqual(concurrentNext.removals, [SAVE_KEY], 'an updated slot is never deleted');

const blockedRollback = fixture(all, {remove(key) { if (key === CAREER_KEY) throw new Error('blocked'); },
  write(key) { if (key === TUTORIAL_KEY) throw new Error('storage unavailable'); }});
assert.equal(clearCapitalProgress(blockedRollback.storage).ok, false);
assert.deepEqual(blockedRollback.writes, [...CAPITAL_PROGRESS_KEYS].reverse(), 'failed rollback still attempts remaining keys');
assert.equal(blockedRollback.values.get(CAREER_KEY), all[CAREER_KEY]);
assert.equal(blockedRollback.values.get(SAVE_KEY), all[SAVE_KEY]);
console.log('PASS Capital Drive reset: exact progress keys, unrelated settings, preflight, byte-exact rollback, parallel save guard and failed rollback.');
