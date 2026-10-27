// Actual Host protocol/API placement; Runtime alone enforces reticle, cover and windup.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {cassetteSlice} from './cassette-slice.mjs';
import {TAPE_SNAG} from './tape-snag.mjs';
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejected=0;
function fixture(){const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:p()}),enemy=s.addHero({id:'enemy',team:'ivory',position:p(13)}),other=s.addHero({id:'other',team:'ivory',position:p(12)}),ally=s.addHero({id:'ally',team:'carbon',position:p(1)}),kit=structuredClone(cassetteSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
 const event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:'tapesnag',baseDamage:0,baseHeal:0,spiritScale:0,slow:.35,damageType:'none',duration:3,...extra}),start=(id=1,target=enemy)=>event('deployment-start',null,{deploymentId:id,linkedTarget:target.id,origin:{...h.position}}),end=id=>event('deployment-end',null,{deploymentId:id}),slow=(index=0,target=enemy,id=1)=>event('status',target,{deploymentId:id,pulseIndex:index,origin:{...h.position},slowDuration:.5});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id))});const reject=e=>{const before=state();assert.equal(s.applyHeroEffect(e).ok,false);assert.deepEqual(state(),before);rejected++;};const apply=e=>{const resources=()=>s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]),before=resources(),result=s.applyHeroEffect(e);assert.ok(result.ok,result.reason);assert.deepEqual(resources(),before);return result;};const ticks=n=>{for(let i=0;i<n;i++)s.step(.05);};return{s,h,enemy,other,ally,kit,event,start,end,slow,state,reject,apply,ticks};}
