import assert from 'node:assert/strict';
import { BUILDINGS } from './sim.mjs';
import * as api from './development.mjs';
const { TECHNOLOGIES, createDevelopment, researchOffer, startResearch, upgradeOffer, startUpgrade,
  advanceDevelopment, effectiveBuilding, researchUpkeep, validateDevelopment } = api;
const clone = value => JSON.parse(JSON.stringify(value));
const bytes = value => JSON.stringify(value);
let groups = 0, corruptions = 0;
function check(label, body) { body(); groups++; console.log(`PASS ${label}`); }
function town() {
  return { expansionEnabled: true, development: createDevelopment(), population: 100, budget: 10000, phase: 'day',
    buildings: ['residential', 'workshop', 'industrial', 'school', 'commercial', 'power', 'park'].map((type, i) => ({
      id: i + 1, type, hp: BUILDINGS[type].hp, maxHp: BUILDINGS[type].hp,
      constructionRemaining: 0, constructionTotal: 0, constructionPaidCost: BUILDINGS[type].cost
    })) };
}
function advance(state, seconds) {
  const notices = [];
  for (let i = 0; i < seconds * 4; i++) notices.push(...advanceDevelopment(state, 0.25, BUILDINGS));
  return notices;
}
function research(state, id) {
  const result = startResearch(state, id);
  assert.equal(result.ok, true, result.reason);
  const notices = advance(state, result.duration);
  assert.equal(notices.filter(n => n.type === 'research-complete' && n.id === id).length, 1);
  return result;
}
function rejected(action, state) {
  const before = bytes(state), result = action();
  assert.equal(result.ok, false);
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0);
  assert.equal(bytes(state), before, result.reason);
  return result;
}
function invalid(state, mutate) {
  const bad = clone(state); mutate(bad);
  const before = bytes(bad);
  assert.throws(() => validateDevelopment(bad, BUILDINGS), RangeError);
  assert.equal(bytes(bad), before);
  corruptions++;
}

