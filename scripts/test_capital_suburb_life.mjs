Error.stackTraceLimit = 3;
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const url = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const read = file => readFile(new URL(file, import.meta.url), 'utf8');
const threeURL = url(await read('../assets/car-arcade/vendor/three.module.js'));
const THREE = await import(threeURL);
const roadURL = url(await read('../Games/Capital Drive/road-network.js'));
const characterURL = url(await read('../Games/Capital Drive/suburb-character.js'));
const waterURL = url(await read('../Games/Capital Drive/water-contact.js'));
const { suburbCharacter } = await import(characterURL);
const { createWildlifeView, RED_HILL_HABITAT } = await import(url((await read('../Games/Capital Drive/wildlife-view.js')).replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./road-network.js', roadURL)));
const { createNeighbourhoodDetails } = await import(url((await read('../Games/Capital Drive/neighbourhood.js')).replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./road-network.js', roadURL).replace('./suburb-character.js', characterURL).replace('./water-contact.js', waterURL).replace('./districts.js', url(await read('../Games/Capital Drive/districts.js')))));
const actual = JSON.parse(await read('../Games/Capital Drive/data/canberra.json'));
assert.equal(actual.buildings.length, 12572);
const before = JSON.stringify(actual);
for (const [suburb, expected] of [['RED HILL', 'redhill'], ['NARRABUNDAH', 'narrabundah'], ['GRIFFITH', 'griffith']]) {
  const building = actual.buildings.find(b => b.suburb === suburb);
  assert(building && building.source === 'act');
  assert.equal(suburbCharacter(actual, 1e6, 1e6, building).id, expected, 'exact sourced district outranks distance from an anchor');
}
assert.equal(suburbCharacter({ landmarks: [{ id: 'narrabundah', x: 0, z: 0 }] }, 30, 30).id, 'narrabundah');
assert.equal(suburbCharacter({}, 0, 0).id, 'residential');
const rh = suburbCharacter({}, 0, 0, { suburb: 'RED HILL' }), nb = suburbCharacter({}, 0, 0, { suburb: 'NARRABUNDAH' });
assert(rh.gardenDepth > nb.gardenDepth && rh.fenceHeight < nb.fenceHeight);
const scene = new THREE.Scene();
const wildlife = createWildlifeView(scene, actual, (x, z) => x * 0.01 + z * 0.02);
assert.equal(RED_HILL_HABITAT.points.length, 199);
assert.equal(actual.meta.sourceHashes[RED_HILL_HABITAT.sourceFile], RED_HILL_HABITAT.sourceHash);
assert(wildlife.animals.length >= 6 && wildlife.animals.length <= 12, 'actual clipped reserve supports small mobs');
assert(wildlife.animals.every(a => a.habitatId === RED_HILL_HABITAT.id));
assert.equal(wildlife.stats.meshes, 1); assert(wildlife.stats.trianglesPerAnimal <= 300); assert(wildlife.stats.bufferBytes < 40000);
function inside(x, z, points) {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
const { roadProfile } = await import(roadURL);
function distance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}
for (const a of wildlife.animals) {
  assert(inside(a.x, a.z, RED_HILL_HABITAT.points));
  assert(a.x >= actual.bounds.minX + 5 && a.z <= actual.bounds.maxZ - 5);
  assert.equal(a.y, a.x * 0.01 + a.z * 0.02);
  for (const building of actual.buildings) assert(!inside(a.x, a.z, building.points));
  for (const area of actual.areas.filter(a => /water|pitch|recreation_ground|golf/.test(a.type))) assert(!inside(a.x, a.z, area.points));
  for (const road of actual.roads) for (let i = 1; i < road.points.length; i++) assert(distance(a.x, a.z, road.points[i - 1], road.points[i]) >= roadProfile(road).driveWidth / 2 + 5 - 1e-8);
}
const mesh = scene.children[0].children[0];
for (const attribute of Object.values(mesh.geometry.attributes)) assert(Array.from(attribute.array).every(Number.isFinite));
wildlife.update(wildlife.animals[0], 0); assert(wildlife.stats.visible > 0 && wildlife.stats.animated > 0);
const first = Array.from(mesh.instanceMatrix.array);
wildlife.update(wildlife.animals[0], 0); assert.deepEqual(Array.from(mesh.instanceMatrix.array), first, 'zero supplied dt leaves pose stationary');
wildlife.update(wildlife.animals[0], 0.1); wildlife.update(wildlife.animals[0], 0);
assert.notDeepEqual(Array.from(mesh.instanceMatrix.array), first, 'near pose responds to supplied dt');
wildlife.update({ x: 1e6, z: 1e6 }, 100); assert.equal(wildlife.stats.visible, 0); assert.equal(wildlife.stats.animated, 0); assert.equal(mesh.visible, false);
wildlife.dispose(); wildlife.dispose(); assert.equal(scene.children.length, 0);
assert.equal(JSON.stringify(actual), before, 'source roads/footprints unchanged');
const empty = createWildlifeView(scene, { areas: [{ id: 'school-grass', type: 'grass', name: '', points: [[0, 0], [100, 0], [100, 100], [0, 100]] }] }, () => 0);
assert.equal(empty.animals.length, 0, 'unidentified grass/school grounds never become a reserve'); empty.dispose();
const habitat = { id: 'reserve', type: 'nature_reserve', name: 'Red Hill Nature Reserve', points: [[0, 0], [200, 0], [200, 200], [0, 200]] };
const blocked = createWildlifeView(scene, { areas: [habitat, { type: 'water', points: habitat.points }] }, () => 0);
assert.equal(blocked.animals.length, 0); blocked.dispose();
// Existing source frontage corridor stays open between each district's split walls.
const house = { id: 'act-fixture', type: 'house', source: 'act', points: [[-6, 20], [6, 20], [6, 32], [-6, 32], [-6, 20]] };
for (const suburb of ['RED HILL', 'NARRABUNDAH']) {
  const map = { roads: [{ id: '1', type: 'residential', name: 'Fixture Street', points: [[-100, 0], [100, 0]] }], buildings: [{ ...house, suburb }], areas: [] };
  const details = createNeighbourhoodDetails(scene, map, () => 0, { lowGraphics: true });
  assert.equal(details.stats.driveways, 1); assert.equal(details.stats.doors, 1); assert.equal(details.stats.backyards, 1);
  const entry = details.entries[0]; assert(Math.abs(entry.x) < 6 && entry.z < 20 && entry.nz > 0.99);
  scene.traverse(o => {
    if (o.name !== 'Neighbourhood solid') return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const triangle = [i, i + 1, i + 2];
      const minY = Math.min(...triangle.map(j => p.getY(j))), minZ = Math.min(...triangle.map(j => p.getZ(j))), maxZ = Math.max(...triangle.map(j => p.getZ(j)));
      if (minY < 0.2 || minZ > 18 || maxZ < 6) continue;
      assert(triangle.every(j => Math.abs(p.getX(j) - entry.x) > 1.6), 'raised frontage walls leave driveway/door corridor clear');
    }
  });
  details.dispose();
}
console.log(`PASS suburb life: actual ACT district attributes, unchanged 12572 footprints, open driveway/door slots, ${wildlife.animals.length} source-reserve kangaroos, road/building/water avoidance, one bounded instanced draw, supplied dt, culling/disposal`);
