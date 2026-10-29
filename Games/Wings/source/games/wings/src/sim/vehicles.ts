// Vehicle + weapon tuning tables. Owned by the orchestrator; agents may propose numbers.
import type { FlightModel, VehicleKind, WeaponId, Vec3 } from "./types"
import fighterPair from "../../../../../authoring/native-fighter-pair.json" with { type: "json" }
import helicopterPair from "../../../../../authoring/native-helicopter-pair.json" with { type: "json" }
import bomberModels from "../../../../../authoring/native-tu160.json" with { type: "json" }

interface NativeFighterModel {
  source_model_id: string
  source_sha256: string
  file: string
  sha256: string
  bounds: { min: Vec3; max: Vec3 }
  hardpoints: { gun: Vec3; missiles: [[Vec3, Vec3], [Vec3, Vec3]] }
  cockpit: Vec3
  /** false opts out of native afterburner VFX, not real engine capability. */
  afterburning?: boolean
  exhausts: { node: string; anchor: string; position: Vec3 }[]
  controls: { node: string; axis: "x" | "y" | "z"; driver: "pitch" | "roll" | "yaw"; gain: number; pitch_gain?: number; max_rad: number }[]
  native_pivots: string[]
}

export type NativeFighterKind = "f16c" | "mig29" | "typhoon" | "su35s" | "rafale" | "jf17" | "gripen" | "mig31" | "mirage2000" | "su34" | "fa50" | "yak130" | "hawkt2" | "su25sm" | "a10c" | "f35a" | "j20"
export const NATIVE_FIGHTER_MODELS = fighterPair.models as Record<NativeFighterKind, NativeFighterModel>
export const NATIVE_BOMBER_MODELS = bomberModels.models as unknown as Record<"tu160", Omit<NativeFighterModel, "hardpoints"> & { hardpoints: { bombs: Vec3[] }; frozen_nodes: string[] }>

export type NativeHelicopterKind = "ah64d" | "mi28n"
interface NativeHelicopterModel {
  source_model_id: string
  source_sha256: string
  file: string
  sha256: string
  /** Full rotor-swept envelope, not just the parked-blade pose. */
  bounds: { min: Vec3; max: Vec3 }
  cockpit: Vec3
  hardpoints: { rockets: Vec3[]; missiles: [Vec3[], Vec3[]] }
  rotors: { node: string; axis: "x" | "y" | "z"; speed: number; driver: "rotor" }[]
  native_pivots: string[]
  exhausts: []
}
export const NATIVE_HELICOPTER_MODELS = helicopterPair.models as Record<NativeHelicopterKind, NativeHelicopterModel>

/**
 * gun / rockets: fire while held.
 * missile_lock: lock-on by holding the seat's aim (pilot: nose) on a target for `lockTime`; fire-and-forget homing.
 * missile_scanner: operator keeps the scanner reticle on the target; lock builds over `lockTime`; after launch the
 *   missile only homes while the scanner stays within `lockCone` of its target (semi-active guidance). Long range, slow to deliver.
 * pulse: radar pulse ability (spots enemies).
 */
export type WeaponKind = "gun" | "rockets" | "missile_lock" | "missile_scanner" | "pulse" | "bomb"

export interface WeaponSpec {
  id: WeaponId
  name: string
  kind: WeaponKind
  damage: number
  /** Splash radius in meters (0 = direct hit only). */
  splash: number
  /** Shots per second while held (guns/rockets) or shots per second for missiles (reload = 1 / rate). */
  rate: number
  /** Muzzle/launch speed m/s (added to shooter velocity). */
  speed: number
  /** Max flight time seconds. */
  ttl: number
  /** Magazine size. -1 = unlimited (JSON-safe). */
  ammo: number
  /** Seconds to refill a completely empty magazine (ammo regenerates continuously at ammo / refill per second). */
  refill: number
  /** Seconds after the last shot before regeneration starts. */
  refillDelay: number
  /** Max lock/effective range in meters (missiles). */
  range?: number
  /** Missiles: seeker/scanner cone half-angle (rad) and seconds to achieve lock. */
  lockCone?: number
  lockTime?: number
  /** Missiles: max turn rate rad/s. */
  turnRate?: number
  /** Guns: spread in radians. */
  spread?: number
  /** Gunner weapons: true if aimed freely by seat aim (turret / pod / scanner), false if fixed forward. */
  turret?: boolean
}

