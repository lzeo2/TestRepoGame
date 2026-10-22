// Delivered art only: default/--check is read-only; --ingest copies pinned bytes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, statfsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from '../vendor/three.module.js';
import { GLTFLoader } from '../vendor/addons/GLTFLoader.js';

const deliveries = [
  ['stampead', 'stampead', 25596, 17, '6c679456b2ce7adce25515f5eb5e4947960a4541904edb65f290a5f9978926f0'],
  ['turretina', 'turretina', 22416, 23, 'e5a3dffe77d0487c30197759367e6851ad650a9d9358670e198fe927a8f763a7'],
  ['snipeoff', 'snipeoff', 19160, 20, 'a4a0faa196232bf7a40d28491b8f66f056ab0ba3da614c10946ecd8aab13b0bc'],
  ['gooey', 'gooey_sticky', 48760, 10, '56d029d66b5aeaa31e07b1bedcaf70b96537e56cf0b9e66d48bd17d22623ab12'],
  ['deployed_stapler', 'deployed_stapler', 3248, 5, '82eea211eaa556258adaec5e9daf88dfd931931932d983a08c31efa060039fd0'],
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = bytes => JSON.parse(bytes.toString('utf8'));
const close = (actual, expected, label) => {
  assert.equal(actual.length, expected.length, label);
  actual.forEach((n, i) => assert(Number.isFinite(n) && Math.abs(n - expected[i]) < 0.00001, label));
};
function diskGuard() {
  const disk = statfsSync(new URL('.', import.meta.url), { bigint: true });
  assert(disk.bavail * disk.bsize >= 2147483648n, 'Storage below 2 GiB; stop');
}
function noURI(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(key !== 'uri', 'URI forbidden in self-contained delivery');
    noURI(child);
  }
}
function decode(bytes) {
  assert(bytes.length >= 28 && bytes.length < 8 * 1024 * 1024, 'GLB byte cap/header');
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'GLB length');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    assert(offset + 8 <= bytes.length, 'Chunk header');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    assert(length % 4 === 0 && offset + 8 + length <= bytes.length, 'Chunk bounds/alignment');
    chunks.push({ type, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  assert.deepEqual(chunks.map(c => c.type), [0x4e4f534a, 0x004e4942]);
  const doc = json(chunks[0].data), binary = chunks[1].data;
  assert.equal(doc.asset.version, '2.0');
  noURI(doc);
  for (const key of ['images', 'textures', 'skins', 'animations', 'extensionsRequired'])
    assert.equal((doc[key] || []).length, 0, key);
  assert.equal(doc.buffers.length, 1);
  assert(doc.buffers[0].byteLength <= binary.length && binary.length - doc.buffers[0].byteLength <= 3);
  for (const view of doc.bufferViews) {
    assert.equal(view.buffer, 0);
    assert((view.byteOffset || 0) >= 0 && view.byteLength > 0);
    assert((view.byteOffset || 0) + view.byteLength <= doc.buffers[0].byteLength);
  }
  for (const accessor of doc.accessors) {
    assert(!accessor.sparse, 'Delivery uses ordinary accessors');
    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
    const width = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
    const view = doc.bufferViews[accessor.bufferView];
    assert(components && width && view && Number.isInteger(accessor.count) && accessor.count > 0);
    const stride = view.byteStride || components * width;
    assert(stride >= components * width && (accessor.byteOffset || 0) >= 0);
    assert((accessor.byteOffset || 0) + (accessor.count - 1) * stride + components * width <= view.byteLength);
  }
  return doc;
}
async function audit(files, delivery) {
  const [id, source, expectedTriangles, movableCount, expectedSHA] = delivery;
  const bytes = files['model.glb'], doc = decode(bytes);
  assert.equal(sha(bytes), expectedSHA, `${id}: delivered bytes changed`);
  const manifest = json(files['manifest.json']), rig = json(files['rig.json']);
  json(files['palette.json']);
  assert.equal(manifest.sha256, expectedSHA);
  assert.equal(manifest.size_bytes, bytes.length);
  assert.equal(manifest.tri_count_LOD0, expectedTriangles);
  assert.equal(rig.movable_nodes.length, movableCount);
  assert.deepEqual(manifest.rig_nodes, rig.movable_nodes.map(n => n.name));
  assert.deepEqual(manifest.material_slots, doc.materials.map(m => m.name));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  let rawTriangles = 0;
  const visited = new Set();
  function visit(index) {
    assert(!visited.has(index), 'Cyclic or multiply-parented scene node');
    visited.add(index);
    const node = doc.nodes[index];
    assert(node);
    if (node.mesh !== undefined) for (const primitive of doc.meshes[node.mesh].primitives) {
      assert.equal(primitive.mode ?? 4, 4, 'Only triangle primitives');
      const p = doc.accessors[primitive.attributes.POSITION];
      assert.equal(p.type, 'VEC3');
      for (const [semantic, type] of [['NORMAL', 'VEC3'], ['TEXCOORD_0', 'VEC2']]) {
        const a = doc.accessors[primitive.attributes[semantic]];
        if (semantic === 'TEXCOORD_0' && !a) continue;
        assert(a && a.count === p.count && a.type === type, `${semantic} count/type`);
      }
      const indices = doc.accessors[primitive.indices];
      assert(indices && indices.type === 'SCALAR' && [5121, 5123, 5125].includes(indices.componentType));
      assert.equal(indices.count % 3, 0);
      assert(doc.materials[primitive.material], 'Material slot');
      rawTriangles += indices.count / 3;
    }
    (node.children || []).forEach(visit);
  }
  doc.scenes[doc.scene ?? 0].nodes.forEach(visit);
  assert.equal(visited.size, doc.nodes.length, 'No hidden unattached nodes');
  const metrics = { triangles: 0, vertices: 0, meshes: 0, materials: [], parts: [] };
  const materials = new Set(), missingUV = [];
  scene.traverse(mesh => {
    assert(mesh.matrixWorld.elements.every(Number.isFinite), 'Finite scene transforms');
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, position = geometry.getAttribute('position');
    for (const [name, size] of [['position', 3], ['normal', 3], ['uv', 2]]) {
      const attribute = geometry.getAttribute(name);
      if (name === 'uv' && !attribute) { missingUV.push(mesh.name); continue; }
      assert(attribute && attribute.count === position.count && attribute.itemSize === size, name);
      for (let i = 0; i < attribute.count; i++) for (let c = 0; c < size; c++)
        assert(Number.isFinite(attribute.getComponent(i, c)), `Finite ${name}`);
    }
    for (let i = 0; i < geometry.index.count; i++) {
      const index = geometry.index.getX(i);
      assert(Number.isInteger(index) && index >= 0 && index < position.count, 'Index range');
    }
    const triangles = geometry.index.count / 3;
    metrics.triangles += triangles;
    metrics.vertices += position.count;
    metrics.meshes++;
    const slots = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    slots.forEach(material => { assert(material.isMeshStandardMaterial); materials.add(material); });
    metrics.parts.push({ name: mesh.name, triangles, vertices: position.count, materials: slots.map(m => m.name), hasUV: !!geometry.getAttribute('uv') });
  });
  metrics.materials = [...materials].map(m => ({ name: m.name, color: m.color.getHexString(), roughness: m.roughness, metalness: m.metalness }));
  assert.deepEqual(metrics.materials.map(m => m.name).sort(), [...manifest.material_slots].sort(), 'Rendered material slots');
  assert.equal(metrics.triangles, rawTriangles, 'Loaded scene vs decoded scene triangles');
  assert.equal(rawTriangles, expectedTriangles);
  const bounds = new THREE.Box3().setFromObject(scene, true);
  metrics.bounds = { min: bounds.min.toArray(), max: bounds.max.toArray() };
  const dimensions = bounds.getSize(new THREE.Vector3()).toArray();
  close(metrics.bounds.min, manifest.bounds_gltf_m.min, 'Manifest minimum');
  close(metrics.bounds.max, manifest.bounds_gltf_m.max, 'Manifest maximum');
  close(dimensions, manifest.dimensions_m, 'Manifest dimensions');
  const rigParts = [];
  for (const part of [...rig.movable_nodes, ...rig.static_nodes, ...rig.anchors]) {
    const matches = doc.nodes.filter(n => n.name === part.name);
    assert.equal(matches.length, 1, `${part.name}: unique node`);
    // GLTFLoader sanitizes dots in names; use its source-node association, not display names.
    const node = await gltf.parser.getDependency('node', doc.nodes.indexOf(matches[0]));
    const parentIndex = doc.nodes.findIndex(n => n.name === part.parent);
    const expectedParent = part.parent === null ? scene : await gltf.parser.getDependency('node', parentIndex);
    assert.equal(node.parent, expectedParent, `${part.name}: parent`);
    if (part.pivot_position) close(node.position.toArray(), part.pivot_position, `${part.name}: local pivot`);
    if (part.pivot_model_position) close(node.getWorldPosition(new THREE.Vector3()).toArray(), part.pivot_model_position, `${part.name}: model pivot`);
    if (rig.movable_nodes.includes(part)) {
      close(node.quaternion.toArray(), [0, 0, 0, 1], `${part.name}: local axes`);
      close(node.scale.toArray(), [1, 1, 1], `${part.name}: scale`);
      assert.equal(matches[0].extras.bend_axis_gltf, 'X');
      for (const ranges of [part.rotation_deg, part.translation_m]) for (const axis of ['x', 'y', 'z']) {
        const range = ranges[axis];
        assert(range === 'free' || (Array.isArray(range) && range.length === 2 && range.every(Number.isFinite) && range[0] <= range[1]), 'Rig range');
      }
      rigParts.push({ name: part.name, parent: part.parent, localPivot: node.position.toArray(), modelPivot: node.getWorldPosition(new THREE.Vector3()).toArray(), localQuaternion: node.quaternion.toArray() });
    }
  }
  return {
    label: manifest.display_name, url: `models/${id}/model.glb`, bytes: bytes.length,
    sha256: sha(bytes), ...metrics, dimensions, materialSlots: doc.materials.map(m => m.name),
    provenance: 'EXTERNAL ORIGINAL by operator dot. Supplied manifest identifies externally Blender-authored original artwork; not locally procedural.',
    source: `external-art/${source}/model.glb`,
    qualification: 'No model.blend source was supplied despite manifest.files.source. Authorship/originality are operator declarations, not independently verified creation history. No re-export, subdivision or padding.',
    metadataSHA256: Object.fromEntries(['manifest.json', 'palette.json', 'rig.json'].map(name => [name, sha(files[name])])),
    rigAlias: 'manifest.rig.json was byte-identical to rig.json in the delivery; documentation alias only, canonical file is rig.json.',
    audit: { glbVersion: 2, selfContained: true, uriCount: 0, images: 0, textures: 0, finiteGeometry: true, normalCountsMatch: true, presentUVCountsMatch: true, missingUVMeshes: missingUV, indicesInRange: true, decodedSceneTriangles: rawTriangles, sceneNodes: visited.size, movableNodes: movableCount, staticNodes: rig.static_nodes.length, anchors: rig.anchors.length, rigParentPivotAxesMatch: true, toleranceMetres: 0.00001 },
    rigParts,
    quality: 'Node-only structural audit. Scene triangle count is not visible-pixel count, FPS, pose clearance, visual, gameplay or hardware acceptance.'
  };
}
const mode = process.argv[2] || '--check';
assert(['--check', '--ingest', '--self-test'].includes(mode) && process.argv.length <= 3, 'Use --check (default), --ingest, or --self-test');
if (mode === '--self-test') {
  assert.throws(() => decode(Buffer.alloc(28)));
  assert.throws(() => noURI({ nested: [{ uri: 'outside.bin' }] }));
}
// Audit every delivery before any ingest writes. --check needs no external-art tree.
const results = [];
for (const delivery of deliveries) {
  const [id, source] = delivery;
  const folder = new URL(mode === '--ingest' ? `../../../external-art/${source}/` : `./${id}/`, import.meta.url);
  const files = Object.fromEntries(['model.glb', 'manifest.json', 'palette.json', 'rig.json'].map(name => [name, readFileSync(new URL(name, folder))]));
  if (mode === '--ingest') assert(files['rig.json'].equals(readFileSync(new URL('manifest.rig.json', folder))), 'Rig alias differs');
  const receipt = await audit(files, delivery);
  if (mode !== '--ingest') assert.deepEqual(receipt, json(readFileSync(new URL('receipt.json', folder))), `${id}: receipt drift`);
  if (mode === '--self-test') {
    const damaged = Buffer.from(files['model.glb']);
    damaged.writeUInt32LE(1, 4);
    assert.throws(() => decode(damaged));
    damaged.writeUInt32LE(2, 4);
    damaged[damaged.length - 1] ^= 1;
    await assert.rejects(() => audit({ ...files, 'model.glb': damaged }, delivery), /delivered bytes changed/);
  }
  results.push({ id, files, receipt });
}
if (mode === '--ingest') for (const { id, files, receipt } of results) {
  diskGuard();
  const destination = new URL(`./${id}/`, import.meta.url);
  mkdirSync(destination, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) {
    diskGuard();
    writeFileSync(new URL(name, destination), bytes);
    assert(readFileSync(new URL(name, destination)).equals(bytes), `${id}/${name}: copy mismatch`);
  }
  diskGuard();
  writeFileSync(new URL('receipt.json', destination), JSON.stringify(receipt, null, 2) + '\n');
}
for (const { receipt: r } of results) console.log(JSON.stringify({ url: r.url, bytes: r.bytes, sha256: r.sha256, triangles: r.triangles, meshes: r.meshes, vertices: r.vertices, materials: r.materials.length, dimensions: r.dimensions, movableNodes: r.audit.movableNodes }));
console.log(`PASS ${mode}: ${results.length} unchanged external originals; no fallback generation`);
