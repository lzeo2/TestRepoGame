import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from './vendor/three.module.js';
import { applyExternalTerrain } from './external-materials.mjs';

// Read actual delivered channels without an image decoder, browser or WebGL.
const bytes = readFileSync(new URL('./models/terrain_water_materials/model.glb', import.meta.url));
assert.equal(bytes.readUInt32LE(0), 0x46546c67);
assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
const manifest = JSON.parse(readFileSync(new URL('./models/terrain_water_materials/manifest.json', import.meta.url)));
const palette = JSON.parse(readFileSync(new URL('./models/terrain_water_materials/palette.json', import.meta.url)));
assert.equal(json.materials.length, 5);
assert.deepEqual(json.materials.map(m => m.name).sort(), [...manifest.material_slots].sort());
assert(json.materials.every(m => !m.occlusionTexture), 'Actual delivery has no AO channel');
const maps = new Map();
function texture(info, colorSpace) {
  const key = `${info.index}:${info.texCoord || 0}:${colorSpace}`;
  if (!maps.has(key)) {
    const image = json.images[json.textures[info.index].source];
    assert(Number.isInteger(image.bufferView), 'Delivery texture must be embedded');
    const map = new THREE.DataTexture(new Uint8Array([100, 150, 200, 255]), 1, 1);
    map.channel = info.texCoord || 0; map.colorSpace = colorSpace; map.flipY = false;
    maps.set(key, map);
  }
  return maps.get(key);
}
const scene = new THREE.Group();
for (const definition of json.materials) {
  const pbr = definition.pbrMetallicRoughness, factor = pbr.baseColorFactor || [1, 1, 1, 1];
  assert.deepEqual(factor, palette.palette_default[definition.name]);
  const material = new THREE.MeshStandardMaterial({ name: definition.name,
    color: new THREE.Color().setRGB(...factor.slice(0, 3), THREE.LinearSRGBColorSpace),
    opacity: factor[3], roughness: pbr.roughnessFactor ?? 1, metalness: pbr.metallicFactor ?? 1,
    side: definition.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    map: texture(pbr.baseColorTexture, THREE.SRGBColorSpace),
    normalMap: texture(definition.normalTexture, THREE.NoColorSpace),
    roughnessMap: texture(pbr.metallicRoughnessTexture, THREE.NoColorSpace),
    metalnessMap: texture(pbr.metallicRoughnessTexture, THREE.NoColorSpace),
    normalScale: new THREE.Vector2().setScalar(definition.normalTexture.scale ?? 1),
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(), material));
}
function fixture(nonIndexed = false) {
  const extent = 1000, lotSize = 10;
  let geometry = new THREE.PlaneGeometry(extent * 2, extent * 2, 64, 64);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, -THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), extent - lotSize * 4, extent) *
      (.3 + .25 * Math.sin(x * .09) * Math.cos(z * .12)));
  }
  if (nonIndexed) geometry = geometry.toNonIndexed();
  geometry.setAttribute('uv1', geometry.attributes.uv.clone());
  const ao = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255]), 1, 1); ao.channel = 1;
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ aoMap: ao, aoMapIntensity: .8 }));
  const road = new THREE.InstancedMesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial(), 2);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshPhysicalMaterial({ clearcoat: .8 }));
  water.position.y = -.4;
  return { ground, road, water, extent, lotSize };
}
const sourceMaterials = scene.children.map(mesh => mesh.material);
const snapshot = () => sourceMaterials.map(m => ({ color: m.color.toArray(), roughness: m.roughness,
  metalness: m.metalness, normalScale: m.normalScale.toArray(), textures: Object.keys(m)
    .filter(key => m[key]?.isTexture).map(key => ({ key, uuid: m[key].uuid, channel: m[key].channel,
      repeat: m[key].repeat.toArray(), offset: m[key].offset.toArray(), colorSpace: m[key].colorSpace,
      wrapS: m[key].wrapS, bytes: [...m[key].image.data] })) }));
const before = snapshot();
let sourceDisposals = 0;
for (const resource of [...sourceMaterials, ...maps.values()]) resource.addEventListener('dispose', () => sourceDisposals++);

