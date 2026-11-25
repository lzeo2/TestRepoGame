import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {loadCapitalMap} from './capital-map-fixture.mjs';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createStuntRamps} from '../Games/Capital Drive/stunt-ramps.js';
import {createPoliceStations} from '../Games/Capital Drive/police-stations.js';
import {buildHeistSites} from '../Games/Capital Drive/heist-sites.js';
import {buildRentalStorefronts} from '../Games/Capital Drive/rental-storefronts.js';
import {createNitroStations} from '../Games/Capital Drive/nitro-stations.js';
import {buildPetrolForecourts} from '../Games/Capital Drive/petrol-forecourts.js';
import {FUEL_STATIONS} from '../Games/Capital Drive/street-assets.js';
import {createLightRail} from '../Games/Capital Drive/light-rail.js';

// Canvas pixels are irrelevant to this CPU mesh audit. No WebGL/native visual claim.
globalThis.document ??= {createElement:()=>({getContext:()=>({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData(){},fillRect(){},strokeRect(){},fillText(){},clearRect(){},
  measureText:s=>({width:s.length*8})
})})};
const map=await loadCapitalMap(),terrain=createTerrainSampler(map),height=terrain.heightAt;
const simulation=createSimulation(map,{groundHeightAt:terrain.groundHeightAt,vehicleHeightAt:terrain.vehicleHeightAt});
// Read-only production placement planners. No gameplay tick, target or weapon action.
const stunts=createStuntRamps(map,terrain),stations=createPoliceStations(map,simulation,height);
const heists=buildHeistSites(map,simulation,height),rentals=buildRentalStorefronts(simulation,height);
const nitro=createNitroStations(FUEL_STATIONS,simulation),forecourts=buildPetrolForecourts(nitro,FUEL_STATIONS,simulation,height,map.buildings);
const rail=createLightRail(map,{heightAt:height,canStand:p=>!simulation.moveActor(p,0,0,.45).blocked,canReach:simulation.hasLineOfSight});
const tower=map.landmarks.find(p=>p.id==='black-mountain-tower');
const modules=[
 ['landmarks-view','createLandmarksView',s=>[s,map,height]],
 ['airport-view','createAirportView',s=>[s,map,height]],
 ['defence-depot-view','createDefenceDepotView',s=>[s,map,height]],
 ['civic-view','createCivicView',s=>[s,map,height,{roadHeightAt:terrain.roadHeightAt}]],
 ['civic-extras-view','createCivicExtrasView',s=>[s,map,terrain.groundHeightAt]],
 ['campus-view','createCampusView',s=>[s,map,height]],
 ['anu-campus-view','createAnuCampusView',s=>[s,height]],
 ['local-details-view','createLocalDetailsView',s=>[s,map,height]],
 ['north-places-view','createNorthPlacesView',s=>[s,{tower,towerFootprint:map.buildings.find(b=>b.id===tower?.buildingId)?.points,waterpark:map.giantSpray,heightAt:height}]],
 ['regional-landmarks-view','createRegionalLandmarksView',s=>[s,map,terrain.groundHeightAt]],
 ['macquarie-shops-view','createMacquarieShopsView',s=>[s,map,terrain.groundHeightAt]],
 ['war-memorial-view','createWarMemorialView',s=>[s,map,terrain.groundHeightAt]],
 ['shopping-view','createShoppingView',s=>[s,map,height]],
 ['noodle-shop-view','createNoodleShopView',s=>[s,height]],
 ['storefronts-view','createStorefrontsView',s=>[s,height,{excludeIds:['store-5656111023']}]],
 ['services-view','createServicesView',s=>[s,height]],
 ['stunt-ramps-view','createStuntRampsView',s=>[s,stunts]],
 ['highway-barriers-view','createHighwayBarriersView',s=>[s,height]],
 ['street-assets-view','createStreetAssetsView',s=>[s,height,{nitroStations:nitro,petrolForecourts:forecourts.sites}]],
 ['rental-storefronts-view','createRentalStorefrontsView',s=>[s,height,rentals.sites]],
 ['police-station-view','createPoliceStationView',s=>[s,stations]],
 ['heist-sites-view','createHeistSitesView',s=>[s,heists.sites]],
 ['light-rail-view','createLightRailView',s=>[s,rail,height],(v,p)=>v.update([],p)],
 ['traffic-lights-view','createTrafficLightsView',s=>[s,height],(v,p)=>v.update(simulation.trafficLights.heads,p)],
 ['neighbourhood','createNeighbourhoodDetails',s=>[s,map,height,{lowGraphics:true,streaming:true}]],
];
const poses=[map.spawn,...map.landmarks,...map.regionalPlaces??[],...FUEL_STATIONS,...nitro,...rentals.sites,...stations.sites,...heists.sites];
// 400m lattice reaches every point within 283m, including lazy airport cells,
// pooled street fixtures and garden/detail ranges. Source site anchors add visits.
for(let x=map.bounds.minX-400;x<=map.bounds.maxX+400;x+=400)
  for(let z=map.bounds.minZ-400;z<=map.bounds.maxZ+400;z+=400)poses.push({x,z});
