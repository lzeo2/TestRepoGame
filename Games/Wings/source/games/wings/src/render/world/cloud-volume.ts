import { BackSide, BoxGeometry, Group, Mesh, Vector3 } from "three"
import { MeshBasicNodeMaterial } from "three/webgpu"
import {
  Break, Fn, If, Loop, abs, cameraFar, cameraNear, cameraPosition, cameraViewMatrix, clamp,
  exp, float, floor, fract, logarithmicDepthToViewZ, max, min, mix, normalize,
  perspectiveDepthToViewZ, positionWorld, pow, smoothstep, time, uniform,
  vec2, vec3, vec4, viewportDepthTexture,
} from "three/tsl"
import { STORM, vnoise, type N } from "./atmosphere"

export const CLOUD_EXTINCTION = 0.006
export const CLOUD_RANGE = 14_000
export const cloudBudget = (count: number, octaves: number) => count <= 0
  ? { layers: 0, view: 0, light: 0 }
  : { layers: Math.min(2, Math.floor(count)), view: octaves >= 5 ? 28 : 16, light: octaves >= 5 ? 3 : 2 }

// Two independently offset lattice slices, smoothly interpolated in the third dimension.
const noise3 = Fn(([p]: [N]) => {
  const z = floor(p.z), f = fract(p.z)
  const uv = p.xy.add(vec2(37, 113).mul(z))
  return mix(vnoise(uv), vnoise(uv.add(vec2(37, 113))), f.mul(f).mul(float(3).sub(f.mul(2))))
})

// Native viewport copy, not the back-face depth of the proxy box. Three's perspective
// conversion handles reversed depth; its linearDepth helper does NOT decode logarithmic depth.
const opaqueViewDistance = Fn(([], builder: N) => {
  const depth = viewportDepthTexture()
  return (builder.renderer.logarithmicDepthBuffer && !builder.renderer.reversedDepthBuffer
    ? logarithmicDepthToViewZ(depth, cameraNear, cameraFar)
    : perspectiveDepthToViewZ(depth, cameraNear, cameraFar)).negate()
})

