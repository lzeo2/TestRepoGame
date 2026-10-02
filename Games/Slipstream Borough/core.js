import { CARS, BY_ID } from '../../assets/car-arcade/fleet.js';

const MONEY = 1e9, COUNTER = 1e9, MAX_TIME = 240;
const LANES = [-5.25, -1.75, 1.75, 5.25];
const RIVAL_LANES = [-5.25, -1.75, 5.25];
const PROFILE_KEYS = ['version', 'cash', 'owned', 'selected', 'upgrades', 'level', 'best', 'nextRun', 'settledRun', 'testMode'];
const RUN_KEYS = ['id', 'mode', 'status', 'carId', 'upgrades', 'stats', 'level', 'distance', 'speed', 'x', 'hp', 'heat', 'score', 'earnings', 'traffic', 'police', 'rivals', 'elapsed', 'finishDistance', 'place', 'seed', 'nextEntity', 'spawnClock', 'collisionCooldown', 'nearMisses', 'collisions', 'arrest', 'finishTime'];
const ENTITY_KEYS = ['id', 'carId', 'x', 'distance', 'speed', 'passed', 'hit', 'finishTime'];
const STAT_KEYS = ['speed', 'acceleration', 'handling', 'toughness'];

// Inspect data descriptors before reading any untrusted profile/run fields.
function record(value, keys, required = keys) {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Expected plain record');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some(key => typeof key !== 'string' || !keys.includes(key) || !('value' in descriptors[key]))) throw new TypeError('Invalid fields');
  if (required.some(key => !Object.hasOwn(descriptors, key))) throw new TypeError('Missing fields');
}
function array(value, max) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) throw new TypeError('Invalid array');
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== value.length + 1) throw new TypeError('Invalid array fields');
  for (let i = 0; i < value.length; i++) if (!descriptors[i] || !('value' in descriptors[i])) throw new TypeError('Invalid array entry');
}
function number(value, min, max, integer = false) {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new RangeError('Number outside bounds');
}
function boolean(value) { if (typeof value !== 'boolean') throw new TypeError('Expected boolean'); }
function car(id) {
  if (typeof id !== 'string' || !Object.hasOwn(BY_ID, id)) throw new RangeError('Unknown car');
  return BY_ID[id];
}
function levels(value) {
  record(value, ['engine', 'handling', 'armor']);
  for (const key of ['engine', 'handling', 'armor']) number(value[key], 0, 5, true);
  return { engine: value.engine, handling: value.handling, armor: value.armor };
}
const zeroLevels = () => ({ engine: 0, handling: 0, armor: 0 });
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
function effective(id, upgrades) {
  const base = car(id);
  return Object.freeze({ speed: base.speed * (1 + upgrades.engine * 0.07), acceleration: base.acceleration * (1 + upgrades.engine * 0.12), handling: base.handling * (1 + upgrades.handling * 0.12), toughness: base.toughness * (1 + upgrades.armor * 0.16) });
}

export function freshProfile() {
  return { version: 1, cash: 0, owned: ['bricklet'], selected: 'bricklet', upgrades: { bricklet: zeroLevels() }, level: 0, best: 0, nextRun: 1, settledRun: 0, testMode: false };
}
export function validateProfile(raw) {
  record(raw, PROFILE_KEYS);
  if (raw.version !== 1) throw new RangeError('Unsupported save');
  number(raw.cash, 0, MONEY, true); number(raw.best, 0, MONEY, true);
  number(raw.level, 0, 12, true); number(raw.nextRun, 1, COUNTER, true); number(raw.settledRun, 0, raw.nextRun - 1, true);
  boolean(raw.testMode); array(raw.owned, 16);
  const owned = raw.owned.map(id => { car(id); return id; });
  if (!owned.includes('bricklet') || new Set(owned).size !== owned.length || typeof raw.selected !== 'string' || !owned.includes(raw.selected)) throw new RangeError('Invalid ownership');
  record(raw.upgrades, owned, []);
  const upgrades = {};
  for (const id of owned) upgrades[id] = Object.hasOwn(raw.upgrades, id) ? levels(raw.upgrades[id]) : zeroLevels();
  if (raw.testMode && (raw.cash !== MONEY || owned.length !== CARS.length)) throw new RangeError('Invalid test profile');
  return { version: 1, cash: raw.cash, owned, selected: raw.selected, upgrades, level: raw.level, best: raw.best, nextRun: raw.nextRun, settledRun: raw.settledRun, testMode: raw.testMode };
}
export function carStats(profile, id) {
  const p = validateProfile(profile);
  if (id === undefined) id = p.selected;
  car(id);
  if (!p.owned.includes(id)) throw new RangeError('Car not owned');
  return effective(id, p.upgrades[id]);
}
export function buyCar(profile, id) {
  const p = validateProfile(profile), spec = car(id);
  if (p.owned.includes(id)) throw new RangeError('Already owned');
  if (!p.testMode && p.cash < spec.price) throw new RangeError('Insufficient cash');
  if (!p.testMode) p.cash -= spec.price;
  p.owned.push(id); p.upgrades[id] = zeroLevels();
  return p;
}
export function selectCar(profile, id) {
  const p = validateProfile(profile); car(id);
  if (!p.owned.includes(id)) throw new RangeError('Car not owned');
  p.selected = id; return p;
}
export function upgradeCar(profile, id, kind) {
  const p = validateProfile(profile); car(id);
  if (!p.owned.includes(id) || !['engine', 'handling', 'armor'].includes(kind)) throw new RangeError('Invalid upgrade');
  const level = p.upgrades[id][kind], cost = 250 * (level + 1) ** 2;
  if (level === 5 || (!p.testMode && p.cash < cost)) throw new RangeError('Upgrade unavailable');
  if (!p.testMode) p.cash -= cost;
  p.upgrades[id][kind]++; return p;
}
export function applyCode(profile, text) {
  const p = validateProfile(profile);
  if (typeof text !== 'string' || text.length > 64) throw new TypeError('Invalid phrase');
  if (text.trim().toLowerCase() === 'tanayr') {
    p.testMode = true; p.cash = MONEY;
    for (const { id } of CARS) if (!p.owned.includes(id)) { p.owned.push(id); p.upgrades[id] = zeroLevels(); }
  }
  return p;
}

