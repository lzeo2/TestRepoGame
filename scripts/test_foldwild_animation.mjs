import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../Games/Foldwild/vendor/three.module.js';
import { createHuman, updateHumanMotion, inspectHumanMotion, battleMotion } from '../Games/Foldwild/view.js';

// These are the actual functions called by render(), with local THREE scene graphs.
const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshBasicMaterial();
const human = () => {
  const rig = createHuman({ skin: '#bc916b', coat: '#365a74', hair: '#38342d', hairStyle: 'short', pack: '#ac9265' }, () => geometry, () => material);
  rig.rotation.y = 0;
  return rig;
};
const near = (a, b, message, epsilon = 1e-7) => assert(Math.abs(a - b) < epsilon, `${message}: ${a} vs ${b}`);
const planted = pose => {
  near(pose.position.y, 0, 'no root bob');
  assert(Object.values(pose.limbs).some(limb => limb.grounded), 'at least one boot grounded');
  for (const limb of Object.values(pose.limbs)) {
    assert(limb.sole.y >= -1e-7, 'no foot penetrates ground');
    near(limb.hip + limb.knee + limb.ankle, 0, 'boot counter-rotation');
  }
};
const rig = human(), position = { x: 0, z: 0, yaw: -Math.PI };
updateHumanMotion(rig, position, 0);
const idle = inspectHumanMotion(rig);
planted(idle);
for (let i = 0; i < 120; i++) updateHumanMotion(rig, position, 1 / 60);
assert.deepEqual(inspectHumanMotion(rig), idle, 'idle is absolutely still');
assert(Object.isFrozen(idle) && Object.isFrozen(idle.limbs.left.sole));

let movedArm = false, movedKnee = false, liftedFoot = false, plantedSamples = 0, previous = null;
for (let i = 0; i < 180; i++) {
  position.z += 2 / 60;
  updateHumanMotion(rig, position, 1 / 60);
  const pose = inspectHumanMotion(rig);
  planted(pose);
  movedArm ||= Math.abs(pose.limbs.left.arm) > .3;
  movedKnee ||= Math.abs(pose.limbs.left.knee - idle.limbs.left.knee) > .15;
  liftedFoot ||= pose.limbs.left.sole.y > .08;
  if (i > 30 && previous) for (const side of ['left', 'right']) {
    const a = previous.limbs[side], b = pose.limbs[side];
    if (a.grounded && b.grounded) {
      near(a.sole.z, b.sole.z, 'stance foot stays planted in world');
      near(a.sole.x, b.sole.x, 'no lateral slide');
      plantedSamples++;
    }
  }
  previous = pose;
}
assert(movedArm && movedKnee && liftedFoot && plantedSamples > 80, 'real articulated grounded walk');
near(inspectHumanMotion(rig).speed, 2, 'measured authoritative speed');
const frozen = inspectHumanMotion(rig);
updateHumanMotion(rig, position, 0);
assert.deepEqual(inspectHumanMotion(rig), frozen, 'paused dt does not advance animation');
for (let i = 0; i < 45; i++) updateHumanMotion(rig, position, 1 / 60);
const stopped = inspectHumanMotion(rig);
assert.equal(stopped.weight, 0);
assert.equal(stopped.phase, 0);
for (const limb of Object.values(stopped.limbs)) {
  near(limb.arm, 0, 'arms settle'); near(limb.sole.y, 0, 'both stopped soles grounded');
}
for (let i = 0; i < 30; i++) updateHumanMotion(rig, position, 1 / 60);
assert.deepEqual(inspectHumanMotion(rig), stopped, 'stopped pose does not creep');

// Distance drives cadence: equal distance at different speeds gives equal phase.
const travel = (speed, seconds) => {
  const actor = human(), p = { x: 0, z: 0, yaw: -Math.PI };
  updateHumanMotion(actor, p, 0);
  for (let i = 0; i < seconds * 60; i++) { p.z += speed / 60; updateHumanMotion(actor, p, 1 / 60); }
  return inspectHumanMotion(actor);
};
near(travel(1, .3).phase, travel(2, .15).phase, 'equal distance, equal stride phase');
near(travel(2, .3).phase, travel(1, .3).phase * 2, 'double speed doubles cadence');
planted(travel(4, .3));

