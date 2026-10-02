import assert from 'node:assert/strict';
import { createBattle, createCreature, applyAction } from '../Games/Foldwild/battle.js';
import { SAVE_KEY, BACKUP_KEY, RIVALS, freshGame, validateSave, readSave, writeSave } from '../Games/Foldwild/world.js';

// Pure storage contract fixtures, not native-tab or ordinary gameplay acceptance.
function storage(primary = null, failure = null) {
  const slots = new Map([[BACKUP_KEY, 'older backup bytes'], ['unrelated', 'keep']]);
  if (primary !== null) slots.set(SAVE_KEY, primary);
  const calls = [];
  return { slots, calls,
    getItem(key) {
      calls.push(['get', key]);
      if (failure === 'read') throw new Error('SecurityError');
      return slots.get(key) ?? null;
    },
    setItem(key, value) {
      calls.push(['set', key]);
      if (failure === key) throw new Error('QuotaExceededError');
      slots.set(key, value);
    }
  };
}
const initial = freshGame();
const initialRaw = JSON.stringify(initial, null, 2);
const advanced = { ...initial, score: 250 };
const advancedRaw = JSON.stringify(validateSave(advanced));

// Existing API and return shapes remain unchanged, including unguarded replacement.
const oldAPI = storage(initialRaw);
assert.deepEqual(readSave(oldAPI), { state: initial, error: null });
assert.equal(writeSave(advanced, oldAPI), null);
assert.equal(oldAPI.slots.get(BACKUP_KEY), initialRaw);
assert.equal(writeSave(initial, oldAPI), null);
assert.equal(oldAPI.slots.get(SAVE_KEY), JSON.stringify(initial));
assert.equal(oldAPI.slots.get(BACKUP_KEY), advancedRaw);

// Exact metadata comes from the same getItem as validation, never reserialization.
const slot = storage(initialRaw);
const observed = readSave(slot, true);
assert.deepEqual(observed, { state: initial, error: null, raw: initialRaw });
assert.deepEqual(slot.calls, [['get', SAVE_KEY]]);
assert.notEqual(observed.raw, JSON.stringify(observed.state));
assert.equal(writeSave(advanced, slot, observed.raw), null);
assert.equal(slot.slots.get(SAVE_KEY), advancedRaw);
assert.equal(slot.slots.get(BACKUP_KEY), initialRaw);

// NEGATIVE stale-writer fixture: repeated attempts preserve BOTH slots byte for byte.
const newerBytes = [...slot.slots];
for (const stale of [initial, { ...initial, score: 1 }]) {
  slot.calls.length = 0;
  assert.equal(writeSave(stale, slot, observed.raw),
    'Foldwild save conflict: primary changed; primary and backup preserved.');
  assert.deepEqual([...slot.slots], newerBytes);
  assert.deepEqual(slot.calls, [['get', SAVE_KEY]]);
}
// Even identical desired state cannot bypass a stale expectation or rotate backup.
assert.match(writeSave(advanced, slot, initialRaw), /save conflict/);
assert.deepEqual([...slot.slots], newerBytes);
assert.equal(writeSave(advanced, slot, advancedRaw), null);
assert.deepEqual([...slot.slots], newerBytes);

const empty = storage();
assert.deepEqual(readSave(empty, true), { state: null, error: null, raw: null });
assert.equal(writeSave(initial, empty, null), null);
assert.equal(empty.slots.get(BACKUP_KEY), 'older backup bytes');
for (const [primary, expected] of [[initialRaw, null], [null, initialRaw], ['', null], [initialRaw, JSON.stringify(initial)]]) {
  const changed = storage(primary), before = [...changed.slots];
  assert.match(writeSave(initial, changed, expected), /save conflict/);
  assert.deepEqual([...changed.slots], before);
  assert.deepEqual(changed.calls, [['get', SAVE_KEY]]);
}
// NEGATIVE invalid expectation/input fixtures: no implicit unguarded fallback.
for (const expected of [undefined, false, 0, {}, []]) {
  const bad = storage(initialRaw), before = [...bad.slots];
  assert.match(writeSave(initial, bad, expected), /Expected primary/);
  assert.deepEqual([...bad.slots], before);
  assert.deepEqual(bad.calls, []);
}
const invalid = storage(initialRaw);
assert.match(writeSave({ ...initial, version: 4 }, invalid, initialRaw), /version/);
assert.deepEqual(invalid.calls, []);

