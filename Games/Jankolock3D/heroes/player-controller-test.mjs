// Run: node Games/Jankolock3D/heroes/player-controller-test.mjs
// Numerical movement/camera checks only. No DOM, renderer or browser is used.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { PlayerController } from './player-controller.mjs';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const close = (actual, expected, tolerance = 1e-5) =>
  check(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const box = (minX, maxX, minY, maxY, minZ, maxZ) => ({ minX, maxX, minY, maxY, minZ, maxZ });
const origin = { x: 0, y: 0, z: 0 };
const create = options => new PlayerController({ position: origin, ...options });
function run(hero, seconds, input = {}, step = 1 / 60) {
  for (let left = seconds; left > 1e-8;) {
    const dt = Math.min(step, left); left -= dt;
    hero.update(dt, input);
  }
  return hero;
}
function noIntersection(hero, b) {
  return hero.position.x + hero.radius <= b.minX + 1e-5 || hero.position.x - hero.radius >= b.maxX - 1e-5 ||
    hero.position.z + hero.radius <= b.minZ + 1e-5 || hero.position.z - hero.radius >= b.maxZ - 1e-5 ||
    hero.position.y >= b.maxY - 1e-5 || hero.position.y + hero.height <= b.minY + 1e-5;
}
function cameraOutside(camera, b, radius = 0.3) {
  const p = camera.position;
  return p.x <= b.minX - radius || p.x >= b.maxX + radius ||
    p.y <= b.minY - radius || p.y >= b.maxY + radius ||
    p.z <= b.minZ - radius || p.z >= b.maxZ + radius;
}

const defaults = new PlayerController();
check(defaults.position instanceof THREE.Vector3 && defaults.velocity instanceof THREE.Vector3, 'public three vectors');
close(defaults.position.z, 8);
check(defaults.state === 'idle' && defaults.grounded && defaults.jumps === 0, 'default ground');
check(defaults.stamina === 100 && !defaults.infiniteAmmo, 'default resources');
const walker = run(create(), 1, { forward: 1 });
check(walker.position.z < -7 && Math.abs(walker.position.x) < 1e-6 && walker.state === 'walk', 'yaw zero forward -Z');
const strafe = run(create(), 1, { side: 1, yaw: Math.PI / 2 });
check(strafe.position.z < -7 && Math.abs(strafe.position.x) < 1e-5, 'yaw-relative strafe');
const diagonal = run(create(), 1, { forward: 1, side: 1 });
close(Math.hypot(diagonal.velocity.x, diagonal.velocity.z), 8);
const sprinter = run(create(), 1, { forward: 1, sprint: true });
check(sprinter.position.z < walker.position.z - 3 && sprinter.state === 'sprint', 'Control sprint');
const buffed = create(); buffed.speedMultiplier = 2;
run(buffed, 1, { forward: 1 });
close(buffed.position.z, walker.position.z * 2);
run(walker, 1);
check(walker.state === 'idle' && walker.velocity.length() < 1e-5, 'decelerates to idle');

const jumper = create();
jumper.update(1 / 60, { jump: true });
check(!jumper.grounded && jumper.jumps === 1 && jumper.state === 'jump', 'first jump');
run(jumper, 0.15);
jumper.update(1 / 60, { jump: true });
check(jumper.jumps === 2 && jumper.velocity.y > 8, 'second jump');
const vy = jumper.velocity.y;
jumper.update(1 / 60, { jump: true });
check(jumper.jumps === 2 && jumper.velocity.y < vy, 'third jump rejected');
run(jumper, 0.6);
check(jumper.state === 'fall', 'descending jump state');
run(jumper, 2);
check(jumper.grounded && jumper.jumps === 0 && jumper.state === 'idle', 'landing restores jumps');
jumper.update(1 / 60, { jump: true });
check(jumper.jumps === 1, 'can jump after landing');

const dasher = create();
dasher.update(1 / 60, { dash: true, forward: 1 });
close(dasher.stamina, 70);
check(dasher.state === 'dash' && dasher.position.z < -0.4, 'Shift dash cost and movement');
run(dasher, 0.8);
close(dasher.stamina, 70);
run(dasher, 0.6);
check(dasher.stamina > 70 && dasher.stamina < 80, 'recharge waits 1.25 seconds');
run(dasher, 5);
close(dasher.stamina, 100);
const tired = create(); tired.stamina = 29;
tired.update(1 / 60, { dash: true, forward: 1 });
check(tired.state !== 'dash' && tired.position.z > -0.1, 'insufficient stamina rejects dash');
const thinWall = box(-10, 10, 0, 8, -2.01, -2);
for (const speedMultiplier of [1, 4]) {
  const fast = create({ boxes: [thinWall] }); fast.speedMultiplier = speedMultiplier;
  fast.update(0.25, { forward: 1, dash: true });
  check(fast.position.z >= thinWall.maxZ + fast.radius - 1e-5, 'dash cannot tunnel through thin cover');
  check(noIntersection(fast, thinWall), 'dash remains outside cover');
  run(fast, 0.5, { forward: 1 });
  check(noIntersection(fast, thinWall), 'wall stays solid during continued movement');
}
const sideWall = box(2, 2.005, 0, 8, -10, 10);
const diagonalDash = create({ boxes: [sideWall] });
diagonalDash.update(0.25, { forward: 1, side: 1, dash: true });
check(diagonalDash.position.x <= 2 - diagonalDash.radius, 'diagonal dash respects X wall');
check(diagonalDash.position.z < -3, 'collision permits motion along wall');

const idleSlide = create(); idleSlide.update(1 / 60, { slide: true });
check(!idleSlide.infiniteAmmo && idleSlide.state === 'idle', 'slide requires momentum');
const slider = run(create(), 0.5, { forward: 1, sprint: true });
slider.update(1 / 60, { forward: 1, slide: true });
check(slider.infiniteAmmo && slider.state === 'slide' && slider.height < 1, 'slide grants infinite ammo');
slider.update(1 / 60, { slide: false });
check(!slider.infiniteAmmo && slider.height === 1.8, 'release exits slide');
run(slider, 0.5, { forward: 1, sprint: true });
slider.update(1 / 60, { forward: 1, slide: true });
run(slider, 1.1, { forward: 1, slide: true });
check(!slider.infiniteAmmo && slider.state !== 'slide', 'slide time cap survives held C');
slider.update(1 / 60, { slide: false, forward: 1 });
slider.update(1 / 60, { slide: true, forward: 1 });
check(slider.infiniteAmmo, 'release then press can slide again');
slider.update(1 / 60, { jump: true, slide: true });
check(!slider.infiniteAmmo && slider.state === 'jump', 'jump exits slide');
const backwards = run(create(), 0.5, { forward: -1, sprint: true });
backwards.update(1 / 60, { slide: true });
check(!backwards.infiniteAmmo, 'backward speed cannot start slide');
const airSlide = create({ position: { x: 0, y: 5, z: 0 } }); airSlide.velocity.z = -12;
airSlide.update(1 / 60, { slide: true });
check(!airSlide.infiniteAmmo, 'airborne speed cannot start slide');
const ledgeFloor = (x, z) => z > -4 ? 0 : -5;
const ledgeSlider = run(create({ floorHeight: ledgeFloor }), 0.25, { forward: 1, sprint: true });
ledgeSlider.update(1 / 60, { forward: 1, slide: true });
check(ledgeSlider.infiniteAmmo, 'ledge fixture enters slide');
run(ledgeSlider, 0.3, { forward: 1, slide: true });
check(!ledgeSlider.infiniteAmmo && !ledgeSlider.grounded, 'falling off ledge exits slide');

const lowCeiling = box(-10, 10, 1.1, 2, -20, -4);
const crouched = run(create({ boxes: [lowCeiling] }), 0.3, { forward: 1, sprint: true });
crouched.update(1 / 60, { forward: 1, slide: true });
run(crouched, 0.35, { forward: 1, slide: true });
check(crouched.position.z < -4 && crouched.infiniteAmmo, 'slide fits under low ceiling');
crouched.update(1 / 60, { forward: 1 });
check(!crouched.infiniteAmmo && crouched.height < 1 && noIntersection(crouched, lowCeiling), 'exit crouches without infinite ammo or ceiling penetration');
const crouchCamera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 1000);
crouched.updateCamera(crouchCamera, 1 / 60);
check(cameraOutside(crouchCamera, lowCeiling), 'crouch camera sphere clears low tunnel ceiling');
run(crouched, 3, { forward: 1 });
check(crouched.height === 1.8, 'stands after clearing ceiling');

