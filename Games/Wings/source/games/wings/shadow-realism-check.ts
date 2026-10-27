import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { CSMShadowNode } from "three/addons/csm/CSMShadowNode.js"
import { DirectionalLight, PCFShadowMap, PerspectiveCamera, RenderTarget, Scene, Vector3, WebGLCoordinateSystem, WebGPUCoordinateSystem } from "three/webgpu"
import { createRealismShadows } from "./src/render/realism-shadows"

type InspectCSM = CSMShadowNode & {
  _init(builder: unknown): void
  _setupFade(): { isNode: boolean }
  _shadowNodes: Array<{
    shadowMap: RenderTarget | null
    setupRenderTarget(shadow: unknown, builder: unknown): { shadowMap: RenderTarget }
    getShadowFilterFn(type: number): unknown
  }>
}
const scene = new Scene(), sun = new DirectionalLight(0xffe3b0, 2.2)
sun.position.set(400, 900, -600)
sun.target.position.set(20, 30, 40)
scene.add(sun, sun.target)
const original = sun.shadow, originalCast = sun.castShadow
const position = sun.position.clone(), target = sun.target.position.clone(), color = sun.color.clone(), intensity = sun.intensity
const camera = new PerspectiveCamera(62, 16 / 9, 0.3, 20_000)
camera.position.set(400, 600, 1000)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()
const shadows = createRealismShadows(sun, "low")
assert.equal(shadows.node, null)
assert.equal(sun.castShadow, false)
const budgets: unknown[] = []
let disposedTargets = 0, targets = 0
for (const [quality, count, size, coordinateSystem, reversedDepthBuffer] of [
  ["balanced", 2, 1024, WebGLCoordinateSystem, false],
  ["high", 3, 2048, WebGPUCoordinateSystem, true],
  ["balanced", 2, 1024, WebGPUCoordinateSystem, false],
] as const) {
  assert.equal(shadows.setQuality(quality), true)
  assert.equal(shadows.setQuality(quality), false)
  const csm = shadows.node as InspectCSM
  assert(csm instanceof CSMShadowNode)
  assert.equal((sun.shadow as unknown as { shadowNode: unknown }).shadowNode, csm)
  assert.equal(csm.cascades, count)
  assert.equal(csm.maxFar, 4000)
  assert.equal(csm.mode, "practical")
  assert.equal(csm.fade, true)
  camera.coordinateSystem = coordinateSystem
  ;(camera as unknown as { _reversedDepth: boolean })._reversedDepth = reversedDepthBuffer
  camera.updateProjectionMatrix()
  // Invoke upstream's real lazy graph initialization with only its two renderer capabilities.
  csm._init({ camera, renderer: { coordinateSystem, reversedDepthBuffer } })
  assert.equal(csm._setupFade().isNode, true)
  shadows.update(camera)
  csm.updateBefore()
  assert.equal(scene.children.filter(o => (o as DirectionalLight).isDirectionalLight).length, 1)
  assert.equal(csm.lights.length, count)
  for (let i = 0; i < count; i++) {
    const cascade = csm.lights[i]
    assert.equal(cascade.shadow.mapSize.x, size)
    assert.equal(cascade.shadow.mapSize.y, size)
    assert(csm.breaks[i] > (csm.breaks[i - 1] ?? 0) && csm.breaks[i] <= 1)
    const expected = i === count - 1 ? 1 : 0.5 * (
      (camera.near + (4000 - camera.near) * (i + 1) / count) / 4000 +
      camera.near * (4000 / camera.near) ** ((i + 1) / count) / 4000)
    assert(Math.abs(csm.breaks[i] - expected) < 1e-12)
    cascade.shadow.updateMatrices(cascade)
    const sc = cascade.shadow.camera
    assert(sc.left < sc.right && sc.bottom < sc.top && sc.far === 12_000)
    for (const p of [...csm.frustums[i].vertices.near, ...csm.frustums[i].vertices.far]) {
      const world = p.clone().applyMatrix4(camera.matrixWorld)
      const local = world.applyMatrix4(sc.matrixWorldInverse)
      const texel = (sc.right - sc.left) / size
      assert(local.x >= sc.left - texel && local.x <= sc.right + texel, "cascade X bounds")
      assert(local.y >= sc.bottom - texel && local.y <= sc.top + texel, "cascade Y bounds")
      assert(-local.z >= sc.near && -local.z <= sc.far, "cascade depth bounds")
    }
    const child = csm._shadowNodes[i]
    assert.equal(typeof child.getShadowFilterFn(PCFShadowMap), "function")
    const { shadowMap } = child.setupRenderTarget(cascade.shadow, {
      renderer: { reversedDepthBuffer },
      createRenderTarget: (w: number, h: number) => new RenderTarget(w, h),
    })
    assert.equal(shadowMap.width, size)
    assert.equal(shadowMap.height, size)
    shadowMap.addEventListener("dispose", () => disposedTargets++)
    child.shadowMap = shadowMap
    targets++
  }
  assert.equal(csm.breaks.at(-1), 1)
  const oldWidth = csm.lights[0].shadow.camera.right
  camera.aspect = 1
  camera.updateProjectionMatrix()
  shadows.update(camera)
  assert.notEqual(csm.lights[0].shadow.camera.right, oldWidth, "resize updates fitted bounds")
  camera.aspect = 16 / 9
  camera.updateProjectionMatrix()
  camera.position.add(new Vector3(30, 20, -40))
  camera.updateMatrixWorld()
  shadows.update(camera)
  csm.updateBefore()
  assert(csm.lights.every(l => l.position.toArray().every(Number.isFinite)))
  budgets.push({ quality, cascades: count, mapSize: size, mapTexels: count * size * size,
    estimatedRGBA8Depth32Bytes: count * size * size * 8 })
}
assert.equal(shadows.setQuality("low"), true)
assert.equal(disposedTargets, targets, "all real render targets disposed on quality changes")
assert.equal(scene.children.length, 2, "no cascade objects or targets leaked")
assert.equal(sun.shadow, original)
assert.equal(sun.castShadow, false)
shadows.dispose()
shadows.dispose()
assert.equal(sun.shadow, original)
assert.equal(sun.castShadow, originalCast)
assert(sun.position.equals(position) && sun.target.position.equals(target) && sun.color.equals(color))
assert.equal(sun.intensity, intensity)
assert.throws(() => shadows.setQuality("high"), /disposed/)
console.log(JSON.stringify({ pass: true, graphCases: 3, disposedTargets, budgets,
  trianglesAdded: 0, geometry: "unchanged; helper creates no geometry; shadow passes redraw existing casters",
  sourceBytes: ["src/render/realism-shadows.ts", "shadow-realism-check.ts"].map(p => ({ path: p, bytes: readFileSync(`games/wings/${p}`).length })),
  fps: "unmeasured; no GPU", pcss: "unavailable in inspected native TSL; PCF is fixed-radius, not variable penumbra" }, null, 2))
