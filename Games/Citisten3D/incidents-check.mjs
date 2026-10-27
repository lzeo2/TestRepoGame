import assert from 'node:assert/strict';
import { BUILDINGS } from './sim.mjs';
import { createRiverTerrain } from './river-data.mjs';
import { createIncidentState, advanceIncidents, incidentEffects, respondIncident, validateIncidents } from './incidents.mjs';

const terrain = createRiverTerrain(32);
const dry = [];
for (let z = 2; z < 30; z++) for (let x = 2; x < 30; x++) {
  if (!terrain.isWater(x, z) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dz]) => terrain.isWater(x + dx, z + dz))) dry.push({ x, z });
}
const building = (id, type, x, z) => ({ id, type, x, z, hp: BUILDINGS[type].hp,
  maxHp: BUILDINGS[type].hp, constructionRemaining: 0, powered: true, watered: true, residents: 0 });
function city(seed = 1) {
  return { size: 32, expansionEnabled: true, tick: 0, time: 0, phase: 'day', population: 0, budget: 500,
    incidents: createIncidentState(seed), buildings: dry.slice(0, 12).map((p, i) => building(i + 1, i % 2 ? 'commercial' : 'residential', p.x, p.z)) };
}
let steps = 0, damageCalls = 0, totalDamage = 0, corruptions = 0;
function health(state) {
  return (b, amount, attacker) => {
    assert.equal(attacker, 'incident'); assert.ok(Number.isFinite(amount) && amount >= 0 && amount <= b.hp);
    assert.ok(state.buildings.includes(b));
    damageCalls++; totalDamage += amount; b.hp -= amount;
    if (b.hp <= 0) state.buildings.splice(state.buildings.indexOf(b), 1);
  };
}
function step(s, count = 1, land = terrain, hook = health(s)) {
  const notices = [];
  for (let i = 0; i < count; i++) {
    s.tick++; s.time = s.tick / 4; steps++;
    notices.push(...advanceIncidents(s, 0.25, BUILDINGS, land, hook));
  }
  return notices;
}
function hazard(s, type = 'fire', ids = [1], ordinal = 0) {
  const rows = ids.map(id => s.buildings.find(b => b.id === id));
  s.incidents.ordinal = Math.max(s.incidents.ordinal, ordinal + 1);
  s.incidents.nextTick = s.tick + 1000;
  const e = { id: `incident-${ordinal}`, type, x: rows[0].x, z: rows[0].z,
    buildingIds: [...ids].sort((a, b) => a - b), tiles: rows.map(b => ({ x: b.x, z: b.z })),
    severity: 0.3, remaining: 32, total: 32, startTick: s.tick };
  s.incidents.active.push(e); return e;
}
let passed = 0;
function test(name, run) { run(); passed++; console.log(`ok ${passed} ${name}`); }

