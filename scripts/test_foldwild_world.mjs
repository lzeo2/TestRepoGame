import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIES, BY_ID, ELEMENTS } from '../Games/Foldwild/data.js';
import { statsFor, createCreature } from '../Games/Foldwild/battle.js';
import * as world from '../Games/Foldwild/world.js';
const { SAVE_KEY, BACKUP_KEY, REGIONS, REGION_LAYOUTS, RIVALS, PLAYER_BOUNDS, MAX_ROSTER, freshGame, validateSave, readSave, writeSave, worldPoints, nearbyPoint } = world;
const clone = structuredClone;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function bad(change, pattern = /Invalid|Unknown|Duplicate|Missing|Unsupported|must|expected/) {
  const state = freshGame();
  change(state);
  assert.throws(() => validateSave(state), pattern);
}
assert.deepEqual(Object.keys(world).sort(), ['SAVE_KEY', 'BACKUP_KEY', 'REGIONS', 'REGION_LAYOUTS', 'RIVALS', 'PLAYER_BOUNDS', 'MAX_ROSTER',
  'freshGame', 'validateSave', 'readSave', 'writeSave', 'worldPoints', 'nearbyPoint', 'unlockedRegion', 'movePosition', 'routeTo', 'releaseCreature',
  'challengeFor', 'settleChallenge'].sort());
assert.equal(SAVE_KEY, 'foldwild-save-v1');
assert.equal(MAX_ROSTER, 160);
assert.deepEqual(PLAYER_BOUNDS, { minX: -80, maxX: 80, minZ: -80, maxZ: 80 });
assert.deepEqual(REGIONS.map(r => [r.id, r.name]), [[0, 'Rootfold Meadow'], [1, 'Stillwater Reach'], [2, 'Emberstep Quarry'], [3, 'Stonefold Ridge'], [4, 'Quietfold Hollow']]);
assert.deepEqual(RIVALS.map(r => r.name), ['Maren', 'Sola', 'Neri', 'Iven', 'Oren']);
for (const value of [REGIONS, RIVALS, PLAYER_BOUNDS, ...REGIONS, ...RIVALS, ...RIVALS.flatMap(r => [r.team, ...r.team])]) assert(Object.isFrozen(value));
const rivalElements = new Set();
for (const [i, rival] of RIVALS.entries()) {
  assert.equal(rival.id, i);
  assert.equal(rival.team.length, [1, 2, 2, 3, 3][i]);
  assert(rival.dialogue && rival.winDialogue);
  for (const entry of rival.team) {
    assert(Object.hasOwn(BY_ID, entry.speciesId));
    assert(entry.level >= [7, 13, 19, 26, 33][i] && entry.level <= [8, 14, 20, 27, 34][i]);
    rivalElements.add(BY_ID[entry.speciesId].element);
  }
}
assert.equal(rivalElements.size, 5);
for (const starter of ['cindupp', 'dewgob', 'pithnip']) {
  const state = freshGame(starter, 0xffffffff);
  assert.equal(state.version, 3);
  assert.equal(state.seed, 0xffffffff);
  assert.equal(state.starterId, starter);
  assert.deepEqual(state.position, REGION_LAYOUTS[0].spawn);
  assert.deepEqual(state.roster, [createCreature(starter, 3, 'owned-1')]);
  assert.deepEqual(state.team, ['owned-1']);
  assert.deepEqual(state.seen, [starter]);
  assert.deepEqual(state.caught, [starter]);
  assert.deepEqual(state.defeatedRivals, []);
  assert.equal(state.score, 0);
  assert.equal(state.kites, 8);
  assert.equal(state.encounterIndex, 0);
  assert.equal(state.nextUid, 2);
  assert.equal(state.reducedMotion, false);
  assert(!Object.isFrozen(state));
}
for (const id of ['shardip', 'constructor', '__proto__', 'unknown', null]) assert.throws(() => freshGame(id));
for (const seed of [-1, 0x100000000, 1.1, NaN, Infinity, '1']) assert.throws(() => freshGame('cindupp', seed));
const original = freeze(freshGame());
const snapshot = validateSave(original);
assert.deepEqual(snapshot, original);
for (const key of ['position', 'roster', 'team', 'seen', 'caught', 'defeatedRivals']) assert.notEqual(snapshot[key], original[key]);
assert.notEqual(snapshot.roster[0], original.roster[0]);
assert.notEqual(snapshot.roster[0].buffs, original.roster[0].buffs);
snapshot.roster[0].hp = 0;
assert(original.roster[0].hp > 0);
assert.equal(validateSave(snapshot).roster[0].hp, 0);

