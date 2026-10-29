// Original FC core; no upstream imports. Retained-host bridge is opt-in, not served.
// Milliseconds are integer API inputs; 50 ms fixed ticks make partitioned advances exact.
import { compileGeometry, mountPose, solveMount, fittedHit, fittedDistance, fittedHeightAt, clearanceBounds, fittedTargets, launchClear, yawQuaternion, angleDelta } from './fleet-geometry.mjs';
import { createWeather, WEATHER_PRESETS, canAcquireVisual } from './weather/weather.mjs';
export const LIMITS = Object.freeze({ surface: 10, subs: 2, mounts: 4, shells: 64,
  underwater: 8, sensorsPerTeam: 4, contactsPerTeam: 4, sensorChecks: 16,
  eventHistory: 256, replayActions: 4096, tickMs: 50 });
const DEPTHS = ['surfaced', 'shallow', 'deep'];
const copy = x => JSON.parse(JSON.stringify(x));
const fail = message => { throw new TypeError(message); };
const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = (x, lo, hi) => typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi;
const integer = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const idOK = x => typeof x === 'string' && /^[a-zA-Z][a-zA-Z0-9_-]{0,47}$/.test(x);
const teamOK = x => x === 0 || x === 1;
const vector = x => Array.isArray(x) && x.length === 3 && [0, 1, 2].every(i => num(x[i], -100000, 100000));
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const within = (a, b, r) => distance(a, b) <= r;
const ticks = ms => Math.ceil(ms / LIMITS.tickMs);
const bands = a => Array.isArray(a) && a.length > 0 && a.length <= 3 &&
  new Set(a).size === a.length && a.every(x => DEPTHS.includes(x));
