// Run: node Games/Jankolock3D/heroes/trio-test.mjs
// Actual committed GLBs and CPU gameplay; bitmap upload mocked, no native UI/GPU claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import vm from 'node:vm';
import * as THREE from '../vendor/three.module.js';
import { TRIO_HERO_IDS, loadCharacter, cloneCharacter, disposeCharacterAssets } from '../character-assets.mjs';
import { bindHeroRig, createHeroVisual } from './hero-model.mjs';
import { PlayerController } from './player-controller.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { createSystems } from '../systems.mjs';
const json=url=>JSON.parse(readFileSync(url));
const kits=json(new URL('../../../docs/jank3d-trio-kits.json',import.meta.url)).heroes;
assert.deepEqual(kits.map(k=>k.id),TRIO_HERO_IDS);
const pins=[
  [3102828,'28690ccefb372b4b0008298cfa32c11d2c7eca68958645db627874a91ce7efee',19448,50,28,7,18],
  [4213784,'52daa16fd7cefaf3cc7ddf9350cb302a2a6e213205d7ca332ba896a26014deaf',18148,56,22,6,18],
  [2847116,'8547ce6cca106bd1bcf8c98c7e43e850b693d69a713bd03545b4515492bff6f6',18454,60,18,8,24]
];
const liveIds=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json']
  .flatMap(name=>json(new URL(`../../../docs/${name}`,import.meta.url)).heroes.map(k=>k.id));