// Every canonical species round-trips; no hidden id or fabricated derived stat is accepted.
const all = freshGame();
all.roster = SPECIES.map((s, i) => createCreature(s.id, i % 40 + 1, `owned-${i + 1}`));
all.seen = SPECIES.map(s => s.id);
all.caught = [...all.seen];
assert.equal(validateSave(freeze(all)).roster.length, 80);
assert.equal(validateSave(all).nextUid, 81);
const capacity = freshGame();
capacity.roster = Array.from({ length: MAX_ROSTER }, (_, i) => createCreature('cindupp', 3, `owned-${i + 1}`));
assert.equal(validateSave(capacity).nextUid, 161);
capacity.team = ['owned-1', 'owned-2', 'owned-3'];
capacity.roster[1].hp = 0;
assert.deepEqual(validateSave(capacity).team, capacity.team);
assert.equal(validateSave(capacity).roster[1].hp, 0);
bad(s => { s.roster = Array.from({ length: 161 }, (_, i) => createCreature('cindupp', 3, `owned-${i + 1}`)); });
for (const id of ['unknown', 'hidden', '__proto__', 'constructor', 'toString', null, 80]) {
  bad(s => { s.roster[0].speciesId = id; });
  bad(s => { s.seen = [id]; });
  bad(s => { s.caught = [id]; });
}
const injected = { ...freshGame(), ...JSON.parse('{"__proto__":{"polluted":true},"junk":42}') };
Object.assign(injected.roster[0], { attack: 1e100, stats: { hp: 1e100 }, maxHP: 1e100, junk: 'drop' });
injected.position.junk = 'drop';
injected.roster[0].hp = 1e100;
injected.roster[0].energy = -100;
const clean = validateSave(injected);
assert(!Object.hasOwn(clean, 'junk'));
assert(!Object.hasOwn(clean, '__proto__'));
assert(!Object.hasOwn(clean.position, 'junk'));
assert.deepEqual(Object.keys(clean.roster[0]).sort(), Object.keys(createCreature('cindupp')).sort());
assert.equal(clean.roster[0].hp, statsFor(clean.roster[0]).maxHP);
assert.equal(clean.roster[0].energy, 0);
assert.equal({}.polluted, undefined);
for (const object of [null, [], new Date(), Object.create(null), Object.create(freshGame())]) assert.throws(() => validateSave(object));
bad(s => { s.position = Object.create(s.position); });
bad(s => { s.roster[0] = Object.create(s.roster[0]); });
bad(s => { Object.defineProperty(s, 'seed', { get() { throw new Error('Getter invoked'); } }); });
for (const uid of ['', 'Owned-1', 'bad uid', '☃', 'x'.repeat(49), '__proto__', null, 1]) bad(s => { s.roster[0].uid = uid; });
bad(s => { s.roster.push(clone(s.roster[0])); });
bad(s => { s.team.push('owned-1'); });
bad(s => { s.team = ['missing']; });
bad(s => { s.team = []; });
bad(s => { s.team = new Array(1); });
bad(s => { s.roster = []; });
bad(s => { s.roster = new Array(1); });
bad(s => { s.team = ['owned-1', 'a', 'b', 'c']; });
bad(s => { s.seen.push('cindupp'); });
bad(s => { s.caught.push('cindupp'); });
bad(s => { s.seen = new Array(1); });
bad(s => { s.caught = Array(81).fill('cindupp'); });
const missingCollections = freshGame();
missingCollections.roster.push(createCreature('dewgob', 3, 'owned-9'));
missingCollections.seen = [];
missingCollections.caught = ['pithnip'];
assert.deepEqual(validateSave(missingCollections).caught, ['pithnip', 'cindupp', 'dewgob']);
assert.deepEqual(validateSave(missingCollections).seen, ['pithnip', 'cindupp', 'dewgob']);
assert.equal(validateSave(missingCollections).nextUid, 10);
bad(s => { s.roster[0].uid = 'owned-1000000000'; s.team = [s.roster[0].uid]; });
bad(s => { s.roster[0].uid = 'owned-999999999999999999999'; s.team = [s.roster[0].uid]; });
const lastUid = freshGame();
lastUid.roster[0].uid = 'owned-999999999';
lastUid.team = [lastUid.roster[0].uid];
assert.equal(validateSave(lastUid).nextUid, 1e9);
for (const level of [0, 41, 3.5, '3', NaN, Infinity]) bad(s => { s.roster[0].level = level; });
for (const xp of [-1, 1e6 + 1, 0.1, Number.MAX_SAFE_INTEGER, '0', NaN, Infinity]) bad(s => { s.roster[0].xp = xp; });
for (const n of [NaN, Infinity, -Infinity, '0', null]) {
  for (const key of ['hp', 'energy']) bad(s => { s.roster[0][key] = n; }, /finite/);
  for (const key of ['x', 'z', 'yaw']) bad(s => { s.position[key] = n; }, /finite/);
}
const moved = freshGame();
moved.position = { x: 1e300, z: -1e300, yaw: 1e300 };
const bounded = validateSave(moved).position;
assert.equal(bounded.x, 79.65);
assert.equal(bounded.z, -79.65);
assert(bounded.yaw >= -Math.PI && bounded.yaw < Math.PI);
for (const yaw of [-100 * Math.PI, -Math.PI, 0, Math.PI, 100 * Math.PI]) {
  moved.position.yaw = yaw;
  const normalized = validateSave(moved).position.yaw;
  assert(normalized >= -Math.PI && normalized < Math.PI);
}
const effects = freshGame();
Object.assign(effects.roster[0], { hp: 5, energy: 2, xp: 1e6, turnsTaken: 4,
  status: { name: 'Hush', remaining: 2, appliedAt: 3 }, shield: { hp: 18, remaining: 1, appliedAt: 2 },
  buffs: { attack: { percent: 20, remaining: 2, appliedAt: 3 } } });