function keys(value, allowed) {
  if (!obj(value) || Object.keys(value).some(k => !allowed.includes(k))) fail('Unknown fields');
}
function validateHostSegment(input) {
  keys(input, ['source', 'team', 'weapon', 'from', 'to', 'damage', 'maxFraction']);
  if (!idOK(input.source) || !teamOK(input.team) || !idOK(input.weapon) ||
      !vector(input.from) || !vector(input.to) || !num(input.damage, 0, 10000) || input.damage === 0 ||
      !num(input.maxFraction, 0, 1)) fail('Invalid host segment');
}
function normalizeWeather(input) {
  keys(input, ['config', 'baseVisibility', 'minimumTransmittance']);
  const weather = createWeather(input.config);
  const base = input.baseVisibility ?? {fogBase:0,fogSea:0,fogFalloff:1/300};
  keys(base, ['fogBase', 'fogSea', 'fogFalloff']);
  const minimumTransmittance = input.minimumTransmittance ?? .1;
  canAcquireVisual(base, [0,0,0], [0,0,0], minimumTransmittance);
  const presets = weather.config.allowedPresets.map(id=>({...WEATHER_PRESETS[id],...weather.config.tuning[id]}));
  if (base.fogBase+Math.max(...presets.map(p=>p.fogBase))>.01 || base.fogSea+Math.max(...presets.map(p=>p.fogSea))>.01)
    fail('Composed visibility density out of bounds');
  if (base.fogSea>0 && presets.some(p=>p.fogSea>0) && presets.some(p=>p.fogFalloff!==base.fogFalloff))
    fail('Unsupported mixed sea-fog falloff');
  return {config:copy(weather.config),baseVisibility:copy(base),minimumTransmittance};
}
function weapon(input, weatherEnabled = false) {
  keys(input, ['id', 'medium', 'range', 'speed', 'ttlMs', 'cooldownMs', 'damage', 'depths', 'ammo', 'mount', 'acquisition']);
  if ((weatherEnabled || input.acquisition!==undefined) && !['visual','nonvisual'].includes(input.acquisition)) fail('Explicit acquisition classification required');
  if (!idOK(input.id) || !['surface', 'underwater'].includes(input.medium) ||
      !num(input.range, 1, 1200) || !num(input.speed, 1, 500) ||
      !integer(input.ttlMs, 50, 20000) || !integer(input.cooldownMs, input.medium === 'underwater' ? 6000 : 500, 60000) ||
      !num(input.damage, 0.01, 1000) || !bands(input.depths) ||
      !integer(input.ammo, 0, input.medium === 'underwater' ? 2 : 1000)) fail('Invalid weapon');
  if (input.mount !== undefined && !idOK(input.mount)) fail('Invalid measured mount');
  if (input.medium === 'surface' && input.depths.some(x => x !== 'surfaced')) fail('Surface weapon depth');
  if (input.speed * input.ttlMs / 1000 < input.range) fail('Weapon cannot reach range');
  return copy(input);
}
// Slab intersection returns earliest fraction along a swept segment (including start inside).
function intersect(a, b, min, max) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 3; i++) {
    const d = b[i] - a[i];
    if (Math.abs(d) < 1e-12) { if (a[i] < min[i] || a[i] > max[i]) return null; }
    else {
      const t = [(min[i] - a[i]) / d, (max[i] - a[i]) / d].sort((x, y) => x - y);
      lo = Math.max(lo, t[0]); hi = Math.min(hi, t[1]);
      if (lo > hi) return null;
    }
  }
  return lo;
}
function boxHit(a, b, center, half) {
  return intersect(a, b, center.map((x, i) => x - half[i]), center.map((x, i) => x + half[i]));
}
function validate(config) {
  keys(config, ['mode', 'arena', 'units', 'aircraft', 'matchMs', 'intermissionMs', 'geometry', 'weather']);
  if (config.mode !== 'factions') fail('FC accepts Factions only');
  const weather = config.weather === undefined ? null : normalizeWeather(config.weather);
  const a = config.arena;
  keys(a, ['minX', 'maxX', 'minZ', 'maxZ', 'bottomY', 'cell', 'obstacles']);
  if (![a.minX, a.maxX, a.minZ, a.maxZ].every(x => num(x, -10000, 10000)) ||
      a.maxX - a.minX < 100 || a.maxZ - a.minZ < 100 || !num(a.bottomY, -1000, -20) ||
      !num(a.cell, 10, 200) || !Array.isArray(a.obstacles) || a.obstacles.length > 32) fail('Invalid bounded water arena');
  for (const b of a.obstacles) {
    keys(b, ['min', 'max']);
    if (!vector(b.min) || !vector(b.max) || b.min.some((x, i) => x >= b.max[i])) fail('Invalid obstruction');
  }
  if (!Array.isArray(config.units) || config.units.length < 2 || config.units.length > 12 ||
      !integer(config.matchMs, 1000, 3600000) || !integer(config.intermissionMs, 50, 60000)) fail('Invalid room bounds');
  const models = new Map();
  if (config.geometry !== undefined) {
    if (!Array.isArray(config.geometry) || config.geometry.length > 12) fail('Geometry cap');
    for (const entry of config.geometry) {
      keys(entry, ['id', 'descriptor']);
      if (!idOK(entry.id) || models.has(entry.id)) fail('Invalid model identity');
      models.set(entry.id, compileGeometry(entry.descriptor));
    }
  }
  const names = new Set();
  const counts = [0, 0], capitals = [0, 0], sensors = [0, 0], subs = [0, 0];
  for (const u of config.units) {
    keys(u, ['id', 'team', 'kind', 'capital', 'position', 'half', 'hp', 'speed', 'route', 'weapons', 'sensor', 'sensorPlan', 'depth', 'depthPlan', 'modelId', 'heading', 'turnRateRadS']);
    if (!idOK(u.id) || u.id.startsWith('aircraft_') || names.has(u.id) || !teamOK(u.team) || !['surface', 'sub'].includes(u.kind) ||
        typeof u.capital !== 'boolean' || !vector(u.position) || !vector(u.half) ||
        !u.half.every(x => num(x, 0.25, 200)) || !num(u.hp, 1, 100000) || !num(u.speed, 0, 30) ||
        !Array.isArray(u.route) || u.route.length > 4 || !u.route.every(vector) ||
        !Array.isArray(u.weapons) || u.weapons.length > LIMITS.mounts) fail('Invalid fleet unit');
    if ((u.modelId !== undefined && !models.has(u.modelId)) ||
      (u.heading !== undefined && !num(u.heading, -Math.PI, Math.PI)) ||
      (u.turnRateRadS !== undefined && !num(u.turnRateRadS, 0.01, 0.6))) fail('Invalid model pose');
    names.add(u.id); counts[u.team]++; if (u.capital) capitals[u.team]++;
    if (u.kind === 'sub') { subs[u.team]++; if (u.capital) fail('Sub cannot be capital'); }
    else if (u.position[1] !== 0 || u.depth !== 'surfaced') fail('Surface waterline');
    if (!DEPTHS.includes(u.depth) || !Array.isArray(u.depthPlan) || u.depthPlan.length > 8) fail('Invalid depth state');
    let prev = -1;
    for (const d of u.depthPlan) {
      keys(d, ['atMs', 'depth']);
      if (u.kind !== 'sub' || !integer(d.atMs, 0, 3600000) || d.atMs <= prev || !DEPTHS.includes(d.depth)) fail('Invalid AI depth plan');
      prev = d.atMs;
    }
    const ids = new Set(), mounts = new Set(); let rounds = 0;
    for (const w of u.weapons) {
      weapon(w, weather!==null); if (ids.has(w.id)) fail('Duplicate mount'); ids.add(w.id);
      const g = models.get(u.modelId);
      if (g ? !(w.medium === 'surface' && w.mount === 'main_gun' && g.gun) &&
        !(w.medium === 'underwater' && g.launches.some(l => l.node === w.mount)) : w.mount !== undefined) fail('Capability needs actual compatible mount');
      if (g && mounts.has(w.mount)) fail('Duplicate measured mount');
      if (g) mounts.add(w.mount);
      if (w.medium === 'underwater') rounds += w.ammo;
    }
    if (rounds > 2) fail('Two underwater rounds per unit');
    if (u.sensor !== null) {
      keys(u.sensor, ['enabled', 'range', 'depths']);
      if (typeof u.sensor.enabled !== 'boolean' || !num(u.sensor.range, 1, 1200) || !bands(u.sensor.depths)) fail('Invalid sensor');
      sensors[u.team]++;
    }
    if (u.sensorPlan !== undefined) {
      if (!u.sensor || !Array.isArray(u.sensorPlan) || u.sensorPlan.length > 8) fail('Invalid sensor plan');
      let previous = -1;
      for (const s of u.sensorPlan) {
        keys(s, ['atMs', 'enabled']);
        if (!integer(s.atMs, 0, 3600000) || s.atMs <= previous || typeof s.enabled !== 'boolean') fail('Invalid sensor schedule');
        previous = s.atMs;
      }
    }
  }
  if (config.units.filter(u => u.kind === 'surface').length > LIMITS.surface || subs.some(n => n > 1) ||
      !capitals.every(n => n > 0) || sensors.some(n => n > LIMITS.sensorsPerTeam)) fail('Fleet/capital/sensor cap');
  if (subs.some(Boolean)) for (const t of [0, 1]) {
    if (!config.units.some(u => u.team === t && u.kind === 'surface' && u.sensor?.enabled &&
      ['shallow', 'deep'].every(d => u.sensor.depths.includes(d)) && u.weapons.some(w =>
        w.medium === 'underwater' && ['shallow', 'deep'].every(d => w.depths.includes(d)) && w.ammo > 0))) fail('Sub requires symmetric escort counterplay');
  }
  if (!Array.isArray(config.aircraft) || config.aircraft.length !== 2) fail('Aircraft rosters required');
  for (const roster of config.aircraft) {
    if (!Array.isArray(roster) || roster.length < 1 || roster.length > 20) fail('Invalid aircraft roster');
    const ids = new Set();
    for (const p of roster) {
      keys(p, ['id', 'weapons']);
      if (!idOK(p.id) || names.has(p.id) || ids.has(p.id) || !Array.isArray(p.weapons) || p.weapons.length > 2) fail('Invalid aircraft profile');
      ids.add(p.id); const ws = p.weapons.map(w=>weapon(w,weather!==null));
      if (ws.some(w => w.mount !== undefined)) fail('Aircraft geometry adapter not implemented');
      if (new Set(ws.map(w => w.id)).size !== ws.length || ws.filter(w => w.medium === 'underwater').reduce((s, w) => s + w.ammo, 0) > 2) fail('Aircraft weapon bounds');
    }
  }
  const result = copy(config); if (weather) result.weather = weather;
  return result;
}

