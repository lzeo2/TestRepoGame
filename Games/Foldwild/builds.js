import { BY_ID, SPECIES } from './data.js';
import { COSMETICS, CONTRACTS } from './economy.js';

export const CLASSES = Object.freeze({
  pathfinder: Object.freeze({ id: 'pathfinder', name: 'Pathfinder',
    description: 'An expedition guide. Available from the first route.', unlock: 'Always available.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 0, switchEnergy: 0, waitEnergy: 0 }) }),
  binder: Object.freeze({ id: 'binder', name: 'Binder',
    description: 'Adds 4 percentage points to capture chance, within the capture cap.', unlock: 'Catch three different species.',
    perks: Object.freeze({ captureBonus: 0.04, shieldBonus: 0, switchEnergy: 0, waitEnergy: 0 }) }),
  warden: Object.freeze({ id: 'warden', name: 'Warden',
    description: 'Adds 2 shield when a shield is applied, within the shield cap.', unlock: 'Complete one regional trial.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 2, switchEnergy: 0, waitEnergy: 0 }) }),
  tactician: Object.freeze({ id: 'tactician', name: 'Tactician',
    description: 'Restores 1 extra energy when switching, within the energy cap.', unlock: 'Catch species from three elements.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 0, switchEnergy: 1, waitEnergy: 0 }) }),
  quartermaster: Object.freeze({ id: 'quartermaster', name: 'Quartermaster',
    description: 'A supply specialist. Supply contracts establish this field role.', unlock: 'Complete one supply contract.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 0, switchEnergy: 0, waitEnergy: 0 }) })
});
export const TRAITS = Object.freeze({
  neutral: Object.freeze({ id: 'neutral', name: 'Neutral', description: 'No disposition bonus.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 0, switchEnergy: 0, waitEnergy: 0 }) }),
  steady: Object.freeze({ id: 'steady', name: 'Steady', description: 'Adds 1 shield when a shield is applied, within the shield cap.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 1, switchEnergy: 0, waitEnergy: 0 }) }),
  nimble: Object.freeze({ id: 'nimble', name: 'Nimble', description: 'Restores 1 extra energy when switching, within the energy cap.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 0, switchEnergy: 1, waitEnergy: 0 }) }),
  resourceful: Object.freeze({ id: 'resourceful', name: 'Resourceful', description: 'Restores 1 extra energy when waiting, within the energy cap.',
    perks: Object.freeze({ captureBonus: 0, shieldBonus: 0, switchEnergy: 0, waitEnergy: 1 }) })
});
const PROFILE_KEYS = ['hp', 'energy', 'attack', 'defense', 'speed'];
const TRAIT_IDS = Object.keys(TRAITS);
const SYNERGIES = Object.freeze({
  coverage: Object.freeze({ id: 'coverage', name: 'Coverage', description: 'Three different elements restore 1 extra energy when switching.', switchEnergy: 1, shieldBonus: 0 }),
  kinship: Object.freeze({ id: 'kinship', name: 'Kinship', description: 'Two creatures of one family add 1 shield when a shield is applied.', switchEnergy: 0, shieldBonus: 1 }),
  none: Object.freeze({ id: 'none', name: 'No Synergy', description: 'Use three different elements or two creatures of one family.', switchEnergy: 0, shieldBonus: 0 })
});
function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`Invalid ${label}.`);
  return value;
}
function plain(value, label) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      ['__proto__', 'constructor', 'prototype'].some(key => Object.hasOwn(value, key))) {
    throw new TypeError(`Invalid ${label}.`);
  }
  return value;
}
function field(object, key) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw new TypeError(`Missing or invalid ${key}.`);
  return descriptor.value;
}
function optional(object, key, fallback) { return Object.hasOwn(object, key) ? field(object, key) : fallback; }
function known(catalog, id, label) {
  if (typeof id !== 'string' || !Object.hasOwn(catalog, id)) throw new RangeError(`Unknown ${label}.`);
  return id;
}
function list(value, max, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) {
    throw new RangeError(`Invalid ${label}.`);
  }
  const copy = Array.from(value);
  if (new Set(copy).size !== copy.length) throw new RangeError(`Duplicate ${label}.`);
  return copy;
}

export function generateIndividual(seed) {
  integer(seed, 0, 0xffffffff, 'individual seed');
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const amount = random() < 0.5 ? 4 : 8;
  const values = [-amount, -amount, 0, amount, amount];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return { profile: Object.fromEntries(PROFILE_KEYS.map((key, i) => [key, values[i]])),
    traitId: TRAIT_IDS[Math.floor(random() * TRAIT_IDS.length)] };
}

// Accept either a creature or createCreature's options; only canonical build fields leave here.
export function validateIndividual(value = {}) {
  plain(value, 'individual');
  let profile = Object.fromEntries(PROFILE_KEYS.map(key => [key, 0]));
  if (Object.hasOwn(value, 'profile')) {
    const raw = plain(field(value, 'profile'), 'profile');
    if (Reflect.ownKeys(raw).length !== PROFILE_KEYS.length || PROFILE_KEYS.some(key => !Object.hasOwn(raw, key))) {
      throw new RangeError('Invalid profile keys.');
    }
    profile = Object.fromEntries(PROFILE_KEYS.map(key => [key, integer(field(raw, key), -8, 8, `profile ${key}`)]));
    if (Object.values(profile).reduce((sum, n) => sum + n, 0) !== 0) throw new RangeError('Profile budget must sum to zero.');
  }
  return { profile, traitId: known(TRAITS, optional(value, 'traitId', 'neutral'), 'trait'),
    cosmeticId: known(COSMETICS, optional(value, 'cosmeticId', 'none'), 'cosmetic') };
}

export function unlockedClasses(state) {
  plain(state, 'class progress');
  const caught = list(optional(state, 'caught', []), SPECIES.length, 'caught species')
    .map(id => known(BY_ID, id, 'species'));
  const trials = list(optional(state, 'defeatedRivals', []), 5, 'trial progress')
    .map(id => integer(id, 0, 4, 'trial id'));
  const contracts = list(optional(state, 'contracts', []), Object.keys(CONTRACTS).length, 'contracts')
    .map(id => known(CONTRACTS, id, 'contract'));
  const result = ['pathfinder'];
  if (caught.length >= 3) result.push('binder');
  if (trials.length) result.push('warden');
  if (new Set(caught.map(id => BY_ID[id].element)).size >= 3) result.push('tactician');
  if (contracts.length) result.push('quartermaster');
  return result;
}

export function synergyFor(team) {
  if (!Array.isArray(team) || Object.getPrototypeOf(team) !== Array.prototype || team.length < 1 || team.length > 3) {
    throw new RangeError('Invalid synergy team size.');
  }
  const species = Array.from(team, creature => BY_ID[known(BY_ID,
    field(plain(creature, 'team creature'), 'speciesId'), 'species')]);
  const id = new Set(species.map(s => s.element)).size === 3 ? 'coverage'
    : new Set(species.map(s => s.family)).size < species.length ? 'kinship' : 'none';
  return { ...SYNERGIES[id] };
}
