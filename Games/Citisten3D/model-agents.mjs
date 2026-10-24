import * as THREE from './vendor/three.module.js';
import { assemble } from './model-geometry.mjs';

// Original procedural designs, metres, feet/tyres at Y=0, front at local -Z.
// These are static meshes, not anatomy scans or a rig. All parts use paint tile 3.
const Y = new THREE.Vector3(0, 1, 0);
const V = a => new THREE.Vector3(...a);
const TAU = Math.PI * 2;
const palette = { skin: 0xc89b76, dead: 0x899575, jacket: 0x476884, denim: 0x343f50,
  leather: 0x3b302a, sole: 0x22282b, hair: 0x392a24, metal: 0xb5b5a9, glass: 0x334b58 };

function add(parts, geometry, color) {
  // Extrusions use world-space UVs; sphere poles can exceed [0,1] by half a texel.
  // Keep those coordinates inside the neutral atlas tile before assembly.
  const uv = geometry.attributes.uv;
  let minU = 0, maxU = 1, minV = 0, maxV = 1;
  for (let i = 0; i < uv.count; i++) {
    minU = Math.min(minU, uv.getX(i)); maxU = Math.max(maxU, uv.getX(i));
    minV = Math.min(minV, uv.getY(i)); maxV = Math.max(maxV, uv.getY(i));
  }
  if (minU < 0 || maxU > 1 || minV < 0 || maxV > 1) {
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - minU) / (maxU - minU), (uv.getY(i) - minV) / (maxV - minV));
  }
  parts.push({ geometry, color, surface: 3 });
}
function ellipsoid(parts, at, size, color, segments = 24, rings = 14) {
  const g = new THREE.SphereGeometry(1, segments, rings);
  g.scale(...size).translate(...at);
  add(parts, g, color);
}
function tube(parts, points, radius, color, segments = 16, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(V));
  add(parts, new THREE.TubeGeometry(curve, segments, radius, radial, false), color);
}
function block(parts, at, size, color) {
  add(parts, new THREE.BoxGeometry(...size).translate(...at), color);
}

