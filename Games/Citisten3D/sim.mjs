import { RoadGrid } from './roads.mjs';
import { readSnapshot } from './sim-snapshot.mjs';
import { footprintLots } from './footprints.mjs';
import { NEW_BUILDINGS, BUILD_TIMES, isBuildingActive } from './city-content.mjs';
import { CITY_STAGES, getStage, unlocked } from './progression.mjs';
import { createRiverTerrain } from './river-data.mjs';
import { homeMorale } from './morale.mjs';
import { deriveWallTopology } from './wall-topology.mjs';
import { createDevelopment, startResearch, startUpgrade, advanceDevelopment, effectiveBuilding, researchUpkeep } from './development.mjs';
import { createEconomy, setSpecialization, productionTick } from './production.mjs';
import { createIncidentState, advanceIncidents, incidentEffectMap, respondIncident } from './incidents.mjs';

export const BUILDINGS = Object.freeze(Object.fromEntries(Object.entries({
  residential: { cost: 90, hp: 100, upkeep: 0.015, power: 0.3, water: 0.4, capacity: 64, roadRequired: true },
  commercial: { cost: 120, hp: 140, upkeep: 0.02, power: 1, water: 0.7, jobs: 32, income: 0.06, roadRequired: true },
  industrial: { cost: 150, hp: 180, upkeep: 0.025, power: 2, water: 1, jobs: 96, income: 0.06, roadRequired: true },
  power: { cost: 1400, hp: 260, upkeep: 0.18, power: 0, water: 0, supply: 80, utilityKind: 'power' },
  water: { cost: 1000, hp: 220, upkeep: 0.12, power: 0, water: 0, supply: 100, utilityKind: 'water' },
  police: { cost: 650, hp: 200, upkeep: 0.07, power: 1, water: 1, serviceRadius: 16 },
  fire: { cost: 650, hp: 200, upkeep: 0.07, power: 1, water: 1, serviceRadius: 16 },
  park: { cost: 180, hp: 80, upkeep: 0.025, power: 0.1, water: 0.5, serviceRadius: 16 },
  townhall: { cost: 0, hp: 600, upkeep: 0.08, power: 1, water: 1, serviceRadius: 16 },
  wall: { cost: 45, hp: 350, upkeep: 0.005, power: 0, water: 0 },
  watchtower: { cost: 300, hp: 220, upkeep: 0.04, power: 0.3, water: 0.1, range: 8, damage: 18 },
  ...NEW_BUILDINGS
}).map(([type, definition]) => [type, Object.freeze({ unlockStage: 0, ...definition })])));
export const MILESTONES = Object.freeze([
  { population: 500, name: 'First neighborhood', grant: 750 },
  { population: 1000, name: 'Town center', grant: 1000 },
  { population: 1500, name: 'Borough', grant: 1250 },
  { population: 2000, name: 'Small city', grant: 1500 },
  { population: 2500, name: 'City hub', grant: 2000 }
].map(milestone => Object.freeze(milestone)));
// One tick is the existing 0.25-second fixed step; a civic day is 960 ticks.
export const CITY_EVENTS = Object.freeze([
  { type: 'street-festival', title: 'Street Festival', description: 'Happiness +20 points, growth and local income +25% for one day.', durationTicks: 960 },
  { type: 'water-main-burst', title: 'Water Main Burst', description: 'Leaks double district water demand until repaired. Choose Repair, then any lot in this district ($120, daytime).', durationTicks: 0 },
  { type: 'power-surcharge', title: 'Power Surcharge Day', description: 'Tax income falls 25% for one day. Keep a budget reserve.', durationTicks: 960 },
  { type: 'farmers-market', title: 'Farmers Market', description: 'Commercial income +50% within eight lots of a supplied park for one day.', durationTicks: 960 },
  { type: 'inspection-day', title: 'Inspection Day', description: 'Crime falls by 0.3 for one day. Add police before inspections end.', durationTicks: 960 },
  { type: 'cold-snap', title: 'Cold Snap', description: 'Night-time power demand +50% for one day. Add capacity before nightfall.', durationTicks: 960 }
].map(event => Object.freeze(event)));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];

// Tiny binary heap shared by the weighted, road-preferring siege distance field.
function push(heap, item) {
  let i = heap.length; heap.push(item);
  while (i && heap[(i - 1) >> 1][0] > item[0]) {
    heap[i] = heap[(i - 1) >> 1]; i = (i - 1) >> 1;
  }
  heap[i] = item;
}
function pop(heap) {
  const first = heap[0], last = heap.pop();
  if (!heap.length) return first;
  let i = 0;
  while (i * 2 + 1 < heap.length) {
    let child = i * 2 + 1;
    if (child + 1 < heap.length && heap[child + 1][0] < heap[child][0]) child++;
    if (heap[child][0] >= last[0]) break;
    heap[i] = heap[child]; i = child;
  }
  heap[i] = last;
  return first;
}

