// Real Host protocol/API placement proof, not native casting/floor/LOS/facing security.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
import {UNPRINTED_PASSAGE as route} from './unprinted-passage.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`),p=(x=0,y=0,z=0)=>({x,y,z});let rejects=0;
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[0];
function fixture(){const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:p()}),ally=s.addHero({id:'ally',team:'carbon',position:p(1.5)}),enemy=s.addHero({id:'enemy',team:'ivory',position:p(1.5)}),kit=structuredClone(whitespaceSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
 const geometry=(origin=h.position)=>({origin:{...origin},direction:p(1),centers:Array.from({length:6},(_,i)=>p(origin.x+i*3,origin.y,origin.z))});
 const event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:route.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:.25,damageType:'none',duration:5,...extra});
 const start=(id=1,g=geometry())=>event('deployment-start',null,{deploymentId:id,...g}),end=id=>event('deployment-end',null,{deploymentId:id});
 const speed=(id=1,target=ally,index=0,origin=geometry().centers[index])=>event('speed',target,{deploymentId:id,zoneIndex:index,origin:{...origin},speedMultiplier:1.35,speedDuration:.5});
 const slow=(id=1,target=enemy,index=0,origin=geometry().centers[index])=>event('status',target,{deploymentId:id,zoneIndex:index,origin:{...origin},slowDuration:.5});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id))});
 const reject=e=>{const before=state();assert.equal(s.applyHeroEffect(e).ok,false);assert.deepEqual(state(),before);rejects++;};
 const apply=e=>{const before=s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]);const result=s.applyHeroEffect(e);assert.ok(result.ok,result.reason);assert.deepEqual(s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]),before);return result;};
 const ticks=n=>{for(let i=0;i<n;i++)assert.ok(s.step(.05).ok);};return{s,h,ally,enemy,kit,geometry,event,start,end,speed,slow,state,reject,apply,ticks};}
