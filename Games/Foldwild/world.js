import { SPECIES, BY_ID } from './data.js';
import { statsFor, createCreature, clearEffects, validateBattle } from './battle.js';
import { validateIndividual, unlockedClasses, generateIndividual } from './builds.js';
import { freshEconomy, refreshStock, ITEMS, COSMETICS, SHOPS, CONTRACTS } from './economy.js';
import { REGION_DEFINITIONS, REGION_LAYOUTS, movePosition, routeTo } from './region-data.js';

export { REGION_LAYOUTS, movePosition, routeTo };
export const SAVE_KEY = 'foldwild-save-v1';
export const BACKUP_KEY = 'foldwild-save-backup-v1';
export const MAX_ROSTER = 160;
export const REGIONS = REGION_DEFINITIONS;
export const PLAYER_BOUNDS = REGION_LAYOUTS[0].bounds;
export const RIVALS = Object.freeze([
  { id: 0, name: 'Maren', dialogue: 'A meadow lesson: watch your energy before you strike.',
    winDialogue: 'Good timing. The reach is ready for you.', team: [{ speciesId: 'shardip', level: 8 }] },
  { id: 1, name: 'Sola', dialogue: 'We train on the banks. Change partners when the current turns.',
    winDialogue: 'Your partners work well together. Take the quarry path.',
    team: [{ speciesId: 'chimeford', level: 14 }, { speciesId: 'duskcurl', level: 13 }] },
  { id: 2, name: 'Neri', dialogue: 'Keep pressure on the field, but leave energy for recovery.',
    winDialogue: 'You kept your team steady. The ridge route is open.',
    team: [{ speciesId: 'briknudge', level: 20 }, { speciesId: 'vinchew', level: 19 }] },
  { id: 3, name: 'Iven', dialogue: 'The ridge lesson: leave room for every partner and time your shields.',
    winDialogue: 'You have several answers. Follow the path to the hollow.',
    team: [{ speciesId: 'geodelve', level: 27 }, { speciesId: 'trellisect', level: 26 }, { speciesId: 'catarill', level: 26 }] },
  { id: 4, name: 'Oren', dialogue: 'A pause can change the field. Adapt before your next command.',
    winDialogue: 'You have reopened the five routes. Return with your partners.',
    team: [{ speciesId: 'velvetorque', level: 34 }, { speciesId: 'aurelvane', level: 33 }, { speciesId: 'hearthol', level: 33 }] }
].map(rival => Object.freeze({ ...rival, team: Object.freeze(rival.team.map(Object.freeze)) })));

