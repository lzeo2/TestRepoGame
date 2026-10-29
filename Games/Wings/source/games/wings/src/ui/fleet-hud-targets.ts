import type { TeamId, Vec3 } from "../sim/types"

/** Presentation values only, copied from the authenticated faction snapshot. */
export interface FleetHudTarget {
  readonly id: string
  readonly team: TeamId
  readonly kind: "surface"
  readonly capital: boolean
  readonly position: readonly [number, number, number]
  readonly heading: number
  readonly hp: number
  readonly maxHp: number
}

export const FLEET_HUD_LIMIT = 12

export function safeFleetHudTargets(frame: any): readonly FleetHudTarget[] {
  const targets: FleetHudTarget[] = []
  const ids = new Set<string>()
  if (frame?.mode === "factions" && Array.isArray(frame.units)) for (const u of frame.units) {
    if (targets.length === FLEET_HUD_LIMIT) break
    if (!u || u.kind !== "surface" || u.alive !== true || !(u.hp > 0) ||
        !Number.isFinite(u.hp) || !Number.isFinite(u.maxHp) || u.maxHp <= 0 ||
        (u.team !== 0 && u.team !== 1) || typeof u.id !== "string" || !u.id || ids.has(u.id) ||
        !Array.isArray(u.position) || u.position.length !== 3 || !u.position.every(Number.isFinite)) continue
    const q = u.view?.orientation
    if (!Array.isArray(q) || q.length !== 4 || !q.every(Number.isFinite) || Math.abs(Math.hypot(...q) - 1) > 1e-5) continue
    // Match the rig's -Z forward quaternion, not a native launch-platform heading.
    const [x, y, z, w] = q
    const heading = Math.atan2(2 * (x * z + w * y), 1 - 2 * (x * x + y * y))
    ids.add(u.id)
    targets.push(Object.freeze({ id: u.id, team: u.team, kind: "surface", capital: u.capital === true,
      position: Object.freeze([...u.position]) as readonly [number, number, number],
      heading, hp: u.hp, maxHp: u.maxHp }))
  }
  return Object.freeze(targets)
}

/** Empty Factions frames must never fall back to native carriers. */
export function fleetHudCollection<T>(targets: readonly FleetHudTarget[] | undefined, native: () => readonly T[]): readonly (FleetHudTarget | T)[] {
  return targets ?? native()
}

export function fleetHudRadar(target: FleetHudTarget, origin: readonly number[], heading: number, radius: number, range: number) {
  const dx = target.position[0] - origin[0], dz = target.position[2] - origin[2]
  const cs = Math.cos(heading), sn = Math.sin(heading), k = radius / range
  let x = (dx * cs + dz * sn) * k, y = (-dx * sn + dz * cs) * k
  const distance = Math.hypot(x, y)
  if (distance > radius) { x *= radius / distance; y *= radius / distance }
  return { x, y, rotation: -target.heading - heading }
}

export function fleetHudMarker(target: FleetHudTarget, camera: readonly number[], myTeam: number) {
  const position: Vec3 = [...target.position]
  const distance = Math.hypot(...position.map((n, i) => n - camera[i]))
  const km = distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${Math.round(distance / 10) * 10} m`
  const own = target.team === myTeam
  return { position, distance, own,
    label: `${own ? "friendly" : "enemy"} ${target.capital ? "flagship" : "ship"} ${km} · ${Math.round(target.hp / target.maxHp * 100)}%` }
}