test('uint32 seeds and exact scheduler shape', () => {
  for (const seed of [0, 1, 0xffffffff]) {
    const s = createIncidentState(seed);
    assert.deepEqual(Object.keys(s), ['seed', 'active', 'nextTick', 'ordinal']);
    assert.ok(s.nextTick >= 480 && s.nextTick <= 720);
  }
  for (const seed of [-1, NaN, Infinity, 0x100000000, 1.5, '1']) assert.throws(() => createIncidentState(seed), RangeError);
});
test('pause zero and disabled legacy are byte-stable', () => {
  const s = city(); hazard(s);
  const before = JSON.stringify(s);
  assert.deepEqual(advanceIncidents(s, 0, BUILDINGS, terrain, () => assert.fail()), []);
  assert.equal(JSON.stringify(s), before);
  for (const incidents of [undefined, { unknown: NaN }, ['legacy']]) {
    const legacy = { expansionEnabled: false, incidents };
    assert.equal(validateIncidents(legacy), true);
    assert.deepEqual(advanceIncidents(legacy, 0.25), []);
    assert.deepEqual(incidentEffects(legacy, {}), { powerOut: false, waterOut: false, productionMultiplier: 1, unsafe: false });
    assert.equal(respondIncident(legacy, 'incident-0').ok, false);
  }
});
test('seeded first hazards and spatial targets vary', () => {
  const kinds = new Set(), positions = new Set();
  for (let seed = 0; seed < 48; seed++) {
    const s = city(seed); step(s, s.incidents.nextTick);
    assert.equal(s.incidents.active.length, 1);
    const e = s.incidents.active[0]; kinds.add(e.type); positions.add(`${e.x},${e.z}`);
    assert.ok(e.severity >= 0.18 && e.severity <= 0.26);
    assert.ok(e.buildingIds.length <= 8 && e.tiles.length <= 8);
    assert.equal(validateIncidents(s, BUILDINGS), true);
  }
  assert.equal(kinds.size, 3); assert.ok(positions.size > 3);
  console.log(`  first-hazard kinds=${kinds.size} spatial-anchors=${positions.size} seeds=48`);
});
test('actual damage hook and bounded uncovered fire recovery', () => {
  const s = city(); const b = s.buildings[0], hp = b.hp; hazard(s);
  step(s); assert.ok(b.hp < hp);
  const notices = step(s, 127);
  assert.equal(s.incidents.active.length, 0); assert.ok(b.hp > 0);
  assert.equal(notices.at(-1).reason, 'expired');
  assert.deepEqual(incidentEffects(s, b), { powerOut: false, waterOut: false, productionMultiplier: 1, unsafe: false });
  console.log(`  uncovered-fire damage=${(hp - b.hp).toFixed(3)} duration=32s survivorHp=${b.hp.toFixed(3)}`);
});
test('powered and watered completed fire coverage shortens and softens fire', () => {
  function measure(powered, watered, constructionRemaining = 0) {
    const s = city(); const b = s.buildings[0];
    const station = building(90, 'fire', b.x + 1, b.z + 1);
    Object.assign(station, { powered, watered, constructionRemaining }); s.buildings.push(station);
    hazard(s); const hp = b.hp; let ticks = 0;
    while (s.incidents.active.length) { step(s); ticks++; }
    return { ticks, damage: hp - b.hp };
  }
  const covered = measure(true, true), uncovered = measure(false, true);
  assert.ok(covered.ticks < uncovered.ticks && covered.damage < uncovered.damage);
  assert.equal(measure(true, false).ticks, uncovered.ticks);
  assert.equal(measure(true, true, 100).ticks, uncovered.ticks);
  console.log(`  services coveredTicks=${covered.ticks} uncoveredTicks=${uncovered.ticks} coveredDamage=${covered.damage.toFixed(3)}`);
});
test('outage and flood affect only actual targets and clear on expiry', () => {
  for (const type of ['outage', 'flood']) {
    const s = city(); hazard(s, type);
    const affected = incidentEffects(s, s.buildings[0]), other = incidentEffects(s, s.buildings[1]);
    assert.equal(other.productionMultiplier, 1);
    if (type === 'outage') { assert.equal(affected.powerOut, true); assert.equal(affected.productionMultiplier, 0); }
    else { assert.equal(affected.waterOut, true); assert.equal(affected.unsafe, true); assert.equal(affected.productionMultiplier, 0.5); }
    step(s, 128); assert.equal(s.incidents.active.length, 0);
    assert.equal(incidentEffects(s, s.buildings[0]).productionMultiplier, 1);
  }
});
test('manual responses work without services, charge exactly once', () => {
  for (const [type, cost] of [['fire', 90], ['outage', 70], ['flood', 110]]) {
    const s = city(); hazard(s, type); const before = s.budget;
    const reply = respondIncident(s, 'incident-0');
    assert.equal(reply.ok, true); assert.equal(reply.cost, cost); assert.equal(s.budget, before - cost);
    assert.equal(reply.notice.type, 'incident-end'); assert.equal(reply.notice.kind, type); assert.equal(reply.notice.reason, 'response');
    assert.equal(respondIncident(s, 'incident-0').ok, false); assert.equal(s.budget, before - cost);
    assert.equal(s.incidents.active.length, 0);
  }
});
test('response rejects unknown, lost, invalid and insufficient budgets without mutation', () => {
  for (const budget of [NaN, Infinity, -1, 89, undefined]) {
    const s = city(); hazard(s); s.budget = budget;
    const before = structuredClone(s); assert.equal(respondIncident(s, 'incident-0').ok, false); assert.deepEqual(s, before);
  }
  for (const id of [null, {}, 'incident-99']) {
    const s = city(); hazard(s); const before = structuredClone(s);
    assert.equal(respondIncident(s, id).ok, false); assert.deepEqual(s, before);
  }
  const s = city(); hazard(s); s.phase = 'lost'; const before = structuredClone(s);
  assert.equal(respondIncident(s, 'incident-0').ok, false); assert.deepEqual(s, before);
});
test('missing targets and partial destruction remove obsolete spatial FX immediately', () => {
  const s = city(); hazard(s, 'fire', [1, 2]);
  s.buildings[0].hp = 0.001;
  step(s); assert.deepEqual(s.incidents.active[0].buildingIds, [2]); assert.equal(s.incidents.active[0].tiles.length, 1);
  s.buildings = s.buildings.filter(b => b.id !== 2);
  assert.equal(respondIncident(s, 'incident-0').ok, false);
  const notices = step(s); assert.equal(s.incidents.active.length, 0); assert.equal(notices[0].reason, 'targets-gone');
});
test('no eligible targets delay once; missing river uses bounded alternatives', () => {
  const s = city(); s.buildings = [building(1, 'townhall', 16, 16), building(2, 'wall', 20, 20), building(3, 'watchtower', 22, 22), building(4, 'park', 24, 24)];
  s.buildings[3].constructionRemaining = 5;
  step(s, s.incidents.nextTick); assert.equal(s.incidents.active.length, 0); assert.equal(s.incidents.ordinal, 1); assert.ok(s.incidents.nextTick > s.tick);
  const next = s.incidents.nextTick; step(s, 50); assert.equal(s.incidents.nextTick, next);
  const flat = createRiverTerrain(32, 'legacy-flat');
  for (let seed = 0; seed < 12; seed++) {
    const s = city(seed); step(s, s.incidents.nextTick, flat);
    assert.ok(['fire', 'outage'].includes(s.incidents.active[0].type));
  }
});
test('three-active cap and disjoint bounded targets', () => {
  const s = city(); hazard(s, 'outage', [1], 0); hazard(s, 'flood', [2], 1); hazard(s, 'fire', [3], 2);
  s.incidents.nextTick = 1;
  const notices = step(s); assert.equal(s.incidents.active.length, 3); assert.equal(notices.length, 0); assert.equal(s.incidents.ordinal, 4);
  assert.equal(validateIncidents(s, BUILDINGS), true);
});
test('save JSON replay preserves private scheduler, damage, notices and unrelated RNG', () => {
  const a = city(0xffffffff); a.combatSeed = 123456; step(a, 777);
  const b = JSON.parse(JSON.stringify(a));
  const left = step(a, 5000), right = step(b, 5000);
  assert.deepEqual(a, b); assert.deepEqual(left, right); assert.equal(a.combatSeed, 123456);
  console.log(`  replay steps=5000 notices=${left.length} finalOrdinal=${a.incidents.ordinal}`);
});
test('severity and duration stay bounded across population and difficulty', () => {
  let maxSeverity = 0;
  for (const population of [0, 100, 10000000]) for (const difficulty of ['easy', 'normal', 'hard', 0, 1, 2]) {
    const s = city(7); Object.assign(s, { population, difficulty }); step(s, s.incidents.nextTick);
    const e = s.incidents.active[0]; maxSeverity = Math.max(maxSeverity, e.severity);
    assert.ok(e.severity >= 0.1 && e.severity <= 0.6 && e.total <= 48);
  }
  console.log(`  severity scenarios=18 maximum=${maxSeverity.toFixed(3)}`);
});
test('corrupt snapshots fail before mutation, callbacks or charging', () => {
  const mutations = [
    s => { s.incidents.seed = -1; }, s => { s.incidents.seed = NaN; },
    s => { s.incidents.nextTick = Infinity; }, s => { s.incidents.ordinal = 0; },
    s => { s.incidents.active[0].id = 'civic-0'; }, s => { s.incidents.active[0].severity = NaN; },
    s => { s.incidents.active[0].remaining = 0.1; }, s => { s.incidents.active[0].total = 100; },
    s => { s.incidents.active[0].startTick = 1; }, s => { s.incidents.active[0].buildingIds = [1, 1]; },
    s => { s.incidents.active[0].buildingIds = [-1]; }, s => { s.incidents.active[0].tiles[0].x = 1.5; },
    s => { s.incidents.active[0].tiles.push({ ...s.incidents.active[0].tiles[0] }); },
    s => { s.incidents.active[0].x = 99; }, s => { s.incidents.active[0].type = 'water-main-burst'; },
    s => { s.incidents.active.push(structuredClone(s.incidents.active[0])); },
    s => { s.buildings[0].type = 'townhall'; }, s => { s.buildings[0].hp = NaN; },
    s => { s.buildings[0].x = Infinity; }, s => { s.buildings[0].powered = 'yes'; },
    s => { s.buildings.push({ ...s.buildings[0] }); }, s => { s.population = NaN; },
    s => { s.time = NaN; }, s => { s.difficulty = {}; }, s => { s.incidents.active[0].remaining = 33; },
    s => { s.incidents.active[0].tiles[0].z = 32; }, s => { s.incidents.active[0].tiles = []; },
    s => { s.incidents.active[0].buildingIds = Array.from({ length: 9 }, (_, i) => i + 1); },
    s => { s.incidents.active[0].tiles.push({ x: 0, z: 0 }); },
    s => { s.incidents.nextTick = 0; },
    s => { s.incidents.active = Array(4).fill(s.incidents.active[0]); },
    s => { hazard(s, 'outage', [2], 1); s.incidents.active.reverse(); },
    s => { s.tick = 10; s.time = 2.5; }
  ];
  for (const mutate of mutations) {
    const s = city(); hazard(s); mutate(s); const before = structuredClone(s);
    for (const run of [() => validateIncidents(s, BUILDINGS), () => advanceIncidents(s, 0.25, BUILDINGS, terrain, () => assert.fail('damage invoked')), () => respondIncident(s, 'incident-0')]) {
      assert.throws(run, RangeError); assert.deepEqual(s, before); corruptions++;
    }
  }
});
test('malicious terrain/definitions, bad step and missing hook cannot mutate', () => {
  let floodSeed = 0;
  for (;; floodSeed++) { const s = city(floodSeed); step(s, s.incidents.nextTick); if (s.incidents.active[0].type === 'flood') break; }
  const s = city(floodSeed); s.tick = s.incidents.nextTick; s.time = s.tick / 4;
  const before = structuredClone(s);
  assert.throws(() => advanceIncidents(s, 0.25, BUILDINGS, { isWater: () => NaN }, health(s)), RangeError); assert.deepEqual(s, before);
  const badDefs = { ...BUILDINGS, residential: { ...BUILDINGS.residential, serviceRadius: NaN } };
  assert.throws(() => advanceIncidents(s, 0.25, badDefs, terrain, health(s)), RangeError); assert.deepEqual(s, before);
  assert.throws(() => advanceIncidents(s, 1, BUILDINGS, terrain, health(s)), RangeError); assert.deepEqual(s, before);
  const fire = city(); hazard(fire); const old = structuredClone(fire);
  assert.throws(() => advanceIncidents(fire, 0.25, BUILDINGS, terrain), RangeError); assert.deepEqual(fire, old);
});
test('new game scheduler repeats and long-running hazards leave no permanent effects', () => {
  assert.deepEqual(createIncidentState(42), createIncidentState(42));
  const s = city(42); step(s, 8000);
  for (const e of [...s.incidents.active]) assert.equal(respondIncident(s, e.id).ok, true);
  assert.equal(s.incidents.active.length, 0);
  for (const b of s.buildings) assert.equal(incidentEffects(s, b).productionMultiplier, 1);
});
console.log(`INCIDENTS CHECK PASS groups=${passed} fixedSteps=${steps} corruptionRejections=${corruptions} damageCalls=${damageCalls} damageTotal=${totalDamage.toFixed(3)}`);
