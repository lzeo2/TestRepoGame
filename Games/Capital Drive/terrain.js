// Shared metres/elevation authority. Source contour grids stay immutable.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (a, b, fraction) => a + (b - a) * fraction;

function validGrid(grid) {
  return grid?.cols > 1 && grid?.rows > 1 && grid.maxX > grid.minX && grid.maxZ > grid.minZ &&
    grid.heights?.length === grid.cols * grid.rows;
}

function inside(grid, x, z) {
  return x >= grid.minX && x <= grid.maxX && z >= grid.minZ && z <= grid.maxZ;
}

function sample(grid, x, z) {
  const tx = clamp((x - grid.minX) / (grid.maxX - grid.minX), 0, 1) * (grid.cols - 1);
  const tz = clamp((z - grid.minZ) / (grid.maxZ - grid.minZ), 0, 1) * (grid.rows - 1);
  const ix = Math.min(grid.cols - 2, Math.floor(tx));
  const iz = Math.min(grid.rows - 2, Math.floor(tz));
  const fx = tx - ix, fz = tz - iz, offset = iz * grid.cols + ix;
  return lerp(lerp(grid.heights[offset], grid.heights[offset + 1], fx),
    lerp(grid.heights[offset + grid.cols], grid.heights[offset + grid.cols + 1], fx), fz);
}

/** map.terrain is the original grid; terrainTiles are separately sourced grids.
 * Optional bridgeDecks: [{roadId,heights:[y per source road point]}]. Heights are
 * authored deck estimates, never source contour samples. Only tagged bridge
 * roads receive a deck; no water polygon or surrounding land is raised.
 */
