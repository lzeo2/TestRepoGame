import * as THREE from './vendor/three.module.js';

// Original geometry only. Parts own their geometry; assembly consumes/disposes it.
// surface: 0 brick, 1 glazed pane, 2 roof, 3 neutral painted material.
export function assemble(parts) {
  let vertices = 0, indices = 0;
  for (const { geometry: g } of parts) {
    vertices += g.attributes.position.count;
    indices += g.index ? g.index.count : g.attributes.position.count;
  }
  const position = new Float32Array(vertices * 3), normal = new Float32Array(vertices * 3);
  const color = new Float32Array(vertices * 3), uv = new Float32Array(vertices * 2);
  const lightLevel = new Float32Array(vertices);
  const index = new Uint32Array(indices), tint = new THREE.Color();
  let base = 0, cursor = 0;
  for (const { geometry: g, color: hex = 0xffffff, surface = 3 } of parts) {
    const p = g.attributes.position, n = g.attributes.normal, tex = g.attributes.uv;
    tint.setHex(hex);
    const hash = Math.sin(p.getX(0) * 17 + p.getY(0) * 11 + p.getZ(0) * 7) * 43758.5453;
    const seed = hash - Math.floor(hash), interior = seed > .3 ? .55 + seed * .45 : .04;
    for (let i = 0; i < p.count; i++) {
      const j = base + i, u = tex ? tex.getX(i) : 0, v = tex ? tex.getY(i) : 0;
      const tile = surface < 2 && Math.abs(n.getY(i)) > .7 ? 2 : surface;
      const ao = .87 + .11 * n.getY(i) - .16 * Math.exp(-Math.max(0, p.getY(i)) * 1.4);
      const wear = Math.min(u, v, 1 - u, 1 - v) < .025 ? .035 : 0;
      position.set([p.getX(i), p.getY(i), p.getZ(i)], j * 3);
      normal.set([n.getX(i), n.getY(i), n.getZ(i)], j * 3);
      color.set([Math.min(1, tint.r * ao + wear), Math.min(1, tint.g * ao + wear), Math.min(1, tint.b * ao + wear)], j * 3);
      uv.set([(tile % 2) * .5 + .002 + u * .496, Math.floor(tile / 2) * .5 + .002 + v * .496], j * 2);
      lightLevel[j] = surface === 1 ? interior : 0;
    }
    const count = g.index ? g.index.count : p.count;
    for (let i = 0; i < count; i++) index[cursor++] = base + (g.index ? g.index.getX(i) : i);
    base += p.count;
    g.dispose();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('lightLevel', new THREE.BufferAttribute(lightLevel, 1));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
