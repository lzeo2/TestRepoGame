import * as THREE from './vendor/three.module.js';
import { RoadGrid } from './roads.mjs';
import { createBuildingKit } from './buildings.mjs';
import { createFreeCamera } from './camera.mjs';
import { createDayNight } from './daynight.mjs';
import { createWorldEffects } from './world-effects.mjs';
import { createCityEventEffects } from './city-event-effects.mjs';
import { createAsphaltMaterial, createGroundMaterial, createWater, createBlockAO, applyExternalTerrain } from './materials.mjs';
import { loadExternalModel, disposeExternalModels } from './external-assets.mjs';
import { createLandscape } from './terrain.mjs';
import { createAtmosphere, createStreetLamps } from './atmosphere.mjs';
import { createRiverTerrain } from './river-data.mjs';
import { createRiverGroundGeometry, groupRiverMaterials, createBridgePool } from './river-render.mjs';

export function createPlayableGroundGeometry(extent, data = null) {
  if (data?.layout === 'river-v1') return createRiverGroundGeometry(data, extent * 2 / data.size);
  return new THREE.PlaneGeometry(extent * 2, extent * 2).rotateX(-Math.PI / 2);
}

export function createRoadPool(scene, grid) {
  const geometry = new THREE.PlaneGeometry(grid.lotSize, grid.lotSize);
  geometry.rotateX(-Math.PI / 2);
  const appearance = createAsphaltMaterial(), material = appearance.material;
  const mesh = new THREE.InstancedMesh(geometry, material, grid.size ** 2);
  mesh.count = 0; mesh.visible = false; mesh.frustumCulled = false; mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  let version = -1, bridges = null;
  const matrix = new THREE.Matrix4();
  return {
    mesh,
    get bridges() { return bridges; },
    setTerrain(data) {
      bridges?.dispose();
      bridges = data.layout === 'river-v1' ? createBridgePool(scene, grid, data) : null;
      bridges?.sync(true);
    },
    sync(force = false) {
      bridges?.sync(force);
      if (!force && version === grid.version) return;
      let i = 0;
      for (const key of grid.cells) {
        const { x, z } = grid.cell(key), p = grid.center(x, z);
        mesh.setMatrixAt(i++, matrix.makeTranslation(p.x, .035, p.z));
      }
      mesh.count = i; mesh.visible = i > 0; mesh.instanceMatrix.needsUpdate = true; version = grid.version;
    },
    dispose() { bridges?.dispose(); scene.remove(mesh); geometry.dispose(); appearance.dispose(); mesh.dispose(); },
  };
}

