import assert from 'node:assert/strict';
import { createCreature, statsFor } from '../Games/Foldwild/battle.js';
import { generateIndividual } from '../Games/Foldwild/builds.js';
import { freshEconomy, buyItem, buyCosmetic, completeContract } from '../Games/Foldwild/economy.js';
import { REGION_DEFINITIONS, REGION_LAYOUTS, movePosition, routeTo } from '../Games/Foldwild/region-data.js';
import * as world from '../Games/Foldwild/world.js';
const { SAVE_KEY, BACKUP_KEY, freshGame, validateSave, readSave, writeSave, unlockedRegion, worldPoints } = world;
const clone = structuredClone;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function rejects(change) {
  const s = freshGame(); change(s); assert.throws(() => validateSave(s));
}
function oldSave(wins = [0, 1, 2], region = 2) {
  // Frozen v1 shape, not a v2 save relabeled as v1. No profiles/economic fields existed.
  const ally = createCreature('briknudge', 14, 'owned-7');
  for (const key of ['profile', 'traitId', 'cosmeticId']) delete ally[key];
  Object.assign(ally, { xp: 123, hp: 17, energy: 9 });
  return { version: 1, seed: 4294967295, starterId: 'cindupp', position: { x: -8, z: -6, yaw: 2 }, region,
    roster: [ally], team: ['owned-7'], seen: ['cindupp', 'briknudge', 'dewgob'], caught: ['cindupp', 'briknudge'],
    defeatedRivals: [...wins], score: 876, kites: 37, encounterIndex: 24, nextUid: 8, reducedMotion: true };
}
const old = freeze(oldSave());
const migrated = validateSave(old);
assert.equal(migrated.version, 3);
for (const key of ['seed', 'starterId', 'team', 'seen', 'caught', 'score', 'kites', 'encounterIndex', 'nextUid', 'reducedMotion']) {
  assert.deepEqual(migrated[key], old[key]);
}
assert.deepEqual(migrated.defeatedRivals, [0, 1]);
assert.deepEqual(migrated.legacyRivals, [2]);
assert.equal(migrated.region, 2); // Old ridge maps to 3, but new Neri route is still locked.
assert.deepEqual(migrated.position, REGION_LAYOUTS[2].spawn);
assert.equal(unlockedRegion(migrated), 2);
assert(worldPoints(migrated).some(p => p.id === 'rival' && p.label === 'Neri'));
assert.deepEqual(migrated.roster[0].profile, { hp: 0, energy: 0, attack: 0, defense: 0, speed: 0 });
assert.equal(migrated.roster[0].traitId, 'neutral');
assert.equal(migrated.roster[0].cosmeticId, 'none');
for (const key of ['uid', 'speciesId', 'level', 'xp', 'hp', 'energy']) assert.equal(migrated.roster[0][key], old.roster[0][key]);
for (const [key, value] of Object.entries(freshEconomy())) assert.deepEqual(migrated[key], value);
assert.deepEqual(validateSave(migrated), migrated);
for (const [wins, region] of [[[], 0], [[0], 1], [[0, 1], 2]]) {
  const upgraded = validateSave(oldSave(wins, region));
  assert.deepEqual(upgraded.defeatedRivals, wins);
  assert.deepEqual(upgraded.legacyRivals, []);
  assert.equal(upgraded.region, region);
  assert.deepEqual(upgraded.position, REGION_LAYOUTS[region].spawn);
}
for (const [wins, region] of [[[2], 0], [[0, 2], 1], [[0, 1, 2, 3], 2], [[], 1], [[0], 2], [[0, 1, 2], 3]]) {
  assert.throws(() => validateSave(oldSave(wins, region)));
}
for (const mutate of [s => { s.seed = '1'; }, s => { s.position.x = Infinity; }, s => { s.roster[0].xp = -1; },
  s => { s.roster[0].uid = 'owned-1000000000'; }, s => { s.reducedMotion = 1; }, s => { s.kites = 1000; }]) {
  const s = oldSave(); mutate(s); assert.throws(() => validateSave(s));
}
rejects(s => { s.legacyRivals = [2]; });
rejects(s => { s.defeatedRivals = [0]; s.legacyRivals = [2]; });
rejects(s => { s.defeatedRivals = [0, 1]; s.legacyRivals = [3]; });
rejects(s => { s.defeatedRivals = [0, 1]; s.legacyRivals = [2, 2]; });
// The core, not loading, must later credit legacy Iven when Neri is completed.
const newNeriWin = clone(migrated); newNeriWin.defeatedRivals.push(2);
assert.deepEqual(validateSave(newNeriWin).defeatedRivals, [0, 1, 2]);
assert.equal(unlockedRegion(newNeriWin), 3);
newNeriWin.defeatedRivals.push(3); newNeriWin.region = 4; newNeriWin.position = { ...REGION_LAYOUTS[4].spawn };
assert.equal(validateSave(newNeriWin).region, 4);
newNeriWin.defeatedRivals.push(4); assert.equal(unlockedRegion(newNeriWin), 4);
rejects(s => { s.defeatedRivals = [0, 1, 2, 3, 4, 5]; });

