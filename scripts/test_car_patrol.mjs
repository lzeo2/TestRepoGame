// Source geometry/ownership regression only. Stub canvas is NOT native text proof.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as T from '../assets/car-arcade/vendor/three.module.js';
import { CARS } from '../assets/car-arcade/fleet.js';
import { createCar, disposeCars } from '../assets/car-arcade/models.js';
import * as patrol from '../assets/car-arcade/patrol.js';

assert.deepEqual(Object.keys(patrol).sort(), ['createPatrolCar', 'disposePatrolCars']);
let canvases = 0;
globalThis.document = {createElement(tag) {
  assert.equal(tag, 'canvas'); canvases++;
  const canvas = {width:0, height:0, calls:[]};
  const ctx = {clearRect(...args) {canvas.calls.push(['clear', ...args]);},
    fillText(...args) {canvas.calls.push(['text', ...args, this.fillStyle, this.font, this.textAlign, this.textBaseline]);}};
  canvas.getContext = kind => {assert.equal(kind, '2d'); return ctx;};
  return canvas;
}};
const resources = car => {
  const set = new Set();
  car.traverse(o => {if (o.isMesh) {set.add(o.geometry); set.add(o.material); if (o.material.map) set.add(o.material.map);}});
  return set;
};
function fingerprint(car) {
  const hash = createHash('sha256');
  car.traverse(o => {
    if (!o.isMesh) return;
    for (const a of [o.geometry.index, ...Object.values(o.geometry.attributes)]) if (a) hash.update(Buffer.from(a.array.buffer, a.array.byteOffset, a.array.byteLength));
    hash.update(JSON.stringify([o.name, o.position.toArray(), o.rotation.toArray(), o.material.color.toArray(), o.material.opacity, o.material.side]));
  });
  return hash.digest('hex');
}
const fleet = CARS.map(c => createCar(c.id)), before = fleet.map(fingerprint);
const shared = new Set(fleet.flatMap(c => [...resources(c)]));
const disposals = new Map();
function track(r) {
  if (disposals.has(r)) return;
  disposals.set(r, 0); r.addEventListener('dispose', () => disposals.set(r, disposals.get(r) + 1));
}
shared.forEach(track);
const base = fleet[CARS.findIndex(c => c.id === 'lantern')], baseBody = base.getObjectByName('body');
const near = (a, b, why) => assert(Math.abs(a - b) < 1e-6, `${why}: ${a} vs ${b}`);
const vector = (a, i) => new T.Vector3().fromBufferAttribute(a, i);
function ray(object, origin, direction) {
  object.updateMatrixWorld(true);
  const hit = new T.Raycaster(new T.Vector3(...origin), new T.Vector3(...direction)).intersectObject(object, false)[0];
  assert(hit, `missing physical hit ${object.name} ${origin}`); return hit;
}
function assertWhite(mesh, hit) {
  const c = mesh.geometry.attributes.color, white = new T.Color('#e7e8e5');
  for (const i of [hit.face.a, hit.face.b, hit.face.c]) {
    near(c.getX(i), white.r, 'white r'); near(c.getY(i), white.g, 'white g'); near(c.getZ(i), white.b, 'white b');
  }
}
function area(g) {
  let sum = 0;
  for (let i = 0; i < (g.index?.count ?? g.attributes.position.count); i += 3) {
    const pts = [0, 1, 2].map(j => vector(g.attributes.position, g.index ? g.index.getX(i + j) : i + j));
    sum += pts[1].sub(pts[0]).cross(pts[2].sub(pts[0])).length() / 2;
  }
  return sum;
}
let previousOwned = new Set();
for (let cycle = 0; cycle < 2; cycle++) {
  const a = patrol.createPatrolCar(), b = patrol.createPatrolCar();
  const own = new Set([...resources(a)].filter(r => !shared.has(r)));
  assert.equal(own.size, 6);
  own.forEach(r => {assert(!previousOwned.has(r)); track(r);});
  assert.equal(canvases, cycle + 1);
  assert.equal(a.userData.carId, 'lantern'); assert.equal(a.userData.policeId, 'wardline');
  for (const value of [a.userData, a.userData.dimensions, a.userData.wheels, a.userData.profile]) assert(Object.isFrozen(value));
  assert.equal(a.userData.profile.forward, '-Z'); assert.equal(a.userData.profile.wheelAxis, 'X');
  let triangles = 0, draws = 0;
  a.traverse(o => {
    if (!o.isMesh) return;
    draws++; const g = o.geometry; triangles += (g.index?.count ?? g.attributes.position.count) / 3;
    assert.equal(g.groups.length, 0); assert(!Array.isArray(o.material));
    for (const attr of Object.values(g.attributes)) for (const v of attr.array) assert(Number.isFinite(v));
    if (g.index) for (const v of g.index.array) assert(v >= 0 && v < g.attributes.position.count);
    if (g.attributes.uv) for (const v of g.attributes.uv.array) assert(v >= 0 && v <= 1);
    if (o.material.transparent && o.material.side === T.DoubleSide) assert(o.material.forceSinglePass);
    const twin = b.getObjectByName(o.name); assert.notEqual(o, twin);
    assert.equal(o.geometry, twin.geometry); assert.equal(o.material, twin.material);
  });
  assert.equal(triangles, a.userData.triangles); assert(triangles <= 8000);
  assert.equal(draws, a.userData.drawCalls); assert(draws <= 12);
  const bounds = new T.Box3().setFromObject(a), size = bounds.getSize(new T.Vector3());
  near(bounds.min.y, 0, 'ground');
  assert.deepEqual(a.userData.dimensions, {width:size.x, height:size.y, length:size.z});
  assert.equal(a.userData.wheels.length, 4); assert.equal(new Set(a.userData.wheels).size, 4);
  a.userData.wheels.forEach((w, i) => {
    assert(w.isMesh); near(new T.Box3().setFromObject(w).min.y, 0, 'wheel ground');
    assert.equal(w.geometry, base.userData.wheels[i].geometry);
    assert.equal(w.material, base.userData.wheels[i].material);
    assert.equal(w.position.z < 0, i < 2);
    w.rotation.x = .3 + i; assert.equal(b.userData.wheels[i].rotation.x, 0); w.rotation.x = 0;
  });
  const body = a.getObjectByName('body');
  assert.notEqual(body.geometry, baseBody.geometry); assert.notEqual(body.material, baseBody.material);
  near(area(body.geometry), area(baseBody.geometry), 'unchanged paint surface area');
  assert.equal(body.material.color.getHex(), 0xffffff); assert(body.material.vertexColors);
  assert.equal(a.getObjectByName('glazing').geometry, base.getObjectByName('glazing').geometry);
  const roof = ray(body, [0, 3, .09], [0, -1, 0]); assertWhite(body, roof);
  const hood = ray(body, [0, 2, -1.8], [0, -1, 0]);
  near(body.geometry.attributes.color.getX(hood.face.a), new T.Color('#171b22').r, 'dark hood');
  const textMeshes = ['police-left', 'police-right'].map(name => a.getObjectByName(name));
  const maps = new Set([...resources(a)].filter(r => r.isTexture)); assert.equal(maps.size, 1);
  const map = [...maps][0]; assert(map.isCanvasTexture); assert.equal(map.colorSpace, T.SRGBColorSpace);
  assert.equal(map.image.width, 256); assert.equal(map.image.height, 64);
  assert.equal(map.image.width * map.image.height * 4, 65536);
  assert.deepEqual(map.image.calls, [['clear', 0, 0, 256, 64], ['text', 'POLICE', 128, 34, 244, '#171b22', 'bold 48px sans-serif', 'center', 'middle']]);
  for (const [i, text] of textMeshes.entries()) {
    const side = i ? 1 : -1, g = text.geometry;
    assert.equal(text.material.map, map); assert.equal(text.material.side, T.FrontSide);
    text.updateMatrixWorld(true);
    const normal = vector(g.attributes.normal, 0).transformDirection(text.matrixWorld);
    near(normal.x, side, 'outward text'); near(normal.y, 0, 'level text');
    const pts = Array.from({length:g.attributes.position.count}, (_, j) => vector(g.attributes.position, j).applyMatrix4(text.matrixWorld));
    // Plane UV top row is v=1, and increasing U runs screen-right from outside.
    near(g.attributes.uv.getY(0), 1, 'UV top'); assert(pts[0].y > pts[2].y);
    assert(side * (pts[1].z - pts[0].z) < 0);
    for (const p of pts) {
      const hit = ray(body, [side * 2, p.y, p.z], [-side, 0, 0]);
      near(side * (p.x - hit.point.x), .002, 'letter surface offset'); assertWhite(body, hit);
    }
  }
  const equipment = a.getObjectByName('patrol-equipment'), ep = equipment.geometry.attributes.position;
  const boxes = [];
  for (let i = 0; i < ep.count; i += 24) boxes.push(new T.Box3().setFromPoints(Array.from({length:24}, (_, j) => vector(ep, i + j))));
  assert.equal(boxes.length, 10);
  for (const foot of boxes.slice(0, 2)) for (const x of [foot.min.x, foot.max.x]) for (const z of [foot.min.z, foot.max.z]) {
    const hit = ray(body, [x, 3, z], [0, -1, 0]); near(foot.min.y, hit.point.y, 'roof contact');
    near(foot.max.y, boxes[2].min.y, 'foot to bar');
  }
  for (const i of [3, 4]) {
    near(boxes[i].min.y, boxes[2].max.y, 'lens support');
    const color = new T.Color(i === 3 ? '#d32632' : '#245fe0');
    const c = equipment.geometry.attributes.color;
    for (let j = i * 24; j < (i + 1) * 24; j++) {
      near(c.getX(j), color.r, 'static lens red'); near(c.getY(j), color.g, 'static lens green'); near(c.getZ(j), color.b, 'static lens blue');
    }
  }
  for (const i of [5, 7]) {
    const arm = boxes[i], center = arm.getCenter(new T.Vector3());
    const bumper = ray(base.getObjectByName('trim-interior'), [center.x, center.y, -3], [0, 0, 1]);
    assert(arm.min.z < bumper.point.z && arm.max.z > bumper.point.z, 'pushbar attached to bumper');
    assert(arm.intersectsBox(boxes[i + 1])); assert(boxes[i + 1].intersectsBox(boxes[9]));
  }
  a.position.set(4, 0, 8); a.rotation.y = 1; assert.deepEqual(b.position.toArray(), [0, 0, 0]); assert.equal(b.rotation.y, 0);
  a.removeFromParent(); assert([...own, ...shared].every(r => disposals.get(r) === 0));
  assert.deepEqual(fleet.map(fingerprint), before);
  patrol.disposePatrolCars(); patrol.disposePatrolCars();
  assert([...own].every(r => disposals.get(r) === 1)); assert([...shared].every(r => disposals.get(r) === 0));
  assert.deepEqual(CARS.map(c => fingerprint(createCar(c.id))), before);
  previousOwned = own;
  console.log(`PASS cycle ${cycle + 1}: ${triangles} triangles / ${draws} draws / 4 independent grounded wheels / 1 map / 65536 base RGBA bytes (mips separate)`);
}
disposeCars(); assert([...shared].every(r => disposals.get(r) === 1));
const rebuilt = patrol.createPatrolCar(), rebuiltBase = createCar('lantern');
assert.equal(fingerprint(rebuiltBase), before[CARS.findIndex(c => c.id === 'lantern')]);
for (const r of resources(rebuilt)) {assert(!shared.has(r) && !previousOwned.has(r)); track(r);}
assert.notEqual(rebuilt.userData.wheels[0].geometry, base.userData.wheels[0].geometry);
patrol.disposePatrolCars(); disposeCars();
assert([...resources(rebuilt)].every(r => disposals.get(r) === 1));
console.log('PASS: physical paint/text/roof/pushbar, finite buffers/UVs, all 16 base fingerprints, cached ownership, once-only disposal and recreation. Native typography/rendering HELD.');
