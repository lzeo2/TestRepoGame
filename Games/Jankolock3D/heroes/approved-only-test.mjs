// CPU controller contract + actual model/Host gameplay APIs; no native/art proof.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {PlayerController} from './player-controller.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {createSystems} from '../systems.mjs';
import {laminateSlice,APPROVED_ONLY} from './laminate-slice.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
const all={forward:1,side:1,sprint:true,jump:true,dash:true,slide:true,yaw:.3,pitch:.4,aim:true};
// Direct boolean assignments here test the new controller API only, not Host grants.
for(const mode of ['walk','dash','slide','hook','jump','mantle']) {
  const boxes=mode==='mantle'?[{minX:-2,maxX:2,minY:0,maxY:1,minZ:5,maxZ:6}]:[];
  const c=new PlayerController({position:point(0,0,8),boxes,floorHeight:()=>0});assert.equal(c.movementStopped,false);
  if(mode==='dash')c.update(.05,{forward:1,dash:true});
  if(mode==='jump')c.update(.05,{jump:true});
  if(mode==='hook'){assert.ok(c.hookTo(point(0,0,0)));c.update(.05);}
  if(['walk','slide'].includes(mode)){for(let i=0;i<20;i++)c.update(.05,{forward:1,sprint:true});if(mode==='slide'){c.update(.05,{forward:1,slide:true});assert.ok(c.infiniteAmmo);}}
  if(mode==='mantle'){for(let i=0;i<40&&!c._mantle;i++)c.update(.05,{forward:1});assert.ok(c._mantle,'normal movement initiates real mantle');}
  const position=c.position.clone(),stamina=c.stamina;c.movementStopped=true;c.update(0,all);
  assert.ok(c.position.equals(position));assert.equal(c.velocity.x,0);assert.equal(c.velocity.z,0);assert.ok(c.velocity.y<=0);assert.equal(c._dashTime,0);assert.equal(c._slideTime,0);assert.equal(c._hook,null);assert.equal(c._mantle,null);assert.equal(c.infiniteAmmo,false);assert.equal(c.stamina,stamina);near(c.yaw,.3);near(c.pitch,.4);assert.ok(c.aiming);
  assert.equal(c.hookTo(point(20,0,0)),false);c.update(NaN,all);assert.ok(c.position.equals(position));
  for(let i=0;i<60;i++)c.update(.05,all);near(c.position.x,position.x);near(c.position.z,position.z);assert.ok(c.position.y<=position.y);near(c.stamina,100);
  c.warp(point(0,0,8));assert.equal(c.movementStopped,true,'trusted warp preserves externally owned stop');const after=c.position.clone();c.update(.05,all);assert.ok(c.position.equals(after));
  c.movementStopped=false;c.update(.05,{});assert.equal(c._hook,null);assert.equal(c._mantle,null);assert.equal(c._dashTime,0);for(let i=0;i<10;i++)c.update(.05,{forward:1});assert.ok(c.position.z<8,'ordinary movement resumes without an old action queue');
}
{
  const c=new PlayerController({position:point(0,5,0),boxes:[{minX:-2,maxX:2,minY:0,maxY:2,minZ:-2,maxZ:2}],floorHeight:()=>0});c.movementStopped=true;
  for(let i=0;i<40;i++)c.update(.05,all);near(c.position.y,2);assert.ok(c.grounded,'stopped airborne actor falls onto real box top');
  const normal=new PlayerController({position:point(),floorHeight:()=>0});normal.speedMultiplier=0;for(let i=0;i<20;i++)normal.update(.05,{forward:1});near(normal.velocity.length(),.8,'legacy .1 multiplier floor remains unchanged');
}
console.log('PASS Approved controller-only: default false, all voluntary actions cancelled/masked including dt0/NaN, aiming retained, no blocked stamina spend/recharge intact, warp preserves flag, air gravity/box collision and legacy .1 speed floor unchanged');
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[1];
await loadCharacter('laminate');await loadCharacter(native.id);
function fixture() {
  const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:point(0,0,8)}),ally=s.addHero({id:'ally',team:'carbon',position:point(2,0,8)}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(.55,0,0)}),kit=structuredClone(laminateSlice);
  assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);assert.ok(s.configureHeroKit(enemy.id,native).ok);
  const scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),events=[],results=[];
  const r=new HeroRuntime({scene,controller:c,kit,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);return result;}});r.targets=[enemy];
  const ec=new PlayerController({position:enemy.position,boxes,floorHeight:()=>0});ec.yaw=Math.PI;const shots=[],guard=new HeroRuntime({scene,controller:ec,kit:native,source:enemy.id,team:'ivory',onEffect:event=>{const result=s.applyHeroEffect(event);shots.push(result);return result;}});guard.targets=[h];
  const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input){const stats=s.stats(h.id);c.movementStopped=stats.movementStopped===true;c.speedMultiplier=stats.moveSpeed/8;c.update(.05,input);assert.ok(s.moveHero(h.id,c.position).ok);}r.update(.05);guard.update(.05);};
  const state=()=>JSON.stringify({runtime:r.snapshot(),heroes:s.heroes,host:s.events,events,results,position:c.position,velocity:c.velocity,stopped:c.movementStopped,fx:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const dispose=()=>{r.dispose();guard.dispose();assert.equal(scene.children.length,0);};return {s,h,ally,enemy,scene,boxes,c,ec,r,guard,shots,events,results,step,state,dispose};
}
{
  // Slot 1 is now a real wall + independent burst, exercised without Approved's clocks.
  const isolated=fixture();isolated.c.yaw=Math.PI/2;assert.ok(isolated.r.cast(1));for(let i=0;i<5;i++)isolated.step();assert.equal(isolated.s.wallPanels().length,1);assert.equal(isolated.s.wallPanels()[0].hp,650);assert.equal(isolated.r.projectiles.length,3);assert.equal(isolated.s.stats(isolated.h.id).invulnerable,false);isolated.dispose();assert.equal(isolated.s.wallPanels().length,0);
  const f=fixture(),{r,s,h,ally,c,guard,shots,events}=f,ammo=r.ammo,cloak=h.cloakUntil;
  const aim=r.aimHit;r.aimHit=()=>assert.fail('self/unavailable/pending inputs must not aim');const before=f.state();assert.equal(r.cast(0),false);assert.equal(f.state(),before);
  assert.ok(r.cast(2));near(r.pendingCast.left,.25);near(r.cooldowns[2],13);assert.equal(r.castCount.approvedonly,1);const pending=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),pending);r.aimHit=aim;
  let hp=h.hp;assert.ok(guard.fire());assert.ok(h.hp<hp);for(let i=0;i<4;i++){f.step();assert.equal(c.movementStopped,false);assert.equal(s.stats(h.id).invulnerable,false);}f.step();
  const owner=r.buffs.approvedonly;near(owner.left,1.5);assert.ok(c.movementStopped);assert.ok(s.stats(h.id).movementStopped);near(s.stats(h.id).moveSpeed,0);assert.ok(s.stats(h.id).invulnerable);
  const start=events.find(e=>e.kind==='buff');assert.equal(start.movementStopped,true);assert.equal(start.slow,1);assert.equal(start.invulnerable,true);assert.equal('invulnerabilityDuration' in start,false);
  hp=h.hp;assert.ok(guard.fire());assert.equal(shots.at(-1).reason,'invulnerable');assert.equal(h.hp,hp);assert.equal(s.stats(ally.id).invulnerable,false);assert.equal(s.stats(ally.id).movementStopped,false);near(s.stats(ally.id).moveSpeed,8);
  const fixed=c.position.clone(),stamina=c.stamina;for(let i=0;i<29;i++){f.step(all);assert.ok(c.position.equals(fixed));assert.equal(c.velocity.x,0);assert.equal(c.velocity.z,0);assert.ok(c.stamina>=stamina);assert.equal(c.hookTo(point(20)),false);}
  near(owner.left,.05);f.step({forward:1});assert.ok(c.position.distanceTo(fixed)>0,'Host expiry before physics restores current movement input at exactly 1.5s');assert.equal(r.buffs.approvedonly,undefined);assert.equal(c.movementStopped,false);assert.equal(s.stats(h.id).movementStopped,false);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);
  assert.equal(h.hp,hp);assert.equal(r.ammo,ammo);assert.equal(h.cloakUntil,cloak);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);assert.deepEqual(events.map(e=>e.kind),['buff','buff-end']);
  f.step({forward:1});assert.ok(c.position.distanceTo(fixed)>0);hp=h.hp;assert.ok(guard.fire());assert.ok(h.hp<hp);f.dispose();
}
{
  const f=fixture(),{r,s,h,enemy,c,ec}=f;assert.ok(s.moveHero(enemy.id,point(0,0,6)).ok);ec.warp(enemy.position);assert.ok(r.cast(2));const pending=r.pendingCast;assert.ok(r.fire());assert.ok(r.melee());assert.equal(r.pendingCast,pending);
  for(let i=0;i<5;i++)f.step();c.update(0,{yaw:.4,pitch:.2,aim:true});near(c.yaw,.4);near(c.pitch,.2);assert.ok(c.aiming);assert.ok(r.parry());
  for(let i=0;i<24;i++)f.step();assert.ok(r.buffs.approvedonly);assert.ok(r.fire(),'weapon usable while stationary');assert.ok(r.melee(),'melee usable while stationary');assert.ok(s.stats(h.id).movementStopped);f.dispose();
}
{
  const f=fixture(),{r,s,h,c}=f;assert.ok(r.cast(3));f.step();f.step();assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();near(s.stats(h.id).moveSpeed,0);const fixed=c.position.clone();
  for(let i=0;i<29;i++)f.step(all);assert.ok(c.position.equals(fixed));f.step({forward:1});assert.ok(c.position.distanceTo(fixed)>0);assert.equal(c.movementStopped,false);assert.ok(r.buffs.laminatedsprint);near(s.stats(h.id).moveSpeed,11.2);for(let i=0;i<15;i++)f.step({forward:1});assert.ok(c.velocity.length()>8&&c.velocity.length()<=11.2+1e-8);f.dispose();
}
{
  const f=fixture(),{r,s,h,c}=f;c.warp(point(0,5,8));assert.ok(s.moveHero(h.id,c.position).ok);assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const start=c.position.clone();for(let i=0;i<20;i++)f.step(all);assert.ok(c.position.y<start.y);near(c.position.x,start.x);near(c.position.z,start.z);assert.ok(c.grounded);assert.ok(s.stats(h.id).movementStopped);f.dispose();
}
{
  const f=fixture(),{r,s,h,c}=f;c.update(.05,{jump:true});assert.ok(c.velocity.y>0);assert.ok(s.moveHero(h.id,c.position).ok);assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step({});
  assert.ok(c.movementStopped);assert.equal(c.velocity.y,0,'real activation cancels outstanding upward jump impulse');const height=c.position.y;f.step(all);assert.ok(c.position.y<height);assert.ok(c.velocity.y<0);f.dispose();
}
{
  const f=fixture(),{r,s,h,c}=f;assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();assert.ok(r.cast(4));for(let i=0;i<12;i++)f.step();
  assert.ok(c.movementStopped);assert.ok(r.removeBuff('approvedonly'));assert.equal(c.movementStopped,false);assert.equal(s.stats(h.id).movementStopped,false);assert.ok(s.stats(h.id).invulnerable,'ending own stop cannot revoke an accepted independent Ward shield');
  for(let i=0;i<6;i++)f.step();assert.equal(s.stats(h.id).invulnerable,false);assert.equal(r.deployments.length,1);f.dispose();
}
for(const when of ['pending','active'])for(const mode of ['reset','death','dispose']) {
  const f=fixture(),{r,s,h,enemy,c}=f;assert.ok(r.cast(2));f.step();if(when==='active')for(let i=0;i<4;i++)f.step();
  if(mode==='death'){if(when==='active')for(let i=0;i<30;i++)f.step();assert.ok(s.damage(h.id,1e6,enemy.id,{kind:'ability'}).killed);r.reset();}else r[mode]();
  assert.equal(r.pendingCast,null);assert.equal(r.buffs.approvedonly,undefined);assert.equal(c.movementStopped,false);assert.equal(s.stats(h.id).movementStopped,false);assert.equal(s.stats(h.id).invulnerable,false);f.dispose();
}
for(const mode of ['reset','dispose','recast']) {
  const f=fixture(),{r,s,h,c}=f,real=r.onEffect;let entered=false;r.onEffect=event=>{const result=real(event);if(event.kind==='buff'&&event.ability==='approvedonly'&&!entered){entered=true;assert.ok(result.ok);assert.ok(c.movementStopped);if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast')assert.ok(r.cast(2));}return result;};
  assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();assert.equal(r.buffs.approvedonly,undefined);assert.equal(c.movementStopped,false);assert.equal(s.stats(h.id).movementStopped,false);
  if(mode==='recast'){near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();assert.ok(c.movementStopped);assert.ok(s.stats(h.id).movementStopped);}f.dispose();
}
{
  const f=fixture(),{r,c}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const old=r.buffs.approvedonly;for(let i=0;i<24;i++)f.step();assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const fresh=r.buffs.approvedonly;assert.notEqual(fresh,old);assert.equal(r.removeBuff('approvedonly',old),false);f.step();f.step();assert.equal(r.buffs.approvedonly,fresh);assert.ok(c.movementStopped);f.dispose();
}
for(const primary of [Object.freeze(new Error('Host-first stop')),undefined]) {
  const f=fixture(),{r,s,h,c}=f,real=r.onEffect;r.onEffect=event=>{const result=real(event);if(event.kind==='buff'){assert.ok(result.ok);throw primary;}return result;};assert.ok(r.cast(2));for(let i=0;i<4;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.ok(r.buffs.approvedonly);assert.ok(c.movementStopped);assert.ok(s.stats(h.id).movementStopped);r.onEffect=real;r.reset();assert.equal(c.movementStopped,false);assert.equal(s.stats(h.id).movementStopped,false);f.dispose();
}
{
  const f=fixture(),{r,s,h,c}=f,real=r.onEffect,error=Object.freeze(new Error('cleanup'));assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();r.onEffect=event=>{const result=real(event);if(event.kind==='buff-end')throw error;return result;};assert.throws(()=>r.dispose(),e=>e===error);assert.equal(c.movementStopped,false);assert.equal(s.stats(h.id).movementStopped,false);const before=f.state();assert.equal(r.cast(2),false);assert.equal(r.fire(),false);r.update(.05);assert.equal(f.state(),before);r.onEffect=real;f.dispose();
}
{
  const f=fixture(),{r}=f,a=r.kit.abilities.find(a=>a.id==='approvedonly');r.aimHit=()=>assert.fail('malformed definition cannot aim');for(const key of Object.keys(APPROVED_ONLY)){const value=a[key];a[key]=null;const before=f.state();assert.equal(r.cast(2),false,key);assert.equal(f.state(),before);a[key]=value;}f.dispose();r.reset();assert.equal(r.cast(2),false);
}
console.log('PASS Approved Only actual Host/model/controller: .25 windup/13 CD/1.5 self protection+100% stop, no .1 creep or blocked-input cost, aiming/fire/melee allowed, boosts cannot bypass and restore, air falls normally, pending/active cleanup/reentry/refresh/primary failures/closed; no HP/heal/cloak gains');
console.log('LIMIT: CPU/public API and controller-flag fixtures, not native input, anti-sync parity, general displacement immunity or Host movement-security proof. Game ride/item bridge is a separate lane.');