let floorCalls = 0;
const floorHero = create({ position: { x: 0, y: 5, z: 0 }, floorHeight: (x, z, maxY) => {
  floorCalls++; check(Number.isFinite(maxY), 'floor query has bounded maxY'); return 2;
} });
run(floorHero, 2);
close(floorHero.position.y, 2);
check(floorHero.grounded && floorCalls > 5, 'custom floor catches falling hero');
const voidHero = run(create({ floorHeight: () => -Infinity }), 1);
check(voidHero.position.y < -10 && !voidHero.grounded, 'void floor does not invent ground');
const unreachableFloor = run(create({ floorHeight: () => 10 }), 0.25);
check(unreachableFloor.position.y < 0 && !unreachableFloor.grounded, 'floor callback cannot snap to an overhead level');
const ceiling = box(-5, 5, 2.4, 2.405, -5, 5);
const ceilingJumper = create({ boxes: [ceiling] });
ceilingJumper.update(0.15, { jump: true });
check(ceilingJumper.position.y + ceilingJumper.height <= ceiling.minY + 1e-5, 'jump collides with thin underside');
check(ceilingJumper.velocity.y <= 0, 'ceiling cancels upward speed');
run(ceilingJumper, 1);
check(ceilingJumper.grounded, 'ceiling jump lands back on floor');
const platform = box(-2, 2, 0, 2, -2, 2);
const topHero = run(create({ position: { x: 0, y: 8, z: 0 }, boxes: [platform] }), 2);
close(topHero.position.y, 2);
check(topHero.grounded, 'box top supports landing');
run(topHero, 1, { forward: 1 });
check(topHero.position.z < -4 && topHero.position.y < 2, 'walk off box top and fall');
const stair = box(-2, 2, 0, 0.3, -5, -2);
const stepper = run(create({ boxes: [stair] }), 0.5, { forward: 1 });
close(stepper.position.y, 0.3);
check(stepper.grounded && stepper.position.z < -2, 'walkable step up');
const rampHero = run(create({ floorHeight: (x, z, maxY) => {
  const y = Math.max(0, Math.min(3, -z * 0.2)); return y <= maxY ? y : -Infinity;
} }), 1, { forward: 1 });
check(rampHero.position.y > 1 && rampHero.grounded, 'optional callback permits a continuous ramp');

