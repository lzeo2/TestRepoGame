import assert from 'node:assert/strict';
import * as THREE from '../Games/Foldwild/vendor/three.module.js';
import { createHuman, presentationSigns, destinationSignLayout } from '../Games/Foldwild/view.js';
import { REGION_LAYOUTS } from '../Games/Foldwild/region-data.js';

// Real scene graphs/geometry, no renderer stub or source-text assertions.
const box = new THREE.BoxGeometry(1, 1, 1), materials = new Map();
const geometry = kind => { assert.equal(kind, 'box'); return box; };
const material = color => {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color }));
  return materials.get(color);
};
const colors = { skin: '#bc916b', coat: '#365a74', hair: '#38342d', hairStyle: 'short', pack: '#ac9265' };
let count = 0;
for (const hairStyle of ['short', 'cropped', 'long', 'none']) {
  for (const role of ['player', 'merchant', 'mentor', 'rival']) {
    const human = createHuman({ ...colors, hairStyle, role }, geometry, material);
    const pivots = human.userData.pivots;
    assert.deepEqual(Object.keys(pivots), ['torso', 'head', 'leftArm', 'leftLeg', 'rightArm', 'rightLeg']);
    for (const [name, pivot] of Object.entries(pivots)) assert.equal(human.getObjectByName(name), pivot);
    human.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(human);
    assert(Math.abs(bounds.min.y) < 1e-7, 'boot soles are on ground');
    assert(bounds.max.y > 1.6 && bounds.max.y < 1.8, 'human-scale height');
    const nose = human.getObjectByName('nose').getWorldPosition(new THREE.Vector3());
    const pack = human.getObjectByName('pack').getWorldPosition(new THREE.Vector3());
    assert(nose.z > 0 && pack.z < 0, 'face and pack identify front/back');
    assert.equal(Boolean(human.getObjectByName('hair')), hairStyle !== 'none');
    assert.equal(Boolean(human.getObjectByName('apron')), role === 'merchant');
    assert.equal(Boolean(human.getObjectByName('scarf')), role === 'mentor');
    assert.equal(Boolean(human.getObjectByName('trial-badge')), role === 'rival');
    const hand = pivots.leftArm.getObjectByName('hand');
    const before = hand.getWorldPosition(new THREE.Vector3());
    pivots.leftArm.rotation.x = .6; human.updateMatrixWorld(true);
    assert(hand.getWorldPosition(new THREE.Vector3()).distanceTo(before) > .15, 'arm pivot really moves hand');
    assert.deepEqual(human.getObjectByName('nose').getWorldPosition(new THREE.Vector3()), nose, 'arm does not move face');
    let meshes = 0;
    human.traverse(node => {
      if (!node.isMesh) return;
      meshes++; assert.equal(node.geometry, box, 'every part reuses the same cached box');
      assert([...materials.values()].includes(node.material));
    });
    assert(meshes <= 27, `bounded human parts: ${meshes}`);
    count++;
  }
}
for (const layout of REGION_LAYOUTS) {
  const signs = presentationSigns(layout);
  assert.equal(signs.length, 4, 'only camp/trial/bridge/waystone labels');
  const trial = signs.find(sign => sign.trial), rival = layout.points.find(p => p.id === 'rival');
  assert.equal(trial.x, rival.x); assert.equal(trial.z, rival.z);
  assert(!signs.some(sign => sign.id.startsWith('fiber-')), 'no collectible label spam');
}
const clearing = presentationSigns(REGION_LAYOUTS[0]).find(sign => sign.trial);
assert.deepEqual([clearing.name, clearing.x, clearing.z], ['Northern Clearing', 22, -26]);
assert.deepEqual(presentationSigns({}), [], 'legacy layout without metadata remains supported');
// The renderer consumes this exact descriptor, including for explicit route-fork positions.
const camp = presentationSigns(REGION_LAYOUTS[0]).find(sign => sign.id === 'outpost');
const campCard = destinationSignLayout(camp), trialCard = destinationSignLayout(clearing);
assert.deepEqual(campCard, { x: camp.x + 2, y: 2.05, z: camp.z - 2.4, width: 3, height: .75 });
assert.deepEqual(trialCard, { x: clearing.x - 3.3, y: 2.05, z: clearing.z - 2.4, width: 3, height: .75 });
assert(trialCard.x + trialCard.width / 2 < clearing.x - 1.7, 'trial label left of arch, not behind right-hand trial stone');
assert.deepEqual(destinationSignLayout(clearing, 5, -9), { x: 5, y: 2.05, z: -9, width: 3, height: .75 });
// Actual THREE camera projection at the default fresh spawn: no camp-card/avatar overlap.
const camera = new THREE.PerspectiveCamera(45, 1, .1, 120);
camera.position.set(0, 5.6, 26); camera.lookAt(0, .6, 16); camera.updateMatrixWorld();
const rightEdge = new THREE.Vector3(campCard.width / 2, 0, 0).applyQuaternion(camera.quaternion)
  .add(new THREE.Vector3(campCard.x, campCard.y, campCard.z)).project(camera).x;
