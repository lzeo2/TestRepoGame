import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { prepareSecretTemplate, createSecretCharacter, loadSecretCharacter, secretAssetStatus, disposeSecretCharacter } from '../src/secret-character.js';
import { createState, claimSecret, secretRequirement, buy, rebirth, serialize, restore } from '../src/rules.js';

const asset=readFileSync(new URL('../assets/secret-cave-creature.glb',import.meta.url));

test('earlier snarl asset is bundled byte-for-byte, self-contained and decoder-free',()=>{
  assert.equal(asset.readUInt32LE(0),0x46546c67);assert.equal(asset.readUInt32LE(4),2);
  const doc=JSON.parse(asset.subarray(20,20+asset.readUInt32LE(12)).toString());
  assert.equal(doc.materials.length,4);assert.equal(doc.images.length,4);
  assert.ok(doc.images.every(image=>Number.isInteger(image.bufferView)&&!image.uri));
  assert.ok(doc.buffers.every(buffer=>!buffer.uri));
  assert.equal(doc.extensionsRequired,undefined);
  const triangles=doc.meshes.flatMap(mesh=>mesh.primitives).reduce((n,p)=>n+doc.accessors[p.indices].count/3,0);
  assert.equal(triangles,13926);
  assert.equal(createHash('sha256').update(asset).digest('hex'),'bc77d7c17a4638f37acb5547a490f50f07fda818f6261e6767e674823d64562c');
});

test('real GLTFLoader parses secret geometry and keeps its anatomy within a pedestal footprint',async()=>{
  // Pixel decoding is explicitly stubbed. The real glTF parser, attributes,
  // materials, embedded image Blob requests and bounds are exercised here.
  const previousSelf=globalThis.self,previousBitmap=globalThis.createImageBitmap;
  globalThis.self=globalThis;
  globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
  try{
    const gltf=await new GLTFLoader().parseAsync(asset.buffer.slice(asset.byteOffset,asset.byteOffset+asset.byteLength),'');
    const root=prepareSecretTemplate(gltf.scene);
    const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.x<=2.151&&size.z<=2.151);assert.ok(Math.abs(bounds.min.y)<.0001);
    assert.ok(size.y<.7&&size.y>.3,'must preserve crouching anatomy, never stretch upright');
    let count=0;root.traverse(o=>{if(o.isMesh){count++;assert.ok(o.material.isMeshStandardMaterial);assert.ok(o.geometry.getAttribute('normal'));}});
    assert.equal(count,4);
    const clone=root.clone(true);let disposed=0;
    root.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposed++));root.clear();
    assert.equal(disposed,0);assert.ok(!new THREE.Box3().setFromObject(clone).isEmpty());
  }finally{globalThis.self=previousSelf;globalThis.createImageBitmap=previousBitmap;}
});

test('secret unlock is free, requires unique discoveries and cannot repeat until rebirth',()=>{
  const state=createState();state.collection=[0,0,0];assert.equal(secretRequirement(state).ok,false);
  state.collection=[0,1,2];const balance=state.money;
  assert.equal(buy(state,8).ok,false);
  assert.equal(claimSecret(state).ok,true);assert.equal(state.money,balance);
  assert.equal(state.stats.buys,0);assert.equal(state.stats.steals,0);
  assert.equal(claimSecret(state).ok,false);
  const restored=restore(serialize(state));assert.equal(restored.secretClaimed,true);assert.equal(restored.owned[0].kind,8);
  restored.money=25000;assert.equal(rebirth(restored).ok,true);assert.equal(restored.secretClaimed,false);
  assert.equal(claimSecret(restored).ok,true);
});

test('full capacity blocks shrine without consuming the claim or changing money',()=>{
  const state=createState();state.collection=[0,1,2];state.money=10000;
  for(let i=0;i<6;i++)buy(state,0);
  const before=serialize(state);assert.equal(claimSecret(state).ok,false);assert.equal(serialize(state),before);
});


test('secret load failures remain honest; retries hydrate pending clones and share resources',async()=>{
  const previous={self:globalThis.self,bitmap:globalThis.createImageBitmap,progress:globalThis.ProgressEvent};
  globalThis.self=globalThis;globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
  globalThis.ProgressEvent=class {constructor(type,data){Object.assign(this,{type},data);}};
  try{
    const disposedBeforeLoad=createSecretCharacter();disposeSecretCharacter(disposedBeforeLoad);
    const pending=createSecretCharacter(.8);assert.equal(pending.visible,false);assert.equal(pending.children.length,0);
    await assert.rejects(loadSecretCharacter('data:application/octet-stream,invalid'));
    assert.equal(secretAssetStatus().ready,false);assert.equal(pending.children.length,0);
    const promise=loadSecretCharacter(`data:model/gltf-binary;base64,${asset.toString('base64')}`);
    assert.equal(loadSecretCharacter(),promise,'simultaneous loads share one promise');
    await promise;
    assert.equal(secretAssetStatus().ready,true);assert.equal(pending.visible,true);assert.equal(pending.userData.pendingAsset,false);
    assert.ok(Math.abs(new THREE.Box3().setFromObject(pending).getSize(new THREE.Vector3()).y-pending.userData.height)<.0001);
    assert.equal(disposedBeforeLoad.children.length,0,'disposed pending roots must never be reattached');
    const other=createSecretCharacter(.8);let firstMesh,otherMesh;
    pending.traverse(node=>{if(node.isMesh&&!firstMesh)firstMesh=node;});other.traverse(node=>{if(node.isMesh&&!otherMesh)otherMesh=node;});
    assert.equal(firstMesh.geometry,otherMesh.geometry);assert.equal(firstMesh.material,otherMesh.material);
    let disposals=0;firstMesh.geometry.addEventListener('dispose',()=>disposals++);
    disposeSecretCharacter(pending);assert.equal(disposals,0);assert.ok(!new THREE.Box3().setFromObject(other).isEmpty());
    disposeSecretCharacter(other);
  }finally{globalThis.self=previous.self;globalThis.createImageBitmap=previous.bitmap;globalThis.ProgressEvent=previous.progress;}
});
