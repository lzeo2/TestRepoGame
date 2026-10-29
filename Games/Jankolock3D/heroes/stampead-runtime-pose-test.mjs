// Actual runtime/Host/GLB checks; no browser, visual-quality or native-input claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {preloadHeroes,disposeCharacterAssets} from '../character-assets.mjs';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
await preloadHeroes();
const kit=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes.find(h=>h.id==='stampead');
const sim=createSystems(),hero=sim.addHero({id:'player',team:'carbon',position:{x:0,y:0,z:8}}),enemy=sim.addHero({id:'enemy',team:'ivory',position:{x:0,y:0,z:0}});
assert.ok(sim.configureHeroKit(hero.id,kit).ok);sim.step(30);
const scene=new THREE.Scene(),controller=new PlayerController({position:hero.position,boxes:[],floorHeight:()=>0});
const runtime=new HeroRuntime({scene,controller,kit,source:hero.id,onEffect:event=>sim.applyHeroEffect(event)});
const camera=new THREE.PerspectiveCamera(70,1,.1,100);camera.position.set(0,1,8);camera.lookAt(0,.9,0);camera.updateMatrixWorld(true);
runtime.targets=[enemy];runtime.aim(camera);
const arm=runtime.visual.group.getObjectByName('forearm_r'),rest=arm.quaternion.clone();
const placement=()=>[...controller.position.toArray(),...controller.velocity.toArray(),controller.yaw,controller.pitch,...camera.position.toArray(),...camera.quaternion.toArray()];
const sourcePlacement=placement();
const step=seconds=>{for(let left=seconds;left>1e-9;left-=.05){const dt=Math.min(.05,left);runtime.update(dt);assert.ok(sim.step(dt).ok);}};
try {
  assert.equal(typeof runtime.visual.setAcceptedAction,'function','Stampead needs the existing accepted-action presentation channel');
  const hp=enemy.hp,ammo=runtime.ammo;
  assert.equal(runtime.fire(),true);assert.equal(runtime.ammo,ammo-1);assert.equal(runtime.shots,1);assert.ok(enemy.hp<hp,'actual Host admits the ordinary kit hit');
  assert.equal(runtime.weaponAction.kind,'weapon');assert.ok(arm.quaternion.angleTo(rest)>1e-3,'accepted fire moves the stamp arm immediately');
  const action=runtime.weaponAction,shotPose=arm.quaternion.clone(),damage=enemy.hp,snapshot=runtime.snapshot();
  assert.equal(runtime.fire(),false);assert.equal(runtime.weaponAction,action);assert.deepEqual(runtime.snapshot(),snapshot);assert.equal(enemy.hp,damage);assert.ok(arm.quaternion.angleTo(shotPose)<1e-7,'cooldown rejection cannot restart the pose');
  assert.deepEqual(placement(),sourcePlacement,'pose cannot mutate aim, camera, controller motion or root placement');
  step(.15);assert.equal(runtime.weaponAction,null);assert.ok(arm.quaternion.angleTo(rest)<1e-7,'shot press recovers after its existing visual window');
  step(kit.weapon.interval+.05);assert.equal(runtime.fire(),true);assert.ok(arm.quaternion.angleTo(rest)>1e-3);
  assert.equal(runtime.melee(),true);assert.equal(runtime.weaponAction,null);assert.ok(arm.quaternion.angleTo(rest)<1e-7,'accepted melee clears the incompatible weapon press');
  step(kit.weapon.interval+.05);assert.equal(runtime.fire(),true);runtime.reset();assert.equal(runtime.weaponAction,null);assert.ok(arm.quaternion.angleTo(rest)<1e-7,'reset clears accepted presentation state');
  assert.deepEqual(placement(),sourcePlacement);assert.equal(hero.souls,0);assert.deepEqual(hero.items,[]);
  const thigh=runtime.visual.group.getObjectByName('thigh_l'),thighRest=thigh.quaternion.clone();
  controller.update(.05,{forward:1,sprint:true});assert.equal(controller.state,'sprint');assert.ok(sim.moveHero(hero.id,controller.position).ok);
  const sprintPlacement=placement();runtime.update(.05);assert.ok(thigh.quaternion.angleTo(thighRest)>1e-3,'actual controller sprint drives grounded leg pose');assert.deepEqual(placement(),sprintPlacement);
  console.log('stampead-runtime-pose: actual Host shot/ammo, immediate accepted arm press, rejection/no restart, timed recovery, melee/reset clearing, actual sprint gait and logical camera/controller isolation passed (Node GLB/Scene, not native feel)');
} finally {runtime.dispose();disposeCharacterAssets();assert.equal(scene.children.length,0);}
