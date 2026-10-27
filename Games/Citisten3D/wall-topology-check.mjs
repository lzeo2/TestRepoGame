// Node geometry/cache proof, not browser or image-decoding acceptance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { wallTopology, deriveWallTopology, WALL_DIRECTIONS } from './wall-topology.mjs';
import { createCityBuildingKit } from './city-render.mjs';
import { applyTool, syncModels } from './native-actions.mjs';
import { createSimulation } from './sim.mjs';

const close = (a, b) => assert(Math.abs(a - b) < 1e-5, `${a} != ${b}`);
const shapes = ['isolated', 'end', 'end', 'corner', 'end', 'straight', 'corner', 'T', 'end', 'corner', 'straight', 'T', 'corner', 'T', 'T', 'cross'];
for (const value of [-1, 16, .5, NaN]) assert.throws(() => wallTopology(value));
for (const value of [-1, 4, .5, null, NaN]) assert.throws(() => wallTopology(0, value));
for (let mask = 0; mask < 16; mask++) {
  const buildings = [{ id: 1, type: 'wall', x: 5, z: 5 }, ...WALL_DIRECTIONS.filter(d => mask & d.bit).map((d, i) => ({ id: i + 2, type: 'wall', x: 5 + d.x, z: 5 + d.z }))];
  assert.equal(deriveWallTopology(buildings).get(1).mask, mask);
  assert.deepEqual(deriveWallTopology(buildings), deriveWallTopology([...buildings].reverse()), 'order-independent topology');
  for (const rotation of [undefined, 0, 1, 2, 3]) {
    const topology = wallTopology(mask, rotation);
    assert.equal(topology.shape, shapes[mask]);
    if (rotation !== undefined) {
      assert.equal(topology.rotation, rotation, 'explicit intent retained');
      buildings[0].wallRotation = rotation;
      assert.deepEqual(deriveWallTopology(JSON.parse(JSON.stringify(buildings))).get(1), topology, 'renderer rederives explicit intent after JSON reload');
    }
  }
}
assert.equal(wallTopology(5).rotation, 1);
assert.equal(wallTopology(10).rotation, 0);

