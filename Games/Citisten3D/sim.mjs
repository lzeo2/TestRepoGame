import { RoadGrid } from './roads.mjs';
import { readSnapshot } from './sim-snapshot.mjs';

export const BUILDINGS = Object.freeze({
  residential: { cost: 90, hp: 100, upkeep: 0.015, power: 0.3, water: 0.4, capacity: 64 },
  commercial: { cost: 120, hp: 140, upkeep: 0.02, power: 1, water: 0.7, jobs: 32 },
  industrial: { cost: 150, hp: 180, upkeep: 0.025, power: 2, water: 1, jobs: 96 },
  power: { cost: 1400, hp: 260, upkeep: 0.18, power: 0, water: 0, supply: 80 },
  water: { cost: 1000, hp: 220, upkeep: 0.12, power: 0, water: 0, supply: 100 },
  police: { cost: 650, hp: 200, upkeep: 0.07, power: 1, water: 1 },
  fire: { cost: 650, hp: 200, upkeep: 0.07, power: 1, water: 1 },
  park: { cost: 180, hp: 80, upkeep: 0.025, power: 0.1, water: 0.5 },
  townhall: { cost: 0, hp: 600, upkeep: 0.08, power: 1, water: 1 },
  wall: { cost: 45, hp: 350, upkeep: 0.005, power: 0, water: 0 },
  watchtower: { cost: 300, hp: 220, upkeep: 0.04, power: 0.3, water: 0.1, range: 8, damage: 18 }
});
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

