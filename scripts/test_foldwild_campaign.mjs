import assert from 'node:assert/strict';
import { FINALE_STAGES, RIVALS, ENDING } from '../Games/Foldwild/campaign.js';
import { createCreature, createBattle, applyAction, clearEffects, statsFor, gainXP } from '../Games/Foldwild/battle.js';
import { classRank } from '../Games/Foldwild/builds.js';
import { freshGame, validateSave, challengeFor, settleChallenge, worldPoints, REGION_LAYOUTS,
  SAVE_KEY, BACKUP_KEY, readSave, writeSave } from '../Games/Foldwild/world.js';

// Composition and hostile-import fixtures only, not a naturally played campaign.
const clone = structuredClone;
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function atPoint(state, region, id) {
  const point = REGION_LAYOUTS[region].points.find(p => p.id === id);
  state.region = region; state.position = { x: point.x, z: point.z, yaw: 0 };
  return state;
}
function ready(kind = 'finale', id = 0) {
  const state = freshGame('cindupp', 19);
  state.defeatedRivals = [0, 1, 2, 3, 4];
  state.finaleStage = kind === 'finale' ? id : 3;
  state.roster = [createCreature('aurelvane', 40, 'owned-1'), createCreature('cindupp', 11, 'owned-2'),
    createCreature('briknudge', 25, 'owned-3')];
  state.roster[1].xp = 30 + 12 * 11 - 1;
  state.roster[2].xp = 30 + 12 * 25 - 1;
  state.team = state.roster.map(c => c.uid); state.nextUid = 4;
  state.caught = state.roster.map(c => c.speciesId); state.seen = [...state.caught];
  state.encounterIndex = 7;
  return atPoint(state, kind === 'finale' ? FINALE_STAGES[id].region : id, kind === 'finale' ? 'camp' : 'rival');
}
function pending(kind = 'finale', id = 0) {
  const state = ready(kind, id), context = { kind, id };
  const descriptor = challengeFor(state, context);
  const enemies = descriptor.team.map((c, i) => createCreature(c.speciesId, c.level, `${kind}-${id}-${state.encounterIndex}-${i}`));
  state.seen = [...new Set([...state.seen, ...enemies.map(c => c.speciesId)])];
  state.pendingBattle = createBattle(state.roster, enemies, { kind: 'rival', seed: (state.seed + state.encounterIndex) >>> 0,
    classId: state.activeClass, classRank: classRank(state, state.activeClass), synergyEnabled: true });
  state.pendingChallenge = context;
  return validateSave(state);
}
function winning(kind = 'finale', id = 0) {
  const state = pending(kind, id), b = state.pendingBattle;
  b.enemy.team.forEach((c, i) => { c.hp = i === b.enemy.team.length - 1 ? 1 : 0; });
  b.enemy.active = b.enemy.team.length - 1;
  return validateSave(state);
}
function rejects(change, base = pending()) {
  const state = clone(base); change(state);
  assert.throws(() => validateSave(state), undefined, change.toString());
}
assert.deepEqual(FINALE_STAGES.map(s => [s.id, s.region, s.pointId, s.host, s.team.map(c => [c.speciesId, c.level])]), [
  [0, 0, 'camp', 'Maren', [['geodelve', 30], ['trellisect', 30]]],
  [1, 1, 'camp', 'Sola', [['catarill', 32], ['velvetorque', 31]]],
  [2, 4, 'camp', 'Oren', [['velvetorque', 35], ['aurelvane', 34], ['hearthol', 34]]]
]);
assert.deepEqual(FINALE_STAGES.map(s => s.name), ['Maren: Energy on the return trail', 'Sola: Partners on the return trail', 'Oren: The final field record']);
assert.deepEqual(FINALE_STAGES.map(s => s.lesson), ['Conserve energy, shield when threatened, change partners before exhaustion.',
  'Switch into useful coverage, watch incoming energy and status.', 'Adapt to disruption and protect the team.']);