for(const change of [e=>e.deploymentId=0,e=>e.deploymentId=1.5,e=>e.target='enemy',e=>e.origin=p(1),e=>e.origin=undefined,e=>e.origin=Object.assign(Object.create(null),e.origin),e=>e.origin.y=NaN,e=>e.linkedTarget=undefined,e=>e.linkedTarget='missing',e=>e.linkedTarget='ally',e=>e.linkedTarget='source',e=>e.linkedTarget=13,e=>e.duration=4,e=>e.slow=.9,e=>e.linkMaxApplicationsPerTarget=13]){const f=fixture(),e=f.start();change(e);f.reject(e);f.apply(f.start());}
{
 const f=fixture(),{s,h,enemy,other,ally,start,slow,end,apply,reject}=f;reject(slow());assert.ok(s.moveHero(enemy.id,p(13.000001)).ok);reject(start());assert.ok(s.moveHero(enemy.id,p(13)).ok);const sent=start();apply(sent);sent.linkedTarget=other.id;sent.origin.x=999;near(s.stats(enemy.id).moveSpeed,8,'start never grants slow');
 for(const extra of [{deploymentId:undefined},{deploymentId:0},{deploymentId:2},{pulseIndex:undefined},{pulseIndex:-1},{pulseIndex:12},{pulseIndex:.5},{pulseIndex:1},{target:other.id},{target:ally.id},{target:h.id},{target:'missing'},{source:other.id},{team:'ivory'},{origin:p(1)},{origin:undefined},{origin:Object.assign(Object.create(null),p())},{slowDuration:3},{slow:.5},{duration:.5},{baseDamage:1},{baseHeal:1},{spiritScale:1},{damageType:'weapon'},{linkMaxApplicationsPerTarget:13},{applicationIndex:0},{zoneIndex:0},{linkedTarget:other.id},{unexpected:true},{headshot:true}])reject({...slow(),...extra});
 for(const kind of ['buff','damage','heal','speed','reveal','ward','tether-end'])reject({...slow(),kind});
 apply(slow());near(s.stats(enemy.id).moveSpeed,5.2);reject(slow());assert.equal(s.stats(enemy.id).invulnerable,false);near(s.stats(other.id).moveSpeed,8);const hp=enemy.hp;
 for(let i=1;i<12;i++){f.ticks(5);apply(slow(i));reject(slow(i));}near(s.time,32.75);assert.equal(enemy.hp,hp);f.ticks(5);reject(slow(11));reject(slow(12));near(s.stats(enemy.id).moveSpeed,5.2);f.ticks(4);near(s.stats(enemy.id).moveSpeed,5.2);f.ticks(1);near(s.stats(enemy.id).moveSpeed,8);reject(start(1));apply(end(1));
}
{
 const f=fixture();let reads=0;const e=f.start();e.origin={get x(){reads++;return reads===1?0:100;},y:0,z:0};f.apply(e);assert.equal(reads,1);Object.assign(f.kit.abilities.find(a=>a.id==='tapesnag'),{range:999,breakDistance:999,duration:999,slowDuration:999,linkMaxApplicationsPerTarget:999});
 assert.ok(f.s.moveHero(f.enemy.id,p(15.000001)).ok);f.reject(f.slow());assert.ok(f.s.moveHero(f.enemy.id,p(15)).ok);f.apply(f.slow());f.ticks(2);f.reject(f.slow(0,f.other));f.reject(f.slow(1));f.ticks(2);f.apply(f.slow(1));
 assert.ok(f.s.moveHero(f.h.id,p(100)).ok);f.ticks(5);f.reject(f.slow(2));f.reject({...f.slow(2),origin:p()});near(f.s.stats(f.enemy.id).moveSpeed,5.2);f.apply(f.end(1));f.ticks(10);near(f.s.stats(f.enemy.id).moveSpeed,8);
}
{
 const f=fixture();f.apply(f.start());f.apply(f.slow());f.apply(f.start(2,f.other));assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});f.apply(f.slow(0,f.other,2));f.reject(f.slow());f.apply(f.end(2));near(f.s.stats(f.enemy.id).moveSpeed,5.2);near(f.s.stats(f.other.id).moveSpeed,5.2);f.ticks(10);near(f.s.stats(f.enemy.id).moveSpeed,8);near(f.s.stats(f.other.id).moveSpeed,8);f.reject(f.start(2));f.apply(f.start(3));
}
for(const who of ['source','linked-target']){
 const f=fixture();f.apply(f.start());f.apply(f.slow());if(who==='source')assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);else assert.ok(f.s.damage(f.enemy.id,1e6,f.h.id,{kind:'ability'}).killed);f.reject(f.slow());assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});if(who==='source'){near(f.s.stats(f.enemy.id).moveSpeed,5.2);f.ticks(10);near(f.s.stats(f.enemy.id).moveSpeed,8);}else{f.s.step(f.enemy.respawnRemaining);assert.ok(f.s.moveHero(f.enemy.id,p(12)).ok);f.reject(f.slow());}
}
{
 const f=fixture(),structure=f.s.structures.find(x=>x.team==='ivory');assert.ok(f.s.moveHero(f.h.id,structure.position).ok);f.reject(f.start(1,structure));
}
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[0];await loadCharacter(native.id);
{
 const f=fixture();assert.ok(f.s.configureHeroKit(f.enemy.id,native).ok);const scene=new THREE.Scene(),controller=new PlayerController({position:f.enemy.position,boxes:[]}),runtime=new HeroRuntime({scene,controller,kit:native,source:f.enemy.id,team:'ivory',onEffect:e=>f.s.applyHeroEffect(e)});assert.ok(runtime.cast(4));f.apply(f.start());f.reject(f.slow());runtime.reset();f.apply(f.slow());near(f.s.stats(f.enemy.id).moveSpeed,5.2,'immune rejection consumed no index');runtime.dispose();assert.equal(scene.children.length,0);
}
// Real hostile NPC walks under the committed tail after link end and caster departure.
{
 const f=fixture(),t=f.s.troopers.find(t=>t.alive&&t.team==='ivory');let before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.4);assert.ok(f.s.moveHero(f.h.id,t.position).ok);f.apply(f.start(1,t));f.apply(f.slow(0,t));f.apply(f.end(1));assert.ok(f.s.moveHero(f.h.id,p()).ok);before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.26);f.ticks(8);before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.4);
}
{
 const f=fixture(),t=f.s.troopers.find(t=>t.alive&&t.team==='ivory');assert.ok(f.s.moveHero(f.h.id,t.position).ok);f.apply(f.start(1,t));assert.ok(f.s.damage(t.id,1e6,f.h.id,{kind:'ability'}).killed);assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false},'NPC linked-target death revokes anchor');
}
console.log(`PASS Tape Snag Host: exact linked ID/13m admission/15m sustain, twelve phase-bounded indexed samples/3s owner/.5 independent tails, no unowned status/other role or target bypass, mutable profile/start snapshot resistance, immutable index budget and valid retries, hero/NPC target+source death cleanup, actual Overtime immunity and NPC .4->.26->.4; ${rejected} transactional rejections. CPU protocol only: Runtime owns LoS/reticle/windup, no native/art/identity/cadence claim.`);
