// Fixed simulation-second goods ledger. The caller owns roads, taxes and payment.
export const SPECIALIZATIONS = Object.freeze({
  balanced: Object.freeze({ label: 'Balanced', research: null, cost: 80, food: 0.18, materials: 0.09, goods: 0.08, upkeep: 0.008, pollution: 1 }),
  agriculture: Object.freeze({ label: 'Agriculture', research: 'agronomy', cost: 120, food: 0.36, materials: 0.02, goods: 0.025, upkeep: 0.005, pollution: 0.3 }),
  manufacturing: Object.freeze({ label: 'Manufacturing', research: 'fabrication', cost: 180, food: 0.06, materials: 0.24, goods: 0.2, upkeep: 0.025, pollution: 3 })
});
export const SCENARIOS = Object.freeze({
  balanced: Object.freeze({ label: 'Mixed land', food: 1, materials: 1 }),
  fertile: Object.freeze({ label: 'Fertile plain', food: 1.2, materials: 0.9 }),
  mineral: Object.freeze({ label: 'Mineral ridge', food: 0.9, materials: 1.2 })
});
const GOODS = ['food', 'materials', 'goods'];
const CAPS = { food: 200, materials: 160, goods: 120 };
const SELL = { food: 1, materials: 1.5, goods: 6 };
const BUY = { food: 1.4, materials: 2.2 };
const DEMAND = { food: 0.08, materials: 0.06, goods: 0.12 };
const RESEARCH = ['planning', 'agronomy', 'fabrication', 'logistics', 'education'];
const MAX = 1e12;
const zeroGoods = () => ({ food: 0, materials: 0, goods: 0 });
const flows = () => ({ exportRevenue: 0, importCost: 0, industryUpkeep: 0 });
const bounded = (n, max = MAX) => Number.isFinite(n) && n >= 0 && n <= max;
const has = (object, key) => typeof key === 'string' && Object.hasOwn(object, key);
function fail(message) { throw new RangeError(`Invalid economy: ${message}`); }
function seeded(seed, scenario) {
  let value = seed;
  const sample = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return 0.85 + value / 4294967296 * 0.3; };
  const multipliers = { food: sample() * SCENARIOS[scenario].food, materials: sample() * SCENARIOS[scenario].materials };
  const opportunities = Object.entries(multipliers).map(([good, multiplier]) => `${good}: ${multiplier > 1.08 ? 'rich' : multiplier < 0.95 ? 'scarce' : 'steady'}`);
  return { multipliers, opportunities };
}
function completed(state) {
  const ids = state.development?.completed ?? [];
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => !RESEARCH.includes(id))) fail('research');
  return ids;
}
export function createEconomy(seed, scenario = 'balanced') {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff || !has(SCENARIOS, scenario)) fail('seed/scenario');
  return {
    seed, scenario, specialization: 'balanced', ...seeded(seed, scenario),
    stocks: { food: 24, materials: 0, goods: 0 }, exportable: zeroGoods(),
    demand: { ...DEMAND }, storage: { ...CAPS }, ticks: 0,
    pollution: 0, foodShortage: 0, bottlenecks: [],
    produced: zeroGoods(), consumed: zeroGoods(), imported: zeroGoods(), exported: zeroGoods(),
    workforce: 0, workerRatio: 0, educationCapacity: 0,
    last: flows(), cumulative: { ...flows(), policyCost: 0 }
  };
}
export function validateEconomy(state) {
  if (!state.economy && state.expansionEnabled !== true) return true;
  const e = state.economy;
  if (!e || typeof e !== 'object' || Array.isArray(e)) fail('missing ledger');
  if (!Number.isInteger(e.seed) || e.seed < 0 || e.seed > 0xffffffff || !has(SCENARIOS, e.scenario) || !has(SPECIALIZATIONS, e.specialization)) fail('identity');
  const ids = completed(state), policy = SPECIALIZATIONS[e.specialization];
  if (policy.research && !ids.includes(policy.research)) fail('specialization research');
  const expected = seeded(e.seed, e.scenario);
  for (const key of ['food', 'materials']) if (e.multipliers?.[key] !== expected.multipliers[key]) fail('resource multiplier');
  if (!Array.isArray(e.opportunities) || JSON.stringify(e.opportunities) !== JSON.stringify(expected.opportunities)) fail('opportunities');
  for (const good of GOODS) {
    if (e.storage?.[good] !== CAPS[good] || e.demand?.[good] !== DEMAND[good]) fail('storage/demand');
    if (!bounded(e.stocks?.[good], CAPS[good]) || !bounded(e.exportable?.[good], e.stocks[good])) fail('stocks');
    for (const field of ['produced', 'consumed', 'imported', 'exported']) if (!bounded(e[field]?.[good], 1e7)) fail(field);
  }
  if (!Number.isSafeInteger(e.ticks) || !bounded(e.ticks, 1e9)) fail('ticks');
  for (const key of ['pollution', 'foodShortage', 'workerRatio']) if (!bounded(e[key], 1)) fail(key);
  for (const key of ['workforce', 'educationCapacity']) if (!bounded(e[key], 1e7)) fail(key);
  if (!Array.isArray(e.bottlenecks) || e.bottlenecks.length > 12 || e.bottlenecks.some(s => typeof s !== 'string' || s.length > 80)) fail('bottlenecks');
  for (const field of ['last', 'cumulative']) for (const key of Object.keys(flows())) if (!bounded(e[field]?.[key])) fail(field);
  if (!bounded(e.cumulative.policyCost)) fail('policy cost');
  return true;
}
export function setSpecialization(state, name) {
  const reject = reason => ({ ok: false, reason, cost: 0 });
  if (state.expansionEnabled !== true) return reject('Expansion disabled');
  if (state.phase === 'lost') return reject('City has fallen');
  if (!has(SPECIALIZATIONS, name)) return reject('Unknown specialization');
  validateEconomy(state);
  const policy = SPECIALIZATIONS[name];
  if (policy.research && !completed(state).includes(policy.research)) return reject(`Requires ${policy.research}`);
  if (state.economy.specialization === name) return { ok: true, reason: 'Already selected', cost: 0 };
  if (!bounded(state.budget) || state.budget < policy.cost) return reject('Insufficient budget');
  if (state.economy.cumulative.policyCost + policy.cost > MAX) return reject('Policy ledger full');
  state.budget -= policy.cost;
  state.economy.specialization = name;
  state.economy.cumulative.policyCost += policy.cost;
  return { ok: true, reason: `Selected ${policy.label}`, cost: policy.cost };
}