// Swept elliptical sections [height, half-width, half-depth, centre-X, centre-Z].
// Each sampled ring follows the curved profile, rather than subdividing flat boxes.
function loft(sections, radial = 40, rows = 24, ripple = 0) {
  const centre = new THREE.CatmullRomCurve3(sections.map(s => new THREE.Vector3(s[3] || 0, s[0], s[4] || 0)));
  const radii = new THREE.CatmullRomCurve3(sections.map(s => new THREE.Vector3(s[1], s[2], 0)));
  const p = [], uv = [], indices = [];
  for (let j = 0; j <= rows; j++) {
    const t = j / rows, c = centre.getPoint(t), r = radii.getPoint(t);
    for (let i = 0; i <= radial; i++) {
      const a = i / radial * TAU;
      const fold = 1 + ripple * Math.sin(t * Math.PI) * Math.sin(a * 5 + t * 17);
      p.push(c.x + r.x * Math.cos(a) * fold, c.y, c.z + r.y * Math.sin(a) * fold);
      uv.push(i / radial, t);
      if (j < rows && i < radial) {
        const k = j * (radial + 1) + i, n = k + radial + 1;
        indices.push(k, n, k + 1, k + 1, n, n + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  // Smooth the UV seam without sharing texture coordinates across it.
  const normal = g.attributes.normal;
  for (let j = 0; j <= rows; j++) {
    const a = j * (radial + 1), b = a + radial;
    const n = new THREE.Vector3().fromBufferAttribute(normal, a)
      .add(new THREE.Vector3().fromBufferAttribute(normal, b)).normalize();
    normal.setXYZ(a, n.x, n.y, n.z); normal.setXYZ(b, n.x, n.y, n.z);
  }
  return g;
}
function limb(parts, start, end, sections, color, radial = 36, rows = 22, ripple = .025) {
  const a = V(start), direction = V(end).sub(a), length = direction.length();
  const g = loft(sections.map(s => [s[0] * length, ...s.slice(1)]), radial, rows, ripple);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, direction.normalize()));
  g.translate(...start);
  add(parts, g, color);
}
function transformParts(parts, start, origin, direction) {
  const q = new THREE.Quaternion().setFromUnitVectors(Y, V(direction).normalize());
  for (let i = start; i < parts.length; i++) parts[i].geometry.applyQuaternion(q).translate(...origin);
}

function hand(parts, wrist, direction, skin, zombie, side) {
  const first = parts.length;
  add(parts, loft([[0, .029, .022], [.035, .049, .027], [.082, .047, .024], [.105, .037, .018]], 20, 10), skin);
  // Four separated tapered fingers with bent tips and raised knuckle contours.
  for (let f = 0; f < 4; f++) {
    const x = (f - 1.5) * .024, length = [.074, .092, .086, .065][f];
    const splay = zombie ? (f - 1.5) * .012 : (f - 1.5) * .003;
    const bend = zombie ? -.035 : -.016;
    const g = loft([[0, .012, .013], [length * .3, .0125, .013, splay * .25, -.003],
      [length * .58, .011, .011, splay * .6, bend * .4],
      [length * .85, .009, .01, splay, bend], [length, .003, .004, splay, bend * 1.15]], 12, 8);
    g.translate(x, .088, 0); add(parts, g, skin);
    ellipsoid(parts, [x + splay, .088 + length * .83, bend - .008], [.007, .013, .0025], zombie ? 0x727057 : 0xe3c4ac, 10, 6);
  }
  limb(parts, [side * .036, .035, 0], [side * .078, .092, -.019],
    [[0, .017, .017], [.45, .016, .016], [.8, .012, .013], [1, .004, .005]], skin, 14, 10, 0);
  transformParts(parts, first, wrist, direction);
}

function shoe(parts, x, z, zombie) {
  const leather = zombie ? 0x474239 : palette.leather;
  // Open sole/upper share their rim: no complete shoe hidden inside another shoe.
  const sole = loft([[0, .075, .135, 0, -.027], [.018, .091, .158, 0, -.038],
    [.045, .095, .163, 0, -.039], [.06, .091, .158, 0, -.038]], 28, 4);
  sole.translate(x, 0, z); add(parts, sole, palette.sole);
  const upper = loft([[.06, .091, .158, 0, -.038], [.092, .088, .149, 0, -.042],
    [.13, .077, .123, 0, -.027], [.17, .065, .077, 0, .018], [.205, .058, .064, 0, .026]], 28, 10);
  upper.translate(x, 0, z); add(parts, upper, leather);
  tube(parts, [[x - .072, .093, z - .115], [x, .125, z - .141], [x + .072, .093, z - .115]], .003, 0x988773, 16, 6);
  for (let i = 0; i < 4; i++) {
    const y = .135 + i * .012, zz = z - .07 + i * .023;
    tube(parts, [[x - .037, y, zz], [x, y + .009, zz - .006], [x + .037, y, zz]], .0035, 0xc1b9a1, 8, 6);
  }
}

function head(parts, centre, zombie) {
  const first = parts.length, skin = zombie ? palette.dead : palette.skin;
  // The scalp replaces the top of the head; it is not a duplicate full sphere.
  const split = .92;
  const face = new THREE.SphereGeometry(1, 40, 24, 0, TAU, split, Math.PI - split);
  const pos = face.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i), x = pos.getX(i), z = pos.getZ(i);
    const jaw = y < -.2 ? 1 - (-y - .2) * .28 : 1;
    // Cheek planes and tapered jaw; the bridge/lips are separate visible relief.
    const cheek = z < 0 ? 1 + .06 * Math.exp(-(((y + .13) / .3) ** 2)) : 1;
    pos.setXYZ(i, x * .139 * jaw, y * .205, z * .132 * cheek);
  }
  face.computeVertexNormals(); add(parts, face, skin);
  const scalp = new THREE.SphereGeometry(1, 40, 12, 0, TAU, 0, split);
  const hp = scalp.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const a = Math.atan2(z, x), blend = Math.max(0, (y - Math.cos(split)) / (1 - Math.cos(split)));
    const comb = 1 + .06 * Math.sin(a * (zombie ? 9 : 7) + y * 8) * blend;
    hp.setXYZ(i, x * .139 * comb, y * .205 + .018 * blend, z * .132 * comb);
  }
  scalp.computeVertexNormals(); add(parts, scalp, zombie ? 0x4b4b36 : palette.hair);
  for (const side of [-1, 1]) {
    ellipsoid(parts, [side * .137, -.008, .005], [.025, .045, .022], skin, 20, 14);
    ellipsoid(parts, [side * .151, -.009, -.011], [.011, .027, .008], zombie ? 0x626a50 : 0xa8775c, 16, 10);
    // Small eyeballs sit forward of the socket plane, with curved upper/lower lids.
    ellipsoid(parts, [side * .053, .022, -.121], [.028, .014, .014], zombie ? 0xd7cda2 : 0xe8ded0, 20, 12);
    ellipsoid(parts, [side * .053, .022, -.134], [.010, .010, .003], zombie ? 0x8c6d32 : 0x4b625c, 16, 10);
    ellipsoid(parts, [side * .053, .022, -.137], [.004, .006, .0015], 0x202525, 12, 8);
    tube(parts, [[side * .026, .022, -.123], [side * .052, .039, -.13], [side * .081, .026, -.113]], .005, skin, 12, 8);
    tube(parts, [[side * .026, .021, -.123], [side * .052, .008, -.131], [side * .081, .026, -.113]], .0035, skin, 12, 6);
    tube(parts, [[side * .024, .062, -.121], [side * .052, zombie ? .05 : .064, -.125], [side * .089, .058, -.107]], .007, zombie ? 0x4b4b36 : palette.hair, 12, 8);
    // Separate sideburn locks end below the scalp rim.
    ellipsoid(parts, [side * .124, .067, -.018], [.016, .052, .034], zombie ? 0x4b4b36 : palette.hair, 16, 10);
  }
  ellipsoid(parts, [0, .005, -.139], [.021, .049, .025], skin, 24, 16);
  ellipsoid(parts, [0, -.027, -.164], [.024, .019, .019], skin, 20, 12);
  for (const side of [-1, 1]) {
    ellipsoid(parts, [side * .019, -.034, -.15], [.015, .011, .016], skin, 16, 10);
    ellipsoid(parts, [side * .016, -.04, -.163], [.006, .003, .004], 0x664d3d, 12, 8);
  }
  if (zombie) {
    ellipsoid(parts, [0, -.084, -.119], [.047, .026, .015], 0x483e32, 24, 12);
    for (let i = 0; i < 5; i++) block(parts, [(i - 2) * .014, -.073, -.134], [.010, .014, .007], 0xc9c1a2);
    tube(parts, [[-.044, -.088, -.121], [0, -.111, -.123], [.044, -.087, -.121]], .006, 0x777758, 16, 8);
    tube(parts, [[.075, -.04, -.115], [.092, -.063, -.102], [.076, -.082, -.106]], .006, 0x765147, 12, 6);
  } else {
    tube(parts, [[-.037, -.077, -.119], [0, -.074, -.132], [.037, -.077, -.119]], .005, 0x93634f, 16, 8);
    tube(parts, [[-.035, -.082, -.119], [0, -.088, -.131], [.035, -.082, -.119]], .006, 0xb37e66, 16, 8);
  }
  // A mild head tilt, stronger on the zombie, does not alter the world's pose API.
  for (let i = first; i < parts.length; i++) parts[i].geometry.rotateX(zombie ? -.16 : 0).translate(...centre);
}

