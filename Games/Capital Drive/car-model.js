import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { createCar as createBaseCar, disposeCars as disposeBaseCars } from '../../assets/car-arcade/models.js';

const bodywork = new Map(), trimmed = new Map();
// Capital-only close-range bodywork. The shared fleet and its collider/cockpit ABI
// remain authoritative; these pieces stay within its measured exterior bounds.
export function createCarBodywork(car) {
  const id = car.userData.carId;
  if (!bodywork.has(id)) {
    const { width, length } = car.userData.dimensions;
    const w = width / 2, l = length;
    const parts = [];
    function box(color, x, y, z, sx, sy, sz) {
      const g = new THREE.BoxGeometry(sx, sy, sz);
      g.translate(x, y, z); g.deleteAttribute('uv'); g.clearGroups();
      const c = new THREE.Color(color), rgb = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < rgb.length; i += 3) c.toArray(rgb, i);
      g.setAttribute('color', new THREE.BufferAttribute(rgb, 3)); parts.push(g);
    }
    // Recessed lower intake with upright separators and a narrow bumper lip.
    box('#191e23', 0, .34, -l / 2 + .035, w * 1.15, .105, .028);
    for (const side of [-1, 1]) {
      box('#626c73', side * w * .30, .34, -l / 2 + .017, .023, .096, .018);
      box('#30383e', side * w * .69, .315, -l / 2 + .04, w * .22, .065, .045);
      // Long rocker creases break the flat slab below the doors. Lower edges
      // and mudguards gain thickness without extending the contact envelope.
      box('#333b40', side * w * .925, .285, 0, .025, .035, l * .43);
      box('#82898b', side * w * .93, .312, 0, .018, .012, l * .40);
      box('#c58a47', side * w * .94, .48, -l * .29, .012, .035, .075);
      // Rear reversing lenses and a recessed tailgate/boot handle.
      box('#cbd3cf', side * w * .56, .515, l / 2 - .013, .07, .035, .012);
    }
    box('#30383e', 0, .64, l / 2 - .014, .20, .028, .016);
    const geometry = mergeGeometries(parts, false);
    // Some source models have asymmetric bumpers. Clip only the added trim to
    // the actual source bounds, rather than assuming a centred nominal length.
    const bounds = new THREE.Box3().setFromObject(car), positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setXYZ(i,
        THREE.MathUtils.clamp(positions.getX(i), bounds.min.x + .002, bounds.max.x - .002),
        THREE.MathUtils.clamp(positions.getY(i), bounds.min.y + .002, bounds.max.y - .002),
        THREE.MathUtils.clamp(positions.getZ(i), bounds.min.z + .002, bounds.max.z - .002));
    }
    geometry.computeVertexNormals();
    parts.forEach(g => g.dispose()); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    bodywork.set(id, geometry);
  }
  const mesh = new THREE.Mesh(bodywork.get(id), car.getObjectByName('trim-interior').material);
  mesh.name = 'near-bodywork'; return mesh;
}

export function createCar(id, options = {}) {
  const car = createBaseCar(id, options), detail = createCarBodywork(car);
  const trim = car.getObjectByName('trim-interior');
  if (!trimmed.has(id)) trimmed.set(id, mergeGeometries([trim.geometry, detail.geometry], false));
  trim.geometry = trimmed.get(id);
  car.userData = Object.freeze({ ...car.userData,
    triangles: car.userData.triangles + detail.geometry.index.count / 3 });
  return car;
}

export function disposeCars() {
  for (const geometry of bodywork.values()) geometry.dispose();
  for (const geometry of trimmed.values()) geometry.dispose();
  bodywork.clear(); trimmed.clear(); disposeBaseCars();
}