const STARTERS = ['cindupp', 'dewgob', 'pithnip'];
const SAVE_LIMIT = 256 * 1024;
const UID = /^[a-z0-9-]{1,48}$/;
const APPEARANCE = { name: 'Archivist', skin: '#bc916b', hair: 'short', coat: '#365a74', backpack: '#b39a6c' };
const PALETTES = {
  skin: ['#bc916b', '#8a5a3c', '#e2bc96', '#5d3b2d'],
  hair: ['short', 'cropped', 'long', 'none'],
  coat: ['#365a74', '#7b4f34', '#718267', '#b98369'],
  backpack: ['#b39a6c', '#66513d', '#688ba0']
};
const SUPPLY_IDS = REGION_LAYOUTS.flatMap((layout, region) => layout.points
  .filter(point => point.type === 'supply').map(point => `${region}:${point.id}`));
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
  // Descriptor reads reject sparse arrays and getters without invoking imported code.
  return Array.from({ length: value.length }, (_, i) => field(value, String(i)));
}
function speciesId(id) {
  if (typeof id !== 'string' || !Object.hasOwn(BY_ID, id)) throw new RangeError('Unknown species id.');
  return id;
}
function unique(values, label) {
  if (new Set(values).size !== values.length) throw new RangeError(`Duplicate ${label}.`);
  return values;
}
function known(catalog, id, label) {
  if (typeof id !== 'string' || !Object.hasOwn(catalog, id)) throw new RangeError(`Unknown ${label}.`);
  return id;
}
function exact(value, keys, label) {
  plain(value, label);
  if (Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new RangeError(`Invalid ${label} keys.`);
  return Object.fromEntries(keys.map(key => [key, field(value, key)]));
}
function creatureCopy(value, legacy = false, strictResources = false) {
  const raw = plain(value, 'creature');
  const uid = field(raw, 'uid');
  if (typeof uid !== 'string' || !UID.test(uid)) throw new TypeError('Invalid creature UID.');
  const individual = legacy ? validateIndividual() : validateIndividual(Object.fromEntries(
    ['profile', 'traitId', 'cosmeticId'].filter(key => Object.hasOwn(raw, key)).map(key => [key, field(raw, key)])));
  const projected = {
    uid, speciesId: speciesId(field(raw, 'speciesId')), level: integer(field(raw, 'level'), 1, 40, 'level'),
    xp: integer(field(raw, 'xp'), 0, 1e6, 'XP'), hp: field(raw, 'hp'), energy: field(raw, 'energy'), ...individual,
    status: optional(raw, 'status', null), shield: optional(raw, 'shield', null),
    buffs: optional(raw, 'buffs', {}), turnsTaken: optional(raw, 'turnsTaken', 0)
  };
  if (projected.status !== null) projected.status = exact(projected.status, ['name', 'remaining', 'appliedAt'], 'status');
  if (projected.shield !== null) {
    projected.shield = exact(projected.shield, ['hp', 'remaining', 'appliedAt'], 'shield');
    if (legacy && finite(projected.shield.hp, 'shield hp') > 22) throw new RangeError('Invalid legacy shield.');
  }
  const buffs = plain(projected.buffs, 'buffs');
  projected.buffs = Object.fromEntries(Reflect.ownKeys(buffs).map(key => {
    if (!['attack', 'defense', 'speed'].includes(key)) throw new RangeError('Unknown stat modifier.');
    return [key, exact(field(buffs, key), ['percent', 'remaining', 'appliedAt'], 'modifier')];
  }));
  const normalized = clearEffects(projected);
  const canonical = createCreature(normalized.speciesId, normalized.level, normalized.uid, individual);
  const maxima = statsFor(canonical);
  if (strictResources && (projected.hp !== normalized.hp || projected.energy !== normalized.energy)) {
    throw new RangeError('Invalid pending roster resources.');
  }
  canonical.xp = normalized.xp;
  canonical.hp = clamp(normalized.hp, 0, maxima.maxHP);
  canonical.energy = clamp(normalized.energy, 0, maxima.maxEnergy);
  return canonical;
}
function economyCopy(raw, kites, encounterIndex) {
  const inventory = exact(field(raw, 'inventory'), ['patch', 'charge', 'fiber'], 'inventory');
  const cosmetics = unique(list(field(raw, 'cosmetics'), 1, Object.keys(COSMETICS).length, 'cosmetics')
    .map(id => known(COSMETICS, id, 'cosmetic')), 'cosmetic');
  const shops = exact(field(raw, 'shops'), Object.keys(SHOPS), 'shops');
  for (const id of Object.keys(SHOPS)) {
    shops[id] = exact(shops[id], ['epoch', 'stock'], 'shop');
    shops[id].stock = exact(shops[id].stock, Object.keys(ITEMS), 'stock');
  }
  const contracts = unique(list(field(raw, 'contracts'), 0, Object.keys(CONTRACTS).length, 'contracts')
    .map(id => known(CONTRACTS, id, 'contract')), 'contract');
  const claimedSupplies = unique(list(field(raw, 'claimedSupplies'), 0, SUPPLY_IDS.length, 'claimed supplies'), 'claimed supply');
  if (claimedSupplies.some(id => !SUPPLY_IDS.includes(id))) throw new RangeError('Unknown claimed supply.');
  const economy = { marks: field(raw, 'marks'), inventory, cosmetics, shops, contracts, claimedSupplies };
  // Reuse the transaction boundary's validator. Ignore its refreshed copy: reading must not restock.
  refreshStock({ ...economy, kites, encounterIndex }, Object.keys(SHOPS)[0]);
  return economy;
}
function appearanceCopy(value) {
  const appearance = exact(value, Object.keys(APPEARANCE), 'appearance');
  if (typeof appearance.name !== 'string' || [...appearance.name].length < 1 || [...appearance.name].length > 24 ||
      !appearance.name.trim() || /[\p{Cc}\p{Cf}\p{Cs}]/u.test(appearance.name)) throw new RangeError('Invalid archivist name.');
  for (const key of Object.keys(PALETTES)) if (!PALETTES[key].includes(appearance[key])) throw new RangeError(`Invalid appearance ${key}.`);
  return appearance;
}
function sizeCheck(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > SAVE_LIMIT) throw new RangeError('Invalid save size: maximum 256 KiB.');
  return text;
}

