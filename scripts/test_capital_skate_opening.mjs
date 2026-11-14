import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {createSimulation,projectSegment} from '../Games/Capital Drive/simulation.js';
import {POOL_BARRIERS} from '../Games/Capital Drive/landmarks.js';
import {CAMPUS_BARRIERS} from '../Games/Capital Drive/campus.js';
import {SKATE_BUILDING_OPENING,SKATEPARK,RAMP_SURFACES,BARRIERS as SKATE_BARRIERS,
  skateLocalPoint,skateHeightOffset,pointInSkateOpening,carveSkatePolygon,splitSkateSegment} from '../Games/Capital Drive/civic-extras.js';

const game=new URL('../Games/Capital Drive/',import.meta.url);
const read=path=>readFile(new URL(path,game),'utf8');
const moduleURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const [base,north,boot]=await Promise.all([read('data/canberra.json').then(JSON.parse),read('data/canberra-north.json').then(JSON.parse),read('script.js')]);
const before=JSON.stringify([base,north]),expanded=applyMapExpansion(base,north);
const building=expanded.buildings.find(b=>b.id===SKATE_BUILDING_OPENING.buildingId);
assert.equal(building.id,'osm-584970594');
assert.equal(building.sourceId,'way/584970594');
assert.deepEqual(SKATE_BUILDING_OPENING.polygon,SKATEPARK.polygon);

// Execute the production boot's actual barrier/opening assignments, so removing
// its wiring cannot leave a green physics test that only checks a copied fixture.
const assignments=boot.match(/^  map\.barriers=.*\n  map\.buildings=.*$/m)?.[0];
assert(assignments,'root boot must initialize barriers and the building opening');
const {initialize}=await import(moduleURL(`export function initialize(map,{POOL_BARRIERS,CAMPUS_BARRIERS,SKATE_BARRIERS,SKATE_BUILDING_OPENING}) {${assignments}\nreturn map;}`));
const runtime=initialize({...expanded},{POOL_BARRIERS,CAMPUS_BARRIERS,SKATE_BARRIERS,SKATE_BUILDING_OPENING});
const physicalBuilding=runtime.buildings.find(b=>b.id===building.id);
assert.deepEqual(physicalBuilding.innerRings,[{points:SKATE_BUILDING_OPENING.polygon}]);
assert(!runtime.collisionReplacedBuildingIds.includes(building.id),'the rest of the source body remains physical');
assert.notEqual(physicalBuilding,building);
assert(!building.innerRings,'source footprint remains untouched');

const THREE=await import(moduleURL(await readFile(new URL('../assets/car-arcade/vendor/three.module.js',import.meta.url),'utf8')));
const roadURL=moduleURL(await read('road-network.js')),extrasURL=moduleURL(await read('civic-extras.js'));
const viewURL=moduleURL((await read('civic-view.js'))
  .replace("'../../assets/car-arcade/vendor/three.module.js'",JSON.stringify(moduleURL(await readFile(new URL('../assets/car-arcade/vendor/three.module.js',import.meta.url),'utf8'))))
  .replace("'./road-network.js'",JSON.stringify(roadURL)).replace("'./civic-extras.js'",JSON.stringify(extrasURL)));
