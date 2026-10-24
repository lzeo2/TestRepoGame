/** Deterministic, browser-independent game rules. Actions mutate only their state. */
export const CATALOG = Object.freeze([
  { index: 0, name: 'Loaf Penguin', rarity: 'Common', color: '#ffcc78', price: 100, income: 5, description: 'Freshly baked. Permanently confused.' },
  { index: 1, name: 'Espresso Octopus', rarity: 'Uncommon', color: '#c894ff', price: 260, income: 12, description: 'Eight arms. Nine coffees. Zero chill.' },
  { index: 2, name: 'Cactus DJ', rarity: 'Rare', color: '#68e8a5', price: 620, income: 27, description: 'Drops beats and occasionally needles.' },
  { index: 3, name: 'Lunar Cow', rarity: 'Epic', color: '#94ceff', price: 1400, income: 60, description: 'One small moo for cowkind.' },
  { index: 4, name: 'Disco Banana', rarity: 'Legendary', color: '#ffe166', price: 3000, income: 130, description: 'Slippery moves. Unstoppable groove.' },
  { index: 5, name: 'Cosmic Duck', rarity: 'Mythic', color: '#fe92de', price: 6500, income: 280, description: 'The universe is just one big pond.' },
  { index: 6, name: 'Volcano Ravioli', rarity: 'Secret', color: '#ff8869', price: 14000, income: 620, description: 'Warning: filling hotter than the sun.' },
  { index: 7, name: 'Noodle Dragon', rarity: 'Divine', color: '#80fff0', price: 35000, income: 1550, description: 'Ancient power. Al dente attitude.' },
  { index: 8, name: 'The Uninvited', rarity: 'Forbidden', color: '#d9b39c', price: 0, income: 2400, unlockOnly: true, description: 'The same tooth-baring creature. It remembers the shrine.' },
].map(Object.freeze));
export const SECRET_KIND = 8;

const MAX_MONEY = 1e15;
const MAX_COUNTER = 1e9;
const MAX_ID = Number.MAX_SAFE_INTEGER - 16;
const UPGRADE_PRICES = Object.freeze({
  slots: Object.freeze([900, 1800, 3600, 7200]),
  speed: Object.freeze([750, 2200, 6000]),
  lock: Object.freeze([900, 2600, 7000]),
});

/** The optional seed is reserved for callers; these rules contain no randomness. */
export function createState(_seed) {
  return {
    version: 1, money: 450, lifetime: 0, rebirths: 0, capacity: 6,
    speedLevel: 0, lockLevel: 0, owned: [], collection: [],
    stats: { buys: 0, steals: 0, defends: 0 }, nextId: 1, secretClaimed: false,
  };
}

const validKind = kind => Number.isInteger(kind) && kind >= 0 && kind < CATALOG.length;
const validState = state => state !== null && typeof state === 'object'
  && Array.isArray(state.owned) && Array.isArray(state.collection)
  && state.stats !== null && typeof state.stats === 'object'
  && Number.isFinite(state.money) && state.money >= 0
  && Number.isInteger(state.capacity) && state.capacity >= 6 && state.capacity <= 10
  && Number.isSafeInteger(state.nextId) && state.nextId > 0 && state.nextId <= MAX_ID;
const failure = reason => ({ ok: false, reason });
const boundedNumber = (value, fallback, min, max, integer = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, integer ? Math.floor(value) : value));
};

export function incomeRate(state) {
  if (!validState(state)) return 0;
  const base = state.owned.reduce((total, item) => total + (validKind(item?.kind) ? CATALOG[item.kind].income : 0), 0);
  const rebirths = boundedNumber(state.rebirths, 0, 0, 1000, true);
  return base * (1 + rebirths * 0.25);
}

function acquire(state, kind, isStolen) {
  if (!validState(state)) return failure('Invalid game state');
  if (!validKind(kind)) return failure('Unknown brainrot');
  if (state.owned.length >= state.capacity) return failure('Your base is full');
  if (!isStolen && state.money < CATALOG[kind].price) return failure('Not enough cash');
  if (state.nextId >= MAX_ID) return failure('Collection ID limit reached');
  // IDs stay unique even if a caller has manually edited nextId.
  while (state.owned.some(item => item.id === state.nextId)) state.nextId += 1;
  if (state.nextId >= MAX_ID) return failure('Collection ID limit reached');
  const item = { id: state.nextId++, kind };
  if (!isStolen) state.money -= CATALOG[kind].price;
  state.owned.push(item);
  if (kind === SECRET_KIND) state.secretClaimed = true;
  if (!state.collection.includes(kind)) state.collection.push(kind);
  const counter = isStolen ? 'steals' : 'buys';
  state.stats[counter] = Math.min(MAX_COUNTER, boundedNumber(state.stats[counter], 0, 0, MAX_COUNTER, true) + 1);
  return { ok: true, item };
}

export function buy(state, kind) {
  if (CATALOG[kind]?.unlockOnly) return failure('Find the forgotten shrine to unlock this creature');
  return acquire(state, kind, false);
}

export function secretRequirement(state) {
  if (!validState(state)) return failure('Invalid game state');
  if (state.secretClaimed) return failure('The shrine is silent until your next rebirth');
  const discoveries = new Set(state.collection.filter(kind => validKind(kind) && kind !== SECRET_KIND)).size;
  if (discoveries < 3) return failure(`Discover ${3 - discoveries} more original creature${3 - discoveries === 1 ? '' : 's'} to wake the shrine`);
  if (state.owned.length >= state.capacity) return failure('Your base is full. Upgrade a pedestal first');
  return { ok: true };
}

