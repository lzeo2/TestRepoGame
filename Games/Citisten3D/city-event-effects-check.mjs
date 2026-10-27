// Run: node --experimental-vm-modules Games/Citisten3D/city-event-effects-check.mjs
// Actual Three geometry, matrices, colors and shader assembly; no WebGL/browser.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/three.module.js';
import * as utils from './vendor/BufferGeometryUtils.js';
import * as surfaces from './building-surfaces.mjs';
import { MODEL_DIRECTORIES } from './external-assets.mjs';
import { RoadGrid } from './roads.mjs';
import { createCityEventEffects } from './city-event-effects.mjs';
import { createCityBuildingKit } from './city-render.mjs';
import { createRiverTerrain } from './river-data.mjs';

const scene = new THREE.Scene(), roads = new RoadGrid(40), fx = createCityEventEffects(scene, roads);
const meshes = Object.fromEntries(scene.children.map(m => [m.name.replace('city-event-', ''), m]));
assert.equal(scene.children.length, 5);
assert.ok(scene.children.every(m => m.isInstancedMesh && !m.castShadow));
const arrays = scene.children.map(m => m.instanceMatrix.array);
const capacity = scene.children.map(m => m.instanceMatrix.count);
assert.deepEqual(capacity, [96, 96, 128, 32, 32]);
const tris = m => (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;
const triangleCap = scene.children.reduce((sum, m) => sum + tris(m) * m.instanceMatrix.count, 0);
assert.equal(triangleCap, 3744);
const bufferBytes = scene.children.reduce((sum, m) => sum + m.instanceMatrix.array.byteLength +
  Object.values(m.geometry.attributes).reduce((n, a) => n + a.array.byteLength, 0) + (m.geometry.index?.array.byteLength || 0), 0);
const b = { id: 1, type: 'residential', x: 20, z: 21, hp: 100 };
const fire = { id: 'f', type: 'fire', x: 0, z: 0, buildingIds: [1, 404], severity: .7, remaining: 20, total: 30, startTick: 1 };
const state = { time: 10, tick: 40, terrainLayout: 'river-v1', buildings: [b], incidents: { active: [fire] }, cityEvents: [] };
fx.sync(state); assert.equal(fx.activeCount, 1); assert.equal(meshes.flames.count, 3); assert.equal(meshes.smoke.count, 3);
const matrix = new THREE.Matrix4(), color = new THREE.Color();
meshes.flames.getMatrixAt(1, matrix);
assert.equal(matrix.elements[12], roads.center(b.x, b.z).x);
assert.equal(matrix.elements[14], roads.center(b.x, b.z).z - 3, 'actual building, not hazard fallback coordinates');
const frozen = scene.children.map(m => Array.from(m.instanceMatrix.array));
for (let i = 0; i < 30; i++) fx.sync(state);
assert.deepEqual(scene.children.map(m => Array.from(m.instanceMatrix.array)), frozen, 'pause/repeated sync freezes all matrices');
state.time += 1; fx.sync(state);
assert.notDeepEqual(Array.from(meshes.flames.instanceMatrix.array), frozen[0]);
assert.notDeepEqual(Array.from(meshes.smoke.instanceMatrix.array), frozen[1]);
const largeFlame = meshes.flames.instanceMatrix.array[5]; fire.severity = .1; fx.sync(state);
assert.ok(meshes.flames.instanceMatrix.array[5] < largeFlame, 'severity scales actual geometry');
b.hp = 0; fx.sync(state); assert.equal(fx.activeCount, 0); assert.equal(meshes.flames.count, 0);
b.hp = 100; b.constructionRemaining = 5; fx.sync(state); assert.equal(meshes.flames.count, 0); delete b.constructionRemaining;
fire.remaining = 0; fx.sync(state); assert.equal(meshes.smoke.count, 0); fire.remaining = 20;
state.buildings = []; fx.sync(state); assert.equal(fx.activeCount, 0, 'removed target never falls back to fake flames');
state.buildings = [b]; state.incidents.active = [{ type: 'outage', remaining: 10, severity: 1, buildingIds: [1] }];
fx.sync(state); assert.equal(fx.activeCount, 0, 'outage belongs to actual building tint, not a marker');
const flood = { type: 'flood', remaining: 10, severity: .8, tiles: [{ x: 10, z: 20 }, { x: 10, z: 20 }, { x: -1, z: 2 }] };
state.incidents.active = [fire, flood];
state.cityEvents = [{ type: 'street-festival', district: '2,2', startTick: 1, durationTicks: 100 }];
fx.sync(state); assert.equal(fx.activeCount, 3); assert.equal(meshes.flood.count, 1); assert.equal(meshes.flags.count, 2);
meshes.flood.getMatrixAt(0, matrix);
assert.equal(matrix.elements[12], roads.center(10, 20).x);
assert.equal(matrix.elements[14], roads.center(10, 20).z);
const terrain = createRiverTerrain(40);
for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) assert.ok(matrix.elements[13] > terrain.heightAt(10 + dx, 20 + dz));
assert.equal(meshes.flood.material.depthWrite, false);
state.cityEvents[0].district = '1,1'; fx.sync(state); assert.equal(meshes.flags.count, 0);
state.cityEvents[0].district = '2,2'; state.tick = 101; fx.sync(state); assert.equal(meshes.flags.count, 0, 'expired record cannot decorate');
const many = Array.from({ length: 80 }, (_, id) => ({ ...b, id, x: 16 + id % 8, z: 16 + Math.floor(id / 8) }));
state.buildings = many; state.tick = 40;
fire.buildingIds = many.map(b => b.id); fire.severity = 1;
flood.tiles = Array.from({ length: 200 }, (_, i) => ({ x: i % 40, z: Math.floor(i / 40) }));
fx.sync(state);
assert.deepEqual(scene.children.map(m => m.count), capacity, 'all hard caps reached without pool growth');
assert.deepEqual(scene.children.map(m => m.instanceMatrix.array), arrays);
console.log(`EVENT POOLS PASS: 5 meshes/draw upper bound, ${triangleCap} max triangles, 32 burning buildings/128 flooded tiles/16 decorated buildings`);
console.log(`EVENT RESOURCES: 5 geometries/5 materials/0 textures; ${bufferBytes} geometry+matrix typed-array bytes; dispose events 15 expected`);
fx.clear(); assert.equal(fx.activeCount, 0); assert.ok(scene.children.every(m => m.count === 0));
fx.sync(JSON.parse(JSON.stringify(state))); assert.equal(fx.activeCount, 3, 'new/load state rebuilds from authoritative records');
fx.sync({ time: 0, tick: 0, buildings: [], cityEvents: [], incidents: { active: [] } });
assert.ok(scene.children.every(m => m.count === 0), 'new game hides everything');
let disposed = 0;
for (const m of scene.children) for (const resource of [m, m.geometry, m.material]) resource.addEventListener('dispose', () => disposed++);
fx.sync(state); fx.dispose(); fx.dispose(); fx.sync(state); fx.clear();
assert.equal(disposed, 15); assert.equal(scene.children.length, 0); assert.equal(fx.activeCount, 0);

