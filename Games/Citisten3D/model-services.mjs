import * as THREE from './vendor/three.module.js';
import { assemble } from './model-geometry.mjs';

// Original procedural designs, metres, front = -Z. No shared/disposed input parts.
// All detail is physical form: no planar tessellation to meet triangle budgets.
const C = { stone: 0x99958a, mortar: 0x74736d, steel: 0x6b777c, dark: 0x303d43,
  cream: 0xc9c6b7, blue: 0x46658b, red: 0xa45a43, wood: 0x93704c, leaf: 0x557440 };
const V = a => new THREE.Vector3(...a);
const triangles = p => (p.geometry.index?.count ?? p.geometry.attributes.position.count) / 3;
function put(parts, geometry, color, surface = 3) { parts.push({ geometry, color, surface }); }
function box(p, x, y, z, w, h, d, color, surface = 3) {
  put(p, new THREE.BoxGeometry(w, h, d).translate(x, y, z), color, surface);
}
function cylinder(p, x, y, z, top, bottom, h, color, sides = 24, open = false) {
  put(p, new THREE.CylinderGeometry(top, bottom, h, sides, 1, open).translate(x, y, z), color);
}
function beam(p, a, b, radius, color, sides = 12, endRadius = radius) {
  const start = V(a), end = V(b), delta = end.clone().sub(start);
  const g = new THREE.CylinderGeometry(endRadius, radius, delta.length(), sides);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray());
  put(p, g, color);
}
function pipe(p, points, radius, color, segments = 24, sides = 12) {
  put(p, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(V)), segments, radius, sides, false), color);
}
function ring(p, x, y, z, radius, tube, color, vertical = false, segments = 48) {
  const g = new THREE.TorusGeometry(radius, tube, 8, segments);
  if (!vertical) g.rotateX(Math.PI / 2);
  put(p, g.translate(x, y, z), color);
}
function turned(profile, segments) {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), segments);
  // LatheGeometry emits zero-area pole triangles. Do not count/store those.
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), indices = [];
  for (let i = 0; i < g.index.count; i += 3) {
    const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
    a.fromBufferAttribute(g.attributes.position, ids[0]);
    b.fromBufferAttribute(g.attributes.position, ids[1]);
    c.fromBufferAttribute(g.attributes.position, ids[2]);
    if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-16) indices.push(...ids);
  }
  g.setIndex(indices);
  return g;
}
function lathe(p, x, y, z, profile, color, segments = 48) {
  put(p, turned(profile, segments).translate(x, y, z), color);
}
// A bevelled rectangular stone, not a subdivided plane. Bevels expose mortar
// joints and catch light on both sides; each wall is made of these stones.
function stone(p, x, y, z, w, h, d, color = C.stone, rotation = 0) {
  const b = Math.min(.035, h / 6, d / 6, w / 6);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + b, -h / 2 + b);
  shape.lineTo(w / 2 - b, -h / 2 + b);
  shape.lineTo(w / 2 - b, h / 2 - b);
  shape.lineTo(-w / 2 + b, h / 2 - b); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * b, bevelEnabled: true,
    bevelSize: b, bevelThickness: b, bevelSegments: 1, steps: 1, curveSegments: 1 });
  g.translate(0, 0, -d / 2 + b); g.rotateY(rotation); g.translate(x, y, z);
  // ExtrudeGeometry's world-unit UVs exceed the atlas tile; normalise locally.
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, ((uv.getX(i) % 1) + 1) % 1, ((uv.getY(i) % 1) + 1) % 1);
  put(p, g, color, 3);
}
function masonry(p, x, z, length, height, depth, color, rotation = 0, bottom = 0) {
  const rows = Math.round(height / .36), stepY = height / rows, stepX = .64;
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 ? stepX / 2 : 0;
    for (let left = -length / 2 - offset; left < length / 2 - .001; left += stepX) {
      const lo = Math.max(-length / 2, left), hi = Math.min(length / 2, left + stepX);
      const c = (lo + hi) / 2;
      stone(p, x + Math.cos(rotation) * c, bottom + (row + .5) * stepY,
        z - Math.sin(rotation) * c, hi - lo - .012, stepY - .012, depth,
        row % 3 === 0 ? new THREE.Color(color).multiplyScalar(.94).getHex() : color, rotation);
    }
  }
}
function ladder(p, x, z, bottom, top, width = .65) {
  for (const side of [-1, 1]) beam(p, [x + side * width / 2, bottom, z], [x + side * width / 2, top, z], .035, C.steel);
  for (let y = bottom + .2; y < top; y += .3) beam(p, [x - width / 2, y, z], [x + width / 2, y, z], .025, C.steel, 8);
}
function vent(p, x, y, z, radius = .48) {
  cylinder(p, x, y + .22, z, radius, radius, .44, C.steel, 32, true);
  // Raised rain hood with open underside and radial supports.
  lathe(p, x, y + .47, z, [[radius + .12, 0], [radius + .12, .06], [.12, .3], [0, .3]], C.dark, 32);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    beam(p, [x + Math.cos(a) * radius, y + .2, z + Math.sin(a) * radius],
      [x + Math.cos(a) * radius, y + .55, z + Math.sin(a) * radius], .025, C.steel, 8);
  }
}

