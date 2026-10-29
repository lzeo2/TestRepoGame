// node --experimental-vm-modules scripts/citisten_user_render_repair_check.mjs
// CPU only: actual world/GLBs/matrices, renderer and bitmap-decoding doubles.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import * as THREE from '../Games/Citisten3D/vendor/three.module.js';
import { GLTFLoader } from '../Games/Citisten3D/vendor/GLTFLoader.js';
import * as utils from '../Games/Citisten3D/vendor/BufferGeometryUtils.js';
import { createRiverTerrain } from '../Games/Citisten3D/river-data.mjs';
import { RoadGrid } from '../Games/Citisten3D/roads.mjs';
import { initialTownPose } from '../Games/Citisten3D/camera.mjs';
import { createDayNight } from '../Games/Citisten3D/daynight.mjs';

assert(vm.SourceTextModule, 'Use --experimental-vm-modules');
const root = new URL('../Games/Citisten3D/', import.meta.url), origin = 'https://citisten.invalid';
const old = name => execFileSync('git', ['show', `017e4a47e6235917ee21c46d221caa230855615f:Games/Citisten3D/${name}`], { encoding: 'utf8' });
const nativeFetch = globalThis.fetch, createURL = URL.createObjectURL.bind(URL), revokeURL = URL.revokeObjectURL.bind(URL);
const blobs = new Map(); let nextBlob = 0, requests = 0, images = 0;
globalThis.self = globalThis;
globalThis.createImageBitmap = async blob => {
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  images++;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), close() { images--; } };
};
URL.createObjectURL = blob => { const key = `blob:${origin}/${nextBlob++}`; blobs.set(key, createURL(blob)); return key; };
URL.revokeObjectURL = key => { revokeURL(blobs.get(key) || key); blobs.delete(key); };
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  if (url.protocol === 'blob:') { assert(blobs.has(url.href)); return nativeFetch(blobs.get(url.href)); }
  assert.equal(url.origin, origin); assert.equal(options.redirect, 'error');
  assert(url.pathname.startsWith('/Games/Citisten3D/models/'));
  requests++; return new Response(await readFile(new URL(url.pathname.slice('/Games/Citisten3D/'.length), root)));
};
class Target extends EventTarget { clientWidth = 1367; clientHeight = 910; setPointerCapture() {} }
class RendererDouble {
  shadowMap = {};
  setPixelRatio() {}
  setSize() {}
  render(scene, camera) { scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); }
  dispose() {}
}
async function fixture(baseline) {
  const context = vm.createContext({ URL, fetch: globalThis.fetch, TextDecoder, DataView, Uint8Array, console,
    window: new Target(), HTMLElement: class {}, devicePixelRatio: 1.5 });
  const modules = new Map();
  for (const [key, exports] of Object.entries({ 'vendor/three.module.js': { ...THREE, WebGLRenderer: RendererDouble },
    'vendor/GLTFLoader.js': { GLTFLoader }, 'vendor/BufferGeometryUtils.js': utils })) {
    modules.set(key, new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context, identifier: key }));
  }
  async function load(key) {
    if (modules.has(key)) return modules.get(key);
    // Only the material adapter differs: same geometry, pose and renderer state.
    const text = baseline && key === 'external-materials.mjs' ? old(key) : await readFile(new URL(key, root), 'utf8');
    const module = new vm.SourceTextModule(text, { context, identifier: key,
      initializeImportMeta(meta) { meta.url = `${origin}/Games/Citisten3D/${key}`; } });
    modules.set(key, module);
    await module.link((specifier, parent) => load(new URL(specifier, `${origin}/Games/Citisten3D/${parent.identifier}`).pathname.slice('/Games/Citisten3D/'.length)));
    return module;
  }
  const module = await load('world.mjs'); await module.evaluate();
  const canvas = new Target(), world = module.namespace.createWorld(canvas, { size: 200 }); await world.ready;
  return { world, canvas };
}
const viewports = [[1367, 910], [1280, 800], [1024, 768], [854, 569], [390, 844]];
const oldPose = vm.runInNewContext(old('camera.mjs').replace(/^import .*\n/, '').split('export function createFreeCamera')[0].replace('export function', 'function') + '\ninitialTownPose');
function cameraAt(pose, width, height) {
  const camera = new THREE.PerspectiveCamera(60, width / height, .5, 5000);
  camera.rotation.order = 'YXZ'; camera.position.set(pose.x, pose.y, pose.z); camera.rotation.set(pose.pitch, pose.yaw, 0);
  camera.updateMatrixWorld(); return camera;
}
// Window-depth is affine over a projected triangle. OpenGL polygon offset adds
// factor * max(abs(dz/dx), abs(dz/dy)) + units * r before the depth comparison.
// D24 r=1/(2^24-1) is an explicit model, NOT a queried framebuffer format.
function depthSamples(world, width, height, ratio) {
  const ground = world.scene.children.find(n => Array.isArray(n.material) && n.material[0]?.name.endsWith('__grass'));
  assert(ground && !ground.castShadow && ground.receiveShadow);
  assert.equal(world.water.mesh.position.y, -.4);
  const water = world.water.mesh.material;
  assert(!water.transparent && water.depthWrite && water.depthTest && !water.polygonOffset);
  const geometry = ground.geometry, positions = geometry.attributes.position, d24 = 2 ** 24 - 1;
  assert.equal(geometry.groups.reduce((sum, g) => sum + g.count, 0), geometry.index.count);
  const rows = [];
  for (const group of geometry.groups) for (let i = group.start; i < group.start + group.count; i += 3) {
    const vertices = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(positions, geometry.index.getX(i + j)).applyMatrix4(ground.matrixWorld));
    if (!vertices.every(v => v.y === 0)) continue;
    const material = ground.material[group.materialIndex];
    assert(!material.transparent && material.depthWrite && material.depthTest);
    const projected = vertices.map(v => v.clone().project(world.camera)).map(v => new THREE.Vector3((v.x + 1) * width * ratio / 2, (v.y + 1) * height * ratio / 2, (v.z + 1) / 2));
    const e = projected[1].clone().sub(projected[0]), f = projected[2].clone().sub(projected[0]), determinant = e.x * f.y - f.x * e.y;
    const slope = Math.max(Math.abs((e.z * f.y - f.z * e.y) / determinant), Math.abs((e.x * f.z - f.x * e.z) / determinant));
    for (const t of [.1, .5, .9]) {
      const point = vertices[0].clone().lerp(vertices[1], t).lerp(vertices[2], .1), ndc = point.clone().project(world.camera);
      if (Math.abs(ndc.x) > .9 || Math.abs(ndc.y) > .9 || Math.abs(ndc.z) >= 1) continue;
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), world.camera);
      const hit = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), .4), new THREE.Vector3());
      assert(hit && Math.abs(hit.x) < 3000 && Math.abs(hit.z) < 3000, 'underlying actual water extent');
      const gap = (hit.project(world.camera).z - ndc.z) / 2;
      assert(gap > 0, 'unbiased dry land is in front of water');
      const bias = material.polygonOffset ? material.polygonOffsetFactor * slope + material.polygonOffsetUnits / d24 : 0;
      rows.push({ triangle: i / 3, point: point.toArray(), gapD24: gap * d24, biasD24: bias * d24,
        reversed: bias > gap + 1 / d24 }); // more than one quantization step, not a rounding tie
    }
  }
  return rows;
}
const reports = [];
for (const baseline of [true, false]) {
  const { world, canvas } = await fixture(baseline); world.setTerrain('river-v1');
  world.buildings.spawn('townhall', { x: 0, z: 0 });
  const hallBounds = new THREE.Box3(); let hallParts = 0;
  world.scene.traverse(node => {
    if (!node.isInstancedMesh || !node.material.name.startsWith('town_hall__')) return;
    node.geometry.computeBoundingBox(); hallBounds.union(node.geometry.boundingBox); hallParts++;
  });
  assert(hallParts > 0, 'actual supplied hall geometry was inspected');
  assert(hallBounds.min.x >= -9.001 && hallBounds.max.x <= 9.001 && hallBounds.min.z >= -7.501 && hallBounds.max.z <= 7.501);
  assert(hallBounds.min.y >= -.001 && hallBounds.max.y <= 17, 'tested roof envelope contains actual GLB');
  console.log(`ACTUAL HALL ${baseline ? 'old' : 'new'}:`, hallBounds.min.toArray(), hallBounds.max.toArray(), `${hallParts} material batches`);
  const cases = [];
  for (const [width, height] of viewports) for (const ratio of [1, 1.5]) {
    canvas.clientWidth = width; canvas.clientHeight = height;
    world.controls.setPose(oldPose(world.roads, world.riverTerrain, width, height), true); world.render(0);
    const rows = depthSamples(world, width, height, ratio), reversed = rows.filter(row => row.reversed);
    assert(rows.length > 0);
    if (baseline) assert(reversed.length > 0, 'old adapter must violate dry-land occlusion');
    else assert.equal(reversed.length, 0, 'fixed terrain must preserve dry-land occlusion');
    cases.push({ viewport: `${width}x${height}@${ratio}`, samples: rows.length, reversed: reversed.length, example: reversed[0] });
  }
  reports.push(cases); world.dispose();
}
assert.equal(images, 0); assert.equal(blobs.size, 0);
console.log('DEPTH OLD/NEW', JSON.stringify(reports));

