// CPU-only material data. No renderer, random state, downloads or model mutation.
export function surfaceFactors(src: { roughness?: number; metalness?: number }): [number, number, number] {
  const unit = (v: number | undefined, fallback: number) => Number.isFinite(v) ? Math.max(0, Math.min(1, v!)) : fallback
  // The seven aircraft have no source AO maps. Neutral AO must not invent cavity darkness.
  return [unit(src.roughness, 1), unit(src.metalness, 1), 1]
}

/** Metre-scaled planar coordinates, baked before skinning so moving parts keep their finish. */
export function surfaceUV(x: number, y: number, z: number, nx: number, ny: number, nz: number): [number, number] {
  const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz)
  return ax > ay && ax > az ? [z * 0.25, y * 0.25] : ay > az ? [x * 0.25, z * 0.25] : [x * 0.25, y * 0.25]
}

/** Two shared 128² RGBA maps: linear occlusion/roughness/metalness and tangent-space normal. */
export function surfaceMapData(size = 128) {
  if (!Number.isInteger(size) || size < 16 || size > 512) throw new RangeError("surface map size must be 16..512")
  const orm = new Uint8Array(size * size * 4)
  const normal = new Uint8Array(orm.length)
  const heights = new Float32Array(size * size)
  const noise = (x: number, y: number) => {
    let h = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size
    // Staggered access panels, not a three-axis checkerboard. Very shallow recessed seams.
    const row = Math.floor(v * 4)
    const edgeX = ((u * 3 + (row % 2) * 0.5) % 1)
    const edgeY = (v * 4) % 1
    const seam = edgeX < 0.018 || edgeY < 0.014 ? 1 : 0
    const grain = noise(x, y)
    const streak = noise(x, Math.floor(y / 16))
    const i = (y * size + x) * 4
    orm[i] = Math.round(255 - seam * 5)
    orm[i + 1] = Math.round(246 + grain * 7 - seam * 5 - streak * 2)
    orm[i + 2] = Math.round(253 + grain * 2)
    orm[i + 3] = 255
    heights[y * size + x] = grain * 0.012 + streak * 0.006 - seam * 0.018
  }
  const height = (x: number, y: number) => heights[((y + size) % size) * size + (x + size) % size]
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (height(x - 1, y) - height(x + 1, y)) * 2
    const dy = (height(x, y - 1) - height(x, y + 1)) * 2
    const len = Math.hypot(dx, dy, 1)
    const i = (y * size + x) * 4
    normal[i] = Math.round((dx / len * 0.5 + 0.5) * 255)
    normal[i + 1] = Math.round((dy / len * 0.5 + 0.5) * 255)
    normal[i + 2] = Math.round((1 / len * 0.5 + 0.5) * 255)
    normal[i + 3] = 255
  }
  return { size, orm, normal }
}
