// Run: node Games/Citisten3D/building-surfaces-check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor/three.module.js';
import { MODEL_DIRECTORIES } from './external-assets.mjs';
import { buildingSurfaceKind, createBuildingSurface } from './building-surfaces.mjs';

const kinds = new Map(), counts = [];
let checked = 0;
for (const lod of [0, 1, 2]) for (const [type, directory] of Object.entries(MODEL_DIRECTORIES)) {
  const bytes = readFileSync(new URL(`./models/${directory}/${lod ? `model_LOD${lod}` : 'model'}.glb`, import.meta.url));
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  let triangles = 0;
  for (const node of json.nodes) if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
    assert.equal(primitive.mode ?? 4, 4);
    triangles += json.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
    assert.ok(primitive.attributes.NORMAL !== undefined, `${directory}: authored normals`);
    const def = json.materials[primitive.material];
    const textured = def.normalTexture || def.pbrMetallicRoughness.baseColorTexture;
    if (textured) assert.ok(primitive.attributes.TEXCOORD_0 !== undefined, `${directory}: authored UV`);
  }
  counts.push({ type, lod, materials: json.materials.length, triangles });
  for (const def of json.materials) {
    const pbr = def.pbrMetallicRoughness, factor = pbr.baseColorFactor ?? [1, 1, 1, 1];
    const original = new THREE.MeshStandardMaterial({ name: def.name,
      color: new THREE.Color().fromArray(factor), opacity: factor[3],
      roughness: pbr.roughnessFactor ?? 1, metalness: pbr.metallicFactor ?? 1,
      emissive: new THREE.Color().fromArray(def.emissiveFactor ?? [0, 0, 0]),
      side: def.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });
    const maps = new Map();
    for (const [key, info] of Object.entries({ map: pbr.baseColorTexture, normalMap: def.normalTexture,
      roughnessMap: pbr.metallicRoughnessTexture, metalnessMap: pbr.metallicRoughnessTexture,
      aoMap: def.occlusionTexture, emissiveMap: def.emissiveTexture })) if (info) {
      if (!maps.has(info.index)) {
        const texture = new THREE.DataTexture(new Uint8Array([120, 140, 160, 255]), 1, 1);
        texture.channel = info.texCoord ?? 0; texture.flipY = false;
        texture.offset.set(.1, .2); texture.repeat.set(.8, .9); maps.set(info.index, texture);
      }
      original[key] = maps.get(info.index);
    }
    if (def.normalTexture) original.normalScale.setScalar(def.normalTexture.scale ?? 1);
    const before = JSON.stringify(original.toJSON());
    let sourceDisposals = 0, cloneDisposals = 0;
    for (const resource of [original, ...maps.values()]) resource.addEventListener('dispose', () => sourceDisposals++);
    const material = createBuildingSurface(original), kind = buildingSurfaceKind(original);
    if (!lod) kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    assert.notEqual(material, original);
    for (const key of Object.keys(original).filter(key => original[key]?.isTexture)) assert.equal(material[key], original[key]);
    assert.ok(material.normalScale.equals(original.normalScale));
    assert.ok(material.color.equals(original.color)); assert.ok(material.emissive.equals(original.emissive));
    assert.equal(material.emissiveIntensity, original.emissiveIntensity);
    assert.equal(material.opacity, original.opacity); assert.equal(material.side, original.side);
    assert.equal(material.transparent, original.transparent);
    if (kind === 'glass') {
      assert.equal(material.metalness, 0); assert.ok(material.roughness <= .22);
      assert.equal(material.envMap, null, 'reflection comes from scene.environment, not a new texture');
    } else {
      assert.equal(material.roughness, original.roughness); assert.equal(material.metalness, original.metalness);
    }
    const shader = { vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader);
    if (!['authored', 'glass'].includes(kind)) {
      assert.match(shader.vertexShader, /vBuildingPosition = position/);
      assert.match(shader.fragmentShader, /roughnessFactor = clamp/);
      assert.equal(shader.fragmentShader.includes('float panel ='), kind === 'sheet');
      assert.ok(shader.vertexShader.includes('#include <project_vertex>'));
      for (const chunk of ['normal_fragment_maps', 'roughnessmap_fragment', 'metalnessmap_fragment', 'emissivemap_fragment', 'aomap_fragment']) {
        assert.ok(shader.fragmentShader.includes(`#include <${chunk}>`), `retained ${chunk}`);
      }
      const sibling = createBuildingSurface(original);
      assert.equal(sibling.customProgramCacheKey(), material.customProgramCacheKey()); sibling.dispose();
    } else {
      assert.equal(shader.vertexShader, THREE.ShaderLib.standard.vertexShader);
      assert.equal(shader.fragmentShader, THREE.ShaderLib.standard.fragmentShader);
    }
    assert.equal(JSON.stringify(original.toJSON()), before, `${def.name}: source never mutated`);
    material.addEventListener('dispose', () => cloneDisposals++); material.dispose();
    assert.equal(cloneDisposals, 1); assert.equal(sourceDisposals, 0, 'surface borrows, never disposes loader maps');
    original.dispose(); for (const texture of maps.values()) texture.dispose();
    checked++;
  }
}
assert.deepEqual(Object.fromEntries(kinds), { metal: 18, authored: 77, masonry: 16, roof: 5, glass: 7, sheet: 4 });
assert.equal(counts.length, 51);
console.log(`PASS building surfaces: ${checked} actual LOD0/1/2 material definitions; classification, authored channels, source isolation, shared shader keys, ownership/cleanup`);
console.log('LOD0 surface kinds:', JSON.stringify(Object.fromEntries(kinds)));
console.log('LIMIT: shader assembly tested against vendored Three chunks; WebGL compilation, visual and performance acceptance belong to integrated QA.');
