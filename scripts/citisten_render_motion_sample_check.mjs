import assert from 'node:assert/strict';
// node --experimental-vm-modules scripts/citisten_render_motion_sample_check.mjs
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { GLTFLoader } from '../Games/Citisten3D/vendor/GLTFLoader.js';
import * as utils from '../Games/Citisten3D/vendor/BufferGeometryUtils.js';
import { createMotionDiagnostic } from '../Games/Citisten3D/motion-diagnostic.mjs';
import * as THREE from '../Games/Citisten3D/vendor/three.module.js';
import { createRenderMotionSampler } from '../Games/Citisten3D/render-motion-sample.mjs';
import { createSimulation } from '../Games/Citisten3D/sim.mjs';

const sourcePaths = ['world.mjs', 'camera.mjs', 'native.mjs', 'roads.mjs', 'sim.mjs', 'render-motion-sample.mjs'];
const sources = sourcePaths.map(path => readFileSync(new URL(`../Games/Citisten3D/${path}`, import.meta.url)));
let forbiddenCalls = 0, scenarios = 0;
const forbidden = () => { forbiddenCalls++; throw new Error('Observer called a mutator or GPU method'); };
const check = (name, fn) => { fn(); scenarios++; console.log(`PASS ${name}`); };
const sim = createSimulation({ size: 40, timedConstruction: true });
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1.6, .5, 5000);
camera.position.set(0, 80, 120); camera.lookAt(0, 0, 0);
const geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial();
const mesh = () => { const node = new THREE.Mesh(geometry, material); scene.add(node); return node; };
const instance = (count = 2) => {
  const node = new THREE.InstancedMesh(geometry, material, 16); node.count = count;
  node.setMatrixAt(0, new THREE.Matrix4().makeTranslation(5, 0, 5)); scene.add(node); return node;
};
const land = mesh(), road = instance(), bridge = instance(), water = mesh(), ground = mesh(), building = instance();
const mobile = instance(), sky = mesh(), smoke = instance();
const aoMap = new THREE.Texture(); ground.material = new THREE.MeshStandardMaterial({ aoMap });
water.material = new THREE.MeshStandardMaterial({ normalMap: new THREE.Texture() });
scene.fog = new THREE.FogExp2();
const sun = new THREE.DirectionalLight(), moon = new THREE.DirectionalLight();
const input = Object.freeze({ held: Object.freeze([]), dragging: false, version: 0 });
const target = Object.freeze({ x: 0, y: 80, z: 120, yaw: 0, pitch: -.5 });
const pool = { handles: [{ pose: { x: 0, y: 0, z: 0 } }], batches: [building] };
const world = { scene, camera, roads: sim.roads, blockAO: { map: aoMap },
  landscape: { mesh: land, batches: [] }, roadPool: { mesh: road, bridges: { mesh: bridge } }, water: { mesh: water },
  buildings: { pools: new Map([['townhall', pool], ['citizen', { handles: [], batches: [mobile] }]]) },
  riverTerrain: { layout: 'river-v1' },
  controls: { get target() { return { ...target }; }, get inputState() { return input; }, inputVersion: 0, update: forbidden },
  renderer: { info: { render: { frame: 3, calls: 9, triangles: 100 }, memory: { geometries: 6, textures: 2 } },
    render: forbidden, getContext: forbidden, getPixelRatio: forbidden },
  dayNight: { phase: .5, daylight: 1, sunDirection: new THREE.Vector3(0, 1, 0), lights: { sun, moon } },
  atmosphere: { sky, particles: { material: { uniforms: { elapsed: { value: 0 } } } }, uniforms: { cityFogDensity: { value: .001 } } },
  effects: { sync: forbidden }, render: forbidden };
const canvas = { clientWidth: 800, clientHeight: 500, width: 1200, height: 750,
  getBoundingClientRect: () => ({ left: 20, top: 10, width: canvas.clientWidth, height: canvas.clientHeight }), getContext: forbidden };
