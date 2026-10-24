import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Vector3 } from '../vendor/three.module.js';
import {
  CATALOG, createState, buy, addStolen, removeOwned, incomeRate,
  upgradeCost, upgrade, rebirthCost, rebirth, tickIncome, serialize, restore,
} from '../src/rules.js';

// Run the actual simulation helpers without starting WebGL or touching the DOM.
function mainHelpers(names, globals = {}) {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  const context = vm.createContext({ Math, THREE: { Vector3 }, ...globals });
  const functions = names.map(name => {
    const start = source.indexOf(`function ${name}(`);
    assert.ok(start >= 0, `Missing main.js helper ${name}`);
    const end = source.indexOf('\nfunction ', start + 1);
    assert.ok(end > start, `Missing boundary after main.js helper ${name}`);
    return source.slice(start, end);
  });
  vm.runInContext(functions.join('\n'), context);
  return context;
}

function arenaBases() {
  return [
    { owner: 0, x: -19, z: 14, lock: 0, items: [] },
    { owner: 1, x: 19, z: 14, lock: 0, items: [] },
    { owner: 2, x: -19, z: -16, lock: 0, items: [] },
    { owner: 3, x: 19, z: -16, lock: 0, items: [] },
  ];
}

test('catalog and starting state are deterministic and isolated', () => {
  assert.equal(CATALOG.length, 9);
  assert.deepEqual(CATALOG.slice(0,8).map(item => item.price), [100, 260, 620, 1400, 3000, 6500, 14000, 35000]);
  assert.deepEqual(CATALOG.slice(0,8).map(item => item.income), [5, 12, 27, 60, 130, 280, 620, 1550]);
  assert.deepEqual(createState(1), createState(999));
  const first = createState();
  first.owned.push({ id: 42, kind: 0 });
  assert.deepEqual(createState().owned, []);
  assert.ok(Object.isFrozen(CATALOG[0]));
});

test('buy charges the exact price and records unique collection discoveries', () => {
  const state = createState();
  assert.deepEqual(buy(state, 0), { ok: true, item: { id: 1, kind: 0 } });
  assert.deepEqual(buy(state, 0), { ok: true, item: { id: 2, kind: 0 } });
  assert.equal(state.money, 250);
  assert.equal(state.stats.buys, 2);
  assert.deepEqual(state.collection, [0]);
  assert.equal(state.lifetime, 0);
  assert.equal(state.nextId, 3);
  assert.equal('position' in state.owned[0], false);
});

test('purchases reject bad kinds, insufficient funds, and full capacity without changes', () => {
  const state = createState();
  for (const kind of [-1, 8, 1.2, '0', null, NaN, Infinity]) {
    const before = serialize(state);
    assert.equal(buy(state, kind).ok, false);
    assert.equal(serialize(state), before);
  }
  assert.equal(buy(state, 7).ok, false);
  state.money = 1e6;
  for (let i = 0; i < 6; i++) assert.equal(buy(state, 0).ok, true);
  const before = serialize(state);
  assert.equal(buy(state, 0).ok, false);
  assert.equal(addStolen(state, 1).ok, false);
  assert.equal(serialize(state), before);
  assert.equal(buy(null, 0).ok, false);
});

test('income ticks support fractional seconds and reject negative or invalid time', () => {
  const state = createState();
  buy(state, 0);
  buy(state, 1);
  assert.equal(incomeRate(state), 17);
  assert.equal(tickIncome(state, 2.5), 42.5);
  assert.equal(state.money, 132.5);
  assert.equal(state.lifetime, 42.5);
  const before = serialize(state);
  for (const dt of [-1, 0, NaN, Infinity, '5', undefined]) assert.equal(tickIncome(state, dt), 0);
  assert.equal(serialize(state), before);
  assert.equal(incomeRate(null), 0);
  state.rebirths = 2;
  assert.equal(incomeRate(state), 25.5);
});