const lowObstacle = box(-3, 3, 0, 1, -5, -2);
const mantler = create({ boxes: [lowObstacle] });
let sawMantle = false;
for (let i = 0; i < 90; i++) {
  mantler.update(1 / 60, { forward: 1 });
  sawMantle ||= mantler.state === 'mantle';
  check(noIntersection(mantler, lowObstacle), 'mantle never penetrates obstacle');
}
check(sawMantle && mantler.position.z < -3, 'low obstacle can be mantled');
const overhang = box(-4, 4, 2.2, 2.5, -6, 0.5);
const noMantle = run(create({ boxes: [lowObstacle, overhang] }), 1, { forward: 1 });
check(noMantle.state !== 'mantle' && noMantle.position.z >= -2 + noMantle.radius, 'mantle requires headroom');

const grapple = create({ boxes: [thinWall] });
check(grapple.hookTo({ x: 0, y: 0, z: -10 }), 'hook accepts nearby point');
run(grapple, 0.5);
check(grapple.position.z >= -2 + grapple.radius && noIntersection(grapple, thinWall), 'hook cannot teleport through cover');
check(!grapple.hookTo({ x: NaN, y: 0, z: 0 }) && !grapple.hookTo({ x: 100, y: 0, z: 0 }), 'invalid or out-of-range hooks rejected');
const clearHook = create();
check(clearHook.hookTo({ position: { x: 0, y: 3, z: -8 } }), 'hook accepts actor position');
run(clearHook, 0.4);
check(clearHook.position.z < -7 && clearHook.position.y > 2.5, 'hook travels toward elevated target');

