// Original baked surface detail. Generated once, shared by every streamed chunk.
export const ROAD_TEXTURE_SIZE = 64;
export const SURFACE_TEXTURE_SIZE = 512;
export const ATLAS_INSET = 8 / SURFACE_TEXTURE_SIZE;
export const ATLAS_SPAN = 240 / SURFACE_TEXTURE_SIZE;
const wrap = (n, size) => ((n % size) + size) % size;
const grain = (x, y) => {
  let n = Math.imul(x + 101, 374761393) ^ Math.imul(y + 719, 668265263);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967295;
};
const byte = n => Math.max(0, Math.min(255, Math.round(n)));
export function createRoadPixels() {
  const pixels = new Uint8ClampedArray(ROAD_TEXTURE_SIZE ** 2 * 4);
  for (let y = 0; y < ROAD_TEXTURE_SIZE; y++) for (let x = 0; x < ROAD_TEXTURE_SIZE; x++) {
    // Fine aggregate rides on broad, low-contrast wear; no painted-on cracks.
    const fleck = grain(x, y), broad = Math.sin(x * Math.PI / 32) * Math.cos(y * Math.PI / 32);
    const tone = 233 + broad * 5 + (fleck - .5) * 24 + (fleck > .96 ? 10 : 0);
    const i = (y * ROAD_TEXTURE_SIZE + x) * 4;
    pixels[i] = byte(tone); pixels[i + 1] = byte(tone + 1); pixels[i + 2] = byte(tone + 2); pixels[i + 3] = 255;
  }
  return pixels;
}
export function createSurfacePixels() {
  const pixels = new Uint8ClampedArray(SURFACE_TEXTURE_SIZE ** 2 * 4);
  for (let y = 0; y < SURFACE_TEXTURE_SIZE; y++) for (let x = 0; x < SURFACE_TEXTURE_SIZE; x++) {
    const kind = (x >= 256 ? 1 : 0) + (y < 256 ? 2 : 0);
    // Eight-pixel wrapped gutters preserve each tile through the first mip levels.
    const px = wrap(x % 256 - 8, 240), py = wrap(y % 256 - 8, 240);
    const noise = grain(px, py), coarse = grain(Math.floor(px / 12), Math.floor(py / 12));
    let tone;
    if (kind === 0) {
      const row = Math.floor(py / 16), bx = wrap(px + (row % 2) * 30, 240);
      const joint = py % 16 < 1 || bx % 60 < 1;
      const brick = grain(Math.floor(bx / 60), row);
      tone = joint ? 166 + noise * 9 : 218 + brick * 25 + (noise - .5) * 15;
      if (!joint && (py % 16 === 1 || bx % 60 === 1)) tone += 9;
    } else if (kind === 2) {
      const row = Math.floor(py / 30), tile = wrap(px + (row % 2) * 15, 240) % 30;
      tone = py % 30 < 2 ? 151 + noise * 10 : 216 + Math.cos(tile / 30 * Math.PI * 2) * 13 + (noise - .5) * 16;
      if (py % 30 === 2) tone += 12;
    } else {
      // Render and concrete retain a quiet mineral finish beneath vertex tints.
      tone = 238 + (noise - .5) * (kind === 1 ? 11 : 19) + (coarse - .5) * 9;
      if (noise < .025) tone -= 15;
    }
    const i = (y * SURFACE_TEXTURE_SIZE + x) * 4;
    pixels[i] = byte(tone); pixels[i + 1] = byte(tone); pixels[i + 2] = byte(tone); pixels[i + 3] = 255;
  }
  return pixels;
}
