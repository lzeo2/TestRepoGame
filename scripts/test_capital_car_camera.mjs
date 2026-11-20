import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {carCockpitFrame} from '../Games/Capital Drive/car-camera.js';
import {createCar,disposeCars} from '../assets/car-arcade/models.js';
import {CARS} from '../assets/car-arcade/fleet.js';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';

const close = (actual, expected) => assert(Math.abs(actual-expected)<1e-10, `${actual} != ${expected}`);
const pose={x:8,z:-3,yaw:0}, eye=[-.4,1.1,.15];
const frame=carCockpitFrame(pose,{eye,ground:17});
assert.deepEqual(frame.camera,{x:7.6,y:18.28,z:-2.85});
close(frame.target.x,frame.camera.x);close(frame.target.y,frame.camera.y);close(frame.target.z,frame.camera.z-20);
const passenger=carCockpitFrame(pose,{eye,ground:17,passenger:true});
close(passenger.camera.x,8.4);
const uphill=carCockpitFrame(pose,{eye,ground:17,pitch:.3});
assert(uphill.target.y>uphill.camera.y,'slope looks up with the pitched car');
close(uphill.camera.y,17.18+eye[1]*Math.cos(.3)-eye[2]*Math.sin(.3));
const turn=carCockpitFrame({...pose,yaw:Math.PI/2},{eye});
close(turn.camera.x,pose.x+eye[2]);close(turn.camera.z,pose.z-eye[0]);
assert(turn.target.x<turn.camera.x,'fleet forward is local negative Z');
assert(carCockpitFrame(pose,{eye,lookPitch:.4}).target.y>frame.camera.y-17);
for (const car of CARS) {
  const mesh=createCar(car.id), seat=mesh.userData.cockpit.eye;
  assert(seat[1]<car.height,'authored eye is below the roof');
  mesh.updateMatrixWorld(true);
  const hits=new THREE.Raycaster(new THREE.Vector3(...seat),new THREE.Vector3(0,0,-1),.035,car.length).intersectObject(mesh,true);
  assert.equal(hits[0]?.object.name,'glazing',`${car.id}: forward view reaches the windshield before opaque body`);
  assert(hits[0].object.material.transparent&&hits[0].object.material.opacity<.5,'windshield transmits the road view');
  for(const yaw of [0,.8,-2.4])for(const pitch of [-.6,0,.6]) {
    const view=carCockpitFrame({...pose,yaw},{eye:seat,ground:24,pitch,lookYaw:1,lookPitch:.3});
    assert(Object.values(view.camera).every(Number.isFinite));
    assert(Object.values(view.target).every(Number.isFinite));
    close(Math.hypot(view.target.x-view.camera.x,view.target.y-view.camera.y,view.target.z-view.camera.z),20);
    assert(view.near<.05,'near plane preserves nearby dash');
  }
}
const invalid=carCockpitFrame({x:NaN,z:Infinity,yaw:NaN},{eye:[NaN,Infinity,NaN],ground:NaN,pitch:Infinity,lookYaw:NaN,lookPitch:Infinity});
assert(Object.values(invalid.camera).every(Number.isFinite));assert(Object.values(invalid.target).every(Number.isFinite));
assert.deepEqual(pose,{x:8,z:-3,yaw:0});assert.deepEqual(eye,[-.4,1.1,.15]);
disposeCars();

const source=readFileSync(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const start=source.indexOf("window.addEventListener('keydown', event => {");
const end=source.indexOf("window.addEventListener('keyup'",start);
assert(start>=0&&end>start);
let keydown,paused=false,prevented=0;
const actions=[],jetpack={active:false};
runInNewContext(source.slice(start,end),{
  window:{addEventListener:(name,handler)=>{assert.equal(name,'keydown');keydown=handler;}},
  started:true,paused:()=>paused,cutscenes:{snapshot:()=>({active:false})},jetpack,keys:new Set(),
  toggleCockpit:()=>actions.push('cockpit'),throwEquipment:kind=>actions.push(kind),
});
function press(code,repeat=false){
  keydown({code,repeat,target:{tagName:'CANVAS'},preventDefault:()=>{prevented++;}});
}
press('KeyC');press('KeyV');press('F2');press('F2',true);
assert.deepEqual(actions,['smoke','grenade','cockpit']);
assert.equal(prevented,2,'F2 prevents the default action without repeat toggles');
paused=true;press('F2');press('KeyC');
paused=false;jetpack.active=true;press('KeyC');
assert.deepEqual(actions,['smoke','grenade','cockpit'],'paused keys and smoke while flying remain guarded');
console.log('PASS car cockpit camera: authored fleet seats, road/stunt pitch, bridge elevation, passenger seat, bounded look, finite frames and near clipping');
