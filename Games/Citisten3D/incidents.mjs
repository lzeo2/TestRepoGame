// Spatial hazards use only the parent's quarter-second clock and a private hash.
const KINDS = ['fire', 'outage', 'flood'];
const COST = { fire: 90, outage: 70, flood: 110 };
const PROTECTED = new Set(['townhall', 'wall', 'watchtower']);
const neutral = () => ({ powerOut: false, waterOut: false, productionMultiplier: 1, unsafe: false });
const finite = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
const integer = (n, lo, hi) => Number.isSafeInteger(n) && n >= lo && n <= hi;
const quarter = n => finite(n, 0, 60) && Number.isInteger(n * 4);
const fail = reason => { throw new RangeError(`Invalid incidents: ${reason}`); };
function hash(seed, ordinal, salt = 0) {
  let n = (seed ^ Math.imul(ordinal + 1, 0x9e3779b9) ^ salt) >>> 0;
  n = Math.imul(n ^ n >>> 16, 0x21f0aaad);
  n = Math.imul(n ^ n >>> 15, 0x735a2d97);
  return (n ^ n >>> 15) >>> 0;
}
const interval = (seed, ordinal) => 480 + hash(seed, ordinal, 17) % 241;
const complete = b => b.hp > 0 && (b.constructionRemaining ?? 0) === 0;
const eligible = (b, definitions) => complete(b) && !PROTECTED.has(b.type) &&
  !(definitions?.[b.type]?.damage > 0) && !(definitions?.[b.type]?.range > 0);
const position = (p, size) => p && integer(p.x, 0, size - 1) && integer(p.z, 0, size - 1);
const tileKey = p => `${p.x},${p.z}`;

export function createIncidentState(seed) {
  if (!integer(seed, 0, 0xffffffff)) fail('seed');
  return { seed, active: [], nextTick: interval(seed, 0), ordinal: 0 };
}

export function validateIncidents(state, definitions) {
  if (state?.expansionEnabled !== true) return true;
  if (!integer(state.size, 12, 200) || !integer(state.tick, 0, 1e9) ||
      (state.time !== undefined && (!finite(state.time, 0, 250000000) || state.time !== state.tick / 4))) fail('grid/clock');
  if (!finite(state.population ?? 0, 0, 1e7)) fail('population');
  if (state.difficulty !== undefined && !['easy', 'normal', 'hard', 0, 1, 2].includes(state.difficulty)) fail('difficulty');
  const scheduler = state.incidents;
  if (!scheduler || typeof scheduler !== 'object' || Array.isArray(scheduler) ||
      !integer(scheduler.seed, 0, 0xffffffff) || !integer(scheduler.ordinal, 0, 1e9) ||
      !integer(scheduler.nextTick, 0, 1e9) || scheduler.nextTick > state.tick + 1440 ||
      !Array.isArray(scheduler.active) || scheduler.active.length > 3) fail('scheduler');
  if (!Array.isArray(state.buildings) || state.buildings.length > state.size * state.size) fail('buildings');
  const buildings = new Map(), occupied = new Set();
  for (const b of state.buildings) {
    if (!b || !integer(b.id, 1, 1e9) || buildings.has(b.id) || !position(b, state.size) ||
        typeof b.type !== 'string' || !finite(b.hp, 0, 1e6) || !finite(b.maxHp, 1, 1e6) || b.hp > b.maxHp ||
        !finite(b.constructionRemaining ?? 0, 0, 3600) ||
        (b.powered !== undefined && typeof b.powered !== 'boolean') ||
        (b.watered !== undefined && typeof b.watered !== 'boolean')) fail('building');
    if (definitions && (!Object.hasOwn(definitions, b.type) || !definitions[b.type] ||
        !finite(definitions[b.type].serviceRadius ?? 0, 0, 200) ||
        !finite(definitions[b.type].damage ?? 0, 0, 1e6) ||
        !finite(definitions[b.type].range ?? 0, 0, 200))) fail('definition');
    if (occupied.has(tileKey(b))) fail('overlapping centers');
    occupied.add(tileKey(b)); buildings.set(b.id, b);
  }
  let lastOrdinal = -1, lastTick = -1;
  const targeted = new Set();
  for (const e of scheduler.active) {
    if (!e || typeof e.id !== 'string' || !/^incident-(0|[1-9]\d{0,8})$/.test(e.id)) fail('id');
    const ordinal = Number(e.id.slice(9));
    if (ordinal <= lastOrdinal || ordinal >= scheduler.ordinal || !KINDS.includes(e.type) ||
        !position(e, state.size) || !finite(e.severity, 0, 1) || e.severity === 0 ||
        !quarter(e.remaining) || e.remaining === 0 || !quarter(e.total) || e.total < 24 ||
        e.remaining > e.total || !integer(e.startTick, 0, state.tick) || e.startTick < lastTick ||
        e.remaining > e.total - Math.max(0, state.tick - e.startTick - 1) / 4 ||
        !Array.isArray(e.buildingIds) || e.buildingIds.length < 1 || e.buildingIds.length > 8 ||
        !Array.isArray(e.tiles) || e.tiles.length !== e.buildingIds.length) fail('record');
    const tiles = new Set();
    for (const p of e.tiles) {
      if (!position(p, state.size) || tiles.has(tileKey(p))) fail('tiles');
      tiles.add(tileKey(p));
    }
    if (e.x !== e.tiles[0].x || e.z !== e.tiles[0].z) fail('center');
    let lastId = 0;
    for (const id of e.buildingIds) {
      if (!integer(id, 1, 1e9) || id <= lastId || targeted.has(id)) fail('targets');
      const b = buildings.get(id);
      // Missing/dead/unfinished targets are removed on the next advance, not kept as FX.
      if (b && (PROTECTED.has(b.type) || definitions?.[b.type]?.damage > 0 ||
          definitions?.[b.type]?.range > 0 || !tiles.has(tileKey(b)))) fail('protected/spatial target');
      targeted.add(id); lastId = id;
    }
    lastOrdinal = ordinal; lastTick = e.startTick;
  }
  if (scheduler.active.length && scheduler.nextTick <= lastTick) fail('schedule order');
  return true;
}

