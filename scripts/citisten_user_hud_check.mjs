import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMaxListeners } from 'node:events';
import { createUI } from '../Games/Citisten3D/ui.mjs';
import { createEconomy } from '../Games/Citisten3D/production.mjs';

// Actual production UI handlers. No HTML parser, browser layout, GPU or visual proof.
setMaxListeners(0);
class Element extends EventTarget {
  dataset = {}; style = {}; hidden = false; open = false; disabled = false;
  textContent = ''; children = []; attributes = new Map(); classes = new Set();
  classList = { add: n => this.classes.add(n), remove: n => this.classes.delete(n),
    contains: n => this.classes.has(n), toggle: (n, on) => on ? this.classes.add(n) : this.classes.delete(n) };
  setAttribute(k, v) { this.attributes.set(k, v); }
  append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
  querySelectorAll(selector) { return this.children.filter(n => selector === 'p' && n.tag === 'p'); }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
  remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  replaceChildren() { this.children = []; }
  showModal() { this.open = true; } close() { this.open = false; }
  focus() {} closest() { return this; }
  getContext() { return this.context ||= { fillStyle: '', pixels: [], fillRect(...rect) { this.pixels.push([this.fillStyle, ...rect]); },
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {} }; }
}
const writes = [];
globalThis.document = { createElement: tag => Object.assign(new Element(), { tag }) };
globalThis.localStorage = { getItem: key => key === 'citisten-tutorial-seen' ? '1' : null,
  setItem: (...args) => writes.push(args) };
globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: false });
function mount(callbacks = {}) {
  const root = new Element(), nodes = new Map();
  const node = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
  root.querySelector = node;
  node('.city-map canvas').width = 200;
  const groups = ['Road', 'Zone', 'Service', 'Defense', 'Bulldoze'].map(group => {
    const button = node(`[data-group="${group}"]`); button.dataset.group = group; return button;
  });
  const theme = new Element(); theme.dataset.action = 'theme';
  root.querySelectorAll = selector => selector === '[data-group]' ? groups : selector === '[data-action="theme"]' ? [theme] : [];
  const ui = createUI(root, callbacks);
  const click = (dataset, extra = {}) => {
    const button = Object.assign(new Element(), extra, { dataset });
    const event = new Event('click'); Object.defineProperty(event, 'target', { value: button }); root.dispatchEvent(event);
  };
  return { ui, root, node, click, theme, text: key => node(`[data-value="${key}"]`).textContent,
    notices: () => node('.city-toasts').children.filter(n => n.tag === 'p') };
}
const building = (type, extra = {}) => ({ id: 1, type, x: 4, z: 4, hp: 100, powered: true, watered: true, ...extra });
const base = { phase: 'day', mode: 'free', budget: 40000, population: 0, morale: 0.5, buildings: [],
  power: { supply: 0, demand: 1 }, water: { supply: 0, demand: 1 } };
{
  const f = mount();
  f.ui.update({ ...base, power: { supply: 1, demand: 0 }, water: { supply: 0, demand: 0 } });
  assert.equal(f.text('power'), '1 available · 0 needed · No demand');
  assert.equal(f.node('#city-power').value, 0, 'no-demand meter is not misleadingly full');
  assert.equal(f.node('#city-power').attributes.get('aria-valuetext'), '1 available, 0 needed, no demand');
  assert.equal(f.text('water'), '0 available · 0 needed · No demand');
  assert.equal(f.node('#city-water').max, 1, 'zero supply/demand has a valid positive meter range');
  assert.equal(f.node('#city-water').value, 0);
  assert.match(f.text('growthDiagnosis'), /Next: choose Road.*dry land beside the hall.*Selection does not place/);
  assert.equal(f.text('budget'), '$40,000'); assert.equal(f.text('morale'), '50%');
  f.ui.update(base, { roads: { cells: new Set([1]), cell: () => ({ x: 1, z: 1 }) } });
  assert.match(f.text('growthDiagnosis'), /Zone → Residential.*beside your road/);
  f.ui.update({ ...base, buildings: [building('residential', { constructionRemaining: 4, constructionTotal: 8 })] });
  assert.match(f.text('growthDiagnosis'), /Residential finish \(4s/);
  f.ui.update({ ...base, buildings: [building('residential', { powered: false })], power: { supply: 0, demand: 0.3 } });
  assert.equal(f.text('power'), '0 available · 0.3 needed · Shortage');
  assert(f.node('#city-power').classes.has('is-overloaded'));
  assert.match(f.text('growthDiagnosis'), /connect power.*1 unserved/);
  f.ui.update({ ...base, buildings: [building('residential', { watered: false })] });
  assert.match(f.text('growthDiagnosis'), /connect water/);
  f.ui.update({ ...base, power: { supply: 0.8, demand: 0.3 } });
  assert.equal(f.text('power'), '0.8 available · 0.3 needed');
  assert.equal(f.node('#city-power').value, 0.3);
  assert(!f.node('#city-power').classes.has('is-overloaded'), 'restored supply clears shortage state');
  f.ui.update({ ...base, buildings: [building('residential')], growthDiagnosis: 'Add a nearby service.' });
  assert.equal(f.text('growthDiagnosis'), 'Add a nearby service.');
  f.ui.update({ ...base, rebuildRemaining: 17 }); assert.match(f.text('growthDiagnosis'), /Rebuild: 17s.*Repair/);
  assert(!f.node('.city-economy').open && !f.node('.city-goal').open, 'details closed by default');
  f.click({ action: 'theme' }); assert.equal(f.root.dataset.theme, 'light'); assert.equal(f.theme.textContent, 'Dark');
  f.click({ action: 'theme' }); assert.equal(f.root.dataset.theme, 'dark');
  f.ui.destroy();
}
console.log('PASS HUD zero demand, fractional shortages, budget/morale, road/home/site/service/rebuild next actions, closed details and both themes');
{
  let allow = false; const calls = [], tools = [];
  const f = mount({ onStart: (...args) => { calls.push(args); return allow; }, onRestart: () => allow, onTool: type => tools.push(type) });
  f.node('#city-seed').value = '12'; f.node('#city-scenario').value = 'balanced';
  f.click({ group: 'Service' }); f.click({ tool: 'water' });
  f.ui.events([{ type: 'placed', building: building('water') }]);
  const notice = f.notices()[0], palette = f.node('.city-tools').innerHTML;
  f.click({ mode: 'defense' });
  assert(f.node('.city-menu').open, 'cancelled new town leaves menu open');
  assert.equal(f.node('.city-tools').innerHTML, palette, 'cancel does not reset selected tool');
  assert.equal(f.notices()[0], notice, 'cancel does not clear notices');
  assert(!f.node('.city-tutorial').open, 'cancel does not open tutorial');
  f.node('#city-seed').value = 'bad'; f.node('#city-seed').dispatchEvent(new Event('change'));
  assert.equal(calls.length, 1, 'editing seed alone never invokes start');
  allow = true; f.click({ mode: 'free' }, { id: 'continue-town' });
  assert.deepEqual(calls.at(-1), ['free', undefined], 'Continue ignores invalid new-town seed');
  assert(!f.node('.city-menu').open); assert.equal(f.notices().length, 0);
  f.ui.update({ ...base, phase: 'lost' }); assert(f.node('.city-loss').open);
  allow = false; f.click({ action: 'restart' }); assert(f.node('.city-loss').open, 'cancelled restart preserves loss dialog');
  allow = true; f.click({ action: 'restart' }); assert(!f.node('.city-loss').open);
  assert.deepEqual(tools, ['water']); f.ui.destroy();
}
console.log('PASS cancelled start/restart preserves dialogs/tool/notices, seed edit is inert, Continue invalid seed bypasses parsing');
{
  const responses = [], f = mount({ onEventAction: id => responses.push(id) });
  const home = building('residential', { constructionRemaining: 6 });
  f.ui.events([{ type: 'placed', building: home }, { type: 'construction-started', id: 1, total: 6 }]);
  assert.equal(f.notices().length, 1); assert.equal(f.notices()[0].textContent, 'Residential: construction started (6s). No output until complete.');
  f.ui.events([{ type: 'construction-complete', building: building('residential') }]);
  assert.equal(f.notices().length, 1); assert.equal(f.notices()[0].textContent, 'Residential: construction complete');
  const event = { id: 'water-1', type: 'water-main-burst', title: 'Water main', district: '0,0', description: 'Leak' };
  f.ui.events([{ type: 'city-event-start', event }]);
  const action = f.notices().find(n => n.dataset.priority === 'urgent');
  assert.equal(action.children.at(-1).dataset.cityEvent, 'water-1');
  for (const type of ['water', 'power', 'park', 'police']) f.ui.events([{ type: 'placed', building: building(type) }]);
  assert(f.notices().includes(action), 'routine placements cannot evict civic response');
  assert.equal(f.notices().filter(n => n.dataset.priority === 'routine').length, 1);
  f.ui.events([{ type: 'placed', building: building('water') }]);
  assert.equal(f.notices().at(-1).textContent, 'Water tower placed', 'returning to an earlier notice still shows latest action');
  f.ui.events([{ type: 'blackout', active: true }]);
  assert.equal(f.notices().at(-1).textContent, 'Blackout'); assert(f.notices().includes(action));
  f.ui.events([{ type: 'wave-warning' }, { type: 'wave', night: 2 }, { type: 'hall-fallen', remaining: 120, cost: 240 }]);
  assert(f.notices().includes(action), 'even urgent turnover cannot evict a civic action');
  assert.equal(f.notices().filter(n => n.dataset.priority === 'urgent' && !n.dataset.response).length, 2);
  f.click({ cityEvent: 'water-1' }); assert.deepEqual(responses, ['water-1']);
  f.ui.events([{ type: 'city-event-end', event, reason: 'repaired' }]);
  assert(!f.notices().includes(action), 'resolved civic action is removed');
  f.ui.events([{ type: 'research-started', label: '<img src=x>', cost: 300, total: 12 }]);
  assert.match(f.notices().at(-1).textContent, /<img src=x>/, 'notice uses literal textContent');
  f.ui.destroy();
}
console.log('PASS named construction/placement, latest routine only, urgent blackout and civic action retained, literal text');
{
  const f = mount(); let reads = 0;
  const terrain = { seed: 1, isWater: (x, z) => { reads++; return x === terrain.seed && z === 0; } };
  const map = { size: 4, terrain }, state = { ...base, terrainLayout: 'river-v1', terrainSeed: 1 };
  f.ui.update(state, map); assert.equal(reads, 16);
  const pixels = f.node('.city-map canvas').getContext().pixels;
  assert(pixels.some(p => p[0] === '#527b99' && p[1] === 50));
  f.ui.update(state, map); assert.equal(reads, 16, 'unchanged terrain cached');
  terrain.seed = 2; f.ui.update({ ...state, terrainSeed: 2 }, map);
  assert.equal(reads, 32, 'seed change redraws immediately within throttle window');
  assert(pixels.some(p => p[0] === '#527b99' && p[1] === 100));
  const terrain2 = { isWater: terrain.isWater }; f.ui.update({ ...state, terrainSeed: 2 }, { ...map, terrain: terrain2 });
  assert.equal(reads, 48, 'identity change invalidates cache');
  f.ui.update({ ...state, terrainSeed: 3 }, { ...map, terrain: terrain2 }); assert.equal(reads, 64, 'state seed fallback invalidates cache');
  f.ui.update({ ...state, terrainSeed: 3, terrainLayout: 'legacy-flat' }, { ...map, terrain: terrain2 });
  assert.equal(reads, 80, 'layout change invalidates cache');
  f.ui.update({ ...state, terrainSeed: 3, terrainLayout: 'legacy-flat' }, { size: 5, terrain: terrain2 });
  assert.equal(reads, 105, 'map size change invalidates cache');
  const economy = createEconomy(12, 'balanced');
  f.ui.update({ ...base, expansionEnabled: true, economy });
  assert.match(f.text('economyResources'), /Legacy terrain \(no map seed\).*Resource seed 12/);
  f.ui.update({ ...base, expansionEnabled: true, terrainSeed: 0, economy });
  assert.match(f.text('economyResources'), /Map seed 0.*Resource seed 12/);
  f.ui.destroy();
}
console.log('PASS minimap identity/seed invalidation, unchanged cache reuse, legacy versus explicit-zero map seed/resource labels');
const css = readFileSync(new URL('../Games/Citisten3D/ui.css', import.meta.url), 'utf8');
assert.match(css, /\.city-toolbar \{[^}]*flex-wrap: wrap/);
assert.match(css, /\.city-utilities \{[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /\.city-stat meter \{[^}]*min-width: 0/);
assert.match(css, /\.city-stat\.utility \{[^}]*overflow-wrap: anywhere/);
assert.match(css, /min-height: 44px/); assert.match(css, /:focus-visible/); assert.match(css, /prefers-reduced-motion/);
assert(!/https?:\/\/|gradient\(/.test(css));
assert(writes.every(([key]) => key === 'citisten-theme'), 'no save writes from UI new-town/Continue/render');
console.log('CITISTEN USER HUD CHECK PASS: 4 behavior groups + CSS readability/bounds contracts; fake DOM only, GPU/visual/layout acceptance UNPROVEN');
