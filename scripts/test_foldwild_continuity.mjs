import assert from 'node:assert/strict';
import { createCreature, createBattle, validateBattle, clearEffects, statsFor, applyAction } from '../Games/Foldwild/battle.js';
import { generateIndividual } from '../Games/Foldwild/builds.js';
import { buyCosmetic } from '../Games/Foldwild/economy.js';
import { SAVE_KEY, BACKUP_KEY, RIVALS, freshGame, worldPoints, validateSave, releaseCreature, readSave, writeSave } from '../Games/Foldwild/world.js';
const clone = structuredClone;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function checkpoint(state, battle) {
  const next = clone(state);
  next.pendingBattle = clone(battle);
  for (const creature of battle.player.team) next.roster[next.roster.findIndex(c => c.uid === creature.uid)] = clearEffects(creature);
  return next;
}
function fixture(kind = 'wild', region = 0) {
  let state = buyCosmetic(freshGame('cindupp', 19), 'meadow-main', 'badge');
  state.roster = ['cindupp', 'dewgob', 'pithnip'].map((id, index) => createCreature(id, 40, `owned-${index + 1}`,
    { ...generateIndividual(index + 1), cosmeticId: index === 1 ? 'badge' : 'none' }));
  state.team = state.roster.map(c => c.uid);
  state.caught = state.roster.map(c => c.speciesId); state.seen = [...state.caught]; state.nextUid = 4;
  state.defeatedRivals = Array.from({ length: region }, (_, i) => i); state.region = region;
  state.activeClass = 'binder'; state.encounterIndex = 7;
  const point = worldPoints(state).find(p => p.type === 'wild' && !state.caught.includes(p.speciesId));
  const enemies = kind === 'wild' ? [createCreature(point.speciesId, point.level, 'wild-7', generateIndividual(point.individualSeed))]
    : RIVALS[region].team.map((c, i) => createCreature(c.speciesId, c.level, `rival-7-${i}`));
  state.seen = [...new Set([...state.seen, ...enemies.map(c => c.speciesId)])];
  const battle = createBattle(state.roster, enemies, { kind, seed: 113, active: 1, classId: state.activeClass, synergyEnabled: true });
  battle.player.team[1].energy = 8;
  battle.player.team[1].xp = 27;
  return checkpoint(state, battle);
}
function rejects(change, base = fixture()) {
  const state = clone(base); change(state);
  assert.throws(() => validateSave(state), undefined, change.toString());
}
function storage(raw = null, failKey = null) {
  const slots = new Map([['unrelated', 'keep']]);
  if (raw !== null) slots.set(SAVE_KEY, raw);
  return { slots, getItem(key) { return slots.get(key) ?? null; },
    setItem(key, value) { if (key === failKey) throw new Error('QuotaExceededError'); slots.set(key, value); },
    removeItem() { assert.fail('Must preserve bytes'); }, clear() { assert.fail('Must not clear storage'); } };
}

assert.equal(freshGame().pendingBattle, null);
for (const version of [1, 2]) {
  const old = freshGame(); old.version = version; delete old.pendingBattle;
  assert.equal(validateSave(freeze(old)).pendingBattle, null);
}
assert.equal(validateSave({ ...freshGame(), pendingBattle: null }).pendingBattle, null);
for (const value of [undefined, false, true, 0, 1, '', 'battle', [], {}, new Date()]) rejects(s => { s.pendingBattle = value; });

