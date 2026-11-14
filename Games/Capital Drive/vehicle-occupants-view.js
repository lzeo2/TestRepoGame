import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar } from '../../assets/car-arcade/models.js';
import { BY_ID } from '../../assets/car-arcade/fleet.js';
import { appearanceForPerson, createPersonGeometries, emitPersonParts, PERSON_MODEL } from './person-model.js';

const DRIVER_LIMIT = 64, EXIT_LIMIT = 12, EXIT_LIFE = 12, CULL_DISTANCE = 300, APPEARANCE_LIMIT = 128;
const finite = value => Number.isFinite(value) ? value : 0;
const valid = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);
const PART_COUNTS = Object.freeze({torso:1,head:1,hair:1,arms:2,legs:2,shoes:2,hands:2});

// The pedestrian model supplies every part. Only the pose and the uniform
// cockpit fit change when the same person leaves a car.
export function createVehicleOccupantsView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Vehicle occupants'; scene.add(root);
  const material = new THREE.MeshLambertMaterial();
  const geometries = createPersonGeometries(), meshes = [], batches = {}, cabins = new Map(), appearances = new Map();
  const color = new THREE.Color();
  for (const [name,count] of Object.entries(PART_COUNTS)) {
    const mesh = new THREE.InstancedMesh(geometries[PERSON_MODEL.shapes[name]],material,(DRIVER_LIMIT+EXIT_LIMIT)*count);
    mesh.name = `Vehicle occupant ${name}`; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    // Allocate the instance-color buffer once, before the first update.
    mesh.setColorAt(0,color); root.add(mesh); meshes.push(mesh); batches[name] = mesh;
  }
  const exits = Array.from({length: EXIT_LIMIT},() => ({life:0,id:null,x:0,z:0,yaw:0,age:0,appearance:null}));
  const pose = new THREE.Object3D(), part = new THREE.Object3D(), combined = new THREE.Matrix4();
  const standing = {kind:'standing',stride:0}, seated = {kind:'driver'};
  let disposed = false, nextExit = 0;
  const counters = {drivers:0,exits:0,drawCalls:0};
  const ground = (x,z) => finite(heightAt(x,z));
  const near = (x,z,focus) => Number.isFinite(x) && Number.isFinite(z) && Math.hypot(x-focus.x,z-focus.z)<CULL_DISTANCE;
  function emit(name,x,y,z,sx,sy,sz,shade,rx=0) {
    const mesh = batches[name], index = mesh.count++;
    part.position.set(x,y,z); part.rotation.set(rx,0,0); part.scale.set(sx,sy,sz); part.updateMatrix();
    combined.multiplyMatrices(pose.matrix,part.matrix);
    mesh.setMatrixAt(index,combined); mesh.setColorAt(index,color.set(shade));
  }
  function appearance(value) {
    const id = value.personId ?? value.id;
    if (!appearances.has(id)) {
      if (appearances.size === APPEARANCE_LIMIT) appearances.delete(appearances.keys().next().value);
      appearances.set(id,appearanceForPerson(id));
    }
    return appearances.get(id);
  }
  function addExit(value) {
    if (disposed || !valid(value)) return false;
    if (value.id != null && exits.some(exit => exit.life > 0 && exit.id === value.id)) return false;
    const exit = exits.find(item => item.life <= 0) || exits[nextExit++ % EXIT_LIMIT];
    Object.assign(exit,{id:value.id,x:value.x,z:value.z,yaw:finite(value.yaw),life:EXIT_LIFE,age:0,
      appearance:appearance(value)}); return true;
  }
  function update(dt,{cars = [],focus = {x:0,z:0}} = {}) {
    if (disposed) return;
    const step = Math.max(0,Math.min(.1,finite(dt))), center = valid(focus) ? focus : {x:0,z:0};
    counters.drivers = counters.exits = 0;
    for (const mesh of meshes) mesh.count = 0;
    for (const car of cars) {
      if (counters.drivers === DRIVER_LIMIT) break;
      if (car?.active === false || !car?.occupied || !near(car.x,car.z,center)) continue;
      const id = Object.hasOwn(BY_ID,car.modelId) ? car.modelId : 'relay';
      if (!cabins.has(id)) {
        const eye = createCar(id).userData.cockpit.eye;
        // Fleet height is the actual roof plane, unlike overall mesh bounds,
        // which may include a spoiler or raised lights.
        const scale = Math.min(1,(BY_ID[id].height-eye[1]-.025)/PERSON_MODEL.seatedHeadTop);
        cabins.set(id,{eye,scale});
      }
      const {eye,scale} = cabins.get(id), yaw = finite(car.yaw), c = Math.cos(yaw), s = Math.sin(yaw);
      pose.position.set(car.x + eye[0]*c + eye[2]*s,ground(car.x,car.z)+eye[1],car.z-eye[0]*s+eye[2]*c);
      pose.rotation.set(0,yaw,0); pose.scale.setScalar(scale); pose.updateMatrix();
      emitPersonParts(appearance(car),seated,emit); counters.drivers++;
    }
    for (const exit of exits) {
      if (exit.life <= 0) continue;
      exit.life = Math.max(0,exit.life-step); exit.age += step;
      // A short cautious retreat is visual only, never collision/witness state.
      const distance = Math.min(1.6,exit.age*.8);
      const x = exit.x-Math.sin(exit.yaw)*distance, z = exit.z-Math.cos(exit.yaw)*distance;
      if (!exit.life || !near(x,z,center)) continue;
      pose.position.set(x,ground(x,z)+.035,z); pose.rotation.set(0,exit.yaw,0); pose.scale.setScalar(exit.appearance.height); pose.updateMatrix();
      standing.stride = exit.age < 2 ? Math.sin(exit.age*7)*.30 : 0;
      emitPersonParts(exit.appearance,standing,emit); counters.exits++;
    }
    counters.drawCalls = 0;
    for (const mesh of meshes) {
      mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      if (mesh.visible) counters.drawCalls++;
    }
  }
  return {update,addExit,
    get stats() { return Object.freeze({...counters,driverLimit:DRIVER_LIMIT,exitLimit:EXIT_LIMIT,geometryCount:Object.keys(geometries).length,materialCount:1,appearanceCount:appearances.size,appearanceLimit:APPEARANCE_LIMIT,disposed}); },
    dispose() { if (disposed) return; disposed = true; scene.remove(root); appearances.clear(); cabins.clear(); for (const mesh of meshes) mesh.dispose(); for (const item of Object.values(geometries)) item.dispose(); material.dispose(); counters.drivers = counters.exits = counters.drawCalls = 0; },
  };
}