const reports=[];
const requested=process.argv.find(a=>a.startsWith('--factory='))?.slice(10);
for(const [file,name,args,update] of modules.filter(([,name])=>!requested||requested.split(',').includes(name))){
 const { [name]:factory }=await import(`../Games/Capital Drive/${file}.js`);
 const scene=new THREE.Scene(),view=factory(...args(scene)),seen=new WeakMap(),observedMaterials=new Set(),observedTextures=new Set();
 const report={factory:name,poses:0,geometries:0,vertices:0,triangles:0,lines:0,instanceMatrices:0,zeroTriangles:0,nonzeroCollapsed:0,disposedGeometry:0,disposedMaterial:0,disposedTexture:0,degenerateExamples:[]};
 function inspect(){
  scene.updateMatrixWorld(true);
  scene.traverse(o=>{
   assert(o.matrixWorld.elements.every(Number.isFinite),name+' finite world transform');
   if(!o.geometry)return;
   const g=o.geometry,p=g.attributes.position;
   if(!seen.has(g)){seen.set(g,-1);report.geometries++;g.addEventListener('dispose',()=>report.disposedGeometry++);}
   for(const material of Array.isArray(o.material)?o.material:[o.material])if(material&&!observedMaterials.has(material)){
    observedMaterials.add(material);material.addEventListener('dispose',()=>report.disposedMaterial++);
    for(const v of Object.values(material))if(v?.isTexture&&!observedTextures.has(v)){observedTextures.add(v);v.addEventListener('dispose',()=>report.disposedTexture++);}
   }
   if(seen.get(g)!==p.version){
    const first=seen.get(g)===-1;seen.set(g,p.version);
    for(const [key,a]of Object.entries(g.attributes)){
     if(!a.isInstancedBufferAttribute)assert.equal(a.count,p.count,name+' matching '+key+' count');
     for(const v of a.array)assert(Number.isFinite(v),name+' finite '+key);
    }
    const index=g.index,count=index?.count??p.count;
    if(index)for(const i of index.array)assert(Number.isInteger(i)&&i>=0&&i<p.count,name+' valid index');
    if(first){report.vertices+=p.count;if(o.isMesh)report.triangles+=count/3;else report.lines+=count/2;}
    if(o.isMesh){assert.equal(count%3,0,name+' complete triangles');
     let zeros=0,collapsed=0;
     for(let i=0;i<count;i+=3){
      const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j),a=ids.map(j=>[p.getX(j),p.getY(j),p.getZ(j)]);
      const u=a[1].map((v,k)=>v-a[0][k]),v=a[2].map((v,k)=>v-a[0][k]);
      const area=Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]);
      assert(Number.isFinite(area),name+' finite face');
      if(area===0){if(a.flat().every(v=>v===0))zeros++;else {collapsed++;if(report.degenerateExamples.length<3)report.degenerateExamples.push({mesh:o.name,points:a});}}
     }
     // Maxima per mesh/snapshot distinguish pooled zero slices from submitted bodies.
     report.zeroTriangles=Math.max(report.zeroTriangles,zeros);report.nonzeroCollapsed=Math.max(report.nonzeroCollapsed,collapsed);
    }
    g.computeBoundingBox();g.computeBoundingSphere();
    if(p.count){assert(Number.isFinite(g.boundingSphere.radius),name+' finite sphere');assert([...g.boundingBox.min.toArray(),...g.boundingBox.max.toArray()].every(Number.isFinite),name+' finite bounds');}
   }
   if(o.isInstancedMesh){
    assert(Number.isInteger(o.count)&&o.count>=0&&o.count<=o.instanceMatrix.count,name+' instance count');
    for(let i=0;i<o.count*16;i++)assert(Number.isFinite(o.instanceMatrix.array[i]),name+' finite live instance matrix');
    if(o.instanceColor)for(let i=0;i<o.count*o.instanceColor.itemSize;i++)assert(Number.isFinite(o.instanceColor.array[i]),name+' finite live instance color');
    report.instanceMatrices+=o.count;
   }
  });
 }
 try{
  inspect();
  for(const pose of poses){if(!Number.isFinite(pose?.x)||!Number.isFinite(pose?.z))continue;
   if(update)update(view,pose);else view.update?.(pose);
   inspect();let budget=0;
   while((view.stats?.pendingChunks||view.stats?.queue)&&budget++<40){view.update(pose);inspect();}
   assert(budget<40,name+' drains bounded queue');report.poses++;
  }
 }finally{view.dispose();}
 assert.equal(scene.children.length,0,name+' removes scene objects');
 assert.equal(report.disposedGeometry,report.geometries,name+' disposes observed geometry');
 assert.equal(report.disposedMaterial,observedMaterials.size,name+' disposes observed materials');
 assert.equal(report.disposedTexture,observedTextures.size,name+' disposes observed textures');
 assert(report.geometries>0,name+' produced actual geometry');
 reports.push(report);console.log(JSON.stringify(report));
}
assert(reports.length>0,'at least one selected factory must run');
console.log(JSON.stringify({scope:'static specialized exterior factories; no dynamic actor/vehicle/interior/effect views',factories:reports.length,focusVisits:poses.length,reports}));
