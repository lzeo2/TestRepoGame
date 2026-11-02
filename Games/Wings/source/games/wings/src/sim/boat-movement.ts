// Isolated retained speedboat foundation. No kind registration, room clock or renderer.
import type { FlightInput, FlightState, Quat, Vec3, WorldQuery } from "./types"

/** Structurally the existing flight state, without pretending a boat is a registered aircraft. */
export type BoatKinematics = Omit<FlightState, "kind">
export type BoatMovementState = BoatKinematics & { kind?: "speedboat" }
export type BoatMovementWorld = WorldQuery & {
  /** Raw terrain, not the ocean-clamped groundHeight. Required for known draft clearance. */
  seabedHeight?(x: number, z: number): number
  /** True for physical solids only, excluding water. Adapter owns moving-solid sweeps on the
   * existing room tick. Must handle zero-length segments and points inside a solid. No fitted
   * pose disclosure is needed. Omit only when sampled surface collision is sufficient. */
  segmentHitsBoatSolid?(from: Vec3, to: Vec3): boolean
}

export const BoatHandling = Object.freeze({
  // Decoded retained hull_* POSITION bounds in meters; root waterline is Y=0, not paint trim.
  halfLength: 5, halfBeam: 1.6, draft: 0.7, hullTop: 0.66, waterline: 0, seaLevel: 0,
  helmEye: [0, 1.9, 0.9] as const, gunPivot: [0, 1.15, -2.6] as const,
  gunTip: [0, 0, -1.3] as const, stern: [0, 0.45, 5.2] as const,
  props: [[-0.8, -0.45, 4.4], [0.8, -0.45, 4.4]] as const,
  wakes: [[-0.8, -0.03, 4.9], [0.8, -0.03, 4.9]] as const,
  // Exact eligible legacy tuning, not physical measurements from the mesh.
  cruise: 28, reverse: 7, thrust: 6, drag: 0.08, speedDrag: 0.12,
  lateralDrag: 2.5, braking: 10, yawRate: 0.8, turnSpeed: 7,
  buoyancy: 4, verticalLimit: 2,
  // New bounded motion cues. No lift or thrust from pitch, boost or aim.
  planingPitch: 0.035, bank: 0.045, bob: 0.012, attitudeRate: 4,
})
const H = BoatHandling
const clamp = (v: number, lo: number, hi: number) => v < lo ? lo : v > hi ? hi : v
// Same axis and quaternion math as retained flight.ts. No import of the aircraft engine.
const axis = (v: number) => v > 1 ? 1 : v < -1 ? -1 : v === v ? v : 0
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
function attitude(q: Quat) {
  const [x, y, z, w] = q
  return { yaw: Math.atan2(2 * (x * z + w * y), 1 - 2 * (x * x + y * y)),
    pitch: Math.asin(clamp(2 * (w * x - y * z), -1, 1)),
    bank: Math.atan2(-2 * (x * y + w * z), 1 - 2 * (x * x + z * z)) }
}
function setAttitude(q: Quat, yaw: number, pitch: number, bank: number) {
  const cy = Math.cos(yaw / 2), sy = Math.sin(yaw / 2)
  const cp = Math.cos(pitch / 2), sp = Math.sin(pitch / 2)
  const cr = Math.cos(-bank / 2), sr = Math.sin(-bank / 2)
  const ax = cy * sp, ay = sy * cp, az = -sy * sp, aw = cy * cp
  q[0] = ax * cr + ay * sr; q[1] = ay * cr - ax * sr
  q[2] = aw * sr + az * cr; q[3] = aw * cr - az * sr
}

// Upright hull envelope enlarged analytically only by the allowed pitch/bank and bob.
// This contains the measured hull at every cosmetic attitude, without a guessed collision box.
const verticalExtent = Math.max(H.draft, H.hullTop)
const halfBeam = H.halfBeam + verticalExtent * Math.sin(H.bank)
const halfLength = H.halfLength + (verticalExtent + H.halfBeam * Math.sin(H.bank)) * Math.sin(H.planingPitch)
const bottom = -H.draft - H.halfLength * Math.sin(H.planingPitch) - H.halfBeam * Math.sin(H.bank) - H.bob
const top = H.hullTop + H.halfLength * Math.sin(H.planingPitch) + H.halfBeam * Math.sin(H.bank) + H.bob
const stride = Math.min(H.draft, H.halfBeam) * 0.5
const nx = 2 * Math.ceil(halfBeam / stride), nz = 2 * Math.ceil(halfLength / stride)