test('upgrades use practical escalating prices, stop at caps, and reject unknown types', () => {
  const state = createState();
  assert.equal(upgradeCost(state, 'slots'), 900);
  assert.equal(upgrade(state, 'slots').ok, false);
  state.money = 1e6;
  for (const [type, count] of [['slots', 4], ['speed', 3], ['lock', 3]]) {
    let previousCost = 0;
    for (let i = 0; i < count; i++) {
      const cost = upgradeCost(state, type);
      assert.ok(cost > previousCost);
      previousCost = cost;
      const before = state.money;
      assert.equal(upgrade(state, type).ok, true);
      assert.equal(state.money, before - cost);
    }
    assert.equal(upgradeCost(state, type), Infinity);
    assert.equal(upgrade(state, type).ok, false);
  }
  assert.equal(state.capacity, 10);
  assert.equal(state.speedLevel, 3);
  assert.equal(state.lockLevel, 3);
  for (const type of ['money', '__proto__', 'toString', undefined]) {
    assert.equal(upgrade(state, type).ok, false);
    assert.equal(upgradeCost(state, type), Infinity);
  }
});

test('stolen units cost nothing and removal preserves discovered collection and stats', () => {
  const state = createState();
  const result = addStolen(state, 7);
  assert.deepEqual(result, { ok: true, item: { id: 1, kind: 7 } });
  assert.equal(state.money, 450);
  assert.equal(state.stats.steals, 1);
  assert.equal(state.stats.buys, 0);
  assert.equal(incomeRate(state), 1550);
  assert.deepEqual(removeOwned(state, result.item.id), result);
  assert.equal(incomeRate(state), 0);
  assert.deepEqual(state.collection, [7]);
  assert.equal(removeOwned(state, result.item.id).ok, false);
  assert.equal(removeOwned(state, '1').ok, false);
  assert.equal(state.nextId, 2);
});

test('rebirth resets spendable progress and keeps achievements with a 25 percent bonus', () => {
  const state = createState();
  assert.equal(rebirthCost(state), 25000);
  assert.equal(rebirth(state).ok, false);
  state.money = 1e6;
  buy(state, 1);
  addStolen(state, 2);
  upgrade(state, 'slots');
  upgrade(state, 'lock');
  upgrade(state, 'speed');
  tickIncome(state, 10);
  state.stats.defends = 3;
  const kept = { collection: [...state.collection], stats: { ...state.stats }, lifetime: state.lifetime, nextId: state.nextId };
  assert.equal(rebirth(state).ok, true);
  assert.equal(state.money, 450);
  assert.equal(state.rebirths, 1);
  assert.equal(state.capacity, 6);
  assert.equal(state.speedLevel, 0);
  assert.equal(state.lockLevel, 0);
  assert.deepEqual(state.owned, []);
  for (const key of Object.keys(kept)) assert.deepEqual(state[key], kept[key]);
  assert.equal(rebirthCost(state), 100000);
  buy(state, 0);
  assert.equal(incomeRate(state), 6.25);
  state.money = 100000;
  assert.equal(rebirth(state).ok, true);
  assert.equal(rebirthCost(state), 225000);
});

test('saved games round-trip cleanly and omit transient or unapproved fields', () => {
  const state = createState();
  buy(state, 0);
  addStolen(state, 4);
  tickIncome(state, 2.125);
  state.owned[0].position = { x: 1, z: 2 };
  state.unapproved = 'discard me';
  const saved = serialize(state);
  const restored = restore(saved);
  assert.equal(serialize(restored), saved);
  assert.equal(restored.money, state.money);
  assert.equal(restored.lifetime, state.lifetime);
  assert.equal('unapproved' in restored, false);
  assert.equal('position' in restored.owned[0], false);
  restored.owned[0].kind = 3;
  assert.equal(state.owned[0].kind, 0);
});

