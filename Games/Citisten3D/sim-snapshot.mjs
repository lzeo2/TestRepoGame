// Save data is untrusted. Validate completely before touching a caller's RoadGrid.
export function readSnapshot(input, BUILDINGS, CITY_EVENTS, MILESTONES) {
  const require = condition => { if (!condition) throw new RangeError('Invalid city snapshot'); };
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
  require(Array.isArray(r.events) && r.events.length <= 100000 && r.events.every(e => e && typeof e.type === 'string' && number(e.time, 0, s.time)));
  require(integer(size, 12, 200) && ['free', 'defense'].includes(s.mode) && ['day', 'night', 'lost'].includes(s.phase));
  require([0, 1, 3, 10].includes(s.speed) && integer(s.tick) && s.time === s.tick / 4);
  for (const key of ['budget', 'netIncome']) require(number(s[key]));
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
  for (const [kind, limit] of [['buildings', size * size], ['cars', 80], ['zombies', size * 4 - 4], ['defenders', 24]]) {
    require(Array.isArray(s[kind]) && s[kind].length <= limit);
    for (const a of s[kind]) {
      require(a && integer(a.id, 1, r.nextId - 1) && !ids.has(a.id)); ids.add(a.id);
      require(point(a));
      if (kind === 'buildings') {
        require(Object.hasOwn(BUILDINGS, a.type) && lot(a));
        const k = a.z * size + a.x;
        require(!lots.has(k) && !roads.has(k)); lots.add(k);
        require(a.maxHp === BUILDINGS[a.type].hp && number(a.hp, 0, a.maxHp) && number(a.residents, 0, 64) && number(a.happiness, 0, 1) && number(a.cooldown));
        if (a.hp === 0) require(a.type === 'townhall' && (s.rebuildRemaining > 0 || s.phase === 'lost'));
        for (const key of ['powered', 'watered', 'serviced']) require(typeof a[key] === 'boolean');
      } else if (kind === 'cars') {
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
  const events = new Set();
  for (const e of s.cityEvents) {
    const def = CITY_EVENTS.find(d => d.type === e.type);
    require(def && ['title', 'description', 'durationTicks'].every(key => e[key] === def[key]));
    require(integer(e.startTick, 240, s.tick) && (e.startTick - 240) % 960 === 0 && e.id === `civic-${(e.startTick - 240) / 960}`);
    require(CITY_EVENTS[((e.startTick - 240) / 960) % CITY_EVENTS.length].type === e.type);
    require(!e.durationTicks || s.tick < e.startTick + e.durationTicks);
    require(typeof e.district === 'string' && /^\d+,\d+$/.test(e.district) && e.district.split(',').every(n => integer(Number(n), 0, Math.floor((size - 1) / 8))));
    const key = `${e.type}:${e.district}`; require(!events.has(key)); events.add(key);
  }
  return JSON.parse(JSON.stringify(input));
}
