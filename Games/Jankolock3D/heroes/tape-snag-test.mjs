// CPU actual models/Host/controllers. No native/render/network authority claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {cassetteSlice} from './cassette-slice.mjs';
import {TAPE_SNAG as a,isTapeSnag,tapeSnagEligible,tapeSnagClock} from './tape-snag.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
assert.ok(isTapeSnag(a));const indices=new Set();for(let i=0;i<60;i++){const t=tapeSnagClock(i*.05);assert.equal(t.expired,false);indices.add(t.pulseIndex);}assert.deepEqual([...indices],Array.from({length:12},(_,i)=>i));assert.ok(tapeSnagClock(3).expired);
const candidate={id:'enemy',team:'ivory',kind:'hero',alive:true,position:point(13)};assert.ok(tapeSnagEligible(candidate,point(),'carbon',13));assert.ok(tapeSnagEligible({...candidate,position:point(15)},point(),'carbon'));for(const change of [{kind:'structure'},{kind:'orb'},{kind:undefined},{team:'carbon'},{team:undefined},{alive:false,living:true},{living:false},{hidden:true},{position:point(15.001)}])assert.equal(tapeSnagEligible({...candidate,...change},point(),'carbon'),false);
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes;for(const id of ['cassette',native[1].id,native[2].id])await loadCharacter(id);
function fixture({kit=cassetteSlice,cloakItem=false,enemyKit=native[1]}={}) {
  const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:point(0,0,8)}),local=structuredClone(kit);assert.ok(s.configureHeroKit(h.id,local,kit.partialSlice?{partialSlice:true}:undefined).ok);
  // Optional public imported currency buys an actual cloak; not earned progression.
  const enemy=s.addHero({id:'enemy',team:'ivory',position:cloakItem?s.bases.ivory:point(0,0,0),souls:cloakItem?3200:0,earnedSouls:cloakItem?3200:0});assert.ok(s.configureHeroKit(enemy.id,enemyKit,enemyKit.partialSlice?{partialSlice:true}:undefined).ok);if(cloakItem){assert.ok(s.buyItem(enemy.id,'shadow-cloak').ok);assert.ok(s.moveHero(enemy.id,point()).ok);}
  const other=s.addHero({id:'other',team:'ivory',position:point(5,0,0)}),ally=s.addHero({id:'ally',team:'carbon',position:point(2,0,8)}),scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),ec=new PlayerController({position:enemy.position,boxes,floorHeight:()=>0}),events=[],results=[];
  const r=new HeroRuntime({scene,controller:c,kit:local,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);return result;}});
  const refresh=()=>{r.targets=[enemy,other,ally,h].map(e=>({id:e.id,kind:e.kind,team:e.team,position:{...e.position},living:e.alive,alive:e.alive&&(e.team===h.team||!(e.cloakUntil>s.time)),height:1.8,radius:.6}));};refresh();
  const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input&&enemy.alive){ec.speedMultiplier=s.stats(enemy.id).moveSpeed/8;ec.update(.05,input);assert.ok(s.moveHero(enemy.id,ec.position).ok);}refresh();r.update(.05);};
  const state=()=>JSON.stringify({runtime:r.snapshot(),heroes:s.heroes,events,results,position:c.position,velocity:c.velocity,fx:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const dispose=()=>{r.dispose();assert.equal(scene.children.length,0);};return {s,h,enemy,other,ally,c,ec,r,scene,boxes,events,results,refresh,step,state,dispose};
}
for(const mode of ['miss','ally','structure','dead','cover','range']) {
  const f=fixture(),{r,s,enemy,ally,boxes}=f;if(mode==='miss')r.targets=[];if(mode==='ally')r.targets=[ally];if(mode==='structure')r.targets=[{...r.targets[0],kind:'structure'}]; // Negative descriptor, never a positive Host grant.
  if(mode==='dead'){assert.ok(s.damage(enemy.id,1e6,f.h.id,{kind:'ability'}).killed);f.refresh();}if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:3,maxZ:4});if(mode==='range'){assert.ok(s.moveHero(enemy.id,point(0,0,-5.01)).ok);f.refresh();}
  const before=f.state();assert.equal(r.cast(3),false,mode);assert.equal(f.state(),before);f.dispose();
}
{
  const f=fixture(),{r,s,h,enemy,c,events}=f;assert.ok(s.moveHero(enemy.id,point(0,0,-5)).ok);f.refresh();const hp=enemy.hp,sourceHp=h.hp,ammo=r.ammo,cloak=enemy.cloakUntil,position={...enemy.position};assert.ok(r.cast(3));near(r.pendingCast.left,.25);near(r.cooldowns[3],10);assert.equal(r.pendingCast.targetId,enemy.id);assert.equal(r.castCount.tapesnag,1);const before=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),before);
  for(let i=0;i<4;i++){f.step();assert.equal(events.length,0);near(s.stats(enemy.id).moveSpeed,8);}f.step();const link=r.deployments[0];near(link.age,0);near(link.left,3);assert.equal(link.targetId,enemy.id);assert.equal(r.tether,null);assert.deepEqual([...link.ackIndices],[0]);near(s.stats(enemy.id).moveSpeed,5.2);near(s.stats(h.id).moveSpeed,8);assert.equal(events[0].target,null);assert.equal(events[0].linkedTarget,enemy.id);assert.deepEqual(events[0].origin,{x:0,y:0,z:8});
  const beforeHit=f.state();r.hit(r.kit.abilities.find(x=>x.id==='tapesnag'),r.targets[0]);assert.equal(f.state(),beforeHit,'generic hit cannot send unowned slow');
  for(let i=0;i<60;i++)f.step();assert.equal(r.deployments.length,0);assert.equal(link.handle.remaining,0);assert.deepEqual([...link.ackIndices],Array.from({length:12},(_,i)=>i));const statuses=events.filter(e=>e.kind==='status');assert.equal(statuses.length,12);assert.deepEqual(statuses.map(e=>e.pulseIndex),Array.from({length:12},(_,i)=>i));near(s.stats(enemy.id).moveSpeed,5.2);for(let i=0;i<4;i++)f.step();near(s.stats(enemy.id).moveSpeed,5.2);f.step();near(s.stats(enemy.id).moveSpeed,8);assert.equal(enemy.hp,hp);assert.equal(h.hp,sourceHp);assert.equal(enemy.cloakUntil,cloak);assert.equal(r.ammo,ammo);assert.deepEqual(enemy.position,position);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);assert.ok(c.position.equals(new THREE.Vector3(0,0,8)));f.dispose();
}
for(const mode of ['range','cover','removed']) {
  const f=fixture(),{r,s,enemy,other,boxes}=f;assert.ok(r.cast(3));for(let i=0;i<4;i++)f.step();if(mode==='range')assert.ok(s.moveHero(enemy.id,point(0,0,-5.01)).ok);if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:3,maxZ:4});assert.ok(s.moveHero(other.id,point(.55,0,2)).ok);f.refresh();if(mode==='removed')r.targets=r.targets.filter(t=>t.id!==enemy.id);assert.ok(s.step(.05).ok);r.update(.05);
  assert.equal(r.deployments.length,0);assert.equal(f.events.length,0);assert.equal(r.lastPlacementFailure.reason,'Link lost');assert.equal(r.lastPlacementFailure.slot,3);near(r.cooldowns[3],9.75);near(s.stats(other.id).moveSpeed,8);assert.ok(r.cast(2));assert.equal(r.lastPlacementFailure,null);f.dispose();
}
{
  const f=fixture(),{r,s,enemy,other}=f;assert.ok(r.cast(3));const captured=r.targets[0];assert.ok(s.moveHero(enemy.id,point(3,0,0)).ok);assert.ok(s.moveHero(other.id,point(.55,0,0)).ok);for(let i=0;i<5;i++)f.step();assert.notEqual(r.targets[0],captured);assert.equal(r.deployments[0].targetId,enemy.id);near(s.stats(enemy.id).moveSpeed,5.2);near(s.stats(other.id).moveSpeed,8);f.dispose();
}
for(const mode of ['cover','range','source-away','removed','dead','cloak']) {
  const f=fixture({cloakItem:mode==='cloak'}),{r,s,h,enemy,c,boxes}=f;assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const link=r.deployments[0],count=f.events.length,time=s.time;
  if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:3,maxZ:4});if(mode==='range'){assert.ok(s.moveHero(enemy.id,point(0,0,-7)).ok);f.refresh();r.update(0);assert.equal(r.deployments[0],link,'15m exact remains linked');assert.ok(s.moveHero(enemy.id,point(0,0,-7.001)).ok);}if(mode==='source-away'){c.warp(point(100,0,8));assert.ok(s.moveHero(h.id,c.position).ok);}if(mode==='dead')assert.ok(s.damage(enemy.id,1e6,h.id,{kind:'ability'}).killed);if(mode==='cloak')assert.ok(s.activateItem(enemy.id,'shadow-cloak').ok);f.refresh();if(mode==='removed')r.targets=r.targets.filter(t=>t.id!==enemy.id);const cloak=enemy.cloakUntil;r.update(0);
  assert.equal(r.deployments.length,0);assert.equal(s.time,time);assert.equal(f.events.length,count+1);assert.equal(f.events.at(-1).kind,'deployment-end');assert.equal(enemy.cloakUntil,cloak);if(mode!=='dead'){near(s.stats(enemy.id).moveSpeed,5.2);for(let i=0;i<9;i++)f.step();near(s.stats(enemy.id).moveSpeed,5.2);f.step();near(s.stats(enemy.id).moveSpeed,8);}f.dispose();
}
for(const wall of [false,true]) {
  const f=fixture(),{r,s,enemy,ec,boxes}=f;if(wall)boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:-3,maxZ:-2});else ec.yaw=Math.PI;assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();for(let i=0;i<20;i++)f.step({forward:1});assert.equal(r.deployments.length,1);near(s.stats(enemy.id).moveSpeed,5.2);if(wall)assert.ok(ec.position.z>=-1.55-1e-8&&ec.position.z<0);else near(ec.velocity.length(),5.2);f.dispose();
}
{
  const f=fixture(),{r,s,h,enemy,c}=f;c.pitch=-1.2;assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();c.pitch=0;assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();assert.ok(r.buffs.badrewind);assert.deepEqual(r.deployments.map(d=>d.definition.id),['recordedassembly','tapesnag']);near(s.stats(h.id).moveSpeed,12);near(s.stats(enemy.id).moveSpeed,5.2);f.dispose();
}
{
  const f=fixture(),{r,s,enemy}=f;assert.ok(s.moveHero(enemy.id,point(0,0,6)).ok);f.refresh();assert.ok(r.cast(3));const pending=r.pendingCast,hp=enemy.hp;assert.ok(r.fire());assert.ok(r.melee());assert.ok(enemy.hp<hp);assert.equal(r.pendingCast,pending);for(let i=0;i<7;i++)f.step();assert.ok(r.fire(),'primary remains available while linked');for(let i=0;i<14;i++)f.step();assert.ok(r.melee(),'melee remains available while linked');assert.equal(r.deployments[0].definition.id,'tapesnag');f.dispose();
}
{
  const f=fixture({enemyKit:cassetteSlice}),{r,s,enemy,ec,scene}=f;
  const e=new HeroRuntime({scene,controller:ec,kit:cassetteSlice,source:enemy.id,team:'ivory',onEffect:event=>s.applyHeroEffect(event)});assert.ok(e.cast(2));for(let i=0;i<5;i++){f.step();e.update(.05);}assert.ok(r.cast(3));for(let i=0;i<5;i++){f.step();e.update(.05);}const link=r.deployments[0];assert.equal(link.ackIndices.size,0);assert.ok(s.stats(enemy.id).invulnerable);near(s.stats(enemy.id).moveSpeed,12);
  for(let i=0;i<5;i++){f.step();e.update(.05);}assert.equal(link.ackIndices.size,0);for(let i=0;i<5;i++){f.step();e.update(.05);}assert.deepEqual([...link.ackIndices],[2]);assert.equal(s.stats(enemy.id).invulnerable,false);near(s.stats(enemy.id).moveSpeed,7.8);e.dispose();near(s.stats(enemy.id).moveSpeed,5.2);f.dispose();
}
for(const mode of ['reset','dispose','source-death']) {
  const f=fixture(),{r,s,h,enemy}=f;assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();if(mode==='source-death'){assert.ok(s.damage(h.id,1e6,enemy.id,{kind:'ability'}).killed);r.reset();}else r[mode]();assert.equal(r.deployments.length,0);near(s.stats(enemy.id).moveSpeed,5.2);for(let i=0;i<10;i++)f.step();near(s.stats(enemy.id).moveSpeed,8);f.dispose();
}
for(const ack of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const f=fixture(),{r}=f;r.onEffect=event=>{f.events.push(event);return ack;};assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();assert.deepEqual(f.events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.lastPlacementFailure.reason,'Link lost');assert.equal(r.deployments.length,0);f.dispose();
}
for(const mode of ['nack','lost-ack']) {
  const f=fixture(),{r}=f,real=r.onEffect;let attempts=0,accepted=0;r.onEffect=event=>{if(event.kind==='status'){attempts++;if(mode==='nack')return {ok:false};}const result=real(event);if(event.kind==='status'){if(result.ok)accepted++;return undefined;}return result;};assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const link=r.deployments[0];r.update(0);for(let i=0;i<60;i++)f.step();assert.equal(attempts,12);assert.equal(accepted,mode==='nack'?0:12);assert.equal(link.ackIndices.size,0);f.dispose();
}
for(const stage of ['deployment-start','status'])for(const mode of ['reset','dispose','recast']) {
  const f=fixture(),{r,s,enemy}=f,real=r.onEffect;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind===stage&&!entered){entered=true;assert.ok(result.ok);old=r.deployments[0];r.update(0);if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast')assert.ok(r.cast(3));}return result;};assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();assert.equal(r.deployments.length,0);assert.equal(f.events.filter(e=>e.kind==='status').length,stage==='status'?1:0);near(s.stats(enemy.id).moveSpeed,stage==='status'?5.2:8);if(mode==='recast'){near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(r.removeDeployment(old),false);near(fresh.age,0);}f.dispose();
}
{
  const f=fixture(),{r}=f,real=r.onEffect;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind==='status'&&!entered){entered=true;old=r.deployments[0];assert.ok(result.ok);r.reset();assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();return undefined;}return result;};assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const fresh=r.deployments[0];assert.equal(old.ackIndices.size,0);assert.deepEqual([...fresh.ackIndices],[0]);assert.equal(r.removeDeployment(old),false);near(fresh.age,0);f.dispose();
}
for(const stage of ['deployment-start','status'])for(const primary of [Object.freeze(new Error('primary')),undefined]) {
  const f=fixture(),{r,s,enemy}=f,real=r.onEffect,secondary=Symbol('cleanup');let owner;r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind===stage){owner=r.deployments[0];throw primary;}if(event.kind==='deployment-end')throw secondary;return result;};assert.ok(r.cast(3));for(let i=0;i<4;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(owner.ackIndices.size,0);assert.equal(r.deployments.length,0);near(s.stats(enemy.id).moveSpeed,stage==='status'?5.2:8);r.onEffect=real;f.dispose();
}
{
  const f=fixture(),{r}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const old=r.deployments[0];assert.ok(r.cast(3));const emit=r.fx.emit,error=Object.freeze(new Error('factory'));r.fx.emit=function(kind,...args){if(kind==='tether')throw error;return emit.call(this,kind,...args);};for(let i=0;i<4;i++)f.step();assert.throws(()=>f.step(),e=>e===error);assert.equal(r.deployments[0],old);assert.ok(old.left>0);r.fx.emit=emit;f.dispose();
}
{
  const f=fixture(),{r}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const old=r.deployments[0];assert.ok(r.cast(3));for(let i=0;i<5;i++)f.step();const fresh=r.deployments[0];assert.notEqual(fresh,old);assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(r.removeDeployment(old),false);near(fresh.age,0);f.dispose();
}
{
  const f=fixture({kit:native[2]}),{r,s,enemy}=f;const hp=enemy.hp;assert.ok(r.cast(2));assert.ok(r.tether);assert.equal(r.deployments.length,0);assert.ok(enemy.hp<hp,'native classic tether still damages immediately');near(s.stats(enemy.id).moveSpeed,4);r.reset();near(s.stats(enemy.id).moveSpeed,8,'native tether-end still clears its own slow immediately');f.dispose();
}
{
  const f=fixture(),{r}=f,definition=r.kit.abilities.find(x=>x.id==='tapesnag');r.aimHit=()=>assert.fail('invalid definition before aim');for(const key of Object.keys(a)){const value=definition[key];definition[key]=null;const before=f.state();assert.equal(r.cast(3),false,key);assert.equal(f.state(),before);definition[key]=value;}f.dispose();const before=f.state();assert.equal(r.cast(3),false);r.update(.05);r.reset();assert.equal(f.state(),before);
}
console.log('PASS Tape Snag actual Host/models/controllers: slot3 positive, typed covered capture/no-cost misses, .25 windup/CD10, same-ID resolution/13m fizzle feedback, 15m+cover/hidden/death/removed dt0 breaks, twelve .35 slow samples/3s owner/.5 independent tails, 5.2 motion/walls, Bad+Assembly/native tether isolation, ACK/reentry/refresh/factory/frozen cleanup/closed');
console.log('LIMIT: CPU/public API/scene ownership only; no native input, supplied-art, full-match balance, Host LoS, windup/cadence/network identity security acceptance.');