export function createSimulation({ size = 200, mode = 'free', seed = 1, roads, snapshot } = {}) {
  const saved = snapshot === undefined ? null : readSnapshot(snapshot, BUILDINGS, CITY_EVENTS);
  if (saved) { size = saved.state.size; mode = saved.state.mode; seed = saved.runtime.seed; }
  roads ??= new RoadGrid(size);
  seed >>>= 0;
  if (!Number.isInteger(size) || size < 12 || size > 200 || roads.size !== size) throw new RangeError('Grid size must be 12..200 and match roads');
  if (!['free', 'defense'].includes(mode)) throw new RangeError('Unknown mode');
  const state = {
    size, mode, speed: 1, time: 0, tick: 0, cityEvents: [], phase: 'day', dayRemaining: 240, night: 0,
    score: 0, kills: 0, pendingZombies: 0, population: 0, peakPopulation: 0, budget: 40000,
    income: 0, upkeep: 0, netIncome: 0, taxRate: 0.1, crime: 0,
    demand: { residential: 1, commercial: 0.5, industrial: 0.5 },
    power: { supply: 0, demand: 0, served: 0, unserved: 0 },
    water: { supply: 0, demand: 0, served: 0, unserved: 0 },
    buildings: [], cars: [], zombies: [], defenders: [], townHallHp: 600, townHallMaxHp: 600
  };
  let nextId = 1, accumulator = 0, economyClock = 0, trafficClock = 0;
  let revision = 0, fieldRevision = '', field = null, warned = false, milestone = 0;
  const cells = new Map(), events = [];
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
  function insert(type, x, z) {
    const def = BUILDINGS[type];
    const b = { id: nextId++, type, x, z, hp: def.hp, maxHp: def.hp, residents: 0, happiness: 0.5, powered: false, watered: false, serviced: false, cooldown: 0 };
    cells.set(key(x, z), b); state.buildings.push(b); revision++;
    emit('placed', { building: { ...b } });
    return b;
  }
  let hall = insert('townhall', Math.floor(size / 2), Math.floor(size / 2));
  function spend(amount) {
    if (!Number.isFinite(amount) || amount < 0 || state.budget < amount || state.phase === 'lost') return false;
    state.budget -= amount; return true;
  }
  function place(type, x, z) {
    if (!Object.hasOwn(BUILDINGS, type) || type === 'townhall') return { ok: false, reason: 'Unknown or protected building' };
    if (state.phase === 'lost') return { ok: false, reason: 'City has fallen' };
    if (!valid(x, z) || cells.has(key(x, z)) || roads.has(x, z)) return { ok: false, reason: 'Choose an empty lot' };
    if (['residential', 'commercial', 'industrial'].includes(type) && !neighbors({ x, z }).some(p => roads.has(p.x, p.z))) return { ok: false, reason: 'Zones need an adjacent road' };
    if (!spend(BUILDINGS[type].cost)) return { ok: false, reason: 'Insufficient budget' };
    return { ok: true, building: insert(type, x, z) };
  }
  function remove(b, type) {
    cells.delete(key(b.x, b.z)); state.buildings.splice(state.buildings.indexOf(b), 1); revision++;
    emit(type, { id: b.id, building: { ...b } });
  }
  function bulldoze(x, z) {
    const b = valid(x, z) && cells.get(key(x, z));
    if (!b || b === hall || state.phase === 'lost') return { ok: false, reason: 'Cannot remove this lot' };
    remove(b, 'removed'); return { ok: true };
  }
  function repair(id, lot) {
    const b = state.buildings.find(b => b.id === id);
    if (state.phase !== 'day') return { ok: false, reason: 'Repair during the day' };
    const target = lot && valid(lot.x, lot.z) ? lot : b;
    const burst = target && state.cityEvents.find(e => e.type === 'water-main-burst' && e.district === districtOf(target));
    if (burst) {
      if (!spend(120)) return { ok: false, reason: 'Insufficient budget' };
      finishCityEvent(burst, 'repaired'); utilities('water');
      return { ok: true, cost: 120, reason: 'Water main repaired: $120' };
    }
    if (!b || b.hp >= b.maxHp) return { ok: false, reason: 'No damage to repair' };
    const cost = Math.ceil((b.maxHp - b.hp) * 0.4);
    if (!spend(cost)) return { ok: false, reason: 'Insufficient budget' };
    b.hp = b.maxHp; state.townHallHp = hall.hp; emit('repaired', { id, cost });
    return { ok: true, cost };
  }
  function damage(b, amount, attacker) {
    const actual = Math.min(b.hp, amount); b.hp -= actual;
    emit('damaged', { id: b.id, amount: actual, hp: b.hp, attacker });
    if (b === hall) state.townHallHp = b.hp;
    if (b.hp > 0) return;
    remove(b, 'destroyed');
    if (b === hall) {
      state.phase = 'lost';
      emit('lost', { score: state.score, peakPopulation: state.peakPopulation, kills: state.kills });
    }
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
    const candidates = state.buildings.filter(b => definition.type !== 'street-festival' || b.type === 'residential');
    const districts = [...new Set((candidates.length ? candidates : [hall]).map(districtOf))].sort();
    const district = districts[((eventSeed + Math.imul(ordinal, 2654435761)) >>> 0) % districts.length];
    if (state.cityEvents.some(e => e.type === definition.type && e.district === district)) return;
    const event = { ...definition, id: `civic-${ordinal}`, district, startTick: state.tick };
    state.cityEvents.push(event);
    emit('city-event-start', { event: { ...event } });
  }

  function utilities(kind) {
    const sources = new Map(state.buildings.filter(b => b.type === kind).map(b => [key(b.x, b.z), b]));
    const reached = new Map(), networks = [];
    // Each connected network owns its supply: spare capacity on an island cannot cross grass.
    for (const [start] of sources) {
      if (reached.has(start)) continue;
      const network = { supply: 0, served: 0, districts: new Map() }, queue = [start];
      networks.push(network); reached.set(start, network);
      for (let i = 0; i < queue.length; i++) {
        const k = queue[i], source = sources.get(k);
        if (source) network.supply += BUILDINGS[source.type].supply;
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
      const load = (BUILDINGS[b.type][kind] + b.residents * (kind === 'power' ? 0.008 : 0.01)) * (kind === 'power' ? coldDemand() : waterDemand(b));
      b[prop] = load === 0; demand += load;
      if (!load) continue;
      const network = neighbors(b).map(p => reached.get(key(p.x, p.z))).find(Boolean);
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
    const active = state.buildings.filter(b => b.powered && b.watered);
    const jobs = active.reduce((n, b) => n + (BUILDINGS[b.type].jobs || 0), 0);
    const police = active.filter(b => b.type === 'police');
    state.crime = inspectionCrime(clamp((state.population - police.length * 600 - 200) / 1800, 0, 1));
    state.demand = {
      residential: clamp(0.55 + (jobs - state.population * 0.65) / 1500 - Math.max(0, state.taxRate - 0.1) * 4, 0, 1),
      commercial: clamp(0.3 + (state.population * 0.3 - jobs * 0.25) / 600, 0, 1),
      industrial: clamp(0.4 + (state.population * 0.65 - jobs) / 1000, 0, 1)
    };
    const services = active.filter(b => ['townhall', 'park', 'police', 'fire'].includes(b.type));
    const homes = state.buildings.filter(b => b.type === 'residential');
    const growth = 2.7 * state.demand.residential * clamp(1.5 - state.taxRate * 5, 0, 1);
    for (const b of homes) {
      b.serviced = services.some(s => distance(b, s) <= 16);
      const safe = b.powered && b.watered && b.serviced && (state.crime < 0.65 || police.some(p => distance(b, p) <= 16));
      b.happiness = clamp((safe ? 0.5 : 0.2) + (happening('street-festival', b) ? 0.2 : 0), 0, 1);
      b.residents = safe ? Math.min(64, b.residents + growth * festivalBoost(b) / Math.max(1, homes.length)) : Math.max(0, b.residents - Math.max(0.2, b.residents * 0.025));
    }
    state.population = homes.reduce((n, b) => n + b.residents, 0);
    state.peakPopulation = Math.max(state.peakPopulation, state.population);
    const parks = active.filter(b => b.type === 'park');
    state.income = taxEffectiveness() * (state.taxRate / 0.1) * (
      homes.reduce((n, b) => n + b.residents * 0.0015 * festivalBoost(b), 0) +
      active.reduce((n, b) => n + (['commercial', 'industrial'].includes(b.type) ? 0.06 * festivalBoost(b) * marketBoost(b, parks) : 0), 0));
    state.upkeep = state.buildings.reduce((n, b) => n + BUILDINGS[b.type].upkeep, 0);
    state.netIncome = state.income - state.upkeep; state.budget += state.netIncome;
    const next = Math.floor(state.population / 500);
    if (next > milestone) { milestone = next; emit('milestone', { population: Math.floor(state.population) }); }
  }

  function roadAtBuilding(b) { return neighbors(b).find(p => roads.has(p.x, p.z)); }
  function spawnCar() {
    if (state.cars.length >= 80 || state.population < 1) return;
    const nodes = state.buildings.filter(b => ['residential', 'commercial', 'industrial'].includes(b.type));
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
    state.cars.push({ id: nextId++, ...points[0], heading: 0, lane, parked: false, path, points, segment: 0, progress: 0, parkTime: 2, roadVersion: roads.version });
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
      for (const q of neighbors(p)) {
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
    const used = new Set(state.zombies.flatMap(z => z.move ? [z.cell, z.move.key] : [z.cell]));
    const start = Math.floor(random() * perimeter.length);
    for (let i = 0; i < perimeter.length && state.pendingZombies && state.zombies.length < perimeter.length; i++) {
      const k = perimeter[(start + i) % perimeter.length];
      if (used.has(k)) continue;
      used.add(k); state.pendingZombies--;
      state.zombies.push({ id: nextId++, ...cell(k), cell: k, hp: 60, cooldown: 0, move: null });
    }
  }
  function startNight() {
    state.phase = 'night'; state.night++; warned = false;
    const count = Math.ceil(12 * 1.15 ** (state.night - 1));
    state.pendingZombies = count; spawnPending();
    const homes = state.buildings.filter(b => b.type === 'residential' && b.residents >= 12);
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
  function combat(dt) {
    spawnPending(); siegeField();
    const occupied = new Set(state.zombies.flatMap(z => z.move ? [z.cell, z.move.key] : [z.cell]));
    for (const b of state.buildings.filter(b => b.type === 'watchtower')) {
      b.cooldown -= dt;
      const target = nearestZombie(b, BUILDINGS.watchtower.range);
      if (target && b.cooldown <= 0) { shoot(b, target, BUILDINGS.watchtower.damage, 'tower'); b.cooldown = 0.8; }
    }
    const threats = state.defenders.length ? state.buildings.filter(b => state.zombies.some(z => distance(b, z) <= 4)) : [];
    for (const c of state.defenders) {
      c.cooldown -= dt;
      // Each citizen rushes to the nearest threatened structure, not an arbitrary enemy across town.
      const threatened = threats.reduce((best, b) => !best || distance(c, b) < distance(c, best) ? b : best, null);
      if (threatened && distance(c, threatened) > 1.5) {
        const dx = threatened.x - c.x, dz = threatened.z - c.z, d = Math.hypot(dx, dz), step = Math.min(d, dt * 1.6);
        const x = c.x + dx / d * step, z = c.z + dz / d * step;
        if (cells.get(key(Math.round(x), Math.round(z)))?.type !== 'wall') { c.x = x; c.z = z; }
      }
      const target = nearestZombie(c, 3.5);
      if (target && c.cooldown <= 0) { shoot(c, target, 10, 'citizen'); c.cooldown = 1.2; }
    }
    for (const z of [...state.zombies]) {
      z.cooldown -= dt;
      if (z.move) {
        z.move.progress = Math.min(1, z.move.progress + dt * (roads.has(z.move.x, z.move.z) ? 1.4 : 0.7));
        const p = cell(z.cell); z.x = p.x + (z.move.x - p.x) * z.move.progress; z.z = p.z + (z.move.z - p.z) * z.move.progress;
        if (z.move.progress >= 1) { occupied.delete(z.cell); z.cell = z.move.key; z.move = null; }
        continue;
      }
      const p = cell(z.cell), here = cells.get(z.cell);
      // Buildings subsequently placed on a zombie's lot are attacked too.
      const options = neighbors(p).filter(q => field[key(q.x, q.z)] < field[z.cell]);
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
        if (state.phase === 'lost') return;
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
    cityHappenings();
    if (economyClock >= 1) { economyClock -= 1; economy(); }
    if (trafficClock >= 1.5) { trafficClock -= 1.5; spawnCar(); }
    traffic(dt);
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
    ({ nextId, accumulator, economyClock, trafficClock, revision, warned, milestone, wasBlackout } = saved.runtime);
    cells.clear();
    for (const b of state.buildings) cells.set(key(b.x, b.z), b);
    hall = state.buildings.find(b => b.type === 'townhall') || { ...hall, hp: 0 };
    roads.cells.clear();
    for (const k of saved.roads) roads.cells.add(k);
    roads.version = saved.runtime.roadVersion;
    events.splice(0, events.length, ...saved.runtime.events);
  }
  return {
    state, roads, place, bulldoze, repair, spend,
    snapshot() {
      return JSON.parse(JSON.stringify({ version: 1, state, roads: [...roads.cells], runtime: {
        seed, eventSeed, nextId, accumulator, economyClock, trafficClock, revision, warned, milestone, wasBlackout, roadVersion: roads.version, events
      } }));
    },
    skipToNight() {
      if (state.mode !== 'defense' || state.phase !== 'day' || state.dayRemaining <= 60) return false;
      // Deliberately simulate, never jump the clock: economy, traffic and civic notices all run.
      advanceTime(state.dayRemaining - 60);
      return true;
    },
    setTaxRate(rate) { if (!Number.isFinite(rate) || rate < 0 || rate > 0.3) throw new RangeError('Tax rate must be 0..0.3'); state.taxRate = rate; },
    setSpeed(speed) { if (![0, 1, 3, 10].includes(speed)) throw new RangeError('Speed must be 0, 1, 3 or 10'); state.speed = speed; },
    setMode(value) {
      if (!['free', 'defense'].includes(value)) throw new RangeError('Unknown mode');
      if (state.phase === 'lost') return false;
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
