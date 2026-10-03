// Geometry/ownership check with stub canvas. Real lettering/appearance needs browser captures.
import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import { decorateCar } from '../assets/car-arcade/showcase/realism.js';

globalThis.document = {createElement() {
  const text = [];
  return {width:0, height:0, text, getContext:() => ({
    fillRect(){}, strokeRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, arc(){}, fill(){},
    fillText(value){text.push(value);}
  })};
}};

for (const [id, label] of [['pip','PIP 08'], ['brindle','BRD 16']]) {
  const { createCar } = await import(`../assets/car-arcade/showcase/${id}.js`);
  const previous = new Set();
  for (let cycle = 0; cycle < 2; cycle++) {
    const car = createCar(), geometries = new Set(), materials = new Set();
    let triangles = 0, meshes = 0;
    car.traverse(node => {
      if (!node.isMesh) return;
      meshes++; geometries.add(node.geometry); materials.add(node.material);
      triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
      for (const attribute of Object.values(node.geometry.attributes)) assert(Array.from(attribute.array).every(Number.isFinite));
      assert.equal(node.geometry.attributes.uv.count, node.geometry.attributes.position.count);
    });
    assert(triangles <= 30000 && meshes <= 75);
    assert.equal(car.userData.wheels.length, 4);
    const bounds = new THREE.Box3().setFromObject(car);
    assert(Math.abs(bounds.min.y) < .015 && bounds.containsPoint(new THREE.Vector3(...car.userData.cockpit.eye)));
    for (const wheel of car.userData.wheels) assert(Math.abs(new THREE.Box3().setFromObject(wheel).min.y) < .015);
    assert([...materials].every(mat => !Object.values(mat).some(value => value?.isTexture)));
    decorateCar(car);
    const plate = [...materials].find(mat => mat.name === 'registration-plate');
    assert.equal(plate.userData.label, label);
    assert.equal(plate.map.image.width, 256); assert.equal(plate.map.image.height, 64);
    assert(plate.map.image.text.includes(label)); assert.equal(plate.map.colorSpace, THREE.SRGBColorSpace);
    const radio=[...materials].find(mat=>mat.name==='console-radio');
    assert(radio.map.image.text.some(text=>text.startsWith('AM')));
    assert.equal(radio.map.image.width,256);assert.equal(radio.map.image.height,64);
    assert.equal(radio.map.colorSpace,THREE.SRGBColorSpace);
    const textures = new Set([...materials].flatMap(mat => Object.values(mat).filter(value => value?.isTexture)));
    const bytes = [...textures].reduce((sum, texture) => sum + texture.image.width * texture.image.height * 4, 0);
    assert(bytes <= 1048576);
    for (const resource of [...geometries, ...materials, ...textures]) {
      assert(!previous.has(resource)); previous.add(resource);
      let disposed = 0; resource.addEventListener('dispose', () => disposed++); resource.dispose(); assert.equal(disposed, 1);
    }
    console.log(`PASS ${id} cycle${cycle + 1}: ${triangles} triangles / ${meshes} meshes / ${textures.size} textures / ${bytes} base RGBA bytes`);
  }
}
