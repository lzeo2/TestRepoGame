import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = moduleURL(await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8'));
const THREE = await import(threeURL);
const source = await readFile(new URL('../Games/Capital Drive/world-view.js', import.meta.url), 'utf8');
const districtsURL = moduleURL(await readFile(new URL('../Games/Capital Drive/districts.js', import.meta.url), 'utf8'));
const characterURL = moduleURL(await readFile(new URL('../Games/Capital Drive/suburb-character.js', import.meta.url), 'utf8'));
const roadsURL = moduleURL(await readFile(new URL('../Games/Capital Drive/road-network.js', import.meta.url), 'utf8'));
const loadWorld = async text => import(moduleURL(text.replace('../../assets/car-arcade/vendor/three.module.js', threeURL).replace('./road-network.js', roadsURL).replace('./districts.js', districtsURL).replace('./suburb-character.js', characterURL).replace('./terrain.js', moduleURL(await readFile(new URL('../Games/Capital Drive/terrain.js',import.meta.url),'utf8')))));
const { createWorldView } = await loadWorld(source);
globalThis.document = { createElement: () => ({ getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, fillRect() {}, strokeRect() {}, fillText() {} }) }) };
const polygons = [ [[20, 20], [60, 20], [60, 35], [40, 35], [40, 60], [20, 60]], [[100, 20], [130, 20], [130, 45], [100, 45]] ];
const heights = [];
for (let z = 0; z < 5; z++) for (let x = 0; x < 5; x++) heights.push(x + z * 2);
const map = { bounds: { minX: 0, maxX: 200, minZ: 0, maxZ: 200 }, terrain: { minX: 0, maxX: 200, minZ: 0, maxZ: 200, cols: 5, rows: 5, heights }, roads: [{ id: 'street', name: 'Test Street', width: 8, type: 'residential', points: [[0, 100], [200, 100]] }], buildings: polygons.map((points, i) => ({ id: `house${i}`, type: 'house', points, height: i ? 7 : 4 })), areas: [], landmarks: [], spawn: { x: 80, z: 100 } };
const scene = new THREE.Scene(), view = createWorldView(scene, map);
assert.equal(view.heightAt(50, 150), 7);
assert.equal(view.heightAt(-5, -5), 0);
assert.equal(view.heightAt(250, 250), 12);
assert.equal(view.stats.texturedBuildings, 2);
assert.ok(view.stats.windows > 20, 'upper storeys have regular window bays');
function inside(x, z, points) { let result = false; for (let i = 0, j = points.length - 1; i < points.length; j = i++) { const a = points[i], b = points[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result; } return result; }
let roofs = 0, roadSamples = 0;
scene.traverse(object => {
  if (!object.isMesh) return;
  for (const attribute of Object.values(object.geometry.attributes)) for (const n of attribute.array) assert.ok(Number.isFinite(n));
  const p = object.geometry.attributes.position.array, kinds = object.geometry.attributes.surfaceKind;
  for (let i = 0; i < p.length; i += 9) {
    const x = (p[i] + p[i + 3] + p[i + 6]) / 3, z = (p[i + 2] + p[i + 5] + p[i + 8]) / 3;
    if (kinds && kinds.array[i / 3] === 2) { roofs++; assert.ok(polygons.some(poly => inside(x, z, poly)), 'concave roof triangle stays inside its real footprint'); }
    if (object.name === 'Canberra road') { roadSamples++; assert.ok((p[i + 1] + p[i + 4] + p[i + 7]) / 3 - view.heightAt(x, z) > 0.02, 'asphalt remains above sampled terrain'); }
  }
});
assert.ok(roofs > 20 && roadSamples > 0);
view.update({ x: 1e6, z: 1e6 }); assert.ok(scene.children[0].children.every(chunk => !chunk.visible));
view.update(map.spawn); assert.ok(scene.children[0].children.some(chunk => chunk.visible));
view.dispose(); view.dispose(); assert.equal(scene.children.length, 0);
// A dense DEM retains exact bilinear sampling without mandatory subdivision.
const dense = { ...map, bounds: { minX: 0, maxX: 32, minZ: 0, maxZ: 32 }, terrain: { minX: 0, maxX: 32, minZ: 0, maxZ: 32, cols: 33, rows: 33, heights: Array.from({ length: 1089 }, (_, i) => i % 33 * 0.1 + Math.floor(i / 33) * 0.2) }, roads: [], buildings: [] };
const denseView = createWorldView(scene, dense);
assert.ok(Math.abs(denseView.heightAt(12.5, 15.5) - 4.35) < 1e-9);
denseView.dispose();
console.log('PASS world bilinear DEM, multistorey facade, concave roof containment, asphalt clearance, finite geometry, culling and disposal');

// Keep the real complex heritage footprint as a regression for facade order.
const actual = JSON.parse(await readFile(new URL('../Games/Capital Drive/data/canberra.json', import.meta.url), 'utf8'));
const mainSchool = actual.buildings.find(b => b.id === 'act-101001-0');
assert.ok(mainSchool, 'the verified ACT main school footprint remains available');
const schoolAnchor = actual.landmarks.find(l => l.id === 'telopea');
const schoolRoads = actual.roads.filter(r => r.name === 'New South Wales Crescent');
const schoolMap = { bounds: { minX: schoolAnchor.x - 250, maxX: schoolAnchor.x + 250, minZ: schoolAnchor.z - 250, maxZ: schoolAnchor.z + 250 }, roads: schoolRoads, buildings: [mainSchool], areas: [], landmarks: [schoolAnchor], spawn: schoolAnchor };
const schoolView = createWorldView(scene, schoolMap);
const footprint = mainSchool.points.slice(0, -1);
const signedArea = footprint.reduce((sum, a, i) => { const b = footprint[(i + 1) % footprint.length]; return sum + a[0] * b[1] - b[0] * a[1]; }, 0);
const windows = [], arches = [], archColor = new THREE.Color(0xeee9d8);
scene.traverse(object => {
  if (!object.isMesh) return;
  const p = object.geometry.attributes.position.array, n = object.geometry.attributes.normal, c = object.geometry.attributes.color;
  for (let i = 0; i < p.length; i += 9) {
    const triangle = { x: (p[i] + p[i + 3] + p[i + 6]) / 3, z: (p[i + 2] + p[i + 5] + p[i + 8]) / 3, y: (p[i + 1] + p[i + 4] + p[i + 7]) / 3, nx: n.getX(i / 3), nz: n.getZ(i / 3) };
    if (object.name === 'Canberra detail') windows.push(triangle);
    if (object.name === 'Canberra solid' && c && Math.abs(c.getX(i / 3) - archColor.r) <= 0.5 / 255 + 1e-6 && Math.abs(c.getY(i / 3) - archColor.g) <= 0.5 / 255 + 1e-6 && Math.abs(c.getZ(i / 3) - archColor.b) <= 0.5 / 255 + 1e-6) arches.push(triangle);
  }
});
let checkedSides = 0;
for (let i = 0; i < footprint.length; i++) {
  const a = footprint[i], b = footprint[(i + 1) % footprint.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length < 6) continue;
  const ex = (b[0] - a[0]) / length, ez = (b[1] - a[1]) / length, nx = signedArea > 0 ? ez : -ez, nz = signedArea > 0 ? -ex : ex;
  const onSide = windows.filter(p => {
    const along = (p.x - a[0]) * ex + (p.z - a[1]) * ez, offset = (p.x - a[0]) * nx + (p.z - a[1]) * nz;
    return along > 0.2 && along < length - 0.2 && offset > 0.025 && offset < 0.085 && p.nx * nx + p.nz * nz > 0.95;
  });
  assert.ok(onSide.some(p => p.y < 3.5), `school facade ${i} retains ground floor windows`);
  assert.ok(onSide.some(p => p.y > 4), `school facade ${i} retains upper floor windows`);
  checkedSides++;
}
assert.ok(checkedSides > 10);
assert.ok(schoolView.stats.windows <= 120, 'school facade redistribution stays within its existing window budget');
assert.ok(arches.length > 50, 'main school retains its distinctive arched window group');
const arch = arches.reduce((sum, p) => ({ x: sum.x + p.x / arches.length, z: sum.z + p.z / arches.length, nx: sum.nx + p.nx / arches.length, nz: sum.nz + p.nz / arches.length }), { x: 0, z: 0, nx: 0, nz: 0 });
let closest = null;
for (const road of schoolRoads) for (let i = 1; i < road.points.length; i++) {
  const a = road.points[i - 1], b = road.points[i], dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((arch.x - a[0]) * dx + (arch.z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  const x = a[0] + t * dx, z = a[1] + t * dz, distance = Math.hypot(x - arch.x, z - arch.z);
  if (!closest || distance < closest.distance) closest = { x, z, distance };
}
assert.ok((closest.x - arch.x) * arch.nx + (closest.z - arch.z) * arch.nz > closest.distance * 0.35, 'arched window normals face actual NSW Crescent');
schoolView.dispose();
console.log(`PASS actual ACT school: ${checkedSides} long facades have both window rows; ${schoolView.stats.windows} windows; arches face NSW Crescent`);

const { inManukaRetail, MANUKA_RETAIL_POLYGON } = await import(districtsURL);
const centre = MANUKA_RETAIL_POLYGON.reduce((sum, p) => [sum[0] + p[0] / 8, sum[1] + p[1] / 8], [0, 0]);
assert(inManukaRetail(...centre), 'source Manuka retail centre is classified');
assert(inManukaRetail(...MANUKA_RETAIL_POLYGON[0]), 'source polygon boundary is included');
assert(!inManukaRetail(0, 0) && !inManukaRetail(NaN, 0), 'classification is bounded and rejects invalid positions');
const westernShops = actual.buildings.filter(b => /^(commercial|retail)$/.test(b.type || '') && inManukaRetail(
  b.points.reduce((n, p) => n + p[0], 0) / b.points.length,
  b.points.reduce((n, p) => n + p[1], 0) / b.points.length));
assert(westernShops.length > 10, 'real western shop blocks receive Manuka treatment');
const drives = [0, 12].map((z, i) => ({ id: `drive-${i}`, type: 'service', width: 8.5, sourceTags: { service: 'driveway' }, points: [[0, z], [100, z]] }));
const driveMap = { bounds: { minX: -20, maxX: 120, minZ: -20, maxZ: 32 }, roads: drives, buildings: [], areas: [] };
const originalDrives = JSON.stringify(drives);
const driveView = createWorldView(scene, driveMap);
assert.equal(driveView.stats.roadSegments, 2, 'both parallel real road runs remain');
let asphaltVertices = 0;
scene.traverse(mesh => {
  if (!mesh.isMesh) return;
  assert.notEqual(mesh.name, 'Canberra pavement', 'private driveway adds no kerbs, footpaths or markings');
  if (mesh.name !== 'Canberra road') return;
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i);
    assert(Math.min(Math.abs(z), Math.abs(z - 12)) <= 1.601, 'asphalt and bend caps use the narrow shared drive width');
    asphaltVertices++;
  }
});
assert(asphaltVertices > 0);
assert.equal(JSON.stringify(drives), originalDrives, 'rendering preserves geographic source');
driveView.dispose();
console.log(`PASS source Manuka polygon: ${westernShops.length} retail footprints; narrow parallel driveway ribbons/caps and no invented pavement`);

const apartmentView = createWorldView(scene, { ...map, buildings: [{ ...map.buildings[1], type: 'apartments', height: 12 }] });
assert(apartmentView.stats.balconies > 0, 'source apartment type and upper storeys receive balcony rhythm');
assert(apartmentView.stats.balconies <= 3000, 'balconies share a fixed citywide allowance');
apartmentView.dispose();
const detachedView = createWorldView(scene, { ...map, buildings: [{ ...map.buildings[1], type: 'house', height: 4 }] });
assert.equal(detachedView.stats.balconies, 0, 'ordinary houses retain their own facade treatment');
detachedView.dispose();
console.log('PASS apartment upper-storey balcony rhythm, fixed allowance and detached-house exclusion');


// A float reference changes only attribute storage, so positions, UVs, triangle
// order and all source geometry must stay identical to the compact production view.
const floatSource = source.replace(/function compactAttribute\([\s\S]*?\n}\n/, 'function compactAttribute(values, itemSize) { return new THREE.Float32BufferAttribute(values, itemSize); }\n');
assert.notEqual(floatSource, source);
const { createWorldView: createFloatWorld } = await loadWorld(floatSource);
const compactScene = new THREE.Scene(), floatScene = new THREE.Scene();
const compactView = createWorldView(compactScene, map), floatView = createFloatWorld(floatScene, map);
const meshes = scene => { const result = []; scene.traverse(o => { if (o.isMesh) result.push(o); }); return result; };
const compactMeshes = meshes(compactScene), floatMeshes = meshes(floatScene);
assert.equal(compactMeshes.length, floatMeshes.length);
let compactBytes = 0, floatBytes = 0;
for (let i = 0; i < compactMeshes.length; i++) {
  assert.equal(compactMeshes[i].name, floatMeshes[i].name);
  for (const [name, attribute] of Object.entries(compactMeshes[i].geometry.attributes)) {
    const reference = floatMeshes[i].geometry.attributes[name];
    compactBytes += attribute.array.byteLength; floatBytes += reference.array.byteLength;
    assert.equal(attribute.count, reference.count); assert.equal(attribute.itemSize, reference.itemSize);
    if (name === 'normal' || name === 'color') {
      assert(attribute.array instanceof (name === 'normal' ? Int8Array : Uint8Array));
      assert.equal(attribute.normalized, true);
      const tolerance = name === 'normal' ? 0.5 / 127 : 0.5 / 255;
      for (let v = 0; v < attribute.count; v++) for (let c = 0; c < attribute.itemSize; c++) {
        assert(Math.abs(attribute.getComponent(v, c) - reference.getComponent(v, c)) <= tolerance + 1e-7, `${name} component precision stays within half a byte step`);
      }
    } else {
      assert.deepEqual(Array.from(attribute.array), Array.from(reference.array), `${name} remains exact`);
      if (name === 'surfaceKind') { assert(attribute.array instanceof Uint8Array); assert.equal(attribute.normalized, false); }
    }
  }
}
assert(compactBytes < floatBytes * 0.65, 'compact lighting attributes materially reduce retained buffers');
assert.equal(compactView.stats.triangles, floatView.stats.triangles);
compactView.dispose(); floatView.dispose();
console.log(`PASS compact world attributes: exact positions/UV/kinds/triangles, bounded lighting precision, ${floatBytes}→${compactBytes} bytes`);

const closedOuter = [[0,0],[20,0],[20,20],[0,20],[0,0]], closedHole = [[5,5],[15,5],[15,15],[5,15],[5,5]];
const waterView = createWorldView(scene, { bounds: { minX: 0, maxX: 20, minZ: 0, maxZ: 20 }, roads: [], buildings: [], areas: [{ id: 'hole-water', type: 'water', points: closedOuter, innerRings: [{ points: closedHole }] }] });
let waterArea = 0, waterFaces = 0;
scene.traverse(mesh => {
  if (mesh.name !== 'Canberra water') return;
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i += 3) {
    const a = [p.getX(i),p.getZ(i)], b = [p.getX(i+1),p.getZ(i+1)], c = [p.getX(i+2),p.getZ(i+2)];
    waterArea += Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2;
    assert(!inside((a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,closedHole), 'water never fills its island hole'); waterFaces++;
  }
});
assert(waterFaces > 0); assert.equal(waterArea, 300, 'closed 20m square minus closed 10m island conserves exactly 300 square metres'); waterView.dispose();
const bridgeMap = { bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, terrain: { minX: -20, maxX: 20, minZ: -20, maxZ: 20, cols: 2, rows: 2, heights: [0,0,0,0] }, roads: [{ id: 'deck', type: 'primary', width: 8, points: [[-20,0],[20,0]], sourceTags: { bridge: 'yes' } }], bridgeDecks: [{ roadId: 'deck', heights: [20,20] }], buildings: [], areas: [] };
const bridgeView = createWorldView(scene, bridgeMap);
assert.equal(bridgeView.groundHeightAt(0,0), 0); assert.equal(bridgeView.heightAt(0,0), 20);
let bridgeGround = 0;
scene.traverse(mesh => {
  const kind = mesh.geometry?.attributes.surfaceKind, p = mesh.geometry?.attributes.position;
  if (!kind) return;
  for (let i = 0; i < p.count; i++) if (kind.getX(i) === 3) { assert(Math.abs(p.getY(i) + 0.18) < 1e-6, 'bridge deck cannot lift ground terrain'); bridgeGround++; }
});
assert(bridgeGround > 0); bridgeView.dispose();
console.log('PASS closed water outer/hole area conservation and bridge-independent ground terrain');