export interface VehicleSpec {
  kind: VehicleKind
  name: string
  model: string // path under public/models
  flight: FlightModel
  maxHp: number
  /** Bounding sphere radius used for hit detection, meters. */
  radius: number
  cruise: number // m/s
  boost: number // m/s
  /** Takeoff/stall speed for jets (m/s). */
  stall: number
  /** seatWeapons[seat] = [primary, secondary]; null = no weapon in that slot. */
  seatWeapons: [[WeaponId | null, WeaponId | null], [WeaponId | null, WeaponId | null]]
  flares: number
  seatNames: [string, string]
  /** Stealth airframe (see STEALTH_* rules). */
  stealth?: boolean
  /** Model-derived local launch points; original aircraft retain their existing rails. */
  hardpoints?: { gun?: Vec3; missiles?: [Vec3[], Vec3[]]; rockets?: Vec3[]; bombs?: Vec3[] }
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  cannon20: { id: "cannon20", name: "20mm Vulcan", kind: "gun", damage: 9, splash: 0, rate: 16, speed: 1150, ttl: 1.15, ammo: 600, refill: 15, refillDelay: 2, spread: 0.0025 },
  chaingun30: { id: "chaingun30", name: "30mm Chain Gun", kind: "gun", damage: 16, splash: 4, rate: 10, speed: 900, ttl: 1.5, ammo: 300, refill: 15, refillDelay: 2, spread: 0.004, turret: true },
  gau8: { id: "gau8", name: "GAU-8 Avenger", kind: "gun", damage: 14, splash: 2, rate: 30, speed: 1100, ttl: 1.2, ammo: 1100, refill: 15, refillDelay: 2, spread: 0.005 },
  rockets: { id: "rockets", name: "Hydra 70 Rockets", kind: "rockets", damage: 60, splash: 12, rate: 8, speed: 700, ttl: 4, ammo: 38, refill: 20, refillDelay: 2, spread: 0.015 },
  aim9: { id: "aim9", name: "Heat-Seeker", kind: "missile_lock", damage: 120, splash: 12, rate: 0.25, speed: 280, ttl: 6, ammo: 2, refill: 40, refillDelay: 4, range: 1100, lockCone: 0.08, lockTime: 2.2, turnRate: 1.6 },
  tvmissile: { id: "tvmissile", name: "Radar Missile", kind: "missile_lock", damage: 130, splash: 12, rate: 0.2, speed: 300, ttl: 7, ammo: 2, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.5, turret: true },
  hellfire: { id: "hellfire", name: "Hellfire", kind: "missile_lock", damage: 130, splash: 12, rate: 0.25, speed: 260, ttl: 8, ammo: 4, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.5, turret: true },
  maverick: { id: "maverick", name: "Maverick", kind: "missile_lock", damage: 150, splash: 14, rate: 0.2, speed: 280, ttl: 8, ammo: 2, refill: 40, refillDelay: 4, range: 1500, lockCone: 0.07, lockTime: 2.5, turnRate: 1.4, turret: true },
  aim47: { id: "aim47", name: "Long-Range Interceptor", kind: "missile_scanner", damage: 160, splash: 16, rate: 0.2, speed: 450, ttl: 22, ammo: 3, refill: 50, refillDelay: 5, range: 8000, lockCone: 0.08, lockTime: 3, turnRate: 1.3, turret: true },
  bomb: { id: "bomb", name: "Bomb", kind: "bomb", damage: 900, splash: 45, rate: 0.6, speed: 0, ttl: 40, ammo: 8, refill: 60, refillDelay: 6, turret: true },
  radarpulse: { id: "radarpulse", name: "Radar Pulse", kind: "pulse", damage: 0, splash: 4000, rate: 1 / 20, speed: 0, ttl: 8, ammo: -1, refill: 0, refillDelay: 0, turret: true },
}

