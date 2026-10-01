import { SPECIES, BY_ID } from './data.js';
import { statsFor, createCreature, normalizeCreature, clearEffects } from './battle.js';

export const SAVE_KEY = 'foldwild-save-v1';
export const MAX_ROSTER = 160;
export const PLAYER_BOUNDS = Object.freeze({ minX: -10, maxX: 10, minZ: -7, maxZ: 7 });
export const REGIONS = Object.freeze([
  { id: 0, name: 'Rootfold Meadow', description: 'Root paths wind between quiet training clearings.' },
  { id: 1, name: 'Stillwater Reach', description: 'Shallow channels divide the wide sandy banks.' },
  { id: 2, name: 'Stonefold Ridge', description: 'Warm stone terraces lead to the ridge overlook.' }
].map(Object.freeze));
export const RIVALS = Object.freeze([
  { id: 0, name: 'Maren', dialogue: 'A meadow lesson: watch your energy before you strike.',
    winDialogue: 'Good timing. The reach is ready for you.', team: [{ speciesId: 'shardip', level: 5 }] },
  { id: 1, name: 'Sola', dialogue: 'We train on the banks. Try changing partners when the current turns.',
    winDialogue: 'Your partners work well together. Take the ridge path.',
    team: [{ speciesId: 'rillipod', level: 9 }, { speciesId: 'murnub', level: 9 }] },
  { id: 2, name: 'Iven', dialogue: 'One last ridge lesson: leave room for every partner.',
    winDialogue: 'You have learned the three paths. Enjoy the overlook.',
    team: [{ speciesId: 'briknudge', level: 14 }, { speciesId: 'vinchew', level: 14 }, { speciesId: 'lensfoil', level: 14 }] }
].map(rival => Object.freeze({ ...rival, team: Object.freeze(rival.team.map(Object.freeze)) })));

const STARTERS = ['cindupp', 'dewgob', 'pithnip'];
const SAVE_LIMIT = 256 * 1024;
const UID = /^[a-z0-9-]{1,48}$/;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
function integer(n, min, max, label) {
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new RangeError(`Invalid ${label}: expected integer ${min}..${max}.`);
  return n;
}
function finite(n, label) {
  if (!Number.isFinite(n)) throw new TypeError(`Invalid ${label}: expected finite number.`);
  return n;
}
function plain(value, label) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError(`Invalid ${label}: expected plain object.`);
  return value;
}
function field(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`Missing or invalid ${key}.`);
  return descriptor.value;
}
function optional(object, key, fallback) {
  return Object.hasOwn(object, key) ? field(object, key) : fallback;
}
function list(value, min, max, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length < min || value.length > max) {
    throw new RangeError(`Invalid ${label} size.`);
  }
  // Array.from visits holes too, so sparse lists cannot evade item validation.
  return Array.from(value);
}
function speciesId(id) {
  if (typeof id !== 'string' || !Object.hasOwn(BY_ID, id)) throw new RangeError('Unknown species id.');
  return id;
}
function unique(values, label) {
  if (new Set(values).size !== values.length) throw new RangeError(`Duplicate ${label}.`);
  return values;
}
function creatureCopy(value) {
  const raw = plain(value, 'creature');
  const uid = field(raw, 'uid');
  if (typeof uid !== 'string' || !UID.test(uid)) throw new TypeError('Invalid creature UID.');
  const projected = {
    uid, speciesId: speciesId(field(raw, 'speciesId')), level: integer(field(raw, 'level'), 1, 40, 'level'),
    xp: integer(field(raw, 'xp'), 0, 1e6, 'XP'), hp: field(raw, 'hp'), energy: field(raw, 'energy'),
    status: optional(raw, 'status', null), shield: optional(raw, 'shield', null),
    buffs: optional(raw, 'buffs', {}), turnsTaken: optional(raw, 'turnsTaken', 0)
  };
  for (const key of ['status', 'shield']) {
    if (projected[key] !== null) plain(projected[key], key);
  }
  plain(projected.buffs, 'buffs');
  for (const modifier of Object.values(projected.buffs)) plain(modifier, 'modifier');
  const normalized = clearEffects(normalizeCreature(projected));
  const canonical = createCreature(normalized.speciesId, normalized.level, normalized.uid);
  const maxima = statsFor(canonical);
  canonical.xp = normalized.xp;
  canonical.hp = clamp(normalized.hp, 0, maxima.maxHP);
  canonical.energy = clamp(normalized.energy, 0, maxima.maxEnergy);
  return canonical;
}

export function freshGame(starterId = 'cindupp', seed = 1) {
  if (!STARTERS.includes(starterId)) throw new RangeError('Invalid starter id.');
  integer(seed, 0, 0xffffffff, 'seed');
  return validateSave({ version: 1, seed, starterId, position: { x: 0, z: 4, yaw: 0 }, region: 0,
    roster: [createCreature(starterId, 3, 'owned-1')], team: ['owned-1'], seen: [starterId], caught: [starterId],
    defeatedRivals: [], score: 0, kites: 18, encounterIndex: 0, nextUid: 2, reducedMotion: false });
}