function pendingBattleCopy(value, state) {
  // Validate descriptors before accessing nested data or serializing anything imported.
  const battle = validateBattle(value);
  integer(battle.round, 1, 10000, 'pending round');
  if (battle.result !== null || battle.phase !== 'command' || !battle.synergyEnabled ||
      battle.player.classId !== state.activeClass || battle.enemy.classId !== 'none' ||
      [battle.player, battle.enemy].some(side => side.team[side.active].hp <= 0)) {
    throw new RangeError('Invalid pending battle state.');
  }
  for (const name of ['player', 'enemy']) {
    for (const [index, creature] of battle[name].team.entries()) {
      integer(creature.xp, 0, 1e6, 'pending XP');
      const raw = field(field(field(value, name), 'team'), String(index));
      if (field(raw, 'hp') !== creature.hp || field(raw, 'energy') !== creature.energy) {
        throw new RangeError('Invalid pending battle resources.');
      }
    }
  }
  if (battle.player.team.length !== state.team.length || battle.player.team.some((creature, index) =>
      creature.uid !== state.team[index] || JSON.stringify(clearEffects(creature)) !==
        JSON.stringify(clearEffects(state.roster.find(owned => owned.uid === creature.uid))))) {
    throw new RangeError('Invalid pending player roster.');
  }
  if (battle.enemy.team.some(creature => state.roster.some(owned => owned.uid === creature.uid) ||
      !state.seen.includes(creature.speciesId))) throw new RangeError('Invalid pending enemy identity.');
  const sameEnemy = (creature, expected) => {
    expected.hp = creature.hp;
    expected.energy = creature.energy;
    return JSON.stringify(clearEffects(creature)) === JSON.stringify(clearEffects(expected));
  };
  if (battle.kind === 'wild') {
    const creature = battle.enemy.team[0];
    if (!worldPoints(state).some(point => point.type === 'wild' && sameEnemy(creature,
      createCreature(point.speciesId, point.level, `wild-${state.encounterIndex}`, generateIndividual(point.individualSeed))))) {
      throw new RangeError('Invalid pending wild encounter.');
    }
  } else {
    const rival = RIVALS[state.region];
    if (state.defeatedRivals.includes(state.region) || battle.enemy.team.length !== rival.team.length ||
        battle.enemy.team.some((creature, index) => !sameEnemy(creature, createCreature(
          rival.team[index].speciesId, rival.team[index].level, `rival-${state.encounterIndex}-${index}`)))) {
      throw new RangeError('Invalid pending regional trial.');
    }
  }
  return battle;
}

export function freshGame(starterId = 'cindupp', seed = 1) {
  if (!STARTERS.includes(starterId)) throw new RangeError('Invalid starter id.');
  integer(seed, 0, 0xffffffff, 'seed');
  return validateSave({ version: 2, seed, starterId, position: { ...REGION_LAYOUTS[0].spawn }, region: 0,
    roster: [createCreature(starterId, 3, 'owned-1')], team: ['owned-1'], seen: [starterId], caught: [starterId],
    defeatedRivals: [], score: 0, kites: 8, encounterIndex: 0, nextUid: 2, reducedMotion: false,
    ...freshEconomy(), activeClass: 'pathfinder', appearance: { ...APPEARANCE }, favorites: [], quality: 'low', legacyRivals: [], pendingBattle: null });
}

export function unlockedRegion(state) {
  const sequence = unique(list(field(plain(state, 'progress'), 'defeatedRivals'), 0, 5, 'defeated rivals'), 'rival id');
  if (sequence.some((id, i) => id !== i)) throw new RangeError('Invalid sequential rival progression.');
  return Math.min(4, sequence.length);
}