export function productionTick(state, activeBuildings, definitions, marketIds) {
  if (state.expansionEnabled !== true || state.phase === 'lost') return flows();
  validateEconomy(state);
  if (!bounded(state.population, 1e7) || !Number.isFinite(state.budget) || Math.abs(state.budget) > MAX || !Array.isArray(activeBuildings) || !(marketIds instanceof Set)) fail('tick inputs');
  // Validate before changing the ledger. Effective definitions use the same type keys.
  const ids = new Set();
  const rows = activeBuildings.map(b => {
    const def = definitions?.[b.type];
    if (!def || ids.has(b.id) || !bounded(def.jobs ?? 0, 1e5) || !bounded(b.level ?? 0, 2) || !Number.isInteger(b.level ?? 0)) fail('building profile');
    ids.add(b.id);
    const level = b.level ?? 0;
    const productionFactor = b.productionFactor ?? 1;
    if (!bounded(productionFactor, 1)) fail('incident production factor');
    return { b, def, scale: 1 + level * 0.25, productionFactor };
  });
  const e = state.economy, policy = SPECIALIZATIONS[e.specialization], research = completed(state);
  const result = flows();
  const produced = zeroGoods(), consumed = zeroGoods(), imported = zeroGoods(), exported = zeroGoods();
  const bottlenecks = new Set();
  const market = rows.some(({ b }) => b.type === 'townhall' && marketIds.has(b.id));
  const connected = ({ b }) => market && marketIds.has(b.id);
  const industries = rows.filter(({ b }) => b.type === 'industrial');
  const workshops = rows.filter(({ b }) => b.type === 'workshop');
  const jobs = rows.reduce((n, row) => n + (row.def.jobs ?? 0) * row.scale, 0);
  const workforce = state.population * 0.55;
  const workerRatio = jobs > 0 ? Math.min(1, workforce / jobs) : 0;
  const industryScale = industries.filter(connected).reduce((n, row) => n + row.scale * row.productionFactor, 0) * workerRatio;
  const workshopScale = workshops.filter(connected).reduce((n, row) => n + row.scale * row.productionFactor, 0) * workerRatio;
  result.industryUpkeep = industries.reduce((n, row) => n + row.scale * policy.upkeep, 0) + workshops.reduce((n, row) => n + row.scale * policy.upkeep * 1.5, 0);
  let cash = Math.max(0, state.budget - result.industryUpkeep);
  if (workerRatio < 1 && industries.length + workshops.length) bottlenecks.add('Workers');
  if (industries.concat(workshops).some(row => !connected(row))) bottlenecks.add('Road to town hall');
  if (state.power?.unserved > 0 || state.water?.unserved > 0) bottlenecks.add('Utilities');
  function consume(good, requested) {
    const amount = Math.min(e.stocks[good], Math.max(0, requested));
    const uncredited = e.stocks[good] - e.exportable[good];
    e.exportable[good] = Math.max(0, e.exportable[good] - Math.max(0, amount - uncredited));
    e.stocks[good] = Math.max(0, e.stocks[good] - amount);
    // Roundoff in the two debit paths must not leave sale credit on empty stock.
    e.exportable[good] = Math.min(e.stocks[good], e.exportable[good]);
    consumed[good] += amount;
    return amount;
  }
  function produce(good, requested) {
    const amount = Math.min(CAPS[good] - e.stocks[good], requested);
    e.stocks[good] += amount; e.exportable[good] += amount; produced[good] += amount;
    if (amount + 1e-9 < requested) bottlenecks.add('Storage');
  }
  function buy(good, requested, limit) {
    if (!market || state.population === 0) return;
    const amount = Math.max(0, Math.min(requested, limit, cash / BUY[good], CAPS[good] - e.stocks[good]));
    e.stocks[good] += amount; imported[good] += amount;
    const cost = amount * BUY[good]; cash = Math.max(0, cash - cost); result.importCost += cost;
    if (amount + 1e-9 < requested) bottlenecks.add(cash < 1e-9 ? 'Import budget' : 'Import capacity');
  }
  produce('food', industryScale * policy.food * e.multipliers.food);
  produce('materials', industryScale * policy.materials * e.multipliers.materials);
  const foodNeed = state.population * 0.0008;
  // Only supplied, hall-connected homes can collect food from the central depot.
  const reachableResidents = rows.filter(row => connected(row) && row.def.capacity > 0).reduce((n, { b }) => n + (bounded(b.residents, 1e7) ? b.residents : 0), 0);
  const servedNeed = Math.min(state.population, reachableResidents) * 0.0008;
  const advanced = research.includes('education') && research.includes('fabrication');
  const educationCapacity = rows.filter(row => connected(row) && row.b.type === 'school').reduce((n, row) => n + 0.1 * row.scale, 0);
  let desiredGoods = workshopScale * policy.goods * (advanced ? 1.2 : 1);
  if (advanced && desiredGoods > educationCapacity) { desiredGoods = educationCapacity; bottlenecks.add('Education'); }
  desiredGoods = Math.min(desiredGoods, CAPS.goods - e.stocks.goods);
  buy('food', Math.max(0, servedNeed + desiredGoods * 0.3 - e.stocks.food), 0.3);
  const eaten = consume('food', servedNeed);
  const foodShortage = foodNeed > 0 ? Math.max(0, Math.min(1, 1 - eaten / foodNeed)) : 0;
  buy('materials', Math.max(0, desiredGoods - e.stocks.materials), 0.12);
  const goods = Math.min(desiredGoods, e.stocks.materials, e.stocks.food / 0.3);
  if (goods + 1e-9 < desiredGoods) bottlenecks.add(e.stocks.materials < desiredGoods ? 'Materials' : 'Food inputs');
  consume('materials', goods); consume('food', goods * 0.3); produce('goods', goods);
  if (foodShortage > 1e-9) bottlenecks.add('Food shortage');
  const demandMultiplier = research.includes('logistics') ? 1.25 : 1;
  for (const good of GOODS) {
    const reserve = good === 'food' ? foodNeed * 2 + desiredGoods * 0.3 : good === 'materials' ? desiredGoods : 0;
    const amount = market ? Math.max(0, Math.min(e.exportable[good], e.stocks[good] - reserve, e.demand[good] * demandMultiplier * Math.min(1, state.population / 100))) : 0;
    e.stocks[good] = Math.max(0, e.stocks[good] - amount); e.exportable[good] = Math.max(0, e.exportable[good] - amount);
    exported[good] = amount; result.exportRevenue += amount * SELL[good];
    if (e.exportable[good] > 1e-9 && amount + 1e-9 >= e.demand[good] * demandMultiplier && market) bottlenecks.add('Export demand');
  }
  const pollution = Math.min(1, (produced.materials + produced.goods) * policy.pollution * 4 / (1 + state.population * 0.002));
  e.ticks = Math.min(1e9, e.ticks + 1);
  Object.assign(e, { produced, consumed, imported, exported, workforce, workerRatio, educationCapacity, pollution, foodShortage, bottlenecks: [...bottlenecks], last: { ...result } });
  for (const key of Object.keys(result)) e.cumulative[key] = Math.min(MAX, e.cumulative[key] + result[key]);
  return result;
}
