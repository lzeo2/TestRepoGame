import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SPECIES, BY_ID, ABILITIES, OPTIONAL_HIDDEN_SPECIES as hidden } from '../Games/Foldwild/data.js';
import { createCreature, createBattle, clearEffects, statsFor, gainXP, applyAction } from '../Games/Foldwild/battle.js';
import { generateIndividual, classRank, classProgress, unlockedClasses } from '../Games/Foldwild/builds.js';
import { FINALE_STAGES } from '../Games/Foldwild/campaign.js';
import { freshGame, validateSave, worldPoints, nearbyPoint, routeTo, REGION_LAYOUTS, REGIONS, RIVALS, writeSave, readSave } from '../Games/Foldwild/world.js';
const clone = structuredClone;
const isBonus = p => p.speciesId === hidden.id;
function ready() {
  const state = freshGame('cindupp', 42);
  Object.assign(state, { region: 4, defeatedRivals: [0, 1, 2, 3, 4], finaleStage: 3, optionalEncounters: true,
    position: { ...REGION_LAYOUTS[4].spawn } });
  return validateSave(state);
}
assert.equal(freshGame().optionalEncounters, false);
for (const version of [1, 2, 3]) {
  const old = freshGame(); old.version = version; delete old.optionalEncounters;
  assert.equal(validateSave(old).optionalEncounters, false);
}
for (const value of [null, undefined, 1, 'true', {}, []]) {
  assert.throws(() => validateSave({ ...ready(), optionalEncounters: value }));
  assert.throws(() => worldPoints({ ...ready(), optionalEncounters: value }));
}
const getter = ready();
Object.defineProperty(getter, 'optionalEncounters', { get() { assert.fail('Must not invoke imported getter'); } });
assert.throws(() => validateSave(getter), /invalid optionalEncounters/i);
for (let stage = 0; stage < 3; stage++) assert(!worldPoints({ ...ready(), finaleStage: stage }).some(isBonus));
const hash = createHash('sha256');
for (let region = 0; region < 5; region++) for (let index = 0; index < 100; index++) {
  const state = { ...ready(), region, encounterIndex: index, optionalEncounters: false };
  const base = worldPoints(state);
  hash.update(JSON.stringify(base));
  const enabled = worldPoints({ ...state, optionalEncounters: true });
  assert.deepEqual(enabled.filter(p => !isBonus(p)), base);
  assert.equal(enabled.filter(isBonus).length, region === 4 ? 1 : 0);
}
// Captured from pre-integration HEAD worldPoints: all 500 complete base point sets, not just their counts.
assert.equal(hash.digest('hex'), 'c05c8c74fce64e3f4909b1f688f3f856a815ab48736a3017f58ce8ae44974098');
const point = worldPoints(ready()).find(isBonus);
assert(point && point.level === 28 && point.id === 'optional-cave');
assert.equal(new Set(worldPoints(ready()).map(p => p.id)).size, worldPoints(ready()).length);
assert(routeTo(4, ready().position, point).length > 0, 'bonus point is reachable on existing navigation');
assert.equal(nearbyPoint({ ...ready(), position: { x: point.x, z: point.z, yaw: 0 } }).id, point.id);

// Exercise the actual controller functions without a DOM/renderer or a second settlement implementation.
const source = readFileSync(new URL('../Games/Foldwild/script.js', import.meta.url), 'utf8');
const section = (name, next) => source.slice(source.indexOf(`function ${name}(`), source.indexOf(`function ${next}(`));
const functions = section('collectionProgress', 'rankBenefit') + section('markOwned', 'updateHUD') +
  section('interact', 'challengeReady') + section('beginBattle', 'captureReason') + section('copyBattleTeam', 'selectControl');
