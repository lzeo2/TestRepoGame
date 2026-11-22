import assert from 'node:assert/strict';
import {createDrivingCameraShake} from '../Games/Capital Drive/car-camera.js';
const car={speed:30,crashes:0,lastImpactSpeed:18,offroad:false};
const before=JSON.stringify(car);
function sample({rough=false,cockpit=false,hz=60}={}) {
  const shake=createDrivingCameraShake(),vehicle={...car,offroad:rough};let peak=0;
  for(let i=0;i<hz*3;i++) {
    const value=shake.advance(1/hz,vehicle,{cockpit});
    assert(Object.values(value).every(Number.isFinite));
    peak=Math.max(peak,Math.hypot(value.x,value.y));
  }
  return peak;
}
const road=sample(),rough=sample({rough:true}),cockpit=sample({cockpit:true});
assert(road>.003&&road<.012,'paved speed feedback stays below 1.2 cm');
assert(rough>road*2&&rough<.03,'rough surfaces add bounded texture');
assert(cockpit<road*.34,'cockpit micro-jitter is gentler');
assert(Math.abs(sample({hz:30})-road)<.001,'30/60 Hz amplitudes agree');
const shake=createDrivingCameraShake();
shake.advance(.016,car);
assert.equal(shake.advance(.016,car,{suppressed:true}),null,'pause, reduced motion and excluded modes reset immediately');
assert.equal(shake.advance(.016,{...car,speed:0}),null,'stopped vehicles remain still');
assert.equal(shake.advance(NaN,car),null,'invalid delta is quiet');
assert.equal(shake.advance(.016,{speed:NaN}),null,'invalid speed is quiet');
const hit=createDrivingCameraShake(),control=createDrivingCameraShake();
hit.advance(.016,car);control.advance(.016,car);
const hitCar={...car,crashes:1};let difference=0;
for(let i=0;i<60;i++) {
  const a=hit.advance(.016,hitCar),b=control.advance(.016,car);
  difference=Math.max(difference,Math.abs(a.y-b.y));
  assert(Math.hypot(a.x,a.y)<.06,'impacts stay below six centimetres');
  if(i===59)assert(Math.abs(a.y-b.y)<.00001,'one collision produces one decaying bump');
}
assert(difference>.001,'new collision provides mild bump feedback');
assert.equal(JSON.stringify(car),before,'camera never mutates vehicle state');
console.log('PASS driving camera shake: speed/roughness, gentler cockpit, bounded collision decay, 30/60Hz, stopped/suppressed/invalid input and immutable vehicle state');
