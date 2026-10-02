import assert from 'node:assert/strict';
import { ITEMS, COSMETICS, SHOPS, CONTRACTS, freshEconomy, buyItem, sellItem,
  buyCosmetic, completeContract, refreshStock } from '../Games/Foldwild/economy.js';

const shop = 'meadow-main';
const contract = `${shop}-supply`;
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
const fresh = () => ({ ...freshEconomy(), kites: 8, encounterIndex: 0,
  region: 0, untouched: { roster: [{ uid: 'owned-1' }] } });
function rejected(state, action, pattern) {
  const before = structuredClone(state);
  assert.throws(() => action(freeze(state)), pattern);
  assert.deepEqual(state, before);
}
const initial = freeze(fresh());
assert.deepEqual(Object.keys(freshEconomy()).sort(),
  ['marks', 'inventory', 'cosmetics', 'shops', 'contracts', 'claimedSupplies'].sort());
assert.equal(initial.marks, 90);
assert.deepEqual(initial.inventory, { patch: 2, charge: 2, fiber: 0 });
assert.equal(Object.keys(SHOPS).length, 9);
assert.equal(Object.keys(CONTRACTS).length, 9);
for (const [id, record] of Object.entries(SHOPS)) {
  assert.equal(record.id, id);
  assert.deepEqual(initial.shops[id], { epoch: 0, stock: { kite: 16, patch: 8, charge: 8, fiber: 12 } });
  assert.equal(CONTRACTS[`${id}-supply`].shopId, id);
  assert.equal(buyItem(initial, id, 'fiber').marks, 85);
  assert.equal(buyCosmetic(initial, id, 'badge').marks, 70);
}
assert.deepEqual(fresh(), structuredClone(initial));
const bought = buyItem(initial, shop, 'kite', 2);
assert.equal(bought.kites, 10);
assert.equal(bought.marks, 66);
assert.equal(bought.shops[shop].stock.kite, 14);
assert.notEqual(bought.untouched, initial.untouched);
assert.deepEqual(bought.untouched, initial.untouched);
const reload = freeze(JSON.parse(JSON.stringify(bought)));
assert.deepEqual(refreshStock(reload, shop), reload);
assert.equal(buyItem(reload, shop, 'kite').shops[shop].stock.kite, 13);
assert.equal(refreshStock({ ...reload, encounterIndex: 4 }, shop).shops[shop].stock.kite, 14);
const refreshed = refreshStock({ ...reload, encounterIndex: 5 }, shop);
assert.deepEqual(refreshed.shops[shop], { epoch: 1, stock: { kite: 16, patch: 8, charge: 8, fiber: 12 } });
assert.deepEqual(refreshed.shops['reach-main'], reload.shops['reach-main']);
assert.equal(refreshStock(buyItem(refreshed, shop, 'kite'), shop).shops[shop].stock.kite, 15);
assert.equal(refreshStock({ ...reload, encounterIndex: 15 }, shop).shops[shop].epoch, 3);

