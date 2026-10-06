// Geometry/source regression only; not browser visual or target-device FPS proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createCityArchitecture } from '../Games/Slipstream Borough/view.js';
import { WORLD, blocked } from '../Games/Slipstream Borough/world.js';
import { CARS } from '../assets/car-arcade/fleet.js';
import { createCar } from '../assets/car-arcade/models.js';

const box = new THREE.BoxGeometry(1, 1, 1), pane = new THREE.PlaneGeometry(1, 1);
const materials = [];
const city = createCityArchitecture(box, color => {
  const m = new THREE.MeshLambertMaterial({ color }); materials.push(m); return m;
}, pane);
const batches = Object.fromEntries(city.children.map(m => [m.name, m]));
assert.equal(WORLD.blocks.length, 36);
assert.equal(batches['city-plinth'].count, 36);
assert.equal(batches['city-paving'].count, 36);
assert(city.userData.batches <= 12);
assert(city.userData.triangles <= 50000);
const matrix = new THREE.Matrix4(), bounds = new THREE.Box3();
function instanceBounds(mesh, i) {
  mesh.getMatrixAt(i, matrix);
  mesh.geometry.computeBoundingBox();
  return bounds.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);
}
let triangles = 0, instances = 0;
for (const mesh of city.children) {
  assert(mesh.isInstancedMesh);
  assert(mesh.geometry === box || mesh.geometry === pane);
  assert(!mesh.material.transparent, 'no transparent sorting/extra city passes');
  assert(mesh.boundingBox && mesh.boundingSphere);
  triangles += mesh.count * mesh.geometry.index.count / 3; instances += mesh.count;
  for (let i = 0; i < mesh.count; i++) {
    const b = instanceBounds(mesh, i);
    for (const n of [...b.min.toArray(), ...b.max.toArray()]) assert(Number.isFinite(n));
    assert(b.max.x <= WORLD.limit && b.min.x >= -WORLD.limit);
    assert(b.max.z <= WORLD.limit && b.min.z >= -WORLD.limit);
    const paving = mesh.name === 'city-paving', margin = paving ? 1.5 : 0;
    assert(WORLD.blocks.some(w => b.min.x >= w.x - w.width / 2 - margin - 1e-5 &&
      b.max.x <= w.x + w.width / 2 + margin + 1e-5 &&
      b.min.z >= w.z - w.depth / 2 - margin - 1e-5 &&
      b.max.z <= w.z + w.depth / 2 + margin + 1e-5 && b.max.y <= w.height + 3.1), mesh.name);
    if (paving) assert(b.max.y <= 0, 'no raised uncollidable street props');
  }
}
assert.equal(triangles, city.userData.triangles); assert.equal(instances, city.userData.instances);
for (const [i, w] of WORLD.blocks.entries()) {
  const b = instanceBounds(batches['city-plinth'], i);
  assert.equal(b.min.x, w.x - 14); assert.equal(b.max.x, w.x + 14);
  assert.equal(b.min.z, w.z - 14); assert.equal(b.max.z, w.z + 14);
  assert(blocked(w.x, w.z));
}
assert(batches['city-glazing'].count > 1000, 'windows on all elevations plus storefronts');
assert(batches['city-transom'].count > 1000, 'window frame detail');
assert(batches['city-roof'].count > 36, 'roof silhouette detail');
assert.equal(batches['city-awning'].count, 36 * 4);
// Window panes are physically recessed behind the piers, with no hidden street solids.
for (let i = 0; i < batches['city-glazing'].count; i++) {
  const b = instanceBounds(batches['city-glazing'], i);
  const center = b.getCenter(new THREE.Vector3());
  const w = WORLD.blocks.find(w => Math.abs(center.x - w.x) < 14 && Math.abs(center.z - w.z) < 14);
  assert(w);
  if (center.y < w.height) assert(Math.abs(Math.max(Math.abs(center.x - w.x), Math.abs(center.z - w.z)) - 13.63) < .001);
}
const source = readFileSync(new URL('../Games/Slipstream Borough/view.js', import.meta.url), 'utf8');
assert(source.includes('instance(cityBuildings, i, b.x, b.height / 2, b.z, b.width, b.height, b.depth)'));
assert(source.includes('ray.intersectObject(cityBuildings, false)'));
assert(source.includes('const height = Math.max(1, host.clientHeight)'));
assert(!source.includes('innerHeight *'));
assert(source.includes('renderer.setPixelRatio(1)'));
const draw = source.slice(source.indexOf('  function draw('), source.indexOf('  function inspect('));
assert(!draw.includes('createCityArchitecture('));
assert(!draw.includes('new THREE.InstancedMesh'));
assert(source.includes('scene.traverse(object => { if (object.isInstancedMesh) object.dispose(); })'));
assert(source.includes('if (disposed) return; disposed = true;'));
let disposed = 0;
for (const resource of [...city.children, box, pane, ...materials]) resource.addEventListener('dispose', () => disposed++);
city.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
for (const r of [box, pane, ...materials]) r.dispose();
assert.equal(disposed, city.children.length + 2 + materials.length);
// Exercise the real view lifecycle with only WebGL/2D drawing stubbed. No core or save grants.
const tracked = new Map();
function track(resource) {
  if (!tracked.has(resource)) {
    tracked.set(resource, 0);
    resource.addEventListener('dispose', () => tracked.set(resource, tracked.get(resource) + 1));
  }
  return resource;
}
globalThis.__cityTrack = track;
let renderedScene;
globalThis.__CityRenderer = class {
  constructor() { this.domElement = {width:0, height:0}; this.info = {render:{triangles:0,calls:0},memory:{geometries:0,textures:0}}; }
  setPixelRatio() {} setClearColor() {} dispose() {}
  setSize(width, height) { this.domElement.width = width; this.domElement.height = height; }
  render(scene) {
    renderedScene = scene;
    scene.traverse(o => {
      if (o.isInstancedMesh) track(o);
      if (o.isMesh) { track(o.geometry); track(o.material); if (o.material.map) track(o.material.map); }
    });
  }
};
globalThis.document = {createElement() { return {width:0,height:0,getContext() { return {fillRect() {}, fillText() {}, clearRect() {}}; }}; }};
const instrumented = source.replace(/from '([^']+)'/g, (_, path) => `from '${new URL(path, new URL('../Games/Slipstream Borough/view.js', import.meta.url)).href}'`)
  .replace('import * as THREE from', 'import * as NativeThree from')
  .replace('export function createCityArchitecture', 'const THREE = {...NativeThree, WebGLRenderer: globalThis.__CityRenderer};\nexport function createCityArchitecture')
  .replace('resources.push(resource);', 'resources.push(globalThis.__cityTrack(resource));');
