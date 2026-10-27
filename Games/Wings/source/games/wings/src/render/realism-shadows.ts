import { DirectionalLight, type Camera } from "three/webgpu"
import { CSMShadowNode } from "three/addons/csm/CSMShadowNode.js"
import type { Quality } from "../sim/types"

const PRESETS = {
  low: { cascades: 0, size: 0 },
  balanced: { cascades: 2, size: 1024 },
  high: { cascades: 3, size: 2048 },
} as const

// 0.186 CSM.dispose only detaches placeholders. Child ShadowNodes own the render targets.
class OwnedCSM extends CSMShadowNode {
  private released = false
  dispose() {
    if (this.released) return
    this.released = true
    const children = this as unknown as { _shadowNodes: Array<{ dispose(): void }> }
    for (const node of children._shadowNodes) node.dispose()
    super.dispose()
  }
}

/** One sun, one scene camera. Renderer must use PCFShadowMap and enable shadows above Low.
 * setQuality returns true when the host must rebuild its renderer lighting graph (see manual).
 * update(camera) runs after camera projection changes, before rendering; CSM positions itself per render.
 */
export function createRealismShadows(light: DirectionalLight, quality: Quality) {
  const originalShadow = light.shadow
  const originalCastShadow = light.castShadow
  let node: OwnedCSM | null = null
  let current: Quality | null = null
  let disposed = false
  let projection = ""

  function release() {
    node?.dispose()
    node = null
    light.shadow = originalShadow
    light.castShadow = originalCastShadow
    projection = ""
  }

  function setQuality(next: Quality): boolean {
    if (disposed) throw new Error("Realism shadows already disposed")
    if (!(next in PRESETS)) throw new Error(`Unknown shadow quality: ${next}`)
    if (next === current) return false
    release()
    current = next
    const preset = PRESETS[next]
    light.castShadow = preset.cascades > 0
    if (!preset.cascades) return true

    // Keep the owner's shadow settings/resources intact for final restoration.
    const shadow = originalShadow.clone()
    shadow.mapSize.set(preset.size, preset.size)
    shadow.bias = -0.00015
    shadow.normalBias = 0.25
    shadow.radius = 1.5 // Native PCF softness, NOT distance-dependent penumbra.
    shadow.camera.near = 0.5
    // CSM does not fit depth bounds itself. Cover the 4 km view plus upstream's light margin.
    shadow.camera.far = 12_000
    shadow.camera.updateProjectionMatrix()
    light.shadow = shadow
    node = new OwnedCSM(light, { cascades: preset.cascades, maxFar: 4000, mode: "practical", lightMargin: 1000 })
    node.fade = true
    ;(shadow as typeof shadow & { shadowNode: CSMShadowNode }).shadowNode = node
    return true
  }

  setQuality(quality)
  return {
    get node(): CSMShadowNode | null { return node },
    setQuality,
    update(camera: Camera) {
      if (disposed || !node || !node.mainFrustum) return // Renderer initializes the real node on first build.
      const nextProjection = camera.projectionMatrix.elements.join(",")
      if (node.camera !== camera || projection !== nextProjection) {
        node.camera = camera
        node.updateFrustums()
        projection = nextProjection
      }
    },
    dispose() {
      if (disposed) return
      release()
      disposed = true
    },
  }
}
