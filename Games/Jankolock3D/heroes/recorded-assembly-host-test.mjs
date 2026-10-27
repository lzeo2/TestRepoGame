// Actual Host protocol/API placement, not native casting/floor/LOS/art proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSystems} from '../systems.mjs';
import {cassetteSlice,BAD_REWIND} from './cassette-slice.mjs';
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejects=0;
function fixture(){const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:p()}),ally=s.addHero({id:'ally',team:'carbon',position:p(10)}),enemy=s.addHero({id:'enemy',team:'ivory',position:p(10)}),kit=structuredClone(cassetteSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
 const event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:'recordedassembly',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,damageType:'none',duration:4,...extra});
 const start=(id=1,origin=p(10))=>event('deployment-start',null,{deploymentId:id,origin}),end=id=>event('deployment-end',null,{deploymentId:id}),ward=(index=0,target=ally,id=1,origin=p(10))=>event('ward',target,{deploymentId:id,pulseIndex:index,origin,invulnerabilityDuration:.2}),speed=(index=0,target=ally,id=1,origin=p(10))=>event('speed',target,{deploymentId:id,applicationIndex:index,origin,speedMultiplier:1.2,speedDuration:1});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id))});const reject=e=>{const before=state();assert.equal(s.applyHeroEffect(e).ok,false);assert.deepEqual(state(),before);rejects++;};
 const apply=e=>{const resources=()=>s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]),before=resources(),result=s.applyHeroEffect(e);assert.ok(result.ok,result.reason);assert.deepEqual(resources(),before);return result;},ticks=n=>{for(let i=0;i<n;i++)s.step(.05);};return{s,h,ally,enemy,kit,event,start,end,ward,speed,state,reject,apply,ticks};}