const {createView} = await import(`data:text/javascript;base64,${Buffer.from(instrumented).toString('base64')}`);
const host = {clientWidth:390,clientHeight:610,replaceChildren() {},addEventListener() {},removeEventListener() {}};
const view = createView(host);
const appearance = {paint:'#aa9988',wheels:'#666666',stripe:'#ffffff',spoiler:false,gadget:'none'};
const profile = {selected:'bricklet',customizations:{bricklet:appearance}};
view.draw(profile, null);
const firstInstances = [...tracked.keys()].filter(r => r.isInstancedMesh);
appearance.stripe = null;
view.draw(profile, null);
const run = {id:1,mode:'roam',status:'running',carId:'bricklet',appearance,gadget:'none',world:{x:0,z:0,heading:0},distance:0,traffic:[],police:[],rivals:[]};
view.draw(profile, run);
const architecture = renderedScene.getObjectByName('city-masonry').parent;
const frozen = architecture.children.map(m => Array.from(m.instanceMatrix.array));
view.draw(profile, run);
assert.deepEqual(architecture.children.map(m => Array.from(m.instanceMatrix.array)), frozen);
assert.equal(view.inspect().cityBlocks, 36);
assert.equal(view.inspect().cityArchitecture.triangles, triangles);
// Synthetic camera fixtures: real transforms/raycast, only GPU drawing stubbed.
assert.throws(() => view.setCamera('free'), RangeError);
const initialCamera = view.inspect().camera;
assert.equal(initialCamera.mode, 'chase');
assert(initialCamera.carScreen[1] > .55 && initialCamera.carScreen[1] < .85, 'road ahead; car below screen center');
run.world = {x:1,z:0,heading:Math.PI/2};
view.draw(profile, run, 1, 1/60);
assert(view.inspect().camera.heading > 0 && view.inspect().camera.heading < Math.PI/2, 'turn lag rather than rigid yaw');
assert(Math.abs(view.inspect().camera.target[0])<.2 && view.inspect().camera.target[2]<-7.8,'aim follows smoothed heading, not an instantaneous steering kick');
const pausedCamera = view.inspect().camera;
view.draw(profile, run, 0, 0); assert.deepEqual(view.inspect().camera, pausedCamera, 'pause freezes smoothing');
run.id = 2; run.world = {x:0,z:0,heading:Math.PI-.01}; view.draw(profile, run, 0, 1/60);
const beforeWrap = view.inspect().camera.heading;
run.world.heading = -Math.PI+.01; view.draw(profile, run, 0, 1/60);
assert(Math.abs(view.inspect().camera.heading-beforeWrap)<.02, 'short turn across signed PI');
view.setCamera('cockpit');
for (const [i,car] of CARS.entries()) {
  const fixtureProfile = {selected:car.id,customizations:{[car.id]:appearance}};
  const fixtureRun = {...run,id:10+i,carId:car.id,world:{x:0,z:0,heading:.7}};
  view.draw(fixtureProfile, fixtureRun);
  const observed = view.inspect().camera;
  assert.equal(observed.mode, 'cockpit'); assert.equal(observed.near,.025); assert.equal(observed.fov,70);
  assert(observed.target[1]<observed.eye[1], 'slight roadward pitch, real driver eye unchanged');
  observed.localEye.forEach((n,j) => assert(Math.abs(n-observed.driverEye[j])<1e-9, `${car.id} physical driver eye`));
  assert.equal(createCar(car.id).getObjectByName('glazing').material.opacity,.38,'player tint never mutates shared/NPC glass');
}
view.setCamera('chase'); run.id=99; run.world={x:0,z:25,heading:Math.PI/2};
view.draw(profile,run); assert(view.inspect().camera.eye[0]<11, 'obstruction resolved after smoothing');
const highwayRun = {...run,id:100,mode:'race',x:0,distance:20,traffic:[],police:[],rivals:[]};
view.draw(profile,highwayRun,1,1/60);
assert(Math.abs(view.inspect().pose.heading)<=.04,'bounded cosmetic highway steering');
const highwayPose = view.inspect().pose;
view.draw(profile,highwayRun,-1,0); assert.deepEqual(view.inspect().pose,highwayPose,'paused highway car does not whip to neutral');
assert(view.inspect().highwayScenery.visible && view.inspect().highwayScenery.windows>1500);
assert(view.inspect().highwayScenery.triangles<=12000 && view.inspect().highwayScenery.batches===3);
assert.equal(view.inspect().contactShadows,3,'three feathered contact discs in one batch');
view.draw(profile,null); assert.equal(view.inspect().camera.mode,'garage');
view.dispose(); view.dispose();
for (const [resource, count] of tracked) assert.equal(count, 1, `resource disposed once: ${resource.type || resource.name}`);
assert(firstInstances.length >= 12);
delete globalThis.__cityTrack; delete globalThis.__CityRenderer; delete globalThis.document;
console.log(`PASS: 36 collision-aligned bases; ${city.userData.batches} static architecture batches, ${instances} instances, ${triangles} triangles; glazing/recess/roof/bounds/resize/disposal; chase lag/wrap/pause/cover and all16 physical cockpit transforms. Synthetic drawing, not native visual acceptance.`);
