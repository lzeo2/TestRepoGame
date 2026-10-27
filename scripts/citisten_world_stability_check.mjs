// node --experimental-vm-modules scripts/citisten_world_stability_check.mjs
// Actual createWorld/Three/GLBs. Renderer and PNG pixel decoding are explicit doubles.
// No WebGL, CSS layout, native input, timing, pixel or user-device acceptance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from '../Games/Citisten3D/vendor/three.module.js';
import { GLTFLoader } from '../Games/Citisten3D/vendor/GLTFLoader.js';
import * as utils from '../Games/Citisten3D/vendor/BufferGeometryUtils.js';

assert(vm.SourceTextModule, 'Use --experimental-vm-modules');
const root = new URL('../Games/Citisten3D/', import.meta.url), origin = 'https://citisten.invalid';
// Same local-loader technique as citisten_first_scene_check; that executable exports no fixture.
const nativeFetch = globalThis.fetch, createURL = URL.createObjectURL.bind(URL), revokeURL = URL.revokeObjectURL.bind(URL);
const blobs = new Map(), images = [], sources = new Map(); let nextBlob = 0, requests = 0;
globalThis.self = globalThis;
globalThis.createImageBitmap = async blob => {
  const bytes = Buffer.from(await blob.arrayBuffer());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const image = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), closed: false,
    close() { assert(!this.closed); this.closed = true; } };
  images.push(image); return image;
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
class Target extends EventTarget { clientWidth = 1280; clientHeight = 800; setPointerCapture() {} }
class RendererDouble {
  shadowMap = {}; sizes = []; frames = 0;
  constructor({ canvas }) { this.canvas = canvas; }
  setPixelRatio(ratio) { this.ratio = ratio; }
  setSize(w, h, style) {
    assert.equal(style, false); this.canvas.width = Math.floor(w * this.ratio); this.canvas.height = Math.floor(h * this.ratio);
    this.sizes.push([w, h]); // Client dimensions are supplied, not a CSS layout simulation.
  }
  render(scene, camera) {
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    scene.traverse(node => { if (node.isDirectionalLight && node.castShadow) node.shadow.updateMatrices(node); });
    this.frames++;
  }
  dispose() {}
}
async function fixture() {
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
    const text = await readFile(new URL(key, root), 'utf8');
    if (sources.has(key)) assert.equal(text, sources.get(key), `${key}: source changed during fixture`);
    sources.set(key, text);
    const module = new vm.SourceTextModule(text, { context, identifier: key,
      initializeImportMeta(meta) { meta.url = `${origin}/Games/Citisten3D/${key}`; } });
    modules.set(key, module);
    await module.link((specifier, parent) => load(new URL(specifier, `${origin}/Games/Citisten3D/${parent.identifier}`).pathname.slice('/Games/Citisten3D/'.length)));
    return module;
  }
  const module = await load('world.mjs'); await module.evaluate();
  const canvas = new Target(), world = module.namespace.createWorld(canvas, { size: 200 }); await world.ready;
  const cameraModule = await load('camera.mjs');
  return { world, canvas, initialTownPose: cameraModule.namespace.initialTownPose };
}
const maxDelta = (a, b) => {
  assert.equal(a.length, b.length); let max = 0;
  for (let i = 0; i < a.length; i++) { assert(Number.isFinite(a[i]) && Number.isFinite(b[i])); max = Math.max(max, Math.abs(a[i] - b[i])); }
  return max;
};
const landmarks = [[0, 0, 0], [5, 17, 5], [-115, -.4, 5], [800, 0, -800], [-1100, 30, 0]];
function sample(w, canvas, exclude = () => false) {
  const nodes = [], instances = [], paths = [];
  function visit(node, path) {
    if (!exclude(node)) {
      paths.push(`${path}:${node.type}:${node.name}`); nodes.push(...node.matrixWorld.elements);
      if (node.instanceMatrix) instances.push(node.count, ...node.instanceMatrix.array.subarray(0, node.count * 16));
    }
    node.children.forEach((child, i) => visit(child, `${path}/${i}`));
  }
  visit(w.scene, 'scene');
  const worldPositions = [], projected = landmarks.flatMap(p => {
    const v = new THREE.Vector3(...p).applyMatrix4(w.scene.matrixWorld); worldPositions.push(...v.toArray()); v.project(w.camera);
    return [(v.x + 1) * canvas.clientWidth / 2, (1 - v.y) * canvas.clientHeight / 2, v.z];
  });
  const sun = w.dayNight.lights.sun;
  return { paths, nodes, instances, worldPositions, projected,
    camera: [...w.camera.matrixWorld.elements, ...w.camera.projectionMatrix.elements],
    shadow: [...sun.shadow.camera.matrixWorld.elements, ...sun.shadow.matrix.elements],
    shadowTexels: landmarks.flatMap(p => { const v = new THREE.Vector3(...p).applyMatrix4(sun.shadow.matrix); return [v.x * 2048, v.y * 2048]; }),
    uv: w.water.mesh.material.normalMap.offset.toArray(), weather: [w.atmosphere.particles.material.uniforms.elapsed.value] };
}
function compare(a, b, fields) {
  assert.deepEqual(a.paths, b.paths);
  return Object.fromEntries(fields.map(field => [field, maxDelta(a[field], b[field])]));
}
// Same-pixel ray intersections, not vertically aligned points with different screen pixels.
// Raw D24 only: polygon offset/slope, raster interpolation and actual GPU format are NOT simulated.
function depthReport(w, canvas) {
  const rays = new THREE.Raycaster(), d24 = 2 ** 24 - 1, rows = [];
  const probes = [-.8, -.4, 0, .4, .8].flatMap(y => [-.6, 0, .6].map(x => ({ x, y, kind: 'screen-grid' })));
  for (const x of [20, 60, 100, 140, 180]) {
    const p = w.roads.center(x, 100), v = new THREE.Vector3(p.x, 0, p.z).project(w.camera);
    if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1) probes.push({ x: v.x, y: v.y, kind: 'actual-road' });
  }
  for (const z of [-950, -500, 0]) {
    const v = new THREE.Vector3(0, 0, z).project(w.camera);
    if (Math.abs(v.x) < 1 && Math.abs(v.y) < 1) probes.push({ x: v.x, y: v.y, kind: 'grid-line-x0' });
  }
  for (const { x: ndcX, y: ndcY, kind } of probes) {
    rays.setFromCamera(new THREE.Vector2(ndcX, ndcY), w.camera);
    const p = rays.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    if (!p || Math.abs(p.x) >= 1000 || Math.abs(p.z) >= 1000 || p.clone().project(w.camera).z > 1) continue;
    const cell = w.roads.worldToCell(p.x, p.z);
    if (w.riverTerrain.heightAt(cell.x, cell.z) !== 0) continue;
    const base = (p.clone().project(w.camera).z + 1) / 2;
    for (const height of [.012, .035]) {
      const q = rays.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -height), new THREE.Vector3());
      const depth = (q.clone().project(w.camera).z + 1) / 2;
      const vertical = p.clone(); vertical.y = height; const moved = vertical.project(w.camera);
      rows.push({ kind, height, worldXZ: [p.x, p.z], distance: p.distanceTo(w.camera.position),
        rawD24Steps: Math.abs(depth - base) * d24, sameRoundedBin: Math.round(depth * d24) === Math.round(base * d24),
        verticalPixels: Math.abs(moved.y - ndcY) * canvas.clientHeight / 2,
        roadAtSample: w.roads.has(cell.x, cell.z), gridVisible: w.riverTerrain.layout === 'legacy-flat' });
    }
  }
  return rows;
}
async function exercise() {
  const { world: w, canvas, initialTownPose } = await fixture(), frames = [], cases = [], depth = [];
  w.roads.place({ x: 0, z: 100 }, { x: 199, z: 100 });
  w.buildings.spawn('townhall', { x: 5, z: -25 }); w.buildings.spawn('residential', { x: 35, z: 25 });
  const car = w.buildings.spawn('car', { x: 15, z: 5 }), walker = w.buildings.spawn('citizen', { x: 25, z: 5 });
  const geometryCopies = new Map();
  const dts = [0, 1 / 120, 1 / 60, .1, .25];
  for (const layout of ['legacy-flat', 'river-v1']) for (const view of ['desktop', 'phone', 'low-pitch']) {
    w.setTerrain(layout);
    canvas.clientWidth = view === 'phone' ? 390 : 1280; canvas.clientHeight = view === 'phone' ? 844 : 800;
    const pose = view === 'low-pitch' ? { x: 0, y: 215, z: 900, yaw: 0, pitch: -.12 }
      : initialTownPose(w.roads, w.riverTerrain, canvas.clientWidth, canvas.clientHeight, w.camera.fov);
    w.controls.setPose(pose, true); w.dayNight.setPhase(.5); w.render(0);
    const baseline = sample(w, canvas), sizes = w.renderer.sizes.length, maxima = {};
    const refs = w.scene.children.map(n => n.geometry);
    w.setTerrain(layout); assert.deepEqual(w.scene.children.map(n => n.geometry), refs, 'same layout does not rebuild');
    for (let i = 0; i < 36; i++) {
      if (i === 18) w.roadPool.sync(true);
      w.render(dts[i % dts.length]); const current = sample(w, canvas); frames.push(current);
      const deltas = compare(baseline, current, ['nodes', 'instances', 'camera', 'worldPositions', 'projected', 'shadow', 'shadowTexels']);
      for (const [key, delta] of Object.entries(deltas)) { maxima[key] = Math.max(maxima[key] || 0, delta); assert.equal(delta, 0, `${layout}/${view}/${i}/${key}`); }
    }
    assert.equal(w.renderer.sizes.length, sizes, 'same-size render must not resize');
    assert.notDeepEqual(sample(w, canvas).uv, baseline.uv, 'water remains animated at positive dt');
    cases.push({ layout, view, pose, frames: 36, maxDeltas: maxima });
    depth.push({ layout, view, near: w.camera.near, far: w.camera.far, samples: depthReport(w, canvas) });
  }
  w.scene.traverse(n => { if (n.geometry && !n.name.startsWith('city-event-')) geometryCopies.set(n.geometry, n.geometry.attributes.position.array.slice()); });
  const mobileGeometry = new Set([...car.base.nodes, ...walker.base.nodes].map(n => n.geometry));
  const exclude = n => n.isLight || n === w.dayNight.lights.sun.target || n === w.dayNight.lights.moon.target || n.name.startsWith('city-event-') || mobileGeometry.has(n.geometry);
  const state = { time: 0, tick: 0, terrainLayout: 'river-v1', buildings: [{ id: 1, type: 'residential', x: 103, z: 102, hp: 100 }],
    incidents: { active: [{ type: 'fire', buildingIds: [1], severity: .7, remaining: 20 }] }, cityEvents: [] };
  w.eventEffects.sync(state); w.atmosphere.setWeather('rain'); w.render(0);
  const staticBase = sample(w, canvas, exclude), animatedBase = sample(w, canvas), animation = {};
  for (let i = 0; i < 48; i++) {
    const dt = dts[i % dts.length]; state.time += dt; state.tick = Math.floor(state.time * 4);
    w.eventEffects.sync(state); w.dayNight.approach(.5 + i * .001, dt);
    w.buildings.transform(car, { x: 15, z: 5 - state.time }); w.buildings.transform(walker, { x: 25, z: 5 - state.time });
    w.render(dt); const current = sample(w, canvas); frames.push(current);
    for (const [key, value] of Object.entries(compare(staticBase, sample(w, canvas, exclude), ['nodes', 'instances', 'camera', 'worldPositions', 'projected']))) assert.equal(value, 0, `animation moved static ${key}`);
    for (const [key, value] of Object.entries(compare(animatedBase, current, ['nodes', 'instances', 'shadow', 'shadowTexels', 'uv', 'weather']))) animation[key] = Math.max(animation[key] || 0, value);
  }
  assert(animation.instances > 0 && animation.shadow > 0 && animation.uv > 0 && animation.weather > 0);
  const beforeResize = sample(w, canvas), sizes = w.renderer.sizes.length;
  canvas.clientWidth = 1000; canvas.clientHeight = 700; w.render(0);
  const resized = sample(w, canvas); assert.equal(maxDelta(beforeResize.nodes, resized.nodes), 0);
  assert.equal(maxDelta(beforeResize.camera.slice(0, 16), resized.camera.slice(0, 16)), 0);
  assert(maxDelta(beforeResize.camera, resized.camera) > 0); assert(maxDelta(beforeResize.projected, resized.projected) > 0);
  for (let i = 0; i < 12; i++) { w.render(0); const current = sample(w, canvas); assert.deepEqual(current, resized); frames.push(current); }
  assert.equal(w.renderer.sizes.length, sizes + 1);
  for (const [geometry, positions] of geometryCopies) assert.deepEqual(geometry.attributes.position.array, positions, 'static geometry unchanged');
  const ground = w.scene.children.find(n => Array.isArray(n.material)), riverGeometry = ground.geometry;
  const riverPositions = riverGeometry.attributes.position.array.slice(), beforeLayouts = sample(w, canvas);
  w.setTerrain('legacy-flat'); w.render(0); assert.notEqual(ground.geometry, riverGeometry);
  w.setTerrain('river-v1'); w.render(0); assert.notEqual(ground.geometry, riverGeometry);
  assert.deepEqual(ground.geometry.attributes.position.array, riverPositions);
  for (const value of Object.values(compare(beforeLayouts, sample(w, canvas), ['nodes', 'instances', 'camera', 'worldPositions', 'projected', 'shadow']))) assert.equal(value, 0);
  const followBefore = sample(w, canvas), pose = w.controls.target;
  w.controls.setPose({ ...pose, x: pose.x + .01 }, true); w.render(0);
  const followTexels = maxDelta(followBefore.shadowTexels, sample(w, canvas).shadowTexels);
  assert(followTexels > 0 && followTexels < 1, 'unsnapped follow permits fractional texel movement');
  const report = { cases, animation, depth, framesMeasured: frames.length, renderCalls: w.renderer.frames,
    resizeCalls: w.renderer.sizes.length, geometryBuffersChecked: geometryCopies.size, followOneCentimetreMaxTexels: followTexels,
    groundPolygonOffset: w.scene.children.find(n => Array.isArray(n.material))?.material.map(m => [m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits]),
    asphaltPolygonOffset: [w.roadPool.mesh.material.polygonOffset, w.roadPool.mesh.material.polygonOffsetFactor, w.roadPool.mesh.material.polygonOffsetUnits] };
  w.dispose(); assert.equal(w.scene.children.length, 0); assert.equal(blobs.size, 0); assert(images.every(i => i.closed));
  return { frames, report: JSON.parse(JSON.stringify(report)) };
}
const first = await exercise(), second = await exercise();
assert.equal(second.frames.length, first.frames.length);
for (let i = 0; i < first.frames.length; i++) for (const field of Object.keys(first.frames[i])) {
  assert.deepEqual(second.frames[i][field], first.frames[i][field], `exact replay frame ${i}/${field}`);
}
assert.deepEqual(second.report, first.report, 'exact replay report (VM prototypes normalized)');
for (const [key, text] of sources) assert.equal(await readFile(new URL(key, root), 'utf8'), text, `${key}: source changed during test`);
const depth = first.report.depth.map(({ samples, ...pose }) => ({ ...pose, samples: samples.length,
  separations: [.012, .035].map(height => {
    const rows = samples.filter(s => s.height === height), min = rows.reduce((a, b) => a.rawD24Steps < b.rawD24Steps ? a : b);
    return { height, minRawD24Steps: min.rawD24Steps, maxRawD24Steps: Math.max(...rows.map(r => r.rawD24Steps)),
      sameRoundedBins: rows.filter(r => r.sameRoundedBin).length, minSample: min,
      actualRoadSamples: rows.filter(r => r.kind === 'actual-road').length,
      actualRoadMinRawD24Steps: Math.min(...rows.filter(r => r.kind === 'actual-road').map(r => r.rawD24Steps)),
      gridLineMinRawD24Steps: Math.min(...rows.filter(r => r.kind === 'grid-line-x0').map(r => r.rawD24Steps)) };
  }) }));
console.log(JSON.stringify({ ...first.report, depth, exactReplay: true, sourceModules: sources.size, imagesClosed: images.length, localRequests: requests }, null, 2));
console.log('WORLD STABILITY PASS: fixed scene/camera/instance/projected/shadow deltas 0; exact replay; intended animation retained; no GPU/user-cause claim');