function power() {
  const p = [];
  box(p, 0, .15, 0, 8, .3, 7, C.mortar);
  // Turbine hall, exposed vertical steel cladding ribs and recessed access doors.
  box(p, 0, 2.85, -.5, 7.5, 5.1, 5.7, C.steel, 0);
  box(p, 0, 5.52, -.5, 7.9, .24, 6.1, C.dark, 2);
  for (const side of [-1, 1]) for (let z = -3.1; z <= 2.2; z += .4)
    box(p, side * 3.8, 2.9, z, .12, 5.2, .08, C.cream);
  for (const x of [-2.4, 2.4]) {
    const h = x < 0 ? 13 : 11;
    lathe(p, x, 5.5, 1.6, [[.85, 0], [.8, .25], [.7, .5], [.62, h - 6.1],
      [.68, h - 5.85], [.68, h - 5.5], [.49, h - 5.5], [.49, h - 6.2]], C.steel);
    for (let y = 6.2; y < h - .2; y += 1.2) ring(p, x, y, 1.6, .66, .045, C.dark);
    ladder(p, x, 2.36, 5.7, h - .2, .45);
  }
  for (const x of [-2.5, 0, 2.5]) {
    box(p, x, 1.1, -3.55, 1.45, 1.6, .45, C.dark);
    box(p, x, 1.15, -3.81, 1.2, 1.3, .08, C.steel);
    for (let n = 0; n < 6; n++) box(p, x, .7 + n * .15, -3.88, 1, .055, .13, C.cream);
  }
  // Roof switchgear: turned ceramic sheds, busbars, cooling radiator fins.
  for (const x of [-2, 0, 2]) {
    box(p, x, 5.95, -1.1, 1.2, .6, 1.5, C.steel);
    for (let n = 0; n < 8; n++) box(p, x - .6 + n * .17, 5.97, -1.1, .06, .65, 1.75, C.dark);
    for (const z of [-1.6, -.6]) {
      const profile = [[.12, 0], [.12, .13]];
      for (let n = 0; n < 4; n++) profile.push([.21, .15 + n * .14], [.21, .2 + n * .14], [.105, .25 + n * .14]);
      profile.push([.08, .78]); lathe(p, x, 6.3, z, profile, 0xb5a383, 20);
    }
  }
  for (const z of [-1.6, -.6]) beam(p, [-2, 7.1, z], [2, 7.1, z], .06, 0xb99558, 16);
  for (const x of [-3, 3]) pipe(p, [[x, .35, 3.1], [x, 1.1, 3.1], [x * .6, 1.6, 3.1], [x * .6, 4.8, 3.1], [x * .4, 5.8, 2.6]], .19, C.cream, 32);
  return assemble(p);
}