// Metadata preserves legacy JSON formatting and corrupt bytes; no backup fallback.
const legacy = { version: 1, ...Object.fromEntries(Object.entries(initial).filter(([key]) =>
  ['seed', 'starterId', 'position', 'region', 'roster', 'team', 'seen', 'caught', 'defeatedRivals',
    'score', 'kites', 'encounterIndex', 'nextUid', 'reducedMotion'].includes(key))) };
legacy.roster = structuredClone(legacy.roster);
for (const creature of legacy.roster) {
  for (const key of ['profile', 'traitId', 'cosmeticId']) delete creature[key];
}
const legacyRaw = JSON.stringify(legacy, null, 2), oldSlot = storage(legacyRaw);
const migrated = readSave(oldSlot, true);
assert.equal(migrated.raw, legacyRaw);
assert.equal(migrated.state.version, 3);
assert.equal(migrated.state.finaleStage, 0);
assert.equal(migrated.state.pendingChallenge, null);
assert.equal(writeSave(migrated.state, oldSlot, migrated.raw), null);
assert.equal(oldSlot.slots.get(BACKUP_KEY), legacyRaw);
for (const raw of ['{corrupt', '', JSON.stringify({ ...initial, version: 4 }),
  `{"padding":"${'é'.repeat(140000)}"}`]) {
  const corrupt = storage(raw), before = [...corrupt.slots];
  const result = readSave(corrupt, true);
  assert.equal(result.state, null);
  assert.match(result.error, /Could not read/);
  assert.equal(result.raw, raw);
  assert.deepEqual([...corrupt.slots], before);
}
// Deliberate replacement remains caller-consented, with the observed corrupt bytes backed up.
const replacement = storage('{corrupt');
assert.equal(writeSave(initial, replacement, '{corrupt'), null);
assert.equal(replacement.slots.get(BACKUP_KEY), '{corrupt');

// NEGATIVE denied/quota fixtures: old backup-before-primary failure behavior is unchanged.
for (const failure of ['read', BACKUP_KEY, SAVE_KEY]) {
  const blocked = storage(initialRaw, failure), before = [...blocked.slots];
  if (failure === 'read') {
    assert.deepEqual(readSave(blocked, true), { state: null,
      error: 'Could not read Foldwild save: SecurityError', raw: undefined });
  }
  assert.match(writeSave(advanced, blocked, initialRaw), /SecurityError|QuotaExceededError/);
  assert.equal(blocked.slots.get(SAVE_KEY), initialRaw);
  assert.equal(blocked.slots.get('unrelated'), 'keep');
  if (failure !== SAVE_KEY) assert.deepEqual([...blocked.slots], before);
  else assert.equal(blocked.slots.get(BACKUP_KEY), initialRaw);
}

// Guarded pending-battle round-trip leaves the exact next command and RNG unchanged.
const pending = freshGame();
pending.seen.push(RIVALS[0].team[0].speciesId);
pending.pendingBattle = createBattle(pending.roster, RIVALS[0].team.map((c, i) =>
  createCreature(c.speciesId, c.level, `rival-0-${i}`)),
{ kind: 'rival', seed: 113, classId: pending.activeClass, synergyEnabled: true });
const battleSlot = storage();
assert.equal(writeSave(pending, battleSlot, null), null);
const resumed = readSave(battleSlot, true);
assert.deepEqual(resumed.state.pendingBattle, pending.pendingBattle);
assert.deepEqual(applyAction(resumed.state.pendingBattle, { type: 'wait' }),
  applyAction(pending.pendingBattle, { type: 'wait' }));
assert.equal(writeSave(resumed.state, battleSlot, resumed.raw), null);
console.log('PASS: optimistic expected-null/bytes writes; stale primary AND backup preservation; exact raw metadata; unchanged two-argument API; legacy/pending replay; negative corrupt/UTF-8/version/denied/quota fixtures');
