// Bounded appearance cues from the recorded public street observations. These
// distances are art transitions, not suburb boundaries or cadastral parcels.
const profile = (id, walls, roofs, fenceHeight, gardenDepth) => Object.freeze({
  id, walls: Object.freeze(walls), roofs: Object.freeze(roofs), fenceHeight, gardenDepth,
});
const PROFILES = Object.freeze({
  redhill: profile('redhill', [0xd6cbb5, 0xb29b80, 0xc4b498], [0x796b5c, 0x976b50], 0.72, 8),
  griffith: profile('griffith', [0xa97860, 0xd7cbb1, 0xb38b72], [0x985e49, 0x776b5c], 0.82, 6),
  kingston: profile('kingston', [0xc9bdab, 0xb39178, 0xd8cdb6], [0x72766f, 0x8a6d5c], 0.65, 4),
  barton: profile('barton', [0xd4c9b2, 0xb69279, 0xc4b99f], [0x856952, 0x74756c], 0.75, 6),
  residential: profile('residential', [0xa97860, 0xc8b598, 0xddd4bd, 0x996e59, 0xbca68a], [0x92604b, 0x686964, 0xa26e53, 0x726558], 0.8, 6),
});
export function suburbCharacter(map, x, z) {
  let selected = PROFILES.residential, nearest = Infinity;
  for (const anchor of map.landmarks || []) {
    const id = anchor.id === 'foreshore' ? 'kingston' : anchor.id === 'manuka' ? 'griffith' : anchor.id === 'telopea' ? 'barton' : anchor.id;
    const radius = id === 'kingston' ? 650 : id === 'redhill' ? 800 : id === 'griffith' ? 700 : id === 'barton' ? 500 : 0;
    const distance = Math.hypot(x - anchor.x, z - anchor.z);
    if (PROFILES[id] && distance < radius && distance < nearest) { selected = PROFILES[id]; nearest = distance; }
  }
  return selected;
}

// Rear ground is inferred from the actual footprint's farthest projection away
// from its public frontage. The caller must reject roads, paths, protected land,
// other footprints and other accepted gardens. No private boundary is asserted.
export function rearGarden(building, frontage, character, clear) {
  const { nx, nz } = frontage, tx = nz, tz = -nx;
  const points = building.points || [];
  if (points.length < 3) return null;
  const across = points.map(p => p[0] * tx + p[1] * tz);
  const rear = Math.max(...points.map(p => p[0] * nx + p[1] * nz));
  const width = Math.min(10, Math.max(...across) - Math.min(...across) - 1.5);
  if (width < 4) return null;
  const middle = (Math.min(...across) + Math.max(...across)) / 2;
  const depth = character.gardenDepth;
  const point = (u, v) => [tx * (middle + u) + nx * (rear + 1 + v), tz * (middle + u) + nz * (rear + 1 + v)];
  for (let u = -width / 2; u <= width / 2 + 0.01; u += width / 4) {
    for (let v = 0; v <= depth + 0.01; v += depth / 4) if (!clear(...point(u, v))) return null;
  }
  const corners = [point(-width / 2, 0), point(width / 2, 0), point(width / 2, depth), point(-width / 2, depth)];
  return { width, depth, corners, point };
}