export function createWorld(canvas, { size = 200, lotSize = 10, pixelRatio = Math.min(devicePixelRatio, 1.5), modelLOD = 0 } = {}) {
  if (![0, 1, 2].includes(modelLOD)) throw new RangeError('LOD must be 0, 1 or 2');
  const roads = new RoadGrid(size, lotSize), extent = size * lotSize / 2;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, .5, extent * 5);
  const landscape = createLandscape(scene, extent);
  const controls = createFreeCamera(camera, canvas, landscape.edge - 2, landscape.floorHeight);
  const dayNight = createDayNight(scene);
  const atmosphere = createAtmosphere(scene, extent);
  const buildings = createBuildingKit(scene, 10000, { lod: modelLOD });
  const roadPool = createRoadPool(scene, roads);
  const streetLamps = createStreetLamps(scene, roads);
  const effects = createWorldEffects(scene, roads);
  const eventEffects = createCityEventEffects(scene, roads);
  // Native selects river-v1 for new towns, legacy-flat for old snapshots/specimens.
  let riverData = createRiverTerrain(size, 'legacy-flat');
  let groundGeometry = createPlayableGroundGeometry(extent);
  const groundAppearance = createGroundMaterial(extent), groundMaterial = groundAppearance.material;
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.receiveShadow = true;
  scene.add(ground);
  const water = createWater(scene, extent), blockAO = createBlockAO(ground, buildings, extent, lotSize);
  const gridLines = new THREE.GridHelper(extent * 2, size, 0x718a50, 0x718a50);
  gridLines.position.y = .012;
  gridLines.material.transparent = true;
  gridLines.material.depthWrite = false;
  scene.add(gridLines);
  const raycaster = new THREE.Raycaster(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  let width = 0, height = 0, loaded = false, disposed = false, terrain = null, terrainModel = null;
  function dispose() {
    if (disposed) return;
    disposed = true; loaded = false;
    terrain?.dispose();
    if (terrainModel) { disposeExternalModels([terrainModel]); terrainModel = null; }
    atmosphere.dispose(); streetLamps.dispose();
    landscape.dispose(); controls.dispose(); dayNight.dispose(); buildings.dispose(); roadPool.dispose(); effects.dispose(); eventEffects.dispose();
    water.dispose(); blockAO.dispose(); scene.remove(ground, gridLines);
    groundGeometry.dispose(); groundAppearance.dispose(); gridLines.geometry.dispose(); gridLines.material.dispose(); renderer.dispose();
  }
  function applyTerrainMaterials() {
    terrain = applyExternalTerrain({ ground, road: roadPool.mesh, water: water.mesh, extent, lotSize }, terrainModel);
    if (riverData.layout === 'river-v1') groupRiverMaterials(groundGeometry, terrain.diagnostics);
    water.update = terrain.update;
  }
  function setTerrain(layout) {
    if (disposed) throw new Error('World is disposed');
    const data = createRiverTerrain(size, layout);
    if (riverData.layout === data.layout) return riverData;
    terrain?.dispose(); terrain = null;
    groundGeometry.dispose();
    riverData = data;
    groundGeometry = createPlayableGroundGeometry(extent, data);
    groundGeometry.setAttribute('uv1', groundGeometry.attributes.uv.clone());
    ground.geometry = groundGeometry;
    // Flat overlay lines must not float above the water/depressed bank.
    gridLines.visible = data.layout === 'legacy-flat';
    roadPool.setTerrain(data);
    if (terrainModel) applyTerrainMaterials();
    return riverData;
  }
  const ready = Promise.allSettled([buildings.ready, loadExternalModel('terrain_water_materials')]).then(results => {
    if (results[1].status === 'fulfilled') terrainModel = results[1].value;
    if (disposed) {
      if (terrainModel) { disposeExternalModels([terrainModel]); terrainModel = null; }
      throw new Error('World disposed before assets were ready');
    }
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    applyTerrainMaterials();
    loaded = true;
  }).catch(error => { dispose(); throw error; });
  function render(dt = 0) {
    if (!loaded || disposed) return;
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    if (w !== width || h !== height) {
      width = w; height = h; renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    gridLines.material.color.copy(dayNight.lights.ambient.color);
    gridLines.material.opacity = .06 + .2 * dayNight.lights.sun.intensity / 2;
    controls.update(dt); roadPool.sync();
    dayNight.follow(camera); buildings.update(camera, 1 - dayNight.daylight, dt);
    streetLamps.update(1 - dayNight.daylight);
    atmosphere.update(camera, dayNight.daylight, dayNight.sunDirection, dt);
    blockAO.update(); terrain.update(Math.max(0, Math.min(1, dt)));
    scene.fog.color.copy(scene.background);
    renderer.render(scene, camera); effects.update(dt);
  }
  return {
    renderer, scene, camera, controls, dayNight, atmosphere, streetLamps, roads, roadPool, buildings, effects, eventEffects, water, blockAO, landscape,
    floorHeight: landscape.floorHeight,
    ready, render, dispose, setTerrain,
    get riverTerrain() { return riverData; },
    get loaded() { return loaded; },
    get terrainDiagnostics() { return terrain?.diagnostics; },
    pickLot(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      camera.updateMatrixWorld();
      raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, 1 - (clientY - rect.top) / rect.height * 2), camera);
      return raycaster.ray.intersectPlane(groundPlane, hit) ? roads.worldToCell(hit.x, hit.z) : null;
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
