import { CAPITAL_BY_ID as BY_ID } from '../../assets/car-arcade/fleet.js';
import { normalizeAmmoInventory, WEAPON_IDS } from './weapons.js';

// Career rewards and ownership remain global. Only resumable body/car state lives here.
export const PROTAGONIST_IDS = Object.freeze(['student', 'corporate', 'basement']);
const DEFAULT_BOUNDS = Object.freeze({ minX: -100000, maxX: 100000, minZ: -100000, maxZ: 100000 });
const copy = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const object = value => value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const keys = (value, expected) => object(value) && Reflect.ownKeys(value).length === expected.length &&
  expected.every(key => {
    const field = Object.getOwnPropertyDescriptor(value, key);
    return field?.enumerable && Object.hasOwn(field, 'value');
  });
const number = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
const integer = (value, max) => Number.isInteger(value) && number(value, 0, max);
const invalid = () => { throw new Error('Invalid protagonist checkpoint.'); };

export function createProtagonistState(saved = null, options = {}) {
  if (!object(options) || Reflect.ownKeys(options).some(key => key !== 'bounds')) invalid();
  const bounds = options.bounds === undefined ? DEFAULT_BOUNDS : options.bounds;
  if (!keys(bounds, ['minX', 'maxX', 'minZ', 'maxZ']) ||
    !Object.values(bounds).every(Number.isFinite) || bounds.minX >= bounds.maxX || bounds.minZ >= bounds.maxZ) invalid();
  // Copy caller bounds so later mutation cannot change this store's validation.
  const limits = { ...bounds };
  const hero = id => { if (!PROTAGONIST_IDS.includes(id)) invalid(); };
  const pose = value => keys(value, ['x', 'z', 'yaw']) &&
    number(value.x, limits.minX, limits.maxX) && number(value.z, limits.minZ, limits.maxZ) && Number.isFinite(value.yaw);
  function checkpoint(value) {
    if (!keys(value, ['mode', 'actor', 'vehicle', 'health', 'weapon', 'ammunition']) ||
      !['foot', 'vehicle'].includes(value.mode) || !pose(value.actor) || !number(value.health, 0, 100) ||
      !['unarmed', ...WEAPON_IDS].includes(value.weapon)) invalid();
    const car = value.vehicle;
    if (!keys(car, ['x', 'z', 'yaw', 'modelId', 'color', 'health', 'stolen']) ||
      !pose({ x: car.x, z: car.z, yaw: car.yaw }) || typeof car.modelId !== 'string' || !Object.hasOwn(BY_ID, car.modelId) ||
      !number(car.health, 0, 100) || typeof car.stolen !== 'boolean' ||
      !(integer(car.color, 0xffffff) || (typeof car.color === 'string' && /^#[0-9a-f]{6}$/i.test(car.color)))) invalid();
    const ammunition=normalizeAmmoInventory(value.ammunition);
    if (!ammunition) invalid();
    const result = copy(value);
    result.ammunition=ammunition;
    result.vehicle.color = typeof car.color === 'number' ? '#' + car.color.toString(16).padStart(6, '0') : car.color.toLowerCase();
    return freeze(result);
  }
  const state = { version: 1, student: null, corporate: null, basement: null };
  if (saved !== null) {
    if (!keys(saved, ['version', ...PROTAGONIST_IDS]) || saved.version !== 1) invalid();
    for (const id of PROTAGONIST_IDS) state[id] = saved[id] === null ? null : checkpoint(saved[id]);
  }
  return Object.freeze({
    capture(id, value) {
      hero(id);
      // Validate before replacing the previous valid checkpoint.
      const next = checkpoint(value);
      state[id] = next;
      return freeze(copy(next));
    },
    get(id) { hero(id); return freeze(copy(state[id])); },
    serialize() { return freeze(copy(state)); },
  });
}

// Interior captures use the controller's checked exterior exit pose. Restoring the
// pose requires live collision checks; speed, room, police, rides and recovery are
// intentionally absent. The controller always resumes cars and actors at rest.
