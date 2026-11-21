import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

function flameGeometry() {
  const positions = [], colors = [], indices = [];
  const rings = [[0, .48, 0xedffff], [.2, 1, 0x78eaff], [.52, .67, 0x259bff], [.82, .35, 0xffa340], [1, .01, 0xff6935]];
  const sides = 7, color = new THREE.Color();
  for (const [z, radius, shade] of rings) {
    color.setHex(shade);
    for (let side = 0; side < sides; side++) {
      const angle = side * Math.PI * 2 / sides;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
      colors.push(color.r, color.g, color.b);
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let side = 0; side < sides; side++) {
      const a = ring * sides + side, b = ring * sides + (side + 1) % sides;
      indices.push(a, b, a + sides, b, b + sides, a + sides);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function createNitroView(scene) {
  const geometry = flameGeometry();
  const material = new THREE.MeshBasicMaterial({vertexColors: true, toneMapped: false, side: THREE.DoubleSide});
  const exhaust = new THREE.InstancedMesh(geometry, material, 2);
  exhaust.name = 'Player nitro exhaust';
  exhaust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  exhaust.frustumCulled = false;
  exhaust.visible = false;
  scene.add(exhaust);
  const plume = new THREE.Object3D();
  let clock = 0, disposed = false;

  function update(car, dimensions, active, dt = 0) {
    if (disposed) return;
    exhaust.visible = !!(active && car && dimensions);
    if (!exhaust.visible) return;
    clock += dt;
    exhaust.position.copy(car.position);
    exhaust.quaternion.copy(car.quaternion);
    for (let i = 0; i < 2; i++) {
      const pulse = Math.sin(clock * 43 + i * 2.1) * .2 + Math.sin(clock * 71) * .08;
      plume.position.set(dimensions.width * (i ? .3 : -.3), .27, dimensions.length * .5 - .08);
      plume.scale.set(.23 + pulse * .12, .2 + pulse * .08, 1.7 + pulse);
      plume.updateMatrix();
      exhaust.setMatrixAt(i, plume.matrix);
    }
    exhaust.instanceMatrix.needsUpdate = true;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    exhaust.removeFromParent();
    exhaust.dispose();
    geometry.dispose();
    material.dispose();
  }
  return {update, dispose};
}
