// Supplied Cassette model, actual Host and public controller/combat APIs. CPU only.
// Slot 3 now has actual positive/invalid-target coverage in tape-snag-test.mjs; slot 0 remains invalid input.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {cassetteSlice} from './cassette-slice.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
import {SIDE_A,isSideA,sideAEligible} from './side-a.mjs';
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[1];
const raw=JSON.parse(readFileSync(new URL('../../../docs/jank40/kit-review.json',import.meta.url))).heroes.find(h=>h.id==='cassette').proposedKit;
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`),point=(x=0,y=0,z=0)=>({x,y,z});
assert.equal(cassetteSlice.health,560);assert.equal(cassetteSlice.accent,'#89717e');assert.deepEqual(cassetteSlice.weapon,raw.weapon);assert.deepEqual(cassetteSlice.melee,raw.melee);assert.ok(isSideA(SIDE_A));
const candidate={kind:'hero',team:'carbon',alive:true,position:point(4)};assert.ok(sideAEligible(candidate,point(),'carbon'));for(const change of [{kind:'structure'},{kind:'orb'},{kind:undefined},{team:'ivory'},{alive:false},{position:point(4,.1)}])assert.equal(sideAEligible({...candidate,...change},point(),'carbon'),false);
await loadCharacter('cassette');await loadCharacter(native.id);await loadCharacter('whitespace');
function fixture({kit=cassetteSlice,items=[]}={}) {
  const s=createSystems();s.step(30);
  // Public imported currency is test setup, not earned gameplay progression.
  const imported=items.length?12800:0,h=s.addHero({id:'source',team:'carbon',position:items.length?s.bases.carbon:point(0,0,8),souls:imported,earnedSouls:imported}),local=structuredClone(kit);
  assert.ok(s.configureHeroKit(h.id,local,kit.partialSlice?{partialSlice:true}:undefined).ok);for(const item of items)assert.ok(s.buyItem(h.id,item).ok);assert.ok(s.moveHero(h.id,point(0,0,8)).ok);
  const ally=s.addHero({id:'ally',team:'carbon',position:point(2,0,8)}),scene=new THREE.Scene(),boxes=[],events=[],results=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0});
  const r=new HeroRuntime({scene,controller:c,kit:local,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);return result;}});
  const enemy=s.addHero({id:'enemy',team:'ivory',position:point(.55,0,0)});assert.ok(s.configureHeroKit(enemy.id,native).ok);const ec=new PlayerController({position:enemy.position,boxes,floorHeight:()=>0});ec.yaw=Math.PI;
  const guard=new HeroRuntime({scene,controller:ec,kit:native,source:enemy.id,team:'ivory',onEffect:event=>s.applyHeroEffect(event)});guard.targets=[h];r.targets=[enemy];
  const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input&&h.alive){c.speedMultiplier=s.stats(h.id).moveSpeed/8;c.update(.05,input);assert.ok(s.moveHero(h.id,c.position).ok);}r.update(.05);guard.update(.05);};
  const state=()=>JSON.stringify({runtime:r.snapshot(),heroes:s.heroes,events,results,position:c.position,velocity:c.velocity,fx:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const dispose=()=>{r.dispose();guard.dispose();assert.equal(scene.children.length,0);};return {s,h,ally,enemy,scene,boxes,c,r,guard,events,results,step,state,dispose};
}
{
  const f=fixture(),{r,s,h,enemy}=f;assert.equal(h.hp,560);assert.equal(h.maxHp,560);assert.equal(s.stats(h.id).maxAmmo,15);assert.equal(h.ammo,12,'Host default ammo is not privately refilled');assert.equal(r.ammo,15);const hp=enemy.hp;
  assert.ok(r.fire());near(hp-enemy.hp,18*(1-s.stats(enemy.id).armor));assert.equal(r.ammo,14);near(r.fireWait,.32);assert.equal(r.fire(),false);for(let i=0;i<6;i++)f.step();assert.equal(r.fire(),false);f.step();assert.ok(r.fire());r.startReload();near(r.reload,1.5);assert.equal(r.fire(),false);for(let i=0;i<31;i++)f.step();assert.equal(r.ammo,15);f.dispose();
}
{
  const f=fixture(),{r,s,c,enemy,events}=f;c.pitch=Math.atan2(.3,8);const hp=enemy.hp;assert.ok(r.fire());assert.equal(events[0].headshot,true);near(hp-enemy.hp,18*1.4*(1-s.stats(enemy.id).armor));f.dispose();
}
for(const mode of ['cover','range']) {
  const f=fixture(),{r,s,enemy,boxes}=f;if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:3,maxZ:4});else assert.ok(s.moveHero(enemy.id,point(.55,0,-16)).ok);
  const hp=enemy.hp;assert.ok(r.fire());assert.equal(enemy.hp,hp);assert.equal(r.ammo,14);assert.equal(f.events.length,0);f.dispose();
}
for(const mode of ['hit','range','cover']) {
  const f=fixture(),{r,s,h,c,enemy,boxes,events}=f;c.warp(point());assert.ok(s.moveHero(h.id,point()).ok);assert.ok(s.moveHero(enemy.id,point(0,0,mode==='range'?-2.91:-2.9)).ok);
  if(mode==='cover')boxes.push({minX:-2,maxX:2,minY:0,maxY:3,minZ:-2,maxZ:-1});const hp=enemy.hp,ammo=r.ammo;assert.ok(r.melee());near(r.meleeWait,1);assert.equal(r.ammo,ammo);
  if(mode==='hit'){near(hp-enemy.hp,58*(1-s.stats(enemy.id).armor));assert.equal(events[0].ability,'Cassette Corner');assert.equal(events[0].damageType,'weapon');assert.equal(s.events.filter(e=>e.type==='damage').at(-1).kind,'projectile');}else{assert.equal(enemy.hp,hp);assert.equal(events.length,0);}
  const before=f.state();assert.equal(r.melee(),false);assert.equal(f.state(),before);for(let i=0;i<19;i++)f.step();assert.equal(r.melee(),false);f.step();assert.ok(r.melee());f.dispose();
}
for(const kit of [cassetteSlice,native]) {
  const f=fixture({kit}),{r,s,enemy,guard,results}=f;assert.ok(s.moveHero(enemy.id,point(0,0,6)).ok);assert.ok(guard.parry());const hp=enemy.hp;assert.ok(r.melee());if(kit===cassetteSlice){assert.ok(results[0].ok);near(hp-enemy.hp,52.2);}else{assert.equal(results[0].reason,'parried');assert.equal(enemy.hp,hp);}f.dispose();
}
{
  const f=fixture({items:['glass-cannon','armor-pierce']}),{r,s,h,enemy}=f;assert.equal(h.level,20);assert.equal(h.earnedSouls,12800);assert.ok(s.moveHero(enemy.id,point(0,0,6)).ok);const hp=enemy.hp,stats=s.stats(h.id);assert.ok(r.melee());near(hp-enemy.hp,58*stats.damageMultiplier*(1-s.stats(enemy.id).armor*(1-stats.armorPierce)));assert.equal(r.ammo,15);f.dispose();
}
console.log('PASS Cassette actual model/Host: 560 HP, Tape 18/r23/.32/mag15/reload1.5/head1.4, cover/range, Corner 58/r2.9/cd1 WEAPON/no ammo, native parry distinction, purchased-item scaling (public imported-currency fixture)');
{
  const f=fixture(),{r,s,h,ally,c,events,guard}=f;r.targets=[ally,ally,{...h,position:{...h.position}}];c.pitch=-1.2;assert.ok(guard.fire());assert.ok(h.hp<560);const initial=c.position.clone(),ammo=r.ammo,hp=h.hp,cloak=h.cloakUntil;
  const aim=r.aimHit;r.aimHit=()=>assert.fail('unsupported/pending/initial cast must not aim');for(const slot of [0]){const before=f.state();assert.equal(r.cast(slot),false);assert.equal(f.state(),before);}assert.ok(r.cast(1));near(r.cooldowns[1],6);assert.equal(r.castCount.sidea,1);const before=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),before);r.aimHit=aim;
  for(let i=0;i<4;i++){f.step();assert.equal(events.length,0);near(s.stats(h.id).moveSpeed,8);}f.step();const field=r.deployments[0];near(field.age,0);near(field.left,.25);assert.equal(field.speedTargets.size,2);assert.ok(c.position.equals(initial));near(c.speedMultiplier,1,'Runtime must not double-apply Host speed');near(s.stats(h.id).moveSpeed,10.4);near(s.stats(ally.id).moveSpeed,10.4);
  const marker=field.handle.group.children[0];marker.geometry.computeBoundingBox();near(marker.geometry.boundingBox.max.x*marker.scale.x,4);assert.equal(field.handle.group.children.length,1);
  const fixed=field.position.clone();for(let i=0;i<4;i++){f.step({forward:1});assert.ok(field.position.equals(fixed));assert.equal(r.deployments.length,1);}f.step({forward:1});assert.equal(r.deployments.length,0);assert.equal(field.handle.remaining,0);near(s.stats(h.id).moveSpeed,10.4);
  for(let i=0;i<15;i++)f.step({forward:1});near(c.velocity.length(),10.4);assert.equal(events.filter(e=>e.kind==='speed').length,2);assert.ok(events.filter(e=>e.kind==='speed').every(e=>e.pulseIndex===0));assert.equal(h.hp,hp);assert.equal(h.cloakUntil,cloak);assert.equal(r.ammo,ammo);assert.equal(s.stats(h.id).invulnerable,false);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);
  for(let i=0;i<20;i++)f.step();near(s.stats(h.id).moveSpeed,8);near(s.stats(ally.id).moveSpeed,8);f.dispose();
}
{
  const f=fixture(),{r,s,h,ally,c}=f;assert.ok(s.moveHero(ally.id,point(0,0,0)).ok);r.targets=[ally];assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();const field=r.deployments[0];near(field.position.distanceTo(c.position),8);near(s.stats(h.id).moveSpeed,8);near(c.speedMultiplier,1);near(s.stats(ally.id).moveSpeed,10.4);assert.equal(field.speedTargets.has(h.id),false);
  const center=field.position.clone();c.warp(point(100,0,8));assert.ok(s.moveHero(h.id,c.position).ok);f.step();assert.ok(field.position.equals(center));near(s.stats(ally.id).moveSpeed,10.4);f.dispose();near(s.stats(ally.id).moveSpeed,10.4);
}
{
  const f=fixture(),{r,s,h,ally,c}=f;r.targets=[ally];c.pitch=-1.2;assert.ok(s.moveHero(ally.id,point(20,0,8)).ok);assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();const field=r.deployments[0];assert.ok(s.moveHero(ally.id,field.position).ok);for(let i=0;i<5;i++)f.step();near(s.stats(ally.id).moveSpeed,8);assert.deepEqual([...field.speedTargets],[h.id]);assert.equal(f.events.filter(e=>e.kind==='speed').length,1);f.dispose();
}
{
  const f=fixture(),{r,s,h,ally,c,boxes}=f;boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:4,maxZ:5});r.targets=[ally];c.yaw=Math.PI/2;assert.ok(r.cast(1));for(let i=0;i<4;i++)f.step();c.yaw=0;f.step();const field=r.deployments[0];near(field.position.z,5,'resolution uses current covered reticle');assert.ok(field.position.distanceTo(c.position)<=8);near(s.stats(h.id).moveSpeed,10.4);for(let i=0;i<25;i++)f.step({forward:1});assert.ok(c.position.z>=5.45-1e-8&&c.position.z<8);f.dispose();
}
{
  const f=fixture(),{r,s,h,ally,c}=f,real=r.onEffect;r.targets=[ally,{...h,position:{...h.position}}];c.pitch=-1.2;let once=false;
  r.onEffect=event=>{const result=real(event);if(event.kind==='speed'&&!once){once=true;assert.ok(result.ok);c.warp(point(100,0,8));assert.ok(s.moveHero(h.id,c.position).ok);r.update(0);const late=s.addHero({id:'late',team:'carbon',position:ally.position});r.targets.push(late);}return result;};
  assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();near(s.stats(h.id).moveSpeed,8);near(s.stats('late').moveSpeed,8);assert.equal(f.events.filter(e=>e.kind==='speed').length,1);f.dispose();
}
for(const mode of ['reset','dispose']) {
  const f=fixture(),{r,s,h,c}=f;c.pitch=-1.2;assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();r[mode]();assert.equal(r.deployments.length,0);near(s.stats(h.id).moveSpeed,10.4);for(let i=0;i<39;i++)f.step();near(s.stats(h.id).moveSpeed,10.4);f.step();near(s.stats(h.id).moveSpeed,8);f.dispose();
}
{
  const f=fixture(),{r,s,c}=f;c.pitch=-1.2;
  // Public imported currency permits a real purchased cloak, not a status grant.
  const friend=s.addHero({id:'cloaked',team:'carbon',position:s.bases.carbon,souls:3200,earnedSouls:3200});assert.ok(s.buyItem(friend.id,'shadow-cloak').ok);assert.ok(s.moveHero(friend.id,point(2,0,8)).ok);assert.ok(s.activateItem(friend.id,'shadow-cloak').ok);const cloak=friend.cloakUntil;r.targets=[friend];assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();near(s.stats(friend.id).moveSpeed,10.4);assert.equal(friend.cloakUntil,cloak);f.dispose();
}
{
  const f=fixture(),{r,s,c,scene}=f;c.pitch=-1.2;const wide=s.addHero({id:'wide',team:'carbon',position:point(2,0,8)});assert.ok(s.configureHeroKit(wide.id,whitespaceSlice,{partialSlice:true}).ok);
  const w=new HeroRuntime({scene,controller:new PlayerController({position:wide.position,floorHeight:()=>0}),kit:whitespaceSlice,source:wide.id,onEffect:event=>s.applyHeroEffect(event)});r.targets=[wide];assert.ok(w.cast(1));for(let i=0;i<2;i++){f.step();w.update(.05);}near(s.stats(wide.id).moveSpeed,12.4);assert.ok(r.cast(1));for(let i=0;i<5;i++){f.step();w.update(.05);}near(s.stats(wide.id).moveSpeed,12.4,'real stronger Wide Margin wins, no stacking');w.dispose();f.dispose();
}
{
  const f=fixture(),{r,c,h}=f,real=r.onEffect;c.pitch=-1.2;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind==='speed'&&!entered){entered=true;assert.ok(result.ok);old=r.deployments[0];r.reset();assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();return undefined;}return result;};
  assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(old.speedTargets.size,0);assert.deepEqual([...fresh.speedTargets],[h.id]);near(fresh.age,0);assert.equal(r.removeDeployment(old),false);f.dispose();
}
for(const ack of [null,undefined,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const f=fixture(),{r}=f;r.onEffect=event=>{f.events.push(event);return ack;};assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();assert.deepEqual(f.events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.deployments.length,0);f.dispose();
}
for(const mode of ['nack','lost-ack']) {
  const f=fixture(),{r,c}=f,real=r.onEffect;let attempts=0,accepted=0;c.pitch=-1.2;r.onEffect=event=>{if(event.kind==='speed'){attempts++;if(mode==='nack')return {ok:false};}const result=real(event);if(event.kind==='speed'){if(result.ok)accepted++;return undefined;}return result;};
  assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();const field=r.deployments[0];assert.equal(field.speedTargets.size,0);for(let i=0;i<10;i++)f.step();assert.equal(attempts,1);assert.equal(accepted,mode==='nack'?0:1);f.dispose();
}
for(const mode of ['reset','dispose','recast','lost-ack']) {
  const f=fixture(),{r}=f,real=r.onEffect;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind==='deployment-start'&&!entered){entered=true;assert.ok(result.ok);old=r.deployments[0];r.update(0);if(mode==='lost-ack')return undefined;if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast')assert.ok(r.cast(1));}return result;};
  assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();assert.equal(f.events.filter(e=>e.kind==='speed').length,0);assert.equal(r.deployments.length,0);if(mode==='recast'){near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(r.removeDeployment(old),false);near(fresh.age,0);}f.dispose();
}
for(const primary of [Object.freeze(new Error('pulse failure')),undefined]) {
  const f=fixture(),{r,s,h,c}=f,real=r.onEffect,secondary=Symbol('cleanup');c.pitch=-1.2;let owner;
  r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind==='speed'){owner=r.deployments[0];throw primary;}if(event.kind==='deployment-end')throw secondary;return result;};assert.ok(r.cast(1));for(let i=0;i<4;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}
  assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(owner.speedTargets.size,0);assert.equal(r.deployments.length,0);near(s.stats(h.id).moveSpeed,10.4);r.onEffect=real;f.dispose();
}
for(const mode of ['reset','dispose']) {
  const f=fixture(),{r,c,ally,s,h}=f,real=r.onEffect;c.pitch=-1.2;r.targets=[ally];let once=false;r.onEffect=event=>{const result=real(event);if(event.kind==='speed'&&!once){once=true;assert.ok(result.ok);r[mode]();}return result;};assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();assert.equal(f.events.filter(e=>e.kind==='speed').length,1);near(s.stats(ally.id).moveSpeed,10.4);near(s.stats(h.id).moveSpeed,8);f.dispose();
}
{
  const f=fixture(),{r}=f,a=r.kit.abilities[0];r.aimHit=()=>assert.fail('malformed/unavailable must not aim');for(const key of Object.keys(SIDE_A)){const value=a[key];a[key]=null;const before=f.state();assert.equal(r.cast(1),false,key);assert.equal(f.state(),before);a[key]=value;}f.dispose();const before=f.state();assert.equal(r.cast(1),false);r.update(.05);r.reset();assert.equal(f.state(),before);
}
console.log('PASS Side A actual Host/model/controller: .25 windup/6 CD, fixed covered resolution point/r4/.25 cue, ONE initial pulse only, actual 10.4 movement/normal collision, 2s independent tails, outside-self exclusion, no late entry/duplicate/extra pulse, snapshot/currentSelf, ACK/reentry/frozen faults/closed guards');
console.log('LIMIT: CPU/API evidence, not native controls, rendered supplied-art acceptance, full-match balance or general network/cadence/geometry security.');
