import assert from 'node:assert/strict';
import * as core from '../Games/Garage Borough/core.js';
import { CARS } from '../assets/car-arcade/fleet.js';

const { freshBusiness, validateBusiness, tickBusiness, buyStock, restoreCar,
  sellCar, wholesaleCar, hireStaff, expandGarage, continueBusiness } = core;
let checks = 0;
function check(name, run) {
  run(); checks++;
  console.log(`PASS ${name}`);
}
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function advance(state, seconds) {
  assert.equal(Number.isInteger(seconds * 20), true);
  for (let i = 0; i < seconds * 20; i++) state = tickBusiness(state, 0.05);
  return state;
}
function rejectsUnchanged(state, action) {
  const before = JSON.stringify(state);
  assert.throws(() => action(freeze(state)));
  assert.equal(JSON.stringify(state), before);
}
// Explicit synthetic fixture, not an exposed runtime grant or natural-play proof.
function fixture(patch) { return validateBusiness({ ...freshBusiness(), ...patch }); }

check('exact exports and canonical fresh business', () => {
  assert.deepEqual(Object.keys(core).sort(), ['freshBusiness', 'validateBusiness', 'tickBusiness',
    'buyStock', 'restoreCar', 'sellCar', 'wholesaleCar', 'hireStaff', 'expandGarage', 'continueBusiness'].sort());
  const s = freshBusiness();
  assert.equal(s.cash, 800);
  assert.equal(s.bays, 1);
  assert.equal(s.staff, 0);
  assert.deepEqual(s.inventory, []);
  assert.equal(s.customers[0].style, 'compact');
  assert.deepEqual(validateBusiness(freeze(s)), s);
  assert.notEqual(validateBusiness(s).customers, s.customers);
});

check('normal API job sequence and exact cash conservation, frozen inputs', () => {
  const fresh = freeze(freshBusiness());
  const bought = buyStock(fresh, 'bricklet');
  assert.equal(fresh.cash, 800);
  assert.equal(bought.cash, 600);
  assert.equal(bought.inventory[0].condition, 45);
  const uid = bought.inventory[0].uid;
  const customer = bought.customers[0].uid;
  rejectsUnchanged(bought, s => sellCar(s, uid, customer));
  const restored = restoreCar(bought, uid);
  assert.equal(restored.cash, 550);
  assert.equal(restored.inventory[0].condition, 70);
  const sold = sellCar(freeze(restored), uid, customer);
  assert.equal(sold.cash, 800 - 200 - 50 + 500);
  assert.equal(sold.sales, 1);
  assert.equal(sold.reputation, 1);
  assert.equal(sold.inventory.length, 0);
  assert.equal(sold.customers.length, 0);
  rejectsUnchanged(sold, s => sellCar(s, uid, customer));
  rejectsUnchanged(sold, s => wholesaleCar(s, uid));
  const replacement = restoreCar(buyStock(sold, 'bricklet'), sold.nextUid);
  rejectsUnchanged(replacement, s => sellCar(s, s.inventory[0].uid, customer));
});

check('wholesale recovers stranded stock without a profitable resale loop', () => {
  let s = buyStock(freshBusiness(), 'parcel');
  assert.equal(s.cash, 50);
  rejectsUnchanged(s, x => restoreCar(x, x.inventory[0].uid));
  s = wholesaleCar(s, s.inventory[0].uid);
  assert.equal(s.cash, 425);
  s = buyStock(s, 'bricklet');
  s = restoreCar(s, s.inventory[0].uid);
  s = sellCar(s, s.inventory[0].uid, s.customers[0].uid);
  assert.equal(s.cash, 675);
  for (const car of CARS) {
    const cost = Math.max(200, Math.floor(car.price * 0.5));
    for (const condition of [0, 45, 70, 100]) {
      const synthetic = fixture({ cash: 0, inventory: [{ uid: 2, carId: car.id, condition }], nextUid: 3 });
      const sold = wholesaleCar(synthetic, 2);
      assert.ok(sold.cash >= Math.floor(cost / 2) && sold.cash <= cost);
      assert.equal(sold.sales, 0);
    }
  }
});