for (const id of Object.keys(ITEMS)) {
  assert.ok(ITEMS[id].sell < ITEMS[id].price);
  const roundTrip = sellItem(buyItem(initial, shop, id), shop, id);
  assert.equal(roundTrip.marks, initial.marks - ITEMS[id].price + ITEMS[id].sell);
  assert.deepEqual(roundTrip.inventory, initial.inventory);
  assert.equal(roundTrip.kites, initial.kites);
  assert.deepEqual(roundTrip.shops, initial.shops);
  for (const quantity of [0, -1, 0.1, NaN, Infinity, '1', null, 1000, 65535]) {
    rejected(fresh(), s => buyItem(s, shop, id, quantity));
    rejected(fresh(), s => sellItem(s, shop, id, quantity));
  }
}
for (const id of ['badge', 'scarf', 'paper-hat']) {
  const dressed = buyCosmetic(initial, shop, id);
  assert.equal(dressed.marks, 90 - COSMETICS[id].price);
  assert.deepEqual(dressed.cosmetics, ['none', id]);
  rejected(dressed, s => buyCosmetic(s, shop, id), /already owned/);
}
rejected(fresh(), s => buyCosmetic(s, shop, 'none'), /already owned/);
for (const quantity of [0, -1, 2, 1.5, NaN, Infinity, '1', 65535]) {
  rejected(fresh(), s => buyCosmetic(s, shop, 'badge', quantity));
}
for (const id of ['__proto__', 'constructor', 'toString', 'unknown']) {
  rejected(fresh(), s => buyItem(s, id, 'kite'), /Unknown shop/);
  rejected(fresh(), s => sellItem(s, id, 'kite'), /Unknown shop/);
  rejected(fresh(), s => buyCosmetic(s, id, 'badge'), /Unknown shop/);
  rejected(fresh(), s => refreshStock(s, id), /Unknown shop/);
  rejected(fresh(), s => buyItem(s, shop, id), /Unknown item/);
  rejected(fresh(), s => sellItem(s, shop, id), /Unknown item/);
  rejected(fresh(), s => buyCosmetic(s, shop, id), /Unknown cosmetic/);
  rejected(fresh(), s => completeContract(s, id), /Unknown contract/);
}
const supplied = buyItem(initial, shop, 'fiber', 3);
const delivered = completeContract(freeze(supplied), contract);
assert.equal(delivered.inventory.fiber, 0);
assert.equal(delivered.marks, 110);
assert.deepEqual(delivered.contracts, [contract]);
rejected(JSON.parse(JSON.stringify(delivered)), s => completeContract(s, contract), /already completed/);
rejected(fresh(), s => completeContract(s, contract), /Insufficient fiber/);
rejected({ ...fresh(), marks: 0 }, s => buyItem(s, shop, 'kite'), /Insufficient Marks/);
rejected({ ...fresh(), marks: 0 }, s => buyCosmetic(s, shop, 'badge'), /Insufficient Marks/);
rejected(fresh(), s => buyItem(s, shop, 'kite', 17), /stock/);
rejected(fresh(), s => sellItem(s, shop, 'fiber'), /Insufficient items/);
rejected({ ...fresh(), kites: 999 }, s => buyItem(s, shop, 'kite'), /quantity/);
rejected({ ...fresh(), inventory: { patch: 999, charge: 2, fiber: 0 } }, s => buyItem(s, shop, 'patch'), /quantity/);
rejected({ ...fresh(), marks: 1e6 }, s => sellItem(s, shop, 'kite'), /Marks/);
rejected({ ...fresh(), marks: 1e6, inventory: { patch: 2, charge: 2, fiber: 3 } },
  s => completeContract(s, contract), /Marks/);
const fullStock = fresh();
fullStock.shops[shop].stock.kite = 999;
rejected(fullStock, s => sellItem(s, shop, 'kite'), /stock quantity/);
for (const counter of [-1, 1.5, NaN, Infinity, '5', 1e9 + 1]) {
  rejected({ ...fresh(), encounterIndex: counter }, s => refreshStock(s, shop));
}
for (const marks of [-1, 0.1, NaN, Infinity, '90', 1e6 + 1]) {
  rejected({ ...fresh(), marks }, s => buyItem(s, shop, 'kite'));
}
for (const value of [-1, 0.5, NaN, Infinity, '2', 1000]) {
  const state = fresh();
  state.inventory.patch = value;
  rejected(state, s => refreshStock(s, shop));
}
for (const state of [
  { ...fresh(), cosmetics: ['none', 'constructor'] },
  { ...fresh(), cosmetics: ['badge'] },
  { ...fresh(), contracts: ['constructor'] },
  { ...fresh(), contracts: [contract, contract] },
  { ...fresh(), claimedSupplies: ['__proto__'] },
  { ...fresh(), inventory: JSON.parse('{"patch":2,"charge":2,"fiber":0,"__proto__":0}') }
]) rejected(state, s => refreshStock(s, shop));
const inherited = fresh();
inherited.inventory = Object.create({ patch: 2, charge: 2, fiber: 0 });
assert.throws(() => refreshStock(inherited, shop), /inventory/);
const inheritedStock = fresh();
inheritedStock.shops[shop].stock = Object.create(initial.shops[shop].stock);
assert.throws(() => refreshStock(inheritedStock, shop), /stock/);
const invalidEpoch = fresh();
invalidEpoch.shops[shop].epoch = 1;
rejected(invalidEpoch, s => refreshStock(s, shop), /epoch/);
// World material claims remain valid through every transaction and save check.
const claims = Array.from({ length: 5 }, (_, region) =>
  Array.from({ length: 3 }, (_, site) => `${region}:supply-${site}`)).flat();
const claimed = freeze({ ...fresh(), claimedSupplies: claims });
assert.deepEqual(buyItem(claimed, shop, 'kite').claimedSupplies, claims);
assert.deepEqual(refreshStock(claimed, shop).claimedSupplies, claims);
for (const id of ['supply-0', '5:supply-0', '0:supply-3', '-1:supply-0', '0:constructor', '0:supply-0:extra']) {
  rejected({ ...fresh(), claimedSupplies: [id] }, s => refreshStock(s, shop), /claimed supplies/);
}
rejected({ ...fresh(), claimedSupplies: ['0:supply-0', '0:supply-0'] }, s => refreshStock(s, shop), /claimed supplies/);
const separate = freshEconomy();
separate.shops[shop].stock.kite = 0;
assert.equal(freshEconomy().shops[shop].stock.kite, 16);
console.log('Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards).');
