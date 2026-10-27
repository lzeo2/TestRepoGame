// Real Host panel/physics protocol proof. Placement is CPU setup, not native floor/LOS proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSystems} from '../systems.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
import {odometerSlice} from './odometer-slice.mjs';
import {KEEP_CLEAR,keepClearBounds} from './keep-clear.mjs';
const p=(x=0,y=0,z=0)=>({x,y,z}),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);let rejected=0;
function fixture({team='carbon',boxes=[]}={}){const s=createSystems({lanes:[{id:'graft',x:-240},{id:'midway',x:0},{id:'greenhedge',x:240}],boxes});s.step(30);const h=s.addHero({id:'source',team,position:p()}),enemy=s.addHero({id:'enemy',team:team==='carbon'?'ivory':'carbon',position:p(10)}),kit=structuredClone(whitespaceSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
 const event=(kind,extra={})=>({kind,source:h.id,target:null,ability:'keepclear',baseDamage:0,baseHeal:0,spiritScale:0,slow:0,damageType:'none',duration:4,...extra}),start=(id=1,origin=p(),axis='z')=>event('deployment-start',{deploymentId:id,origin,axis}),end=id=>event('deployment-end',{deploymentId:id});
 const state=()=>structuredClone({heroes:s.heroes,troopers:s.troopers,structures:s.structures,events:s.events,stats:s.heroes.map(x=>s.stats(x.id)),panels:s.wallPanels()});const reject=e=>{const before=state();assert.equal(s.applyHeroEffect(e).ok,false);assert.deepEqual(state(),before);rejected++;};const apply=e=>{const before=s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]),r=s.applyHeroEffect(e);assert.ok(r.ok,r.reason);assert.deepEqual(s.heroes.map(x=>[x.hp,x.ammo,x.souls,x.earnedSouls,x.cloakUntil]),before);return r;};return{s,h,enemy,kit,event,start,end,state,reject,apply};}
