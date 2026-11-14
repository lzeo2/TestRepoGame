import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { roadProfile } from './road-network.js';

// Exact cached OSM reserve way, omitted from the base map area export.
// © OpenStreetMap contributors, ODbL 1.0. Presence is supported by ACT Parks;
// animal positions/poses are original deterministic scenery, not population data.
export const RED_HILL_HABITAT = Object.freeze({
  id: '1208261619', version: 10, timestamp: '2026-02-12T20:45:18Z',
  name: 'Red Hill Nature Reserve', type: 'nature_reserve',
  sourceFile: 'osm-tile-1-0.json',
  sourceHash: 'f985be02b01495fd7ed77a9a4f268016f5d2b4b131d2f001f4db7f0e76008fc5',
  points: Object.freeze([
    [-2082.79,162.88],[-2078.14,171.44],[-2139.53,256.05],[-2172.82,282.36],[-2200.64,288.33],[-2366.01,293.45],
    [-2391.75,306.4],[-2401.08,330.5],[-2395.33,407.32],[-2398.94,428.52],[-2412.78,451.44],[-2472.01,498.39],
    [-2498.7,532.04],[-2513.09,572.57],[-2524.06,675.06],[-2492.85,680.05],[-2474.93,702.69],[-2442.17,718.63],
    [-2283.32,740.28],[-2166.52,734.44],[-2129.85,723.03],[-2096.24,701.73],[-2043.65,775.91],[-2041.5,813.89],
    [-2034.21,835.51],[-1925.28,1012.15],[-1907.0,1057.43],[-1894.0,1143.46],[-1885.89,1163.24],[-1871.84,1179.31],
    [-1847.68,1195.72],[-1831.9,1197.16],[-1819.12,1189.69],[-1813.11,1178.42],[-1813.36,1165.63],[-1855.29,1076.69],
    [-1909.87,998.06],[-2016.37,826.5],[-2022.67,804.47],[-2023.19,761.47],[-2028.15,740.46],[-2074.94,673.05],
    [-2089.32,666.6],[-2102.47,667.49],[-2188.73,705.26],[-2281.29,710.25],[-2439.91,688.05],[-2462.92,672.72],
    [-2474.01,651.65],[-2483.06,577.62],[-2478.08,559.78],[-2458.86,528.36],[-2396.52,478.19],[-2377.61,454.82],
    [-2366.45,424.39],[-2365.33,370.72],[-2351.08,341.89],[-2334.08,328.65],[-2313.51,322.29],[-2189.89,318.16],
    [-2161.16,310.62],[-2128.03,289.02],[-2086.88,235.41],[-2047.99,242.92],[-1962.72,291.77],[-1942.1,298.35],
    [-1935.7,291.19],[-1836.58,374.36],[-1860.5,403.48],[-1765.88,495.27],[-1727.13,544.12],[-1656.77,633.93],
    [-1568.65,772.53],[-1514.23,882.26],[-1454.51,1035.01],[-1421.5,1212.93],[-1415.32,1274.01],[-1327.99,1257.58],
    [-1325.03,1291.13],[-1384.92,1302.97],[-1416.3,1605.7],[-1409.15,1888.04],[-1361.46,1887.52],[-1356.36,2131.77],
    [-1404.05,2133.3],[-1398.33,2450.8],[-1349.64,2449.75],[-1349.32,2464.79],[-1403.96,2465.47],[-1400.58,2656.07],
    [-1279.2,2762.34],[-1249.12,2749.15],[-1024.63,3000.71],[-1042.12,3027.18],[-1037.96,3049.67],[-901.07,3205.56],
    [-1013.72,3251.55],[-1167.49,3289.8],[-1196.16,3292.92],[-1256.6,3296.73],[-1349.35,3285.69],[-1454.41,3244.8],
    [-1718.44,3089.91],[-1815.35,3043.82],[-1891.73,3018.36],[-1957.13,3003.21],[-2030.55,2993.24],[-2107.24,2990.87],
    [-2103.84,2960.19],[-2078.2,2955.62],[-1971.09,2914.19],[-1957.08,2894.32],[-1973.82,2882.64],[-1961.89,2838.73],
    [-2060.61,2769.6],[-2039.2,2715.95],[-2042.89,2665.85],[-2013.32,2593.47],[-2031.72,2539.16],[-2088.81,2536.38],
    [-2097.62,2473.84],[-2110.49,2291.98],[-2165.4,2246.99],[-2188.72,2216.88],[-2234.14,1798.88],[-2119.84,1675.51],
    [-2020.83,1597.62],[-2048.1,1557.06],[-2070.13,1569.57],[-2079.0,1552.2],[-2085.44,1552.18],[-2090.31,1551.88],
    [-2109.22,1557.57],[-2150.6,1568.29],[-2164.67,1496.83],[-2165.73,1467.6],[-2027.11,1460.36],[-1999.59,1422.79],
    [-2024.99,1293.92],[-2048.85,1237.54],[-2169.65,1061.54],[-2227.09,977.83],[-2262.1,1002.17],[-2468.43,1049.74],
    [-2900.98,988.73],[-3166.55,1143.92],[-3194.12,1334.68],[-3216.78,1329.15],[-3259.95,1271.86],[-3281.55,1207.09],
    [-3463.2,1157.77],[-3527.79,1038.73],[-3463.48,904.89],[-3516.9,856.35],[-3505.02,839.03],[-3512.96,823.65],
    [-3542.95,817.27],[-3635.51,772.06],[-3644.78,758.71],[-3577.84,589.7],[-3541.43,459.83],[-3538.02,447.44],
    [-3508.83,447.73],[-3508.87,465.6],[-3508.92,488.71],[-3509.13,584.72],[-3418.92,604.38],[-3346.26,556.17],
    [-3269.23,557.54],[-3251.8,550.49],[-3249.92,549.73],[-3214.25,535.29],[-3134.39,543.15],[-3113.63,545.19],
    [-3004.27,595.11],[-2957.13,616.61],[-2919.63,613.82],[-2915.15,611.56],[-2901.04,604.43],[-2886.14,588.39],
    [-2878.13,577.92],[-2871.65,560.71],[-2853.88,542.38],[-2902.54,441.74],[-2902.43,441.75],[-2860.13,443.94],
    [-2836.63,423.87],[-2748.28,282.0],[-2732.08,289.18],[-2710.35,286.19],[-2610.56,230.38],[-2599.24,216.58],
    [-2519.93,169.73],[-2461.68,157.45],[-2259.62,166.67],[-2229.37,159.0],[-2210.5,137.24],[-2114.02,151.01],
    [-2082.79,162.88]
  ].map(p => Object.freeze(p))),
});
const CAP = 12, CELL = 100, CLEARANCE = 5, RANGE = 240;
function inside(x, z, points) {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function edgeDistance(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t);
}

