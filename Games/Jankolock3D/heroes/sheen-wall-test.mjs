// Actual models, Host, shared layer/controllers. Authored primitives; CPU evidence only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {laminateSlice} from './laminate-slice.mjs';
import {odometerSlice} from './odometer-slice.mjs';
import {createKeepClearLayer} from './keep-clear-layer.mjs';
import {SHEEN_WALL as a,isSheenWall,sheenWallBounds} from './sheen-wall.mjs';
import {FLYING_DIGITS,flyingDigitDirections,flyingDigitStep} from './flying-digits.mjs';
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y,epsilon=1e-8)=>assert.ok(Math.abs(x-y)<epsilon,`${x} != ${y}`);
assert.ok(isSheenWall(a));for(const axis of ['x','z']){const b=sheenWallBounds(point(),axis);near(b.maxY-b.minY,3);near(b.maxX-b.minX,axis==='z'?7:.3);near(b.maxZ-b.minZ,axis==='x'?7:.3);assert.ok(Object.isFrozen(b));}
const dirs=flyingDigitDirections(point(0,0,-1),a);assert.equal(dirs.length,3);dirs.forEach((d,i)=>{near(Math.atan2(-d.x,-d.z)*180/Math.PI,-10+10*i);near(d.y,0);near(Math.hypot(d.x,d.y,d.z),1);});assert.equal(flyingDigitDirections(point(0,0,-1)).length,4);assert.deepEqual(flyingDigitDirections(point(0,0,-1)),flyingDigitDirections(point(0,0,-1),FLYING_DIGITS));
{
  let p={definition:a,position:point(),direction:point(0,0,-1),travelled:0};let last;for(let i=0;i<10;i++){last=flyingDigitStep(p,.05,[],[],'carbon');p={...p,...last};if(i===0)near(p.travelled,1.5);if(i<9)assert.equal(last.done,false);}near(p.travelled,14);assert.ok(last.done);const covered=flyingDigitStep({definition:a,position:point(),direction:point(0,0,-1),travelled:0},.05,[{minX:-1,maxX:1,minY:-1,maxY:1,minZ:-1.02,maxZ:-1}],[],'carbon');assert.ok(covered.done);near(covered.position.z,-.8);
}
// Compatibility: formerly ignored Sheen-only metadata must remain inert for old/bare flights.
for(const id of ['flyingdigits',undefined,'legacy-flight']) {
  const definition={...FLYING_DIGITS,projectileRange:1,projectileDuration:.01};if(id===undefined)delete definition.id;else definition.id=id;
  const p={definition,position:point(0,1,0),direction:point(0,0,-1),travelled:0};
  const first=flyingDigitStep(p,.05,[],[],'carbon');near(first.travelled,2);assert.equal(first.done,false);
  const end=flyingDigitStep({...p,...first},1,[],[],'carbon');near(end.travelled,25);assert.equal(end.done,true);
}
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes[1];await loadCharacter('laminate');await loadCharacter(native.id);await loadCharacter('odometer');
{
  // Real original Flying Digits admission/ACK/clock with benign extra metadata, no HP/status grants.
  const s=createSystems();s.step(30);const h=s.addHero({id:'original-flight',team:'carbon',position:point(0,0,8)}),kit=structuredClone(odometerSlice);
  Object.assign(kit.abilities.find(a=>a.id==='flyingdigits'),{projectileRange:1,projectileDuration:.01});assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
  const scene=new THREE.Scene(),c=new PlayerController({position:h.position,boxes:[],floorHeight:()=>0}),receipts=[],durations=[];
  const r=new HeroRuntime({scene,controller:c,kit,source:h.id,onEffect:event=>{const result=s.applyHeroEffect(event);receipts.push(result);return result;}}),emit=r.fx.emit;
  r.fx.emit=function(kind,options){if(kind==='shot')durations.push(options.duration);return emit.call(this,kind,options);};
  const step=()=>{assert.ok(s.step(.05).ok);r.update(.05);},hp=h.hp,ammo=r.ammo;assert.ok(r.cast(3));for(let i=0;i<5;i++)step();
  const shards=[...r.projectiles];assert.equal(shards.length,4);assert.deepEqual(durations,[1.25,1.25,1.25,1.25]);assert.equal(r.fx.count,4);shards.forEach(p=>{near(p.left,.625);near(p.travelled,0);near(p.handle.remaining,1.2);});
  step();shards.forEach(p=>{near(p.travelled,2);near(p.left,23/40);});for(let i=0;i<11;i++)step();assert.equal(r.projectiles.length,4);shards.forEach(p=>near(p.travelled,24));step();assert.equal(r.projectiles.length,0);shards.forEach(p=>near(p.travelled,25));assert.equal(r.bursts.size,0);assert.ok(receipts.length===2&&receipts.every(r=>r.ok));assert.equal(h.hp,hp);assert.equal(r.ammo,ammo);r.dispose();assert.equal(scene.children.length,0);
}
console.log('PASS original/bare flight metadata compatibility: ignored Sheen-only fields preserve 2m step/25m range; actual Host Flying Digits retains four shards, .625 initial clock, 1.25 FX lifetime and original advancement');
function fixture() {
  const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:point(0,0,8)}),enemies=[-1.8,0,1.8].map((x,i)=>s.addHero({id:`enemy${i}`,team:'ivory',position:point(x,0,-3)}));for(const enemy of enemies)assert.ok(s.configureHeroKit(enemy.id,native).ok);const kit=structuredClone(laminateSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);
  const scene=new THREE.Scene(),boxes=[],layer=createKeepClearLayer(scene,boxes),c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),ec=new PlayerController({position:enemies[1].position,boxes,floorHeight:()=>0}),events=[],results=[],enemyEvents=[];let r,e;
  const refresh=()=>{const targets=[...s.heroes,...s.wallPanels()];if(r)r.targets=targets;if(e)e.targets=targets;};
  const effect=event=>{events.push(event);const result=s.applyHeroEffect(event);results.push(result);layer.sync(s);refresh();return result;};
  r=new HeroRuntime({scene,controller:c,kit,source:h.id,onEffect:effect});e=new HeroRuntime({scene,controller:ec,kit:native,source:enemies[1].id,team:'ivory',onEffect:event=>{enemyEvents.push(event);const result=s.applyHeroEffect(event);layer.sync(s);refresh();return result;}});refresh();
  const step=()=>{assert.ok(s.step(.05).ok);layer.sync(s);refresh();r.update(.05);e.update(.05);layer.sync(s);refresh();};
  const place=(controller,hero,p,yaw=0)=>{controller.warp(p);controller.yaw=yaw;assert.ok(s.moveHero(hero.id,p).ok);refresh();};
  const cast=(aside=false)=>{assert.ok(r.cast(1));if(aside)c.yaw=Math.PI/2;for(let i=0;i<5;i++)step();};
  const state=()=>JSON.stringify({snapshot:r.snapshot(),resolution:!!r.sheenResolution,heroes:s.heroes,events,results,panels:s.wallPanels(),boxes:boxes.map(b=>({...b})),position:c.position,velocity:c.velocity});
  const dispose=()=>{r.dispose();e.dispose();layer.dispose();assert.equal(scene.children.length,0);assert.equal(boxes.filter(b=>b.panelTarget).length,0);};return {s,h,enemies,kit,scene,boxes,layer,c,ec,r,e,events,results,enemyEvents,refresh,step,place,cast,state,dispose};
}
{
  const f=fixture(),{r,s,h,c,events}=f,hp=f.enemies.map(e=>e.hp),ammo=r.ammo,sourceHp=h.hp;assert.ok(r.cast(1));near(r.pendingCast.left,.25);near(r.cooldowns[1],12);assert.equal(r.castCount.sheenwall,1);const before=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),before);for(let i=0;i<4;i++){f.step();assert.equal(events.length,0);}f.step();
  assert.deepEqual(events.map(e=>e.kind),['deployment-start','burst-start']);assert.ok(f.results.every(r=>r.ok));assert.equal(r.projectiles.length,3);assert.equal(r.sheenResolution,null);const wall=r.deployments[0],panel=s.wallPanels()[0],definition=r.kit.abilities.find(x=>x.id==='sheenwall');near(wall.age,0);near(wall.left,4);assert.equal(panel.hp,650);assert.equal(panel.maxHp,650);assert.deepEqual(panel.bounds,sheenWallBounds(wall.position,'z'));assert.equal(panel.color,'#3f7f6f');
  const mesh=f.scene.children.find(o=>o.geometry?.type==='BoxGeometry');assert.ok(mesh);assert.equal(mesh.material.color.getHexString(),'3f7f6f');const b=new THREE.Box3().setFromObject(mesh);near(b.max.x-b.min.x,7,1e-7);near(b.max.y-b.min.y,3,1e-7);near(b.max.z-b.min.z,.3,1e-7);
  for(const p of r.projectiles){assert.equal(p.definition,definition);assert.equal(p.definition.duration,4);assert.equal(p.definition.range,8);near(p.left,14/30);assert.ok(p.position.equals(r.origin));}const birth=r.projectiles.map(p=>p.position.clone());r.update(0);r.projectiles.forEach((p,i)=>assert.ok(p.position.equals(birth[i])));
  f.step();r.projectiles.forEach(p=>near(p.travelled,1.5));for(let i=0;i<9;i++)f.step();assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);assert.deepEqual(f.enemies.map(e=>e.hp),hp,'own friendly wall intercepts all three, no exception');assert.equal(s.wallPanels()[0].hp,650);assert.equal(events.filter(e=>e.kind==='damage').length,0);assert.equal(r.ammo,ammo);assert.equal(h.hp,sourceHp);assert.equal(s.stats(h.id).invulnerable,false);assert.equal(h.souls,0);assert.equal(h.earnedSouls,0);
  for(let i=0;i<69;i++)f.step();assert.equal(s.wallPanels().length,1);f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);assert.equal(f.boxes.length,0);assert.ok(c.position.equals(new THREE.Vector3(0,0,8)));f.dispose();
}
{
  const f=fixture(),{r,s,enemies}=f,hp=enemies.map(e=>e.hp);f.cast(true);assert.equal(r.deployments[0].axis,'z');assert.ok(r.deployments[0].position.x<0);near(r.deployments[0].position.z,8);const launch=r.projectiles[0].position.clone();near(launch.x,0);near(launch.z,7.45);for(let i=0;i<10;i++)f.step();enemies.forEach((e,i)=>near(hp[i]-e.hp,12*(1-s.stats(e.id).armor)));assert.equal(f.events.filter(e=>e.kind==='damage').length,3);assert.ok(f.events.filter(e=>e.kind==='damage').every(e=>e.duration===4&&e.baseDamage===12));assert.equal(s.wallPanels().length,1);assert.equal(s.wallPanels()[0].hp,650);f.dispose();
}
{
  const f=fixture(),{r,s,enemies,c}=f;assert.ok(r.cast(1));c.yaw=Math.PI/2;assert.ok(s.moveHero(enemies[1].id,point(0,0,4)).ok);const hp=enemies[1].hp;for(let i=0;i<5;i++)f.step();for(let i=0;i<10;i++)f.step();near(hp-enemies[1].hp,10.8);assert.equal(f.events.filter(e=>e.kind==='damage'&&e.target===enemies[1].id).length,1,'three physical contacts cannot grant three hits to one target');f.dispose();
}
{
  const f=fixture(),{r,s,enemies}=f;for(const enemy of enemies)assert.ok(s.moveHero(enemy.id,point(enemy.position.x,0,-8)).ok);f.refresh();const hp=enemies.map(e=>e.hp);f.cast(true);const shards=[...r.projectiles];for(let i=0;i<10;i++)f.step();assert.equal(r.projectiles.length,0);shards.forEach(p=>near(p.travelled,14));assert.deepEqual(enemies.map(e=>e.hp),hp,'no flight past 14m');assert.equal(s.wallPanels().length,1);f.dispose();
}
for(const mode of ['slope','actor','static']) {
  const f=fixture(),{r,c,s,enemies,boxes}=f;const center=r.groundPoint(8),b=sheenWallBounds(center,'z');if(mode==='slope')c.floorHeight=(x)=>x<0?.2:0;if(mode==='static')boxes.push({...b});if(mode==='actor'){assert.ok(s.moveHero(enemies[1].id,center).ok);f.refresh();}const before=f.state();assert.equal(r.cast(1),false);assert.equal(f.state(),before);assert.equal(r.lastPlacementFailure.reason,'Panel blocked');assert.equal(r.lastPlacementFailure.slot,1);f.dispose();
}
for(const mode of ['late-block','nack','lost-ack']) {
  const f=fixture(),{r,c,s,enemies,boxes}=f,real=r.onEffect,hp=enemies.map(e=>e.hp);let starts=0;r.onEffect=event=>{if(event.kind==='deployment-start'){starts++;if(mode==='nack')return {ok:false};}const result=real(event);if(event.kind==='deployment-start'&&mode==='lost-ack')return undefined;return result;};assert.ok(r.cast(1));c.yaw=Math.PI/2;if(mode==='late-block')boxes.push({...sheenWallBounds(r.groundPoint(8),'z')});for(let i=0;i<5;i++)f.step();assert.equal(starts,mode==='late-block'?0:1);assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);assert.equal(r.projectiles.length,3,'independent burst still resolves on late wall failure');assert.equal(r.lastPlacementFailure.reason,'Panel blocked');near(r.cooldowns[1],11.75);for(let i=0;i<10;i++)f.step();enemies.forEach((e,i)=>near(hp[i]-e.hp,10.8));f.dispose();
}
{
  const f=fixture(),{r,s,enemies}=f,hp=enemies.map(e=>e.hp);f.cast(true);const panel=s.wallPanels()[0];assert.ok(s.damage(panel.id,1000,enemies[1].id,{kind:'ability'}).ok);f.layer.sync(s);assert.equal(s.wallPanels().length,0);assert.equal(r.projectiles.length,3);for(let i=0;i<10;i++)f.step();enemies.forEach((e,i)=>near(hp[i]-e.hp,10.8));f.dispose();
}
for(const axis of ['z','x']) {
  const f=fixture(),{r,c,s,ec,e,enemies}=f;c.yaw=axis==='x'?Math.PI/2:0;f.cast();const panel=s.wallPanels()[0],b=panel.bounds,cross=axis,upper=axis==='x'?'maxX':'maxZ',origin=panel.position,yaw=axis==='x'?Math.PI/2:0;
  for(const [controller,hero] of [[c,f.h],[ec,enemies[1]]]){f.place(controller,hero,{...origin,[cross]:b[upper]+3},yaw);for(let i=0;i<20;i++)controller.update(.05,{forward:1,dash:true});assert.ok(controller.position[cross]>=b[upper]+controller.radius-1e-8);}
  f.place(c,f.h,point(0,0,8)); // Clear the public placement fixture's overlapping shooter bodies.
  f.place(ec,enemies[1],{...origin,[cross]:b[upper]+3},yaw);assert.equal(e.aimHit(native.weapon.range).target?.id,panel.id);const originalBurst=r.projectiles[0].burstId;assert.ok(e.fire());assert.equal(s.wallPanels()[0].hp,630);assert.equal(r.projectiles.length,3,'taking damage creates no additional reflected shards');for(let i=0;i<10;i++)f.step();assert.equal(f.events.filter(e=>e.kind==='burst-start').length,1);assert.ok(f.events.filter(e=>e.kind==='damage').every(e=>e.burstId===originalBurst&&e.baseDamage===12),'any original shards hitting the repositioned enemy remain the original 12-damage burst, not reflected incoming damage');f.dispose();
}
for(const mode of ['reset','dispose','recast','remove-wall']) {
  const f=fixture(),{r,s,c}=f,real=r.onEffect;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind==='deployment-start'&&!entered){entered=true;assert.ok(result.ok);old=r.deployments[0];if(mode==='remove-wall')r.removeDeployment(old);else if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast'){c.yaw=Math.PI/2;assert.ok(r.cast(1));}}return result;};assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.projectiles.length,mode==='remove-wall'?3:0);assert.equal(f.events.filter(e=>e.kind==='burst-start').length,mode==='remove-wall'?1:0);assert.equal(r.sheenResolution,null);if(mode==='recast'){near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();assert.equal(s.wallPanels().length,1);assert.equal(r.projectiles.length,3);assert.ok(r.deployments[0].deploymentId>old.deploymentId);assert.equal(r.removeDeployment(old),false);}f.dispose();
}
{
  const f=fixture(),{r,c}=f,real=r.onEffect;let entered=false;r.setModifiers({cooldown:.01});r.onEffect=event=>{const result=real(event);if(event.kind==='deployment-start'&&!entered){entered=true;c.yaw=Math.PI/2;assert.ok(r.cast(1),'fresh accepted Sheen replaces current resolution without reset');}return result;};assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();assert.equal(r.projectiles.length,0);near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();assert.equal(r.projectiles.length,3);assert.equal(f.events.filter(e=>e.kind==='burst-start').length,1);f.dispose();
}
for(const ack of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const f=fixture(),{r,s}=f,real=r.onEffect;r.onEffect=event=>event.kind==='burst-start'?ack:real(event);f.cast();assert.equal(s.wallPanels().length,1);assert.equal(s.wallPanels()[0].hp,650);assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);near(r.deployments[0].left,4);f.dispose();
}
for(const mode of ['reset','dispose','lost-ack']) {
  const f=fixture(),{r,s}=f,real=r.onEffect;r.onEffect=event=>{const result=real(event);if(event.kind==='burst-start'){assert.ok(result.ok);if(mode==='lost-ack')return undefined;r[mode]();}return result;};f.cast();assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);assert.equal(r.sheenResolution,null);assert.equal(s.wallPanels().length,mode==='lost-ack'?1:0);f.dispose();
}
{
  const f=fixture(),{r,c}=f,real=r.onEffect;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind==='deployment-start'&&!entered){entered=true;old=r.deployments[0];r.reset();c.yaw=Math.PI/2;assert.ok(r.cast(1));for(let i=0;i<5;i++)f.step();}return result;};f.cast();assert.equal(r.projectiles.length,3);assert.equal(f.events.filter(e=>e.kind==='burst-start').length,1);assert.equal(r.sheenResolution,null);assert.ok(r.deployments[0].deploymentId>old.deploymentId);near(r.deployments[0].age,0);assert.ok(r.projectiles.every(p=>p.travelled===0));f.dispose();
}
for(const stage of ['deployment-start','burst-start'])for(const primary of [Object.freeze(new Error('Host-first failure')),undefined]) {
  const f=fixture(),{r,s}=f,real=r.onEffect,secondary=Symbol('cleanup');r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind===stage)throw primary;if(event.kind===(stage==='deployment-start'?'deployment-end':'burst-end'))throw secondary;return result;};assert.ok(r.cast(1));for(let i=0;i<4;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.sheenResolution,null);assert.equal(r.projectiles.length,0);if(stage==='deployment-start'){assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(s.wallPanels().length,0);assert.equal(f.events.filter(e=>e.kind==='burst-start').length,0);}else{assert.equal(r.lastBurstCleanupError.error,secondary);assert.equal(s.wallPanels().length,1);}r.onEffect=real;f.dispose();
}
{
  const f=fixture(),{r,s}=f,emit=r.fx.emit,error=Object.freeze(new Error('shard factory'));r.fx.emit=function(kind,...args){if(kind==='shot')throw error;return emit.call(this,kind,...args);};assert.ok(r.cast(1));for(let i=0;i<4;i++)f.step();assert.throws(()=>f.step(),e=>e===error);assert.equal(r.bursts.size,0);assert.equal(r.projectiles.length,0);assert.equal(r.sheenResolution,null);assert.equal(s.wallPanels().length,1,'applied wall is not rolled back by independent shard factory failure');r.fx.emit=emit;f.dispose();
}
for(const mode of ['reset','dispose','death']) {
  const f=fixture(),{r,s,h,enemies}=f;f.cast(true);if(mode==='death'){assert.ok(s.damage(h.id,1e6,enemies[1].id,{kind:'ability'}).killed);r.reset();}else r[mode]();assert.equal(s.wallPanels().length,0);assert.equal(r.projectiles.length,0);assert.equal(r.bursts.size,0);assert.equal(r.sheenResolution,null);f.dispose();
}
{
  const f=fixture(),{r}=f,definition=r.kit.abilities.find(x=>x.id==='sheenwall');const beforeHit=f.state();r.hit(definition,f.enemies[0]);assert.equal(f.state(),beforeHit,'no unowned Sheen damage intent');r.aimHit=()=>assert.fail('invalid definition before aim/cost');for(const key of Object.keys(a)){const value=definition[key];definition[key]=null;const before=f.state();assert.equal(r.cast(1),false,key);assert.equal(f.state(),before);definition[key]=value;}f.dispose();const before=f.state();assert.equal(r.cast(1),false);r.update(.05);r.reset();assert.equal(f.state(),before);
}
console.log('PASS Sheen Wall actual Host/model/layer: .25/12/4 single 650HP 7x3x.3 wall, both normals/color/collision, original-definition three 30m/s/.2/20-degree/14m sweeps and one 12-base hit per target, own-wall interception, independent late-failure bursts/flight-wall lifetimes, no reflection, resolution-token reset/replacement isolation, frozen/factory failures and closed cleanup');
console.log('LIMIT: CPU API and authored primitives, not native controls, supplied-art fidelity, full-match balance, Host trajectory/LoS/floor/windup/cadence/network authority.');
