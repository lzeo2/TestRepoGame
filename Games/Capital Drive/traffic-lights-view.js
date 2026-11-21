import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

const CAPACITY = 96, DISTANCE = 350;
const ASPECTS = ['red', 'amber', 'green'];
const HEIGHTS = { red: 4.25, amber: 3.7, green: 3.15 };
const BRIGHT = { red: 0xff2920, amber: 0xffbb16, green: 0x24ff69 };
const DIM = { red: 0x39130f, amber: 0x3b2d0e, green: 0x0b3020 };

// Original three-aspect street furniture, not a surveyed Canberra head model.
// Incoming vehicle yaw has forward -Z; the lens normal is +Z, toward its driver.
export function createTrafficLightsView(scene, heightAt) {
  const root = new THREE.Group(); root.name = 'Functional traffic signals'; scene.add(root);
  const geometries = new Set(), materials = new Set();
  const pose = new THREE.Object3D(), lensMatrix = new THREE.Matrix4();
  const nearest = [], distances = [], heights = [];
  let disposed = false;
  const stats = { sourceHeads: 0, visible: 0, red: 0, amber: 0, green: 0,
    drawCalls: 0, maxDrawCalls: 5, capacity: CAPACITY, cullDistance: DISTANCE,
    geometries: 0, materials: 0, triangles: 0, disposed: false };

  function colored(geometry, color) {
    const shade = new THREE.Color(color), values = new Float32Array(geometry.attributes.position.count * 3);
    for (let i = 0; i < values.length; i += 3) { values[i] = shade.r; values[i + 1] = shade.g; values[i + 2] = shade.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
    return geometry;
  }
  function merge(parts) {
    const result = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    if (!result) throw new Error('Traffic signal geometry merge failed');
    return result;
  }
  function batch(geometry, material, name) {
    geometries.add(geometry); materials.add(material);
    const mesh = new THREE.InstancedMesh(geometry, material, CAPACITY);
    mesh.name = name; mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh);
    return mesh;
  }
  const structure = [
    colored(new THREE.CylinderGeometry(.065, .085, 4.1, 8).translate(0, 2.05, -.18), 0x51554f),
    colored(new THREE.CylinderGeometry(.16, .18, .16, 8).translate(0, .08, -.18), 0x51554f),
    colored(new THREE.BoxGeometry(.76, 1.94, .07).translate(0, 3.7, -.15), 0x171b17),
    colored(new THREE.BoxGeometry(.55, 1.68, .34).translate(0, 3.7, .05), 0x101310)
  ];
  const dimLenses = [];
  for (const aspect of ASPECTS) {
    const y = HEIGHTS[aspect];
    structure.push(colored(new THREE.TorusGeometry(.205, .035, 4, 12).translate(0, y, .235), 0x0b0e0b));
    // Open upper-half hoods shade the lenses without obscuring the approach.
    structure.push(colored(new THREE.CylinderGeometry(.235, .235, .24, 12, 1, true, Math.PI / 2, Math.PI)
      .rotateX(Math.PI / 2).translate(0, y, .33), 0x101310));
    dimLenses.push(colored(new THREE.CircleGeometry(.185, 12).translate(0, y, .243), DIM[aspect]));
  }
  const body = batch(merge(structure), new THREE.MeshLambertMaterial({ vertexColors: true }), 'Signal poles housings and hoods');
  const dim = batch(merge(dimLenses), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), 'Unlit signal lenses');
  const lensGeometry = new THREE.CircleGeometry(.18, 12), active = {}, lensOffsets = {};
  for (const aspect of ASPECTS) {
    active[aspect] = batch(lensGeometry, new THREE.MeshBasicMaterial({ color: BRIGHT[aspect], toneMapped: false }), `Active ${aspect} signals`);
    active[aspect].userData.aspect = aspect;
    lensOffsets[aspect] = new THREE.Matrix4().makeTranslation(0, HEIGHTS[aspect], .25);
  }
  const bodyTriangles = body.geometry.index.count / 3 + dim.geometry.index.count / 3;
  stats.geometries = geometries.size; stats.materials = materials.size;

  function update(heads, focus) {
    if (disposed) return;
    nearest.length = 0; distances.length = 0; heights.length = 0;
    stats.sourceHeads = Array.isArray(heads) ? heads.length : 0;
    stats.visible = 0; stats.red = 0; stats.amber = 0; stats.green = 0; stats.drawCalls = 0; stats.triangles = 0;
    if (Array.isArray(heads) && Number.isFinite(focus?.x) && Number.isFinite(focus?.z)) for (const head of heads) {
      if (!head || ![head.x, head.z, head.yaw].every(Number.isFinite) || !ASPECTS.includes(head.color)) continue;
      const distance = (head.x - focus.x) ** 2 + (head.z - focus.z) ** 2;
      if (distance > DISTANCE ** 2 || nearest.length === CAPACITY && distance >= distances[CAPACITY - 1]) continue;
      const y = heightAt(head.x, head.z);
      if (!Number.isFinite(y)) continue;
      let index = nearest.length;
      while (index > 0 && distance < distances[index - 1]) index--;
      nearest.splice(index, 0, head); distances.splice(index, 0, distance); heights.splice(index, 0, y);
      if (nearest.length > CAPACITY) { nearest.pop(); distances.pop(); heights.pop(); }
    }
    for (let i = 0; i < nearest.length; i++) {
      const head = nearest[i];
      pose.position.set(head.x, heights[i], head.z); pose.rotation.set(0, head.yaw, 0); pose.updateMatrix();
      body.setMatrixAt(i, pose.matrix); dim.setMatrixAt(i, pose.matrix);
      lensMatrix.copy(pose.matrix).multiply(lensOffsets[head.color]);
      active[head.color].setMatrixAt(stats[head.color]++, lensMatrix);
    }
    stats.visible = nearest.length;
    for (const mesh of root.children) {
      const count = mesh === body || mesh === dim ? stats.visible : stats[mesh.userData.aspect];
      mesh.count = count; mesh.visible = count > 0; mesh.instanceMatrix.needsUpdate = true;
      if (count) stats.drawCalls++;
    }
    stats.triangles = stats.visible * (bodyTriangles + lensGeometry.index.count / 3);
  }
  function dispose() {
    if (disposed) return;
    disposed = true; root.removeFromParent();
    root.children.forEach(mesh => mesh.dispose());
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    nearest.length = 0; distances.length = 0; heights.length = 0;
    stats.visible = 0; stats.red = 0; stats.amber = 0; stats.green = 0; stats.drawCalls = 0; stats.triangles = 0; stats.disposed = true;
  }
  return { update, stats, dispose };
}