export function createTerrainSampler(map) {
  const base = validGrid(map.terrain) ? map.terrain : null;
  const tiles = (map.terrainTiles || []).filter(validGrid);
  function groundHeightAt(x, z) {
    const tile = tiles.find(grid => inside(grid, x, z));
    if (tile) {
      const value = sample(tile, x, z);
      if (base && inside(base, x, z) && Number.isFinite(tile.blendSouthZ) && Number.isFinite(tile.blendNorthZ)) {
        const fraction = clamp((tile.blendSouthZ - z) / (tile.blendSouthZ - tile.blendNorthZ), 0, 1);
        const smooth = fraction * fraction * (3 - 2 * fraction);
        return lerp(sample(base, x, z), value, smooth);
      }
      return value;
    }
    return base ? sample(base, x, z) : 0;
  }

  // Fixed normal design level, not a live reading: NCA Scrivener Dam lists
  // 555.93m AHD. Deck clearance/profile above this level remains authored.
  const lakeWaterLevel = Number.isFinite(map.lakeWaterLevel) ? map.lakeWaterLevel : 5.93;
  const minimumLakeDeck = lakeWaterLevel + 2.5;
  const estimates = new Map((map.bridgeDecks || []).map(deck => [String(deck.roadId), deck.heights]));
  const tagged = road => {
    const value = road.sourceTags?.bridge ?? road.tags?.bridge ?? road.bridge;
    return value && value !== 'no';
  };
  const keyOf = point => `${point[0]},${point[1]}`;
  const roads = (map.roads || []).filter(road => road.points?.length > 1);
  const bridgeRoads = roads.filter(tagged);
  const bridgeEnds = new Set(bridgeRoads.flatMap(road => [keyOf(road.points[0]), keyOf(road.points.at(-1))]));
  // OSM bridge expansion joints can be separate short untagged ways. Include
  // only a direct connector whose two ends are already bridge abutment nodes.
  const connectors = roads.filter(road => !tagged(road) && bridgeEnds.has(keyOf(road.points[0])) &&
    bridgeEnds.has(keyOf(road.points.at(-1))) && road.points.slice(1).reduce((total, p, i) =>
      total + Math.hypot(p[0] - road.points[i][0], p[1] - road.points[i][1]), 0) <= 50);
  const deckRoads = [...bridgeRoads, ...connectors];
  const nodes = new Map();
  for (const road of deckRoads) for (let i = 0; i < road.points.length; i++) {
    const p = road.points[i], key = keyOf(p);
    if (!nodes.has(key)) nodes.set(key, { point: p, neighbours: new Map(), names: new Set() });
    nodes.get(key).names.add(road.name);
    if (i) {
      const previous = road.points[i - 1], other = keyOf(previous), distance = Math.hypot(p[0] - previous[0], p[1] - previous[1]);
      nodes.get(key).neighbours.set(other, distance);
      nodes.get(other).neighbours.set(key, distance);
    }
  }
  const nodeHeights = new Map(), nodeProfiles = new Map(), visited = new Set();
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const component = [], queue = [start];
    visited.add(start);
    for (let i = 0; i < queue.length; i++) {
      const key = queue[i]; component.push(key);
      for (const next of nodes.get(key).neighbours.keys()) if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
    const ends = component.filter(key => nodes.get(key).neighbours.size === 1);
    const firstKey = ends[0] || component[0];
    const distances = new Map([[firstKey, 0]]), pending = new Set(component);
    // Tiny static bridge graphs; shortest distance preserves shared joint heights.
    while (pending.size) {
      let key, best = Infinity;
      for (const candidate of pending) if ((distances.get(candidate) ?? Infinity) < best) { key = candidate; best = distances.get(candidate); }
      if (key === undefined) break;
      pending.delete(key);
      for (const [next, distance] of nodes.get(key).neighbours) if (best + distance < (distances.get(next) ?? Infinity)) distances.set(next, best + distance);
    }
    const lastKey = component.reduce((a, b) => (distances.get(a) || 0) > (distances.get(b) || 0) ? a : b);
    const length = distances.get(lastKey) || 1;
    const lakeBridge = length > 200 && component.some(key => [...nodes.get(key).names].some(name => name === 'Kings Avenue' || name === 'Commonwealth Avenue'));
    const first = groundHeightAt(...nodes.get(firstKey).point), last = groundHeightAt(...nodes.get(lastKey).point);
    for (const key of component) {
      const t = (distances.get(key) || 0) / length;
      // A shallow authored deck estimate, not a claim of surveyed bridge levels.
      const y = lerp(first, last, t) + (lakeBridge ? 1.2 * 4 * t * (1 - t) : 0);
      nodeHeights.set(key, lakeBridge ? Math.max(minimumLakeDeck, y) : y);
      nodeProfiles.set(key, { t, first, last, lakeBridge });
    }
  }
  const bridgeSegments = [];
  const cells = new Map(), cellSize = 80;
  for (const road of deckRoads) {
    const explicit = estimates.get(String(road.id));
    const heights = road.points.map((point, index) => explicit?.length === road.points.length && Number.isFinite(explicit[index]) ? explicit[index] : nodeHeights.get(keyOf(point)));
    const radius = (Number(road.width) || 7.5) / 2 + 2;
    for (let i = 1; i < road.points.length; i++) {
      const originalA = road.points[i - 1], originalB = road.points[i];
      const pieces = Math.max(1, Math.ceil(Math.hypot(originalB[0] - originalA[0], originalB[1] - originalA[1]) / 25));
      const profileA = nodeProfiles.get(keyOf(originalA)), profileB = nodeProfiles.get(keyOf(originalB));
      const profileHeight = fraction => {
        if (explicit?.length === road.points.length) return lerp(heights[i - 1], heights[i], fraction);
        const t = lerp(profileA.t, profileB.t, fraction);
        const y = lerp(profileA.first, profileA.last, t) + (profileA.lakeBridge ? 1.2 * 4 * t * (1 - t) : 0);
        return profileA.lakeBridge ? Math.max(minimumLakeDeck, y) : y;
      };
      for (let piece = 0; piece < pieces; piece++) {
        const t0 = piece / pieces, t1 = (piece + 1) / pieces;
        const a = [lerp(originalA[0], originalB[0], t0), lerp(originalA[1], originalB[1], t0)];
        const b = [lerp(originalA[0], originalB[0], t1), lerp(originalA[1], originalB[1], t1)];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        if (!dx && !dz) continue;
        const segment = { a, b, dx, dz, lengthSquared: dx * dx + dz * dz, radius, y0: profileHeight(t0), y1: profileHeight(t1), roadId: road.id };
        bridgeSegments.push(segment);
        for (let cx = Math.floor((Math.min(a[0], b[0]) - radius) / cellSize); cx <= Math.floor((Math.max(a[0], b[0]) + radius) / cellSize); cx++) {
          for (let cz = Math.floor((Math.min(a[1], b[1]) - radius) / cellSize); cz <= Math.floor((Math.max(a[1], b[1]) + radius) / cellSize); cz++) {
            const key = `${cx},${cz}`;
            if (!cells.has(key)) cells.set(key, []);
            cells.get(key).push(segment);
          }
        }
      }
    }
  }

  function bridgeHeightAt(x, z) {
    let nearest = Infinity, result = null;
    for (const segment of cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) || []) {
      const t = clamp(((x - segment.a[0]) * segment.dx + (z - segment.a[1]) * segment.dz) / segment.lengthSquared, 0, 1);
      const distance = Math.hypot(x - segment.a[0] - segment.dx * t, z - segment.a[1] - segment.dz * t);
      if (distance <= segment.radius && distance < nearest) {
        nearest = distance;
        result = lerp(segment.y0, segment.y1, t);
      }
    }
    return result;
  }

  function isOnBridge(x, z, radius = 0) {
    for (const segment of cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) || []) {
      const t = clamp(((x - segment.a[0]) * segment.dx + (z - segment.a[1]) * segment.dz) / segment.lengthSquared, 0, 1);
      if (Math.hypot(x - segment.a[0] - segment.dx * t, z - segment.a[1] - segment.dz * t) + Math.max(0, radius) <= segment.radius) return true;
    }
    return false;
  }

  function heightAt(x, z) {
    const ground = groundHeightAt(x, z), deck = bridgeHeightAt(x, z);
    return deck === null ? ground : Math.max(ground, deck);
  }
  return { groundHeightAt, heightAt, bridgeHeightAt, isOnBridge, bridgeSegments: Object.freeze(bridgeSegments.map(segment => Object.freeze({ roadId: segment.roadId, a: Object.freeze([...segment.a]), b: Object.freeze([...segment.b]), y0: segment.y0, y1: segment.y1, radius: segment.radius }))), stats: Object.freeze({ tiles: tiles.length, bridgeSegments: bridgeSegments.length }) };
}
