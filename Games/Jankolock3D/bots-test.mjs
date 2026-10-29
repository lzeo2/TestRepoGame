import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor/three.module.js';
import { createSystems } from './systems.mjs';
import { createWorldData } from './world-data.mjs';
import { createBots } from './bots.mjs';
import { preloadHeroes } from './character-assets.mjs';
await preloadHeroes();

const {heroes:kits}=JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json',import.meta.url)));
let groups=0;
function fixture({souls=0,world={boxes:[],ramps:[]},floorHeight,onEffect,heroKits=kits}={}) {
  const sim=createSystems(world.lanes?world:undefined), scene=new THREE.Scene(), boxes=[...world.boxes];
  const player=sim.addHero({id:'player',team:'carbon',lane:'midway'});
  // Explicit public import-state fixture, never a production bot reward.
  const addHero=sim.addHero;
  sim.addHero=options=>addHero({souls,...options}); // Explicit actor seeds stay public addHero inputs.
  const bots=createBots({sim,scene,world,kits:heroKits,boxes,floorHeight:floorHeight??(world.lanes?undefined:()=>0),onEffect});
  const tick=(seconds,options)=>{for(let i=0;i<Math.round(seconds/.05);i++){sim.step(.05);bots.update(.05,options);}};
  return {sim,scene,boxes,player,bots,tick};
}
{
  const f=fixture();
  assert.equal(f.sim.heroes.length,10);assert.equal(f.bots.runtimes.length,9);
  assert.deepEqual(f.bots.snapshot().map(b=>[b.id,b.team,b.lane]),[
    ['bot-1','carbon','graft'],['bot-2','carbon','greenhedge'],['bot-3','ivory','graft'],['bot-4','ivory','midway'],['bot-5','ivory','greenhedge'],
    ['bot-6','carbon','midway'],['bot-7','carbon','graft'],['bot-8','carbon','greenhedge'],['bot-9','carbon','midway']
  ]);
  assert.equal(f.scene.children.length,9,'nine real runtime visuals, no renderer');
  f.tick(2);
  assert.ok(f.bots.snapshot()[0].position.x<-10,'carbon ally heads to graft');
  assert.ok(f.bots.snapshot()[1].position.x>10,'carbon ally heads to greenhedge');
  assert.ok(f.bots.snapshot()[3].position.z<425,'ivory heads down its lane');
  f.tick(38);
  for(const bot of f.bots.snapshot()) {
    const lane=f.sim.lanes.find(l=>l.id===bot.lane);
    assert.ok(Math.abs(bot.position.x-lane.x)<2,'reaches assigned lane, not diagonal through city');
    const sign=bot.team==='carbon'?1:-1;
    assert.ok(bot.position.z*sign>-400,'advances along its assigned lane toward the public enemy objective');
    assert.equal(bot.mode,'lane');
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
  assert.equal(f.sim.events.filter(e=>e.type==='purchase').length,9);
  f.bots.update(.05);assert.equal(f.sim.events.filter(e=>e.type==='purchase').length,9,'no duplicate purchases');
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
  assert.equal(r.shots,0);assert.equal(f.player.hp,500,'first sight does not instantly attack');
  assert.deepEqual(f.sim.heroes.find(h=>h.id==='bot-4').aiTelegraph,{targetId:f.player.id,started:f.sim.time,releaseAt:f.sim.time+.3});
  f.tick(.25);assert.equal(r.shots,0);assert.equal(f.player.hp,500,'preparation has a real time budget');
  f.tick(.05);
  assert.equal(r.shots,1);assert.ok(f.player.hp<500,'default effect callback applies actual systems damage after preparation');
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
  assert.equal(f.player.hp,500,'removing cover starts preparation, not immediate damage');
  f.tick(.3);assert.ok(f.player.hp<500,'removing cover permits prepared real combat');
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
  f.bots.update(0); // End passive setup before the real deployment-start, without autonomous casts.
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
{
  for(const mode of ['death','reset','dispose','passive','finished']) {
    const events=[],results=[];let sim;
    const f=fixture({onEffect:event=>{events.push(event);results.push(sim.applyHeroEffect(event));}});sim=f.sim;
    sim.step(30);sim.moveHero(f.player.id,{x:0,y:0,z:0});sim.moveHero('bot-4',{x:0,y:0,z:20});
    f.bots.update(0); // Refresh/warp without autonomous casts.
    const r=f.bots.runtimes[3];r.controller.yaw=0;r.controller.pitch=0;
    assert.equal(r.cast(2),true);assert.equal(r.tether.targetId,f.player.id);
    assert.equal(sim.stats(f.player.id).moveSpeed,4,mode);
    const hp=f.player.hp;
    assert.equal(events.length,1);assert.equal(results[0].ok,true);
    assert.equal(500-hp,results[0].amount,'host damage is applied exactly once');
    if(mode==='death') {
      assert.ok(sim.damage('bot-4',10000,f.player.id,{kind:'ability'}).killed);
      f.bots.update(.05);
    } else if(mode==='dispose') f.bots.dispose();
    else if(mode==='passive') {
      f.boxes.push({minX:-5,maxX:5,minY:0,maxY:8,minZ:9,maxZ:10});
      f.bots.update(.05,{passive:true}); // Cover break still revokes the linked slow.
    } else {
      if(mode==='finished') sim.phase='finished'; // Explicit inactive-host fixture, not win evidence.
      r.reset();
    }
    assert.equal(r.tether,null,mode);assert.equal(sim.stats(f.player.id).moveSpeed,8,mode);
    assert.equal(events.filter(e=>e.kind==='tether-end').length,1,mode);
    assert.ok(results.every(result=>result.ok),mode);
    assert.equal(f.player.hp,hp,'cleanup never deals damage');
    if(mode!=='reset') {
      r.emit('damage',r.kit.abilities[1],{id:f.player.id});
      assert.equal(events.length,2,'inactive damage never reaches host');
    }
    r.reset();f.bots.dispose();f.bots.dispose();
    assert.equal(events.length,2,'cleanup is forwarded once, never default-applied again');
    const cleanup={...events[1],ability:'longshot'};
    r.onEffect(cleanup);
    assert.equal(results.at(-1).ok,false,'host still rejects invalid cleanup ability');
    assert.equal(f.player.hp,hp);
  }
  groups++;
}
{
  const f=fixture();f.sim.step(30);
  f.sim.moveHero('bot-1',{x:0,y:0,z:0});f.sim.moveHero('bot-4',{x:0,y:0,z:20});
  f.bots.update(0); // Real runtimes/authority, no autonomous action this frame.
  const r=f.bots.runtimes[3],victim=f.sim.heroes.find(h=>h.id==='bot-1');
  r.controller.yaw=0;r.controller.pitch=0;assert.equal(r.snapshot().tether,null);
  assert.equal(r.cast(2),true);assert.equal(r.tether.targetId,victim.id);
  const state=JSON.stringify({time:f.sim.time,heroes:f.sim.heroes,events:f.sim.events});
  const snapshots=f.bots.snapshot(),source=snapshots.find(b=>b.id==='bot-4'),target=snapshots.find(b=>b.id===victim.id);
  for(const bot of snapshots) {
    assert.equal(bot.hp,f.sim.heroes.find(h=>h.id===bot.id).hp);
    assert.equal(bot.moveSpeed,f.sim.stats(bot.id).moveSpeed);
  }
  assert.deepEqual(source.runtime.tether,{targetId:victim.id,left:r.kit.abilities[1].duration});
  assert.ok(target.moveSpeed<8);const hp=victim.hp,speed=target.moveSpeed;
  source.runtime.tether.targetId='detached';source.runtime.tether.left=-1;target.hp=-1;target.moveSpeed=-1;
  assert.equal(JSON.stringify({time:f.sim.time,heroes:f.sim.heroes,events:f.sim.events}),state,'snapshot reads/writes are observational');
  assert.equal(r.tether.targetId,victim.id);assert.equal(victim.hp,hp);assert.equal(f.sim.stats(victim.id).moveSpeed,speed);
  r.update(.05);assert.equal(r.snapshot().tether.left,r.kit.abilities[1].duration-.05);
  assert.equal(source.runtime.tether.left,-1,'no live lifetime reference');
  r.reset();const unlinked=f.bots.snapshot();
  assert.equal(unlinked.find(b=>b.id==='bot-4').runtime.tether,null);
  assert.equal(unlinked.find(b=>b.id===victim.id).moveSpeed,8);
  assert.equal(unlinked.find(b=>b.id===victim.id).hp,hp);
  f.bots.dispose();groups++;
}
{
  // Synthetic original-ID pure slow; wrapper/terrain/phase checks are production code.
  const heroKits=structuredClone(kits),a=heroKits[0].abilities[1],events=[],results=[];let sim,terrain=false;
  Object.assign(a,{baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:2,range:12});
  const f=fixture({heroKits,floorHeight:(x,z)=>terrain&&z>3&&z<5?5:0,
    onEffect:event=>{events.push(event);results.push(sim.applyHeroEffect(event));}});sim=f.sim;
  sim.step(30);sim.moveHero(f.player.id,{x:0,y:0,z:0});sim.moveHero('bot-5',{x:0,y:0,z:8});f.bots.update(0);
  const r=f.bots.runtimes[4];r.controller.yaw=0;r.controller.pitch=0;
  assert.equal(r.targets.find(t=>t.id===f.player.id).kind,'hero');
  const hp=f.player.hp,ammo=r.ammo,souls=sim.heroes.map(h=>h.souls);
  assert.ok(r.cast(2));assert.equal(events.length,1);assert.equal(events[0].kind,'status');assert.ok(results[0].ok);
  assert.equal(sim.stats(f.player.id).moveSpeed,4.8);assert.equal(f.player.hp,hp);assert.equal(r.ammo,ammo);
  assert.deepEqual(sim.heroes.map(h=>h.souls),souls);
  const emit=()=>r.emit('status',a,{id:f.player.id});
  terrain=true;emit();assert.equal(events.length,1,'status gets the same extra terrain visibility gate as damage');terrain=false;
  f.boxes.push({minX:-5,maxX:5,minY:0,maxY:8,minZ:3,maxZ:4});emit();
  assert.equal(events.length,1,'box cover suppresses hostile status');f.boxes.length=0;
  f.bots.update(0,{passive:true});emit();assert.equal(events.length,1,'passive status is suppressed');f.bots.update(0);
  for(const phase of ['pregame','finished']) {
    sim.phase=phase;emit();assert.equal(events.length,1,`${phase} status is suppressed`);
  }
  sim.phase='laning'; // Explicit inactive-host negative fixtures above, not match progression evidence.
  r.onEffect({...events[0],source:'missing'});assert.equal(events.length,2);assert.equal(results.at(-1).ok,false,'source remains systems-validated');
  assert.equal(f.player.hp,hp);assert.equal(sim.stats(f.player.id).moveSpeed,4.8);
  assert.ok(sim.damage('bot-5',10000,f.player.id,{kind:'ability'}).killed);emit();assert.equal(events.length,2,'dead-source status is suppressed');
  f.bots.dispose();emit();assert.equal(events.length,2,'disposed status is suppressed');groups++;
}
// Real host/runtime cleanup, CPU placement only; no native or geometry claim.
{
  for(const mode of ['passive','dispose','death','finished']) {
    const events=[],results=[];let sim;
    const f=fixture({onEffect:event=>{events.push(event);results.push(sim.applyHeroEffect(event));}});sim=f.sim;
    sim.step(30);sim.moveHero(f.player.id,{x:0,y:0,z:0});sim.moveHero('bot-3',{x:0,y:0,z:8});f.bots.update(0);
    const r=f.bots.runtimes[2];r.controller.yaw=0;r.controller.pitch=0;
    assert.ok(r.cast(1));const deploy=r.deployments.find(d=>d.definition.id==='turret');
    const start=events.find(e=>e.kind==='deployment-start');assert.ok(start&&Number.isSafeInteger(start.deploymentId));
    assert.ok(results.every(result=>result.ok));
    const pulse={...start,kind:'damage',target:f.player.id,origin:{x:deploy.position.x,y:deploy.position.y+.9,z:deploy.position.z}};
    assert.ok(sim.applyHeroEffect(pulse).ok);
    if(mode==='passive'){f.bots.update(0,{passive:true});r.reset();}
    if(mode==='dispose')f.bots.dispose();
    if(mode==='death'){assert.ok(sim.damage('bot-3',10000,f.player.id,{kind:'ability'}).killed);f.bots.update(0);}
    if(mode==='finished'){sim.phase='finished';r.reset();} // Explicit negative phase fixture.
    const end=events.find(e=>e.kind==='deployment-end');assert.ok(end,mode);
    assert.equal(events.filter(e=>e.kind==='deployment-end').length,1,mode);
    assert.ok(results.every(result=>result.ok),mode);
    const hp=f.player.hp;assert.equal(sim.applyHeroEffect(pulse).ok,false,mode);assert.equal(f.player.hp,hp);
    r.onEffect(end);assert.deepEqual(results.at(-1),{ok:true,ended:false},'late cleanup survives all inactive bot gates');
    assert.equal(f.player.hp,hp);f.bots.dispose();f.bots.dispose();
  }
  groups++;
}
// CPU host ACK propagation, not native input/terrain acceptance.
{
  let sim,calls=0;const f=fixture({onEffect:event=>{calls++;return sim.applyHeroEffect(event);}});sim=f.sim;
  sim.step(30);sim.moveHero(f.player.id,{x:0,y:0,z:0});sim.moveHero('bot-4',{x:0,y:0,z:20});f.bots.update(0);
  const r=f.bots.runtimes[3],w=kits[2].weapon;
  const event={kind:'damage',source:'bot-4',target:f.player.id,ability:w.name,baseDamage:w.baseDamage,damageType:w.damageType};
  assert.equal(r.onEffect(event)?.ok,true,'actual host acceptance reaches producer');const hp=f.player.hp;
  const rejected=r.onEffect({...event,baseDamage:w.baseDamage+1});assert.equal(rejected?.ok,false);assert.equal(rejected.reason,'invalid baseDamage');assert.equal(f.player.hp,hp);
  assert.equal(calls,2);f.bots.update(0,{passive:true});assert.equal(r.onEffect(event),undefined);assert.equal(calls,2);
  f.bots.update(0);const wall={minX:-5,maxX:5,minY:0,maxY:6,minZ:9,maxZ:10};f.boxes.push(wall);
  assert.equal(r.onEffect(event),undefined);assert.equal(calls,2,'terrain still suppresses callback/ACK');assert.equal(f.player.hp,hp);
  f.boxes.splice(f.boxes.indexOf(wall),1);assert.ok(sim.damage('bot-4',10000,f.player.id,{kind:'ability'}).killed);f.bots.update(0);
  assert.equal(r.onEffect(event),undefined);assert.equal(calls,2,'dead source still suppressed');assert.equal(f.player.hp,hp);
  f.bots.dispose();groups++;
}
// Native runtime buff starts + real Host cleanup admission, CPU scene only.
// Explicit emit tests the bridge independently of the concurrent reset-emission lane.
{
  for(const id of ['overtime','headshot'])for(const mode of ['passive','finished','dead','dispose']) {
    if(id==='overtime'&&mode==='dead')continue; // Real Overtime invulnerability prevents an API kill while active.
    let sim;const events=[],results=[],f=fixture({onEffect:event=>{events.push(event);const result=sim.applyHeroEffect(event);results.push(result);return result;}});sim=f.sim;
    sim.step(30);f.bots.update(0);
    const index=id==='overtime'?0:3,r=f.bots.runtimes[index],h=sim.heroes.find(h=>h.id===`bot-${index+1}`),a=r.kit.abilities.find(a=>a.id===id);
    assert.ok(r.cast(a.slot));assert.equal(results.at(-1).ok,true);
    if(id==='overtime'){assert.equal(sim.stats(h.id).invulnerable,true);assert.equal(sim.stats(h.id).moveSpeed,12);}
    if(mode==='passive')f.bots.update(0,{passive:true});
    if(mode==='finished')sim.phase='finished'; // Negative public-phase fixture, not match completion evidence.
    if(mode==='dead'){sim.moveHero(h.id,{x:0,y:0,z:8});sim.moveHero(f.player.id,{x:0,y:0,z:0});assert.ok(sim.damage(h.id,10000,f.player.id,{kind:'ability'}).killed);f.bots.update(0);}
    if(mode==='dispose')f.bots.dispose();
    assert.equal(r.emit('buff-end',a,{id:h.id})?.ok,true,`${id}/${mode} cleanup forwarded`);
    assert.equal(sim.stats(h.id).invulnerable,false);assert.equal(sim.stats(h.id).moveSpeed,8);
    const before=structuredClone({heroes:sim.heroes,events:sim.events,stats:sim.stats(h.id)});
    assert.equal(r.emit('buff-end',a,{id:h.id})?.ok,true);
    assert.deepEqual({heroes:sim.heroes,events:sim.events,stats:sim.stats(h.id)},before,'late cleanup is idempotent');
    const count=events.length;
    for(const kind of ['buff','damage','status'])assert.equal(r.emit(kind,a,kind==='buff'?{id:h.id}:f.player),undefined);
    assert.equal(events.length,count,'combat/start filters remain intact');assert.ok(results.every(result=>result.ok));
    f.bots.dispose();f.bots.dispose();
  }
  groups++;
}
// Real purchased cloak, imported initial currency ONLY, not economy progression.
function cloakActor(f,id,team,position) {
  const actor=f.sim.addHero({id,team,souls:3200,position:f.sim.bases[team]});assert.equal(actor.souls,3200);assert.ok(f.sim.buyItem(id,'shadow-cloak').ok);assert.equal(actor.souls,0);assert.ok(f.sim.moveHero(id,position).ok);return actor;
}
for(const team of ['carbon','ivory']) {
  let sim;const events=[],results=[],heroKits=team==='carbon'?[kits[1],kits[0],kits[2],kits[3]]:kits;
  const f=fixture({heroKits,onEffect:event=>{events.push(event);const result=sim.applyHeroEffect(event);results.push(result);return result;}});sim=f.sim;assert.ok(sim.step(30).ok);
  const sourceID=team==='carbon'?'bot-1':'bot-3',index=team==='carbon'?0:2,r=f.bots.runtimes[index],enemyTeam=team==='carbon'?'ivory':'carbon';assert.equal(r.kit.id,'turretina');assert.ok(sim.moveHero(sourceID,{x:0,y:0,z:8}).ok);
  const actor=cloakActor(f,`cloaked-${team}-enemy`,enemyTeam,{x:.55,y:0,z:0});f.bots.update(0,{passive:true});f.bots.update(0);r.controller.yaw=0;r.controller.pitch=0;
  const descriptor=r.targets.find(t=>t.id===actor.id);assert.equal(descriptor.autoTargetable,true);assert.equal(Object.getOwnPropertyDescriptor(descriptor,'autoTargetable').set,undefined);assert.equal(typeof Object.getOwnPropertyDescriptor(descriptor,'autoTargetable').get,'function');assert.throws(()=>{descriptor.autoTargetable=false;},TypeError);
  assert.equal(descriptor,f.bots.runtimes[(index+1)%9].targets.find(t=>t.id===actor.id),'all bots share one live descriptor view');assert.ok(r.cast(1));assert.ok(sim.activateItem(actor.id,'shadow-cloak').ok);
  assert.equal(descriptor.autoTargetable,false,'pre-activation descriptor reads real Host cloak without refresh');assert.equal(descriptor.alive,true);assert.equal(descriptor.kind,actor.kind);assert.equal(descriptor.team,actor.team);assert.equal(descriptor.radius,.6);assert.equal(descriptor.height,1.8);
  assert.ok(sim.moveHero(actor.id,{x:1,y:0,z:.5}).ok);assert.equal(descriptor.position,actor.position);const hp=actor.hp,cloak=actor.cloakUntil;
  r.update(.05);assert.equal(actor.hp,hp);assert.equal(actor.cloakUntil,cloak);assert.equal(events.filter(e=>e.source===sourceID&&e.ability==='turret'&&e.kind==='damage').length,0);assert.equal([...r.fx.handles.keys()].filter(h=>h.group.name==='longshot').length,0,'hidden target produces no autonomous turret shot FX');
  f.bots.update(.05);assert.notEqual(f.bots.snapshot().find(b=>b.id===sourceID).targetId,actor.id,'Bot.enemyFor also excludes hidden hostile');assert.equal(actor.hp,hp);assert.equal(actor.cloakUntil,cloak);
  if(team==='carbon'){assert.ok(sim.damage(actor.id,1,sourceID,{kind:'ability'}).ok);assert.equal(actor.cloakUntil,0);}else {for(let i=0;i<102&&sim.time<cloak;i++)assert.ok(sim.step(.05).ok);assert.ok(sim.time>=cloak);}
  assert.equal(descriptor.autoTargetable,true,'old captured getter follows injury/Host-clock reveal, not Runtime.time');const before=actor.hp;
  for(let i=0;i<Math.ceil(r.kit.abilities[0].interval/.05)+2&&!events.some(e=>e.source===sourceID&&e.ability==='turret'&&e.kind==='damage');i++){r.update(.05);assert.ok(sim.step(.05).ok);}
  assert.ok(actor.hp<before,'registered autonomous turret resumes actual Host HP after reveal');assert.ok(events.some(e=>e.source===sourceID&&e.ability==='turret'&&e.kind==='damage'));assert.ok(results.every(v=>v.ok));f.bots.dispose();assert.equal(f.scene.children.length,0);groups++;
}
{
  let sim;const events=[],results=[],f=fixture({onEffect:event=>{events.push(event);const result=sim.applyHeroEffect(event);results.push(result);return result;}});sim=f.sim;assert.ok(sim.step(30).ok);
  assert.ok(sim.moveHero('bot-2',{x:0,y:0,z:8}).ok);const ally=cloakActor(f,'cloaked-healing-ally','carbon',{x:1,y:0,z:6});assert.ok(sim.moveHero('bot-3',{x:1,y:0,z:5}).ok);assert.ok(sim.damage(ally.id,100,'bot-3',{kind:'ability'}).ok);assert.ok(sim.moveHero('bot-3',sim.bases.ivory).ok);
  f.bots.update(0,{passive:true});f.bots.update(0);const r=f.bots.runtimes[1];assert.equal(r.kit.id,'gooey');const descriptor=r.targets.find(t=>t.id===ally.id);assert.ok(sim.activateItem(ally.id,'shadow-cloak').ok);assert.equal(descriptor.autoTargetable,false);assert.equal(descriptor.alive,true);
  const hp=ally.hp,cloak=ally.cloakUntil;r.controller.yaw=0;r.controller.pitch=0;assert.ok(r.cast(4));r.update(.05);assert.equal(ally.hp,hp+r.kit.abilities[3].baseHeal);assert.equal(ally.cloakUntil,cloak);assert.ok(cloak>sim.time);assert.equal(events.filter(e=>e.kind==='heal'&&e.target===ally.id).length,1,'automatic eligibility does not suppress allied native healing');
  const hostile=cloakActor(f,'manual-cloaked-hostile','ivory',{x:.55,y:0,z:6});f.bots.update(0);const hidden=r.targets.find(t=>t.id===hostile.id);assert.ok(sim.activateItem(hostile.id,'shadow-cloak').ok);assert.equal(hidden.autoTargetable,false);assert.equal(hidden.alive,true);const hostileHP=hostile.hp;
  // Direct native Runtime cast is a CPU manual/committed path, NOT AI acquisition.
  r.controller.yaw=0;r.controller.pitch=0;assert.ok(r.cast(2));assert.ok(hostile.hp<hostileHP,'manual native cone is not granted cloak immunity');assert.equal(hostile.cloakUntil,0);assert.equal(ally.cloakUntil,cloak);assert.ok(results.every(v=>v.ok));f.bots.dispose();assert.equal(f.scene.children.length,0);groups++;
}
// Real HP/cooldowns through the shared host. No runtime reset cancels preparation.
for (const loss of ['cover','terrain','range','death','cloak','passive','finished']) {
  let terrain=false;
  const f=fixture({floorHeight:(x,z)=>terrain&&z>8&&z<10?8:0});f.sim.step(30);
  const target=cloakActor(f,`aim-${loss}`,'carbon',{x:0,y:0,z:0});
  f.sim.moveHero('bot-4',{x:0,y:0,z:20});f.bots.update(0);
  const r=f.bots.runtimes[3],h=f.sim.heroes.find(h=>h.id==='bot-4');
  assert.ok(r.cast(4));const cost=r.cooldowns[4],ammo=r.ammo,initialHP=target.hp;
  f.bots.update(.05);f.tick(.15);
  assert.equal(h.aiTelegraph.targetId,target.id);assert.equal(target.hp,initialHP);assert.equal(r.shots,0);
  const snap=f.bots.snapshot()[3];snap.aiTelegraph.releaseAt=-1;h.aiTelegraph.releaseAt=-1;
  f.bots.update(.05);assert.equal(r.shots,0,'presentation edits cannot release an attack');
  assert.ok(h.aiTelegraph.releaseAt>f.sim.time);
  if(loss==='cover')f.boxes.push({minX:-5,maxX:5,minY:0,maxY:8,minZ:9,maxZ:10});
  if(loss==='terrain')terrain=true;
  if(loss==='range')f.sim.moveHero(target.id,{x:0,y:0,z:-100});
  if(loss==='death')assert.ok(f.sim.damage(target.id,10000,'bot-4',{kind:'ability'}).killed);
  if(loss==='cloak')assert.ok(f.sim.activateItem(target.id,'shadow-cloak').ok);
  if(loss==='finished')f.sim.phase='finished';
  const hp=target.hp;
  f.tick(.25,{passive:loss==='passive'});
  assert.equal(h.aiTelegraph,null,loss);assert.equal(f.bots.snapshot()[3].targetId,null,loss);
  assert.equal(target.hp,hp,`${loss} prevents a stale attack`);assert.equal(r.shots,0);
  assert.equal(r.ammo,ammo);assert.ok(r.cooldowns[4]>0&&r.cooldowns[4]<cost,'accepted cooldown continues without refund/reset');
  if(loss==='cover'||loss==='terrain'||loss==='range') {
    f.boxes.length=0;terrain=false;f.sim.moveHero(target.id,{x:0,y:0,z:0});
    f.bots.update(.05);f.tick(.25);assert.equal(target.hp,hp,'reacquisition needs fresh preparation');
    f.tick(.05);assert.ok(target.hp<hp,'reacquired target receives real host HP damage');
    const shots=r.shots,casts=r.castCount.longshot;
    f.tick(.05);assert.equal(r.shots,shots);assert.equal(r.castCount.longshot,casts,'repeated cooldown is respected');
    f.tick(1);assert.ok(r.shots>shots,'weapon resumes through its ordinary cooldown');
    assert.equal(r.castCount.longshot,casts,'longshot cannot recast during its longer cooldown');
  }
  f.bots.dispose();assert.equal(h.aiTelegraph,null);assert.equal(f.scene.children.length,0);groups++;
}
{
  const f=fixture();f.sim.step(30);f.sim.moveHero(f.player.id,{x:0,y:0,z:0});
  f.sim.moveHero('bot-4',{x:0,y:0,z:41});f.bots.update(.05);
  assert.equal(f.bots.snapshot()[3].targetId,null,'sniper ability range never expands 40-unit perception');
  assert.equal(f.player.hp,500);assert.equal(f.bots.runtimes[3].shots,0);
  f.sim.moveHero('bot-4',{x:0,y:0,z:39.9});f.bots.update(.05);
  assert.equal(f.bots.snapshot()[3].targetId,f.player.id,'just inside perception is acquired');
  assert.equal(f.player.hp,500);f.tick(.3);assert.ok(f.player.hp<500);
  f.bots.dispose();groups++;
}
{
  const f=fixture();f.sim.step(30);f.sim.moveHero('bot-4',{x:0,y:0,z:100});f.bots.update(0);
  const h=f.sim.heroes.find(h=>h.id==='bot-4'),start=h.position.z;
  f.tick(.5);assert.ok(h.position.z<start,'healthy bot advances even ahead of the friendly front');
  f.sim.step(25);const before=h.position.z;f.tick(.5);
  assert.ok(h.position.z<before,'newly spawned rear wave does not pull healthy bot backwards');
  assert.equal(f.bots.snapshot()[3].targetId,null,'public objective navigation does not acquire an unseen hero');
  f.bots.dispose();groups++;
}
console.log('bots-test: live readonly automatic eligibility on both teams, purchased cloak/real reveal, hidden allied aura and manual cone non-immunity checked; initial currency is imported CPU item setup only');
console.log(`bots-test: ${groups} groups passed (9 bots/lanes/waves, shop, retreat, cooldowns, cover/passive, collision/respawn/recall, orbs, host callback/origins, tether cleanup on death/reset/dispose/passive/finished, detached observational HP/speed/tether snapshots; Node scene only)`);