// Dense-snapshot boundary: visit ALL indices, including holes, before any ledger mutation.
const holes=[];for(let i=0;i<6;i++){const f=fixture(),e=f.start(),before=f.state();delete e.centers[i];let result,error;try{result=f.s.applyHeroEffect(e);}catch(caught){error=caught.name;}holes.push({index:i,ok:result?.ok,error});if(result?.ok===false){assert.deepEqual(f.state(),before);f.apply(f.start());rejects++;}}
console.log('Sparse center results',JSON.stringify(holes));
{
 const f=fixture(),e=f.start();let reads=0;Object.defineProperty(e.centers[1],'x',{enumerable:true,get(){reads++;return reads<=3?3:999;}});f.apply(e);console.log('Changing center coordinate reads',reads);assert.equal(reads,1,'capture a coordinate once before validating/committing');assert.ok(f.s.moveHero(f.ally.id,p(999)).ok);f.reject(f.speed(1,f.ally,1,p(999)));assert.ok(f.s.moveHero(f.ally.id,p(3)).ok);f.apply(f.speed(1,f.ally,1,p(3)));
}
assert.ok(holes.every(x=>x.ok===false&&!x.error),'all six holes must return structured false with no mutation and allow valid retry');
const malformed=[e=>e.centers.pop(),e=>e.centers.push(p(18)),e=>e.centers[2].x+=1,e=>e.centers[0].z+=1,e=>e.centers[5].x=17,e=>e.centers[1].y=NaN,e=>e.centers[0]=Object.assign(Object.create(null),e.centers[0]),e=>e.direction=p(2),e=>e.direction=p(1,.1),e=>e.direction=p(),e=>e.direction=p(NaN),e=>e.origin.x+=1,e=>e.origin=Object.assign(Object.create(null),e.origin),e=>e.deploymentId=0,e=>e.deploymentId=1.5,e=>e.target='ally',e=>e.duration=6,e=>e.fieldCount=5,e=>e.spacing=4,e=>e.fieldLayout='single',e=>e.range=18];
for(const change of malformed){const f=fixture(),e=f.start();change(e);f.reject(e);f.apply(f.start());}
{
 const f=fixture(),{s,h,ally,enemy,apply,reject,start,end,speed,slow}=f;
 reject(speed());reject(slow());const sent=start();apply(sent);sent.centers.forEach(c=>c.x=9000);sent.direction.x=99;sent.origin.x=999;
 for(const extra of [{deploymentId:0},{deploymentId:2},{zoneIndex:-1},{zoneIndex:6},{zoneIndex:1.5},{zoneIndex:undefined},{origin:p(1)},{origin:p(0,1)},{origin:undefined},{target:'missing'},{source:'missing'},{speedMultiplier:2},{speedDuration:1},{speedMaxApplicationsPerTarget:21},{slow:.5},{baseDamage:1},{duration:6}])reject({...speed(),...extra});
 reject(speed(1,enemy));reject(slow(1,ally));reject({...slow(),slowDuration:1});reject({...slow(),ability:'widemargin',slow:0,duration:2.5});
 const structure=s.structures.find(x=>x.team==='carbon');reject(speed(1,structure));reject(slow(1,structure));
 // Both overlap indices are physically valid, but share ONE per-target component budget.
 for(let i=0;i<20;i++){const index=i%2;apply(speed(1,ally,index));apply(slow(1,enemy,index));}reject(speed(1,ally,1));reject(slow(1,enemy,1));near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(enemy.id).moveSpeed,6);apply(speed(1,h));
 assert.ok(s.moveHero(h.id,p(100)).ok);apply(end(1));near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(enemy.id).moveSpeed,6);f.ticks(10);near(s.stats(ally.id).moveSpeed,8);near(s.stats(enemy.id).moveSpeed,8);
}
{
 const f=fixture(),{s,h,ally,enemy,apply,reject,start,end,speed,slow}=f;const geometry=f.geometry();apply(start());
 Object.assign(f.kit.abilities.find(a=>a.id===route.id),{radius:999,duration:999,speedMultiplier:9,slow:.9,speedMaxApplicationsPerTarget:999});
 assert.ok(s.moveHero(h.id,p(100)).ok);apply(speed(1,ally,0,geometry.centers[0]));apply(slow(1,enemy,0,geometry.centers[0]));reject(speed(1,h,0,geometry.centers[0]));
 assert.ok(s.moveHero(ally.id,p(3.000001,0,3)).ok);reject(speed(1,ally,0,geometry.centers[0]));assert.ok(s.moveHero(ally.id,p(3)).ok);apply(speed(1,ally,0,geometry.centers[0]));
 const fresh=f.geometry();apply(start(2,fresh));assert.deepEqual(s.applyHeroEffect(end(1)),{ok:true,ended:false});assert.ok(s.moveHero(ally.id,p(101)).ok);apply(speed(2,ally,0,fresh.centers[0]));reject(speed(1,ally,0,geometry.centers[0]));apply(end(2));reject(start(2,fresh));apply(start(3,fresh));
}
{
 const f=fixture(),{s,ally,enemy,apply,reject,start,speed,slow,ticks}=f;apply(start());for(let i=0;i<20;i++){if(i)ticks(5);apply(speed());apply(slow());}near(s.time,34.75);ticks(5);reject(speed());reject(slow());near(s.stats(ally.id).moveSpeed,10.8);near(s.stats(enemy.id).moveSpeed,6);ticks(4);near(s.stats(enemy.id).moveSpeed,6);ticks(1);near(s.stats(ally.id).moveSpeed,8);near(s.stats(enemy.id).moveSpeed,8);
}
{
 const f=fixture(),{s,h,enemy,ally,apply,reject,start,end,speed,slow}=f;apply(start());apply(speed());apply(slow());assert.ok(s.damage(h.id,1e6,enemy.id,{kind:'ability'}).killed);reject(speed());reject(slow());assert.deepEqual(s.applyHeroEffect(end(1)),{ok:true,ended:false});near(s.stats(ally.id).moveSpeed,10.8);f.ticks(10);near(s.stats(ally.id).moveSpeed,8);
}
await loadCharacter(native.id);
{
 const f=fixture(),{s,h,enemy,apply,reject,start,slow}=f;assert.ok(s.configureHeroKit(enemy.id,native).ok);const scene=new THREE.Scene(),controller=new PlayerController({position:enemy.position,boxes:[]}),runtime=new HeroRuntime({scene,controller,kit:native,source:enemy.id,team:'ivory',onEffect:e=>s.applyHeroEffect(e)});assert.ok(runtime.cast(4));assert.equal(s.stats(enemy.id).invulnerable,true);apply(start());reject(slow());runtime.reset();apply(slow());near(s.stats(enemy.id).moveSpeed,6);runtime.dispose();assert.equal(scene.children.length,0);
}
// Real NPC consumers: source leaves before ticking so hostile NPCs keep walking.
{
 const f=fixture(),{s,h,apply,start,speed,slow,ticks}=f;let id=0;
 for(const [team,boost]of [['carbon',.54],['ivory',.3]]){const t=s.troopers.find(t=>t.alive&&t.team===team);let before=t.distanceMarched;ticks(1);near(t.distanceMarched-before,.4);assert.ok(s.moveHero(h.id,t.position).ok);const g=f.geometry();apply(start(++id,g));apply(team==='carbon'?speed(id,t,0,g.centers[0]):slow(id,t,0,g.centers[0]));assert.ok(s.moveHero(h.id,p()).ok);before=t.distanceMarched;ticks(1);near(t.distanceMarched-before,boost);ticks(8);before=t.distanceMarched;ticks(1);near(t.distanceMarched-before,.4);}
}
console.log(`PASS Unprinted Passage Host: six immutable centers/unit heading/current-feet start, 15m route/16m center range, union-wide20 speed+slow caps, source100m away, per-component .5 tails/5s expiry, stale IDs/death cleanup, immutable profile/start copies, actual Overtime immunity, NPC .4->.54/.3->.4 consumers; ${rejects} transactional protocol rejections with valid retries. CPU protocol only, no floor/LOS/native/art/identity/cadence claim.`);
