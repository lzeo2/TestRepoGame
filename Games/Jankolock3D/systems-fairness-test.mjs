import assert from 'node:assert/strict';
import { createSystems } from './systems.mjs';
import { createWorldData } from './world-data.mjs';

const p = (x=0,y=0,z=0) => ({x,y,z});
const lanes = [{id:'graft',x:-240},{id:'midway',x:0},{id:'greenhedge',x:240}];
const wall = () => ({id:'cover',minX:4,maxX:5,minY:0,maxY:4,minZ:-3,maxZ:3});
let groups=0;
function test(name,run) { run(); console.log(`ok ${++groups} - ${name}`); }
function fixture(kind='trooper',boxes=[],ramps=[]) {
  const s=createSystems({lanes,boxes,ramps}); s.step(30);
  for (const t of s.troopers) { t.position=p(9000,0,9000); t.path=[]; }
  const source=kind==='trooper'?s.troopers.find(t=>t.team==='ivory'):s.structures.find(t=>t.team==='ivory'&&t.type==='guardian');
  source.position=p(); source.nextAttack=0;
  const target=s.addHero({id:'victim',team:'carbon',position:p(10)});
  const hits=()=>s.events.filter(e=>e.type==='damage'&&e.kind==='projectile'&&e.sourceId===source.id&&e.targetId===target.id);
  return {s,source,target,boxes,hits};
}

test('literal inclusive projectile ranges: trooper20, structure28; melee4; finite positions',()=>{
  for (const kind of ['trooper','structure']) for (const attack of ['projectile','melee']) {
    const range=attack==='melee'?4:kind==='trooper'?20:28;
    for (const offset of [-1e-6,0,1e-6]) {
      const {s,source,target}=fixture(kind); s.moveHero(target.id,p(range+offset));
      const hp=target.hp, result=s.damage(target.id,10,source.id,{kind:attack});
      assert.equal(result.ok,offset<=0,`${kind}/${attack}/${offset}`);
      assert.equal(target.hp<hp,offset<=0);
    }
    const {s,source,target}=fixture(kind); source.position.x=NaN;
    assert.equal(s.damage(target.id,10,source.id,{kind:attack}).ok,false);
  }
});

test('acquisition and release obey range and the full .35s windup, with actual attributed damage',()=>{
  for (const kind of ['trooper','structure']) {
    const range=kind==='trooper'?20:28;
    for (const offset of [-1e-6,0,1e-6]) {
      const {s,source,target,hits}=fixture(kind); s.moveHero(target.id,p(range+offset));
      const hp=target.hp; s.step(.05);
      assert.equal(!!source.pendingAttack,offset<=0);
      if (offset<=0) assert.deepEqual(source.pendingAttack,{targetId:target.id,started:30.05,releaseAt:30.4});
      s.step(.3); assert.equal(target.hp,hp); assert.equal(hits().length,0);
      s.step(.05); assert.equal(hits().length,offset<=0?1:0);
      assert.equal(target.hp<hp,offset<=0); assert.equal(source.pendingAttack,null);
      if (offset<=0) { assert.equal(hits()[0].sourceKind,kind); assert.equal(hits()[0].kind,'projectile'); }
    }
  }
});

test('physical walls block both basic channels without damage or resource consumption; abilities stay unchanged',()=>{
  for (const attack of ['projectile','melee']) {
    const boxes=[{...wall(),minX:1,maxX:2}],{s,source,target}=fixture('trooper',boxes);
    s.moveHero(target.id,p(3)); const hp=target.hp;
    assert.equal(s.damage(target.id,10,source.id,{kind:attack}).reason,'world cover blocks attack');
    assert.equal(target.hp,hp);
    assert.ok(s.damage(target.id,10,source.id,{kind:'ability'}).ok,'legacy AoE/ability semantics retained');
  }
  const boxes=[wall()],{s,target}=fixture('trooper',boxes);
  const hero=s.addHero({id:'shooter',team:'ivory',position:p()}); const ammo=hero.ammo;
  assert.equal(s.damage(target.id,10,hero.id).ok,false); assert.equal(hero.ammo,ammo); assert.equal(hero.nextAttack,0);
});

