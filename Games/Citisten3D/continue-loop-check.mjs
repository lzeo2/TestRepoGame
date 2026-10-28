// Run: node --experimental-vm-modules Games/Citisten3D/continue-loop-check.mjs
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { setMaxListeners } from 'node:events';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
setMaxListeners(0);

// DOM event propagation is explicit; this is NOT browser input/compositor proof.
class Element extends EventTarget {
  dataset = {}; style = {}; hidden = false; open = false; textContent = ''; children = [];
  classes = new Set();
  classList = { add: n => this.classes.add(n), remove: n => this.classes.delete(n),
    toggle: (n, yes) => yes ? this.classes.add(n) : this.classes.delete(n), contains: n => this.classes.has(n) };
  focus() {} setAttribute() {} before() {} setPointerCapture() {}
  append(...nodes) { this.children.push(...nodes); }
  querySelectorAll() { return []; }
  closest(selector) { return selector === 'button' ? this : null; }
  showModal() { this.open = true; } close() { this.open = false; }
  replaceChildren() {} getContext() { return { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {} }; }
}
async function mount(memory, debugConsole) {
const nodes = new Map(), frames = new Map(), renders = [], lights = [], errors = [];
const node = key => { if (!nodes.has(key)) nodes.set(key, new Element()); return nodes.get(key); };
const root = node('#ui'); root.querySelector = selector => node(`ui:${selector}`);
const groups = ['Road', 'Zone', 'Service', 'Defense', 'Bulldoze'].map(group => {
  const e = root.querySelector(`[data-group="${group}"]`); e.dataset.group = group; return e;
});
root.querySelectorAll = selector => selector === '[data-group]' ? groups : [];
const document = Object.assign(new EventTarget(), { hidden: false, querySelector: node, createElement: () => new Element() });
Object.defineProperty(document, 'visibilityState', { get: () => document.hidden ? 'hidden' : 'visible' });
const window = new EventTarget();
let frameId = 0, wall = 0;
const context = vm.createContext({ document, window, Event, AbortController, URL, console: { log() {}, warn() {}, debug: debugConsole || (() => {}), error(e) { errors.push(e); } },
  matchMedia: () => Object.assign(new EventTarget(), { matches: false }), performance: { now: () => wall },
  localStorage: { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) },
  requestAnimationFrame(fn) { frames.set(++frameId, fn); return frameId; }, cancelAnimationFrame(id) { frames.delete(id); },
  renders, lights });
const base = new URL('./', import.meta.url), modules = new Map();
const worldSource = `import { RoadGrid } from './roads.mjs';
export function createWorld() { return { loaded: true, ready: Promise.resolve(), roads: new RoadGrid(200),
  buildings: { spawn(type, pose) { return { type, pose }; }, transform() {}, remove() {} },
  camera: { fov: 50, position: { x: 0, y: 100, z: 100 }, rotation: { x: 0, y: 0 } },
  controls: { setPose() {}, target: {} }, setTerrain() {}, roadPool: { sync() {} }, streetLamps: { update() {} },
  dayNight: { daylight: 1, approach(phase, dt) { lights.push(dt); } }, atmosphere: { setWeather() {} },
  effects: { active: false, shot() {} }, pickLot(x, z) { return { x, z }; }, render(dt) { renders.push(dt); }, dispose() {} }; }`;
