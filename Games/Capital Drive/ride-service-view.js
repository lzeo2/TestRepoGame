import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar } from '../../assets/car-arcade/models.js';
import { BY_ID } from '../../assets/car-arcade/fleet.js';

const CULL_DISTANCE = 260, SEATED_LIMIT = 2, CAR_LIFT = .18;
const finite = value => Number.isFinite(value) ? value : 0;
const valid = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);

// Presentation only: a single original marked Lantern and two small adult pools.
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
  car.visible = false; root.add(car); cabins.set('lantern', car.userData.cockpit.eye);
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
  function batch(name, parts, capacity) {
    const mesh = new THREE.InstancedMesh(geometry(parts), adultMaterial, capacity);
    mesh.name = name; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh); return mesh;
  }
  const skin = 0xba8662, jacket = 0xb47442, pants = 0x354351, hair = 0x342b26, shoe = 0x292a28;
  const waiting = batch('Waiting fare adult', [
    [jacket,[0,1.23,0],[.44,.56,.26]], [pants,[0,.91,0],[.38,.16,.24]],
    [skin,[0,1.58,0],[.14,.14,.14]], [skin,[0,1.74,0],[.26,.30,.24]], [hair,[0,1.88,.015],[.27,.08,.25]],
    ...[-1,1].flatMap(side => [[pants,[side*.115,.49,0],[.16,.76,.18]], [shoe,[side*.115,.055,-.055],[.18,.12,.29]]]),
    [jacket,[-.29,1.23,0],[.15,.48,.18]], [skin,[-.29,.96,0],[.10,.12,.11]],
    [jacket,[.28,1.31,0],[.15,.32,.18]], [jacket,[.27,1.19,-.15],[.14,.14,.32]],
    [skin,[.27,1.20,-.33],[.10,.10,.10]], [0x292c36,[.27,1.29,-.35],[.11,.18,.025]],
    [0xd8c796,[.27,1.30,-.366],[.08,.12,.008]],
  ], 1);
  // Origin is the factory cockpit eye. Mirror the left driver's seat across
  // the centreline; knees stay below the dashboard and hands rest in the lap.
  const seated = batch('Seated ride passengers', [
    [skin,[0,-.015,0],[.22,.25,.21]], [hair,[0,.10,.025],[.23,.07,.20]],
    [skin,[0,-.18,.01],[.12,.12,.12]], [jacket,[0,-.34,.035],[.36,.32,.22]],
    ...[-1,1].flatMap(side => [
      [pants,[side*.10,-.54,-.10],[.15,.14,.35]], [pants,[side*.10,-.70,-.25],[.13,.30,.14]],
      [shoe,[side*.10,-.86,-.30],[.15,.09,.24]], [jacket,[side*.23,-.34,.015],[.12,.28,.14]],
      [jacket,[side*.19,-.47,-.10],[.12,.12,.25]], [skin,[side*.15,-.47,-.23],[.10,.10,.10]],
    ]),
  ], SEATED_LIMIT);
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
  const counters = { cars: 0, waiting: 0, passengers: 0, playerPassenger: false, farePassenger: false, drawCalls: 0 };
  let disposed = false, wheelAngle = 0;
  const ground = (x,z) => finite(heightAt(x,z));
  const near = (value, focus) => !!valid(value) && value.active !== false && Math.hypot(value.x-focus.x,value.z-focus.z) < CULL_DISTANCE;
  function place(target, value) {
    const yaw = finite(value.yaw), fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const pitch = Math.atan2(ground(value.x+fx*2,value.z+fz*2)-ground(value.x-fx*2,value.z-fz*2),4);
    target.position.set(value.x,ground(value.x,value.z)+CAR_LIFT,value.z);
    target.rotation.set(pitch,yaw,0,'YXZ'); target.updateMatrix();
  }
  function passenger(value, focus) {
    if (counters.passengers >= SEATED_LIMIT || !near(value,focus)) return false;
    const id = Object.hasOwn(BY_ID,value.modelId) ? value.modelId : 'lantern';
    if (!cabins.has(id)) cabins.set(id,createCar(id).userData.cockpit.eye);
    const eye = cabins.get(id); place(pose,value);
    seat.position.set(-eye[0],eye[1],eye[2]); seat.updateMatrix();
    combined.multiplyMatrices(pose.matrix,seat.matrix); seated.setMatrixAt(counters.passengers++,combined); return true;
  }
  function update(snapshot, { focus = {x:0,z:0}, playerCar = null, job = null, dt = 0 } = {}) {
    if (disposed) return;
    const center = valid(focus) ? focus : {x:0,z:0}, vehicle = snapshot?.car;
    counters.cars = counters.waiting = counters.passengers = counters.drawCalls = 0;
    counters.playerPassenger = counters.farePassenger = false;
    car.visible = near(vehicle,center);
    if (car.visible) {
      place(car,vehicle); counters.cars = 1;
      if (typeof vehicle.color === 'string' && /^#[0-9a-f]{6}$/i.test(vehicle.color)) car.children[0].material.color.set(vehicle.color);
      wheelAngle = (wheelAngle + Math.max(0,Math.min(.1,finite(dt))) * Math.max(-60,Math.min(60,finite(vehicle.speed))) / car.userData.profile.wheelRadius) % (Math.PI*2);
      for (const wheel of car.userData.wheels) wheel.rotation.x = wheelAngle;
      if (snapshot.passenger === true) counters.playerPassenger = passenger(vehicle,center);
    }
    if (job?.type === 'ride') {
      if (job.passenger === true) counters.farePassenger = passenger(playerCar,center);
      else if (job.stage === 0 && near(job.target,center)) {
        pose.position.set(job.target.x,ground(job.target.x,job.target.z)+.035,job.target.z);
        pose.rotation.set(0,finite(job.target.yaw),0); pose.updateMatrix(); waiting.setMatrixAt(0,pose.matrix); counters.waiting = 1;
      }
    }
    waiting.count = counters.waiting; seated.count = counters.passengers;
    for (const mesh of [waiting,seated]) { mesh.visible = mesh.count > 0; mesh.instanceMatrix.needsUpdate = true; }
    counters.drawCalls = counters.cars * (car.userData.drawCalls+1) + Number(waiting.visible) + Number(seated.visible);
  }
  return { update,
    get stats() { return Object.freeze({...counters,carLimit:1,passengerLimit:SEATED_LIMIT,waitingLimit:1,batches:3,maxDrawCalls:car.userData.drawCalls+3,geometryCount:geometries.size,materialCount:materials.size,disposed}); },
    dispose() {
      if (disposed) return;
      disposed = true; root.removeFromParent(); waiting.dispose(); seated.dispose();
      for (const item of geometries) item.dispose(); for (const item of materials) item.dispose();
      counters.cars = counters.waiting = counters.passengers = counters.drawCalls = 0;
      counters.playerPassenger = counters.farePassenger = false;
    },
  };
}
