// node scripts/citisten_render_temporal_check.mjs
// Real local Three/daynight/atmosphere/effects; vendor shadow function, GL calls doubled.
// No pixels, browser input, native acceptance, or product-fix claim.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as T from '../Games/Citisten3D/vendor/three.module.js';
import { createDayNight } from '../Games/Citisten3D/daynight.mjs';
import { createAtmosphere } from '../Games/Citisten3D/atmosphere.mjs';
import { createBuildingSurface } from '../Games/Citisten3D/building-surfaces.mjs';
import { createWorldEffects } from '../Games/Citisten3D/world-effects.mjs';
import { createCityEventEffects } from '../Games/Citisten3D/city-event-effects.mjs';
import { RoadGrid } from '../Games/Citisten3D/roads.mjs';

const root = new URL('../Games/Citisten3D/', import.meta.url);
const vendor = await readFile(new URL('vendor/three.module.js', root), 'utf8');
const world = await readFile(new URL('world.mjs', root), 'utf8');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert(a >= 0 && b > a, `Source anchor missing: ${start}`);
  return text.slice(a, b).trim();
}
const delta = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
let cases = 0;
function check(name, run) { run(); cases++; console.log(`PASS ${name}`); }

// Execute the real world render body to retain its actual ordering. Dependencies
// here only record calls; the following cases execute the actual matrix owners.
check('world render ordering (dependency doubles)', () => {
  const calls = [], hit = name => () => calls.push(name);
  const color = { copy() {} };
  const context = { loaded: true, disposed: false, width: 1280, height: 800,
    canvas: { clientWidth: 1280, clientHeight: 800 }, Math,
    gridLines: { material: { color } }, camera: {},
    dayNight: { lights: { ambient: { color }, sun: { intensity: 2 } }, daylight: 1, follow: hit('follow') },
    controls: { update: hit('controls') }, roadPool: { sync: hit('roads') },
    buildings: { update: hit('buildings') }, streetLamps: { update: hit('lamps') },
    atmosphere: { update: hit('atmosphere') }, blockAO: { update: hit('AO') },
    terrain: { update: hit('terrain') }, scene: { fog: { color } },
    renderer: { render: hit('render') }, effects: { update: hit('effects') } };
  const body = section(world, 'function render(dt = 0)', '\n  return {\n    renderer');
  vm.runInNewContext(`(${body})(0.1)`, context);
  assert.deepEqual(calls, ['controls', 'roads', 'follow', 'buildings', 'lamps', 'atmosphere', 'AO', 'terrain', 'render', 'effects']);
});

// Execute unmodified WebGLShadowMap with CPU render targets and no-op GL state.
// Empty VSM shader strings are explicit doubles; the PCF path never compiles them.
const ShadowMap = vm.runInNewContext(`(${section(vendor, 'function WebGLShadowMap(', '\nfunction WebGLState(')})`,
  { ...T, vertex: '', fragment: '', warn: message => { throw Error(message); } });
const scene = new T.Scene(), camera = new T.PerspectiveCamera(60, 1.6, .5, 5000);
const day = createDayNight(scene), environment = scene.environment;
const environmentBytes = environment.image.data.slice(), environmentVersion = environment.version;
let clears = 0, draws = 0, disposals = 0;
const observedMaps = new WeakSet();
const noop = () => {};
const renderer = { getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
  setRenderTarget: noop, clear() { clears++; }, renderBufferDirect() { draws++; },
  state: { setBlending: noop, setScissorTest: noop, viewport: noop,
    buffers: { depth: { getReversed: () => false, setTest: noop }, color: { setClear: noop } } } };
const shadows = new ShadowMap(renderer, { update: object => object.geometry }, { maxTextureSize: 4096 });
shadows.enabled = true;
const caster = new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial());
caster.castShadow = true; caster.frustumCulled = false; scene.add(caster);
const lights = [day.lights.sun, day.lights.moon];
const bias = new T.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
// These two unmodified lines are the non-XR WebGLRenderer scene/camera update.
const updateGraph = section(vendor, 'if ( scene.matrixWorldAutoUpdate === true ) scene.updateMatrixWorld();',
  '\n\t\t\tif ( xr.enabled');
