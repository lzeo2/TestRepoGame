import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar } from '../../assets/car-arcade/models.js';
import { BY_ID } from '../../assets/car-arcade/fleet.js';
import { PERSON_MODEL, appearanceForPerson, createPersonGeometries, emitPersonParts } from './person-model.js';

const CULL_DISTANCE = 260, SEATED_LIMIT = 2, CAR_LIFT = .18;
const finite = value => Number.isFinite(value) ? value : 0;
const valid = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);

// Presentation only: one original marked Lantern and four fixed shared-model adult pools.
// The controller hides its exterior player actor while the booking is boarded.
export function createRideServiceView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Yoober rides'; scene.add(root);
  const geometries = new Set(), materials = new Set(), cabins = new Map();
  const adultMaterial = new THREE.MeshLambertMaterial({ vertexColors: true }); materials.add(adultMaterial);
  const car = createCar('lantern', { color: '#8b6d9d' }); car.name = 'Yoober Lantern';
  const geometryCopies = new Map(), materialCopies = new Map();
  car.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!geometryCopies.has(mesh.geometry)) { const copy = mesh.geometry.clone(); geometryCopies.set(mesh.geometry, copy); geometries.add(copy); }
    if (!materialCopies.has(mesh.material)) { const copy = mesh.material.clone(); materialCopies.set(mesh.material, copy); materials.add(copy); }
    mesh.geometry = geometryCopies.get(mesh.geometry); mesh.material = materialCopies.get(mesh.material);
  });
  car.visible = false; root.add(car);
  function cabin(factory) {
    const eye = factory.userData.cockpit.eye;
    return { eye, fit: Math.min(1,(factory.userData.dimensions.height-eye[1]+.005)/PERSON_MODEL.seatedHeadTop) };
  }
  cabins.set('lantern',cabin(car));
  function geometry(parts) {
    const temporary = parts.map(([color, position, size]) => {
      const part = new THREE.BoxGeometry(...size); part.translate(...position);
      const rgb = new THREE.Color(color), colors = new Float32Array(part.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
      part.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return part;
    });
    const merged = mergeGeometries(temporary, false);
    for (const part of temporary) part.dispose();
    geometries.add(merged); return merged;
  }
  const personShapes = createPersonGeometries(), partPose = new THREE.Object3D(), shade = new THREE.Color();
  function personBatch(name, id, kind) {
    const parts = [], ranges = [];
    let vertices = 0;
    const appearance = appearanceForPerson(id);
    emitPersonParts(appearance, { kind, stride: 0 }, (part, x, y, z, sx, sy, sz, color, rx = 0) => {
      const shape = personShapes[PERSON_MODEL.shapes[part]].clone();
      partPose.position.set(x,y,z); partPose.rotation.set(rx,0,0); partPose.scale.set(sx,sy,sz); partPose.updateMatrix();
      shape.applyMatrix4(partPose.matrix);
      const count = shape.attributes.position.count, colors = new Float32Array(count * 3);
      shade.set(color); for (let i = 0; i < colors.length; i += 3) shade.toArray(colors,i);
      shape.setAttribute('color', new THREE.BufferAttribute(colors,3)); parts.push(shape);
      ranges.push([vertices,count]); vertices += count;
    });
    const merged = mergeGeometries(parts,false); parts.forEach(part => part.dispose()); geometries.add(merged);
    const mesh = new THREE.InstancedMesh(merged,adultMaterial,1);
    mesh.name = name; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.userData.appearance = appearance;
    // Repeated jobs reuse both geometry and colour storage; only a changed identity recolours it.
    mesh.userData.setPerson = personId => {
      if (mesh.userData.appearance.id === personId) return;
      const next = appearanceForPerson(personId), colors = merged.attributes.color;
      let partIndex = 0;
      emitPersonParts(next,{kind,stride:0},(part,x,y,z,sx,sy,sz,color) => {
        const [offset,count] = ranges[partIndex++]; shade.set(color);
        for (let i=offset; i<offset+count; i++) shade.toArray(colors.array,i*3);
      });
      colors.needsUpdate = true; mesh.userData.appearance = next;
    };
    root.add(mesh); return mesh;
  }
  const waiting = personBatch('Waiting fare adult','yoober-crescent','standing');
  const driver = personBatch('Cancelled Yoober driver','yoober-driver-npc','standing');
  const seated = personBatch('Seated ride passengers','player','passenger');
  const fare = personBatch('Seated ride fare','yoober-crescent','passenger');
  for (const shape of Object.values(personShapes)) shape.dispose();
  const people = [waiting,driver,seated,fare];
  // Original split-bar mark, deliberately drawn from boxes rather than a logo
  // or runtime text. The same small gold/plum badge appears on both doors.
  const roof = car.userData.dimensions.height, width = BY_ID.lantern.width * .93;
  const badges = [[0x503d61,[0,roof+.075,0],[.64,.13,.25]], [0xe6c878,[-.16,roof+.15,0],[.14,.04,.17]], [0xe6c878,[.11,roof+.15,0],[.25,.04,.17]]];
  for (const side of [-1,1]) badges.push(
    [0x503d61,[side*(width/2+.012),.61,.13],[.025,.24,.64]],
    [0xe6c878,[side*(width/2+.028),.61,-.03],[.012,.15,.12]],
    [0xe6c878,[side*(width/2+.028),.61,.23],[.012,.15,.24]],
  );
  const badge = new THREE.Mesh(geometry(badges), adultMaterial); badge.name = 'Original Yoober split-bar badges'; car.add(badge);
  const pose = new THREE.Object3D(), seat = new THREE.Object3D(), combined = new THREE.Matrix4();
  const counters = { cars: 0, waiting: 0, drivers: 0, passengers: 0, playerPassenger: false, farePassenger: false, drawCalls: 0 };
  let disposed = false, wheelAngle = 0;
  const ground = (x,z) => finite(heightAt(x,z));
  const near = (value, focus) => !!valid(value) && value.active !== false && Math.hypot(value.x-focus.x,value.z-focus.z) < CULL_DISTANCE;
  function place(target, value) {
    const yaw = finite(value.yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const pitch = Math.atan2(ground(value.x+fx*2,value.z+fz*2)-ground(value.x-fx*2,value.z-fz*2),4);
    target.position.set(value.x,ground(value.x,value.z)+CAR_LIFT,value.z);
    target.rotation.set(pitch,yaw,0,'YXZ'); target.updateMatrix();
  }
  function passenger(value, focus, mesh) {
    if (counters.passengers >= SEATED_LIMIT || !near(value,focus)) return false;
    const id = Object.hasOwn(BY_ID,value.modelId) ? value.modelId : 'lantern';
    if (!cabins.has(id)) cabins.set(id,cabin(createCar(id)));
    const {eye,fit} = cabins.get(id); place(pose,value);
    seat.position.set(-eye[0],eye[1],eye[2]); seat.scale.setScalar(fit); seat.updateMatrix();
    combined.multiplyMatrices(pose.matrix,seat.matrix); mesh.setMatrixAt(0,combined); mesh.count = 1; counters.passengers++; return true;
  }
  function update(snapshot, { focus = {x:0,z:0}, playerCar = null, job = null, dt = 0 } = {}) {
    if (disposed) return;
    const center = valid(focus) ? focus : {x:0,z:0}, vehicle = snapshot?.car;
    counters.cars = counters.waiting = counters.drivers = counters.passengers = counters.drawCalls = 0;
    counters.playerPassenger = counters.farePassenger = false;
    for (const mesh of people) mesh.count = 0;
    car.visible = near(vehicle,center);
    if (car.visible) {
      place(car,vehicle); counters.cars = 1;
      if (typeof vehicle.color === 'string' && /^#[0-9a-f]{6}$/i.test(vehicle.color)) car.children[0].material.color.set(vehicle.color);
      wheelAngle = (wheelAngle + Math.max(0,Math.min(.1,finite(dt))) * Math.max(-60,Math.min(60,finite(vehicle.speed))) / car.userData.profile.wheelRadius) % (Math.PI*2);
      for (const wheel of car.userData.wheels) wheel.rotation.x = wheelAngle;
      if (snapshot.passenger === true) counters.playerPassenger = passenger(vehicle,center,seated);
    }
    if (job?.type === 'ride') {
      const personId = typeof job.id === 'string' && job.id ? job.id : 'yoober-crescent';
      waiting.userData.setPerson(personId); fare.userData.setPerson(personId);
      if (job.passenger === true) counters.farePassenger = passenger(playerCar,center,fare);
      else if (job.stage === 0 && near(job.waitingPose||job.target,center)) {
        const stop=job.waitingPose||job.target;
        pose.position.set(stop.x,ground(stop.x,stop.z)+.035,stop.z);
        pose.rotation.set(0,finite(stop.yaw),0); pose.scale.setScalar(waiting.userData.appearance.height); pose.updateMatrix();
        waiting.setMatrixAt(0,pose.matrix); waiting.count = 1; pose.scale.setScalar(1); counters.waiting = 1;
      }
    }
    if (snapshot?.driver?.active && near(snapshot.driver, center)) {
      const value = snapshot.driver;
      pose.position.set(value.x, ground(value.x, value.z) + .035, value.z);
      pose.rotation.set(value.reaction === 'knockdown' ? Math.PI / 2 : 0, finite(value.yaw),
        value.reaction === 'angry' ? Math.sin(finite(value.elapsed) * 9) * .045 : 0);
      pose.scale.setScalar(driver.userData.appearance.height); pose.updateMatrix(); driver.setMatrixAt(0,pose.matrix);
      driver.count = 1; pose.scale.setScalar(1); counters.drivers = 1;
    }
    for (const mesh of people) { mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true; }
    counters.drawCalls = counters.cars * (car.userData.drawCalls+1) + people.reduce((sum,mesh) => sum + Number(mesh.visible),0);
  }
  return { update,
    get stats() { return Object.freeze({...counters,carLimit:1,passengerLimit:SEATED_LIMIT,waitingLimit:1,driverLimit:1,driverBatches:1,batches:5,maxDrawCalls:car.userData.drawCalls+4,geometryCount:geometries.size,materialCount:materials.size,disposed}); },
    dispose() {
      if (disposed) return;
      disposed = true; root.removeFromParent(); for (const mesh of people) mesh.dispose();
      for (const item of geometries) item.dispose(); for (const item of materials) item.dispose();
      counters.cars = counters.waiting = counters.drivers = counters.passengers = counters.drawCalls = 0;
      counters.playerPassenger = counters.farePassenger = false;
    },
  };
}
