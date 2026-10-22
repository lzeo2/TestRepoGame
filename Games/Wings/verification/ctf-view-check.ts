// CPU-only Three object fixture. Bundle for Node using the build_wings.mjs external-cache resolver.
// No renderer, native visual, typecheck, FPS or scene-budget acceptance is implied.
import assert from "node:assert/strict"
import {
  Color, Group, InstancedMesh, Matrix4, MeshBasicNodeMaterial, Quaternion, Vector3,
} from "three/webgpu"
import { createCtfView } from "./src/render/ctf"
import { createCtfState } from "./src/sim/ctf"
import type { CtfState } from "./src/sim/ctf"
import type { Quat, Vec3, VehicleKind } from "./src/sim/types"
import { WATER_LEVEL } from "./src/sim/geography"

const colors = Object.freeze(["#3c6ea8", "#c98a2e"])
const route: Vec3[] = Array.from({ length: 12 }, (_, i) => [i * 100, 0, i * 20])
for (const point of route) Object.freeze(point)
Object.freeze(route)
const routeBefore = JSON.stringify(route)
const view = createCtfView(route, colors)
assert(view.root instanceof Group)
assert.equal(view.root.visible, false)
assert.equal(view.root.children.length, 4)
const meshes = view.root.children.map(child => {
  assert(child instanceof InstancedMesh)
  assert.equal(child.frustumCulled, true)
  assert(child.material instanceof MeshBasicNodeMaterial)
  assert.equal(child.material.color.getHexString(), "ffffff")
  assert.equal(child.material.colorNode, null, "standard instance-color path, not custom override")
  assert(child.instanceColor)
  return child
})
const [homes, buoys, poles, banners] = meshes
assert.deepEqual(meshes.map(mesh => mesh.count), [2, 12, 2, 2])
assert.equal(new Set(meshes.map(mesh => mesh.material)).size, 1)
const triangles = meshes.reduce((sum, mesh) => sum + mesh.count
  * (mesh.geometry.index?.count ?? mesh.geometry.getAttribute("position").count) / 3, 0)
assert(triangles < 1000, `objective triangles ${triangles}`)
banners.geometry.computeBoundingBox()
const size = banners.geometry.boundingBox!.getSize(new Vector3())
assert(Math.abs(size.x - 4) < 1e-5 && Math.abs(size.y - 2.6) < 1e-5 && size.z > 0 && size.z < 0.2)
poles.geometry.computeBoundingBox()
assert.equal(poles.geometry.boundingBox!.getSize(new Vector3()).y, 6)
for (const mesh of meshes) {
  for (let i = 0; i < mesh.count; i++) {
    const actual = new Color()
    mesh.getColorAt(i, actual)
    const expected = new Color(colors[i % 2])
    assert(actual.toArray().every((value, j) => Math.abs(value - expected.toArray()[j]) < 1e-6))
  }
}
console.log(`PASS four InstancedMesh batches, counts 2/12/2/2, ${triangles} triangles, white shared node material + team instance colors`)

const matrix = new Matrix4()
function pose(mesh: InstancedMesh, i: number, expectedPosition: number[], expectedQuat = new Quaternion()) {
  mesh.getMatrixAt(i, matrix)
  const p = new Vector3(), q = new Quaternion(), scale = new Vector3()
  matrix.decompose(p, q, scale)
  assert(p.distanceTo(new Vector3().fromArray(expectedPosition)) < 0.01, `${mesh.name} position ${p.toArray()}`)
  assert(Math.abs(q.dot(expectedQuat)) > 0.99999, `${mesh.name} orientation`)
  assert(scale.distanceTo(new Vector3(1, 1, 1)) < 1e-5)
}
function bounds(mesh: InstancedMesh) {
  assert(mesh.boundingSphere && !mesh.boundingSphere.isEmpty())
  const vertices = mesh.geometry.getAttribute("position")
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix)
    for (let j = 0; j < vertices.count; j++) {
      const point = new Vector3().fromBufferAttribute(vertices, j).applyMatrix4(matrix)
      assert(point.distanceTo(mesh.boundingSphere.center) <= mesh.boundingSphere.radius + 0.02,
        `${mesh.name} bounds miss instance ${i}`)
    }
  }
}
function freezeState(state: CtfState) {
  for (const flag of state.flags) {
    Object.freeze(flag.home)
    Object.freeze(flag.position)
    Object.freeze(flag)
  }
  Object.freeze(state.flags)
  Object.freeze(state.scores)
  return Object.freeze(state)
}
const homeState = freezeState(createCtfState([[10, 1, 20], [500, 1, 600]], 3))
const homeBefore = JSON.stringify(homeState)
view.update(homeState, new Map())
assert.equal(view.root.visible, true)
for (let i = 0; i < 2; i++) {
  pose(homes, i, [homeState.flags[i].home[0], WATER_LEVEL + 0.2, homeState.flags[i].home[2]])
  pose(poles, i, homeState.flags[i].position)
  pose(banners, i, homeState.flags[i].position)
}
for (let i = 0; i < route.length; i++) pose(buoys, i, [route[i][0], WATER_LEVEL + 0.2, route[i][2]])
assert.equal(JSON.stringify(homeState), homeBefore)
console.log("PASS hidden until first update; actual home flags, near-water rings and all route buoys")