for (const nonIndexed of [false, true]) {
  const input = fixture(nonIndexed), { ground, road, water } = input;
  const originals = [ground.material, road.material, water.material];
  let originalDisposals = 0;
  for (const resource of [...originals, ground.material.aoMap, ground.geometry, road.geometry, water.geometry]) {
    resource.addEventListener('dispose', () => originalDisposals++);
  }
  const positions = ground.geometry.attributes.position.array.slice();
  const indices = ground.geometry.index?.array.slice();
  const uv1 = ground.geometry.attributes.uv1;
  const matrices = road.instanceMatrix.array.slice();
  const sampleHits = () => [[0, 0], [975, 37], [-985, -125], [400, -300]].map(([x, z]) => {
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0));
    return ray.intersectObject(ground).map(hit => ({ point: hit.point.toArray(), distance: hit.distance }));
  });
  const hits = sampleHits();
  const api = applyExternalTerrain(input, { scene });
  assert.deepEqual(api.diagnostics.unused, []);
  if (!nonIndexed) console.log('Default terrain grouping:', JSON.stringify({
    groups: api.diagnostics.groundGroups, triangles: api.diagnostics.groundTriangles,
  }));
  assert.equal(api.diagnostics.analyticAO.length, 3);
  assert.equal(api.diagnostics.importedAO.length, 0);
  assert.match(api.diagnostics.notes.join(' '), /no occlusionTexture/);
  const materials = [...ground.material, road.material, water.material];
  const owned = new Set(materials);
  for (const material of materials) {
    const source = sourceMaterials.find(m => m.name === material.name);
    assert.notEqual(material, source);
    assert(material.color.equals(source.color));
    for (const key of ['roughness', 'metalness', 'side', 'opacity']) assert.equal(material[key], source[key]);
    assert(material.normalScale.equals(source.normalScale));
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
      assert.notEqual(material[key], source[key]);
      assert.equal(material[key].image, source[key].image);
      assert.equal(material[key].channel, source[key].channel);
      assert.equal(material[key].flipY, false);
      assert.equal(material[key].colorSpace, key === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace);
      assert.equal(material[key].wrapS, THREE.RepeatWrapping);
      owned.add(material[key]);
    }
    assert.equal(material.roughnessMap, material.metalnessMap, 'Packed G/B remain shared, not copied into AO');
  }
  for (const material of ground.material) {
    assert.equal(material.aoMap, originals[0].aoMap);
    assert.equal(material.aoMap.channel, 1);
    assert.equal(material.aoMapIntensity, .8);
    assert.equal(material.map.repeat.x, 2000 / 12);
  }
  assert.equal(road.material.map.repeat.x, 1);
  assert.equal(water.material.normalMap.repeat.x, 100);
  assert.equal(road.receiveShadow, true);
  assert.equal(water.material.clearcoat, .8);
  assert.equal(water.material.clearcoatNormalMap, water.material.normalMap);
  let cursor = 0;
  const counts = [0, 0, 0];
  for (const group of ground.geometry.groups) {
    assert.equal(group.start, cursor); assert.equal(group.count % 3, 0);
    cursor += group.count; counts[group.materialIndex] += group.count / 3;
  }
  assert.equal(cursor, 64 * 64 * 6);
  assert.deepEqual(counts, Object.values(api.diagnostics.groundTriangles));
  assert(counts.every(n => n > 0));
  assert.equal(ground.geometry.attributes.uv1, uv1);
  api.update(2);
  assert(Math.abs(water.material.normalMap.offset.x - .024) < 1e-12);
  assert(Math.abs(water.material.normalMap.offset.y - .014) < 1e-12);
  const flow = water.material.normalMap.offset.clone();
  for (const dt of [-1, NaN, Infinity, 0]) api.update(dt);
  assert(water.material.normalMap.offset.equals(flow));
  api.update(1000);
  assert(water.material.normalMap.offset.x >= 0 && water.material.normalMap.offset.x < 1);
  assert.equal(water.position.y, -.4);
  assert.deepEqual(ground.geometry.attributes.position.array, positions);
  if (indices) {
    const triangles = array => {
      const result = [];
      for (let i = 0; i < array.length; i += 3) result.push(`${array[i]},${array[i + 1]},${array[i + 2]}`);
      return result.sort();
    };
    assert.deepEqual(triangles(ground.geometry.index.array), triangles(indices));
    assert.equal(ground.geometry.groups.length, 3);
  }
  assert.deepEqual(road.instanceMatrix.array, matrices);
  assert.deepEqual(sampleHits(), hits, 'Ground ray hit points unchanged by material grouping');
  assert.deepEqual(snapshot(), before);
  let disposals = 0;
  for (const resource of owned) resource.addEventListener('dispose', () => disposals++);
  api.dispose(); api.dispose(); api.update(1);
  assert.equal(disposals, owned.size);
  assert.equal(originalDisposals, 0);
  assert.deepEqual([ground.material, road.material, water.material], originals);
  assert.equal(ground.geometry.groups.length, 0);
  assert.deepEqual(ground.geometry.index?.array, indices);
}

// Future imported AO must not be overwritten or disposed with the loader cache.
const grass = sourceMaterials.find(m => m.name.endsWith('__grass'));
const importedAO = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255]), 1, 1);
importedAO.channel = 1; importedAO.addEventListener('dispose', () => sourceDisposals++);
grass.aoMap = importedAO; grass.aoMapIntensity = .45;
const input = fixture(), api = applyExternalTerrain(input, { scene });
assert.deepEqual(api.diagnostics.importedAO, ['grass']);
assert.notEqual(input.ground.material[0].aoMap, importedAO);
assert.equal(input.ground.material[0].aoMap.image, importedAO.image);
assert.equal(input.ground.material[0].aoMap.channel, 1);
assert.equal(input.ground.material[0].aoMapIntensity, .45);
api.dispose(); grass.aoMap = null;
assert.equal(sourceDisposals, 0);
assert.deepEqual(snapshot(), before);
console.log('PASS external terrain: actual GLB channels/factors, indexed/nonindexed triangle coverage, source isolation, AO, flow, ownership/disposal');
