import * as THREE from './vendor/three.module.js';

export function createLandscape(scene, extent) {
  if (!Number.isFinite(extent) || extent <= 0) throw new RangeError('Landscape extent must be positive');
  const inner = 30, outer = 48, size = outer * 2, stride = size + 1;
  const step = extent / inner, edge = outer * step;
  const samples = new Float32Array(stride * stride), positions = [], colors = [], indices = [];
  const hash = n => { n = Math.imul(n ^ 0x45d9f3b, 0x45d9f3b); return (n >>> 0) / 4294967296; };
  const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
  const inside = (ix, iz) => ix >= -inner && ix < inner && iz >= -inner && iz < inner;
  const key = (ix, iz) => (iz + outer) * stride + ix + outer;
  function elevation(x, z) {
    const u = x / extent, v = z / extent, distance = Math.max(Math.abs(u), Math.abs(v)) - 1;
    if (distance <= 0) return 0;
    const rolling = .5 + .25 * Math.sin(u * 7 + v * 2) + .25 * Math.cos(v * 9 - u * 3);
    const ridges = Math.abs(Math.sin(u * 11 - v * 5));
    const inland = smooth(0, .58, distance) * (65 + 125 * rolling + 35 * ridges);
    // A continuous sandy bank crosses the existing y=-.4 water, then descends into its basin.
    const coast = u > 1 ? 1 - smooth(.68, 1.05, Math.abs(v)) : 0;
    const beach = 2.5 * Math.sin(Math.min(1, distance / .12) * Math.PI) - 18 * smooth(.07, .58, distance);
    return THREE.MathUtils.lerp(inland, beach, coast);
  }
  for (let iz = -outer; iz <= outer; iz++) for (let ix = -outer; ix <= outer; ix++) {
    samples[key(ix, iz)] = Math.abs(ix) <= inner && Math.abs(iz) <= inner ? 0 : elevation(ix * step, iz * step);
  }
  const grass = new THREE.Color(0x788c50), highGrass = new THREE.Color(0x95936c);
  const rock = new THREE.Color(0x8c8880), sand = new THREE.Color(0xb8aa83), deepSand = new THREE.Color(0x777b69);
  const color = new THREE.Color();
  for (let iz = -outer; iz <= outer; iz++) for (let ix = -outer; ix <= outer; ix++) {
    const y = samples[key(ix, iz)], x = ix * step, z = iz * step;
    const dx = samples[key(Math.min(outer, ix + 1), iz)] - samples[key(Math.max(-outer, ix - 1), iz)];
    const dz = samples[key(ix, Math.min(outer, iz + 1))] - samples[key(ix, Math.max(-outer, iz - 1))];
    const slope = Math.hypot(dx, dz) / (2 * step);
    color.copy(grass).lerp(highGrass, smooth(25, 85, y)).lerp(rock, Math.max(smooth(75, 140, y), smooth(.35, .8, slope)));
    if (x >= extent && Math.abs(z) < extent * 1.05) {
      color.lerp(sand, (1 - smooth(.68, 1.05, Math.abs(z) / extent)) * (1 - smooth(2, 12, y)));
      if (y < -.4) color.lerp(deepSand, smooth(.4, 16, -y));
    }
    positions.push(x, y, z); colors.push(color.r, color.g, color.b);
  }
  for (let iz = -outer; iz < outer; iz++) for (let ix = -outer; ix < outer; ix++) {
    if (inside(ix, iz)) continue;
    const a = key(ix, iz), b = key(ix, iz + 1), c = key(ix + 1, iz), d = key(ix + 1, iz + 1);
    indices.push(a, b, c, c, b, d);
  }
  const surfaceTriangles = indices.length / 3;
  // Buried undersides are omitted, as before. Skirts seal the visible outer and city edges.
  function skirt(ax, az, bx, bz) {
    const a = key(ax, az), b = key(bx, bz), start = positions.length / 3;
    for (const [k, bottom] of [[a, false], [a, true], [b, false], [b, true]]) {
      positions.push(positions[k * 3], bottom ? -32 : positions[k * 3 + 1], positions[k * 3 + 2]);
      colors.push(colors[k * 3] * .8, colors[k * 3 + 1] * .8, colors[k * 3 + 2] * .8);
    }
    indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
  }
  for (let i = -outer; i < outer; i++) {
    skirt(i + 1, -outer, i, -outer); skirt(i, outer, i + 1, outer);
    skirt(-outer, i, -outer, i + 1); skirt(outer, i + 1, outer, i);
  }
  for (let i = -inner; i < inner; i++) {
    skirt(i, -inner, i + 1, -inner); skirt(i + 1, inner, i, inner);
    skirt(-inner, i + 1, -inner, i); skirt(inner, i, inner, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true; scene.add(mesh);

  function cellHeight(ix, iz, u, v) {
    const a = samples[key(ix, iz)], b = samples[key(ix, iz + 1)], c = samples[key(ix + 1, iz)], d = samples[key(ix + 1, iz + 1)];
    return u + v <= 1 ? a + (c - a) * u + (b - a) * v : d + (b - d) * (1 - u) + (c - d) * (1 - v);
  }
  function surfaceHeight(x, z) {
    if (Math.abs(x) > edge || Math.abs(z) > edge) return 0;
    const ix = Math.min(outer - 1, Math.max(-outer, Math.floor(x / step)));
    const iz = Math.min(outer - 1, Math.max(-outer, Math.floor(z / step)));
    return cellHeight(ix, iz, x / step - ix, z / step - iz);
  }

  // Closed models, shared geometry/material and static instance matrices. No crossed alpha cards.
  function model(parts) {
    const p = [], c = [], tint = new THREE.Color();
    for (const [source, scale, offset, hex] of parts) {
      const g = source.index ? source.toNonIndexed() : source.clone();
      g.scale(...scale); g.translate(...offset); tint.setHex(hex);
      for (let i = 0; i < g.attributes.position.count; i++) {
        p.push(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i));
        c.push(tint.r, tint.g, tint.b);
      }
      g.dispose(); source.dispose();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
    g.computeVertexNormals(); g.computeBoundingBox(); return g;
  }
  const broadleaf = model([
    [new THREE.CylinderGeometry(.055, .085, .7, 7), [1, 1, 1], [0, .35, 0], 0x6a533a],
    [new THREE.IcosahedronGeometry(1, 0), [.42, .32, .4], [0, .76, 0], 0x566c3b],
    [new THREE.IcosahedronGeometry(1, 0), [.3, .26, .31], [.17, .88, .06], 0x71834a],
    [new THREE.IcosahedronGeometry(1, 0), [.29, .26, .28], [-.2, .7, -.08], 0x617742],
  ]);
  const pine = model([
    [new THREE.CylinderGeometry(.04, .07, .8, 7), [1, 1, 1], [0, .4, 0], 0x6a533a],
    [new THREE.ConeGeometry(.36, .65, 8), [1, 1, 1], [0, .55, 0], 0x4c633c],
    [new THREE.ConeGeometry(.27, .65, 8), [1, 1, 1], [0, .82, 0], 0x607447],
  ]);
  const grassParts = [];
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.ConeGeometry(.13, 1, 3); blade.rotateZ((i - 2) * .17); blade.rotateY(i * 2.4);
    grassParts.push([blade, [1, .55 + hash(i) * .5, 1], [Math.sin(i * 2.4) * .25, .25, Math.cos(i * 2.4) * .25], i % 2 ? 0x7f8c4c : 0x657c40]);
  }
  const grassModel = model(grassParts);
  const boulder = model([[new THREE.IcosahedronGeometry(1, 0), [1, .7, .8], [0, 0, 0], 0x89867b]]);
  const models = new Map([['broadleaf', broadleaf], ['pine', pine], ['grass', grassModel], ['boulder', boulder]]);
  const features = [], batches = [], dummy = new THREE.Object3D();
  function feature(kind, x, z, scale, rotation = 0) {
    scale *= extent / 1000;
    const g = models.get(kind), y = surfaceHeight(x, z) - (kind === 'boulder' ? scale * .23 : scale * .1);
    dummy.position.set(x, y, z); dummy.scale.setScalar(scale); dummy.rotation.set(0, rotation, 0); dummy.updateMatrix();
    const bounds = g.boundingBox.clone().applyMatrix4(dummy.matrix), center = bounds.getCenter(new THREE.Vector3()), span = bounds.getSize(new THREE.Vector3());
    // AABB clearance intentionally flies over entire crowns, rocks and grass, not through their gaps.
    features.push({ kind, x: center.x, y: center.y, z: center.z, w: span.x, h: span.y, d: span.z, matrix: dummy.matrix.clone() });
  }
  const clusters = [[-1.11, -.7], [-1.12, 0], [-1.1, .7], [-.65, 1.12], [.1, 1.12], [.7, 1.1], [-.5, -1.12], [.4, -1.12]];
  for (let k = 0; k < clusters.length; k++) {
    const [cx, cz] = clusters[k];
    for (let j = 0; j < 8; j++) {
      const i = k * 8 + j, x = (cx + (hash(i * 7) - .5) * .075) * extent, z = (cz + (hash(i * 13) - .5) * .075) * extent;
      feature(i % 3 ? 'broadleaf' : 'pine', x, z, 12 + hash(i * 17) * 9, hash(i * 19) * Math.PI * 2);
    }
    for (let j = 0; j < 18; j++) {
      const i = k * 18 + j;
      feature('grass', (cx + (hash(i * 23) - .5) * .13) * extent, (cz + (hash(i * 29) - .5) * .13) * extent, 1.3 + hash(i * 31) * 1.7, hash(i * 37) * Math.PI * 2);
    }
  }
  const slopes = [];
  for (let iz = -outer + 1; iz < outer - 1; iz++) for (let ix = -outer + 1; ix < outer - 1; ix++) {
    const x = (ix + .5) * step, z = (iz + .5) * step, y = surfaceHeight(x, z);
    const slope = Math.hypot(surfaceHeight(x + step / 2, z) - surfaceHeight(x - step / 2, z), surfaceHeight(x, z + step / 2) - surfaceHeight(x, z - step / 2)) / step;
    if (y > 45 && slope > .2) slopes.push({ x, z });
  }
  for (let i = 0; i < 48; i++) {
    const base = slopes[Math.floor(hash(i * 41) * slopes.length)];
    if (base) feature('boulder', base.x + (hash(i * 43) - .5) * step * .5, base.z + (hash(i * 47) - .5) * step * .5, 5 + hash(i * 53) * 8, hash(i * 59) * Math.PI * 2);
  }
  for (const [kind, g] of models) {
    const instances = features.filter(f => f.kind === kind), batch = new THREE.InstancedMesh(g, material, instances.length);
    instances.forEach((f, i) => batch.setMatrixAt(i, f.matrix));
    batch.instanceMatrix.needsUpdate = true; batch.receiveShadow = true; batch.castShadow = true;
    batch.computeBoundingSphere(); scene.add(batch); batches.push(batch);
  }

  function floorHeight(x, z, radius = 0) {
    let top = 0; // Keep water and city foundations conservative at y=0.
    const x0 = Math.max(-outer, Math.min(outer - 1, Math.floor((x - radius) / step))), x1 = Math.min(outer - 1, Math.floor((x + radius) / step));
    const z0 = Math.max(-outer, Math.min(outer - 1, Math.floor((z - radius) / step))), z1 = Math.min(outer - 1, Math.floor((z + radius) / step));
    for (let iz = z0; iz <= z1; iz++) for (let ix = x0; ix <= x1; ix++) {
      if (inside(ix, iz)) continue;
      const u0 = Math.max(0, (x - radius) / step - ix), u1 = Math.min(1, (x + radius) / step - ix);
      const v0 = Math.max(0, (z - radius) / step - iz), v1 = Math.min(1, (z + radius) / step - iz);
      if (u0 > u1 || v0 > v1) continue;
      let height = Math.max(cellHeight(ix, iz, u0, v0), cellHeight(ix, iz, u0, v1), cellHeight(ix, iz, u1, v0), cellHeight(ix, iz, u1, v1));
      // A piecewise-linear maximum is at a rectangle corner or the shared diagonal's endpoints.
      const lo = Math.max(u0, 1 - v1), hi = Math.min(u1, 1 - v0);
      if (lo <= hi) height = Math.max(height, cellHeight(ix, iz, lo, 1 - lo), cellHeight(ix, iz, hi, 1 - hi));
      if (height > 0) top = Math.max(top, height + .002); // Float32 rendered X/Z rounding allowance.
    }
    // ponytail: 256 static features; spatial buckets only if this fixed budget grows.
    for (const b of features) if (Math.abs(x - b.x) <= b.w / 2 + radius + .002 && Math.abs(z - b.z) <= b.d / 2 + radius + .002) top = Math.max(top, b.y + b.h / 2 + .002);
    return top;
  }
  const featureTriangles = batches.reduce((sum, b) => sum + b.geometry.attributes.position.count / 3 * b.count, 0);
  return { mesh, batches, features, boxes: features, floorHeight, surfaceHeight, edge,
    heightmap: { samples, step, inner, outer, stride },
    diagnostics: { samples: samples.length, surfaceTriangles, skirtTriangles: indices.length / 3 - surfaceTriangles,
      featureInstances: features.length, featureTriangles, triangles: indices.length / 3 + featureTriangles, draws: 1 + batches.length },
    dispose() {
      scene.remove(mesh, ...batches); geometry.dispose(); material.dispose();
      for (const batch of batches) { batch.geometry.dispose(); batch.dispose(); }
    }
  };
}
