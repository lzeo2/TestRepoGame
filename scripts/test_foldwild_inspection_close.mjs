import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Execute the actual controller boundaries, including a deliberately late model load.
const source = readFileSync(new URL('../Games/Foldwild/script.js', import.meta.url), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));
const inspectSource = section('async function inspectCreature(', 'function collection()');
const closeSource = section("byId('collection-dialog').addEventListener('close',", "byId('ledger-preview-close').addEventListener");
const nodes = new Map();
const node = id => {
  if (!nodes.has(id)) nodes.set(id, { hidden: false, open: false, focus() {}, close() { this.open = false; },
    append(child) { child.parentElement = this; }, querySelector() { return null; },
    scrollIntoView() {}, addEventListener(type, callback) { this[type] = callback; } });
  return nodes.get(id);
};
const viewport = { prepend(child) { child.parentElement = this; } };
const canvas = { parentElement: viewport };
const saved = { roster: [{ uid: 'owned-1', speciesId: 'cindupp' }], seen: ['cindupp'], position: { x: 0, z: 16 } };
let releaseLoad, worldRestores = 0, battleRestores = 0, focusCalls = 0;
const messages = [];
const env = {
  state: structuredClone(saved), phase: 'world', busy: false, battle: null,
  inspectionToken: 0, inspectedSpecies: null, selectedUidForCosmetic: null,
  inspectionFocus: null, route: [], battleModels: 'old', canvas, viewport,
  BY_ID: { cindupp: { name: 'Cindupp' } }, byId: node,
  text: (id, value) => messages.push([id, value]), nameOf: () => 'Cindupp',
  clearInput() {}, ensureView() {}, resize() {}, updateHUD() {},
  focusGame: () => focusCalls++,
  showWorld: () => { worldRestores++; },
  showBattleModels: () => { battleRestores++; }, party: () => env.state.roster,
  view: { showInspection: () => new Promise(resolve => { releaseLoad = resolve; }),
    inspect: () => ({ fallbackModels: [], countLoadedModels: 1 }) }
};
const controller = Function('env', `with (env) { ${inspectSource}; ${closeSource}; return { inspectCreature, closeInspection }; }`)(env);
node('collection-dialog').open = true;
const loading = controller.inspectCreature('cindupp', 'owned-1', {});
assert.equal(canvas.parentElement, node('ledger-model-host'));
assert.equal(env.inspectionToken, 1);
node('collection-dialog').open = false;
node('collection-dialog').close();
assert.equal(env.inspectionToken, 2, 'one close invalidates the pending inspection generation');
assert.equal(canvas.parentElement, viewport, 'single canvas restored synchronously by close handler');
assert.equal(node('ledger-inspector').hidden, true);
assert.equal(worldRestores, 1);
assert.equal(focusCalls, 1);
const afterClose = structuredClone(messages);
releaseLoad(); await loading;
assert.deepEqual(messages, afterClose, 'late inspection cannot publish status or steal focus');
assert.deepEqual(env.state, saved, 'close/late loading cannot alter saves, roster or position');
assert.equal(env.inspectedSpecies, null);
assert.equal(env.inspectionFocus, null);
// Closing a plain ledger must not tear down/reload the world again.
node('collection-dialog').close();
assert.equal(worldRestores, 1);
// Result inspection restores the battle presentation without reopening battle gameplay.
env.phase = 'result'; env.battle = { player: { active: 0, team: [{ uid: 'owned-1' }] }, enemy: { active: 0, team: [{}] } };
env.inspectedSpecies = 'cindupp'; canvas.parentElement = node('ledger-model-host');
node('collection-dialog').close();
assert.equal(battleRestores, 1); assert.equal(env.phase, 'result');
assert.equal(canvas.parentElement, viewport); assert.deepEqual(env.state, saved);
console.log('PASS: actual single-close restoration, late-inspection generation rejection, plain-ledger no-reload, result presentation and unchanged save/roster/pose');
