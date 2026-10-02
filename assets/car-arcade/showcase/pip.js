import * as THREE from '../vendor/three.module.js';

// Original fictional study, authored here from primitives and sampled surfaces.
// Not an OEM model, a live-fleet replacement, or a legal-clearance claim.
export function createCar() {
  const car = new THREE.Group();
  car.name = 'pip-realistic';
  const wheels = [];
  car.userData = {name: 'Pip Borough / realistic study', wheels, front: '-Z', showcaseOnly: true,
    cockpit: {eye: [-.34, 1.14, .16], target: [-.34, 1.12, -2]}};
  const paint = new THREE.MeshPhysicalMaterial({color: '#aa3027', metalness: .55, roughness: .21, clearcoat: 1, clearcoatRoughness: .13, side: THREE.DoubleSide});
  const ivory = new THREE.MeshPhysicalMaterial({color: '#e7dfc9', metalness: .45, roughness: .23, clearcoat: 1});
  const glass = new THREE.MeshPhysicalMaterial({name: 'window-glass', color: '#485963', metalness: 0, roughness: .16, transparent: true, opacity: .55, transmission: 0, depthWrite: false, side: THREE.DoubleSide});
  glass.forceSinglePass = true;
  const lens = new THREE.MeshPhysicalMaterial({name: 'lamp-lens', color: '#d7e1df', roughness: .14, metalness: 0, transparent: true, opacity: .28, transmission: 0, depthWrite: false});
  lens.forceSinglePass = true;
  const chrome = new THREE.MeshStandardMaterial({color: '#c0c5c7', metalness: .95, roughness: .22});
  const rubber = new THREE.MeshStandardMaterial({color: '#191b1d', roughness: .87});
  const dark = new THREE.MeshStandardMaterial({color: '#25282a', roughness: .57, metalness: .18});
  const upholstery = new THREE.MeshStandardMaterial({color: '#353230', roughness: .94});
  const red = new THREE.MeshPhysicalMaterial({color: '#a91814', roughness: .22, clearcoat: 1});
  const amber = new THREE.MeshPhysicalMaterial({color: '#d97c22', roughness: .23, clearcoat: 1});
  const buckets = new Map();
  const add = (geometry, material, parent = car) => {
    if (!buckets.has(parent)) buckets.set(parent, new Map());
    const batch = buckets.get(parent);
    if (!batch.has(material)) batch.set(material, []);
    batch.get(material).push(geometry);
  };
  const surface = (nu, nv, sample, omit = () => false) => {
    const positions = [], indices = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) positions.push(...sample(i / nu, j / nv));
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      if (omit(i, j)) continue;
      const a = j * (nu + 1) + i, b = a + nu + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices); g.computeVertexNormals();
    return g;
  };
  const rounded = (x, y, z, w, h, d, r, material, parent = car, rx = 0) => {
    const thin = Math.min(w, h, d) <= .02;
    const segments = thin ? 1 : Math.min(w, h, d) < .08 ? 2 : 3;
    const g = new THREE.BoxGeometry(w, h, d, segments, segments, segments);
    if (thin) { g.rotateX(rx); g.translate(x, y, z); add(g, material, parent); return; }
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(p, i);
      const c = new THREE.Vector3(THREE.MathUtils.clamp(v.x, -w / 2 + r, w / 2 - r), THREE.MathUtils.clamp(v.y, -h / 2 + r, h / 2 - r), THREE.MathUtils.clamp(v.z, -d / 2 + r, d / 2 - r));
      const normal = v.sub(c).normalize();
      n.setXYZ(i, normal.x, normal.y, normal.z);
      c.addScaledVector(normal, r); p.setXYZ(i, c.x, c.y, c.z);
    }
    g.rotateX(rx); g.translate(x, y, z); add(g, material, parent);
  };
  const tube = (points, radius, material, parent = car, segments = 16) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    add(new THREE.TubeGeometry(curve, segments, radius, 6, false), material, parent);
  };
  const ellipsoid = (x, y, z, a, b, c, material) => {
    const g = new THREE.SphereGeometry(1, 24, 10);
    g.scale(a, b, c); g.translate(x, y, z); add(g, material);
  };
  // Closed loft: wheel cutouts lift the lower stamping, never mask tire centers.
  const bodyPoint = (u, v) => {
    const station = -1.69 + 3.38 * v, theta = u * Math.PI * 2;
    const end = Math.pow(Math.abs(station) / 1.69, 6);
    // Retreat the end corners to wrap the front/rear stampings around the car.
    const z = station - Math.sign(station) * end * (.085 * Math.pow(Math.abs(Math.cos(theta)), .8) + .025 * Math.abs(Math.sin(theta)));
    const width = .845 - .135 * end;
    const top = .935 - .115 * Math.pow(Math.max(0, -z) / 1.69, 2) - .045 * Math.pow(Math.max(0, z) / 1.69, 4);
    const dist = Math.min(Math.abs(z - 1.1), Math.abs(z + 1.1));
    const bottom = dist < .35 ? .29 + Math.sqrt(.35 * .35 - dist * dist) : .285;
    const c = Math.cos(theta), s = Math.sin(theta);
    return [width * Math.sign(c) * Math.pow(Math.abs(c), .46), (top + bottom) / 2 + (top - bottom) / 2 * Math.sign(s) * Math.pow(Math.abs(s), .65), z];
  };
  // Leave the cabin open below the belt: no opaque hood plane through the seats.
  add(surface(32, 56, bodyPoint, (i, j) => i >= 5 && i < 11 && j >= 15 && j < 50), paint);
  for (const v of [0, 1]) add(surface(32, 1, (u, t) => {
    const p = bodyPoint(u, v); return [p[0] * t, .56 + (p[1] - .56) * t, THREE.MathUtils.lerp(v ? 1.665 : -1.665, p[2], t)];
  }), paint);
  rounded(0, .24, .02, 1.22, .09, 2.8, .035, dark);
  // Roof and greenhouse share their boundary equations, rather than tube frames.
  const roofPoint = (u, v) => [(2 * u - 1) * .65,
    1.41 + .018 * Math.sin(Math.PI * u) + .025 * Math.sin(Math.PI * v) + .045 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v),
    -.48 + 1.55 * v + (2 * v - 1) * .04 * Math.sin(Math.PI * u)];
  add(surface(20, 16, roofPoint), ivory);
  add(surface(20, 16, (u, v) => { const p = roofPoint(1 - u, v); p[1] -= .025; return p; }), upholstery);
  for (const edge of [0, 1, 2, 3]) add(surface(20, 1, (u, v) => {
    const [a, b] = edge === 0 ? [u, 0] : edge === 1 ? [1, u] : edge === 2 ? [1 - u, 1] : [0, 1 - u];
    const p = roofPoint(a, b); p[1] -= .025 * v; return p;
  }), ivory);
  const panel = (sample, a, b, c, d, material) => add(surface(b - a < .2 ? 2 : 12, d - c < .2 ? 2 : 6,
    (u, v) => sample(a + (b - a) * u, c + (d - c) * v)), material);
  const framed = (sample, openings) => {
    panel(sample, 0, 1, 0, .24, paint);
    panel(sample, 0, 1, .91, 1, paint);
    let left = 0;
    for (const [a, b] of openings) {
      panel(sample, left, a, .24, .91, paint);
      panel(sample, a, b, .24, .91, glass);
      left = b;
    }
    panel(sample, left, 1, .24, .91, paint);
  };
  const wind = (u, v) => [(2 * u - 1) * (.79 - .14 * v), .77 + .64 * v + .018 * Math.sin(Math.PI * u), -.86 + .38 * v - .04 * Math.sin(Math.PI * u)];
  const rear = (u, v) => [(2 * u - 1) * (.79 - .14 * v), .77 + .64 * v + .018 * Math.sin(Math.PI * u), 1.41 - .34 * v + .04 * Math.sin(Math.PI * u)];
  framed(wind, [[.075, .925]]); framed(rear, [[.11, .89]]);
  for (const side of [-1, 1]) {
    framed((u, v) => [side * (.79 - .14 * v + .012 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v)),
      .77 + .64 * v + .025 * Math.sin(Math.PI * u) * v,
      -.86 + 2.27 * u + v * (.38 - .72 * u)], [[.08, .63], [.69, .86]]);
    // Follow the actual triangulated loft, not an unconstrained hanging spline.
    const contour = [[.88, -.60], [.70, -.60], [.39, -.57], [.353, .46], [.66, .57], [.89, .57]];
    const seam = new THREE.CurvePath();
    const hullX = (y, z) => {
      const row = Math.min(55, Math.floor((z + 1.69) / 3.38 * 56));
      for (let r = Math.max(0, row - 2); r <= Math.min(55, row + 2); r++) for (let i = 0; i < 32; i++) {
        const a = bodyPoint(i / 32, r / 56), b = bodyPoint(i / 32, (r + 1) / 56);
        const c = bodyPoint((i + 1) / 32, r / 56), d = bodyPoint((i + 1) / 32, (r + 1) / 56);
        for (const [p, q, r] of [[a, b, c], [b, d, c]]) {
          if (p[0] < -1e-8 || q[0] < -1e-8 || r[0] < -1e-8) continue;
          const det = (q[1] - p[1]) * (r[2] - p[2]) - (r[1] - p[1]) * (q[2] - p[2]);
          const s = ((y - p[1]) * (r[2] - p[2]) - (z - p[2]) * (r[1] - p[1])) / det;
          const t = ((q[1] - p[1]) * (z - p[2]) - (q[2] - p[2]) * (y - p[1])) / det;
          if (s >= -1e-8 && t >= -1e-8 && s + t <= 1 + 1e-8) return p[0] + s * (q[0] - p[0]) + t * (r[0] - p[0]);
        }
      }
      throw new Error('Door contour outside body panel');
    };
    let previous;
    for (let j = 0; j < contour.length - 1; j++) for (let k = 0; k <= 12; k++) {
      const t = k / 12, y = THREE.MathUtils.lerp(contour[j][0], contour[j + 1][0], t), z = THREE.MathUtils.lerp(contour[j][1], contour[j + 1][1], t);
      const p = new THREE.Vector3(side * (hullX(y, z) + .001), y, z);
      if (previous && previous.distanceToSquared(p) > 1e-12) seam.add(new THREE.LineCurve3(previous, p));
      previous = p;
    }
    add(new THREE.TubeGeometry(seam, 64, .002, 4, false), dark);
    rounded(side * .834, .818, .37, .026, .035, .15, .012, chrome);
    tube([[side * .729, 1.00, -.64], [side * .845, 1.018, -.61]], .018, dark, car, 4);
    ellipsoid(side * .861, 1.047, -.594, .098, .061, .085, paint);
    ellipsoid(side * .867, 1.048, -.522, .077, .044, .010, chrome);
    rounded(side * .34, .49, .24, .48, .14, .53, .06, upholstery);
    rounded(side * .34, .77, .48, .44, .49, .14, .055, upholstery, car, -.16);
    rounded(side * .34, 1.06, .54, .25, .17, .12, .045, upholstery);
    for (const offset of [-.18, .18]) {
      rounded(side * .34 + offset, .55, .22, .085, .12, .44, .035, dark);
      rounded(side * .34 + offset, .77, .43, .085, .42, .14, .04, dark, car, -.16);
    }
    rounded(side * .716, .65, .05, .045, .43, 1.25, .02, upholstery);
    rounded(side * .67, .72, .12, .12, .07, .40, .025, dark);
    rounded(side * .657, .81, .27, .02, .026, .12, .01, chrome);
    // Dark recessed bowls, restrained reflector rings and clear convex covers.
    add(surface(24, 1, (u, v) => [side * .527 + (.163 - .017 * v) * Math.cos(2 * Math.PI * u),
      .714 + (.15 - .016 * v) * Math.sin(2 * Math.PI * u), -1.635 - .069 * v]), paint);
    add(surface(24, 5, (u, v) => [side * .527 + .146 * v * Math.cos(2 * Math.PI * u),
      .714 - .134 * v * Math.sin(2 * Math.PI * u), -1.704 + .037 * (1 - v * v)]), dark);
    const bezel = new THREE.TorusGeometry(.122, .008, 6, 32);
    bezel.scale(1.08, 1, 1); bezel.translate(side * .527, .714, -1.704); add(bezel, chrome);
    ellipsoid(side * .527, .714, -1.713, .135, .122, .022, lens);
    ellipsoid(side * .527, .714, -1.711, .038, .033, .013, ivory);
    rounded(side * .641, .477, -1.683, .15, .051, .028, .015, amber);
    rounded(side * .582, .713, 1.688, .139, .215, .047, .023, red);
    rounded(side * .582, .785, 1.713, .116, .04, .012, .006, amber);
  }
  rounded(0, .59, .86, 1.15, .16, .39, .065, upholstery);
  rounded(0, .835, 1.085, 1.13, .41, .12, .054, upholstery, car, -.10);
  rounded(0, .355, .20, 1.35, .06, 2.10, .025, rubber);
  rounded(0, .867, -.655, 1.34, .15, .32, .045, rubber);
  rounded(-.34, .969, -.602, .42, .15, .22, .04, dark);
  rounded(-.34, .963, -.485, .36, .105, .012, .005, rubber);
  // Gauge disks face the seated driver (+Z); needles are parked at zero.
  for (const x of [-.425, -.255]) {
    const dial = new THREE.CylinderGeometry(.045, .045, .006, 32);
    dial.rotateX(Math.PI / 2); dial.translate(x, .967, -.472); add(dial, dark);
    const ring = new THREE.TorusGeometry(.047, .003, 4, 24);
    ring.translate(x, .967, -.470); add(ring, chrome);
    for (let i = 0; i < 11; i++) {
      const a = (225 - 27 * i) * Math.PI / 180;
      tube([[x + .034 * Math.cos(a), .967 + .034 * Math.sin(a), -.465],
        [x + .040 * Math.cos(a), .967 + .040 * Math.sin(a), -.465]], .0015, ivory, car, 1);
    }
    tube([[x, .967, -.461], [x - .024, .943, -.461]], .002, red, car, 1);
  }
  for (const x of [-.57, .13, .55]) {
    rounded(x, .894, -.482, .12, .048, .018, .008, dark);
    for (let i = 0; i < 3; i++) rounded(x, .879 + i * .014, -.468, .10, .003, .008, .001, chrome);
  }
  rounded(0, .62, -.34, .20, .38, .19, .035, dark, car, -.12);
  rounded(0, .824, -.476, .17, .07, .016, .006, rubber);
  for (const x of [-.055, 0, .055]) {
    const knob = new THREE.CylinderGeometry(.015, .015, .02, 12);
    knob.rotateX(Math.PI / 2); knob.translate(x, .758, -.231); add(knob, rubber);
  }
  rounded(0, .435, .02, .19, .13, .48, .04, dark);
  tube([[0, .49, -.02], [0, .65, -.06]], .013, chrome, car, 3);
  ellipsoid(0, .659, -.065, .029, .034, .028, rubber);
  for (const x of [-.43, -.32, -.20]) rounded(x, .41, -.55, .055, .075, .026, .01, rubber, car, -.3);
  tube([[-.34, .85, -.58], [-.34, .932, -.30]], .024, dark, car, 3);
  const steering = new THREE.TorusGeometry(.137, .014, 8, 32);
  steering.rotateX(-.35); steering.translate(-.34, .943, -.295); add(steering, rubber);
  for (let i = 0; i < 3; i++) {
    const a = (30 + 120 * i) * Math.PI / 180;
    tube([[-.34, .943, -.295], [-.34 + .127 * Math.cos(a), .943 + .119 * Math.sin(a), -.295 - .044 * Math.sin(a)]], .011, dark, car, 2);
  }
  rounded(-.34, .943, -.277, .075, .063, .033, .014, rubber, car, -.35);
  rounded(0, .448, -1.692, 1.38, .064, .061, .024, chrome);
  rounded(0, .448, 1.694, 1.39, .064, .061, .024, chrome);
  // Compact rectangular grille, painted center bridge, no emblem or oval surround.
  for (const side of [-1, 1]) {
    rounded(side * .175, .637, -1.693, .30, .127, .023, .01, dark);
    for (let j = 0; j < 3; j++) rounded(side * .175, .594 + j * .041, -1.710, .287, .013, .014, .006, chrome);
    tube([[side * .39, .977, -.787], [side * .12, .986, -.782]], .008, dark, car, 4);
  }
  tube([[.48, .23, 1.20], [.48, .22, 1.51], [.48, .23, 1.71]], .027, chrome, car, 12);
  const tireProfile = [[.206,-.102],[.245,-.104],[.278,-.084],[.29,-.047],[.29,.047],[.278,.084],[.245,.104],[.206,.102],[.202,.075],[.202,-.075],[.206,-.102]];
  for (const z of [-1.1, 1.1]) for (const side of [-1, 1]) {
    const wheel = new THREE.Group();
    wheel.name = `${z < 0 ? 'front' : 'rear'}-${side < 0 ? 'left' : 'right'}-wheel`;
    wheel.position.set(side * .749, .29, z); car.add(wheel); wheels.push(wheel);
    const tire = new THREE.LatheGeometry(tireProfile.map(([r, y]) => new THREE.Vector2(r, y)), 24);
    tire.rotateZ(Math.PI / 2); add(tire, rubber, wheel);
    for (const lane of [-.042, .042]) {
      const tread = new THREE.TorusGeometry(.2902, .0024, 3, 24);
      tread.rotateY(Math.PI / 2); tread.translate(lane, 0, 0); add(tread, dark, wheel);
    }
    const disc = new THREE.CylinderGeometry(.166, .166, .016, 32);
    disc.rotateZ(Math.PI / 2); disc.translate(side * .06, 0, 0); add(disc, dark, wheel);
    const rim = new THREE.TorusGeometry(.193, .014, 6, 24);
    rim.rotateY(Math.PI / 2); rim.translate(side * .101, 0, 0); add(rim, chrome, wheel);
    const hub = new THREE.CylinderGeometry(.058, .058, .026, 24);
    hub.rotateZ(Math.PI / 2); hub.translate(side * .104, 0, 0); add(hub, chrome, wheel);
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4;
      tube([[side * .102, .04 * Math.cos(a), .04 * Math.sin(a)], [side * .104, .183 * Math.cos(a + .09), .183 * Math.sin(a + .09)]], .014, chrome, wheel, 2);
    }
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2;
      const lug = new THREE.CylinderGeometry(.009, .009, .012, 8);
      lug.rotateZ(Math.PI / 2); lug.translate(side * .123, .04 * Math.cos(a), .04 * Math.sin(a)); add(lug, chrome, wheel);
    }
  }
  // Batch only within this invocation. Unique-set disposal belongs to the viewer.
  for (const [parent, materials] of buckets) for (const [material, pieces] of materials) {
    const positions = [], normals = [];
    for (const piece of pieces) {
      const g = piece.index ? piece.toNonIndexed() : piece;
      positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
      if (g !== piece) g.dispose(); piece.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = parent === car ? 'stamped-body-and-detail' : 'wheel-component';
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  }
  return car;
}
