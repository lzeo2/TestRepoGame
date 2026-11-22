import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const RANGE = 340;
const BOXES_PER_SITE = 172;
const GLYPHS = {
  A: ['010', '101', '111', '101', '101'],
  C: ['111', '100', '100', '100', '111'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  I: ['111', '010', '010', '010', '111'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  S: ['111', '100', '111', '001', '111'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'],
};

function title(add, site, text, xScale, y, tint) {
  for (const [column, letter] of [...text].entries()) {
    const pattern = GLYPHS[letter];
    if (!pattern) continue;
    for (const [row, line] of pattern.entries()) {
      for (const run of line.matchAll(/1+/g)) {
        const x = (column * 4 + run.index + (run[0].length - 1) / 2 - (text.length * 4 - 2) / 2) * xScale;
        add(x * site.readingDirection, -.189, y - row * .147, run[0].length * xScale, .035, .128, tint);
      }
    }
  }
}

function facade(add, site) {
  const { width, depth, height, floor, foundation } = site;
  const bank = site.kind === 'bank';
  const siding = bank ? 0xc8b6a5 : 0x74635f;
  const trim = bank ? 0x293d57 : 0x4d3347;
  const glass = bank ? 0x557682 : 0x577178;
  const brass = bank ? 0xe3c080 : 0xdcae73;
  const doorWidth = bank ? 2.34 : 1.74;
  add(0, depth / 2, foundation, width, depth, floor - foundation, 0x79716a);
  add(0, depth / 2, floor, width, depth, height - .12, siding);
  add(0, depth / 2, floor + height - .28, width + .15, depth + .14, .28, trim);
  add(0, -.085, floor + height - 1.62, width, .175, 1.09, trim);
  add(0, -.16, floor + height - 1.67, width, .12, .065, brass);
  add(0, -.77, floor + .005, doorWidth + .65, 1.45, .085, 0xb8b3a5);
  add(0, -.07, floor + .06, doorWidth, .145, 2.82, trim);
  add(0, -.149, floor + .13, doorWidth - .19, .08, 2.64, glass);
  add(0, -.195, floor + .13, .06, .052, 2.68, brass);
  add(.22, -.231, floor + 1.13, .08, .065, .42, brass);
  for (const side of [-1, 1]) {
    const x = side * width * .266;
    const windowWidth = width * .303;
    add(x, -.06, floor + .69, windowWidth + .16, .15, 2.22, trim);
    add(x, -.139, floor + .76, windowWidth, .08, 2.05, glass);
    add(x, -.185, floor + 2.34, windowWidth, .025, .3, 0x8ba1a4);
    add(x, -.201, floor + .6, windowWidth + .16, .45, .14, brass);
    if (bank) {
      const column = side * width * .455;
      add(column, -.15, floor + .17, .52, .36, 3.3, 0x9e8c81);
      add(column, -.16, floor + .11, .67, .42, .19, 0xd6c8b6);
      add(column, -.17, floor + 3.37, .67, .43, .17, 0xd6c8b6);
    } else {
      for (const display of [-.79, .63]) {
        add(x + display, -.197, floor + .81, .74, .054, .28, 0x45373f);
        add(x + display, -.228, floor + 1.09, .11, .049, .34, brass);
        add(x + display, -.263, floor + 1.4, .21, .061, .19, 0xecebf5);
      }
    }
  }
  title(add, site, bank ? 'CIVIC MUTUAL' : 'FACETS', bank ? .186 : .278, floor + height - .665, 0xfff3dd);
}

export function createHeistSitesView(scene, sites) {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, sites.length * BOXES_PER_SITE));
  mesh.name = 'Capital Drive fictional heist storefronts';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.count = 0;
  scene.add(mesh);

  const box = new THREE.Object3D();
  const color = new THREE.Color();
  const stats = { sites: 0, instances: 0, drawCalls: 0 };
  let visibleSites = 0;
  let disposed = false;

  function update(focus) {
    if (disposed) return;
    let next = 0;
    if (focus) for (const [index, site] of sites.entries()) {
      if ((focus.x - site.x) ** 2 + (focus.z - site.z) ** 2 < RANGE ** 2) next |= 1 << index;
    }
    if (next === visibleSites) return;
    visibleSites = next;
    mesh.count = 0;
    stats.sites = 0;
    for (const [index, site] of sites.entries()) {
      if (!(next & (1 << index))) continue;
      stats.sites++;
      facade((across, depth, y, width, length, height, tint) => {
        const { x, z } = site.point(across, depth);
        box.position.set(x, y + height / 2, z);
        box.rotation.y = site.rotation;
        box.scale.set(width, height, length);
        box.updateMatrix();
        mesh.setMatrixAt(mesh.count, box.matrix);
        mesh.setColorAt(mesh.count++, color.setHex(tint));
      }, site);
    }
    mesh.visible = mesh.count > 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    stats.instances = mesh.count;
    stats.drawCalls = Number(mesh.visible);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mesh.removeFromParent();
    mesh.dispose();
    geometry.dispose();
    material.dispose();
    stats.sites = stats.instances = stats.drawCalls = 0;
  }

  return { update, dispose, get stats() { return { ...stats }; } };
}
