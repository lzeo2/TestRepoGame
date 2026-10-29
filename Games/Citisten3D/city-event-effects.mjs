import * as THREE from './vendor/three.module.js';
import { createRiverTerrain } from './river-data.mjs';
import { BUILDING_ENVELOPES } from './footprints.mjs';

// Original primitive decorations. Simulation owns targets, lifetime and clock.
export function createCityEventEffects(scene, roads) {
  if (!scene?.isObject3D || !roads?.center) throw new TypeError('Expected scene and RoadGrid');
  const pools = [], dummy = new THREE.Object3D();
  let disposed = false, activeCount = 0, terrain;
  function pool(name, geometry, color, capacity, options = {}) {
    const material = new THREE.MeshBasicMaterial({ color, ...options });
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.name = `city-event-${name}`; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh); pools.push(mesh); return mesh;
  }
  // ponytail: fixed budgets; excess targets are omitted, never new draw calls.
  const flames = pool('flames', new THREE.ConeGeometry(1, 1, 6), 0xff8526, 96);
  const smoke = pool('smoke', new THREE.IcosahedronGeometry(1, 0), 0x55545b, 96);
  const waterGeometry = new THREE.PlaneGeometry(1, 1); waterGeometry.rotateX(-Math.PI / 2);
  const water = pool('flood', waterGeometry, 0x5489ad, 128,
    { transparent: true, opacity: .48, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  const flagGeometry = new THREE.BufferGeometry();
  flagGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1.3, -.4, 0, 0, -.8, 0], 3));
  const flags = pool('flags', flagGeometry, 0xe4b44f, 32, { side: THREE.DoubleSide });
  const poles = pool('poles', new THREE.BoxGeometry(1, 1, 1), 0x695a48, 32);
  function put(mesh, x, y, z, sx, sy, sz) {
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.updateMatrix();
    mesh.setMatrixAt(mesh.count++, dummy.matrix); mesh.visible = true;
  }
  function clear() { activeCount = 0; for (const mesh of pools) { mesh.count = 0; mesh.visible = false; } }
  const living = b => b && b.hp > 0 && !(b.constructionRemaining > 0) && roads.valid(b.x, b.z);
  function sync(state) {
    if (disposed) return;
    clear();
    if (!state) return;
    if (!terrain || terrain.layout !== (state.terrainLayout || 'legacy-flat') || terrain.seed !== state.terrainSeed) terrain = createRiverTerrain(roads.size, state.terrainLayout || 'legacy-flat', state.terrainSeed);
    const time = Number.isFinite(state.time) ? state.time : 0;
    const buildings = new Map((state.buildings || []).map(b => [b.id, b]));
    const burning = new Set(), flooded = new Set(), decorated = new Set();
    for (const hazard of state.incidents?.active || []) {
      if (!(hazard.remaining > 0)) continue;
      const severity = THREE.MathUtils.clamp(hazard.severity || 0, 0, 1);
      if (!severity) continue;
      const before = flames.count + water.count;
      if (hazard.type === 'fire') for (const id of hazard.buildingIds || []) {
        const b = buildings.get(id);
        if (!living(b) || burning.has(id) || burning.size >= 32) continue;
        burning.add(id);
        const p = roads.center(b.x, b.z), [width, depth] = BUILDING_ENVELOPES[b.type] || [8, 8];
        for (let i = 0; i < 3; i++) {
          const phase = time * 3 + b.x * .73 + b.z * .31 + i * 2;
          const height = (2 + severity * 5) * (1 + .12 * Math.sin(phase));
          const x = p.x + (i - 1) * width * .3, z = p.z - depth * .5;
          put(flames, x, height / 2 + .15, z, .45 + severity * .8, height, .45 + severity * .8);
          const rise = ((time * .35 + i / 3) % 1 + 1) % 1;
          const radius = (.55 + severity) * (1 + rise * .6);
          put(smoke, x + rise * .8, height + 1 + rise * 5, z, radius, radius, radius);
        }
      }
      if (hazard.type === 'flood') for (const tile of hazard.tiles || []) {
        if (!roads.valid(tile.x, tile.z) || water.count >= 128) continue;
        const key = roads.key(tile.x, tile.z);
        if (flooded.has(key)) continue;
        flooded.add(key);
        const p = roads.center(tile.x, tile.z);
        // Above the highest tile corner, not through the supplied bank/ground.
        let y = terrain.heightAt(tile.x, tile.z);
        for (const dx of [-.5, .5]) for (const dz of [-.5, .5]) y = Math.max(y, terrain.heightAt(tile.x + dx, tile.z + dz));
        if (terrain.isWater(tile.x, tile.z)) y = Math.max(y, terrain.waterHeight);
        put(water, p.x, y + .035 + severity * .12, p.z, roads.lotSize * .98, 1, roads.lotSize * .98);
      }
      if (flames.count + water.count > before) activeCount++;
    }
    for (const event of state.cityEvents || []) {
      if (event.type !== 'street-festival' || state.tick >= event.startTick + event.durationTicks) continue;
      const before = flags.count;
      for (const b of buildings.values()) {
        if (!living(b) || decorated.has(b.id) || flags.count >= 32 || `${Math.floor(b.x / 8)},${Math.floor(b.z / 8)}` !== event.district) continue;
        decorated.add(b.id);
        const p = roads.center(b.x, b.z), [width, depth] = BUILDING_ENVELOPES[b.type] || [8, 8];
        for (const side of [-1, 1]) {
          const x = p.x + side * width * .45, z = p.z - depth * .5 - .35;
          put(poles, x, 1.7, z, .09, 3.4, .09);
          put(flags, x, 3.35, z, 1, 1, 1);
        }
      }
      if (flags.count > before) activeCount++;
    }
    for (const mesh of pools) if (mesh.count) mesh.instanceMatrix.needsUpdate = true;
  }
  return { sync, clear, get activeCount() { return activeCount; }, dispose() {
    if (disposed) return;
    disposed = true; clear();
    for (const mesh of pools) { scene.remove(mesh); mesh.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); }
  } };
}