assert.match(ENDING, /^Your partners brought the route notes home\./);
for (const value of [FINALE_STAGES, ...FINALE_STAGES, ...FINALE_STAGES.flatMap(s => [s.team, ...s.team])]) assert(Object.isFrozen(value));
assert.equal(freshGame().version, 3);
assert.equal(freshGame().finaleStage, 0);
assert.equal(freshGame().pendingChallenge, null);
assert.equal(SAVE_KEY, 'foldwild-save-v1'); assert.equal(BACKUP_KEY, 'foldwild-save-backup-v1');
for (const version of [1, 2]) {
  const old = freshGame(); old.version = version;
  delete old.finaleStage; delete old.pendingChallenge;
  const migrated = validateSave(freeze(old));
  assert.equal(migrated.version, 3); assert.equal(migrated.finaleStage, 0); assert.equal(migrated.pendingChallenge, null);
  assert.equal(validateSave({ ...old, finaleStage: 0, pendingChallenge: null }).version, 3);
  for (const extra of [{ finaleStage: 1 }, { pendingChallenge: { kind: 'finale', id: 0 } }]) {
    assert.throws(() => validateSave({ ...old, ...extra }));
  }
}
const completedOld = { ...ready(), version: 2 }; delete completedOld.finaleStage; delete completedOld.pendingChallenge;
assert.equal(validateSave(completedOld).finaleStage, 0, 'Five old trials are not campaign completion');
const oldIven = { ...freshGame(), version: 1, region: 2, defeatedRivals: [0, 1, 2] };
const migratedIven = validateSave(oldIven);
assert.deepEqual(migratedIven.defeatedRivals, [0, 1]); assert.deepEqual(migratedIven.legacyRivals, [2]);
assert.deepEqual(migratedIven.position, REGION_LAYOUTS[2].spawn); assert.equal(migratedIven.finaleStage, 0);
for (const key of ['finaleStage', 'pendingChallenge']) rejects(s => { delete s[key]; }, freshGame());
for (const value of [-1, 4, 0.5, NaN, Infinity, '0', null, undefined]) rejects(s => { s.finaleStage = value; }, freshGame());
rejects(s => { s.finaleStage = 1; }, freshGame());

// Historical side snapshots lack ranks. Earned history must not upgrade their next command.
for (const version of [1, 2]) {
  const old = freshGame('cindupp', 41); old.version = version;
  old.claimedSupplies = Array.from({ length: 9 }, (_, i) => `${Math.floor(i / 3)}:supply-${i % 3}`);
  old.seen.push('shardip');
  old.pendingBattle = createBattle(old.roster, [createCreature('shardip', 8, 'rival-0-0')],
    { kind: 'rival', seed: 113, classId: 'pathfinder', synergyEnabled: true });
  delete old.pendingBattle.player.classRank; delete old.pendingBattle.enemy.classRank;
  delete old.finaleStage; delete old.pendingChallenge;
  const before = clone(old), migrated = validateSave(freeze(old));
  assert.equal(migrated.pendingBattle.player.classRank, 1); assert.equal(migrated.pendingBattle.enemy.classRank, 0);
  if (version === 2) assert.equal(classRank(migrated, 'pathfinder'), 3);
  assert.deepEqual(applyAction(migrated.pendingBattle, { type: 'wait' }), applyAction(before.pendingBattle, { type: 'wait' }));
  assert.deepEqual(old, before);
  const smuggled = clone(before); smuggled.pendingBattle.player.classRank = 3;
  assert.throws(() => validateSave(smuggled));
}

