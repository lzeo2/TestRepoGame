// Pure transactions. The world/save boundary owns persistence and non-economic fields.
export const ITEMS = Object.freeze({
  kite: Object.freeze({ id: 'kite', name: 'Latch Kite', price: 12, sell: 0 }),
  patch: Object.freeze({ id: 'patch', name: 'Recovery Patch', price: 18, sell: 6 }),
  charge: Object.freeze({ id: 'charge', name: 'Energy Charge', price: 16, sell: 5 }),
  fiber: Object.freeze({ id: 'fiber', name: 'Field Fiber', price: 5, sell: 1 })
});
export const COSMETICS = Object.freeze({
  none: Object.freeze({ id: 'none', name: 'Original Appearance', price: 0 }),
  badge: Object.freeze({ id: 'badge', name: 'Paper Badge', price: 20 }),
  scarf: Object.freeze({ id: 'scarf', name: 'Paper Scarf', price: 35 }),
  'paper-hat': Object.freeze({ id: 'paper-hat', name: 'Paper Hat', price: 45 })
});
const STOCK = Object.freeze({ kite: 16, patch: 8, charge: 8, fiber: 12 });
const SHOP_NAMES = {
  'meadow-main': 'Meadow Outpost', 'meadow-road': 'Meadow Road Post',
  'reach-main': 'Reach Outpost', 'reach-road': 'Reach Road Post',
  'quarry-main': 'Quarry Outpost', 'quarry-road': 'Quarry Road Post',
  'ridge-main': 'Ridge Outpost', 'ridge-road': 'Ridge Road Post',
  'hollow-main': 'Hollow Outpost'
};
const itemIds = Object.freeze(Object.keys(ITEMS));
const cosmeticIds = Object.freeze(Object.keys(COSMETICS));
export const SHOPS = Object.freeze(Object.fromEntries(Object.entries(SHOP_NAMES).map(([id, name]) =>
  [id, Object.freeze({ id, name, role: 'items', items: itemIds, cosmetics: cosmeticIds })])));
export const CONTRACTS = Object.freeze(Object.fromEntries(Object.values(SHOPS).map(shop => {
  const id = `${shop.id}-supply`;
  return [id, Object.freeze({ id, shopId: shop.id, name: `${shop.name} Supplies`,
    materialId: 'fiber', quantity: 3, reward: 35 })];
})));

function integer(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new RangeError(`Invalid ${label}: expected integer ${min}..${max}.`);
  }
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
function known(catalog, id, label) {
  if (typeof id !== 'string' || !Object.hasOwn(catalog, id)) throw new RangeError(`Unknown ${label}.`);
  return catalog[id];
}
function keys(value, expected, label) {
  plain(value, label);
  if (Reflect.ownKeys(value).length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    throw new RangeError(`Invalid ${label} keys.`);
  }
}
function ids(value, max, valid, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > max) {
    throw new RangeError(`Invalid ${label}.`);
  }
  const copy = Array.from(value);
  if (new Set(copy).size !== copy.length || copy.some(id => !valid(id))) throw new RangeError(`Invalid ${label} ids.`);
}
function validateEconomy(state) {
  plain(state, 'economic state');
  integer(field(state, 'marks'), 0, 1e6, 'Marks');
  integer(field(state, 'kites'), 0, 999, 'kites');
  const encounterIndex = integer(field(state, 'encounterIndex'), 0, 1e9, 'encounter counter');
  const inventory = field(state, 'inventory');
  keys(inventory, ['patch', 'charge', 'fiber'], 'inventory');
  for (const id of ['patch', 'charge', 'fiber']) integer(field(inventory, id), 0, 999, id);
  const cosmetics = field(state, 'cosmetics');
  ids(cosmetics, cosmeticIds.length, id => typeof id === 'string' && Object.hasOwn(COSMETICS, id), 'cosmetics');
  if (!cosmetics.includes('none')) throw new RangeError('Original appearance must remain owned.');
  const shops = field(state, 'shops');
  keys(shops, Object.keys(SHOPS), 'shops');
  for (const id of Object.keys(SHOPS)) {
    const shop = field(shops, id);
    keys(shop, ['epoch', 'stock'], 'shop record');
    integer(field(shop, 'epoch'), 0, Math.floor(encounterIndex / 5), 'stock epoch');
    const stock = field(shop, 'stock');
    keys(stock, itemIds, 'stock');
    for (const item of itemIds) integer(field(stock, item), 0, 999, 'stock quantity');
  }
  ids(field(state, 'contracts'), Object.keys(CONTRACTS).length,
    id => typeof id === 'string' && Object.hasOwn(CONTRACTS, id), 'contracts');
  ids(field(state, 'claimedSupplies'), 15, id => typeof id === 'string' &&
    /^[0-4]:supply-[0-2]$/.test(id), 'claimed supplies');
}
function snapshot(state) {
  validateEconomy(state);
  return structuredClone(state);
}
function result(state) {
  validateEconomy(state);
  return state;
}
function count(state, id) { return id === 'kite' ? state.kites : state.inventory[id]; }
function setCount(state, id, quantity) {
  integer(quantity, 0, 999, `${id} quantity`);
  if (id === 'kite') state.kites = quantity;
  else state.inventory[id] = quantity;
}

