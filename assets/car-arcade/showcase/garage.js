import * as THREE from '../vendor/three.module.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

// Original open-sided workshop set. No imported imagery or branded equipment.
export function createGarage() {
  const garage = new THREE.Group(); garage.name = 'original-workshop';
  const material = (color, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const concrete = material('#a6a198'), wall = material('#c9c5b8');
  const steel = material('#555b5d', .5, .65), dark = material('#343535');
  const paint = material('#b58a45', .65), red = material('#823f32', .45, .3);
  const wood = material('#93806a'), rubber = material('#232425', .96);
  const window = material('#dce4e5', .3, .05);
  const batches = new Map();
  function add(g, mat, shadow = false) {
    const key = mat.uuid + shadow;
    if (!batches.has(key)) batches.set(key, {mat, shadow, pieces: []});
    batches.get(key).pieces.push(g);
  }
  function box(mat, x, y, z, w, h, d, shadow = false) {
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, mat, shadow);
  }
  function cylinder(mat, x, y, z, radius, length, axis = 'y', shadow = true) {
    const g = new THREE.CylinderGeometry(radius, radius, length, 16);
    if (axis === 'x') g.rotateZ(Math.PI / 2);
    if (axis === 'z') g.rotateX(Math.PI / 2);
    g.translate(x, y, z); add(g, mat, shadow);
  }
  box(concrete, 0, -.09, -1, 24, .16, 26);
  // Narrow recessed-looking expansion joints and worn-width parking stripes.
  for (let x = -9; x <= 9; x += 3) box(dark, x, -.008, -1, .012, .003, 26);
  for (let z = -10; z <= 11; z += 3) box(dark, 0, -.008, z, 24, .003, .012);
  for (const x of [-1.65, 1.65]) box(paint, x, -.003, -.1, .075, .004, 5.3);
  box(paint, 0, -.003, 2.5, 3.3, .004, .075);
  // Keep the right side open for exterior camera clearance.
  box(wall, -5.3, 2.2, -2, .18, 4.4, 14);
  box(wall, 0, 2.2, 5, 10.6, 4.4, .18);
  for (const x of [-4.15, 4.15]) box(wall, x, 2.2, -9, 2.3, 4.4, .18);
  box(wall, 0, 3.85, -9, 6, 1.1, .18);
  box(steel, 0, 1.65, -8.94, 5.8, 3.3, .08);
  for (let y = .15; y < 3.3; y += .22) box(dark, 0, y, -8.88, 5.7, .018, .035);
  for (const x of [-3, 3]) box(dark, x, 1.7, -8.82, .11, 3.4, .16);
  box(dark, 0, .85, -8.83, .4, .065, .075);
  for (const z of [-8.6, -2, 4.7]) {
    box(steel, -5.12, 2.2, z, .13, 4.4, .18);
    box(steel, 0, 4.3, z, 10.5, .22, .14);
  }
  // Clerestory glazing and an overhead skylight frame, not emissive neon.
  box(window, -5.19, 3, -2, .025, 1.35, 5.6);
  for (let z = -4.8; z <= .8; z += 1.4) box(steel, -5.16, 3, z, .055, 1.45, .045);
  for (const y of [2.3, 3.7]) box(steel, -5.16, y, -2, .055, .06, 5.7);
  box(window, -1.8, 4.46, -2, 3.4, .025, 4.6);
  for (const x of [-3.55, -.05]) box(steel, x, 4.4, -2, .08, .14, 4.8);
  for (const z of [-4.35, -2, .35]) box(steel, -1.8, 4.4, z, 3.6, .14, .07);
  // Tool drawers, handles and a timber-topped steel workbench.
  box(red, -3.85, .62, 3.9, 1.15, 1.16, .65, true);
  for (let y = .25; y < 1.15; y += .19) {
    box(dark, -3.85, y, 3.565, 1.04, .012, .018);
    box(steel, -3.85, y + .065, 3.53, .48, .025, .055);
  }
  box(wood, -1.8, 1.04, 4.05, 2.3, .1, .85, true);
  for (const x of [-2.8, -.8]) for (const z of [3.75, 4.35]) box(steel, x, .51, z, .07, 1, .07, true);
  box(steel, -1.8, .25, 4.05, 2.15, .06, .7, true);
  box(dark, -2.4, 1.15, 3.87, .32, .13, .24, true);
  box(steel, -2.4, 1.25, 3.87, .42, .07, .12, true);
  for (let i = 0; i < 3; i++) cylinder(red, -1.55 + i * .2, 1.21, 4.15, .055, .24);
  // Horizontal compressor tank with motor, feet, gauge and a short hose coil.
  cylinder(red, -4.15, .43, 1.9, .23, .8, 'z');
  box(dark, -4.15, .74, 1.94, .29, .19, .33, true);
  for (const z of [1.63, 2.18]) box(steel, -4.15, .13, z, .52, .12, .1, true);
  cylinder(steel, -4.15, .92, 1.74, .065, .03, 'z');
  for (let i = 0; i < 3; i++) {
    const g = new THREE.TorusGeometry(.18 + i * .012, .013, 5, 20);
    g.rotateY(Math.PI / 2); g.translate(-3.86, .51, 2.02); add(g, rubber);
  }
  // Four spare tires stand in a two-tier rack along the rear wall.
  for (const x of [2, 4.3]) box(steel, x, 1.1, 4.1, .08, 2.2, .65, true);
  for (const y of [.25, 1.3]) {
    box(steel, 3.15, y, 4.1, 2.4, .07, .65, true);
    for (const x of [2.65, 3.65]) {
      const g = new THREE.TorusGeometry(.31, .105, 8, 24);
      g.translate(x, y + .43, 4.1); add(g, rubber, true);
    }
  }
  for (const {mat, shadow, pieces} of batches.values()) {
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach(g => g.dispose());
    if (!geometry) throw new Error('Workshop geometry merge failed');
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = shadow; mesh.receiveShadow = true; garage.add(mesh);
  }
  return garage;
}
