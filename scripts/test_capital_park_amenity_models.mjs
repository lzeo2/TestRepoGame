import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { createParkAmenityModels, PARK_AMENITY_BODIES, parkAmenityVariant } from '../Games/Capital Drive/park-amenity-models.js';

const masonryMap = new THREE.Texture(), masonryNormalMap = new THREE.Texture();
const models = createParkAmenityModels({masonryMap,masonryNormalMap});
const allMaterials = new Set(), allGeometry = new Set(), counts = {};
let geometryBytes = 0;
for (const [variant, batches] of Object.entries(models.templates)) {
  const body = PARK_AMENITY_BODIES[variant], bounds = new THREE.Box3();
  assert(body && batches.length <= 3, variant + ' has a collision envelope and bounded material count');
  counts[variant] = 0;
  for (const {geometry,material} of batches) {
    assert(material.isMeshStandardMaterial && material.vertexColors && geometry.index);
    assert.deepEqual(Object.keys(geometry.attributes).sort(), ['color','normal','position','uv']);
    allMaterials.add(material); allGeometry.add(geometry);
    for(const attribute of Object.values(geometry.attributes)) {
      geometryBytes += attribute.array.byteLength;
      assert(attribute.array.every(Number.isFinite));
    }
    geometryBytes += geometry.index.array.byteLength;
    counts[variant] += geometry.index.count / 3;
    geometry.computeBoundingBox(); bounds.union(geometry.boundingBox);
    const p = geometry.attributes.position;
    for(let i=0; i<p.count; i++) if (p.getY(i) > .10) {
      assert(Math.abs(p.getX(i)) <= body.width/2 + .003, variant + ' fits the body width above the pad');
      assert(Math.abs(p.getZ(i)) <= body.depth/2 + .003, variant + ' fits the body depth above the pad');
    }
  }
  assert(Math.abs(bounds.min.y) < .001, 'pad touches local ground');
  assert(Math.abs(bounds.max.y - body.height) < .02, 'source-sized unit');
  assert(counts[variant] < 2700);
}
const masonry = [...allMaterials].find(m => m.map === masonryMap);
assert(masonry && masonry.normalMap === masonryNormalMap);
assert.equal(parkAmenityVariant({kind:'bbq',plates:2,bench:'concrete'}), 'bbqDoubleConcrete');
assert.equal(parkAmenityVariant({kind:'bbq',plates:2,bench:'steel'}), 'bbqDouble');
assert.equal(parkAmenityVariant({kind:'bbq'}), 'bbqSingle');
assert.equal(parkAmenityVariant({kind:'fountain',refill:true,dogBowl:true}), 'refillDog');
assert.equal(parkAmenityVariant({kind:'fountain',refill:false,dogBowl:true}), 'fountainDog');
assert.equal(parkAmenityVariant({kind:'fountain'}), 'fountain');
assert(counts.fountainDog > counts.fountain && counts.refillDog > counts.refill && counts.bbqDouble > counts.bbqSingle);
assert.equal(allMaterials.size,3);
assert(geometryBytes < 800_000);
assert.throws(()=>parkAmenityVariant({kind:'park'}));
const resources = [...allGeometry,...allMaterials,[...allMaterials].find(m => m.roughnessMap).roughnessMap];
let releases = 0, borrowed = 0;
for(const item of resources) item.addEventListener('dispose',()=>releases++);
for(const item of [masonryMap,masonryNormalMap]) item.addEventListener('dispose',()=>borrowed++);
models.dispose();models.dispose();
assert.equal(releases,resources.length);assert.equal(borrowed,0);
console.log('PASS park templates:',counts,geometryBytes,'geometry bytes, 3 shared PBR materials, bounded colliders and disposal');
