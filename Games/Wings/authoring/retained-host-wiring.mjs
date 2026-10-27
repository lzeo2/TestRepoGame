// Add-only, hash-pinned application artifact. Contains original additions, not gated host preimages.
// No writes: the caller must explicitly stage any permitted local candidate; never patch bundles.
import { createHash } from 'node:crypto';
const additions = {
  'src/sim/combat.ts': {
    sha256: '132e99bee97f71671ffc773b3daafdf59e12142193dd177d19b2f2cbef8c1ab0',
    lines: [[161, `  /** Trusted original fleet collision adapter; absent in ordinary rooms. */
  hostFleet?: { resolveProjectile(projectile: Projectile, from: Vec3, to: Vec3, maxFraction: number, damage: number): boolean }
`], [1100, `    // Native aircraft/terrain ties win. Only accepted straight gun rounds enter this bridge.
    if (gun && cs.hostFleet?.resolveProjectile(p, _p0, _p1,
      Math.min(hit.vehicle ? hit.t : 1, g ?? 1, sh?.t ?? 1),
      spec.damage * gunRangeFactor(p.weapon, p.age) * shipScale(p.weapon))) continue
`]],
  },
  'src/sim/room-engine.ts': {
    sha256: '2ab6279153defefd8551aee684d9358f9d0af5b511c53b0795818cae1102b39b',
    lines: [[23, `  /** Optional local original bridge, never a client message or remote transport. */
  hostBridge?: {
    beforeStep(room: RoomEngine): void
    afterStep(room: RoomEngine): { winner: 0 | 1 | null; reason: string } | null
    allow(room: RoomEngine, playerId: string, message: ClientMessage): boolean
    reset(room: RoomEngine): void
    paused(): boolean
    dispose(): void
  }
`], [481, `    if (this.hooks.hostBridge && !this.hooks.hostBridge.allow(this, playerId, message)) return
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
  return lines.join('');
}
