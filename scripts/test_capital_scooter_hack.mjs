import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createMicromobility} from '../Games/Capital Drive/micromobility.js';
import {createVehicleChallenge} from '../Games/Capital Drive/vehicle-challenges.js';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
const game=new URL('../Games/Capital Drive/',import.meta.url);
const read=path=>readFile(new URL(path,game),'utf8');
const [base,north,source]=await Promise.all([read('data/canberra.json').then(JSON.parse),read('data/canberra-north.json').then(JSON.parse),read('script.js')]);
const functions=['beginRentalHack','updateRentalHack'].map(name=>{
 const fn=source.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`))?.[0];assert(fn,`actual ${name} controller exists`);return fn;
}).join('\n');
const {bind}=await import('data:text/javascript;base64,'+Buffer.from(`export function bind(env){
 const {started,interiors,activities,rentalHack,micromobility,gameplay,focus,visible,moveBody,isSandbox,miniInput,closeDialogs,clearInput,notify}=env;
 let rentalHackTarget=null,cameraReady=false;
 ${functions}
 return {beginRentalHack,updateRentalHack};}`).toString('base64'));
const map=applyMapExpansion(base,north);
function fixture(){
 const micromobility=createMicromobility(map),rentalHack=createVehicleChallenge();
 const asset=micromobility.snapshot().assets.find(a=>a.kind==='scooter');
 const actor={x:asset.x,z:asset.z,yaw:asset.yaw,speed:0};
 let held={},sandbox=false,sight=true;const notices=[],offences=[];
 const gameplay={state:{actor,mode:'foot',recovery:null,carjacking:null},reportOffence:(...args)=>offences.push(args)};
 const controller=bind({started:true,interiors:{active:null},activities:{snapshot:()=>({active:false})},rentalHack,micromobility,gameplay,focus:()=>actor,visible:()=>sight,
  moveBody(p,dx,dz){p.x+=dx;p.z+=dz;return {blocked:false};},isSandbox:()=>sandbox,miniInput:()=>held,closeDialogs(){},clearInput(){held={};},notify:m=>notices.push(m)});
 function tick(input={},dt=.05){held=input;controller.updateRentalHack(dt);}
 function complete(){for(let key=0;key<4;key++){
  for(let i=0;i<100&&rentalHack.snapshot().phase!=='cue';i++)tick();
  const s=rentalHack.snapshot();assert.equal(s.phase,'cue');tick({[s.expectedKey]:true});tick();
 }}
 return {...controller,micromobility,rentalHack,actor,asset,gameplay,tick,complete,notices,offences,setMode:value=>{sandbox=value;},setSight:value=>{sight=value;}};
}
{
 const f=fixture(),before={...f.actor};f.beginRentalHack(f.asset);
 assert(f.rentalHack.snapshot().active);assert.deepEqual(f.actor,before,'starting hack never teleports');
 f.tick({},0);assert.equal(f.rentalHack.snapshot().index,0,'paused clock does not advance');
 f.complete();const active=f.micromobility.snapshot().active;
 assert(active?.stolen);assert.equal(active.hired,false);assert.equal(active.charge,0);assert.equal(active.assetId,f.asset.id);
 assert.equal(f.offences.length,1,'successful actual controller completion reports theft once');
 for(let i=0;i<30;i++)f.tick();assert.equal(f.offences.length,1);
 assert.equal(f.micromobility.drainEvents().filter(e=>e.type==='stolen').length,1);
}
for(const invalidate of [f=>{f.actor.x+=20;},f=>f.setSight(false),f=>{f.gameplay.state.recovery={};},f=>{f.gameplay.state.mode='vehicle';},f=>f.setMode(true)]){
 const f=fixture();f.beginRentalHack(f.asset);invalidate(f);f.tick();
 assert.equal(f.rentalHack.snapshot().active,false);assert.equal(f.micromobility.snapshot().active,null);assert.equal(f.offences.length,0);
}
{
 const f=fixture();f.beginRentalHack({...f.asset,id:'missing'});assert.equal(f.rentalHack.snapshot().active,false);
 f.beginRentalHack(f.asset);for(let i=0;i<400;i++)f.tick();
 assert.equal(f.micromobility.snapshot().active,null,'time alone cannot steal a scooter');
}
{
 const f=fixture();f.beginRentalHack(f.asset);f.rentalHack.cancel('user cancelled');
 f.beginRentalHack(f.asset);f.tick();assert(f.rentalHack.snapshot().active,'a queued old cancel cannot consume the new target');
 f.complete();assert(f.micromobility.snapshot().active?.stolen,'new session owns its own final claim');
}
console.log('PASS scooter controller: actual four-cue completion, zero-charge single claim, pause, target/sight/recovery/mode guards, elapsed denial, and stale-cancel retry ownership');