assert.equal(world.REGIONS, REGION_DEFINITIONS);
assert.equal(world.REGION_LAYOUTS, REGION_LAYOUTS);
assert.equal(world.movePosition, movePosition);
assert.equal(world.routeTo, routeTo);
for (const [region, layout] of REGION_LAYOUTS.entries()) {
  const s = freshGame(); s.defeatedRivals = Array.from({ length: region }, (_, i) => i); s.region = region;
  s.position = { ...layout.spawn };
  assert.equal(validateSave(s).region, region);
  assert.deepEqual(movePosition(region, layout.spawn, 0, 0), layout.spawn);
  assert.deepEqual(layout.bounds, { minX: -80, maxX: 80, minZ: -80, maxZ: 80 });
  for (const point of [...layout.points, ...layout.wildSites]) {
    const route = routeTo(region, layout.spawn, point);
    assert(route.length > 0, `Unreachable ${region}:${point.id ?? 'wild site'}`);
    assert.deepEqual(route.at(-1), { x: point.x, z: point.z });
  }
  const claimed = `${region}:supply-0`;
  s.claimedSupplies = [claimed];
  assert.deepEqual(validateSave(s).claimedSupplies, [claimed]);
  assert(!worldPoints(s).some(p => p.id === 'supply-0'));
  assert(worldPoints(s).some(p => p.id === 'supply-1'));
}
rejects(s => { s.position = { x: -12, z: 7, yaw: 0 }; }); // Closed cottage, not a teleport.

