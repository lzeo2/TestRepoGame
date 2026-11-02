// Input producer only. RoomEngine still owns pilots, clock, weapons, damage, respawn and objectives.
import type { FlightInput, SeatInput, TeamId, Vec3 } from "./types"
import { BoatHandling as H, boatNavigable, type BoatKinematics, type BoatMovementWorld } from "./boat-movement"
import { boatGunPose, boatWorldPoint } from "./boat-native"
import { GUN_FULL_RANGE, leadPoint } from "./combat"
import { WEAPONS } from "./vehicles"

/** Room supplies only current legal visible contacts, never undisclosed fitted enemy poses. */
export interface BoatAITarget {
  readonly id: string
  readonly team: TeamId
  readonly alive: boolean
  readonly visible: boolean
  readonly position: Vec3
  readonly velocity: Vec3
}
export type BoatAIWorld = BoatMovementWorld & {
  /** Actual world LOS including terrain/native/fitted solids and friendlies. The target's own
   * first surface may terminate the ray; no other obstruction may. No visibility grant here. */
  lineOfSight(from: Vec3, to: Vec3, targetId: string): boolean
}
export interface BoatAIOutput { flight: FlightInput; seat: SeatInput; targetId: string | null }
const clamp = (v: number) => Math.max(-1, Math.min(1, v))
const finiteVector = (v: readonly number[]) => v.length === 3 && v.every(Number.isFinite)

/** Bounded local avoidance, not a global pathfinder. Movement remains final collision authority.
 * Predict the signed speed-dependent retained turn, not a stationary hull rotation/aircraft bank. */
function clearCourse(s: BoatKinematics, world: BoatMovementWorld, yaw: number, steer: number, reverse = false): boolean {
  const speed = reverse ? -H.reverse : Math.max(H.turnSpeed, Math.hypot(s.velocity[0], s.velocity[2]))
  const duration = 1.5, steps = Math.ceil(Math.abs(speed) * duration / 1), dt = duration / steps
  const rate = -steer * H.yawRate * clamp(speed / H.turnSpeed)
  let x = s.position[0], z = s.position[2]
  for (let i = 0; i <= steps; i++) {
    if (!boatNavigable(world, x, z, yaw)) return false
    yaw += rate * dt
    x -= Math.sin(yaw) * speed * dt; z -= Math.cos(yaw) * speed * dt
  }
  return true
}

/** Stateless deterministic input for an actual pilot on the existing room tick. No weapon runtime
 * mutation: native combat enforces ammo/readyAt and the room routes this request to the sole owner.
 * No contacts/goal means brake in known water. No safe local course means stop or reverse, not warp. */
export function boatAIInput(s: BoatKinematics, team: TeamId, contacts: readonly BoatAITarget[], world: BoatAIWorld,
  goal: Vec3 | null = null): BoatAIOutput {
  // Validates the common pose even when the contact list is empty.
  const pivot = boatWorldPoint(s, H.gunPivot)
  if (!finiteVector(s.velocity) || !Number.isFinite(s.tick) || s.tick < 0) throw new RangeError("finite boat AI state required")
  const out: BoatAIOutput = {
    flight: { aim: null, throttle: 0, roll: 0, yaw: 0, pitch: 0, boost: false, brake: true },
    seat: { aim: null, firePrimary: false, fireSecondary: false, flares: false, ability: false, viewDelay: 0 }, targetId: null,
  }
  if (s.crashed) return out
  if (goal && !finiteVector(goal)) throw new RangeError("finite boat AI goal required")
  let target: BoatAITarget | null = null, nearest = Infinity
  for (const contact of contacts) {
    if (!contact.visible || !contact.alive || contact.team === team || !contact.id ||
      !finiteVector(contact.position) || !finiteVector(contact.velocity)) continue
    const distance = Math.hypot(...contact.position.map((n, i) => n - s.position[i]))
    if (distance > 1e-6 && (distance < nearest || (distance === nearest && contact.id < (target?.id ?? "")))) {
      target = contact; nearest = distance
    }
  }
  out.targetId = target?.id ?? null
  const destination = target?.position ?? goal
  if (destination) {
    const [qx, qy, qz, qw] = s.orientation
    const yaw = Math.atan2(2 * (qx * qz + qw * qy), 1 - 2 * (qx * qx + qy * qy))
    const desiredYaw = Math.atan2(s.position[0] - destination[0], s.position[2] - destination[2])
    const error = Math.atan2(Math.sin(desiredYaw - yaw), Math.cos(desiredYaw - yaw))
    const desired = clamp(-2 * error)
    const distance = Math.hypot(destination[0] - s.position[0], destination[2] - s.position[2])
    // Engineering standoff, not a new weapon range. Far boats close to native full-damage range.
    if (distance > (target ? GUN_FULL_RANGE * 0.35 : H.halfLength * 2)) {
      const courses = [desired, desired >= 0 ? 1 : -1, desired >= 0 ? -1 : 1, 0]
      const steer = courses.find(value => clearCourse(s, world, yaw, value))
      if (steer !== undefined) {
        out.flight.throttle = Math.abs(error) > Math.PI / 2 ? 0.4 : 1
        out.flight.yaw = steer; out.flight.brake = false
      } else if (clearCourse(s, world, yaw, 0, true)) {
        out.flight.throttle = -0.5; out.flight.brake = false
      }
    }
  }
  if (!target) return out
  const lead: Vec3 = [0, 0, 0], weapon = WEAPONS.cannon20
  // Reuse the actual native inherited-velocity intercept, not a second ballistics implementation.
  const time = leadPoint(pivot, s.velocity, weapon.speed, target.position, target.velocity, lead)
  if (!(time > 0 && time <= weapon.ttl) || !finiteVector(lead)) return out
  let aim: Vec3 = lead.map((n, i) => n - pivot[i]) as Vec3
  const gun = boatGunPose(s, aim)
  const muzzleTime = leadPoint(gun.origin, s.velocity, weapon.speed, target.position, target.velocity, lead)
  if (!(muzzleTime > 0 && muzzleTime <= weapon.ttl) || !finiteVector(lead)) return out
  aim = lead.map((n, i) => n - gun.origin[i]) as Vec3
  const length = Math.hypot(...aim)
  if (!(length > 1e-6 && Number.isFinite(length))) return out
  aim = aim.map(n => n / length) as Vec3
  boatGunPose(s, aim, gun)
  out.seat.aim = aim
  const alignment = gun.direction.reduce((sum, n, i) => sum + n * aim[i], 0)
  out.seat.firePrimary = alignment >= Math.cos(0.01) && world.lineOfSight(gun.origin, lead, target.id)
  return out
}