/**
 * Stealth rules (enforced by combat + room engine + HUD):
 * - Unspotted stealth enemies are hidden from a team's snapshots unless within 800 m of that team.
 * - Locking an unspotted stealth aircraft takes STEALTH_LOCK_TIME; completing it spots it for STEALTH_LOCK_SPOT s.
 * - Fleet AA never engages stealth aircraft above STEALTH_AA_CEILING (fleet AA otherwise reaches ~1200 m slant range,
 *   so the ceiling must be well below that to matter).
 */
export const STEALTH_AA_CEILING = 600
export const STEALTH_LOCK_TIME = 4
export const STEALTH_LOCK_SPOT = 8

const ORIGINAL_VEHICLES: Record<Exclude<VehicleKind, "f15" | "f35" | "tu160" | NativeFighterKind | NativeHelicopterKind>, VehicleSpec> = {
  fighter: {
    kind: "fighter", name: "F/A-18F Super Hornet", model: "models/fa18.glb", flight: "jet",
    maxHp: 450, radius: 8, cruise: 135, boost: 185, stall: 55,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]], flares: 12,
    seatNames: ["Pilot", "Weapons Officer"],
  },
  apache: {
    kind: "apache", name: "AH-64 Apache", model: "models/apache.glb", flight: "heli",
    maxHp: 550, radius: 7.5, cruise: 75, boost: 98, stall: 0,
    seatWeapons: [["rockets", null], ["chaingun30", "hellfire"]], flares: 10,
    seatNames: ["Pilot", "Gunner"],
  },
  warthog: {
    kind: "warthog", name: "A-10 Warthog", model: "models/a10.glb", flight: "jet",
    maxHp: 850, radius: 8.5, cruise: 105, boost: 135, stall: 45,
    seatWeapons: [["gau8", "rockets"], ["maverick", null]], flares: 16,
    seatNames: ["Pilot", "Weapons Officer"],
  },
  blackbird: {
    kind: "blackbird", name: "YF-12 Blackbird", model: "models/yf12.glb", flight: "jet",
    maxHp: 380, radius: 12, cruise: 190, boost: 260, stall: 75,
    seatWeapons: [[null, null], ["aim47", "radarpulse"]], flares: 8,
    seatNames: ["Pilot", "Radar Officer"],
  },
  bomber: {
    kind: "bomber", name: "B-2 Spirit", model: "models/b2.glb", flight: "jet",
    maxHp: 900, radius: 18, cruise: 150, boost: 180, stall: 70,
    seatWeapons: [["bomb", null], ["bomb", null]], flares: 10,
    seatNames: ["Pilot", "Bombardier"], stealth: true,
  },
}

