import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { MODEL_DIRECTORIES, loadExternalModel, disposeExternalModels } from './external-assets.mjs';
export { MODEL_DIRECTORIES } from './external-assets.mjs';

const mobile = type => ['citizen', 'zombie', 'car', 'patrol_car', 'utility_car'].includes(type);
const walker = type => type === 'citizen' || type === 'zombie';
const axisX = new THREE.Vector3(1, 0, 0);

// Static meshes are baked once and merged by material/attribute layout, not by
// building. Animated rigid parts retain their hierarchy off-scene and feed
// per-primitive instance matrices. No geometry/texture duplication per handle.
export function createExternalBuildingKit(scene, capacity = 10000, { lod = 0 } = {}) {
  if (!scene?.isObject3D) throw new TypeError('Expected a Three scene/group');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 40000) throw new RangeError('Invalid capacity');
  if (![0, 1, 2].includes(lod)) throw new RangeError('LOD must be 0, 1 or 2');
  const pools = new Map(), models = new Map(), materials = new Map(), geometries = new Set();
  const dummy = new THREE.Object3D(), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  let disposed = false, loaded = false, version = 0, failure = null;
  function assertLive() {
    if (disposed) throw new Error('External building kit disposed');
    if (failure) throw failure;
  }
  function materialFor(original) {
    if (!materials.has(original)) materials.set(original, { material: original.clone(), emission: original.emissiveIntensity });
    return materials.get(original).material;
  }
  function pool(type) {
    assertLive();
    if (!Object.hasOwn(MODEL_DIRECTORIES, type)) throw new RangeError(`Unknown model: ${type}`);
    if (!pools.has(type)) {
      const p = { handles: [], batches: [], parts: null, template: null, allocation: 0 };
      // Diagnostic facade, deliberately NOT a render mesh. Counts are logical.
      p.mesh = { get count() { return p.handles.length; }, getMatrixAt(i, target) {
        if (!p.handles[i]) throw new RangeError('Invalid instance index');
        return target.copy(p.handles[i].matrix);
      } };
      pools.set(type, p);
      if (loaded) prepare(type, p);
    }
    return pools.get(type);
  }
  function prepare(type, p) {
    const gltf = models.get(MODEL_DIRECTORIES[type]);
    const template = gltf.scene.clone(true);
    if (type === 'park') {
      const assembly = gltf.scene.userData.external.assembly;
      if (assembly?.units !== 'metres' || assembly.up_axis !== 'Y') throw new Error('Invalid park assembly');
      for (const item of assembly.nodes) {
        if (item.asset === 'model.glb') continue;
        if (item.asset !== '../tree_deciduous/model.glb') throw new Error('Unknown park assembly asset');
        const group = new THREE.Group();
        if (!Array.isArray(item.translation) || item.translation.length !== 3 || !item.translation.every(Number.isFinite) ||
            item.scale && (!Array.isArray(item.scale) || item.scale.length !== 3 || !item.scale.every(v => Number.isFinite(v) && v > 0))) throw new Error('Invalid park assembly transform');
        group.position.fromArray(item.translation);
        if (item.scale) group.scale.fromArray(item.scale);
        group.add(models.get('tree_deciduous').scene.clone(true)); template.add(group);
      }
    }
    template.updateMatrixWorld(true);
    p.template = template; p.animations = gltf.animations; p.parts = [];
    const groups = new Map();
    template.traverse(node => {
      if (!node.isMesh) return;
      if (node.isSkinnedMesh || node.morphTargetInfluences?.length) throw new Error('Expected delivered rigid-part meshes, not skins/morphs');
      if (Array.isArray(node.material)) throw new Error('Expected GLTF primitive material');
      const material = materialFor(node.material);
      if (mobile(type)) {
        p.parts.push({ geometry: node.geometry, material, node });
      } else {
        const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
        const layout = Object.entries(geometry.attributes).sort().map(([key, a]) => `${key}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).join('/');
        const key = `${material.uuid}:${!!geometry.index}:${layout}`;
        if (!groups.has(key)) groups.set(key, { material, pieces: [] });
        groups.get(key).pieces.push(geometry);
      }
    });
    for (const { material, pieces } of groups.values()) {
      const geometry = mergeGeometries(pieces, false);
      for (const piece of pieces) piece.dispose();
      if (!geometry) throw new Error(`Unable to batch ${type} without changing its attributes`);
      geometries.add(geometry); p.parts.push({ geometry, material });
    }
    if (!p.parts.length) throw new Error(`Empty external model: ${type}`);
    for (const h of p.handles) attach(type, p, h);
    allocate(p);
  }
  function attach(type, p, h) {
    if (!mobile(type)) return;
    h.rig = p.template.clone(true); h.nodes = []; h.wheels = [];
    h.rig.updateMatrixWorld(true);
    h.rig.traverse(node => {
      if (node.isMesh) h.nodes.push(node);
      if (node.userData.role?.includes('wheel rolling around local X')) {
        const size = new THREE.Box3().setFromObject(node).getSize(new THREE.Vector3());
        const radius = Math.max(size.y, size.z) / 2;
        if (!(radius > 0)) throw new Error('Invalid delivered wheel radius');
        h.wheels.push({ node, rest: node.quaternion.clone(), radius, angle: 0 });
      }
    });
    if (walker(type)) {
      const clip = p.animations.find(clip => clip.name === `clip_${type}_walk`);
      if (!clip) throw new Error(`Missing delivered ${type} walk clip`);
      h.mixer = new THREE.AnimationMixer(h.rig);
      h.action = h.mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
      h.action.paused = true;
    } else if (h.wheels.length !== 4) throw new Error(`Expected four authored wheels: ${type}`);
  }
  function writeMatrices(p, h) {
    if (!p.batches.length) return;
    if (h.rig) h.rig.updateMatrixWorld(true);
    p.batches.forEach((batch, i) => {
      batch.setMatrixAt(h.index, h.rig ? matrix.multiplyMatrices(h.matrix, h.nodes[i].matrixWorld) : h.matrix);
      batch.instanceMatrix.needsUpdate = true;
    });
  }
  function allocate(p) {
    if (!p.parts || p.handles.length <= p.allocation) {
      for (const batch of p.batches) batch.count = p.handles.length;
      return;
    }
    p.allocation = Math.min(capacity, Math.max(16, p.handles.length, p.allocation * 2));
    for (const batch of p.batches) { scene.remove(batch); batch.dispose(); }
    p.batches = p.parts.map(part => {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, p.allocation);
      mesh.count = p.handles.length; mesh.frustumCulled = false;
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
      return mesh;
    });
    for (const h of p.handles) writeMatrices(p, h);
  }
  function valid(handle) { return handle?.alive && pools.get(handle.type)?.handles[handle.index] === handle; }
  function transform(handle, { x = 0, y = 0, z = 0, rotation = 0, scale = 1 } = {}) {
    assertLive();
    if (!valid(handle)) throw new Error('Invalid or removed model');
    if (![x, y, z, rotation, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid transform');
    const previous = handle.pose;
    if (previous && mobile(handle.type)) {
      const dx = x - previous.x, dy = y - previous.y, dz = z - previous.z;
      handle.moved ||= Math.hypot(dx, dy, dz) > 1e-7;
      // Projection onto -Z heading supplies the sign; sideways motion does not roll.
      handle.travel += (-dx * Math.sin(rotation) - dz * Math.cos(rotation)) / scale;
    }
    dummy.position.set(x, y, z); dummy.rotation.set(0, rotation, 0); dummy.scale.setScalar(scale); dummy.updateMatrix();
    handle.matrix.copy(dummy.matrix); handle.pose = { x, y, z, rotation, scale };
    writeMatrices(pools.get(handle.type), handle);
    if (!mobile(handle.type)) version++;
  }
  function stop(h) {
    if (h.mixer) { h.mixer.stopAllAction(); h.mixer.uncacheRoot(h.rig); }
    h.rig = null; h.nodes = null; h.wheels = null; h.action = null; h.mixer = null;
  }
  function cleanup() {
    for (const p of pools.values()) {
      for (const batch of p.batches) { scene.remove(batch); batch.dispose(); }
      p.batches = [];
      for (const h of p.handles) { stop(h); h.alive = false; }
      p.handles.length = 0; p.template = null; p.parts = null;
    }
    for (const geometry of geometries) geometry.dispose(); geometries.clear();
    for (const { material } of materials.values()) material.dispose(); materials.clear();
    disposeExternalModels(models.values()); models.clear();
  }
  const ready = (async () => {
    // allSettled ensures a failed sibling cannot leak a later successful load.
    const results = await Promise.allSettled(Object.values(MODEL_DIRECTORIES).map(async directory => {
      const model = await loadExternalModel(directory, lod); models.set(directory, model);
    }));
    try {
      if (disposed) throw new Error('External building kit disposed before ready');
      const rejected = results.find(result => result.status === 'rejected');
      if (rejected) throw rejected.reason;
      for (const [type, p] of pools) prepare(type, p);
      loaded = true;
    } catch (error) { failure = error; cleanup(); throw error; }
  })();
  return {
    types: Object.keys(MODEL_DIRECTORIES), pools, ready, lod,
    get version() { return version; },
    spawn(type, pose = {}) {
      const p = pool(type);
      if (p.handles.length >= capacity) throw new RangeError('Model pool full');
      const h = { type, index: p.handles.length, alive: true, matrix: new THREE.Matrix4(), pose: null, moved: false, travel: 0 };
      p.handles.push(h);
      try {
        transform(h, pose);
        if (p.parts) attach(type, p, h);
        allocate(p); writeMatrices(p, h);
      } catch (error) { p.handles.pop(); h.alive = false; stop(h); throw error; }
      return h;
    },
    transform,
    remove(handle) {
      if (!valid(handle)) return false;
      const p = pools.get(handle.type), last = p.handles.pop();
      if (last !== handle) { last.index = handle.index; p.handles[last.index] = last; writeMatrices(p, last); }
      handle.alive = false; stop(handle);
      for (const batch of p.batches) batch.count = p.handles.length;
      if (!mobile(handle.type)) version++;
      return true;
    },
    update(camera, night = 0, dt = 0) {
      assertLive();
      if (!Number.isFinite(night) || !Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid night/delta');
      const emission = .1 + .9 * THREE.MathUtils.clamp(night, 0, 1);
      for (const { material, emission: baseline } of materials.values()) if (baseline !== undefined) material.emissiveIntensity = baseline * emission;
      // Session LOD is explicit and fixed. Camera proximity never substitutes geometry.
      if (!loaded) return;
      for (const [type, p] of pools) if (mobile(type)) for (const h of p.handles) {
        if (h.action) { h.action.paused = !h.moved; if (h.moved && dt > 0) h.mixer.update(dt); }
        for (const wheel of h.wheels) if (h.travel) {
          wheel.angle = (wheel.angle - h.travel / wheel.radius) % (2 * Math.PI);
          wheel.node.quaternion.copy(wheel.rest).multiply(rotation.setFromAxisAngle(axisX, wheel.angle));
        }
        if (h.moved || h.travel) writeMatrices(p, h);
        h.moved = false; h.travel = 0;
      }
    },
    dispose() { if (disposed) return; disposed = true; cleanup(); pools.clear(); },
  };
}