// Execute the production kit with tiny local geometry fixtures, then separately
// run external-model-check for all real supplied GLBs. No loader/network needed here.
if (!vm.SourceTextModule) throw new Error('Run with --experimental-vm-modules');
const originals = ['residential_row__warm_brick', 'residential_row__warm_glazing'].map(name => new THREE.MeshStandardMaterial({ name, emissive: 0xffaa66 }));
const map = new THREE.Texture(); originals[0].map = map;
const originalJSON = originals.map(m => JSON.stringify(m.toJSON()));
const sourceGeometry = new THREE.BoxGeometry(2, 4, 2);
const context = vm.createContext({ console });
const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
  for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
}, { context });
const assets = synthetic({ MODEL_DIRECTORIES, disposeExternalModels() {}, async loadExternalModel(directory) {
  const group = new THREE.Group();
  for (const material of originals) group.add(new THREE.Mesh(sourceGeometry, material));
  group.userData.external = { rig: { coordinates: 'Y-up' } };
  return { scene: group, animations: [new THREE.AnimationClip('clip_citizen_walk', 1, [])] };
} });
const three = synthetic(THREE), surfaceModule = synthetic(surfaces), geometryModule = synthetic(utils);
const module = new vm.SourceTextModule(await readFile(new URL('./external-buildings.mjs', import.meta.url), 'utf8'), { context });
await module.link(specifier => specifier.includes('external-assets') ? assets : specifier.includes('building-surfaces') ? surfaceModule : specifier.includes('BufferGeometryUtils') ? geometryModule : three);
await module.evaluate();
const modelScene = new THREE.Scene(), base = module.namespace.createExternalBuildingKit(modelScene, 100);
const early = base.spawn('residential'); base.setOperational(early, false);
await base.ready;
const kit = createCityBuildingKit(modelScene, base, 100); await kit.ready;
function checkTint(pool, handle, value) {
  for (const batch of pool.batches) {
    batch.getColorAt(handle.index, color);
    for (const channel of ['r', 'g', 'b']) assert.ok(Math.abs(color[channel] - value) < 1e-6);
  }
}
checkTint(base.pools.get('residential'), early, .16);
const handles = [];
for (let i = 0; i < 40; i++) {
  const h = kit.spawn('apartments', { x: i * 10 }); handles.push(h);
  if (i % 2 === 0) kit.setOperational(h, false);
}
for (const h of handles) {
  const value = h.operational ? 1 : .16;
  checkTint(kit.pools.get('apartments'), h, value); checkTint(base.pools.get('residential'), h.base, value);
}
assert.equal(kit.pools.get('apartments').allocation, 64);
assert.equal(base.pools.get('residential').allocation, 64);
kit.remove(handles[1]); base.remove(early);
for (const h of handles.filter(h => h.alive)) {
  checkTint(kit.pools.get('apartments'), h, h.operational ? 1 : .16);
  checkTint(base.pools.get('residential'), h.base, h.operational ? 1 : .16);
}
const replacement = kit.spawn('apartments');
checkTint(kit.pools.get('apartments'), replacement, 1); checkTint(base.pools.get('residential'), replacement.base, 1);
const solar = kit.spawn('solar'); kit.setOperational(solar, false); checkTint(kit.pools.get('solar'), solar, .16);
kit.setOperational(solar, true); checkTint(kit.pools.get('solar'), solar, 1);
const citizen = kit.spawn('citizen'); kit.setOperational(citizen, false); assert.equal(citizen.operational, true);
assert.ok(base.pools.get('citizen').batches.every(m => m.instanceColor === null));
const vendorSource = await readFile(new URL('./vendor/three.module.js', import.meta.url), 'utf8');
assert.ok(vendorSource.includes("parameters.vertexColors || parameters.instancingColor ? '#define USE_COLOR'"), 'verify actual fragment-stage instance-color guard');
const renderedMaterials = new Set([...base.pools.values()].flatMap(p => p.batches.map(m => m.material)));
assert.equal(renderedMaterials.size, 2, 'one clone per source, never per handle or model type');
for (const material of renderedMaterials) {
  const original = originals.find(m => m.name === material.name);
  assert.notEqual(material, original); assert.equal(material.map, original.map);
  const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
  material.onBeforeCompile(shader);
  assert.match(shader.fragmentShader, /#if defined\( USE_COLOR \) \|\| defined\( USE_INSTANCING_COLOR \)\s+totalEmissiveRadiance \*= vColor.rgb;/);
  assert.ok(shader.fragmentShader.indexOf('totalEmissiveRadiance *=') > shader.fragmentShader.indexOf('#include <emissivemap_fragment>'));
  assert.match(THREE.ShaderChunk.color_fragment, /diffuseColor \*= vColor/);
  if (material.name.endsWith('warm_brick')) assert.match(shader.fragmentShader, /buildingWear/);
  else assert.equal(material.roughness, .22);
  assert.match(material.customProgramCacheKey(), /citisten-operational-v1/);
}
assert.deepEqual(originals.map(m => JSON.stringify(m.toJSON())), originalJSON);
const dark = handles.find(h => h.alive && !h.operational);
base.update(null, 1, 0); checkTint(base.pools.get('residential'), dark.base, .16);
base.update(null, 0, 0); checkTint(base.pools.get('residential'), dark.base, .16);
const colorBuffer = kit.pools.get('apartments').batch.instanceColor;
const colorVersion = colorBuffer.version; kit.setOperational(dark, false);
assert.equal(colorBuffer.version, colorVersion, 'unchanged status does not upload tint');
kit.setOperational(dark, true); checkTint(kit.pools.get('apartments'), dark, 1); checkTint(base.pools.get('residential'), dark.base, 1);
let cloneDisposals = 0;
for (const material of renderedMaterials) material.addEventListener('dispose', () => cloneDisposals++);
kit.dispose(); kit.dispose(); assert.equal(modelScene.children.length, 0); assert.equal(cloneDisposals, 2);
sourceGeometry.dispose(); for (const original of originals) original.dispose(); map.dispose();
console.log('EVENT/TINT CHECK PASS: pause/time/severity/targets/expiry/clear/new-load/new-game/dispose; shared diffuse+emissive shader, glass/wear/maps, white defaults, pre-ready status, mobile exclusion, compaction, 16/32/64 reallocations, supplement delegation');
console.log('LIMIT: shader strings and Three CPU buffers, not GPU compilation or native visual/performance acceptance.');
