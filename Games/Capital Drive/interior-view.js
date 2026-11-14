import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

// One active room set, one opaque vertex-colour batch, no retained per-building meshes.
export function createInteriorView(scene) {
  const root = new THREE.Group(); root.name = 'Active original interior'; scene.add(root);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  let disposed = false, current = null;
  const stats = { active: 0, meshes: 0, draws: 0, triangles: 0, furniture: 0 };
  function clear() {
    for (const mesh of [...root.children]) { root.remove(mesh); mesh.geometry.dispose(); }
    current = null;
    Object.assign(stats, { active: 0, meshes: 0, draws: 0, triangles: 0, furniture: 0 });
  }
  function load(plan) {
    if (disposed) return false;
    if (plan === current) return true;
    clear();
    if (!plan) return false;
    const pieces = [];
    function box(x, y, z, width, height, depth, yaw, tint) {
      const geometry = new THREE.BoxGeometry(width, height, depth).rotateY(yaw).translate(x, y, z);
      const color = new THREE.Color(tint), colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); pieces.push(geometry);
    }
    function detail(item, x, y, z, width, height, depth, color) {
      const c = Math.cos(item.yaw), s = Math.sin(item.yaw);
      box(item.x + c * x + s * z, item.y + y, item.z - s * x + c * z,
        width, height, depth, item.yaw, color);
    }
    const o = plan.origin, c = Math.cos(o.yaw), s = Math.sin(o.yaw);
    box(o.x + s * plan.depth / 2, plan.floorY - 0.08, o.z + c * plan.depth / 2,
      plan.width, 0.16, plan.depth, o.yaw, plan.type === 'house' ? 0xa88e70 : 0xb3b1a0);
    for (const room of plan.rooms || []) {
      const color = { living: 0xaa9c84, kitchen: 0xb8b6a4, bedroom: 0x9b9e90, bathroom: 0xb2c1bb,
        shop: 0xb3b1a0, concourse: 0xd1c7b1, 'mall-unit': 0xb7b39e }[room.kind];
      box(room.x, plan.floorY + 0.006, room.z, room.width - 0.12, 0.012, room.depth - 0.12, o.yaw, color);
    }
    for (const wall of plan.walls) {
      box(wall.x, wall.y + wall.height / 2, wall.z, wall.width, wall.height, wall.depth, wall.yaw, wall.color);
      // Skirting follows the same collision solids and leaves every doorway clear.
      box(wall.x, wall.y + 0.065, wall.z, wall.width + 0.025, 0.13, wall.depth + 0.025, wall.yaw, 0x84765f);
    }
    for (const item of plan.furniture) {
      const { width: w, depth: d, height: h, color } = item;
      if (item.kind === 'shelves') {
        detail(item, -w / 2 + 0.04, h / 2, 0, 0.08, h, d, color);
        for (const end of [-1, 1]) detail(item, 0, h / 2, end * (d / 2 - 0.035), w, h, 0.07, color);
      } else if (item.kind === 'bench') {
        detail(item, 0, h - 0.09, 0, w, 0.18, d, color);
        for (const end of [-1, 1]) detail(item, 0, (h - 0.18) / 2, end * (d / 2 - 0.3), w * 0.65, h - 0.18, 0.15, 0x5e6458);
      } else if (/table/.test(item.kind)) {
        detail(item, 0, h - 0.05, 0, w, 0.1, d, color);
        for (const x of [-1, 1]) for (const z of [-1, 1]) detail(item, x * (w / 2 - 0.09), h / 2,
          z * (d / 2 - 0.09), 0.09, h - 0.1, 0.09, color);
      } else detail(item, 0, h / 2, 0, w, h, d, color);
      if (item.kind === 'bed') {
        detail(item, 0, h + 0.07, 0, w - 0.1, 0.14, d - 0.12, 0xc1c8bb);
        detail(item, 0, h + 0.18, d / 2 - 0.38, w - 0.28, 0.15, 0.46, 0xe1ddc9);
        detail(item, 0, h * 0.8, d / 2, w + 0.1, h * 1.6, 0.09, 0x886c50);
      } else if (item.kind === 'sofa') {
        detail(item, -w / 2 + 0.11, h * 0.8, 0, 0.22, 0.65, d, 0x67745f);
        for (const end of [-1, 1]) detail(item, 0, h * 0.65, end * (d / 2 - 0.1), w, 0.35, 0.2, 0x67745f);
      } else if (item.kind === 'shelves') {
        for (let tier = 0; tier < 3; tier++) {
          const y = 0.3 + tier * 0.48;
          detail(item, 0, y, 0, w + 0.05, 0.055, d, 0xc1b596);
          for (let row = 0; row < 5; row++) detail(item, 0, y + 0.16, -d / 2 + (row + 0.5) * d / 5,
            w + 0.06, 0.25, d / 7, [0x976955, 0xc8b678, 0x779080][(row + tier) % 3]);
        }
      } else if (item.kind === 'counter') {
        detail(item, 0, h + 0.045, 0, w + 0.12, 0.09, d + 0.12, 0x44514a);
        detail(item, 0.35, h + 0.16, 0.1, 0.35, 0.25, 0.3, 0x303936);
      } else if (item.kind === 'kitchen-bench') {
        detail(item, 0, h + 0.035, 0, w + 0.08, 0.07, d + 0.08, 0xd3cbbb);
        detail(item, 0, h + 0.08, -d * 0.25, w * 0.6, 0.04, 0.65, 0x7e8d89);
        detail(item, 0, h + 0.085, d * 0.3, w * 0.7, 0.04, 0.75, 0x343b39);
      } else if (/bath|basin/.test(item.kind)) {
        detail(item, 0, h + 0.015, 0, w * 0.7, 0.03, d * 0.75, 0x849d9b);
      } else if (item.kind === 'television') {
        detail(item, 0, h * 0.78, d / 2 + 0.015, w * 0.8, h * 0.6, 0.025, 0x6f8580);
      }
    }
    // A pale door mat gives the explicit exit interaction a visible anchor.
    box(plan.exit.x, plan.floorY + 0.018, plan.exit.z, 1.05, 0.025, 0.7, o.yaw, 0x687a65);
    const merged = mergeGeometries(pieces, false);
    for (const geometry of pieces) geometry.dispose();
    const mesh = new THREE.Mesh(merged, material); mesh.name = `Interior ${plan.id}`; root.add(mesh);
    Object.assign(stats, { active: 1, meshes: 1, draws: 1,
      triangles: merged.index ? merged.index.count / 3 : merged.attributes.position.count / 3,
      furniture: plan.furniture.length });
    current = plan; return true;
  }
  return { load, clear, stats,
    dispose() { if (disposed) return; clear(); material.dispose(); scene.remove(root); disposed = true; } };
}
