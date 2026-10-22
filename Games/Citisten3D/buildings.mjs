import * as THREE from './vendor/three.module.js';
import { assemble } from './model-geometry.mjs';
import { CITY_MODELS } from './model-city.mjs';
import { SERVICE_MODELS } from './model-services.mjs';
import { AGENT_MODELS } from './model-agents.mjs';
import { createFacadeMaterial } from './materials.mjs';

const DETAIL_MODELS = { ...CITY_MODELS, ...SERVICE_MODELS, ...AGENT_MODELS };
const mobile = type => ['car', 'citizen', 'zombie'].includes(type);

// Retained distant LOD: original boxes [x,y,z,width,height,depth,color], bases at Y=0.
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

function geometry(parts, type) {
  const pieces = [];
  for (const [x, y, z, w, h, d, color] of parts) {
    const facade = !mobile(type) && !['park', 'wall', 'watchtower', 'water'].includes(type) && h > 2 && w > 2 && d > 2;
    pieces.push({ geometry: new THREE.BoxGeometry(w, h, d).translate(x, y, z), color, surface: facade ? 0 : 3 });
    if (facade) for (let side = 0; side < 4; side++) {
      const width = side % 2 ? d : w, depth = side % 2 ? w : d;
      const columns = Math.max(1, Math.floor(width / 2)), rows = Math.max(1, Math.floor(h / 2.8));
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const pane = new THREE.PlaneGeometry(width / columns * .5, Math.min(1.2, h / rows * .55));
        pane.translate((col + .5) * width / columns - width / 2, (row + .55) * h / rows - h / 2, depth / 2 + .015);
        pane.rotateY(side * Math.PI / 2).translate(x, y, z);
        pieces.push({ geometry: pane, color: 0xb9cad1, surface: 1 });
      }
    }
  }
  return assemble(pieces);
}

export function createBuildingKit(scene, capacity = 10000) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 40000) throw new RangeError('Invalid capacity');
  const appearance = createFacadeMaterial(), material = appearance.material;
  const pools = new Map(), dummy = new THREE.Object3D(), hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const lastCamera = new THREE.Vector3(Infinity, Infinity, Infinity);
  let version = 0, revision = 0, renderedRevision = -1;
  function pool(type) {
    if (!Object.hasOwn(KIT, type)) throw new RangeError(`Unknown model: ${type}`);
    if (!pools.has(type)) {
      const mesh = new THREE.InstancedMesh(geometry(KIT[type], type), material, capacity);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      pools.set(type, { mesh, detail: null, handles: [] });
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
    handle.matrix = dummy.matrix.clone(); handle.pose = { x, y, z, rotation, scale };
    mesh.setMatrixAt(handle.index, dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
    revision++; if (!mobile(handle.type)) version++;
  }
  return {
    types: Object.keys(KIT), pools, material,
    get version() { return version; },
    update(camera, night = 0) {
      material.emissiveIntensity = .025 + night * 1.7;
      if (revision === renderedRevision && lastCamera.distanceToSquared(camera.position) < .25) return;
      // ponytail: 16 nearby high-detail instances/type; chunked LOD if dense close-up cities need more.
      for (const [type, p] of pools) {
        const radius = mobile(type) ? 35 : type === 'townhall' ? 450 : 120;
        const selected = p.handles.map(h => ({ h, distance: camera.position.distanceToSquared(h.pose) }))
          .filter(v => v.distance < radius * radius).sort((a, b) => a.distance - b.distance).slice(0, 16).map(v => v.h);
        if (selected.length && !p.detail) {
          p.detail = new THREE.InstancedMesh(DETAIL_MODELS[type](), material, Math.min(16, capacity));
          p.detail.castShadow = p.detail.receiveShadow = true; p.detail.frustumCulled = false;
          p.detail.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(p.detail);
        }
        const near = new Set(selected);
        for (const h of p.handles) p.mesh.setMatrixAt(h.index, near.has(h) ? hidden : h.matrix);
        p.mesh.instanceMatrix.needsUpdate = true;
        if (p.detail) {
          p.detail.count = selected.length;
          selected.forEach((h, i) => p.detail.setMatrixAt(i, h.matrix));
          p.detail.instanceMatrix.needsUpdate = true;
        }
      }
      lastCamera.copy(camera.position); renderedRevision = revision;
    },
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
        p.mesh.setMatrixAt(handle.index, last.matrix);
        last.index = handle.index;
        p.handles[last.index] = last;
      }
      handle.alive = false;
      p.mesh.instanceMatrix.needsUpdate = true;
      revision++; if (!mobile(handle.type)) version++;
      return true;
    },
    dispose() {
      for (const { mesh, detail, handles } of pools.values()) {
        for (const handle of handles) handle.alive = false;
        for (const draw of [mesh, detail]) if (draw) { scene.remove(draw); draw.geometry.dispose(); draw.dispose(); }
      }
      appearance.dispose(); pools.clear();
    },
  };
}
