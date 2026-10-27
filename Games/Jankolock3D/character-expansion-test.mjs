// CPU-only actual GLTFLoader parsing. No GPU, native input, gameplay or authorship acceptance.
// Run: node Games/Jankolock3D/character-expansion-test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from './vendor/three.module.js';
import { EXPANSION_HERO_IDS, loadCharacter, cloneCharacter, characterMetadata, disposeCharacterAssets } from './character-assets.mjs';
import { EXPANSION_RECEIPT_SHA256, inspectExpansionGLB, validateExpansionSidecars, loadExpansionCharacter } from './character-expansion.mjs';
const base=new URL('./models/expansion40/',import.meta.url);
const raw=url=>readFileSync(url),json=url=>JSON.parse(raw(url)),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const buffer=bytes=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const receiptBytes=raw(new URL('intake-receipt.json',base)),receipt=JSON.parse(receiptBytes);
assert.equal(hash(receiptBytes),EXPANSION_RECEIPT_SHA256);
assert.ok(Object.isFrozen(EXPANSION_HERO_IDS));assert.equal(EXPANSION_HERO_IDS.length,40);
assert.deepEqual(EXPANSION_HERO_IDS,Object.keys(receipt.heroes));
assert.equal(characterMetadata().length,0,'no blind preload');
for(const id of ['../ballista','expansion40/ballista','ballista/model_fx.glb','model_cel','mucilage-monk','toString','__proto__',null,{},new String('ballista')]) {
  await assert.rejects(loadCharacter(id),/Unknown character/);
  await assert.rejects(loadExpansionCharacter(id,{}),/Unknown character/);
}
const firstMesh=group=>{let first;group.traverse(n=>{if(n.isMesh&&!first)first=n;});return first;};
let decoded=0,totalTriangles=0,materialCopies=0,geometryCopies=0;
for(const id of EXPANSION_HERO_IDS) {
  const folder=new URL(`${id}/`,base),pin=receipt.heroes[id].variants.clean;
  const bytes=raw(new URL('model.glb',folder));
  for(const name of ['model.glb','manifest.json','palette.json','rig.json']) {
    const data=raw(new URL(name,folder)),expected=receipt.selected_files.find(f=>f.path===`${id}/${name}`);
    assert.equal(data.length,expected.bytes);assert.equal(hash(data),expected.sha256);
  }
  const [asset,same]=await Promise.all([loadCharacter(id),loadCharacter(id)]);
  assert.equal(asset,same);assert.equal(await loadCharacter(id),asset);
  assert.equal(asset.metadata.triangles,pin.triangles);totalTriangles+=pin.triangles;
  assert.equal(asset.metadata.sha256,hash(bytes));assert.equal(asset.metadata.bytes,bytes.length);
  assert.equal(asset.metadata.unlit,true);assert.equal(asset.textured,false);
  assert.ok(Object.isFrozen(asset.metadata.bodyBounds));assert.ok(Object.isFrozen(asset.metadata.bodyBounds.min));
  for(const key of ['min','max'])for(let i=0;i<3;i++)assert.ok(Math.abs(asset.metadata.bodyBounds[key][i]-pin.body_bounds[key][i])<2e-5);
  assert.deepEqual(asset.metadata.generatedUV,[]);assert.equal(asset.metadata.movableNodes,pin.joints.length);
  const a=cloneCharacter(id,{shareGeometry:true}),b=cloneCharacter(id,{shareGeometry:true}),c=cloneCharacter(id);
  const aMaterials=new Set(),cGeometries=new Set(),byName=new Map();
  a.group.traverse(node=>{
    if(!node.isMesh)return;
    const original=asset.root.getObjectByName(node.name),other=b.group.getObjectByName(node.name),owned=c.group.getObjectByName(node.name);
    assert.equal(node.geometry,original.geometry);assert.equal(node.geometry,other.geometry);assert.notEqual(owned.geometry,original.geometry);
    assert.notEqual(node.material,original.material);assert.notEqual(node.material,other.material);
    assert.ok(node.material instanceof THREE.MeshBasicMaterial);
    assert.equal(node.material.map,null);assert.equal(node.material.normalMap,undefined);assert.equal(node.material.normalScale,undefined);
    assert.equal(node.material.metalness,undefined);assert.equal(node.material.roughness,undefined);
    const slot=asset.palette.material_slots.find(s=>s.name===node.material.name);
    assert.deepEqual(node.material.color.toArray(),slot.base_color_linear_rgba.slice(0,3),'exact linear palette, no sRGB reinterpretation');
    assert.equal(node.material.opacity,slot.base_color_linear_rgba[3]);
    if(byName.has(node.material.name))assert.equal(node.material,byName.get(node.material.name),'sharing inside one clone');
    byName.set(node.material.name,node.material);aMaterials.add(node.material);cGeometries.add(owned.geometry);
    for(const attr of Object.values(node.geometry.attributes))assert.ok(attr.array.every(Number.isFinite));
    for(const index of node.geometry.index.array)assert.ok(index<node.geometry.attributes.position.count);
  });
  assert.equal(aMaterials.size,4);materialCopies+=aMaterials.size;
  const am=firstMesh(a.group),bm=firstMesh(b.group),old=bm.material.color.clone();am.material.color.setRGB(.1,.2,.3);assert.ok(bm.material.color.equals(old));
  let materialDisposals=0,geometryDisposals=0,sharedDisposals=0;
  for(const m of aMaterials)m.addEventListener('dispose',()=>materialDisposals++);
  for(const g of cGeometries)g.addEventListener('dispose',()=>geometryDisposals++);
  const shared=new Set();asset.root.traverse(n=>{if(n.isMesh)shared.add(n.geometry);});
  for(const g of shared)g.addEventListener('dispose',()=>sharedDisposals++);
  a.dispose();a.dispose();b.dispose();c.dispose();c.dispose();
  assert.equal(materialDisposals,4);assert.equal(geometryDisposals,cGeometries.size);assert.equal(sharedDisposals,0);
  geometryCopies+=geometryDisposals;assert.equal(a.group.children.length,0);decoded++;
}
assert.equal(characterMetadata().length,40);assert.equal(totalTriangles,126626);
console.log(`PASS expansion: ${decoded} actual GLTFLoader/cache loads, GLB/sidecar pins, 126626 triangles, exact raw-metre body bounds, ${materialCopies} isolated unlit materials, ${geometryCopies} owned geometries; sharing and idempotent disposal`);
const id='ballista',folder=new URL(`${id}/`,base),source=raw(new URL('model.glb',folder));
const doc=JSON.parse(source.subarray(20,20+source.readUInt32LE(12))),binary=source.subarray(28+source.readUInt32LE(12));
function pack(d,bin=binary) {
  let text=Buffer.from(JSON.stringify(d));text=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]);
  const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+text.length+bin.length,8);header.writeUInt32LE(text.length,12);header.writeUInt32LE(0x4e4f534a,16);
  const chunk=Buffer.alloc(8);chunk.writeUInt32LE(bin.length);chunk.writeUInt32LE(0x004e4942,4);
  return buffer(Buffer.concat([header,text,chunk,bin]));
}
let rejected=0;
for(const change of [
  d=>d.buffers[0].uri='https://invalid.example/b.bin',
  d=>d.buffers[0].uri='data:application/octet-stream;base64,AA==',
  d=>d.extensionsRequired=['EXT_untrusted'],
  d=>d.accessors[0].count=999999,
  d=>d.nodes[0].translation=[NaN,0,0],
  d=>d.nodes[0].children=[0],
  d=>d.nodes[0].name=d.nodes[1].name,
  d=>d.nodes[0].name='FX_ROOT',
  d=>d.materials[0].extensions={},
  d=>d.materials[0].pbrMetallicRoughness.baseColorFactor=[2,0,0,1],
]) {const d=structuredClone(doc);change(d);assert.throws(()=>inspectExpansionGLB(pack(d)));rejected++;}
const badIndex=Buffer.from(binary),p=doc.meshes[0].primitives[0],ia=doc.accessors[p.indices],iv=doc.bufferViews[ia.bufferView];
badIndex.writeUInt16LE(65535,(iv.byteOffset??0)+(ia.byteOffset??0));assert.throws(()=>inspectExpansionGLB(pack(doc,badIndex)),/index range/);rejected++;
const nonfinite=Buffer.from(binary),pa=doc.accessors[p.attributes.POSITION],pv=doc.bufferViews[pa.bufferView];
nonfinite.writeFloatLE(Infinity,(pv.byteOffset??0)+(pa.byteOffset??0));assert.throws(()=>inspectExpansionGLB(pack(doc,nonfinite)),/nonfinite/);rejected++;
assert.throws(()=>inspectExpansionGLB(new ArrayBuffer(10)));rejected++;
const manifest=json(new URL('manifest.json',folder)),palette=json(new URL('palette.json',folder)),rig=json(new URL('rig.json',folder));
const inspected=inspectExpansionGLB(buffer(source)),pin=receipt.heroes[id].variants.clean;
for(const change of [x=>x.manifest.schema='jankolock_realistic_asset_v1',x=>x.palette.schema='semantic_pbr_palette_v1',x=>x.rig.movable_nodes[1].parent='wrong',x=>x.rig.movable_nodes[1].pivot_position=[9,9,9]]) {
  const x=structuredClone({manifest,palette,rig});change(x);assert.throws(()=>validateExpansionSidecars(id,inspected,x.manifest,x.palette,x.rig,pin));rejected++;
}
await assert.rejects(loadExpansionCharacter(id,{base:new URL('./models/',import.meta.url),bytesAt:async()=>buffer(new Uint8Array([1,2,3])),digest:async()=>''}),/integrity/);rejected++;
const freshHelper=await import('./character-expansion.mjs?receipt-corruption-test');
await assert.rejects(freshHelper.loadExpansionCharacter(id,{base:new URL('./models/',import.meta.url),bytesAt:async()=>buffer(new Uint8Array([1,2,3])),digest:async bytes=>hash(Buffer.from(bytes))}),/central receipt integrity/);rejected++;
let baseMaterials=0,baseGeometries=0;
for(const hero of characterMetadata()) {
  const asset=await loadCharacter(hero.id),materials=new Set(),geometries=new Set();
  asset.root.traverse(n=>{if(n.isMesh){materials.add(n.material);geometries.add(n.geometry);}});
  for(const m of materials)m.addEventListener('dispose',()=>baseMaterials++);
  for(const g of geometries)g.addEventListener('dispose',()=>baseGeometries++);
}
disposeCharacterAssets();disposeCharacterAssets();assert.equal(characterMetadata().length,0);assert.equal(baseMaterials,160);assert.ok(baseGeometries>0);
console.log(`PASS negative guards: ${rejected} malformed geometry/sidecar/integrity cases plus unknown/traversal/variant IDs; cached source resources disposed once`);
const reloaded=await loadCharacter('ballista');assert.equal(reloaded.metadata.unlit,true);assert.equal(characterMetadata().length,1);disposeCharacterAssets();
// The helper itself is dynamic too: old characters do not gain even an expansion module request.
const loaderSource=raw(new URL('./character-assets.mjs',import.meta.url)).toString();
assert.doesNotMatch(loaderSource,/^import .*character-expansion\.mjs/m);
assert.match(loaderSource,/await import\('\.\/character-expansion\.mjs'\)/);
// A fresh loader instance under a browser-like fetch host proves old characters never request expansion data.
const oldFetch=globalThis.fetch;globalThis.window={};const requests=[];
globalThis.fetch=async url=>{requests.push(String(url));const data=raw(url);return {ok:true,arrayBuffer:async()=>buffer(data)};};
try {
  const legacy=await import('./character-assets.mjs?expansion-lazy-regression');
  await legacy.loadCharacter('stampead');assert.ok(requests.length>0);assert.ok(requests.every(url=>!url.includes('/expansion40/')));
  assert.equal(legacy.characterMetadata().length,1);legacy.disposeCharacterAssets();
} finally {delete globalThis.window;globalThis.fetch=oldFetch;}
console.log('PASS lazy original regression: original Stampead load requests no expansion receipt/assets; no expansion preload, no browser/GPU/gameplay claim');
