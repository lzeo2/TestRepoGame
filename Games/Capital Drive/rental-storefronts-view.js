import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const RANGE = 330;
const LETTERS = {
  A: ['010', '101', '111', '101', '101'], C: ['111', '100', '100', '100', '111'],
  E: ['111', '100', '110', '100', '111'], L: ['100', '100', '100', '100', '111'],
  N: ['101', '111', '111', '111', '101'], R: ['110', '101', '110', '101', '101'],
  T: ['111', '010', '010', '010', '010'],
};

// One culled batch owns all visible storefronts, including its original lettering.
export function createRentalStorefrontsView(scene, heightAt, sites) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const batch = new THREE.InstancedMesh(geometry, material, Math.max(1, sites.length) * 112);
  const instance = new THREE.Object3D(), color = new THREE.Color();
  const stats = { storefronts: 0, instances: 0, drawCalls: 0, disposed: false };
  let lastX = Infinity, lastZ = Infinity;
  batch.name = 'Capital Car Rental storefronts';
  batch.count = 0;
  batch.visible = false;
  batch.frustumCulled = false;
  batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(batch);

  function renderSite(site) {
    const { point, rotation } = site;
    const ground = (u, v) => { const { x, z } = point(u, v); return heightAt(x, z); };
    const floor = Math.max(ground(-6, 15), ground(6, 15), ground(6, 22), ground(-6, 22));
    function box(u, v, y, width, depth, height, tint) {
      const { x, z } = point(u, v);
      instance.position.set(x, y, z);
      instance.rotation.y = rotation;
      instance.scale.set(width, height, depth);
      instance.updateMatrix();
      batch.setMatrixAt(stats.instances, instance.matrix);
      batch.setColorAt(stats.instances, color.setHex(tint));
      stats.instances++;
    }
    // Small apron sections follow the sampled terrain. The roadside seam stays
    // outside the lane and the existing sidewalk.
    for (const v of [1, 5, 9, 13]) box(0, v, ground(0, v) + .09, 10.9, 4.02, .1, 0x727977);
    box(0, 18.5, floor + 1.45, 12, 7, 5, 0xb18b78);
    box(0, 18.5, floor + 4.02, 12, 7, .26, 0x414a47);
    box(0, 14.84, floor + 3.44, 12, .45, 1.12, site.tint);
    box(0, 14.65, floor + 2.88, 12, .42, .09, 0xeec374);
    box(0, 14.04, floor + .06, 2.6, 1.6, .11, 0xb5bcb6);
    box(0, 14.88, floor + 1.26, 1.8, .18, 2.52, 0x313936);
    box(0, 14.79, floor + 1.26, 1.57, .06, 2.33, 0x335e70);
    box(0, 14.74, floor + 1.29, .065, .08, 2.28, 0x9faeb0);
    box(.28, 14.71, floor + 1.07, .1, .1, .28, 0xccc9ba);
    for (const u of [-3.35, 3.35]) {
      box(u, 14.9, floor + 1.53, 4.05, .16, 2, 0x333d3c);
      box(u, 14.83, floor + 1.54, 3.87, .08, 1.83, 0x436779);
      box(u, 14.77, floor + 2.1, 3.87, .02, .3, 0x7895a0);
      box(u, 14.72, floor + 1.53, .075, .08, 1.82, 0xabbabc);
      box(u, 14.76, floor + .54, 4.14, .22, .115, 0xe5dccb);
    }

    const title = 'CAR RENTAL', pixel = .228;
    for (let letter = 0; letter < title.length; letter++) {
      const glyph = LETTERS[title[letter]];
      if (!glyph) continue;
      for (const [row, line] of glyph.entries()) {
        for (const run of line.matchAll(/1+/g)) {
          const u = (letter * 4 + run.index + (run[0].length - 1) / 2 - (title.length * 4 - 2) / 2) * pixel * site.signDirection;
          box(u, 14.6, floor + 3.82 - row * .188, run[0].length * pixel, .065, .16, 0xfff4dc);
        }
      }
    }
    // High-contrast pickup pocket with a gap facing the road.
    for (const u of [-1.75, 1.75]) for (const v of [5.45, 8.55]) box(u, v, ground(u, v) + .16, .16, 3.1, .035, 0xf4d27e);
    box(0, 10.1, ground(0, 10.1) + .16, 3.65, .16, .035, 0xf4d27e);
  }

  function update(focus) {
    if (stats.disposed) return;
    if (!focus || !Number.isFinite(focus.x) || !Number.isFinite(focus.z)) {
      batch.count = 0;
      batch.visible = false;
      stats.storefronts = stats.instances = stats.drawCalls = 0;
      lastX = lastZ = Infinity;
      return;
    }
    if (Math.hypot(focus.x - lastX, focus.z - lastZ) < 5) return;
    lastX = focus.x;
    lastZ = focus.z;
    stats.storefronts = stats.instances = 0;
    for (const site of sites) if (Math.hypot(focus.x - site.x, focus.z - site.z) < RANGE) {
      renderSite(site);
      stats.storefronts++;
    }
    batch.count = stats.instances;
    batch.visible = batch.count > 0;
    batch.instanceMatrix.needsUpdate = true;
    if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
    stats.drawCalls = batch.visible ? 1 : 0;
  }
  function dispose() {
    if (stats.disposed) return;
    batch.removeFromParent();
    batch.dispose();
    geometry.dispose();
    material.dispose();
    stats.storefronts = stats.instances = stats.drawCalls = 0;
    stats.disposed = true;
  }
  return { update, dispose, get stats() { return { ...stats }; } };
}