export function validateSave(value) {
  const raw = plain(value, 'save');
  if (field(raw, 'version') !== 1) throw new RangeError('Unsupported save version.');
  const seed = integer(field(raw, 'seed'), 0, 0xffffffff, 'seed');
  const starterId = field(raw, 'starterId');
  if (!STARTERS.includes(starterId)) throw new RangeError('Invalid starter id.');
  const position = plain(field(raw, 'position'), 'position');
  const x = clamp(finite(field(position, 'x'), 'position x'), PLAYER_BOUNDS.minX, PLAYER_BOUNDS.maxX);
  const z = clamp(finite(field(position, 'z'), 'position z'), PLAYER_BOUNDS.minZ, PLAYER_BOUNDS.maxZ);
  const yaw = finite(field(position, 'yaw'), 'position yaw');
  const normalizedYaw = ((yaw % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const roster = list(field(raw, 'roster'), 1, MAX_ROSTER, 'roster').map(creatureCopy);
  const uids = unique(roster.map(c => c.uid), 'creature UID');
  const team = unique(list(field(raw, 'team'), 1, 3, 'team'), 'team UID');
  if (team.some(uid => typeof uid !== 'string' || !uids.includes(uid))) throw new RangeError('Unknown team UID.');
  const seen = unique(list(field(raw, 'seen'), 0, SPECIES.length, 'seen').map(speciesId), 'seen species');
  const caught = unique(list(field(raw, 'caught'), 0, SPECIES.length, 'caught').map(speciesId), 'caught species');
  for (const c of roster) if (!caught.includes(c.speciesId)) caught.push(c.speciesId);
  for (const id of caught) if (!seen.includes(id)) seen.push(id);
  const defeatedRivals = unique(list(field(raw, 'defeatedRivals'), 0, 3, 'defeated rivals'), 'rival id');
  if (defeatedRivals.some((id, i) => id !== i)) throw new RangeError('Invalid sequential rival progression.');
  const region = integer(field(raw, 'region'), 0, Math.min(2, defeatedRivals.length), 'region');
  let nextUid = integer(field(raw, 'nextUid'), 2, 1e9, 'nextUid');
  for (const uid of uids) {
    if (/^owned-\d+$/.test(uid)) {
      const number = Number(uid.slice(6));
      integer(number, 0, 1e9 - 1, 'owned UID number');
      nextUid = Math.max(nextUid, number + 1);
    }
  }
  const reducedMotion = field(raw, 'reducedMotion');
  if (typeof reducedMotion !== 'boolean') throw new TypeError('Invalid reducedMotion: expected boolean.');
  return { version: 1, seed, starterId, position: { x, z, yaw: normalizedYaw }, region, roster, team, seen, caught,
    defeatedRivals, score: integer(field(raw, 'score'), 0, 1e9, 'score'),
    kites: integer(field(raw, 'kites'), 0, 999, 'kites'),
    encounterIndex: integer(field(raw, 'encounterIndex'), 0, 1e9, 'encounterIndex'), nextUid, reducedMotion };
}

export function readSave(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return { state: null, error: null };
    if (typeof raw !== 'string' || raw.length > SAVE_LIMIT) throw new RangeError('Invalid save size: maximum 256 KiB.');
    return { state: validateSave(JSON.parse(raw)), error: null };
  } catch (error) {
    return { state: null, error: `Could not read Foldwild save: ${error?.message ?? String(error)}` };
  }
}
export function writeSave(state, storage) {
  try {
    const raw = JSON.stringify(validateSave(state));
    if (raw.length > SAVE_LIMIT) throw new RangeError('Save exceeds maximum 256 KiB.');
    storage ??= globalThis.localStorage;
    storage.setItem(SAVE_KEY, raw);
    return null;
  } catch (error) {
    return `Could not write Foldwild save: ${error?.message ?? String(error)}`;
  }
}

export function worldPoints(state) {
  integer(state.seed, 0, 0xffffffff, 'seed');
  integer(state.region, 0, 2, 'region');
  integer(state.encounterIndex, 0, 1e9, 'encounterIndex');
  // Independent sequence: world selection must never advance the combat seed.
  let seed = (state.seed ^ Math.imul(state.region + 1, 2654435761) ^ Math.imul(state.encounterIndex, 2246822519)) >>> 0;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const pool = SPECIES.filter(s => state.region === 0 ? s.tier === 'basic' : state.region === 1 ? s.tier !== 'boss' : true);
  const weight = s => state.region === 2 ? ({ basic: 4, evolved: 2, boss: 1 })[s.tier] : 1;
  const points = [[-5, -1], [0, -4], [5, -1]].map(([x, z], i) => {
    let roll = random() * pool.reduce((sum, s) => sum + weight(s), 0);
    let index = 0;
    while (index < pool.length - 1 && roll >= weight(pool[index])) roll -= weight(pool[index++]);
    const s = pool.splice(index, 1)[0];
    const level = s.tier === 'boss' ? 26 : state.region === 0 ? 2 + Math.floor(random() * 3)
      : state.region === 1 ? 6 + Math.floor(random() * 5) : 12 + Math.floor(random() * 7);
    return { id: `wild-${i}`, x, z, type: 'wild', speciesId: s.id, label: s.name, level };
  });
  points.push({ id: 'camp', x: -6, z: 4, type: 'camp', label: 'Rest Camp' });
  const rival = RIVALS[state.region];
  if (!state.defeatedRivals.includes(rival.id)) points.push({ id: 'rival', x: 6, z: -3, type: 'rival', label: rival.name });
  points.push({ id: 'exit', x: 0, z: -7, type: 'exit',
    label: state.region === 2 ? 'Ridge Overlook' : `Path to ${REGIONS[state.region + 1].name}` });
  return points;
}
export function nearbyPoint(state, distance = 1.8) {
  finite(distance, 'distance');
  if (distance < 0) throw new RangeError('Distance must be nonnegative.');
  finite(state.position.x, 'position x');
  finite(state.position.z, 'position z');
  let closest = null;
  let nearest = distance;
  for (const point of worldPoints(state)) {
    const d = Math.hypot(point.x - state.position.x, point.z - state.position.z);
    if (d <= nearest) { closest = point; nearest = d; }
  }
  return closest;
}