const state = fixture();
const active = state.pendingBattle.player.team[1];
active.turnsTaken = 4;
active.status = { name: 'Haze', remaining: 2, appliedAt: 4 };
active.shield = { hp: 20, remaining: 2, appliedAt: 4 };
active.buffs = { defense: { percent: 20, remaining: 2, appliedAt: 4 } };
const enemy = state.pendingBattle.enemy.team[0];
enemy.turnsTaken = 3;
enemy.status = { name: 'Drag', remaining: 2, appliedAt: 3 };
enemy.shield = { hp: 9, remaining: 2, appliedAt: 3 };
enemy.buffs = { attack: { percent: -20, remaining: 2, appliedAt: 3 } };
const immutable = freeze(state);
const canonical = validateSave(immutable);
assert.deepEqual(canonical, immutable);
assert.equal(JSON.stringify(canonical.pendingBattle), JSON.stringify(validateBattle(immutable.pendingBattle)));
assert.notEqual(canonical.pendingBattle, immutable.pendingBattle);
assert.notEqual(canonical.pendingBattle.player.team, immutable.pendingBattle.player.team);
assert.notEqual(canonical.pendingBattle.player.team[1].status, immutable.pendingBattle.player.team[1].status);
assert.equal(canonical.roster[1].status, null);
assert.equal(canonical.roster[1].shield, null);
assert.deepEqual(canonical.roster[1].buffs, {});
assert.deepEqual(canonical.pendingBattle.player.team[1].profile, immutable.roster[1].profile);
assert.deepEqual(canonical.pendingBattle.enemy.team[0].profile, immutable.pendingBattle.enemy.team[0].profile);
const slot = storage(); assert.equal(writeSave(immutable, slot), null);
assert.deepEqual(readSave(slot).state, immutable);
let resumed = readSave(slot).state.pendingBattle;
let uninterrupted = immutable.pendingBattle;
for (const action of [{ type: 'wait' }, { type: 'ability', slot: 1 }, { type: 'switch', index: 2 }]) {
  uninterrupted = applyAction(uninterrupted, action);
  resumed = applyAction(resumed, action);
  assert.equal(JSON.stringify(resumed), JSON.stringify(uninterrupted));
  if (!uninterrupted.result) {
    const snapshot = checkpoint(immutable, uninterrupted);
    assert.equal(writeSave(snapshot, slot), null);
    resumed = readSave(slot).state.pendingBattle;
    assert.equal(JSON.stringify(resumed), JSON.stringify(uninterrupted));
  }
}
// Failed capture consumes RNG without rerolling on resume; spent kites belong to the world snapshot.
const capture = fixture(); const target = capture.pendingBattle.enemy.team[0];
target.hp = Math.floor(statsFor(target).maxHP / 2);
let missed = null;
for (let seed = 0; seed < 1000 && !missed; seed++) {
  capture.pendingBattle.seed = seed;
  const next = applyAction(capture.pendingBattle, { type: 'capture' });
  if (!next.result && next.log.includes('Capture missed.')) missed = next;
}
assert(missed, 'Finite seed search must find a real missed capture');
capture.kites--;
const afterMiss = checkpoint(capture, missed);
assert.equal(writeSave(afterMiss, slot), null);
assert.equal(readSave(slot).state.kites, capture.kites);
assert.equal(JSON.stringify(applyAction(readSave(slot).state.pendingBattle, { type: 'wait' })),
  JSON.stringify(applyAction(missed, { type: 'wait' })));

// Every current wild descriptor is accepted with its own exact seeded individual, across all regions.
for (let region = 0; region < 5; region++) {
  const current = fixture('wild', region);
  for (const point of worldPoints(current).filter(p => p.type === 'wild')) {
    const wild = createCreature(point.speciesId, point.level, `wild-${current.encounterIndex}`, generateIndividual(point.individualSeed));
    const encounter = createBattle(current.roster, [wild], { classId: current.activeClass, synergyEnabled: true });
    const snapshot = checkpoint(current, encounter);
    if (!snapshot.seen.includes(point.speciesId)) snapshot.seen.push(point.speciesId);
    assert.deepEqual(validateSave(snapshot).pendingBattle, encounter);
  }
}

// Defaults remain neutral when older descriptors omitted individual fields.
const neutral = fixture('rival');
neutral.roster = neutral.roster.map(c => createCreature(c.speciesId, c.level, c.uid));
neutral.pendingBattle = createBattle(neutral.roster, RIVALS[0].team.map((c, i) => createCreature(c.speciesId, c.level, `rival-7-${i}`)),
  { kind: 'rival', classId: 'binder', synergyEnabled: true });
