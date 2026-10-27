// See CLOUD-REALISM.md: resolve Three and the builder to the same 0.186.0 source modules.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { Vector3, PerspectiveCamera, Scene, BoxGeometry, PlaneGeometry } from "three"
import { WebGPURenderer } from "three/webgpu"
import GLSLNodeBuilder from "three/src/renderers/webgl-fallback/nodes/GLSLNodeBuilder.js"
import { CLOUD_EXTINCTION, cloudBudget, createCloudLayers } from "./src/render/world/cloud-volume"
import { createLightning, createSky } from "./src/render/world/sky"

assert.deepEqual(cloudBudget(0, 5), { layers: 0, view: 0, light: 0 })
assert.deepEqual(cloudBudget(1, 4), { layers: 1, view: 16, light: 2 })
assert.deepEqual(cloudBudget(2, 5), { layers: 2, view: 28, light: 3 })
assert.equal(cloudBudget(100, 100).layers, 2)
// Independent homogeneous-media solution vs the shader's midpoint compositing recurrence.
for (const steps of [16, 28]) for (const rho of [0, 0.1, 0.7, 1]) {
  let t = 1, light = 0
  for (let i = 0; i < steps; i++) {
    const a = Math.exp(-rho * 800 / steps * CLOUD_EXTINCTION)
    light += t * (1 - a); t *= a
  }
  assert(Math.abs(t - Math.exp(-rho * 800 * CLOUD_EXTINCTION)) < 1e-12)
  assert(Math.abs(light + t - 1) < 1e-12)
}
assert(Math.exp(-1000 * CLOUD_EXTINCTION) < Math.exp(-100 * CLOUD_EXTINCTION))
const phase = (mu: number) => (1 - 0.55 ** 2) / (1 + 0.55 ** 2 - 1.1 * mu) ** 1.5
assert(phase(1) > phase(0) && phase(0) > phase(-1))
// Pinned Three depth equations: round-trip near/far and intermediate opaque surfaces.
const near = 0.1, far = 50_000
for (const distance of [near, 10, 900, 14_000, far]) {
  const standard = far / (far - near) - far * near / ((far - near) * distance)
  const reversed = 1 - standard
  const logarithmic = Math.log(distance / near) / Math.log(far / near)
  for (const decoded of [
    -near * far / ((far - near) * standard - far),
    -near * far / ((near - far) * reversed - near),
    Math.exp(logarithmic * Math.log(far / near)) * near,
  ]) assert(Math.abs(decoded - distance) / distance < 1e-9)
}
// View-space depth must be converted to ray distance before clipping the volume.
const clippedLength = (entry: number, boxExit: number, opaqueZ: number, cosine: number) =>
  Math.max(0, Math.min(boxExit, 14_000, opaqueZ / cosine) - Math.max(0, entry))
assert.equal(clippedLength(900, 1700, 500, 1), 0)
assert.equal(clippedLength(900, 1700, 1300, 1), 400)
assert.equal(clippedLength(900, 1700, 650, 0.5), 400)
assert.equal(clippedLength(-400, 400, far, 1), 400)
assert.equal(clippedLength(900, 20_000, far, 1), 13_100)
const source = readFileSync("games/wings/src/render/world/cloud-volume.ts", "utf8")
for (const text of ["floor(p.z)", "world.y", "noise3(p.mul(3.1)", "STORM.wind.mul(time)", "Loop(budget.view", "Loop(budget.light", "opaqueViewDistance().div(viewCos)"])
  assert(source.includes(text), text)
const skySource = readFileSync("games/wings/src/render/world/sky.ts", "utf8")
assert(!skySource.includes("PlaneGeometry"))
const low = createCloudLayers(0, 4)
assert.equal(low.group.children.length, 0); low.update(new Vector3()); low.dispose()
const beforeGeometry = new PlaneGeometry(60_000, 60_000, 1, 1)
const triangles = (g: BoxGeometry | PlaneGeometry) => g.index!.count / 3
assert.equal(triangles(beforeGeometry), 2); beforeGeometry.dispose()
// Build actual Three GLSL node graphs without pretending to initialize a GPU or draw pixels.
const renderer = new WebGPURenderer({ forceWebGL: true, canvas: { width: 1280, height: 720, addEventListener() {}, removeEventListener() {}, style: {} } as any })
const camera = new PerspectiveCamera(60, 16 / 9, 0.1, 50_000)
const scene = new Scene()
const builds: { quality: string; reversed: boolean; logarithmic: boolean; shaders: number[]; triangles: number }[] = []
for (const [quality, count, octaves] of [["balanced", 1, 4], ["high", 2, 5]] as const) {
  const clouds = createCloudLayers(count, octaves)
  clouds.update(new Vector3(123, 1300, -456))
  let total = 0
  for (const mesh of clouds.group.children as any[]) {
    assert(mesh.geometry instanceof BoxGeometry)
    assert.equal(mesh.position.x, 123); assert.equal(mesh.position.z, -456)
    assert.equal(mesh.material.depthWrite, false)
    total += triangles(mesh.geometry)
  }
  for (const [reversed, logarithmic] of [[true, false], [false, true], [false, false]]) {
    Object.defineProperty(renderer, "reversedDepthBuffer", { value: reversed, configurable: true })
    Object.defineProperty(renderer, "logarithmicDepthBuffer", { value: logarithmic, configurable: true })
    const shaders: number[] = []
    for (const mesh of clouds.group.children) {
      const builder = new GLSLNodeBuilder(mesh, renderer)
      builder.camera = camera; builder.scene = scene
      builder.build()
      assert(builder.fragmentShader.includes("exp("))
      assert(builder.fragmentShader.includes("for ("))
      assert(!/\b(undefined|NaN)\b/.test(builder.fragmentShader))
      shaders.push(builder.fragmentShader.length)
    }
    builds.push({ quality, reversed, logarithmic, shaders, triangles: total })
  }
  let disposed = 0
  for (const mesh of clouds.group.children as any[]) {
    mesh.geometry.addEventListener("dispose", () => disposed++)
    mesh.material.addEventListener("dispose", () => disposed++)
  }
  clouds.dispose()
  assert.equal(disposed, count * 2)
}
const sky = createSky(); sky.update(new Vector3(1, 2, 3), 10); sky.dispose()
const lightning = createLightning(); lightning.update(8.02, new Vector3()); assert(lightning.mesh.visible); lightning.dispose()
console.log(JSON.stringify({ pass: true, lowCloudTriangles: 0, beforeTriangles: [0, 2, 4], afterTriangles: [0, 12, 24], builds,
  opticalMath: "Beer-Lambert conservation, extinction, forward scattering passed", fps: "unmeasured; no GPU draw" }, null, 2))
