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
assert(avoid.snapshot().filter(p => p.routineSite).every(p => initial.every(door => Math.hypot(p.routineSite.x - door.x, p.routineSite.z - door.z) >= 3)), 'relocated chairs and work sites preserve known public door approaches');
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

// Match the real boot map and its generated house-door exclusions. Axis-aligned
// fixtures alone miss the narrow diagonal pavements used throughout Canberra.
const { applyRoadProfiles, roadProfile } = await import('../Games/Capital Drive/road-network.js');
const { applyMapExpansion } = await import('../Games/Capital Drive/map-expansion.js');
const { createNeighbourhoodDetails } = await import('../Games/Capital Drive/neighbourhood.js');
const { MAPPED_STORES } = await import('../Games/Capital Drive/stores.js');
const { EXTRA_STORES } = await import('../Games/Capital Drive/civic-extras.js');
const { CAMPUS_GATES, CAMPUS_BUILDING_IDS } = await import('../Games/Capital Drive/campus.js');
const { CIVIC_INTERIOR_ENTRIES } = await import('../Games/Capital Drive/civic-view.js');
const { SHOPPING_BUILDING_IDS } = await import('../Games/Capital Drive/shopping-precincts.js');
const { MANUKA_POOL_BASIN } = await import('../Games/Capital Drive/landmarks.js');
const { createStreetDealers } = await import('../Games/Capital Drive/street-dealers.js');
const readMap = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`, import.meta.url), 'utf8'));
const actualMap = applyMapExpansion(applyRoadProfiles(await readMap('canberra'), await readMap('road-profiles')), await readMap('canberra-north'));
actualMap.shoppingManagedBuildingIds = SHOPPING_BUILDING_IDS;
actualMap.campusBuildingIds = CAMPUS_BUILDING_IDS;
actualMap.areas = [...actualMap.areas, { type: 'water', points: MANUKA_POOL_BASIN }];
const sourceBefore = JSON.stringify(actualMap);
const neighbourhood = createNeighbourhoodDetails(new THREE.Scene(), actualMap, () => 0);
assert(neighbourhood.entries.length > 4000, 'actual generated house entrances participate in placement');
const dealers = createStreetDealers(actualMap);
const actualEntrances = [...MAPPED_STORES, ...EXTRA_STORES].map(store => store.frontage).filter(Boolean)
  .concat(CIVIC_INTERIOR_ENTRIES, CAMPUS_GATES, neighbourhood.entries, dealers.services);
const actualScene = new THREE.Scene();
const adults = createPedestrians(actualScene, actualMap, () => 0, { entrances: actualEntrances });
const actualBatch = name => actualScene.children[0].children.find(mesh => mesh.name === `Pedestrian ${name}`);
const pointSegment = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a[0] - dx * t, p.z - a[1] - dz * t);
};
function inside(p, ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a[1] > p.z) !== (b[1] > p.z) && p.x < (b[0] - a[0]) * (p.z - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}
const sourceRoads = new Map(actualMap.roads.map(road => [road.id, road]));
const blocks = [...actualMap.buildings, ...actualMap.areas.filter(area => area.type === 'water')];
const samples = [];
for (const [label, focus] of [['NSW Crescent', actualMap.spawn], ['Kingston/Giles', { x: 669, z: -472, yaw: 0 }],
  ['Civic', actualMap.landmarks.find(place => place.id === 'canberra-centre')]]) {
  adults.resetPopulation(focus);
  const arrival = adults.snapshot();
  assert(adults.stats.seated >= 1 && adults.stats.working >= 1, `${label} really renders coffee and work routines`);
  assert(actualBatch('chairs').count >= 6 && actualBatch('cups').count >= 2 && actualBatch('tools').count >= 1);
  assert(adults.stats.drawCalls <= 11 && adults.stats.seated <= 6 && adults.stats.working <= 6);
  for (const role of ['coffee', 'work']) {
    assert(arrival.some(p => p.routine === role && Math.hypot(p.x - focus.x, p.z - focus.z) < 75), `${label} has a nearby ${role} adult`);
  }
  for (const p of arrival.filter(person => person.routineSite)) {
    const site = p.routineSite, road = sourceRoads.get(site.roadId);
    assert(road && !['private', 'no'].includes(road.sourceTags?.access) && road.sourceTags?.foot !== 'no');
    assert(actualEntrances.every(door => Math.hypot(site.x - door.x, site.z - door.z) >= 3), `${label} keeps public doors and contacts clear`);
    // Check the actual rendered chair corners, rotated with the source path.
    for (const x of [-0.28, 0.28]) for (const z of [-0.28, 0.28]) {
      const yaw = p.seat?.yaw ?? p.yaw;
      const corner = { x: site.x + x * Math.cos(yaw) + z * Math.sin(yaw), z: site.z - x * Math.sin(yaw) + z * Math.cos(yaw) };
      assert(!blocks.some(block => inside(corner, block.points)), `${label} props avoid source water/buildings`);
      for (const road of actualMap.roads) {
        if (['footway', 'path', 'pedestrian', 'cycleway'].includes(road.type)) continue;
        for (let i = 1; i < road.points.length; i++) {
          assert(pointSegment(corner, road.points[i - 1], road.points[i]) >= roadProfile(road).driveWidth / 2,
            `${label} complete prop footprint stays off motor lanes`);
        }
      }
    }
  }
  const first = arrival.find(p => p.routine === 'coffee');
  const matricesBefore = actualScene.children[0].children.map(mesh => [...mesh.instanceMatrix.array]);
  adults.update(focus, 0);
  assert.deepEqual(adults.snapshot(), arrival, `${label} paused actual routines retain their pose and timers`);
  assert.deepEqual(actualScene.children[0].children.map(mesh => [...mesh.instanceMatrix.array]), matricesBefore);
  adults.alert({ x: first.x, z: first.z, radius: 1, kind: 'gunshot' });
  adults.update(focus, 0.1);
  const panicked = adults.snapshot().find(p => p.id === first.id);
  assert.equal(panicked.routine, 'interrupted');
  assert.equal(panicked.reaction, 'flee');
  assert.equal(actualBatch('cups').count, (adults.stats.seated) * 2, `${label} interrupted adults put their cup away`);
  let returned = false;
  for (let i = 0; i < 1200; i++) {
    adults.update(focus, 0.1);
    if (adults.snapshot().find(p => p.id === first.id).routine === 'coffee') { returned = true; break; }
  }
  assert(returned, `${label} actual adult resumes seated coffee after fleeing and returning`);
  samples.push(`${label}: ${arrival.filter(p => p.routine === 'coffee').length} coffee/${arrival.filter(p => p.routine === 'work').length} work`);
}
assert.equal(JSON.stringify(actualMap), sourceBefore, 'routines never rewrite the supplied map');
adults.dispose(); neighbourhood.dispose();
console.log(`PASS actual expanded/profiled map with ${actualEntrances.length} public/house/contact exclusions; ${samples.join('; ')}; full prop clearance, pause, panic and return`);
