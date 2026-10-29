import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor/three.module.js';
import { createSystems } from './systems.mjs';
import { createBots } from './bots.mjs';
import { preloadHeroes } from './character-assets.mjs';
await preloadHeroes();
const {heroes:kits}=JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json',import.meta.url)));
const allies=['bot-1','bot-2','bot-6','bot-7','bot-8','bot-9'], foes=['bot-3','bot-4','bot-5'];
let groups=0;
function fixture(team) {
  const sim=createSystems(),scene=new THREE.Scene(),world={boxes:[],ramps:[]},effects=[];
  const player=sim.addHero({id:'player',team,lane:'midway'});
  const bots=createBots({sim,scene,world,kits,floorHeight:()=>0,onEffect:event=>{
    const result=sim.applyHeroEffect(event);effects.push({event,result});return result;
  }});
  const tick=seconds=>{for(let i=0;i<Math.round(seconds/.05);i++){assert.ok(sim.step(.05).ok);bots.update(.05);}};
  const move=(id,p)=>assert.ok(sim.moveHero(id,p).ok);
  return {sim,scene,world,player,bots,effects,tick,move};
}
function roster(f,team) {
  assert.equal(f.sim.heroes.length,10);assert.equal(new Set(f.sim.heroes.map(h=>h.id)).size,10);
  assert.equal(f.bots.runtimes.length,9);assert.equal(f.scene.children.length,9);
  assert.equal(f.sim.heroes.filter(h=>h.team===team).length,7);
  assert.deepEqual(f.bots.snapshot().filter(h=>h.team===team).map(h=>h.id),allies);
  assert.deepEqual(f.bots.snapshot().filter(h=>h.team!==team).map(h=>h.id),foes);
}
for(const team of ['carbon','ivory']) {
  // Public placement/clock setup in a flat CPU world, not native navigation proof.
  const f=fixture(team);roster(f,team);
  const initial=f.sim.heroes.slice();
  assert.throws(()=>createBots({sim:f.sim,scene:f.scene,world:f.world,kits}),/already registered/);
  assert.deepEqual(f.sim.heroes,initial);assert.equal(f.scene.children.length,9);
  assert.ok(f.sim.step(30).ok);
  f.move('bot-4',{x:0,y:0,z:20});
  for(const id of allies) {
    f.move(id,{x:0,y:0,z:0});
    assert.ok(f.sim.damage(id,10000,'bot-4',{kind:'ability'}).killed);
  }
  f.bots.update(0,{passive:true});roster(f,team);
  assert.ok(allies.every(id=>!f.sim.heroes.find(h=>h.id===id).alive));
  assert.ok(f.sim.step(6).ok);f.bots.update(0,{passive:true});roster(f,team);
  for(const id of allies) {
    const hero=f.sim.heroes.find(h=>h.id===id);
    assert.ok(hero.alive);assert.equal(hero,initial.find(h=>h.id===id));
    assert.deepEqual(hero.position,f.sim.bases[team]);
    const runtime=f.bots.runtimes.find(r=>r.source===id);
    assert.deepEqual(runtime.controller.position.toArray(),Object.values(hero.position));
  }
  f.bots.dispose();assert.equal(f.scene.children.length,0);
  const restart=fixture(team);roster(restart,team);
  assert.deepEqual(restart.bots.snapshot().map(h=>[h.id,h.team,h.lane,h.kit]),
    f.bots.snapshot().map(h=>[h.id,h.team,h.lane,h.kit]));
  restart.tick(40);roster(restart,team);
  for(const bot of restart.bots.snapshot().filter(h=>h.team===team)) {
    const lane=restart.sim.lanes.find(l=>l.id===bot.lane),sign=team==='carbon'?1:-1;
    assert.ok(Math.abs(bot.position.x-lane.x)<2,'allies navigate their objective lanes');
    assert.ok(bot.position.z*sign>-400,'allies advance without following the stationary human');
    assert.equal(bot.mode,'lane');
  }
  assert.deepEqual(restart.player.position,restart.sim.bases[team]);
  restart.bots.dispose();groups++;

  // Every ally independently acquires and fights a live hostile through its real kit.
  for(const id of allies) {
    const fight=fixture(team);assert.ok(fight.sim.step(30).ok);
    fight.move(id,{x:0,y:0,z:0});fight.move('bot-4',{x:0,y:0,z:15});
    const target=fight.sim.heroes.find(h=>h.id==='bot-4'),hp=target.hp;
    fight.bots.update(.05);assert.equal(target.hp,hp,'no instant attack on first sight');
    fight.tick(.3);
    assert.ok(target.hp<hp,`${team}/${id} causes actual enemy HP loss`);
    assert.ok(fight.effects.some(({event,result})=>event.source===id&&event.target===target.id&&event.kind==='damage'&&result.ok&&result.amount>0));
    const runtime=fight.bots.runtimes.find(r=>r.source===id);
    assert.ok(runtime.shots>0);assert.ok(runtime.ammo<runtime.kit.weapon.magazine||runtime.reload>0);
    fight.move('player',{x:2,y:0,z:0});
    const weapon=runtime.kit.weapon,allyHP=fight.player.hp;
    const rejected=fight.sim.applyHeroEffect({kind:'damage',source:id,target:'player',ability:weapon.name,baseDamage:weapon.baseDamage,damageType:weapon.damageType});
    assert.equal(rejected.ok,false);assert.equal(rejected.reason,'friendly fire');assert.equal(fight.player.hp,allyHP,'friendly fire never changes HP');
    fight.bots.dispose();groups++;
  }

  // Six active allies attack a real unlocked objective. No HP/status/cooldown grants.
  const push=fixture(team);assert.ok(push.sim.step(30).ok);
  const enemyTeam=team==='carbon'?'ivory':'carbon',sign=team==='carbon'?1:-1;
  const objective=push.sim.structures.find(s=>s.team===enemyTeam&&s.lane==='midway'&&s.type==='guardian');
  assert.ok(objective.alive&&objective.vulnerable);const hp=objective.hp;
  for(const [i,id] of allies.entries())push.move(id,{x:objective.position.x+(i-2.5)*1.5,y:0,z:objective.position.z-sign*12});
  push.bots.update(0);push.tick(6);
  for(const id of allies)assert.ok(push.effects.some(({event,result})=>event.source===id&&event.target===objective.id&&event.kind==='damage'&&result.ok&&result.amount>0),`${team}/${id} contributes objective HP`);
  assert.ok(objective.hp<hp);assert.equal(objective.alive,false);
  const accepted=push.effects.filter(({event,result})=>event.target===objective.id&&event.kind==='damage'&&result.ok);
  assert.ok(Math.abs(accepted.reduce((sum,{result})=>sum+result.amount,0)-hp)<1e-8,'accepted kit damage accounts for all objective HP');
  const fall=push.sim.events.find(e=>e.type==='objective_fall'&&e.id===objective.id);
  assert.ok(fall);assert.ok(allies.includes(fall.sourceId));assert.equal(fall.sourceKind,'hero');
  assert.ok(push.sim.structures.find(s=>s.team===enemyTeam&&s.lane==='midway'&&s.type==='walker').vulnerable,'real objective fall unlocks next goal');
  push.bots.dispose();groups++;
}
// Every reserved ID must fail before constructing even the first new bot.
for(let i=1;i<=9;i++) {
  const sim=createSystems(),scene=new THREE.Scene(),world={boxes:[],ramps:[]};
  sim.addHero({id:'player',team:'carbon'});sim.addHero({id:`bot-${i}`,team:'ivory'});
  const before=sim.heroes.slice();
  assert.throws(()=>createBots({sim,scene,world,kits}),/already registered/);
  assert.deepEqual(sim.heroes,before);assert.equal(scene.children.length,0);groups++;
}
console.log(`hero-team-test: ${groups} groups passed; both teams: 6 actual AI allies + human vs 3 foes, public death/respawn/fresh restart, reserved IDs, legal kit Host HP, friendly-fire rejection, six objective contributors and attributed objective_fall/unlock (CPU placement only)`);
