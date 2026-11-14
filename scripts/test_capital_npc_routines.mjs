import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const threeSource = await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8');
const threeURL = `data:text/javascript;base64,${Buffer.from(threeSource).toString('base64')}`;
const THREE = await import(threeURL);
const source = (await readFile(new URL('../Games/Capital Drive/pedestrians.js', import.meta.url), 'utf8'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'", JSON.stringify(threeURL));
const { createPedestrians } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const fixture = { bounds: { minX: -600, maxX: 600, minZ: -200, maxZ: 200 },
  roads: [{ id: 'public', name: 'Public Street', type: 'residential', width: 8, points: [[-550, 0], [550, 0]] }],
  spawn: { x: 0, z: -30, yaw: Math.PI / 2 }, buildings: [], areas: [], landmarks: [] };
const far = { x: 0, z: -140, speed: 0 };
const scene = new THREE.Scene();
const people = createPedestrians(scene, fixture, () => 0);
const batch = name => scene.children[0].children.find(mesh => mesh.name === `Pedestrian ${name}`);
assert.equal(people.stats.capacity, 64);
assert.equal(people.snapshot().length, 36);
assert.equal(scene.children[0].children.length, 11);
const initial = people.snapshot();
for (const p of initial) for (const other of initial) {
  if (p.id < other.id) assert(Math.hypot(p.x - other.x, p.z - other.z) >= 2, 'arrival bodies are spaced apart');
}
const coffee = initial.filter(p => p.routine === 'coffee');
assert(coffee.length > 0 && coffee.length <= 6);
assert(initial.some(p => p.routine === 'work') && initial.some(p => p.routine === 'phone') && initial.some(p => p.routine === 'wait'));
assert.equal(batch('chairs').count, coffee.length * 6, 'every seated adult has a real six-part chair');
assert.equal(batch('cups').count, coffee.length * 2, 'seated coffee includes a cup and visible drink');
for (const p of initial.filter(p => p.routineSite)) {
  assert.equal(p.routineSite.roadId, 'public');
  assert(Math.abs(p.routineSite.z) >= 5.2, 'work and coffee sites are off asphalt');
  assert(Object.isFrozen(p.routineSite));
}
const seated = coffee[0];
assert(people.clipMovement({ x: seated.x, z: seated.z + 2 }, 0, -4).blocked, 'seated adults retain swept body contacts');
people.resetPopulation(fixture.spawn);
const phaseBefore = people.snapshot();
for (let i = 0; i < 4; i++) people.update(far, 0);
assert.deepEqual(people.snapshot(), phaseBefore, 'pause freezes every routine clock and phase');
people.update(far, 0.1);
assert(people.snapshot().find(p => p.id === seated.id).routineClock < seated.routineClock);
people.resetPopulation(fixture.spawn);
people.alert({ x: seated.x, z: seated.z, radius: 1, kind: 'firearm' });
assert.equal(people.snapshot().find(p => p.id === seated.id).routine, 'interrupted');
people.update(far, 0.1);
assert.equal(people.snapshot().find(p => p.id === seated.id).reaction, 'flee');
assert.equal(batch('cups').count, people.snapshot().filter(p => p.routine === 'coffee' && Math.hypot(p.x - far.x, p.z - far.z) < 180).length * 2, 'panic puts the drink away and distant props are culled');
const fleeStart = people.snapshot().find(p => p.id === seated.id);
for (let i = 0; i < 10; i++) people.update(far, 0.1);
const fleeEnd = people.snapshot().find(p => p.id === seated.id);
assert(Math.hypot(fleeEnd.x - fleeStart.x, fleeEnd.z - fleeStart.z) > 1.8, 'fear produces an actual run');
let resumed = false;
for (let i = 0; i < 700; i++) {
  people.update(far, 0.1);
  const p = people.snapshot().find(p => p.id === seated.id);
  if (p.reaction === 'calm' && p.routine === 'coffee') { resumed = true; break; }
}
assert(resumed, 'recovered adults walk back to the seat before resuming coffee');
people.resetPopulation(fixture.spawn);
const assertive = people.snapshot().find(p => p.personality === 'assertive');
const assault = { x: assertive.x, z: assertive.z + 1, yaw: 0, range: 1.3, damage: 10 };
people.strike(assault); people.drainEvents();
for (let i = 0; i < 10; i++) people.update(assault, 0.1, [], () => false);
assert(!people.drainEvents().some(e => e.type === 'retaliation'), 'walls block angry retaliation');
people.update(assault, 0.1, [], () => true);
assert.equal(people.drainEvents().filter(e => e.type === 'retaliation').length, 1);
for (let i = 0; i < 10; i++) people.update(assault, 0.1, [], () => true);
assert(!people.drainEvents().some(e => e.type === 'retaliation'), 'retaliation cannot repeat during cooldown');
people.resetPopulation(fixture.spawn);
const reserved = people.snapshot().find(p => p.personality !== 'assertive');
const reservedAssault = { ...assault, x: reserved.x, z: reserved.z + 1 };
people.strike(reservedAssault); people.drainEvents();
for (let i = 0; i < 10; i++) people.update(reservedAssault, 0.1);
assert.equal(people.snapshot().find(p => p.id === reserved.id).reaction, 'flee', 'most personalities flee after assault');
assert(!people.drainEvents().some(e => e.type === 'retaliation'));
people.resetPopulation(fixture.spawn);
assert.equal(people.strike({ ...assault, range: 30, kind: 'firearm' }).hits, 1);
assert.equal(people.strike({ ...assault, range: 30, kind: 'firearm' }).hits, 0, 'same-frame pellets respect the existing hit cooldown');
people.resetPopulation(fixture.spawn);
for (let i = 0; i < 450; i++) people.update(far, 0.1);
const separated = people.snapshot();
for (const p of separated) for (const other of separated) {
  if (p.id < other.id) assert(Math.hypot(p.x - other.x, p.z - other.z) >= 0.64, 'walking and routine returns keep physical bodies apart');
}
assert(people.stats.seated <= 6 && people.stats.working <= 6 && people.stats.drawCalls <= 11);
const avoid = createPedestrians(new THREE.Scene(), fixture, () => 0, { entrances: initial.map(p => ({ x: p.x, z: p.z })) });
assert(avoid.snapshot().every(p => !p.routineSite), 'known public door approaches never receive chairs or work sites');
avoid.dispose();
const wet = createPedestrians(new THREE.Scene(), { ...fixture, areas: [{ type: 'water', points: [[-600, 4.6], [600, 4.6], [600, 10], [-600, 10]] }] }, () => 0);
assert(wet.snapshot().every(p => p.z < 0), 'source water excludes sidewalk and routine placements');
wet.dispose();
const privateRoad = createPedestrians(new THREE.Scene(), { ...fixture, roads: [{ ...fixture.roads[0], sourceTags: { access: 'private' } }] }, () => 0);
assert.equal(privateRoad.stats.count, 0, 'private access never creates ambient jobs or seats');
privateRoad.dispose();
people.dispose(); people.dispose();
assert.equal(scene.children.length, 0);
console.log('PASS quieter separated adults, seated chair/cup contacts, source/door/water-safe routines, pause and return, personality/LOS retaliation, pellet cooldown, caps and disposal');
