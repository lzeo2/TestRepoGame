import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';
import {BRIDGE_CLEARANCE_SITES} from '../Games/Capital Drive/terrain.js';
import {loadCapitalMap} from './capital-map-fixture.mjs';

const map=await loadCapitalMap();
const digest=()=>createHash('sha256').update(JSON.stringify(map)).digest('hex'),before=digest();
const selected=new Set(BRIDGE_CLEARANCE_SITES.flatMap(site=>site.over));
// A source-admission control uses the identical contour/geometry model, with
// only these confirmed source identities hidden from the new clearance layer.
const control=createTerrainSampler({...map,roads:map.roads.map(r=>selected.has(r.sourceId)?{...r,sourceId:`control/${r.sourceId}`}:r)});
const terrain=createTerrainSampler(map),stats=terrain.stats.clearance;
assert.equal(control.stats.clearance.raisedRoads,0);
assert(stats.crossings.length>=36&&stats.crossings.length<=48);
assert(stats.raisedRoads>=24&&stats.raisedRoads<=38);
assert(stats.rampRoads>0&&stats.rampRoads<150,'only finite named source approaches are retained');
const bySource=new Map();for(const road of map.roads){if(!bySource.has(road.sourceId))bySource.set(road.sourceId,[]);bySource.get(road.sourceId).push(road);}
let minimum=Infinity,maximumLegacy=0,seams=0;
for(const crossing of stats.crossings){
 const {x,z}=crossing,over=bySource.get(crossing.over)[0];
 const distanceToRoad=road=>Math.min(...road.points.slice(1).map((b,i)=>{
  const a=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
 }));
 const under=bySource.get(crossing.under).reduce((a,b)=>distanceToRoad(a)<distanceToRoad(b)?a:b);
 assert.equal(over.sourceTags.bridge,'yes');assert(Number(over.sourceTags.layer)>Number(under.sourceTags.layer||0));
 const upper=terrain.roadHeightAt(over,x,z),lower=terrain.roadHeightAt(under,x,z),legacy=control.roadHeightAt(over,x,z)-control.roadHeightAt(under,x,z);
 minimum=Math.min(minimum,upper-lower);maximumLegacy=Math.max(maximumLegacy,legacy);
 assert(legacy<4.25,'selected source overpasses reproduce insufficient legacy clearance');
 assert(upper-lower>=4.99,`${over.name} over ${under.name} has authored playable clearance`);
 if(crossing.under==='way/294434708') assert(lower>control.roadHeightAt(under,x,z)+3,'Glenloch slips clear the already raised lower approach');
 else assert.equal(lower,control.roadHeightAt(under,x,z),'underpass source ground owner is unchanged');
 assert.equal(terrain.groundHeightAt(x,z),control.groundHeightAt(x,z));
 const a=over.points[0],b=over.points.at(-1),yaw=Math.atan2(a[0]-b[0],a[1]-b[1]);
 assert.equal(terrain.vehicleHeightAt({x,z,yaw},over),upper);assert.equal(terrain.vehicleHeightAt({x,z,yaw},under),lower);
 const upperProbe={x,z,yaw},lowerA=under.points[0],lowerB=under.points.at(-1),lowerYaw=Math.atan2(lowerA[0]-lowerB[0],lowerA[1]-lowerB[1]);
 for(const heading of [yaw,yaw+Math.PI])assert(Math.abs(terrain.vehicleHeightAt({...upperProbe,yaw:heading})-upper)<.1,'unbound upper vehicle selects its directional source owner');
 for(const heading of [lowerYaw,lowerYaw+Math.PI])assert(Math.abs(terrain.vehicleHeightAt({x,z,yaw:heading})-lower)<.1,'unbound lower vehicle stays underneath');
 for(const p of [over.points[0],over.points.at(-1)])for(const approach of map.roads.filter(r=>!r.sourceTags?.bridge&&r.name===over.name&&[r.points[0],r.points.at(-1)].some(q=>q[0]===p[0]&&q[1]===p[1]))){
  assert(Math.abs(terrain.roadHeightAt(over,...p)-terrain.roadHeightAt(approach,...p))<.02,`${over.name} source abutment joins without a step`);seams++;
  const q=p===over.points[0]?over.points[1]:over.points.at(-2),span=Math.hypot(q[0]-p[0],q[1]-p[1]);
  for(const offset of [-3,3]){
   const x=p[0]-(q[1]-p[1])/span*offset,z=p[1]+(q[0]-p[0])/span*offset;
   assert(Math.abs(terrain.roadHeightAt(over,x,z)-terrain.roadHeightAt(approach,x,z))<.04,`${over.name} lane edges join their deck plane`);
  }
 }
}
assert(seams>20);
// Outside the five confirmed corridors and their exact source-node joining
// links all deck/ground samples stay identical, including the lake bridges.
let retained=0;
const corridorNames=new Set(BRIDGE_CLEARANCE_SITES.map(site=>site.name));
const joins=new Set(map.roads.filter(r=>selected.has(r.sourceId)).flatMap(r=>[r.points[0],r.points.at(-1)].map(p=>p.join(','))));
for(const road of map.roads.filter(r=>!corridorNames.has(r.name)&&!r.points.some(p=>joins.has(p.join(',')))))for(const p of [road.points[0],road.points.at(-1)]){
 assert.equal(terrain.roadHeightAt(road,...p),control.roadHeightAt(road,...p),`${road.id} ${road.name} at ${p}`);retained++;
}
assert(retained>20_000);
// Bullets and flying bodies consume the same raised source deck slab.
const shots=createShotObstacles(map,{heightAt:terrain.heightAt,groundHeightAt:terrain.groundHeightAt,bridgeSegments:terrain.bridgeSegments});
const crossing=stats.crossings.find(c=>c.over==='way/667672050'),over=bySource.get(crossing.over)[0],under=bySource.get(crossing.under)[0];
const low=terrain.roadHeightAt(under,crossing.x,crossing.z),high=terrain.roadHeightAt(over,crossing.x,crossing.z);
const ray={x:crossing.x,y:low+1.5,z:crossing.z,dx:0,dy:1,dz:0,range:10};
const hit=shots.trace(ray);assert(hit>2&&hit<high-low,'actual Kent Street deck provides overhead cover above the lower road');
assert(shots.canOccupyBody({x:crossing.x,z:crossing.z,y:low+.05}));
assert(!shots.canOccupyBody({x:crossing.x,z:crossing.z,y:high-.2}));
assert.equal(digest(),before,'source geometry/tags and all contour grids remain unchanged');
// An isolated source-shaped fixture checks the finite road-graph taper beyond
// one source segment, complete omission guards, and explicit profile priority.
const fixtureOver={id:'fixture-over',sourceId:'way/5046256',name:'Gungahlin Drive',type:'primary',width:8,sourceTags:{bridge:'yes',layer:'1'},points:[[0,0],[100,0]]};
const fixtureUnder={id:'fixture-under',sourceId:'way/782482615',name:'Barton Highway',type:'primary',width:8,points:[[50,-30],[50,30]]};
const fixtureApproach={id:'fixture-approach',name:'Gungahlin Drive',type:'primary',width:8,points:[[-200,0],[-80,0],[0,0]]};
const fixture={roads:[fixtureOver,fixtureUnder,fixtureApproach]},flat=createTerrainSampler(fixture);
assert.equal(flat.roadHeightAt(fixtureOver,50,0),5);
assert.equal(flat.roadHeightAt(fixtureApproach,-160,0),0,'authored ramp returns to unchanged ground at its bounded limit');
assert.equal(flat.roadHeightAt(fixtureApproach,-80,0),2.5,'ramp continues across an actual source vertex');
assert(flat.roadHeightAt(fixtureApproach,-.01,0)>4.999,'bridge and approach meet continuously');
assert.equal(flat.heightAt(-80,0),2.5);assert.equal(flat.vehicleHeightAt({x:-80,z:0,yaw:Math.PI/2}),2.5);
assert.equal(flat.roadHeightAt(fixtureApproach,-80,8),0,'distant verge is unchanged ground');
assert.equal(createTerrainSampler({roads:[fixtureOver,fixtureApproach]}).stats.clearance.raisedRoads,0,'no authored lift without the matching source crossing');
const explicit=createTerrainSampler({...fixture,bridgeDecks:[{roadId:fixtureOver.id,heights:[9,9]}]});
assert.equal(explicit.roadHeightAt(fixtureOver,50,0),9,'explicit authored profile remains authoritative');
console.log(JSON.stringify({pass:true,sourceSites:BRIDGE_CLEARANCE_SITES.length,sourceCrossings:stats.crossings.length,raisedRoads:stats.raisedRoads,rampRoads:stats.rampRoads,minimumClearance:minimum,maximumLegacyClearance:maximumLegacy,seams,retainedSamples:retained,source:'retained OSM road pairs and ACT contour grids; vertical clearance is an authored estimate'}));
