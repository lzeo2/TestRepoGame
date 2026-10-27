// CPU visual-only fixture is explicitly separate from the real Host tests below.
// Protocol structure receipts are not native casts; no positive Host ACK is mocked.
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import { loadCharacter } from '../character-assets.mjs';
import { createSystems } from '../systems.mjs';
import { createSystemsLayer } from '../systems-view.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { PlayerController } from './player-controller.mjs';
import { odometerSlice } from './odometer-slice.mjs';
import { SPEED_TRAP as a } from './speed-trap.mjs';
await loadCharacter('trooper');await loadCharacter('odometer');
const point=(x=0,y=0,z=0)=>({x,y,z});
const worldPosition=node=>node.getWorldPosition(new THREE.Vector3()).toArray();
// Synthetic view INPUTS only: no Host, gameplay grant, HP, status, or ACK proof.
{
  const first={id:'first',position:point(20,2,30)},second={id:'second',position:point(-40,0,15)};
  const visible=new Set(['first','second']),input={heroes:[first,second],troopers:[],structures:[],orbs:[],isRevealedTo:(id,team)=>team==='carbon'&&visible.has(id)};
  const scene=new THREE.Scene(),otherScene=new THREE.Scene(),layer=createSystemsLayer(scene),other=createSystemsLayer(otherScene,{team:'ivory'});
  layer.sync(input);other.sync(input);assert.equal(otherScene.children.length,0);
  const group=scene.children[0],glyph=group.children.find(o=>!o.material?.wireframe),children=[...group.children];
  const check=actor=>{assert.deepEqual(group.position.toArray(),Object.values(actor.position));assert.deepEqual(worldPosition(glyph),[actor.position.x,actor.position.y+1.2,actor.position.z-.8]);};
  check(first);first.position=point(70,3,-20);layer.sync(input);check(first);
  visible.delete('first');layer.sync(input);check(second);assert.deepEqual(group.children,children);assert.equal(group.children.filter(o=>o.material?.wireframe&&o.visible).length,2);
  visible.add('first');for(let i=0;i<10;i++)layer.sync(input);check(first);assert.deepEqual(group.children,children);
  visible.clear();layer.sync(input);assert.equal(scene.children.length,0);assert.equal(group.children.length,0);layer.dispose();other.dispose();assert.equal(otherScene.children.length,0);
  console.log('PASS visual-only xray fixture: glyph follows first current input point through movement/membership, pooled cages, viewer routing and cleanup; NOT positive Host/gameplay evidence');
}
if(process.argv.includes('--negative')) {
  const sim=createSystems();sim.step(30);
  for(const team of ['carbon','ivory','invalid']) {
    const scene=new THREE.Scene(),layer=createSystemsLayer(scene,{team});
    for(let i=0;i<3;i++)layer.sync(sim);
    assert.equal(scene.children.some(o=>o.name==='xray'),false,'no Host reveal facts means no outline');
    layer.dispose();layer.dispose();assert.equal(scene.children.length,0);
  }
  console.log('PASS Speed Trap view negative only: no Host facts/no team leaks, real actor sync and idempotent cleanup; positive Host integration not run');
  process.exit(0);
}
const kit=structuredClone(odometerSlice);kit.abilities=kit.abilities.filter(x=>x.id!==a.id);kit.abilities.push({...a,fx:{color:'#73834e'}});
const s=createSystems();s.step(30);
const source=s.addHero({id:'source',team:'carbon',position:point()}),enemy=s.addHero({id:'enemy',team:'ivory',position:point(1)});
assert.ok(s.configureHeroKit(source.id,kit,{partialSlice:true}).ok);
const sourceScene=new THREE.Scene(),controller=new PlayerController({position:point(),boxes:[],floorHeight:()=>0});controller.pitch=-Math.PI/2;
const r=new HeroRuntime({scene:sourceScene,controller,kit,source:source.id,onEffect:event=>s.applyHeroEffect(event)});r.targets=[enemy];
const scene=new THREE.Scene(),otherScene=new THREE.Scene(),layer=createSystemsLayer(scene),other=createSystemsLayer(otherScene,{team:'ivory'});
const outline=scene=>scene.children.find(o=>o.name==='xray');
const cages=group=>group.children.filter(o=>o.material?.wireframe);
layer.sync(s);other.sync(s);assert.equal(outline(scene),undefined);assert.equal(outline(otherScene),undefined);
assert.ok(r.cast(2));for(let i=0;i<5;i++){assert.ok(s.step(.05).ok);r.update(.05);}
assert.ok(s.isRevealedTo(enemy.id,'carbon'));layer.sync(s);other.sync(s);
const group=outline(scene);assert.ok(group);assert.equal(outline(otherScene),undefined);assert.equal(cages(group).filter(o=>o.visible).length,2);
const [box,head]=cages(group),geometry=box.geometry,material=box.material;
assert.ok(s.moveHero(enemy.id,point(5,0,2)).ok);layer.sync(s);
assert.equal(outline(scene),group);assert.equal(cages(group)[0],box);assert.equal(box.geometry,geometry);assert.equal(box.material,material);
assert.deepEqual(worldPosition(box),[5,.95,2]);assert.deepEqual(worldPosition(head),[5,1.6,2]);
assert.deepEqual(worldPosition(group.children.find(o=>!o.material?.wireframe)),[5,1.2,1.2]);
for(let i=0;i<100;i++)layer.sync(s);assert.equal(outline(scene),group,'render/sync count never advances Host-owned reveal time');
r.dispose();assert.equal(sourceScene.children.length,0);layer.sync(s);assert.equal(outline(scene),group,'source Runtime cleanup cannot erase accepted team information');
assert.ok(s.damage(source.id,1e6,enemy.id,{kind:'ability'}).killed);layer.sync(s);assert.equal(outline(scene),group,'source death cannot erase another target’s accepted reveal tail');
assert.ok(s.step(1).ok);layer.sync(s);assert.equal(outline(scene),group);assert.ok(s.isRevealedTo(enemy.id,'carbon'));
assert.ok(s.step(.51).ok);layer.sync(s);assert.equal(s.isRevealedTo(enemy.id,'carbon'),false);assert.equal(outline(scene),undefined);assert.equal(group.children.length,0);
console.log('PASS Speed Trap view: real Runtime/Host reveal, viewer-team isolation, pooled current positions, zero-dt mirror, source Runtime-independent 1.5s tail and empty cleanup');