// Real supplied GLBs at every session LOD, real Three instance matrices and
// connector geometry. Only texture image decoding is stubbed; no network.
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
let geometryCases = 0;
for (let lod = 0; lod < 3; lod++) {
  const bytes = await readFile(new URL(`./models/wall_segment/model${lod ? `_LOD${lod}` : ''}.glb`, import.meta.url));
  const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const bounds = new THREE.Box3().setFromObject(model.scene);
  close(bounds.min.x, -5); close(bounds.max.x, 5); close(bounds.min.z, -.5); close(bounds.max.z, .5);
  close(bounds.min.y, 0); close(bounds.max.y, 4.2);
  const scene = new THREE.Scene(), baseHandles = new Set(), parts = [];
  model.scene.updateMatrixWorld(true);
  model.scene.traverse(node => { if (node.isMesh) parts.push({ geometry: node.geometry.clone().applyMatrix4(node.matrixWorld), material: node.material }); });
  let preparations = 0;
  const base = { types: ['wall'], pools: new Map(), ready: Promise.resolve(), lod,
    spawn(type, pose = { x: 0, y: 0, z: 0, rotation: 0, scale: 1 }) {
      assert.equal(type, 'wall');
      if (!this.pools.has(type)) { this.pools.set(type, { parts }); preparations++; }
      const h = { type, object: model.scene.clone(true) }; baseHandles.add(h); this.transform(h, pose); return h;
    },
    transform(h, pose) { h.object.position.set(pose.x, pose.y, pose.z); h.object.rotation.y = pose.rotation; h.object.scale.setScalar(pose.scale); h.object.updateMatrixWorld(true); },
    remove(h) { assert(baseHandles.delete(h)); }, update() {}, dispose() { baseHandles.clear(); for (const part of parts) part.geometry.dispose(); },
  };
  const kit = createCityBuildingKit(scene, base, 100);
  const pending = kit.spawn('wall_join_1');
  assert.equal(kit.pools.get(pending.type).parts, null, 'spawn can precede source readiness');
  await kit.ready; assert(kit.pools.get(pending.type).parts); kit.remove(pending);
  assert.equal(preparations, 1); assert.equal(baseHandles.size, 0, 'temporary preparation handle removed');
  let geometryDisposals = 0, batchDisposals = 0;
  for (let mask = 0; mask < 16; mask++) for (const rotation of [undefined, 0, 1, 2, 3]) {
    const topology = wallTopology(mask, rotation), h = kit.spawn(topology.type, { rotation: topology.rotation * Math.PI / 2 });
    const p = kit.pools.get(h.type), actual = new THREE.Box3();
    const objects = h.base ? [h.base.object] : p.parts.map(part => {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.applyMatrix4(h.matrix); mesh.updateMatrixWorld(true); return mesh;
    });
    for (const object of objects) actual.union(new THREE.Box3().setFromObject(object));
    if (mask) {
      assert.equal(h.base, null, 'connected wall must not retain a full supplied segment');
      assert.equal(p.parts.length, parts.length);
      const copies = 1 + WALL_DIRECTIONS.filter(d => mask & d.bit).length;
      p.parts.forEach((part, i) => {
        assert.equal(part.material, parts[i].material, 'actual supplied material/texture reused');
        assert.equal(part.geometry.attributes.position.count, parts[i].geometry.attributes.position.count * copies);
        for (const name of Object.keys(parts[i].geometry.attributes)) assert(part.geometry.attributes[name], `preserved ${name}`);
        const original = parts[i].geometry.attributes.position;
        const localMask = Number(h.type.slice('wall_join_'.length));
        const directions = [-1, ...[0, 1, 2, 3].filter(d => localMask & (1 << d))];
        const pos = part.geometry.attributes.position, v = new THREE.Vector3();
        for (let copy = 0; copy < directions.length; copy++) for (let j = 0; j < original.count; j++) {
          v.fromBufferAttribute(original, j);
          if (copy === 0) v.x *= .1;
          else { v.x = v.x * .45 + 2.75; v.applyAxisAngle(new THREE.Vector3(0, 1, 0), (1 - directions[copy]) * Math.PI / 2); }
          const k = copy * original.count + j;
          close(pos.getX(k), v.x); close(pos.getY(k), v.y); close(pos.getZ(k), v.z);
          const uv = parts[i].geometry.attributes.uv;
          if (uv) { close(part.geometry.attributes.uv.getX(k), uv.getX(j)); close(part.geometry.attributes.uv.getY(k), uv.getY(j)); }
        }
        for (let j = 0; j < pos.count; j++) {
          v.fromBufferAttribute(pos, j).applyMatrix4(h.matrix);
          for (const d of WALL_DIRECTIONS.filter(d => !(mask & d.bit))) {
            assert(v.x * d.x + v.z * d.z <= .5 + 1e-5, `unused arm geometry LOD${lod} mask${mask} rotation${rotation}`);
          }
        }
      });
    }
    assert(actual.min.x >= -5 - 1e-5 && actual.max.x <= 5 + 1e-5);
    assert(actual.min.z >= -5 - 1e-5 && actual.max.z <= 5 + 1e-5);
    for (const d of WALL_DIRECTIONS.filter(d => mask & d.bit)) {
      // Endpoints and the arm/post seam are actual triangle ray hits,
      // not merely declared bounds. Adjacent 10m lots share these endpoints.
      for (const distance of [.44, .46, .4999, .5001, .51, 2.5, 4.999]) {
        const ray = new THREE.Raycaster(new THREE.Vector3(d.x * distance, 8, d.z * distance), new THREE.Vector3(0, -1, 0));
        const hits = ray.intersectObjects(objects, true);
        assert(hits.some(hit => hit.point.y >= 3.79), `LOD${lod} mask${mask} rotation${rotation} gap at ${d.bit}/${distance}`);
      }
      const edge = d.x ? (d.x > 0 ? actual.max.x : actual.min.x) : (d.z > 0 ? actual.max.z : actual.min.z);
      close(edge, (d.x || d.z) * 5);
      const opposite = WALL_DIRECTIONS.find(q => q.x === -d.x && q.z === -d.z);
      const neighborTopology = wallTopology(opposite.bit, rotation);
      const neighbor = kit.spawn(neighborTopology.type, { x: d.x * 10, z: d.z * 10, rotation: neighborTopology.rotation * Math.PI / 2 });
      const neighborBounds = new THREE.Box3();
      for (const part of kit.pools.get(neighbor.type).parts) neighborBounds.union(part.geometry.boundingBox.clone().applyMatrix4(neighbor.matrix));
      const overlap = actual.clone().intersect(neighborBounds).getSize(new THREE.Vector3());
      assert(overlap.x * overlap.y * overlap.z < 1e-5, 'neighbor lots have no positive-volume overlap');
      const neighborEdge = d.x ? (d.x > 0 ? neighborBounds.min.x : neighborBounds.max.x) : (d.z > 0 ? neighborBounds.min.z : neighborBounds.max.z);
      close(neighborEdge, edge);
      kit.remove(neighbor);
    }
    const version = kit.version; kit.transform(h, h.pose); assert.equal(kit.version, version, 'unchanged pose does not upload');
    for (const d of WALL_DIRECTIONS.filter(d => mask && !(mask & d.bit))) for (const distance of [.51, 2.5, 4.999]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(d.x * distance, 8, d.z * distance), new THREE.Vector3(0, -1, 0));
      assert.equal(ray.intersectObjects(objects, true).length, 0, 'unused arms have no triangles');
    }
    kit.remove(h); geometryCases++;
  }
  assert.equal(baseHandles.size, 0);
  const many = Array.from({ length: 100 }, (_, x) => kit.spawn('wall_join_15', { x: x * 10 }));
  const crowded = kit.pools.get('wall_join_15');
  assert.equal(crowded.allocation, 100); assert.throws(() => kit.spawn('wall_join_15'), /full/);
  kit.remove(many[1]); assert.equal(many[99].index, 1);
  const compacted = new THREE.Matrix4();
  for (const batch of crowded.batches) { batch.getMatrixAt(1, compacted); close(compacted.elements[12], 990); assert.equal(batch.count, 99); }
  for (const h of many) kit.remove(h);
  for (const p of kit.pools.values()) {
    for (const part of p.parts || []) part.geometry.addEventListener('dispose', () => geometryDisposals++);
    for (const batch of p.batches) batch.addEventListener('dispose', () => batchDisposals++);
  }
  assert.equal(kit.pools.size, 16, 'one pool per local topology, not per wall');
  const triangles = g => (g.index?.count ?? g.attributes.position.count) / 3;
  const sourceTriangles = parts.reduce((sum, p) => sum + triangles(p.geometry), 0);
  console.log(`WALL LOD${lod}: source=${sourceTriangles} triangles; end=${sourceTriangles * 2}, corner/straight=${sourceTriangles * 3}, T=${sourceTriangles * 4}, cross=${sourceTriangles * 5}; source parts=${parts.length}; variant batches=${15 * parts.length}; pool cap=100 tested`);
  kit.dispose(); kit.dispose(); assert.equal(scene.children.length, 0);
  assert.equal(geometryDisposals, 15 * parts.length); assert.equal(batchDisposals, 15 * parts.length);
  model.scene.traverse(node => { if (node.isMesh) { node.geometry.dispose(); node.material.dispose(); } });
}