const carried = createCtfState([[10, 1, 20], [500, 1, 600]], 3)
carried.flags[0].carrierId = "boat"
carried.flags[1].carrierId = "plane"
// Deliberately stale authority positions must not determine carried visuals.
carried.flags[0].position = [-20, 2, -30]
carried.flags[1].position = [-50, 2, -60]
freezeState(carried)
const yaw: Quat = [0, Math.SQRT1_2, 0, Math.SQRT1_2]
const roll: Quat = [0, 0, Math.SQRT1_2, Math.SQRT1_2]
const carriers = new Map<string, { pos: Vec3; quat: Quat; kind: VehicleKind }>([
  ["boat", { pos: [100000, 4, -80000], quat: yaw, kind: "speedboat" }],
  ["plane", { pos: [-120000, 500, 90000], quat: roll, kind: "f15" }],
])
for (const carrier of carriers.values()) {
  Object.freeze(carrier.pos)
  Object.freeze(carrier.quat)
  Object.freeze(carrier)
}
const before = JSON.stringify([carried, [...carriers]])
view.update(carried, carriers)
for (const mesh of [poles, banners]) {
  pose(mesh, 0, [100004, 4.8, -80000], new Quaternion().fromArray(yaw))
  pose(mesh, 1, [-120002, 500, 90004], new Quaternion().fromArray(roll))
}
meshes.forEach(bounds)
assert.equal(JSON.stringify([carried, [...carriers]]), before)
console.log("PASS interpolated water/air carrier positions + yaw/roll, local rotated anchors, far-world sphere containment, no source mutation")

const dropped = createCtfState([[10, 1, 20], [500, 1, 600]], 3)
dropped.flags[0].position = [230000, 13, -190000]
dropped.flags[0].droppedAt = 10
dropped.flags[1].carrierId = "unknown"
dropped.flags[1].position = [-210000, 20, 170000]
freezeState(dropped)
view.update(dropped, carriers)
for (const mesh of [poles, banners]) {
  for (let i = 0; i < 2; i++) pose(mesh, i, dropped.flags[i].position)
  bounds(mesh)
}
assert.equal(JSON.stringify(route), routeBefore)
console.log("PASS actual dropped positions, unknown-carrier state fallback, orientation reset and recomputed far bounds")

const scene = new Group()
scene.add(view.root)
const geometries = new Set(meshes.map(mesh => mesh.geometry))
const materials = new Set(meshes.map(mesh => {
  assert(mesh.material instanceof MeshBasicNodeMaterial)
  return mesh.material
}))
const resources = [...geometries, ...materials, ...meshes]
const disposalCounts = new Map(resources.map(resource => [resource, 0]))
for (const resource of resources) resource.addEventListener("dispose", () => {
  disposalCounts.set(resource, disposalCounts.get(resource)! + 1)
})
view.dispose()
view.dispose()
view.update(homeState, new Map())
assert.equal(view.root.visible, false)
assert.equal(view.root.parent, null)
assert.equal(view.root.children.length, 0)
assert.equal(scene.children.length, 0)
for (const count of disposalCounts.values()) assert.equal(count, 1)
console.log("PASS each of four geometries, one material and four instance buffers disposed once; detached/empty root; post-disposal update inert")
console.log("PASS CTF view CPU fixture only; native rendering, typecheck, visual review, FPS and whole-scene budget remain unproven")