const {createCivicView}=await import(viewURL);
const open=SKATE_BUILDING_OPENING.polygon.slice(0,-1);
const outline=building.points.slice(0,-1);
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const signedArea=p=>p.length<3?0:p.slice(1,-1).reduce((s,q,i)=>s+cross(p[0],q,p[i+2])/2,0);
const area=p=>Math.abs(signedArea(p));
const triangulate=p=>THREE.ShapeUtils.triangulateShape(p.map(q=>new THREE.Vector2(...q)),[]).map(t=>t.map(i=>p[i]));
// Independently intersect convex roof/opening triangles, including the source
// boundary's small concave kink. This does not use the production carve helper.
function intersection(subject,clip) {
  let points=subject,orientation=Math.sign(signedArea(clip));
  for(let i=0;i<clip.length&&points.length;i++) {
    const a=clip[i],b=clip[(i+1)%clip.length],next=[];
    for(let j=0;j<points.length;j++) {
      const p=points[j],q=points[(j+1)%points.length],d=orientation*cross(a,b,p),e=orientation*cross(a,b,q);
      if(d>=0)next.push(p);
      if((d>=0)!==(e>=0)){const t=d/(d-e);next.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}
    }
    points=next;
  }
  return points;
}
const originalTriangles=triangulate(outline),openingTriangles=triangulate(open);
const overlap=originalTriangles.reduce((s,t)=>s+openingTriangles.reduce((n,u)=>n+area(intersection(t,u)),0),0);
assert(overlap>400&&overlap<area(open),'ACT cut overlaps the source body and reaches its outer facade');
const carved=originalTriangles.flatMap(t=>carveSkatePolygon(t));
assert(Math.abs(carved.reduce((s,p)=>s+area(p),0)-(area(outline)-overlap))<1e-6,'exact subtraction retains all other source roof area');
const scene=new THREE.Scene(),view=createCivicView(scene,{...runtime,buildings:[building],roads:[]},()=>0);
const positions=scene.children[0].children.find(m=>m.name==='Civic exact source bodies').geometry.attributes.position;
const roofs=[],walls=[],top=building.height+.12;
for(let i=0;i<positions.count;i+=3) {
  const p=[0,1,2].map(j=>[positions.getX(i+j),positions.getY(i+j),positions.getZ(i+j)]);
  if(p.every(q=>Math.abs(q[1]-top)<1e-5))roofs.push(p.map(q=>[q[0],q[2]]));
  if(Math.abs(p[0][1]+.15)<1e-5&&Math.abs(p[1][1]+.15)<1e-5&&Math.abs(p[2][1]-top)<1e-5)walls.push(p.slice(0,2).map(q=>[q[0],q[2]]));
}
assert(roofs.length>originalTriangles.length,'rendered roof contains actual cut geometry');
assert(Math.abs(roofs.reduce((s,t)=>s+area(t),0)-(area(outline)-overlap))<.08,'rendered Float32 roof agrees with exact physical mask');
for(const t of roofs)assert(openingTriangles.reduce((s,u)=>s+area(intersection(t,u)),0)<.004,'no retained roof triangle covers positive opening interior');
const interiorSamples=openingTriangles.map(t=>t.reduce((p,q)=>[p[0]+q[0]/3,p[1]+q[1]/3],[0,0]))
  .filter(p=>Math.min(...open.map((a,i)=>projectSegment(...p,a,open[(i+1)%open.length]).distance))>.05);
assert(interiorSamples.length>=2,'sample opening interior away from Float32 boundary rounding');
for(const p of interiorSamples)for(const t of roofs)assert(area(intersection(t,[p,[p[0]+.001,p[1]],[p[0],p[1]+.001]]))<1e-8,'no retained triangle contains an opening interior point');
const expectedWalls=outline.flatMap((a,i)=>splitSkateSegment(a,outline[(i+1)%outline.length]));
assert.equal(walls.length,expectedWalls.length,'all retained facade spans are rendered');
for(const [a,b] of walls) {
  assert(expectedWalls.some(([u,v])=>(Math.hypot(a[0]-u[0],a[1]-u[1])<.001&&Math.hypot(b[0]-v[0],b[1]-v[1])<.001)||(Math.hypot(a[0]-v[0],a[1]-v[1])<.001&&Math.hypot(b[0]-u[0],b[1]-u[1])<.001)),'facade and physical mask share exact retained spans');
  assert(!pointInSkateOpening((a[0]+b[0])/2,(a[1]+b[1])/2),'no retained facade crosses opening interior');
}
for(let i=0;i<outline.length;i++)for(let j=0;j<64;j++) {
  const a=outline[i],b=outline[(i+1)%outline.length],t=(j+.5)/64,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  if(Math.min(...open.map((u,k)=>projectSegment(...p,u,open[(k+1)%open.length]).distance))<.003)continue;
  const removed=openingTriangles.some(u=>{const sign=Math.sign(signedArea(u));return u.every((q,k)=>sign*cross(q,u[(k+1)%u.length],p)>=0);});
  assert.equal(walls.some(([u,v])=>projectSegment(...p,u,v).distance<.001),!removed,'independent facade samples retain exactly the outside of the physical opening');
}
view.dispose();view.dispose();assert.equal(scene.children.length,0);