function person(zombie) {
  const parts = [], skin = zombie ? palette.dead : palette.skin;
  const coat = zombie ? 0x626b50 : palette.jacket, trousers = zombie ? 0x514c42 : palette.denim;
  const hip = zombie ? .82 : .96, shoulder = zombie ? 1.28 : 1.49;
  for (const side of [-1, 1]) {
    const x = side * .115, footZ = zombie ? (side === -1 ? -.10 : .11) : 0;
    shoe(parts, x, footZ, zombie);
    add(parts, loft([[.185, .059, .065, x, footZ + .025], [.24, .074, .076, x, footZ + .018],
      [.42, .074, .081, x + side * .006, zombie ? -.075 : .012],
      [.54, .083, .092, x, zombie ? -.095 : -.012],
      [.72, .10, .109, x, zombie ? .015 : .012], [hip, .108, .117, x, .015]], 32, 24, zombie ? .065 : .035), trousers);
    // Raised side seam follows the leg, and visible knee folds are curved piping.
    tube(parts, [[x + side * .066, .23, footZ + .025], [x + side * .08, .48, zombie ? -.08 : 0],
      [x + side * .10, hip - .04, .012]], .0025, zombie ? 0x77715e : 0x596375, 24, 6);
    tube(parts, [[x - .054, .51, zombie ? -.17 : -.08], [x, .49, zombie ? -.18 : -.10],
      [x + .057, .515, zombie ? -.17 : -.08]], .004, zombie ? 0x67614e : 0x465367, 12, 6);
  }
  const torsoZ = zombie ? -.10 : 0;
  add(parts, loft([[hip - .05, .215, .126, 0, .014], [hip + .05, .218, .13, 0, -.012],
    [hip + .18, .20, .14, 0, zombie ? -.04 : 0], [shoulder - .13, .248, .151, 0, torsoZ],
    [shoulder - .015, .23, .128, 0, torsoZ - .022], [shoulder + .035, .104, .083, 0, torsoZ - .025]], 40, 24, zombie ? .045 : .018), coat);
  // Neck is exposed between the jacket collar and jaw, never a hidden full torso.
  limb(parts, [0, shoulder + .005, torsoZ - .025], [0, shoulder + .14, torsoZ - .05],
    [[0, .07, .065], [.5, .065, .06], [1, .071, .064]], skin, 28, 8, 0);
  const front = torsoZ - .15;
  tube(parts, [[-.085, shoulder + .025, torsoZ - .07], [-.10, shoulder - .045, front], [0, shoulder - .15, front - .008],
    [.10, shoulder - .045, front], [.085, shoulder + .025, torsoZ - .07]], .012, zombie ? 0x838366 : 0x9da4a1, 28, 8);
  tube(parts, [[0, hip, -.12], [0, hip + .17, -.146], [0, shoulder - .15, front - .009]], .005, 0x303a3c, 24, 8);
  for (let i = 0; i < 4; i++) ellipsoid(parts, [.015, hip + .08 + i * .085, -.15 + (torsoZ * i / 4)], [.009, .009, .004], palette.metal, 12, 8);
  for (const side of [-1, 1]) {
    tube(parts, [[side * .07, hip + .10, -.129], [side * .12, hip + .17, -.133], [side * .17, hip + .20, -.12]], .006, zombie ? 0x464e3d : 0x304d66, 16, 8);
    const start = [side * .221, shoulder - .065, torsoZ - .005];
    const wrist = zombie ? [side * .37, 1.12 + side * .045, -.69] : [side * .31, .94, -.015];
    if (zombie) {
      const elbow = [side * .34, 1.16, -.40];
      limb(parts, start, elbow, [[0, .099, .095], [.24, .106, .094], [.65, .084, .083], [1, .076, .071]], coat, 28, 16, .055);
      limb(parts, elbow, wrist, [[0, .072, .067], [.3, .070, .060], [.7, .048, .045], [1, .031, .026]], skin, 28, 16, .018);
      tube(parts, [[side * .35, 1.15, -.49], [side * .37, 1.16, -.55], [side * .38, 1.14, -.59]], .007, 0x765747, 12, 8);
    } else {
      limb(parts, start, wrist, [[0, .094, .09], [.18, .101, .092], [.45, .078, .081, side * .014, .007],
        [.6, .076, .075, side * .012, -.006], [.85, .059, .058], [1, .045, .041]], coat, 32, 24, .028);
      limb(parts, [wrist[0], wrist[1] + .035, wrist[2]], wrist,
        [[0, .047, .043], [.4, .049, .044], [1, .044, .040]], 0x2f4961, 28, 4, 0);
    }
    hand(parts, wrist, zombie ? [side * .12, -.13, -1] : [side * .08, -1, -.1], skin, zombie, side);
  }
  head(parts, zombie ? [0, 1.445, -.29] : [0, 1.677, -.026], zombie);
  const geometry = assemble(parts);
  // Maintain the previous kit's nominal heights independent of hairstyle/pose.
  geometry.computeBoundingBox();
  const base = geometry.boundingBox.min.y, height = geometry.boundingBox.max.y - base;
  geometry.translate(0, -base, 0).scale(1, (zombie ? 1.65 : 1.9) / height, 1);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function panel(parts, corners, color, bulge = 0, columns = 10, rows = 6) {
  const p = [], uv = [], index = [];
  const [a, b, c, d] = corners.map(V);
  const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    const u = i / columns, v = j / rows;
    const point = a.clone().lerp(b, u).lerp(d.clone().lerp(c, u), v)
      .addScaledVector(normal, bulge * Math.sin(u * Math.PI) * Math.sin(v * Math.PI));
    p.push(...point.toArray()); uv.push(u, v);
    if (j < rows && i < columns) {
      const k = j * (columns + 1) + i, n = k + columns + 1;
      index.push(k, k + 1, n, k + 1, n + 1, n);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index); g.computeVertexNormals(); add(parts, g, color);
}

function car() {
  const parts = [], paint = 0xb97b39, chrome = 0xb4b8b6, rubber = 0x25292c;
  // Side silhouette has real wheel-well openings. The bevel rounds all body edges.
  const shape = new THREE.Shape();
  shape.moveTo(-1.64, .38);
  shape.quadraticCurveTo(-1.72, .40, -1.71, .61);
  shape.quadraticCurveTo(-1.68, .79, -1.43, .82);
  shape.lineTo(-.7, .88); shape.lineTo(.93, .87);
  shape.quadraticCurveTo(1.64, .85, 1.69, .68);
  shape.quadraticCurveTo(1.73, .46, 1.62, .38);
  const angle = Math.asin(.08 / .35), reach = Math.cos(angle) * .35;
  for (const z of [1.05, -1.04]) {
    shape.lineTo(z + reach, .38);
    shape.absarc(z, .30, .35, angle, Math.PI - angle, false);
  }
  shape.closePath();
  const body = new THREE.ExtrudeGeometry(shape, { depth: 1.30, bevelEnabled: true,
    bevelThickness: .07, bevelSize: .045, bevelSegments: 3, curveSegments: 8, steps: 1 });
  body.translate(0, 0, -.65).rotateY(-Math.PI / 2); add(parts, body, paint);
  // Five adjoining curved cabin panels: windows are the surface, not overlays.
  const fl = [-.65, .88, -.72], fr = [.65, .88, -.72];
  const rl = [-.65, .88, .94], rr = [.65, .88, .94];
  const tl = [-.54, 1.35, -.31], tr = [.54, 1.35, -.31];
  const bl = [-.54, 1.35, .52], br = [.54, 1.35, .52];
  panel(parts, [fl, tl, tr, fr], palette.glass, .025);
  panel(parts, [rr, br, bl, rl], palette.glass, .018);
  panel(parts, [tl, bl, br, tr], paint, .055);
  panel(parts, [fl, rl, bl, tl], palette.glass, .018);
  panel(parts, [fr, tr, br, rr], palette.glass, .018);
  for (const side of [-1, 1]) {
    const x = side * .65, topX = side * .54;
    tube(parts, [[x, .89, -.72], [side * .60, 1.12, -.51], [topX, 1.35, -.31],
      [topX, 1.35, .52], [side * .60, 1.12, .73], [x, .89, .94]], .022, paint, 16, 6);
    tube(parts, [[side * .66, .89, .13], [side * .60, 1.12, .13], [side * .54, 1.36, .13]], .022, paint, 6, 6);
    tube(parts, [[x, .89, -.73], [side * .67, .9, .1], [x, .89, .95]], .009, chrome, 10, 4);
    // Door shut lines, sill trim and separate door handles.
    for (const z of [-.67, .15, .88]) tube(parts, [[side * .723, .79, z], [side * .725, .62, z], [side * .718, .42, z + .025]], .0035, 0x6b4828, 6, 4);
    tube(parts, [[side * .724, .415, -.65], [side * .729, .414, .1], [side * .724, .415, .7]], .009, chrome, 10, 4);
    for (const z of [-.03, .66]) ellipsoid(parts, [side * .731, .78, z], [.015, .015, .07], chrome, 10, 6);
    limb(parts, [side * .65, .98, -.58], [side * .78, 1.00, -.60], [[0, .016, .018], [1, .014, .016]], rubber, 12, 2, 0);
    ellipsoid(parts, [side * .79, 1.02, -.61], [.06, .045, .082], paint, 12, 8);
    ellipsoid(parts, [side * .792, 1.022, -.548], [.047, .032, .008], chrome, 12, 6);
    for (const z of [-1.04, 1.05]) {
      const tyre = new THREE.TorusGeometry(.225, .075, 10, 32);
      tyre.rotateY(Math.PI / 2).scale(1.22, 1, 1).translate(side * .749, .30, z); add(parts, tyre, rubber);
      const hub = new THREE.CylinderGeometry(.153, .153, .15, 24, 1);
      hub.rotateZ(Math.PI / 2).translate(side * .749, .30, z); add(parts, hub, 0x41484d);
      const rim = new THREE.TorusGeometry(.146, .012, 6, 20);
      rim.rotateY(Math.PI / 2).translate(side * .829, .30, z); add(parts, rim, chrome);
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU;
        const spoke = new THREE.BoxGeometry(.012, .106, .026);
        spoke.translate(0, .086, 0).rotateX(a).translate(side * .833, .30, z); add(parts, spoke, chrome);
      }
      ellipsoid(parts, [side * .84, .30, z], [.009, .038, .038], chrome, 10, 6);
    }
  }
  for (const z of [-1.71, 1.69]) {
    tube(parts, [[-.60, .48, z], [0, .46, z + Math.sign(z) * .025], [.60, .48, z]], .031, rubber, 12, 6);
    for (const side of [-1, 1]) ellipsoid(parts, [side * .51, .69, z], [.155, .070, .028], z < 0 ? 0xe2ddbd : 0x9c3830, 16, 8);
  }
  for (let i = 0; i < 4; i++) tube(parts, [[-.29, .57 + i * .031, -1.735], [0, .57 + i * .031, -1.747], [.29, .57 + i * .031, -1.735]], .006, chrome, 6, 4);
  block(parts, [0, .48, -1.752], [.26, .09, .008], 0xd3d0ba);
  // Windshield wipers are curved rods just above the actual glass panel.
  for (const x of [-.28, .19]) tube(parts, [[x, .925, -.696], [x + .06, 1.02, -.636], [x + .19, 1.08, -.585]], .005, rubber, 6, 4);
  const geometry = assemble(parts);
  geometry.computeBoundingBox();
  geometry.translate(0, -geometry.boundingBox.min.y, 0);
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

export const AGENT_MODELS = {
  citizen: () => person(false),
  zombie: () => person(true),
  car,
};
