// Shared authoritative/predicted water collision; no aircraft or station behavior.
import type { Vec3, VehicleEntity, WorldQuery } from "./types"
import { sweptSphere } from "./combat"
import { BoatHandling } from "./boat-movement"

const RADIUS = Math.hypot(BoatHandling.halfLength, BoatHandling.halfBeam)
const STILL: Vec3 = [0, 0, 0]

export function boatCollisionWorld(world: WorldQuery, vehicles: readonly VehicleEntity[], ownId: string): WorldQuery {
  const others = vehicles.filter(v => v.kind === "speedboat" && v.id !== ownId)
  if (!others.length) return world
  return { ...world, segmentHitsBoatSolid(from, to) {
    if (world.segmentHitsBoatSolid?.(from, to)) return true
    // ponytail: conservative hull spheres/O(n²) for small local rooms, not mesh contact/ram damage.
    // Use oriented hulls only if close-quarters precision is required. Wrecks remain solid until removal.
    for (const other of others) {
      const p = other.flight.position
      if (Math.max(from[0], to[0]) < p[0] - RADIUS || Math.min(from[0], to[0]) > p[0] + RADIUS ||
        Math.max(from[2], to[2]) < p[2] - RADIUS || Math.min(from[2], to[2]) > p[2] + RADIUS) continue
      const hit = sweptSphere(from, to, p, STILL, 0, RADIUS)
      if (hit >= 0 && hit <= 1) return true
    }
    return false
  } }
}
