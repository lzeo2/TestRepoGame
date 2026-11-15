import assert from 'node:assert/strict';
import {lookAngles,footCameraFrame,cameraBlend} from '../Games/Capital Drive/camera-control.js';
import {MAX_AIM_PITCH} from '../Games/Capital Drive/ballistics.js';
const pose={x:10,z:-4,jumpHeight:.3},copy={...pose};
for(const yaw of [0,.7,-1.8,Math.PI])for(const pitch of [-.9,0,.9])for(const indoors of [false,true]){
  const frame=footCameraFrame(pose,{yaw,pitch,ground:6,aiming:true,indoors});
  assert(Object.values(frame.camera).every(Number.isFinite)&&Object.values(frame.target).every(Number.isFinite));
  assert(Math.abs(frame.target.y-(7.75+Math.sin(pitch)*32))<1e-10);
  assert(Math.abs(frame.target.x-(pose.x-Math.sin(yaw)*Math.cos(pitch)*32))<1e-10);
}
assert.deepEqual(pose,copy);
assert(lookAngles(0,0,0,-40).pitch>0);assert(lookAngles(0,0,0,40).pitch<0);
assert.equal(lookAngles(0,MAX_AIM_PITCH,0,-100).pitch,MAX_AIM_PITCH);
assert.equal(lookAngles(0,-MAX_AIM_PITCH,0,100).pitch,-MAX_AIM_PITCH);
assert(Object.values(lookAngles(NaN,Infinity,NaN,Infinity)).every(Number.isFinite));
assert.equal(cameraBlend(0),0);assert(cameraBlend(.05,true)>cameraBlend(.05,false));
const one=cameraBlend(.05),half=cameraBlend(.025);assert(Math.abs(one-(1-(1-half)**2))<1e-12,'camera damping is independent of frame subdivision');
assert.equal(cameraBlend(10),cameraBlend(.1));assert.equal(cameraBlend(NaN),0);
console.log('PASS camera controls: real positive-up pitch, bounded mouse deltas, all headings/interiors, unchanged bodies, finite camera framing and frame-independent damping');
