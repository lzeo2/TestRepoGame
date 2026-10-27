// CPU-only: bundle with esbuild, platform=node, format=cjs. No renderer or Three required.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import {
  WORLD_SEED, WATER_LEVEL, MESH_CELL, fleetClearance, groundHeight, heightBound,
  posedFleet, setFleetState, setWorldSeed, shipHeight, terrainMeshHeight, worldMesh,
} from "./src/sim/geography"
import { SHIP_SPECS, shipToWorld } from "./src/sim/fleet"
import { CLUSTER_N, CLUSTER_SIZE, LOD_STEPS, generateCluster } from "./src/render/world/tile-gen"

const digest = (...arrays: ArrayBufferView[]) => {
  const hash = createHash("sha256")
  for (const a of arrays) hash.update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength))
  return hash.digest("hex")
}
const start = performance.now(), cpuStart = process.cpuUsage()
setWorldSeed(WORLD_SEED)
const m = worldMesh()
const meshHash = digest(m.h, m.vx, m.vz, m.diag)
let low = Infinity, high = -Infinity, coast = 0, land = 0, valley = 0
for (let k = 0; k < m.h.length; k++) {
  const h = m.h[k]
  assert(Number.isFinite(h))
  low = Math.min(low, h); high = Math.max(high, h)
  if (h > 0) land++
  if (h > -5 && h < 8) coast++
  if (k > m.stride && k < m.h.length - m.stride && h > 5 &&
    (m.h[k - 1] + m.h[k + 1] + m.h[k - m.stride] + m.h[k + m.stride]) / 4 - h > 1) valley++
  if (fleetClearance(m.vx[k], m.vz[k]) < 0) assert(h <= -12, "fleet keep-out seabed")
}
assert(high > 250 && low <= -30 && coast > 100 && land > 1000 && valley > 50, "coast, hills and valleys retained")
let samples = 0, maxError = 0, surfaceTriangles = 0, skirts = 0
const triangles = [0, 0, 0, 0]
const clusterMs: number[] = []
let centerHash = ""
const seamNormals = new Map<string, string>()
const genStart = performance.now()
for (let lod = 0; lod < LOD_STEPS.length; lod++) {
  const t = performance.now()
  for (let cz = 0; cz < CLUSTER_N; cz++) for (let cx = 0; cx < CLUSTER_N; cx++) {
    const c = generateCluster(cx, cz, lod)
    triangles[lod] += c.index.length / 3
    const edge = CLUSTER_SIZE / MESH_CELL / LOD_STEPS[lod] + 1, core = edge * edge
    assert(c.positions.every(Number.isFinite))
    for (let o = 0; o < c.normals.length; o += 3) {
      const len = Math.hypot(c.normals[o], c.normals[o + 1], c.normals[o + 2]) / 127
      assert(Math.abs(len - 1) < 0.015 && c.normals[o + 1] > 0, "finite upward unit normals")
    }
    // Shared tile borders must retain the same normals and colours at each LOD.
    for (let j = 0; j < edge; j++) for (let i = 0; i < edge; i++) {
      if (i !== 0 && j !== 0 && i !== edge - 1 && j !== edge - 1) continue
      const o = (j * edge + i) * 3
      const key = `${lod}/${c.positions[o]}/${c.positions[o + 2]}`
      const value = `${c.normals.slice(o, o + 3)}/${c.colors.slice(o, o + 3)}`
      if (seamNormals.has(key)) assert.equal(value, seamNormals.get(key), "seam shading")
      else seamNormals.set(key, value)
    }
    if (lod !== 0) continue
    if (cx === 2 && cz === 2) centerHash = digest(c.positions, c.normals, c.colors, c.index)
    // Every core vertex is exactly the baked collision vertex, including shared tile edges.
    for (let j = 0; j < edge; j++) for (let i = 0; i < edge; i++) {
      const k = (cz * (edge - 1) + j) * m.stride + cx * (edge - 1) + i, o = (j * edge + i) * 3
      assert.equal(c.positions[o], m.vx[k]); assert.equal(c.positions[o + 1], m.h[k]); assert.equal(c.positions[o + 2], m.vz[k])
      // Quantized normal must be perpendicular to both real jittered grid secants.
      const gi = cx * (edge - 1) + i, gj = cz * (edge - 1) + j
      for (const [a, b] of [
        [gj * m.stride + Math.max(0, gi - 1), gj * m.stride + Math.min(m.n, gi + 1)],
        [Math.max(0, gj - 1) * m.stride + gi, Math.min(m.n, gj + 1) * m.stride + gi],
      ]) {
        const dx = m.vx[b] - m.vx[a], dy = m.h[b] - m.h[a], dz = m.vz[b] - m.vz[a]
        const dot = (dx * c.normals[o] + dy * c.normals[o + 1] + dz * c.normals[o + 2]) / (127 * Math.hypot(dx, dy, dz))
        assert(Math.abs(dot) < 0.008, "normal follows actual jittered surface")
      }
    }
    // Sample three strict interiors of EVERY actual indexed surface triangle, not a fabricated grid.
    for (let q = 0; q < c.index.length; q += 3) {
      const ids = [c.index[q], c.index[q + 1], c.index[q + 2]]
      if (ids.some(i => i >= core)) { skirts++; continue }
      surfaceTriangles++
      for (const weights of [[1/3, 1/3, 1/3], [0.7, 0.2, 0.1], [0.1, 0.2, 0.7]]) {
        let x = 0, y = 0, z = 0
        for (let v = 0; v < 3; v++) {
          x += c.positions[ids[v] * 3] * weights[v]
          y += c.positions[ids[v] * 3 + 1] * weights[v]
          z += c.positions[ids[v] * 3 + 2] * weights[v]
        }
        const error = Math.abs(terrainMeshHeight(x, z) - y)
        maxError = Math.max(maxError, error)
        assert(error < 1e-8, `LOD0 interior mismatch ${error}`)
        assert(Math.abs(groundHeight(x, z) - Math.max(WATER_LEVEL, y)) < 1e-8, "terrain/water collision floor")
        assert(heightBound(x, z) + 1e-8 >= Math.max(0, y), "conservative collision bound")
        samples++
      }
    }
  }
  clusterMs.push(performance.now() - t)
}
const generationAndChecksMs = performance.now() - genStart
// Check moving hulls and carrier launch lanes through one orbit.
for (let time = 0; time < 1500; time += 125) {
  setFleetState(time, 4)
  for (const ship of posedFleet()) {
    const sp = SHIP_SPECS[ship.kind]
    for (const local of [[0, 0, 0], [sp.halfWidth, 0, sp.halfLength], [-sp.halfWidth, 0, -sp.halfLength]]) {
      const p = shipToWorld(ship, local as [number, number, number])
      assert(terrainMeshHeight(p[0], p[2]) <= -12, "moving fleet seabed clearance")
    }
    const deck = shipToWorld(ship, [0, 0, 0])
    assert.equal(groundHeight(deck[0], deck[2]), shipHeight(deck[0], deck[2]))
    if (ship.kind === "carrier") for (let ahead = 200; ahead <= 1500; ahead += 100) {
      const p = shipToWorld(ship, [0, 0, -ahead])
      assert(terrainMeshHeight(p[0], p[2]) <= -12, "carrier launch corridor")
    }
  }
}
setFleetState(0, 4)
const queryStart = performance.now()
let checksum = 0
for (let i = 0; i < 100_000; i++) checksum += terrainMeshHeight((i * 73 % 3000) - 1500, (i * 137 % 3000) - 1500)
const queryMs = performance.now() - queryStart
setWorldSeed(WORLD_SEED ^ 12345)
const alternate = worldMesh()
assert.notEqual(digest(alternate.h, alternate.vx, alternate.vz, alternate.diag), meshHash)
// Golden captured from this seed generated FIRST in a fresh process. Catches stale valley-AO
// caches that a simple A -> B -> A round trip would miss. Update only after intentional palette changes.
assert.equal(digest(generateCluster(2, 2, 0).colors),
  "f373d3209891672cca17564511902a5ea0a0f870c217829d421bd0da8898fe09", "seed-switch shading matches cold bake")
