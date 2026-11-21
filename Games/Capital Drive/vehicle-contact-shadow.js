import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const WIDTH = 32, HEIGHT = 64;

function smoothstep(start, end, value) {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

// One compact stamp suggests both underbody shade and the four wheel contacts.
export function createVehicleContactShadow() {
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
    const u = Math.abs((x + .5) * 2 / WIDTH - 1), v = Math.abs((y + .5) * 2 / HEIGHT - 1);
    const edge = Math.hypot(Math.max(0, u - .46), Math.max(0, v - .58));
    const shade = 1 - smoothstep(.03, .39, edge);
    const tread = 1 - smoothstep(.02, .29, Math.hypot(u - .58, v - .55));
    pixels[(y * WIDTH + x) * 4 + 3] = Math.round(106 * shade + 36 * tread);
  }
  const texture = new THREE.DataTexture(pixels, WIDTH, HEIGHT);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  // The game places car roots 18 cm above the surface. Keep the stamp close
  // to the road mesh while clearing its paint and kerb overlays.
  geometry.translate(0, -.062, 0);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  return { geometry, material, texture };
}

export function vehicleShadowScale({ width, length }) {
  return new THREE.Vector3(width + .95, 1, length + 1.18);
}
