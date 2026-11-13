import assert from 'node:assert/strict';
import {CameraRig,CAMERA_ZOOM,courtFitDistance} from '../js/camera-rig.js';
import {COURT} from '../js/court-config.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const finite=result=>assert([...result.position,...result.target,result.distance,result.near,result.far,result.zoom].every(Number.isFinite));
const base={mode:'ball',pitch:{x:100,y:3,z:200},match:{players:[{x:-40,z:0},{x:40,z:20}],ball:{x:-40,y:1,z:0,owner:0}}};
const rig=new CameraRig();
let result=rig.update(1/60,base);
assert.deepEqual(result.target,[60,6,200]);
for(let i=0;i<120;i++) {
  base.match.ball.y=i%2?20:.4;
  const next=rig.update(1/60,base);
  assert.deepEqual(next.target,result.target,'Ball bounce never changes grounded aim');result=next;
}
base.match.ball.owner=1;
let next=rig.update(1/60,base);
assert(distance(next.target,result.target)<=42/60+1e-8,'Abrupt steal has bounded target speed');
for(let i=0;i<60;i++) {
  result=next;base.match.ball={x:40-i*1.3,y:Math.sin(i)*10,z:20-i*.5,owner:null,flight:{kind:'pass'}};
  next=rig.update(1/60,base);finite(next);
  assert(distance(next.target,result.target)<=42/60+1e-8,'Fast flight remains bounded');
  assert.equal(next.target[1],6,'Flight arc does not tilt the horizon');
}
const frozen=rig.update(0,{...base,yaw:2,zoom:.65,match:{ball:{x:900,z:900}}});
assert.deepEqual(frozen.target,next.target);assert.deepEqual(frozen.position,next.position);
finite(rig.update(NaN,{aspect:NaN,yaw:Infinity,zoom:NaN,avatar:{x:NaN},pitch:[Infinity,NaN,-Infinity]}));
for(const mode of ['avatar','pitch','ball','player','celebration','icon','hoop','goalcorner'])for(const zoom of [-100,100]) {
  const output=new CameraRig().update(1/60,{...base,mode,zoom,index:1});finite(output);
  assert.equal(output.zoom,zoom<0?CAMERA_ZOOM.min:CAMERA_ZOOM.max);
  assert(output.position[1]-output.target[1]>=(mode==='avatar'?12:18),'Camera stays above floor and stands');
}
// Project every court/hoop bound against the actual camera basis for wide/tall aspects and yaw.
for(const aspect of [.3,.55,1,16/9,3])for(const yaw of [0,.7,Math.PI/2,2.6]) {
  const output=new CameraRig().update(1/60,{mode:'pitch',aspect,yaw});
  const offset=output.position.map((v,i)=>v-output.target[i]),d=Math.hypot(...offset),n=offset.map(v=>v/d);
  const right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-n[1]*Math.sin(yaw),Math.hypot(n[0],n[2]),-n[1]*Math.cos(yaw)];
  const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),tan=Math.tan(52*Math.PI/360);
  for(const x of [-COURT.halfLength,COURT.halfLength])for(const z of [-COURT.halfWidth,COURT.halfWidth])for(const y of [0,12]) {
    const p=[x,y-3,z],depth=d-dot(p,n);
    assert(Math.abs(dot(p,right))<depth*tan*aspect,'Full court fits width');
    assert(Math.abs(dot(p,up))<depth*tan,'Full court fits height');
  }
}
assert(courtFitDistance({aspect:.5})>courtFitDistance({aspect:2}));
// Equivalent constant-speed movement at common cadences remains visually equivalent.
function simulate(hz) {
  const camera=new CameraRig();camera.update(0,{mode:'ball',match:{ball:{x:0,z:0}}});
  let output;
  for(let frame=1;frame<=hz*3;frame++) output=camera.update(1/hz,{mode:'ball',match:{ball:{x:frame/hz*8,z:0}}});
  return output;
}
const slow=simulate(30),fast=simulate(120);
assert(distance(slow.target,fast.target)<.2,'Target cadence difference stays below .2 feet');
assert(distance(slow.position,fast.position)<.35,'Camera cadence difference stays below .35 feet');
assert.equal(new CameraRig().update(.1,{mode:'hoop'}).target[0],COURT.rimX);
const detached=new CameraRig(),first=detached.update(.1,{});first.position[0]=Infinity;finite(detached.update(.1,{}));
console.log('camera: bounce, steals, passes, pause, finite inputs, fit, zoom, modes and cadence passed');
