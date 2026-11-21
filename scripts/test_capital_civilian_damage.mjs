import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createPedestrians } from '../Games/Capital Drive/pedestrians.js';
import { createShotRays, resolveShotRay } from '../Games/Capital Drive/ballistics.js';

const scene = new THREE.Scene();
const crowd = createPedestrians(scene, {
  bounds: { minX: -1600, maxX: 1600, minZ: -500, maxZ: 500 },
  roads: Array.from({ length: 28 }, (_, i) => ({ id: `street-${i}`, name: 'Example Street', type: 'residential', width: 8,
    points: [[-1400 + i * 100, 0], [-1300 + i * 100, 0]] })),
  spawn: { x: 0, z: 0, yaw: 0 }, buildings: [], landmarks: [],
}, () => 0);
const originalCount = crowd.snapshot().length;
const origin = { x: 0, z: 0, speed: 0 };
const tick = (focus, seconds) => { for (let i = 0; i < seconds * 10; i++) crowd.update(focus, .1); };
const current = id => crowd.snapshot().find(p => p.id === id);
const victim = crowd.snapshot().find(p => Math.hypot(p.x, p.z) < 100);
assert(victim);
const ray = createShotRays({ x: victim.x, y: 1.1, z: victim.z + 1, yaw: 0, range: 2 })[0];
const target = crowd.shotTargets().find(p => p.id === victim.id);
assert.equal(resolveShotRay(ray, { targets: [target] }).target.id, victim.id);
assert.equal(crowd.hitByShot(victim.id, 100, { ...ray, interiorId: 'other' }).hits, 0);
assert.equal(crowd.hitByShot(victim.id, 100, ray).hits, 1, 'actual selected ray reaches the native damage owner');
assert.equal(current(victim.id).health, 0);
assert.equal(current(victim.id).dead, true);
assert(crowd.drainEvents().some(e => e.type === 'witness' && e.offenderId === 'player'));
const frozen = crowd.snapshot();
crowd.update(origin, 0);
assert.deepEqual(crowd.snapshot(), frozen, 'pause freezes lethal fall and all people');
tick(origin, 30);
const casualty = current(victim.id);
assert.equal(casualty.health, 0, 'nearby firearm casualty never regenerates');
assert.equal(casualty.reaction, 'dead');
assert.equal(casualty.deathTime, .22);
assert.equal(casualty.x, victim.x);
assert.equal(casualty.z, victim.z);
assert(!crowd.shotTargets().some(p => p.id === victim.id));
assert.equal(crowd.writeContacts().find(p => p.id === `ped:${victim.id}`).active, false);
assert(!crowd.drainEvents().some(e => e.type === 'retaliation' && e.personId === victim.id));
assert.equal(crowd.hitByShot(victim.id, 100, ray).hits, 0);
const torso = scene.children[0].children.find(mesh => mesh.name === 'Pedestrian torso');
const matrix = new THREE.Matrix4();
let downPose = false;
for (let i = 0; i < torso.count; i++) {
  torso.getMatrixAt(i, matrix);
  if (Math.hypot(matrix.elements[12] - victim.x, matrix.elements[14] - victim.z) < 2 &&
    Math.abs(matrix.elements[5]) < .1) downPose = true;
}
assert(downPose, 'casualty uses the existing ground-level tumble pose');
tick({ x: 700, z: 0, speed: 0 }, 3);
assert.equal(current(victim.id).health, 100, 'distant existing recycler replaces the dead slot out of sight');
assert.equal(current(victim.id).dead, false);
assert(Math.hypot(current(victim.id).x - 700, current(victim.id).z) > 180);
assert.equal(crowd.snapshot().length, originalCount, 'death/replacement never shrinks or grows the crowd');

crowd.resetPopulation(origin);
const blastTarget = crowd.snapshot()[0];
const blast = { x: blastTarget.x, z: blastTarget.z, range: 4, damage: 100, kind: 'explosion' };
assert.equal(crowd.strike({ ...blast, hasLineOfSight: () => false }).hits, 0);
assert(crowd.strike({ ...blast, hasLineOfSight: () => true }).people.some(p => p.id === blastTarget.id && p.health === 0));
tick(origin, 20);
assert.equal(current(blastTarget.id).dead, true);
assert.equal(current(blastTarget.id).health, 0);

crowd.resetPopulation(origin);
const fistTarget = crowd.snapshot()[0];
assert(crowd.strike({ x: fistTarget.x, z: fistTarget.z + 1, range: 1.2, damage: 100, kind: 'melee' }).hits);
assert.equal(current(fistTarget.id).dead, false, 'fists retain the nonlethal knockout rule');
tick(origin, 20);
assert.equal(current(fistTarget.id).health, 100);
crowd.dispose();
assert.deepEqual(crowd.shotTargets(), []);
console.log('PASS civilian damage: selected ray, room exclusion, lethal gun/blast, grounded pose, pause, no retaliation, bounded distant replacement and nonlethal fists');