const dialogue = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
const messages = new Map();
const slots = new Map();
const storage = { getItem: key => slots.get(key) ?? null, setItem: (key, value) => slots.set(key, value) };
const state = ready();
state.position = { x: point.x, z: point.z, yaw: 0 };
state.roster = [createCreature('cindupp', 28, 'owned-1')];
const env = { state, battle: null, phase: 'world', pendingPoint: null, route: [], busy: false, paused: false,
  busyElapsed: 0, battleFinished: false, document: { hidden: false }, OPTIONAL_HIDDEN_SPECIES: hidden,
  SPECIES, BY_ID, ABILITIES, REGIONS, RIVALS, FINALE_STAGES, worldPoints, nearbyPoint, createCreature, generateIndividual,
  createBattle, classRank, applyAction, clearEffects, gainXP, statsFor, structuredClone, validateSave,
  words: new Intl.ListFormat('en'), playable: () => true,
  byId: id => id === 'dialogue-dialog' ? dialogue : { hidden: false },
  text: (id, value) => messages.set(id, value), setPhase: phase => { env.phase = phase; },
  party: () => env.state.team.map(uid => env.state.roster.find(c => c.uid === uid)),
  renderBattle() {}, focusGame() {}, message() {}, showBattleModels() {}, view: null,
  captureReason: () => '', result: () => { env.phase = 'result'; },
  save() {
    env.state.pendingBattle = env.phase === 'battle' && !env.battle.result ? clone(env.battle) : null;
    assert.equal(writeSave(env.state, storage), null);
  }
};
// Only trusted repository source is evaluated; host realm keeps the strict plain-object save boundary intact.
const controller = Function('env', `with (env) { ${functions}; return { interact, beginBattle, command, collectionProgress, objective }; }`)(env);
controller.interact();
assert(dialogue.open);
assert.match(messages.get('dialogue-text'), /Optional bonus encounter.*disable optional encounters/);
assert.equal(env.battle, null, 'dialogue does not auto-start a fight');
const dialogueSave = readSave(storage).state;
assert(dialogueSave.seen.includes(hidden.id));
assert.equal(dialogueSave.pendingBattle, null);
controller.beginBattle();
assert.equal(env.phase, 'battle');
assert.equal(env.battle.enemy.team[0].speciesId, hidden.id);
assert.deepEqual(env.battle.enemy.team[0].profile, generateIndividual(point.individualSeed).profile);
const resumed = readSave(storage).state;
assert.deepEqual(resumed.pendingBattle, env.battle);
assert.deepEqual(applyAction(resumed.pendingBattle, { type: 'wait' }), applyAction(env.battle, { type: 'wait' }));
for (const change of [s => { s.optionalEncounters = false; }, s => { s.finaleStage = 2; }, s => { s.region = 3; },
  s => { s.pendingBattle.enemy.team[0].level++; }, s => { s.pendingBattle.enemy.team[0].speciesId = 'murnub'; }]) {
  const invalid = clone(resumed); change(invalid); assert.throws(() => validateSave(invalid));
}
const baseBefore = worldPoints({ ...env.state, optionalEncounters: false });
const checkpoint = clone(env.state);
controller.command({ type: 'flee' });
assert.equal(env.state.encounterIndex, checkpoint.encounterIndex, 'bonus flee cannot reroll base wilds');
assert.deepEqual(worldPoints({ ...env.state, optionalEncounters: false }), baseBefore);
assert(readSave(storage).state.optionalEncounters);
// Capture fixture: weaken the real optional enemy and find a successful ordinary capture seed.
env.state = clone(checkpoint); env.battle = clone(checkpoint.pendingBattle); env.phase = 'battle'; env.battleFinished = false;
env.battle.enemy.team[0].hp = Math.floor(statsFor(env.battle.enemy.team[0]).maxHP / 2);
let captureSeed;
for (let seed = 0; seed < 100; seed++) {
  if (applyAction({ ...env.battle, seed }, { type: 'capture' }).result === 'captured') { captureSeed = seed; break; }
}
assert.notEqual(captureSeed, undefined);
env.battle.seed = captureSeed;
env.save();
env.battle = clone(readSave(storage).state.pendingBattle);
controller.command({ type: 'capture' });
assert.equal(env.battle.result, 'captured');
assert.equal(env.state.kites, checkpoint.kites - 1);
assert.equal(env.state.encounterIndex, checkpoint.encounterIndex);
const captured = env.state.roster.find(c => c.speciesId === hidden.id);
assert(captured && captured.uid === 'owned-2' && captured.hp > 0);
assert(env.state.team.includes(captured.uid));
assert(env.state.caught.includes(hidden.id));
assert(!worldPoints(env.state).some(isBonus), 'bonus stays caught after release/history; no duplicate spawn');
assert.deepEqual(readSave(storage).state, validateSave(env.state));
assert.deepEqual(worldPoints({ ...env.state, optionalEncounters: false }), baseBefore);
const optedOut = validateSave({ ...env.state, optionalEncounters: false });
assert(optedOut.roster.some(c => c.speciesId === hidden.id), 'opt-out never deletes owned allies');
assert(!worldPoints(optedOut).some(isBonus));
assert.equal(controller.collectionProgress(env.state), '1 seen / 1 caught / 80 · Optional bonus: caught');
assert.match(controller.objective(env.state), /1\/80 species/);
for (const id of ['binder', 'tactician']) assert.deepEqual(classProgress(env.state, id), classProgress({ ...env.state, caught: ['cindupp'] }, id));
assert.deepEqual(unlockedClasses(env.state), unlockedClasses({ ...env.state, caught: ['cindupp'] }));
const complete = { ...env.state, seen: [...SPECIES.map(s => s.id), hidden.id], caught: [...SPECIES.map(s => s.id), hidden.id] };
assert.equal(validateSave(complete).caught.length, 81);
assert.match(controller.collectionProgress(complete), /^80 seen \/ 80 caught \/ 80 · Optional bonus: caught$/);
assert.match(controller.objective(complete), /80\/80 species/);
assert.equal(classProgress(complete, 'binder').current, 80);
assert.equal(writeSave(complete, storage), null);
assert.deepEqual(readSave(storage).state, validateSave(complete));
console.log('PASS: optional default-off/migration/gates/reachability; 500 exact base-world RNG snapshots; actual controller dialogue/battle/flee/capture; pending replay/rejection/save round-trip; opt-out keeps allies; canonical80/bonus and class progress independent');
