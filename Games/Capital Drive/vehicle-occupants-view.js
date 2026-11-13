import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar } from '../../assets/car-arcade/models.js';
import { BY_ID } from '../../assets/car-arcade/fleet.js';

const DRIVER_LIMIT = 64, EXIT_LIMIT = 12, EXIT_LIFE = 12, CULL_DISTANCE = 300;
const finite = value => Number.isFinite(value) ? value : 0;
const valid = pose => pose && Number.isFinite(pose.x) && Number.isFinite(pose.z);

// Original adults, seated relative to the inherited left-seat cockpit, plus
// temporary displaced adults. No car-factory resources are modified or owned.
export function createVehicleOccupantsView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Vehicle occupants'; scene.add(root);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const geometries = [], meshes = [], cabins = new Map();
  function geometry(parts) {
    const temporary = parts.map(([color, position, size]) => {
      const part = new THREE.BoxGeometry(...size); part.translate(...position);
      const rgb = new THREE.Color(color), colors = new Float32Array(part.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors,i);
      part.setAttribute('color',new THREE.BufferAttribute(colors,3)); return part;
    });
    const merged = mergeGeometries(temporary,false);
    for (const part of temporary) part.dispose();
    geometries.push(merged); return merged;
  }
  function batch(name, parts, limit) {
    const mesh = new THREE.InstancedMesh(geometry(parts),material,limit);
    mesh.name = name; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    root.add(mesh); meshes.push(mesh); return mesh;
  }
  const skin = 0xbf8b68, shirt = 0x977747, trousers = 0x364555, hair = 0x3b3029;
  // Origin is the cockpit eye. Bent thighs/shins stay below the dashboard;
  // forearms reach toward the wheel and the head remains below the roof.
  const drivers = batch('Seated adult drivers',[
    [skin,[0,-.015,0],[.22,.25,.21]], [hair,[0,.10,.025],[.23,.07,.20]],
    [skin,[0,-.18,.01],[.12,.12,.12]], [shirt,[0,-.34,.035],[.36,.32,.22]],
    [trousers,[-.10,-.54,-.10],[.15,.14,.35]], [trousers,[.10,-.54,-.10],[.15,.14,.35]],
    [trousers,[-.10,-.70,-.25],[.13,.30,.14]], [trousers,[.10,-.70,-.25],[.13,.30,.14]],
    ...[-1,1].flatMap(side => [[shirt,[side*.22,-.31,-.06],[.12,.25,.14]], [shirt,[side*.20,-.37,-.20],[.12,.12,.28]], [skin,[side*.19,-.36,-.36],[.10,.10,.10]]]),
  ],DRIVER_LIMIT);
  const torsos = batch('Displaced adult torsos',[
    [shirt,[0,1.23,0],[.44,.56,.26]], [trousers,[0,.91,0],[.38,.16,.24]],
    [skin,[0,1.58,0],[.14,.14,.14]], [skin,[0,1.74,0],[.26,.30,.24]], [hair,[0,1.88,.015],[.27,.08,.25]],
  ],EXIT_LIMIT);
  const legs = batch('Displaced adult legs',[[trousers,[0,-.38,0],[.16,.76,.18]],[0x292b2b,[0,-.83,-.055],[.18,.12,.29]]],EXIT_LIMIT*2);
  const arms = batch('Displaced adult arms',[[shirt,[0,-.23,0],[.15,.46,.18]],[skin,[0,-.53,0],[.10,.13,.11]]],EXIT_LIMIT*2);
  const exits = Array.from({length: EXIT_LIMIT},() => ({life:0,id:null,x:0,z:0,yaw:0,age:0}));
  const pose = new THREE.Object3D(), limb = new THREE.Object3D(), combined = new THREE.Matrix4();
  let disposed = false, nextExit = 0;
  const counters = {drivers:0,exits:0,drawCalls:0};
  const ground = (x,z) => finite(heightAt(x,z));
  function near(value,focus) { return valid(value) && Math.hypot(value.x-focus.x,value.z-focus.z)<CULL_DISTANCE; }
  function addExit(value) {
    if (disposed || !valid(value)) return false;
    if (value.id != null && exits.some(exit => exit.life > 0 && exit.id === value.id)) return false;
    const exit = exits.find(item => item.life <= 0) || exits[nextExit++ % EXIT_LIMIT];
    Object.assign(exit,{id:value.id,x:value.x,z:value.z,yaw:finite(value.yaw),life:EXIT_LIFE,age:0}); return true;
  }
  function update(dt,{cars = [],focus = {x:0,z:0}} = {}) {
    if (disposed) return;
    const step = Math.max(0,Math.min(.1,finite(dt))), center = valid(focus) ? focus : {x:0,z:0};
    counters.drivers = counters.exits = 0;
    for (const car of cars) {
      if (counters.drivers === DRIVER_LIMIT) break;
      if (car?.active === false || !car?.occupied || !near(car,center)) continue;
      const id = Object.hasOwn(BY_ID,car.modelId) ? car.modelId : 'relay';
      if (!cabins.has(id)) cabins.set(id,createCar(id).userData.cockpit.eye);
      const eye = cabins.get(id), yaw = finite(car.yaw), c = Math.cos(yaw), s = Math.sin(yaw);
      pose.position.set(car.x + eye[0]*c + eye[2]*s,ground(car.x,car.z)+eye[1],car.z-eye[0]*s+eye[2]*c);
      pose.rotation.set(0,yaw,0); pose.updateMatrix(); drivers.setMatrixAt(counters.drivers++,pose.matrix);
    }
    for (const exit of exits) {
      if (exit.life <= 0) continue;
      exit.life = Math.max(0,exit.life-step); exit.age += step;
      // A short cautious retreat, then an upright stance. Positions are visual
      // only and never become collision or witness state.
      const distance = Math.min(1.6,exit.age*.8);
      const x = exit.x-Math.sin(exit.yaw)*distance, z = exit.z-Math.cos(exit.yaw)*distance;
      if (!exit.life || !near({x,z},center)) continue;
      const index = counters.exits++, stride = exit.age < 2 ? Math.sin(exit.age*7)*.30 : 0;
      pose.position.set(x,ground(x,z)+.035,z); pose.rotation.set(0,exit.yaw,0); pose.updateMatrix();
      torsos.setMatrixAt(index,pose.matrix);
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1;
        for (const [mesh,y,offset,swing] of [[legs,.91,.115,stride],[arms,1.46,.29,-stride*.7]]) {
          limb.position.set(sign*offset,y,0); limb.rotation.set(sign*swing,0,mesh === arms ? -sign*.08 : 0); limb.updateMatrix();
          combined.multiplyMatrices(pose.matrix,limb.matrix); mesh.setMatrixAt(index*2+side,combined);
        }
      }
    }
    drivers.count = counters.drivers; torsos.count = counters.exits; legs.count = arms.count = counters.exits*2;
    counters.drawCalls = 0;
    for (const mesh of meshes) { mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true; if (mesh.visible) counters.drawCalls++; }
  }
  return {update,addExit,
    get stats() { return Object.freeze({...counters,driverLimit:DRIVER_LIMIT,exitLimit:EXIT_LIMIT,geometryCount:geometries.length,materialCount:1,disposed}); },
    dispose() { if (disposed) return; disposed = true; scene.remove(root); for (const mesh of meshes) mesh.dispose(); for (const item of geometries) item.dispose(); material.dispose(); counters.drivers = counters.exits = counters.drawCalls = 0; },
  };
}
