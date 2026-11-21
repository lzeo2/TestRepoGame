import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { BUS_STOPS, FUEL_STATIONS, selectStreetAssets } from './street-assets.js';

export const STREET_ASSET_VIEW_LIMITS = Object.freeze({stops:80,fuelStations:12,range:450,maxDrawCalls:1,maxInstances:2048});

// Original unbranded street furniture. Exact source anchors remain in the data;
// estimated pieces that do not clear retained road/building bodies are omitted.
export function createStreetAssetsView(scene,heightAt,{nitroStations=[]}={}) {
  const bays=new Map(nitroStations.map(site=>[site.id,site]));
  const geometry=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshLambertMaterial({color:0xffffff});
  const mesh=new THREE.InstancedMesh(geometry,material,STREET_ASSET_VIEW_LIMITS.maxInstances);
  mesh.name='Sourced bus stops and original petrol furniture';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;scene.add(mesh);
  const pose=new THREE.Object3D(),color=new THREE.Color();
  const stats={stops:0,fuelStations:0,instances:0,drawCalls:0,maxDrawCalls:1,sourceStops:BUS_STOPS.length,sourceFuelStations:FUEL_STATIONS.length,geometries:1,materials:1,textures:0,disposed:false};
  let disposed=false,lastX=Infinity,lastZ=Infinity;
  function ground(x,z) { const y=heightAt(x,z);return Number.isFinite(y)?y:null; }
  function box(x,y,z,w,h,d,yaw,shade) {
    if(stats.instances>=STREET_ASSET_VIEW_LIMITS.maxInstances || ![x,y,z,w,h,d,yaw].every(Number.isFinite) || h<=0)return;
    pose.position.set(x,y,z);pose.rotation.set(0,-yaw,0);pose.scale.set(w,h,d);pose.updateMatrix();
    mesh.setMatrixAt(stats.instances,pose.matrix);mesh.setColorAt(stats.instances,color.setHex(shade));stats.instances++;
  }
  function local(site,dx,dz) {
    const cs=Math.cos(site.yaw),sn=Math.sin(site.yaw);
    return {x:site.x+dx*cs-dz*sn,z:site.z+dx*sn+dz*cs};
  }
  function furniture(site) {
    const y=ground(site.x,site.z);if(y===null)return;
    if(site.role==='pole') {
      box(site.x,y+1.25,site.z,.065,2.5,.065,site.yaw,0x70786f);
      box(site.x,y+2.25,site.z,.34,.48,.075,site.yaw,0x385f51);
      box(site.x,y+2.25,site.z,.23,.07,.082,site.yaw,0xe7e8d8);
    } else if(site.role==='bench') {
      const feet=[local(site,-.55,0),local(site,.55,0)];
      const heights=feet.map(p=>ground(p.x,p.z));if(heights.some(v=>v===null))return;
      const seat=Math.max(y,...heights)+.47;
      box(site.x,seat,site.z,1.5,.09,.48,site.yaw,0x76806b);
      const back=local(site,0,.21);box(back.x,seat+.22,back.z,1.5,.36,.055,site.yaw,0x76806b);
      feet.forEach((p,i)=>box(p.x,(heights[i]+seat-.045)/2,p.z,.09,seat-.045-heights[i],.31,site.yaw,0x4c544e));
    } else if(site.role==='shelter') {
      const feet=[local(site,-1.25,-.57),local(site,1.25,-.57),local(site,-1.25,.57),local(site,1.25,.57)];
      const heights=feet.map(p=>ground(p.x,p.z));if(heights.some(v=>v===null))return;
      const roof=Math.max(y,...heights)+2.4;
      box(site.x,roof,site.z,2.8,.12,1.4,site.yaw,0xb8b8a8);
      feet.forEach((p,i)=>box(p.x,(heights[i]+roof-.06)/2,p.z,.085,roof-.06-heights[i],.085,site.yaw,0x697267));
      const rail=local(site,0,.57);box(rail.x,roof-.85,rail.z,2.5,.06,.06,site.yaw,0x697267);
    } else if(site.role==='pump') {
      box(site.x,y+.08,site.z,.9,.16,.6,site.yaw,0x91948b);
      box(site.x,y+.7,site.z,.62,1.12,.43,site.yaw,0xe1dfcf);
      box(site.x,y+1.35,site.z,.72,.34,.48,site.yaw,0x8d6046);
      for(const side of [-1,1]) {
        const screen=local(site,0,side*.247);box(screen.x,y+1.35,screen.z,.39,.17,.018,site.yaw,0x344043);
        const hose=local(site,.4,side*.1);box(hose.x,y+.88,hose.z,.045,.65,.045,site.yaw,0x303634);
      }
    } else if(site.role==='fuel-sign') {
      box(site.x,y+1.2,site.z,.09,2.4,.09,site.yaw,0x626b62);
      box(site.x,y+2.2,site.z,.58,.45,.15,site.yaw,0x8d6046);
      box(site.x,y+2.2,site.z,.34,.06,.16,site.yaw,0xe5e1d1);
    }
  }
  function paintBay(site) {
    // Raised paint strips follow the sampled forecourt without extra meshes.
    for(const side of [-1,1]) {
      const rail=local(site,side*1.6,0),cap=local(site,0,side*2.35);
      const railY=ground(rail.x,rail.z),capY=ground(cap.x,cap.z);
      if(railY!==null)box(rail.x,railY+.04,rail.z,.13,.04,4.8,site.yaw,0x62bfd5);
      if(capY!==null)box(cap.x,capY+.04,cap.z,.95,.04,.13,site.yaw,0x62bfd5);
    }
  }
  function update(focus) {
    if(disposed)return;
    if(!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.z)) {
      mesh.count=0;mesh.visible=false;stats.stops=stats.fuelStations=stats.instances=stats.drawCalls=0;lastX=lastZ=Infinity;return;
    }
    // Static furniture only needs a fresh selection after moving a few metres.
    if(Math.hypot(focus.x-lastX,focus.z-lastZ)<4)return;
    lastX=focus.x;lastZ=focus.z;stats.stops=stats.fuelStations=stats.instances=0;
    const selected=selectStreetAssets(focus,STREET_ASSET_VIEW_LIMITS);
    for(const stop of selected.stops) {
      const before=stats.instances;stop.furniture.forEach(furniture);if(stats.instances>before)stats.stops++;
    }
    for(const fuel of selected.fuelStations) {
      const before=stats.instances;fuel.furniture.forEach(furniture);
      const bay=bays.get(fuel.id);if(bay)paintBay(bay);
      if(stats.instances>before)stats.fuelStations++;
    }
    mesh.count=stats.instances;mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    stats.drawCalls=mesh.visible?1:0;
  }
  function dispose() {
    if(disposed)return;disposed=true;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();
    mesh.count=0;mesh.visible=false;stats.stops=stats.fuelStations=stats.instances=stats.drawCalls=0;stats.disposed=true;
  }
  return {update,get stats(){return Object.freeze({...stats});},dispose};
}
