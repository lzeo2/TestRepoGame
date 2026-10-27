// World bits clockwise: north (-Z), east (+X), south (+Z), west (-X).
export const WALL_DIRECTIONS = Object.freeze([
  Object.freeze({ bit: 1, x: 0, z: -1 }), Object.freeze({ bit: 2, x: 1, z: 0 }),
  Object.freeze({ bit: 4, x: 0, z: 1 }), Object.freeze({ bit: 8, x: -1, z: 0 }),
]);

// Rotation is quarter-turns about +Y, not the general saved heading.
export function wallTopology(mask, wallRotation) {
  if (!Number.isInteger(mask) || mask < 0 || mask > 15) throw new RangeError('Invalid wall mask');
  if (wallRotation !== undefined && (!Number.isInteger(wallRotation) || wallRotation < 0 || wallRotation > 3)) throw new RangeError('Invalid wall rotation');
  const rotation = wallRotation ?? ((mask & 5) && (!(mask & 10) || (mask & 5) === 5 && (mask & 10) !== 10) ? 1 : 0);
  let localMask = 0;
  for (let i = 0; i < 4; i++) if (mask & (1 << i)) localMask |= 1 << ((i + rotation) % 4);
  const count = WALL_DIRECTIONS.filter(d => mask & d.bit).length;
  const shape = count === 0 ? 'isolated' : count === 1 ? 'end' : count === 2 ? (mask === 5 || mask === 10 ? 'straight' : 'corner') : count === 3 ? 'T' : 'cross';
  return { mask, rotation, shape, type: localMask ? `wall_join_${localMask}` : 'wall' };
}

// O(buildings) per sync; native grid is bounded to 200x200 lots. No cached
// adjacency can survive demolition, completion or a fresh snapshot incorrectly.
export function deriveWallTopology(buildings) {
  const walls = buildings.filter(b => b.type === 'wall' && !(b.constructionRemaining > 0));
  const positions = new Set(walls.map(b => `${b.x},${b.z}`)), result = new Map();
  for (const b of walls) {
    let mask = 0;
    for (const d of WALL_DIRECTIONS) if (positions.has(`${b.x + d.x},${b.z + d.z}`)) mask |= d.bit;
    result.set(b.id, wallTopology(mask, b.wallRotation));
  }
  return result;
}
