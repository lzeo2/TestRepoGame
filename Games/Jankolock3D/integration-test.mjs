import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor/three.module.js';
import { createWorldData } from './world-data.mjs';
import { createSystems } from './systems.mjs';
import { matchWorld } from './match-world.mjs';
import { createBots } from './bots.mjs';
import { mountFixtures, runChain } from './integration-fixtures.mjs';
import { selfCheckPortrait } from './portrait.js';
const world=createWorldData(),kits=JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json',import.meta.url))).heroes;
const routed=matchWorld(world);
assert.deepEqual(routed.lanes.find(l=>l.id==='midway').waypoints.map(p=>[p.z,p.y]),[[-390,0],[-55,0],[-35,3],[35,3],[55,0],[390,0]]);
assert.ok(routed.lanes.filter(l=>l.id!=='midway').every(l=>l.waypoints.every(p=>p.y===0)));
assert.equal(world.lanes[1].waypoints,undefined); // World export stays immutable/byte-identical.
console.log('integration: lane heights follow real Midway bridge/ramp edges; no below-deck squads');
{
  const noop=()=>{};
  for(const lane of world.lanes) {
    const sim=createSystems(matchWorld(world)),hero=sim.addHero({id:'player',team:'carbon'});
    const controller={position:new THREE.Vector3(),warp(p){this.position.copy(p);},updateCamera:noop};
    const traveler={mode:'zip',cooldown:.8,ride:{stale:true}},station=world.stations.find(s=>s.lane===lane.id);
    const api=mountFixtures({sim,hero,controller,traveler,world,runtime:{update:noop,aim:noop},view:{camera:{},syncStructures:noop,renderCamera:noop},actors:{sync:noop},ui:{update:noop},history:[]});
    const receipt=api.zip(lane.id);
    assert.deepEqual(receipt,{time:0,cooldown:0,position:station.a});
    assert.equal(traveler.mode,'free');assert.equal(traveler.ride,null);
    assert.deepEqual(controller.position.toArray(),[station.a.x,station.a.y,station.a.z]);
    assert.deepEqual(hero.position,station.a);
    assert.ok(Object.isFrozen(receipt)&&Object.isFrozen(receipt.position));
    const x=receipt.position.x;traveler.x+=7;controller.position.x+=9;hero.position.x+=11;
    assert.equal(receipt.position.x,x);assert.equal(station.a.x,x);
  }
  console.log('integration: fresh zip placement resets stale cooldown/ride; detached frozen setup receipts, all three lanes passed (mock host, real systems)');
}
for(const team of ['carbon','ivory']) {
  const sim=createSystems(matchWorld(world)),player=sim.addHero({id:'player',team:'carbon'});
  assert.equal(sim.configureHeroKit(player.id,kits[0]).ok,true);
  const bots=createBots({sim,scene:new THREE.Scene(),world,kits});
  assert.equal(sim.heroes.length,6);assert.equal(bots.runtimes.length,5);
  sim.step(.15); // Browser starts the fixture between whole-second boundaries.
  const receipt=runChain(sim,team);
  assert.equal(receipt.time,600);assert.equal(receipt.winner,team);
  const falls=receipt.events.filter(e=>e.type==='objective_fall'&&e.team!==team);
  assert.equal(falls.length,19);
  for(const lane of sim.lanes) {
    const events=falls.filter(e=>e.lane===lane.id),at=type=>events.filter(e=>e.objective===type).map(e=>e.time);
    assert.ok(at('guardian')[0]<at('walker')[0]);assert.ok(Math.min(...at('base-guardian'))>at('walker')[0]);
    assert.ok(Math.min(...at('shrine'))>Math.max(...at('base-guardian')));
  }
  const phase2=receipt.events.find(e=>e.type==='patron_phase'&&e.team!==team),victory=receipt.events.find(e=>e.type==='victory');
  assert.ok(phase2.time>Math.max(...falls.filter(e=>e.objective==='shrine').map(e=>e.time)));
  assert.ok(victory.time>phase2.time);
  assert.ok(bots.runtimes.every(r=>r.controller.ramps===world.ramps));
  bots.dispose();console.log(`integration: six configured heroes; ${team} 600s chain, 19 falls and distinct Patron phases passed`);
}
{
  const sim=createSystems(world),h=sim.addHero({id:'player',team:'carbon'});
  sim.step(30);const t=sim.troopers.find(t=>t.team==='ivory');sim.moveHero(h.id,t.position);
  sim.damage(t.id,1000,h.id,{kind:'ability'});const orb=sim.orbs.find(o=>o.type==='floating');
  assert.equal(sim.shootOrb(h.id,orb.id,{kitShot:true}).ok,false);
  sim.configureHeroKit(h.id,kits[0]);const ammo=h.ammo;
  assert.equal(sim.shootOrb(h.id,orb.id,{kitShot:true}).ok,true);assert.equal(h.ammo,ammo);
  assert.equal(sim.shootOrb(h.id,orb.id,{kitShot:true}).ok,false);assert.equal(h.souls,40);
  assert.equal(sim.shootOrb(h.id,orb.id,{kitShot:'yes'}).ok,false);
  console.log('integration: configured-runtime orb shot consumes no second magazine; duplicate/unconfigured/invalid requests rejected');
}
const bytes=readFileSync(new URL('./models/portrait_relief.glb',import.meta.url));
console.log(await selfCheckPortrait(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)));
const catalog=JSON.parse(readFileSync(new URL('../../games.json',import.meta.url)));
assert.equal(catalog.length,127);assert.equal(new Set(catalog.map(g=>g.id)).size,127);
assert.equal(catalog.find(g=>g.id===240).url,'Games/Jankolock3D/index.html');
for(const g of catalog)for(const key of ['id','title','cat','icon','desc','url','featured'])assert.ok(Object.hasOwn(g,key),`${g.id}/${key}`);
console.log('integration: catalog parses, 127 unique IDs, schema fields present, id240 targets integrated page');