type Pose = { x: number; z: number; yaw: number; y?: number }
function hullClear(world: BoatMovementWorld, pose: Pose, from?: Pose): boolean {
  const { x, z, yaw } = pose
  if (![x, z, yaw, world.half].every(Number.isFinite) || world.half <= 0) return false
  const c = Math.cos(yaw), s = Math.sin(yaw)
  const pc = Math.cos(from?.yaw ?? yaw), ps = Math.sin(from?.yaw ?? yaw)
  // Full footprint grid includes center, all corners and every perimeter edge, not a center ray.
  for (let ix = 0; ix <= nx; ix++) for (let iz = 0; iz <= nz; iz++) {
    const lx = -halfBeam + 2 * halfBeam * ix / nx, lz = -halfLength + 2 * halfLength * iz / nz
    const px = x + c * lx + s * lz, pz = z - s * lx + c * lz
    if (!(Math.abs(px) < world.half && Math.abs(pz) < world.half)) return false
    const ground = world.groundHeight(px, pz)
    if (!Number.isFinite(ground) || ground > H.seaLevel) return false
    if (!(world.isWater ? world.isWater(px, pz) : ground <= H.seaLevel)) return false
    // Ocean-clamped Y=0 cannot tell us depth. Do not mistake that point sea-height for seabed.
    const bed = world.seabedHeight?.(px, pz) ?? (ground < H.seaLevel ? ground : null)
    if (bed !== null && (!Number.isFinite(bed) || H.seaLevel - bed < H.draft)) return false
    const hit = world.segmentHitsBoatSolid
    if (hit) {
      const height = pose.y ?? H.seaLevel + H.waterline
      if (hit.call(world, [px, height + bottom, pz], [px, height + top, pz])) return false
      const ax = (from?.x ?? x) + pc * lx + ps * lz, az = (from?.z ?? z) - ps * lx + pc * lz
      for (const level of [bottom, H.seaLevel, top]) {
        const y = height + level
        if (from && hit.call(world, [ax, (from?.y ?? height) + level, az], [px, y, pz])) return false
        // Continuous cross-hull lines include every perimeter edge. Thin walls cannot hide
        // between stationary stencil columns; isolated sub-cell solids still need an adapter
        // with a conservative solid query, not a claim of exact triangle/body collision here.
        if (iz === 0 && hit.call(world, [px, y, pz], [x + c * lx + s * halfLength, y, z - s * lx + c * halfLength])) return false
        if (ix === 0 && hit.call(world, [px, y, pz], [x + c * halfBeam + s * lz, y, z - s * halfBeam + c * lz])) return false
      }
    }
  }
  return true
}

/** Spawn/motion predicate; yaw positive turns -Z toward -X, matching FlightState.
 * Without a physical segment oracle, features below the <=0.35m stencil resolution are unproven.
 * Without raw seabed, submerged draft clearance is unknown, not certified deep water. */
export function boatNavigable(world: BoatMovementWorld, x: number, z: number, yaw: number): boolean {
  return hullClear(world, { x, z, yaw })
}

/** Mutates only supplied state. Call instead of stepFlight, never in addition to it.
 * Room uses dt=1/60; larger dt subdivides, fractional ticks support CPU partition checks.
 * No accumulator/second clock. Invalid dt throws without mutation; no elapsed time is discarded. */
export function stepBoatMovement(s: BoatKinematics, input: FlightInput, dt: number, world: BoatMovementWorld): void {
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.25) throw new RangeError("boat dt must be finite, 0..0.25 seconds")
  if (s.crashed || dt === 0) return
  if (![...s.position, ...s.velocity, ...s.orientation, ...s.angularVelocity, s.tick].every(Number.isFinite)
      || Math.abs(Math.hypot(...s.orientation) - 1) > 1e-3) throw new RangeError("finite boat state and unit quaternion required")
  const steps = Math.ceil(dt * 60), h = dt / steps
  for (let i = 0; i < steps && !s.crashed; i++) step(s, input, h, world)
}

