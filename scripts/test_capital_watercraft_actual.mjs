import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyDefenceDepot} from '../Games/Capital Drive/defence-depot.js';
import {applyRoadProfiles,roadProfile} from '../Games/Capital Drive/road-network.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createWatercraft} from '../Games/Capital Drive/watercraft.js';
const data=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const [base,north,profiles,ground,airport,airportGround]=await Promise.all(['canberra','canberra-north','road-profiles','north-terrain','airport','airport-terrain'].map(data));
let map=applyMapExpansion(applyRoadProfiles(base,profiles),north);map.terrainTiles=[ground.terrain];map=applyDefenceDepot(applyAirport(map,airport,airportGround));
const sampler=createTerrainSampler(map),simulation=createSimulation(map);
const craft=createWatercraft(map,simulation,{owns:()=>true,heightAt:sampler.groundHeightAt});
const dock=craft.dock;assert(dock);assert.equal(dock.sourceId,'relation/3400115');assert.equal(dock.roadName,'Menindee Drive');
assert(!simulation.waterAt(dock.x,dock.z));assert.equal(simulation.moveActor({...dock.shore},0,0,.45).blocked,false);
assert.equal(dock.sign.x,dock.x);assert.equal(dock.sign.z,dock.z);assert.equal(dock.radius,8);
for(const road of map.roads){
  const profile=roadProfile(road);if(!profile.trafficAllowed)continue;
  for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((dock.sign.x-a[0])*dx+(dock.sign.z-a[1])*dz)/(dx*dx+dz*dz||1)));
    assert(Math.hypot(dock.sign.x-a[0]-t*dx,dock.sign.z-a[1]-t*dz)>=profile.driveWidth/2+1.5,'shop/sign stays outside every actual live road lane');
  }
}
for(const mooring of craft.snapshot().crafts){
  assert(Math.hypot(mooring.x-dock.x,mooring.z-dock.z)<=dock.radius);
  assert(simulation.waterAt(mooring.x,mooring.z,{underBridge:true}));
  assert(craft.board(mooring.id,{valid:true,onFoot:true,pose:dock.shore}).ok,'both craft board from the actual dry source launch');
  const seat=craft.seatPose;assert.equal(craft.seatPose,seat);
  for(let i=0;i<120;i++){
    craft.step(.1,{throttle:1},{valid:true});const pose=craft.active;
    assert(simulation.waterAt(pose.x,pose.z,{underBridge:true}));assert.equal(pose.y,5.93);
  }
  craft.reset();
}
assert.equal(craft.snapshot().crafts.length,2);
console.log(`PASS actual watercraft launch: ${dock.roadName}, ${dock.roadId}, dry shop ${dock.x.toFixed(3)},${dock.z.toFixed(3)}, source lake, clear live lanes, both owned boarding guards and supplied-time water travel. Component evidence; no native career purchase claim.`);