function water() {
  const p = [];
  for (const x of [-2, 2]) for (const z of [-2, 2]) {
    box(p, x, .16, z, .85, .32, .85, C.mortar);
    beam(p, [x, .32, z], [x * .87, 7.3, z * .87], .14, C.steel, 16);
  }
  for (const s of [-1, 1]) for (const [low, high] of [[.5, 3.5], [3.5, 6.7]]) {
    beam(p, [-1.92, low, s * 1.92], [1.8, high, s * 1.8], .065, C.steel);
    beam(p, [1.92, low, s * 1.92], [-1.8, high, s * 1.8], .065, C.steel);
    beam(p, [s * 1.92, low, -1.92], [s * 1.8, high, 1.8], .065, C.steel);
    beam(p, [s * 1.92, low, 1.92], [s * 1.8, high, -1.8], .065, C.steel);
  }
  // Closed dished vessel with shoulder, dome and a projecting circumferential seam.
  lathe(p, 0, 6.65, 0, [[0, 0], [.55, .12], [1.7, .42], [2.45, .8], [2.7, 1.15],
    [2.75, 1.3], [2.75, 2.45], [2.65, 2.7], [2.3, 2.95], [1.7, 3.15], [.8, 3.3], [0, 3.35]], 0xa6c2c8, 64);
  for (const y of [7.95, 9.1]) ring(p, 0, y, 0, 2.76, .045, C.steel, false, 64);
  ring(p, 0, 7.3, 0, 2.9, .13, C.dark, false, 64);
  ring(p, 0, 8.1, 0, 3, .035, C.steel, false, 64);
  for (let i = 0; i < 20; i++) {
    const a = i * Math.PI / 10, x = Math.cos(a), z = Math.sin(a);
    beam(p, [x * 2.9, 7.3, z * 2.9], [x * 3, 8.1, z * 3], .026, C.steel, 8);
    beam(p, [x * 1.8, 6.9, z * 1.8], [x * 2.9, 7.3, z * 2.9], .055, C.steel, 8);
  }
  pipe(p, [[0, 6.7, 0], [.5, 6, 0], [.5, 1.2, 0], [.9, .6, 0], [2.7, .6, 0]], .2, C.blue, 32);
  cylinder(p, 2.7, .15, 0, .5, .5, .3, C.mortar);
  ring(p, 1.8, .9, -.28, .32, .035, 0x9b4b3f, true, 32);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    beam(p, [1.8, .9, -.28], [1.8 + Math.cos(a) * .32, .9 + Math.sin(a) * .32, -.28], .022, C.steel, 8);
  }
  ladder(p, -2.3, 2.15, 0, 7.7);
  return assemble(p);
}

