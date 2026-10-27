// Real Host receipt/budget tests. CPU API placement, not trajectory/LOS/floor,
// browser/native, network identity, cast-cadence or fresh archive-byte proof.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSystems } from '../systems.mjs';
import { odometerSlice } from './odometer-slice.mjs';
import { flyingDigitDirections } from './flying-digits.mjs';
const review=JSON.parse(readFileSync(new URL('../../../docs/jank40/kit-review.json',import.meta.url)));
const raw=review.heroes.find(h=>h.id==='odometer').proposedKit.abilities.find(a=>a.slot===3),params=raw.effects[0].parameters;
const flying={id:'flyingdigits',name:'Flying Digits',slot:3,cooldown:8,range:25,damageType:'weapon',baseDamage:18,baseHeal:0,spiritScale:0,slow:0,invulnerable:false,windup:.25,projectileCount:4,projectileSpeed:40,projectileRadius:.2,spreadDegrees:28,maxHitsPerTarget:2,fireInterval:0,pattern:'fan',duration:25/40,fx:{color:'#73834e',shape:'four narrow dash projectiles'}};
for(const [field,value] of Object.entries({baseDamage:params.baseDamage,range:raw.range,cooldown:raw.cooldown,windup:raw.cast.windup,projectileCount:params.count,projectileSpeed:params.speed,projectileRadius:params.projectileRadius,spreadDegrees:params.spreadDegrees,maxHitsPerTarget:params.maxHitsPerTarget,fireInterval:params.fireInterval,pattern:params.pattern}))assert.equal(flying[field],value);
const supplied=odometerSlice.abilities.find(a=>a.id==='flyingdigits');
if(supplied)for(const [key,value]of Object.entries(flying))assert.deepEqual(supplied[key],value,key);
// Exact local two-slot profile until the parallel entry lane publishes slot 3.
const kit={...structuredClone(odometerSlice),abilities:[structuredClone(odometerSlice.abilities.find(a=>a.id==='fastlane')),structuredClone(supplied??flying)]};
const natives=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].flatMap(name=>JSON.parse(readFileSync(new URL(`../../../docs/${name}`,import.meta.url))).heroes);
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
let rejections=0;
function fixture(){
 const s=createSystems(),h=s.addHero({id:'odo',team:'carbon',position:point()}),e=s.addHero({id:'enemy',team:'ivory',position:point(0,0,5)}),ally=s.addHero({id:'ally',team:'carbon',position:point(0,0,5)}),input=structuredClone(kit);
 assert.ok(s.configureHeroKit(h.id,input,{partialSlice:true}).ok);s.step(30);
 const definition=input.abilities.find(a=>a.id==='flyingdigits'),launch=point(.55,1.25),impact=()=>point(e.position.x,.9,e.position.z);
 const event=(kind,target=null,extra={})=>({kind,source:h.id,target:target?.id??null,ability:'flyingdigits',baseDamage:18,baseHeal:0,spiritScale:0,slow:0,duration:.625,damageType:'weapon',...extra});
 const start=id=>event('burst-start',null,{burstId:id,origin:{...launch}}),end=id=>event('burst-end',null,{burstId:id}),hit=(id,index,target=e)=>event('damage',target,{burstId:id,projectileIndex:index,origin:impact()});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id))});
 const reject=value=>{const before=state();assert.equal(s.applyHeroEffect(value).ok,false);assert.deepEqual(state(),before);rejections++;};
 return{s,h,e,ally,input,definition,launch,start,end,hit,reject,state};
}
for(const k of natives){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.ok(s.configureHeroKit(h.id,k).ok);}
for(const k of [kit,...review.heroes.map(h=>h.proposedKit)]){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.equal(s.configureHeroKit(h.id,k).ok,false);}
const badFields=[{baseDamage:19},{baseHeal:1},{spiritScale:1},{slow:.1},{invulnerable:true},{damageType:'spirit'},{range:26},{duration:1},{windup:0},{cooldown:7},{projectileCount:3},{projectileSpeed:41},{projectileRadius:.3},{spreadDegrees:27},{maxHitsPerTarget:3},{fireInterval:.1},{pattern:'single'},{headshotMultiplier:2},{speedMultiplier:2}];
for(const change of badFields){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'}),bad=structuredClone(kit);Object.assign(bad.abilities[1],change);const before=structuredClone(h);assert.equal(s.configureHeroKit(h.id,bad,{partialSlice:true}).ok,false);assert.deepEqual(h,before);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);}
for(const abilities of [[],[kit.abilities[0]],[kit.abilities[1]],[kit.abilities[0],kit.abilities[0]],[kit.abilities[0],{...kit.abilities[1],slot:2}],{length:2}]){const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.equal(s.configureHeroKit(h.id,{...kit,abilities},{partialSlice:true}).ok,false);}
{const s=createSystems(),h=s.addHero({id:'h',team:'carbon'});assert.ok(s.configureHeroKit(h.id,{...kit,abilities:[...kit.abilities].reverse()},{partialSlice:true}).ok);}
{
 const f=fixture(),{s,h,e,ally,start,end,hit,reject}=f;reject(hit(1,0));
 for(const extra of [{target:e.id},{origin:undefined},{origin:point(1.500001)},{origin:point(NaN)},{origin:Object.assign(Object.create(null),point())},{team:'ivory'},{baseDamage:19},{projectileCount:5},...[undefined,0,-1,1.5,Infinity,'1',Number.MAX_SAFE_INTEGER+1].map(burstId=>({burstId}))])reject({...start(1),...extra});
 assert.ok(s.applyHeroEffect(start(1)).ok,'invalid starts did not consume ID 1');
 const hp=e.hp,ammo=h.ammo,souls=h.souls;
 for(const extra of [{burstId:undefined},{burstId:2},{projectileIndex:undefined},{projectileIndex:-1},{projectileIndex:4},{projectileIndex:.5},{origin:undefined},{origin:point(0,.9,6)},{origin:point(26,.9,5)},{baseDamage:19},{damageType:'spirit'},{projectileRadius:9},{maxHitsPerTarget:9},{headshot:true,headshotMultiplier:1.4},{target:ally.id},{target:'unknown'},{source:ally.id}])reject({...hit(1,0),...extra});
 f.definition.projectileCount=99;f.definition.maxHitsPerTarget=99;f.definition.range=999;f.definition.duration=999;f.launch.x=9000;
 assert.ok(s.moveHero(h.id,point(100)).ok);assert.ok(s.applyHeroEffect(hit(1,0)).ok);assert.ok(s.applyHeroEffect(hit(1,1)).ok);near(hp-e.hp,2*18*.9);assert.equal(h.ammo,ammo);assert.equal(h.souls,souls);
 reject(hit(1,0));reject(hit(1,2));
 const second=s.addHero({id:'second-enemy',team:'ivory',position:point(0,0,5)});assert.ok(s.applyHeroEffect(hit(1,2,second)).ok);assert.ok(s.applyHeroEffect(hit(1,3,second)).ok);reject(hit(1,3,second));
 assert.ok(s.moveHero(h.id,point()).ok);f.launch.x=.55;assert.ok(s.applyHeroEffect(start(2)).ok);assert.deepEqual(s.applyHeroEffect(end(1)),{ok:true,ended:true});assert.deepEqual(s.applyHeroEffect(end(1)),{ok:true,ended:false});reject(hit(1,0));assert.ok(s.applyHeroEffect(hit(2,0)).ok);
 assert.ok(s.applyHeroEffect(start(3)).ok);assert.ok(s.applyHeroEffect(hit(3,0)).ok,'overlapping IDs own independent budgets');
 assert.deepEqual(s.applyHeroEffect(end(999)),{ok:true,ended:false});assert.ok(s.applyHeroEffect(hit(2,1)).ok,'stale end cannot remove an overlapping receipt');
 for(let i=0;i<14;i++)s.step(.05);reject(hit(3,1));reject(start(3));assert.deepEqual(s.applyHeroEffect(end(3)),{ok:true,ended:false});
}
{
 const f=fixture(),{s,h,e,start,hit,reject}=f;assert.ok(s.configureHeroKit(e.id,natives[0]).ok);assert.ok(s.applyHeroEffect(start(1)).ok);
 // Actual configured native buff API, not a private invulnerability/status write.
 const a=natives[0].abilities.find(a=>a.id==='overtime'),buff={kind:'buff',source:e.id,target:e.id,ability:a.id,baseDamage:a.baseDamage??0,baseHeal:a.baseHeal??0,spiritScale:a.spiritScale??0,slow:a.slow??0,duration:a.duration,damageType:a.damageType};
 assert.ok(s.applyHeroEffect(buff).ok);reject(hit(1,0));assert.ok(s.applyHeroEffect({...buff,kind:'buff-end'}).ok);
 assert.ok(s.applyHeroEffect(hit(1,0)).ok,'immune rejection did not consume index/target count');
 const locked=s.structures.find(x=>x.team==='ivory'&&!x.vulnerable);assert.ok(locked);assert.ok(s.moveHero(h.id,{...locked.position,y:0}).ok);
 const local={...start(2),origin:{...locked.position,y:1.25}};assert.ok(s.applyHeroEffect(local).ok);
 reject({...hit(2,0),target:locked.id,origin:{...locked.position,y:1.25}});
 assert.ok(s.moveHero(e.id,{...locked.position,y:0}).ok);assert.ok(s.applyHeroEffect({...hit(2,0),origin:{...locked.position,y:1.25}}).ok,'objective rejection did not spend index');
}
{
 const f=fixture(),{s,h,e,start,end,hit,reject}=f;assert.ok(s.applyHeroEffect(start(1)).ok);
 assert.ok(s.moveHero(e.id,point(.55,0,25)).ok);assert.ok(s.applyHeroEffect({...hit(1,0),origin:point(.55,1.25,25)}).ok,'exact launch-range boundary');
 reject({...hit(1,1),origin:point(.55,1.25,25.000001)});
 assert.ok(s.moveHero(e.id,point(0,0,5)).ok);assert.ok(s.damage(h.id,1e6,e.id,{kind:'ability'}).killed);reject(hit(1,1));assert.deepEqual(s.applyHeroEffect(end(1)),{ok:true,ended:false});
 s.step(h.respawnRemaining);assert.ok(s.moveHero(h.id,point()).ok);reject(start(1));assert.ok(s.applyHeroEffect(start(2)).ok);assert.ok(s.applyHeroEffect(hit(2,0)).ok);
 s.phase='finished'; // Public inactive-phase fixture, not victory proof.
 reject(start(3));reject(hit(2,1));assert.deepEqual(s.applyHeroEffect(end(2)),{ok:true,ended:true});assert.deepEqual(s.applyHeroEffect(end(2)),{ok:true,ended:false});
}
{
 const f=fixture(),{s,h,e,start,end,hit,reject}=f,other=s.addHero({id:'other-odo',team:'carbon',position:point()});
 assert.ok(s.configureHeroKit(other.id,kit,{partialSlice:true}).ok);
 assert.ok(s.applyHeroEffect(start(1)).ok);assert.ok(s.applyHeroEffect({...start(1),source:other.id}).ok);
 assert.ok(s.applyHeroEffect({...hit(1,0),source:other.id}).ok);assert.ok(s.applyHeroEffect(hit(1,0)).ok,'same numeric ID/index is independent per source');
 assert.deepEqual(s.applyHeroEffect({...end(1),source:other.id}),{ok:true,ended:true});reject({...hit(1,1),source:other.id});assert.ok(s.applyHeroEffect(hit(1,1)).ok);
}
{
 const f=fixture();assert.ok(f.s.applyHeroEffect(f.start(1)).ok);
 for(let i=0;i<13;i++)f.s.step(.05);assert.ok(f.s.applyHeroEffect(f.hit(1,0)).ok,'derived .05 last-segment grace remains live at .65');
 f.s.step(.05);f.reject(f.hit(1,1));f.reject(f.start(1));assert.ok(f.s.applyHeroEffect(f.start(2)).ok,'expiry preserves highest ID but permits next receipt');
}
const fanBoundaryResults=[];
for(const [index,direction] of flyingDigitDirections({x:0,y:0,z:-1}).entries()) {
 const f=fixture();f.launch.z=8;assert.ok(f.s.moveHero(f.h.id,point(0,0,8)).ok);assert.ok(f.s.applyHeroEffect(f.start(1)).ok);
 const at=range=>point(f.launch.x+direction.x*range,f.launch.y+direction.y*range,f.launch.z+direction.z*range),impact=at(25);
 assert.ok(f.s.moveHero(f.e.id,point(impact.x,0,impact.z-.8)).ok);
 f.reject({...f.hit(1,index),origin:at(25.000001)});
 assert.ok(f.s.moveHero(f.e.id,point(impact.x,0,impact.z-.8-.000001)).ok);f.reject({...f.hit(1,index),origin:impact});
 assert.ok(f.s.moveHero(f.e.id,point(impact.x,0,impact.z-.8)).ok);
 const result=f.s.applyHeroEffect({...f.hit(1,index),origin:impact});fanBoundaryResults.push(result);
 if(result.ok){assert.ok(f.s.applyHeroEffect({...f.hit(1,(index+1)%4),origin:impact}).ok,'outside rejections did not consume index/count');f.reject({...f.hit(1,(index+2)%4),origin:impact});}
}
console.log('actual fan endpoint Host receipts:',JSON.stringify(fanBoundaryResults));
assert.deepEqual(fanBoundaryResults.map(result=>result.ok),[true,true,true,true]);
console.log(`Flying Digits Host PASS: exact two-slot opt-in/reversed order; 8 native + 40 raw controls; ${badFields.length} baseline rejection/retries; ${rejections} no-mutation event rejections; immutable launch/payload, 4 indices/2 target HP caps, overlaps/end/expiry/death/monotonic retry, immunity/objective retry and range/AABB envelopes. Receipt proof only, CPU API fixture.`);