async function load(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  let source = url.pathname.endsWith('/world.mjs') ? worldSource : await readFile(url, 'utf8');
  // Test-only read-only closure access. Product files are never rewritten.
  if (url.pathname.endsWith('/native.mjs')) source += '\nexport const inspect = () => ({ sim, paused, resumeSpeed, closed });';
  const module = new vm.SourceTextModule(source, { context, identifier: url.href,
    initializeImportMeta(meta) { meta.url = url.href; } });
  modules.set(url.href, module);
  return module;
}
const entry = await load(new URL('native.mjs', base));
await entry.link((specifier, parent) => load(new URL(specifier, parent.identifier)));
await entry.evaluate();
assert.deepEqual(errors, []);
const inspect = entry.namespace.inspect;
function event(type, target, extra = {}) {
  const e = new Event(type, { cancelable: true });
  Object.defineProperty(e, 'target', { value: target });
  for (const [key, value] of Object.entries(extra)) Object.defineProperty(e, key, { value });
  return e;
}
function click(button) {
  window.dispatchEvent(event('click', button)); // actual window capture wake
  button.dispatchEvent(event('click', button)); // target listeners, before UI bubbling
  root.dispatchEvent(event('click', button));
}
function action(dataset) { const b = new Element(); b.dataset = dataset; click(b); }
function speed(value) { const n = node('#speed'); n.value = String(value); window.dispatchEvent(event('change', n)); n.dispatchEvent(event('change', n)); }
function step(ms) {
  assert.equal(frames.size, 1, 'one native frame owner');
  wall = ms; const [id, fn] = frames.entries().next().value; frames.delete(id); fn(ms);
  assert(frames.size <= 1, 'reentrant syncModels/save/pose wake cannot duplicate owner');
}
function visibility(hidden) { document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); }
function pointer(type, x, z) {
  const canvas = node('#world'); window.dispatchEvent(event(type, canvas));
  canvas.dispatchEvent(event(type, canvas, { button: 0, pointerId: 1, clientX: x, clientY: z }));
}
function place(tool, x, z) { action({ tool }); pointer('pointerdown', x, z); pointer('pointerup', x, z); }
const buttonById = id => root.querySelector('.city-menu-content').children
  .flatMap(e => e.children).find(e => e.id === id);