function random(run) {
  run.seed = (Math.imul(run.seed, 1664525) + 1013904223) >>> 0;
  return run.seed / 4294967296;
}
function entity(run, carId, x, distance, speed) {
  return { id: run.nextEntity++, carId, x, distance, speed, passed: false, hit: false, finishTime: null };
}
export function startRun(profile, mode) {
  const p = validateProfile(profile);
  if (!['cutup', 'race'].includes(mode)) throw new RangeError('Invalid mode');
  if (p.nextRun === COUNTER) throw new RangeError('Run counter exhausted');
  const id = p.nextRun++;
  const run = { id, mode, status: 'running', carId: p.selected, upgrades: { ...p.upgrades[p.selected] }, stats: { ...effective(p.selected, p.upgrades[p.selected]) }, level: p.level, distance: 0, speed: 0, x: 1.75, hp: 100, heat: 0, score: 0, earnings: 0, traffic: [], police: [], rivals: [], elapsed: 0, finishDistance: 1200 + 150 * p.level, place: 1, seed: id >>> 0, nextEntity: 1, spawnClock: 0, collisionCooldown: 0, nearMisses: 0, collisions: 0, arrest: 0, finishTime: null };
  if (mode === 'race') {
    for (let i = 0; i < 3; i++) run.rivals.push(entity(run, ['pip', 'finch', 'comet'][i], RIVAL_LANES[i], 0, 0));
  }
  return { profile: p, run };
}
function totals(run) {
  const score = Math.min(MONEY, Math.floor(run.distance * 2) + run.nearMisses * 100);
  let earnings = 0;
  if (run.status !== 'running') {
    const prize = run.status === 'finished' ? [0, 400, 220, 120, 60][run.place] : run.status === 'escaped' ? 180 : 0;
    earnings = Math.min(MONEY, Math.floor(run.distance * 0.32) + run.nearMisses * 30 + prize);
  }
  return { score, earnings };
}
function checkRun(raw) {
  record(raw, RUN_KEYS); car(raw.carId); levels(raw.upgrades); record(raw.stats, STAT_KEYS);
  const stats = effective(raw.carId, raw.upgrades);
  for (const key of STAT_KEYS) if (raw.stats[key] !== stats[key]) throw new RangeError('Invalid vehicle stats');
  number(raw.id, 1, COUNTER - 1, true); number(raw.level, 0, 12, true);
  if (!['cutup', 'race'].includes(raw.mode) || !['running', 'escaped', 'busted', 'finished'].includes(raw.status)) throw new RangeError('Invalid run');
  if (raw.finishDistance !== 1200 + 150 * raw.level) throw new RangeError('Invalid endpoint');
  number(raw.elapsed, 0, MAX_TIME); number(raw.distance, 0, raw.finishDistance);
  if (raw.distance > stats.speed * raw.elapsed + 1e-7) throw new RangeError('Impossible distance');
  number(raw.speed, 0, stats.speed); number(raw.x, -6.2, 6.2); number(raw.hp, 0, 100); number(raw.heat, 0, 5);
  number(raw.place, 1, 4, true); number(raw.seed, 0, 4294967295, true); number(raw.nextEntity, 1, 10000, true);
  number(raw.spawnClock, 0, 10); number(raw.collisionCooldown, 0, 1.2); number(raw.nearMisses, 0, raw.nextEntity - 1, true); number(raw.collisions, 0, 1000, true); number(raw.arrest, 0, 3);
  if (raw.finishTime !== null) number(raw.finishTime, raw.finishDistance / stats.speed - 1e-7, raw.elapsed);
  const ids = new Set();
  for (const [key, max] of [['traffic', 7], ['police', 2], ['rivals', 3]]) {
    array(raw[key], max);
    for (const e of raw[key]) {
      record(e, ENTITY_KEYS); car(e.carId); number(e.id, 1, raw.nextEntity - 1, true);
      if (ids.has(e.id)) throw new RangeError('Duplicate entity'); ids.add(e.id);
      number(e.x, -6.2, 6.2); number(e.distance, -100, 100000); number(e.speed, 0, 120); boolean(e.passed); boolean(e.hit);
      if (e.finishTime !== null) number(e.finishTime, 0, raw.elapsed);
      if (key !== 'rivals' && e.finishTime !== null) throw new RangeError('Invalid NPC finish');
      if (key === 'rivals' && (e.distance > raw.finishDistance || (e.distance === raw.finishDistance) !== (e.finishTime !== null))) throw new RangeError('Invalid rival finish');
    }
  }
  if ((raw.mode === 'race' && (raw.rivals.length !== 3 || raw.police.length || raw.heat)) || (raw.mode === 'cutup' && raw.rivals.length)) throw new RangeError('Invalid mode entities');
  if (raw.status === 'running' && (raw.hp === 0 || raw.distance === raw.finishDistance || raw.elapsed === MAX_TIME || raw.arrest === 3 || raw.finishTime !== null)) throw new RangeError('Invalid running state');
  if (raw.status === 'escaped' && raw.mode !== 'cutup' || raw.status === 'finished' && raw.mode !== 'race') throw new RangeError('Invalid finish mode');
  if (['escaped', 'finished'].includes(raw.status) && (raw.distance !== raw.finishDistance || raw.finishTime === null)) throw new RangeError('Invalid finish');
  if (raw.status === 'busted' && raw.hp > 0 && raw.arrest < 3 && raw.elapsed < MAX_TIME) throw new RangeError('Invalid bust');
  const place = raw.mode === 'race' ? 1 + raw.rivals.filter(e => raw.finishTime !== null ? e.finishTime !== null && e.finishTime <= raw.finishTime : e.distance > raw.distance).length : 1;
  if (raw.place !== place) throw new RangeError('Invalid race order');
  const expected = totals(raw);
  if (raw.score !== expected.score || raw.earnings !== expected.earnings) throw new RangeError('Invalid rewards');
  return { ...raw, upgrades: { ...raw.upgrades }, stats: { ...raw.stats }, traffic: raw.traffic.map(e => ({ ...e })), police: raw.police.map(e => ({ ...e })), rivals: raw.rivals.map(e => ({ ...e })) };
}

