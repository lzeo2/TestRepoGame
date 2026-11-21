import assert from 'node:assert/strict';
import {createCarRental} from '../Games/Capital Drive/car-rental.js';
import {createProgression} from '../Games/Capital Drive/progression.js';

const map={spawn:{x:0,z:0}};
const career=createProgression(map);
const pickup={x:49,z:39,yaw:.6};
const sites=[
  {id:'kingston',name:'Kingston Car Rental',x:55,z:39,yaw:.8,radius:3,pickup,returnBay:pickup},
  {id:'airport',name:'Airport Car Rental',x:101,z:-30,yaw:.9,radius:3,pickup:{x:96,z:-29,yaw:.9},returnBay:{x:96,z:-29,yaw:.9}},
];
const car={x:12,z:31,yaw:2,speed:0,vx:0,vz:0};
let blocked=false,sight=true,approachBlocked=false,installations=0;
const simulation={
  player:car,
  previewTeleport:pose=>({...pose,distance:0,ok:true,adjusted:blocked}),
  canOccupy:()=>!blocked,
  teleport:pose=>{Object.assign(car,pose);return {ok:true};},
  moveActor:()=>({blocked:approachBlocked}),
};
const context={pose:sites[0],onFoot:true,sandbox:false,vehicle:{modelId:'lantern',color:'#abcdef',stolen:false},
  vehicleHealth:72,health:100,wanted:0,respawnSerial:0};
const rental=createCarRental(sites,simulation,{pay:career.payCarRental,visible:()=>sight,
  install(vehicle,mode,exit){installations++;context.vehicle={...vehicle,rented:rental.active};
    context.vehicleHealth=vehicle.health;context.onFoot=mode==='foot';
    if(exit)context.pose=exit;
  },
});

assert.equal(rental.desk({...context,pose:{x:0,z:0}}),null);
assert.equal(rental.desk({...context,interior:true}),null);
sight=false;
assert.equal(rental.rent('kingston','finch',context).ok,false);
sight=true;
assert.equal(rental.rent('airport','finch',context).ok,false);
assert.equal(rental.rent('kingston','finch',{...context,busy:true}).ok,false);
blocked=true;
assert.equal(rental.rent('kingston','finch',context).ok,false);
assert.equal(career.state.cash,1000);
assert.equal(installations,0);
blocked=false;
assert.equal(career.payCarRental('finch',context,()=>false).ok,false);
assert.equal(career.state.cash,1000);

assert.equal(rental.rent('kingston','finch',context).ok,true);
assert.equal(career.state.cash,935);
assert.equal(context.vehicle.modelId,'finch');
assert.equal(context.onFoot,false);
assert.equal(context.vehicle.rented,true);
assert.equal(car.x,pickup.x);
assert.equal(rental.rent('kingston','orchard',context).ok,false);
assert.equal(career.state.cash,935);
assert.equal(context.vehicleHealth,100);
assert.equal(career.rideEligibility({...context,vehicle:{modelId:'lantern',stolen:false,rented:true}}),'Use an owned, legal four-door car.');

car.speed=8;
assert.equal(rental.returnCar(context).ok,false);
assert.equal(rental.active,true);
Object.assign(car,sites[1].returnBay,{speed:0});
assert.equal(rental.rentalBay(context).id,'airport');
approachBlocked=true;
assert.equal(rental.returnCar(context).ok,false);
assert.equal(rental.active,true);
approachBlocked=false;
assert.equal(rental.returnCar(context).ok,true);
assert.equal(rental.active,false);
assert.equal(context.vehicleHealth,72);
assert.equal(context.vehicle.modelId,'lantern');
assert.equal(context.vehicle.color,'#abcdef');
assert.equal(context.onFoot,true);
assert.equal(car.x,12);
assert.equal(context.pose.x,sites[1].x);
assert.equal(career.state.cash,935);

context.pose=sites[0];context.sandbox=true;
assert.equal(rental.rent('kingston','gravel',context).cost,0);
assert.equal(career.state.cash,935);
assert.equal(rental.recover(),true);
assert.equal(context.vehicle.modelId,'lantern');
assert.equal(rental.active,false);
assert.equal(rental.recover(),false);
console.log('PASS physical car rental: desk and line of sight, bay clearance before payment, one lease, alternate drop-off, car restoration, free roam and recovery');
