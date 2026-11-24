import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { CAPITAL_BY_ID as BY_ID } from '../../assets/car-arcade/fleet.js';

// Matches the authored belt heights and round front lamps in models.js.
const BELT = { bricklet: .56, pip: .52, parcel: .49, finch: .56, lantern: .54, comet: .55, orchard: .52, pebble: .53, dockside: .48, horizon: .56, morrow: .61, gravel: .53, relay: .55, tempest: .58, atlas: .52, sunray: .57 };
const SEGMENTS = 8, REACH = 18, STEP = REACH / SEGMENTS;

// One controlled car only. Ground illumination is a bounded additive decal,
// avoiding real lights, shadow maps and an extra render pass on low-end GPUs.
export function createHeadlightsView(scene, { heightAt }) {
  const root = new THREE.Group(); root.name = 'Player headlights'; scene.add(root);
  const pixels = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const i = (y * 32 + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
    pixels[i + 3] = Math.round(255 * Math.max(0, 1 - ((x - 15.5) / 15.5) ** 2) ** 2 * Math.min(1, y / 3, (31 - y) / 3));
  }
  const texture = new THREE.DataTexture(pixels, 32, 32); texture.needsUpdate = true;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  const lampGeometry = new THREE.PlaneGeometry(1, 1); lampGeometry.rotateY(Math.PI);
  const groundGeometry = new THREE.PlaneGeometry(1, 1); groundGeometry.rotateX(-Math.PI / 2);
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xfffacd, toneMapped: false });
  const groundMaterial = new THREE.MeshBasicMaterial({ color: 0xfff6d5, map: texture, transparent: true, opacity: .42,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
  function batch(geometry, material, count, name) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.name = name; mesh.frustumCulled = false; mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh); return mesh;
  }
  const lamps = batch(lampGeometry, lampMaterial, 2, 'Self-lit front lamps');
  const ground = batch(groundGeometry, groundMaterial, SEGMENTS * 2, 'Forward ground illumination');
  const pose = new THREE.Object3D(), carPose = new THREE.Object3D(), point = new THREE.Vector3(), color = new THREE.Color();
  for (let i = 0; i < SEGMENTS * 2; i++) ground.setColorAt(i, color.setScalar((1 - Math.floor(i / 2) / SEGMENTS) ** 1.0));
  const stats = { visible: 0, lamps: 0, groundPatches: 0, drawCalls: 0, maxDrawCalls: 2, triangles: 0,
    geometries: 2, materials: 2, textures: 1, capacity: 1, lights: 0, disposed: false };
  let disposed = false, lastX, lastZ, lastYaw, lastModel;
  function hide() {
    root.visible = false; lamps.count = ground.count = 0;
    stats.visible = stats.lamps = stats.groundPatches = stats.drawCalls = stats.triangles = 0;
  }
  function update(vehicle, { enabled = false, interiorId = null } = {}) {
    if (disposed) return;
    if (!enabled || interiorId || !vehicle || vehicle.active === false || vehicle.interiorId ||
      !Number.isFinite(vehicle.x) || !Number.isFinite(vehicle.z) || !Number.isFinite(vehicle.yaw)) { hide(); return; }
    const car = BY_ID[vehicle.modelId];
    if (!car) { hide(); return; }
    if (root.visible && vehicle.x === lastX && vehicle.z === lastZ && vehicle.yaw === lastYaw && car.id === lastModel) return;
    hide();
    const { x, z, yaw } = vehicle, fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const y = heightAt(x, z), front = heightAt(x + fx * 2, z + fz * 2), rear = heightAt(x - fx * 2, z - fz * 2);
    if (!Number.isFinite(y) || !Number.isFinite(front) || !Number.isFinite(rear)) return;
    const round = car.id === 'bricklet' || car.id === 'pip' || car.id === 'pebble';
    carPose.position.set(x, y + .18, z); carPose.rotation.set(Math.atan2(front - rear, 4), yaw, 0, 'YXZ'); carPose.updateMatrix();
    for (let side = 0; side < 2; side++) {
      const lateral = (side ? 1 : -1) * car.width / 2 * (round ? .63 : .61);
      point.set(lateral, car.height * BELT[car.id] * (round ? .78 : .80), -car.length / 2 - .014).applyMatrix4(carPose.matrix);
      pose.position.copy(point); pose.rotation.copy(carPose.rotation);
      pose.scale.set(round ? .20 : car.width / 2 * .42, round ? .20 : .095, 1); pose.updateMatrix(); lamps.setMatrixAt(side, pose.matrix);
      for (let j = 0; j < SEGMENTS; j++) {
        const distance = car.length / 2 + .25 + (j + .5) * STEP, width = .8 + (j + .5) * .34;
        const px = x + fx * distance + rx * lateral, pz = z + fz * distance + rz * lateral;
        const a = heightAt(px - fx * STEP / 2, pz - fz * STEP / 2), b = heightAt(px + fx * STEP / 2, pz + fz * STEP / 2);
        const left = heightAt(px - rx * width / 2, pz - rz * width / 2), right = heightAt(px + rx * width / 2, pz + rz * width / 2);
        if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(left) || !Number.isFinite(right)) { hide(); return; }
        pose.position.set(px, (a + b + left + right) / 4 + .045, pz);
        pose.rotation.set(Math.atan2(b - a, STEP), yaw, Math.atan2(right - left, width), 'YXZ');
        pose.scale.set(width, 1, STEP * 1.12); pose.updateMatrix(); ground.setMatrixAt(j * 2 + side, pose.matrix);
      }
    }
    lastX = x; lastZ = z; lastYaw = yaw; lastModel = car.id;
    root.visible = true; lamps.count = 2; ground.count = SEGMENTS * 2;
    lamps.instanceMatrix.needsUpdate = ground.instanceMatrix.needsUpdate = true;
    stats.visible = 1; stats.lamps = 2; stats.groundPatches = SEGMENTS * 2; stats.drawCalls = 2; stats.triangles = 36;
  }
  function dispose() {
    if (disposed) return;
    hide(); disposed = true; root.removeFromParent(); lamps.dispose(); ground.dispose();
    lampGeometry.dispose(); groundGeometry.dispose(); lampMaterial.dispose(); groundMaterial.dispose(); texture.dispose(); stats.disposed = true;
  }
  hide();
  return { update, stats, dispose };
}
