// Shared aircraft node materials for WebGPU/WebGL2: source PBR factors, restrained local finish maps,
// storm reflections, clearcoated glass and HDR emissives. Geometry and light behavior live elsewhere.
import {
  Color,
  DataTexture,
  EquirectangularReflectionMapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicNodeMaterial,
  MeshPhysicalNodeMaterial,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  UnsignedByteType,
  type ColorRepresentation,
  type Texture,
} from "three/webgpu"
import { attribute, float, materialColor, mx_noise_float, positionLocal, texture, vec3 } from "three/tsl"
import { surfaceMapData } from "./aircraft-surfaces"

// ---------------------------------------------------------------------------------------------------------
// Paint remap (display/sRGB HSL space)

export type PaintKind = "hull" | "metal"

const _hsl = { h: 0, s: 0, l: 0 }

/**
 * Deterministic remap of an authored GLB color into muted military paint: desaturated olive/slate hulls,
 * neutral grays, and preserved authored near-blacks.
 */
export function paintColor(src: Color, kind: PaintKind = "hull"): Color {
  const out = new Color()
  src.getHSL(_hsl, SRGBColorSpace)
  let { h, s, l } = _hsl
  if (l < 0.18) {
    // Preserve authored near-black paint, especially stealth airframes and rubber.
    s = Math.min(s, 0.08)
  } else if (s < 0.12) {
    h = 0.12
    s = Math.min(s, 0.04)
    l = Math.min(0.72, l)
  } else {
    s = Math.min(0.3, s * 0.5)
    l = Math.min(0.66, l)
  }
  if (kind === "metal") {
    s = Math.min(s, 0.05)
    l = Math.min(l, 0.45)
  }
  return out.setHSL(h, s, l, SRGBColorSpace)
}

// ---------------------------------------------------------------------------------------------------------
// Storm environment (reflections)

let envTex: Texture | null = null
let envOverride: Texture | null = null
const envUsers = new Set<MeshPhysicalNodeMaterial>()
let aircraftDaylight = 1

/** Explicit env maps otherwise ignore scene.environmentIntensity and glow at night. */
export function setAircraftDaylight(daylight: number): void {
  aircraftDaylight = daylight
  for (const m of envUsers) m.envMapIntensity = m.userData.dayEnvIntensity * (0.03 + daylight * 0.97)
}

/**
 * Small procedural equirect of a dark storm sky (dark slate clouds, brighter break band at the horizon,
 * dark sea below). PMREM-filtered automatically by the node renderer. Cheap stand-in until the world
 * provides its own sky environment via `setAircraftEnvironment`.
 */
export function stormEnvironment(): Texture {
  if (envTex) return envTex
  const w = 128
  const h = 64
  const data = new Uint8Array(w * h * 4)
  const zenith = new Color("#1e2a28")
  const cloud = new Color("#3a4744")
  const breakBand = new Color("#8a9690")
  const sea = new Color("#1f2b2a")
  const seaFar = new Color("#2e3b38")
  const c = new Color()
  for (let y = 0; y < h; y++) {
    // v = 0 top (zenith) … 1 bottom (nadir); elevation in [-1, 1].
    const elev = 1 - ((y + 0.5) / h) * 2
    for (let x = 0; x < w; x++) {
      const az = (x / w) * Math.PI * 2
      if (elev >= 0) {
        const t = Math.pow(elev, 0.6)
        c.copy(breakBand).lerp(cloud, Math.min(1, elev * 6)).lerp(zenith, t)
        // Brighter cloud breaks scattered around the horizon.
        const breaks = Math.max(0, Math.sin(az * 3 + 1.3) * Math.sin(az * 5 + 0.4)) * Math.max(0, 1 - elev * 3)
        c.lerp(breakBand, breaks * 0.5)
      } else {
        c.copy(seaFar).lerp(sea, Math.min(1, -elev * 4))
      }
      const i = (y * w + x) * 4
      data[i] = Math.round(c.r * 255)
      data[i + 1] = Math.round(c.g * 255)
      data[i + 2] = Math.round(c.b * 255)
      data[i + 3] = 255
    }
  }
  const tex = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType)
  tex.mapping = EquirectangularReflectionMapping
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.needsUpdate = true
  envTex = tex
  return tex
}

/** Let the world/scene supply its own sky environment (e.g. a render of the storm sky); null = built-in. */
export function setAircraftEnvironment(tex: Texture | null): void {
  envOverride = tex
  for (const m of envUsers) {
    m.envMap = tex ?? stormEnvironment()
    m.needsUpdate = true
  }
}