const originals = { dpr: globalThis.devicePixelRatio, window: globalThis.window };
globalThis.devicePixelRatio = 1.5;
globalThis.window = { visualViewport: { width: 800, height: 500, offsetLeft: 0, offsetTop: 0, scale: 1 } };
let externalUpdate = true;
for (const node of [scene, camera, ...scene.children]) {
  for (const method of ['updateMatrix', 'updateMatrixWorld', 'updateWorldMatrix']) {
    const original = node[method];
    node[method] = function (...args) { if (!externalUpdate) return forbidden(); return original.apply(this, args); };
  }
}
const update = fn => { externalUpdate = true; fn?.(); scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); externalUpdate = false; };
update();
const sampler = createRenderMotionSampler(world, canvas, { getState: () => sim.state });
const baseline = sampler.sample();
const delta = (a, b, group) => {
  assert.deepEqual(a.keys[group], b.keys[group]);
  assert.equal(a.groups[group].length, b.groups[group].length);
  return Math.max(0, ...a.groups[group].map((n, i) => Math.abs(n - b.groups[group][i])));
};
const unchanged = (a, b, groups) => groups.forEach(group => assert.equal(delta(a, b, group), 0, group));
function shape(value) {
  assert(JSON.stringify(value).length < 8000);
  for (const [group, numbers] of Object.entries(value.groups)) {
    assert(numbers === null || numbers.every(Number.isFinite), group);
    assert(Array.isArray(value.keys[group]));
  }
  assert(value.coverage.cohort <= 24); assert((value.sim?.construction.length ?? 0) <= 8);
}
const originalState = JSON.stringify(sim.snapshot()), originalRoads = [...sim.roads.cells], roadIdentity = sim.roads.cells;
const matrices = () => JSON.stringify(scene.children.map(node => [node.matrixWorld.elements, node.instanceMatrix && Array.from(node.instanceMatrix.array)]));
const initialMatrices = matrices();
check('fixed 100 samples: every group delta zero, copied outputs, no source/state/road mutation', () => {
  assert(baseline.available); assert(baseline.input.known);
  assert.equal(baseline.coverage.health, 'unqueried');
  for (let i = 0; i < 100; i++) { const value = sampler.sample(); shape(value); unchanged(baseline, value, Object.keys(value.groups)); }
  const copy = sampler.sample(); copy.groups.scene[0] = 99; copy.input.held.push('KeyW');
  assert.deepEqual(sampler.sample(), baseline);
  assert.equal(matrices(), initialMatrices); assert.equal(JSON.stringify(sim.snapshot()), originalState);
  assert.equal(sim.roads.cells, roadIdentity); assert.deepEqual([...sim.roads.cells], originalRoads);
});
check('camera externally moved: camera/projected only, not scene/projection/shading', () => {
  update(() => { camera.position.x += 1; }); const value = sampler.sample();
  assert(delta(baseline, value, 'camera') > 0); assert(delta(baseline, value, 'projected') > 0);
  unchanged(baseline, value, ['scene', 'projection', 'shading']);
  update(() => { camera.position.x -= 1; });
});
check('resize: viewport/projection/projected change, not camera or scene', () => {
  const before = sampler.sample(); canvas.clientWidth = 1000;
  camera.aspect = 2; camera.updateProjectionMatrix(); const after = sampler.sample();
  assert(delta(before, after, 'viewport') > 0); assert(delta(before, after, 'projection') > 0);
  unchanged(before, after, ['camera', 'scene']);
  canvas.clientWidth = 800; camera.aspect = 1.6; camera.updateProjectionMatrix();
});
check('first active instance matrix changes scene, not camera or shading', () => {
  const before = sampler.sample(); building.instanceMatrix.array[12] += .25; const after = sampler.sample();
  assert(delta(before, after, 'scene') > 0); unchanged(before, after, ['camera', 'projection', 'shading']);
  building.instanceMatrix.array[12] -= .25;
});
check('unused capacity and mobile/sky/smoke transforms are not static evidence', () => {
  const before = sampler.sample(); building.instanceMatrix.array[32] += 10;
  update(() => { mobile.position.x++; sky.position.x++; smoke.position.x++; });
  unchanged(before, sampler.sample(), ['scene', 'camera', 'projected']);
});
check('water/light/shadow/weather-only change stays in shading', () => {
  const before = sampler.sample(); water.material.normalMap.offset.x += .1; sun.intensity += .2;
  sun.shadow.matrix.elements[12] += .3; world.atmosphere.particles.material.uniforms.elapsed.value++;
  const after = sampler.sample(); assert(delta(before, after, 'shading') > 0);
  unchanged(before, after, ['camera', 'projection', 'scene', 'projected']);
});
check('unknown held input is not no-input; cached version retained', () => {
  const controls = world.controls; world.controls = { target, inputVersion: 7 };
  const value = sampler.sample(); assert.equal(value.input.known, false); assert.equal(value.input.version, 7);
  assert.equal(value.input.dragging, null); world.controls = controls;
});
check('held/dragging/target copied independently', () => {
  const controls = world.controls; world.controls = { target: { ...target, x: 2 }, inputState: { held: ['KeyW'], dragging: true, version: 8 } };
  const value = sampler.sample(); assert.deepEqual(value.input, { known: true, held: ['KeyW'], dragging: true, version: 8 });
  assert(delta(baseline, value, 'target') > 0); world.controls = controls;
});
check('no renderer: cached metadata null, never GPU health', () => {
  const renderer = world.renderer; world.renderer = null; const value = sampler.sample();
  assert(Object.values(value.render).every(v => v === null)); assert.equal(value.coverage.health, 'unqueried'); world.renderer = renderer;
});
check('missing globals/world/canvas and throwing getters do not escape', () => {
  delete globalThis.window; delete globalThis.devicePixelRatio;
  const value = createRenderMotionSampler(null, null).sample(); shape(value); assert.equal(value.available, false);
  assert.equal(value.sim, null); assert.equal(value.input.known, false);
  const broken = createRenderMotionSampler({ get scene() { throw Error('private text must not leak'); } }, null,
    { getState: () => { throw Error('private save must not leak'); } }).sample();
  shape(broken); assert(!JSON.stringify(broken).includes('private'));
  globalThis.devicePixelRatio = 1.5; globalThis.window = { visualViewport: { width: 800, height: 500, offsetLeft: 0, offsetTop: 0, scale: 1 } };
});
check('removed/replaced nodes and geometry report changed coverage, not zero jitter', () => {
  scene.remove(land); let value = sampler.sample(); assert(value.coverage.changed);
  assert(!value.keys.scene.includes('land.w16')); scene.add(land);
  const old = land.geometry; land.geometry = new THREE.BoxGeometry(); value = sampler.sample();
  assert(value.coverage.changed); land.geometry = old;
});
check('pool first-handle replacement/count/new pools/layout tracked', () => {
  const first = pool.handles[0]; pool.handles[0] = { ...first };
  assert(sampler.sample().coverage.changed); pool.handles[0] = first;
  building.count++; assert(sampler.sample().coverage.changed); building.count--;
  world.buildings.pools.set('solar', { handles: [], batches: [] }); assert(sampler.sample().coverage.changed);
  world.buildings.pools.delete('solar'); world.riverTerrain.layout = 'legacy-flat'; assert(sampler.sample().coverage.layoutChanged);
  world.riverTerrain.layout = 'river-v1';
});
check('NaN matrix is missing, never coerced to zero', () => {
  const old = camera.matrixWorld.elements[0]; camera.matrixWorld.elements[0] = NaN;
  const value = sampler.sample(); shape(value); assert.equal(value.available, false);
  assert(!value.keys.camera.includes('world16')); camera.matrixWorld.elements[0] = old;
});
check('offscreen/behind/near-plane landmarks yield unknown, not huge jitter', () => {
  update(() => camera.lookAt(0, 160, 240)); const value = sampler.sample();
  assert.equal(value.groups.projected, null); assert.equal(value.coverage.visibleLandmarks, 0);
  update(() => camera.lookAt(0, 0, 0));
});
check('construction copies <=8 factual sites, bounded scan, no text/save serialization', () => {
  const state = { time: 1, tick: 4, speed: 0, buildings: Array.from({ length: 400 }, (_, id) => ({ id, type: 'residential', constructionRemaining: 2, text: 'secret' })) };
  const value = createRenderMotionSampler(world, canvas, { getState: () => state }).sample();
  assert.equal(value.sim.construction.length, 8); assert.equal(value.coverage.constructionScanned, 8);
  assert(value.coverage.constructionCapped); assert(!JSON.stringify(value).includes('secret'));
  state.buildings.forEach(b => { b.constructionRemaining = 0; }); state.buildings[300].constructionRemaining = 1;
  const capped = createRenderMotionSampler(world, canvas, { getState: () => state }).sample();
  assert.equal(capped.coverage.constructionScanned, 256); assert(capped.coverage.constructionCapped);
});
check('dedup refs, 24 node cap, finite extreme matrices remain <8KB', () => {
  world.landscape.batches = [land, land];
  pool.batches = Array.from({ length: 40 }, () => instance()); update();
  const capped = createRenderMotionSampler(world, canvas); const value = capped.sample(); shape(value);
  assert.equal(value.coverage.cohort, 24); assert(value.reasons.includes('cohort-cap'));
  assert.equal(value.keys.scene.filter(key => key === 'land.w16').length, 1);
  for (const node of pool.batches) { node.matrixWorld.elements.fill(1.2345678901234567e200); node.instanceMatrix.array.fill(1.2345678e30); }
  const huge = capped.sample(); shape(huge); assert(huge.coverage.omittedSceneBlocks > 0);
  const recorder = createMotionDiagnostic({ readSample: () => value, now: () => 0, setTimer: () => 1, clearTimer() {} });
  recorder.start(); recorder.sample(); recorder.sample(); recorder.cancel();
  assert.equal(recorder.report.groups.scene.validSamples, 2);
  assert.equal(recorder.report.groups.scene.unavailableSamples, 0);
});
check('private base batches explicitly uncovered; frozen computed matrices readable', () => {
  pool.handles[0].base = {}; Object.freeze(camera.matrixWorld.elements); Object.freeze(camera.matrixWorldInverse.elements);
  const value = createRenderMotionSampler(world, canvas).sample();
  assert(value.reasons.includes('private-base-batches-unobserved')); shape(value);
});
check('source bytes, actual simulation full snapshot and roads unchanged; zero forbidden calls', () => {
  sourcePaths.forEach((path, i) => assert.deepEqual(readFileSync(new URL(`../Games/Citisten3D/${path}`, import.meta.url)), sources[i]));
  assert.equal(JSON.stringify(sim.snapshot()), originalState); assert.equal(sim.roads.cells, roadIdentity);
  assert.deepEqual([...sim.roads.cells], originalRoads); assert.equal(forbiddenCalls, 0);
});
// Local loader technique from world-stability; no exported fixture there.
// Actual 18 GLBs, PNG headers only. No pixel decoding, network or GPU.
assert(vm.SourceTextModule, 'Use --experimental-vm-modules');
const root = new URL('../Games/Citisten3D/', import.meta.url), origin = 'https://citisten.invalid';
const savedGlobals = Object.fromEntries(['fetch', 'self', 'createImageBitmap'].map(key => [key, globalThis[key]]));
const createURL = URL.createObjectURL.bind(URL), revokeURL = URL.revokeObjectURL.bind(URL);
const blobs = new Map(), loadedSources = new Map(); let glbs = 0, nextBlob = 0, observing = false, updates = 0;
globalThis.self = globalThis;
globalThis.createImageBitmap = async blob => {
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), close() {} };
};
URL.createObjectURL = blob => { const key = `blob:${origin}/${nextBlob++}`; blobs.set(key, createURL(blob)); return key; };
URL.revokeObjectURL = key => { revokeURL(blobs.get(key) || key); blobs.delete(key); };
globalThis.fetch = async (input, options) => {
  if (observing) return forbidden();
  const url = new URL(input);
  if (url.protocol === 'blob:') { assert(blobs.has(url.href)); return savedGlobals.fetch(blobs.get(url.href)); }
  assert.equal(url.origin, origin); assert.equal(options.redirect, 'error');
  assert(url.pathname.startsWith('/Games/Citisten3D/models/')); if (url.pathname.endsWith('.glb')) glbs++;
  return new Response(await readFile(new URL(url.pathname.slice('/Games/Citisten3D/'.length), root)));
};
class Target extends EventTarget {
  clientWidth = 1280; clientHeight = 800;
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
  getContext = forbidden;
}
class FakeRenderer {
  shadowMap = {}; info = { render: { frame: 0, calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 } };
  constructor({ canvas }) { this.canvas = canvas; }
  setPixelRatio(ratio) { this.ratio = ratio; }
  setSize(w, h) { this.canvas.width = w * this.ratio; this.canvas.height = h * this.ratio; }
  render(scene, camera) {
    if (observing) return forbidden();
    // Actual world.render delegates these computations to the renderer.
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    scene.traverse(node => { if (node.isDirectionalLight && node.castShadow) node.shadow.updateMatrices(node); });
    this.info.render.frame++; this.info.render.calls++;
  }
  getContext = forbidden; getPixelRatio = forbidden; readRenderTargetPixels = forbidden;
  dispose() {}
}
const context = vm.createContext({ URL, fetch: globalThis.fetch, TextDecoder, DataView, Uint8Array, console,
  window: new Target(), HTMLElement: class {}, devicePixelRatio: 1.5,
  setTimeout: forbidden, setInterval: forbidden, requestAnimationFrame: forbidden });
