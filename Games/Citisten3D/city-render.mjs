import * as THREE from './vendor/three.module.js';
import { NEW_BUILDINGS } from './city-content.mjs';
import { wallParts } from './wall-render.mjs';

// Authored supplements, not supplied models. Dimensions stay inside one native lot.
function supplementGeometry(type) {
  const positions = [], normals = [], colors = [], color = new THREE.Color();
  function box(x, y, z, w, h, d, tint, tilt = 0) {
    const source = new THREE.BoxGeometry(w, h, d), g = source.toNonIndexed(); source.dispose();
    g.rotateX(tilt); g.translate(x, y, z); color.setHex(tint);
    positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
    for (let i = 0; i < g.attributes.position.count; i++) colors.push(color.r, color.g, color.b);
    g.dispose();
  }
  const concrete = 0xb5afa0, steel = 0x62686d, blue = 0x365fa0, orange = 0xc58a40;
  if (type === 'apartments') {
    box(0, 5.6, 0, 4, 4, 3.4, concrete);
    for (const y of [4.7, 6.5]) box(0, y, -1.72, 3.4, .65, .08, blue);
    box(0, 7.7, 0, 4.4, .25, 3.8, steel);
  } else if (type === 'workshop') {
    box(2.8, 5.5, 2.2, .7, 6, .7, steel); box(2.8, 8.6, 2.2, 1.2, .3, 1.2, orange);
    box(-2, 5.1, 1.4, 2.2, 1.6, 1.4, concrete);
  } else if (type === 'clinic') {
    box(0, 8.8, 0, .25, 2, .25, steel);
    box(0, 9.5, 0, 2.4, .65, .45, blue); box(0, 9.5, 0, .65, 2.4, .45, blue);
  } else if (type === 'school') {
    box(0, 11.4, 0, 2, 3.2, 2, concrete); box(0, 13.1, 0, 2.4, .25, 2.4, steel);
    box(0, 11.9, -1.02, 1.5, 1.5, .08, 0xf1e7cb);
    box(0, 12.1, -1.08, .12, .6, .08, 0x252525); box(.2, 11.85, -1.08, .5, .12, .08, 0x252525);
  } else if (type === 'solar') {
    box(0, .12, 0, 8, .24, 6.8, concrete);
    for (const x of [-2.6, 0, 2.6]) for (const z of [-1.7, 1.3]) {
      box(x, .8, z, .2, 1.4, .2, steel);
      box(x, 1.6, z, 2.3, .12, 2.4, 0x24416c, -.35);
      box(x, 1.68, z, .05, .04, 2.4, 0xc6ced4, -.35);
    }
  } else if (type === 'river_pump') {
    box(0, -.225, 0, 6, .45, 6, concrete); // Seal the dry bank's maximum .4m depression.
    box(2.55, 3, -2.4, .6, 6, .6, blue); box(1.5, .65, -2.4, 2.7, .6, .6, blue);
    box(2.55, 5.8, -2.4, .9, .25, .9, steel);
  } else {
    const stage = Number(type.at(-1));
    box(0, .15, 0, 8, .3, 8, concrete);
    for (const x of [-3.5, 3.5]) for (const z of [-3.5, 3.5]) box(x, stage ? 2 : .7, z, .3, stage ? 4 : 1.1, .3, orange);
    if (stage >= 1) {
      for (const z of [-3.5, 3.5]) box(0, 4, z, 7.3, .25, .25, steel);
      for (const x of [-3.5, 3.5]) box(x, 4, 0, .25, .25, 7.3, steel);
    }
    if (stage === 2) {
      box(0, 4.25, 0, 8, .3, 8, steel);
      box(0, 1.6, 3.4, 6.8, 2.8, .25, concrete); box(3.4, 1.6, 0, .25, 2.8, 6.8, concrete);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingBox(); return geometry;
}

export function createCityBuildingKit(scene, base, capacity = 10000) {
  if (!scene?.isObject3D || !base?.spawn) throw new TypeError('Expected scene and supplied model kit');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 40000) throw new RangeError('Invalid capacity');
  const additions = [...Object.keys(NEW_BUILDINGS), 'construction_site_0', 'construction_site_1', 'construction_site_2'];
  const joins = Array.from({ length: 15 }, (_, i) => `wall_join_${i + 1}`);
  const types = [...base.types, ...additions, ...joins], pools = new Map();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 });
  const dummy = new THREE.Object3D(), operationalColor = new THREE.Color();
  let disposed = false, loaded = false, version = 0;
  const mobile = type => ['citizen', 'zombie', 'car', 'patrol_car', 'utility_car'].includes(type);
  function live() { if (disposed) throw new Error('City building kit disposed'); }
  function valid(h) { return h?.alive && pools.get(h.type)?.handles[h.index] === h; }
  function pool(type) {
    if (!types.includes(type)) throw new RangeError(`Unknown model: ${type}`);
    if (!pools.has(type)) {
      const p = { handles: [], geometry: additions.includes(type) ? supplementGeometry(type) : null, batch: null, batches: [], parts: null, allocation: 0 };
      if (p.geometry) p.parts = [{ geometry: p.geometry, material }];
      p.mesh = { get count() { return p.handles.length; }, getMatrixAt(i, target) {
        if (!p.handles[i]) throw new RangeError('Invalid instance index'); return target.copy(p.handles[i].matrix);
      } };
      pools.set(type, p);
      if (loaded && joins.includes(type)) prepareWall(type, p);
    }
    return pools.get(type);
  }
  function prepareWall(type, p) {
    if (!base.pools.get('wall')?.parts) {
      const temporary = base.spawn('wall'); base.remove(temporary);
    }
    p.parts = wallParts(base.pools.get('wall').parts, Number(type.slice('wall_join_'.length)));
    allocate(p);
  }
  function tint(p, h) {
    operationalColor.setRGB(h.operational ? 1 : .16, h.operational ? 1 : .16, h.operational ? 1 : .16);
    for (const batch of p.batches) { batch.setColorAt(h.index, operationalColor); batch.instanceColor.needsUpdate = true; }
  }
  function upload(p, h) {
    for (const batch of p.batches) { batch.setMatrixAt(h.index, h.matrix); batch.instanceMatrix.needsUpdate = true; }
    tint(p, h);
  }
  function allocate(p) {
    if (!p.parts) return;
    if (p.handles.length > p.allocation) {
      for (const batch of p.batches) { scene.remove(batch); batch.dispose(); }
      p.allocation = Math.min(capacity, Math.max(16, p.handles.length, p.allocation * 2));
      p.batches = p.parts.map(part => {
        const batch = new THREE.InstancedMesh(part.geometry, part.material, p.allocation);
        batch.frustumCulled = false; batch.castShadow = batch.receiveShadow = true;
        batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(batch); return batch;
      });
      p.batch = p.batches[0];
      for (const h of p.handles) upload(p, h);
    }
    for (const batch of p.batches) { batch.count = p.handles.length; batch.visible = batch.count > 0; }
  }
  function transform(h, { x = 0, y = 0, z = 0, rotation = 0, scale = 1 } = {}) {
    live(); if (!valid(h)) throw new Error('Invalid or removed model');
    if (![x, y, z, rotation, scale].every(Number.isFinite) || scale <= 0) throw new RangeError('Invalid transform');
    const pose = { x, y, z, rotation, scale };
    if (h.pose && Object.keys(pose).every(key => h.pose[key] === pose[key])) return;
    if (h.base) base.transform(h.base, pose);
    dummy.position.set(x, y, z); dummy.rotation.set(0, rotation, 0); dummy.scale.setScalar(scale); dummy.updateMatrix();
    h.matrix.copy(dummy.matrix); h.pose = pose; upload(pools.get(h.type), h);
    if (!mobile(h.type)) version++;
  }
  function dispose() {
    if (disposed) return; disposed = true;
    for (const p of pools.values()) {
      for (const h of p.handles) h.alive = false;
      for (const batch of p.batches) { scene.remove(batch); batch.dispose(); }
      for (const part of p.parts || []) part.geometry.dispose();
      p.handles.length = 0;
    }
    pools.clear(); material.dispose(); base.dispose();
  }
  const ready = base.ready.then(() => {
    live(); loaded = true;
    for (const [type, p] of pools) if (joins.includes(type)) prepareWall(type, p);
  }).catch(error => { dispose(); throw error; });
  return {
    types, pools, ready, lod: base.lod,
    get version() { return version; },
    spawn(type, pose = {}) {
      live(); const p = pool(type);
      if (p.handles.length >= capacity) throw new RangeError('Model pool full');
      const h = { type, index: p.handles.length, alive: true, pose: null, matrix: new THREE.Matrix4(), base: null, operational: true,
        get action() { return this.base?.action; } };
      p.handles.push(h);
      try {
        transform(h, pose);
        const sourceType = type === 'solar' || type.startsWith('construction_site_') || joins.includes(type) ? null : NEW_BUILDINGS[type]?.modelType || type;
        if (sourceType) h.base = base.spawn(sourceType, h.pose);
        allocate(p); upload(p, h); return h;
      } catch (error) {
        if (h.base) base.remove(h.base);
        p.handles.pop(); h.alive = false;
        for (const batch of p.batches) { batch.count = p.handles.length; batch.visible = batch.count > 0; }
        throw error;
      }
    },
    transform,
    setOperational(h, operational) {
      live(); if (!valid(h)) throw new Error('Invalid or removed model');
      if (mobile(h.type) || h.operational === Boolean(operational)) return;
      h.operational = Boolean(operational);
      if (h.base) base.setOperational(h.base, h.operational);
      tint(pools.get(h.type), h);
    },
    remove(h) {
      if (!valid(h)) return false;
      const p = pools.get(h.type), last = p.handles.pop();
      if (h.base) base.remove(h.base);
      if (last !== h) { last.index = h.index; p.handles[last.index] = last; upload(p, last); }
      for (const batch of p.batches) { batch.count = p.handles.length; batch.visible = batch.count > 0; }
      h.alive = false; if (!mobile(h.type)) version++; return true;
    },
    update(camera, night = 0, dt = 0) { live(); base.update(camera, night, dt); },
    dispose,
  };
}