const assetHashes=new Map(),transmissive=[];
for(const id of [...liveIds,'deployed_stapler','trooper','portrait_relief']) {
  for(const name of id==='portrait_relief'?['portrait_relief.glb']:['model.glb','receipt.json',...(id==='trooper'?[]:['manifest.json','palette.json','rig.json'])]) {
    const url=new URL(id==='portrait_relief'?`../models/${name}`:`../models/${id}/${name}`,import.meta.url),bytes=readFileSync(url);
    assetHashes.set(url,createHash('sha256').update(bytes).digest('hex'));
    if(name.endsWith('.glb')) {
      const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
      for(const material of doc.materials??[])if(material.extensions?.KHR_materials_transmission)
        transmissive.push({id,name:material.name,transmission:material.extensions.KHR_materials_transmission.transmissionFactor,ior:material.extensions.KHR_materials_ior?.ior});
    }
  }
}
assert.deepEqual([...new Set(transmissive.map(m=>m.id))],['prism-warden']);
assert.deepEqual(transmissive.map(m=>m.transmission).sort(),[Math.fround(.10),Math.fround(.18)]);
assert.ok(transmissive.every(m=>m.ior===Math.fround(1.46)));
console.log('PASS transmission isolation: 11 live GLBs scanned; only Warden, factors .10/.18 and IOR 1.46; no GPU claim');
let decoded=0,closed=0,poses=0;
globalThis.self=globalThis;
globalThis.ProgressEvent=class {constructor(type,values){Object.assign(this,{type},values);}};
globalThis.createImageBitmap=async blob=>{
  const png=Buffer.from(await blob.arrayBuffer());
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20),channels={2:3,6:4}[png[25]];
  assert.ok(width>0&&width<=512&&height>0&&height<=512&&channels);
  assert.equal(png[24],8);assert.equal(png[28],0);
  const compressed=[];let offset=8;
  while(offset<png.length) {
    const length=png.readUInt32BE(offset);assert.ok(offset+12+length<=png.length);
    if(png.toString('ascii',offset+4,offset+8)==='IDAT')compressed.push(png.subarray(offset+8,offset+8+length));
    offset+=length+12;
  }
  assert.equal(offset,png.length);assert.equal(inflateSync(Buffer.concat(compressed)).length,(width*channels+1)*height);
  decoded++;return {width,height,close(){closed++;}};
};
for(const [index,id] of TRIO_HERO_IDS.entries()) {
  // Presence/integrity is separate from loader and gameplay success below.
  const base=new URL(`../models/${id}/`,import.meta.url),bytes=readFileSync(new URL('model.glb',base));
  const [size,hash,triangles,meshes,nodes,materials,images]=pins[index];
  assert.equal(bytes.length,size);assert.equal(createHash('sha256').update(bytes).digest('hex'),hash);
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),size);
  const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
  function noURI(value) {
    if(!value||typeof value!=='object')return;
    assert.ok(!Object.hasOwn(value,'uri'),'self-contained, no external/data URI');Object.values(value).forEach(noURI);
  }
  noURI(doc);assert.equal(doc.skins?.length??0,0);assert.equal(doc.animations?.length??0,0);
  assert.equal(doc.images.length,images);assert.equal(doc.materials.length,materials);
  const receipt=json(new URL('receipt.json',base));
  for(const name of ['manifest','palette','rig'])assert.equal(createHash('sha256').update(readFileSync(new URL(`${name}.json`,base))).digest('hex'),receipt.metadataSHA256[`${name}.json`]);
  const [asset,same]=await Promise.all([loadCharacter(id),loadCharacter(id)]);
  assert.equal(asset,same);assert.equal(asset.metadata.triangles,triangles);assert.equal(asset.metadata.meshes,meshes);
  assert.equal(asset.metadata.movableNodes,nodes);assert.equal(asset.metadata.paletteSlots,materials);
  assert.deepEqual(asset.metadata.generatedUV,[]);assert.deepEqual(asset.metadata.unmatchedPaletteSlots,[]);
  asset.root.traverse(n=>{
    if(!n.isMesh)return;
    const g=n.geometry;assert.equal(g.attributes.position.count,g.attributes.normal.count);
    assert.equal(g.attributes.position.count,g.attributes.uv.count);
    for(const attr of Object.values(g.attributes))assert.ok([...attr.array].every(Number.isFinite));
    for(const i of g.index.array)assert.ok(i>=0&&i<g.attributes.position.count);
  });
  const a=cloneCharacter(id),b=cloneCharacter(id);
  const first=group=>{let mesh;group.traverse(n=>{if(n.isMesh&&!mesh)mesh=n;});return mesh;};
  const am=first(a.group),bm=first(b.group),original=first(asset.root);
  assert.notEqual(am.geometry,bm.geometry);assert.notEqual(am.material,bm.material);
  assert.equal(am.material.map,original.material.map);assert.equal(am.material.normalMap,original.material.normalMap);
  assert.equal(am.material.roughnessMap,original.material.roughnessMap);assert.equal(am.material.metalnessMap,original.material.metalnessMap);
  a.group.traverse(node=>{
    if(!node.isMesh)return;
    const source=asset.root.getObjectByName(node.name).material;
    assert.equal(node.material.metalness,source.metalness,'retain authored ORM multiplier');
    assert.equal(node.material.roughness,source.roughness,'retain authored ORM multiplier');
    if(id==='prism-warden') {
      const raw=doc.materials.find(m=>m.name===source.name),extensions=raw.extensions??{};
      for(const material of [source,node.material]) {
        assert.equal(material.transmission??0,extensions.KHR_materials_transmission?.transmissionFactor??0);
        if(extensions.KHR_materials_ior)assert.equal(material.ior,extensions.KHR_materials_ior.ior);
      }
    }
    assert.ok(node.material.color.equals(source.color));
  });
  const color=bm.material.color.clone();am.material.color.set('#ffffff');assert.ok(bm.material.color.equals(color));
  const rest=new Map();a.group.traverse(n=>rest.set(n,{p:n.position.clone(),q:n.quaternion.clone()}));
  const pose=bindHeroRig(a.group,a.rig);a.group.position.set(13,2,-7);a.group.rotation.y=.7;
  let changed=false;
  for(const state of ['idle','walk','aim','dash','slide','jump','fall'])for(let frame=0;frame<30;frame++) {
    pose.update(1/60,{state,speed:state==='idle'?0:8,aiming:state==='aim',recoil:frame%3===0?1:0});
    for(const spec of a.rig.movable_nodes) {
      const node=a.group.getObjectByName(spec.name),r=rest.get(node);
      assert.ok(node.position.distanceTo(r.p)<1e-7,'authored translations preserved');
      const delta=new THREE.Euler().setFromQuaternion(r.q.clone().normalize().invert().multiply(node.quaternion.clone().normalize()));
      if(!node.quaternion.equals(r.q))changed=true;
      for(const axis of ['x','y','z']) {
        const range=spec.rotation_deg[axis],degrees=delta[axis]*180/Math.PI;
        if(range!=='free')assert.ok(degrees>=range[0]-1e-6&&degrees<=range[1]+1e-6,`${id}/${spec.name}/${axis}`);
      }
    }
    assert.deepEqual(a.group.position.toArray(),[13,2,-7]);assert.equal(a.group.rotation.y,.7);poses++;
  }
  assert.ok(changed,'not an inert rest-pose adapter');pose.update(0);
  // Supplied float quaternions are not all unit length; compare exact rest components.
  for(const [node,r] of rest)if(node!==a.group)assert.deepEqual(node.quaternion.toArray(),r.q.toArray(),'idle restores rest');
  a.dispose();a.dispose();b.dispose();
  const visual=createHeroVisual(id),bounds=new THREE.Box3().setFromObject(visual.group);
  assert.equal(visual.muzzle.name,'weapon_muzzle');assert.equal(visual.muzzle.parent.name,['whip_grip','rook_sceptre','COMPASS_PROJECTOR_BLADE'][index]);
  assert.ok(bounds.min.y>-.001&&bounds.max.y<(id==='spoollash'?3.15:1.801));
  visual.dispose();
}
assert.equal(decoded,60);
console.log(`PASS trio assets/loader: 3 pinned GLBs, sidecars, 60 PNG streams, PBR/clone isolation, ${poses} bounded rigid poses and sockets`);

