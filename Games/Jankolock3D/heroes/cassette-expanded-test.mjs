// Actual supplied models/Host/controllers. CPU APIs, not native/art acceptance.
// Tape Snag positives live in tape-snag-test.mjs; invalid slot 0 replaces obsolete unavailable-slot 3 checks.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {cassetteSlice,BAD_REWIND,isBadRewind} from './cassette-slice.mjs';
import {RECORDED_ASSEMBLY as a,isRecordedAssembly,recordedAssemblyClock,recordedAssemblyEligible} from './recorded-assembly.mjs';
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`),point=(x=0,y=0,z=0)=>({x,y,z});
assert.ok(isRecordedAssembly(a));assert.ok(isBadRewind(BAD_REWIND));const wards=new Set(),speeds=new Set();for(let i=0;i<80;i++){const t=recordedAssemblyClock(i*.05);assert.equal(t.expired,false);wards.add(t.wardIndex);speeds.add(t.applicationIndex);assert.equal(t.bright,i%20<4);}assert.deepEqual([...wards],[0,1,2,3]);assert.deepEqual([...speeds],Array.from({length:16},(_,i)=>i));assert.ok(recordedAssemblyClock(4).expired);
const candidate={kind:'hero',team:'carbon',position:point(7),alive:true};assert.ok(recordedAssemblyEligible(candidate,point(),'carbon'));for(const change of [{kind:'structure'},{kind:'orb'},{kind:undefined},{alive:false},{team:'ivory'},{position:point(7,.1)}])assert.equal(recordedAssemblyEligible({...candidate,...change},point(),'carbon'),false);
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[1];await loadCharacter('cassette');await loadCharacter(native.id);
function fixture() {
  const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:point(0,0,8)}),ally=s.addHero({id:'ally',team:'carbon',position:point(2,0,8)}),kit=structuredClone(cassetteSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
  const scene=new THREE.Scene(),boxes=[],c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),events=[],results=[];
  const r=new HeroRuntime({scene,controller:c,kit,source:h.id,onEffect:event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);return result;}});
  const guards=[0,1].map(i=>{const hero=s.addHero({id:`enemy${i}`,team:'ivory',position:point(.55,0,0)});assert.ok(s.configureHeroKit(hero.id,native).ok);const ec=new PlayerController({position:hero.position,boxes,floorHeight:()=>0});ec.yaw=Math.PI;const outcomes=[],runtime=new HeroRuntime({scene,controller:ec,kit:native,source:hero.id,team:'ivory',onEffect:event=>{const result=s.applyHeroEffect(event);outcomes.push(result);return result;}});runtime.targets=[h];return {hero,runtime,outcomes};});r.targets=[ally,ally,guards[0].hero,{...h,position:{...h.position}}];
  const step=(input=null)=>{assert.ok(s.step(.05).ok);if(input&&h.alive){c.speedMultiplier=s.stats(h.id).moveSpeed/8;c.update(.05,input);assert.ok(s.moveHero(h.id,c.position).ok);}r.update(.05);for(const g of guards)g.runtime.update(.05);};
  const state=()=>JSON.stringify({snapshot:r.snapshot(),heroes:s.heroes,events,results,position:c.position,velocity:c.velocity,fx:[...r.fx.handles.keys()].map(x=>[x.remaining,x.position])});
  const dispose=()=>{r.dispose();for(const g of guards)g.runtime.dispose();assert.equal(scene.children.length,0);};return {s,h,ally,kit,scene,boxes,c,r,guards,events,results,step,state,dispose};
}
{
  const f=fixture(),{r,s,h,ally,c,guards,events}=f,[first,second]=guards;assert.ok(r.fire());const ammo=r.ammo,position=c.position.clone(),cloak=h.cloakUntil;assert.ok(first.runtime.fire());const wounded=h.hp;assert.ok(wounded<560);
  const aim=r.aimHit;r.aimHit=()=>assert.fail('self/pending/unavailable cast cannot aim');const before=f.state();assert.equal(r.cast(0),false);assert.equal(f.state(),before);assert.ok(r.cast(2));near(r.cooldowns[2],12);assert.equal(r.castCount.badrewind,1);const pending=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),pending);r.aimHit=aim;
  for(let i=0;i<4;i++){f.step();assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,8);}f.step();const owner=r.buffs.badrewind;near(owner.left,2);near(s.stats(h.id).moveSpeed,12);assert.ok(s.stats(h.id).invulnerable);assert.ok(c.position.equals(position));assert.equal(h.hp,wounded);assert.equal(r.ammo,ammo);assert.equal(h.cloakUntil,cloak);assert.equal(s.stats(ally.id).invulnerable,false);near(s.stats(ally.id).moveSpeed,8);
  assert.ok(first.runtime.fire());assert.equal(first.outcomes.at(-1).reason,'invulnerable');for(let i=0;i<11;i++)f.step();assert.ok(s.stats(h.id).invulnerable);assert.ok(first.runtime.fire());assert.equal(first.outcomes.at(-1).reason,'invulnerable');f.step();assert.equal(s.stats(h.id).invulnerable,false);near(owner.left,1.4);near(s.stats(h.id).moveSpeed,12);assert.ok(second.runtime.fire());near(wounded-h.hp,20*(1-s.stats(h.id).armor));
  const beforeManual=c.position.clone();for(let i=0;i<15;i++)f.step({forward:1});near(c.velocity.length(),12);assert.ok(c.position.distanceTo(beforeManual)>0);for(let i=0;i<13;i++)f.step();assert.equal(r.buffs.badrewind,undefined);near(s.stats(h.id).moveSpeed,8);near(r.cooldowns[2],9.75);assert.equal(h.cloakUntil,cloak);assert.equal(r.ammo,ammo);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);assert.equal(events.find(e=>e.kind==='buff').invulnerabilityDuration,.6);f.dispose();
}
{
  const f=fixture(),{r,s,h,c,boxes}=f;boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:4,maxZ:5});c.pitch=-1.2;assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();const otherCooldown=r.cooldowns[1];assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();near(r.cooldowns[1],otherCooldown-.25);near(s.stats(h.id).moveSpeed,12);for(let i=0;i<25;i++)f.step({forward:1});assert.ok(c.position.z>=5.45-1e-8&&c.position.z<8);f.dispose();
}
console.log('PASS Bad Rewind actual Host/native shots: .25 vulnerable windup/12 CD, .6 invulnerability concurrent with 2s 12m/s manual speed, full damage at .6, walls/max speed, no HP/ammo/cloak/position/other-cooldown rewind');
{
  const f=fixture(),{r,s,h,ally,c,guards,events}=f;c.pitch=-1.2;const [first,second]=guards;assert.ok(first.runtime.fire());let hp=h.hp;const ammo=r.ammo,cloak=h.cloakUntil;assert.ok(r.cast(4));near(r.cooldowns[4],24);assert.equal(r.castCount.recordedassembly,1);
  for(let i=0;i<13;i++){f.step();assert.equal(events.length,0);assert.equal(s.stats(h.id).invulnerable,false);}f.step();const field=r.deployments[0];near(field.age,0);near(field.left,4);const fixed=field.position.clone(),marker=field.handle.group.children[0];marker.geometry.computeBoundingBox();near(marker.geometry.boundingBox.max.x*marker.scale.x,7);assert.equal(field.handle.group.children.length,1);
  for(let pulse=0;pulse<4;pulse++) {
    assert.equal(field.wardIndex,pulse);assert.equal(field.applicationIndex,pulse*4);assert.equal(marker.material.opacity,1);assert.ok(s.stats(h.id).invulnerable);assert.ok(s.stats(ally.id).invulnerable);near(s.stats(h.id).moveSpeed,9.6);assert.equal(s.stats(first.hero.id).invulnerable,false);hp=h.hp;assert.ok(first.runtime.fire());assert.equal(first.outcomes.at(-1).reason,'invulnerable');assert.equal(h.hp,hp);
    for(let i=0;i<4;i++)f.step();assert.equal(s.stats(h.id).invulnerable,false);assert.equal(marker.material.opacity,.2);assert.ok(second.runtime.fire());near(hp-h.hp,20*(1-s.stats(h.id).armor));for(let i=0;i<16;i++)f.step();assert.ok(field.position.equals(fixed));
  }
  assert.equal(r.deployments.length,0);assert.equal(field.handle.remaining,0);assert.equal(field.wardApplications.get(h.id).size,4);assert.equal(field.speedApplications.get(h.id).size,16);assert.equal(field.wardApplications.get(ally.id).size,4);assert.equal(field.speedApplications.get(ally.id).size,16);assert.equal(events.filter(e=>e.kind==='ward').length,8);assert.equal(events.filter(e=>e.kind==='speed').length,32);assert.equal(s.stats(h.id).invulnerable,false);near(s.stats(h.id).moveSpeed,9.6);for(let i=0;i<14;i++)f.step();near(s.stats(h.id).moveSpeed,9.6);f.step();near(s.stats(h.id).moveSpeed,8);assert.equal(r.ammo,ammo);assert.equal(h.cloakUntil,cloak);f.dispose();
}
{
  const f=fixture(),{r,s,h,ally,c}=f;c.pitch=-1.2;assert.ok(s.moveHero(ally.id,point(30,0,8)).ok);assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();const field=r.deployments[0];f.step();f.step();assert.ok(s.moveHero(ally.id,field.position).ok);r.update(0);near(s.stats(ally.id).moveSpeed,8);assert.equal(s.stats(ally.id).invulnerable,false);for(let i=0;i<3;i++)f.step();assert.deepEqual([...field.speedApplications.get(ally.id)],[1]);assert.equal(field.wardApplications.has(ally.id),false);
  assert.ok(s.moveHero(ally.id,point(30,0,8)).ok);f.step();assert.ok(s.moveHero(ally.id,field.position).ok);f.step();r.update(0);assert.deepEqual([...field.speedApplications.get(ally.id)],[1]);for(let i=0;i<13;i++)f.step();assert.deepEqual([...field.wardApplications.get(ally.id)],[1]);c.warp(point(100,0,8));assert.ok(s.moveHero(h.id,c.position).ok);for(let i=0;i<20;i++)f.step();assert.ok(s.stats(ally.id).invulnerable);near(s.stats(ally.id).moveSpeed,9.6);assert.equal(s.stats(h.id).invulnerable,false);f.dispose();
}
{
  const f=fixture(),{r,s,h,ally,c}=f;assert.ok(s.moveHero(ally.id,point(0,0,-2)).ok);r.targets=[ally];assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();const field=r.deployments[0];near(field.position.distanceTo(c.position),10);near(s.stats(h.id).moveSpeed,8);assert.equal(s.stats(h.id).invulnerable,false);assert.equal(field.speedApplications.has(h.id),false);c.warp(point(100,0,8));assert.ok(s.moveHero(h.id,c.position).ok);for(let i=0;i<20;i++)f.step();assert.ok(s.stats(ally.id).invulnerable);near(s.stats(ally.id).moveSpeed,9.6);f.dispose();
}
{
  const f=fixture(),{r,s,h,c,boxes}=f;boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:4,maxZ:5});c.yaw=Math.PI/2;assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();c.yaw=0;f.step();near(r.deployments[0].position.z,5);near(s.stats(h.id).moveSpeed,9.6);for(let i=0;i<25;i++)f.step({forward:1});assert.ok(c.position.z>=5.45-1e-8&&c.position.z<8);f.dispose();
}
{
  const f=fixture(),{r,s,h,c}=f;c.pitch=-1.2;assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();for(let i=0;i<15;i++)f.step({forward:1});near(c.velocity.length(),9.6);assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();near(s.stats(h.id).moveSpeed,12);assert.ok(r.removeBuff('badrewind'));near(s.stats(h.id).moveSpeed,9.6);assert.ok(s.stats(h.id).invulnerable,'ending Bad cannot revoke coincident Assembly ward');f.dispose();
}
for(const mode of ['reset','dispose']) {
  const f=fixture(),{r,s,h,c}=f;c.pitch=-1.2;assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();r[mode]();assert.equal(r.deployments.length,0);assert.ok(s.stats(h.id).invulnerable);near(s.stats(h.id).moveSpeed,9.6);for(let i=0;i<4;i++)f.step();assert.equal(s.stats(h.id).invulnerable,false);for(let i=0;i<15;i++)f.step();near(s.stats(h.id).moveSpeed,9.6);f.step();near(s.stats(h.id).moveSpeed,8);f.dispose();
}
for(const mode of ['reset','dispose','move']) {
  const f=fixture(),{r,s,h,ally,c}=f,real=r.onEffect;let entered=false;c.pitch=-1.2;r.onEffect=event=>{const result=real(event);if(event.kind==='ward'&&!entered){entered=true;assert.ok(result.ok);if(mode==='move'){c.warp(point(100,0,8));assert.ok(s.moveHero(h.id,c.position).ok);r.update(0);}else r[mode]();}return result;};assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();assert.ok(s.stats(ally.id).invulnerable);assert.equal(s.stats(h.id).invulnerable,false);assert.equal(f.events.filter(e=>e.kind==='ward').length,1);assert.equal(f.events.filter(e=>e.kind==='speed').length,mode==='move'?1:0);f.dispose();
}
for(const mode of ['nack','lost-ack']) {
  const f=fixture(),{r,c}=f,real=r.onEffect;let attempts=0,accepted=0;c.pitch=-1.2;r.onEffect=event=>{if(event.kind==='ward'){attempts++;if(mode==='nack')return {ok:false};}const result=real(event);if(event.kind==='ward'){if(result.ok)accepted++;return undefined;}return result;};assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();const field=r.deployments[0];for(let i=0;i<80;i++)f.step();assert.equal(field.wardApplications.size,0);assert.equal(attempts,8);assert.equal(accepted,mode==='nack'?0:8);assert.equal(field.speedApplications.get(f.h.id).size,16,'ward rejection does not suppress speed');f.dispose();
}
for(const slot of [2,4])for(const mode of ['reset','dispose','recast','throw']) {
  const f=fixture(),{r,s,h,c}=f,real=r.onEffect,error=Object.freeze(new Error('Host-first activation'));let entered=false;c.pitch=-1.2;r.onEffect=event=>{const result=real(event);if(event.kind===(slot===2?'buff':'deployment-start')&&!entered){entered=true;assert.ok(result.ok);if(mode==='throw')throw error;if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast')assert.ok(r.cast(slot));}return result;};assert.ok(r.cast(slot));const steps=slot===2?5:14;for(let i=0;i<steps-1;i++)f.step();if(mode==='throw'){assert.throws(()=>f.step(),e=>e===error);if(slot===2)assert.ok(s.stats(h.id).invulnerable);}else{f.step();assert.equal(r.buffs.badrewind,undefined);assert.equal(r.deployments.length,0);if(mode==='recast'){near(r.pendingCast.left,slot===2?.25:.7);for(let i=0;i<steps;i++)f.step();assert.ok(slot===2?r.buffs.badrewind:r.deployments.length);}}r.onEffect=real;f.dispose();
}
for(const kind of ['ward','speed'])for(const primary of [Object.freeze(new Error('committed component')),undefined]) {
  const f=fixture(),{r,c,s,ally}=f,real=r.onEffect,secondary=Symbol('cleanup');c.pitch=-1.2;let owner;r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind===kind){owner=r.deployments[0];throw primary;}if(event.kind==='deployment-end')throw secondary;return result;};assert.ok(r.cast(4));for(let i=0;i<13;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(r.deployments.length,0);assert.equal((kind==='ward'?owner.wardApplications:owner.speedApplications).size,0);assert.ok(s.stats(ally.id).invulnerable);near(s.stats(ally.id).moveSpeed,kind==='speed'?9.6:8);r.onEffect=real;f.dispose();
}
for(const ack of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const f=fixture(),{r}=f;r.onEffect=event=>{f.events.push(event);return ack;};assert.ok(r.cast(4));for(let i=0;i<14;i++)f.step();assert.deepEqual(f.events.map(e=>e.kind),['deployment-start','deployment-end']);assert.equal(r.deployments.length,0);f.dispose();
}
for(const [slot,baseline] of [[2,BAD_REWIND],[4,a]]) {
  const f=fixture(),{r}=f,definition=r.kit.abilities.find(x=>x.slot===slot);r.aimHit=()=>assert.fail('malformed cast cannot aim');for(const key of Object.keys(baseline)){const value=definition[key];definition[key]=null;const before=f.state();assert.equal(r.cast(slot),false,key);assert.equal(f.state(),before);definition[key]=value;}f.dispose();const before=f.state();assert.equal(r.cast(slot),false);r.update(.05);r.reset();assert.equal(f.state(),before);
}
console.log('PASS Assembly actual Host/native shots/controllers: four .2 wards + sixteen concurrent 1s speed samples, ordinary full damage between, r7 fixed/current-self eligibility/10m center, covered resolution/collision, 9.6 motion/Bad maximum, late entry only next sample, exact 4s cue/4.75 last tail, dedup/ACK/component cancellation/errors/closed');
console.log('LIMIT: CPU API/normal-clock evidence, not native/art/full-match/balance or general network/cadence/geometry security. Existing combat/Side A assertions remain in cassette-runtime-test.mjs.');