check('synthetic all-fleet acquisition/repair/sale formulas and style mismatch', () => {
  for (const car of CARS) {
    const cost = Math.max(200, Math.floor(car.price / 2));
    let s = fixture({ cash: 1_000_000, customers: [{ uid: 1, style: car.style, minCondition: 70, expiresAt: 45 }] });
    s = buyStock(s, car.id);
    s = restoreCar(s, 2);
    assert.equal(s.cash, 1_000_000 - cost - Math.max(50, Math.floor(cost * 0.15)));
    const before = s.cash;
    s = sellCar(s, 2, 1);
    assert.equal(s.cash - before, Math.max(500, Math.floor(cost * 170 / 100)));
  }
  let s = buyStock(fixture({ cash: 5000 }), 'finch');
  s = restoreCar(s, 2);
  rejectsUnchanged(s, x => sellCar(x, 2, 1));
});

check('capacity 2*bays, exact expansion/staff costs and atomic denials', () => {
  let s = fixture({ cash: 20_000 });
  s = expandGarage(s); assert.equal(s.cash, 19_200);
  s = expandGarage(s); assert.equal(s.cash, 17_600);
  s = expandGarage(s); assert.equal(s.cash, 15_200);
  rejectsUnchanged(s, expandGarage);
  for (let i = 0; i < 8; i++) s = buyStock(s, 'bricklet');
  rejectsUnchanged(s, x => buyStock(x, 'bricklet'));
  s = hireStaff(s); assert.equal(s.cash, 13_300);
  s = hireStaff(s); assert.equal(s.cash, 12_750);
  s = hireStaff(s); assert.equal(s.cash, 11_950);
  rejectsUnchanged(s, hireStaff);
  rejectsUnchanged(freshBusiness(), x => buyStock(x, 'sunray'));
  rejectsUnchanged(freshBusiness(), x => restoreCar(x, 99));
});

check('staff active restoration cadence, capped allocation and no stored labor', () => {
  let s = buyStock(hireStaff(freshBusiness()), 'bricklet');
  const cash = s.cash;
  s = advance(s, 2.95); assert.equal(s.inventory[0].condition, 45);
  s = tickBusiness(s, 0.05); assert.equal(s.inventory[0].condition, 46);
  assert.equal(s.cash, cash);
  s = advance(s, 3); assert.equal(s.inventory[0].condition, 47);
  const synthetic = fixture({ staff: 3, nextUid: 4, inventory: [
    { uid: 2, carId: 'bricklet', condition: 99 }, { uid: 3, carId: 'pip', condition: 98 }] });
  const full = advance(synthetic, 3);
  assert.deepEqual(full.inventory.map(item => item.condition), [100, 100]);
  assert.deepEqual(advance(full, 3).inventory.map(item => item.condition), [100, 100]);
  rejectsUnchanged(full, x => restoreCar(x, 2));
  let empty = advance(hireStaff(freshBusiness()), 30);
  empty = buyStock(empty, 'bricklet');
  assert.equal(tickBusiness(empty, 0).inventory[0].condition, 45);
});

check('deterministic demand, bounded expiry, fair stocked style and identity', () => {
  const original = buyStock(freshBusiness(), 'parcel');
  let s = advance(original, 30);
  assert.deepEqual(s, advance(original, 30));
  assert.ok(s.customers.some(buyer => buyer.style === 'utility' && buyer.minCondition === 70));
  const old = s.customers[0].uid;
  s = advance(s, 15);
  assert.ok(!s.customers.some(buyer => buyer.uid === old));
  assert.ok(s.customers.length <= 3);
  assert.equal(new Set([...s.inventory, ...s.customers].map(x => x.uid)).size, s.inventory.length + s.customers.length);
  assert.deepEqual(validateBusiness(s), s);
});

