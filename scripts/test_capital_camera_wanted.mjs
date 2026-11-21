import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createGameplay} from '../Games/Capital Drive/gameplay.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createSecurityCameras} from '../Games/Capital Drive/security-cameras.js';
import {createShotObstacles} from '../Games/Capital Drive/shot-obstacles.js';
// Execute exact controller helpers with bounded owner doubles. This is adapter
// evidence, not a browser boot, native travel or graphics performance claim.
const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
assert(source.includes('      recordCameraGameplayEvent(event);'),'live Gameplay event binding uses the deduplicating controller adapter');
assert(source.includes('    recordCameraWorkEvent(event);'),'live work event binding uses report-first camera admission');
function helper(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, name);
  let depth = 0, quote = null, escape = false;
  let endParams=source.indexOf('(',start),params=0;
  do { const c=source[endParams++];if(c==='(')params++;else if(c===')')params--; } while(params);
  const body = source.indexOf('{', endParams);
  for (let i = body; i < source.length; i++) {
    const c = source[i];
    if (quote) { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) quote = null; continue; }
    if ('\'"`'.includes(c)) { quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Unclosed helper ${name}`);
}
function owner(names, context) {
  const scope = vm.createContext({ droneActive: false, ...context });
  vm.runInContext(names.map(helper).join('\n'), scope);
  return scope;
}
const map={bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},roads:[],buildings:[],landmarks:[],spawn:{x:0,z:-10,yaw:0}};
function fixture(witnessed){
  const simulation=createSimulation(map,{trafficCount:0});let bridge;
  const attacks=[];
  const gameplay=createGameplay(map,simulation,{hasWeapon:()=>true,pedestrians:{snapshot:()=>witnessed?[{x:1,z:-10,health:100}]:[],strike:()=>({hits:0}),alert:()=>{}},
    onEvent:event=>{if(event.kind==='attack'){attacks.push(event);bridge.recordCameraGameplayEvent(event);}}});
  gameplay.state.mode='foot';Object.assign(gameplay.state.actor,{x:0,z:-10,yaw:0});gameplay.addAmmo(100,'pistol');gameplay.setWeapon('pistol');
  const cameras=createSecurityCameras([{id:'camera',x:0,z:0,yaw:0}],{hasLineOfSight:()=>true});
  bridge=owner(['recordCameraCrime','recordCameraGameplayEvent','recordCameraWorkEvent','stepSecurityCameras'],{securityCameras:cameras,cameraCrimeSerial:0,cameraRoomPlan:null,interiors:{active:null},focus:()=>gameplay.focus(),gameplay,isSandbox:()=>false});
  const shoot=()=>{gameplay.step(1/60,{aim:true,aimYaw:0,fire:true});bridge.stepSecurityCameras(.5);for(let i=0;i<30;i++)gameplay.step(1/60,{});};
  return {gameplay,bridge,cameras,attacks,shoot};
}
const witnessed=fixture(true);witnessed.shoot();assert.equal(witnessed.attacks.length,1);assert.equal(witnessed.attacks[0].offenceReported,true);
assert.equal(witnessed.gameplay.state.offencePressure,1,'one witnessed shot cannot receive additional camera pressure');
for(let i=0;i<3;i++)witnessed.shoot();
assert.equal(witnessed.attacks.length,4);assert.equal(witnessed.gameplay.state.offencePressure,4,'four fresh minor reports count four, not eight');
assert.equal(witnessed.gameplay.state.wanted,2);
const hidden=fixture(false);hidden.shoot();assert.equal(hidden.attacks[0].offenceReported,false,'actual unwitnessed Gameplay attack records false');
assert.equal(hidden.gameplay.state.offencePressure,1,'camera can report an otherwise unwitnessed shot once');
for(let i=0;i<5;i++)hidden.bridge.stepSecurityCameras(.5);
assert.equal(hidden.gameplay.state.offencePressure,1,'wanted camera sightings update location without pressure');
const walking=fixture(false);for(let i=0;i<30;i++){walking.gameplay.step(1/60,{moveZ:1});walking.bridge.stepSecurityCameras(1/60);}
assert.equal(walking.gameplay.state.wanted,0);assert.equal(walking.gameplay.state.offencePressure,0,'walking is not a crime');
walking.bridge.recordCameraGameplayEvent({kind:'attack',weapon:'pistol',hits:0});walking.bridge.stepSecurityCameras(.5);
assert.equal(walking.gameplay.state.offencePressure,0,'missing reported flag is not an explicit unwitnessed receipt');
const robbery=fixture(false);robbery.bridge.recordCameraWorkEvent({type:'robbery-started',point:{x:0,z:-10}});
assert.equal(robbery.gameplay.state.offencePressure,4);robbery.bridge.stepSecurityCameras(.5);
assert.equal(robbery.gameplay.state.offencePressure,4,'explicit witnessed robbery is not reported again by hardware');
assert.equal(robbery.cameras.snapshot()[0].state,'alert','a camera marks the witnessed robbery as seen');
assert.equal(robbery.gameplay.state.pursuit,'pursuit','a camera sighting refreshes location without pressure');
const ownCar={id:'player',modelId:'lantern',x:0,z:-10,y:0,yaw:0,length:4.8,width:1.8,height:1.6,active:true};
let vehicles=[ownCar],solids=createShotObstacles(map,{heightAt:()=>0});
const cover=owner(['cameraSight'],{focus:()=>ownCar,interiors:{active:null},aircraft:null,buses:null,rideService:null,gameplay:{state:{mode:'vehicle'}},ordnance:{blocksSight:()=>false},
  traceWorldShot:ray=>solids.trace(ray,null,vehicles)});
const from={x:0,y:3,z:0},to={x:0,y:1,z:-10};
assert(cover.cameraSight(from,to),'occupied target car is an endpoint exemption, not its own cover');
vehicles=[ownCar,{...ownCar,id:'foreign',z:-5}];
assert.equal(cover.cameraSight(from,to),false,'foreign car remains solid camera cover');
vehicles=[ownCar];solids=createShotObstacles({...map,buildings:[{id:'wall',height:6,points:[[-3,-5.2],[3,-5.2],[3,-4.8],[-3,-4.8]]}]},{heightAt:()=>0});
assert.equal(cover.cameraSight(from,to),false,'real building walls still obstruct occupied targets');
solids=createShotObstacles(map,{heightAt:()=>0});cover.gameplay.state.mode='foot';
assert.equal(cover.cameraSight(from,to),false,'on-foot body cannot exempt a coincident parked car');
cover.gameplay.state.mode='vehicle';assert.equal(cover.cameraSight(from,{...to,interiorId:'room'}),false);
for(const item of [witnessed,hidden,walking,robbery])item.cameras.dispose();
console.log('Capital camera wanted PASS: actual witnessed attacks count once, four minor actions pressure4, unwitnessed camera report once, lawful movement, robbery dedup and occupied-car-only 3D sight exemption');
