// Actual supplied Whitespace model + Host/controller APIs; CPU, not native/art proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {whitespaceSlice,WIDE_MARGIN} from './whitespace-slice.mjs';
const {heroes}=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))),native=heroes[0];
const raw=JSON.parse(readFileSync(new URL('../../../docs/jank40/kit-review.json',import.meta.url))).heroes.find(h=>h.id==='whitespace').proposedKit;
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
assert.deepEqual(whitespaceSlice.weapon,raw.weapon);assert.deepEqual(whitespaceSlice.melee,raw.melee);
assert.equal(whitespaceSlice.health,560);assert.equal(whitespaceSlice.accent,'#6c8589');
assert.equal(WIDE_MARGIN.speedMultiplier,1.55);assert.equal(WIDE_MARGIN.duration,2.5);
await loadCharacter('whitespace');await loadCharacter(native.id);
function fixture(kit=whitespaceSlice) {
  const s=createSystems();s.step(30);
  const h=s.addHero({id:'source',team:'carbon',position:{x:0,y:0,z:8}}),enemy=s.addHero({id:'enemy',team:'ivory',position:{x:.55,y:0,z:0}}),ally=s.addHero({id:'ally',team:'carbon',position:{x:2,y:0,z:8}});
  const local=structuredClone(kit);assert.ok(s.configureHeroKit(h.id,local,kit.partialSlice?{partialSlice:true}:undefined).ok);assert.ok(s.configureHeroKit(enemy.id,native).ok);
  const scene=new THREE.Scene(),boxes=[],events=[],results=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0});
  const r=new HeroRuntime({scene,controller:c,kit:local,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);return result;}});r.targets=[enemy,ally];
  const ec=new PlayerController({position:enemy.position,boxes,floorHeight:()=>0});ec.yaw=Math.PI;
  const guard=new HeroRuntime({scene,controller:ec,kit:native,source:enemy.id,team:'ivory',onEffect:event=>s.applyHeroEffect(event)});guard.targets=[h];
  const step=(moving=false)=>{assert.ok(s.step(.05).ok);if(moving&&h.alive){c.speedMultiplier=s.stats(h.id).moveSpeed/8;c.update(.05,{forward:1});assert.ok(s.moveHero(h.id,c.position).ok);}r.update(.05);guard.update(.05);};
  const state=()=>JSON.stringify({snapshot:r.snapshot(),time:r.time,position:c.position,velocity:c.velocity,heroes:s.heroes,host:s.events,events,results,fx:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const dispose=()=>{r.dispose();guard.dispose();assert.equal(scene.children.length,0);};
  return {s,h,enemy,ally,scene,boxes,c,ec,r,guard,events,results,step,state,dispose};
}
// Formerly held slot 2: isolated real two-panel activation, not an unavailable assertion.
{
  const f=fixture(),{r,s}=f;assert.ok(r.cast(2));near(r.pendingCast.left,.25);near(r.cooldowns[2],11);
  for(let i=0;i<4;i++){f.step();assert.equal(s.wallPanels().length,0);}f.step();assert.equal(s.wallPanels().length,2);assert.ok(s.wallPanels().every(p=>p.hp===280));near(r.deployments[0].left,4);
  for(let i=0;i<80;i++)f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);f.dispose();
}
{
  const f=fixture(),{r,s,enemy,events,results}=f,hp=enemy.hp;assert.ok(r.fire());near(hp-enemy.hp,18*(1-s.stats(enemy.id).armor));assert.ok(results.at(-1).ok);assert.equal(events[0].ability,'Margin Flick');assert.equal(r.ammo,15);near(r.fireWait,.3);
  assert.equal(r.fire(),false);for(let i=0;i<5;i++)f.step();assert.equal(r.fire(),false);f.step();f.step();assert.ok(r.fire());assert.equal(r.ammo,14);
  r.startReload();near(r.reload,1.4);assert.equal(r.fire(),false);for(let i=0;i<29;i++)f.step();assert.equal(r.reload,0);assert.equal(r.ammo,16);f.dispose();
}
{
  const f=fixture(),{r,c,s,enemy,events}=f;c.pitch=Math.atan2(.3,8);const hp=enemy.hp;assert.ok(r.fire());assert.equal(events[0].headshot,true);near(hp-enemy.hp,18*1.4*(1-s.stats(enemy.id).armor));f.dispose();
}
for(const mode of ['cover','range']) {
  const f=fixture(),{r,s,enemy,boxes,events}=f;
  if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:3,maxZ:4});else assert.ok(s.moveHero(enemy.id,{x:.55,y:0,z:-15}).ok);
  const hp=enemy.hp;assert.ok(r.fire());assert.equal(enemy.hp,hp);assert.equal(r.ammo,15);assert.equal(events.length,0);f.dispose();
}
for(const mode of ['hit','range','cover']) {
  const f=fixture(),{r,s,h,c,enemy,boxes,events,results}=f;
  // Center at zero so the exact 2.9 boundary is not 8 - 5.1 rounding above 2.9.
  c.warp({x:0,y:0,z:0});assert.ok(s.moveHero(h.id,c.position).ok);assert.ok(s.moveHero(enemy.id,{x:0,y:0,z:mode==='range'?-2.91:-2.9}).ok);
  if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:-2,maxZ:-1});
  const hp=enemy.hp,ammo=r.ammo;assert.ok(r.melee());assert.equal(r.ammo,ammo);near(r.meleeWait,1);
  if(mode==='hit'){near(hp-enemy.hp,62*(1-s.stats(enemy.id).armor));assert.equal(events[0].ability,'Blank Edge');assert.equal(events[0].damageType,'weapon');assert.ok(results[0].ok);assert.equal(s.events.filter(e=>e.type==='damage').at(-1).kind,'projectile');}
  else {assert.equal(enemy.hp,hp);assert.equal(events.length,0);}
  const before=f.state();assert.equal(r.melee(),false);assert.equal(f.state(),before);f.dispose();
}
for(const kit of [whitespaceSlice,native]) {
  const f=fixture(kit),{r,s,enemy,guard,results}=f;assert.ok(s.moveHero(enemy.id,{x:0,y:0,z:6}).ok);assert.ok(guard.parry());assert.ok(s.stats(enemy.id).parry);
  const hp=enemy.hp;assert.ok(r.melee());if(kit===whitespaceSlice){assert.ok(results[0].ok);near(hp-enemy.hp,55.8);}else {assert.equal(results[0].ok,false);assert.equal(results[0].reason,'parried');assert.equal(enemy.hp,hp);}f.dispose();
}
{
  const f=fixture(),{r,s,h,enemy,guard,ec}=f;assert.ok(s.moveHero(enemy.id,{x:0,y:0,z:6}).ok);ec.warp(enemy.position);
  assert.ok(r.cast(1));const pending=r.pendingCast;assert.ok(r.fire());assert.ok(r.melee());assert.equal(r.pendingCast,pending,'primary/melee remain independent of ability windup');
  f.step();f.step();const hp=h.hp;assert.ok(guard.fire());assert.ok(h.hp<hp,'real enemy weapon still damages active Wide Margin');assert.equal(s.stats(h.id).invulnerable,false);f.dispose();
}
{
  const f=fixture(),{r}=f,ability=r.kit.abilities[0];r.aimHit=()=>assert.fail('malformed Wide Margin must reject before aim');
  for(const key of Object.keys(WIDE_MARGIN)){
    const value=ability[key];ability[key]=null;const before=f.state();assert.equal(r.cast(1),false,key);assert.equal(f.state(),before);ability[key]=value;
  }
  for(const key of ['id','partialSlice']){const value=r.kit[key];r.kit[key]=null;const before=f.state();assert.equal(r.cast(1),false);assert.equal(f.state(),before);r.kit[key]=value;}
  f.dispose();
}
console.log('PASS Whitespace actual model/Host: literal Margin Flick body/head damage, cover/range, magazine/reload/rate rejection; Blank Edge 2.9m/weapon armor/no ammo and real enemy parry bypass versus native melee; independent windup weapon/melee, real damage during speed buff, malformed definition no-cost rejection');
{
  const f=fixture(),{r,s,h,ally,guard,c,events}=f;assert.ok(guard.fire(),'native enemy weapon causes real Host injury');assert.ok(h.hp<h.maxHp);const hp=h.hp,ammo=r.ammo,position=c.position.clone();
  const aim=r.aimHit;r.aimHit=()=>assert.fail('self/unavailable cast must not aim');
  // Slots3/4 have positive lifecycle checks in clean-break-test.mjs and unprinted-passage-test.mjs.
  for(const slot of [0]){const before=f.state();assert.equal(r.cast(slot),false);assert.equal(f.state(),before);}
  assert.ok(r.cast(1));const before=f.state();assert.equal(r.cast(1),false);assert.equal(f.state(),before);r.aimHit=aim;
  near(r.cooldowns[1],6);assert.equal(r.castCount.widemargin,1);assert.ok(c.position.equals(position));f.step();near(s.stats(h.id).moveSpeed,8);assert.equal(r.buffs.widemargin,undefined);
  f.step();near(r.buffs.widemargin.left,2.5);near(s.stats(h.id).moveSpeed,12.4);near(c.speedMultiplier,1.55);near(s.stats(ally.id).moveSpeed,8);assert.equal(s.stats(h.id).invulnerable,false);assert.ok(c.position.equals(position),'no forced movement');
  for(let i=0;i<49;i++)f.step(true);near(r.buffs.widemargin.left,.05);near(s.stats(h.id).moveSpeed,12.4);assert.ok(c.velocity.length()>8&&c.velocity.length()<=12.4+1e-8,'player motion is faster but not double multiplied');
  f.step(true);assert.equal(r.buffs.widemargin,undefined);near(s.stats(h.id).moveSpeed,8);near(c.speedMultiplier,1);assert.equal(h.hp,hp);assert.equal(r.ammo,ammo);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);assert.deepEqual(events.map(e=>e.kind),['buff','buff-end']);f.dispose();
}
for(const when of ['pending','active'])for(const mode of ['reset','death','dispose']) {
  const f=fixture(),{r,s,h,enemy}=f;assert.ok(r.cast(1));f.step();if(when==='active')f.step();
  if(mode==='death'){assert.ok(s.damage(h.id,1e6,enemy.id,{kind:'ability'}).killed);r.reset();}else r[mode]();
  assert.equal(r.pendingCast,null);assert.equal(r.buffs.widemargin,undefined);near(s.stats(h.id).moveSpeed,8);for(let i=0;i<3;i++)f.step();assert.equal(r.buffs.widemargin,undefined);f.dispose();
}
for(const mode of ['reset','dispose']) {
  const f=fixture(),{r,s,h}=f,real=r.onEffect;r.onEffect=event=>{const result=real(event);if(event.kind==='buff'){assert.ok(result.ok);assert.ok(r.buffs.widemargin);r[mode]();}return result;};
  assert.ok(r.cast(1));f.step();f.step();assert.equal(r.buffs.widemargin,undefined);near(s.stats(h.id).moveSpeed,8);assert.deepEqual(f.events.map(e=>e.kind),['buff','buff-end']);f.dispose();
}
{
  const f=fixture(),{r,s,h}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(1));f.step();f.step();const old=r.buffs.widemargin;
  assert.ok(r.cast(1));f.step();f.step();const fresh=r.buffs.widemargin;assert.notEqual(fresh,old);assert.equal(old.handle.remaining,0);assert.equal(r.removeBuff('widemargin',old),false);assert.equal(r.buffs.widemargin,fresh);near(fresh.left,2.5);near(s.stats(h.id).moveSpeed,12.4);f.dispose();
}
for(const primary of [Object.freeze(new Error('Host-first buff callback')),undefined]) {
  const f=fixture(),{r,s,h}=f,real=r.onEffect;r.onEffect=event=>{const result=real(event);if(event.kind==='buff'){assert.ok(result.ok);throw primary;}return result;};
  assert.ok(r.cast(1));f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.ok(r.buffs.widemargin);near(s.stats(h.id).moveSpeed,12.4);r.onEffect=real;r.reset();near(s.stats(h.id).moveSpeed,8);f.dispose();
}
{
  const f=fixture(),{r}=f;r.dispose();const before=f.state();for(const action of [()=>r.cast(1),()=>r.cast(2),()=>r.fire(),()=>r.melee(),()=>r.parry()])assert.equal(action(),false);r.update(.05);r.startReload();assert.equal(f.state(),before);r.reset();assert.equal(r.cast(1),false);f.dispose();
}
console.log('PASS Whitespace Wide Margin: unavailable slots/no-cost/aim-free single pending, .1 windup/6 cooldown, 2.5s self-only 8->12.4->8 and actual player motion, no invulnerability/heal/ammo/currency gain, pending/active death/reset/disposal, Host-first reentry/throw, refresh/stale owner and terminal closure');
console.log('LIMIT: CPU fixtures and public placement/clock APIs; not native input/rendering, exact mesh collision, art or balance acceptance. Full old-roster/Odo regression belongs to parent batch.');