for(const change of [e=>e.deploymentId=0,e=>e.deploymentId=1.5,e=>e.origin=p(10.000001),e=>e.origin.y=NaN,e=>e.origin=Object.assign(Object.create(null),e.origin),e=>e.target='ally',e=>e.duration=5,e=>e.radius=8,e=>e.invulnerabilityDuration=4,e=>e.speedDuration=4,e=>e.wardMaxApplicationsPerTarget=5]){const f=fixture(),e=f.start();change(e);f.reject(e);f.apply(f.start());assert.equal(f.s.stats(f.h.id).invulnerable,false);near(f.s.stats(f.h.id).moveSpeed,8);}
{
 const f=fixture(),{s,h,ally,enemy,start,ward,speed,apply,reject}=f;reject(ward());reject(speed());const sent=start();apply(sent);sent.origin.x=999;reject({...ward(0,h),kind:'buff'});reject(ward(0,h));reject(speed(0,h));
 for(const extra of [{deploymentId:0},{deploymentId:2},{pulseIndex:undefined},{pulseIndex:-1},{pulseIndex:4},{pulseIndex:.5},{pulseIndex:1},{origin:p(9)},{origin:undefined},{target:enemy.id},{target:'missing'},{source:'missing'},{invulnerabilityDuration:1},{duration:.2},{wardMaxApplicationsPerTarget:5},{baseHeal:1}])reject({...ward(),...extra});
 for(const extra of [{applicationIndex:undefined},{applicationIndex:-1},{applicationIndex:16},{applicationIndex:.5},{applicationIndex:1},{pulseIndex:0,applicationIndex:undefined},{target:enemy.id},{speedMultiplier:1.3},{speedDuration:4},{duration:1},{speedMaxApplicationsPerTarget:17}])reject({...speed(),...extra});
 const hp=ally.hp;apply(ward());apply(speed());assert.equal(s.damage(ally.id,10,enemy.id,{kind:'ability'}).reason,'invulnerable');reject(ward());reject(speed());f.ticks(4);assert.equal(s.stats(ally.id).invulnerable,false);near(s.stats(ally.id).moveSpeed,9.6);assert.ok(s.damage(ally.id,10,enemy.id,{kind:'ability'}).ok);near(hp-ally.hp,9,'ordinary damage between beats, no reduction/heal');
}
{
 const f=fixture(),{s,h,ally,apply,reject,ward,speed}=f;f.apply(f.start());Object.assign(f.kit.abilities.find(a=>a.id==='recordedassembly'),{duration:999,radius:999,speedDuration:999,invulnerabilityDuration:999,wardMaxApplicationsPerTarget:99});
 assert.ok(s.moveHero(h.id,p(100)).ok);for(let i=0;i<16;i++){if(i)f.ticks(5);if(i%4===0){apply(ward(i/4));reject(ward(i/4));}apply(speed(i));reject(speed(i));}near(s.time,33.75);assert.equal(s.stats(ally.id).invulnerable,false);near(s.stats(ally.id).moveSpeed,9.6);f.ticks(5);reject(speed(15));reject(ward(3));near(s.stats(ally.id).moveSpeed,9.6);f.ticks(14);near(s.stats(ally.id).moveSpeed,9.6);f.ticks(1);near(s.stats(ally.id).moveSpeed,8);
}
{
 const f=fixture();f.apply(f.start());f.ticks(2);f.reject(f.ward());f.reject(f.speed());f.ticks(2);f.apply(f.speed(1));f.ticks(1);f.reject(f.speed(1,f.h,1,p(10)));assert.ok(f.s.moveHero(f.h.id,p(10)).ok);f.apply(f.speed(1,f.h,1,p(10)));
}
{
 const f=fixture();f.apply(f.start());assert.ok(f.s.moveHero(f.ally.id,p(17.000001)).ok);f.reject(f.ward());f.reject(f.speed());assert.ok(f.s.moveHero(f.ally.id,p(17)).ok);f.apply(f.ward());f.apply(f.speed());
 f.ticks(1);const second=f.s.addHero({id:'second',team:'carbon',position:p(10)});f.apply(f.ward(0,second));f.apply(f.speed(0,second));f.ticks(1);const late=f.s.addHero({id:'late',team:'carbon',position:p(10)});f.reject(f.ward(0,late));f.reject(f.speed(0,late));f.ticks(2);f.apply(f.speed(1,late));f.ticks(15);f.apply(f.ward(1,late));
}
{
 const f=fixture();f.apply(f.start());f.apply(f.ward());f.apply(f.speed());f.apply(f.start(2));assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});f.apply(f.ward(0,f.ally,2));f.apply(f.speed(0,f.ally,2));f.reject(f.ward(0,f.ally,1));f.apply(f.end(2));assert.equal(f.s.stats(f.ally.id).invulnerable,true);near(f.s.stats(f.ally.id).moveSpeed,9.6);f.ticks(4);assert.equal(f.s.stats(f.ally.id).invulnerable,false);f.ticks(16);near(f.s.stats(f.ally.id).moveSpeed,8);f.reject(f.start(2));f.apply(f.start(3));
}
{
 const f=fixture();f.apply(f.start());f.apply(f.ward());f.apply(f.speed());assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);f.reject(f.ward());f.reject(f.speed());assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});assert.equal(f.s.stats(f.ally.id).invulnerable,true);f.ticks(4);assert.equal(f.s.stats(f.ally.id).invulnerable,false);f.ticks(16);near(f.s.stats(f.ally.id).moveSpeed,8);
}
{
 const f=fixture(),structure=f.s.structures.find(x=>x.team==='carbon');assert.ok(f.s.moveHero(f.h.id,structure.position).ok);const origin={...structure.position};f.apply(f.start(1,origin));f.reject(f.ward(0,structure,1,origin));f.reject(f.speed(0,structure,1,origin));
}
// Independent sources do not share index budgets or prematurely erase another status.
{
 const f=fixture(),other=f.s.addHero({id:'other',team:'carbon',position:p()});assert.ok(f.s.configureHeroKit(other.id,cassetteSlice,{partialSlice:true}).ok);f.apply(f.start());f.apply(f.ward());f.apply(f.speed());f.ticks(1);f.apply({...f.start(),source:other.id});f.apply({...f.ward(),source:other.id});f.apply({...f.speed(),source:other.id});f.apply(f.end(1));f.ticks(3);assert.equal(f.s.stats(f.ally.id).invulnerable,true);f.ticks(1);assert.equal(f.s.stats(f.ally.id).invulnerable,false);near(f.s.stats(f.ally.id).moveSpeed,9.6);
}
// Real NPC movement consumer, plus real NPC-source damage protection/unprotected amount.
{
 const f=fixture(),{s,h}=f,t=s.troopers.find(x=>x.alive&&x.team==='carbon');let before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.4);assert.ok(s.moveHero(h.id,t.position).ok);const origin={...t.position};f.apply(f.start(1,origin));f.apply(f.speed(0,t,1,origin));assert.ok(s.moveHero(h.id,p()).ok);before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.48);f.ticks(18);before=t.distanceMarched;f.ticks(1);near(t.distanceMarched-before,.4);
}
{
 const f=fixture(),{s,h,ally}=f,npc=s.troopers.find(x=>x.alive&&x.team==='ivory');assert.ok(s.moveHero(h.id,npc.position).ok);assert.ok(s.moveHero(ally.id,{...npc.position,x:npc.position.x+1}).ok);const origin={...npc.position};f.apply(f.start(1,origin));f.apply(f.ward(0,h,1,origin));f.apply(f.ward(0,ally,1,origin));f.apply(f.speed(0,ally,1,origin));assert.equal(s.damage(ally.id,12,npc.id).reason,'invulnerable');f.ticks(4);const hp=ally.hp;assert.ok(s.damage(ally.id,12,npc.id).ok);near(hp-ally.hp,10.8);near(s.stats(ally.id).moveSpeed,9.6);
}
// Bad Rewind: protocol activation grants two copied clocks, never restores any state.
{
 const f=fixture(),{s,h,ally,enemy}=f,buff={kind:'buff',source:h.id,target:h.id,ability:'badrewind',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,damageType:'none',duration:2,invulnerabilityDuration:.6,invulnerable:true,speedMultiplier:1.5};
 for(const extra of [{target:ally.id},{target:enemy.id},{ability:'Cassette Corner'},{duration:.6},{duration:3},{invulnerabilityDuration:2},{invulnerabilityDuration:.2},{invulnerable:false},{speedMultiplier:1.2},{kind:'status',target:enemy.id},{baseHeal:1},{baseDamage:1}])f.reject({...buff,...extra});
 assert.ok(s.damage(h.id,10,enemy.id,{kind:'ability'}).ok);const hp=h.hp,ammo=h.ammo,position={...h.position},cooldowns={...h.cooldowns};f.apply(buff);near(s.stats(h.id).moveSpeed,12);assert.equal(s.stats(ally.id).invulnerable,false);assert.equal(s.damage(h.id,10,enemy.id,{kind:'ability'}).reason,'invulnerable');Object.assign(f.kit.abilities.find(a=>a.id==='badrewind'),{duration:99,invulnerabilityDuration:99});assert.equal(BAD_REWIND.duration,2);f.ticks(11);assert.equal(s.stats(h.id).invulnerable,true);f.ticks(1);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,12);assert.ok(s.damage(h.id,10,enemy.id,{kind:'ability'}).ok);near(hp-h.hp,9);f.ticks(28);near(s.stats(h.id).moveSpeed,8);assert.equal(h.ammo,ammo);assert.deepEqual(h.position,position);assert.deepEqual(h.cooldowns,cooldowns);
 f.apply(buff);f.apply({...buff,kind:'buff-end'});near(s.stats(h.id).moveSpeed,8);assert.equal(s.stats(h.id).invulnerable,false);
}
// Canonical-grid roundoff, through real configured ward receipts and enemy damage APIs.
for(const birth of [30.7,31.7,32.7,33.7]){const f=fixture();f.s.step(birth-30);near(f.s.time,birth);f.apply(f.start());f.apply(f.ward());f.ticks(3);assert.equal(f.s.stats(f.ally.id).invulnerable,true,`${birth} + .15 stays protected`);assert.equal(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).reason,'invulnerable');f.ticks(1);assert.equal(f.s.stats(f.ally.id).invulnerable,false,`${birth} + .2 expires exactly`);assert.ok(f.s.damage(f.ally.id,10,f.enemy.id,{kind:'ability'}).ok);}
// Synthetic native Overtime duration controls: protocol admission, not a new playable kit.
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes.find(h=>h.abilities.some(a=>a.id==='overtime'));
for(const duration of [.073,1e-12]){const s=createSystems();s.step(30);const h=s.addHero({id:'duration-control',team:'carbon'}),kit=structuredClone(native),a=kit.abilities.find(a=>a.id==='overtime');a.duration=duration;assert.ok(s.configureHeroKit(h.id,kit).ok);assert.ok(s.applyHeroEffect({kind:'buff',source:h.id,target:h.id,ability:a.id,baseDamage:0,baseHeal:0,spiritScale:0,slow:0,damageType:'none',duration,invulnerable:a.invulnerable,speedMultiplier:a.speedMultiplier}).ok);assert.equal(s.stats(h.id).invulnerable,true,'positive subframe grants stay immediately active');s.step(.05);assert.equal(s.stats(h.id).invulnerable,duration===.073);if(duration===.073){s.step(.05);assert.equal(s.stats(h.id).invulnerable,false);}}
console.log(`PASS Cassette expanded Host: four fixed-cue .2 wards + sixteen indexed 1s speeds with +/- .05 phase windows, exact radius7/range10/owner4/lastspeed4.75, source100m/typed recipients/late-entry/duplicates/instances/source-death/end tails and immutable copies; Bad Rewind .6-vs-2 clocks/no state restore, real enemy/NPC full damage and NPC .4->.48->.4; ${rejects} transactional rejections. CPU protocol only, native/art held.`);
