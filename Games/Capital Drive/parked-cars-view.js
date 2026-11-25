import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { CAPITAL_BY_ID } from '../../assets/car-arcade/fleet.js';
// One shared template per model and one instance per owner. The parking
// generator uses three models, so mixed cells need at most three draw calls.
export function createParkedCarsView(scene, cars, heightAt) {
  const prototypes = new Map(), chunks = [], records = new Map();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float paintMask;');
    shader.vertexShader = shader.vertexShader.replace('#include <color_vertex>', `
    #ifdef USE_COLOR
    vColor = color;
    #ifdef USE_INSTANCING_COLOR
    vColor *= mix(vec3(1.0), instanceColor, paintMask);
    #endif
    #endif
    `);
  };
  material.customProgramCacheKey = () => 'capital-parked-paint-mask-v1';
  function prototype(id) {
    if (prototypes.has(id)) return prototypes.get(id);
    const spec = CAPITAL_BY_ID[id] || CAPITAL_BY_ID.lantern;
    const { length: l, width: w, height: h } = spec;
    const suv = id === 'gravel', wagon = id === 'orchard';
    const batches = [[], [], []];
    function part(batch, geometry, color, x, y, z, rotate = false) {
      if (rotate) geometry.rotateZ(Math.PI / 2);
      geometry.translate(x, y, z);
      const g = geometry;
      g.deleteAttribute('uv');
      g.clearGroups();
      const mask = new Float32Array(g.attributes.position.count).fill(batch === 0 ? 1 : 0);
      g.setAttribute('paintMask', new THREE.BufferAttribute(mask, 1));
      const c = new THREE.Color(color), colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      batches[batch].push(g);
    }
    const box = (batch, color, x, y, z, sx, sy, sz) => part(batch, new THREE.BoxGeometry(sx, sy, sz), color, x, y, z);
    const panel = (color, x, y, z, sx, sy, ry = 0) => {
      const g = new THREE.PlaneGeometry(sx, sy);
      g.rotateY(ry);
      part(2, g, color, x, y, z);
    };
    const radius = suv ? .39 : .33, belt = h * .57;
    // Box faces retain flat normals after their corners are reshaped into a
    // tapered lower body and sloping front/rear screens.
    const body = new THREE.BoxGeometry(w, belt-radius * .65, l, 1, 1, 2), bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) {
      const upper = bp.getY(i) > 0;
      const shoulder = Math.abs(bp.getZ(i)) > l * .4 ? .91 : .97;
      bp.setX(i, bp.getX(i)*(upper ? shoulder : .88));
    }
    body.computeVertexNormals();
    part(0, body, 0xffffff, 0, (radius * .65+belt)/2, 0);
    const cabinLength = l * (wagon ? .65 : suv ? .59 : .48);
    const cabinZ = wagon ? l * .07 : l * .015;
    const roofFront = cabinZ - cabinLength * .5 + l * .085;
    const roofRear = cabinZ + cabinLength * .5 - l * (wagon ? .025 : suv ? .055 : .105);
    const cabin = new THREE.BoxGeometry(w * .86, h-.08-belt, cabinLength), cp = cabin.attributes.position;
    for (let i = 0; i < cp.count; i++) {
      const upper = cp.getY(i) > 0, front = cp.getZ(i) < 0;
      cp.setX(i, cp.getX(i)*(upper ? .83 : 1));
      if (upper) cp.setZ(i, (front ? roofFront : roofRear) - cabinZ);
    }
    cabin.computeVertexNormals();
    part(1, cabin, 0x344b55, 0, (belt+h-.08)/2, cabinZ);
    box(0, 0xffffff, 0, h-.04, (roofFront+roofRear)/2, w * .86 * .83, .08, roofRear-roofFront);
    // Pillars split the glass into real side windows and frame both screens.
    for (const side of [-1, 1]) {
      const pillarHeight = h - .08 - belt;
      const pillar = new THREE.BoxGeometry(.025, pillarHeight, .065);
      const positions = pillar.attributes.position;
      const beltX = side * w * .43;
      const roofX = beltX * .83;
      for (let i = 0; i < positions.count; i++) {
        positions.setX(i, positions.getX(i) + positions.getY(i) * (roofX - beltX) / pillarHeight);
      }
      pillar.computeVertexNormals();
      part(0, pillar, 0xffffff, (beltX + roofX) / 2, (belt + h - .08) / 2, cabinZ);
      for (const z of [-l * .30, l * .30]) {
        part(2, new THREE.CylinderGeometry(radius, radius, .18, 8, 1), 0x202528, side*(w/2-.09), radius, z, true);
        part(2, new THREE.CylinderGeometry(radius * .51, radius * .51, .179, 8, 1), 0x939b9f, side*(w/2-.09), radius, z, true);
      }
      panel(0xe9dfb7, side * w * .31, belt * .81, -l/2-.006, w * .22, .13, Math.PI);
      panel(0xa43832, side * w * .33, belt * .83, l/2+.006, w * .19, .15);
    }
    for (const z of [-1, 1]) panel(0x444c51, 0, radius * .83, z*(l/2+.012), w * .85, .10, z < 0 ? Math.PI : 0);
    panel(0x1e272c, 0, belt * .58, -l/2-.014, w * .38, .11, Math.PI);
    panel(0xe4e0cf, 0, belt * .73, l/2+.014, .26, .10);
    const all = batches.flat(), result = mergeGeometries(all, false);
    all.forEach(g => g.dispose());
    result.computeBoundingSphere();
    prototypes.set(id, result);
    return result;
  }
  const cells = new Map();
  for (const car of cars) {
    const key = `${Math.floor(car.x / 300)},${Math.floor(car.z / 300)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(car);
  }
  for (const cell of cells.values()) {
    const group = new THREE.Group();
    const x = Math.floor(cell[0].x / 300) * 300;
    const z = Math.floor(cell[0].z / 300) * 300;
    group.position.set(x, 0, z);
    const models = new Map();
    for (const car of cell) {
      if (!models.has(car.modelId)) models.set(car.modelId, []);
      models.get(car.modelId).push(car);
    }
    for (const [id, owners] of models) {
      const mesh = new THREE.InstancedMesh(prototype(id), material, owners.length);
      owners.forEach((car, index) => {
        const matrix = new THREE.Matrix4().makeRotationY(car.yaw);
        matrix.setPosition(car.x - x, heightAt(car), car.z - z);
        mesh.setMatrixAt(index, matrix);
        mesh.setColorAt(index, new THREE.Color(car.color));
        records.set(car.id, { id: car.id, mesh, index, matrix, hidden: false });
      });
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    scene.add(group);
    chunks.push({ group, x, z });
  }
  const empty = new THREE.Matrix4().makeScale(0, 0, 0);
  function hide(id) {
    const record = records.get(id);
    if (!record || record.hidden) return false;
    record.mesh.setMatrixAt(record.index, empty);
    record.mesh.instanceMatrix.needsUpdate = true;
    record.hidden = true;
    return true;
  }
  function restore() {
    for (const record of records.values()) {
      if (!record.hidden) continue;
      record.mesh.setMatrixAt(record.index, record.matrix);
      record.mesh.instanceMatrix.needsUpdate = true;
      record.hidden = false;
    }
  }
  return {
    hide,
    restore,
    cull(focus) {
      for (const chunk of chunks) {
        const dx = Math.max(chunk.x - focus.x, 0, focus.x - chunk.x - 300);
        const dz = Math.max(chunk.z - focus.z, 0, focus.z - chunk.z - 300);
        chunk.group.visible = dx * dx + dz * dz < 600 * 600;
      }
    },
    dispose() {
      for (const chunk of chunks) {
        scene.remove(chunk.group);
        for (const mesh of chunk.group.children) mesh.dispose();
      }
      for (const geometry of prototypes.values()) geometry.dispose();
      material.dispose();
      records.clear();
      chunks.length = 0;
    }
  };
}