const camera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 1000);
const cameraHero = create(); cameraHero.updateCamera(camera, 1 / 60);
close(camera.position.x, 0.75);
close(camera.position.z, 5);
check(camera.position.y > 1, 'camera behind right shoulder');
const floorCamera = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 1000);
const floorCameraHero = create(); floorCameraHero.pitch = 1.2;
floorCameraHero.updateCamera(floorCamera, 1 / 60);
check(floorCamera.position.y >= 0.3, 'upward aim keeps camera sphere above callback floor');
const undergroundCameraHero = create({ position: { x: 0, y: -10, z: 0 }, floorHeight: () => -10 });
undergroundCameraHero.pitch = 1.2; undergroundCameraHero.updateCamera(floorCamera, 1 / 60);
check(floorCamera.position.y >= -9.7 && floorCamera.position.y < -8, 'camera floor clamp respects underground height');
const ceilingCameraHero = create({ boxes: [box(-10, 10, 3, 3.01, -10, 10)] });
ceilingCameraHero.pitch = -1; ceilingCameraHero.updateCamera(floorCamera, 1 / 60);
check(floorCamera.position.y < 2.701, 'downward aim keeps camera sphere below ceiling');
const headCeiling = box(-5, 5, 1.8, 2, -5, 5);
const headCeilingHero = create({ boxes: [headCeiling] }); headCeilingHero.updateCamera(floorCamera, 1 / 60);
check(cameraOutside(floorCamera, headCeiling), 'camera origin sphere fits below head-height ceiling');
const wideFov = camera.fov;
cameraHero.update(1 / 60, { aim: true, yaw: Math.PI / 2, pitch: 0.2 });
for (let i = 0; i < 60; i++) cameraHero.updateCamera(camera, 1 / 60);
check(camera.fov < wideFov - 15 && cameraHero.aiming, 'RMB zoom');
check(camera.position.x > 3 && camera.position.z < 0, 'camera follows aim yaw and shoulder');
cameraHero.update(1 / 60, { aim: false });
for (let i = 0; i < 60; i++) cameraHero.updateCamera(camera, 1 / 60);
close(camera.fov, wideFov, 0.001);
cameraHero.update(1 / 60, { aim: true });
for (let i = 0; i < 60; i++) cameraHero.updateCamera(camera, 1 / 60);
cameraHero.warp({ x: 20, y: 0, z: 0 });
cameraHero.updateCamera(camera, 1 / 60);
check(camera.position.x > 23, 'warp snaps camera rather than smoothing from old position');
for (let i = 0; i < 60; i++) cameraHero.updateCamera(camera, 1 / 60);
close(camera.fov, wideFov, 0.001);
const rearWall = box(-10, 10, 0, 8, 2, 2.01);
const rearHero = create({ boxes: [rearWall] }); rearHero.updateCamera(camera, 1 / 60);
check(camera.position.z < 1.701 && cameraOutside(camera, rearWall), 'camera radius clamps before rear wall');
const shoulderWall = box(0.6, 0.61, 0, 8, -2, 8);
const shoulderHero = create({ boxes: [shoulderWall] }); shoulderHero.updateCamera(camera, 1 / 60);
check(camera.position.x < 0.301 && cameraOutside(camera, shoulderWall), 'shoulder segment also respects wall radius');
const box3 = new THREE.Box3(new THREE.Vector3(-10, 0, 2), new THREE.Vector3(10, 8, 2.01));
const box3Hero = create({ boxes: [box3] }); box3Hero.updateCamera(camera, 1 / 60);
check(cameraOutside(camera, rearWall), 'camera supports THREE.Box3');
const box3Mover = create({ boxes: [new THREE.Box3(new THREE.Vector3(-10, 0, -2.01), new THREE.Vector3(10, 8, -2))] });
box3Mover.update(0.25, { forward: 1, dash: true });
check(noIntersection(box3Mover, thinWall), 'movement supports THREE.Box3');
// Turning while the previous camera position is behind new cover must not let
// interpolation carry the camera through the wall or outside the safe boom.
rearHero.yaw = Math.PI;
for (let i = 0; i < 30; i++) {
  rearHero.updateCamera(camera, 1 / 60);
  check(cameraOutside(camera, rearWall), 'smoothed camera never enters cover');
}
rearHero.yaw = 0;
rearHero.updateCamera(camera, 1 / 60);
check(camera.position.z < 1.701 && cameraOutside(camera, rearWall), 'camera reclamps after turn');
const mutableBoxes = [thinWall];
const mutableHero = create({ boxes: mutableBoxes }); mutableBoxes.pop();
mutableHero.update(0.25, { forward: 1, dash: true });
check(mutableHero.position.z < -5, 'box removals are live');

slider.warp({ x: 3, y: 0, z: 8 });
check(slider.velocity.length() === 0 && slider.state === 'idle' && slider.stamina === 100 &&
  slider.jumps === 0 && !slider.infiniteAmmo && !slider.aiming, 'warp resets movement');
close(slider.position.x, 3);
const invalidDt = create(); invalidDt.update(NaN, { forward: 1 }); invalidDt.update(-1, { dash: true });
check(invalidDt.position.length() === 0 && invalidDt.stamina === 100, 'invalid dt does not simulate');
invalidDt.update(1 / 60, { pitch: 100, yaw: NaN, forward: NaN });
close(invalidDt.pitch, 1.2);
close(invalidDt.yaw, 0);
console.log(`player-controller-test: ${checks} assertions passed (Node only; native camera/input acceptance unproven)`);
