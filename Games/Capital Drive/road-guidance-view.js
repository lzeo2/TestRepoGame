import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const CAPACITY = 3, SPACING = 12, OFF_ROUTE = 35, SEARCH_SEGMENTS = 128;
const valid = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function arrowGeometry(scale) {
  const shape = new THREE.Shape();
  const points = [[-.44, -1.8], [.44, -1.8], [.44, .35], [1.35, .35], [0, 2.5], [-1.35, .35], [-.44, .35]];
  points.forEach(([x, y], i) => i ? shape.lineTo(x * scale, y * scale) : shape.moveTo(x * scale, y * scale));
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: .065, bevelEnabled: false, steps: 1 }).rotateX(-Math.PI / 2);
}

// This adapter owns only pooled art. Route, terrain and vehicle state remain with
// their existing authorities; placement can reject an obstructed public lane.
export function createRoadGuidanceView(scene, heightAt, { laneOffset = 0, placePoint, isClear } = {}) {
  const root = new THREE.Group();
  root.name = 'Driving route arrows';
  scene.add(root);
  const outline = new THREE.InstancedMesh(arrowGeometry(1.16), new THREE.MeshBasicMaterial({ color: 0x282311 }), CAPACITY);
  const yellow = new THREE.InstancedMesh(arrowGeometry(1), new THREE.MeshBasicMaterial({ color: 0xffe128 }), CAPACITY);
  outline.name = 'Road arrow dark outline'; yellow.name = 'Road arrow yellow face';
  const meshes = [outline, yellow], dummy = new THREE.Object3D();
  for (const mesh of meshes) {
    mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh);
  }
  const templateTriangles = meshes.reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3, 0);
  const bufferBytes = meshes.reduce((sum, mesh) => sum + mesh.instanceMatrix.array.byteLength
    + Object.values(mesh.geometry.attributes).reduce((bytes, attribute) => bytes + attribute.array.byteLength, 0)
    + (mesh.geometry.index?.array.byteLength ?? 0), 0);
  let routeReference, points = [], distances = [], headings = [], total = 0;
  let segment = 0, progress = 0, previousPose = null, compiled = 0, disposed = false, arrows = [];

  function compile(route) {
    routeReference = route; points = []; distances = []; headings = []; total = 0;
    segment = 0; progress = 0; previousPose = null; compiled++;
    if (!Array.isArray(route)) return;
    for (const entry of route) {
      const point = Array.isArray(entry) ? { x: entry[0], z: entry[1] } : entry;
      if (!valid(point)) { points = []; return; }
      const previous = points.at(-1);
      if (!previous || Math.hypot(point.x - previous.x, point.z - previous.z) > 1e-6) points.push({ x: point.x, z: point.z });
    }
    distances = [0];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      total += Math.hypot(b.x - a.x, b.z - a.z); distances.push(total);
      headings.push(Math.atan2(a.x - b.x, a.z - b.z));
    }
  }

  function segmentAt(at) {
    let low = 0, high = points.length - 1;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (distances[middle + 1] <= at) low = middle + 1; else high = middle;
    }
    return Math.min(low, points.length - 2);
  }

  function sample(at) {
    const index = segmentAt(at), a = points[index], b = points[index + 1];
    const fraction = (at - distances[index]) / (distances[index + 1] - distances[index]);
    // At a junction the marker already indicates the outgoing road.
    const yaw = distances[index + 1] - at < 3 && index + 1 < headings.length ? headings[index + 1] : headings[index];
    return { x: a.x + (b.x - a.x) * fraction, z: a.z + (b.z - a.z) * fraction, yaw };
  }

  function nearest(pose, guidance) {
    const initial = previousPose === null;
    const anchor = Number.isFinite(guidance?.progress) ? clamp(guidance.progress, 0, total) : progress;
    const center = Number.isFinite(guidance?.progress) ? segmentAt(anchor) : segment;
    const movement = previousPose ? Math.hypot(pose.x - previousPose.x, pose.z - previousPose.z) : 0;
    const reach = Math.min(400, Math.max(80, movement * 1.6 + 20));
    const low = initial ? 0 : Math.max(0, center - SEARCH_SEGMENTS);
    const high = initial ? points.length - 2 : Math.min(points.length - 2, center + SEARCH_SEGMENTS);
    let best = null;
    for (let i = low; i <= high; i++) {
      if (!initial && (distances[i + 1] < anchor - reach || distances[i] > anchor + reach)) continue;
      const a = points[i], b = points[i + 1], dx = b.x - a.x, dz = b.z - a.z;
      const fraction = clamp(((pose.x - a.x) * dx + (pose.z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
      const distance = Math.hypot(pose.x - a.x - dx * fraction, pose.z - a.z - dz * fraction);
      const at = distances[i] + fraction * (distances[i + 1] - distances[i]);
      if (!best || distance < best.distance - .05 || (Math.abs(distance - best.distance) <= .05 && Math.abs(at - anchor) < Math.abs(best.at - anchor))) best = { distance, at, segment: i };
    }
    previousPose = { x: pose.x, z: pose.z };
    if (!best || best.distance > OFF_ROUTE) return false;
    progress = best.at; segment = best.segment;
    return true;
  }

  function update(route, pose, { enabled = true, guidance } = {}) {
    if (disposed) return;
    arrows = [];
    for (const mesh of meshes) { mesh.count = 0; mesh.visible = false; }
    if (route !== routeReference) compile(route);
    if (!enabled || !valid(pose) || !Number.isFinite(pose.yaw) || points.length < 2
      || guidance?.offRoute || guidance?.kind === 'arrive' || !nearest(pose, guidance)) return;
    if (total - progress <= 8) return;
    const forwardX = -Math.sin(pose.yaw), forwardZ = -Math.cos(pose.yaw);
    // Reversing toward an old route point must never put route art behind the car.
    if (-Math.sin(headings[segment]) * forwardX - Math.cos(headings[segment]) * forwardZ < -.3) return;
    for (let i = 1; i <= CAPACITY; i++) {
      const at = progress + i * SPACING;
      if (at >= total - 2) break;
      let point = sample(at);
      const yaw = point.yaw;
      if (typeof laneOffset === 'function') point = laneOffset({ ...point }, yaw);
      else if (Number.isFinite(laneOffset)) point = { ...point, x: point.x - Math.cos(yaw) * laneOffset, z: point.z + Math.sin(yaw) * laneOffset };
      if (point && placePoint) point = placePoint({ ...point }, yaw);
      if (!valid(point) || (point.x - pose.x) * forwardX + (point.z - pose.z) * forwardZ <= 3 || (isClear && !isClear(point.x, point.z, yaw))) continue;
      const y = heightAt(point.x, point.z);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const front = heightAt(point.x + fx * 2.5, point.z + fz * 2.5), back = heightAt(point.x - fx * 2.5, point.z - fz * 2.5);
      const right = heightAt(point.x + rx * 1.35, point.z + rz * 1.35), left = heightAt(point.x - rx * 1.35, point.z - rz * 1.35);
      if (![y, front, back, right, left].every(Number.isFinite)) continue;
      const pitch = Math.atan2(front - back, 5), roll = Math.atan2(right - left, 2.7), index = arrows.length;
      dummy.rotation.set(pitch, yaw, roll, 'YXZ'); dummy.scale.set(1, 1, 1);
      for (const [layer, mesh] of meshes.entries()) {
        dummy.position.set(point.x, y + .45 + layer * .075, point.z); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
      }
      arrows.push({ x: point.x, y: y + .45, z: point.z, yaw, pitch, roll, progress: at });
    }
    for (const mesh of meshes) { mesh.count = arrows.length; mesh.visible = arrows.length > 0; if (mesh.visible) mesh.instanceMatrix.needsUpdate = true; }
  }

  return { update,
    get stats() { return Object.freeze({ visible: arrows.length, drawCalls: arrows.length ? 2 : 0,
      triangles: arrows.length * templateTriangles, templateTriangles, bufferBytes, geometryCount: 2, materialCount: 2,
      textureCount: 0, capacity: CAPACITY, compiled, disposed, arrows: arrows.map(point => Object.freeze({ ...point })) }); },
    dispose() {
      if (disposed) return;
      disposed = true; arrows = []; scene.remove(root);
      for (const mesh of meshes) { mesh.dispose(); mesh.geometry.dispose(); mesh.material.dispose(); mesh.count = 0; mesh.visible = false; }
      points = []; distances = []; headings = []; routeReference = undefined; previousPose = null;
    },
  };
}