const sim=createSimulation(runtime,{trafficCount:0});
const pose=(u,v)=>{const p=skateLocalPoint(u,v);return {x:p[0],z:p[2]};};
function walk(actor,target,steps=60) {
  let blocked=false;
  for(let i=0;i<steps;i++)blocked=sim.moveActor(actor,(target.x-actor.x)/(steps-i),(target.z-actor.z)/(steps-i),.45).blocked||blocked;
  return blocked;
}
const walker=pose(18,10),inside=pose(3,10);
assert(!sim.moveActor(walker,0,0).blocked,'public east approach is clear');
assert(!walk(walker,inside),'normal swept foot movement crosses the removed outer facade');
assert(Math.hypot(walker.x-inside.x,walker.z-inside.z)<1e-6);
assert(!walk(walker,pose(18,10)),'actor can leave through the same opening');
const retained=pose(6,-2);
assert(sim.moveActor(retained,0,0).blocked,'source building immediately beyond the park still blocks');
const edgeWalker=pose(3,10);
assert(walk(edgeWalker,pose(-3,10)),'retained wall bounds the west edge of the cut');
assert(pointInSkateOpening(edgeWalker.x,edgeWalker.z),'wall contact cannot eject actor into the source body');
const clearance=Math.min(...open.map((a,i)=>projectSegment(edgeWalker.x,edgeWalker.z,a,open[(i+1)%open.length]).distance));
assert(clearance>=.45-1e-6,'hole edge respects actor radius');
assert(!walk(edgeWalker,inside),'actor can retreat from retained opening edge');

for(const rail of SKATE_BARRIERS) {
  const barrier=runtime.barriers.find(b=>b.id===rail.id);
  assert(barrier?.points.length===4,'root turns the rendered rail into physical barrier width');
  const centre={x:(rail.a[0]+rail.b[0])/2,z:(rail.a[1]+rail.b[1])/2};
  assert(sim.moveActor(centre,0,0).blocked,'rail physically blocks its rendered centre');
  const a=pose(5,19),target=pose(8,19);
  assert(walk(a,target),'normal swept movement cannot tunnel through the narrow rail');
  assert(Math.hypot(a.x-target.x,a.z-target.z)>.5);
}
for(const surface of RAMP_SURFACES)for(const t of surface.triangles) {
  const x=t.reduce((s,p)=>s+p[0]/3,0),z=t.reduce((s,p)=>s+p[2]/3,0),y=t.reduce((s,p)=>s+p[1]/3,0);
  assert(Math.abs(skateHeightOffset(x,z)-y)<1e-7,'ramp height uses the rendered triangle surface');
}
assert.match(boot,/world\.heightAt=\(x,z\)=>ground\(x,z\)\+skateHeightOffset\(x,z\)/,'root actor grounding adds shared ramp height');
assert.match(boot,/createCivicExtrasView\(scene,map,ground\)/,'ramp renderer receives the same base ground');

// Preserve ordinary building, island, shoreline and bridge-water behavior while
// expanding physicalContact's hole support beyond its original water use.
const fixture={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},spawn:{x:-80,z:-80,yaw:0},roads:[],barriers:[],
  buildings:[{id:'ordinary',points:[[-40,-10],[-20,-10],[-20,10],[-40,10]]}],
  areas:[{type:'water',points:[[10,-30],[70,-30],[70,30],[10,30]],innerRings:[{points:[[30,-10],[50,-10],[50,10],[30,10]]}]}]};
const old=createSimulation(fixture,{trafficCount:0});
assert(old.moveActor({x:-30,z:0},0,0).blocked,'ordinary solid building still blocks');
const wall={x:-42,z:0};assert(old.moveActor(wall,8,0).blocked);assert(wall.x<-40.4,'ordinary facade remains swept');
assert(old.moveActor({x:20,z:0},0,0).blocked,'lake water still blocks');
assert(!old.moveActor({x:40,z:0},1,0).blocked,'source island hole remains walkable');
assert(old.moveActor({x:30.2,z:0},0,0).blocked,'water island edge retains radius clearance');
assert(!createSimulation(fixture,{trafficCount:0,isOnBridge:()=>true}).moveActor({x:20,z:0},1,0).blocked,'bridge water exemption remains active');
assert.equal(JSON.stringify([base,north]),before,'runtime opening does not rewrite geographic snapshots');
console.log(`PASS skate opening: actual expanded source body, ${overlap.toFixed(3)} m2 roof cut, ${roofs.length} roof triangles / ${walls.length} exact facade spans; normal entry/exit, retained walls, radius, rail, ramps, ordinary buildings and water holes`);