for (let id = 0; id < 3; id++) {
  const state = ready('finale', id), before = clone(state);
  const descriptor = challengeFor(freeze(state), { kind: 'finale', id });
  assert.equal(descriptor.kind, 'finale'); assert.equal(descriptor.id, id);
  assert(Object.isFrozen(descriptor)); assert(Object.isFrozen(descriptor.team));
  assert.throws(() => { descriptor.team[0].level = 1; }, TypeError);
  assert.deepEqual(state, before);
  const camp = worldPoints(state).find(p => p.id === 'camp');
  assert.equal(camp.type, 'camp'); assert.equal(camp.role, 'recovery'); assert.equal(camp.label, 'Rest Camp');
  assert.deepEqual(camp.challenge, { kind: 'finale', id }); assert.equal(camp.challengeName, descriptor.name);
  for (const mutate of [s => { s.defeatedRivals.pop(); }, s => { s.finaleStage = (id + 1) % 3; },
    s => { s.position.x += 2; }, s => { s.region = (s.region + 1) % 5; }, s => { s.roster.forEach(c => { c.hp = 0; }); }]) {
    const bad = clone(state); mutate(bad); assert.throws(() => challengeFor(bad, { kind: 'finale', id }));
  }
  const broke = clone(state); broke.marks = 0; broke.kites = 0;
  assert.equal(challengeFor(broke, { kind: 'finale', id }).id, id);
}
for (const context of [null, {}, [], { kind: 'finale', id: -1 }, { kind: 'finale', id: 3 }, { kind: 'rematch', id: 0 },
  { kind: 'wild', id: 0 }, { kind: 'finale', id: '0' }, { kind: 'finale', id: 0, extra: true }, Object.create({ kind: 'finale', id: 0 })]) {
  assert.throws(() => challengeFor(ready(), context));
}
assert.throws(() => challengeFor(pending(), { kind: 'finale', id: 0 }));
for (const mutate of [
  s => { s.pendingChallenge = null; }, s => { s.pendingBattle = null; }, s => { s.pendingChallenge.id = 1; },
  s => { s.pendingChallenge.kind = 'rematch'; }, s => { s.pendingChallenge.extra = true; },
  s => { s.finaleStage = 3; }, s => { s.region = 1; }, s => { s.position.x += 2; },
  s => { s.pendingBattle.enemy.team.reverse(); }, s => { s.pendingBattle.enemy.team.pop(); },
  s => { s.pendingBattle.enemy.team[0].speciesId = 'cindupp'; }, s => { s.pendingBattle.enemy.team[0].level--; },
  s => { s.pendingBattle.enemy.team[0].uid = 'finale-0-8-0'; }, s => { s.pendingBattle.enemy.team[0].xp = 1; },
  s => { s.pendingBattle.enemy.team[0].profile.hp = 1; s.pendingBattle.enemy.team[0].profile.speed = -1; },
  s => { s.pendingBattle.enemy.team[0].traitId = 'steady'; }, s => { s.pendingBattle.enemy.team[0].cosmeticId = 'badge'; },
  s => { s.pendingBattle.enemy.classId = 'warden'; s.pendingBattle.enemy.classRank = 1; },
  s => { s.pendingBattle.enemy.classRank = 1; }, s => { s.pendingBattle.player.classRank = 3; },
  s => { s.pendingBattle.player.classRank = 0; }, s => { s.pendingBattle.player.classId = 'warden'; },
  s => { s.pendingBattle.player.team.reverse(); }, s => { s.pendingBattle.player.team[0].hp--; },
  s => { s.pendingBattle.player.team[0].uid = 'owned-4'; }, s => { s.encounterIndex++; },
  s => { s.pendingBattle.enemy.team[s.pendingBattle.enemy.active].hp = 0; },
  s => { s.pendingBattle.kind = 'wild'; }, s => { s.seen = ['aurelvane', 'cindupp', 'briknudge']; }
]) rejects(mutate);
const rankPinned = pending(); rankPinned.claimedSupplies = ['0:supply-0', '0:supply-1', '0:supply-2'];
assert.equal(validateSave(rankPinned).pendingBattle.player.classRank, 1);
rankPinned.pendingBattle.player.classRank = 2;
assert.equal(validateSave(rankPinned).pendingBattle.player.classRank, 2);
assert.deepEqual(applyAction(validateSave(rankPinned).pendingBattle, { type: 'wait' }),
  applyAction(rankPinned.pendingBattle, { type: 'wait' }));