export function validateSave(value) {
  const raw = plain(value, 'save');
  const version = field(raw, 'version');
  if (version !== 1 && version !== 2) throw new RangeError('Unsupported save version.');
  const legacy = version === 1;
  const pendingBattle = optional(raw, 'pendingBattle', null);
  const seed = integer(field(raw, 'seed'), 0, 0xffffffff, 'seed');
  const starterId = field(raw, 'starterId');
  if (!STARTERS.includes(starterId)) throw new RangeError('Invalid starter id.');
  const position = plain(field(raw, 'position'), 'position');
  const positionX = finite(field(position, 'x'), 'position x');
  const positionZ = finite(field(position, 'z'), 'position z');
  const yaw = finite(field(position, 'yaw'), 'position yaw');
  const normalizedYaw = ((yaw % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const roster = list(field(raw, 'roster'), 1, MAX_ROSTER, 'roster').map(c => creatureCopy(c, legacy, pendingBattle !== null));
  const uids = unique(roster.map(c => c.uid), 'creature UID');
  const ownedNumbers = unique(uids.filter(uid => /^owned-\d+$/.test(uid)).map(uid =>
    integer(Number(uid.slice(6)), 0, 1e9 - 1, 'owned UID number')), 'owned UID number');
  const team = unique(list(field(raw, 'team'), 1, 3, 'team'), 'team UID');
  if (team.some(uid => typeof uid !== 'string' || !uids.includes(uid))) throw new RangeError('Unknown team UID.');
  const seen = unique(list(field(raw, 'seen'), 0, SPECIES.length, 'seen').map(speciesId), 'seen species');
  const caught = unique(list(field(raw, 'caught'), 0, SPECIES.length, 'caught').map(speciesId), 'caught species');
  for (const c of roster) if (!caught.includes(c.speciesId)) caught.push(c.speciesId);
  for (const id of caught) if (!seen.includes(id)) seen.push(id);
  let defeatedRivals = unique(list(field(raw, 'defeatedRivals'), 0, legacy ? 3 : 5, 'defeated rivals'), 'rival id');
  if (defeatedRivals.some((id, i) => id !== i)) throw new RangeError('Invalid sequential rival progression.');
  let region = integer(field(raw, 'region'), 0, Math.min(legacy ? 2 : 4, defeatedRivals.length), 'region');
  let canonicalPosition;
  let legacyRivals;
  if (legacy) {
    // V1 accepted every finite coordinate, clamping to +/-10 and +/-7. Relocate safely instead.
    legacyRivals = defeatedRivals.includes(2) ? [2] : [];
    defeatedRivals = defeatedRivals.filter(id => id < 2);
    region = Math.min(region === 2 ? 3 : region, Math.min(4, defeatedRivals.length));
    canonicalPosition = { ...REGION_LAYOUTS[region].spawn };
  } else {
    legacyRivals = unique(list(field(raw, 'legacyRivals'), 0, 1, 'legacy rivals'), 'legacy rival');
    if (legacyRivals.some(id => id !== 2) || (legacyRivals.length && defeatedRivals.length < 2)) throw new RangeError('Invalid legacy rival progression.');
    const bounds = REGION_LAYOUTS[region].bounds;
    canonicalPosition = movePosition(region, { x: clamp(positionX, bounds.minX + 0.35, bounds.maxX - 0.35),
      z: clamp(positionZ, bounds.minZ + 0.35, bounds.maxZ - 0.35), yaw: normalizedYaw }, 0, 0);
  }
  let nextUid = integer(field(raw, 'nextUid'), 2, 1e9, 'nextUid');
  for (const number of ownedNumbers) nextUid = Math.max(nextUid, number + 1);
  const reducedMotion = field(raw, 'reducedMotion');
  if (typeof reducedMotion !== 'boolean') throw new TypeError('Invalid reducedMotion: expected boolean.');
  const kites = integer(field(raw, 'kites'), 0, 999, 'kites');
  const encounterIndex = integer(field(raw, 'encounterIndex'), 0, 1e9, 'encounterIndex');
  const economy = legacy ? freshEconomy() : economyCopy(raw, kites, encounterIndex);
  for (const creature of roster) if (!economy.cosmetics.includes(creature.cosmeticId)) throw new RangeError('Unknown or unowned creature cosmetic.');
  const favorites = legacy ? [] : unique(list(field(raw, 'favorites'), 0, MAX_ROSTER, 'favorites'), 'favorite UID');
  if (favorites.some(uid => typeof uid !== 'string' || !uids.includes(uid))) throw new RangeError('Unknown favorite UID.');
  const activeClass = legacy ? 'pathfinder' : field(raw, 'activeClass');
  if (!unlockedClasses({ caught, defeatedRivals, contracts: economy.contracts }).includes(activeClass)) throw new RangeError('Invalid or locked active class.');
  const quality = legacy ? 'low' : field(raw, 'quality');
  if (!['low', 'standard'].includes(quality)) throw new RangeError('Invalid quality.');
  const state = { version: 2, seed, starterId, position: canonicalPosition, region, roster, team, seen, caught,
    defeatedRivals, score: integer(field(raw, 'score'), 0, 1e9, 'score'), kites, encounterIndex, nextUid, reducedMotion,
    ...economy, activeClass, appearance: legacy ? { ...APPEARANCE } : appearanceCopy(field(raw, 'appearance')),
    favorites, quality, legacyRivals, pendingBattle: null };
  if (pendingBattle !== null) state.pendingBattle = pendingBattleCopy(pendingBattle, state);
  sizeCheck(JSON.stringify(state));
  return state;
}

export function releaseCreature(state, uid) {
  const next = validateSave(state);
  const creature = next.roster.find(owned => owned.uid === uid);
  if (!creature) throw new RangeError('Unknown creature UID.');
  if (next.pendingBattle !== null) throw new RangeError('Cannot release during a pending battle.');
  if (next.roster.length === 1) throw new RangeError('Cannot release the last ally.');
  if (next.team.includes(uid)) throw new RangeError('Cannot release a team member.');
  if (next.favorites.includes(uid)) throw new RangeError('Cannot release a favorite.');
  if (creature.hp > 0 && !next.roster.some(owned => owned.uid !== uid && owned.hp > 0)) {
    throw new RangeError('Cannot release the last conscious ally.');
  }
  next.roster = next.roster.filter(owned => owned.uid !== uid);
  next.favorites = next.favorites.filter(favorite => favorite !== uid);
  return validateSave(next);
}

export function readSave(storage) {
  try {
    storage ??= globalThis.localStorage;
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return { state: null, error: null };
    return { state: validateSave(JSON.parse(sizeCheck(raw))), error: null };
  } catch (error) {
    return { state: null, error: `Could not read Foldwild save: ${error?.message ?? String(error)}` };
  }
}
export function writeSave(state, storage) {
  try {
    const raw = sizeCheck(JSON.stringify(validateSave(state)));
    storage ??= globalThis.localStorage;
    const previous = storage.getItem(SAVE_KEY);
    // Back up exact bytes, including an explicitly replaced corrupt slot. A failed backup stops the write.
    if (previous !== null && previous !== raw) storage.setItem(BACKUP_KEY, previous);
    storage.setItem(SAVE_KEY, raw);
    return null;
  } catch (error) {
    return `Could not write Foldwild save: ${error?.message ?? String(error)}`;
  }
}

export function worldPoints(state) {
  const seedInput = integer(field(plain(state, 'world state'), 'seed'), 0, 0xffffffff, 'seed');
  const region = integer(field(state, 'region'), 0, 4, 'region');
  const encounterIndex = integer(field(state, 'encounterIndex'), 0, 1e9, 'encounterIndex');
  if (region > unlockedRegion(state)) throw new RangeError('Invalid locked region.');
  const defeatedRivals = list(field(state, 'defeatedRivals'), 0, 5, 'defeated rivals');
  const claimed = unique(list(field(state, 'claimedSupplies'), 0, SUPPLY_IDS.length, 'claimed supplies'), 'claimed supply');
  if (claimed.some(id => !SUPPLY_IDS.includes(id))) throw new RangeError('Unknown claimed supply.');
  // Independent sequence: world selection must never advance the combat seed.
  let seed = (seedInput ^ Math.imul(region + 1, 2654435761) ^ Math.imul(encounterIndex, 2246822519)) >>> 0;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  let pool = SPECIES.filter(s => region === 0 ? s.tier === 'basic' : region <= 2 ? s.tier !== 'boss' && s.stage <= 2
    : region === 3 ? s.tier !== 'boss' : true);
  if (!pool.length) pool = SPECIES.filter(s => s.tier === 'basic');
  const range = [[2, 5], [8, 13], [14, 19], [22, 28], [27, 34]][region];
  const points = REGION_LAYOUTS[region].wildSites.map((site, i) => {
    const weight = s => (s.element === site.habitatElement ? 4 : 1) * (s.tier === site.tier ? 2 : 1) *
      ({ basic: 4, evolved: 2, boss: 1 })[s.tier];
    let roll = random() * pool.reduce((sum, s) => sum + weight(s), 0);
    let index = 0;
    while (index < pool.length - 1 && roll >= weight(pool[index])) roll -= weight(pool[index++]);
    const s = pool.splice(index, 1)[0];
    const level = Math.max(s.stage >= 3 || s.tier === 'boss' ? 26 : 1,
      range[0] + Math.floor(random() * (range[1] - range[0] + 1)));
    random();
    const individualSeed = seed;
    return { id: `wild-${i}`, x: site.x, z: site.z, type: 'wild', speciesId: s.id, label: s.name, level, individualSeed };
  });
  points.push(...REGION_LAYOUTS[region].points.filter(point =>
    (point.type !== 'rival' || !defeatedRivals.includes(region)) &&
    (point.type !== 'supply' || !claimed.includes(`${region}:${point.id}`))).map(point => ({ ...point })));
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