setWorldSeed(WORLD_SEED)
const repeat = worldMesh()
assert.equal(digest(repeat.h, repeat.vx, repeat.vz, repeat.diag), meshHash, "repeat bake")
const center = generateCluster(2, 2, 0)
assert.equal(digest(center.positions, center.normals, center.colors, center.index), centerHash, "repeat generated cluster")
const cpu = process.cpuUsage(cpuStart)
console.log(JSON.stringify({ pass: true, seed: WORLD_SEED, bakedVertices: m.h.length,
  fullGridTriangles: m.n * m.n * 2, trianglesByLOD: triangles, surfaceTriangles, skirts,
  interiorSamples: samples, maxHeightError: maxError, heightRange: [low, high], coastVertices: coast,
  landVertices: land, valleyVertices: valley, meshHash, bakeMs: m.bakeMs,
  clusterAndCheckMsByLOD: clusterMs, generationAndChecksMs, queries: 100_000, queryMs, checksum,
  sourceBytes: ["src/sim/geography.ts", "src/render/world/tile-gen.ts"].map(p => ({ path: p, bytes: readFileSync(`games/wings/${p}`).length })),
  totalMs: performance.now() - start, processCpuMs: (cpu.user + cpu.system) / 1000, fps: "unavailable: CPU-only check" }, null, 2))