// Each stage and all original rematches settle exactly once with ordinary, never trial, rewards.
for (const [kind, count] of [['finale', 3], ['rematch', 5]]) for (let id = 0; id < count; id++) {
  const state = winning(kind, id), before = clone(state);
  const ended = applyAction(state.pendingBattle, { type: 'ability', slot: 2 });
  assert.equal(ended.result, 'won');
  const endedBefore = clone(ended), next = settleChallenge(freeze(state), freeze(ended));
  assert.deepEqual(state, before); assert.deepEqual(ended, endedBefore);
  const levels = ended.enemy.team.reduce((sum, c) => sum + c.level, 0);
  assert.equal(next.marks, before.marks + 18 + 2 * levels); assert.equal(next.score, before.score + 40 + 10 * levels);
  assert.equal(next.encounterIndex, before.encounterIndex + 1);
  assert.equal(next.finaleStage, kind === 'finale' ? id + 1 : 3);
  assert.equal(next.pendingBattle, null); assert.equal(next.pendingChallenge, null);
  assert.deepEqual(next.defeatedRivals, before.defeatedRivals);
  assert.deepEqual(next.legacyRivals, before.legacyRivals);
  for (const [i, c] of ended.player.team.entries()) assert.deepEqual(next.roster[i], gainXP(clearEffects(c), 12 * levels + 20));
  assert(next.caught.includes('hearthol')); assert(next.seen.includes('hearthol'));
  assert(next.caught.includes('cindupp')); assert(next.caught.includes('briknudge'));
  assert.throws(() => settleChallenge(next, ended));
  assert.throws(() => settleChallenge({ ...before, encounterIndex: before.encounterIndex + 1 }, ended));
  const premutated = clone(before); premutated.roster = ended.player.team.map(clearEffects);
  assert.throws(() => settleChallenge(premutated, ended), 'Controller must settle before copying terminal resources');
  const slot = new Map(); const storage = { getItem: key => slot.get(key) ?? null, setItem: (key, value) => slot.set(key, value) };
  assert.equal(writeSave(next, storage, null), null); assert.deepEqual(readSave(storage).state, next);
  assert.throws(() => settleChallenge(readSave(storage).state, ended));
  if (kind === 'rematch') {
    assert.deepEqual(ended.enemy.team.map(c => [c.speciesId, c.level]), RIVALS[id].team.map(c => [c.speciesId, c.level]));
    const point = worldPoints(next).find(p => p.id === 'rival');
    assert.equal(point.type, 'rival'); assert.equal(point.label, `${RIVALS[id].name} rematch`);
    assert.deepEqual(point.challenge, { kind: 'rematch', id });
    assert.equal(challengeFor(next, point.challenge).pointId, 'rival');
  }
}
for (const [kind, id] of [['finale', 0], ['finale', 1], ['finale', 2], ['rematch', 4]]) {
  const state = pending(kind, id); state.marks = 0; state.kites = 0;
  state.pendingBattle.player.team.forEach((c, i) => { c.hp = i === 0 ? 1 : 0; });
  state.roster = state.pendingBattle.player.team.map(clearEffects);
  const before = clone(state), ended = applyAction(state.pendingBattle, { type: 'wait' });
  assert.equal(ended.result, 'lost');
  const next = settleChallenge(freeze(state), ended);
  assert.deepEqual(state, before); assert.equal(next.finaleStage, before.finaleStage);
  assert.equal(next.marks, 0); assert.equal(next.score, before.score); assert.equal(next.kites, 4);
  assert.equal(next.encounterIndex, before.encounterIndex + 1);
  assert.deepEqual(next.roster.map(c => c.xp), before.roster.map(c => c.xp));
  assert(next.roster.every(c => c.hp === statsFor(c).maxHP && c.energy === statsFor(c).maxEnergy));
  const camp = worldPoints(next).find(p => p.id === 'camp');
  assert.equal(camp.type, 'camp'); assert.equal(next.position.x, camp.x); assert.equal(next.position.z, camp.z);
  if (kind === 'finale') assert.equal(challengeFor(next, { kind, id }).id, id);
  else { atPoint(next, id, 'rival'); assert.equal(challengeFor(next, { kind, id }).id, id); }
  assert.throws(() => settleChallenge(next, ended));
}
const capped = winning(); capped.marks = 1e6; capped.score = 1e9;
const cappedNext = settleChallenge(capped, applyAction(capped.pendingBattle, { type: 'ability', slot: 2 }));
assert.equal(cappedNext.marks, 1e6); assert.equal(cappedNext.score, 1e9);
const reserve = winning();
reserve.roster.push(createCreature('pithnip', 5, 'owned-4')); reserve.roster[3].hp = 2;
const reserveBefore = clone(reserve.roster[3]);
assert.deepEqual(settleChallenge(reserve, applyAction(reserve.pendingBattle, { type: 'ability', slot: 2 })).roster[3], reserveBefore);
const fullRoster = ready();
while (fullRoster.roster.length < 160) fullRoster.roster.push(createCreature('cindupp', 3, `owned-${fullRoster.roster.length + 1}`));
fullRoster.marks = 0; fullRoster.kites = 0;
assert.equal(challengeFor(fullRoster, { kind: 'finale', id: 0 }).id, 0, 'No capture, currency or collection gate');
const origin = pending();
for (const action of [{ type: 'capture' }, { type: 'flee' }]) {
  const refused = applyAction(origin.pendingBattle, action);
  assert.equal(refused.result, null); assert.equal(refused.round, origin.pendingBattle.round);
  assert.throws(() => settleChallenge(origin, refused));
}
const winState = winning(), genuine = applyAction(winState.pendingBattle, { type: 'ability', slot: 2 });
for (const mutate of [b => { b.seed++; }, b => { b.round++; }, b => { b.player.team[0].xp++; },
  b => { b.enemy.team[0].level--; }, b => { b.enemy.team[0].uid = 'finale-1-7-0'; },
  b => { b.enemy.team[0].hp = -1; }, b => { b.player.team[0].energy = 1e9; },
  b => { b.player.classRank = 2; }, b => { b.log = []; }, b => { b.player.team.reverse(); }]) {
  const forged = clone(genuine); mutate(forged); assert.throws(() => settleChallenge(winState, forged));
}
const fabricated = clone(origin.pendingBattle); fabricated.enemy.team.forEach(c => { c.hp = 0; });
fabricated.result = 'won'; fabricated.phase = 'ended';
assert.throws(() => settleChallenge(origin, fabricated));
rejects(s => { s.pendingBattle = genuine; }, winState);