const cleared = validateSave(freeze(effects)).roster[0];
assert.equal(cleared.hp, 5);
assert.equal(cleared.energy, 2);
assert.equal(cleared.xp, 1e6);
assert.equal(cleared.status, null);
assert.equal(cleared.shield, null);
assert.deepEqual(cleared.buffs, {});
assert.equal(cleared.turnsTaken, 0);
for (const status of [false, 0, '', [], {}, { name: 'injected', remaining: 2, appliedAt: 0 },
  { name: 'Scorch', remaining: 3, appliedAt: 0 }, { name: 'Scorch', remaining: 1, appliedAt: 1 }]) bad(s => { s.roster[0].status = status; });
for (const shield of [false, {}, { hp: 27, remaining: 2, appliedAt: 0 }]) bad(s => { s.roster[0].shield = shield; });
for (const buffs of [null, [], { hp: { percent: 20, remaining: 2, appliedAt: 0 } },
  JSON.parse('{"__proto__":{"percent":20,"remaining":2,"appliedAt":0}}'),
  { attack: { percent: 100, remaining: 2, appliedAt: 0 } }, { attack: null }]) bad(s => { s.roster[0].buffs = buffs; });
for (const key of ['seed', 'score', 'kites', 'encounterIndex', 'nextUid', 'region']) {
  for (const n of [-1, 1.5, NaN, Infinity, '1']) bad(s => { s[key] = n; });
}
for (const [key, tooBig] of [['seed', 0x100000000], ['score', 1e9 + 1], ['kites', 1000], ['encounterIndex', 1e9 + 1], ['nextUid', 1e9 + 1], ['region', 5]]) bad(s => { s[key] = tooBig; });
bad(s => { s.nextUid = 1; });
bad(s => { s.reducedMotion = 1; });
for (const version of [0, 4, '1', null]) bad(s => { s.version = version; });
for (const sequence of [[1], [0, 2], [0, 0], [0, 1, 3], ['0']]) bad(s => { s.defeatedRivals = sequence; });
bad(s => { s.region = 1; });
bad(s => { s.defeatedRivals = [0]; s.region = 2; });
for (let region = 0; region < 5; region++) {
  const state = freshGame();
  state.defeatedRivals = Array.from({ length: region }, (_, i) => i);
  state.region = region;
  assert.equal(validateSave(state).region, region);
}

