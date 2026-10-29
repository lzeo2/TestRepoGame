import { footprintLots } from './footprints.mjs';
import { createRiverTerrain } from './river-data.mjs';
import { CITY_STAGES } from './progression.mjs';
import { BUILD_TIMES } from './city-content.mjs';
import { validateDevelopment, effectiveBuilding, TECHNOLOGIES } from './development.mjs';
import { validateEconomy } from './production.mjs';
import { validateIncidents } from './incidents.mjs';

// Save data is untrusted. Validate completely before touching a caller's RoadGrid.
export function readSnapshot(input, BUILDINGS, CITY_EVENTS, MILESTONES, lotSize = 10) {
  const require = (condition, message = 'Invalid city snapshot') => { if (!condition) throw new RangeError(message); };
  const integer = (n, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
  const number = (n, min = -Infinity, max = Infinity) => Number.isFinite(n) && n >= min && n <= max;
  let nodes = 0;
  function json(value, depth = 0) {
    require(++nodes <= 2000000 && depth <= 10);
    if (value === null || typeof value === 'boolean') return;
    if (typeof value === 'number') { require(number(value)); return; }
    if (typeof value === 'string') { require(value.length <= 512); return; }
    require(value && typeof value === 'object' && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype));
    if (Array.isArray(value)) require(Object.keys(value).length === value.length);
    for (const [key, item] of Object.entries(value)) {
      require(!['__proto__', 'constructor', 'prototype'].includes(key)); json(item, depth + 1);
    }
  }
  json(input);
  require(input.version === 1 && input.state && input.runtime && Array.isArray(input.roads));
  const s = input.state, r = input.runtime, size = s.size;
  require(s.expansionEnabled === undefined || typeof s.expansionEnabled === 'boolean', 'Invalid expansion mode');
  validateDevelopment(s, BUILDINGS); validateEconomy(s); validateIncidents(s, BUILDINGS);
  if (s.economy?.breakdown !== undefined) {
    require(s.economy.breakdown && typeof s.economy.breakdown === 'object');
    for (const key of ['taxIncome', 'serviceIncome', 'exportRevenue', 'importCost', 'upkeep']) require(number(s.economy.breakdown[key], 0, 1e12));
    require(number(s.economy.breakdown.netIncome, -1e12, 1e12));
  }
  require(Array.isArray(r.events) && r.events.length <= 100000 && r.events.every(e => e && typeof e.type === 'string' && number(e.time, 0, s.time)));
  require(integer(size, 12, 200) && ['free', 'defense'].includes(s.mode) && ['day', 'night', 'lost'].includes(s.phase));
  for (const key of ['timedConstruction', 'progressionEnabled']) if (s[key] !== undefined) require(typeof s[key] === 'boolean');
  if (s.progressionLevel !== undefined || s.progressionEnabled === true || (s.timedConstruction === true && s.progressionEnabled !== false)) require(integer(s.progressionLevel, 0, 3));
  if (s.terrainLayout !== undefined) require(['legacy-flat', 'river-v1'].includes(s.terrainLayout));
  if (Object.hasOwn(s, 'terrainSeed')) {
    require(integer(s.terrainSeed, 0, 4294967295), 'Invalid saved terrain seed');
    require(['legacy-flat', 'river-v1'].includes(s.terrainLayout), 'Seeded terrain requires a saved layout');
  }
  const terrain = createRiverTerrain(size, s.terrainLayout ?? 'legacy-flat', s.terrainSeed);
  require([0, 1, 3, 10].includes(s.speed) && integer(s.tick) && s.time === s.tick / 4);
  for (const key of ['budget', 'netIncome']) require(number(s[key]));
  for (const key of ['housingCapacity', 'jobs']) if (s[key] !== undefined) require(number(s[key], 0, size * size * 1000));
  if (s.morale !== undefined) require(number(s.morale, 0, 1));
  if (s.moraleFactors !== undefined) require(Array.isArray(s.moraleFactors) && s.moraleFactors.length <= 8 && s.moraleFactors.every(f => typeof f === 'string' && f.length <= 80));
  for (const key of ['dayRemaining', 'population', 'peakPopulation', 'income', 'upkeep', 'townHallHp', 'townHallMaxHp']) require(number(s[key], 0));
  for (const key of ['night', 'score', 'kills', 'pendingZombies']) require(integer(s[key]));
  require(number(s.taxRate, 0, 0.3) && number(s.crime, 0, 1) && s.dayRemaining <= 240 && s.townHallMaxHp === BUILDINGS.townhall.hp && s.townHallHp <= s.townHallMaxHp);
  for (const key of ['residential', 'commercial', 'industrial']) require(number(s.demand?.[key], 0, 1));
  for (const kind of ['power', 'water']) for (const key of ['supply', 'demand', 'served', 'unserved']) require(number(s[kind]?.[key], 0));
  for (const key of ['seed', 'eventSeed']) require(integer(r[key], 0, 4294967295));
  for (const key of ['nextId', 'revision', 'milestone', 'roadVersion']) require(integer(r[key]));
  require(r.nextId > 1 && typeof r.warned === 'boolean' && typeof r.wasBlackout === 'boolean');
  require(integer(r.milestone, 0, MILESTONES.length));
  const nextMilestone = MILESTONES[r.milestone] || null;
  require(nextMilestone === null ? s.nextMilestone === null : s.nextMilestone &&
    ['population', 'name', 'grant'].every(key => s.nextMilestone[key] === nextMilestone[key]));
  require(number(s.rebuildRemaining, 0, 120) && number(s.growthSamplePopulation, 0) && typeof s.growthDiagnosis === 'string');
  if (s.rebuildRemaining > 0) require(s.mode === 'defense' && s.phase === 'day' && s.dayRemaining === s.rebuildRemaining && s.townHallHp === 0 && !s.zombies.length && !s.pendingZombies && !s.defenders.length);
  require(number(r.accumulator, 0, 0.25) && r.accumulator < 0.25 && number(r.economyClock, 0, 1) && r.economyClock < 1 && number(r.trafficClock, 0, 1.5) && r.trafficClock < 1.5);
  const cellKey = n => integer(n, 0, size * size - 1);
  const lot = p => p && integer(p.x, 0, size - 1) && integer(p.z, 0, size - 1);
  const point = p => p && number(p.x, -1, size) && number(p.z, -1, size);
  require(input.roads.length <= size * size && input.roads.every(cellKey) && new Set(input.roads).size === input.roads.length);
  const ids = new Set(), lots = new Set(), roads = new Set(input.roads);
  const hasRoad = (x, z) => integer(x, 0, size - 1) && integer(z, 0, size - 1) && roads.has(z * size + x);
  for (const k of roads) {
    const x = k % size, z = Math.floor(k / size);
    if (!terrain.isWater(x, z)) continue;
    let left = x, right = x;
    while (left >= 0 && terrain.isWater(left, z)) left--;
    while (right < size && terrain.isWater(right, z)) right++;
    require(left >= 0 && right < size, 'Saved bridge needs dry banks');
    for (let i = left; i <= right; i++) require(hasRoad(i, z), 'Saved bridge has an incomplete water crossing');
  }
  for (const [kind, limit] of [['buildings', size * size], ['cars', 80], ['zombies', size * 4 - 4], ['defenders', 24]]) {
    require(Array.isArray(s[kind]) && s[kind].length <= limit);
    for (const a of s[kind]) {
      require(a && integer(a.id, 1, r.nextId - 1) && !ids.has(a.id)); ids.add(a.id);
      require(point(a));
      if (a.heading !== undefined) require(number(a.heading));
      if (kind === 'buildings') {
        require(a.heading === undefined || a.heading === 0, 'Saved buildings cannot rotate');
        if (a.wallRotation !== undefined) require(a.type === 'wall' && integer(a.wallRotation, 0, 3), 'Invalid saved wall rotation');
        require(Object.hasOwn(BUILDINGS, a.type) && lot(a));
        for (const p of footprintLots(a, lotSize)) {
          require(lot(p));
          const k = p.z * size + p.x;
          require(!lots.has(k) && !roads.has(k), 'Saved building footprint overlaps a building or road');
          require(!terrain.isWater(p.x, p.z), 'Saved building footprint is in water'); lots.add(k);
        }
        if (BUILDINGS[a.type].riverbank) require(terrain.isBank(a.x, a.z) || [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dz]) => terrain.isWater(a.x + dx, a.z + dz)), 'Saved river pump needs a dry riverbank');
        require(a.maxHp === BUILDINGS[a.type].hp && number(a.hp, 0, a.maxHp) && number(a.residents, 0, effectiveBuilding(BUILDINGS[a.type], a, s).capacity || 0) && number(a.happiness, 0, 1) && number(a.cooldown));
        const construction = ['constructionRemaining', 'constructionTotal', 'constructionPaidCost'];
        if (s.timedConstruction === true || construction.some(key => a[key] !== undefined)) {
          require(construction.every(key => number(a[key], 0)), 'Invalid saved construction fields');
          require(a.constructionRemaining <= a.constructionTotal && a.constructionTotal <= BUILD_TIMES[a.type] && integer(a.constructionRemaining * 4) && integer(a.constructionTotal * 4), 'Invalid saved construction clock');
          require(a.constructionPaidCost <= BUILDINGS[a.type].cost, 'Saved construction payment exceeds building price');
          if (a.constructionTotal > 0) require(s.timedConstruction === true, 'Timed building requires saved construction mode');
          if (a.type === 'townhall') require(a.constructionTotal === 0 && a.constructionPaidCost === 0);
          if (a.constructionRemaining > 0) require(a.residents === 0 && !a.powered && !a.watered && !a.serviced, 'Unfinished building has operating effects');
        }
        if (a.hp === 0) require(a.type === 'townhall' && (s.rebuildRemaining > 0 || s.phase === 'lost'));
        for (const key of ['powered', 'watered', 'serviced']) require(typeof a[key] === 'boolean');
      } else if (kind === 'cars') {
        require(a.vehicleType === undefined || ['car', 'patrol_car', 'utility_car'].includes(a.vehicleType));
        require(Array.isArray(a.path) && a.path.length >= 2 && a.path.length <= size * size && a.path.every(lot));
        require(Array.isArray(a.points) && a.points.length === a.path.length && a.points.every(point));
        require(integer(a.segment, 0, a.path.length - 2) && number(a.progress, 0, 1) && number(a.heading) && number(a.parkTime) && integer(a.roadVersion) && typeof a.parked === 'boolean' && typeof a.lane === 'string');
        require(a.path.every((p, i) => !i || Math.abs(p.x - a.path[i - 1].x) + Math.abs(p.z - a.path[i - 1].z) === 1));
      } else if (kind === 'zombies') {
        require(cellKey(a.cell) && number(a.hp, 0, 60) && number(a.cooldown));
        require(a.move === null || (lot(a.move) && a.move.key === a.move.z * size + a.move.x && number(a.move.progress, 0, 1)));
      } else require(integer(a.home, 1, r.nextId - 1) && number(a.cooldown));
    }
  }
  const halls = s.buildings.filter(b => b.type === 'townhall');
  require(halls.length === 1 && halls[0].hp === s.townHallHp);
  if (s.phase === 'lost') require(s.townHallHp === 0 && s.rebuildRemaining === 0);
  require(Array.isArray(s.cityEvents) && s.cityEvents.length <= size * size);
  function civic(e, tick) {
    require(e && typeof e === 'object');
    const def = CITY_EVENTS.find(d => d.type === e.type);
    require(def && ['title', 'description', 'durationTicks'].every(key => e[key] === def[key]));
    require(integer(e.startTick, 240, tick) && (e.startTick - 240) % 960 === 0 && e.id === `civic-${(e.startTick - 240) / 960}`);
    require(CITY_EVENTS[((e.startTick - 240) / 960) % CITY_EVENTS.length].type === e.type);
    require(typeof e.district === 'string' && /^\d+,\d+$/.test(e.district) && e.district.split(',').every(n => integer(Number(n), 0, Math.floor((size - 1) / 8))));
  }
  const events = new Set();
  for (const e of s.cityEvents) {
    civic(e, s.tick);
    require(!e.durationTicks || s.tick < e.startTick + e.durationTicks);
    const key = `${e.type}:${e.district}`; require(!events.has(key)); events.add(key);
  }
  for (const e of r.events) {
    // UI formats its whole message table eagerly, even fields belonging to another event type.
    for (const key of ['night', 'population', 'grant', 'remaining', 'cost', 'refund', 'total']) if (e[key] !== undefined) require(number(e[key], 0));
    if (e.name !== undefined) require(typeof e.name === 'string');
    switch (e.type) {
      case 'shot':
        for (const p of [e.from, e.to]) require(p && number(p.x, 0) && p.x < size && number(p.z, 0) && p.z < size, 'Invalid saved shot pose');
        require(['tower', 'citizen'].includes(e.source) && integer(e.target, 1, r.nextId - 1));
        break;
      case 'city-event-start':
      case 'city-event-end':
        // Notices can outlive their active record and the entities/district buildings that produced them.
        civic(e.event, e.time * 4);
        if (e.type === 'city-event-start') require(e.event.startTick === e.time * 4);
        else require(e.reason === 'repaired' ? e.event.type === 'water-main-burst'
          : e.reason === 'expired' && e.event.durationTicks > 0 && e.time * 4 >= e.event.startTick + e.event.durationTicks);
        break;
      case 'blackout': require(typeof e.active === 'boolean'); break;
      case 'wave': require(integer(e.night, 1)); break;
      case 'wave-warning': require(number(e.remaining, 0, 60)); break;
      case 'milestone':
        require(MILESTONES.some(m => ['population', 'name', 'grant'].every(key => e[key] === m[key])));
        break;
      case 'stage-earned':
        require(integer(e.level, 1, 3) && e.level <= s.progressionLevel && ['name', 'grant'].every(key => e[key] === CITY_STAGES[e.level][key]));
        break;
      case 'research-started':
      case 'research-complete': {
        const def = Object.hasOwn(TECHNOLOGIES, e.id) && TECHNOLOGIES[e.id];
        require(def && e.label === def.label && e.cost === def.cost && e.total === def.duration); break;
      }
      case 'upgrade-started':
      case 'upgrade-complete': {
        const def = Object.hasOwn(BUILDINGS, e.buildingType) && BUILDINGS[e.buildingType];
        require(def && integer(e.id, 1, r.nextId - 1) && integer(e.level, 1, 2));
        require(e.label === (def.label || e.buildingType) && e.cost === Math.ceil(def.cost * (e.level === 1 ? .75 : 1.5)) && e.total === (e.level === 1 ? 12 : 24)); break;
      }
      case 'incident-start':
      case 'incident-end':
        require(typeof e.id === 'string' && /^incident-(0|[1-9]\d{0,8})$/.test(e.id) && ['fire', 'outage', 'flood'].includes(e.kind));
        require(lot(e) && (e.type === 'incident-start' ? e.reason === 'started' : ['expired', 'services', 'response', 'targets-gone'].includes(e.reason))); break;
      case 'rotated': require(integer(e.id, 1, r.nextId - 1) && integer(e.wallRotation, 0, 3)); break;
      case 'construction-started': require(integer(e.id, 1, r.nextId - 1) && number(e.total, 0)); break;
      case 'construction-complete': require(integer(e.id, 1, r.nextId - 1)); break;
      case 'construction-cancelled': require(integer(e.id, 1, r.nextId - 1) && number(e.refund, 0)); break;
      case 'hall-fallen': require(number(e.remaining, 0, 120) && number(e.cost, 0)); break;
      case 'hall-rebuilt': require(number(e.cost, 0)); break;
      // These notices have no payload-reading runtime consumer.
      default: require(['placed', 'removed', 'repaired', 'damaged', 'destroyed', 'kill', 'night-survived', 'lost'].includes(e.type));
    }
  }
  return JSON.parse(JSON.stringify(input));
}