function effectsUnchecked(state, building) {
  const result = neutral();
  for (const e of state.incidents.active) if (e.buildingIds.includes(building.id)) {
    if (e.type === 'outage') { result.powerOut = true; result.productionMultiplier = 0; }
    if (e.type === 'fire') {
      result.unsafe = true;
      result.productionMultiplier = Math.min(result.productionMultiplier, 1 - e.severity);
    }
    if (e.type === 'flood') {
      result.waterOut = true; result.unsafe = true;
      result.productionMultiplier = Math.min(result.productionMultiplier, 0.5);
    }
  }
  return result;
}
// Validate once for the simulation's bounded per-step lookup, not once per lot.
export function incidentEffectMap(state) {
  const result = new Map();
  if (state?.expansionEnabled !== true) return result;
  validateIncidents(state);
  const targets = new Set(state.incidents.active.flatMap(e => e.buildingIds));
  for (const b of state.buildings) if (targets.has(b.id) && eligible(b)) result.set(b.id, effectsUnchecked(state, b));
  return result;
}

export function incidentEffects(state, building) {
  if (state?.expansionEnabled !== true) return neutral();
  validateIncidents(state);
  const actual = state.buildings.find(b => b.id === building?.id);
  return actual && eligible(actual) ? effectsUnchecked(state, actual) : neutral();
}

function notice(state, e, reason) {
  return { type: reason === 'started' ? 'incident-start' : 'incident-end',
    id: e.id, kind: e.type, reason, x: e.x, z: e.z, time: state.time ?? state.tick / 4 };
}
function end(state, e, reason, notices) {
  state.incidents.active.splice(state.incidents.active.indexOf(e), 1);
  notices.push(notice(state, e, reason));
}
function retainTargets(e, rows) {
  e.buildingIds = rows.map(b => b.id).sort((a, b) => a - b);
  const positions = new Set(rows.map(tileKey));
  e.tiles = e.tiles.filter(p => positions.has(tileKey(p)));
  e.x = e.tiles[0].x; e.z = e.tiles[0].z;
}
function floodable(b, terrain, size) {
  if (!terrain || typeof terrain.isWater !== 'function') return false;
  const water = (x, z) => {
    const value = terrain.isWater(x, z);
    if (typeof value !== 'boolean') fail('terrain water');
    return value;
  };
  if (water(b.x, b.z)) return false;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) {
    const x = b.x + dx, z = b.z + dz;
    if (x >= 0 && z >= 0 && x < size && z < size && water(x, z)) return true;
  }
  return false;
}

