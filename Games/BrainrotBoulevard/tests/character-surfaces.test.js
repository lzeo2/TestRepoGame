import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {surface,getSurfaceStats} from '../src/character-surfaces.js';
import {createCollectible,animateCollectible,disposeCharacter} from '../src/characters.js';

test('organic PBR surfaces are detailed, browser-independent, color-correct, and shared',()=>{
  const albedos=new Set();
  for(const name of getSurfaceStats().available){
    const m=surface(name);
    assert.equal(surface(name),m,`${name} is pooled`);
    assert.ok(m.isMeshStandardMaterial,`${name} supports PBR lighting`);
    assert.equal(m.map.colorSpace,THREE.SRGBColorSpace);
    assert.equal(m.bumpMap.colorSpace,THREE.NoColorSpace);
    assert.equal(m.map.image.width,256);assert.equal(m.map.image.height,256);
    assert.equal(m.bumpMap,m.roughnessMap,'packed maps avoid duplicate VRAM');
    assert.ok(m.bumpScale>0);assert.ok(m.userData.heightRange[1]-m.userData.heightRange[0]>.02);
    assert.ok(m.userData.roughnessRange[1]-m.userData.roughnessRange[0]>.01);
    const pixels=m.map.image.data; let lo=255,hi=0;
    for(let i=0;i<pixels.length;i+=4){lo=Math.min(lo,pixels[i]);hi=Math.max(hi,pixels[i]);}
    assert.ok(hi-lo>7,`${name} has pigment detail`);
    albedos.add(m.map);
  }
  assert.equal(albedos.size,25,'all distinct skins have separate authored patterns');
  assert.equal(surface('reptile'),surface('scales'));
  assert.throws(()=>surface('missing-profile'),/Unknown collectible surface/);
});

test('every remodeled collectible has organic PBR anatomy inside its GPU budget',()=>{
  const expected=['crust','octopus','cactus','cow','banana','duckFeather','pasta','scales'];
  for(let kind=0;kind<8;kind++){
    const g=createCollectible(kind);let meshes=0,triangles=0;const materialNames=new Set();
    g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;materialNames.add(o.material.userData.surface);assert.ok(o.material.map);assert.ok(o.material.bumpMap);assert.ok(o.material.roughnessMap);}});
    assert.ok(meshes<=35,`kind ${kind}: ${meshes} draw meshes`);
    assert.ok(triangles<=30000,`kind ${kind}: ${triangles} triangles`);
    assert.ok(triangles>10000,`kind ${kind} retains modeled detail`);
    assert.ok(materialNames.has(expected[kind]),`kind ${kind}: recognizable surface`);
    assert.ok(materialNames.has('sclera')&&materialNames.has('iris'),'eyes are actual layered anatomy');
    assert.ok(g.userData.animatedParts.length>0);
    disposeCharacter(g);
  }
});

test('texture disposal is safe across live clones and animation cannot alter materials',()=>{
  const first=createCollectible(3),second=createCollectible(3);let disposed=0;
  const maps=new Set(),geometries=new Set();
  second.traverse(o=>{if(o.isMesh){maps.add(o.material.map);geometries.add(o.geometry);}});
  for(const t of maps)t.addEventListener('dispose',()=>disposed++);
  for(const g of geometries)g.addEventListener('dispose',()=>disposed++);
  for(let t=0;t<20;t+=.25)animateCollectible(first,t);
  disposeCharacter(first);assert.equal(disposed,0);
  const after=new Set();second.traverse(o=>{if(o.isMesh)after.add(o.material.map);});
  assert.deepEqual(after,maps);
  assert.ok(Math.abs(second.userData.rig.rotation.z)<1e-12);
  disposeCharacter(second);assert.equal(disposed,0);
});