for(const change of [e=>e.deploymentId=0,e=>e.deploymentId=1.5,e=>e.origin=p(13.000001),e=>e.origin=undefined,e=>e.origin.y=NaN,e=>e.origin=Object.assign(Object.create(null),p()),e=>e.axis='diagonal',e=>delete e.axis,e=>e.target='enemy',e=>e.count=1,e=>e.maxActive=3,e=>e.health=281,e=>e.width=6,e=>e.height=3,e=>e.depth=.4,e=>e.spacing=4,e=>e.duration=5,e=>e.bounds=[],e=>e.panels=[]]){const f=fixture(),e=f.start();change(e);f.reject(e);f.apply(f.start());}
for(const axis of ['x','z']){
 const f=fixture();let reads=0;const origin={get x(){reads++;return reads===1?0:999;},y:0,z:0};f.apply(f.start(1,origin,axis));assert.equal(reads,1);const panels=f.s.wallPanels();assert.equal(panels.length,2);assert.deepEqual(panels.map(x=>x.bounds),keepClearBounds(p(),axis));for(const [i,panel]of panels.entries()){assert.equal(panel.panelIndex,i);assert.equal(panel.hp,280);assert.equal(panel.maxHp,280);assert.equal(panel.alive,true);assert.equal(Object.isFrozen(panel),true);assert.equal(Object.isFrozen(panel.bounds),true);assert.equal(Object.isFrozen(panel.position),true);assert.throws(()=>{panel.hp=999;},TypeError);assert.throws(()=>{panel.bounds.minX=999;},TypeError);}
 Object.assign(f.kit.abilities.find(a=>a.id==='keepclear'),{health:999,duration:999,width:999});f.s.step(3.95);assert.equal(f.s.wallPanels().length,2);f.s.step(.05);assert.equal(f.s.wallPanels().length,0);assert.equal(panels[0].alive,false);assert.equal(panels[1].alive,false);
}
{
 const f=fixture({boxes:[{minX:2.5,maxX:2.8,minY:0,maxY:3,minZ:-2,maxZ:2}]});f.reject(f.start());f.apply(f.start(1,p(0,0,6)));
}
for(const kind of ['hero','structure']){
 const f=fixture();if(kind==='hero'){const blocker=f.s.addHero({id:'blocker',team:'carbon',position:p(2.65)});f.reject(f.start());assert.ok(f.s.moveHero(blocker.id,p(30)).ok);}else{const objective=f.s.structures[0];assert.ok(f.s.moveHero(f.h.id,{...objective.position,x:objective.position.x-2.65}).ok);f.reject(f.start(1,f.h.position));assert.ok(f.s.moveHero(f.h.id,p()).ok);}f.apply(f.start());
}
{
 const f=fixture();f.apply(f.start());const old=f.s.wallPanels();f.reject(f.start(2,p(13.000001)));assert.deepEqual(f.s.wallPanels().map(x=>x.id),old.map(x=>x.id));f.apply(f.start(2));assert.ok(old.every(x=>!x.alive));const current=f.s.wallPanels();assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});assert.ok(current.every(x=>x.alive));f.apply(f.end(2));assert.equal(f.s.wallPanels().length,0);f.reject(f.start(2));f.apply(f.start(3));
}
{
 const f=fixture();f.apply(f.start());const [left,right]=f.s.wallPanels(),resources=f.s.heroes.map(x=>[x.hp,x.souls,x.earnedSouls]);assert.ok(f.s.damage(left.id,30,f.enemy.id,{kind:'ability'}).ok);assert.equal(left.hp,250);assert.equal(right.hp,280);assert.equal(f.s.damage(left.id,10,f.h.id,{kind:'ability'}).ok,false);assert.ok(f.s.damage(left.id,1000,f.enemy.id,{kind:'ability'}).killed);assert.equal(left.alive,false);assert.equal(f.s.wallPanels().length,1);assert.equal(right.hp,280);assert.deepEqual(f.s.heroes.map(x=>[x.hp,x.souls,x.earnedSouls]),resources);assert.equal(f.s.orbs.length,0);assert.equal(f.s.events.some(e=>['hero_death','objective_fall','flex_slot','victory'].includes(e.type)),false);assert.equal(f.s.events.filter(e=>e.type==='panel_destroyed').length,1);
 f.apply(f.end(1));assert.equal(right.alive,false);
}
{
 const f=fixture();f.apply(f.start());
 // Imported currency/derived level are item setup, not played economy progress.
 const rich=f.s.addHero({id:'item-attacker',team:'ivory',souls:8000,earnedSouls:8000});assert.ok(f.s.buyItem(rich.id,'glass-cannon').ok);assert.ok(f.s.buyItem(rich.id,'lifesteal').ok);assert.ok(f.s.moveHero(rich.id,p(4)).ok);assert.ok(f.s.damage(rich.id,20,f.h.id,{kind:'ability'}).ok);const hp=rich.hp,panel=f.s.wallPanels().find(x=>x.position.x>0),damage=10*f.s.stats(rich.id).damageMultiplier;assert.ok(f.s.damage(panel.id,10,rich.id).ok);near(280-panel.hp,damage);assert.equal(rich.hp,hp,'panel damage never grants lifesteal HP');
}
// Friendly rounds stop without own-wall damage; hostile projectiles hit the nearest panel.
{
 const f=fixture();f.apply(f.start());const panel=f.s.wallPanels().find(x=>x.position.x>0),heroHp=f.h.hp,enemyHp=f.enemy.hp,ammo=f.h.ammo;assert.equal(f.s.damage(f.enemy.id,10,f.h.id).ok,false);assert.equal(f.h.ammo,ammo);assert.equal(f.enemy.hp,enemyHp);assert.equal(panel.hp,280);assert.ok(f.s.damage(f.h.id,10,f.enemy.id).ok);assert.equal(f.h.hp,heroHp);assert.equal(panel.hp,270);assert.ok(f.s.damage(panel.id,1000,f.enemy.id,{kind:'ability'}).killed);f.s.step(.3);assert.ok(f.s.damage(f.h.id,10,f.enemy.id).ok);near(heroHp-f.h.hp,9);
}
{
 const f=fixture(),kit=structuredClone(JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[0]);
 // Synthetic native weapon slow payload, protocol-only boundary coverage, not a port/profile.
 Object.assign(kit.weapon,{slow:.4,slowDuration:.5});assert.ok(f.s.configureHeroKit(f.enemy.id,kit).ok);f.apply(f.start());const hp=f.h.hp;const result=f.s.applyHeroEffect({kind:'damage',source:f.enemy.id,target:f.h.id,ability:kit.weapon.id??kit.weapon.name,baseDamage:kit.weapon.baseDamage,baseHeal:0,spiritScale:0,slow:.4,slowDuration:.5,duration:0,damageType:'weapon'});assert.ok(result.ok);assert.ok(result.intercepted);assert.equal(f.h.hp,hp);near(f.s.stats(f.h.id).moveSpeed,8,'intercepted damaging control cannot slow the hero behind the panel');
}
for(const kind of ['trooper','structure']){
 const f=fixture(),attacker=kind==='trooper'?f.s.troopers.find(x=>x.alive&&x.team==='ivory'):f.s.structures.find(x=>x.alive&&x.team==='ivory'&&x.type==='guardian'),origin={...attacker.position,x:attacker.position.x-(kind==='trooper'?4:6)};assert.ok(f.s.moveHero(f.h.id,origin).ok);f.apply(f.start(1,origin,'z'));const panel=f.s.wallPanels().find(x=>x.position.x>origin.x),hp=f.h.hp;assert.ok(f.s.damage(f.h.id,20,attacker.id).ok);assert.equal(f.h.hp,hp);assert.equal(panel.hp,260,'actual NPC/structure projectile reaches panel, not hero behind it');
}
{
 const f=fixture(),t=f.s.troopers.find(x=>x.alive&&x.team==='carbon'),origin={...t.position,x:t.position.x+2.65};assert.ok(f.s.moveHero(f.h.id,origin).ok);f.reject(f.start(1,origin,'z'));assert.ok(f.s.moveHero(f.h.id,p()).ok);f.apply(f.start());
}
// Healing a damaged panel is forbidden even through a genuine registered aura baseline.
{
 const f=fixture();f.apply(f.start());const panel=f.s.wallPanels()[0],kit=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes.find(k=>k.abilities.some(a=>a.id==='aura')),a=kit.abilities.find(a=>a.id==='aura'),healer=f.s.addHero({id:'healer',team:'carbon',position:p()});assert.ok(f.s.configureHeroKit(healer.id,kit).ok);assert.ok(f.s.damage(panel.id,30,f.enemy.id,{kind:'ability'}).ok);const before=f.state();assert.equal(f.s.applyHeroEffect({kind:'heal',source:healer.id,target:panel.id,ability:a.id,baseDamage:0,baseHeal:a.baseHeal,spiritScale:a.spiritScale??0,slow:a.slow??0,duration:a.duration,damageType:a.damageType}).ok,false);assert.deepEqual(f.state(),before);
}
// Actual Odo burst impact must use the thin/long panel AABB, not a hero-sized cube.
{
 const f=fixture();assert.ok(f.s.configureHeroKit(f.enemy.id,odometerSlice,{partialSlice:true}).ok);f.apply(f.start());const panel=f.s.wallPanels().find(x=>x.position.x>0),a=odometerSlice.abilities.find(a=>a.id==='flyingdigits'),base={source:f.enemy.id,ability:a.id,baseDamage:18,baseHeal:0,spiritScale:0,slow:0,duration:.625,damageType:'weapon'},start={...base,kind:'burst-start',target:null,burstId:1,origin:{...f.enemy.position,y:1.25}};assert.ok(f.s.applyHeroEffect(start).ok);const impact={...base,kind:'damage',target:panel.id,burstId:1,projectileIndex:0,origin:p(2.65,1,2.4)};assert.ok(f.s.applyHeroEffect(impact).ok);assert.equal(panel.hp,262);const before=f.state();assert.equal(f.s.applyHeroEffect({...impact,projectileIndex:1,origin:p(3.2,1,0)}).ok,false);assert.deepEqual(f.state(),before);assert.ok(f.s.applyHeroEffect({...impact,projectileIndex:1}).ok);assert.equal(panel.hp,244);assert.equal(f.s.applyHeroEffect({...impact,projectileIndex:2}).ok,false);
}
for(const team of ['carbon','ivory']){
 const f=fixture({team}),t=f.s.troopers.find(t=>t.alive&&t.team===team&&t.lane==='midway'),direction=Math.sign(t.path[t.waypoint].z-t.position.z),origin={...t.position,z:t.position.z+direction*3.65};assert.ok(f.s.moveHero(f.h.id,origin).ok);f.apply(f.start(1,origin,'x'));f.s.step(.05);const before={position:{...t.position},distance:t.distanceMarched,waypoint:t.waypoint};f.s.step(.05);assert.deepEqual({position:t.position,distance:t.distanceMarched,waypoint:t.waypoint},before,'swept thin panel blocks without advancing either team');f.s.step(4);assert.equal(f.s.wallPanels().length,0);assert.ok(t.distanceMarched>before.distance,'expiry reopens walking');
}
// Real orb drop + public shot cannot secure/deny through a panel or consume an extra round.
{
 const f=fixture(),t=f.s.troopers.find(t=>t.alive&&t.team==='ivory'),direction=Math.sign(t.path[t.waypoint].z-t.position.z),origin={...t.position};assert.ok(f.s.moveHero(f.h.id,origin).ok);assert.ok(f.s.damage(t.id,1e6,f.h.id,{kind:'ability'}).killed);for(const sibling of f.s.troopers.filter(x=>x.alive&&x.team===t.team&&x.lane===t.lane))assert.ok(f.s.damage(sibling.id,1e6,f.h.id,{kind:'ability'}).killed);const orb=f.s.orbs.find(o=>o.type==='floating'&&o.position.x===origin.x&&o.position.z===origin.z);f.apply(f.start(1,origin,'z'));assert.ok(f.s.moveHero(f.h.id,{...origin,x:origin.x-6}).ok);const before=f.state(),claimed=orb.claimed;assert.equal(f.s.shootOrb(f.h.id,orb.id).ok,false);assert.deepEqual(f.state(),before);assert.equal(orb.claimed,claimed);f.apply(f.end(1));assert.ok(f.s.shootOrb(f.h.id,orb.id).ok);
}
{
 const f=fixture();f.apply(f.start());const old=f.s.wallPanels();assert.ok(f.s.damage(f.h.id,1e6,f.enemy.id,{kind:'ability'}).killed);assert.equal(f.s.wallPanels().length,0);assert.ok(old.every(p=>!p.alive));assert.deepEqual(f.s.applyHeroEffect(f.end(1)),{ok:true,ended:false});
}
{
 const f=fixture();f.apply(f.start());f.s.phase='finished';assert.equal(f.s.wallPanels().length,0);f.apply(f.end(1));assert.equal(f.s.wallPanels().length,0);
}
// Damage range is measured to the physical panel surface, not its distant center.
for(const api of ['public damage','configured weapon']){
 const f=fixture(),native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[0];assert.ok(f.s.configureHeroKit(f.enemy.id,native).ok);f.apply(f.start());const panel=f.s.wallPanels().find(x=>x.position.x>0),range=f.s.stats(f.enemy.id).range;
 const shoot=()=>api==='public damage'?f.s.damage(panel.id,10,f.enemy.id):f.s.applyHeroEffect({kind:'damage',source:f.enemy.id,target:panel.id,ability:native.weapon.id??native.weapon.name,baseDamage:native.weapon.baseDamage,baseHeal:0,spiritScale:0,slow:0,duration:0,damageType:'weapon'});
 assert.ok(f.s.moveHero(f.enemy.id,p(panel.position.x,0,panel.bounds.minZ-range-1e-6)).ok);const before=f.state();assert.equal(shoot().ok,false,`${api}: surface outside literal range must reject`);assert.deepEqual(f.state(),before,'out-of-range rejection spends no ammo/cooldown/HP or ledger state');
 assert.ok(f.s.moveHero(f.enemy.id,p(panel.position.x,0,-(range+1.5))).ok);const centerDistance=Math.hypot(panel.position.x-f.enemy.position.x,panel.position.y-f.enemy.position.y,panel.position.z-f.enemy.position.z),surfaceDistance=panel.bounds.minZ-f.enemy.position.z;assert.ok(centerDistance>range);assert.ok(surfaceDistance<range);const hp=panel.hp;assert.ok(shoot().ok,`${api}: contact inside literal range must hit despite center beyond range`);assert.ok(panel.hp<hp);
 const passiveBefore=f.state();assert.equal(f.s.damage(f.enemy.id,10,panel.id,{kind:'ability'}).ok,false,'passive panels still cannot originate attacks');assert.deepEqual(f.state(),passiveBefore);
}
console.log(`PASS Keep Clear Host: exact two cardinal 5x2.6x.3 panels/5m clear gap/280 independent HP/4s; frozen live query/private state, snapshot/seq/atomic placement and stale/death/expiry cleanup; friendly/hostile projectile interception, panel HP without rewards/heal, actual thin-AABB burst impacts, both-team swept NPC blocking/reopening, real orb cover guard; ${rejected} transactional rejections+retries. CPU protocol/arena AABB proof, not floor/LOS/native/art/full-game acceptance.`);