// Turn across the wrap takes the short route, never changes controller state.
rig.rotation.y = Math.PI - .05;
position.yaw = .05;
const input = structuredClone(position);
updateHumanMotion(rig, position, 1 / 60);
assert(rig.rotation.y > Math.PI - .05 && rig.rotation.y < Math.PI + .05, 'smooth shortest turn');
assert.deepEqual(position, input, 'animation never writes controller position/yaw');
updateHumanMotion(rig, position, 0, true);
const reduced = inspectHumanMotion(rig);
near(reduced.yaw, position.yaw + Math.PI, 'reduced-motion facing is immediate');
assert.equal(reduced.weight, 0); planted(reduced);
position.z += .1;
updateHumanMotion(rig, position, 1 / 60, true);
assert.equal(inspectHumanMotion(rig).weight, 0, 'reduced motion suppresses gait');

// Actual battle offsets: anticipation, lunge, delayed impact, exact recovery.
assert(battleMotion('ability', .15).acting < 0);
assert(battleMotion('ability', .4).acting > .6);
assert.equal(battleMotion('ability', .3).target, 0);
assert(battleMotion('ability', .52).target > .19);
assert(battleMotion('hit', .2).acting < -.17);
for (const type of ['ability', 'hit']) {
  near(battleMotion(type, 0).acting, 0, 'battle begins at anchor');
  near(battleMotion(type, 0).target, 0, 'no premature impact');
  near(battleMotion(type, 1).acting, 0, 'battle actor recovers');
  near(battleMotion(type, 1).target, 0, 'battle target recovers');
}
// Exercise the same position/motion sampling order as controller move() then render().
for (const fps of [30, 60]) {
  const actor = human(), p = { x: 0, z: 16, yaw: 0 };
  actor.rotation.y = p.yaw + Math.PI;
  updateHumanMotion(actor, p, 0);
  for (let i = 0; i < fps; i++) { p.z -= 4 / fps; updateHumanMotion(actor, p, 1 / fps); planted(inspectHumanMotion(actor)); }
  const beforePause = inspectHumanMotion(actor);
  for (let i = 0; i < fps * 2; i++) updateHumanMotion(actor, p, 0);
  assert.deepEqual(inspectHumanMotion(actor), beforePause, `${fps}Hz: modal/pause frames preserve complete pose`);
  p.z -= 4 / fps; updateHumanMotion(actor, p, 1 / fps);
  near(inspectHumanMotion(actor).speed, 4, 'resume excludes paused wall time');
  planted(inspectHumanMotion(actor));
  for (let i = 0; i < fps; i++) updateHumanMotion(actor, p, 1 / fps);
  assert.equal(inspectHumanMotion(actor).weight, 0, 'release input settles after resumed walk');
  // Returning from inspector creates a fresh rig at the saved position, not the origin.
  const restored = human(); restored.rotation.y = p.yaw + Math.PI;
  updateHumanMotion(restored, p, 0);
  const idlePose = inspectHumanMotion(restored);
  updateHumanMotion(restored, p, 1 / fps);
  assert.deepEqual(inspectHumanMotion(restored), idlePose, 'world reconstruction cannot invent a step');
  const origin = { ...p }; p.x += 12; updateHumanMotion(restored, p, 1 / fps);
  assert.equal(inspectHumanMotion(restored).speed, 0, 'teleport is not locomotion');
  assert.equal(inspectHumanMotion(restored).phase, 0);
  assert.equal(origin.z, p.z, 'presentation does not mutate caller data');
}