// Frozen native-storage-shaped fixture: every failure preserves every stored byte.
function fixture(initial = null, failure = null) {
  const slots = new Map([['other-game', 'untouched']]);
  if (initial !== null) slots.set(SAVE_KEY, initial);
  const calls = [];
  return { slots, calls, storage: Object.freeze({
    getItem(key) { calls.push(['get', key]); if (failure === 'read') throw new Error('SecurityError'); return slots.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); if (failure === 'write') throw new Error('QuotaExceededError'); slots.set(key, value); },
    removeItem() { assert.fail('Must never remove storage'); }, clear() { assert.fail('Must never clear storage'); }
  }) };
}
const missing = fixture();
assert.deepEqual(readSave(missing.storage), { state: null, error: null });
const save = fixture();
assert.equal(writeSave(original, save.storage), null);
assert.deepEqual(readSave(save.storage), { state: original, error: null });
assert.equal(save.slots.get('other-game'), 'untouched');
assert(save.calls.every(([, key]) => key === SAVE_KEY || key === BACKUP_KEY));
const corruptSpecies = freshGame();
corruptSpecies.roster[0].speciesId = '__proto__';
const corruptUid = freshGame();
corruptUid.roster[0].uid = 'bad uid';
for (const raw of ['{bad json', 'null', '[]', JSON.stringify({ ...freshGame(), version: 4 }),
  JSON.stringify({ ...freshGame(), seed: -1 }), JSON.stringify(corruptSpecies), JSON.stringify(corruptUid),
  ' '.repeat(256 * 1024 + 1)]) {
  const stored = fixture(raw);
  const before = [...stored.slots];
  const result = readSave(stored.storage);
  assert.equal(result.state, null);
  assert.equal(typeof result.error, 'string');
  assert.deepEqual([...stored.slots], before);
  assert.deepEqual(stored.calls, [['get', SAVE_KEY]]);
}
const blockedRead = fixture('keep bytes', 'read');
assert.match(readSave(blockedRead.storage).error, /SecurityError/);
assert.equal(blockedRead.slots.get(SAVE_KEY), 'keep bytes');
const quota = fixture('keep bytes', 'write');
assert.match(writeSave(original, quota.storage), /QuotaExceededError/);
assert.equal(quota.slots.get(SAVE_KEY), 'keep bytes');
assert.match(readSave(Object.freeze({ getItem() { throw null; } })).error, /null/);
assert.match(writeSave(original, Object.freeze({ getItem() { return null; }, setItem() { throw null; } })), /null/);
const invalidWrite = fixture('keep bytes');
assert.match(writeSave({ ...freshGame(), version: 4 }, invalidWrite.storage), /version/);
assert.deepEqual(invalidWrite.calls, []);
assert.equal(invalidWrite.slots.get(SAVE_KEY), 'keep bytes');
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
try {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError getter'); } });
  assert.match(readSave().error, /SecurityError getter/);
  assert.match(writeSave(original), /SecurityError getter/);
  assert.deepEqual(readSave(missing.storage), { state: null, error: null });
} finally {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else delete globalThis.localStorage;
}