test('malformed, unsupported and hostile saves are sanitized without throwing', () => {
  for (const raw of ['', '{', 'null', '[]', '12', null, undefined, [], {}, { version: 2 }]) {
    assert.deepEqual(restore(raw), createState());
  }
  const raw = {
    version: 1, money: -5, lifetime: Infinity, rebirths: 1.9,
    capacity: 100, speedLevel: -50, lockLevel: 99, nextId: 1,
    owned: [{ id: 7, kind: 2, evil: true }, { id: 7, kind: 3 }, { id: -1, kind: 1 }, { id: 8, kind: 99 }, null, { id: 9, kind: 0 }],
    collection: [2, 2, -1, 99, '1', 7], stats: { buys: -10, steals: 3.7, defends: '9000' },
  };
  const state = restore(raw);
  assert.equal(state.money, 0);
  assert.equal(state.lifetime, 0);
  assert.equal(state.rebirths, 1);
  assert.equal(state.capacity, 10);
  assert.equal(state.speedLevel, 0);
  assert.equal(state.lockLevel, 3);
  assert.deepEqual(state.owned, [{ id: 7, kind: 2 }, { id: 9, kind: 0 }]);
  assert.deepEqual(state.collection, [2, 7, 0]);
  assert.deepEqual(state.stats, { buys: 0, steals: 3, defends: 0 });
  assert.equal(state.nextId, 10);
  assert.equal(addStolen(state, 1).item.id, 10);
  const overflow = restore({ version: 1, money: 1e100, owned: Array.from({ length: 20 }, (_, i) => ({ id: i + 1, kind: 0 })) });
  assert.equal(overflow.money, 1e15);
  assert.equal(overflow.owned.length, 6);
  assert.deepEqual(restore({ get version() { throw new Error('bad getter'); } }), createState());
  const polluted = restore('{"version":1,"__proto__":{"polluted":true}}');
  assert.equal({}.polluted, undefined);
  assert.equal(Object.hasOwn(polluted, '__proto__'), false);
});

test('large elapsed intervals never create infinite money', () => {
  const state = createState();
  addStolen(state, 7);
  tickIncome(state, Number.MAX_VALUE);
  assert.equal(state.money, 1e15);
  assert.equal(state.lifetime, 1e15);
  assert.equal(tickIncome(state, 1), 0);
});

test('income is frame-rate independent across fractional ticks', () => {
  const oneTick = createState();
  addStolen(oneTick, 1);
  addStolen(oneTick, 6);
  oneTick.rebirths = 3;
  const manyTicks = restore(serialize(oneTick));
  tickIncome(oneTick, 10);
  for (let frame = 0; frame < 600; frame++) tickIncome(manyTicks, 1 / 60);
  assert.ok(Math.abs(oneTick.money - manyTicks.money) < 1e-7);
  assert.ok(Math.abs(oneTick.lifetime - manyTicks.lifetime) < 1e-7);
});

test('mixed gameplay sequences keep ownership, capacity and persistence consistent', () => {
  let seed = 932871;
  const random = limit => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed % limit;
  };
  const state = createState();
  for (let step = 0; step < 2000; step++) {
    const before = serialize(state);
    let result;
    switch (random(7)) {
      case 0: result = buy(state, random(10) - 1); break;
      case 1: result = addStolen(state, random(10) - 1); break;
      case 2: result = removeOwned(state, state.owned[random(state.owned.length || 1)]?.id ?? -1); break;
      case 3: result = upgrade(state, ['slots', 'speed', 'lock', 'bogus'][random(4)]); break;
      case 4: result = rebirth(state); break;
      case 5: tickIncome(state, random(600) / 10); break;
      case 6: tickIncome(state, random(600)); break;
    }
    if (result?.ok === false) assert.equal(serialize(state), before, 'rejected action changed game state');
    assert.ok(state.owned.length <= state.capacity);
    assert.ok(Number.isFinite(state.money) && state.money >= 0);
    assert.equal(new Set(state.owned.map(item => item.id)).size, state.owned.length);
    assert.equal(new Set(state.collection).size, state.collection.length);
    for (const item of state.owned) {
      assert.ok(item.id < state.nextId);
      assert.ok(state.collection.includes(item.kind));
    }
    assert.deepEqual(restore(serialize(state)), state);
  }
});