// Execute the actual shared setAppearance body with real THREE groups/cached resources.
// WebGL is unnecessary here; only the closed-over view state is supplied by this fixture.
const source = readFileSync(new URL('../Games/Foldwild/view.js', import.meta.url), 'utf8');
const start = source.indexOf('  function setAppearance('), end = source.indexOf('  function orbitCamera(', start);
assert(start >= 0 && end > start, 'real setter extraction boundary');
const boundaryFailures = [];
const requireBoundary = check => { try { check(); } catch (error) { boundaryFailures.push(error); } };
const appearanceMaterials = new Map();
const colorMaterial = color => {
  if (!appearanceMaterials.has(color)) appearanceMaterials.set(color, new THREE.MeshBasicMaterial({ color }));
  return appearanceMaterials.get(color);
};
const boundary = Function('THREE', 'createHuman', 'geometry', 'material', `
  let disposed = false;
  const appearance = {skin:'#bc916b', coat:'#365a74', hair:'#38342d', hairStyle:'short', pack:'#ac9265'};
  const root = new THREE.Group(), playerPosition = new THREE.Vector3(8,0,-12), playerYaw = .4;
  const human = colors => createHuman(colors, geometry, material);
  let player = human(appearance); root.add(player); player.position.copy(playerPosition); player.rotation.y = playerYaw + Math.PI;
  ${source.slice(start, end)}
  return {setAppearance, root, getPlayer:()=>player, getAppearance:()=>({...appearance}), dispose:()=>{disposed=true;}};
`)(THREE, createHuman, () => geometry, colorMaterial);
const target = { x: 8, z: -12, yaw: .4 };
const initial = boundary.getPlayer();
updateHumanMotion(initial, target, 0);
const unchanged = boundary.getAppearance();
boundary.setAppearance(null); boundary.setAppearance('invalid');
assert.equal(boundary.getPlayer(), initial, 'non-object requests cannot rebuild the actor');
boundary.setAppearance({ skin: 'javascript:bad', coat: '#fff', hair: 'invalid', pack: 'red' });
assert.deepEqual(boundary.getAppearance(), unchanged, 'invalid palette/style values cannot enter materials');
assert.equal(boundary.root.children.length, 1, 'replacement never duplicates player');
boundary.setAppearance({ skinTone: '#123456', coatColor: '#234567', hairColor: '#345678', backpackColor: '#456789', hair: 'long' });
const replacement = boundary.getPlayer();
assert.equal(replacement.getObjectByName('face').material.color.getHexString(), '123456');
assert.equal(replacement.getObjectByName('jacket').material.color.getHexString(), '234567');
requireBoundary(() => assert.equal(replacement.getObjectByName('hair').material.color.getHexString(), '345678',
  'valid hairColor alias must remain usable alongside hair style'));
assert.equal(replacement.getObjectByName('pack').material.color.getHexString(), '456789');
assert.equal(initial.parent, null, 'old rig detached, shared resources retained');
assert.equal(boundary.root.children.length, 1);
near(replacement.rotation.y, target.yaw + Math.PI, 'appearance preserves authoritative facing');
assert.deepEqual(replacement.position.toArray(), [target.x, 0, target.z], 'appearance preserves authoritative position');
updateHumanMotion(replacement, target, 0);
const replacedIdle = inspectHumanMotion(replacement); planted(replacedIdle);
updateHumanMotion(replacement, target, 1 / 30);
assert.deepEqual(inspectHumanMotion(replacement), replacedIdle, 'appearance at paused location does not stride on resume');
// Unchanged service appearance must preserve the actual rig and its complete paused gait.
const moving = { ...target, z: target.z - .1 };
updateHumanMotion(replacement, moving, 1 / 30);
const movingPose = inspectHumanMotion(replacement), motionState = structuredClone(replacement.userData.motion);
assert(movingPose.weight > 0);
updateHumanMotion(replacement, moving, 0);
boundary.setAppearance({ coat: '#234567' });
assert.equal(boundary.getPlayer(), replacement, 'unchanged coat preserves the actual player rig');
assert.deepEqual(inspectHumanMotion(boundary.getPlayer()), movingPose, 'unchanged coat preserves full motion/limb/facing snapshot');
assert.deepEqual(boundary.getPlayer().userData.motion, motionState, 'unchanged coat preserves internal motion sampler state');
boundary.dispose(); const disposedPlayer = boundary.getPlayer(); boundary.setAppearance({ coat: '#ffffff' });
assert.equal(boundary.getPlayer(), disposedPlayer, 'disposed view does not rebuild');
for (const value of appearanceMaterials.values()) value.dispose();
console.log('PASS: 30/60Hz walking-pause-resume-idle, inspector-style reconstruction, teleport suppression, actual setAppearance validation/color-aliases/position/facing/single-player/disposed boundaries; unchanged coat preserves rig and full paused motion');
geometry.dispose(); material.dispose();
console.log(`PASS: actual THREE articulated walk, ${plantedSamples} planted-foot samples, grounded soles, speed cadence, smooth stop/turn, frozen dt, reduced motion, immutable diagnostics/controller input, battle anticipation/impact/recovery`);
if (boundaryFailures.length) throw new AggregateError(boundaryFailures, 'Actual setAppearance boundary regression(s); runtime is read-only in this lane');