// Host protocol-only info receipt for an invulnerable objective and real trooper.
const structure=s.structures.find(x=>x.team==='ivory'&&x.alive&&!x.vulnerable);assert.ok(structure);
const scout=s.addHero({id:'scout',team:'carbon',position:{...structure.position}});assert.ok(s.configureHeroKit(scout.id,kit,{partialSlice:true}).ok);
const event=(kind,target,extra={})=>({kind,source:scout.id,target,ability:a.id,baseDamage:0,baseHeal:0,spiritScale:0,damageType:'none',slow:.4,duration:4,deploymentId:1,origin:{...structure.position},...extra});
assert.ok(s.applyHeroEffect(event('deployment-start',null)).ok);
assert.ok(s.applyHeroEffect(event('reveal',structure.id,{revealDuration:1.5,revealMode:'enemy_outline'})).ok);
layer.sync(s);other.sync(s);const objectiveGroup=outline(scene);assert.ok(objectiveGroup);assert.equal(outline(otherScene),undefined);
assert.deepEqual(worldPosition(cages(objectiveGroup)[0]),[structure.position.x,structure.position.y+.95,structure.position.z]);
assert.ok(s.applyHeroEffect(event('deployment-end',null)).ok);layer.sync(s);assert.equal(outline(scene),objectiveGroup,'end preserves accepted target tail');
const trooper=s.troopers.find(t=>t.team==='ivory'&&t.alive);assert.ok(trooper);
assert.ok(s.moveHero(scout.id,{...trooper.position}).ok);
const troopEvent=(kind,target)=>({...event(kind,target),deploymentId:2,origin:{...trooper.position},...(kind==='reveal'?{revealDuration:1.5,revealMode:'enemy_outline'}:{})});
assert.ok(s.applyHeroEffect(troopEvent('deployment-start',null)).ok);assert.ok(s.applyHeroEffect(troopEvent('reveal',trooper.id)).ok);
layer.sync(s);assert.equal(outline(scene),objectiveGroup);assert.equal(cages(objectiveGroup).filter(o=>o.visible).length,4);
assert.ok(s.damage(trooper.id,1e6,scout.id,{kind:'ability'}).killed);assert.equal(s.isRevealedTo(trooper.id,'carbon'),false);
layer.sync(s);assert.equal(cages(objectiveGroup).filter(o=>o.visible).length,2,'dead target hides immediately without extending another target tail');
assert.deepEqual(objectiveGroup.position.toArray(),Object.values(structure.position),'glyph anchor follows first remaining revealed actor');
let disposed=0;cages(objectiveGroup)[0].material.addEventListener('dispose',()=>disposed++);
layer.dispose();layer.dispose();other.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);assert.equal(otherScene.children.length,0);
layer.sync(s);assert.equal(scene.children.length,0);
// New view adopts still-live Host facts without private caches from old view.
const adoptedScene=new THREE.Scene(),adopted=createSystemsLayer(adoptedScene,{team:'carbon'});adopted.sync(s);assert.ok(outline(adoptedScene));
assert.ok(s.step(1.51).ok);adopted.sync(s);assert.equal(outline(adoptedScene),undefined);adopted.dispose();assert.equal(adoptedScene.children.length,0);
console.log('PASS Speed Trap view protocol objective info, stale-runtime-independent layer adoption, expiry, idempotent disposal and no scene leaks; existing cage markers are not mesh outlines/native rendering');