export const VEHICLES: Record<VehicleKind, VehicleSpec> = {
  ...ORIGINAL_VEHICLES,
  f15: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "f15", name: "F-15", model: "models/f15.glb",
    cruise: 155, boost: 215,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: {
      gun: [1.03, .27, -4.098162162162],
      missiles: [
        [[-4.25, -.40, 1.313513513514], [4.25, -.40, 1.313513513514]],
        [[-2.55, -.48, .105081081081], [2.55, -.48, .105081081081]],
      ],
    },
  },
  f35: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "f35", name: "F-35", model: "models/f35.glb",
    cruise: 130, boost: 180,
    seatWeapons: [["cannon20", "tvmissile"], ["tvmissile", null]],
    stealth: true,
    hardpoints: {
      gun: [-.958962264151, .53, -3.14],
      missiles: [
        [[-.918584905660, -.15, .397733333333], [.918584905660, -.15, .397733333333]],
        [[-.535, -.15, -.1256], [.535, -.15, -.1256]],
      ],
    },
  },
  // Approved arcade proposals, not real performance or operational weapon fits.
  f16c: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "f16c", name: "F-16C", model: NATIVE_FIGHTER_MODELS.f16c.file,
    cruise: 150, boost: 210,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.f16c.hardpoints,
  },
  mig29: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "mig29", name: "MiG-29", model: NATIVE_FIGHTER_MODELS.mig29.file,
    cruise: 145, boost: 205,
    // cannon20 reuses native arcade mechanics, not a MiG gun-caliber claim.
    seatWeapons: [["cannon20", "aim9"], ["aim9", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.mig29.hardpoints,
  },
  typhoon: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "typhoon", name: "Eurofighter Typhoon", model: NATIVE_FIGHTER_MODELS.typhoon.file,
    cruise: 155, boost: 215, stall: 60,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.typhoon.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.typhoon.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.typhoon.hardpoints,
  },
  su35s: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "su35s", name: "Su-35S", model: NATIVE_FIGHTER_MODELS.su35s.file,
    cruise: 155, boost: 215,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.su35s.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.su35s.bounds.min[i])) / 2,
    // Four visible stores: two air-to-air and two strike rounds, not the proposed six.
    seatWeapons: [["cannon20", "tvmissile"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.su35s.hardpoints,
  },
  rafale: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "rafale", name: "Rafale C", model: NATIVE_FIGHTER_MODELS.rafale.file,
    cruise: 145, boost: 200,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.rafale.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.rafale.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.rafale.hardpoints,
  },
  jf17: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "jf17", name: "JF-17 Block III", model: NATIVE_FIGHTER_MODELS.jf17.file,
    cruise: 135, boost: 190,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.jf17.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.jf17.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.jf17.hardpoints,
  },
  gripen: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "gripen", name: "JAS 39C Gripen", model: NATIVE_FIGHTER_MODELS.gripen.file,
    cruise: 140, boost: 195, stall: 50,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.gripen.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.gripen.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.gripen.hardpoints,
  },
  mig31: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "mig31", name: "MiG-31BM", model: NATIVE_FIGHTER_MODELS.mig31.file,
    cruise: 185, boost: 250, stall: 70,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.mig31.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.mig31.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.mig31.hardpoints,
  },
  mirage2000: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "mirage2000", name: "Mirage 2000C", model: NATIVE_FIGHTER_MODELS.mirage2000.file,
    cruise: 145, boost: 205, stall: 58,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.mirage2000.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.mirage2000.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.mirage2000.hardpoints,
  },
  su34: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "su34", name: "Su-34", model: NATIVE_FIGHTER_MODELS.su34.file,
    cruise: 140, boost: 190, stall: 65, maxHp: 550,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.su34.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.su34.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.su34.hardpoints,
  },
  fa50: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "fa50", name: "FA-50", model: NATIVE_FIGHTER_MODELS.fa50.file,
    cruise: 130, boost: 180, stall: 50,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.fa50.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.fa50.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.fa50.hardpoints,
  },
  yak130: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "yak130", name: "Yak-130", model: NATIVE_FIGHTER_MODELS.yak130.file,
    // Native boost is an arcade acceleration aid, not a real afterburner.
    cruise: 105, boost: 140, stall: 45,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.yak130.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.yak130.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.yak130.hardpoints,
  },
  hawkt2: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "hawkt2", name: "Hawk T2", model: NATIVE_FIGHTER_MODELS.hawkt2.file,
    // Native boost is an arcade power aid, not a real afterburner.
    cruise: 95, boost: 125, stall: 42,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.hawkt2.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.hawkt2.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.hawkt2.hardpoints,
  },
  su25sm: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "su25sm", name: "Su-25SM", model: NATIVE_FIGHTER_MODELS.su25sm.file,
    // Ground-attack arcade proposal, not measured SM performance or certified armor.
    // Boost is a native power aid, not an afterburner; cannon20 is not a caliber claim.
    cruise: 100, boost: 130, stall: 44, maxHp: 550,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.su25sm.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.su25sm.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.su25sm.hardpoints,
  },
  a10c: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "a10c", name: "A-10C", model: NATIVE_FIGHTER_MODELS.a10c.file,
    // Conservative ground-attack arcade proposal, not measured C performance or certified armor.
    // Boost is a power aid, not afterburning. The generic source barrel is not a rotary GAU-8 rig.
    cruise: 90, boost: 115, stall: 42, maxHp: 600,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.a10c.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.a10c.bounds.min[i])) / 2,
    seatWeapons: [["gau8", "aim9"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.a10c.hardpoints,
  },
  f35a: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "f35a", name: "F-35A", model: NATIVE_FIGHTER_MODELS.f35a.file,
    // Land-based A arcade proposal, not certified performance or an operational fit.
    // Four external generic stores; no stealth. Real afterburning is not modeled here.
    cruise: 145, boost: 200, stall: 55, maxHp: 450,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.f35a.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.f35a.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "aim9"], ["tvmissile", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.f35a.hardpoints,
  },
  j20: {
    ...ORIGINAL_VEHICLES.fighter,
    kind: "j20", name: "J-20", model: NATIVE_FIGHTER_MODELS.j20.file,
    // Long-fighter arcade proposal, not certified performance or an operational fit.
    // Four external generic stores and under-nose gun adapter, not verified real armament.
    // No stealth or bays; real engine afterburning is not modeled.
    cruise: 160, boost: 220, stall: 60, maxHp: 450,
    radius: Math.max(...NATIVE_FIGHTER_MODELS.j20.bounds.max.map((v, i) => v - NATIVE_FIGHTER_MODELS.j20.bounds.min[i])) / 2,
    seatWeapons: [["cannon20", "tvmissile"], ["maverick", null]],
    hardpoints: NATIVE_FIGHTER_MODELS.j20.hardpoints,
  },
  tu160: {
    kind: "tu160", name: "Tu-160", model: NATIVE_BOMBER_MODELS.tu160.file, flight: "jet",
    // Conservative heavy-bomber arcade tuning, not certified performance or an operational fit.
    // Eight external generic bombs share one native load; no gun, stealth, bays or animated sweep.
    cruise: 155, boost: 210, stall: 65, maxHp: 800,
    radius: Math.max(...NATIVE_BOMBER_MODELS.tu160.bounds.max.map((v, i) => v - NATIVE_BOMBER_MODELS.tu160.bounds.min[i])) / 2,
    seatWeapons: [["bomb", null], ["bomb", null]], flares: 10,
    seatNames: ["Pilot", "Bombardier"], hardpoints: NATIVE_BOMBER_MODELS.tu160.hardpoints,
  },
  ah64d: {
    ...ORIGINAL_VEHICLES.apache,
    kind: "ah64d", name: "AH-64D", model: NATIVE_HELICOPTER_MODELS.ah64d.file,
    // Conservative arcade proposals, not measured performance or a certified fit.
    cruise: 70, boost: 92, maxHp: 550,
    radius: Math.max(...NATIVE_HELICOPTER_MODELS.ah64d.bounds.max.map((v, i) => v - NATIVE_HELICOPTER_MODELS.ah64d.bounds.min[i])) / 2,
    seatWeapons: [["rockets", null], ["hellfire", null]],
    hardpoints: NATIVE_HELICOPTER_MODELS.ah64d.hardpoints,
  },
  mi28n: {
    ...ORIGINAL_VEHICLES.apache,
    kind: "mi28n", name: "Mi-28N", model: NATIVE_HELICOPTER_MODELS.mi28n.file,
    cruise: 68, boost: 90, maxHp: 600,
    radius: Math.max(...NATIVE_HELICOPTER_MODELS.mi28n.bounds.max.map((v, i) => v - NATIVE_HELICOPTER_MODELS.mi28n.bounds.min[i])) / 2,
    // Hellfire is a fictional arcade fit, not real Mi-28N weapon compatibility.
    seatWeapons: [["rockets", null], ["hellfire", null]],
    hardpoints: NATIVE_HELICOPTER_MODELS.mi28n.hardpoints,
  },

}

export const VEHICLE_KINDS = Object.keys(VEHICLES) as VehicleKind[]

/** Bomb UI and ordinary bomber AI follow the fitted native weapon, not the artwork name. */
export function hasBombLoad(kind: VehicleKind | undefined): boolean {
  return !!kind && VEHICLES[kind].seatWeapons.some(seat => seat.some(id => id !== null && WEAPONS[id].kind === "bomb"))
}
