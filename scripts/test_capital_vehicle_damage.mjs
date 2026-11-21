import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createCar } from '../assets/car-arcade/models.js';
import { BY_ID } from '../assets/car-arcade/fleet.js';
import { createVehicleDamage, createVehicleFires, VEHICLE_FIRE_LIMITS } from '../Games/Capital Drive/vehicle-damage.js';
import { createVehicleDamageView } from '../Games/Capital Drive/vehicle-damage-view.js';

const car = { x: 10, z: 20, yaw: .7 }, context = health => ({ car, carKey: 'car:1', health });
const damage = createVehicleDamage();
damage.step(.05, context(100)); assert.equal(damage.snapshot().severity, 0);
damage.step(.05, context(50)); assert.equal(damage.snapshot().severity, .5); assert.equal(damage.snapshot().fire, 0);
damage.step(.1, context(25));
assert(damage.snapshot().burning && damage.snapshot().smoke > 0);
const input = context(25), copy = structuredClone(input);
const first = damage.drainEvents();
assert.equal(first.length, 1); assert.equal(first[0].type, 'burnDamage'); assert.equal(first[0].carKey, 'car:1');
assert.equal(first[0].damage, .2); assert(Object.isFrozen(first[0]));
assert.deepEqual(damage.drainEvents(), [], 'burn request drains exactly once');
const frozen = damage.snapshot();
assert(Object.isFrozen(frozen));
for (const dt of [0, -1, Infinity, NaN]) damage.step(dt, context(100));
damage.step(1, { ...context(100), paused: true });
assert.deepEqual(damage.snapshot(), frozen, 'pause and invalid time freeze condition, fire and identity');
damage.step(.05, input); assert.deepEqual(input, copy, 'module never changes authoritative car/health');
damage.drainEvents();
damage.step(100, context(25)); assert.equal(damage.drainEvents()[0].damage, .2, 'long supplied steps clamp burn damage');
damage.step(.1, context(29)); assert(damage.snapshot().burning, 'threshold hysteresis prevents flickering at low health');
damage.step(.1, context(31)); assert.equal(damage.snapshot().fire, 0); assert.deepEqual(damage.drainEvents(), []);
damage.step(.1, context(0)); assert(damage.snapshot().wrecked && damage.snapshot().fire > 0);
for (let i = 0; i < 120; i++) damage.step(.1, context(0));
assert.equal(damage.snapshot().fire, 0); assert.equal(damage.snapshot().smoke, 0);
assert.deepEqual(damage.drainEvents(), [], 'wreck fires expire once without recurrent explosions or health requests');
damage.step(.1, context(0)); assert.equal(damage.snapshot().fire, 0, 'persistent wreck cannot restart its ten-second effect');
damage.step(.1, { ...context(20), carKey: 'car:2' });
assert(damage.snapshot().burning); assert.equal(damage.drainEvents()[0].carKey, 'car:2');
damage.step(.1, { ...context(100), carKey: 'car:3' });
assert.equal(damage.snapshot().severity, 0); assert.equal(damage.snapshot().fire, 0);
damage.step(.1, { ...context(.05), carKey: 'car:4' });
assert.equal(damage.drainEvents()[0].damage, .05, 'burn cannot request more than remaining vehicle health');
damage.step(.1, { ...context(20), carKey: 'car:5' });
damage.step(.1, { ...context(100), carKey: 'car:6' });
assert.deepEqual(damage.drainEvents(), [], 'replacement clears stale damage from the previous identity');
for (const invalid of [{ ...context(1), health: NaN }, { ...context(1), carKey: null },
  { ...context(1), car: { ...car, x: Infinity } }]) {
  damage.step(.1, invalid); assert.equal(damage.snapshot().active, false); assert.deepEqual(damage.drainEvents(), []);
}
damage.reset(); assert.equal(damage.snapshot().carKey, null);

const roadFleet=new Map(),focus={x:0,z:0};
const fires=createVehicleFires({resolve:id=>roadFleet.get(id),heightAt:()=>3,damage:(id,amount)=>{
  const target=roadFleet.get(id);
  if(target)target.health=Math.max(0,target.health-amount);
}});
function npc(id,x=10){
  const target={id,active:true,x,z:5,yaw:0,length:4.6,health:100};
  roadFleet.set(id,target);return target;
}
function shot(target,amount){
  const previous=target.health;target.health=Math.max(0,previous-amount);
  return fires.recordShot(target,previous);
}
const patrol=npc('police:4');
assert(!shot(patrol,45));assert.equal(fires.snapshot(focus).length,0);
assert(shot(patrol,35));assert.equal(fires.snapshot(focus)[0].fire,1);
patrol.x=18;assert.equal(fires.snapshot(focus)[0].x,18,'fire follows current vehicle position');
assert.equal(fires.snapshot({x:300,z:0}).length,0,'distant fire is culled');
for(let i=0;i<50;i++)fires.step(.1);
assert.equal(patrol.health,0,'burn damage is applied by the vehicle owner');
const blown=fires.drainExplosions();
assert.equal(blown.length,1);assert.equal(blown[0].kind,'vehicle-fire');assert.equal(blown[0].x,18);
for(let i=0;i<100;i++)fires.step(.1);
assert.equal(fires.tracked,0);assert.deepEqual(fires.drainExplosions(),[]);
assert(!shot(patrol,999));assert.deepEqual(fires.drainExplosions(),[],'dead cars never restart fires');
const delivery=npc('courier:1');shot(delivery,45);assert(shot(delivery,45));
const replacement=npc(delivery.id);
fires.step(.1);assert.equal(fires.tracked,0,'replacement car does not inherit tracked damage');
assert.equal(replacement.health,100);
const parked=npc('parked:2');shot(parked,45);assert(shot(parked,45));
roadFleet.delete(parked.id);fires.step(.1);
assert.equal(fires.tracked,0,'retired cars leave the pool');
const unrelated=npc('blast-only');unrelated.health=12;fires.step(.1);assert.equal(fires.tracked,0);
const stray=npc('stale');shot(stray,40);for(let i=0;i<60;i++)fires.step(.1);
assert(!shot(stray,60),'expired bullet history cannot ignite a newly hit car');
for(let i=0;i<20;i++){
  const target=npc(`traffic:${i}`,i);
  shot(target,45);shot(target,45);
}
assert(fires.tracked<=VEHICLE_FIRE_LIMITS.tracked);
const nearbyFires=fires.snapshot(focus);
assert.equal(nearbyFires.length,VEHICLE_FIRE_LIMITS.visible);

