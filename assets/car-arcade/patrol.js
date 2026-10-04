import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { createCar } from './models.js';

// One driving LOD. Shared Lantern buffers remain owned by models.js.
let cached = null;

function livery(source) {
  const geometry = source.clone(), positions = [], normals = [], colors = [];
  const dark = new THREE.Color('#171b22'), white = new THREE.Color('#e7e8e5');
  const p = geometry.attributes.position, n = geometry.attributes.normal;
  // Split the existing long hull faces at the door ends. No overlay panels,
  // and no interpolation from black hood vertices across the white doors.
  function clip(poly, z, sign) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const inside = sign * (a[2] - z) >= 0, next = sign * (b[2] - z) >= 0;
      if (inside) out.push(a);
      if (inside !== next) {
        const t = (z - a[2]) / (b[2] - a[2]);
        out.push(a.map((v, j) => v + (b[j] - v) * t));
      }
    }
    return out;
  }
  for (let i = 0; i < geometry.index.count; i += 3) {
    let polys = [Array.from(geometry.index.array.slice(i, i + 3), j =>
      [p.getX(j), p.getY(j), p.getZ(j), n.getX(j), n.getY(j), n.getZ(j)])];
    for (const z of [-.95, 1.02]) polys = polys.flatMap(poly => {
      if (!poly.some(v => v[2] < z) || !poly.some(v => v[2] > z)) return [poly];
      return [clip(poly, z, -1), clip(poly, z, 1)];
    });
    for (const poly of polys) {
      const center = [0, 1, 2].map(j => poly.reduce((sum, v) => sum + v[j], 0) / poly.length);
      const door = Math.abs(center[0]) > .78 && center[1] < .82 && center[2] > -.95 && center[2] < 1.02;
      const color = center[1] > 1.4 || door ? white : dark;
      for (let j = 1; j < poly.length - 1; j++) for (const v of [poly[0], poly[j], poly[j + 1]]) {
        positions.push(...v.slice(0, 3)); normals.push(...v.slice(3)); colors.push(color.r, color.g, color.b);
      }
    }
  }
  geometry.setIndex(null);
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.normalizeNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function build(body) {
  const paint = livery(body.geometry);
  const solid = new THREE.MeshStandardMaterial({color:'#ffffff', vertexColors:true, roughness:.43, metalness:.26});
  const parts = [];
  function box(color, x, y, z, w, h, d) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z);
    g.deleteAttribute('uv'); g.clearGroups();
    const rgb = new THREE.Color(color), values = [];
    for (let i = 0; i < g.attributes.position.count; i++) values.push(rgb.r, rgb.g, rgb.b);
    g.setAttribute('color', new THREE.Float32BufferAttribute(values, 3)); parts.push(g);
  }
  // The Lantern roof is flat here at y=1.51. Feet contact its actual top face.
  for (const x of [-.36, .36]) box('#25282d', x, 1.53, .09, .10, .04, .15);
  box('#25282d', 0, 1.5675, .09, 1.10, .035, .20);
  box('#d32632', -.28, 1.625, .09, .49, .08, .18);
  box('#245fe0', .28, 1.625, .09, .49, .08, .18);
  // Return arms intersect the actual front bumper, below the lamps.
  for (const x of [-.27, .27]) {
    box('#25282d', x, .43, -2.31, .045, .045, .18);
    box('#25282d', x, .55, -2.38, .045, .28, .055);
  }
  box('#25282d', 0, .675, -2.38, .585, .045, .055);
  const equipment = mergeGeometries(parts, false); parts.forEach(g => g.dispose());
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 64); ctx.fillStyle = '#171b22';
  ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('POLICE', 128, 34, 244);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const lettering = new THREE.MeshStandardMaterial({map, transparent:true, alphaTest:.5, roughness:.65, side:THREE.FrontSide});
  const text = new THREE.PlaneGeometry(.90, .225);
  return {paint, solid, equipment, map, lettering, text};
}

export function createPatrolCar() {
  const car = createCar('lantern'), body = car.getObjectByName('body');
  if (!cached) cached = build(body);
  body.geometry = cached.paint; body.material = cached.solid;
  car.name = 'wardline';
  const equipment = new THREE.Mesh(cached.equipment, cached.solid);
  equipment.name = 'patrol-equipment'; car.add(equipment);
  for (const side of [-1, 1]) {
    const text = new THREE.Mesh(cached.text, cached.lettering);
    text.name = side < 0 ? 'police-left' : 'police-right';
    text.rotation.y = side * Math.PI / 2;
    text.position.set(side * (.93 * .93 + .002), .60, -.25); car.add(text);
  }
  const size = new THREE.Box3().setFromObject(car).getSize(new THREE.Vector3());
  let triangles = 0, drawCalls = 0;
  car.traverse(o => { if (o.isMesh) { triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3; drawCalls++; } });
  car.userData = Object.freeze({...car.userData, policeId:'wardline', triangles, drawCalls,
    dimensions:Object.freeze({width:size.x, height:size.y, length:size.z})});
  return car;
}

// Final renderer teardown only, before disposeCars(); never per removed NPC.
export function disposePatrolCars() {
  if (!cached) return;
  for (const resource of Object.values(cached)) resource.dispose();
  cached = null;
}
