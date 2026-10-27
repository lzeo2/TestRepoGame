import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setMaxListeners } from 'node:events';
import { homeMorale } from './morale.mjs';
import { createUI } from './ui.mjs';

const neutral = { value: 0.5, factors: [], growthMultiplier: 1 };
assert.deepEqual(homeMorale(), neutral);
assert.deepEqual(homeMorale({ safe: true, taxRate: 0.1, crime: 0 }), neutral);
assert(homeMorale({ amenity: true }).growthMultiplier > 1);
assert.equal(homeMorale({ festival: true }).value, 0.7, 'Existing civic festival retains its advertised +20 morale points');
for (const input of [{ safe: false }, { taxRate: 0.3 }, { crime: 1 }, { pollution: 1 }, { foodShortage: true }]) {
  const result = homeMorale(input);
  assert(result.value < 0.5 && result.growthMultiplier < 1);
  assert(result.factors.some(factor => factor.startsWith('- ')));
}
assert(homeMorale({ taxRate: 0 }).value > 0.5);
const inputs = [undefined, NaN, Infinity, -Infinity, -100, 0, 0.1, 0.5, 1, 100, true, false, 'bad', null];
let cases = 0;
for (const key of ['safe', 'taxRate', 'crime', 'amenity', 'festival', 'pollution', 'foodShortage']) for (const value of inputs) {
  const input = Object.freeze({ [key]: value }), result = homeMorale(input);
  assert.deepEqual(homeMorale(input), result, 'pure deterministic result');
  assert(Number.isFinite(result.value) && result.value >= 0 && result.value <= 1);
  assert(Number.isFinite(result.growthMultiplier) && result.growthMultiplier >= 0.75 && result.growthMultiplier <= 1.15);
  assert(result.factors.every(factor => typeof factor === 'string' && factor.length <= 24 && !/[\u2014\p{Extended_Pictographic}]/u.test(factor)));
  cases++;
}
for (let bits = 0; bits < 128; bits++) {
  const result = homeMorale({ safe: !(bits & 1), taxRate: bits & 2 ? 0.3 : 0,
    crime: (bits >> 2) & 1, amenity: (bits >> 3) & 1, festival: (bits >> 4) & 1,
    pollution: (bits >> 5) & 1, foodShortage: (bits >> 6) & 1 });
  assert(Number.isFinite(result.value) && result.value >= 0 && result.value <= 1);
  assert(Number.isFinite(result.growthMultiplier) && result.growthMultiplier >= 0.75 && result.growthMultiplier <= 1.15);
}
const worst = homeMorale({ safe: false, taxRate: 0.3, crime: 1, pollution: 1, foodShortage: 1 });
assert.equal(worst.value, 0); assert.equal(worst.growthMultiplier, 0.75);
const mixed = homeMorale({ amenity: 1, pollution: 1 });
assert(mixed.factors.some(f => f.startsWith('+ ')) && mixed.factors.some(f => f.startsWith('- ')));
console.log(`MORALE CHECK PASS: neutral baseline, directional behavior, lower bound, mixed factors, ${cases} finite/default cases + 128 condition combinations`);

// Execute the production UI against a DOM double. CSS assertions describe the
// layout contract only; they do not prove browser geometry or mobile hit targets.
setMaxListeners(0);
class Element extends EventTarget {
  dataset = {}; style = {}; textContent = ''; hidden = false; open = false;
  classes = new Set(); attributes = new Map();
  classList = { add: n => this.classes.add(n), remove: n => this.classes.delete(n),
    contains: n => this.classes.has(n), toggle: (n, on) => on ? this.classes.add(n) : this.classes.delete(n) };
  setAttribute(name, value) { this.attributes.set(name, value); }
  querySelectorAll() { return []; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  focus() {}
  closest() { return this; }
  replaceChildren() {}
  getContext() { return { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }; }
}
globalThis.localStorage = { getItem() { return '1'; }, setItem() {} };
globalThis.matchMedia = () => Object.assign(new EventTarget(), { matches: true });
const nodes = new Map(), root = new Element();
root.querySelector = selector => {
  if (!nodes.has(selector)) nodes.set(selector, new Element());
  return nodes.get(selector);
};
let selected;
const ui = createUI(root, { onTool(type) { selected = type; } });
const text = key => nodes.get(`[data-value="${key}"]`).textContent;
const building = (type, extra = {}) => ({ type, hp: 100, powered: true, watered: true, ...extra });
const state = Object.freeze({ population: 12.9, buildings: Object.freeze([
  building('residential'), building('apartments', { powered: false }),
  building('commercial'), building('industrial', { watered: false }),
  building('workshop'), building('clinic'), building('school'),
  building('apartments', { constructionRemaining: 5 }), building('residential', { hp: 0 })
]) });
ui.update(state);
assert.equal(text('population'), '12');
assert.equal(text('housingCapacity'), '224', 'completed housing, even if currently unsupplied');
assert.equal(text('jobs'), '152', 'only active powered and watered jobs, including service jobs');
assert.equal(text('morale'), 'Not measured', 'legacy UI must not invent a behavioral score');
ui.update({ ...state, housingCapacity: 500, jobs: 700, morale: 0.62, moraleFactors: mixed.factors });
assert.equal(text('housingCapacity'), '500'); assert.equal(text('jobs'), '700');
assert.equal(text('morale'), '62%'); assert.equal(text('moraleFactors'), mixed.factors.join(' · '));
ui.update({ ...state, housingCapacity: 0, jobs: 0, morale: 0.5, moraleFactors: [] });
assert.equal(text('housingCapacity'), '0'); assert.equal(text('jobs'), '0');
assert.equal(text('moraleFactors'), 'Basic needs met');
const button = new Element(); button.dataset.tool = 'rotate-wall';
const event = new Event('click'); Object.defineProperty(event, 'target', { value: button }); root.dispatchEvent(event);
assert.equal(selected, 'rotate-wall', 'Defense action routes through the existing callback');
assert.match(nodes.get('.city-tools').innerHTML, /data-tool="rotate-wall"[^>]*>Rotate wall/);
assert(!/data-tool="rotate-wall"[^>]*disabled/.test(nodes.get('.city-tools').innerHTML));
const header = root.innerHTML.split('<header')[1].split('</header>')[0];
for (const key of ['population', 'housingCapacity', 'jobs', 'morale', 'moraleFactors']) {
  const position = header.indexOf(`data-value="${key}"`);
  assert(position >= 0 && position < header.indexOf('<details'), `${key} stays outside details/menu`);
}
assert.match(header, /Residents/); assert.match(header, /Housing capacity/); assert.match(header, /Supplied jobs/);
const css = readFileSync(new URL('./ui.css', import.meta.url), 'utf8');
assert.match(css, /\.city-citizens \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /@media \(max-width: 600px\) \{\s*\.city-top \{ grid-template-columns: minmax\(0, 1fr\)/);
assert.match(css, /min-height: 44px/); assert.match(css, /:focus-visible/);
assert.match(css, /\.city-stat \{[^}]*min-width: 0/);
assert.match(css, /\.city-toolbar \{[^}]*min-width: 0/);
assert.match(css, /\.city-morale \{[^}]*grid-column: 1/);
assert(!/https?:\/\/|\bfetch\(|gradient\(/.test(css + root.innerHTML));
ui.destroy();
console.log('HUD CHECK PASS: production update/rotate callback, aggregate and legacy active capacity/jobs, persistent structure, responsive grid/44px/focus contracts; DOM double, visual HOLD');