test('shared mutable cover blocks acquisition, removal permits it, and new cover cancels release',()=>{
  for (const kind of ['trooper','structure']) {
    const boxes=[wall()],{s,source,target,hits}=fixture(kind,boxes),hp=target.hp;
    s.step(.4); assert.equal(source.targetId,null); assert.equal(source.pendingAttack,null); assert.equal(target.hp,hp);
    boxes.splice(0,1); s.step(.05); assert.equal(source.pendingAttack.targetId,target.id);
    boxes.push(wall()); s.step(.35); assert.equal(hits().length,0); assert.equal(source.pendingAttack,null);
    boxes.length=0; s.step(1); assert.equal(hits().length,1);
  }
});

test('lost, dead, hidden, removed and replaced targets cannot receive stale attacks',()=>{
  for (const mode of ['range','cover','dead','hidden','removed','replacement','source-dead','finished']) {
    const {s,source,target,boxes,hits}=fixture(); s.step(.05); assert.ok(source.pendingAttack);
    const hp=target.hp;
    if (mode==='range') s.moveHero(target.id,p(21));
    if (mode==='cover') boxes.push(wall());
    if (mode==='dead') assert.ok(s.damage(target.id,1e6,source.id,{kind:'ability'}).killed);
    if (mode==='hidden') target.cloakUntil=s.time+5; // Negative automatic-eligibility fixture.
    if (mode==='removed') s.heroes.splice(s.heroes.indexOf(target),1);
    if (mode==='replacement') { s.moveHero(target.id,p(21)); s.addHero({id:'replacement',team:'carbon',position:p(9)}); }
    if (mode==='source-dead') assert.ok(s.damage(source.id,1e6,target.id,{kind:'ability'}).killed);
    if (mode==='finished') s.phase='finished'; // Negative inactive-host fixture, not victory proof.
    s.step(.35); assert.equal(hits().length,0,mode);
    if (mode!=='dead') assert.equal(target.hp,hp,mode);
    if (mode==='replacement') assert.equal(s.heroes.find(h=>h.id==='replacement').hp,500);
  }
});

test('release uses current positions, and movement to cover after the deadline still blocks direct damage',()=>{
  const {s,source,target,boxes,hits}=fixture(); s.step(.05); s.moveHero(target.id,p(0,0,10));
  boxes.push(wall()); s.step(.35); assert.equal(hits().length,1,'old aim line is blocked but current one is clear');
  s.moveHero(target.id,p(10)); assert.equal(s.damage(target.id,10,source.id).ok,false);
});

test('ramp slabs block real crossings in both axes/slopes but not open air above them',()=>{
  for (const axis of ['x','z']) for (const reverse of [false,true]) {
    const ramps=[{minX:-2,maxX:12,minZ:-2,maxZ:12,axis,start:reverse?4:0,end:reverse?0:4}];
    const {s,source,target}=fixture('trooper',[],ramps);
    source.position=p(0,0,0); s.moveHero(target.id,p(10,0,10));
    assert.equal(s.damage(target.id,10,source.id).ok,false);
    s.step(.05); assert.equal(source.pendingAttack,null);
    source.position.y=5; s.moveHero(target.id,p(10,5,10));
    assert.ok(s.damage(target.id,10,source.id).ok);
  }
});

test('real guardian platforms do not self-occlude; unrelated platform cover still blocks',()=>{
  const world=createWorldData(),boxes=[...world.boxes],s=createSystems({...world,boxes}); s.step(30);
  for (const t of s.troopers) {t.position=p(9000,0,9000);t.path=[];}
  const source=s.structures.find(t=>t.team==='ivory'&&t.type==='guardian'&&t.lane==='midway');
  const target=s.addHero({id:'platform-victim',team:'carbon',position:p(source.position.x,3,source.position.z-15)});
  assert.ok(s.damage(target.id,10,source.id).ok);
  const platform=boxes.find(b=>b.id==='ivory-midway-approach');
  s.moveHero(target.id,p(source.position.x,0,source.position.z-15));
  assert.ok(s.damage(target.id,10,source.id).ok,'own objective support excluded by exact ID');
  boxes.push({...platform,id:'unrelated-platform'});
  assert.equal(s.damage(target.id,10,source.id).ok,false,'other platform is still physical cover');
});
console.log(`systems fairness: ${groups} groups passed`);
