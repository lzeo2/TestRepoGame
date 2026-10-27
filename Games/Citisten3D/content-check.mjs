import assert from 'node:assert/strict';
import { createSimulation, BUILDINGS } from './sim.mjs';
import { NEW_BUILDINGS, BUILD_TIMES, isBuildingActive } from './city-content.mjs';
import { createRiverTerrain } from './river-data.mjs';
import { footprintLots } from './footprints.mjs';

function build(sim, type, x, z) {
  const result = sim.place(type, x, z);
  assert(result.ok, `${type} ${x},${z}: ${result.reason}`);
  return result.building;
}
function advance(sim, seconds) {
  for (let i = 0; i < seconds * 4; i++) { sim.update(.25); sim.drainEvents(); }
}
function town(service = 'park', homeType = 'residential') {
  const sim = createSimulation({ size: 64 });
  sim.roads.place({ x: 1, z: 4 }, { x: 26, z: 4 });
  build(sim, 'solar', 1, 3); build(sim, 'water', 2, 3);
  const home = build(sim, homeType, 4, 3);
  const civic = service && build(sim, service, 6, 3);
  return { sim, home, civic };
}
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
assert.equal(Object.keys(NEW_BUILDINGS).length, 6);
for (const [type, def] of Object.entries(NEW_BUILDINGS)) {
  assert(def.label && Number.isInteger(def.unlockStage) && def.unlockStage >= 0 && def.unlockStage <= 3);
  assert(BUILD_TIMES[type] >= 10 && BUILD_TIMES[type] <= 20);
  assert.equal(footprintLots({ type, x: 5, z: 5 }).length, 1);
}
for (const type of Object.keys(BUILDINGS)) assert(Object.hasOwn(BUILD_TIMES, type), `${type} has a build time`);
assert(isBuildingActive({ hp: 1 }));
assert(!isBuildingActive({ hp: 1, constructionRemaining: .25 }));
assert(!isBuildingActive({ hp: 0 }));

// A naturally occupied apartment continues beyond the old 64-person ceiling.
const dense = town('clinic', 'apartments');
const workshop = build(dense.sim, 'workshop', 8, 3);
build(dense.sim, 'school', 10, 3);
advance(dense.sim, 200);
assert.equal(dense.home.residents, NEW_BUILDINGS.apartments.capacity);
assert.equal(dense.sim.state.population, 160);
assert.match(dense.sim.state.growthDiagnosis, /Homes are full/);
assert(dense.home.serviced && dense.home.powered && dense.home.watered);
// At 200s the normal festival boosts the home's district, not the workshop's.
near(dense.sim.state.income, 160 * .0015 * 1.25 + NEW_BUILDINGS.workshop.income);
near(dense.sim.state.netIncome, dense.sim.state.income - dense.sim.state.upkeep);
const single = town(); advance(single.sim, 100);
assert.equal(single.home.residents, 64, 'original housing capacity remains unchanged');

// The workshop adds both jobs-driven demand and earned local income, not decoration.
const employment = town(), baseDemand = .55;
const shop = build(employment.sim, 'workshop', 8, 3);
employment.sim.update(1);
near(employment.sim.state.demand.residential, baseDemand + NEW_BUILDINGS.workshop.jobs / 1500);
near(employment.sim.state.income, employment.home.residents * .0015 + NEW_BUILDINGS.workshop.income);
assert(NEW_BUILDINGS.workshop.income > NEW_BUILDINGS.workshop.upkeep, 'workshop earns more than its own operating cost');
employment.sim.bulldoze(shop.x, shop.z);
const previousPopulation = employment.sim.state.population;
employment.sim.update(1);
near(employment.sim.state.demand.residential, baseDemand - previousPopulation * .65 / 1500);

// Clinic and school have different reach, staffing and growth bonuses.
for (const type of ['clinic', 'school']) {
  const served = town(type); served.sim.update(1);
  const jobs = NEW_BUILDINGS[type].jobs;
  near(served.home.residents, 2.7 * (.55 + jobs / 1500) * (1 + NEW_BUILDINGS[type].serviceGrowth) * 1.036); // Supplied amenity morale .62 gives a bounded 3.6% growth effect.
  assert(served.civic.powered && served.civic.watered);
  const beforeCut = served.home.residents;
  served.sim.roads.set(5, 4, false); advance(served.sim, 1);
  assert(!served.civic.powered && !served.civic.watered && !served.home.serviced);
  near(served.home.residents, beforeCut - .26); // Unsafe morale .2 increases the minimum abandonment by 30%.
}
const duplicated = town('clinic'); build(duplicated.sim, 'clinic', 8, 3); duplicated.sim.update(1);
near(duplicated.home.residents, 2.7 * (.55 + NEW_BUILDINGS.clinic.jobs * 2 / 1500) * 1.3 * 1.036); // Duplicate amenities still do not stack morale.
for (const [type, expected] of [['clinic', false], ['school', true]]) {
  const distant = town(null);
  build(distant.sim, type, 22, 3); distant.sim.update(1);
  assert.equal(distant.home.serviced, expected, `${type} at 18 lots`);
  assert.equal(distant.home.residents > 0, expected);
}