const modules = new Map();
for (const [key, exports] of Object.entries({ 'vendor/three.module.js': { ...THREE, WebGLRenderer: FakeRenderer },
  'vendor/GLTFLoader.js': { GLTFLoader }, 'vendor/BufferGeometryUtils.js': utils })) {
  modules.set(key, new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
  }, { context, identifier: key }));
}
async function load(key) {
  if (modules.has(key)) return modules.get(key);
  const text = await readFile(new URL(key, root), 'utf8'); loadedSources.set(key, text);
  const module = new vm.SourceTextModule(text, { context, identifier: key,
    initializeImportMeta(meta) { meta.url = `${origin}/Games/Citisten3D/${key}`; } });
  modules.set(key, module);
  await module.link((specifier, parent) => load(new URL(specifier, `${origin}/Games/Citisten3D/${parent.identifier}`).pathname.slice('/Games/Citisten3D/'.length)));
  return module;
}
const entry = await load('world.mjs'); await entry.evaluate();
const actualCanvas = new Target(), actual = entry.namespace.createWorld(actualCanvas, { size: 200 }); await actual.ready;
actual.setTerrain('river-v1');
const actualSim = createSimulation({ size: 200, roads: actual.roads, terrainLayout: 'river-v1', timedConstruction: true });
actual.roads.place({ x: 0, z: 100 }, { x: 199, z: 100 });
actual.buildings.spawn('townhall', { x: 5, z: -25 }); actual.buildings.spawn('residential', { x: 35, z: 25 });
for (const type of ['citizen', 'zombie', 'car', 'patrol_car', 'utility_car']) actual.buildings.spawn(type);
const cameraModule = await load('camera.mjs');
actual.controls.setPose(cameraModule.namespace.initialTownPose(actual.roads, actual.riverTerrain, 1280, 800, 60), true);
actual.dayNight.setPhase(.5); actual.render(0);
for (const node of [actual.camera, ...(() => { const nodes = []; actual.scene.traverse(n => nodes.push(n)); return nodes; })()]) {
  for (const method of ['updateMatrix', 'updateMatrixWorld', 'updateWorldMatrix']) {
    const original = node[method]; node[method] = function (...args) { if (observing) return forbidden(); updates++; return original.apply(this, args); };
  }
}
for (const owner of [actual.controls, actual.buildings, actual.water, actual.effects, actual.atmosphere, actual.blockAO]) {
  const original = owner.update; if (original) owner.update = function (...args) { if (observing) return forbidden(); updates++; return original.apply(this, args); };
}
const actualSampler = createRenderMotionSampler(actual, actualCanvas, { getState: () => actualSim.state });
function observe() {
  const saved = Object.fromEntries(['setTimeout', 'setInterval', 'requestAnimationFrame'].map(k => [k, globalThis[k]]));
  observing = true; for (const key of Object.keys(saved)) globalThis[key] = forbidden;
  try { return actualSampler.sample(); }
  finally { observing = false; for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
}
const actualBase = observe(), fullState = JSON.stringify(actualSim.snapshot()), actualCells = [...actual.roads.cells], cellsRef = actual.roads.cells;
const actualMatrices = () => JSON.stringify([actual.scene, actual.camera, ...actual.scene.children].map(n => [n.matrixWorld.elements, n.instanceMatrix && Array.from(n.instanceMatrix.array)]));
const actualStartMatrices = actualMatrices(), counters = JSON.stringify(actual.renderer.info), updateCount = updates;
check('actual createWorld: 18 local GLBs, hall/home original batches, road/river and known parent input', () => {
  assert.equal(glbs, 18); assert(actualBase.available); assert(actualBase.input.known); shape(actualBase);
  assert(actualBase.coverage.base.matched > 0); assert.equal(actualBase.coverage.base.unmatched, 0);
  assert(actualBase.coverage.base.sampled > 0); assert(actualBase.coverage.base.partial);
  assert(!actualBase.reasons.includes('private-base-batches-unobserved'));
  for (const key of ['road.i16', 'bridge.i16', 'ground.w16', 'land.w16']) assert(actualBase.keys.scene.includes(key), key);
  for (let i = 0; i < 100; i++) assert.deepEqual(observe(), actualBase);
  assert.equal(actualMatrices(), actualStartMatrices); assert.equal(JSON.stringify(actualSim.snapshot()), fullState);
  assert.equal(actualSim.roads.cells, cellsRef); assert.deepEqual([...actualSim.roads.cells], actualCells);
  assert.equal(JSON.stringify(actual.renderer.info), counters); assert.equal(updates, updateCount);
});
check('actual original GLB first instance changes scene only; mobile materials excluded', () => {
  const originals = actual.scene.children.filter(n => n.isInstancedMesh && /^(town_hall|residential_row)__/.test(n.material?.name));
  assert(originals.some(n => n.material.name.startsWith('town_hall__')));
  assert(originals.some(n => n.material.name.startsWith('residential_row__')));
  let captured = 0, omitted = 0; const capturedDirectories = new Set();
  for (const node of originals) {
    node.instanceMatrix.array[12] += .25; const changed = observe();
    if (delta(actualBase, changed, 'scene') > 0) { captured++; capturedDirectories.add(node.material.name.split('__')[0]); }
    else omitted++;
    unchanged(actualBase, changed, ['camera', 'projection', 'projected', 'shading']);
    node.instanceMatrix.array[12] -= .25;
  }
  assert.equal(originals.length, 17); assert.equal(captured, 14); assert.equal(omitted, 3);
  assert.equal(actualBase.coverage.base.sampled, captured); assert(actualBase.coverage.base.capped);
  assert.deepEqual([...capturedDirectories].sort(), ['residential_row', 'town_hall']);
  const mobileNodes = actual.scene.children.filter(n => n.isInstancedMesh && /^(citizen|zombie|compact_car|patrol_car|utility_car)__/.test(n.material?.name));
  assert(mobileNodes.length > 0);
  for (const n of mobileNodes) n.instanceMatrix.array[12] += 1;
  unchanged(actualBase, observe(), ['scene', 'camera', 'projected']);
  for (const n of mobileNodes) n.instanceMatrix.array[12] -= 1;
});
check('actual root move changes scene-local projected references, camera unchanged', () => {
  actual.scene.position.x += .25; actual.renderer.render(actual.scene, actual.camera);
  const moved = observe(); assert(delta(actualBase, moved, 'scene') > 0); assert(delta(actualBase, moved, 'projected') > 0);
  unchanged(actualBase, moved, ['camera', 'projection']);
  actual.scene.position.x -= .25; actual.render(0);
});
check('actual phase/water frame updates change shading only; cached matrices frozen during observation', () => {
  const before = observe(); actual.dayNight.setPhase(.51); actual.render(.1); const after = observe();
  assert(delta(before, after, 'shading') > 0); unchanged(before, after, ['camera', 'scene', 'projected', 'projection']);
  const matrices = [actual.scene.matrixWorld, actual.camera.matrixWorld, actual.camera.matrixWorldInverse, actual.camera.projectionMatrix];
  const elements = matrices.map(m => m.elements); matrices.forEach(m => { m.elements = Object.freeze([...m.elements]); });
  assert.deepEqual(observe(), after); matrices.forEach((m, i) => { m.elements = elements[i]; });
});
check('actual samples accepted by recorder; metadata truncation is explicit partial, not false green', () => {
  let now = 0;
  const recorder = createMotionDiagnostic({ readSample: observe, now: () => now, setTimer: () => 1, clearTimer() {} });
  assert(recorder.start()); recorder.sample(); now = 100; recorder.sample();
  const node = actual.scene.children.find(n => n.isInstancedMesh && n.material?.name.startsWith('town_hall__'));
  node.instanceMatrix.array[12] += .25; now = 200; recorder.sample(); node.instanceMatrix.array[12] -= .25;
  now = 5000; recorder.sample(); const report = recorder.report;
  assert.equal(report.readErrors, 0); assert.equal(report.unavailableReads, 0); assert.equal(report.sampleCount, 3);
  for (const group of Object.values(report.groups)) { assert.equal(group.validSamples, 3); assert.equal(group.unavailableSamples, 0); }
  assert(report.groups.scene.maxAbsDelta > 0); assert.equal(report.groups.camera.maxAbsDelta, 0);
  assert(report.partial); assert(report.reasons.includes('metadata-limit')); assert(JSON.stringify(report).length < 16000);
  assert.equal(report.firstCoverage.base.matched, actualBase.coverage.base.matched);
  console.log(`ACTUAL COHORT ${JSON.stringify(actualBase.coverage.base)} nodes=${actualBase.coverage.cohort} sceneChildren=${actualBase.coverage.sceneChildren} sceneValues=${actualBase.groups.scene.length}; recorder partial metadata-limit`);
});
check('bounded scan cannot claim an unmatched private base; no rescan after factory', () => {
  const scene = new THREE.Scene();
  for (let i = 0; i < 128; i++) scene.add(new THREE.Object3D());
  const material = new THREE.MeshStandardMaterial(); material.name = 'town_hall__stone';
  const late = new THREE.InstancedMesh(geometry, material, 1); scene.add(late);
  const probe = createRenderMotionSampler({ ...actual, scene }, actualCanvas);
  let sample = probe.sample(); assert.equal(sample.coverage.base.scanned, 128);
  assert.equal(sample.coverage.base.matched, 0); assert.equal(sample.coverage.base.unmatched, 2);
  assert(sample.reasons.includes('private-base-batches-unobserved')); assert(sample.reasons.includes('scene-scan-cap'));
  scene.children.unshift(scene.children.pop()); sample = probe.sample();
  assert.equal(sample.coverage.base.matched, 0); assert.equal(sample.coverage.base.sampled, 0);
});
check('actual full simulation/roads/source bytes preserved; no forbidden calls', () => {
  assert.equal(JSON.stringify(actualSim.snapshot()), fullState); assert.equal(actualSim.roads.cells, cellsRef);
  assert.deepEqual([...actualSim.roads.cells], actualCells); assert.equal(forbiddenCalls, 0);
  for (const [key, text] of loadedSources) assert.equal(readFileSync(new URL(key, root), 'utf8'), text);
});
actual.dispose(); assert.equal(blobs.size, 0);
URL.createObjectURL = createURL; URL.revokeObjectURL = revokeURL;
for (const [key, value] of Object.entries(savedGlobals)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; }
for (const [key, value] of Object.entries({ devicePixelRatio: originals.dpr, window: originals.window })) {
  if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
}
console.log(`RENDER MOTION SAMPLER PASS: ${scenarios} scenarios; 100 fixed samples; forbidden calls ${forbiddenCalls}; actual createWorld + 18 GLBs + sim + recorder; CPU doubles, no GPU acceptance`);
