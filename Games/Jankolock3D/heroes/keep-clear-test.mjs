// Actual Host/model/layer/controller tests. CPU only, authored primitives not supplied art.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createSystems} from '../systems.mjs';
import {loadCharacter} from '../character-assets.mjs';
import {HeroRuntime} from './hero-runtime.mjs';
import {PlayerController} from './player-controller.mjs';
import {whitespaceSlice} from './whitespace-slice.mjs';
import {odometerSlice} from './odometer-slice.mjs';
import {KEEP_CLEAR as a,keepClearBounds} from './keep-clear.mjs';
import {createKeepClearLayer} from './keep-clear-layer.mjs';
const native=JSON.parse(readFileSync(new URL('../../../docs/jank3d-hero-kits.json',import.meta.url))).heroes;
const grenadeKit=native.find(h=>h.abilities.some(a=>a.id==='grenade')),slamKit=native.find(h=>h.abilities.some(a=>a.id==='slam')),healerKit=native.find(h=>h.abilities.some(a=>a.id==='aura'&&a.baseHeal>0));
for(const id of new Set(['whitespace','odometer',native[1].id,grenadeKit.id,slamKit.id,healerKit.id]))await loadCharacter(id);
const point=(x=0,y=0,z=0)=>({x,y,z}),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-8,`${x} != ${y}`);
function fixture({enemyKit=native[1]}={}) {
  const s=createSystems();s.step(30);const h=s.addHero({id:'source',team:'carbon',position:point(0,0,8)}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(8,0,0)}),ally=s.addHero({id:'ally',team:'carbon',position:point(-8,0,0)}),kit=structuredClone(whitespaceSlice);assert.ok(s.configureHeroKit(h.id,kit,{partialSlice:true}).ok);assert.ok(s.configureHeroKit(enemy.id,enemyKit,enemyKit.partialSlice?{partialSlice:true}:undefined).ok);
  const scene=new THREE.Scene(),boxes=[],layer=createKeepClearLayer(scene,boxes),c=new PlayerController({position:h.position,boxes,floorHeight:()=>0}),ec=new PlayerController({position:enemy.position,boxes,floorHeight:()=>0}),events=[],results=[],enemyEvents=[],enemyResults=[];let r,e;
  const refresh=()=>{const targets=[...s.heroes,...s.wallPanels()];if(r)r.targets=targets;if(e)e.targets=targets;};
  const apply=(event,es,rs)=>{es.push(event);const result=s.applyHeroEffect(event);rs.push(result);layer.sync(s);refresh();return result;};
  r=new HeroRuntime({scene,controller:c,kit,source:h.id,onEffect:event=>apply(event,events,results)});e=new HeroRuntime({scene,controller:ec,kit:enemyKit,source:enemy.id,team:'ivory',onEffect:event=>apply(event,enemyEvents,enemyResults)});refresh();
  const step=()=>{assert.ok(s.step(.05).ok);layer.sync(s);refresh();r.update(.05);e.update(.05);layer.sync(s);refresh();};
  const place=(controller,hero,p,yaw=0)=>{controller.warp(p);controller.yaw=yaw;assert.ok(s.moveHero(hero.id,p).ok);refresh();};
  const activate=()=>{c.pitch=-1.2;assert.ok(r.cast(2));for(let i=0;i<5;i++)step();assert.equal(s.wallPanels().length,2);return s.wallPanels();};
  const state=()=>JSON.stringify({runtime:r.snapshot(),heroes:s.heroes,events,results,panels:s.wallPanels(),boxes:boxes.map(b=>({id:b.id,...b})),position:c.position,velocity:c.velocity});
  const dispose=()=>{r.dispose();e.dispose();layer.dispose();assert.equal(scene.children.length,0);assert.equal(boxes.filter(b=>b.panelTarget).length,0);};return {s,h,enemy,ally,c,ec,r,e,scene,boxes,layer,events,results,enemyEvents,enemyResults,step,place,refresh,activate,state,dispose};
}
for(const axis of ['z','x']) {
  const f=fixture(),{r,s,h,c,events,boxes}=f;c.yaw=axis==='x'?Math.PI/2:0;const hp=h.hp,ammo=r.ammo,position=c.position.clone();assert.ok(r.cast(2));near(r.cooldowns[2],11);assert.equal(r.pendingCast.axis,axis);const pending=f.state();for(const slot of [1,2,3,4])assert.equal(r.cast(slot),false);assert.equal(f.state(),pending);for(let i=0;i<4;i++){f.step();assert.equal(s.wallPanels().length,0);assert.equal(events.length,0);}f.step();const owner=r.deployments[0];near(owner.age,0);near(owner.left,4);assert.equal(s.wallPanels().length,2);assert.equal(boxes.length,2);assert.deepEqual(s.wallPanels().map(p=>p.bounds),keepClearBounds(owner.position,axis));assert.ok(s.wallPanels().every(p=>p.hp===280&&p.maxHp===280));assert.equal(r.fx.count,0,'Host layer, not an FX-only wall');assert.equal(h.hp,hp);assert.equal(r.ammo,ammo);assert.ok(c.position.equals(position));assert.equal(s.stats(h.id).invulnerable,false);
  for(let i=0;i<79;i++)f.step();assert.equal(s.wallPanels().length,2);f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);assert.equal(boxes.length,0);f.dispose();
}
for(const mode of ['static','actor','hidden','slope','unsupported']) {
  const f=fixture(),{r,c,s,ally,boxes}=f;c.pitch=-1.2;const center=r.groundPoint(13),bounds=keepClearBounds(center,'z');if(mode==='static')boxes.push({...bounds[0]});if(mode==='actor'||mode==='hidden'){assert.ok(s.moveHero(ally.id,point((bounds[0].minX+bounds[0].maxX)/2,0,center.z)).ok);f.refresh();if(mode==='hidden')r.targets=r.targets.map(t=>t.id===ally.id?{...t,living:true,alive:false}:t);}if(mode==='slope')c.floorHeight=(x)=>x<0?.2:0;if(mode==='unsupported')c.floorHeight=(x)=>x<0?NaN:0;
  const before=f.state();assert.equal(r.cast(2),false,mode);assert.equal(f.state(),before);assert.equal(r.lastPlacementFailure.reason,'Panels blocked');assert.equal(s.wallPanels().length,0);f.dispose();
}
{
  const f=fixture(),{r,c,s,boxes}=f;c.pitch=-1.2;assert.ok(r.cast(2));for(let i=0;i<4;i++)f.step();boxes.push({...keepClearBounds(r.groundPoint(13),'z')[1]});f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);assert.equal(r.lastPlacementFailure.slot,2);near(r.cooldowns[2],10.75);assert.equal(r.castCount.keepclear,1);f.dispose();
}
{
  const f=fixture(),{r,c,s}=f;c.pitch=-1.2;assert.ok(r.cast(2));c.yaw=Math.PI/2;for(let i=0;i<5;i++)f.step();const owner=r.deployments[0];assert.equal(owner.axis,'z','corridor axis is captured at press');assert.ok(owner.position.x<0);near(owner.position.z,8);assert.deepEqual(s.wallPanels().map(p=>p.bounds),keepClearBounds(owner.position,'z'));f.dispose();
}
// Both teams use the exact same real panel boxes; public warp is placement setup only.
for(const axis of ['z','x'])for(const mode of ['walk','dash','hook','slide']) {
  const f=fixture(),{r,c,s}=f;c.yaw=axis==='x'?Math.PI/2:0;c.pitch=-1.2;assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const origin=r.deployments[0].position,across=axis==='z'?'x':'z',upper=across==='x'?'maxX':'maxZ',panel=s.wallPanels()[1],yaw=across==='x'?Math.PI/2:0;
  for(const [controller,hero] of [[f.c,f.h],[f.ec,f.enemy]]) {
    f.place(controller,hero,{...origin,[across]:panel.bounds[upper]+(mode==='slide'?8:3)},yaw);
    if(mode==='hook')assert.ok(controller.hookTo(origin));if(mode==='slide'){for(let i=0;i<5;i++)controller.update(.05,{forward:1});controller.update(.05,{forward:1,slide:true});assert.ok(controller.infiniteAmmo);}
    for(let i=0;i<40;i++)controller.update(.05,mode==='hook'?{}:{forward:1,dash:mode==='dash',slide:mode==='slide'});assert.ok(controller.position[across]>=panel.bounds[upper]+controller.radius-1e-8,`${axis}/${mode}/${hero.team} cannot cross thin panel`);
  }
  const runner=new PlayerController({position:origin,boxes:f.boxes,floorHeight:()=>0});runner.yaw=axis==='z'?0:Math.PI/2;for(let i=0;i<30;i++)runner.update(.05,{forward:1});assert.ok(runner.position[axis]<origin[axis]-2.5,'gap and ends remain open');f.dispose();
}
{
  const f=fixture(),{r,e,s,h,enemy,ally,c,ec,enemyEvents}=f,[left,right]=f.activate();const z=right.position.z;f.place(ec,enemy,point(6,0,z),Math.PI/2);assert.ok(s.moveHero(ally.id,point(0,0,z-.55)).ok);f.refresh();const hp=ally.hp,sourceHp=h.hp;const hit=e.aimHit(23);assert.equal(hit.target.id,right.id);near(hit.point.x,right.bounds.maxX);assert.equal(hit.headshot,undefined);assert.ok(e.visible(e.origin,right),'own panel collider is not false cover');assert.equal(e.visible(e.origin,left),false,'the nearer panel still occludes the farther one');assert.ok(e.fire());assert.equal(s.wallPanels().find(p=>p.id===right.id).hp,260);assert.equal(s.wallPanels().find(p=>p.id===left.id).hp,280);assert.equal(ally.hp,hp);assert.equal(h.hp,sourceHp);assert.equal(enemyEvents.at(-1).target,right.id);
  f.place(ec,enemy,point(4.5,0,z),Math.PI/2);const before=s.wallPanels().find(p=>p.id===right.id).hp;assert.ok(e.melee());assert.ok(s.wallPanels().find(p=>p.id===right.id).hp<before);f.place(c,h,point(6,0,z),Math.PI/2);const ownHp=s.wallPanels().find(p=>p.id===right.id).hp,ammo=r.ammo;assert.ok(r.fire());assert.equal(r.ammo,ammo-1);assert.equal(s.wallPanels().find(p=>p.id===right.id).hp,ownHp,'friendly panel blocks without damage');
  assert.ok(s.damage(right.id,1000,enemy.id,{kind:'projectile'}).ok);f.layer.sync(s);f.refresh();assert.equal(f.boxes.length,1);assert.equal(s.wallPanels()[0].id,left.id);assert.equal(s.wallPanels()[0].hp,280);const crossed=new PlayerController({position:point(6,0,z),boxes:f.boxes,floorHeight:()=>0});crossed.yaw=Math.PI/2;for(let i=0;i<20;i++)crossed.update(.05,{forward:1});assert.ok(crossed.position.x<right.bounds.minX,'destroyed panel no longer blocks');assert.equal(enemy.souls,0);assert.equal(enemy.earnedSouls,0);f.dispose();
}
{
  const f=fixture({enemyKit:odometerSlice}),{e,ec,enemy,s}=f,[left,right]=f.activate();f.place(ec,enemy,point(6,0,right.position.z),Math.PI/2);assert.ok(e.cast(3));for(let i=0;i<20;i++)f.step();assert.equal(s.wallPanels().find(p=>p.id===right.id).hp,244,'real fan deals exactly two 18-damage panel hits');assert.equal(s.wallPanels().find(p=>p.id===left.id).hp,280);assert.equal(e.projectiles.length,0);assert.equal(f.enemyEvents.filter(e=>e.kind==='damage').length,2);f.dispose();
}
{
  const f=fixture({enemyKit:grenadeKit}),{e,ec,enemy}=f,panels=f.activate();f.place(ec,enemy,point(6,0,panels[1].position.z),Math.PI/2);assert.ok(e.cast(grenadeKit.abilities.find(a=>a.id==='grenade').slot));for(let i=0;i<8;i++)f.step();assert.ok(e.projectiles[0].bounces>0);assert.ok(e.projectiles[0].position.x>=panels[1].bounds.maxX,'grenade reflected by shared solid panel');f.dispose();
}
{
  const f=fixture({enemyKit:slamKit}),{e,ec,enemy,s}=f,panels=f.activate();f.place(ec,enemy,point(4.5,0,panels[1].position.z),Math.PI/2);assert.ok(e.cast(slamKit.abilities.find(a=>a.id==='slam').slot));assert.ok(s.wallPanels().find(p=>p.id===panels[1].id).hp<280,'real native AoE can damage panel without own-collider occlusion');assert.equal(s.wallPanels().find(p=>p.id===panels[0].id).hp,280);f.dispose();
}
{
  const f=fixture(),{s,enemy,ally,scene}=f,panels=f.activate();assert.ok(s.damage(panels[1].id,20,enemy.id,{kind:'ability'}).ok);assert.ok(s.configureHeroKit(ally.id,healerKit).ok);assert.ok(s.moveHero(ally.id,point(0,0,panels[1].position.z)).ok);const events=[],controller=new PlayerController({position:ally.position,boxes:f.boxes,floorHeight:()=>0}),healer=new HeroRuntime({scene,controller,kit:healerKit,source:ally.id,onEffect:event=>{events.push(event);return s.applyHeroEffect(event);}});healer.targets=[...s.heroes,...s.wallPanels()];assert.ok(healer.cast(healerKit.abilities.find(a=>a.id==='aura').slot));healer.update(.05);assert.equal(events.filter(e=>e.kind==='heal'&&panels.some(p=>p.id===e.target)).length,0);assert.equal(s.wallPanels().find(p=>p.id===panels[1].id).hp,260);healer.dispose();f.dispose();
}
for(const mode of ['reset','dispose','death']) {
  const f=fixture(),{r,s,h,enemy,boxes}=f;f.activate();if(mode==='death'){assert.ok(s.damage(h.id,1e6,enemy.id,{kind:'ability'}).killed);r.reset();}else r[mode]();f.layer.sync(s);assert.equal(s.wallPanels().length,0);assert.equal(boxes.length,0);f.dispose();
}
for(const ack of [undefined,null,true,{ok:false},{ok:'true'},Promise.resolve({ok:true})]) {
  const f=fixture(),{r,s}=f;r.onEffect=event=>{f.events.push(event);return ack;};assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);assert.equal(r.lastPlacementFailure.reason,'Panels blocked');assert.deepEqual(f.events.map(e=>e.kind),['deployment-start','deployment-end']);f.dispose();
}
for(const mode of ['reset','dispose','recast','lost-ack']) {
  const f=fixture(),{r,s,c}=f,real=r.onEffect;let entered=false,old;r.onEffect=event=>{const result=real(event);if(event.kind==='deployment-start'&&!entered){entered=true;assert.ok(result.ok);old=r.deployments[0];if(mode==='lost-ack')return undefined;if(mode==='dispose')r.dispose();else r.reset();if(mode==='recast'){c.yaw=Math.PI/2;assert.ok(r.cast(2));}}return result;};assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();assert.equal(s.wallPanels().length,0);assert.equal(r.deployments.length,0);if(mode==='recast'){near(r.pendingCast.left,.25);for(let i=0;i<5;i++)f.step();const fresh=r.deployments[0];assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(r.removeDeployment(old),false);assert.equal(s.wallPanels().length,2);near(fresh.age,0);}f.dispose();
}
{
  const f=fixture(),{r,c,s}=f;r.setModifiers({cooldown:.01});assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const old=r.deployments[0],oldIds=s.wallPanels().map(p=>p.id);c.yaw=Math.PI/2;assert.ok(r.cast(2));for(let i=0;i<5;i++)f.step();const fresh=r.deployments[0];assert.notEqual(fresh,old);assert.ok(fresh.deploymentId>old.deploymentId);assert.equal(s.wallPanels().length,2);assert.ok(s.wallPanels().every(p=>!oldIds.includes(p.id)));assert.equal(f.boxes.length,2);assert.equal(r.removeDeployment(old),false);near(fresh.age,0);f.dispose();
}
for(const primary of [Object.freeze(new Error('Host-first panels')),undefined]) {
  const f=fixture(),{r,s}=f,real=r.onEffect,secondary=Symbol('end cleanup');r.onEffect=event=>{const result=real(event);assert.ok(result.ok);if(event.kind==='deployment-start')throw primary;if(event.kind==='deployment-end')throw secondary;return result;};assert.ok(r.cast(2));for(let i=0;i<4;i++)f.step();let threw=false,caught;try{f.step();}catch(error){threw=true;caught=error;}assert.ok(threw);assert.ok(Object.is(caught,primary));assert.equal(r.lastFieldCleanupError.error,secondary);assert.equal(s.wallPanels().length,0);assert.equal(f.boxes.length,0);r.onEffect=real;f.dispose();
}
{
  const f=fixture(),{r}=f,definition=r.kit.abilities.find(x=>x.id==='keepclear');r.aimHit=()=>assert.fail('malformed definition before aim/cost');for(const key of Object.keys(a)){const value=definition[key];definition[key]=null;const before=f.state();assert.equal(r.cast(2),false,key);assert.equal(f.state(),before);definition[key]=value;}f.dispose();const before=f.state();assert.equal(r.cast(2),false);r.update(.05);r.reset();assert.equal(f.state(),before);
}
console.log('PASS Keep Clear actual models/Host/layer: two independently damageable 280 HP panels, .25/11/4 clocks, both cardinal axes/captured heading, flat unoccupied placement/late rejection, both-team walk/dash/hook/slide collision/gap/ends, exact panel tracing, real weapon/melee/fan/grenade/AoE damage/occlusion, no friendly healing, destruction/death/end/ACK/reentry/frozen failures/closed');
console.log('LIMIT: CPU actual primitives/Host/controller AABB approximation, not native input, supplied-art fidelity, rendered frames, full-match balance or Host floor/LoS/network authorization.');