export function createFleet(input) {
  const config = validate(input), arena = config.arena;
  const geometry = new Map((config.geometry ?? []).map(e => [e.id, compileGeometry(e.descriptor)]));
  const weather = config.weather ? createWeather(config.weather.config) : null;
  let environmentTick = -1, environmentState = null;
  let units, projectiles, contacts, players = [], aircraft = [], events = [], tick = 0, remainder = 0;
  let round = 0, roundStart = 0, endedAt = null, outcome = null, sequence = 0, projectileId = 0, cursor = 0;
  const actions = [];
  // Private, bounded event-time redactions. Current depth must never unhide old coordinates.
  const eventVisibility = new Map();
  let metrics = { sensorChecks: 0, targetChecks: 0, skippedShots: 0, maxShells: 0, maxUnderwater: 0 };
  const depthY = (u, depth) => depth === 'surfaced' ? 0 : arena.bottomY * (depth === 'shallow' ? 0.25 : 0.65);
  const band = u => {
    const g = geometry.get(u.modelId);
    const top = u.position[1] + (g ? g.clearance.max[1] : u.half[1]);
    return u.kind === 'surface' || top >= 0 ? 'surfaced' : u.position[1] > arena.bottomY * 0.45 ? 'shallow' : 'deep';
  };
  const get = id => units.find(u => u.id === id);
  function environment() {
    if (!weather) return null;
    if (environmentTick!==tick) {
      const sample=weather.sample(tick*LIMITS.tickMs), base=config.weather.baseVisibility;
      environmentState={simulationMs:tick*LIMITS.tickMs,weather:sample,visibility:{
        fogBase:base.fogBase+sample.visibility.fogBase,fogSea:base.fogSea+sample.visibility.fogSea,
        fogFalloff:base.fogSea>0?base.fogFalloff:sample.visibility.fogFalloff},minimumTransmittance:config.weather.minimumTransmittance};
      environmentTick=tick;
    }
    return environmentState;
  }
  function visual(from,to) {
    const e=environment();return !e || canAcquireVisual(e.visibility,from,to,e.minimumTransmittance);
  }
  // Shared fleet intel only: actual aircraft observer positions do not exist in this authority.
  function pointVisible(team,position) {
    return !weather || units.some(u=>u.team===team && u.alive && band(u)==='surfaced' &&
      visual(u.position,position) && !obstructed(u.position,position));
  }
  function unitVisible(team,u) {
    return u.team===team || (!(u.kind==='sub' && band(u)!=='surfaced') && pointVisible(team,u.position));
  }
  function redactEvent(event,team) {
    const hidden = id => {const u=get(id);return u && !unitVisible(team,u);};
    if (hidden(event.unit)) return null;
    const ownUnit=get(event.unit)?.team===team;
    const sourceTeam=get(event.source)?.team ?? aircraft.find(a=>a.id===event.source)?.team ??
      (event.source ? event.sourceTeam ?? (event.type === 'sunk' ? null : event.team) : null);
    const sourceHidden=hidden(event.source) || (weather && sourceTeam!==team && event.position && !pointVisible(team,event.position));
    const view=copy(event);
    if (sourceHidden) {
      if (!['impact','damage','sunk'].includes(event.type)) return null;
      view.source=null;
    }
    if (weather && event.position && !ownUnit && !(event.type==='fire' && sourceTeam===team) && !pointVisible(team,event.position)) return null;
    if (hidden(event.target)) view.target=null;
    return view;
  }
  function emit(type, data = {}) {
    const event = { id: ++sequence, round, tick, type, ...data };
    const views = [0, 1].map(team => redactEvent(event,team));
    events.push(event); eventVisibility.set(event.id, views);
    if (events.length > LIMITS.eventHistory) eventVisibility.delete(events.shift().id);
  }
  function obstructed(a, b, half = [0, 0, 0]) {
    return arena.obstacles.some(o => intersect(a, b, o.min.map((n, i) => n - half[i]), o.max.map((n, i) => n + half[i])) !== null);
  }
  function water(a, b, half = [0, 0, 0], allowTop = false) {
    return [a, b].every(p => p[0] - half[0] >= arena.minX && p[0] + half[0] <= arena.maxX &&
      p[2] - half[2] >= arena.minZ && p[2] + half[2] <= arena.maxZ && p[1] - half[1] > arena.bottomY &&
      p[1] + half[1] <= (allowTop ? half[1] : 0)) && !obstructed(a, b, half);
  }
  function initialize() {
    units = config.units.map(u => ({ ...copy(u), position: [u.position[0], depthY(u, u.depth), u.position[2]],
      maxHp: u.hp, alive: true, previous: null, routeIndex: 0, depthIndex: 0, sensorIndex: 0, transition: null,
      heading: u.heading ?? 0, view: { orientation: yawQuaternion(u.heading ?? 0), angles: {}, spinners: {} },
      weapons: u.weapons.map(w => ({ ...copy(w), ready: tick, target: null })) })).sort((a, b) => a.id.localeCompare(b.id, 'en'));
    for (const u of units) {
      const g = geometry.get(u.modelId);
      if (g) { const radius = Math.hypot(g.clearanceHalf[0],g.clearanceHalf[2]); u.half = [radius,g.clearanceHalf[1],radius]; }
      if (!unitWater(u, u.position, u.position)) fail('Hull outside validated water');
      for (const p of u.route) if (!unitWater(u, [p[0], u.position[1], p[2]], u.position)) fail('Route outside water');
      if (units.some(v => v !== u && boxHit(u.position, u.position, v.position, v.half.map((n, i) => n + u.half[i])) !== null)) fail('Overlapping initial hulls');
      u.previous = [...u.position];
    }
    contacts = [[], []]; projectiles = []; aircraft = []; players.forEach(p => { p.aircraft = null; p.seat = null; });
    cursor = 0; roundStart = tick; endedAt = null; outcome = null;
  }
  initialize();
  function record(action) {
    const last = actions.at(-1);
    // Consecutive clock inputs have no intervening observations/mutations to replay.
    if (action.type === 'advance' && action.ms > 0 && last?.type === 'advance' && last.ms > 0 && last.ms + action.ms <= 10000) {
      last.ms += action.ms; return;
    }
    // ponytail: bounded in-memory replay; stream actions if a match needs more than 4096 state changes.
    if (actions.length >= LIMITS.replayActions) fail('Replay action cap');
    actions.push(copy(action));
  }
  function contact(team, id) { return contacts[team].find(c => c.unit === id && tick - c.observed < ticks(4000) && c.samples >= 2); }
  function estimate(team, target) {
    if (target.kind !== 'sub' || band(target) === 'surfaced') return [...target.position];
    const c = contact(team, target.id); return c ? [arena.minX + (c.cell[0] + 0.5) * arena.cell,
      depthY(target, c.depth), arena.minZ + (c.cell[1] + 0.5) * arena.cell] : null;
  }
  function origin(u, w) { return [u.position[0], w.medium === 'underwater' ? Math.min(-2, u.position[1]) : u.position[1], u.position[2]]; }
  function unitWater(u, from, to) {
    const g = geometry.get(u.modelId); if (!g) return water(from, to, u.half, true);
    const b = clearanceBounds(g, u.heading);
    return [from, to].every(p => p[0]+b.min[0]>=arena.minX && p[0]+b.max[0]<=arena.maxX &&
      p[2]+b.min[2]>=arena.minZ && p[2]+b.max[2]<=arena.maxZ && p[1]+b.min[1]>arena.bottomY && p[1]<=0) &&
      !arena.obstacles.some(o => intersect(from, to, o.min.map((n,i)=>n-b.max[i]), o.max.map((n,i)=>n-b.min[i])) !== null);
  }
  function hullHit(u, from, to, swept = false) {
    const g = geometry.get(u.modelId);
    return g ? fittedHit(g, from, to, u.position, u.heading, swept ? u.previous : u.position) :
      boxHit(from.map((n,i)=>n-(swept?u.previous[i]:u.position[i])), to.map((n,i)=>n-u.position[i]), [0,0,0], u.half);
  }
  function eligible(shooter, w, target) {
    if (!target.alive || target.team === shooter.team || !w.depths.includes(band(target))) return null;
    if (w.medium === 'surface' && (band(shooter) !== 'surfaced' || band(target) !== 'surfaced')) return null;
    const estimated = estimate(shooter.team, target); if (!estimated) return null;
    const g = geometry.get(shooter.modelId), tg = geometry.get(target.modelId);
    const candidates = g && tg && (target.kind !== 'sub' || band(target) === 'surfaced') ? fittedTargets(tg, target.position, target.heading) : [estimated];
    for (let aim of candidates) {
      if (w.medium === 'underwater' && band(target) === 'surfaced') aim[1] = -Math.min(2, target.half[1] / 2);
      const pose = g ? (w.medium === 'underwater' ? mountPose(g,shooter.position,shooter.heading,w.mount) :
        solveMount(g, shooter.position, shooter.heading, w.mount, aim)) :
        { position: origin(shooter,w), angles: {}, direction: null };
      if (!pose) continue;
      const from = pose.position;
      if (g && w.medium === 'underwater') {
        const end=from.map((n,i)=>n+pose.direction[i]*w.range);
        const hidden=target.kind==='sub'&&band(target)!=='surfaced';
        const fraction=hidden ? boxHit(from,end,estimated,[arena.cell/2,10,arena.cell/2]) : hullHit(target,from,end);
        if(fraction===null)continue;
        aim=from.map((n,i)=>n+(end[i]-n)*fraction); pose.angles={};
      }
      if (!within(from, aim, w.range) || obstructed(from, aim)) continue;
      if (w.acquisition==='visual' && !visual(from,aim)) continue;
      if (w.medium === 'underwater' && !water(from, aim)) continue;
      if (g) {
        const end = from.map((n,i)=>n+pose.direction[i]*12);
        if (w.medium==='underwater' ? !launchClear(g,shooter.position,shooter.heading,from,pose.direction) : hullHit(shooter, from, end) !== null) continue;
        if (units.some(u=>u.alive && u.team===shooter.team && u!==shooter && hullHit(u,from,aim)!==null)) continue;
      }
      return { aim, from, angles: pose.angles, direction: pose.direction };
    }
    return null;
  }
  function sensors() {
    for (const team of [0, 1]) contacts[team] = contacts[team].filter(c => get(c.unit)?.alive && tick - c.observed < ticks(12000));
    if (tick % ticks(250)) return;
    const candidates = [];
    for (const u of units) if (u.alive && u.sensor?.enabled) for (const v of units) {
      if (v.alive && v.kind === 'sub' && v.team !== u.team) candidates.push([u, v]);
    }
    const count = Math.min(candidates.length, LIMITS.sensorChecks);
    for (let i = 0; i < count; i++) {
      const [u, v] = candidates[(cursor + i) % candidates.length]; metrics.sensorChecks++;
      if (!u.sensor.depths.includes(band(v)) || !within(u.position, v.position, u.sensor.range) ||
          !water([u.position[0], Math.min(-2, u.position[1]), u.position[2]],
            [v.position[0], Math.min(-2, v.position[1]), v.position[2]])) continue;
      let c = contacts[u.team].find(c => c.unit === v.id);
      if (!c) {
        if (contacts[u.team].length >= LIMITS.contactsPerTeam) continue;
        c = { unit: v.id, samples: 0, observed: -1, cell: [], depth: band(v) }; contacts[u.team].push(c);
      }
      if (c.observed !== tick) c.samples = tick - c.observed >= ticks(4000) ? 1 : Math.min(2, c.samples + 1);
      c.observed = tick; c.depth = band(v);
      // Deliberately coarse cell centers, not exact tracks or per-render-frame refinement.
      c.cell = [Math.floor((v.position[0] - arena.minX) / arena.cell), Math.floor((v.position[2] - arena.minZ) / arena.cell)];
    }
    if (candidates.length) cursor = (cursor + count) % candidates.length;
  }
  function updateView(u, horizontalSpeed, verticalSpeed, turnSpeed) {
    u.view.orientation = yawQuaternion(u.heading);
    const g = geometry.get(u.modelId); if (!g) return;
    const now = tick * LIMITS.tickMs / 1000;
    for (const c of g.controls) {
      if (c.limits_rad == null) {
        const old = u.view.spinners[c.node] ?? {phaseRad:0,rateRadS:0,epochSeconds:now};
        const phase = (old.phaseRad + old.rateRadS * (now-old.epochSeconds)) % (2*Math.PI);
        const fraction = Math.max(0, Math.min(1, horizontalSpeed/Math.max(1,u.speed)));
        u.view.spinners[c.node] = {phaseRad:phase,rateRadS:fraction*Math.min(8,c.mapping?.maximum_rad_s??8),epochSeconds:now};
      } else {
        const source = c.mapping?.source;
        if (source === 'adapter.authoritative_depth_rate_fraction' || source === 'adapter.authoritative_turn_rate_fraction') {
          const fraction = Math.max(-1,Math.min(1,source.includes('depth')?verticalSpeed/10:turnSpeed/(u.turnRateRadS??.3)));
          u.view.angles[c.node] = Math.max(c.limits_rad[0],Math.min(c.limits_rad[1],fraction*Math.max(...c.limits_rad.map(Math.abs))));
        }
      }
    }
  }
  function move() {
    for (const u of units) {
      u.previous = [...u.position]; if (!u.alive) continue;
      while (u.sensorIndex < (u.sensorPlan?.length ?? 0) && tick - roundStart >= ticks(u.sensorPlan[u.sensorIndex].atMs)) {
        u.sensor.enabled = u.sensorPlan[u.sensorIndex++].enabled;
      }
      while (u.depthIndex < u.depthPlan.length && tick - roundStart >= ticks(u.depthPlan[u.depthIndex].atMs)) {
        const d = u.depthPlan[u.depthIndex++].depth;
        u.transition = { start: tick, from: u.position[1], to: depthY(u, d), depth: d };
      }
      let p = [...u.position]; const oldHeading = u.heading, oldRouteIndex = u.routeIndex;
      if (u.transition) {
        const f = Math.min(1, (tick - u.transition.start + 1) / ticks(4000));
        p[1] = u.transition.from + (u.transition.to - u.transition.from) * f;
      }
      if (u.route.length && u.speed > 0) {
        const destination = u.route[u.routeIndex]; const d = Math.hypot(destination[0] - p[0], destination[2] - p[2]);
        const step = Math.min(d, u.speed * LIMITS.tickMs / 1000);
        if (d > 0) {
          const desired = Math.atan2(-(destination[0]-p[0]),-(destination[2]-p[2]));
          if (u.modelId) {
            const limit = (u.turnRateRadS??.3)*LIMITS.tickMs/1000;
            u.heading += Math.max(-limit,Math.min(limit,angleDelta(desired,u.heading)));
            p[0] -= Math.sin(u.heading)*step; p[2] -= Math.cos(u.heading)*step;
          } else { p[0] += (destination[0] - p[0]) / d * step; p[2] += (destination[2] - p[2]) / d * step; u.heading = desired; }
        }
        if (d <= step) u.routeIndex = (u.routeIndex + 1) % u.route.length;
      }
      const blocked = !unitWater(u, u.position, p) || units.some(v => v !== u && v.alive &&
        boxHit(u.position, p, v.position, v.half.map((n, i) => n + u.half[i])) !== null);
      if (blocked) {
        u.heading = oldHeading; u.routeIndex = oldRouteIndex;
        if (u.transition) { u.transition = null; emit('depth-blocked', { unit: u.id }); }
      } else {
        u.position = p;
        if (u.transition && tick - u.transition.start + 1 >= ticks(4000)) { u.depth = u.transition.depth; u.transition = null; }
      }
      const dt = LIMITS.tickMs/1000;
      updateView(u,Math.hypot(u.position[0]-u.previous[0],u.position[2]-u.previous[2])/dt,(u.position[1]-u.previous[1])/dt,angleDelta(u.heading,oldHeading)/dt);
    }
  }
  function launch(shooter, w, from, aim, source, target = null, barrelDirection = null) {
    const mediumCount = projectiles.filter(p => p.medium === w.medium).length;
    if (mediumCount >= (w.medium === 'surface' ? LIMITS.shells : LIMITS.underwater)) { metrics.skippedShots++; return false; }
    const length = distance(from, aim); if (length < 1e-9) return false;
    const velocity = aim.map((n, i) => (barrelDirection ? barrelDirection[i] : (n - from[i]) / length) * w.speed);
    projectiles.push({ id: ++projectileId, source, team: shooter.team, medium: w.medium,
      position: [...from], velocity, remaining: ticks(w.ttlMs), remainingDistance: w.range,
      damage: w.damage, depths: [...w.depths], weapon: w.id });
    w.ammo--; w.ready = tick + ticks(w.cooldownMs);
    emit('fire', { source, target, team: shooter.team, weapon: w.id, medium: w.medium, position: [...from], projectile: projectileId });
    metrics.maxShells = Math.max(metrics.maxShells, projectiles.filter(p => p.medium === 'surface').length);
    metrics.maxUnderwater = Math.max(metrics.maxUnderwater, projectiles.filter(p => p.medium === 'underwater').length);
    return true;
  }
  function attacks() {
    for (const u of units) if (u.alive) for (const w of u.weapons) {
      if (tick % ticks(500) === 0) {
        const valid = units.filter(v => { metrics.targetChecks++; return eligible(u, w, v) !== null; });
        const threatens = v => v.weapons.some(ew => ew.ammo > 0 && units.some(c => c.alive && c.capital && c.team === u.team && eligible(v, ew, c)));
        valid.sort((a, b) => Number(threatens(b)) - Number(threatens(a)) ||
          distance(u.position, estimate(u.team, a)) - distance(u.position, estimate(u.team, b)) || (a.id < b.id ? -1 : 1));
        if (!valid.some(v => v.id === w.target)) w.target = valid[0]?.id ?? null;
      }
      const target = get(w.target); const shot = target && eligible(u, w, target);
      if (shot) Object.assign(u.view.angles, shot.angles);
      if (shot && w.ammo > 0 && tick >= w.ready) launch(u, w, shot.from, shot.aim, u.id, target.id, shot.direction);
    }
  }
  // Fleet projectiles and accepted native host fire share damage/sink authority.
  function applyImpact(hit, attribution, position, damage) {
    emit('impact', { ...attribution, unit: hit.id, position });
    const applied = hit.team === attribution.team ? 0 : Math.min(hit.hp, damage);
    if (applied > 0) {
      hit.hp -= applied;
      emit('damage', { ...attribution, unit: hit.id, damage: applied, hp: hit.hp });
      if (hit.hp === 0) {
        hit.alive = false; updateView(hit,0,0,0); hit.weapons.forEach(w => { w.target = null; w.ammo = 0; });
        contacts.forEach((list, team) => { contacts[team] = list.filter(c => c.unit !== hit.id); });
        emit('sunk', { source: attribution.source, team: hit.team, sourceTeam: attribution.team, unit: hit.id });
      }
    }
    return applied;
  }
  function impacts() {
    const survivors = [];
    for (const p of projectiles) {
      const speed = Math.hypot(...p.velocity);
      const travel = Math.min(p.remainingDistance, speed * LIMITS.tickMs / 1000);
      const end = p.position.map((n, i) => n + p.velocity[i] / speed * travel);
      p.remainingDistance = Math.max(0, p.remainingDistance - travel);
      let hit = null, fraction = 2;
      for (const u of units) if (u.alive && u.id !== p.source) {
        if (p.medium === 'surface' && band(u) !== 'surfaced') continue;
        const t = hullHit(u, p.position, end, true);
        if (t !== null && t < fraction) { hit = u; fraction = t; }
      }
      const wall = arena.obstacles.map(o => intersect(p.position, end, o.min, o.max)).filter(t => t !== null).sort((a, b) => a - b)[0];
      if (wall !== undefined && wall <= fraction) { emit('blocked', { source: p.source, team: p.team, projectile: p.id }); continue; }
      if (hit) {
        applyImpact(hit, { source: p.source, team: p.team, projectile: p.id },
          p.position.map((n, i) => n + (end[i] - n) * fraction), p.depths.includes(band(hit)) ? p.damage : 0);
        continue;
      }
      p.remaining--;
      const inBounds = end[0] >= arena.minX && end[0] <= arena.maxX && end[2] >= arena.minZ && end[2] <= arena.maxZ;
      if (p.remaining > 0 && p.remainingDistance > 1e-9 && inBounds && (p.medium !== 'underwater' || water(p.position, end))) { p.position = end; survivors.push(p); }
      else emit('expired', { source: p.source, team: p.team, projectile: p.id });
    }
    projectiles = survivors;
  }
  function objectives() {
    const living = [0, 1].map(t => units.filter(u => u.team === t && u.capital && u.alive).length);
    if (!living[0] || !living[1] || tick - roundStart >= ticks(config.matchMs)) {
      let winner = living[0] && !living[1] ? 0 : living[1] && !living[0] ? 1 : null;
      let reason = 'capitals';
      if (living.every(Boolean)) {
        const damage = [0, 1].map(t => units.filter(u => u.team !== t && u.capital).reduce((s, u) => s + (1 - u.hp / u.maxHp), 0));
        winner = damage[0] === damage[1] ? null : damage[0] > damage[1] ? 0 : 1; reason = 'time';
      }
      outcome = { winner, reason }; endedAt = tick; projectiles = []; units.forEach(u=>updateView(u,0,0,0)); emit('match-end', outcome);
    }
  }
  function step() {
    tick++;
    if (endedAt !== null) {
      if (tick - endedAt >= ticks(config.intermissionMs)) { round++; initialize(); emit('reset'); }
      return;
    }
    move(); sensors(); attacks(); impacts(); objectives();
  }
  function release(p) {
    const a = aircraft.find(a => a.id === p.aircraft);
    if (a?.seats[0] === p.id) {
      aircraft = aircraft.filter(v => v !== a);
      for (const occupant of players) if (occupant.aircraft === a.id) { occupant.aircraft = null; occupant.seat = null; }
    } else if (a) a.seats[p.seat] = null;
    p.aircraft = null; p.seat = null;
  }
  function request(playerId, input) {
    try {
      if (!obj(input) || !idOK(playerId)) fail('Invalid command');
      const p = players.find(p => p.id === playerId); if (!p) fail('Unauthenticated player');
      if (endedAt !== null) fail('Intermission');
      let selected;
      if (input.type === 'spawn') {
        keys(input, ['type', 'kind']); selected = config.aircraft[p.team].find(a => a.id === input.kind);
        if (!selected) fail('Aircraft not in faction');
      } else if (input.type === 'team') {
        keys(input, ['type', 'team']); if (!teamOK(input.team)) fail('Invalid faction');
      } else if (input.type === 'board' || input.type === 'switch-seat') {
        keys(input, input.type === 'board' ? ['type', 'aircraft', 'seat'] : ['type', 'seat']);
        const id = input.type === 'board' ? input.aircraft : p.aircraft;
        selected = aircraft.find(a => a.id === id);
        if (!integer(input.seat, 0, 1) || !selected || selected.team !== p.team ||
            !config.aircraft[p.team].some(a => a.id === selected.kind) ||
            (selected.seats[input.seat] !== null && selected.seats[input.seat] !== p.id)) fail('Invalid aircraft seat');
        if (p.seat === 0 && selected.id === p.aircraft && input.seat !== 0) fail('Pilot cannot abandon occupied airframe');
      } else if (input.type === 'leave') keys(input, ['type']);
      else fail('Vessel ownership/control forbidden');
      if (actions.length >= LIMITS.replayActions) fail('Replay action cap');
      record({ type: 'request', playerId, input });
      if (input.type === 'spawn') {
        release(p); const a = { id: `aircraft_${p.id}`, kind: selected.id, team: p.team, seats: [p.id, null],
          weapons: selected.weapons.map(w => ({ ...copy(w), ready: tick })) }; aircraft.push(a); p.aircraft = a.id; p.seat = 0;
      } else if (input.type === 'team') { release(p); p.team = input.team; }
      else if (input.type === 'leave') release(p);
      else if (selected.id !== p.aircraft || input.seat !== p.seat) {
        release(p); selected.seats[input.seat] = p.id; p.aircraft = selected.id; p.seat = input.seat;
      }
      return { ok: true };
    } catch (error) { return { ok: false, error: error.message }; }
  }
  return Object.freeze({
    advance(ms) {
      if (!integer(ms, 0, 10000)) fail('advance requires integer milliseconds 0..10000');
      record({ type: 'advance', ms }); remainder += ms;
      while (remainder >= LIMITS.tickMs) { remainder -= LIMITS.tickMs; step(); }
    },
    addPlayer(id, team) {
      if (!idOK(id) || !teamOK(team) || players.length >= 32 || players.some(p => p.id === id)) fail('Invalid player');
      record({ type: 'addPlayer', id, team }); players.push({ id, team, aircraft: null, seat: null });
    },
    request,
    // Trusted current-authority query, never a player command or snapshot field.
    // Unmodelled legacy proxies and all subs are outside this measured surface proof.
    surfaceHeightAt(x, z) {
      let top = null;
      for (const u of units) if (u.alive && u.kind === 'surface') {
        const g = geometry.get(u.modelId);
        const y = g ? fittedHeightAt(g, x, z, u.position, u.heading) : null;
        if (y !== null && (top === null || y > top)) top = y;
      }
      return top;
    },
    surfaceSegment(from, to) {
      if (!vector(from) || !vector(to)) return null;
      let first = null;
      for (const u of units) if (u.alive && u.kind === 'surface' && geometry.has(u.modelId)) {
        const t = hullHit(u, from, to, false);
        if (t !== null && (first === null || t < first)) first = t;
      }
      return first;
    },
    // Trusted adapter, NOT authenticated player/network input. Host already accepted real fire
    // and owns ammo/cooldowns. No missile, underwater, AA or aircraft damage is inferred.
    // Caller passes 1 absent a native hit. Strict < lets native ties win, including endpoint 1.
    resolveHostSegment(input) {
      validateHostSegment(input);
      if (endedAt !== null) fail('Intermission');
      const { source, team, weapon, from, to, damage, maxFraction } = input;
      let hit = null, fraction = maxFraction;
      for (const u of units) if (u.alive && band(u) === 'surfaced') {
        const t = hullHit(u, from, to, true);
        if (t !== null && t < fraction) { hit = u; fraction = t; }
      }
      const wall = arena.obstacles.map(o => intersect(from, to, o.min, o.max))
        .filter(t => t !== null && t < maxFraction).sort((a, b) => a - b)[0];
      if (wall !== undefined && wall <= fraction) {
        record({ type: 'hostSegment', input });
        emit('blocked', { source, team, weapon }); return null;
      }
      if (!hit) return null; // A native bullet's many empty segments do not consume replay capacity.
      record({ type: 'hostSegment', input }); // Reserve capacity before any state/event mutation.
      const position = from.map((n, i) => n + (to[i] - n) * fraction);
      const applied = applyImpact(hit, { source, team, weapon }, position, damage);
      if (!hit.alive) objectives();
      return { unit: hit.id, fraction, position, damage: applied, hp: hit.hp };
    },
    // Trusted accepted native bomb blast. No sensing, occlusion or legacy proxy inference.
    resolveHostBombNearMiss(input) {
      keys(input, ['source', 'team', 'weapon', 'position', 'radius', 'damage']);
      if (Object.keys(input).length !== 6 || !idOK(input.source) || !teamOK(input.team) || input.weapon !== 'bomb' ||
          !vector(input.position) || !num(input.radius, 0, 1000) || input.radius === 0 ||
          !num(input.damage, 0, 10000) || input.damage === 0) fail('Invalid host bomb near miss');
      if (endedAt !== null) fail('Intermission');
      const { source, team, weapon, position, radius, damage } = input;
      const hits = [];
      for (const u of units) if (u.alive && u.team !== team && u.kind === 'surface' && band(u) === 'surfaced') {
        const g = geometry.get(u.modelId);
        if (!g) continue;
        const d = fittedDistance(g, position, u.position, u.heading);
        if (d < radius) hits.push({ unit: u, damage: damage * (1 - d / radius) });
      }
      if (!hits.length) return 0;
      record({ type: 'hostBombNearMiss', input }); // Reserve one action before any impact.
      let sunk = false;
      for (const hit of hits) {
        applyImpact(hit.unit, { source, team, weapon }, [...position], hit.damage);
        if (!hit.unit.alive) sunk = true;
      }
      if (sunk) objectives();
      return hits.length;
    },
    // Authority-adapter input, NOT a network command. Adapter must derive launch pose from its aircraft simulation.
    launchAircraftAttack(playerId, input) {
      keys(input, ['aircraft', 'weapon', 'origin', 'aim']);
      if (!vector(input.origin) || !vector(input.aim)) fail('Invalid launch coordinates');
      const p = players.find(p => p.id === playerId), a = aircraft.find(a => a.id === input.aircraft);
      const w = a?.weapons.find(w => w.id === input.weapon);
      if (endedAt !== null || !p || !a || p.aircraft !== a.id || a.seats[0] !== playerId || a.team !== p.team ||
          !config.aircraft[p.team].some(v => v.id === a.kind) || !w || w.ammo <= 0 || tick < w.ready ||
          distance(input.origin, input.aim) < 0.001 || distance(input.origin, input.aim) > w.range) fail('Invalid aircraft attack');
      if (w.medium === 'underwater' ? !water(input.origin, input.aim) :
          ![input.origin, input.aim].every(v => v[1] >= 0 && v[0] >= arena.minX && v[0] <= arena.maxX && v[2] >= arena.minZ && v[2] <= arena.maxZ)) fail('Invalid launch arena/medium');
      if (w.acquisition==='visual' && !visual(input.origin,input.aim)) fail('Visual acquisition blocked by visibility');
      if (actions.length >= LIMITS.replayActions) fail('Replay action cap');
      const result = launch(a, w, input.origin, input.aim, a.id);
      if (result) record({ type: 'aircraftAttack', playerId, input }); return result;
    },
    snapshot(team) {
      if (!teamOK(team)) fail('Snapshot needs authenticated faction');
      const hidden = new Set(units.filter(u => !unitVisible(team,u)).map(u => u.id));
      const safeEvents = events.map(e => eventVisibility.get(e.id)[team])
        .filter(e=>e!==null).map(e=>redactEvent(e,team)).filter(e=>e!==null);
      return { version: 1, mode: 'factions', tick, remainderMs: remainder, round, outcome: copy(outcome),
        ...(weather?{environment:copy(environment())}:{}),
        units: units.filter(u => !hidden.has(u.id)).map(u => ({ id: u.id, team: u.team, kind: u.kind,
          capital: u.capital, position: [...u.position], hp: u.hp, maxHp: u.maxHp, alive: u.alive, depth: band(u),
          ...(u.modelId ? {modelId:u.modelId} : {}), view: copy(u.view) })),
        contacts: contacts[team].map(c => ({ unit: c.unit, cell: [...c.cell], depth: c.depth,
          ageMs: (tick - c.observed) * LIMITS.tickMs, quality: contact(team, c.unit) ? 'confirmed' : 'suspected',
          uncertaintyCells: tick - c.observed >= ticks(8000) ? 3 : tick - c.observed >= ticks(4000) ? 2 : 1 })),
        projectiles: projectiles.filter(p=>p.team===team || (p.medium==='surface' && (!weather ||
          (pointVisible(team,p.position) && !(get(p.source)?.kind==='sub' && band(get(p.source))!=='surfaced')))))
          .map(p=>weather && p.team!==team ? {id:p.id,source:get(p.source)&&!hidden.has(p.source)?p.source:null,team:p.team,medium:p.medium,position:[...p.position]} : copy(p)),
        incomingUnderwater: Math.min(LIMITS.underwater, projectiles.filter(p => p.team !== team && p.medium === 'underwater' &&
          units.some(u => u.alive && u.team === team && within(u.position, p.position, 200))).length),
        players: copy(players.filter(p => p.team === team)), aircraft: copy(aircraft.filter(a => a.team === team)),
        events: safeEvents, metrics: { ...metrics } };
    },
    exportReplay() { return copy({ version: 1, config, actions }); },
  });
}