/** Bounded world-space participating media. The boxes are ray-entry/exit proxies only. */
export function createCloudLayers(count: number, octaves = 5) {
  const group = new Group()
  group.name = "World · cloud volumes"
  const budget = cloudBudget(count, octaves)
  const resources: { geometry: BoxGeometry; material: MeshBasicNodeMaterial; mesh: Mesh; center: N }[] = []
  for (let layer = 0; layer < budget.layers; layer++) {
    const bottom = 900 + layer * 850, top = bottom + 800
    const center = uniform(new Vector3(0, (bottom + top) / 2, 0))
    const half = vec3(16_000, 400, 16_000)
    const density = Fn(([world]: [N]) => {
      const h = world.y.sub(bottom).div(top - bottom)
      const profile = smoothstep(0, 0.16, h).mul(float(1).sub(smoothstep(0.68, 1, h)))
      const drift = STORM.wind.mul(time)
      const p = vec3(world.x.sub(drift.x), world.y, world.z.sub(drift.y)).mul(0.0015)
      const broad = noise3(p.add(vec3(layer * 13.7, 0, layer * 7.3)))
      const detail = noise3(p.mul(3.1).add(vec3(9.3, 4.2, 17.1)))
      const body = smoothstep(0.38, 0.75, broad.mul(0.82).add(detail.mul(0.18)))
      const edge = float(1).sub(smoothstep(10_000, CLOUD_RANGE, world.xz.sub(cameraPosition.xz).length()))
      return body.mul(profile).mul(edge)
    })
    const rgba = Fn(() => {
      const ray = normalize(positionWorld.sub(cameraPosition)).toVar()
      // A signed epsilon keeps axis-parallel rays finite without flipping their direction.
      const safe = mix(vec3(-1), vec3(1), ray.greaterThanEqual(vec3(0))).mul(max(abs(ray), vec3(1e-5)))
      const a = center.sub(half).sub(cameraPosition).div(safe)
      const b = center.add(half).sub(cameraPosition).div(safe)
      const near = min(a, b), far = max(a, b)
      const entry = max(0, max(near.x, max(near.y, near.z))).toVar()
      const viewCos = max(0.0001, cameraViewMatrix.mul(vec4(ray, 0)).z.negate())
      const exit = min(min(far.x, min(far.y, far.z)), min(CLOUD_RANGE, opaqueViewDistance().div(viewCos))).toVar()
      const radiance = vec3(0).toVar(), transmittance = float(1).toVar()
      If(exit.greaterThan(entry), () => {
        const ds = exit.sub(entry).div(budget.view).toVar()
        // The day/night lane can supply these uniforms; old isolated sources use the break direction.
        const lighting = STORM as typeof STORM & { sunDirection?: N; daylight?: N }
        const sun = normalize(lighting.sunDirection ?? vec3(STORM.breakDir.x, 0.65, STORM.breakDir.y))
        const daylight = lighting.daylight ?? float(1)
        const mu = clamp(ray.dot(sun), -1, 1)
        // Henyey-Greenstein, g=0.55, normalized relative to isotropic scattering.
        const phase = float(1 - 0.55 * 0.55).div(pow(float(1 + 0.55 * 0.55).sub(mu.mul(1.1)), 1.5))
        Loop(budget.view, ({ i }: { i: N }) => {
          const p = cameraPosition.add(ray.mul(entry.add(float(i).add(0.5).mul(ds)))).toVar()
          const rho = density(p).toVar()
          If(rho.greaterThan(0.001), () => {
            const lightDepth = float(0).toVar()
            // Midpoint quadrature towards the sun, capped at 1.2 km even at a low sun.
            const lightStep = float(1200 / budget.light)
            Loop(budget.light, ({ i: j }: { i: N }) => {
              lightDepth.addAssign(density(p.add(sun.mul(float(j).add(0.5).mul(lightStep)))).mul(lightStep))
            })
            const visibility = exp(lightDepth.mul(-CLOUD_EXTINCTION))
            const source = STORM.cloudDark.mul(0.6).add(STORM.cloudLight.mul(visibility).mul(daylight).mul(phase.mul(0.22).add(0.35)))
              .add(STORM.lightning.mul(STORM.flash).mul(pow(max(ray.dot(STORM.flashDir), 0), 8).add(0.08)))
            const attenuation = exp(rho.mul(ds).mul(-CLOUD_EXTINCTION))
            radiance.addAssign(source.mul(transmittance).mul(attenuation.oneMinus()))
            transmittance.mulAssign(attenuation)
          })
          If(transmittance.lessThan(0.01), () => { Break() })
        })
      })
      const alpha = transmittance.oneMinus()
      // Normal alpha blending expects unpremultiplied colour.
      return vec4(radiance.div(max(alpha, 1e-5)), alpha)
    })()
    const geometry = new BoxGeometry(32_000, 800, 32_000)
    const material = new MeshBasicNodeMaterial({ side: BackSide, transparent: true, depthWrite: false, depthTest: false, fog: false })
    material.name = `World · cloud volume ${layer}`
    material.fragmentNode = rgba
    const mesh = new Mesh(geometry, material)
    mesh.name = material.name
    mesh.position.copy(center.value)
    mesh.frustumCulled = false
    // Upper layer first for the usual below-cloud view. Cross-layer sorting remains approximate.
    mesh.renderOrder = 4 - layer * 0.01
    group.add(mesh)
    resources.push({ geometry, material, mesh, center })
  }
  return {
    group,
    update(camera: Vector3) {
      for (const { mesh, center } of resources) {
        mesh.position.x = camera.x; mesh.position.z = camera.z
        center.value.copy(mesh.position)
      }
    },
    dispose() { for (const { geometry, material } of resources) { geometry.dispose(); material.dispose() } },
  }
}
