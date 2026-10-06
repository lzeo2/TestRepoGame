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
  view.draw(fixtureProfile, fixtureRun, 0, 1/120, {...fixtureRun,world:{x:0,z:.1,heading:.69}}, .5);
  assert.equal(view.inspect().pose.z, .05);
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
// Fixed 60Hz snapshots displayed at 120Hz: no duplicate low-speed half-step poses.
const base = {...run,id:200,mode:'sandbox',elapsed:0,collisions:0,speed:.6,distance:0,world:{x:0,z:0,heading:0},traffic:[],police:[],rivals:[]};
let older = base;
view.setCamera('cockpit'); view.draw(profile,base,0,0);
const raw = [], smooth = [];
for (let tick=1;tick<=6;tick++) {
  const current = {...base,elapsed:tick/60,distance:tick*.01,world:{x:0,z:-tick*.01,heading:0}};
  for (const alpha of [0,.5]) {
    view.draw(profile,current,0,1/120,older,alpha);
    const actual=view.inspect(); raw.push(current.world.z); smooth.push(actual.pose.z);
    assert(Math.abs(actual.pose.z-current.world.z)<=.010000001,'at most one simulation tick behind');
    assert(Math.abs(actual.renderElapsed-(older.elapsed+alpha/60))<1e-10);
    assert.equal(actual.worldMode,'sandbox'); assert.equal(actual.cityBlocks,36);
  }
  older=current;
}
assert(raw.some((z,i)=>i>0&&z===raw[i-1]));
assert(smooth.every((z,i)=>i===0||z<smooth[i-1]),'every half-step advances');
const ahead={...older,distance:.07,elapsed:7/60,world:{x:0,z:-.07,heading:0}};
view.draw(profile,ahead,0,1/120,older,.5);
const frozenPose=view.inspect();
for(let i=0;i<3;i++) {
  view.draw(profile,ahead,0,0,older,.5);
  assert.deepEqual(view.inspect().pose,frozenPose.pose,'explicit pause snapshot retains rendered pose');
  assert.deepEqual(view.inspect().camera,frozenPose.camera);
  assert.equal(view.inspect().wheelAngle,frozenPose.wheelAngle);
}
view.draw(profile,ahead,0,0); assert.deepEqual(view.inspect().pose,ahead.world,'default paused draw snaps actual');
for(const [alpha,expected] of [[NaN,1],[Infinity,1],[-1,0],[2,1],[undefined,1]]) {
  view.draw(profile,ahead,0,1/120,older,alpha);
  assert.equal(view.inspect().renderAlpha,expected);
  assert(Math.abs(view.inspect().pose.z-(older.world.z+(ahead.world.z-older.world.z)*expected))<1e-10);
}
for(const previous of [null,{}, {...older,world:undefined,distance:undefined,elapsed:undefined}]) {
  view.draw(profile,ahead,0,1/120,previous,.5);
  assert.deepEqual(view.inspect().pose,ahead.world,'nullable/old-shaped previous falls back');
}
for(const changed of [{id:201},{mode:'roam'},{collisions:1},{status:'busted'}]) {
  const current={...ahead,...changed}; view.draw(profile,current,0,1/120,older,.2);
  assert.equal(view.inspect().renderAlpha,1); assert.deepEqual(view.inspect().pose,current.world);
}
const wrapped={...ahead,id:210,world:{x:0,z:0,heading:-Math.PI+.01}};
view.draw(profile,wrapped,0,1/120,{...wrapped,world:{x:0,z:0,heading:Math.PI-.01}},.5);
assert(Math.abs(Math.abs(view.inspect().pose.heading)-Math.PI)<1e-10);
// Reverse uses signed actual displacement, not speed or cumulative mileage.
const reversing={...base,id:220,speed:-6}; view.draw(profile,reversing,0,1/60);
const backed={...reversing,distance:.1,world:{x:0,z:.1,heading:0}};
view.draw(profile,backed,0,1/120,reversing,.5); const reverseWheel=view.inspect().wheelAngle;
assert(reverseWheel>0);
view.draw(profile,backed,0,1/120,backed,1); assert(view.inspect().wheelAngle>reverseWheel);
const blockedAngle=view.inspect().wheelAngle;
view.draw(profile,{...backed,distance:.2},0,1/60); assert.equal(view.inspect().wheelAngle,blockedAngle,'blocked reverse cannot spin');
const civilian=(id,z)=>({id,carId:'pip',x:0,distance:-z,world:{x:0,z,heading:0}});
const trafficBefore={...base,id:230,traffic:[civilian(1,-5),civilian(2,-10)]};
const trafficNow={...trafficBefore,traffic:[civilian(1,-5.1),civilian(3,-15)]};
view.draw(profile,trafficBefore,0,1/60);
view.draw(profile,trafficNow,0,1/120,trafficBefore,.5);
let observedTraffic=view.inspect().trafficModels;
assert.deepEqual(observedTraffic.map(e=>e.entityId),[1,3],'despawn removed; spawn is not interpolated from another ID');
assert.equal(observedTraffic[0].pose.z,-5.05); assert.equal(observedTraffic[1].pose.z,-15);
assert(observedTraffic[0].wheelAngle<0); assert.equal(observedTraffic[1].wheelAngle,0);
view.draw(profile,trafficNow,0,1/120,trafficBefore,.5);
assert.deepEqual(view.inspect().trafficModels,observedTraffic,'same displayed NPC pose has no wheel jitter');
view.draw(profile,trafficNow,0,0,trafficBefore,.5);
assert.deepEqual(view.inspect().trafficModels,observedTraffic,'paused NPC frozen');
const highwayBefore={...highwayRun,id:240,distance:20,x:0,elapsed:0,collisions:0};
const highwayAfter={...highwayBefore,distance:20.1,x:.1,elapsed:1/60,traffic:[{id:1,carId:'pip',distance:30.2,x:1}]};
view.draw(profile,highwayAfter,0,1/120,{...highwayBefore,traffic:[{id:1,carId:'pip',distance:30,x:0}]},.5);
assert.equal(view.inspect().renderDistance,20.05); assert.equal(view.inspect().pose.x,.05);
assert.equal(view.inspect().trafficModels[0].pose.x,.5);
assert(Math.abs(view.inspect().trafficModels[0].pose.z+10.05)<1e-10);
view.draw(profile,null); assert.equal(view.inspect().camera.mode,'garage');
view.dispose(); view.dispose();
for (const [resource, count] of tracked) assert.equal(count, 1, `resource disposed once: ${resource.type || resource.name}`);
assert(firstInstances.length >= 12);
delete globalThis.__cityTrack; delete globalThis.__CityRenderer; delete globalThis.document;
console.log(`PASS: 36 collision-aligned bases; ${city.userData.batches} static architecture batches, ${instances} instances, ${triangles} triangles; glazing/recess/roof/bounds/resize/disposal; chase lag/wrap/pause/cover and all16 physical cockpit transforms. 60/120Hz interpolation, guard/pause/NPC/reverse/highway checks. Synthetic drawing, not native visual acceptance or owner-device FPS/choppiness proof.`);