// Pending challenge replay preserves effects, RNG, class rank and exact next action through storage.
const running = pending('finale', 1);
const stepped = applyAction(running.pendingBattle, { type: 'wait' });
assert.equal(stepped.result, null); running.pendingBattle = stepped; running.roster = stepped.player.team.map(clearEffects);
const resumed = validateSave(JSON.parse(JSON.stringify(running)));
assert.deepEqual(applyAction(resumed.pendingBattle, { type: 'ability', slot: 0 }), applyAction(stepped, { type: 'ability', slot: 0 }));
assert.deepEqual(resumed.pendingChallenge, running.pendingChallenge);
let invoked = 0;
const getter = { configurable: true, get() { invoked++; throw new Error('Getter ran'); } };
for (const mutate of [s => { Object.defineProperty(s, 'finaleStage', getter); },
  s => { Object.defineProperty(s, 'pendingChallenge', getter); },
  s => { Object.defineProperty(s.pendingChallenge, 'id', getter); },
  s => { Object.defineProperty(s.pendingChallenge, 'kind', getter); },
  s => { s.pendingChallenge = Object.create(s.pendingChallenge); },
  s => { s.pendingChallenge[Symbol('extra')] = 1; },
  s => { Object.defineProperty(s.pendingBattle.player, 'classRank', getter); },
  s => { Object.defineProperty(s.pendingBattle.enemy.team, '0', getter); }]) rejects(mutate);