function station(isFire) {
  const p = [], w = isFire ? 8 : 7, h = isFire ? 5 : 4, color = isFire ? C.red : C.cream;
  box(p, 0, .1, 0, w, .2, 7, C.mortar);
  // Hollow envelope. Real front openings rather than doors pasted onto a solid box.
  masonry(p, 0, 3.3, w, h - .2, .36, color, 0, .2);
  for (const side of [-1, 1]) masonry(p, side * (w / 2 - .18), 0, 6.25, h - .2, .36, color, Math.PI / 2, .2);
  const openings = isFire ? [-2, 2] : [-2.2, 0, 2.2];
  const openingW = isFire ? 3.1 : 1.7, openingH = isFire ? 3.5 : 2.8;
  for (const x of openings) {
    // Recessed glazing/roller shutter, proud jambs and lintel, handles and threshold.
    box(p, x, openingH / 2 + .2, -3.05, openingW, openingH, .1, isFire ? C.cream : C.blue, isFire ? 3 : 1);
    for (const s of [-1, 1]) box(p, x + s * (openingW / 2 + .07), openingH / 2 + .2, -3.35, .14, openingH + .15, .38, C.stone);
    box(p, x, openingH + .3, -3.35, openingW + .35, .2, .44, C.stone);
    box(p, x, .2, -3.65, openingW + .3, .16, .65, C.stone);
    if (isFire) {
      for (let y = .45; y < 3.6; y += .3) box(p, x, y, -3.13, openingW, .045, .09, C.steel);
      for (const dx of [-.85, 0, .85]) box(p, x + dx, 2.7, -3.15, .66, .42, .05, C.blue, 1);
    } else {
      box(p, x, 1.6, -3.13, .07, 2.8, .12, C.steel);
      box(p, x, 1.9, -3.13, openingW, .06, .12, C.steel);
      for (const dx of [-.16, .16]) beam(p, [x + dx, 1.1, -3.24], [x + dx, 1.55, -3.24], .025, C.cream, 8);
    }
  }
  // Front masonry occupies only actual piers and spandrel, with no buried facade.
  const edges = [-w / 2, ...openings.flatMap(x => [x - openingW / 2 - .15, x + openingW / 2 + .15]), w / 2];
  for (let i = 0; i < edges.length; i += 2) {
    const width = edges[i + 1] - edges[i];
    if (width > .03) masonry(p, (edges[i] + edges[i + 1]) / 2, -3.3, width, h - .2, .36, color, 0, .2);
  }
  masonry(p, 0, -3.3, w, h - openingH - .5, .36, color, 0, openingH + .5);
  box(p, 0, h + .08, 0, w + .22, .16, 7.2, C.dark, 2);
  for (const z of [-3.48, 3.48]) box(p, 0, h + .25, z, w + .2, .2, .14, C.stone);
  for (const x of [-w / 2, w / 2]) box(p, x, h + .25, 0, .14, .2, 7, C.stone);
  box(p, 0, h - .35, -3.58, isFire ? 5 : 4.7, .42, .18, isFire ? C.cream : C.blue);
  // Hoods, ducts, drainpipes and rooftop air handling remain visible in plan view.
  for (const x of [-1.6, 1.2]) vent(p, x, h + .17, .7);
  box(p, -.4, h + .45, 1.9, 1.8, .55, .9, C.steel);
  for (let i = 0; i < 8; i++) box(p, -1.15 + i * .22, h + .75, 1.9, .08, .07, .8, C.dark);
  for (const x of [-w / 2 + .15, w / 2 - .15]) pipe(p, [[x, .3, 3.56], [x, h - .5, 3.56], [x, h, 3.35]], .055, C.steel, 16, 8);
  if (isFire) {
    // Hose-drying tower rises from the back corner, with open louvred upper vents.
    box(p, 2.85, 5.75, 2, 1.45, 1.3, 1.45, C.red, 0);
    for (const x of [2.15, 3.55]) for (const z of [1.3, 2.7]) box(p, x, 6.85, z, .18, 1.1, .18, C.cream);
    for (let y = 6.4; y < 7.3; y += .16) {
      for (const z of [1.32, 2.68]) {
        const g = new THREE.BoxGeometry(1.25, .08, .23).rotateX(.35).translate(2.85, y, z); put(p, g, C.dark);
      }
      for (const x of [2.17, 3.53]) box(p, x, y, 2, .18, .08, 1.2, C.dark);
    }
    box(p, 2.85, 7.4, 2, 1.8, .2, 1.8, C.dark, 2);
    ladder(p, 3.83, 1.9, .2, 7.3, .36);
  } else {
    // Low communications roof, ventilated sides and a shallow curved aerial dish.
    box(p, 0, 4.48, 0, 2.7, .55, 2.6, C.blue);
    for (let i = 0; i < 10; i++) box(p, -1.1 + i * .24, 4.48, -1.34, .1, .38, .14, C.dark);
    const dish = turned([[0, 0], [.15, .015], [.3, .06], [.45, .14], [.6, .25],
      [.6, .28], [.45, .17], [.3, .09], [.15, .045], [0, .03]], 32);
    dish.rotateX(-.65); dish.translate(-2.2, 4.6, 2.2); put(p, dish, C.cream);
    beam(p, [-2.2, 4.15, 2.2], [-2.2, 4.65, 2.2], .06, C.steel);
  }
  return assemble(p);
}

