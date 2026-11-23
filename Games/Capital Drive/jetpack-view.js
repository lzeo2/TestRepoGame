import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Original paired-tank pack. One baked shell and one two-instance exhaust batch;
// geometry/materials are fixed at construction, with no particles or own clock.
export function createJetpackView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Personal flight pack'; root.visible = false;
  const harness = new THREE.Group(); root.add(harness);
  const box = new THREE.BoxGeometry(1, 1, 1), tank = new THREE.CylinderGeometry(1, 1, 1, 8);
  const nozzle = new THREE.CylinderGeometry(1, .72, 1, 8);
  const positions = [], normals = [], colors = [], tint = new THREE.Color();
  function part(source, x, y, z, sx, sy, sz, color) {
    const geometry = source.index ? source.toNonIndexed() : source;
    const p = geometry.attributes.position, n = geometry.attributes.normal;
    tint.setHex(color);
    for (let i = 0; i < p.count; i++) {
      positions.push(p.getX(i) * sx + x, p.getY(i) * sy + y, p.getZ(i) * sz + z);
      // Inverse-transpose for the nonuniform primitive scale.
      const nx = n.getX(i) / sx, ny = n.getY(i) / sy, nz = n.getZ(i) / sz, length = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / length, ny / length, nz / length); colors.push(tint.r, tint.g, tint.b);
    }
    if (geometry !== source) geometry.dispose();
  }
  part(box, 0, 1.12, .22, .24, .62, .16, 0x303840);
  part(box, 0, 1.15, .36, .13, .35, .07, 0x8a969c);
  part(box, 0, 1.25, .402, .08, .045, .015, 0xe2b55d);
  for (const side of [-1, 1]) {
    const x = side * .18;
    part(tank, x, 1.15, .29, .115, .54, .115, 0xa7afb0);
    for (const y of [.95, 1.34]) part(tank, x, y, .29, .122, .055, .122, 0x46515a);
    part(tank, x, 1.44, .29, .055, .055, .055, 0x313c45);
    part(nozzle, x, .78, .29, .12, .14, .12, 0x505b65);
    part(tank, x, .704, .29, .075, .016, .075, 0x1d2831);
    part(box, side * .135, 1.19, .135, .045, .58, .04, 0x373c3d);
  }
  box.dispose(); tank.dispose(); nozzle.dispose();
  const shellGeometry = new THREE.BufferGeometry();
  shellGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shellGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  shellGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  shellGeometry.computeBoundingSphere();
  const shell = new THREE.MeshLambertMaterial({ vertexColors: true });
  harness.add(new THREE.Mesh(shellGeometry, shell));

  const exhaustGeometry = new THREE.ConeGeometry(.075, 1, 6);
  exhaustGeometry.rotateZ(Math.PI); exhaustGeometry.translate(0, -.5, 0);
  const flameColors = new Float32Array(exhaustGeometry.attributes.position.count * 3);
  for (let i = 0; i < exhaustGeometry.attributes.position.count; i++) {
    tint.setHex(exhaustGeometry.attributes.position.getY(i) < -.9 ? 0xe0a45f : 0xb4d9ee);
    flameColors[i * 3] = tint.r; flameColors[i * 3 + 1] = tint.g; flameColors[i * 3 + 2] = tint.b;
  }
  exhaustGeometry.setAttribute('color', new THREE.BufferAttribute(flameColors, 3));
  const flame = new THREE.MeshBasicMaterial({ vertexColors: true });
  const jets = new THREE.InstancedMesh(exhaustGeometry, flame, 2);
  jets.instanceMatrix.setUsage(THREE.DynamicDrawUsage); jets.frustumCulled = false; jets.visible = false;
  harness.add(jets);
  const transform = new THREE.Matrix4();
  let disposed = false, lastLength = -1;
  scene.add(root);
  return {
    update(actor, flight) {
      if (disposed) return;
      const valid = actor && Number.isFinite(actor.x) && Number.isFinite(actor.z);
      const floor = valid ? heightAt(actor.x, actor.z) : NaN;
      root.visible = Boolean(flight?.active && Number.isFinite(floor));
      if (!root.visible) { jets.visible = false; return; }
      const altitude = Number.isFinite(actor.jumpHeight) ? Math.max(0, actor.jumpHeight) : 0;
      root.position.set(actor.x, Number.isFinite(flight.feetY)?flight.feetY:floor + altitude, actor.z); root.rotation.y = Number.isFinite(actor.yaw) ? actor.yaw : 0;
      const leanX = Number.isFinite(flight.leanX) ? flight.leanX : 0, leanZ = Number.isFinite(flight.leanZ) ? flight.leanZ : 0;
      const yaw = root.rotation.y, localX = leanX * Math.cos(yaw) - leanZ * Math.sin(yaw), localZ = leanX * Math.sin(yaw) + leanZ * Math.cos(yaw);
      harness.rotation.x = Math.max(-.12, Math.min(.12, localZ * .12));
      harness.rotation.z = Math.max(-.12, Math.min(.12, -localX * .12));
      const braking = flight.landing && flight.charge > 0 && altitude > .04;
      jets.visible = Boolean(flight.thrust || braking);
      if (!jets.visible) return;
      const speed = Number.isFinite(flight.verticalSpeed) ? flight.verticalSpeed : 0;
      // Shorter plumes near contact avoid exhaust crossing the physical ground.
      const length = Math.min(.55, braking ? .18 : .26 + Math.max(0, speed) * .045, .18 + altitude * .35);
      if (length !== lastLength) {
        lastLength = length;
        for (let i = 0; i < 2; i++) {
          transform.makeScale(1, length, 1); transform.setPosition(i ? .18 : -.18, .69, .29);
          jets.setMatrixAt(i, transform);
        }
        jets.instanceMatrix.needsUpdate = true;
      }
    },
    get stats() {
      return { disposed, drawCalls: disposed || !root.visible ? 0 : jets.visible ? 2 : 1,
        geometries: disposed ? 0 : 2, materials: disposed ? 0 : 2, textures: 0, lights: 0 };
    },
    dispose() {
      if (disposed) return; disposed = true; scene.remove(root);
      jets.dispose(); shellGeometry.dispose(); exhaustGeometry.dispose(); shell.dispose(); flame.dispose();
    }
  };
}