for (const creature of [...neutral.roster, ...neutral.pendingBattle.player.team, ...neutral.pendingBattle.enemy.team]) {
  delete creature.profile; delete creature.traitId; delete creature.cosmeticId;
}
assert.deepEqual(validateSave(neutral).roster[0].profile, createCreature('cindupp').profile);
for (let region = 0; region < 5; region++) {
  const trial = fixture('rival', region);
  assert.deepEqual(validateSave(freeze(trial)).pendingBattle, trial.pendingBattle);
  rejects(s => { s.defeatedRivals.push(region); }, trial);
  rejects(s => { s.pendingBattle.enemy.team.reverse(); }, region > 0 ? trial : fixture('rival', 1));
  rejects(s => { s.pendingBattle.enemy.team[0].level++; }, trial);
  rejects(s => { s.pendingBattle.enemy.team[0].uid = 'rival-8-0'; }, trial);
  rejects(s => { s.pendingBattle.enemy.team[0].traitId = 'steady'; }, trial);
}

for (const mutate of [
  s => { s.pendingBattle = applyAction(s.pendingBattle, { type: 'flee' }); },
  s => { s.pendingBattle.result = 'won'; s.pendingBattle.phase = 'ended'; },
  s => { s.pendingBattle.phase = 'ended'; }, s => { s.pendingBattle.captured = s.pendingBattle.enemy.team[0]; },
  s => { s.pendingBattle.round = 0; }, s => { s.pendingBattle.round = 10001; },
  s => { s.pendingBattle.seed = -1; }, s => { s.pendingBattle.seed = 0x100000000; },
  s => { s.pendingBattle.synergyEnabled = false; }, s => { s.pendingBattle.player.classId = 'pathfinder'; },
  s => { s.pendingBattle.enemy.classId = 'binder'; }, s => { s.pendingBattle.player.synergyId = 'none'; },
  s => { s.pendingBattle.player.active = 3; }, s => { s.pendingBattle.enemy.active = 1; },
  s => { s.pendingBattle.player.team.reverse(); }, s => { s.pendingBattle.player.team.pop(); },
  s => { s.pendingBattle.player.team[1].hp = 0; s.roster[1].hp = 0; },
  s => { s.pendingBattle.enemy.team[0].hp = 0; },
  s => { s.pendingBattle.player.team[0].speciesId = 'dewgob'; },
  s => { s.pendingBattle.player.team[0].level--; }, s => { s.pendingBattle.player.team[1].xp++; },
  s => { s.pendingBattle.player.team[0].traitId = 'neutral'; },
  s => { s.pendingBattle.player.team[1].cosmeticId = 'none'; },
  s => { s.pendingBattle.player.team[0].profile = generateIndividual(999).profile; },
  s => { s.pendingBattle.player.team[0].hp--; }, s => { s.pendingBattle.player.team[0].energy--; },
  s => { s.roster[0].hp = 1e99; }, s => { s.roster[0].energy = -1; },
  s => { s.pendingBattle.enemy.team[0].uid = s.roster[0].uid; },
  s => { s.pendingBattle.enemy.team[0].uid = 'wild-8'; },
  s => { s.pendingBattle.enemy.team[0].level++; }, s => { s.pendingBattle.enemy.team[0].xp = 1; },
  s => { s.pendingBattle.enemy.team[0].traitId = 'nimble'; },
  s => { s.pendingBattle.enemy.team[0].cosmeticId = 'badge'; },
  s => { s.pendingBattle.enemy.team[0].profile = generateIndividual(999).profile; },
  s => { s.seen = s.seen.filter(id => id !== s.pendingBattle.enemy.team[0].speciesId); },
  s => { s.encounterIndex++; },
  s => { s.pendingBattle.player.team[0].hp = 1e99; },
  s => { s.pendingBattle.enemy.team[0].hp = -1; },
  s => { s.pendingBattle.enemy.team[0].energy = 1e99; },
  s => { s.pendingBattle.player.team[0].energy = -1; },
  s => { s.pendingBattle.player.team[0].xp = 1000001; s.roster[0].xp = 1000001; },
  s => { s.pendingBattle.enemy.team[0].xp = 1000001; },
  s => { s.pendingBattle.player.team[0].turnsTaken = Number.MAX_SAFE_INTEGER; },
  s => { s.pendingBattle.enemy.team[0].turnsTaken = Number.MAX_SAFE_INTEGER; },
  s => { s.pendingBattle.player.team[0].turnsTaken = 20001; },
  s => { s.pendingBattle.enemy.team[0].turnsTaken = 20001; },
  s => { s.pendingBattle.player.team[0].turnsTaken = -1; },
  s => { s.pendingBattle.enemy.team[0].turnsTaken = 0.5; },
  s => { s.pendingBattle.log = Array(129).fill('line'); },
  s => { s.pendingBattle.log = ['x'.repeat(513)]; },
  s => { s.pendingBattle.enemy.unknown = 1; },
  s => { s.pendingBattle.player.team[0].status = { name: 'Haze', remaining: 3, appliedAt: 0 }; }
]) rejects(mutate);
const cap = fixture(); cap.pendingBattle.round = 10000;
cap.pendingBattle.player.team[0].xp = cap.roster[0].xp = 1e6;
cap.pendingBattle.player.team[0].turnsTaken = 20000;
assert.equal(validateSave(cap).pendingBattle.round, 10000);
const logCap = fixture(); logCap.pendingBattle.log = Array(128).fill('x'.repeat(512));
assert.equal(validateSave(logCap).pendingBattle.log.length, 128);
const rosterClamp = freshGame(); rosterClamp.roster[0].hp = 1e99;
assert.equal(validateSave(rosterClamp).roster[0].hp, statsFor(rosterClamp.roster[0]).maxHP);