return { context, node, root, window, frames, renders, lights, errors, inspect, event, click, action, speed, step, visibility, pointer, place, buttonById };
}
export async function runContinueScenario({ onMounted, debugConsole } = {}) {
const memory = new Map([['citisten-tutorial-seen', '1']]);
const oldPage = await mount(memory, debugConsole);
await onMounted?.(oldPage);
let { node, window, frames, renders, lights, errors, inspect, event, click, action, speed, step, visibility, pointer, place, buttonById } = oldPage;
action({ mode: 'free' });
assert.equal(inspect().paused, false); step(0);
// All native fixture placement uses actual UI/pointer handlers, not sim grants.
action({ tool: 'road' }); pointer('pointerdown', 83, 103); pointer('pointerup', 95, 103); // dry section only; bridge separately
// River crossing needs the real bridge tool; road rejection above is allowed.
action({ tool: 'bridge' }); pointer('pointerdown', 83, 103); pointer('pointerup', 95, 103);
for (const [tool, x, z] of [['water',83,102], ['residential',91,102], ['commercial',92,102], ['power',93,104], ['park',94,104]]) place(tool, x, z);
assert.equal(inspect().sim.state.buildings.length, 6, 'real native placement fixture');
speed(10); step(40000); // natural production growth/progression, headless wall fixture
assert.equal(inspect().sim.state.progressionLevel, 1);
assert.equal(inspect().sim.state.population, 64);
place('apartments', 95, 102);
speed(1); step(43000);
const original = inspect().sim, apartment = s => s.state.buildings.find(b => b.type === 'apartments');
assert.equal(apartment(original).constructionRemaining, 9);
action({ action: 'menu' });
assert.equal(inspect().paused, true); assert.equal(original.state.speed, 0); assert.equal(inspect().resumeSpeed, 1);
click(buttonById('save-town'));
const saved = JSON.parse(memory.get('citisten-save-v1'));
assert.equal(saved.state.speed, 1); assert.equal(saved.state.buildings.at(-1).constructionRemaining, 9);
// Match the failed browser case too: selected speed 0 survives Menu Save.
action({ action: 'resume' }); speed(0); action({ action: 'menu' }); click(buttonById('save-town'));
assert.equal(JSON.parse(memory.get('citisten-save-v1')).state.speed, 0);
step(44000); step(46000); assert.equal(frames.size, 0, 'menu settles and sleeps');
const frozenTime = original.state.time;
// Also exercise rebind under an EXISTING loop, without overwriting the 9s save.
click(buttonById('continue-town'));
const rebound = inspect().sim;
assert.notEqual(rebound, original); assert.equal(inspect().paused, false);
speed(10); step(47000); step(47900);
assert.equal(rebound.state.time, frozenTime + 9); assert.equal(apartment(rebound).constructionRemaining, 0);
assert.equal(original.state.time, frozenTime, 'existing loop follows mutable sim binding after Continue');
assert.equal(JSON.parse(memory.get('citisten-save-v1')).state.buildings.at(-1).constructionRemaining, 9);
// Real pagehide stops the old module/loop. A NEW VM retains only localStorage.
window.dispatchEvent(event('click', node('#speed')));
const oldCallback = [...frames.values()][0];
window.dispatchEvent(new Event('pagehide'));
assert.equal(oldPage.inspect().closed, true); assert.equal(oldPage.frames.size, 0);
const freshPage = await mount(memory, debugConsole);
await onMounted?.(freshPage);
({ node, window, frames, renders, lights, errors, inspect, event, click, action, speed, step, visibility, pointer, place, buttonById } = freshPage);
assert.equal(inspect().sim, undefined, 'fresh native bootstrap validates but does not silently start save');
assert.equal(inspect().paused, true); assert.equal(frames.size, 1, 'new loop owns its startup frame');
oldCallback(500000);
assert.equal(oldPage.frames.size, 0, 'stale old-page callback cannot revive stopped loop');
assert.equal(original.state.time, frozenTime);
click(buttonById('continue-town'));
const restored = inspect().sim;
assert.notEqual(restored, original, 'Continue rebinds sim rather than mutating old sim');
assert.equal(inspect().paused, false); assert.equal(inspect().resumeSpeed, 0);
assert.equal(restored.state.speed, 0, 'Continue from selected-speed-zero save is not private menu pause');
assert.equal(restored.state.time, frozenTime); assert.equal(restored.roads, window.citisten.world.roads);
speed(10); assert.equal(inspect().resumeSpeed, 10);
// No callbacks means no simulation progress, even when DOM input has resumed.
assert.equal(restored.state.time, frozenTime); assert.equal(apartment(restored).constructionRemaining, 9);
// One very late first callback is a legitimate frozen outcome, not proof of a pause bug.
step(5000); assert.equal(restored.state.time, frozenTime, 'single callback five wall seconds after wake has dt zero');
assert.equal(apartment(restored).constructionRemaining, 9);
step(5900);
assert.equal(apartment(restored).constructionRemaining, 0, '9s site completes .9 wall seconds after first callback at 10x');
assert.equal(restored.state.time, frozenTime + 9); assert.equal(restored.state.tick, saved.state.tick + 36);
assert.equal(original.state.time, frozenTime, 'native callback advances restored binding, NOT old simulation');
assert.equal(oldPage.frames.size, 0, 'old loop remains stopped while new loop advances');
assert.equal(rebound.state.time, frozenTime + 9, 'old-page rebound sim is stopped too');
assert.equal(renders.at(-1), .25); assert.equal(lights.at(-1), .25, 'only rendering/light dt clamped');
step(10900); assert.equal(restored.state.time, frozenTime + 59, 'full five-second dt reaches sim: 200 fixed steps');
action({ action: 'menu' }); const pausedAt = restored.state.time;
step(57000); assert.equal(restored.state.time, pausedAt, 'paused callbacks freeze simulation');
action({ action: 'resume' }); assert.equal(restored.state.speed, 10);
speed(0); step(58000); assert.equal(restored.state.time, pausedAt, 'speed zero freezes despite callbacks');
speed(10); visibility(true); assert.equal(frames.size, 0);
const renderCount = renders.length; visibility(false); step(90000);
assert.equal(restored.state.time, pausedAt, 'visibility resume excludes hidden wall time');
assert.equal(renders.length, renderCount + 1); step(91000); assert.equal(restored.state.time, pausedAt + 10);
const stale = [...frames.values()][0]; visibility(true); stale(92000);
assert.equal(restored.state.time, pausedAt + 10, 'hidden stale callback does no work');
visibility(false); const stoppedCallback = [...frames.values()][0]; window.dispatchEvent(new Event('pagehide'));
stoppedCallback(100000); window.dispatchEvent(event('click', node('#speed')));
assert.equal(frames.size, 0); assert.equal(inspect().closed, true); assert.equal(restored.state.time, pausedAt + 10);
assert.deepEqual(errors, []);
console.log('CONTINUE LOOP PASS: actual native/UI/loop/sim/save/roads; natural stage1, speed0 Menu Save/pagehide/fresh-VM bootstrap/Continue rebind, late first callback dt0, second +.9s completes 9s site at 10x; full dt vs .25 render; pause/speed0/hidden/no-callback/stop/stale/one-owner');
console.log('LIMIT: fake DOM/world/RAF, not browser/GPU acceptance; fixture advances via production input and delivered timestamps only');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runContinueScenario();
