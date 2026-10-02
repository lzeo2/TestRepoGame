import { BY_ID } from '../../assets/car-arcade/fleet.js';

const LIMIT = 1_000_000_000;
const SECOND = 1_000_000;
const STYLES = ['compact', 'sport', 'utility', 'touring'];
const KEYS = ['version', 'cash', 'inventory', 'bays', 'staff', 'reputation', 'sales',
  'elapsed', 'rentClock', 'customerClock', 'customers', 'nextUid', 'status', 'achieved'];

function requireValue(ok, message) {
  if (!ok) throw new Error(message);
}

// Inspect descriptors before reading values: frozen data is fine, accessors are not.
function record(value, keys) {
  requireValue(value !== null && typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype, 'Expected plain record');
  const own = Reflect.ownKeys(value);
  requireValue(own.length === keys.length && own.every(key => keys.includes(key)), 'Unknown or missing key');
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    requireValue(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'Expected data property');
  }
  return value;
}

function list(value, maximum) {
  requireValue(Array.isArray(value) && Object.getPrototypeOf(value) === Array.prototype, 'Expected plain array');
  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  requireValue(length <= maximum && Reflect.ownKeys(value).length === length + 1, 'Invalid array size or keys');
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    requireValue(descriptor && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'Invalid array element');
  }
  return value;
}

function integer(value, low, high = LIMIT) {
  requireValue(Number.isSafeInteger(value) && !Object.is(value, -0) && value >= low && value <= high, 'Integer out of range');
  return value;
}

function time(value, maximum = LIMIT) {
  requireValue(typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0) && value >= 0 &&
    value <= maximum && Math.round(value * SECOND) / SECOND === value, 'Invalid active time');
  return value;
}

function car(id) {
  requireValue(typeof id === 'string' && id.length <= 16 && Object.hasOwn(BY_ID, id), 'Unknown car');
  return BY_ID[id];
}

function acquisition(id) { return Math.max(200, Math.floor(car(id).price * 0.5)); }

export function freshBusiness() {
  return { version: 1, cash: 800, inventory: [], bays: 1, staff: 0, reputation: 0,
    sales: 0, elapsed: 0, rentClock: 0, customerClock: 0,
    customers: [{ uid: 1, style: 'compact', minCondition: 70, expiresAt: 45 }],
    nextUid: 2, status: 'playing', achieved: false };
}

// Canonical serializer boundary: returns new plain data or throws; never coerces.
export function validateBusiness(input) {
  const s = record(input, KEYS);
  requireValue(s.version === 1, 'Unsupported business version');
  integer(s.cash, 0); integer(s.bays, 1, 4); integer(s.staff, 0, 3);
  integer(s.reputation, 0); integer(s.sales, 0); integer(s.nextUid, 2);
  time(s.elapsed); time(s.rentClock, 120); time(s.customerClock, 15);
  const micros = Math.round(s.elapsed * SECOND);
  requireValue(s.rentClock === (micros % (120 * SECOND)) / SECOND &&
    s.customerClock === (micros % (15 * SECOND)) / SECOND, 'Inconsistent clocks');
  requireValue(['playing', 'won', 'closed'].includes(s.status), 'Unknown business status');
  requireValue(typeof s.achieved === 'boolean' && s.achieved === (s.sales >= 10) &&
    s.reputation === s.sales && (s.status !== 'won' || s.sales === 10), 'Inconsistent milestone');
  requireValue(s.status !== 'closed' || (s.elapsed >= 120 && s.cash < 150 + 50 * s.staff), 'Inconsistent closure');
  const identities = new Set();
  function identity(uid) {
    integer(uid, 1, s.nextUid - 1);
    requireValue(!identities.has(uid), 'Duplicate identity');
    identities.add(uid);
  }
  const inventory = list(s.inventory, 2 * s.bays).map(value => {
    const item = record(value, ['uid', 'carId', 'condition']);
    identity(item.uid); car(item.carId); integer(item.condition, 0, 100);
    return { uid: item.uid, carId: item.carId, condition: item.condition };
  });
  const customers = list(s.customers, 3).map(value => {
    const buyer = record(value, ['uid', 'style', 'minCondition', 'expiresAt']);
    identity(buyer.uid);
    requireValue(STYLES.includes(buyer.style), 'Unknown customer style');
    integer(buyer.minCondition, 70, 90); time(buyer.expiresAt);
    requireValue(buyer.expiresAt > s.elapsed && buyer.expiresAt <= s.elapsed + 45, 'Invalid customer expiry');
    return { uid: buyer.uid, style: buyer.style, minCondition: buyer.minCondition, expiresAt: buyer.expiresAt };
  });
  return { version: 1, cash: s.cash, inventory, bays: s.bays, staff: s.staff,
    reputation: s.reputation, sales: s.sales, elapsed: s.elapsed,
    rentClock: s.rentClock, customerClock: s.customerClock, customers,
    nextUid: s.nextUid, status: s.status, achieved: s.achieved };
}

function playing(input) {
  const s = validateBusiness(input);
  requireValue(s.status === 'playing', 'Business is not playing');
  return s;
}