// Accessors are rejected before any getter runs; never clone or freeze these hostile fixtures first.
let invoked = 0;
const getter = { configurable: true, get() { invoked++; throw new Error('Getter ran'); } };
for (const mutate of [
  s => { Object.defineProperty(s, 'pendingBattle', getter); },
  s => { Object.defineProperty(s.pendingBattle, 'player', getter); },
  s => { Object.defineProperty(s.pendingBattle.player, 'team', getter); },
  s => { Object.defineProperty(s.pendingBattle.player.team, '0', getter); },
  s => { Object.defineProperty(s.pendingBattle.enemy.team[0], 'hp', getter); },
  s => { Object.defineProperty(s.pendingBattle.player.team[0].profile, 'hp', getter); },
  s => { Object.defineProperty(s.pendingBattle, 'unknown', getter); },
  s => { Object.defineProperty(s.pendingBattle.log, '0', getter); },
  s => { s.pendingBattle.player.team[0].status = { name: 'Haze', remaining: 2, appliedAt: 0 }; Object.defineProperty(s.pendingBattle.player.team[0].status, 'name', getter); },
  s => { s.pendingBattle.player.team[0].shield = { hp: 9, remaining: 2, appliedAt: 0 }; Object.defineProperty(s.pendingBattle.player.team[0].shield, 'hp', getter); },
  s => { s.pendingBattle.player.team[0].buffs.attack = { percent: 20, remaining: 2, appliedAt: 0 }; Object.defineProperty(s.pendingBattle.player.team[0].buffs.attack, 'percent', getter); },
  s => { s.pendingBattle = Object.create(s.pendingBattle); },
  s => { s.pendingBattle.enemy = Object.create(s.pendingBattle.enemy); },
  s => { Object.setPrototypeOf(s.pendingBattle.player.team, null); },
  s => { delete s.pendingBattle.player.team[0]; },
  s => { s.pendingBattle.enemy.team.extra = 'unknown'; },
  s => { s.pendingBattle.log[Symbol('extra')] = 'unknown'; },
  s => { s.pendingBattle.player.team[0].profile = Object.create(s.pendingBattle.player.team[0].profile); }
]) rejects(mutate);
assert.equal(invoked, 0);