export function advanceIncidents(state, dt, definitions, terrain, damage) {
  if (dt !== 0 && dt !== 0.25) fail('step must be 0 or 0.25');
  if (state?.expansionEnabled !== true) return [];
  validateIncidents(state, definitions);
  if (dt === 0 || state.phase === 'lost') return [];
  const scheduler = state.incidents;
  const targets = state.buildings.filter(b => eligible(b, definitions)).sort((a, b) => a.id - b.id);
  if (scheduler.active.some(e => e.type === 'fire') && typeof damage !== 'function') fail('damage hook');
  // Resolve untrusted terrain callbacks before any lifecycle mutation or damage.
  let planned = null;
  if (state.tick >= scheduler.nextTick && scheduler.active.length < 3) {
    const busy = new Set(scheduler.active.flatMap(e => e.buildingIds));
    const available = targets.filter(b => !busy.has(b.id));
    const first = hash(scheduler.seed, scheduler.ordinal) % 3;
    for (let attempt = 0; attempt < 3 && !planned; attempt++) {
      const kind = KINDS[(first + attempt) % 3];
      const pool = kind === 'flood' ? available.filter(b => floodable(b, terrain, state.size)) : available;
      if (!pool.length) continue;
      if (kind === 'fire' && typeof damage !== 'function') fail('damage hook');
      const anchor = pool[hash(scheduler.seed, scheduler.ordinal, 29) % pool.length];
      const chosen = pool.filter(b => Math.hypot(b.x - anchor.x, b.z - anchor.z) <= 3)
        .sort((a, b) => Math.hypot(a.x - anchor.x, a.z - anchor.z) - Math.hypot(b.x - anchor.x, b.z - anchor.z) || a.id - b.id)
        .slice(0, kind === 'fire' ? 2 : 8);
      const difficulty = state.difficulty === 'hard' || state.difficulty === 2 ? 0.1 :
        state.difficulty === 'easy' || state.difficulty === 0 ? -0.05 : 0;
      const severity = Math.min(0.6, Math.max(0.1, 0.18 + Math.min(0.22, (state.population ?? 0) / 10000) + difficulty + hash(scheduler.seed, scheduler.ordinal, 71) % 9 / 100));
      const total = { fire: 24, outage: 32, flood: 40 }[kind] + hash(scheduler.seed, scheduler.ordinal, 43) % 9;
      planned = { id: `incident-${scheduler.ordinal}`, type: kind, x: anchor.x, z: anchor.z,
        buildingIds: chosen.map(b => b.id).sort((a, b) => a - b),
        tiles: chosen.map(b => ({ x: b.x, z: b.z })), severity, remaining: total, total, startTick: state.tick };
    }
  }
  const notices = [];
  for (const e of [...scheduler.active]) {
    const alive = targets.filter(b => e.buildingIds.includes(b.id));
    if (!alive.length) { end(state, e, 'targets-gone', notices); continue; }
    retainTargets(e, alive);
    let covered = false;
    if (e.type === 'fire') {
      covered = alive.every(b => state.buildings.some(station => {
        if (station.type !== 'fire' || !complete(station) || !station.powered || !station.watered) return false;
        const effect = effectsUnchecked(state, station);
        return !effect.powerOut && !effect.waterOut && !effect.unsafe &&
          Math.hypot(station.x - b.x, station.z - b.z) <= (definitions?.fire?.serviceRadius ?? 16);
      }));
      if (covered) e.severity = Math.max(0, e.severity - dt * 0.025);
    }
    e.remaining = Math.max(0, e.remaining - dt * (covered ? 3 : 1));
    if (e.remaining === 0 || e.severity <= 0.02) { end(state, e, covered ? 'services' : 'expired', notices); continue; }
    if (e.type === 'fire') for (const b of alive) damage(b, Math.min(b.hp, dt * e.severity * 2), 'incident');
    // The parent hook can remove a destroyed building from its authoritative array.
    const surviving = state.buildings.filter(b => e.buildingIds.includes(b.id) && eligible(b, definitions)).sort((a, b) => a.id - b.id);
    if (!surviving.length) end(state, e, 'targets-gone', notices);
    else retainTargets(e, surviving);
  }
  if (state.tick >= scheduler.nextTick) {
    scheduler.ordinal++;
    scheduler.nextTick = state.tick + interval(scheduler.seed, scheduler.ordinal);
    if (planned) { scheduler.active.push(planned); notices.push(notice(state, planned, 'started')); }
  }
  return notices;
}

export function respondIncident(state, id) {
  const reject = reason => ({ ok: false, reason, cost: 0 });
  if (state?.expansionEnabled !== true) return reject('Expansion disabled');
  validateIncidents(state);
  if (state.phase === 'lost') return reject('City has fallen');
  if (typeof id !== 'string') return reject('Unknown incident');
  const e = state.incidents.active.find(e => e.id === id);
  if (!e) return reject('Unknown incident');
  if (!e.buildingIds.some(id => state.buildings.some(b => b.id === id && eligible(b)))) return reject('No affected buildings');
  const cost = COST[e.type];
  if (!finite(state.budget, 0, 1e12) || state.budget < cost) return reject('Insufficient budget');
  const response = notice(state, e, 'response');
  state.budget -= cost;
  state.incidents.active.splice(state.incidents.active.indexOf(e), 1);
  return { ok: true, reason: 'Incident resolved', cost, notice: response };
}
