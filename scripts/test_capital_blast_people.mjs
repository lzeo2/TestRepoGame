import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createInteriors } from '../Games/Capital Drive/interiors.js';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createRideService } from '../Games/Capital Drive/ride-service.js';

// Arrange private people only in source-export fixtures; execute the production strike handlers.
async function fixtureModule(name, needle, replacement) {
  const path = new URL(`../Games/Capital Drive/${name}.js`, import.meta.url);
  let source = await readFile(path, 'utf8');
  assert(source.includes(needle));
  source = source.replace(needle, replacement).replace(/from ['"](\.[^'"]+)['"]/g, (_, relative) => `from '${new URL(relative, path).href}'`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { createPedestrians } = await fixtureModule('pedestrians', 'return { update, applyVehicleImpacts', `return { fixture(points) {
  pool.forEach((p,i)=>Object.assign(p,{x:1000+i,z:1000,health:100,hitCooldown:0,witnessCooldown:0},points[i]||{}));
  rebuildPeopleGrid();
}, update, applyVehicleImpacts`);
const { createInteriorPeople } = await fixtureModule('interior-people', 'return {load,update,', `return {fixture(points) {
  const template=people[0];people=points.map((p,i)=>({...template,id:'room-fixture-'+i,health:100,hitCooldown:0,roomId:plan.id,...p}));
},load,update,`);
const { createStreetDealers } = await fixtureModule('street-dealers', 'return {services,nearest,', `return {fixture(points) {
  people=points.map((p,i)=>({id:'dealer-fixture-'+i,health:100,hitCooldown:0,panic:0,...p}));
},services,nearest,`);
const map = { bounds: { minX: -500, maxX: 500, minZ: -500, maxZ: 500 }, spawn: { x: 0, z: 0, yaw: 0 },
  roads: [{ id: 'street', name: 'Example Street', type: 'residential', width: 8, points: [[-350, 0], [350, 0]] }], buildings: [], landmarks: [] };
const room = createInteriors({ buildings: [{ id: 'shop', type: 'retail', points: [[-12, 0], [12, 0], [12, 30], [-12, 30]], height: 4 }] }, {
  stores: [{ id: 'fixture-shop', name: 'Fixture shop', buildingId: 'shop', frontage: { x: 0, z: 0, yaw: 0, width: 8 } }],
});
const entry = room.entries[0], plan = room.enter(entry, { x: 0, z: -1.5, yaw: 0 });
assert(plan);
const street = createPedestrians(new THREE.Scene(), map, () => 0), indoor = createInteriorPeople(), dealers = createStreetDealers({ roads: [], buildings: [] });
indoor.load(plan);
const explosion = { x: 0, z: 0, yaw: 0, range: 8, damage: 100, kind: 'explosion', offenderId: 'player' };
const positions = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 0, z: 4 }, { x: 0, z: -6 }, { x: 8, z: 0 }, { x: 9, z: 0 }];
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} differs from ${expected}`);
for (const [name, pool] of [['street', street], ['room', indoor], ['dealer', dealers]]) {
  pool.fixture(positions);
  const calls = new Map();
  const result = pool.strike({ ...explosion, hasLineOfSight: (a, b) => { calls.set(b.id, (calls.get(b.id) || 0) + 1); return true; } });
  assert.equal(result.hits, 4, `${name}: front, side and back receive radial damage; radius edge and outside do not`);
  result.people.forEach((person, i) => near(person.health, [0, 25, 50, 75][i]));
  assert([...calls.values()].every(count => count === 1), `${name}: one physical sight query per candidate`);
  assert.equal(pool.strike({ ...explosion, hasLineOfSight: () => true }).hits, 0, `${name}: cooldown and dead guards reject duplicate hits`);
  pool.fixture([{ x: 0, z: 4 }]);
  assert.equal(pool.strike({ ...explosion, hasLineOfSight: () => false }).hits, 0);
  assert.equal(pool.strike({ ...explosion, hasLineOfSight: () => 1 }).hits, 0, `${name}: physical sight must positively admit the segment`);
  assert.equal(pool.strike(explosion).hits, 0, `${name}: a missing sight owner cannot bypass walls`);
  pool.fixture([{ x: 0, z: 4 }]);
  const capped = pool.strike({ ...explosion, damage: 10000, range: 100, hasLineOfSight: () => true });
  near(capped.people[0].health, 50);
  for (const invalid of [{ range: 0 }, { range: -1 }, { damage: -1 }, { damage: NaN }, { x: NaN }]) {
    pool.fixture([{ x: 0, z: 0 }]);
    assert.equal(pool.strike({ ...explosion, ...invalid, hasLineOfSight: () => true }).hits, 0);
  }
  for (const kind of ['melee', 'pistol']) {
    pool.fixture([{ x: 0, z: 1 }]);
    assert.equal(pool.strike({ ...explosion, kind, range: 2, hasLineOfSight: () => true }).hits, 0, `${name}: ordinary attacks retain their forward cone`);
  }
}
for (const [name, pool] of [['street', street], ['room', indoor]]) {
  pool.fixture(Array.from({ length: 16 }, (_, i) => ({ x: 1 + i * .1, z: 1 })));
  let calls = 0;
  const result = pool.strike({ ...explosion, damage: 20, hasLineOfSight: () => { calls++; return true; } });
  assert.equal(result.hits, 12, `${name}: only the nearest twelve are processed`);
  assert.equal(calls, 12);
}
const wallMap = { ...map, buildings: [{ id: 'wall', points: [[1, -10], [1.4, -10], [1.4, 10], [1, 10]], height: 4 }] };
const simulation = createSimulation(wallMap, { trafficCount: 0 });
for (const pool of [street, indoor, dealers]) {
  pool.fixture([{ x: 2, z: 0 }, { x: 0, z: 2 }]);
  const hit = pool.strike({ ...explosion, hasLineOfSight: simulation.hasLineOfSight });
  assert.equal(hit.hits, 1, 'actual retained polygon sight blocks the far side of a wall');
  near(hit.people[0].health, 25);
}
indoor.drainEvents();
indoor.fixture([{ x: 0, z: 2 }]);
indoor.strike({ ...explosion, offenderId: 'traffic:7', hasLineOfSight: () => true });
indoor.update(1, { actor: { x: 100, z: 100 } });
indoor.drainEvents();
indoor.clear();
assert.equal(indoor.strike({ ...explosion, hasLineOfSight: () => true }).hits, 0, 'leaving clears the active-room blast population');
indoor.load({ ...plan, id: 'different-room' }); indoor.fixture([{ x: 0, z: 2 }]);
indoor.strike({ ...explosion, offenderId: 'traffic:7', hasLineOfSight: () => true });
const witness = indoor.drainEvents().find(event => event.type === 'witness');
assert.equal(witness.offenderId, 'traffic:7'); assert.equal(witness.roomId, 'different-room');
street.resetPopulation(map.spawn); street.drainEvents(); street.fixture([{ x: 0, z: 2 }]);
street.strike({ ...explosion, offenderId: 'traffic:7', hasLineOfSight: () => true });
const streetWitnesses = street.drainEvents().filter(event => event.type === 'witness');
assert.equal(streetWitnesses.length, 1);
assert(streetWitnesses.every(event => event.offenderId === 'traffic:7'));
street.fixture([{ x: 0, z: 0 }]);
street.strike({ ...explosion, hasLineOfSight: () => true });
assert.equal(street.drainEvents().filter(event => event.type === 'witness').length, 0, 'a fatally hit adult cannot report as a living witness');
indoor.load(plan); indoor.fixture([{ x: 0, z: 0 }, { x: 0, z: 2 }]);
indoor.strike({ ...explosion, hasLineOfSight: () => true });
assert.equal(indoor.drainEvents().find(event => event.type === 'witness').witnessId, 'room-fixture-1', 'room report uses a surviving visible witness');
const ride = createRideService(map, simulation), driver = ride.people[0];
for (const offset of [{ x: 2, z: 0 }, { x: 0, z: 2 }, { x: 0, z: -2 }]) {
  Object.assign(driver, offset, { active: true, health: 100, hitCooldown: 0 });
  let calls = 0;
  const hit = ride.strike({ ...explosion, hasLineOfSight: () => { calls++; return true; } });
  assert.equal(hit.hits, 1); near(driver.health, 25); assert.equal(calls, 1);
  assert.equal(ride.strike({ ...explosion, hasLineOfSight: () => true }).hits, 0);
}
Object.assign(driver, { x: 2, z: 0, active: true, health: 100, hitCooldown: 0 });
assert.equal(ride.strike(explosion).hits, 0, 'Yoober falls back to actual Simulation wall sight');
Object.assign(driver, { x: 0, z: 8 });
assert.equal(ride.strike({ ...explosion, hasLineOfSight: () => true }).hits, 0);
Object.assign(driver, { x: 0, z: 2 });
assert.equal(ride.strike({ ...explosion, kind: 'melee', hasLineOfSight: () => true }).hits, 0);
street.dispose();
console.log('Capital blast people: radial side/back/falloff, eight-metre/100-damage clamps, physical wall sight, nearest-12 bounds, cooldown/dead guards, room/offender isolation and unchanged ordinary cones PASS');
