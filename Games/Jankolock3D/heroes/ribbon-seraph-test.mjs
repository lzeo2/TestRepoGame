// Run: node Games/Jankolock3D/heroes/ribbon-seraph-test.mjs
// Real GLB/loader/rig/controller/systems; image bitmap creation is mocked, no GPU/native-input claim.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import * as THREE from '../vendor/three.module.js';
import { loadCharacter, cloneCharacter, disposeCharacterAssets } from '../character-assets.mjs';
import { bindHeroRig, createHeroVisual } from './hero-model.mjs';
import { PlayerController } from './player-controller.mjs';
import { HeroRuntime } from './hero-runtime.mjs';
import { createSystems } from '../systems.mjs';

const base=new URL('../models/ribbon-seraph/',import.meta.url);
const bytes=readFileSync(new URL('model.glb',base));
assert.equal(bytes.length,3395656);
assert.equal(createHash('sha256').update(bytes).digest('hex'),'fd7fdb83aa53d16e4d677360dc78a62c95b000336dede7d4d1d497c69a1fd702');
assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);
const jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength));
assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
assert.equal(bytes.readUInt32LE(24+jsonLength),0x004e4942);
const binary=bytes.subarray(28+jsonLength);
assert.equal(bytes.readUInt32LE(20+jsonLength),binary.length);
function noURI(value) {
  if(!value||typeof value!=='object')return;
  assert.ok(!Object.hasOwn(value,'uri'),'no external or data URI resources');
  Object.values(value).forEach(noURI);
}
noURI(doc);assert.equal(doc.skins?.length??0,0);assert.equal(doc.animations?.length??0,0);
assert.equal(doc.images.length,18);assert.equal(doc.textures.length,18);assert.equal(doc.materials.length,6);
for(const view of doc.bufferViews)assert.ok(view.buffer===0&&view.byteLength>0&&(view.byteOffset??0)+view.byteLength<=doc.buffers[0].byteLength);
let decodedImages=0,closedImages=0;
// Validate actual embedded PNG streams; only the bitmap/GPU upload is substituted.
globalThis.self=globalThis;
globalThis.ProgressEvent=class {constructor(type,values){Object.assign(this,{type},values);}};
globalThis.createImageBitmap=async blob=>{
  const png=Buffer.from(await blob.arrayBuffer());
  assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=png.readUInt32BE(16),height=png.readUInt32BE(20),channels={2:3,6:4}[png[25]];
  assert.ok(width>0&&width<=512&&height>0&&height<=512&&channels);assert.equal(png[24],8);assert.equal(png[28],0);
  const compressed=[];let offset=8;
  while(offset<png.length) {
    const length=png.readUInt32BE(offset);assert.ok(offset+12+length<=png.length);
    if(png.toString('ascii',offset+4,offset+8)==='IDAT')compressed.push(png.subarray(offset+8,offset+8+length));
    offset+=length+12;
  }
  assert.equal(offset,png.length);
  assert.equal(inflateSync(Buffer.concat(compressed)).length,(width*channels+1)*height);
  decodedImages++;
  return {width,height,close(){closedImages++;}};
};
await assert.rejects(loadCharacter('mucilage-monk'),/Unknown character/);
const [asset,same]=await Promise.all([loadCharacter('ribbon-seraph'),loadCharacter('ribbon-seraph')]);
assert.equal(asset,same);assert.equal(decodedImages,18);
assert.equal(asset.metadata.triangles,17888);assert.equal(asset.metadata.meshes,36);
assert.equal(asset.metadata.movableNodes,17);assert.equal(asset.metadata.paletteSlots,6);
assert.deepEqual(asset.metadata.generatedUV,[]);assert.deepEqual(asset.metadata.unmatchedPaletteSlots,[]);
let triangles=0;
asset.root.traverse(node=>{
  if(!node.isMesh)return;
  const g=node.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  assert.equal(p.count,n.count);assert.equal(p.count,uv.count);
  for(const attr of Object.values(g.attributes))assert.ok([...attr.array].every(Number.isFinite));
  for(const index of g.index.array)assert.ok(index>=0&&index<p.count);
  triangles+=g.index.count/3;
  assert.ok(node.material.map&&node.material.normalMap&&node.material.metalnessMap&&node.material.roughnessMap);
});
assert.equal(triangles,17888);
const a=cloneCharacter('ribbon-seraph'),b=cloneCharacter('ribbon-seraph');
const mesh=group=>{let first;group.traverse(n=>{if(n.isMesh&&!first)first=n;});return first;};
const am=mesh(a.group),bm=mesh(b.group),original=mesh(asset.root);
assert.notEqual(am.geometry,bm.geometry);assert.notEqual(am.material,bm.material);
assert.equal(am.material.map,original.material.map);assert.equal(am.material.normalMap,original.material.normalMap);
assert.equal(am.material.normalScale.x,original.material.normalScale.x);
// Palette metadata describes the finish; embedded ORM already encodes it.
a.group.traverse(node=>{
  if(!node.isMesh)return;
  const source=asset.root.getObjectByName(node.name).material;
  const pbr=doc.materials.find(material=>material.name===source.name).pbrMetallicRoughness;
  assert.equal(node.material.metalness,pbr.metallicFactor??1,'retain GLB metallic factor, not palette times ORM');
  assert.equal(node.material.roughness,pbr.roughnessFactor??1,'retain GLB roughness factor, not palette times ORM');
  assert.ok(node.material.color.equals(source.color));
  assert.equal(node.material.opacity,source.opacity);
  assert.equal(node.material.metalnessMap,source.metalnessMap);assert.equal(node.material.roughnessMap,source.roughnessMap);
});
const otherColor=bm.material.color.clone();am.material.color.set('#ffffff');assert.ok(bm.material.color.equals(otherColor));
const bounds=new THREE.Box3().setFromObject(a.group);
assert.ok(Math.abs(bounds.max.y-2.466187)<1e-5&&bounds.min.y>0);
const rest=new Map();a.group.traverse(n=>rest.set(n,{p:n.position.clone(),q:n.quaternion.clone()}));
const pose=bindHeroRig(a.group,a.rig),root=a.group.getObjectByName('root');
a.group.position.set(13,2,-7);a.group.rotation.y=.7;
let poses=0;
for(const state of ['idle','walk','aim','dash','slide','jump','fall'])for(let frame=0;frame<60;frame++) {
  pose.update(1/60,{state,speed:state==='idle'?0:8,aiming:state==='aim',recoil:frame%3===0?1:0});
  for(const spec of a.rig.movable_nodes) {
    const node=a.group.getObjectByName(spec.name),r=rest.get(node);
    assert.ok(node.position.distanceTo(r.p)<1e-7,'no translation outside authored locks');
    const delta=new THREE.Euler().setFromQuaternion(r.q.clone().invert().multiply(node.quaternion));
    for(const axis of ['x','y','z']) {
      const range=spec.rotation_deg[axis],degrees=delta[axis]*180/Math.PI;
      if(range!=='free')assert.ok(degrees>=range[0]-1e-6&&degrees<=range[1]+1e-6,`${spec.name}/${axis} limits`);
    }
  }
  assert.deepEqual(a.group.position.toArray(),[13,2,-7]);assert.equal(a.group.rotation.y,.7);
  assert.ok(root.quaternion.angleTo(rest.get(root).q)<1e-7);poses++;
}
pose.update(0);for(const [node,r] of rest)if(node!==a.group)assert.ok(node.quaternion.angleTo(r.q)<1e-7,'idle restores author rest');
a.dispose();a.dispose();b.dispose();
const visual=createHeroVisual('ribbon-seraph');
assert.equal(visual.group.scale.x,.73);assert.ok(new THREE.Box3().setFromObject(visual.group).max.y<1.801);
assert.equal(visual.muzzle.name,'typebar_muzzle');assert.equal(visual.muzzle.parent.name,'hover_core');
assert.ok(visual.muzzle.getWorldPosition(new THREE.Vector3()).z<bounds.min.z*.73,'emitter ahead of rest geometry');
visual.dispose();

