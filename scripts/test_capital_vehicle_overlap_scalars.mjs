import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const baselineRevision='5e1b05444b14cc1cca4a02acce6bd03331429097';
const sourceURL=new URL('../Games/Capital Drive/simulation.js',import.meta.url);
const source=await readFile(sourceURL,'utf8');
const baseline=execFileSync('git',['show',`${baselineRevision}:Games/Capital Drive/simulation.js`],{cwd:new URL('../',import.meta.url),encoding:'utf8',maxBuffer:1024*1024});
const load=async text=>{
 assert(text.includes('return { player,'),'actual simulation return must expose its vehicle overlap helper');
 text=text.replace(/from ['"]([^'"]+)['"]/g,(_,path)=>`from ${JSON.stringify(new URL(path,sourceURL).href)}`)
  .replace('return { player,','return { overlapForTest:vehicleOverlap, player,');
 return import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
};
const old=await load(baseline),current=await load(source);
const map={bounds:{minX:-500,maxX:500,minZ:-500,maxZ:500},roads:[],buildings:[],areas:[],spawn:{x:-400,z:-400,yaw:0}};
const options={trafficCount:0,vehicleHeightAt:car=>car.y||0};
const before=old.createSimulation(map,options),after=current.createSimulation(map,options);
let count=0;
const check=(a,al,aw,b)=>{assert.equal(after.overlapForTest(a,al,aw,b),before.overlapForTest(a,al,aw,b));count++;};
for(let i=0;i<24000;i++){
 const a={x:(i*31%101)-50,z:(i*47%103)-51,yaw:i*.371,y:i%3,height:1+i%5/2};
 const b={x:a.x+(i*17%251)/10-12.5,z:a.z+(i*19%241)/10-12,yaw:i*.791,y:i%7,height:.5+i%4,modelId:['lantern','atlas','finch','missing'][i%4]};
 if(i%2){b.length=.5+i%19;b.width=.25+i%6;}
 check(a,1+i%16,.5+i%7/2,b);
}
for(const yaw of [0,-0,Math.PI/2,-Math.PI/2,Math.PI,Math.PI/4,undefined,NaN,Infinity]){
 for(const distance of [0,1,2,4,8,16])for(const epsilon of [-1e-12,-Number.EPSILON,0,Number.EPSILON,1e-12]){
  check({x:0,z:0,yaw},4,2,{x:distance+epsilon,z:0,yaw,length:4,width:2});
  check({x:0,z:0,yaw},4,2,{x:0,z:distance+epsilon,yaw,length:4,width:2});
 }
}
for(let i=0;i<200;i++){
 const yaw=i*.371,rightX=Math.cos(yaw),rightZ=-Math.sin(yaw),forwardX=-Math.sin(yaw),forwardZ=-Math.cos(yaw);
 for(const epsilon of [-1e-12,-Number.EPSILON,0,Number.EPSILON,1e-12]){
  check({x:0,z:0,yaw},4,2,{x:rightX*(2+epsilon),z:rightZ*(2+epsilon),yaw,length:4,width:2});
  check({x:0,z:0,yaw},4,2,{x:forwardX*(4+epsilon),z:forwardZ*(4+epsilon),yaw,length:4,width:2});
 }
}
assert(after.overlapForTest({x:0,z:0,yaw:0},4,2,{x:1,z:0,yaw:0,length:4,width:2}));
assert(!after.overlapForTest({x:0,z:0,yaw:0},4,2,{x:2,z:0,yaw:0,length:4,width:2}),'exact touching remains non-overlap');
assert(!after.overlapForTest({x:0,z:0,yaw:0,y:0},4,2,{x:0,z:0,yaw:0,y:8,length:4,width:2}),'disjoint bridge heights remain separate');
console.log(`PASS scalar SAT: ${count} pinned-baseline pair probes, strict touching/near-threshold, model sizes, rotations and bridge-level controls.`);
if(process.argv.includes('--actual')){
 const {applyMapExpansion}=await import('../Games/Capital Drive/map-expansion.js');
 const {applyRoadProfiles}=await import('../Games/Capital Drive/road-network.js');
 const {createTerrainSampler}=await import('../Games/Capital Drive/terrain.js');
 const json=async name=>JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url),'utf8'));
 const actual=applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
 actual.terrainTiles=[(await json('north-terrain')).terrain];actual.lakeWaterLevel=5.93;
 const terrain=createTerrainSampler(actual),opts={trafficCount:40,seed:20261117,isOnBridge:terrain.isOnBridge,vehicleHeightAt:terrain.vehicleHeightAt};
 const a=old.createSimulation(actual,opts),b=current.createSimulation(actual,opts);
 const state=sim=>({player:{...sim.player},traffic:sim.traffic.map(({edge,...car})=>({...car,edgeId:edge?.id}))});
 for(let frame=0;frame<240;frame++){
  const input={throttle:.35,steer:Math.sin(frame/180)*.12};
  for(const sim of [a,b])sim.step(1/60,input);
  assert.deepEqual(state(b),state(a));
 }
 for(let i=0;i<1000;i++){
  const first=a.traffic[i%a.traffic.length],second=a.traffic[(i*7+1)%a.traffic.length];
  assert.equal(b.overlapForTest(first,4.5,1.8,second),a.overlapForTest(first,4.5,1.8,second));
 }
 console.log('PASS actual scalar SAT: 240 exact player/40-car frames and 1000 real vehicle pairs with shared terrain bridge callbacks.');
}
