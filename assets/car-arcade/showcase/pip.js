import * as THREE from '../vendor/three.module.js';

// Original fictional study, authored here from primitives and sampled surfaces.
// Not an OEM model, a live-fleet replacement, or a legal-clearance claim.
export function createCar() {
  const car = new THREE.Group();
  car.name = 'pip-realistic';
  const wheels = [];
  car.userData = {name: 'Pip Borough / realistic study', wheels, front: '-Z', showcaseOnly: true};
  const paint = new THREE.MeshPhysicalMaterial({color: '#aa3027', metalness: .55, roughness: .21, clearcoat: 1, clearcoatRoughness: .13, side: THREE.DoubleSide});
  const ivory = new THREE.MeshPhysicalMaterial({color: '#e7dfc9', metalness: .45, roughness: .23, clearcoat: 1});
  const glass = new THREE.MeshPhysicalMaterial({color: '#8cabb5', metalness: 0, roughness: .10, transparent: true, opacity: .30, transmission: .35, thickness: .012, ior: 1.48, depthWrite: false, side: THREE.DoubleSide});
  const lens = new THREE.MeshPhysicalMaterial({color: '#f6fafb', roughness: .08, metalness: 0, transparent: true, opacity: .28, transmission: .6, thickness: .016, ior: 1.49});
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
  const surface = (nu, nv, sample) => {
    const positions = [], indices = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) positions.push(...sample(i / nu, j / nv));
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices); g.computeVertexNormals();
    return g;
  };
  const rounded = (x, y, z, w, h, d, r, material, parent = car, rx = 0) => {
    const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
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
    const g = new THREE.SphereGeometry(1, 32, 10);
    g.scale(a, b, c); g.translate(x, y, z); add(g, material);
  };
  // Closed loft: wheel cutouts lift the lower stamping, never mask tire centers.
  const bodyPoint = (u, v) => {
    const z = -1.69 + 3.38 * v, theta = u * Math.PI * 2;
    const end = Math.pow(Math.abs(z) / 1.69, 6);
    const width = .845 - .135 * end;
    const top = .935 - .115 * Math.pow(Math.max(0, -z) / 1.69, 2) - .045 * Math.pow(Math.max(0, z) / 1.69, 4);
    const dist = Math.min(Math.abs(z - 1.1), Math.abs(z + 1.1));
    const bottom = dist < .35 ? .29 + Math.sqrt(.35 * .35 - dist * dist) : .285;
    const c = Math.cos(theta), s = Math.sin(theta);
    return [width * Math.sign(c) * Math.pow(Math.abs(c), .38), (top + bottom) / 2 + (top - bottom) / 2 * Math.sign(s) * Math.pow(Math.abs(s), .45), z];
  };
  add(surface(32, 56, bodyPoint), paint);
  for (const v of [0, 1]) add(surface(32, 1, (u, t) => {
    const p = bodyPoint(u, v); return [p[0] * t, .56 + (p[1] - .56) * t, p[2]];
  }), paint);
  rounded(0, .24, .02, 1.22, .09, 2.8, .035, dark);
  ellipsoid(0, 1.413, .25, .706, .097, 1.015, ivory);
  // Each pane is a shallow curved double skin; interior remains genuinely hollow.
  const pane = (sample) => {
    for (const inset of [0, .006]) add(surface(12, 6, (u, v) => {
      const p = sample(u, v); p[0] *= 1 - inset; p[1] -= inset; return p;
    }), glass);
  };
  const wind = (u, v) => [(u * 2 - 1) * (.718 - .095 * v), .948 + .441 * v + .016 * Math.sin(u * Math.PI), -.795 + .265 * v - .037 * Math.sin(u * Math.PI)];
  const rear = (u, v) => [(u * 2 - 1) * (.727 - .099 * v), .953 + .423 * v + .013 * Math.sin(u * Math.PI), 1.361 - .244 * v + .025 * Math.sin(u * Math.PI)];
  pane(wind); pane(rear);
  for (const side of [-1, 1]) {
    for (const [a, b] of [[0, .64], [.70, 1]]) pane((u, v) => {
      const t = a + (b - a) * u;
      return [side * (.755 - .106 * v + .016 * Math.sin(t * Math.PI)), .955 + .438 * v, -.75 + 2.07 * t + v * (.244 - .435 * t)];
    });
    // Thick painted pillars blend into the belt and roof, with no exposed cage.
    tube([[side * .723, .94, -.795], [side * .706, 1.10, -.704], [side * .635, 1.399, -.527]], .043, paint);
    tube([[side * .736, .945, 1.37], [side * .716, 1.10, 1.27], [side * .642, 1.399, 1.111]], .057, paint);
    tube([[side * .764, .947, .63], [side * .713, 1.17, .59], [side * .66, 1.398, .55]], .038, paint);
    tube([[side * .718, .947, -.795], [side * .779, .943, .20], [side * .736, .947, 1.37]], .022, paint);
    tube([[side * .744, .916, -.72], [side * .834, .70, -.60], [side * .837, .39, -.57], [side * .84, .353, .46], [side * .832, .66, .57], [side * .758, .932, .62]], .003, dark, car, 40);
    rounded(side * .834, .818, .37, .026, .035, .15, .012, chrome);
    tube([[side * .729, 1.00, -.64], [side * .845, 1.018, -.61]], .018, dark, car, 4);
    ellipsoid(side * .861, 1.047, -.594, .098, .061, .085, paint);
    ellipsoid(side * .867, 1.048, -.522, .077, .044, .010, chrome);
    rounded(side * .34, .58, .01, .46, .15, .46, .065, upholstery);
    rounded(side * .34, .83, .24, .45, .50, .12, .053, upholstery, car, -.13);
    rounded(side * .34, 1.115, .29, .24, .16, .11, .045, upholstery);
    // Distinct reflector bowls, clear convex covers and warm indicators.
    ellipsoid(side * .527, .714, -1.662, .159, .145, .062, chrome);
    ellipsoid(side * .527, .714, -1.714, .142, .129, .025, lens);
    ellipsoid(side * .527, .714, -1.716, .027, .029, .018, ivory);
    rounded(side * .641, .477, -1.683, .15, .051, .028, .015, amber);
    rounded(side * .582, .713, 1.688, .139, .215, .047, .023, red);
    rounded(side * .582, .785, 1.713, .116, .04, .012, .006, amber);
  }
  rounded(0, .59, .86, 1.15, .16, .39, .065, upholstery);
  rounded(0, .835, 1.085, 1.13, .41, .12, .054, upholstery, car, -.10);
  rounded(0, .94, -.65, 1.33, .13, .21, .05, dark);
  const steering = new THREE.TorusGeometry(.137, .014, 8, 32);
  steering.rotateX(-.45); steering.translate(-.34, 1.00, -.40); add(steering, rubber);
  tube([[-.34, .88, -.45], [-.34, 1.0, -.4], [-.45, 1.0, -.4]], .012, dark);
  rounded(0, .448, -1.692, 1.38, .064, .061, .024, chrome);
  rounded(0, .448, 1.694, 1.39, .064, .061, .024, chrome);
  // Compact rectangular grille, painted center bridge, no emblem or oval surround.
  for (const side of [-1, 1]) {
    rounded(side * .175, .637, -1.693, .30, .127, .023, .01, dark);
    for (let j = 0; j < 3; j++) rounded(side * .175, .594 + j * .041, -1.710, .287, .013, .014, .006, chrome);
    tube([[side * .45, .848, -1.49], [side * .54, .896, -1.10], [side * .59, .926, -.83]], .0025, dark);
    tube([[side * .39, .977, -.787], [side * .12, .986, -.782]], .008, dark, car, 4);
  }
  tube([[.48, .23, 1.20], [.48, .22, 1.51], [.48, .23, 1.71]], .027, chrome, car, 12);
  const tireProfile = [[.206,-.102],[.245,-.104],[.278,-.084],[.29,-.047],[.29,.047],[.278,.084],[.245,.104],[.206,.102],[.202,.075],[.202,-.075],[.206,-.102]];
  for (const z of [-1.1, 1.1]) for (const side of [-1, 1]) {
    const wheel = new THREE.Group();
    wheel.name = `${z < 0 ? 'front' : 'rear'}-${side < 0 ? 'left' : 'right'}-wheel`;
    wheel.position.set(side * .749, .29, z); car.add(wheel); wheels.push(wheel);
    const tire = new THREE.LatheGeometry(tireProfile.map(([r, y]) => new THREE.Vector2(r, y)), 32);
    tire.rotateZ(Math.PI / 2); add(tire, rubber, wheel);
    for (const lane of [-.042, 0, .042]) {
      const tread = new THREE.TorusGeometry(.2902, .0024, 4, 32);
      tread.rotateY(Math.PI / 2); tread.translate(lane, 0, 0); add(tread, dark, wheel);
    }
    const disc = new THREE.CylinderGeometry(.166, .166, .016, 32);
    disc.rotateZ(Math.PI / 2); disc.translate(side * .06, 0, 0); add(disc, dark, wheel);
    const rim = new THREE.TorusGeometry(.193, .014, 8, 32);
    rim.rotateY(Math.PI / 2); rim.translate(side * .101, 0, 0); add(rim, chrome, wheel);
    const hub = new THREE.CylinderGeometry(.058, .058, .026, 32);
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
