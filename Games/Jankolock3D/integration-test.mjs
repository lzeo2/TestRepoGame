import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor/three.module.js';
import { createWorldData } from './world-data.mjs';
import { createSystems } from './systems.mjs';
import { createBots } from './bots.mjs';
import { runChain } from './integration-fixtures.mjs';
import { selfCheckPortrait } from './portrait.js';
const world=createWorldData(),kits=JSON.parse(readFileSync(new URL('../../docs/jank3d-hero-kits.json',import.meta.url))).heroes;
for(const team of ['carbon','ivory']) {
  const sim=createSystems(world),player=sim.addHero({id:'player',team:'carbon'});
  assert.equal(sim.configureHeroKit(player.id,kits[0]).ok,true);
  const bots=createBots({sim,scene:new THREE.Scene(),world,kits});
  assert.equal(sim.heroes.length,6);assert.equal(bots.runtimes.length,5);
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
