import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar } from '../../assets/car-arcade/models.js';
import { appearanceForPerson, createPersonGeometries, PERSON_MODEL } from './person-model.js';

const POLICE_LIMIT = 4, SHOT_LIMIT = 8, CULL_DISTANCE = 380;
const MELEE_POSES = [[0,.45,1.15,-.12,0],[.2,.30,1.4,-.20,.005],[.5,1.95,-.30,.24,-.075],[1,0,-.12,0,0]];
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value)));

// One articulated player only: fixed joint springs, bounded substeps and cached
// mesh corners. Gameplay supplies translation; this adapter supplies the fall.
function createImpactPose(actor, body, head, legs, knees, arms, elbows, ground) {
  const nodes = [actor, body, head, ...legs, ...knees, ...arms, ...elbows];
  const angles = nodes.map(() => new Float64Array(3));
  const velocities = nodes.map(() => new Float64Array(3));
  const limits = [[7, .7, 1.1], [.35, .55, .4], [.6, .7, .55],
    [1.6, .5, .8], [1.6, .5, .8], [1.9, .08, .08], [1.9, .08, .08],
    [2.5, .8, 1.7], [2.5, .8, 1.7], [1.8, .12, .18], [1.8, .12, .18]];
  const targets = nodes.map(() => new Float64Array(3));
  const corners = [], point = new THREE.Vector3(), pivot = new THREE.Vector3();
  actor.traverse(mesh => {
    if (!mesh.isMesh) return;
    mesh.geometry.computeBoundingBox();
    const { min, max } = mesh.geometry.boundingBox;
    for (let i = 0; i < 8; i++) corners.push({ mesh, local: new THREE.Vector3(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z) });
  });
  let active = false, lastTimer = 0, serial = null, elapsed = 0, strength = 0, side = 1, pitch = 1, heading = 0;
  let phase = 'idle', duration = 0;
  function reset() {
    if (active) {
      for (let i = 0; i < nodes.length; i++) { angles[i].fill(0); velocities[i].fill(0); }
      actor.rotation.x = actor.rotation.z = 0; head.rotation.set(0, 0, 0);
    }
    active = false; lastTimer = 0; serial = null; elapsed = 0; duration = 0; phase = 'idle';
  }
  function update(pose, dt, health) {
    const remaining = Math.max(0, finite(pose.impactTime));
    // A completed launch stays down during the existing medical fade. An
    // unrelated KO cannot start this pose; health restoration clears it.
    const holdingFall = !remaining && active && duration >= 1 && finite(health, 100) <= 0;
    if (!remaining && !holdingFall) { reset(); return false; }
    if (!active || (Number.isFinite(pose.impactSerial) && serial !== pose.impactSerial) || remaining > lastTimer + .05) {
      reset(); active = true; serial = pose.impactSerial;
      duration = Math.max(.3, finite(pose.impactDuration, 2.6));
      strength = clamp(pose.impactStrength, 0, 1);
      heading = finite(pose.impactYaw) - finite(pose.yaw);
      side = Math.sin(heading) < 0 ? -1 : 1; pitch = Math.cos(heading) < 0 ? -1 : 1;
      for (let i = 0; i < nodes.length; i++) {
        velocities[i][0] = (i === 0 ? pitch * (5 + strength * 5) : Math.sin(i * 2.31 + heading) * (3 + strength * 7));
        velocities[i][2] = side * Math.cos(i * 1.73) * (1 + strength * 3);
      }
    }
    lastTimer = remaining;
    elapsed += dt;
    const mild = duration < 1, airborne = finite(pose.jumpHeight) > .08;
    const getup = mild || finite(health, 100) <= 0 ? 0 : clamp((.7 - remaining) / .7, 0, 1);
    const blend = 1 - getup * getup * (3 - 2 * getup);
    phase = mild ? 'flinch' : getup > 0 ? 'getting-up' : airborne ? 'airborne' : 'fallen';
    for (const target of targets) target.fill(0);
    if (!mild) {
      // Angular momentum carries the pelvis into a tumble. Contact attracts it
      // to the nearest horizontal resting orientation rather than an upright hop.
      const current = angles[0][0];
      const lying = Math.PI / 2 + Math.round((current - Math.PI / 2) / Math.PI) * Math.PI;
      targets[0][0] = airborne ? pitch * (1.7 + Math.min(1.2, elapsed) * 2.8) : lying;
      targets[0][1] = side * .24;
      targets[0][2] = side * (airborne ? .55 : .22);
    } else targets[0][0] = pitch * .18;
    for (let i = 1; i < nodes.length; i++) {
      const alternating = i % 2 ? -1 : 1;
      // Different lever lengths/rest angles keep the arms trailing the torso
      // while hips and knees fold independently on the first ground contact.
      targets[i][0] = i === 1 ? -.12 * pitch : i === 2 ? -.22 * pitch : i < 5 ? alternating * .52 : i < 7 ? .8 + .22 * alternating : i < 9 ? -1.1 * pitch + .3 * alternating : -.65;
      targets[i][2] = i < 3 ? side * .13 : i < 5 ? alternating * .28 : i < 7 ? 0 : i < 9 ? alternating * 1.05 : alternating * .1;
    }
    const count = Math.ceil(dt / (1 / 120)), step = count ? dt / count : 0;
    for (let substep = 0; substep < count; substep++) for (let i = 0; i < nodes.length; i++) for (let axis = 0; axis < 3; axis++) {
      const stiffness = getup > 0 ? 42 : i === 0 && airborne ? 5 : 19 + i * 1.4;
      const damping = getup > 0 ? 12 : airborne ? 2.4 + i * .12 : 8;
      const target = targets[i][axis] * (mild ? .35 : blend);
      velocities[i][axis] += ((target - angles[i][axis]) * stiffness - velocities[i][axis] * damping) * step;
      angles[i][axis] += velocities[i][axis] * step;
      const low = (i === 5 || i === 6) && axis === 0 ? 0 : -limits[i][axis];
      if (angles[i][axis] < low || angles[i][axis] > limits[i][axis]) {
        angles[i][axis] = clamp(angles[i][axis], low, limits[i][axis]); velocities[i][axis] *= -.12;
      }
    }
    for (let i = 0; i < nodes.length; i++) {
      const a = angles[i], weight = mild ? clamp(remaining / .12, 0, 1) : blend;
      if (i === 0) { actor.rotation.x = a[0] * weight; actor.rotation.z = a[2] * weight; actor.rotation.y += a[1] * weight; }
      else {
        // The ordinary pose was already evaluated, so recovery blends back to
        // walking/aiming without taking ownership of any gameplay state.
        nodes[i].rotation.x += (a[0] - nodes[i].rotation.x) * weight;
        nodes[i].rotation.y += (a[1] - nodes[i].rotation.y) * weight;
        nodes[i].rotation.z += (a[2] - nodes[i].rotation.z) * weight;
      }
    }
    // Rotate around the pelvis rather than the soles, retaining the exact
    // gameplay x/z root and airborne height. Only raise a penetrated surface.
    pivot.set(0, .84 * actor.scale.y, 0).applyEuler(actor.rotation);
    actor.position.y += .84 * actor.scale.y - pivot.y;
    actor.updateMatrixWorld(true);
    let lift = 0;
    for (const { mesh, local } of corners) {
      if (!mesh.visible || !mesh.parent.visible) continue;
      point.copy(local).applyMatrix4(mesh.matrixWorld);
      lift = Math.max(lift, ground(point.x, point.z) + .018 - point.y);
    }
    actor.position.y += lift;
    return true;
  }
  return { update, reset, get stats() { return Object.freeze({ phase, joints: nodes.length }); } };
}