// Kites and encounterIndex are existing world fields, not duplicated here.
export function freshEconomy() {
  return { marks: 90, inventory: { patch: 2, charge: 2, fiber: 0 }, cosmetics: ['none'],
    shops: Object.fromEntries(Object.keys(SHOPS).map(id => [id, { epoch: 0, stock: { ...STOCK } }])),
    contracts: [], claimedSupplies: [] };
}

export function buyItem(state, shopId, id, quantity = 1) {
  known(SHOPS, shopId, 'shop');
  const item = known(ITEMS, id, 'item');
  integer(quantity, 1, 999, 'quantity');
  const next = snapshot(state);
  if (next.shops[shopId].stock[id] < quantity) throw new RangeError('Insufficient stock.');
  if (next.marks < item.price * quantity) throw new RangeError('Insufficient Marks.');
  setCount(next, id, count(next, id) + quantity);
  next.marks -= item.price * quantity;
  next.shops[shopId].stock[id] -= quantity;
  return result(next);
}
export function sellItem(state, shopId, id, quantity = 1) {
  known(SHOPS, shopId, 'shop');
  const item = known(ITEMS, id, 'item');
  integer(quantity, 1, 999, 'quantity');
  if (item.sell === 0) throw new RangeError('Camp-refillable Latch Kites cannot be sold.');
  const next = snapshot(state);
  if (count(next, id) < quantity) throw new RangeError('Insufficient items.');
  setCount(next, id, count(next, id) - quantity);
  next.marks += item.sell * quantity;
  // Sold goods rejoin this shop's stock, still bounded by the item cap.
  next.shops[shopId].stock[id] += quantity;
  return result(next);
}
export function buyCosmetic(state, shopId, id, quantity = 1) {
  known(SHOPS, shopId, 'shop');
  const cosmetic = known(COSMETICS, id, 'cosmetic');
  integer(quantity, 1, 1, 'cosmetic quantity');
  const next = snapshot(state);
  if (next.cosmetics.includes(id)) throw new RangeError('Cosmetic already owned.');
  if (next.marks < cosmetic.price) throw new RangeError('Insufficient Marks.');
  next.marks -= cosmetic.price;
  next.cosmetics.push(id);
  return result(next);
}
export function completeContract(state, contractId) {
  const contract = known(CONTRACTS, contractId, 'contract');
  const next = snapshot(state);
  if (next.contracts.includes(contractId)) throw new RangeError('Contract already completed.');
  if (next.inventory[contract.materialId] < contract.quantity) throw new RangeError('Insufficient fiber.');
  next.inventory[contract.materialId] -= contract.quantity;
  next.marks += contract.reward;
  next.contracts.push(contractId);
  return result(next);
}
export function refreshStock(state, shopId) {
  known(SHOPS, shopId, 'shop');
  const next = snapshot(state);
  const epoch = Math.floor(next.encounterIndex / 5);
  if (epoch > next.shops[shopId].epoch) next.shops[shopId] = { epoch, stock: { ...STOCK } };
  return next;
}
