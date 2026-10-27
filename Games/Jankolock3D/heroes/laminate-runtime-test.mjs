// Supplied Laminate model + actual Host/controllers. CPU/API, not native/art proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {laminateSlice,LAMINATED_SPRINT} from './laminate-slice.mjs';
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[1];
const raw=JSON.parse(readFileSync(new URL('../../../docs/jank40/kit-review.json',import.meta.url))).heroes.find(h=>h.id==='laminate').proposedKit;
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`),point=(x=0,y=0,z=0)=>({x,y,z});
assert.equal(laminateSlice.health,740);assert.equal(laminateSlice.accent,'#3f7f6f');assert.deepEqual(laminateSlice.weapon,raw.weapon);assert.deepEqual(laminateSlice.melee,raw.melee);
await loadCharacter('laminate');await loadCharacter(native.id);
function fixture({kit=laminateSlice,items=[]}={}) {
  const s=createSystems();s.step(30);
  // Public imported-currency fixture only, not played economy/level progression.
  const imported=items.length?12800:0,h=s.addHero({id:'source',team:'carbon',position:items.length?s.bases.carbon:point(0,0,8),souls:imported,earnedSouls:imported}),local=structuredClone(kit);
  assert.ok(s.configureHeroKit(h.id,local,kit.partialSlice?{partialSlice:true}:undefined).ok);
  for(const item of items)assert.ok(s.buyItem(h.id,item).ok);assert.ok(s.moveHero(h.id,point(0,0,8)).ok);
  const ally=s.addHero({id:'ally',team:'carbon',position:point(2,0,8)}),scene=new THREE.Scene(),boxes=[],events=[],results=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0});
  const r=new HeroRuntime({scene,controller:c,kit:local,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);return result;}});
  const guards=[0,1].map(i=>{
    const hero=s.addHero({id:`enemy${i}`,team:'ivory',position:point(.55,0,0)});assert.ok(s.configureHeroKit(hero.id,native).ok);
    const controller=new PlayerController({position:hero.position,boxes,floorHeight:()=>0});controller.yaw=Math.PI;const outcomes=[];
    const runtime=new HeroRuntime({scene,controller,kit:native,source:hero.id,team:'ivory',onEffect:event=>{const result=s.applyHeroEffect(event);outcomes.push(result);return result;}});runtime.targets=[h];return {hero,controller,runtime,outcomes};
  });
  const enemy=guards[0].hero;r.targets=[enemy];
  const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input&&h.alive){c.speedMultiplier=s.stats(h.id).moveSpeed/8;c.update(.05,input);assert.ok(s.moveHero(h.id,c.position).ok);}r.update(.05);for(const g of guards)g.runtime.update(.05);};
  const state=()=>JSON.stringify({snapshot:r.snapshot(),heroes:s.heroes,host:s.events,events,results,position:c.position,velocity:c.velocity,fx:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const dispose=()=>{r.dispose();for(const g of guards)g.runtime.dispose();assert.equal(scene.children.length,0);};
  return {s,h,ally,c,r,enemy,guards,scene,boxes,events,results,step,state,dispose};
}
// Slot 1 actual admission/birth; physical own-wall interception lives in sheen-wall-test.mjs.
{
  const f=fixture(),{r,s,c,h}=f;c.yaw=Math.PI/2;const hp=h.hp,ammo=r.ammo;assert.ok(r.cast(1));for(let i=0;i<4;i++){f.step();assert.equal(s.wallPanels().length,0);}f.step();assert.equal(s.wallPanels().length,1);assert.equal(s.wallPanels()[0].hp,650);assert.equal(r.projectiles.length,3);assert.equal(s.stats(h.id).invulnerable,false);assert.equal(h.hp,hp);assert.equal(r.ammo,ammo);f.dispose();assert.equal(s.wallPanels().length,0);
}
{
  const f=fixture(),{r,s,h,enemy,results}=f;assert.equal(h.maxHp,740);assert.equal(h.hp,740);let hp=enemy.hp;
  assert.ok(r.fire());near(hp-enemy.hp,18*(1-s.stats(enemy.id).armor));assert.ok(results[0].ok);assert.equal(r.ammo,13);near(r.fireWait,.35);
  assert.equal(r.fire(),false);for(let i=0;i<6;i++)f.step();assert.equal(r.fire(),false);f.step();f.step();assert.ok(r.fire());assert.equal(r.ammo,12);
  r.startReload();near(r.reload,1.5);assert.equal(r.fire(),false);for(let i=0;i<31;i++)f.step();assert.equal(r.ammo,14);assert.equal(r.reload,0);f.dispose();
}
{
  const f=fixture(),{r,s,c,enemy,events}=f;c.pitch=Math.atan2(.3,8);const hp=enemy.hp;assert.ok(r.fire());assert.equal(events[0].headshot,true);near(hp-enemy.hp,18*1.3*(1-s.stats(enemy.id).armor));f.dispose();
}
for(const mode of ['cover','range']) {
  const f=fixture(),{r,s,enemy,boxes}=f;if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:3,maxZ:4});else assert.ok(s.moveHero(enemy.id,point(.55,0,-11)).ok);
  const hp=enemy.hp;assert.ok(r.fire());assert.equal(enemy.hp,hp);assert.equal(r.ammo,13);assert.equal(f.events.length,0);f.dispose();
}
for(const mode of ['hit','range','cover']) {
  const f=fixture(),{r,s,h,c,enemy,boxes,events}=f;c.warp(point());assert.ok(s.moveHero(h.id,point()).ok);assert.ok(s.moveHero(enemy.id,point(0,0,mode==='range'?-3.01:-3)).ok);
  if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:-2,maxZ:-1});const hp=enemy.hp,ammo=r.ammo;
  assert.ok(r.melee());near(r.meleeWait,1.2);assert.equal(r.ammo,ammo);
  if(mode==='hit'){near(hp-enemy.hp,62*(1-s.stats(enemy.id).armor));assert.equal(events[0].ability,'Corner Clip');assert.equal(events[0].damageType,'weapon');assert.equal(s.events.filter(e=>e.type==='damage').at(-1).kind,'projectile');}
  else{assert.equal(enemy.hp,hp);assert.equal(events.length,0);}
  const before=f.state();assert.equal(r.melee(),false);assert.equal(f.state(),before);for(let i=0;i<23;i++)f.step();assert.equal(r.melee(),false);f.step();assert.ok(r.melee());f.dispose();
}
for(const kit of [laminateSlice,native]) {
  const f=fixture({kit}),{r,s,enemy,guards,results}=f;assert.ok(s.moveHero(enemy.id,point(0,0,6)).ok);assert.ok(guards[0].runtime.parry());const hp=enemy.hp;assert.ok(r.melee());
  if(kit===laminateSlice){assert.ok(results[0].ok);near(hp-enemy.hp,55.8);}else{assert.equal(results[0].ok,false);assert.equal(results[0].reason,'parried');assert.equal(enemy.hp,hp);}f.dispose();
}
{
  const f=fixture({items:['glass-cannon','armor-pierce']}),{r,s,h,enemy}=f;assert.equal(h.level,20);assert.equal(h.earnedSouls,12800);assert.ok(s.moveHero(enemy.id,point(0,0,6)).ok);
  const hp=enemy.hp,stats=s.stats(h.id);assert.ok(r.melee());near(hp-enemy.hp,62*stats.damageMultiplier*(1-s.stats(enemy.id).armor*(1-stats.armorPierce)));assert.equal(r.ammo,14);f.dispose();
}
console.log('PASS Laminate real model/Host: literal 740 HP, Gloss 18/range18/.35/mag14/reload1.5/head1.3, cover/range, Corner 62/3m/1.2 weapon armor/no ammo, native parry distinction and actual purchased-item scaling (imported-currency fixture)');
{
  const f=fixture(),{r,s,h,ally,c,guards,events}=f,[first,second]=guards,ammo=r.ammo,position=c.position.clone(),cloak=h.cloakUntil;
  const aim=r.aimHit;r.aimHit=()=>assert.fail('unsupported/self/pending cast cannot aim');for(const slot of [0]){const before=f.state();assert.equal(r.cast(slot),false);assert.equal(f.state(),before);} // Slots2/4 have stronger real activation/lifecycle checks in approved-only-test.mjs and permanent-record-test.mjs.
  assert.ok(r.cast(3));near(r.pendingCast.left,.1);near(r.cooldowns[3],8);assert.equal(r.castCount.laminatedsprint,1);const before=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),before);r.aimHit=aim;
  let hp=h.hp;assert.ok(first.runtime.fire());assert.ok(h.hp<hp);f.step();assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);
  f.step();near(r.buffs.laminatedsprint.left,4);near(s.stats(h.id).moveSpeed,11.2);near(c.speedMultiplier,1.4);assert.ok(s.stats(h.id).invulnerable);assert.ok(c.position.equals(position));
  const start=events.find(e=>e.kind==='buff');assert.equal(start.duration,4);assert.equal(start.invulnerabilityDuration,.25);assert.equal(start.invulnerable,true);
  hp=h.hp;assert.ok(second.runtime.fire());assert.equal(second.outcomes.at(-1).reason,'invulnerable');assert.equal(h.hp,hp);
  const allyHP=ally.hp;assert.ok(s.damage(ally.id,20,first.hero.id,{kind:'projectile'}).ok);assert.ok(ally.hp<allyHP);assert.equal(s.stats(ally.id).invulnerable,false);near(s.stats(ally.id).moveSpeed,8);
  for(let i=0;i<4;i++)f.step();assert.ok(s.stats(h.id).invulnerable);assert.ok(first.runtime.fire());assert.equal(first.outcomes.at(-1).reason,'invulnerable');assert.equal(h.hp,hp);
  f.step();assert.equal(s.stats(h.id).invulnerable,false);near(r.buffs.laminatedsprint.left,3.75);near(s.stats(h.id).moveSpeed,11.2);assert.ok(second.runtime.fire());assert.ok(second.outcomes.at(-1).ok);assert.ok(h.hp<hp);
  const injured=h.hp;for(let i=5;i<79;i++)f.step();near(r.buffs.laminatedsprint.left,.05);near(s.stats(h.id).moveSpeed,11.2);f.step();assert.equal(r.buffs.laminatedsprint,undefined);near(s.stats(h.id).moveSpeed,8);near(c.speedMultiplier,1);
  assert.equal(h.hp,injured);assert.equal(r.ammo,ammo);assert.equal(h.cloakUntil,cloak);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);assert.deepEqual(events.map(e=>e.kind),['buff','buff-end']);f.dispose();
}
for(const wall of [false,true]) {
  const f=fixture(),{r,s,h,c,boxes}=f;if(wall)boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:4,maxZ:5});assert.ok(r.cast(3));f.step();f.step();
  for(let i=0;i<30;i++)f.step({forward:1});near(s.stats(h.id).moveSpeed,11.2);assert.ok(c.position.z<8);
  if(wall){assert.ok(c.position.z>=5.45-1e-6);near(c.position.y,0);}else assert.ok(c.velocity.length()>8&&c.velocity.length()<=11.2+1e-8);
  f.dispose();
}
{
  const f=fixture(),{r,s,enemy,guards}=f;assert.ok(s.moveHero(enemy.id,point(0,0,6)).ok);guards[0].controller.warp(enemy.position);assert.ok(r.cast(3));const pending=r.pendingCast,hp=enemy.hp;assert.ok(r.fire());assert.ok(r.melee());assert.equal(r.pendingCast,pending);assert.ok(enemy.hp<hp);f.step();f.step();assert.ok(r.buffs.laminatedsprint);f.dispose();
}
for(const when of ['pending','active'])for(const mode of ['reset','death','dispose']) {
  const f=fixture(),{r,s,h,guards}=f;assert.ok(r.cast(3));f.step();if(when==='active')f.step();
  if(mode==='death'){if(when==='active')for(let i=0;i<6;i++)f.step();assert.ok(s.damage(h.id,1e6,guards[0].hero.id,{kind:'ability'}).killed);r.reset();}else r[mode]();
  assert.equal(r.pendingCast,null);assert.equal(r.buffs.laminatedsprint,undefined);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);f.dispose();
}
for(const mode of ['reset','dispose','recast']) {
  const f=fixture(),{r,s,h}=f,real=r.onEffect;let entered=false;r.onEffect=event=>{const result=real(event);if(event.kind==='buff'&&!entered){entered=true;assert.ok(result.ok);assert.ok(r.buffs.laminatedsprint);if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast')assert.ok(r.cast(3));}return result;};
  assert.ok(r.cast(3));f.step();f.step();assert.equal(r.buffs.laminatedsprint,undefined);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);
  if(mode==='recast'){near(r.pendingCast.left,.1);f.step();f.step();assert.ok(r.buffs.laminatedsprint);assert.ok(s.stats(h.id).invulnerable);}f.dispose();
}
{
  const f=fixture(),{r,s,h}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(3));f.step();f.step();const old=r.buffs.laminatedsprint;for(let i=0;i<76;i++)f.step();assert.ok(r.cast(3));f.step();f.step();const fresh=r.buffs.laminatedsprint;assert.notEqual(fresh,old);assert.equal(old.handle.remaining,0);assert.equal(r.removeBuff('laminatedsprint',old),false);
  for(let i=0;i<3;i++)f.step();assert.equal(r.buffs.laminatedsprint,fresh);assert.ok(s.stats(h.id).invulnerable);near(s.stats(h.id).moveSpeed,11.2);f.dispose();
}
for(const primary of [Object.freeze(new Error('Host-first buff')),undefined]) {
  const f=fixture(),{r,s,h}=f,real=r.onEffect;r.onEffect=event=>{const result=real(event);if(event.kind==='buff'){assert.ok(result.ok);throw primary;}return result;};assert.ok(r.cast(3));f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.ok(r.buffs.laminatedsprint);assert.ok(s.stats(h.id).invulnerable);near(s.stats(h.id).moveSpeed,11.2);r.onEffect=real;r.reset();assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);f.dispose();
}
{
  const f=fixture(),{r,s,h}=f,real=r.onEffect,primary=Object.freeze(new Error('cleanup'));assert.ok(r.cast(3));f.step();f.step();r.onEffect=event=>{const result=real(event);if(event.kind==='buff-end')throw primary;return result;};
  assert.throws(()=>r.dispose(),e=>e===primary);assert.equal(r.buffs.laminatedsprint,undefined);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);const before=f.state();assert.equal(r.cast(3),false);assert.equal(r.fire(),false);assert.equal(r.melee(),false);r.update(.05);assert.equal(f.state(),before);r.onEffect=real;r.dispose();f.dispose();
}
{
  const f=fixture(),{r}=f,a=r.kit.abilities[0];r.aimHit=()=>assert.fail('invalid Laminate definition cannot aim');
  for(const key of Object.keys(LAMINATED_SPRINT)){const old=a[key];a[key]=null;const before=f.state();assert.equal(r.cast(3),false,key);assert.equal(f.state(),before);a[key]=old;}
  for(const key of ['id','partialSlice']){const old=r.kit[key];r.kit[key]=null;const before=f.state();assert.equal(r.cast(3),false);assert.equal(f.state(),before);r.kit[key]=old;}
  f.dispose();r.reset();assert.equal(r.cast(3),false);
}
console.log('PASS Laminated Sprint actual Host/native shots: vulnerable windup, .25 protection then 3.75 speed-only/4s exact owner, 11.2 controlled movement and normal wall collision, no ally protection/cloak/heal/ammo gains, unavailable inputs, independent weapon/melee, lifecycle/reentry/refresh/stale owner/primary exceptions/cleanup retry/closed and malformed guards');
console.log('LIMIT: CPU/public placement and normal clocks, no native/render/art/balance or displacement/control-immunity acceptance. Old roster/Odo/Whitespace checks belong to parent batch.');