export function replayFleet(input) {
  keys(input, ['version', 'config', 'actions']);
  if (input.version !== 1 || !Array.isArray(input.actions) || input.actions.length > LIMITS.replayActions) fail('Invalid replay');
  const fleet = createFleet(input.config);
  for (const a of input.actions) {
    if (!obj(a)) fail('Invalid replay action');
    if (a.type === 'advance') { keys(a, ['type', 'ms']); fleet.advance(a.ms); }
    else if (a.type === 'addPlayer') { keys(a, ['type', 'id', 'team']); fleet.addPlayer(a.id, a.team); }
    else if (a.type === 'request') {
      keys(a, ['type', 'playerId', 'input']); if (!fleet.request(a.playerId, a.input).ok) fail('Invalid replay request');
    } else if (a.type === 'aircraftAttack') {
      keys(a, ['type', 'playerId', 'input']); if (!fleet.launchAircraftAttack(a.playerId, a.input)) fail('Invalid replay launch');
    } else if (a.type === 'hostSegment') {
      keys(a, ['type', 'input']); fleet.resolveHostSegment(a.input);
    } else if (a.type === 'hostBombNearMiss') {
      keys(a, ['type', 'input']); fleet.resolveHostBombNearMiss(a.input);
    } else fail('Unknown replay action');
  }
  return fleet;
}
