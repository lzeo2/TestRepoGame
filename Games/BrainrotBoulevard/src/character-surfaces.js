import * as THREE from '../vendor/three.module.js';

/**
 * Small, deterministic material library for the collection's sculpted bodies.
 * No canvas, DOM, random state, network assets, or renderer are required to bake
 * these maps. R = relief, G = roughness and B = metalness share a linear map.
 * Albedo is sRGB. Each lazy material costs two 256² RGBA8 maps (~512 KiB),
 * except lava, which adds a masked sRGB ember-emission map (~256 KiB).
 */
const SIZE = 256;
const TAU = Math.PI * 2;
const cache = new Map();
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mix = (a, b, t) => a + (b - a) * clamp(t);
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const fract = x => x - Math.floor(x);
const mod = (a, b) => ((a % b) + b) % b;

// Integer hashing makes baking independent of browser and Math.random().
function hash(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 1597334677);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise(u, v, n, seed) {
  const x = u * n, y = v * n, ix = Math.floor(x), iy = Math.floor(y);
  const fx = fract(x), fy = fract(y);
  const sx = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const sy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const h = (dx, dy) => hash(mod(ix + dx, n), mod(iy + dy, n), seed);
  return mix(mix(h(0, 0), h(1, 0), sx), mix(h(0, 1), h(1, 1), sx), sy);
}

// A cellular field produces holes, scars and clustered blemishes rather than
// uniformly distributed TV static. Cell IDs also vary their size and pigment.
function cells(u, v, nx, ny, seed) {
  const x = u * nx, y = v * ny, ix = Math.floor(x), iy = Math.floor(y);
  let first = 9, second = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = mod(ix + i, nx), cy = mod(iy + j, ny);
    const a = hash(cx, cy, seed), b = hash(cx, cy, seed + 97);
    const dx = x - (ix + i + 0.17 + a * 0.66);
    const dy = y - (iy + j + 0.17 + b * 0.66);
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < first) { second = first; first = d; id = a; }
    else if (d < second) second = d;
  }
  return { d: first, edge: second - first, id };
}

const profiles = {
  crust:       { seed: 11, dark: [55, 22, 9], light: [197, 130, 58], rough: 0.82, bump: 0.035 },
  crumb:       { seed: 19, dark: [137, 100, 54], light: [234, 205, 148], rough: 0.94, bump: 0.04 },
  feather:     { seed: 23, dark: [9, 16, 22], light: [69, 83, 82], rough: 0.61, bump: 0.014 },
  paleFeather: { seed: 127, dark: [100, 100, 88], light: [206, 205, 175], rough: 0.8, bump: 0.013 },
  duckFeather: { seed: 29, dark: [77, 48, 15], light: [189, 146, 66], rough: 0.66, bump: 0.014 },
  octopus:     { seed: 31, dark: [48, 28, 58], light: [145, 103, 133], rough: 0.31, bump: 0.02, coat: 0.4 },
  cactus:      { seed: 37, dark: [30, 52, 29], light: [103, 130, 66], rough: 0.54, bump: 0.025, coat: 0.12 },
  cow:         { seed: 41, dark: [83, 65, 99], light: [214, 208, 177], rough: 0.85, bump: 0.012 },
  banana:      { seed: 43, dark: [74, 45, 12], light: [211, 177, 51], rough: 0.56, bump: 0.013, coat: 0.08 },
  bananaFlesh: { seed: 47, dark: [172, 152, 104], light: [231, 216, 171], rough: 0.59, bump: 0.009 },
  pasta:       { seed: 53, dark: [137, 88, 36], light: [221, 177, 105], rough: 0.73, bump: 0.022 },
  scales:      { seed: 59, dark: [56, 37, 15], light: [189, 150, 66], rough: 0.46, bump: 0.028, metal: 0.55 },
  membrane:    { seed: 61, dark: [87, 42, 49], light: [177, 109, 118], rough: 0.48, bump: 0.011, coat: 0.15 },
  horn:        { seed: 67, dark: [45, 38, 31], light: [161, 143, 110], rough: 0.56, bump: 0.018 },
  ceramic:     { seed: 71, dark: [98, 115, 110], light: [198, 205, 177], rough: 0.24, bump: 0.009, coat: 0.72 },
  metal:       { seed: 73, dark: [20, 26, 29], light: [99, 109, 109], rough: 0.69, bump: 0.018, metal: 0.78 },
  cloth:       { seed: 79, dark: [29, 30, 34], light: [100, 97, 83], rough: 0.97, bump: 0.014 },
  sclera:      { seed: 83, dark: [137, 116, 106], light: [231, 223, 194], rough: 0.18, bump: 0.002, coat: 0.4 },
  iris:        { seed: 89, dark: [34, 36, 19], light: [164, 144, 67], rough: 0.27, bump: 0.004, coat: 0.35 },
  cavity:      { seed: 97, dark: [8, 4, 7], light: [35, 16, 25], rough: 0.73, bump: 0.009 },
  gum:         { seed: 101, dark: [70, 30, 38], light: [143, 81, 77], rough: 0.34, bump: 0.008, coat: 0.22 },
  teeth:       { seed: 103, dark: [115, 92, 56], light: [219, 204, 160], rough: 0.39, bump: 0.004, coat: 0.18 },
  soil:        { seed: 107, dark: [20, 15, 12], light: [96, 74, 45], rough: 0.99, bump: 0.035 },
  lava:        { seed: 109, dark: [20, 19, 23], light: [78, 65, 63], rough: 0.92, bump: 0.04 },
  butter:      { seed: 113, dark: [173, 134, 42], light: [238, 214, 135], rough: 0.37, bump: 0.009, coat: 0.13 },
};

