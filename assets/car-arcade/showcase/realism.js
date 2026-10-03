import * as THREE from '../vendor/three.module.js';

// Original repeat tiles, generated per decorated root. No shared GPU ownership.
function tile(size, seed, repeat, sample, color = false) {
  const data = new Uint8Array(size * size * 4);
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const value = Math.max(0, Math.min(255, Math.round(sample(x, y, random))));
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = value; data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function dial(max, units) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Instrument canvas unavailable');
  ctx.fillStyle = '#17191a'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#d4d5ce'; ctx.fillStyle = '#e5e5df';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 18px sans-serif';
  const divisions = max === 160 ? 32 : 30, major = max === 160 ? 4 : 5;
  // +Z circular faces: lower-left zero matches the physical parked needles.
  for (let i = 0; i <= divisions; i++) {
    const a = (225 - 270 * i / divisions) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const r = i % major === 0 ? 88 : 97;
    ctx.lineWidth = i % major === 0 ? 2.5 : 1.2;
    ctx.beginPath(); ctx.moveTo(128 + r * c, 128 - r * s);
    ctx.lineTo(128 + 108 * c, 128 - 108 * s); ctx.stroke();
    if (i % major === 0) ctx.fillText(String(Math.round(max * i / divisions)), 128 + 72 * c, 128 - 72 * s);
  }
  ctx.font = '15px sans-serif'; ctx.fillText(units, 128, 170);
  if (max === 6) { ctx.font = '13px sans-serif'; ctx.fillText('×1000', 128, 188); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function materials(root) {
  const set = new Set();
  root.traverse(node => { if (node.isMesh) for (const mat of Array.isArray(node.material) ? node.material : [node.material]) set.add(mat); });
  return set;
}

export function decorateCar(car) {
  const mats = materials(car), maps = new Map();
  // Allocate only when consumed; each map may serve roughness and bump together.
  const grain = name => {
    if (!maps.has(name)) {
      const presets = {
        paint: [17, 28, (x, y, r) => 230 + 12 * (r() - .5)],
        plastic: [29, 24, (x, y, r) => 229 + 30 * (r() - .5)],
        rubber: [43, 16, (x, y, r) => 238 + 24 * (r() - .5)],
        fabric: [67, 28, (x, y, r) => 224 + 12 * Math.sin(x * Math.PI / 2) * Math.cos(y * Math.PI / 2) + 10 * (r() - .5)]
      };
      const [seed, repeat, sample] = presets[name];
      maps.set(name, tile(128, seed, [repeat, repeat], sample));
    }
    return maps.get(name);
  };
  for (const mat of mats) {
    switch (mat.name) {
      case 'body-paint':
      case 'roof-paint':
        mat.metalness = mat.name === 'body-paint' ? .22 : 0;
        mat.roughness = .29; mat.clearcoat = .48; mat.clearcoatRoughness = .22;
        mat.roughnessMap = mat.bumpMap = grain('paint'); mat.bumpScale = .00018;
        break;
      case 'cab-plastic':
        mat.metalness = 0; mat.roughness = .69;
        mat.roughnessMap = mat.bumpMap = grain('plastic'); mat.bumpScale = .00045;
        break;
      case 'seat-fabric':
        mat.metalness = 0; mat.roughness = .98;
        mat.roughnessMap = mat.bumpMap = grain('fabric'); mat.bumpScale = .00055;
        break;
      case 'rubber':
        mat.metalness = 0; mat.roughness = .96;
        mat.roughnessMap = mat.bumpMap = grain('rubber'); mat.bumpScale = .0003;
        break;
      case 'chrome': mat.metalness = 1; mat.roughness = .19; break;
      case 'window-glass': mat.opacity = Math.max(.55, mat.opacity); mat.transmission = 0; mat.metalness = 0; break;
      case 'lamp-lens': mat.transmission = 0; mat.metalness = 0; break;
      case 'dial-speed':
      case 'dial-rpm': {
        const speed = mat.name === 'dial-speed';
        if (!maps.has(mat.name)) maps.set(mat.name, dial(speed ? 160 : 6, speed ? 'km/h' : 'rpm'));
        mat.map = maps.get(mat.name); mat.color.set(0xffffff); mat.roughness = .83; mat.metalness = 0;
        break;
      }
    }
    mat.needsUpdate = true;
  }
  return car;
}

export function decorateGarage(garage) {
  const mats = materials(garage);
  // Neutral aggregate and low-frequency curing variation, not painted-on grime.
  const floorColor = tile(256, 101, [3, 3], (x, y, r) => 231 + 5 * Math.sin(x * Math.PI / 128) * Math.sin(y * Math.PI / 64) + 10 * (r() - .5), true);
  const floorGrain = tile(256, 103, [12, 12], (x, y, r) => 216 + 36 * (r() - .5));
  const wallColor = tile(128, 107, [8, 4], (x, y, r) => 240 + 6 * Math.sin(x * Math.PI / 64) * Math.cos(y * Math.PI / 32) + 8 * (r() - .5), true);
  const wallGrain = tile(128, 109, [24, 12], (x, y, r) => 225 + 34 * (r() - .5));
  const metal = tile(128, 113, [8, 8], (x, y, r) => 220 + 8 * Math.sin(x * Math.PI / 8) * Math.sin(y * Math.PI / 8) + 20 * (r() - .5));
  const woodColor = tile(128, 127, [2, 1], (x, y, r) => 227 + 9 * Math.sin(y * Math.PI / 4 + .65 * Math.sin(x * Math.PI / 64)) + 5 * (r() - .5), true);
  const woodGrain = tile(128, 131, [2, 1], (x, y, r) => 218 + 15 * Math.sin(y * Math.PI / 4 + .65 * Math.sin(x * Math.PI / 64)) + 10 * (r() - .5));
  const stripe = tile(128, 137, [1, 8], (x, y, r) => r() < .075 ? 161 : 232 + 12 * (r() - .5), true);
  for (const mat of mats) {
    switch (mat.name) {
      case 'garage-concrete':
        mat.color.set('#9c9b96'); mat.map = floorColor; mat.roughnessMap = mat.bumpMap = floorGrain;
        mat.roughness = .91; mat.bumpScale = .0012; break;
      case 'garage-wall':
        mat.color.set('#c3c2bc'); mat.map = wallColor; mat.roughnessMap = mat.bumpMap = wallGrain;
        mat.roughness = .95; mat.bumpScale = .0008; break;
      case 'garage-metal':
        mat.color.set('#969b9b'); mat.metalness = .92; mat.roughness = .53;
        mat.roughnessMap = mat.bumpMap = metal; mat.bumpScale = .00012; break;
      case 'garage-wood':
        mat.map = woodColor; mat.roughnessMap = mat.bumpMap = woodGrain;
        mat.roughness = .84; mat.bumpScale = .00045; break;
      case 'garage-stripe': mat.map = stripe; mat.roughness = .91; break;
    }
    mat.needsUpdate = true;
  }
  return garage;
}
