import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const moduleURL = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const threeURL = moduleURL(await readFile(new URL('../assets/car-arcade/vendor/three.module.js', import.meta.url), 'utf8'));
const THREE = await import(threeURL);
const source = await readFile(new URL('../Games/Capital Drive/world-view.js', import.meta.url), 'utf8');
const { createWorldView } = await import(moduleURL(source.replace('../../assets/car-arcade/vendor/three.module.js', threeURL)));
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
