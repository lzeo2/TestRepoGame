import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor/three.module.js';
import { createSystems } from './systems.mjs';
import { createWorldData } from './world-data.mjs';
import { createBots } from './bots.mjs';

const {heroes:kits}=JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json',import.meta.url)));
let groups=0;
function fixture({souls=0,world={boxes:[],ramps:[]},floorHeight,onEffect}={}) {
  const sim=createSystems(world.lanes?world:undefined), scene=new THREE.Scene(), boxes=[...world.boxes];
  const player=sim.addHero({id:'player',team:'carbon',lane:'midway'});
  // Explicit public import-state fixture, never a production bot reward.
  const addHero=sim.addHero;
  sim.addHero=options=>addHero({...options,souls});
  const bots=createBots({sim,scene,world,kits,boxes,floorHeight:floorHeight??(world.lanes?undefined:()=>0),onEffect});
  const tick=(seconds,options)=>{for(let i=0;i<Math.round(seconds/.05);i++){sim.step(.05);bots.update(.05,options);}};
  return {sim,scene,boxes,player,bots,tick};
}
{
  const f=fixture();
  assert.equal(f.sim.heroes.length,6);assert.equal(f.bots.runtimes.length,5);
  assert.deepEqual(f.bots.snapshot().map(b=>[b.id,b.team,b.lane]),[
    ['bot-1','carbon','graft'],['bot-2','carbon','greenhedge'],['bot-3','ivory','graft'],['bot-4','ivory','midway'],['bot-5','ivory','greenhedge']
  ]);
  assert.equal(f.scene.children.length,5,'five real runtime visuals, no renderer');
  f.tick(2);
  assert.ok(f.bots.snapshot()[0].position.x<-10,'carbon ally heads to graft');
  assert.ok(f.bots.snapshot()[1].position.x>10,'carbon ally heads to greenhedge');
  assert.ok(f.bots.snapshot()[3].position.z<425,'ivory heads down its lane');
  f.tick(38);
  for(const bot of f.bots.snapshot()) {
    const lane=f.sim.lanes.find(l=>l.id===bot.lane);
    assert.ok(Math.abs(bot.position.x-lane.x)<2,'reaches assigned lane, not diagonal through city');
    const wave=f.sim.troopers.filter(t=>t.alive&&t.team===bot.team&&t.lane===bot.lane);
    const sign=bot.team==='carbon'?1:-1;
    assert.ok(bot.position.z*sign<=Math.max(...wave.map(t=>t.position.z*sign))-5,'stays behind wave');
  }
  const snap=f.bots.snapshot();snap[0].position.x=9999;
  assert.notEqual(f.sim.heroes[1].position.x,9999,'snapshot positions are copies');
  f.bots.dispose();f.bots.dispose();assert.equal(f.scene.children.length,0);
  f.bots.update(1);groups++;
}
{
  const f=fixture({souls:800});f.bots.update(.05);
  for(const hero of f.sim.heroes.slice(1)) {
    assert.deepEqual(hero.items,['ammo']);assert.equal(hero.souls,0);
    assert.equal(hero.earnedSouls,800,'shopping does not fabricate or remove earned XP');
  }
  assert.equal(f.sim.events.filter(e=>e.type==='purchase').length,5);
  f.bots.update(.05);assert.equal(f.sim.events.filter(e=>e.type==='purchase').length,5,'no duplicate purchases');
  f.bots.dispose();groups++;
}
{
  const f=fixture();f.sim.step(30);
  const h=f.sim.heroes.find(h=>h.id==='bot-1'),enemy=f.sim.heroes.find(h=>h.id==='bot-3');
  f.sim.moveHero(h.id,{x:-240,y:0,z:-30});f.sim.moveHero(enemy.id,{x:-240,y:0,z:-20});
  assert.ok(f.sim.damage(h.id,550,enemy.id,{kind:'ability'}).ok);
  assert.ok(h.hp<h.maxHp*.3);
  f.bots.update(.05);f.tick(.5);
  const b=f.bots.snapshot()[0];
  assert.equal(b.retreating,true);assert.equal(b.mode,'retreat');
  assert.ok(b.position.z<-30,'low HP runs toward own base');
  assert.equal(b.runtime.shots,0);assert.deepEqual(b.runtime.casts,{});
  f.sim.moveHero(h.id,f.sim.bases.carbon);f.bots.update(.05);
  f.sim.step(10);f.bots.update(.05);
  assert.equal(f.bots.snapshot()[0].retreating,false,'systems base healing releases retreat');
  f.bots.dispose();groups++;
}
{
  const f=fixture();f.sim.step(30);
  f.sim.moveHero(f.player.id,{x:0,y:0,z:0});f.sim.moveHero('bot-4',{x:0,y:0,z:20});
  f.bots.update(.05);
  const r=f.bots.runtimes[3];
  assert.equal(r.shots,1);assert.ok(f.player.hp<500,'default effect callback applies actual systems damage');
  assert.equal(r.castCount.longshot,1);assert.equal(r.castCount.tether,1);
  assert.ok(r.controller.pitch<0,'aims from muzzle down toward chest, not over head');
  f.bots.update(.05);assert.equal(r.shots,1);assert.equal(r.castCount.longshot,1,'runtime owns cooldowns');
  f.sim.moveHero(f.player.id,f.sim.bases.carbon);
  f.tick(6);
  assert.equal(r.cooldowns[1],0);assert.equal(r.castCount.longshot,1,'no casts without a visible enemy');
  f.bots.dispose();groups++;
}
{
  const f=fixture();f.sim.step(30);
  f.sim.moveHero(f.player.id,{x:0,y:0,z:0});f.sim.moveHero('bot-4',{x:0,y:0,z:20});
  const wall={minX:-5,maxX:5,minY:0,maxY:6,minZ:9,maxZ:10};f.boxes.push(wall);
  f.bots.update(.05);
  assert.equal(f.bots.runtimes[3].shots,0);assert.deepEqual(f.bots.runtimes[3].castCount,{});
  assert.equal(f.player.hp,500,'world cover blocks all combat');
  f.boxes.splice(f.boxes.indexOf(wall),1);f.bots.update(.05);
  assert.ok(f.player.hp<500,'removing cover permits real combat');
  // Start an ongoing autonomous firing buff, then explicitly pause bot effects.
  f.sim.moveHero('bot-3',{x:0,y:0,z:15});f.bots.update(.05,{passive:true});
  f.bots.runtimes[2].cast(4);
  const hp=f.player.hp,positions=f.bots.snapshot().map(b=>b.position),shots=f.bots.runtimes.map(r=>r.shots);
  f.tick(1,{passive:true});
  assert.equal(f.player.hp,hp,'passive suppresses ongoing damage as well as new casts');
  assert.deepEqual(f.bots.snapshot().map(b=>b.position),positions,'passive stops movement');
  assert.deepEqual(f.bots.runtimes.map(r=>r.shots),shots);
  f.bots.dispose();groups++;
}
{
  const f=fixture({world:createWorldData(),floorHeight:undefined});
  // Real descriptor/capsules, with an additional thin non-mantleable lane wall.
  f.boxes.push({minX:-5,maxX:5,minY:0,maxY:8,minZ:415,maxZ:415.1});
  f.tick(4);
  assert.ok(f.sim.heroes.find(h=>h.id==='bot-4').position.z>=415.54,'capsule cannot tunnel through thin world cover');
  f.sim.step(30);
  f.sim.moveHero('bot-4',{x:0,y:0,z:0});f.sim.moveHero(f.player.id,{x:0,y:0,z:-10});
  assert.ok(f.sim.damage('bot-4',10000,f.player.id,{kind:'ability'}).killed);
  f.bots.update(.05,{passive:true});assert.equal(f.bots.runtimes[3].visual.group.visible,false);
  assert.deepEqual(f.bots.runtimes[3].castCount,{});
  f.sim.step(6);f.bots.update(.05,{passive:true});
  assert.equal(f.sim.heroes.find(h=>h.id==='bot-4').alive,true);
  assert.deepEqual(f.bots.runtimes[3].controller.position.toArray(),Object.values(f.sim.bases.ivory));
  assert.equal(f.bots.runtimes[3].visual.group.visible,true);
  const ring=f.sim.retreatRings.find(r=>r.team==='carbon'&&r.lane==='graft');
  f.sim.moveHero('bot-1',ring.position);f.bots.update(.05,{passive:true});
  f.sim.setRetreat('bot-1',true);f.sim.step(3.1);f.bots.update(.05,{passive:true});
  assert.deepEqual(f.bots.runtimes[0].controller.position.toArray(),Object.values(f.sim.bases.carbon),'external recall is authoritative');
  f.bots.dispose();groups++;
}
{
  const f=fixture();f.sim.step(30);
  const victim=f.sim.troopers.find(t=>t.team==='ivory'&&t.lane==='graft');
  f.sim.moveHero('bot-1',{x:victim.position.x,y:0,z:victim.position.z-4});
  assert.ok(f.sim.damage(victim.id,1000,'bot-1',{kind:'ability'}).killed);
  const floating=f.sim.orbs.find(o=>o.type==='floating'),ground=f.sim.orbs.find(o=>o.type==='ground');
  const wall={minX:victim.position.x-5,maxX:victim.position.x+5,minY:0,maxY:8,minZ:victim.position.z-2,maxZ:victim.position.z-1};
  f.boxes.push(wall);f.bots.update(.05);
  assert.equal(floating.claimed,false,'orb shots also respect cover');
  f.boxes.splice(f.boxes.indexOf(wall),1);f.bots.update(.05);
  assert.equal(floating.claimed,true,'visible floating orb secured with public API');
  assert.ok(f.sim.heroes.find(h=>h.id==='bot-1').souls>=40);
  f.tick(.5);
  assert.ok(ground.claimed||!f.sim.orbs.includes(ground),'nearby allied ground orb collected by systems');
  f.bots.dispose();groups++;
}
{
  const events=[],results=[];let sim;
  const f=fixture({onEffect:event=>{events.push(event);results.push(sim.applyHeroEffect(event));}});sim=f.sim;
  sim.step(30);sim.moveHero(f.player.id,{x:0,y:0,z:0});sim.moveHero('bot-3',{x:0,y:0,z:12});
  f.bots.update(.05,{passive:true});
  const r=f.bots.runtimes[2];r.controller.yaw=0;r.controller.pitch=0;r.cast(1);
  f.bots.update(.05);
  const index=events.findIndex(e=>e.ability==='turret'&&e.kind==='damage');
  assert.ok(index>=0,'actual deployed turret reaches host callback');assert.equal(results[index].ok,true);
  const deployment=r.deployments.find(d=>d.definition.id==='turret');
  assert.deepEqual(events[index].origin,{x:deployment.position.x,y:deployment.position.y+.9,z:deployment.position.z});
  const amount=results.reduce((sum,result,i)=>sum+(events[i].target===f.player.id?result.amount??0:0),0);
  assert.ok(Math.abs(500-f.player.hp-amount)<1e-8,'host callback replaces default, no doubled damage');
  const structure=r.targets.find(t=>t.kind==='structure');assert.equal(structure.radius,3);assert.equal(structure.height,10);
  sim.moveHero(f.player.id,{x:2,y:0,z:1});
  assert.equal(r.targets.find(t=>t.id===f.player.id).position.x,2,'targets follow replaced authority positions');
  f.bots.dispose();assert.equal(f.boxes.length,0,'disposal removes bot barricades');groups++;
}
console.log(`bots-test: ${groups} groups passed (5 bots/lanes/waves, shop, retreat, cooldowns, cover/passive, collision/respawn/recall, orbs, host callback/origins; Node scene only)`);