function step(s: BoatKinematics, inp: FlightInput, dt: number, world: BoatMovementWorld) {
  const p = s.position, v = s.velocity, q = s.orientation, w = s.angularVelocity
  const a = attitude(q)
  let yaw = a.yaw
  s.tick += dt * 60
  // A moving solid entering the unchanged footprint cannot be escaped by steering through it.
  if (!hullClear(world, { x: p[0], z: p[2], yaw, y: p[1] })) {
    const c = Math.abs(Math.cos(yaw)), sn = Math.abs(Math.sin(yaw))
    const outside = Math.abs(p[0]) + c * halfBeam + sn * halfLength >= world.half
      || Math.abs(p[2]) + sn * halfBeam + c * halfLength >= world.half
    s.crashed = outside ? "boundary" : "terrain"
    v.fill(0); w.fill(0)
    return
  }
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw)
  let along = v[0] * fx + v[2] * fz, lateral = v[0] * rx + v[2] * rz
  s.throttle = inp.brake ? 0 : axis(inp.throttle)
  along += (s.throttle * H.thrust - along * (H.drag + H.speedDrag * Math.abs(along) / H.cruise)) * dt
  along = clamp(along, -H.reverse, H.cruise)
  lateral *= Math.exp(-H.lateralDrag * dt)
  if (inp.brake) {
    const dec = H.braking * dt
    along = Math.sign(along) * Math.max(0, Math.abs(along) - dec)
    lateral = Math.sign(lateral) * Math.max(0, Math.abs(lateral) - dec)
  }
  v[0] = fx * along + rx * lateral; v[2] = fz * along + rz * lateral
  const speed = Math.hypot(v[0], v[2]), limit = along < 0 ? H.reverse : H.cruise
  if (speed > limit) { v[0] *= limit / speed; v[2] *= limit / speed }
  let steer = axis(inp.yaw) || axis(inp.roll)
  if (!steer && inp.aim && inp.aim.every(Number.isFinite) && Math.hypot(inp.aim[0], inp.aim[2]) > 1e-6) {
    steer = clamp(-wrapAngle(Math.atan2(-inp.aim[0], -inp.aim[2]) - yaw) * 2, -1, 1)
  }
  w[0] = w[2] = 0
  w[1] = -steer * H.yawRate * clamp(along / H.turnSpeed, -1, 1)
  // Exact retained sweep rule, with denser stencil: translation plus rotating tip travel.
  const count = Math.max(1, Math.ceil((Math.hypot(v[0], v[2]) + Math.abs(w[1]) * Math.hypot(halfLength, halfBeam)) * dt / (stride * 0.5)))
  const h = dt / count
  for (let i = 0; i < count; i++) {
    const from = { x: p[0], z: p[2], yaw, y: p[1] }, nextYaw = yaw + w[1] * h
    if (hullClear(world, { ...from, yaw: nextYaw }, from)) yaw = nextYaw
    else w[1] = 0
    // Retained reversible axis slide. Every accepted leg is swept, including optional solids.
    const x = p[0] + v[0] * h, px = { x: p[0], z: p[2], yaw, y: p[1] }
    if (hullClear(world, { x, z: p[2], yaw, y: p[1] }, px)) p[0] = x
    else v[0] = 0
    const z = p[2] + v[2] * h, pz = { x: p[0], z: p[2], yaw, y: p[1] }
    if (hullClear(world, { x: p[0], z, yaw, y: p[1] }, pz)) p[2] = z
    else v[2] = 0
  }
  const motion = clamp(Math.hypot(v[0], v[2]) / H.cruise, 0, 1), time = s.tick / 60
  const blend = 1 - Math.exp(-H.attitudeRate * dt)
  const pitch = a.pitch + (H.planingPitch * motion - a.pitch) * blend
  const bank = a.bank + (-H.bank * w[1] / H.yawRate * motion - a.bank) * blend
  setAttitude(q, yaw, clamp(pitch, 0, H.planingPitch), clamp(bank, -H.bank, H.bank))
  // Same overdamped legacy response. Bob is room-tick deterministic, not render time/randomness.
  const target = H.seaLevel + H.waterline + H.bob * Math.sin(time * 2.4)
  const error = target - p[1]
  v[1] = clamp(error * (1 - Math.exp(-H.buoyancy * dt)) / dt, -H.verticalLimit, H.verticalLimit)
  const nextY = p[1] + v[1] * dt
  if (world.segmentHitsBoatSolid && !hullClear(world, { x: p[0], z: p[2], yaw, y: nextY }, { x: p[0], z: p[2], yaw, y: p[1] })) {
    s.crashed = "terrain"; v.fill(0); w.fill(0)
    return
  }
  p[1] = nextY
  s.onGround = false; s.gearDown = false
}
