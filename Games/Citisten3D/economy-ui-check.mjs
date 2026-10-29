import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMaxListeners } from 'node:events';
import { createUI } from './ui.mjs';
import { createDevelopment, startResearch } from './development.mjs';
import { createEconomy, setSpecialization } from './production.mjs';
import { createIncidentState, respondIncident } from './incidents.mjs';
setMaxListeners(0);

// Production UI and pure action modules, not browser parsing/layout/modal proof.
let created = 0;
class Element extends EventTarget {
  dataset = {}; style = {}; hidden = false; open = false; disabled = false; children = [];
  classes = new Set(); attributes = new Map(); textContent = ''; id = '';
  classList = { add: n => this.classes.add(n), remove: n => this.classes.delete(n), contains: n => this.classes.has(n),
    toggle: (n, yes) => yes ? this.classes.add(n) : this.classes.delete(n) };
  setAttribute(k, v) { this.attributes.set(k, v); }
  append(...nodes) { for (const n of nodes) { n.parent = this; this.children.push(n); } }
  querySelectorAll(selector) { return this.children.filter(n => selector === 'p' && n.tag === 'p'); }
  querySelector(selector) { return this.querySelectorAll(selector)[0]; }
  remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  replaceChildren() { this.children = []; }
  showModal() { this.open = true; } close() { this.open = false; }
  focus() { globalThis.focused = this; } closest() { return this; }
  getContext() { return { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }; }
}
globalThis.document = { createElement(tag) { created++; return Object.assign(new Element(), { tag }); } };
globalThis.localStorage = { getItem() { return '1'; }, setItem() {} };
globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: true });
function mount(callbacks = {}) {
  const root = new Element(), nodes = new Map();
  const node = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
  root.querySelector = node;
  const groups = ['Road', 'Zone', 'Service', 'Defense', 'Bulldoze'].map(group => {
    const button = node(`[data-group="${group}"]`); button.dataset.group = group; return button;
  });
  root.querySelectorAll = selector => selector === '[data-group]' ? groups : [];
  const ui = createUI(root, callbacks);
  const click = (dataset, extra = {}) => {
    const button = Object.assign(new Element(), extra); button.dataset = dataset;
    const event = new Event('click'); Object.defineProperty(event, 'target', { value: button }); root.dispatchEvent(event);
  };
  const controls = list => node(list).children.map(row => ({ row, button: row.children[0], detail: row.children[1] }));
  return { ui, root, node, click, controls, text: key => node(`[data-value="${key}"]`).textContent };
}
function city() {
  const types = ['residential', 'workshop', 'industrial', 'commercial', 'school'];
  return { expansionEnabled: true, size: 40, tick: 0, time: 0, phase: 'day', speed: 0, population: 60, budget: 2000,
    income: 3, upkeep: 1, netIncome: 2, development: createDevelopment(), economy: createEconomy(0, 'fertile'),
    incidents: createIncidentState(0), buildings: types.map((type, index) => ({ id: index + 1, type, x: index + 2, z: 2, hp: 80, maxHp: 100 })) };
}
{
  const starts = [], restarts = [], f = mount({ onStart: (...args) => starts.push(args), onRestart: (...args) => restarts.push(args) });
  for (const raw of ['', '-1', '1.5', '4294967296', 'NaN', 'Infinity', '1e3', '<img>']) {
    f.node('#city-seed').value = raw; f.click({ mode: 'free' });
    assert.equal(starts.length, 0, raw); assert.match(f.node('.city-menu-error').textContent, /Seed must/);
    assert(f.node('.city-menu').open, 'invalid seed leaves menu open');
  }
  f.node('#city-seed').value = '0'; f.node('#city-scenario').value = 'unknown'; f.click({ mode: 'defense' }); assert.equal(starts.length, 0);
  for (const [mode, seed, scenario] of [['free', '0', 'fertile'], ['defense', '4294967295', 'mineral']]) {
    f.node('#city-seed').value = seed; f.node('#city-scenario').value = scenario; f.click({ mode });
    assert.deepEqual(starts.at(-1), [mode, { seed: Number(seed), scenario }]);
  }
  f.node('#city-seed').value = 'bad'; f.click({ mode: 'free' }, { id: 'continue-town' });
  assert.deepEqual(starts.at(-1), ['free', undefined], 'Continue bypasses new-town validation/options');
  f.click({ action: 'restart' }); assert.deepEqual(restarts, [['free']], 'restart does not replace parent options');
  f.ui.destroy();
}
console.log('PASS new-town uint32/scenario validation, both modes, Continue and restart contracts');
{
  const state = city(), calls = [];
  const f = mount({ onResearch(id) { calls.push(['research', id]); return startResearch(state, id); },
    onSpecialization(name) { calls.push(['policy', name]); return setSpecialization(state, name); },
    onIncidentResponse(id) { calls.push(['incident', id]); return respondIncident(state, id); }, onTool(id) { calls.push(['tool', id]); } });
  const research = id => f.controls('.city-research-options').find(c => c.button.dataset.research === id);
  const policy = id => f.controls('.city-policy-options').find(c => c.button.dataset.specialization === id);
  const before = JSON.stringify(state); f.ui.update(state); assert.equal(JSON.stringify(state), before, 'render is read-only');
  assert(!f.node('.city-economy').hidden); assert.match(f.text('netIncome'), /Net \$2\/s/);
  assert.match(f.text('economyBudget'), /Income \$3\/s.*Upkeep -\$1\/s.*Net \$2\/s/);
  assert.match(f.text('economyStocks'), /food: 24\/200.*materials: 0\/160.*goods: 0\/120/);
  assert.match(f.text('economyResources'), /Legacy terrain \(no map seed\).*Resource seed 0.*Fertile plain.*food:/);
  assert.match(f.text('economyDemand'), /food 0.048.*materials 0.036.*goods 0.072/);
  assert(!research('planning').button.disabled); assert(research('agronomy').button.disabled);
  state.population = 11; f.ui.update(state); assert(research('planning').button.disabled, 'population invalidates cached offer');
  state.population = 60; state.buildings[0].hp = 0; f.ui.update(state); assert(research('planning').button.disabled, 'building health invalidates cached offer');
  state.buildings[0].hp = 80; f.ui.update(state); assert(!research('planning').button.disabled);
  assert.match(research('planning').detail.textContent, /\$300 \/ 12s.*upkeep \$0.02\/s.*12 residents/);
  assert.match(research('fabrication').detail.textContent, /\$800 \/ 32s.*Town planning.*locks manufacturing/);
  assert.match(policy('manufacturing').detail.textContent, /\$180.*Fabrication.*0.06\/0.24.*0.2\/s.*0.025/);
  assert(policy('balanced').button.disabled); assert(policy('agriculture').button.disabled);
  const count = created, planningButton = research('planning').button; planningButton.focus();
  for (let i = 0; i < 100; i++) f.ui.update(state);
  assert.equal(created, count); assert.equal(research('planning').button, planningButton); assert.equal(globalThis.focused, planningButton);
  f.click({ research: 'planning' }); assert.deepEqual(calls.at(-1), ['research', 'planning']);
  assert.equal(state.budget, 1700); assert.equal(state.development.active.remaining, 12);
  assert.match(f.text('researchStatus'), /Town planning: 12s remaining/); assert(research('planning').button.disabled);
  const frozen = JSON.stringify(state); for (let i = 0; i < 10; i++) f.ui.update(state); assert.equal(JSON.stringify(state), frozen, 'speed zero never advances research');
  const restored = JSON.parse(frozen); restored.development.active.remaining = 6.25; f.ui.update(restored);
  assert.match(f.text('researchStatus'), /7s remaining/, 'restored partial research uses saved remaining, not a UI clock');
  assert.equal(restored.development.active.remaining, 6.25); f.ui.update(state);
  f.click({ research: 'planning' }); assert.equal(calls.length, 1, 'delegated handler rechecks stale research offer');
  f.node('.city-economy').open = true; f.node('.city-economy').dispatchEvent(new Event('toggle'));
  assert(f.node('.city-tools').hidden, 'economy and tool sheets do not stack');
  f.click({ group: 'Zone' }); assert(!f.node('.city-economy').open, 'tools close economy sheet');
  state.development = { completed: ['planning', 'agronomy'], branch: 'agriculture', active: null };
  f.ui.update(state); assert(!policy('agriculture').button.disabled); assert(research('fabrication').button.disabled);
  assert.match(f.text('researchStatus'), /Branch: agriculture.*Town planning, Agronomy/);
  f.click({ specialization: 'agriculture' }); assert.equal(state.economy.specialization, 'agriculture'); assert.equal(state.budget, 1580);
  f.click({ specialization: 'agriculture' }); assert.equal(state.budget, 1580, 'no repeated switch callback/payment');
  state.budget = 0; f.ui.update(state); assert(research('logistics').button.disabled); assert(policy('balanced').button.disabled);
  state.budget = 2000; state.readOnly = true; f.ui.update(state);
  assert(research('logistics').button.disabled); assert(policy('balanced').button.disabled);
  const callsBefore = calls.length; f.click({ research: 'logistics' }); f.click({ specialization: 'balanced' }); f.click({ tool: 'upgrade' }); assert.equal(calls.length, callsBefore);
  state.readOnly = false; f.ui.update(state); f.click({ tool: 'upgrade' }); assert.deepEqual(calls.at(-1), ['tool', 'upgrade']);
  assert.match(f.node('.city-tools').innerHTML, /data-tool="upgrade"/); assert.match(f.node('.city-tools').innerHTML, /75% base \/ 12s.*150% \/ 24s.*40% upkeep.*30% utilities/);
  state.economy.breakdown = { taxIncome: 1, serviceIncome: 2, exportRevenue: 3, importCost: 4, upkeep: 5, netIncome: -3 };
  state.economy.bottlenecks = ['Workers', '<img src=x>']; f.ui.update(state);
  assert.match(f.text('netIncome'), /Net \$-3\/s/); assert.match(f.text('economyBudget'), /Tax \$1.*Services \$2.*Exports \$3.*Imports -\$4.*Upkeep -\$5.*Net \$-3/);
  assert.match(f.text('economyBottlenecks'), /Workers.*<img src=x>/, 'state text stays literal');
  for (const [type, expectedCost] of [['fire', 90], ['outage', 70], ['flood', 110]]) {
    state.incidents.ordinal++;
    const id = `incident-${state.incidents.ordinal - 1}`;
    state.incidents.active = [{ id, type, x: 2, z: 2, severity: 0.3, remaining: 24, total: 24, startTick: 0, buildingIds: [1], tiles: [{ x: 2, z: 2 }] }];
    state.budget = expectedCost - 1; f.ui.update(state);
    let response = f.controls('.city-incident-options')[0]; assert(response.button.disabled); assert.match(response.detail.textContent, new RegExp(`response \\$${expectedCost}`));
    assert.match(response.detail.textContent, /at \(2, 2\).*24s remaining/);
    state.budget = 2000; f.ui.update(state); response = f.controls('.city-incident-options')[0]; assert(!response.button.disabled);
    f.click({ incident: id }); assert.deepEqual(calls.at(-1), ['incident', id]); assert.equal(state.budget, 2000 - expectedCost, 'label equals actual module payment');
    assert.equal(state.incidents.active.length, 0); assert.equal(f.controls('.city-incident-options').length, 0); assert.equal(f.text('economyMessage'), 'Incident resolved');
  }
  state.phase = 'lost'; f.ui.update(state); assert(research('logistics').button.disabled); assert(policy('balanced').button.disabled);
  state.phase = 'day'; state.expansionEnabled = false; f.ui.update(state); assert(f.node('.city-economy').hidden); assert(f.node('[data-value="netIncome"]').hidden);
  assert(f.node('.city-new-options').hidden); const endCalls = calls.length; f.click({ research: 'logistics' }); f.click({ tool: 'upgrade' }); assert.equal(calls.length, endCalls);
  f.ui.destroy();
}
console.log('PASS real offers/callbacks, costs, stocks/net/breakdown, branches, stale/disabled/readOnly/lost, paused clocks, stable focused controls, incident prices/resolution');
{
  const f = mount(); f.ui.update({ buildings: [], population: 7, income: 0, upkeep: 0 });
  assert(f.node('.city-economy').hidden); assert.equal(f.text('population'), '7'); assert.equal(f.text('morale'), 'Not measured');
  f.ui.events([{ type: 'research-started', label: '<svg onload=bad>', cost: 300, total: 12 }, { type: 'incident-start', kind: 'fire', x: 4, z: 5 }]);
  assert.equal(f.node('.city-toasts').children.at(-1).textContent, 'fire at (4, 5). Open Economy / research to respond.');
  f.ui.events([{ type: 'city-event-start', event: { id: 'civic-1', type: 'water-main-burst', district: '1,2', title: 'Water main', description: 'Leak' } }]);
  const civic = f.node('.city-toasts').children.at(-1);
  assert.equal(civic.textContent, 'Water main (district 1,2): Leak'); assert.equal(civic.children.at(-1).dataset.cityEvent, 'civic-1', 'existing civic response preserved');
  f.ui.events([{ type: 'upgrade-complete', label: '<svg onload=bad>', id: 1, level: 1 }]);
  assert.match(f.node('.city-toasts').children.at(-1).textContent, /<svg onload=bad> #1: level 1 complete/);
  const css = readFileSync(new URL('./ui.css', import.meta.url), 'utf8');
  assert.match(css, /max-height: min\(30vh, 300px\).*overflow-y: auto/); assert.match(css, /min-height: 44px/); assert.match(css, /:focus-visible/);
  assert(!/https?:\/\/|gradient\(/.test(css + f.root.innerHTML));
  f.ui.destroy();
}
{
  const state = city(), f = mount({ onResearch() { return 'Research queued by parent'; } }); f.ui.update(state);
  assert(f.controls('.city-policy-options').every(c => c.button.disabled), 'missing callbacks are not fake actions');
  f.click({ research: 'planning' }); assert.equal(f.text('economyMessage'), 'Research queued by parent'); f.ui.destroy();
}
console.log('ECONOMY UI CHECK PASS: 4 groups; production UI DOM double only, no pixel/native/layout acceptance');
