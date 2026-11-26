import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createParkAmenityModels, PARK_AMENITY_BODIES, parkAmenityVariant } from './park-amenity-models.js';
import { createParkMaterials } from './park-materials.js';

export const PARK_AMENITY_LIMITS = Object.freeze({
  range: 185, lowRange: 135, capacity: 28, lowCapacity: 18, cellSize: 96, refreshTile: 12,
});

// Use the same centred Y rotation for the physical body and the instanced model.
// The thin ground apron around a barbecue remains walkable.
function fixtureBody(entry, yaw, ground, body) {
  const halfWidth = body.width / 2, halfDepth = body.depth / 2;
  const cosine = Math.cos(yaw), sine = Math.sin(yaw);
  const corners = [[-halfWidth,-halfDepth],[halfWidth,-halfDepth],[halfWidth,halfDepth],[-halfWidth,halfDepth]];
  return {
    id: 'park-amenity-' + entry.id, type: 'park-fixture', y: ground, height: body.height,
    points: corners.map(([x,z]) => [entry.x + x*cosine + z*sine, entry.z - x*sine + z*cosine]),
  };
}

export function createParkAmenitiesView(scene, { entries, heightAt, masonryMap, masonryNormalMap } = {}) {
  const limits = PARK_AMENITY_LIMITS;
  const cells = new Map(), groups = new Map(), obstacles = [], ids = new Set();
  const stats = {
    indexed: 0, visible: 0, bbqs: 0, fountains: 0, drawCalls: 0, triangles: 0,
    nearestId: null, queries: 0, lastCandidates: 0, matrixWrites: 0, disposed: false,
  };
  const cellKey = (x, z) => x + ',' + z;
  for (const entry of entries || []) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
        (entry.kind !== 'bbq' && entry.kind !== 'fountain') ||
        !Number.isFinite(entry.x) || !Number.isFinite(entry.z)) continue;
    const variant = parkAmenityVariant(entry), body = PARK_AMENITY_BODIES[variant];
    if (!body) continue;
    const ground = heightAt(entry.x, entry.z);
    if (!Number.isFinite(ground)) continue;
    // The ACT inventory supplies source positions, but generally no surveyed orientation.
    const yaw = Number.isFinite(entry.yaw) ? entry.yaw : 0;
    const matrix = new THREE.Matrix4().makeRotationY(yaw).setPosition(entry.x, ground, entry.z);
    const row = {entry, variant, matrix, distance: 0, order: stats.indexed++};
    const key = cellKey(Math.floor(entry.x / limits.cellSize), Math.floor(entry.z / limits.cellSize));
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(row);
    ids.add(entry.id);
    obstacles.push(fixtureBody(entry, yaw, ground, body));
    if (!groups.has(variant)) groups.set(variant, {size: 0, drawn: [], next: [], meshes: [], triangles: 0});
    groups.get(variant).size++;
  }

  const root = new THREE.Group();
  root.name = 'ACT public barbecues and drinking fountains';
  scene.add(root);
  let models, materials, lastTileX, lastTileZ, lastLow, chosen = [];
  function prepareMeshes() {
    if (models) return;
    if (masonryMap === undefined && masonryNormalMap === undefined) materials = createParkMaterials();
    models = createParkAmenityModels(materials || {masonryMap, masonryNormalMap});
    for (const [variant, group] of groups) {
      for (const {geometry, material} of models.templates[variant]) {
        const mesh = new THREE.InstancedMesh(geometry, material, Math.min(limits.capacity, group.size));
        mesh.name = 'Park amenity ' + variant;
        mesh.count = 0;
        mesh.visible = false;
        // CPU selection bounds the radius and sorts nearest first. Keep the aggregate bounds
        // out of frustum culling when the live prefix jumps between unrelated parks.
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        root.add(mesh);
        group.meshes.push(mesh);
        group.triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
      }
    }
  }

  function update(focus, {lowGraphics = false} = {}) {
    if (stats.disposed) return;
    const active = Number.isFinite(focus?.x) && Number.isFinite(focus?.z);
    const tileX = active ? Math.floor(focus.x / limits.refreshTile) : null;
    const tileZ = active ? Math.floor(focus.z / limits.refreshTile) : null;
    if (tileX === lastTileX && tileZ === lastTileZ && lowGraphics === lastLow) return;
    lastTileX = tileX; lastTileZ = tileZ; lastLow = lowGraphics;
    stats.lastCandidates = 0;
    chosen.length = 0;
    if (active) {
      stats.queries++;
      const x = (tileX + .5) * limits.refreshTile, z = (tileZ + .5) * limits.refreshTile;
      const range = lowGraphics ? limits.lowRange : limits.range;
      const minX = Math.floor((x-range)/limits.cellSize), maxX = Math.floor((x+range)/limits.cellSize);
      const minZ = Math.floor((z-range)/limits.cellSize), maxZ = Math.floor((z+range)/limits.cellSize);
      for (let cx=minX; cx<=maxX; cx++) for (let cz=minZ; cz<=maxZ; cz++) {
        const cell = cells.get(cellKey(cx, cz));
        if (!cell) continue;
        stats.lastCandidates += cell.length;
        for (const row of cell) {
          row.distance = (row.entry.x-x)**2 + (row.entry.z-z)**2;
          if (row.distance <= range*range) chosen.push(row);
        }
      }
      chosen.sort((a,b) => a.distance-b.distance || a.order-b.order);
      chosen.length = Math.min(chosen.length, lowGraphics ? limits.lowCapacity : limits.capacity);
    }

    if (chosen.length) prepareMeshes();
    stats.visible = chosen.length; stats.nearestId = chosen[0]?.entry.id ?? null;
    stats.bbqs = 0; stats.drawCalls = 0; stats.triangles = 0;
    for (const group of groups.values()) group.next.length = 0;
    for (const row of chosen) {
      groups.get(row.variant).next.push(row);
      if (row.entry.kind === 'bbq') stats.bbqs++;
    }
    stats.fountains = stats.visible - stats.bbqs;
    for (const group of groups.values()) {
      // Draw order within a variant is fixed by the source index. Passing another fixture
      // can change distance ordering without changing a single matrix on the GPU.
      group.next.sort((a,b) => a.order-b.order);
      const count = group.next.length;
      if (count) {
        stats.drawCalls += group.meshes.length;
        stats.triangles += group.triangles * count;
      }
      if (count === group.drawn.length && group.next.every((row,i) => row === group.drawn[i])) continue;
      for (const mesh of group.meshes) {
        mesh.count = count; mesh.visible = count > 0;
        let first = count, last = -1;
        for (let i=0; i<count; i++) {
          if (group.next[i] === group.drawn[i]) continue;
          mesh.setMatrixAt(i, group.next[i].matrix);
          first = Math.min(first, i); last = i; stats.matrixWrites++;
        }
        if (last >= first) {
          // Multiple updates may precede a render. Preserve pending ranges until Three
          // consumes them; coalesce to one bounded prefix of the affected matrix slots.
          const attribute = mesh.instanceMatrix;
          const pending = attribute.updateRanges[0];
          const start = first*16, end = (last+1)*16;
          if (pending) {
            const previousEnd = pending.start + pending.count;
            pending.start = Math.min(pending.start, start);
            pending.count = Math.max(previousEnd, end) - pending.start;
          } else attribute.addUpdateRange(start, end-start);
          attribute.needsUpdate = true;
        }
      }
      const old = group.drawn; group.drawn = group.next; group.next = old;
    }
  }

  function dispose() {
    if (stats.disposed) return;
    update(null);
    root.removeFromParent();
    for (const group of groups.values()) for (const mesh of group.meshes) mesh.dispose();
    root.clear();
    models?.dispose();
    materials?.dispose();
    cells.clear(); groups.clear(); chosen.length = 0;
    stats.disposed = true;
  }

  return {obstacles, stats, update, dispose, visibleEntries: () => chosen.map(row => row.entry)};
}