// Tapered, curved branches. Ring radius and bark fluting change along the
// centreline; each crown lobe is a deformed rounded volume, never a box.
function branch(p, points, radius, tip, color, segments = 10, sides = 10) {
  const curve = new THREE.CatmullRomCurve3(points.map(V));
  const g = new THREE.TubeGeometry(curve, segments, 1, sides, false), pos = g.attributes.position;
  for (let row = 0; row <= segments; row++) {
    const t = row / segments, centre = curve.getPointAt(t), r = radius * (1 - t) + tip * t;
    for (let col = 0; col <= sides; col++) {
      const i = row * (sides + 1) + col, bark = 1 + .07 * Math.cos(col / sides * Math.PI * 10 + t * 2);
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).sub(centre).multiplyScalar(r * bark).add(centre);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals(); put(p, g, color);
}
function crown(p, x, y, z, sx, sy, sz, phase) {
  const g = new THREE.SphereGeometry(1, 18, 12), a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const vx = a.getX(i), vy = a.getY(i), vz = a.getZ(i);
    const bump = 1 + .13 * Math.sin(vx * 7 + phase) * Math.sin(vz * 6 - vy * 4) + .06 * Math.cos(vy * 11 + phase);
    a.setXYZ(i, vx * bump, vy * bump, vz * bump);
  }
  // SphereGeometry offsets pole U outside [0,1]; keep the neutral atlas tile.
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, THREE.MathUtils.clamp(uv.getX(i), 0, 1));
  g.computeVertexNormals();
  // The sphere's two unreferenced seam-pole vertices have no incident faces.
  const normal = g.attributes.normal, fallback = new THREE.Vector3();
  for (let i = 0; i < normal.count; i++) {
    if (normal.getX(i) === 0 && normal.getY(i) === 0 && normal.getZ(i) === 0) {
      fallback.fromBufferAttribute(a, i).normalize(); normal.setXYZ(i, fallback.x, fallback.y, fallback.z);
    }
  }
  g.scale(sx, sy, sz); g.translate(x, y, z);
  put(p, g, phase % 2 < 1 ? C.leaf : 0x6e8748);
}
function tree(p, x, z, variant) {
  const beginPart = p.length;
  branch(p, [[x, .24, z], [x + .08, 1.1, z - .04], [x - .13, 2.1, z + .12], [x + .12, 3.8, z]], .23, .045, C.wood, 16, 14);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5 + variant, dx = Math.cos(a), dz = Math.sin(a);
    branch(p, [[x + dx * .65, .26, z + dz * .65], [x + dx * .35, .34, z + dz * .35], [x, .75, z]], .055, .15, C.wood, 6, 8);
  }
  for (let i = 0; i < 9; i++) {
    const a = i * 2.39996 + variant, reach = i < 5 ? .88 : .64, y = 2.8 + i * .14;
    const dx = Math.cos(a), dz = Math.sin(a), end = [x + dx * reach, y, z + dz * reach];
    branch(p, [[x, 1.6 + i * .15, z], [x + dx * reach * .5, y - .35, z + dz * reach * .55], end], .09, .018, C.wood, 8, 8);
    branch(p, [end, [end[0] + .18 * dz, y + .24, end[2] - .18 * dx], [end[0] + .28 * dz, y + .42, end[2] - .28 * dx]], .035, .008, C.wood, 4, 6);
    crown(p, end[0], y + .23, end[2], .57 + (i % 3) * .05, .67, .59, i + variant);
  }
  return { beginPart, endPart: p.length };
}
function park() {
  const p = [], trees = [];
  box(p, 0, .12, 0, 8, .24, 8, 0x799455);
  // Offset stepping stones leave grass joints; curved path through two tree pits.
  for (let i = 0; i < 12; i++) {
    const z = -3.6 + i * .65, x = .45 * Math.sin(i * .42);
    stone(p, x, .28, z, 1.05, .08, .59, 0xb4ac93, .08 * Math.cos(i));
  }
  for (const [x, z, variant] of [[-2, -2, 0], [2, 1, 1.7]]) trees.push(tree(p, x, z, variant));
  // Slatted bench with curved cast-iron side frames and braced legs.
  for (const x of [-1.85, -.15]) {
    pipe(p, [[x, .24, 2.78], [x, .52, 2.65], [x, .67, 2.5], [x, .68, 2.1], [x, 1.23, 2.05]], .045, C.dark, 16, 8);
    beam(p, [x, .24, 2.12], [x, .66, 2.55], .04, C.dark, 8);
    pipe(p, [[x, .67, 2.72], [x, .98, 2.65], [x, 1, 2.25], [x, .72, 2.15]], .035, C.dark, 12, 8);
  }
  for (let i = 0; i < 4; i++) box(p, -1, .7, 2.15 + i * .17, 2.2, .09, .14, C.wood);
  for (let i = 0; i < 3; i++) box(p, -1, .88 + i * .15, 2.05, 2.2, .11, .08, C.wood);
  const counts = p.map(triangles), g = assemble(p);
  // Index ranges let the Node check count the two real tree meshes independently.
  g.userData.trees = trees.map(({ beginPart, endPart }) => ({
    firstIndex: counts.slice(0, beginPart).reduce((a, b) => a + b, 0) * 3,
    indexCount: counts.slice(beginPart, endPart).reduce((a, b) => a + b, 0) * 3,
  }));
  return g;
}