let expressed = buyCosmetic(freshGame(), 'meadow-main', 'badge');
expressed.roster[0] = createCreature('cindupp', 3, 'owned-1', { ...generateIndividual(9), cosmeticId: 'badge' });
expressed.roster[0].hp = statsFor(expressed.roster[0]).maxHP - 3;
expressed.roster[0].energy = 2; expressed.roster[0].xp = 27;
expressed.favorites = ['owned-1']; expressed.quality = 'standard';
expressed.appearance = { name: 'Élodie <b>', skin: '#5d3b2d', hair: 'cropped', coat: '#718267', backpack: '#688ba0' };
expressed = freeze(expressed);
assert.deepEqual(validateSave(expressed), expressed);
assert.notEqual(validateSave(expressed).roster[0].profile, expressed.roster[0].profile);
for (const [key, value] of [['marks', -1], ['marks', 1000001], ['marks', 1.5], ['kites', 1000]]) rejects(s => { s[key] = value; });
for (const id of ['patch', 'charge', 'fiber']) for (const n of [-1, 1000, 1.1, '1', Infinity]) rejects(s => { s.inventory[id] = n; });
rejects(s => { s.inventory.kite = 1; });
rejects(s => { delete s.inventory.fiber; });
rejects(s => { delete s.shops['hollow-main']; });
rejects(s => { s.shops.fake = s.shops['meadow-main']; });
rejects(s => { s.shops['meadow-main'].epoch = 1; });
rejects(s => { s.shops['meadow-main'].stock.kite = 1000; });
rejects(s => { s.shops['meadow-main'].stock.kite = -1; });
rejects(s => { s.shops['meadow-main'].stock.junk = 1; });
rejects(s => { s.contracts = ['unknown']; });
rejects(s => { s.contracts = ['meadow-main-supply', 'meadow-main-supply']; });
rejects(s => { s.claimedSupplies = ['supply-0']; });
rejects(s => { s.claimedSupplies = ['5:supply-0']; });
rejects(s => { s.claimedSupplies = ['0:supply-0', '0:supply-0']; });
rejects(s => { s.cosmetics = []; });
rejects(s => { s.cosmetics = ['badge']; });
rejects(s => { s.cosmetics = ['none', '__proto__']; });
rejects(s => { s.roster[0].cosmeticId = 'badge'; });
rejects(s => { s.roster[0].traitId = '__proto__'; });
rejects(s => { s.roster[0].profile.hp = 9; });
rejects(s => { s.roster[0].profile.hp = 1; }); // Nonzero budget.
rejects(s => { s.roster[0].profile.attack = -9; });
rejects(s => { s.roster[0].profile.speed = 0.5; });
rejects(s => { s.roster[0].profile.junk = 0; });
rejects(s => { s.favorites = ['missing']; });
rejects(s => { s.favorites = ['owned-1', 'owned-1']; });
rejects(s => { s.roster.push(createCreature('cindupp', 3, 'owned-01')); }); // Numeric UID alias.
for (const id of ['binder', 'warden', 'tactician', 'quartermaster', 'unknown', '__proto__']) rejects(s => { s.activeClass = id; });
const builds = freshGame(); builds.caught = ['cindupp', 'dewgob', 'pithnip'];
builds.defeatedRivals = [0]; builds.contracts = ['meadow-main-supply'];
for (const activeClass of ['pathfinder', 'binder', 'warden', 'tactician', 'quartermaster']) {
  assert.equal(validateSave({ ...builds, activeClass }).activeClass, activeClass);
}
for (const name of ['', ' ', 'x'.repeat(25), 'Line\nBreak', 'Null\0Name', '\u202ehidden', '\ud800']) rejects(s => { s.appearance.name = name; });
for (const key of ['skin', 'hair', 'coat', 'backpack']) rejects(s => { s.appearance[key] = 'url(unsafe)'; });
rejects(s => { s.appearance.asset = 'remote'; });
rejects(s => { s.quality = 'ultra'; });
for (const setup of [s => { Object.defineProperty(s.inventory, 'fiber', { get() { assert.fail('Getter invoked'); } }); },
  s => { Object.defineProperty(s.roster[0].profile, 'hp', { get() { assert.fail('Getter invoked'); } }); },
  s => { Object.defineProperty(s.roster, '0', { get() { assert.fail('Getter invoked'); } }); },
  s => { Object.defineProperty(s.appearance, 'name', { get() { assert.fail('Getter invoked'); } }); },
  s => { s.inventory = Object.create(s.inventory); }]) rejects(setup);

// Reading an old epoch validates stock but must never refresh it.
let stock = buyItem(freshGame(), 'meadow-main', 'patch'); stock.encounterIndex = 25;
const remaining = stock.shops['meadow-main'].stock.patch;
assert.equal(validateSave(stock).shops['meadow-main'].stock.patch, remaining);
assert.equal(validateSave(stock).shops['meadow-main'].epoch, 0);
stock.inventory.fiber = 3; stock = completeContract(stock, 'meadow-main-supply');
assert.deepEqual(validateSave(stock).contracts, ['meadow-main-supply']);