export function claimSecret(state) {
  const requirement = secretRequirement(state);
  if (!requirement.ok) return requirement;
  const previousSteals = boundedNumber(state.stats.steals, 0, 0, MAX_COUNTER, true);
  const result = acquire(state, SECRET_KIND, true);
  if (result.ok) { state.secretClaimed = true; state.stats.steals = previousSteals; }
  return result;
}
export function addStolen(state, kind) { return acquire(state, kind, true); }

/** Removal does not sell/refund a unit and never erases discovered collection entries. */
export function removeOwned(state, id) {
  if (!validState(state)) return failure('Invalid game state');
  if (!Number.isSafeInteger(id) || id < 1) return failure('Unknown brainrot');
  const index = state.owned.findIndex(item => item.id === id);
  if (index < 0) return failure('Unknown brainrot');
  const [item] = state.owned.splice(index, 1);
  return { ok: true, item };
}

export function upgradeCost(state, type) {
  if (!validState(state) || !Object.hasOwn(UPGRADE_PRICES, type)) return Infinity;
  const level = type === 'slots' ? state.capacity - 6 : state[`${type}Level`];
  return Number.isInteger(level) && level >= 0 ? UPGRADE_PRICES[type][level] ?? Infinity : Infinity;
}

export function upgrade(state, type) {
  if (!validState(state)) return failure('Invalid game state');
  if (!Object.hasOwn(UPGRADE_PRICES, type)) return failure('Unknown upgrade');
  const cost = upgradeCost(state, type);
  if (!Number.isFinite(cost)) return failure('Upgrade already maxed');
  if (state.money < cost) return failure('Not enough cash');
  state.money -= cost;
  if (type === 'slots') state.capacity += 1;
  else state[`${type}Level`] += 1;
  return { ok: true };
}

export function rebirthCost(state) {
  const rebirths = boundedNumber(state?.rebirths, 0, 0, 1000, true);
  return 25000 * (rebirths + 1) ** 2;
}

export function rebirth(state) {
  if (!validState(state)) return failure('Invalid game state');
  if (state.rebirths >= 1000) return failure('Rebirth limit reached');
  if (state.money < rebirthCost(state)) return failure('Not enough cash');
  state.money = 450;
  state.rebirths += 1;
  state.capacity = 6;
  state.speedLevel = 0;
  state.lockLevel = 0;
  state.owned = [];
  state.secretClaimed = false;
  return { ok: true };
}

/** Credit elapsed seconds. Returns the money credited; invalid time is a no-op. */
export function tickIncome(state, dt) {
  if (!validState(state) || typeof dt !== 'number' || !Number.isFinite(dt) || dt <= 0) return 0;
  const earned = Math.min(MAX_MONEY, incomeRate(state) * dt);
  const previousMoney = state.money;
  state.money = Math.min(MAX_MONEY, state.money + earned);
  state.lifetime = Math.min(MAX_MONEY, boundedNumber(state.lifetime, 0, 0, MAX_MONEY) + earned);
  return state.money - previousMoney;
}

/** Only schema-approved fields survive a save; rendering and transient combat data do not. */
export function serialize(state) { return JSON.stringify(restore(state)); }

/** Malformed, unsupported, or polluted saves safely become a fresh or sanitized state. */
export function restore(jsonOrObj) {
  const state = createState();
  try {
    const raw = typeof jsonOrObj === 'string' ? JSON.parse(jsonOrObj) : jsonOrObj;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.version !== 1) return state;
    state.money = boundedNumber(raw.money, 450, 0, MAX_MONEY);
    state.lifetime = boundedNumber(raw.lifetime, 0, 0, MAX_MONEY);
    state.rebirths = boundedNumber(raw.rebirths, 0, 0, 1000, true);
    state.capacity = boundedNumber(raw.capacity, 6, 6, 10, true);
    state.speedLevel = boundedNumber(raw.speedLevel, 0, 0, 3, true);
    state.lockLevel = boundedNumber(raw.lockLevel, 0, 0, 3, true);
    const seenIds = new Set();
    if (Array.isArray(raw.owned)) {
      for (const item of raw.owned.slice(0, 1000)) {
        if (state.owned.length >= state.capacity) break;
        if (!item || !validKind(item.kind) || !Number.isSafeInteger(item.id)
          || item.id < 1 || item.id >= MAX_ID || seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        state.owned.push({ id: item.id, kind: item.kind });
      }
    }
    if (Array.isArray(raw.collection)) state.collection = [...new Set(raw.collection.slice(0, 1000).filter(validKind))];
    for (const item of state.owned) if (!state.collection.includes(item.kind)) state.collection.push(item.kind);
    for (const key of ['buys', 'steals', 'defends']) {
      state.stats[key] = boundedNumber(raw.stats?.[key], 0, 0, MAX_COUNTER, true);
    }
    state.secretClaimed = raw.secretClaimed === true || state.owned.some(item => item.kind === SECRET_KIND);
    const highestId = state.owned.reduce((max, item) => Math.max(max, item.id), 0);
    state.nextId = Math.max(highestId + 1, boundedNumber(raw.nextId, 1, 1, MAX_ID, true));
    return state;
  } catch {
    return createState();
  }
}