// Execute the actual world boundary with a seed-metadata generator double so
// this leaf check is independent of the parallel generator implementation.
function seedBoundary(source) {
  let riverData = { layout: 'legacy-flat' }, builds = 0;
  const calls = [], geometry = () => ({ attributes: { uv: { clone() {} } }, setAttribute() {}, dispose() {} });
  const context = { disposed: false, size: 200, extent: 1000, terrain: null, terrainModel: null,
    groundGeometry: geometry(), ground: {}, gridLines: {}, roadPool: { setTerrain() { builds++; } },
    createRiverTerrain(size, layout, seed) { calls.push([size, layout, seed]); return { layout, seed }; },
    createPlayableGroundGeometry: geometry, applyTerrainMaterials() {}, riverData };
  const body = source.slice(source.indexOf('  function setTerrain(layout'), source.indexOf('  const ready ='));
  vm.createContext(context); vm.runInContext(body + '\nthis.setTerrain = setTerrain;', context);
  const a = context.setTerrain('river-v1', 7), same = context.setTerrain('river-v1', 7);
  const b = context.setTerrain('river-v1', 8), zero = context.setTerrain('river-v1', 0);
  const legacy = context.setTerrain('river-v1'), sameLegacy = context.setTerrain('river-v1');
  assert.equal(a, same, 'same layout/seed identity');
  assert.equal(legacy, sameLegacy, 'omitted seed retains legacy cache identity');
  return { changes: a !== b && b !== zero && zero !== legacy, builds, calls };
}
assert.equal(seedBoundary(old('world.mjs')).changes, false, 'old world ignores seed');
const seed = seedBoundary(await readFile(new URL('world.mjs', root), 'utf8'));
assert(seed.changes); assert.equal(seed.builds, 4); assert.deepEqual(seed.calls.map(c => c[2]), [7, 7, 8, 0, undefined, undefined]);

