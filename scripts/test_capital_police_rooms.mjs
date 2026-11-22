import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPoliceRooms} from '../Games/Capital Drive/police-rooms.js';
import {createInteriors} from '../Games/Capital Drive/interiors.js';
import {createPolice} from '../Games/Capital Drive/police.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createInteriorCollider} from '../Games/Capital Drive/interior-navigation.js';
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
let hostageRoomId=plan.id;
const controller=createPolice(simulation,{getInterior:()=>registry.current,resolveInterior:id=>registry.resolve(id),getHostageRoomId:()=>hostageRoomId});
const officer=()=>({id:'police:test',x:0,z:-2.4,yaw:0,speed:0,health:100,mode:'foot',interiorId:null,
 car:{id:'police:test',x:5,z:-8,yaw:0,speed:0,active:true,length:4.8,width:1.9}});
const state={mode:'foot',sandbox:false,wanted:1,heat:50,health:100,weapon:'unarmed',police:[officer()]};
for(let i=0;i<90;i++)controller.step(1/60,state,target);
assert.equal(state.police[0].interiorId,null,'the matching standoff holds an officer at the outside approach');
assert(state.wanted>0,'the standoff leaves wanted state active');
hostageRoomId=null;
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
// Source footprint domains can extend behind the door and contain concave
// cutouts. Domain classification must not instantiate navigation or use a
// legacy rectangle which marks valid negative-local-Z rooms as outdoors.
for(const yaw of [0,.73,Math.PI,-1.2]){
 const shape={id:'source-footprint',origin:{x:80,z:-30,yaw},floorY:4,width:12,depth:12,
  footprint:[[-6,-4],[6,-4],[6,0],[0,0],[0,8],[-6,8]].map(([x,z])=>({x,z})),
  walls:[],furniture:[],spawn:{x:80,z:-30},exit:{x:80,z:-30}};
 const at=(x,z)=>({x:shape.origin.x+Math.cos(yaw)*x+Math.sin(yaw)*z,z:shape.origin.z-Math.sin(yaw)*x+Math.cos(yaw)*z});
 const rooms=createPoliceRooms(),domain=rooms.enter(shape,{id:shape.id},{outside:at(0,-5)}),collider=createInteriorCollider(shape);
 const before=JSON.stringify(shape);
 for(const [x,z,expected]of [[4,-2,true],[-4,6,true],[4,4,false],[7,-2,false],[-6,2,false],[0,4,false]]){
  const p=at(x,z);
  assert.equal(domain.contains(p),expected,`source domain at ${x},${z}, yaw${yaw}`);
  assert.equal(collider.hasLineOfSight(p,p),expected,'domain matches actual collider footprint and boundary');
 }
 assert.equal(domain.stats.gridBuilds,0,'contains retains lazy navigation');
 const sourceVisible=Function('policeRooms','simulation','ordnance',body+';return visible;')(rooms,simulation,undefined);
 assert(sourceVisible(at(3,-2),at(4,-2)),'valid negative-Z room visibility uses indoor collider');
 assert.equal(sourceVisible({...at(4,4),interiorId:null},at(-4,4)),false,'concave exterior notch cannot share the indoor domain');
 assert.equal(JSON.stringify(shape),before,'source footprint remains unchanged');
 const holes={...shape,id:'courtyard',footprint:[[-6,-4],[6,-4],[6,8],[-6,8]].map(([x,z])=>({x,z})),
  footprintHoles:[{points:[[-1,2],[1,2],[1,4],[-1,4]].map(([x,z])=>({x,z}))}]};
 const courtyard=rooms.enter(holes,{id:holes.id},{outside:at(0,-5)}),holeCollider=createInteriorCollider(holes);
 for(const [x,z,expected]of [[0,3,false],[1,3,false],[2,3,true],[-4,-2,true]]){
  assert.equal(courtyard.contains(at(x,z)),expected);assert.equal(holeCollider.hasLineOfSight(at(x,z),at(x,z)),expected);
 }
 assert.equal(courtyard.stats.gridBuilds,0);
 const legacy=rooms.enter({...shape,id:'legacy',footprint:undefined},{id:'legacy'},{outside:at(0,-5)});
 assert(!legacy.contains(at(4,-2))&&legacy.contains(at(4,4))&&!legacy.contains(at(0,0)),'legacy rectangle keeps strict front boundary');
}
console.log('PASS real room pursuit registry: door entry, retained navigation, safehouse, five-room cap, actual controller LOS domains, four rotated source footprints/concavity/negativeZ/courtyard boundaries and lazy rectangle fallback');
