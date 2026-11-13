import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar } from '../../assets/car-arcade/models.js';

const POLICE_LIMIT = 4, SHOT_LIMIT = 8, CULL_DISTANCE = 380;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value)));

// Original procedural adult. The adapter owns its resources, never gameplay state.
export function createActorView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Street Life actors'; scene.add(root);
  const geometries = new Set(), materials = new Set();
  const ownGeometry = geometry => { geometries.add(geometry); return geometry; };
  const material = (color, luminous = false) => {
    const value = luminous ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshLambertMaterial({ color });
    materials.add(value); return value;
  };
  const box = ownGeometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = ownGeometry(new THREE.SphereGeometry(1, 10, 7));
  const palette = {
    jacket: material(0xb47442), seam: material(0x68472e), shirt: material(0xd9d4bd),
    pants: material(0x354351), shoe: material(0x292a28), sole: material(0xc5bba8),
    skin: material(0xba8662), hair: material(0x342b26), eye: material(0x222222),
    gun: material(0x353a3c), red: material(0xff3039, true), blue: material(0x3385ff, true),
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
  const body = joint(actor, 'Torso', 0, 0, 0);
  piece(body, 'Jacket', palette.jacket, [0, 1.23, 0], [.46, .57, .27]);
  piece(body, 'Shirt and collar', palette.shirt, [0, 1.45, -.145], [.17, .18, .025]);
  piece(body, 'Jacket zip', palette.seam, [0, 1.21, -.143], [.018, .39, .015]);
  piece(body, 'Waist', palette.pants, [0, .91, 0], [.39, .16, .25]);
  piece(body, 'Neck', palette.skin, [0, 1.57, 0], [.15, .15, .15]);
  const head = joint(body, 'Head', 0, 1.73, 0);
  piece(head, 'Face', palette.skin, [0, 0, 0], [.145, .19, .13], sphere);
  piece(head, 'Hair', palette.hair, [0, .11, .018], [.151, .105, .137], sphere);
  piece(head, 'Nose', palette.skin, [0, -.006, -.139], [.04, .06, .044]);
  for (const side of [-1, 1]) {
    piece(head, 'Eye', palette.eye, [side * .057, .035, -.121], [.022, .019, .012]);
    piece(head, 'Ear', palette.skin, [side * .143, -.005, 0], [.026, .054, .033], sphere);
  }
  const legs = [], knees = [], arms = [], elbows = [];
  for (const side of [-1, 1]) {
    const leg = joint(actor, 'Hip', side * .115, .91, 0); legs.push(leg);
    piece(leg, 'Trouser thigh', palette.pants, [0, -.205, 0], [.175, .41, .205]);
    const knee = joint(leg, 'Knee', 0, -.41, 0); knees.push(knee);
    piece(knee, 'Trouser shin', palette.pants, [0, -.19, 0], [.151, .38, .18]);
    piece(knee, 'Shoe', palette.shoe, [0, -.435, -.055], [.18, .12, .30]);
    piece(knee, 'Sole', palette.sole, [0, -.487, -.055], [.185, .026, .305]);
    const arm = joint(body, 'Shoulder', side * .30, 1.46, 0); arms.push(arm);
    piece(arm, 'Sleeve upper', palette.jacket, [0, -.16, 0], [.16, .32, .19]);
    const elbow = joint(arm, 'Elbow', 0, -.31, 0); elbows.push(elbow);
    piece(elbow, 'Sleeve cuff', palette.jacket, [0, -.13, 0], [.135, .26, .16]);
    piece(elbow, 'Hand', palette.skin, [0, -.30, 0], [.11, .13, .12]);
  }
  const pistol = joint(elbows[1], 'Pistol', 0, -.32, -.08);
  pistol.rotation.x = -Math.PI / 2;
  piece(pistol, 'Pistol slide', palette.gun, [0, 0, -.09], [.075, .09, .24]);
  piece(pistol, 'Pistol grip', palette.gun, [0, -.07, -.005], [.065, .13, .075]);

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

  // Clone pooled factory resources so disposing this view cannot break other cars.
  const carGeometries = new Map(), carMaterials = new Map();
  const police = Array.from({ length: POLICE_LIMIT }, (_, i) => {
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
  let phase = 0, clock = 0, disposed = false;
  const counters = { police: 0, shots: 0, playerVisible: false, objectiveVisible: false, meshes: 0, triangles: 0, drawCalls: 0 };
  root.traverse(object => { if (object.isMesh) { counters.meshes++; counters.triangles += (object.geometry.index?.count || object.geometry.attributes.position.count) / 3 * (object.isInstancedMesh ? SHOT_LIMIT : 1); } });
  function ground(x, z) { return finite(heightAt(x, z)); }
  function near(value, focus, radius = CULL_DISTANCE) { return value && Number.isFinite(value.x) && Number.isFinite(value.z) && Math.hypot(value.x - focus.x, value.z - focus.z) < radius; }
  function update(state, { dt = 0, focus = state.actor, objective = null } = {}) {
    if (disposed) return;
    const step = clamp(dt, 0, .1); clock += step;
    const center = { x: finite(focus?.x), z: finite(focus?.z) };
    const pose = state.actor || {};
    actor.visible = state.mode === 'foot' && near(pose, center);
    if (actor.visible) {
      const speed = clamp(Math.abs(finite(pose.speed)), 0, 12);
      phase += step * speed * 2.7;
      const stride = Math.min(1, speed / 3) * Math.sin(phase) * (speed > 4 ? .85 : .55);
      const jump = clamp(pose.jumpHeight, 0, 5);
      actor.position.set(pose.x, ground(pose.x, pose.z) + .035 + jump, pose.z); actor.rotation.y = finite(pose.yaw);
      body.rotation.x = speed > 4 ? -.10 : 0;
      for (let i = 0; i < 2; i++) {
        const swing = stride * (i ? -1 : 1);
        legs[i].rotation.x = jump > .05 ? -.35 : swing;
        knees[i].rotation.x = jump > .05 ? .75 : Math.max(0, -swing) * .7;
        arms[i].rotation.set(-swing * .7, 0, (i ? -1 : 1) * .08);
        elbows[i].rotation.x = -.12;
      }
      pistol.visible = state.weapon === 'pistol';
      if (state.aiming && pistol.visible) {
        arms[1].rotation.x = Math.PI / 2 + clamp(state.attackTimer, 0, .15); elbows[1].rotation.x = 0;
        arms[0].rotation.x = 1.12; arms[0].rotation.z = -.35; elbows[0].rotation.x = .40;
      }
      if (finite(state.reloading) > 0) { arms[1].rotation.x = .65; elbows[1].rotation.x = 1.2; arms[0].rotation.x = .9; }
      if (finite(state.attackTimer) > 0 && state.weapon === 'unarmed') { arms[1].rotation.x = 1.1 + Math.sin(clamp(state.attackTimer / .3, 0, 1) * Math.PI) * .9; elbows[1].rotation.x = -.25; body.rotation.y = -.22; } else body.rotation.y = 0;
    }
    counters.police = 0;
    police.forEach((view, i) => {
      const item = state.police?.[i]; view.car.visible = !!item && item.active !== false && finite(item.health, 100) > 0 && near(item, center);
      if (!view.car.visible) return;
      counters.police++; view.car.position.set(item.x, ground(item.x, item.z), item.z); view.car.rotation.y = finite(item.yaw);
      const colors = view.lightMesh.geometry.attributes.color;
      const redOn = Math.sin(clock * 15 + i) > 0;
      // Base has24 vertices, followed by each24-vertex lens. Geometry is local.
      for (let vertex = 24; vertex < 72; vertex++) {
        const isRed = vertex < 48, level = isRed === redOn ? 1 : .22;
        const color = isRed ? palette.red.color : palette.blue.color;
        colors.setXYZ(vertex, color.r * level, color.g * level, color.b * level);
      }
      colors.needsUpdate = true;
    });
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
    streaks.count = impacts.count = counters.shots;
    streaks.visible = impacts.visible = counters.shots > 0;
    streaks.instanceMatrix.needsUpdate = impacts.instanceMatrix.needsUpdate = true;
    marker.visible = near(objective, center, 850);
    if (marker.visible) { marker.position.set(objective.x, ground(objective.x, objective.z), objective.z); arrow.position.y = 3.2 + Math.sin(clock * 2) * .15; }
    counters.playerVisible = actor.visible; counters.objectiveVisible = marker.visible; counters.drawCalls = 0;
    root.traverseVisible(object => { if (object.isMesh) counters.drawCalls++; });
  }
  return {
    update,
    get stats() { return Object.freeze({ ...counters, geometryCount: geometries.size, materialCount: materials.size, disposed }); },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      root.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      for (const geometry of geometries) geometry.dispose();
      for (const value of materials) value.dispose();
      counters.drawCalls = counters.police = counters.shots = 0; counters.playerVisible = counters.objectiveVisible = false;
    },
  };
}