function fixture(kit) {
  const sim=createSystems();sim.step(30);
  const player=sim.addHero({id:'player',team:'carbon',lane:'midway',position:{x:0,y:0,z:8}});
  const enemy=sim.addHero({id:'enemy',team:'ivory',lane:'midway',position:{x:.55,y:0,z:0}});
  const friend=sim.addHero({id:'friend',team:'carbon',lane:'midway',position:{x:-.55,y:0,z:0}});
  assert.ok(sim.configureHeroKit(player.id,kit).ok);assert.equal(sim.stats(player.id).kitId,kit.id);
  assert.equal(sim.stats(player.id).maxHp,kit.health);
  const scene=new THREE.Scene(),boxes=[],events=[],controller=new PlayerController({position:player.position,boxes});
  const runtime=new HeroRuntime({scene,controller,kit,boxes,targets:[enemy,friend],onEffect:event=>{
    const result=sim.applyHeroEffect(event);assert.ok(result.ok,`${kit.id}/${event.kind}/${event.ability}: ${result.reason}`);events.push(event);
  }});
  const step=(seconds,input={})=>{for(let i=0;i<Math.ceil(seconds/.05);i++) {
    controller.update(.05,input);assert.ok(sim.moveHero(player.id,controller.position).ok);runtime.update(.05);sim.step(.05);
  }};
  return {sim,player,enemy,friend,scene,boxes,events,controller,runtime,step};
}
let casts=0;
for(const kit of kits) {
  let f=fixture(kit),r=f.runtime;
  const hp=f.enemy.hp,friendHP=f.friend.hp;assert.ok(r.fire());assert.ok(f.enemy.hp<hp);assert.equal(f.friend.hp,friendHP);
  assert.equal(r.fire(),false);assert.equal(r.ammo,kit.weapon.magazine-1);
  r.startReload();assert.equal(r.fire(),false);f.step(kit.weapon.reload+.1);assert.equal(r.ammo,kit.weapon.magazine);
  r.reset();assert.ok(f.sim.moveHero(f.enemy.id,{x:0,y:0,z:6}).ok);
  const meleeHP=f.enemy.hp;assert.ok(r.melee());assert.ok(f.enemy.hp<meleeHP);assert.equal(r.melee(),false);
  r.reset();assert.equal(r.fx.count,0);
  f.boxes.push({minX:-3,maxX:3,minY:0,maxY:5,minZ:3,maxZ:4});
  assert.ok(f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:0}).ok);
  const coveredHP=f.enemy.hp;assert.ok(r.fire());assert.equal(f.enemy.hp,coveredHP,'weapon blocked by cover');
  f.step(2,{forward:1});assert.ok(f.controller.position.z>4,'normal capsule collides, art is not collision');assert.equal(f.controller.position.y,0);
  r.dispose();r.dispose();assert.equal(f.scene.children.length,0);
  for(const ability of kit.abilities) {
    f=fixture(kit);r=f.runtime;
    if(ability.id==='slam')f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:5});
    if(ability.id==='grenade')f.sim.moveHero(f.enemy.id,{x:.55,y:0,z:-11.2}); // Actual 12m/s trajectory at 1.6s fuse.
    const before=f.enemy.hp;
    assert.ok(r.cast(ability.slot),`${kit.id}/${ability.id}`);casts++;
    assert.equal(r.cast(ability.slot),false,'cooldown rejects repeat');assert.ok(r.fx.count>0);
    if(['longshot','slam','volley','tether','hook'].includes(ability.id))assert.ok(f.enemy.hp<before,'real systems damage');
    if(ability.id==='tether') {
      assert.ok(r.tether);assert.ok(f.sim.stats(f.enemy.id).moveSpeed<8);
      f.boxes.push({minX:-3,maxX:3,minY:0,maxY:5,minZ:3,maxZ:4});f.step(.05);
      assert.equal(r.tether,null);assert.equal(f.sim.stats(f.enemy.id).moveSpeed,8);
    }
    if(ability.id==='hook') {f.step(.4);assert.ok(f.controller.position.z<7,'hook moves caster');}
    if(ability.id==='barricade') {
      assert.equal(f.boxes.length,1);const wall=f.boxes[0];f.step(.8,{forward:1});
      assert.ok(f.controller.position.z>wall.maxZ,'deployed wall blocks caster');
    }
    if(ability.id==='overtime') {
      assert.equal(f.sim.stats(f.player.id).moveSpeed,8*ability.speedMultiplier);
      assert.equal(f.sim.stats(f.player.id).invulnerable,ability.invulnerable);
      if(ability.invulnerable)assert.equal(f.sim.damage(f.player.id,10,f.enemy.id,{kind:'ability'}).reason,'invulnerable');
    }
    if(ability.id==='xray') {
      const group=r.buffs.xray.handle.group;
      assert.ok(group.children.some(n=>n.isMesh&&n.material.wireframe&&n.visible),'live enemy cage');
      assert.equal(f.enemy.hp,before,'reveal is not damage');
    }
    if(ability.id==='headshot') {
      f.controller.pitch=Math.atan2(.4,8);assert.ok(r.fire());
      assert.equal(f.events.at(-1).headshot,true);assert.equal(f.events.at(-1).headshotMultiplier,2.2);
    }
    if(ability.id==='grenade') {
      let bounces=0;for(let i=0;i<34;i++){bounces=Math.max(bounces,r.projectiles[0]?.bounces??0);f.step(.05);}
      assert.ok(bounces>0);assert.ok(f.enemy.hp<before,'actual fused blast accepted at remote origin');
    }
    f.step((ability.duration??0)+1);
    assert.equal(r.projectiles.length,0);assert.equal(r.deployments.length,0);assert.equal(Object.keys(r.buffs).length,0);assert.equal(f.boxes.length,ability.id==='tether'?1:0,'expire owned walls, preserve world cover');
    assert.equal(f.sim.stats(f.player.id).moveSpeed,8);assert.equal(f.sim.stats(f.player.id).invulnerable,false);
    r.reset();assert.equal(r.ammo,kit.weapon.magazine);assert.equal(r.fx.count,0);r.dispose();assert.equal(f.scene.children.length,0);
  }
}
console.log(`PASS trio CPU gameplay: 3 systems-accepted kits, weapons/melee/reload/cover/collision, ${casts} effective casts, slows/hook/wall/invulnerability/reveal/headshots/bouncing blast/expiry/reset/disposal`);
// Selection source wiring is deliberately not reported as native button/input proof.
const entry=readFileSync(new URL('../game.mjs',import.meta.url),'utf8'),ui=readFileSync(new URL('../integration-ui.mjs',import.meta.url),'utf8');
assert.ok(entry.includes('...TRIO_HERO_IDS.map(loadCharacter)')&&entry.includes('jank3d-trio-kits.json'));
assert.ok(entry.includes('const kit=kits.find(k=>k.id===id)')&&entry.includes('controller,kit,boxes,source:hero.id,onEffect:effect')&&entry.includes('sim.configureHeroKit(hero.id,runtime.kit)'));
assert.ok(ui.includes('heroSelect.replaceChildren(...heroes.map(')&&ui.includes('onStart(selectedId)')&&ui.includes('select(kit.id, true)'));
const roster=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'].flatMap(name=>json(new URL(`../../../docs/${name}`,import.meta.url)).heroes);
assert.equal(roster.length,8);assert.equal(new Set(roster.map(k=>k.id)).size,8);
// Reuse combat-input-test's real-source VM pattern: minimal DOM/bot host,
// actual card callbacks, game select/start functions, HeroRuntime and systems.
function section(source,start,end) {
  const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);
}
for(const kit of kits) {
  const sim=createSystems(),scene=new THREE.Scene(),boxes=[];
  const hero=sim.addHero({id:'player',team:'carbon',lane:'midway',position:{x:0,y:0,z:8}});
  const controller=new PlayerController({position:hero.position,boxes});
  const runtime=new HeroRuntime({scene,controller,kit:kits[0],boxes});
  const card=()=>({dataset:{heroIndex:'0'},attributes:{},strong:{},span:{},
    cloneNode(){return card();},querySelector(name){return this[name];},setAttribute(k,v){this.attributes[k]=v;}});
  const heroSelect={children:[],querySelector:()=>card(),replaceChildren(...cards){this.children=cards;},querySelectorAll(){return this.children;}};
  const elements={'hero-select':heroSelect,'hero-description':{},start:{}};
  let starts=0,botStarts=0;
  const renders=[];
  const context=vm.createContext({kits:roster,heroes:roster,selected:'spoollash',selectedId:'spoollash',playing:false,runtime,
    sim,hero,controller,boxes,world:{},view:{scene,camera:new THREE.PerspectiveCamera(),renderCamera(){renders.push(context.runtime.kit.id);}},lobby:{visible:true},qa:false,
    HeroRuntime,effect:event=>sim.applyHeroEffect(event),clear(){},surfaceHeight(){return 0;},
    ui:{update(){},setPlaying(value){assert.equal(value,true);starts++;},message(){}},
    createBots(options){assert.equal(options.kits,roster);botStarts++;return {dispose(){}};},
    $:id=>elements[id],listen(node,type,fn){assert.equal(type,'click');node.click=fn;}});
  vm.runInContext(section(entry,'  function select(id) {','  ui=mountIntegrationUI('),context);
  context.onSelect=id=>context.select(id);context.onStart=id=>context.start(id);
  vm.runInContext(section(ui,"  const heroSelect = $('hero-select');",'  const abilityButtons ='),context);
  vm.runInContext(section(ui,'  function select(id, notify = false) {',"  listen($('restart')").replace('function select(', 'function selectCard(').replaceAll('select(kit.id, true)','selectCard(kit.id, true)').replace('select(selectedId);','selectCard(selectedId);'),context);
  assert.equal(heroSelect.children.length,8);
  for(const id of TRIO_HERO_IDS) {
    const button=heroSelect.children.find(b=>b.dataset.hero===id);assert.ok(button&&!button.disabled);
    const old=context.runtime,before=renders.length;button.click();assert.equal(context.runtime.kit.id,id);
    assert.equal(button.attributes['aria-pressed'],'true');assert.equal(context.selectedId,id);
    assert.equal(renders.length,before+Number(old!==context.runtime),'only a changed selection draws immediately');
    if(old!==context.runtime){assert.equal(old.visual.group.parent,null,'old selection disposed');assert.equal(renders.at(-1),id,'draw uses the selected runtime');}
  }
  heroSelect.children.find(b=>b.dataset.hero===kit.id).click();elements.start.click();
  assert.equal(context.runtime.kit.id,kit.id);assert.equal(sim.stats(hero.id).kitId,kit.id);
  assert.equal(context.playing,true);assert.equal(context.lobby.visible,false);assert.equal(starts,1);assert.equal(botStarts,1);
  const active=context.runtime,before=renders.length;context.select(kits.find(k=>k.id!==kit.id).id);elements.start.click();
  assert.equal(context.runtime,active,'selection locked during match');assert.equal(botStarts,1,'no duplicate start');
  assert.equal(renders.length,before,'locked selection does not redraw');
  context.runtime.dispose();assert.equal(scene.children.length,0);
}
console.log('PASS trio selection VM: actual 8-card generation/click/start callbacks, each trio runtime and systems kit, selection disposal and match lock; DOM/bot host mocked, native UI/input unverified');
disposeCharacterAssets();assert.equal(closed,60);
for(const [url,hash] of assetHashes)assert.equal(createHash('sha256').update(readFileSync(url)).digest('hex'),hash,'asset/sidecar bytes unchanged');
console.log('PASS transmission preservation: raw/loaded/cloned Warden factors and all live GLB/sidecar bytes unchanged');