check('120-second rent, no offline income, unpaid closure and stopped states', () => {
  let s = advance(freshBusiness(), 119.95);
  assert.equal(s.cash, 800);
  s = tickBusiness(s, 0.05);
  assert.equal(s.cash, 650);
  assert.equal(s.rentClock, 0);
  assert.equal(s.elapsed, 120);
  s = advance(s, 120); assert.equal(s.cash, 500);
  const staffed = advance(hireStaff(freshBusiness()), 120);
  assert.equal(staffed.cash, 300);
  const closed = advance(expandGarage(freshBusiness()), 120);
  assert.equal(closed.status, 'closed');
  assert.equal(closed.cash, 0);
  assert.deepEqual(advance(closed, 120), closed);
  rejectsUnchanged(closed, x => buyStock(x, 'bricklet'));
  rejectsUnchanged(closed, continueBusiness);
  for (const dt of [-1, 0.050001, Infinity, NaN, '0.05', null]) assert.throws(() => tickBusiness(s, dt));
});

let progression;
check('API-only ten-sales milestone, stopped win, reload, continue exactly once', () => {
  let s = freshBusiness();
  for (let sale = 0; sale < 11; sale++) {
    s = buyStock(s, 'bricklet');
    const uid = s.inventory[0].uid;
    s = restoreCar(s, uid);
    let buyer;
    let steps = 0;
    while (!(buyer = s.customers.find(x => x.style === 'compact' && x.minCondition <= 70))) {
      s = tickBusiness(s, 0.05);
      assert.ok(++steps <= 1200, 'Stock receives an attainable buyer within 60 active seconds');
    }
    s = sellCar(s, uid, buyer.uid);
    if (sale === 9) {
      assert.equal(s.status, 'won'); assert.equal(s.achieved, true);
      assert.deepEqual(tickBusiness(freeze(s), 0.05), s);
      rejectsUnchanged(s, hireStaff);
      s = validateBusiness(JSON.parse(JSON.stringify(s)));
      const cash = s.cash;
      s = continueBusiness(freeze(s));
      assert.equal(s.cash, cash);
      assert.equal(s.status, 'playing');
      rejectsUnchanged(s, continueBusiness);
    }
  }
  assert.equal(s.status, 'playing');
  assert.equal(s.achieved, true);
  assert.equal(s.sales, 11);
  assert.equal(s.cash, 800 + 11 * 250 - Math.floor(s.elapsed / 120) * 150);
  assert.deepEqual(validateBusiness(JSON.parse(JSON.stringify(s))), s);
  progression = { sales: s.sales, cash: s.cash, activeSeconds: s.elapsed };
});

check('synthetic resource caps and detached canonical copies', () => {
  const s = fixture({ cash: 1_000_000_000, nextUid: 3,
    inventory: [{ uid: 2, carId: 'bricklet', condition: 100 }] });
  const sold = sellCar(freeze(s), 2, 1);
  assert.equal(sold.cash, 1_000_000_000);
  assert.equal(sold.sales, 1);
  const copy = validateBusiness(s);
  copy.inventory[0].condition = 0;
  copy.customers[0].style = 'utility';
  assert.equal(s.inventory[0].condition, 100);
  assert.equal(s.customers[0].style, 'compact');
  const fullStaff = advance(fixture({ staff: 3 }), 120);
  assert.equal(fullStaff.cash, 500);
  const exhausted = fixture({ nextUid: 1_000_000_000 });
  rejectsUnchanged(exhausted, x => buyStock(x, 'bricklet'));
  assert.deepEqual(validateBusiness(tickBusiness(exhausted, 0.05)), tickBusiness(exhausted, 0.05));
});