export function createSimulation({ size = 200, mode = 'free', seed = 1, roads, snapshot, terrainLayout = 'legacy-flat', timedConstruction = false, progressionEnabled = timedConstruction, expansionEnabled = false, scenario = 'balanced' } = {}) {
  if (typeof expansionEnabled !== 'boolean') throw new RangeError('Expansion option must be boolean');
  if (typeof timedConstruction !== 'boolean' || typeof progressionEnabled !== 'boolean') throw new RangeError('Gameplay options must be boolean');
  const saved = snapshot === undefined ? null : readSnapshot(snapshot, BUILDINGS, CITY_EVENTS, MILESTONES, roads?.lotSize ?? 10);
  if (saved) { size = saved.state.size; mode = saved.state.mode; seed = saved.runtime.seed; expansionEnabled = saved.state.expansionEnabled ?? expansionEnabled; }
  if (expansionEnabled && (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)) throw new RangeError('Town seed must be an unsigned integer');
  const startingSeed = saved?.runtime.eventSeed ?? (seed >>> 0);
  roads ??= new RoadGrid(size);
  seed >>>= 0;
  if (!Number.isInteger(size) || size < 12 || size > 200 || roads.size !== size) throw new RangeError('Grid size must be 12..200 and match roads');
  if (!['free', 'defense'].includes(mode)) throw new RangeError('Unknown mode');
  const terrain = createRiverTerrain(size, saved ? saved.state.terrainLayout ?? 'legacy-flat' : terrainLayout);
  const state = {
    size, mode, terrainLayout: terrain.layout, timedConstruction, progressionEnabled, progressionLevel: 0, speed: 1, time: 0, tick: 0, cityEvents: [], phase: 'day', dayRemaining: 240, night: 0,
    score: 0, kills: 0, pendingZombies: 0, population: 0, peakPopulation: 0, budget: 40000,
    income: 0, upkeep: 0, netIncome: 0, taxRate: 0.1, crime: 0,
    housingCapacity: 0, jobs: 0, morale: 0.5, moraleFactors: [], expansionEnabled,
    ...(expansionEnabled ? { development: createDevelopment(), economy: createEconomy(startingSeed, scenario), incidents: createIncidentState(startingSeed) } : {}),
    nextMilestone: MILESTONES[0], rebuildRemaining: 0, growthSamplePopulation: 0, growthDiagnosis: '',
    demand: { residential: 1, commercial: 0.5, industrial: 0.5 },
    power: { supply: 0, demand: 0, served: 0, unserved: 0 },
    water: { supply: 0, demand: 0, served: 0, unserved: 0 },
    buildings: [], cars: [], zombies: [], defenders: [], townHallHp: 600, townHallMaxHp: 600
  };
  let nextId = 1, accumulator = 0, economyClock = 0, trafficClock = 0;
  let revision = 0, fieldRevision = '', field = null, warned = false, milestone = 0;
  const cells = new Map(), events = [];
  let incidentStatus = new Map();
  const neutralIncident = Object.freeze({ powerOut: false, waterOut: false, productionMultiplier: 1, unsafe: false });
  const effectsFor = b => incidentStatus.get(b.id) || neutralIncident;
  const definitionFor = b => effectiveBuilding(BUILDINGS[b.type], b, state);
  const notices = batch => { for (const { type, ...data } of batch) emit(type, data); };
  const eventSeed = saved ? saved.runtime.eventSeed : seed;
  const districtOf = b => `${Math.floor(b.x / 8)},${Math.floor(b.z / 8)}`;
  const happening = (type, b) => state.cityEvents.some(e => e.type === type && (!b || e.district === districtOf(b)));
  const festivalBoost = b => happening('street-festival', b) ? 1.25 : 1;
  const marketBoost = (b, parks) => b.type === 'commercial' && happening('farmers-market') && parks.some(p => distance(b, p) <= 8) ? 1.5 : 1;
  const taxEffectiveness = () => happening('power-surcharge') ? 0.75 : 1;
  const inspectionCrime = crime => Math.max(0, crime - (happening('inspection-day') ? 0.3 : 0));
  const coldDemand = () => state.phase === 'night' && happening('cold-snap') ? 1.5 : 1;
  const waterDemand = b => happening('water-main-burst', b) ? 2 : 1;
  const key = (x, z) => z * size + x;
  const cell = k => ({ x: k % size, z: Math.floor(k / size) });
  const valid = (x, z) => Number.isInteger(x) && Number.isInteger(z) && x >= 0 && z >= 0 && x < size && z < size;
  const neighbors = p => directions.map(([x, z]) => ({ x: p.x + x, z: p.z + z })).filter(p => valid(p.x, p.z));
  const emit = (type, data = {}) => events.push({ type, time: state.time, ...data });
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const footprint = b => footprintLots(b, roads.lotSize);
  const boundary = b => {
    const lots = footprint(b), occupied = new Set(lots.map(p => key(p.x, p.z)));
    return lots.flatMap(neighbors).filter(p => !occupied.has(key(p.x, p.z)));
  };
  function insert(type, x, z) {
    const def = BUILDINGS[type];
    const total = state.timedConstruction ? BUILD_TIMES[type] : 0;
    const b = { id: nextId++, type, x, z, hp: def.hp, maxHp: def.hp, residents: 0, happiness: 0.5, powered: false, watered: false, serviced: false, cooldown: 0,
      constructionRemaining: total, constructionTotal: total, constructionPaidCost: def.cost };
    for (const p of footprint(b)) cells.set(key(p.x, p.z), b);
    state.buildings.push(b); revision++;
    emit('placed', { building: { ...b } });
    if (total > 0) emit('construction-started', { id: b.id, total });
    return b;
  }
  let hall = insert('townhall', Math.floor(size / 2), Math.floor(size / 2));
  function spend(amount) {
    if (!Number.isFinite(amount) || amount < 0 || state.budget < amount || state.phase === 'lost') return false;
    state.budget -= amount; return true;
  }
  function place(type, x, z, options = {}) {
    if (!options || typeof options !== 'object' || Array.isArray(options) || (options.wallRotation !== undefined && (type !== 'wall' || !Number.isInteger(options.wallRotation) || options.wallRotation < 0 || options.wallRotation > 3))) return { ok: false, reason: 'Invalid wall rotation' };
    if (!Object.hasOwn(BUILDINGS, type) || type === 'townhall') return { ok: false, reason: 'Unknown or protected building' };
    if (state.phase === 'lost') return { ok: false, reason: 'City has fallen' };
    if (state.progressionEnabled && !unlocked(type, state)) return { ok: false, reason: `Requires ${CITY_STAGES[BUILDINGS[type].unlockStage].name}` };
    if (!valid(x, z) || footprint({ type, x, z }).some(p => !valid(p.x, p.z) || cells.has(key(p.x, p.z)) || roads.has(p.x, p.z))) return { ok: false, reason: 'Choose an empty footprint' };
    const def = BUILDINGS[type];
    if (footprint({ type, x, z }).some(p => terrain.isWater(p.x, p.z))) return { ok: false, reason: 'Buildings need dry land' };
    if (def.riverbank && !terrain.isBank(x, z) && !neighbors({ x, z }).some(p => terrain.isWater(p.x, p.z))) return { ok: false, reason: 'River pump needs a dry riverbank' };
    if (def.roadRequired && !boundary({ type, x, z }).some(p => roads.has(p.x, p.z))) return { ok: false, reason: 'Zones need an adjacent road' };
    if (!spend(BUILDINGS[type].cost)) return { ok: false, reason: 'Insufficient budget' };
    const building = insert(type, x, z);
    if (options.wallRotation !== undefined) building.wallRotation = options.wallRotation;
    return { ok: true, building };
  }
  function rotateWall(x, z) {
    const b = valid(x, z) && cells.get(key(x, z));
    if (!b || b.type !== 'wall' || !isBuildingActive(b) || state.phase === 'lost') return { ok: false, reason: 'Choose a completed wall' };
    b.wallRotation = ((b.wallRotation ?? deriveWallTopology(state.buildings).get(b.id).rotation) + 1) % 4;
    emit('rotated', { id: b.id, wallRotation: b.wallRotation });
    return { ok: true, reason: `Wall rotated ${b.wallRotation * 90} degrees` };
  }
  function remove(b, type) {
    for (const p of footprint(b)) cells.delete(key(p.x, p.z));
    state.buildings.splice(state.buildings.indexOf(b), 1); revision++;
    emit(type, { id: b.id, building: { ...b } });
  }
  function bulldoze(x, z) {
    const b = valid(x, z) && cells.get(key(x, z));
    if (!b || b === hall || state.phase === 'lost') return { ok: false, reason: 'Cannot remove this lot' };
    const refund = b.constructionRemaining > 0 ? b.constructionPaidCost * 0.75 : 0;
    state.budget += refund;
    if (b.constructionRemaining > 0) emit('construction-cancelled', { id: b.id, refund });
    remove(b, 'removed'); return { ok: true, refund };
  }
  function repair(id, lot) {
    const b = state.buildings.find(b => b.id === id);
    if (state.phase !== 'day') return { ok: false, reason: 'Repair during the day' };
    const target = lot && valid(lot.x, lot.z) ? lot : b;
    const burst = target && state.cityEvents.find(e => e.type === 'water-main-burst' && e.district === districtOf(target));
    if (burst && !(b === hall && b.hp === 0)) {
      if (!spend(120)) return { ok: false, reason: 'Insufficient budget' };
      finishCityEvent(burst, 'repaired'); utilities('water');
      return { ok: true, cost: 120, reason: 'Water main repaired: $120' };
    }
    if (!b || b.hp >= b.maxHp) return { ok: false, reason: 'No damage to repair' };
    const cost = Math.ceil((b.maxHp - b.hp) * 0.4);
    if (!spend(cost)) return { ok: false, reason: 'Insufficient budget' };
    const rebuilding = b === hall && b.hp === 0;
    b.hp = b.maxHp; state.townHallHp = hall.hp; emit('repaired', { id, cost });
    if (rebuilding) {
      state.rebuildRemaining = 0; state.dayRemaining = 240; warned = false;
      emit('hall-rebuilt', { cost });
    }
    return { ok: true, cost };
  }
  function damage(b, amount, attacker) {
    const actual = Math.min(b.hp, amount); b.hp -= actual;
    emit('damaged', { id: b.id, amount: actual, hp: b.hp, attacker });
    if (b === hall) state.townHallHp = b.hp;
    if (b.hp > 0) return;
    if (b !== hall) { remove(b, 'destroyed'); return; }
    // Keep the ruined hall selectable by the existing Repair tool; no wave victory or kills.
    b.powered = false; b.watered = false;
    state.phase = 'day'; state.rebuildRemaining = 120; state.dayRemaining = 120;
    state.zombies = []; state.pendingZombies = 0; state.defenders = []; warned = false;
    emit('hall-fallen', { remaining: 120, cost: Math.ceil(b.maxHp * 0.4) });
  }

  function finishCityEvent(event, reason) {
    state.cityEvents.splice(state.cityEvents.indexOf(event), 1);
    emit('city-event-end', { event: { ...event }, reason });
  }
  function cityHappenings() {
    for (const event of [...state.cityEvents]) {
      // Zero duration denotes a repair-only incident, not a timed buff.
      if (event.durationTicks > 0 && state.tick >= event.startTick + event.durationTicks) finishCityEvent(event, 'expired');
    }
    if (state.tick < 240 || (state.tick - 240) % 960 !== 0) return;
    const ordinal = (state.tick - 240) / 960;
    const definition = CITY_EVENTS[ordinal % CITY_EVENTS.length];
    const candidates = state.buildings.filter(b => isBuildingActive(b) && (definition.type !== 'street-festival' || BUILDINGS[b.type].capacity > 0));
    const districts = [...new Set((candidates.length ? candidates : [hall]).map(districtOf))].sort();
    const district = districts[((eventSeed + Math.imul(ordinal, 2654435761)) >>> 0) % districts.length];
    if (state.cityEvents.some(e => e.type === definition.type && e.district === district)) return;
    const event = { ...definition, id: `civic-${ordinal}`, district, startTick: state.tick };
    state.cityEvents.push(event);
    emit('city-event-start', { event: { ...event } });
  }

  function utilities(kind) {
    const disrupted = b => kind === 'power' ? effectsFor(b).powerOut : effectsFor(b).waterOut;
    const sources = new Map(state.buildings.filter(b => isBuildingActive(b) && !disrupted(b) && definitionFor(b).utilityKind === kind).map(b => [key(b.x, b.z), b]));
    const reached = new Map(), networks = [];
    // Each connected network owns its supply: spare capacity on an island cannot cross grass.
    for (const [start] of sources) {
      if (reached.has(start)) continue;
      const network = { supply: 0, served: 0, districts: new Map() }, queue = [start];
      networks.push(network); reached.set(start, network);
      for (let i = 0; i < queue.length; i++) {
        const k = queue[i], source = sources.get(k);
        if (source) network.supply += definitionFor(source).supply;
        for (const p of neighbors(cell(k))) {
          const next = key(p.x, p.z);
          if (!reached.has(next) && (roads.has(p.x, p.z) || sources.has(next))) {
            reached.set(next, network); queue.push(next);
          }
        }
      }
    }
    const prop = kind === 'power' ? 'powered' : 'watered';
    let demand = 0, served = 0;
    for (const b of state.buildings) {
      if (!isBuildingActive(b)) { b[prop] = false; continue; }
      const load = (definitionFor(b)[kind] + b.residents * (kind === 'power' ? 0.008 : 0.01)) * (kind === 'power' ? coldDemand() : waterDemand(b));
      b[prop] = !disrupted(b) && load === 0; demand += load;
      if (!load || disrupted(b)) continue;
      const network = boundary(b).map(p => reached.get(key(p.x, p.z))).find(Boolean);
      if (!network) continue;
      const district = districtOf(b);
      if (!network.districts.has(district)) network.districts.set(district, { buildings: [], load: 0, priority: distance(b, hall) });
      const d = network.districts.get(district); d.buildings.push(b); d.load += load;
      if (b === hall) d.priority = -1;
    }
    // ponytail: deterministic whole-district shedding; rotate priorities only if fairness becomes a design goal.
    for (const network of networks) for (const d of [...network.districts.values()].sort((a, b) => a.priority - b.priority)) {
      if (network.served + d.load > network.supply + 1e-8) continue;
      network.served += d.load; served += d.load;
      for (const b of d.buildings) b[prop] = true;
    }
    state[kind] = { supply: networks.reduce((n, net) => n + net.supply, 0), demand, served, unserved: Math.max(0, demand - served) };
  }
  let wasBlackout = false;
  function economy() {
    utilities('power'); utilities('water');
    const blackout = state.power.unserved > 0.01;
    if (blackout !== wasBlackout) emit('blackout', { active: blackout, ...state.power });
    wasBlackout = blackout;
    const active = state.buildings.filter(b => isBuildingActive(b) && b.powered && b.watered);
    const jobs = active.reduce((n, b) => n + (definitionFor(b).jobs || 0), 0);
    const maintenance = state.buildings.filter(b => !(b.constructionRemaining > 0)).reduce((n, b) => n + definitionFor(b).upkeep, 0) + researchUpkeep(state);
    let flows = { exportRevenue: 0, importCost: 0, industryUpkeep: 0 };
    if (state.expansionEnabled) {
      const reached = new Set(), queue = boundary(hall).filter(p => roads.has(p.x, p.z)).map(p => key(p.x, p.z));
      for (const k of queue) reached.add(k);
      for (let i = 0; i < queue.length; i++) for (const p of neighbors(cell(queue[i]))) {
        const k = key(p.x, p.z);
        if (roads.has(p.x, p.z) && !reached.has(k)) { reached.add(k); queue.push(k); }
      }
      const market = new Set(active.filter(b => boundary(b).some(p => reached.has(key(p.x, p.z)))).map(b => b.id));
      flows = productionTick({ ...state, budget: Math.max(0, state.budget - maintenance) },
        active.map(b => ({ ...b, productionFactor: effectsFor(b).productionMultiplier })), BUILDINGS, market);
    }
    const police = active.filter(b => b.type === 'police');
    state.crime = inspectionCrime(clamp((state.population - police.length * 600 - 200) / 1800, 0, 1));
    state.demand = {
      residential: clamp(0.55 + (jobs - state.population * 0.65) / 1500 - Math.max(0, state.taxRate - 0.1) * 4, 0, 1),
      commercial: clamp(0.3 + (state.population * 0.3 - jobs * 0.25) / 600, 0, 1),
      industrial: clamp(0.4 + (state.population * 0.65 - jobs) / 1000, 0, 1)
    };
    const services = active.filter(b => definitionFor(b).serviceRadius > 0 && !effectsFor(b).unsafe);
    const homes = state.buildings.filter(b => isBuildingActive(b) && BUILDINGS[b.type].capacity > 0);
    for (const b of state.buildings) if (!isBuildingActive(b)) b.serviced = false;
    const growth = 2.7 * state.demand.residential * clamp(1.5 - state.taxRate * 5, 0, 1);
    state.jobs = jobs;
    state.housingCapacity = homes.reduce((n, b) => n + definitionFor(b).capacity, 0);
    const blockers = new Map(), moraleFactors = new Map();
    let moraleTotal = 0, moraleWeight = 0;
    for (const b of homes) {
      const nearby = services.filter(s => distance(b, s) <= definitionFor(s).serviceRadius);
      b.serviced = nearby.length > 0;
      // Only the strongest local growth service applies; duplicate clinics do not stack.
      const serviceGrowth = nearby.reduce((bonus, s) => Math.max(bonus, definitionFor(s).serviceGrowth || 0), 0);
      const reason = effectsFor(b).unsafe ? 'Homes affected by an incident: fund a response or wait for services.' : !b.powered ? 'Homes lack power: connect roads to a plant with spare capacity.'
        : !b.watered ? 'Homes lack water: check road connections, capacity and water-main leaks.'
        : !b.serviced ? 'Homes lack services: add a supplied park, police or fire station within 16 lots.'
        : state.crime >= 0.65 && !police.some(p => distance(b, p) <= 16) ? 'Crime is driving residents away: add supplied police within 16 lots.' : '';
      const safe = !reason;
      if (reason) blockers.set(reason, (blockers.get(reason) || 0) + 1);
      const morale = homeMorale({ safe, taxRate: state.taxRate, crime: state.crime,
        amenity: nearby.some(s => ['park', 'clinic', 'school'].includes(s.type)), festival: happening('street-festival', b),
        pollution: state.economy?.pollution || 0, foodShortage: state.economy?.foodShortage || 0 });
      b.happiness = morale.value;
      const weight = Math.max(1, b.residents); moraleTotal += morale.value * weight; moraleWeight += weight;
      for (const factor of morale.factors) moraleFactors.set(factor, (moraleFactors.get(factor) || 0) + weight);
      b.residents = safe ? Math.min(definitionFor(b).capacity, b.residents + growth * (1 + serviceGrowth) * festivalBoost(b) * morale.growthMultiplier / Math.max(1, homes.length)) : Math.max(0, b.residents - Math.max(0.2, b.residents * 0.025) * (1 + Math.max(0, 0.5 - morale.value)));
    }
    state.morale = moraleWeight ? moraleTotal / moraleWeight : 0.5;
    state.moraleFactors = [...moraleFactors].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([label]) => label);
    state.population = homes.reduce((n, b) => n + b.residents, 0);
    state.peakPopulation = Math.max(state.peakPopulation, state.population);
    if (state.tick % 20 === 0) {
      // Sample the same whole residents shown by the HUD; fractional growth is not a hard stall.
      const stalled = Math.floor(state.population) <= Math.floor(state.growthSamplePopulation);
      const dominant = [...blockers].sort((a, b) => b[1] - a[1])[0]?.[0];
      state.growthDiagnosis = !stalled ? '' : !homes.length ? 'No homes yet: zone residential beside a road.'
        : dominant || (homes.every(b => b.residents >= definitionFor(b).capacity) ? 'Homes are full: zone more residential beside a road.'
        : state.taxRate > 0.1 ? 'Growth is slow or stopped: lower taxes toward 10%.'
        : state.demand.residential < 0.55 ? 'Residential demand is low: add powered and watered jobs.'
        : 'Growth is slow: only some homes have room to grow.');
      state.growthSamplePopulation = state.population;
    }
    const parks = active.filter(b => b.type === 'park');
    const taxMultiplier = taxEffectiveness() * (state.taxRate / 0.1);
    const taxIncome = taxMultiplier * homes.reduce((n, b) => n + b.residents * 0.0015 * festivalBoost(b), 0);
    const serviceIncome = taxMultiplier * active.reduce((n, b) => n +
      (state.expansionEnabled && ['industrial', 'workshop'].includes(b.type) ? 0 : (BUILDINGS[b.type].income || 0)) *
      (state.expansionEnabled ? Math.min(1, state.population / 32) : 1) * festivalBoost(b) * marketBoost(b, parks), 0);
    state.income = taxIncome + serviceIncome + flows.exportRevenue;
    state.upkeep = maintenance + flows.industryUpkeep;
    state.netIncome = state.income - state.upkeep - flows.importCost;
    state.budget = state.expansionEnabled ? Math.max(0, state.budget + state.netIncome) : state.budget + state.netIncome;
    if (state.expansionEnabled) state.economy.breakdown = { taxIncome, serviceIncome, exportRevenue: flows.exportRevenue,
      importCost: flows.importCost, upkeep: state.upkeep, netIncome: state.netIncome };
    while (milestone < MILESTONES.length && state.population >= MILESTONES[milestone].population) {
      const reward = MILESTONES[milestone++];
      state.budget += reward.grant; emit('milestone', { ...reward });
    }
    state.nextMilestone = MILESTONES[milestone] || null;
    const earned = getStage(state).level;
    while (state.progressionLevel < earned) {
      const stage = CITY_STAGES[++state.progressionLevel];
      if (state.progressionEnabled) {
        state.budget += stage.grant;
        emit('stage-earned', { level: stage.level, name: stage.name, grant: stage.grant });
      }
    }
  }

  function roadAtBuilding(b) { return boundary(b).find(p => roads.has(p.x, p.z)); }
  function spawnCar() {
    if (state.cars.length >= 80 || state.population < 1) return;
    const nodes = state.buildings.filter(b => isBuildingActive(b) && (BUILDINGS[b.type].capacity > 0 || BUILDINGS[b.type].jobs > 0 || BUILDINGS[b.type].utilityKind || ['police', 'fire', 'power', 'water'].includes(b.type)));
    if (nodes.length < 2) return;
    const from = nodes[Math.floor(random() * nodes.length)];
    const choices = nodes.filter(b => b.type !== from.type);
    if (!choices.length) return;
    const to = choices[Math.floor(random() * choices.length)], a = roadAtBuilding(from), b = roadAtBuilding(to);
    if (!a || !b) return;
    const path = roads.path(a, b);
    if (path.length < 2) return;
    const points = roads.lanePoints(path).map(p => ({ x: p.x / roads.lotSize + size / 2 - 0.5, z: p.z / roads.lotSize + size / 2 - 0.5 }));
    const lane = `${key(path[0].x, path[0].z)}:${key(path[1].x, path[1].z)}`;
    if (state.cars.some(c => !c.parked && c.lane === lane)) return;
    const types = [from.type, to.type];
    const vehicleType = types.includes('police') ? 'patrol_car' : types.some(type => BUILDINGS[type].utilityKind || ['fire', 'power', 'water'].includes(type)) ? 'utility_car' : 'car';
    state.cars.push({ id: nextId++, vehicleType, ...points[0], heading: 0, lane, parked: false, path, points, segment: 0, progress: 0, parkTime: 2, roadVersion: roads.version });
  }
  function traffic(dt) {
    const occupied = new Set(state.cars.filter(c => !c.parked).map(c => `${key(c.path[c.segment].x, c.path[c.segment].z)}:${key(c.path[Math.min(c.segment + 1, c.path.length - 1)].x, c.path[Math.min(c.segment + 1, c.path.length - 1)].z)}`));
    for (const c of [...state.cars]) {
      if (c.roadVersion !== roads.version || c.parked && (c.parkTime -= dt) <= 0) { state.cars.splice(state.cars.indexOf(c), 1); continue; }
      if (c.parked) continue;
      const a = c.points[c.segment], b = c.points[c.segment + 1];
      c.progress = Math.min(1, c.progress + dt * 1.4 / Math.max(0.01, distance(a, b)));
      if (c.progress >= 1 && c.segment + 2 < c.path.length) {
        const p = c.path[c.segment + 1], q = c.path[c.segment + 2], nextLane = `${key(p.x, p.z)}:${key(q.x, q.z)}`;
        if (occupied.has(nextLane)) c.progress = 0.8;
        else { occupied.delete(c.lane); occupied.add(nextLane); c.lane = nextLane; c.segment++; c.progress = 0; }
      } else if (c.progress >= 1) { c.parked = true; occupied.delete(c.lane); }
      const p = c.points[c.segment], q = c.points[c.segment + 1];
      c.x = p.x + (q.x - p.x) * c.progress; c.z = p.z + (q.z - p.z) * c.progress;
      c.heading = Math.atan2(p.x - q.x, p.z - q.z);
    }
  }

  const passable = p => valid(p.x, p.z) && (!terrain.isWater(p.x, p.z) || roads.has(p.x, p.z));
  function clearWalk(a, b) {
    const steps = Math.max(1, Math.ceil(distance(a, b) * 4));
    for (let i = 0; i <= steps; i++) {
      const p = { x: Math.round(a.x + (b.x - a.x) * i / steps), z: Math.round(a.z + (b.z - a.z) * i / steps) };
      if (!passable(p) || cells.get(key(p.x, p.z))?.type === 'wall') return false;
    }
    return true;
  }
  let routeVersion = -1;
  const defenderRoutes = new Map();
  function defenderGoal(c, target) {
    if (clearWalk(c, target)) return target;
    if (routeVersion !== roads.version) { defenderRoutes.clear(); routeVersion = roads.version; }
    const nearestRoad = point => {
      let best, bestDistance = Infinity;
      for (const k of roads.cells) {
        const p = cell(k), d = distance(point, p);
        if (d < bestDistance && clearWalk(point, p)) { best = p; bestDistance = d; }
      }
      return best;
    };
    const a = nearestRoad(c), b = nearestRoad(target);
    if (!a || !b) return null;
    const routeKey = `${key(a.x, a.z)}:${key(b.x, b.z)}`;
    // ponytail: reuse bounded RoadGrid BFS only for blocked direct walks; cache by endpoints/version.
    if (!defenderRoutes.has(routeKey)) {
      if (defenderRoutes.size >= 128) defenderRoutes.clear();
      defenderRoutes.set(routeKey, roads.path(a, b));
    }
    const route = defenderRoutes.get(routeKey);
    if (!route.length) return null;
    return route.findLast(p => clearWalk(c, p)) || a;
  }
  function siegeField() {
    const version = `${revision}:${roads.version}`;
    if (fieldRevision === version) return;
    fieldRevision = version; field = new Float64Array(size * size); field.fill(Infinity);
    const goal = key(hall.x, hall.z), heap = []; field[goal] = 0; push(heap, [0, goal]);
    while (heap.length) {
      const [cost, k] = pop(heap);
      if (cost !== field[k]) continue;
      const p = cell(k), building = cells.get(k);
      // The cost of ENTERING p is used on the reverse search, so descent is exact.
      const weight = building ? building.type === 'wall' ? 9 : 6 : roads.has(p.x, p.z) ? 2 : 4;
      for (const q of neighbors(p).filter(passable)) {
        const n = key(q.x, q.z), value = cost + weight;
        if (value < field[n]) { field[n] = value; push(heap, [value, n]); }
      }
    }
  }
  const perimeter = [];
  for (let i = 0; i < size; i++) perimeter.push(key(i, 0), key(i, size - 1));
  for (let i = 1; i < size - 1; i++) perimeter.push(key(0, i), key(size - 1, i));
  function spawnPending() {
    // ponytail: at most one perimeter's worth of live agents; raise only after world performance review.
    if (!state.pendingZombies || state.zombies.length >= perimeter.length) return;
    siegeField();
    const used = new Set(state.zombies.flatMap(z => z.move ? [z.cell, z.move.key] : [z.cell]));
    const start = Math.floor(random() * perimeter.length);
    for (let i = 0; i < perimeter.length && state.pendingZombies && state.zombies.length < perimeter.length; i++) {
      const k = perimeter[(start + i) % perimeter.length];
      if (used.has(k) || !passable(cell(k)) || !Number.isFinite(field[k])) continue;
      used.add(k); state.pendingZombies--;
      state.zombies.push({ id: nextId++, ...cell(k), cell: k, hp: 60, cooldown: 0, move: null });
    }
  }
  function startNight() {
    state.phase = 'night'; state.night++; warned = false;
    const count = Math.ceil(12 * 1.15 ** (state.night - 1));
    state.pendingZombies = count; spawnPending();
    const homes = state.buildings.filter(b => isBuildingActive(b) && BUILDINGS[b.type].capacity > 0 && b.residents >= 12);
    state.defenders = homes.slice(0, Math.min(24, Math.floor(state.population / 60))).map(b => ({ id: nextId++, x: b.x, z: b.z, home: b.id, cooldown: 0 }));
    emit('wave', { night: state.night, count });
  }
  function shoot(source, target, amount, kind) {
    emit('shot', { from: { x: source.x, z: source.z }, to: { x: target.x, z: target.z }, target: target.id, source: kind });
    target.hp -= amount;
    if (target.hp <= 0) { state.zombies.splice(state.zombies.indexOf(target), 1); state.kills++; emit('kill', { id: target.id, x: target.x, z: target.z }); }
  }
  function nearestZombie(p, range) {
    let best = null, d = range;
    for (const z of state.zombies) { const n = distance(p, z); if (n <= d) { d = n; best = z; } }
    return best;
  }
  function settleWalkers() {
    const occupied = new Set(state.zombies.flatMap(z => z.move ? [z.cell, z.move.key] : [z.cell]));
    function dryLot(agent, reachable) {
      const x = Math.round(agent.x), z = Math.round(agent.z);
      for (let radius = 0; radius < size; radius++) {
        const ring = [];
        for (let dx = -radius; dx <= radius; dx++) for (const dz of radius ? [-radius, radius] : [0]) ring.push({ x: x + dx, z: z + dz });
        for (let dz = 1 - radius; dz < radius; dz++) for (const dx of [-radius, radius]) ring.push({ x: x + dx, z: z + dz });
        const lot = ring.filter(p => valid(p.x, p.z) && !terrain.isWater(p.x, p.z) && !cells.has(key(p.x, p.z)) && !occupied.has(key(p.x, p.z)) && (!reachable || Number.isFinite(field[key(p.x, p.z)])))
          .sort((a, b) => distance(a, agent) - distance(b, agent))[0];
        if (lot) return lot;
      }
    }
    // Bridge removal cannot leave an ephemeral enemy swimming or stranded on the wrong bank.
    for (const z of [...state.zombies]) if (!passable(cell(z.cell)) || !Number.isFinite(field[z.cell])) {
      const p = dryLot(z, true);
      occupied.delete(z.cell); if (z.move) occupied.delete(z.move.key);
      if (p) { Object.assign(z, p, { cell: key(p.x, p.z), move: null }); occupied.add(z.cell); }
      else { state.zombies.splice(state.zombies.indexOf(z), 1); state.pendingZombies++; }
    }
    for (const c of [...state.defenders]) if (!passable({ x: Math.round(c.x), z: Math.round(c.z) })) {
      const p = dryLot(c, false);
      if (p) Object.assign(c, p);
      else state.defenders.splice(state.defenders.indexOf(c), 1);
    }
  }
  function combat(dt) {
    siegeField(); settleWalkers(); spawnPending();
    const occupied = new Set(state.zombies.flatMap(z => z.move ? [z.cell, z.move.key] : [z.cell]));
    for (const b of state.buildings.filter(b => isBuildingActive(b) && b.type === 'watchtower')) {
      b.cooldown -= dt;
      const target = nearestZombie(b, BUILDINGS.watchtower.range);
      if (target && b.cooldown <= 0) { shoot(b, target, BUILDINGS.watchtower.damage, 'tower'); b.cooldown = 0.8; }
    }
    state.defenders = state.defenders.filter(c => c.home === undefined || isBuildingActive(state.buildings.find(b => b.id === c.home) || { hp: 0 }));
    const threats = state.defenders.length ? state.buildings.filter(b => isBuildingActive(b) && state.zombies.some(z => distance(b, z) <= 4)) : [];
    for (const c of state.defenders) {
      c.cooldown -= dt;
      // Each citizen rushes to the nearest threatened structure, not an arbitrary enemy across town.
      const threatened = threats.reduce((best, b) => !best || distance(c, b) < distance(c, best) ? b : best, null);
      if (threatened && distance(c, threatened) > 1.5) {
        const goal = defenderGoal(c, threatened);
        if (goal) {
          const dx = goal.x - c.x, dz = goal.z - c.z, d = Math.hypot(dx, dz), step = Math.min(d, dt * 1.6);
          if (d > 0) {
            const next = { x: c.x + dx / d * step, z: c.z + dz / d * step };
            if (clearWalk(c, next)) { c.heading = Math.atan2(-dx, -dz); c.x = next.x; c.z = next.z; }
          }
        }
      }
      const target = nearestZombie(c, 3.5);
      if (target && c.cooldown <= 0) { shoot(c, target, 10, 'citizen'); c.cooldown = 1.2; }
    }
    for (const z of [...state.zombies]) {
      z.cooldown -= dt;
      if (z.move && !passable(z.move)) { z.move = null; Object.assign(z, cell(z.cell)); }
      if (z.move) {
        z.move.progress = Math.min(1, z.move.progress + dt * (roads.has(z.move.x, z.move.z) ? 1.4 : 0.7));
        const p = cell(z.cell);
        z.heading = Math.atan2(p.x - z.move.x, p.z - z.move.z);
        z.x = p.x + (z.move.x - p.x) * z.move.progress; z.z = p.z + (z.move.z - p.z) * z.move.progress;
        if (z.move.progress >= 1) { occupied.delete(z.cell); z.cell = z.move.key; z.move = null; }
        continue;
      }
      const p = cell(z.cell), here = cells.get(z.cell);
      // Buildings subsequently placed on a zombie's lot are attacked too.
      const options = neighbors(p).filter(q => passable(q) && field[key(q.x, q.z)] < field[z.cell]);
      options.sort((a, b) => {
        const cost = q => { const building = cells.get(key(q.x, q.z)); return field[key(q.x, q.z)] + (building ? building.type === 'wall' ? 9 : 6 : roads.has(q.x, q.z) ? 2 : 4); };
        // Equal-cost choices lean toward the local crowd; reservations prevent overlap.
        const crowd = q => neighbors(q).filter(n => occupied.has(key(n.x, n.z))).length;
        return cost(a) - cost(b) || crowd(b) - crowd(a);
      });
      const q = options.find(q => !occupied.has(key(q.x, q.z))) || options[0];
      const target = here || (q && cells.get(key(q.x, q.z)));
      if (target) {
        if (z.cooldown <= 0) { damage(target, 8, z.id); z.cooldown = 1; }
        if (state.phase !== 'night') return;
      } else if (q && !occupied.has(key(q.x, q.z))) {
        occupied.add(key(q.x, q.z)); z.move = { ...q, key: key(q.x, q.z), progress: 0 };
      }
    }
    if (!state.zombies.length && !state.pendingZombies && state.phase === 'night') {
      state.score++; state.phase = 'day'; state.dayRemaining = 240; state.defenders = [];
      emit('night-survived', { score: state.score, night: state.night });
    }
  }
  function step(dt) {
    if (state.phase === 'lost') return;
    state.time += dt; state.tick++; economyClock += dt; trafficClock += dt;
    for (const b of state.buildings) if (b.constructionRemaining > 0) {
      b.constructionRemaining = Math.max(0, b.constructionRemaining - dt);
      if (b.constructionRemaining === 0) emit('construction-complete', { id: b.id, building: { ...b } });
    }
    notices(advanceDevelopment(state, dt, BUILDINGS));
    notices(advanceIncidents(state, dt, BUILDINGS, terrain, damage));
    incidentStatus = incidentEffectMap(state);
    cityHappenings();
    if (economyClock >= 1) { economyClock -= 1; economy(); }
    if (trafficClock >= 1.5) { trafficClock -= 1.5; spawnCar(); }
    traffic(dt);
    if (state.rebuildRemaining > 0) {
      state.rebuildRemaining = Math.max(0, state.rebuildRemaining - dt);
      state.dayRemaining = state.rebuildRemaining;
      if (!state.rebuildRemaining) {
        state.phase = 'lost';
        emit('lost', { score: state.score, peakPopulation: state.peakPopulation, kills: state.kills });
      }
      return;
    }
    if (state.mode === 'free') return;
    if (state.phase === 'day') {
      state.dayRemaining = Math.max(0, state.dayRemaining - dt);
      if (state.dayRemaining <= 60 && !warned) { warned = true; emit('wave-warning', { remaining: state.dayRemaining }); }
      if (state.dayRemaining <= 0) startNight();
    } else combat(dt);
  }
  function advanceTime(seconds) {
    accumulator += seconds;
    while (accumulator >= 0.25 && state.phase !== 'lost') { accumulator -= 0.25; step(0.25); }
    if (state.phase === 'lost') accumulator = 0;
  }
  if (saved) {
    Object.assign(state, saved.state);
    state.timedConstruction = saved.state.timedConstruction ?? false;
    state.progressionEnabled = saved.state.progressionEnabled ?? saved.state.timedConstruction ?? false;
    state.progressionLevel = saved.state.progressionLevel ?? getStage(saved.state).level;
    ({ nextId, accumulator, economyClock, trafficClock, revision, warned, milestone, wasBlackout } = saved.runtime);
    cells.clear();
    for (const b of state.buildings) for (const p of footprint(b)) cells.set(key(p.x, p.z), b);
    hall = state.buildings.find(b => b.type === 'townhall') || { ...hall, hp: 0 };
    roads.cells.clear();
    for (const k of saved.roads) roads.cells.add(k);
    roads.version = saved.runtime.roadVersion;
    events.splice(0, events.length, ...saved.runtime.events);
    if (state.expansionEnabled && saved.state.incidents === undefined) state.incidents.nextTick += state.tick;
  }
  incidentStatus = incidentEffectMap(state);
  return {
    state, roads, terrain, place, bulldoze, repair, spend, rotateWall, effectsFor,
    research(id) { const result = startResearch(state, id); if (result.notice) notices([result.notice]); return result; },
    upgrade(x, z) { const result = startUpgrade(state, valid(x, z) ? cells.get(key(x, z)) : undefined, BUILDINGS); if (result.notice) notices([result.notice]); return result; },
    specialize(name) { return setSpecialization(state, name); },
    respondIncident(id) {
      const result = respondIncident(state, id);
      if (result.notice) notices([result.notice]);
      incidentStatus = incidentEffectMap(state);
      if (result.ok) { utilities('power'); utilities('water'); }
      return result;
    },
    buildingAt(x, z) { return valid(x, z) ? cells.get(key(x, z)) : undefined; },
    snapshot() {
      return JSON.parse(JSON.stringify({ version: 1, state, roads: [...roads.cells], runtime: {
        seed, eventSeed, nextId, accumulator, economyClock, trafficClock, revision, warned, milestone, wasBlackout, roadVersion: roads.version, events
      } }));
    },
    skipToNight() {
      if (state.mode !== 'defense' || state.phase !== 'day' || state.rebuildRemaining > 0 || state.dayRemaining <= 60) return false;
      // Deliberately simulate, never jump the clock: economy, traffic and civic notices all run.
      advanceTime(state.dayRemaining - 60);
      return true;
    },
    setTaxRate(rate) { if (!Number.isFinite(rate) || rate < 0 || rate > 0.3) throw new RangeError('Tax rate must be 0..0.3'); state.taxRate = rate; },
    setSpeed(speed) { if (![0, 1, 3, 10].includes(speed)) throw new RangeError('Speed must be 0, 1, 3 or 10'); state.speed = speed; },
    setMode(value) {
      if (!['free', 'defense'].includes(value)) throw new RangeError('Unknown mode');
      if (state.phase === 'lost' || state.rebuildRemaining > 0) return false;
      state.mode = value; state.phase = 'day'; state.dayRemaining = 240; state.zombies = []; state.pendingZombies = 0; state.defenders = []; warned = false;
      return true;
    },
    update(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Delta must be nonnegative seconds');
      // Fixed steps preserve bite math and occupancy at 10x. Call repeatedly for headless long runs.
      advanceTime(seconds * state.speed);
    },
    drainEvents() { return events.splice(0); }
  };
}
