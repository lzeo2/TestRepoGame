// Retained two-wedge motion cue. No trail history, texture, particles or extra clock.
import { BufferGeometry, Float32BufferAttribute, Matrix4, Mesh, MeshBasicNodeMaterial, Vector3, type Object3D } from "three/webgpu"
import { BoatHandling } from "../sim/boat-movement"

let pool: { geometry: BufferGeometry; material: MeshBasicNodeMaterial; users: number } | null = null

export function createBoatWake(root: Object3D, anchors: Map<string, Object3D>) {
  if (!pool) {
    const geometry = new BufferGeometry()
    geometry.setAttribute("position", new Float32BufferAttribute([
      -0.12, 0, 0, -0.8, 0, 1, 0.8, 0, 1, 0.12, 0, 0,
    ], 3))
    geometry.setIndex([0, 1, 2, 0, 2, 3])
    geometry.computeVertexNormals()
    pool = { geometry, material: new MeshBasicNodeMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, depthWrite: false }), users: 0 }
  }
  const shared = pool
  shared.users++
  const meshes = ["L", "R"].map(side => {
    const mesh = new Mesh(shared.geometry, shared.material)
    mesh.name = `wake_${side}_foam`
    mesh.visible = false
    mesh.matrixAutoUpdate = false
    root.add(mesh)
    return mesh
  })
  const world = new Matrix4(), inverse = new Matrix4(), placement = new Matrix4()
  const back = new Vector3(), right = new Vector3(), up = new Vector3(0, 1, 0), point = new Vector3(), scale = new Vector3()
  let disposed = false
  const hide = () => { for (const mesh of meshes) mesh.visible = false }
  return {
    hide,
    update(strength: number, velocity: readonly number[]) {
      hide()
      if (disposed || strength <= 0) return
      // A reverse/coasting boat leaves foam opposite actual motion, not always behind its stern.
      back.set(-velocity[0], 0, -velocity[2])
      if (back.lengthSq() < 1e-8) return
      back.normalize()
      right.crossVectors(up, back)
      world.compose(root.position, root.quaternion, root.scale)
      inverse.copy(world).invert()
      for (let i = 0; i < meshes.length; i++) {
        const anchor = anchors.get(i === 0 ? "wake_L" : "wake_R")
        if (!anchor) continue
        point.setFromMatrixPosition(anchor.matrix).applyMatrix4(world)
        placement.makeBasis(right, up, back).scale(scale.set(0.4 + strength, 1, 1 + strength * 9))
        placement.setPosition(point.x, BoatHandling.seaLevel + 0.04, point.z)
        meshes[i].matrix.multiplyMatrices(inverse, placement)
        meshes[i].matrixWorldNeedsUpdate = true
        meshes[i].visible = true
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const mesh of meshes) mesh.removeFromParent()
      if (--shared.users === 0) {
        shared.geometry.dispose()
        shared.material.dispose()
        pool = null
      }
    },
  }
}