const hostileContext = { kind: 'finale', id: 0 }; Object.defineProperty(hostileContext, 'id', getter);
assert.throws(() => challengeFor(ready(), hostileContext));
const hostileEnd = clone(genuine); Object.defineProperty(hostileEnd, 'player', getter);
assert.throws(() => settleChallenge(winState, hostileEnd)); assert.equal(invoked, 0);

function storage(raw = null, fail = null) {
  const slots = new Map([[BACKUP_KEY, 'older backup'], ['unrelated', 'keep']]);
  if (raw !== null) slots.set(SAVE_KEY, raw);
  const calls = [];
  return { slots, calls, getItem(key) { calls.push(['get', key]); if (fail === 'read') throw new Error('SecurityError'); return slots.get(key) ?? null; },
    setItem(key, value) { calls.push(['set', key]); if (fail === key) throw new Error('QuotaExceededError'); slots.set(key, value); } };
}
const raw = JSON.stringify(running, null, 2), slot = storage(raw);
const observed = readSave(slot, true); assert.equal(observed.raw, raw); assert.deepEqual(observed.state, resumed);
const changed = { ...resumed, score: 1 };
assert.equal(writeSave(changed, slot, raw), null); assert.equal(slot.slots.get(BACKUP_KEY), raw);
const stored = [...slot.slots]; assert.match(writeSave(resumed, slot, raw), /conflict/); assert.deepEqual([...slot.slots], stored);
assert.match(writeSave(resumed, slot, null), /conflict/); assert.deepEqual([...slot.slots], stored);
for (const expected of [undefined, false, 0, {}]) {
  assert.match(writeSave(resumed, slot, expected), /Expected primary/); assert.deepEqual([...slot.slots], stored);
}
for (const fail of ['read', BACKUP_KEY, SAVE_KEY]) {
  const blocked = storage(raw, fail), before = [...blocked.slots];
  assert.match(writeSave(changed, blocked, raw), /SecurityError|QuotaExceededError/);
  assert.equal(blocked.slots.get(SAVE_KEY), raw); assert.equal(blocked.slots.get('unrelated'), 'keep');
  if (fail === SAVE_KEY) assert.equal(blocked.slots.get(BACKUP_KEY), raw);
  else assert.deepEqual([...blocked.slots], before);
}
for (const corrupt of ['{bad', JSON.stringify({ ...running, version: 4 }), JSON.stringify({ ...running, finaleStage: 3 }),
  ' '.repeat(256 * 1024 + 1), `{"padding":"${'é'.repeat(140000)}"}`]) {
  const blocked = storage(corrupt), before = [...blocked.slots];
  assert.equal(readSave(blocked).state, null); assert.match(readSave(blocked).error, /Could not read/);
  assert.deepEqual([...blocked.slots], before); assert(blocked.calls.every(([type]) => type === 'get'));
}
const badWrite = storage(raw), beforeWrite = [...badWrite.slots];
assert.match(writeSave({ ...running, pendingChallenge: { kind: 'finale', id: 2 } }, badWrite, raw), /Could not write/);
assert.deepEqual(badWrite.calls, []); assert.deepEqual([...badWrite.slots], beforeWrite);
console.log('PASS: campaign composition fixtures; F3/R1 exact tables; schema3/v1/v2 migration and old-rank next-action replay; availability/location/context/identity/rank guards; genuine one-command win/loss settlement, XP/evolution/history/caps/ordinary rewards and no replay; zero-Marks/kites recovery; immutable copies; pending continuation; getter/prototype/corrupt/oversize/conflict/backup/quota preservation. Natural campaign acceptance NOT established.');
