// Reviewed collision delta on the already applied host ABI, not an alternate combat engine.
import { createHash } from 'node:crypto';

export const nativeShipCollisionBody = `const SHIP_BOXES = Object.fromEntries(Object.entries(SHIP_SPECS).map(([kind, spec]) => [kind, shipCollisionBoxes(spec)]))
function shipBoxesT(ship: Ship, a: Vec3, b: Vec3): number | null {
  const boxes = SHIP_BOXES[ship.kind]
  let r = 0
  for (const { center, half } of boxes) r = Math.max(r, Math.hypot(Math.abs(center[0]) + half[0], Math.abs(center[2]) + half[2]))
  r += 5
  const P = ship.position
  if (Math.max(a[0], b[0]) < P[0] - r || Math.min(a[0], b[0]) > P[0] + r || Math.max(a[2], b[2]) < P[2] - r || Math.min(a[2], b[2]) > P[2] + r) return null
  toShipLocal(ship, a, _sl0)
  toShipLocal(ship, b, _sl1)
  let best: number | null = null
  for (const { center, half } of boxes) {
    const hit = boxT(_sl0, _sl1, center[0], center[1], center[2], half[0], half[1], half[2])
    if (hit !== null && (best === null || hit < best)) best = hit
  }
  return best
}`;

export function applyNativeShipCollisionWiring(source) {
  if (typeof source !== 'string' || createHash('sha256').update(source).digest('hex') !==
      '4784f83ad3fbfe5a5ffffc8952612e60783f472d2b2c27b8a983eee4dc62f8bf')
    throw new Error('Native ship collision source preimage mismatch');
  const start = source.indexOf('function shipBoxesT('), end = source.indexOf('\n}', start) + 2;
  if (start < 0 || end < 2) throw new Error('Native ship collision boundary missing');
  return (source.slice(0, start) + nativeShipCollisionBody + source.slice(end)).replace(
    '  AA_RANGE, FLEET, SHIP_DAMAGE_SCALE, SHIP_SPECS,',
    '  AA_RANGE, FLEET, SHIP_DAMAGE_SCALE, SHIP_SPECS, shipCollisionBoxes,');
}