const updateMatrices = vm.runInNewContext(`(scene, camera) => { ${updateGraph} }`);
let frames = 0, maxShadowError = 0;
function frame(phase, x, y, z) {
  day.setPhase(phase); camera.position.set(x, y, z); day.follow(camera);
  updateMatrices(scene, camera);
  shadows.render(lights.filter(light => light.castShadow), scene, camera);
  for (const light of lights) {
    assert.deepEqual(new T.Vector3().setFromMatrixPosition(light.target.matrixWorld).toArray(), [x, 0, z]);
    if (!light.castShadow) { assert.equal(light.shadow.map, null); continue; }
    const radius = Math.max(75, Math.min(360, y * .9));
    const oracle = new T.OrthographicCamera(-radius, radius, radius, -radius, 1, 1300);
    oracle.position.copy(light.position); oracle.lookAt(new T.Vector3(x, 0, z)); oracle.updateMatrixWorld();
    const expected = bias.clone().multiply(oracle.projectionMatrix).multiply(oracle.matrixWorldInverse);
    const error = delta(expected.elements, light.shadow.matrix.elements);
    maxShadowError = Math.max(maxShadowError, error); assert(error < 1e-12);
    assert.deepEqual(light.shadow.camera.projectionMatrix.elements, oracle.projectionMatrix.elements);
    const map = light.shadow.map;
    if (!observedMaps.has(map)) {
      observedMaps.add(map); map.addEventListener('dispose', () => disposals++);
    }
  }
  frames++;
}
check('shadow projection/target freshness through active-inactive transitions', () => {
  for (const phase of [.5, .25, 0, .75, .5, 0, .5]) {
    for (const [x, y, z] of [[0, 215, 180], [40, 80, -50], [-90, 400, 75]]) frame(phase, x, y, z);
  }
  assert(disposals >= 4); assert(draws > 0 && clears === draws);
});
check('same-state shadow result independent of prior activation history', () => {
  frame(.5, 5, 215, 180);
  const before = day.lights.sun.shadow.matrix.elements.slice(), map = day.lights.sun.shadow.map;
  frame(.5, 5, 215, 180); assert.equal(day.lights.sun.shadow.map, map);
  frame(0, -400, 80, 300); frame(.5, 5, 215, 180);
  assert.notEqual(day.lights.sun.shadow.map, map);
  assert.deepEqual(day.lights.sun.shadow.matrix.elements, before);
});
check('negative control detects stale target matrix (not a product reproduction)', () => {
  const sun = day.lights.sun, correct = sun.shadow.matrix.elements.slice();
  const targetMatrix = sun.target.matrixWorld.clone();
  sun.target.matrixWorld.makeTranslation(0, 0, 0); sun.shadow.updateMatrices(sun);
  assert(delta(correct, sun.shadow.matrix.elements) > 1e-5);
  sun.target.matrixWorld.copy(targetMatrix); sun.shadow.updateMatrices(sun);
  assert.deepEqual(sun.shadow.matrix.elements, correct);
});
check('environment identity/version/bytes retained across phase transitions', () => {
  assert.equal(scene.environment, environment); assert.equal(environment.version, environmentVersion);
  assert.deepEqual(environment.image.data, environmentBytes);
});

const atmosphere = createAtmosphere(scene, 1000);
const original = new T.MeshStandardMaterial(); original.name = 'commercial__warm_brick';
const surface = createBuildingSurface(original), mesh = new T.Mesh(caster.geometry, surface); scene.add(mesh);
check('fog/surface hook identity and live shared uniforms, without compilation', () => {
  atmosphere.update(camera, day.daylight, day.sunDirection, 0);
  const hook = surface.onBeforeCompile, key = surface.customProgramCacheKey(), version = surface.version;
  const shader = { uniforms: {}, vertexShader: T.ShaderLib.standard.vertexShader, fragmentShader: T.ShaderLib.standard.fragmentShader };
  surface.onBeforeCompile(shader, renderer);
  assert.equal(shader.uniforms.cityFogSun, atmosphere.uniforms.cityFogSun);
  assert(shader.fragmentShader.includes('buildingWear'));
  for (let i = 0; i < 16; i++) {
    day.setPhase(i / 16); atmosphere.update(camera, day.daylight, day.sunDirection, 0);
    assert.equal(surface.onBeforeCompile, hook); assert.equal(surface.customProgramCacheKey(), key);
    assert.equal(surface.version, version);
    assert.equal(shader.uniforms.cityFogDay.value, day.daylight);
    assert.deepEqual(shader.uniforms.cityFogSun.value.toArray(), day.sunDirection.toArray());
  }
  assert.equal(shader.fragmentShader.split('uniform float cityFogDensity;').length - 1, 1);
  assert.equal(atmosphere.particles.material.depthWrite, false);
});

const roads = new RoadGrid(200, 10), events = createCityEventEffects(scene, roads);
check('event instance active range clears then refills before rendering', () => {
  const state = { time: 1, terrainLayout: 'legacy-flat', buildings: [{ id: 1, type: 'residential', x: 100, z: 100, hp: 100 }],
    incidents: { active: [{ type: 'fire', buildingIds: [1], severity: .5, remaining: 5 }] } };
  events.sync(state);
  const flames = scene.children.find(node => node.name === 'city-event-flames');
  const before = flames.instanceMatrix.array.slice(0, flames.count * 16);
  assert.equal(flames.count, 3); assert.equal(flames.visible, true);
  events.clear(); assert.equal(flames.count, 0); assert.equal(flames.visible, false);
  events.sync(state); assert.deepEqual(flames.instanceMatrix.array.slice(0, flames.count * 16), before);
  const flood = scene.children.find(node => node.name === 'city-event-flood');
  assert.equal(flood.material.transparent, true); assert.equal(flood.material.depthWrite, false);
});
check('post-render expiry mutates only shot buffers, not scene/camera transforms', () => {
  const fx = createWorldEffects(scene, roads), line = scene.children.at(-2), impact = scene.children.at(-1);
  fx.shot({ x: 100, z: 100 }, { x: 101, z: 100 }); updateMatrices(scene, camera);
  const nodes = scene.children.map(node => node.matrixWorld.elements.slice()), cam = camera.matrixWorld.elements.slice();
  const positions = line.geometry.attributes.position.array.slice();
  assert.equal(fx.active, 1); fx.update(.25); assert.equal(fx.active, 0);
  assert.notDeepEqual(line.geometry.attributes.position.array, positions);
  assert.equal(impact.geometry.attributes.position.getY(0), -100);
  assert.deepEqual(scene.children.map(node => node.matrixWorld.elements.slice()), nodes);
  assert.deepEqual(camera.matrixWorld.elements, cam); fx.dispose();
});

events.dispose(); atmosphere.dispose(); day.dispose();
caster.geometry.dispose(); caster.material.dispose(); surface.dispose(); original.dispose();
assert.equal(await readFile(new URL('vendor/three.module.js', root), 'utf8'), vendor);
assert.equal(await readFile(new URL('world.mjs', root), 'utf8'), world);
console.log(`RENDER TEMPORAL PASS: ${cases} cases; ${frames} shadow frames; max matrix error ${maxShadowError}; no reproduced product defect, no pixels`);
