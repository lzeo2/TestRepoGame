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
    function addGeometry(geometry, tint) {
      const color = new THREE.Color(tint), colors = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); pieces.push(geometry);
    }
    function box(x, y, z, width, height, depth, yaw, tint) {
      addGeometry(new THREE.BoxGeometry(width, height, depth).rotateY(yaw).translate(x, y, z), tint);
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
        shop: 0xb3b1a0, concourse: 0xd1c7b1, 'mall-unit': 0xb7b39e,
        'noodle-dining': 0xc9baa0, 'noodle-kitchen': 0xb3bbb0, 'gym-floor': 0x777e79 }[room.kind];
      box(room.x, plan.floorY + 0.006, room.z, room.width - 0.12, 0.012, room.depth - 0.12, o.yaw, color);
    }
    for (const wall of plan.walls) {
      box(wall.x, wall.y + wall.height / 2, wall.z, wall.width, wall.height, wall.depth, wall.yaw, wall.color);
      // Skirting follows the same collision solids and leaves every doorway clear.
      box(wall.x, wall.y + 0.065, wall.z, wall.width + 0.025, 0.13, wall.depth + 0.025, wall.yaw, 0x84765f);
    }
    for (const item of plan.furniture) {
      const { width: w, depth: d, height: h, color } = item;
      if (item.kind === 'banquette') {
        detail(item, 0, 0.2, 0, w, 0.4, d, 0xa7834f);
        detail(item, 0, 0.47, 0, w, 0.16, d, color);
        detail(item, -w / 2 + 0.075, 0.82, 0, 0.15, 0.7, d, color);
        for (const z of [-d / 3, 0, d / 3]) detail(item, -w / 2 + 0.157, 0.82, z, 0.018, 0.66, 0.025, 0xb05a32);
      } else if (item.kind === 'padded-chair' || item.kind === 'stool') {
        const seat = item.kind === 'stool' ? h - 0.06 : 0.46;
        detail(item, 0, seat, 0, w, 0.12, d, color);
        if (item.kind !== 'stool') detail(item, 0, 0.71, -d / 2 + 0.035, w, 0.34, 0.07, color);
        for (const x of [-1, 1]) for (const z of [-1, 1]) detail(item, x * (w / 2 - 0.055), seat / 2,
          z * (d / 2 - 0.055), 0.06, seat, 0.06, 0xb59563);
      } else if (item.kind === 'shelves') {
        detail(item, -w / 2 + 0.04, h / 2, 0, 0.08, h, d, color);
        for (const end of [-1, 1]) detail(item, 0, h / 2, end * (d / 2 - 0.035), w, h, 0.07, color);
      } else if (item.kind === 'exercise-bench') {
        detail(item, 0, h - 0.07, 0, w, 0.14, d, color);
        detail(item, 0, h / 2, 0, 0.12, h - 0.14, d * 0.75, 0x657073);
        for (const z of [-0.75, 0.75]) detail(item, 0, 0.08, z, 1.1, 0.12, 0.22, 0x657073);
      } else if (item.kind === 'bench-rack') {
        detail(item, 0, h / 2, 0, w, h, 0.16, color);
        detail(item, 0, 0.08, 0, 0.6, 0.16, d, color);
        detail(item, 0, h - 0.3, -0.12, w + 0.05, 0.1, 0.36, 0xb1b8ae);
      } else if (item.kind === 'weight-rack') {
        for (const z of [-d / 2 + 0.15, d / 2 - 0.15]) detail(item, 0, h / 2, z, w, h, 0.16, color);
        for (const y of [0.42, 0.92]) {
          detail(item, 0, y, 0, w, 0.1, d, color);
          for (let z = -d / 2 + 0.4; z < d / 2; z += 0.55) {
            detail(item, 0, y + 0.13, z, w * 0.75, 0.1, 0.08, 0xb1b8ae);
            for (const x of [-0.23, 0.23]) detail(item, x, y + 0.13, z, 0.14, 0.28, 0.24, 0x303c40);
          }
        }
      } else if (item.kind === 'treadmill') {
        detail(item, 0, 0.13, 0, w, 0.26, d, color);
        detail(item, 0, 0.28, 0, w * 0.78, 0.05, d * 0.75, 0x343d3e);
        for (const x of [-w * 0.42, w * 0.42]) detail(item, x, h / 2, d * 0.34, 0.09, h, 0.12, color);
        detail(item, 0, h, d * 0.34, w, 0.16, 0.38, 0x3a4849);
        detail(item, 0, h + 0.09, d * 0.34, w * 0.55, 0.03, 0.24, 0x94b6a4);
      } else if (item.kind === 'arcade') {
        detail(item, 0, h * 0.3, 0, w, h * 0.6, d, color);
        detail(item, 0, h * 0.78, d * 0.22, w, h * 0.44, d * 0.5, color);
        detail(item, 0, h * 0.78, -0.015, w * 0.78, h * 0.3, 0.035, 0x263e47);
        for (const x of [-0.22, 0, 0.22]) detail(item, x, h * 0.78, -0.04, 0.1, 0.1, 0.02, 0xc8b873);
        detail(item, 0.2, h * 0.62, -d * 0.25, 0.1, 0.08, 0.1, 0xc79875);
      } else if (item.kind === 'bench') {
        detail(item, 0, h - 0.09, 0, w, 0.18, d, color);
        for (const end of [-1, 1]) detail(item, 0, (h - 0.18) / 2, end * (d / 2 - 0.3), w * 0.65, h - 0.18, 0.15, 0x5e6458);
      } else if (/table/.test(item.kind)) {
        detail(item, 0, h - 0.05, 0, w, 0.1, d, color);
        for (const x of [-1, 1]) for (const z of [-1, 1]) detail(item, x * (w / 2 - 0.09), h / 2,
          z * (d / 2 - 0.09), 0.09, h - 0.1, 0.09, color);
      } else detail(item, 0, h / 2, 0, w, h, d, color);
      if (item.kind === 'lockers') {
        for (let x = -w / 2 + 0.3; x < w / 2; x += 0.62) {
          detail(item, x, h / 2, -d / 2 - 0.01, 0.012, h - 0.12, 0.02, 0x717d75);
          detail(item, x + 0.12, h * 0.55, -d / 2 - 0.025, 0.05, 0.13, 0.03, 0x535d56);
        }
      } else if (item.kind === 'bed') {
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
      } else if (item.kind === 'counter' || item.kind === 'kitchen-pass') {
        detail(item, 0, h + 0.045, 0, w + 0.12, 0.09, d + 0.12, 0x44514a);
        detail(item, 0.35, h + 0.16, 0.1, 0.35, 0.25, 0.3, 0x303936);
      } else if (item.kind === 'noodle-station' || item.kind === 'prep-bench') {
        detail(item, 0, h + 0.04, 0, w + 0.05, 0.08, d + 0.05, 0xc2cbc5);
        if (item.kind === 'noodle-station') {
          for (const x of [-0.6, 0.35]) {
            detail(item, x, h + 0.15, 0, 0.5, 0.2, 0.5, 0x4c5a55);
            detail(item, x, h + 0.26, 0, 0.4, 0.025, 0.4, 0xd6c39b);
          }
        } else detail(item, 0, h + 0.1, 0, 0.65, 0.04, 0.5, 0xb28e51);
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
    if (plan.variant === 'noodles') {
      const local = { x: o.x, z: o.z, yaw: o.yaw, y: plan.floorY };
      detail(local, 0, 2.74, plan.depth / 2, plan.width, 0.08, plan.depth, 0xe4dfd2);
      // Honey timber panels and beams use a small number of original solid strips.
      for (const side of [-1, 1]) {
        for (let z = 2.5; z < 9; z += 1.4) detail(local, side * (plan.width / 2 - 0.095), 1.57, z,
          0.06, 0.55, 1.3, 0xbb965e);
        detail(local, side * (plan.width / 2 - 0.12), 2.18, 5.45, 0.08, 0.11, 7.3, 0xaa824b);
      }
      for (const z of [2.1, 5, 7.9]) detail(local, 0, 2.58, z, plan.width - 0.1, 0.11, 0.13, 0xb2915c);
      // Pale stone tile joints and warm strips are static geometry, without extra lights/textures.
      for (let x = -2.4; x <= 2.4; x += 1.2) detail(local, x, 0.016, 6, 0.012, 0.008, 11.8, 0xa89f90);
      for (let z = 1.2; z < 12; z += 1.2) detail(local, 0, 0.016, z, plan.width - 0.2, 0.008, 0.012, 0xa89f90);
      detail(local, 0.6, 2.25, 9.2, plan.width - 2, 0.11, 0.18, 0xb2915c);
      detail(local, 0.6, 2.18, 9.2, plan.width - 2.1, 0.025, 0.06, 0xffe6ac);
      for (let x = -1.4; x < 2.7; x += 0.4) detail(local, x, 2.4, 9.2, 0.065, 0.4, 0.11, 0xb2915c);
      for (const x of [-0.65, 0.65]) {
        detail(local, x, 2.4, 9.1, 0.95, 0.34, 0.025, 0x424e45);
        for (const row of [-1, 0, 1]) detail(local, x + 0.12, 2.4 + row * 0.08, 9.08, 0.5, 0.025, 0.012, 0xdac8a0);
        detail(local, x - 0.29, 2.4, 9.08, 0.14, 0.11, 0.012, 0xd99a59);
      }
      detail(local, 0, 1.65, 11.5, 4.5, 0.95, 0.06, 0xaebbb6);
      // Original abstract bowl-and-line relief, with no copied mural, text or logos.
      for (const side of [-1, 1]) for (const z of [3.5, 6.3]) {
        detail(local, side * (plan.width / 2 - 0.15), 2.12, z, 0.025, 0.07, 0.7, 0x7b684c);
        detail(local, side * (plan.width / 2 - 0.15), 1.99, z, 0.025, 0.06, 0.45, 0x7b684c);
      }
      for (const item of plan.details || []) {
        if (item.kind === 'noodle-bowl') {
          const profile = [[0,0],[0.08,0],[0.145,0.13],[0.12,0.13],[0.1,0.06]].map(p => new THREE.Vector2(...p));
          addGeometry(new THREE.LatheGeometry(profile, 8).translate(item.x, item.y, item.z), item.color);
          addGeometry(new THREE.CircleGeometry(0.112, 8).rotateX(-Math.PI / 2).translate(item.x, item.y + 0.112, item.z), 0xb6894d);
          for (const z of [-0.035, 0.03]) detail(item, 0, 0.121, z, 0.15, 0.012, 0.018, 0xe8cf8f);
        } else if (item.kind === 'chopsticks') {
          for (const z of [-0.018, 0.018]) detail(item, 0, 0.01, z, item.width, 0.012, 0.012, item.color);
        } else if (item.kind === 'condiments') {
          detail(item, 0, 0.025, 0, item.width, 0.05, item.depth, 0x8b7451);
          detail(item, -0.06, 0.115, 0, 0.065, 0.17, 0.07, 0x603e2b);
          detail(item, 0.055, 0.095, 0, 0.075, 0.13, 0.075, 0xa75e39);
        }
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
