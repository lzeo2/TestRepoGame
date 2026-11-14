import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const { createInteriors, createGymEntry } = await import(moduleURL(await read('../Games/Capital Drive/interiors.js')));
function assertActivitiesReachable(interiors, plan) {
  assert(Object.isFrozen(plan.activities) && plan.activities.length > 0, `${plan.type} has immutable activities`);
  const ids = new Set();
  const c = Math.cos(plan.origin.yaw), sin = Math.sin(plan.origin.yaw);
  const point = (x, z) => ({ x: plan.origin.x + c * x + sin * z, z: plan.origin.z - sin * x + c * z });
  const local = p => ({ x: c * (p.x - plan.origin.x) - sin * (p.z - plan.origin.z), z: sin * (p.x - plan.origin.x) + c * (p.z - plan.origin.z) });
  const step = 0.35, queue = [[0, 0]], visited = new Set(['0,0']), reached = new Set();
  for (const station of plan.activities) {
    assert(Object.isFrozen(station)); assert(!ids.has(station.id)); ids.add(station.id);
    assert(['bench', 'noodle', 'stock', 'tv', 'cooking', 'rest', 'arcade'].includes(station.kind));
    assert(station.label && [station.x, station.z, station.yaw, station.radius].every(Number.isFinite));
    assert(station.radius > 0 && station.radius <= 2);
    const pose = { x: station.x, z: station.z };
    assert.equal(interiors.moveActor(pose, 0, 0).blocked, false, `${station.id} has player-sized standing space`);
    assert(plan.furniture.some(f => Math.hypot(f.x - station.x, f.z - station.z) < 2.5), `${station.id} relates to furniture`);
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [ix, iz] = queue[cursor], p = point(ix * step, 1.65 + iz * step);
    for (const station of plan.activities) if (Math.hypot(p.x - station.x, p.z - station.z) <= step * 0.8) {
      const pose = { ...p };
      if (!interiors.moveActor(pose, station.x - p.x, station.z - p.z).blocked) reached.add(station.id);
    }
    if (reached.size === plan.activities.length) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = ix + dx, nz = iz + dz, key = `${nx},${nz}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const q = point(nx * step, 1.65 + nz * step), l = local(q);
      if (Math.abs(l.x) > plan.width / 2 || l.z < 0 || l.z > plan.depth) continue;
      const pose = { ...p };
      if (!interiors.moveActor(pose, q.x - p.x, q.z - p.z).blocked) queue.push([nx, nz]);
    }
  }
  assert.deepEqual([...reached].sort(), [...ids].sort(), `${plan.id} every station reachable from its door with solid furniture`);
}
const house = { id: 'house', type: 'house', height: 4, points: [[-6, 20], [6, 20], [6, 34], [-6, 34]] };
const shopBuilding = { ...house, id: 'shop', type: 'retail' };
const doors = [{ id: 'house', buildingId: 'house', x: 0, z: 20, nx: 0, nz: 1 }];
const store = { id: 'mapped-shop', buildingId: 'shop', name: 'Original Grocery', frontage: { x: 30, z: 20, yaw: 0, width: 8 } };
const map = { buildings: [house, shopBuilding], interiorEntries: doors };
const interiors = createInteriors(map, { heightAt: () => 3, stores: [store] });
assert.equal(interiors.active, null);
assert.equal(interiors.stats.generatedPlans, 0, 'descriptors do not generate furnishings');
assert.equal(interiors.entries.length, 2);
assert(Object.isFrozen(interiors.entries));
assert.equal(createInteriors({ buildings: [house] }).entries.length, 0, 'houses require an actually rendered door');
assert.equal(interiors.findEntry({ x: 0, z: 1000 }), null);
assert.equal(interiors.findEntry({ x: 0, z: 21 }), null, 'cannot enter through the back of an exterior wall');
assert.equal(interiors.findEntry({ x: 0, z: 19, y: 30 }), null);
const actor = { x: 0, z: 18.5, y: 3, yaw: 0.8, speed: 2 };
const entry = interiors.findEntry(actor), outside = { ...actor };
assert.equal(entry.type, 'house');
assert.equal(interiors.enter({ ...entry }, actor), false, 'fabricated descriptors cannot open a room');
const plan = interiors.enter(entry, actor);
assert(plan && plan === interiors.active);
assertActivitiesReachable(interiors, plan);
assert.deepEqual(plan.rooms.map(r => r.kind), ['living', 'kitchen', 'bedroom', 'bathroom']);
assert(plan.furniture.some(f => f.kind === 'bed') && plan.furniture.some(f => f.kind === 'bath'));
assert(Object.isFrozen(plan.furniture));
assert.equal(interiors.stats.activePlans, 1);
assert.equal(interiors.enter(interiors.entries[1], actor), false, 'only one active plan');
assert.equal(interiors.findEntry(outside), null, 'outdoor entry detection stops indoors');
assert(interiors.nearExit(actor));
assert(interiors.hasLineOfSight({ x: 0, z: 22 }, { x: 0, z: 30 }), 'central hall is connected');
assert(interiors.hasLineOfSight({ x: 0, z: 23.1 }, { x: -1.6, z: 23.1 }), 'room door gap is open');
assert.equal(interiors.hasLineOfSight({ x: 0, z: 21 }, { x: -1.6, z: 21 }), false, 'partition blocks sight');
assert.equal(interiors.hasLineOfSight(actor, outside), false, 'outdoor actors cannot see through the interior scene');
const hallWalker = { x: 0, z: 23.1 };
assert(interiors.moveActor(hallWalker, -1.7, 0).moved, 'a person fits through the room doorway');
assert(hallWalker.x < -1.5);
const wallWalker = { x: 0, z: 21 };
assert(interiors.moveActor(wallWalker, -4, 0).blocked);
assert(wallWalker.x > -0.5, 'swept movement cannot tunnel through a partition');
const sofa = plan.furniture.find(f => f.kind === 'sofa');
const sofaWalker = { x: sofa.x + 1, z: sofa.z };
assert(interiors.moveActor(sofaWalker, -2, 0).blocked, 'furniture is solid');
const runaway = { x: 0, z: 25 };
assert(interiors.moveActor(runaway, 0, 1e6).blocked);
assert(runaway.z < 32, 'long movement is bounded and cannot escape exterior walls');
assert.equal(interiors.moveActor(actor, NaN, 0).moved, false);
assert.equal(interiors.leave(actor), true);
assert.equal(interiors.active, null);
assert.deepEqual({ x: actor.x, z: actor.z, y: actor.y, yaw: actor.yaw }, { x: outside.x, z: outside.z, y: outside.y, yaw: outside.yaw });
assert.equal(interiors.stats.activePlans, 0);
assert.equal(interiors.stats.generatedPlans, 1);
assert.equal(interiors.leave(actor), false);
actor.x = 30; actor.z = 18.5;
const shop = interiors.enter(interiors.findEntry(actor), actor);
assert.equal(shop.type, 'shop');
assertActivitiesReachable(interiors, shop);
assert.equal(shop.storeId, store.id);
assert(shop.counter && shop.furniture.some(f => f.kind === 'shelves'));
assert(interiors.hasLineOfSight(actor, shop.counter), 'shop counter has an accessible central approach');
interiors.reset(actor);
assert.equal(actor.z, 18.5);
assert.equal(interiors.active, null);
actor.x = 0;
const secondHouse = interiors.enter(interiors.findEntry(actor), actor);
assert.notEqual(secondHouse, plan, 'plans are recreated only on a new entry');
assert.deepEqual(secondHouse, plan, 'original layout stays deterministic across visits');

const threeURL = moduleURL(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const utilsURL = moduleURL((await read('../assets/car-arcade/vendor/BufferGeometryUtils.js')).replace('./three.module.js', threeURL));
const { createInteriorView } = await import(moduleURL((await read('../Games/Capital Drive/interior-view.js'))
  .replace('../../assets/car-arcade/vendor/three.module.js', threeURL)
  .replace('../../assets/car-arcade/vendor/BufferGeometryUtils.js', utilsURL)));
const scene = new THREE.Scene(), view = createInteriorView(scene);
assert.equal(view.stats.meshes, 0, 'view starts without interior geometry');
view.load(secondHouse);
assert(view.stats.draws <= 10 && view.stats.triangles < 3000);
let disposalCount = 0;
const geometry = scene.children[0].children[0].geometry;
geometry.addEventListener('dispose', () => disposalCount++);
view.load(secondHouse);
assert.equal(disposalCount, 0, 'same-plan load does not rebuild');
view.load(shop);
assert.equal(disposalCount, 1, 'replacing a plan disposes its geometry');
assert.equal(scene.children[0].children.length, 1);
scene.traverse(mesh => {
  if (!mesh.isMesh) return;
  for (const attr of Object.values(mesh.geometry.attributes)) for (const n of attr.array) assert(Number.isFinite(n));
});
assert(view.stats.draws === 1 && view.stats.triangles < 3000);
const shopTriangles = view.stats.triangles;
view.clear(); view.clear();
assert.equal(view.stats.triangles, 0);
assert.equal(scene.children[0].children.length, 0);
view.dispose(); view.dispose();
assert.equal(scene.children.length, 0);
assert.equal(view.load(plan), false, 'disposed view cannot recreate resources');
interiors.reset();
assert.equal(interiors.snapshot().activePlans, 0);

// Exercise the retained real source storefronts, including non-axis-aligned doors.
const actualMap = JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
const actualStores = JSON.parse(await read('../Games/Capital Drive/data/stores.json')).stores;
const baseStores = actualStores.filter(s => !s.interiorType);
const actual = createInteriors(actualMap, { stores: baseStores });
assert.equal(actual.entries.length, baseStores.length);
assert.equal(actual.stats.generatedPlans, 0);
let maximumTriangles = 0;
const actualScene = new THREE.Scene(), actualView = createInteriorView(actualScene);
for (const entry of actual.entries) {
  assert(actualMap.buildings.some(b => b.id === entry.buildingId));
  const s = Math.sin(entry.yaw), c = Math.cos(entry.yaw);
  const visitor = { x: entry.x - s * 1.4, z: entry.z - c * 1.4, y: 0, yaw: entry.yaw };
  const before = { ...visitor };
  assert.equal(actual.findEntry(visitor), entry);
  const interior = actual.enter(entry, visitor);
  assert(interior && interior.type === 'shop');
  assertActivitiesReachable(actual, interior);
  assert(actual.hasLineOfSight(visitor, interior.counter), `${entry.name} counter has a clear approach`);
  const movement = actual.moveActor(visitor, s * 0.5, c * 0.5);
  assert(movement.moved && !movement.blocked, `${entry.name} entrance aisle is walkable`);
  actualView.load(interior);
  assert(actualView.stats.triangles < 3000 && actualView.stats.draws === 1);
  maximumTriangles = Math.max(maximumTriangles, actualView.stats.triangles);
  actual.leave(visitor); actualView.clear();
  assert.deepEqual({ x: visitor.x, z: visitor.z, y: visitor.y, yaw: visitor.yaw }, before);
  assert.equal(actual.stats.activePlans, 0);
}
actualView.dispose();
assert.equal(actualScene.children.length, 0);
assert.equal(actual.stats.generatedPlans, baseStores.length);

const roadURL = moduleURL(await read('../Games/Capital Drive/road-network.js'));
const civicSource = (await read('../Games/Capital Drive/civic-view.js'))
  .replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./road-network.js', roadURL)
  .replace('./civic-extras.js', moduleURL(await read('../Games/Capital Drive/civic-extras.js')));
const { CIVIC_INTERIOR_ENTRIES } = await import(moduleURL(civicSource));
const north = JSON.parse(await read('../Games/Capital Drive/data/canberra-north.json'));
const publicDoor = CIVIC_INTERIOR_ENTRIES[0];
assert.equal(createInteriors(actualMap, { publicEntries: CIVIC_INTERIOR_ENTRIES }).entries.length, 0, 'public descriptor requires its retained source building');
assert.equal(createInteriors(north, { publicEntries: [{ ...publicDoor, x: publicDoor.x + 500 }] }).entries.length, 0, 'map-only travel points cannot become public doors');
const mall = createInteriors(north, { publicEntries: CIVIC_INTERIOR_ENTRIES });
const mallScene = new THREE.Scene(), mallView = createInteriorView(mallScene);
assert.equal(mall.entries.length, 1);
assert.equal(mall.stats.generatedPlans, 0); assert.equal(mallView.stats.meshes, 0);
const ms = Math.sin(publicDoor.yaw), mc = Math.cos(publicDoor.yaw);
const point = (x, z) => ({ x: publicDoor.x + mc * x + ms * z, z: publicDoor.z - ms * x + mc * z });
const visitor = { ...point(0, -1.5), y: 0, yaw: 0.7 }, outsideMall = { ...visitor };
assert.equal(mall.findEntry(point(0, -4)), null, 'landmark approach is outside door interaction range');
assert.equal(mall.findEntry(point(0, 1.1)), null, 'cannot enter through the inside of the exterior body');
const mallEntry = mall.findEntry(visitor);
assert(mallEntry && mallEntry.type === 'mall');
assert(!('furniture' in mallEntry) && !('rooms' in mallEntry));
assert.equal(mall.enter({ ...mallEntry }, visitor), false);
const mallPlan = mall.enter(mallEntry, visitor);
assertActivitiesReachable(mall, mallPlan);
assert(mallPlan.activities.some(s => s.kind === 'arcade'));
assert.equal(mallPlan.counter, null, 'original mall fixtures do not expose a paid service counter');
assert(!('storeId' in mallPlan)); assert(!('siteId' in mallPlan));
assert.equal(mallPlan.rooms.filter(r => r.kind === 'mall-unit').length, 4);
assert.equal(mallPlan.doors.filter(d => d.kind === 'unit').length, 4);
assert.equal(mallPlan.furniture.filter(f => f.kind === 'shelves').length, 4);
assert.equal(mallPlan.furniture.filter(f => f.kind === 'counter').length, 4);
assert.equal(mallPlan.furniture.filter(f => f.kind === 'bench').length, 2);
assert(mall.hasLineOfSight(point(0, 2), point(0, 25)), 'concourse remains open past the benches');
function walkTo(x, z) {
  const target = point(x, z), dx = target.x - visitor.x, dz = target.z - visitor.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.35));
  for (let i = 0; i < steps; i++) assert.equal(mall.moveActor(visitor, dx / steps, dz / steps).blocked, false, `mall route to ${x},${z} stays clear`);
  assert(Math.hypot(visitor.x - target.x, visitor.z - target.z) < 1e-6);
}
for (const z of [7.5, 18.5]) for (const side of [-1, 1]) {
  walkTo(0, z); walkTo(side * 7.5, z); walkTo(side * 7.5, z + 2);
  assert(!mall.nearExit(visitor), 'a side unit cannot accidentally trigger the public exit');
  walkTo(side * 7.5, z); walkTo(0, z);
}
const partitionTester = { ...point(0, 4) };
assert(mall.moveActor(partitionTester, mc * 7, -ms * 7).blocked, 'unit walls are solid away from their doors');
assert(!mall.hasLineOfSight(point(0, 4), point(7.5, 4)), 'mall partition occludes sight outside the doorway');
walkTo(0, 1.65); assert(mall.nearExit(visitor));
mallView.load(mallPlan);
assert(mallView.stats.draws <= 4 && mallView.stats.triangles < 3000);
const mallTriangles = mallView.stats.triangles;
let mallDisposed = 0;
mallScene.children[0].children[0].geometry.addEventListener('dispose', () => mallDisposed++);
assert(mall.leave(visitor)); mallView.clear();
assert.equal(mall.active, null); assert.equal(mall.stats.activePlans, 0); assert.equal(mallDisposed, 1);
assert.deepEqual({ x: visitor.x, z: visitor.z, y: visitor.y, yaw: visitor.yaw }, outsideMall, 'exit returns to saved actual Bunda door approach');
const returnPlan = mall.enter(mall.findEntry(visitor), visitor);
assert.notEqual(returnPlan, mallPlan); assert.deepEqual(returnPlan, mallPlan);
mallView.load(returnPlan); mall.reset(visitor); mallView.dispose(); mallView.dispose();
assert.equal(mallScene.children.length, 0); assert.equal(mall.stats.activePlans, 0);

const noodleStore = actualStores.find(s => s.id === 'store-5656111023');
assert(noodleStore && noodleStore.interiorType === 'noodle-shop');
assert.equal(baseStores.length, 20, 'all twenty generic shops retain their full regression');
assert.equal(noodleStore.buildingId, 'osm-584970594');
assert.equal(noodleStore.source.id, 5656111023);
const restaurant = createInteriors({ buildings: [...actualMap.buildings, ...north.buildings] }, { stores: actualStores });
assert.equal(restaurant.entries.length, 21);
assert.equal(restaurant.stats.generatedPlans, 0);
const noodleEntry = restaurant.entries.find(e => e.storeId === noodleStore.id);
assert.equal(noodleEntry.variant, 'noodles');
assert(!('furniture' in noodleEntry));
const ns = Math.sin(noodleEntry.yaw), nc = Math.cos(noodleEntry.yaw);
const noodlePoint = (x, z) => ({ x: noodleEntry.x + nc * x + ns * z, z: noodleEntry.z - ns * x + nc * z });
const diner = { ...noodlePoint(0, -1.5), y: 0, yaw: 0.42 }, outsideRestaurant = { ...diner };
assert.equal(restaurant.findEntry(diner), noodleEntry);
const noodlePlan = restaurant.enter(noodleEntry, diner);
assertActivitiesReachable(restaurant, noodlePlan);
assert.equal(noodlePlan.activities[0].kind, 'noodle');
assert.equal(noodlePlan.type, 'shop'); assert.equal(noodlePlan.variant, 'noodles');
assert.equal(noodlePlan.storeId, noodleStore.id); assert(noodlePlan.counter);
assert.equal(noodlePlan.depth, 12); assert(noodlePlan.width >= 6.2 && noodlePlan.width <= 7);
assert.equal(noodlePlan.exit.width, 2);
const noodleLocal = p => ({ x: nc * (p.x - noodleEntry.x) - ns * (p.z - noodleEntry.z), z: ns * (p.x - noodleEntry.x) + nc * (p.z - noodleEntry.z) });
for (const f of noodlePlan.furniture) {
  const local = noodleLocal(f);
  if (['kitchen-pass', 'noodle-station', 'prep-bench'].includes(f.kind)) assert(local.x < -1.05, 'open service kitchen is left of the aisle');
  if (['noodle-table', 'communal-table', 'padded-chair', 'stool', 'banquette'].includes(f.kind)) assert(local.x > 1.05, 'dining furniture is right of the aisle');
  assert(local.z - f.depth / 2 >= 2, 'first two metres by the public door stay clear');
  assert(Math.abs(local.x) - f.width / 2 >= 1.05, 'furniture leaves the full central 2.1m aisle clear');
}
const pass = noodlePlan.furniture.find(f => f.kind === 'kitchen-pass');
assert(pass.depth > 7 && pass.width < 1, 'service pass runs along the left aisle');
const booth = noodleLocal(noodlePlan.furniture.find(f => f.kind === 'banquette'));
assert(booth.z > 9, 'orange booth is at the rear right');
assert(noodleLocal(noodlePlan.counter).x < 0, 'single public service approach is on the left');
assert.equal(noodlePlan.activities.length, 1);
assert(Math.hypot(noodlePlan.activities[0].x - noodlePlan.counter.x, noodlePlan.activities[0].z - noodlePlan.counter.z) < 1e-8);

for (const kind of ['banquette', 'noodle-table', 'padded-chair', 'communal-table', 'stool', 'kitchen-pass', 'noodle-station', 'prep-bench']) {
  assert(noodlePlan.furniture.some(f => f.kind === kind), `restaurant includes ${kind}`);
}
for (const kind of ['noodle-bowl', 'chopsticks', 'condiments']) assert.equal(noodlePlan.details.filter(d => d.kind === kind).length, 4);
assert.equal(noodlePlan.furniture.filter(f => f.kind === 'shelves').length, 0, 'restaurant is distinct from a generic shop');
assert(restaurant.hasLineOfSight(diner, noodlePlan.counter));
function walkDiner(x, z) {
  const target = noodlePoint(x, z), dx = target.x - diner.x, dz = target.z - diner.z;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.3));
  for (let i = 0; i < steps; i++) assert.equal(restaurant.moveActor(diner, dx / steps, dz / steps).blocked, false, 'restaurant aisle and service approach stay clear');
  assert(Math.hypot(diner.x - target.x, diner.z - target.z) < 1e-6);
}
walkDiner(0, 4.2); walkDiner(-0.55, 4.2);
assert(Math.hypot(diner.x - noodlePlan.counter.x, diner.z - noodlePlan.counter.z) < .01);
assert(!restaurant.nearExit(diner));
walkDiner(0, 4.2); walkDiner(0, 10.8); walkDiner(0, 1.65); assert(restaurant.nearExit(diner));
const counterWalker = { ...noodlePoint(-0.55, 4.2) };
assert(restaurant.moveActor(counterWalker, -nc * 3, ns * 3).blocked, 'service pass prevents walking through the kitchen worktop');
const tableWalker = { ...noodlePoint(0, 3.4) };
assert(restaurant.moveActor(tableWalker, nc * 3, -ns * 3).blocked, 'tables and blue chairs share physical collision');
const noodleScene = new THREE.Scene(), noodleView = createInteriorView(noodleScene);
assert.equal(noodleView.stats.meshes, 0);
noodleView.load(noodlePlan);
assert(noodleView.stats.draws <= 2 && noodleView.stats.triangles <= 3000);
const noodleTriangles = noodleView.stats.triangles;
let geometryBytes = 0, noodleDisposed = 0;
noodleScene.traverse(mesh => {
  if (!mesh.isMesh) return;
  for (const attr of Object.values(mesh.geometry.attributes)) {
    assert(attr.array.every(Number.isFinite)); geometryBytes += attr.array.byteLength;
  }
  geometryBytes += mesh.geometry.index?.array.byteLength || 0;
  mesh.geometry.addEventListener('dispose', () => noodleDisposed++);
  assert.equal(mesh.material.map, null, 'original detail needs no image assets or texture allocation');
});
assert(geometryBytes < 400000, 'specialised interior keeps a bounded active geometry allocation');
assert.equal(restaurant.stats.activePlans, 1);
restaurant.leave(diner); noodleView.clear();
assert.equal(noodleDisposed, 1); assert.equal(noodleView.stats.meshes, 0);
assert.deepEqual({ x: diner.x, z: diner.z, y: diner.y, yaw: diner.yaw }, outsideRestaurant);
assert.equal(restaurant.stats.activePlans, 0);
const revisit = restaurant.enter(restaurant.findEntry(diner), diner);
assert.notEqual(revisit, noodlePlan); assert.deepEqual(revisit, noodlePlan);
noodleView.load(revisit); restaurant.reset(diner); noodleView.dispose(); noodleView.dispose();
assert.equal(noodleScene.children.length, 0);
console.log(`PASS lazy interiors: houses; ${baseStores.length} generic shops <=${maximumTriangles} triangles; Civic/four reachable units ${mallTriangles}; source-tied noodle restaurant ${noodleTriangles} triangles / 1 draw, ${geometryBytes} bytes; lazy lifecycle, dishes, aisle/counter collision and disposal`);

// The fictional Kingston gym uses a retained facade with a clear outside approach.
const gymService = { id: 'kingston-gym', type: 'gym', name: 'Kingston gym', x: 607.24, z: 39.78 };
assert.equal(createGymEntry(actualMap, { ...gymService, x: NaN }), null);
assert.equal(createGymEntry({ buildings: [] }, gymService), null);
const gymDoor = createGymEntry(actualMap, gymService);
assert(gymDoor && Object.isFrozen(gymDoor));
assert.equal(gymDoor.buildingId, 'osm-1286498977');
assert.equal(gymDoor.serviceId, 'kingston-gym');
assert.deepEqual(createGymEntry(actualMap, gymService), gymDoor, 'source frontage selection is deterministic');
const gymBuilding = actualMap.buildings.find(b => b.id === gymDoor.buildingId);
const gs = Math.sin(gymDoor.yaw), gc = Math.cos(gymDoor.yaw);
const gymPoint = (x, z) => ({ x: gymDoor.x + gc * x + gs * z, z: gymDoor.z - gs * x + gc * z });
function inside(p, points) {
  let hit = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > p.z) !== (b[1] > p.z) && p.x < (b[0] - a[0]) * (p.z - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
  }
  return hit;
}
assert(inside(gymPoint(0, 0.35), gymBuilding.points), 'gym normal faces into actual source outline');
for (const z of [-0.55, -1.4, -2.8, -4]) for (const x of [-0.65, 0, 0.65]) {
  const p = gymPoint(x, z);
  assert(!actualMap.buildings.some(b => inside(p, b.points)), 'source building does not block the actual exterior approach');
  for (const road of actualMap.roads) {
    if (/^(footway|path|pedestrian|steps|cycleway)$/.test(road.type || '')) continue;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      assert(Math.hypot(p.x - a[0] - t * dx, p.z - a[1] - t * dz) >= (road.width || 6) / 2 + 0.4, 'gym approach is outside a road carriageway');
    }
  }
}
const gym = createInteriors(actualMap, { publicEntries: [gymDoor] });
assert.equal(gym.entries.length, 1); assert.equal(gym.stats.generatedPlans, 0);
assert.equal(createInteriors(actualMap, { publicEntries: [{ ...gymDoor, x: gymDoor.x + 500 }] }).entries.length, 0);
const athlete = { ...gymPoint(0, -1.5), y: 0, yaw: 0.7 }, outsideGym = { ...athlete };
assert.equal(gym.findEntry(gymPoint(0, 1.1)), null);
const gymPlan = gym.enter(gym.findEntry(athlete), athlete);
assert.equal(gymPlan.type, 'gym'); assert.equal(gymPlan.serviceId, 'kingston-gym');
assert(!('storeId' in gymPlan)); assert(gymPlan.counter && gymPlan.exercise);
assertActivitiesReachable(gym, gymPlan);
assert.equal(gymPlan.activities[0].kind, 'bench');
for (const kind of ['exercise-bench', 'bench-rack', 'weight-rack', 'treadmill', 'exercise-mat', 'lockers']) assert(gymPlan.furniture.some(f => f.kind === kind));
assert(Math.hypot(gymPlan.exercise.approachX - gymPlan.activities[0].x, gymPlan.exercise.approachZ - gymPlan.activities[0].z) < 1e-8);
const gymScene = new THREE.Scene(), gymView = createInteriorView(gymScene);
assert.equal(gymView.stats.meshes, 0); gymView.load(gymPlan);
assert.equal(gymView.stats.draws, 1); assert(gymView.stats.triangles < 3000);
const gymTriangles = gymView.stats.triangles;
let gymDisposed = 0;
gymScene.children[0].children[0].geometry.addEventListener('dispose', () => gymDisposed++);
assert(gym.leave(athlete)); gymView.clear(); assert.equal(gymDisposed, 1);
assert.deepEqual({ x: athlete.x, z: athlete.z, y: athlete.y, yaw: athlete.yaw }, outsideGym);
assert.equal(gym.stats.activePlans, 0);
const gymRevisit = gym.enter(gym.findEntry(athlete), athlete); assert.notEqual(gymRevisit, gymPlan); assert.deepEqual(gymRevisit, gymPlan);
gymView.load(gymRevisit); gym.reset(athlete); gymView.dispose(); gymView.dispose();
assert.equal(gymScene.children.length, 0);
console.log(`PASS purposeful interiors: every house/shop/mall/noodle/gym station reachable with player clearance; actual Kingston source door approach; gym ${gymTriangles} triangles / 1 draw; deterministic lazy disposal`);