check('exact API, fresh defaults, frozen technology metadata', () => {
  assert.deepEqual(Object.keys(api).sort(), ['TECHNOLOGIES', 'advanceDevelopment', 'createDevelopment', 'effectiveBuilding', 'researchOffer', 'researchUpkeep', 'startResearch', 'startUpgrade', 'upgradeOffer', 'validateDevelopment'].sort());
  const a = createDevelopment(), b = createDevelopment();
  assert.deepEqual(a, { completed: [], active: null, branch: null });
  a.completed.push('planning'); assert.deepEqual(b.completed, []);
  assert.equal(Object.keys(TECHNOLOGIES).length, 5);
  for (const t of Object.values(TECHNOLOGIES)) {
    assert.ok(t.cost > 0 && t.duration > 0 && t.upkeep > 0 && Number.isInteger(t.duration * 4));
    assert.ok(Object.isFrozen(t) && Object.isFrozen(t.prerequisites) && Object.isFrozen(t.buildings));
  }
  assert.equal(validateDevelopment(town(), BUILDINGS), true);
});
check('disabled legacy states do not pay, advance, upgrade or gain benefits', () => {
  const s = town(); delete s.development; delete s.expansionEnabled;
  assert.equal(validateDevelopment(s, BUILDINGS), true);
  rejected(() => startResearch(s, 'planning'), s);
  rejected(() => startUpgrade(s, s.buildings[0], BUILDINGS), s);
  assert.deepEqual(advanceDevelopment(s, 0.25, BUILDINGS), []);
  assert.equal(researchUpkeep(s), 0);
  assert.deepEqual(effectiveBuilding(BUILDINGS.residential, s.buildings[0], s), BUILDINGS.residential);
  s.expansionEnabled = true;
  assert.throws(() => validateDevelopment(s, BUILDINGS), RangeError);
});
check('research offers are pure; payment once; quarter clock; pause; exact completion', () => {
  const s = town(), before = bytes(s);
  assert.deepEqual(researchOffer(s, 'planning'), { ok: true, reason: '', cost: 300, duration: 12 });
  assert.equal(bytes(s), before);
  const result = startResearch(s, 'planning');
  assert.deepEqual(result.notice, { type: 'research-started', id: 'planning', label: 'Town planning', cost: 300, total: 12 });
  assert.equal(s.budget, 9700);
  rejected(() => startResearch(s, 'planning'), s);
  rejected(() => startResearch(s, 'logistics'), s);
  const paused = bytes(s);
  assert.deepEqual(advanceDevelopment(s, 0, BUILDINGS), []);
  // The parent pauses by not calling this module; no wall clock is read here.
  assert.equal(bytes(s), paused);
  advance(s, 0.25); assert.equal(s.development.active.remaining, 11.75);
  const notices = advance(s, 11.75);
  assert.deepEqual(notices, [{ ...result.notice, type: 'research-complete' }]);
  assert.deepEqual(s.development.completed, ['planning']); assert.equal(s.development.active, null);
  assert.equal(s.budget, 9700); assert.equal(researchUpkeep(s), 0.02);
  assert.deepEqual(advance(s, 30), []);
  rejected(() => startResearch(s, 'planning'), s);
});
check('population, complete living building, prerequisites, funds and lost-city rejection', () => {
  const s = town();
  rejected(() => startResearch(s, 'constructor'), s);
  rejected(() => startResearch(s, '__proto__'), s);
  rejected(() => startResearch(s, 'agronomy'), s);
  s.population = 11; rejected(() => startResearch(s, 'planning'), s);
  s.population = 12;
  s.buildings[0].constructionRemaining = 0.25; rejected(() => startResearch(s, 'planning'), s);
  s.buildings[0].constructionRemaining = 0; s.buildings[0].hp = 0;
  rejected(() => startResearch(s, 'planning'), s);
  s.buildings[0].hp = 100; s.budget = 299.99; rejected(() => startResearch(s, 'planning'), s);
  s.budget = -1; rejected(() => startResearch(s, 'planning'), s);
  s.budget = 300; s.phase = 'lost'; rejected(() => startResearch(s, 'planning'), s);
  s.phase = 'day'; assert.equal(startResearch(s, 'planning').ok, true); assert.equal(s.budget, 0);
});
check('branch locks at start and survives JSON restore; cross-branch choices remain available', () => {
  let s = town(); research(s, 'planning');
  const result = startResearch(s, 'agronomy'); assert.equal(result.ok, true);
  assert.equal(s.development.branch, 'agriculture');
  rejected(() => startResearch(s, 'fabrication'), s);
  s = clone(s); assert.equal(validateDevelopment(s, BUILDINGS), true);
  assert.equal(s.development.active.paidCost, 650);
  advance(s, 24); rejected(() => startResearch(s, 'fabrication'), s);
  research(s, 'logistics'); research(s, 'education');
  assert.equal(researchUpkeep(s), 0.2);
  assert.deepEqual(s.development.completed, ['planning', 'agronomy', 'logistics', 'education']);
  const manufacturing = town(); research(manufacturing, 'planning'); research(manufacturing, 'fabrication');
  rejected(() => startResearch(manufacturing, 'agronomy'), manufacturing);
  assert.equal(manufacturing.development.branch, 'manufacturing');
  assert.ok(researchUpkeep(manufacturing) > 0.069);
});
check('upgrades charge once, retain old outputs until complete, restore paid clocks and cap at level two', () => {
  let s = town(); research(s, 'planning');
  let b = s.buildings[0]; const initial = clone(b), price = Math.ceil(BUILDINGS.residential.cost * 0.75);
  const before = bytes(s), quote = upgradeOffer(s, b, BUILDINGS);
  assert.equal(bytes(s), before); assert.deepEqual(quote, { ok: true, reason: '', cost: price, duration: 12 });
  const result = startUpgrade(s, b, BUILDINGS);
  assert.deepEqual(result.notice, { type: 'upgrade-started', id: b.id, label: 'residential', buildingType: 'residential', level: 1, cost: 68, total: 12 });
  assert.equal(s.budget, 9700 - price); assert.equal(b.level, 0);
  rejected(() => startUpgrade(s, b, BUILDINGS), s);
  assert.equal(effectiveBuilding(BUILDINGS.residential, b, s).capacity, 64);
  advance(s, 3.25); assert.equal(b.upgradeRemaining, 8.75);
  const paused = bytes(s); advanceDevelopment(s, 0, BUILDINGS); assert.equal(bytes(s), paused);
  s = clone(s); b = s.buildings[0]; assert.equal(validateDevelopment(s, BUILDINGS), true);
  const budget = s.budget, notices = advance(s, 8.75);
  assert.deepEqual(notices, [{ ...result.notice, type: 'upgrade-complete' }]);
  assert.equal(b.level, 1); assert.equal(b.upgradeRemaining, 0); assert.equal(b.upgradeTotal, 12); assert.equal(b.upgradePaidCost, price);
  assert.equal(s.budget, budget); assert.equal(effectiveBuilding(BUILDINGS.residential, b, s).capacity, 80);
  for (const field of ['hp', 'maxHp', 'constructionRemaining', 'constructionTotal', 'constructionPaidCost']) assert.equal(b[field], initial[field]);
  rejected(() => startUpgrade(s, b, BUILDINGS), s);
  research(s, 'logistics'); assert.equal(startUpgrade(s, b, BUILDINGS).cost, 135);
  assert.equal(effectiveBuilding(BUILDINGS.residential, b, s).capacity, 80);
  advance(s, 24); assert.equal(b.level, 2); assert.equal(effectiveBuilding(BUILDINGS.residential, b, s).capacity, 96);
  rejected(() => startUpgrade(s, b, BUILDINGS), s);
  assert.deepEqual(advance(s, 48), []); assert.equal(b.level, 2);
});
check('upgrade rejection is atomic; destroyed pending building suspends without discarding payment', () => {
  const s = town(), b = s.buildings[0];
  rejected(() => startUpgrade(s, b, BUILDINGS), s);
  research(s, 'planning');
  rejected(() => startUpgrade(s, { ...b }, BUILDINGS), s);
  b.hp = 0; rejected(() => startUpgrade(s, b, BUILDINGS), s);
  b.hp = 100; b.constructionRemaining = 0.25; rejected(() => startUpgrade(s, b, BUILDINGS), s);
  b.constructionRemaining = 0; s.budget = 67.99; rejected(() => startUpgrade(s, b, BUILDINGS), s);
  s.budget = 100; s.phase = 'lost'; rejected(() => startUpgrade(s, b, BUILDINGS), s);
  s.phase = 'day';
  for (const type of ['townhall', 'wall', 'watchtower']) {
    const unsupported = { id: s.buildings.length + 1, type, hp: BUILDINGS[type].hp };
    s.buildings.push(unsupported); rejected(() => startUpgrade(s, unsupported, BUILDINGS), s);
  }
  assert.equal(startUpgrade(s, b, BUILDINGS).ok, true);
  b.hp = 0; const before = clone(b); assert.deepEqual(advance(s, 1), []); assert.deepEqual(b, before);
  assert.deepEqual(effectiveBuilding(BUILDINGS.residential, b, s), BUILDINGS.residential);
  b.hp = 100; advance(s, 12); assert.equal(b.level, 1);
});
check('all supported definitions gain bounded benefits with upkeep/demand costs, never HP or independent revenue', () => {
  const s = town(); research(s, 'planning'); research(s, 'fabrication'); research(s, 'logistics'); research(s, 'education');
  const types = ['residential', 'apartments', 'commercial', 'industrial', 'workshop', 'power', 'water', 'solar', 'river_pump', 'police', 'fire', 'clinic', 'school', 'park'];
  s.buildings = types.map((type, i) => ({ id: 100 + i, type, hp: BUILDINGS[type].hp }));
  const definitionsBefore = bytes(BUILDINGS);
  for (const b of s.buildings) {
    const def = BUILDINGS[b.type];
    assert.equal(startUpgrade(s, b, BUILDINGS).ok, true, b.type);
    advance(s, 12);
    assert.equal(startUpgrade(s, b, BUILDINGS).ok, true, b.type);
    advance(s, 24);
    const effective = effectiveBuilding(def, b, s);
    assert.equal(effective.hp, def.hp); assert.equal(effective.cost, def.cost); assert.equal(effective.income, def.income);
    assert.equal(effective.upkeep, def.upkeep * 1.8);
    assert.equal(effective.power, def.power * 1.6); assert.equal(effective.water, def.water * 1.6);
    assert.ok(['capacity', 'jobs', 'supply', 'serviceRadius'].some(key => effective[key] > def[key]), b.type);
    for (const value of Object.values(effective)) if (typeof value === 'number') assert.ok(Number.isFinite(value) && value >= 0);
    if (['industrial', 'workshop'].includes(b.type)) assert.equal(effective.productionMultiplier, 1.5);
    assert.equal(validateDevelopment(clone(s), BUILDINGS), true);
    // Replenish fixture funds only; module itself never credits any budget.
    s.budget = 10000;
  }
  assert.equal(bytes(BUILDINGS), definitionsBefore);
});
check('branch tradeoff: agriculture cannot tier-two industry; both branches can tier-two workshops', () => {
  for (const branch of ['agronomy', 'fabrication']) {
    const s = town(); research(s, 'planning'); research(s, branch);
    for (const b of s.buildings.filter(b => ['workshop', 'industrial'].includes(b.type))) {
      assert.equal(startUpgrade(s, b, BUILDINGS).ok, true); advance(s, 12);
      assert.equal(upgradeOffer(s, b, BUILDINGS).ok, b.type === 'workshop' || branch === 'fabrication');
    }
  }
});
check('strict untrusted research snapshots and immutable rejection', () => {
  const s = town(); research(s, 'planning'); startResearch(s, 'agronomy');
  for (const mutate of [
    s => { s.expansionEnabled = 1; }, s => { delete s.development; }, s => { s.development.extra = 1; },
    s => { s.development.completed = ['planning', 'planning']; }, s => { s.development.completed = ['logistics']; },
    s => { s.development.completed = ['planning', 'unknown']; }, s => { s.development.completed = ['planning', 'fabrication']; },
    s => { s.development.branch = null; }, s => { s.development.branch = 'manufacturing'; }, s => { s.development.branch = {}; },
    s => { s.development.active.id = 'planning'; }, s => { s.development.active.id = '__proto__'; },
    s => { s.development.active.remaining = 0; }, s => { s.development.active.remaining = 0.1; },
    s => { s.development.active.remaining = 25; }, s => { s.development.active.remaining = NaN; },
    s => { s.development.active.total = 25; }, s => { s.development.active.paidCost = 0; },
    s => { delete s.development.active.total; }, s => { s.budget = Infinity; }, s => { s.budget = 1e308; }, s => { s.population = -1; },
    s => { s.buildings[0].id = s.buildings[1].id; }, s => { s.buildings[0].hp = NaN; },
    s => { s.development.completed = Array(1); }, s => { s.development.completed.extra = 1; },
    s => { s.development.completed = Array(1); s.development.completed.extra = 'planning'; }
  ]) invalid(s, mutate);
  const locked = town(); research(locked, 'planning'); research(locked, 'agronomy');
  invalid(locked, s => { s.development.completed.push('fabrication'); });
  invalid(locked, s => { s.development.completed = ['planning']; });
  const noMutation = bytes(s);
  for (const dt of [-0.25, 0.1, 1, NaN, Infinity]) assert.throws(() => advanceDevelopment(s, dt, BUILDINGS), RangeError);
  assert.equal(bytes(s), noMutation);
});
check('strict level, payment, prerequisites and saved upgrade clock bounds', () => {
  const s = town(); research(s, 'planning'); startUpgrade(s, s.buildings[0], BUILDINGS);
  for (const mutate of [
    s => { s.buildings[0].level = -1; }, s => { s.buildings[0].level = 3; }, s => { s.buildings[0].level = 0.5; },
    s => { s.buildings[0].upgradeRemaining = 12.25; }, s => { s.buildings[0].upgradeRemaining = -0.25; },
    s => { s.buildings[0].upgradeRemaining = 0.1; }, s => { s.buildings[0].upgradeRemaining = Infinity; },
    s => { s.buildings[0].upgradeRemaining = 0; }, s => { s.buildings[0].upgradePaidCost = 0; },
    s => { s.buildings[0].upgradePaidCost = 69; }, s => { s.buildings[0].upgradeTotal = 24; },
    s => { delete s.buildings[0].upgradePaidCost; }, s => { s.buildings[0].type = 'wall'; },
    s => { s.development.completed = []; }, s => { s.buildings[0].constructionRemaining = 0.25; }
  ]) invalid(s, mutate);
  advance(s, 12);
  invalid(s, s => { s.buildings[0].upgradeTotal = 0; s.buildings[0].upgradePaidCost = 0; });
  invalid(s, s => { s.buildings[0].level = 2; s.buildings[0].upgradeTotal = 24; s.buildings[0].upgradePaidCost = 135; });
  const legacy = town(); delete legacy.development; legacy.expansionEnabled = false;
  invalid(legacy, s => { s.buildings[0].upgradeRemaining = 1; });
  const badDefinitions = { ...BUILDINGS, residential: { ...BUILDINGS.residential, cost: 0 } };
  const fresh = town(); research(fresh, 'planning');
  rejected(() => startUpgrade(fresh, fresh.buildings[0], badDefinitions), fresh);
  const badLabel = { ...BUILDINGS, residential: { ...BUILDINGS.residential, label: {} } };
  rejected(() => startUpgrade(fresh, fresh.buildings[0], badLabel), fresh);
  const pending = town(); research(pending, 'planning'); startUpgrade(pending, pending.buildings[0], BUILDINGS);
  assert.throws(() => validateDevelopment(pending, badDefinitions), RangeError);
});
check('actions reject malformed upgrade records before any research payment', () => {
  const s = town(); s.buildings[0].upgradeRemaining = 3;
  rejected(() => startResearch(s, 'planning'), s);
  delete s.buildings[0].upgradeRemaining; s.buildings[0].level = NaN;
  rejected(() => startResearch(s, 'planning'), s);
  delete s.buildings[0].level; s.budget = 1e308;
  rejected(() => startResearch(s, 'planning'), s);
});
check('deterministic concurrent research and upgrades across JSON restore, disable and loss', () => {
  let s = town(); research(s, 'planning');
  startResearch(s, 'logistics');
  startUpgrade(s, s.buildings[0], BUILDINGS); startUpgrade(s, s.buildings[1], BUILDINGS);
  advance(s, 2.25);
  const restored = clone(s), original = clone(s);
  for (let i = 0; i < 1000; i++) {
    assert.deepEqual(advanceDevelopment(s, 0.25, BUILDINGS), advanceDevelopment(restored, 0.25, BUILDINGS));
    assert.deepEqual(s, restored);
  }
  assert.equal(s.budget, original.budget);
  assert.equal(s.buildings[0].level, 1); assert.equal(s.buildings[1].level, 1);
  s = original; s.phase = 'lost';
  const lost = bytes(s); assert.deepEqual(advanceDevelopment(s, 0.25, BUILDINGS), []); assert.equal(bytes(s), lost);
  s.phase = 'day'; s.expansionEnabled = false;
  const disabled = bytes(s); assert.deepEqual(advanceDevelopment(s, 0.25, BUILDINGS), []); assert.equal(bytes(s), disabled);
  assert.equal(researchUpkeep(s), 0);
  s.expansionEnabled = true; advance(s, 20);
  assert.equal(s.buildings[0].level, 1); assert.ok(s.development.completed.includes('logistics'));
});
console.log(`DEVELOPMENT CHECK PASS: ${groups} groups, ${corruptions} rejected snapshot corruptions; no browser/native integration claimed`);