export function stepRun(run, input, dt) {
  const r = checkRun(run);
  record(input, ['steer', 'throttle', 'brake']);
  number(input.steer, -1, 1); number(input.throttle, 0, 1); number(input.brake, 0, 1); number(dt, 0, 0.05);
  if (r.status !== 'running' || dt === 0) return r;
  dt = Math.min(dt, MAX_TIME - r.elapsed);
  const previousDistance = r.distance, beforeTime = r.elapsed;
  r.elapsed += dt;
  r.collisionCooldown = Math.max(0, r.collisionCooldown - dt);
  r.speed = clamp(r.speed + (input.throttle * r.stats.acceleration - input.brake * 18 - 0.3 - r.speed * 0.012) * dt, 0, r.stats.speed);
  r.x = clamp(r.x + input.steer * r.stats.handling * (0.35 + 0.65 * r.speed / r.stats.speed) * dt, -6.2, 6.2);
  r.distance = Math.min(r.finishDistance, r.distance + r.speed * dt);
  if (r.distance === r.finishDistance) r.finishTime = Math.min(r.elapsed, beforeTime + (r.finishDistance - previousDistance) / Math.max(r.speed, 0.001));
  r.heat = r.mode === 'cutup' ? Math.min(5, r.distance / 340 + r.nearMisses * 0.12 + r.level * 0.08) : 0;
  r.spawnClock -= dt;
  if (r.spawnClock <= 0) {
    if (r.traffic.length < 7) {
      const x = LANES[Math.floor(random(r) * 4)], distance = r.distance + 110 + r.speed * 2 + random(r) * 55;
      if (!r.traffic.some(e => Math.abs(e.distance - distance) < 28)) r.traffic.push(entity(r, CARS[Math.floor(random(r) * CARS.length)].id, x, distance, 7 + random(r) * 7));
    }
    r.spawnClock = Math.max(1.1, 3.6 - r.level * 0.14 - r.heat * 0.16);
  }
  if (r.mode === 'cutup' && r.heat >= 1 && r.police.length < (r.heat >= 3 ? 2 : 1)) {
    r.police.push(entity(r, 'lantern', r.police.length === 0 ? r.x : LANES[0], Math.max(-90, r.distance - 65 - r.police.length * 20), r.stats.speed * 0.9));
  }
  for (const [i, rival] of r.rivals.entries()) {
    const target = r.stats.speed * Math.min(1.04, 0.80 + i * 0.045 + r.level * 0.012);
    const blocker = r.traffic.find(e => e.distance > rival.distance && e.distance - rival.distance < 24 && Math.abs(e.x - rival.x) < 1.6);
    let targetX = RIVAL_LANES[i];
    if (blocker) targetX = LANES.reduce((best, lane) => Math.abs(lane - blocker.x) > Math.abs(best - blocker.x) ? lane : best, LANES[0]);
    rival.x = clamp(rival.x + clamp(targetX - rival.x, -1, 1) * 2 * dt, -6.2, 6.2);
    rival.speed = Math.min(target, rival.speed + r.stats.acceleration * (0.76 + i * 0.04) * dt);
    const old = rival.distance;
    rival.distance = Math.min(r.finishDistance, old + rival.speed * dt);
    if (rival.distance === r.finishDistance && rival.finishTime === null) rival.finishTime = Math.min(r.elapsed, beforeTime + (r.finishDistance - old) / rival.speed);
  }
  for (const cop of r.police) {
    const target = r.stats.speed * (0.98 + r.level * 0.012 + r.heat * 0.015);
    cop.speed = Math.min(target, cop.speed + r.stats.acceleration * 0.8 * dt);
    cop.x = clamp(cop.x + clamp(r.x - cop.x, -1, 1) * (0.8 + r.level * 0.04) * dt, -6.2, 6.2);
    cop.distance += cop.speed * dt;
    // A cop ahead brakes to contain, rather than vanishing down the road.
    if (cop.distance > r.distance + 8) { cop.distance = r.distance + 8; cop.speed = r.speed * 0.8; }
  }
  for (const e of r.traffic) e.distance += e.speed * dt;
  for (const e of [...r.traffic, ...r.police, ...r.rivals]) {
    const lateral = Math.abs(e.x - r.x), gap = Math.abs(e.distance - r.distance);
    if (gap < 4.3 && lateral < 1.55 && r.collisionCooldown === 0) {
      r.hp = Math.max(0, r.hp - 24 * 100 / r.stats.toughness);
      r.speed *= 0.56; r.collisionCooldown = 1.2; r.collisions++; e.hit = true;
    }
    if (!e.passed && e.distance < r.distance - 4.3) {
      e.passed = true;
      if (r.traffic.includes(e) && !e.hit && lateral >= 1.55 && lateral < 3.2 && r.speed > e.speed + 2) r.nearMisses++;
    }
  }
  r.traffic = r.traffic.filter(e => e.distance > r.distance - 45);
  const contained = r.police.some(e => Math.abs(e.distance - r.distance) < 10 && Math.abs(e.x - r.x) < 2.3) && r.speed < 5;
  r.arrest = clamp(r.arrest + (contained ? dt : -dt * 0.5), 0, 3);
  r.place = r.mode === 'race' ? 1 + r.rivals.filter(e => r.finishTime !== null ? e.finishTime !== null && e.finishTime <= r.finishTime : e.distance > r.distance).length : 1;
  if (r.hp === 0 || r.arrest === 3 || r.elapsed === MAX_TIME) r.status = 'busted';
  else if (r.distance === r.finishDistance) r.status = r.mode === 'race' ? 'finished' : 'escaped';
  Object.assign(r, totals(r));
  return r;
}
export function settleRun(profile, run) {
  const p = validateProfile(profile), r = checkRun(run);
  if (r.status === 'running' || r.id !== p.nextRun - 1 || r.id <= p.settledRun || r.level !== p.level || r.carId !== p.selected || STAT_KEYS.some(key => r.stats[key] !== effective(p.selected, p.upgrades[p.selected])[key])) throw new RangeError('Result is not current');
  p.cash = p.testMode ? MONEY : Math.min(MONEY, p.cash + r.earnings);
  p.best = Math.max(p.best, r.score); p.settledRun = r.id;
  if (r.status === 'escaped' || r.status === 'finished' && r.place === 1) p.level = Math.min(12, p.level + 1);
  return p;
}
