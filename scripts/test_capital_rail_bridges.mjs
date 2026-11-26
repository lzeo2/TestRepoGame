import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { LIGHT_RAIL_SOURCE } from '../Games/Capital Drive/light-rail-source.js';
import { createLightRail } from '../Games/Capital Drive/light-rail.js';
import { createLightRailView } from '../Games/Capital Drive/light-rail-view.js';
import { prepareRailBridges, RAIL_BRIDGE_SOURCE } from '../Games/Capital Drive/rail-bridges.js';
import { loadCapitalMap } from './capital-map-fixture.mjs';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const map=await loadCapitalMap();
const terrain=createTerrainSampler(map);
const plan=prepareRailBridges(map.bounds,terrain.groundHeightAt,terrain.heightAt);
assert.equal(RAIL_BRIDGE_SOURCE.length,12);
assert.equal(plan.decks.length,10,'four tram ways merge to two real shared decks');
assert.equal(plan.decks.filter(d=>d.kind==='rail').length,1);
assert.equal(plan.decks.filter(d=>d.kind==='disused').length,2);
assert.equal(plan.decks.filter(d=>d.kind==='miniature').length,5);
assert.equal(prepareRailBridges({minX:0,maxX:1,minZ:0,maxZ:1},()=>0).decks.length,0);
for(const w of RAIL_BRIDGE_SOURCE.filter(w=>w.kind==='tram')){
  const matches=LIGHT_RAIL_SOURCE.lines.filter(line=>{
    const i=line.points.findIndex(p=>p[0]===w.points[0][0]&&p[1]===w.points[0][1]);
    const j=line.points.findIndex(p=>p[0]===w.points[1][0]&&p[1]===w.points[1][1]);
    return i>=0&&j>=0&&Math.abs(i-j)===1;
  });
  assert.equal(matches.length,1);
  const mid=w.points[0].map((v,i)=>(v+w.points[1][i])/2);
  const floor=terrain.groundHeightAt(...mid);
  assert(plan.heightAt(...mid)-floor>(w.ref==='1407'?2.9:1.4));
  const route=matches[0];
  const node=route.points.findIndex(p=>p[0]===w.points[0][0]&&p[1]===w.points[0][1]);
  for(let i=Math.max(1,node-26);i<Math.min(route.points.length,node+27);i++){
    const a=route.points[i-1],b=route.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const steps=Math.ceil(length*4);
    let previous=plan.heightAt(...a);
    for(let j=1;j<=steps;j++){
      const t=j/steps,y=plan.heightAt(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t);
      assert(Math.abs(y-previous)/(length/steps)<.065,'tram approach stays below 6.5% grade');
      previous=y;
    }
  }
}
const sections=plan.decks.reduce((sum,d)=>sum+d.spans.length,0);
const service=createLightRail(map,{heightAt:plan.heightAt}),stock=createLightRail(map,{heightAt:terrain.heightAt});
assert.equal(service.vehicles.length,stock.vehicles.length);
assert.deepEqual(service.routes,stock.routes);
assert.deepEqual(service.stops,stock.stops);
const trainProof=new Set();
for(let i=0;i<4500;i++){
  service.step(.5);stock.step(.5);
  for(let j=0;j<service.vehicles.length;j++){
    const a=service.vehicles[j],b=stock.vehicles[j];
    assert.equal(a.x,b.x);assert.equal(a.z,b.z);assert.equal(a.speed,b.speed);
    if(a.y-b.y>1.4)trainProof.add(a.z<-12000?'1407':'1409');
  }
}
assert.deepEqual([...trainProof].sort(),['1407','1409']);
const scene=new THREE.Scene(),view=createLightRailView(scene,service,plan.heightAt,plan.decks);
for(const deck of plan.decks){
  const [p]=deck.spans;
  view.update([], {x:p.a[0],z:p.a[1]});
  assert(view.stats.bridgeSections>0);
  assert(view.stats.drawCalls<=1);
}
view.update([], {x:1200,z:0});
assert.equal(view.stats.bridgeSections,0);
assert.equal(view.stats.drawCalls,0);
view.dispose();
assert.equal(scene.children.length,0);
console.log(`PASS rail bridges: 12 source ways, 10 visible shells, ${sections} sections, both actual tram deck rides, unchanged service, zero extra draws and distant culling.`);
