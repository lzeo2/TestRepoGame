import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { loadCapitalMap } from './capital-map-fixture.mjs';
import { createTerrainSampler } from '../Games/Capital Drive/terrain.js';

const url = new URL('../Games/Capital Drive/world-view.js', import.meta.url);
const source = await readFile(url, 'utf8');
const scratch = `    for (let i = 0; i < 3; i++) {
      roundedA[i] = Math.fround(a[i]); roundedB[i] = Math.fround(b[i]); roundedC[i] = Math.fround(c[i]);
    }
    a = roundedA; b = roundedB; c = roundedC;`;
const reference = source.replace(scratch, '    a = a.map(Math.fround); b = b.map(Math.fround); c = c.map(Math.fround);');
assert.notEqual(reference, source, 'allocation reference replaces only Float32 vertex scratch emission');
const load = text => import(`data:text/javascript;base64,${Buffer.from(text.replace(/from '([^']+)'/g, (_, path) => `from '${new URL(path, url).href}'`)).toString('base64')}`);
const [{ createWorldView: before }, { createWorldView: after }] = await Promise.all([load(reference), load(source)]);
const map = await loadCapitalMap(), terrainSampler = createTerrainSampler(map);
function measure(create) {
  global.gc?.();
  const heapBefore = process.memoryUsage().heapUsed, start = performance.now(), scene = new THREE.Scene();
  const view = create(scene, map, { streaming: true, openingChunks: 3, terrainSampler });
  const milliseconds = performance.now() - start, heapDeltaBytes = process.memoryUsage().heapUsed - heapBefore;
  const hash = createHash('sha256'); let triangles = 0, meshes = 0, bytes = 0;
  scene.traverse(object => {
    if (!object.isMesh) return;
    meshes++; triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3;
    hash.update(object.name);
    const attributes = { ...object.geometry.attributes, ...(object.geometry.index ? { index: object.geometry.index } : {}), ...(object.instanceMatrix ? { instanceMatrix: object.instanceMatrix } : {}), ...(object.instanceColor ? { instanceColor: object.instanceColor } : {}) };
    for (const [name, attribute] of Object.entries(attributes)) {
      hash.update(`${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.count}`);
      const data = Buffer.from(attribute.array.buffer, attribute.array.byteOffset, attribute.array.byteLength);
      hash.update(data); bytes += data.byteLength;
    }
  });
  const geometry = { sha256: hash.digest('hex'), meshes, triangles, bytes, emittedTriangles: view.stats.triangles };
  view.dispose();
  return { geometry, milliseconds: Number(milliseconds.toFixed(1)), heapDeltaBytes };
}
const allocating = measure(before), reused = measure(after);
assert.deepEqual(reused.geometry, allocating.geometry, 'all actual opening-chunk geometry, attributes, indices and triangle ordering remain byte-identical');
console.log('PASS actual composed-map Float32 triangle scratch equivalence '+JSON.stringify({ allocating, reused, timingScope: 'Three opening chunks plus full source preparation; single sequential runs, timing/heap are diagnostic and sensitive to GC/concurrent load.' }));
