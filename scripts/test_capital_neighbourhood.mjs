import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeSource = await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8');
const threeURL = moduleURL(threeSource);
const THREE = await import(threeURL);
const source = await readFile(new URL('../Games/Capital Drive/neighbourhood.js', import.meta.url), 'utf8');
const districtsURL = moduleURL(await readFile(new URL('../Games/Capital Drive/districts.js', import.meta.url), 'utf8'));
const characterURL = moduleURL(await readFile(new URL('../Games/Capital Drive/suburb-character.js', import.meta.url), 'utf8'));
const roadsURL = moduleURL(await readFile(new URL('../Games/Capital Drive/road-network.js', import.meta.url), 'utf8'));
const { createNeighbourhoodDetails } = await import(moduleURL(source.replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./road-network.js', roadsURL).replace('./districts.js', districtsURL).replace('./suburb-character.js', characterURL)));
const house = { id: 'house', type: 'house', height: 4, points: [[-6, 20], [6, 20], [6, 32], [-6, 32], [-6, 20]] };
const base = { roads: [{ id: '1', name: 'Test Street', type: 'residential', width: 8, points: [[-100, 0], [100, 0]] }], buildings: [house], areas: [], landmarks: [], spawn: { x: 0, z: 0 } };
const scene = new THREE.Scene();
const details = createNeighbourhoodDetails(scene, base, () => 0);
assert.equal(details.stats.frontages, 1, 'a real footprint receives frontage details');
assert.equal(details.stats.driveways, 1);
assert.equal(details.stats.doors, 1);
assert.equal(details.entries.length, 1);
assert.equal(details.entries[0].buildingId, 'house');
assert(Math.abs(details.entries[0].z - 19.84) < 0.001, 'entry descriptor matches rendered door, facing actual public street');
assert(details.entries[0].nz > 0.99);
assert(Object.isFrozen(details.entries) && Object.isFrozen(details.entries[0]));
assert.equal(details.stats.backyards, 1);
let gardenVertices = [];
scene.traverse(o => { if (o.name === 'Neighbourhood garden') gardenVertices.push(...Array.from(o.geometry.attributes.position.array).filter((_, i) => i % 3 === 2)); });
assert(gardenVertices.length > 0 && Math.min(...gardenVertices) > 32.5, 'garden lies behind farthest footprint edge, away from public road');
scene.traverse(object => {
  if (!object.isMesh) return;
  for (const attribute of Object.values(object.geometry.attributes)) for (const n of attribute.array) assert.ok(Number.isFinite(n));
});
let first; scene.traverse(o => { if (!first && o.isMesh && o.name === 'Neighbourhood solid') first = o.geometry; });
assert.ok(first.attributes.normal.array[1] > 0, 'driveway front face points upwards');
details.update({ x: 1e6, z: 1e6 });
assert.ok(scene.children[0].children.every(chunk => !chunk.visible));
details.update(base.spawn);
assert.ok(scene.children[0].children.some(chunk => chunk.visible));
details.update({ x: 650, z: 0 });
assert(scene.children[0].children.some(chunk => chunk.visible), 'base frontage remains visible beyond backyard range');
let gardenCulled = false; scene.traverse(o => { if (o.name === 'Nearby gardens') { gardenCulled = true; assert.equal(o.visible, false); } });
assert(gardenCulled, 'rear furniture uses the closer detail range');
details.dispose(); details.dispose(); assert.equal(scene.children.length, 0);
const park = { type: 'park', points: [[-20, 5], [20, 5], [20, 18], [-20, 18]] };
const protectedPark = createNeighbourhoodDetails(scene, { ...base, areas: [park] }, () => 0);
assert.equal(protectedPark.stats.frontages, 0, 'a mapped park blocks a proposed private driveway'); protectedPark.dispose();
const obstacle = { id: 'shed', type: 'shed', points: [[-4, 8], [4, 8], [4, 15], [-4, 15]] };
const blocked = createNeighbourhoodDetails(scene, { ...base, buildings: [house, obstacle] }, () => 0);
assert.equal(blocked.stats.frontages, 0, 'an existing footprint blocks a proposed driveway'); blocked.dispose();
const empty = createNeighbourhoodDetails(scene, { roads: [], buildings: [], areas: [] }, () => 0);
assert.equal(empty.stats.frontages, 0); empty.dispose();
console.log('PASS neighbourhood finite geometry, upward pavement, real frontage, park/building avoidance, culling and disposal');

const shop = { ...house, id: 'shop', type: 'commercial' };
const shoppingMap = { ...base, buildings: [shop], landmarks: [{ id: 'kingston', x: 0, z: 20, radius: 50 }] };
const terrain = (x, z) => x * 0.015 + z * 0.03;
function apronVertices(scene) {
  const vertices = [];
  scene.traverse(mesh => {
    if (mesh.name !== 'Neighbourhood retail-apron') return;
    const p = mesh.geometry.attributes.position, n = mesh.geometry.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      assert([x, y, z, n.getX(i), n.getY(i), n.getZ(i)].every(Number.isFinite));
      assert(n.getY(i) > 0.99, 'paved apron faces upward on sloping terrain');
      assert(Math.abs(y - terrain(x, z) - 0.14) < 1e-5, 'apron follows the supplied terrain height');
      vertices.push([x, z]);
    }
  });
  return vertices;
}
const retail = createNeighbourhoodDetails(scene, shoppingMap, terrain);
assert.equal(retail.stats.retailAprons, 1, 'mapped commercial footprint in a shopping centre receives a broad apron');
assert(retail.stats.pavedArea > 150, 'apron fills the broad setback rather than a narrow driveway');
let paved = apronVertices(scene);
assert(paved.some(p => Math.abs(p[1] - 5.5) < 1e-4), 'apron joins the derived sidewalk');
assert(paved.some(p => p[1] > 19.8), 'apron reaches the facade');
assert(paved.every(p => Math.abs(p[0]) <= 6.01 && p[1] >= 5.49 && p[1] < 20), 'apron remains within the real street-facing edge');
retail.dispose();
const noResidentialPaving = createNeighbourhoodDetails(scene, { ...shoppingMap, buildings: [house] }, terrain);
assert.equal(noResidentialPaving.stats.retailAprons, 0, 'shopping-centre proximity does not pave residential property');
noResidentialPaving.dispose();
const outsideCentre = createNeighbourhoodDetails(scene, { ...shoppingMap, landmarks: [{ id: 'redhill', x: 0, z: 20, radius: 50 }] }, terrain);
assert.equal(outsideCentre.stats.retailAprons, 0, 'treatment remains limited to the two referenced retail centres');
outsideCentre.dispose();
const protectedArea = { type: 'park', points: [[-3, 8], [1, 8], [1, 11], [-3, 11]] };
const apronBlocker = { id: 'blocker', type: 'shed', points: [[2, 14], [5, 14], [5, 17], [2, 17]] };
const crossingRoad = { id: '2', name: 'Service access', type: 'service', width: 2, points: [[-20, 12], [20, 12]] };
const clipped = createNeighbourhoodDetails(scene, { ...shoppingMap, buildings: [shop, apronBlocker], areas: [protectedArea], roads: [...base.roads, crossingRoad] }, terrain);
assert(clipped.stats.retailAprons > 0, 'clear portions can still be paved around obstacles');
paved = apronVertices(scene);
for (const [x, z] of paved) {
  assert(!(x > -3 && x < 1 && z > 8 && z < 11), 'mapped park stays unpaved');
  assert(!(x > 2 && x < 5 && z > 14 && z < 17), 'existing building footprint stays unpaved');
  assert(Math.abs(z - 12) >= 1.34, 'service access road stays clear');
}
clipped.dispose();
console.log('PASS bounded retail aprons: facade-to-sidewalk connection, finite/upward draped surfaces, residential exclusion and road/park/building clipping');

const actualMap = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const actualDetails = createNeighbourhoodDetails(scene, actualMap, terrain);
assert(actualDetails.stats.retailAprons > 10, 'actual Manuka/Kingston commercial footprints receive paving');
assert(actualDetails.stats.apronTriangles <= 18000, 'additional paving has a fixed geometry budget');
const actualPaving = apronVertices(scene);
for (const id of ['manuka', 'kingston']) {
  const centre = actualMap.landmarks.find(l => l.id === id);
  assert(actualPaving.some(p => Math.hypot(p[0] - centre.x, p[1] - centre.z) < 80), `${id} central retail streets receive paving`);
}
console.log('MEASURED neighbourhood', JSON.stringify(actualDetails.stats));
assert(actualDetails.stats.backyards > 100);
assert(actualDetails.stats.backyardTriangles <= 60000);
assert(actualDetails.stats.triangles < 700000, 'whole-map detail increase remains below 13 percent of 622900 baseline');
console.log(`PASS actual map: ${actualDetails.stats.retailAprons} retail footprints, ${actualDetails.stats.apronTriangles} apron triangles, ${Math.round(actualDetails.stats.pavedArea)} square metres`);
actualDetails.dispose();

const { MANUKA_RETAIL_POLYGON, inManukaRetail } = await import(districtsURL);
const western = actualMap.buildings.filter(b => /^(commercial|retail)$/.test(b.type || '') && inManukaRetail(
  b.points.reduce((n, p) => n + p[0], 0) / b.points.length,
  b.points.reduce((n, p) => n + p[1], 0) / b.points.length));
const polygonOnly = createNeighbourhoodDetails(scene, { ...actualMap, landmarks: [], buildings: western }, terrain);
assert(polygonOnly.stats.retailAprons > 5, 'western source retail blocks receive aprons without the misplaced Manuka anchor');
const bounds = MANUKA_RETAIL_POLYGON.reduce((b, p) => ({ minX: Math.min(b.minX, p[0]), maxX: Math.max(b.maxX, p[0]), minZ: Math.min(b.minZ, p[1]), maxZ: Math.max(b.maxZ, p[1]) }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
const westPaving = apronVertices(scene);
assert(westPaving.some(([x, z]) => x > bounds.minX && x < bounds.maxX && z > bounds.minZ && z < bounds.maxZ));
console.log(`PASS source-only western Manuka: ${polygonOnly.stats.retailAprons} retail aprons, ${polygonOnly.stats.apronTriangles} triangles`);
polygonOnly.dispose();
const privateDetails = createNeighbourhoodDetails(scene, { ...base, roads: [{ ...base.roads[0], type: 'service', sourceTags: { service: 'driveway' } }], buildings: [] }, () => 0);
assert.equal(privateDetails.stats.lamps, 0, 'private access receives no street furniture');
assert.equal(privateDetails.stats.stopPoles, 0);
privateDetails.dispose();

const managed = createNeighbourhoodDetails(scene, { ...shoppingMap, shoppingManagedBuildingIds: ['shop'] }, () => 0);
assert.equal(managed.stats.frontages, 0, 'managed shopping geometry suppresses generic doors/signs');
assert.equal(managed.stats.retailAprons, 0); managed.dispose();
const rearPark = { type: 'park', points: [[-20, 33], [20, 33], [20, 48], [-20, 48]] };
const protectedRear = createNeighbourhoodDetails(scene, { ...base, areas: [rearPark] }, () => 0);
assert.equal(protectedRear.stats.backyards, 0, 'public rear park cannot become private garden'); protectedRear.dispose();
const rearRoad = { id: 'rear', name: 'Rear access', type: 'service', points: [[-100, 40], [100, 40]] };
const roadBehind = createNeighbourhoodDetails(scene, { ...base, roads: [...base.roads, rearRoad] }, () => 0);
assert.equal(roadBehind.stats.backyards, 0, 'second road blocks an inferred garden'); roadBehind.dispose();
const apartmentDetails = createNeighbourhoodDetails(scene, { ...base, buildings: [{ ...house, type: 'apartments' }] }, () => 0);
assert.equal(apartmentDetails.stats.backyards, 0, 'apartment footprint never receives a detached-house backyard');
assert.equal(apartmentDetails.stats.apartmentEntries, 1); apartmentDetails.dispose();
const { suburbCharacter, rearGarden } = await import(characterURL);
assert.equal(suburbCharacter({ landmarks: [{ id: 'redhill', x: 0, z: 0 }] }, 20, 20).id, 'redhill');
assert.equal(suburbCharacter({ landmarks: [{ id: 'redhill', x: 0, z: 0 }] }, 2000, 20).id, 'residential');
assert.equal(rearGarden(house, { nx: 0, nz: 1 }, suburbCharacter({}, 0, 0), () => false), null);
console.log('PASS source-frontage entries, bounded rear gardens, public-land/road rejection, managed shops, apartment entries and appearance limits');

const schoolBuilding = { ...house, id: 'school', type: 'education' };
const schoolFixture = { ...base, buildings: [schoolBuilding], landmarks: [{ id: 'telopea', x: 0, z: 26, radius: 100 }] };
const oldSchool = createNeighbourhoodDetails(scene, schoolFixture, () => 0);
const managedSchool = createNeighbourhoodDetails(scene, { ...schoolFixture, campusBuildingIds: ['school'] }, () => 0);
assert(oldSchool.stats.triangles > managedSchool.stats.triangles + 500, 'source campus renderer suppresses the old short frontage fence');
oldSchool.dispose(); managedSchool.dispose();
console.log('PASS managed campus suppresses legacy school fence');
