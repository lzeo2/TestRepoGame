// OpenStreetMap contributors, ODbL 1.0. The closed racecourse service span is
// scenery only. Its centreline comes from the pinned regional source tile.
export const SULLIVANS_DISUSED_BRIDGE = Object.freeze({
  sourceId: 'way/1231840644',
  sourceVersion: 2,
  points: Object.freeze([Object.freeze([509.52, -9337.43]), Object.freeze([499.54, -9342.99])]),
  width: 3.6,
});

export function disusedBridgeScenery(map, groundHeightAt) {
  if (!map.regionalExpansion?.some(region => region.regionId === 'north')) return null;
  const { points: [a, b], width } = SULLIVANS_DISUSED_BRIDGE;
  const { minX, maxX, minZ, maxZ } = map.bounds;
  if ([a, b].some(([x, z]) => x - width < minX || x + width > maxX || z - width < minZ || z + width > maxZ)) return null;
  const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
  const x = (a[0] + b[0]) / 2, z = (a[1] + b[1]) / 2, yaw = -Math.atan2(dz, dx);
  const point = (u, v) => [x + (dx * u - dz * v) / length, z + (dz * u + dx * v) / length];
  const ground = [groundHeightAt(...a), groundHeightAt(x, z), groundHeightAt(...b)];
  if (!ground.every(Number.isFinite)) return null;
  // The contour grid does not resolve the narrow creek channel. Keep the
  // photographic cross section as a small, original span over the local grade.
  const flat = Math.max(...ground), deckTop = flat + .58;
  const parts = [];
  function block(u, v, y, span, height, depth, color) {
    const [px, pz] = point(u, v);
    parts.push({ x: px, y, z: pz, span, height, depth, color, yaw });
  }
  block(0, 0, deckTop - .17, length, .34, width, 0x777766);
  for (const side of [-1, 1]) {
    block(0, side * (width / 2 - .05), deckTop + .05, length, .11, .10, 0xbebdb1);
    block(side * (length / 2 - .30), 0, deckTop - .55, .6, .58, width + .06, 0x858176);
  }
  const outline = [point(-length / 2, -width / 2), point(length / 2, -width / 2),
    point(length / 2, width / 2), point(-length / 2, width / 2)];
  return { x, z, outline, parts };
}