const clock = createDayNight(new THREE.Scene());
for (const value of [NaN, Infinity, -Infinity, undefined, '0']) assert.throws(() => clock.isSettled(value), RangeError);
let clockCases = 0;
for (const hz of [60, 120]) for (const [from, to] of [[.5, .27], [.48, 0], [.98, .02], [.02, .98], [.5, 0]]) {
  clock.setPhase(from); assert(!clock.isSettled(to)); let frames = 0;
  while (!clock.isSettled(to) && frames++ < hz * 7) assert.equal(clock.approach(to, 1 / hz), clock.daylight);
  assert(clock.isSettled(to)); assert(frames <= Math.ceil(.5 / .08 * hz) + 1);
  const phase = clock.phase; clock.approach(to, 0); assert.equal(clock.phase, phase); clockCases++;
}
clock.setPhase(.5); assert(clock.isSettled(1.5)); assert(clock.isSettled(-.5));
assert(clock.isSettled(.5 + 5e-10)); assert(!clock.isSettled(.5 + 2e-9)); clock.dispose();

let fits = 0; const hallMetrics = [];
for (let size = 12; size <= 200; size++) for (const layout of ['legacy-flat', 'river-v1']) {
  const roads = new RoadGrid(size), terrain = createRiverTerrain(size, layout), mid = Math.floor(size / 2);
  for (const [width, height] of viewports) {
    const pose = initialTownPose(roads, terrain, width, height), camera = cameraAt(pose, width, height), points = [];
    if (layout === 'river-v1') for (let z = mid - 3; z <= mid + 3; z++) {
      const channel = Array.from({ length: size }, (_, x) => x).filter(x => terrain.isWater(x, z) || terrain.isBank(x, z));
      for (const x of [channel[0] - 1, channel.at(-1) + 1]) { assert.equal(terrain.heightAt(x, z), 0); points.push(roads.center(x, z)); }
    }
    const hall = roads.center(mid, mid), roof = [];
    for (const x of [-9, 9]) for (const z of [-7.5, 7.5]) for (const y of [0, 17]) {
      const point = new THREE.Vector3(hall.x + x, y, hall.z + z); points.push(point); roof.push(point);
    }
    for (let x = mid - 2; x <= mid + 3; x++) for (let z = mid + 2; z <= mid + 4; z++) {
      assert(!terrain.isWater(x, z) && !terrain.isBank(x, z)); points.push(roads.center(x, z));
    }
    for (const point of points) {
      const p = new THREE.Vector3(point.x, point.y, point.z).project(camera);
      assert(Math.abs(p.x) < .84 && p.y > -.8 && p.y < .5 && Math.abs(p.z) < 1, `${size}/${layout}/${width}: full content in frame`);
    }
    if (size === 200 && layout === 'river-v1') {
      const before = cameraAt(oldPose(roads, terrain, width, height), width, height);
      const span = c => { const xs = roof.map(p => p.clone().project(c).x); return (Math.max(...xs) - Math.min(...xs)) * width / 2; };
      const oldWidth = span(before), newWidth = span(camera);
      assert(newWidth >= oldWidth - 1e-9);
      if (width > 600) assert(newWidth > oldWidth * 1.15, 'desktop hall at least 15% wider');
      hallMetrics.push({ viewport: `${width}x${height}`, oldWidth, newWidth });
    }
    fits++;
  }
}
console.log('HALL PIXEL WIDTH (projection only)', JSON.stringify(hallMetrics));
console.log(`USER RENDER REPAIR PASS: 10 old-red/new-green depth cases; seed forwarding/cache boundary; ${clockCases} clock convergence cases; ${fits} framing cases; ${requests} local asset reads; CPU ONLY, no pixel/native acceptance`);