// Deterministic habitat/tier pools, every eligible canonical form, unique point identities, no mutation.
const availability = Array.from({ length: 5 }, () => new Set());
const ranges = [[2, 5], [8, 13], [14, 19], [22, 28], [27, 34]];
let habitatHits = 0;
let basicHits = 0;
for (let region = 0; region < 5; region++) {
  const state = freshGame('cindupp', 42);
  state.region = region;
  state.defeatedRivals = Array.from({ length: region }, (_, i) => i);
  const fixed = freeze(clone(state));
  const points = worldPoints(fixed);
  assert.deepEqual(worldPoints(fixed), points);
  assert.equal(new Set(points.map(p => p.id)).size, points.length);
  assert.deepEqual(points.filter(p => p.type === 'wild').map(p => [p.id, p.x, p.z]),
    REGION_LAYOUTS[region].wildSites.map((p, i) => [`wild-${i}`, p.x, p.z]));
  assert.deepEqual(points.filter(p => p.type !== 'wild'), REGION_LAYOUTS[region].points);
  assert.notEqual(worldPoints(fixed)[0], points[0]);
  assert.notEqual(worldPoints(fixed)[3], points[3]);
  for (let encounterIndex = 0; encounterIndex < 5000; encounterIndex++) {
    state.encounterIndex = encounterIndex;
    const wild = worldPoints(state).filter(p => p.type === 'wild');
    assert.equal(new Set(wild.map(p => p.speciesId)).size, 3);
    for (const [i, p] of wild.entries()) {
      const species = BY_ID[p.speciesId];
      assert.equal(p.label, species.name);
      assert(Number.isInteger(p.individualSeed) && p.individualSeed >= 0 && p.individualSeed <= 0xffffffff);
      availability[region].add(species.id);
      assert(p.level >= ranges[region][0] && p.level <= ranges[region][1]);
      if (species.stage >= 3) assert(p.level >= 26);
      if (region === 0) assert.equal(species.tier, 'basic');
      if (region < 4) assert.notEqual(species.tier, 'boss');
      if (region === 1 || region === 2) assert(species.stage <= 2);
      if (region === 0 && species.element === REGION_LAYOUTS[0].wildSites[i].habitatElement) habitatHits++;
      if (region === 4 && species.tier === 'basic') basicHits++;
    }
  }
  state.defeatedRivals.push(region);
  assert(!worldPoints(state).some(p => p.type === 'rival'));
  assert(worldPoints(state).some(p => p.type === 'camp'));
  assert(worldPoints(state).some(p => p.type === 'exit'));
}
assert.deepEqual(availability.map(set => set.size), [35, 65, 65, 75, 80]);
assert.deepEqual([...new Set([...availability[0]].map(id => BY_ID[id].element))].sort(), [...ELEMENTS].sort());
// Weighting is intentionally no longer the old habitat-free 4:2:1 histogram.
assert(habitatHits > 6500 && habitatHits < 8500);
assert(basicHits > 8000 && basicHits < 9000);
assert.notDeepEqual(worldPoints(freshGame('cindupp', 1)), worldPoints(freshGame('cindupp', 2)));
assert.notDeepEqual(worldPoints(freshGame()), worldPoints({ ...freshGame(), encounterIndex: 1 }));
assert.equal(worldPoints({ ...freshGame(), region: 4, defeatedRivals: [0, 1, 2, 3, 4] }).find(p => p.id === 'exit').label, 'Return expedition gate');
assert.equal(nearbyPoint(freshGame()), null);
const camp = REGION_LAYOUTS[0].points.find(p => p.id === 'camp');
assert.equal(nearbyPoint({ ...freshGame(), position: { ...camp, yaw: 0 } }).id, 'camp');
assert.equal(nearbyPoint({ ...freshGame(), position: { x: camp.x + 1.8, z: camp.z, yaw: 0 } }).id, 'camp');
assert.equal(nearbyPoint({ ...freshGame(), position: { x: camp.x + 1.9, z: camp.z, yaw: 0 } }), null);
const wildPoint = worldPoints(freshGame())[0];
assert.equal(nearbyPoint({ ...freshGame(), position: { ...wildPoint, yaw: 0 } }, 0).id, 'wild-0');
const rivalPoint = worldPoints(freshGame()).find(p => p.id === 'rival');
assert.equal(nearbyPoint({ ...freshGame(), position: { ...rivalPoint, yaw: 0 } }, 20).id, 'rival');
for (const distance of [-1, NaN, Infinity, '2']) assert.throws(() => nearbyPoint(freshGame(), distance));
for (const change of [s => { s.seed = -1; }, s => { s.region = 5; }, s => { s.encounterIndex = NaN; },
  s => { s.region = 1; }, s => { s.defeatedRivals = [1]; }, s => { s.claimedSupplies = ['0:unknown']; }]) {
  const s = freshGame(); change(s); assert.throws(() => worldPoints(s));
}
const source = readFileSync(new URL('../Games/Foldwild/world.js', import.meta.url), 'utf8');
assert(!/Math\.random|https?:\/\/|fetch\s*\(|WebSocket|document\.|window\.|setInterval|setTimeout/.test(source));
console.log('PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80; deterministic points/proximity; immutable inputs; strict schema/UID/effects/prototype/unknown ids; canonical resources/progress; storage namespace/quota/security/corrupt-byte preservation');