function storage(initial = null, failKey = null) {
  const slots = new Map([['another-game', 'untouched']]);
  if (initial !== null) slots.set(SAVE_KEY, initial);
  const calls = [];
  return { slots, calls, getItem(key) { calls.push(['get', key]); return slots.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); if (key === failKey) throw new Error('QuotaExceededError'); slots.set(key, value); },
    removeItem() { assert.fail('Deletion is not permitted'); }, clear() { assert.fail('Clear is not permitted'); } };
}
const rawOld = JSON.stringify(old);
const slot = storage(rawOld); const before = [...slot.slots];
assert.deepEqual(readSave(slot), { state: migrated, error: null });
assert.deepEqual([...slot.slots], before);
assert.deepEqual(slot.calls, [['get', SAVE_KEY]]);
assert.equal(writeSave(migrated, slot), null);
assert.equal(slot.slots.get(BACKUP_KEY), rawOld);
assert.deepEqual(JSON.parse(slot.slots.get(SAVE_KEY)), migrated);
const rawMigrated = slot.slots.get(SAVE_KEY);
assert.equal(writeSave(expressed, slot), null);
assert.equal(slot.slots.get(BACKUP_KEY), rawMigrated);
assert.deepEqual(readSave(slot).state, expressed);
assert.equal(slot.slots.get('another-game'), 'untouched');
assert(slot.calls.every(([, key]) => [SAVE_KEY, BACKUP_KEY].includes(key)));
for (const failKey of [SAVE_KEY, BACKUP_KEY]) {
  const blocked = storage(rawOld, failKey);
  const message = writeSave(expressed, blocked);
  assert.match(message, /QuotaExceededError/);
  assert.equal(blocked.slots.get(SAVE_KEY), rawOld);
  assert.equal(blocked.slots.get('another-game'), 'untouched');
  if (failKey === BACKUP_KEY) assert(!blocked.calls.some(([kind, key]) => kind === 'set' && key === SAVE_KEY));
  else assert.equal(blocked.slots.get(BACKUP_KEY), rawOld);
}
for (const raw of ['{invalid', JSON.stringify({ ...freshGame(), version: 4 }), ' '.repeat(256 * 1024 + 1),
  `{"padding":"${'é'.repeat(140000)}"}`]) {
  const corrupt = storage(raw); const savedBytes = [...corrupt.slots];
  assert.equal(readSave(corrupt).state, null);
  assert.equal(typeof readSave(corrupt).error, 'string');
  assert.deepEqual([...corrupt.slots], savedBytes);
  assert(corrupt.calls.every(([kind]) => kind === 'get'));
}
// Only the controller's explicit new-run permission may call this replacement path.
const replaced = storage('{corrupt original'); assert.equal(writeSave(freshGame(), replaced), null);
assert.equal(replaced.slots.get(BACKUP_KEY), '{corrupt original');
assert(readSave(replaced).state);
const invalid = storage(rawOld);
assert.match(writeSave({ ...freshGame(), marks: -1 }, invalid), /Invalid/);
assert.deepEqual(invalid.calls, []);
assert.equal(invalid.slots.get(SAVE_KEY), rawOld);
const denied = { getItem() { throw new Error('SecurityError'); }, setItem() { assert.fail('Must not write after failed read'); } };
assert.match(readSave(denied).error, /SecurityError/);
assert.match(writeSave(freshGame(), denied), /SecurityError/);
const getterStorage = {};
Object.defineProperty(getterStorage, 'getItem', { get() { throw new Error('Storage getter denied'); } });
assert.match(readSave(getterStorage).error, /getter denied/);
assert.match(writeSave(freshGame(), getterStorage), /getter denied/);
console.log('PASS: v1 neutral migration and legacy Iven badge; five-region route/reexports; v2 economic/profile/cosmetic/class/appearance/favorites validation; no reload restock; descriptor/UID alias defenses; scoped rotating backup, quota failure and UTF-8 256 KiB corrupt-byte preservation');
