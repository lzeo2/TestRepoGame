import assert from 'node:assert/strict';
import { createEconomy, setSpecialization, productionTick, validateEconomy, SPECIALIZATIONS } from './production.mjs';

const definitions = {
  townhall: {}, residential: { capacity: 64 }, apartments: { capacity: 160 },
  industrial: { jobs: 96 }, workshop: { jobs: 64 }, school: { jobs: 40 }
};
const buildings = [
  { id: 1, type: 'townhall' },
  ...Array.from({ length: 4 }, (_, i) => ({ id: i + 2, type: 'residential', residents: 64 })),
  { id: 6, type: 'industrial' }, { id: 7, type: 'industrial' },
  { id: 8, type: 'workshop' }, { id: 9, type: 'school' }
];
const roads = new Set(buildings.map(b => b.id));
const clone = value => JSON.parse(JSON.stringify(value));
function city(seed = 17, scenario = 'balanced') {
  return { expansionEnabled: true, phase: 'day', population: 256, budget: 5000,
    development: { completed: ['planning', 'agronomy', 'fabrication', 'logistics'] },
    economy: createEconomy(seed, scenario), power: { unserved: 0 }, water: { unserved: 0 } };
}
let checks = 0;
function check(label, run) { run(); checks++; console.log(`PASS ${label}`); }
function tick(state, rows = buildings, network = roads) {
  const before = clone(state), stock = { ...state.economy.stocks };
  const result = productionTick(state, rows, definitions, network);
  const e = state.economy;
  const after = clone(state); delete before.economy; delete after.economy;
  assert.deepEqual(after, before, 'tick must mutate only economy');
  assert.deepEqual(result, e.last);
  for (const good of ['food', 'materials', 'goods']) {
    assert.ok(Math.abs(stock[good] + e.produced[good] + e.imported[good] - e.consumed[good] - e.exported[good] - e.stocks[good]) < 1e-8, `${good} conservation`);
    assert.ok(e.stocks[good] >= 0 && e.stocks[good] <= e.storage[good]);
    assert.ok(e.exportable[good] <= e.stocks[good] + 1e-9);
  }
  assert.ok(result.importCost <= Math.max(0, state.budget - result.industryUpkeep) + 1e-9);
  assert.equal(e.exported.food + e.exported.materials * 1.5 + e.exported.goods * 6, result.exportRevenue);
  assert.ok(Math.abs(e.imported.food * 1.4 + e.imported.materials * 2.2 - result.importCost) < 1e-9);
  assert.ok(Math.abs(e.consumed.materials - e.produced.goods) < 1e-9);
  validateEconomy(state);
  return result;
}
check('seed/scenario deterministic, bounded, varied, strict', () => {
  assert.deepEqual(createEconomy(17), createEconomy(17));
  assert.notDeepEqual(createEconomy(17).multipliers, createEconomy(18).multipliers);
  for (const seed of [0, 1, 17, 0xffffffff]) for (const scenario of ['balanced', 'fertile', 'mineral']) {
    const e = createEconomy(seed, scenario);
    assert.equal(e.specialization, 'balanced');
    for (const n of Object.values(e.multipliers)) assert.ok(n >= 0.765 && n <= 1.38);
    validateEconomy({ expansionEnabled: true, economy: e });
  }
  for (const seed of [-1, 0x100000000, NaN, Infinity, 1.5, '1']) assert.throws(() => createEconomy(seed), RangeError);
  assert.throws(() => createEconomy(1, 'unknown'), RangeError);
});
check('disabled/missing legacy and fallen city do not tick or switch', () => {
  validateEconomy({ expansionEnabled: false });
  assert.throws(() => validateEconomy({ expansionEnabled: true }), RangeError);
  for (const state of [{ expansionEnabled: false }, { ...city(), phase: 'lost' }]) {
    const before = clone(state);
    assert.deepEqual(productionTick(state), { exportRevenue: 0, importCost: 0, industryUpkeep: 0 });
    assert.equal(setSpecialization(state, 'manufacturing').ok, false);
    assert.deepEqual(state, before);
  }
});
check('research, funds, unknown and repeated policy switches are atomic', () => {
  const state = city();
  for (const setup of [() => { state.development.completed = []; }, () => { state.development.completed = ['agronomy']; state.budget = 119; }]) {
    setup(); const before = clone(state);
    assert.equal(setSpecialization(state, 'agriculture').ok, false); assert.deepEqual(state, before);
  }
  state.budget = 5000; state.development.completed = ['agronomy', 'fabrication'];
  const before = clone(state); assert.equal(setSpecialization(state, 'nonsense').ok, false); assert.deepEqual(state, before);
  const stocks = clone(state.economy.stocks);
  let costs = 0;
  for (const name of ['agriculture', 'agriculture', 'manufacturing', 'balanced', 'manufacturing', 'agriculture']) {
    const previous = state.economy.specialization, budget = state.budget;
    const result = setSpecialization(state, name);
    assert.equal(result.ok, true);
    assert.equal(result.cost, previous === name ? 0 : SPECIALIZATIONS[name].cost);
    costs += result.cost; assert.equal(state.budget, budget - result.cost);
    assert.deepEqual(state.economy.stocks, stocks);
  }
  assert.equal(state.economy.cumulative.policyCost, costs);
  assert.equal(state.budget, 5000 - costs);
});
check('strict saved ledger validation rejects corruptions with RangeError', () => {
  const corruptions = [
    s => { s.economy.stocks.food = -1; }, s => { s.economy.stocks.goods = NaN; },
    s => { s.economy.stocks.materials = 161; }, s => { s.economy.exportable.food = 25; },
    s => { s.economy.demand.goods = Infinity; }, s => { s.economy.seed = -1; },
    s => { s.economy.scenario = 'other'; }, s => { s.economy.specialization = 'other'; },
    s => { s.economy.specialization = 'agriculture'; s.development.completed = []; },
    s => { s.economy.multipliers.food = 500; }, s => { s.economy.opportunities = []; },
    s => { s.economy.pollution = 1.1; }, s => { s.economy.foodShortage = -1; },
    s => { s.economy.cumulative.importCost = Infinity; }, s => { s.economy.ticks = 1.5; },
    s => { s.development.completed = ['fake']; }, s => { s.development.completed = ['planning', 'planning']; }
  ];
  for (const corrupt of corruptions) { const state = city(); corrupt(state); assert.throws(() => validateEconomy(state), RangeError); }
  const state = city(), before = clone(state);
  assert.throws(() => productionTick(state, [...buildings, buildings[0]], definitions, roads), RangeError);
  assert.deepEqual(state, before);
});
check('zero population never produces, imports or sells the initial reserve', () => {
  const state = city(); state.population = 0;
  for (let i = 0; i < 30; i++) {
    const result = tick(state);
    assert.equal(result.exportRevenue, 0); assert.equal(result.importCost, 0);
    assert.deepEqual(state.economy.produced, { food: 0, materials: 0, goods: 0 });
  }
  assert.equal(state.economy.stocks.food, 24);
  assert.equal(state.economy.exportable.food, 0);
});
check('no inputs/no supply/disconnected roads expose real shortages', () => {
  const state = city(); state.budget = 0; state.economy.stocks.food = 0;
  tick(state, buildings.filter(b => b.type !== 'industrial'));
  assert.equal(state.economy.produced.goods, 0); assert.equal(state.economy.foodShortage, 1);
  assert.ok(state.economy.bottlenecks.includes('Import budget'));
  for (const network of [new Set(), new Set([6, 7, 8]), new Set([1, 2, 3, 4, 5])]) {
    const s = city(); const result = tick(s, buildings, network);
    assert.equal(result.exportRevenue, 0);
    assert.deepEqual(s.economy.produced, { food: 0, materials: 0, goods: 0 });
    assert.ok(s.economy.bottlenecks.includes('Road to town hall'));
    if (!network.has(1)) assert.equal(result.importCost, 0);
  }
  const noSupply = city(); noSupply.power.unserved = 4;
  tick(noSupply, buildings.filter(b => !['industrial', 'workshop'].includes(b.type)));
  assert.equal(noSupply.economy.produced.goods, 0);
  assert.ok(noSupply.economy.bottlenecks.includes('Utilities'));
});
check('negative/limited budget caps imports; household need has priority', () => {
  for (const budget of [-500, 0, 0.05, 0.5]) {
    const state = city(); state.budget = budget; state.economy.stocks.food = 0;
    const result = tick(state, buildings.filter(b => b.type !== 'industrial'));
    assert.ok(result.importCost <= Math.max(0, budget - result.industryUpkeep) + 1e-9);
    if (budget <= 0.05) assert.ok(state.economy.foodShortage > 0);
  }
});
check('storage and per-second demand caps hold, including logistics', () => {
  const state = city();
  Object.assign(state.economy.stocks, state.economy.storage);
  Object.assign(state.economy.exportable, state.economy.storage);
  const result = tick(state);
  assert.ok(state.economy.bottlenecks.includes('Storage'));
  assert.ok(state.economy.bottlenecks.includes('Export demand'));
  assert.ok(result.exportRevenue <= 1.1125 + 1e-9);
  for (const good of ['food', 'materials', 'goods']) assert.ok(state.economy.exported[good] <= state.economy.demand[good] * 1.25 + 1e-9);
  const gift = city(); tick(gift, buildings.filter(b => !['industrial', 'workshop'].includes(b.type)));
  assert.equal(gift.economy.exported.food, 0);
});
check('advanced finishing needs supplied education, not decorative research', () => {
  const state = city(); state.development.completed.push('education');
  tick(state, buildings.filter(b => b.type !== 'school'));
  assert.equal(state.economy.produced.goods, 0);
  assert.ok(state.economy.bottlenecks.includes('Education'));
  tick(state); assert.ok(state.economy.produced.goods > 0);
});
check('JSON replay is exact; effective type jobs and bounded levels affect output', () => {
  const a = city(); for (let i = 0; i < 50; i++) tick(a);
  const b = clone(a);
  for (let i = 0; i < 150; i++) assert.deepEqual(tick(a), tick(b));
  assert.deepEqual(a, b);
  const base = city(), upgraded = city();
  tick(base); tick(upgraded, buildings.map(b => b.type === 'industrial' ? { ...b, level: 2 } : b));
  assert.ok(upgraded.economy.produced.materials > base.economy.produced.materials);
  const explicitZero = city(); tick(explicitZero, buildings.map(b => ({ ...b, level: 0 })));
  assert.deepEqual(explicitZero, base);
  assert.throws(() => productionTick(city(), buildings.map(b => ({ ...b, level: 3 })), definitions, roads), RangeError);
});
check('worker availability limits production and disconnected homes cannot collect food', () => {
  const scarce = city(), staffed = city(); scarce.population = 16;
  tick(scarce); tick(staffed);
  assert.ok(scarce.economy.produced.food < staffed.economy.produced.food);
  assert.ok(scarce.economy.produced.goods < staffed.economy.produced.goods);
  assert.ok(scarce.economy.bottlenecks.includes('Workers'));
  const isolated = city(); tick(isolated, buildings, new Set([1, 6, 7, 8, 9]));
  assert.equal(isolated.economy.foodShortage, 1);
});
check('workshop-only industry pays for real imported inputs, and partial roads cannot sell', () => {
  const importer = city(); importer.economy.stocks.food = 0;
  const rows = buildings.filter(b => b.type !== 'industrial');
  tick(importer, rows);
  assert.ok(importer.economy.imported.materials > 0);
  assert.ok(importer.economy.imported.food > 0);
  assert.ok(importer.economy.produced.goods > 0);
  const island = city(); tick(island, buildings, new Set([1, 2, 3, 4, 5, 9]));
  assert.equal(island.economy.exported.goods, 0);
});
check('unfunded 3600-second runs retain shortage evidence rather than inventing imports', () => {
  for (const name of Object.keys(SPECIALIZATIONS)) {
    const state = city(); setSpecialization(state, name); state.budget = -1;
    const rows = buildings.filter(b => b.type !== 'industrial');
    let shortage = 0;
    for (let i = 0; i < 3600; i++) {
      const f = tick(state, rows);
      assert.equal(f.importCost, 0); assert.equal(f.exportRevenue, 0);
      shortage += state.economy.foodShortage;
    }
    assert.ok(shortage > 3000); assert.equal(state.economy.stocks.food, 0);
  }
});
const summaries = [];
check('3600-tick strategy conservation, finite metrics and bounded cumulative accounting', () => {
  for (const scenario of ['balanced', 'fertile', 'mineral']) for (const specialization of Object.keys(SPECIALIZATIONS)) {
    const state = city(17, scenario);
    state.development.completed = ['planning', 'logistics', ...(specialization === 'agriculture' ? ['agronomy'] : specialization === 'manufacturing' ? ['fabrication'] : [])];
    setSpecialization(state, specialization);
    let exports = 0, imports = 0, upkeep = 0, pollution = 0, shortage = 0;
    for (let i = 0; i < 3600; i++) {
      const f = tick(state);
      exports += f.exportRevenue; imports += f.importCost; upkeep += f.industryUpkeep;
      pollution += state.economy.pollution; shortage += state.economy.foodShortage;
      state.budget += f.exportRevenue - f.importCost - f.industryUpkeep;
    }
    assert.deepEqual(state.economy.cumulative, { exportRevenue: exports, importCost: imports, industryUpkeep: upkeep, policyCost: specialization === 'balanced' ? 0 : SPECIALIZATIONS[specialization].cost });
    assert.ok(shortage < 1e-6, 'funded connected fixture must feed residents');
    summaries.push({ scenario, specialization, exports: +exports.toFixed(2), imports: +imports.toFixed(2), upkeep: +upkeep.toFixed(2), net: +(exports - imports - upkeep).toFixed(2), pollution: +(pollution / 3600).toFixed(3), shortage: +(shortage / 3600).toFixed(3) });
  }
  const mixed = summaries.filter(row => row.scenario === 'balanced');
  assert.ok(mixed.find(row => row.specialization === 'balanced').net > 0);
  assert.ok(mixed.find(row => row.specialization === 'manufacturing').net > mixed.find(row => row.specialization === 'agriculture').net);
  assert.ok(mixed.find(row => row.specialization === 'manufacturing').pollution > mixed.find(row => row.specialization === 'agriculture').pollution);
  assert.ok(mixed.find(row => row.specialization === 'manufacturing').imports > mixed.find(row => row.specialization === 'agriculture').imports);
  assert.ok(mixed.find(row => row.specialization === 'manufacturing').upkeep > mixed.find(row => row.specialization === 'agriculture').upkeep);
});
console.table(summaries);
console.log(`PRODUCTION CHECK PASS (${checks} groups, 9 strategies x 3600 ticks)`);