const collection = freshGame();
collection.roster.push(createCreature('dewgob', 4, 'owned-2', generateIndividual(8)), createCreature('pithnip', 4, 'owned-3'));
collection.nextUid = 4; collection.caught = ['cindupp', 'dewgob', 'pithnip']; collection.seen = [...collection.caught];
collection.roster[1].hp = 0; collection.favorites = ['owned-3'];
const frozenCollection = freeze(validateSave(collection));
const released = releaseCreature(frozenCollection, 'owned-2');
assert.deepEqual(released, { ...frozenCollection, roster: frozenCollection.roster.filter(c => c.uid !== 'owned-2') });
assert.notEqual(released.roster[0], frozenCollection.roster[0]);
assert.equal(frozenCollection.roster.length, 3);
for (const [source, uid] of [[frozenCollection, 'missing'], [frozenCollection, null], [frozenCollection, 'owned-1'],
  [frozenCollection, 'owned-3'], [freshGame(), 'owned-1'], [fixture(), 'owned-1']]) assert.throws(() => releaseCreature(source, uid));
const lastConscious = clone(frozenCollection); lastConscious.favorites = []; lastConscious.roster[0].hp = 0;
assert.throws(() => releaseCreature(lastConscious, 'owned-3'), /last conscious/);
const withBattle = fixture(); withBattle.roster.push(createCreature('cindupp', 3, 'owned-4')); withBattle.nextUid = 5;
assert.throws(() => releaseCreature(withBattle, 'owned-4'), /pending battle/);
const invalidRelease = clone(frozenCollection); invalidRelease.marks = -1;
assert.throws(() => releaseCreature(invalidRelease, 'owned-2'));

const previous = JSON.stringify(freshGame());
for (const failKey of [BACKUP_KEY, SAVE_KEY]) {
  const blocked = storage(previous, failKey);
  assert.match(writeSave(immutable, blocked), /QuotaExceededError/);
  assert.equal(blocked.slots.get(SAVE_KEY), previous);
  assert.equal(blocked.slots.get('unrelated'), 'keep');
}
const rotating = storage(previous);
assert.equal(writeSave(immutable, rotating), null);
assert.equal(rotating.slots.get(BACKUP_KEY), previous);
const pendingBytes = rotating.slots.get(SAVE_KEY);
const settled = clone(immutable); settled.pendingBattle = null;
assert.equal(writeSave(settled, rotating), null);
assert.equal(rotating.slots.get(BACKUP_KEY), pendingBytes);
for (const raw of ['{bad bytes', ' '.repeat(256 * 1024 + 1), JSON.stringify({ ...freshGame(), pendingBattle: 1 }),
  JSON.stringify({ ...fixture(), pendingBattle: { ...fixture().pendingBattle, round: 10001 } })]) {
  const corrupt = storage(raw); const before = [...corrupt.slots];
  assert.equal(readSave(corrupt).state, null); assert.match(readSave(corrupt).error, /Could not read/);
  assert.deepEqual([...corrupt.slots], before);
}
const invalidWrite = storage(previous);
assert.match(writeSave({ ...fixture(), pendingBattle: false }, invalidWrite), /Could not write/);
assert.equal(invalidWrite.slots.get(SAVE_KEY), previous);
assert(!invalidWrite.slots.has(BACKUP_KEY));
console.log('PASS: optional v1/v2 continuity; canonical effects/profiles, active index and exact action/RNG replay; missed capture; five canonical trials; roster/enemy/HP/XP/counter/schema/accessor rejection; immutable release guards/history; scoped backup/quota/corrupt-byte preservation');