check('strict hostile schema, resources, timers, identities, prototypes and getters', () => {
  const invalid = [null, [], Object.create(null), { ...freshBusiness(), extra: true },
    { ...freshBusiness(), cash: 1e9 + 1 }, { ...freshBusiness(), cash: 1.5 },
    { ...freshBusiness(), cash: -0 }, { ...freshBusiness(), elapsed: -0 },
    { ...freshBusiness(), status: 'closed' },
    { ...freshBusiness(), status: 'won', sales: 11, reputation: 11, achieved: true },
    { ...freshBusiness(), staff: 4 }, { ...freshBusiness(), bays: 5 },
    { ...freshBusiness(), customers: [{ uid: 1, style: 'unknown', minCondition: 70, expiresAt: 45 }] },
    { ...freshBusiness(), customers: [{ uid: 1, style: 'compact', minCondition: 70, expiresAt: 0 }] },
    { ...freshBusiness(), customers: [{ uid: 1, style: 'compact', minCondition: 70, expiresAt: 45, bonus: 1 }] },
    { ...freshBusiness(), nextUid: 3, inventory: [
      { uid: 2, carId: 'bricklet', condition: 45 }, { uid: 2, carId: 'pip', condition: 45 }] },
    { ...freshBusiness(), nextUid: 3, inventory: [{ uid: 2, carId: 'bricklet', condition: 101 }] },
    { ...freshBusiness(), nextUid: 3, inventory: [{ uid: 2, carId: 'bricklet', condition: 45.5 }] },
    { ...freshBusiness(), nextUid: 1 }, { ...freshBusiness(), nextUid: 1e12 },
    { ...freshBusiness(), status: 'debug' }, { ...freshBusiness(), achieved: true },
    { ...freshBusiness(), elapsed: Infinity }, { ...freshBusiness(), elapsed: 1 },
    { ...freshBusiness(), rentClock: 120 }, { ...freshBusiness(), customerClock: -1 },
    { ...freshBusiness(), customers: [{ uid: 1, style: 'compact', minCondition: 70, expiresAt: 46 }] },
    { ...freshBusiness(), nextUid: 2, inventory: [{ uid: 1, carId: 'bricklet', condition: 45 }] },
    { ...freshBusiness(), nextUid: 3, inventory: [{ uid: 2, carId: '__proto__', condition: 45 }] },
    { ...freshBusiness(), nextUid: 3, inventory: [{ uid: 2, carId: 'x'.repeat(10000), condition: 45 }] },
    { ...freshBusiness(), inventory: new Array(9) },
    Object.assign(Object.create({ inherited: true }), freshBusiness())];
  let reads = 0;
  const accessor = freshBusiness();
  Object.defineProperty(accessor, 'cash', { enumerable: true, get() { reads++; return 800; } });
  invalid.push(accessor);
  const nested = freshBusiness();
  Object.defineProperty(nested.customers[0], 'style', { enumerable: true, get() { reads++; return 'compact'; } });
  invalid.push(nested);
  const arrayGetter = freshBusiness();
  Object.defineProperty(arrayGetter.customers, '0', { enumerable: true, get() { reads++; return {}; } });
  invalid.push(arrayGetter);
  const symbol = freshBusiness(); symbol[Symbol('hidden')] = 1; invalid.push(symbol);
  const sparse = freshBusiness(); sparse.customers = new Array(1); invalid.push(sparse);
  const arrayExtra = freshBusiness(); arrayExtra.customers.extra = true; invalid.push(arrayExtra);
  const inheritedArray = freshBusiness(); Object.setPrototypeOf(inheritedArray.customers, {}); invalid.push(inheritedArray);
  for (const state of invalid) assert.throws(() => validateBusiness(state));
  assert.equal(reads, 0);
  for (const id of ['constructor', '__proto__', '', 'x'.repeat(10000), {}, null]) {
    rejectsUnchanged(freshBusiness(), s => buyStock(s, id));
  }
  for (const uid of ['2', {}, -1, 1.5, 1e12]) rejectsUnchanged(buyStock(freshBusiness(), 'bricklet'), s => wholesaleCar(s, uid));
});

console.log(`${checks} checks passed; ${CARS.length} fleet records; simulated API progression ${JSON.stringify(progression)}`);
console.log('Synthetic fixture checks and API simulation only: NOT native-input or campaign balance acceptance.');