// Solar capacity participates in road-network shedding and cannot teleport across a cut.
const solarTown = town(); solarTown.sim.update(1);
assert.equal(solarTown.sim.state.power.supply, 28);
assert(solarTown.home.powered);
solarTown.sim.roads.set(3, 4, false); solarTown.sim.update(1);
assert(!solarTown.home.powered);
solarTown.sim.roads.set(3, 4); solarTown.sim.update(1);
assert(solarTown.home.powered);

// The shared terrain is the only authority for riverbank legality.
const river = createRiverTerrain(64, 'river-v1');
const pumping = createSimulation({ size: 64, terrainLayout: river.layout });
const banks = [], wet = [], inland = [];
for (let z = 0; z < 64; z++) for (let x = 0; x < 64; x++) {
  if (pumping.buildingAt(x, z)) continue;
  (river.isWater(x, z) ? wet : river.isBank(x, z) ? banks : inland).push({ x, z });
}
assert(banks.length && wet.length && inland.length);
const dryInterior = inland.find(p => ![{ x: p.x + 1, z: p.z }, { x: p.x - 1, z: p.z }, { x: p.x, z: p.z + 1 }, { x: p.x, z: p.z - 1 }].some(q => river.isWater(q.x, q.z)));
for (const p of [wet[0], dryInterior]) {
  const budget = pumping.state.budget;
  assert(!pumping.place('river_pump', p.x, p.z).ok);
  assert.equal(pumping.state.budget, budget, 'illegal pump never charges');
}
assert(!pumping.place('park', wet[0].x, wet[0].z).ok);
const bank = banks.find(p => [{ x: p.x + 1, z: p.z }, { x: p.x - 1, z: p.z }, { x: p.x, z: p.z + 1 }, { x: p.x, z: p.z - 1 }]
  .some(q => pumping.roads.valid(q.x, q.z) && !river.isWater(q.x, q.z) && !pumping.buildingAt(q.x, q.z)));
const pump = build(pumping, 'river_pump', bank.x, bank.z);
pumping.update(1); assert.equal(pumping.state.water.supply, NEW_BUILDINGS.river_pump.supply);
const neighbor = [{ x: bank.x + 1, z: bank.z }, { x: bank.x - 1, z: bank.z }, { x: bank.x, z: bank.z + 1 }, { x: bank.x, z: bank.z - 1 }]
  .find(q => pumping.roads.valid(q.x, q.z) && !river.isWater(q.x, q.z) && !pumping.buildingAt(q.x, q.z));
const consumer = build(pumping, 'park', neighbor.x, neighbor.z);
pumping.update(1); assert(consumer.watered, 'pump serves an adjacent dry consumer');
pumping.bulldoze(pump.x, pump.z); pumping.update(1);
assert.equal(pumping.state.water.supply, 0); assert(!consumer.watered);
assert(!createSimulation({ size: 64 }).place('river_pump', 1, 1).ok, 'legacy-flat has no pump banks');

// A future construction site reserves space but contributes no operating effect.
const sites = town('clinic', 'apartments');
const idleShop = build(sites.sim, 'workshop', 8, 3);
for (const b of sites.sim.state.buildings) if (b.type !== 'townhall') b.constructionRemaining = 10;
sites.sim.update(1);
assert.equal(sites.sim.state.power.supply, 0);
assert.equal(sites.sim.state.water.supply, 0);
assert.equal(sites.sim.state.population, 0);
assert.equal(sites.sim.state.income, 0);
near(sites.sim.state.upkeep, BUILDINGS.townhall.upkeep);
assert(!sites.civic.serviced && !sites.home.serviced && !idleShop.powered);
assert.equal(sites.sim.buildingAt(8, 3), idleShop);
for (const b of sites.sim.state.buildings) b.constructionRemaining = 0;
sites.sim.update(1);
assert.equal(sites.sim.state.power.supply, NEW_BUILDINGS.solar.supply);
assert.equal(sites.sim.state.water.supply, BUILDINGS.water.supply);
assert(sites.home.residents > 0 && sites.home.serviced && sites.sim.state.income > 0);
assert.equal(workshop.type, 'workshop');
console.log('CONTENT CHECK PASS: six functional additions; natural 160/64 capacity, workshop jobs/income, clinic/school growth/reach, networked solar/pump supply, shared bank legality and inactive-site effects');