function spend(s, amount) {
  requireValue(s.cash >= amount, 'Insufficient cash');
  s.cash -= amount;
}

function allocate(s) {
  requireValue(s.nextUid < LIMIT, 'Identity limit reached');
  return s.nextUid++;
}

function stock(s, uid) {
  integer(uid, 1);
  const item = s.inventory.find(value => value.uid === uid);
  requireValue(item, 'Inventory identity not found');
  return item;
}

export function buyStock(input, carId) {
  const s = playing(input);
  const price = acquisition(carId);
  requireValue(s.inventory.length < 2 * s.bays, 'Garage is full');
  spend(s, price);
  s.inventory.push({ uid: allocate(s), carId, condition: 45 });
  return s;
}

export function restoreCar(input, uid) {
  const s = playing(input);
  const item = stock(s, uid);
  requireValue(item.condition < 100, 'Car is already restored');
  spend(s, Math.max(50, Math.floor(acquisition(item.carId) * 0.15)));
  item.condition = Math.min(100, item.condition + 25);
  return s;
}

export function sellCar(input, uid, customerUid) {
  const s = playing(input);
  const item = stock(s, uid);
  integer(customerUid, 1);
  const buyer = s.customers.find(value => value.uid === customerUid);
  requireValue(buyer && buyer.style === car(item.carId).style &&
    item.condition >= buyer.minCondition, 'Customer does not match');
  requireValue(s.sales < LIMIT, 'Sales limit reached');
  const payout = Math.max(500, Math.floor(acquisition(item.carId) * (100 + item.condition) / 100));
  s.cash = Math.min(LIMIT, s.cash + payout);
  s.inventory = s.inventory.filter(value => value.uid !== uid);
  s.customers = s.customers.filter(value => value.uid !== customerUid);
  s.sales++; s.reputation++;
  if (!s.achieved && s.sales >= 10) {
    s.achieved = true;
    s.status = 'won';
  }
  return s;
}

export function wholesaleCar(input, uid) {
  const s = playing(input);
  const item = stock(s, uid);
  const cost = acquisition(item.carId);
  // No profitable buy/wholesale loop, even with free staff restoration.
  const payout = Math.min(cost, Math.max(Math.floor(cost * 0.5), Math.floor(cost * item.condition / 100)));
  s.cash = Math.min(LIMIT, s.cash + payout);
  s.inventory = s.inventory.filter(value => value.uid !== uid);
  return s;
}

export function hireStaff(input) {
  const s = playing(input);
  requireValue(s.staff < 3, 'Staff limit reached');
  spend(s, 300 + 250 * s.staff);
  s.staff++;
  return s;
}

export function expandGarage(input) {
  const s = playing(input);
  requireValue(s.bays < 4, 'Bay limit reached');
  spend(s, 800 * s.bays);
  s.bays++;
  return s;
}

export function continueBusiness(input) {
  const s = validateBusiness(input);
  requireValue(s.status === 'won', 'No milestone to continue');
  s.status = 'playing';
  return s;
}

export function tickBusiness(input, dt) {
  requireValue(typeof dt === 'number' && Number.isFinite(dt) && dt >= 0 && dt <= 0.05, 'Invalid timestep');
  const s = validateBusiness(input);
  if (s.status !== 'playing' || dt === 0) return s;
  // Integer microseconds avoid rent/staff boundary drift. No wall-clock reads.
  const before = Math.round(s.elapsed * SECOND);
  const after = before + Math.round(dt * SECOND);
  requireValue(after <= LIMIT * SECOND, 'Active time limit reached');
  s.elapsed = after / SECOND;
  s.rentClock = (after % (120 * SECOND)) / SECOND;
  s.customerClock = (after % (15 * SECOND)) / SECOND;
  s.customers = s.customers.filter(buyer => buyer.expiresAt > s.elapsed);
  if (Math.floor(after / (120 * SECOND)) > Math.floor(before / (120 * SECOND))) {
    const rent = 150 + 50 * s.staff;
    if (s.cash < rent) {
      s.status = 'closed';
      return s;
    }
    s.cash -= rent;
  }
  if (Math.floor(after / (3 * SECOND)) > Math.floor(before / (3 * SECOND))) {
    for (let worker = 0; worker < s.staff; worker++) {
      const item = s.inventory.find(value => value.condition < 100);
      if (item) item.condition++;
    }
  }
  if (Math.floor(after / (15 * SECOND)) > Math.floor(before / (15 * SECOND)) &&
      s.customers.length < 3 && s.nextUid < LIMIT && s.elapsed < LIMIT) {
    const cycle = Math.floor(after / (15 * SECOND));
    // Every other arrival serves actual stock; the others cycle all four styles.
    const item = s.inventory.length ? s.inventory[Math.floor(cycle / 2) % s.inventory.length] : null;
    s.customers.push({ uid: allocate(s),
      style: item && cycle % 2 === 0 ? car(item.carId).style : STYLES[Math.floor(cycle / 2) % STYLES.length],
      minCondition: item && cycle % 2 === 0 ? 70 : 70 + (cycle % 3) * 10,
      expiresAt: Math.min(LIMIT, (after + 45 * SECOND) / SECOND) });
  }
  return s;
}
