import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createTerrainSampler} from '../Games/Capital Drive/terrain.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyRoadProfiles} from '../Games/Capital Drive/road-network.js';
const json=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const map=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
map.terrainTiles=[(await json('north-terrain')).terrain];
const terrain=createTerrainSampler(map);
// Retained Flynn Drive / Commonwealth Avenue crossing, staged at the lower
// road edge with the car turned parallel to the overhead deck.
const lower=map.roads.find(r=>r.id==='23035340-north-0');
const upper=map.roads.find(r=>r.id==='75247036-north-0');
const pose={x:-946.1485714285715,z:-2564.940857142857,
  yaw:Math.atan2(-(upper.points[1][0]-upper.points[0][0]),-(upper.points[1][1]-upper.points[0][1]))};
const ground=terrain.roadHeightAt(lower,pose.x,pose.z),deck=terrain.roadHeightAt(upper,pose.x,pose.z);
assert(deck-ground>2.5,'fixture retains distinct real source road levels');
assert.equal(terrain.vehicleHeightAt(pose),deck,'horizontal-only lookup reproduces overhead selection');
assert.equal(terrain.vehicleHeightAt({...pose,y:ground+.18}),ground,'turning below deck retains lower support');
assert.equal(terrain.vehicleHeightAt({...pose,y:deck+.18}),deck,'upper vehicle retains its deck');
assert.equal(terrain.vehicleHeightAt({...pose,y:ground+.18},upper),deck,'explicit road owner remains authoritative');
for(const y of [NaN,Infinity,deck+100])assert.equal(terrain.vehicleHeightAt({...pose,y}),deck,'invalid or unsupported heights retain horizontal fallback');
// Supplied live height is refreshed after each half-metre movement, as for
// canonical external vehicles; neither road may steal the other's support.
for(const road of [lower,upper]) {
  const a=road.points[0],b=road.points[1],span=Math.hypot(b[0]-a[0],b[1]-a[1]);
  let y=terrain.roadHeightAt(road,pose.x,pose.z)+.18;
  for(let step=0;step<9;step++){
    const moving={...pose,x:pose.x+(b[0]-a[0])/span*step*.5,z:pose.z+(b[1]-a[1])/span*step*.5,y};
    const support=terrain.vehicleHeightAt(moving);
    assert.equal(support,terrain.roadHeightAt(road,moving.x,moving.z),'moving canonical pose retains its source level');
    y=support+.18;
  }
}
const away={x:100000,z:100000,y:500,yaw:0};
assert.equal(terrain.vehicleHeightAt(away),terrain.groundHeightAt(away.x,away.z),'off-road support stays terrain');
console.log('Capital bridge support selection: PASS (real source lower turn, upper deck, explicit owner and unsupported-height controls)');

const lowerYaw=Math.atan2(-(lower.points[1][0]-lower.points[0][0]),-(lower.points[1][1]-lower.points[0][1]));
const world={bounds:{minX:pose.x-200,maxX:pose.x+200,minZ:pose.z-200,maxZ:pose.z+200},roads:[],buildings:[],areas:[],spawn:{...pose,yaw:lowerYaw}};
const sim=createSimulation(world,{trafficCount:0,preserveVehicleSupport:true,vehicleHeightAt:terrain.vehicleHeightAt});
assert.equal(terrain.vehicleHeightAt(sim.player),ground,'ordinary reset establishes lower support without player Y');
assert.equal(sim.player.y,undefined,'support hint does not replace body or flight Y');
// A staged low-speed steering sequence drives the production step/turn/sweep.
Object.assign(sim.player,{yaw:pose.yaw,vx:-Math.sin(pose.yaw)*2,vz:-Math.cos(pose.yaw)*2});
assert.equal(sim.setExternalVehicles([{id:'overhead',...pose,y:deck+.18,modelId:'lantern',length:4.5,width:1.8,active:true}]),1,'production external hull admitted');
for(let i=0;i<8;i++) {
  sim.step(.05,{throttle:.1,steer:.4});
  assert.equal(terrain.vehicleHeightAt(sim.player),terrain.roadHeightAt(lower,sim.player.x,sim.player.z),'ordinary moving/turning player remains underneath');
}
assert(Math.hypot(sim.player.x-pose.x,sim.player.z-pose.z)>.5,'upper car cannot block lower movement');
assert.notEqual(sim.player.yaw,pose.yaw,'production steering actually rotates the body');
assert.equal(sim.setExternalVehicles([{...sim.player,id:'same-lower',length:4.5,width:1.8,active:true}]),1);
assert(!sim.canOccupy(sim.player),'same-level cars still block the supported ordinary player');
sim.setExternalVehicles([]);
assert(sim.teleport(pose).ok);
assert.equal(terrain.vehicleHeightAt(sim.player),deck,'teleport clears the previous lower support');
sim.reset();assert.equal(terrain.vehicleHeightAt(sim.player),ground,'reset re-establishes lower support');
const stale={...pose,supportY:ground,supportX:pose.x+100,supportZ:pose.z};
assert.equal(terrain.vehicleHeightAt(stale),deck,'stale support from remote direct placement is ignored');
console.log('Capital ordinary player bridge support: PASS (production step/turn/sweep, overhead hull, teleport/reset and stale hint)');

sim.setParkedCars([{id:'upper-parked',...pose,y:deck+.18,modelId:'lantern',length:4.5,width:1.8,active:true}]);
assert(sim.claimVehicle('upper-parked').ok);
assert.equal(terrain.vehicleHeightAt(sim.player),deck,'claim takes parked car support rather than previous player level');
const abandoned=sim.nearbyVehicles(pose.x,pose.z,10).find(car=>car.id.startsWith('abandoned:'));
assert(abandoned);assert(Math.abs(abandoned.y-ground-.18)<1e-9,'abandoned lower car retains canonical body height');
console.log('Capital bridge support ownership transfer: PASS');