const aliases = {
  penguin: 'feather', penguinFeather: 'feather', darkFeather: 'feather', duck: 'duckFeather',
  lunarCow: 'cow', fur: 'cow', peel: 'banana', flesh: 'bananaFlesh', gold: 'scales',
  reptile: 'scales', scale: 'scales', glaze: 'ceramic', rust: 'metal', lips: 'gum',
  lip: 'gum', tooth: 'teeth', mouth: 'cavity', bread: 'crust', sponge: 'crumb',
};

function sample(name, p, u, v, ix, iy) {
  const s = p.seed;
  const low = noise(u, v, 4, s);
  const mid = noise(u, v, 13, s + 1);
  const fine = noise(u, v, 47, s + 2);
  const grain = hash(ix, iy, s + 3);
  let pigment = 0.38 + low * 0.35 + mid * 0.17;
  let height = 0.45 + (mid - 0.5) * 0.2 + (fine - 0.5) * 0.16;
  let roughness = p.rough + (mid - 0.5) * 0.14;
  let accent = null, amount = 0, metalMask = 1, ember = 0;

  if (name === 'crust' || name === 'crumb' || name === 'pasta') {
    const c = cells(u + (low - 0.5) * 0.04, v, name === 'crumb' ? 20 : 29, 27, s);
    const pore = 1 - smooth(0.07, 0.2 + c.id * 0.13, c.d);
    const rim = Math.exp(-Math.pow((c.d - 0.29) * 12, 2));
    height = 0.5 + (mid - 0.5) * 0.24 + rim * 0.08 - pore * 0.35 + (grain - 0.5) * 0.06;
    pigment = 0.31 + low * 0.58 + fine * 0.12 - pore * 0.37;
    if (name === 'crust') {
      const toast = smooth(0.53, 0.82, low * 0.62 + mid * 0.38);
      pigment -= toast * 0.48;
      accent = [33, 17, 10]; amount = toast * 0.3;
    } else if (name === 'pasta') {
      const blister = smooth(0.66, 0.81, mid);
      height += blister * 0.25;
      pigment -= blister * 0.32;
      accent = [235, 222, 191]; amount = smooth(0.68, 0.9, fine) * 0.27;
    } else pigment += 0.15;
    roughness += pore * 0.09;
  } else if (name === 'feather' || name === 'duckFeather' || name === 'paleFeather') {
    // Staggered, tapering feather vanes with fine angled barbs and shaft relief.
    const row = Math.floor(v * 14);
    const fy = fract(v * 14);
    const fx = fract(u * 18 + (row % 2) * 0.5 + Math.sin(v * TAU * 7) * 0.09) - 0.5;
    const shaft = Math.exp(-Math.abs(fx) * 57);
    const edge = smooth(0.27 + 0.15 * (1 - fy), 0.5, Math.abs(fx));
    const barbs = Math.sin((fy * 12 + Math.abs(fx) * 16) * TAU);
    height = 0.42 + shaft * 0.2 + barbs * 0.048 - edge * 0.14 + (fine - 0.5) * 0.07;
    pigment = 0.32 + low * 0.35 + barbs * 0.045 + shaft * 0.17 - edge * 0.16;
    roughness -= shaft * 0.1;
  } else if (name === 'octopus') {
    const chromatophore = cells(u, v, 30, 30, s);
    const spots = (1 - smooth(0.12, 0.39, chromatophore.d)) * smooth(0.2, 0.7, chromatophore.id);
    const papilla = smooth(0.61, 0.8, mid);
    pigment = 0.28 + low * 0.51 + mid * 0.17 - spots * 0.34;
    height = 0.42 + papilla * 0.22 + fine * 0.15 + spots * 0.1;
    accent = [86, 51, 81]; amount = spots * 0.6;
    roughness += papilla * 0.15 - spots * 0.06;
  } else if (name === 'cactus') {
    const rib = Math.pow(0.5 + 0.5 * Math.cos(u * TAU * 10 + (mid - 0.5) * 0.4), 0.7);
    const scar = smooth(0.7, 0.79, mid + (fine - 0.5) * 0.13) * (1 - smooth(0.35, 0.61, low));
    const wax = noise(u, v, 25, s + 7);
    height = 0.25 + rib * 0.4 + fine * 0.09 - scar * 0.15;
    pigment = 0.29 + rib * 0.31 + low * 0.23;
    accent = [174, 151, 105]; amount = scar * 0.86;
    roughness += scar * 0.28 + (wax - 0.5) * 0.1;
  } else if (name === 'cow') {
    const patch = smooth(0.55, 0.63, low * 0.7 + mid * 0.3 + (fine - 0.5) * 0.06);
    const strands = Math.sin((u * 99 + Math.sin(v * TAU * 4) * 1.5 + mid * 1.7) * TAU);
    const worn = smooth(0.7, 0.88, fine);
    pigment = 0.81 + low * 0.14 - patch * 0.61 + strands * 0.03;
    height = 0.5 + strands * 0.065 + fine * 0.08 - worn * 0.08;
    accent = [57, 44, 69]; amount = patch * 0.52;
    roughness -= worn * 0.11;
  } else if (name === 'banana') {
    const fibers = Math.sin((u * 54 + mid * 0.35) * TAU);
    const bruise = smooth(0.59, 0.77, low * 0.55 + mid * 0.45);
    const speck = smooth(0.81, 0.94, grain) * smooth(0.36, 0.69, mid);
    pigment = 0.63 + low * 0.19 - bruise * 0.5 - speck * 0.45;
    height = 0.5 + fibers * 0.04 + fine * 0.065 - bruise * 0.075;
    accent = [56, 34, 20]; amount = bruise * 0.67 + speck * 0.3;
    roughness += bruise * 0.16;
  } else if (name === 'bananaFlesh') {
    const fibers = Math.sin((u * 62 + mid * 0.25) * TAU);
    const oxidized = smooth(0.61, 0.83, low);
    pigment = 0.77 + fine * 0.14 - oxidized * 0.24;
    height = 0.5 + fibers * 0.075 + (grain - 0.5) * 0.035;
    accent = [151, 120, 68]; amount = oxidized * 0.25;
  } else if (name === 'scales') {
    const row = Math.floor(v * 18), y = fract(v * 18);
    const x = fract(u * 17 + (row % 2) * 0.5) - 0.5;
    const arc = Math.sqrt(x * x * 2.25 + Math.pow(y - 0.05, 2));
    const rim = 1 - smooth(0.022, 0.11, Math.abs(arc - 0.81));
    const seam = smooth(0.79, 0.94, arc);
    height = 0.39 + (1 - seam) * 0.22 + rim * 0.13 + fine * 0.06;
    const patina = smooth(0.61, 0.78, low * 0.5 + mid * 0.5);
    pigment = 0.42 + low * 0.25 + hash(Math.floor(u * 17 + (row % 2) * 0.5), row, s) * 0.12 + rim * 0.18 - seam * 0.44;
    accent = [78, 68, 36]; amount = patina * 0.4;
    metalMask = 1 - patina * 0.65 - seam * 0.24;
    roughness += seam * 0.2;
  } else if (name === 'membrane' || name === 'gum') {
    const fold = Math.abs(Math.sin((u * (name === 'gum' ? 22 : 9) + low * 0.8) * TAU));
    const trunk = Math.abs(Math.sin((u * 4 + Math.sin(v * TAU * 3) * 0.35 + low * 1.4) * TAU));
    const branch = Math.abs(Math.sin((u * 9 - v * 5 + mid * 0.65) * TAU));
    const vessel = Math.max((1 - smooth(0.018, 0.11, trunk)) * 0.55, (1 - smooth(0.009, 0.055, branch)) * smooth(0.5, 0.76, low) * 0.4);
    pigment = 0.42 + low * 0.3 + fine * 0.08 - vessel * 0.11;
    height = 0.44 + fold * 0.12 + fine * 0.08 - vessel * 0.07;
    accent = [80, 31, 46]; amount = vessel * 0.38;
    roughness += fold * 0.05;
  } else if (name === 'horn') {
    const grainLine = Math.sin((u * 47 + mid * 0.6) * TAU);
    const growth = Math.pow(0.5 + 0.5 * Math.sin((v * 23 + low * 0.3) * TAU), 8);
    pigment = 0.3 + low * 0.43 + grainLine * 0.055 - growth * 0.04;
    height = 0.45 + grainLine * 0.1 + growth * 0.16 + fine * 0.04;
  } else if (name === 'ceramic') {
    const c = cells(u + (low - 0.5) * 0.02, v, 12, 12, s);
    const craze = 1 - smooth(0.005, 0.039, c.edge);
    const stain = smooth(0.58, 0.8, low) * 0.6;
    pigment = 0.78 + mid * 0.14 - craze * 0.26 - stain * 0.25;
    height = 0.53 + (fine - 0.5) * 0.05 - craze * 0.12;
    accent = [91, 67, 42]; amount = craze * 0.38 + stain * 0.24;
    roughness += craze * 0.3 + stain * 0.14;
  } else if (name === 'metal') {
    const rust = smooth(0.48, 0.72, low * 0.65 + mid * 0.35);
    const scratch = Math.pow(0.5 + 0.5 * Math.sin((u * 112 + low * 0.1) * TAU), 28) * smooth(0.38, 0.65, mid);
    pigment = 0.4 + mid * 0.2 + scratch * 0.28;
    height = 0.47 + fine * 0.12 + rust * 0.1 - scratch * 0.08;
    accent = [121, 63, 31]; amount = rust * 0.84;
    metalMask = 1 - rust * 0.95;
    roughness += rust * 0.21 - scratch * 0.18;
  } else if (name === 'cloth') {
    const warp = Math.sin(u * TAU * 88), weft = Math.sin(v * TAU * 88);
    const weave = warp * weft;
    const worn = smooth(0.65, 0.85, mid);
    pigment = 0.41 + low * 0.25 + weave * 0.065 + worn * 0.21;
    height = 0.48 + weave * 0.12 + Math.max(warp, weft) * 0.055 - worn * 0.075;
  } else if (name === 'sclera') {
    // Branching capillaries are strongest near the eye's poles, retaining an
    // ivory front. +Z on SphereGeometry is at u=.25, v=.5.
    const a = Math.abs(Math.sin((u * 12 + v * 3 + low * 1.6) * TAU));
    const b = Math.abs(Math.sin((u * 19 - v * 7 + mid * 0.3) * TAU));
    const edge = 0.18 + Math.pow(Math.abs(v - 0.5) * 2, 1.8) * 0.82;
    const vein = (1 - smooth(0.015, 0.105, a)) * edge;
    const branch = (1 - smooth(0.015, 0.065, b)) * smooth(0.61, 0.79, mid) * edge;
    pigment = 0.88 + mid * 0.09 - Math.max(vein, branch) * 0.2;
    height = 0.5 + (fine - 0.5) * 0.04 + vein * 0.025;
    accent = [158, 62, 65]; amount = Math.max(vein, branch) * 0.76;
  } else if (name === 'iris') {
    // Duplicate circular grain on +Z and -Z so mirrored eyeballs remain valid.
    const dx = (mod(u, 0.5) - 0.25) * 2, dy = (v - 0.5);
    const r = Math.sqrt(dx * dx + dy * dy), angle = Math.atan2(dy, dx);
    const fibers = Math.sin(angle * 89 + r * 24 + mid * 1.4) * Math.sin(angle * 37 - r * 13);
    const crypts = Math.pow(0.5 + 0.5 * Math.sin(angle * 23 + r * 36), 9);
    const ring = Math.pow(0.5 + 0.5 * Math.sin(r * 63 + fine), 6);
    pigment = 0.44 + fibers * 0.23 + low * 0.2 - crypts * 0.24 + ring * 0.07;
    height = 0.5 + fibers * 0.13 - crypts * 0.1;
    accent = [117, 128, 70]; amount = 0.24 + Math.sin(angle * 7) * 0.12;
  } else if (name === 'cavity') {
    pigment = 0.17 + low * 0.3 + fine * 0.1;
    height = 0.43 + mid * 0.19;
  } else if (name === 'teeth') {
    const striation = Math.sin((u * 68 + mid * 0.27) * TAU);
    const stain = smooth(0.57, 0.78, low);
    const crack = (1 - smooth(0.005, 0.03, Math.abs(mid - 0.57))) * smooth(0.56, 0.77, low);
    pigment = 0.85 + fine * 0.08 - stain * 0.25 - crack * 0.28;
    height = 0.5 + striation * 0.035 - crack * 0.15;
    roughness += stain * 0.17;
  } else if (name === 'soil') {
    const c = cells(u, v, 34, 34, s);
    const pebble = (1 - smooth(0.13, 0.32, c.d)) * smooth(0.47, 0.71, c.id);
    height = 0.3 + mid * 0.25 + grain * 0.15 + pebble * 0.27;
    pigment = 0.23 + low * 0.4 + grain * 0.17 + pebble * 0.18;
  } else if (name === 'lava') {
    const c = cells(u + (mid - 0.5) * 0.05, v, 9, 9, s);
    const fissure = 1 - smooth(0.007, 0.09, c.edge);
    height = 0.39 + mid * 0.25 + fine * 0.1 - fissure * 0.32;
    pigment = 0.37 + low * 0.35;
    accent = [154, 52, 20]; amount = fissure * 0.9;
    ember = Math.pow(fissure, 1.6) * (0.62 + fine * 0.38);
    roughness -= fissure * 0.18;
  } else if (name === 'butter') {
    const smear = Math.sin((u * 7 + low * 1.1) * TAU);
    const pits = smooth(0.74, 0.86, fine);
    height = 0.49 + smear * 0.065 - pits * 0.13;
    pigment = 0.73 + low * 0.15 - pits * 0.14;
    roughness += pits * 0.17;
  }
  // Fine pigment scatter remains subordinate to each material's larger anatomy.
  pigment += (grain - 0.5) * (name === 'sclera' || name === 'iris' ? 0.012 : 0.035);
  const rgb = p.dark.map((c, i) => {
    const color = mix(c, p.light[i], pigment);
    return Math.round(clamp(accent ? mix(color, accent[i], amount) : color, 0, 255));
  });
  return { rgb, height: clamp(height), roughness: clamp(roughness, 0.07, 1), metalMask: clamp(metalMask), ember };
}

