// Storm sky (TSL): a camera-centred dome with layered moving storm clouds and bright breaks near the
// horizon, optional cloud-deck layers you can fly above/below/through, and lightning (bolt mesh +
// cloud/sea illumination via shared uniforms + a flash value the post pipeline can read).
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, DoubleSide, Mesh, SphereGeometry, Vector3,
} from "three"
import { MeshBasicNodeMaterial } from "three/webgpu"
import {
  float, normalize, positionLocal, uniform, vec3,
} from "three/tsl"
import { STORM, stormSky } from "./atmosphere"
import { LIGHTNING_COLOR } from "./palette"
import { linear } from "./atmosphere"

export function createSky() {
  const geometry = new SphereGeometry(1000, 48, 24)
  const material = new MeshBasicNodeMaterial({ side: BackSide, depthWrite: false, depthTest: false, fog: false })
  material.name = "World · storm sky"
  material.colorNode = stormSky(normalize(positionLocal), 5)
  const mesh = new Mesh(geometry, material)
  mesh.name = "World · sky dome"
  mesh.renderOrder = -1000
  mesh.frustumCulled = false
  return {
    mesh,
    update(camera: Vector3, _time: number) { mesh.position.copy(camera) },
    dispose() { geometry.dispose(); material.dispose() },
  }
}

export { createCloudLayers } from "./cloud-volume"

/** Lightning: first strike at 8 s, then every 19 s of absolute simulation time. */
export function createLightning() {
  const boltIntensity = uniform(0)
  const material = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide })
  material.name = "World · lightning bolt"
  const lc = linear(LIGHTNING_COLOR)
  material.colorNode = vec3(lc.r, lc.g, lc.b).mul(boltIntensity.mul(40))
  material.opacityNode = float(1)
  const geometry = new BufferGeometry()
  const mesh = new Mesh(geometry, material)
  mesh.name = "World · lightning"
  mesh.frustumCulled = false
  mesh.visible = false
  mesh.renderOrder = 6

  let clock = 0, strikeAt = -Infinity
  let flash = 0
  let currentIndex = -1, builtIndex = -1, latestIndex = -1
  let pendingStrike = false, debugIndex = -1
  let override: { at: number; index: number } | null = null
  const strikeDir = new Vector3()
  const strikePos = new Vector3()
  const listeners = new Set<(intensity: number, direction: Vector3) => void>()

  function buildBolt(camera: Vector3, index: number, visible: boolean) {
    let sample = 0
    // Local arithmetic samples reset for each strike, independent of update/seek history.
    const sampleBolt = () => {
      const n = Math.sin((index + 1) * 127.1 + ++sample * 311.7) * 43758.5453123
      return n - Math.floor(n)
    }
    const ang = sampleBolt() * Math.PI * 2, dist = 2200 + sampleBolt() * 5000
    const x0 = camera.x + Math.cos(ang) * dist, z0 = camera.z + Math.sin(ang) * dist
    const top = 1100 + sampleBolt() * 500
    strikeDir.set(x0 - camera.x, top * 0.7 - camera.y, z0 - camera.z).normalize()
    strikePos.set(x0, top * 0.5, z0)
    if (!visible) return
    const segs: [Vector3, Vector3, number][] = []
    const walk = (start: Vector3, endY: number, steps: number, width: number, branchChance: number) => {
      let p = start.clone()
      const stepY = (start.y - endY) / steps
      for (let i = 0; i < steps; i++) {
        const q = new Vector3(p.x + (sampleBolt() - 0.5) * stepY * 0.9, p.y - stepY * (0.7 + sampleBolt() * 0.6), p.z + (sampleBolt() - 0.5) * stepY * 0.9)
        if (i === steps - 1) q.y = endY
        segs.push([p, q, width])
        if (sampleBolt() < branchChance) walk(q, Math.max(endY, q.y - stepY * (3 + sampleBolt() * 5)), 4 + Math.floor(sampleBolt() * 4), width * 0.55, 0)
        p = q
      }
    }
    walk(new Vector3(x0, top, z0), 0, 18, 1, 0.22)
    const pos = new Float32Array(segs.length * 18)
    let o = 0
    const dir = new Vector3(), toCam = new Vector3(), side = new Vector3()
    for (const [a, b, w] of segs) {
      dir.subVectors(b, a).normalize()
      toCam.subVectors(camera, a).normalize()
      const width = w * Math.max(2, a.distanceTo(camera) * 0.0016)
      side.crossVectors(dir, toCam).normalize().multiplyScalar(width)
      const v = [a.clone().sub(side), a.clone().add(side), b.clone().add(side), a.clone().sub(side), b.clone().add(side), b.clone().sub(side)]
      for (const p of v) { pos[o++] = p.x; pos[o++] = p.y; pos[o++] = p.z }
    }
    geometry.setAttribute("position", new BufferAttribute(pos, 3))
    geometry.computeBoundingSphere()
  }

  /** Flash envelope: a bright stroke, a flicker and a re-strike, then a fading afterglow. */
  function envelope(t: number): number {
    if (t < 0) return 0
    if (t < 0.07) return 1
    if (t < 0.13) return 0.25
    if (t < 0.21) return 0.85
    if (t < 0.26) return 0.3
    if (t < 0.32) return 0.6
    return Math.max(0, 0.45 * Math.exp(-(t - 0.32) * 7))
  }

  return {
    mesh,
    /** Current flash intensity 0..1. */
    get value() { return flash },
    get direction() { return strikeDir },
    /** World position of the current/last strike (mid-bolt) and seconds since it happened. */
    get position() { return strikePos },
    get age() { return clock - strikeAt },
    onStrike(cb: (intensity: number, direction: Vector3) => void) { listeners.add(cb); return () => listeners.delete(cb) },
    /** Force a deterministic strike on the next update (debug / preview). */
    strike(camera: Vector3) { pendingStrike = true; void camera },
    update(simulationTime: number, camera: Vector3) {
      clock = simulationTime
      const scheduledIndex = clock < 8 ? -1 : Math.floor((clock - 8) / 19)
      const scheduledAt = scheduledIndex < 0 ? -Infinity : 8 + scheduledIndex * 19
      if (override && (clock < override.at || scheduledAt > override.at)) override = null
      if (pendingStrike) {
        override = { at: clock, index: --debugIndex }
        pendingStrike = false
      }
      const index = override?.index ?? scheduledIndex
      strikeAt = override?.at ?? scheduledAt
      const t = clock - strikeAt
      flash = envelope(t)
      mesh.visible = t >= 0 && t < 0.34
      if (index !== -1 && (index !== currentIndex || (mesh.visible && index !== builtIndex))) {
        buildBolt(camera, index, mesh.visible)
        if (mesh.visible) builtIndex = index
      }
      // A high-water mark prevents repeated audio/events after resampling or rewinding.
      const notify = mesh.visible && (override ? index !== currentIndex : scheduledIndex > latestIndex)
      currentIndex = index
      latestIndex = Math.max(latestIndex, scheduledIndex)
      if (notify) for (const l of listeners) l(1, strikeDir)
      boltIntensity.value = mesh.visible ? Math.max(0.15, flash) : 0
      STORM.flash.value = flash
      STORM.flashDir.value.copy(strikeDir)
      return flash
    },
    dispose() { geometry.dispose(); material.dispose() },
  }
}
