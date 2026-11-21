import assert from 'node:assert/strict';
import { ROAD_TEXTURE_SIZE, SURFACE_TEXTURE_SIZE, ATLAS_INSET, ATLAS_SPAN, createRoadPixels, createSurfacePixels } from '../Games/Capital Drive/exterior-materials.js';
const road = createRoadPixels(), atlas = createSurfacePixels();
assert.equal(ROAD_TEXTURE_SIZE, 64); assert.equal(SURFACE_TEXTURE_SIZE, 512);
assert.equal(road.byteLength + atlas.byteLength, (64 ** 2 + 512 ** 2) * 4, 'existing texture storage budget retained');
assert.deepEqual(createRoadPixels(), road); assert.deepEqual(createSurfacePixels(), atlas);
assert.equal(ATLAS_INSET * 512, 8); assert.equal(ATLAS_SPAN * 512, 240);
for (const pixels of [road, atlas]) for (let i = 3; i < pixels.length; i += 4) assert.equal(pixels[i], 255);
const at = (x, y) => Array.from(atlas.slice((y * 512 + x) * 4, (y * 512 + x) * 4 + 4));
for (const tx of [0, 256]) for (const ty of [0, 256]) for (let i = 0; i < 256; i++) {
  for (let g = 0; g < 8; g++) {
    assert.deepEqual(at(tx + g, ty + i), at(tx + g + 240, ty + i), 'left gutter wraps same material');
    assert.deepEqual(at(tx + 248 + g, ty + i), at(tx + 8 + g, ty + i), 'right gutter wraps same material');
    assert.deepEqual(at(tx + i, ty + g), at(tx + i, ty + g + 240), 'upper gutter wraps same material');
    assert.deepEqual(at(tx + i, ty + 248 + g), at(tx + i, ty + 8 + g), 'lower gutter wraps same material');
  }
}
const tones = new Set(); for (let i = 0; i < road.length; i += 4) tones.add(road[i]);
assert(tones.size > 20, 'baked asphalt retains fine aggregate variation');
assert(at(8, 264)[0] < at(30, 270)[0], 'brick mortar is darker than its face');
assert(at(8, 8)[0] < at(20, 15)[0], 'roof lap is darker than its tile face');
console.log('Capital exterior materials PASS: deterministic 64/512 baked textures, opaque pixels, wrapped 8px atlas gutters, aggregate/mortar/roof detail and unchanged texture byte budget');

const THREE = await import('../assets/car-arcade/vendor/three.module.js');
const { createWorldView } = await import('../Games/Capital Drive/world-view.js');
let canvases = 0;
globalThis.document = { createElement: () => {
  canvases++;
  return { getContext: () => ({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, fillRect() {}, strokeRect() {}, fillText() {} }) };
} };
const scene = new THREE.Scene();
const map = {
  bounds: { minX: -100, minZ: -100, maxX: 100, maxZ: 100 },
  roads: [{ id: 'road', type: 'residential', width: 8, points: [[-80, 0], [80, 0]] }],
  buildings: [{ id: 'house', type: 'house', points: [[-8, 20], [8, 20], [8, 32], [-8, 32]], height: 5 }],
  areas: [], landmarks: [], spawn: { x: 0, z: 0 }
};
const view = createWorldView(scene, map, { lowGraphics: true });
let roadMaterial, pavementMaterial, pavementUVBytes = 0, atlasMaterial;
scene.traverse(mesh => {
  if (mesh.name === 'Canberra road') roadMaterial = mesh.material;
  if (mesh.name === 'Canberra pavement') {
    pavementMaterial = mesh.material;
    pavementUVBytes += mesh.geometry.attributes.uv.array.byteLength;
    const { position, uv } = mesh.geometry.attributes;
    for (let i = 0; i < position.count; i++) {
      assert.equal(uv.getX(i), position.getX(i) / 2);
      assert.equal(uv.getY(i), position.getZ(i) / 2);
    }
  }
  if (mesh.name === 'Canberra surface') atlasMaterial = mesh.material;
});
assert(roadMaterial && pavementMaterial && pavementUVBytes > 0);
assert.equal(roadMaterial, pavementMaterial, 'concrete reuses the existing road material and texture');
assert(roadMaterial.isMeshLambertMaterial, 'matte streets retain inexpensive diffuse lighting');
assert.equal(roadMaterial.roughnessMap, undefined, 'matte streets have no second roughness lookup');
const shader = { vertexShader: '#include <begin_vertex>', fragmentShader: '#include <map_fragment>' };
atlasMaterial.onBeforeCompile(shader);
assert(shader.fragmentShader.includes('0.46875') && shader.fragmentShader.includes('0.015625'));
assert.equal(canvases, 2, 'fixture allocates only the existing road and facade atlas canvases');
view.dispose();
console.log(`Capital exterior adapter PASS: shared road/concrete material, 2m world UVs, diffuse-only shading, dielectric glazing, inset atlas; fixture concrete UV storage ${pavementUVBytes} bytes`);

const detailedScene = new THREE.Scene(), detailedView = createWorldView(detailedScene, map);
let panes = 0;
detailedScene.traverse(mesh => {
  if (mesh.name !== 'Canberra glass') return;
  panes++;
  assert.equal(mesh.material.metalness, 0, 'glass remains dielectric');
  assert.equal(mesh.material.roughness, .16);
  assert.equal(mesh.material.transparent, false, 'glazing adds no sorted transparency pass');
});
assert(panes > 0, 'Standard fixture actually exercises facade glazing');
detailedView.dispose();
console.log('Capital glazing PASS: actual Standard facade panes use shared opaque dielectric glass');