// Shared native sync with normal simulation placement/removal/snapshot reload.
const sim = createSimulation({ size: 20 });
let spawned = 0, removed = 0, transformed = 0;
const world = { roads: sim.roads, buildings: {
  spawn(type, pose) { spawned++; return { type, pose }; },
  transform(h, pose) { transformed++; h.pose = pose; }, remove() { removed++; },
} };
const cache = new Map(), a = sim.place('wall', 2, 2).building;
assert(a); syncModels(world, sim.state, cache);
const first = cache.get(`building:${a.id}`);
const b = sim.place('wall', 2, 3).building; assert(b);
syncModels(world, sim.state, cache);
assert.notEqual(cache.get(`building:${a.id}`), first, 'isolated full segment replaced by end-only art');
close(cache.get(`building:${a.id}`).pose.rotation, Math.PI / 2); assert.equal(removed, 1);
close(cache.get(`building:${b.id}`).pose.rotation, Math.PI / 2);
const c = sim.place('wall', 3, 2).building; assert(c); syncModels(world, sim.state, cache);
assert.match(cache.get(`building:${a.id}`).type, /^wall_join_/);
const stable = new Map(cache), counts = [spawned, removed, transformed];
for (let i = 0; i < 20; i++) syncModels(world, sim.state, cache);
assert.deepEqual(cache, stable); assert.deepEqual([spawned, removed, transformed], counts);
const restored = createSimulation({ snapshot: sim.snapshot() }), fresh = new Map();
syncModels(world, restored.state, fresh);
for (const [key, h] of cache) assert.deepEqual(fresh.get(key), h, 'reload rederives topology without saved joins');
assert(sim.bulldoze(c.x, c.z).ok); syncModels(world, sim.state, cache);
assert.match(cache.get(`building:${a.id}`).type, /^wall_join_/); close(cache.get(`building:${a.id}`).pose.rotation, Math.PI / 2);
assert(sim.bulldoze(b.x, b.z).ok); syncModels(world, sim.state, cache);
close(cache.get(`building:${a.id}`).pose.rotation, 0);
a.wallRotation = 3; syncModels(world, sim.state, cache); close(cache.get(`building:${a.id}`).pose.rotation, 3 * Math.PI / 2);
a.heading = 1; syncModels(world, sim.state, cache); close(cache.get(`building:${a.id}`).pose.rotation, 3 * Math.PI / 2);
const site = { id: 999, type: 'wall', x: 3, z: 2, constructionRemaining: 3, constructionTotal: 3 };
sim.state.buildings.push(site); syncModels(world, sim.state, cache);
assert.equal(cache.get('building:999').type, 'construction_site_0');
assert.equal(deriveWallTopology(sim.state.buildings).get(a.id).mask, 0);
site.constructionRemaining = 0; syncModels(world, sim.state, cache);
assert.equal(deriveWallTopology(sim.state.buildings).get(a.id).mask, 2);
assert.match(cache.get(`building:${a.id}`).type, /^wall_join_/);
assert.equal(deriveWallTopology(sim.state.buildings).get(site.id).mask, 8);
const completed = cache.get(`building:${a.id}`);
site.constructionRemaining = 1; syncModels(world, sim.state, cache);
assert.equal(cache.get(`building:${a.id}`).type, 'wall', 'returning to a site invalidates the neighboring finished join');
assert.notEqual(cache.get(`building:${a.id}`), completed);
assert.equal(cache.get('building:999').type, 'construction_site_2');
let rotated = null;
const result = applyTool({ state: { phase: 'day' }, roads: { valid: () => true }, rotateWall(x, z) { rotated = [x, z]; return { ok: true }; } }, 'rotate-wall', { x: 2, z: 3 });
assert(result.ok); assert.deepEqual(rotated, [2, 3]);
console.log(`WALL CHECK PASS: 16 masks x auto/4 explicit rotations x 3 real GLB LODs = ${geometryCases} geometry cases; endpoints/seams/lot bounds/unused-arm absence; supplied art/materials; shared pools/capacity/compaction/disposal; native placement/removal/reload/completion/cache; rotate-wall dispatch`);
