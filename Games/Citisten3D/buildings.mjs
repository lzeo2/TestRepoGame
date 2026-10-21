import * as THREE from './vendor/three.module.js';

// Every part is an original box [x,y,z,width,height,depth,color]. Bases sit at Y=0.
const box = (x, y, z, w, h, d, color) => [x, y, z, w, h, d, color];
const tree = (x, z) => [box(x, 1.2, z, .5, 2.4, .5, 0x795843), box(x, 3.3, z, 2.5, 2.8, 2.5, 0x436238)];
export const KIT = {
  residential: [-2.5, 0, 2.5].flatMap(x => [box(x, 1.7, 0, 2.2, 3.4, 5.5, 0xd5bb92), box(x, 3.6, 0, 2.4, .5, 5.7, 0x854f3e), box(x, 1.1, -2.8, .7, 2.2, .15, 0x45494a)]),
  commercial: [box(0, 5.5, 0, 7, 11, 7, 0xa7b2b9), box(0, .9, -3.6, 6.3, 1.6, .2, 0x344a5a), box(0, 11.3, 0, 7.4, .6, 7.4, 0x58616a), box(0, 6, -3.55, 5.8, .6, .1, 0x435367)],
  industrial: [box(0, 2.5, 0, 8.7, 5, 7.8, 0xb2a58b), box(0, 5.2, 0, 9, .5, 8, 0x72777a), box(-2.8, 1.8, -4, 2.5, 3.6, .2, 0x484e51)],
  power: [box(0, 3, 0, 8, 6, 7, 0x8c9296), box(-2.4, 8, 1.6, 1.5, 10, 1.5, 0x6a7075), box(2.4, 7, 1.6, 1.5, 8, 1.5, 0x6a7075), box(0, 2, -3.6, 4, 1, .3, 0xd5ab43)],
  water: [box(-2, 4, -2, .5, 8, .5, 0x757f84), box(2, 4, -2, .5, 8, .5, 0x757f84), box(-2, 4, 2, .5, 8, .5, 0x757f84), box(2, 4, 2, .5, 8, .5, 0x757f84), box(0, 8.5, 0, 5.6, 3, 5.6, 0xa7c5ce)],
  police: [box(0, 2, 0, 7, 4, 7, 0xb9c1cc), box(0, 3.2, -3.6, 5, .8, .3, 0x334f82), box(0, 4.4, 0, 3, .8, 3, 0x334f82)],
  fire: [box(0, 2.5, 0, 8, 5, 7, 0xa34c3a), ...[-2, 2].map(x => box(x, 1.5, -3.6, 2.7, 3, .2, 0xd5c3a7)), box(3, 5, 2, 1.5, 5, 1.5, 0xb69d88)],
  park: [box(0, .12, 0, 8, .24, 8, 0x72934e), ...tree(-2, -2), ...tree(2, 1), box(-1, .6, 2.5, 2.2, .3, .8, 0x9a7756)],
  townhall: [box(0, 3.5, 0, 16, 7, 12, 0xd8c8a4), box(0, 8, 1, 4, 16, 4, 0xc4ae83), box(0, 16.5, 1, 4.8, 1, 4.8, 0x6d5845), box(0, 13, -1.1, 1.7, 1.7, .2, 0xf2ebd9), ...[-6, -2, 2, 6].map(x => box(x, 3, -6.5, .8, 6, .8, 0xe8d8b4)), box(0, .25, -7, 17, .5, 3, 0xb8ae99)],
  wall: [box(0, 1.8, 0, 10, 3.6, .8, 0x94918a), ...[-4, -2, 0, 2, 4].map(x => box(x, 3.9, 0, 1, .6, 1, 0x77766f))],
  watchtower: [box(0, 3.5, 0, 2, 7, 2, 0x8f775b), box(0, 7, 0, 4, .5, 4, 0xb29c78), box(0, 8.5, 0, 3, 2, 3, 0x665b49), box(0, 10, 0, 4, .5, 4, 0x554d41)],
  citizen: [box(0, 1.15, 0, .48, .65, .3, 0x48688c), box(0, 1.7, 0, .34, .4, .34, 0xcba984), ...[-.15, .15].map(x => box(x, .4, 0, .19, .8, .23, 0x3c4248)), ...[-.35, .35].map(x => box(x, 1.1, 0, .18, .65, .22, 0xcba984))],
  zombie: [box(0, 1, -.12, .6, .6, .5, 0x666853), box(0, 1.45, -.4, .4, .4, .4, 0x82906a), ...[-.18, .18].map(x => box(x, .35, .05, .23, .7, .25, 0x56504a)), ...[-.4, .4].map(x => box(x, 1.05, -.5, .18, .18, .8, 0x82906a))],
  car: [box(0, .65, 0, 1.7, .65, 3.5, 0xc6913c), box(0, 1.2, .1, 1.5, .65, 1.7, 0x556d7a), ...[-.9, .9].flatMap(x => [-1.1, 1.1].map(z => box(x, .35, z, .25, .6, .6, 0x292e33))), ...[-.55, .55].map(x => box(x, .7, -1.78, .35, .2, .1, 0xe7dfb9))],
};

function geometry(parts) {
  const positions = [], normals = [], colors = [], color = new THREE.Color();
  for (const [x, y, z, w, h, d, hex] of parts) {
    const g = new THREE.BoxGeometry(w, h, d).toNonIndexed();
    g.translate(x, y, z);
    color.setHex(hex);
    positions.push(...g.attributes.position.array);
    normals.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    g.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

export function createBuildingKit(scene, capacity = 10000) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 40000) throw new RangeError('Invalid capacity');
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const pools = new Map(), dummy = new THREE.Object3D();
  function pool(type) {
    if (!KIT[type]) throw new RangeError(`Unknown model: ${type}`);
    if (!pools.has(type)) {
      const mesh = new THREE.InstancedMesh(geometry(KIT[type]), material, capacity);
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      pools.set(type, { mesh, handles: [] });
    }
    return pools.get(type);
  }
  function transform(handle, { x = 0, y = 0, z = 0, rotation = 0, scale = 1 } = {}) {
    if (!handle || !handle.alive || pools.get(handle.type)?.handles[handle.index] !== handle) throw new Error('Invalid or removed model');
    if (![x, y, z, rotation, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid transform');
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rotation, 0);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    const { mesh } = pools.get(handle.type);
    mesh.setMatrixAt(handle.index, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }
  return {
    types: Object.keys(KIT), pools,
    spawn(type, pose = {}) {
      const p = pool(type);
      if (p.mesh.count >= capacity) throw new RangeError('Model pool full');
      const handle = { type, index: p.mesh.count++, alive: true };
      p.handles.push(handle);
      try { transform(handle, pose); } catch (error) { p.handles.pop(); p.mesh.count--; handle.alive = false; throw error; }
      return handle;
    },
    transform,
    remove(handle) {
      const p = pools.get(handle?.type);
      if (!handle?.alive || p?.handles[handle.index] !== handle) return false;
      const last = p.handles.pop();
      p.mesh.count--;
      if (last !== handle) {
        p.mesh.getMatrixAt(last.index, dummy.matrix);
        p.mesh.setMatrixAt(handle.index, dummy.matrix);
        last.index = handle.index;
        p.handles[last.index] = last;
      }
      handle.alive = false;
      p.mesh.instanceMatrix.needsUpdate = true;
      return true;
    },
    dispose() {
      for (const { mesh, handles } of pools.values()) {
        for (const handle of handles) handle.alive = false;
        scene.remove(mesh); mesh.geometry.dispose(); mesh.dispose();
      }
      material.dispose(); pools.clear();
    },
  };
}
