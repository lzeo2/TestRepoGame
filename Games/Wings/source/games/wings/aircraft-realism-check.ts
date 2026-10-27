// Run with Node 22: node --experimental-strip-types games/wings/aircraft-realism-check.ts <models-directory>
// CPU data/source guard only. Does not compile Three shaders or measure rendering.
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { surfaceFactors, surfaceMapData, surfaceUV } from "./src/render/aircraft-surfaces.ts"

const here = dirname(fileURLToPath(import.meta.url))
const models = process.argv[2]
assert(models, "supply the existing aircraft models directory; no downloads")
const expected = [
  ["fa18", 912784, 16896, "78bb2fb9f542daaa607e850f7444018fc2f996cd247d67e3ad3761df58efab09"],
  ["apache", 745072, 11322, "bd6a9677f8f469dceac601aef4fd2ec7b5a42f66f12c5493159004bfa6ca47ac"],
  ["a10", 952180, 17576, "f9f4392f4de4dea95558c16738ff02fd89ae1ca10d0d960655fb967df64b9d24"],
  ["yf12", 780572, 18028, "5f49376fbace30d888e6972850833af28d101427f66f12bdf128c889966f6769"],
  ["b2", 283788, 4740, "3e271a320ef39720c445ed379b72dcdf40b32c38b58d1df09d356be119ee826b"],
  ["f15", 1176316, 41352, "5c1bf64dc21962dc822dc44edd91186aa4a6932034b06a405d3170518fc135bf"],
  ["f35", 1174768, 40812, "ce19018414037e3cef949a99ae08a1d035b25fbd20601e1835c2426bc32db197"],
] as const
let materials = 0
for (const [name, bytes, triangles, hash] of expected) {
  const data = readFileSync(resolve(models, name + ".glb"))
  assert.equal(data.length, bytes, name)
  assert.equal(createHash("sha256").update(data).digest("hex"), hash, name + " model bytes changed")
  assert.equal(data.toString("ascii", 0, 4), "glTF")
  const gltf = JSON.parse(data.toString("utf8", 20, 20 + data.readUInt32LE(12)))
  let count = 0
  for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
    count += gltf.accessors[p.indices ?? p.attributes.POSITION].count / 3
  }
  assert.equal(count, triangles, name)
  assert.equal(gltf.textures?.length ?? 0, 0, "source texture/AO assumption needs review")
  for (const m of gltf.materials) {
    const pbr = m.pbrMetallicRoughness ?? {}
    const actual = surfaceFactors({ roughness: pbr.roughnessFactor ?? 1, metalness: pbr.metallicFactor ?? 1 })
    assert.deepEqual(actual, [pbr.roughnessFactor ?? 1, pbr.metallicFactor ?? 1, 1])
    const encoded = new Float32Array(actual)
    actual.forEach((v, i) => assert(Math.abs(encoded[i] - v) < 1e-7))
    materials++
  }
  console.log(`PASS ${name}: ${triangles} triangles, ${bytes} bytes unchanged`)
}
assert.deepEqual(surfaceFactors({ roughness: 0, metalness: 0 }), [0, 0, 1])
assert.deepEqual(surfaceFactors({ roughness: NaN, metalness: Infinity }), [1, 1, 1])
assert.deepEqual(surfaceFactors({ roughness: -1, metalness: 2 }), [0, 1, 1])
for (const normal of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.5, 0.5, 0.5]]) {
  const uv = surfaceUV(3, -2, 10, ...normal as [number, number, number])
  assert(uv.every(Number.isFinite))
  assert.deepEqual(uv, surfaceUV(3, -2, 10, ...normal as [number, number, number]))
}
for (const size of [16, 128]) {
  const a = surfaceMapData(size), b = surfaceMapData(size)
  assert.deepEqual(a, b)
  for (const map of [a.orm, a.normal]) {
    assert.equal(map.length, size * size * 4)
    assert(map.every(Number.isFinite))
    assert(new Set(map).size > 4)
  }
  for (let i = 0; i < a.orm.length; i += 4) {
    assert(a.orm[i] >= 250 && a.orm[i + 1] >= 239 && a.orm[i + 2] >= 253)
    const n = Array.from(a.normal.slice(i, i + 3), v => v / 255 * 2 - 1)
    assert(Math.abs(Math.hypot(...n) - 1) < 0.012)
    assert.equal(a.normal[i + 3], 255)
  }
}
assert.throws(() => surfaceMapData(0), RangeError)
console.log(`PASS ${materials} source PBR factors; finite deterministic ORM/normal maps and local UVs`)

// Immutable sections pinned from the committed day/night source 1e4fb16, without requiring its Git objects.
const digest = (s: string) => createHash("sha256").update(s).digest("hex")
const current = readFileSync(resolve(here, "src/render/aircraft.ts"), "utf8")
const section = (s: string, from: string, to: string) => {
  const start = s.indexOf(from), end = s.indexOf(to, start)
  assert(start >= 0 && end > start, from)
  return s.slice(start, end)
}
for (const [from, to, hash] of [
  ["export const CONFIG", "// Template baking", "18b06452104eb90c73a086c38d9bea32ab3146fb6f5ee6211fec37604ea1f06f"],
  ["function prepGeometry", "/** Base (unscaled)", "2fd94836f1fec46ce05a30308217ca70733c769ab7a2122214ade836b94ae609"],
  ["function buildTemplate", "  // Group meshes by material value.", "cb902933cdb93de0bc926aa4e0b2a0e7d544f104ab681e4cb029a233128fe1fe"],
  ["  // Procedural flame cones", "// Loading", "765bb32619b296cde108a95a14af7a80c4d121d3e8b0f4aefa27dd9bbe84234c"],
  ["  // Candela with inverse-square", "  let rig: Rig | null", "695586ca7277123750bb598fea7196432e1c4f51fde36938059bf4d1cb211a30"],
]) assert.equal(digest(section(current, from, to)), hash, from)
assert.equal(digest(current.slice(current.indexOf("// Loading")).replace("mat = liveryMaterial(team, true)", "mat = liveryMaterial(team)")), "a9a0d76547a0986606638045ebe1f4049bdc63b44b38f071a76d33c6556941db")
const toon = readFileSync(resolve(here, "src/render/toon.ts"), "utf8")
assert(toon.includes('attribute("aircraftSurface", "vec3")'))
assert(toon.includes("factors.x.mul(orm.g)"))
assert(toon.includes("factors.y.mul(orm.b)"))
assert(toon.includes("factors.z.mul(orm.r)"))
assert(current.includes('g.setAttribute("aircraftSurface"'))
assert(!toon.includes("l = 0.22 + l * 0.4"), "authored black paint must not be lifted")
console.log("PASS unchanged geometry conversion, rigs, loadouts, animation and day/night SpotLight paths")
console.log("CPU ONLY: screenshots, native shader execution and FPS NOT MEASURED")
