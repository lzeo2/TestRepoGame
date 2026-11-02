// Retained native water helpers. Registration and room authority remain with the host.
import type { Quat, SeatIndex, Vec3 } from "./types"
import type { VehicleSpec } from "./vehicles"
import { BoatHandling as H, boatNavigable, type BoatKinematics, type BoatMovementState, type BoatMovementWorld } from "./boat-movement"

export type BoatNativeSpec = Omit<VehicleSpec, "kind" | "flight"> & { kind: "speedboat"; flight: "water" }
/** Retained HP/speed, native cannon20 mechanics. Arcade proposal, not a real armament claim.
 * Exactly one runtime lives at weapons[0][0]; only the pilot may control it. */
export const BOAT_NATIVE_SPEC: BoatNativeSpec = {
  kind: "speedboat", name: "Patrol Speedboat", model: "models/speedboat.glb", flight: "water",
  maxHp: 650, radius: 5, cruise: H.cruise, boost: H.cruise, stall: 0,
  seatWeapons: [["cannon20", null], [null, null]], flares: 0, seatNames: ["Helm", "Unused"],
}
export const BOAT_MODEL = Object.freeze({
  file: "models/speedboat.glb", bytes: 1411020,
  sha256: "7fee0b74e7c746a2dff2b7c4b5bed58c39b9ddbbc0c55592f1eb27941b4f2aee",
  yawNode: "cannon_yaw", pitchNode: "cannon_pitch", muzzleNode: "gun_muzzle", helmNode: "helm_eye",
})
/** Retained game envelope, not a measured mechanical stop or all-angle clearance certification. */
export const BOAT_GUN_LIMITS = Object.freeze({ yaw: 100 * Math.PI / 180, minPitch: -5 * Math.PI / 180, maxPitch: 35 * Math.PI / 180 })
export const BOAT_CAMERA = Object.freeze({ eye: H.helmEye, follow: { dist: H.halfLength * 2.6, height: H.halfBeam * 3 }, gunnerLead: 0, gunnerDrop: 0 })
/** Retained synthesized motor graph proposal for audio/engines.ts, not a jet or a recording. */
export const BOAT_MOTOR = Object.freeze({ loudness: 0.55, referenceDistance: 24,
  fundamental: { wave: "triangle", idleHz: 48, loadHz: 112, idleGain: 0.055, loadGain: 0.09 },
  harmonic: { wave: "sine", multiple: 2, idleGain: 0.018, loadGain: 0.035 },
  mechanical: { noise: "brown", filter: "bandpass", q: 0.8 },
  wash: { noise: "pink", filter: "highpass", q: 0.5 },
})

export type BoatPose = { position: Readonly<Vec3>; orientation: Readonly<Quat> }
export interface BoatGunPose { origin: Vec3; direction: Vec3; yaw: number; pitch: number }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))
function validPose(pose: BoatPose): void {
  if (pose.position.length !== 3 || pose.orientation.length !== 4 ||
    ![...pose.position, ...pose.orientation].every(Number.isFinite) || Math.abs(Math.hypot(...pose.orientation) - 1) > 1e-3)
    throw new RangeError("finite boat pose and unit quaternion required")
}
function rotate(q: Readonly<Quat>, x: number, y: number, z: number, out: Vec3, inverse = false): Vec3 {
  const sign = inverse ? -1 : 1, qx = q[0] * sign, qy = q[1] * sign, qz = q[2] * sign, qw = q[3]
  const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x)
  out[0] = x + qw * tx + qy * tz - qz * ty
  out[1] = y + qw * ty + qz * tx - qx * tz
  out[2] = z + qw * tz + qx * ty - qy * tx
  return out
}
/** Rotates an actual model-space anchor, including full hull pitch/bank, not just heading. */
export function boatWorldPoint(pose: BoatPose, local: readonly number[], out: Vec3 = [0, 0, 0]): Vec3 {
  validPose(pose)
  if (local.length !== 3 || !local.every(Number.isFinite)) throw new RangeError("finite boat anchor required")
  rotate(pose.orientation, local[0], local[1], local[2], out)
  for (let i = 0; i < 3; i++) out[i] += pose.position[i]
  return out
}
/** Shared combat/render pose. yaw is right-positive; render yawNode.y=-yaw, pitchNode.x=pitch.
 * Null/zero aim means hull-forward. Invalid finite pose/aim fails before touching caller output. */
