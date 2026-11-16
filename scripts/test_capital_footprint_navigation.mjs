import assert from 'node:assert/strict';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';
import {createInteriorCollider,createInteriorNavigation} from '../Games/Capital Drive/interior-navigation.js';
const ring=[[-6,-4],[6,-4],[6,0],[0,0],[0,8],[-6,8]].map(([x,z])=>({x,z}));
function world(plan,x,z){const c=Math.cos(plan.origin.yaw),s=Math.sin(plan.origin.yaw);return{x:plan.origin.x+c*x+s*z,z:plan.origin.z-s*x+c*z};}
function walk(nav,from,to,owner='officer') {
 const actor={...from};let steps=0;
 for(;steps<600&&Math.hypot(actor.x-to.x,actor.z-to.z)>.025;steps++) {
  const waypoint=nav.nextWaypoint(actor,to,owner);assert(waypoint,'bounded physical route exists');
  const dx=waypoint.x-actor.x,dz=waypoint.z-actor.z,length=Math.hypot(dx,dz);assert(length>.00001,'route advances');
  const fraction=Math.min(1,.18/length),next={x:actor.x+dx*fraction,z:actor.z+dz*fraction};
  assert(nav.canTraverse(actor,next),'each real movement has whole-circle segment clearance');
  assert(!nav.moveActor(actor,dx*fraction,dz*fraction).blocked,'actor follows route without wall sliding');
 }
 assert(Math.hypot(actor.x-to.x,actor.z-to.z)<=.025,'route reaches target');return steps;
}
for(const yaw of [0,.73,Math.PI,-1.2]) {
 const plan={origin:{x:80,z:-30,yaw},floorY:4,width:12,depth:12,bounds:{minX:-6,maxX:6,minZ:-4,maxZ:8},footprint:ring,walls:[],furniture:[],doors:[]};
 const before=JSON.stringify(plan),nav=createInteriorNavigation(plan),at=(x,z)=>world(plan,x,z);
 assert(nav.canOccupy(at(4,-2)),'negative local Z is inside source footprint');
 assert(!nav.canOccupy(at(4,4)),'bounding-box courtyard is outside actual L-shaped house');
 assert(!nav.canOccupy(at(-.2,2)),'whole circle cannot clip concave wall');
 assert(!nav.canTraverse(at(-4,6),at(4,-2)),'inside endpoints do not permit outside diagonal');
 assert(!nav.hasLineOfSight(at(-4,6),at(4,-2)),'concave footprint blocks outside sight shortcut');
 assert(nav.hasLineOfSight(at(-4,-2),at(4,-2)),'clear inside room retains sight');
 walk(nav,at(-4,6),at(4,-2));walk(nav,at(4,-2),at(-4,6));
 const actor={...at(-2,5)},outside=at(3,5);assert(nav.moveActor(actor,outside.x-actor.x,outside.z-actor.z).blocked,'swept actor cannot leave footprint through missing room geometry');
 for(let i=0;i<12;i++)nav.nextWaypoint(at(-4,6),at(4,-2),`officer-${i}`);
 assert(nav.stats.nodes<=2000&&!nav.stats.truncated);assert(nav.stats.cachedPaths<=6);assert.equal(nav.stats.gridBuilds,1);
 const room={...plan,id:'source-house'},shots=createShotObstacles({});
 const from=at(-4,2),target=at(-4,-2),ray={...from,y:5.4,dx:(target.x-from.x)/4,dy:0,dz:(target.z-from.z)/4,range:4,interiorId:room.id};
 assert.equal(shots.trace(ray,room),4,'legitimate negative-local-Z room is not clipped at legacy front edge');
 const west=at(-4,4),east=at(4,4);
 const cut=shots.trace({...ray,...west,dx:(east.x-west.x)/8,dz:(east.z-west.z)/8,range:8},room);
 assert(cut>3.98&&cut<4.01,'shot stops at exact concave source facade, including open door logical boundary');
 assert.equal(JSON.stringify(plan),before,'navigation never rescales or mutates source footprint');
}
const plan={origin:{x:0,z:0,yaw:0},floorY:0,width:12,depth:12,bounds:{minX:-6,maxX:6,minZ:-4,maxZ:8},
 footprint:[[-6,-4],[6,-4],[6,8],[-6,8]].map(([x,z])=>({x,z})),footprintHoles:[{points:[[-1,2],[1,2],[1,4],[-1,4]].map(([x,z])=>({x,z}))}],walls:[],furniture:[]};
const nav=createInteriorNavigation(plan);
assert(!nav.canOccupy({x:0,z:3}),'optional source courtyard hole is not floor');
assert(!nav.canOccupy({x:1.2,z:3}),'circle retains clearance from hole wall');
assert(!nav.canTraverse({x:-4,z:3},{x:4,z:3}));assert(!nav.hasLineOfSight({x:-4,z:3},{x:4,z:3}));
walk(nav,{x:-4,z:3},{x:4,z:3});
const legacy=createInteriorCollider({origin:{x:0,z:0,yaw:0},floorY:0,width:12,depth:12,walls:[],furniture:[]});
assert(!legacy.canOccupy({x:0,z:-2}),'non-footprint room retains exact legacy front boundary');
assert(legacy.canOccupy({x:4,z:4}));
console.log('Capital footprint navigation: PASS (unscaled L-shaped rooms at four rotations; negative bounds, whole-circle concave walls, swept routes, LOS, optional holes, 2000-node/six-field bounds and legacy rectangle controls)');
