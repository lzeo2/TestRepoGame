// Hash-pinned application artifact. Contains reviewed deltas, not gated host preimages.
// No writes: the caller must explicitly stage any permitted local candidate; never patch bundles.
import { createHash } from 'node:crypto';
const additions = {
  'src/sim/combat.ts': {
    sha256: '132e99bee97f71671ffc773b3daafdf59e12142193dd177d19b2f2cbef8c1ab0',
    replacements: [
      ['    // Near misses still hurt ships within the blast radius.',
       '    cs.hostFleet?.resolveBombNearMiss?.(p, pos, spec.splash, full * BOMB_NEAR_MISS)\n    // Near misses still hurt ships within the blast radius.'],
      ['bomber: 1, f15: 1, f35: 1 }', 'bomber: 1, f15: 1, f35: 1, f16c: 1, mig29: 1, typhoon: 1, su35s: 1, rafale: 1, jf17: 1, gripen: 1, mig31: 1, mirage2000: 1, su34: 1, fa50: 1, yak130: 1, hawkt2: 1, su25sm: 1, a10c: 1, f35a: 1, j20: 1, tu160: 1, ah64d: 1, mi28n: 1 }'],
      [`/** Hardpoint index (0-based, alternating) of the missile/rocket launched when ammo dropped to \`ammoAfter\`. */
export function launchedHardpoint(weapon: WeaponId, ammoAfter: number): number {
  return ((((WEAPONS[weapon].ammo - ammoAfter - 1) % 2) + 2) % 2)
}`, `/** Launch rail after consuming a round; two rails remain the legacy default. */
export function launchedHardpoint(weapon: WeaponId, ammoAfter: number, railCount = 2): number {
  return ((((WEAPONS[weapon].ammo - ammoAfter - 1) % railCount) + railCount) % railCount)
}`],
      ['/** World-space muzzle / launch position. `hardpoint` alternates missile/rocket rails (0/1). */',
       "/** World-space muzzle / launch position, cycling the model's declared launch rails. */"],
      [`  const point = hardpoints && (spec.kind === "gun" ? hardpoints.gun
    : spec.kind === "missile_lock" || spec.kind === "missile_scanner" ? hardpoints.missiles[seat][hardpoint % 2 === 0 ? 0 : 1] : undefined)`,
       `  const rails = spec.kind === "rockets" ? hardpoints?.rockets
    : spec.kind === "missile_lock" || spec.kind === "missile_scanner" ? hardpoints?.missiles?.[seat] : undefined
  const point = spec.kind === "gun" ? hardpoints?.gun
    : rails?.length ? rails[rails.length === 2 ? (hardpoint % 2 === 0 ? 0 : 1)
      : ((hardpoint % rails.length) + rails.length) % rails.length] : undefined`],
      ['const hp = spec.kind === "rockets" ? launchedHardpoint(spec.id, rt.ammo - 1) : 0',
       'const hp = spec.kind === "rockets" ? launchedHardpoint(spec.id, rt.ammo - 1, VEHICLES[vehicle.kind].hardpoints?.rockets?.length || 2) : 0'],
      ['const hp = launchedHardpoint(spec.id, rt.ammo - 1)',
       'const hp = launchedHardpoint(spec.id, rt.ammo - 1, VEHICLES[vehicle.kind].hardpoints?.missiles?.[seat]?.length || 2)'],
      ['function fireBomb(cs: CombatState, vehicle: VehicleEntity, seat: SeatIndex, spec: WeaponSpec, rt: WeaponRuntime, now: number, events: GameEvent[]): void {',
       `export function bombReleasePosition(vehicle: VehicleEntity, ammoBefore: number, out: Vec3): Vec3 {
  const points = VEHICLES[vehicle.kind].hardpoints?.bombs
  const index = points?.length ? ((WEAPONS.bomb.ammo - Math.floor(ammoBefore)) % points.length + points.length) % points.length : 0
  const point = points?.[index]
  rotate(vehicle.flight.orientation, point?.[0] ?? 0, point?.[1] ?? -3, point?.[2] ?? 0, out)
  for (let i = 0; i < 3; i++) out[i] += vehicle.flight.position[i]
  return out
}

function fireBomb(cs: CombatState, vehicle: VehicleEntity, seat: SeatIndex, spec: WeaponSpec, rt: WeaponRuntime, now: number, events: GameEvent[]): void {`],
      ['  rotate(vehicle.flight.orientation, 0, -3, 0, _muz)\n  const p = vehicle.flight.position, v = vehicle.flight.velocity',
       '  bombReleasePosition(vehicle, rt.ammo, _muz)\n  const v = vehicle.flight.velocity'],
      ['position: [p[0] + _muz[0], p[1] + _muz[1], p[2] + _muz[2]], velocity: [v[0], v[1], v[2]], age: 0, ttl: spec.ttl,',
       'position: [_muz[0], _muz[1], _muz[2]], velocity: [v[0], v[1], v[2]], age: 0, ttl: spec.ttl,'],
      ['import { BOMB_STEP, bombImpactPoint, stepBomb } from "./flight"',
       'import { BOMB_STEP, bombImpactPoint, stepBomb } from "./flight"\nimport { withFleetSurface } from "./fleet-world-query"'],
      ['  const t = segmentHitsGround(p, _sb)',
       '  const native = segmentHitsGround(p, _sb)\n  const fleet = cs.hostFleet?.surfaceSegment?.(p, _sb) ?? null\n  const t = fleet !== null && (native === null || fleet < native) ? fleet : native'],
      ['function bombGuidance(b: ProjectileExt, h: number, now: number): void {',
       'function bombGuidance(cs: CombatState, b: ProjectileExt, h: number, now: number): void {'],
      ['const tf = bombImpactPoint(p, v, _bi, worldQuery)',
       'const tf = bombImpactPoint(p, v, _bi, withFleetSurface(worldQuery, cs.hostFleet?.surfaceHeightAt))'],
      ['bombGuidance(p as ProjectileExt, h, now)', 'bombGuidance(cs, p as ProjectileExt, h, now)'],
      ['  const g = segmentHitsGround(_p0, _p1)\n  if (g === null && p.age <= p.ttl) return\n  if (g === null) { p.age = -1; return }\n  const sh = segmentHitsShipEx(cs, _p0, _p1, now, null)',
       `  const g = segmentHitsGround(_p0, _p1)
  const sh = segmentHitsShipEx(cs, _p0, _p1, now, null)
  // Authenticate even empty flight segments. Native ground/ship ties retain precedence.
  const fleetHit = cs.hostFleet?.resolveProjectile(p, _p0, _p1, Math.min(g ?? 1, sh?.t ?? 1), shipDamageFor(p.weapon))
  if (fleetHit) {
    splash(fleetHit.position, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events)
    p.age = -1
    return // Safe fleet impact owns vessel visuals; no legacy ship near-miss or crater.
  }
  if (g === null && p.age <= p.ttl) return
  if (g === null) { p.age = -1; return }`],
    ],
    lines: [[161, `  /** Trusted original fleet collision adapter; absent in ordinary rooms. */
  hostFleet?: { botTargets?(team: TeamId): readonly import("./bots").BotFleetTarget[]; surfaceHeightAt?(x: number, z: number): number | null; surfaceSegment?(a: Vec3, b: Vec3): number | null; resolveBombNearMiss?(projectile: Projectile, position: Vec3, radius: number, damage: number): boolean | number; resolveProjectile(projectile: Projectile, from: Vec3, to: Vec3, maxFraction: number, damage: number): false | Readonly<{ fraction: number, position: Vec3 }> }
`], [1100, `    // Native aircraft/terrain/ship ties win. The fleet owns fitted damage and safe impact FX.
    const fleetHit = (gun || p.weapon === "rockets") && cs.hostFleet?.resolveProjectile(p, _p0, _p1,
      Math.min(hit.vehicle ? hit.t : 1, g ?? 1, sh?.t ?? 1),
      spec.damage * (gun ? gunRangeFactor(p.weapon, p.age) : 1) * shipScale(p.weapon))
    if (fleetHit) {
      if (!gun) splash(fleetHit.position, p.weapon, p.owner, p.team, p.vehicle, null, vehicles, now, events)
      continue
    }
`]],
  },
  'src/sim/room-engine.ts': {
    sha256: '2ab6279153defefd8551aee684d9358f9d0af5b511c53b0795818cae1102b39b',
    replacements: [
      ['this.combat.missiles, worldQuery, this.combat.ships, this.combat.projectiles)',
       'this.combat.missiles, flightWorld, this.combat.ships, this.combat.projectiles, !!this.combat.hostFleet,\n          this.combat.hostFleet ? this.combat.hostFleet.botTargets?.(v.team) ?? [] : undefined)'],
      ['    const vehicles = this.vehicles\n\n    // One buffered input',
       '    const vehicles = this.vehicles\n    const flightWorld = withFleetSurface(worldQuery, this.combat.hostFleet?.surfaceHeightAt)\n\n    // One buffered input'],
      ['stepFlight(v.flight, pilot ? pilot.flight : NEUTRAL_INPUT, TICK_DT, worldQuery)',
       'stepFlight(v.flight, pilot ? pilot.flight : NEUTRAL_INPUT, TICK_DT, flightWorld)'],
      ['      const ride = this.vehicles.find(v => {\n        if (!v.alive || v.team !== bot.team || v.seats[1] || !v.seats[0]) return false',
       '      const allowedKinds = this.hooks.hostBridge?.aircraftRoster(this, bot.team)\n      const ride = this.vehicles.find(v => {\n        if (!v.alive || v.team !== bot.team || v.seats[1] || !v.seats[0] || (allowedKinds && !allowedKinds.includes(v.kind))) return false'],
      ['      let kind = chooseBotVehicle(bot, teammates, this.vehicles, this.rng)\n      if (!VEHICLES[kind]) kind = VEHICLE_KINDS[Math.floor(this.rng() * VEHICLE_KINDS.length)]',
       '      let kind = chooseBotVehicle(bot, teammates, this.vehicles, this.rng, allowedKinds)\n      if (!kind) continue\n      if (!VEHICLES[kind]) {\n        if (allowedKinds !== undefined) continue\n        kind = VEHICLE_KINDS[Math.floor(this.rng() * VEHICLE_KINDS.length)]\n      }'],
      ['    if (typeof kind !== "string" || !(VEHICLE_KINDS as string[]).includes(kind)) return this.error(p.info.id, "Unknown aircraft kind.")',
       '    if (typeof kind !== "string" || !(VEHICLE_KINDS as string[]).includes(kind)) return this.error(p.info.id, "Unknown aircraft kind.")\n    if (this.hooks.hostBridge && !this.hooks.hostBridge.aircraftRoster(this, p.info.team).includes(kind as VehicleKind))\n      return this.error(p.info.id, "Aircraft unavailable for this faction.")'],
      ['  spawnVehicle(player: PlayerInfo, kind: VehicleKind): VehicleEntity {',
       '  spawnVehicle(player: PlayerInfo, kind: VehicleKind): VehicleEntity {\n    if (this.hooks.hostBridge && (!VEHICLE_KINDS.includes(kind) || !this.hooks.hostBridge.aircraftRoster(this, player.team).includes(kind)))\n      throw new TypeError("Aircraft unavailable for this faction")'],
    ],
    lines: [[19, `import { withFleetSurface } from "./fleet-world-query"
`], [23, `  /** Optional local original bridge, never a client message or remote transport. */
  hostBridge?: {
    aircraftRoster(room: RoomEngine, team: TeamId): readonly VehicleKind[]
    beforeStep(room: RoomEngine): void
    afterStep(room: RoomEngine): { winner: 0 | 1 | null; reason: string } | null
    allow(room: RoomEngine, playerId: string, message: ClientMessage): boolean
    reset(room: RoomEngine): void
    paused(): boolean
    dispose(): void
  }
`], [481, `    if (this.hooks.hostBridge && !this.hooks.hostBridge.allow(this, playerId, message)) {
      if (message.type === "spawn") this.error(playerId, "Aircraft unavailable for this faction.")
      return
    }
`], [828, `    if (this.hooks.hostBridge?.paused()) return
`], [843, `    this.hooks.hostBridge?.beforeStep(this)
`], [934, `    if (this.hooks.hostBridge) {
      const outcome = this.hooks.hostBridge.afterStep(this)
      if (this.matchEndedAt === null && outcome) this.endMatch(outcome.winner, outcome.reason === "time" ? "time" : "carriers-sunk")
      if (this.matchEndedAt !== null && now - this.matchEndedAt >= MATCH_RESTART_DELAY) this.resetMatch()
      return
    }
`], [1078, `    this.hooks.hostBridge?.reset(this)
`]],
  },
  'src/sim/loopback.ts': {
    sha256: '9539442291766edb051b4de538249edf2a098d81218e7a32be7d751e96fddee2',
    lines: [[23, `  hostBridge?: import("./room-engine").RoomEngineHooks["hostBridge"]
`], [57, `    hostBridge: options.hostBridge,
`], [60, `  options.hostBridge?.beforeStep(engine)
`], [82, `      try {
`], [83, `      } finally { options.hostBridge?.dispose() }
`]],
  },
};
export const HOST_FILES = Object.freeze(Object.keys(additions));
export function applyRetainedHostWiring(path, source) {
  const patch = additions[path];
  if (!Object.hasOwn(additions, path) || typeof source !== 'string' ||
      createHash('sha256').update(source).digest('hex') !== patch.sha256)
    throw new Error(`Retained source preimage mismatch: ${path}`);
  const lines = source.split(/(?<=\n)/);
  for (const [line, code] of [...patch.lines].reverse()) lines.splice(line - 1, 0, code);
  source = lines.join('');
  for (const [before, after] of patch.replacements ?? []) {
    if (source.split(before).length !== 2) throw new Error(`Retained source transform mismatch: ${path}`);
    source = source.replace(before, after);
  }
  return source;
}