function texture(data, name, colorSpace) {
  const t = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.name = name;
  t.colorSpace = colorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Return one shared material. Clone it before changing instance-only values. */
export function surface(requestedName) {
  const name = aliases[requestedName] || requestedName;
  if (cache.has(name)) return cache.get(name);
  const p = profiles[name];
  if (!p) throw new Error(`Unknown collectible surface: ${String(requestedName)}`);
  const albedo = new Uint8Array(SIZE * SIZE * 4);
  const detail = new Uint8Array(SIZE * SIZE * 4);
  const emission = name === 'lava' ? new Uint8Array(SIZE * SIZE * 4) : null;
  let minHeight = 1, maxHeight = 0, minRoughness = 1, maxRoughness = 0;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const f = sample(name, p, x / SIZE, y / SIZE, x, y);
    const i = (y * SIZE + x) * 4;
    albedo[i] = f.rgb[0]; albedo[i + 1] = f.rgb[1]; albedo[i + 2] = f.rgb[2]; albedo[i + 3] = 255;
    detail[i] = Math.round(f.height * 255);
    detail[i + 1] = Math.round(f.roughness * 255);
    detail[i + 2] = Math.round(f.metalMask * 255); detail[i + 3] = 255;
    if (emission) {
      emission[i] = Math.round(248 * f.ember);
      emission[i + 1] = Math.round(77 * f.ember);
      emission[i + 2] = Math.round(16 * f.ember);
      emission[i + 3] = 255;
    }
    minHeight = Math.min(minHeight, f.height); maxHeight = Math.max(maxHeight, f.height);
    minRoughness = Math.min(minRoughness, f.roughness); maxRoughness = Math.max(maxRoughness, f.roughness);
  }
  const map = texture(albedo, `collectible/${name}/sRGB-albedo`, THREE.SRGBColorSpace);
  const packed = texture(detail, `collectible/${name}/height-R_roughness-G_metalness-B`, THREE.NoColorSpace);
  const Material = p.coat ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const options = {
    name: `collectible-surface:${name}`, color: 0xffffff, map,
    bumpMap: packed, bumpScale: p.bump, roughnessMap: packed, roughness: 1,
    metalness: p.metal || 0, metalnessMap: p.metal ? packed : null,
  };
  if (p.coat) { options.clearcoat = p.coat; options.clearcoatRoughness = 0.23; }
  if (emission) {
    options.emissiveMap = texture(emission, `collectible/${name}/sRGB-ember-fissures`, THREE.SRGBColorSpace);
    options.emissive = 0xffffff;
    options.emissiveIntensity = 0.95;
  }
  const material = new Material(options);
  material.userData = {
    surface: name, procedural: true, deterministic: true, seed: p.seed,
    textureSize: SIZE, textureCount: emission ? 3 : 2,
    bytes: albedo.byteLength + detail.byteLength + (emission?.byteLength || 0),
    channels: 'albedo: sRGB RGB; bump: linear R; roughness: linear G; metalness: linear B',
    emission: emission ? 'sRGB orange-red fissure mask; intact rock is unlit; intensity 0.95' : 'none',
    heightRange: [minHeight, maxHeight], roughnessRange: [minRoughness, maxRoughness],
  };
  cache.set(name, material);
  return material;
}

export function getSurfaceStats() {
  const materials = [...cache.values()];
  return {
    resolution: SIZE,
    available: Object.keys(profiles),
    materialCount: cache.size,
    textureCount: materials.reduce((sum, material) => sum + material.userData.textureCount, 0),
    textureBytes: materials.reduce((sum, material) => sum + material.userData.bytes, 0),
    surfaces: [...cache.keys()],
  };
}