// Original procedural adult. The adapter owns its resources, never gameplay state.
export function createActorView(scene, heightAt, { policeLimit = POLICE_LIMIT, policeCars = true } = {}) {
  policeLimit = Math.max(0, Math.min(POLICE_LIMIT, Math.floor(policeLimit)));
  const root = new THREE.Group(); root.name = 'Street Life actors'; scene.add(root);
  const geometries = new Set(), materials = new Set();
  const ownGeometry = geometry => { geometries.add(geometry); return geometry; };
  const material = (color, luminous = false) => {
    const value = luminous ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    materials.add(value); return value;
  };
  const shapes = createPersonGeometries();
  const box = ownGeometry(shapes.box), sphere = ownGeometry(shapes.sphere), capsule = ownGeometry(shapes.capsule);
  const playerAppearance = appearanceForPerson('player'), policeAppearance = appearanceForPerson('police');
  const dimensions = PERSON_MODEL;
  const palette = {
    jacket: material(playerAppearance.shirt), seam: material(0x68472e), shirt: material(0xd9d4bd),
    pants: material(playerAppearance.trousers), shoe: material(playerAppearance.shoes), sole: material(0xc5bba8),
    skin: material(playerAppearance.skin), hair: material(playerAppearance.hair), eye: material(0x222222),
    gun: material(0x353a3c),
    red: policeCars && policeLimit > 0 ? material(0xff3039, true) : null,
    blue: policeCars && policeLimit > 0 ? material(0x3385ff, true) : null,
    yellow: material(0xffda78, true), marker: material(0xf6be38, true),
  };
  function piece(parent, name, mat, position, size, geometry = box) {
    const mesh = new THREE.Mesh(geometry, mat); mesh.name = name;
    mesh.position.set(...position); mesh.scale.set(...size); parent.add(mesh); return mesh;
  }
  function joint(parent, name, x, y, z) {
    const group = new THREE.Group(); group.name = name; group.position.set(x, y, z); parent.add(group); return group;
  }
  const actor = joint(root, 'Adult player', 0, 0, 0);
  actor.scale.setScalar(playerAppearance.height);
  const body = joint(actor, 'Torso', 0, 0, 0);
  const torso = dimensions.torso, face = dimensions.head, hair = dimensions.hair;
  piece(body, 'Jacket', palette.jacket, [torso.x, torso.y, torso.z], [torso.sx, torso.sy, torso.sz], capsule);
  piece(body, 'Shirt and collar', palette.shirt, [0, 1.35, -.145], [.17, .18, .025]);
  piece(body, 'Jacket zip', palette.seam, [0, 1.11, -.151], [.018, .39, .015]);
  piece(body, 'Waist', palette.pants, [0, .83, 0], [.19, .045, .125], capsule);
  piece(body, 'Neck', palette.skin, [0, 1.46, 0], [.075, .05, .075], capsule);
  const head = joint(body, 'Head', face.x, face.y, face.z);
  piece(head, 'Face', palette.skin, [0, 0, 0], [face.sx, face.sy, face.sz], sphere);
  piece(head, 'Hair', palette.hair, [hair.x - face.x, hair.y - face.y, hair.z - face.z], [hair.sx, hair.sy, hair.sz], sphere);
  piece(head, 'Nose', palette.skin, [0, -.006, -.139], [.04, .06, .044]);
  for (const side of [-1, 1]) {
    piece(head, 'Eye', palette.eye, [side * .057, .035, -.121], [.022, .019, .012]);
    piece(head, 'Ear', palette.skin, [side * .133, -.005, 0], [.026, .054, .033], sphere);
  }
  const legs = [], knees = [], arms = [], elbows = [];
  for (const side of [-1, 1]) {
    const leg = joint(actor, 'Hip', side * dimensions.legs.x, .81, 0); legs.push(leg);
    piece(leg, 'Trouser thigh', palette.pants, [0, -.18, 0], [dimensions.legs.sx, .12, dimensions.legs.sz], capsule);
    const knee = joint(leg, 'Knee', 0, -.36, 0); knees.push(knee);
    piece(knee, 'Trouser shin', palette.pants, [0, -.17, 0], [.0755, .34 / 3, .085], capsule);
    piece(knee, 'Shoe', palette.shoe, [0, -.395, dimensions.shoes.z], [dimensions.shoes.sx, dimensions.shoes.sy, dimensions.shoes.sz]);
    piece(knee, 'Sole', palette.sole, [0, -.438, dimensions.shoes.z], [.175, .026, .285]);
    const arm = joint(body, 'Shoulder', side * dimensions.arms.x, 1.35, 0); arms.push(arm);
    piece(arm, 'Sleeve upper', palette.jacket, [0, -.15, 0], [dimensions.arms.sx, .10, dimensions.arms.sz], capsule);
    const elbow = joint(arm, 'Elbow', 0, -.30, 0); elbows.push(elbow);
    piece(elbow, 'Sleeve cuff', palette.jacket, [0, -.12, 0], [.0675, .08, .075], capsule);
    piece(elbow, 'Hand', palette.skin, [0, -.28, 0], [dimensions.hands.sx, dimensions.hands.sy, dimensions.hands.sz], sphere);
  }
  // Original box silhouettes share the same hand socket and one draw each.
  const weapons = Object.create(null);
  for (const [id, name, parts] of [
    ['pistol', 'Pistol', [
      ['slide', [0, 0, -.09], [.075, .09, .24]],
      ['grip', [0, -.07, -.005], [.065, .13, .075]],
    ]],
    ['shotgun', 'Shotgun', [
      ['receiver', [0, 0, -.11], [.095, .11, .25]],
      ['barrel', [0, .025, -.48], [.055, .055, .57]],
      ['pump foregrip', [0, -.045, -.38], [.11, .09, .23]],
      ['grip', [0, -.09, .015], [.075, .17, .09]],
      ['stock', [0, -.025, .21], [.085, .14, .30]],
    ]],
    ['smg', 'SMG', [
      ['receiver', [0, 0, -.10], [.11, .14, .30]],
      ['short barrel', [0, .025, -.30], [.06, .06, .14]],
      ['grip', [0, -.10, .015], [.075, .17, .09]],
      ['magazine', [0, -.18, -.14], [.07, .24, .08]],
      ['short stock', [0, -.015, .15], [.065, .065, .20]],
      ['stock heel', [0, -.045, .26], [.075, .13, .045]],
    ]],
    ['carbine', 'Carbine', [
      ['receiver', [0, .015, -.12], [.09, .13, .31]],
      ['handguard', [0, .015, -.36], [.10, .11, .24]],
      ['long barrel', [0, .035, -.58], [.045, .045, .26]],
      ['grip', [0, -.10, .015], [.07, .18, .09]],
      ['magazine', [0, -.15, -.13], [.07, .18, .11]],
      ['long stock', [0, -.005, .24], [.08, .11, .36]],
      ['stock heel', [0, -.025, .43], [.09, .18, .055]],
    ]],
  ]) {
    const weapon = joint(elbows[1], name, 0, -.28, -.08);
    weapon.rotation.x = -Math.PI / 2; weapon.visible = false;
    for (const [part, position, size] of parts) piece(weapon, `${name} ${part}`, palette.gun, position, size);
    weapons[id] = weapon;
  }

  const weaponEntries = Object.entries(weapons);
  const batchMaterial = new THREE.MeshLambertMaterial({ vertexColors: true }); materials.add(batchMaterial);
  function batchStatic(parent, mat = batchMaterial) {
    const meshes = parent.children.filter(object => object.isMesh);
    if (meshes.length < 2) return null;
    const parts = meshes.map(mesh => {
      mesh.updateMatrix();
      const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrix);
      const rgb = mesh.material.color, colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      return geometry;
    });
    const geometry = ownGeometry(mergeGeometries(parts, false));
    for (const part of parts) part.dispose();
    for (const mesh of meshes) parent.remove(mesh);
    const mesh = new THREE.Mesh(geometry, mat); mesh.name = `${parent.name} details`; parent.add(mesh); return mesh;
  }
  const joints = []; actor.traverse(object => { if (object.isGroup) joints.push(object); });
  for (const group of joints) batchStatic(group);

  // Merged parts retain fixed colour slots; changing a hero reuses every buffer.
  const playerSlots = { jacket: 'shirt', pants: 'trousers', skin: 'skin', hair: 'hair', shoe: 'shoes' };
  const playerPaint = [];
  actor.traverse(mesh => {
    const colors = mesh.geometry?.attributes.color;
    if (!colors) return;
    const slots = Object.keys(playerSlots).map(slot => [slot, []]);
    for (let i = 0; i < colors.count; i++) for (const [slot, indices] of slots) {
      const color = palette[slot].color;
      if (Math.abs(colors.getX(i)-color.r)<1e-6 && Math.abs(colors.getY(i)-color.g)<1e-6 && Math.abs(colors.getZ(i)-color.b)<1e-6) indices.push(i);
    }
    playerPaint.push({ colors, slots });
  });
  const heroAppearances = new Map(['player','player:student','player:corporate','player:basement'].map(id => [id, appearanceForPerson(id)]));
  actor.userData.appearance = playerAppearance;
  function setPlayerAppearance(personId) {
    if (disposed || !heroAppearances.has(personId)) return false;
    const next = heroAppearances.get(personId);
    if (actor.userData.appearance.id === next.id) return true;
    for (const [slot, field] of Object.entries(playerSlots)) palette[slot].color.setHex(next[field]);
    for (const { colors, slots } of playerPaint) {
      for (const [slot, indices] of slots) for (const vertex of indices) palette[slot].color.toArray(colors.array,vertex*3);
      colors.needsUpdate = true;
    }
    actor.scale.setScalar(next.height); actor.userData.appearance = next; return true;
  }

  // Clone pooled factory resources so disposing this view cannot break other cars.
  const carGeometries = new Map(), carMaterials = new Map();
  const police = Array.from({ length: policeCars ? policeLimit : 0 }, (_, i) => {
    const car = createCar('relay', { color: '#e5e6df' }); car.name = `Generic patrol ${i + 1}`;
    car.traverse(object => {
      if (!object.isMesh) return;
      if (!carGeometries.has(object.geometry)) carGeometries.set(object.geometry, ownGeometry(object.geometry.clone()));
      object.geometry = carGeometries.get(object.geometry);
      if (!carMaterials.has(object.material)) { const clone = object.material.clone(); materials.add(clone); carMaterials.set(object.material, clone); }
      object.material = carMaterials.get(object.material);
    });
    const roof = car.userData.dimensions.height;
    const lights = joint(car, 'Patrol light bar', 0, 0, 0);
    piece(lights, 'Light bar base', palette.gun, [0, roof + .04, 0], [1.2, .08, .28]);
    piece(lights, 'Red beacon', palette.red, [-.32, roof + .13, 0], [.51, .13, .24]);
    piece(lights, 'Blue beacon', palette.blue, [.32, roof + .13, 0], [.51, .13, .24]);
    const lightMaterial = new THREE.MeshBasicMaterial({ vertexColors: true }); materials.add(lightMaterial);
    const lightMesh = batchStatic(lights, lightMaterial);
    car.visible = false; root.add(car); return { car, lightMesh };
  });
  // Sidearms share the right-arm batch; aiming preserves the fixed five body draws.
  const navy = material(policeAppearance.shirt), policePants = material(policeAppearance.trousers);
  const policeSkin = material(policeAppearance.skin), policeHair = material(policeAppearance.hair), policeShoes = material(policeAppearance.shoes);
  const badge = material(0xc8c4a4);
  const officerParts = [];
  for (const [name, specs] of [
    ['Officer torso', [[navy,[torso.x,torso.y,torso.z],[torso.sx,torso.sy,torso.sz],capsule], [policePants,[0,.83,0],[.19,.045,.125],capsule], [policeSkin,[0,1.46,0],[.075,.05,.075],capsule], [policeSkin,[face.x,face.y,face.z],[face.sx,face.sy,face.sz],sphere], [policeHair,[hair.x,hair.y,hair.z],[hair.sx,hair.sy,hair.sz],sphere], [navy,[0,1.79,0],[.29,.06,.28]], [badge,[-.12,1.3,-.152],[.065,.08,.016]]]],
    ['Officer left leg', [[policePants,[0,-.37,0],[dimensions.legs.sx,.74/3,dimensions.legs.sz],capsule], [policeShoes,[0,-.755,dimensions.shoes.z],[dimensions.shoes.sx,dimensions.shoes.sy,dimensions.shoes.sz]]]],
    ['Officer right leg', [[policePants,[0,-.37,0],[dimensions.legs.sx,.74/3,dimensions.legs.sz],capsule], [policeShoes,[0,-.755,dimensions.shoes.z],[dimensions.shoes.sx,dimensions.shoes.sy,dimensions.shoes.sz]]]],
    ['Officer left arm', [[navy,[0,-.25,0],[dimensions.arms.sx,.50/3,dimensions.arms.sz],capsule], [policeSkin,[0,-.55,0],[dimensions.hands.sx,dimensions.hands.sy,dimensions.hands.sz],sphere]]],
    ['Officer right arm', [[navy,[0,-.25,0],[dimensions.arms.sx,.50/3,dimensions.arms.sz],capsule], [policeSkin,[0,-.55,0],[dimensions.hands.sx,dimensions.hands.sy,dimensions.hands.sz],sphere], [palette.gun,[0,-.67,-.035],[.085,.28,.10]], [palette.gun,[0,-.55,.035],[.07,.12,.14]]]],
  ]) {
    const template = new THREE.Group(); template.name = name;
    for (const [mat, pos, size, geometry] of specs) piece(template,name,mat,pos,size,geometry);
    const merged = batchStatic(template);
    const instances = new THREE.InstancedMesh(merged.geometry, batchMaterial, Math.max(1, policeLimit));
    instances.name = name; instances.frustumCulled = false; instances.visible = false;
    root.add(instances); officerParts.push(instances);
  }
  const muzzleMatrices=Array.from({length:policeLimit},()=>new THREE.Matrix4());
  const muzzlePose=new THREE.Object3D();
  const officerWorld = new THREE.Object3D(), officerLimb = new THREE.Object3D(), officerMatrix = new THREE.Matrix4();
  const streaks = new THREE.InstancedMesh(box, palette.yellow, SHOT_LIMIT);
  const impacts = new THREE.InstancedMesh(sphere, palette.yellow, SHOT_LIMIT);
  streaks.name = 'Brief shot streaks'; impacts.name = 'Non-graphic impacts';
  streaks.frustumCulled = impacts.frustumCulled = false;
  root.add(streaks, impacts); streaks.visible = impacts.visible = false;
  const effectPose = new THREE.Object3D(), effectStart = new THREE.Vector3(), effectEnd = new THREE.Vector3();
  const effectDirection = new THREE.Vector3(), forward = new THREE.Vector3(0, 0, 1);
  const marker = joint(root, 'Objective marker', 0, 0, 0);
  const ringGeometry = ownGeometry(new THREE.TorusGeometry(2, .10, 4, 24));
  const ring = piece(marker, 'Objective ground ring', palette.marker, [0, .15, 0], [1, 1, 1], ringGeometry); ring.rotation.x = Math.PI / 2;
  const arrowGeometry = ownGeometry(new THREE.ConeGeometry(.45, .65, 4));
  const arrow = piece(marker, 'Objective arrow', palette.marker, [0, 3.2, 0], [1, 1, 1], arrowGeometry); arrow.rotation.x = Math.PI;
  marker.visible = false; actor.visible = false;
  let phase = 0, clock = 0, disposed = false, lastAttackTimer = 0, lastAttackSerial = null, punchingArm = 0;
  const counters = { police: 0, officers: 0, shots: 0, playerVisible: false, objectiveVisible: false, meshes: 0, triangles: 0, drawCalls: 0, activeWeapon: null, weaponMeshes: weaponEntries.length };
  root.traverse(object => { if (object.isMesh) { counters.meshes++; counters.triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? object.instanceMatrix.count : 1); } });
  function ground(x, z) { return finite(heightAt(x, z)); }
  function near(value, focus, radius = CULL_DISTANCE) { return !!value && Number.isFinite(value.x) && Number.isFinite(value.z) && Math.hypot(value.x - focus.x, value.z - focus.z) < radius; }
  const impactPose = createImpactPose(actor, body, head, legs, knees, arms, elbows, ground);
  function update(state, { dt = 0, focus = state.actor, objective = null } = {}) {
    if (disposed) return;
    const step = clamp(dt, 0, .1); clock += step;
    const center = { x: finite(focus?.x), z: finite(focus?.z) };
    const pose = state.actor || {};
    actor.visible = state.mode === 'foot' && near(pose, center);
    if (actor.visible) {
      const speed = clamp(Math.abs(finite(pose.speed)), 0, 12);
      const attack = clamp(state.attackTimer, 0, .3), serial = Number.isFinite(state.attackSerial) ? state.attackSerial : null;
      if (state.weapon === 'unarmed' && attack > 0 && ((serial !== null && serial !== lastAttackSerial) || (serial === null && attack > lastAttackTimer + 1e-6))) punchingArm = serial !== null ? (Math.abs(Math.floor(serial)) % 2 ? 1 : 0) : 1-punchingArm;
      lastAttackSerial = serial; lastAttackTimer = attack;
      body.position.set(0,0,0); body.rotation.set(0,0,0); head.rotation.set(0,0,0);
      actor.rotation.set(0, finite(pose.yaw), 0);
      phase += step * speed * 2.7;
      const stride = Math.min(1, speed / 3) * Math.sin(phase) * (speed > 4 ? .85 : .55);
      const jump = clamp(pose.jumpHeight, 0, 5);
      actor.position.set(pose.x, ground(pose.x, pose.z) + .035 + jump, pose.z); actor.rotation.y = finite(pose.yaw);
      body.rotation.x = speed > 4 ? -.10 : 0;
      for (let i = 0; i < 2; i++) {
        const swing = stride * (i ? -1 : 1);
        legs[i].rotation.set(jump > .05 ? -.35 : swing, 0, 0);
        knees[i].rotation.set(jump > .05 ? .75 : Math.max(0, -swing) * .7, 0, 0);
        arms[i].rotation.set(-swing * .7, 0, (i ? -1 : 1) * .08);
        elbows[i].rotation.set(-.12, 0, 0);
      }
      const firearm = weapons[state.weapon];
      for (const [id, weapon] of weaponEntries) weapon.visible = id === state.weapon;
      if (state.aiming && firearm) {
        arms[1].rotation.x = Math.PI / 2 + clamp(state.attackTimer, 0, .15); elbows[1].rotation.x = 0;
        arms[0].rotation.x = state.weapon === 'pistol' ? 1.12 : 1.35;
        arms[0].rotation.z = .72; elbows[0].rotation.x = state.weapon === 'pistol' ? .40 : -.20;
      }
      if (firearm && finite(state.reloading) > 0) {
        arms[1].rotation.x = .65; elbows[1].rotation.x = 1.2;
        arms[0].rotation.x = .9; arms[0].rotation.z = .55; elbows[0].rotation.x = .55;
      }
      body.rotation.y = 0;
      if (attack > 0 && state.weapon === 'unarmed') {
        // The authoritative remaining attack timer drives anticipation, strike and recovery.
        const elapsed = 1-attack/.3, side = punchingArm ? 1 : -1, other = 1-punchingArm;
        const keys = MELEE_POSES;
        let index = 0; while (index < keys.length-2 && elapsed > keys[index+1][0]) index++;
        const start = keys[index], end = keys[index+1], raw = clamp((elapsed-start[0])/(end[0]-start[0]),0,1), t = raw*raw*(3-2*raw);
        const value = n => start[n]+(end[n]-start[n])*t;
        arms[punchingArm].rotation.set(value(1),0,-side*.12); elbows[punchingArm].rotation.x = value(2);
        arms[other].rotation.set(.65,0,side*.18); elbows[other].rotation.x = .8;
        body.rotation.y = value(3)*side; body.position.z = value(4); body.rotation.z = -.035*side*Math.sin(elapsed*Math.PI);
        knees[other].rotation.x += .10*Math.sin(elapsed*Math.PI);
      }
      impactPose.update(pose, step, state.health);
    } else impactPose.reset();
    counters.police = 0; counters.officers = 0;let muzzleCount=0;
    // Officers also render in lazy rooms that have no patrol-car allocation.
    for (let i = 0; i < policeLimit; i++) {
      const view = police[i];
      const item = state.police?.[i], carPose = item?.car || item;
      const active = !!item && item.active !== false && finite(item.health, 100) > 0;
      if (active && item.mode === 'foot' && near(item, center)) {
        officerWorld.position.set(item.x, ground(item.x,item.z) + .035, item.z);
        officerWorld.rotation.set(0, finite(item.yaw), 0); officerWorld.scale.setScalar(policeAppearance.height); officerWorld.updateMatrix();
        const stride = Math.sin(clock * 8 + i) * Math.min(.58, Math.abs(finite(item.speed)) * .18);
        for (let part = 0; part < officerParts.length; part++) {
          const leg = part === 1 || part === 2, arm = part > 2, side = part === 1 || part === 3 ? -1 : 1;
          officerLimb.position.set(leg ? side*dimensions.legs.x : arm ? side*dimensions.arms.x : 0, leg ? .81 : arm ? 1.35 : 0, 0);
          officerLimb.rotation.set((leg ? 1 : arm ? -.7 : 0) * stride * side,0,arm ? -side*.08 : 0);
          if(arm && item.aiming) officerLimb.rotation.set(part===4?Math.PI/2:1.18,0,part===4?0:.5);
          officerLimb.updateMatrix(); officerMatrix.multiplyMatrices(officerWorld.matrix,officerLimb.matrix);
          if(part===4 && item.shotTimer>0) {
            muzzlePose.position.set(0,-.83,-.035);muzzlePose.scale.set(.08,.11,.08);muzzlePose.rotation.set(0,0,0);muzzlePose.updateMatrix();
            muzzlePose.matrix.premultiply(officerMatrix);muzzleMatrices[muzzleCount++].copy(muzzlePose.matrix);
          }
          officerParts[part].setMatrixAt(counters.officers,officerMatrix);
        }
        counters.officers++;
      }
      if (!view) continue;
      view.car.visible = active && carPose?.active !== false && near(carPose, center);
      if (!view.car.visible) continue;
      counters.police++; view.car.position.set(carPose.x, ground(carPose.x, carPose.z), carPose.z); view.car.rotation.y = finite(carPose.yaw);
      const colors = view.lightMesh.geometry.attributes.color;
      const redOn = Math.sin(clock * 15 + i) > 0;
      // Base has24 vertices, followed by each24-vertex lens. Geometry is local.
      for (let vertex = 24; vertex < 72; vertex++) {
        const isRed = vertex < 48, level = isRed === redOn ? 1 : .22;
        const color = isRed ? palette.red.color : palette.blue.color;
        colors.setXYZ(vertex, color.r * level, color.g * level, color.b * level);
      }
      colors.needsUpdate = true;
    }
    for (const part of officerParts) { part.count = counters.officers; part.visible = counters.officers > 0; part.instanceMatrix.needsUpdate = true; }
    counters.shots = 0;
    for (const shot of state.shots || []) {
      if (counters.shots >= SHOT_LIMIT) break;
      if (!(finite(shot.life) > 0 && near(shot, center, 200) && Number.isFinite(shot.endX) && Number.isFinite(shot.endZ))) continue;
      effectStart.set(shot.x, ground(shot.x, shot.z) + 1.35, shot.z);
      effectEnd.set(shot.endX, ground(shot.endX, shot.endZ) + 1.1, shot.endZ);
      effectDirection.copy(effectEnd).sub(effectStart);
      const length = effectDirection.length();
      effectPose.position.copy(effectStart).add(effectEnd).multiplyScalar(.5);
      effectPose.scale.set(.025, .025, Math.max(.01, length)); effectPose.quaternion.identity();
      if (length > .001) effectPose.quaternion.setFromUnitVectors(forward, effectDirection.normalize());
      effectPose.updateMatrix(); streaks.setMatrixAt(counters.shots, effectPose.matrix);
      effectPose.position.copy(effectEnd); effectPose.scale.set(.1, .1, .1); effectPose.quaternion.identity();
      effectPose.updateMatrix(); impacts.setMatrixAt(counters.shots, effectPose.matrix);
      counters.shots++;
    }
    let impactCount=counters.shots;
    for(let i=0;i<muzzleCount && impactCount<SHOT_LIMIT;i++) impacts.setMatrixAt(impactCount++,muzzleMatrices[i]);
    streaks.count=counters.shots;impacts.count=impactCount;
    streaks.visible=counters.shots>0;impacts.visible=impactCount>0;
    streaks.instanceMatrix.needsUpdate = impacts.instanceMatrix.needsUpdate = true;
    marker.visible = near(objective, center, 850);
    if (marker.visible) { marker.position.set(objective.x, ground(objective.x, objective.z), objective.z); arrow.position.y = 3.2 + Math.sin(clock * 2) * .15; }
    counters.activeWeapon = actor.visible && weapons[state.weapon] ? state.weapon : null;
    counters.playerVisible = actor.visible; counters.objectiveVisible = marker.visible; counters.drawCalls = 0;
    root.traverseVisible(object => { if (object.isMesh) counters.drawCalls++; });
  }
  return {
    update, setPlayerAppearance,
    get stats() { return Object.freeze({ ...counters, ragdoll: impactPose.stats, geometryCount: geometries.size, materialCount: materials.size, disposed }); },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const geometry of geometries) geometry.dispose();
      for (const value of materials) value.dispose();
      counters.drawCalls = counters.police = counters.officers = counters.shots = 0; counters.activeWeapon = null; counters.playerVisible = counters.objectiveVisible = false;
    },
  };
}
