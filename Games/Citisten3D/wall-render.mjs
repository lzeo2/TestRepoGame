import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

// Reuse the prepared supplied art, including UVs/normals/materials. No new loads.
export function wallParts(parts, mask) {
  return parts.map(({ geometry, material }) => {
    const pieces = [geometry.clone().scale(.1, 1, 1)];
    for (let direction = 0; direction < 4; direction++) if (mask & (1 << direction)) {
      // Local +X arm [.5,5], rotated to N/E/S/W. Center and arms only butt.
      pieces.push(geometry.clone().scale(.45, 1, 1).translate(2.75, 0, 0).rotateY((1 - direction) * Math.PI / 2));
    }
    const merged = mergeGeometries(pieces, false);
    for (const piece of pieces) piece.dispose();
    if (!merged) throw new Error('Unable to batch supplied wall parts');
    merged.computeBoundingBox();
    return { geometry: merged, material };
  });
}
