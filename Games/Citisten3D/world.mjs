import * as THREE from './vendor/three.module.js';
import { RoadGrid } from './roads.mjs';
import { createBuildingKit } from './buildings.mjs';
import { createFreeCamera } from './camera.mjs';
import { createDayNight } from './daynight.mjs';

export function createRoadPool(scene, grid) {
  const geometry = new THREE.PlaneGeometry(grid.lotSize, grid.lotSize);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.MeshLambertMaterial({ color: 0x373c40 });
  const mesh = new THREE.InstancedMesh(geometry, material, grid.size ** 2);
  mesh.count = 0; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  let version = -1;
  const matrix = new THREE.Matrix4();
  return {
    mesh,
    sync() {
      if (version === grid.version) return;
      let i = 0;
      for (const key of grid.cells) {
        const { x, z } = grid.cell(key), p = grid.center(x, z);
        mesh.setMatrixAt(i++, matrix.makeTranslation(p.x, .035, p.z));
      }
      mesh.count = i; mesh.instanceMatrix.needsUpdate = true; version = grid.version;
    },
    dispose() { scene.remove(mesh); geometry.dispose(); material.dispose(); mesh.dispose(); },
  };
}

export function createWorld(canvas, { size = 200, lotSize = 10, pixelRatio = Math.min(devicePixelRatio, 1.5) } = {}) {
  const roads = new RoadGrid(size, lotSize), extent = size * lotSize / 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, .1, extent * 5);
  const controls = createFreeCamera(camera, canvas, extent);
  const dayNight = createDayNight(scene);
  const buildings = createBuildingKit(scene);
  const roadPool = createRoadPool(scene, roads);
  const groundGeometry = new THREE.PlaneGeometry(extent * 2, extent * 2, size, size);
  groundGeometry.rotateX(-Math.PI / 2);
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i), z = positions.getZ(i);
    const edge = THREE.MathUtils.smoothstep(Math.max(Math.abs(x), Math.abs(z)), extent - lotSize * 4, extent);
    // Depression only at perimeter, so roads/building foundations never float below hills.
    positions.setY(i, -edge * (.3 + .25 * Math.sin(x * .09) * Math.cos(z * .12)));
  }
  groundGeometry.computeVertexNormals();
  const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7b9656 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  scene.add(ground);
  const gridLines = new THREE.GridHelper(extent * 2, size, 0x718a50, 0x718a50);
  gridLines.position.y = .012; scene.add(gridLines);
  const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  let width = 0, height = 0;
  function render(dt = 0) {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (w !== width || h !== height) {
      width = w; height = h; renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    controls.update(dt); roadPool.sync(); renderer.render(scene, camera);
  }
  return {
    renderer, scene, camera, controls, dayNight, roads, roadPool, buildings,
    render,
    pickLot(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      camera.updateMatrixWorld();
      raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2), camera);
      return raycaster.ray.intersectPlane(groundPlane, hit) ? roads.worldToCell(hit.x, hit.z) : null;
    },
    dispose() {
      controls.dispose(); dayNight.dispose(); buildings.dispose(); roadPool.dispose();
      groundGeometry.dispose(); groundMaterial.dispose(); gridLines.geometry.dispose(); gridLines.material.dispose(); renderer.dispose();
    },
  };
}

// Standalone specimen, not simulation: fixed layout, static agents, optional camera tour.
export function populateWorld(world, { dense = false } = {}) {
  const { roads, buildings } = world, n = roads.size, mid = Math.floor(n / 2);
  const start = dense ? 4 : mid - 18, end = dense ? n - 4 : mid + 18;
  for (let z = start; z <= end; z += 8) roads.place({ x: start, z }, { x: end, z });
  for (let x = start; x <= end; x += 8) roads.place({ x, z: start }, { x, z: end });
  roads.place({ x: start, z: mid }, { x: end, z: mid });
  const place = (type, x, z, rotation = 0) => buildings.spawn(type, { ...roads.center(x, z), rotation });
  let count = 0;
  for (let z = start + 1; z < end; z += 2) {
    for (let x = start + 1; x < end; x += 2) {
      if (roads.has(x, z) || (Math.abs(x - mid) < 4 && Math.abs(z - mid) < 4)) continue;
      place(['residential', 'commercial', 'industrial'][Math.floor(x / 8) % 3], x, z); count++;
    }
  }
  place('townhall', mid, mid - 2);
  const services = ['power', 'water', 'police', 'fire', 'park', 'wall', 'watchtower'];
  services.forEach((type, i) => place(type, mid - 12 + i * 4, mid + 2));
  place('citizen', mid - 1, mid - 1);
  place('zombie', mid + 1, mid - 1);
  const path = roads.path({ x: start, z: mid }, { x: end, z: mid });
  const lanes = roads.lanePoints(path);
  for (let i = 2; i < lanes.length - 2; i += 4) buildings.spawn('car', { ...lanes[i], rotation: -Math.PI / 2 });
  return { buildings: count + 8, path, lanes };
}
