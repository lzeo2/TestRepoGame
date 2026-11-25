// Night streetlights along the retained suburban and city street network.
// Lamp positions derive from live road geometry at load time, the same way
// nitro bays anchor beside retained petrol sources. No surveyed lamp data is
// claimed; spacing, side alternation and pavement offsets are estimates.
import { roadProfile } from './road-network.js';

export const STREETLIGHT_CAP = 220;
// Residential through primary streets carry bus stops today; those classes get
// lamps. Trunk, motorway, service and airport ways stay unlit on purpose.
const ELIGIBLE = new Set(['residential', 'living_street', 'unclassified', 'tertiary', 'tertiary_link', 'secondary', 'secondary_link', 'primary', 'primary_link']);
const SPACING = 115, PAVEMENT_MARGIN = .45, PAVEMENT_REACH = 8.5, POLE_CLEARANCE = Object.freeze({ length: .4, width: .4 });

export function createStreetlights(roads, { waterAt, isOnBridge, canOccupy, nearestRoad } = {}) {
  const candidates = [];
  for (const road of roads || []) {
    const id = String(road.id || '');
    if (!ELIGIBLE.has(road.type) || id.includes('-airport-')) continue;
    // Bridge decks are lit separately in the render contract; a deck lamp would
    // float above its real ground sample, so tagged crossings are skipped.
    if (road.sourceTags?.bridge && road.sourceTags.bridge !== 'no') continue;
    const profile = roadProfile(road);
    const offset = profile.driveWidth / 2 + (profile.pavementWidth || 1) + PAVEMENT_MARGIN;
    if (offset > PAVEMENT_REACH) continue; // keeps every lamp near its roadway
    const points = road.points;
    if (!Array.isArray(points) || points.length < 2) continue;
    let carried = 0, parity = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (!Number.isFinite(length) || length <= 0) continue;
      const ux = dx / length, uz = dz / length;
      for (let travel = SPACING - carried; travel <= length; travel += SPACING) {
        const cx = a[0] + ux * travel, cz = a[1] + uz * travel;
        const side = parity++ % 2 ? 1 : -1;
        const nx = uz * side, nz = -ux * side; // pavement normal, alternating sides
        const x = cx + nx * offset, z = cz + nz * offset;
        if (![x, z].every(Number.isFinite)) continue;
        if (waterAt?.(x, z)) continue;
        if (isOnBridge?.(x, z)) continue;
        // Junction lamps must not stand in any carriageway, including the
        // crossing street's, so the nearest live road is checked as well.
        const near = nearestRoad?.(x, z);
        if (near && near.distance < roadProfile(near.road).driveWidth / 2 + .3) continue;
        candidates.push({ x, z, yaw: Math.atan2(-nx, nz), roadId: id });
      }
      carried = (carried + length) % SPACING;
    }
  }
  // Slot thinning keeps the cap exact and spreads lamps over the whole city
  // instead of filling the first districts. Each cap slot owns a stride window
  // of candidates; the first pole that clears live street geometry wins it.
  const slots = Math.min(STREETLIGHT_CAP, candidates.length), stride = candidates.length / slots;
  let misses = 0;
  const lamps = [];
  for (let slot = 0; slot < slots; slot++) {
    let index = Math.floor(slot * stride) + misses;
    while (index < candidates.length) {
      const candidate = candidates[index++];
      if (canOccupy && !canOccupy(candidate, POLE_CLEARANCE)) { misses++; continue; }
      lamps.push(Object.freeze({ id: `streetlight-${slot}`, x: candidate.x, z: candidate.z, yaw: candidate.yaw, roadId: candidate.roadId }));
      break;
    }
  }
  return Object.freeze(lamps);
}
