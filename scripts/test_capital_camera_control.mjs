import assert from 'node:assert/strict';
import {lookAngles,footCameraFrame,cameraBlend,createExplosionShake} from '../Games/Capital Drive/camera-control.js';
import {MAX_AIM_PITCH} from '../Games/Capital Drive/ballistics.js';
const pose={x:10,z:-4,jumpHeight:.3},copy={...pose};
for(const yaw of [0,.7,-1.8,Math.PI])for(const pitch of [-.9,0,.9])for(const indoors of [false,true]){
  const frame=footCameraFrame(pose,{yaw,pitch,ground:6,aiming:true,indoors});
  assert(Object.values(frame.camera).every(Number.isFinite)&&Object.values(frame.target).every(Number.isFinite));
  assert(Math.abs(frame.target.y-(7.75+Math.sin(pitch)*32))<1e-10);
  assert(Math.abs(frame.target.x-(pose.x-Math.sin(yaw)*Math.cos(pitch)*32))<1e-10);
}
assert.deepEqual(pose,copy);
const scoped=footCameraFrame({...pose,crouching:true},{yaw:.5,pitch:.3,ground:6,aiming:true,scoped:true});
assert.deepEqual(scoped.camera,{x:pose.x,y:7.2,z:pose.z},'scope camera sits at the crouched shot origin');
assert(Math.abs(scoped.target.y-(scoped.camera.y+Math.sin(.3)*32))<1e-9);
assert(Math.abs(scoped.target.z-(pose.z-Math.cos(.5)*Math.cos(.3)*32))<1e-9);
const standing=footCameraFrame(pose),crouched=footCameraFrame({...pose,crouching:true});
for(const key of ['camera','target']){
  assert(Math.abs(standing[key].y-crouched[key].y-.45)<1e-10);
  assert.equal(standing[key].x,crouched[key].x);assert.equal(standing[key].z,crouched[key].z);
}
assert(lookAngles(0,0,0,-40).pitch>0);assert(lookAngles(0,0,0,40).pitch<0);
assert.equal(lookAngles(0,MAX_AIM_PITCH,0,-100).pitch,MAX_AIM_PITCH);
assert.equal(lookAngles(0,-MAX_AIM_PITCH,0,100).pitch,-MAX_AIM_PITCH);
assert(Object.values(lookAngles(NaN,Infinity,NaN,Infinity)).every(Number.isFinite));
assert.equal(cameraBlend(0),0);assert(cameraBlend(.05,true)>cameraBlend(.05,false));
const one=cameraBlend(.05),half=cameraBlend(.025);assert(Math.abs(one-(1-(1-half)**2))<1e-12,'camera damping is independent of frame subdivision');
assert.equal(cameraBlend(10),cameraBlend(.1));assert.equal(cameraBlend(NaN),0);
const near=createExplosionShake(),far=createExplosionShake();
const magnitude=offset=>Math.hypot(offset.x,offset.y,offset.z,offset.roll);
assert(!near.kick(NaN,12,160));
assert(!near.kick(36,12,160));
assert(near.kick(2,12,160));
assert(far.kick(16,12,160));
assert(magnitude(near.advance(.02))>magnitude(far.advance(.02)));
assert.equal(near.advance(1),null,'shake leaves no stale camera offset');
assert(far.kick(2,12,160));
assert.equal(far.advance(.02,true),null,'motion suppression clears the active shake');
assert.equal(far.advance(.02),null);
console.log('PASS camera controls: real positive-up pitch, bounded mouse deltas, all headings/interiors, unchanged bodies, finite camera framing and frame-independent damping');