export function createWildlifeView(scene, map, heightAt) {
  const root = new THREE.Group(); root.name = 'Red Hill wildlife'; scene.add(root);
  const index = new Map();
  function indexOutline(item, margin) {
    const xs = item.points.map(p => p[0]), zs = item.points.map(p => p[1]);
    for (let x = Math.floor((Math.min(...xs) - margin) / CELL); x <= Math.floor((Math.max(...xs) + margin) / CELL); x++) {
      for (let z = Math.floor((Math.min(...zs) - margin) / CELL); z <= Math.floor((Math.max(...zs) + margin) / CELL); z++) {
        const key = `${x},${z}`;
        if (!index.has(key)) index.set(key, []);
        index.get(key).push(item);
      }
    }
  }
  for (const road of map.roads || []) for (let i = 1; i < road.points.length; i++) {
    const margin = roadProfile(road).driveWidth / 2 + CLEARANCE;
    indexOutline({ points: [road.points[i - 1], road.points[i]], margin, line: true }, margin);
  }
  for (const building of map.buildings || []) if (building.points?.length >= 3) indexOutline({ points: building.points, margin: CLEARANCE }, CLEARANCE);
  for (const area of map.areas || []) if (/water|pitch|recreation_ground|golf/.test(area.type) && area.points?.length >= 3) indexOutline({ points: area.points, margin: CLEARANCE }, CLEARANCE);
  // The pinned polygon uses the same projection and source snapshot as Canberra.
  // Other maps must supply their own explicitly named Red Hill reserve polygon.
  const habitats = (map.areas || []).filter(a => /Red Hill Nature Reserve/i.test(a.name || '') && /nature_reserve|grassland|grass/.test(a.type) && a.points?.length >= 3);
  if (!habitats.length && map.meta?.sourceHashes?.[RED_HILL_HABITAT.sourceFile] === RED_HILL_HABITAT.sourceHash) habitats.push(RED_HILL_HABITAT);
  function clear(x, z, habitat) {
    const bounds = map.bounds;
    if (bounds && (x < bounds.minX + CLEARANCE || x > bounds.maxX - CLEARANCE || z < bounds.minZ + CLEARANCE || z > bounds.maxZ - CLEARANCE)) return false;
    if (!inside(x, z, habitat.points)) return false;
    for (let i = 0; i < habitat.points.length; i++) if (edgeDistance(x, z, habitat.points[i], habitat.points[(i + 1) % habitat.points.length]) < CLEARANCE) return false;
    return !(index.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) || []).some(item => {
      if (!item.line && inside(x, z, item.points)) return true;
      for (let i = 1; i < item.points.length; i++) if (edgeDistance(x, z, item.points[i - 1], item.points[i]) < item.margin) return true;
      return !item.line && edgeDistance(x, z, item.points.at(-1), item.points[0]) < item.margin;
    });
  }
  const animals = [];
  for (const habitat of habitats) {
    const xs = habitat.points.map(p => p[0]), zs = habitat.points.map(p => p[1]);
    const bounds = map.bounds;
    const minX = Math.max(Math.min(...xs), bounds?.minX ?? -Infinity), maxX = Math.min(Math.max(...xs), bounds?.maxX ?? Infinity);
    const minZ = Math.max(Math.min(...zs), bounds?.minZ ?? -Infinity), maxZ = Math.min(Math.max(...zs), bounds?.maxZ ?? Infinity);
    // Three small mobs, at most four animals each; candidates sampled once.
    // Prefer the reserve edge nearest the source Red Hill residential anchor.
    const anchor = (map.landmarks || []).find(l => l.id === 'redhill');
    const candidates = [];
    for (let z = minZ + 18; z < maxZ; z += 95) for (let x = minX + 18; x < maxX; x += 95) candidates.push({ x, z });
    if (anchor) candidates.sort((a, b) => Math.hypot(a.x - anchor.x, a.z - anchor.z) - Math.hypot(b.x - anchor.x, b.z - anchor.z));
    for (const { x, z } of candidates) {
      if (animals.length >= CAP) break;
      if (animals.some(a => Math.hypot(x - a.groupX, z - a.groupZ) < 180)) continue;
      const group = [];
      for (const [dx, dz] of [[0, 0], [8, 4], [-6, 9], [3, 15]]) {
        const ax = x + dx, az = z + dz;
        if (clear(ax, az, habitat)) group.push(Object.freeze({ x: ax, z: az, y: heightAt(ax, az), yaw: (animals.length + group.length) * 1.71, groupX: x, groupZ: z, habitatId: String(habitat.id) }));
      }
      if (group.length >= 2) animals.push(...group.slice(0, CAP - animals.length));
    }
  }
  index.clear();
  // One shared original low-poly kangaroo body: haunches, long feet, tail,
  // small forearms, upright neck and tall ears. No skeleton/node per animal.
  const positions = [], normals = [], colors = [];
  const ico = new THREE.IcosahedronGeometry(1, 0), matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const position = new THREE.Vector3(), normal = new THREE.Vector3(), tint = new THREE.Color(), q = new THREE.Quaternion(), axis = new THREE.Vector3(1, 0, 0);
  function part(x, y, z, sx, sy, sz, color, pitch = 0) {
    matrix.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(axis, pitch), new THREE.Vector3(sx, sy, sz)); normalMatrix.getNormalMatrix(matrix); tint.set(color);
    for (let i = 0; i < ico.attributes.position.count; i++) {
      position.fromBufferAttribute(ico.attributes.position, i).applyMatrix4(matrix);
      normal.fromBufferAttribute(ico.attributes.normal, i).applyMatrix3(normalMatrix).normalize();
      positions.push(position.x, position.y, position.z); normals.push(normal.x, normal.y, normal.z); colors.push(tint.r, tint.g, tint.b);
    }
  }
  part(0, 0.8, 0, 0.36, 0.65, 0.36, 0x8c8c7a, -0.25);
  for (const side of [-1, 1]) {
    part(side * 0.23, 0.39, -0.04, 0.22, 0.34, 0.28, 0x969383);
    part(side * 0.23, 0.09, 0.2, 0.12, 0.09, 0.37, 0x6c6e63);
    part(side * 0.2, 1.0, 0.29, 0.07, 0.27, 0.07, 0x7c7f72, -0.45);
    part(side * 0.12, 1.87, 0.4, 0.075, 0.28, 0.06, 0x777a6e, -0.18);
  }
  part(0, 1.32, 0.24, 0.16, 0.37, 0.19, 0x9b9a88, 0.2);
  part(0, 1.59, 0.42, 0.19, 0.16, 0.27, 0x99988a);
  part(0, 1.59, 0.64, 0.09, 0.08, 0.07, 0x444b43);
  part(0, 0.3, -0.62, 0.13, 0.13, 0.78, 0x7d8172, -0.18);
  ico.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.InstancedMesh(geometry, material, CAP); mesh.name = 'Eastern grey kangaroos'; mesh.count = 0; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh);
  const stats = { animals: animals.length, visible: 0, animated: 0, meshes: 1, trianglesPerAnimal: positions.length / 9, maxAnimals: CAP, bufferBytes: positions.length * 12 + CAP * 64 };
  const scale = new THREE.Vector3(1, 1, 1), turn = new THREE.Vector3(0, 1, 0);
  let elapsed = 0, disposed = false;
  function update(focus, dt = 0) {
    if (disposed) return;
    const x = focus?.x ?? focus?.position?.x ?? 0, z = focus?.z ?? focus?.position?.z ?? 0;
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
    let count = 0, animated = 0;
    // This is always bounded to twelve; never scans map features during update.
    for (let i = 0; i < animals.length; i++) {
      const animal = animals[i], distance = Math.hypot(x - animal.x, z - animal.z);
      if (distance > RANGE) continue;
      const active = distance < 90;
      const bob = active ? Math.max(0, Math.sin(elapsed * 1.7 + i * 1.3)) * 0.055 : 0;
      matrix.compose(position.set(animal.x, animal.y + bob, animal.z), q.setFromAxisAngle(turn, animal.yaw), scale);
      mesh.setMatrixAt(count++, matrix); if (active) animated++;
    }
    if (animated) elapsed += step;
    mesh.count = count; mesh.visible = count > 0; mesh.instanceMatrix.needsUpdate = count > 0;
    stats.visible = count; stats.animated = animated;
  }
  function dispose() {
    if (disposed) return; disposed = true;
    geometry.dispose(); material.dispose(); mesh.dispose(); root.removeFromParent();
  }
  update(map.spawn);
  return { update, dispose, stats, animals: Object.freeze(animals) };
}