const {heroes:[kit]}=JSON.parse(readFileSync(new URL('../../../docs/jank3d-ribbon-seraph-kit.json',import.meta.url)));
const sim=createSystems();sim.step(30);
const player=sim.addHero({id:'player',team:'carbon',lane:'midway',position:{x:0,y:0,z:8}});
const enemy=sim.addHero({id:'enemy',team:'ivory',lane:'midway',position:{x:.55,y:0,z:0}});
assert.ok(sim.configureHeroKit(player.id,kit).ok);assert.equal(sim.stats(player.id).kitId,'ribbon-seraph');
const scene=new THREE.Scene(),boxes=[],events=[];
const controller=new PlayerController({position:player.position,boxes});
const runtime=new HeroRuntime({scene,controller,kit,boxes,targets:[{...enemy}],onEffect:event=>{
  const result=sim.applyHeroEffect(event);assert.ok(result.ok,`${event.kind}/${event.ability}: ${result.reason}`);events.push(event);
}});
const hp=enemy.hp;assert.ok(runtime.fire());assert.ok(enemy.hp<hp);assert.equal(runtime.ammo,13);
assert.equal(runtime.fire(),false,'fire cooldown');
assert.ok(runtime.melee()); // Enemy is outside melee range; no damage intent.
const beforeTether=enemy.hp;assert.ok(runtime.cast(1));assert.ok(runtime.tether);assert.ok(enemy.hp<beforeTether);
assert.ok(sim.stats(enemy.id).moveSpeed<8);assert.equal(runtime.cast(1),false);
boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:3,maxZ:4});runtime.update(.05);
assert.equal(runtime.tether,null);assert.equal(sim.stats(enemy.id).moveSpeed,8,'cover breaks linked slow');
const coveredHP=enemy.hp;assert.ok(runtime.cast(4));assert.equal(enemy.hp,coveredHP,'cone respects cover');
assert.ok(runtime.cast(3));assert.ok(runtime.buffs.xray,'existing through-cover reveal');
assert.ok(runtime.cast(2));assert.equal(sim.stats(player.id).invulnerable,false);assert.equal(sim.stats(player.id).moveSpeed,11.6);
for(let frame=0;frame<60;frame++)runtime.update(.05);
assert.equal(sim.stats(player.id).moveSpeed,8,'speed buff cleanup');assert.equal(runtime.fx.count,0);
runtime.reset();boxes.length=0;
const coneHP=enemy.hp;assert.ok(runtime.cast(4));assert.ok(enemy.hp<coneHP,'cone really damages via systems');
const beforeShots=events.length;runtime.reset();boxes.push({minX:-2,maxX:2,minY:0,maxY:4,minZ:3,maxZ:4});runtime.fire();assert.equal(events.length,beforeShots,'weapon respects cover');
// Reuse normal ground movement/collision, not art-derived flight or wing contact.
for(let frame=0;frame<180;frame++)controller.update(1/60,{forward:1});
assert.ok(controller.position.z>4,'standard capsule cannot cross wall');assert.equal(controller.position.y,0);
runtime.reset();assert.equal(runtime.ammo,14);assert.equal(runtime.fx.count,0);
boxes.length=0;controller.warp({x:0,y:0,z:8});
assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:6}).ok);runtime.targets[0].position=enemy.position;
const meleeHP=enemy.hp;assert.ok(runtime.melee());assert.ok(enemy.hp<meleeHP,'melee actually damages through systems');
// Integrated targets are replaced every tick, not persistent object references.
controller.warp({x:0,y:0,z:8});
function tetherFixture() {
  runtime.reset();assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:0}).ok);
  runtime.targets=[{...enemy,position:{...enemy.position}}];
  assert.ok(runtime.cast(1));assert.ok(runtime.tether);assert.ok(sim.stats(enemy.id).moveSpeed<8);
}
tetherFixture();
const stale=runtime.targets[0];
assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:-2}).ok);runtime.targets=[{...enemy,position:{...enemy.position}}];runtime.update(.05);
assert.ok(runtime.tether,'in-range moving target remains linked');
const delta=new THREE.Vector3(enemy.position.x,enemy.position.y+.9,enemy.position.z).sub(runtime.origin);
assert.ok(Math.abs(runtime.tether.handle.group.scale.y-delta.length()/runtime.tether.length)<1e-8,'visual follows replacement position');
assert.ok(sim.moveHero(enemy.id,{x:.55,y:0,z:-50}).ok);runtime.targets=[{...enemy,position:{...enemy.position}}];runtime.update(.05);
assert.equal(stale.position.z,0,'old record remains at cast position');
assert.equal(runtime.tether,null);assert.equal(sim.stats(enemy.id).moveSpeed,8,'58m move breaks linked slow');
for(const invalidate of [()=>{runtime.targets=[];},()=>{runtime.targets=[{...enemy,alive:false}];},()=>{runtime.targets=[{...enemy,team:'carbon'}];}]) {
  tetherFixture();invalidate();runtime.update(.05);assert.equal(runtime.tether,null);assert.equal(sim.stats(enemy.id).moveSpeed,8);
}
tetherFixture();runtime.reset();assert.equal(sim.stats(enemy.id).moveSpeed,8,'reset revokes linked slow');
tetherFixture();runtime.cooldowns[1]=0;runtime.targets=[];runtime.cast(1);
assert.equal(runtime.tether,null);assert.equal(sim.stats(enemy.id).moveSpeed,8,'missed replacement revokes old link');
tetherFixture();sim.damage(player.id,100000,enemy.id,{kind:'ability'});assert.equal(player.alive,false);
assert.equal(sim.applyHeroEffect({kind:'damage',source:player.id,target:enemy.id,ability:'tether'}).ok,false,'dead caster cannot deal damage');
runtime.reset();assert.equal(sim.stats(enemy.id).moveSpeed,8,'caster death reset revokes slow');
assert.equal(sim.applyHeroEffect({kind:'tether-end',source:player.id,target:enemy.id,ability:'longshot'}).ok,false,'cleanup still validates kit ability');
runtime.dispose();runtime.dispose();assert.equal(scene.children.length,0);
// Static entry wiring checks supplement the CPU runtime test, not browser selection proof.
const entry=readFileSync(new URL('../game.mjs',import.meta.url),'utf8');
assert.ok(entry.includes("loadCharacter('ribbon-seraph')")&&entry.includes('jank3d-ribbon-seraph-kit.json'));
const ui=readFileSync(new URL('../integration-ui.mjs',import.meta.url),'utf8');
assert.ok(ui.includes('heroSelect.replaceChildren(...heroes.map('));assert.ok(!ui.includes('heroes.length !== 4'));
disposeCharacterAssets();assert.equal(closedImages,18,'shared embedded images released on teardown');
console.log(`PASS Ribbon Seraph: clean GLB/hash/18 PNG streams/PBR, clone isolation, ${poses} bounded poses, scale/socket, kit accepted, fire/melee/4 casts/cover/slow/speed/collision/reset/disposal; bitmap mocked, no native interaction verified`);
