import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPoliceRooms} from '../Games/Capital Drive/police-rooms.js';
import {createInteriors} from '../Games/Capital Drive/interiors.js';
import {createPolice} from '../Games/Capital Drive/police.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
const map={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},roads:[],spawn:{x:0,z:-10,yaw:0},landmarks:[],
 buildings:[{id:'home',type:'house',height:4,points:[[-7,0],[7,0],[7,15],[-7,15]]}],
 interiorEntries:[{buildingId:'home',x:0,z:0,nx:0,nz:1}]};
const interiors=createInteriors(map),entry=interiors.entries[0],actor={x:0,z:-1.3,yaw:0};
const plan=interiors.enter(entry,actor);assert(plan);
const registry=createPoliceRooms();
const room=registry.enter(plan,entry,{outside:interiors.exteriorPose,known:true});
assert.equal(room.stats.gridBuilds,0,'no path grid for an unpursued room');
const target={...plan.spawn,z:plan.spawn.z+2,speed:3};
assert(!room.moveActor({...target},0,0,.45).blocked);
const simulation=createSimulation(map,{trafficCount:0});
const controller=createPolice(simulation,{getInterior:()=>registry.current,resolveInterior:id=>registry.resolve(id)});
const officer=()=>({id:'police:test',x:0,z:-2.4,yaw:0,speed:0,health:100,mode:'foot',interiorId:null,
 car:{id:'police:test',x:5,z:-8,yaw:0,speed:0,active:true,length:4.8,width:1.9}});
const state={mode:'foot',sandbox:false,wanted:1,heat:50,health:100,weapon:'unarmed',police:[officer()]};
for(let i=0;i<180;i++)controller.step(1/60,state,target);
assert.equal(state.police[0].interiorId,plan.id,'real room registry/navigation admits doorway pursuer');
assert(room.contains(state.police[0]));assert(room.hasLineOfSight(state.police[0],target));
registry.leave();interiors.leave(actor);
assert(registry.resolve(plan.id),'occupied room collision survives rendered-room exit');
for(let i=0;i<240;i++)controller.step(1/60,state,{x:0,z:-4,speed:3});
assert.equal(state.police[0].interiorId,null,'officer walks to the retained exit and returns through door');
registry.prune(state.police);assert.equal(registry.snapshot().length,0);
const safe=registry.enter(plan,entry,{outside:{x:0,z:-1.3},known:true,safehouse:true});
state.police=[officer()];state.heat=50;state.wanted=1;
for(let i=0;i<180;i++)controller.step(1/60,state,target);
assert.equal(state.police[0].interiorId,null);assert.equal(state.police[0].seesPlayer,false);assert(state.wanted>0);
assert.equal(registry.current.safehouse,true);registry.clear();assert.equal(registry.snapshot().length,0);
// Four occupied rooms plus the active room are the entire retained world.
let units=[];
for(let i=0;i<12;i++){
 const id='room'+i,p={...plan,id};registry.enter(p,{...entry,id},{outside:{x:0,z:-2},units});
 units=[...units.slice(-3),{interiorId:id,health:100}];registry.leave();registry.prune(units);
 assert(registry.snapshot().length<=4);
}
registry.enter({...plan,id:'active'},{...entry,id:'active'},{outside:{x:0,z:-2},units});
assert.equal(registry.snapshot().length,5);assert(Object.isFrozen(registry.snapshot()));
// Execute actual controller visibility logic to guard room/outdoor shot boundaries.
const source=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('function visible('),source.indexOf('function clearInterior(){'));
const visible=Function('policeRooms','simulation','ordnance',body+';return visible;')(registry,simulation,undefined);
assert.equal(visible({...target,interiorId:'elsewhere'},target),false);
assert.equal(visible({...target,interiorId:null},target),false);
assert.equal(visible({x:-20,z:-20,interiorId:null},{x:-21,z:-20,interiorId:null}),true,'outdoor allies retain outdoor cover while player is indoors');
const smoky=Function('policeRooms','simulation','ordnance',body+';return visible;')(registry,simulation,{blocksSight:()=>true});
const outside=[{x:-20,z:-20,interiorId:null},{x:-21,z:-20,interiorId:null}];
assert.equal(smoky(...outside),false,'smoke blocks ordinary outdoor sight');
assert.equal(smoky(...outside,true),true,'blast obstruction uses physical geometry without smoke immunity');
assert.equal(smoky({...target,interiorId:'elsewhere'},target,true),false,'ignoring smoke never crosses room domains');
console.log('PASS real room pursuit registry: door entry, bounded retained exit/navigation, safehouse, five-room cap and actual controller LOS domains');