export function boatGunPose(pose: BoatPose, aim: Readonly<Vec3> | null,
  out: BoatGunPose = { origin: [0, 0, 0], direction: [0, 0, -1], yaw: 0, pitch: 0 }): BoatGunPose {
  validPose(pose)
  if (aim && (aim.length !== 3 || !aim.every(Number.isFinite))) throw new RangeError("finite boat gun aim required")
  let yaw = 0, pitch = 0
  if (aim && Math.hypot(...aim) > 1e-9) {
    // Normalize before rotation to avoid overflow from large but finite input vectors.
    const scale = Math.max(...aim.map(Math.abs)), length = Math.hypot(...aim.map(n => n / scale))
    rotate(pose.orientation, aim[0] / scale / length, aim[1] / scale / length, aim[2] / scale / length, out.direction, true)
    yaw = clamp(Math.atan2(out.direction[0], -out.direction[2]), -BOAT_GUN_LIMITS.yaw, BOAT_GUN_LIMITS.yaw)
    pitch = clamp(Math.asin(clamp(out.direction[1], -1, 1)), BOAT_GUN_LIMITS.minPitch, BOAT_GUN_LIMITS.maxPitch)
  }
  const sy = Math.sin(yaw), cy = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch)
  const tipY = H.gunTip[1] * cp - H.gunTip[2] * sp, tipZ = H.gunTip[1] * sp + H.gunTip[2] * cp
  rotate(pose.orientation, H.gunPivot[0] + H.gunTip[0] * cy - tipZ * sy,
    H.gunPivot[1] + tipY, H.gunPivot[2] + H.gunTip[0] * sy + tipZ * cy, out.origin)
  for (let i = 0; i < 3; i++) out.origin[i] += pose.position[i]
  rotate(pose.orientation, sy * cp, sp, -cy * cp, out.direction)
  out.yaw = yaw; out.pitch = pitch
  return out
}

/** Pilot-only control; seat 1 is unavailable and never owns ammo/cooldown at [0][0]. */
export function boatGunController(seats: readonly [string | null, string | null]): SeatIndex | null {
  return seats[0] ? 0 : null
}

/** Validated, stationary water spawn using the existing state/tick fields, not a fake aircraft. */
export function createBoatState(spawn: { position: Vec3; yaw: number }, world: BoatMovementWorld): BoatMovementState {
  if (spawn.position.length !== 3 || !spawn.position.every(Number.isFinite) || !Number.isFinite(spawn.yaw) ||
    Math.abs(spawn.position[1] - H.seaLevel - H.waterline) > 1e-6 || !boatNavigable(world, spawn.position[0], spawn.position[2], spawn.yaw))
    throw new RangeError("boat spawn requires navigable water at the root waterline")
  return { kind: "speedboat", position: [...spawn.position], velocity: [0, 0, 0],
    orientation: [0, Math.sin(spawn.yaw / 2), 0, Math.cos(spawn.yaw / 2)], angularVelocity: [0, 0, 0],
    throttle: 0, onGround: false, gearDown: false, crashed: null, tick: 0 }
}

/** Motion-driven channels shared by retained props/wake and the proposed native motor voice. */
export function boatMotionChannels(state: BoatKinematics, world: BoatMovementWorld) {
  validPose(state)
  if (![...state.velocity, state.throttle].every(Number.isFinite)) throw new RangeError("finite boat motion required")
  const wet = !state.crashed && Math.abs(state.position[1] - H.seaLevel - H.waterline) < 0.35 &&
    (world.isWater?.(state.position[0], state.position[2]) ?? world.groundHeight(state.position[0], state.position[2]) <= H.seaLevel)
  const forward = rotate(state.orientation, 0, 0, -1, [0, 0, 0])
  const speed = Math.hypot(state.velocity[0], state.velocity[2])
  const drive = wet && speed > 0.05 ? clamp((state.velocity[0] * forward[0] + state.velocity[2] * forward[2]) / H.cruise, -1, 1) : 0
  return { wet, load: state.crashed ? 0 : clamp(Math.abs(state.throttle), 0, 1),
    wash: wet ? clamp(speed / H.cruise, 0, 1.3) : 0, drive,
    propLeft: 45 * drive, propRight: -45 * drive,
    wake: wet && speed > 0.3 ? clamp(speed / H.cruise, 0, 1) : 0 }
}