function currentEnv(): Texture {
  return envOverride ?? stormEnvironment()
}

// ---------------------------------------------------------------------------------------------------------
// Materials

export interface PaintOptions {
  color: ColorRepresentation
  roughness?: number
  metalness?: number
  /** Wet clearcoat strength (0..1). */
  wet?: number
  envIntensity?: number
  vertexColors?: boolean
  /** Per-panel tone variation + rain streaks (TSL noise). */
  weathering?: boolean
  /** Source PBR factors baked into the aircraftSurface vertex attribute. */
  surfaceFactors?: boolean
}

/** Restrained finish variation; panel relief lives in the filtered maps, not world-space grid planes. */
function weatherNode() {
  const streak = mx_noise_float(positionLocal.mul(vec3(2.2, 2.2, 0.35)))
  const fine = mx_noise_float(positionLocal.mul(9))
  return float(0.985).sub(streak.mul(0.015)).add(fine.mul(0.006))
}

let surfaceMaps: { orm: DataTexture; normal: DataTexture } | null = null
function aircraftSurfaceMaps() {
  if (surfaceMaps) return surfaceMaps
  const data = surfaceMapData()
  const make = (pixels: Uint8Array) => {
    const t = new DataTexture(pixels, data.size, data.size, RGBAFormat, UnsignedByteType)
    t.wrapS = t.wrapT = RepeatWrapping
    t.magFilter = LinearFilter
    t.minFilter = LinearMipmapLinearFilter
    t.generateMipmaps = true
    t.needsUpdate = true
    return t
  }
  surfaceMaps = { orm: make(data.orm), normal: make(data.normal) }
  return surfaceMaps
}

/** Matte military paint, smooth-shaded, with a wet clearcoat and storm-sky reflections. */
export function createPaintMaterial(opts: PaintOptions): MeshPhysicalNodeMaterial {
  const mat = new MeshPhysicalNodeMaterial({
    color: new Color(opts.color),
    roughness: opts.roughness ?? 0.66,
    metalness: opts.metalness ?? 0.05,
    clearcoat: opts.wet ?? 0.16,
    clearcoatRoughness: 0.38,
    vertexColors: opts.vertexColors ?? false,
  })
  mat.envMap = currentEnv()
  mat.userData.dayEnvIntensity = opts.envIntensity ?? 0.9
  mat.envMapIntensity = mat.userData.dayEnvIntensity * (0.03 + aircraftDaylight * 0.97)
  envUsers.add(mat)
  if (opts.weathering !== false) {
    const w = weatherNode()
    mat.colorNode = materialColor.mul(w)
  }
  if (opts.surfaceFactors) {
    const maps = aircraftSurfaceMaps()
    const factors = attribute("aircraftSurface", "vec3")
    const orm = texture(maps.orm)
    mat.roughnessNode = factors.x.mul(orm.g).clamp(0.04, 1)
    mat.metalnessNode = factors.y.mul(orm.b)
    mat.aoNode = factors.z.mul(orm.r)
    mat.normalMap = maps.normal
    mat.normalScale.set(0.18, 0.18)
  }
  return mat
}

/** Glossy dark glass with a clearcoat; reflects the storm sky. */
export function createGlassMaterial(opts: { color?: ColorRepresentation; roughness?: number; metalness?: number; opacity?: number } = {}): MeshPhysicalNodeMaterial {
  const mat = new MeshPhysicalNodeMaterial({
    color: new Color(opts.color ?? "#141b22"),
    roughness: opts.roughness ?? 0.06,
    metalness: opts.metalness ?? 0,
    ior: 1.46,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: opts.opacity ?? 0.62,
    depthWrite: false,
  })
  mat.envMap = currentEnv()
  mat.userData.dayEnvIntensity = 1.6
  mat.envMapIntensity = 1.6 * (0.03 + aircraftDaylight * 0.97)
  envUsers.add(mat)
  return mat
}

/**
 * Unlit emissive material for afterburners and lights. Colors are HDR (multiply `.color` above 1 for
 * bloom); `userData.baseColor` keeps the unscaled color for per-frame intensity changes.
 */
export function createGlowMaterial(color: ColorRepresentation, intensity = 1): MeshBasicNodeMaterial {
  const mat = new MeshBasicNodeMaterial({ color: new Color(color).multiplyScalar(intensity) })
  mat.userData.baseColor = new Color(color)
  return mat
}