const avatarLeft = new THREE.Vector3(-.37, .85, 16).project(camera).x;
assert(rightEdge < avatarLeft, 'camp sign stays left of the initial player silhouette');
console.log('PASS: compact sign descriptors, trial-stone separation, explicit fork placement, actual default-camera camp/avatar separation');

// Canvas-size fixtures from the desktop column / phone stacked scene, not DOM-layout evidence.
const scenes = [{ name: 'desktop1280', width: 912, height: 700 },
  { name: 'phone390', width: 374, height: 280 }, { name: 'phone320', width: 304, height: 280 }];
const rectangle = points => ({ minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)),
  minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) });
const overlaps = (a, b) => a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
const actorRect = (actor, camera) => {
  actor.updateMatrixWorld(true);
  const vertices = [];
  actor.traverse(node => {
    if (!node.isMesh) return;
    const positions = node.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) vertices.push(new THREE.Vector3().fromBufferAttribute(positions, i)
      .applyMatrix4(node.matrixWorld).project(camera));
  });
  return rectangle(vertices);
};
const cardRect = (card, camera) => rectangle([-1, 1].flatMap(x => [-1, 1].map(y =>
  new THREE.Vector3(x * card.width / 2, y * card.height / 2, 0).applyQuaternion(camera.quaternion)
    .add(new THREE.Vector3(card.x, card.y, card.z)).project(camera))));
const trialStone = REGION_LAYOUTS[0].props.find(prop => prop.landmarkId === clearing.id);
const stoneGeometry = new THREE.IcosahedronGeometry(1, 0);
const stoneMesh = new THREE.Mesh(stoneGeometry, material('#d8bd83'));
stoneMesh.position.set(trialStone.x, trialStone.h * .4, trialStone.z);
stoneMesh.scale.set(trialStone.w, trialStone.h * .6, trialStone.d); stoneMesh.updateMatrixWorld(true);
let projectionCases = 0;
for (const screen of scenes) for (const location of ['spawn', 'trial']) {
  const position = location === 'spawn' ? { x: 0, z: 16 } : { x: clearing.x, z: clearing.z + 1.5 };
  const viewCamera = new THREE.PerspectiveCamera(45, screen.width / screen.height, .1, 120);
  viewCamera.position.set(position.x, 5.6, position.z + 10);
  viewCamera.lookAt(position.x, .6, position.z); viewCamera.updateMatrixWorld();
  const player = createHuman(colors, geometry, material); player.position.set(position.x, 0, position.z);
  const actors = [actorRect(player, viewCamera)];
  if (location === 'trial') {
    const trainer = createHuman({ ...colors, role: 'rival' }, geometry, material);
    trainer.position.set(clearing.x, 0, clearing.z); actors.push(actorRect(trainer, viewCamera));
  }
  for (const actor of actors) {
    assert(actor.minX > -1 && actor.maxX < 1 && actor.minY > -1 && actor.maxY < 1,
      `${screen.name}/${location}: full human geometry inside frustum`);
  }
  for (const site of presentationSigns(REGION_LAYOUTS[0])) {
    const card = destinationSignLayout(site);
    if (Math.hypot(card.x - position.x, card.y, card.z - position.z) >= 28) continue;
    const projectedCard = cardRect(card, viewCamera);
    for (const actor of actors) assert(!overlaps(projectedCard, actor),
      `${screen.name}/${location}: ${site.name} must not cover an actor`);
  }
  const primary = cardRect(destinationSignLayout(location === 'spawn' ? camp : clearing), viewCamera);
  assert(primary.minX > -1 && primary.maxX < 1 && primary.minY > -1 && primary.maxY < 1,
    `${screen.name}/${location}: destination card fully discoverable at default yaw`);
  assert((primary.maxY - primary.minY) * screen.height / 2 >= 16, 'card has measurable pixel height, not a point');
  if (location === 'trial') {
    const card = destinationSignLayout(clearing);
    for (const [x, y] of [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      const labelPoint = new THREE.Vector3(x * card.width / 2, y * card.height / 2, 0)
        .applyQuaternion(viewCamera.quaternion).add(new THREE.Vector3(card.x, card.y, card.z));
      const ray = new THREE.Raycaster(viewCamera.position, labelPoint.clone().sub(viewCamera.position).normalize(),
        0, viewCamera.position.distanceTo(labelPoint));
      assert.equal(ray.intersectObject(stoneMesh).length, 0, 'actual trial-stone triangles do not occlude card center/corners');
    }
  }
  projectionCases++;
}
stoneGeometry.dispose();
console.log(`PASS: ${projectionCases} actual THREE spawn/trial projections, desktop/390/320 canvas fixtures, full actor/card frustum, non-overlap and trial-stone ray tests`);
box.dispose(); for (const value of materials.values()) value.dispose();
console.log(`PASS: ${count} actual human rigs, cached geometry, grounded proportions, moving arm pivots, role outfits; five region sign identities and actual Northern Clearing coordinates`);