const scene = new THREE.Scene(), view = createVehicleDamageView(scene, () => 3);
const state = Object.freeze({ active: true, severity: .8, x: 10, z: 20, yaw: .7, age: 1, fire: 1, smoke: 1 });
for (const id of Object.keys(BY_ID)) {
  const original = createCar(id), untouched = createCar(id), body = original.getObjectByName('body');
  const source = body.geometry, positions = [...source.attributes.position.array], material = body.material;
  let sourceDisposed = 0, materialDisposed = 0;
  source.addEventListener('dispose', () => sourceDisposed++); material.addEventListener('dispose', () => materialDisposed++);
  view.update({ ...state, severity: 0, fire: 0, smoke: 0 }, original);
  assert.equal(body.geometry, source, 'healthy cars borrow factory geometry without a clone');
  view.update(state, original);
  assert.notEqual(body.geometry, source, `${id} hood deformation owns a private geometry`);
  assert.equal(untouched.getObjectByName('body').geometry, source);
  assert.deepEqual([...source.attributes.position.array], positions, 'all factory positions remain byte-for-byte unchanged');
  assert.equal(body.material, material, 'damage does not recolor/dispose shared material');
  assert.notDeepEqual([...body.geometry.attributes.position.array], positions, `${id} body is actually crumpled`);
  assert([...body.geometry.attributes.position.array].every(Number.isFinite));
  assert(view.stats.clonedGeometries <= 2 && view.stats.fireInstances <= 5 && view.stats.smokeInstances <= 5);
  assert.equal(view.stats.drawCalls, 2); assert.equal(view.stats.effectGeometries, 1); assert.equal(view.stats.effectMaterials, 2);
  const clone = body.geometry, pool = scene.children[0].children;
  const matrices = pool.map(mesh => [...mesh.instanceMatrix.array]);
  view.update(state, original);
  assert.equal(body.geometry, clone, 'steady frames reuse the same deformation geometry');
  assert.deepEqual(pool.map(mesh => [...mesh.instanceMatrix.array]), matrices, 'unchanged supplied phase freezes effect matrices');
  assert(pool.every(mesh => [...mesh.instanceMatrix.array].every(Number.isFinite)));
  view.update(state, original, { interiorId: 'inside' }); assert.equal(view.stats.drawCalls, 0, 'outdoor car effects never leak into a room');
  view.update({ ...state, severity: 0, fire: 0, smoke: 0 }, original);
  assert.equal(body.geometry, source, 'full repair restores exact original geometry and releases private buffers');
  assert.equal(view.stats.clonedGeometries, 0);
  assert.equal(sourceDisposed, 0); assert.equal(materialDisposed, 0);
}
const old = createCar('lantern'), fresh = createCar('atlas'), oldSource = old.getObjectByName('body').geometry;
view.update(state,old,{npcFires:nearbyFires});
assert.equal(view.stats.drawCalls,2);
assert.equal(view.stats.fireInstances,5+3*VEHICLE_FIRE_LIMITS.visible);
assert.equal(view.stats.smokeInstances,5+3*VEHICLE_FIRE_LIMITS.visible);
view.update(state,old,{interiorId:'room',npcFires:nearbyFires});
assert.equal(view.stats.drawCalls,0);
view.update(state, old); const oldClone = old.getObjectByName('body').geometry;
let cloneDisposed = 0; oldClone.addEventListener('dispose', () => cloneDisposed++);
view.update(state, fresh);
assert.equal(old.getObjectByName('body').geometry, oldSource, 'replacement restores the removed vehicle');
assert.equal(cloneDisposed, 1, 'replacement disposes only the old adapter geometry');
const freshSource = createCar('atlas').getObjectByName('body').geometry;
view.dispose(); view.dispose();
assert.equal(fresh.getObjectByName('body').geometry, freshSource);
assert.equal(scene.children.length, 0); assert.equal(view.stats.drawCalls, 0); assert.equal(view.stats.clonedGeometries, 0);
view.update(state, fresh); assert.equal(scene.children.length, 0, 'disposed view cannot allocate new resources');
console.log(`PASS vehicle burn authority, sustained NPC ignition, one blast and cleanup, ten-second player wreck expiry, ${Object.keys(BY_ID).length} original models deformed with shared-resource isolation, two shared draws, repair/replacement and disposal`);