test('bat knockback cannot tunnel through rear or side base walls', () => {
  const helpers = mainHelpers(['isInside', 'locked', 'canMoveTo', 'moveActor'], { bases: arenaBases(), playerLock: 0 });
  const rear = new Vector3(24.8, 0, 14);
  helpers.moveActor(rear, 2.3, 0, 1);
  assert.ok(rear.x > 24.8 && rear.x <= 25.5, 'rear wall must stop the complete knockback path');
  const side = new Vector3(19, 0, 21.9);
  helpers.moveActor(side, 0, 2.3, 1);
  assert.ok(side.z > 21.9 && side.z <= 22.65, 'side wall must stop the complete knockback path');
  assert.equal(helpers.canMoveTo(rear, 1), true);
  assert.equal(helpers.canMoveTo(side, 1), true);
});

test('returning player-carried loot uses its current slot after a rival eviction', () => {
  const bases = arenaBases();
  const entity = { kind: 2, origin: 1, originSlot: 4, carried: true };
  bases[1].items = [{ kind: 0 }, entity, { kind: 3 }];
  let placed;
  const helpers = mainHelpers(['returnCarry'], {
    bases, carry: entity,
    placeEntity: (item, base, index) => { placed = { item, base, index }; },
    toast() {},
  });
  helpers.returnCarry();
  assert.equal(helpers.carry, null);
  assert.equal(placed.item, entity);
  assert.equal(placed.base, bases[1]);
  assert.equal(placed.index, 1);
  assert.equal(bases[1].items.length, 3);
});

test('a rival holding loot escapes and never evicts the player-carried collectible', () => {
  const state = createState();
  const owned = buy(state, 0).item;
  const makeEntity = (id, kind, owner) => ({ id, kind, owner, carried: false, mesh: { position: new Vector3(), rotation: {} } });
  const bases = arenaBases();
  const escapingLoot = makeEntity(owned.id, 0, 0);
  escapingLoot.carried = true;
  bases[0].items.push(escapingLoot);
  const playerLoot = makeEntity('rival-0', 1, 1);
  playerLoot.carried = true;
  playerLoot.origin = 1;
  bases[1].items.push(playerLoot, ...Array.from({ length: 5 }, (_, index) => makeEntity(`rival-${index + 1}`, 0, 1)));
  const bot = {
    base: bases[1], pos: new Vector3(19, 0, 14), mesh: { position: new Vector3(), rotation: {} },
    mode: 'chase', carry: escapingLoot, wallet: 0, timer: 0, stun: 0, swing: 0,
  };
  const deleted = [];
  const helpers = mainHelpers(['dist', 'isInside', 'tickBots'], {
    state, CATALOG, bots: [bot], bases, carry: playerLoot,
    player: { pos: new Vector3(-19, 0, 14) }, playerLock: 0, gameTime: 10,
    removeOwned, arrangeBase() {},
    deleteEntity: entity => deleted.push(entity),
    placeEntity: (entity, base) => { entity.owner = base.owner; entity.carried = false; },
    groundHeight: () => 0, animateAvatar() {}, toast() {}, save() {},
  });
  helpers.tickBots(0.05);
  assert.equal(bot.carry, null, 'the thief must bank its loot instead of chasing');
  assert.equal(bot.mode, 'idle');
  assert.equal(state.owned.length, 0);
  assert.ok(bases[1].items.includes(playerLoot), 'the in-flight player collectible must remain in the world');
  assert.ok(bases[1].items.includes(escapingLoot));
  assert.equal(bases[1].items.length, 6);
  assert.equal(deleted.length, 1);
  assert.notEqual(deleted[0], playerLoot);
});