function wall() {
  const p = [];
  box(p, 0, .09, 0, 10, .18, 1.05, C.mortar);
  masonry(p, 0, 0, 10, 3.36, .8, C.stone, 0, .18);
  // Stepped buttresses and weathered coping project from the wall plane.
  for (const x of [-4, -2, 0, 2, 4]) {
    for (const side of [-1, 1]) {
      stone(p, x, .55, side * .47, .62, .74, .55, C.mortar);
      stone(p, x, 1.3, side * .43, .5, .74, .44, C.stone);
      stone(p, x, 2.05, side * .38, .4, .74, .34, C.stone);
    }
    stone(p, x, 3.88, 0, 1, .6, 1, C.mortar);
    stone(p, x, 4.21, 0, 1.08, .1, 1.08, C.stone);
  }
  for (let x = -4.5; x < 5; x++) stone(p, x, 3.58, 0, .98, .16, 1, C.cream);
  return assemble(p);
}

function watchtower() {
  const p = [];
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    stone(p, x, .2, z, .65, .4, .65, C.stone);
    beam(p, [x, .4, z], [x * .84, 7, z * .84], .16, C.wood, 16, .13);
    for (const y of [1, 3, 5, 6.6]) ring(p, x * (1 - y * .022), y, z * (1 - y * .022), .16, .025, C.dark, false, 16);
  }
  for (const s of [-1, 1]) for (const [lo, hi] of [[.6, 2.7], [2.7, 4.8], [4.8, 6.7]]) {
    for (const dir of [-1, 1]) {
      beam(p, [dir * .92, lo, s * .92], [-dir * .86, hi, s * .86], .065, C.wood);
      beam(p, [s * .92, lo, dir * .92], [s * .86, hi, -dir * .86], .065, C.wood);
    }
  }
  // Two genuine stair flights within the braced shaft, joined by a landing.
  for (let i = 0; i < 22; i++) {
    const flight = i < 11 ? 0 : 1, n = i % 11;
    box(p, flight ? .46 : -.46, .3 + i * .3, (flight ? -1 : 1) * (-.85 + n * .17), .78, .12, .23, C.wood);
  }
  box(p, 0, 3.45, .9, 1.75, .15, .4, C.wood);
  box(p, 0, 6.88, 0, 4, .24, 4, C.wood);
  for (const s of [-1, 1]) {
    for (const t of [-1, 1]) {
      beam(p, [t * .85, 5.4, s * .85], [t * 1.85, 6.8, s * 1.85], .09, C.wood);
      beam(p, [t * 1.4, 7, s * 1.4], [t * 1.4, 9.5, s * 1.4], .085, C.wood);
    }
    for (let i = 0; i < 9; i++) {
      const a = -1.7 + i * .425;
      beam(p, [a, 7, s * 1.85], [a, 7.95, s * 1.85], .035, C.dark, 8);
      beam(p, [s * 1.85, 7, a], [s * 1.85, 7.95, a], .035, C.dark, 8);
    }
    beam(p, [-1.9, 8, s * 1.85], [1.9, 8, s * 1.85], .055, C.wood);
    beam(p, [s * 1.85, 8, -1.9], [s * 1.85, 8, 1.9], .055, C.wood);
    // Half-height cabin sides leave actual observation openings.
    for (let i = 0; i < 9; i++) {
      box(p, -1.2 + i * .3, 8.17, s * 1.4, .28, .65, .11, C.wood);
      box(p, s * 1.4, 8.17, -1.2 + i * .3, .11, .65, .28, C.wood);
    }
    beam(p, [-1.4, 9.3, s * 1.4], [1.4, 9.3, s * 1.4], .07, C.wood);
    beam(p, [s * 1.4, 9.3, -1.4], [s * 1.4, 9.3, 1.4], .07, C.wood);
  }
  // Shallow pitched roof made of overlapping curved clay channels. Each tile
  // changes the roof silhouette; the open undersides are not hidden ballast.
  for (const side of [-1, 1]) for (let col = 0; col < 14; col++) for (let row = 0; row < 5; row++) {
    const x = -1.87 + col * .288, z = side * (.21 + row * .39), y = 10.12 - Math.abs(z) * .28;
    const tile = new THREE.CylinderGeometry(.16, .16, .46, 8, 1, true, 0, Math.PI);
    tile.rotateZ(Math.PI / 2); tile.rotateY(Math.PI / 2); tile.rotateX(side * .27);
    tile.translate(x, y, z); put(p, tile, row % 2 ? 0x6d5947 : 0x77614a, 2);
  }
  beam(p, [-2, 10.14, 0], [2, 10.14, 0], .11, C.dark, 16);
  return assemble(p);
}

export const SERVICE_MODELS = Object.freeze({ power, water, police: () => station(false),
  fire: () => station(true), park, wall, watchtower });
